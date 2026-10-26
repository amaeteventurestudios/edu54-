# Founder review log

Decisions, open questions and known issues, grouped by date and area, in plain language. Newest date first. Written for batch review. "AI agent" means Claude (Claude Code) working on ai-node-01. Detail and evidence: `HANDOFF.md`, `docs/40-DECISION-LOG.md`, `docs/43`, `docs/53`.


## 2026-10-26: EDU54 cloned from Ashanti Labs (done by an AI agent, Claude, in a cloud session)
- **Decided (owner):** the brand marketed to African schools is **EDU54** (edu54.com), one word. Ashanti Labs stays as the owner's personal brand. The AI box is a separate product, Cortex, and is not part of this repo's change.
- **Done:** this repo is a copy of `ashanti-labs` main @ 79aec77. Only the name changed: Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com, the brand id `ashanti` → `edu54`, `ASHANTI_*` env vars → `EDU54_*`, file and folder names, the "A" monogram and favicon letter → "E". The website preview image and the ten website screenshots had the old name painted out and "EDU54" drawn in; nothing else in them changed. The apple-touch icon was re-rendered.
- **Decided (AI agent):** dated history (this log before today, `HANDOFF.md` before today, `CHANGELOG.md`, `docs/40-DECISION-LOG.md`, the conversation record) keeps the Ashanti name, because rewriting it would make the record untrue. The EDU54 brand docs in `docs/edu54/` carry a note that their server facts describe the Ashanti deployment.
- **Known:**
  - EDU54 is not deployed. No server, Cloudflare tunnel, DNS records or mailbox exist for edu54.com yet.
  - The legal pages name privacy@edu54.com, which does not exist yet. The legal entity name and address are still unknown (same as Ashanti).
  - Pre-existing test failures carried over unchanged from Ashanti (see HANDOFF.md, 2026-10-26).
- **Open:** deployment plan for EDU54 (servers, domain, email), to be done in its own thread.

## 2026-10-24: Ashanti repo and Discovery Lab deploy (done by an AI agent, Claude, in a cloud session)
- **Decided (owner):** Ashanti now lives in its own private repo, `amaeteventurestudios/ashanti-labs`, separate from the Umanah systems. The owner created the repo and added the server's read-only deploy key.
- **Decided (AI agent):** the new repo starts with one fresh commit instead of copying the umanah-ai-lab history, so none of the Umanah history moves into the Ashanti repo. The full history can be pushed later if wanted.
- **Done:**
  - Discovery Lab is deployed to ashantilabs.com, k12, uni and discover.ashantilabs.com.
  - Backups were taken first: the databases, the old site, the old app images, and the live uncommitted edits.
  - All live checks passed (see HANDOFF.md, 2026-10-24).
- **Known:** an unused "Explore the demo" side card (DemoViewsCard) existed only as an uncommitted live edit. It is not in the new code; it is kept in the server's git stash.
- **Open:**
  - PR #3 on umanah-ai-lab is still open. It can be closed, since Ashanti now deploys from its own repo.
  - The "Source code" links for the GPL tools are still to do.
  - The experiments still need a subject-teacher review.

## 2026-10-23 — Discovery Lab built, AI agent (Claude, cloud session)

- **Done:** Discovery Lab, the third environment, inside the same app at `/discover` in both K-12 and University. 13 labs, 14 working experiments (one or two per lab), 23 more listed honestly as "Planned", 3 journeys, search as you type with no AI, four depths (Explore, Learn, Experiment, Advanced), and an AI Guide that reads the experiment's numbers. Notes: `docs/discovery-lab/README.md`.
- **Done:** the website has a Discovery Lab card under the two editions, nav and footer links, and a page at `/discover/` with "Sign in with K-12" and "Sign in with University". A test fails if the site's lab names or counts stop matching the catalog.
- **Tested:** API 323 pass; browser 39 pass including 2 new Discovery tests; unit 20 pass. A student already signed in to K-12 opens Discovery Lab without signing in again; signed out, `/discover` shows the K-12 sign-in and then opens Discovery Lab. A worrying message to the AI Guide raised an alert to the counselor (Mrs. Otieno) in the local test.
- **Decided (AI agent):** sign-in. Discovery Lab uses the K-12 or University account and session instead of its own accounts, so safety alerts reach the student's own school. `discover.ashantilabs.com` is a public page that sends people to the right sign-in.
- **Decided (AI agent):** the "Discovery Lab" menu item is shown to Ashanti students and teaching staff. It is not in the K-2 (Discover band) menu, which only shows what young children use; the page still opens for them by link.
- **Decided (AI agent):** "Continue exploring" is remembered in the student's browser only, not on the server. Nothing about Discovery Lab use reaches a teacher or a grade.
- **Decided (AI agent):** the AI Guide cannot move the controls. The spec's "the Guide suggests an action, the student confirms" is not built; the Guide only says what to try.
- **Decided (AI agent):** the hero line "The online demo's AI tutor is not connected yet" was no longer true (the tutor was connected on 2026-10-22) and is replaced by a link to Discovery Lab. The live server copy of the homepage had its own uncommitted edit of that line; deploying this branch replaces it.
- **Owner action:** add `discover.ashantilabs.com → http://localhost:8310` to the Cloudflare tunnel "ashanti-labs". Until then the page works at `ashantilabs.com/discover/`.
- **Not deployed yet.** Deploy to Contabo only after the owner says so.
- **Open:** "Source code" links for our modified GPL tools (Snap!, Music Blocks, circuit simulator, molecule viewer) in K-12 and University: still to do. Revisit before the mini PC ships.
- **Open:** a subject teacher has not reviewed the 14 experiments; each page says so.
- **Known issue (not from this work):** 4 API tests fail on `ashanti-labs` before this branch too, because the "Built on Umanah Institute LabOS" credit puts "Umanah" in the Ashanti config the tests scan. 4 browser tests fail in this cloud container on both branches (the Python runtime files are not present here; a layout test).

## 2026-10-21 — Ashanti legal pages, AI agent (Claude, cloud session)

- **Done:** Privacy, Terms and Data protection pages for ashantilabs.com, linked in the footer. Footer now says "Built on Umanah Institute LabOS". Branch `ashanti-labs`; deploy to Contabo still to do. Detail: `docs/ashanti/ASHANTI-DECISIONS.md`.
- **Open:** create the mailbox `privacy@ashantilabs.com` on Verpex (or name another address). Name the legal entity and address behind Ashanti Labs. Get a Nigerian/Ghanaian lawyer to review the pages.
## 2026-09-27 — owner decisions applied by the AI agent (Claude), ai-node-01

- **Done (owner said yes):** USG Grid and Paperclip now listen only on Tailscale (100.127.44.118) and 127.0.0.1. The LAN address 192.168.4.41 no longer answers on 5280 or 3100. Both containers were recreated on the system Docker (nothing else was touched) and are healthy. Grid shows 4 of 4 nodes reachable, and https://grid.umanahsystems.com answers. Grid commit `d1eca08` (pushed). The Paperclip override is untracked by design; its backup is `docker-compose.override.yml.bak-20260927-tsonly`.
- **Decided (owner):** "Umanah" is pronounced oo-MAH-nah, as in the video. No change needed.
- **Decided (owner):** the owner will make the website repo `amaeteventurestudios/ui` private. Until then, the film can be found through that public repo. The film is live at https://umanah.org/ai-lab-film-95bc0e (checked: 200).
- **Done (owner said push):** the HUNGREE Goat canonical clone is updated to origin and its local work is pushed as `b0f89ce` and `9b2dc26`:
  - the Chromium no-sandbox switch. The Beelink image already set the variable, but the code never read it. The DJ tests passed (22/22).
  - the old YouTube OAuth handoff note, marked as a resolved, historical record
  - three reference images

  The repo is public; the note contains no secret values. `~/projects/hungreegoat` is fast-forwarded to match.
