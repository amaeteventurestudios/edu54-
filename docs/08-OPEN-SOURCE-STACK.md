# Open-Source Stack Catalog

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Selection criteria

Every dependency is evaluated on function, license, hardware footprint, offline behavior, API/integration quality, maturity, security posture, maintainability, and ability to hide behind the Umanah experience.

## Candidate components

### Chatty-EDU — AGPLv3
Local-first education shell with homework packs, revision, teacher controls, GGUF models, module hosting, local networking, sandbox, Bookkeeper context, and hash-chained submissions. Valuable architecture reference and possible component. See `09-CHATTY-EDU-STRATEGY.md`.

### Moodle — GPL
Mature LMS for courses, users, assignments, quizzes, completion, gradebook, teacher roles, badges, APIs. Potential learning engine, especially on production hardware. Avoid exposing Moodle UI as the product.

### H5P
Interactive content primitives for quizzes, presentations, branching content, interactive video, drag/drop, etc. Validate licensing/version specifics before bundling.

### Ollama
Convenient local model management/inference API. Strong candidate for general deployment, but direct llama.cpp may be lighter on constrained hardware.

### llama.cpp / GGUF
Efficient local inference foundation and model format ecosystem. Useful for Raspberry Pi and direct control.

### Open WebUI
Local AI UI/API/RAG features. It may be useful as an engine or admin tool; student UI should remain Umanah-owned.

### JupyterHub
Mature multi-user notebook environment. Good production option; may be too heavy for Pi prototype.

### FastAPI
Candidate lightweight application API framework.

### SQLite
Default prototype/local appliance DB for low overhead and easy backup.

### PostgreSQL
Potential production database for higher concurrency or central services.

### Kolibri — MIT
Offline-first learning platform from Learning Equality, with content channels, coach tools and sync. Evaluate as content source, then possible learning engine (`10`, `47`).

### Kiwix — GPL-3.0 (software)
Offline reader/server for ZIM libraries (Wikipedia and more). Strong base for Explore (`13`, `47`).

### Pyodide — MPL-2.0
Python in the browser via WebAssembly. v1 Build Lab runner (`12`).

### Safety classifier models
Open safety-classification models (candidates such as the Llama Guard and ShieldGemma families). Each has its own license and use terms; review before bundling (`41`, `31`).

### Tailscale / Headscale
Secure private overlay networking for management.

### Ansible
Repeatable provisioning and configuration.

### Caddy / Nginx
Reverse proxy, TLS, internal routing.

### Uptime Kuma / Netdata
Possible monitoring primitives; may be overkill on every small node. Prefer a small LabOS health agent where sufficient.

## Dependency rule

Do not adopt software merely because it is popular. A component must reduce total complexity after integration, licensing, operations, and UX are counted.

## Third-party inventory

Maintain machine-readable dependency/license manifests in addition to human-readable `31-LICENSING-OPEN-SOURCE.md`.
