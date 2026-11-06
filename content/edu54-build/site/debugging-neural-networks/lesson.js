// Debugging neural networks: a diagnostic bench around a six-layer network that sorts coffee beans from a washing station in Sidama into three grades.
// Each layer is a block with eight lamps on top (dark = a dead neuron that never fires) and a red bar in front (the size of its gradient).
// The wall runs two standard tests: can it memorise one batch of eight beans, and a learning-rate finder sweep with the chosen rate marked.
// Break it: dead ReLUs from a bad starting bias, a deep sigmoid network (gradients vanish), a learning rate far too high (the loss turns NaN).
const D = 6, Wd = 32, NIN = 4, NOUT = 3, BATCH = 8, STEPS = 150;
const LRS = [...Array(13)].map((_, i) => 10 ** (-4 + i * 0.4));

function makeRng(seed) { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r()); return { r, g }; }
function batch() { const { r, g } = makeRng(77); return [...Array(BATCH)].map((_, i) => { const y = i % NOUT; return { x: [...Array(NIN)].map((_, k) => g() * 0.6 + (k === y ? 1.2 : 0)), y }; }); }
function initNet(o) {
  const { g } = makeRng(9);
  const sizes = [NIN, ...Array(D - 1).fill(Wd), NOUT];
  return sizes.slice(1).map((n, l) => { const fin = sizes[l], sd = o.act === 'relu' ? Math.sqrt(2 / fin) : Math.sqrt(1 / fin); return { W: [...Array(n)].map(() => [...Array(fin)].map(() => g() * sd)), b: Array(n).fill(l < D - 1 ? o.bias : 0) }; });
}
function pass(net, o, data, lr) {
  const f = o.act === 'relu' ? z => Math.max(0, z) : z => 1 / (1 + Math.exp(-z)), df = o.act === 'relu' ? (z, h) => (z > 0 ? 1 : 0) : (z, h) => h * (1 - h);
  const gW = net.map(L => L.W.map(r => r.map(() => 0))), gb = net.map(L => L.b.map(() => 0)), alive = net.map(L => L.b.map(() => 0));
  let loss = 0;
  for (const { x, y } of data) {
    const hs = [x], zs = [];
    net.forEach((L, l) => { const z = L.W.map((row, j) => row.reduce((a, w, i) => a + w * hs[l][i], L.b[j])); zs.push(z); hs.push(l < D - 1 ? z.map(f) : z); });
    const out = hs[D], m = Math.max(...out), ex = out.map(v => Math.exp(v - m)), sm = ex.reduce((a, v) => a + v, 0), p = ex.map(v => v / sm);
    loss += -Math.log(p[y] + 1e-12);
    let d = p.map((v, j) => (v - (j === y ? 1 : 0)) / data.length);
    for (let l = D - 1; l >= 0; l--) {
      const L = net[l], dz = l < D - 1 ? d.map((v, j) => v * df(zs[l][j], hs[l + 1][j])) : d;
      if (l < D - 1) zs[l].forEach((z, j) => { if (o.act === 'relu' ? z > 0 : true) alive[l][j] = 1; });
      dz.forEach((v, j) => { gb[l][j] += v; hs[l].forEach((h, i) => { gW[l][j][i] += v * h; }); });
      d = hs[l].map((_, i) => dz.reduce((a, v, j) => a + v * L.W[j][i], 0));
    }
  }
  if (lr) net.forEach((L, l) => { L.W.forEach((row, j) => row.forEach((w, i) => { row[i] -= lr * gW[l][j][i]; })); L.b.forEach((v, j) => { L.b[j] -= lr * gb[l][j]; }); });
  const gsize = gW.map(Lg => Math.sqrt(Lg.flat().reduce((a, v) => a + v * v, 0) / Lg.flat().length));
  return { loss: loss / data.length, gsize, alive };
}
function diagnose(o) {
  const data = batch();
  const first = pass(initNet(o), o, data, 0);
  const net = initNet(o), curve = [];
  for (let s = 0; s < STEPS; s++) { const r = pass(net, o, data, o.lr); curve.push(r.loss); if (!Number.isFinite(r.loss) || r.loss > 50) { curve.push(NaN); break; } }
  const finder = LRS.map(lr => { const n = initNet(o); let l = 0; for (let s = 0; s < 25; s++) { l = pass(n, o, data, lr).loss; if (!Number.isFinite(l) || l > 50) return NaN; } return l; });
  const dead = first.alive.slice(0, D - 1).map(a => a.filter(v => !v).length / a.length);
  return { curve, finder, gsize: first.gsize, dead, alive: first.alive };
}

