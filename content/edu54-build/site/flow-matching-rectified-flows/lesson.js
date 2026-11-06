// Flow matching and rectified flows, as training sees it. One number per sample: noise on the left (t = 0), data on the right (t = 1), time running across the table.
// The data are grain sizes at a market in Ethiopia: tiny teff and larger wheat, two clusters. Flow matching draws a straight line from each noise sample to a data sample
// and trains a network to predict that line's slope (the velocity x1 − x0) at every point and time. The learned field is the average of all the lines through a point.
// Sampling follows the field with Euler steps; the coloured paths are twelve samples.
// Break it: random pairs with one step (lines cross, the average points between the clusters, so samples land in the middle), the wrong target (x0 − x1: samples run away from the data),
// train only on early times (the network never learned the late part, so samples stall halfway).
const S0 = 1, SD = 0.12, MODES = [-1.4, 1.4], KIND = ['teff', 'wheat'];
function vel(x, t) {    // exact flow-matching velocity for the 1D two-cluster data, random pairing
  const s2 = (1 - t) ** 2 * S0 * S0 + t * t * SD * SD; let ws = 0, v = 0; const lw = MODES.map(m => -((x - t * m) ** 2) / (2 * s2)), mx = Math.max(...lw);
  MODES.forEach((m, i) => { const w = Math.exp(lw[i] - mx); ws += w; const e1 = m + (t * SD * SD / s2) * (x - t * m), e0 = ((1 - t) * S0 * S0 / s2) * (x - t * m); v += w * (e1 - e0); });
  return v / ws;
}

