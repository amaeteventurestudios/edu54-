# Sustainability and Cost of Ownership

> Fundraising: `36-FUNDRAISING-SPONSORSHIP.md`. Hardware: `26-HARDWARE-TIERS.md`. All figures are planning estimates to be replaced with real quotes.

## Why this matters

Sponsors fund a box once. Schools need it to keep working for years. A credible pitch shows the yearly cost of keeping a lab running and who pays it, not only the purchase price.

## AI Lab Mini hardware options (Apple US list prices, September 2026)

Based on the published M5 Pro Mac mini pricing: base $1,699 (24 GB, 512 GB); 48 GB +$600; 64 GB +$1,000; 1 TB +$300; 2 TB +$800; 10 Gb Ethernet +$100. Confirm in the Apple Store and ask Apple Education for institutional pricing.

| Configuration | Price | Notes |
|---|---|---|
| M5 Pro, **64 GB, 2 TB, 10 GbE** (current pick) | **~$3,599** | most headroom; 10 GbE rarely usable in schools |
| M5 Pro, 64 GB, 2 TB, standard 2.5 GbE | ~$3,499 | same capability for school networks |
| M5 Pro, 64 GB, 1 TB | ~$2,999 | 1 TB is enough if large libraries (full Wikipedia with images) are optional |
| M5 Pro, 48 GB, 1 TB | ~$2,599 | test whether 48 GB serves 30 students well enough |

Pick the final configuration from the concurrency benchmarks in `43`.

## Per-site setup kit (estimate)

| Item | Estimate |
|---|---|
| Mac mini (64 GB / 1 TB) | $2,999 |
| Small UPS | $150 |
| Wi-Fi access point for classroom network option (`45`) | $150 |
| Cables, lock, mounting | $75 |
| Shipping and setup materials | $125 |
| **Total** | **~$3,500** |

## Yearly cost to keep one site running (illustrative)

| Item | Per year |
|---|---|
| Hardware replacement reserve (kit over 4 years) | $875 |
| Remote support and monitoring (~2 hours/month at $75/hour) | $1,800 |
| Curriculum and model updates (shared cost per site) | $300 |
| Repairs and contingency | $150 |
| **Total** | **~$3,125 per site per year** |

Per student, per year:

| Students served at the site | Cost per student per year |
|---|---|
| 60 (library or after-school program) | ~$52 |
| 150 (five classes of 30) | ~$21 |
| 300 (two shifts / larger school) | ~$10 |

These numbers are the honest comparison point for sponsors: the cost of access per student per year, including support, not just the box.

## Who pays the yearly cost (owner decision)

Options, which can be combined:

1. **Sponsor "adopt a lab"** covers hardware plus 2–3 years of support.
2. **Optional site support plan** paid by the district or a local sponsor. This is support, not a per-student AI fee, so it is consistent with the "no per-student subscription" promise.
3. **Grants and foundations** for program operations.
4. **Hardware donations** of qualifying machines to cut the replacement reserve.

Whatever is chosen, the pitch should state it clearly: "A sponsored lab includes N years of support."

## Keeping costs down

- Standardize on one hardware configuration per tier.
- Remote diagnostics and signed, automatic updates reduce support hours (`22`).
- School-side training materials reduce support calls (`29`).
- Content packs shared across all sites.
