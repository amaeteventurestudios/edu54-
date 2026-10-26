"""Brand and edition switches (docs/edu54/CLAUDE.md §3). Umanah with no edition must stay exactly the AI Lab."""
import json

import pytest

from umanah_api import branding
from umanah_api.config import get_settings


@pytest.fixture
def switch(monkeypatch):
    def set_(brand: str, edition: str):
        monkeypatch.setenv("LABOS_BRAND", brand)
        monkeypatch.setenv("LABOS_EDITION", edition)
        get_settings.cache_clear(); branding.brand.cache_clear(); branding.edition.cache_clear()
    yield set_
    monkeypatch.delenv("LABOS_BRAND", raising=False); monkeypatch.delenv("LABOS_EDITION", raising=False)
    get_settings.cache_clear(); branding.brand.cache_clear(); branding.edition.cache_clear()


def test_default_is_the_ai_lab(switch):
    switch("umanah", "")
    c = branding.public_config()
    assert c["brand"]["productName"] == "Umanah AI Lab" and c["brand"]["colors"] == {}
    assert c["edition"]["terms"]["teacherCenter"] == "Teacher Center"


def test_edu54_k12(switch):
    switch("edu54", "k12")
    c = branding.public_config()
    assert c["brand"]["productName"] == "EDU54" and c["brand"]["colors"]["primary"] == "#0F4D3A"
    assert c["edition"]["terms"]["groups"] == "Classes" and c["edition"]["terms"]["teachers"] == "Teachers"
    assert c["edition"]["terms"]["teacher"] == "Teacher" and "JSS 1" in c["edition"]["levels"] and c["edition"]["youngChildLogin"]
    assert "Umanah" not in json.dumps(c)


def test_edu54_university(switch):
    switch("edu54", "university")
    c = branding.public_config()
    t = c["edition"]["terms"]
    assert (t["teacher"], t["teachers"], t["teacherCenter"], t["group"], t["groups"], t["admin"]) == ("Lecturer", "Lecturers", "Lecturer Center", "Course", "Courses", "Institution Admin")
    assert not c["edition"]["youngChildLogin"] and "Postgraduate" in c["edition"]["levels"]
    assert "Umanah" not in json.dumps(c)


def test_unknown_edition_fails_loudly(switch):
    switch("edu54", "kindergarten")
    with pytest.raises(ValueError):
        branding.edition()


def test_tutor_prompt_uses_the_brand(switch):
    from umanah_api.tutor import prompts
    switch("umanah", "")
    assert "inside Umanah AI Lab," in prompts.BASE.format(product=prompts._product(), max_words=1, band="", emoji="")
    switch("edu54", "k12")
    assert "inside EDU54," in prompts.BASE.format(product=prompts._product(), max_words=1, band="", emoji="")


def test_public_endpoint(client):
    r = client.get("/api/config/public")
    assert r.status_code == 200 and r.json()["brand"]["id"] == "umanah"
    assert client.get("/api/config/attributions").json()["items"] == []


@pytest.mark.parametrize("edition,school,teacher_title", [("k12", "EDU54 Demo School", "teacher"), ("university", "EDU54 Demo University", "lecturer")])
def test_edu54_seed(switch, tmp_path, monkeypatch, edition, school, teacher_title):
    """One admin, two teachers or lecturers, six students, one safety contact; logins written 0600 to the credentials file."""
    import os
    from fastapi.testclient import TestClient
    from sqlalchemy import select
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    from umanah_api.models import School, User
    creds = tmp_path / "secrets" / "demo-accounts.txt"
    monkeypatch.setenv("UMANAH_DATA_DIR", str(tmp_path / "db"))
    monkeypatch.setenv("UMANAH_CREDENTIALS_FILE", str(creds))
    switch("edu54", edition)
    with TestClient(create_app()) as c:
        with dbm.session_scope() as db:
            assert [s.name for s in db.scalars(select(School))] == [school]
            users = list(db.scalars(select(User)))
            roles = [u.role for u in users]
            assert roles.count("owner") == 1 and roles.count("teacher") == 2 and roles.count("student") == (9 if edition == "k12" else 6) and roles.count("counselor") == 1
            assert {u.title for u in users if u.role == "teacher"} == {teacher_title}
            assert not any("Jordan" in u.display_name for u in users)
        text = creds.read_text()
        assert oct(os.stat(creds).st_mode & 0o777) == "0o600" and school in text and text.count(": ") >= 10
        r = c.post("/api/auth/login", json={"username": "kofi" if edition == "k12" else "kwame", "password": "test-password-1"})
        assert r.status_code == 200
        assert c.get("/api/config/public").json()["brand"]["productName"] == "EDU54"
    dbm.engine().dispose()
    monkeypatch.delenv("UMANAH_DATA_DIR"); monkeypatch.delenv("UMANAH_CREDENTIALS_FILE")


