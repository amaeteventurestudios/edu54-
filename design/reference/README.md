# UI Reference Screens — build it to look like this

These images are the **visual target** for the Umanah AI Lab app. Build the app in React + shadcn/ui so it looks like them: same layout, spacing, colors, type, card style and density. Where these images disagree with `docs/05-UI-SCREEN-SPECS.md` → "Changes from the concept mock-ups", follow the doc. That list is short and deliberate; everything else should match the pictures.

## Files

| File | Screen | Route | Build in |
|---|---|---|---|
| `00-website-ai-lab-page.png` | Public page `umanah.org/ai-lab` (website, not the app) | — | website repo, static HTML (`docs/03`) |
| `01-home-student-dashboard.png` | Home / student dashboard | `/` | Slice 001 (S2) |
| `02-ask-ai-tutor.png` | Ask / AI tutor | `/ask` | Slice 001 (S4) |
| `03-learn-learning-hub.png` | Learn hub | `/learn` | Slice 001 (S3) |
| `04-lesson.png` | Lesson (Python Foundations, Lesson 6: Loops) | `/learn/lessons/:id` | Slice 001 (S3–S5) |
| `05-homework-assignment.png` | Homework / assignment | `/assignments/:id` | Slice 001 (S6) |
| `06-revision.png` | Revision (inside Learn) | `/learn/revision` | Phase 3 |
| `07-build-lab.png` | Build | `/build` | Slice 001 (S5) |
| `08-explore-knowledge-library.png` | Explore | `/explore` | Phase 4 |
| `09-progress-achievements.png` | Progress | `/progress` | Slice 001 (basic), Phase 3 (full) |
| `10-teacher-center.png` | Teacher Center | `/teacher` | Slice 001 (S7) |

## Important: build the app window, not the picture frame

Each image is a presentation slide: a big title ("01 | Home / Student Dashboard"), a subtitle, a marble-arch-and-olive-tree background, and a fake browser window with red/yellow/green dots. **None of that is part of the app.** Build only what is inside the browser window: the navy sidebar, the top bar and the page content. The app fills the whole browser.

## Layout shell (same on every screen)

- **Sidebar:** fixed, ~250 px wide, full height, navy `#0B1F3B`. Logo mark (outlined geometric flower/rosette) + "Umanah AI Lab" in serif, white, ~20 px. Nav items: 20 px outline icon + label, white at ~85% opacity, ~15 px Inter, row height ~48 px, 12 px inner padding, 8 px radius. **Active item:** background `#2C435B` (lighter navy), white text and icon at 100%. A thin divider (white ~12% opacity) separates the main items from Lab Status and Settings.
- **Sidebar items (all student screens, in this order):** Home, Ask, Learn, Build, Explore, Progress · divider · Lab Status, Settings. (The images vary; this list wins — see `docs/05`.) Teacher screens use the Teacher Center list shown in `10`.
- **Top bar:** height ~60 px, warm background `#F6F3EF`, bottom border 1 px `#E5E7EB`. Left: wide search field (white `#FCFAF8`, 1 px border, 10 px radius, magnifier icon, placeholder "Ask a question or start a new conversation…"). Right: moon icon (theme toggle), avatar circle with initials (background `#D9E1EC`, navy text), name, chevron.
- **Page area:** background `#FBF9F7` (warm off-white), padding ~32 px, content max width ~1200 px.

## Typography

- **Page titles and card titles:** Libre Baskerville (serif), navy/near-black `#0B1F3B`–`#111827`. Page H1 ~40–44 px ("Welcome back, Jordan", "Learn", "Build"). Card titles ~22–24 px serif ("Ask", "Python Foundations").
- **Body, labels, buttons, nav:** Inter. Body 15–16 px `#374151`; secondary/meta 13–14 px `#6B7280`.
- Subtitles under page titles are Inter, ~16 px, muted gray.
- Eyebrow labels ("RECOMMENDED FOR YOU", "RECENT CHATS", "MY COURSES"): Inter 11–12 px, semibold, uppercase, letter-spacing ~0.1em.

## Cards

- White or very light tinted fill, 1 px border `#ECE9E4`-ish, radius ~14 px, very soft shadow (`0 1px 4px rgba(0,0,0,0.06)`). No glass effects, no heavy shadows, no gradients.
- **Feature cards (the five verbs on Home, category cards on Build/Explore/Revision):** each has its own pastel tint and a round icon badge (~48–56 px circle) in a slightly stronger tint of the same hue, navy outline icon inside. Bottom-right: small round arrow button (~32 px) in the same tint.

| Verb / accent | Card fill | Icon circle |
|---|---|---|
| Ask — blue | `#F0F5FC` | `#E0ECFE` |
| Learn — green | `#F4F7F3` | `#E5F0E7` |
| Build — amber | `#FCF7EE` | `#FBF1DF` |
| Explore — lavender | `#F3F1FC` | `#E4E0FB` |
| Progress — rose | `#FBF1F2` | `#F7E3E8` |

Use the same five accents consistently wherever those areas appear (for example Explore categories reuse the set in rotation).

## Components (shadcn mapping)

