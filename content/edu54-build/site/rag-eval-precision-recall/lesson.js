// RAG evaluation (phase 19, lesson 68): real retrieval metrics on a ranked list for a Kampala agri-lender: precision@k, recall@k, MRR, nDCG@k. Ten results, each marked relevant or not. Faithfulness and relevance are shown as separate answer grades. Move relevant items and see which number moves.
const LISTS = { good: [1, 1, 0, 1, 0, 0, 0, 0, 0, 0], late: [0, 0, 0, 0, 1, 1, 0, 1, 0, 0], none: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
const TOTAL = 3;
function run(o) {
  const L = LISTS[o.list], k = o.k, hits = L.slice(0, k).reduce((a, b) => a + b, 0), first = L.indexOf(1);
  const dcg = L.slice(0, k).reduce((a, v, i) => a + v / Math.log2(i + 2), 0), ideal = [1, 1, 1].slice(0, k).reduce((a, v, i) => a + v / Math.log2(i + 2), 0);
  return { p: hits / k, r: hits / TOTAL, mrr: first < 0 ? 0 : 1 / (first + 1), ndcg: dcg / ideal, L, faith: o.ground ? 0.95 : 0.55, rel: o.list === 'none' ? 0.2 : 0.85 };
}

export default {
  slug: 'rag-eval-precision-recall',
  title: 'Evaluating RAG: retrieval and answer, separately',
  description: 'Four numbers for the search, two for the answer. Find out which half of the system is failing.',
  overview: 'A bad RAG answer has two possible causes, and each needs its own measure. For retrieval, keep labelled gold passages. Precision at k says how much of the top k is relevant. Recall at k says how much of the relevant set you found. MRR rewards the first hit being high. nDCG rewards good results near the top. For the answer, measure faithfulness, meaning each claim is grounded in the retrieved text, and answer relevance, meaning it addresses the question. Together they show which half broke. Real metrics run here on a ranked list, for an agricultural lender in Kampala.',
  keywords: ['RAG evaluation', 'precision at k', 'recall', 'MRR', 'nDCG', 'faithfulness'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { list: 'good', k: 3, ground: true }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.27;
    const C = Array.from({ length: 10 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.22, 0.3, 0.5, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.2); S.add(b); return { b, m }; });
    const T = [0, 1, 2, 3, 4, 5].map(i => { const t = add(P.tower(0.26, 0.4, i < 4 ? '#5B8DB8' : '#7B6FA8')); t.position.set(0.75 + i * 0.32, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const rail = P.box(0.04, 0.5, 0.7, SAF, { r: 0.005 }); rail.userData.noFit = true; S.add(rail);
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st); C.forEach(({ m }, i) => m.color.set(R.L[i] ? GOOD : GREY)); rail.position.set(X(st.k) - 0.135, 0.03, -0.2);
      [R.p, R.r, R.mrr, R.ndcg, R.faith, R.rel].forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 1.1) }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const LK = ['good', 'late', 'none'];
    const controls = [
      { type: 'buttons', label: 'Search result', options: ['Good', 'Relevant, but low', 'Nothing relevant'], get: () => LK.indexOf(st.list), act: i => set({ list: LK[i] }) },
      { type: 'slider', label: 'k', min: 1, max: 10, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'toggle', label: 'Answer only from the passages', short: 'Grounded', get: () => st.ground, set: v => set({ ground: !!v }) },
    ];
    const readouts = [
      { label: 'Precision, recall', get: () => ({ v: `${R.p.toFixed(2)}, ${R.r.toFixed(2)}`, sub: `at ${st.k}` }) },
      { label: 'MRR, nDCG', get: () => ({ v: `${R.mrr.toFixed(2)}, ${R.ndcg.toFixed(2)}`, good: R.ndcg > 0.7, bad: R.ndcg < 0.3 }) },
      { label: 'Faithful, relevant', get: () => ({ v: `${R.faith}, ${R.rel}`, sub: 'answer grades', bad: R.faith < 0.7 }) },
    ];
    const labels = [
      { name: 'l', t: 'Ranked results', d: 'Teal: relevant. Bar: k', icon: 'link', atV: V(X(0) - 0.12, 0.15, -0.2) },
      { name: 't', t: 'Four, then two', d: 'Retrieval, then answer', icon: 'target', atV: V(2.42, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Good results, buried', hint: 'recall fine, nDCG poor', on: () => set({ ...D0, list: 'late', k: 10 }), off: reset },
      { label: 'Good search, loose answer', hint: 'retrieval isn\'t the problem', on: () => set({ ...D0, ground: false }), off: reset },
      { label: 'Nothing relevant', hint: 'the answer still sounds fine', on: () => set({ ...D0, list: 'none', ground: false }), off: reset },
    ];
    function status() {
      if (st.list === 'none') return { ok: false, msg: '<b>Every retrieval number is zero.</b> The answer may still read well, so a judge alone would miss this. Check search first.' };
      if (!st.ground) return { ok: false, msg: `<b>Retrieval is fine (nDCG ${R.ndcg.toFixed(2)}), and faithfulness is ${R.faith}.</b> The model went beyond the text. This fix is in the prompt, not the index.` };
      if (st.list === 'late') return { ok: false, msg: `<b>Recall ${R.r.toFixed(2)}, nDCG ${R.ndcg.toFixed(2)}.</b> Found, but low. Add a reranker.` };
      return { ok: true, msg: `<b>Precision ${R.p.toFixed(2)}, recall ${R.r.toFixed(2)}, MRR ${R.mrr.toFixed(2)}, nDCG ${R.ndcg.toFixed(2)}.</b> Both halves are healthy.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two halves', home: true, say: 'An agri-lender in Kampala has a RAG bot giving poor answers. Is it the search, or the writing?', act: m => m.set({ list: 'late', k: 3, ground: true }) },
    { t: 'Precision and recall', home: true, say: 'With gold labels, count how much of the top k is relevant, and how much was found.', act: m => m.set({ list: 'good', k: 3, ground: true }) },
    { t: 'Rank matters', home: true, say: 'MRR and nDCG reward good results near the top.', act: m => m.set({ list: 'late', k: 10, ground: true }) },
    { t: 'Faithful', home: true, say: 'Is every claim in the retrieved text? That is a different question.', act: m => m.set({ list: 'good', k: 3, ground: false }) },
    { t: 'Nothing found', home: true, say: 'If nothing relevant came back, a smooth answer is worse than none.', act: m => m.set({ list: 'none', k: 3, ground: false }) },
    { t: 'Which half', home: true, say: 'Six numbers tell you which half to fix.', act: m => m.set({ list: 'good', k: 3, ground: true }) },
  ],
  check: [
    { q: 'What does recall at k tell you?', options: ['How much of the relevant set was found', 'How fast search is', 'How long answers are'], answer: 0, why: 'Precision is the share of the top k.', hint: 'Move k.' },
    { q: 'What does faithfulness check?', options: ['Claims are grounded in the context', 'Spelling', 'Speed'], answer: 0, why: 'It is about the answer.', hint: 'Try Good search, loose answer.' },
    { q: 'Why measure retrieval and answer apart?', options: ['To see which half failed', 'For length', 'To cost more'], answer: 0, why: 'Fixes differ.', hint: 'See Which half.' },
  ],
  terms: [['Precision@k', 'Relevant share of the top k.'], ['Recall@k', 'Found share of the relevant set.'], ['MRR', 'One over the first hit\'s rank.'], ['nDCG', 'Discounted gain by rank.'], ['Faithfulness', 'Claims grounded in the context.']],
  deeper: '<p><b>Gold labels</b> are the expensive part. Start with fifty real questions.</p><p><b>Earlier lessons</b> cover judges. Here the two halves meet.</p><p><b>Retrieval numbers</b> are computed; answer grades are round.</p>',
  code: {
    title: 'nDCG',
    note: 'Adapted from the course\'s metrics (code/main.py).',
    text: `
def ndcg(ranked, relevant, k):
    dcg = sum(1 / log2(i + 2) for i, d in enumerate(ranked[:k]) if d in relevant)
    ideal = sum(1 / log2(i + 2) for i in range(min(k, len(relevant))))
    return dcg / ideal
`,
  },
};
