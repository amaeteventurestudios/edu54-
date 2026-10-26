"""Umanah API. Serves /api/* and (when built) the web app, so one process is the whole appliance front."""
from __future__ import annotations

import asyncio
import logging

from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete

from . import __version__
from .config import get_settings
from .db import Base, engine, init_engine, session_scope
from .models import Conversation, Message, now
from .routers import admin, ai, build, discovery as discovery_router, config as config_router, curriculum, learner, lesson_builder, teacher_work, demo as demo_router, documents, assignments, auth, explore, learn, library, notifications, progress, revision, safety, system, teacher
from .seed import seed


def prepare_database() -> None:
    from . import migrate, models  # noqa: F401  (register tables)
    done = migrate.prepare(engine())
    logging.getLogger("uvicorn.error").info("database schema %s at revision %s", done, migrate.current_revision(engine()))


def purge_expired_chats() -> int:
    """docs/41: student AI conversations are deleted after their retention window (90 days by default)."""
    with session_scope() as db:
        ids = [c for c in db.scalars(__import__("sqlalchemy").select(Conversation.id).where(Conversation.expires_at < now()))]
        if ids:
            db.execute(delete(Message).where(Message.conversation_id.in_(ids)))
            db.execute(delete(Conversation).where(Conversation.id.in_(ids)))
        return len(ids)


async def _warm_models() -> None:
    """Background: wait for the runtime, then load the models and prime prompt prefixes (docs/43). Never blocks start-up."""
    from .safety import triage
    from .tutor import prompts
    from .tutor.adapters import OllamaInferenceAdapter, get_adapter
    s = get_settings()
    a = get_adapter()
    if not isinstance(a, OllamaInferenceAdapter):
        return
    for _ in range(60):
        if await a.available():
            break
        await asyncio.sleep(5)
    else:
        return
    system = prompts.BASE.format(product=prompts._product(), max_words=s.tutor_max_words, band=prompts._BAND["13-15"], emoji=prompts.EMOJI_OFF) + "\n\n" + prompts.MODE_RULES["general"]
    took = await a.warm(s.tutor_model, s.safety_model, system, triage._messages("I need help with my homework"))
    logging.getLogger("uvicorn.error").info("models warm: %s", took)


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    s.data_dir.mkdir(parents=True, exist_ok=True)
    from . import branding
    branding.brand(), branding.edition()          # a bad brand or edition stops start-up here, not on the first request
    init_engine(f"sqlite:///{s.db_path}")
    prepare_database()
    if s.demo_seed:
        with session_scope() as db:
            seed(db)
            from .seed import sync_content
            sync_content(db)
    purge_expired_chats()
    purger = None
    if s.demo_mode:
        from . import demosite
        demosite.ensure_template()
        demosite.purge()

        async def _nightly() -> None:            # copies expire 24 h after last use; and once a day everything is reset
            from datetime import datetime, timezone
            last_reset = datetime.now(timezone.utc).date() if datetime.now(timezone.utc).hour >= s.demo_reset_hour_utc else None
            while True:
                await asyncio.sleep(600)
                try:
                    now = datetime.now(timezone.utc)
                    if demosite.nightly_reset_due(now, last_reset):
                        demosite.nightly_reset()
                        last_reset = now.date()
                    else:
                        demosite.purge()
                except Exception:  # noqa: BLE001
                    logging.getLogger("uvicorn.error").exception("demo purge failed")
        purger = asyncio.create_task(_nightly())
    warm = asyncio.create_task(_warm_models()) if s.warm_on_start and s.inference_backend != "stub" else None
    yield
    if warm:
        warm.cancel()
    if purger:
        purger.cancel()


def create_app() -> FastAPI:
    from . import branding
    app = FastAPI(title=f"{branding.product_name()} API", version=__version__, lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")

    @app.exception_handler(HTTPException)
    async def http_err(_: Request, exc: HTTPException):
        d = exc.detail if isinstance(exc.detail, dict) else {"code": "error", "message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content={"error": d})

    @app.exception_handler(RequestValidationError)
    async def validation_err(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": {"code": "invalid", "message": "That request wasn't valid.", "fields": [".".join(map(str, e["loc"][1:])) for e in exc.errors()]}})

    from .demosite import DemoMiddleware
    app.add_middleware(DemoMiddleware)
    for r in (config_router, learner, auth, learn, assignments, ai, safety, teacher, progress, system, explore, library, build, curriculum, documents, teacher_work, lesson_builder, admin, revision, notifications, demo_router, discovery_router):
        app.include_router(r.router)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": __version__, "instance": get_settings().instance}

    dist = get_settings().web_dist
    if dist and (dist / "index.html").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            f = (dist / path).resolve()
            if path and f.is_file() and dist.resolve() in f.parents:
                return FileResponse(f)
            return FileResponse(dist / "index.html")
    return app


app = create_app()
