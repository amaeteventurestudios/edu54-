"""Safety Alerts — visible only to designated safety contacts, on the school network (docs/41)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import Ctx, err, require_safety_contact
from ..models import AuditLog, SafetyAlert, SafetyEvent, User

router = APIRouter(prefix="/api/safety", tags=["safety"])

LABEL = {"self_harm": "Self-harm or suicide", "abuse_disclosure": "Abuse or neglect", "violence_threat": "Threat of violence",
         "medical_emergency": "Medical emergency", "sexual_minor": "Sexual content involving minors", "sexual": "Sexual content",
         "dangerous": "Dangerous instructions", "hate_harassment": "Hate or harassment", "personal_info": "Personal information", "distress": "Distress"}


def _row(db: Session, a: SafetyAlert, detail: bool) -> dict:
    ev = db.get(SafetyEvent, a.event_id)
    st = db.get(User, a.student_id)
    out = {"id": a.id, "student": st.display_name if st else "Unknown", "category": ev.category, "category_label": LABEL.get(ev.category, ev.category),
           "severity": ev.severity, "status": a.status, "created_at": a.created_at.isoformat()}
    if detail:
        ack = db.get(User, a.acknowledged_by_id) if a.acknowledged_by_id else None
        out |= {"message": a.excerpt, "reply": a.reply, "notes": a.notes, "acknowledged_by": ack.display_name if ack else None}
    return out


@router.get("/alerts")
def alerts(ctx: Ctx = Depends(require_safety_contact), db: Session = Depends(get_db)):
    rows = db.scalars(select(SafetyAlert).where(SafetyAlert.school_id == ctx.user.school_id).order_by(SafetyAlert.id.desc())).all()
    return {"alerts": [_row(db, a, False) for a in rows], "new_count": sum(1 for a in rows if a.status == "new")}


@router.get("/alerts/{aid}")
def alert(aid: int, ctx: Ctx = Depends(require_safety_contact), db: Session = Depends(get_db)):
    a = db.get(SafetyAlert, aid)
    if not a or a.school_id != ctx.user.school_id:
        raise err(404, "not_found", "Alert not found.")
    db.add(AuditLog(actor_id=ctx.user.id, action="safety.alert.view", target=f"alert:{aid}"))
    db.commit()
    return _row(db, a, True)


class AckIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    notes: str = Field(default="", max_length=2000)
    status: str = Field(default="acknowledged", pattern="^(acknowledged|closed)$")


@router.post("/alerts/{aid}/acknowledge")
def acknowledge(aid: int, body: AckIn, ctx: Ctx = Depends(require_safety_contact), db: Session = Depends(get_db)):
    a = db.get(SafetyAlert, aid)
    if not a or a.school_id != ctx.user.school_id:
        raise err(404, "not_found", "Alert not found.")
    a.status, a.acknowledged_by_id = body.status, ctx.user.id
    if body.notes:
        a.notes = ((a.notes + "\n") if a.notes else "") + body.notes
    db.add(AuditLog(actor_id=ctx.user.id, action=f"safety.alert.{body.status}", target=f"alert:{aid}"))
    db.commit()
    return _row(db, a, True)
