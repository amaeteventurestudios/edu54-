import sqlite3

import pytest
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from umanah_api import migrate, models  # noqa: F401
from umanah_api.db import Base


@pytest.fixture()
def engine(tmp_path):
    e = create_engine(f"sqlite:///{tmp_path / 'm.sqlite3'}")
    yield e
    e.dispose()


def test_fresh_database_is_created_by_migrations_at_head(engine):
    assert migrate.prepare(engine) == "created"
    assert migrate.current_revision(engine) == migrate.head_revision()
    assert {"users", "ai_conversations", "login_attempts"} <= set(inspect(engine).get_table_names())


def test_models_and_migrations_agree(engine):
    """A model change without a migration fails here: run `migrate.revision(engine, "what changed")`, review, commit."""
    migrate.prepare(engine)
    with engine.connect() as c:
        diff = compare_metadata(MigrationContext.configure(c, opts={"compare_type": True}), Base.metadata)
    assert diff == []


def test_database_from_the_old_create_all_is_stamped_not_touched(engine, tmp_path):
    """A database made before Alembic (schema == baseline 0001, no version table) is stamped, then upgraded with its data intact."""
    with engine.begin() as c:
        migrate.command.upgrade(migrate._config(c), migrate.BASELINE)
        c.exec_driver_sql("DROP TABLE alembic_version")
        c.exec_driver_sql("INSERT INTO schools (name, local_slug, settings, created_at) VALUES ('Kept', 'kept', '{}', '2026-01-01 00:00:00')")
    assert migrate.current_revision(engine) is None
    assert migrate.prepare(engine) == "upgraded"
    assert migrate.current_revision(engine) == migrate.head_revision()
    with engine.connect() as c:
        assert c.exec_driver_sql("SELECT name FROM schools").scalar() == "Kept"
    assert len(list(tmp_path.glob("m.sqlite3.pre-0001-to-*.bak"))) == 1


def test_prepare_is_idempotent(engine):
    migrate.prepare(engine)
    assert migrate.prepare(engine) == "current"


def test_pending_migration_takes_a_backup_first(engine, tmp_path, monkeypatch):
    migrate.prepare(engine)
    with engine.begin() as c:
        c.exec_driver_sql("UPDATE alembic_version SET version_num = 'older'")
        c.exec_driver_sql("INSERT INTO schools (name, local_slug, settings, created_at) VALUES ('Kept', 'kept', '{}', '2026-01-01 00:00:00')")
    monkeypatch.setattr(migrate, "current_revision", lambda e: "older")
    calls = []
    monkeypatch.setattr(migrate.command, "upgrade", lambda cfg, rev: calls.append(rev))
    assert migrate.prepare(engine) == "upgraded"
    backups = list(tmp_path.glob("m.sqlite3.pre-older-to-*.bak"))
    assert len(backups) == 1 and calls == ["head"]
    assert sqlite3.connect(backups[0]).execute("SELECT name FROM schools").fetchone()[0] == "Kept"