def test_safety_resources_follow_the_deployment_country(monkeypatch):
    """docs/41: help resources configured for the deployment's country; never another country's hotlines."""
    from umanah_api.safety import responses
    monkeypatch.setenv("UMANAH_SAFETY_COUNTRY", "US"); get_settings.cache_clear()
    assert "988" in responses.support_response("self_harm", "Ms. Rivera", None)
    monkeypatch.setenv("UMANAH_SAFETY_COUNTRY", "NG"); get_settings.cache_clear()
    t = responses.support_response("medical_emergency", "Mrs. Otieno", "school counselor")
    assert "988" not in t and "911" not in t and "741741" not in t and "Mrs. Otieno" in t and "local emergency number" in t
    monkeypatch.delenv("UMANAH_SAFETY_COUNTRY"); get_settings.cache_clear()


def test_attributions_include_catalog_and_model_registry(client, tmp_path, monkeypatch):
    import json as j
    (tmp_path / "catalog.json").write_text(j.dumps({"items": [{"id": "a", "title": "Book", "license": "CC-BY-4.0", "attribution": "X", "source_url": "https://x", "checked_on": "2026-09-30"}]}))
    (tmp_path / "models.json").write_text(j.dumps([{"id": "m", "title": "Model", "license": "Apache-2.0", "attribution": "Y", "source_url": "https://y", "checked_on": "2026-09-30"}]))
    monkeypatch.setenv("UMANAH_KNOWLEDGE_CATALOG", str(tmp_path / "catalog.json")); get_settings.cache_clear()
    items = client.get("/api/config/attributions").json()["items"]
    assert [i["id"] for i in items] == ["a", "m"] and items[1]["kind"] == "model"
    monkeypatch.delenv("UMANAH_KNOWLEDGE_CATALOG"); get_settings.cache_clear()


def test_textbooks_come_only_from_the_catalog(app, tmp_path, monkeypatch):
    import json as j
    (tmp_path / "openstax").mkdir()
    (tmp_path / "openstax" / "physics.pdf").write_bytes(b"%PDF-1.4 test")
    (tmp_path / "catalog.json").write_text(j.dumps({"items": [
        {"id": "openstax-physics", "kind": "textbook", "edition": "both", "title": "Physics", "file": "openstax/physics.pdf", "license": "CC-BY-4.0"},
        {"id": "openstax-missing", "kind": "textbook", "edition": "both", "title": "Missing", "file": "openstax/missing.pdf", "license": "CC-BY-4.0"}]}))
    monkeypatch.setenv("UMANAH_KNOWLEDGE_CATALOG", str(tmp_path / "catalog.json")); get_settings.cache_clear()
    from tests.conftest import login
    client = login(app, "jordan")
    assert [i["id"] for i in client.get("/api/explore/textbooks").json()["items"]] == ["openstax-physics"]
    r = client.get("/api/explore/textbooks/openstax-physics.pdf")
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    assert client.get("/api/explore/textbooks/openstax-missing.pdf").status_code == 404
    monkeypatch.delenv("UMANAH_KNOWLEDGE_CATALOG"); get_settings.cache_clear()


