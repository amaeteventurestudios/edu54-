from sqlalchemy import select

from tests.conftest import login
from umanah_api.content import revision_pack
from umanah_api.db import session_scope
from umanah_api.models import XpEvent


def test_questions_never_carry_answers(app):
    c = login(app, "jordan")
    j = c.get("/api/revision/questions", params={"n": 5}).json()
    assert len(j["questions"]) == 5
    assert all(set(q) == {"id", "prompt", "code", "options"} for q in j["questions"])
    assert "answer_index" not in c.get("/api/revision/flashcards").text


def test_check_reports_correctness_and_records_weak_topics(app):
    c = login(app, "jordan")
    pack = revision_pack()
    q = pack["questions"][0]
    wrong = (q["answer_index"] + 1) % len(q["options"])
    r = c.post("/api/revision/check", json={"question_id": q["id"], "choice": wrong}).json()
    assert r["correct"] is False and r["explanation"]
    assert c.post("/api/revision/check", json={"question_id": q["id"], "choice": q["answer_index"]}).json()["correct"] is True
    ov = c.get("/api/revision/overview").json()
    weak = {w["concept"]: w["misses"] for w in ov["weak_topics"]}
    assert weak[q["concept"]] >= 1 and "Weak topic" in ov["recommended"]["tags"]
    assert ov["counts"]["questions"] == 10 and ov["past_lessons"] and ov["recommended"]["topic"] == "Python Loops"


def test_homework_misconceptions_also_make_a_topic_weak(app):
    c = login(app, "student20")     # the seed gives four students two off-by-one misses each on Loops Practice
    ov = c.get("/api/revision/overview").json()
    assert ov["recommended"]["topic"] == "Python Loops" and "range start" in [w["concept"] for w in ov["weak_topics"]]


def test_sprint_scores_on_the_server_and_pays_xp_once_a_day(app):
    c = login(app, "jordan")
    pack = revision_pack()
    good = {q["id"]: q["answer_index"] for q in pack["questions"][:5]}
    bad = {**good, pack["questions"][0]["id"]: (pack["questions"][0]["answer_index"] + 1) % 4}
    r = c.post("/api/revision/sprint/finish", json={"answers": bad}).json()
    assert (r["score"], r["total"], r["xp_awarded"]) == (4, 5, 4 * 15 + 15)          # "4/5 correct, +75 XP"
    again = c.post("/api/revision/sprint/finish", json={"answers": good}).json()
    assert again["score"] == 5 and again["xp_awarded"] == 0 and again["xp_already_today"] is True
    with session_scope() as db:
        assert len(db.scalars(select(XpEvent.id).where(XpEvent.kind == "revision")).all()) == 1


def test_staff_cannot_use_student_revision(app):
    assert login(app, "mswilliams").get("/api/revision/overview").status_code == 403
