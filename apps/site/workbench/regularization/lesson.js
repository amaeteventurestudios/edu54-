// Regularization: a small network learns maize harvest from rainfall on twelve farms in Kenya's Rift Valley.
// Left wall: the fitted curve against the training farms (orange) and new farms it never saw (teal).
// Right wall: training error and new-farm error over training steps, with the best stopping point in gold.
// Front: the 24 hidden neurons as pillars; height is the size of each weight, and dropout switches some off while training.
// Break it: train forever with no brakes (it memorises the noise), weight decay far too strong (a flat line), dropout left on when predicting (the curve flickers).
const K = 24, WD = 0.06, D = K + 1, NT = 12, NV = 16, SCALE = 5;    // harvest in tonnes per hectare = y × SCALE
const truth = x => 0.25 + 0.55 * Math.exp(-((x - 0.5) ** 2) / 0.05);
const phi = x => { const h = [1]; for (let j = 0; j < K; j++) h.push(Math.exp(-((x - j / (K - 1)) ** 2) / (2 * WD * WD))); return h; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
const TRAIN = [...Array(NT)].map((_, i) => { const x = (i + 0.2 + 0.6 * rnd()) / NT; return [x, truth(x) + 0.11 * gauss()]; });
const NEW = [...Array(NV)].map((_, i) => { const x = (i + 0.2 + 0.6 * rnd()) / NV; return [x, truth(x) + 0.04 * gauss()]; });
function jacobi(M) {
  const n = M.length, A = M.map(r => r.slice()), V = A.map((_, i) => A.map((_, j) => +(i === j)));
  for (let sw = 0; sw < 60; sw++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] ** 2;
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-14) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  return { e: A.map((r, i) => r[i]), V };
}
const PT = TRAIN.map(([x]) => phi(x)), PV = NEW.map(([x]) => phi(x));

