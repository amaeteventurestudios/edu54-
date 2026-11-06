// ColPali: a farmer-support line in Arusha searches an illustrated extension manual. The answer, how to space maize and beans when intercropping, is in a diagram.
// Pages are 4x4 grids of patch vectors (8 dimensions: maize, beans, spacing, rows, soil, water, pests and blank paper); the query is four token vectors.
// Scores are computed for real: MaxSim (sum over query tokens of the best patch), average over patches, one pooled vector per page, or text-only chunks.
// Storage uses the course's figures: 729 patches of 128 floats per page for ColPali, one 768-float vector per page or chunk otherwise, PQ dividing by 8.
// Break it: text chunks (the diagram has no text), averaging instead of max, one vector per page.
const DIM = 8, QTOK = [['maize', 0], ['beans', 1], ['spacing', 2], ['rows', 3]];
const CC = ['#E0A526', '#9C3D2E', '#3A6FB0', '#1F9E89', '#5B4636', '#7FB7E0', '#C62828', '#F4F1EA'];
/* each page: title, 16 patch concepts (7 = blank paper), and which patches are printed text */
const PAGES = [
  { t: 'Soil and planting', c: [4, 4, 4, 5, 4, 4, 5, 7, 4, 4, 5, 0, 7, 7, 7, 7], text: 'all' },
  { t: 'Maize and beans', c: [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 7, 1, 0, 7, 7, 7], text: 'all' },
  { t: 'Field layout', c: [7, 7, 7, 7, 7, 2, 0, 7, 7, 3, 1, 7, 7, 7, 7, 7], text: [0, 1] },
  { t: 'Fall armyworm', c: [6, 6, 0, 6, 6, 0, 6, 0, 6, 7, 6, 7, 7, 7, 7, 7], text: 'all' },
  { t: 'Watering', c: [5, 5, 5, 7, 5, 5, 4, 7, 5, 5, 7, 7, 7, 7, 7, 7], text: 'all' },
  { t: 'Storage', c: [7, 4, 7, 7, 0, 7, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7], text: 'all' },
];
const noise = (p, j, d) => (Math.sin(p * 97.1 + j * 13.7 + d * 5.3) * 0.5) * 0.12;
const vec = (k, p, j) => Array.from({ length: DIM }, (_, d) => (d === k ? 1 : 0) + noise(p, j, d));
const norm = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const isText = (pg, j) => pg.text === 'all' || pg.text.includes(j);
function score(st) {
  const Q = QTOK.map(([, k], i) => norm(vec(k, 99, i)));
  return PAGES.map((pg, p) => { const P = pg.c.map((k, j) => norm(vec(k, p, j)));
    if (st.mode === 'text') { const T = P.filter((_, j) => isText(pg, j)); return { s: Q.reduce((a, q) => a + Math.max(...T.map(x => cos(q, x))), 0), best: null }; }
    if (st.mode === 'one') { const pool = norm(P.reduce((a, v) => a.map((x, i) => x + v[i]), Array(DIM).fill(0))), qv = norm(Q.reduce((a, v) => a.map((x, i) => x + v[i]), Array(DIM).fill(0))); return { s: cos(pool, qv) * 4, best: null }; }
    if (st.avg) return { s: Q.reduce((a, q) => a + P.reduce((b, x) => b + cos(q, x), 0) / P.length, 0) * 4, best: null };
    const best = Q.map(q => { let bj = 0, bv = -9; P.forEach((x, j) => { const c = cos(q, x); if (c > bv) { bv = c; bj = j; } }); return [bj, bv]; });
    return { s: best.reduce((a, b) => a + b[1], 0), best: best.map(b => b[0]) }; });
}
function storage(st) {
  const n = st.big ? 20000 : 50, per = st.mode === 'col' ? 729 * 128 * 4 : 768 * 4, raw = n * per;
  return st.pq ? raw / 8 : raw;
}
const human = b => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`);

export default {
  slug: 'colpali-vision-native-rag',
  title: 'ColPali: search the page itself',
  description: 'A farmer-support line in Arusha searches an illustrated extension manual for how to space maize and beans when intercropping. The answer is in a diagram. ColPali searches the page images patch by patch with MaxSim. Then search the text only, average the patches, or squeeze each page into one vector.',
  overview: 'Text retrieval augmented generation runs OCR, chunks the text and embeds each chunk, so whatever is only in a figure, a chart or the layout is lost. ColPali skips OCR. A vision-language model encodes every page image into one vector per patch, about 729 of them, and encodes the query into one vector per token. The score borrows ColBERT\'s late interaction, MaxSim: for each query token, find its best-matching patch on the page, and add up those best matches. A diagram in one corner of a mostly blank page can win, because each query token only needs one good patch. Averaging over all patches, or pooling each page into a single vector as VisRAG does, lets blank paper and unrelated text dilute the signal; it is cheaper but recalls less. The price of ColPali is storage: hundreds of vectors per page, roughly a hundred times a text index, brought down about eight times with product quantisation. On the ViDoRe benchmark ColPali reaches about 80% nDCG@5 against 50 to 60% for text retrieval. The retrieved page images then go straight to a vision-language model to answer.',
  keywords: ['colpali', 'maxsim', 'late interaction', 'visual document retrieval', 'colbert', 'vidore'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { mode: 'col', avg: false, pq: true, big: false };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* query tokens on the left */
    const qT = S.text('Query tokens', { size: 0.11, weight: 800, color: ink }); qT.position.set(-2.35, 0.13, -0.95); S.add(qT);
    const qCubes = QTOK.map(([w, k], i) => { const b = P.box(0.7, 0.18, 0.3, CC[k], { r: 0.04 }); b.position.set(-2.35, 0.12, -0.55 + i * 0.42); S.add(b);
      const t = S.text(w, { size: 0.12, weight: 800, color: '#FFFFFF' }); t.position.set(-2.35, 0.31, -0.55 + i * 0.42); S.add(t); return b; });
    /* six pages */
    const PW = 0.82, CELL = PW / 4, px = i => -1.05 + (i % 3) * 1.25, pz = i => -0.62 + Math.floor(i / 3) * 1.15;
    const pages = PAGES.map((pg, i) => { const g = new THREE.Group(); g.position.set(px(i), 0.12, pz(i)); S.add(g);
      const sh = P.box(PW + 0.08, 0.03, PW + 0.08, '#FFFFFF', { r: 0.02 }); g.add(sh);
      const cells = pg.c.map((k, j) => { const mm = new THREE.MeshLambertMaterial({ color: CC[k] }), b = P.box(CELL * 0.9, 0.04, CELL * 0.9, '#fff', { material: mm }); b.position.set(-PW / 2 + (j % 4 + 0.5) * CELL, 0.03, -PW / 2 + (Math.floor(j / 4) + 0.5) * CELL); g.add(b); return { b, mm, k }; });
      const t = S.text(pg.t, { size: 0.1, weight: 800, color: ink, maxW: 0.95 }); t.position.set(0, 0.01, PW / 2 + 0.13); g.add(t);
      const bar = P.box(0.09, 1, 0.09, '#6B5E86', { r: 0.01 }); bar.position.set(PW / 2 + 0.12, 0.03, PW / 2 - 0.05); bar.userData.noFit = true; g.add(bar);
      const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PW + 0.16, 0.001, PW + 0.16)), new THREE.LineBasicMaterial({ color: '#E0A526' })); ring.position.y = 0.06; ring.layers.set(1); g.add(ring);
      return { g, cells, bar, ring }; });
    const lines = QTOK.map(() => { const l = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.012, '#151827'); l.layers.set(1); l.userData.noFit = true; S.add(l); return l; });
    /* answer card at the front */
    const card = P.box(4.6, 0.05, 0.42, '#FBF8F1', { r: 0.03 }); card.position.set(0.3, 0.12, 1.4); S.add(card);
    const ans = S.text('', { size: 0.13, weight: 800, color: ink, maxW: 4.5 }); ans.position.set(0.3, 0.18, 1.4); S.add(ans);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null, top = 0;
    function draw() {
      R = score(st); const mx = Math.max(...R.map(r => r.s)), mn = Math.min(...R.map(r => r.s)); top = R.findIndex(r => r.s === mx);
      pages.forEach((pg, i) => { const h = 0.05 + (R[i].s - mn) / ((mx - mn) || 1) * 0.5; pg.bar.scale.y = h; pg.bar.position.y = 0.03 + h / 2;
        pg.bar.material.color.set(i === top ? '#E0A526' : '#9A94AE'); pg.ring.visible = i === top; pg.g.position.y = i === top ? 0.17 : 0.12;
        pg.cells.forEach((c, j) => { const hidden = st.mode === 'text' && !isText(PAGES[i], j); c.mm.color.set(hidden ? '#D6D2CA' : CC[c.k]); }); });
      lines.forEach((l, i) => { const b = R[top].best; l.visible = !!b; if (!b) return; const j = b[i], pg = pages[top].g;
        const a = qCubes[i].position.clone().add(V(0.35, 0.18, 0)), e = V(pg.position.x - PW / 2 + (j % 4 + 0.5) * CELL, pg.position.y + 0.1, pg.position.z - PW / 2 + (Math.floor(j / 4) + 0.5) * CELL);
        const mid = a.clone().lerp(e, 0.5).add(V(0, 0.35, 0)); l.geometry.dispose(); l.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, e), 24, 0.012, 5, false); l.material.color.set(CC[QTOK[i][1]]); });
      ans.userData.set(top === 2 ? 'Field layout page: maize rows, a bean row between, spacing from the diagram' : `Retrieved "${PAGES[top].t}": general advice, no spacing`, top === 2 ? ink : '#8A1F1F');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Retriever', options: ['Text chunks', 'One vector per page', 'Patch vectors'], get: () => ['text', 'one', 'col'].indexOf(st.mode), act: i => { st.mode = ['text', 'one', 'col'][i]; draw(); } },
      { type: 'buttons', label: 'Patch score', options: ['MaxSim', 'Average'], get: () => (st.avg ? 1 : 0), act: i => { st.avg = !!i; draw(); } },
      { type: 'buttons', label: 'Storage', options: ['Raw floats', 'PQ, 8× smaller'], get: () => (st.pq ? 1 : 0), act: i => { st.pq = !!i; draw(); } },
      { type: 'buttons', label: 'Archive', options: ['50 pages', '20,000 pages'], get: () => (st.big ? 1 : 0), act: i => { st.big = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Top page', get: () => ({ v: PAGES[top].t, sub: 'the answer is on Field layout', good: top === 2, bad: top !== 2 }) },
      { label: 'Score gap', get: () => { const s = R.map(r => r.s).sort((a, b) => b - a); return { v: (s[0] - s[1]).toFixed(2), sub: 'top page over the next' }; } },
      { label: 'Index size', get: () => ({ v: human(storage(st)), sub: st.mode === 'col' ? '729 patch vectors a page' : 'one vector a page' }) },
    ];
    const labels = [
      { name: 'q', t: 'Query tokens', d: 'Each finds its best patch', icon: 'target', atV: V(-2.72, 0.2, 0.08) },
      { name: 'pages', t: 'Page patches', d: 'Bars: page scores · gold: top', icon: 'book', atV: V(2.55, 0.2, 0.18) },
    ];
    const reset = () => { Object.assign(st, { mode: 'col', avg: false, pq: true, big: false }); draw(); };
    const breaks = [
      { label: 'Text chunks only', hint: 'OCR, then embed the text', on: () => { reset(); st.mode = 'text'; draw(); }, off: reset },
      { label: 'Average, not max', hint: 'Mean over all patches', on: () => { reset(); st.avg = true; draw(); }, off: reset },
      { label: 'One vector per page', hint: 'Pool the patches', on: () => { reset(); st.mode = 'one'; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 'text') return { ok: false, msg: `<b>It retrieves "${PAGES[top].t}".</b> Text retrieval only sees printed words, and the Field layout page is a diagram with a two-word title, so the spacing is invisible to it (grey patches). The page that merely mentions maize and beans wins. Search the page images.` };
      if (st.mode === 'one') return { ok: false, msg: `<b>Blank paper drowns the diagram.</b> Pooling all 16 patches into one vector averages the small diagram with the white space around it, so the page full of general maize-and-beans text looks closer. One vector per page is cheap (${human(storage(st))}) but recalls less.` };
      if (st.avg) return { ok: false, msg: `<b>Averaging dilutes the match.</b> Scoring each query token by its mean similarity over all patches rewards pages that mention maize and beans everywhere, not the page with the one diagram that answers the question. MaxSim lets each token pick its single best patch.` };
      return { ok: true, msg: `<b>Field layout wins by ${(() => { const s = R.map(r => r.s).sort((a, b) => b - a); return (s[0] - s[1]).toFixed(2); })()}.</b> Each query token finds its best patch in the diagram (the lines), and their sum beats every other page. The index is ${human(storage(st))}${st.pq ? ' after product quantisation' : ', raw'}${st.big ? ' for 20,000 pages' : ''}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The question', home: true, say: 'A farmer-support line in Arusha searches an illustrated manual: how should maize and beans be spaced when intercropped? The answer is in a diagram.', act: m => m.set({ mode: 'col', avg: false, pq: true, big: false }) },
    { t: 'Patches', home: true, say: 'ColPali turns each page image into many patch vectors, and the question into one vector per word.', act: m => m.set({}) },
    { t: 'MaxSim', home: true, say: 'Each query word finds its best patch on a page, and the best matches add up. The diagram page wins.', act: m => m.set({}) },
    { t: 'Text only', home: true, say: 'Search only the printed text, and the diagram is invisible. A page that just mentions maize and beans wins.', act: m => m.set({ mode: 'text' }) },
    { t: 'Average', home: true, say: 'Average over all patches instead of taking the best, and the diagram is diluted.', act: m => m.set({ mode: 'col', avg: true }) },
    { t: 'One vector', home: true, say: 'Squeeze each page into one vector, and blank paper drowns the diagram.', act: m => m.set({ avg: false, mode: 'one' }) },
  ],
  check: [
    { q: 'How does MaxSim score a page?', options: ['Each query token takes its best patch; the bests are summed', 'Average of all patches', 'Count of matching words'], answer: 0, why: 'Late interaction, as in ColBERT.' },
    { q: 'Why does text retrieval miss the answer here?', options: ['It is only in a diagram', 'The page is too long', 'The query is too short'], answer: 0, why: 'OCR sees no words to embed.' },
    { q: 'What is ColPali\'s main cost?', options: ['Storing hundreds of vectors per page', 'Slow OCR', 'Low recall'], answer: 0, why: 'Quantisation shrinks it about eight times.' },
  ],
  terms: [
    ['Late interaction', 'Comparing query and page vector by vector at search time.'],
    ['MaxSim', 'Sum over query tokens of the best-matching patch.'],
    ['Patch vector', 'One embedding for a small square of the page.'],
    ['Product quantisation', 'Compressing vectors into short codes.'],
    ['VisRAG', 'One pooled vector per page: cheaper, weaker.'],
    ['nDCG@5', 'A score for how well the top five results are ranked.'],
  ],
  deeper: '<p><b>Manuals and reports.</b> Extension services in Tanzania, Malawi and Rwanda publish illustrated guides where the key advice is often a diagram or a table. Searching the page images keeps that advice findable, including in scans that OCR handles badly.</p><p><b>When text wins.</b> For plain text with no layout, or archives so large that storage dominates, text retrieval is simpler and far smaller.</p><p><b>About this machine.</b> Scores are computed for real on tiny 8-dimensional vectors; storage uses the course\'s figures.</p>',
  code: {
    title: 'MaxSim',
    note: 'Adapted from the course\'s ColPali lesson.',
    text: `
def maxsim(query_vecs, page_vecs):
    return sum(max(cos(q, p) for p in page_vecs) for q in query_vecs)

def search(query_vecs, index, k=3):
    scored = [(maxsim(query_vecs, vecs), page) for page, vecs in index.items()]
    return [page for _, page in sorted(scored, reverse=True)[:k]]
`,
  },
};
