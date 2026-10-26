# Chatty-EDU Strategy

## Source

Repository: `https://github.com/instance001/chatty-edu`

License: **AGPLv3**.

## Why it matters

Chatty-EDU independently validates many Umanah principles: offline-first school trust boundary, local GGUF inference, teacher control, homework-aware guardrails, revision as a separate mode, modules, local networking, and visible local activity.

## Features worth studying or reusing conceptually

- Single Rust binary / lightweight packaging mindset.
- Teacher PIN/unlock boundary.
- Markdown-first homework authoring.
- JSON assignment packs.
- Completed submission export.
- Marking-sheet and printable workflows.
- Separate Revision workflow.
- Homework hint guardrails.
- Local `Chatty_Sandbox/` with approval-gated file actions.
- Main model + optional Bookkeeper model roles.
- Local context surfaces and audit history.
- Optional LAN peer discovery and pack transfer.
- Preview-before-apply network inbox.
- Module manifests, hosted module UI, bridge/status handoff.
- Hash-chained submission event history.

## Important differences from Umanah

Chatty-EDU is Windows-first and desktop-centric, intentionally accountless, and explicitly zero-call-home. Umanah is a browser-based shared appliance with multi-user identity, structured curriculum, deeper gamification, school-wide administration, and an optional secure Umanah management plane.

## Integration options

### A. Separate component
Preferred first evaluation. Keep Chatty as an independent AGPL program/component and integrate at process/file/API boundaries where technically reasonable.

### B. Upstream contribution
If generic improvements benefit Chatty, contribute upstream while keeping Umanah-specific product code separate.

### C. Fork
Only after evidence shows a fork is the best product path and after accepting AGPL obligations for the covered derivative work.

## Prototype experiment

Benchmark whether selected Chatty concepts/components reduce memory/operational complexity compared with Moodle + Open WebUI + JupyterHub on constrained hardware.

## Licensing caution

A local school LAN still constitutes network interaction for AGPL analysis when users remotely interact with a modified AGPL program. Physical distribution of appliance software also carries license obligations. See `31-LICENSING-OPEN-SOURCE.md`; obtain counsel before final broad deployment posture.
