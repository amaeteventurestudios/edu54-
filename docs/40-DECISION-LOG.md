# Decision Log

This file is append-only for major product/architecture decisions. Correct previous decisions by adding a new superseding entry rather than silently rewriting history.

## 2026-09-23 — Product naming

**Decision:** Public product is **Umanah AI Lab**; orchestration software is **Umanah LabOS**.

**Reason:** Schools/donors understand AI Lab; LabOS is infrastructure terminology.

## 2026-09-23 — Web locations

**Decision:** Public product page is `umanah.org/ai-lab`; application/demo is `ai.umanah.org`.

## 2026-09-23 — Student information architecture

**Decision:** Core student verbs are **Ask, Learn, Build, Explore, Progress**.

## 2026-09-23 — Offline posture

**Decision:** Core learning is offline-first. Umanah Central is not required for normal classroom operation.

## 2026-09-23 — Remote support

**Decision:** Appliances may maintain secure private connectivity to Umanah for health, updates, diagnostics, and support.

## 2026-09-23 — Privacy posture

**Decision:** `We monitor the machine. We do not monitor the child.` Raw student prompts are not central telemetry by default.

## 2026-09-23 — Open-source strategy

**Decision:** Prefer mature open-source engines and build the Umanah orchestration/experience around them. Do not expose third-party products as the primary UX.

## 2026-09-23 — Chatty-EDU

**Decision:** Treat Chatty-EDU as an important reference/possible component. Do not fork immediately; first compare separate-component/upstream/lightweight approaches. Preserve AGPL obligations.

## 2026-09-23 — Prototype backend

**Decision:** Do not run full Appwrite on the ~4 GB Raspberry Pi prototype. Use lightweight local auth + SQLite + a small API layer.

## 2026-09-23 — UI foundation

**Decision:** shadcn/ui + Radix are preferred web component foundations, themed to Umanah.

## 2026-09-23 — Agent autonomy

**Decision:** Coding agents should resolve normal engineering uncertainty independently, research official docs, verify runtime behavior, and move phase-to-phase without asking for routine approvals. Ask only for genuine human-only blockers or material policy/legal decisions.

## 2026-09-24 — Primary full-stack development host

**Decision:** `ai-node-01` (Ryzen 7 5800H, ~12.1 GB RAM, Ubuntu 26.04.1 LTS) supersedes `pi-node-01` as the current primary full-stack Umanah AI Lab development/demo target. The Pi remains a constrained/offline validation target.

## 2026-09-24 — Canonical GitHub repository

**Decision:** Canonical source repo is the private `amaeteventurestudios/umanah-ai-lab`, default branch `main`. `ai-node-01` uses a dedicated write-enabled deploy key/SSH alias. Runtime state does not belong in Git.

## 2026-09-24 — HUNGREE Goat drive sharing boundary

**Decision:** The existing SanDisk ~128 GB HUNGREE Goat USB is not reformatted. Existing media is protected. Umanah AI Lab runtime data may coexist only in a dedicated `/media/hungree-goat/umanah-ai-lab/` subtree with its own ownership/permissions; no recursive changes across the existing library.

## 2026-09-24 — Samsung reserved for Reydious

**Decision:** Samsung Flash Drive FIT serial `0361823090000118` is reserved exclusively for Reydious. Approved target layout is GPT + one ext4 partition, label `REYDIOUS_DATA`, UUID-mounted at `/srv/ai-node/storage/reydious`. Umanah AI Lab must not place runtime data there.

## 2026-09-24 — On-demand application model

**Decision:** `ai-node-01` is a personal application host. Many applications/models may remain installed on disk while only one or two run at a time. Capacity planning must separate disk occupancy from concurrent RAM/CPU load.

## 2026-09-24 — Parallel Claude isolation

**Decision:** Multiple Claude sessions may work concurrently on the same host only with isolated repos/worktrees, runtime roots, Docker Compose projects, ports, containers, volumes, systemd units, databases, logs, and `.env` files. Physical drive separation alone is insufficient.

## 2026-09-24 — Public DNS and private routing

**Decision:** Keep `ai.umanah.org` public DNS pointed at Hetzner `2.29.28.125`. Do not publish a Tailscale 100.x address. Hetzner should reverse-proxy HTTPS privately over Tailscale to `ai-node-01`.

## 2026-09-24 — Storage telemetry UX

