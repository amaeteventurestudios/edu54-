# EDU54 — Content and Tools Catalog

Everything allowed in EDU54, per edition, plus what is excluded. Licenses come from research (2026-09-28/30), **not** live checks: confirm each one at the source on the day you import it (rule in `CLAUDE.md` §2). Sizes are estimates.

Legend: ✅ commercial use allowed (CC BY, CC0/public domain, MIT/BSD/Apache) · ⚠️ ShareAlike (CC BY-SA; keep in its own pack) · 🔍 believed OK, verify carefully before import · ❌ excluded

Import order within each edition: **Tier 1** first (the demo), then Tier 2 while space allows (600 GB EDU54 cap, 300 GB always left free on the SSD).

---

## K-12 edition

### Tier 1 (demo)

| Item | What | License | Est. size | Notes |
|---|---|---|---|---|
| OpenStax high school titles | Physics, Biology (for AP), Statistics (high school), Prealgebra 2e, Elementary Algebra 2e, Intermediate Algebra 2e, Precalculus, Introduction to Python Programming | ✅ CC BY 4.0 | 2-4 GB | Download from openstax.org (PDF + web). No US History / American Government |
| African Storybook | early-reader picture books, many African languages | ✅/🔍 CC BY (check each story; a few are NC) | 2-5 GB | Kolibri channel or direct |
| StoryWeaver (Pratham Books) | picture books | ✅/🔍 mostly CC BY 4.0, check each | 2-5 GB | also via Global Digital Library |
| Global Digital Library | early-grade reading | ✅/🔍 mostly CC BY, check each | 2-5 GB | |
| PhET simulations | ~1,000 interactive sims | ✅ CC BY 4.0 **only for sims published before 29 Mar 2026** | 1-2 GB | filter by date; code is MIT/GPL |
| Wikijunior, Wikibooks (EN) | kids' books, textbooks | ⚠️ CC BY-SA | 1-5 GB | Kiwix ZIM |
| Wikipedia EN subject collections (science, math, geography, history) | reference | ⚠️ CC BY-SA | 5-20 GB | Kiwix ZIM; full EN with images is ~110 GB (Tier 2) |
| Project Gutenberg children's collection | classic literature | ✅ public domain | 1-3 GB | strip Gutenberg branding per their license |
| Siyavula | secondary maths and physical science (South Africa) | 🔍 believed CC BY; some editions CC BY-ND, reject ND | 1 GB | |
| Raspberry Pi Foundation projects | step-by-step coding projects | ⚠️ CC BY-SA 4.0 | 1-2 GB | skip Scratch-based ones |
| CS Unplugged | computing without computers | 🔍 believed CC BY-SA | <0.5 GB | |
| Microsoft "Web Dev for Beginners" | HTML/CSS/JS course | ✅ MIT | <1 GB | GitHub repo |

**K-12 tools (Build)**

| Tool | License | Notes |
|---|---|---|
| Pyodide (in-browser Python) | ✅ MPL-2.0 | already in LabOS |
| Blockly Games | ✅ Apache 2.0 | already added to LabOS Build on 2026-09-30 |
| Snap! (UC Berkeley) | ✅ AGPL-3.0 | software; publish changes if we modify it |
| Music Blocks (Sugar Labs) | ✅ AGPL-3.0 | same |
| Reeborg's World | 🔍 verify license | Python robot puzzles |
| p5.js / JS sandbox | ✅ LGPL-2.1 | |
| Typing tutor | 🔍 pick an MIT/GPL one | verify |
| Piper (offline read-aloud) + voices | ✅ MIT; 🔍 each voice has its own license, use only CC BY/CC0/MIT voices | |
| whisper.cpp (speech to text) + model | ✅ MIT | |

### Tier 2

Full English Wikipedia with images (~110 GB, ⚠️), Wikisource EN, more Gutenberg, Exercism problem sets (✅ MIT), additional OpenStax titles as they fit.

### Removed from the K-12 list the AI Lab uses

These are in the free AI Lab's K-12 install but **must not** be in EDU54: Khan Academy (all channels), CK-12, Harvard CS50 / CS50P, MIT RAISE / Day of AI, MIT BLOSSOMS, Scratch, TED / TED-Ed agriculture talks, LibreTexts NC books, Internet Encyclopedia of Philosophy, Gardenology (license unknown; include only if a CC BY/SA/PD license is confirmed).

