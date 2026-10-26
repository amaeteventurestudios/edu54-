"""Content packs and policy files (content/). Curriculum lives in Git, learner data does not."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .config import get_settings


def _load(rel: str) -> dict[str, Any]:
    return json.loads((get_settings().content_dir / rel).read_text(encoding="utf-8"))


@lru_cache
def gamification() -> dict[str, Any]:
    return _load("policy/gamification.json")


@lru_cache
def lesson_pack(lesson_id: str) -> dict[str, Any] | None:
    for p in get_settings().content_dir.glob("*/lesson-*.json"):
        d = json.loads(p.read_text(encoding="utf-8"))
        if d["id"] == lesson_id:
            return d
    return None


@lru_cache
def assignment_pack(assignment_id: str) -> dict[str, Any] | None:
    for p in Path(get_settings().content_dir).glob("*/*.json"):
        d = json.loads(p.read_text(encoding="utf-8"))
        if d.get("id") == assignment_id and "questions" in d:
            return d
    return None


@lru_cache
def catalog() -> dict[str, Any]:
    return _load("catalog.json")


@lru_cache
def revision_pack(topic_id: str = "rev-py-loops") -> dict[str, Any]:
    return _load("revision/loops.json")
