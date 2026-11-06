// Agent benchmarks: SWE-bench-style grading of an agent's patches on 12 issues from the student's team's own repos.
// A patch resolves an issue only if every FAIL_TO_PASS test now passes and no PASS_TO_PASS test breaks. Some issues leak the fix in their text
// (contamination) and some have tests too weak to tell a real fix from a lucky one. Cost per task (agent steps and tokens) is reported as a
// distribution: P50, P75, P95. All scores below are computed live from the per-task records.
const T = [
  { id: 1, f2p: [1, 1], p2p: 0, leak: false, weak: false, steps: 9, tok: 41 },
  { id: 2, f2p: [1, 1, 1], p2p: 0, leak: true, weak: false, steps: 4, tok: 18 },
  { id: 3, f2p: [1, 0], p2p: 0, leak: false, weak: false, steps: 22, tok: 120 },
  { id: 4, f2p: [1], p2p: 2, leak: false, weak: false, steps: 14, tok: 66 },
  { id: 5, f2p: [1, 1], p2p: 0, leak: false, weak: true, steps: 7, tok: 30 },
  { id: 6, f2p: [1], p2p: 0, leak: true, weak: false, steps: 3, tok: 12 },
  { id: 7, f2p: [0, 0], p2p: 0, leak: false, weak: false, steps: 40, tok: 260 },
  { id: 8, f2p: [1, 1], p2p: 1, leak: false, weak: false, steps: 18, tok: 95 },
  { id: 9, f2p: [1], p2p: 0, leak: false, weak: false, steps: 11, tok: 52 },
  { id: 10, f2p: [1, 1], p2p: 0, leak: true, weak: true, steps: 5, tok: 20 },
  { id: 11, f2p: [1], p2p: 0, leak: false, weak: false, steps: 63, tok: 410 },
  { id: 12, f2p: [1, 1, 1], p2p: 0, leak: false, weak: false, steps: 8, tok: 37 },
];
function grade(t, o) {
  const f = t.f2p.every(x => x), p = o.p2p ? t.p2p === 0 : true;
  return f && p;
}
function score(o) {
  const pool = T.filter(t => !(o.clean && (t.leak || t.weak)));
  const res = pool.filter(t => grade(t, o)).length;
  return { n: pool.length, res, pct: Math.round(100 * res / pool.length) };
}
const pct = (arr, q) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.ceil(q * a.length) - 1)]; };

