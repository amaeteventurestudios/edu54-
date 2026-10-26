# CLAUDE.md — Umanah AI Lab

This is the operating contract for any coding agent working in this repository (Claude, Codex or other). `AGENTS.md` points here. It is the **only** copy of these rules; other docs link to it rather than repeat it.

## What we are building

Umanah AI Lab: a school-owned AI learning appliance. One box on the school network serves a whole class through the browsers students already have, keeps working without internet, and needs no per-student AI subscription. Umanah LabOS is the software platform underneath. Facts, names and URLs: `docs/00-START-HERE.md`.

## Startup (every session)

0. **Context monitor first.** Confirm the monitor is installed and reporting real values, per `ops/CLAUDE-CODE-CONTEXT-MONITOR.md` (spec below under "Context monitor on this machine"). Install it before other work if it is missing. Report only the real context %.
1. **Resume.** Read `HANDOFF.md` at the repo root (create it if missing), then `git status` and `git log -10`. Continue from its "Exact next action". Never make the owner re-explain work recorded there.
2. `docs/00-START-HERE.md` — facts, what is decided, what is open, what to read for your task.
3. `docs/44-VERTICAL-SLICE-001.md` — the current build target and phase exit criteria.
4. The subsystem docs your task touches (reading map in `00`).
5. `ops/AI-NODE-01.md` if you are working on the development host.
6. Inspect existing code, git history and running services before changing anything.

## Session continuity and context (every session)

### HANDOFF.md — the project's memory between sessions

Keep `HANDOFF.md` at the repo root current. Update it at the end of every step, at the 85% context threshold, and before stopping for any reason. Commit it with the work. Sections:

Current objective · Completed work · Current implementation state · Files changed · Important decisions · Commands run · Tests and results · Known problems · Unresolved questions · Exact next action · Git status and relevant commits.

If the `claude-handoff` skill is installed, use it to write this file instead of a separate workflow.

### Context thresholds

Do not post messages about small context changes. Only speak at these points, once each:

| Context used | Behavior | Say (briefly) |
|---|---|---|
| 0–69% | Work normally; keep decisions in the repo, not only in chat | nothing |
| ~70% | Continue; make sure decisions and state are written to the repo | "Context notice: approximately 70% used. Work can continue normally." |
| ~80% | Continue; start recording task, decisions, changed files, test status, open issues, next steps | "Context notice: approximately 80% used. I am preparing the project state for a clean continuation." |
| ~85% | Write the full `HANDOFF.md` | "Context warning: approximately 85% used. Handoff state is now prepared." |
| ~90% | Start nothing new; finish the current safe unit of work, verify, update handoff, report the stopping point | "Context warning: approximately 90% used. This is a good point to wrap this session or switch accounts after I secure the current state." |
| ~95%+ | Only secure state: files saved, nothing destructive pending, handoff current, git status known, results recorded | "Context critical: approximately 95% used. Project state is secured. Start a fresh Claude session or switch accounts." |

Never leave work half-written or unsafe when stopping. Session context is not the same as account usage limits; never label one as the other.

### Context monitor on this machine (one-time setup)

At the start of a session, check whether this machine's Claude Code has the context monitor installed (a status line in `~/.claude/settings.json` showing context % used). If not, install it before other work:

