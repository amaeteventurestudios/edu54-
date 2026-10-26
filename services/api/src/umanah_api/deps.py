"""Request dependencies: current user, roles, CSRF."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .db import get_db
from .models import SafetyContact, User
from .security import SESSION_COOKIE, lookup_session


class Ctx:
    def __init__(self, user: User, csrf: str):
        self.user, self.csrf = user, csrf


def err(status: int, code: str, message: str) -> HTTPException:
    """Predictable typed errors (docs/20): unavailable, busy, unauthorized, invalid, policy_denied, not_found, offline."""
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def current(request: Request, db: Session = Depends(get_db),
            token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
            x_csrf: str | None = Header(default=None, alias="X-CSRF-Token")) -> Ctx:
    found = lookup_session(db, token)
    if not found:
        raise err(401, "unauthorized", "Please sign in.")
    user, sess = found
    if user.must_change_password and request.url.path not in ("/api/auth/me", "/api/auth/change-password", "/api/auth/logout"):
        raise err(403, "password_change_required", "Please choose a new password first.")
    if request.method not in ("GET", "HEAD", "OPTIONS") and x_csrf != sess.csrf:
        raise err(403, "unauthorized", "Missing or invalid request token.")
    return Ctx(user, sess.csrf)


def require_role(*roles: str) -> Callable[[Ctx], Ctx]:
    def dep(ctx: Ctx = Depends(current)) -> Ctx:
        if ctx.user.role not in roles:
            raise err(403, "policy_denied", "That area is not available to your account.")
        return ctx
    return dep


def is_safety_contact(db: Session, user: User) -> bool:
    return db.get(SafetyContact, user.id) is not None


def require_safety_contact(ctx: Ctx = Depends(current), db: Session = Depends(get_db)) -> Ctx:
    if not is_safety_contact(db, ctx.user):
        raise err(403, "policy_denied", "Safety alerts are only visible to designated safety contacts.")
    return ctx
