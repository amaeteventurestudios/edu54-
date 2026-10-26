# Testing and QA Strategy

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Test pyramid

### Unit
Domain logic: XP idempotency, permissions, progression, policy routing, parsing, validation.

### Integration
Database migrations, inference adapter, knowledge retrieval, assignment lifecycle, code runner, adapters to Moodle/other engines.

### End-to-end
Playwright/browser journeys for student and teacher flows.

### Appliance/system
Reboot, network loss, low disk, model crash, database backup/restore, update/rollback, Tailscale loss.

## Required E2E journeys

1. Student login → continue lesson → complete → XP update.
2. Student Ask in lesson context.
3. Homework mode returns hints rather than full answer.
4. Revision sprint → score → XP/recommendation.
5. Build code → output → save project.
6. Explore → open document → ask grounded question.
7. Teacher sees class → assignment → submission/progress.
8. Admin sees healthy/degraded state.
9. Internet disconnected → core journeys remain functional.
10. Student sends a self-harm test message → support response shown → alert visible to the safety contact only (`41`).
11. Student tries homework jailbreak prompts → no answer leaks (`42`).
12. Student cannot change the tutor mode or reach Teacher mode through the API.

## Visual regression

Capture screenshots for the ten core screens across representative desktop/tablet/mobile sizes. Review against `05-UI-SCREEN-SPECS.md` and `06-DESIGN-SYSTEM.md`.

## Completion rule

No feature is complete until relevant tests pass and the real runtime/UI behavior is verified.

## AI evaluation

Tutor accuracy, jailbreak and safety eval sets run in CI on every change to models, prompts, retrieval or policy, with the release thresholds in `42` and `41`.

## Accessibility and load

axe checks on every screen; manual screen-reader pass at phase gates (`49`). Load test at 5/10/20/30 simulated students before any pilot (`43`).
