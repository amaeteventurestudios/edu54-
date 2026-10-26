"""Alembic environment. Driven from code (umanah_api.migrate), never from an alembic.ini: the connection is handed in."""
from alembic import context

from umanah_api import models  # noqa: F401  (register tables on Base.metadata)
from umanah_api.db import Base

target_metadata = Base.metadata


def run() -> None:
    connection = context.config.attributes["connection"]
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


run()
