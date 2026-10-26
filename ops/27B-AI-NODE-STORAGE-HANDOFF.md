# AI Node 01 — Storage Handoff

> **Superseded paths (2026-09-24):** the SanDisk is now the data drive `AI_NODE_DATA` mounted at `/srv/ai-node/storage/data`, and v1 now uses a rootless Docker daemon on that drive. Current details: `AI-NODE-01.md`. This file is kept as history.

Status snapshot: **2026-09-24**. This is a factual handoff for the storage-preparation phase before installing either Umanah AI Lab or Reydious.

## Safety boundary

Three storage classes are present on `ai-node-01`:

1. internal Crucial NVMe — operating system; do not touch;
2. existing SanDisk ~128 GB USB — HUNGREE Goat media + dedicated Umanah subtree; never format;
3. new Samsung Flash Drive FIT ~128 GB, serial `0361823090000118` — Reydious-only target.

## HUNGREE Goat / Umanah drive

- Current mount: `/media/hungree-goat`
- Existing HUNGREE Goat content was inspected before/after creation of the Umanah subtree and remained untouched.
- Prepared Umanah root: `/media/hungree-goat/umanah-ai-lab`
- Prepared directories: `apps`, `services`, `models`, `curriculum`, `knowledge`, `projects`, `database`, `docker-volumes`, `exports`, `backups`, `logs`, `tmp`.
- Existing media must not be moved, renamed, deleted, reformatted, or recursively chowned.

## Samsung / Reydious drive

Conclusive identity:

- model: Samsung Flash Drive FIT
- serial: `0361823090000118`
- Linux-visible capacity: ~119.5 GiB
- discovered filesystem: factory exFAT
- discovered label: `Samsung USB`
- not the OS disk
- not the HUNGREE Goat disk

Approved final storage spec:

- GPT
- single ext4 partition
- label `REYDIOUS_DATA`
- mount `/srv/ai-node/storage/reydious`
- UUID-based `/etc/fstab`
- `nofail` or equivalent safe removable-drive behavior
- owner `aumanah:aumanah` after mount

**Update — Phase 0 complete (2026-09-24, 11:51 PT).** The Samsung was formatted GPT + ext4, label `REYDIOUS_DATA`, UUID `2ffee1d1-7192-4b79-a34a-6908b229ee94`, added to `/etc/fstab` with `nofail`, `mount -a` verified clean, and left empty for Reydious. HUNGREE Goat listing verified byte-identical before and after. The Umanah 12-directory skeleton exists at `/media/hungree-goat/umanah-ai-lab/`, owned `aumanah:aumanah`. Verified independently from a non-sudo shell and pushed as commit `bc1966b` on `main`.

## GitHub state

- Repo: `amaeteventurestudios/umanah-ai-lab`
- Private
- Dedicated deploy key title: `ai-node-01`
- Write access enabled
- SSH alias on the host: `github-umanah-ai-lab`
- Clone via `git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git`

## Stop point

Storage preparation is finished and verified. Next for Umanah: the filesystem check in `AI-NODE-01.md`, then Phase 1 in `../docs/44-VERTICAL-SLICE-001.md`. Once Samsung formatting is verified, Umanah work continues only against the HUNGREE Goat/Umanah root, while a separate Reydious session uses only the Samsung/Reydious root plus its own repo/config/runtime namespace.
