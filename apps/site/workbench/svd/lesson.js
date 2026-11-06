// SVD: a woven pattern (a 24 × 24 grid of numbers) split into layers, each one a column pattern times a row pattern with a strength.
// Rebuild it from the strongest few layers: most of the picture for a fraction of the numbers.
// Break it: keep one layer (only plaid), keep every layer of a noisy picture (the noise comes back), turn the stripes diagonal.
const N = 24, CELL = 0.1;
const rng = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
const NOISE = [...Array(N * N)].map(() => rng() - 0.5);
function picture(kind) {
  const a = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let v;
    if (kind === 'diag') v = 0.5 + 0.45 * Math.sign(Math.sin((i + j) * Math.PI / 4));
    else {
      const band = (Math.floor(i / 4) % 2) ? 0.75 : 0.25, warp = (Math.floor(j / 6) % 2) ? 0.3 : 0;
      v = 0.6 * band + 0.4 * warp + (Math.abs(i - 11.5) + Math.abs(j - 11.5) < 6 ? 0.35 : 0);
    }
    if (kind === 'noisy') v += NOISE[i * N + j] * 0.7;
    a.push(Math.max(0, Math.min(1.2, v)));
  }
  return a;
}
// SVD by power iteration with deflation: strongest layer first
function svd(A) {
  const R = A.slice(), out = [];
  for (let c = 0; c < N; c++) {
    let v = [...Array(N)].map((_, k) => Math.sin(k * 1.7 + c) + 1.1);
    let u = new Array(N).fill(0), s = 0;
    for (let it = 0; it < 40; it++) {
      for (let i = 0; i < N; i++) { let t = 0; for (let j = 0; j < N; j++) t += R[i * N + j] * v[j]; u[i] = t; }
      s = Math.hypot(...u) || 1e-12; u = u.map(x => x / s);
      for (let j = 0; j < N; j++) { let t = 0; for (let i = 0; i < N; i++) t += R[i * N + j] * u[i]; v[j] = t; }
      const n = Math.hypot(...v) || 1e-12; v = v.map(x => x / n);
    }
    for (let i = 0; i < N; i++) { let t = 0; for (let j = 0; j < N; j++) t += R[i * N + j] * v[j]; u[i] = t; }
    s = Math.hypot(...u); u = u.map(x => x / (s || 1e-12));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) R[i * N + j] -= s * u[i] * v[j];
    out.push({ s, u, v });
  }
  return out;
}