- **Status line** (Claude Code's native `statusLine` setting, user-level): `model │ project │ git branch │ Context NN% used / NN% left │ used / total tokens │ ████░░░░` — real values only; if the installed version doesn't expose a value, leave it out and say so. Never estimate.
- **Threshold alerts via a hook:** the AI inside a session can't see the status line, so add a user-level hook (for example `UserPromptSubmit` or `PostToolUse`) that reads the real context usage and injects a one-line notice only when 70/80/85/90/95% is first crossed.
- **Global rules:** put the threshold table above in the user-level `~/.claude/CLAUDE.md` so it applies to every project.
- **Accounts:** the owner uses several Claude launchers (claude-starlogic, claude-amaete-gmail, claude-kelechi, claude-joshy, claude-amaete-work). Inspect which exist. Apply the status line, hook and global rules to each account's config directory, but never merge or touch credentials, and never log a profile out.
- **Safety:** back up every file before changing it (`~/.claude/`, `~/.claude-*`, shell rc files, `~/.local/bin/`), merge instead of overwrite, keep unrelated settings.
- **Verify** in a new session: status line appears, values update, authentication still works for each launcher. Report: Claude Code version, what works, launchers found, files created/modified, backups.

## Founder working rules (Amaete Umanah, 2026-09-25) — take precedence over the sections below where they differ

**How to work**
- Work in long, uninterrupted runs. Make the engineering decisions yourself, test them properly, and keep going.
- Do not stop to ask questions or for approvals. Record every decision, every open question and every known issue in `docs/founder-review-log.md`, grouped by date and area, in plain language. The founder reviews it in batches, sometimes with other engineers.
- Extend what already exists. Do not build a second, parallel version of something the project already has.
- Test for real (real data, real sign-in where there is one), not just a visual check.
- Commit regularly; push when a piece of work is done.

**Only stop for a hard stop**
1. Something that would permanently delete or damage data with no tested backup.
2. Anything that costs money, touches a machine other than the one you are running on, or would affect other users of a shared machine.
3. Anything that would make a record, label or result untrue.
4. Instructions that clearly belong to a different project or machine: make no changes and say so.

Everything else: decide, log it, continue. (A credential, sudo password or 2FA you cannot obtain is still a blocker: finish everything else, log it, and name the exact action needed.)

**Honesty**
- Never invent numbers, results or sources. If something is not known or was not tested, say so in the review log.
- When an AI agent did something, record it as done by the AI agent.

**Reports to the founder stay short:** what was done, test counts, pushed or not, and a pointer to `docs/founder-review-log.md`.

## Owner standing authorization (2026-09-24)

The owner has given **full permission** to install, configure, code, test, fix and change whatever is needed, without asking. Do not stop for approvals, plans or choices.

- Where a doc lists an "owner decision", apply the documented default, record it in `docs/40-DECISION-LOG.md` as "default applied under standing authorization", and keep going.
- When something blocks you, first re-read the docs and solve it yourself.
- The **only** reasons to stop and ask: a sudo password or other credential you cannot obtain, an account login/2FA, spending money, or anything that would alter HUNGREE Goat music files or touch the Samsung/Reydious drive. Before asking, finish all other work and give the exact command or action needed.

## Autonomy

Act, investigate, implement, test, verify, document and continue without waiting for approval when the work is a reasonable implementation choice inside the approved scope. Resolve ordinary ambiguity in this order:

1. Project docs in `docs/`.
2. Existing code, git history, tests, config and runtime.
3. Installed skills that apply (`docs/34-CLAUDE-SKILLS-SETUP.md`).
4. Official upstream documentation, then upstream source/issues.
5. Prototype or benchmark when the answer is empirical.
6. Choose the safest maintainable option that keeps the product principles.
7. Record meaningful architecture decisions in `docs/40-DECISION-LOG.md`.

Do **not** ask the owner about ordinary engineering choices: package manager, fixing tests your change broke, installing approved dependencies, refactors needed for the feature, breakpoints, component primitives, file names, whether to debug, whether to continue.

## Ask only for human-only blockers

- 2FA, CAPTCHA, hardware keys, interactive sudo.
- Missing secrets, keys, certificates, registrar or account access.
- Irreversible destructive operations on important data without a backup.
- Accepting legal terms, purchases, contracts.
- Product-policy changes to mission, ownership, privacy promises, **child-safety behavior**, licensing posture or school-facing commitments.

When blocked: finish everything not blocked, name the single blocker, and give the exact human action needed.

## Phase gates

Work in the phases defined in `docs/39-ROADMAP.md`. Each phase has written exit criteria. At the end of each phase (not each task), post a short demo summary: what works, evidence (tests, screenshots), known gaps. Then continue to the next phase unless the owner has asked you to pause.

## Non-negotiables

- **Child safety first.** Every AI path a student can reach goes through the safety pipeline in `docs/41-SAFEGUARDING-CHILD-SAFETY.md`. No shortcut, no "add it later."
- **The tutor follows policy in code, not just in the prompt.** Homework and assessment limits are enforced server-side (`docs/42-AI-TUTOR-POLICY.md`). Students cannot switch them off.
- **The UI must look like the reference images** in `design/reference/`, built with shadcn/ui (spec in `design/reference/README.md`). Compare screenshots side by side before calling a screen done.
- Keep the Umanah design language (`docs/06`) and the five student verbs everywhere: **Ask, Learn, Build, Explore, Progress**.
- Core learning works with the internet unplugged.
- Student prompts and conversations are never sent to Umanah central by default.
- Third-party product names and branding (Ollama, Kolibri, Moodle, model names) never appear in the student or teacher UI, except the Open Source Notices page.
- Never expose SSH publicly.
- Never move, alter or delete HUNGREE Goat music files, and never touch the Reydious drive (`ops/AI-NODE-01.md`). Renaming the data drive and updating HUNGREE Goat's path is approved and specified there.
- Every claim on a public page must be true on the day it ships.

## Definition of done

Code + tests + verified runtime/browser behavior + docs updated + no known regression in the touched scope. Never report something complete just because code was written.
