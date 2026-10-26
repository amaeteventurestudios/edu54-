# CLAUDE.md — EDU54

> **EDU54 copy (2026-10-26).** This repo was cloned from Ashanti Labs and only the name was changed (Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com). Server facts below (hosts, addresses, paths, deploy dates, "live" checks) describe the **Ashanti Labs** deployment as it was renamed in text; EDU54 itself is **not deployed yet** and has no servers, DNS or email of its own.

Operating brief for any Claude working in the **EDU54** project. Read this whole file before doing anything. It is written so you can install and run EDU54 locally **without asking the owner questions**. Where something is undecided, this file gives the default to apply; apply it, log it, keep going.

Handoff written 2026-09-30 from the Umanah Institute AI Lab project. Facts marked *(verify)* were true in that project's records but must be checked on the machine before you rely on them.

Files in this pack (in `~/edu54/` on ai-node-01):

| File | What it is |
|---|---|
| `CLAUDE.md` (this file) | the operating contract: what, rules, architecture, defaults |
| `INSTALL-RUNBOOK.md` | step-by-step install on ai-node-01, then the Mac mini |
| `CONTENT-CATALOG.md` | what content and tools are allowed, per edition, and the blocklist |
| `HARDWARE.md` | demo box, school box, university box options |
| `config/` | starting config files (brand, editions, env, content allowlist, per-school template) |
| `reference/` | the research notes this depends on. The LabOS docs referenced below as `labos-docs/…` are in the LabOS repo's `docs/` and `ops/` folders and in the v2.5 master pack on this node |

---

## 1. What EDU54 is

**EDU54 is the paid, pan-African edition of Umanah LabOS.** Same engine, same UI, different name, colors and content. It is sold (not free), because free offerings are not taken seriously in the target market.

- **Parent product:** Umanah AI Lab, a school-owned, offline-first AI learning appliance by Umanah Institute (nonprofit). One box on the school network serves a whole class through ordinary browsers. The software platform is **Umanah LabOS**. EDU54 is a rebrand of LabOS, not a new app.
- **UI:** keep the LabOS UI exactly as it is for now (reference screens in the LabOS repo at `design/reference/`). Only the product name, logo, colors and edition-specific wording change. Student navigation stays **Home, Ask, Learn, Build, Explore, Progress**, plus the Teacher Center and the admin area.
- **Two editions from one codebase:**
  - **K-12** (primary and secondary schools)
  - **University** (universities, polytechnics, colleges)
- **Market:** pan-African, not Nigeria-only.
- **Language rollout:** English first (Nigeria, Ghana, Kenya, Uganda, Tanzania, Zambia, South Africa, Sierra Leone, Liberia, Gambia), then French, then Portuguese, then Spanish (Equatorial Guinea), then Arabic (needs right-to-left UI), and local languages last (Hausa, Yoruba, Igbo, Swahili, Amharic, Zulu…). **Build English only now**, but keep every UI string in translation files so later languages are a content job, not a rewrite.

## 2. The content rule (non-negotiable)

**EDU54 ships only content we are allowed to resell.** That means CC BY, CC BY-SA, CC0 / public domain, or permissive software licenses (MIT, BSD, Apache, GPL/AGPL/LGPL/MPL for software run unmodified or with published changes).

**Remove everything else.** Specifically, none of these may be in any EDU54 install, catalog, lesson, screenshot or marketing:

