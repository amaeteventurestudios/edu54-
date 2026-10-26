"""Local Documents (docs/13): a school's own handouts, readings and teacher notes, uploaded by staff and stored on this device.
Students see the ones shared with students; staff see all. Files never leave the box.

Upload is the raw file as the request body (no form parsing): POST /api/documents?title=...&filename=...&audience=students
with the file's Content-Type."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import Ctx, current, err
from ..models import Document, User
from ..people import audit
from ..permissions import perms_for

router = APIRouter(prefix="/api/documents", tags=["documents"])
TYPES = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "text/plain": "txt", "application/epub+zip": "epub"}
MAX_BYTES = 25 * 1024 * 1024


def _dir():
    d = get_settings().data_dir / "documents"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _staff(ctx: Ctx) -> bool:
    held = perms_for(ctx.user)
    return "teaching" in held or "admin.access" in held


def _json(d: Document, who: str | None = None) -> dict:
    return {"id": d.id, "title": d.title, "filename": d.filename, "type": TYPES.get(d.mime, "file"), "size": d.size, "audience": d.audience,
            "uploaded_by": who, "created_at": d.created_at.isoformat(), "url": f"/api/documents/{d.id}/file"}


@router.get("")
def list_documents(ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    q = select(Document, User.display_name).join(User, User.id == Document.uploaded_by_id).where(Document.school_id == ctx.user.school_id)
    if not _staff(ctx):
        q = q.where(Document.audience == "students")
    from ..db import using_visitor_database
    demo = get_settings().demo_mode or using_visitor_database()
    return {"documents": [_json(d, who) for d, who in db.execute(q.order_by(Document.created_at.desc()))], "can_upload": _staff(ctx) and not demo, "demo": demo}


@router.post("", status_code=201)
async def upload(request: Request, title: str = Query(min_length=1, max_length=160), filename: str = Query(min_length=1, max_length=200),
                 audience: str = Query(default="students", pattern="^(students|staff)$"), ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    if not _staff(ctx):
        raise err(403, "policy_denied", "Only teachers and admins can add documents.")
    from ..db import using_visitor_database
    if get_settings().demo_mode or using_visitor_database():      # a public demo must not become a place to host files
        raise err(403, "policy_denied", "Adding documents is turned off in the demo. On a school's own device, teachers can add PDFs here.")
    mime = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    if mime not in TYPES:
        raise err(400, "invalid", "Add a PDF, a picture (PNG or JPG), a text file or an EPUB book.")
    body = bytearray()
    async for chunk in request.stream():
        body += chunk
        if len(body) > MAX_BYTES:
            raise err(413, "invalid", "That file is over 25 MB.")
    if not body:
        raise err(400, "invalid", "That file is empty.")
    if mime == "application/pdf" and not body.startswith(b"%PDF"):
        raise err(400, "invalid", "That file doesn't look like a PDF.")
    d = Document(school_id=ctx.user.school_id, title=" ".join(title.split()), filename=re.sub(r"[^\w.\- ]", "_", filename)[:200], mime=mime, size=len(body),
                 audience=audience, uploaded_by_id=ctx.user.id)
    db.add(d)
    db.flush()
    (_dir() / f"{d.id}.{TYPES[mime]}").write_bytes(body)
    audit(db, ctx.user, "document.upload", f"document:{d.id}", f"{d.title} ({audience})")
    db.commit()
    return _json(d, ctx.user.display_name)


def _get(db: Session, ctx: Ctx, did: int) -> Document:
    d = db.get(Document, did)
    if not d or d.school_id != ctx.user.school_id or (d.audience == "staff" and not _staff(ctx)):
        raise err(404, "not_found", "That document isn't here.")
    return d


@router.get("/{did}/file")
def file(did: int, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    d = _get(db, ctx, did)
    return FileResponse(_dir() / f"{d.id}.{TYPES[d.mime]}", media_type=d.mime, filename=d.filename, content_disposition_type="inline",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600"})


@router.delete("/{did}", status_code=204)
def delete(did: int, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    d = _get(db, ctx, did)
    if not _staff(ctx):
        raise err(403, "policy_denied", "Only teachers and admins can remove documents.")
    (_dir() / f"{d.id}.{TYPES[d.mime]}").unlink(missing_ok=True)
    audit(db, ctx.user, "document.delete", f"document:{d.id}", d.title)
    db.delete(d)
    db.commit()
