"""Teacher Center (docs/17): class overview, submissions, grading, 'needs help' signals — teachers see their own classes only."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import hints as hints_mod
from ..content import gamification
from ..db import get_db
from ..grades import BAND_IDS, band_of, content_bands, enabled as grades_enabled, grade_json, grade_label
from ..deps import Ctx, err
from ..people import audit, create_user, reset_credential
from ..permissions import has, require_perm
from ..models import (AnswerKey, Assignment, ClassMember, ClassRoom, Conversation, Course, Lesson, LessonProgress, Message, Notification, Question,
                      Project, QuestionAttempt, Submission, User, UserBadge)
from ..xp import award_badge, award_xp, level_info, streak_days, total_xp

router = APIRouter(prefix="/api/teacher", tags=["teacher"])
teacher = require_perm("teaching")


def _my_class(db: Session, ctx: Ctx, class_id: int | None) -> ClassRoom:
    q = select(ClassRoom).where(ClassRoom.teacher_id == ctx.user.id) if ctx.user.role == "teacher" else select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id)
    if class_id:
        q = q.where(ClassRoom.id == class_id)
    c = db.scalars(q.order_by(ClassRoom.id)).first()
    if not c:
        raise err(404, "not_found", "No class found.")
    return c


def needs_help(db: Session, class_id: int, lesson_id: str = "py-l6") -> list[dict]:
    """Transparent signal: on the class's Loops assignment, >= 2 wrong checks or >= 2 hints on a question, and Lesson 6 not completed."""
    a = db.scalars(select(Assignment).where(Assignment.class_id == class_id, Assignment.lesson_id == lesson_id)).first()
    if not a:
        return []
    qids = list(db.scalars(select(Question.id).where(Question.assignment_id == a.id)))
    out = []
    for m in db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == class_id)):
        done = db.get(LessonProgress, (m, lesson_id))
        if done and done.state == "completed":
            continue
        rows = db.scalars(select(QuestionAttempt).where(QuestionAttempt.user_id == m, QuestionAttempt.question_id.in_(qids))).all()
        reasons = []
        for qid in qids:
            wrong = sum(1 for r in rows if r.question_id == qid and r.kind == "check" and r.correct is False)
            hints = sum(1 for r in rows if r.question_id == qid and r.kind == "hint")
            if wrong >= 2:
                reasons.append(f"{wrong} incorrect attempts on question {qids.index(qid) + 1}")
            elif hints >= 2:
                reasons.append(f"{hints} hints used on question {qids.index(qid) + 1}")
        if reasons:
            out.append({"id": m, "name": db.get(User, m).display_name, "reasons": reasons})
    return out


@router.get("/classes")
def classes(ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    q = select(ClassRoom).where(ClassRoom.teacher_id == ctx.user.id) if ctx.user.role == "teacher" else select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id)
    return {"classes": [{"id": c.id, "name": c.name, "subject": c.subject, "students": db.scalar(select(func.count()).select_from(ClassMember).where(ClassMember.class_id == c.id))} for c in db.scalars(q)]}


