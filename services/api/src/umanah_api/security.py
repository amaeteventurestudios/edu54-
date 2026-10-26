"""Password hashing, sessions, CSRF and login throttling (docs/19)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AuthSession, LoginAttempt, User, now

_ph = PasswordHasher()
SESSION_COOKIE = "umanah_session"
CSRF_COOKIE = "umanah_csrf"


def hash_password(pw: str) -> str:
    return _ph.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, pw)
    except (VerifyMismatchError, InvalidHashError):
        return False


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> tuple[str, str]:
    """Returns (session token, csrf token). Only a hash of the session token is stored."""
    s = get_settings()
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
    db.add(AuthSession(token_hash=_digest(token), user_id=user.id, csrf=csrf,
                       expires_at=now() + timedelta(hours=s.session_hours)))
    db.commit()
    return token, csrf


def lookup_session(db: Session, token: str | None) -> tuple[User, AuthSession] | None:
    if not token:
        return None
    sess = db.get(AuthSession, _digest(token))
    if sess is None:
        return None
    exp = sess.expires_at if sess.expires_at.tzinfo else sess.expires_at.replace(tzinfo=now().tzinfo)
    if exp < now():
        db.delete(sess)
        db.commit()
        return None
    user = db.get(User, sess.user_id)
    if user is None or user.status != "active":
        return None
    return user, sess


def destroy_session(db: Session, token: str | None) -> None:
    if token and (sess := db.get(AuthSession, _digest(token))):
        db.delete(sess)
        db.commit()


def too_many_failures(db: Session, username: str, ip: str) -> bool:
    s = get_settings()
    since = now() - timedelta(minutes=s.login_window_minutes)
    rows = db.scalars(select(LoginAttempt).where(
        LoginAttempt.username == username, LoginAttempt.ok.is_(False), LoginAttempt.created_at >= since)).all()
    return len(rows) >= s.login_max_failures


def record_attempt(db: Session, username: str, ip: str, ok: bool) -> None:
    db.add(LoginAttempt(username=username, ip=ip, ok=ok))
    db.commit()
