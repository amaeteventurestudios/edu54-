"""Data model (docs/18). Answer keys live in their own table and never leave the server in homework/assessment mode."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(UTC)


class School(Base):
    __tablename__ = "schools"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    local_slug: Mapped[str] = mapped_column(String(60), unique=True)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    role: Mapped[str] = mapped_column(String(20))  # owner | school_admin | sub_admin | teacher | counselor | student (permissions.py)
    display_name: Mapped[str] = mapped_column(String(80))
    title: Mapped[str | None] = mapped_column(String(80), nullable=True)  # e.g. "school counselor, Room 12"
    username: Mapped[str] = mapped_column(String(60), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="active")   # active | inactive (deactivated people keep their records but cannot sign in)
    permissions: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")        # a sub-admin's chosen permissions
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    pin_login: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")     # the credential is a short PIN set by a teacher (docs/19, young students)
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)   # students: 0 = Kindergarten .. 12, from enrollment (grades.py)
    extra_bands: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")  # bands a teacher opened up for this student (grades.py)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SafetyContact(Base):
    """Designated safety contacts (docs/41). At least one primary is required at enrollment."""
    __tablename__ = "safety_contacts"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    location: Mapped[str | None] = mapped_column(String(80), nullable=True)


class ClassRoom(Base):
    __tablename__ = "classes"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(80))
    term: Mapped[str | None] = mapped_column(String(40), nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)  # age_band, language


class ClassMember(Base):
    __tablename__ = "class_members"
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)


class Course(Base):
    __tablename__ = "courses"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(40), default="book")
    accent: Mapped[str] = mapped_column(String(20), default="blue")
    position: Mapped[int] = mapped_column(Integer, default=0)


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    module: Mapped[str] = mapped_column(String(40))
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(120))
    available: Mapped[bool] = mapped_column(Boolean, default=False)  # only lessons with real content are openable


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    state: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress | completed
    steps: Mapped[dict] = mapped_column(JSON, default=dict)                # {"read": true, "cq1": true, ...}
    percent: Mapped[float] = mapped_column(Float, default=0)
    last_position: Mapped[str | None] = mapped_column(String(60), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"))
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(120), default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ai_help_policy: Mapped[str] = mapped_column(String(20), default="hints_only")  # hints_only | open | none
    kind: Mapped[str] = mapped_column(String(20), default="homework")             # homework | assessment
    max_score: Mapped[float] = mapped_column(Float, default=0)
    set_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"))
    index: Mapped[int] = mapped_column(Integer)
    prompt: Mapped[str] = mapped_column(Text)
    code: Mapped[str | None] = mapped_column(Text, nullable=True)
    kind: Mapped[str] = mapped_column(String(20))  # number | sequence | text | choice
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)   # choice questions: the options shown to students


class QuestionHint(Base):
    __tablename__ = "question_hints"
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), primary_key=True)
    step: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text)


class AnswerKey(Base):
    """Never sent to the tutor prompt in homework/assessment mode, never returned by any student endpoint (docs/42 rule 2)."""
    __tablename__ = "answer_keys"
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))
    value: Mapped[dict] = mapped_column(JSON)              # {"value": 5, "tolerance": 0} or {"value": ["0","1"]}
    misconceptions: Mapped[list] = mapped_column(JSON, default=list)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("assignment_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    state: Mapped[str] = mapped_column(String(20), default="draft")  # draft | submitted | returned
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    teacher_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    graded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class QuestionAttempt(Base):
    """Every server-side answer check and hint served. Feeds 'needs help' signals; never exposes the key."""
    __tablename__ = "question_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"))
    kind: Mapped[str] = mapped_column(String(10))  # check | hint
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hint_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    misconception: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class XpEvent(Base):
    """Immutable, idempotent by `key` (docs/15)."""
    __tablename__ = "xp_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    key: Mapped[str] = mapped_column(String(120), unique=True)
    kind: Mapped[str] = mapped_column(String(40))
    amount: Mapped[int] = mapped_column(Integer)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UserBadge(Base):
    __tablename__ = "user_badges"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    badge_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ActivityDay(Base):
    """One row per user per school day with learning activity, for streaks (private to the student)."""
    __tablename__ = "activity_days"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)  # YYYY-MM-DD


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40), default="python-lab")
    code: Mapped[str] = mapped_column(Text, default="")
    lesson_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")   # in_progress | submitted (handed in to the teacher)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("user_id", "title"),)


class Conversation(Base):
    __tablename__ = "ai_conversations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    mode: Mapped[str] = mapped_column(String(20))
    context_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    context_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    visible_to_teacher: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    title: Mapped[str | None] = mapped_column(String(80), nullable=True)   # short auto-title; the student can rename
    messages: Mapped[list[Message]] = relationship(back_populates="conversation", order_by="Message.id")


class Message(Base):
    __tablename__ = "ai_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("ai_conversations.id"))
    role: Mapped[str] = mapped_column(String(12))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    safety_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    citations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(8), nullable=True)  # up | down (a "down" is shown to teachers as a flagged answer)
    feedback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class SafetyEvent(Base):
    """Minimal record (docs/41): category, severity, action, time, student. Never leaves the appliance."""
    __tablename__ = "safety_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(10))
    action: Mapped[str] = mapped_column(String(20))
    direction: Mapped[str] = mapped_column(String(10), default="input")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SafetyAlert(Base):
    """Visible only to designated safety contacts."""
    __tablename__ = "safety_alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("safety_events.id"))
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    excerpt: Mapped[str] = mapped_column(Text)              # triggering message
    reply: Mapped[str] = mapped_column(Text)                # the tutor's (fixed) support response
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | acknowledged | closed
    acknowledged_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_type: Mapped[str] = mapped_column(String(20), default="user")
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    csrf: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(60), index=True)
    ip: Mapped[str] = mapped_column(String(64), default="")
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RevisionAttempt(Base):
    """One answered revision question (practice or sprint). Feeds Weak Topics and the recommended topic on the Revision page."""
    __tablename__ = "revision_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question_id: Mapped[str] = mapped_column(String(60))
    concept: Mapped[str] = mapped_column(String(80))
    correct: Mapped[bool] = mapped_column(Boolean)
    source: Mapped[str] = mapped_column(String(12), default="practice")  # practice | sprint
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Notification(Base):
    """Something a person should know about, for example that work was graded. Shown under the bell; never carries chat text."""
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(String(300), default="")
    link: Mapped[str | None] = mapped_column(String(120), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Document(Base):
    """A school's own document (Local Documents, docs/13): uploaded by staff, stored on this device, never sent anywhere."""
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    title: Mapped[str] = mapped_column(String(160))
    filename: Mapped[str] = mapped_column(String(200))
    mime: Mapped[str] = mapped_column(String(80))
    size: Mapped[int] = mapped_column(Integer)
    audience: Mapped[str] = mapped_column(String(20), default="students")   # students (everyone in the school) | staff
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CustomLesson(Base):
    """A lesson a teacher made with the AI Lesson Builder: drafted by the local model, edited and approved by the teacher.
    Published lessons appear in the 'From Your Teachers' course; the pack has the same shape as content/*/lesson-*.json."""
    __tablename__ = "custom_lessons"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(120))
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pack: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="draft")   # draft | published
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ExerciseProgress(Base):
    """A student's work on one School Library practice exercise (Khan Academy Perseus): recent results and mastery."""
    __tablename__ = "exercise_progress"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    node_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    recent: Mapped[str] = mapped_column(String(40), default="")        # last results, oldest first: "1" right, "0" wrong
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    mastered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
