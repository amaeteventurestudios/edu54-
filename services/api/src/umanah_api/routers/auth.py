from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import demosite
from ..config import get_settings
from ..db import get_db
from ..grades import content_bands, grade_json
from ..deps import Ctx, current, err, is_safety_contact
from ..models import User, now
from ..people import audit
from ..permissions import perms_for, ROLE_LABEL
from ..security import (CSRF_COOKIE, SESSION_COOKIE, create_session, destroy_session, record_attempt, too_many_failures,
                        verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=1, max_length=200)


def user_json(db: Session, u: User) -> dict:
    return {"id": u.id, "name": u.display_name, "role": u.role, "username": u.username, "title": u.title,
            "initials": "".join(p[0] for p in u.display_name.replace(".", "").split()[:2]).upper(),
            "is_safety_contact": is_safety_contact(db, u), "role_label": ROLE_LABEL.get(u.role, u.role), "permissions": sorted(perms_for(u)),
            "must_change_password": u.must_change_password, "pin_login": u.pin_login, **({**grade_json(u.grade), "content_bands": content_bands(u.grade, u.extra_bands)} if u.role == "student" else {})}


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    ip = demosite.client_ip({k.lower(): v for k, v in request.headers.items()}, request.client.host if request.client else None)
    uname = body.username.strip().lower()
    user = db.scalar(select(User).where(User.username == uname))
    public_demo = s.demo_mode and not s.demo_all_logins
    if public_demo:
        # The public demo has no password sign-in for students and teachers (they use the two buttons). The owner (admin) account is the
        # owner's way in: it may sign in with its password, rate-limited per address, locked after repeated failures, and audited.
        if not user or user.role != "owner":
            raise err(403, "policy_denied", "Not available in the demo.")
        if not demosite.hit("admin-login", ip, s.admin_login_per_ip_hour):
            audit(db, None, "auth.admin_login.rate_limited", f"user:{user.id}", f"address {ip}"); db.commit()
            raise err(429, "busy", "Too many attempts from this address. Please wait a while and try again.")
    if too_many_failures(db, uname, ip):
        if public_demo:
            audit(db, None, "auth.admin_login.locked", f"user:{user.id}", f"address {ip}"); db.commit()
        raise err(429, "busy", "Too many attempts. Please wait a few minutes and try again.")
    ok = bool(user and user.status == "active" and verify_password(body.password, user.password_hash))
    record_attempt(db, uname, ip, ok)
    if public_demo:
        audit(db, user if ok else None, "auth.admin_login.ok" if ok else "auth.admin_login.failed", f"user:{user.id}", f"address {ip}"); db.commit()
    if not ok:
        raise err(401, "unauthorized", "That username or password isn't right.")
    user.last_login_at = now()
    token, csrf = create_session(db, user)
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", secure=s.secure_cookies, max_age=s.session_hours * 3600, path="/")
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, samesite="lax", secure=s.secure_cookies, max_age=s.session_hours * 3600, path="/")
    if getattr(request.state, "demo_cookie", False):
        response.delete_cookie(demosite.COOKIE, path="/")     # leave the demo copy behind: from here on this browser talks to the real school
    return {"user": user_json(db, user), "csrf": csrf}


@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db), ctx: Ctx = Depends(current),
           token: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    destroy_session(db, token)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return {"ok": True}


@router.get("/school")
def school(db: Session = Depends(get_db)):
    """The sign-in page's school entry: the school's name only (one school per box). No sign-in needed; nothing personal."""
    from ..models import School
    s = db.scalars(select(School).order_by(School.id)).first()
    return {"name": s.name if s else None}


@router.get("/me")
def me(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    from ..db import using_visitor_database
    return {"user": user_json(db, ctx.user), "csrf": ctx.csrf, "demo": using_visitor_database()}


class ChangePasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current: str = Field(min_length=1, max_length=200)
    new: str = Field(min_length=8, max_length=200)


@router.post("/change-password")
def change_password(body: ChangePasswordIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Everyone can change their own password. Accounts made with a temporary password must do this before anything else."""
    from ..security import hash_password
    if ctx.user.pin_login:
        raise err(403, "policy_denied", "Ask your teacher to change your PIN.")
    if not verify_password(body.current, ctx.user.password_hash):
        raise err(400, "invalid", "The current password isn't right.")
    if body.new == body.current:
        raise err(400, "invalid", "Choose a password you haven't used just now.")
    ctx.user.password_hash = hash_password(body.new)
    ctx.user.must_change_password, ctx.user.pin_login = False, False
    db.commit()
    return {"ok": True}
