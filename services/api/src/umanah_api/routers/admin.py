"""Admin area (docs/19, 41, 50): people, classes, safety contacts, school settings, optional services, backups and the audit log.

Every route checks a permission on the server. Nobody manages someone of equal or higher rank, nobody grants more than they hold,
the last School Owner is protected, and removing a person deactivates them: permanent deletion is a separate, admin-only step."""
from __future__ import annotations

import csv
import io
import json
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from .. import branding
from .. import engines as engines_mod
from ..config import get_settings
from ..db import engine, get_db
from ..deps import Ctx, err
from ..models import (ActivityDay, AuditLog, AuthSession, ClassMember, ClassRoom, Conversation, LessonProgress, Message, Notification, Project,
                      QuestionAttempt, RevisionAttempt, SafetyAlert, SafetyContact, SafetyEvent, School, Submission, User, UserBadge, XpEvent, now)
from ..people import audit, create_user, reset_credential
from ..permissions import ASSIGNABLE, RANK, ROLE_LABEL, active_owner_count, can_assign, can_manage, has, may_grant, perms_for, require_perm

router = APIRouter(prefix="/api/admin", tags=["admin"])
area = require_perm("admin.access")


def _person(u: User, classes: list[str] | None = None) -> dict:
    return {"id": u.id, "name": u.display_name, "username": u.username, "role": u.role, "role_label": ROLE_LABEL.get(u.role, u.role), "title": u.title,
            "status": u.status, "permissions": u.permissions or [], "pin_login": u.pin_login, "must_change_password": u.must_change_password,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None, "classes": classes or [], "grade": u.grade}


def _target(db: Session, ctx: Ctx, uid: int) -> User:
    u = db.get(User, uid)
    if not u or u.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That person isn't in this school.")
    return u


def _need_manage(ctx: Ctx, u: User) -> None:
    if u.id == ctx.user.id:
        raise err(403, "policy_denied", "You can't change your own role or status. Ask another admin.")
    if not can_manage(ctx.user, u):
        raise err(403, "policy_denied", "You can't manage someone with the same or a higher role than yours.")


# ------------------------------------------------------------------------------------------------ overview
@router.get("/overview")
def overview(ctx: Ctx = Depends(area), db: Session = Depends(get_db)):
    sid = ctx.user.school_id
    school = db.get(School, sid)
    by_role = dict(db.execute(select(User.role, func.count()).where(User.school_id == sid, User.status == "active").group_by(User.role)).all())
    week = datetime.now(UTC) - timedelta(days=7)
    inactive = db.scalar(select(func.count()).select_from(User).where(User.school_id == sid, User.status != "active")) or 0
    contacts = db.scalar(select(func.count()).select_from(SafetyContact).where(SafetyContact.school_id == sid)) or 0
    return {
        "school": school.name,
        "people": {"students": by_role.get("student", 0), "teachers": by_role.get("teacher", 0),
                   "admins": by_role.get("school_admin", 0) + by_role.get("owner", 0) + by_role.get("sub_admin", 0), "counselors": by_role.get("counselor", 0), "inactive": inactive},
        "classes": db.scalar(select(func.count()).select_from(ClassRoom).where(ClassRoom.school_id == sid)) or 0,
        "safety_contacts": contacts,
        "lessons_completed_7d": db.scalar(select(func.count()).select_from(LessonProgress).where(LessonProgress.state == "completed", LessonProgress.completed_at >= week)) or 0,
        "tutor_chats_7d": db.scalar(select(func.count()).select_from(Conversation).where(Conversation.created_at >= week)) or 0,
        "recent_activity": [{"action": a.action, "target": a.target, "at": a.created_at.isoformat()} for a in db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(5))] if has(ctx.user, "audit.view") else [],
    }


