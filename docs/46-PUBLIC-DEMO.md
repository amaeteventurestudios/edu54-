# Public Demo — `ai.umanah.org`

> Facts: `00-START-HERE.md`. Website: `03-PUBLIC-WEBSITE.md`. Host routing: `../ops/AI-NODE-01.md`.

## Purpose

Donors, sponsors, schools and press click **Launch Demo** on `umanah.org/ai-lab`. It must work every time, show the real product with sample data, and be safe to leave open to the internet.

## Hosting

The development machine (`ai-node-01`) runs on demand and sits in a home, so it cannot be the only demo host.

| Mode | How | When |
|---|---|---|
| **Always-on demo** (later, Phase 2) | runs on the Hetzner server (or a small dedicated server) with demo data and a small model | every visitor, any time |
| **Live hardware demo** (Phase 1, now) | nginx on Hetzner proxies to `ai-node-01` over Tailscale | from Phase 1 on, whenever the stack is running |
| **Fallback page** | if the model is down: "The demo is resting — watch the 2-minute tour" with a recorded video | automatic |

If the always-on server can't run a model at acceptable speed, the demo may show the full UI with pre-recorded tutor replies for the scripted prompts, clearly labeled. It must never quietly use a cloud AI service while the site says "local."

## Demo experience

- No sign-up. Two buttons: **Try as a student** and **Try as a teacher**.
- Fictional school, class and students (same seed data as `44`).
- Banner on every screen: "Demo with sample data. Real deployments run on-site at the school."
- Demo resets every night and each visitor session is isolated. What is built: each visitor's private copy lasts 24 hours after last use (checked every 10 minutes), and once a day at 10:00 UTC (03:00 Pacific summer time, 02:00 winter) every copy is deleted and the sample school is rebuilt from the seed. The real school's database, users and admin login are never touched by any of this.

## Safety and abuse limits

- Same safety pipeline as real deployments (`41`), with stricter thresholds.
- Password sign-in is off for students and teachers (they use the two buttons). The school owner's admin account can sign in with its password: 20 attempts per address per hour, the account locks for 15 minutes after 5 failed tries, and every attempt (success, failure, lock, rate limit) is written to the Audit Log. Signing in as admin leaves the visitor's demo copy behind. There is no "Try as admin" button.
- Rate limits per visitor (for example, 20 tutor messages per hour), maximum message length, bot protection.
- No document uploads, no admin area, no Safety Alerts content from real users, no remote-support tools exposed.
- Build Lab code runs only in the visitor's browser.
- Logs keep only counts and errors, not message content.

## Truth in claims

Anything the demo or website states as live must be live: "Prototype #001 is live," usage numbers, model names, hardware. Status panels in the demo show demo data labeled as demo.
