// Embeddings and the vector index: a farmers' helpline in Lilongwe keeps 2,000 answered questions as vectors and must find the five closest to each new one.
// A real HNSW index (Malkov and Yashunin, 2016) built here over 2-number vectors so the map can show them: each point gets a top layer from -ln(u)/ln(M),
// inserts link it to its M nearest on each layer it reaches (2M on layer 0), searches walk greedily down the sparse layers, then run a beam of width ef on layer 0.
// Recall is measured against brute force over 100 test questions; comparisons count every distance computed. Real embeddings have hundreds of numbers.
const NP = 2000, TOP = 2, K = 5, NQ = 100, MS = [2, 4, 8, 16], EFS = [5, 10, 20, 50];
let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const CL = Array.from({ length: 25 }, () => [rnd() * 1.6 - 0.8, rnd() * 1.6 - 0.8, 0.08 + rnd() * 0.14]);
const PTS = Array.from({ length: NP }, () => { const c = CL[Math.floor(rnd() * CL.length)]; return [Math.max(-1, Math.min(1, c[0] + g() * c[2])), Math.max(-1, Math.min(1, c[1] + g() * c[2]))]; });
const LU = Array.from({ length: NP }, () => rnd());
const QS = Array.from({ length: NQ }, () => { const c = CL[Math.floor(rnd() * CL.length)]; return [Math.max(-1, Math.min(1, c[0] + g() * c[2] * 1.3)), Math.max(-1, Math.min(1, c[1] + g() * c[2] * 1.3))]; });
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const TRUTH = QS.map(q => PTS.map((p, i) => [d2(p, q), i]).sort((a, b) => a[0] - b[0]).slice(0, K).map(x => x[1]));
function greedy(q, e, lc, nb, path) {
  let best = d2(q, PTS[e]), n = 1, moved = true; if (path) path.push(e);
  while (moved) { moved = false; for (const j of nb[lc][e]) { n++; const v = d2(q, PTS[j]); if (v < best) { best = v; e = j; moved = true; } } if (moved && path) path.push(e); }
  return { e, n };
}
function layer(q, eps, ef, lc, nb) {
  const seen = new Set(eps); let n = eps.length;
  const C = eps.map(e => [d2(q, PTS[e]), e]).sort((a, b) => a[0] - b[0]), W = C.slice();
  while (C.length) {
    const [cd, c] = C.shift(); if (W.length >= ef && cd > W[W.length - 1][0]) break;
    for (const j of nb[lc][c]) {
      if (seen.has(j)) continue; seen.add(j); n++; const v = d2(q, PTS[j]);
      if (W.length < ef || v < W[W.length - 1][0]) { W.push([v, j]); W.sort((a, b) => a[0] - b[0]); if (W.length > ef) W.pop(); C.push([v, j]); C.sort((a, b) => a[0] - b[0]); }
    }
  }
  return { res: W, n, seen };
}
function build(M, flat) {
  const mL = 1 / Math.log(Math.max(2, M)), lev = LU.map(u => flat ? 0 : Math.min(TOP, Math.floor(-Math.log(u + 1e-12) * mL)));
  const nb = [0, 1, 2].map(() => Array.from({ length: NP }, () => []));
  let ep = 0, top = lev[0];
  for (let i = 1; i < NP; i++) {
    const q = PTS[i]; let e = ep;
    for (let lc = top; lc > lev[i]; lc--) e = greedy(q, e, lc, nb).e;
    for (let lc = Math.min(top, lev[i]); lc >= 0; lc--) {
      const W = layer(q, [e], 32, lc, nb).res, mx = lc ? M : 2 * M;
      for (const [, j] of W.slice(0, M)) {
        nb[lc][i].push(j); nb[lc][j].push(i);
        if (nb[lc][j].length > mx) nb[lc][j] = nb[lc][j].map(k => [d2(PTS[j], PTS[k]), k]).sort((a, b) => a[0] - b[0]).slice(0, mx).map(x => x[1]);
      }
      e = W[0][1];
    }
    if (lev[i] > top) { top = lev[i]; ep = i; }
  }
  return { lev, nb, ep, top };
}
function search(G, q, ef) {
  let e = G.ep, n = 0; const paths = [[], [], []];
  for (let lc = G.top; lc > 0; lc--) { const r = greedy(q, e, lc, G.nb, paths[lc]); e = r.e; n += r.n; }
  const r = layer(q, [e], Math.max(ef, K), 0, G.nb); n += r.n;
  return { got: r.res.slice(0, K).map(x => x[1]), n, paths, seen: r.seen, e0: e };
}
function measure(G, ef) {
  let rec = 0, n = 0;
  QS.forEach((q, i) => { const s = search(G, q, ef); rec += s.got.filter(x => TRUTH[i].includes(x)).length / K; n += s.n; });
  return { recall: rec / NQ, n: n / NQ };
}

