# Risk Register

> Review at every roadmap phase gate (`39`). Likelihood and impact: Low / Medium / High.

| # | Risk | Likelihood | Impact | Mitigation | Doc |
|---|---|---|---|---|---|
| 1 | Student in crisis gets a harmful or dismissive AI reply | Medium | High | safety pipeline, fixed support response, school alerts, test set with 100% gate | `41` |
| 2 | Tutor gives homework answers (cheating) | High | Medium | server-set mode, no keys in prompt, answer-leak check, jailbreak eval | `42` |
| 3 | Tutor states wrong facts confidently | High | Medium | grounding in lessons, code does math, "can be wrong" label, accuracy eval | `42` |
| 4 | Box too slow for a full class | Medium | High | concurrency design, benchmarks, published capacity with margin | `43` |
| 5 | School network or filters block the appliance | High | High | site check, IT sheet, own-Wi-Fi fallback kit | `45` |
| 6 | Public demo down when a sponsor clicks | High | Medium | always-on demo host, fallback video page | `46` |
| 7 | License violation (AGPL, NonCommercial, model terms) | Medium | High | license inventory, NC/SA content packs, counsel review | `31`, `47` |
| 8 | Hardware costs exceed budget | High | Medium | config options, Apple Education pricing, fewer units in phase 1 | `36`, `51` |
| 9 | Student data exposed (stolen box, breach, support misuse) | Low | High | full-disk encryption, no student data to Umanah, logged time-limited support | `23`, `50` |
| 10 | Schools can't sign without privacy agreements | High | Medium | NDPA and privacy documents ready before pilot outreach | `50` |
| 11 | Single developer / founder bandwidth | High | High | vertical slice first, agent-driven build with phase gates, documented runbooks | `44`, `39` |
| 12 | Development drive (USB flash) fails, losing work | Medium | Medium | code in GitHub; nightly database backup; flash-friendly settings | `ops/AI-NODE-01.md` |
| 13 | macOS or model runtime update breaks the stack in the field | Medium | Medium | pinned versions, staged updates, rollback | `22`, `29` |
| 14 | Overclaiming impact or pilot status | Medium | High | claims rules; usage vs learning outcomes separated | `37`, `46`, `48` |
| 15 | Nonprofit / USG boundary questioned | Low | High | written agreements, board approval, asset register | `38` |
| 16 | No money for yearly support after the first year | Medium | High | sponsored labs include support years; support plan option | `51` |
| 17 | Accessibility complaint from a public school | Medium | Medium | WCAG 2.2 AA, published conformance report | `49` |
