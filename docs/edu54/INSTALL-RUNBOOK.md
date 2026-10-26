# EDU54 — Install Runbook

> **EDU54 copy (2026-10-26).** This repo was cloned from Ashanti Labs and only the name was changed (Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com). Server facts below (hosts, addresses, paths, deploy dates, "live" checks) describe the **Ashanti Labs** deployment as it was renamed in text; EDU54 itself is **not deployed yet** and has no servers, DNS or email of its own.

Follow in order. Every step is authorized by the owner (`CLAUDE.md` §5); do not ask before running any of it. Stop only for the hard limits listed there. Update `<EDU54_ROOT>/HANDOFF.md` after each phase.

`<SSD>` = the mount point of the 2 TB Samsung SSD. `<EDU54_ROOT>` = `<SSD>/edu54`. This pack lives in `~/edu54` (home folder); copy it into `<EDU54_ROOT>/docs-handoff/` at Phase 2.

---

## Phase 0 — Get onto the machine

1. You are on **ai-node-01** through Remote Control in `~/edu54`. Confirm: `hostname` (expect `ai-node-01`), `whoami` (expect `aumanah`), `free -m`, `nproc`.

## Phase 1 — Read-only survey (nothing written yet)

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,MODEL,SERIAL,MOUNTPOINTS
findmnt -o TARGET,SOURCE,FSTYPE,LABEL,SIZE,AVAIL | grep -v -E 'tmpfs|overlay|squashfs'
df -h
docker context ls
docker --context ai-data ps --format '{{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp | sort -k4
free -m
```

Establish and write down in `HANDOFF.md`:

- `<SSD>`: the ~2 TB ext4 volume from the Samsung SSD that holds the AI Lab folder (likely `/srv/ai-node/storage/ssd`, which already has an empty `edu54` folder). Record its serial. **It must not be the Samsung FIT thumb drive (~128 GB, `REYDIOUS_DATA`).** If the only Samsung volume you can find is the thumb drive, stop and tell the owner the SSD is not mounted.
- Where the AI Lab lives on it, which containers and ports it uses, and that `ai.umanah.org` answers (`curl -sI https://ai.umanah.org`). Save this as the "before" baseline.
- Free space on `<SSD>` and whether the AI Lab's K-12 downloads are still running.
- Which ports in 8300-8399 are free.
- Whether the rootless Docker context `ai-data` exists and where its data-root is.

If `<SSD>/edu54` is not writable by `aumanah`, ask the owner for the one command `sudo chown aumanah:aumanah <SSD>/edu54` (the only sudo this plan might need).

## Phase 2 — Folder, code and config

```bash
mkdir -p <EDU54_ROOT>/{apps,services,config,secrets,models,curriculum,knowledge/{zim,kolibri,openstax,packs},projects,database,docker-volumes,exports,backups,logs,tmp,docs-handoff}
chmod 700 <EDU54_ROOT>/secrets
cp -r ~/edu54/. <EDU54_ROOT>/docs-handoff/
git clone git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git <EDU54_ROOT>/apps/labos
cd <EDU54_ROOT>/apps/labos && git switch -c edu54
```

Copy this pack's `config/` files into `<EDU54_ROOT>/config/` and into the repo where they belong (brand file under the app's config, allowlist under the importer). Copy `CLAUDE.md`, `CONTENT-CATALOG.md` and this runbook into the branch as `docs/edu54/`.

Commit identity for the repo: `Umanah Systems Group <admin@amaete.com>` (LabOS default) unless the repo's config says otherwise.

## Phase 3 — Code changes on branch `edu54`

Read the repo's `CLAUDE.md`, `HANDOFF.md`, `docs/44` and the code first. Then:

