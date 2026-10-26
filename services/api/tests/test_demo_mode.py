"""Public try-it demo (docs/46): isolation, no password, no admin, limits, purge."""
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from umanah_api import db as dbm, demosite
from umanah_api.config import get_settings
from umanah_api.models import Conversation, User


@pytest.fixture()
def demo(monkeypatch):
    d = Path(tempfile.mkdtemp(prefix="umanah-demo-test-"))
    monkeypatch.setenv("UMANAH_DATA_DIR", str(d))
    monkeypatch.setenv("UMANAH_DEMO_MODE", "1")
    monkeypatch.setenv("UMANAH_DEMO_SEED", "0")
    get_settings.cache_clear()
    demosite._hits.clear()
    from umanah_api.main import create_app
    from umanah_api.tutor import adapters, service
    app = create_app()
    with TestClient(app):
        adapters.set_adapter(adapters.StubInferenceAdapter())
        service.reset_slots()
        yield app
    adapters.set_adapter(None)
    get_settings.cache_clear()
    shutil.rmtree(d, ignore_errors=True)


def visitor(app, role="student") -> TestClient:
    c = TestClient(app)
    r = c.post("/api/demo/start", json={"role": role})
    assert r.status_code == 200, r.text
    c.headers["X-CSRF-Token"] = r.json()["csrf"]
    return c


def test_config_and_two_buttons_without_a_password(demo):
    c = TestClient(demo)
    assert c.get("/api/demo/config").json()["enabled"] is True
    s = visitor(demo, "student")
    me = s.get("/api/auth/me").json()
    assert me["user"]["username"] == "jordan" and me["demo"] is True
    t = visitor(demo, "teacher")
    assert t.get("/api/auth/me").json()["user"]["username"] == "mswilliams"
    assert t.get("/api/teacher/overview").json()["students"] == 28


def test_counselor_view_shows_only_this_visitors_own_alert(demo):
    s = visitor(demo, "student")
    s.post("/api/ai/chat", json={"message": "how can I hurt someone at school and not get caught", "context": {}})
    r = s.post("/api/demo/start", json={"role": "counselor"})                 # same copy: the visitor switches to the safety contact
    assert r.status_code == 200 and r.json()["user"]["is_safety_contact"] is True
    s.headers["X-CSRF-Token"] = r.json()["csrf"]
    alerts = s.get("/api/safety/alerts").json()["alerts"]
    assert [a["category"] for a in alerts] == ["violence_threat"]
    other = visitor(demo, "counselor")                                         # another visitor's copy has none of it
    assert other.get("/api/safety/alerts").json()["alerts"] == []


def test_each_visitor_has_a_private_copy_of_the_school(demo):
    a, b = visitor(demo), visitor(demo)
    before = len(b.get("/api/ai/conversations").json()["conversations"])
    a.post("/api/ai/chat", json={"message": "What is a variable?", "context": {}})
    assert len(a.get("/api/ai/conversations").json()["conversations"]) == before + 1
    assert len(b.get("/api/ai/conversations").json()["conversations"]) == before        # b never sees a's chat
    assert demosite.visitor_count() == 2
    # ...and the real database is untouched
    with dbm.session_scope() as db:
        assert db.scalar(select(Conversation.id)) is None


def test_a_returning_visitor_keeps_their_copy_and_can_switch_role(demo):
    a = visitor(demo, "student")
    a.post("/api/ai/chat", json={"message": "What is a variable?", "context": {}})
    n = len(a.get("/api/ai/conversations").json()["conversations"])
    r = a.post("/api/demo/start", json={"role": "teacher"})
    assert r.status_code == 200 and demosite.visitor_count() == 1
    a.headers["X-CSRF-Token"] = r.json()["csrf"]
    assert a.get("/api/teacher/overview").status_code == 200
    r = a.post("/api/demo/start", json={"role": "student"})
    a.headers["X-CSRF-Token"] = r.json()["csrf"]
    assert len(a.get("/api/ai/conversations").json()["conversations"]) == n


def test_restart_gives_a_fresh_copy(demo):
    a = visitor(demo)
    a.post("/api/ai/chat", json={"message": "What is a variable?", "context": {}})
    r = a.post("/api/demo/restart")
    a.headers["X-CSRF-Token"] = r.json()["csrf"]
    titles = [c["title"] for c in a.get("/api/ai/conversations").json()["conversations"]]
    assert "What is a variable" not in titles


def test_no_admin_area_no_password_sign_in_no_real_safety_alerts(demo):
    s = visitor(demo, "teacher")
    assert s.get("/api/admin/overview").status_code == 403
    assert s.post("/api/admin/people", json={"name": "x", "role": "student"}).status_code == 403
    assert s.post("/api/auth/login", json={"username": "jordan", "password": "anything"}).status_code == 403   # students and teachers use the buttons
    assert s.get("/api/safety/alerts").status_code == 403                    # Ms. Williams is not a designated contact


def test_demo_is_off_by_default(app):
    c = TestClient(app)
    assert c.get("/api/demo/config").json()["enabled"] is False
    assert c.post("/api/demo/start", json={"role": "student"}).status_code == 404


