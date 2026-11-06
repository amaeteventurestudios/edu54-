// Exam prep, Claude Code configuration at scale: an invented fintech team in Lagos keeps API code, database migrations and docs in one
// repository. The learner picks the file a task touches and sees what loads into context: a short root CLAUDE.md, the path rule whose glob
// matches, and the migration-review skill body only when its description triggers. A read-only auditor subagent returns a structured
// obstacle report instead of widening its tools, and CI runs a fresh headless review that writes JSON findings while deterministic tests
// decide. Token counts and minutes are illustrative.
const TASKS = [
  { k: 'docs', n: 'docs/guide.md', rule: 'docs/**', ruleN: 'style and link checks', test: 'link check', min: 1 },
  { k: 'mig', n: 'migrations/0042_index.sql', rule: 'migrations/**', ruleN: 'append-only, rollback', test: 'migration checks', min: 3 },
  { k: 'api', n: 'src/api/refunds.py', rule: 'src/api/**', ruleN: 'contract and auth tests', test: 'contract tests', min: 4 },
];

function run(o) {
  const t = TASKS.find(x => x.k === o.task);
  const root = o.lean ? 1.2 : 9;
  const rule = (t.k !== 'mig' || o.glob) ? 0.6 : 0;
  const skill = t.k === 'mig' && o.desc ? 1.5 : 0;
  const tokens = root + rule + skill;
  const min = o.lean ? t.min : 40;
  const issues = [], short = [];
  if (!o.lean) { issues.push(`every task carries ${root}k tokens of root guidance, and "always run every test" turns a ${t.test} into the ${min}-minute suite`); short.push('bloated root file'); }
  if (!o.glob) { issues.push('the migrations rule is written for migration/** and matches no file, so it never loads: false confidence'); short.push('glob matches nothing'); }
  if (!o.desc) { issues.push('the skill\'s description says only "helps with database stuff", so a migration review does not trigger it'); short.push('skill never triggers'); }
  if (!o.obstacle) { issues.push('the auditor could not read the schema and widened its own tools instead of returning blocked with a next step'); short.push('auditor widened tools'); }
  if (!o.fresh) { issues.push('CI reused a developer\'s session and local overrides, so its review cannot be reproduced'); short.push('CI not reproducible'); }
  return { t, root, rule, skill, tokens, min, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-claude-code-memory-rules-skills-and-ci',
  title: 'Exam prep: memory, path rules, skills and CI',
  description: 'A team\'s repository holds API code, migrations and docs. Pick a file and see what loads for it, then find which faults quietly stop a rule from working.',
  overview: 'Claude Code configuration works best when each piece of guidance sits at the narrowest scope where it is true, and when hard constraints are executed rather than written. The root CLAUDE.md should be a short onboarding router: purpose, canonical build and test commands, source-of-truth files, security constraints and pointers to deeper guidance. Long manuals, temporary task status and rules for one directory do not belong there, because the root file loads into every task. Path rules carry guidance true only for matching files, such as contract tests for API code or append-only migrations; test their globs, because a rule that never matches gives false confidence and one that matches everything recreates the bloated root file. A skill packages a repeatable procedure, with references and scripts, that loads only when relevant; its description is a trigger contract that should say what it does and when it applies, tested on requests that should and should not trigger it, and its allowed-tools grant should be as narrow as the procedure. Project subagents get a description, a restricted tool list and a turn budget, and should return a structured result with status, evidence, blockers and next step, so a blocked agent reports the obstacle rather than widening its own scope. Headless CI should start from a clean commit and declared inputs with least-privilege tools, a recorded model and bounds, emit structured findings with stable IDs, and leave the pass or fail decision to deterministic tests and policy gates. This machine follows an invented team in Lagos; the numbers are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'claude code', 'claude.md', 'path rules', 'skills', 'subagents', 'headless ci', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.05], dir: [0.05, 1.05, 1.12], half: 1.15, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { task: 'mig', lean: true, glob: true, desc: true, obstacle: true, fresh: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* three folders of the repository; the one the task touches is lit, coral if its rule's glob matches nothing */
    const FZ = i => -0.65 + i * 0.62;
    const folders = TASKS.map((t, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.6, 0.34, 0.44, '#fff', { r: 0.04, material: m }); b.position.set(-2.2, 0, FZ(i)); S.add(b); return m; });
    /* what loads into context: three token towers (root file, path rule, skill body), the folder wired to the rule when its glob matches */
    const TX = i => -1.0 + i * 0.6, TZ = -0.45;
    const towers = [BLUE, GOOD, '#7B6FA8'].map((c, i) => { const b = P.tower(0.42, 0.42, c); b.userData.set({ cap: '' }); b.position.set(TX(i), 0, TZ); b.userData.noFit = true; S.add(b); return b; });
    const wire = P.rod(V(-1.9, 0.2, FZ(1)), V(TX(1) - 0.2, 0.15, TZ), 0.02, GOOD); wire.userData.noFit = true; S.add(wire);
    /* the time the checks take */
    const clock = P.tower(0.42, 0.42, '#E3A72F'); clock.userData.set({ cap: '' }); clock.position.set(0.85, 0, TZ); clock.userData.noFit = true; S.add(clock);
    /* the read-only auditor and the CI runner; the antenna lamp shows whether each stayed in bounds */
    const aud = P.robot('#7B6FA8', { scale: 0.55 }); aud.position.set(1.55, 0, TZ); S.add(aud);
    const ci = P.robot('#3B3F52', { scale: 0.55 }); ci.position.set(1.55, 0, 0.45); S.add(ci);
    S.add(P.keep(-2.55, 1.85, 1.1, -1.0, 0.8));

    let R = null;
    function draw() {
      R = run(st);
      TASKS.forEach((t, i) => folders[i].color.set(t.k !== st.task ? OFF : t.k === 'mig' && !st.glob ? BAD : SAF));
      const i = TASKS.findIndex(t => t.k === st.task), a = V(-1.9, 0.2, FZ(i)), b = V(TX(1) - 0.2, 0.15, TZ);
      P.setRod(wire, a, b); wire.visible = R.rule > 0;
      [R.root, R.rule, R.skill].forEach((v, k) => towers[k].userData.set({ h: Math.max(0.03, Math.min(1, v / 9) * 1.0), color: (k === 0 && !st.lean) || (k === 2 && st.task === 'mig' && !R.skill) || (k === 1 && !R.rule) ? BAD : [BLUE, GOOD, '#7B6FA8'][k] }));
      clock.userData.set({ h: Math.max(0.05, R.min / 40 * 1.0), color: R.min > 10 ? BAD : '#E3A72F' });
      aud.userData.set({ lamp: st.obstacle ? GOOD : BAD, color: st.obstacle ? '#7B6FA8' : BAD });
      ci.userData.set({ lamp: st.fresh ? GOOD : BAD, color: st.fresh ? '#3B3F52' : BAD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Task touches', options: TASKS.map(t => t.n.split('/')[0]), get: () => TASKS.findIndex(t => t.k === st.task), act: i => set({ task: TASKS[i].k }) },
      { type: 'toggle', label: 'Root CLAUDE.md as a short router', short: 'Lean root', get: () => st.lean, set: v => set({ lean: !!v }) },
      { type: 'toggle', label: 'Path rule glob tested against files', short: 'Glob tested', get: () => st.glob, set: v => set({ glob: !!v }) },
      { type: 'toggle', label: 'Skill description says what and when', short: 'Skill trigger', get: () => st.desc, set: v => set({ desc: !!v }) },
      { type: 'toggle', label: 'Subagent reports obstacles', short: 'Obstacle report', get: () => st.obstacle, set: v => set({ obstacle: !!v }) },
      { type: 'toggle', label: 'CI runs a fresh headless review', short: 'Fresh CI', get: () => st.fresh, set: v => set({ fresh: !!v }) },
    ];
    const readouts = [
      { label: 'Context loaded', get: () => ({ v: `${R.tokens.toFixed(1)}k`, sub: 'tokens of guidance', good: R.tokens < 4, bad: R.tokens > 8 }) },
      { label: 'Checks', get: () => ({ v: `${R.min} min`, sub: st.lean ? R.t.test : 'every test', good: R.min < 10, bad: R.min > 10 }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'configuration faults', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'r', t: 'Path rules', d: 'Load only where the glob matches', icon: 'box', atV: V(-2.5, 0.2, -0.03) },
      { name: 't', t: 'What it costs', d: 'Tokens, then minutes of checks', icon: 'target', atV: V(1.06, 0.12, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put everything in the root file', hint: 'it loads into every task', on: () => set({ ...D0, task: 'docs', lean: false }), off: reset },
      { label: 'Mistype the migrations glob', hint: 'the rule never loads', on: () => set({ ...D0, glob: false }), off: reset },
      { label: 'Write a vague skill description', hint: 'it never triggers', on: () => set({ ...D0, desc: false }), off: reset },
      { label: 'Let CI reuse a dev session', hint: 'not reproducible', on: () => set({ ...D0, fresh: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>A change to ${R.t.n} loads a short root file, the ${R.rule ? R.t.rule : ''} rule${R.skill ? ' and the migration-review skill' : ''}: ${R.tokens.toFixed(1)}k tokens and ${R.min} minutes of ${R.t.test}.</b> The auditor reports obstacles, and CI runs a fresh read-only review while tests decide.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Narrowest true scope for guidance, tested triggers, bounded agents and a fresh CI run.` };
    }
    return { update: dt => { towers.forEach(t => t.userData.tick(dt)); clock.userData.tick(dt); aud.userData.tick(dt); ci.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One huge file', home: true, say: 'A team keeps every instruction in one root file, and it loads into every task.', act: m => m.set({ task: 'docs', lean: false, glob: false, desc: false, obstacle: false, fresh: false }) },
    { t: 'A short router', home: true, say: 'The root file becomes a short router, and a docs edit runs only the link check.', act: m => m.set({ task: 'docs', lean: true, glob: false, desc: false, obstacle: false, fresh: false }) },
    { t: 'Test the glob', home: true, say: 'A path rule that matches no file gives false confidence. Test it against real paths.', act: m => m.set({ task: 'mig', lean: true, glob: true, desc: false, obstacle: false, fresh: false }) },
    { t: 'A skill that triggers', home: true, say: 'The skill\'s description says what it does and when, so a migration review loads it.', act: m => m.set({ task: 'mig', lean: true, glob: true, desc: true, obstacle: false, fresh: false }) },
    { t: 'A bounded auditor', home: true, say: 'When the auditor is blocked, it reports the obstacle and a next step, not wider tools.', act: m => m.set({ task: 'mig', lean: true, glob: true, desc: true, obstacle: true, fresh: false }) },
    { t: 'CI starts fresh', home: true, say: 'CI runs a fresh read-only review with structured findings, and the tests decide.', act: m => m.set({ task: 'api', lean: true, glob: true, desc: true, obstacle: true, fresh: true }) },
  ],
  check: [
    { q: 'What should the root CLAUDE.md be?', options: ['A short router to deeper guidance', 'The full manual', 'A task status log'], answer: 0, why: 'It loads into every task.', hint: 'Try Put everything in the root file.' },
    { q: 'Why test a path rule\'s glob?', options: ['A rule that never matches gives false confidence', 'Globs slow Claude down', 'Globs are optional'], answer: 0, why: 'Test against fixture paths.', hint: 'Try Mistype the migrations glob.' },
    { q: 'What decides whether a skill loads?', options: ['Its description, as a trigger contract', 'Its file size', 'Alphabetical order'], answer: 0, why: 'Say what it does and when.', hint: 'Try Write a vague skill description.' },
  ],
  practice: [
    { q: 'A rule applies only to files under migrations/. Where should it live?', options: ['A path rule scoped to that directory', 'The root CLAUDE.md', 'Each developer\'s user memory', 'A CI comment'], answer: 0, why: 'Narrowest true scope.' },
    { q: 'What does a skill\'s allowed-tools field do?', options: ['Pre-approves matching tools for that invocation, without overriding deny rules', 'Grants permanent session permissions', 'Restricts every other tool in the session', 'Disables hooks'], answer: 0, why: 'Keep it as narrow as the procedure.' },
    { q: 'A read-only subagent cannot open a schema file. What should it return?', options: ['Status blocked, the obstacle, evidence tried and a next step', 'A guess about the schema', 'A request for write access to everything', 'Nothing'], answer: 0, why: 'Report, do not widen.' },
    { q: 'How should headless CI review differ from an interactive session?', options: ['Clean commit, declared inputs, least privilege, structured findings', 'It reuses the developer\'s session for context', 'It applies fixes directly to main', 'It decides merges by itself'], answer: 0, why: 'Reproducibility needs fresh state.' },
    { q: 'A remediation run must check whether earlier findings were fixed. What should it receive?', options: ['The original findings with stable IDs, the diff and tests', 'A one-line summary of the earlier run', 'The whole earlier conversation', 'Nothing: it rediscovers them'], answer: 0, why: 'Structured findings survive across runs.' },
    { q: 'When should a subagent get worktree isolation?', options: ['When it edits files', 'Always, even for reading', 'Never', 'Only in CI'], answer: 0, why: 'A reader needs only a separate context.' },
  ],
  terms: [
    ['Root CLAUDE.md', 'Short project guidance that loads into every task.'],
    ['Path rule', 'Guidance that loads only for files matching its glob.'],
    ['Skill', 'A packaged procedure that loads when its description fits the task.'],
    ['Trigger contract', 'A skill description stating what it does and when it applies.'],
    ['Obstacle report', 'A structured blocked result with the reason and a next step.'],
    ['Headless review', 'A non-interactive run from a clean commit that emits structured findings.'],
  ],
  deeper: '<p><b>Distribution.</b> Commit skills and agents for one repository; package them as a pinned plugin when several repositories need the same bundle; keep organisation policy in managed settings.</p><p><b>Hook contracts.</b> A command hook either exits 0 with structured output or exits 2 with a blocking reason; check which events can block.</p><p><b>About this machine.</b> The team and numbers are invented.</p>',
  code: {
    title: 'A skill whose description is a trigger contract',
    note: 'Written for this lesson.',
    text: `
# .claude/skills/migration-review/SKILL.md
---
name: migration-review
description: Review database migration files when a change adds or edits
  paths under migrations/. Use before merge to collect forward, rollback,
  locking and data-safety evidence.
allowed-tools: Read Grep Glob Bash(python3 \${CLAUDE_SKILL_DIR}/scripts/check_scope.py *)
---
1. Run scripts/check_scope.py on each path; stop if it fails.
2. Read references/checklist.md when you reach the review step.
3. Return JSON: status, evidence, blockers, next_step.
   Never replace missing evidence with an assumption.
`,
  },
};