1. **Brand switch.** Add `LABOS_BRAND` (`umanah` default, `edu54`). Move product name, logo, favicon, colors (CSS variables / Tailwind theme tokens), page titles, About text and footer strings into brand files. EDU54 values: `config/brand.edu54.json`. Grep the web app and API for `Umanah`, `umanah`, `AI Lab` and navy hex values; every hit either reads from the brand config or is on the About / Open Source Notices page.
2. **Edition switch.** Add `LABOS_EDITION` (`k12`, `university`). Drive nav labels and terms (Teacher/Lecturer, Class/Course, Grade/Year), level lists, young-child login, Build tool list, and the content catalog from `config/editions.yaml`. Default for the AI Lab stays as it is today.
3. **Instance switch.** Everything that names a path, port, DB file, compose project or container must come from env (`config/edu54-k12.env`, `config/edu54-uni.env`), so two instances run from one checkout.
4. **License gate in the importer.** Every content item needs `license`, `source_url`, `attribution`, `checked_on`. When `LABOS_BRAND=edu54`, anything whose license is not in `config/content-allowlist.yaml` is rejected, and anything on the denylist (source names/domains) is rejected even if its metadata claims an allowed license. Add tests for both.
5. **Lesson audit.** List every lesson in `content/`. For each, record whether it adapts or cites an excluded source. Ship only clean ones to EDU54; list the rest in `docs/edu54/EDU54-EXCLUSIONS.md`.
6. **Attributions page** generated from the catalog metadata.
7. **Tests:** existing API and browser suites must still pass with the Umanah defaults (no AI Lab regression). Add Playwright runs for both EDU54 instances: login as each role, each nav item loads, no "Umanah" text outside About/notices, no excluded source name anywhere in rendered pages or the catalog API.

Push the branch (`git push -u origin edu54`). Never push to `main`.

## Phase 4 — Services

Compose projects (all via `docker --context ai-data compose`):

| Project | Services | Ports (host) | Bind |
|---|---|---|---|
| `edu54-shared` | Ollama | 8320 | 127.0.0.1 only |
| | Kiwix server | 8312 | 127.0.0.1 only |
| | Kolibri | 8311 | 127.0.0.1 (+ LAN for admin if needed) |
| `edu54-k12` | web | **8300** | LAN + Tailscale |
| | API | 8301 | 127.0.0.1 |
| `edu54-uni` | web | **8350** | LAN + Tailscale |
| | API | 8351 | 127.0.0.1 |
| | JupyterHub (profile `code`, optional) | 8353 | LAN + Tailscale |

If a port is taken, use the next free one inside 8300-8399 and record it. All volumes are bind mounts under `<EDU54_ROOT>/docker-volumes/` and `<EDU54_ROOT>/database/`. Databases: `database/k12.db`, `database/uni.db` (SQLite, WAL).

Provide one command, e.g. `<EDU54_ROOT>/services/edu54-lab start|stop|status [shared|k12|uni|all]`, modelled on `umanah-lab`. Stopped = near-zero RAM, state kept.

**RAM rule (12 GB box, AI Lab is live):** check `free -m` before starting anything. Start order: `shared` (without Ollama first), `k12`, `uni`. Then Ollama per the RAM guard in `CLAUDE.md` §3. Never stop or restart AI Lab containers to make room. JupyterHub stays off on the Beelink unless at least 3 GB is available after everything else; JupyterLite is the default notebook.

## Phase 5 — Models

