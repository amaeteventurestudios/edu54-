from umanah_api.tutor.adapters import OllamaInferenceAdapter, _ThinkStripper


def run(chunks):
    t = _ThinkStripper()
    return "".join(t.feed(c) for c in chunks) + t.flush()


def test_plain_text_passes_through():
    assert run(["Hello ", "there. ", "Nice <b>work</b>."]) == "Hello there. Nice <b>work</b>."


def test_think_block_is_removed_even_when_tags_are_split_across_chunks():
    assert run(["<thi", "nk>secret plan", " more</th", "ink>\n", "The answer is x."]) == "The answer is x."
    assert run(["Hi <think>hidden</think>there"]) == "Hi there"


def test_unclosed_think_never_leaks():
    assert "hidden" not in run(["ok <think>hidden forever"])


def test_requests_disable_thinking_and_set_keep_alive():
    b = OllamaInferenceAdapter("http://x", 5, "-1")._body("m", [], True, 10, 0.1)
    assert b["think"] is False and b["keep_alive"] == -1
    assert OllamaInferenceAdapter("http://x", 5, "10m")._body("m", [], True, 10, 0.1)["keep_alive"] == "10m"