export default {
  slug: 'benchmarks-swebench-gaia',
  title: 'Agent benchmarks: what a score does and doesn\'t say',
  description: 'A Kigali team grades its coding agent on twelve issues: only the tests decide. Remove leaked issues and report the cost spread.',
  overview: 'SWE-bench gives an agent a real GitHub issue and the repository at the commit before the fix, and grades the patch by running the tests: every FAIL_TO_PASS test (failing before, expected to pass) must now pass, and no PASS_TO_PASS test (passing before) may break. A curated 500-task Verified subset removes ambiguous issues and unreliable tests. Scores need care. Most issues predate model training cutoffs; one audit found about a third of "successful" patches had the fix described in the issue text itself and another third were judged on tests too weak to tell; a 50% score can fall to around 35% once those are removed. GAIA tests generalist assistants: questions that are simple for people (92%) but were hard for models with tools (15% at release), across three levels of tool use. AgentBench spans eight environments from shells and databases to games and the web. None of these measures what your operators care about: cost and time per task, safety under attack, performance on your domain, and the tail, the worst few tasks. Report the distribution (median, 75th and 95th percentile) of steps and tokens beside the pass rate, report contamination-checked numbers, and build your own evaluations for your own work.',
  keywords: ['SWE-bench', 'GAIA', 'AgentBench', 'agent evaluation', 'benchmark contamination', 'AI agents', 'coding agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.3, 0.95, 1.25], half: 1.35, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { p2p: true, clean: true, dist: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F', GREY = '#D8D1C2', BLUE = '#5B8DB8';
    /* twelve issues: a base each, with a lamp per failing test the patch had to fix (green fixed, red not) and a red ball for each passing test it broke.
       A gold key: the fix leaked in the issue text. Pale lamps: tests too weak to judge. The base: green resolved, red not, amber counted but not real, grey left out */
    const GX = i => -2.7 + (i % 4) * 0.74, GZ = i => -0.75 + Math.floor(i / 4) * 0.7;
    const tiles = T.map((t, i) => { const m = new THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.62, 0.12, 0.54, '#fff', { r: 0.05, material: m }); b.position.set(GX(i), 0, GZ(i)); S.add(b);
      const lamps = t.f2p.map((x, k) => { const l = P.lamp(x ? GOOD : RED, { h: 0.12, r: 0.06 }); l.position.set(GX(i) - 0.18 + k * 0.17, 0.12, GZ(i) - 0.08); S.add(l); return l; });
      const broke = Array.from({ length: t.p2p }, (_, k) => { const bb = P.ball(0.06, RED); bb.position.set(GX(i) - 0.18 + k * 0.16, 0.18, GZ(i) + 0.15); S.add(bb); return bb; });
      let key = null; if (t.leak) { key = new THREE.Group(); const ring = P.cyl(0.06, 0.03, AMB); ring.position.set(0.12, 0, 0); key.add(ring); const shaft = P.box(0.16, 0.03, 0.035, AMB, { r: 0.01 }); shaft.position.set(0.0, 0, 0); key.add(shaft); key.position.set(GX(i) + 0.12, 0.13, GZ(i) + 0.17); S.add(key); }
      return { b, m, lamps, broke, key }; });
    /* the score: a dial from 0 to 100% */
    const dial = P.dial(0.42); dial.position.set(-1.6, 0, 1.35); S.add(dial);
    /* cost: a tower per issue as tall as its agent steps; the plates mark P50 (green), P75 (gold) and P95 (red), or one grey plate at the average */
    const CX = i => 0.55 + i * 0.2, CZ = -0.1, KS = 0.022;
    const bars = T.map((t, i) => { const tw = P.tower(0.15, 0.3, BLUE, { h: 0.1 }); tw.userData.set({ cap: '' }); tw.position.set(CX(i), 0, CZ); S.add(tw); return tw; });
    const plate = c => { const m = new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.5 }), b = P.box(12 * 0.2 + 0.1, 0.025, 0.45, c, { r: 0.01, material: m }); b.position.set(CX(5.5), 0, CZ); b.layers.set(1); S.add(b); return b; };
    const plates = { p50: plate(GOOD), p75: plate(AMB), p95: plate(RED), avg: plate('#8E8C84') };
    S.add(P.keep(-3.05, 3.0, 1.45, -1.1, 1.8));

    let SC = null, pool = null;
    function draw() {
      SC = score(st); pool = T.filter(t => !(st.clean && (t.leak || t.weak)));
      T.forEach((t, i) => { const out = st.clean && (t.leak || t.weak), ok = grade(t, st), real = grade(t, { p2p: true }), Ti = tiles[i];
        Ti.m.color.set(out ? GREY : ok ? (real ? GOOD : AMB) : RED); Ti.b.position.y = out ? -0.08 : 0;
        Ti.lamps.forEach((l, k) => { l.position.y = out ? 0.04 : 0.12; l.userData.set({ color: t.f2p[k] ? (t.weak ? '#BFE3D6' : GOOD) : RED, on: !out }); });
        Ti.broke.forEach(bb => { bb.visible = st.p2p && !out; }); if (Ti.key) Ti.key.visible = !out; });
      dial.userData.set({ v: SC.pct / 100 });
      const s = pool.map(t => t.steps), p95 = pct(s, 0.95);
      T.forEach((t, i) => { const out = !pool.includes(t); bars[i].visible = !out; bars[i].userData.set({ h: t.steps * KS, color: t.steps >= p95 ? RED : BLUE }); });
      plates.p50.position.y = pct(s, 0.5) * KS; plates.p75.position.y = pct(s, 0.75) * KS; plates.p95.position.y = p95 * KS; plates.avg.position.y = s.reduce((a, b) => a + b, 0) / s.length * KS;
      ['p50', 'p75', 'p95'].forEach(k => { plates[k].visible = st.dist; }); plates.avg.visible = !st.dist;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Fail if a passing test breaks (PASS_TO_PASS)', short: 'Regressions', get: () => st.p2p, set: v => set({ p2p: !!v }) },
      { type: 'toggle', label: 'Remove leaked and weak-test issues', short: 'Clean set', get: () => st.clean, set: v => set({ clean: !!v }) },
      { type: 'toggle', label: 'Report the cost distribution', short: 'Percentiles', get: () => st.dist, set: v => set({ dist: !!v }) },
    ];
    const readouts = [
      { label: 'Resolved', get: () => ({ v: `${SC.pct}%`, sub: `${SC.res} of ${SC.n}`, bad: !st.p2p || !st.clean, good: st.p2p && st.clean }) },
      { label: 'P95 steps', get: () => ({ v: String(pct(pool.map(t => t.steps), 0.95)), sub: 'the expensive tail' }) },
      { label: 'Leaked issues', get: () => ({ v: String(T.filter(t => t.leak).length), sub: st.clean ? 'removed' : 'counted', bad: !st.clean }) },
    ];
    const labels = [
      { name: 'grid', t: 'Twelve issues', d: 'A lamp per failing test the patch had to fix; a red ball per passing test it broke. Gold key: the fix leaked in the issue. Base: green resolved, red not, amber counted but not real, grey left out', icon: 'check', atV: V(GX(0) - 0.35, 0.2, GZ(4)) },
      { name: 'score', t: 'The score', d: 'Share of the counted issues resolved', icon: 'target', atV: V(-2.05, 0.15, 1.35) },
      { name: 'cost', t: 'Cost per task', d: 'A tower per issue, as tall as the agent\'s steps. Plates: P50 green, P75 gold, P95 red', icon: 'scale', atV: V(CX(11) + 0.2, 0.3, CZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Ignore the tests that used to pass', hint: 'regressions count as fixes', on: () => set({ ...D0, p2p: false }), off: reset },
      { label: 'Count the leaked issues', hint: 'contaminated score', on: () => set({ ...D0, clean: false }), off: reset },
      { label: 'Report one average', hint: 'no tail', on: () => set({ ...D0, dist: false }), off: reset },
    ];
    function status() {
      const honest = score({ p2p: true, clean: true });
      if (!st.p2p) return { ok: false, msg: `<b>Ignoring PASS_TO_PASS, the score rises to ${SC.pct}%: issues #4 and #8 count as resolved although their patches broke tests that used to pass.</b> A fix that breaks something else is not a fix. SWE-bench requires both: the failing tests pass and no passing test breaks.` };
      if (!st.clean) return { ok: false, msg: `<b>Counting every issue, the agent scores ${SC.pct}%; with leaked and weak-test issues removed, ${honest.pct}%.</b> Three issues describe their own fix in the text and two have tests (one issue is both) that can't tell a real fix from a lucky one, and the agent "solved" all of them, cheaply. Report the contamination-checked number, or both.` };
      if (!st.dist) return { ok: false, msg: `<b>An average of ${Math.round(pool.reduce((a, t) => a + t.steps, 0) / pool.length)} steps hides the tail: one issue took ${Math.max(...pool.map(t => t.steps))} steps and ${Math.max(...pool.map(t => t.tok))} thousand tokens.</b> Operators pay for the worst tasks, not the average. Report P50, P75 and P95 of steps and tokens beside the pass rate.` };
      return { ok: true, msg: `<b>${SC.res} of ${SC.n} clean issues resolved: ${SC.pct}%, with P95 cost of ${pct(pool.map(t => t.steps), 0.95)} steps.</b> Each patch had to turn its failing tests green without breaking any passing one. The leaked and weak-test issues are left out, and the cost is reported as a spread. It is still a benchmark: your own work needs your own evaluations.` };
    }
    return { update: dt => { dial.userData.tick(dt); bars.forEach(b => b.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Grade by the tests', home: true, say: 'A team in Kigali grades its coding agent on twelve real issues. A patch counts only if the failing tests now pass and nothing that passed before breaks.', act: m => m.set({ p2p: true, clean: false, dist: true }) },
    { t: 'Nothing else may break', home: true, say: 'Two patches fix their issue but break other tests. They do not count.', act: m => m.set({ p2p: true }) },
    { t: 'Leaked fixes', home: true, say: 'Three issues describe their own fix, and two have tests too weak to judge. The agent "solves" all five. Take them out.', act: m => m.set({ clean: true }) },
    { t: 'The cost of the tail', home: true, say: 'Most issues take a handful of steps. One takes sixty. Report the spread, not the average.', act: m => m.set({ dist: true }) },
    { t: 'Generalists too', home: true, say: 'Other benchmarks test general assistants with tools, or agents across many environments. None tells you about your own work.', act: m => m.set({}) },
    { t: 'An honest score', home: true, say: 'Strict grading, a clean set, and the cost spread beside it. Then build your own evaluations.', act: m => m.set({ p2p: true, clean: true, dist: true }) },
  ],
  check: [
    { q: 'When does SWE-bench count an issue resolved?', options: ['Failing tests now pass and no previously passing test breaks', 'The patch applies', 'The agent says so'], answer: 0, why: 'FAIL_TO_PASS and PASS_TO_PASS.', hint: 'Try Ignore the tests that used to pass.' },
    { q: 'An issue describes its own fix. What does solving it show?', options: ['Little: the score is contaminated', 'Strong reasoning', 'Good tests'], answer: 0, why: 'Remove leaked tasks or report both numbers.', hint: 'Try Count the leaked issues.' },
    { q: 'Why report P95 cost, not just the mean?', options: ['Operators pay for the worst tasks', 'It looks better', 'It is required by law'], answer: 0, why: 'The tail is where cost lives.', hint: 'Try Report one average.' },
  ],
  terms: [
    ['FAIL_TO_PASS', 'Tests that failed before the fix and must pass after.'],
    ['PASS_TO_PASS', 'Tests that passed before and must still pass.'],
    ['Contamination', 'Test answers the model may have seen, or that leak in the task.'],
    ['Verified subset', 'A human-checked 500-task SWE-bench set.'],
    ['GAIA', 'A benchmark of tool-using questions easy for people, hard for models.'],
    ['P95', 'The value 95% of tasks stay under.'],
  ],
  deeper: '<p><b>Interfaces matter.</b> SWE-agent raised early SWE-bench scores mostly by giving the model an editor and search commands it could use well.</p><p><b>AgentBench.</b> Eight environments (shell, database, knowledge graph, games, shopping and web) found long-term reasoning and instruction following to be what held open models back.</p><p><b>About this machine.</b> The twelve issue records are illustrative; grading, the clean set and the percentiles are computed live from them.</p>',
  code: {
    title: 'Grade a patch the SWE-bench way',
    note: 'Adapted from the course\'s benchmarks lesson.',
    text: `
def resolved(repo, patch, fail_to_pass, pass_to_pass):
    repo.apply(patch)
    results = repo.run_tests(fail_to_pass + pass_to_pass)
    return (all(results[t] for t in fail_to_pass)
            and all(results[t] for t in pass_to_pass))      # nothing else may break

def report(tasks):
    clean = [t for t in tasks if not (t.leaked or t.weak_tests)]
    steps = sorted(t.steps for t in clean)
    q = lambda p: steps[min(len(steps) - 1, int(p * len(steps)))]
    return {"resolved": sum(t.resolved for t in clean) / len(clean),
            "p50": q(0.5), "p75": q(0.75), "p95": q(0.95)}
`,
  },
};