export default {
  slug: 'embeddings',
  title: 'Vector search: find the nearest without checking all',
  description: 'A helpline keeps 2,000 questions as vectors. Watch an HNSW index drop through its layers to find the five closest without checking them all.',
  overview: 'An embedding model turns a piece of text into a vector, so that texts with similar meanings land close together. Closeness is usually cosine similarity, the angle between two vectors; when vectors are normalised to length one, the plain dot product gives the same ranking and is faster, and so does straight-line distance. Finding the closest vectors by comparing the question with every stored one is exact but slow: a million vectors means a million comparisons for every query. A vector index trades a little accuracy for a lot of speed. HNSW, the index inside most vector databases, links every vector to a few near neighbours, and gives a random few a place on sparser layers above, linked over longer distances. A search starts at the top, hops greedily towards the question on each layer, drops down, and finally explores a beam of candidates on the full bottom layer. Two settings matter: how many links each vector keeps (M) and how wide the final beam is (ef). Too few links and the graph falls apart into islands; too narrow a beam and the search settles for near-misses. Recall, the share of the true nearest found, is the number to watch.',
  keywords: ['embeddings', 'vector search', 'HNSW', 'approximate nearest neighbour', 'vector database', 'cosine similarity', 'recall'],
  orient: 'landscape',
  view: { target: [0.1, 0.9, 0.1], dir: [0.45, 0.55, 1.3], half: 2.0, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { m: 1, ef: 2, flat: false }, st = { ...D0 };
    const CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B';
    const noText = { userData: { set: () => {} }, position: { set: () => {} } };
    /* three panels: layer 2, layer 1, layer 0, the same map at three densities */
    /* the three layers stacked like glass floors: sparse layer 2 on top, all 2,000 points on layer 0 at the bottom */
    const PZ = 0, SC = 1.05, PW = 2.3, FY = [1.7, 0.95, 0.2];
    const at = (L, p, y = 0.135) => V(-0.6 + p[0] * SC, FY[L] + (y - 0.12), PZ + p[1] * SC);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const panels = [2, 1, 0].map((lc, L) => {
      const pad = P.box(PW, 0.02, PW, '#fff', { r: 0.05, material: new THREE.MeshLambertMaterial({ color: '#DCEBF5', transparent: true, opacity: 0.45, depthWrite: false }) }); pad.position.set(-0.6, FY[L] - 0.01, PZ); pad.userData.noMask = true; S.add(pad);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (L < 2) { const post = P.cyl(0.02, FY[L] - FY[L + 1], '#9A968C'); post.position.set(-0.6 + x * PW / 2.05, FY[L + 1], PZ + z * PW / 2.05); S.add(post); }
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NP); im.frustumCulled = false; im.userData.noFit = true; im.layers.set(1); S.add(im);
      const eg = new THREE.BufferGeometry(), em = new THREE.LineBasicMaterial({ color: '#B9B4A8', transparent: true, opacity: lc ? 0.8 : 0.45 });
      const edges = new THREE.LineSegments(eg, em); edges.layers.set(1); edges.userData.noFit = true; S.add(edges);
      const t = noText, c = noText;
      return { lc, im, eg, edges, t, c };
    });
    /* marks for the search: path nodes, visited, found, missed, the question */
    const MK = 400, mk = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MK); mk.frustumCulled = false; mk.userData.noFit = true; mk.layers.set(1); S.add(mk);
    const segs = Array.from({ length: 60 }, () => { const b = P.box(1, 0.012, 0.012, SAF, { r: 0 }); b.userData.noFit = true; b.visible = false; S.add(b); return b; });
    /* results: recall (true closest found) and how many points were compared, out of all 2,000 */
    const recall = P.tower(0.55, 0.55, GOOD, { size: 0.26 }), comps = P.tower(0.55, 0.55, '#8E91A3', { size: 0.26 });
    recall.position.set(1.75, 0, 0.55); comps.position.set(2.45, 0, 0.55); S.add(recall, comps);
    const drop = P.ball(0.07, RED); drop.userData.noFit = true; S.add(drop);
    S.add(P.keep(-1.9, 2.8, 1.9, -1.2, 1.2));
    const rT = noText, aBig = noText, aT = noText;
    let G = null, gKey = '', A = null, Sr = null, qi = 0, clock = 0, DEF = null;
    const built = {}, getG = (m, flat) => built[`${m}${flat}`] || (built[`${m}${flat}`] = build(MS[m], flat));
    const pct = v => `${Math.round(v * 100)}%`;
    function graph() {
      const key = `${st.m}${st.flat}`; if (key === gKey) return; gKey = key;
      G = getG(st.m, st.flat);
      panels.forEach(pn => {
        let k = 0; const pos = [];
        for (let i = 0; i < NP; i++) {
          const on = G.lev[i] >= pn.lc, p = at(panels.indexOf(pn), PTS[i]);
          dummy.position.copy(p); dummy.scale.set(on ? (pn.lc ? 0.03 : 0.016) : 0, on ? 0.012 : 0, on ? (pn.lc ? 0.03 : 0.016) : 0); dummy.updateMatrix(); pn.im.setMatrixAt(i, dummy.matrix);
          pn.im.setColorAt(i, col.set(pn.lc ? '#6E6A62' : '#A9A497'));
          if (on) for (const j of G.nb[pn.lc][i]) if (j > i || !G.nb[pn.lc][j].includes(i)) { const b = at(panels.indexOf(pn), PTS[j]); pos.push(p.x, p.y + 0.002, p.z, b.x, b.y + 0.002, b.z); k++; }
        }
        pn.im.instanceMatrix.needsUpdate = true; pn.im.instanceColor.needsUpdate = true;
        pn.eg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pn.eg.computeBoundingSphere();
      });
    }
    function marks() {
      const stage = Math.min(3, clock / 0.8), q = QS[qi], T = TRUTH[qi];
      let n = 0; const put = (L, p, s, c, y = 0.15) => { if (n >= MK) return; dummy.position.copy(at(L, p, y)); dummy.scale.set(s, 0.02, s); dummy.updateMatrix(); mk.setMatrixAt(n, dummy.matrix); mk.setColorAt(n, col.set(c)); n++; };
      let si = 0; const seg = (L, a, b) => { if (si >= segs.length) return; const A2 = at(L, a, 0.16), B2 = at(L, b, 0.16), dx = B2.x - A2.x, dz = B2.z - A2.z, len = Math.hypot(dx, dz); const s = segs[si++]; s.visible = true; s.position.set((A2.x + B2.x) / 2, 0.16, (A2.z + B2.z) / 2); s.rotation.set(0, -Math.atan2(dz, dx), 0); s.scale.set(Math.max(0.001, len), 1, 1); };
      [2, 1].forEach((lc, L) => {
        const path = Sr.paths[lc], show = stage > L;
        if (!show || !path.length) return;
        const upto = Math.min(path.length, 1 + Math.floor((stage - L) * path.length * 1.5));
        for (let h = 0; h < upto; h++) { put(L, PTS[path[h]], h === 0 ? 0.06 : 0.045, h === upto - 1 ? SAF : CHAR, 0.152); if (h) seg(L, PTS[path[h - 1]], PTS[path[h]]); }
      });
      if (stage > 2) {
        const got = new Set(Sr.got);
        for (const j of Sr.seen) put(2, PTS[j], 0.022, SAF, 0.148);
        put(2, PTS[Sr.e0], 0.05, CHAR, 0.152);
        for (const j of T) put(2, PTS[j], 0.04, got.has(j) ? GOOD : BAD, 0.156);
      }
      [0, 1, 2].forEach(L => put(L, q, 0.07, RED, 0.158));
      for (let j = n; j < MK; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mk.setMatrixAt(j, dummy.matrix); }
      for (let j = si; j < segs.length; j++) segs[j].visible = false;
      mk.instanceMatrix.needsUpdate = true; mk.instanceColor.needsUpdate = true;
    }
    function ask() {
      Sr = search(G, QS[qi], EFS[st.ef]); clock = 0;
      const found = Sr.got.filter(x => TRUTH[qi].includes(x)).length;
      const cnt = [2, 1, 0].map(lc => G.lev.filter(l => l >= lc).length);
      panels.forEach((pn, L) => {
        const empty = st.flat && pn.lc > 0;
        pn.t.userData.set(empty ? `Layer ${pn.lc}: empty` : pn.lc ? `Layer ${pn.lc}: ${cnt[L].toLocaleString('en')} points, long links` : `Layer 0: all ${NP.toLocaleString('en')} points`, empty ? '#9E9B92' : CHAR);
        pn.c.userData.set(empty ? 'One layer only: no shortcuts' : pn.lc ? `${Math.max(0, Sr.paths[pn.lc].length - 1)} ${Sr.paths[pn.lc].length === 2 ? 'hop' : 'hops'} towards the question` : `Beam of ${EFS[st.ef]}: ${Sr.seen.size} points looked at`);
      });
      rT.userData.set(`Found ${found} of the true 5 closest\nCompared with ${Sr.n} of ${NP.toLocaleString('en')}`, found === K ? GOOD : RED);
      marks();
    }
    function draw() {
      graph(); A = measure(G, EFS[st.ef]);
      recall.userData.set({ h: 0.05 + A.recall * 1.5, cap: pct(A.recall), color: A.recall >= 0.95 ? GOOD : A.recall < 0.8 ? BAD : SAF }); comps.userData.set({ h: 0.05 + Math.min(1, A.n / NP) * 1.5, cap: `${Math.round(A.n)}` });
      
      ask();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      recall.userData.tick(dt); comps.userData.tick(dt);
      const q = QS[qi], k = Math.min(2, clock / 0.8), L = Math.min(2, Math.floor(k)), f = k - L;
      const a0 = at(L, q, 0.3), a1 = at(Math.min(2, L + 1), q, 0.3); drop.position.copy(a0.lerp(a1, L < 2 ? f : 0));
      if (clock > 3.2) { qi = (qi + 1) % NQ; ask(); return; }
      clock += dt; marks();
    };
    const controls = [
      { type: 'buttons', label: 'Links per point (M)', options: MS.map(String), get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Search beam (ef)', options: EFS.map(String), get: () => st.ef, act: i => set({ ef: i }) },
      { type: 'toggle', label: 'One layer only', get: () => st.flat, set: v => set({ flat: !!v }) },
      { type: 'button', label: 'New question', act: () => { qi = (qi + 1) % NQ; ask(); } },
    ];
    const readouts = [
      { label: 'Recall', get: () => ({ v: pct(A.recall), sub: 'true 5 closest found', good: A.recall >= 0.95, bad: A.recall < 0.8 }) },
      { label: 'Comparisons', get: () => ({ v: `${Math.round(A.n)}`, sub: `per question, of ${NP.toLocaleString('en')}` }) },
      { label: 'Links stored', get: () => ({ v: `${(G.nb.reduce((a, l) => a + l.reduce((b, x) => b + x.length, 0), 0) / 1000).toFixed(1)}K`, sub: 'graph memory' }) },
    ];
    const labels = [
      { name: 'top', t: 'Sparse top layer', d: 'A few points, long jumps', icon: 'layers', atV: V(-1.75, 1.7, -0.6) },
      { name: 'bottom', t: 'Layer 0: all 2,000', d: 'A narrow beam finds the closest five', icon: 'layers', atV: V(-1.75, 0.2, 0.6) },
      { name: 'recall', t: 'Recall', d: 'Share of the true five closest found', icon: 'target', atV: V(1.75, 0.05, 0.85) },
      { name: 'comps', t: 'Comparisons', d: 'Points measured, out of 2,000', icon: 'gauge', atV: V(2.75, 0.05, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Too few links', hint: 'M = 2', on: () => set({ ...D0, m: 0 }), off: reset },
      { label: 'Beam too narrow', hint: 'ef = 5, just the 5 wanted', on: () => set({ ...D0, ef: 0 }), off: reset },
      { label: 'One flat layer', hint: 'no sparse layers on top', on: () => set({ ...D0, flat: true }), off: reset },
    ];
    function status() {
      const def = DEF || (DEF = measure(getG(D0.m, false), EFS[D0.ef]));
      if (st.m === 0) return { ok: false, msg: `<b>Two links per point: recall falls to ${pct(A.recall)}.</b> With so few links the graph breaks into islands, and a greedy walk that lands on the wrong island can never reach the true neighbours, however wide the beam. With ${MS[D0.m]} links: ${pct(def.recall)}. More links cost memory and build time.` };
      if (st.ef === 0 && A.recall < 0.95) return { ok: false, msg: `<b>A beam of 5 for 5 results: recall ${pct(A.recall)}.</b> The search keeps only the 5 best points seen so far, so it stops at the first good-enough patch and misses closer points one link away. A beam of ${EFS[D0.ef]} reaches ${pct(def.recall)} for ${Math.round(def.n - A.n)} more comparisons.` };
      if (st.flat) { const lay = measure(getG(st.m, false), EFS[st.ef]); return { ok: false, msg: `<b>One flat layer: ${Math.round(A.n)} comparisons a question, against ${Math.round(lay.n)} with layers.</b> Without sparse layers the search starts at a fixed point and has to walk across the whole map in short steps. The upper layers are motorways: long jumps first, local roads at the end. The gap grows with the collection, because layered search grows with the logarithm of its size.` }; }
      return { ok: A.recall >= 0.95 ? true : undefined, msg: `<b>Recall ${pct(A.recall)} with ${Math.round(A.n)} comparisons a question, ${(NP / A.n).toFixed(0)}× fewer than checking all ${NP.toLocaleString('en')}.</b> The search hops across the sparse layers, drops to the full map near the question, and explores a beam of ${EFS[st.ef]} candidates there.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Questions as points', home: true, say: 'A farmers\' helpline in Lilongwe keeps two thousand answered questions as vectors: points where similar meanings sit close together. For each new question, it wants the five closest.', act: m => m.set({ m: 1, ef: 2, flat: false }) },
    { t: 'Start at the top', home: true, say: 'Checking all two thousand is exact but slow. HNSW starts on a sparse top layer, a few points with long links, and hops towards the question.', act: m => m.set({ m: 1 }) },
    { t: 'Drop down, then search a beam', home: true, say: 'It drops down a layer, hops again, then on the full map it explores a beam of candidates around the landing point. The true five are found after about a hundred comparisons.', act: m => m.set({ ef: 2 }) },
    { t: 'Too few links', home: true, say: 'With only two links per point, the graph falls apart into islands. A walk that lands on the wrong one never reaches the true neighbours.', act: m => m.set({ m: 0 }) },
    { t: 'Beam too narrow', home: true, say: 'A beam of five, just the five wanted, stops at the first good-enough patch and misses closer points one link away.', act: m => m.set({ m: 1, ef: 0 }) },
    { t: 'Why the layers', home: true, say: 'Flatten it to one layer, and every search walks across the map in short steps. The sparse layers are the motorways, and they matter more as the collection grows.', act: m => m.set({ ef: 2, flat: true }) },
  ],
  check: [
    { q: 'What does recall measure for a vector index?', options: ['The share of the true nearest vectors the search found', 'How fast the index was built', 'How long the vectors are'], answer: 0, why: 'An approximate index may miss some true neighbours; recall counts how many it got.', hint: 'Watch Recall as you change the beam.' },
    { q: 'Why does HNSW have sparse layers above the full map?', options: ['Long jumps get near the question quickly, so fewer comparisons are needed', 'They store bigger vectors', 'They make results exact'], answer: 0, why: 'Like taking a motorway before local roads.', hint: 'Try One layer only.' },
    { q: 'When does cosine similarity rank the same as the dot product?', options: ['When every vector has length one', 'Never', 'Only for short texts'], answer: 0, why: 'Cosine is the dot product divided by both lengths; with unit vectors that division does nothing.', hint: 'Read the overview.' },
  ],
  terms: [
    ['Embedding', 'A vector for a piece of text, placed so that similar meanings sit close together.'],
    ['Cosine similarity', 'How closely two vectors point the same way, ignoring their lengths.'],
    ['Approximate nearest neighbour', 'Finding nearly the closest vectors fast, instead of exactly the closest slowly.'],
    ['HNSW', 'Hierarchical navigable small world: a layered graph of links that searches hop through.'],
    ['M', 'How many links each vector keeps in the graph.'],
    ['ef', 'How many candidates the final search keeps in its beam.'],
    ['Recall', 'The share of the true nearest neighbours a search returns.'],
  ],
  deeper: '<p><b>Choosing a metric.</b> Cosine similarity suits most text search because it ignores length. Many embedding models already return unit-length vectors, so a dot product gives the same ranking for less work. Straight-line distance suits clustering and places where position itself matters.</p><p><b>Shrinking vectors.</b> Matryoshka-trained models let you cut a vector to its first few hundred numbers for a small loss. Binary quantisation keeps only the sign of each number, 32 times smaller, compared by counting differing bits; rescoring the top few hundred with full vectors recovers most of the accuracy.</p><p><b>Bi-encoders and cross-encoders.</b> The index works because questions and documents are embedded separately and compared cheaply. A cross-encoder reads a question and a document together, which is more accurate and far slower, so it reranks a short list the index returns.</p><p><b>About this machine.</b> The HNSW index is real and rebuilt when you change M, but the vectors have two numbers so they fit on a map. With hundreds of numbers, neighbourhoods are harder to walk and recall drops sooner, which is why ef and M are tuned on your own data.</p>',
  code: {
    title: 'A vector index in a few lines',
    note: 'Adapted from the course\'s embeddings lesson; hnswlib is one open-source HNSW library.',
    text: `
import numpy as np
import hnswlib

vectors = embed(passages)                     # shape (n, dim), unit length
index = hnswlib.Index(space="cosine", dim=vectors.shape[1])
index.init_index(max_elements=len(vectors), M=16, ef_construction=200)
index.add_items(vectors)

index.set_ef(64)                              # beam width at search time
labels, distances = index.knn_query(embed([question]), k=5)

# check recall against brute force on a sample
exact = np.argsort(-(vectors @ embed([question])[0]))[:5]
recall = len(set(labels[0]) & set(exact)) / 5
`,
  },
};
