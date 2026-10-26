"""Lab Status (docs/24): plain-language health for teachers and admins; never a single red/green light."""
from __future__ import annotations

import shutil
import socket

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import __version__
from ..config import get_settings
from ..db import get_db
from ..deps import Ctx, current
from .. import branding, engines
from ..tutor.adapters import get_adapter

router = APIRouter(prefix="/api/system", tags=["system"])


def _internet() -> bool:
    try:
        socket.create_connection(("1.1.1.1", 53), timeout=0.8).close()
        return True
    except OSError:
        return False


@router.get("/status")
async def status(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    s = get_settings()
    ai = await get_adapter().available()
    try:
        db.execute(text("select 1"))
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    try:
        du = shutil.disk_usage(s.data_dir if s.data_dir.exists() else "/")
        storage = {"state": "healthy" if du.free / du.total > 0.15 else "degraded", "free_gb": round(du.free / 1e9, 1), "total_gb": round(du.total / 1e9, 1)}
    except OSError:
        storage = {"state": "unknown", "free_gb": None, "total_gb": None}
    items = [
        {"id": "ai", "label": "Local AI", "state": "ready" if ai else "unavailable", "text": "Ready" if ai else "Not available right now"},
        {"id": "internet", "label": "Internet", "state": "optional", "text": "Optional"},
        {"id": "learning", "label": "Learning services", "state": "ready" if db_ok else "unavailable", "text": "Available" if db_ok else "Not available"},
    ]
    if ctx.user.role != "student":
        items += [
            {"id": "storage", "label": "Storage", "state": storage["state"], "text": f"{storage['free_gb']} GB free" if storage["free_gb"] is not None else "Unknown"},
            {"id": "connection", "label": branding.brand()["supportLabel"], "state": "off", "text": "Off (support access is opt-in)"},
            {"id": "version", "label": "Software version", "state": "info", "text": __version__},
            *await engines.check_all(s.engines),
        ]
        if s.status_note:
            items.append({"id": "note", "label": "About this device", "state": "info", "text": s.status_note})
    return {"items": items, "internet_connected": _internet() if ctx.user.role != "student" else None}
