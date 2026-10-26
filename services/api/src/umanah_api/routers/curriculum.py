"""K-12 curriculum map (content/curriculum/k12.json): for each grade, the School Library folders that make up the year's
courses, plus Umanah's own courses for the band. Students get their own grade; staff can look at any grade."""
from __future__ import annotations

import json
from functools import lru_cache

from fastapi import APIRouter, Depends, Query

from ..config import get_settings
from ..deps import Ctx, current
from ..grades import band_of, grade_label

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])
OWN = [  # Umanah's own courses and the bands they serve (same as the web app's COURSE_BANDS)
    ("ai-foundations", "AI Foundations", ["explore", "build", "launch"]),
    ("python-foundations", "Python Foundations", ["build", "launch"]),
    ("science-engineering", "Science & Engineering", ["explore", "build", "launch"]),
]


@lru_cache(maxsize=1)
def k12() -> dict[int, list[dict]]:
    """The brand's own map when it has one (k12.edu54.json: only content EDU54 may resell), else the AI Lab's."""
    folder, brand = get_settings().content_dir / "curriculum", get_settings().brand
    f = folder / f"k12.{brand}.json" if brand not in ("", "umanah") and (folder / f"k12.{brand}.json").exists() else folder / "k12.json"
    d = json.loads(f.read_text())
    return {int(k): v for k, v in d["grades"].items()}


def for_grade(g: int) -> dict:
    band = band_of(g)
    return {"grade": g, "grade_label": grade_label(g), "subjects": k12().get(g, []),
            "umanah_courses": [{"id": cid, "title": t} for cid, t, bands in OWN if band in bands]}


@router.get("/k12")
def k12_map(grade: int | None = Query(default=None, ge=0, le=12), ctx: Ctx = Depends(current)):
    if ctx.user.role == "student":
        g = ctx.user.grade if ctx.user.grade is not None else 7
        return {"grades": [for_grade(g)]}
    return {"grades": [for_grade(grade)] if grade is not None else [for_grade(g) for g in range(13)]}
