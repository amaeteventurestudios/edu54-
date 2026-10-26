# ai-node-01 — Host Runbook

This is the only place in the pack for details about the current development machine. Product docs in `docs/` describe Umanah AI Lab in general and must not depend on this host. If this repository is ever made public, review or remove this `ops/` folder first: it contains LAN addresses, drive serials and access details.

Supporting history: `27A-AI-NODE-01-DEPLOYMENT.md` (deployment plan) and `27B-AI-NODE-STORAGE-HANDOFF.md` (storage prep record).

## Host

| Item | Value |
|---|---|
| Hostname | `ai-node-01` (Beelink mini PC) |
| LAN | DHCP on `enp1s0` — changes on renewal/reboot; `ip -br addr` for the current value. No fixed reservation yet (see "LAN IP reservation" below). |
| Tailscale | `100.127.44.118` — stable across LAN/DHCP changes and reboots. Every service that binds to a specific host address (USG Grid, Paperclip, HUNGREE Goat's cloudflared tunnel prep) binds here, not to the LAN IP, so a DHCP renewal can't take the service down. A 2026-09-24 LAN renewal (old IP `192.168.6.233` → new) did exactly that to usg-grid and paperclip until fixed. |
| OS | Ubuntu 26.04.1 LTS |
| CPU | AMD Ryzen 7 5800H, 16 logical cores |
| RAM | ~12.1 GB |
| Role | Personal development and demo host. Umanah runs on demand, not 24/7. |

## Storage

| Disk | Identity | Role | Rule |
|---|---|---|---|
| Internal NVMe (`nvme0n1`, Crucial) | OS disk | Ubuntu, system packages, the existing system Docker and its containers | Never repartition or format. Umanah does **not** run from here. |
| SanDisk ~128 GB USB — **the data drive** | label **`AI_NODE_DATA`**, mounted **`/srv/ai-node/storage/data`** (was `/media/hungree-goat`) | **HUNGREE Goat only** (owner, 2026-09-29): music, mixes, artwork, skins, animation, playlists, `.cache`. Nothing else goes here. Umanah AI Lab and its rootless Docker data-root moved to the T7 SSD on 2026-09-29; old copies `umanah-ai-lab.pre-ssd-20260929` and `docker.pre-ssd-20260929` stay until the owner OKs removing them | Never format. Never move, rename, delete or chown the music files. |
| Samsung Flash Drive FIT ~128 GB | serial `0361823090000118` | none (wiped, removed) | Formerly Reydious (`REYDIOUS_DATA`). Reydious now moves to the DGX Spark, not this node. |
| Samsung T7 Shield 2 TB SSD (USB) | lsblk serial `M88001AT0SNRN6S`, by-id `usb-Samsung_PSSD_T7_Shield_S6NRNS0TA10088M-0:0`, UUID `2c8a4137-c5f8-4fd7-8e96-e7b4e2a1ee94` | shared project storage: one folder per project (coretech-media, edu54 (the paid university AI lab), umanah-ai-lab (live Umanah AI Lab data, `UMANAH_ROOT=/srv/ai-node/storage/ssd/umanah-ai-lab`), periodic-engine, periodic-empire, jolofe, deeptechly) | Also holds `docker/`, the rootless Docker data-root (Umanah AI Lab images and containers). GPT + ext4, label `AI_NODE_SSD`, mounted `/srv/ai-node/storage/ssd` via fstab `nofail`, owner `aumanah`. Formatted 2026-09-29 with `ops/scripts/format-samsung-t7.sh`. |

Device letters (`/dev/sdb`, `/dev/sdc`) can change between boots. Always identify disks by serial, UUID or `/dev/disk/by-id`.

### LAN IP reservation (human-only — router is an eero mesh network)

The router answering `192.168.4.1` redirects to `blocked.eero.com`, which identifies it as an **eero** mesh network. eero has no local admin web page — reservations are set in the eero app or at `eero.com`, signed into the account that manages this network:

1. Open the eero app (or the eero web dashboard) → **Network Settings** (gear icon, or the "Discover"/"Settings" tab depending on app version) → **Reservations & Port Forwarding**.
2. Tap **Add a reservation**, or find `ai-node-01` already listed under connected devices and select it. Match by MAC address if the device name doesn't show: **`b0:41:6f:0f:d3:45`** (interface `enp1s0`).
3. Reserve its current address, **`192.168.4.41`** (or any free address — eero will hold whichever one you pick to that MAC from then on).
4. Save. No reboot needed; the reservation applies on the device's next DHCP renewal, or immediately if you also request a renewal from the device (`sudo dhclient -r enp1s0 && sudo dhclient enp1s0`, or just reboot).

Once reserved, tell Claude "LAN IP reserved" — the LAN-bound entries added back to compose files (`GRID_BIND_LAN`, `UMANAH_BIND_LAN`, HUNGREE Goat's Pi monitor) can then be trusted not to go stale again. Until then, every service that needs a stable address binds to the Tailscale IP (`100.127.44.118`) instead, per the 2026-09-24 incident above.

Phase 0 was verified from a separate non-sudo shell and pushed as commit `bc1966b` on `main`.

### Data drive rename (owner request, 2026-09-24)

The SanDisk is no longer "the HUNGREE Goat drive". It is the general data drive for this machine. Do this first, carefully:

0. **Clean up the double mount.** The audit (2026-09-24) found `/media/hungree-goat` mounted twice: a stale `/dev/sda1` entry underneath the live `/dev/sdb1`. Stop anything using the path (HUNGREE Goat), unmount both layers (lazy-unmount the stale one if needed), confirm nothing is mounted there, and find what created the stale entry (fstab line, udisks automount, systemd mount unit) so it can't come back.
1. **Record the current state:** device by-id, UUID, filesystem, current label, current mount line (fstab or automount), and a full file listing with sizes and checksums of the HUNGREE Goat music (`find … -type f -exec sha256sum`). Save it to `ops/evidence/data-drive-before.txt`.
2. **Relabel the filesystem** to `AI_NODE_DATA` without formatting (`e2label` for ext4, `exfatlabel` for exFAT, `fatlabel` for FAT). Relabeling does not touch file contents.
3. **Mount by UUID at `/srv/ai-node/storage/data`** with an fstab line using `nofail` (owner `aumanah`). Remove the old `/media/hungree-goat` mount entry.
4. **Compatibility link:** create `/media/hungree-goat` as a symlink to `/srv/ai-node/storage/data` so nothing breaks while HUNGREE Goat is being updated.
5. **HUNGREE Goat facts.** Source code: `https://github.com/amaeteventurestudios/hungreegoat` (AGPL-3.0; FastAPI control app, Liquidsoap, FFmpeg). `~/hungree-goat` on this machine is the **deployed runtime** (app, secrets, run, logs, data, bin), intentionally not a git checkout. It runs as four `systemd --user` units: `hungree-goat-control` (port 8090), `hungree-goat-liquidsoap@<station>`, `hungree-goat-stream@<station>`, `hungree-goat-tunnel`. The media root is set by the **`HGC_MEDIA`** environment variable (default `/media/hungree-goat`) and holds `music/`, `artwork/`, `animation/`, `fallback/`, `jingles/`, `station-ids/`, `playlists/` at the top of the drive.
6. **Update HUNGREE Goat to the new path — through its repo:**
   - Clone `amaeteventurestudios/hungreegoat` into `~/projects/hungreegoat` (or pull if present).
   - Search the repo for `/media/hungree-goat` (`infra/beelink/` Dockerfile, systemd units, `bin/` scripts, config defaults, docs) and change the default to `/srv/ai-node/storage/data`. Commit and push to the HUNGREE Goat repo with a clear message.
   - On the running install, set `HGC_MEDIA=/srv/ai-node/storage/data` wherever the deployed units/env read it, and update any container volume mounts. Search `~/hungree-goat` (excluding `secrets/` contents — names only) and `~/.config/systemd/user/` for remaining old paths. Deploy using the repo's own documented Beelink procedure.
   - Restart the four units (this briefly interrupts the radio stream; do it in one quick pass), then verify: control API healthy on 8090, every station's Liquidsoap playing, stream units running, artwork/jingles/fallback load.
   - The media folders stay exactly where they are on the drive; only the mount point changes.
7. **Verify:** music checksums identical to step 1 (`ops/evidence/data-drive-after.txt`); HUNGREE Goat working; reboot test (drive mounts at the new path, HUNGREE Goat and the Umanah stack start cleanly).
8. After a successful reboot test, remove the compatibility symlink, then run the HUNGREE Goat check again.
9. Update the USG Grid storage card labels to the new name (`USG-GRID-STORAGE-TELEMETRY.md`).

### Data drive layout

The music stays exactly where it already is on the drive. New top-level folders are added beside it:

```text
/srv/ai-node/storage/data/
├── <existing HUNGREE Goat music folder(s)>   # untouched
├── docker/            # data-root for the rootless Docker daemon (images, containers, volumes)
├── umanah-ai-lab/
│   ├── apps/          # git checkout: apps/umanah-ai-lab
│   ├── services/      # compose files, configs, umanah-lab CLI
│   ├── models/        # Ollama models
│   ├── curriculum/
│   ├── knowledge/     # Kiwix ZIMs, Kolibri content, uploaded documents, search index
│   ├── projects/      # student projects, Jupyter home directories
│   ├── database/      # Umanah SQLite, Moodle MariaDB data
│   ├── docker-volumes/# bind-mounted service data (moodledata, kolibri home, jupyterhub, open-webui)
│   ├── exports/
│   ├── backups/
│   ├── logs/
│   └── tmp/
└── <future apps>/     # each future app gets its own top-level folder
```

### Filesystem

Docker, databases and Python need a Linux filesystem. Check the drive's filesystem during the rename step.

- **ext4:** use it directly.
- **exFAT/FAT:** do **not** reformat. Create one ext4 image file on the drive (e.g. `/srv/ai-node/storage/data/linux-volume.img`, sized to leave the music plus ~15 GB free), loop-mount it via fstab (`nofail`, after the data drive mounts), and place `docker/` and `umanah-ai-lab/` inside it via bind mounts to the paths above. The music stays on the exFAT part untouched.

### Docker on the data drive (rootless)

The existing system Docker (≈9 containers on the internal disk) must not be moved or changed. Umanah and future data-drive apps use a **separate rootless Docker daemon** for user `aumanah`:

- install the rootless extras (`docker-ce-rootless-extras`, `uidmap`, `slirp4netns` or `pasta`) as system packages;
- `dockerd-rootless-setuptool.sh install`, then set `data-root` in `~/.config/docker/daemon.json` (since 2026-09-29: `/srv/ai-node/storage/ssd/docker` on the T7 SSD; the drop-in `~/.config/systemd/user/docker.service.d/wait-for-ssd.conf` keeps the rootless daemon from starting until the SSD is mounted);
- enable lingering (`loginctl enable-linger aumanah`) so it starts at boot;
- create a Docker context named `ai-data` and have `umanah-lab` always use it (`docker --context ai-data compose -p umanah …`), so it never touches the system daemon.

### Service ports (Umanah range 8100–8199)

| Service | Port | Bound to |
|---|---|---|
| (HUNGREE Goat control — existing) | 8090 | leave as is |
| Umanah web | 8100 | LAN + Tailscale |
| Umanah API | 8101 | localhost (web proxies to it) |
| Moodle | 8110 | LAN + Tailscale (admins/teachers) |
| Kolibri | 8111 | localhost + LAN admin |
| Kiwix | 8112 | localhost |
| JupyterHub | 8113 | LAN + Tailscale |
| Open WebUI | 8114 | LAN + Tailscale (staff) |
| Ollama | 8120 | localhost only |

Check that none of these is already in use before binding; if one is, pick the next free port in the range and record it here.

**USB flash endurance.** Flash sticks are slower and wear faster than SSDs under database writes. Keep SQLite in WAL mode, rotate logs, and back up databases nightly to `backups/`.

## Lifecycle

One command controls the whole stack, using Docker Compose profiles (`docs/53-PLATFORM-SERVICES.md`):

```text
umanah-lab start [core|content|lms|code|admin|all]
umanah-lab stop | restart | status
```

When stopped, it uses near-zero CPU/RAM and keeps all state. Check free RAM before `all`; other workloads already use ~3 GB.

## Git

- Canonical repo: `https://github.com/amaeteventurestudios/umanah-ai-lab.git` (private), default branch `main`.
- The host uses a repository-scoped deploy key titled `ai-node-01` with write access, SSH alias `github-umanah-ai-lab`:

```text
git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git
```

- Commit identity for this repo: `Umanah Systems Group <admin@amaete.com>` unless the owner says otherwise.
- Never commit HUNGREE Goat media, model weights, runtime databases, private school documents, secrets, logs, backups or application data. The repo holds source, config, docs and tests only.

## USG Grid: show every drive (first task)

The Grid runs on this machine and reads each node over SSH with a forced-command key. The audit found the node card measures only `/` — `scripts/collect-ai-node-01.sh` line 64 — so neither USB drive ever appears.

1. **Collector:** change the ai-node-01 collector to report every real volume (skip tmpfs, overlay, loop, squashfs and duplicate mounts): label, model, mount point, filesystem, size, used, free, transport (usb/nvme), role (system / data / reydious), health. Apply the same change to the other node collectors if they share the pattern, so every card and the fleet panel stay consistent.
2. **Node card:** replace the single DISK row with **STORAGE · N volumes** and a row of up to three mini bars side by side (System · Data · Reydious), each with "X GB free" under it. Single-disk nodes keep one full-width bar, so all cards stay the same height. Footer adds "· N external drives". Clicking the Storage row opens a side sheet with full per-volume details.
3. **Fleet Storage panel:** fill the empty space after the last node card with a panel spanning the remaining columns: every drive across all nodes, total capacity and free space, and warnings. If the last row is full, the panel becomes a full-width row, so the page never has a gap.
4. **Health colors:** >85% used amber, >95% red, expected drive missing = Degraded, unexpected read-only = Degraded.
5. Match the existing Grid look exactly (dark navy cards, same type, same bar style). Verify with before/after screenshots of `grid.umanahsystems.com/nodes`.
6. If the Grid code is not in git, `git init` + baseline commit before changing it.

## Existing workloads

The host runs ~9 containers and 14 services (Grid, agent runtime and others). **Hermes** (the agent runtime) currently uses OpenRouter; leave it as is. Before starting anything, list listening ports and use the Umanah range 8100–8199 only. Never stop or change existing containers or services.

Ollama is **not installed** (audit 2026-09-24): no binary, service, image or data. Install it fresh as part of the Umanah platform (`docs/53`), on port 8120, with models on the data drive.

## Public routing

Facts from the audit (2026-09-24): DNS `ai.umanah.org A 2.29.28.125` (TTL 300) already points to the VPS (`hetzner-usg`, Ubuntu 24.04, ~21 production containers). The VPS runs **nginx** (not Caddy) and has **no** `ai.umanah.org` server block. **Correction (2026-09-24, verified):** the VPS *is* on the tailnet — it is the node `umanah-dataroom` (`100.99.107.27`; `tailscale ping` from ai-node-01: 190 ms, direct) — and can reach `100.127.44.118`. The first audit wrongly said it was not on Tailscale (it looked for a peer named after the host). No Tailscale login is needed.

Target:

```text
Internet → ai.umanah.org (DNS → 2.29.28.125)
        → nginx on the VPS (HTTPS, Let's Encrypt via certbot)
        → Tailscale → ai-node-01:8100 (Umanah web)
```

Steps:

1. **Tailscale on the VPS.** Already installed and joined (node `umanah-dataroom`, 100.99.107.27) — nothing to do. Upstream address: `100.127.44.118:8100`.
2. **nginx server block** for `ai.umanah.org` in its own file (`/etc/nginx/sites-available/ai.umanah.org`), reverse-proxying to `ai-node-01`'s Tailscale address on port 8100, with WebSocket/streaming support (`proxy_http_version 1.1`, `Upgrade`/`Connection` headers, `proxy_buffering off` for streamed tutor replies). Do not change any other server block or container on the VPS.
3. **Certificate** with `certbot --nginx -d ai.umanah.org`. Test with `nginx -t` before every reload.
4. **Resting page:** when ai-node-01 is unreachable or the stack is stopped (upstream error 502/503/504), nginx serves a static page from the VPS: "The Umanah AI Lab demo is resting. Check back soon." styled with Umanah colors.
5. The Umanah web port on ai-node-01 listens on LAN and Tailscale only, never publicly. Never put a Tailscale `100.x` address in public DNS. Never expose SSH publicly.
6. If sudo on the VPS is not available to the agent, write the exact files and commands in `ops/VPS-NGINX.md` for the owner and continue with everything else.

## Parallel agent sessions (Umanah and Reydious)

Different disks alone are not enough isolation. Separate sessions must use separate repos/worktrees, working directories, runtime roots, service/unit names, host ports, databases, logs and `.env` files. Reserve port ranges:

| Project | Port range |
|---|---|
| Umanah AI Lab | 8100–8199 |
| Reydious | 8200–8299 |

## Human-only actions on this host

Interactive `sudo` is a valid blocker. Finish all non-root work first, then ask for the smallest exact root command.
