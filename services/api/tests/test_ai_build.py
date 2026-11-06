"""EDU54 Workbench (docs/edu54-build): the catalog, progress on the learner's account, certificates, the teacher's read-only
count, credits, and that the website's numbers match the synced catalog."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / "content" / "edu54-build" / "catalog.json"


def _jordan_id(teacher):
    roster = teacher.get("/api/teacher/students").json()
    rows = roster.get("students", roster) if isinstance(roster, dict) else roster
    return next(s["id"] for s in rows if s["name"].startswith("Jordan"))


def test_progress_needs_sign_in_and_csrf(client, student):
    assert client.get("/api/ai-build/progress").status_code == 401
    assert client.get("/api/ai-build/catalog").status_code == 401
    no_token = student.post("/api/ai-build/progress", json={"lesson": "vectors"}, headers={"X-CSRF-Token": ""})
    assert no_token.status_code == 403


def test_finish_a_lesson_saves_it_once_and_rejects_unknown_ones(student):
    p = student.get("/api/ai-build/progress").json()
    assert p["lessons"] == [] and p["name"].startswith("Jordan") and p["total"] == 667
    r = student.post("/api/ai-build/progress", json={"lesson": "vectors"}).json()
    assert r == {"saved": True, "new": True, "done": 1}
    assert student.post("/api/ai-build/progress", json={"lesson": "vectors"}).json()["new"] is False
    assert student.post("/api/ai-build/progress", json={"lesson": "not-a-lesson"}).status_code == 404
    assert student.post("/api/ai-build/progress", json={"lesson": "vectors", "extra": 1}).status_code == 422
    assert student.get("/api/ai-build/progress").json()["lessons"] == ["vectors"]
    assert student.get("/api/ai-build/catalog").json()["done"] == ["vectors"]


def test_a_finished_track_earns_its_certificate_on_progress(student):
    cat = json.loads(CATALOG.read_text())
    track3 = [l["slug"] for l in cat["lessons"] if l["track"] == 3]
    for s in track3[:-1]:
        student.post("/api/ai-build/progress", json={"lesson": s})
    t = next(t for t in student.get("/api/progress/me").json()["ai_build"]["tracks"] if t["n"] == 3)
    assert t["done"] == len(track3) - 1 and not t["certified"]
    student.post("/api/ai-build/progress", json={"lesson": track3[-1]})
    me = student.get("/api/progress/me").json()["ai_build"]
    t = next(t for t in me["tracks"] if t["n"] == 3)
    assert t["certified"] and t["done"] == t["size"] == 13 and me["done"] == 13 and me["name"].startswith("Jordan")


def test_teacher_sees_the_count_read_only(student, teacher):
    student.post("/api/ai-build/progress", json={"lesson": "vectors"})
    uid = _jordan_id(teacher)
    s = teacher.get(f"/api/teacher/students/{uid}").json()["ai_build"]
    assert s["done"] == 1 and s["total"] == 667
    # a teacher's own progress is their own: posting never writes to the student
    teacher.post("/api/ai-build/progress", json={"lesson": "rag"})
    assert teacher.get(f"/api/teacher/students/{uid}").json()["ai_build"]["done"] == 1


def test_catalog_matches_the_handover_counts():
    c = json.loads(CATALOG.read_text())
    assert c["lessons_live"] == len(c["lessons"]) == 667
    sizes = {t["title"]: t["live"] for t in c["tracks"]}
    assert sizes == {"Numbers that learn": 35, "Machine learning basics": 21, "Neural networks": 13, "Seeing": 43, "Language": 47,
                     "Transformers": 40, "Making an LLM": 36, "Using LLMs": 17, "Agents": 145, "Running it safely": 144,
                     "Build it yourself": 59, "Exam prep": 67}
    assert len({l["slug"] for l in c["lessons"]}) == 667
    src = (ROOT / "content" / "edu54-build" / "SOURCE.txt").read_text()
    assert re.search(r"^commit: [0-9a-f]{40}$", src, re.M) and "lessons: 667" in src


def test_website_numbers_are_true():
    """Every count of EDU54 Workbench lessons on the public site is the synced catalog's count, and nothing says coming soon."""
    c = json.loads(CATALOG.read_text())
    n = c["lessons_live"]
    site = ROOT / "apps" / "site"
    home, llms = (site / "index.html").read_text(), (site / "llms.txt").read_text()
    for name, text in (("index", home), ("llms", llms)):
        low = text.lower()
        assert "coming soon to every edu54 box" not in low and "650+" not in text, name
        assert {int(x) for x in re.findall(r'data-lessons="(\d+)"', text)} <= {n}, name
        assert {int(x) for x in re.findall(r"(\d+) hands-on", text)} == {n}, name
    assert "Now on every EDU54 box" in home and 'href="/workbench/"' in home
    assert "https://edu54.com/workbench/" in (site / "sitemap.xml").read_text()
    # the public page itself is generated (git-ignored) by tools/content/build-edu54-workbench-page.sh; check it when present
    page = site / "workbench" / "index.html"
    if page.exists():
        text = page.read_text()
        assert "EDU54 Workbench" in text and "Amaete" not in text and f"{n} hands-on" in text

def test_credits_are_on_the_attributions_page(client, monkeypatch):
    from umanah_api import branding
    from umanah_api.config import get_settings
    assert not [i for i in client.get("/api/config/attributions").json()["items"] if i.get("kind") == "EDU54 Workbench"]   # EDU54 only
    monkeypatch.setenv("LABOS_BRAND", "edu54"); monkeypatch.setenv("LABOS_EDITION", "k12")
    get_settings.cache_clear(); branding.brand.cache_clear(); branding.edition.cache_clear()
    items = client.get("/api/config/attributions").json()["items"]
    monkeypatch.delenv("LABOS_BRAND"); monkeypatch.delenv("LABOS_EDITION")
    get_settings.cache_clear(); branding.brand.cache_clear(); branding.edition.cache_clear()
    mine = [i for i in items if i.get("kind") == "EDU54 Workbench"]
    assert len(mine) >= 60
    course = next(i for i in mine if i["title"] == "AI Engineering from Scratch")
    assert course["license"] == "MIT License" and course["checked_on"]
    assert all(i["license"] and i["source_url"].startswith(("https://", "http://")) and i["checked_on"] for i in mine)
    assert not any(re.search(r"\(MIT\)", i["license"] + i["attribution"]) for i in mine)
