"""Revision (docs/10, design/reference/06): weak topics, past lessons, practice, flashcards and a 10-minute sprint.

Answers stay on the server: questions are sent without them, every answer is checked here."""
from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..content import revision_pack
from ..db import get_db
from ..deps import Ctx, err, require_role
from ..models import Course, Lesson, LessonProgress, QuestionAttempt, RevisionAttempt
from ..xp import award_xp

router = APIRouter(prefix="/api/revision", tags=["revision"])
student = require_role("student")

# what a wrong answer on the homework says about the student's understanding, in revision concepts
HOMEWORK_MISCONCEPTIONS = {"off-by-one-start": "range start"}


def _q(pack: dict, qid: str) -> dict:
    q = next((x for x in pack["questions"] if x["id"] == qid), None)
    if not q:
        raise err(404, "not_found", "That question isn't available.")
    return q


def _public(q: dict) -> dict:
    return {"id": q["id"], "prompt": q["prompt"], "code": q.get("code"), "options": q["options"]}


def weak_concepts(db: Session, user_id: int) -> list[dict]:
    since = datetime.now(UTC) - timedelta(days=30)
    counts: dict[str, int] = {}
    for concept, n in db.execute(select(RevisionAttempt.concept, func.count()).where(RevisionAttempt.user_id == user_id, RevisionAttempt.correct.is_(False),
                                                                                   RevisionAttempt.created_at >= since).group_by(RevisionAttempt.concept)):
        counts[concept] = counts.get(concept, 0) + n
    for mis, n in db.execute(select(QuestionAttempt.misconception, func.count()).where(QuestionAttempt.user_id == user_id, QuestionAttempt.correct.is_(False),
                                                                                     QuestionAttempt.misconception.is_not(None)).group_by(QuestionAttempt.misconception)):
        if mis in HOMEWORK_MISCONCEPTIONS:
            c = HOMEWORK_MISCONCEPTIONS[mis]
            counts[c] = counts.get(c, 0) + n
    return [{"concept": c, "misses": n} for c, n in sorted(counts.items(), key=lambda x: -x[1])]


@router.get("/overview")
def overview(ctx: Ctx = Depends(student), db: Session = Depends(get_db)):
    pack = revision_pack()
    weak = weak_concepts(db, ctx.user.id)
    done = db.execute(select(Lesson, Course.title, LessonProgress.completed_at).join(LessonProgress, LessonProgress.lesson_id == Lesson.id)
                      .join(Course, Course.id == Lesson.course_id).where(LessonProgress.user_id == ctx.user.id, LessonProgress.state == "completed")
                      .order_by(LessonProgress.completed_at.desc())).all()
    tags = (["Weak topic"] if weak else []) + ["High impact", "Recommended"]
    xp = db.scalar(select(func.count()).select_from(RevisionAttempt).where(RevisionAttempt.user_id == ctx.user.id))
    return {
        "recommended": {"topic": pack["topic"], "lesson_id": pack["lesson_id"], "tags": tags,
                        "why": "Based on your recent work, spend 10 minutes reviewing loops." if weak else "Loops are your current lesson. Ten minutes now will make homework easier."},
        "weak_topics": [{"topic": pack["topic"], "concept": w["concept"], "misses": w["misses"]} for w in weak[:6]],
        "past_lessons": [{"id": l.id, "title": f"Lesson {l.number}: {l.title}", "course": ct, "available": l.available,
                          "completed_at": at.isoformat() if at else None} for l, ct, at in done[:8]],
        "counts": {"questions": len(pack["questions"]), "flashcards": len(pack["flashcards"]), "answered": int(xp or 0)},
        "suggested_next": {"topic": "While loops", "note": "Lesson 7 builds on loops."},
    }


@router.get("/questions")
def questions(n: int = 5, ctx: Ctx = Depends(student), db: Session = Depends(get_db)):
    """A set of questions without answers. Concepts the student missed recently come first."""
    pack = revision_pack()
    weak = {w["concept"]: w["misses"] for w in weak_concepts(db, ctx.user.id)}
    qs = list(pack["questions"])
    random.shuffle(qs)
    qs.sort(key=lambda q: -weak.get(q["concept"], 0))
    return {"topic": pack["topic"], "questions": [_public(q) for q in qs[: max(1, min(n, len(qs)))]]}


class CheckIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question_id: str = Field(max_length=60)
    choice: int = Field(ge=0, le=9)
    source: str = Field(default="practice", pattern="^(practice|sprint)$")


@router.post("/check")
def check(body: CheckIn, ctx: Ctx = Depends(student), db: Session = Depends(get_db)):
    q = _q(revision_pack(), body.question_id)
    if body.choice >= len(q["options"]):
        raise err(422, "invalid", "That option doesn't exist.")
    ok = body.choice == q["answer_index"]
    db.add(RevisionAttempt(user_id=ctx.user.id, question_id=q["id"], concept=q["concept"], correct=ok, source=body.source))
    db.commit()
    return {"correct": ok, "explanation": q["explanation"], "note": None if ok else (q.get("misconception") or {}).get(str(body.choice)), "answer_index": q["answer_index"]}


class FinishIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict[str, int] = Field(min_length=1, max_length=20)


@router.post("/sprint/finish")
def finish(body: FinishIn, ctx: Ctx = Depends(student), db: Session = Depends(get_db)):
    """Scores the sprint from the answers sent (checked here again) and awards XP once per school day: 15 per correct answer and 15 for finishing."""
    pack = revision_pack()
    correct = sum(1 for qid, c in body.answers.items() if (q := next((x for x in pack["questions"] if x["id"] == qid), None)) and c == q["answer_index"])
    total = len(body.answers)
    amount = pack["xp_per_correct"] * correct + pack["xp_completion"]
    key = f"revision-sprint:{ctx.user.id}:{datetime.now(UTC).date().isoformat()}"
    got = award_xp(db, ctx.user.id, key, "revision", amount, reason=f"revision sprint {correct}/{total}")
    db.commit()
    weak = weak_concepts(db, ctx.user.id)
    return {"score": correct, "total": total, "xp_awarded": amount if got else 0, "xp_already_today": not got,
            "suggested_next": {"topic": "While loops", "note": "Lesson 7 builds on loops."} if not weak else {"topic": weak[0]["concept"].capitalize(), "note": "You missed this one recently. Try a practice round."}}


@router.get("/flashcards")
def flashcards(ctx: Ctx = Depends(student)):
    pack = revision_pack()
    return {"topic": pack["topic"], "cards": pack["flashcards"]}