- **Done (owner request):** the film link is now https://umanah.org/ai-lab-film. The random suffix was only there so the address couldn't be guessed. The owner prefers the clean name. The old link was never shared (owner, 2026-09-27), so it was removed with no redirect. The page and video still carry noindex, and no menu or sitemap links to the page. Website commit `9fe43cc`. Checked live: page 200, video 206 (seeking works), preview image 200.
- **Done (owner request):** on ai.umanah.org, the sign-in page headline "A school-owned AI learning lab." now stays on one line at every desktop width checked live (1024, 1280, 1366, 1440 and 1920 px). The font scales with the window and the text box is wider. That panel only appears on screens 1024 px and wider, so phones never show this headline. Also fixed: on phones, "Just looking? Try the demo" no longer leaves "demo" alone on the last line. Playwright 33/33 passed. Commit `d98ac31`; the web container was redeployed. Screenshots: `docs/media/screens/login-headline/`.
- **Done (owner chose "Option A"):** new hero on umanah.org/ai-lab:
  - headline "AI in a box. / No internet. No subscription."
  - subline "We bring the computer. You bring a router and a power outlet."
  - the new lead paragraph

  The eyebrow, buttons and Prototype note are unchanged. The title tag still says "Umanah AI Lab | Local AI Infrastructure for Learning", and the meta description still fits, so neither was changed. On phones, "No internet." and "No subscription." each stay on one line, and the heading is slightly smaller on small screens so it fits. Website commit `8051477`. Checked live at 1440, 1366, 390 and 360 px: no sideways scrolling. Screenshots: `docs/media/screens/ai-lab-hero/`.
- **Possible conflict, for review:** the page now says "free of monthly or yearly fees". Two docs describe paid yearly support:
  - docs/51 costs support at about $3,125 per site per year and lists an "optional site support plan paid by the district or a local sponsor".
  - docs/36 has sponsors fund support (for example, $6,500 covers a lab plus its first year of support). That fits the new wording only while a sponsor covers support.

  Who pays yearly support is still an open owner decision. The owner chose this wording, so it shipped as written. If schools may ever be asked to pay for support, the sentence or docs/51 needs to change so the public page stays true.
- **Superseded:** the 2026-09-24/25 "Open" line about the canonical clone is resolved by the entry above.

## 2026-09-24/25 — entries by the AI agent (Claude), ai-node-01

### Infrastructure (ai-node-01)
- **Done:** the Grid showed ai-node-01 "Offline". The cause was a missing SSH host-key entry for the Tailscale address. Fixed by adding this host's own key (backup kept).
- **Done:** Docker now waits up to 60 s for Tailscale at boot (drop-in installed by the owner with sudo). It still starts if Tailscale never comes up.
- **Open:** the second reboot test hasn't been done (owner chose to wait for a natural reboot). The checklist is in HANDOFF.md.
- **Open:** `~/hungree-goat-src/hungreegoat-canonical` has uncommitted and unpushed local work. It was left untouched, and someone needs to decide whether to keep or merge it.
- **Known:** `usg-workforce` has no git remote, so its commits exist only on this machine.

### Platform
- **Decision:** the platform runs on rootless Docker, with its data on the data drive. The system Docker was not touched.
- **Decision:** on this box the web app is on port **8130**, not 8100, because HUNGREE Goat already uses 8100. The VPS nginx upstream was changed to match.
- **Decision:** each service has one port mapping on all interfaces (the box has no public interface), because rootless Docker rejects duplicate mappings.
- **Done:** all four optional profiles (content, LMS, code, admin) were started one at a time, passed their health checks, and were stopped again. Free RAM never went below 2.2 GB.
- **Open:** the Moodle image is the no-longer-updated Bitnami "legacy" build and needs a replacement before a pilot. Open WebUI, Kolibri and Kiwix still use "latest"/"main" tags and should be pinned.
- **Open:** no Kolibri content channels have been imported yet.

### Tutor and safety
- **Found and fixed:** under load, most tutor requests failed with "database is locked". At 10 students before the fix, 18 of 20 failed. After the fix there were 0 errors at 5, 10, 20 and 30 simulated students.
- **Done:** time to first word for one student is now about 0.8 s on this box. Before, the first question after idle took 75–115 s because of a cold model load. Models now stay loaded and warm up at start-up.
- **Known:** with 10 students asking at once, the median wait is about 23 s on this CPU-only dev box. That is far from the ≤3 s classroom target, and the real classroom hardware hasn't been measured.
- **Not tested:** answer quality under load, temperature and power, and the target hardware.
- **Open (release gate):** the safety rules were tuned against our own test sets. A fresh set written by a counselor is needed before any pilot. The first held-out round scored 25% before the triage layer existed.

### Accounts and data
- **Done:** demo passwords were reset on the running database. The credentials file is readable by the owner, and `umanah-lab demo-reset` repeats the reset. Sign-in for jordan (student) and mswilliams (teacher) was verified through https://ai.umanah.org.
- **Decision:** schema changes now go through database migrations (Alembic). The existing database was marked as the baseline without changing any data, and a backup was taken first.

### Lab Status
- **Done:** teachers and admins see each engine as ready, off or unavailable, in Umanah's own wording. Students don't see engines.
- **Known:** the engine connections are stubs that say "not connected". Courses, content search and notebooks are not wired in yet.

## 2026-09-25

### Reboot test (second reboot, 2026-09-25 12:10 PDT, done by the AI agent after the box was rebooted for another project)
- **Passed:** both USB drives mounted (AI_NODE_DATA at `/srv/ai-node/storage/data`, REYDIOUS_DATA at `/srv/ai-node/storage/reydious`; contents not touched). HUNGREE Goat's four user services are running and the audio engine has files open under `/srv/ai-node/storage/data/music`. Both Docker daemons are up. `usg-grid` and `paperclip` listen on the Tailscale address, the LAN address and loopback. The Docker drop-in waited about 2 s for Tailscale (12:10:21 to 12:10:23) and `wait-tailscale.log` shows the recovery script found Tailscale immediately and changed nothing. `ai.umanah.org` serves the app (not the resting page) and `/api/docs` is 404.
- **Done:** `umanah-lab status`: core (web, api, model) and the encyclopedia were already running, so nothing needed starting.
- **Not fully verified:** the Grid node card itself needs a Grid sign-in, which the AI agent doesn't have. The collector that feeds the card reports all 3 volumes (system disk, AI_NODE_DATA, REYDIOUS_DATA). Someone should glance at the card.

### Match the reference screens (part B), done by the AI agent
- **Done:** all eleven reference screens now have side-by-side captures at 1440x900 and 1366x768 in `docs/media/screens/B/`. Home, Learn, Lesson, Homework, Explore, Ask, Revision, Build, Progress and Teacher are close to the references. The Revision page and the navy-sidebar Ask layout exist.
- **Known differences (deliberate):** the sidebar has a Revision item, because docs/05 says so; Explore's School Library, Teacher Resources and Local Documents say "Coming soon" because those libraries don't exist yet; the reference's sample numbers (58%, Fractions Practice) are sample data, ours come from the database.
- **Fixed:** Explore now opens the first result in the reader instead of an empty pane, and search results no longer repeat the title at the start of the snippet.
- **Fixed (accessibility scan found it):** low-contrast text in the Build output box, the Ask search placeholder and unearned badges on Progress. The accessibility scan (axe, WCAG A and AA) now passes on every main screen for student, teacher and admin.
- **Fixed:** two new browser tests were wrong or failing (a name that changed in the sample data); test results are no longer tracked in Git.
- **Tests:** API 156 passed; browser tests 33 passed. Facts eval from the earlier commit: 45 of 47. The 24 accuracy questions added to `accuracy.jsonl` were not re-run against the real model in this session.

