// Loss functions: one prediction, several ways to score its mistake. Drag the guess along a rail; each loss draws its curve and its penalty tower.
// Squared error punishes big misses hard; absolute error treats them evenly; Huber is squared near the target, straight far away;
// for yes/no answers, cross-entropy punishes a confident wrong chance without limit.
// Break it: one outlier with squared error (the fit chases it), squared error on a yes/no chance (flat gradients when very wrong), a loss that ignores the sign.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const LOSSES = {
  mse: { n: 'Squared error', f: e => e * e, g: e => 2 * e, c: '#3D6BD6' },
  mae: { n: 'Absolute error', f: e => Math.abs(e), g: e => Math.sign(e), c: '#1C9A94' },
  huber: { n: 'Huber', f: e => Math.abs(e) < 1 ? 0.5 * e * e : Math.abs(e) - 0.5, g: e => Math.abs(e) < 1 ? e : Math.sign(e), c: '#8A3F8E' },
};
// a week of tomato prices at one market stall (in hundreds), one day a typo: 90 instead of 9
const PRICES = [8, 9, 10, 9, 11, 10, 9];

export default {
  slug: 'loss-functions',
  title: 'Loss functions: how wrong is wrong?',
  description: 'Training lowers one number, the loss, so how you score mistakes decides what the model learns. Squared error hates big misses, absolute error treats them evenly, Huber does both, and cross-entropy punishes a confident wrong chance without limit. Then add one typo to the data and watch squared error chase it.',
  overview: 'A loss function turns "how wrong was the model?" into one number to make smaller. The choice matters. Squared error grows fast with the size of a miss, so one wild value can drag the whole fit towards it; absolute error grows evenly and shrugs off outliers; Huber is gentle near the target and even far away. For chances (yes or no), cross-entropy is the natural loss: it grows without limit as a confident answer turns out wrong, which gives strong gradients exactly when the model needs them.',
  keywords: ['loss function explained', 'mean squared error', 'mean absolute error', 'huber loss', 'cross entropy loss'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.12, 0.6, 1.45], half: 2.8, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { loss: 'mse', typo: false, guess: 9.4, mode: 'price', p: 0.3, absOnly: false };
    const prices = () => st.typo ? [...PRICES.slice(0, 6), 90] : PRICES;
    const best = () => { const xs = prices(); if (st.loss === 'mse') return xs.reduce((a, b) => a + b, 0) / xs.length; if (st.loss === 'mae') { const a = [...xs].sort((p, q) => p - q); return a[a.length >> 1]; } let m = 9; for (let it = 0; it < 200; it++) m -= 0.1 * xs.reduce((s, x) => s + LOSSES.huber.g(m - x), 0) / xs.length; return m; };
    const total = g => { const L = LOSSES[st.loss]; return prices().reduce((s, x) => s + L.f(g - x), 0) / prices().length; };
    /* ---------- left: the price rail and the guess ---------- */
    const RX = -1.6, RW = 2.8, X = v => RX - RW / 2 + Math.min(1, v / 16) * RW;
    const rail = P.box(RW + 0.3, 0.1, 0.5, '#F1EEE6', { r: 0.05 }); rail.position.set(RX, 0, 0.7); S.add(rail);
    const ticks = [0, 4, 8, 12, 16].map(v => { const t = S.text(String(v * 100), { size: 0.1, weight: 700, color: '#151827', maxW: 0.5 }); t.position.set(X(v), 0.105, 0.98); S.add(t); return t; });
    const dots = [...Array(7)].map((_, i) => { const b = P.cyl(0.08, 0.16, C.red); b.userData.noFit = true; S.add(b); return b; });
    const typoArrow = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: C.red, face: 'cam', top: true }); typoArrow.userData.noFit = true; S.add(typoArrow);
    const guess = P.cyl(0.05, 0.6, C.gold); guess.userData.noFit = true; S.add(guess);
    const gTop = P.ball(0.1, C.gold); gTop.userData.noFit = true; S.add(gTop);
    const bestMark = P.box(0.04, 0.3, 0.5, C.plum, { r: 0 }); bestMark.userData.noFit = true; S.add(bestMark);
    /* ---------- the loss curve on a wall ---------- */
    const wall = P.box(RW + 0.3, 1.9, 0.06, '#FFFFFF', { r: 0.03, m: { emissive: '#2A2A2A' } }); wall.position.set(RX, 0.05, 0.3); S.add(wall);
    let curve = P.tube([V(), V(1, 0, 0)], 0.025, C.blue); curve.userData.noFit = true; S.add(curve);
    const cDot = P.ball(0.07, C.gold); cDot.userData.noFit = true; S.add(cDot);
    const wallT = S.text('', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 2.8 }); wallT.position.set(RX, 1.82, 0.335); S.add(wallT);
    /* ---------- right: penalty towers for each day's miss ---------- */
    const TX = 1.75;
    const tbase = P.box(2.4, 0.08, 1.1, '#F1EEE6', { r: 0.06 }); tbase.position.set(TX, 0, 0.4); S.add(tbase);
    const towers = [...Array(7)].map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: C.blue }); const b = P.box(0.22, 1, 0.22, C.blue, { r: 0.02, material: m }); b.position.set(TX - 0.9 + i * 0.3, 0.08, 0.4); b.userData.noFit = true; S.add(b); return { b, m }; });
    const towT = S.text('each day\'s penalty', { size: 0.1, weight: 800, color: '#151827', maxW: 2.2 }); towT.position.set(TX, 0.085, 0.88); S.add(towT);
    const towCap = [...Array(7)].map(() => { const t = S.text('', { size: 0.085, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.6 }); t.userData.noFit = true; S.add(t); return t; });
    function update(dt) {
      const xs = prices(), L = LOSSES[st.loss], g = st.guess;
      xs.forEach((x, i) => { dots[i].position.set(X(x), 0.1, 0.7 + (i % 2 ? 0.1 : -0.1)); });
      typoArrow.visible = st.typo; if (st.typo) { typoArrow.position.set(X(16) - 0.1, 0.6, 0.7); typoArrow.userData.set('typo: 9000 → off the rail'); }
      guess.position.set(X(g), 0.1, 0.7); gTop.position.set(X(g), 0.72, 0.7);
      const b = best(); bestMark.position.set(X(b), 0.1, 0.7);
      // the curve of average loss for every possible guess
      const pts = []; const top = Math.max(...[...Array(41)].map((_, k) => total(k * 0.4))), sc = 1.5 / Math.max(1e-6, top);
      for (let k = 0; k <= 80; k++) { const v = k * 0.2; pts.push(V(X(v), 0.15 + Math.min(1.6, total(v) * sc), 0.36)); }
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.025, 6, false); curve.material = P.mat(L.c);
      cDot.position.set(X(g), 0.15 + Math.min(1.6, total(g) * sc), 0.38);
      wallT.userData.set(`${L.n}: average penalty for every guess`);
      const pens = xs.map(x => L.f(g - x)), pmax = Math.max(1, ...pens);
      towers.forEach((t, i) => { const h = Math.max(0.02, pens[i] / pmax * 1.3); t.b.scale.y = h; t.m.color.set(i === 6 && st.typo ? C.red : L.c); towCap[i].position.set(TX - 0.9 + i * 0.3, 0.08 + h + 0.16, 0.4); towCap[i].userData.set(pens[i] < 10 ? pens[i].toFixed(1) : Math.round(pens[i]).toString()); });
    }
    const controls = [
      { type: 'buttons', label: 'Loss', options: Object.values(LOSSES).map(l => l.n), get: () => Object.keys(LOSSES).indexOf(st.loss), act: i => { st.loss = Object.keys(LOSSES)[i]; } },
      { type: 'slider', label: 'Your guess (hundreds)', min: 0, max: 16, step: 0.1, get: () => st.guess, set: v => { st.guess = v; } },
      { type: 'button', label: 'Jump to the lowest loss', short: 'Best guess', act: () => { st.guess = Math.min(16, best()); } },
      { type: 'toggle', label: 'One typo in the data (9000)', short: 'Typo', get: () => st.typo, set: v => { st.typo = v; } },
    ];
    const readouts = [
      { label: 'Average penalty', get: () => ({ v: total(st.guess).toFixed(2) }) },
      { label: 'Best guess for this loss', get: () => { const b = best(); return { v: `${Math.round(b * 100)}`, sub: st.loss === 'mse' ? 'the mean' : st.loss === 'mae' ? 'the median' : 'in between', bad: b > 13, good: b < 11 }; } },
    ];
    const labels = [
      { name: 'data', t: 'A week of prices', d: 'A tomato stall: one dot per day', icon: 'box', atV: V(RX - RW / 2 - 0.15, 0.1, 0.7) },
      { name: 'curve', t: 'The loss curve', d: 'Average penalty for every guess', icon: 'wave', atV: V(RX - RW / 2 - 0.15, 1.4, 0.3) },
      { name: 'towers', t: 'Each day\'s penalty', d: 'How hard each miss is punished', icon: 'scale', atV: V(TX + 1.2, 0.08, 0.4) },
      { name: 'best', t: 'Lowest loss', d: 'Purple: where training would settle', icon: 'target', at: () => bestMark.position.clone().add(V(0, 0.3, 0)) },
    ];
    const reset = () => { Object.assign(st, { loss: 'mse', typo: false, guess: 9.4 }); };
    const breaks = [
      { label: 'One typo, squared error', hint: '9000 instead of 900', on: () => { reset(); st.typo = true; st.guess = best(); }, off: reset },
      { label: 'Far from the target, absolute error', hint: 'Same push whatever the distance', on: () => { reset(); st.loss = 'mae'; st.guess = 15; }, off: reset },
    ];
    function status() {
      const b = best(), L = LOSSES[st.loss];
      if (st.typo && st.loss === 'mse') return { ok: false, msg: `<b>One typo dragged the answer to ${Math.round(b * 100)}.</b> Squared error punishes a miss of ${Math.round(90 - b)} hundred as ${Math.round((90 - b) ** 2).toLocaleString('en-GB')}, so the fit runs towards the 9000 typo (off the end of the rail) to shrink that one tower, and is now wrong for all six real days. Absolute error and Huber barely notice it (switch loss).` };
      if (st.loss === 'mae' && Math.abs(st.guess - b) > 3) return { ok: false, msg: `<b>The same push, near or far.</b> Absolute error's slope is the same size everywhere, so a guess far from the target gets no stronger push than one close by, and near the bottom it never slows down to settle. Huber is squared near the target (smooth landing) and straight far away (no outlier panic).` };
      if (st.typo) return { ok: true, msg: `<b>${L.n} shrugs off the typo:</b> best guess ${Math.round(b * 100)}, close to the six real days. Its penalty for the huge miss grows only in step with the size of the miss, so one bad value can't take over.` };
      return { ok: Math.abs(st.guess - b) < 0.3 ? true : undefined, msg: `<b>${L.n}: average penalty ${total(st.guess).toFixed(2)} at a guess of ${Math.round(st.guess * 100)}.</b> The lowest point of the curve (purple) is ${st.loss === 'mse' ? 'the mean' : st.loss === 'mae' ? 'the median' : 'between the mean and the median'}: ${Math.round(b * 100)}. Training slides the guess down this curve.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p), toBest: () => { st.guess = Math.min(16, best()); } };
  },

  story: [
    { t: 'One number to lower', home: true, say: 'A model learns by making one number smaller: the loss. Here the model guesses the price of a crate of tomatoes at a stall, and the dots are a week of real prices.', act: m => m.reset() },
    { t: 'Squared error', focus: 'towers', zoom: 1.3, say: 'Squared error squares each miss. A miss twice as big costs four times as much. Each tower is one day\'s penalty.' },
    { t: 'The loss curve', focus: 'curve', zoom: 1.2, say: 'Try every possible guess and you get the loss curve. Its lowest point is where training settles. For squared error, that is the average price.', act: m => m.toBest() },
    { t: 'A typo', home: true, say: 'Now one day is typed as nine thousand instead of nine hundred. Squared error punishes that miss so hard that the whole answer runs towards the typo.', act: m => { m.set({ typo: true }); m.toBest(); }, wait: 6 },
    { t: 'Gentler losses', home: true, say: 'Absolute error grows only in step with the miss, and its best guess is the middle price, the median. The typo barely matters. Huber is squared near the target and straight far away: the best of both.', act: m => { m.set({ loss: 'huber' }); m.toBest(); }, wait: 6 },
    { t: 'Losses for chances', home: true, say: 'For yes or no answers, models use cross-entropy instead: the penalty grows without limit as a confident answer turns out wrong. That is the loss from the information lesson.', act: m => m.set({ typo: false, loss: 'mse' }) },
  ],
  check: [
    { q: 'Why is squared error sensitive to outliers?', options: ['A big miss is squared, so it dominates the total', 'It ignores big misses', 'It only works for chances'], answer: 0, why: 'One miss of 80 costs 6,400, more than all the small misses together.' },
    { q: 'What guess minimises absolute error?', options: ['The median', 'The mean', 'The largest value'], answer: 0, why: 'Moving past the middle value adds as much penalty on one side as it removes on the other.' },
    { q: 'What does Huber loss combine?', options: ['Squared error near the target, absolute error far away', 'Cross-entropy and accuracy', 'Two different models'], answer: 0, why: 'Smooth near the bottom, gentle on outliers.' },
  ],
  terms: [
    ['Loss function', 'Turns the model\'s mistakes into one number that training makes smaller.'],
    ['Squared error (MSE)', 'The average of squared misses; punishes big misses hard.'],
    ['Absolute error (MAE)', 'The average size of the misses; robust to outliers.'],
    ['Huber loss', 'Squared for small misses, absolute for large ones.'],
    ['Cross-entropy', 'The loss for chances: big when a confident chance is wrong.'],
  ],
  deeper: '<p><b>The loss is a choice of what matters.</b> Forecasting stock that spoils? Running out may cost more than over-ordering, so use an uneven loss (quantile loss) that punishes one side more.</p><p><b>Gradients matter as much as values.</b> Absolute error\'s slope never shrinks, so training jitters near the bottom; squared error\'s slope fades smoothly. Cross-entropy paired with a sigmoid gives a gradient of simply (prediction − answer).</p><p><b>Losses for language models</b> are cross-entropy over the next token, averaged over every position of every sentence.</p>',
  code: {
    title: 'Four loss functions',
    note: 'Adapted from the course\'s loss-function lesson.',
    text: `
import numpy as np

def mse(y, p):   return np.mean((p - y) ** 2)
def mae(y, p):   return np.mean(np.abs(p - y))
def huber(y, p, d=1.0):
    e = np.abs(p - y)
    return np.mean(np.where(e < d, 0.5 * e ** 2, d * (e - 0.5 * d)))
def cross_entropy(y, p, eps=1e-12):
    p = np.clip(p, eps, 1 - eps)
    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))

prices = np.array([8, 9, 10, 9, 11, 10, 90])     # one typo
print("best under MSE (mean):", prices.mean())
print("best under MAE (median):", np.median(prices))
`,
  },
};
