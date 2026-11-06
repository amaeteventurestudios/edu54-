// Model evaluation: a screener ranks 200 microloan applicants by risk. K-fold cross-validation: the data is cut into k slices,
// each slice takes a turn as the test while the model learns from the rest; the fold scores spread shows how sure to be.
// The ROC curve traces hits against false alarms for every threshold; its area (AUC) says how well the model ranks.
// Break it: tune on the test set again and again, use accuracy when only 5% default, and one lucky split instead of k folds.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function people(rate, seed) { const r = rngOf(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); return [...Array(200)].map(() => { const bad = r() < rate; return { bad, s: (bad ? 0.65 : 0.38) + g() * 0.16 }; }); }
const N = 200, RX = 1.95, RW = 2.4;

export default {
  slug: 'model-evaluation',
  title: 'Model evaluation: how good is it really?',
  description: 'A screener ranks microloan applicants by how likely they are to fall behind. Cut the data into five slices and let each take a turn as the test, then trace the ROC curve. Then tune on the test set until it lies to you, and report accuracy when almost nobody defaults.',
  overview: 'A model is only as good as the way you measure it. One train/test split can be lucky; k-fold cross-validation lets every slice of the data take a turn as the test, and the spread of the scores shows how much to trust them. The metric matters too: when only 5% of borrowers fall behind, a model that approves everyone is 95% "accurate" and useless. The ROC curve and its area (AUC) measure how well the model ranks risky applicants above safe ones, whatever threshold you later choose.',
  keywords: ['model evaluation', 'k fold cross validation', 'roc auc explained', 'accuracy paradox', 'test set contamination'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.15, 1.15, 1.25], half: 3, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 5, fold: 0, auto: true, acc: 0, rate: 0.3, peek: 0, single: false, metric: 'auc', seed: 4 };
    let data = people(st.rate, st.seed);
    /* ---------- the applicants as a block of 200 tiles, sliced into folds ---------- */
    const GX = -1.6, COLS = 20, CELL = 0.13;
    const base = P.box(COLS * CELL + 0.3, 0.1, 10 * CELL + 0.6, '#2C2D31', { r: 0.08 }); base.position.set(GX, 0, -0.3); S.add(base);
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.86, 0.08, CELL * 0.86).translate(0, 0.04, 0), new THREE.MeshLambertMaterial(), N); S.add(tiles);
    const slab = P.box(1, 0.02, 10 * CELL + 0.2, C.gold, { r: 0.02, m: { opacity: 0.35 } }); slab.material.depthWrite = false; slab.userData.noFit = true; S.add(slab);
    const blockT = S.text('200 APPLICANTS', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 2.4 }); blockT.position.set(GX, 0.05, -0.3 + (10 * CELL + 0.6) / 2 + 0.005); S.add(blockT);
    /* ---------- fold scores ---------- */
    const FZ = 1.15;
    const foldBase = P.box(COLS * CELL + 0.3, 0.08, 0.7, '#F1EEE6', { r: 0.06 }); foldBase.position.set(GX, 0, FZ); S.add(foldBase);
    const bars = [...Array(10)].map(() => { const m = new THREE.MeshLambertMaterial({ color: C.teal }); const b = P.box(0.2, 1, 0.3, C.teal, { r: 0.02, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const barT = [...Array(10)].map(() => { const t = S.text('', { size: 0.09, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.5 }); t.userData.noFit = true; S.add(t); return t; });
    /* ---------- the ROC board ---------- */
    const board = P.box(RW + 0.4, 0.1, RW + 0.4, '#FBF8F1', { r: 0.1 }); board.position.set(RX, 0, 0); S.add(board);
    const Xr = f => RX - RW / 2 + f * RW, Zr = t => RW / 2 - t * RW;
    const chance = P.rod(V(Xr(0), 0.12, Zr(0)), V(Xr(1), 0.12, Zr(1)), 0.01, '#B9B6AE'); S.add(chance);
    let roc = P.tube([V(), V(1, 0, 0)], 0.03, C.plum); roc.userData.noFit = true; S.add(roc);
    const under = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: C.plum, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); under.userData.noFit = true; S.add(under);
    const axF = S.text('false alarms →', { size: 0.12, weight: 750, maxW: 2 }); axF.position.set(RX, 0.105, RW / 2 + 0.28); S.add(axF);
    const axH = S.text('defaults caught →', { size: 0.12, weight: 750, maxW: 2.2 }); axH.position.set(RX - RW / 2 - 0.28, 0.105, 0); axH.rotation.z = Math.PI / 2; S.add(axH);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- scoring ---------- */
    // the "model": a score per applicant; after peeking at the test set many times, the score secretly fits those test rows
    const score = (p, i) => p.s + (st.peek ? (inFold(i, st.fold) ? (p.bad ? 0.18 : -0.18) * Math.min(1, st.peek / 20) : 0) : 0);
    const inFold = (i, f) => st.single ? i >= 160 : Math.floor(i / (N / st.k)) === f;
    function auc(ix) {
      const pos = ix.filter(i => data[i].bad), neg = ix.filter(i => !data[i].bad); if (!pos.length || !neg.length) return 0.5;
      let w = 0; for (const a of pos) for (const b of neg) { const sa = score(data[a], a), sb = score(data[b], b); w += sa > sb ? 1 : sa === sb ? 0.5 : 0; }
      return w / (pos.length * neg.length);
    }
    const accAll = ix => ix.filter(i => !data[i].bad).length / ix.length;   // "approve everyone" accuracy
    const accModel = ix => ix.filter(i => (score(data[i], i) > 0.52) === data[i].bad).length / ix.length;
    function foldScores() { const out = []; const K = st.single ? 1 : st.k; for (let f = 0; f < K; f++) { const ix = [...Array(N).keys()].filter(i => inFold(i, f)); out.push(st.metric === 'auc' ? auc(ix) : accAll(ix)); } return out; }
    function rocPts(ix) {
      const xs = ix.map(i => ({ s: score(data[i], i), bad: data[i].bad })).sort((a, b) => b.s - a.s), P0 = xs.filter(x => x.bad).length, N0 = xs.length - P0;
      let tp = 0, fp = 0; const pts = [[0, 0]]; for (const x of xs) { if (x.bad) tp++; else fp++; pts.push([fp / Math.max(1, N0), tp / Math.max(1, P0)]); } return pts;
    }
    function draw() {
      data.forEach((p, i) => {
        const c = i % COLS, r = Math.floor(i / COLS);
        const test = inFold(i, st.fold);
        dummy.position.set(GX - COLS * CELL / 2 + CELL * (c + 0.5), 0.1 + (test ? 0.06 : 0), -0.3 - 5 * CELL + CELL * (r + 0.5)); dummy.scale.setScalar(1); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix);
        tiles.setColorAt(i, col.set(p.bad ? C.red : '#9FDDB2'));
      });
      tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true;
      // the gold slab marks this fold's test rows (rows of the block: fold f is a band of columns)
      if (st.single) { slab.scale.set(COLS * CELL + 0.1, 1, 2 * CELL / (10 * CELL + 0.2)); slab.position.set(GX, 0.15, -0.3 - 5 * CELL + 9 * CELL); }   /* the last two rows: applicants 160 to 199 */
      else { slab.scale.set(COLS * CELL + 0.1, 1, (10 / st.k) * CELL / (10 * CELL + 0.2)); slab.position.set(GX, 0.15, -0.3 - 5 * CELL + (st.fold + 0.5) * (10 / st.k) * CELL); }
      const sc = foldScores(), K = sc.length;
      bars.forEach((b, f) => { const on = f < K; b.b.visible = barT[f].visible = on; if (!on) return; const v = sc[f], h = Math.max(0.02, (v - 0.4) * 0.8), x = GX - (K - 1) * 0.3 / 2 + f * 0.3; b.b.scale.y = h; b.b.position.set(x, 0.08, FZ); b.m.color.set(f === st.fold ? C.gold : C.teal); barT[f].position.set(x, 0.08 + h + 0.18, FZ); barT[f].userData.set(st.metric === 'auc' ? v.toFixed(2) : `${Math.round(v * 100)}%`); });
      const ix = [...Array(N).keys()].filter(i => inFold(i, st.fold)), pts = rocPts(ix).map(([f, t]) => V(Xr(f), 0.14, Zr(t)));
      roc.geometry.dispose(); roc.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 2, 0.03, 5, false);
      const verts = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], a0 = V(a.x, 0.13, Zr(0)), b0 = V(b.x, 0.13, Zr(0)); verts.push(...a0.toArray(), ...a.toArray(), ...b.toArray(), ...a0.toArray(), ...b.toArray(), ...b0.toArray()); }
      under.geometry.dispose(); under.geometry = new THREE.BufferGeometry(); under.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    }
    function update(dt) {
      if (st.auto && !st.single) { st.acc += dt * (S.reduced ? 3 : 0.7); if (st.acc >= 1) { st.acc = 0; st.fold = (st.fold + 1) % st.k; draw(); } }
    }
    draw();
    const mean = () => { const s = foldScores(); return s.reduce((a, b) => a + b, 0) / s.length; }, spread = () => { const s = foldScores(); return Math.max(...s) - Math.min(...s); };
    const controls = [
      { type: 'slider', label: 'Folds (k)', min: 2, max: 10, step: 1, get: () => st.k, set: v => { st.k = Math.round(v); st.fold = 0; draw(); } },
      { type: 'toggle', label: 'Take turns automatically', short: 'Rotate', get: () => st.auto, set: v => { st.auto = v; } },
      { type: 'buttons', label: 'Measure with', options: ['AUC (ranking)', 'Accuracy'], get: () => st.metric === 'auc' ? 0 : 1, act: i => { st.metric = i ? 'acc' : 'auc'; draw(); } },
      { type: 'slider', label: 'Share who fall behind', min: 0.05, max: 0.5, step: 0.05, get: () => st.rate, set: v => { st.rate = v; data = people(v, st.seed); draw(); }, fmt: v => `${Math.round(v * 100)}%`, quick: false },
    ];
    const readouts = [
      { label: st.metric === 'auc' ? 'AUC' : 'Score', get: () => ({ v: st.metric === 'auc' ? mean().toFixed(2) : `${Math.round(mean() * 100)}%`, sub: `across ${st.single ? 1 : st.k} fold${st.single ? '' : 's'}`, good: st.metric === 'auc' && !st.peek && mean() > 0.8, bad: st.peek > 0 || st.metric !== 'auc' }) },
      { label: 'Spread between folds', get: () => ({ v: st.single ? 'unknown' : (st.metric === 'auc' ? spread().toFixed(2) : `${Math.round(spread() * 100)} pts`), bad: st.single }) },
    ];
    const labels = [
      { name: 'block', t: '200 applicants', d: 'Red: fell behind on repayments', icon: 'box', atV: V(GX - COLS * CELL / 2 - 0.15, 0.1, -0.3 - 5 * CELL) },
      { name: 'fold', t: 'This turn\'s test slice', d: 'Raised and gold; the rest train', icon: 'target', at: () => slab.position.clone().add(V(-COLS * CELL / 2 - 0.05, 0, 0)) },
      { name: 'scores', t: 'One score per fold', d: 'Their spread shows how sure to be', icon: 'scale', atV: V(GX + COLS * CELL / 2 + 0.15, 0.08, FZ) },
      { name: 'roc', t: 'The ROC curve', d: 'Closer to the top-left corner is better', icon: 'wave', atV: V(RX + RW / 2 + 0.2, 0.1, FZ) },
    ];
    const reset = () => { Object.assign(st, { k: 5, fold: 0, auto: true, rate: 0.3, peek: 0, single: false, metric: 'auc' }); data = people(0.3, st.seed); draw(); };
    const breaks = [
      { label: 'Tune on the test set, twenty times', hint: 'Then report the test score', on: () => { reset(); st.auto = false; st.single = true; st.peek = 20; draw(); }, off: reset },
      { label: 'Accuracy when 5% fall behind', hint: 'Approve everyone', on: () => { reset(); st.rate = 0.05; data = people(0.05, st.seed); st.metric = 'acc'; draw(); }, off: reset },
      { label: 'One split instead of five folds', hint: 'A single 80/20 cut', on: () => { reset(); st.auto = false; st.single = true; draw(); }, off: reset },
    ];
    function status() {
      const m = mean();
      if (st.peek) return { ok: false, msg: `<b>The test set has been learned.</b> Each time a setting was chosen because it scored better on the same 40 test applicants, a little of those applicants leaked into the model. After twenty rounds the test AUC reads ${m.toFixed(2)}, but on genuinely new people it would be back near ${(() => { const p = st.peek; st.peek = 0; const v = mean(); st.peek = p; return v.toFixed(2); })()}. Tune on validation folds; touch the test set once, at the end.` };
      if (st.metric === 'acc' && st.rate <= 0.1) return { ok: false, msg: `<b>${Math.round(m * 100)}% "accurate" by approving everyone.</b> Only ${Math.round(st.rate * 100)}% of applicants fall behind, so a model that never flags anyone is right ${Math.round(m * 100)}% of the time and catches no defaults at all. For rare outcomes use AUC, precision and recall, not accuracy.` };
      if (st.single) return { ok: false, msg: `<b>One split, one number, no idea how lucky it was.</b> This 80/20 cut gives AUC ${m.toFixed(2)}, but a different cut could give quite another. Five folds give five scores and their spread; with only 200 applicants, that spread matters.` };
      if (st.metric === 'acc') return { msg: `<b>Accuracy ${Math.round(m * 100)}%</b> if everyone is approved. Accuracy can look fine while the model misses every risky borrower; switch back to AUC.` };
      return { ok: m > 0.8 ? true : undefined, msg: `<b>AUC ${m.toFixed(2)} on average over ${st.k} folds</b> (from ${Math.min(...foldScores()).toFixed(2)} to ${Math.max(...foldScores()).toFixed(2)}). Each fold took a turn as the test while the others trained. An AUC of ${m.toFixed(2)} means a random risky applicant is ranked above a random safe one ${Math.round(m * 100)}% of the time.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); if (p.rate) data = people(p.rate, st.seed); draw(); } };
  },

  story: [
    { t: 'Who falls behind?', home: true, say: 'A microlender screens two hundred applicants. Red tiles are people who later fell behind on repayments. The model gives each applicant a risk score.', act: m => m.reset() },
    { t: 'Take turns', focus: [-1.6, 0.2, -0.2], zoom: 1.3, say: 'Cut the applicants into five slices. Each slice takes a turn as the test, raised in gold, while the model learns from the other four. That is five-fold cross-validation.' },
    { t: 'Five scores', focus: [-1.6, 0.3, 1.0], zoom: 1.4, say: 'Now there are five scores instead of one, and their spread shows how much to trust the average.' },
    { t: 'The ROC curve', focus: [1.95, 0.2, 0], zoom: 1.3, say: 'The ROC curve tries every threshold: how many risky applicants are caught, against how many safe ones are wrongly flagged. The more area under it, the better the model ranks.' },
    { t: 'The accuracy trap', home: true, say: 'When only five percent fall behind, approving everyone is ninety-five percent accurate, and catches nobody. Accuracy is the wrong measure for rare events.', act: m => m.set({ rate: 0.05, metric: 'acc' }), wait: 5 },
    { t: 'Touch the test set once', home: true, say: 'And never keep tuning against the test set. Each peek leaks a little of it into the model, until the score is a flattering lie.', act: m => { m.set({ rate: 0.3, metric: 'auc', auto: false, single: true, peek: 20 }); }, wait: 5 },
  ],
  check: [
    { q: 'What does k-fold cross-validation give you that one split doesn\'t?', options: ['Several scores, so you can see how much the result varies', 'A bigger model', 'More data'], answer: 0, why: 'Every slice is tested once; the spread of scores shows the uncertainty.' },
    { q: 'Only 5% of borrowers default. A model approves everyone. Its accuracy is…', options: ['About 95%, and it is useless', 'About 5%', 'About 50%'], answer: 0, why: 'Accuracy rewards always guessing the common class. Use AUC, precision and recall.' },
    { q: 'You keep changing the model until the test score improves. What happens?', options: ['The test score becomes too optimistic', 'The model gets better on new data', 'Nothing'], answer: 0, why: 'Choices tuned on the test set leak it into the model. Tune on validation data instead.' },
  ],
  terms: [
    ['Cross-validation', 'Testing on several different slices of the data in turn.'],
    ['Fold', 'One slice of the data in k-fold cross-validation.'],
    ['ROC curve', 'Hits against false alarms as the threshold moves from strict to lenient.'],
    ['AUC', 'Area under the ROC curve: the chance a random positive is ranked above a random negative.'],
    ['Test set contamination', 'Letting the test data influence the model, so its score is too good.'],
  ],
  deeper: '<p><b>Stratified folds</b> keep the same share of defaulters in every slice, which matters when they are rare: otherwise one fold might have none at all.</p><p><b>Time matters.</b> For data that arrives over time, always test on the future: train on January to June, test on July. Random folds would let the model peek at tomorrow.</p><p><b>Regression metrics.</b> For numbers, RMSE punishes big misses most, MAE treats all misses alike, and R² says how much better the model is than always guessing the average.</p>',
  code: {
    title: 'K-fold cross-validation and AUC from scratch',
    note: 'Adapted from the course\'s model-evaluation lesson.',
    text: `
def kfold(n, k):
    size = n // k
    for f in range(k):
        test = list(range(f * size, (f + 1) * size))
        train = [i for i in range(n) if i not in test]
        yield train, test

def auc(scores, labels):
    pos = [s for s, y in zip(scores, labels) if y]
    neg = [s for s, y in zip(scores, labels) if not y]
    wins = sum((p > q) + 0.5 * (p == q) for p in pos for q in neg)
    return wins / (len(pos) * len(neg))

results = []
for train, test in kfold(len(X), 5):
    model = fit([X[i] for i in train], [y[i] for i in train])
    results.append(auc([model(X[i]) for i in test], [y[i] for i in test]))
print(sum(results) / 5, min(results), max(results))
`,
  },
};
