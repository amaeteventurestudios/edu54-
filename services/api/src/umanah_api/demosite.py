"""Public try-it demo (docs/46): no sign-up, one private copy of the fictional school per visitor.

  - `template.sqlite3` is the seeded fictional school (28 students, Ms. Williams, Jordan Smith, sample chats). It is rebuilt when the seed changes.
  - Each visitor gets a copy the moment they press "Try as a student" or "Try as a teacher". A signed cookie points their requests at their own file,
    so nothing one visitor does (chats, submissions, projects) is seen by another, and none of it touches the real database.
  - Visitor copies live 24 hours and are purged nightly. The real users (admin, safety contacts) are not in the template's sign-in path: the demo
    signs visitors in as the demo student, teacher or safety contact of their own copy only (so a visitor sees only the alerts their own messages raised), the admin area is closed to demo sessions, and password sign-in is off for them.
  - Rate limits: tutor messages per visitor and per address per hour, and new visitor copies per address per hour.
"""
from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
import hmac
import logging
import secrets
import shutil
import sqlite3
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from starlette.types import ASGIApp, Receive, Scope, Send

from . import __version__, db as dbm
from .config import get_settings

COOKIE = "umanah_demo"
log = logging.getLogger("uvicorn.error")
_lock = threading.Lock()
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


# ------------------------------------------------------------------------------------------------ cookie
def _secret() -> bytes:
    d = get_settings().demo_dir
    d.mkdir(parents=True, exist_ok=True)
    f = d / ".secret"
    if not f.exists():
        f.write_text(secrets.token_hex(32))
        f.chmod(0o600)
    return f.read_text().strip().encode()


def sign(vid: str) -> str:
    return f"{vid}.{hmac.new(_secret(), vid.encode(), hashlib.sha256).hexdigest()[:24]}"


def verify(cookie: str | None) -> str | None:
    if not cookie or "." not in cookie:
        return None
    vid, sig = cookie.split(".", 1)
    if len(vid) != 32 or not all(c in "0123456789abcdef" for c in vid):
        return None
    good = hmac.new(_secret(), vid.encode(), hashlib.sha256).hexdigest()[:24]
    return vid if hmac.compare_digest(sig, good) else None


def visitor_path(vid: str) -> Path:
    return get_settings().demo_dir / "visitors" / f"{vid}.sqlite3"


# ------------------------------------------------------------------------------------------------ template and visitors
def _template_stamp() -> str:
    h = hashlib.sha256(__version__.encode())
    here = Path(__file__).parent
    for name in ("seed.py", "demo_chats.py", "models.py"):
        h.update((here / name).read_bytes())
    for f in sorted(get_settings().content_dir.rglob("*.json")):
        h.update(f.read_bytes())
    return h.hexdigest()[:16]


def template_path() -> Path:
    return get_settings().demo_dir / "template.sqlite3"


def ensure_template() -> Path:
    """Build the fictional school once (and again whenever the seed, models or content change)."""
    from . import migrate
    from .seed import seed
    d = get_settings().demo_dir
    (d / "visitors").mkdir(parents=True, exist_ok=True)
    t, stamp_file = template_path(), d / "template.stamp"
    stamp = _template_stamp()
    if t.exists() and stamp_file.exists() and stamp_file.read_text() == stamp:
        return t
    tmp = d / "template.building.sqlite3"
    for x in (tmp, Path(f"{tmp}-wal"), Path(f"{tmp}-shm")):
        x.unlink(missing_ok=True)
    eng, sm = dbm._make(f"sqlite:///{tmp}")
    migrate.prepare(eng)
    with sm() as s:
        seed(s, write_credentials=False)
    with eng.connect() as c:
        c.exec_driver_sql("PRAGMA wal_checkpoint(TRUNCATE)")
    eng.dispose()
    tmp.replace(t)
    for ext in ("-wal", "-shm"):
        Path(f"{tmp}{ext}").unlink(missing_ok=True)
    stamp_file.write_text(stamp)
    gone = purge(everything=True)    # visitor copies made from the old template may lack new columns: start everyone fresh
    log.info("demo template built (%s); %d old visitor copies removed", stamp, gone)
    return t


