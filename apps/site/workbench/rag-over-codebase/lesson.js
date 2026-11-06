// Capstone: RAG over a codebase (phase 19, capstone 2). A Lagos logistics firm has four repos. Ten questions go through a full search machine: chunking by symbol, keyword plus vector search, a call graph, a reranker, then cited answers.
// Each part recovers a kind of question; recall is counted over the ten. Earlier retrieval lessons supply the parts; this shows them running together across repos.
const Q = [...Array(10)].map((_, i) => ({ kind: ['name', 'name', 'name', 'meaning', 'meaning', 'meaning', 'cross', 'cross', 'cross', 'split'][i] }));
function run(o) {
  const hit = Q.map(q => {
    if (q.kind === 'name') return o.bm25;
    if (q.kind === 'meaning') return o.vec;
    if (q.kind === 'cross') return o.graph && (o.bm25 || o.vec);
    return o.ast && (o.bm25 || o.vec);
  });
  const found = hit.filter(Boolean).length, top = o.rerank ? found : Math.max(0, found - 2);
  return { hit, found, top, cited: o.cite };
}

export default {
  slug: 'rag-over-codebase',
  title: 'Capstone: search across a whole codebase',
  description: 'Four repos and ten questions. Build the full search machine, and see which question each part rescues.',
  overview: 'A long context window doesn\'t answer "where do we retry a failed payment?" across four repositories. Coding agents need ranked retrieval, and plain cosine similarity over text chunks does poorly on code. A good system splits by function, not by line count. It combines keyword search, which finds exact names, with vector search, which finds meaning. It follows the call graph across repos, so an answer can cross a service boundary. A reranker sorts the shortlist, and each answer cites file and line. This capstone joins those parts into one machine, for a logistics firm in Lagos. Ten questions go through, and you can see which part rescues which kind.',
  keywords: ['code search', 'RAG', 'hybrid search', 'call graph', 'reranker', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { ast: true, bm25: true, vec: true, graph: true, rerank: true, cite: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const repos = [0, 1, 2, 3].map(i => { const b = P.box(0.5, 0.42, 0.28, ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#A87A4F'][i], { r: 0.03 }); b.position.set(-2.15, 0.03, -0.55 + i * 0.36); S.add(b); return b; });
    const links = [[-0.55, -0.19], [-0.19, 0.17], [0.17, 0.53]].map(([a, c]) => { const r = P.rod(V(-1.85, 0.3, a), V(-1.85, 0.3, c), 0.025, SAF); S.add(r); return r; });
    const XS = [-1.15, -0.45, 0.25], parts = XS.map((x, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.5, 0.55, 0.9, '#fff', { r: 0.05, material: m }); b.position.set(x, 0.03, 0); S.add(b); return m; });
    const X = i => 0.85 + (i % 5) * 0.34, Z = i => i < 5 ? -0.3 : 0.1;
    const C = Q.map((q, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.27, 0.22, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, Z(i)); S.add(b); return m; });
    S.add(P.keep(-2.45, 2.45, 0.8, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      C.forEach((m, i) => m.color.set(R.hit[i] ? GOOD : BAD));
      parts[0].color.set(st.ast ? BLUE : GREY); parts[1].color.set(st.bm25 && st.vec ? BLUE : st.bm25 || st.vec ? SAF : GREY); parts[2].color.set(st.rerank ? BLUE : GREY);
      links.forEach(l => { l.visible = st.graph; });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('ast', 'Chunk by function, not by lines', 'By symbol'), tg('bm25', 'Keyword search', 'Keywords'), tg('vec', 'Vector search', 'Vectors'),
      tg('graph', 'Follow the call graph across repos', 'Call graph'), tg('rerank', 'Rerank the shortlist', 'Reranker'), tg('cite', 'Cite file and line', 'Citations'),
    ];
    const readouts = [
      { label: 'Questions found', get: () => ({ v: `${R.found} of 10`, sub: 'anywhere in the shortlist', good: R.found === 10, bad: R.found < 6 }) },
      { label: 'In the top five', get: () => ({ v: `${R.top} of 10`, sub: st.rerank ? 'sorted' : 'buried', good: R.top === R.found }) },
      { label: 'Answers can be checked', get: () => ({ v: st.cite ? 'yes' : 'no', sub: 'file and line', good: st.cite, bad: !st.cite }) },
    ];
    const labels = [
      { name: 'r', t: 'Four repos', d: 'Gold links: the call graph', icon: 'link', atV: V(-2.42, 0.2, 0) },
      { name: 'q', t: 'Ten questions', d: 'Coral: not found', icon: 'target', atV: V(X(4) + 0.15, 0.15, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Vector search only', hint: 'exact names get lost', on: () => set({ ...D0, bm25: false }), off: reset },
      { label: 'Split every 500 lines', hint: 'functions cut in half', on: () => set({ ...D0, ast: false }), off: reset },
      { label: 'One repo at a time', hint: 'no call graph', on: () => set({ ...D0, graph: false }), off: reset },
      { label: 'No reranker', hint: 'right answer at rank 40', on: () => set({ ...D0, rerank: false }), off: reset },
    ];
    function status() {
      if (!st.bm25) return { ok: false, msg: `<b>${R.found} of 10: exact names were lost.</b> A function called retryPayment is a specific string, and vectors blur it. Keyword search finds it at once. Code needs both.` };
      if (!st.vec) return { ok: false, msg: `<b>${R.found} of 10: questions in plain words miss.</b> "Where do we give up on a parcel?" shares no words with the code.` };
      if (!st.ast) return { ok: false, msg: '<b>One function was split across two chunks, and neither half answers.</b> Code has a structure. Parse it, and chunk on real boundaries.' };
      if (!st.graph) return { ok: false, msg: `<b>${R.found} of 10: answers that cross a service boundary are gone.</b> The bug is in the billing repo, and the question starts in the app. Follow the calls.` };
      if (!st.rerank) return { ok: false, msg: `<b>All found, ${R.top} in the top five.</b> Retrieved at rank 40 is as good as lost: the agent reads the top few. A reranker reads query and chunk together.` };
      return { ok: !!st.cite, msg: `<b>${R.found} of 10 found, ${R.top} in the top five.</b> ${st.cite ? 'Every answer cites file and line, so an agent or person can check it.' : 'Add citations, so that answers can be checked.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four repos', home: true, say: 'A logistics firm in Lagos has four repos. A big context window can\'t hold them, and "where do we retry?" needs search.', act: m => m.set({ ast: false, bm25: false, vec: true, graph: false, rerank: false, cite: false }) },
    { t: 'Chunk by symbol', home: true, say: 'Parse the code and chunk by function, so that no idea is cut in half.', act: m => m.set({ ast: true, bm25: false, vec: true, graph: false, rerank: false, cite: false }) },
    { t: 'Names and meaning', home: true, say: 'Keyword search finds exact names, and vectors find meaning. Together they cover far more.', act: m => m.set({ ast: true, bm25: true, vec: true, graph: false, rerank: false, cite: false }) },
    { t: 'Cross the boundary', home: true, say: 'Follow the call graph, and an answer can leave one repo and land in another.', act: m => m.set({ ast: true, bm25: true, vec: true, graph: true, rerank: false, cite: false }) },
    { t: 'Sort the shortlist', home: true, say: 'A reranker reads each pair closely, so that the right chunk rises to the top.', act: m => m.set({ ast: true, bm25: true, vec: true, graph: true, rerank: true, cite: false }) },
    { t: 'Cite it', home: true, say: 'Every answer points to a file and line. Now a person, or an agent, can check it.', act: m => m.set({ ast: true, bm25: true, vec: true, graph: true, rerank: true, cite: true }) },
  ],
  check: [
    { q: 'Why add keyword search to vectors for code?', options: ['Exact names matter', 'It is cheaper only', 'Vectors can\'t read code'], answer: 0, why: 'Identifiers are specific strings.', hint: 'Try Vector search only.' },
    { q: 'What does a call graph add?', options: ['Answers across repos', 'Better embeddings', 'Faster disks'], answer: 0, why: 'It crosses service boundaries.', hint: 'Try One repo at a time.' },
    { q: 'Why chunk by symbol?', options: ['Functions stay whole', 'It uses less storage', 'It is alphabetical'], answer: 0, why: 'A cut function answers nothing.', hint: 'Try Split every 500 lines.' },
  ],
  terms: [
    ['AST chunking', 'Splitting code by parsed structure.'],
    ['BM25', 'A classic keyword ranking.'],
    ['Hybrid search', 'Keywords and vectors together.'],
    ['Call graph', 'Which function calls which.'],
    ['Reranker', 'A close reader of the shortlist.'],
    ['Citation', 'A pointer back to the source.'],
  ],
  deeper: '<p><b>Freshness.</b> Code changes constantly, so reindex on commit, per file.</p><p><b>Evaluate.</b> Keep a set of real questions with known answers, and watch recall at the rank your agent reads.</p><p><b>This run</b> uses ten questions of four kinds to show what each part rescues.</p>',
  code: {
    title: 'A hybrid search',
    note: 'Adapted from the course\'s capstone sketch (code/main.py).',
    text: `
def search(query, k=5):
    keyword = bm25.top(query, 50)
    vector = embed_index.top(embed(query), 50)
    pool = reciprocal_rank_fusion(keyword, vector)
    pool += [callee for hit in pool[:10] for callee in call_graph.neighbours(hit)]
    ranked = reranker.sort(query, pool)
    return [(c.path, c.line, c.text) for c in ranked[:k]]
`,
  },
};
