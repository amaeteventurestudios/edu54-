"""Answer checking by code, not by the model (docs/42 rules 2 and 5)."""
from __future__ import annotations

import re

_NUM = re.compile(r"-?\d+(?:\.\d+)?")
_WORDS = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
          "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
          "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20}


def parse_number(text: str) -> float | None:
    t = text.strip().lower()
    if m := _NUM.search(t):
        return float(m.group(0))
    for w, n in _WORDS.items():
        if re.search(rf"\b{w}\b", t):
            return float(n)
    return None


def tokens(text: str) -> list[str]:
    return [t for t in re.split(r"[^0-9A-Za-z.\-]+", text.strip()) if t]


def check(kind: str, key: dict, misconceptions: list[dict], response: str) -> tuple[bool, str | None, str | None]:
    """Returns (correct, misconception_tag, misconception_note). Never returns the key."""
    response = (response or "").strip()
    if not response:
        return False, None, None
    if kind == "number":
        got = parse_number(response)
        want = float(key["value"])
        tol = float(key.get("tolerance", 0))
        ok = got is not None and abs(got - want) <= tol
        if not ok and got is not None:
            for m in misconceptions:
                if any(abs(got - float(x)) < 1e-9 for x in m.get("match", [])):
                    return False, m["tag"], m.get("note")
        return ok, None, None
    if kind == "sequence":
        got = tokens(response)
        ok = got == [str(x) for x in key["value"]]
        if not ok:
            for m in misconceptions:
                if got == [str(x) for x in m.get("match", [])]:
                    return False, m["tag"], m.get("note")
        return ok, None, None
    # text: any accepted string, case/space-insensitive
    accepted = key["value"] if isinstance(key["value"], list) else [key["value"]]
    norm = lambda s: re.sub(r"\s+", " ", str(s).strip().lower())  # noqa: E731
    return norm(response) in {norm(a) for a in accepted}, None, None
