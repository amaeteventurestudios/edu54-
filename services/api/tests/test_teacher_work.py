"""Teachers create homework and assessments; answer keys stay on the server; assessments switch help off; class Practice view."""
from datetime import UTC, datetime, timedelta

from tests.conftest import login


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("umanah_csrf")}


def make(t, kind="assessment"):
    cid = t.get("/api/teacher/assignments").json()["classes"][0]["id"]
    body = {"class_id": cid, "title": "Fractions check", "kind": kind, "instructions": "Answer all three.", "due_at": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
            "questions": [{"prompt": "What is 1/2 + 1/4? Give a decimal.", "kind": "number", "answer": "0.75", "tolerance": 0.001, "hints": ["Change 1/2 to quarters."]},
                          {"prompt": "Which is bigger?", "kind": "choice", "answer": "3/4", "options": ["2/3", "3/4"]},
                          {"prompt": "The top number of a fraction is called the...", "kind": "text", "answer": "numerator"}]}
    return t.post("/api/teacher/assignments", json=body, headers=csrf(t))


def test_teacher_creates_an_assessment_students_take_it_without_help_or_keys(app):
    t = login(app, "mswilliams")
    r = make(t)
    assert r.status_code == 201 and r.json()["max_score"] == 3
    aid = r.json()["id"]
    s = login(app, "jordan")
    a = s.get(f"/api/assignments/{aid}").json()
    assert a["kind"] == "assessment" and a["questions"][1]["options"] == ["2/3", "3/4"]
    assert "0.75" not in str(a) and "numerator" not in str(a)                  # keys never reach the student
    q1 = a["questions"][0]["id"]
    assert s.post(f"/api/assignments/{aid}/questions/{q1}/check", json={"answer": "0.75"}, headers=csrf(s)).status_code == 403
    assert s.post(f"/api/assignments/{aid}/questions/{q1}/hint", headers=csrf(s)).status_code == 403
    s.put(f"/api/assignments/{aid}/draft", json={"answers": {q1: "0.75", a["questions"][1]["id"]: "3/4", a["questions"][2]["id"]: "Numerator"}}, headers=csrf(s))
    assert s.post(f"/api/assignments/{aid}/submit", headers=csrf(s)).status_code == 200
    row = next(x for x in t.get("/api/teacher/assignments", params={"kind": "assessment"}).json()["assignments"] if x["id"] == aid)
    assert row["submitted"] == 1
    detail = t.get(f"/api/teacher/submissions/{row['submissions'][0]['id']}").json()
    assert detail["suggested_score"] == 3


def test_homework_keeps_its_hints_and_checks(app):
    t = login(app, "mswilliams")
    aid = make(t, kind="homework").json()["id"]
    s = login(app, "jordan")
    q1 = s.get(f"/api/assignments/{aid}").json()["questions"][0]["id"]
    assert s.post(f"/api/assignments/{aid}/questions/{q1}/hint", headers=csrf(s)).json()["text"] == "Change 1/2 to quarters."
    assert s.post(f"/api/assignments/{aid}/questions/{q1}/check", json={"answer": "0.5"}, headers=csrf(s)).json()["correct"] is False


def test_bad_questions_and_students_are_refused(app):
    t = login(app, "mswilliams")
    cid = t.get("/api/teacher/assignments").json()["classes"][0]["id"]
    bad = {"class_id": cid, "title": "x", "kind": "homework", "due_at": datetime.now(UTC).isoformat(),
           "questions": [{"prompt": "Pick", "kind": "choice", "answer": "C", "options": ["A", "B"]}]}
    assert t.post("/api/teacher/assignments", json=bad, headers=csrf(t)).status_code == 422
    s = login(app, "jordan")
    assert s.post("/api/teacher/assignments", json=bad, headers=csrf(s)).status_code == 403


def test_class_practice_view_lists_weak_topics(app):
    j = login(app, "mswilliams").get("/api/teacher/practice").json()
    top = j["topics"][0]
    assert top["concept"] == "range start" and top["percent"] == 0 and top["struggling"][0]["name"] == "Jordan Smith"
