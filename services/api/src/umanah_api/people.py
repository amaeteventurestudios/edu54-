"""Creating people and their first credentials (docs/19). Shared by the admin area and the teacher's class tools."""
from __future__ import annotations

import re
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AuditLog, User
from .security import hash_password

_WORDS = ["maple", "river", "cloud", "stone", "tiger", "lemon", "amber", "coral", "cedar", "panda", "robin", "sunny", "delta", "ember", "frost", "grape",
          "honey", "ivory", "jolly", "kiwi", "lotus", "mango", "nectar", "olive", "pearl", "quartz", "rocket", "sage", "tulip", "unity", "velvet", "willow"]


def temp_password() -> str:
    """Readable and typeable by a child: two words and two digits, for example 'maple-river-47' (about 30 bits, single use)."""
    return f"{secrets.choice(_WORDS)}-{secrets.choice(_WORDS)}-{secrets.randbelow(90) + 10}"


def temp_pin() -> str:
    return f"{secrets.randbelow(9000) + 1000}"


def slug_username(db: Session, name: str, taken: set[str] | None = None) -> str:
    """first.last in lower case ASCII, with a number added when it is taken."""
    base = re.sub(r"[^a-z0-9]+", ".", name.lower().encode("ascii", "ignore").decode()).strip(".") or "user"
    base = base[:40]
    name_, n = base, 1
    while db.scalar(select(User.id).where(User.username == name_)) or (taken and name_ in taken):
        n += 1
        name_ = f"{base}{n}"
    return name_


def audit(db: Session, actor: User | None, action: str, target: str | None = None, reason: str | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, action=action, target=target, reason=(reason or "")[:200] or None))


def create_user(db: Session, *, school_id: int, name: str, role: str, username: str | None = None, title: str | None = None,
                permissions: list[str] | None = None, kind: str = "password", taken: set[str] | None = None) -> tuple[User, str]:
    """Returns (user, the one-time credential). The credential is stored only as a hash."""
    cred = temp_pin() if kind == "pin" else temp_password()
    u = User(school_id=school_id, role=role, display_name=" ".join(name.split())[:80], title=title,
             username=username or slug_username(db, name, taken), password_hash=hash_password(cred), permissions=permissions or [],
             must_change_password=(kind != "pin"), pin_login=(kind == "pin"))
    db.add(u)
    db.flush()
    return u, cred


def reset_credential(db: Session, u: User, kind: str) -> str:
    cred = temp_pin() if kind == "pin" else temp_password()
    u.password_hash = hash_password(cred)
    u.pin_login = kind == "pin"
    u.must_change_password = kind != "pin"
    return cred
