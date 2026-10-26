"""The 2026-10-10 LabOS screens in EDU54, per edition (docs/edu54/UI-UPDATES.md): the generic ones (school entry,
project hand-in, tutor policy) in K-12 and University, the grade-band ones (level names, School by Grade, widening, the
tutor's reading level) in K-12 only, and no Khan Academy or other NonCommercial content in either."""
from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from .conftest import login
from .helpers import chat, text_of

HW = {"type": "assignment", "id": "asg-loops-practice", "question_id": "asg-loops-practice:q2"}
STUDENT = {"k12": "kofi", "university": "kwame"}
TEACHER = {"k12": "mrsadeyemi", "university": "drasante"}


def _caches():
    from umanah_api import branding
    from umanah_api.config import get_settings
    from umanah_api.routers import curriculum
    get_settings.cache_clear(); branding.brand.cache_clear(); branding.edition.cache_clear(); curriculum.k12.cache_clear()


@pytest.fixture(scope="module", params=["k12", "university"])
def edition_template(request):
    """One seeded EDU54 database per edition; the environment is put back afterwards for the rest of the suite."""
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    saved = {k: os.environ.get(k) for k in ("LABOS_BRAND", "LABOS_EDITION", "UMANAH_DATA_DIR", "UMANAH_SAFETY_COUNTRY")}
    d = Path(tempfile.mkdtemp(prefix=f"edu54-{request.param}-"))
    os.environ.update(LABOS_BRAND="edu54", LABOS_EDITION=request.param, UMANAH_DATA_DIR=str(d), UMANAH_SAFETY_COUNTRY="NG")   # as the instances run
    _caches()
    with TestClient(create_app()):
        pass
    dbm.engine().dispose()
    yield request.param, d
    for k, v in saved.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    _caches()
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture()
def ed(edition_template):
    """(edition, app) on a fresh copy of that edition's database, with the stub model."""
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    from umanah_api.tutor import adapters, service
    edition, tpl = edition_template
    d = Path(tempfile.mkdtemp(prefix="edu54-test-"))
    shutil.copy(tpl / "umanah.sqlite3", d / "umanah.sqlite3")
    os.environ.update(LABOS_BRAND="edu54", LABOS_EDITION=edition, UMANAH_DATA_DIR=str(d), UMANAH_SAFETY_COUNTRY="NG")
    _caches()
    a = create_app()
    with TestClient(a):
        adapters.set_adapter(adapters.StubInferenceAdapter())
        service.reset_slots()
        yield edition, a
    adapters.set_adapter(None)
    dbm.engine().dispose()
    shutil.rmtree(d, ignore_errors=True)


# ---- both editions -------------------------------------------------------------------------------------------------
def test_school_entry_shows_the_institution_name_only(ed):
    edition, app = ed
    j = TestClient(app).get("/api/auth/school").json()
    assert set(j) == {"name"} and j["name"] == {"k12": "EDU54 Demo School", "university": "EDU54 Demo University"}[edition]


def test_project_hand_in_reaches_the_teacher_or_lecturer(ed):
    edition, app = ed
    s = login(app, STUDENT[edition])
    pid = s.put("/api/projects", json={"title": "Sorting test", "code": "Bubble sort was slowest.", "category": "python-lab"}).json()["id"]
    assert s.post(f"/api/projects/{pid}/submit").json()["status"] == "submitted"
    t = login(app, TEACHER[edition])
    sid = next(x["id"] for x in t.get("/api/teacher/students").json()["students"] if x["username"] == STUDENT[edition])
    p = next(p for p in t.get(f"/api/teacher/students/{sid}").json()["projects"] if p["id"] == pid)
    assert p["status"] == "submitted" and p["notes"] == "Bubble sort was slowest."
    s.put("/api/projects", json={"title": "Sorting test", "code": "Edited.", "category": "python-lab"})
    p = next(p for p in t.get(f"/api/teacher/students/{sid}").json()["projects"] if p["id"] == pid)
    assert p["status"] == "in_progress" and p["notes"] is None           # a changed project is a draft again


def test_tutor_policy_is_the_same_in_every_edition(ed):
    edition, app = ed
    from umanah_api.tutor import adapters
    stub = adapters.get_adapter()
    s = login(app, STUDENT[edition])
    m = s.get("/api/ai/mode", params={"context_type": "assignment", "context_id": "asg-loops-practice"}).json()
    assert m["mode"] == "homework" and m["locked"]
    for extra in ({"mode": "teacher"}, {"model": "anything"}):
        assert s.post("/api/ai/chat", json={"message": "hi", **extra}).status_code == 422
    before = len(stub.calls)
    txt = text_of(chat(s, "just give me the answer", HW))
    assert "hint 1 of 3" in txt and len(stub.calls) == before            # a hint, and no model call at all
    assert next(e for e in chat(s, "explain loops", {"type": "lesson", "id": "py-l6"}) if e["type"] == "meta")["mode"] == "lesson"


