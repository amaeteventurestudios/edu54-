from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..content import gamification
from ..db import get_db
from ..deps import Ctx, current, err, require_role
from ..models import Assignment, ClassMember, Project, Submission, UserBadge, now
from ..xp import award_badge, award_xp, level_info, streak_days, total_xp, touch_activity
from .learn import _course_percent

router = APIRouter(prefix="/api", tags=["progress"])


@router.get("/progress/me")
def progress_me(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    from ..models import Course
    xp = total_xp(db, ctx.user.id)
    earned = {b.badge_id: b.awarded_at for b in db.scalars(select(UserBadge).where(UserBadge.user_id == ctx.user.id))}
    courses = []
    for c in db.scalars(select(Course).order_by(Course.position)):
        pct, done, total = _course_percent(db, ctx.user.id, c.id)
        courses.append({"id": c.id, "title": c.title, "percent": pct, "lessons_done": done, "lessons_total": total,
                        "status": "Complete" if pct >= 100 else "In progress" if pct > 0 else "Not started"})
    projects = [{"id": p.id, "title": p.title, "status": p.status, "updated_at": p.updated_at.isoformat(),
                          "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None}
                for p in db.scalars(select(Project).where(Project.user_id == ctx.user.id).order_by(Project.updated_at.desc()))]
    from ..models import ExerciseProgress
    practice = [{"node_id": e.node_id, "title": e.title, "mastered": bool(e.mastered_at), "correct": e.correct, "attempts": e.attempts, "updated_at": e.updated_at.isoformat()}
                for e in db.scalars(select(ExerciseProgress).where(ExerciseProgress.user_id == ctx.user.id).order_by(ExerciseProgress.updated_at.desc()).limit(50))]
    return {"level": level_info(xp), "streak": streak_days(db, ctx.user.id), "courses": courses, "projects": projects, "practice": practice,
            "badges": [{**b, "earned": b["id"] in earned, "awarded_at": earned[b["id"]].isoformat() if b["id"] in earned else None} for b in gamification()["badges"]]}


@router.get("/badges/me")
def badges_me(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    earned = {b.badge_id for b in db.scalars(select(UserBadge).where(UserBadge.user_id == ctx.user.id))}
    return {"badges": [{**b, "earned": b["id"] in earned} for b in gamification()["badges"]]}


@router.get("/home")
def home(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Everything the Home screen needs in one request."""
    xp = total_xp(db, ctx.user.id)
    return {"level": level_info(xp), "streak": streak_days(db, ctx.user.id)}


class ProjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=120)
    code: str = Field(max_length=20000)
    category: str = "python-lab"
    lesson_id: str | None = None


@router.get("/projects")
def projects(ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    return {"projects": [{"id": p.id, "title": p.title, "code": p.code, "category": p.category, "status": p.status, "updated_at": p.updated_at.isoformat()}
                         for p in db.scalars(select(Project).where(Project.user_id == ctx.user.id).order_by(Project.updated_at.desc()))]}


@router.put("/projects")
def save_project(body: ProjectIn, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    """Projects save to the appliance. Code itself runs in the student's browser (Pyodide) — never on the server."""
    p = db.scalar(select(Project).where(Project.user_id == ctx.user.id, Project.title == body.title))
    if p is None:
        p = Project(user_id=ctx.user.id, title=body.title)
        db.add(p)
    p.code, p.category, p.lesson_id, p.updated_at = body.code, body.category, body.lesson_id, now()
    p.status, p.submitted_at = "in_progress", None      # a change after handing in is a new draft: hand it in again
    badge = award_badge(db, ctx.user.id, "first-builder")
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"id": p.id, "saved": True, "badge": "first-builder" if badge else None}


@router.post("/projects/{pid}/submit")
def submit_project(pid: int, ctx: Ctx = Depends(require_role("student")), db: Session = Depends(get_db)):
    """Hand a saved project in: the student's class teachers get a notification and can read it on the student's page."""
    from ..models import ClassRoom, Notification
    p = db.get(Project, pid)
    if not p or p.user_id != ctx.user.id:
        raise err(404, "not_found", "That project isn't one of yours.")
    if not p.code.strip():
        raise err(422, "empty", "Write something in your project before you hand it in.")
    p.status, p.submitted_at = "submitted", now()
    teachers = set(db.scalars(select(ClassRoom.teacher_id).join(ClassMember, ClassMember.class_id == ClassRoom.id).where(ClassMember.user_id == ctx.user.id)))
    for t in teachers:
        if t:
            db.add(Notification(user_id=t, kind="project", title=f"{ctx.user.display_name} handed in a project"[:120], body=p.title[:300],
                                link=f"/teacher/students/{ctx.user.id}"))
    touch_activity(db, ctx.user.id)
    db.commit()
    return {"id": p.id, "status": p.status, "submitted_at": p.submitted_at.isoformat()}
