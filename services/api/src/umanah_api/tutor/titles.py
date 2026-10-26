"""Short, readable chat titles (docs/16). Deterministic: no model call, no delay, never echoes a sensitive message."""
from __future__ import annotations

import re

_LEAD = re.compile(r"^(hey|hi|hello|ok(ay)?|so|please|pls|can you|could you|would you|will you|i need help (with|understanding)|i want to (know|learn)|help me( to)?( with| understand)?|help with|tell me( about)?|explain to me|i (do not|don't|dont) (get|understand))\s+", re.I)


def make_title(message: str, limit: int = 44) -> str:
    t = re.sub(r"\s+", " ", message).strip().rstrip("?!. ").strip()
    for _ in range(3):
        t2 = _LEAD.sub("", t)
        if t2 == t:
            break
        t = t2
    t = re.sub(r"[`*_#>]+", "", t).strip()
    if not t:
        return "New chat"
    t = t[0].upper() + t[1:]
    if len(t) > limit:
        t = t[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return t


SUPPORT_TITLE = "Getting support"
