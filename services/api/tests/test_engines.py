import asyncio

import httpx
import pytest

from umanah_api import engines
from umanah_api.config import get_settings
from umanah_api.engines import (KiwixLibraryAdapter, KolibriContentAdapter, MoodleLearningAdapter, JupyterExecutionAdapter,
                                NotConnected)


def transport(handler):
    return httpx.MockTransport(handler)


def health(handler):
    return asyncio.run(MoodleLearningAdapter("http://moodle:8080/", transport(handler)).health())


@pytest.mark.parametrize("code", [200, 204, 302, 401, 403, 404])
def test_any_non_server_error_answer_means_ready(code):
    h = health(lambda r: httpx.Response(code))
    assert (h.state, h.text) == ("ready", "Ready")


def test_server_error_is_unavailable_not_off():
    assert health(lambda r: httpx.Response(503)).state == "unavailable"


def test_engine_that_is_not_started_is_off_and_that_is_not_a_fault():
    def gone(r):
        raise httpx.ConnectError("[Errno -2] Name or service not known")
    h = health(gone)
    assert h.state == "off" and "starts when needed" in h.text


def test_connection_refused_is_off_but_a_timeout_is_unavailable():
    def refused(r):
        raise httpx.ConnectError("[Errno 111] Connection refused")

    def slow(r):
        raise httpx.ReadTimeout("timed out")
    assert health(refused).state == "off"
    assert health(slow).state == "unavailable"


def test_parse_ignores_unknown_names_and_bad_urls_and_keeps_a_stable_order():
    a = engines.parse("kiwix=http://k:8080/, bogus=http://x/, moodle=notaurl, moodle=http://m/, kolibri=http://c/")
    assert [x.key for x in a] == ["moodle", "kolibri", "kiwix"]
    assert engines.parse("") == []


def test_labels_never_name_a_third_party_product():
    banned = ("moodle", "kolibri", "kiwix", "jupyter", "open webui", "openwebui", "ollama", "wikipedia")
    for cls in engines.ADAPTERS.values():
        assert not any(b in cls.label.lower() for b in banned), cls.label
        assert not any(b in cls.when_off.lower() for b in banned)


def test_check_all_reports_each_engine_with_umanah_words():
    def h(r):
        if r.url.host == "kiwix":
            raise httpx.ConnectError("[Errno -2] Name or service not known")
        return httpx.Response(302 if r.url.host == "moodle" else 200)
    items = asyncio.run(engines.check_all("moodle=http://moodle/,kiwix=http://kiwix/,kolibri=http://kolibri/", transport(h)))
    assert {i["id"]: (i["label"], i["state"]) for i in items} == {
        "moodle": ("Course engine", "ready"), "kolibri": ("Content library", "ready"), "kiwix": ("Offline encyclopedia", "off")}


@pytest.mark.parametrize("call", [
    lambda: MoodleLearningAdapter("http://x").list_courses(1),
    lambda: MoodleLearningAdapter("http://x").sync_grade(1, "a", 1.0),
    lambda: KolibriContentAdapter("http://x").search("loops"),
    lambda: JupyterExecutionAdapter("http://x").open_notebook(1, "p"),
])
def test_domain_methods_are_honest_stubs(call):
    with pytest.raises(NotConnected):
        asyncio.run(call())


def test_lab_status_lists_engines_for_teachers_only(app, monkeypatch):
    from tests.conftest import login
    monkeypatch.setenv("UMANAH_ENGINES", "kolibri=http://127.0.0.1:1/,kiwix=http://127.0.0.1:1/")
    get_settings.cache_clear()
    try:
        t = login(app, "mswilliams").get("/api/system/status").json()
        ids = {i["id"]: i for i in t["items"]}
        assert ids["kolibri"]["label"] == "Content library" and ids["kolibri"]["state"] == "off"
        s = login(app, "jordan").get("/api/system/status").json()
        assert not {"kolibri", "kiwix"} & {i["id"] for i in s["items"]}
    finally:
        get_settings.cache_clear()
