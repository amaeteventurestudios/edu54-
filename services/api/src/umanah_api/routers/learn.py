"""Courses, lessons and progress (docs/20). XP is awarded by the server, idempotently."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..content import gamification, lesson_pack
from ..db import get_db
from ..deps import Ctx, current, err, require_role
from ..models import Assignment, ClassMember, Course, Lesson, LessonProgress, Submission, UserBadge
from ..xp import award_badge, award_xp, level_info, streak_days, total_xp, touch_activity

router = APIRouter(prefix="/api", tags=["learn"])


def _course_percent(db: Session, user_id: int, course_id: str) -> tuple[float, int, int]:
    lessons = db.scalars(select(Lesson).where(Lesson.course_id == course_id)).all()
    if not lessons:
        return 0.0, 0, 0
    prog = {p.lesson_id: p for p in db.scalars(select(LessonProgress).where(LessonProgress.user_id == user_id))}
    score = sum(1.0 if (p := prog.get(l.id)) and p.state == "completed" else (p.percent / 100 if p else 0) for l in lessons)
    done = sum(1 for l in lessons if (p := prog.get(l.id)) and p.state == "completed")
    return round(100 * score / len(lessons)), done, len(lessons)


def _next_lesson(db: Session, user_id: int, course_id: str) -> Lesson | None:
    lessons = db.scalars(select(Lesson).where(Lesson.course_id == course_id).order_by(Lesson.number)).all()
    prog = {p.lesson_id: p for p in db.scalars(select(LessonProgress).where(LessonProgress.user_id == user_id))}
    return next((l for l in lessons if not (prog.get(l.id) and prog[l.id].state == "completed")), None)


def _lesson_ref(l: Lesson | None) -> dict | None:
    return {"id": l.id, "title": l.title, "number": l.number, "module": l.module, "available": l.available} if l else None


@router.get("/courses")
def courses(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    out = []
    for c in db.scalars(select(Course).order_by(Course.position)):
        pct, done, total = _course_percent(db, ctx.user.id, c.id)
        out.append({"id": c.id, "title": c.title, "description": c.description, "icon": c.icon, "accent": c.accent,
                    "percent": pct, "lessons_done": done, "lessons_total": total, "next": _lesson_ref(_next_lesson(db, ctx.user.id, c.id)),
                    "lessons": [{"id": l.id, "title": l.title, "number": l.number, "module": l.module, "available": l.available} for l in db.scalars(select(Lesson).where(Lesson.course_id == c.id).order_by(Lesson.number))]})
    return {"courses": out}


def _assigned(db: Session, user_id: int) -> list[dict]:
    rows = db.execute(select(Assignment).join(ClassMember, ClassMember.class_id == Assignment.class_id)
                      .where(ClassMember.user_id == user_id).order_by(Assignment.due_at)).scalars().all()
    out = []
    for a in rows:
        sub = db.scalar(select(Submission).where(Submission.assignment_id == a.id, Submission.user_id == user_id))
        state = sub.state if sub else "not_started"
        out.append({"id": a.id, "title": a.title, "subject": a.subject, "due_at": a.due_at.isoformat(), "state": state})
    return out


@router.get("/learn/continue")
def learn_continue(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Home + Learn: the lesson to continue and the work assigned, most urgent first."""
    lesson = None
    prog = db.scalars(select(LessonProgress).where(LessonProgress.user_id == ctx.user.id, LessonProgress.state == "in_progress")
                      .order_by(LessonProgress.updated_at.desc())).first()
    l = db.get(Lesson, prog.lesson_id) if prog else None
    if l is None:
        for c in db.scalars(select(Course).order_by(Course.position)):
            n = _next_lesson(db, ctx.user.id, c.id)
            if n and n.available:
                l = n
                break
    if l:
        c = db.get(Course, l.course_id)
        pct, _, _ = _course_percent(db, ctx.user.id, l.course_id)
        lesson = {**_lesson_ref(l), "course_id": c.id, "course": c.title, "percent": pct}
    assigned = [a for a in _assigned(db, ctx.user.id) if a["state"] in ("not_started", "draft")]
    return {"lesson": lesson, "assigned": assigned}


