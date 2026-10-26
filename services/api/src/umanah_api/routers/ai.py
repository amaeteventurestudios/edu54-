"""POST /api/ai/chat — the only way a student reaches a model (docs/20, 41, 42, 43). Replies stream as server-sent events."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..db import get_db
from datetime import UTC, datetime

from sqlalchemy import delete as delete_, func, or_, select

from ..deps import Ctx, current, err
from ..models import Conversation, Message
from ..tutor.adapters import get_adapter
from ..tutor.modes import resolve
from ..tutor.service import run_chat
from ..tutor.titles import make_title

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ContextIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str | None = Field(default=None, pattern="^(lesson|assignment|revision|project|experiment)$")
    id: str | None = Field(default=None, max_length=60)
    question_id: str | None = Field(default=None, max_length=60)
    # Discovery Lab: the experiment's current readings (checked and trimmed by discovery.clean_state, never trusted as text)
    state: dict[str, float | int | str | bool] | None = Field(default=None, max_length=40)


class ChatIn(BaseModel):
    # extra=forbid: a client that sends `mode`, `model` or anything else the server owns is rejected outright.
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=1200)
    context: ContextIn = Field(default_factory=ContextIn)
    conversation_id: int | None = None


@router.get("/mode")
def mode(context_type: str | None = None, context_id: str | None = None, question_id: str | None = None,
         ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """What the tutor will do here, for the locked badge. The client cannot change it."""
    m = resolve(db, ctx.user, context_type, context_id, question_id)
    return {"mode": m.mode, "badge": m.badge, "locked": m.locked, "teacher_can_see": m.teacher_visible,
            "notice": ("Your teacher can see chats linked to this assignment or lesson." if m.teacher_visible else
                       "Free chats are private to you, except messages that suggest someone may be in danger, which are shared with a trusted adult at your school.")}


@router.get("/status")
async def status(ctx: Ctx = Depends(current)):
    ok = await get_adapter().available()
    return {"ready": ok}


def _sse(events: AsyncIterator[dict]) -> AsyncIterator[bytes]:
    async def gen():
        try:
            async for ev in events:
                yield f"data: {json.dumps(ev)}\n\n".encode()
        finally:
            await events.aclose()
    return gen()


@router.post("/chat")
async def chat(body: ChatIn, request: Request, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    from .. import db as dbm, demosite
    from ..config import get_settings
    if dbm.using_visitor_database():        # the public demo: limits per visitor and per address (docs/46)
        st = get_settings()
        ip = demosite.client_ip({k.lower(): v for k, v in request.headers.items()}, request.client.host if request.client else None)
        if not demosite.hit("tutor", dbm.current_key() or "", st.demo_tutor_per_visitor_hour) or not demosite.hit("tutor-ip", ip, st.demo_tutor_per_ip_hour):
            raise err(429, "busy", f"The demo allows {st.demo_tutor_per_visitor_hour} tutor messages an hour so everyone gets a turn. Please try again later, or explore the rest of the demo.")
    m = resolve(db, ctx.user, body.context.type, body.context.id, body.context.question_id, body.context.state)
    uid = ctx.user.id
    db.close()
    return StreamingResponse(_sse(run_chat(uid, body.message, m, body.conversation_id)), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/conversations")
def conversations(q: str | None = None, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """The student's own chats, newest first, optionally filtered by a word in the title or the messages. Nobody else's are ever listed here."""
    query = select(Conversation).where(Conversation.user_id == ctx.user.id)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        in_msgs = select(Message.conversation_id).where(func.lower(Message.content).like(like))
        query = query.where(or_(func.lower(Conversation.title).like(like), Conversation.id.in_(in_msgs)))
    out = []
    for c in db.scalars(query.order_by(Conversation.id.desc()).limit(40)):
        first = db.scalar(select(Message.content).where(Message.conversation_id == c.id, Message.role == "user").order_by(Message.id))
        out.append({"id": c.id, "title": c.title or make_title(first or ""), "mode": c.mode, "created_at": c.created_at.isoformat(),
                    "deletable": c.mode not in ("homework", "assessment")})
    return {"conversations": out}


def _own(db: Session, ctx: Ctx, cid: int) -> Conversation:
    c = db.get(Conversation, cid)
    if not c or c.user_id != ctx.user.id:
        raise err(404, "not_found", "That chat isn't available.")
    return c


@router.get("/conversations/{cid}")
def conversation(cid: int, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    c = _own(db, ctx, cid)
    return {"id": c.id, "title": c.title, "mode": c.mode, "context_type": c.context_type, "context_id": c.context_id,
            "messages": [{"id": m.id, "role": m.role, "content": m.content, "citations": m.citations, "created_at": m.created_at.isoformat(),
                          "feedback": m.feedback, "safety": bool((m.safety_result or {}).get("fixed_response"))} for m in c.messages]}


class RenameIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=80)


@router.patch("/conversations/{cid}")
def rename(cid: int, body: RenameIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    c = _own(db, ctx, cid)
    c.title = " ".join(body.title.split())[:80]
    db.commit()
    return {"id": c.id, "title": c.title}


@router.delete("/conversations/{cid}", status_code=204)
def delete(cid: int, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Students can delete their own free and lesson chats. Chats made while doing an assignment stay with the assignment (docs/41)."""
    c = _own(db, ctx, cid)
    if c.mode in ("homework", "assessment"):
        raise err(403, "policy_denied", "Chats from an assignment stay with the assignment, so your teacher can see how you worked.")
    db.execute(delete_(Message).where(Message.conversation_id == c.id))
    db.delete(c)
    db.commit()


class FeedbackIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str | None = Field(default=None, pattern="^(up|down)$")


@router.post("/messages/{mid}/feedback")
def feedback(mid: int, body: FeedbackIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Thumbs up or down on a tutor answer. A thumbs down is shown to the class teacher as a flagged answer (docs/16, 17)."""
    m = db.get(Message, mid)
    c = db.get(Conversation, m.conversation_id) if m else None
    if not m or not c or c.user_id != ctx.user.id or m.role != "assistant":
        raise err(404, "not_found", "That answer isn't available.")
    m.feedback = body.value
    m.feedback_at = datetime.now(UTC) if body.value else None
    db.commit()
    return {"id": m.id, "feedback": m.feedback}
