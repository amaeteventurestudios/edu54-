import asyncio

from fastapi.testclient import TestClient

from umanah_api import main as main_mod
from umanah_api.config import get_settings
from umanah_api.tutor import adapters
from umanah_api.tutor.adapters import OllamaInferenceAdapter


class Recorder(OllamaInferenceAdapter):
    def __init__(self):
        super().__init__("http://127.0.0.1:1", 1)
        self.calls: list[tuple[str, int]] = []

    async def available(self) -> bool:
        return True

    async def chat(self, model, messages, *, max_tokens=200, temperature=0.0):
        self.calls.append((model, len(messages)))
        return "ok"


def test_warm_loads_safety_triage_and_tutor_shapes(monkeypatch):
    rec = Recorder()
    monkeypatch.setattr(adapters, "_adapter", rec)
    asyncio.run(main_mod._warm_models())
    models = [m for m, _ in rec.calls]
    assert models == [get_settings().safety_model, get_settings().tutor_model, get_settings().tutor_model]
    assert rec.calls[1][1] > 20            # triage: the long few-shot prefix is what gets primed
    assert rec.calls[2][1] == 2            # tutor: system + user


def test_app_starts_with_warmup_enabled_and_runtime_down(monkeypatch, tmp_path):
    """Regression: the warm-up task must not break start-up (or block it) when the runtime is unreachable."""
    monkeypatch.setenv("UMANAH_INFERENCE_BACKEND", "ollama")
    monkeypatch.setenv("UMANAH_OLLAMA_URL", "http://127.0.0.1:1")
    monkeypatch.setenv("UMANAH_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(adapters, "_adapter", None)
    get_settings.cache_clear()
    try:
        with TestClient(main_mod.create_app()) as c:
            assert c.get("/api/health").json()["status"] == "ok"
    finally:
        get_settings.cache_clear()
        adapters._adapter = None
