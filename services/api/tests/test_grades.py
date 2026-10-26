"""K-12 grade bands: grade comes from enrollment, the band follows from it, and students cannot change it."""
import pytest

from tests.conftest import login
from umanah_api.grades import band_of, grade_json


@pytest.mark.parametrize("grade,band,stage", [(0, "discover", "Early Years"), (2, "discover", "Early Years"), (3, "explore", "Elementary"), (5, "explore", "Elementary"),
                                              (6, "build", "Middle School"), (8, "build", "Middle School"), (9, "launch", "High School"), (12, "launch", "High School")])
def test_bands(grade, band, stage):
    assert band_of(grade) == band and grade_json(grade)["stage"] == stage
    assert grade_json(0)["grade_label"] == "Kindergarten" and grade_json(None)["band"] is None


def test_student_sees_their_grade_and_band(app):
    me = login(app, "jordan").get("/api/auth/me").json()["user"]
    assert (me["grade"], me["grade_label"], me["band"], me["stage"]) == (7, "Grade 7", "build", "Middle School")
    assert "grade" not in login(app, "mswilliams").get("/api/auth/me").json()["user"]


def test_teacher_sets_grade_student_cannot(app):
    t = login(app, "mswilliams")
    sid = next(s["id"] for s in t.get("/api/teacher/students").json()["students"] if s["username"] == "jordan")
    csrf = t.cookies.get("umanah_csrf")
    r = t.patch(f"/api/teacher/students/{sid}", json={"grade": 4}, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 200 and r.json()["grade"] == 4
    assert login(app, "jordan").get("/api/auth/me").json()["user"]["band"] == "explore"
    s = login(app, "jordan")
    assert s.patch(f"/api/teacher/students/{sid}", json={"grade": 12}, headers={"X-CSRF-Token": s.cookies.get("umanah_csrf")}).status_code == 403
    assert t.patch(f"/api/teacher/students/{sid}", json={"grade": 13}, headers={"X-CSRF-Token": csrf}).status_code == 422


def test_teacher_student_view_has_strengths_struggles_history_and_next_step(app):
    t = login(app, "mswilliams")
    sid = next(s["id"] for s in t.get("/api/teacher/students").json()["students"] if s["username"] == "jordan")
    j = t.get(f"/api/teacher/students/{sid}").json()
    assert j["stage"] == "Middle School" and j["assignments"]
    assert [c["concept"] for c in j["struggling"]][:1] == ["range start"]      # seeded: Jordan keeps mixing up where range starts
    assert "range start" in j["next_step"]


def test_build_projects_follow_the_band(app):
    j = login(app, "jordan").get("/api/build/projects").json()      # Grade 7
    assert j["science"] and all("build" in p["bands"] for k in j for p in j[k])
    assert "print(" in next(p for p in j["ai"] if p["id"] == "ai-fruit")["code"]
    t = login(app, "mswilliams").get("/api/build/projects").json()
    assert sum(len(v) for v in t.values()) > sum(len(v) for v in j.values())


def test_every_build_simulation_exists_in_the_catalog_file():
    import re
    from umanah_api.routers.build import catalog
    for kind in ("science", "engineering"):
        for p in catalog()[kind]:
            assert re.fullmatch(r"[0-9a-f]{32}", p["sim"]), p["id"]


def test_k12_curriculum_has_every_grade_and_students_get_their_own(app):
    t = login(app, "mswilliams").get("/api/curriculum/k12").json()["grades"]
    assert [g["grade"] for g in t] == list(range(13)) and all(any(s["subject"] == "Math" for s in g["subjects"]) for g in t)
    assert t[0]["grade_label"] == "Kindergarten" and t[0]["umanah_courses"] == []
    s = login(app, "jordan").get("/api/curriculum/k12").json()["grades"]
    assert len(s) == 1 and s[0]["grade"] == 7 and {c["id"] for c in s[0]["umanah_courses"]} == {"ai-foundations", "python-foundations", "science-engineering"}
