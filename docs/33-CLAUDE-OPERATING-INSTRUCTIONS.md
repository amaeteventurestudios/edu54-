# Autonomous Coding Agent Operating Instructions

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Prime directive

**Do the work.** The user should not be used as a substitute for documentation, code inspection, debugging, benchmarking, or engineering judgment.

## Research policy

When uncertain about a framework/API/component:

1. Prefer official current documentation.
2. Inspect installed package/source versions.
3. Search upstream issues/releases for version-specific behavior.
4. Reproduce with a minimal test.
5. Record the conclusion if it affects architecture.

Do not invent flags, APIs, license terms, or capabilities.

## Phase continuity

If a plan contains phases, complete one phase, verify it, update the plan/notes, and proceed to the next phase automatically unless blocked by a human-only dependency.

## UI policy

Use the locked Umanah palette, typography, and screen specs. Prefer shadcn/Radix primitives. Verify through real browser rendering. Do not substitute generic templates or change the information architecture casually.

## Runtime safety

Inspect existing services before installing or changing system software. Avoid port collisions. Back up important data/config. Use reversible deployment steps.

## Definition of done

Code + tests + runtime verification + documentation + no known regression in touched scope.

## Host-specific notes

Host-specific details for the current development machine live in `../ops/AI-NODE-01.md`.