# ------------------------------------------------------------------------------------------------ people
@router.get("/people")
def people(q: str | None = None, role: str | None = None, status: str | None = None, ctx: Ctx = Depends(require_perm("admin.access")), db: Session = Depends(get_db)):
    if not (has(ctx.user, "people.manage") or has(ctx.user, "directory.view")):
        raise err(403, "policy_denied", "That area is not available to your account.")
    query = select(User).where(User.school_id == ctx.user.school_id)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.where(or_(func.lower(User.display_name).like(like), func.lower(User.username).like(like)))
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    rows = db.scalars(query.order_by(User.display_name).limit(500)).all()
    classes: dict[int, list[str]] = {}
    for uid, cname in db.execute(select(ClassMember.user_id, ClassRoom.name).join(ClassRoom, ClassRoom.id == ClassMember.class_id)):
        classes.setdefault(uid, []).append(cname)
    for c in db.scalars(select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id)):
        classes.setdefault(c.teacher_id, []).append(c.name)
    return {"people": [_person(u, classes.get(u.id)) for u in rows],
            "assignable_roles": [r for r in RANK if can_assign(ctx.user, r)], "assignable_permissions": ASSIGNABLE if has(ctx.user, "people.manage") else {},
            "may_grant": sorted(perms_for(ctx.user) & set(ASSIGNABLE)), "can_manage": has(ctx.user, "people.manage")}


class NewPerson(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)
    role: str
    username: str | None = Field(default=None, min_length=2, max_length=40, pattern=r"^[a-z0-9._-]+$")
    title: str | None = Field(default=None, max_length=80)
    permissions: list[str] = []
    class_id: int | None = None
    credential: str = Field(default="password", pattern="^(password|pin)$")
    grade: int | None = Field(default=None, ge=0, le=12)


@router.post("/people", status_code=201)
def add_person(body: NewPerson, ctx: Ctx = Depends(require_perm("admin.access", "people.manage")), db: Session = Depends(get_db)):
    if not can_assign(ctx.user, body.role):
        raise err(403, "policy_denied", "You can't create someone with that role.")
    if body.role == "sub_admin" and not may_grant(ctx.user, body.permissions):
        raise err(403, "policy_denied", "You can only give a sub-admin permissions that you have yourself.")
    if body.credential == "pin" and body.role != "student":
        raise err(400, "invalid", "PINs are for students only.")
    if body.username and db.scalar(select(User.id).where(User.username == body.username)):
        raise err(409, "invalid", "That username is taken.")
    u, cred = create_user(db, school_id=ctx.user.school_id, name=body.name, role=body.role, username=body.username, title=body.title,
                          permissions=body.permissions if body.role == "sub_admin" else [], kind=body.credential)
    if body.role == "student":
        u.grade = body.grade
    if body.class_id and body.role == "student":
        c = db.get(ClassRoom, body.class_id)
        if not c or c.school_id != ctx.user.school_id:
            raise err(404, "not_found", "That class doesn't exist.")
        db.add(ClassMember(class_id=c.id, user_id=u.id))
    audit(db, ctx.user, "person.create", f"user:{u.id}", f"{u.role} {u.username}")
    db.commit()
    return {**_person(u), "credential": cred}


class EditPerson(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=80)
    title: str | None = Field(default=None, max_length=80)
    role: str | None = None
    permissions: list[str] | None = None
    grade: int | None = Field(default=None, ge=0, le=12)


