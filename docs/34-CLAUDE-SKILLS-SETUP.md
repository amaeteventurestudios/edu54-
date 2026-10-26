# Skills Setup and Invocation Matrix

This is the only copy of the skills list in the pack.

## Priority

Not every environment will have all 25 skills. Missing skills never block work.

- **Must have (install first):** `systematic-debugging`, `verification-before-completion`, `writing-plans`, `code-review`, `test-driven-development`, `frontend-design`, `playwright-cli`.
- **Use when available:** everything else below.
- Several names are community skills. Use `find-skills` to confirm each one's real name and source before installing; skip any that can't be verified and use the underlying method instead.
- `vercel-react-best-practices` targets Next.js; apply its React guidance, not its Next.js server patterns, because v1 is a Vite static front end (`07`).


## Required engineering skill set

The following skills are part of the intended autonomous workflow. Install/enable them where the coding environment supports skills. Verify the actual skill documentation and invocation semantics rather than guessing commands.

### Global core — install everywhere

1. `find-skills`
2. `systematic-debugging`
3. `verification-before-completion`
4. `writing-plans`
5. `code-review`
6. `git-guardrails-claude-code`
7. `claude-handoff`
8. `wayfinder`
9. `to-prd`
10. `qa`
11. `skill-creator`
12. `grill-me`

### UI and web projects

13. `frontend-design`
14. `web-design-guidelines`
15. `impeccable`
16. `agent-browser`
17. `playwright-cli`
18. `shadcn`
19. `vercel-react-best-practices`

### Larger engineering projects

20. `codebase-design`
21. `domain-modeling`
22. `test-driven-development`
23. `setup-pre-commit`
24. `using-git-worktrees`
25. `finishing-a-development-branch`

### Invocation policy

- Architecture/domain changes: `codebase-design`, `domain-modeling`, `writing-plans`, then `grill-me` against the plan.
- UI work: `frontend-design`, `web-design-guidelines`, `impeccable`, `shadcn`, `vercel-react-best-practices`.
- Browser validation: `agent-browser` and/or `playwright-cli`.
- New feature implementation: `test-driven-development` where practical and `git-guardrails-claude-code`.
- Failures: `systematic-debugging` before speculative edits.
- Before completion: `verification-before-completion`, `qa`, and `code-review`.
- Branch completion: `finishing-a-development-branch`.
- Long-session continuity: `claude-handoff`.
- If a needed capability is missing: `find-skills`; use `skill-creator` only when a repeatable gap warrants a custom skill.


## Installation procedure

The exact skill installation mechanism depends on the coding environment. Do not fabricate commands. Use the environment’s documented skill manager; start with `find-skills` to locate/verify canonical skill names and install paths. After installation, read each skill’s own instructions before relying on it.

## Recommended bootstrap order

### Foundation
`find-skills`, `writing-plans`, `systematic-debugging`, `verification-before-completion`, `git-guardrails-claude-code`, `qa`, `code-review`.

### Project understanding
`wayfinder`, `to-prd`, `codebase-design`, `domain-modeling`, `grill-me`.

### UI
`frontend-design`, `web-design-guidelines`, `impeccable`, `shadcn`, `vercel-react-best-practices`, `agent-browser`, `playwright-cli`.

### Engineering discipline
`test-driven-development`, `setup-pre-commit`, `using-git-worktrees`, `finishing-a-development-branch`.

### Continuity/extensibility
`claude-handoff`, `skill-creator`.

## Task-to-skill examples

- “Implement Student Dashboard” → frontend-design + web-design-guidelines + shadcn + impeccable + playwright-cli.
- “Pi service keeps crashing” → systematic-debugging + verification-before-completion.
- “Choose Moodle vs lightweight learning service” → writing-plans + codebase-design + domain-modeling + grill-me + benchmark.
- “Prepare merge” → code-review + qa + verification-before-completion + finishing-a-development-branch.

## Skill failure

If a requested skill is unavailable, use `find-skills` to locate an equivalent. If no equivalent exists, proceed using the underlying engineering method rather than blocking. Create a custom skill only for recurring project-specific workflows that clearly benefit from codification.

## AI Node / deployment task mapping

For storage, provisioning, and host deployment work use: `writing-plans`, `codebase-design`, `systematic-debugging`, `git-guardrails-claude-code`, `qa`, and `verification-before-completion`. Use `test-driven-development` for code that parses/discovers storage or manages health state; do not attempt to TDD destructive block-device operations themselves.

For the Umanah web application use the full UI/web set: `frontend-design`, `web-design-guidelines`, `impeccable`, `agent-browser`, `playwright-cli`, `shadcn`, and `vercel-react-best-practices`. Browser-visible work is not complete until rendered behavior is verified.

The 25 skills listed above are the canonical requested set. Do not silently substitute similarly named skills without first using `find-skills` to verify availability/identity.
