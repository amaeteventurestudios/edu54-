"""License gate for content imports (docs/edu54/CLAUDE.md §2, config/content-allowlist.yaml).

For the EDU54 brand every content item must carry `license`, `source_url`, `attribution` and `checked_on`, its license must be
on the allowlist, and its source must not be on the denylist (even when the metadata claims an allowed license). There is no
override flag. The Umanah brand does not use this gate (the free AI Lab keeps its NonCommercial content).

    python -m umanah_api.licensing import <items.json> <catalog.json>    check items and add the accepted ones to the catalog
    python -m umanah_api.licensing check <items.json>                    report only
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

from .config import get_settings

GATED_BRANDS = {"edu54"}


@dataclass(frozen=True)
class Verdict:
    ok: bool
    reason: str


@lru_cache
def allowlist(path: Path | None = None) -> dict[str, Any]:
    f = path or get_settings().labos_config_dir / "content-allowlist.yaml"
    return yaml.safe_load(f.read_text(encoding="utf-8"))


def normalize(lic: str) -> str:
    """'CC BY-SA 4.0' -> 'CC-BY-SA-4.0'; 'Public Domain' -> 'public-domain'; SPDX ids pass through."""
    t = re.sub(r"[\s_]+", "-", lic.strip())
    if t.lower() in ("public-domain", "publicdomain", "pd"):
        return "public-domain"
    return t.upper().replace("CC0", "CC0") if t.upper().startswith("CC") else t


def _host_path(url: str) -> tuple[str, str]:
    u = urlparse(url if "://" in url else "https://" + url)
    return (u.hostname or "").lower(), u.path or "/"


def _denied_source(url: str, rules: list[str]) -> str | None:
    host, path = _host_path(url)
    for rule in rules:
        rhost, _, rpath = rule.lower().partition("/")
        if host == rhost or host.endswith("." + rhost):
            if not rpath or path.lstrip("/").startswith(rpath):
                return rule
    return None


def check(item: dict[str, Any], rules: dict[str, Any] | None = None) -> Verdict:
    r = rules or allowlist()
    missing = [k for k in r.get("required_metadata", []) if not str(item.get(k) or "").strip()]
    if missing:
        return Verdict(False, "missing " + ", ".join(missing))
    lic = normalize(str(item["license"]))
    parts = set(re.split(r"[-\s]+", lic.upper()))
    if "NC" in parts or "ND" in parts:
        return Verdict(False, f"license {lic} is NonCommercial or NoDerivatives")
    if lic.lower() in ("unknown", "unverified", "see-the-source"):
        return Verdict(False, "license unknown or not verified")
    allowed = {a if a == "public-domain" else a.upper() for a in r.get("allowed_licenses", [])}
    if (lic if lic == "public-domain" else lic.upper()) not in allowed:
        return Verdict(False, f"license {lic} is not on the allowlist")
    for field in ("source_url", "download_url"):
        if item.get(field) and (rule := _denied_source(str(item[field]), r.get("denylist_sources", []))):
            if not (rule == "mit.edu" and item.get("hand_checked") == "mitpress-sicp" and _host_path(str(item[field]))[0] == "mitpress.mit.edu"):
                return Verdict(False, f"source {rule} is excluded")
    title = str(item.get("title") or "")
    for t in r.get("denylist_titles", []):
        if t.lower() in title.lower():
            return Verdict(False, f"title '{t}' is excluded (US-centric)")
    if "phet" in str(item["source_url"]).lower():
        pub, cutoff = item.get("published"), r.get("phet_cutoff_date")
        if not pub:
            return Verdict(False, "PhET item without a publication date (only sims before the cutoff are CC BY)")
        if cutoff and date.fromisoformat(str(pub)[:10]) >= date.fromisoformat(str(cutoff)):
            return Verdict(False, f"PhET item published {pub}, on or after {cutoff}")
    try:
        date.fromisoformat(str(item["checked_on"])[:10])
    except ValueError:
        return Verdict(False, "checked_on is not a date")
    return Verdict(True, "ok")


def gate(items: list[dict[str, Any]], brand: str | None = None, rules: dict[str, Any] | None = None) -> tuple[list[dict], list[dict]]:
    """(accepted, rejected-with-reason). Brands outside GATED_BRANDS accept everything unchanged."""
    b = brand if brand is not None else get_settings().brand
    if b not in GATED_BRANDS:
        return list(items), []
    ok, bad = [], []
    for it in items:
        v = check(it, rules)
        (ok if v.ok else bad).append(it if v.ok else {**it, "rejected": v.reason})
    return ok, bad


def import_items(items_file: Path, catalog_file: Path, brand: str | None = None) -> tuple[int, list[dict]]:
    """Add accepted items to the catalog (keyed by `id`); return (added, rejected)."""
    items = json.loads(items_file.read_text(encoding="utf-8"))
    ok, bad = gate(items, brand)
    cat = json.loads(catalog_file.read_text(encoding="utf-8")) if catalog_file.exists() else {"items": []}
    by_id = {c["id"]: c for c in cat["items"]}
    for it in ok:
        by_id[it["id"]] = it
    cat["items"] = sorted(by_id.values(), key=lambda c: (c.get("edition", ""), c.get("kind", ""), c.get("title", "")))
    catalog_file.parent.mkdir(parents=True, exist_ok=True)
    catalog_file.write_text(json.dumps(cat, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return len(ok), bad


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "check":
        ok, bad = gate(json.loads(Path(argv[1]).read_text(encoding="utf-8")))
        for it in ok:
            print(f"accept  {it['id']}  {it['license']}")
        for it in bad:
            print(f"REJECT  {it.get('id')}  {it['rejected']}")
        return 0 if not bad else 1
    if len(argv) >= 3 and argv[0] == "import":
        n, bad = import_items(Path(argv[1]), Path(argv[2]))
        print(f"imported {n}")
        for it in bad:
            print(f"REJECT  {it.get('id')}  {it['rejected']}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