@router.patch("/people/{uid}")
def edit_person(uid: int, body: EditPerson, ctx: Ctx = Depends(require_perm("admin.access", "people.manage")), db: Session = Depends(get_db)):
    u = _target(db, ctx, uid)
    _need_manage(ctx, u)
    if body.role and body.role != u.role:
        if not can_assign(ctx.user, body.role):
            raise err(403, "policy_denied", "You can't give someone that role.")
        if u.role == "owner" and active_owner_count(db, u.school_id, excluding=u.id) == 0:
            raise err(409, "policy_denied", "This is the last School Owner. Make someone else an owner first.")
        audit(db, ctx.user, "person.role", f"user:{u.id}", f"{u.role} -> {body.role}")
        u.role = body.role
        if u.role != "sub_admin":
            u.permissions = []
    if body.permissions is not None:
        if u.role != "sub_admin":
            raise err(400, "invalid", "Only sub-admins have chosen permissions.")
        if not may_grant(ctx.user, body.permissions):
            raise err(403, "policy_denied", "You can only give permissions that you have yourself.")
        u.permissions = sorted(set(body.permissions))
        audit(db, ctx.user, "person.permissions", f"user:{u.id}", ",".join(u.permissions))
    if body.name:
        u.display_name = " ".join(body.name.split())
    if body.title is not None:
        u.title = body.title or None
    if "grade" in body.model_fields_set:
        if u.role != "student":
            raise err(400, "invalid", "Only students have a grade.")
        audit(db, ctx.user, "person.grade", f"user:{u.id}", f"{u.grade} -> {body.grade}")
        u.grade = body.grade
    audit(db, ctx.user, "person.edit", f"user:{u.id}")
    db.commit()
    return _person(u)


@router.post("/people/{uid}/deactivate")
def deactivate(uid: int, ctx: Ctx = Depends(require_perm("admin.access", "people.manage")), db: Session = Depends(get_db)):
    """Remove = deactivate: the person can no longer sign in, their work and history stay. Reversible."""
    u = _target(db, ctx, uid)
    _need_manage(ctx, u)
    if u.role == "owner" and active_owner_count(db, u.school_id, excluding=u.id) == 0:
        raise err(409, "policy_denied", "This is the last School Owner and can't be deactivated.")
    if db.get(SafetyContact, u.id) and db.scalar(select(func.count()).select_from(SafetyContact).where(SafetyContact.school_id == u.school_id)) <= 1:
        raise err(409, "policy_denied", "This is the school's only safety contact. Choose another one first.")
    u.status, u.deactivated_at = "inactive", now()
    db.execute(delete(AuthSession).where(AuthSession.user_id == u.id))
    audit(db, ctx.user, "person.deactivate", f"user:{u.id}", u.username)
    db.commit()
    return _person(u)


@router.post("/people/{uid}/reactivate")
def reactivate(uid: int, ctx: Ctx = Depends(require_perm("admin.access", "people.manage")), db: Session = Depends(get_db)):
    u = _target(db, ctx, uid)
    _need_manage(ctx, u)
    u.status, u.deactivated_at = "active", None
    audit(db, ctx.user, "person.reactivate", f"user:{u.id}", u.username)
    db.commit()
    return _person(u)


class ResetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str = Field(default="password", pattern="^(password|pin)$")


@router.post("/people/{uid}/reset-password")
def reset_password(uid: int, body: ResetIn, ctx: Ctx = Depends(require_perm("admin.access", "people.manage")), db: Session = Depends(get_db)):
    u = _target(db, ctx, uid)
    _need_manage(ctx, u)
    if body.kind == "pin" and u.role != "student":
        raise err(400, "invalid", "PINs are for students only.")
    cred = reset_credential(db, u, body.kind)
    db.execute(delete(AuthSession).where(AuthSession.user_id == u.id))
    audit(db, ctx.user, "person.reset_credential", f"user:{u.id}", body.kind)
    db.commit()
    return {"id": u.id, "username": u.username, "name": u.display_name, "credential": cred, "kind": body.kind}


_USER_TABLES = [(ActivityDay, "user_id"), (LessonProgress, "user_id"), (QuestionAttempt, "user_id"), (RevisionAttempt, "user_id"), (UserBadge, "user_id"),
                (XpEvent, "user_id"), (Project, "user_id"), (Notification, "user_id"), (AuthSession, "user_id"), (SafetyEvent, "user_id"),
                (SafetyAlert, "student_id"), (Submission, "user_id"), (ClassMember, "user_id")]


