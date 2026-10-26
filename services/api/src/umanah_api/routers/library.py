"""School Library (docs/13, 47): browse the offline course channels (Khan Academy, storybooks, simulations, videos) inside
Umanah. Channel data comes from the content library engine; files are read from its folder on this device. Nothing leaves
the machine, and students never see the engine's own screens.

Interactive apps (simulations, games) run in a sandboxed frame with no access to Umanah's cookies, so their files are
served by a short-lived signed link instead of the sign-in cookie.
"""
from __future__ import annotations

import hashlib
import hmac
import mimetypes
import re
import secrets
import time
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, Response

from .. import engines
from ..config import get_settings
from ..deps import Ctx, current, err

router = APIRouter(prefix="/api/library", tags=["library"])

FILE = re.compile(r"^[0-9a-f]{32}\.[a-z0-9]{2,8}$")
NODE = re.compile(r"^[0-9a-f]{32}$")
LINK_SECONDS = 6 * 3600
# the frame for interactive apps: its own opaque origin (no cookies, no Umanah storage), no network beyond this box
APP_CSP = ("sandbox allow-scripts allow-popups allow-forms allow-modals allow-pointer-lock; default-src 'self' data: blob:; "
           "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
           "media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'")
PLAYABLE = {"video", "audio", "html5", "document"}


def _kolibri() -> engines.KolibriContentAdapter | None:
    return next((a for a in engines.parse(get_settings().engines) if isinstance(a, engines.KolibriContentAdapter)), None)


def _secret() -> bytes:
    f = get_settings().data_dir / ".library-secret"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(secrets.token_hex(32))
        f.chmod(0o600)
    return f.read_text().strip().encode()


def app_link(name: str, now: float | None = None) -> str:
    exp = int((now or time.time()) + LINK_SECONDS)
    sig = hmac.new(_secret(), f"{name}:{exp}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"/api/library/app/{exp}.{sig}/{name}/index.html"


def _storage(name: str) -> Path:
    root = get_settings().library_content_dir
    if root is None or not FILE.match(name):
        raise err(404, "not_found", "That item isn't in the library.")
    f = root / "storage" / name[0] / name[1] / name
    if not f.is_file():
        raise err(404, "not_found", "That item isn't in the library.")
    return f


def _main_file(n: dict) -> dict | None:
    """The file that shows the item: the lowest-resolution video (a school network carries many at once), the app, the book."""
    files = [f for f in n.get("files") or [] if f.get("available", True) and not (f.get("preset") or "").endswith("thumbnail")
             and (f.get("preset") or "") not in ("video_subtitle", "vector_video")]
    rank = {"low_res_video": 0, "high_res_video": 1, "audio": 0, "html5_zip": 0, "document": 0, "epub": 1}
    files.sort(key=lambda f: rank.get(f.get("preset") or "", 5))
    return files[0] if files else None


def _thumb(n: dict) -> str | None:
    f = next((f for f in n.get("files") or [] if (f.get("preset") or "").endswith("thumbnail")), None)
    return f"/api/library/file/{f['checksum']}.{f['extension']}" if f and f.get("checksum") else None


def _item(n: dict) -> dict:
    kind = n.get("kind")
    out = {"id": n["id"], "title": n.get("title") or "", "kind": kind, "description": (n.get("description") or "")[:600],
           "thumbnail": _thumb(n), "license": n.get("license_name") or None, "author": n.get("license_owner") or n.get("author") or None,
           "count": n.get("on_device_resources")}
    f = _main_file(n) if kind in PLAYABLE else None
    if f and f.get("checksum"):
        name = f"{f['checksum']}.{f['extension']}"
        out["url"] = app_link(name) if kind == "html5" else f"/api/library/file/{name}"
        out["format"] = f["extension"]
    subs = [s for s in n.get("files") or [] if s.get("preset") == "video_subtitle" and s.get("checksum") and (s.get("lang") or {}).get("id", "en").startswith("en")]
    if subs:
        out["captions"] = f"/api/library/file/{subs[0]['checksum']}.{subs[0]['extension']}"
    return out


@router.get("/channels")
async def channels(ctx: Ctx = Depends(current)):
    k = _kolibri()
    if k is None:
        return {"channels": [], "unavailable": True}
    try:
        chs = await k.channels()
    except Exception:  # noqa: BLE001 - the library is stopped or busy: say so plainly
        return {"channels": [], "unavailable": True}
    return {"channels": [{"id": c["id"], "title": c.get("name") or "", "description": (c.get("description") or "")[:400],
                          "thumbnail": c.get("thumbnail") or None} for c in chs]}


@router.get("/nodes/{node_id}")
async def node(node_id: str, ctx: Ctx = Depends(current)):
    k = _kolibri()
    if k is None or not NODE.match(node_id):
        raise err(404, "not_found", "That item isn't in the library.")
    try:
        n = await k.node(node_id)
        kids = await k.children(node_id) if n.get("kind") == "topic" else []
    except Exception:  # noqa: BLE001
        raise err(404, "not_found", "That item isn't in the library.") from None
    if ctx.user.role == "student":        # teacher guides stay with teachers
        if n.get("coach_content"):
            raise err(404, "not_found", "That item isn't in the library.")
        kids = [c for c in kids if not c.get("coach_content")]
    trail = [{"id": a["id"], "title": a.get("title") or ""} for a in n.get("ancestors") or []]
    return {"node": _item(n), "trail": trail, "children": [_item(c) for c in kids]}


@router.get("/file/{name}")
def file(name: str, ctx: Ctx = Depends(current)):
    """Videos, captions, pictures and books (with seeking: the browser asks for byte ranges)."""
    f = _storage(name)
    return FileResponse(f, media_type=mimetypes.guess_type(name)[0] or "application/octet-stream",
                        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})


