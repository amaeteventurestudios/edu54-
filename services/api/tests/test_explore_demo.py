import asyncio

import httpx
import pytest

from tests.conftest import login
from umanah_api import demo, engines
from umanah_api.db import session_scope
from umanah_api.models import Conversation, Message, SafetyAlert, User
from sqlalchemy import select

RSS = """<?xml version="1.0"?><rss><channel><item><title>Moon</title><link>/content/vikidia_en_all_maxi_2026-09/Moon</link>
<description>...<b>Moon</b> is Earth's natural <b>satellite</b>.</description></item>
<item><title>Ignored</title><link>/viewer#x</link></item></channel></rss>"""


def kiwix_transport(app_calls=None):
    def h(r: httpx.Request):
        if r.url.path == "/search":
            return httpx.Response(200, text=RSS)
        if r.url.path == "/catalog/v2/entries":
            return httpx.Response(200, text='<feed><entry><link type="text/html" href="/content/vikidia_en_all_maxi_2026-09" /></entry>'
                                            '<entry><link type="text/html" href="/content/libretexts.org_en_geo_2026-01" /></entry></feed>')
        if r.url.path == "/suggest":
            if r.url.params["content"].startswith("vikidia") and r.url.params["term"].lower() == "moon":
                return httpx.Response(200, json=[{"value": "Moon", "kind": "path", "path": "Moon"}, {"value": "containing 'moon'...", "kind": "pattern"}])
            return httpx.Response(200, json=[])
        if r.url.path == "/content/vikidia_en_all_maxi_2026-09/Moon":
            return httpx.Response(200, text="<html><title>Moon</title></html>", headers={"content-type": "text/html"})
        return httpx.Response(404)
    return httpx.MockTransport(h)


def test_kiwix_search_parses_results_and_strips_markup():
    k = engines.KiwixLibraryAdapter("http://kiwix:8080/", kiwix_transport())
    r = asyncio.run(k.search("moon"))
    assert r == [{"title": "Moon", "snippet": "Moon is Earth's natural satellite", "path": "vikidia_en_all_maxi_2026-09/Moon"}]


@pytest.fixture()
def wired(app, monkeypatch):
    monkeypatch.setattr(engines.KiwixLibraryAdapter, "_books", (0.0, []))
    monkeypatch.setattr(engines, "parse", lambda spec, transport=None: [engines.KiwixLibraryAdapter("http://kiwix:8080/", kiwix_transport())])
    return app


def test_explore_search_and_article(wired):
    c = login(wired, "jordan")
    j = c.get("/api/explore/search", params={"q": "moon"}).json()
    hit = j["results"][0]
    assert hit["title"] == "Moon" and hit["source"] == {"name": "Vikidia, the encyclopedia for young readers", "license": "CC BY-SA 3.0"}
    a = c.get("/api/explore/library/vikidia_en_all_maxi_2026-09/Moon")
    assert a.status_code == 200 and "script-src 'none'" in a.headers["content-security-policy"]
    assert c.get("/api/explore/library/vikidia_en_all_maxi_2026-09/Nope").status_code == 404
    assert c.get("/api/explore/library/../etc/passwd").status_code in (404,)


def test_explore_needs_sign_in(wired):
    from fastapi.testclient import TestClient
    assert TestClient(wired).get("/api/explore/search", params={"q": "moon"}).status_code == 401


def test_explore_search_of_a_crisis_phrase_gets_the_support_response_and_alerts(wired):
    c = login(wired, "jordan")
    j = c.get("/api/explore/search", params={"q": "how to kill myself"}).json()
    assert j["results"] == [] and "988" in j["support"]
    with session_scope() as db:
        assert db.scalar(select(SafetyAlert.id)) is not None


def test_explore_says_so_when_the_library_is_off(app):
    c = login(app, "jordan")
    j = c.get("/api/explore/search", params={"q": "moon"}).json()
    assert j["unavailable"] is True and j["results"] == []