def _export(db: Session, u: User) -> dict:
    def rows(model, col):
        return [{c.name: (str(getattr(r, c.name)) if getattr(r, c.name) is not None else None) for c in model.__table__.columns} for r in db.scalars(select(model).where(getattr(model, col) == u.id))]
    convs = []
    for c in db.scalars(select(Conversation).where(Conversation.user_id == u.id)):
        convs.append({"id": c.id, "mode": c.mode, "title": c.title, "created_at": str(c.created_at), "messages": [{"role": m.role, "content": m.content, "at": str(m.created_at)} for m in c.messages]})
    return {"exported_at": now().isoformat(), "person": {"id": u.id, "name": u.display_name, "username": u.username, "role": u.role, "status": u.status},
            "tables": {m.__tablename__: rows(m, c) for m, c in _USER_TABLES if m not in (AuthSession,)}, "conversations": convs}


@router.get("/people/{uid}/export")
def export_person(uid: int, ctx: Ctx = Depends(require_perm("admin.access", "backups.manage")), db: Session = Depends(get_db)):
    u = _target(db, ctx, uid)
    audit(db, ctx.user, "person.export", f"user:{u.id}", u.username)
    db.commit()
    return _export(db, u)


class DeleteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirm: str = Field(min_length=1, max_length=60)


@router.post("/people/{uid}/delete")
def delete_person(uid: int, body: DeleteIn, ctx: Ctx = Depends(require_perm("admin.access", "data.delete")), db: Session = Depends(get_db)):
    """Permanent deletion (docs/50): admin only, only for someone already deactivated, typed confirmation, and a database backup first.
    Removes the person and everything linked to them. The audit entry keeps the username and id, nothing else."""
    u = _target(db, ctx, uid)
    _need_manage(ctx, u)
    if u.status != "inactive":
        raise err(409, "policy_denied", "Deactivate this person first. Permanent deletion is only for people who are already deactivated.")
    if body.confirm != u.username:
        raise err(400, "invalid", "Type the person's username exactly to confirm.")
    if u.role != "student":
        raise err(409, "policy_denied", "Permanent deletion is for student records. Staff accounts are deactivated, so the work they set and graded stays intact.")
    from .. import migrate
    backup = migrate._backup_sqlite(engine(), f"delete-user-{u.id}")
    for cid in db.scalars(select(Conversation.id).where(Conversation.user_id == u.id)).all():
        db.execute(delete(Message).where(Message.conversation_id == cid))
    db.execute(delete(Conversation).where(Conversation.user_id == u.id))
    # alerts reference events, so remove alerts before events
    db.execute(delete(SafetyAlert).where(SafetyAlert.student_id == u.id))
    for model, col in _USER_TABLES:
        if model is not SafetyAlert:
            db.execute(delete(model).where(getattr(model, col) == u.id))
    db.execute(delete(SafetyContact).where(SafetyContact.user_id == u.id))
    audit(db, ctx.user, "person.delete", f"user:{u.id}", f"{u.username}; backup {Path(backup).name if backup else 'none'}")
    db.execute(AuditLog.__table__.update().where(AuditLog.actor_id == u.id).values(actor_id=None))
    db.delete(u)
    db.commit()
    return {"deleted": True, "backup": Path(backup).name if backup else None}


# ------------------------------------------------------------------------------------------------ classes
class ClassIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    subject: str = Field(default="", max_length=80)
    teacher_id: int
    term: str | None = Field(default=None, max_length=40)
    age_band: str = Field(default="13-15", pattern="^(under13|13-15|16plus)$")


def _class_json(db: Session, c: ClassRoom) -> dict:
    t = db.get(User, c.teacher_id)
    return {"id": c.id, "name": c.name, "subject": c.subject, "term": c.term, "age_band": (c.settings or {}).get("age_band", "13-15"),
            "teacher": {"id": t.id, "name": t.display_name} if t else None,
            "students": db.scalar(select(func.count()).select_from(ClassMember).where(ClassMember.class_id == c.id)) or 0}


def _teacher_ok(db: Session, ctx: Ctx, tid: int) -> User:
    t = db.get(User, tid)
    if not t or t.school_id != ctx.user.school_id or t.role != "teacher" or t.status != "active":
        raise err(400, "invalid", "Choose an active teacher for the class.")
    return t


