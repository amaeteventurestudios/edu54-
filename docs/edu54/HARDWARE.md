# EDU54 — Hardware

Summary of the options researched on 2026-09-28. Prices were volatile (RAM up ~4-5x since mid-2025, RTX 5090 at 2-3.5x list); re-check before any purchase. Buying anything is the owner's call.

| Box | Role | Hardware | Model | Est. capacity | Status |
|---|---|---|---|---|---|
| **ai-node-01** | first local install (both editions) | Beelink, Ryzen 7 5800H, ~12 GB RAM, 2 TB Samsung SSD (data) | Qwen3 4B (CPU) | a handful of users; functional demo only | in use; shared with the live Umanah AI Lab |
| **Mac mini demo box** | portable sales demo | Mac mini, 24 GB RAM, ~2 TB | **Qwen3-14B 4-bit (~9 GB)**, native on macOS | 10-50 demo users (some wait a few seconds at 50) | owned; owner's decision 2026-09-28 |
| **School box (K-12)** | recommended product box | AMD Ryzen AI Max+ 395 mini PC, 128 GB unified memory, 2 TB SSD (+ second NVMe for RAID 1), UPS | Qwen3-30B-A3B class | ~20-40 chatting at once, 100+ on lessons/library (estimate) | ~$2,800-4,500 all-in; not bought |
| **University box** | recommended product box | Mac Studio M5 Ultra, base 96 GB (or 256 GB if the 235B model is wanted), Thunderbolt RAID, UPS | 30B-A3B class; 235B only on 256 GB | 60-120 chatting at once, 300-500 logged in (estimate) | ~$7,100-8,900 (96 GB) or ~$11,700-13,500 (256 GB); not bought |
| DIY 2x RTX 5090 tower | compared, not recommended | Threadripper, 128 GB ECC, 2x 5090 | vLLM | fastest per request, but 64 GB GPU memory | ~$18,000-26,000, ~1.2-1.5 kW; skip while prices are inflated |

Notes:

- On Macs, the model runs natively (Ollama or MLX); Docker on macOS can't use the Apple GPU.
- On the 24 GB Mac mini, Qwen3-30B-A3B does not fit comfortably; an optional later test is 30B-A3B at 3-bit (~14 GB).
- Low power matters for African deployments with unstable grids and solar: the Ryzen mini PC (~120-150 W) and Mac Studio (~300 W or less) fit; the GPU tower does not.
- Storage is not the constraint (English tier ~300-550 GB; all five languages stay under ~1 TB). RAM is.
