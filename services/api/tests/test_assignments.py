def test_keys_never_returned(student):
    d = student.get("/api/assignments/asg-loops-practice").json()
    blob = str(d).lower()
    assert "answer_key" not in blob and '"key"' not in blob
    assert d["help"]["badge"] == "Homework help: hints only — set by Ms. Williams" and d["help"]["locked"] is True
    assert all("hints_total" in q for q in d["questions"])


def test_check_returns_correctness_only(student):
    q = "asg-loops-practice:q2"
    bad = student.post(f"/api/assignments/asg-loops-practice/questions/{q}/check", json={"answer": "6"}).json()
    assert bad["correct"] is False and bad["note"]
    assert "5" not in str(bad)
    ok = student.post(f"/api/assignments/asg-loops-practice/questions/{q}/check", json={"answer": "5"}).json()
    assert ok["correct"] is True


def test_hint_ladder_then_exhausted(student):
    q = "asg-loops-practice:q3"
    got = [student.post(f"/api/assignments/asg-loops-practice/questions/{q}/hint").json() for _ in range(4)]
    assert [g["step"] for g in got[:3]] == [1, 2, 3] and got[3]["exhausted"] is True


def test_draft_submit_and_exclusive_states(app):
    from .conftest import login
    c = login(app, "student20")     # in progress on lesson 6, no submission yet
    d = c.get("/api/assignments/asg-loops-practice").json()
    assert d["state"] == "draft"
    assert c.post("/api/assignments/asg-loops-practice/submit").status_code == 400      # nothing answered yet
    c.put("/api/assignments/asg-loops-practice/draft", json={"answers": {"asg-loops-practice:q1": "0 1 2 3"}})
    r = c.post("/api/assignments/asg-loops-practice/submit").json()
    assert r["state"] == "submitted"
    assert c.put("/api/assignments/asg-loops-practice/draft", json={"answers": {}}).status_code == 409   # read-only after submit
    assert c.get("/api/assignments/asg-loops-practice").json()["state"] == "submitted"


def test_teacher_grades_and_student_sees_feedback(app):
    from .conftest import login
    t = login(app, "mswilliams")
    ov = t.get("/api/teacher/overview").json()
    assert ov["students"] == 28
    sub = next(s for s in ov["recent_submissions"] if s["state"] == "submitted")
    detail = t.get(f"/api/teacher/submissions/{sub['id']}").json()
    assert detail["items"] and "expected" in detail["items"][0]          # teachers may see keys
    assert t.post(f"/api/teacher/submissions/{sub['id']}/grade", json={"score": 9, "feedback": "x"}).status_code == 400
    ok = t.post(f"/api/teacher/submissions/{sub['id']}/grade", json={"score": 3, "feedback": "Well done"})
    assert ok.status_code == 200 and ok.json()["state"] == "returned"


def test_loop_master_needs_lesson_and_grade(app, stub):
    from .conftest import login
    from .test_learning import _finish_lesson
    j = login(app, "jordan")
    _finish_lesson(j)
    j.post("/api/lessons/py-l6/complete")
    base = "/api/assignments/asg-loops-practice"
    j.put(f"{base}/draft", json={"answers": {f"asg-loops-practice:q{i}": a for i, a in ((1, "0 1 2 3"), (2, "5"), (3, "12"))}})
    j.post(f"{base}/submit")
    t = login(app, "mswilliams")
    ov = t.get("/api/teacher/overview").json()
    sub = next(s for s in ov["recent_submissions"] if s["student"] == "Jordan Smith")
    r = t.post(f"/api/teacher/submissions/{sub['id']}/grade", json={"score": 3, "feedback": "Great loops"}).json()
    assert "loop-master" in r["badges_awarded"]
    fb = j.get(base).json()
    assert fb["state"] == "returned" and fb["feedback"] == "Great loops"
    assert any(b["id"] == "loop-master" and b["earned"] for b in j.get("/api/progress/me").json()["badges"])
