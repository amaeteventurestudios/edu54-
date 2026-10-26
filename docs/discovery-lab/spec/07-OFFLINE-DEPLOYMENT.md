# 07 Offline deployments

Offline means **public internet disconnected** while school LAN works. All 13 lab navigation pages, approved working experiments, search, reference text, saved progress, and the AI Guide must function using school-hosted components. Development may temporarily use the friend's remote Ollama/Qwen connection; that does not qualify for school offline acceptance.

Host locally: app/API, static assets, approved media, catalog/search index, student storage, AI gateway and a properly provisioned on-site model service. Bundle fonts, scripts, textures, WASM and audio. Remove public APIs, CDN fallback, telemetry pixels and undisclosed background network requests. Use signed offline updates and versioned migrations.

Check LAN isolation, authentication and student privacy; do not transmit prompts to third parties without approved arrangements. Test cold start, power interruption, backup/restore, no-WAN operation, storage full, model unavailable, degraded CPU/GPU performance, phone/tablet browsers and at least an initial 30 simultaneous users. Do not assume a named Qwen model fits a given RAM size or can serve 30 concurrent generations until benchmarked.