@router.get("/app/{token}/{name}/{path:path}")
def app_file(token: str, name: str, path: str):
    """One file from inside an interactive app. No sign-in cookie reaches the sandboxed frame, so the link is signed."""
    exp, _, sig = token.partition(".")
    good = hmac.new(_secret(), f"{name}:{exp}".encode(), hashlib.sha256).hexdigest()[:32]
    if not exp.isdigit() or int(exp) < time.time() or not hmac.compare_digest(sig, good) or not name.endswith(".zip"):
        raise err(404, "not_found", "That item isn't in the library.")
    z = zipfile.ZipFile(_storage(name))
    path = path or "index.html"
    try:
        data = z.read(path)
    except KeyError:
        raise err(404, "not_found", "That file isn't in this app.") from None
    return Response(data, media_type=mimetypes.guess_type(path)[0] or "application/octet-stream",
                    headers={"Content-Security-Policy": APP_CSP, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"})


# ---------------------------------------------------------------------------------------------- practice exercises
from pydantic import BaseModel, ConfigDict  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from .. import perseus  # noqa: E402
from ..db import get_db  # noqa: E402
from ..models import ExerciseProgress, now  # noqa: E402
from ..xp import award_xp, touch_activity  # noqa: E402

_ex_cache: dict[str, dict] = {}


async def _exercise(node_id: str) -> dict:
    """The exercise's zip, mastery rule and the items we can show (cached per node)."""
    if node_id in _ex_cache:
        return _ex_cache[node_id]
    k = _kolibri()
    if k is None or not NODE.match(node_id):
        raise err(404, "not_found", "That practice isn't in the library.")
    try:
        n = await k.node(node_id)
    except Exception:  # noqa: BLE001
        raise err(404, "not_found", "That practice isn't in the library.") from None
    meta = n.get("assessmentmetadata") or {}
    f = next((f for f in n.get("files") or [] if f.get("extension") == "perseus" and f.get("checksum")), None)
    if n.get("kind") != "exercise" or not f:
        raise err(404, "not_found", "That practice isn't in the library.")
    zpath = _storage(f"{f['checksum']}.perseus")
    items = []
    for iid in meta.get("assessment_item_ids") or []:
        try:
            if perseus.supported(perseus.item(zpath, iid)):
                items.append(iid)
        except (KeyError, ValueError):
            continue
    mm = meta.get("mastery_model") or {}
    m, nn = (int(mm.get("m", 5)), int(mm.get("n", 7))) if mm.get("type") == "m_of_n" else (5, 5) if mm.get("type") == "num_correct_in_a_row_5" else (3, 3)
    ex = {"title": n.get("title") or "", "zip": zpath, "items": items, "m": min(m, max(1, len(items))), "n": min(nn, max(1, len(items))), "randomize": bool(meta.get("randomize"))}
    _ex_cache[node_id] = ex
    return ex


def _base(node_id: str) -> str:
    return f"/api/library/exercises/{node_id}/files"


@router.get("/exercises/{node_id}")
async def exercise(node_id: str, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    ex = await _exercise(node_id)
    p = db.get(ExerciseProgress, (ctx.user.id, node_id))
    order = list(ex["items"])
    if ex["randomize"]:
        import random
        random.Random(f"{ctx.user.id}:{node_id}:{p.attempts if p else 0}").shuffle(order)
    return {"title": ex["title"], "items": order, "mastery": {"m": ex["m"], "n": ex["n"]}, "skipped": None,
            "progress": {"recent": p.recent if p else "", "mastered": bool(p and p.mastered_at)}}


@router.get("/exercises/{node_id}/items/{item_id}")
async def exercise_item(node_id: str, item_id: str, ctx: Ctx = Depends(current)):
    ex = await _exercise(node_id)
    if item_id not in ex["items"]:
        raise err(404, "not_found", "That question isn't here.")
    return perseus.public(perseus.item(ex["zip"], item_id), _base(node_id))


@router.get("/exercises/{node_id}/items/{item_id}/hints/{n}")
async def exercise_hint(node_id: str, item_id: str, n: int, ctx: Ctx = Depends(current)):
    ex = await _exercise(node_id)
    if item_id not in ex["items"]:
        raise err(404, "not_found", "That question isn't here.")
    text = perseus.hint(perseus.item(ex["zip"], item_id), n, _base(node_id))
    if text is None:
        raise err(404, "not_found", "No more hints.")
    return {"text": text}


class ExAnswerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict[str, str | int | list[int] | None]
    hints_used: int = 0


@router.post("/exercises/{node_id}/items/{item_id}/check")
async def exercise_check(node_id: str, item_id: str, body: ExAnswerIn, ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    """Right or wrong (never the answer). A question counts toward mastery only on the first try without hints."""
    ex = await _exercise(node_id)
    if item_id not in ex["items"]:
        raise err(404, "not_found", "That question isn't here.")
    ok, per = perseus.check(perseus.item(ex["zip"], item_id), body.answers)
    out = {"correct": ok, "widgets": per, "mastered": False, "xp": 0}
    if ctx.user.role != "student":
        return out
    p = db.get(ExerciseProgress, (ctx.user.id, node_id)) or ExerciseProgress(user_id=ctx.user.id, node_id=node_id, title=ex["title"][:200], recent="", attempts=0, correct=0)
    db.add(p)
    p.attempts += 1
    counts = ok and body.hints_used == 0
    p.correct += int(ok)
    p.recent = (p.recent + ("1" if counts else "0"))[-ex["n"]:]
    p.updated_at = now()
    if not p.mastered_at and p.recent.count("1") >= ex["m"]:
        p.mastered_at = now()
        out["mastered"] = True
        if award_xp(db, ctx.user.id, f"exercise-mastered:{ctx.user.id}:{node_id}", "exercise_mastered", 20, reason=f"mastered {ex['title'][:60]}"):
            out["xp"] = 20
    touch_activity(db, ctx.user.id)
    db.commit()
    out["progress"] = {"recent": p.recent, "mastered": bool(p.mastered_at)}
    return out


@router.get("/exercises/{node_id}/files/{path:path}")
async def exercise_file(node_id: str, path: str, ctx: Ctx = Depends(current)):
    ex = await _exercise(node_id)
    if ".." in path or not re.fullmatch(r"images/[\w.\-]+", path):
        raise err(404, "not_found", "Not found.")
    try:
        data = perseus.svg_with_labels(ex["zip"], path) if path.endswith(".svg") else perseus.file_bytes(ex["zip"], path)
    except KeyError:
        raise err(404, "not_found", "Not found.") from None
    ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return Response(data, media_type=ctype, headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff",
                                                     "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:"})