@router.get("/overview")
def overview(class_id: int | None = None, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    if not _my_classes(db, ctx):
        return {"empty": True}         # a new teacher with no class yet: an empty page with next steps, not an error
    c = _my_class(db, ctx, class_id)
    members = list(db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == c.id)))
    lesson = db.get(Lesson, "py-l6")
    progress = {p.user_id: p for p in db.scalars(select(LessonProgress).where(LessonProgress.lesson_id == "py-l6", LessonProgress.user_id.in_(members)))}
    completed = [m for m in members if progress.get(m) and progress[m].state == "completed"]
    in_prog = [m for m in members if progress.get(m) and progress[m].state == "in_progress" and progress[m].percent > 0]
    not_started = [m for m in members if m not in completed and m not in in_prog]
    avg = round(sum((100 if progress.get(m) and progress[m].state == "completed" else (progress[m].percent if progress.get(m) else 0)) for m in members) / max(1, len(members)))
    asg = db.scalars(select(Assignment).where(Assignment.class_id == c.id).order_by(Assignment.due_at)).all()
    subs = db.execute(select(Submission, User, Assignment).join(User, User.id == Submission.user_id).join(Assignment, Assignment.id == Submission.assignment_id)
                      .where(Assignment.class_id == c.id, Submission.state.in_(["submitted", "returned"])).order_by(Submission.submitted_at.desc()).limit(10)).all()
    return {
        "class": {"id": c.id, "name": c.name, "subject": c.subject}, "lesson": {"id": lesson.id, "title": f"Lesson {lesson.number}: {lesson.title}"},
        "students": len(members), "completed": len(completed), "in_progress": len(in_prog), "not_started": len(not_started), "average_completion": avg,
        "needs_help": needs_help(db, c.id), "help_topic": "Python loops",
        "assignments": [{"id": a.id, "title": a.title, "due_at": a.due_at.isoformat()} for a in asg],
        "recent_submissions": [{"id": s.id, "student": u.display_name, "assignment": a.title, "assignment_id": a.id, "state": s.state,
                                 "status": "Graded" if s.state == "returned" else "Needs review",
                                 "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None, "score": s.score, "max_score": a.max_score} for s, u, a in subs],
        "roster": [{"id": u.id, "name": u.display_name, "lesson_percent": (100 if progress.get(u.id) and progress[u.id].state == "completed" else (progress[u.id].percent if progress.get(u.id) else 0))}
                   for u in db.scalars(select(User).where(User.id.in_(members)).order_by(User.display_name))],
    }


def _teacher_owns_sub(db: Session, ctx: Ctx, s: Submission) -> Assignment:
    a = db.get(Assignment, s.assignment_id)
    c = db.get(ClassRoom, a.class_id)
    if ctx.user.role == "teacher" and c.teacher_id != ctx.user.id:
        raise err(404, "not_found", "Submission not found.")
    return a


@router.get("/submissions/{sid}")
def submission(sid: int, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    s = db.get(Submission, sid)
    if not s:
        raise err(404, "not_found", "Submission not found.")
    a = _teacher_owns_sub(db, ctx, s)
    st = db.get(User, s.user_id)
    qs = db.execute(select(Question, AnswerKey).join(AnswerKey, AnswerKey.question_id == Question.id).where(Question.assignment_id == a.id).order_by(Question.index)).all()
    from ..tutor import answers as A
    items = []
    for q, k in qs:
        given = s.answers.get(q.id, "")
        ok, tag, _ = A.check(k.kind, k.value, k.misconceptions, given) if given else (False, None, None)
        items.append({"id": q.id, "index": q.index, "prompt": q.prompt, "code": q.code, "answer": given, "correct": ok, "misconception": tag,
                      "expected": (" ".join(map(str, k.value["value"])) if k.kind == "sequence" else str(k.value["value"])),
                      "hints_used": hints_mod.hints_used(db, st.id, q.id),
                      "wrong_checks": db.scalar(select(func.count()).select_from(QuestionAttempt).where(QuestionAttempt.user_id == st.id, QuestionAttempt.question_id == q.id, QuestionAttempt.kind == "check", QuestionAttempt.correct.is_(False)))})
    chats = []
    for conv in db.scalars(select(Conversation).where(Conversation.user_id == st.id, Conversation.context_type == "assignment", Conversation.context_id == a.id, Conversation.visible_to_teacher.is_(True))):
        chats.append([{"role": m.role, "content": m.content} for m in conv.messages if not (m.safety_result or {}).get("category")])
    return {"id": s.id, "student": {"id": st.id, "name": st.display_name}, "assignment": {"id": a.id, "title": a.title, "max_score": a.max_score},
            "state": s.state, "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None, "items": items,
            "suggested_score": sum(1 for i in items if i["correct"]), "score": s.score, "feedback": s.teacher_feedback, "chats": chats}


class GradeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    score: float = Field(ge=0)
    feedback: str = Field(default="", max_length=2000)


@router.post("/submissions/{sid}/grade")
def grade(sid: int, body: GradeIn, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    s = db.get(Submission, sid)
    if not s:
        raise err(404, "not_found", "Submission not found.")
    a = _teacher_owns_sub(db, ctx, s)
    if s.state == "draft":
        raise err(409, "policy_denied", "This work hasn't been submitted yet.")
    if body.score > a.max_score:
        raise err(400, "invalid", f"The maximum score is {a.max_score:g}.")
    s.score, s.teacher_feedback, s.state = body.score, body.feedback, "returned"
    s.graded_by_id, s.graded_at = ctx.user.id, datetime.now(UTC)
    g = gamification()
    awarded = []
    passed = a.max_score > 0 and 100 * body.score / a.max_score >= g["pass_percent"]
    if passed:
        award_xp(db, s.user_id, f"assignment-pass:{s.user_id}:{a.id}", "assignment_graded_pass", g["xp"]["assignment_graded_pass"], actor_id=ctx.user.id, reason=f"graded {a.title}")
        lp = db.get(LessonProgress, (s.user_id, a.lesson_id)) if a.lesson_id else None
        if a.id == "asg-loops-practice" and lp and lp.state == "completed" and award_badge(db, s.user_id, "loop-master"):
            awarded.append("loop-master")
    db.add(Notification(user_id=s.user_id, kind="graded", title=f"{a.title} was graded",
                        body=(f"Score {body.score:g} out of {a.max_score:g}." + (f" {body.feedback[:160]}" if body.feedback else "")), link=f"/assignments/{a.id}"))
    audit(db, ctx.user, "submission.grade", f"submission:{s.id}", f"{body.score:g}/{a.max_score:g}")
    db.commit()
    return {"state": "returned", "badges_awarded": awarded}


@router.get("/students/{uid}")
def student(uid: int, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    if uid not in _my_student_ids(db, ctx):
        raise err(404, "not_found", "Student not found in your classes.")
    u = db.get(User, uid)
    xp = total_xp(db, uid)
    courses = []
    from .learn import _course_percent
    for co in db.scalars(select(Course).order_by(Course.position)):
        pct, _, _ = _course_percent(db, uid, co.id)
        courses.append({"id": co.id, "title": co.title, "percent": pct})
    # strengths and struggles from practice answers: a concept needs at least two answers to count
    from ..models import ExerciseProgress, RevisionAttempt
    tally: dict[str, list[int]] = {}
    for concept, ok in db.execute(select(RevisionAttempt.concept, RevisionAttempt.correct).where(RevisionAttempt.user_id == uid)):
        t = tally.setdefault(concept, [0, 0]); t[0] += int(ok); t[1] += 1
    concepts = [{"concept": c, "correct": r, "answered": n, "percent": round(100 * r / n)} for c, (r, n) in tally.items() if n >= 2]
    strengths = sorted([c for c in concepts if c["percent"] >= 70], key=lambda c: -c["percent"])
    struggling = sorted([c for c in concepts if c["percent"] < 50], key=lambda c: c["percent"])
    history = []
    for a, sub in db.execute(select(Assignment, Submission).outerjoin(Submission, (Submission.assignment_id == Assignment.id) & (Submission.user_id == uid))
                             .where(Assignment.class_id.in_([c.id for c in _my_classes(db, ctx)] or [0])).order_by(Assignment.due_at)):
        history.append({"id": a.id, "title": a.title, "due_at": a.due_at.isoformat(), "state": sub.state if sub else "not_started",
                        "score": sub.score if sub else None, "max_score": a.max_score})
    late = [h for h in history if h["state"] == "not_started" and h["due_at"] < datetime.now(UTC).isoformat()]
    nxt = (f"Go over {struggling[0]['concept']} with a short worked example, then one practice question." if struggling
           else f"Follow up on {late[0]['title']}, which is past due." if late
           else "Offer a stretch challenge: they are keeping up with the class.")
    projects = [{"id": p.id, "title": p.title, "category": p.category, "status": p.status, "updated_at": p.updated_at.isoformat(),
                 "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None, "notes": p.code if p.status == "submitted" else None}
                for p in db.scalars(select(Project).where(Project.user_id == uid).order_by(Project.updated_at.desc()).limit(20))]
    return {"id": u.id, "name": u.display_name, **grade_json(u.grade), "extra_bands": u.extra_bands or [], "content_bands": content_bands(u.grade, u.extra_bands),
            "projects": projects, "courses": courses, "xp": xp, "level": level_info(xp), "streak": streak_days(db, uid),
            "badges": [b.badge_id for b in db.scalars(select(UserBadge).where(UserBadge.user_id == uid))],
            "strengths": strengths[:5], "struggling": struggling[:5], "assignments": history, "next_step": nxt,
            "practice": [{"title": e.title, "mastered": bool(e.mastered_at), "correct": e.correct, "attempts": e.attempts}
                         for e in db.scalars(select(ExerciseProgress).where(ExerciseProgress.user_id == uid).order_by(ExerciseProgress.updated_at.desc()).limit(20))]}


# ------------------------------------------------------------------------------------------------ class tools (docs/17, 19, 45)
def _my_classes(db: Session, ctx: Ctx) -> list[ClassRoom]:
    q = select(ClassRoom).where(ClassRoom.teacher_id == ctx.user.id) if ctx.user.role == "teacher" else select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id)
    return list(db.scalars(q.order_by(ClassRoom.name)))


def _my_student_ids(db: Session, ctx: Ctx) -> set[int]:
    ids = [c.id for c in _my_classes(db, ctx)]
    return set(db.scalars(select(ClassMember.user_id).where(ClassMember.class_id.in_(ids or [0]))))


def _class_of(db: Session, ctx: Ctx, cid: int) -> ClassRoom:
    c = next((c for c in _my_classes(db, ctx) if c.id == cid), None)
    if not c:
        raise err(404, "not_found", "That class isn't one of yours.")
    return c


def _class_grade(db: Session, c: ClassRoom) -> int | None:
    """New students in a class get the grade most of its students have (the teacher can change it)."""
    from collections import Counter
    grades = Counter(g for g in db.scalars(select(User.grade).join(ClassMember, ClassMember.user_id == User.id).where(ClassMember.class_id == c.id)) if g is not None)
    return grades.most_common(1)[0][0] if grades else None


def _my_student(db: Session, ctx: Ctx, uid: int) -> User:
    u = db.get(User, uid)
    if not u or u.role != "student" or uid not in _my_student_ids(db, ctx):
        raise err(404, "not_found", "Student not found in your classes.")
    return u


def _stu_json(db: Session, u: User) -> dict:
    lp = db.get(LessonProgress, (u.id, "py-l6"))
    return {"id": u.id, "name": u.display_name, "username": u.username, "status": u.status, "pin_login": u.pin_login, "grade": u.grade, "grade_label": grade_label(u.grade),
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "lesson_percent": 100 if lp and lp.state == "completed" else (lp.percent if lp else 0)}


@router.get("/classes/{cid}/students")
def class_students(cid: int, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    c = _class_of(db, ctx, cid)
    ids = db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == c.id)).all()
    return {"class": {"id": c.id, "name": c.name, "age_band": (c.settings or {}).get("age_band", "13-15")},
            "students": [_stu_json(db, u) for u in db.scalars(select(User).where(User.id.in_(ids or [0])).order_by(User.display_name))]}


class NewStudent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)
    credential: str = Field(default="password", pattern="^(password|pin)$")
    grade: int | None = Field(default=None, ge=0, le=12)


@router.post("/classes/{cid}/students", status_code=201)
def add_student(cid: int, body: NewStudent, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    c = _class_of(db, ctx, cid)
    u, cred = create_user(db, school_id=c.school_id, name=body.name, role="student", kind=body.credential)
    u.grade = body.grade if body.grade is not None else _class_grade(db, c)
    db.add(ClassMember(class_id=c.id, user_id=u.id))
    audit(db, ctx.user, "student.create", f"user:{u.id}", f"class {c.id}")
    db.commit()
    return {**_stu_json(db, u), "credential": cred, "class_name": c.name}


class CsvIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csv: str = Field(min_length=1, max_length=40000)
    credential: str = Field(default="password", pattern="^(password|pin)$")


@router.post("/classes/{cid}/students/import", status_code=201)
def import_students(cid: int, body: CsvIn, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    """CSV with a name on each line (an optional header row 'name'). Returns the new logins once, and a plain-language reason for every row that was skipped."""
    import csv as _csv
    import io
    c = _class_of(db, ctx, cid)
    rows = [r for r in _csv.reader(io.StringIO(body.csv.strip())) if r and any(x.strip() for x in r)]
    if rows and rows[0][0].strip().lower() in ("name", "student", "student name", "full name"):
        rows = rows[1:]
    if len(rows) > 200:
        raise err(400, "invalid", "Import up to 200 students at a time.")
    grade = _class_grade(db, c)
    created, errors, taken = [], [], set()
    for i, r in enumerate(rows, start=1):
        name = " ".join(r[0].split())
        if not name or len(name) > 80:
            errors.append({"row": i, "message": "The name is empty or too long."})
            continue
        u, cred = create_user(db, school_id=c.school_id, name=name, role="student", kind=body.credential, taken=taken)
        u.grade = grade
        taken.add(u.username)
        db.add(ClassMember(class_id=c.id, user_id=u.id))
        created.append({"id": u.id, "name": u.display_name, "username": u.username, "credential": cred, "pin_login": u.pin_login})
    audit(db, ctx.user, "student.import", f"class:{c.id}", f"{len(created)} created, {len(errors)} skipped")
    db.commit()
    return {"created": created, "errors": errors, "class_name": c.name}


class RenameStudent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=80)
    grade: int | None = Field(default=None, ge=0, le=12)
    extra_bands: list[str] | None = Field(default=None, max_length=4)   # widen: other bands' courses, games and shelves


@router.patch("/students/{uid}")
def rename_student(uid: int, body: RenameStudent, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    """A teacher sets a student's name and grade (grade comes from enrollment; students never choose it)."""
    u = _my_student(db, ctx, uid)
    if body.name:
        u.display_name = " ".join(body.name.split())
    if "grade" in body.model_fields_set:
        audit(db, ctx.user, "student.grade", f"user:{u.id}", f"{u.grade} -> {body.grade}")
        u.grade = body.grade
    if body.extra_bands is not None:
        if not grades_enabled():
            raise err(400, "no_bands", "This edition has no grade bands.")
        if any(b not in BAND_IDS for b in body.extra_bands):
            raise err(422, "bad_band", "Unknown grade band.")
        extra = [b for b in BAND_IDS if b in body.extra_bands and b != band_of(u.grade)]
        audit(db, ctx.user, "student.widen", f"user:{u.id}", f"{u.extra_bands or []} -> {extra}")
        u.extra_bands = extra
    audit(db, ctx.user, "student.edit", f"user:{u.id}")
    db.commit()
    return _stu_json(db, u)


class ResetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str = Field(default="password", pattern="^(password|pin)$")


@router.post("/students/{uid}/reset")
def reset_student(uid: int, body: ResetIn, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    from ..models import AuthSession
    from sqlalchemy import delete as sql_delete
    u = _my_student(db, ctx, uid)
    cred = reset_credential(db, u, body.kind)
    db.execute(sql_delete(AuthSession).where(AuthSession.user_id == u.id))
    audit(db, ctx.user, "student.reset_credential", f"user:{u.id}", body.kind)
    db.commit()
    return {"id": u.id, "name": u.display_name, "username": u.username, "credential": cred, "pin_login": u.pin_login}


class MoveIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    from_class_id: int
    to_class_id: int


@router.post("/students/{uid}/move")
def move_student(uid: int, body: MoveIn, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    u = _my_student(db, ctx, uid)
    src, dst = _class_of(db, ctx, body.from_class_id), _class_of(db, ctx, body.to_class_id)
    m = db.get(ClassMember, (src.id, u.id))
    if not m:
        raise err(404, "not_found", "That student isn't in that class.")
    db.delete(m)
    if not db.get(ClassMember, (dst.id, u.id)):
        db.add(ClassMember(class_id=dst.id, user_id=u.id))
    audit(db, ctx.user, "student.move", f"user:{u.id}", f"{src.id} -> {dst.id}")
    db.commit()
    return {"ok": True}


@router.delete("/classes/{cid}/students/{uid}", status_code=204)
def remove_from_class(cid: int, uid: int, ctx: Ctx = Depends(require_perm("teaching", "students.manage_own")), db: Session = Depends(get_db)):
    """Takes the student out of this class only. Their account, work and XP are untouched (deactivating an account is an admin job)."""
    c = _class_of(db, ctx, cid)
    m = db.get(ClassMember, (c.id, uid))
    if m:
        db.delete(m)
        audit(db, ctx.user, "student.remove_from_class", f"user:{uid}", f"class {c.id}")
        db.commit()


@router.get("/students")
def all_students(q: str | None = None, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    """Every student in the teacher's classes, with the classes they are in."""
    classes = _my_classes(db, ctx)
    by_student: dict[int, list[dict]] = {}
    for m in db.scalars(select(ClassMember).where(ClassMember.class_id.in_([c.id for c in classes] or [0]))):
        by_student.setdefault(m.user_id, []).append({"id": m.class_id, "name": next(c.name for c in classes if c.id == m.class_id)})
    users = db.scalars(select(User).where(User.id.in_(list(by_student) or [0])).order_by(User.display_name)).all()
    if q and q.strip():
        users = [u for u in users if q.strip().lower() in (u.display_name + " " + u.username).lower()]
    return {"classes": [{"id": c.id, "name": c.name} for c in classes], "students": [{**_stu_json(db, u), "classes": by_student[u.id]} for u in users]}


@router.get("/school")
def school_tree(ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    """School -> Grade -> Class -> Student (K-12 UI spec), for the classes this person can see. A class with students in two
    grades appears under both; students without a grade are listed last."""
    if not grades_enabled():
        raise err(404, "not_found", "This edition has no grade bands.")
    from ..models import School
    classes = _my_classes(db, ctx)
    grades: dict[int | None, dict[int, list[dict]]] = {}
    for c in classes:
        for u in db.scalars(select(User).join(ClassMember, ClassMember.user_id == User.id).where(ClassMember.class_id == c.id).order_by(User.display_name)):
            grades.setdefault(u.grade, {}).setdefault(c.id, []).append({"id": u.id, "name": u.display_name, "status": u.status})
    order = sorted(grades, key=lambda g: 99 if g is None else g)
    names = {c.id: c.name for c in classes}
    school = db.get(School, ctx.user.school_id)
    return {"school": school.name if school else None, "grades": [
        {"grade": g, "grade_label": grade_label(g) or "Grade not set", **({"band": band_of(g), "stage": grade_json(g)["stage"]} if g is not None else {"band": None, "stage": None}),
         "classes": [{"id": cid, "name": names[cid], "students": studs} for cid, studs in sorted(grades[g].items(), key=lambda x: names[x[0]])]}
        for g in order]}


@router.get("/flagged")
def flagged(ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    """Tutor answers that students marked as wrong or unhelpful (thumbs down), from chats that are visible to the teacher (docs/41)."""
    ids = _my_student_ids(db, ctx)
    out = []
    rows = db.execute(select(Message, Conversation, User).join(Conversation, Conversation.id == Message.conversation_id).join(User, User.id == Conversation.user_id)
                      .where(Message.feedback == "down", Conversation.user_id.in_(ids or [0]), Conversation.visible_to_teacher.is_(True)).order_by(Message.feedback_at.desc()).limit(20)).all()
    for m, conv, u in rows:
        q = db.scalar(select(Message.content).where(Message.conversation_id == conv.id, Message.role == "user", Message.id < m.id).order_by(Message.id.desc()))
        out.append({"id": m.id, "student": u.display_name, "question": (q or "")[:200], "answer": m.content[:600], "mode": conv.mode, "at": m.feedback_at.isoformat() if m.feedback_at else None})
    return {"flagged": out}