@router.get("/classes")
def classes(ctx: Ctx = Depends(require_perm("admin.access")), db: Session = Depends(get_db)):
    if not (has(ctx.user, "classes.manage") or has(ctx.user, "directory.view")):
        raise err(403, "policy_denied", "That area is not available to your account.")
    return {"classes": [_class_json(db, c) for c in db.scalars(select(ClassRoom).where(ClassRoom.school_id == ctx.user.school_id).order_by(ClassRoom.name))],
            "teachers": [{"id": t.id, "name": t.display_name} for t in db.scalars(select(User).where(User.school_id == ctx.user.school_id, User.role == "teacher", User.status == "active").order_by(User.display_name))]}


@router.post("/classes", status_code=201)
def add_class(body: ClassIn, ctx: Ctx = Depends(require_perm("admin.access", "classes.manage")), db: Session = Depends(get_db)):
    _teacher_ok(db, ctx, body.teacher_id)
    c = ClassRoom(school_id=ctx.user.school_id, teacher_id=body.teacher_id, name=body.name, subject=body.subject, term=body.term, settings={"age_band": body.age_band, "language": "en"})
    db.add(c)
    db.flush()
    audit(db, ctx.user, "class.create", f"class:{c.id}", c.name)
    db.commit()
    return _class_json(db, c)


@router.patch("/classes/{cid}")
def edit_class(cid: int, body: ClassIn, ctx: Ctx = Depends(require_perm("admin.access", "classes.manage")), db: Session = Depends(get_db)):
    c = db.get(ClassRoom, cid)
    if not c or c.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That class doesn't exist.")
    _teacher_ok(db, ctx, body.teacher_id)
    c.name, c.subject, c.term, c.teacher_id = body.name, body.subject, body.term, body.teacher_id
    c.settings = {**(c.settings or {}), "age_band": body.age_band}
    audit(db, ctx.user, "class.edit", f"class:{c.id}", c.name)
    db.commit()
    return _class_json(db, c)


@router.get("/classes/{cid}")
def class_roster(cid: int, ctx: Ctx = Depends(require_perm("admin.access")), db: Session = Depends(get_db)):
    if not (has(ctx.user, "classes.manage") or has(ctx.user, "directory.view")):
        raise err(403, "policy_denied", "That area is not available to your account.")
    c = db.get(ClassRoom, cid)
    if not c or c.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That class doesn't exist.")
    ids = db.scalars(select(ClassMember.user_id).where(ClassMember.class_id == cid)).all()
    return {**_class_json(db, c), "roster": [{"id": u.id, "name": u.display_name, "username": u.username, "status": u.status} for u in db.scalars(select(User).where(User.id.in_(ids)).order_by(User.display_name))]}


class MemberIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: int


@router.post("/classes/{cid}/members", status_code=201)
def add_member(cid: int, body: MemberIn, ctx: Ctx = Depends(require_perm("admin.access", "classes.manage")), db: Session = Depends(get_db)):
    c = db.get(ClassRoom, cid)
    u = _target(db, ctx, body.user_id)
    if not c or c.school_id != ctx.user.school_id or u.role != "student":
        raise err(400, "invalid", "Choose a class and a student.")
    if not db.get(ClassMember, (cid, u.id)):
        db.add(ClassMember(class_id=cid, user_id=u.id))
        audit(db, ctx.user, "class.add_student", f"class:{cid}", f"user:{u.id}")
        db.commit()
    return {"ok": True}


@router.delete("/classes/{cid}/members/{uid}", status_code=204)
def remove_member(cid: int, uid: int, ctx: Ctx = Depends(require_perm("admin.access", "classes.manage")), db: Session = Depends(get_db)):
    c = db.get(ClassRoom, cid)
    if not c or c.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That class doesn't exist.")
    m = db.get(ClassMember, (cid, uid))
    if m:
        db.delete(m)
        audit(db, ctx.user, "class.remove_student", f"class:{cid}", f"user:{uid}")
        db.commit()


