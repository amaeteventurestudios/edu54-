"""Rule 4 (docs/42): answer from approved lesson content, retrieved at request time, with citations."""
from __future__ import annotations

import re
from dataclasses import dataclass

from ..content import lesson_pack

_STOP = set("""a an the and or but if then so of to in on at for from by with about as is are was were be been being it its this that these
those i me my we our you your he she they them his her their do does did doing done can could will would should may might must
what why how when where which who whom whose tell explain please python code program lesson question questions help simply simple more again mean means meaning give show
example examples me us im ive dont doesnt cant wont lets let just really very much many some any one two get got go going""".split())

GENERIC_FOLLOWUPS = re.compile(r"^(explain|say|tell me|can you|could you|help me|i (don'?t|do not) (get|understand)|what does that mean|why|how so|again|simpler|more simply|make it simpler|give me an example|example|go on|continue|ok|okay|huh|what)\b", re.I)


def content_words(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9_]+", text.lower()) if w not in _STOP and len(w) > 1]


@dataclass
class Source:
    label: str          # "Lesson 6: Loops — What are loops?"
    text: str
    score: float


def lesson_sources(lesson_id: str | None, query: str, prior_user_msgs: list[str], k: int = 3) -> tuple[list[Source], bool]:
    """Returns (sources, covered). `covered` is False only when the question has real content words and none appear
    in the lesson — then the tutor must say so instead of guessing (docs/42 rule 4)."""
    pack = lesson_pack(lesson_id) if lesson_id else None
    if not pack:
        return [], True
    head = f"Lesson {pack['lesson_number']}: {pack['title']}"
    docs: list[Source] = [Source(f"{head} — {s['title']}", s["text"], 0) for s in pack["sections"]]
    for ex in pack.get("examples", []):
        docs.append(Source(f"{head} — {ex['title']}", f"{ex['code']}  (prints: {ex['output'].replace(chr(10), ', ')})", 0))
    words = set(content_words(query))
    if re.search(r"\w\[-?\d+\]", query):                    # code like colors[2] is a question about list indexing, whatever the list is called
        words |= {"index", "item", "list"}
    generic = not words or bool(GENERIC_FOLLOWUPS.match(query.strip())) and len(words) <= 2
    if generic and prior_user_msgs:
        words |= set(content_words(" ".join(prior_user_msgs[-2:])))
    for d in docs:
        dw = set(content_words(d.label + " " + d.text))
        d.score = len(words & dw) + 0.5 * len(words & set(content_words(d.label)))
    ranked = sorted(docs, key=lambda d: d.score, reverse=True)
    if ranked and ranked[0].score > 0:
        return [d for d in ranked[:k] if d.score > 0], True
    if generic or not words:
        return docs[:2], True                   # follow-ups like "explain this more simply" use the lesson's opening
    return [], False
