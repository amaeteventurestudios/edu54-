# AI Node 01 — Primary Full-Stack Development and Demo Deployment

> **Superseded paths (2026-09-24):** the SanDisk is now the data drive `AI_NODE_DATA` mounted at `/srv/ai-node/storage/data`, and v1 now uses a rootless Docker daemon on that drive. Current details: `AI-NODE-01.md`. This file is kept as history.

This document supersedes the Raspberry Pi as the current **primary full-stack implementation target**. `pi-node-01` remains a constrained/offline validation node.

## Host

- Hostname: `ai-node-01`
- LAN: `192.168.6.233`
- OS: Ubuntu 26.04.1 LTS
- CPU: AMD Ryzen 7 5800H
- Logical cores: 16
- RAM: ~12.1 GB
- Role: personal development/demo host; most Umanah services are on-demand rather than 24/7

## Git source of truth

- Canonical repo: `https://github.com/amaeteventurestudios/umanah-ai-lab.git`
- Visibility during active development: private
- Default branch: `main`
- Recommended checkout: `~/projects/umanah-ai-lab`
- `main` stays stable; substantial work uses focused branches/worktrees.
- Deploy key title on GitHub: `ai-node-01`; write access was enabled so the host can commit/push through its dedicated SSH alias.

## Storage roles

Never identify removable drives only by `/dev/sdX`. Use model, serial, capacity, filesystem, UUID, and `/dev/disk/by-id`. Device letters may change.

### Internal system disk

Use for Ubuntu, host packages, Docker engine/runtime, lightweight configuration, and host services. Do not repartition or format as part of Umanah work.

### Existing SanDisk ~128 GB USB — HUNGREE Goat + Umanah runtime

Current stable mount: `/media/hungree-goat`.

This drive contains the HUNGREE Goat media library and **must not be formatted or erased**. Existing content must not be renamed, moved unnecessarily, or recursively re-owned.

Umanah AI Lab runtime root:

```text
/media/hungree-goat/umanah-ai-lab/
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

Use explicit bind mounts/service-specific volumes into this subtree. Do not move Docker's global data-root simply to put Umanah here.

### New Samsung ~128 GB USB — Reydious reserve

Conclusive physical identity established during storage prep:

- Vendor/model: Samsung Flash Drive FIT
- Serial: `0361823090000118`
- Approximate Linux-visible capacity: 119.5 GiB
- Original factory filesystem at discovery: exFAT, label `Samsung USB`

Approved target state:

- GPT partition table
- one ext4 partition using the usable disk
- filesystem label: `REYDIOUS_DATA`
- persistent mount: `/srv/ai-node/storage/reydious`
- UUID-based `/etc/fstab`
- safe removable-drive behavior such as `nofail`
- normal owner after mount: `aumanah:aumanah`

This drive is **not for Umanah AI Lab**. Once prepared, leave it empty for the separate Reydious installation/session.

Latest known status at pack update time: identity was re-verified and the drive was still untouched factory exFAT; the only remaining blocker to formatting was interactive sudo authentication in a terminal with a TTY.

## Source/runtime separation

Keep source code in the Git checkout and runtime data on the designated data volume. Never commit model weights, databases, media, private school content, secrets, runtime logs, or backups.

## Application lifecycle

The Umanah stack must support one logical lifecycle, for example:

```text
umanah-lab start
umanah-lab stop
umanah-lab restart
umanah-lab status
```

A Docker Compose/systemd wrapper is acceptable. When stopped, the demo stack should consume negligible CPU/RAM while preserving state.

## Public routing

Keep public DNS:

`ai.umanah.org -> 2.29.28.125`

Routing target:

```text
Internet
  -> ai.umanah.org
  -> Hetzner public endpoint
  -> HTTPS reverse proxy
  -> private Tailscale path
  -> ai-node-01
```

Do not point public DNS to a Tailscale 100.x address. Never expose SSH publicly.

## Parallel Claude sessions on one host

Umanah and Reydious may be developed concurrently only when isolated beyond the physical disks:

- separate Git repositories / worktrees
- separate working directories
- separate runtime roots
- separate Docker Compose project names
- separate container names
- separate host ports
- separate persistent volumes
- separate systemd unit names
- separate logs
- separate databases
- separate `.env` files/secrets

Inspect current CPU/RAM before starting multiple heavy model runtimes. The user generally operates applications one at a time; installed is not the same as running.

## Verification gate before Umanah deployment

Before installing the full stack:

1. identify all physical disks by stable identity;
2. confirm HUNGREE Goat data is unchanged;
3. confirm `/media/hungree-goat/umanah-ai-lab/` exists with the expected skeleton;
4. confirm the Samsung is either still pending format or is exactly GPT/ext4 `REYDIOUS_DATA` mounted at `/srv/ai-node/storage/reydious`;
5. confirm Git access/remote works;
6. inventory existing containers/services/ports;
7. avoid collisions with existing workloads.
