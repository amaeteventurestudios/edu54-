// Imbalanced data: 500 cassava leaves, only 25 with mosaic disease. A classifier learns a boundary on two leaf measurements.
// Plain training lets the healthy majority push the boundary over the sick leaves; class weights or oversampling pull it back.
// Break it: report accuracy (95% by calling everything healthy), plain training with a 1-in-50 disease rate, oversample by copying until it memorises.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function leaves(nSick, seed) { const r = rngOf(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()), out = []; for (let i = 0; i < 500; i++) { const sick = i < nSick; out.push({ x: (sick ? 0.62 : 0.4) + g() * 0.11, z: (sick ? 0.6 : 0.42) + g() * 0.11, sick }); } return out; }
const FW = 3.6;
const sig = z => 1 / (1 + Math.exp(-z));

export default {
  slug: 'imbalanced-data',
  title: 'Imbalanced data: when the rare case matters',
  description: 'Of 500 cassava leaves, only 25 have mosaic disease. A plain classifier can be 95% accurate by calling every leaf healthy, and miss every sick one. Weigh the rare class more, or show it more often, and watch the boundary move to catch the disease.',
  overview: 'Many of the most important problems are lopsided: disease among healthy plants, fraud among honest payments, faults among normal readings. A model trained plainly on such data learns that "the common answer" is almost always right, and its accuracy looks wonderful while it misses the cases you care about. The fixes: measure with recall, precision or F1 instead of accuracy, give the rare class more weight in the loss, rebalance the training data, and move the decision threshold.',
  keywords: ['imbalanced data', 'class weights', 'oversampling smote', 'recall precision f1', 'accuracy paradox'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.3, 0.3, 0], dir: [0.2, 1.4, 1.05], half: 2.8, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { nSick: 25, fix: 'weights', thr: 0.5, metric: 'f1', copy: false };
    let data = leaves(st.nSick, 7), test = leaves(st.nSick, 99);
    const X = x => -FW / 2 + Math.max(0, Math.min(1, x)) * FW, Z = z => FW / 2 - Math.max(0, Math.min(1, z)) * FW;
    /* ---------- the field of leaves ---------- */
    const base = P.box(FW + 0.3, 0.1, FW + 0.3, '#E8D9B5', { r: 0.1 }); S.add(base);
    const leafGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 6).translate(0, 0.015, 0);
    const pts = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial(), 500); S.add(pts);
    const miss = new THREE.InstancedMesh(new THREE.TorusGeometry(0.075, 0.012, 5, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.red }), 500); miss.layers.set(1); miss.userData.noFit = true; S.add(miss);
    const wall = P.box(1, 0.3, 0.04, C.plum, { r: 0, m: { opacity: 0.75 } }); wall.material.depthWrite = false; wall.userData.noFit = true; S.add(wall);
    const axX = S.text('yellow patches →', { size: 0.13, weight: 750, maxW: 2.5 }); axX.position.set(0, 0.105, FW / 2 + 0.28); S.add(axX);
    const axZ = S.text('leaf curl →', { size: 0.13, weight: 750, maxW: 2 }); axZ.position.set(-FW / 2 - 0.28, 0.105, 0); axZ.rotation.z = Math.PI / 2; S.add(axZ);
    /* ---------- the scale of the two classes ---------- */
    const SX = 2.75;
    const counts = [{ c: '#3E9B5F', n: 'healthy' }, { c: C.red, n: 'sick' }].map((k, i) => { const b = P.box(0.42, 1, 0.42, k.c, { r: 0.04 }); b.position.set(SX + (i - 0.5) * 0.6, 0.1, -0.6); b.userData.noFit = true; S.add(b); const t = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1 }); t.userData.noFit = true; S.add(t); return { b, t }; });
    const pad = P.box(1.5, 0.1, 1.0, '#F1EEE6', { r: 0.06 }); pad.position.set(SX, 0, -0.6); S.add(pad);
    const padT = S.text('weight in training', { size: 0.1, weight: 800, color: '#151827', maxW: 1.4 }); padT.position.set(SX, 0.105, -0.2); S.add(padT);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- logistic regression with optional class weights / oversampling ---------- */
    let w = [0, 0, 0];
    function train() {
      let rows = data.map(p => ({ ...p, wt: 1 }));
      const nS = rows.filter(p => p.sick).length, nH = rows.length - nS;
      if (st.fix === 'weights') rows.forEach(p => { p.wt = p.sick ? nH / nS : 1; });
      if (st.fix === 'over') { const sick = rows.filter(p => p.sick), extra = []; let k = 0; while (sick.length + extra.length < nH) { const s0 = sick[k % sick.length], r = rngOf(k + 1); extra.push({ ...s0, x: s0.x + (r() - 0.5) * 0.08, z: s0.z + (r() - 0.5) * 0.08 }); k++; } rows = rows.concat(extra); }
      w = [0, 0, 0]; const tot = rows.reduce((a, p) => a + p.wt, 0);
      for (let it = 0; it < 600; it++) { const g = [0, 0, 0]; for (const p of rows) { const e = (sig(w[0] + w[1] * (p.x - 0.5) * 8 + w[2] * (p.z - 0.5) * 8) - (p.sick ? 1 : 0)) * p.wt; g[0] += e; g[1] += e * (p.x - 0.5) * 8; g[2] += e * (p.z - 0.5) * 8; } for (let j = 0; j < 3; j++) w[j] -= 0.8 * g[j] / tot; }
      st.rows = rows.length;
    }
    const prob = p => sig(w[0] + w[1] * (p.x - 0.5) * 8 + w[2] * (p.z - 0.5) * 8);
    // oversampling before splitting puts copies of the training sick leaves into the test set
    const testSet = () => st.copy ? [...test.filter(p => !p.sick), ...data.filter(p => p.sick)] : test;
    const evalOn = d => { let tp = 0, fp = 0, fn = 0, tn = 0; for (const p of d) { const say = prob(p) >= st.thr; if (p.sick) say ? tp++ : fn++; else say ? fp++ : tn++; } const prec = tp + fp ? tp / (tp + fp) : 0, rec = tp + fn ? tp / (tp + fn) : 0; return { tp, fp, fn, tn, acc: (tp + tn) / d.length, prec, rec, f1: prec + rec ? 2 * prec * rec / (prec + rec) : 0 }; };
    function draw() {
      train();
      data.forEach((p, i) => {
        dummy.position.set(X(p.x), 0.1, Z(p.z)); dummy.scale.setScalar(p.sick ? 1.25 : 1); dummy.updateMatrix(); pts.setMatrixAt(i, dummy.matrix); pts.setColorAt(i, col.set(p.sick ? C.red : '#3E9B5F'));
        dummy.position.y = 0.16; dummy.scale.setScalar(p.sick && prob(p) < st.thr ? 1 : 0.0001); dummy.updateMatrix(); miss.setMatrixAt(i, dummy.matrix);
      });
      pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true; miss.instanceMatrix.needsUpdate = true;
      // the boundary: prob = thr  ⇔  w0 + w1 u + w2 v = logit(thr), with u = (x − 0.5)·8, v = (z − 0.5)·8
      const L = Math.log(st.thr / (1 - st.thr)), n = Math.hypot(w[1], w[2]);
      wall.visible = n > 1e-3;
      if (wall.visible) { const t = (L - w[0]) / (n * n), u = w[1] * t, v = w[2] * t, cx = 0.5 + u / 8, cz = 0.5 + v / 8; wall.position.set(X(cx), 0.1, Z(cz)); wall.rotation.y = Math.atan2(w[1], w[2]); wall.scale.set(FW * 1.2, 1, 1); }
      const nS = data.filter(p => p.sick).length, nH = 500 - nS, wS = st.fix === 'weights' ? nH : st.fix === 'over' ? nH : nS;
      [[nH, nH], [nS, wS]].forEach(([n, wt], i) => { const h = wt / nH * 1.2; counts[i].b.scale.y = Math.max(0.03, h); counts[i].t.position.set(SX + (i - 0.5) * 0.6, 0.1 + h + 0.2, -0.6); counts[i].t.userData.set(`${n} ${i ? 'sick' : 'healthy'}`); });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Training', options: ['Plain', 'Weigh sick leaves more', 'Show sick leaves more often'], get: () => ['plain', 'weights', 'over'].indexOf(st.fix), act: i => { st.fix = ['plain', 'weights', 'over'][i]; st.copy = false; draw(); } },
      { type: 'slider', label: 'Threshold: call it sick above', min: 0.05, max: 0.95, step: 0.01, get: () => st.thr, set: v => { st.thr = v; draw(); }, fmt: v => `${Math.round(v * 100)}%` },
      { type: 'slider', label: 'Sick leaves in 500', min: 5, max: 250, step: 5, get: () => st.nSick, set: v => { st.nSick = Math.round(v); data = leaves(st.nSick, 7); test = leaves(st.nSick, 99); draw(); }, quick: false },
      { type: 'buttons', label: 'Report', options: ['Accuracy', 'F1 (precision and recall)'], get: () => st.metric === 'acc' ? 0 : 1, act: i => { st.metric = i ? 'f1' : 'acc'; } },
    ];
    const readouts = [
      { label: st.metric === 'acc' ? 'Accuracy' : 'F1', get: () => { const e = evalOn(testSet()); return st.metric === 'acc' ? { v: `${Math.round(e.acc * 100)}%`, bad: e.rec < 0.5 } : { v: e.f1.toFixed(2), good: e.f1 > 0.55, bad: e.f1 < 0.3 }; } },
      { label: 'Sick leaves caught (recall)', get: () => { const e = evalOn(testSet()); return { v: `${e.tp} of ${e.tp + e.fn}`, bar: e.rec, good: e.rec > 0.75, bad: e.rec < 0.4 }; }, bar: true },
      { label: 'Of those flagged, truly sick', get: () => { const e = evalOn(testSet()); return { v: `${Math.round(e.prec * 100)}%` }; } },
    ];
    const labels = [
      { name: 'leaves', t: '500 leaves', d: 'Red: mosaic disease. Red rings: missed', icon: 'box', atV: V(-FW / 2 - 0.15, 0.1, -FW / 2) },
      { name: 'wall', t: 'The boundary', d: 'Past the purple wall: called sick', icon: 'scale', atV: V(-FW / 2 - 0.15, 0.1, FW / 2) },
      { name: 'scale', t: 'How much each class counts', d: 'Weights or extra copies even it up', icon: 'spark', atV: V(SX - 0.3, 1.32, -0.6) },
    ];
    const reset = () => { Object.assign(st, { nSick: 25, fix: 'weights', thr: 0.5, metric: 'f1', copy: false }); data = leaves(25, 7); test = leaves(25, 99); draw(); };
    const breaks = [
      { label: 'Report accuracy', hint: 'Plain training', on: () => { reset(); st.fix = 'plain'; st.metric = 'acc'; draw(); }, off: reset },
      { label: 'Plain training, 1 sick in 50', hint: 'No weights', on: () => { reset(); st.nSick = 10; st.fix = 'plain'; data = leaves(10, 7); test = leaves(10, 99); draw(); }, off: reset },
      { label: 'Oversample before splitting', hint: 'Copies of the training sick leaves land in the test', on: () => { reset(); st.fix = 'over'; st.copy = true; draw(); }, off: reset },
    ];
    function status() {
      const e = evalOn(testSet());
      if (st.metric === 'acc' && st.fix === 'plain') return { ok: false, msg: `<b>${Math.round(e.acc * 100)}% accurate, and it hides the misses.</b> With only ${st.nSick} sick leaves in 500, a model that calls most leaves healthy scores high on accuracy even though it misses ${e.fn} of the ${e.tp + e.fn} diseased leaves; calling every leaf healthy would still score ${Math.round((500 - st.nSick) / 5)}%. A farmer needs the sick ones found. Report recall, precision or F1.` };
      if (st.fix === 'plain') return { ok: false, msg: `<b>The majority pushed the boundary away.</b> In plain training each healthy leaf counts as much as each sick one, and there are ${Math.round((500 - st.nSick) / st.nSick)} healthy for every sick, so the boundary moves far into the sick corner: ${e.tp} of ${e.tp + e.fn} sick leaves caught (red rings are misses). Weigh the rare class more.` };
      if (st.fix === 'over' && st.copy) { const h = evalOn(test); return { ok: false, msg: `<b>The test set is full of copies.</b> The sick leaves were copied before the data was split, so the "new" sick leaves in the test are the very leaves the model trained on: it reports ${e.tp} of ${e.tp + e.fn} caught. On genuinely new leaves it catches ${h.tp} of ${h.tp + h.fn}. Split first, then oversample only the training part.` }; }
      return { ok: e.rec > 0.75 ? true : undefined, msg: `<b>${e.tp} of ${e.tp + e.fn} sick leaves caught on new data, ${Math.round(e.prec * 100)}% of flags truly sick.</b> ${st.fix === 'weights' ? `Each sick leaf counted ${Math.round((500 - st.nSick) / st.nSick)} times as much in training` : 'Sick leaves were shown more often, with small variations'}, so the boundary moved back over them. Lower the threshold to catch more, at the cost of more false alarms.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); if (p.nSick) { data = leaves(p.nSick, 7); test = leaves(p.nSick, 99); } draw(); } };
  },

  story: [
    { t: 'A rare disease', home: true, say: 'Five hundred cassava leaves from farms in Uganda and Nigeria, measured for yellow patches and curl. Only twenty-five have mosaic disease, the red ones.', act: m => m.set({ fix: 'plain', metric: 'acc' }) },
    { t: 'Accurate and useless', focus: 'wall', zoom: 1.2, say: 'Train plainly and the healthy majority pushes the boundary deep into the sick corner. Nearly every leaf is called healthy. Ninety-five percent accurate, and most sick leaves missed.' },
    { t: 'Measure what matters', home: true, say: 'So stop reporting accuracy. Recall asks: of the sick leaves, how many did we catch? Precision asks: of the leaves we flagged, how many were sick?', act: m => m.set({ metric: 'f1' }), wait: 5 },
    { t: 'Weigh the rare class', focus: 'scale', zoom: 1.4, say: 'Give each sick leaf as much weight in training as nineteen healthy ones. The two classes now pull equally.', act: m => m.set({ fix: 'weights' }) },
    { t: 'The boundary moves back', home: true, say: 'The boundary swings back over the sick leaves. Most are caught now, at the price of some healthy leaves flagged for a second look.', wait: 5 },
    { t: 'The threshold', home: true, say: 'Finally, slide the threshold. A farmer who would rather check a few healthy leaves than miss a sick one sets it low.', act: m => m.set({ thr: 0.3 }), wait: 4 },
  ],
  check: [
    { q: '5% of leaves are sick. A model calls every leaf healthy. Its accuracy is…', options: ['95%, and it catches no disease', '5%', '50%'], answer: 0, why: 'Accuracy rewards the majority answer; recall reveals the problem.' },
    { q: 'What do class weights do?', options: ['Make mistakes on the rare class cost more in training', 'Delete common examples', 'Change the features'], answer: 0, why: 'The loss pulls the boundary towards catching the rare cases.' },
    { q: 'Why is copying rare examples many times risky?', options: ['The model fits those few exact points and generalises poorly', 'It is too slow', 'It removes data'], answer: 0, why: 'Duplicates add no new information; varied synthetic examples or weights work better.' },
  ],
  terms: [
    ['Class imbalance', 'One class is far rarer than the other.'],
    ['Recall', 'Of the real positives, the share the model caught.'],
    ['Precision', 'Of the model\'s positive calls, the share that were right.'],
    ['Class weights', 'Making errors on the rare class count more in the loss.'],
    ['Oversampling / SMOTE', 'Showing rare examples more often, or creating new ones between real ones.'],
  ],
  deeper: '<p><b>Undersampling</b> throws away some of the common class instead. It is fast and works when the common class is huge, at the cost of discarding information.</p><p><b>Choosing the threshold</b> is a business decision: what does a missed sick field cost against a wasted inspection visit? Plot precision and recall at every threshold and pick the point that fits.</p><p><b>Stratify</b> your train, validation and test splits so each keeps the same share of the rare class.</p>',
  code: {
    title: 'Class weights and the right metrics',
    note: 'Adapted from the course\'s imbalanced-data lesson.',
    text: `
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

X_tr, X_te, y_tr, y_te = train_test_split(X, y, stratify=y, random_state=0)

plain = LogisticRegression().fit(X_tr, y_tr)
weighted = LogisticRegression(class_weight="balanced").fit(X_tr, y_tr)

for name, m in [("plain", plain), ("weighted", weighted)]:
    print(name)
    print(classification_report(y_te, m.predict(X_te), target_names=["healthy", "sick"]))

# catch more at the cost of more false alarms: lower the threshold
flags = weighted.predict_proba(X_te)[:, 1] > 0.3
`,
  },
};
