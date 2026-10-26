"""Runtime configuration. Everything comes from UMANAH_* environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="UMANAH_", env_file=None, extra="ignore", populate_by_name=True)

    # Where durable state lives. On ai-node-01 this is the SSD (ops/AI-NODE-01.md).
    data_dir: Path = Path("/srv/ai-node/storage/ssd/umanah-ai-lab/database")
    control_dir: Path | None = None    # where Admin > Services drops requests for the host-side helper (mounted from <root>/control); default <data>/control

    content_dir: Path = REPO_ROOT / "content"
    # Brand and edition (docs/edu54/CLAUDE.md §3): one codebase, two switches. Umanah with the AI Lab's own wording stays the
    # default, so the AI Lab build is unchanged. LABOS_BRAND / LABOS_EDITION are accepted as well as the UMANAH_ names.
    brand: str = Field("umanah", validation_alias=AliasChoices("LABOS_BRAND", "UMANAH_BRAND"))
    edition: str = Field("", validation_alias=AliasChoices("LABOS_EDITION", "UMANAH_EDITION"))   # "" (AI Lab default) | k12 | university
    labos_config_dir: Path = REPO_ROOT / "config"   # brand.<id>.json, editions.yaml, content-allowlist.yaml
    credentials_file: Path | None = None             # where the demo seed writes its logins (default <data>/demo-credentials.txt)
    knowledge_catalog: Path | None = None           # accepted content items with license metadata (licensing.py), for the Attributions page
    kiwix_books: str = ""                            # comma list of book-name prefixes this edition's Explore may show ("" = all)
    school_display: str = ""                         # customer box: "EDU54 · <institution>" on the sign-in page and top bar
    safety_country: str = "US"                       # which help resources the safety responses show (docs/41; safety/responses.py)
    status_note: str = ""                            # shown on Lab Status to staff, e.g. "This demo node runs the small model"
    web_dist: Path | None = REPO_ROOT / "apps" / "web" / "dist"

    @field_validator("web_dist", mode="before")
    @classmethod
    def _empty_is_none(cls, v):
        return None if v in ("", None) else v

    # Inference (docs/11, 25, 53). "stub" is a deterministic offline backend used by tests.
    inference_backend: str = "ollama"  # ollama | stub
    ollama_url: str = "http://127.0.0.1:8120"
    tutor_model: str = "qwen3:4b-instruct"
    safety_model: str = "llama-guard3:1b"
    embed_model: str = "nomic-embed-text"
    inference_timeout_s: float = 90.0
    keep_alive: str = "-1"  # Ollama: keep the tutor + safety models resident (a cold load from disk costs 30-100 s); "10m" on a shared box
    tutor_num_ctx: int = 4096  # per slot; the runtime reserves num_ctx x parallel slots of KV cache, so this sets slot memory (docs/43)
    warm_on_start: bool = True  # load the models and prime the shared prompt prefixes at start-up (docs/43)
    max_parallel_inference: int = 2  # ai-node-01 is a dev host: 2-4 slots (docs/43)
    tutor_max_words: int = 150
    engines: str = ""  # "moodle=http://…,kolibri=http://…": engines whose health Lab Status reports (set by compose)
    library_content_dir: Path | None = None  # the content library's files (Kolibri content/, mounted read-only): videos, apps, books

    # Sessions / auth (docs/19)
    session_hours: int = 12
    secure_cookies: bool = False  # LAN over http; set true behind TLS
    login_max_failures: int = 5
    login_window_minutes: int = 15
    admin_login_per_ip_hour: int = 20      # public demo only: password attempts on the admin account per address per hour

    # Public try-it demo (docs/46): "Try as a student / teacher" with no password, one private copy of the fictional school per visitor.
    demo_mode: bool = False
    demo_all_logins: bool = False           # a LAN demo box (EDU54): the try-it buttons AND every demo account's password sign-in; the public demo keeps False
    demo_max_visitors: int = 300           # oldest visitor copies are deleted beyond this
    demo_visitor_hours: int = 24           # a visitor's copy lives this long (and everything is purged nightly)
    demo_reset_hour_utc: int = 10          # every visitor copy is deleted once a day at this UTC hour (10 = 03:00 in Pacific summer time)
    demo_visitors_per_ip_hour: int = 12    # new visitor copies one address may start per hour
    demo_tutor_per_visitor_hour: int = 20  # tutor messages per visitor per hour (docs/46)
    demo_tutor_per_ip_hour: int = 80       # tutor messages per address per hour, across visitors

    # "demo" on the always-on demo appliance, "scratch" for dev servers and tests: load tests refuse to write to "demo" (docs/46)
    instance: str = "scratch"

    # Seeding
    demo_seed: bool = True
    demo_password: str | None = None  # tests only; otherwise random per install and written to credentials file

    # Data retention (docs/41 defaults, school-configurable)
    chat_retention_days: int = 90

    @property
    def demo_dir(self) -> Path:
        return self.data_dir / "demo"

    @property
    def control_path(self) -> Path:
        return self.control_dir or self.data_dir / "control"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "umanah.sqlite3"


@lru_cache
def get_settings() -> Settings:
    return Settings()