**Decision:** USG Grid should evolve from a single root-disk metric to multi-volume storage telemetry. Keep node cards compact and expose per-volume details in a drawer/panel; external USB disks remain attributes of the compute node, not separate topology nodes.

## 2026-09-24 — Pack v2: one source of truth

**Decision:** Each shared item lives in one file: facts in `docs/00`, visual rules in `docs/06`, agent contract in `CLAUDE.md`, skills in `docs/34`, host details in `ops/`. Other docs link instead of copying.

**Reason:** v1 had the same blocks copied into up to 9 files and they had already started to contradict each other.

## 2026-09-24 — Target school hardware

**Decision:** AI Lab Mini candidate is a Mac mini (M5 Pro, 64 GB, 2 TB). Final configuration chosen by benchmarks (`43`). The model runtime runs natively on macOS. Supersedes the v1 "~$1,500–$2,500" assumption and any "runs on a Raspberry Pi" wording for the Mini tier.

## 2026-09-24 — Child safety is a v1 requirement

**Decision:** Every student-reachable AI path goes through the safety pipeline in `41`, with school-designated safety contacts receiving alerts locally. Umanah never receives conversations or alerts.

**Reason:** a tutor for children without crisis handling is not deployable, and schools will require it.

## 2026-09-24 — Tutor limits enforced by the server

**Decision:** The server sets the tutor mode from context and assignment policy; answer keys are never given to the tutor in homework/assessment modes; answer checking is done by code (`42`).

## 2026-09-24 — v1 technology stack

**Decision:** React + Vite + TypeScript + shadcn/ui; FastAPI; SQLite; Ollama behind an adapter; Pyodide for student Python; Caddy; systemd/launchd; Playwright (`07`).

**Reason:** smallest stack that runs offline on one box, with no Node or Docker requirement at runtime.

## 2026-09-24 — Learning engine for v1

**Decision:** Small Umanah learning service on SQLite. Moodle is out of v1. Kolibri is evaluated as a content source, then as a possible engine (`10`).

## 2026-09-24 — Everything on the external drive on ai-node-01

**Decision:** On the development host, Umanah runs natively (no Docker) from `/media/hungree-goat/umanah-ai-lab/`. If that drive is exFAT/FAT, use a loop-mounted ext4 image file on it rather than reformatting (`../ops/AI-NODE-01.md`).

## 2026-09-24 — First build target

**Decision:** Vertical slice 001, Python Foundations Lesson 6 (Loops), end to end, before any breadth (`44`). Roadmap phases now have exit criteria (`39`).

## 2026-09-24 — Always-on public demo

**Decision:** `ai.umanah.org` is served by an always-on host with demo data; `ai-node-01` is used for scheduled live-hardware demos (`46`).

## 2026-09-24 — Positioning

**Decision:** Lead with offline, data staying at the school, ownership and built-for-learning; "no per-student subscription" becomes a supporting point, since major cloud AI tools are now included free for many schools (`48`).

## 2026-09-24 — Open educational resources

**Decision:** Build curriculum and the library from open sources including Harvard CS50 and MIT OpenCourseWare (CC BY-NC-SA), OpenStax, PhET, Kolibri channels and Kiwix, tracking license flags per item; NC/SA content in separate packs (`47`).

## 2026-09-24 — Commit identity

**Decision (proposed, owner to confirm):** commits to this repo use `Umanah Systems Group <admin@amaete.com>`.

## 2026-09-24 — Full open-source platform installed now (owner decision)

**Decision:** Install Docker (rootless, on the data drive), Moodle, Kolibri, Kiwix, JupyterHub and Open WebUI in Phase 1, alongside the Umanah app and Ollama. All sit behind the Umanah experience via adapters and run on demand by Compose profile (`53`). Supersedes "no Docker for v1" and "Moodle/Kolibri/Jupyter later".

## 2026-09-24 — Pinned models for ai-node-01

**Decision:** Tutor Qwen3 4B Instruct; safety Qwen3Guard small (or Llama Guard 3 1B); embeddings nomic-embed-text. Licenses verified and recorded at download (`53`, `25`).

## 2026-09-24 — Data drive renamed

**Decision:** The SanDisk becomes the general data drive: label `AI_NODE_DATA`, mounted `/srv/ai-node/storage/data` (replacing `/media/hungree-goat`). The HUNGREE Goat app is updated to the new path; music files are never moved or altered; a temporary symlink covers the switch (`../ops/AI-NODE-01.md`). Supersedes the path in the 2026-09-24 HUNGREE Goat drive entry.

