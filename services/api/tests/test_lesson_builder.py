"""AI Lesson Builder: draft (offline stub here), teacher edits and publishes, students then see and complete it."""
from tests.conftest import login


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("umanah_csrf")}


def test_draft_publish_and_students_take_it(app):
    t = login(app, "mswilliams")
    jid = t.post("/api/teacher/lessons/draft", json={"topic": "The water cycle", "grade": 4}, headers=csrf(t)).json()["id"]
    d = t.get(f"/api/teacher/lessons/draft/{jid}").json()
    assert d["state"] == "done"
    assert d["draft"]["title"] == "The water cycle" and d["flag"] is None and "mistakes" in d["note"]
    lesson = {**d["draft"], "title": "The Water Cycle"}
    s = login(app, "jordan")
    saved = t.post("/api/teacher/lessons", json={"grade": 4, "lesson": lesson}, headers=csrf(t)).json()
    assert saved["status"] == "draft"
    assert s.get(f"/api/lessons/{saved['id']}").status_code == 404                  # drafts are never shown to students
    pub = t.put(f"/api/teacher/lessons/{saved['id']}", json={"grade": 4, "lesson": lesson, "publish": True}, headers=csrf(t)).json()
    assert pub["status"] == "published"
    courses = s.get("/api/courses").json()["courses"]
    assert any(c["title"] == "From Your Teachers" for c in courses)
    l = s.get(f"/api/lessons/{saved['id']}").json()
    assert l["title"] == "The Water Cycle" and "answer_index" not in str(l["check_questions"])     # keys stay on the server
    s.post(f"/api/lessons/{saved['id']}/progress", json={"step": "read"}, headers=csrf(s))
    for q in l["check_questions"]:
        idx = next(i for i, x in enumerate(lesson["check_questions"]) if x["prompt"] == q["prompt"])
        assert s.post(f"/api/lessons/{saved['id']}/questions/{q['id']}/check", json={"option": lesson["check_questions"][idx]["answer_index"]}, headers=csrf(s)).json()["correct"]
    done = s.post(f"/api/lessons/{saved['id']}/complete", headers=csrf(s))
    assert done.status_code == 200 and done.json()["xp_awarded"] == 50
    t.post(f"/api/teacher/lessons/{saved['id']}/unpublish", headers=csrf(t))
    assert s.get(f"/api/lessons/{saved['id']}").status_code == 404


def test_unsafe_text_cannot_be_published_and_students_cannot_use_the_builder(app):
    t = login(app, "mswilliams")
    jid = t.post("/api/teacher/lessons/draft", json={"topic": "Fractions", "grade": 5}, headers=csrf(t)).json()["id"]
    d = t.get(f"/api/teacher/lessons/draft/{jid}").json()["draft"]
    d["sections"][0]["text"] = "I want to kill myself"
    r = t.post("/api/teacher/lessons", json={"grade": 5, "lesson": d, "publish": True}, headers=csrf(t))
    assert r.status_code == 400 and "safety" in r.json()["error"]["message"]
    s = login(app, "jordan")
    assert s.post("/api/teacher/lessons/draft", json={"topic": "Fractions", "grade": 5}, headers=csrf(s)).status_code == 403