| In the images | shadcn / Radix |
|---|---|
| Sidebar | `Sidebar` (shadcn sidebar block), themed navy |
| Search field | `Input` with icon; opens `Command` palette on focus |
| Cards | `Card` |
| Progress bars (course %, XP) | `Progress` — fill navy `#163B62`, track `#E8E8E8`, height 6–8 px, fully rounded |
| Learn tabs (Continue · Courses · Assigned · Homework · Revision · Completed), Teacher tabs, Assignment tabs | `Tabs` — underline style: active tab navy text with 2 px navy underline, inactive gray; icons before labels |
| Primary buttons ("Start Assignment", "Run", "Submit Assignment", "Start 10-Minute Revision Sprint") | `Button` default — navy fill, white text, 10 px radius, 44–46 px tall |
| Secondary buttons ("Save Draft", "Reset", "Save Project", "View Class") | `Button` variant outline — white fill, 1 px border, navy text |
| Status pills ("Graded", "Needs Review", "Complete", "Weak topic", "Approved Local Material") | `Badge` — soft tinted fill + darker text of same hue (green `#DDF7E8`, blue `#E0EBFC`, rose, amber) |
| Lesson context chip ("Python Foundations · Lesson 6 ▾") | `Button` outline + `DropdownMenu` |
| Homework mode | **Locked** `Badge` with lock icon — not a `Switch` (`docs/05`, `docs/42`) |
| Quiz options (A/B/C/D) | `RadioGroup` styled as bordered option cards; selected = navy border + tint |
| Stat tiles (Teacher: 28 / 19 / 6 / 3) | `Card` with tinted icon circle, big number serif ~28 px |
| Completion ring (74%) | small custom SVG ring, green `#4DB25B` on `#EDEDED` |
| Code editor + output | CodeMirror 6 in a `Card`; output panel dark navy `#0B1F3B` with light monospace text |
| Avatar | `Avatar` with initials |
| Chat messages | user: right-aligned light-blue bubble; tutor: left-aligned white card with rosette avatar; code blocks inside in light gray `#F9F9FB` with copy button |
| Alerts ("4 students may need help with Python loops") | `Alert` — soft rose fill `#FBF0EE`, rose warning icon, serif title |
| System status panel | `Card` with small colored dots (green `#4DB25B` ready, gray for optional) and plain labels |

Icons: **lucide-react** outline icons, 1.5 px stroke (matches the images and ships with shadcn).

## Screen-by-screen notes

- **01 Home:** greeting block (serif H1, "Level 4 — Builder" serif ~22 px, "1,420 XP · 6-day streak" gray) left; System Status card right. Row of five verb cards, equal width. Below: two wide cards, "Continue Learning" (course, lesson, progress bar, arrow) and "Assigned Work".
- **02 Ask:** context chip top-left, mode badge top-right, centered serif heading "Ask your AI tutor" + subtitle, four suggestion cards (tinted), then the conversation, input bar pinned to bottom with attach icon and round send button. The left sidebar here shows extra sections (New Conversation, Recent Chats, My Courses, Class Resources): put these in a **second, lighter panel inside the Ask page**, not in the main navy sidebar, so the main nav stays identical everywhere.
- **03 Learn:** H1 + subtitle, underline tabs with icons, "Continue Learning" heading with "View all courses →", three course cards (tinted header area with large course icon, serif title, description, "58% complete", progress bar, "Next: Loops", arrow button), Assigned Work banner with navy "Start Assignment" button.
- **04 Lesson:** breadcrumb (Learn › Python Foundations › Module 3 › Lesson 6) with "Your Progress" bar at right; course icon + course/module label; serif H1 "Loops"; objective line; section H2 serif; code block with continuous line numbers; flow diagram card ("How a loop works") in soft blue/amber/green boxes; "Check Your Understanding" and "Try It Yourself" cards side by side; AI Tutor panel on the right (~300 px, collapsible).
- **05 Homework:** back link, serif H1, metadata row with icons, status card top-right (only the current state — see `docs/05`), tabs (Instructions · Worksheet · Resources · Your Work) as boxed tabs with light-blue active fill, question card with "1 / 5" pager, math rendered properly, tip strip (light blue with bulb icon), Save Draft / Submit buttons, "Need help?" panel on the right with hint buttons and the rose "Not full answers during homework mode" note.
- **06 Revision:** recommended banner card (icon circle, eyebrow, serif title, tags, navy CTA right), six tinted option cards, bottom: Revision Sprint question card + completion card ("4/5 correct", "+75 XP" in green).
- **07 Build:** H1 + subtitle, six category cards in a row (first one selected: blue tint + border), editor card (file tab "main.py ▾", expand icon), button row (Run primary, Reset, Save Project, Ask for a Hint), dark output panel, green "Project saved locally" strip, AI Helper panel right with suggestion buttons.
- **08 Explore:** H1 + subtitle, seven category cards, "Featured Resources" list (thumbnail, title, description, tag badges, arrow), document preview card on the right with "Approved Local Material" badge and "Ask this document" input at the bottom. No NASA logo.
- **09 Progress:** H1 + subtitle, streak card (top right, amber), level card (hexagon badge, "Level 4", serif "Builder", XP bar, 71%), badges row (five tinted badge tiles), Course Progress list and Projects list with status pills.
- **10 Teacher Center:** H1 + subtitle, class selector card top-right, underline tabs, class card with four stat tiles, Class Progress ring, rose alert card, student detail card on the right (avatar, course bars, XP/badges/streak tiles), Recent Submissions table with status badges, Teacher Actions grid.

## Dark mode

The images show a moon icon. v1 ships light mode matching these images; dark mode is a later item. Keep colors in CSS variables (shadcn theme tokens) so dark mode can be added without touching components.

## Verification

At each slice step, take Playwright screenshots at 1440×900 and put them side by side with the matching reference image in `design/compare/`. The screen isn't done until a person looking at both would say they are the same design.
