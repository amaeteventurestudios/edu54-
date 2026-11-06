// Audio classification: listening posts in a forest reserve in Gabon label sounds as bird, elephant, vehicle, chainsaw or gunshot. Each labelled clip is a ball placed by two
// summary features (pitch centre in hertz across, burstiness back to front); a query clip is classified by its k nearest neighbours, with lines drawn to them.
// Clips are generated with a fixed seed; k-NN, feature scaling, votes, per-class recall and accuracy on a held-out set are computed live.
// Break it: k = 15 with plain votes (four gunshot examples are outvoted), unscaled features (hertz swamps burstiness), k = 1 (one odd clip decides).
const CLS = [
  { n: 'bird', c: '#1F9E89', hz: 3000, sh: 350, b: 0.5, sb: 0.12, train: 40, test: 20 },
  { n: 'elephant', c: '#8D6E63', hz: 160, sh: 60, b: 0.15, sb: 0.06, train: 12, test: 6 },
  { n: 'vehicle', c: '#3B3F8F', hz: 650, sh: 150, b: 0.22, sb: 0.07, train: 20, test: 10 },
  { n: 'chainsaw', c: '#E07B39', hz: 1350, sh: 200, b: 0.35, sb: 0.07, train: 10, test: 5 },
  { n: 'gunshot', c: '#D64545', hz: 1800, sh: 300, b: 0.92, sb: 0.04, train: 4, test: 3 },
];
const DATA = (() => {
  let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const mk = (k, n) => Array.from({ length: n }, () => ({ k, hz: Math.max(60, CLS[k].hz + CLS[k].sh * g()), b: Math.min(1, Math.max(0, CLS[k].b + CLS[k].sb * g())) }));
  const train = CLS.flatMap((c, k) => mk(k, c.train)), test = CLS.flatMap((c, k) => mk(k, c.test));
  train.push({ k: 0, hz: 1540, b: 0.89, odd: true });   // one mislabelled clip: a hornbill's sharp call that sounds like a shot
  return { train, test };
})();
const QUERY = [{ n: 'A gunshot', hz: 1500, b: 0.9, k: 4 }, { n: 'An elephant', hz: 190, b: 0.17, k: 1 }, { n: 'A chainsaw', hz: 1300, b: 0.33, k: 3 }];
const mean = a => a.reduce((s, x) => s + x, 0) / a.length, sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const MH = mean(DATA.train.map(d => d.hz)), SH = sd(DATA.train.map(d => d.hz)), MB = mean(DATA.train.map(d => d.b)), SB = sd(DATA.train.map(d => d.b));
const COUNT = CLS.map((_, k) => DATA.train.filter(d => d.k === k).length);
function knn(q, st) {
  const f = d => (st.scale ? [(d.hz - MH) / SH, (d.b - MB) / SB] : [d.hz, d.b]);
  const fq = f(q), near = DATA.train.map((d, i) => { const fd = f(d); return { i, d: Math.hypot(fd[0] - fq[0], fd[1] - fq[1]) }; }).sort((a, b) => a.d - b.d).slice(0, st.k);
  const votes = CLS.map(() => 0); near.forEach(n => { votes[DATA.train[n.i].k] += st.balanced ? 1 / COUNT[DATA.train[n.i].k] : 1; });
  return { near, votes, pred: votes.indexOf(Math.max(...votes)) };
}