export default {
  slug: 'svd',
  title: 'SVD: a picture in layers',
  description: 'Split a woven pattern into layers, each a column pattern times a row pattern, sorted by strength. Rebuild it from the strongest few and keep most of the picture for a fraction of the numbers. Then try it on noise and on diagonal stripes.',
  overview: 'Singular value decomposition takes any grid of numbers (a picture, a table of ratings, a weight matrix) and splits it into layers. Each layer is one pattern down the rows times one pattern across the columns, with a strength called its singular value. The layers come sorted, strongest first, so keeping only the first few gives the best possible small copy. That is how pictures compress, how recommenders find hidden tastes, and how LoRA fine-tunes giant models cheaply.',
  keywords: ['svd explained', 'singular value decomposition', 'low rank approximation', 'image compression svd', 'truncated svd'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.1, 1.35, 1.0], half: 3, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { kind: 'weave', k: 4 };
    let A = picture('weave'), L = svd(A);
    const lo = new THREE.Color('#1E2233'), mid = new THREE.Color('#3E9B5F'), hi = new THREE.Color('#F2C94C'), red = new THREE.Color('#D9483B'), cc = new THREE.Color();
    const tone = v => v < 0.5 ? cc.copy(lo).lerp(mid, Math.max(0, v) * 2) : v < 1 ? cc.copy(mid).lerp(hi, (v - 0.5) * 2) : cc.copy(hi).lerp(red, Math.min(1, (v - 1) * 4));
    /* ---------- the original and the rebuilt picture ---------- */
    function frame(x, title) {
      const base = P.box(N * CELL + 0.3, 0.1, N * CELL + 0.3, '#2C2D31', { r: 0.08 }); base.position.set(x, 0, -0.35); S.add(base);
      const g = P.grid(N, N, CELL, { h: 0.05, gap: 0.006 }); g.mesh.position.set(x, 0.1, -0.35); S.add(g.mesh);
      const t = S.text(title, { size: 0.14, face: 'front', weight: 800, color: '#FFFFFF', maxW: 2.5 }); t.position.set(x, 0.05, -0.35 + (N * CELL + 0.3) / 2 + 0.005); S.add(t);
      return g;
    }
    const orig = frame(-2.0, 'THE PICTURE: 576 NUMBERS'), rebuilt = frame(2.0, 'REBUILT FROM LAYERS');
    const tagR = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.6 }); tagR.position.set(2.0, 0.55, -1.75); tagR.userData.noFit = true; S.add(tagR);
    /* ---------- the strengths, strongest first ---------- */
    const bars = [...Array(N)].map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: C.orange }); const b = P.box(0.11, 1, 0.22, C.orange, { r: 0.02, material: m }); b.position.set(-1.65 + i * 0.145, 0.1, 1.55); b.userData.noFit = true; S.add(b); return { b, m }; });
    const shelf = P.box(3.7, 0.1, 0.5, '#E8D9B5', { r: 0.05 }); shelf.position.set(0.02, 0, 1.55); S.add(shelf);
    const shelfT = S.text('strength of each layer', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 3 }); shelfT.position.set(0.02, 0.05, 1.805); S.add(shelfT);
    /* ---------- one layer, to show what a layer is ---------- */
    const lay = P.grid(N, N, 0.045, { h: 0.03, gap: 0.004 }); lay.mesh.position.set(0, 0.12, -0.35); lay.mesh.userData.noFit = true; S.add(lay.mesh);
    const layBase = P.box(1.25, 0.12, 1.25, '#F1EEE6', { r: 0.06 }); layBase.position.set(0, 0, -0.35); S.add(layBase);
    const layT = S.text('', { color: '#151827', size: 0.1, weight: 800, maxW: 1.2 }); layT.position.set(0, 0.125, 0.4); S.add(layT);
    function rebuild() {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) orig.set(j, i, { color: tone(A[i * N + j]) });
      orig.commit();
      const R = new Array(N * N).fill(0);
      for (let c = 0; c < st.k; c++) { const { s, u, v } = L[c]; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) R[i * N + j] += s * u[i] * v[j]; }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) rebuilt.set(j, i, { color: tone(R[i * N + j]) });
      rebuilt.commit();
      // the k-th layer on its own (one column pattern times one row pattern)
      const { s, u, v } = L[st.k - 1];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) lay.set(j, i, { color: tone(0.5 + 3 * u[i] * v[j]) });
      lay.commit();
      layT.userData.set(`layer ${st.k} alone`);
      const top = L[0].s;
      bars.forEach((b, i) => { b.b.scale.y = Math.max(0.01, L[i].s / top * 1.1); b.m.color.set(i < st.k ? C.orange : '#B9B6AE'); });
      st.err = Math.sqrt(A.reduce((a, x, i) => a + (x - R[i]) ** 2, 0) / A.length);
      tagR.userData.set(`${st.k} layer${st.k > 1 ? 's' : ''} · ${st.k * (2 * N + 1)} numbers`);
    }
    function setKind(k) { st.kind = k; A = picture(k); L = svd(A); rebuild(); }
    rebuild();
    const energy = () => { const t = L.reduce((a, x) => a + x.s * x.s, 0); return L.slice(0, st.k).reduce((a, x) => a + x.s * x.s, 0) / t; };
    const controls = [
      { type: 'slider', label: 'Layers kept', min: 1, max: N, step: 1, get: () => st.k, set: v => { st.k = Math.round(v); rebuild(); } },
      { type: 'buttons', label: 'Picture', options: ['Woven', 'Noisy', 'Diagonal'], get: () => ['weave', 'noisy', 'diag'].indexOf(st.kind), act: i => setKind(['weave', 'noisy', 'diag'][i]) },
    ];
    const readouts = [
      { label: 'Numbers stored', get: () => { const n = st.k * (2 * N + 1); return { v: `${n} of 576`, sub: `${Math.round(n / 576 * 100)}%`, bad: n > 576, good: n < 300 && st.err < 0.06 }; } },
      { label: 'Error', get: () => ({ v: st.err.toFixed(3), sub: `${Math.round(energy() * 100)}% of the strength kept`, good: st.err < 0.05, bad: st.err > 0.12 }) },
    ];
    const labels = [
      { name: 'orig', t: 'The picture', d: 'A grid of 24 × 24 numbers', icon: 'box', atV: V(-3.35, 0.1, -1.7) },
      { name: 'bars', t: 'Layer strengths', d: 'Singular values, strongest first', icon: 'scale', atV: V(-1.85, 0.1, 1.8) },
      { name: 'rebuilt', t: 'Rebuilt from k layers', d: 'The best copy that size can be', icon: 'check', atV: V(0.66, 0.1, 1.0) },
      { name: 'layer', t: 'One layer', d: 'A column pattern times a row pattern', icon: 'link', atV: V(0.62, 0.12, -0.97) },
    ];
    const reset = () => { st.k = 4; setKind('weave'); };
    const breaks = [
      { label: 'Keep just one layer', hint: 'Rank 1', on: () => { reset(); st.k = 1; rebuild(); }, off: reset },
      { label: 'Keep every layer of a noisy picture', hint: 'All 24, noise included', on: () => { st.k = N; setKind('noisy'); }, off: reset },
      { label: 'Diagonal stripes', hint: 'Same 4 layers', on: () => { st.k = 4; setKind('diag'); }, off: reset },
    ];
    function status() {
      const n = st.k * (2 * N + 1);
      if (st.k === 1) return { ok: false, msg: `<b>One layer can only make plaid.</b> A single layer is one column pattern times one row pattern, so every row is a scaled copy of the same row. The diamond in the middle can't appear. Error ${st.err.toFixed(3)}.` };
      if (st.kind === 'noisy' && st.k >= 16) return { ok: false, msg: `<b>The noise came back.</b> The pattern lives in the first few strong layers; the speckle is spread thinly over all the weak ones at the end of the shelf. Keep all ${st.k} and you keep the noise too, at ${n} numbers. Keep about 6 and the copy is cleaner than the original.` };
      if (st.kind === 'diag' && st.err > 0.1) return { ok: false, msg: `<b>Diagonal stripes need far more layers.</b> Horizontal and vertical patterns fit layers naturally, because a layer is rows times columns. A diagonal has to be built from many of them: with ${st.k} layers the error is ${st.err.toFixed(3)}. Slide up and watch how many it takes.` };
      if (st.kind === 'noisy') return { ok: true, msg: `<b>Cleaner than the original.</b> ${st.k} strong layers keep the weave; most of the measured error (${st.err.toFixed(3)}) is the speckle they leave out. Dropping weak layers is a simple way to remove noise.` };
      if (n > 576) return { msg: `<b>${st.k} layers cost ${n} numbers, more than the 576 in the picture.</b> Past a point, storing layers stops saving anything.` };
      return { ok: st.err < 0.06 ? true : undefined, msg: `<b>${st.k} layers, ${n} numbers instead of 576.</b> Error ${st.err.toFixed(3)}, ${Math.round(energy() * 100)}% of the strength kept. The strongest layers carry the big shapes; later ones only add fine detail.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, keep: k => { st.k = k; rebuild(); }, kind: setKind };
  },

  story: [
    { t: 'A picture is numbers', home: true, say: 'This woven pattern is a grid of numbers, twenty-four by twenty-four: five hundred and seventy-six of them.', act: m => m.reset() },
    { t: 'Layers', focus: [0, 0.2, -0.35], zoom: 1.5, say: 'SVD splits it into layers. Each layer is just one pattern down the rows times one pattern across the columns.', act: m => m.keep(2) },
    { t: 'Strongest first', focus: [0, 0.4, 1.5], zoom: 1.5, say: 'Every layer has a strength, its singular value, and they come sorted, strongest first. The first few are tall; the rest are tiny.', act: m => m.keep(4) },
    { t: 'Rebuild from a few', home: true, say: 'Rebuild the picture from only the strongest layers. One gives plaid. Four give the stripes and the diamond. Eight is almost perfect, from far fewer numbers.', act: m => m.keep(8), wait: 5 },
    { t: 'Noise lives at the end', home: true, say: 'Add noise to the picture and it spreads thinly over all the weak layers. Keep only the strong ones and you get a cleaner copy than you started with.', act: m => { m.kind('noisy'); m.keep(6); }, wait: 5 },
    { t: 'Everywhere in AI', home: true, say: 'The same split finds hidden tastes in tables of ratings, and lets big models be fine-tuned by learning just a few thin layers. That trick is called LoRA.', act: m => { m.kind('weave'); m.keep(4); } },
  ],
  check: [
    { q: 'What is one layer of an SVD?', options: ['One column pattern times one row pattern, with a strength', 'One row of the picture', 'One colour channel'], answer: 0, why: 'Each layer is an outer product of two patterns, scaled by its singular value.' },
    { q: 'Why keep only the first few layers?', options: ['They are sorted strongest first, so they carry most of the picture', 'The rest are always zero', 'It is the only legal way'], answer: 0, why: 'Truncating after the strongest layers gives the best small copy possible.' },
    { q: 'Why do diagonal stripes need more layers than horizontal ones?', options: ['Layers are rows times columns, so they build straight patterns most easily', 'Diagonals are brighter', 'They don\'t'], answer: 0, why: 'A single layer makes plaid; diagonals must be assembled from many plaids.' },
  ],
  terms: [
    ['SVD', 'Splitting a matrix into U, Σ and Vᵀ: patterns down the rows, strengths, and patterns across the columns.'],
    ['Singular value', 'The strength of one layer. They come sorted from largest to smallest.'],
    ['Rank', 'How many layers it takes to rebuild a matrix exactly.'],
    ['Low-rank approximation', 'Rebuilding from only the strongest k layers: the best copy of that size.'],
    ['Outer product', 'A column times a row, giving a whole grid: one layer.'],
  ],
  deeper: '<p><b>The same as PCA.</b> The column patterns of a centred data table\'s SVD are exactly its principal components, and the squared singular values are their variances.</p><p><b>Recommenders.</b> A table of who rated which film splits into a few hidden "taste" layers: each person is a mix of tastes, each film a mix of the same. Missing ratings are filled in from the low-rank copy.</p><p><b>LoRA.</b> Instead of changing a huge weight matrix, fine-tuning learns a low-rank update: two thin matrices whose product is the change. A rank of 8 or 16 is often enough.</p>',
  code: {
    title: 'Compress a picture with SVD',
    note: 'Adapted from the course\'s SVD lesson.',
    text: `
import numpy as np

img = np.random.default_rng(0).random((24, 24))   # any grid of numbers
U, s, Vt = np.linalg.svd(img, full_matrices=False)

def rebuild(k):
    # the strongest k layers: columns times rows, scaled by strength
    return (U[:, :k] * s[:k]) @ Vt[:k, :]

for k in (1, 4, 8, 24):
    err = np.sqrt(np.mean((img - rebuild(k)) ** 2))
    stored = k * (24 + 24 + 1)
    print(f"k={k:2d}  numbers={stored:4d}/576  error={err:.3f}")
`,
  },
};
