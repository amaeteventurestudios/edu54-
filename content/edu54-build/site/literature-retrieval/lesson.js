// Literature retrieval (phase 19, lesson 51): before testing an idea, check what's known. A real small BM25 runs over eight abstracts on crop yields for a Nairobi lab; a citation walk finds papers with different words. Hits from both are merged by stable id. Blocks are papers; height is score.
const DOC = [
  ['maize yield drought tolerance', [3]], ['rainfall models for maize yield', [0]], ['soil nitrogen and crop yield', [1]], ['drought stress in cereals', [5]],
  ['tea leaf disease detection', []], ['heat shock response in sorghum', []], ['fertiliser subsidy economics', []], ['maize yield drought tolerance', []],
];
const Q = ['drought', 'maize'], tok = s => s.split(' '), AV = DOC.reduce((a, d) => a + tok(d[0]).length, 0) / DOC.length;
function bm25(d) { const w = tok(d); return Q.reduce((s, q) => { const f = w.filter(x => x === q).length, n = DOC.filter(x => tok(x[0]).includes(q)).length, idf = Math.log(1 + (DOC.length - n + 0.5) / (n + 0.5)); return s + idf * (f * 2.5) / (f + 1.5 * (0.25 + 0.75 * w.length / AV)); }, 0); }
function run(o) {
  const s = DOC.map(d => bm25(d[0])), hit = new Set(s.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0));
  if (o.graph) [...hit].forEach(i => DOC[i][1].forEach(j => hit.add(j)));
  const dup = hit.has(0) && hit.has(7) && !o.dedup;
  if (o.dedup) hit.delete(7);
  return { s, hit, dup, known: hit.has(5), n: hit.size };
}

export default {
  slug: 'literature-retrieval',
  title: 'Literature retrieval: check what\'s already known',
  description: 'Keyword search finds papers with your words. A citation walk finds the ones that say it differently.',
  overview: 'An idea that\'s already been tested wastes an experiment. Retrieval comes first. A BM25 index over abstracts finds papers sharing your words, and needs nothing but counting. But related work may use other words, and a citation graph reaches it: follow what your hits cite. The same paper arrives from several places, so merge by a stable id. External APIs differ and fail, so wrap them in one client with limits. Here a real BM25 runs on eight abstracts for a crop lab in Nairobi, and a citation walk finds what the words missed.',
  keywords: ['BM25', 'citation graph', 'literature search', 'research agent', 'deduplication', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { graph: true, dedup: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.57;
    const T = DOC.map(() => { const t = add(P.tower(0.42, 0.42, GREY)); t.position.set(X(0), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    T.forEach((t, i) => t.position.x = X(i));
    DOC.forEach((d, i) => d[1].forEach(j => S.add(P.rod(V(X(i), 0.1, 0.35), V(X(j), 0.1, 0.35), 0.02, SAF))));
    S.add(P.keep(-2.35, 2.35, 1.1, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach((t, i) => { const on = R.hit.has(i), kw = R.s[i] > 0; t.userData.set({ h: Math.max(0.05, on ? 0.15 + R.s[i] * 0.35 : 0.06), color: !on ? GREY : kw ? GOOD : SAF }); });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Walk the citation graph', short: 'Citations', get: () => st.graph, set: v => set({ graph: !!v }) },
      { type: 'toggle', label: 'Merge by stable id', short: 'Dedup', get: () => st.dedup, set: v => set({ dedup: !!v }) },
    ];
    const readouts = [
      { label: 'Papers found', get: () => ({ v: `${R.n} of ${DOC.length}`, sub: `query: ${Q.join(' ')}` }) },
      { label: 'Key paper reached', get: () => ({ v: R.known ? 'yes' : 'no', sub: 'heat shock in sorghum', good: R.known, bad: !R.known }) },
      { label: 'Duplicates', get: () => ({ v: R.dup ? '1' : '0', good: !R.dup, bad: R.dup }) },
    ];
    const labels = [
      { name: 't', t: 'Eight abstracts', d: 'Teal: keywords. Gold: citation', icon: 'book', atV: V(X(0) - 0.22, 0.15, -0.1) },
      { name: 'r', t: 'Citation links', d: 'Papers that point to papers', icon: 'link', atV: V(X(7) + 0.2, 0.05, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keywords only', hint: 'other words, same idea', on: () => set({ ...D0, graph: false }), off: reset },
      { label: 'No merging', hint: 'one paper twice', on: () => set({ ...D0, dedup: false }), off: reset },
    ];
    function status() {
      if (!st.graph) return { ok: false, msg: `<b>${R.n} found, and the sorghum paper is missed.</b> It says "heat shock", not "drought". A citation walk reaches it.` };
      if (R.dup) return { ok: false, msg: '<b>One paper appears twice, from two sources.</b> It would be cited twice, and counted as extra evidence. Merge by a stable id.' };
      return { ok: true, msg: `<b>${R.n} papers, including one found only through citations.</b> Now the idea can be checked against what is known.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Before the bench', home: true, say: 'A crop lab in Nairobi has an idea about drought and maize. Has someone tested it already?', act: m => m.set({ graph: false, dedup: true }) },
    { t: 'Keywords', home: true, say: 'BM25 scores abstracts by shared words, weighting rare ones. It needs no model.', act: m => m.set({ graph: false, dedup: true }) },
    { t: 'What it misses', home: true, say: 'A paper on heat shock in sorghum is relevant, and it shares no words.', act: m => m.set({ graph: false, dedup: true }) },
    { t: 'Follow citations', home: true, say: 'Walk what your hits cite, and it appears.', act: m => m.set({ graph: true, dedup: true }) },
    { t: 'Merge', home: true, say: 'The same paper can arrive twice. Merge by a stable id.', act: m => m.set({ graph: true, dedup: false }) },
    { t: 'Ready to test', home: true, say: 'Now the idea is checked against what is known, and on to the runner.', act: m => m.set({ graph: true, dedup: true }) },
  ],
  check: [
    { q: 'What does BM25 reward?', options: ['Shared rare words', 'Long documents', 'New papers'], answer: 0, why: 'Rare terms weigh more.', hint: 'See Keywords.' },
    { q: 'What does a citation walk add?', options: ['Papers with different words', 'Faster search', 'Better spelling'], answer: 0, why: 'It follows links, not words.', hint: 'Try Keywords only.' },
    { q: 'Why merge by id?', options: ['One paper mustn\'t count twice', 'To save space', 'To sort them'], answer: 0, why: 'It would look like more evidence.', hint: 'Try No merging.' },
  ],
  terms: [['BM25', 'A keyword ranking formula.'], ['IDF', 'A weight for rare words.'], ['Citation graph', 'Papers linked by references.'], ['Stable id', 'A fixed identifier, such as a DOI.']],
  deeper: '<p><b>Rate limits.</b> Wrap external APIs in one client, with retries and a cache.</p><p><b>Embeddings</b> can add a third route.</p><p><b>BM25 here</b> really runs on eight short abstracts.</p>',
  code: {
    title: 'Search and walk',
    note: 'Adapted from the course\'s retrieval (code/main.py).',
    text: `
def search(query):
    hits = {p.id: p for p in bm25.top(query, 10)}
    for paper in list(hits.values()):
        for ref in graph.cited_by(paper) + graph.cites(paper):
            hits.setdefault(ref.id, ref)
    return list(hits.values())
`,
  },
};
