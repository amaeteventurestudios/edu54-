# EDU54 — handoff (ai-node-01)

> **EDU54 copy (2026-10-26).** This repo was cloned from Ashanti Labs and only the name was changed (Ashanti Labs / Ashanti → EDU54, ashantilabs.com → edu54.com). Server facts below (hosts, addresses, paths, deploy dates, "live" checks) describe the **Ashanti Labs** deployment as it was renamed in text; EDU54 itself is **not deployed yet** and has no servers, DNS or email of its own.

_Last updated 2026-10-10 by the AI agent (Claude). A copy lives at `<EDU54_ROOT>/HANDOFF.md`._

## Current objective
First local install of EDU54 on ai-node-01, both editions side by side (demo rule), per `docs/edu54/INSTALL-RUNBOOK.md`.

## State (what runs)
| What | Where | Notes |
|---|---|---|
| K-12 | http://192.168.4.41:8300 (API 127.0.0.1:8301) | compose project `edu54-k12`, DB `<ROOT>/database/edu54-k12/umanah.sqlite3` |
| University | http://192.168.4.41:8350 (API 127.0.0.1:8351) | compose project `edu54-uni`, DB `<ROOT>/database/edu54-uni/` |
| Offline library | 127.0.0.1:8312 | `edu54-shared-kiwix-1`; ZIMs in `<ROOT>/knowledge/zim`, downloading in the background (`services/download-zims.sh`, log `logs/downloads/zims.log`); the library index and license catalog refresh after each file |
| Model runtime | AI Lab's, 127.0.0.1:8120, read-only client | RAM-guard fallback (see decisions). EDU54's own runtime (8320) not started |
| Build tools | `<ROOT>/apps/games`, served at `/play/` | K-12: Blockly Games, Snap!, Music Blocks. University: JupyterLite, CircuitJS, JSmol, GlowScript |
| Demo logins | `<ROOT>/secrets/demo-accounts.txt` (0600) | regenerate with `edu54-lab creds` |

`<ROOT>` = `/srv/ai-node/storage/ssd/edu54` (Samsung T7 Shield 2 TB, serial M88001AT0SNRN6S, label AI_NODE_SSD). Control: `<ROOT>/services/edu54-lab start|stop|status|build|creds|ram-guard|provision|remove`.

## Completed
Brand/edition/instance switches, license gate with tests, EDU54 demo seed, per-institution provisioning (dry-run done and removed), country-specific safety resources, Attributions page (catalog + model registry), edition wording, University Build tools, EDU54 Playwright suite, Kiwix with per-edition book lists. See `EDU54-DECISIONS.md` and `EDU54-EXCLUSIONS.md`.

## Tests
- API (pytest, stub AI): 191/191. LabOS browser suite with Umanah defaults (no AI Lab regression in code): 35/35.
- EDU54 browser suite (`apps/web/playwright.edu54.config.ts`, live instances): 12/12 (sign-in branding, every student nav item, teacher/lecturer and admin pages, safety alerts, Build tools under the page's security policy with outside requests blocked, config/catalog free of excluded sources).
- Real tutor through the safety pipeline: answered on K-12 by API (about 16 s) and on University in a real browser over the LAN (11 s, no request left the box); a self-harm message on University returned the fixed support response naming the safety contact, with no US hotlines.

## Known problems / not done
- Kolibri channels (African Storybook, StoryWeaver, Global Digital Library, PhET) not imported: need per-item license checks (NC stories, PhET date cutoff) and Kolibri's RAM on a box with about 2.5 GB free.
- OpenStax, Saylor, Carpentries, Microsoft "for Beginners", Hugging Face courses, d2l.ai not imported: LabOS has no reader for PDF/web-book packs outside Kolibri yet.
- Tutor/safety evals not re-run for EDU54. Internet-unplugged test: browser side done (all outside requests blocked, tools and pages work); the server shares the host network by design, so a network-isolated server test was not run.
- Edition wording for hard-coded strings uses an interim text rewriter; strings are not yet in translation files.
- JupyterLite, Snap! and Music Blocks show their own names inside their own windows (third-party UI).
- Customer-box logo upload in provisioning: display name works, logo not wired yet.

## Overnight 2026-09-30
- 21 CC BY OpenStax textbooks downloaded and cataloged; Explore shelf coded and tested but **not deployed** (needs a web rebuild in a quiet window).
- Evals: safety high-severity 182/191 (fails the 100% bar; investigate before any pilot); jailbreak 0 leaks in 60/140; accuracy not run. The AI Lab's runtime was OOM-killed twice during the run and recovered. Do not run evals/builds on this box while the AI Lab is live.

## Evening 2026-09-30
- Grade-aware K-12 Home (4 bands), learner badge, renamed nav, teacher View-as, School by Grade and learner view: all deployed; browser suite 12/12.
- Safety eval re-run blocked by memory on this box; see decisions (fail-soft question for the owner).

## 2026-10-10: LabOS UI updates ported (code only, not deployed)
LabOS branch `k12-motion-and-bands` merged into `edu54`: motion pass and generic screens in both editions, grade-band
screens in K-12 only, Khan Academy and other NC content and credits removed. Details, tests and what was not checked:
`EDU54-DECISIONS.md`, section 2026-10-10. API 315/315 (EDU54 edition tests K-12 9/9, University 9/9); LabOS browser 47/47;
EDU54 desktop and phone check 64 pages.

## 2026-10-21: public at edu54.com
Second demo server (Contabo, Tailscale `vantage-world`, `/srv/edu54`): homepage https://edu54.com, K-12 https://k12.edu54.com, University https://uni.edu54.com via a Cloudflare Tunnel (no open ports). No models on that server (owner); the tutor is not connected until the owner names the model computer. Details: `EDU54-DECISIONS.md`, 2026-10-21.

## Exact next action
Connect the Contabo instances' tutor to the owner's model computer (`INFERENCE_URL` in `/srv/edu54/config/edu54-*.env`, then `edu54-lab start k12|uni`), and add a contact address to the homepage once the owner gives one. Earlier items:
Deploy the 2026-10-10 build to both instances in a quiet window (`<ROOT>/services/edu54-lab build`, then `start k12` and
`start uni`), then run the EDU54 Playwright suite against them. After that: let the ZIM downloads finish (last one is full English Wikipedia, 127 GB). Then: per-story license check and import of African Storybook into EDU54's own Kolibri (when RAM allows), OpenStax reader, rerun evals, then Phase 8 (Mac mini) when it is reachable.

## Git
Repo `amaeteventurestudios/umanah-ai-lab`, branch `edu54` (pushed; never `main`). Checkout `<ROOT>/apps/labos`.
