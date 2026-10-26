# Core UI Screen Specifications

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Visual reference

The reference images are in `../design/reference/` (`01-home-student-dashboard.png` … `10-teacher-center.png`), with a build spec in `../design/reference/README.md`. The app must look like those images, built with shadcn/ui, except for the listed changes at the end of this doc.

## 1. Home / Student Dashboard

Header: `Welcome back, Jordan`; `Level 4 — Builder`; `1,420 XP · 6-day streak`.

Primary cards:
- Ask — Get help from your local AI tutor.
- Learn — Continue courses, homework, and revision.
- Build — Code, experiment, and create.
- Explore — Search your local knowledge library.
- Progress — View XP, badges, courses, and achievements.

Lower content: Continue Learning (`Python Foundations — Lesson 6: Loops — 58%`) and Assigned Work (`Fractions Practice — Due Friday`).

System status: `Local AI: Ready`, `Internet: Optional`, `Learning services: Available`.

## 2. Ask / AI Tutor

Left contextual area: New Conversation, Recent Chats, My Courses, Class Resources.

Main heading: `Ask your AI tutor`.

Suggested prompts include Newton’s third law, Python loops, machine-learning quiz, study help.

A visible context chip such as `Python Foundations · Lesson 6`. In an assignment, a **locked badge** shows the mode and who set it: `Homework help: hints only — set by Ms. Williams`. It is never a toggle the student can switch (`42`).

A short line under the input says what the tutor is and who can see the chat: `AI tutor — can make mistakes. Your teacher can see chats linked to assignments.` (final wording per `41`).

The assistant should explain, guide, quiz, and ask Socratic follow-ups. No third-party product or model names appear anywhere on this screen.

## 3. Learn / Learning Hub

Tabs: Continue, Courses, Assigned, Homework, Revision, Completed.

Cards:
- Python Foundations — 58%, Next: Loops.
- AI Foundations — 82%, Next: Responsible AI.
- Science & Engineering — 25%, Next: Forces and Motion.

Assigned-work panel: Fractions Practice / Ms. Williams / Due Friday / Start Assignment.

## 4. Lesson Screen

Interactive textbook layout. Course/module breadcrumbs, objective, explanatory content, examples, small diagram, mini interaction, AI Tutor side panel, practice, previous/next. Reward label `+50 XP when complete`.

## 5. Homework / Assignment

Title: Assignment: Fractions Practice. Metadata: Mathematics · Year 7 / Ms. Williams / Due Friday.

Tabs: Instructions, Worksheet, Resources, Your Work.

AI help panel explicitly offers hints, concept explanations, similar examples—never full answers in homework mode.

Save Draft / Submit Assignment. States are exclusive: **Draft** (editing, Submit enabled) → **Submitted — awaiting teacher review** (answers read-only, Submit hidden) → **Returned** (feedback and score shown).

## 6. Revision

Recommended topic, weak topics, past lessons, practice questions, past papers, flashcards, AI quiz. Revision Sprint with score, XP, and next-topic recommendation.

## 7. Build Lab

Categories: Python Lab, Coding Challenges, AI Projects, Science Experiments, Robotics, Engineering Projects.

Editor, Run, Reset, Save Project, Ask for a Hint, output, AI helper. Python runs in the student's browser (`12`). Projects save to the appliance. Example projects use bundled datasets only (for example, a saved weather dataset rather than fetching live weather), so everything works offline.

## 8. Explore / Knowledge Library

Search plus categories: School Library, Science, Engineering, AI & Computing, History, Teacher Resources, Local Documents.

Featured resources can include approved NASA content (content only; never the NASA logo or insignia), physics references, Python reference, school handbook, study guides. A document preview supports `Ask this document` with source grounding.

## 9. Progress / Achievements

Level 4 Builder, 1,420/2,000 XP, 6-day streak. Course progress, badge row, project status. Avoid childish visual treatment.

## 10. Teacher Center

Period 3 — Introduction to AI. 28 students, 19 completed, 6 in progress, 3 not started, 74% average completion. Alert for students who may need help with Python loops. Recent submissions. Teacher actions. Student detail panel.

## 11. Safety Alerts (designated safety contacts only)

List of alerts: student, time, category, status (New / Acknowledged / Closed). Detail view shows the triggering message, the tutor's support response, and a notes field. Works offline on the local network. See `41`.

## 12. Lab Status

Plain-language health for teachers and admins: Local AI, learning services, storage, internet (optional), support connection, software version. Detailed diagnostics only in the admin area.

## Changes from the concept mock-ups

The ten concept images (September 2026) set the visual direction. When building, change the following:

1. **Sidebar:** use the same items on every screen: Home, Ask, Learn, Build, Explore, Progress, then Lab Status and Settings. Replace "Ask AI", "Coding Lab", "Learning Lab", "Knowledge Library" and the separate "Build Lab"/"Revision" items. Revision lives inside Learn.
2. **Homework Mode:** replace the toggle on the Ask screen with the locked badge described in section 2.
3. **Homework screen:** show only one state at a time (section 5); the concept shows "Submitted" while the student is still answering.
4. **Badges:** replace "AI Explorer — asked 50+ questions with AI" with a badge for understanding, such as "Solved a problem after one hint" (`15`).
5. **Build projects:** replace "Weather Data Project — fetch real-world weather data" with a bundled-data version.
6. **Explore:** remove the NASA logo; use a neutral space image.
7. **Personas:** student screens show a student (Jordan); the Revision concept shows "Teacher User."
8. **Dates:** no fixed dates like "Oct 15, 2024 / Fall 2024"; seed data uses dates relative to today.
9. **Lesson code blocks:** line numbers must be continuous (the concept shows 1, 3, 4).
10. **Contrast:** check small gray text on pastel cards against `49`; darken tokens if needed.
11. **Status panels:** never name the model ("Llama 3.1 8B") or mention SSH in student, teacher or public views.

## Responsive behavior

- Desktop: persistent sidebar and multi-column cards.
- Tablet: collapsible sidebar, 2-column cards.
- Mobile: drawer navigation, stacked cards, sticky contextual action where useful.
- Coding surfaces on small screens may offer simplified editor mode rather than forcing desktop density.

## Accessibility

- Keyboard complete.
- Visible focus states.
- Proper semantic headings and landmarks.
- Color never carries status alone.
- WCAG AA contrast minimum for ordinary text.
- Reduced-motion support.
