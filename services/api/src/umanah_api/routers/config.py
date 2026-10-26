"""GET /api/config/public: the brand and edition this install runs as (docs/edu54/CLAUDE.md §3). No sign-in needed."""
from __future__ import annotations

from fastapi import APIRouter

import json

from .. import branding
from ..config import get_settings

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/public")
def public():
    return branding.public_config()


@router.get("/attributions")
def attributions():
    """Credits for every content item and tool on this device, from the import catalog's license metadata (no sign-in needed)."""
    f = get_settings().knowledge_catalog
    items = json.loads(f.read_text(encoding="utf-8")).get("items", []) if f and f.exists() else []
    reg = f.parent / "models.json" if f else None           # the model registry sits beside the catalog (models are not content)
    if reg and reg.exists():
        items += [{**m, "kind": "model"} for m in json.loads(reg.read_text(encoding="utf-8"))]
    keep = ("id", "title", "kind", "edition", "license", "attribution", "source_url", "checked_on", "share_alike_pack")
    return {"product": branding.product_name(), "platformCredit": branding.brand().get("platformCredit", ""),
            "items": [{k: i.get(k) for k in keep if k in i} for i in items]}
