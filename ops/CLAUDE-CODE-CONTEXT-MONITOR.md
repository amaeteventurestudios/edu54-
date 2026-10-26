# Claude Code context monitor (owner spec)

Required by `CLAUDE.md` startup **step 0**. Every agent session must confirm it before other work.

> **Provenance note (2026-09-25, AI agent):** this file was created after the owner asked for it. The text below is the spec exactly as it is recorded in `CLAUDE.md` (added in commit `b35a4c9` on 2026-09-24). The AI agent does not have the owner's original prompt text, so it cannot prove this is word-for-word identical to it. If it differs, the owner should paste the original over this section.

### Context monitor on this machine (one-time setup)

At the start of a session, check whether this machine's Claude Code has the context monitor installed (a status line in `~/.claude/settings.json` showing context % used). If not, install it before other work:

- **Status line** (Claude Code's native `statusLine` setting, user-level): `model │ project │ git branch │ Context NN% used / NN% left │ used / total tokens │ ████░░░░` — real values only; if the installed version doesn't expose a value, leave it out and say so. Never estimate.
- **Threshold alerts via a hook:** the AI inside a session can't see the status line, so add a user-level hook (for example `UserPromptSubmit` or `PostToolUse`) that reads the real context usage and injects a one-line notice only when 70/80/85/90/95% is first crossed.
- **Global rules:** put the threshold table above in the user-level `~/.claude/CLAUDE.md` so it applies to every project.
- **Accounts:** the owner uses several Claude launchers (claude-starlogic, claude-amaete-gmail, claude-kelechi, claude-joshy, claude-amaete-work). Inspect which exist. Apply the status line, hook and global rules to each account's config directory, but never merge or touch credentials, and never log a profile out.
- **Safety:** back up every file before changing it (`~/.claude/`, `~/.claude-*`, shell rc files, `~/.local/bin/`), merge instead of overwrite, keep unrelated settings.
- **Verify** in a new session: status line appears, values update, authentication still works for each launcher. Report: Claude Code version, what works, launchers found, files created/modified, backups.

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

## Implementation on ai-node-01 (AI agent, 2026-09-24/25)

| Piece | Where |
|---|---|
| Status line script | `~/.local/bin/claude-context-statusline` (writes the real reading to `~/.claude/context-monitor/<session>.latest.json`) |
| Threshold hook (UserPromptSubmit + PostToolUse) | `~/.local/bin/claude-context-hook` |
| Config that enables them | `statusLine` and `hooks` in `~/.claude/settings.json` and `~/.claude-joshy/settings.json` |
| Global rules | `~/.claude/CLAUDE.md`, `~/.claude-joshy/CLAUDE.md` |
| Backups | `~/.claude/backups-context-monitor-20260924/` |

Launchers found on this machine: `claude` (`~/.claude`) and `claude-joshy` (`~/.claude-joshy`). The others in the list (starlogic, amaete-gmail, kelechi, amaete-work) have no config directory here.

Both scripts read and write under `~/.claude/context-monitor/` whichever account is running, so all accounts on this machine share one readings folder (one file per session id).
