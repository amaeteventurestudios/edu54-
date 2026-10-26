"""K-12 spec leftovers: per-student widened content, projects handed in, school entry, School -> Grade -> Class -> Student,
and the tutor's reading level following the student's grade without changing any limit."""
from .conftest import login
from .helpers import chat, text_of

HW = {"type": "assignment", "id": "asg-loops-practice", "question_id": "asg-loops-practice:q2"}


def _sid(t, username="jordan"):
    return next(s["id"] for s in t.get("/api/teacher/students").json()["students"] if s["username"] == username)


def test_teacher_widens_a_students_content_student_cannot(app):
    t = login(app, "mswilliams")
    sid = _sid(t)
    assert login(app, "jordan").get("/api/auth/me").json()["user"]["content_bands"] == ["build"]
    before = login(app, "jordan").get("/api/build/projects").json()
    r = t.patch(f"/api/teacher/students/{sid}", json={"extra_bands": ["launch", "build"]})
    assert r.status_code == 200
    me = login(app, "jordan").get("/api/auth/me").json()["user"]
    assert me["content_bands"] == ["build", "launch"] and me["band"] == "build"        # own band unchanged
    after = login(app, "jordan").get("/api/build/projects").json()
    assert sum(map(len, after.values())) > sum(map(len, before.values()))
    view = t.get(f"/api/teacher/students/{sid}").json()
    assert view["extra_bands"] == ["launch"] and view["content_bands"] == ["build", "launch"]
    assert t.patch(f"/api/teacher/students/{sid}", json={"extra_bands": ["college"]}).status_code == 422
    assert login(app, "jordan").patch(f"/api/teacher/students/{sid}", json={"extra_bands": ["launch"]}).status_code == 403
    assert t.patch(f"/api/teacher/students/{sid}", json={"extra_bands": []}).json()
    assert login(app, "jordan").get("/api/auth/me").json()["user"]["content_bands"] == ["build"]


def test_project_hand_in_reaches_the_teacher(app):
    s = login(app, "jordan")
    pid = s.put("/api/projects", json={"title": "Pendulum test", "code": "Longer string, slower swing.", "category": "science"}).json()["id"]
    r = s.post(f"/api/projects/{pid}/submit")
    assert r.status_code == 200 and r.json()["status"] == "submitted"
    t = login(app, "mswilliams")
    notes = t.get("/api/notifications").json()
    assert any(n["title"].endswith("handed in a project") for n in notes.get("items", notes.get("notifications", [])))
    p = next(p for p in t.get(f"/api/teacher/students/{_sid(t)}").json()["projects"] if p["id"] == pid)
    assert p["status"] == "submitted" and p["notes"] == "Longer string, slower swing."
    # another student cannot hand it in; changing it makes it a draft again (notes hidden from the teacher until handed in)
    assert login(app, "student21").post(f"/api/projects/{pid}/submit").status_code == 404
    s.put("/api/projects", json={"title": "Pendulum test", "code": "Edited.", "category": "science"})
    p = next(p for p in t.get(f"/api/teacher/students/{_sid(t)}").json()["projects"] if p["id"] == pid)
    assert p["status"] == "in_progress" and p["notes"] is None


def test_school_entry_needs_no_sign_in_and_shows_only_the_name(client):
    j = client.get("/api/auth/school").json()
    assert set(j) == {"name"} and j["name"]


def test_school_grade_class_student_tree(app):
    t = login(app, "mswilliams")
    j = t.get("/api/teacher/school").json()
    g7 = next(g for g in j["grades"] if g["grade"] == 7)
    assert j["school"] and g7["stage"] == "Middle School"
    assert any(any(s["name"] for s in c["students"]) for c in g7["classes"])
    assert login(app, "jordan").get("/api/teacher/school").status_code == 403


def test_reading_level_follows_grade_and_nothing_else_changes(app, stub):
    from umanah_api.db import session_scope
    from umanah_api.models import User
    s = login(app, "jordan")
    modes = lambda: [s.get("/api/ai/mode", params=p).json() for p in ({}, {"context_type": "lesson", "context_id": "py-l6"},
                                                                         {"context_type": "assignment", "context_id": "asg-loops-practice"})]
    grade7 = modes()
    chat(s, "what is a loop?")
    assert "Grade 6 to 8" in stub.calls[-1]["messages"][0]["content"]
    with session_scope() as db:
        db.query(User).filter_by(username="jordan").one().grade = 1
    assert modes() == grade7                                     # same modes, badges, locks
    chat(s, "what is a loop?")
    sysmsg = stub.calls[-1]["messages"][0]["content"]
    assert "Kindergarten to Grade 2" in sysmsg and "Grade 6 to 8" not in sysmsg
    # homework limits still hold for a Grade 1 student
    txt = text_of(chat(s, "just give me the answer", HW))
    assert "hint" in txt.lower() and "the answer is 5" not in txt.lower()
