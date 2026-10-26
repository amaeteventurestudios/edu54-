# HANDOFF — Umanah AI Lab (ai-node-01)

## 2026-10-26 state (EDU54 cloned from Ashanti Labs; work by an AI agent, cloud session)
- **Current objective:** EDU54 (edu54.com) is the brand marketed to African schools. Ashanti Labs stays as the owner's personal brand; Cortex (the AI box) is separate. This repo, `amaeteventurestudios/edu54-`, is a copy of `amaeteventurestudios/ashanti-labs` main @ 79aec77 with the name changed and nothing else.
- **Renamed:** Ashanti Labs / Ashanti → EDU54; ashantilabs.com → edu54.com (k12., uni., discover.); `LABOS_BRAND=ashanti` → `edu54`; `ASHANTI_*` env vars → `EDU54_*`; files and folders with "ashanti" in the name; the "A" monogram and favicon letter → "E". Kente sign-in art, colours, fonts and copy are unchanged.
- **Not renamed (historical records):** this file below this section, `CHANGELOG.md`, `docs/founder-review-log.md` (entries before 2026-10-26), `docs/40-DECISION-LOG.md`, `Umanah_AI_Lab_Complete_Conversation_Record.md`. They describe what happened under the Ashanti name.
- **Not deployed.** No EDU54 server, Cloudflare tunnel, DNS or mailbox exists yet. The legal pages name privacy@edu54.com, which does not exist yet.
- **Tests (2026-10-26, cloud container):** API 323 pass, 4 fail; the same 4 fail on ashanti-labs main @ 79aec77 (Umanah credit text in the brand config, and the Khan/NC source check). Web unit tests 20/20 (0 fail), type check and production build pass. Homepage, privacy and Discovery Lab pages checked in a browser: title, logo and text show EDU54.
- **Exact next action:** deployment plan for EDU54 (separate thread); regenerate `apps/site/shots/*.jpg` from a running EDU54 instance if any still show the old name.

## 2026-10-24 state (Ashanti moved to its own repo and Discovery Lab deployed; work by an AI agent)
- **Repo:** at the owner's request (2026-10-24), Ashanti now has its own private repo, `amaeteventurestudios/ashanti-labs`, kept separate from the Umanah repos. `main` was created as a single fresh commit (4e77096) with the same file tree as 3478321, from PR #3 on umanah-ai-lab. That PR is still open there.
- **Deployed 2026-10-24.** Contabo `/srv/ashanti-labs/apps/labos` is now on 4e77096 (local branch `ashanti-deploy-20261024`). Before this it was on fe1d46a with 10 uncommitted edits, which are saved in the stash "pre-discovery-20261024".
  - The server pulls with the read-only deploy key `/root/.ssh/ashanti_labos_deploy`, using the ssh host `github-ashanti-labos`. The key is on the ashanti-labs repo only.
  - The public site was copied into `/srv/ashanti-labs/site/`. Env files are unchanged.
- **Backups:**
  - Databases and the old site: `/srv/ashanti-labs/backups/discovery-20261024/`.
  - Old app images: `ashanti/web:pre-discovery-20261024` and `ashanti/api:pre-discovery-20261024`.
  - Diff of the live edits: `/root/ashanti-pre-discovery-20261024.diff`.
- **Checks (all passed):**
  - Both APIs are healthy.
  - `/discover` returns 200 on k12 and uni.
  - The catalog has 13 labs.
  - The AI reports ready.
  - ashantilabs.com/, /discover/, k12 and uni /discover, and discover.ashantilabs.com all return 200.
- **Note:** the live server had an uncommitted DemoViewsCard (an "Explore the demo" side card) that nothing used. It is not in the new code; it is kept in the stash.
- **Exact next action:**
  - Add "Source code" links for the GPL tools.
  - Have a subject teacher review the experiments.
  - Decide whether to close PR #3 on umanah-ai-lab now that Ashanti lives in its own repo.

