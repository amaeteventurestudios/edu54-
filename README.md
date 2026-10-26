# Umanah AI Lab — Master Build Pack (v2)

Product, architecture, safety, curriculum, deployment, licensing, fundraising and agent instructions for building **Umanah AI Lab**, a school-owned AI learning appliance by Umanah Institute.

## Start here

1. `CLAUDE.md` — the operating contract for coding agents (`AGENTS.md` points to it).
2. `docs/00-START-HERE.md` — canonical facts, what is decided and open, reading map.
3. `docs/44-VERTICAL-SLICE-001.md` — the first thing we build.
4. `ops/AI-NODE-01.md` — the development machine (drives, git, routing).

## Layout

```text
CLAUDE.md            agent contract (single copy)
AGENTS.md            pointer for non-Claude agents
CHANGELOG.md         what changed between pack versions
MANIFEST.md          file list with sizes and checksums
docs/                product and engineering docs, 00–53
ops/                 host-specific runbooks (review before any public release)
design/reference/    the screen images the UI must match, plus the build spec
Umanah_AI_Lab_Complete_Conversation_Record.md   original brainstorm record (historical)
```

## One source of truth

Each shared thing lives in exactly one file: facts in `docs/00`, visual rules in `docs/06`, agent rules in `CLAUDE.md`, skills in `docs/34`, host details in `ops/`. Other docs link instead of copying, so they cannot drift apart.

The conversation record is kept as history. Where it disagrees with `docs/`, the docs win.
