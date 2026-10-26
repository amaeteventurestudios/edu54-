# Model Strategy

## Principle

Students choose tasks, not model brands. LabOS chooses approved models based on role, hardware, policy, and availability.

## Models by machine

| Machine | Tutor model class | Notes |
|---|---|---|
| `ai-node-01` (dev, ~12 GB, CPU) | 1B–4B, 4-bit | development and functional testing only |
| AI Lab Mini (Mac mini M5 Pro, 64 GB) | 8B–14B, 4-bit; test larger | chosen by accuracy eval (`42`) and load test (`43`) together |
| Raspberry Pi 4 (optional validation) | 0.5B–1.5B | proves the UX degrades gracefully on tiny hardware |

Pinned for `ai-node-01` now: **Qwen3 4B Instruct** (tutor), **Qwen3Guard small or Llama Guard 3 1B** (safety), **nomic-embed-text** (embeddings) — see `53`.

Also required on every tier: a small **safety classifier** model (`41`) and an **embedding** model for search.

Measure time to first word, words/sec under load, memory, stability, multilingual quality (`49`) and eval scores. A model is chosen per tier only when it passes the tutor and safety evals.

## Model roles

- General tutor/instruction.
- Coding assistance.
- Embeddings/retrieval.
- Small router/classifier/bookkeeper.
- Teacher content generation on capable tiers.

## Model registry metadata

Record model name/version, upstream, license, quantization, size, checksum, context length, recommended RAM, supported roles, safety/policy notes, benchmark results.

## Automatic selection

Borrow the useful spirit of Chatty-EDU automatic role selection, but use explicit approved metadata rather than only file size when possible.

## Updates

Model updates are separate from app updates. A new model should stage/download, verify checksum/license metadata, benchmark smoke test, then activate with rollback to previous model.

## Licensing

Do not redistribute model weights until their license and use terms are reviewed and recorded.
