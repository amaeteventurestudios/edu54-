# Open Educational Resources — MIT, Harvard and Others

> Facts: `00-START-HERE.md`. Curriculum process: `14-CURRICULUM-SYSTEM.md`. Licensing: `31-LICENSING-OPEN-SOURCE.md`.

## Note on v1 of this pack

The v1 pack mentioned MIT only as **MIT Solve** (a social-impact challenge program Umanah may apply to, not software or content). It did not include any MIT or Harvard course material. This doc adds the university and open sources Umanah can build curriculum and the Knowledge Library from, with the license terms that decide how each can be used.

This is not legal advice. Check each item's license page at import time and record it in the item's metadata (`14`, `18`).

## Sources

### University course material

| Source | What | License (as published) | Best fit | Watch out for |
|---|---|---|---|---|
| **Harvard CS50** (CS50x, CS50P Python, CS50 AI) | lectures, notes, problem sets | **CC BY-NC-SA 4.0** | Python Foundations, AI Foundations, Build Lab exercises | NonCommercial; ShareAlike (our adaptations must use the same license) |
| **MIT OpenCourseWare** (for example the introductory Python course, intro CS, AI courses) | lecture notes, problem sets, videos | **CC BY-NC-SA** (most content) | Python and AI Foundations for older students; teacher background | some items are marked "all rights reserved" or third-party; exclude those. OCW says use is open to all "except for profit-making entities who charge a fee for access to educational materials" |
| **MIT RAISE — Day of AI** | free K–12 AI-literacy lessons | **verify** on dayofai.net before use | AI Foundations (responsible AI, how AI works), younger grades | license terms not confirmed yet |
| **MIT App Inventor** | block-based app building | Apache 2.0 (software) | later Build Lab for younger students | runs as a server; check offline self-hosting effort |
| **Scratch** (MIT Media Lab) | block coding | editor code is open source (BSD-style); "Scratch" name and cat are trademarks | later Build Lab for younger students | self-host the editor offline; don't brand our product with the Scratch name or cat |

### Open textbooks, simulations and libraries

| Source | What | License | Best fit | Watch out for |
|---|---|---|---|---|
| **OpenStax** (Rice University) | full textbooks: physics, chemistry, biology, math, more | mostly **CC BY 4.0** (verify per book) | Science & Engineering Foundations, Knowledge Library | "OpenStax" name and logos are trademarks |
| **PhET** (University of Colorado Boulder) | interactive science and math simulations, HTML5, run offline | **CC BY 4.0** for simulations published before 29 March 2026; newer simulations and PhET-iO have different terms | forces, energy, circuits, waves in Science & Engineering | keep the PhET logo visible and unaltered in sims; credit "PhET Interactive Simulations, University of Colorado Boulder"; no promotional use of the PhET brand without a license |
| **Kolibri library channels** (Learning Equality) | ready offline packages: Khan Academy, CK-12, PhET and many others | varies per channel (Khan Academy is CC BY-NC-SA) | fast, broad offline content for Explore and Learn | licenses vary per channel; record each |
| **Kiwix** (ZIM files) | offline Wikipedia, Wiktionary, Project Gutenberg, Stack Exchange and more | Wikipedia CC BY-SA; reader software GPL-3.0 | Explore / Knowledge Library on day one | ShareAlike on Wikipedia text; large files (full English Wikipedia with images is ~100 GB; "no images" and topic subsets are much smaller) |
| **NASA** | images, articles, educational material | most NASA media is not copyrighted in the US | space and science library | the NASA logo ("meatball") and insignia cannot be used without permission; use content, not logos |
| **Project Gutenberg** | public-domain books | public domain in the US | reading and history | "Project Gutenberg" name is a trademark; strip the header when redistributing per their rules |
| **Python documentation** | language reference and tutorial | PSF documentation license (verify) | Python reference in Explore | keep attribution |

### Software for delivering content

- **Kolibri** (Learning Equality): offline-first learning platform, MIT license, runs on a Raspberry Pi, syncs between devices, used in low-connectivity schools worldwide. Evaluate as a content source first and as the learning engine second (`10`).
- **Kiwix**: offline reader and server for ZIM files; a strong base for Explore.

## What NonCommercial and ShareAlike mean for Umanah

- **NonCommercial (CS50, MIT OCW, Khan Academy):** fine for Umanah Institute's nonprofit program when schools are not charged for the content. Not allowed in anything USG or any company sells. Every curriculum item carries a `noncommercial` flag, and a pack containing NC content can never be bundled into a paid commercial product.
- **ShareAlike (CS50, MIT OCW, Wikipedia):** lessons we adapt from them must be released under the same license. Keep ShareAlike-derived lessons in their own content pack so our original lessons can keep whatever license the Institute chooses.
- **Attribution:** every lesson built from a source shows a footer credit ("Adapted from Harvard CS50, CC BY-NC-SA 4.0") and the Open Source & Content Notices page lists all sources.

## Pedagogy to learn from (ideas, not code)

- **CS50's AI tutor** (the "CS50 Duck") has been publicly described as designed to guide students toward answers rather than hand them over. Study its published write-ups when refining `42`.
- **Kolibri's coach tools** for teachers in offline classrooms: groups, lesson assignment, quizzes, progress. Useful reference for the Teacher Center.

## First imports (for Python Foundations and AI Foundations)

1. CS50P (Python) — structure and exercises for loops, functions, lists; adapt into Umanah lesson schema, NC + SA pack.
2. OpenStax physics chapters on motion and energy + matching PhET sims — Science & Engineering starter pack.
3. Kiwix Wikipedia (no-images or school subset) — Explore starter library.
4. Day of AI units — after the license is confirmed.

Lesson 6 in the first vertical slice (`44`) is written originally by Umanah so the slice has no license dependencies.

## Sources checked

- CS50 license: https://cs50.harvard.edu/x/2024/license/
- MIT OCW terms: https://mitocw.zendesk.com/hc/en-us/articles/4414774353051
- PhET HTML5 licensing: https://phet.colorado.edu/en/licensing/html
- Day of AI: https://www.dayofai.net/
- Kolibri: https://learningequality.org/kolibri/about-kolibri/
