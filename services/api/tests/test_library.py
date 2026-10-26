"""School Library (routers/library.py): browse the content library's channels and play its files, with a fake engine."""
import zipfile

import httpx
import pytest

from tests.conftest import login
from umanah_api import engines
from umanah_api.config import get_settings

CH = "a" * 32
TOPIC = "b" * 32
GUIDE = "c" * 32
APP = "d" * 32
ZIPSUM, MP4SUM, PSUM = "1" * 32, "2" * 32, "3" * 32
EX = "f" * 32


def node(i, kind, title, **kw):
    return {"id": i, "kind": kind, "title": title, "description": "", "available": True, "coach_content": False, "files": [], "ancestors": [], **kw}


NODES = {
    CH: node(CH, "topic", "Science Sims"),
    TOPIC: node(TOPIC, "topic", "Biology", ancestors=[{"id": CH, "title": "Science Sims"}]),
    GUIDE: node(GUIDE, "document", "Teacher guide", coach_content=True),
    APP: node(APP, "html5", "Cell app", license_name="CC BY", files=[{"checksum": ZIPSUM, "extension": "zip", "preset": "html5_zip", "available": True}]),
    EX: node(EX, "exercise", "Add fractions", files=[{"checksum": PSUM, "extension": "perseus", "preset": "exercise", "available": True}],
             assessmentmetadata={"assessment_item_ids": ["i1", "i2", "i3"], "mastery_model": {"type": "m_of_n", "m": 2, "n": 3}, "randomize": False}),
}
KIDS = {CH: [NODES[TOPIC]], TOPIC: [NODES[GUIDE], NODES[APP], node("e" * 32, "video", "Cells video", files=[{"checksum": MP4SUM, "extension": "mp4", "preset": "low_res_video", "available": True}])]}


def fake(r: httpx.Request):
    if r.url.path == "/api/content/channel/":
        return httpx.Response(200, json=[{"id": CH, "name": "Science Sims", "description": "d", "available": True}])
    if r.url.path == "/api/content/contentnode/":
        return httpx.Response(200, json=KIDS.get(r.url.params["parent"], []))
    nid = r.url.path.rstrip("/").rsplit("/", 1)[-1]
    return httpx.Response(200, json=NODES[nid]) if nid in NODES else httpx.Response(404)


@pytest.fixture()
def lib(app, monkeypatch, tmp_path):
    monkeypatch.setattr(engines, "parse", lambda spec, transport=None: [engines.KolibriContentAdapter("http://kolibri:8080/", httpx.MockTransport(fake))])
    store = tmp_path / "content"
    for s, ext in ((ZIPSUM, "zip"), (MP4SUM, "mp4")):
        (store / "storage" / s[0] / s[1]).mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(store / "storage" / "1" / "1" / f"{ZIPSUM}.zip", "w") as z:
        z.writestr("index.html", "<h1>cell</h1>")
    (store / "storage" / "2" / "2" / f"{MP4SUM}.mp4").write_bytes(b"0123456789")
    import json
    (store / "storage" / "3" / "3").mkdir(parents=True, exist_ok=True)
    num = {"question": {"content": "What is $1/2 + 1/4$? [[\u2603 numeric-input 1]]", "widgets": {"numeric-input 1": {"type": "numeric-input", "options": {"answers": [{"value": 0.75, "status": "correct", "maxError": None}]}}}},
           "hints": [{"content": "Make the bottoms the same."}, {"content": "2/4 + 1/4"}]}
    rad = {"question": {"content": "Pick ![x](${\u2623 LOCALPATH}/images/a.png) [[\u2603 radio 1]]", "widgets": {"radio 1": {"type": "radio", "options": {"choices": [{"content": "3/4", "correct": True}, {"content": "2/6"}]}}}}, "hints": []}
    graph = {"question": {"content": "[[\u2603 interactive-graph 1]]", "widgets": {"interactive-graph 1": {"type": "interactive-graph", "options": {}}}}, "hints": []}
    with zipfile.ZipFile(store / "storage" / "3" / "3" / f"{PSUM}.perseus", "w") as z:
        z.writestr("i1.json", json.dumps(num)); z.writestr("i2.json", json.dumps(rad)); z.writestr("i3.json", json.dumps(graph)); z.writestr("images/a.png", b"PNG")
    monkeypatch.setattr(get_settings(), "library_content_dir", store)
    return app


