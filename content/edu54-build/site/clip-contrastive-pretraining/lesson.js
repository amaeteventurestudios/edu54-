// CLIP: eight photos from a Ghanaian picture library and their captions. Two small encoders (here, linear maps from fixed image and caption features to a shared space)
// are trained live with the symmetric InfoNCE loss. The floor is the 8 × 8 similarity matrix as softmax probabilities, image rows against caption columns; the diagonal
// is the right pairing. Training, loss and retrieval accuracy are computed live (seeded). Break it: temperature 1.0 (the softmax is too soft, the diagonal barely rises),
// batches of 2 that never mix (each photo only learns to beat one other caption), two captions that say the same thing (the loss pushes identical meanings apart).
const ITEMS = [['kente cloth', 'a woven kente cloth in gold and green'], ['jollof rice', 'a plate of jollof rice'], ['tro-tro', 'a tro-tro minibus at a station'], ['baobab', 'a baobab tree at sunset'],
  ['talking drum', 'a talking drum held under the arm'], ['canoe', 'a painted fishing canoe on the beach'], ['yams', 'yams piled high at a market stall'], ['football', 'boys playing football on a dusty pitch']];
const N = 8, K = 8, D = 4;
function train(st) {
  let seed = 101; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const X = Array.from({ length: N }, () => Array.from({ length: K }, () => rnd() * 2));
  const M = Array.from({ length: K }, () => Array.from({ length: K }, () => rnd()));     // hidden link between what a photo shows and how it is described
  const Y = X.map(x => M.map(r => r.reduce((a, m, j) => a + m * x[j], 0) + rnd() * 0.3));
  if (st.dup) Y[1] = Y[6].slice();                                                        // caption 2 now says what caption 7 says
  const Wx = Array.from({ length: D }, () => Array.from({ length: K }, () => rnd())), Wy = Array.from({ length: D }, () => Array.from({ length: K }, () => rnd()));
  const emb = (W, v) => { const e = W.map(r => r.reduce((a, w, j) => a + w * v[j], 0)), n = Math.hypot(...e) || 1; return { e, u: e.map(x => x / n), n }; };
  const tau = st.tau, lr = 0.6, batches = st.batch === 8 ? [[0, 1, 2, 3, 4, 5, 6, 7]] : [[0, 1], [2, 3], [4, 5], [6, 7]];
  const lossOf = (idx, I, T) => { let L = 0; const S = idx.map(i => idx.map(j => I[i].u.reduce((a, x, k) => a + x * T[j].u[k], 0) / tau));
    idx.forEach((_, a) => { const r = S[a], m = Math.max(...r), z = r.reduce((s, v) => s + Math.exp(v - m), 0); L -= r[a] - m - Math.log(z); const c = S.map(q => q[a]), mc = Math.max(...c), zc = c.reduce((s, v) => s + Math.exp(v - mc), 0); L -= c[a] - mc - Math.log(zc); });
    return { L: L / (2 * idx.length), S }; };
  for (let step = 0; step < st.steps; step++) {
    const idx = batches[step % batches.length];
    const I = X.map(x => emb(Wx, x)), T = Y.map(y => emb(Wy, y)), { S } = lossOf(idx, I, T), B = idx.length;
    const G = idx.map(() => Array(B).fill(0));
    idx.forEach((_, a) => { const r = S[a], m = Math.max(...r), ex = r.map(v => Math.exp(v - m)), z = ex.reduce((s, v) => s + v, 0); ex.forEach((v, b) => { G[a][b] += (v / z - (a === b ? 1 : 0)) / (2 * B); });
      const c = S.map(q => q[a]), mc = Math.max(...c), ec = c.map(v => Math.exp(v - mc)), zc = ec.reduce((s, v) => s + v, 0); ec.forEach((v, b) => { G[b][a] += (v / zc - (a === b ? 1 : 0)) / (2 * B); }); });
    const gWx = Wx.map(r => r.map(() => 0)), gWy = Wy.map(r => r.map(() => 0));
    idx.forEach((i, a) => idx.forEach((j, b) => { const g = G[a][b] / tau; if (!g) return;
      const du = T[j].u, dv = I[i].u;   // dS/du_i = v_j, dS/dv_j = u_i
      [[I[i], du, gWx, X[i]], [T[j], dv, gWy, Y[j]]].forEach(([E, d, gW, v]) => { const dot = E.u.reduce((s, x, k) => s + x * d[k], 0), de = E.u.map((x, k) => (d[k] - dot * x) / E.n);
        de.forEach((q, r) => v.forEach((vv, k) => { gW[r][k] += g * q * vv; })); }); }));
    Wx.forEach((r, a) => r.forEach((_, k) => { r[k] -= lr * gWx[a][k]; })); Wy.forEach((r, a) => r.forEach((_, k) => { r[k] -= lr * gWy[a][k]; }));
  }
  const I = X.map(x => emb(Wx, x)), T = Y.map(y => emb(Wy, y)), all = [...Array(N).keys()], { L, S } = lossOf(all, I, T);
  const P = S.map(r => { const m = Math.max(...r), ex = r.map(v => Math.exp(v - m)), z = ex.reduce((s, v) => s + v, 0); return ex.map(v => v / z); });
  const acc = P.filter((r, i) => r.indexOf(Math.max(...r)) === i).length / N;
  return { P, L, acc, diag: P.reduce((a, r, i) => a + r[i], 0) / N };
}

