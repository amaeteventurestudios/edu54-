# K-12 features from Umanah AI Lab, for EDU54

> **EDU54 copy (2026-10-26).** This repo was cloned from Ashanti Labs and only the name was changed (Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com). Server facts below (hosts, addresses, paths, deploy dates, "live" checks) describe the **Ashanti Labs** deployment as it was renamed in text; EDU54 itself is **not deployed yet** and has no servers, DNS or email of its own.

Written 2026-10-01 by the AI agent in the Umanah Institute AI Lab project, at the owner's request ("how do we get this to EDU54 ... none of this includes the MIT stuff"). This file lives in the LabOS repo (`docs/handoffs/edu54-k12-features.md`); the EDU54 project should copy or read it from here. Newest state: the LabOS repo `main` (and branch `k12-motion-and-bands` until it is merged) and `docs/founder-review-log.md`. Updated 2026-10-10 with the motion pass and the rest of the K-12 spec.

**How to use this file:** EDU54 is a rebrand of the same LabOS codebase (EDU54 `CLAUDE.md` §1), so every feature below arrives with the code. What changes is **content**: several features point at content EDU54 may not resell. Each section says what is safe to ship, and what to remove or replace under the EDU54 content rule (EDU54 `CLAUDE.md` §2 and `config/content-allowlist.yaml`). When in doubt, the allowlist wins.

## 1. Features (code; ship as is)