@router.get("/lessons/{lesson_id}")
def lesson(lesson_id: str, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    l = db.get(Lesson, lesson_id)
    pack = pack_for(db, lesson_id)
    if not l or not l.available or not pack:
        raise err(404, "not_found", "That lesson isn't part of the demo yet.")
    p = db.get(LessonProgress, (ctx.user.id, lesson_id))
    if p is None:
        p = LessonProgress(user_id=ctx.user.id, lesson_id=lesson_id, steps={}, percent=0)
        db.add(p)
        db.commit()
    c = db.get(Course, l.course_id)
    # Never ship answer indexes to the client: checking happens on the server.
    questions = [{k: v for k, v in q.items() if k not in ("answer_index", "explanation", "misconception")} for q in pack["check_questions"]]
    return {"id": l.id, "title": l.title, "number": l.number, "module": l.module, "course": {"id": c.id, "title": c.title},
            "objective": pack["objective"], "sections": pack["sections"], "examples": pack["examples"], "diagram": pack["diagram"],
            "check_questions": questions, "try_it": pack["try_it"], "xp_on_complete": pack["xp_on_complete"],
            "progress": {"state": p.state, "percent": p.percent, "steps": p.steps}}


def pack_for(db: Session, lesson_id: str) -> dict | None:
    """A lesson's content: from content/ (Umanah's lessons) or, for teacher-made lessons, from the database (published only)."""
    if pack := lesson_pack(lesson_id):
        return pack
    from ..models import CustomLesson
    c = db.get(CustomLesson, lesson_id)
    return c.pack if c and c.status == "published" else None


class StepIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: str


class CheckIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option: int


def _recompute(p: LessonProgress, lesson_id: str, db: Session) -> None:
    acts = pack_for(db, lesson_id)["activities"]
    p.percent = round(100 * sum(1 for a in acts if p.steps.get(a)) / len(acts))
    p.updated_at = datetime.now(UTC)


@router.post("/lessons/{lesson_id}/progress")
def lesson_step(lesson_id: str, body: StepIn, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    pack = pack_for(db, lesson_id)
    if not pack or body.step not in ("read", "try1") or body.step not in pack["activities"]:
        raise err(400, "invalid", "Unknown step.")
    p = db.get(LessonProgress, (ctx.user.id, lesson_id)) or LessonProgress(user_id=ctx.user.id, lesson_id=lesson_id, steps={})
    db.add(p)
    p.steps = {**p.steps, body.step: True}
    _recompute(p, lesson_id, db)
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"percent": p.percent, "steps": p.steps, "state": p.state}


@router.post("/lessons/{lesson_id}/questions/{qid}/check")
def check_question(lesson_id: str, qid: str, body: CheckIn, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    pack = pack_for(db, lesson_id)
    q = next((x for x in (pack or {}).get("check_questions", []) if x["id"] == qid), None)
    if not q:
        raise err(404, "not_found", "Unknown question.")
    correct = body.option == q["answer_index"]
    p = db.get(LessonProgress, (ctx.user.id, lesson_id)) or LessonProgress(user_id=ctx.user.id, lesson_id=lesson_id, steps={})
    db.add(p)
    if correct:
        p.steps = {**p.steps, qid: True}
        _recompute(p, lesson_id, db)
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"correct": correct, "explanation": q["explanation"] if correct else None,
            "feedback": None if correct else q.get("misconception", {}).get(str(body.option), "Not quite — have another look at the lesson."),
            "percent": p.percent, "steps": p.steps}


@router.post("/lessons/{lesson_id}/complete")
def complete_lesson(lesson_id: str, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    """Completing twice gives XP once: the XP event key is (user, lesson)."""
    pack = pack_for(db, lesson_id)
    p = db.get(LessonProgress, (ctx.user.id, lesson_id))
    if not pack or not p:
        raise err(404, "not_found", "Open the lesson first.")
    missing = [a for a in pack["activities"] if not p.steps.get(a)]
    if missing:
        raise err(400, "invalid", "Finish every step first: " + ", ".join(missing))
    first = p.state != "completed"
    if first:
        p.state, p.completed_at, p.percent = "completed", datetime.now(UTC), 100
    xp = award_xp(db, ctx.user.id, f"lesson-complete:{ctx.user.id}:{lesson_id}", "lesson_complete", pack["xp_on_complete"])
    touch_activity(db, ctx.user.id)
    db.commit()
    total = total_xp(db, ctx.user.id)
    return {"state": "completed", "xp_awarded": pack["xp_on_complete"] if xp else 0, "xp_total": total, "level": level_info(total)}
