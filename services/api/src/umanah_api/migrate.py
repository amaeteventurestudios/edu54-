"""Schema migrations (docs/18: versioned migrations, backup before risky ones, recovery plan).

    prepare(engine)   called at start-up: fresh DB -> create via migrations; DB made by the old create_all -> stamp the
                      baseline (no data touched); older revision -> back up the file, then upgrade.

Add a change with:  uv run alembic-revision "what changed"   (see `revision()` below), review the generated file, commit it.
A test fails if the models and the migrations disagree, so a model change without a migration cannot ship.
"""
from __future__ import annotations

import shutil
import sqlite3
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

HERE = Path(__file__).parent
BASELINE = "0001"


def _config(connection=None) -> Config:
    cfg = Config()
    cfg.set_main_option("script_location", str(HERE / "migrations"))
    if connection is not None:
        cfg.attributes["connection"] = connection
    return cfg


def current_revision(engine: Engine) -> str | None:
    with engine.connect() as c:
        return MigrationContext.configure(c).get_current_revision()


def head_revision() -> str:
    return ScriptDirectory.from_config(_config()).get_current_head()


def _backup_sqlite(engine: Engine, tag: str) -> Path | None:
    db = engine.url.database
    if not db or db == ":memory:" or not Path(db).exists():
        return None
    dest = Path(f"{db}.pre-{tag}-{time.strftime('%Y%m%d-%H%M%S')}.bak")
    src, dst = sqlite3.connect(db), sqlite3.connect(dest)
    with dst:
        src.backup(dst)                      # consistent even with the WAL in use
    src.close(); dst.close()
    return dest


def prepare(engine: Engine) -> str:
    """Bring the database to the current schema. Returns what was done: created | stamped | upgraded | current."""
    tables = set(inspect(engine).get_table_names())
    have = current_revision(engine)
    head = head_revision()
    if have is None and "users" in tables:
        # Created by the pre-Alembic create_all: identical to the baseline, so record that instead of re-creating.
        with engine.begin() as c:
            command.stamp(_config(c), BASELINE)
        have, action = BASELINE, "stamped"
    elif have is None:
        action = "created"
    else:
        action = "current"
    if have != head:
        if have is not None:
            _backup_sqlite(engine, f"{have}-to-{head}")
            action = "upgraded"
        with engine.begin() as c:
            command.upgrade(_config(c), "head")
    return action


def revision(engine: Engine, message: str, rev_id: str | None = None) -> None:
    """Developer helper: autogenerate a migration from the model diff (writes into migrations/versions/)."""
    with engine.connect() as c:
        command.revision(_config(c), message=message, autogenerate=True, rev_id=rev_id)
