# Concurrency and Performance Budget

> Hardware: `26-HARDWARE-TIERS.md`. Models: `25-MODEL-STRATEGY.md`. Tutor rules: `42-AI-TUTOR-POLICY.md`.

## Why this is a design constraint

A whole class shares one box. If 30 students press "Ask" in the same minute, they share one model's output speed. The product is designed around that from the start instead of discovering it in a pilot.

## Targets for AI Lab Mini (to confirm by benchmark)

| Measure | Target |
|---|---|
| Class size served | 30 active students |
| Realistic simultaneous AI requests | ~10 in the same moment (not everyone asks at once) |
| Time to first word of a reply | ≤ 3 s typical (p50), ≤ 8 s worst case (p95) at that load |
| Reply length | ~150 words by default |
| Page load on the LAN | < 1 s |
| Safety check added time | < 300 ms |

For `ai-node-01` (development only): 3B-class model, 2–4 parallel requests. It is not the performance reference.

## How the design keeps load down

1. **Stream replies** so students see words immediately.
2. **One request in flight per student.** A second press waits for the first.
3. **Visible queue.** When busy: "You're 3rd in line — about 10 seconds." Never a silent spinner.
4. **Pre-written hints and checks cost nothing** (`42`). The hint ladder and answer checking use no model time.
5. **Cache common questions** per lesson ("what is a loop?") and reuse the approved answer.
6. **Reuse the shared prompt prefix.** Keep the system prompt and lesson context identical across students so the runtime can cache it.
7. **Short default replies,** with "tell me more" on request.
8. **Parallel slots** in the model runtime, sized by benchmark.
9. **Fallback under load:** switch to a smaller model or hint-only replies before timeouts.
10. **Code runs on student devices** (Pyodide in the browser), so Build Lab adds little server load (`12`).
11. **Search indexes are built when content is installed,** not during class.

## Memory budget sketch — Mac mini M5 Pro, 64 GB (estimate, benchmark to confirm)

| Item | Rough size |
|---|---|
| macOS + LabOS services + database | 8–10 GB |
| Tutor model, ~8B–14B class, 4-bit | 5–10 GB |
| KV cache for ~10 parallel slots at modest context | 5–15 GB |
| Safety classifier model | 1–5 GB |
| Embedding model | < 1 GB |
| Headroom | 20+ GB |

This leaves room to test a larger tutor model if quality needs it, or to run a separate teacher-content model.

## Benchmark protocol

A load-test script in `tools/loadtest/` simulates N students with realistic pauses (read lesson, type, ask, wait). For each hardware and model combination record:

- time to first word, p50 and p95;
- words per second per student;
- queue wait times;
- memory in use, swap, temperature, power draw;
- errors and timeouts;
- answer quality on the accuracy eval set at the same settings (`42`).

Run at 5, 10, 20 and 30 simulated students. Record results in a table in this document and in `26-HARDWARE-TIERS.md`. Set the published classroom capacity per tier from these numbers, with margin.

## Student devices

Students use what the school has. The web app must stay usable on a 4 GB Chromebook: small page bundles, Pyodide loaded only in Build Lab, no heavy animation.

## Benchmark results

### ai-node-01 (development host — not the performance reference) — 2026-09-24

Setup: AMD Ryzen 7 5800H (CPU only, no GPU inference), 12 GB RAM shared with ~9 other containers and services, models on a USB 3.2 flash drive, `qwen3:4b-instruct` (tutor) + `llama-guard3:1b` (safety) + `nomic-embed-text`, Ollama 0.34.4 in rootless Docker, `UMANAH_MAX_PARALLEL_INFERENCE=2`, free-Ask questions (~80-word replies), real HTTP path including login, safety screening and streaming. Tool: `tools/loadtest/loadtest.py`; raw results `ops/evidence/loadtest/`. Students pause 4–12 s between asks; model warmed first.

| Simulated students | Requests | Errors | Time to first word p50 / p95 | Queue wait p50 / p95 | Longest queue | Words/s per reply (p50) | Min free RAM | Peak swap |
|---|---|---|---|---|---|---|---|---|
| 5 (2 asks each) | 10 | 0 | 13.1 s / 22.0 s | 7.1 s / 18.1 s | 3 | 6.7 | 2.3 GB | 0.07 GB |
| 10 (2 asks each) | 20 | 0 | 43.9 s / 54.8 s | 41.8 s / 44.3 s | 8 | 7.0 | 2.2 GB | 0.21 GB |
| 20 (1 ask each) | 20 | 0 | 73.2 s / 117.9 s | 66.4 s / 100.9 s | 17 | 7.6 | 2.2 GB | 0.29 GB |
| 30 (1 ask each)* | 30 | 0 | 108.0 s / 206.1 s | 90.3 s / 171.7 s | 25 | 6.7 | 2.1 GB | 1.66 GB |