**Known gaps after removal** (list them for the owner; do not fill with NC material): K-8 practice exercises (Khan's role), agriculture, and video lessons. Fill later with our own lessons.

---

## University edition

### Tier 1 (demo)

| Item | What | License | Est. size | Notes |
|---|---|---|---|---|
| OpenStax college library (kept titles) | **Sciences:** University Physics 1-3, College Physics, Astronomy, Chemistry 2e, Chemistry: Atoms First, Organic Chemistry, Biology 2e, Concepts of Biology, Microbiology, Anatomy & Physiology. **Math:** Calculus 1-3, Precalculus, College Algebra, Algebra & Trigonometry, Introductory Statistics, Intro Business Statistics, Contemporary Mathematics. **Social science / humanities:** World History 1-2, Introduction to Philosophy, Psychology, Introduction to Sociology, Introduction to Anthropology, Writing Guide, Introduction to Political Science. **Economics and business:** Principles of Economics / Micro / Macro, Introduction to Business, Entrepreneurship, Principles of Management, Organizational Behavior, Principles of Marketing. **Computing:** Introduction to Python Programming, Principles of Data Science | ✅ CC BY 4.0 | 5-10 GB | Drop U.S. History, American Government, Business Law I Essentials, Principles of Accounting. Check any other title individually |
| Saylor Academy | ~100 college courses with exams | ✅/🔍 mostly CC BY 3.0, per course | 5-15 GB | only Saylor-owned material; skip linked third-party readings |
| Microsoft "for Beginners" series | ML, AI, Data Science, Generative AI, IoT for Beginners | ✅ MIT | 2-5 GB | GitHub repos with notebooks |
| Hugging Face courses | LLM/NLP, agents, deep RL, diffusion, audio | ✅ Apache 2.0 | 1-2 GB | |
| Software / Data / Library Carpentry | shell, Git, Python, R, SQL | ✅ CC BY 4.0 | 1 GB | |
| Dive into Deep Learning (d2l.ai) | interactive DL textbook | ⚠️ text CC BY-SA 4.0, code MIT-0 | 1-2 GB | |
| Google Machine Learning Crash Course | ML fundamentals | 🔍 believed CC BY 4.0 | <1 GB | |
| Open Data Structures (Morin) | data structures | ✅ CC BY | <0.1 GB | |
| SICP (MIT Press open edition), Composing Programs (Berkeley) | CS foundations | ⚠️ CC BY-SA | <0.2 GB | SICP is CC BY-SA from MIT Press, allowed despite the MIT name; confirm the edition's license |
| OpenIntro Statistics | intro stats | ⚠️ CC BY-SA | <0.2 GB | |
| Light and Matter (Crowell) | physics series | ⚠️ CC BY-SA | <0.5 GB | |
| Active Calculus | calculus | ⚠️ CC BY-SA | <0.1 GB | |
| African Virtual University (AVU) | math, sciences, teacher education (EN/FR) | 🔍 believed CC BY-SA | 1-3 GB | African-authored |
| Wikipedia EN with images | reference | ⚠️ CC BY-SA | ~110 GB | Kiwix |
| Wikibooks, Wikiversity, Wikisource EN | textbooks, primary texts | ⚠️ CC BY-SA | 10-30 GB | Kiwix |
| Stack Exchange (physics, chemistry, biology, math, stats, CS) | Q&A | ⚠️ CC BY-SA | 10-25 GB | Kiwix |
| Dev docs (Kiwix DevDocs, MDN, Python docs) | language references | ✅/⚠️ | 2-5 GB | Kiwix |
| freeCodeCamp curriculum | web, Python, data | 🔍 believed BSD-3 | 1 GB | |
| Exercism problem sets | coding exercises | ✅ MIT | <1 GB | |

### Tier 2

Project Gutenberg EN (70-200 GB, public domain), LibriVox audiobooks (public domain), PubMed Central Open Access CC BY/CC0 subset, NOUN course materials (🔍 license unknown, verify), NPTEL (🔍 believed CC BY-SA; video is huge, pick 1-2 courses only), LibreTexts books individually marked CC BY or CC BY-SA.

**University tools**

| Area | Tools | License |
|---|---|---|
| Programming / data | Pyodide, JupyterLite (in-browser; default), JupyterHub (only if RAM allows), pandas/NumPy/SciPy/matplotlib/scikit-learn, RDKit, Biopython | BSD / MIT |
| Physics / engineering | GlowScript/VPython, Falstad circuit simulator, PhET (pre-29-Mar-2026), Open Source Physics sims | BSD / GPL / CC BY |
| Chemistry / biology | JSmol, Mol\*, NetLogo Web | LGPL / MIT / GPL |
| Stats (later, desktop or server) | R + RStudio Server, JASP, jamovi, PSPP, Orange, GNU Octave, Maxima | GPL / AGPL |
| Research / writing (later) | Overleaf Community Edition, Zotero, Voyant Tools, Anki | AGPL / GPL |

Browser tools first: they run on the student's device, not the box, which matters on a 12-24 GB machine.

### Excluded from University

MIT OpenCourseWare, Open Yale, Harvard CS50 / CS50 AI, Khan Academy, fast.ai, Code.org, Missing Semester, Stanford CS229/CS231n notes, Elements of AI, Kaggle Learn, *Python for Everybody*, *Automate the Boring Stuff*, *Think Python*, Nielsen's NN book, *Crafting Interpreters*, APEX Calculus, The Odin Project (unverified), YouTube lectures, GeoGebra, Desmos, Wolfram Alpha, MATLAB, UCSF ChimeraX, PhET sims after 29 Mar 2026, most LibreTexts.

---

## Later language tiers (not this pass)

| Tier | University content route |
|---|---|
| French | Wikipedia/Wikibooks FR, AVU French, **AI-drafted, human-reviewed translations of OpenStax** (CC BY allows it; credit OpenStax, don't use its brand) |
| Portuguese | Wikipedia PT, translated OpenStax |
| Spanish | OpenStax's existing Spanish titles (verify list), Wikipedia ES |
| Arabic | Wikipedia AR, translated OpenStax; needs RTL UI |
| Local languages | early reading (African Storybook, CC BY) and tutor chat; models are weakest here |

Each extra language is roughly 30-80 GB. A safety rules layer and test set must exist for a language before it is enabled for students (LabOS `docs/41`, `docs/49`).