def test_browse_hides_teacher_guides_from_students(lib):
    c = login(lib, "jordan")
    assert [ch["title"] for ch in c.get("/api/library/channels").json()["channels"]] == ["Science Sims"]
    j = c.get(f"/api/library/nodes/{TOPIC}").json()
    assert j["trail"] == [{"id": CH, "title": "Science Sims"}]
    assert [k["title"] for k in j["children"]] == ["Cell app", "Cells video"]
    assert c.get(f"/api/library/nodes/{GUIDE}").status_code == 404
    t = login(lib, "mswilliams")
    assert "Teacher guide" in [k["title"] for k in t.get(f"/api/library/nodes/{TOPIC}").json()["children"]]


def test_video_plays_with_seeking_and_needs_sign_in(lib):
    c = login(lib, "jordan")
    kids = c.get(f"/api/library/nodes/{TOPIC}").json()["children"]
    video = next(k for k in kids if k["kind"] == "video")
    r = c.get(video["url"], headers={"Range": "bytes=2-4"})
    assert r.status_code == 206 and r.content == b"234"
    from fastapi.testclient import TestClient
    assert TestClient(lib).get(video["url"]).status_code == 401
    assert c.get("/api/library/file/..%2F..%2Fetc%2Fpasswd").status_code == 404


def test_app_runs_sandboxed_from_a_signed_link_only(lib):
    c = login(lib, "jordan")
    app_item = next(k for k in c.get(f"/api/library/nodes/{TOPIC}").json()["children"] if k["kind"] == "html5")
    from fastapi.testclient import TestClient
    anon = TestClient(lib)                       # the sandboxed frame sends no cookies
    r = anon.get(app_item["url"])
    assert r.status_code == 200 and b"cell" in r.content and r.headers["content-security-policy"].startswith("sandbox allow-scripts")
    assert "allow-same-origin" not in r.headers["content-security-policy"]
    bad = app_item["url"].replace("/app/", "/app/9").replace(".", "x", 1)
    assert anon.get(bad).status_code == 404
    assert anon.get(app_item["url"].replace("index.html", "missing.js")).status_code == 404


def test_library_off_says_so(app):
    c = login(app, "jordan")
    assert c.get("/api/library/channels").json() == {"channels": [], "unavailable": True}


def test_practice_exercise_checks_on_the_server_and_masters(lib):
    from umanah_api.routers import library
    library._ex_cache.clear()
    c = login(lib, "jordan")
    resp = c.get(f"/api/library/exercises/{EX}")
    assert resp.status_code == 200, resp.text
    ex = resp.json()
    assert ex["items"] == ["i1", "i2"] and ex["mastery"] == {"m": 2, "n": 2}            # the graph item can't be shown, so it is skipped
    q = c.get(f"/api/library/exercises/{EX}/items/i1").json()
    assert "0.75" not in str(q) and q["hints"] == 2 and q["widgets"]["numeric-input 1"]["type"] == "number"
    r = c.get(f"/api/library/exercises/{EX}/items/i2").json()
    assert "correct" not in str(r) and r["content"].startswith("Pick ![x](/api/library/exercises/")
    h = {"X-CSRF-Token": c.cookies.get("umanah_csrf")}
    assert c.post(f"/api/library/exercises/{EX}/items/i1/check", json={"answers": {"numeric-input 1": "1/2"}}, headers=h).json()["correct"] is False
    assert c.post(f"/api/library/exercises/{EX}/items/i1/check", json={"answers": {"numeric-input 1": "3/4"}}, headers=h).json()["correct"] is True
    done = c.post(f"/api/library/exercises/{EX}/items/i2/check", json={"answers": {"radio 1": [0]}}, headers=h).json()
    assert done["mastered"] is True and done["xp"] == 20
    assert c.get(f"/api/library/exercises/{EX}/items/i1/hints/1").json()["text"] == "2/4 + 1/4"
    assert c.get(f"/api/library/exercises/{EX}/files/images/a.png").content == b"PNG"
    assert c.get(f"/api/library/exercises/{EX}/files/../../etc/passwd").status_code == 404


def test_practice_shows_on_progress_and_for_the_teacher(lib):
    from umanah_api.routers import library
    library._ex_cache.clear()
    c = login(lib, "jordan")
    h = {"X-CSRF-Token": c.cookies.get("umanah_csrf")}
    c.post(f"/api/library/exercises/{EX}/items/i1/check", json={"answers": {"numeric-input 1": "0.75"}}, headers=h)
    c.post(f"/api/library/exercises/{EX}/items/i2/check", json={"answers": {"radio 1": [0]}}, headers=h)
    p = c.get("/api/progress/me").json()["practice"]
    assert p[0]["title"] == "Add fractions" and p[0]["mastered"] is True
    t = login(lib, "mswilliams")
    sid = next(s["id"] for s in t.get("/api/teacher/students").json()["students"] if s["username"] == "jordan")
    assert t.get(f"/api/teacher/students/{sid}").json()["practice"][0]["mastered"] is True