\* 28 demo accounts exist, so two accounts were reused.

**Reading:** this host meets none of the classroom targets (≤3 s p50, ≤8 s p95) and is not expected to — docs/26 already says so. What the run does establish: (1) the queue behaves as designed — no request failed or timed out at 30 students, and every student saw a queue position; (2) throughput is about 2 slots × ~7 words/s, roughly 10 replies a minute, so a class of 10 asking at once waits ~40 s; (3) the first request after idle costs ~75 s (model load from USB) — `OLLAMA_KEEP_ALIVE` and a start-up warm-up matter; (4) memory is tight with the other host services (swap reached 1.7 GB at 30).

**Defect found and fixed by this run:** before the fix, at 10 students 18 of 20 requests failed with `database is locked`, because the tutor held SQLite's write lock across the safety-model call and the whole generation. The API now commits before yielding (`fix(api)`, results before the fix in `ops/evidence/loadtest/before-sqlite-lock-fix-5-10.json`).

**Not yet measured:** quality on the accuracy set under load, temperature/power, the reference hardware (AI Lab Mini tiers). The published classroom capacity per tier must come from those runs, not from this table.

### ai-node-01 tutor speed-up — before / after (2026-09-24)

Same hardware, models and load-test parameters as above (students pause 4–12 s; 2 asks each). "Before" = warm models, 2 slots, 4096-token context, `keep_alive` 10 min. Raw JSON: `ops/evidence/loadtest/`.

| Students | Before (2 slots, ctx 4096): first word p50 / p95 | 3 slots, ctx 3072 | **4 slots, ctx 2560 (dev default now)** | Min free RAM (after) |
|---|---|---|---|---|
| 1 (warm) | 0.4–0.9 s / ~1.9 s | 0.8 s / 1.9 s | **0.8 s / 1.9 s** | 3.1 GB |
| 5 | 13.1 s / 22.0 s | 8.5 s / 21.6 s | **5.0 s / 22.0 s** | 2.6 GB |
| 10 | 43.9 s / 54.8 s | 33.5 s / 43.3 s | **22.9 s / 36.4 s** | 2.2 GB |

**Single student (the sponsor-demo case): 0.8 s to first word when warm — under the 5 s target.** What was actually wrong for one student was the cold start, not steady state:

| Cause investigated | Finding | Change |
|---|---|---|
| Model reloads / cold start | The first ask after idle took **75–115 s** (models load from the USB drive; the safeguarding-triage prompt prefix, ~700 tokens, cost another ~10 s the first time a message contained "I/my"). `keep_alive` was 10 min. | Ollama `OLLAMA_KEEP_ALIVE=-1` and `keep_alive:-1` on every request (models stay resident); the API **warms up at start-up** (safety model, triage prefix, tutor prefix: ~2 min once, in the background, never blocks start). First student after a restart: 0.8 s. Note: Ollama rejects the string `"-1"`; it needs the number. |
| Qwen3 thinking | `qwen3:4b-instruct` is the non-thinking instruct build and emitted no reasoning trace in testing. | `think:false` sent on every request anyway, plus a streaming filter that removes any `<think>…</think>` (also when split across chunks) before text reaches a student; unit-tested. |
| Prompt size / caching | Tutor system prompt ≈ 150–250 tokens with a fixed prefix (only the age band varies); the runtime reuses the cached prefix. The one large prompt is the triage few-shot (~700 tokens), run only for personal/risk-worded messages; its prefix is now primed at start-up. | Left as is (safeguarding quality is a release gate, docs/41); prefix primed instead. |
| Safety step | Rules run first, and a high-severity rule hit returns without calling any model. Otherwise Llama Guard (1B, ≤24 tokens) runs concurrently with triage. Whole path to the first visible word is ≈0.8 s warm, so the classifier adds no avoidable delay at one student. | None. |
| Slots | Decoding is memory-bandwidth-bound, so several parallel slots raise aggregate throughput; per-reply speed drops (9 → ~5 words/s) but waiting drops much more. KV cache cost is context × slots, so context was cut to 3072/2560 (prompts are ≈600 tokens, replies ≈330). | `UMANAH_SLOTS` (compose default 3, ctx 3072; this node runs 4 / 2560 in `.env.local`). |

Still open: 10 simultaneous askers wait ~23 s (target ≤3 s p50) — a CPU-only dev host will not reach the classroom target; the tier hardware in docs/26 must. The 5-student p95 (22 s) is dominated by a few requests that queue behind triage prefill; worth re-measuring on GPU/Apple hardware before tuning further.

