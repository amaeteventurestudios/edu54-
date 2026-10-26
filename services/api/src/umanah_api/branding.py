"""Brand and edition (docs/edu54/CLAUDE.md §3). Read once at start-up and served to the web app by GET /api/config/public.

The brand decides the product name, colors, logo and footer strings; the edition decides the words for teachers and groups,
the level list, the Build tools and the content catalog. Umanah with no edition is the AI Lab exactly as it was.
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import yaml

from .config import get_settings

# The AI Lab's own brand, kept in code so a checkout without config/ still runs exactly as before.
UMANAH: dict[str, Any] = {
    "id": "umanah",
    "productName": "Umanah AI Lab",
    "shortName": "Umanah",
    "platformCredit": "",
    "tagline": "",
    "logo": {"type": "rosette"},
    "favicon": {"type": "file", "href": "/favicon.svg"},
    "colors": {},                 # empty: the web app keeps the design tokens in index.css
    "supportLabel": "Umanah support connection",
    "privacyLine": "Student chats are never sent to Umanah, and safety alerts go to trusted adults.",
    "hideStrings": [],
    "loginBackgrounds": [],       # [{left, right}] image pairs the sign-in page cycles through (EDU54: kente green, red, blue)
}

# The AI Lab's wording, used when no edition is set (and as the fallback for any term an edition leaves out).
DEFAULT_EDITION: dict[str, Any] = {
    "id": "",
    "label": "",
    "terms": {"teacher": "Teacher", "teachers": "Teachers", "teacherCenter": "Teacher Center", "group": "Class", "groups": "Classes",
              "admin": "School Admin", "level": "Grade", "institution": "school"},
    "levels": [],
    "youngChildLogin": True,
    "buildTools": ["pyodide", "blockly-games", "snap", "music-blocks", "reeborg"],
    "catalog": "",
    "demoSchool": "Demo Academy",
    "safetyPipeline": "required",
    "tutorPolicy": "required",
}

_PLURALS = {"teacher": "teachers", "group": "groups"}


@lru_cache
def brand() -> dict[str, Any]:
    s = get_settings()
    if s.brand in ("", "umanah"):
        return UMANAH
    f = s.labos_config_dir / f"brand.{s.brand}.json"
    data = json.loads(f.read_text(encoding="utf-8"))       # a missing brand file is a start-up error, never a silent fallback
    out = {**UMANAH, **{k: v for k, v in data.items() if not k.startswith("_")}}
    out.setdefault("supportLabel", "Support connection")
    if out["supportLabel"] == UMANAH["supportLabel"]:
        out["supportLabel"] = "Support connection"
    if out["privacyLine"] == UMANAH["privacyLine"]:
        out["privacyLine"] = "Student chats never leave this school's device, and safety alerts go to trusted adults."
    return out


@lru_cache
def edition() -> dict[str, Any]:
    s = get_settings()
    if not s.edition:
        return DEFAULT_EDITION
    all_editions = yaml.safe_load((s.labos_config_dir / "editions.yaml").read_text(encoding="utf-8")) or {}
    if s.edition not in all_editions:
        raise ValueError(f"unknown edition {s.edition!r}; expected one of {sorted(all_editions)}")
    e = all_editions[s.edition]
    terms = {**DEFAULT_EDITION["terms"], **(e.get("terms") or {})}
    for one, many in _PLURALS.items():
        if "terms" in e and one in e["terms"] and many not in e["terms"]:
            w = e["terms"][one]
            terms[many] = w + ("es" if w.endswith(("s", "x", "ch", "sh")) else "s")
    terms.setdefault("institution", "school")
    if s.edition == "university":
        terms["institution"] = e.get("terms", {}).get("institution", "institution")
    return {**DEFAULT_EDITION, **e, "id": s.edition, "terms": terms}


def product_name() -> str:
    return brand()["productName"]


def public_config() -> dict[str, Any]:
    """Everything the web app needs before sign-in. No secrets, nothing about this school's people."""
    b, e = brand(), edition()
    return {
        "schoolDisplay": get_settings().school_display,
        "brand": {k: b[k] for k in ("id", "productName", "shortName", "platformCredit", "tagline", "logo", "favicon", "colors", "privacyLine", "loginBackgrounds")},
        "edition": {**{k: e[k] for k in ("id", "label", "terms", "levels", "youngChildLogin", "buildTools", "catalog")},
                    "bands": {k: {"name": v["name"], "grades": v["grades"]} for k, v in (e.get("bands") or {}).items()}},
    }