### Priority
- **Decision (owner instruction):** the goal is now a polished fundraising demo. Phases 6 to 9 (Mac mini, remote management, pilot readiness, pilots) are on hold until funded. Recorded in docs/39 and docs/40.

### Bugs (part A), done by the AI agent
- **Fixed:** after signing in, students and teachers could land on "We couldn't find that page". Cause: sign-out sent people to a `/login` address that no page matched. Now every role lands on its own home (student Home, teacher Teacher Center, admin Overview) and unknown addresses go to that home. Tested for all three roles in the browser.
- **Fixed:** the assignment tab bar was cut off (a fixed height from the component library). Checked the other tab bar (Learn).
- **Fixed:** Settings text about "your school sets the tutor's rules" now shows for students only; teachers and admins get their own wording.
- **Fixed:** 207 leftover load-test chats were removed from the demo database (a backup was taken first) and 26 realistic sample chats were added. Load tests now refuse to run against the demo database.
- **Done:** internal plan names ("Phase 3/4") no longer appear in the app. Explore now searches the offline encyclopedia (Simple English Wikipedia, CC BY-SA). School Library, Teacher Resources and Local Documents say "Coming soon".
- **Open:** the admin Overview is a first version (counts only); the rest of the admin area is part E.
- **Known:** Explore's encyclopedia is the small "mini" edition (text and a few images). Article images may be missing.

### Video and lessons (part I), done by the AI agent
- **Done:** a 101-second sponsor video of the Lesson 6 story was recorded (`docs/media/lesson6-story.mp4`, 3.8 MB): student signs in, reads the lesson, asks the tutor, runs Python in the browser, does homework (tutor gives hints only), teacher grades, student sees the result and Progress. It used the real tutor model and scratch data, not the demo database. The screen recorder needed a workaround on this Ubuntu version (a link to the system ffmpeg in `~/.cache/ms-playwright`).
- **Open:** the video is not on any public page yet. Adding it to `umanah.org/ai-lab` or the demo's "resting" page changes the public site, so it is left for a decision. The VPS nginx resting page is outside this machine.
- **Done:** AI Foundations lesson 2, "Data and patterns" (three checked questions, a runnable example, average and pattern examples; outputs verified by hand). It is live in the demo. Lessons with full content now: Python 1-7 (as listed in the catalog), AI Foundations 1-2. Other catalog lessons are outlines that show as not yet available.
- **Open:** the lesson wording has not been reviewed by a teacher. The safety, accuracy and jailbreak evals were not re-run after adding lessons and the 24 new accuracy questions.

### Follow-up round (2026-09-25 evening), done by the AI agent
- **Done:** `ops/CLAUDE-CODE-CONTEXT-MONITOR.md` now exists and CLAUDE.md startup step 0 requires the monitor. **Open:** the file holds the spec as recorded in CLAUDE.md; the AI agent no longer has the original Prompt 1 text, so it cannot prove the wording is identical. Paste the original over it if it differs. "claude-joshy" is one of the owner's Claude launchers (`~/.local/bin/claude-joshy` sets `CLAUDE_CONFIG_DIR=~/.claude-joshy`); the status-line and hook scripts are shared and read/write `~/.claude/context-monitor/`, so every launcher uses the same real context readings.
- **Done:** model. This session runs Sonnet 5. `~/.claude/settings.json` said `sonnet` and now says `opus`; `~/.claude-joshy/settings.json` already said `opus`; the repo has a committed `.claude/settings.json` with `opus`. The model of an already-running session can't be changed from inside it.
- **Open (needs owner OK, system Docker):** usg-grid and paperclip still listen on the LAN address as well as Tailscale and 127.0.0.1. The LAN binding was added on 2026-09-24 only so devices without Tailscale could open them; there is no hard reason. The compose files are edited to Tailscale + 127.0.0.1 only (not applied, not committed). Applying means recreating both containers on the system Docker.
- **Done:** evals re-run. Full run: jailbreak 0 leaks in 140; safety 191/191 high-severity routed, 0/110 educational blocked; facts 46/47 and accuracy 52/56 in the last full run, where all 5 misses were "tutor unavailable" (the model was starved while other work ran) and all 5 passed when re-run alone. Earlier full runs before fixes: facts 45/47, accuracy 50/56 (89.3%). The two facts misses in the old record: "exact temperature next Tuesday" (honest refusal that the check did not recognise) and "how many stars in the universe" (the output safety screen replaced a fine answer with a stock line). The Moon question ("Earth widths away") passes: 30.2. Fixes: the stock line now reads plainly ("I couldn't give a good answer to that one. Try asking it a different way, or ask your teacher."); an empty model reply is never stored, and the eval now shows errors instead of a blank; questions written as `colors[2]` now find the list-indexing section; three answer checks were too strict (curly apostrophes, "haven't studied", a correct dictionary definition). **Not changed:** the safety screen itself (a child-safety decision for the owner). The 24 new accuracy questions are included.
- **Done:** outline-only lessons say "Coming soon" and are not clickable (Learn cards; teacher Curriculum).
- **Done:** sponsor video, `docs/media/sponsor-video.mp4` (2:04): the problem, the box, student Ask/Learn/Build, homework hints, the teacher, safety, the ask of about $100,000. Real app footage and the real tutor; no model names, no third-party names, no numbers other than the ask. Not on any public page. The "$100,000" figure comes from the owner's instruction.
- **Done:** evidence screenshots in `docs/media/screens/review/` at 1366x768.
- **Done:** website. AI Lab is in the desktop nav, mobile menu and footer of all 8 pages (four pages had no nav links at all). The pilot form sent one TEST message to the form service (accepted, status 200). The forms used to show "thank you" even when sending failed; now they say it failed. `/ai-lab` has no model names, no SSH details and no numbers except "Prototype #001". Mini is "a compact appliance".
- **Done:** admin sign-in on the public site. Chosen: password sign-in for the school owner's account only, on ai.umanah.org (not LAN-only), 20 tries per address per hour, locked 15 minutes after 5 failures, every attempt in the Audit Log. Students and teachers still cannot use passwords there. Trade-off: anyone can lock the admin out for 15 minutes by typing 5 wrong passwords; `umanah-lab demo-reset` clears lockouts. The password is unchanged by the nightly reset and by `demo-reset` (only `--rotate-admin` changes it). It lives only in `demo-credentials.txt` (mode 600). There is no "Try as admin".
- **Done:** the nightly reset was not real before (copies only expired 24 hours after use). It now runs daily at 10:00 UTC (03:00 Pacific summer time) and the docs say so. Limits: 20 tutor questions per visitor per hour, 80 per address, 12 new demo copies per address per hour.
- **Done:** sign-in page card 2 is "AI in a box." with a box icon; the three cards balance their lines at 1366x768.
- **Done:** mobile pass, see `docs/media/screens/mobile/README.md`.
- **Not done:** dark mode does not exist (the reference images show a moon icon; the app has no dark theme). Screenshot of the user menu is in the evidence folder.

