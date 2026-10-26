"""Teacher work tools: create homework and assessments (questions with answer keys that never leave the server, docs/42),
see every assignment's submissions, and the class Practice view (weak topics from practice answers)."""
from __future__ import annotations

import re
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import Ctx, err
from ..models import AnswerKey, Assignment, ClassMember, Question, QuestionHint, RevisionAttempt, Submission, User
from ..people import audit
from ..permissions import require_perm
from .teacher import _class_of, _my_classes

router = APIRouter(prefix="/api/teacher", tags=["teacher"])
teacher = require_perm("teaching")


class QuestionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=2000)
    kind: str = Field(pattern="^(number|text|choice)$")
    answer: str = Field(min_length=1, max_length=300)                    # the key: a number, the accepted text, or the right option
    also_accept: list[str] = Field(default_factory=list, max_length=10)   # text questions: other accepted answers
    tolerance: float = Field(default=0, ge=0)
    options: list[str] = Field(default_factory=list, max_length=8)
    hints: list[str] = Field(default_factory=list, max_length=5)          # homework hint ladder (assessments get none)
    code: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def _shape(self):
        if self.kind == "number":
            try:
                float(self.answer)
            except ValueError:
                raise ValueError("A number question needs a number as its answer.") from None
        if self.kind == "choice":
            opts = [o.strip() for o in self.options if o.strip()]
            if len(opts) < 2 or self.answer.strip() not in opts:
                raise ValueError("A choice question needs at least two options, and the answer must be one of them.")
        return self


class AssignmentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    class_id: int
    title: str = Field(min_length=1, max_length=120)
    kind: str = Field(pattern="^(homework|assessment)$")
    instructions: str = Field(default="", max_length=4000)
    due_at: datetime
    ai_help_policy: str = Field(default="hints_only", pattern="^(hints_only|open|none)$")
    questions: list[QuestionIn] = Field(min_length=1, max_length=40)


@router.post("/assignments", status_code=201)
def create_assignment(body: AssignmentIn, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    c = _class_of(db, ctx, body.class_id)
    aid = f"t-{re.sub(r'[^a-z0-9]+', '-', body.title.lower()).strip('-')[:40]}-{secrets.token_hex(3)}"
    policy = "none" if body.kind == "assessment" else body.ai_help_policy      # assessments: tutor help is always off (docs/42)
    a = Assignment(id=aid, class_id=c.id, title=" ".join(body.title.split()), subject=c.subject, instructions=body.instructions, due_at=body.due_at,
                   ai_help_policy=policy, kind=body.kind, max_score=len(body.questions), set_by_id=ctx.user.id)
    db.add(a)
    db.flush()
    for i, q in enumerate(body.questions, start=1):
        qid = f"{aid}:q{i}"
        db.add(Question(id=qid, assignment_id=aid, index=i, prompt=q.prompt, code=q.code or None, kind=q.kind,
                        options=[o.strip() for o in q.options if o.strip()] if q.kind == "choice" else None))
        db.flush()
        if body.kind == "homework":
            for n, h in enumerate([h for h in q.hints if h.strip()], start=1):
                db.add(QuestionHint(question_id=qid, step=n, text=h.strip()))
        key = ({"value": float(q.answer), "tolerance": q.tolerance} if q.kind == "number"
               else {"value": [q.answer.strip(), *[x.strip() for x in q.also_accept if x.strip()]]})
        db.add(AnswerKey(question_id=qid, kind="number" if q.kind == "number" else "text", value=key, misconceptions=[]))
    audit(db, ctx.user, "assignment.create", f"assignment:{aid}", f"{body.kind}, {len(body.questions)} questions, class {c.id}")
    db.commit()
    return {"id": aid, "kind": a.kind, "max_score": a.max_score}


@router.get("/assignments")
def list_assignments(kind: str | None = Query(default=None, pattern="^(homework|assessment)$"), ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    classes = {c.id: c for c in _my_classes(db, ctx)}
    q = select(Assignment).where(Assignment.class_id.in_(list(classes) or [0]))
    if kind:
        q = q.where(Assignment.kind == kind)
    out = []
    for a in db.scalars(q.order_by(Assignment.due_at.desc())):
        members = db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == a.class_id)).all()
        subs = db.execute(select(Submission, User).join(User, User.id == Submission.user_id).where(Submission.assignment_id == a.id)).all()
        out.append({"id": a.id, "title": a.title, "kind": a.kind, "class_name": classes[a.class_id].name, "due_at": a.due_at.isoformat(), "max_score": a.max_score,
                    "students": len(members), "submitted": sum(1 for s, _ in subs if s.state in ("submitted", "returned")), "returned": sum(1 for s, _ in subs if s.state == "returned"),
                    "submissions": [{"id": s.id, "student": u.display_name, "state": s.state, "score": s.score, "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None}
                                    for s, u in sorted(subs, key=lambda r: r[1].display_name) if s.state in ("submitted", "returned")]})
    return {"assignments": out, "classes": [{"id": c.id, "name": c.name} for c in classes.values()]}


@router.get("/practice")
def class_practice(class_id: int | None = None, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    """Weak topics across the class from practice and sprint answers: accuracy per topic and who is struggling (under 50%,
    at least two answers). Practice answers are private study; the teacher sees topics and names, never chat text."""
    classes = _my_classes(db, ctx)
    c = next((x for x in classes if x.id == class_id), classes[0] if classes else None)
    if c is None:
        return {"class": None, "topics": [], "classes": []}
    ids = db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == c.id)).all()
    names = {u.id: u.display_name for u in db.scalars(select(User).where(User.id.in_(ids or [0])))}
    per: dict[str, dict[int, list[int]]] = {}
    for uid, concept, ok in db.execute(select(RevisionAttempt.user_id, RevisionAttempt.concept, RevisionAttempt.correct).where(RevisionAttempt.user_id.in_(ids or [0]))):
        t = per.setdefault(concept, {}).setdefault(uid, [0, 0]); t[0] += int(ok); t[1] += 1
    topics = []
    for concept, by in per.items():
        right, total = sum(v[0] for v in by.values()), sum(v[1] for v in by.values())
        struggling = sorted([{"id": u, "name": names.get(u, "?"), "correct": v[0], "answered": v[1]} for u, v in by.items() if v[1] >= 2 and v[0] / v[1] < 0.5], key=lambda s: s["name"])
        topics.append({"concept": concept, "percent": round(100 * right / total), "answered": total, "students": len(by), "struggling": struggling})
    topics.sort(key=lambda t: t["percent"])
    return {"class": {"id": c.id, "name": c.name, "students": len(ids)}, "topics": topics, "classes": [{"id": x.id, "name": x.name} for x in classes]}
