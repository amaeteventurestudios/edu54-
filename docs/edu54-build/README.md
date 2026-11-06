# EDU54 Workbench

667 hands-on 3D lessons on how AI works, in twelve tracks, on every EDU54 box. Ported on 2026-11-06 by the AI agent
(Claude, cloud session) from Ashanti Labs' integration of the same lessons (ashanti-labs PRs #4 and #5, "Ashanti Build").
The owner named it **EDU54 Workbench** on 2026-11-06; file and folder names inside the repo still say `edu54-build` and
`ai-build`. The lessons come from the private repo `amaeteventurestudios/build` (live branch
`claude/project-thread-x0m7do`); they are copied in as plain static files, never rewritten.

## The public page: edu54.com/workbench/
The lessons' own home page (the twelve-track cube, "Build AI from scratch. In 3D.") and every lesson, open to anyone and
branded EDU54 Workbench, like build.amaete.com. Progress there stays in the visitor's browser (no accounts). Made by
`BUILD_SRC=/path/to/build tools/content/build-edu54-workbench-page.sh` into `apps/site/workbench/` (git-ignored, ~310 MB);
its Terms and Privacy links go to edu54.com's own pages. On the server, copy that folder to the site's `workbench/`.

## What a learner sees
- **/ai-build** in both editions, in its own frame like Discovery Lab (`apps/web/src/pages/AiBuild.tsx`): the same sign-in,
  a way back, the account menu, a search over all 667 lessons, the twelve tracks, and each track's lessons with ticks.
- Ways in: a card on **Learn** and on the student **Home** (6th Grade and up and University; not K-2 or 3-5), and
  `edu54.com/workbench/`. No seventh nav item. The Python **Build** page is unchanged.
- A lesson opens at **/ai-build/lessons/<slug>/**. Its logo and back arrow return to /ai-build. Finishing its three checks
  saves it to the learner's LabOS account (`POST /api/ai-build/progress`); there is no separate sign-in.
- **Progress** shows each track and, once every lesson in a track is done, a link to a printable certificate
  (`/ai-build/certificate/<track>`) under the learner's LabOS name.
- **Teachers** see a read-only count per student on the student page.

## Pieces
| Piece | Where |
|---|---|
| Copy, brand and catalog | `tools/content/sync-edu54-build.sh` → `content/edu54-build/site/` (git-ignored, ~310 MB), `catalog.json`, `SOURCE.txt` |
| Brand override in the lessons | build repo `engine/site.local.js` (empty there; the script writes EDU54's): name, home `/ai-build`, API `/api/ai-build`, local fonts, no family links, `noindex` |
| Serving | `infrastructure/compose/Caddyfile` (`/ai-build/lessons/*` from `/srv/ai-build`, with a policy that allows only this box), `edu54.yaml` mounts `${EDU54_ROOT}/apps/ai-build`; the API serves the same folder in development and tests (`UMANAH_AI_BUILD_DIR`) |
| Progress | `services/api/src/umanah_api/ai_build.py`, `routers/ai_build.py`, table `ai_build_progress` (migration 0011) |
| Credits | `content/edu54-build/attributions.json` → the Attributions page (EDU54 brand only), each licence checked at its source on 2026-11-06 |

## Update the lessons
1. In a clone of the build repo, pick the commit. 2. `BUILD_SRC=/path/to/build tools/content/sync-edu54-build.sh <commit>`
(or let it fetch, with a key that can read the build repo). 3. Run `pytest tests/test_ai_build.py`: it checks the counts on
the website still match. Update `apps/site/index.html`, `apps/site/workbench/index.html` and `llms.txt` if they changed.
4. Commit `content/edu54-build/{catalog.json,SOURCE.txt}` and copy the `site/` folder to `${EDU54_ROOT}/apps/ai-build` on
the box. The script refuses to finish if the source site's own name is still in a generated page.

## Rules kept
- Nothing leaves the box: the fonts are served from the lessons' own `vendor/fonts` (SIL Open Font License), Three.js is
  vendored, the Content-Security-Policy allows only `'self'`. Tested on six lessons in four tracks: every request local.
- School computers are shared, so a lesson page shows exactly the signed-in learner's ticks from the server and never copies
  a previous learner's browser progress into an account.
- Lessons have no AI chat, so the tutor safety pipeline is not involved. Exam prep keeps its independent-preparation note.
- The course is credited as "AI Engineering from Scratch by Rohit Ghumare and contributors (MIT License)".
- The lessons keep their African examples (owner's decision, 2026-11-06), unlike the rest of EDU54.
