"""Build projects (K-12): science experiments and engineering challenges on School Library simulations, robot missions, and
AI projects that open in Python Lab. The catalog is content/build/projects.json; students see their band's projects."""
from __future__ import annotations

import json
from functools import lru_cache

from fastapi import APIRouter, Depends

from ..config import get_settings
from ..deps import Ctx, current
from ..grades import content_bands

router = APIRouter(prefix="/api/build", tags=["build"])
KINDS = ("science", "engineering", "robotics", "ai")


@lru_cache(maxsize=1)
def catalog() -> dict:
    root = get_settings().content_dir / "build"
    d = json.loads((root / "projects.json").read_text())
    for p in d.get("ai", []):
        p["code"] = (root / p["file"]).read_text()
    return {k: d.get(k, []) for k in KINDS}


@router.get("/projects")
def projects(ctx: Ctx = Depends(current)):
    """Students get their band's projects (no grade set: the middle-school ones); staff see every project."""
    bands = content_bands(ctx.user.grade, ctx.user.extra_bands) if ctx.user.role == "student" else None
    return {k: [{key: v for key, v in p.items() if key != "file"} for p in items if bands is None or set(bands) & set(p["bands"])] for k, items in catalog().items()}
