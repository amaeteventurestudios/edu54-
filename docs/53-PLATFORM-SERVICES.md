# Platform Services — Everything Installed on the AI Node

> Facts: `00-START-HERE.md`. Host specifics (paths, Docker setup, ports): `../ops/AI-NODE-01.md`. Decided 2026-09-24 by the owner: install the full open-source platform now, not in later phases.

## What gets installed

All of it lives on the data drive (`/srv/ai-node/storage/data/`), runs in Docker (rootless, data on the drive) except where noted, and is started and stopped with `umanah-lab`.

| Service | What it does for Umanah | License | Who sees it | Port (ai-node-01) |
|---|---|---|---|---|
| **Umanah web** (React + Vite + shadcn/ui) | the student and teacher app in the reference images | Umanah | everyone | 8100 |
| **Umanah API** (FastAPI + SQLite) | accounts, lessons, progress, XP, tutor rules, safety pipeline, adapters to everything below | Umanah | via web only | 8101 |
| **Ollama** | runs the AI models | MIT | via API only | 8120 (localhost only) |
| **Moodle** (+ MariaDB) | full LMS engine: courses, assignments, quizzes, gradebook, badges | GPL-3.0 | teachers/admins on the LAN at `/lms`; students only through Umanah | 8110 |
| **Kolibri** | offline content library and channels (Khan Academy, CK-12, PhET and more) | MIT | content served inside Umanah Learn/Explore; Kolibri admin for admins | 8111 |
| **Kiwix server** | offline Wikipedia and other ZIM libraries | GPL-3.0 | content served inside Umanah Explore | 8112 |
| **JupyterHub** | full notebooks for advanced Build projects and teachers | BSD-3-Clause | opened from Build ("Open in notebook") for allowed classes; admins | 8113 |
| **Open WebUI** | admin/staff console to test models and prompts | its own open-source license (check current terms; branding clause) | Umanah staff and school admins only, never students | 8114 |
| **Pyodide** | quick Python in the student's browser (lessons, Build basics) | MPL-2.0 | students, inside Umanah | served by web |

Everything above is **installed**. Not everything needs to **run** at once (see Profiles).

## The product rule still holds

Students and teachers experience **one Umanah product**. Moodle, Kolibri, Kiwix, JupyterHub and Open WebUI are engines behind it:

- Umanah pages call them through adapters (`MoodleLearningAdapter`, `KolibriContentAdapter`, `KiwixLibraryAdapter`, `JupyterExecutionAdapter`, `InferenceAdapter`).
- Their own web interfaces are reachable only on the local network or Tailscale, only for admin/teacher roles, and are never linked from student screens. They are never exposed on `ai.umanah.org`.
- Where a student must use an engine's own screen (for example a Jupyter notebook), it opens framed by the Umanah header with the Umanah theme applied where the engine allows.

## How the engines fit the slice

| Area | v1 source of truth | Engine role in Phase 1 |
|---|---|---|
| Accounts | Umanah API | Umanah creates matching Moodle/Kolibri/Jupyter users as needed (single sign-on via Umanah where the engine supports it; otherwise service accounts) |
| Lessons, progress, XP, tutor rules | Umanah API | Moodle installed, configured, reachable, with the Lesson 6 course mirrored; sync adapter stub with tests |
| Assignments and grades | Umanah API | pushed to the Moodle gradebook by the adapter (one-way in Phase 1) |
| Library content | Kiwix + Kolibri | Explore search queries Kiwix and Kolibri and shows results in Umanah screens |
| Code | Pyodide | JupyterHub reachable for teachers and "Open in notebook" for allowed classes |
| AI | Ollama | Open WebUI for staff testing only |

Deciding later whether Moodle or the Umanah service owns courses long-term is still open (`10`); both are installed and connected now.

## Models (pinned for ai-node-01)

