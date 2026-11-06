// Verification gates and reviewer agents (lessons 38 and 39): three close-outs of the fees-app receipt export.
// The gate reads the feedback records, the scope report and the rule report and gives one deterministic verdict: block findings stop "done", warn
// findings annotate it; only a person can override a block, with a recorded reason. The reviewer is a second role with read-only access that scores
// five dimensions 0 to 2 (below 7 a soft fail; below 5 or any 0 a hard fail). An "LLM gate" instead re-judges each run and can flip.
const SUBS = [
  { n: 'A: the careful run', acc: [['pytest tests/test_export.py', 0]], nullExit: false, forbidden: 0, offScope: 0, blockRules: 0, rubric: [2, 2, 2, 2, 2] },
  { n: 'B: tests prove less', acc: [['pytest tests/test_export.py -k ascii', 0]], nullExit: false, forbidden: 0, offScope: 0, blockRules: 0, rubric: [2, 2, 1, 0, 2], note: 'the acceptance test only checks ASCII names, not the comma case' },
  { n: 'C: loose ends', acc: [['pytest tests/test_export.py', 0], ['python scripts/smoke_export.py', null]], nullExit: true, forbidden: 0, offScope: 1, blockRules: 0, rubric: [2, 1, 1, 1, 0] },
];
const DIMS = ['problem fit', 'scope discipline', 'assumptions written down', 'verification quality', 'handoff readiness'];
function gate(s) {
  const f = [];
  if (!s.acc.length) f.push(['block', 'no acceptance command ran']);
  s.acc.forEach(([c, e]) => { if (e === null) f.push(['block', `${c}: exit code null`]); else if (e !== 0) f.push(['block', `${c}: exit ${e}`]); });
  if (s.forbidden) f.push(['block', `${s.forbidden} forbidden write`]);
  if (s.offScope) f.push(['warn', `${s.offScope} off-scope file (scripts/smoke_export.py)`]);
  if (s.blockRules) f.push(['block', `${s.blockRules} block rule failed`]);
  return { f, passed: !f.some(x => x[0] === 'block') };
}
function review(s) { const t = s.rubric.reduce((a, b) => a + b, 0), hard = t < 5 || s.rubric.includes(0); return { t, verdict: hard ? 'hard fail' : t < 7 ? 'soft fail' : 'pass' }; }

