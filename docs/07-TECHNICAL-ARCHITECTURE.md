# Technical Architecture

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Architectural thesis

Umanah LabOS is the product boundary. Open-source engines are replaceable implementation components behind stable Umanah-owned interfaces.

## Logical planes

### Learning plane
Local, school-facing runtime: users, lessons, assignments, progress, AI tutoring, code execution, knowledge library.

### Model plane
Inference runtimes, model registry, embeddings, model role assignment, resource limits.

### Data plane
Local durable state: identities, course progress, assignments, submissions, resources, model metadata, device configuration.

### Management plane
Secure remote health, updates, diagnostics, deployment enrollment, software/model/curriculum versions. Optional for daily learning.

### Presentation plane
Umanah web interface for students, teachers, admins.

## Service boundaries

Candidate services/modules:
- `web` — unified browser UI.
- `api` — Umanah application API / policy layer.
- `learning` — courses, lessons, assignments, revision, assessments.
- `ai` — mode resolution, context construction, model invocation (`42`).
- `safety` — input/output screening, support responses, safety events and alerts (`41`).
- `coding` — sandboxed execution and projects.
- `knowledge` — ingestion, indexing, retrieval, citations.
- `identity` — local users/roles/session handling.
- `telemetry-agent` — machine health, version reporting, update coordination.

On constrained hardware these may be modules within fewer processes; logical separation does not require microservices.

## Hardware-aware deployment profiles

LabOS detects architecture, RAM, available accelerators, storage, and concurrency profile. It selects approved model/runtime settings and feature limits appropriate to the device tier.

## Failure isolation

A bad model file should not crash the entire app. Code execution should be isolated. Knowledge indexing failures should not disable lessons. Remote management outages should not disable local auth or learning.

## Upgrade strategy

Version all major artifacts: LabOS release, schema, curriculum pack, model pack, configuration policy. Upgrades must be transactional or rollback-capable.

## v1 technology stack (decided 2026-09-24)

| Layer | Choice | Why |
|---|---|---|
| Front end | React + Vite + TypeScript, shadcn/ui + Radix, Tailwind themed to Umanah tokens | static build served by the appliance; no Node server needed at runtime; works offline as an installable web app |
| API | FastAPI (Python) | light, typed, same language as AI and data tooling |
| Database | SQLite (WAL mode), migrations with Alembic | one file, easy backup, enough for one school; PostgreSQL later for central services |
| Model runtime | Ollama first, behind an `InferenceAdapter`; llama.cpp server as alternative | fast to set up; swappable without touching product code |
| Safety classifier | small local classifier model + rules layer, behind a `SafetyAdapter` | `41` |
| Embeddings / search | local embedding model + SQLite full-text search; vector index file on disk | offline, small |
| Python for students | Pyodide in the browser | `12` |
| Reverse proxy / TLS | Caddy | simple HTTPS, including DNS-challenge certificates (`45`) |
| Process management | Docker Compose with profiles (`core`, `content`, `lms`, `code`, `admin`) behind one `umanah-lab` command; on ai-node-01 a rootless Docker daemon with data on the data drive | one command; installed ≠ running (`53`) |
| Engines | Moodle, Kolibri, Kiwix, JupyterHub, Open WebUI, behind Umanah adapters | installed now (`53`) |
| End-to-end tests | Playwright | `30` |

Repository layout:

```text
apps/web/            React front end
services/api/        FastAPI app (learning, ai, safety, identity, knowledge modules)
services/api/evals/  tutor accuracy, jailbreak and safety eval sets (42, 41)
content/             lesson packs (Lesson 6 first)
tools/               umanah-lab CLI, loadtest, packaging
docs/  ops/          this pack
```

On `ai-node-01` everything runs from the data drive (`../ops/AI-NODE-01.md`). On Mac appliances the model runtime runs natively on macOS so it can use the Apple GPU (Docker on macOS cannot); the other services stay in Docker.
