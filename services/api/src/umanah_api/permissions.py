"""Who may do what (docs/19). Roles have a rank; permissions are strings. Everything is decided on the server.

    owner         School Owner      everything, including other owners. At least one active owner must always exist.
    school_admin  Admin             everything except managing owners.
    sub_admin     Sub-admin         only the permissions an owner or admin chose for them.
    teacher       Teacher           their own classes and the students in them.
    counselor     Counselor         safety alerts (when a designated safety contact) and the student directory, no grading.
    student       Student           their own learning.

Rules the API enforces with `can_manage` / `can_assign`: nobody manages someone of equal or higher rank (owners may manage owners),
nobody grants a role or a permission they do not hold themselves, nobody changes their own role, the last owner is protected.
"""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import get_db
from .deps import Ctx, current, err
from .models import User

RANK = {"owner": 5, "school_admin": 4, "sub_admin": 3, "teacher": 2, "counselor": 2, "student": 1}
ROLE_LABEL = {"owner": "School Owner", "school_admin": "Admin", "sub_admin": "Sub-admin", "teacher": "Teacher", "counselor": "Counselor", "student": "Student"}

# permissions an owner or admin can hand to a sub-admin (label is what the admin sees)
ASSIGNABLE = {
    "people.manage": "Add, edit, deactivate people and reset passwords",
    "classes.manage": "Create and edit classes and rosters",
    "safety.contacts": "Choose the school's safety contacts",
    "school.settings": "Change school settings",
    "engines.manage": "Start and stop optional services",
    "backups.manage": "Create backups and exports",
    "audit.view": "Read the audit log",
}
ADMIN_ALL = {"admin.access", "people.manage", "roles.manage", "classes.manage", "safety.contacts", "school.settings", "engines.manage", "backups.manage", "audit.view", "data.delete", "teaching"}
BASE = {
    "owner": ADMIN_ALL,
    "school_admin": ADMIN_ALL,
    "teacher": {"teaching", "students.manage_own"},
    "counselor": {"directory.view"},
    "student": set(),
}


def perms_for(u: User) -> set[str]:
    if u.role == "sub_admin":
        return {"admin.access", "directory.view"} | (set(u.permissions or []) & set(ASSIGNABLE))
    return set(BASE.get(u.role, set()))


def has(u: User, perm: str) -> bool:
    return perm in perms_for(u)


def can_assign(actor: User, role: str) -> bool:
    """May `actor` create someone with `role`, or move someone to it?"""
    if role not in RANK:
        return False
    if actor.role == "owner":
        return True
    return RANK[role] < RANK.get(actor.role, 0) and has(actor, "people.manage")


def can_manage(actor: User, target: User) -> bool:
    if actor.id == target.id:
        return False
    if actor.school_id != target.school_id:
        return False
    if actor.role == "owner":
        return True
    return RANK[target.role] < RANK[actor.role] and has(actor, "people.manage")


def may_grant(actor: User, perms: list[str]) -> bool:
    """A sub-admin's permissions must be a subset of what the actor holds."""
    return set(perms) <= set(ASSIGNABLE) and set(perms) <= perms_for(actor)


def active_owner_count(db: Session, school_id: int, excluding: int | None = None) -> int:
    q = select(func.count()).select_from(User).where(User.school_id == school_id, User.role == "owner", User.status == "active")
    if excluding:
        q = q.where(User.id != excluding)
    return int(db.scalar(q) or 0)


def require_perm(*perms: str):
    """Dependency: the signed-in person must hold every listed permission."""
    def dep(ctx: Ctx = Depends(current)) -> Ctx:
        held = perms_for(ctx.user)
        if not all(p in held for p in perms):
            raise err(403, "policy_denied", "That area is not available to your account.")
        return ctx
    return dep


def role_json(u: User) -> dict:
    return {"role": u.role, "role_label": ROLE_LABEL.get(u.role, u.role), "permissions": sorted(perms_for(u))}
