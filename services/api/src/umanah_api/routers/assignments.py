"""Assignments (docs/20, 42). The answer key never leaves the server; checks are done by code."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import hints as hints_mod
from ..db import get_db
from ..deps import Ctx, current, err, require_role
from ..models import (Lesson, AnswerKey, Assignment, ClassMember, Question, QuestionAttempt, Submission, User)
from ..tutor import answers as answers_mod
from ..tutor.modes import resolve
from ..xp import award_badge, award_xp, touch_activity

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


def _assignment_for(db: Session, user: User, aid: str) -> Assignment:
    a = db.get(Assignment, aid)
    if not a:
        raise err(404, "not_found", "That assignment isn't available.")
    if user.role == "student" and not db.get(ClassMember, (a.class_id, user.id)):
        raise err(404, "not_found", "That assignment isn't available to you.")
    return a


def _sub(db: Session, aid: str, uid: int) -> Submission | None:
    return db.scalar(select(Submission).where(Submission.assignment_id == aid, Submission.user_id == uid))


@router.get("")
def list_assignments(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    if ctx.user.role == "student":
        rows = db.execute(select(Assignment).join(ClassMember, ClassMember.class_id == Assignment.class_id)
                          .where(ClassMember.user_id == ctx.user.id).order_by(Assignment.due_at)).scalars().all()
    else:
        rows = db.scalars(select(Assignment).order_by(Assignment.due_at)).all()
    out = []
    for a in rows:
        s = _sub(db, a.id, ctx.user.id)
        out.append({"id": a.id, "title": a.title, "subject": a.subject, "due_at": a.due_at.isoformat(), "state": s.state if s else "not_started",
                    "score": s.score if s and s.state == "returned" else None, "max_score": a.max_score})
    return {"assignments": out}


@router.get("/{aid}")
def get_assignment(aid: str, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    a = _assignment_for(db, ctx.user, aid)
    setter = db.get(User, a.set_by_id)
    sub = _sub(db, a.id, ctx.user.id)
    mode = resolve(db, ctx.user, "assignment", a.id, None) if ctx.user.role == "student" else None
    qs = db.scalars(select(Question).where(Question.assignment_id == a.id).order_by(Question.index)).all()
    used = {q.id: hints_mod.hints_used(db, ctx.user.id, q.id) for q in qs}
    checks = {}
    for q in qs:
        last = db.scalars(select(QuestionAttempt).where(QuestionAttempt.user_id == ctx.user.id, QuestionAttempt.question_id == q.id,
                                                         QuestionAttempt.kind == "check").order_by(QuestionAttempt.id.desc())).first()
        checks[q.id] = None if last is None else last.correct
    state = sub.state if sub else "draft"      # exclusive states: draft -> submitted -> returned (docs/05)
    returned = state == "returned"
    les = db.get(Lesson, a.lesson_id) if a.lesson_id else None
    return {
        "lesson": {"id": les.id, "title": f"Lesson {les.number}: {les.title}", "available": les.available} if les else None,
        "id": a.id, "title": a.title, "subject": a.subject, "instructions": a.instructions, "due_at": a.due_at.isoformat(),
        "set_by": setter.display_name if setter else None, "max_score": a.max_score,
        "help": {"mode": mode.mode, "badge": mode.badge, "locked": True} if mode else None,
        "state": state,
        "answers": (sub.answers if sub else {}),
        "submitted_at": sub.submitted_at.isoformat() if sub and sub.submitted_at else None,
        "feedback": sub.teacher_feedback if returned else None, "score": sub.score if returned else None,
        "kind": a.kind,
        "questions": [{"id": q.id, "index": q.index, "prompt": q.prompt, "code": q.code, "kind": q.kind, "options": q.options,
                       "hints_total": len(hints_mod.ladder(db, q.id)), "hints_used": used[q.id],
                       "last_check": checks[q.id]} for q in qs],
    }


class DraftIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict[str, str] = Field(default_factory=dict)


@router.put("/{aid}/draft")
def save_draft(aid: str, body: DraftIn, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    a = _assignment_for(db, ctx.user, aid)
    sub = _sub(db, a.id, ctx.user.id) or Submission(assignment_id=a.id, user_id=ctx.user.id, state="draft", answers={})
    if sub.state != "draft":
        raise err(409, "policy_denied", "This assignment has been submitted; answers are read-only.")
    qids = set(db.scalars(select(Question.id).where(Question.assignment_id == a.id)))
    sub.answers = {k: v[:500] for k, v in body.answers.items() if k in qids}
    sub.updated_at = datetime.now(UTC)
    db.add(sub)
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"state": sub.state, "saved": True}


class AnswerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(max_length=500)


@router.post("/{aid}/questions/{qid}/check")
def check(aid: str, qid: str, body: AnswerIn, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    a = _assignment_for(db, ctx.user, aid)
    if a.kind == "assessment" or a.ai_help_policy == "none":
        raise err(403, "policy_denied", "Answers can't be checked during an assessment.")
    q, key = db.get(Question, qid), db.get(AnswerKey, qid)
    if not q or q.assignment_id != a.id or not key:
        raise err(404, "not_found", "Unknown question.")
    ok, tag, note = answers_mod.check(key.kind, key.value, key.misconceptions, body.answer)
    used = hints_mod.hints_used(db, ctx.user.id, qid)
    already = db.scalar(select(QuestionAttempt.id).where(QuestionAttempt.user_id == ctx.user.id, QuestionAttempt.question_id == qid,
                                                          QuestionAttempt.kind == "check", QuestionAttempt.correct.is_(True)))
    db.add(QuestionAttempt(user_id=ctx.user.id, question_id=qid, kind="check", correct=ok, misconception=tag))
    extra = {}
    if ok and not already and used == 1:      # 'Solved after one hint' rewards understanding, never AI usage (docs/15)
        if award_badge(db, ctx.user.id, "hint-to-solution"):
            extra["badge"] = "hint-to-solution"
        award_xp(db, ctx.user.id, f"hint-to-solution:{ctx.user.id}:{qid}", "hint_to_solution", 25)
    touch_activity(db, ctx.user.id)
    db.commit()
    # The response says only correct/incorrect and an authored misconception note — never the key.
    return {"correct": ok, "note": None if ok else note, "hints_used": used, **extra}


@router.post("/{aid}/questions/{qid}/hint")
def hint(aid: str, qid: str, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    a = _assignment_for(db, ctx.user, aid)
    if a.kind == "assessment" or a.ai_help_policy == "none":
        raise err(403, "policy_denied", "Hints are off during an assessment.")
    q = db.get(Question, qid)
    if not q or q.assignment_id != a.id:
        raise err(404, "not_found", "Unknown question.")
    step, total, text = hints_mod.serve_next_hint(db, ctx.user.id, qid)
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"step": step, "total": total, "text": text, "exhausted": text is None}


@router.post("/{aid}/submit")
def submit(aid: str, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    a = _assignment_for(db, ctx.user, aid)
    sub = _sub(db, a.id, ctx.user.id)
    if sub is None or not any((v or "").strip() for v in sub.answers.values()):
        raise err(400, "invalid", "Answer at least one question before you submit.")
    if sub.state != "draft":
        raise err(409, "policy_denied", "Already submitted.")
    sub.state, sub.submitted_at = "submitted", datetime.now(UTC)
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"state": "submitted", "message": "Submitted — awaiting teacher review", "submitted_at": sub.submitted_at.isoformat()}
