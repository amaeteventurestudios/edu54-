// Dimensionality reduction: a cloud of farms measured three ways (rain, fertiliser, yield). PCA finds the directions the cloud spreads most,
// then flattens the cloud onto the best line or sheet, keeping as much of the spread as it can.
// Break it: skip centring (the first direction points at the mean), leave one feature in bigger units (it hijacks the first direction).
const NPTS = 110, M = [0.5, 1.35, 0.1];
const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const U1 = norm([1, 0.35, 0.3]), U2 = norm([-0.35, 0.95, 0.05]), U3 = [U1[1] * U2[2] - U1[2] * U2[1], U1[2] * U2[0] - U1[0] * U2[2], U1[0] * U2[1] - U1[1] * U2[0]];
const PTS0 = [...Array(NPTS)].map(() => { const a = gauss() * 1.3, b = gauss() * 0.5, c = gauss() * 0.13; return [0, 1, 2].map(i => M[i] + a * U1[i] + b * U2[i] + c * U3[i]); });
const PTS = PTS0;
// the farm furthest along the main trend, for a label that sits on a point
const FAR = PTS.reduce((b, p, i, a) => (p[0] - M[0]) * U1[0] + (p[1] - M[1]) * U1[1] + (p[2] - M[2]) * U1[2] < (a[b][0] - M[0]) * U1[0] + (a[b][1] - M[1]) * U1[1] + (a[b][2] - M[2]) * U1[2] ? b : i, 0);