- **MIT** anything: MIT OpenCourseWare, MIT RAISE / Day of AI, MIT BLOSSOMS, MIT Missing Semester, Scratch (MIT-hosted content and trademark)
- **Harvard** anything: CS50, CS50P, CS50 AI and all CS50 variants
- **Khan Academy** (all Kolibri Khan channels)
- **Code.org**
- **fast.ai** (course and book)
- **GeoGebra**, **Desmos**, **Wolfram Alpha**, **MATLAB**, **UCSF ChimeraX**
- **CK-12** (CC BY-NC)
- **TED / TED-Ed** (CC BY-NC-ND)
- **Open Yale Courses**, **Stanford** course notes (CS229/CS231n), **Elements of AI**, **Kaggle Learn**
- **LibreTexts** books unless that specific book is CC BY or CC BY-SA (most are NC)
- **Internet Encyclopedia of Philosophy** (author copyright)
- Books: *Python for Everybody*, *Automate the Boring Stuff*, *Think Python*/*Think Stats* (older NC editions), Nielsen's *Neural Networks and Deep Learning*, *Crafting Interpreters*, APEX Calculus
- PhET simulations published **after 29 March 2026** (only older sims are CC BY)
- YouTube lectures of any kind (even when the code is MIT-licensed, the videos are not)
- **Open WebUI** as a shipped component (its license restricts rebranding above 50 users); do not include it in EDU54 installs
- **Any item marked NC or ND, any item with unknown license, and any item whose license you cannot confirm from the source today**

Also drop **US-centric titles** (OpenStax U.S. History, American Government, Business Law I Essentials, Principles of Accounting). World and general titles stay.

How to apply it:

1. Every content item carries `license`, `source_url`, `attribution` and `checked_on` in the catalog. The importer **blocks** anything whose license is not in `config/content-allowlist.yaml`. There is no override flag.
2. Check each license at the source **on the day you import it**; the lists in `CONTENT-CATALOG.md` come from research, not live checks.
3. Keep **CC BY-SA** material in its own packs (ShareAlike means anything we adapt from it stays CC BY-SA). Our own lessons stay separate from SA packs so they can remain proprietary.
4. Credit sources on an Attributions page (and in each item's footer), and never use a source's name or logo as our branding (OpenStax, Wikipedia, Project Gutenberg rules).
5. **Umanah's own lessons** (Python Foundations, AI Foundations and any others in the LabOS repo) may ship only after you confirm they are not adapted from an excluded source. If a lesson cites or adapts CS50, MIT, Khan or any other excluded source, leave it out of EDU54 and list it in `docs/EDU54-EXCLUSIONS.md`.
6. The free Umanah AI Lab edition keeps its NC content. That is not your concern here, and you must never delete anything from the AI Lab install.

Not legal advice. When a license is genuinely ambiguous, leave the item out and list it; do not ask the owner.

## 3. Architecture (defaults to apply)

### One codebase, two switches

EDU54 runs the **LabOS code** with two configuration switches:

| Switch | Values | What it changes |
|---|---|---|
| `LABOS_BRAND` | `umanah` (default) · `edu54` | product name, logo, colors, favicon, page titles, email/print footers, "About" and Attributions pages, support contact |
| `LABOS_EDITION` | `k12` · `university` | content catalog, nav labels and terms, grade vs year levels, default course list, login options for young children, tool set in Build |

Implement both as config read at startup by the API and served to the web app (`GET /api/config/public` or the equivalent that already exists). No brand strings or colors hard-coded in components: move them into a brand file (`config/brand.edu54.json` in this pack is the starting point) and CSS variables. Leave Umanah as the default so the AI Lab build is unchanged.

**Production rule: one install per box, one edition per install**, chosen by `LABOS_EDITION`. A school buys a K-12 box; a university buys a University box.

**Sold per order, configured by us** (owner confirmed 2026-09-30). There is no website checkout and no self-install. When a school or university orders, we build and configure its box before shipping: one edition, the institution's own name and logo, its admin account, its content selection, then test and ship. So the build must make per-institution setup a repeatable, scripted step (a per-school config file plus a provisioning command), not hand edits. The checklist is Phase 9 of `INSTALL-RUNBOOK.md`.

**Demo rule (the Beelink and the demo Mac mini only; never a customer box):** run **two EDU54 instances** from the same checkout so the owner can see both editions side by side: `edu54-k12` and `edu54-uni`, each with its own database, ports and compose project name.

### What each edition changes

| | K-12 | University |
|---|---|---|
| Teacher role label | Teacher | Lecturer |
| Teacher area | Teacher Center | Lecturer Center |
| Group | Class | Course (with sections) |
| Level | Grade / Primary 1-6, JSS 1-3, SSS 1-3 (Nigeria-style labels as the English default; configurable) | Year 1-4, Postgraduate |
| Young-child login (class code + picture/PIN) | on for under-13 classes | off |
| Build tools | Pyodide Python, Blockly Games, Snap!, Music Blocks, p5.js, typing practice | Pyodide Python, JupyterLite, JupyterHub (if RAM allows), R (later), GlowScript, Falstad, JSmol |
| Explore library | K-12 catalog | University catalog |
| Safety pipeline (LabOS `docs/41`) | on, unchanged | **on, unchanged** (see §6) |
| Tutor policy (LabOS `docs/42`) | on, unchanged | on, unchanged |

### Logins and roles

Same identity system as LabOS (`docs/19-IDENTITY-ROLES-AUTH.md` in the LabOS repo): local accounts in the EDU54 database, modern password hashing, HTTP-only session cookies.

- **School Admin** (University: **Institution Admin**): manages users, classes/courses, settings, safety contacts. One per install at first run.
- **Teacher / Lecturer:** runs classes or courses, assignments, grades, progress.
- **Student.**
- **Designated Safety Contact:** a flag on a staff account; at least one required (both editions).
- No Umanah Support or Umanah Admin role in EDU54 installs for now.

EDU54 users are **completely separate** from AI Lab users (separate database). No shared logins, no SSO between them.

**Demo seed accounts** (create on first run of each instance, print them to `<EDU54_ROOT>/secrets/demo-accounts.txt` with mode 600, never commit them): one admin, two teachers/lecturers, six students, one safety contact, all with generated random passwords. Seed a demo school: "EDU54 Demo Secondary School" (K-12) and "EDU54 Demo University" (University).

### Isolation from everything else on the box

EDU54 lives **beside** the AI Lab, never inside it.

| Thing | EDU54 | Umanah AI Lab (do not touch) |
|---|---|---|
| Folder | `<SSD>/edu54/` | `<SSD>/umanah-ai-lab/` (or wherever it is now) |
| Git checkout | `<SSD>/edu54/apps/labos` on branch `edu54` | `~/projects/umanah-ai-lab` and its data-drive checkout |
| Compose project names | `edu54-k12`, `edu54-uni`, `edu54-shared` | `umanah` |
| Docker networks, volumes | `edu54_*` only | `umanah_*` |
| Ports | **8300-8399** (table in `INSTALL-RUNBOOK.md`) | 8100-8199 |
| Databases | `<SSD>/edu54/database/k12.db`, `uni.db` | AI Lab SQLite |
| Models | `<SSD>/edu54/models/` | AI Lab models |
| Env / secrets | `<SSD>/edu54/config/*.env`, `secrets/` | AI Lab `.env` |
| Logs, backups | `<SSD>/edu54/logs/`, `backups/` | AI Lab logs, backups |

Reserved port ranges on ai-node-01: HUNGREE Goat control 8090, **Umanah AI Lab 8100-8199**, **Reydious 8200-8299**, **EDU54 8300-8399**.

Note: `~/edu54` (home folder) holds this handoff pack and is where the Remote Control session starts. The install itself goes on the SSD as `<SSD>/edu54/` (an empty folder was already created there on 2026-09-29; on this node the SSD may be mounted at `/srv/ai-node/storage/ssd` — verify).

### Where the code comes from

- Clone the LabOS repo **fresh** into the EDU54 folder: `git clone git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git <SSD>/edu54/apps/labos` (the SSH alias and deploy key already exist on ai-node-01 *(verify)*). Never work in the AI Lab's own checkout.
- Work on branch **`edu54`**. Push that branch to the same repo so work survives; **never push to `main`** and never force-push anything that isn't yours. Merging brand/edition switches into `main` later is a separate owner call; write the code so that merge would be clean (Umanah stays the default).
- Read the repo's own `CLAUDE.md`, `HANDOFF.md` and `docs/` before changing code. Its rules apply to EDU54 work too, except where this file overrides them for EDU54.
- Keep an EDU54 handoff file at `<SSD>/edu54/HANDOFF.md` (and `docs/EDU54-HANDOFF.md` on the branch) with the same sections LabOS uses: current objective, completed work, state, decisions, commands run, tests, known problems, exact next action.
- Record decisions in `docs/EDU54-DECISIONS.md` on the branch, labelled "default applied under standing authorization" where this brief chose for the owner.

### AI model

- **Mac mini demo box (24 GB RAM):** tutor **Qwen3-14B, 4-bit (~9 GB)**, Apache 2.0. Decided by the owner on 2026-09-28. Runs natively on macOS (Ollama or MLX), not in Docker, so it can use the Apple GPU. Qwen3-30B-A3B does not fit comfortably at 24 GB; optional later test at 3-bit only.
- **ai-node-01 (Beelink, ~12 GB RAM, CPU only):** Qwen3-14B does not fit next to the live AI Lab. Use **Qwen3 4B Instruct, 4-bit** as the tutor there (same model family, so behavior is representative), plus a small safety model (Qwen3Guard small, else Llama Guard 3 1B with its attribution) and `nomic-embed-text`. Note in the UI's admin status page that the demo node runs the small model.
- EDU54 gets its **own** Ollama container (`edu54-shared`, port 8320, localhost only, models in `<SSD>/edu54/models/`) shared by both EDU54 instances, with `OLLAMA_KEEP_ALIVE=5m` and `OLLAMA_NUM_PARALLEL=2`.
- **RAM guard:** before starting EDU54's Ollama, check `free -m`. If starting it would leave under 2 GB available, do **not** stop anything of the AI Lab (it serves the public demo at ai.umanah.org). Instead leave EDU54's Ollama stopped and point both instances at the AI Lab's existing Ollama (`http://127.0.0.1:8120`) as a **read-only client**: send chat/embedding requests only, using models it already has; never pull, delete, copy or change models there. Record which mode you used.
- Check every model's license at download and record name, version, source, checksum and license in the model registry. Only Apache 2.0 / MIT or similarly commercial-safe weights. Re-check the license of any newer Qwen before switching.

### Engines behind the UI

Same "adopt, don't rebuild" rule as LabOS; students never see third-party product names.

| Engine | EDU54 use | Instance |
|---|---|---|
| Kiwix server | offline Wikipedia, Wikibooks, Wikijunior, Wikiversity, Wikisource, Stack Exchange, Gutenberg ZIMs | `edu54-shared`, one server; each edition's catalog lists only its ZIMs |
| Kolibri | K-12 channels that pass the content rule (African Storybook, StoryWeaver/Global Digital Library, PhET pre-2026 if available as a channel) | `edu54-shared` |
| JupyterHub | University only, and only if RAM allows; JupyterLite (in-browser) is the default | `edu54-uni` profile `code` |
| Pyodide | both editions | served by web |
| Moodle | **not used** (dropped for LabOS on 2026-09-28) | — |
| Open WebUI | **not used** (license) | — |

### Branding (defaults)

The owner has not chosen colors or a logo. Apply this placeholder and keep it in one file so it changes in one place:

- Name: **EDU54**. Platform line in About: "EDU54, built on LabOS".
- Palette (placeholder, kente-inspired, check WCAG AA contrast): primary deep green `#0F4D3A`, hover `#0B3B2C`, accent gold `#D9A520`, tint `#EAF3EE`, warm background `#F7F5F0` (kept from LabOS), text `#1B1B1B`.
- Logo: a simple text wordmark "EDU54" in the LabOS serif (Libre Baskerville) until a real logo exists. Generate a matching favicon (letter "A" on the primary green).
- **The word "Umanah" must not appear anywhere in the EDU54 UI**, except an optional "Built on LabOS" credit on the About page and the Open Source Notices page.

Brand name clearance (trademark search for "EDU54" in target countries) is a legal task for the owner and does not block the local build.

## 4. Where it installs (ai-node-01)

- **Host:** `ai-node-01`, a Beelink mini PC (Ryzen 7 5800H, ~12 GB RAM, Ubuntu 26.04.1). LAN address `192.168.4.41` (confirmed 2026-09-28; older docs saying `192.168.6.233` are wrong). You work on it through **Remote Control** in `~/edu54`.
- **Target disk: the 2 TB Samsung SSD** that became the AI Lab's data drive on 2026-09-29. Find the real mount with `findmnt -o TARGET,SOURCE,LABEL,SIZE,FSTYPE` and `lsblk -o NAME,SIZE,LABEL,MODEL,SERIAL,MOUNTPOINTS`; it is the ~1.8-2 TB ext4 volume that holds the `umanah-ai-lab` folder (planned as `/srv/ai-node/storage/ai-lab`; the node reports an existing empty `/srv/ai-node/storage/ssd/edu54`, so the mount is likely `/srv/ai-node/storage/ssd`). Call that mount `<SSD>` everywhere.
- **Install folder:** `<SSD>/edu54/`, a sibling of the AI Lab folder.
- **Space budget:** the SSD had ~1.8 TB free on 2026-09-30, while the AI Lab's K-12 downloads (~170 GB) were still running. EDU54 may use up to **600 GB** in total. Always leave at least **300 GB free** on the SSD for the AI Lab; check `df -h <SSD>` before every large download and stop downloading when either limit is reached.
- **Docker:** the node runs a **rootless** Docker daemon for data-drive apps, reached through the Docker context `ai-data` *(verify with `docker context ls`)*. Use `docker --context ai-data compose -p edu54-… …` for everything. Never use or change the system Docker daemon (it runs ~9 other containers: the Grid, Hermes, etc.).

### Things on this machine you must never touch

- **Umanah AI Lab:** its folder, checkout, containers, database, models, ports 8100-8199, its Kiwix/Kolibri content, and the public demo at `ai.umanah.org`. Read-only use of its Ollama is allowed only in the RAM-guard fallback above. Never stop or restart its services.
- **HUNGREE Goat:** the music files (on the SanDisk data drive, `/srv/ai-node/storage/data`), its app in `~/hungree-goat`, its four `systemd --user` units, port 8090. Never move, rename, delete, chown or modify them.
- **Reydious:** the 128 GB **Samsung FIT thumb drive** (label `REYDIOUS_DATA`), any Reydious folders or containers anywhere, ports 8200-8299. The owner said to install EDU54 on the **2 TB Samsung SSD**; that SSD is a different drive from the Reydious thumb drive. Confirm by size and serial before writing. If you find Reydious files on the SSD, leave them alone.
- The **internal NVMe** OS disk (no EDU54 data there beyond `~/edu54` and your config), the **system Docker** daemon and its containers, other services on the box (Grid, Hermes), the VPS, DNS, and nginx.

## 5. Standing authorization and hard limits (carried over from the owner)

The owner (Amaete Umanah) gave **full standing authorization** (LabOS, 2026-09-24) and repeated it for EDU54 on 2026-09-30: "Claude would just install everything. Don't ask me. Install it. Install everything. Let me see how it looks locally."

So: install, configure, code, test, fix and download without asking. Where this brief or the LabOS docs list an "owner decision", apply the documented default, log it as "default applied under standing authorization", and continue. When something blocks you, re-read the docs and solve it yourself first.

**Stop and ask only for:**

- a sudo password or other credential you cannot get, an account login, 2FA or CAPTCHA;
- spending money (purchases, paid services, paid API keys);
- accepting legal terms or contracts;
- changes to child-safety or privacy policy (including any "adult mode" for the University edition);
- anything that would touch HUNGREE Goat files, the Reydious thumb drive or Reydious data;
- anything public-facing: DNS, a public URL, the VPS, publishing, emailing anyone, marketing claims.

Before asking, finish all other work, then give the single exact command or action needed.

Everything else, including ordinary engineering choices, which items to download within the rules, fixing tests, and choosing ports inside 8300-8399, is yours to decide.

## 6. Non-negotiables inherited from LabOS

- **Child safety first.** Every AI path a student can reach goes through the safety pipeline (LabOS `docs/41-SAFEGUARDING-CHILD-SAFETY.md`). This holds in **both** editions. University students are mostly adults, but a tuned "adult" policy is a policy change reserved to the owner: ship the University edition with the same pipeline and note the question in `docs/EDU54-DECISIONS.md` as open.
- **Tutor limits are enforced by the server**, not only by the prompt (LabOS `docs/42-AI-TUTOR-POLICY.md`).
- **The UI looks like the LabOS reference screens**, rebranded. Compare screenshots side by side.
- **Core learning works with the internet unplugged.**
- **Student conversations never leave the box** by default.
- **No third-party product names** (Ollama, Kolibri, Kiwix, Qwen, Jupyter) in student or teacher UI, except the Open Source Notices and Attributions pages.
- **Never expose SSH publicly.** EDU54 is LAN and Tailscale only; no public route for now.
- **Every claim on any page must be true** the day it ships.
- **Definition of done:** code + tests + verified in a real browser + docs updated + no regression in the AI Lab (check `ai.umanah.org` and the AI Lab ports still answer after every EDU54 change).

## 7. What "done" looks like for the first pass

The owner can open, on the LAN (or Tailscale):

1. `http://192.168.4.41:8300` — **EDU54 K-12**: EDU54 branding, K-12 wording, demo school and accounts, Ask tutor working through the safety pipeline, Learn with commercial-safe lessons, Build with Python and block-coding games, Explore with the K-12 library, Progress and Teacher Center working.
2. `http://192.168.4.41:8350` — **EDU54 University**: same, with University wording, Lecturer Center, University catalog (OpenStax college titles, Saylor, Carpentries, Microsoft "for Beginners", Hugging Face courses, d2l.ai, Wikipedia EN and friends) and University tools.
3. Neither shows the word Umanah (outside the About/notices credit) or any excluded content.
4. The AI Lab, HUNGREE Goat and Reydious are exactly as they were.
5. A short report to the owner: the two URLs, the demo login file path, what's installed with sizes and licenses, what was left out and why, and the next steps (Mac mini with Qwen3-14B; French pack).
6. The per-school provisioning command (Phase 9 of `INSTALL-RUNBOOK.md`) exists and has been dry-run once with a made-up school on the Beelink, in its own throwaway instance, then removed.

Then continue with the Mac mini phase in `INSTALL-RUNBOOK.md` when that machine is reachable, and keep `HANDOFF.md` current.

## 8. Useful context from the parent project

- Parent docs: the LabOS repo's `docs/` and `ops/` (also in the v2.5 master pack on this node). `CLAUDE.md` at the LabOS repo root is LabOS's own agent contract.
- LabOS v1 stack: React + Vite + TypeScript + shadcn/ui, FastAPI, SQLite (WAL), Ollama behind an `InferenceAdapter`, Pyodide, Docker Compose with profiles, one CLI (`umanah-lab`). For EDU54, add an `edu54-lab` wrapper (or a `--brand/--edition/--instance` option on the same CLI) rather than editing the AI Lab's running config.
- LabOS status on 2026-09-28: vertical slice S0-S8 built and tested (API tests 165/165, browser tests 34/34 on 2026-09-30); lessons written: Python Foundations 5-7, AI Foundations 1-2.
- Moodle was dropped from LabOS on 2026-09-28; Teacher Center and Progress own classes, grades, XP and badges.
- Research the owner already approved for the paid edition: `reference/university-oer-and-tools.md` (content, tools, language tiers, storage and model fit) and `reference/hardware-parts-lists.md` (prices as of 2026-09-28).
- The AI Lab's K-12 thread found on 2026-09-30 that CK-12 and OpenStax are no longer offered as offline Kolibri/Kiwix catalogs; get OpenStax directly from openstax.org (PDF and web versions, CC BY).
