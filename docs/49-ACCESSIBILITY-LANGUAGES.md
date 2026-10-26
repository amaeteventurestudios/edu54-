# Accessibility and Languages

> Design system: `06-DESIGN-SYSTEM.md`. Student experience: `16-STUDENT-EXPERIENCE.md`.

## Accessibility target

**WCAG 2.2 Level AA** for every student, teacher and admin screen and the public website.

US public schools are covered by the Justice Department's ADA Title II web accessibility rule, which requires WCAG 2.1 AA. In April 2026 the DOJ extended the compliance dates by one year, to April 2027 for larger public entities and April 2028 for smaller ones. Schools will ask vendors for evidence, so we build to 2.2 AA from the start and publish an accessibility conformance report (VPAT) before pilots.

## Specific requirements

- **Contrast:** all text meets 4.5:1 (3:1 for large text). Check the pastel learning cards and small gray metadata text in particular; adjust tokens in `06` if needed.
- **Keyboard:** every action works without a mouse, with visible focus.
- **Screen readers:** semantic headings and landmarks; live regions announce streamed tutor replies politely, not word by word.
- **Code editor:** use an editor with accessibility support (CodeMirror 6); run and reset reachable by keyboard; output announced.
- **Math:** render with MathML or an accessible math renderer so screen readers can read equations.
- **Read aloud:** optional text-to-speech for lessons and tutor replies using a local, offline voice engine (candidates: Piper; verify license).
- **Reading support:** adjustable text size, dyslexia-friendly font option, line spacing, simple-language setting for the tutor.
- **Motion:** respect reduced-motion; celebrations are brief and optional.
- **Time:** no timed interactions except teacher-set assessments, which support extended-time accommodations.
- **Color:** never the only signal for status.

## Testing

Automated checks (axe) on every screen in CI; manual keyboard and screen-reader pass (NVDA on Windows, VoiceOver on Mac, ChromeVox on Chromebook) at each phase gate.

## Languages

Many communities Umanah serves include students who read another language better than English.

- **From day one:** every interface string lives in translation files (no hard-coded text); layouts tolerate longer text and right-to-left scripts.
- **Tutor:** replies in the student's chosen language when the model supports it well; multilingual quality is part of model benchmarking (`25`, `43`).
- **Content:** curriculum packs carry a language code; the same lesson can have several language versions.
- **Safety:** the rules layer and safety test set exist per supported language (`41`) before that language is enabled for students.
- **Owner decision:** choose the first additional language (Spanish is the most common need in US schools) based on the first pilot sites.

## Low-end devices

The student app must work on a 4 GB Chromebook and a 1366×768 screen. Budget JavaScript size, lazy-load Build Lab, and test on a real low-end device at each phase gate.
