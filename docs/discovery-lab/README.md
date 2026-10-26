# Discovery Lab

The third learning environment beside K-12 and University: a science lab to explore on your own, with no class, no teacher
and no grades. Built 2026-10-23 by the AI agent (Claude, cloud session) from the owner's spec package (`spec/`, extracted
here as asked; the package's `CLAUDE.md` is kept as `spec/AGENT-BRIEF.md` so it does not act as agent rules for this repo).
Phase 0 findings: Claude Doc "Discovery Lab: findings and plan". First-pass license audit: `license-first-pass.csv`.

## What it is, technically
- **Part of the same app**, at `/discover`, in both editions (`LABOS_EDITION=k12|university`). Same sign-in and session: a
  student already signed in to K-12 or University opens it straight away; anyone else gets that edition's sign-in page, with
  a line saying Discovery Lab uses the same sign-in. Its own frame (`apps/web/src/discovery/ui/Shell.tsx`): no school
  navigation, a way back, search and the account menu.
- **Why inside the app, not a separate site:** the AI Guide must go through the existing safety pipeline, and a safety alert
  must reach the student's own school counselor. A separate site would need its own accounts and safety contacts.
- **discover.edu54.com** shows the public page `apps/site/discover/index.html` (also at `edu54.com/discover/`),
  with "Sign in with K-12" and "Sign in with University" buttons to `k12./uni.edu54.com/discover`. The homepage sends
  the `discover.` host there. **Owner action:** add `discover.edu54.com → :8310` to the Cloudflare tunnel.

## Pieces
| Piece | Where |
|---|---|
| Catalog: 13 labs, collections, topics, 37 experiments (14 working, 23 planned), 3 journeys | `content/discovery/catalog.json` |
| Catalog API (signed in) | `services/api/src/umanah_api/discovery.py`, `routers/discovery.py` → `GET /api/discovery/catalog` |
| AI Guide: tutor mode `discovery` for context type `experiment`; readings cleaned server-side (declared keys only, clamped, short text) | `tutor/modes.py`, `tutor/prompts.py`, `routers/ai.py` |
| Experiment contract (`mount/getState/applyAction/reset/pause/dispose/describe`), `validate()` gate, canvas base class | `apps/web/src/discovery/engine.ts` |
| Formulas (tested) | `apps/web/src/discovery/science.ts`, `tests-unit/science.test.ts` |
| Local search: prefix, typo tolerance, synonyms, no AI, nothing sent | `apps/web/src/discovery/search.ts`, `tests-unit/search.test.ts` |
| 14 experiments, each loaded only when opened | `apps/web/src/discovery/modules/*.ts`, registry `modules/index.ts` |
| Pages | `apps/web/src/pages/Discovery.tsx` (home, search, lab, journey), `pages/DiscoveryExperiment.tsx` |
| Website | `apps/site/index.html` (Discovery Lab card, nav, footer, hero line), `apps/site/discover/index.html` |

All 14 experiments are our own code (no third-party simulation code), so nothing new goes on the Open Source Notices page.

## Add an experiment
1. Add its entry to `catalog.json` with `status: "planned"` until the module exists.
2. Write `modules/<name>.ts` on `CanvasModule` (draw, step, observe, describe); put formulas in `science.ts` with a test.
3. Register it in `modules/index.ts`, set `status: "working"` and `module`. `npm run test:unit` checks the registry and the
   catalog agree; `pytest tests/test_discovery.py` checks the catalog and that the website's counts are still true (update
   `data-ready`/`data-planned` and the sentences on both site pages and `llms.txt` when the counts change).

## Tests (2026-10-23)
`npm run test:unit` 20/20 · `pytest tests/test_discovery.py` 9/9 · `e2e/discovery.spec.ts` 2/2 · every experiment opened,
played and moved in Chromium at 1440x900 and 390x844 with no sideways scroll.
