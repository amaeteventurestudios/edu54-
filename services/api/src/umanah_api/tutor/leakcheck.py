"""Rule 6 (docs/42): answer-leak check for Homework and Assessment replies.

If a reply contains the key's final answer, or a complete solution to the assessed item, it is not shown — the
server serves the next pre-written hint instead. Keys are read here, on the server, and never put into a prompt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .answers import _WORDS


@dataclass
class KeyedQuestion:
    id: str
    prompt: str
    code: str | None
    kind: str
    key: dict


_EXPLICIT = r"(?:answer|result|output|total|prints?|printed|outputs?|runs?|equals?|is|=|gives?|gets?|comes? (?:out )?to|ends? (?:up )?(?:as|at|with)|would be|will be|be|makes?)"
_NUMWORD = {v: k for k, v in _WORDS.items()}


def _num_forms(v: float) -> list[str]:
    n = int(v) if float(v).is_integer() else v
    forms = [re.escape(str(n))]
    if isinstance(n, int) and n in _NUMWORD:
        forms.append(_NUMWORD[n])
    return forms


def _seq_pattern(vals: list[str]) -> re.Pattern:
    sep = r"(?:\s*(?:,|;|->|→|and|then|\n|\s)\s*(?:and\s+)?)"
    return re.compile(r"(?<![\w.])" + sep.join(re.escape(v) for v in vals) + r"(?![\w])", re.I)


def leaks(reply: str, questions: list[KeyedQuestion], active_qid: str | None, student_message: str = "") -> KeyedQuestion | None:
    """The first question whose answer `reply` gives away, or None."""
    low = reply.lower()
    for q in questions:
        k = q.key
        if k["kind"] == "sequence":
            vals = [str(x) for x in k["value"]]
            if _seq_pattern(vals).search(reply):
                return q
            # newline-separated output listing is the classic 'print' leak
            if all(re.search(rf"(?m)^\s*{re.escape(v)}\s*$", reply) for v in vals):
                return q
            continue
        if k["kind"] == "number":
            forms = "|".join(_num_forms(k["value"]))
            # 'the answer is 5', 'total = 12', 'it runs 5 times', 'prints 12'
            if re.search(rf"\b{_EXPLICIT}\s*(?:exactly|just|only|about)?\s*(?:{forms})\b(?!\s*(?:\)|,\s*\d))", low):
                return q
            if re.search(rf"\b(?:{forms})\s+(?:times|turns|loops|iterations|values|numbers)\b", low) and q.id == active_qid:
                return q
            if q.id == active_qid:
                # a bare, standalone final number when this is the question being asked about
                allowed = set(re.findall(r"\d+", (q.prompt or "") + " " + (q.code or "") + " " + student_message))
                for f in forms.split("|"):
                    if f.isdigit() and f in allowed:
                        continue
                    if re.search(rf"(?<![\w.(\[,])\b{f}\b(?![\w)\],])", low):
                        return q
            continue
        # free-text keys: the exact accepted string
        vals = k["value"] if isinstance(k["value"], list) else [k["value"]]
        for v in vals:
            if len(str(v)) >= 4 and re.search(rf"\b{re.escape(str(v).lower())}\b", low):
                return q
    return None
