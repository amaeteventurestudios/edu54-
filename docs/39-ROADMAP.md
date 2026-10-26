# Product and Engineering Roadmap

## Phase 0 — Foundation and AI Node storage gate

**Status: complete (2026-09-24, commit `bc1966b`).** Storage prepared and verified on `ai-node-01`; HUNGREE Goat untouched; Umanah skeleton created; Samsung formatted for Reydious. Details: `../ops/AI-NODE-01.md`. Remaining before Phase 1: the SanDisk filesystem check.

## Phase 1 — Vertical slice 001 (Lesson 6: Loops)

Data drive rename and the full platform install (Moodle, Kolibri, Kiwix, JupyterHub, Open WebUI, Ollama with pinned models — `53`), then the whole product once, end to end, on `ai-node-01`: shell, auth, lesson, tutor with safety and homework rules, in-browser Python, assignment, XP, Teacher Center, offline. Steps S1–S8 and exit criteria in `44`.

**Exit:** the 12-step story in `44` passes with internet unplugged; Playwright test green; evals meet thresholds.

## Phase 2 — Public demo

Always-on demo on the Hetzner side with demo data, rate limits and fallback page (`46`).

**Exit:** `ai.umanah.org` answers 24/7 for a week; "Try as student/teacher" works; website copy rules in `03` met.

## Phase 3 — Learn breadth

Full Python Foundations course, first AI Foundations and Science & Engineering units; import pipeline for OER with license metadata (`14`, `47`); Revision sprints.

**Exit:** three courses usable end to end; every lesson has a passing accuracy eval.

## Phase 4 — Explore

Knowledge Library with Kiwix/OpenStax/PhET starter content, teacher uploads, "Ask this document" with citations (`13`).

**Exit:** grounded answers cite sources; injection test set passes; works offline.

## Phase 5 — Teacher Center breadth

Classes, rosters (CSV), assignment builder with hint ladders, assessments, AI Lesson Builder drafts with teacher approval (`17`).

**Exit:** a teacher builds and assigns a new lesson without help.

## PRIORITY RESET (2026-09-25): fundraising demo first

Goal now: a polished **fundraising demo** that shows sponsors a working platform. Phases 6 (Mac mini), 7 (management plane and installer), 8 (pilot readiness) and 9 (pilot deployment) are **ON HOLD until funded**. Current priority, in order: the app looks and works like `design/reference/`, a public try-it demo on `ai.umanah.org`, the `umanah.org/ai-lab` page, a sponsor video, and enough lessons that the demo feels full. Phases 1 to 5 remain the build order for anything the demo needs.

## Phase 6 — Mac mini appliance (ON HOLD until funded)

Port to the target hardware: native model runtime, launchd, FileVault, benchmarks at 5/10/20/30 students (`26`, `43`).

**Exit:** published classroom capacity from benchmarks; power-cut recovery test passes.

## Phase 7 — Management plane and installer (ON HOLD until funded)

Enrollment, health agent, signed updates with rollback, support access controls and audit (`22`, `28`).

**Exit:** a fresh box is enrolled and updated remotely; a failed update rolls back by itself.

## Phase 8 — Pilot readiness (ON HOLD until funded)

Safeguarding review, privacy documents and NDPA, accessibility conformance report, school IT kit, training materials (`35`, `41`, `45`, `49`, `50`).

**Exit:** every item in "Before any pilot" in `35` is done.

## Phase 9 — Pilot deployment (ON HOLD until funded)

Two to three pilot sites; support, measurement, iteration (`35`, `37`).

## Continuous gates

At every phase: tests, real runtime verification, safety and privacy review for touched surfaces, accessibility checks, docs and decision log updated, risk register reviewed (`52`), demo summary posted to the owner.
