"""Pre-written hint ladders (docs/42 rule 3). Serving a hint costs no model time."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import AnswerKey, Question, QuestionAttempt, QuestionHint
from .tutor.leakcheck import KeyedQuestion


def hints_used(db: Session, user_id: int, question_id: str) -> int:
    return int(db.scalar(select(func.count()).select_from(QuestionAttempt).where(
        QuestionAttempt.user_id == user_id, QuestionAttempt.question_id == question_id, QuestionAttempt.kind == "hint")) or 0)


def ladder(db: Session, question_id: str) -> list[str]:
    return list(db.scalars(select(QuestionHint.text).where(QuestionHint.question_id == question_id).order_by(QuestionHint.step)))


def serve_next_hint(db: Session, user_id: int, question_id: str) -> tuple[int, int, str | None]:
    """(step served, total steps, text). Text is None once the ladder is exhausted."""
    steps = ladder(db, question_id)
    used = hints_used(db, user_id, question_id)
    if used >= len(steps):
        return used, len(steps), None
    db.add(QuestionAttempt(user_id=user_id, question_id=question_id, kind="hint", hint_step=used + 1))
    db.flush()
    return used + 1, len(steps), steps[used]


def current_hint(db: Session, user_id: int, question_id: str) -> str | None:
    """The hint level the student has reached (or level 1 if none yet) — used to ground the tutor, never the key."""
    steps = ladder(db, question_id)
    if not steps:
        return None
    used = hints_used(db, user_id, question_id)
    return steps[min(max(used, 1), len(steps)) - 1]


def keyed_questions(db: Session, assignment_id: str) -> list[KeyedQuestion]:
    rows = db.execute(select(Question, AnswerKey).join(AnswerKey, AnswerKey.question_id == Question.id)
                      .where(Question.assignment_id == assignment_id).order_by(Question.index)).all()
    return [KeyedQuestion(q.id, q.prompt, q.code, q.kind, {"kind": k.kind, **k.value}) for q, k in rows]