## 2026-09-24 — Audit corrections

**Decision:** Based on the ai-node-01 audit: public routing uses the VPS's existing **nginx** (not Caddy) and the VPS joins Tailscale; Ollama is installed fresh (it was not present); the Grid code gets a local git baseline before any change if it isn't in git; the stale double mount at `/media/hungree-goat` is cleaned up during the drive rename; the Grid storage fix starts at `scripts/collect-ai-node-01.sh`.

## 2026-09-24 — HUNGREE Goat path update goes through its repo

**Decision:** HUNGREE Goat's source is `amaeteventurestudios/hungreegoat`; `~/hungree-goat` is its deployed runtime. The media-path change (`HGC_MEDIA` → `/srv/ai-node/storage/data`) is committed to the repo and deployed with its own Beelink procedure. Supersedes the "git init ~/hungree-goat" step from the audit corrections.

## 2026-09-24 — AI Node storage prep executed

**Decision:** Phase 0 storage preparation on `ai-node-01` is complete and independently
verified. HUNGREE Goat drive (`/dev/sdb1`, UUID `7d12ed26-3a1f-45c6-a1ce-37c5097c3d11`)
unchanged; new subtree `/media/hungree-goat/umanah-ai-lab/` created per the documented
layout, empty. Samsung drive wiped, repartitioned GPT + one ext4 partition, label
`REYDIOUS_DATA`, UUID `2ffee1d1-7192-4b79-a34a-6908b229ee94`, mounted at
`/srv/ai-node/storage/reydious`, `nofail` in `/etc/fstab`, owned `aumanah:aumanah`, left
empty. See ops/evidence/phase0-storage-prep-2026-09-24.md for full verification
detail. No Umanah AI Lab or Reydious application/model/database work has started.

## 2026-09-24 — Grid shows every drive (default applied under standing authorization)
**Decision:** Node cards show `STORAGE · N volumes` (System · Data · Reydious mini bars, GB free under each); a side sheet holds per-volume detail; a Fleet Storage panel fills the last grid row. The collectors (ai-node-01, pi, hetzner) emit `label/model/transport/removable/readOnly/role` per real volume; `/boot`, `/boot/efi`, loops, snaps and duplicate mounts are not volumes. Health: >85% amber, >95% red, expected drive missing or unexpected read-only = Degraded (expected volumes are matched by role, so the mount rename never reads as "missing"). Grid branch `feature/grid-all-drives`, image `usg-grid:0.4.2` (0.4.1 kept for rollback). Evidence: `ops/evidence/grid-storage/`.

## 2026-09-24 — Data drive is 57 GiB, not ~128 GB (default applied under standing authorization)
**Finding:** the SanDisk is 57.3 GiB (50 GiB free), not ~128 GB. The `docs/53` storage budget (~95 GB) does not fit. **Decision:** keep everything on the data drive, shrink the budget: Docker images/volumes ≤ 20 GB, models ≤ 5 GB, Kiwix ≤ 5 GB (small ZIMs), Kolibri ≤ 5 GB (one small channel), Moodle+DB ≤ 2 GB, Umanah ≤ 2 GB, backups ≤ 4 GB, headroom ≥ 7 GB. Upgrade path unchanged (larger drive; layout moves as-is). The Samsung is never used.

