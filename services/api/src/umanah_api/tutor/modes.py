"""Rule 1 (docs/42): the mode comes from the server. The client sends a context, never a mode."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import err
from ..models import Assignment, ClassMember, ClassRoom, Lesson, Question, User

MODES = ("general", "lesson", "homework", "assessment", "revision", "project", "teacher", "discovery")


@dataclass
class ModeInfo:
    mode: str
    badge: str                       # locked badge text shown in the UI — never a toggle
    locked: bool
    lesson_id: str | None = None
    assignment: Assignment | None = None
    question_id: str | None = None
    age_band: str = "13-15"          # the class's age band (admin setting)
    set_by: str | None = None
    teacher_visible: bool = False    # may the class teacher read this chat? (docs/41 default)
    grade_band: str | None = None    # the student's own grade band; when set it chooses only the reading level of replies
    experiment: dict | None = None   # Discovery Lab: the catalog entry the student is using
    readings: dict | None = None     # ...and its current readings, already cleaned (discovery.clean_state)


def _with_grade(info: ModeInfo, user: User) -> ModeInfo:
    """Reading level follows the student's grade (K-12 spec). This sets one field used by one prompt line; the mode, the
    locked limits, the safety checks and what teachers can see are decided exactly as before."""
    from ..grades import band_of
    if user.role == "student":
        info.grade_band = band_of(user.grade)
    return info


def age_band_for(db: Session, user: User) -> str:
    row = db.execute(select(ClassRoom).join(ClassMember, ClassMember.class_id == ClassRoom.id)
                     .where(ClassMember.user_id == user.id)).scalars().first()
    return (row.settings or {}).get("age_band", "13-15") if row else "13-15"


def resolve(db: Session, user: User, ctx_type: str | None, ctx_id: str | None, question_id: str | None, state: dict | None = None) -> ModeInfo:
    if ctx_type == "experiment":
        return _with_grade(_experiment(db, user, ctx_id, state), user)
    return _with_grade(_resolve(db, user, ctx_type, ctx_id, question_id), user)


def _experiment(db: Session, user: User, ctx_id: str | None, state: dict | None) -> ModeInfo:
    """Discovery Lab's AI Guide, for every role (Discovery Lab has no teacher side). No homework or assessment limits apply
    because nothing there is graded; the safety checks are the same as everywhere else."""
    from .. import discovery
    exp = discovery.experience(ctx_id or "")
    if exp is None:
        raise err(404, "not_found", "That experiment isn't available.")
    return ModeInfo("discovery", "Discovery Lab guide: explanations and ideas to try", True, age_band=age_band_for(db, user),
                    experiment=exp, readings=discovery.clean_state(exp, state))


def _resolve(db: Session, user: User, ctx_type: str | None, ctx_id: str | None, question_id: str | None) -> ModeInfo:
    band = age_band_for(db, user)
    if user.role != "student":
        return ModeInfo("teacher", "Teacher tools — answer keys and drafts allowed", False, age_band=band)

    if ctx_type == "assignment" and ctx_id:
        a = db.get(Assignment, ctx_id)
        member = a and db.get(ClassMember, (a.class_id, user.id))
        if not a or not member:
            raise err(404, "not_found", "That assignment isn't available to you.")
        setter = db.get(User, a.set_by_id)
        who = setter.display_name if setter else "your teacher"
        q = question_id if question_id and db.scalar(select(Question.id).where(Question.id == question_id, Question.assignment_id == a.id)) else None
        if a.kind == "assessment" or a.ai_help_policy == "none":
            return ModeInfo("assessment", f"Assessment: tutor help is off — set by {who}", True, a.lesson_id, a, q, band, who, True)
        if a.ai_help_policy == "hints_only":
            return ModeInfo("homework", f"Homework help: hints only — set by {who}", True, a.lesson_id, a, q, band, who, True)
        return ModeInfo("lesson", f"Assignment help: full explanations allowed — set by {who}", True, a.lesson_id, a, q, band, who, True)
    if ctx_type == "lesson" and ctx_id:
        if not db.get(Lesson, ctx_id):
            raise err(404, "not_found", "That lesson isn't available.")
        return ModeInfo("lesson", "Lesson help: explanations that stay with today's objective", True, ctx_id, age_band=band, teacher_visible=True)
    if ctx_type == "revision":
        return ModeInfo("revision", "Revision help: full explanations and practice", True, ctx_id, age_band=band)
    if ctx_type == "project":
        return ModeInfo("project", "Project help: hints and debugging questions", True, ctx_id, age_band=band, teacher_visible=False)
    return ModeInfo("general", "General help", False, age_band=band)
