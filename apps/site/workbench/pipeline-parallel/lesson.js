// Pipeline parallel (phase 19, lesson 79): a model split into N stages across ranks, M microbatches. A real slot grid is filled for two schedules: GPipe (all forwards, then all backwards) and 1F1B (interleaved). Bubble fraction = idle slots / total. Each cell is one rank at one time step. An Addis Ababa team.
function grid(n, m, mode) {
  const ROW = []; for (let i = 0; i < n; i++) ROW.push([]);
  if (mode === 'gpipe') { for (let k = 0; k < m; k++) for (let i = 0; i < n; i++) ROW[i][k + i] = 'F'; const T0 = m + n - 1; for (let k = 0; k < m; k++) for (let i = n - 1; i >= 0; i--) ROW[i][T0 + (n - 1 - i) + k] = 'B'; }
  else { for (let k = 0; k < m; k++) for (let i = 0; i < n; i++) { ROW[i][2 * k + i] = 'F'; ROW[i][2 * k + 2 * n - 1 - i] = 'B'; } }
  const T = Math.max(...ROW.map(r => r.length)), busy = ROW.reduce((a, r) => a + r.filter(Boolean).length, 0);
  let held = 0; ROW.forEach(r => { let h = 0; for (let t = 0; t < T; t++) { if (r[t] === 'F') h++; if (r[t] === 'B') h--; held = Math.max(held, h); } });
  return { ROW, T, held, bubble: 1 - busy / (n * T) };
}
function run(o) { const G = grid(o.n, o.m, o.mode), A = grid(o.n, o.m, 'gpipe'), B = grid(o.n, o.m, 'f1b'); return { ...G, gpipe: A.held, f1b: B.held, mem: G.held }; }

