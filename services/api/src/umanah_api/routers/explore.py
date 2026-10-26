"""Explore (docs/13): search the offline encyclopedia. Nothing leaves the machine; queries go through the rules layer of the safety pipeline."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from .. import engines
from ..config import get_settings
from ..db import get_db
from ..deps import Ctx, current, err
from ..models import SafetyAlert, SafetyEvent
from ..safety import pipeline as safety
from ..safety import responses
from ..tutor.service import _contact

router = APIRouter(prefix="/api/explore", tags=["explore"])

SOURCE = {"name": "the school's offline library", "license": "each article shows its source", "note": "Stored on this school's device. Works without internet."}

# Offline library books (docs/47), matched by the start of the book's name in the library. Licenses are the ones the
# publishers state; "see the source" where one book mixes licenses (LibreTexts pages carry their own).
BOOKS: list[tuple[str, str, str]] = [
    ("wikipedia_en_simple_all", "Simple English Wikipedia", "CC BY-SA 4.0"),
    ("wikipedia_en-simple_all", "Simple English Wikipedia", "CC BY-SA 4.0"),       # the newer Kiwix file name
    ("vikidia_en_all", "Vikidia, the encyclopedia for young readers", "CC BY-SA 3.0"),   # its footer says 3.0 (checked 2026-09-30)
    ("wiktionary_en-simple", "Simple English Wiktionary", "CC BY-SA 4.0"),
    ("wikisource_en", "Wikisource", "CC BY-SA 4.0"),
    ("cs.stackexchange.com", "Computer Science Stack Exchange", "CC BY-SA 3.0 or 4.0"),
    ("chemistry.stackexchange.com", "Chemistry Stack Exchange", "CC BY-SA 3.0 or 4.0"),
    ("biology.stackexchange.com", "Biology Stack Exchange", "CC BY-SA 3.0 or 4.0"),
    ("devdocs_en_numpy", "NumPy reference", "BSD 3-Clause"),
    ("devdocs_en_pandas", "pandas reference", "BSD 3-Clause"),
    ("devdocs_en_git", "Git reference", "GPL 2.0"),
    ("wikipedia_en_top", "Wikipedia: most-read articles", "CC BY-SA 4.0"),
    ("wikipedia_en_all", "Wikipedia", "CC BY-SA 4.0"),
    ("wikipedia_en_", "Wikipedia subject collection", "CC BY-SA 4.0"),
    ("wiktionary_en", "Wiktionary dictionary", "CC BY-SA 4.0"),
    ("wikibooks_en", "Wikibooks", "CC BY-SA 4.0"),
    ("wikiversity_en", "Wikiversity", "CC BY-SA 4.0"),
    ("libretexts.org_en_", "LibreTexts open textbooks", "open licenses; see the source"),
    ("internet-encyclopedia-philosophy", "Internet Encyclopedia of Philosophy", "free for education; see the source"),
    ("gardenology", "Gardenology plant encyclopedia", "see the source"),
    ("artofproblemsolving", "Art of Problem Solving wiki", "see the source"),
    ("freecodecamp", "freeCodeCamp", "BSD 3-Clause"),
]


YOUNG_READERS = ("vikidia_en_all", "wikipedia_en_simple_all", "wikipedia_en-simple_all")


def book_priority(book: str) -> int:
    """Search order: encyclopedias for young readers, then school subjects, textbooks, and the big general books last."""
    order = ["vikidia", "wikipedia_en_simple", "wiktionary_en-simple", "wikipedia_en_astronomy", "wikipedia_en_chemistry", "wikipedia_en_geography",
             "wikipedia_en_history", "wikipedia_en_mathematics", "wikipedia_en_physics", "libretexts.org_en_k12", "libretexts.org_en_", "internet-encyclopedia",
             "gardenology", "wikibooks", "wikiversity", "artofproblemsolving", "freecodecamp", "wikipedia_en_top"]
    return next((i for i, pre in enumerate(order) if book.startswith(pre)), len(order) - 1)


def rank(q: str, hits: list[dict], limit: int = 12, per_book: int = 3) -> list[dict]:
    """One search covers every book, and a big textbook can fill a whole page on its own. Put exact title matches first,
    then take turns between books (in the library's order within each book), at most `per_book` from each."""
    ql = q.lower()
    by_book: dict[str, list[dict]] = {}
    for h in hits:
        by_book.setdefault(h["path"].split("/", 1)[0], []).append(h)
    key = lambda h: (h["path"].split("/", 1)[0], h["title"].lower())      # one article can come back under two paths
    out: list[dict] = []
    seen: set = set()
    for h in [h for h in hits if h["title"].lower() == ql] + [b[i] for i in range(per_book) for b in by_book.values() if i < len(b)]:
        if key(h) not in seen:
            out.append(h); seen.add(key(h))
    return out[:limit]


def book_of(path: str) -> dict:
    """Which library book an article path ('book/Article') comes from, for the result label and the credit line."""
    book = path.split("/", 1)[0]
    name, lic = next(((n, lic) for pre, n, lic in BOOKS if book.startswith(pre)), ("Offline library", "see the source"))
    return {"name": name, "license": lic}


def book_allowed(path: str) -> bool:
    """An edition lists only its own books (UMANAH_KIWIX_BOOKS, name prefixes); empty means the whole library."""
    pre = [p.strip() for p in get_settings().kiwix_books.split(",") if p.strip()]
    return not pre or path.split("/", 1)[0].startswith(tuple(pre))


def _kiwix() -> engines.KiwixLibraryAdapter | None:
    return next((a for a in engines.parse(get_settings().engines) if isinstance(a, engines.KiwixLibraryAdapter)), None)


@router.get("/search")
async def search(q: str = Query(min_length=1, max_length=120), ctx: Ctx = Depends(current), db: Session = Depends(get_db)):
    q = q.strip()
    d = await safety.screen(q, use_classifier=False)
    if not d.allowed:   # same reviewed responses and alerts as the tutor chat (docs/41)
        contact, ctitle = _contact(db, ctx.user.school_id)
        text = (responses.distress_response(contact.display_name if contact else None, ctitle) if d.category == "distress" else
                responses.support_response(d.category, contact.display_name if contact else None, ctitle) if d.action in ("alert", "support")
                else responses.REDIRECTS.get(d.category, "That isn't something I can look up here."))
        if ctx.user.role == "student":
            ev = SafetyEvent(user_id=ctx.user.id, category=d.category, severity=d.severity, action=d.action)
            db.add(ev)
            db.flush()
            if d.action == "alert":
                db.add(SafetyAlert(event_id=ev.id, school_id=ctx.user.school_id, student_id=ctx.user.id, excerpt=q[:1000], reply=text))
            db.commit()
        return {"query": q, "results": [], "support": text, "source": SOURCE}
    kw = _kiwix()
    if kw is None:
        return {"query": q, "results": [], "unavailable": True, "source": SOURCE}
    try:
        # Title matches from every book (the title index answers in milliseconds; full-text search across 25 books took
        # 8-20 s on this box), young readers' encyclopedias first. Full text only when titles find little.
        hits: list[dict] = []
        loop = asyncio.get_running_loop()
        deadline = loop.time() + 3            # a slow book is skipped: the young readers' books come first, so they are always in
        for book in sorted([b for b in await kw.books() if book_allowed(b + "/")], key=book_priority):   # this edition's books only
            if loop.time() > deadline:
                break
            try:
                hits += await kw.suggest(book, q, 3, timeout=1.5)
            except Exception:  # noqa: BLE001 - one slow or odd book must not sink the search
                continue
        if len(hits) < 4:
            for b in YOUNG_READERS:
                if not book_allowed(b + "/"):
                    continue
                try:
                    hits += await asyncio.wait_for(kw.search(q, 4, book=b), 6)
                except Exception:  # noqa: BLE001
                    continue
        results = rank(q, [h for h in hits if book_allowed(h["path"])])
    except Exception:  # noqa: BLE001 - engine stopped or slow: say so in plain words, never a stack trace
        return {"query": q, "results": [], "unavailable": True, "source": SOURCE}
    return {"query": q, "results": [{**r, "source": book_of(r["path"])} for r in results], "source": SOURCE}


FEATURED = {
    "science": ["Moon", "Sun", "Photosynthesis", "Water cycle", "Gravity", "Electricity", "Volcano", "Human body"],
    "engineering": ["Bridge", "Engine", "Electric motor", "Robot", "Machine", "Simple machine", "Satellite", "Renewable energy"],
    "ai": ["Computer", "Artificial intelligence", "Algorithm", "Programming language", "Python (programming language)", "Internet", "Binary numeral system", "Computer program"],
    "history": ["Ancient Egypt", "Roman Empire", "Industrial Revolution", "World War II", "Renaissance", "Mali Empire", "Printing press", "Civil rights movement"],
}
_featured_cache: dict[str, list[dict]] = {}


@router.get("/featured")
async def featured(category: str = Query(pattern="^(science|engineering|ai|history)$"), ctx: Ctx = Depends(current)):
    """Curated starting points from the offline encyclopedia (only titles the library really has)."""
    if category in _featured_cache:
        return {"results": _featured_cache[category], "source": SOURCE}
    kw = _kiwix()
    if kw is None:
        return {"results": [], "unavailable": True, "source": SOURCE}
    try:
        books = [b for b in sorted(await kw.books(), key=book_priority) if b.startswith(YOUNG_READERS) and book_allowed(b + "/")]
    except Exception:  # noqa: BLE001 - library stopped: say so plainly
        return {"results": [], "unavailable": True, "source": SOURCE}

    async def one(t: str):
        """The article with exactly this title, from the young readers' encyclopedias (title index: milliseconds)."""
        for b in books:
            try:
                exact = next((h for h in await kw.suggest(b, t, 5, timeout=3) if h["title"].lower() == t.lower()), None)
            except Exception:  # noqa: BLE001
                continue
            if exact:
                return exact
        return None
    found = [{**h, "source": book_of(h["path"])} for t in FEATURED[category] if (h := await one(t))]   # one at a time: the library answers in turn
    if found:
        _featured_cache[category] = found
    return {"results": found, "unavailable": not found, "source": SOURCE}


@router.get("/library/{path:path}")
async def library(path: str, ctx: Ctx = Depends(current)):
    """Articles and their images, styles and links, served from the offline library through Umanah (same origin)."""
    kw = _kiwix()
    if kw is None or ".." in path or not book_allowed(path):
        raise err(404, "not_found", "That page isn't in the library.")
    try:
        body, ctype = await kw.fetch(path)
    except Exception:  # noqa: BLE001
        raise err(404, "not_found", "That page isn't in the library.") from None
    return Response(body, media_type=ctype, headers={"Content-Security-Policy": "default-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'none'; frame-ancestors 'self'"})


# ---- Textbooks (docs/edu54 CONTENT-CATALOG): open textbooks from the license-gated catalog, shown as PDFs --------------
def _textbooks() -> tuple[list[dict], "Path | None"]:
    import json
    from pathlib import Path  # noqa: F401
    f = get_settings().knowledge_catalog
    if not f or not f.exists():
        return [], None
    ed = get_settings().edition
    items = [i for i in json.loads(f.read_text(encoding="utf-8")).get("items", []) if i.get("kind") == "textbook"
             and (not ed or i.get("edition") in ("both", ed)) and (f.parent / i.get("file", "")).is_file()]
    return items, f.parent


@router.get("/textbooks")
def textbooks(ctx: Ctx = Depends(current)):
    items, _ = _textbooks()
    return {"items": [{k: i.get(k) for k in ("id", "title", "license", "attribution", "subject")} for i in sorted(items, key=lambda i: i["title"])]}


@router.get("/textbooks/{item_id}.pdf")
def textbook_file(item_id: str, ctx: Ctx = Depends(current)):
    items, root = _textbooks()
    it = next((i for i in items if i["id"] == item_id), None)
    if not it or root is None:
        raise err(404, "not_found", "That book isn't in the library.")
    path = (root / it["file"]).resolve()
    if root.resolve() not in path.parents:
        raise err(404, "not_found", "That book isn't in the library.")
    return FileResponse(path, media_type="application/pdf", headers={"Content-Disposition": "inline", "Content-Security-Policy": "frame-ancestors 'self'"})