def test_lan_demo_box_keeps_password_logins_and_try_buttons(tmp_path, monkeypatch, switch):
    """EDU54 demo box: "Try as a student / teacher" plus every demo account's own password sign-in."""
    from fastapi.testclient import TestClient
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    monkeypatch.setenv("UMANAH_DATA_DIR", str(tmp_path / "db")); monkeypatch.setenv("UMANAH_DEMO_MODE", "1"); monkeypatch.setenv("UMANAH_DEMO_ALL_LOGINS", "1")
    switch("edu54", "university")
    with TestClient(create_app()) as c:
        assert c.get("/api/demo/config").json()["enabled"]
        assert c.post("/api/auth/login", json={"username": "drasante", "password": "test-password-1"}).status_code == 200
        v = TestClient(c.app)
        r = v.post("/api/demo/start", json={"role": "teacher"})
        assert r.status_code == 200 and r.json()["user"]["name"] == "Dr. Asante"
        assert v.post("/api/demo/start", json={"role": "student"}).json()["user"]["name"] == "Kwame Owusu"
    dbm.engine().dispose()
    for k in ("UMANAH_DATA_DIR", "UMANAH_DEMO_MODE", "UMANAH_DEMO_ALL_LOGINS"):
        monkeypatch.delenv(k)
    get_settings.cache_clear()


def test_learner_context_by_band(tmp_path, monkeypatch, switch):
    """K-12: the class level picks the band; the path, recommendation and skills come from real progress; staff can preview."""
    from fastapi.testclient import TestClient
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    monkeypatch.setenv("UMANAH_DATA_DIR", str(tmp_path / "db"))
    switch("edu54", "k12")
    with TestClient(create_app()) as c:
        def as_(u):
            v = TestClient(c.app)
            r = v.post("/api/auth/login", json={"username": u, "password": "test-password-1"})
            v.headers["X-CSRF-Token"] = r.json()["csrf"]
            return v
        for user, level, band in (("kofi", "JSS 2", "build"), ("ama", "Primary 1", "discover"), ("chidi", "Primary 4", "explore"), ("fatima", "SSS 2", "launch")):
            d = as_(user).get("/api/learner/me").json()
            assert (d["level"], d["band"]["id"]) == (level, band), user
        k = as_("kofi").get("/api/learner/me").json()
        assert k["stage"] == "Junior Secondary" and k["path"]["percent"] > 0 and k["recommended"] and k["project"]
        assert [s["title"] for s in k["path"]["steps"]][:2] == ["AI Foundations", "Python"] and k["path"]["steps"][2]["state"] == "coming_soon"
        assert as_("kofi").get("/api/learner/preview?band=launch").status_code == 403
        p = as_("mrsadeyemi").get("/api/learner/preview?band=discover").json()
        assert p["preview"] and p["band"]["name"] == "Discover" and p["xp"]["xp"] == 0 and p["project"] is None
    dbm.engine().dispose()
    monkeypatch.delenv("UMANAH_DATA_DIR")


def test_school_drilldown_and_learner_view(tmp_path, monkeypatch, switch):
    from fastapi.testclient import TestClient
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    monkeypatch.setenv("UMANAH_DATA_DIR", str(tmp_path / "db"))
    switch("edu54", "k12")
    with TestClient(create_app()) as c:
        def as_(u):
            v = TestClient(c.app)
            r = v.post("/api/auth/login", json={"username": u, "password": "test-password-1"})
            v.headers["X-CSRF-Token"] = r.json()["csrf"]
            return v
        admin = as_("admin").get("/api/learner/school").json()["groups"]
        assert [g["band"]["id"] for g in admin] == ["discover", "explore", "build", "launch"]
        teacher = as_("mrsadeyemi").get("/api/learner/school").json()["groups"]
        assert [g["band"]["id"] for g in teacher] == ["build"]            # only her own class
        kofi = teacher[0]["levels"][0]["classes"][0]["learners"]
        kid = next(x["id"] for x in kofi if x["name"] == "Kofi Mensah")
        # one student page for both brands (the AI Lab's), with the edition's level name and band
        d = as_("mrsadeyemi").get(f"/api/teacher/students/{kid}").json()
        level = teacher[0]["levels"][0]["level"]
        assert d["name"] == "Kofi Mensah" and d["grade_label"] == level and d["band"] == "build" and d["projects"] is not None and d["assignments"]
        ama = next(x["id"] for g in admin for lv in g["levels"] for cl in lv["classes"] for x in cl["learners"] if x["name"] == "Ama Owusu")
        assert as_("mrsadeyemi").get(f"/api/teacher/students/{ama}").status_code == 404      # not her class
        assert as_("admin").get(f"/api/teacher/students/{ama}").json()["grade_label"] == "Primary 1"
        assert as_("kofi").get("/api/learner/school").status_code == 403
    dbm.engine().dispose()
    monkeypatch.delenv("UMANAH_DATA_DIR")
