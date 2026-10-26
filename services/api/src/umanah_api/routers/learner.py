"""The learner's context for the Student Home (owner, 2026-09-30): level, school stage, grade band, learning path,
recommendation, latest project and skills. Everything is computed from real progress; steps with no content yet say so.

One student's page for staff is the AI Lab's (/api/teacher/students/{id}), shared by both brands.

K-12 has four learner experiences from one platform, chosen by the class level (never by the student):
Discover (K-2) -> Explore (3-5) -> Build (6-8) -> Launch (9-12). Staff can preview each one.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import branding
from ..db import get_db
from ..deps import Ctx, current, err
from ..models import ClassMember, ClassRoom, Course, Lesson, LessonProgress, Project, QuestionAttempt, RevisionAttempt
from ..xp import level_info, streak_days, total_xp
from .learn import _course_percent, _lesson_ref, _next_lesson

router = APIRouter(prefix="/api/learner", tags=["learner"])

# Learning path per band: (step title, course id or None when that content does not exist yet)
PATHS: dict[str, list[tuple[str, str | None]]] = {
    "discover": [("Meet the AI helper", None), ("Patterns and puzzles", None), ("Stories and pictures", None)],
    "explore": [("AI Foundations", "ai-foundations"), ("Coding with blocks", None), ("Science & Engineering", "science-engineering")],
    "build": [("AI Foundations", "ai-foundations"), ("Python", "python-foundations"), ("Data", None), ("Build your first AI project", None)],
    "launch": [("Python", "python-foundations"), ("AI Foundations", "ai-foundations"), ("Data science", None), ("Machine learning", None), ("Portfolio project", None)],
    "": [("Python", "python-foundations"), ("AI Foundations", "ai-foundations"), ("Data science", None), ("Machine learning", None)],
}


def _stage(level: str) -> str:
    stages = branding.edition().get("stages") or {}
    return next((v for k, v in stages.items() if level.startswith(k)), "")


def band_for(level: str) -> dict | None:
    for bid, b in (branding.edition().get("bands") or {}).items():
        if level in b.get("levels", []):
            return {"id": bid, "name": b["name"], "grades": b["grades"]}
    return None


def _level_of(db: Session, user_id: int) -> str:
    from ..grades import grade_label, _levels
    from ..models import User
    u = db.get(User, user_id)
    if u is not None and u.grade is not None and _levels():         # the grade a teacher or admin set wins over the class level
        return grade_label(u.grade) or ""
    for c in db.scalars(select(ClassRoom).join(ClassMember, ClassMember.class_id == ClassRoom.id).where(ClassMember.user_id == user_id).order_by(ClassRoom.id)):
        if (c.settings or {}).get("level"):
            return c.settings["level"]
    return ""


def _context(db: Session, user_id: int | None, level: str, band: dict | None) -> dict:
    uid = user_id or -1                                     # a preview has no learner: every number is zero
    steps, done, total = [], 0, 0
    for title, cid in PATHS[band["id"] if band else ""]:
        if cid and db.get(Course, cid):
            pct, d, t = _course_percent(db, uid, cid)
            avail = db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == cid, Lesson.available.is_(True))) or 0
            steps.append({"title": title, "course_id": cid, "percent": pct, "state": "available" if avail else "coming_soon"})
            if avail:
                done, total = done + d, total + t
        else:
            steps.append({"title": title, "course_id": None, "percent": None, "state": "coming_soon"})
    rec = None
    for s in steps:
        if s["course_id"] and (n := _next_lesson(db, uid, s["course_id"])) and n.available:
            rec = {**_lesson_ref(n), "course": db.get(Course, s["course_id"]).title}
            break
    proj = db.scalars(select(Project).where(Project.user_id == uid).order_by(Project.updated_at.desc())).first()
    ai_pct = _course_percent(db, uid, "ai-foundations")[0] if db.get(Course, "ai-foundations") else 0
    py_pct = _course_percent(db, uid, "python-foundations")[0] if db.get(Course, "python-foundations") else 0
    data_done = bool(db.scalar(select(LessonProgress.lesson_id).where(LessonProgress.user_id == uid, LessonProgress.lesson_id == "ai-foundations-l2", LessonProgress.state == "completed")))
    solved = (db.scalar(select(func.count()).select_from(QuestionAttempt).where(QuestionAttempt.user_id == uid, QuestionAttempt.correct.is_(True))) or 0) + \
             (db.scalar(select(func.count()).select_from(RevisionAttempt).where(RevisionAttempt.user_id == uid, RevisionAttempt.correct.is_(True))) or 0)
    grow = lambda p: "strong" if p >= 70 else "growing" if p >= 30 else "started" if p > 0 else "not_started"
    skills = [{"name": "AI Literacy", "state": grow(ai_pct), "detail": f"AI Foundations {ai_pct}%"},
              {"name": "Python", "state": grow(py_pct), "detail": f"Python Foundations {py_pct}%"},
              {"name": "Problem Solving", "state": "growing" if solved >= 10 else "started" if solved else "not_started", "detail": f"{solved} questions solved"},
              {"name": "Data", "state": "started" if data_done else "not_started", "detail": "Data and patterns lesson" + (" done" if data_done else " not done yet")},
              {"name": "Digital Citizenship", "state": "not_started", "detail": "lessons coming soon"}]
    xp = total_xp(db, uid) if user_id else 0
    return {"level": level, "stage": _stage(level), "band": band, "path": {"steps": steps, "lessons_done": done, "lessons_total": total,
            "percent": round(100 * done / total) if total else 0}, "recommended": rec,
            "project": {"id": proj.id, "title": proj.title, "updated_at": proj.updated_at.isoformat()} if proj else None,
            "skills": skills, "xp": level_info(xp), "streak": streak_days(db, uid) if user_id else 0}


@router.get("/me")
def me(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    level = _level_of(db, ctx.user.id)
    return {**_context(db, ctx.user.id, level, band_for(level)), "preview": False}


@router.get("/preview")
def preview(band: str = Query(pattern="^(discover|explore|build|launch)$"), ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Staff see what a learner in each band sees (the "View as" switch). No learner's data is shown."""
    if ctx.user.role == "student":
        raise err(403, "forbidden", "Only staff can preview.")
    b = (branding.edition().get("bands") or {}).get(band)
    if not b:
        raise err(404, "not_found", "This edition has no grade bands.")
    level = b["levels"][len(b["levels"]) // 2]
    return {**_context(db, None, level, {"id": band, "name": b["name"], "grades": b["grades"]}), "preview": True}


# ---- Staff: School -> Grade -> Class -> Student, and one learner's view (owner, 2026-09-30) -------------------------
def _staff_classes(db: Session, ctx: Ctx) -> list[ClassRoom]:
    from ..permissions import has
    q = select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id).order_by(ClassRoom.id)
    if not has(ctx.user, "admin.access"):
        if not has(ctx.user, "teaching"):
            raise err(403, "forbidden", "Only staff can see this.")
        q = q.where(ClassRoom.teacher_id == ctx.user.id)
    return list(db.scalars(q))