export default {
  slug: 'audio-classification',
  title: 'Audio classes: what made that sound?',
  description: 'Listening posts in a forest reserve in Gabon label every sound: bird, elephant, vehicle, chainsaw or gunshot. A new clip takes the label of its nearest labelled neighbours.',
  overview: 'Audio classification gives a whole clip a label. The classic baseline summarises each clip as features, such as MFCCs averaged over time, and labels a new clip by the majority of its k nearest labelled clips. Features in different units must be scaled first, or the one with the biggest numbers decides every distance. Later systems treat the log-mel spectrogram as an image for a CNN, or cut it into patches for a transformer (AST); today self-supervised models such as BEATs are fine-tuned with little labelled data. The hard part is usually imbalance: birds are recorded all day, gunshots rarely, and a classifier can score high accuracy while missing every gunshot. Use balanced sampling or weighting, augment with SpecAugment and mixup, and report recall for every class.',
  keywords: ['audio classification', 'k nearest neighbours', 'mfcc', 'class imbalance', 'feature scaling', 'per-class recall'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.6, 0], dir: [0.1, 0.8, 1.2], half: 1.55, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { k: 5, scale: true, balanced: true, q: 0 };
    const ink = '#151827', TW = 4.0, TD = 2.2, TX = -0.9;
    const X = hz => TX - TW / 2 + Math.min(1, hz / 3800) * TW, Z = b => TD / 2 - b * TD, Y = 0.22;
    [0, 1000, 2000, 3000].forEach(h => {    });


    CLS.forEach(c => {    });
    const balls = DATA.train.map(d => { const b = P.ball(d.odd ? 0.06 : 0.05, CLS[d.k].c); b.position.set(X(d.hz), Y, Z(d.b)); floor.add(b); return b; });
    const oddRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24), new THREE.MeshBasicMaterial({ color: '#151827' })); oddRing.rotation.x = -Math.PI / 2; oddRing.position.set(X(1540), Y, Z(0.89)); oddRing.layers.set(1); floor.add(oddRing);
    const q = P.box(0.16, 0.16, 0.16, '#F2C94C', { r: 0.03 }); q.userData.noFit = true; floor.add(q);

    const lines = Array.from({ length: 15 }, () => { const r = P.rod(V(0, 0, 0), V(1, 0, 0), 0.008, '#151827'); r.userData.noFit = true; floor.add(r); return r; });
    /* per-class recall on the held-out clips */
    const RX = 2.35;
    const rb = P.box(1.9, 1.85, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); rb.position.set(RX, 0.17, -0.8); floor.add(rb);

    const rec = CLS.map((c, k) => { const y = 1.6 - k * 0.3;
      const mm = new THREE.MeshLambertMaterial({ color: c.c }), bar = P.box(1, 0.17, 0.05, c.c, { r: 0.01, material: mm }); bar.position.set(RX - 0.05, y - 0.07, -0.76); floor.add(bar);
      return { bar, y }; });

    let Q = null, M = null;
    function draw() {
      const qq = QUERY[st.q]; Q = knn(qq, st);
      q.position.set(X(qq.hz), Y + 0.02, Z(qq.b));
      lines.forEach((l, i) => { const n = Q.near[i]; l.visible = !!n; if (n) { const d = DATA.train[n.i]; P.setRod(l, V(X(qq.hz), Y + 0.05, Z(qq.b)), V(X(d.hz), Y, Z(d.b))); } });
      balls.forEach((b, i) => { const on = Q.near.some(n => n.i === i); b.scale.setScalar(on ? 1.5 : 1); });
      const per = CLS.map((_, k) => { const t = DATA.test.filter(d => d.k === k); return t.filter(d => knn(d, st).pred === k).length / t.length; });
      const acc = DATA.test.filter(d => knn(d, st).pred === d.k).length / DATA.test.length;
      M = { per, acc, macro: mean(per) };
      rec.forEach((r, k) => { const w = Math.max(0.02, per[k] * 0.8); r.bar.scale.x = w; r.bar.position.x = RX - 0.18 + w / 2;   });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'New clip', options: QUERY.map(x => x.n), get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'slider', label: 'Neighbours (k)', min: 1, max: 15, step: 2, get: () => st.k, set: v => { st.k = v; draw(); } },
      { type: 'toggle', label: 'Scale features first', short: 'scaled', get: () => st.scale, set: v => { st.scale = v; draw(); } },
      { type: 'buttons', label: 'Votes', options: ['Balanced by class', 'One clip, one vote'], get: () => (st.balanced ? 0 : 1), act: i => { st.balanced = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Accuracy', get: () => ({ v: `${Math.round(M.acc * 100)}%`, sub: 'all held-out clips' }) },
      { label: 'Gunshot recall', get: () => ({ v: `${Math.round(M.per[4] * 100)}%`, sub: 'the class that matters', good: M.per[4] === 1, bad: M.per[4] < 0.67 }) },
      { label: 'Macro recall', get: () => ({ v: `${Math.round(M.macro * 100)}%`, sub: 'average over classes', bad: M.macro < 0.85 }) },
    ];
    const labels = [
      { name: 'map', t: 'Labelled clips', d: 'Lines: the new clip\'s neighbours', icon: 'target', atV: V(TX - TW / 2 - 0.15, 0.25, 0) },
      { name: 'rec', t: 'Recall per class', d: 'On clips held out', icon: 'scale', atV: V(RX + 0.97, 1.0, -0.8) },
    ];
    const reset = () => { Object.assign(st, { k: 5, scale: true, balanced: true, q: 0 }); draw(); };
    const breaks = [
      { label: 'Fifteen plain votes', hint: 'Only four gunshot examples', on: () => { reset(); st.k = 15; st.balanced = false; draw(); }, off: reset },
      { label: 'Unscaled features', hint: 'Hertz against 0 to 1', on: () => { reset(); st.scale = false; draw(); }, off: reset },
      { label: 'One neighbour', hint: 'k = 1', on: () => { reset(); st.k = 1; draw(); }, off: reset },
    ];
    function status() {
      const qq = QUERY[st.q], right = Q.pred === qq.k, g = Math.round(M.per[4] * 100), a = Math.round(M.acc * 100);
      if (!st.scale) return { ok: false, msg: `<b>Hertz decides everything.</b> Pitch runs into the thousands while burstiness runs from 0 to 1, so unscaled distances ignore burstiness: ${qq.n.toLowerCase()} is matched to clips of similar pitch, and is called ${CLS[Q.pred].n}. Gunshot recall ${g}%. Scale each feature to mean 0 and spread 1 first.` };
      if (st.k >= 11 && !st.balanced) return { ok: false, msg: `<b>Gunshots outvoted.</b> There are only ${COUNT[4]} gunshot examples, so among ${st.k} neighbours most votes come from chainsaws and birds. Accuracy still reads ${a}%, because gunshots are only ${DATA.test.filter(d => d.k === 4).length} of ${DATA.test.length} test clips, but gunshot recall is ${g}%. Weight votes by class, and report recall for every class.` };
      if (st.k === 1 && !right) return { ok: false, msg: `<b>One odd clip decides.</b> With k = 1 the nearest clip is a hornbill call mislabelled as bird, sitting right where gunshots sound, so ${qq.n.toLowerCase()} is called ${CLS[Q.pred].n}. The three held-out gunshots happen to land elsewhere (recall ${g}%), but any shot that sounds like this one is missed. A few more neighbours outvote one bad label.` };
      return { ok: right, msg: `<b>${qq.n} → ${CLS[Q.pred].n}.</b> ${right ? `Its ${st.k} nearest neighbours in scaled features${st.balanced ? ', with votes weighted by how rare each class is,' : ''} agree.` : 'The neighbours disagree with the truth here.'} Accuracy ${a}%, gunshot recall ${g}%, macro recall ${Math.round(M.macro * 100)}%.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Listening posts', home: true, say: 'Listening posts in a forest reserve in Gabon record day and night. Each labelled clip sits by its pitch and how bursty it is.', act: m => m.set({ k: 5, scale: true, balanced: true, q: 1 }) },
    { t: 'Nearest neighbours', home: true, say: 'A new clip takes the label most of its nearest labelled clips share. This low, steady rumble is an elephant.', act: m => m.set({ q: 1 }) },
    { t: 'A gunshot', home: true, say: 'A sharp, bursty crack. Its neighbours are the few gunshots on record, so rangers are alerted.', act: m => m.set({ q: 0 }) },
    { t: 'Scale first', home: true, say: 'Forget to scale the features, and pitch in hertz swamps burstiness. The gunshot is matched to chainsaws.', act: m => m.set({ scale: false }) },
    { t: 'Rare classes', home: true, say: 'With fifteen plain votes, the four gunshot examples are outvoted. Accuracy still looks high. Gunshot recall is what matters.', act: m => m.set({ scale: true, k: 15, balanced: false }) },
    { t: 'One neighbour', home: true, say: 'With one neighbour, a single mislabelled hornbill call decides. A few neighbours, weighted by class, are safer.', act: m => m.set({ k: 1, balanced: true }) },
  ],
  check: [
    { q: 'Why scale features before k-nearest neighbours?', options: ['Otherwise the feature with the biggest numbers decides every distance', 'To make clips shorter', 'Scaling adds labels'], answer: 0, why: 'Hertz would swamp a 0 to 1 feature.' },
    { q: 'Accuracy is high but gunshot recall is low. Why?', options: ['Gunshots are a tiny share of the test clips', 'Accuracy counts only gunshots', 'Recall is always lower'], answer: 0, why: 'Report recall for every class.' },
    { q: 'What goes wrong with k = 1?', options: ['A single odd or mislabelled clip decides', 'It is too slow', 'It needs scaling twice'], answer: 0, why: 'A few neighbours outvote one bad label.' },
  ],
  terms: [
    ['Audio classification', 'Giving a whole clip a label.'],
    ['k nearest neighbours', 'Labelling by the majority of the closest labelled examples.'],
    ['Feature scaling', 'Putting features on comparable ranges before measuring distance.'],
    ['Class imbalance', 'Some classes far rarer than others.'],
    ['Recall', 'The share of a class\'s clips that are found.'],
    ['SpecAugment', 'Masking random time and frequency bands as augmentation.'],
  ],
  deeper: '<p><b>Beyond neighbours.</b> CNNs on log-mel spectrograms, audio transformers on spectrogram patches, and self-supervised models fine-tuned with little data all improve on k-NN. Imbalance stays the hard part for all of them.</p><p><b>Conservation.</b> Acoustic monitoring across Central Africa listens for forest elephants and for gunshots and chainsaws. Missing a rare event costs far more than a false alarm, so recall on rare classes is the number to watch.</p><p><b>About this machine.</b> The clips are generated with a fixed seed from two summary features, with one deliberately mislabelled clip. Scaling, k-NN, votes and recall on the held-out clips are computed live.</p>',
  code: {
    title: 'Scaled, class-balanced k-NN',
    note: 'Adapted from the course\'s audio classification lesson.',
    text: `
import numpy as np

def knn_predict(train_x, train_y, q, k=5, balanced=True):
    mu, sd = train_x.mean(0), train_x.std(0)
    X, qq = (train_x - mu) / sd, (q - mu) / sd          # scale first
    near = np.argsort(np.linalg.norm(X - qq, axis=1))[:k]
    counts = np.bincount(train_y)
    votes = np.zeros(len(counts))
    for i in near:
        votes[train_y[i]] += 1 / counts[train_y[i]] if balanced else 1
    return votes.argmax()
`,
  },
};
