# 05 Modular simulation architecture

Build within or alongside the existing platform only after mapping its router, frontend, auth, student records, storage, app shell, UI library and API services. Aim for **one coherent shell, many swappable simulations**, not 13 unrelated web apps.

Each experience has a manifest (`id`, `labId`, `topicId`, title, 2D/3D, depth modes, source SHA, license/asset status, offline status, access requirements) and a standard adapter: `mount(container, context)`, `getState()`, `applyAction(validatedAction)`, `reset()`, `pause()`, `dispose()`. `getState()` exposes numeric parameters, units and observations to the AI Guide; never expose secrets. `applyAction()` must only accept explicit allowlisted operations. Maintain reproducible experiment presets, saved state, deterministic measurements and reliable cleanup when switching modules.

Create one local catalog, search index, progress service, attribution view, AI model gateway and deep-link service. K–12 and university assignments launch the **same** module with appropriate presets and optional quiz, and can return to course context. 2D, 3D and hybrid experiences share controls without requiring the same rendering engine. Scientific calculation should be testable independently of graphics.

Audit imported code for sandboxing/security and scientific validity. Avoid raw arbitrary iframe embedding. Do not claim high-precision physics when it is approximate visual teaching animation. New route names are proposed only; conform to actual router.
