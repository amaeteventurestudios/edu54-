"""License gate (docs/edu54/CLAUDE.md §2): allowlist, denylist, required metadata, PhET cutoff. No override flag."""
from pathlib import Path

from umanah_api import licensing

RULES = licensing.allowlist(Path(__file__).resolve().parents[3] / "config" / "content-allowlist.yaml")


def item(**kw):
    base = {"id": "x", "title": "Chemistry 2e", "license": "CC BY 4.0", "source_url": "https://openstax.org/details/books/chemistry-2e",
            "attribution": "OpenStax, Rice University", "checked_on": "2026-09-30"}
    return {**base, **kw}


def ok(**kw):
    return licensing.check(item(**kw), RULES).ok


def test_allowed_licenses_pass():
    for lic in ("CC BY 4.0", "CC-BY-SA-4.0", "CC0-1.0", "public domain", "MIT", "Apache-2.0", "GPL-3.0"):
        assert ok(license=lic), lic


def test_nc_nd_unknown_and_unlisted_are_rejected():
    for lic in ("CC BY-NC-SA 4.0", "CC BY-NC 4.0", "CC BY-ND 4.0", "CC-BY-NC-ND-3.0", "unknown", "proprietary", "CC BY 2.0"):
        assert not ok(license=lic), lic


def test_required_metadata():
    for k in ("license", "source_url", "attribution", "checked_on"):
        v = licensing.check(item(**{k: ""}), RULES)
        assert not v.ok and k in v.reason


def test_denylisted_source_rejected_even_with_allowed_license():
    for url in ("https://www.khanacademy.org/math", "https://ocw.mit.edu/courses/x", "https://cs50.harvard.edu/x", "https://www.ck12.org/book",
                "https://www.youtube.com/watch?v=1", "https://www.kaggle.com/learn/python", "https://scratch.mit.edu/projects/1", "https://ed.ted.com/x"):
        v = licensing.check(item(source_url=url, license="CC BY 4.0"), RULES)
        assert not v.ok and "excluded" in v.reason, url
    assert ok(source_url="https://www.kaggle.com/datasets/x")          # only kaggle.com/learn is on the list


def test_mit_press_sicp_needs_the_hand_check():
    url = "https://mitpress.mit.edu/sites/default/files/sicp/index.html"
    assert not ok(source_url=url, license="CC BY-SA 4.0")
    assert ok(source_url=url, license="CC BY-SA 4.0", hand_checked="mitpress-sicp")


def test_us_centric_titles_rejected():
    assert not ok(title="U.S. History")
    assert not ok(title="American Government 3e")
    assert ok(title="World History Volume 1")


def test_phet_cutoff():
    phet = dict(source_url="https://phet.colorado.edu/en/simulations/color-vision")
    assert ok(published="2015-06-01", **phet)
    assert not ok(published="2026-03-29", **phet)
    assert not ok(**phet)                          # no publication date: cannot confirm


def test_gate_only_applies_to_gated_brands():
    items = [item(id="a"), item(id="b", license="CC BY-NC-SA 4.0")]
    acc, rej = licensing.gate(items, brand="edu54", rules=RULES)
    assert [i["id"] for i in acc] == ["a"] and rej[0]["id"] == "b" and "NonCommercial" in rej[0]["rejected"]
    acc, rej = licensing.gate(items, brand="umanah", rules=RULES)
    assert len(acc) == 2 and not rej


def test_import_adds_only_accepted(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(licensing, "allowlist", lambda path=None: RULES)
    f = tmp_path / "items.json"
    f.write_text(json.dumps([item(id="a"), item(id="b", source_url="https://www.khanacademy.org/")]))
    cat = tmp_path / "catalog.json"
    n, bad = licensing.import_items(f, cat, brand="edu54")
    assert n == 1 and bad[0]["id"] == "b"
    assert [c["id"] for c in json.loads(cat.read_text())["items"]] == ["a"]
