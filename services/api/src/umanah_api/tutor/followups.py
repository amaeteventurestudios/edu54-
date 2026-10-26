"""Follow-up suggestions after a tutor reply (docs/16): 2 or 3 short, useful next steps chosen from what the reply contained.

Chosen by code, not by the model, so they are instant, cannot add anything unsafe, and respect the mode
(in homework the suggestions never ask the tutor for an answer).
"""
from __future__ import annotations

import re


def suggest(reply: str, mode: str) -> list[str]:
    if mode == "assessment":
        return []
    if mode == "homework":
        return ["Give me a hint", "Explain the concept", "Show me a similar example"]
    out: list[str] = []
    has_code = "```" in reply or re.search(r"`[^`]+\(.*\)`", reply) is not None
    has_math = bool(re.search(r"\d\s*[+\-×x*/÷=]\s*\d|\$[^$]+\$", reply))
    if has_code:
        out += ["Explain this code line by line", "Give me a bigger challenge"]
    elif has_math:
        out += ["Show me another example", "Quiz me on this"]
    else:
        out += ["Can you give me an example?", "Explain that more simply"]
    out.append("Quiz me on this" if "Quiz me on this" not in out else "Why does this matter?")
    if reply.rstrip().endswith("?"):
        out = ["I think I know. Let me try"] + out
    return out[:3]