def test_seed_has_realistic_conversations_and_no_duplicates(app):
    with session_scope() as db:
        jordan = db.scalar(select(User).where(User.username == "jordan"))
        convs = db.scalars(select(Conversation).where(Conversation.user_id == jordan.id)).all()
        assert len(convs) == len(demo.JORDAN) and all(c.title for c in convs)
        firsts = [db.scalar(select(Message.content).where(Message.conversation_id == c.id).order_by(Message.id)) for c in convs]
        assert len(set(firsts)) == len(firsts)
        assert all("—" not in m for m in db.scalars(select(Message.content)))     # style rule: no em dashes
        assert db.scalar(select(Message.id).where(Message.feedback == "up")) is not None


def test_reset_chats_removes_leftovers_and_reseeds(app):
    with session_scope() as db:
        jordan = db.scalar(select(User).where(User.username == "jordan"))
        from datetime import UTC, datetime, timedelta
        for _ in range(3):
            c = Conversation(user_id=jordan.id, mode="general", expires_at=datetime.now(UTC) + timedelta(days=1))
            db.add(c); db.flush(); db.add(Message(conversation_id=c.id, role="user", content="What is an algorithm?"))
        db.commit()
        deleted, created = demo.reset_chats(db)
        assert deleted > created >= len(demo.JORDAN)
        assert db.scalars(select(Message.content).where(Message.content == "What is an algorithm?", Message.role == "user")).all() == []  # the three leftovers are gone; the seeded chats use their own wording


def test_every_library_book_gets_a_name_and_license():
    from umanah_api.routers.explore import book_of
    assert book_of("wikipedia_en_simple_all_mini_2026-05/Moon")["name"] == "Simple English Wikipedia"
    assert book_of("wikipedia_en_physics_maxi_2026-07/Force")["name"] == "Wikipedia subject collection"
    assert book_of("libretexts.org_en_k12_2026-01/index/page_1")["name"] == "LibreTexts open textbooks"
    assert book_of("something_new_2027-01/X") == {"name": "Offline library", "license": "see the source"}


def test_results_take_turns_between_books_with_exact_titles_first():
    from umanah_api.routers.explore import rank
    hits = [{"title": f"Ch {i}: Volcanoes", "snippet": "", "path": f"libretexts.org_en_geo/p{i}"} for i in range(6)]
    hits += [{"title": "Volcano", "snippet": "", "path": "vikidia_en_all/Volcano"}, {"title": "Lava", "snippet": "", "path": "wikipedia_en_simple_all/Lava"}]
    out = rank("volcano", hits, limit=6)
    assert [h["path"] for h in out] == ["vikidia_en_all/Volcano", "libretexts.org_en_geo/p0", "wikipedia_en_simple_all/Lava", "libretexts.org_en_geo/p1", "libretexts.org_en_geo/p2"]


def test_search_uses_title_matches_first_and_falls_back_to_full_text(wired):
    c = login(wired, "jordan")
    hits = c.get("/api/explore/search", params={"q": "moon"}).json()["results"]
    assert hits[0]["path"] == "vikidia_en_all_maxi_2026-09/Moon" and hits[0]["source"]["name"].startswith("Vikidia")
    # nothing matches a title: the young readers' full-text search still answers
    assert c.get("/api/explore/search", params={"q": "satellite"}).json()["results"][0]["title"] == "Moon"


def test_books_are_searched_young_readers_first():
    from umanah_api.routers.explore import book_priority
    books = ["wikipedia_en_top_maxi_2026-09", "libretexts.org_en_bio_2025-01", "vikidia_en_all_maxi_2026-09", "wikipedia_en_simple_all_mini_2026-05"]
    assert sorted(books, key=book_priority) == ["vikidia_en_all_maxi_2026-09", "wikipedia_en_simple_all_mini_2026-05", "libretexts.org_en_bio_2025-01", "wikipedia_en_top_maxi_2026-09"]


def test_featured_finds_exact_titles_in_the_young_readers_books(wired):
    from umanah_api.routers import explore
    explore._featured_cache.clear()
    j = login(wired, "jordan").get("/api/explore/featured", params={"category": "science"}).json()
    assert [h["title"] for h in j["results"]] == ["Moon"] and not j.get("unavailable")
