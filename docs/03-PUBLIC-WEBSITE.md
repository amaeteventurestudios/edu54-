# Public Website Specification — `umanah.org/ai-lab`

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Where the code lives

The Umanah Institute website is `https://github.com/amaeteventurestudios/ui`: static HTML pages sharing `css/tokens.css` (same palette and fonts as the app), `css/base.css`, `js/main.js`, forms via Formspree (`js/forms.js`). Add `ai-lab` as a new page plus `css/ai-lab.css`, add "AI Lab" to the nav, mobile menu and footer on every page (each page has its own copy), and serve it at `/ai-lab` (folder `ai-lab/index.html` or a host rewrite, depending on where the site is hosted). Visual reference: `../design/reference/00-website-ai-lab-page.png`.

## Purpose

The public page explains the mission and product to donors, schools, teachers, partners, press, and prospective pilots. It is not the app. Its primary calls to action are **Launch Demo** and **Request Pilot Access**.

## Information architecture

### 1. Hero
Eyebrow: `AI LAB · LOCAL AI · EDUCATION · DEPLOYMENT`

Headline: **Umanah AI Lab**

Subheadline: *Local AI infrastructure for classrooms, libraries, and community learning environments.*

Body: Umanah AI Lab gives schools and community institutions their own private AI learning environment—running locally, available over the devices they already have, and designed to work without expensive per-user AI subscriptions or continuous cloud connectivity.

Buttons:
- `Launch Demo` → `https://ai.umanah.org`
- `Request Pilot Access` → institutional inquiry / pilot form

### 2. The access gap
Headline: **AI for learning shouldn't depend on a connection, a vendor, or a monthly bill.**

Explain unreliable internet, student data leaving the building, dependence on outside providers' terms, and recurring cost as barriers. Lead with offline, privacy and ownership; cost is a supporting point (`48`). Use the line: **Bring the intelligence to the classroom instead of sending the classroom to the cloud.**

### 3. What it is
Headline: **AI, curriculum, coding, and exploration in one place.**

Explain browser access and the five student actions: Ask, Learn, Build, Explore, Progress.

### 4. Product preview
Show the approved student dashboard concept prominently. The preview should communicate product coherence, not implementation architecture.

### 5. How it works
Explain one appliance serving many existing devices over local LAN/Wi-Fi.

### 6. Local independence + support
Headline: **Locally independent. Centrally supported.**
Explain health monitoring, signed updates, curriculum/model updates, diagnostics, and support without making the remote connection required for learning.

### 7. More than a chatbot
Explain structured learning and the loop: Lesson → Practice → AI Tutor → Exercise → Project → Assessment → Achievement.

### 8. Progress/gamification
XP, badges, streaks, mastery, projects, completion. Explicitly say the focus is growth and accomplishment, not public ranking.

### 9. Teacher Center
Classes, curriculum, assignments, students, revision, assessments, resources, AI Lesson Builder.

### 10. Deployment configurations
AI Lab Mini / School / Research with “Same platform. Different capacity.” Mini is described by what it does ("a compact appliance that serves a classroom"), not by a specific brand or the Raspberry Pi. Capacity numbers appear only after benchmarks (`43`).

### 11. Open infrastructure
Explain that mature open-source technology is unified by Umanah LabOS. Link to open-source notices without turning the page into a dependency list.

### 12. Pilot program
Invite schools, libraries, nonprofits, community organizations, technology partners, hardware partners, and philanthropy.

### 13. Final CTA
Headline: **Bring local AI to the places that need it.**
Buttons repeat Launch Demo and Request Pilot Access.

## SEO / metadata

Suggested title: `Umanah AI Lab | Local AI Infrastructure for Learning`

Suggested description: `Umanah AI Lab gives schools, libraries, and communities a private, local AI learning environment for tutoring, curriculum, coding, and knowledge access.`

## Acceptance criteria

- Matches Umanah Institute visual language.
- AI Lab appears in main navigation.
- Demo opens `ai.umanah.org`.
- Mobile layout remains elegant and readable.
- No false claims about pilot status, hardware capacity, or partner relationships.
- Third-party engine brands do not dominate the page.

## Copy rules (apply to the concept landing page)

- "Prototype #001 is live" appears only when the public demo is actually up (`46`).
- The product preview's status panel must not name the model or mention SSH. Use plain labels: "Local AI: Ready", "Works offline", "Remote support: available".
- Usage numbers in the preview ("Active users", "Conversations today") are either real or clearly labeled as demo data.
- Replace "Get helpful, accurate answers" with "Get help that's grounded in your lessons."
- The AI Lab Mini card must not say "Runs on a single device (e.g., Raspberry Pi)."
- Add a short **Safety & privacy** section: student conversations stay at the school; built-in safety alerts go to the school, never to Umanah (`41`, `50`).
- Add **Open content** credit line: "Includes open educational resources from leading universities and libraries" with a link to the notices page (`47`). Don't use university names or logos as endorsements.
