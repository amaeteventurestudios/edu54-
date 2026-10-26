"""SQLite (WAL) engine and session handling."""
from __future__ import annotations

from collections import OrderedDict
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar, Token
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


_engine: Engine | None = None
_Session: sessionmaker[Session] | None = None


def _make(url: str) -> tuple[Engine, sessionmaker[Session]]:
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    eng = create_engine(url, **kwargs)

    if url.startswith("sqlite"):
        @event.listens_for(eng, "connect")
        def _pragmas(dbapi_conn, _):  # noqa: ANN001
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")      # USB flash endurance + concurrent readers
            cur.execute("PRAGMA synchronous=NORMAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.execute("PRAGMA busy_timeout=5000")
            cur.close()
    return eng, sessionmaker(eng, expire_on_commit=False)


def init_engine(url: str) -> Engine:
    global _engine, _Session
    _engine, _Session = _make(url)
    return _engine


# ---- per-visitor databases for the public demo (docs/46) -------------------------------------------------------------
# A request may be pointed at a different SQLite file. The choice lives in a context variable, so it follows the request
# through threads and streamed responses, and can never leak from one visitor to another.
_current: ContextVar[str | None] = ContextVar("umanah_database", default=None)
_visitors: "OrderedDict[str, tuple[Engine, sessionmaker[Session]]]" = OrderedDict()
_MAX_OPEN = 48


def use_database(path: Path | str | None) -> Token:
    return _current.set(str(path) if path else None)


def reset_database(token: Token) -> None:
    _current.reset(token)


def current_key() -> str | None:
    return _current.get()


def using_visitor_database() -> bool:
    return _current.get() is not None


def _pair() -> tuple[Engine, sessionmaker[Session]]:
    key = _current.get()
    if key is None:
        assert _engine is not None and _Session is not None, "init_engine() not called"
        return _engine, _Session
    pair = _visitors.get(key)
    if pair is None:
        pair = _make(f"sqlite:///{key}")
        _visitors[key] = pair
        while len(_visitors) > _MAX_OPEN:
            _, (old, _sm) = _visitors.popitem(last=False)
            old.dispose()
    else:
        _visitors.move_to_end(key)
    return pair


def forget_database(path: Path | str) -> None:
    """Close the connection to a visitor's file before it is deleted."""
    pair = _visitors.pop(str(path), None)
    if pair:
        pair[0].dispose()


def engine() -> Engine:
    return _pair()[0]


def get_db() -> Iterator[Session]:
    db = _pair()[1]()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    db = _pair()[1]()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def new_session() -> Session:
    return _pair()[1]()
