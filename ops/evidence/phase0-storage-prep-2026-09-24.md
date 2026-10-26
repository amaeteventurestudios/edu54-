# AI Node 01 — Primary Full-Stack Development and Demo Deployment

This document supersedes the Raspberry Pi as the primary full-stack implementation target. The Pi remains a constrained/offline validation node.

## Host

- Hostname: `ai-node-01`
- LAN: `192.168.6.233`
- OS: Ubuntu 26.04.1 LTS
- CPU: AMD Ryzen 7 5800H
- Logical cores: 16
- RAM: ~12.1 GB
- Role: development/demo host; most Umanah services are on-demand

## Storage roles

Never identify removable drives only by `/dev/sdX`. Use model, serial, capacity, filesystem, UUID, and `/dev/disk/by-id`.

### Internal system disk
Use for Ubuntu, system packages, Docker engine/runtime, lightweight configuration, and host services.

### Existing ~128 GB HUNGREE Goat USB — Umanah runtime
This drive contains HUNGREE Goat media and MUST NOT be formatted or erased. Preserve all existing files and ownership. Create a dedicated subtree under its stable mount:

```text
<existing-hungree-goat-mount>/umanah-ai-lab/
├── apps/
├── services/
├── models/
├── curriculum/
├── knowledge/
├── projects/
├── database/
├── docker-volumes/
├── exports/
├── backups/
├── logs/
└── tmp/
```

Use explicit bind mounts/service-specific volumes. Do not recursively chown the whole drive.

### New Samsung ~128 GB USB — Reydious reserve
This drive is NOT for Umanah AI Lab. After conclusive identification:

- GPT partition table
- one ext4 partition unless inspection dictates otherwise
- suggested label: `REYDIOUS_DATA`
- suggested mount: `/srv/ai-node/storage/reydious`
- UUID-based fstab
- safe removable-drive options such as `nofail`

After verification, leave it unused.

## Source checkout

Canonical repo:

`https://github.com/amaeteventurestudios/umanah-ai-lab.git`

Recommended checkout:

`~/projects/umanah-ai-lab`

Keep source and runtime state separate.

## Application lifecycle

The complete stack must support one logical lifecycle:

```text
umanah-lab start
umanah-lab stop
umanah-lab restart
umanah-lab status
```

A Docker Compose/systemd wrapper is acceptable. When stopped, the demo stack should consume negligible CPU/RAM while preserving persistent state.

## Public routing

Keep public DNS:

`ai.umanah.org -> 2.29.28.125`

Routing:

```text
Internet
  -> ai.umanah.org
  -> Hetzner public endpoint
  -> HTTPS reverse proxy
  -> private Tailscale path
  -> ai-node-01
```

Never expose SSH publicly.

## Verification

Before declaring deployment ready, verify:

1. exact block-device identities/UUIDs;
2. HUNGREE Goat files unchanged;
3. Samsung prepared and left unused;
4. Umanah runtime state resides only in the intended HUNGREE Goat subtree;
5. stack start/stop/restart/status works;
6. RAM/disk usage measured stopped and running;
7. public HTTPS route works through Hetzner;
8. private admin remains private;
9. UI flows verified with Playwright;
10. Git tree clean and intended changes committed.

## Storage prep status (Phase 0 — completed 2026-09-24)

Storage preparation (items 1–3 above) is done and independently verified. No application,
model, or database has been installed on either drive yet — this was storage prep only.

### HUNGREE Goat drive (Umanah runtime subtree)

- `/dev/sdb1`, SanDisk USB, ext4, label `HUNGREE-GOAT`, UUID
  `7d12ed26-3a1f-45c6-a1ce-37c5097c3d11`, mounted at `/media/hungree-goat` (pre-existing,
  `nofail` in `/etc/fstab`, unchanged by this task).
- Existing HUNGREE Goat content (`.cache/`, `animation/`, `artwork/`, `fallback/`,
  `jingles/`, `lost+found/`, `mixes/`, `music/`, `playlists/`, `skins/`, `station-ids/`)
  verified byte-identical in directory listing before and after — nothing renamed, moved,
  deleted, or recursively re-owned.
- New subtree `/media/hungree-goat/umanah-ai-lab/` created with the exact layout specified
  above (`apps/ services/ models/ curriculum/ knowledge/ projects/ database/
  docker-volumes/ exports/ backups/ logs/ tmp/`), owned `aumanah:aumanah`, plus a `README.md`
  documenting the layout. Empty — reserved for future use.

### Samsung drive (Reydious reserve)

- Conclusively identified before any destructive action via vendor/model/serial (Samsung
  "Flash Drive FIT", serial `0361823090000118`), distinct from the OS disk (`nvme0n1`,
  internal Crucial NVMe) and from the HUNGREE Goat drive (`/dev/sdb`, SanDisk, different
  serial, already mounted elsewhere). Was untouched, factory exFAT, not mounted, not in
  fstab at time of identification.
- Wiped and repartitioned by the user (root required; this environment has no
  non-interactive sudo credential) as:
  - `/dev/sdc` — GPT partition table, one partition spanning the full disk.
  - `/dev/sdc1` — ext4, label `REYDIOUS_DATA`, UUID `2ffee1d1-7192-4b79-a34a-6908b229ee94`.
  - Mounted at `/srv/ai-node/storage/reydious`, owned `aumanah:aumanah`.
  - `/etc/fstab` entry: `UUID=2ffee1d1-7192-4b79-a34a-6908b229ee94
    /srv/ai-node/storage/reydious ext4 defaults,nofail 0 2`. Pre-change fstab backed up to
    `/etc/fstab.backup-before-reydious`.
- Verified independently (separate shell, no sudo): GPT confirmed (`lsblk PTTYPE=gpt`),
  ext4 confirmed, label confirmed via `blkid`, mount point confirmed via `findmnt`,
  normal-user write access confirmed (write+delete test file as `aumanah`, no sudo),
  `mount -a` confirmed idempotent/clean after an unmount+remount cycle, HUNGREE Goat and
  the OS disk both reconfirmed unaffected.
- Left empty per spec — no Reydious install, no models, no Umanah data placed on it.