# ------------------------------------------------------------------------------------------------ safety contacts
@router.get("/safety-contacts")
def safety_contacts(ctx: Ctx = Depends(require_perm("admin.access")), db: Session = Depends(get_db)):
    if not (has(ctx.user, "safety.contacts") or has(ctx.user, "directory.view")):
        raise err(403, "policy_denied", "That area is not available to your account.")
    sid = ctx.user.school_id
    rows = db.scalars(select(SafetyContact).where(SafetyContact.school_id == sid)).all()
    return {"contacts": [{"user_id": r.user_id, "name": db.get(User, r.user_id).display_name, "role_label": ROLE_LABEL.get(db.get(User, r.user_id).role), "is_primary": r.is_primary, "location": r.location} for r in rows],
            "candidates": [{"id": u.id, "name": u.display_name, "role_label": ROLE_LABEL.get(u.role)} for u in db.scalars(
                select(User).where(User.school_id == sid, User.status == "active", User.role.in_(["teacher", "counselor", "school_admin", "owner"]), User.id.not_in([r.user_id for r in rows] or [0])).order_by(User.display_name))]}


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: int
    is_primary: bool = False
    location: str | None = Field(default=None, max_length=80)


@router.put("/safety-contacts")
def set_contact(body: ContactIn, ctx: Ctx = Depends(require_perm("admin.access", "safety.contacts")), db: Session = Depends(get_db)):
    u = _target(db, ctx, body.user_id) if body.user_id != ctx.user.id else ctx.user
    if u.role not in ("teacher", "counselor", "school_admin", "owner") or u.status != "active":
        raise err(400, "invalid", "A safety contact must be an active teacher, counselor or admin.")
    row = db.get(SafetyContact, u.id) or SafetyContact(user_id=u.id, school_id=u.school_id)
    row.is_primary, row.location = body.is_primary, body.location
    db.add(row)
    if body.is_primary:
        for other in db.scalars(select(SafetyContact).where(SafetyContact.school_id == u.school_id, SafetyContact.user_id != u.id)):
            other.is_primary = False
    audit(db, ctx.user, "safety_contact.set", f"user:{u.id}", "primary" if body.is_primary else "contact")
    db.commit()
    return {"ok": True}


@router.delete("/safety-contacts/{uid}", status_code=204)
def remove_contact(uid: int, ctx: Ctx = Depends(require_perm("admin.access", "safety.contacts")), db: Session = Depends(get_db)):
    row = db.get(SafetyContact, uid)
    if not row or row.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That person isn't a safety contact.")
    others = db.scalars(select(SafetyContact).where(SafetyContact.school_id == row.school_id, SafetyContact.user_id != uid)).all()
    if not others:
        raise err(409, "policy_denied", "A school needs at least one safety contact. Add another before removing this one.")
    was_primary = row.is_primary
    db.delete(row)
    if was_primary:
        others[0].is_primary = True
    audit(db, ctx.user, "safety_contact.remove", f"user:{uid}")
    db.commit()


# ------------------------------------------------------------------------------------------------ school settings
class SettingsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    school_name: str = Field(min_length=1, max_length=120)
    tutor_emoji: bool = False
    chat_retention_days: int = Field(default=90, ge=7, le=365)


@router.get("/settings")
def get_school_settings(ctx: Ctx = Depends(require_perm("admin.access", "school.settings")), db: Session = Depends(get_db)):
    sc = db.get(School, ctx.user.school_id)
    st = sc.settings or {}
    return {"school_name": sc.name, "tutor_emoji": bool(st.get("tutor_emoji", False)), "chat_retention_days": int(st.get("chat_retention_days", get_settings().chat_retention_days)),
            "notes": {"tutor_emoji": "Emoji are never used in homework or assessments, whatever this says."}}


