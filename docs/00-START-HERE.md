# Umanah AI Lab — Start Here

The first document anyone reads before changing the project. It holds the **only copy** of the canonical project facts, says what is decided and what is still open, and maps the rest of the docs.

Pack version: **v2 — 2026-09-24**. What changed from v1 is listed in `../CHANGELOG.md`.

## Canonical project facts

| Item | Value |
|---|---|
| Organization | Umanah Institute (nonprofit) |
| Public product | **Umanah AI Lab** |
| Platform software | **Umanah LabOS** |
| Public product page | `https://umanah.org/ai-lab` |
| App / interactive demo | `https://ai.umanah.org` |
| Deployment sizes | AI Lab Mini · AI Lab School · AI Lab Research |
| Target school hardware (AI Lab Mini, candidate) | Mac mini, M5 Pro, 64 GB unified memory, 2 TB SSD (see `26-HARDWARE-TIERS.md`) |
| Current development host | `ai-node-01` (Beelink, Ryzen 7 5800H, ~12 GB RAM, Ubuntu 26.04.1). Details: `../ops/AI-NODE-01.md` |
| Low-resource test device | Raspberry Pi 4 (`pi-node-01`) — optional validation only, not a product tier |
| App repository | `amaeteventurestudios/umanah-ai-lab` (private during development) |
| Website repository (umanah.org) | `https://github.com/amaeteventurestudios/ui` — static HTML/CSS/JS; the `/ai-lab` page is added here (`03`) |
| Fundraising goal | $100,000 (see `36-FUNDRAISING-SPONSORSHIP.md`) |

**Positioning:** a school-owned AI learning appliance. It works offline, keeps student data on site, and replaces per-student AI subscriptions with one shared box.

**Principles:**

- **Locally independent. Centrally supported.** Learning never depends on Umanah's servers; support and updates do.
- **We monitor the machine. We do not monitor the child.** Machine health goes to Umanah; student conversations stay at the school. Safety alerts go to the school's own designated staff, never to Umanah (`41-SAFEGUARDING-CHILD-SAFETY.md`).
- **One coherent product.** Students and teachers see Umanah, never a patchwork of third-party dashboards.
- **Adopt, don't rebuild.** Use mature open-source engines where they fit; build the Umanah experience, curriculum, policy, safety and deployment layer around them.

## What is decided

1. Umanah AI Lab is the product; Umanah LabOS is the platform.
2. `umanah.org/ai-lab` is the information page; `ai.umanah.org` is the app/demo.
3. Student navigation is five verbs, identical on every screen: **Ask, Learn, Build, Explore, Progress** (plus Home).
4. Teachers get a Teacher Center; school admins get a separate admin area.
5. Core learning works with the internet unplugged.
6. Remote support is a management plane, never a runtime dependency.
7. Student conversations are not sent to Umanah by default.
8. **Child safety is built in from the first slice**: input/output screening, crisis response, school-designated safety contacts (`41`).
9. **Tutor limits are enforced by the server**, not only by the prompt, and are set by the teacher/assignment, never toggled by the student (`42`).
10. **v1 stack:** React + Vite + TypeScript + shadcn/ui front end; FastAPI (Python) API; SQLite; Ollama for models; Pyodide for quick student Python; all run in Docker Compose (`07`, `53`).
11. **Full open-source platform installed now** (owner decision): Moodle, Kolibri, Kiwix, JupyterHub and Open WebUI, all behind the Umanah experience, started on demand by profile (`53`).
12. **Pinned models for ai-node-01:** Qwen3 4B Instruct (tutor), a small Qwen3Guard or Llama Guard 3 1B (safety), nomic-embed-text (search) (`53`, `25`).
13. On `ai-node-01`, everything runs from the data drive `/srv/ai-node/storage/data` (renamed from `/media/hungree-goat`), using a separate rootless Docker daemon whose data lives on that drive (`../ops/AI-NODE-01.md`).
14. On Mac hardware, the model runtime runs natively on macOS (Docker on Mac cannot use the Apple GPU); other services may be containerized (`26`).
15. The public demo runs on an always-on server with demo data, separate from the development host (`46`).
16. First build target is one complete vertical slice: **Python Foundations, Lesson 6 — Loops** (`44`).

## What is still open (benchmark, then decide and log)

- Exact tutor model and safety-classifier model per hardware tier (`25`, `43`).
- Final AI Lab Mini configuration and price (`26`, `36`).
- Long-term owner of courses: Umanah service or Moodle (both installed and connected now) (`10`, `53`).
- Classroom concurrency limits per tier (`43`).
- Central fleet service implementation (`22`).

Open questions are not a reason to stop. Benchmark and choose.

## Reading map by type of work

| Work | Read |
|---|---|
| Any coding session | `../CLAUDE.md`, `44`, `39`, `32`, `34`, `40` |
| UI / front end | `04`, `05`, `06`, `16`, `17`, `49` |
| AI tutor / Ask | `11`, `41`, `42`, `43`, `25` |
| Learning, curriculum, content | `10`, `14`, `15`, `47` |
| Backend, data, auth | `07`, `18`, `19`, `20`, `21`, `23`, `50` |
| Deployment, hardware, schools | `22`, `24`, `26`, `28`, `29`, `45`, `46`, `53` |
| Licensing | `08`, `09`, `31`, `47` |
| Fundraising, pilots, positioning | `02`, `03`, `35`, `36`, `37`, `38`, `48`, `51`, `52` |
| Development host | `../ops/AI-NODE-01.md` |

## Document list

`00` Start here · `01` Vision · `02` Naming & positioning · `03` Public website · `04` App structure · `05` Screen specs · `06` Design system · `07` Technical architecture · `08` Open-source stack · `09` Chatty-EDU · `10` Learning engine · `11` Local AI engine · `12` Build Lab · `13` Knowledge Library · `14` Curriculum · `15` Gamification · `16` Student experience · `17` Teacher Center · `18` Data model · `19` Identity & auth · `20` API contracts · `21` Offline-first · `22` Remote management · `23` Privacy & security · `24` Observability · `25` Model strategy · `26` Hardware tiers · `27` Raspberry Pi validation · `28` Installer · `29` Deployment operations · `30` Testing · `31` Licensing · `32` Git workflow · `33` Agent operating notes · `34` Skills · `35` Pilot · `36` Fundraising · `37` Impact · `38` Legal & governance · `39` Roadmap · `40` Decision log

**New in v2:** `41` Safeguarding & child safety · `42` AI tutor policy & evaluation · `43` Concurrency & performance budget · `44` Vertical slice 001 · `45` School IT deployment · `46` Public demo · `47` Open educational resources (MIT, Harvard, others) · `48` Landscape & positioning · `49` Accessibility & languages · `50` Student data privacy compliance · `51` Sustainability & cost of ownership · `52` Risk register · `53` Platform services (everything installed, ports, profiles, models, storage budget)

## Definition of success for Prototype #001

A sponsor, teacher or student uses the demo and understands the product without being told what is underneath. A student logs in, continues Lesson 6, asks the tutor in lesson context, gets hints (not answers) on homework, runs Python, earns XP, and sees progress. A teacher sees the class, the submission and who needs help. A student typing something alarming gets a safe, caring response and the designated school contact is alerted. All of this works with the internet unplugged. Umanah can check device health without public SSH.
