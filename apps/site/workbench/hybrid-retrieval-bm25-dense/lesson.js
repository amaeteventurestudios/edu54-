// Hybrid retrieval (phase 19, lesson 65): BM25 and dense search return two ranked lists for a Mbarara farm-advice corpus. Reciprocal rank fusion merges them: score = Σ 1/(k + rank). Real RRF on ten documents; towers show the fused score. The right doc sits low on each list and high on the fused one.
const BM = ['d3', 'd1', 'd7', 'd2', 'd9', 'd5'], DN = ['d5', 'd2', 'd8', 'd4', 'd3', 'd1'];
const DOCS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd7', 'd8', 'd9'], GOLD = { name: 'd3', sense: 'd5', both: 'd2' };
function run(o) {
  const fuse = {}; DOCS.forEach(d => { let s = 0; if (o.mode !== 'dense') { const r = BM.indexOf(d); if (r >= 0) s += o.w / (o.k + r + 1); } if (o.mode !== 'bm25') { const r = DN.indexOf(d); if (r >= 0) s += (2 - o.w) / (o.k + r + 1); } fuse[d] = s; });
  const order = DOCS.slice().sort((a, b) => fuse[b] - fuse[a]), gold = GOLD[o.q], rank = order.indexOf(gold) + 1;
  return { fuse, order, gold, rank, top: rank <= 3 };
}

export default {
  slug: 'hybrid-retrieval-bm25-dense',
  title: 'Hybrid retrieval: fuse keywords and meaning',
  description: 'Two searchers disagree, and each misses things. Reciprocal rank fusion merges the lists without comparing scores.',
  overview: 'Keyword search finds exact terms, such as a pesticide\'s name. Dense search finds meaning, such as "my leaves are curling". Each misses what the other finds. Their scores can\'t be added, as they are on different scales. Reciprocal rank fusion ignores scores altogether, and uses only ranks: each list gives a document one over k plus its rank, and the sums decide. Simple, and hard to beat. The constant k softens how much top ranks count. This runs real fusion over a farm-advice corpus in Mbarara.',
  keywords: ['hybrid search', 'BM25', 'dense retrieval', 'reciprocal rank fusion', 'RAG', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'hybrid', k: 60, w: 1, q: 'both' }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.56, T = DOCS.map(() => { const t = add(P.tower(0.42, 0.45, BLUE)); t.position.set(0, 0.03, -0.1); t.userData.set({ cap: '' }); return t; }); T.forEach((t, i) => t.position.x = X(i));
    S.add(P.keep(-2.35, 2.35, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); R.order.forEach((d, i) => T[i].userData.set({ h: Math.max(0.04, R.fuse[d] * 30), color: d === R.gold ? SAF : i < 3 ? GOOD : BLUE })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['bm25', 'dense', 'hybrid'], QK = ['name', 'sense', 'both'];
    const controls = [
      { type: 'buttons', label: 'Search with', options: ['BM25', 'Dense', 'Hybrid'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'buttons', label: 'Question', options: ['Exact name', 'Plain words', 'A bit of both'], get: () => QK.indexOf(st.q), act: i => set({ q: QK[i] }) },
      { type: 'slider', label: 'RRF k', min: 1, max: 100, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'slider', label: 'Lean towards BM25', min: 0.2, max: 1.8, step: 0.1, get: () => st.w, set: v => set({ w: v }) },
    ];
    const readouts = [
      { label: 'Right document', get: () => ({ v: `rank ${R.rank}`, sub: R.gold, good: R.top, bad: R.rank > 4 }) },
      { label: 'Top three', get: () => ({ v: R.order.slice(0, 3).join(', ') }) },
      { label: 'Fused score', get: () => ({ v: R.fuse[R.gold].toFixed(4) }) },
    ];
    const labels = [
      { name: 't', t: 'Fused ranking', d: 'Gold: the right document', icon: 'target', atV: V(X(0) - 0.22, 0.2, -0.1) },
      { name: 'r', t: 'Lower ranks', d: 'Past what the agent reads', icon: 'scale', atV: V(X(7) + 0.2, 0.05, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'BM25 on plain words', hint: 'no shared terms', on: () => set({ ...D0, mode: 'bm25', q: 'sense' }), off: reset },
      { label: 'Dense on an exact name', hint: 'names blur', on: () => set({ ...D0, mode: 'dense', q: 'name' }), off: reset },
    ];
    function status() {
      if (!R.top) return { ok: false, msg: `<b>${R.gold} is at rank ${R.rank}.</b> ${st.mode === 'bm25' ? 'No shared words.' : st.mode === 'dense' ? 'Embeddings blur exact names.' : 'Adjust the balance.'}` };
      return { ok: true, msg: `<b>${R.gold} is at rank ${R.rank}.</b> ${st.mode === 'hybrid' ? 'Neither list had it first. Together they lifted it.' : 'This one suits this searcher.'} Ranks need no shared scale.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two searchers', home: true, say: 'A farm-advice service in Mbarara has two searchers. Keywords find names. Vectors find meaning.', act: m => m.set({ mode: 'bm25', k: 60, w: 1, q: 'name' }) },
    { t: 'Each misses', home: true, say: 'BM25 misses "my leaves are curling", as it shares no words.', act: m => m.set({ mode: 'bm25', k: 60, w: 1, q: 'sense' }) },
    { t: 'And the other', home: true, say: 'Dense search blurs an exact product name.', act: m => m.set({ mode: 'dense', k: 60, w: 1, q: 'name' }) },
    { t: 'Fuse the ranks', home: true, say: 'Scores don\'t compare. Ranks do. Add one over k plus rank, across both lists.', act: m => m.set({ mode: 'hybrid', k: 60, w: 1, q: 'both' }) },
    { t: 'The constant', home: true, say: 'A larger k softens how much the very top counts.', act: m => m.set({ mode: 'hybrid', k: 10, w: 1, q: 'both' }) },
    { t: 'A strong default', home: true, say: 'Hybrid search with rank fusion is hard to beat for its simplicity.', act: m => m.set({ mode: 'hybrid', k: 60, w: 1, q: 'both' }) },
  ],
  check: [
    { q: 'Why fuse ranks, not scores?', options: ['Scores are on different scales', 'Ranks are bigger', 'Scores are secret'], answer: 0, why: 'Ranks compare directly.', hint: 'See Fuse the ranks.' },
    { q: 'What does BM25 miss?', options: ['Meaning without shared words', 'Exact names', 'Short queries'], answer: 0, why: 'It counts words.', hint: 'Try BM25 on plain words.' },
    { q: 'What does dense search blur?', options: ['Exact names', 'Meaning', 'Long documents'], answer: 0, why: 'Similar is not identical.', hint: 'Try Dense on an exact name.' },
  ],
  terms: [['RRF', 'Reciprocal rank fusion.'], ['Dense retrieval', 'Search by embeddings.'], ['BM25', 'Keyword ranking.'], ['Hybrid search', 'Both together.']],
  deeper: '<p><b>Weights.</b> Lean one way if your queries do.</p><p><b>Next.</b> A reranker sorts the fused list.</p><p><b>Fusion</b> is really computed on two fixed lists.</p>',
  code: {
    title: 'RRF',
    note: 'Adapted from the course\'s retriever (code/main.py).',
    text: `
def rrf(lists, k=60):
    score = Counter()
    for ranked in lists:
        for rank, doc in enumerate(ranked, 1):
            score[doc] += 1 / (k + rank)
    return [d for d, _ in score.most_common()]
`,
  },
};
