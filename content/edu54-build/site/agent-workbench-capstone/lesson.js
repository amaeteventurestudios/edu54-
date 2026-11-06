// Workbench on a real repo and the capstone pack (lessons 41 and 42). The task on a small sample app: "Add input validation to /signup: reject
// passwords shorter than 8 characters with a 422 and a typed error; add a test that proves it." Twenty seeded runs per pipeline: prompt-only
// (read, edit, claim done) or workbench-guided (init, scope, state, allowed edits, feedback runner, gate, reviewer, handoff). Five outcomes are measured.
// The pack is the workbench as one directory: docs (rules, rubric), schemas (the contract), scripts (the runtime) and an installer.
const OUT = ['tests actually run', 'acceptance proven', 'files outside scope', 'handoff usable', 'reviewer score'];
function runs(o) {
  let x = 23; const r = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  const hasScripts = o.pack !== 'docs', w = o.pipeline === 'workbench';
  const p = w && hasScripts ? { ran: 1, acc: 0.95, out: 0.03, hand: 1 } : w ? { ran: 0.6, acc: 0.6, out: 0.25, hand: 0.4 } : { ran: 0.45, acc: 0.55, out: 0.4, hand: 0 };
  let ran = 0, acc = 0, outside = 0, hand = 0, score = 0;
  for (let i = 0; i < 20; i++) { const a = r() < p.ran, b = a && r() < p.acc, c = r() < p.out, d = r() < p.hand; ran += a; acc += b; outside += c ? 1 + Math.floor(r() * 2) : 0; hand += d; score += (a ? 2 : 0) + (b ? 2 : 0) + (c ? 0 : 2) + (d ? 2 : 0) + (b && !c ? 2 : 1); }
  return { ran, acc, outside, hand, score: score / 20 };
}
function install(o) {
  if (o.existing && !o.force) return { ok: true, msg: 'refused: a pack is already installed (v1.3); run with --force to replace it', overwritten: false };
  if (o.existing && o.force) return { ok: true, msg: 'replaced v1.3 with v2.0: migrate agent_state.json (schema major bump)', overwritten: true };
  return { ok: true, msg: 'installed v2.0 · wired .github/workflows/agent.yml · next: fill the board, set acceptance commands, run init', overwritten: false };
}