export default {
  slug: 'verification-gates-and-reviewers',
  title: 'Gates and reviewers: no agent marks its own work',
  description: 'Three agent runs of the fees-app receipt export ask to be marked done.',
  overview: 'The agent doesn\'t get to mark its own work as done. A verification gate reads the artifacts of the task (the feedback records, the scope report, the rule report and the diff) and answers one question: is the task actually complete? Its checks are facts: every acceptance command ran, every one exited zero, no exit code is null, no forbidden file was written, every block-severity rule passed; off-scope files are a warning. A block finding prevents "done", and only a person can override it, with a recorded reason and name. The gate must be deterministic, giving the same verdict for the same artifacts every time, so no model judges inside it; it writes one report to one path that CI reads too. Judgement belongs to a reviewer: a second role with a different prompt, different inputs and read-only access, scoring the work on problem fit, scope discipline, written-down assumptions, verification quality and handoff readiness, 0 to 2 each. Below 7 of 10 is a soft fail; below 5, or any zero, a hard fail. It can be the same model as the builder; the separation of roles is what creates the signal. The gate catches broken facts; the reviewer catches the right facts about the wrong thing, such as a passing test that only proves a weaker version of the goal.',
  keywords: ['verification gate', 'code review agent', 'coding agents', 'AI agents', 'quality gates', 'LLM as judge', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { s: 2, gateOn: true, det: true, reviewer: true, edits: false, run: 1 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const agent = P.robot('#3D6BD6', { scale: 0.85 }); agent.position.set(-2.1, 0.12, 0.2); floor.add(agent);
    const belt = P.belt(V(-1.75, 0.12, 0.2), V(0.1, 0.12, 0.2), { w: 0.34, speed: 0.8 }); floor.add(belt);


    /* gate */
    const GX = -0.2, gm = new THREE.MeshLambertMaterial({ color: GOOD }), g = P.box(0.55, 0.55, 0.55, '#fff', { r: 0.08, material: gm }); g.position.set(GX, 0.12, -0.6); floor.add(g);


    /* reviewer */
    const RX = 1.95;
    const judge = P.robot('#7B6FA8', { scale: 0.7 }); judge.position.set(RX - 0.7, 0.12, 0.2); floor.add(judge);

    const dims = DIMS.map((d, i) => { const z = -0.78 + i * 0.3; const pips = [0, 1].map(k => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.16, 0.06, 0.16, '#fff', { r: 0.03, material: mm }); b.position.set(RX + 0.55 + k * 0.22, 0.14, z); floor.add(b); return mm; }); return { pips }; });
    const vM = new THREE.MeshLambertMaterial({ color: GOOD }), vb = P.box(2.0, 0.04, 0.45, '#fff', { r: 0.04, material: vM }); vb.position.set(RX, 0.14, 0.95); floor.add(vb);


    let G = null, Rv = null, done = false, clock = 0;
    function draw() {
      const s = SUBS[st.s];
      G = gate(s);
      if (!st.det) { const flip = ((st.s * 7 + st.run * 13) % 3) === 0; if (flip) G = { f: [['?', 'the model judged it complete this time']], passed: !G.passed || true }; }
      Rv = review(s); let rub = s.rubric.slice();
      if (st.edits && Rv.verdict !== 'pass') { rub = rub.map(x => Math.max(x, 2)); Rv = { t: 10, verdict: 'pass (after it edited the diff)' }; }
      const gatePass = st.gateOn ? G.passed : true;
      gm.color.set(!st.gateOn ? '#D9D4C7' : gatePass ? GOOD : RED);
      dims.forEach((d, i) => d.pips.forEach((mm, k) => mm.color.set(!st.reviewer ? '#EEEAE0' : k < rub[i] ? (st.edits && rub[i] !== s.rubric[i] ? SAF : GOOD) : '#E4E0D6')));
      done = gatePass && (!st.reviewer || Rv.verdict.startsWith('pass'));
      vM.color.set(done ? GOOD : RED);
      judge.visible = !!st.reviewer;

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Close-out', options: ['A careful', 'B weak test', 'C loose ends'], get: () => st.s, act: i => set({ s: i }) },
      { type: 'toggle', label: 'Verification gate decides "done"', short: 'Gate', get: () => st.gateOn, set: v => set({ gateOn: !!v }) },
      { type: 'toggle', label: 'Deterministic gate (no model inside)', short: 'Deterministic', get: () => st.det, set: v => set({ det: !!v }) },
      { type: 'toggle', label: 'Read-only reviewer scores the work', short: 'Reviewer', get: () => st.reviewer, set: v => set({ reviewer: !!v }) },
      { type: 'button', label: 'Run the gate again', act: () => set({ run: st.run + 1 }) },
    ];
    const truth = () => st.s === 0;
    const readouts = [
      { label: 'Gate', get: () => ({ v: !st.gateOn ? 'off' : G.passed ? 'passed' : 'blocked', sub: `${G.f.filter(x => x[0] === 'block').length} block, ${G.f.filter(x => x[0] === 'warn').length} warn` }) },
      { label: 'Review', get: () => ({ v: st.reviewer ? `${Rv.t}/10` : 'off', sub: st.reviewer ? Rv.verdict : 'no second role' }) },
      { label: 'Marked done', get: () => ({ v: done ? 'yes' : 'no', sub: done === truth() ? 'correctly' : 'wrongly', good: done === truth(), bad: done !== truth() }) },
    ];
    const labels = [
      { name: 'gate', t: 'The gate', d: 'Facts, the same every time', icon: 'shield', atV: V(GX - 0.32, 0.4, -0.6) },
      { name: 'rev', t: 'The reviewer', d: 'Judgement, no write access', icon: 'eye', atV: V(3.12, 0.2, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the builder mark itself done', hint: 'no gate, no reviewer', on: () => set({ ...D0, gateOn: false, reviewer: false }), off: reset },
      { label: 'Use a model as the gate', hint: 'verdicts flip', on: () => set({ ...D0, det: false, run: 1 }), off: reset },
      { label: 'Let the reviewer fix what it reviews', hint: 'roles mixed', on: () => set({ ...D0, s: 1, edits: true }), off: reset },
    ];
    function status() {
      const s = SUBS[st.s];
      if (!st.gateOn && !st.reviewer) return { ok: false, msg: `<b>The builder marked "${s.n}" done itself${st.s ? ', and it isn\'t: ' + (st.s === 1 ? 'its test proves only the ASCII case' : 'a smoke run never returned and a file fell outside scope') : ''}.</b> The builder can\'t grade its own work. A deterministic gate checks the facts; a reviewer in a different role judges the rest.` };
      if (!st.det && G.f.some(x => x[0] === '?')) return { ok: false, msg: `<b>On run ${st.run} the model-judged gate called "${s.n}" complete, despite ${gate(s).f.filter(x => x[0] === 'block').length} block finding${gate(s).f.filter(x => x[0] === 'block').length === 1 ? '' : 's'}.</b> Run it again and the verdict can change. A gate must give the same verdict for the same artifacts every time; models belong on the reviewer side.` };
      if (st.edits) return { ok: false, msg: '<b>The reviewer "fixed" the weak acceptance test itself and then approved the result: 10/10.</b> Nobody reviewed its fix. The reviewer reads and reports; the next builder turn does the fix, and the reviewer reviews again.' };
      if (st.s === 1) return { ok: true, msg: `<b>The gate passed B: the acceptance command ran and exited zero. The reviewer failed it: verification quality 0, because the test only checks ASCII names and never the comma case.</b> The gate catches broken facts; the reviewer catches the right facts about the wrong thing.` };
      if (st.s === 2) return { ok: true, msg: '<b>The gate blocked C: the smoke run\'s exit code is null, and a file fell outside scope (a warning). The reviewer agrees: handoff readiness 0.</b> Only a person can override a block, with a recorded reason.' };
      return { ok: true, msg: '<b>A passes the gate (every acceptance command ran and exited zero, nothing out of scope) and the reviewer (10/10): done.</b> One report, at one path, that CI reads too.' };
    }
    return { update: dt => { clock += dt; if (clock > 1.2) { clock = 0; belt.userData.send(done ? GOOD : RED, { size: 0.17 }); } belt.userData.tick(dt); agent.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three runs ask to be done', home: true, say: 'Three agent runs of the same receipt export ask to be marked done. One is careful, one tests too little, one leaves loose ends.', act: m => m.set({ s: 0, gateOn: true, det: true, reviewer: true, edits: false, run: 1 }) },
    { t: 'A gate of facts', home: true, say: 'The gate reads the test records and reports. A smoke run with no exit code blocks "done".', act: m => m.set({ s: 2 }) },
    { t: 'The same every time', home: true, say: 'Ask a model to be the gate, and run it again: the verdict can change. A gate must be deterministic.', act: m => m.set({ det: false, run: 1 }) },
    { t: 'A reviewer', home: true, say: 'The second run passes the gate, but the reviewer sees its test only checks simple names. A hard fail.', act: m => m.set({ det: true, s: 1 }) },
    { t: 'Separate roles', home: true, say: 'The reviewer reads and reports. If it fixes the code itself, nobody reviews the fix.', act: m => m.set({ edits: true }) },
    { t: 'Done means done', home: true, say: 'The careful run passes both, and is marked done.', act: m => m.set({ edits: false, s: 0 }) },
  ],
  check: [
    { q: 'Why must the verification gate be deterministic?', options: ['The same artifacts must always give the same verdict', 'Models are slow', 'To save tokens'], answer: 0, why: 'Models belong on the reviewer side.', hint: 'Try Use a model as the gate.' },
    { q: 'A run\'s tests pass but only prove a weaker goal. Who catches it?', options: ['The reviewer', 'The gate', 'Nobody'], answer: 0, why: 'Verification quality is a judgement.', hint: 'Pick B weak test.' },
    { q: 'Who can override a block finding?', options: ['A person, with a recorded reason', 'The builder agent', 'The reviewer'], answer: 0, why: 'An override is a signed change.', hint: 'Pick C loose ends.' },
  ],
  terms: [
    ['Verification gate', 'A deterministic check of a task\'s artifacts before "done".'],
    ['Block finding', 'A gate result that prevents "done".'],
    ['Warn finding', 'A gate result that annotates the verdict.'],
    ['Override', 'A person\'s recorded decision to pass a blocked task.'],
    ['Reviewer agent', 'A second role, read-only, scoring the work.'],
    ['Rubric', 'Five dimensions scored 0 to 2.'],
  ],
  deeper: '<p><b>One report, one path.</b> The gate writes one verification report per task at a fixed path, which CI reads too; several gates writing to different places fork the truth.</p><p><b>Same model, different role.</b> The reviewer can be the same model as the builder; a different prompt, different inputs and no write access are what make the review mean something.</p><p><b>About this machine.</b> The three close-outs\' artifacts and the reviewer\'s scores are fixed; the gate\'s findings and verdicts, and the final decision, are computed live.</p>',
  code: {
    title: 'A deterministic gate',
    note: 'Adapted from the course\'s verification-gate lesson.',
    text: `
def verify(task, feedback, scope, rules):
    findings = []
    ran = {r["command"] for r in feedback}
    for cmd in task.acceptance:
        if cmd not in ran:
            findings.append(("block", f"{cmd} never ran"))
    for r in feedback:
        if r["exit_code"] is None:
            findings.append(("block", f"{r['command']}: exit code null"))
        elif r["exit_code"] != 0:
            findings.append(("block", f"{r['command']}: exit {r['exit_code']}"))
    findings += [("block", f) for f in scope.forbidden] + [("warn", f) for f in scope.off_scope]
    findings += [("block", r.slug) for r in rules if r.severity == "block" and not r.ok]
    return {"passed": not any(s == "block" for s, _ in findings), "findings": findings}
`,
  },
};
