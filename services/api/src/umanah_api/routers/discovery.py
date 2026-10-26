"""Discovery Lab (docs/discovery-lab): the catalog for the signed-in web app. Search runs in the browser from this catalog,
so typing never reaches the server or the model."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import discovery
from ..deps import Ctx, current

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


@router.get("/catalog")
def catalog(ctx: Ctx = Depends(current)):
    return discovery.public_catalog()
