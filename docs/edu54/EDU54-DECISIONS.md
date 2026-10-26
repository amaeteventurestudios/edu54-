# EDU54 — decisions

> **EDU54 copy (2026-10-26).** This repo was cloned from Ashanti Labs and only the name was changed (Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com). Server facts below (hosts, addresses, paths, deploy dates, "live" checks) describe the **Ashanti Labs** deployment as it was renamed in text; EDU54 itself is **not deployed yet** and has no servers, DNS or email of its own.

Decisions taken while installing EDU54 on ai-node-01. "Default applied under standing authorization" means this brief
(`docs/edu54/CLAUDE.md`) or the runbook chose for the owner, and the AI agent (Claude) applied it. Grouped by date and area.

## 2026-09-30

### Architecture
- **One codebase, two switches** (default applied under standing authorization). `LABOS_BRAND` (`umanah` default, `edu54`) and `LABOS_EDITION` (`k12`, `university`; empty = the AI Lab's wording) are read by the API at start-up (`services/api/src/umanah_api/branding.py`) and served at `GET /api/config/public`. The web app reads it before rendering (`apps/web/src/lib/brand.tsx`) and maps brand colors onto the existing CSS variables. Umanah with no edition is byte-for-byte the AI Lab's wording and colors; the API suite (191/191) and the LabOS browser suite (35/35) pass with the defaults.
- **Separate images** `edu54/api` and `edu54/web`, never `umanah/*`, so building from this branch can never replace what the live AI Lab runs.
- **Networking.** On this rootless Docker daemon "host" networking is the machine's own network. EDU54's API listens on `127.0.0.1:8301/8351` only; the web server listens on 8300/8350 (LAN + Tailscale) and proxies `/api` over loopback. This lets the API reach shared services at the `127.0.0.1` URLs from the brief without joining any AI Lab network.
- **RAM guard: fallback mode in use.** `free -m` showed about 2.9 GB available with swap full. EDU54's own model runtime (4B tutor + guard + embeddings, about 4.5 GB) would leave under 2 GB, so it was **not started**. Both instances use the AI Lab's runtime at `127.0.0.1:8120` as a read-only client: chat and embedding requests only, with the models it already has (`qwen3:4b-instruct`, `llama-guard3:1b`, `nomic-embed-text`) and **its exact load settings** (keep-alive -1, context 2560) so no EDU54 request makes it reload or unload a model. Checked before and after a tutor answer: same models loaded, same expiry. `edu54-lab ram-guard` re-checks; `edu54-lab start shared` starts EDU54's own runtime automatically when it fits.
- **Edition wording** for text that components hard-code is applied by an interim text rewriter (`startEditionWording` in `brand.tsx`); nav labels, page titles and page headers use `tr()` directly. **Open:** move every UI string into translation files (needed anyway for the French pack).
- **Demo seed:** fictional pan-African staff and six students per edition, usernames by first name (`kofi`, `kwame`…). Logins in `<EDU54_ROOT>/secrets/demo-accounts.txt` (0600, not in Git).
- **Per-institution provisioning** (`edu54-lab provision schools/<id>.yaml`, API `umanah_api/provision.py`): validates the order file, creates the institution, its admin and safety contact(s) with one-time passwords that must be changed at first sign-in, adds the course catalog, writes a 0600 first-login sheet, prints a report without passwords. Re-running creates nothing new. Dry-run on the Beelink with a made-up "Test Polytechnic" on ports 8380/8381, then removed (`edu54-lab remove`, data moved to `backups/`).

### Safety (docs/41)
- **Help resources follow the deployment's country** (`UMANAH_SAFETY_COUNTRY`, default `US` for the AI Lab). docs/41 already says resources are "configured for the deployment's country"; before this change every install showed US hotlines (988, 741741, 911). EDU54 instances run as `NG` and, having no reviewed Nigerian list, show the core guidance (talk to the named trusted adult now) plus "call your local emergency number", never another country's numbers. **Open (owner / safeguarding lead):** a counselor-reviewed list of helplines per target country. No numbers were added, because none were verified.
- **University edition runs the same safety pipeline and tutor policy as K-12.** Whether adults get an adult-tuned policy is an owner decision; **open**.

### Content and licenses
- **freeCodeCamp excluded.** Its repository says the code is BSD-3-Clause but the curriculum is "copyright freeCodeCamp.org" (no open license). Not downloaded.
- **Stack Exchange:** only sites opened after 8 April 2011 (Computer Science, Chemistry, Biology), whose posts are all CC BY-SA 3.0 or 4.0. Physics, Mathematics and Cross Validated include CC BY-SA 2.5 posts, which the allowlist does not include; left out.
- **DevDocs:** NumPy and pandas (BSD-3-Clause) and Git (GPL-2.0) only. Python docs (PSF license) and MDN (CC BY-SA 2.5) are not on the allowlist; left out.
- **Vikidia is CC BY-SA 3.0** (its page footer), not 4.0 as LabOS's Explore label said. Fixed on this branch; the live AI Lab still shows "4.0" for Vikidia (not changed here: AI Lab is untouched; listed for the owner).
- **Reeborg's World excluded.** `LICENSE.md` says CC BY-SA 4.0 but `package.json` says CC BY 4.0 and the page meta tags still say CC BY-NC-SA 3.0. Ambiguous, so left out (moved to `tmp/excluded/`).
- **GlowScript is MIT** (its LICENSE.txt), not BSD-3 as the catalog guessed. MIT is on the allowlist.
- **Tool patches** (all offline-only): analytics and cloud calls removed from Snap!, CDN files made local in Music Blocks, JSmol usage tracker switched off, GlowScript textures always local, JupyterLite built with Pyodide bundled. Music Blocks' optional sharing server still tries to connect; the page's security policy blocks it.
- **Umanah lessons audited** (Python Foundations 5-7, AI Foundations 1-2, the practice sets and revision pack): none cites or adapts an excluded source. All ship. See `EDU54-EXCLUSIONS.md`.

### Models (model registry)
| Role | Model | Digest (Ollama) | Size | License (as stated in the model) | Where |
|---|---|---|---|---|---|
| Tutor | qwen3:4b-instruct, Q4_K_M | 0edcdef34593 | 2.5 GB | Apache-2.0 | AI Lab runtime, read-only client (fallback) |
| Safety | llama-guard3:1b, Q8_0 | 494147e06bf9 | 1.6 GB | Llama 3.2 Community License (commercial use allowed with its conditions; attribution "Built with Llama" required) | same |
| Embeddings | nomic-embed-text | 0a109f422b47 | 0.27 GB | Apache-2.0 | same |

Qwen3Guard is not in the Ollama library, so Llama Guard 3 1B is the documented fallback. **Open:** the tutor and safety evals (`services/api/evals`) were not re-run for EDU54; the models and prompts are the AI Lab's except the tutor's product name.

### Bugs found and fixed on this branch (also present in the AI Lab code)
- **Ask was broken when the app is opened by LAN address over plain HTTP.** The chat used `crypto.randomUUID`, which browsers only provide on HTTPS or localhost, so sending a message threw an error and the tutor never answered. Fixed with a fallback (`uid()` in `apps/web/src/lib/utils.ts`). The public AI Lab demo is HTTPS so it is not affected there; the AI Lab opened at `http://192.168.4.41:8130` would be. Not changed in the AI Lab install (untouched); listed for the owner.
- **Vikidia license label** (see Content above).

### Operations notes
- Building images on this box (npm and uv inside Docker) pushes the model runtime into swap; one EDU54 tutor request during a build timed out after 90 s and showed the "tutor isn't available" message. After the build it answered in 11 s. Build EDU54 images only when the AI Lab is quiet.
- The AI Lab's own Kiwix was restarted at 06:20 UTC by the AI Lab's content downloads (its library rebuild), not by EDU54. EDU54 scripts only touch `edu54-*` containers.

## 2026-09-30 (overnight)

### OpenStax: current editions are no longer CC BY
OpenStax's own catalog (`openstax.org/apps/cms/api/v2/pages/?type=books.Book`, read 2026-09-30) lists **70 live English titles as CC BY-NC-SA 4.0**, including Chemistry 2e, Biology 2e, Calculus, University Physics, Economics 2e and College Algebra 2e. The brief's catalog assumed CC BY 4.0. NonCommercial cannot ship in a paid product, so the gate excludes them. **Owner decision needed:** this also affects the plan to translate OpenStax into French/Portuguese/Arabic.
What was imported instead (default applied under standing authorization): the **21 titles whose edition OpenStax lists as CC BY 4.0**. That is 2 live titles (Physics for high school, Statistics for high school) and 19 retired first editions (Algebra and Trigonometry, Anatomy and Physiology, Astronomy, Biology, Chemistry, Chemistry: Atoms First, College Algebra, College Physics, Elementary Algebra, Intermediate Algebra, Introduction to Sociology 2e, Introductory Business Statistics, Introductory Statistics, Prealgebra, Precalculus, Principles of Economics 2e, Macroeconomics 2e, Microeconomics 2e, Psychology). A CC BY license on a published edition stays valid; these editions are older and OpenStax no longer updates them. Left out as US-centric: American Government (all editions), AP variants, Introduction to Intellectual Property (US law). 2.0 GB in `<ROOT>/knowledge/openstax/`, listed on the Attributions page with "Download for free at openstax.org" as OpenStax asks.
- An Explore "Textbooks" shelf (PDF in the browser's viewer) is written and unit-tested (`/api/explore/textbooks`), **but not deployed**: building the web image needs about 1 GB of RAM this box did not have overnight (see below). Deploy: `<ROOT>/services/edu54-lab build && <ROOT>/services/edu54-lab start k12 && <ROOT>/services/edu54-lab start uni`, only when the AI Lab is quiet.

### Evals (partial) and an incident on the AI Lab
- Ran the repo's evals with EDU54 K-12 settings against the AI Lab's runtime (read-only client, one request at a time), 00:00-04:30 PDT.
  - **Safety: FAIL on the release threshold.** High-severity messages routed to support + alert: **182/191 (95.3%)**; required 100%. Educational questions wrongly blocked: 0/110. Other categories 107/108. The AI Lab recorded 191/191 on 2026-09-24 with the same pipeline; the difference was not investigated yet. The runtime was killed twice during the run (below), and a classifier call that fails or times out may fall back to rules only; that is the first thing to check. The per-item results were not saved because the run was stopped before it wrote its file.
  - **Jailbreak:** 0 answer leaks in the first 60 of 140 prompts, then the run stalled after the runtime was killed; stopped at 04:31.
  - **Accuracy:** not reached.
- **Incident:** during the eval run the machine ran out of memory and the kernel killed the AI Lab's model runtime process twice (00:50 and 01:14 PDT). The runtime restarted itself and the AI Lab and ai.umanah.org answered again afterwards (checked 04:4x: API 200, runtime answering, site 200). A capped web build at 04:3x also pushed the box into heavy swapping; it was stopped and the AI Lab recovered within minutes. **Rule from now on:** on ai-node-01, no evals, load tests or image builds for EDU54 while the AI Lab is live; run them on the Mac mini, or when the owner OKs a quiet window.

## 2026-09-30 (morning)
- **"Try the demo" on both sign-in pages** (owner asked, with a screenshot of the AI Lab's). Uses LabOS demo mode (`DEMO_MODE=1`): each visitor gets a private copy of the sample school or university, reset nightly, 20 tutor questions an hour. New setting `DEMO_ALL_LOGINS=1` (default off, so the public AI Lab demo is unchanged) keeps every demo account's password sign-in working on this LAN demo box, because the public demo only lets the owner account sign in by password. University shows "Try as a lecturer". Checked in a real browser on both editions.
- The Textbooks shelf is now live (deployed with the same web build): 7 books on K-12, 18 on University.
- University sign-in headline shortened to "A campus-owned AI learning lab." (the longer one was cut off).
- **Not deployed:** the web app now retries loading its brand settings for about 20 s and never falls back to another brand's name (a slow API once showed the AI Lab's privacy line on the EDU54 sign-in page). The code is committed; the web rebuild was stopped twice because it made the AI Lab's API stop answering for up to a minute. Deploy in a quiet window: `cd apps/web && VITE_PRODUCT_NAME="EDU54" npm run build`, then `docker build -f apps/web/Dockerfile.prebuilt -t edu54/web:0.1.0 .` and `edu54-lab start k12|uni`.
- The machine is under heavy disk load (swap full, about 45% I/O wait, load average around 20) from several services. EDU54's library downloads are paused to help; resume with `nohup setsid nice -n 19 <ROOT>/services/download-zims.sh &`. Remaining: Wikibooks, Wikisource, Wiktionary, full English Wikipedia (127 GB).

## 2026-09-30 (afternoon): grade-aware K-12 student experience (owner's brief)
- **One platform, four learner experiences**, chosen by the student's class level, never by the student: Discover (K-2: Kindergarten, Primary 1-2), Explore (3-5: Primary 3-5), Build (6-8: Primary 6, JSS 1-2), Launch (9-12: JSS 3, SSS 1-3). Mapping in `config/editions.yaml`; the Nigerian level names stay the English default with US-style grades in brackets. Default applied under standing authorization: Primary 6 counts as Build (grade 6).
- **Student Home rebuilt** (`apps/web/src/pages/StudentHome.tsx`, API `GET /api/learner/me`): the learner line ("JSS 2 · Junior Secondary · Build (6-8)"), level/XP/streak, a Learning Path with real progress (steps with no content yet are marked "Soon"), the five cards renamed (AI Tutor, My Learning, Create & Build, Explore, My Progress), then Continue Learning, Assignments, Recommended for <level>, Continue Your Project, and Your Skills (from real progress; "Digital Citizenship" is not started because those lessons don't exist yet).
  - Discover: picture tiles (Talk, Puzzles, Music, Stories, My Stars), a sun guide with a spoken greeting, a read-aloud button on every tile (the device's own voice; works only where the browser has one), no system status, and a sidebar cut to Home, AI Tutor, Explore and Progress.
  - Explore: friendlier words, "Your Adventure" path, coding games, three skills.
  - Launch: "Your Pathway", Portfolio, Pathways (careers, university preparation, certificates marked "Soon": no content yet).
  - University uses the Build layout with "Year 1 · Undergraduate".
- **Sidebar**: persistent learner badge (level and stage) and EDU54 student navigation Home, AI Tutor, Learn, Practice, Create, Explore, Progress (pages: "Practice" = Revision, "Create & Build" = Build). The AI Lab (Umanah brand) is unchanged.
- **Teachers**: "View as Discover K-2 | Explore 3-5 | Build 6-8 | Launch 9-12" on the Teacher Center opens a labelled preview with no learner's data (`/api/learner/preview`).
- **Demo school** renamed "EDU54 Demo School" (was "... Secondary School") now that K-12 spans Kindergarten to SSS 3; three more demo learners, one per other band: `ama` (Primary 1), `chidi` (Primary 4), `fatima` (SSS 2); logins added to the demo-accounts file.
- **Not built yet from the brief's 14-18 showcase screens:** a separate K-2 voice-first tutor, device management in admin, "School -> Grade -> Class -> Student" drill-down for teachers, adaptive practice by band, real Data / ML / portfolio / career content. The screens that exist are shown with honest "Soon" labels.

## 2026-09-30 (evening)
- **Browser suite 12/12** with the box quiet (16:10 PDT).
- **Staff drill-down School -> Grade -> Class -> Student** (`/school`, API `/api/learner/school`): admins see every class grouped by band and level; teachers see only their own classes. Each learner row shows learning-path %, last sign-in and a "May need help" flag (a concept answered wrong at least twice). **One learner's view** (`/school/students/:id`): path, strengths, struggling concepts, assignment history and a suggested next step, labelled as a simple rule, not AI. A teacher cannot open a learner outside their classes (404). API tests added.
- **Safety eval could not be re-run safely on this box.** With the AI Lab's models loaded, only about 1.2-1.5 GB is free; the re-run was stopped by its memory guard at once. **Likely cause of 182/191 (inferred, not proven):** the safety pipeline "fails soft" (`safety/pipeline.py`, `triage.py`): when the model runtime errors, the classifier and triage return nothing and only the rules layer decides. The runtime was killed twice by the kernel during the first run, so messages that needed the model layers would have slipped through during those minutes. **Open for the owner / safeguarding lead:** (1) re-run the safety set where memory allows (Mac mini); (2) whether a student message should be held, rather than answered, when the safety model is unavailable (fail-closed). That is a child-safety policy choice shared with the AI Lab, so it was not changed here.
- Library downloads resumed at low priority (18 books in; Wikibooks next, full Wikipedia last).

## 2026-10-10: LabOS UI updates brought into EDU54 (owner's brief, `~/edu54/UI-UPDATES.md`)
Done by the AI agent (Claude). Source: LabOS branch `k12-motion-and-bands` (up to `a549a4b`), merged into `edu54`, so
every LabOS change since the School Library (21 commits) arrives with the code; this note lists what was decided for EDU54.

### Which edition takes what
- **Both editions:** the motion pass (shared `card-press`, `press`, `rise-in`, easing curves, reduced motion keeps fades), sign-in
  as a school entry, project hand-in with the class teacher or lecturer notified, Python Lab hand-in, translation files, teacher
  homework and assessments, Local Documents, the AI Lesson Builder, the 23 new Umanah lessons (audited, see exclusions).
- **K-12 only:** School by Grade, View as, widening a student's content to other bands, Practice for the student's level, and the
  tutor's reading level by grade band. University hides them, and the API refuses them there (`grades.enabled()`: School tree
  404, widening 400). University students have no grade, so the tutor keeps the class age-band line.

### One version of each screen (no parallel copies)
LabOS and EDU54 had each built some of the same screens. Kept one of each (default applied under standing authorization):
- **Grade source:** LabOS's `users.grade` (0-12) is the one source. In EDU54 K-12 the edition's level names map to it by
  position (Kindergarten = 0, Primary 1-6 = 1-6, JSS 1-3 = 7-9, SSS 1-3 = 10-12), so the API shows "JSS 2 · Junior Secondary",
  never "Grade 8". A student with no grade takes the grade behind their class's level once (`seed.grades_from_levels`, runs at
  start-up for the EDU54 brand; a grade a teacher set is never changed). The EDU54 Home reads the grade first, then the class.
- **Student Home:** EDU54 keeps its own band Homes (`StudentHome.tsx`, owner-reviewed 2026-09-30) and gained the motion rules
  (first-visit stagger, `card-press`, K-2 read-aloud only after the mouse rests 0.35 s and never on touch). The AI Lab keeps its own.
- **School by Grade and View as:** EDU54 keeps `/school` and `/preview/:band` (level names, path %, "may need help"); the
  LabOS routes `/teacher/school` and `/teacher/view-as` redirect there in EDU54.
- **One student page for both brands:** LabOS's `/teacher/students/:id` (it has the new Projects and widening cards). EDU54's
  separate learner page and `/api/learner/students/{id}` were removed; `/school/students/:id` redirects.
- **Practice in the navigation:** EDU54 keeps "Practice" in the student menu (owner, 2026-09-30); it now opens Learn's
  Practice tab, as LabOS moved Practice there.

### Content and credits (CLAUDE.md §2)
- **K-12 curriculum map:** EDU54 uses its own `content/curriculum/k12.edu54.json`, empty on purpose. The AI Lab's map is Khan
  Academy, MIT BLOSSOMS, African Storybook and PhET; none ships in EDU54 today. So no grade-course cards and no "Khan Academy"
  source lines appear; the grade block in Practice is hidden while it is empty.
- **Library practice** (Khan Academy exercises): hidden in EDU54 on the Practice tab, Progress and the student page.
- **Teacher Resources shelves** (Khan for Educators, Khan AI, Khan art history, PhET guides, MIT BLOSSOMS): none shown in
  EDU54; the page says no teacher guides are on the device yet.
- **Build:** Science Experiments, Engineering Projects (PhET simulations) and Robotics (Reeborg's World) show "Coming later" in
  EDU54, because no allowed simulation is imported yet (PhET needs a per-sim date check) and Reeborg's World is excluded. The
  Project helper in those workspaces therefore waits for them; Python Lab keeps its helper and hand-in. AI Projects ship.
- **"Umanah courses"** headings now read "<brand> courses" ("EDU54 courses").
- **University wording** for the new screens ("Lecturer or staff", "Institution entry", "Hand in to my lecturer") comes from the
  existing edition-wording rewriter, checked in a real browser. No separate edition translation file was added.

### Not changed
- The safety pipeline, the server-enforced tutor limits and the open fail-closed question (hold a student message when the
  safety model is down) are exactly as before. The reading-level change touches one prompt line only; tests prove the modes,
  badges and locks stay the same in both editions.
- Nothing was deployed: the live instances on 8300/8350 still run the previous build. Deploy in a quiet window
  (`<ROOT>/services/edu54-lab build && … start k12 && … start uni`); building pushes this 12 GB box into swap.

### Tests and checks (2026-10-10)
- API: 315/315 with the default brand, including `test_k12_leftovers.py` and `test_tutor_policy.py` (15/15). New
  `tests/test_edu54_editions.py`: K-12 9/9, University 9/9 (school entry, hand-in, tutor policy, assessments, safety with NG
  resources, no Khan/NC/Umanah names in the API, level names, widening, reading level with limits unchanged).
- Browser: LabOS suite 47/47 with the default brand on a local server (ports 8394/8396). EDU54 desktop (1440x900) and phone
  (390x844) check on local K-12 and University servers with a stub tutor (`e2e-edu54/ui-check.mjs`): 64 pages, no sideways
  scroll, no page errors, no excluded names or "Umanah". The real tutor was not used (models not loaded, to save memory).
- Not checked: the deployed instances (not rebuilt), read-aloud with sound, and the EDU54 Playwright suite against the live
  instances (they still run the old build).

## 2026-10-21: second demo server (Contabo, vmi3665073, Tailscale name `vantage-world`)
Done by the AI agent (Claude) at the owner's request ("lets upload edu54 labs here").
- **Where:** `/srv/edu54` (same layout as on the Beelink), root Docker (`DOCKER_CONTEXT=default`); settings for the control
  scripts in `/srv/edu54/services/env.sh`. The server also runs other projects (a site on 80/443, pocketbase,
  spacetimedb); none was touched.
- **Reachable on Tailscale only:** homepage `http://100.116.39.112:8310` (nginx container `edu54-site`, bound to the Tailscale
  address), K-12 `:8300`, University `:8350`. The firewall allows only SSH and Tailscale; checked from outside that 8300, 8350,
  8310, 8301 and 8312 are closed on the public address.
- **No models on this server (owner, 2026-10-21).** No Ollama, Qwen or Llama was installed or downloaded. `EDU54_NO_MODELS=1`
  stops `edu54-lab start` from starting the model runtime. Until the owner names the model computer, the tutor is not
  connected (the Lab Status note says so); set `INFERENCE_URL` in `config/edu54-*.env` and restart the instances.
- **Library:** downloading on the server from the dotsrc.org Kiwix mirror (the main site was about 50 times slower), with
  limits of 100 GB for EDU54 and 80 GB kept free. Full English Wikipedia (119 GB) is left out on this server.
- **Homepage** (`apps/site/`): a static page in the EDU54 kente look (cloth cross-fading green, red and blue with the
  sign-in page's heartbeat), the two editions, the five verbs, the safety promises and how a box is ordered. Fonts and images
  are local, so it works offline. Every claim on it matches what the product does today.
- **Public on edu54.com (owner, 2026-10-21).** The owner moved the domain to Cloudflare and asked for it. A Cloudflare
  Tunnel (`cloudflared` systemd service on the server, http2 over IPv4, token in `/etc/cloudflared/token`, 0600) carries
  `edu54.com` → homepage :8310, `k12.edu54.com` → :8300, `uni.edu54.com` → :8350. Routes live in the
  owner's Cloudflare dashboard. No port was opened on the server; the firewall is unchanged. Email stays on the owner's Verpex
  hosting: `mail.edu54.com` → 192.250.227.21 (DNS only) and MX → `mail.edu54.com`. Checked over https: all three
  answer, the "Try the demo" sign-in works. The tutor is still not connected (no models on this server).

## 2026-10-21 (evening): premium homepage and kente sign-in (owner: "make it pop", copy the Umanah AI Lab page's text)
Done by the AI agent (Claude).
- **Homepage** (`apps/site/index.html`) rebuilt around one load moment, "the loom": kente cloth cross-fading green, red and
  blue with the heartbeat pulse, nine warp strips weaving in, a gold weft thread, and the real AI tutor screen rising out of
  the cloth. Sections follow the Umanah AI Lab page (umanah.org/ai-lab.html): the access gap, the five verbs, real screens,
  editions, how it works, safety, the learning loop, Teacher Center, open infrastructure, plus FAQs about the problems.
  Headings and subheadings are centred on phones. Checked at 2560x1440, 1440x900, 1280x800, 768x1024, 390x844 and 360x740:
  no sideways scroll, no page errors.
- **Copy changed from the Umanah page where it would be untrue for EDU54:** no "nonprofit" or "free of fees" (EDU54 is
  sold; the claim kept is "no per-student subscription"); "not sent to Umanah" became "not sent to us"; the pilot form was
  left out (no form service or contact address for EDU54 yet: **open for the owner**); "Assessments, resources and lesson
  builder are coming" became present tense, as they now exist. The hero states that the online demo's tutor is not connected.
- **Screens** are real screenshots of the live EDU54 demos (sample data), in `apps/site/shots/`.
- **SEO:** problem-led title and description, canonical, Open Graph and Twitter cards with a 1200x630 preview image
  (`og.jpg`), JSON-LD (Organization, WebSite, Product, FAQPage matching the visible FAQs), `robots.txt`, `sitemap.xml`,
  `llms.txt`, favicon and Apple touch icon.
- **Sign-in pages** (K-12 and University): for brands with cloth backgrounds, `Login.tsx` now renders the kente layout
  (cloth with heartbeat, warp strips, frosted card with a woven top edge, demo panel in gold). The AI Lab's sign-in is
  unchanged. University says "Try as a lecturer". EDU54 desktop and phone check: 64 pages ok on both editions.

## 2026-10-21 (late): legal pages and footer credit (owner: privacy, terms, GDPR; "Umanah Institute LabOS")
Done by the AI agent (Claude, cloud session; not deployed from here).
- **New pages** in the kente look, one shared stylesheet `apps/site/legal.css`: `/privacy/` (Privacy Policy), `/terms/`
  (Terms of Use and Service), `/data-protection/` (roles, what the box stores, NDPA 2023 + GAID 2025, Ghana Act 843, Kenya
  DPA 2019, POPIA, GDPR/UK GDPR, FERPA/COPPA, a school checklist, agreements we sign, breach notice). Each page is
  `<slug>/index.html` so nginx serves `/privacy/` with no config change. Linked from the homepage footer and the sitemap.
- **Claims kept to what the product does today:** student data on the box, not sent to us; tutor chats deleted after 90 days
  by default (admin 7-365, `chat_retention_days`); per-person export and delete; audit log; demo copies deleted within 24 h
  (`demosite.py`); no analytics on the site. Support access is written as a policy promise (only with the school's
  permission), not as a built feature. Not legal advice: the pages say so on the law summary.
- **Footer credit:** "Built on LabOS" → "Built on Umanah Institute LabOS" (homepage, legal pages, `config/brand.edu54.json`).
  The Attributions page no longer lower-cases the whole credit (only its first letter).
- **Open for the owner:** (1) the contact address used is `privacy@edu54.com`; that mailbox must exist on Verpex or be
  replaced. (2) The registered legal entity and address behind EDU54 are not named anywhere yet; the pages say
  "EDU54" and leave governing law to each order. (3) Have a lawyer in Nigeria/Ghana review before relying on them.

## 2026-10-23 — Discovery Lab (AI agent, owner asked for it to be built)
Third environment inside the same app at `/discover` in both editions; same accounts and session, so the AI Guide uses the
tutor's safety pipeline and alerts reach the student's own school. `discover.edu54.com` is a static page on the site
(:8310) linking to `k12./uni.edu54.com/discover`; the tunnel route is the owner's to add. GPL tools stay in K-12 and
University (owner agreed, 2026-10-23); Discovery Lab's 14 experiments are our own code. Detail: `docs/discovery-lab/README.md`.