export default {
  slug: 'regularization',
  title: 'Regularization: stop memorising, start learning',
  description: 'A small network learns maize harvest from rainfall on twelve Rift Valley farms. Train too long and it memorises each farm\'s luck; decay, dropout and stopping calm it.',
  overview: 'A network with enough neurons can pass through every training point, including the noise: that is overfitting, and it shows up as low training error but high error on new data. Regularization is any trick that stops the network memorising. Weight decay pulls every weight towards zero, so wild curves cost more. Dropout switches off random neurons during training, so no single neuron can carry a memorised fact. Early stopping keeps the version that did best on held-out data. Too much regularization swings the other way and the network learns nothing.',
  keywords: ['regularization deep learning', 'dropout explained', 'weight decay l2', 'early stopping', 'overfitting neural network'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.8, -0.2], dir: [0.1, 0.75, 1.3], half: 2.6, wide: 7.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { steps: 100000, decay: 0.01, drop: 0.3, evalOn: false, t: 0, mask: Array(K).fill(1) };
    /* ---------- the model: gradient descent from zero, solved exactly along each eigen-direction ---------- */
    const n = NT, G = [...Array(D)].map((_, i) => [...Array(D)].map((_, j) => PT.reduce((s, h) => s + h[i] * h[j], 0) / n));
    const g = [...Array(D)].map((_, i) => PT.reduce((s, h, k) => s + h[i] * TRAIN[k][1], 0) / n);
    let eig = null, w = Array(D).fill(0);
    function solve() {
      // weight decay adds λ to every weight; dropout at rate p acts like extra decay of p/(1-p) times each neuron's own strength
      const H = G.map(r => r.slice());
      for (let i = 1; i < D; i++) H[i][i] += st.decay + (st.drop / (1 - st.drop)) * G[i][i];
      const { e, V: Vm } = jacobi(H), lr = 1 / Math.max(...e);
      const proj = e.map((_, k) => Vm.reduce((a, r, i) => a + r[k] * g[i], 0));
      eig = { e, Vm, lr, proj };
    }
    function weightsAt(T) {
      const { e, Vm, lr, proj } = eig, out = Array(D).fill(0);
      for (let k = 0; k < D; k++) { const s = Math.max(e[k], 1e-12), c = (1 - (1 - lr * s) ** T) / s * proj[k]; for (let i = 0; i < D; i++) out[i] += Vm[i][k] * c; }
      return out;
    }
    const pred = (h, ww, m) => h.reduce((a, v, j) => a + v * ww[j] * (j === 0 || !m ? 1 : m[j - 1]), 0);
    const err = (Ph, Dt, ww) => SCALE * Math.sqrt(Ph.reduce((s, h, i) => s + (pred(h, ww) - Dt[i][1]) ** 2, 0) / Dt.length);
    /* ---------- the stage ---------- */
    const WW = 3.5, WH = 2.2, WZ = -1.2, FX = -1.85, LX = 1.85, PX0 = 0.3, PY0 = 0.45, PW = 3.0, PH = 1.45;
    const ink = '#151827';
    const mkWall = (x, title, top) => {
      const w = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); w.position.set(x, 0.12, WZ); floor.add(w);


    };
    mkWall(FX, 'Harvest against rainfall', 'what the network learned');
    mkWall(LX, 'Error while training', 'when to stop');
    const fx = x => FX - PW / 2 + x * PW, fy = y => 0.12 + PY0 + Math.max(0, Math.min(1.15, y)) * (PH / 1.15), FZ = WZ + 0.07;
    const axis = (x0, y0, x1, y1, x) => { const a = P.tube([V(x0, y0, FZ - 0.01), V(x1, y1, FZ - 0.01)], 0.008, '#B7B2A6'); a.userData.noFit = true; floor.add(a); };
    axis(fx(0), fy(0), fx(1), fy(0)); axis(fx(0), fy(0), fx(0), fy(1.15));


    const trainDots = TRAIN.map(([x, y]) => { const b = P.ball(0.045, C.orange); b.position.set(fx(x), fy(y), FZ + 0.02); b.userData.noFit = true; floor.add(b); return b; });
    const newDots = NEW.map(([x, y]) => { const b = P.ball(0.035, '#1C9A94'); b.position.set(fx(x), fy(y), FZ + 0.02); b.userData.noFit = true; floor.add(b); return b; });
    const curve = P.tube([V(), V(1, 0, 0)], 0.022, '#3B3F8F'); curve.userData.noFit = true; floor.add(curve);


    /* error chart: x = log10(steps) from 0 to 5 */
    const lx = v => LX - PW / 2 + v / 5 * PW, ly = e => 0.12 + PY0 + Math.min(1, e / 1.2) * PH;
    axisL(); function axisL() { const a = P.tube([V(lx(0), ly(0), FZ - 0.01), V(lx(5), ly(0), FZ - 0.01)], 0.008, '#B7B2A6'); a.userData.noFit = true; floor.add(a); const b = P.tube([V(lx(0), ly(0), FZ - 0.01), V(lx(0), ly(1.2), FZ - 0.01)], 0.008, '#B7B2A6'); b.userData.noFit = true; floor.add(b); }

    const trLine = P.tube([V(), V(1, 0, 0)], 0.02, '#EE7434'), nwLine = P.tube([V(), V(1, 0, 0)], 0.02, '#1C9A94');
    [trLine, nwLine].forEach(l => { l.userData.noFit = true; floor.add(l); });
    const nowMark = P.box(0.025, PH, 0.02, '#3B3F8F', { r: 0 }); nowMark.userData.noFit = true; floor.add(nowMark);
    const bestMark = P.ball(0.06, C.gold); bestMark.userData.noFit = true; floor.add(bestMark);


    /* the hidden neurons */
    const NZ = 0.75, plinth = P.box(6.6, 0.16, 0.6, '#3B3F8F', { r: 0.08 }); plinth.position.set(0, 0.12, NZ); floor.add(plinth);


    const pill = [...Array(K)].map((_, j) => { const m = new THREE.MeshLambertMaterial({ color: '#F2B544' }); const b = P.box(0.15, 1, 0.15, '#F2B544', { r: 0.03, material: m }); b.position.set(-2.88 + j * 0.25, 0.28, NZ - 0.08); b.userData.noFit = true; floor.add(b); return { b, m }; });

    /* ---------- drawing ---------- */
    let hist = [], best = 0;
    const tubeTo = (mesh, pts, r) => { mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), pts.length * 2, r, 5, false); };
    function drawCurve(m) {
      const pts = []; for (let i = 0; i <= 90; i++) { const x = i / 90; pts.push(V(fx(x), fy(pred(phi(x), w, m)), FZ + 0.03)); }
      tubeTo(curve, pts, 0.022);
    }
    function redraw() {
      solve();
      hist = []; for (let v = 0; v <= 5.0001; v += 0.1) { const ww = weightsAt(10 ** v); hist.push([v, err(PT, TRAIN, ww), err(PV, NEW, ww)]); }
      best = hist.reduce((b, h, i) => h[2] < hist[b][2] ? i : b, 0);
      tubeTo(trLine, hist.map(([v, a]) => V(lx(v), ly(a), FZ + 0.02)), 0.02);
      tubeTo(nwLine, hist.map(([v, , b]) => V(lx(v), ly(b), FZ + 0.03)), 0.02);
      bestMark.position.set(lx(hist[best][0]), ly(hist[best][2]), FZ + 0.05);
      w = weightsAt(st.steps);
      nowMark.position.set(lx(Math.log10(st.steps)), 0.12 + PY0, FZ + 0.01);
      drawCurve(null);
      pill.forEach((p, j) => { const h = Math.max(0.03, Math.min(1.25, Math.abs(w[j + 1]) * 2.4)); p.b.scale.y = h; });
    }
    redraw();
    const now = () => ({ tr: err(PT, TRAIN, w), nw: err(PV, NEW, w), size: Math.sqrt(w.slice(1).reduce((a, v) => a + v * v, 0)) });
    function update(dt) {
      st.t += dt;
      const tick = Math.floor(st.t / (S.reduced ? 1.2 : 0.45));
      if (tick !== st.tick) {
        st.tick = tick; seed = 1000 + tick;
        st.mask = Array(K).fill(0).map(() => (st.drop > 0 && rnd() < st.drop ? 0 : 1 / (1 - st.drop)));
        pill.forEach((p, j) => p.m.color.set(st.mask[j] ? (w[j + 1] >= 0 ? '#F2B544' : '#E07B39') : '#4A4D63'));
        if (st.evalOn) drawCurve(st.mask);
        const off = st.mask.filter(v => !v).length;
      }
    }
    const controls = [
      { type: 'slider', label: 'Training steps', min: 1, max: 100000, log: true, get: () => st.steps, set: v => { st.steps = v; redraw(); }, fmt: v => Math.round(v).toLocaleString() },
      { type: 'slider', label: 'Weight decay (pull towards zero)', min: 0.0001, max: 3, log: true, get: () => st.decay, set: v => { st.decay = v; redraw(); }, fmt: v => v < 0.01 ? v.toFixed(4) : v.toFixed(2) },
      { type: 'slider', label: 'Dropout (share switched off)', min: 0, max: 0.7, step: 0.05, get: () => st.drop, set: v => { st.drop = v; st.tick = -1; redraw(); }, fmt: v => `${Math.round(v * 100)}%` },
      { type: 'button', label: 'Stop at the best point', short: 'Stop early', act: () => { st.steps = Math.round(10 ** hist[best][0]); redraw(); } },
    ];
    const readouts = [
      { label: 'Training farms', get: () => { const r = now(); return { v: `${r.tr.toFixed(2)} t/ha`, sub: 'average miss' }; } },
      { label: 'New farms', get: () => { const r = now(); return { v: `${r.nw.toFixed(2)} t/ha`, sub: 'average miss', good: !st.evalOn && r.nw < 0.45, bad: st.evalOn || r.nw > 0.6 }; } },
      { label: 'Weight size', get: () => { const r = now(); return { v: r.size.toFixed(2), sub: 'all 24 together', bad: r.size > 1.1 }; } },
    ];
    const labels = [
      { name: 'fit', t: 'What it learned', d: 'Blue curve: predicted harvest', icon: 'wave', atV: V(FX - WW / 2, 0.12 + WH * 0.75, WZ) },
      { name: 'farms', t: 'Two kinds of farm', d: 'Orange trained on, teal never seen', icon: 'target', atV: V(FX - WW / 2, 0.12 + WH * 0.3, WZ) },
      { name: 'chart', t: 'Error while training', d: 'Gold: the best moment to stop', icon: 'scale', atV: V(LX + WW / 2, 0.12 + WH * 0.75, WZ) },
      { name: 'neurons', t: 'Hidden neurons', d: 'Height: weight size; grey: dropped', icon: 'box', atV: V(3.3, 0.28, NZ) },
    ];
    const reset = () => { Object.assign(st, { steps: 100000, decay: 0.01, drop: 0.3, evalOn: false }); st.tick = -1; redraw(); };
    const breaks = [
      { label: 'Train forever, no brakes', hint: 'No decay, no dropout', on: () => { reset(); Object.assign(st, { decay: 0.0001, drop: 0 }); st.tick = -1; redraw(); }, off: reset },
      { label: 'Weight decay far too strong', hint: 'Decay 3', on: () => { reset(); st.decay = 3; redraw(); }, off: reset },
      { label: 'Dropout left on when predicting', hint: 'Forgot to switch to eval mode', on: () => { reset(); st.evalOn = true; st.tick = -1; }, off: reset },
    ];
    function status() {
      const r = now(), bestE = hist[best][2];
      if (st.evalOn) return { ok: false, msg: `<b>The answer keeps changing.</b> Dropout is still switching neurons off while the network predicts, so every look gives a different curve for the same rainfall. Dropout is for training only: in eval mode every neuron works and nothing is random.` };
      if (r.tr < 0.6 * r.nw && r.nw > bestE + 0.08) return { ok: false, msg: `<b>Memorised, not learned.</b> The curve bends through every training farm, so their average miss is just ${r.tr.toFixed(2)} t/ha, but new farms are off by ${r.nw.toFixed(2)} t/ha. It learned each farm's luck, not the pattern. The gold dot marks where it should have stopped.` };
      if (r.tr > 0.5 && st.steps < 10 ** hist[best][0] / 4) return { ok: false, msg: `<b>Barely trained.</b> After only ${Math.round(st.steps).toLocaleString()} step${Math.round(st.steps) === 1 ? "" : "s"} the curve is still close to where it started, so even the training farms are off by ${r.tr.toFixed(2)} t/ha. Keep training until the error chart reaches the gold dot.` };
      if (r.tr > 0.75) return { ok: false, msg: `<b>Too much brake.</b> Weight decay is pulling every weight so hard towards zero that the curve can barely bend: even the training farms are off by ${r.tr.toFixed(2)} t/ha. The network has stopped learning anything.` };
      return { ok: true, msg: `<b>Learned the pattern.</b> Training farms are off by ${r.tr.toFixed(2)} t/ha and new farms by ${r.nw.toFixed(2)} t/ha. The curve follows the rise and fall of harvest with rain without chasing every farm's luck.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); st.tick = -1; redraw(); }, best: () => { st.steps = Math.round(10 ** hist[best][0]); redraw(); } };
  },

  story: [
    { t: 'Twelve farms', home: true, say: 'A small network is learning maize harvest from rainfall, using twelve farms in Kenya\'s Rift Valley. Teal dots are farms it never sees while training.', act: m => m.set({ steps: 30, decay: 0.0001, drop: 0 }) },
    { t: 'Memorising', home: true, say: 'Train it for a long time with nothing holding it back. The curve bends through every orange farm, including each one\'s good or bad luck, and misses the teal farms badly.', act: m => m.set({ steps: 100000, decay: 0.0001, drop: 0 }), wait: 3 },
    { t: 'Stop early', home: true, say: 'The error chart shows the moment it started memorising: error on new farms stopped falling and began to rise. Stopping at the gold dot is early stopping.', act: m => m.best(), wait: 3 },
    { t: 'Weight decay', home: true, say: 'Weight decay pulls every weight a little towards zero on each step. Wild bends need big weights, so the pillars shrink and the curve calms down.', act: m => m.set({ steps: 100000, decay: 0.05, drop: 0 }), wait: 3 },
    { t: 'Dropout', home: true, say: 'Dropout switches off random neurons on every training step, the grey pillars. No single neuron can hold a memorised farm, so the network must spread what it knows.', act: m => m.set({ steps: 100000, decay: 0.0001, drop: 0.5 }), wait: 4 },
    { t: 'All together', home: true, say: 'Real networks use a little of each. Too much, and the curve goes flat. And remember to switch dropout off when the network makes real predictions.', act: m => m.set({ steps: 100000, decay: 0.01, drop: 0.3 }) },
  ],
  check: [
    { q: 'What is the clearest sign of overfitting?', options: ['Low error on training data but high error on new data', 'High error on both', 'Training takes a long time'], answer: 0, why: 'It has memorised the examples rather than the pattern.' },
    { q: 'How does dropout help?', options: ['It switches off random neurons during training, so no single one can memorise', 'It deletes the worst training examples', 'It makes the learning rate smaller'], answer: 0, why: 'The network has to spread knowledge across many neurons.' },
    { q: 'What happens if weight decay is far too strong?', options: ['The weights are pulled to near zero and the model underfits', 'The model memorises faster', 'Nothing changes'], answer: 0, why: 'The curve cannot bend enough to follow even the training data.' },
  ],
  terms: [
    ['Overfitting', 'Fitting the training data so closely that the model learns its noise and fails on new data.'],
    ['Regularization', 'Any technique that discourages a model from memorising.'],
    ['Weight decay', 'Shrinking every weight a little on each step; also called L2 regularization.'],
    ['Dropout', 'Randomly switching off neurons during training.'],
    ['Early stopping', 'Keeping the model from the step where held-out error was lowest.'],
    ['Eval mode', 'The setting for making predictions: dropout off, normalisation uses stored averages.'],
  ],
  deeper: '<p><b>Normalization layers.</b> Batch normalization rescales each layer\'s outputs using the average of the current batch, which steadies training and adds a little noise that regularizes. Language models use layer normalization or RMSNorm instead, which work one example at a time.</p><p><b>Data augmentation</b> is regularization too: flipping, cropping or rephrasing examples shows the network more variety without collecting new data.</p><p><b>About this machine.</b> The network here has one hidden layer of fixed bumps, so its training path can be worked out exactly instead of step by step, and dropout is shown by its average effect on the weights.</p>',
  code: {
    title: 'Dropout with train and eval modes, and weight decay',
    note: 'Adapted from the course\'s regularization lesson.',
    text: `
import numpy as np

class Dropout:
    def __init__(self, p=0.3):
        self.p, self.training = p, True

    def forward(self, x):
        if not self.training or self.p == 0:
            return x                    # eval mode: every neuron works
        self.mask = (np.random.rand(*x.shape) >= self.p) / (1 - self.p)
        return x * self.mask            # scale up so the average stays the same

def sgd_step(w, grad, lr=0.1, weight_decay=0.01):
    return w - lr * (grad + weight_decay * w)

# early stopping: keep the weights with the best validation loss
best, best_w = float("inf"), None
for epoch in range(200):
    w = train_one_epoch(w)
    val = validation_loss(w)
    if val < best:
        best, best_w = val, w.copy()
`,
  },
};