export default {
  slug: 'flow-matching-rectified-flows',
  title: 'Flow matching: learning straight lines',
  description: 'Flow matching as training sees it: noise on the left, data on the right (grain sizes of teff and wheat at an Ethiopian market), and a straight line from each noise sample to a data sample. The network learns the average slope through every point. Random pairs cross and curve; reflowed pairs run straight, so one step lands. Then set the target backwards, or train only on early times.',
  overview: 'Flow matching trains a network to predict a velocity. For each training example it picks a noise sample x0, a data sample x1 and a time t, takes the point on the straight line between them, (1 − t)·x0 + t·x1, and asks the network for that line\'s slope, x1 − x0. Many lines pass through any point, so the network learns their average, a velocity field that carries the whole noise distribution onto the data. With random pairs, lines cross and the field bends, so sampling needs many small steps. Rectified flow, or reflow, re-pairs each noise sample with the data point the field actually takes it to and trains again; the new lines do not cross, the field straightens, and a single step can land.',
  keywords: ['flow matching loss', 'rectified flow reflow', 'velocity target', 'one step generation', 'flow matching vs ddpm'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0.1], dir: [0.1, 1.3, 1.0], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { reflow: true, steps: 1, target: 'right', tmax: 1 };
    const ink = '#151827', NP = 12;
    const base = P.box(6.6, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const table = P.box(5.4, 0.04, 2.5, '#FBF8F1', { r: 0.04 }); table.position.set(0, 0.12, 0); S.add(table);
    const TX = t => -2.4 + t * 4.8, ZX = x => -x * 0.55, Y0 = 0.17;
    const lab = (s, x, z, c = ink) => { const t = S.text(s, { size: 0.075, weight: 800, color: c }); t.position.set(x, Y0, z); S.add(t); return t; };
    lab('noise (t = 0)', TX(0), 1.15); lab('data (t = 1)', TX(1), 1.15); lab('time →', 0, 1.15);
    lab('teff', TX(1) + 0.35, ZX(MODES[0]), '#8A5A2B'); lab('wheat', TX(1) + 0.38, ZX(MODES[1]), '#C9A227');
    MODES.forEach((m, i) => { const d = P.cyl(0.18, 0.01, i ? '#E3C46A' : '#B08A62', { seg: 20 }); d.position.set(TX(1), Y0 - 0.005, ZX(m)); S.add(d); });
    const pair = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4), new THREE.MeshBasicMaterial({ color: '#B7B2A6' }), 40); pair.userData.noFit = true; pair.frustumCulled = false; pair.layers.set(1); S.add(pair);
    const paths = [...Array(NP)].map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.018, C.indigo); t.userData.noFit = true; t.layers.set(1); S.add(t); return t; });
    const ends = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NP); ends.userData.noFit = true; ends.frustumCulled = false; S.add(ends);
    const wall = P.box(0.06, 0.6, 2.4, '#C9C5BA', { r: 0.02 }); wall.userData.noFit = true; S.add(wall);
    const wallT = S.text('', { size: 0.065, weight: 800, color: '#FFFFFF', bg: C.red, face: 'cam', top: true }); wallT.userData.noFit = true; S.add(wallT);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- maths ---------- */
    let s0 = 21; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647, gs = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
    const X0 = [...Array(NP)].map(() => gs() * 0.9).sort((a, b) => a - b), PAIRX0 = [...Array(40)].map(() => gs()), PAIRX1 = PAIRX0.map(() => MODES[rnd() < 0.5 ? 0 : 1] + gs() * SD);
    const fine = x0 => { let x = x0; for (let i = 0; i < 400; i++) x += vel(x, i / 400) / 400; return x; };
    function field(x, t) {
      if (t > st.tmax) return 0;                                  // never trained this late
      const v = st.reflow ? null : vel(x, t);
      return st.target === 'right' ? v : -v;
    }
    let R = null;
    function draw() {
      // training pairs
      for (let i = 0; i < 40; i++) {
        const a0 = PAIRX0[i], a1 = st.reflow ? fine(a0) : PAIRX1[i], A = V(TX(0), Y0 + 0.01, ZX(a0)), B = V(TX(1), Y0 + 0.01, ZX(a1)), len = A.distanceTo(B);
        dummy.position.copy(A).add(B).multiplyScalar(0.5); dummy.scale.set(1, len, 1); dummy.lookAt(B); dummy.rotateX(Math.PI / 2); dummy.updateMatrix(); pair.setMatrixAt(i, dummy.matrix);
      }
      pair.instanceMatrix.needsUpdate = true;
      let landed = 0, between = 0, away = 0;
      X0.forEach((x0, i) => {
        const pts = [V(TX(0), Y0 + 0.03, ZX(x0))]; let x = x0;
        if (st.reflow && st.target === 'right' && st.tmax >= 1) { const x1 = fine(x0); for (let k = 1; k <= st.steps; k++) { const u = k / st.steps; pts.push(V(TX(u), Y0 + 0.03, ZX(x0 + (x1 - x0) * u))); } x = x1; }
        else for (let k = 0; k < st.steps; k++) { const t = k / st.steps; const v = st.reflow ? (st.target === 'right' ? 1 : -1) * (fine(x0) - x0) * (t <= st.tmax ? 1 : 0) : field(x, t); x += v / st.steps; pts.push(V(TX((k + 1) / st.steps), Y0 + 0.03, ZX(Math.max(-3.5, Math.min(3.5, x))))); }
        paths[i].geometry.dispose(); paths[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), Math.max(8, pts.length * 4), 0.016, 4, false);
        const near = Math.min(...MODES.map(m => Math.abs(x - m)));
        if (near < 3 * SD) landed++; else if (Math.abs(x) < 0.8) between++; else away++;
        dummy.position.set(TX(1), Y0 + 0.05, ZX(Math.max(-3.5, Math.min(3.5, x)))); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); ends.setMatrixAt(i, dummy.matrix);
        ends.setColorAt(i, col.set(near < 3 * SD ? (x < 0 ? '#8A5A2B' : '#C9A227') : C.red));
      });
      ends.instanceMatrix.needsUpdate = true; ends.instanceColor.needsUpdate = true;
      wall.visible = st.tmax < 1; wall.position.set(TX(st.tmax), 0.14, 0); wallT.visible = st.tmax < 1; wallT.userData.set('never trained past here'); wallT.position.set(TX(st.tmax), 0.95, -1.0);
      R = { landed: landed / NP, between, away };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Training pairs', options: ['Random pairs', 'Reflowed pairs'], get: () => (st.reflow ? 1 : 0), act: i => { st.reflow = !!i; draw(); } },
      { type: 'buttons', label: 'Sampling steps', options: ['1', '2', '4', '16', '64'], get: () => [1, 2, 4, 16, 64].indexOf(st.steps), act: i => { st.steps = [1, 2, 4, 16, 64][i]; draw(); } },
      { type: 'buttons', label: 'Training target', options: ['x1 − x0', 'x0 − x1 (backwards)'], get: () => (st.target === 'right' ? 0 : 1), act: i => { st.target = i ? 'wrong' : 'right'; draw(); } },
      { type: 'buttons', label: 'Times trained on', options: ['All of 0 to 1', 'Only 0 to 0.3'], get: () => (st.tmax >= 1 ? 0 : 1), act: i => { st.tmax = i ? 0.3 : 1; draw(); } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Landed on grain', get: () => ({ v: pct(R.landed), sub: 'teff or wheat cluster', good: R.landed > 0.9, bad: R.landed < 0.5 }) },
      { label: 'Stuck between', get: () => ({ v: String(R.between), sub: 'of 12 samples', bad: R.between > 2 }) },
      { label: 'Network calls', get: () => ({ v: String(st.steps), sub: 'per sample' }) },
    ];
    const labels = [
      { name: 'pairs', t: 'Training lines', d: 'Each joins one noise to one data sample', icon: 'link', atV: V(TX(0) - 0.15, Y0, -1.0) },
      { name: 'paths', t: 'Sampling paths', d: 'Euler steps along the learned field', icon: 'wave', atV: V(TX(0) - 0.15, Y0, 0.6) },
      { name: 'data', t: 'Teff and wheat', d: 'Where samples should land', icon: 'target', atV: V(TX(1) + 0.7, Y0, 0) },
    ];
    const reset = () => { Object.assign(st, { reflow: true, steps: 1, target: 'right', tmax: 1 }); draw(); };
    const breaks = [
      { label: 'Random pairs, one step', hint: 'No reflow', on: () => { reset(); st.reflow = false; draw(); }, off: reset },
      { label: 'Backwards target', hint: 'Learn x0 − x1', on: () => { reset(); st.reflow = false; st.steps = 16; st.target = 'wrong'; draw(); }, off: reset },
      { label: 'Only early times', hint: 'Train on t from 0 to 0.3', on: () => { reset(); st.reflow = false; st.steps = 16; st.tmax = 0.3; draw(); }, off: reset },
    ];
    function status() {
      if (st.target !== 'right') return { ok: false, msg: `<b>Running away from the data.</b> The network was trained to predict x0 − x1, the line\'s slope backwards, so every step pushes samples away from teff and wheat and out past the edges: ${R.away} of 12 end up nowhere near any grain. The target must point from noise to data.` };
      if (st.tmax < 1) return { ok: false, msg: `<b>Stalled halfway.</b> Training only drew times between 0 and 0.3, so the network never learned what to do later. Past t = 0.3 its velocity is meaningless (here, zero) and the samples stop partway across, short of any grain: ${pct(R.landed)} land. Times must be sampled over the whole range.` };
      if (!st.reflow && st.steps <= 2) return { ok: false, msg: `<b>Landing between teff and wheat.</b> With random pairs, lines from neighbouring noise samples go to both clusters and cross, so near t = 0 the average slope points to the middle. A single big step follows that average and ${R.between} of 12 samples land between the two grains. Many small steps, or reflow, fix it.` };
      if (st.reflow) return { ok: true, msg: `<b>Straight lines, ${st.steps === 1 ? 'one step' : `${st.steps} steps`}.</b> Each noise sample is paired with the grain the field actually takes it to, so the training lines no longer cross, the learned field is straight, and ${st.steps === 1 ? 'a single Euler step' : 'every step'} lands: ${pct(R.landed)} on teff or wheat.` };
      return { ok: true, msg: `<b>Curved, but followed closely.</b> Random pairs give a bent field, but ${st.steps} small steps trace it faithfully: ${pct(R.landed)} land on teff or wheat, at ${st.steps} network calls per sample. Reflow would let one step do it.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Noise to grain', home: true, say: 'Each sample is one number: noise on the left, and on the right, grain sizes at a market in Ethiopia, tiny teff and larger wheat. Time runs across the table.', act: m => m.set({ reflow: false, steps: 64, target: 'right', tmax: 1 }) },
    { t: 'Straight training lines', home: true, say: 'Flow matching draws a straight line from a noise sample to a data sample, and trains the network to predict that line\'s slope at every point along it.', act: m => m.set({}) },
    { t: 'Lines cross', home: true, say: 'With random pairs, the lines cross. The network learns their average, which bends, so sampling needs many small steps.', act: m => m.set({ steps: 64 }) },
    { t: 'One big step', home: true, say: 'Take a single step on that bent field, and samples follow the average and land between teff and wheat.', act: m => m.set({ steps: 1 }) },
    { t: 'Reflow', home: true, say: 'Reflow pairs each noise sample with the grain it actually reaches, and trains again. The lines stop crossing, and one step lands.', act: m => m.set({ reflow: true, steps: 1 }) },
    { t: 'Train every time', home: true, say: 'Train only on early times, and the network never learns the second half of the journey. Samples stall partway.', act: m => m.set({ reflow: false, steps: 16, tmax: 0.3 }) },
  ],
  check: [
    { q: 'What does a flow-matching network learn to predict?', options: ['The velocity x1 − x0 along the straight line at a point and time', 'The noise only', 'The final image directly'], answer: 0, why: 'It learns the average slope of all lines through each point.' },
    { q: 'Why do random pairs need many sampling steps?', options: ['Their lines cross, so the learned field bends', 'They have too little data', 'They use the wrong time'], answer: 0, why: 'Curved paths need small steps.' },
    { q: 'What does reflow change?', options: ['It pairs each noise sample with the data point it reaches, so lines stop crossing', 'It adds more noise', 'It removes the network'], answer: 0, why: 'A straight field can be crossed in one step.' },
  ],
  terms: [
    ['Flow matching', 'Training a velocity field by regressing on straight-line slopes between noise and data.'],
    ['Velocity target', 'The slope x1 − x0 that the network is trained to predict.'],
    ['Interpolant', 'The point (1 − t)·x0 + t·x1 on the line at time t.'],
    ['Reflow', 'Re-pairing noise with its ODE endpoint and training again to straighten paths.'],
    ['Euler step', 'Moving by velocity times step size.'],
    ['ODE', 'Ordinary differential equation: here, the path a sample follows through the field.'],
  ],
  deeper: '<p><b>The link with DDPM.</b> A diffusion model\'s noise prediction and a flow model\'s velocity are two views of the same thing: with the right time schedule, one can be converted into the other. Flow matching simply picks the straight-line path, which trains cleanly and samples in fewer steps.</p><p><b>Why it won.</b> Simpler maths, no noise schedule to tune, and straighter paths made flow matching the training choice for many 2024 image models.</p><p><b>About this machine.</b> The velocity field is the exact flow-matching field for this one-dimensional data; reflowed paths join each noise sample straight to where a fine integration takes it.</p>',
  code: {
    title: 'The flow-matching loss and reflow',
    note: 'Adapted from the course\'s flow matching lesson.',
    text: `
import torch

def fm_loss(model, x1):
    x0 = torch.randn_like(x1)
    t = torch.rand(x1.shape[0], 1)
    xt = (1 - t) * x0 + t * x1                     # a point on the line
    return ((model(xt, t) - (x1 - x0)) ** 2).mean()   # predict the slope, noise -> data

@torch.no_grad()
def make_reflow_pairs(model, n, steps=100):
    x0 = torch.randn(n, 1); x = x0.clone()
    for i in range(steps):
        x = x + model(x, torch.full((n, 1), i / steps)) / steps
    return x0, x                                     # train again on these pairs
`,
  },
};
