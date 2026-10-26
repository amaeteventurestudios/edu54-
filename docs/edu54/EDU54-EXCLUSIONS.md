# EDU54 — exclusions

What was left out of EDU54 and why (rule: `docs/edu54/CLAUDE.md` §2). Checked 2026-09-30 by the AI agent.

## Umanah lessons
All shipped lessons were checked for citations or adaptations of excluded sources (CS50, MIT, Khan Academy, Code.org and the rest of the list). None found; **nothing excluded**.

| Lesson / pack | Result |
|---|---|
| Python Foundations 5 Lists, 6 Loops, 7 While loops | clean, ships |
| AI Foundations 1 What is AI?, 2 Data and patterns | clean, ships |
| Lists / Loops / While practice, AI practice, Loops revision | clean, ship |
| Added 2026-10-10 from LabOS: Python Foundations 1-4, 8, 9; AI Foundations 3-11; Science & Engineering 1-8; 5 AI projects; 12 science and 6 engineering briefs | clean (searched for every excluded source name), ship. The science and engineering briefs need PhET simulations, which are not imported, so they are "Coming later" |

## Content and tools left out
| Item | Why |
|---|---|
| Khan Academy, CK-12, CS50, MIT (OCW, RAISE, BLOSSOMS, Scratch), TED, Code.org, fast.ai, GeoGebra, Desmos, Wolfram, MATLAB, Kaggle Learn, Elements of AI, Open Yale, Stanford notes | excluded by the brief |
| LibreTexts, Internet Encyclopedia of Philosophy, Gardenology, Art of Problem Solving ZIMs (all in the AI Lab) | NC, author copyright, or license not confirmed |
| freeCodeCamp | curriculum is not openly licensed (only its code is BSD-3) |
| Physics / Mathematics / Cross Validated Stack Exchange | include CC BY-SA 2.5 posts (not on the allowlist) |
| Python docs, MDN (DevDocs) | PSF license and CC BY-SA 2.5 are not on the allowlist |
| Reeborg's World | license stated three different ways, one NonCommercial |
| Open WebUI, Moodle | brief: not used (license; dropped) |

## Removed from the 2026-10-10 LabOS screens
| Item | Where in LabOS | In EDU54 |
|---|---|---|
| Khan Academy and MIT BLOSSOMS grade courses, African Storybook and PhET entries | `content/curriculum/k12.json` | `k12.edu54.json` is empty until items pass the gate |
| Khan Academy practice exercises ("Library practice", "Keep going") | Practice tab, Progress, student page | hidden |
| Khan for Educators, Khan AI, Khan art history, MIT BLOSSOMS teacher notes, PhET guides | Teacher Resources shelves | none shown |
| Reeborg's World robot missions | Build > Robotics | "Coming later" |

## Known gaps after removal (not filled with NC material)
K-8 practice exercises (Khan's role), agriculture, video lessons, picture books (African Storybook / StoryWeaver need a per-story license check; not imported yet), OpenStax books (not imported yet), PhET simulations (need a per-sim date check; not imported yet).
