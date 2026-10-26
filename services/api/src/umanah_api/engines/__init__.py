"""Adapters to the engines behind Umanah (docs/53): course engine, content library, offline encyclopedia, notebooks, admin console.

Students and teachers only ever see Umanah's own words for these (`label`), never a product name (docs/53 "The product rule").
Every adapter answers `health()` honestly; the domain methods are stubs until each engine is connected (docs/44 later phases)
and say so with `NotConnected` instead of returning made-up data.

    UMANAH_ENGINES="moodle=http://moodle:8080/login/index.php,kolibri=http://kolibri:8080/,..."   (set by the compose file)
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

import httpx


class NotConnected(NotImplementedError):
    """The engine exists in the platform but Umanah does not use it for this yet."""


@dataclass(frozen=True)
class Health:
    state: str     # ready | off | unavailable
    text: str      # plain words for a teacher or admin


class EngineAdapter:
    key = ""
    label = ""          # what Lab Status calls it (never a third-party name)
    when_off = "Off (starts when needed)"

    def __init__(self, url: str, transport: httpx.AsyncBaseTransport | None = None, timeout: float = 1.5):
        self.url, self._transport, self._timeout = url, transport, timeout

    async def health(self) -> Health:
        """ready: answered. off: nothing listening / name not found (the profile is not started: normal, not a fault).
        unavailable: something answers but is broken or too slow."""
        try:
            async with httpx.AsyncClient(transport=self._transport, timeout=self._timeout, follow_redirects=False) as c:
                r = await c.get(self.url)
        except (httpx.ConnectError, httpx.UnsupportedProtocol) as e:
            # a compose service that is not running does not resolve at all, or refuses the connection
            return Health("off", self.when_off) if _is_absent(e) else Health("unavailable", "Not answering")
        except httpx.HTTPError:
            return Health("unavailable", "Not answering")
        if r.status_code < 500:
            return Health("ready", "Ready")       # 2xx, redirects to its own login/setup, 401/403 all mean the engine is up
        return Health("unavailable", "Started but reporting a problem")


def _is_absent(e: Exception) -> bool:
    msg = str(e).lower()
    return any(k in msg for k in ("name or service not known", "temporary failure in name resolution", "nodename nor servname",
                                   "connection refused", "no route to host", "errno -2", "errno -3", "errno 111", "all connection attempts failed"))


class MoodleLearningAdapter(EngineAdapter):
    key, label = "moodle", "Course engine"

    async def list_courses(self, user_id: int) -> list[dict]:
        raise NotConnected("Umanah does not read courses from the course engine yet (docs/44 phase 2)")

    async def sync_grade(self, user_id: int, assignment_id: str, score: float) -> None:
        raise NotConnected("gradebook sync is not connected yet")


class KolibriContentAdapter(EngineAdapter):
    key, label = "kolibri", "Content library"

    async def search(self, query: str, limit: int = 10) -> list[dict]:
        raise NotConnected("channel search is not connected yet (browse by channel and topic instead)")

    async def _get(self, path: str, **params) -> object:
        async with httpx.AsyncClient(transport=self._transport, timeout=max(self._timeout, 10.0)) as c:
            r = await c.get(self.url.rstrip("/") + path, params=params)
        r.raise_for_status()
        return r.json()

    async def channels(self) -> list[dict]:
        """Channels imported on this device (only ones with content on disk)."""
        return [c for c in await self._get("/api/content/channel/", available="true") if c.get("available", True)]

    async def node(self, node_id: str) -> dict:
        return await self._get(f"/api/content/contentnode/{node_id}/")

    async def children(self, node_id: str) -> list[dict]:
        """A topic's children in the channel's own order, only those with content on this device."""
        d = await self._get("/api/content/contentnode/", parent=node_id)
        items = d["results"] if isinstance(d, dict) else d
        return [n for n in items if n.get("available", True)]


class KiwixLibraryAdapter(EngineAdapter):
    key, label = "kiwix", "Offline encyclopedia"

    async def search(self, query: str, limit: int = 10, book: str | None = None) -> list[dict]:
        """Full-text search of the offline library (every book, or only `book`, by its library name):
        [{title, snippet, path}] where path is 'book/Article'."""
        import re
        import xml.etree.ElementTree as ET
        # one search covers every book in the library; a first-time query can take several seconds on this hardware
        async with httpx.AsyncClient(transport=self._transport, timeout=max(self._timeout, 20.0)) as c:
            r = await c.get(self.url.rstrip("/") + "/search", params={"pattern": query, "format": "xml", "pageLength": limit} | ({"books.filter.name": book} if book else {}))
        r.raise_for_status()
        out = []
        for it in ET.fromstring(r.text).iter("item"):
            link = (it.findtext("link") or "")
            if not link.startswith("/content/"):
                continue
            d = it.find("description")       # the library marks matches with <b> child elements: take all of the text
            snippet = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", "".join(d.itertext()) if d is not None else "")).strip(" .…")
            out.append({"title": it.findtext("title") or "", "snippet": snippet[:280], "path": link[len("/content/"):]})
        return out

    _books: tuple[float, list[str]] = (0.0, [])

    async def books(self) -> list[str]:
        """The library's books by their content name (e.g. 'vikidia_en_all_maxi_2026-09'), cached for ten minutes."""
        import re
        import time
        at, names = KiwixLibraryAdapter._books
        if names and time.time() - at < 600:
            return names
        async with httpx.AsyncClient(transport=self._transport, timeout=max(self._timeout, 6.0)) as c:
            r = await c.get(self.url.rstrip("/") + "/catalog/v2/entries", params={"count": "-1"})
        r.raise_for_status()
        names = re.findall(r'href="/content/([^"/]+)"', r.text)
        KiwixLibraryAdapter._books = (time.time(), names)
        return names

    async def suggest(self, book: str, term: str, count: int = 3, timeout: float = 3.0) -> list[dict]:
        """Articles in one book whose titles match (the library's title index: milliseconds, unlike full-text search)."""
        async with httpx.AsyncClient(transport=self._transport, timeout=timeout) as c:
            r = await c.get(self.url.rstrip("/") + "/suggest", params={"content": book, "term": term, "count": count})
        r.raise_for_status()
        return [{"title": h.get("value") or "", "snippet": "", "path": f"{book}/{h['path']}"} for h in r.json() if h.get("kind") == "path" and h.get("path")]

    async def fetch(self, path: str) -> tuple[bytes, str]:
        """One resource (article page, image, style) from the library, for the Explore viewer."""
        async with httpx.AsyncClient(transport=self._transport, timeout=max(self._timeout, 6.0)) as c:
            r = await c.get(self.url.rstrip("/") + "/content/" + path.lstrip("/"))
        if r.status_code != 200:
            raise NotConnected("not in the library")
        return r.content, r.headers.get("content-type", "application/octet-stream")


