# Mobile pass (ai.umanah.org), 2026-09-25, by the AI agent

Screens captured at 390x844 and 360x800 (`before/` and `after/`, full-page, 2x): sign-in page, and as student Home, Ask, Learn, Revision, Build, Explore, Progress, Lab Status, Settings and a lesson; as teacher Teacher Center, Students, Assignments, Settings; as admin Overview, People, Settings, Audit Log; the mobile menu for each role; the public demo sign-in page and the demo banner. Script: `apps/web/e2e/mobile.mjs`.

## What changed (phones only; desktop layout is unchanged)
- **Page headers** (Welcome back / Level / XP, Learn, Revision, Progress, Students, Assignments, Overview, and the rest) are centred, with balanced subtitles. Paragraphs, lists, forms, tables, chat and lesson text stay left.
- **Home tiles** (Ask, Learn, Build, Explore, Progress): icon, title and short subtitle centred, arrow centred underneath, two per row with equal heights; the fifth tile spans the row. System Status title is centred.
- **Revision and Explore tiles**: icon, title and subtitle centred; the arrow no longer overlaps the text; "Coming soon" sits under the title instead of over the icon; the odd last tile spans the row.
- **Teacher Center**: class card and stat tiles centred; long class names no longer wrap to three lines. Assignment rows wrap the due date under the title.
- **Sign-in page**: heading and sentence centred; the demo card and buttons unchanged.
- **Demo banner**: stacked and centred, the two links on one row, tap targets 44 px.
- **Tap targets**: every button, icon button, input, select and tab is at least 44 px (was 28 to 40 px). Breadcrumb links and list rows are 44 px. Checkboxes are 22 px inside their labels.
- **No page scrolls sideways** at either size (measured: 0 px overflow on every screen). Wide tables scroll inside their own box.

## Known and left alone
- The two checkboxes on Admin People and Settings are 22 px; their labels are the larger tap area.
- The sign-in page's left panel (the three feature cards) is hidden on phones by design.
- Admin tables scroll sideways inside their card on a phone rather than reflowing.