def _path_numbers(db: Session, uid: int, band: dict | None) -> tuple[int, int]:
    done = total = 0
    for _, cid in PATHS[band["id"] if band else ""]:
        if cid and db.get(Course, cid) and db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == cid, Lesson.available.is_(True))):
            _, d, t = _course_percent(db, uid, cid)
            done, total = done + d, total + t
    return done, total


def _struggles(db: Session, uid: int) -> list[dict]:
    """Concepts this learner got wrong at least twice (lesson checks, homework checks and practice), most first."""
    from collections import Counter
    c: Counter = Counter()
    for m in db.scalars(select(QuestionAttempt.misconception).where(QuestionAttempt.user_id == uid, QuestionAttempt.correct.is_(False), QuestionAttempt.misconception.is_not(None))):
        c[m.replace("-", " ")] += 1
    for r in db.scalars(select(RevisionAttempt.concept).where(RevisionAttempt.user_id == uid, RevisionAttempt.correct.is_(False))):
        c[r] += 1
    return [{"concept": k, "wrong": n} for k, n in c.most_common() if n >= 2]


@router.get("/school")
def school(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Staff: bands -> levels -> classes -> learners. Admins see the whole school; teachers see their own classes."""
    from ..models import User
    levels = branding.edition().get("levels") or []
    groups: dict[str, dict] = {}
    for c in _staff_classes(db, ctx):
        level = (c.settings or {}).get("level", "")
        band = band_for(level)
        g = groups.setdefault(band["id"] if band else "", {"band": band, "levels": {}})
        lv = g["levels"].setdefault(level, {"level": level, "stage": _stage(level), "classes": []})
        teacher = db.get(User, c.teacher_id)
        learners = []
        for u in db.scalars(select(User).join(ClassMember, ClassMember.user_id == User.id).where(ClassMember.class_id == c.id, User.role == "student").order_by(User.display_name)):
            d, t = _path_numbers(db, u.id, band)
            learners.append({"id": u.id, "name": u.display_name, "path_percent": round(100 * d / t) if t else 0,
                             "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None, "needs_help": bool(_struggles(db, u.id))})
        lv["classes"].append({"id": c.id, "name": c.name, "teacher": teacher.display_name if teacher else None, "learners": learners,
                              "average": round(sum(x["path_percent"] for x in learners) / len(learners)) if learners else 0})
    order = list((branding.edition().get("bands") or {}).keys()) + [""]
    out = []
    for bid in sorted(groups, key=lambda b: order.index(b) if b in order else 99):
        g = groups[bid]
        out.append({"band": g["band"], "levels": sorted(g["levels"].values(), key=lambda x: levels.index(x["level"]) if x["level"] in levels else 99)})
    return {"groups": out}
