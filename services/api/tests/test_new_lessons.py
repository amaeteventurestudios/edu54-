"""Python Lessons 5 and 7 and AI Foundations Lesson 1 (part I): content, checks, hint ladders."""
import pytest

from tests.conftest import login
from umanah_api.content import assignment_pack, lesson_pack

LESSONS = ([f"python-foundations-l{n}" for n in (1, 2, 3, 4, 5, 7, 8, 9)] + [f"ai-foundations-l{n}" for n in range(1, 12)]
           + [f"science-engineering-l{n}" for n in range(1, 9)])
ASSIGNMENTS = ["asg-lists-practice", "asg-while-practice", "asg-ai-practice"]


@pytest.mark.parametrize("lid", LESSONS)
def test_lessons_open_and_never_leak_answers(student, lid):
    r = student.get(f"/api/lessons/{lid}")
    assert r.status_code == 200
    j = r.json()
    assert len(j["check_questions"]) == 3 and "answer_index" not in r.text and j["try_it"]["starter"]


@pytest.mark.parametrize("lid", LESSONS)
def test_check_questions_are_checked_on_the_server(student, lid):
    student.get(f"/api/lessons/{lid}")
    for q in lesson_pack(lid)["check_questions"]:
        wrong = (q["answer_index"] + 1) % len(q["options"])
        bad = student.post(f"/api/lessons/{lid}/questions/{q['id']}/check", json={"option": wrong}).json()
        assert bad["correct"] is False and bad["feedback"]
        good = student.post(f"/api/lessons/{lid}/questions/{q['id']}/check", json={"option": q["answer_index"]}).json()
        assert good["correct"] is True and good["explanation"]


@pytest.mark.parametrize("lid", LESSONS)
def test_lesson_can_be_completed_for_xp(student, lid):
    student.get(f"/api/lessons/{lid}")
    student.post(f"/api/lessons/{lid}/progress", json={"step": "read"})
    for q in lesson_pack(lid)["check_questions"]:
        student.post(f"/api/lessons/{lid}/questions/{q['id']}/check", json={"option": q["answer_index"]})
    student.post(f"/api/lessons/{lid}/progress", json={"step": "try1"})
    assert student.post(f"/api/lessons/{lid}/complete").status_code == 200


@pytest.mark.parametrize("aid", ASSIGNMENTS)
def test_assignments_have_a_three_step_hint_ladder_and_server_side_keys(student, aid):
    a = student.get(f"/api/assignments/{aid}").json()
    assert len(a["questions"]) == 3 and a["help"]["locked"] and "key" not in str(a)
    for q in a["questions"]:
        steps = [student.post(f"/api/assignments/{aid}/questions/{q['id']}/hint").json() for _ in range(3)]
        assert [s["step"] for s in steps] == [1, 2, 3] and all(s["text"] for s in steps)
        assert student.post(f"/api/assignments/{aid}/questions/{q['id']}/hint").json()["exhausted"] is True


@pytest.mark.parametrize("aid", ASSIGNMENTS)
def test_the_answer_key_accepts_the_answer_and_names_the_common_mistake(student, aid):
    from umanah_api.tutor.answers import check
    for q in assignment_pack(aid)["questions"]:
        key = q["key"]
        right = " ".join(key["value"]) if key["kind"] == "sequence" else (key["value"][0] if key["kind"] == "text" else str(key["value"]))
        assert check(key["kind"], key, q["misconceptions"], right)[0] is True
        for m in q["misconceptions"]:
            ok, tag, note = check(key["kind"], key, q["misconceptions"], " ".join(map(str, m["match"])))
            assert ok is False and tag == m["tag"] and note


def test_the_hint_ladder_never_states_the_answer():
    import re
    for aid in ASSIGNMENTS:
        for q in assignment_pack(aid)["questions"]:
            if q["key"]["kind"] == "number":
                v = str(int(q["key"]["value"]))
                for h in q["hints"][:2]:                       # the third rung is a worked example with different numbers
                    assert not re.search(rf"(?<![\d.]){v}(?![\d.])", h) or v in re.sub(r"\D", "", q.get("code") or ""), (aid, q["id"], h)


def test_new_assignments_are_on_the_class_and_lessons_are_ready(student, teacher):
    titles = [a["title"] for a in student.get("/api/assignments").json()["assignments"]]
    assert {"Loops Practice", "Lists Practice", "While Loops Practice", "What is AI? Practice"} <= set(titles)
    ready = [l["id"] for c in student.get("/api/courses").json()["courses"] for l in c["lessons"] if l["available"]]
    assert set(LESSONS) | {"py-l6"} == set(ready)
