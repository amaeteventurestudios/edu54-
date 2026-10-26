"""POST /api/demo/start: the two buttons on the sign-in page (docs/46). Only exists when UMANAH_DEMO_MODE is on."""
from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from .. import db as dbm
from .. import demosite
from ..config import get_settings
from ..deps import err
from ..models import SafetyContact, User
from ..security import CSRF_COOKIE, SESSION_COOKIE, create_session
from .auth import user_json

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/config")
def config():
    s = get_settings()
    from ..branding import edition
    return {"enabled": s.demo_mode, "banner": f"Demo with sample data. Real deployments run on-site at the {edition()['terms'].get('institution', 'school')}.",
            "limits": {"tutor_messages_per_hour": s.demo_tutor_per_visitor_hour}}


class StartIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(pattern="^(student|teacher|counselor)$")


def _enter(response: Response, vid: str, role: str) -> dict:
    """Sign the visitor in as the demo student, teacher or safety contact inside their own copy, without a password."""
    s = get_settings()
    tok = dbm.use_database(demosite.visitor_path(vid))
    try:
        with dbm.session_scope() as db:
            # the demo's lead student and teacher: the AI Lab's Jordan and Ms. Williams, or the first of each in another brand's seed
            if role == "counselor":
                # the school's safety contact, so a visitor can see the alert their own test message raised (only in their own copy)
                user = db.get(User, db.scalar(select(SafetyContact.user_id).order_by(SafetyContact.is_primary.desc(), SafetyContact.user_id)))
            else:
                user = db.scalar(select(User).where(User.username == ("jordan" if role == "student" else "mswilliams"))) or \
                    db.scalar(select(User).where(User.role == role).order_by(User.id))
            token, csrf = create_session(db, user)
            body = {"user": user_json(db, user), "csrf": csrf, "demo": True}
    finally:
        dbm.reset_database(tok)
    age = s.session_hours * 3600
    response.set_cookie(demosite.COOKIE, demosite.sign(vid), httponly=True, samesite="lax", secure=s.secure_cookies, max_age=s.demo_visitor_hours * 3600, path="/")
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", secure=s.secure_cookies, max_age=age, path="/")
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, samesite="lax", secure=s.secure_cookies, max_age=age, path="/")
    return body


@router.post("/start")
def start(body: StartIn, request: Request, response: Response, umanah_demo: str | None = Cookie(default=None)):
    s = get_settings()
    if not s.demo_mode:
        raise err(404, "not_found", "Not found.")
    ip = demosite.client_ip({k.lower(): v for k, v in request.headers.items()}, request.client.host if request.client else None)
    vid = demosite.verify(umanah_demo)
    if vid and not demosite.visitor_path(vid).exists():
        vid = None
    if vid is None:                                        # a returning visitor keeps their copy; only a new copy counts against the limit
        if not demosite.hit("visitors", ip, s.demo_visitors_per_ip_hour):
            raise err(429, "busy", "That's a lot of demo sessions from one place. Please try again in a little while.")
        demosite.purge()
        vid = demosite.new_visitor()
    return _enter(response, vid, body.role)


@router.post("/restart")
def restart(response: Response, umanah_demo: str | None = Cookie(default=None)):
    """Start over with a fresh copy of the sample school (keeps the visitor on the same role they were on)."""
    vid = demosite.verify(umanah_demo)
    if not get_settings().demo_mode or not vid:
        raise err(404, "not_found", "Not found.")
    demosite.reset_visitor(vid)
    return _enter(response, vid, "student")
