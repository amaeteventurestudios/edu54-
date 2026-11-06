// Eval-driven agent development: the student's agent team keeps an eval suite next to the code, one case per lesson of this phase, run in CI on every
// pull request and gated against the main branch's stored baseline: block if the pass rate falls more than 5 points or any critical case regresses.
// Three PRs: a prompt change (fixes two cases, quietly breaks one judged by a model), a refactor that changes nothing, and a change tuned to the
// public cases (held-out cases reveal it). Three cases are flaky unless their seeds are pinned; four are graded by an LLM judge, grounded in a tool
// check or not. Every outcome is computed live from the case table.
const CASES = [
  ['agent loop: budget guard', 'exec', 1], ['ReWOO: replans on a failed tool', 'exec', 0], ['Reflexion: reflection applied on retry', 'judge', 0], ['CRITIC: grounded check passes', 'judge', 0],
  ['tool use: unknown tool rejected', 'exec', 1], ['memory: citations match sources', 'judge', 1], ['memory: stale fact invalidated', 'exec', 0], ['workflows: router picks the right desk', 'exec', 0],
  ['actors: DLQ catches a crash', 'exec', 1], ['guardrail trips on the right inputs', 'exec', 1], ['benchmark: patch passes FAIL_TO_PASS', 'exec', 0], ['computer use: injected text ignored', 'exec', 1],
  ['failure modes: false success detected', 'exec', 1], ['injection: validator refuses forward', 'exec', 1], ['orchestration: right specialist', 'exec', 0], ['runtime: DLQ keeps failed jobs', 'exec', 0],
  ['summary tone is polite', 'judge', 0], ['handoff hop limit escalates', 'flaky', 0], ['debate reaches majority', 'flaky', 0], ['streaming first token < 1 s', 'flaky', 0],
];
const BASE = [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const PRS = [
  { n: 'Prompt change', delta: { 6: 1, 10: 1, 5: 0 }, wrongButJudgedFine: [5] },
  { n: 'Refactor, no behaviour change', delta: {} },
  { n: 'Tuned to the public cases', delta: { 6: 1, 10: 1 }, heldOutDrop: 4 },
];
function evalRun(pr, o) {
  let x = 37 + pr * 7; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  const P = PRS[pr], res = CASES.map((c, i) => {
    let v = i in P.delta ? P.delta[i] : BASE[i];
    if (c[1] === 'flaky' && !o.pin && rnd() < 0.35) v = 0;
    let judged = v;
    if (c[1] === 'judge' && !o.ground && P.wrongButJudgedFine && P.wrongButJudgedFine.includes(i)) judged = 1;
    return { v: judged, truth: v };
  });
  const pass = res.filter(r => r.v).length, base = BASE.filter(Boolean).length;
  const crit = CASES.some((c, i) => c[2] && BASE[i] && !res[i].v);
  const drop = (base - pass) / CASES.length * 100;
  const held = P.heldOutDrop && o.heldOut ? P.heldOutDrop : 0;
  const blocked = o.baseline ? (drop > 5 || crit || held > 2) : false;
  const regressions = res.filter((r, i) => BASE[i] && !r.truth).length;
  return { res, pass, base, drop, crit, held, blocked, regressions, flakyFails: res.filter((r, i) => CASES[i][1] === 'flaky' && !r.v).length, hidden: res.filter(r => r.v && !r.truth).length };
}

export default {
  slug: 'eval-driven-agent-development',
  title: 'Eval-driven development: every change meets the suite',
  description: 'An agent team runs its evaluation suite on every pull request against main\'s baseline. Three pull requests arrive: which should merge?',
  overview: 'Agents are evaluated in three layers. Static benchmarks compare models and catch big regressions, with their contamination caveats. Custom offline evaluations test your own product: by executing the result (run the patch, check the state), by a model judge, or against gold trajectories. Online evaluations watch production: session replays, guardrail alerts, cost and latency per step. Eval-driven development keeps the offline suite next to the code, runs it in CI on every pull request, and gates the merge against a stored baseline from the main branch: for example, block if the pass rate drops by more than five points or any critical case regresses. Every guardrail and every learned rule should map to a case; this phase alone supplies one per lesson, from the loop\'s budget guard to the dead-letter queue. The suite fails in four ways. With no baseline, a number can\'t say whether things got worse. Flaky cases (unpinned randomness, live services) raise false alarms until people ignore the gate; pin seeds and snapshot state. Model judges hallucinate too; ground them in a tool check where you can. And a team can tune to the suite until it stops predicting production; keep held-out cases and rotate them.',
  keywords: ['evaluation', 'eval-driven development', 'CI', 'regression testing', 'LLM as judge', 'AI agents', 'test suites'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.2, 0.15], dir: [0.05, 0.95, 1.2], half: 1.4, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pr: 0, baseline: true, pin: true, ground: true, heldOut: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#D9D4C7';
    /* the suite: a block per case, main's stored baseline in the back row, this pull request in front. Green passes, grey fails on both,
       red a regression, gold a judge passing a wrong answer. Shape is the grader: box a run check, cylinder a model judge, ball a random case;
       a gold slab under a pair marks a critical case */
    const CX = i => -2.85 + i * 0.25, BZ = -0.4, PZ = 0.05;
    const rack = P.box(5.2, 0.06, 0.95, '#6B6E7E', { r: 0.03 }); rack.position.set(CX(9.5), 0, -0.17); S.add(rack);
    const shape = (k, m) => k === 'judge' ? P.cyl(0.09, 0.2, '#fff', { material: m }) : k === 'flaky' ? P.ball(0.1, '#fff', { material: m }) : P.box(0.18, 0.2, 0.18, '#fff', { r: 0.03, material: m });
    const cells = CASES.map((c, i) => {
      if (c[2]) { const g = P.box(0.22, 0.03, 0.8, SAF, { r: 0.01 }); g.position.set(CX(i), 0.06, -0.17); S.add(g); }
      const m1 = new THREE.MeshLambertMaterial({ color: GOOD }), a = shape(c[1], m1); a.position.set(CX(i), c[1] === 'flaky' ? 0.19 : 0.09, BZ); S.add(a);
      const m2 = new THREE.MeshLambertMaterial({ color: GOOD }), b = shape(c[1], m2); b.position.set(CX(i), c[1] === 'flaky' ? 0.19 : 0.09, PZ); S.add(b);
      return { m1, m2, a };
    });
    /* four held-out cases in a locked shelf the pull request never saw */
    const held = P.shelf(4, { cell: 0.3, lh: 0.3, d: 0.3 }); held.position.set(-1.6, 0, 0.75); S.add(held);
    /* the merge gate onto main, with its lamp */
    const pipe = P.pipe([V(2.05, 0.1, -0.17), V(2.35, 0.1, -0.17), V(2.6, 0.1, 0.3)], GOOD, { r: 0.04 }); S.add(pipe);
    const gate = P.gate(0.6, CHAR, { h: 0.5 }); gate.position.set(2.65, 0, 0.45); S.add(gate);
    const lamp = P.lamp(GOOD, { h: 0.55, r: 0.1 }); lamp.position.set(3.1, 0, 0.45); S.add(lamp);
    S.add(P.keep(-3.05, 3.25, 0.9, -0.65, 1.0));

    let R = null;
    function draw() {
      R = evalRun(st.pr, st);
      cells.forEach((c, i) => { c.a.visible = st.baseline; c.m1.color.set(BASE[i] ? GOOD : OFF); const r = R.res[i]; c.m2.color.set(r.v && !r.truth ? SAF : r.v ? GOOD : BASE[i] ? BAD : OFF); });
      const hd = PRS[st.pr].heldOutDrop || 0;
      held.visible = st.heldOut; held.userData.set({ fill: [0, 1, 2, 3].map(i => i < hd ? BAD : GOOD) });
      gate.userData.set({ open: !R.blocked }); lamp.userData.set({ color: !st.baseline ? '#8E8C84' : R.blocked ? RED : GOOD, on: true });
      pipe.userData.set({ on: !R.blocked, color: GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Pull request', options: ['Prompt change', 'Refactor', 'Tuned to cases'], get: () => st.pr, act: i => set({ pr: i }) },
      { type: 'toggle', label: 'Compare with main\'s stored baseline', short: 'Baseline', get: () => st.baseline, set: v => set({ baseline: !!v }) },
      { type: 'toggle', label: 'Pin seeds and snapshot state', short: 'Pinned', get: () => st.pin, set: v => set({ pin: !!v }) },
      { type: 'toggle', label: 'Ground the judge in a tool check', short: 'Grounded judge', get: () => st.ground, set: v => set({ ground: !!v }) },
      { type: 'toggle', label: 'Run held-out cases', short: 'Held-out', get: () => st.heldOut, set: v => set({ heldOut: !!v }) },
    ];
    const truthBad = () => R.regressions > 0 || R.held > 2 || (PRS[st.pr].heldOutDrop && !st.heldOut);
    const readouts = [
      { label: 'Gate', get: () => ({ v: st.baseline ? (R.blocked ? 'blocked' : 'allowed') : 'none', sub: PRS[st.pr].n, good: st.baseline && R.blocked === !!truthBad(), bad: !st.baseline || R.blocked !== !!truthBad() }) },
      { label: 'Pass rate', get: () => ({ v: `${R.pass}/20`, sub: `main ${R.base}/20` }) },
      { label: 'Real regressions', get: () => ({ v: String(R.regressions), sub: 'cases main passed', bad: R.regressions > 0 }) },
    ];
    const labels = [
      { name: 'base', t: 'Main\'s baseline', d: 'Back row. Gold slab: critical', icon: 'book', atV: V(-2.95, 0.2, -0.4), hide: () => !st.baseline },
      { name: 'pr', t: 'This pull request', d: 'Box run, cylinder judge, ball random', icon: 'code', atV: V(-2.95, 0.2, 0.05) },
      { name: 'gate', t: 'Merge gate', d: 'Shut: blocked', icon: 'check', atV: V(3.15, 0.5, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let flaky cases decide', hint: 'unpinned randomness', on: () => set({ ...D0, pr: 1, pin: false }), off: reset },
      { label: 'Grade with an ungrounded judge', hint: 'a wrong answer passes', on: () => set({ ...D0, pr: 0, ground: false }), off: reset },
      { label: 'Keep no held-out cases', hint: 'tuned to the suite', on: () => set({ ...D0, pr: 2, heldOut: false }), off: reset },
    ];
    function status() {
      const pr = PRS[st.pr].n;
      if (!st.baseline) return { ok: false, msg: `<b>Without main's baseline, ${R.pass}/20 is just a number: nothing says whether this pull request made things better or worse, so nothing blocks it.</b> Store the last known good result and compare case by case.` };
      if (st.pr === 1 && R.blocked) return { ok: false, msg: `<b>The refactor changes no behaviour, yet the gate blocked it: ${R.flakyFails} random case${R.flakyFails > 1 ? 's' : ''} failed this run.</b> Flaky cases raise false alarms until people learn to ignore the gate. Pin seeds, snapshot state, and replace live services with recorded ones.` };
      if (st.pr === 0 && !st.ground && !R.blocked) return { ok: false, msg: `<b>The prompt change fixed two cases and broke "memory: citations match sources", but the model judge passed the wrong answer and the merge was allowed.</b> Judges hallucinate too. Ground them in a tool check (do the cited sources contain the claim?), and the regression shows.` };
      if (st.pr === 2 && !st.heldOut) return { ok: false, msg: '<b>Tuned to the suite, this change passes every public case and is merged; held-out cases, had they run, would have shown four failures.</b> Optimising for the suite makes it stop predicting production. Keep held-out cases and rotate them.' };
      return { ok: true, msg: `<b>${pr}: merge ${R.blocked ? 'blocked' : 'allowed'}, and rightly.</b> ${st.pr === 0 ? `It fixed two cases but regressed "memory: citations match sources"; the grounded judge caught it.` : st.pr === 1 ? 'No case changed; with seeds pinned, no false alarm.' : `It passed every public case, but ${R.held} held-out cases failed.`} ${st.pr !== 1 ? 'Fix the regression, then merge.' : ''}` };
    }
    return { update: dt => { gate.userData.tick(dt); pipe.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A suite next to the code', home: true, say: 'An agent team keeps a test case for every lesson of this phase, from the loop\'s budget guard to the dead-letter queue, and runs them all on every change.', act: m => m.set({ pr: 1, baseline: true, pin: true, ground: true, heldOut: true }) },
    { t: 'A gate on main', home: true, say: 'Each pull request is compared with the main branch\'s stored baseline. A drop of more than five points, or any critical case breaking, blocks the merge.', act: m => m.set({ pr: 0 }) },
    { t: 'Flaky cases', home: true, say: 'A harmless refactor gets blocked because three cases depend on chance. Pin the seeds.', act: m => m.set({ pr: 1, pin: false }) },
    { t: 'A judge that agrees', home: true, say: 'A model judge passes a wrong answer, so a real regression slips through. Ground the judge in a tool check.', act: m => m.set({ pr: 0, pin: true, ground: false }) },
    { t: 'Tuned to the test', home: true, say: 'A change tuned to the public cases passes them all. Held-out cases show it got worse.', act: m => m.set({ pr: 2, ground: true, heldOut: true }) },
    { t: 'Every rule is a case', home: true, say: 'Every guardrail and every learned rule should map to a case in the suite.', act: m => m.set({ pr: 0 }) },
  ],
  check: [
    { q: 'Why store main\'s baseline?', options: ['So a pull request is judged by what changed, case by case', 'To save time', 'It is not needed'], answer: 0, why: 'A number alone can\'t show a regression.', hint: 'Try turning off Baseline.' },
    { q: 'A harmless refactor fails three random cases. The fix?', options: ['Pin seeds and snapshot state', 'Delete the gate', 'Rerun until green'], answer: 0, why: 'Flaky evals train people to ignore the gate.', hint: 'Try Let flaky cases decide.' },
    { q: 'Why keep held-out cases?', options: ['To catch changes tuned to the public suite', 'To slow CI', 'They are optional extras'], answer: 0, why: 'Over-fitting to evals diverges from production.', hint: 'Try Keep no held-out cases.' },
  ],
  terms: [
    ['Offline eval', 'Testing the agent on fixed cases before release.'],
    ['Online eval', 'Watching quality in production: replays, alerts, cost.'],
    ['Baseline', 'The last known good result to compare against.'],
    ['Merge gate', 'A CI rule that blocks a change that regresses.'],
    ['Flaky case', 'A test that passes or fails by chance.'],
    ['Held-out cases', 'Cases kept out of tuning to check for over-fitting.'],
  ],
  deeper: '<p><b>Three kinds of check.</b> Execution-based (run it, inspect the state), judge-based (a model scores it, grounded where possible), and trajectory-based (compare the steps with a gold path, which also shows wasted steps).</p><p><b>Comparing two runs.</b> Paired, case-by-case comparison with a confidence interval is covered in the regression-tests lesson.</p><p><b>About this machine.</b> The 20 cases, the three pull requests\' effects and the 35% flake rate are fixed; the gate, the judge\'s verdicts and the held-out check are computed live.</p>',
  code: {
    title: 'Gate a merge on the suite',
    note: 'Adapted from the course\'s eval-driven development lesson.',
    text: `
def gate(results, baseline, critical, held_out=None, max_drop=5.0):
    rate = 100 * sum(results.values()) / len(results)
    base = 100 * sum(baseline.values()) / len(baseline)
    if base - rate > max_drop:
        return False, f"pass rate fell {base - rate:.0f} points"
    broken = [c for c in critical if baseline[c] and not results[c]]
    if broken:
        return False, f"critical cases regressed: {broken}"
    if held_out is not None and sum(held_out.values()) < len(held_out) - 2:
        return False, "held-out cases dropped"
    return True, "ok"

# make cases deterministic: pin seeds, record external calls, snapshot state
`,
  },
};
