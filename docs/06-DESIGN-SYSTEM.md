# Umanah AI Lab Design System


## Locked visual direction

The Umanah AI Lab product should visually belong to the Umanah Institute family: refined, institutional, warm, calm, technically credible, and intentionally unlike a generic SaaS dashboard.

### Core palette

| Token | Value | Intended use |
|---|---|---|
| Warm background | `#F7F5F0` | primary page background |
| Stone outer background | `#E8E5DE` | outer canvas / section contrast |
| Primary navy | `#0B1F3B` | navigation, primary buttons, major headings |
| Navy hover | `#0A2A52` | interactive hover/active state |
| Navy tint | `#E9EEF6` | subtle selected backgrounds and information panels |

Supporting pastel accents may use restrained blue, green, amber, lavender, and rose tints for learning cards, but the UI must remain predominantly warm neutral + navy.

### Typography

- Editorial/serif display style: Libre Baskerville or a metrically compatible serif.
- Interface/body style: Inter or a similar clean humanist sans-serif.
- Avoid futuristic sci-fi typography, neon gradients, glassmorphism-heavy treatment, or gaming aesthetics.

### Component direction

Use **shadcn/ui + Radix primitives** as the default web UI foundation when appropriate. Components should be owned in the repository, themed to the Umanah design tokens, accessible, responsive, and visually unified.

### UX rule

The underlying implementation names—Moodle, Open WebUI, JupyterHub, Ollama, llama.cpp, Chatty-EDU, H5P, SQLite, etc.—must not become the primary student or teacher experience. Umanah LabOS owns the navigation, vocabulary, status model, and overall visual experience.


## Design personality

Institutional, calm, intelligent, warm, durable. The UI should feel at home in a school, library, research institute, or board presentation—not like a crypto dashboard, gaming portal, or consumer social app.

## Layout system

- Max app content width on large displays should preserve readable line lengths while allowing data-rich dashboards.
- Use an 8px-derived spacing scale with consistent vertical rhythm.
- Cards should use restrained radii and fine borders/shadows rather than exaggerated floating glass panels.
- Side navigation is deep navy and visually anchors the product.

## Typography scale

Suggested scale (adjust for implementation):
- Display: 48–64px desktop.
- Page H1: 36–48px serif.
- H2: 28–34px serif or semibold sans depending context.
- H3/card heading: 18–24px.
- Body: 16px primary, 14px secondary.
- Metadata: 12–13px.

## Color semantics

- Navy: authority, primary action, selected navigation.
- Green: healthy/completed/local-ready.
- Blue: informational/progress/in-progress.
- Amber: attention/revision/needs-review.
- Rose/red: errors or required intervention, used sparingly.
- Lavender: knowledge/AI/support accents.

## shadcn/ui policy

Prefer shadcn primitives for buttons, cards, dialogs, tabs, dropdowns, forms, tooltips, sheets/drawers, tables, and accessibility patterns. Theme the source components rather than layering ad-hoc CSS around unmodified defaults.

## Iconography

Use one consistent icon family. Avoid decorative icon mixing. Icons supplement labels; navigation should not rely on icons alone.

## Motion

Subtle transitions for state change, progress completion, card hover, drawer transitions. No gratuitous parallax or large motion in classroom core flows.

## Contrast check

The concept mock-ups use small gray text on pastel cards. Verify every token pair against WCAG AA (`49`) and darken text tokens where needed; the navy/warm-neutral look must hold without failing contrast.

## UI quality gate

Before merge, compare work against the reference images in `../design/reference/` (colors, card tints and component mapping in its README) and the screen specs and verify through Playwright/browser screenshots. A functionally correct UI that visually regresses the Umanah identity is not complete.
