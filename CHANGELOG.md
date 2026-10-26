# Changelog

## v2.5 — 2026-09-24

- HUNGREE Goat: source repo `amaeteventurestudios/hungreegoat` recorded; `~/hungree-goat` is the deployed runtime. Path change goes through the repo (`HGC_MEDIA`), deployed with its own procedure; four user units verified after restart. Removed the `git init ~/hungree-goat` step.

## v2.4 — 2026-09-24 (after the ai-node-01 audit)

- Routing: VPS runs nginx and is not on Tailscale → nginx server block + certbot + Tailscale join (owner login) + resting page (`ops/AI-NODE-01.md`, `docs/46`).
- Drive rename: clean up the stale double mount first.
- USG Grid: exact fix location (`scripts/collect-ai-node-01.sh:64`), card and Fleet Storage panel spec.
- Ollama not installed: fresh install; Hermes stays on OpenRouter.
- Website repo `amaeteventurestudios/ui` added to facts and `docs/03`.

## v2.3 — 2026-09-24

- **Full platform now** (owner decision): new `docs/53-PLATFORM-SERVICES.md` — Moodle, Kolibri, Kiwix, JupyterHub, Open WebUI, Ollama and the Umanah app in Docker Compose profiles, with ports, integration rules, RAM and storage budgets.
- **Pinned models:** Qwen3 4B Instruct (tutor), Qwen3Guard small or Llama Guard 3 1B (safety), nomic-embed-text (search).
- **Data drive renamed:** SanDisk → label `AI_NODE_DATA`, mounted `/srv/ai-node/storage/data`; step-by-step rename with music checksums, HUNGREE Goat path update, temporary symlink and reboot test (`ops/AI-NODE-01.md`).
- **Rootless Docker** for the data drive, leaving the existing system Docker untouched.
- Slice 001 gains S0 (drive rename + Grid card) and S1 (platform install); `00`, `07`, `10`, `12`, `13`, `25`, `39`, `40`, `CLAUDE.md` updated.

## v2.2 — 2026-09-24

- `design/reference/`: the 10 app screens and the website concept, renamed `00`–`10` by screen, plus a build spec (layout shell, sampled colors, type, shadcn component mapping, per-screen notes, verification).
- `CLAUDE.md`, `docs/05`, `docs/06`, `docs/44`: the UI must match the reference images; screenshot comparison required.

## v2.1 — 2026-09-24

- `CLAUDE.md`: owner standing authorization — full autonomy; documented defaults applied for owner decisions; stop only for credentials, money, or anything touching HUNGREE Goat music or the Samsung.
- `ops/AI-NODE-01.md`: Grid multi-volume card as first host task; existing containers/services protected; confirmed DNS and VPS → Tailscale → ai-node-01 routing with a resting page when the stack is stopped.

## v2 — 2026-09-24

### Structure
- One source of truth: facts in `docs/00`, visual rules in `docs/06`, agent contract in `CLAUDE.md` (`AGENTS.md` now points to it), skills in `docs/34`. Copies removed from 11 other files.
- Host-specific details (drives, LAN address, deploy key, routing, parallel sessions) moved to `ops/AI-NODE-01.md`. `27A` and `27B` moved to `ops/` with forwarding stubs left in `docs/`.
- USG Grid storage-telemetry note moved out of the product docs to `ops/USG-GRID-STORAGE-TELEMETRY.md`.
- Contradictions fixed: the Raspberry Pi is no longer described as the prototype target or the Mini tier; `ai-node-01` is the development host; the Mac mini is the target school hardware.
- Conversation record marked historical; docs win where they disagree.
- Phase 0 recorded as complete (commit `bc1966b`, Samsung UUID, verification).

### New documents
- `41` Safeguarding & child safety
- `42` AI tutor policy & evaluation
- `43` Concurrency & performance budget
- `44` Vertical slice 001 — Lesson 6: Loops (first build target, with exit criteria)
- `45` School IT deployment
- `46` Public demo
- `47` Open educational resources — Harvard CS50, MIT OpenCourseWare, MIT RAISE, Scratch, App Inventor, OpenStax, PhET, Kolibri, Kiwix, NASA, with license rules
- `48` Landscape & positioning
- `49` Accessibility & languages
- `50` Student data privacy compliance (US)
- `51` Sustainability & cost of ownership
- `52` Risk register

### Updated documents
- `05` screen specs: locked homework badge, exclusive assignment states, Safety Alerts and Lab Status screens, list of changes from the concept mock-ups.
- `03` website: pitch leads with offline/privacy/ownership; copy rules for the concept landing page.
- `07` architecture: v1 stack decided, repository layout, `safety` service.
- `10` learning engine: v1 = own SQLite service; Kolibri evaluation path; Moodle later.
- `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`, `22`, `23`, `25`, `26`, `28`, `30`, `31`, `35`, `37`: safety, tutor rules, Pyodide, data tables, roles, API, hardware and testing updates.
- `36` fundraising: budget redone for ~$3,500 site kits, two scenarios ($30K vs $15K central lab), updated sponsor tiers.
- `39` roadmap: rebuilt around the vertical slice with exit criteria per phase.
- `40` decision log: 12 new entries.

### Owner decisions flagged
- Who can see free Ask chats; retention periods; Umanah safeguarding lead (`41`).
- Budget scenario A or B (`36`); who pays yearly support (`51`).
- First additional language (`49`).
- Commit identity (`40`).

## v1 — 2026-09-23/24

Original pack from the ChatGPT brainstorm.