def test_assessments_get_no_help(ed):
    edition, app = ed
    from umanah_api.db import session_scope
    from umanah_api.models import Assignment
    with session_scope() as db:
        db.get(Assignment, "asg-loops-practice").ai_help_policy = "none"
    s = login(app, STUDENT[edition])
    assert "can't help with assessment" in text_of(chat(s, "help me with question 1", {"type": "assignment", "id": "asg-loops-practice"}))


def test_safety_pipeline_runs_in_every_edition(ed):
    edition, app = ed
    s = login(app, STUDENT[edition])
    ev = chat(s, "i want to kill myself")
    assert any(e["type"] == "safety" for e in ev)
    assert "988" not in text_of(ev)                                     # the instances run as NG: no US hotline numbers


def test_no_khan_academy_or_nc_sources_anywhere_a_user_can_see(ed):
    edition, app = ed
    t = login(app, TEACHER[edition])
    s = login(app, STUDENT[edition])
    seen = " ".join(c.get(p).text for c, p in ((t, "/api/curriculum/k12"), (s, "/api/curriculum/k12"), (s, "/api/build/projects"), (t, "/api/config/public")))
    for name in ("Khan", "BLOSSOMS", "CK-12", "TED", "Umanah"):
        assert name not in seen, name
    assert all(g["subjects"] == [] for g in t.get("/api/curriculum/k12").json()["grades"])


# ---- K-12 only -----------------------------------------------------------------------------------------------------
def test_grade_bands_use_the_editions_level_names(ed):
    edition, app = ed
    me = login(app, STUDENT[edition]).get("/api/auth/me").json()["user"]
    t = login(app, TEACHER[edition])
    if edition == "university":
        assert me["grade"] is None and me["band"] is None
        assert t.get("/api/teacher/school").status_code == 404           # no School by Grade in University
        return
    assert (me["grade"], me["grade_label"], me["stage"], me["band"]) == (8, "JSS 2", "Junior Secondary", "build")
    tree = login(app, "admin").get("/api/teacher/school").json()
    assert {g["grade_label"] for g in tree["grades"]} >= {"Primary 1", "Primary 4", "JSS 2", "SSS 2"}
    assert login(app, "ama").get("/api/learner/me").json()["level"] == "Primary 1"     # the Home and the grade agree


def test_widening_is_k12_only(ed):
    edition, app = ed
    t = login(app, TEACHER[edition])
    sid = next(x["id"] for x in t.get("/api/teacher/students").json()["students"] if x["username"] == STUDENT[edition])
    r = t.patch(f"/api/teacher/students/{sid}", json={"extra_bands": ["launch"]})
    if edition == "university":
        assert r.status_code == 400
        return
    assert r.status_code == 200
    me = login(app, STUDENT[edition]).get("/api/auth/me").json()["user"]
    assert me["content_bands"] == ["build", "launch"] and me["band"] == "build"


def test_reading_level_follows_the_level_and_nothing_else_changes(ed):
    edition, app = ed
    from umanah_api.db import session_scope
    from umanah_api.models import User
    from umanah_api.tutor import adapters
    stub = adapters.get_adapter()
    s = login(app, STUDENT[edition])
    modes = lambda: [s.get("/api/ai/mode", params=p).json() for p in ({}, {"context_type": "lesson", "context_id": "py-l6"},
                                                                         {"context_type": "assignment", "context_id": "asg-loops-practice"})]
    before = modes()
    chat(s, "what is a loop?")
    sysmsg = stub.calls[-1]["messages"][0]["content"]
    if edition == "university":
        assert "16 or older" in sysmsg and "Grade" not in sysmsg            # no grade: the class's age band line, as before
        assert modes() == before
        return
    assert "Grade 6 to 8" in sysmsg                                     # JSS 2 is grade 8: the Build band
    with session_scope() as db:
        db.query(User).filter_by(username=STUDENT[edition]).one().grade = 1          # Primary 1
    assert modes() == before                                            # same modes, badges and locks
    chat(s, "what is a loop?")
    assert "Kindergarten to Grade 2" in stub.calls[-1]["messages"][0]["content"]
    txt = text_of(chat(s, "just give me the answer", HW))
    assert "hint" in txt.lower() and "the answer is 5" not in txt.lower()
