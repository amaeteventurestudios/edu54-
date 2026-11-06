// Eval harness (phase 19, lesson 27): fixture tasks for a coding agent at a Kigali bank. A task is goal, setup and verifier. Six tasks run five samples each from a seeded generator; pass@1 and pass@k are computed, with cost. A verifier that only checks the agent's claim scores too high.
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
const P0 = [0.9, 0.7, 0.55, 0.4, 0.3, 0.15];
function run(o) {
  const r = rng(o.seed), grid = P0.map(p => Array.from({ length: 5 }, () => r() < Math.min(1, p + o.bump + (o.claim ? 0.4 : 0))));
  const k = o.k, pass1 = grid.filter(g => g[0]).length / 6, passk = grid.filter(g => g.slice(0, k).some(Boolean)).length / 6;
  return { grid, pass1, passk, runs: 6 * k };
}

export default {
  slug: 'eval-harness-fixture-tasks',
  title: 'An eval harness: fixture tasks and pass@k',
  description: 'Six tasks, several samples each. Measure an agent the way you\'d test code, and catch a flattering verifier.',
  overview: 'You can\'t improve an agent you can\'t measure, and one lucky run proves nothing. An eval harness gives a repeatable test. A fixture task is three things: a goal, a setup that prepares a clean workspace, and a verifier that checks the result by running something. Run each task several times, because agents vary. pass@1 says how often it works first time, and pass@k says how often it works at least once in k tries. Track cost and time beside them. Fix the seed to compare changes fairly. And check the verifier, as one that reads the agent\'s own summary scores far too high. This lesson runs six tasks for a bank in Kigali.',
  keywords: ['evaluation', 'fixture tasks', 'pass@k', 'agent testing', 'verifier', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.8, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { k: 5, seed: 11, bump: 0, claim: false, fixed: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = c => -2.0 + c * 0.42, Z = r => -0.55 + r * 0.26;
    const Cells = P0.map((p, t) => [0, 1, 2, 3, 4].map(s => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.34, 0.2, 0.2, '#fff', { r: 0.02, material: m }); b.position.set(X(s), 0.03, Z(t)); S.add(b); return m; }));
    const T = [0, 1].map(i => { const t = add(P.tower(0.6, 0.6, i ? GOOD : SAF)); t.position.set(0.75 + i * 0.8, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.3, 2.3, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      Cells.forEach((row, t) => row.forEach((m, s) => m.color.set(s >= st.k ? '#E0DBCE' : R.grid[t][s] ? GOOD : BAD)));
      T[0].userData.set({ h: Math.max(0.04, R.pass1 * 1.15) }); T[1].userData.set({ h: Math.max(0.04, R.passk * 1.15) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Samples per task, k', min: 1, max: 5, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'toggle', label: 'Verifier trusts the agent\'s summary', short: 'Claim check', get: () => st.claim, set: v => set({ claim: !!v }) },
      { type: 'toggle', label: 'Fixed seed between runs', short: 'Fixed seed', get: () => st.fixed, set: v => set({ fixed: !!v, seed: v ? 11 : st.seed + 7 }) },
      { type: 'button', label: 'Run again', act: () => set({ seed: st.fixed ? st.seed : st.seed + 7 }) },
      { type: 'slider', label: 'A model change adds', min: 0, max: 0.3, step: 0.05, get: () => st.bump, set: v => set({ bump: v }) },
    ];
    const readouts = [
      { label: 'pass@1', get: () => ({ v: `${Math.round(R.pass1 * 100)}%`, sub: 'first try' }) },
      { label: `pass@${st.k}`, get: () => ({ v: `${Math.round(R.passk * 100)}%`, sub: 'at least once' }) },
      { label: 'Runs paid for', get: () => ({ v: `${R.runs}`, sub: 'six tasks' }) },
    ];
    const labels = [
      { name: 'g', t: 'Tasks by sample', d: 'One row per task', icon: 'check', atV: V(X(0) - 0.17, 0.2, Z(2)) },
      { name: 't', t: 'pass@1, then pass@k', d: 'Trying more always helps', icon: 'target', atV: V(1.85, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the agent mark itself', hint: 'it says it passed', on: () => set({ ...D0, claim: true }), off: reset },
      { label: 'One sample per task', hint: 'luck or skill?', on: () => set({ ...D0, k: 1 }), off: reset },
      { label: 'Compare runs with different seeds', hint: 'noise looks like progress', on: () => set({ ...D0, fixed: false, seed: 40 }), off: reset },
    ];
    function status() {
      if (st.claim) return { ok: false, msg: `<b>${Math.round(R.passk * 100)}%, and it isn't real.</b> A verifier must run something. An agent's summary is another guess.` };
      if (st.k === 1) return { ok: false, msg: `<b>${Math.round(R.pass1 * 100)}% from one try each.</b> Agents vary, so you can't tell luck from skill. Take several samples.` };
      if (!st.fixed) return { ok: false, msg: `<b>${Math.round(R.pass1 * 100)}% on a new seed.</b> The change you see may be noise. Fix the seed to compare two versions.` };
      return { ok: true, msg: `<b>pass@1 ${Math.round(R.pass1 * 100)}%, pass@${st.k} ${Math.round(R.passk * 100)}%, over ${R.runs} runs.</b> The gap shows what retries can buy you, if you can tell which run worked.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A test for an agent', home: true, say: 'A bank in Kigali wants to know if its coding agent improved. Each row is a task: a goal, a setup and a verifier.', act: m => m.set({ k: 5, seed: 11, bump: 0, claim: false, fixed: true }) },
    { t: 'Several samples', home: true, say: 'Agents vary, so run each task several times. One try can\'t tell luck from skill.', act: m => m.set({ k: 1, seed: 11, bump: 0, claim: false, fixed: true }) },
    { t: 'Two numbers', home: true, say: 'pass@1 is first-try success. pass@k is success in any of k tries.', act: m => m.set({ k: 5, seed: 11, bump: 0, claim: false, fixed: true }) },
    { t: 'A real verifier', home: true, say: 'A verifier must run something. If it trusts the agent\'s word, every number is inflated.', act: m => m.set({ k: 5, seed: 11, bump: 0, claim: true, fixed: true }) },
    { t: 'A fair comparison', home: true, say: 'Fix the seed, and a change shows as a real gain, not noise.', act: m => m.set({ k: 5, seed: 11, bump: 0.15, claim: false, fixed: true }) },
    { t: 'Count the cost', home: true, say: 'Report time and cost beside each score, as success at any price means little.', act: m => m.set({ k: 3, seed: 11, bump: 0.15, claim: false, fixed: true }) },
  ],
  check: [
    { q: 'What makes up a fixture task?', options: ['A goal, a setup and a verifier', 'A prompt only', 'A model and a GPU'], answer: 0, why: 'It must be repeatable and checkable.', hint: 'See A test for an agent.' },
    { q: 'What does pass@k measure?', options: ['Success in any of k tries', 'Speed', 'Cost'], answer: 0, why: 'It always beats or equals pass@1.', hint: 'Move the k slider.' },
    { q: 'Why fix the seed?', options: ['To compare two versions fairly', 'To go faster', 'To save disk'], answer: 0, why: 'Otherwise noise looks like progress.', hint: 'Try Compare runs with different seeds.' },
  ],
  terms: [['Fixture task', 'A repeatable test.'], ['Verifier', 'Code that checks the result.'], ['pass@1', 'First-try success.'], ['pass@k', 'Success in any of k tries.'], ['Seed', 'A fixed start for randomness.']],
  deeper: '<p><b>Clean setup.</b> Each sample needs a fresh workspace, or one run contaminates the next.</p><p><b>Cost.</b> Mean and p95 of time and money sit beside pass rates.</p><p><b>This run</b> samples from a seeded generator.</p>',
  code: {
    title: 'Run a suite',
    note: 'Adapted from the course\'s harness (code/main.py).',
    text: `
def score(task, agent, k=5):
    results = []
    for seed in range(k):
        workspace = task.setup()
        agent.run(task.goal, workspace, seed=seed)
        results.append(task.verify(workspace))      # runs something real
    return {"pass@1": results[0], f"pass@{k}": any(results)}
`,
  },
};