## 2026-09-24 — Media root is a variable, not a path
**Decision:** HUNGREE Goat reads `HGC_MEDIA` (default `/srv/ai-node/storage/data`); the Beelink systemd units set it explicitly; the Pi keeps `/media/hungree-goat` via the same variable. Repo commits `a54fcf9`, `519a882` (hungreegoat). `hgc-usb-repair.sh` now unmounts every stacked layer (root cause of the audit's double mount: a stale `/dev/sda1` layer left under `/dev/sdb1` after the USB re-enumeration; the old script unmounted one layer only).

## 2026-09-24 — VPS is already on Tailscale (audit correction)
The VPS is tailnet node `umanah-dataroom` (100.99.107.27) and reaches ai-node-01 (100.127.44.118). Step 5 needs no Tailscale install or login. Public demo exposure: the always-on/isolated-session demo of `docs/46` is still Phase 2; until then nginx blocks `/api/safety/`, `/api/docs` and `/api/openapi.json` on the public host and rate-limits the tutor route. Seeded demo passwords are random per install (login lockout applies), so the public site is safe but only usable once a demo mode exists.

## 2026-09-24 — Platform image pins (default applied under standing authorization)
Ollama `0.34.4`, MariaDB `11.4`, JupyterHub `5.3.0`, Caddy `2.11.4`. Moodle: `bitnamilegacy/moodle:5.0.2` (Bitnami's catalog moved; legacy images get no updates → replace with an official-source build before any school deployment). Kolibri, Kiwix and Open WebUI use `latest`/`main` until the first pull, then are pinned by digest in `compose.yaml`. Qwen3Guard is not in the Ollama library → Llama Guard 3 1B (the fallback named in docs/53).

## 2026-09-24 — Data drive renamed; HUNGREE Goat migrated
Drive relabelled `AI_NODE_DATA`, mounted by UUID at `/srv/ai-node/storage/data`. The root script stopped at `rmdir` because `/media/hungree-goat` on the internal disk held 28 KB written on Sep 18 while the drive was detached (two playlists, byte-identical to the drive's copies, plus an empty `mixes/.raw`); it was renamed to `/media/hungree-goat.leftover-20260924` (kept, not deleted). **Finding:** HUNGREE Goat's database stores absolute paths (`tracks.path` 140 rows, artwork columns) and the playlists hard-code them, so removing the compatibility symlink would have broken playback. Migrated in place with backups (`~/backups/hungree-goat-pre-media-move-20260924/`); history/event log rows keep the old path text. Evidence: `ops/evidence/data-drive-{before,after}.txt` — 482 of 483 checksums identical; the one difference is `playlists/lofi-fallback.m3u`, deliberately rewritten to the new path (140 music WAVs unchanged).

## 2026-09-24 — Platform web binds one wildcard port; dev node uses 8130 (default applied under standing authorization)
Rootless Docker (rootlesskit) also claims `127.0.0.1:<port>` for every published mapping, so separate LAN and Tailscale mappings of the same port collide, and on ai-node-01 HUNGREE Goat's liquidsoap already holds `127.0.0.1:8100`. The web service therefore publishes one mapping, `${UMANAH_BIND:-0.0.0.0}:${UMANAH_WEB_PORT:-8100}`; the box has no public interface (LAN, Tailscale, loopback only). On ai-node-01 `UMANAH_WEB_PORT=8130` is set in `<data>/umanah-ai-lab/.env.local` (read by `umanah-lab`). The VPS upstream for `ai.umanah.org` on this node is therefore `100.127.44.118:8130` (default 8100 on a school box). The API container's data dir is chowned to the image's non-root user by `umanah-lab init` (sub-uid mapping under rootless).

## 2026-09-24 — Migrations, engine health, profile fixes (default applied under standing authorization)
Schema changes are Alembic migrations inside the package (`umanah_api/migrations`): a fresh database is created by them; a database made by the old `create_all` is **stamped** at baseline `0001` (no data touched); a pending upgrade takes a consistent SQLite backup first; a test fails when models and migrations disagree. Engine adapters (`umanah_api/engines`) report health with Umanah wording; their domain methods are honest stubs (`NotConnected`) until Explore/Learn integrate them. Compose: MariaDB is utf8mb4 (Moodle refuses otherwise); Open WebUI has no hard `depends_on` on Ollama (it lives in another profile); Kiwix is not started without a library. The tutor now sends `think:false`, keeps models resident (`keep_alive` -1) and warms them at start-up.


## 2026-09-25 — Priority reset: fundraising demo (owner instruction)
Phases 6 to 9 are on hold until funded (recorded in `docs/39`). Priority is a polished public demo: reference-image fidelity, demo mode on `ai.umanah.org` (docs/46), the `umanah.org/ai-lab` page, a sponsor video, and more lessons. Sponsor-facing claims stay true on the day they ship.

## 2026-10-23 — Discovery Lab lives inside the app (AI agent; owner asked for the build)
Discovery Lab is routes and a catalog in the existing LabOS app, not a separate service: one sign-in, one safety pipeline,
one place for safety contacts. Experiments are browser modules behind a fixed contract and a `validate()` gate against the
catalog; the server re-cleans any readings sent to the AI Guide. See `docs/discovery-lab/README.md`.