export default {
  slug: 'pca',
  title: 'PCA: squash the data, keep the shape',
  description: 'A cloud of farms measured three ways floats in space. PCA finds the directions it spreads most, then flattens it onto the best sheet or line while keeping most of its shape. Then forget to centre the data, or measure one feature in bigger units.',
  overview: 'Real data has many columns, and many of them move together. Principal component analysis (PCA) finds the directions in which the data spreads most: the first principal component is the longest stretch of the cloud, the second the next longest at right angles, and so on. Keep only the first few and you have fewer numbers per row that still tell most of the story. You must centre the data first, and put the features on the same scale.',
  keywords: ['pca explained', 'principal component analysis', 'dimensionality reduction', 'explained variance', 'standardize features'],
  orient: 'any',
  view: { target: [0.4, 1.2, 0.1], dir: [0.9, 0.7, 1.35], half: 3, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 3, center: true, scale: false, u: 1, from: 3 };
    /* ---------- axes from a corner ---------- */
    const O = V(-2.0, 0.1, -1.6);
    const AX = [{ d: V(1, 0, 0), n: 'Rain', c: C.blue }, { d: V(0, 1, 0), n: 'Fertiliser', c: C.green }, { d: V(0, 0, 1), n: 'Yield', c: C.gold }];
    for (const a of AX) {
      S.add(P.arrow(O, O.clone().addScaledVector(a.d, a.d.y ? 2.7 : 3.6), 0.025, a.c));
      const t = S.text(a.n.toUpperCase(), { size: 0.14, weight: 800, color: a.c, face: 'cam', bg: 'rgba(255,255,255,0.85)', top: true }); t.position.copy(O).addScaledVector(a.d, a.d.y ? 2.9 : 3.85); t.userData.noFit = true; S.add(t);
    }
    /* ---------- the points ---------- */
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshLambertMaterial({ color: C.teal }), NPTS);
    im.castShadow = true; S.add(im);
    const errs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 5).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: C.red }), NPTS);
    errs.userData.noFit = true; errs.layers.set(1); S.add(errs);
    const dummy = new THREE.Object3D(), up = V(0, 1, 0), q = new THREE.Quaternion();
    const meanBall = P.ball(0.09, C.ink); S.add(meanBall);
    const pcs = [0, 1, 2].map(i => { const a = P.arrow(V(), V(1, 0, 0), i ? 0.03 : 0.04, [C.orange, C.plum, '#8E91A3'][i]); a.userData.noFit = true; S.add(a); return a; });
    const pcT = [0, 1].map(i => { const t = S.text(`PC${i + 1}`, { size: 0.15, weight: 800, color: '#FFFFFF', bg: [C.orange, C.plum][i], face: 'cam', top: true, pad: 0.25 }); t.userData.noFit = true; S.add(t); return t; });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#F6C59A', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    sheet.userData.noFit = true; S.add(sheet);
    /* ---------- PCA by power iteration on the 3 × 3 covariance ---------- */
    let pca = null;
    function data() { return PTS.map(p => [st.scale ? M[0] + (p[0] - M[0]) * 3.2 : p[0], p[1], p[2]]); }
    function compute() {
      const X = data(), n = X.length, mean = [0, 1, 2].map(i => X.reduce((a, p) => a + p[i], 0) / n);
      const c = st.center ? mean : [0, 0, 0];
      const Z = X.map(p => p.map((v, i) => v - c[i]));
      let Cm = [0, 1, 2].map(i => [0, 1, 2].map(j => Z.reduce((a, p) => a + p[i] * p[j], 0) / n));
      const vecs = [], vals = [];
      for (let e = 0; e < 3; e++) {
        let v = norm([1, 0.5 + e, 0.3 - e * 0.4]);
        for (let it = 0; it < 80; it++) { const w = [0, 1, 2].map(i => Cm[i][0] * v[0] + Cm[i][1] * v[1] + Cm[i][2] * v[2]); for (const u of vecs) { const d = w[0] * u[0] + w[1] * u[1] + w[2] * u[2]; for (let i = 0; i < 3; i++) w[i] -= d * u[i]; } v = norm(w); }
        const lam = [0, 1, 2].reduce((a, i) => a + v[i] * (Cm[i][0] * v[0] + Cm[i][1] * v[1] + Cm[i][2] * v[2]), 0);
        vecs.push(v); vals.push(lam);
      }
      const totalVar = [0, 1, 2].reduce((a, i) => a + X.reduce((s, p) => s + (p[i] - mean[i]) ** 2, 0) / n, 0);
      pca = { X, mean, c, vecs, vals, totalVar };
    }
    const proj = (p, k) => { const { c, vecs } = pca, d = p.map((v, i) => v - c[i]); const out = [...c]; for (let e = 0; e < k; e++) { const s = d[0] * vecs[e][0] + d[1] * vecs[e][1] + d[2] * vecs[e][2]; for (let i = 0; i < 3; i++) out[i] += s * vecs[e][i]; } return out; };
    const kept = () => { // share of the spread around the mean that survives
      const { X, mean } = pca; let lost = 0; for (const p of X) { const r = proj(p, st.k); lost += r.reduce((a, v, i) => a + (v - p[i]) ** 2, 0); } lost /= X.length;
      return Math.max(0, 1 - lost / pca.totalVar);
    };
    const err = () => { const { X } = pca; let s = 0; for (const p of X) { const r = proj(p, st.k); s += Math.sqrt(r.reduce((a, v, i) => a + (v - p[i]) ** 2, 0)); } return s / X.length; };
    function update(dt) {
      if (st.u < 1) st.u = Math.min(1, st.u + dt * (S.reduced ? 6 : 1.4));
      const e = st.u * st.u * (3 - 2 * st.u);
      pca.X.forEach((p, i) => {
        const a = proj(p, st.from), b = proj(p, st.k), r = a.map((v, j) => v + (b[j] - v) * e);
        dummy.position.set(r[0], r[1], r[2]); dummy.scale.setScalar(1); dummy.quaternion.identity(); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        const d = V(p[0] - r[0], p[1] - r[1], p[2] - r[2]), L = d.length();
        dummy.position.set(r[0], r[1], r[2]); q.setFromUnitVectors(up, L > 1e-6 ? d.clone().normalize() : up); dummy.quaternion.copy(q); dummy.scale.set(1, Math.max(1e-4, L), 1); dummy.updateMatrix(); errs.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true; errs.instanceMatrix.needsUpdate = true; errs.visible = st.k < 3;
      const c = V(...pca.c), m = V(...pca.mean);
      meanBall.position.copy(m);
      const L = [2.1, 1.0, 0.45].map((x, i) => st.center ? Math.max(0.35, Math.sqrt(Math.max(0, pca.vals[i])) * 1.9) : x * 1.2);
      pcs.forEach((a, i) => { a.visible = i < 2 || st.k === 3; P.setArrow(a, c, c.clone().addScaledVector(V(...pca.vecs[i]), L[i])); });
      pcT.forEach((t, i) => t.position.copy(c).addScaledVector(V(...pca.vecs[i]), L[i] + 0.25));
      sheet.visible = st.k === 2;
      if (sheet.visible) { const n = V(...pca.vecs[2]); sheet.position.copy(c); sheet.quaternion.setFromUnitVectors(V(0, 0, 1), n); const s = L[0] * 1.6; sheet.scale.set(s, s, 1); }
    }
    compute();
    const setK = k => { st.from = st.k; st.k = k; st.u = 0; };
    const controls = [
      { type: 'buttons', label: 'Keep', options: ['1 direction', '2 directions', 'All 3'], get: () => st.k - 1, act: i => setK(i + 1) },
      { type: 'toggle', label: 'Centre the data first', short: 'Centre', get: () => st.center, set: v => { st.center = v; compute(); } },
      { type: 'toggle', label: 'Rain in bigger units', get: () => st.scale, set: v => { st.scale = v; compute(); }, quick: false },
    ];
    const readouts = [
      { label: 'Spread kept', get: () => ({ v: `${Math.round(kept() * 100)}%`, bar: kept(), good: kept() > 0.9, bad: kept() < 0.75 }), bar: true },
      { label: 'Numbers per farm', get: () => ({ v: `${st.k} of 3`, sub: `typical error ${err().toFixed(2)}` }) },
    ];
    const labels = [
      { name: 'cloud', t: 'Farms as points', d: 'Rain, fertiliser and yield for each', icon: 'box', at: () => { const i = FAR; const p = proj(pca.X[i], st.k); return V(p[0], p[1], p[2]); } },
      { name: 'mean', t: 'The average farm', d: 'The centre of the cloud', icon: 'target', at: () => meanBall.position.clone() },
      { name: 'pc1', t: 'The first component', d: 'The direction the cloud stretches most', icon: 'spark', at: () => pcT[0].position.clone().add(V(0, -0.25, 0)) },
      { name: 'pc2', t: 'The second component', d: 'Next most, at right angles', icon: 'link', at: () => pcT[1].position.clone().add(V(0, -0.25, 0)) },
    ];
    const reset = () => { Object.assign(st, { k: 3, from: 3, u: 1, center: true, scale: false }); compute(); };
    const breaks = [
      { label: 'Skip centring', hint: 'PCA from the corner, not the middle', on: () => { reset(); st.center = false; compute(); setK(2); }, off: reset },
      { label: 'Rain measured in bigger units', hint: 'Not standardised', on: () => { reset(); st.scale = true; compute(); setK(1); }, off: reset },
    ];
    function status() {
      const k = Math.round(kept() * 100);
      if (!st.center) return { ok: false, msg: `<b>The first direction points at the cloud, not along it.</b> Without centring, PCA measures spread from the corner of the axes, so the biggest "spread" is simply how far away the cloud sits. The sheet misses the cloud's shape and keeps only ${k}% of its real spread. Subtract the mean first.` };
      if (st.scale) return { ok: false, msg: `<b>One feature hijacked PCA.</b> Rain is now in bigger units, so its numbers are three times wider and the first direction just follows rain. Fertiliser and yield barely count. Standardise every feature (subtract its mean, divide by its spread) before PCA.` };
      if (st.k === 3) return { msg: `<b>All three directions kept:</b> nothing lost. The orange arrow (PC1) follows the cloud's longest stretch, purple (PC2) the next, at right angles. Try keeping fewer.` };
      return { ok: k > 90 ? true : undefined, msg: `<b>${st.k} number${st.k > 1 ? 's' : ''} per farm instead of 3, ${k}% of the spread kept.</b> Each point dropped straight onto the ${st.k === 2 ? 'sheet' : 'line'} (red lines show what was lost). ${st.k === 2 ? 'The cloud was nearly flat already, so very little goes.' : 'One direction keeps the main trend but loses the second one.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, keep: setK, set: p => { Object.assign(st, p); compute(); } };
  },

  story: [
    { t: 'A cloud of farms', home: true, say: 'Each point is a farm, measured three ways: rain, fertiliser and yield. Together they make a cloud in three dimensions.', act: m => m.reset() },
    { t: 'Find the middle', focus: 'mean', zoom: 1.4, say: 'First find the average farm, the centre of the cloud. Everything is measured from here.' },
    { t: 'The longest stretch', focus: 'pc1', zoom: 1.3, say: 'The first principal component is the direction in which the cloud stretches the most. More rain, more fertiliser, more yield, all together.' },
    { t: 'Flatten onto a sheet', home: true, say: 'The second component is the next longest stretch, at right angles. Keep just those two, and every farm drops onto a flat sheet. Two numbers instead of three, and almost nothing lost.', act: m => m.keep(2), wait: 5 },
    { t: 'Down to a line', home: true, say: 'Keep only one, and the cloud becomes a line. The main trend survives; the red lines show what was thrown away.', act: m => m.keep(1), wait: 5 },
    { t: 'Centre and scale first', home: true, say: 'Two habits make PCA honest: centre the data on its average, and put every feature in the same units. Skip them and the arrows point the wrong way.', act: m => { m.set({ center: false }); m.keep(2); }, wait: 5 },
  ],
  check: [
    { q: 'What is the first principal component?', options: ['The direction in which the data spreads the most', 'The first column of the data', 'The average point'], answer: 0, why: 'PCA ranks directions by spread; the first one captures the most.' },
    { q: 'Why centre the data before PCA?', options: ['To make it faster', 'Otherwise the first direction just points from the origin to the cloud', 'Centring adds new features'], answer: 1, why: 'Spread must be measured around the mean, not from the corner of the axes.' },
    { q: 'One feature is measured in much bigger units. What happens?', options: ['Nothing', 'It dominates the first component', 'It is dropped'], answer: 1, why: 'Bigger numbers look like bigger spread. Standardise features first.' },
  ],
  terms: [
    ['Dimensionality reduction', 'Describing each row with fewer numbers while keeping most of the information.'],
    ['Principal component', 'A direction of spread in the data; the first is the largest.'],
    ['Explained variance', 'The share of the data\'s spread a set of components keeps.'],
    ['Centring', 'Subtracting each feature\'s average so the data sits around zero.'],
    ['Standardising', 'Centring and dividing by the spread, so every feature is in the same units.'],
  ],
  deeper: '<p><b>Where the directions come from.</b> The principal components are the eigenvectors of the data\'s covariance matrix, and the eigenvalues are how much spread each one carries. In practice libraries use the SVD, which gives the same answer more stably.</p><p><b>Embeddings, squashed.</b> Word embeddings have hundreds of numbers each. PCA down to two or three lets you plot them and see clusters, though some structure is always lost.</p><p><b>When PCA fails.</b> It only finds straight directions. Data that lies on a curve (a spiral, a ring) needs non-linear methods such as t-SNE or UMAP to unroll it.</p>',
  code: {
    title: 'PCA in a few lines of NumPy',
    note: 'Adapted from the course\'s dimensionality-reduction lesson.',
    text: `
import numpy as np

def pca(X, k):
    X = (X - X.mean(axis=0)) / X.std(axis=0)   # centre and standardise
    cov = X.T @ X / len(X)
    vals, vecs = np.linalg.eigh(cov)            # smallest first
    order = np.argsort(vals)[::-1]
    vals, vecs = vals[order], vecs[:, order]
    kept = vals[:k].sum() / vals.sum()
    return X @ vecs[:, :k], kept

farms = np.random.default_rng(0).normal(size=(110, 3)) @ np.array(
    [[1.0, 0.4, 0.3], [0.0, 0.5, 0.0], [0.0, 0.0, 0.1]])
Z, kept = pca(farms, k=2)
print(Z.shape, f"{kept:.0%} of the spread kept")
`,
  },
};
