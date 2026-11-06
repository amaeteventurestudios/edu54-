// Cosine schedule with warmup (phase 19, lesson 44): the rate at each step is an exact formula from the step number, so resuming gives the same value. Fifty towers show the schedule; a second row shows a gradient-norm trace from a simple model. Compare with a stepwise one, and with accumulating floating point.
const N = 50;
function lrAt(s, o) {
  const W = o.warm, T = N;
  if (s < W) return o.peak * (s + 1) / W;
  const p = (s - W) / Math.max(1, T - W);
  return o.floor + (o.peak - o.floor) * 0.5 * (1 + Math.cos(Math.PI * p));
}
function run(o) {
  const lr = Array.from({ length: N }, (_, s) => lrAt(s, o));
  const gn = lr.map((l, s) => (s < 3 && o.warm < 3 ? 6 : 1) * (1.8 - s / N) + (o.peak > 1.5 ? 1.5 : 0));
  const resume = lrAt(30, o) * (o.exact ? 1 : 1.004);
  return { lr, gn, spike: Math.max(...gn), last: lr[N - 1], resume };
}

export default {
  slug: 'cosine-lr-warmup',
  title: 'Cosine with warmup: a rate from a formula',
  description: 'The first steps are the loudest. Warm up, decay smoothly, and compute the rate from the step, so that a resume matches.',
  overview: 'The first thousand updates are the most dangerous. Weights are near random and gradients are noisy, so a full learning rate can throw training off for good. Warmup climbs in a straight line from nearly zero. After that, a cosine eases the rate down smoothly to a floor. Compute the rate directly from the step number, not by updating it each step, so that a resumed run gets exactly the same value with no drift. Log the gradient norm beside the rate, as together they show training health. This lesson draws the real schedule for a team training a Wolof model in Saint-Louis.',
  keywords: ['learning rate schedule', 'warmup', 'cosine decay', 'gradient norm', 'AdamW', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.05, 0.42, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { warm: 6, peak: 1, floor: 0.05, exact: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.35 + i * 0.096;
    const L = Array.from({ length: N }, (_, i) => { const t = add(P.tower(0.075, 0.2, SAF)); t.position.set(X(i), 0.03, -0.2); t.userData.set({ cap: '' }); return t; });
    const G = Array.from({ length: N }, (_, i) => { const t = add(P.tower(0.075, 0.14, GOOD)); t.position.set(X(i), 0.03, 0.3); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.45, 2.45, 1.35, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      L.forEach((t, i) => t.userData.set({ h: Math.max(0.02, R.lr[i] * 0.55) })); G.forEach((t, i) => t.userData.set({ h: Math.max(0.02, R.gn[i] * 0.16), color: R.gn[i] > 4 ? BAD : GOOD }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Warmup steps', min: 1, max: 20, step: 1, get: () => st.warm, set: v => set({ warm: v }) },
      { type: 'slider', label: 'Peak rate', min: 0.2, max: 2, step: 0.1, get: () => st.peak, set: v => set({ peak: v }) },
      { type: 'slider', label: 'Floor', min: 0, max: 0.3, step: 0.05, get: () => st.floor, set: v => set({ floor: v }) },
      { type: 'toggle', label: 'Compute from the step, not by updating', short: 'From step', get: () => st.exact, set: v => set({ exact: !!v }) },
    ];
    const readouts = [
      { label: 'Peak gradient norm', get: () => ({ v: R.spike.toFixed(1), sub: 'green row', good: R.spike < 4, bad: R.spike > 6 }) },
      { label: 'Rate at the end', get: () => ({ v: R.last.toFixed(3), sub: 'the floor' }) },
      { label: 'Rate after resume at step 30', get: () => ({ v: R.resume.toFixed(4), sub: st.exact ? 'matches exactly' : 'has drifted', good: st.exact, bad: !st.exact }) },
    ];
    const labels = [
      { name: 'l', t: 'The rate', d: 'A climb, then a cosine', icon: 'wave', atV: V(X(0) - 0.05, 0.1, -0.2) },
      { name: 'g', t: 'Gradient norm', d: 'Coral: a spike', icon: 'target', atV: V(X(49) + 0.05, 0.1, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No warmup', hint: 'full rate at step one', on: () => set({ ...D0, warm: 1 }), off: reset },
      { label: 'A peak that\'s too high', hint: 'the norm stays high', on: () => set({ ...D0, peak: 2 }), off: reset },
      { label: 'Update the rate in place', hint: 'floating drift', on: () => set({ ...D0, exact: false }), off: reset },
    ];
    function status() {
      if (st.warm < 3) return { ok: false, msg: `<b>Gradient norm hits ${R.spike.toFixed(1)} in the first steps.</b> Near-random weights met a full rate. That first kick can stick.` };
      if (st.peak > 1.5) return { ok: false, msg: `<b>The norm stays high.</b> A rate this big never lets gradients settle. Watch both rows together.` };
      if (!st.exact) return { ok: false, msg: '<b>The rate after resume differs from a clean run.</b> Multiplying by a factor each step drifts, and it needs extra state. Compute it from the step.' };
      return { ok: true, msg: `<b>A straight climb over ${st.warm} steps, then a cosine to ${st.floor.toFixed(2)}.</b> Same value at any step, on any resume.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The loudest steps', home: true, say: 'A team in Saint-Louis trains a Wolof model. At the start, weights are random and gradients are wild.', act: m => m.set({ warm: 1, peak: 1, floor: 0.05, exact: true }) },
    { t: 'Warm up', home: true, say: 'Climb from near zero in a straight line. The spike goes away.', act: m => m.set({ warm: 6, peak: 1, floor: 0.05, exact: true }) },
    { t: 'Cosine', home: true, say: 'Then ease down along a cosine, with no sudden steps.', act: m => m.set({ warm: 6, peak: 1, floor: 0.05, exact: true }) },
    { t: 'A floor', home: true, say: 'A small floor keeps learning alive to the end.', act: m => m.set({ warm: 6, peak: 1, floor: 0.2, exact: true }) },
    { t: 'From the step', home: true, say: 'Compute the rate from the step number. A resumed run gets exactly the same value.', act: m => m.set({ warm: 6, peak: 1, floor: 0.05, exact: false }) },
    { t: 'Log both', home: true, say: 'Keep the rate and the gradient norm together. They tell you how training feels.', act: m => m.set({ warm: 6, peak: 1, floor: 0.05, exact: true }) },
  ],
  check: [
    { q: 'Why warm up?', options: ['Early weights are near random', 'To save power', 'To print more'], answer: 0, why: 'A full rate can knock them off course.', hint: 'Try No warmup.' },
    { q: 'Why compute the rate from the step?', options: ['A resume gets the same value', 'It looks tidier', 'It is shorter'], answer: 0, why: 'No drift, no extra state.', hint: 'Try Update the rate in place.' },
    { q: 'What does the cosine give?', options: ['A smooth fall', 'A sudden step', 'A rising rate'], answer: 0, why: 'No shocks late in training.', hint: 'See Cosine.' },
  ],
  terms: [['Warmup', 'A linear rise at the start.'], ['Cosine decay', 'A smooth fall.'], ['Floor', 'The lowest rate.'], ['Gradient norm', 'The size of the gradient.'], ['Drift', 'Small errors adding up.']],
  deeper: '<p><b>Log it.</b> Write rate and norm to a file any tool can read.</p><p><b>The earlier schedule lesson</b> compares shapes. This one builds the exact function.</p><p><b>The norm trace</b> is a simple illustration.</p>',
  code: {
    title: 'The schedule',
    note: 'Adapted from the course\'s schedule (code/main.py).',
    text: `
def lr_at(step, peak, warm, total, floor):
    if step < warm:
        return peak * (step + 1) / warm
    t = (step - warm) / (total - warm)
    return floor + (peak - floor) * 0.5 * (1 + math.cos(math.pi * t))
`,
  },
};