On ai-node-01 (into `<EDU54_ROOT>/models/` via EDU54's Ollama):

| Role | Model | License |
|---|---|---|
| Tutor | `qwen3:4b` (4-bit instruct) | Apache 2.0 |
| Safety | Qwen3Guard small if runnable, else `llama-guard3:1b` | Apache 2.0 / Llama 3 license (attribution) |
| Embeddings | `nomic-embed-text` | Apache 2.0 |

Record name, version, source, checksum and license for each in the model registry. Run the repo's tutor and safety evals (`services/api/evals/`) against EDU54's config and record results.

## Phase 6 — Content

Follow `CONTENT-CATALOG.md`: K-12 Tier 1, then University Tier 1, then Tier 2 while within the 600 GB EDU54 cap and the 300 GB free-space floor.

- Download into `<EDU54_ROOT>/knowledge/…`, never into AI Lab folders. Do not reuse or hard-link AI Lab downloads (keeps the installs fully independent; space is ample).
- Kiwix ZIMs: `https://download.kiwix.org/zim/` (pick the English `maxi`/`nopic` variant to fit the plan). OpenStax: openstax.org book pages (PDF + offline web). Kolibri channels: import only channels on the allowlist.
- For each item, check the license at the source now, fill the metadata, then import through the license gate. Log rejected items with the reason.
- Use resumable downloads (`aria2c -c` or `wget -c`), run large ones in the background with logs in `<EDU54_ROOT>/logs/downloads/`.

## Phase 7 — Verify and report

1. Both instances load on the LAN: `http://192.168.4.41:8300` (K-12) and `http://192.168.4.41:8350` (University); also over Tailscale if the node is on it.
2. Playwright suites pass for both; screenshots of every main screen for both editions saved to `<EDU54_ROOT>/exports/screenshots/`.
3. Unplug-internet test: block outbound in a test container (not the host's real network, which would drop the AI Lab's public demo) and check Ask, Learn, Build and Explore still work.
4. **No-regression check:** compare with the Phase 1 baseline: AI Lab containers, ports and `ai.umanah.org` unchanged; HUNGREE Goat's four units running and port 8090 healthy; Reydious untouched.
5. Report to the owner (short): the two URLs, where the demo logins are, what was installed (sizes, licenses), what was excluded and why, open items, next steps.

## Phase 8 — Mac mini demo box (when reachable)

The Mac mini (24 GB RAM, ~2 TB) is the portable demo box.

- Needs: the owner connects it as a Remote Control device (or gives SSH). That is a human step; ask once when you reach this phase.
- Install Ollama natively on macOS and pull `qwen3:14b` (4-bit, ~9 GB). Everything else runs in a container runtime that is free for commercial use (e.g. Colima), pointing the API at the host's Ollama.
- One edition per box in production; on the demo Mac, run both instances as on the node.
- Copy content by `rsync` from `<EDU54_ROOT>/knowledge/` over the LAN rather than re-downloading.
- If macOS limits GPU memory, raise it with the `iogpu.wired_limit_mb` sysctl only if Qwen3-14B fails to load (this needs sudo: ask with the exact command).
- Load-test 10-50 simulated users with the repo's load-test tool and record time-to-first-word and queueing.

## Phase 9 — Per-school provisioning (every customer order)

EDU54 is sold per order. There is no online checkout and no self-install: for each school or university that orders, we configure its box ourselves before it ships. A customer box always runs **one edition**, never both (running both is for our demo machines only).

Build this once as a scripted step, then run it per order:

- A per-institution file, `schools/<school-id>.yaml` (template: `config/school.example.yaml`), holding everything that differs between customers.
- A command, e.g. `edu54-lab provision schools/<school-id>.yaml`, that applies it to a clean box and prints a provisioning report. It must be safe to re-run.

**Per-order checklist**

1. **Order details into the school file:** institution name, short name, country, edition (`k12` or `university`), languages (English only for now), expected student count, hardware tier (school box or university box, `HARDWARE.md`), and the name and email of the institution's admin and designated safety contact(s).
2. **Branding:** the institution's logo (SVG or PNG) and optional accent color go into the school file. The product stays EDU54, with the school's name and logo shown on the login page and the top bar, e.g. "EDU54 · Kings College Lagos". Check the colors for WCAG AA contrast.
3. **Base install:** install the EDU54 release (a tagged version of the `edu54` branch) with `LABOS_BRAND=edu54` and the ordered `LABOS_EDITION`. No demo seed data.
4. **Accounts:** create the Institution/School Admin and the safety contact(s) with one-time passwords that must be changed at first login. Teachers and students are created by the school's admin after delivery, or bulk-imported from a CSV the school sends us.
5. **Content:** install the edition's catalog, trimmed to the school's order (subjects, grade/year levels) and to the box's storage. Every item passes the license gate. Record what's installed in the report.
6. **Models:** pull the tutor, safety and embedding models for that hardware tier (`HARDWARE.md`). Run the tutor and safety evals and record the scores.
7. **Network:** set the hostname (e.g. `edu54-<school-id>`), local HTTPS, and the LAN address plan agreed with the school's IT (LabOS `docs/45`). Nothing is exposed to the internet.
8. **Test:** run the Playwright suite for that edition, the internet-unplugged test and a load test sized to the student count. Log in as each role.
9. **Ship pack:** the provisioning report (versions, content list with licenses and attributions, model list, eval scores, test results), the admin's first-login sheet (sealed, never emailed in plain text), and a one-page quick start for the school.
10. **Record:** keep `schools/<school-id>.yaml` and the report in our records (no passwords, no student data) so the box can be rebuilt or updated the same way.

Human-only steps in this checklist: taking the order and the school's details, buying hardware, and handing credentials to the school. Everything else is scripted.
