"""EDU54 Workbench (docs/edu54-build): the 3D AI lessons. The lessons themselves are static pages served at
/ai-build/lessons/<slug>/ (copied in by tools/content/sync-edu54-build.sh); this module reads their catalog,
content/edu54-build/catalog.json, which the same script writes, and works out finished tracks for certificates."""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AiBuildProgress


@lru_cache(maxsize=1)
def catalog() -> dict[str, Any]:
    f = get_settings().content_dir / "edu54-build" / "catalog.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"name": "EDU54 Workbench", "lessons_live": 0, "tracks": [], "lessons": []}


@lru_cache(maxsize=1)
def slugs() -> frozenset[str]:
    return frozenset(lesson["slug"] for lesson in catalog()["lessons"])


def done(db: Session, user_id: int) -> list[str]:
    """The learner's finished lessons that are still in the catalog, oldest first."""
    have = slugs()
    return [s for s in db.scalars(select(AiBuildProgress.lesson).where(AiBuildProgress.user_id == user_id).order_by(AiBuildProgress.done_at))
            if s in have]


def done_dates(db: Session, user_id: int) -> dict[str, str]:
    have = slugs()
    return {r.lesson: r.done_at.date().isoformat() for r in db.scalars(select(AiBuildProgress).where(AiBuildProgress.user_id == user_id)) if r.lesson in have}


def tracks(done_slugs: list[str] | set[str], dates: dict[str, str] | None = None) -> list[dict[str, Any]]:
    """Each track with how many of its lessons are done. A track earns its certificate once it is fully built (as many live
    lessons as its size) and every one of them is done, the same rule as the lessons' own Progress panel."""
    d = set(done_slugs)
    out = []
    for t in catalog()["tracks"]:
        ls = [lesson["slug"] for lesson in catalog()["lessons"] if lesson["track"] == t["n"]]
        k = sum(1 for s in ls if s in d)
        certified = bool(t["size"]) and len(ls) >= t["size"] and k == len(ls)
        out.append({"n": t["n"], "slug": t["slug"], "title": t["title"], "group": t.get("group", "clay"), "size": t["size"] or len(ls),
                    "live": len(ls), "done": k, "certified": certified,
                    "completed_on": max((dates or {}).get(s, "") for s in ls) or None if certified and dates else None})
    return out


def summary(db: Session, user_id: int) -> dict[str, Any]:
    d = done(db, user_id)
    return {"done": len(d), "total": catalog()["lessons_live"], "tracks": tracks(d, done_dates(db, user_id))}
