# 04 UI, UX and existing website update

**Mandatory:** Inspect existing EDU54 website source and representative desktop/mobile views before implementation. Record color, type, spacing, card hierarchy, icons, animation components, motion timings, page transitions, navigation, and `prefers-reduced-motion`. Preserve visual consistency; do not impose unrelated branding.

Update existing website to introduce **Discovery Lab as third environment** beside K–12 and University. Add discovery card/section and logical menu entry using the *same established animations and transitions*. Honest preview of simulations with working/prototype/planned status. Connect CTA to the actual Discovery Lab route, preserve existing login/navigation. Test on phone and desktop.

Discovery Lab homepage: bold search (“What would you like to explore?”), 13 lab cards, Continue Exploring, featured experiments, curated journeys, optional teacher assignments. Search suggestions appear while typing without Enter.

Lab page: collection/topic filter, experiences grid. Experiment screen: desktop left topics/tools, central large interactive 2D/3D canvas, collapsible right AI Guide, bottom simulation controls and measurements. Mobile: canvas first with tabbed/drawer controls, not squeezed columns. Allow pause/reset, camera orbit/pan/zoom, labels, unit display, actions that genuinely affect simulations, keyboard alternatives and reduced motion.

Distinguish illustrative animations from numerical simulations, display assumptions and safety notes, provide low-performance mode, no external CDN assets. Reuse existing site animation primitives for website cards and transitions rather than creating a second style system.