## 2026-09-26

### Sponsor video: voiceover, music, stronger captions (done by the AI agent)
- **Done:** `docs/media/sponsor-video.mp4` (2:32, not published, not in Git) now has a spoken voiceover of every caption and a music bed under it. Rebuild with the three steps at the top of `apps/web/e2e/sponsor.mjs`; the voice lines live in `tools/sponsor-video/narration.json`.
- **Voice:** generated on this machine by Kokoro (open model, Apache-2.0 licence), voice "af_heart" (American English, female). Nothing was sent to an online service. Model files are in `~/.cache/umanah-tts/`.
- **Open, please check:** the voice said "Umanah" as "YOO-man-uh", so it is set to say "oo-MAH-nah". The AI agent does not know the correct pronunciation; if it is wrong, give the right one and it is a one-line change in `narration.json`.
- **Music:** composed by code in `tools/sponsor-video/mix.py` (a slow C–G–Am–F pad with bass and a soft arpeggio), so there is no third-party licence. It gets quieter while the voice speaks and fades in and out. Loudness -16 LUFS, peak -1.1 dB.
- **Captions:** now a solid dark navy box (no see-through), bold larger white text and a gold outline; the title cards are solid navy instead of 90% see-through.
- **Found and fixed:** the browser recorder drops frames while the tutor model works, so the picture drifted up to 2.4 s behind the script's clock. The mixer now finds when each caption actually appears on screen and starts that line there. Checked: every line finishes before the next caption appears.
- **Not changed:** the words, scenes and the "$100,000" figure are the same as before. The video is 28 s longer because each caption now stays up until its line has been spoken, and the recording waits for the tutor. About 33 s after "Ask" is music only while the tutor answers on screen.
- **Noticed, not fixed:** in the Safety Contacts scene the contact list looks empty on screen (it may still be loading when the shot is taken). The earlier version was recorded the same way.
- The previous silent version is kept at the AI agent's scratch folder only; say if you want it saved in the repo's media folder.
- **Owner feedback (2026-09-26):** the owner watched v2 and said "I love it." Pronunciation of "Umanah" and publishing are still open.

### Sponsor video: private share link (done by the AI agent)
- **Owner decisions:** "Umanah" pronounced oo-MAH-nah is right. The Safety Contacts scene stays as it is. The video is private: a link we share, not shown on the website.
- **Done:** unlisted page https://umanah.org/ai-lab-film-95bc0e (forwards to www.umanah.org). No page, menu or sitemap links to it; the page and the video file both send "noindex, nofollow, noarchive" to search engines. Website repo commit `786ea5c`. Checked live: page 200, video 200 with seeking support, headers present. Layout checked at 1440x900, 1366x768 and phone width. Playback not tested in a browser here (the test browser has no H.264); the same file already played on the owner's Mac.
- **Open, owner decision:** the website's GitHub repo `amaeteventurestudios/ui` is **public**, so anyone browsing it can find the video file and the page address. "Unlisted" means hidden from the site and search, not secret. Options: (a) accept that; (b) make the GitHub repo private (the site keeps deploying if the Vercel GitHub connection allows private repos); (c) remove the file from the repo and its history and host it elsewhere. The AI agent did not rewrite the public repo's history without asking.
- The temporary Tailscale viewing server (port 8199) was stopped.
- **Done (owner request):** link preview for the film page. 1200x630 card (`media/ai-lab-film-95bc0e-og.jpg`: title, "One box at school serves the whole class, even with the internet unplugged.", "Watch the film · 2:32", Teacher Center screen from the film), title "Umanah AI Lab — Watch the film" and a description, as Open Graph and Twitter tags. Still noindex, nofollow, noarchive (page tag and headers). Website commit `5a4686c`, checked live. Not tested inside iMessage/WhatsApp/LinkedIn themselves; those apps cache previews, so a link pasted before this change may show the old plain preview.

## 2026-09-29

### Samsung T7 2 TB SSD on ai-node-01 (done by the AI agent, wipe run by the owner)
- **Done:** the owner copied the files off and confirmed the wipe. The AI agent wrote `ops/scripts/format-samsung-t7.sh`, which only accepts that one drive (checked by serial) and makes you type the serial. The owner ran it with sudo.
- **Result, checked:** GPT + ext4, label `AI_NODE_SSD`, UUID `2c8a4137-c5f8-4fd7-8e96-e7b4e2a1ee94`, mounted at `/srv/ai-node/storage/ssd` (1.8T free), connects at boot (fstab, `nofail`; old fstab backed up to `/etc/fstab.bak-20260929T145137`). Write test passed.
- **Mistake, fixed:** the first run stopped before mounting because the script checked fstab before creating the mount folder. The owner finished it with one extra command, and the script's order is now fixed. The fixed version has not been re-run.
- **Folders created:** coretech-media, umanah-ai-lab, periodic-engine, periodic-empire, jolofe, deeptechly.
- **Owner decisions:** Reydious will be built on the DGX Spark next to Dadle, not on this Beelink. The paid university AI lab has no name yet, so it has no folder yet.
- **Harmless warning:** parted said the partition "is not properly aligned". The T7 reports an odd optimal I/O size; the partition starts at the standard 1 MiB mark.
- **Open:** moving Umanah AI Lab onto the SSD is a separate job. It has not been planned or started.

### Umanah AI Lab moved onto the Samsung SSD (done by the AI agent, owner said "Yes")
- **Done:** all Umanah AI Lab data (6 GB: database, tutor models, offline encyclopedia, settings, secrets) now lives at `/srv/ai-node/storage/ssd/umanah-ai-lab`. It was copied while the site ran, then the site paused for about 2.5 minutes for a final copy of changes and a restart on the SSD. Files kept their original owners (copied from inside the Docker user namespace).
- **Code:** every default path (compose file, `umanah-lab` tools, engine agent, API dev default, load test) now points at the SSD. The running containers were not rebuilt.
- **Tested for real on https://ai.umanah.org:** home page 200; "Try as a student" sign-in 200; a tutor question answered (63 words, first word after 3.7 s); the new visitor copy was written on the SSD; offline encyclopedia answers; Admin engine agent running.
- **Old copy kept:** `/srv/ai-node/storage/data/umanah-ai-lab.pre-ssd-20260929` (renamed so nothing can quietly keep using it). To undo: stop the core, rename it back, and start with `UMANAH_ROOT` set to the old path. **Open, owner decision:** say when it can be deleted.
- **Correction:** this entry first said the rootless Docker data-root was shared with HUNGREE Goat. That was wrong: HUNGREE Goat runs on the system Docker on the main disk, and only Umanah AI Lab uses the rootless one. It was moved too (next entry).
- **Not tested:** Moodle, Kolibri, JupyterHub and Open WebUI were stopped before and after the move; they read the same folder and should start from the SSD, but were not started to check.
- **Known risk, not fixed (same as before the move):** the drive is set to `nofail`, so if the SSD is slow to appear at boot, Docker could start the lab before it is mounted and create empty folders on the main disk. The SanDisk setup had the same risk. It has not been reboot-tested. Suggested fix: make the lab's start wait until the SSD is mounted.
- **Owner decision (2026-09-29):** the paid university AI lab is named **Ashanti Labs**; folder `/srv/ai-node/storage/ssd/ashanti-labs` created (empty).