def test_tutor_messages_are_limited_per_visitor(demo, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_tutor_per_visitor_hour", 2)
    s = visitor(demo)
    for _ in range(2):
        assert s.post("/api/ai/chat", json={"message": "hi there", "context": {}}).status_code == 200
    r = s.post("/api/ai/chat", json={"message": "hi there", "context": {}})
    assert r.status_code == 429 and "an hour" in r.json()["error"]["message"]
    other = visitor(demo)
    assert other.post("/api/ai/chat", json={"message": "hi there", "context": {}}).status_code == 200      # someone else is unaffected


def test_new_visitor_copies_are_limited_per_address(demo, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_visitors_per_ip_hour", 2)
    for _ in range(2):
        assert TestClient(demo).post("/api/demo/start", json={"role": "student"}).status_code == 200
    assert TestClient(demo).post("/api/demo/start", json={"role": "student"}).status_code == 429
    c = TestClient(demo)
    assert c.post("/api/demo/start", json={"role": "student"}, headers={"X-Forwarded-For": "203.0.113.9"}).status_code == 200     # another address


def test_forged_or_unknown_cookies_are_ignored(demo):
    c = TestClient(demo)
    c.cookies.set("umanah_demo", "0" * 32 + ".deadbeef")
    assert c.get("/api/auth/me").status_code == 401                               # falls back to the real database, where nobody is signed in
    c.cookies.set("umanah_demo", "../../etc/passwd")
    assert c.get("/api/auth/me").status_code == 401


def test_purge_removes_old_copies_and_enforces_the_cap(demo, monkeypatch):
    for _ in range(3):
        visitor(demo)
    files = sorted((get_settings().demo_dir / "visitors").glob("*.sqlite3"))
    old = time.time() - 30 * 3600
    os.utime(files[0], (old, old))
    assert demosite.purge() == 1 and demosite.visitor_count() == 2
    monkeypatch.setattr(get_settings(), "demo_max_visitors", 1)
    assert demosite.purge() == 1 and demosite.visitor_count() == 1


def test_template_is_rebuilt_when_the_seed_changes(demo):
    t = demosite.template_path()
    stamp = (t.parent / "template.stamp").read_text()
    (t.parent / "template.stamp").write_text("old")
    demosite.ensure_template()
    assert (t.parent / "template.stamp").read_text() == stamp


def test_nightly_reset_removes_every_visitor_copy_and_only_those(demo):
    from datetime import date, datetime, timezone
    visitor(demo); visitor(demo)
    assert demosite.visitor_count() == 2
    real_db = get_settings().db_path
    before = real_db.stat().st_mtime if real_db.exists() else None
    assert demosite.nightly_reset() == 2 and demosite.visitor_count() == 0
    assert demosite.template_path().exists()                                  # the sample school is rebuilt, ready for the next visitor
    assert (real_db.stat().st_mtime if real_db.exists() else None) == before  # the real database (admin login) is never touched
    h = get_settings().demo_reset_hour_utc
    day = date(2026, 9, 26)
    assert demosite.nightly_reset_due(datetime(2026, 9, 26, h, 0, tzinfo=timezone.utc), None)
    assert not demosite.nightly_reset_due(datetime(2026, 9, 26, h - 1, 59, tzinfo=timezone.utc), None)
    assert not demosite.nightly_reset_due(datetime(2026, 9, 26, h + 3, 0, tzinfo=timezone.utc), day)   # once per day


def test_there_is_no_try_as_admin(demo):
    r = TestClient(demo).post("/api/demo/start", json={"role": "admin"})
    assert r.status_code == 422


def _real_admin() -> str:
    from umanah_api.models import School
    from umanah_api.people import create_user
    with dbm.session_scope() as db:
        school = School(name="Real School", local_slug="real")
        db.add(school); db.flush()
        u, pw = create_user(db, school_id=school.id, name="Owner", role="owner", username="admin")
        u.must_change_password = False
        return pw


def test_admin_can_sign_in_with_a_password_from_a_demo_browser_and_it_is_audited(demo):
    from umanah_api.models import AuditLog
    pw = _real_admin()
    c = visitor(demo)                                                        # this browser already holds a demo cookie
    assert c.post("/api/auth/login", json={"username": "mswilliams", "password": "x"}).status_code == 403
    r = c.post("/api/auth/login", json={"username": "admin", "password": pw})
    assert r.status_code == 200 and r.json()["user"]["role"] == "owner"
    assert "umanah_demo" not in c.cookies or not c.cookies.get("umanah_demo")   # the demo copy is left behind
    o = c.get("/api/admin/overview"); assert o.status_code == 200, o.text                   # and the admin area opens on the real school
    with dbm.session_scope() as db:
        assert {a.action for a in db.scalars(select(AuditLog))} >= {"auth.admin_login.ok"}


def test_admin_password_attempts_are_locked_after_five_failures_and_audited(demo):
    from umanah_api.models import AuditLog
    pw = _real_admin()
    c = TestClient(demo)
    codes = [c.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"}).status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]
    assert c.post("/api/auth/login", json={"username": "admin", "password": pw}).status_code == 429   # locked, even with the right one
    with dbm.session_scope() as db:
        assert {a.action for a in db.scalars(select(AuditLog))} >= {"auth.admin_login.failed", "auth.admin_login.locked"}


def test_admin_login_is_limited_per_address(demo, monkeypatch):
    monkeypatch.setenv("UMANAH_ADMIN_LOGIN_PER_IP_HOUR", "2"); get_settings.cache_clear()
    _real_admin()
    c = TestClient(demo)
    assert [c.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"}).status_code for _ in range(3)] == [401, 401, 429]
