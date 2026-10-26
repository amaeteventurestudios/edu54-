# Vertical Slice 001 — Python Foundations, Lesson 6: Loops

> Facts: `00-START-HERE.md`. Roadmap context: `39-ROADMAP.md`. Screens: `05-UI-SCREEN-SPECS.md`.

## Goal

Build **one lesson end to end, for real**, before widening to more lessons, subjects or features. Every layer of the product gets exercised once: UI, auth, learning data, tutor, safety, code running, XP, teacher view, offline. A sponsor or teacher can watch the whole story in five minutes.

This is the first build target. It replaces "build all ten screens shallowly."

## The story it must support

1. Jordan (student) logs in on a Chromebook on the local network.
2. Home shows "Continue Learning: Python Foundations — Lesson 6: Loops" and "Assigned: Loops Practice — due Friday."
3. Jordan opens Lesson 6, reads, answers a "Check your understanding" question.
4. Jordan asks the tutor in the side panel, "explain this more simply." The reply cites Lesson 6.
5. Jordan runs the "Try it yourself" code in the browser and sees the output.
6. Jordan completes the lesson: +50 XP, progress bar updates.
7. Jordan opens the assignment. Tutor shows the locked badge "Homework help: hints only — set by Ms. Williams." Jordan tries "just give me the answer" and gets a hint instead.
8. Jordan submits. Status: "Submitted — awaiting teacher review."
9. Ms. Williams (teacher) opens Teacher Center: sees Period 3, who completed Lesson 6, Jordan's submission, and "4 students may need help with loops."
10. She reviews and grades. Jordan sees feedback and earns the **Loop Master** badge.
11. A test student types a self-harm message. The tutor gives the approved support response; the designated safety contact sees an alert (`41`).
12. Unplug the internet. Repeat steps 1–10. Everything still works.

## In scope

| Area | Included |
|---|---|
| Auth | local username + password; roles student, teacher, school admin; seeded demo accounts |
| Screens | Home, Ask (panel + full page), Learn hub (Continue + Assigned tabs), Lesson, Assignment, Progress (basic), Teacher Center overview + submission review, Safety Alerts view, Lab Status |
| Content | Lesson 6 (explanation, 2 examples, loop diagram, 3 check questions, 1 try-it exercise); "Loops Practice" assignment with 3 questions, each with a 3-step hint ladder and an answer key |
| Tutor | Lesson and Homework modes with all rules from `42`; streaming; citations to Lesson 6 |
| Safety | full pipeline from `41` with the rules layer and one classifier model |
| Code | Pyodide in the browser, 5-second timeout, output panel, save to project |
| Gamification | XP events (idempotent), level display, Loop Master badge |
| Ops | `umanah-lab start/stop/status/restart`; Lab Status page |
| Evals | accuracy set for Lesson 6, homework jailbreak set, safety set (can start smaller than `42`/`41` thresholds, then grow) |

## Out of scope for this slice

Other lessons and subjects, the full Explore screen, Revision sprints, AI Lesson Builder, remote management plane, multiple languages. They come in later phases. (Moodle, Kolibri, Kiwix, JupyterHub and Open WebUI are **installed and healthy** in S1; their deeper use in Umanah screens grows in later phases.)

## Seed data (all fictional)

School "Demo Academy"; teacher "Ms. Williams"; class "Period 3 — Introduction to AI" with 28 students including "Jordan Smith"; designated safety contact "Ms. Rivera (counselor)". Dates generated relative to today, never hard-coded.

## Build order and exit criteria

Each step ends with a short demo summary (what works, evidence). Then move on.

| Step | Build | Exit criteria (all must be true) |
|---|---|---|
| **S0 Data drive** | rename the SanDisk to `AI_NODE_DATA` at `/srv/ai-node/storage/data`, update HUNGREE Goat to the new path, Grid card shows all three drives (`../ops/AI-NODE-01.md`) | music checksums unchanged; HUNGREE Goat plays from the new path; reboot test passes; Grid shows 3 volumes |
| **S1 Platform** | rootless Docker on the drive; install Ollama (pinned models), Moodle, Kolibri, Kiwix, JupyterHub, Open WebUI with the profiles and ports in `53`; `umanah-lab` command; benchmark the tutor model | every service starts, passes a health check and stops cleanly by profile; data lives only on the drive; tokens/sec and RAM recorded in `43` |
| **S2 Shell** | app skeleton, design tokens, sidebar with the five verbs, login, roles, Home | a student and a teacher can log in from another LAN device; screenshots match `05`/`06` |
| **S3 Lesson** | lesson data model, Lesson 6 page, progress save/resume, XP on completion | completing twice gives XP once (test); progress survives restart |
| **S4 Tutor + safety** | Ask panel/page, mode resolution, retrieval from lesson, safety pipeline, support response, Safety Alerts view | Lesson-6 accuracy eval ≥ 90%; high-severity safety examples 100% routed; alert visible to safety contact only |
| **S5 Build** | Pyodide runner in lesson and Build page, save project | code runs offline; infinite loop is stopped at 5 s without freezing the page |
| **S6 Assignment** | assignment, hint ladders, server-side answer checking, submit, locked homework badge | homework jailbreak set: 0 answer leaks; submission appears for teacher |
| **S7 Teacher** | Teacher Center overview, submission review/grade, "needs help" signal, badge award | teacher grades; student sees feedback and badge |
| **S8 Offline + lifecycle** | internet-off test, `umanah-lab` command, Lab Status | full story passes with internet unplugged; stop → near-zero RAM; start → state intact |

## Visual bar

Every screen in the slice is compared with its reference image in `../design/reference/` (Playwright screenshot at 1440×900 next to the image in `design/compare/`). Layout, colors, type, card style and spacing must match, apart from the changes listed in `05`.

## Definition of done for the slice

The 12-step story runs start to finish on `ai-node-01` from another device on the LAN, with the internet unplugged, recorded as a short screen video and a Playwright end-to-end test that passes in CI.