class JupyterExecutionAdapter(EngineAdapter):
    key, label = "jupyterhub", "Notebooks"

    async def open_notebook(self, user_id: int, project_id: str) -> str:
        raise NotConnected("notebooks are not opened from Build yet")


class AdminConsoleAdapter(EngineAdapter):
    key, label = "openwebui", "Admin console"


ADAPTERS: dict[str, type[EngineAdapter]] = {c.key: c for c in (MoodleLearningAdapter, KolibriContentAdapter, KiwixLibraryAdapter,
                                                                 JupyterExecutionAdapter, AdminConsoleAdapter)}


def parse(spec: str, transport: httpx.AsyncBaseTransport | None = None) -> list[EngineAdapter]:
    """'moodle=http://…,kolibri=http://…' -> adapters, in a stable order. Unknown names and malformed items are ignored."""
    out: dict[str, EngineAdapter] = {}
    for part in (spec or "").split(","):
        name, _, url = part.strip().partition("=")
        if name in ADAPTERS and url.startswith(("http://", "https://")):
            out[name] = ADAPTERS[name](url, transport)
    return [out[k] for k in ADAPTERS if k in out]


async def check_all(spec: str, transport: httpx.AsyncBaseTransport | None = None) -> list[dict]:
    """Status items for Lab Status: all engines checked at once, so a stopped engine never slows the page."""
    adapters = parse(spec, transport)
    results = await asyncio.gather(*(a.health() for a in adapters))
    return [{"id": a.key, "label": a.label, "state": h.state, "text": h.text} for a, h in zip(adapters, results)]