export default {
  slug: 'debugging-neural-networks',
  title: 'Debugging neural networks: tests before training',
  description: 'A small network should predict cattle prices in Mombasa, and it will not learn. Work through the checks in order: one batch, the learning rate, then the gradients.',
  overview: 'When a network will not train, guessing wastes days. A few quick checks find most problems before the long run. Can it memorise one small batch? If not, something is broken in the model or the loss, not the data. Are the gradients a sensible size in every layer, or do they vanish towards the input? Are neurons dead, never firing at all? And a learning-rate finder trains briefly at rising rates and shows where the loss falls fastest, so you can pick a rate just below where it blows up.',
  keywords: ['debugging neural networks', 'overfit one batch', 'learning rate finder', 'dead relu', 'vanishing gradients check'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.85, 0], dir: [0.15, 0.55, 1.3], half: 1.9, wide: 7.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { act: 'relu', bias: 0, lr: 0.1 };
    const ink = '#151827';
    /* ---------- the network on the bench ---------- */
    const NX0 = -3.0, NDX = 0.62, NZ = 0.35;
    const bench = P.box(4.0, 0.08, 1.5, '#5B6178', { r: 0.06 }); bench.position.set(NX0 + 2.5 * NDX + 0.15, 0.12, NZ); floor.add(bench);

    const layers = [...Array(D)].map((_, l) => {
      const x = NX0 + 0.3 + l * NDX, b = P.box(0.42, 0.5, 0.5, l === D - 1 ? C.plum : C.indigo, { r: 0.05 }); b.position.set(x, 0.2, NZ - 0.1); floor.add(b);
      const lampMat = [], lamps = l === D - 1 ? [] : [...Array(8)].map((_, k) => { const m = new THREE.MeshLambertMaterial({ color: '#F2C94C', emissive: '#4A3A00' }); lampMat.push(m); const c = P.cyl(0.035, 0.04, '#F2C94C', { material: m, seg: 10 }); c.position.set(x - 0.15 + (k % 4) * 0.1, 0.7, NZ - 0.05 + Math.floor(k / 4) * 0.12); floor.add(c); return c; });
      const gm = new THREE.MeshLambertMaterial({ color: C.red }), gbar = P.box(0.16, 1, 0.1, C.red, { r: 0.02, material: gm }); gbar.position.set(x, 0.2, NZ + 0.42); gbar.userData.noFit = true; floor.add(gbar);
      return { x, b, lamps, lampMat, gbar, gm };
    });

    /* ---------- the wall: two tests ---------- */
    const WX = 2.25, WZ = -0.35, WW = 2.9, WH = 2.3;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); floor.add(wall);

    const GZ = WZ + 0.06, CX0 = WX - WW / 2 + 0.2, CW = WW - 0.4;


    const c1y = v => 0.12 + 1.3 + Math.min(1, v / 1.4) * 0.75, c2y = v => 0.12 + 0.2 + Math.min(1, v / 1.4) * 0.7;
    const axis = (y) => { const a = P.tube([V(CX0, y, GZ - 0.005), V(CX0 + CW, y, GZ - 0.005)], 0.006, '#B7B2A6'); a.userData.noFit = true; floor.add(a); };
    axis(c1y(0)); axis(c2y(0));
    const goal = P.tube([V(CX0, c1y(0.05), GZ - 0.003), V(CX0 + CW, c1y(0.05), GZ - 0.003)], 0.006, '#3E9B5F'); goal.userData.noFit = true; floor.add(goal);

    const lossLine = P.tube([V(), V(1, 0, 0)], 0.018, C.indigo); lossLine.userData.noFit = true; floor.add(lossLine);
    const findLine = P.tube([V(), V(1, 0, 0)], 0.018, C.teal); findLine.userData.noFit = true; floor.add(findLine);
    const lrMark = P.box(0.02, 0.75, 0.02, C.orange, { r: 0 }); lrMark.userData.noFit = true; floor.add(lrMark);


    const lrX = lr => CX0 + (Math.log10(lr) + 4) / 4.8 * CW;

    /* ---------- diagnose and draw ---------- */
    let R = null;
    const tubeTo = (m, pts) => { if (pts.length < 2) pts = [pts[0] || V(), (pts[0] || V()).clone().add(V(0.01, 0, 0))]; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 2, 0.018, 4, false); };
    function draw() {
      R = diagnose(st);
      const gmax = Math.max(...R.gsize.filter(Number.isFinite), 1e-12);
      layers.forEach((L, l) => {
        const g = R.gsize[l], h = Math.max(0.02, Math.min(0.55, (Math.log10(g / gmax + 1e-9) + 4) / 4 * 0.55));
        L.gbar.scale.y = h; L.gbar.position.y = 0.2;
        L.lampMat.forEach((m, k) => { const on = R.alive[l][k * 4] === 1; m.color.set(on ? '#F2C94C' : '#3A3D52'); m.emissive.set(on ? '#4A3A00' : '#000000'); });
      });
      const finite = R.curve.filter(Number.isFinite), nan = R.curve.some(v => !Number.isFinite(v));
      tubeTo(lossLine, finite.map((v, i) => V(CX0 + i / STEPS * CW, c1y(v), GZ)));
      const fp = []; R.finder.forEach((v, i) => { if (Number.isFinite(v)) fp.push(V(lrX(LRS[i]), c2y(v), GZ)); });
      tubeTo(findLine, fp);
      lrMark.position.set(lrX(st.lr), c2y(0), GZ + 0.01);
    }
    draw();
    const oneBatch = () => { const f = R.curve[R.curve.length - 1]; return Number.isFinite(f) ? f : Infinity; };
    const deadPct = () => Math.round(100 * R.dead.reduce((a, v) => a + v, 0) / R.dead.length);
    const ratio = () => R.gsize[0] / Math.max(1e-12, R.gsize[D - 1]);
    const sci = v => (v === 0 ? '0' : v >= 0.01 ? v.toFixed(2) : v.toExponential(0));
    const controls = [
      { type: 'buttons', label: 'Activation', options: ['ReLU', 'Sigmoid'], get: () => (st.act === 'relu' ? 0 : 1), act: i => { st.act = i ? 'sigmoid' : 'relu'; draw(); } },
      { type: 'slider', label: 'Starting bias of hidden neurons', min: -3, max: 0.5, step: 0.1, get: () => st.bias, set: v => { st.bias = v; draw(); } },
      { type: 'slider', label: 'Learning rate', min: 0.001, max: 5, log: true, get: () => st.lr, set: v => { st.lr = v; draw(); }, fmt: v => (v < 0.01 ? v.toFixed(3) : v.toFixed(2)) },
    ];
    const readouts = [
      { label: 'One-batch test', get: () => { const f = oneBatch(); return { v: Number.isFinite(f) ? (f < 0.05 ? 'passed' : 'failed') : 'NaN', sub: Number.isFinite(f) ? `loss ${f.toFixed(3)}` : 'loss blew up', good: f < 0.05, bad: !(f < 0.05) }; } },
      { label: 'Dead neurons', get: () => ({ v: `${deadPct()}%`, sub: 'never fire', bad: deadPct() > 40, good: deadPct() < 10 }) },
      { label: 'Gradient ratio', get: () => ({ v: sci(ratio()), sub: 'layer 1 ÷ last; 0.1–10 is healthy', bad: ratio() < 0.01, good: ratio() >= 0.01 }) },
    ];
    const labels = [
      { name: 'lamps', t: 'Neuron lamps', d: 'Dark: dead, never fires', icon: 'eye', atV: V(NX0 + 0.15, 0.72, NZ - 0.1) },
      { name: 'bars', t: 'Gradient bars', d: 'How much each layer learns', icon: 'scale', atV: V(NX0 + 0.15, 0.3, NZ + 0.42) },
      { name: 'test1', t: 'Memorise one batch', d: 'If it can\'t, something is broken', icon: 'check', atV: V(WX + WW / 2, 0.12 + 1.7, WZ) },
      { name: 'test2', t: 'Learning-rate finder', d: 'Pick a rate before the cliff', icon: 'wave', atV: V(WX + WW / 2, 0.12 + 0.55, WZ) },
    ];
    const reset = () => { Object.assign(st, { act: 'relu', bias: 0, lr: 0.1 }); draw(); };
    const breaks = [
      { label: 'Bad starting bias', hint: 'Every hidden bias starts at −3', on: () => { reset(); st.bias = -3; draw(); }, off: reset },
      { label: 'Deep sigmoid network', hint: 'Sigmoid in all six layers', on: () => { reset(); st.act = 'sigmoid'; draw(); }, off: reset },
      { label: 'Learning rate too high', hint: 'Rate 5', on: () => { reset(); st.lr = 5; draw(); }, off: reset },
    ];
    function status() {
      const f = oneBatch();
      if (!Number.isFinite(f)) return { ok: false, msg: `<b>The loss turned NaN.</b> At a rate of ${st.lr.toFixed(2)} the first steps overshoot so far that the numbers overflow. The finder shows the cliff: the teal curve ends where training blows up. Pick a rate a little below the bottom of the curve.` };
      if (deadPct() > 40) return { ok: false, msg: `<b>Dead neurons.</b> With every hidden bias starting at ${st.bias.toFixed(1)}, ${deadPct()}% of the neurons never produce a positive value, so ReLU outputs zero and passes back zero gradient: the dark lamps can never wake up. ${f < 0.05 ? '' : 'It cannot even memorise eight beans. '}Start biases at zero.` };
      if (ratio() < 0.01) return { ok: false, msg: `<b>Gradients vanish.</b> Each sigmoid layer shrinks the gradient, so the first layer gets ${sci(ratio())} of what the last one gets: the red bars fade towards the input. ${f < 0.05 ? '' : 'It fails the one-batch test (loss ' + f.toFixed(2) + '). '}Use ReLU, or add normalisation and skip connections.` };
      if (f >= 0.05) return { ok: false, msg: `<b>Can't memorise one batch.</b> After ${STEPS} steps on just eight beans the loss is still ${f.toFixed(2)}. ${st.lr < 0.01 ? 'The rate is too small to get anywhere: the finder shows faster rates work better.' : 'Something in the model or the loss needs fixing before you try the full data.'}` };
      return { ok: true, msg: `<b>Ready for real training.</b> It memorises one batch (loss ${f.toFixed(3)}), only ${deadPct()}% of neurons stay silent on this batch, the gradient reaching layer 1 is ${sci(ratio())} of the last layer's, and the rate of ${st.lr.toFixed(2)} sits on the falling part of the finder curve.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The bench', home: true, say: 'This network sorts coffee beans from a washing station in Sidama into three grades. Before a long training run, put it on the bench and test it.', act: m => m.set({ act: 'relu', bias: 0, lr: 0.1 }) },
    { t: 'Memorise one batch', home: true, say: 'Test one: train on just eight beans. A healthy network should learn them perfectly, driving the loss to almost zero. If it can\'t, the bug is in the model or the loss.', act: m => m.set({}) },
    { t: 'Dead neurons', home: true, say: 'Start every bias far below zero, and the lamps go dark. Those neurons never fire, so they pass back no gradient and can never recover.', act: m => m.set({ bias: -3 }) },
    { t: 'Vanishing gradients', home: true, say: 'Switch to sigmoid in every layer, and watch the red bars. Each layer shrinks the gradient, so the layers nearest the input barely learn at all.', act: m => m.set({ bias: 0, act: 'sigmoid' }) },
    { t: 'The rate finder', home: true, say: 'Test two trains briefly at rising learning rates. The loss falls faster and faster, then the curve stops where training blows up.', act: m => m.set({ act: 'relu', lr: 0.1 }) },
    { t: 'Over the cliff', home: true, say: 'Choose a rate past the cliff, and the one batch test ends in NaN. Pick a rate a little before the bottom of the curve.', act: m => m.set({ lr: 5 }) },
  ],
  check: [
    { q: 'Why test whether a network can memorise one small batch?', options: ['If it can\'t, the model or loss is broken, not the data', 'To finish training faster', 'To check the GPU is working'], answer: 0, why: 'Any working network should be able to memorise a handful of examples.' },
    { q: 'What makes a ReLU neuron dead?', options: ['Its input is always negative, so it outputs zero and passes back no gradient', 'Its weights are too big', 'It is in the last layer'], answer: 0, why: 'With zero gradient, nothing can push it back into use.' },
    { q: 'How do you use a learning-rate finder?', options: ['Pick a rate on the falling part of the curve, before it blows up', 'Pick the biggest rate tried', 'Pick the smallest rate tried'], answer: 0, why: 'That is where the loss falls fastest while staying stable.' },
  ],
  terms: [
    ['Overfit-one-batch test', 'Training on one small batch to check the network can learn at all.'],
    ['Dead neuron', 'A ReLU neuron whose input is always negative, so it never fires or learns.'],
    ['Vanishing gradients', 'Gradients shrinking towards zero as they pass back through layers.'],
    ['Learning-rate finder', 'A short sweep of rising learning rates that shows where training is fastest.'],
    ['NaN', 'Not a Number: what you get when values overflow or divide by zero.'],
    ['Gradient check', 'Comparing backprop\'s gradient with a slow numerical estimate.'],
  ],
  deeper: '<p><b>Gradient checking.</b> Nudge one weight by a tiny amount up and down, measure how the loss changes, and compare with the gradient backprop gave. If they disagree, the backward pass has a bug.</p><p><b>Watch the statistics.</b> Logging the average and spread of each layer\'s activations and gradients during training catches dead layers and explosions long before the loss does.</p><p><b>Common slip-ups</b> include applying softmax twice, forgetting zero_grad, mixing up train and eval mode, and labels that do not line up with their inputs.</p>',
  code: {
    title: 'The overfit-one-batch test and a learning-rate finder',
    note: 'Adapted from the course\'s debugging lesson.',
    text: `
def overfit_one_batch(model, x, y, steps=150, lr=0.1):
    opt = SGD(model.parameters(), lr=lr)
    for step in range(steps):
        opt.zero_grad()
        loss = cross_entropy(model(x), y)
        loss.backward()
        opt.step()
    return loss.item()          # should be close to zero

def lr_finder(make_model, x, y, rates):
    results = []
    for lr in rates:
        loss = overfit_one_batch(make_model(), x, y, steps=25, lr=lr)
        results.append((lr, loss))
    return results              # pick a rate before the curve shoots up

def dead_fraction(activations):
    return (activations.max(dim=0).values <= 0).float().mean()
`,
  },
};
