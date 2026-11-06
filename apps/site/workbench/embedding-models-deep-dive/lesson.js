// Embedding models: an archive in Accra searches 80 documents by embedding. Each embedding here has 32 numbers (real models use 1,024 or more).
// A Matryoshka-trained model packs the most meaning into the first numbers, so the vector can be cut short; a plain model spreads it evenly.
// Vectors are generated with a fixed seed; recall@1 over 80 queries, worded differently from their documents, is computed live for every cut.
// Break it: cut to 4 numbers (recall collapses), cut a model not trained for it (it falls at 8), query with a different model than the index (vectors live in different spaces).
const D = 32, N = 80, NOISE = 0.3, CUTS = [32, 16, 8, 4, 2];
function world() {
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const scale = s => { const e = Math.sqrt(s.reduce((a, x) => a + x * x, 0)); return s.map(x => x / e * Math.sqrt(D) * 0.35); };
  const sig = { mat: scale([...Array(D)].map((_, d) => Math.exp(-d / 7))), flat: scale([...Array(D)].map(() => 1)) };
  const out = {};
  for (const k of ['mat', 'flat']) { const docs = [...Array(N)].map(() => sig[k].map(s => s * g())); out[k] = { docs, qs: docs.map(v => v.map(x => x + NOISE * g())) }; }
  out.perm = [...Array(D).keys()].map(i => [rnd(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);   // a different model: the same text lands on different axes
  return out;
}
const cos = (a, b, n) => { let d = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / Math.sqrt(x * y); };

export default {
  slug: 'embedding-models-deep-dive',
  title: 'Embeddings: how short can they be?',
  description: 'An archive in Accra searches eighty documents by embedding. A Matryoshka-trained model can be cut short and still find the right document; a plain one cannot. Then cut too far, cut the wrong kind of model, or query with a different model from the one that built the index.',
  overview: 'An embedding model turns text into a vector so that similar meanings sit close together. Dense models give one vector per passage; sparse models give a weight for each vocabulary word, like learned keyword search; multi-vector models keep one vector per token and compare them all, which is slower and more precise. Vectors cost storage and search time, so Matryoshka training packs the most important information into the first numbers: a long vector can be cut to a quarter of its length for a small loss, though cutting too far collapses recall, and a model not trained this way loses far more. The query and the documents must come from the same model, used the same way, with any required prefix: vectors from two models live in different spaces. Leaderboards help, but test on your own data.',
  keywords: ['embedding models', 'matryoshka embeddings', 'dense sparse multi-vector', 'recall', 'vector storage', 'mteb'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.05, 0.38, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { cut: 1, model: 'mat', other: false, q: 3 };
    const ink = '#151827', Wd = world();
    const recall = (k, n, other) => { const { docs, qs } = Wd[k]; let hit = 0; qs.forEach((q0, i) => { const q = other ? Wd.perm.map(j => q0[j]) : q0; let bi = 0, bv = -2; docs.forEach((d, j) => { const c = cos(q, d, n); if (c > bv) { bv = c; bi = j; } }); if (bi === i) hit++; }); return hit / N; };
    const TABLE = {}; ['mat', 'flat'].forEach(k => { TABLE[k] = CUTS.map(n => recall(k, n, false)); });
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const board = (x, w, title) => { const b = P.box(w, 1.65, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); b.position.set(x, 0.4, -0.7); S.add(b);
      [-w / 2 + 0.15, w / 2 - 0.15].forEach(dx => { const p = P.cyl(0.03, 0.28, '#8A8578'); p.position.set(x + dx, 0.12, -0.7); S.add(p); });
      const t = S.text(title, { size: 0.12, weight: 800, face: 'front', color: ink, maxW: w - 0.2 }); t.position.set(x, 1.88, -0.665); S.add(t); return t; };
    /* the vectors: query on top, its best match below */
    const VX = -1.55, vt = board(VX, 3.3, '');
    const bx = d => VX - 1.47 + d * 0.095;
    const mkRow = (y0, name) => { const n = S.text(name, { size: 0.085, weight: 800, face: 'front', color: '#5A5A66', align: 'left' }); n.position.set(VX - 1.35, y0 + 0.28, -0.665); S.add(n);
      const axis = P.box(3.1, 0.012, 0.02, '#8A8578', { r: 0.004 }); axis.position.set(VX, y0, -0.665); axis.layers.set(1); S.add(axis);
      return [...Array(D)].map((_, d) => { const mm = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(0.07, 1, 0.04, C.teal, { r: 0.005, material: mm }); b.position.set(bx(d), y0, -0.65); b.userData.noFit = true; S.add(b); return { b, mm, y0 }; }); };
    const qRow = mkRow(1.45, 'Query'), dRow = mkRow(0.95, 'Best match');
    const cutM = P.box(0.03, 1.05, 0.06, '#D64545', { r: 0.01 }); cutM.userData.noFit = true; S.add(cutM);
    const mT = S.text('', { size: 0.085, weight: 800, face: 'front', color: ink, maxW: 3 }); mT.position.set(VX, 0.56, -0.665); S.add(mT);
    /* recall for every cut, both models */
    const RX = 1.85; board(RX, 2.6, 'Recall@1 by length');
    const RH = 1.0, ry = 0.62;
    const rc = CUTS.map((n, i) => { const x = RX - 1.0 + i * 0.5;
      const pair = ['mat', 'flat'].map((k, j) => { const col = j ? '#B9A88F' : '#3B3F8F', mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(0.17, 1, 0.08, col, { r: 0.01, material: mm }); b.position.set(x - 0.095 + j * 0.19, ry, -0.64); S.add(b); b.scale.y = Math.max(0.01, TABLE[k][i] * RH); return { b, mm, col }; });
      const lab = S.text(String(n), { size: 0.09, weight: 800, face: 'front', color: ink }); lab.position.set(x, ry - 0.09, -0.665); S.add(lab);
      return { pair, x }; });
    const leg = S.text('dark: Matryoshka · light: plain', { size: 0.075, weight: 700, face: 'front', color: '#5A5A66' }); leg.position.set(RX, ry - 0.22, -0.665); S.add(leg);
    const ring = P.box(0.46, 0.04, 0.12, '#F2C94C', { r: 0.02 }); ring.userData.noFit = true; S.add(ring);

    let R = 0, M = null;
    function draw() {
      const n = CUTS[st.cut], { docs, qs } = Wd[st.model];
      const q = st.other ? Wd.perm.map(j => qs[st.q][j]) : qs[st.q];
      let bi = 0, bv = -2; docs.forEach((d, j) => { const c = cos(q, d, n); if (c > bv) { bv = c; bi = j; } });
      M = { bi, bv, right: bi === st.q };
      const fill = (row, v) => { const mx = Math.max(...v.map(Math.abs)); row.forEach((r, d) => { const h = Math.max(0.006, Math.abs(v[d]) / mx * 0.22); r.b.scale.y = h; r.b.position.y = v[d] >= 0 ? r.y0 : r.y0 - h; r.mm.color.set(d < n ? (row === dRow && !M.right ? '#D64545' : C.teal) : '#D9D4C8'); }); };
      fill(qRow, q); fill(dRow, docs[bi]);
      cutM.position.set(bx(n) - 0.0475, 0.68, -0.63); cutM.visible = n < D;
      vt.userData.set(`One vector, ${D} numbers: keep the first ${n}`);
      mT.userData.set(`Best match: document ${bi + 1} (cosine ${bv.toFixed(2)}) · ${M.right ? 'the right one' : `wrong: query came from document ${st.q + 1}`}`);
      R = recall(st.model, n, st.other);
      rc.forEach((c, i) => c.pair.forEach((p, j) => p.mm.color.set(i === st.cut && (j ? 'flat' : 'mat') === st.model ? C.orange : p.col)));
      ring.position.set(rc[st.cut].x - 0.095 + (st.model === 'flat' ? 0.19 : 0), ry - 0.02, -0.6);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Numbers kept', options: CUTS.map(String), get: () => st.cut, act: i => { st.cut = i; draw(); } },
      { type: 'buttons', label: 'Model', options: ['Matryoshka', 'Plain'], get: () => (st.model === 'mat' ? 0 : 1), act: i => { st.model = i ? 'flat' : 'mat'; draw(); } },
      { type: 'toggle', label: 'Queries from a different model', short: 'other model', get: () => st.other, set: v => { st.other = v; draw(); } },
      { type: 'button', label: 'Another query', act: () => { st.q = (st.q + 7) % N; draw(); } },
    ];
    const readouts = [
      { label: 'Recall@1', get: () => ({ v: `${Math.round(R * 100)}%`, sub: 'over 80 queries', good: R >= 0.95, bad: R < 0.8 }) },
      { label: 'Storage', get: () => ({ v: `${CUTS[st.cut] * 4} bytes`, sub: `${Math.round(CUTS[st.cut] / D * 100)}% of full, per vector` }) },
      { label: 'This query', get: () => ({ v: M.right ? 'found' : 'missed', good: M.right, bad: !M.right }) },
    ];
    const labels = [
      { name: 'vec', t: 'Query and best match', d: 'Grey numbers are cut off', icon: 'wave', atV: V(VX - 1.65, 1.0, -0.7) },
      { name: 'chart', t: 'Recall by length', d: 'Gold: the current setting', icon: 'scale', atV: V(RX + 1.3, 1.0, -0.7) },
    ];
    const reset = () => { Object.assign(st, { cut: 1, model: 'mat', other: false, q: 3 }); draw(); };
    const breaks = [
      { label: 'Cut to 4 numbers', hint: 'An eighth of the vector', on: () => { reset(); st.cut = 3; draw(); }, off: reset },
      { label: 'Cut a plain model', hint: 'Not trained for it', on: () => { reset(); st.model = 'flat'; st.cut = 2; draw(); }, off: reset },
      { label: 'Different query model', hint: 'Index built with another', on: () => { reset(); st.other = true; draw(); }, off: reset },
    ];
    function status() {
      const n = CUTS[st.cut], p = Math.round(R * 100);
      if (st.other) return { ok: false, msg: `<b>Two models, two spaces.</b> The index was built with one model and the queries come from another, so the same meaning lands on different axes. Recall@1 is ${p}%: chance is about 1 in ${N}. Re-embed the documents whenever the model changes, and use the model's query prefix if it has one.` };
      if (st.model === 'flat' && n < D) return { ok: false, msg: `<b>Cut a model not trained for it.</b> A plain model spreads meaning evenly across all ${D} numbers, so keeping ${n} throws away ${Math.round((1 - n / D) * 100)}% of it: recall@1 ${p}%, against ${Math.round(TABLE.mat[st.cut] * 100)}% for a Matryoshka model cut the same way. Only cut vectors from models trained to be cut.` };
      if (R < 0.8) return { ok: false, msg: `<b>Cut too far.</b> Even a Matryoshka model cannot squeeze eighty documents into ${n} numbers: recall@1 falls to ${p}%, from ${Math.round(TABLE.mat[1] * 100)}% at 16. Storage is only ${n * 4} bytes a vector, but ${100 - p} searches in 100 now miss. Test each length on your own queries before you choose.` };
      return { ok: true, msg: `<b>${n} of ${D} numbers, recall@1 ${p}%.</b> ${st.model === 'mat' && n < D ? `The Matryoshka model keeps its most important information first, so ${Math.round(n / D * 100)}% of the storage still finds ${p}% (${Math.round(TABLE.mat[0] * 100)}% at full length).` : 'The full vector finds the right document almost every time.'} Real models do the same with 1,024 or more numbers.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Search by meaning', home: true, say: 'An archive in Accra searches eighty documents by embedding. A query is worded differently from its document, but should still land closest to it.', act: m => m.set({ cut: 0, model: 'mat', other: false }) },
    { t: 'Storage costs', home: true, say: 'Every number in every vector costs storage and search time. Could the vectors be shorter?', act: m => m.set({ cut: 0 }) },
    { t: 'Matryoshka', home: true, say: 'A Matryoshka model packs the most meaning into the first numbers. Keep half, and recall barely moves.', act: m => m.set({ cut: 1 }) },
    { t: 'Too short', home: true, say: 'Keep only four numbers, and recall collapses. There is a floor, and it depends on your data.', act: m => m.set({ cut: 3 }) },
    { t: 'Plain models', home: true, say: 'A model not trained this way spreads meaning evenly. Cut it to eight, and it misses far more often.', act: m => m.set({ cut: 2, model: 'flat' }) },
    { t: 'Same model', home: true, say: 'Query with a different model from the one that built the index, and the vectors live in different spaces. Almost nothing is found.', act: m => m.set({ cut: 1, model: 'mat', other: true }) },
  ],
  check: [
    { q: 'What makes a Matryoshka embedding safe to shorten?', options: ['It is trained so the first numbers carry the most meaning', 'It has fewer numbers to begin with', 'It uses no numbers at all'], answer: 0, why: 'Its prefixes work as smaller embeddings.' },
    { q: 'Why must queries and documents use the same embedding model?', options: ['Different models put the same meaning in different places', 'It is faster to type', 'Documents are longer'], answer: 0, why: 'Their vectors are not comparable.' },
    { q: 'How should you choose how far to cut?', options: ['Measure recall on your own queries at each length', 'Always keep four numbers', 'Pick the top leaderboard model'], answer: 0, why: 'The floor depends on your data.' },
  ],
  terms: [
    ['Embedding', 'A vector that places similar meanings close together.'],
    ['Dense embedding', 'One vector for a whole passage.'],
    ['Sparse embedding', 'A learned weight for each vocabulary word.'],
    ['Multi-vector', 'One vector per token, compared token by token.'],
    ['Matryoshka', 'Training so a vector\'s first numbers stand alone.'],
    ['Recall@1', 'How often the right document is ranked first.'],
  ],
  deeper: '<p><b>Three kinds.</b> Dense vectors for a fast first search, sparse vectors to catch exact names and codes, and multi-vector or reranking models for precision on the top results. Some models produce all three at once.</p><p><b>Choosing a model.</b> Public benchmarks average many tasks in mostly European languages. An archive of Ghanaian newspapers or Twi radio transcripts needs its own test set of real queries.</p><p><b>About this machine.</b> The vectors are generated with a fixed seed: the Matryoshka model\'s numbers shrink in importance from first to last, the plain model\'s are all equal. Recall is computed live over all eighty queries.</p>',
  code: {
    title: 'Cutting Matryoshka embeddings',
    note: 'Adapted from the course\'s embedding models lesson.',
    text: `
import numpy as np

def truncate(vectors, n):
    v = vectors[:, :n]                          # keep the first n numbers
    return v / np.linalg.norm(v, axis=1, keepdims=True)

def recall_at_1(queries, docs, n):
    q, d = truncate(queries, n), truncate(docs, n)
    best = (q @ d.T).argmax(axis=1)
    return (best == np.arange(len(q))).mean()

for n in [1024, 512, 256, 128, 64]:
    print(n, recall_at_1(Q, D, n))
`,
  },
};