@router.put("/settings")
def put_school_settings(body: SettingsIn, ctx: Ctx = Depends(require_perm("admin.access", "school.settings")), db: Session = Depends(get_db)):
    sc = db.get(School, ctx.user.school_id)
    sc.name = body.school_name
    sc.settings = {**(sc.settings or {}), "tutor_emoji": body.tutor_emoji, "chat_retention_days": body.chat_retention_days}
    audit(db, ctx.user, "settings.update", f"school:{sc.id}", f"emoji={body.tutor_emoji} retention={body.chat_retention_days}")
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------------------------------------ optional services (engines)
PROFILES = [
    {"id": "content", "label": "Content library", "text": "Offline books and videos (Kolibri, encyclopedia)." if branding.brand()["id"] == "umanah" else "Offline books, videos and the encyclopedia.", "ram_gb": 0.5, "engine_keys": ["kolibri", "kiwix"]},
    {"id": "lms", "label": "Course engine", "text": "Courses and gradebook.", "ram_gb": 1.3, "engine_keys": ["moodle"]},
    {"id": "code", "label": "Notebooks", "text": "Shared notebooks for advanced coding.", "ram_gb": 0.5, "engine_keys": ["jupyterhub"]},
    {"id": "admin", "label": "Admin console", "text": "Advanced model and prompt tools for IT staff.", "ram_gb": 0.7, "engine_keys": ["openwebui"]},
]
if branding.brand()["id"] != "umanah":        # EDU54 ships no course engine (dropped) and no admin console (license): docs/edu54/CLAUDE.md §3
    PROFILES = [p for p in PROFILES if p["id"] in ("content", "code")]


def free_ram_gb() -> float | None:
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            if line.startswith("MemAvailable:"):
                return round(int(line.split()[1]) / 1048576, 1)
    except OSError:
        return None
    return None


def control_dir() -> Path:
    d = get_settings().control_path
    (d / "requests").mkdir(parents=True, exist_ok=True)
    (d / "results").mkdir(parents=True, exist_ok=True)
    return d


@router.get("/engines")
async def engines_state(ctx: Ctx = Depends(require_perm("admin.access", "engines.manage")), db: Session = Depends(get_db)):
    health = {i["id"]: i for i in await engines_mod.check_all(get_settings().engines)}
    ram = free_ram_gb()
    out = []
    for p in PROFILES:
        states = [health[k]["state"] for k in p["engine_keys"] if k in health]
        state = "running" if states and all(s == "ready" for s in states) else "stopped" if states and all(s == "off" for s in states) else "partly" if states else "unknown"
        out.append({**{k: v for k, v in p.items() if k != "engine_keys"}, "state": state, "can_start": ram is None or ram - p["ram_gb"] >= 2.0})
    recent = []
    for f in sorted((control_dir() / "results").glob("*.json"), reverse=True)[:6]:
        try:
            recent.append(json.loads(f.read_text()))
        except (OSError, ValueError):
            pass
    return {"profiles": out, "free_ram_gb": ram, "keep_free_gb": 2.0, "recent": recent, "control_available": (control_dir() / ".agent-alive").exists()}


class EngineAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str = Field(pattern="^(start|stop)$")


@router.post("/engines/{profile}", status_code=202)
def engine_action(profile: str, body: EngineAction, ctx: Ctx = Depends(require_perm("admin.access", "engines.manage")), db: Session = Depends(get_db)):
    """Asks the appliance to start or stop an optional service. The request is a file the host-side helper picks up: this API never holds the container socket."""
    p = next((x for x in PROFILES if x["id"] == profile), None)
    if not p:
        raise err(404, "not_found", "That service doesn't exist.")
    ram = free_ram_gb()
    if body.action == "start" and ram is not None and ram - p["ram_gb"] < 2.0:
        raise err(409, "busy", f"Not enough free memory to start {p['label']} safely ({ram} GB free, about {p['ram_gb']} GB needed, and 2 GB is kept free). Stop something else first.")
    rid = f"{int(now().timestamp())}-{profile}-{body.action}"
    (control_dir() / "requests" / f"{rid}.json").write_text(json.dumps({"id": rid, "profile": profile, "action": body.action, "by": ctx.user.username, "at": now().isoformat()}))
    audit(db, ctx.user, f"engine.{body.action}", f"profile:{profile}", f"free RAM {ram} GB")
    db.commit()
    return {"queued": rid}


