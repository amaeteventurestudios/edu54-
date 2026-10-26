"""House style for tutor replies, applied in code after generation (docs/16, 42): the prompt asks, this guarantees.

  - no em dashes or spaced en dashes (a comma or a full stop reads better for a student)
  - no emoji unless the school turned them on, and never in homework or assessment
Code (fenced blocks and `inline code`) is never touched.
"""
from __future__ import annotations

import re

_EMOJI = re.compile("[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF☀-➿⬀-⯿←-⇿⌀-⏿️‍⃣]")
_CODE = re.compile(r"(`[^`\n]+`)")


def _prose(t: str, allow_emoji: bool) -> str:
    t = re.sub(r"\s*—\s*", ", ", t)                       # em dash
    t = re.sub(r"\s+–\s+|\s+--\s+", ", ", t)               # spaced en dash or double hyphen used as a dash
    t = re.sub(r"(?<=\w)–(?=[A-Za-z])", ", ", t)           # word–word
    if not allow_emoji:
        t = _EMOJI.sub("", t)
    t = re.sub(r"(?<=\S) {2,}", " ", t)                          # what removing an emoji leaves behind
    t = re.sub(r",\s*,", ",", t)
    t = re.sub(r"\s+,", ",", t)
    t = re.sub(r",\s*([.!?:;])", r"\1", t)
    t = re.sub(r"^,\s*", "", t)                                 # a dash that opened the text
    return t


class StyleFilter:
    """Streaming version: feed pieces in order; fenced code blocks that span pieces are left alone."""

    def __init__(self, allow_emoji: bool = False):
        self.allow_emoji, self.in_fence = allow_emoji, False

    def feed(self, piece: str) -> str:
        out = []
        for i, part in enumerate(piece.split("```")):
            if i > 0:
                self.in_fence = not self.in_fence
                out.append("```")
            if self.in_fence:
                out.append(part)
            else:
                out.append("".join(seg if j % 2 else _prose(seg, self.allow_emoji) for j, seg in enumerate(_CODE.split(part))))
        return "".join(out)


def clean(text: str, allow_emoji: bool = False) -> str:
    return StyleFilter(allow_emoji).feed(text)
