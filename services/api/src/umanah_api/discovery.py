"""Discovery Lab (docs/discovery-lab): the catalog of labs, topics and experiments, and the experiment readings the AI Guide
may see. One file, content/discovery/catalog.json, feeds both this API and the web app.

The browser sends the experiment's current readings with a Guide question. They are data from a simulation the student is
moving, never instructions: only keys the experiment declares are kept, numbers are rounded, choices must be one of the
experiment's options, and short text values are limited to a plain character set and length.
"""
from __future__ import annotations

import json
import math
import re
from functools import lru_cache
from typing import Any

from .config import get_settings

MAX_READINGS = 24
_TEXT = re.compile(r"^[\w .,:;°%/()+\-−=·²³×±√πθ#♯♭'?]{0,40}$")


@lru_cache(maxsize=1)
def catalog() -> dict[str, Any]:
    return json.loads((get_settings().content_dir / "discovery" / "catalog.json").read_text(encoding="utf-8"))


def experience(exp_id: str) -> dict[str, Any] | None:
    """A working experience by id. Planned ones have no experiment to talk about."""
    return next((e for e in catalog()["experiences"] if e["id"] == exp_id and e["status"] == "working"), None)


def lab(lab_id: str) -> dict[str, Any] | None:
    return next((x for x in catalog()["labs"] if x["id"] == lab_id), None)


def _number(v: float) -> float | int:
    if v == int(v) and abs(v) < 1e9:
        return int(v)
    return float(f"{v:.4g}")


def clean_state(exp: dict[str, Any], state: dict[str, Any] | None) -> dict[str, float | int | str]:
    """Only the readings this experiment declares, in a safe shape. Anything else is dropped, not rejected, so a slider
    moved mid-question never blocks the student."""
    if not state:
        return {}
    params = {p["key"]: p for p in exp.get("params", [])}
    observations = {o["key"] for o in exp.get("observations", [])}
    out: dict[str, float | int | str] = {}
    for key, value in state.items():
        if len(out) >= MAX_READINGS or not isinstance(key, str):
            break
        p = params.get(key)
        if p is not None and p.get("type") == "choice":
            if isinstance(value, str) and value in {o["value"] for o in p["options"]}:
                out[key] = value
            continue
        if p is None and key not in observations:
            continue
        if isinstance(value, bool):
            out[key] = "yes" if value else "no"
        elif isinstance(value, (int, float)) and math.isfinite(value):
            if p is not None:
                value = min(max(value, p["min"]), p["max"])
            out[key] = _number(float(value))
        elif isinstance(value, str) and _TEXT.match(value):
            out[key] = value.strip()
    return out


def readings_text(exp: dict[str, Any], state: dict[str, float | int | str]) -> str:
    """The experiment's readings as plain lines with their labels and units, for the Guide's system message."""
    labels = {p["key"]: (p["label"], p.get("unit", "")) for p in exp.get("params", [])}
    labels.update({o["key"]: (o["label"], o.get("unit", "")) for o in exp.get("observations", [])})
    choice_labels = {(p["key"], o["value"]): o["label"] for p in exp.get("params", []) if p.get("type") == "choice" for o in p["options"]}
    lines = []
    for key, value in state.items():
        label, unit = labels.get(key, (key, ""))
        shown = choice_labels.get((key, value), value) if isinstance(value, str) else value
        lines.append(f"- {label}: {shown}{(' ' + unit) if unit and not isinstance(value, str) else ''}")
    return "\n".join(lines)


def public_catalog() -> dict[str, Any]:
    c = catalog()
    return {k: v for k, v in c.items() if not k.startswith("_")}