export default {
  slug: 'pipeline-parallel',
  title: 'Pipeline parallel: the bubble and the memory',
  description: 'Layers split across ranks, and microbatches flow like a line. Count the idle time, then count what the schedule holds in memory.',
  overview: 'When a model is too large for one GPU, split its layers across ranks. Microbatches then flow through like a production line. In a simple schedule, all forwards run, then all backwards, and ranks wait while the line fills and drains. That idle time is the bubble. GPipe has a bubble of about (N-1)/(M+N-1). More microbatches shrink it. 1F1B interleaves one forward with one backward once the line is full. Its bubble is the same as GPipe\'s in this grid, and its gain is memory: activations are freed early, so a rank holds about N of them, not M. Balanced stages matter too, as the slowest sets the pace. This grid fills itself live, for a team in Addis Ababa.',
  keywords: ['pipeline parallelism', 'GPipe', '1F1B', 'bubble', 'distributed training', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.04, 1.0, 0.9], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 4, m: 8, mode: 'f1b' }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', SAF = '#F2AE0C', GREY = '#E0DBCE';
    const pad = P.box(5, 0.03, 1.8, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const MAXT = 30, MAXN = 6, Cells = Array.from({ length: MAXN * MAXT }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.135, 0.1, 0.24, '#fff', { r: 0.01, material: m }); b.position.set(-2.3 + (i % MAXT) * 0.155, 0.03, -0.72 + Math.floor(i / MAXT) * 0.28); S.add(b); return { b, m }; });
    S.add(P.keep(-2.45, 2.45, 0.4, -0.9, 0.9));
    let R = null;
    function draw() { R = run(st); Cells.forEach(({ b, m }, i) => { const r = Math.floor(i / MAXT), t = i % MAXT, on = r < st.n && t < R.T; b.visible = on; if (!on) return; const sp = 4.6 / R.T; b.position.x = -2.3 + (t + 0.5) * sp - 0.07; b.scale.x = sp / 0.155; const c = R.ROW[r][t]; m.color.set(c === 'F' ? BLUE : c === 'B' ? SAF : GREY); b.scale.y = c ? 1.8 : 0.6; }); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['gpipe', 'f1b'];
    const controls = [
      { type: 'buttons', label: 'Schedule', options: ['GPipe', '1F1B'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Ranks', min: 2, max: 6, step: 1, get: () => st.n, set: v => set({ n: v }) },
      { type: 'slider', label: 'Microbatches', min: 2, max: 10, step: 1, get: () => st.m, set: v => set({ m: v }) },
    ];
    const readouts = [
      { label: 'Bubble', get: () => ({ v: `${Math.round(R.bubble * 100)}%`, sub: 'idle slots', good: R.bubble < 0.25, bad: R.bubble > 0.4 }) },
      { label: 'Time steps', get: () => ({ v: `${R.T}` }) },
      { label: 'Activations in memory', get: () => ({ v: `up to ${R.mem}`, sub: 'microbatches', good: R.mem <= st.n, bad: R.mem > st.n }) },
    ];
    const labels = [
      { name: 'g', t: 'Ranks over time', d: 'Blue forward, gold backward', icon: 'target', atV: V(-2.38, 0.05, -0.72) },
      { name: 'b', t: 'Pale cells', d: 'The bubble: idle', icon: 'stop', atV: V(2.3, 0.06, -0.44) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Few microbatches', hint: 'the line never fills', on: () => set({ ...D0, m: 2 }), off: reset },
      { label: 'All forwards, then backwards', hint: 'memory piles up', on: () => set({ ...D0, mode: 'gpipe' }), off: reset },
    ];
    function status() {
      if (st.m <= 2) return { ok: false, msg: `<b>${Math.round(R.bubble * 100)}% of time idle.</b> With so few microbatches, the line never fills.` };
      if (st.mode === 'gpipe') return { ok: false, msg: `<b>Up to ${R.mem} activations held at once.</b> The first rank keeps every forward until the backwards begin. 1F1B has the same ${Math.round(R.bubble * 100)}% bubble and holds ${R.f1b}.` };
      return { ok: true, msg: `<b>${Math.round(R.bubble * 100)}% bubble, and ${R.mem} activations held at most.</b> Once full, each rank runs a forward and a backward by turns.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A line', home: true, say: 'A team in Addis Ababa splits a model over four ranks. Each row is a rank, and each column a time step.', act: m => m.set({ n: 4, m: 2, mode: 'gpipe' }) },
    { t: 'The bubble', home: true, say: 'Pale cells are idle. Ranks wait for work to arrive.', act: m => m.set({ n: 4, m: 2, mode: 'gpipe' }) },
    { t: 'More microbatches', home: true, say: 'More microbatches keep the line fuller, and they hold more in memory.', act: m => m.set({ n: 4, m: 8, mode: 'gpipe' }) },
    { t: '1F1B', home: true, say: 'Interleave one forward with one backward. The idle cells stay the same.', act: m => m.set({ n: 4, m: 8, mode: 'f1b' }) },
    { t: 'Less memory', home: true, say: 'Backwards free activations early, so fewer are held.', act: m => m.set({ n: 4, m: 8, mode: 'f1b' }) },
    { t: 'Balance', home: true, say: 'The slowest stage sets the pace, so balance the layers.', act: m => m.set({ n: 6, m: 10, mode: 'f1b' }) },
  ],
  check: [
    { q: 'What is the bubble?', options: ['Idle time in the pipeline', 'A memory leak', 'A kind of token'], answer: 0, why: 'Ranks waiting for work.', hint: 'See The bubble.' },
    { q: 'What does 1F1B do?', options: ['Interleaves forward and backward', 'Skips backward', 'Doubles batch'], answer: 0, why: 'Its gain is memory: activations are freed early.', hint: 'See 1F1B.' },
    { q: 'What sets the pace?', options: ['The slowest stage', 'The fastest', 'The dataset'], answer: 0, why: 'A line runs at its slowest point.', hint: 'See Balance.' },
  ],
  terms: [['Stage', 'A slice of layers on one rank.'], ['Microbatch', 'A piece of a batch.'], ['Bubble', 'Idle time.'], ['1F1B', 'One forward, one backward, by turns.']],
  deeper: '<p><b>Formula.</b> With equal stages, the bubble is (N-1)/(M+N-1) under both schedules here.</p><p><b>The grid</b> is really filled by the schedule rules, and memory is counted from it, with each rank\'s time steps taken as equal.</p>',
  code: {
    title: 'GPipe slots',
    note: 'Adapted from the course\'s simulator (code/main.py).',
    text: `
def bubble(stages, microbatches):
    total = 2 * (microbatches + stages - 1)
    busy = 2 * microbatches
    return 1 - busy / total
`,
  },
};
