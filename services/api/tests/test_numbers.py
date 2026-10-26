import json
from pathlib import Path

import pytest

from tests.conftest import login
from umanah_api.tutor import numbers


@pytest.mark.parametrize("msg,expected", [
    ("What is 17 x 23?", "17 x 23 = 391"), ("What is 17 x 23.", "17 x 23 = 391"), ("12 times 3", "12 times 3 = 36"), ("20 + 30 - 5", "20 + 30 - 5 = 45"),
    ("What is 15% of 80?", "15% of 80 = 12"), ("(3 + 4) * 5", "(3 + 4) * 5 = 35"), ("12,000 / 5", "12,000 / 5 = 2,400"), ("2 ^ 10", "2 ^ 10 = 1,024"),
    ("3/4 + 1/6", "3/4 + 1/6 = 0.916667 (exactly 11/12)"), ("the square root of 144", "the square root of 144 = 12"),
    ("convert 5 miles to km", "5 miles = 8.04672 km"), ("how many minutes in 3.5 hours", "3.5 hours = 210 minutes"), ("98.6 f to c", "98.6 degrees Fahrenheit = 37 degrees Celsius"),
])
def test_solver(msg, expected):
    assert expected in numbers.solve(msg)


def test_solver_leaves_dates_and_plain_numbers_alone():
    assert numbers.solve("the year 2024-05-06 was fine") == []
    assert numbers.solve("I am 13 years old") == []


def test_solver_is_a_calculator_not_an_interpreter():
    for evil in ("__import__('os').system('id')", "9**9**9**9", "1/0", "open('x')"):
        assert numbers.solve(evil) == [] or all("=" in l for l in numbers.solve(evil))
    with pytest.raises((ValueError, SyntaxError)):
        numbers.compute("__import__('os')")


def test_moon_earth_numbers():
    lines = " ".join(numbers.solve("How many Earths fit between the Earth and the Moon?"))
    assert "30.2 times the diameter of Earth" in lines and "3.67 times the diameter of the Moon" in lines
    assert "Sun" not in lines
    assert "109 times" in " ".join(numbers.solve("how many times wider is the Sun than the Earth"))


def test_verify_fixes_wrong_equations_and_the_million_times_claim():
    text, notes = numbers.verify("So 12 x 3 = 37.")
    assert text == "So 12 x 3 = 36." and notes
    assert numbers.verify("So 12 x 3 = 36.")[1] == []
    assert numbers.verify("2.5 x 4 = 10.0.")[1] == []                     # same value, different spelling
    bad, notes = numbers.verify("The Moon is about 1.3 million times the width of the Earth. It is far away.")
    assert notes and "million" not in bad and "times" in bad
    ok, notes = numbers.verify("The Moon is about 30 times the width of the Earth away from us.")
    assert notes == []


def test_facts_eval_set_is_big_enough_and_includes_the_moon_case():
    rows = [json.loads(l) for l in (Path(__file__).parents[1] / "evals/sets/facts.jsonl").read_text().splitlines()]
    assert len(rows) >= 40 and any("1.3 million" in r["question"] for r in rows)


def _chat(client, message, context=None):
    r = client.post("/api/ai/chat", json={"message": message, "context": context or {}})
    return [json.loads(l[6:]) for l in r.text.splitlines() if l.startswith("data: ")]


def test_the_prompt_carries_verified_numbers_outside_homework(app, stub):
    c = login(app, "jordan")
    _chat(c, "how many earths fit between the earth and the moon")
    system = stub.calls[-1]["messages"][0]["content"]
    assert "Verified numbers" in system and "30.2 times the diameter of Earth" in system


def test_homework_mode_never_gets_the_students_calculation_done(app, stub):
    c = login(app, "jordan")
    _chat(c, "what is 17 x 23", {"type": "assignment", "id": "asg-loops-practice", "question_id": "asg-loops-practice:q1"})
    assert "Verified numbers" not in stub.calls[-1]["messages"][0]["content"]


def test_a_wrong_number_from_the_model_is_replaced_before_the_student_sees_it(app, stub):
    c = login(app, "jordan")
    stub.next_reply = "The Moon is 1.3 million times the width of the Earth. It looks small from here."
    ev = _chat(c, "how far is the moon")
    rep = [e for e in ev if e["type"] == "replace"]
    assert rep and rep[0]["reason"] == "numbers" and "million" not in rep[0]["text"]
