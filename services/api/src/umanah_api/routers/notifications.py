"""The bell: short notices such as 'Loops Practice was graded'. Each person sees only their own."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import Ctx, current
from ..models import Notification, now

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def mine(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == ctx.user.id).order_by(Notification.id.desc()).limit(20)).all()
    unread = db.scalar(select(func.count()).select_from(Notification).where(Notification.user_id == ctx.user.id, Notification.read_at.is_(None))) or 0
    return {"unread": unread, "items": [{"id": n.id, "title": n.title, "body": n.body, "link": n.link, "read": n.read_at is not None, "at": n.created_at.isoformat()} for n in rows]}


class ReadIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[int] | None = None


@router.post("/read")
def mark_read(body: ReadIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    q = update(Notification).where(Notification.user_id == ctx.user.id, Notification.read_at.is_(None)).values(read_at=now())
    if body.ids:
        q = q.where(Notification.id.in_(body.ids))
    db.execute(q)
    db.commit()
    return {"ok": True}
