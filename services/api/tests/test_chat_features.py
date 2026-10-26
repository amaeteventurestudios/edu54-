import pytest

from tests.conftest import login
from umanah_api.tutor import followups, style, titles


def test_style_removes_em_dashes_and_emoji_but_not_code():
    assert style.clean("A loop repeats things — again and again.") == "A loop repeats things, again and again."
    assert style.clean("Great job! \U0001F389 Keep going ✨") == "Great job! Keep going "
    assert style.clean("Use `a — b` here") == "Use `a — b` here"
    code = "```python\nprint('—')\n```"
    assert style.clean(f"Try this — it works:\n{code}") == f"Try this, it works:\n{code}"
    assert style.clean("Pages 5–10 are fine", False) == "Pages 5–10 are fine"      # numeric ranges keep their en dash
    assert "\U0001F389" in style.clean("Well done \U0001F389", allow_emoji=True)


def test_style_filter_keeps_a_code_fence_open_across_pieces():
    f = style.StyleFilter()
    out = f.feed("Here:\n```python\nx = 1 — 2\n") + f.feed("y = 3 — 4\n```\nDone — nice.")
    assert "x = 1 — 2" in out and "y = 3 — 4" in out and out.endswith("Done, nice.")


@pytest.mark.parametrize("msg,title", [
    ("Can you explain how for loops work in Python with a simple example?", "Explain how for loops work in Python with a…"),
    ("What is an algorithm?", "What is an algorithm"),
    ("help me with photosynthesis", "Photosynthesis"),
    ("   ", "New chat"),
])
def test_titles(msg, title):
    assert titles.make_title(msg) == title


def test_followups_depend_on_mode_and_content():
    assert followups.suggest("x", "assessment") == []
    assert followups.suggest("anything", "homework") == ["Give me a hint", "Explain the concept", "Show me a similar example"]
    code = followups.suggest("Try:\n```python\nprint(1)\n```", "general")
    assert "Explain this code line by line" in code and len(code) <= 3
    assert all("answer" not in x.lower() for x in followups.suggest("2 + 3 = 5", "lesson"))


def test_chat_titles_rename_delete_search_and_feedback(app):
    c = login(app, "jordan")
    listing = c.get("/api/ai/conversations").json()["conversations"]
    assert listing and all(x["title"] for x in listing)
    hit = c.get("/api/ai/conversations", params={"q": "NameError"}).json()["conversations"]
    assert [x["title"] for x in hit] == ["Fixing a NameError"]
    cid = hit[0]["id"]
    assert c.patch(f"/api/ai/conversations/{cid}", json={"title": "My bug"}).json()["title"] == "My bug"
    conv = c.get(f"/api/ai/conversations/{cid}").json()
    reply = next(m for m in conv["messages"] if m["role"] == "assistant")
    assert c.post(f"/api/ai/messages/{reply['id']}/feedback", json={"value": "down"}).json()["feedback"] == "down"
    assert c.post(f"/api/ai/messages/{reply['id']}/feedback", json={"value": "sideways"}).status_code == 422
    assert c.delete(f"/api/ai/conversations/{cid}").status_code == 204
    assert c.get(f"/api/ai/conversations/{cid}").status_code == 404


def test_assignment_chats_cannot_be_deleted_by_the_student(app):
    c = login(app, "jordan")
    hw = next(x for x in c.get("/api/ai/conversations").json()["conversations"] if x["mode"] == "homework")
    assert hw["deletable"] is False
    assert c.delete(f"/api/ai/conversations/{hw['id']}").status_code == 403


def test_nobody_else_can_touch_a_chat(app):
    j = login(app, "jordan")
    cid = j.get("/api/ai/conversations").json()["conversations"][0]["id"]
    other = login(app, "student01")
    assert other.get(f"/api/ai/conversations/{cid}").status_code == 404
    assert other.patch(f"/api/ai/conversations/{cid}", json={"title": "x"}).status_code == 404
    assert other.delete(f"/api/ai/conversations/{cid}").status_code == 404


def test_new_chat_gets_a_title_and_suggestions(app, stub):
    c = login(app, "jordan")
    r = c.post("/api/ai/chat", json={"message": "Can you explain what a variable is?"})
    text = r.text
    assert '"type": "suggestions"' in text and '"title": "Explain what a variable is"' in text