def new_visitor() -> str:
    ensure_template()
    vid = secrets.token_hex(16)
    dest = visitor_path(vid)
    src, dst = sqlite3.connect(template_path()), sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close(); dst.close()
    return vid


def reset_visitor(vid: str) -> None:
    p = visitor_path(vid)
    dbm.forget_database(p)
    for ext in ("", "-wal", "-shm"):
        Path(f"{p}{ext}").unlink(missing_ok=True)
    ensure_template()
    src, dst = sqlite3.connect(template_path()), sqlite3.connect(p)
    with dst:
        src.backup(dst)
    src.close(); dst.close()


def purge(now: float | None = None, everything: bool = False) -> int:
    """Delete visitor copies older than the limit, and the oldest ones beyond the cap (all of them when `everything`).
    Only files under demo/visitors are touched: the real database, its users and the admin login are never involved."""
    s = get_settings()
    vdir = s.demo_dir / "visitors"
    if not vdir.exists():
        return 0
    now = now or time.time()
    files = sorted(vdir.glob("*.sqlite3"), key=lambda p: p.stat().st_mtime)
    doomed = list(files) if everything else [f for f in files if now - f.stat().st_mtime > s.demo_visitor_hours * 3600]
    keep = [f for f in files if f not in doomed]
    doomed += keep[: max(0, len(keep) - s.demo_max_visitors)]
    for f in doomed:
        dbm.forget_database(f)
        for ext in ("", "-wal", "-shm"):
            Path(f"{f}{ext}").unlink(missing_ok=True)
    return len(doomed)


def nightly_reset_due(now: datetime, last_reset: date | None) -> bool:
    """True once per UTC day, from the reset hour on."""
    return now.hour >= get_settings().demo_reset_hour_utc and last_reset != now.date()


def nightly_reset() -> int:
    """The daily reset: every visitor copy is deleted and the sample school is rebuilt from the seed."""
    n = purge(everything=True)
    ensure_template()
    log.info("demo nightly reset: %d visitor copies removed", n)
    return n


def visitor_count() -> int:
    d = get_settings().demo_dir / "visitors"
    return len(list(d.glob("*.sqlite3"))) if d.exists() else 0


# ------------------------------------------------------------------------------------------------ limits
def hit(kind: str, who: str, limit: int, window_s: int = 3600) -> bool:
    """Count one event; False when `who` is over `limit` events in the last `window_s` seconds."""
    now = time.monotonic()
    with _lock:
        q = _hits[(kind, who)]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


def client_ip(headers: dict[str, str], peer: str | None) -> str:
    xff = headers.get("x-forwarded-for", "")
    return (xff.split(",")[0].strip() if xff else "") or peer or "unknown"


# ------------------------------------------------------------------------------------------------ middleware
class DemoMiddleware:
    """Points a request at the visitor's own database when it carries a valid demo cookie. Pure ASGI, so the choice reaches every thread and stream."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not get_settings().demo_mode:
            return await self.app(scope, receive, send)
        cookies = {}
        for k, v in scope.get("headers", []):
            if k == b"cookie":
                for part in v.decode("latin-1").split(";"):
                    if "=" in part:
                        n, _, val = part.strip().partition("=")
                        cookies[n] = val
        vid = verify(cookies.get(COOKIE))
        if vid and visitor_path(vid).exists():
            path = scope.get("path", "")
            if path == "/api/auth/login":
                # Password sign-in never uses the visitor's copy: it goes to the real database, and the login handler only lets the
                # admin account through while the demo is on (the owner's way in). Note that this request came from a demo browser.
                scope.setdefault("state", {})["demo_cookie"] = True
                return await self.app(scope, receive, send)
            if path.startswith("/api/admin"):                                    # a demo visitor never reaches the admin area
                body = b'{"error":{"code":"policy_denied","message":"Not available in the demo."}}'
                await send({"type": "http.response.start", "status": 403, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
                return await send({"type": "http.response.body", "body": body})
            scope.setdefault("state", {})["demo_visitor"] = vid
            token = dbm.use_database(visitor_path(vid))
            try:
                return await self.app(scope, receive, send)
            finally:
                dbm.reset_database(token)
        return await self.app(scope, receive, send)