export default {
  slug: 'clip-contrastive-pretraining',
  title: 'CLIP: match pictures to words',
  description: 'Eight photos from a Ghanaian picture library and their captions. Two encoders learn, live, to put each photo beside its own caption: the gold diagonal rises.',
  overview: 'CLIP trains two encoders side by side, one for images and one for text, so that matching pairs land close together in a shared space. For a batch of N image-caption pairs it computes the N × N matrix of cosine similarities divided by a temperature, and applies cross-entropy along every row and every column: each image must pick out its own caption from all the others in the batch, and each caption its own image. This symmetric InfoNCE loss treats every other item in the batch as a negative, so larger batches give a stronger signal; CLIP used batches of 32,000. The temperature sets how sharp the softmax is, and is learned. Captions that genuinely describe the same thing become false negatives that the loss wrongly pushes apart. SigLIP replaces the softmax with an independent sigmoid per pair, which scales across many GPUs without gathering the whole matrix. The trained text encoder enables zero-shot classification: embed "a photo of a {class}" for each class and pick the closest.',
  keywords: ['clip', 'contrastive learning', 'infonce', 'temperature', 'siglip', 'zero-shot classification'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.35, 0.1], dir: [0.1, 1.1, 1.0], half: 1.6, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { tau: 0.07, batch: 8, dup: false, steps: 300 };
    const ink = '#151827', CELL = 0.3, GX = -0.5, GZ = 0.15;
    const pad = P.box(N * CELL + 0.15, 0.05, N * CELL + 0.15, '#2B2B38', { r: 0.03 }); pad.position.set(GX, 0.12, GZ); floor.add(pad);
    const geo = new THREE.BoxGeometry(CELL * 0.8, 1, CELL * 0.8); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N * N); im.frustumCulled = false; im.userData.noFit = true; floor.add(im);
    const keep = P.box(N * CELL, 1.0, N * CELL, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(GX, 0.17, GZ); floor.add(keep);
    const cx = j => GX - N * CELL / 2 + (j + 0.5) * CELL, rz = i => GZ - N * CELL / 2 + (i + 0.5) * CELL;
    const rowT = ITEMS.map(([n], i) => {    return t; });
    const colT = ITEMS.map(([n], j) => {      return t; });



    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function draw() {
      R = train(st);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const p = R.P[i][j], diag = i === j;
        m4.makeScale(1, Math.max(0.01, p * 0.95), 1).setPosition(cx(j), 0.15, rz(i)); im.setMatrixAt(i * N + j, m4);
        im.setColorAt(i * N + j, col.set(diag ? (p > 0.5 ? '#F2C94C' : '#C9A227') : p > 0.25 ? '#D64545' : C.plum)); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;

    }
    draw();
    const controls = [
      { type: 'slider', label: 'Training steps', min: 0, max: 600, step: 50, get: () => st.steps, set: v => { st.steps = v; draw(); } },
      { type: 'buttons', label: 'Temperature', options: ['0.07 (learned)', '1.0'], get: () => (st.tau < 0.5 ? 0 : 1), act: i => { st.tau = i ? 1.0 : 0.07; draw(); } },
      { type: 'buttons', label: 'Batch', options: ['All 8 together', 'Fixed pairs of 2'], get: () => (st.batch === 8 ? 0 : 1), act: i => { st.batch = i ? 2 : 8; draw(); } },
      { type: 'toggle', label: 'Two captions say the same thing', short: 'duplicate caption', get: () => st.dup, set: v => { st.dup = v; draw(); } },
    ];
    const readouts = [
      { label: 'Loss', get: () => ({ v: R.L.toFixed(2), sub: `random guessing: ${Math.log(N).toFixed(2)}` }) },
      { label: 'Photo finds its caption', get: () => ({ v: `${Math.round(R.acc * 8)} of 8`, sub: 'top match among all 8', good: R.acc === 1, bad: R.acc < 0.75 }) },
      { label: 'Diagonal', get: () => ({ v: `${Math.round(R.diag * 100)}%`, sub: 'average probability on the right caption', good: R.diag > 0.7, bad: R.diag < 0.4 }) },
    ];
    const labels = [
      { name: 'grid', t: 'Similarity matrix', d: 'Gold diagonal: right pairs. Red: confusions', icon: 'target', atV: V(GX + N * CELL / 2 + 0.1, 0.4, GZ) },
    ];
    const reset = () => { Object.assign(st, { tau: 0.07, batch: 8, dup: false, steps: 300 }); draw(); };
    const breaks = [
      { label: 'Temperature 1.0', hint: 'A soft softmax', on: () => { reset(); st.tau = 1.0; draw(); }, off: reset },
      { label: 'Fixed pairs of 2', hint: 'Few negatives', on: () => { reset(); st.batch = 2; draw(); }, off: reset },
      { label: 'A duplicate caption', hint: 'Same words twice', on: () => { reset(); st.dup = true; draw(); }, off: reset },
    ];
    function status() {
      const a = Math.round(R.acc * 8);
      if (st.tau > 0.5) return { ok: false, msg: `<b>The diagonal barely rises.</b> At temperature 1.0 cosine similarities between −1 and 1 go into the softmax almost unchanged, so every caption gets nearly the same probability and the gradient is weak: after ${st.steps} steps the right caption averages ${Math.round(R.diag * 100)}% and the loss is ${R.L.toFixed(2)}. CLIP learns its temperature and settles near 0.01 to 0.07.` };
      if (st.batch === 2) return { ok: false, msg: `<b>Each photo only learned to beat one caption.</b> In fixed pairs, the jollof photo only ever sees the kente caption as a negative, so nothing teaches it to differ from the tro-tro or the yams. Over all eight, ${a} of 8 photos pick their own caption. Bigger, shuffled batches give every item many negatives; CLIP used 32,000 per batch.` };
      if (st.dup) return { ok: false, msg: `<b>The loss pushes identical meanings apart.</b> Captions 2 and 7 now both say "yams piled high at a market stall", but InfoNCE still insists each photo prefer its own copy over the other, which is impossible: ${a} of 8 photos find their caption and the jollof and yam rows stay confused (red). Web data is full of these false negatives; deduplicate, or use softer targets.` };
      if (st.steps < 50) return { ok: true, msg: `<b>Not trained yet.</b> The encoders are random, so similarities are random too; divided by a temperature of 0.07 they become confident and mostly wrong, which is why the loss starts at ${R.L.toFixed(2)}, above the ${Math.log(N).toFixed(2)} of plain guessing. Add training steps.` };
      return { ok: true, msg: `<b>${a} of 8 photos find their own caption.</b> After ${st.steps} steps of symmetric InfoNCE at temperature 0.07, the diagonal holds ${Math.round(R.diag * 100)}% on average and the loss is down to ${R.L.toFixed(2)} from about ${Math.log(N).toFixed(2)}. The same text encoder can now rank any caption against any photo: zero-shot.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Pictures and words', home: true, say: 'A Ghanaian picture library has eight photos with captions: kente cloth, jollof rice, a tro-tro, a baobab and more.', act: m => m.set({ tau: 0.07, batch: 8, dup: false, steps: 0 }) },
    { t: 'Before training', home: true, say: 'Two untrained encoders put photos and captions in a shared space at random. Every caption looks as likely as any other.', act: m => m.set({ steps: 0 }) },
    { t: 'Contrastive training', home: true, say: 'Each photo must pick its own caption from all eight, and each caption its own photo. The diagonal rises.', act: m => m.set({ steps: 300 }) },
    { t: 'Temperature', home: true, say: 'At temperature one, the softmax is too soft. Learning crawls, and the diagonal barely rises.', act: m => m.set({ tau: 1.0 }) },
    { t: 'Negatives matter', home: true, say: 'Train in fixed pairs, and each photo only learns to beat one other caption. Bigger batches give more negatives.', act: m => m.set({ tau: 0.07, batch: 2 }) },
    { t: 'False negatives', home: true, say: 'Give two photos captions that say the same thing, and the loss tries to push identical meanings apart.', act: m => m.set({ batch: 8, dup: true }) },
  ],
  check: [
    { q: 'In CLIP\'s loss, what are the negatives for an image?', options: ['Every other caption in the batch', 'Random noise', 'Its own caption'], answer: 0, why: 'Bigger batches mean more negatives.' },
    { q: 'What does a high temperature do to the contrastive softmax?', options: ['Makes it too soft, weakening learning', 'Makes it sharper', 'Removes negatives'], answer: 0, why: 'CLIP learns a low temperature.' },
    { q: 'Why does SigLIP use a sigmoid per pair instead of a softmax?', options: ['Each pair\'s loss is independent, so it scales across GPUs', 'It needs no captions', 'It is always more accurate'], answer: 0, why: 'No need to gather the whole matrix.' },
  ],
  terms: [
    ['Dual encoder', 'Separate image and text encoders mapping into one space.'],
    ['InfoNCE', 'Cross-entropy that picks the right pair from a batch.'],
    ['Temperature', 'Divides similarities before the softmax; low is sharp.'],
    ['False negative', 'A pair treated as wrong that actually matches.'],
    ['SigLIP', 'Contrastive training with an independent sigmoid per pair.'],
    ['Zero-shot classification', 'Choosing the class whose text embedding is closest.'],
  ],
  deeper: '<p><b>Whose pictures?</b> Web-scale image-text data under-represents African places, foods and dress, and often captions them wrongly. Zero-shot accuracy on "jollof rice" or "kente" depends on that data; adding local, well-captioned photos helps more than a bigger model.</p><p><b>Probes and fine-tuning.</b> A linear layer trained on frozen CLIP features beats zero-shot on a specific task; full fine-tuning goes further but can lose zero-shot breadth.</p><p><b>About this machine.</b> The photo and caption features are fixed random vectors linked by a hidden mapping; the two linear encoders are trained live with symmetric InfoNCE and a fixed seed.</p>',
  code: {
    title: 'Symmetric InfoNCE',
    note: 'Adapted from the course\'s CLIP lesson.',
    text: `
import torch, torch.nn.functional as F

def clip_loss(img_emb, txt_emb, log_inv_tau):
    i = F.normalize(img_emb, dim=-1)
    t = F.normalize(txt_emb, dim=-1)
    logits = i @ t.T * log_inv_tau.exp()           # (N, N), divided by temperature
    labels = torch.arange(len(i))
    return (F.cross_entropy(logits, labels) + F.cross_entropy(logits.T, labels)) / 2
`,
  },
};