export default {
  slug: 'agent-workbench-capstone',
  title: 'The workbench on a real repo, packed to reuse',
  description: 'Run the same sign-up task twenty times with a prompt alone and with the workbench, then pack the workbench as one directory to install in any repo.',
  overview: 'The workbench surfaces are only worth something if they survive a real codebase. Take one task on a small sample app (add password validation to a sign-up endpoint and a test that proves it) and run it two ways. Prompt-only: read the README, read the code, edit, claim done. Workbench-guided: run the init script, read the scope contract and the state, edit only allowed files, run the acceptance command through the feedback runner, pass the verification gate and the reviewer, and generate the handoff. Measure five outcomes: whether the tests actually ran, whether the test that ran proves the goal, how many files changed outside scope, whether the handoff is usable, and the reviewer\'s score. Prompt-only runs often claim tests passed without running them, test a weaker version of the goal, and edit bait files such as the release script. Then package it: a pack directory with the router and rule documents (the rules and the rubric), the schemas (the contract), the four scripts (init, feedback runner, gate, handoff generator; the runtime) and an installer. Leave project tasks, vendor SDK calls and onboarding prose out. The installer refuses to overwrite an existing pack without a force flag, wires CI if it finds a workflows folder, and prints the next steps. The pack is versioned: schema or script changes that need a migration bump the major version, and each repo\'s state records the version it was set up with. Documents without the scripts are rules without enforcement.',
  keywords: ['agent workbench', 'coding agents', 'evaluation', 'A/B test', 'developer tooling', 'AI agents', 'templates'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.05, 0.4, 0], dir: [0.05, 0.75, 1.2], half: 1.2, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pipeline: 'workbench', pack: 'full', existing: false, force: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', GREY = '#B9B3A5', AMB = '#E3A72F';
    /* twenty runs each: a pair of towers per outcome (tests run, acceptance proven, files outside scope, handoff usable, reviewer score),
       grey prompt-only, coloured the pipeline you picked (green better, coral worse) */
    const GX = i => -2.6 + i * 0.6;
    const groups = OUT.map((n, i) => { const a = P.tower(0.22, 0.22, GREY, { h: 0.1 }); a.userData.set({ cap: '' }); a.position.set(GX(i) - 0.13, 0, 0); S.add(a); const b = P.tower(0.22, 0.22, GOOD, { h: 0.1 }); b.userData.set({ cap: '' }); b.position.set(GX(i) + 0.13, 0, 0); S.add(b); return { a, b }; });
    /* the pack: one crate with docs (blue: AGENTS.md, rules, version) and runtime (green: schemas, scripts, installer); docs-only leaves the runtime slots empty */
    const pack = P.shelf(3, { levels: 2, cell: 0.34, lh: 0.32, d: 0.4 }); pack.position.set(0.85, 0, 0); S.add(pack);
    /* the target repo it installs into, with any pack already there, and the installer's lamp */
    const repo = P.box(0.9, 0.06, 0.7, '#D6E4F0', { r: 0.03 }); repo.position.set(2.15, 0, 0); S.add(repo);
    const old = P.box(0.4, 0.3, 0.35, GREY, { r: 0.04 }); old.position.set(2.0, 0.06, 0); S.add(old);
    const neu = P.box(0.4, 0.3, 0.35, GOOD, { r: 0.04 }); neu.position.set(2.0, 0.06, 0); S.add(neu);
    const lamp = P.lamp(GOOD, { h: 0.45, r: 0.1 }); lamp.position.set(2.45, 0.06, 0); S.add(lamp);
    S.add(P.keep(-2.85, 2.7, 1.2, -0.45, 0.45));

    let A = null, B = null, I = null;
    function draw() {
      A = runs({ pipeline: 'prompt', pack: 'full' }); B = runs(st); I = install(st);
      const vals = R => [R.ran / 20, R.acc / 20, R.outside / 20, R.hand / 20, R.score / 10];
      const va = vals(A), vb = vals(B);
      groups.forEach((g, i) => { g.a.userData.set({ h: 0.03 + 1.0 * va[i] }); const good = i === 2 ? vb[i] < va[i] : vb[i] > va[i]; g.b.userData.set({ h: 0.03 + 1.0 * vb[i], color: st.pipeline === 'prompt' ? GREY : good ? GOOD : BAD }); });
      pack.userData.set({ fill: [BLUE, BLUE, BLUE, ...(st.pack === 'full' ? [GOOD, GOOD, GOOD] : [0, 0, 0])] });
      old.visible = st.existing && !st.force; neu.visible = !old.visible;
      lamp.userData.set({ color: st.existing ? (st.force ? AMB : BLUE) : GOOD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Pipeline', options: ['Prompt only', 'Workbench'], get: () => st.pipeline === 'prompt' ? 0 : 1, act: i => set({ pipeline: i ? 'workbench' : 'prompt' }) },
      { type: 'buttons', label: 'What the pack carries', options: ['Docs, schemas, scripts', 'Docs only'], get: () => st.pack === 'full' ? 0 : 1, act: i => set({ pack: i ? 'docs' : 'full' }) },
      { type: 'toggle', label: 'The repo already has a pack (v1.3)', short: 'Existing pack', get: () => st.existing, set: v => set({ existing: !!v }), quick: false },
      { type: 'toggle', label: 'Install with --force', short: '--force', get: () => st.force, set: v => set({ force: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Tests really run', get: () => ({ v: `${B.ran}/20`, sub: `prompt-only ${A.ran}/20`, good: B.ran === 20, bad: B.ran < 15 }) },
      { label: 'Out-of-scope edits', get: () => ({ v: String(B.outside), sub: `prompt-only ${A.outside}`, good: B.outside <= 2, bad: B.outside > 5 }) },
      { label: 'Reviewer', get: () => ({ v: `${B.score.toFixed(1)}/10`, sub: `prompt-only ${A.score.toFixed(1)}`, good: B.score >= 8 }) },
    ];
    const labels = [
      { name: 'ab', t: 'Twenty runs each', d: 'Grey: prompt only. Pairs: run, proven, outside scope, handoff, score', icon: 'target', atV: V(-2.8, 0.2, 0.12) },
      { name: 'pack', t: 'The pack', d: 'Blue docs, green runtime', icon: 'box', atV: V(1.43, 0.2, 0.12) },
      { name: 'repo', t: 'Installed in a repo', d: 'Lamp blue: refused, gold: replaced', icon: 'check', atV: V(2.6, 0.2, 0.12) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run prompt-only', hint: 'read, edit, claim done', on: () => set({ ...D0, pipeline: 'prompt' }), off: reset },
      { label: 'Pack only the documents', hint: 'rules, no scripts', on: () => set({ ...D0, pack: 'docs' }), off: reset },
      { label: 'Install over a tuned pack', hint: '--force on v1.3', on: () => set({ ...D0, existing: true, force: true }), off: reset },
    ];
    function status() {
      if (st.pipeline === 'prompt') return { ok: false, msg: `<b>Prompt-only, the 20 runs really ran the tests ${A.ran} times, proved the goal ${A.acc} times, touched ${A.outside} files outside scope (the release script, the README) and left no usable handoff; the reviewer averages ${A.score.toFixed(1)}/10.</b> Most "tests passed" claims were never checked.` };
      if (st.pack === 'docs') return { ok: false, msg: `<b>With only the documents, the rules are there but nothing enforces them: tests really ran ${B.ran}/20, ${B.outside} out-of-scope edits.</b> The schemas are the contract and the scripts are the runtime; documents alone are rules without enforcement.` };
      if (st.existing && st.force) return { ok: false, msg: '<b>--force replaced the team\'s tuned v1.3 pack with v2.0: their custom rules are gone, and agent_state.json needs a migration for the schema\'s major bump.</b> The installer refuses to overwrite without --force for this reason. Diff the packs first, carry the team\'s rules over, and run the migration.' };
      return { ok: true, msg: `<b>Workbench-guided, all 20 runs really ran the tests, ${B.acc} proved the goal, ${B.outside} out-of-scope edit${B.outside === 1 ? '' : 's'}, a usable handoff every time, reviewer ${B.score.toFixed(1)}/10 (prompt-only ${A.score.toFixed(1)}).</b> ${st.existing ? 'The installer refused to overwrite the existing pack.' : 'The pack installs in one command and prints the next steps.'}` };
    }
    return { update: dt => groups.forEach(g => { g.a.userData.tick(dt); g.b.userData.tick(dt); }), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One task, two ways', home: true, say: 'One small task on a sample app: add password validation to sign-up, and a test that proves it. Run it twenty times without a workbench.', act: m => m.set({ pipeline: 'prompt', pack: 'full', existing: false, force: false }) },
    { t: 'Without a workbench', home: true, say: 'Many runs claim tests passed without running them, prove a weaker goal, or touch files they should not.', act: m => m.set({ pipeline: 'prompt' }) },
    { t: 'With the workbench', home: true, say: 'With init, scope, feedback, the gate, the reviewer and a handoff, every run really runs its tests and stays in scope.', act: m => m.set({ pipeline: 'workbench' }) },
    { t: 'One directory', home: true, say: 'Pack it all into one directory: the rules and the rubric, the schemas, and the scripts that enforce them.', act: m => m.set({ pack: 'full' }) },
    { t: 'Documents are not enough', home: true, say: 'Ship only the documents, and the rules are back to being wishes.', act: m => m.set({ pack: 'docs' }) },
    { t: 'Install carefully', home: true, say: 'The installer refuses to overwrite a team\'s existing pack without force, and the version is recorded for migrations.', act: m => m.set({ pack: 'full', existing: true, force: false }) },
  ],
  check: [
    { q: 'Which outcome do prompt-only runs most often get wrong silently?', options: ['Claiming tests passed without running them', 'Formatting', 'Variable names'], answer: 0, why: 'The feedback runner and gate make it a fact.', hint: 'Compare the first bars.' },
    { q: 'What makes the pack more than documentation?', options: ['Schemas and scripts that enforce the rules', 'Longer documents', 'A logo'], answer: 0, why: 'Rules without enforcement are wishes.', hint: 'Try Pack only the documents.' },
    { q: 'What should the installer do when a pack already exists?', options: ['Refuse unless --force is given', 'Overwrite silently', 'Delete both'], answer: 0, why: 'Teams tune their packs.', hint: 'Try Install over a tuned pack.' },
  ],
  terms: [
    ['A/B run', 'The same task, run with and without a change, measured the same way.'],
    ['Acceptance proven', 'The test that ran is the test that proves the goal.'],
    ['Workbench pack', 'Docs, schemas, scripts and an installer in one directory.'],
    ['Installer', 'Copies the pack, wires CI and prints next steps.'],
    ['Pack version', 'Recorded in each repo; a major bump means a migration.'],
    ['Bait file', 'A file such as a release script that an agent should never touch.'],
  ],
  deeper: '<p><b>What stays out.</b> Project tasks belong on the target repo\'s board, vendor SDK calls make the pack framework-bound, and onboarding prose belongs next to it, not inside.</p><p><b>Versions.</b> Schema bumps and script changes that need a migration bump the major version; documentation changes bump the patch.</p><p><b>About this machine.</b> Twenty seeded runs per pipeline, with failure rates set for each setup; the five outcomes and the installer\'s behaviour are computed live.</p>',
  code: {
    title: 'An installer that refuses to clobber',
    note: 'Adapted from the course\'s workbench capstone.',
    text: `
import shutil, sys, pathlib

def install(pack, target, force=False):
    dest = pathlib.Path(target) / "agent-workbench"
    if dest.exists() and not force:
        sys.exit(f"refused: {dest} exists (version {(dest / 'VERSION').read_text().strip()}); use --force")
    shutil.copytree(pack, dest, dirs_exist_ok=force)
    wf = pathlib.Path(target) / ".github" / "workflows"
    if wf.is_dir():
        shutil.copy(pathlib.Path(pack) / "ci" / "agent.yml", wf / "agent.yml")
    print("next: fill TASKS.md, set acceptance commands, run scripts/init_agent.py")
`,
  },
};