## 2026-10-23 state (Discovery Lab, AI agent, cloud session)
- **Current objective:** build Discovery Lab, the third environment beside K-12 and University, and introduce it on ashantilabs.com (owner, 2026-10-23: "build everything first", same username and password as K-12/University).
- **Completed:** Discovery Lab at `/discover` in both editions (catalog, API, AI Guide on the tutor's safety pipeline, 14 experiments, home/search/lab/experiment/journey pages, nav item); website card, links and `/discover/` page. Notes: `docs/discovery-lab/README.md`; decisions and open items: `docs/founder-review-log.md` 2026-10-23.
- **Tests:** unit 20/20; Discovery API 9/9; API suite 323 pass, 4 fail on base too (Umanah credit text in Ashanti config); browser 39 pass incl. `e2e/discovery.spec.ts` 2/2, 4 fail on base too in the cloud container (Python runtime files missing, layout test).
- **Branch:** `claude/project-thread-xbhcs4`, based on `ashanti-labs` @ 9b74dbc; PR into `ashanti-labs`. **Not deployed.**
- **Exact next action:** owner reviews the PR and says deploy; then deploy to Contabo (`/srv/ashanti-labs`) and add `discover.ashantilabs.com → :8310` to the Cloudflare tunnel.

## 2026-10-10 state (motion pass + K-12 spec leftovers, AI agent)
- **Current objective:** the owner asked for the Emil Kowalski motion fixes and the unbuilt parts of the K-2 to 12 grade-band spec. Both are built and tested on branch `k12-motion-and-bands` (pushed, not merged; the coordinator's brief said never push to main).
- **Completed:** see `docs/founder-review-log.md` 2026-10-10: the motion pass; sign-in school entry; School by Grade (`/teacher/school`); per-student widened content (`users.extra_bands`, migration 0010); project hand-in plus Project helper; Practice for Grade N; tutor reading level by grade (prompt line only; limits unchanged and tested); translation files (`apps/web/src/locales/en.json`, `lib/i18n.ts`).
- **Files:** web `src/index.css`, `components/{common,AppShell}.tsx`, `components/ui/{button,dialog,alert-dialog,sheet,dropdown-menu,tabs,badge,progress}.tsx`, `pages/{Home,Login,Learn,Build,Revision,TeacherK12,Ask,Explore,Lesson}.tsx`, `features/{tutor,TutorPanel,BuildProjects,LibraryBrowser,GradeCourses,Documents}.tsx`, `lib/{bands,api,i18n}.ts`, `locales/en.json`, `e2e/{z-k12-more,a11y}.spec.ts`; API `grades.py`, `models.py`, migration `0010`, `routers/{auth,build,progress,teacher}.py`, `tutor/{modes,prompts}.py`, `tests/test_k12_leftovers.py`.
- **Tests:** API 272/272, browser 47/47 (axe now includes WCAG 2.2 AA).
- **Live since 2026-10-10 21:22 UTC** (deployed from the branch after the owner said "deploy"). The live check passes, but **the tutor is down because the machine is out of memory** (the kernel kills the tutor model; see the review log). The backup from before the deploy is `/srv/ai-node/storage/ssd/umanah-ai-lab/backups/pre-k12-motion-20261010.sqlite3`.
- **Exact next action:** the owner decides what to stop to free about 2 GB of RAM (the review log has the list). Then ask the tutor a question on ai.umanah.org and confirm it answers. Then merge `k12-motion-and-bands` into main. Ashanti handoff: `~/ashanti-labs/UI-UPDATES.md`.
- **Open:** see the review log's open questions (Khan Academy attribution on student cards; Ashanti and CoreTech containers are running again; older screens' strings not yet in translation files).

## 2026-10-01 state (K-12 thread, AI agent)
- **Live on https://ai.umanah.org and pushed (main @ see git log):** K-12 grade bands (grade on each student, four bands, band Homes incl. K-2 picture app, View as Student, per-student teacher view); School Library (Kolibri channels inside Explore: Khan Academy 97%, PhET, African Storybook, MIT BLOSSOMS, Blockly) with Khan practice exercises (server-checked, `perseus.py`); 25 Kiwix books with title-index search; Build (coding games, science, engineering, robotics, AI projects); K-12 curriculum map (`content/curriculum/k12.json`); Local Documents; teacher Assignments/Assessments builder, Practice, Resources, AI Lesson Builder; all 28 course lessons written.
- **Content on the SSD:** `/srv/ai-node/storage/ssd/umanah-ai-lab/` (knowledge/kiwix 38 GB, docker-volumes/kolibri 103 GB, apps/games).
- **Tests:** API 266/266, browser 42/42. Validators: `tools/content/validate_lesson.py`, `tools/content/kiwix-library.sh`.
- **Ashanti Labs handoff:** `docs/handoffs/ashanti-k12-features.md`.
- **Stopped by owner's word (2026-09-30):** Ashanti Labs and CoreTech Media containers on ai-data Docker (memory).
- **Open (see docs/founder-review-log.md):** tutor reading level by grade (child-safety decision), per-student content widening, translation files, subject-teacher review of the 23 new lessons, Global Digital Library (H5P) player.
- **Exact next action:** translation files for UI strings (Ashanti also needs them); then the per-student content-widening setting.


_Last updated 2026-09-24 ~14:40 PDT. Written by Claude (Sonnet 5). Context at time of writing: ~62% of a 1M window (real value from the status line)._

_Updated 2026-09-25 (Claude Sonnet 5). Sections below "Archive" are the 2026-09-24 record._

## Current objective (2026-09-25 priority reset, docs/39 + docs/40)
Polished **fundraising demo**: app matches `design/reference/`, public try-it demo on ai.umanah.org, umanah.org/ai-lab page, sponsor video, enough lessons. Phases 6 to 9 ON HOLD until funded. Owner's work order: A bugs, B match references, C tutor answers, D Build page, E admin and accounts, F polish, G public demo mode, H website (repo `amaeteventurestudios/ui`, clone to `~/projects/ui`), I video and lessons. Constraints: no reboots; do not touch the system Docker, Reydious or HUNGREE Goat; screenshots at 1440x900 and 1366x768 in `docs/media/screens/<part>/`.

## 2026-09-27 owner decisions applied (see docs/founder-review-log.md)
- usg-grid and paperclip are bound to Tailscale and 127.0.0.1 only (applied, healthy; usg-grid `d1eca08` pushed).
- The HUNGREE Goat canonical clone is pushed (`9b2dc26`).
- Pronunciation oo-MAH-nah is confirmed.
- The owner will make the website repo private. Film link: https://umanah.org/ai-lab-film (old -95bc0e link removed, never shared)
- Next: the owner wants to discuss the remaining items, then AI Foundations 3.

## 2026-09-26 follow-up round (see docs/founder-review-log.md, 'Follow-up round')
Done: context-monitor doc, model settings, evals rerun and fixes, Coming soon lessons, sponsor video (docs/media/sponsor-video.mp4, not public), evidence screenshots, website nav/lightbox/polish, admin password sign-in on the public site, real nightly reset, mobile pass, login card. **Waiting on owner:** apply the Tailscale+127.0.0.1-only bindings for usg-grid/paperclip (compose files already edited, uncommitted, in ~/usg-grid/infra/docker/compose.yaml and ~/services/paperclip/docker/docker-compose.override.yml; needs `docker compose up -d` on the SYSTEM Docker, which needs the owner's OK); watch the video; decide whether to publish it.

## 2026-09-26 sponsor video v2
Voiceover (Kokoro, offline) + code-composed music + stronger captions; `docs/media/sponsor-video.mp4` 2:32, not public. Pipeline: `tools/sponsor-video/voice.py` -> `apps/web/e2e/sponsor.mjs` (real tutor, scratch server) -> `tools/sponsor-video/mix.py` (finds real caption times; recorder drifts up to 2.4 s). Owner to confirm the pronunciation of 'Umanah' (set to oo-MAH-nah). Temporary Tailscale-only viewing link http://100.127.44.118:8199/v2.mp4 is served from this Claude session (python http.server); it stops when the session ends.

## Progress by part (verified 2026-09-25 evening, after the second reboot)
- **0 context monitor: DONE** (`~/.claude` and `~/.claude-joshy` both use the status line and hooks; real reading for this session confirmed in `~/.claude/context-monitor/<session>.latest.json`).
- **A bugs: DONE** `6ddfc6d`, `86b8a1a`.
- **B match references: DONE** `e133ddd` (Revision, navy Ask sidebar, layout) + this session's follow-up (Explore reader, captures of all 11 screens in `docs/media/screens/B/`, side-by-side reviewed).
- **C tutor answers: DONE** `e133ddd` (style rules, facts eval 45/47; the 24 extra accuracy questions from `a4bc6d0` were not re-run against the real model).
- **D Build page: DONE** `e133ddd` (helper panel, error help; browser tests).
- **E admin and accounts: DONE** `e133ddd` (roles, permissions, admin area, teacher roster, notifications; `z-accounts.spec.ts`).
- **F polish: DONE** `a4bc6d0` (tour, illustrations, axe accessibility on every screen and role, contrast fixes, page titles).
- **G public demo mode: DONE and live** `d030d65` (`/api/demo/config` enabled on https://ai.umanah.org).
- **H website: DONE and pushed** repo `~/projects/ui` @ `8c4da5a` (AI Lab page, nav, pilot form); https://umanah.org/ai-lab returns 200 with the AI Lab title.
- **I video and lessons: MOSTLY DONE.** Video `docs/media/lesson6-story.mp4` (101 s, real tutor). Lessons with full content: Python 5, 6, 7 (+ earlier), AI Foundations 1 and 2. More lessons are catalog outlines only.

## Dev tools added
`tools/dev-shots-server.sh` (scratch server on 8103, password `shots-password-1`, stub AI; stop with `kill $(cat /tmp/umanah-shots.pid)`), `apps/web/e2e/shots.mjs` (`SHOTS='user:name:/route,...' OUT=docs/media/screens/X node e2e/shots.mjs`). Deploy the running demo: `set -a; . <data>/.env.local; set +a; docker --context ai-data compose -p umanah -f infrastructure/compose/compose.yaml --profile core build api web && ... up -d api web kiwix`.

## Tests (2026-09-25 evening)
API pytest 159/159; Playwright 33/33 (scratch data dir `/tmp/umanah-e2e`, never the demo database); axe scan clean.

## Exact next action
Write more lessons (AI Foundations 3+, Science & Engineering) using `content/ai-foundations/lesson-02-data-and-patterns.json` as the template (add to `tests/test_new_lessons.py`, set `available` in `content/catalog.json`, rebuild api). Re-run the accuracy eval with the 24 added questions. Decide where the video goes (public page/resting page). Video recording needs `~/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux` -> `/usr/bin/ffmpeg` (Playwright has no ffmpeg build for Ubuntu 26.04).

## Archive: 2026-09-24 record
## Current objective (2026-09-24)
Owner instruction (2026-09-24, full autonomy; stop only for sudo/login/money/HUNGREE music or Samsung): Steps 0–5 —
0 pack into repo · 1 Grid shows every drive · 2 data-drive rename · 3 full platform (rootless Docker, Ollama, Moodle, Kolibri, Kiwix, JupyterHub, Open WebUI, `umanah-lab`) · 4 build vertical slice 001 (S2–S8) · 5 `ai.umanah.org` live via VPS nginx + Tailscale.

## Completed work
- **Step 0 ✔** pack v2.5 + audit committed (`99fe559`), CLAUDE.md handoff version (`b35a4c9`).
- **Step 1 ✔** USG Grid (`~/usg-grid`, branch `feature/grid-all-drives`, pushed): per-volume collectors (ai-node-01 / usg-grid-collect / hetzner), `apps/adapters/src/lib/storage.mjs` (+tests, 73 pass), node-card `STORAGE · N volumes` row, detail sheet, Fleet Storage panel; image `usg-grid:0.4.2` live (0.4.1 kept for rollback; `infra/docker/.env` USG_GRID_VERSION=0.4.2). Installed collector: `~/.usg-grid/usg-grid-collect` (backup `.bak.20260924-storage`). Evidence: `ops/evidence/grid-storage/`.
- **Step 2 — non-root part ✔, root part PENDING (needs sudo):** checksums saved (`ops/evidence/data-drive-before.txt`, 483 files); HUNGREE Goat repo (`~/projects/hungreegoat`, commits `a54fcf9`, `519a882`) now uses `HGC_MEDIA` (default `/srv/ai-node/storage/data`); deployed to `~/hungree-goat` (scripts, app files, systemd units; backups in `~/backups/hungree-goat-pre-media-move-20260924/`); services still running on old path until the root script runs.
- **Step 4 — built and tested, running on dev ports:** API `services/api` (FastAPI+SQLite, 29 tests pass), web `apps/web` (React+Vite+shadcn/Radix, builds), Playwright story `apps/web/e2e/story.spec.ts` (6/6 pass, incl. "no request leaves the machine"), evals `services/api/evals` (see results), compare screenshots `design/compare/`.
- **Context monitor ✔** installed for `~/.claude` (only account dir on this box): `~/.local/bin/claude-context-statusline`, `claude-context-hook`, `~/.claude/settings.json` (statusLine + UserPromptSubmit/PostToolUse hooks), `~/.claude/CLAUDE.md`. Backups: `~/.claude/backups-context-monitor-20260924/`. No other launcher dirs (`~/.claude-*`) exist here.

## Current implementation state
- Dev API running: `127.0.0.1:8101` (data `~/umanah-dev-data`, real Ollama), serves built web. Dev Ollama (user-space, models on internal disk `~/ollama-dev`) on `127.0.0.1:8120`: `qwen3:4b-instruct`, `llama-guard3:1b` (Qwen3Guard is not in the Ollama library → documented fallback), `nomic-embed-text`. **Stop both before running the root script** (they don't hold the USB drive, but Ollama dev is replaced by the container).
- Safety = rules + Llama Guard + safeguarding-triage (Qwen, with confirm pass). Tutor: mode from server, hint ladders, answer keys never in prompts, leak check, homework/assessment replies buffered before release.
- Platform packaging written, **not yet committed**: `services/api/Dockerfile`, `apps/web/Dockerfile`, `infrastructure/compose/{compose.yaml,Caddyfile,jupyterhub*}`. `docker compose config` validates.

## Files changed (this session, main)
`content/`, `services/api/**`, `apps/web/**`, `tools/compare.py`, `design/compare/**`, `ops/evidence/**`, `scripts/ai-node-01-data-drive-rename.sh`, `docs/40-DECISION-LOG.md`, `CLAUDE.md`, `HANDOFF.md`. Uncommitted: Dockerfiles + `infrastructure/compose/`.

## Important decisions
See `docs/40-DECISION-LOG.md` (Grid storage; data drive is 57 GiB not ~128 GB → reduced budget; HGC_MEDIA variable). Also: Moodle image `bitnamilegacy/moodle:5.0.2` (Bitnami catalog moved; legacy = no updates → follow-up); Kiwix/Kolibri/Open WebUI pinned to `latest`/`main` for now (pin digests after first pull); Qwen3Guard unavailable → Llama Guard 3 1B; Loops Practice (not Fractions) is the seeded assignment (docs/44 wins over 05).

## Commands run (key)
`sudo` never available. Evals: `cd services/api && UMANAH_DEMO_PASSWORD=eval-password-1 uv run python -m evals.run --sets safety,accuracy,jailbreak`. E2E: `cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE=~/.cache/ms-playwright/chromium-1187/chrome-linux/chrome npx playwright test`. Screens: `node e2e/capture.mjs` then `uv run --with pillow python tools/compare.py`.
**Self-disclosure:** an early `npx playwright` auto-install created `~/.npm/_npx` (removed). `pkill -f` once matched my own shell (harmless).

## Tests and results
- API pytest 29/29. Adapters (Grid) 73/73. Playwright story 6/6.
- Safety eval (409 items, `evals/sets/safety*.jsonl`): high-severity 191/191 → support+alert; educational blocked 0/110. **Caveat:** rules/prompts were tuned against these sets; a fresh, counselor-written set is a release gate (docs/41). First held-out round scored 25% before the triage layer existed.
- Accuracy (32 Qs, real Qwen3 4B): 30/32 = 93.75% (>=90 pass). Jailbreak (140 prompts, real model): **0 answer leaks** (pass). Safety re-run after the triage confirm pass: pass (191/191, 0/110). Evidence: `ops/evidence/evals/20260924-143807-ollama.json` (jailbreak+accuracy run; safety run in the same session).

## Known problems
- Data drive stacked mount (`/dev/sda1` stale layer under `/dev/sdb1`) — fixed by root script, not yet run.
- Assessment/`under13` paths lightly tested; Explore/Revision are honest "later release" pages.
- Bundle JS ~900 kB before lazy split (now split by route); Pyodide ≈14 MB served locally.
- Latency: triage adds ~0.7 s p50 per message on this CPU host (dev only).
- Alembic not set up (tables via `create_all`); docs/18 wants migrations.

## Unresolved questions (defaults applied)
Free-Ask chat visibility, retention (90 d), safeguarding lead — defaults from docs/41 applied and noted.

## Exact next action
Steps (a)-(c) are done: root rename script ran, reboot happened (2026-09-24 15:52 PDT), storage verified.

**2026-09-24 post-reboot incident (fixed this session):** the reboot came up with a new DHCP LAN IP (`192.168.6.233` → `192.168.4.41`). `usg-grid` and `paperclip` both crashed (exit 128) because their Docker `ports:` bindings hardcoded the old LAN IP as the host bind address — Docker cannot bind a port to an address that no longer exists on the host. Storage and HUNGREE Goat came back fine on their own (systemd --user units, no hardcoded IP). Also found and fixed a live false-alarm: the Pi's `hgc-monitor-local.sh` (cron, `*/2 * * * *`) was pinging the dead LAN IP and would have kept reporting "Beelink does not answer" every cycle.

Fix applied (round 1): `usg-grid`, `paperclip`, Grid's own SSH self-collector, and the Cloudflare tunnel prep bound/reached each other via the **Tailscale address** `100.127.44.118` instead of the dead LAN IP, with `127.0.0.1` for same-host callers. HUNGREE Goat's Pi→Beelink LAN-direct check was pointed at the new LAN IP (not Tailscale — that check's whole purpose is testing the LAN path specifically) and fixed live on the Pi.

**Round 2 (2026-09-24, same day, after the owner set the eero reservation):**
- **LAN IP reserved** by the owner: `192.168.4.41` is now fixed via the eero app (MAC `b0:41:6f:0f:d3:45`). Added the LAN bind back everywhere alongside Tailscale + localhost (three simultaneous `ports:`/env bindings each for `usg-grid` and `paperclip`), so LAN-only devices work again without giving up the Tailscale resilience. Verified all three paths return 200 for both services.
- **Found and fixed a dormant Paperclip bug while testing LAN access:** `PAPERCLIP_ALLOWED_HOSTNAMES` (a real, documented Paperclip setting, `doc/DOCKER.md`) was set in `services/paperclip/docker/.env` but never referenced in either compose file's `environment:` block — Docker Compose does not auto-forward `.env` vars into a container, only substitute `${VAR}` placeholders in the compose file. Every Host header other than `PAPERCLIP_PUBLIC_URL`'s own host was silently getting a 403. Added `PAPERCLIP_ALLOWED_HOSTNAMES: "${PAPERCLIP_ALLOWED_HOSTNAMES:-}"` to `docker-compose.override.yml`'s environment block. This was likely broken before today's incident too (nothing suggests direct non-Grid-proxied browser access to Paperclip was ever tested against the old LAN IP).
- **Startup-order safety (no root available — `sudo -n` confirmed to require interactive auth):** `usg-grid/scripts/wait-tailscale-and-recover.sh`, run via `crontab -e` `@reboot sleep 15 && ...`. Polls for `tailscale0` to reach `100.127.44.118` (up to 60s) then re-asserts both compose projects (`docker compose up -d`, a no-op if already healthy) — covers the race where `docker.service`'s own restart of these `unless-stopped` containers gets ahead of `tailscaled` on boot. This is the userland equivalent of the `docker.service` drop-in the owner suggested; no sudo was available to write one to `/etc/systemd/system/`.
- **Committed and pushed**, one commit per repo: `usg-grid` (`bb2cdd1`, pushed), `usg-workforce` (`8da205b`, local only — no remote configured; only the LAN-fix files staged, the pre-existing unrelated dirty state — `security/offsite-backup.sh`, `projection/cron.log`, `__pycache__` — left alone), `hungreegoat` (`5248588`, pushed), `projects/usg-grid` (`b8e98e3`, **committed but NOT pushed** — its HTTPS remote has no credential/deploy-key configured in this session, unlike the SSH-aliased repos; needs `git push --set-upstream origin usg/phase-1-baseline` run with credentials, or a deploy-key SSH remote set up like the others), this repo (below). `~/services/paperclip` (the upstream `paperclipai/paperclip` clone) was correctly left uncommitted — its own override file's header says it's deliberately untracked so `git pull` from upstream stays clean, and pushing to that remote would mean pushing to someone else's public repo.
- **Not yet reconciled (flagged, not touched):** `~/hungree-goat-src/hungreegoat-canonical` is a second, differently-advanced clone of the same `hungreegoat` repo (still has the stale LAN IP, and unknown whether it has anything unpushed) — separate from the actively-used `~/projects/hungreegoat` / deployed `~/hungree-goat`. Owner asked to be told later if it has unpushed work — not yet checked.

**Reboot test (next, this session):** owner asked for one more reboot to verify the startup-order fix. Command to give: `sudo reboot`. After it comes back, verify: `ip -br addr` (LAN should be `192.168.4.41` again, now fixed), `findmnt /srv/ai-node/storage/data /srv/ai-node/storage/reydious`, `systemctl --user status hungree-goat-control hungree-goat-tunnel hungree-goat-liquidsoap@lofi hungree-goat-stream@lofi`, `docker ps` for `usg-grid`/`paperclip`/`bot-crossing`/`agents-office` all healthy, `cat ~/usg-grid/infra/docker/wait-tailscale.log` to confirm the recovery script ran (and whether it was even needed), and `curl` health checks on all three bind addresses for both usg-grid and paperclip.

Then continue: rootless Docker for Umanah, `umanah-lab init`, `umanah-lab models pull`, `umanah-lab start core` (then content/lms/code/admin as RAM allows), benchmark tutor -> `docs/43`, update Grid labels. VPS: owner runs `ops/VPS-NGINX.md` (already Tailscale-based, no LAN IP involved — confirmed clean; agent's VPS account has no sudo, and SSH to the VPS from here isn't set up — host key verification failed on 100.99.107.27).
Still open in Step 4: Alembic migrations, engine health in Lab Status (`UMANAH_ENGINES`), Moodle/Kolibri/Kiwix/Jupyter adapter stubs+tests, screen video of the story, public demo mode (docs/46, Phase 2).

## Session resume after dropped connection (2026-09-24, evening)
- **Found:** no half-finished edits. All repos clean/committed. Uptime showed only the first reboot had happened; second reboot test not yet run.
- **ai-node-01 "Offline / node unreachable" — FIXED.** Cause: the Grid container's `~/.ssh/known_hosts` (mounted read-only) had no entry for `100.127.44.118` (only the old `192.168.6.233`), so the forced-command SSH collector failed with "Host key verification failed". The forced-command key has no `from=` restriction (not the cause); sshd, Tailscale and container routing were fine. Added `100.127.44.118`, `192.168.4.41`, `127.0.0.1` with this host's own `/etc/ssh/ssh_host_ed25519_key.pub` (verified identical to the scanned key). Backup: `~/.ssh/known_hosts.bak-*`. Grid health: 4/4 nodes reachable, `last_error: null`.
- Verified healthy: HUNGREE Goat 4 user units active, both drives mounted (`/dev/sda1` data, `/dev/sdb1` reydious), usg-grid/paperclip/bot-crossing/agents-office healthy.
- Pushed `projects/usg-grid` `usg/phase-1-baseline` via the `github-usg-grid` SSH alias. `usg-workforce` has **no remote** (nothing to push); its unrelated dirty files are untouched.
- Docker-after-Tailscale: needs sudo. Ready: `sudo sh ~/projects/umanah-ai-lab/ops/install-docker-after-tailscale.sh` (drop-in `ops/systemd/docker-after-tailscale.conf`). The cron `@reboot` recovery is the userland fallback and has not yet run through a real boot.
- **Exact next action:** owner runs the installer, then `sudo reboot`; afterwards verify per the "Reboot test" checklist above, incl. `~/usg-grid/infra/docker/wait-tailscale.log`.
- **Owner update:** installer `ops/install-docker-after-tailscale.sh` was run (drop-in in place, Docker not restarted). The owner chose **not** to reboot now: second reboot test is **PENDING until the next natural reboot**. Then check: `findmnt` both drives, HUNGREE Goat user units, `docker ps` health for usg-grid/paperclip/bot-crossing/agents-office, bind addresses (100.127.44.118, 192.168.4.41, 127.0.0.1) for usg-grid:5280 and paperclip, and `~/usg-grid/infra/docker/wait-tailscale.log`.
- **Standing constraint:** do not reboot or restart system Docker or any existing container/service while the owner is working.
- Still to reconcile: `~/hungree-goat-src/hungreegoat-canonical` is behind origin by 3 with uncommitted `dj_orchestrator.py` and two untracked docs (unpushed local work — do not discard).

## Progress after owner said "continue" (2026-09-24, ~20:15 PDT)
- **Rootless Docker ✔** `scripts/ai-node-01-rootless-docker.sh` (needed `--force` on the setup tool; system Docker + all 9 containers verified untouched). Context `ai-data` → data-root `/srv/ai-node/storage/data/docker`; default context still the system daemon; linger on.
- **`umanah-lab init` ✔, `models pull` ✔** (qwen3:4b-instruct, llama-guard3:1b, nomic-embed-text), **`start core` ✔**: web `:8130` (LAN, Tailscale, loopback all 200), API `127.0.0.1:8101` healthy, Ollama `127.0.0.1:8120`. Fixes: API data dir chown for rootless sub-uid (in `init`); web port now `UMANAH_WEB_PORT` with a single wildcard mapping (rootless Docker claims 127.0.0.1:<port> per mapping; HUNGREE Goat's liquidsoap holds 127.0.0.1:8100) — see decision log. `<data>/umanah-ai-lab/.env.local` sets 8130 here. **VPS nginx upstream for this node = `100.127.44.118:8130`** (update `ops/VPS-NGINX.md` before the owner applies it).
- **Grid labels ✔ nothing to change:** collector already reports `AI_NODE_DATA` / `REYDIOUS_DATA` with roles data/reydious; Grid shows them live.
- **Tutor benchmark ✔** (docs/43 "Benchmark results", docs/26, raw JSON in `ops/evidence/loadtest/`): 0 errors at 5/10/20/30 students; p50 first word 13 / 44 / 73 / 108 s (dev CPU host, far from the ≤3 s classroom target, as expected). **Found and fixed a real bug:** SQLite write lock held across the safety-model call → 18/20 failures at 10 students; fix commits before yielding (`fix(api)`). First cold request ~75 s (model load from USB) → warm-up/keep-alive matters. Not yet: accuracy-under-load, thermals, reference hardware.
- Not started: content/lms/code/admin profiles (RAM: core leaves ~3 GB free while a model is loaded), Alembic, engine health, adapter stubs.

## How to get the demo logins (https://ai.umanah.org and the LAN/Tailscale web)
- The file is **`/srv/ai-node/storage/data/umanah-ai-lab/database/demo-credentials.txt`** (owner `aumanah`, mode 600; format `username: password`; accounts `admin`, `mswilliams` (teacher), `msrivera`, `jordan` (student), `student01`–`student27`). Not in Git.
- If a login fails, the file and the running database disagree (a test/eval run reseeded, or the API image was rebuilt with a fresh DB): run **`umanah-lab demo-reset`** — it resets every demo password on the RUNNING database, clears login lockouts, and rewrites the file. Then `cat` the file.
- `~/umanah-dev-data/demo-credentials.txt` is from the OLD dev database (pre-platform) and is stale; ignore it.
- Fixed 2026-09-24 ~21:08 PDT: passwords reset, jordan (student) and mswilliams (teacher) verified logging in through https://ai.umanah.org (200) and a wrong password gets 401. Load tests/evals read this file (`UMANAH_CREDS="$(cat …/demo-credentials.txt)"`); never run evals with `UMANAH_DEMO_PASSWORD` against the running data dir.

## Step 1 (tutor speed) — done 2026-09-24 ~21:45 PDT
Before/after table in docs/43. One student, warm: **0.8 s to first word** (target <5 s). Real single-student problem was the cold start (75–115 s from the USB drive): fixed with keep_alive=-1 (number, not the string), start-up warm-up (~2 min, background), `think:false` + `<think>` stripper (tests), and 4 slots / ctx 2560 on this node (10 students: 44 s → 23 s p50; free RAM stayed ≥2.2 GB). Node overrides live in `<data>/umanah-ai-lab/.env.local` (`UMANAH_WEB_PORT=8130`, `UMANAH_SLOTS=4`, `UMANAH_TUTOR_NUM_CTX=2560`). Restart helper: `~/umanah-logs/restart-core.sh` (not in repo; it only recreates ollama+api on the rootless daemon). Tests 35/35. Next: step 2 (remaining profiles one at a time, keep free RAM ≥1.5 GB, don't touch Reydious or system Docker), then Alembic, engine health, adapter stubs.

## Steps 2 and 3 — done 2026-09-24 ~22:15 PDT
- **Step 2 ✔ all four profiles proven one at a time** (table in docs/53): content (Kolibri 302, Kiwix 200 with Simple English Wikipedia ZIM), lms (Moodle 200 after 251 s first boot; fixes: utf8mb4 DB), code (JupyterHub 200), admin (Open WebUI 200 after 131 s; fixed depends_on). Each stopped again; core stayed up; free RAM never below 2.2 GB; Reydious and the system Docker untouched. Helpers: `tools/umanah-lab/try-profile.sh <profile> name=url…` (has a 1 s RAM watchdog), `restart-core.sh`. New CLI: `umanah-lab kiwix-add`, `demo-reset`.
- **Step 3 ✔** Alembic: baseline `0001`, running DB **stamped** (backup `<data>/umanah-ai-lab/database/umanah.sqlite3.pre-alembic-20260924.bak`); add a migration with `migrate.revision(engine, "msg")`. Engine health on Lab Status (teachers/admins only; states ready/off/unavailable, Umanah wording; verified through https://ai.umanah.org, and "ready" proven with content up). Adapter stubs + 18 new tests; **API tests 58/58**.
- Still open: Kolibri channel import; Moodle course/gradebook integration; Kiwix/Kolibri search in Explore; pin Open WebUI/Kolibri/Kiwix image digests; Moodle image is legacy; teacher-written safety set (release gate); reboot test pending (see above).

## Git status and relevant commits
`main` (umanah-ai-lab, this HANDOFF commit pending); `usg-grid` `feature/grid-all-drives` @ `bb2cdd1` (pushed); `hungreegoat` `main` @ `5248588` (pushed); `usg-workforce` `master` @ `8da205b` (local, no remote); `projects/usg-grid` `usg/phase-1-baseline` @ `b8e98e3` (committed, **not pushed** — see above). `~/services/paperclip` intentionally left uncommitted (upstream clone).
