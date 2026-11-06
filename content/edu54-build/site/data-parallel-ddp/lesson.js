// Data-parallel proof (phase 19, lesson 77): train one small model on a Cairo cluster, once on N ranks and once alone on the joined data, and compare parameters step by step. A real linear regression runs both ways; the numbers match when gradients are averaged correctly.
const DATA = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11], [6, 13], [7, 15], [8, 17]];
function gradOf(w, b, xs) { let gw = 0, gb = 0; xs.forEach(([x, y]) => { const e = w * x + b - y; gw += e * x; gb += e; }); return [gw / xs.length, gb / xs.length]; }
function run(o) {
  let wA = 0, bA = 0, wB = 0, bB = 0, lr = 0.01; const hist = [];
  const per = Math.floor(DATA.length / o.n), slices = Array.from({ length: o.n }, (_, i) => DATA.slice(i * per, (i + 1) * per));
  for (let t = 0; t < o.steps; t++) {
    const gs = slices.map(s => gradOf(wB, bB, s)), f = o.sum ? 1 : 1 / o.n, gw = gs.reduce((a, g) => a + g[0], 0) * f, gb = gs.reduce((a, g) => a + g[1], 0) * f;
    wB -= lr * gw; bB -= lr * gb;
    const [ga, gc] = gradOf(wA, bA, DATA); wA -= lr * ga; bA -= lr * gc; hist.push(Math.abs(wA - wB));
  }
  return { wA, bA, wB, bB, gap: Math.abs(wA - wB) + Math.abs(bA - bB), hist };
}

export default {
  slug: 'data-parallel-ddp',
  title: 'Proving data parallel: same weights, step by step',
  description: 'Train on four ranks and on one. If gradients are averaged right, the weights match to every digit.',
  overview: 'Distributed training is easy to get subtly wrong. So prove it. Train a small model twice: on N ranks with broadcast and all-reduce, and in one process on the joined data, with the same seed. After each step, compare the parameters. If the wrapper is right, they match. A summed gradient instead of an averaged one acts like a much larger learning rate. This runs a real linear regression both ways, for a cluster in Cairo, and shows the gap at each step.',
  keywords: ['DDP', 'all-reduce', 'distributed training', 'testing', 'gradient sync', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 4, steps: 30, sum: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const a = add(P.tower(0.6, 0.6, BLUE)), b = add(P.tower(0.6, 0.6, GOOD)); a.position.set(-1.4, 0.03, -0.1); b.position.set(-0.6, 0.03, -0.1); a.userData.set({ cap: '' }); b.userData.set({ cap: '' });
    const R4 = [0, 1, 2, 3].map(i => { const r = add(P.robot('#7B6FA8', { scale: 0.4 })); r.position.set(0.3 + i * 0.42, 0.03, 0.3); return r; });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.12 })); lamp.position.set(2.1, 0.03, 0.2);
    S.add(P.keep(-2.3, 2.4, 1.25, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); a.userData.set({ h: Math.max(0.03, Math.min(1.25, Math.abs(R.wA) * 0.45)) }); b.userData.set({ h: Math.max(0.03, Math.min(1.25, Math.abs(R.wB) * 0.45)), color: R.gap < 1e-6 ? GOOD : BAD }); R4.forEach((r, i) => { r.visible = i < st.n; r.userData.set({ busy: true }); }); lamp.userData.set({ color: R.gap < 1e-6 ? '#3E9B5F' : '#D9483B', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const NK = [2, 4];
    const controls = [
      { type: 'buttons', label: 'Ranks', options: ['2', '4'], get: () => NK.indexOf(st.n), act: i => set({ n: NK[i] }) },
      { type: 'slider', label: 'Steps', min: 1, max: 60, step: 1, get: () => st.steps, set: v => set({ steps: v }) },
      { type: 'toggle', label: 'Sum gradients, without dividing', short: 'Sum', get: () => st.sum, set: v => set({ sum: !!v }) },
    ];
    const readouts = [
      { label: 'One process', get: () => ({ v: `w = ${R.wA.toFixed(4)}`, sub: `b = ${R.bA.toFixed(4)}` }) },
      { label: 'Across ranks', get: () => ({ v: `w = ${R.wB.toFixed(4)}`, sub: `b = ${R.bB.toFixed(4)}` }) },
      { label: 'Gap', get: () => ({ v: R.gap < 1e-6 ? '0' : R.gap.toFixed(4), good: R.gap < 1e-6, bad: R.gap > 1e-6 }) },
    ];
    const labels = [
      { name: 't', t: 'One process, then ranks', d: 'Height: a learned weight', icon: 'scale', atV: V(-1.72, 0.2, -0.1) },
      { name: 'l', t: 'Match lamp', d: 'Green: the same to every digit', icon: 'check', atV: V(2.3, 0.6, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [{ label: 'Sum, don\'t average', hint: 'a hidden learning rate', on: () => set({ ...D0, sum: true }), off: reset }];
    function status() {
      if (st.sum) return { ok: false, msg: `<b>Gap ${R.gap.toFixed(3)}.</b> Summing makes the step ${st.n} times too big. It looks like a learning-rate bug, and it\'s in the sync.` };
      return { ok: true, msg: `<b>The weights match after ${st.steps} steps.</b> That proves the wrapper, before you trust it on a real run.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Don\'t assume', home: true, say: 'A cluster in Cairo has a new data-parallel wrapper. Before using it, prove it.', act: m => m.set({ n: 4, steps: 1, sum: false }) },
    { t: 'Two runs', home: true, say: 'Run on four ranks, and in one process on the joined data, from one seed.', act: m => m.set({ n: 4, steps: 10, sum: false }) },
    { t: 'They match', home: true, say: 'After each step, parameters match to every digit.', act: m => m.set({ n: 4, steps: 30, sum: false }) },
    { t: 'A subtle bug', home: true, say: 'Sum instead of average, and it acts like a bigger learning rate.', act: m => m.set({ n: 4, steps: 30, sum: true }) },
    { t: 'More ranks', home: true, say: 'The check holds for any number of ranks that divides the batch.', act: m => m.set({ n: 2, steps: 30, sum: false }) },
    { t: 'Then trust it', home: true, say: 'Now you can use it on a real run.', act: m => m.set({ n: 4, steps: 60, sum: false }) },
  ],
  check: [
    { q: 'How do you prove data parallel is right?', options: ['Compare with one process, step by step', 'Check the loss looks fine', 'Trust the library'], answer: 0, why: 'Parameters should match.', hint: 'See Two runs.' },
    { q: 'What does summing gradients do?', options: ['Acts like a larger learning rate', 'Nothing', 'Saves memory'], answer: 0, why: 'The step grows by N.', hint: 'Try Sum, don\'t average.' },
    { q: 'What must each rank start with?', options: ['The same weights', 'Random weights', 'Empty weights'], answer: 0, why: 'A broadcast does that.', hint: 'See the overview.' },
  ],
  terms: [['Rank', 'One process.'], ['All-reduce', 'Combine across ranks.'], ['Equivalence test', 'Proving two runs match.'], ['Rendezvous', 'How ranks find each other.']],
  deeper: '<p><b>Real runs.</b> Dropout and shuffling must also match for exact equality.</p><p><b>This regression</b> is really computed both ways.</p>',
  code: {
    title: 'The check',
    note: 'Adapted from the course\'s test (code/main.py).',
    text: `
for step in range(steps):
    ddp_params = train_step_ddp(batch)
    solo_params = train_step_solo(full_batch)
    assert all(torch.allclose(a, b) for a, b in zip(ddp_params, solo_params))
`,
  },
};