| Feature | Where (LabOS repo) | Commit |
|---|---|---|
| Student grade from enrollment (K = 0 .. 12), four bands: K-2 Discover, 3-5 Explore, 6-8 Build, 9-12 Launch; grade badge in the sidebar; teacher and admin set the grade, students cannot | `services/api/src/umanah_api/grades.py`, migration `0005`; `apps/web/src/lib/bands.ts`, `components/AppShell.tsx` | `5208bd0`, `6c0d375` |
| Band Homes: K-2 picture app (Read, Play, Ask, My Stars, read aloud); grades 3-12 Home with learning path, verb cards, next steps, skills; 9-12 adds Portfolio and Pathways | `apps/web/src/pages/Home.tsx` | `6c0d375` |
| Practice moved into Learn as a tab | `pages/Learn.tsx`, `pages/Revision.tsx` | `6c0d375` |
| Teacher "View as Student" (all four bands, sample data) and per-student view (strengths, struggles, assignment history, suggested next step) | `pages/TeacherK12.tsx`; API `/api/teacher/students/{id}` | `6c0d375`, `5208bd0` |
| Courses, coding games and library shelves filtered by band | `lib/bands.ts`, `features/LibraryBrowser.tsx`, `pages/Build.tsx` | `6c0d375` |
| School Library in Explore: browse offline course channels (Kolibri) inside the app; videos, picture books (EPUB), PDFs, sandboxed simulations | `routers/library.py`, `features/LibraryBrowser.tsx`, `features/EpubReader.tsx` | `e6fb62f` |
| Explore search across all library books by title (median 1.5 s), young readers' encyclopedias first; Featured shelves | `routers/explore.py`, `engines/__init__.py` | `865e55d`, `022b44c` |
| Build: Coding Challenges (offline games), Science Experiments, Engineering Projects, Robotics, AI Projects, with a project workspace | `features/BuildProjects.tsx`, `routers/build.py`, `content/build/` | `ab68fab`, `f1e7356` |
| K-12 curriculum map (each grade's courses) in Learn and teacher Curriculum | `routers/curriculum.py`, `content/curriculum/k12.json`, `features/GradeCourses.tsx` | `090b739` |
| Local Documents (staff upload PDF, picture, text, EPUB; students read) and Teacher Resources | `routers/documents.py`, `features/Documents.tsx`, migration `0006` | `7b583c9` |
| Teachers create homework and assessments (short answer, number, multiple choice; answer keys stay on the server; tutor always off in assessments); class Practice view | `routers/teacher_work.py`, `pages/TeacherWork.tsx`, migration `0007` | `3776a44` |
| AI Lesson Builder: local AI drafts a lesson, teacher edits and publishes to "From Your Teachers" | `routers/lesson_builder.py`, `pages/LessonBuilder.tsx`, migration `0008` | `46063cb` |
| Motion pass (Emil Kowalski's rules): shared `card-press`, `press`, `rise-in` styles and two easing curves; press feedback, hover lift only with a mouse, transform progress bars, smooth tutor streaming, reduced motion keeps fades | `apps/web/src/index.css`, `components/common.tsx`, `components/ui/*`, `features/tutor.tsx`, `pages/Home.tsx` | `10f37fb` |
| Sign-in as a school entry: school name, Student / Teacher or staff choice; public `GET /api/auth/school` (name only) | `pages/Login.tsx`, `routers/auth.py` | `5e91f3d` |
| School by Grade: School → Grade → Class → Student for teachers (`/teacher/school`, `GET /api/teacher/school`) | `pages/TeacherK12.tsx`, `routers/teacher.py` | `5e91f3d` |
| Teachers widen one student's content to other bands (`users.extra_bands`; `content_bands` in `/api/auth/me`) | migration `0010`, `grades.py`, `routers/{teacher,build}.py`, `lib/bands.ts` | `5e91f3d` |
| Project hand-in to the teacher (notification; teacher reads the text only after hand-in) and a Project helper tutor panel in the workspace | `routers/progress.py` (`POST /api/projects/{id}/submit`), `features/BuildProjects.tsx`, `pages/Build.tsx` | `5e91f3d` |
| Practice tab starts with "Practice for Grade N" (unfinished sets first); coding practice only for bands 6-12 | `pages/Revision.tsx` | `5e91f3d` |
| Tutor reading level follows the student's grade band (one prompt line; modes, limits, safety checks unchanged and tested) | `tutor/{modes,prompts}.py`, `tests/test_k12_leftovers.py` | `5e91f3d` |
| Translation files: `t()` with English fallback; band words and all new screens use it | `apps/web/src/locales/en.json`, `lib/i18n.ts` | `5e91f3d` |

All child-safety and tutor-policy rules (docs/41, docs/42) apply unchanged in every band.

## 2. Content each feature uses, and what EDU54 must do

**Keep** = allowed under the EDU54 allowlist (still re-check the license at the source on import day). **Remove** = not allowed. **Replace** = remove, then fill the gap from allowed sources in EDU54's `CONTENT-CATALOG.md`.

### 2.1 K-12 curriculum map (`content/curriculum/k12.json`)

Most entries are Khan Academy, so EDU54 needs its own version of this file.

| Entries | Source | EDU54 |
|---|---|---|
| Math K-12 (Kindergarten to Precalculus, AP Calculus, Statistics) | Khan Academy | **Replace** (OpenStax math where CC BY; otherwise leave the slot empty and say so) |
| Reading and vocabulary, grammar, history, civics, economics, financial literacy, internet safety, college and careers | Khan Academy | **Replace** or drop; drop US-centric titles in any case |
| Science (middle and high school) | Khan Academy | **Replace** (OpenStax science, CC BY) |
| Science video lessons, grades 9-12 | MIT BLOSSOMS | **Remove** |
| Picture books, levels 1-5 | African Storybook | **Keep only books marked CC BY / CC BY-SA** (check each) |
| Science simulations by school level | PhET | **Keep** sims published before 2026-03-29 only |

The file format is described in its `_about` field.

### 2.2 Build projects (`content/build/projects.json`, `content/build/ai/*.py`)

| Item | License | EDU54 |
|---|---|---|
| 12 science experiments, 6 engineering challenges on PhET sims | PhET CC BY 4.0 (sims before 2026-03-29); briefs written by Umanah | **Keep** after checking each sim's date |
| Robot missions | Reeborg's World CC BY-SA 4.0; Blockly Games Apache-2.0 | **Keep** |
| 5 AI projects (Python) | written by Umanah | **Keep** |
| Coding games: Blockly Games, Snap!, Music Blocks, Reeborg's World | Apache-2.0, AGPL-3.0, AGPL-3.0, CC BY-SA 4.0 | **Keep** (AGPL: publish any changes; ours are only local copies of their CDN files, listed in the review log) |
| Blockly Games was copied out of the Kolibri "Blockly Games" channel | Apache-2.0 | **Keep**, but build it from its GitHub repo for EDU54 |

### 2.3 Explore library (Kiwix books in `<data>/knowledge/kiwix/`)

| Book | EDU54 |
|---|---|
| Simple English Wikipedia, Wikipedia subject collections and most-read articles, Vikidia, Wiktionary, Wikibooks, Wikiversity | **Keep** (CC BY-SA; separate SA pack) |
| LibreTexts (9 books) | **Remove** unless a specific book is CC BY / CC BY-SA |
| Internet Encyclopedia of Philosophy | **Remove** (denylisted) |
| TED agriculture talks | **Remove** (CC BY-NC-ND) |
| Gardenology, Art of Problem Solving wiki | **Remove** until their licenses are confirmed at the source |
| freeCodeCamp | **Keep** if BSD-3 is confirmed on import day |

Also update `BOOKS` in `routers/explore.py` (the names and licenses students see).

### 2.4 School Library channels (Kolibri)

Umanah has Khan Academy, MIT BLOSSOMS, African Storybook, PhET, Blockly Games and a partial Global Digital Library. EDU54: **remove Khan Academy and MIT BLOSSOMS**; keep PhET (date cutoff) and African Storybook (per-book license); check Global Digital Library per book (H5P, which the School Library can't show yet). Band shelves: `CHANNEL_BANDS` in `features/LibraryBrowser.tsx`.

### 2.5 Teacher Resources shelves

Hard-coded in `TEACHER_SHELVES` in `apps/web/src/features/Documents.tsx`: Khan for Educators, Khan AI for education, Khan art-history guides (**Remove all three**), PhET teacher guides (**Keep**), MIT BLOSSOMS teacher notes (**Remove**). Suggested follow-up: move this list into a brand config file.

### 2.6 Other content names in code

- `RECOMMENDED` in `apps/web/src/lib/bands.ts` (Music Blocks, Blockly Maze, Umanah lessons): **Keep**.
- `FEATURED` in `routers/explore.py` (titles from the young readers' encyclopedias): **Keep**.
- Demo seed's two sample Local Documents (written by Umanah): **Keep** or replace.

### 2.7 Newer screens (2026-10-10)

- **Practice for Grade N** and the grade course cards link into the School Library courses from `k12.json`, so for EDU54 they show whatever replaces Khan Academy there; with an empty slot the card simply does not appear. The cards show each course's source line (for example "Khan Academy"): keep it only for sources EDU54 may name.
- **Sign-in school entry** shows the school's name from the database. Set it to the EDU54 school's name. The left panel's "Umanah AI Lab" text and points come from the brand switch.
- **Translations:** put EDU54's words in `apps/web/src/locales/en.json` (same keys), or add a new language file. Older screens still have English in the code.

## 3. Still open in the parent project (will reach EDU54 with the code)

- Khan Academy practice-exercise player: built (`perseus.py`, `features/ExercisePlayer.tsx`). It plays Khan's Perseus format only, so it is unused in EDU54 (no Khan content); harmless to ship.
- Umanah's own three courses are now complete (28 lessons, `content/{python-foundations,ai-foundations,science-engineering}/`, commit `85d1310`). Written by Umanah: **Keep** for EDU54.
- Done 2026-10-10: the tutor's reading level follows the grade; teachers can widen a student's content; new screens use translation files. Still open: older screens' strings are not in translation files yet.
- The 2026-10-10 work is on branch `k12-motion-and-bands` until the owner merges it to main. Copy from main once it is merged, or from that branch.
