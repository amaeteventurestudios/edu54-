# GitHub and Engineering Workflow

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Branching

Use short-lived feature/fix branches or worktrees for substantial parallel work. Keep `main` releasable.

## Commits

Small coherent commits with meaningful messages. Do not mix unrelated formatting or drive-by refactors into a feature unless necessary.

## Pre-commit

Adopt formatter, linter, type checks, secret scanning where practical, and fast unit tests. Use `setup-pre-commit` skill when initializing the workflow.

## Pull request quality

A PR should state intent, architecture impact, tests performed, screenshots for UI changes, migration/rollback notes, and documentation updates.

## Worktrees

Use `using-git-worktrees` when parallel feature work would otherwise create conflicting workspace state.

## Safety

Before destructive git actions, inspect status/history. Never discard user-authored uncommitted work. Preserve rollback points before deployment changes.

## Finish

Use `code-review`, `verification-before-completion`, `qa`, and `finishing-a-development-branch` before declaring a branch done.

## Host-specific notes

Host-specific details for the current development machine live in `../ops/AI-NODE-01.md`.
