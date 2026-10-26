# Raspberry Pi — Low-Resource Validation (optional)

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Current status — superseded as primary full-stack target

This document remains valid as a constrained/offline validation plan. As of 2026-09-24, `ai-node-01` is the primary full-stack development/demo target. See `27A-AI-NODE-01-DEPLOYMENT.md`.

## Objective

Deliver a polished proof that the complete Umanah learning loop can run locally on inexpensive hardware. The Pi is an architectural proving ground, not the target performance tier.

## Phase 0 — inventory before changes

- capture OS/kernel/architecture;
- RAM/swap/storage;
- running systemd units and containers;
- listening ports;
- reverse-proxy config;
- Tailscale status;
- backups/restore path;
- CPU temperature/load;
- current production workloads.

Do not stop existing services merely to simplify development.

## Phase 1 — minimal inference

Evaluate lightweight llama.cpp or Ollama configuration, install one approved tiny GGUF/model, run command-line/API smoke tests, measure memory and latency.

## Phase 2 — LabOS web shell

Implement the student navigation and local auth with the Umanah design system.

## Phase 3 — learning persistence

SQLite-backed users, courses, lessons, progress, assignments, XP/badges.

## Phase 4 — initial curriculum

AI Foundations, Python Foundations, Science & Engineering Foundations. Start with a small high-quality subset.

## Phase 5 — Build Lab

Lightweight code execution with strict resource controls. Do not force JupyterHub onto the Pi if a smaller runner proves better.

## Phase 6 — Teacher Center

Class overview, assignments, progress, review.

## Phase 7 — management

Tailscale/private admin, health endpoint/agent, version reporting.

## Phase 8 — offline validation

Disconnect public internet and execute student + teacher acceptance journeys.

## Acceptance benchmark

The Pi should remain responsive enough to demonstrate the product. If a particular subsystem cannot coexist in memory, preserve the UX contract and choose a lighter implementation rather than abandoning the feature concept.
