from .helpers import chat  # noqa: F401


def _finish_lesson(c):
    c.post("/api/lessons/py-l6/progress", json={"step": "read"})
    c.post("/api/lessons/py-l6/questions/cq1/check", json={"option": 1})
    c.post("/api/lessons/py-l6/questions/cq2/check", json={"option": 0})
    c.post("/api/lessons/py-l6/questions/cq3/check", json={"option": 1})
    return c.post("/api/lessons/py-l6/progress", json={"step": "try1"})


def test_home_shows_reference_facts(student):
    j = student.get("/api/progress/me").json()
    assert j["level"]["level"] == 4 and j["level"]["name"] == "Builder" and j["level"]["xp"] == 1420
    assert j["streak"] == 6
    cont = student.get("/api/learn/continue").json()
    assert cont["lesson"]["title"] == "Loops" and cont["assigned"][0]["title"] == "Loops Practice"


def test_lesson_never_ships_answers(student):
    d = student.get("/api/lessons/py-l6").json()
    for q in d["check_questions"]:
        assert "answer_index" not in q and "explanation" not in q


def test_completing_twice_gives_xp_once(student):
    assert _finish_lesson(student).json()["percent"] == 100
    first = student.post("/api/lessons/py-l6/complete").json()
    again = student.post("/api/lessons/py-l6/complete").json()
    assert first["xp_awarded"] == 50 and again["xp_awarded"] == 0
    assert first["xp_total"] == again["xp_total"]


def test_cannot_complete_early(app):
    from .conftest import login
    c = login(app, "student20")                       # in progress on Lesson 6 in the seed
    c.post("/api/lessons/py-l6/progress", json={"step": "read"})
    r = c.post("/api/lessons/py-l6/complete")
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid"


def test_wrong_check_gives_feedback_not_answer(student):
    r = student.post("/api/lessons/py-l6/questions/cq1/check", json={"option": 0}).json()
    assert r["correct"] is False and r["explanation"] is None      # the explanation reveals the answer, so it waits for a correct try
    assert r["feedback"]


def test_unavailable_lesson_is_honest(student):
    assert student.get("/api/lessons/python-foundations-l99").status_code == 404      # every catalog lesson is written now; an unknown one is a plain 404
