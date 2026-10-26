# Hardware Tiers

## Development host — ai-node-01

Beelink mini PC, Ryzen 7 5800H, ~12 GB RAM, Ubuntu 26.04.1. Used for building and functional testing, not as the performance reference. Measured 2026-09-24 (`43-CONCURRENCY-PERFORMANCE-BUDGET.md`, "Benchmark results"): about 10 tutor replies a minute (2 slots × ~7 words/s); 10 simultaneous askers wait ~40 s for the first word, 30 wait ~110 s (p50) with no failures. Details: `../ops/AI-NODE-01.md`.

## Raspberry Pi 4 — optional low-resource validation

~3.7 GB usable RAM. Used only to check that the product degrades gracefully on very small hardware (`27`). Not a product tier.

## AI Lab Mini — candidate: Mac mini (M5 Pro)

Target: one classroom, library or community space, up to ~30 active students (to confirm by benchmark, `43`).

Candidate configuration: **Mac mini, M5 Pro (15-core CPU, 16-core GPU), 64 GB unified memory, 2 TB SSD, 10 Gb Ethernet** — about **$3,599** at Apple US list price (September 2026). Cheaper variants (64 GB / 1 TB ~$2,999; 48 GB / 1 TB ~$2,599) are listed in `51` and should be tested; the final pick comes from benchmarks. 10 Gb Ethernet is optional because school networks are usually 1 Gb or Wi-Fi.

Why it fits: large unified memory lets one box run an 8B–14B-class tutor plus a safety model with room for many parallel requests; it is small, quiet and low-power; macOS can restart itself after a power cut.

What it changes in the design:

- The model runtime runs **natively on macOS** to use the Apple GPU (Metal). Docker on macOS runs in a virtual machine without GPU access, so only non-AI services may be containerized.
- Services are managed by launchd; the same `umanah-lab` command works on Mac and Linux.
- FileVault full-disk encryption is required (`45`).
- Remote management of macOS appliances (updates, configuration) needs a plan: evaluate an MDM tool for macOS updates plus the Umanah health agent for LabOS (`22`).
- An x86 + NVIDIA GPU mini-PC remains an alternative candidate if Mac supply, price or management becomes a problem.

## AI Lab School

Higher memory/compute/storage for multiple classrooms and greater concurrency. Could be a larger Apple Silicon system, GPU workstation, or validated x86/GPU appliance.

## AI Lab Research

High-performance workstation/server, larger RAM, RAID, advanced models, datasets, scientific computing.

## Central Umanah development lab

High-end Mac Studio-class machine, large memory, large internal SSD, external RAID, backups, networking, UPS. Planning range roughly $25K–$30K for the complete lab rather than framing the request as one expensive computer.

## Benchmark suite

For every tier record:
- concurrent chat users;
- model load time;
- latency/tokens-sec;
- coding workload impact;
- knowledge indexing speed;
- disk usage;
- thermals;
- idle/load power;
- recovery after reboot/power interruption.