| Role | Model (via Ollama) | License | Approx. size |
|---|---|---|---|
| AI tutor | **Qwen3 4B Instruct**, 4-bit (or the newest small Qwen instruct model if one has replaced it; record which) | Apache 2.0 | ~2.5–3 GB |
| Safety classifier | **Qwen3Guard** small variant if available in a runnable format; otherwise **Llama Guard 3 1B** | Apache 2.0 / Llama license (attribution required) | ~1–2 GB |
| Embeddings (search) | **nomic-embed-text** | Apache 2.0 | ~0.3 GB |

Rules: verify each model's license at download and record name, version, source, checksum and license in the model registry (`25`). On the Mac mini (Phase 6), benchmark a larger Qwen (~14B) as the tutor.

## Profiles (installed ≠ running)

The Beelink has ~12 GB RAM and already runs other workloads. Services are grouped so only what's needed runs:

| Profile | Services | Approx. RAM when running |
|---|---|---|
| `core` (default) | web, API, Ollama with tutor + safety + embeddings | ~5–6 GB with models loaded |
| `content` | Kolibri, Kiwix | ~0.5 GB |
| `lms` | Moodle + MariaDB | ~1–1.5 GB |
| `code` | JupyterHub (+ ~0.3 GB per active notebook) | ~0.5 GB+ |
| `admin` | Open WebUI | ~0.7 GB |

```text
umanah-lab start                 # core
umanah-lab start core content    # core + library
umanah-lab start all             # everything (check free RAM first; the command warns if < 2 GB would remain)
umanah-lab stop | status | restart
```

## Storage budget on the 128 GB data drive

About 115 GB is free after the HUNGREE Goat music (~6 GB).

| Item | Budget |
|---|---|
| Docker images and volumes (all services) | 25 GB |
| AI models | 10 GB |
| Kiwix libraries (choose ZIMs to fit: a Wikipedia subset without images, PhET, Wiktionary, school-appropriate collections) | 25 GB |
| Kolibri channels (start with Khan Academy selections, CK-12, PhET) | 15 GB |
| Moodle data + database | 5 GB |
| Umanah code, builds, database, projects, logs | 5 GB |
| Backups | 10 GB |
| Free headroom (kept for the drive's other uses) | ~20 GB |

The full English Wikipedia with images (~100 GB+) does not fit. If the drive is also going to hold other apps, a larger external SSD (1–2 TB) is the next upgrade; the layout moves over unchanged.

## Health

Each service reports to the Umanah Lab Status page (`24`): running/stopped (by profile), healthy/degraded, version, disk used. A stopped profile shows as "Off (on demand)", not as an error.

## Verified on ai-node-01 (2026-09-24)

Each profile was started alone on the rootless daemon, passed its health check, and was stopped again (`tools/umanah-lab/try-profile.sh`, which also stops the profile if free RAM would fall below 1.5 GB). Core (web, API, Ollama with the tutor + safety models resident) stayed up throughout.

| Profile | Health check | Ready after | Free RAM while running | Notes |
|---|---|---|---|---|
| content: Kolibri | `:8111/` → 302 to its first-run setup | 10 s | 2.3 GB (with Kiwix) | Channels are imported by an admin in Kolibri; not done yet. |
| content: Kiwix | `:8112/` → 200 | 10 s | | Serves Simple English Wikipedia (mini, 469 MB, checksum verified). Kiwix will not start on an empty library: `umanah-lab kiwix-add <zim>`. |
| lms: MariaDB + Moodle | `:8110/login/index.php` → 200 | 251 s first boot (installs the schema) | 2.5 GB | Needed a UTF-8 default database; first-boot install is slow, later starts are not. Image is `bitnamilegacy` (no updates; follow-up in docs/40). |
| code: JupyterHub | `:8113/hub/health` → 200 | 10 s | 2.7 GB | Local image. |
| admin: Open WebUI | `:8114/health` → 200 | 131 s | 3.8 GB | Image is `:main` (pin a digest before a pilot). |

Rootless Docker publishes `127.0.0.1:<port>` for every mapping, so each service has exactly one mapping (`UMANAH_BIND`, default `0.0.0.0`); see `40-DECISION-LOG.md`. Lab Status reports each engine as `ready`, `off` (not started: normal) or `unavailable` (answering badly), using Umanah's own words, never product names.