### Umanah AI Lab's Docker folder moved to the SSD; the thumb drive is HUNGREE Goat's only (done by the AI agent)
- **Owner decision:** the SanDisk thumb drive belongs to HUNGREE Goat only. Leave all HUNGREE Goat folders there so it has room for more music and videos.
- **Done:** the rootless Docker data-root (25 GB: Umanah AI Lab's images and containers) now lives at `/srv/ai-node/storage/ssd/docker`. `~/.config/docker/daemon.json` was changed (backup `daemon.json.bak-20260929`). It was copied while the site ran, then the lab stopped for 46 s for the final copy and switch. The tutor models then took about 2 minutes to load, and during that time the tutor answered "not available right now".
- **Found and fixed:** the first copy method could not set the group on files (39,169 errors). A second pass inside Docker's own user namespace finished with 0 errors.
- **Restart risk fixed (not reboot-tested):** a new drop-in, `~/.config/systemd/user/docker.service.d/wait-for-ssd.conf`, makes the lab's Docker wait up to 3 minutes for the SSD before it starts.
- **Tested for real on https://ai.umanah.org after the switch:** home 200, student sign-in 200, the tutor answered (84 words, first word after 3.1 s), and the offline encyclopedia works. HUNGREE Goat control stayed active the whole time.
- **Old copy kept:** `/srv/ai-node/storage/data/docker.pre-ssd-20260929`. **Open, owner decision:** OK to delete both `.pre-ssd` folders, which frees about 31 GB on the thumb drive for HUNGREE Goat.

### K-12 learning content and coding games (done by the AI agent, owner said "let's add them all")
- **Inventory before (2026-09-28):** only Simple English Wikipedia (text only) and 7 of our own lessons. Kolibri and Moodle were installed but empty. None of the MIT/Harvard/K-8 material had been downloaded; it was only planned in `docs/47`.
- **Licenses checked (2026-09-29, from each project's repository):** Blockly Games Apache 2.0; Snap! AGPL 3.0; Music Blocks AGPL 3.0; Reeborg's World CC BY-SA 4.0. All fine for the free lab. AGPL means that if we change their code, we must publish our changes; we use them unchanged except for pointing their few internet links at local copies (listed below).
- **Coding games, live on Build > Coding Challenges:** Block Puzzles (Blockly Games, 8 games), Block Coding Studio (Snap! 12.2.0), Music Coding (Music Blocks 3.8.0), Robot Python Puzzles (Reeborg's World). Stored at `<SSD>/umanah-ai-lab/apps/games`, served at `/play/` with a policy that stops them reaching the internet. Tested in a real browser with the internet blocked: Maze ran a program, Pond loaded and ran, Snap! opened, Music Blocks finished loading (about 20 s on first open), Reeborg ran Python (`move()`) in the "Alone" world. Checked live on https://ai.umanah.org as a demo student.
- **Local changes to the games (kept next to the originals as `.orig`):** Reeborg: Brython loaded from a local copy, the TogetherJS collaboration script removed, Blockly images/sounds local, and `build/reeborg.js` built with browserify (the repo does not ship it). Music Blocks: highlight.js, jQuery UI theme and libgif pointed at local copies. Blockly Games: the 8 English games come from the Kolibri "Blockly Games" channel; Maze's character pictures point at local files. Snap! unchanged (its cloud and analytics calls are simply blocked).
- **Names in the student UI:** the cards use our own names (Block Puzzles, etc.) and show each project's credit line ("Snap! by UC Berkeley, AGPL 3.0"), because the licenses require credit. The games show their own names inside their own screens. **Open, owner check:** is that OK under the "no third-party names in the student UI" rule, or should credits move to the Notices page only?
- **Offline library (Explore), 25 collections, ~40 GB, downloading:** Wikipedia science/math/geography/history/astronomy collections and "most-read articles" (with pictures), Vikidia (encyclopedia for young readers), LibreTexts textbooks (biology, chemistry, physics, math, statistics, geoscience, social science, humanities, K-12), Wikibooks, Wikiversity, Simple Wiktionary, Internet Encyclopedia of Philosophy, Gardenology, Art of Problem Solving, freeCodeCamp, TED agriculture talks. Every file is checked against the publisher's SHA-256 before use.
- **Explore now searches the whole library** and labels each result with its source and license. Encyclopedias for young readers come first, and results take turns between books so one big textbook cannot fill the page. Kiwix memory raised from 256 MB to 1 GB (searches across 14+ books took 5-20 s at 256 MB).
- **Known issue:** while the big downloads run, the SSD is about 95% busy and a new Explore search can take 10-25 s (measured). Before the downloads, the same searches took under 1 s for the encyclopedias and 2-8 s for the whole library. To re-measure after the downloads finish.
- **Decision:** TED talks are kept out of the student library (talks are for general audiences, not screened for children). Teacher access is a later step.
- **Kolibri channels, downloading (~130 GB):** Khan Academy (English, US curriculum, 68 GB), African Storybook, Global Digital Library, PhET simulations (done), MIT BLOSSOMS, Blockly Games (done).
- **Changed from the plan:** CK-12 and OpenStax are no longer in the offline catalogs (Kolibri and Kiwix, checked 2026-09-29), so Khan Academy and LibreTexts take their place.
- **School Library (Explore > School Library), done:** students and teachers browse the Kolibri channels by channel and folder inside Umanah; Kolibri's own screens are never shown. Videos play (lowest resolution, English captions when the channel has them), picture books open in a page-by-page reader, PDFs open in the browser's viewer, and simulations run in a sandboxed frame that cannot reach Umanah's cookies or the internet (files come from a signed link that lasts 6 hours). Teacher guides ("coach content") are hidden from students. Tested with a real browser on a scratch server against the real library: PhET "Color Vision" ran, an African Storybook book ("A very tall man") turned pages, no request left the machine, axe accessibility scan clean. Tests: API 170/170, browser 35/35.
- **Not done yet:** Khan Academy's practice exercises need Kolibri's own exercise player, so they show "Practice sets are coming soon" for now; Khan videos and articles will play once the download finishes. There is no search across the School Library yet (Kolibri's search index returned nothing on this version); browsing works. Kolibri's port 8111 is on the LAN, as `docs/53` specifies.
- **Agriculture:** only Gardenology and TED agriculture talks. There is no school farming course in the free offline catalogs; a gap to write or source later.
- **Licenses to note for anything paid (Ashanti Labs):** Khan Academy and MIT BLOSSOMS are NonCommercial (CC BY-NC-SA); many LibreTexts pages are NonCommercial too. They are fine here because the lab is free. They must not be copied into a paid product.
- **Update (2026-09-29, late evening):** all 25 library collections downloaded, passed their SHA-256 checks and are in Explore (38 GB). Kolibri: PhET, African Storybook (5,165 books), MIT BLOSSOMS and Blockly Games are complete. Khan Academy's first import failed ("Must import a channel before importing content"); the channel import worked on a second try and its 68 GB content download restarted at 23:22. The Global Digital Library stopped partway on one file whose checksum did not match (Kolibri refused it, as it should); it is queued to retry after Khan Academy.
- **Known issue, measured:** with 25 collections and the Khan Academy download reading and writing the SSD, a whole-library search took 8-140 s (median about 24 s) and single-book searches 0.05-17 s. Explore gives up on the whole-library part after 12 s and still shows the encyclopedia results. To re-measure when the downloads end; if whole-library search is still slow, the fix is to search a short list of books one at a time instead of all 25 at once.

## 2026-09-30

### K-12 grade bands, first slice (done by the AI agent; owner said "Go" to the spec in the Ashanti Labs thread)
- **Grade comes from enrollment:** new `users.grade` (0 = Kindergarten .. 12, migration 0005). Admins set it on People; teachers set it with Edit on the Students list (a Grade column was added); new students take their class's usual grade. Students cannot change it (tested: 403). The demo school's students are Grade 7.
- **Four bands from the grade:** K-2 Discover (Early Years), 3-5 Explore (Elementary), 6-8 Build (Middle School), 9-12 Launch (High School). A student with no grade set sees today's middle-school screens.
- **Sidebar:** a learner badge under the logo ("GRADE 7 / Middle School"). Items are Home, Ask, Learn, Build, Explore, Progress. Revision left the sidebar and became the **Practice** tab inside Learn (old `/revision` links open it). Lab Status is in the sidebar for staff only; students find it in Settings. K-2 students get four big picture buttons instead (Read, Play, Ask, My Stars), read aloud on hover.
- **Student Home, grades 3-12:** grade line, level line, Your Learning Path (steps and one progress bar), the five verb cards with the new subtitles, a 2x2 grid (Continue Learning, Assignments, Recommended for Grade N, Continue Your Project), Your Skills chips. The System Status card shows only for grades 9-12; younger students see one "Local AI: Ready" line. Grades 9-12 add Portfolio (saved projects) and College and Career Pathways (links into Explore).
- **Honesty notes on Home:** the learning path's progress is measured only where we have real data: a step tied to a course uses that course's progress, "First Project" counts saved projects, and steps we cannot measure yet (Data, Block Coding, Digital Citizenship) show as not started. "Recommended" points at real content on the box. The spec's "15 min" lesson length was left out because lessons have no measured length.
- **K-2 Home:** "Hello, Ava!", four big picture tiles with speaker buttons, "Read to me", and a star count (XP / 100). Read opens picture books and learning games; Play opens only the K-2 games (Block Puzzles, Music Coding). Read-aloud uses the browser's own voice; it was not tested with sound (the test browser has no audio). **Open:** it needs a device with a speech voice installed; most school Chromebooks and Windows PCs have one.
- **Band filtering:** Learn shows only the band's courses (Python for 6-12, AI Foundations and Science for 3-12, none for K-2). Build lists only the band's games. The School Library shows band shelves (storybooks for K-5, BLOSSOMS for 6-12, etc.). Staff see everything. **Not done:** "teachers can widen it per student" needs a per-student setting; not built yet.
- **Teacher side:** "View as Student" (K-2 / 3-5 / 6-8 / 9-12 tabs) shows the student Home for each band with sample data and links turned off. Each student's name on the Students list opens a student view: progress, strengths and struggles (from practice answers, at least two answers per topic), assignment history, and a suggested next step (a rule, not AI: weakest topic first, then overdue work, else a stretch challenge).
- **Not done yet from the spec:** School → Grade → Class → Student grouping (grade is shown and editable; no grade-level grouping page yet); new designs for Login (1), Practice (6) and Project workspace (9); translation files (new band words are collected in `apps/web/src/lib/bands.ts` for now; the app has no translation system yet); the tutor still takes its reading level from the class's age band, not the student's grade (changing that touches child-safety behavior, so left as it is and flagged here).
- **Tests:** API 181/181 (11 new grade tests); browser 38/38 (3 new K-12 tests; one older test, the Loop Master badge check, timed out once while the machine was busy and passed on the re-run and on its own); axe scans clean on the new screens; phone width checked, no sideways scroll.

### Downloads finished; Explore search made fast (done by the AI agent)
- **Khan Academy:** 26,889 of 27,701 items are on the box (17,943 of 18,629 videos, 8,946 of 9,072 practice sets), 97%. The rest could not be downloaded: the publisher's server returned "not found" for 18 batches and files with wrong checksums for 12 (Kolibri refuses those, as it should). Imported one sub-topic at a time so one bad file only stops its own sub-topic. The School Library now holds 103 GB; the SSD has 1.6 TB free.
- **Global Digital Library:** stopped at 2,494 of 6,665 books (bad upstream files) and left paused: its books are H5P, which the School Library cannot show yet.
- **Search speed, measured with the drive idle:** the old whole-library full-text search still took 7.6-21.5 s. Explore now looks up article titles in each book (the library's title index), young readers' encyclopedias first, with a 1.5 s limit per book and 3 s overall, and only falls back to full-text search when titles find fewer than four articles. Ten fresh searches through Umanah: median 1.5 s, slowest 3.2 s, each with 12 results (for example "volcano" → Vikidia's Volcano first). Results no longer show a text snippet when they come from a title match.
- **Live check, same day (after deploy):** on https://ai.umanah.org the same kind of search took 4-18 s. Cause, measured: the Beelink is short of memory. 12 GB total, 2.9 GB of swap in use, the kernel's swapper busy, and the SSD 98% busy reading because the library's index pages keep being pushed out of memory. Besides Umanah (the tutor model alone holds 4.4 GB), the same Docker now also runs Ashanti Labs (4 containers plus its own Kiwix) and CoreTech Media (6 containers), started by other threads. The AI agent did not stop anyone else's services. **Open, owner decision:** keep all of these running on one 12 GB Beelink (Explore stays slow at busy times), or stop the ones not in use, or add RAM. The code change itself is measured at median 1.5 s when memory is free.
- **Owner decision (2026-09-30):** "Yes, stop them". The AI agent stopped (did not remove) the 13 Ashanti Labs and CoreTech Media containers on ai-node-01; `docker --context ai-data start <name>` brings any of them back. Free memory afterwards: about 3.3 GB available (the tutor and safety models hold about 5.3 GB). Live search on https://ai.umanah.org after the stop: 3.4-4.5 s for the search request itself (five fresh words), 5-6 s including loading the page, down from 4-18 s before.

### "Coming soon" removed from Build (done by the AI agent; owner asked why these were not built, 2026-09-30)
- **Why they were "Coming soon":** the 2026-09-25 priority reset built a polished demo first and left these for later phases; the AI agent had not gone back to them after the K-12 switch. That was a miss.
- **Explore Featured was broken** ("isn't available right now") by the search change: it still used the slow full-text search and timed out. Fixed to use the title index; all four Featured shelves fill again (live).
- **Build, all six categories open now:** Science Experiments (12 experiments on PhET simulations, K-12, each with question, steps and what to record), Engineering Projects (6 design challenges with goal, limits, test and improve), Robotics (6 robot missions: Blockly Maze for K-5, then Reeborg's World worlds that open directly, checked in a browser), AI Projects (5 small Python AI programs: nearest-neighbour fruit sorter, spam filter, temperature prediction, rule-based chatbot, pictures as numbers; each runs in Python Lab, checked). Science and engineering open a **project workspace**: brief on the left, simulation on the right, notes saved to the student's projects. Each list shows only the student's band. Content written by the AI agent in `content/build/`.
- **Honest labels:** Robotics is an on-screen robot, not physical robots.
- **Tests:** API 186/186, browser 39/39.

### K-12 curriculum for every grade (done by the AI agent)
- **Map:** `content/curriculum/k12.json` gives every grade, Kindergarten to Grade 12, its courses from the course libraries on the box: Khan Academy math for every grade (K-8 by grade; then Algebra 1, Geometry, Algebra 2, Precalculus, AP Calculus AB and Statistics), reading (African Storybook levels 1-5, Khan reading and vocabulary for grades 2-3), grammar (4-8), science (PhET simulations by school level; Khan middle-school physics, biology, Earth and space; high-school biology, chemistry, physics, AP Biology), history and civics (world history, US history, US government), economics, internet safety (3-8), financial literacy, personal finance, college admissions and careers, and MIT BLOSSOMS video lessons for 9-12. 60 course entries; every folder checked to exist and have content on the device.
- **Learn** now opens with "Your Grade N courses" (cards into the School Library), then Umanah's own courses for the band. K-2 Learn has Picture books, Numbers and Learning games.
- **Teacher Curriculum** now starts with "K-12 by grade" (all 13 grades, expandable), then Umanah's courses.
- **Still open:** Khan Academy practice exercises (8,946 on the box) need an exercise player; they still say "Practice sets are coming soon" inside the School Library. Progress on School Library videos is not tracked yet. The 19 unwritten lessons in Umanah's own three courses are still "Coming soon".
- **Tests:** API 187/187, browser 39/39.

### Teacher Resources and Local Documents (done by the AI agent)
- **Local Documents:** teachers and admins add PDFs, pictures, text files and EPUB books (up to 25 MB) on Resources; each is shared with students or kept staff-only. Files are stored on the device next to the database (`<data>/documents/`) and never leave it. Students read them in Explore > Local Documents (PDF, picture, text and book viewers). The upload is checked (allowed types only; a "PDF" must really be a PDF). **Turned off on the public demo** so ai.umanah.org cannot become a place to host files; the demo school has two sample documents from Ms. Williams instead (a loops cheat sheet and class rules).
- **Teacher Resources:** Explore > Teacher Resources (staff only; students do not see the shelf) and the teacher Resources page list teacher guides already on the box: Khan for Educators, Khan's AI for education, art-history guides for teachers, PhET simulation teacher guides (coach guides are hidden from students), and MIT BLOSSOMS lessons with teacher notes.
- Explore and the teacher sidebar no longer show "Coming soon" for these. **Tests:** API 190/190, browser 40/40.

### Teacher Assignments, Assessments and Practice (done by the AI agent)
- **Found:** teachers could not create assignments at all; the only ones were the four seeded ones. Fixed.
- **New assignment / New assessment:** a builder with short-answer, number and multiple-choice questions, answer keys, extra accepted answers, a due date, the class, and (homework only) a hint ladder and the tutor help level. Answer keys are stored only on the server; students and the tutor never receive them (tested). **Assessments always switch tutor help off** in code: checking answers and hints are refused by the server, and the student page says "hints and checking are off". Every assignment list shows submitted / marked counts and each submission to mark; marking uses the existing review screen with a suggested score.
- **Practice (teacher):** the class's weak topics from practice and sprint answers, weakest first, with who needs help (under 50% with at least two answers), linked to each student's page. It shows topics and names only, never chat text.
- Sidebar: Practice and Assessments are live (no "Soon"). Multiple-choice questions now work for students too (migration 0007).
- **Tests:** API 194/194, browser 41/41.

### AI Lesson Builder (done by the AI agent)
- **What it does:** a teacher gives a topic, a grade and optional notes; the tutor model on the box drafts a lesson (title, objective, 3-4 sections, 3 multiple-choice checks with explanations). The teacher edits every part, then saves a draft or publishes. Published lessons appear for students in Learn under **From Your Teachers**, with the same lesson page, checks, progress and +50 XP as Umanah's lessons. "Hide from students" unpublishes. Teachers can also write a lesson by hand with the same editor.
- **Safety:** students never see a draft (tested). Every word is checked by the safety rules before publishing; a lesson with unsafe text cannot be published (tested). The page warns "Check every fact and every right answer. The AI can make mistakes." Answer keys stay on the server.
- **Real model, measured:** "The water cycle", Grade 4: a correct, well-formed lesson in 1 min 48 s on the Beelink (qwen3 4B). Drafting runs in the background and the page checks every 3 s, because the web server stops waiting after 120 s. At most two drafts at once; on the public demo, three drafts per visitor per hour.
- **Not done:** the tutor has no lesson text to ground its answers on for teacher-made lessons (it still answers, but without citing the lesson).
- **Tests:** API 196/196, browser 42/42, axe clean on all new teacher pages. The teacher sidebar has no "Soon" items left.

### Khan Academy practice exercises work in the School Library (done by the AI agent)
- **What works:** opening a Khan Academy practice set in Explore > School Library shows its questions one at a time: multiple choice (single and "choose all"), number answers (accepts 3/4, 1 1/2, 0.75, 1,000), math expressions, dropdowns, pictures and drawings (with their labels drawn in), and step-by-step hints. Mastery follows Khan's own rule for each set (for example 5 of the last 7 right); a question answered after a hint does not count toward mastery. Mastering a set gives +20 XP once and is saved per student (migration 0009).
- **Answers stay on the server**, like our homework: the browser gets the question only, and the server says right or wrong (tested).
- **Coverage, measured:** in a 500-exercise sample, 477 sets have 5 or more questions we can show, 10 have 1-4, and 13 have none (they use drag-and-drop or graph-drawing tools; those sets say so plainly). Of 6,276 questions with a checkable answer, the checker accepted the right answer for 6,258 (99.7%) and rejected a wrong answer for all 6,276. The 18 misses are calculus answers written with trig functions next to letters (like x sin x); students typing those may be marked wrong.
- **Checked for real in a browser:** a Grade 1 "Add within 10" set played through to "Mastered: +20 XP"; decimal models, a fraction comparison and quadratic factoring rendered correctly.
- **Not done:** progress on library practice is not shown on the Progress page or to teachers yet.

### All 28 lessons in Umanah's three courses are written and live (done by the AI agent)
- **New:** 23 lessons written by AI agents and checked by the main agent: Python Foundations 1-4, 8, 9; AI Foundations 3-11; Science & Engineering 1-8. Every course now has no "Coming soon" lessons (catalog: Python 9/9, AI 11/11, Science 8/8).
- **How they were checked:** `tools/content/validate_lesson.py` (new) runs every example's code and compares the output, runs every Try It starter, and checks the fields, the three check questions (answer key in range, a misconception note for every wrong option) and house style (no em dashes). All 28 lessons pass. All 28 open in a real browser with no errors. The main agent read samples (Functions, Simple machines, Language models) for accuracy. API tests cover every lesson: opens, never leaks answers, checks on the server, completes for XP.
- **Content notes:** Science lessons use everyday examples from several countries (a tailor in Accra, a bus in Nairobi, the Great Mosque of Djenne's mud brick). The pyramids line says ramps and levers "probably" helped (kept as a hedge on purpose). The language-models lesson says answers can be confidently wrong and must be checked. **Not done:** a subject teacher has not reviewed these lessons; recommended before they are used with a class.
- **Fixed on the way:** lesson pages crashed when a check question had no code (AI Foundations 2 was affected too); the word "for" in ordinary sentences was shown as code.
- **Tests:** API 266/266, browser 42/42.
- **Library practice on Progress and for teachers (done):** each student's Progress page has a "Library Practice" list (set, how many right, Mastered or Practising), and the teacher's student page shows the same. Tests: API 267/267, browser 42/42.

## 2026-10-10

Done by the AI agent on branch `k12-motion-and-bands` (not merged to main; the coordinator's brief said never push to main). The owner said "do the audit fixes ... and the remaining grade band design".

### Motion pass (Emil Kowalski's design-engineering rules; audit of 2026-10-05)
- **Shared styles in `apps/web/src/index.css`:** two easing curves (`ease-out-strong`, `ease-drawer`), `card-press` (cards lift only when a mouse hovers and shrink slightly when pressed, on touch too), `press` (small controls), and `rise-in` (a short fade-up for arrivals).
- **Applied to:** K-2 picture tiles and speaker buttons, the five verb cards (`FeatureCard`) and its five copies (Ask, Explore, Practice, grade courses, documents), Home tiles, buttons (named properties, a 3% shrink when pressed instead of a 1 px nudge), tabs, badges, sidebar rows, tutor chips and Send/Stop, Build and lesson choices, the flashcard (the text now fades when it flips).
- **Progress bars** move with a transform over 300 ms instead of changing width over 500 ms.
- **Tutor:** while an answer streams, the chat follows it instantly instead of queueing a smooth scroll for every word; "Thinking…" pulses gently; new messages fade in (history loaded from earlier does not).
- **Home cards** rise in one after another (50 ms apart) on the first Home of a visit only.
- **Dialogs** open in 200 ms and close in 150 ms (were 100 ms both ways); side panels use a drawer curve (300 ms in, 200 ms out); menus 150 ms in, 100 ms out.
- **Reduced motion** now keeps fades and colour changes and removes movement (lift, press, slide, zoom), instead of switching every animation off.
- **K-2 read-aloud on hover:** now waits until the mouse rests on a tile for 0.35 s, never fires on touch, and keyboard focus reads the tile. The speaker buttons are unchanged.
- **Correction to the audit:** tooltips already showed instantly after the first one (Radix's default skip delay, and the open animation only runs on the first one). The only change was a 300 ms first delay, stated explicitly.

### K-2 to 12 grade-band spec: the parts not built before
- **Sign-in as a school entry (screen 1):** the school's name at the top, and a Student / Teacher or staff choice that changes the heading, the help text and the password label ("Password or PIN" for students). It uses the same sign-in. A new public `GET /api/auth/school` returns only the school's name.
- **School → Grade → Class → Student (teacher side):** new "School by Grade" page (`/teacher/school`) for teachers and staff with the teaching permission. A class with students in two grades shows under both grades. Students without a grade are listed last.
- **Teachers can widen a student's content:** on the student's page, "Content" checkboxes open other bands' courses, games and library shelves for that student. The student's own band, Home and grade do not change. This was the spec's "teachers can widen it per student". Stored in the new `users.extra_bands` field (migration 0010). Every change is in the audit log.
- **Project workspace (screen 9):** saved science and engineering projects reopen with their notes. There is a "Hand in to my teacher" button, and a "Project helper" tutor panel that uses the existing project mode (hints and questions, not answers, through the same safety pipeline). Python Lab projects can be handed in too. The class teacher gets a notification, and the student's page lists their projects. **Decision:** teachers see the text of a project only after it is handed in; drafts show title and status only. If the student edits a handed-in project, it becomes a draft again and must be handed in again.
- **Practice (screen 6):** the Practice tab now starts with "Practice for Grade N": the student's practice sets with unfinished and shakiest ones first, then the grade's courses. Coding practice (the old Revision page) follows, only for bands that learn Python (6-12, or a student widened to them).
- **Tutor reading level by grade:** the tutor's reading-level line now follows the student's grade band (K-2: very short sentences and everyday words; 3-5: reading age about 9; 6-8: clear and friendly; 9-12: may be a little more detailed). The class's age band is still used when a student has no grade. Nothing else changed: the mode, the locked limits, the safety checks and teacher visibility are decided exactly as before. This was tested (`tests/test_k12_leftovers.py`: a Grade 1 student gets the same modes, badges and locks as Grade 7, and homework still gives only hints). This is a child-safety-adjacent change made under the coordinator's brief, which allowed it only if those stayed the same.
- **Translation files:** new `apps/web/src/locales/en.json` and `lib/i18n.ts` (`t()` with English fallback). The band words, Home texts, K-2 tiles and every new screen above use it. **Not done:** older screens still have English in the code; they move over as they are touched.
- **Accessibility:** the axe scan now also checks WCAG 2.2 AA and covers the new School and View as pages: no violations.

### Tests and evidence
- API 272/272 (5 new). Browser 47/47 (5 new in `e2e/z-k12-more.spec.ts`), including phone width with no sideways scroll. Screens checked by eye at 1440x900 and 390x844: sign-in (student and staff), School by Grade, the teacher's student page, the workspace, Practice, and View as for K-2, 3-5 and 9-12.
- **Not checked:** the simulation inside the workspace (the screenshot server has no School Library), and read-aloud with sound.

### Deployed (owner said "deploy", 2026-10-10 21:20 UTC)
- Built and started the new `api` and `web` containers from branch `k12-motion-and-bands` (no other container was touched). The migration to 0010 ran; the demo template rebuilt by itself.
- **Live check on https://ai.umanah.org (public demo, real browser):** school entry on sign-in, student Home, Practice for Grade 7, project hand-in, the four band Homes (View as), School by Grade, and no page errors: all pass.
- **Problem found, not caused by the new code: the tutor does not answer.** After about 90 s it says "The AI tutor isn't available right now". Cause, measured: the machine is out of memory (swap 4.0 of 4.0 GB used), and the kernel kills the tutor model (`Out of memory: Killed process ... (llama-server)`) whenever it tries to load. Only the safety model stays loaded. The AI agent also tried loading the model directly with no time limit; the kernel killed it again. Recreating the API container restarts its warm-up, which tries this load; the model itself unloads after 30 minutes idle, so the outage may have begun earlier, which could not be confirmed (no older logs).
- **Not rolled back:** a rollback runs the same load and would fail the same way; the new code is not what uses the memory.
- **Owner decision needed (shared machine, other projects):** free about 2 GB of memory so the tutor model can load. Large users right now: Ollama's safety model (1.9 GB), the rootless Docker daemon (1.2 GB), a Node server (0.5 GB), Claude Code sessions, a Java process, HUNGREE Goat's `hgc serve` and its ffmpeg stream, CoreTech Media's containers (about 0.5 GB together) and Ashanti Labs'. Options: stop the Ashanti and CoreTech containers again, as on 2026-09-30; stop idle Claude sessions; or add RAM. After memory is freed, the tutor loads on the next question.
- **Merge:** left on the branch. The coordinator's brief said never push to main, and the repo has no written rule to merge after a deploy. **Open:** the owner merges `k12-motion-and-bands` into main.
- **Ashanti handoff for this work:** `~/ashanti-labs/UI-UPDATES.md`.

### (earlier note) Not live yet: the deploy needs the owner
- The live demo at ai.umanah.org still runs the earlier build. The AI agent's deploy command was blocked by this machine's permission settings, which ask for a person before a production deploy. **Action for the owner:** see HANDOFF.md "Exact next action". A backup of the live database was made first (`/srv/ai-node/storage/ssd/umanah-ai-lab/backups/pre-k12-motion-20261010.sqlite3`, integrity checked). Migration 0010 only adds two columns. The demo template rebuilds by itself because `models.py` changed.

### Open questions for the founder
- **Third-party names on student screens:** the grade course cards in Learn and Practice show "Khan Academy" under each course (the content's own attribution line, added on 2026-09-30). CLAUDE.md says third-party names stay off student screens, but this content's license asks for attribution. Left as it is: should attribution move to an info line or the Open Source Notices page?
- **Ashanti Labs and CoreTech Media containers are running again** on ai-node-01 (they were stopped on 2026-09-30). The AI agent did not touch them. Free memory: about 5.8 GB.
- **Merge:** this branch should be merged to main once the owner is happy, so main matches what is live.
