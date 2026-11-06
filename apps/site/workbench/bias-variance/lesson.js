// Bias and variance: maize yield against fertiliser follows a gentle curve, measured with noise. Fit curves of different flexibility
// to ten fresh samples at once: stiff curves all miss the same way (bias), floppy curves each chase their own noise (variance).
// The U-chart shows training error falling while new-data error falls then rises.
// Break it: a straight line (all wrong together), degree 12 on 12 points (wild), and very few measurements.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const truth = x => 1.2 + 2.6 * x - 1.9 * x * x + 0.35 * Math.sin(6 * x);     // fertiliser 0..1 → yield in tonnes a hectare
const XL = -2.4, XW = 3.4, Y0 = 0.15, YS = 0.85, DMAX = 12;
function sample(seed, n) { const r = rngOf(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); return [...Array(n)].map((_, i) => { const x = (i + 0.5) / n + (r() - 0.5) * 0.6 / n; return [x, truth(x) + g() * 0.28]; }); }
// least squares polynomial on Legendre-like scaled x (2x − 1) with a hair of ridge
function polyfit(pts, d) {
  const n = d + 1, A = [...Array(n)].map(() => new Array(n).fill(0)), b = new Array(n).fill(0);
  for (const [x0, y] of pts) { const x = 2 * x0 - 1, pw = [1]; for (let k = 1; k < n; k++) pw.push(pw[k - 1] * x); for (let i = 0; i < n; i++) { b[i] += pw[i] * y; for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j]; } }
  for (let i = 0; i < n; i++) A[i][i] += 1e-7;
  for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const w = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * w[c]; w[i] = s / A[i][i]; }
  return x0 => { const x = 2 * x0 - 1; let s = 0, p = 1; for (const c of w) { s += c * p; p *= x; } return s; };
}