# ------------------------------------------------------------------------------------------------ backups and export
def backups_dir() -> Path:
    d = get_settings().data_dir / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.get("/backups")
def list_backups(ctx: Ctx = Depends(require_perm("admin.access", "backups.manage")), db: Session = Depends(get_db)):
    files = sorted(backups_dir().glob("*.sqlite3"), key=lambda p: p.stat().st_mtime, reverse=True)
    return {"backups": [{"name": f.name, "size_mb": round(f.stat().st_size / 1e6, 2), "at": datetime.fromtimestamp(f.stat().st_mtime, UTC).isoformat()} for f in files[:20]],
            "note": "A backup is one file holding all people, work and chats. Keep copies off the device."}


@router.post("/backups", status_code=201)
def make_backup(ctx: Ctx = Depends(require_perm("admin.access", "backups.manage")), db: Session = Depends(get_db)):
    import sqlite3
    dest = backups_dir() / f"umanah-{datetime.now(UTC):%Y%m%d-%H%M%S}.sqlite3"
    src, dst = sqlite3.connect(str(get_settings().db_path), timeout=30), sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close(); dst.close()
    # prove it: the backup must open and hold the same number of people
    chk = sqlite3.connect(dest)
    n_backup = chk.execute("select count(*) from users").fetchone()[0]
    chk.close()
    n_live = db.scalar(select(func.count()).select_from(User)) or 0
    ok = n_backup == n_live
    audit(db, ctx.user, "backup.create", dest.name, f"people {n_backup}/{n_live}")
    db.commit()
    if not ok:
        raise err(500, "unavailable", "The backup was written but did not match the live data. Try again.")
    return {"name": dest.name, "size_mb": round(dest.stat().st_size / 1e6, 2), "verified": True, "people": n_backup}


@router.get("/backups/{name}")
def download_backup(name: str, ctx: Ctx = Depends(require_perm("admin.access", "backups.manage")), db: Session = Depends(get_db)):
    f = (backups_dir() / name).resolve()
    if f.parent != backups_dir().resolve() or not f.is_file():
        raise err(404, "not_found", "That backup doesn't exist.")
    audit(db, ctx.user, "backup.download", name)
    db.commit()
    return FileResponse(f, filename=name, media_type="application/octet-stream")


@router.get("/export/people.csv")
def export_people(ctx: Ctx = Depends(require_perm("admin.access", "backups.manage")), db: Session = Depends(get_db)):
    from fastapi.responses import Response
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "username", "role", "status", "classes"])
    classes: dict[int, list[str]] = {}
    for uid, cname in db.execute(select(ClassMember.user_id, ClassRoom.name).join(ClassRoom, ClassRoom.id == ClassMember.class_id)):
        classes.setdefault(uid, []).append(cname)
    for u in db.scalars(select(User).where(User.school_id == ctx.user.school_id).order_by(User.display_name)):
        w.writerow([u.display_name, u.username, ROLE_LABEL.get(u.role, u.role), u.status, "; ".join(classes.get(u.id, []))])
    audit(db, ctx.user, "export.people_csv")
    db.commit()
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="people.csv"'})


# ------------------------------------------------------------------------------------------------ audit log
@router.get("/audit")
def audit_log(q: str | None = None, limit: int = Query(default=100, le=500), ctx: Ctx = Depends(require_perm("admin.access", "audit.view")), db: Session = Depends(get_db)):
    query = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.where(or_(func.lower(AuditLog.action).like(like), func.lower(func.coalesce(AuditLog.target, "")).like(like), func.lower(func.coalesce(AuditLog.reason, "")).like(like)))
    out = []
    for a in db.scalars(query):
        actor = db.get(User, a.actor_id) if a.actor_id else None
        out.append({"id": a.id, "at": a.created_at.isoformat(), "actor": actor.display_name if actor else "System", "action": a.action, "target": a.target, "reason": a.reason})
    return {"entries": out}
