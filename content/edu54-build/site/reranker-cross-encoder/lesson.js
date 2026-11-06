// Reranker (phase 19, lesson 66): a bi-encoder scores query and document apart; a cross-encoder reads them together. Twenty candidates for a Lusaka legal helpdesk; the reranker reorders the top N. Cost and quality computed; reranking everything is slow, and reranking too few misses the answer.
const CAND = Array.from({ length: 20 }, (_, i) => ({ fast: 1 - i * 0.04, true: i === 11 ? 0.95 : i === 2 ? 0.8 : 0.3 + ((i * 7) % 10) * 0.03 }));
function run(o) {
  const head = CAND.slice(0, o.n).slice().sort((a, b) => (o.rr ? b.true - a.true : b.fast - a.fast)), order = [...head, ...CAND.slice(o.n)];
  const best = order.indexOf(CAND[11]) + 1, ms = o.rr ? o.n * 12 : 0;
  return { order, best, ms, hit: best <= 3 };
}

export default {
  slug: 'reranker-cross-encoder',
  title: 'A reranker: read the shortlist closely',
  description: 'Fast search makes a shortlist, and a cross-encoder reads each pair. It costs time, so choose how many it sees.',
  overview: 'Vector search scores query and document separately, which is what makes it fast and what limits it. A cross-encoder reads them together, with attention across both, and judges far better. It is too slow for a whole corpus. So use two stages: fast search picks a shortlist, and the cross-encoder reorders it. How long a shortlist? Too short, and the answer isn\'t in it. Too long, and latency grows. Here twenty candidates for a legal helpdesk in Lusaka are reordered, with the time counted.',
  keywords: ['reranker', 'cross-encoder', 'two-stage retrieval', 'RAG', 'latency', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 15, rr: true }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.3 + i * 0.235, T = CAND.map((c, i) => { const t = add(P.tower(0.18, 0.4, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const lens = add(P.robot(SAF, { scale: 0.45 })); lens.userData.noFit = true;
    S.add(P.keep(-2.45, 2.45, 1.1, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); R.order.forEach((c, i) => T[i].userData.set({ h: Math.max(0.05, (st.rr && i < st.n ? c.true : c.fast) * 1.0), color: c === CAND[11] ? SAF : i < st.n ? BLUE : GREY })); lens.position.set(X(Math.min(19, st.n - 1)), 0.03, 0.5); lens.userData.set({ busy: st.rr }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Shortlist size', min: 3, max: 20, step: 1, get: () => st.n, set: v => set({ n: v }) },
      { type: 'toggle', label: 'Cross-encoder rerank', short: 'Rerank', get: () => st.rr, set: v => set({ rr: !!v }) },
    ];
    const readouts = [
      { label: 'Right passage', get: () => ({ v: `rank ${R.best}`, good: R.hit, bad: R.best > 10 }) },
      { label: 'Added delay', get: () => ({ v: `${R.ms} ms`, good: R.ms < 200, bad: R.ms > 220 }) },
      { label: 'Reads', get: () => ({ v: st.rr ? `${st.n} pairs` : 'none', sub: 'query with document' }) },
    ];
    const labels = [
      { name: 't', t: 'Twenty candidates', d: 'Gold: the right passage', icon: 'target', atV: V(X(0) - 0.1, 0.15, -0.1) },
      { name: 'r', t: 'Beyond the shortlist', d: 'Grey: never reread', icon: 'box', atV: V(X(19) + 0.1, 0.05, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No reranker', hint: 'stuck at rank 12', on: () => set({ ...D0, rr: false }), off: reset },
      { label: 'A shortlist of five', hint: 'the answer is left out', on: () => set({ ...D0, n: 5 }), off: reset },
      { label: 'Rerank everything', hint: 'latency grows', on: () => set({ ...D0, n: 20 }), off: reset },
    ];
    function status() {
      if (!st.rr) return { ok: false, msg: `<b>The right passage sits at rank ${R.best}.</b> It uses different words, and a bi-encoder can\'t see that fit.` };
      if (st.n < 12) return { ok: false, msg: `<b>Rank ${R.best}: it wasn\'t in the shortlist.</b> A reranker can\'t rescue what it never sees.` };
      if (st.n >= 20) return { ok: false, msg: `<b>Rank ${R.best}, and ${R.ms} ms for each query.</b> Most of those reads changed nothing. Shorten the list.` };
      return { ok: true, msg: `<b>From rank 12 to rank ${R.best}, adding ${R.ms} ms.</b> Fast search for recall, a slow read for precision.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A shortlist', home: true, say: 'A legal helpdesk in Lusaka searches its cases. Fast search returns twenty, and the right one sits at twelve.', act: m => m.set({ n: 15, rr: false }) },
    { t: 'Read together', home: true, say: 'A cross-encoder reads the query and each passage together, with attention across both.', act: m => m.set({ n: 15, rr: true }) },
    { t: 'Up it comes', home: true, say: 'The right passage rises to the top.', act: m => m.set({ n: 15, rr: true }) },
    { t: 'Too short', home: true, say: 'A shortlist of five leaves it out. A reranker can\'t rescue what it never sees.', act: m => m.set({ n: 5, rr: true }) },
    { t: 'Too long', home: true, say: 'Reread everything, and latency grows for little.', act: m => m.set({ n: 20, rr: true }) },
    { t: 'Two stages', home: true, say: 'Recall from fast search, precision from a close read.', act: m => m.set({ n: 15, rr: true }) },
  ],
  check: [
    { q: 'What does a cross-encoder do?', options: ['Reads query and document together', 'Embeds separately', 'Counts words'], answer: 0, why: 'That is why it judges better.', hint: 'See Read together.' },
    { q: 'Why not rerank the whole corpus?', options: ['It is too slow', 'It is too accurate', 'It breaks the index'], answer: 0, why: 'Each pair is one model pass.', hint: 'Try Rerank everything.' },
    { q: 'What can\'t a reranker do?', options: ['Find what isn\'t in the shortlist', 'Reorder', 'Read pairs'], answer: 0, why: 'Recall comes first.', hint: 'Try A shortlist of five.' },
  ],
  terms: [['Bi-encoder', 'Encodes query and document apart.'], ['Cross-encoder', 'Reads them together.'], ['Shortlist', 'Candidates for a close read.'], ['Recall', 'Finding the right items at all.']],
  deeper: '<p><b>Latency.</b> Batch pairs, and cache common queries.</p><p><b>Language.</b> Check that your reranker reads your languages.</p><p><b>Scores</b> are seeded.</p>',
  code: {
    title: 'Two stages',
    note: 'Adapted from the course\'s reranker (code/main.py).',
    text: `
def search(query, n=15, k=5):
    pool = dense_index.top(embed(query), n)
    scored = cross_encoder.predict([(query, d.text) for d in pool])
    return [d for _, d in sorted(zip(scored, pool), reverse=True)][:k]
`,
  },
};
