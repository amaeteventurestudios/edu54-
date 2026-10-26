from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pytest

os.environ["UMANAH_INFERENCE_BACKEND"] = "stub"
os.environ["UMANAH_DEMO_PASSWORD"] = "test-password-1"
os.environ["UMANAH_WEB_DIST"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from umanah_api.config import get_settings  # noqa: E402
from umanah_api.tutor import adapters, service  # noqa: E402

PW = "test-password-1"


@pytest.fixture(scope="session")
def template_dir():
    """Seed once; every test gets its own copy so tests never leak state into each other."""
    from umanah_api import db as dbm
    from umanah_api.main import create_app
    d = Path(tempfile.mkdtemp(prefix="umanah-template-"))
    os.environ["UMANAH_DATA_DIR"] = str(d)
    get_settings.cache_clear()
    with TestClient(create_app()):
        pass
    dbm.engine().dispose()
    return d


@pytest.fixture()
def app(template_dir):
    from umanah_api.main import create_app
    d = Path(tempfile.mkdtemp(prefix="umanah-test-"))
    shutil.copy(template_dir / "umanah.sqlite3", d / "umanah.sqlite3")
    os.environ["UMANAH_DATA_DIR"] = str(d)
    get_settings.cache_clear()
    a = create_app()
    with TestClient(a):           # runs the lifespan: opens the engine on this test's copy
        adapters.set_adapter(adapters.StubInferenceAdapter())
        service.reset_slots()
        yield a
    adapters.set_adapter(None)
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture()
def client(app):
    return TestClient(app)


@pytest.fixture()
def stub(app):
    return adapters.get_adapter()


def login(app, username: str) -> TestClient:
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"username": username, "password": PW})
    assert r.status_code == 200, r.text
    c.headers["X-CSRF-Token"] = r.json()["csrf"]
    return c


@pytest.fixture()
def student(app):
    return login(app, "jordan")


@pytest.fixture()
def teacher(app):
    return login(app, "mswilliams")


@pytest.fixture()
def counselor(app):
    return login(app, "msrivera")
