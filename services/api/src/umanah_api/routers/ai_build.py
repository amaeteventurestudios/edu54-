"""EDU54 Workbench (docs/edu54-build): the catalog for the /ai-build page and each learner's finished lessons. The lesson
pages (static, same origin) call GET and POST /api/ai-build/progress with the learner's LabOS session cookie, so progress
lives on their LabOS account and the lessons never show a sign-in form of their own."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from .. import ai_build
from ..db import get_db
from ..deps import Ctx, current, err
from ..models import AiBuildProgress
from ..xp import touch_activity

router = APIRouter(prefix="/api/ai-build", tags=["ai-build"])


@router.get("/catalog")
def catalog(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    c = ai_build.catalog()
    return {**c, "done": ai_build.done(db, ctx.user.id)}


@router.get("/progress")
def progress(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    d = ai_build.done(db, ctx.user.id)
    return {"name": ctx.user.display_name, "lessons": d, "tracks": ai_build.tracks(d), "total": ai_build.catalog()["lessons_live"]}


class DoneIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lesson: str = Field(min_length=1, max_length=80)


@router.post("/progress")
def lesson_done(body: DoneIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    if body.lesson not in ai_build.slugs():
        raise err(404, "not_found", "That lesson isn't on this device.")
    new = db.get(AiBuildProgress, (ctx.user.id, body.lesson)) is None
    if new:
        db.add(AiBuildProgress(user_id=ctx.user.id, lesson=body.lesson))
        touch_activity(db, ctx.user.id)
        db.commit()
    return {"saved": True, "new": new, "done": len(ai_build.done(db, ctx.user.id))}