export default {
  slug: 'bias-variance',
  title: 'Bias and variance: too stiff, too floppy',
  description: 'Maize yield rises with fertiliser, then levels off. Fit curves of different flexibility to ten different fields at once: stiff curves all miss the same way, floppy ones each chase their own noise. Find the sweet spot where new data is predicted best.',
  overview: 'Every model sits somewhere between too stiff and too floppy. A stiff model, like a straight line, misses the true shape the same way whatever data it sees: that is bias, or underfitting. A floppy model follows every bump of its own data, so it changes wildly from one sample to the next: that is variance, or overfitting. Error on training data keeps falling as models get more flexible, but error on new data falls and then rises. The best model sits at the bottom of that U.',
  keywords: ['bias variance tradeoff', 'underfitting overfitting', 'model complexity', 'polynomial regression', 'generalization error'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.9, 0], dir: [0.12, 0.55, 1.45], half: 2.9, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { d: 3, n: 14, many: true };
    const X = x => XL + x * XW, Y = y => Y0 + Math.max(-0.2, Math.min(3.2, y)) * YS;
    /* ---------- the chart wall ---------- */
    const wall = P.box(XW + 0.5, 3.0, 0.06, '#FFFFFF', { r: 0.03, m: { emissive: '#3A3A3A' } }); wall.position.set(XL + XW / 2, 0.05, -0.45); S.add(wall);
    const tpts = []; for (let i = 0; i <= 80; i++) tpts.push(V(X(i / 80), Y(truth(i / 80)), -0.38));
    const tcurve = P.tube(tpts, 0.025, '#2C2D31'); S.add(tcurve);
    const axX = S.text('fertiliser →', { color: '#151827', size: 0.14, face: 'front', weight: 750, maxW: 2 }); axX.position.set(X(0.82), Y0 - 0.0, -0.41); S.add(axX);
    const axY = S.text('yield ↑', { color: '#151827', size: 0.14, face: 'front', weight: 750, maxW: 1 }); axY.position.set(X(0.06), Y0 + 2.75, -0.41); S.add(axY);
    const SEEDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const fits = SEEDS.map((_, k) => { const t = P.tube([V(), V(1, 0, 0)], k ? 0.012 : 0.03, k ? '#E9A99E' : C.coral); t.userData.noFit = true; if (k) t.layers.set(1); S.add(t); return t; });
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshLambertMaterial({ color: C.blue }), 60); dots.userData.noFit = true; S.add(dots);
    /* ---------- the U-chart on the floor ---------- */
    const UX = 2.35, UW = 2.2;
    const floor = P.box(UW + 0.4, 0.1, 2.2, '#F1EEE6', { r: 0.1 }); floor.position.set(UX, 0, 0.35); S.add(floor);
    const trBars = [...Array(DMAX)].map(() => { const b = P.box(0.07, 1, 0.22, C.blue, { r: 0.01 }); b.userData.noFit = true; S.add(b); return b; });
    const teBars = [...Array(DMAX)].map(() => { const m = new THREE.MeshLambertMaterial({ color: C.orange }); const b = P.box(0.07, 1, 0.22, C.orange, { r: 0.01, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const uT = S.text('error: blue on its own data, orange on new data', { color: '#151827', size: 0.09, weight: 800, maxW: 2.4 }); uT.position.set(UX, 0.105, 1.3); S.add(uT);
    const uN = S.text('flexibility (degree) 1 → 12', { color: '#151827', size: 0.09, weight: 800, maxW: 2.4 }); uN.position.set(UX, 0.105, 1.1); S.add(uN);
    const dummy = new THREE.Object3D();
    const TEST = sample(99, 200);
    const rmse = (f, pts) => Math.sqrt(pts.reduce((s, [x, y]) => s + (f(x) - y) ** 2, 0) / pts.length);
    function errsFor(d) { let tr = 0, te = 0; for (const s of SEEDS) { const p = sample(s, st.n), f = polyfit(p, Math.min(d, st.n - 1)); tr += rmse(f, p); te += rmse(f, TEST); } return [tr / SEEDS.length, te / SEEDS.length]; }
    let curveErr = [];
    function draw() {
      SEEDS.forEach((s, k) => {
        const p = sample(s, st.n), f = polyfit(p, Math.min(st.d, st.n - 1)), pts = [];
        for (let i = 0; i <= 120; i++) pts.push(V(X(i / 120), Y(f(i / 120)), -0.36 + k * 0.002));
        fits[k].geometry.dispose(); fits[k].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, k ? 0.012 : 0.03, 5, false);
        fits[k].visible = k === 0 || st.many;
        if (k === 0) p.forEach(([x, y], i) => { dummy.position.set(X(x), Y(y), -0.34); dummy.scale.setScalar(1); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); });
      });
      dots.count = st.n; dots.instanceMatrix.needsUpdate = true;
      curveErr = [...Array(DMAX)].map((_, i) => errsFor(i + 1));
      const top = Math.max(0.6, ...curveErr.map(e => Math.min(1.2, e[1])));
      curveErr.forEach(([tr, te], i) => {
        const x = UX - UW / 2 + (i + 0.5) * UW / DMAX;
        trBars[i].scale.y = Math.max(0.01, Math.min(1.2, tr) / top * 1.3); trBars[i].position.set(x - 0.04, 0.1, 0.25);
        teBars[i].b.scale.y = Math.max(0.01, Math.min(1.2, te) / top * 1.3); teBars[i].b.position.set(x + 0.04, 0.1, 0.25);
        teBars[i].m.color.set(i + 1 === st.d ? C.gold : C.orange);
      });
    }
    draw();
    const best = () => curveErr.reduce((b, e, i) => e[1] < curveErr[b][1] ? i : b, 0) + 1;
    const controls = [
      { type: 'slider', label: 'Flexibility (degree of the curve)', short: 'Degree', min: 1, max: DMAX, step: 1, get: () => st.d, set: v => { st.d = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Fit ten different fields at once', short: 'Ten fields', get: () => st.many, set: v => { st.many = v; draw(); } },
      { type: 'slider', label: 'Measurements per field', min: 6, max: 40, step: 1, get: () => st.n, set: v => { st.n = Math.round(v); draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Error on its own data', get: () => ({ v: curveErr[st.d - 1][0].toFixed(2) }) },
      { label: 'Error on new data', get: () => { const e = curveErr[st.d - 1][1]; return { v: e.toFixed(2), sub: `best at degree ${best()}`, good: st.d === best() || e < curveErr[best() - 1][1] * 1.08, bad: e > curveErr[best() - 1][1] * 1.6 }; } },
    ];
    const labels = [
      { name: 'truth', t: 'The true pattern', d: 'Yield rises, then levels off', icon: 'wave', atV: V(XL, Y(truth(0)), -0.38) },
      { name: 'dots', t: 'One field\'s measurements', d: 'The truth, plus noise', icon: 'target', atV: V(XL, Y0 + 2.7, -0.4) },
      { name: 'fits', t: 'Ten fitted curves', d: 'One for each field', icon: 'link', atV: V(XL + XW, Y(truth(1)), -0.36) },
      { name: 'u', t: 'The U of new-data error', d: 'Too stiff on the left, too floppy on the right', icon: 'scale', atV: V(UX + UW / 2 + 0.2, 0.1, 0.25) },
    ];
    const reset = () => { Object.assign(st, { d: 3, n: 14, many: true }); draw(); };
    const breaks = [
      { label: 'A straight line', hint: 'Degree 1', on: () => { reset(); st.d = 1; draw(); }, off: reset },
      { label: 'Degree 12', hint: 'Bends to every point', on: () => { reset(); st.d = 12; draw(); }, off: reset },
      { label: 'Only seven measurements', hint: 'Degree 5 on 7 points', on: () => { reset(); st.n = 7; st.d = 5; draw(); }, off: reset },
    ];
    function status() {
      const [tr, te] = curveErr[st.d - 1], b = best();
      if (st.d === 1) return { ok: false, msg: `<b>Too stiff: high bias.</b> A straight line can't bend to follow yields levelling off, so all ten fields' lines miss the same way: too low in the middle, too high at the ends. More data won't help. Error ${te.toFixed(2)} on new data against ${curveErr[b - 1][1].toFixed(2)} at degree ${b}.` };
      if (st.n <= 8 && st.d >= st.n - 3) return { ok: false, msg: `<b>Too little data for that much bend.</b> With ${st.n} measurements a degree-${st.d} curve can pass close to every point, so each field's curve swings off in its own direction between and beyond them. Error on its own points ${tr.toFixed(2)}, on new data ${te.toFixed(2)}. Fewer measurements need simpler models.` };
      if (st.d >= 9) return { ok: false, msg: `<b>Too floppy: high variance.</b> A degree-${st.d} curve bends to every noisy point, so the ten fields give ten very different curves, wildest at the edges. Error on its own data ${tr.toFixed(2)}, the lowest yet; on new data ${te.toFixed(2)}. That gap is overfitting.` };
      return { ok: st.d === b ? true : undefined, msg: `<b>Degree ${st.d}: ${tr.toFixed(2)} on its own data, ${te.toFixed(2)} on new data.</b> ${st.d === b ? 'The bottom of the U: flexible enough to follow the levelling off, stiff enough that the ten fields\' curves agree.' : `The bottom of the U is at degree ${b}.`}` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The true pattern', home: true, say: 'More fertiliser gives more maize, up to a point, then the yield levels off. That is the dark line. But every field we measure adds noise.', act: m => m.set({ d: 3, many: false }) },
    { t: 'One field', focus: 'dots', zoom: 1.2, say: 'The blue dots are one field\'s measurements, and the coral curve is a model fitted to them.' },
    { t: 'Too stiff', home: true, say: 'A straight line cannot level off. Fit one to ten different fields and all ten miss the same way. That is bias: underfitting.', act: m => m.set({ d: 1, many: true }), wait: 5 },
    { t: 'Too floppy', home: true, say: 'A very bendy curve chases every noisy dot. Ten fields give ten wildly different curves. That is variance: overfitting.', act: m => m.set({ d: 12 }), wait: 5 },
    { t: 'The U', focus: 'u', zoom: 1.4, say: 'Error on its own data, in blue, keeps falling as the curve gets bendier. Error on new data, in orange, falls, then rises. The best model sits at the bottom of that U.' },
    { t: 'Just right', home: true, say: 'At the bottom, the ten curves agree with each other and with the truth. Flexible enough, but no more.', act: m => m.set({ d: 3 }), wait: 4 },
  ],
  check: [
    { q: 'Ten models trained on different samples all miss the truth in the same way. This is…', options: ['High bias (underfitting)', 'High variance (overfitting)', 'Perfect fit'], answer: 0, why: 'A model too simple for the pattern errs consistently.' },
    { q: 'Ten models trained on different samples look completely different. This is…', options: ['High variance (overfitting)', 'High bias', 'Good generalisation'], answer: 0, why: 'A model so flexible it follows each sample\'s noise changes from sample to sample.' },
    { q: 'As a model gets more flexible, error on new data usually…', options: ['Falls, then rises', 'Always falls', 'Always rises'], answer: 0, why: 'First it captures the pattern, then it starts fitting noise: the U-shape.' },
  ],
  terms: [
    ['Bias', 'Error from a model too simple to capture the pattern; it errs the same way every time.'],
    ['Variance', 'Error from a model so flexible it changes a lot with each sample of data.'],
    ['Underfitting', 'High bias: poor on training and new data alike.'],
    ['Overfitting', 'High variance: great on training data, poor on new data.'],
    ['Model complexity', 'How flexible a model is: degree of a curve, depth of a tree, size of a network.'],
  ],
  deeper: '<p><b>Remedies.</b> For bias: a more flexible model or better features. For variance: more data, a simpler model, regularisation, or averaging many models (bagging).</p><p><b>Learning curves</b> plot error against the amount of training data. If the training and validation curves meet high, you have bias; if they stay far apart, more data will help.</p><p><b>Deep learning\'s twist.</b> Very large networks sometimes pass the overfitting peak and improve again ("double descent"), especially with lots of data and regularisation. The U is a guide, not a law.</p>',
  code: {
    title: 'Bias and variance by refitting',
    note: 'Adapted from the course\'s bias-variance lesson.',
    text: `
import numpy as np

rng = np.random.default_rng(0)
truth = lambda x: 1.2 + 2.6 * x - 1.9 * x ** 2 + 0.35 * np.sin(6 * x)
x_new = np.linspace(0, 1, 200)

for degree in (1, 3, 12):
    curves, train_err = [], []
    for field in range(10):                    # ten different samples
        x = np.sort(rng.random(14))
        y = truth(x) + rng.normal(0, 0.28, 14)
        coef = np.polyfit(2 * x - 1, y, degree)
        curves.append(np.polyval(coef, 2 * x_new - 1))
        train_err.append(np.sqrt(np.mean((np.polyval(coef, 2 * x - 1) - y) ** 2)))
    curves = np.array(curves)
    bias = np.mean((curves.mean(0) - truth(x_new)) ** 2)
    variance = np.mean(curves.var(0))
    print(degree, round(bias, 3), round(variance, 3), round(np.mean(train_err), 3))
`,
  },
};
