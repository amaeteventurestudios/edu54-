// Image retrieval and metric learning: a shop in Lagos wants "find this fabric" for customers' phone photos of Ankara prints.
// A query photo sits on the left; the catalogue of 40 prints lies on a table as tiles. Retrieval ranks the catalogue by distance in an embedding space,
// and the top 5 rise up on stands. Triplet training pulls same-print photos together and pushes different prints apart by at least a margin.
// Break it: margin 0 (it learns nothing: everything already satisfies it), only easy negatives (it never learns to tell similar prints apart),
// compare raw vector lengths instead of angles (bright photos rank first regardless of pattern).
const N = 40, D = 6;
function catalogue() {
  let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  // 10 families of 4 near-identical prints: easy to confuse within a family
  return [...Array(N)].map((_, i) => { const fam = Math.floor(i / 4); const hue = fam / 10; return { i, fam, hue, sat: 0.55 + 0.1 * (i % 4), pat: i % 4, bright: 0.6 + r() * 0.5, f: [...Array(D)].map(() => g()) }; });
}
const CAT = catalogue();
const QUERY = 13;   // the customer's photo is of print 13, shot in bright sun

export default {
  slug: 'image-retrieval-metric',
  title: 'Image retrieval: find this fabric',
  description: 'A shop in Lagos lets customers snap a photo of an Ankara print and finds it in a catalogue of 40. The catalogue is ranked by distance in a learned embedding space and the best five rise on stands. Train with triplets, then set the margin to zero, mine only easy negatives, or compare raw vector lengths and watch the wrong prints win.',
  overview: 'Retrieval finds the items most like a query, which classification cannot do when every product is its own class and new ones arrive weekly. Instead, a network maps each image to a vector so that photos of the same item land close together and different items far apart; search is then a nearest-neighbour lookup. Triplet loss trains it: an anchor, a positive (same item) and a negative (different item), with the negative pushed at least a margin further away than the positive. The most useful negatives are the hard ones, items that look alike. Comparing by angle (cosine) rather than raw length stops brightness from deciding.',
  keywords: ['image retrieval', 'metric learning triplet loss', 'hard negative mining', 'recall at k', 'cosine similarity search'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.5, 0], dir: [0.12, 0.75, 1.3], half: 1.5, wide: 5.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { margin: 0.3, hard: true, cosine: true, steps: 1000 };
    const ink = '#151827';
    const base = P.box(5.4, 0.12, 2.5, '#E9E2D3', { r: 0.12 }); base.position.set(0.15, 0, 0); S.add(base);
    /* ---------- print texture painter ---------- */
    const col = new THREE.Color(), c2 = new THREE.Color();
    const paint = (it, x, y, bright = 1) => {
      col.setHSL(it.hue, it.sat, 0.45 * bright); c2.setHSL((it.hue + 0.5) % 1, 0.7, 0.6 * Math.min(1.2, bright));
      const pat = it.pat === 0 ? (x + y) % 2 : it.pat === 1 ? Math.floor(Math.hypot(x - 1.5, y - 1.5)) % 2 : it.pat === 2 ? y % 2 : (x * y) % 3 === 0 ? 1 : 0;
      return pat ? c2 : col;
    };
    const tile = (it, cx, cy, cz, size, bright, flat) => {
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(size / 4 * 1.02, size / 4 * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 16);
      m.layers.set(1); m.userData.noFit = true; m.frustumCulled = false; S.add(m);
      const d = new THREE.Object3D();
      for (let k = 0; k < 16; k++) { const x = k % 4, y = Math.floor(k / 4); if (flat) { d.position.set(cx - size / 2 + (x + 0.5) * size / 4, cy, cz - size / 2 + (y + 0.5) * size / 4); d.rotation.set(-Math.PI / 2, 0, 0); } else { d.position.set(cx - size / 2 + (x + 0.5) * size / 4, cy + size / 2 - (y + 0.5) * size / 4, cz); d.rotation.set(0, 0, 0); } d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, paint(it, x, y, bright)); }
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
      return m;
    };
    const recolour = (m, it, bright) => { for (let k = 0; k < 16; k++) m.setColorAt(k, paint(it, k % 4, Math.floor(k / 4), bright)); m.instanceColor.needsUpdate = true; };
    /* ---------- the query ---------- */
    const QX = -2.05, phone = P.box(0.62, 0.9, 0.06, '#2B2B2B', { r: 0.06 }); phone.position.set(QX, 0.12, -0.6); S.add(phone);
    tile(CAT[QUERY], QX, 0.12 + 0.48, -0.565, 0.5, 1.35, false);
    const qT = S.text('customer\'s photo', { size: 0.065, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); qT.position.set(QX, 1.2, -0.6); qT.userData.noFit = true; S.add(qT);
    /* ---------- the catalogue table ---------- */
    const TX = 0.35, TZ = 0.3, TS = 0.32, table = P.box(10 * TS + 0.3, 0.05, 4 * TS + 0.3, '#5B4636', { r: 0.04 }); table.position.set(TX, 0.12, TZ); S.add(table);
    const tT = S.text('the catalogue: 40 prints in 10 look-alike families', { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); tT.position.set(TX, 0.145, TZ + 2 * TS + 0.155); S.add(tT);
    const tTop = S.text('catalogue', { size: 0.07, weight: 800, color: '#FFFFFF' }); tTop.position.set(TX - 1.2, 0.175, TZ + 2 * TS + 0.05); S.add(tTop);
    const tpos = i => [TX - 5 * TS + (Math.floor(i / 4) + 0.5) * TS, TZ - 2 * TS + (i % 4 + 0.5) * TS];
    CAT.forEach((it, i) => { const [x, z] = tpos(i); tile(it, x, 0.18, z, TS * 0.86, it.bright, true); });
    const rings = [...Array(5)].map((_, k) => { const r = P.tube([V(-1, 0, -1), V(1, 0, -1), V(1, 0, 1), V(-1, 0, 1), V(-1, 0, -1)].map(v => v.multiplyScalar(TS * 0.48)), 0.012, k === 0 ? C.gold : C.orange); r.userData.noFit = true; S.add(r); return r; });
    /* ---------- the results stands ---------- */
    const stands = [...Array(5)].map((_, k) => { const x = -1.05 + k * 0.66, b = P.box(0.56, 0.12, 0.3, '#3B3F8F', { r: 0.03 }); b.position.set(x, 0.12, -0.75); S.add(b); const t = S.text(`#${k + 1}`, { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.18, -0.595); S.add(t); return { x, b, t, tile: tile(CAT[0], x, 0.12 + 0.12 + 0.32, -0.75, 0.5, 1, false), tag: (() => { const q = S.text('', { size: 0.055, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); q.userData.noFit = true; q.position.set(x, 0.98, -0.75); S.add(q); return q; })() }; });
    const sT = S.text('top 5 matches', { size: 0.07, weight: 800, face: 'front', color: ink }); sT.position.set(0.27, 0.13, -0.42); S.add(sT);
    /* ---------- the embedding ---------- */
    let R = null;
    const NOISE = [0, 1].map(view => CAT.map(it => { let q = 97 + it.i * 13 + view * 7919; const r = () => (q = (q * 16807) % 2147483647) / 2147483647; return [...Array(D)].map(() => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r())); }));
    function embed(it, bright, view) {
      // each photo = what the network has learned to keep (family, pattern, the print itself) + what it has not learned to ignore (view noise)
      const learn = Math.min(1, st.steps / 1000), on = st.margin > 0 ? learn : 0;
      const famW = 1.6 * on, patW = 1.2 * on * (st.hard ? 1 : 0.15), idW = 1.0 * on * (st.hard ? 1 : 0.1), nz = 1.0 - 0.75 * on;
      const v = it.f.map((x, d) => idW * x + famW * Math.cos(it.fam * 0.63 + d * 1.1) + patW * Math.cos(it.pat * 1.57 + d * 0.7) + nz * NOISE[view][it.i][d]);
      return v.map(x => x * bright);
    }
    function search() {
      const q = embed(CAT[QUERY], 1.35, 1);
      const norm = v => Math.hypot(...v);
      const dist = CAT.map(it => { const v = embed(it, it.bright, 0); if (st.cosine) return 1 - v.reduce((a, x, d) => a + x * q[d], 0) / (norm(v) * norm(q)); return -norm(v); });
      const order = CAT.map((_, i) => i).sort((a, b) => dist[a] - dist[b]);
      const rank = order.indexOf(QUERY);
      // recall@1 and @5 over every print as a query
      let r1 = 0, r5 = 0;
      CAT.forEach((qi, qq) => { const qv = embed(qi, 1.3, 1); const ds = CAT.map(it => { const v = embed(it, it.bright, 0); return st.cosine ? 1 - v.reduce((a, x, d) => a + x * qv[d], 0) / (norm(v) * norm(qv)) : -norm(v); }); const o = CAT.map((_, i) => i).sort((a, b) => ds[a] - ds[b]); const p = o.indexOf(qq); if (p === 0) r1++; if (p < 5) r5++; });
      return { order, rank, r1: r1 / N, r5: r5 / N };
    }
    function draw() {
      R = search();
      R.order.slice(0, 5).forEach((idx, k) => {
        const s = stands[k]; recolour(s.tile, CAT[idx], CAT[idx].bright);
        s.tag.userData.set(idx === QUERY ? 'the right print' : CAT[idx].fam === CAT[QUERY].fam ? 'look-alike' : 'wrong family');
        const [x, z] = tpos(idx); rings[k].position.set(x, 0.2, z);
      });
    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Triplet margin', min: 0, max: 0.6, step: 0.05, get: () => st.margin, set: v => { st.margin = v; draw(); } },
      { type: 'toggle', label: 'Mine hard negatives (look-alike prints)', short: 'hard negatives', get: () => st.hard, set: v => { st.hard = v; draw(); } },
      { type: 'toggle', label: 'Compare by angle (cosine)', short: 'cosine', get: () => st.cosine, set: v => { st.cosine = v; draw(); } },
    ];
    const readouts = [
      { label: 'Right print', get: () => ({ v: R.rank === 0 ? 'first' : R.rank < 5 ? `#${R.rank + 1}` : 'not in top 5', sub: 'for this photo', good: R.rank === 0, bad: R.rank >= 5 }) },
      { label: 'Recall@1', get: () => ({ v: pct(R.r1), sub: 'every print as a query', good: R.r1 > 0.85, bad: R.r1 < 0.5 }) },
      { label: 'Recall@5', get: () => ({ v: pct(R.r5), sub: 'right one in the top 5', good: R.r5 > 0.95, bad: R.r5 < 0.7 }) },
    ];
    const labels = [
      { name: 'query', t: 'The query', d: 'A customer\'s photo, in bright sun', icon: 'eye', atV: V(QX - 0.31, 0.6, -0.6) },
      { name: 'stands', t: 'Top five matches', d: 'Nearest in the embedding space', icon: 'target', atV: V(1.6, 0.5, -0.75) },
      { name: 'table', t: 'The catalogue', d: 'Gold square: the first match', icon: 'box', atV: V(TX + 5 * TS + 0.15, 0.2, TZ) },
    ];
    const reset = () => { Object.assign(st, { margin: 0.3, hard: true, cosine: true }); draw(); };
    const breaks = [
      { label: 'Margin of zero', hint: 'Any gap counts as enough', on: () => { reset(); st.margin = 0; draw(); }, off: reset },
      { label: 'Only easy negatives', hint: 'Negatives from other families', on: () => { reset(); st.hard = false; draw(); }, off: reset },
      { label: 'Compare raw lengths', hint: 'No cosine, no normalising', on: () => { reset(); st.cosine = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.cosine) return { ok: false, msg: `<b>The brightest photos win.</b> Comparing raw vectors lets their length decide, and length here mostly tracks brightness, so well-lit prints rank first whatever their pattern: the right print is ${R.rank < 5 ? `#${R.rank + 1}` : 'not in the top 5'}, recall@1 ${pct(R.r1)}. Normalise and compare angles.` };
      if (st.margin === 0) return { ok: false, msg: `<b>Nothing to learn.</b> With a margin of zero, any triplet where the negative is even slightly further than the positive already has zero loss, which is nearly all of them from the start. The embedding stays close to random: recall@1 ${pct(R.r1)}.` };
      if (!st.hard) return { ok: false, msg: `<b>Fooled by look-alikes.</b> Negatives drawn from other families are already far away, so they teach almost nothing; the network never learns what separates the four prints within a family. It finds the right family but not the right print: recall@1 ${pct(R.r1)}, recall@5 ${pct(R.r5)}.` };
      return { ok: true, msg: `<b>Found it.</b> Triplets with a margin of ${st.margin.toFixed(2)} and hard negatives from the same family taught the network the small differences that matter, and cosine comparison ignores the bright sun: the right print ranks ${R.rank === 0 ? 'first' : `#${R.rank + 1}`}, recall@1 ${pct(R.r1)}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Find this fabric', home: true, say: 'A shop in Lagos lets customers photograph an Ankara print and finds it in a catalogue of forty. Prints come in families of four that look very alike.', act: m => m.set({ margin: 0.3, hard: true, cosine: true }) },
    { t: 'Nearest neighbours', home: true, say: 'Every image becomes a vector. Search is just ranking the catalogue by distance to the query, and the closest five rise on the stands.', act: m => m.set({}) },
    { t: 'Triplets', home: true, say: 'Training uses triplets: a photo, another photo of the same print, and a different print. The different one must end up further away by at least a margin.', act: m => m.set({}) },
    { t: 'Zero margin', home: true, say: 'Set the margin to zero, and almost every triplet is already satisfied. Nothing is learned, and the search is close to random.', act: m => m.set({ margin: 0 }) },
    { t: 'Hard negatives', home: true, say: 'Use only easy negatives from other families, and it learns the families but not the prints. The look-alikes fill the stands.', act: m => m.set({ margin: 0.3, hard: false }) },
    { t: 'Angles, not lengths', home: true, say: 'Compare raw vector lengths, and the brightest photos win. Comparing angles lets the pattern decide.', act: m => m.set({ hard: true, cosine: false }) },
  ],
  check: [
    { q: 'Why use retrieval instead of classification for a product catalogue?', options: ['Every product is its own class and new ones keep arriving', 'Retrieval needs no images', 'Classification is always slower'], answer: 0, why: 'Search by similarity handles new items without retraining.' },
    { q: 'What does the triplet margin do?', options: ['Requires the negative to be at least that much further than the positive', 'Sets the image size', 'Limits the catalogue'], answer: 0, why: 'With zero margin, almost nothing has loss.' },
    { q: 'Why mine hard negatives?', options: ['Look-alike items teach the small differences that matter', 'They are cheaper', 'They make training shorter'], answer: 0, why: 'Easy negatives are already far away.' },
  ],
  terms: [
    ['Image retrieval', 'Finding the images most similar to a query.'],
    ['Metric learning', 'Training an embedding so distance reflects similarity.'],
    ['Triplet loss', 'Anchor, positive and negative, with a margin between their distances.'],
    ['Hard negative', 'A different item that looks very similar.'],
    ['Recall@K', 'How often the right item appears in the top K results.'],
    ['Cosine similarity', 'Similarity of direction, ignoring length.'],
  ],
  deeper: '<p><b>At scale.</b> Searching millions of vectors one by one is slow, so libraries such as FAISS build indexes that find near neighbours approximately but very fast.</p><p><b>Instance or category.</b> "Find this exact print" is instance retrieval; "find similar prints" is category retrieval. They need different training pairs.</p><p><b>About this machine.</b> The embeddings are generated to show the effect of each setting; ranking and recall are computed exactly from them.</p>',
  code: {
    title: 'Triplet loss with hard negatives',
    note: 'Adapted from the course\'s image retrieval lesson.',
    text: `
import torch, torch.nn.functional as F

def triplet_loss(anchor, positive, negative, margin=0.3):
    a, p, n = (F.normalize(x, dim=1) for x in (anchor, positive, negative))
    d_ap = 1 - (a * p).sum(1)            # cosine distance
    d_an = 1 - (a * n).sum(1)
    return F.relu(d_ap - d_an + margin).mean()

def hardest_negative(anchor, candidates, labels, anchor_label):
    d = 1 - F.normalize(candidates, dim=1) @ F.normalize(anchor, dim=0)
    d[labels == anchor_label] = float("inf")    # skip same-item photos
    return candidates[d.argmin()]               # the closest different item
`,
  },
};
