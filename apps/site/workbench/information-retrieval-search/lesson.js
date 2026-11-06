// Information retrieval: the help centre of Jua Box, a solar home-system seller in Uganda, Rwanda and Zambia, searches eight short articles.
// Board 1 ranks by BM25 (computed live over the articles), board 2 by a dense bi-encoder (hand-set meaning vectors, cosine computed live),
// board 3 shows the final list: one retriever alone, or both fused with Reciprocal Rank Fusion and then reranked. Recall@3 and MRR are computed over the three queries.
// Break it: keyword search only (a paraphrase shares no words with the right article), meaning search only (it cannot tell error E47 from E41),
// no reranker (fusion rewards the article that appears in both lists, not the best one).
const DOCS = [
  { n: 'Error E47: too hot', t: 'Error E47: battery too hot. Move the battery out of direct sun and let it cool.', v: [0.5, 0.9, 0, 0, 0, 0, 0.1, 0] },
  { n: 'Error E41: low voltage', t: 'Error E41: battery voltage low. Charge the battery for a full day in sunshine.', v: [0.8, 0.9, 0, 0, 0, 0, 0, 0] },
  { n: 'Drains in the evening', t: 'Battery drains early in the evening: clean the panel and turn the radio down.', v: [0.8, 0, 0.9, 0.5, 0, 0, 0.3, 0] },
  { n: 'Paying by mobile money', t: 'Paying with mobile money: use the box number as the account.', v: [0, 0, 0, 0, 1, 0.4, 0, 0] },
  { n: 'Mounting the panel', t: 'Mount the panel on the roof facing the sun at midday, away from tree shade.', v: [0, 0, 0, 0, 0, 0, 1, 0] },
  { n: 'Charging a phone', t: 'Charging a phone: use the USB port and unplug it when full.', v: [0.2, 0, 0, 0, 0, 1, 0, 0] },
  { n: 'Warranty', t: 'Warranty: the battery is covered for two years, so keep your receipt.', v: [0.4, 0, 0, 0, 0, 0, 0, 1] },
  { n: 'Lights flicker', t: 'Lights flicker: tighten the cable plugs and check each bulb.', v: [0, 0.2, 0, 1, 0, 0, 0, 0] },
];
const QS = [
  { q: 'error E47 battery', gold: 0, v: [0.8, 0.9, 0, 0, 0, 0, 0, 0] },
  { q: 'my lights go off at night', gold: 2, v: [0.3, 0, 0.8, 0.8, 0, 0, 0, 0] },
  { q: 'pay for the box by phone', gold: 3, v: [0, 0, 0, 0, 0.9, 0.5, 0, 0] },
];
const tok = s => s.toLowerCase().match(/[a-z0-9]+/g) || [];
const CORP = DOCS.map(d => tok(d.t)), AVG = CORP.reduce((a, d) => a + d.length, 0) / CORP.length;
const DF = {}; CORP.forEach(d => new Set(d).forEach(w => { DF[w] = (DF[w] || 0) + 1; }));
const idf = w => Math.log(1 + (DOCS.length - (DF[w] || 0) + 0.5) / ((DF[w] || 0) + 0.5));
function bm25(q, i, k1 = 1.5, b = 0.75) { const d = CORP[i], f = {}; d.forEach(w => { f[w] = (f[w] || 0) + 1; }); let s = 0; tok(q).forEach(w => { const n = f[w] || 0; if (n) s += idf(w) * n * (k1 + 1) / (n + k1 * (1 - b + b * d.length / AVG)); }); return s; }
const cos = (a, b) => { let d = 0, x = 0, y = 0; a.forEach((v, i) => { d += v * b[i]; x += v * v; y += b[i] * b[i]; }); return d / Math.sqrt(x * y); };
function rank(qi, mode, rerank) {
  const Q = QS[qi];
  const sparse = DOCS.map((d, i) => [bm25(Q.q, i), i]).filter(r => r[0] > 0).sort((a, b) => b[0] - a[0]);   // an inverted index only returns articles that share a word
  const dense = DOCS.map((d, i) => [cos(Q.v, d.v), i]).sort((a, b) => b[0] - a[0]);
  let fin;
  if (mode === 0) fin = sparse; else if (mode === 1) fin = dense;
  else { const s = {}; [sparse, dense].forEach(L => L.forEach(([, i], r) => { s[i] = (s[i] || 0) + 1 / (60 + r + 1); })); fin = Object.keys(s).map(i => [s[i], +i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]); }
  let reranked = false;
  if (mode === 2 && rerank) {   // cross-encoder stand-in: reads query and article together; meaning match plus exact codes (tokens with digits) must agree
    const codes = tok(Q.q).filter(w => /\d/.test(w));
    fin = fin.slice(0, 6).map(([, i]) => [cos(Q.v, DOCS[i].v) + 0.4 * codes.filter(c => CORP[i].includes(c)).length, i]).sort((a, b) => b[0] - a[0]);
    reranked = true;
  }
  const pos = fin.findIndex(r => r[1] === Q.gold);
  return { sparse, dense, fin, pos, reranked };
}

export default {
  slug: 'information-retrieval-search',
  title: 'Search: keywords, meaning and both',
  description: 'The help centre of an invented solar-box seller searches its articles three ways. Keywords catch the code, meaning catches the words, and fusion needs both.',
  overview: 'Search sits under every RAG system. Sparse retrieval with BM25 scores articles by the query words they contain, weighting rare words more and long articles less; it is fast and exact, but misses paraphrases that share no words. Dense retrieval encodes the query and each article as vectors and ranks by cosine similarity; it catches meaning, but can blur exact codes and names. Reciprocal Rank Fusion merges the two ranked lists using only rank positions, so their different score scales do not matter. A cross-encoder reranker then reads the query and each top article together and reorders them. Retrieval is judged by recall@k, whether the right article is in the top k, and MRR, the average of one over the rank of the first right answer.',
  keywords: ['information retrieval', 'bm25', 'dense retrieval', 'reciprocal rank fusion', 'reranking', 'recall at k', 'mrr'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 0, mode: 2, rerank: true };
    /* three rankings side by side: five towers each, first place at the front; green is the right article */
    const boards = [-1.95, 0, 1.95].map((x, k) => {
      const pad = P.box(1.55, 0.04, 1.75, '#E4DED2', { r: 0.04 }); pad.position.set(x, 0, -0.35); S.add(pad);
      const col = k === 0 ? C.orange : k === 1 ? C.teal : '#3B3F8F';
      const rows = [0, 1, 2, 3, 4].map(r => { const bar = P.tower(0.9, 0.26, col, { h: 0.2 }); bar.userData.set({ cap: '' }); bar.position.set(x, 0.04, -0.95 + r * 0.32); S.add(bar); return { bar, col }; });
      return { rows, pad };
    });
    /* feeds from the two retrievers into the final ranking */
    const arrows = [[-1.1, 0.95], [0.85, 1.1]].map(([a, b]) => { const p = P.pipe([V(a, 0.12, -1.05), V((a + b) / 2, 0.16, -1.2), V(b, 0.12, -1.05)], '#8A8578', { r: 0.025, n: 3 }); S.add(p); return p; });
    S.add(P.keep(-2.8, 2.8, 0.75, -1.3, 0.6));
    const parts = [...arrows, ...boards.flatMap(b => b.rows.map(r => r.bar))];
    let R = null, ALL = [];
    function fill(B, list, gold, used) {
      const mx = Math.max(1e-9, ...list.slice(0, 5).map(r => r[0]));
      B.rows.forEach((row, r) => { const it = list[r]; row.bar.visible = !!it && used; if (it) row.bar.userData.set({ h: Math.max(0.03, 0.6 * it[0] / mx), color: it[1] === gold ? '#2E9E5B' : row.col }); });
    }
    function draw() {
      R = rank(st.q, st.mode, st.rerank);
      ALL = QS.map((q, i) => rank(i, st.mode, st.rerank).pos);
      const Q = QS[st.q];
      fill(boards[0], R.sparse, Q.gold, st.mode !== 1);
      fill(boards[1], R.dense, Q.gold, st.mode !== 0);
      fill(boards[2], R.fin, Q.gold, true);
      arrows[0].visible = st.mode !== 1; arrows[1].visible = st.mode !== 0;
    }
    draw();
    const recall = () => ALL.filter(p => p >= 0 && p < 3).length, mrr = () => ALL.reduce((a, p) => a + (p >= 0 ? 1 / (p + 1) : 0), 0) / ALL.length;
    const controls = [
      { type: 'buttons', label: 'Search', options: ['Error E47', 'Lights at night', 'Pay by phone'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'buttons', label: 'Retriever', options: ['Keywords', 'Meaning', 'Both (RRF)'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'toggle', label: 'Rerank the top six', short: 'rerank', get: () => st.rerank, set: v => { st.rerank = v; draw(); } },
    ];
    const readouts = [
      { label: 'Right article', get: () => ({ v: R.pos < 0 ? 'missed' : `#${R.pos + 1}`, good: R.pos === 0, bad: R.pos !== 0 }) },
      { label: 'Recall@3', get: () => ({ v: `${recall()} of 3`, sub: 'over the three searches', bad: recall() < 3 }) },
      { label: 'MRR', get: () => ({ v: mrr().toFixed(2), sub: '1 is perfect', good: mrr() > 0.99 }) },
    ];
    const labels = [
      { name: 'bm25', t: 'Keyword ranking', d: 'Shared words, rare ones weigh more', icon: 'book', atV: V(-2.73, 0.1, -0.35) },
      { name: 'final', t: 'Final ranking', d: 'Green: the right article', icon: 'target', atV: V(2.73, 0.1, -0.35) },
    ];
    const reset = () => { Object.assign(st, { q: 0, mode: 2, rerank: true }); draw(); };
    const breaks = [
      { label: 'Keywords only', hint: 'Search "lights at night"', on: () => { reset(); st.q = 1; st.mode = 0; draw(); }, off: reset },
      { label: 'Meaning only', hint: 'Search "error E47"', on: () => { reset(); st.q = 0; st.mode = 1; draw(); }, off: reset },
      { label: 'No reranker', hint: 'Fusion alone', on: () => { reset(); st.q = 1; st.rerank = false; draw(); }, off: reset },
    ];
    function status() {
      const Q = QS[st.q], top = R.fin[0] ? DOCS[R.fin[0][1]].n : 'nothing', gold = DOCS[Q.gold].n;
      if (R.pos < 0) return { ok: false, msg: `<b>The right article never came back.</b> "${Q.q}" shares no words with "${gold}", which talks about the battery draining in the evening. BM25 only returns articles that contain a query word, so the paraphrase is invisible; it ranks "${top}" first. Add a meaning-based retriever to catch paraphrases. Recall@3 over the three searches: ${recall()} of 3.` };
      if (R.pos > 0 && st.mode === 1) return { ok: false, msg: `<b>Close in meaning, wrong in fact.</b> To the dense vectors, "error E47" and "error E41" mean almost the same thing, so "${top}" outranks "${gold}". The customer is told to charge a battery that is overheating. Exact codes need keyword search, or a reranker that checks them.` };
      if (R.pos > 0 && st.mode === 2 && !st.rerank) return { ok: false, msg: `<b>Fusion rewards being in both lists.</b> "${top}" appears in the keyword list and the meaning list, so Reciprocal Rank Fusion puts it first, ahead of "${gold}", which only the meaning search found. A reranker reads the query with each article and puts the best one on top. MRR: ${mrr().toFixed(2)}.` };
      if (R.pos > 0) return { ok: false, msg: `<b>"${gold}" is ranked ${R.pos + 1}.</b> "${top}" came first. Recall@3: ${recall()} of 3, MRR ${mrr().toFixed(2)}.` };
      return { ok: true, msg: `<b>"${gold}" comes first.</b> ${st.mode === 2 ? `Keywords and meaning are fused by rank${R.reranked ? ', then the top six are reranked by reading each one with the query' : ''}.` : st.mode === 0 ? 'The query shares rare words with it, so BM25 is enough here.' : 'The meaning vectors match here.'} Recall@3 over the three searches: ${recall()} of 3, MRR ${mrr().toFixed(2)}.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A help centre search', home: true, say: 'A solar home-system seller in Uganda, Rwanda and Zambia keeps short help articles. A customer types: error E47 battery.', act: m => m.set({ q: 0, mode: 0, rerank: true }) },
    { t: 'Keywords', home: true, say: 'BM25 scores articles by the query words they contain. Rare words like E47 count most, so the right article comes first.', act: m => m.set({ q: 0, mode: 0 }) },
    { t: 'Words differ', home: true, say: 'Now: my lights go off at night. The right article says the battery drains in the evening. No shared words, so keyword search never finds it.', act: m => m.set({ q: 1, mode: 0 }) },
    { t: 'Meaning', home: true, say: 'Dense vectors catch the meaning and find it. But for error E47 they cannot tell it from E41, and send the customer the wrong fix.', act: m => m.set({ q: 0, mode: 1 }) },
    { t: 'Fuse the two', home: true, say: 'Reciprocal Rank Fusion merges both lists by rank alone. For lights at night, though, the article in both lists wins, not the best one.', act: m => m.set({ q: 1, mode: 2, rerank: false }) },
    { t: 'Rerank', home: true, say: 'A reranker reads the query with each of the top articles and reorders them. Now every search puts the right article first.', act: m => m.set({ q: 1, mode: 2, rerank: true }) },
  ],
  check: [
    { q: 'Why does BM25 miss "my lights go off at night" for an article about the battery draining in the evening?', options: ['They share no words', 'The article is too long', 'BM25 ignores rare words'], answer: 0, why: 'Keyword search needs overlapping words.' },
    { q: 'Why does Reciprocal Rank Fusion use ranks rather than raw scores?', options: ['BM25 scores and cosine similarities are on different scales', 'Ranks are more precise', 'Raw scores are secret'], answer: 0, why: 'Ranks can be combined fairly.' },
    { q: 'What does recall@3 measure?', options: ['How often the right article is in the top three', 'How fast the search is', 'How many words match'], answer: 0, why: 'A reader cannot use what was not retrieved.' },
  ],
  terms: [
    ['BM25', 'A keyword score: query words in the article, rarer words weighted more, long articles less.'],
    ['Inverted index', 'A map from each word to the articles that contain it.'],
    ['Dense retrieval', 'Ranking by similarity between query and article vectors.'],
    ['Reciprocal Rank Fusion', 'Merging ranked lists by adding one over (60 plus rank).'],
    ['Cross-encoder reranker', 'A model that reads the query and an article together and scores the pair.'],
    ['Recall@k', 'Share of queries whose right answer is in the top k.'],
    ['MRR', 'Mean of one over the rank of the first right answer.'],
  ],
  deeper: '<p><b>Debugging a search.</b> When a query fails, compare the keyword and meaning lists. If one finds the right article and the other does not, it is a vocabulary gap or a blurred exact term, and the missing half fixes it.</p><p><b>Many languages.</b> Customers write in English, Kinyarwanda, Luganda or Bemba, and mix them. Multilingual embedding models let a query in one language find an article in another; keyword search needs each language indexed.</p><p><b>About this machine.</b> BM25, cosine, fusion, recall and MRR are computed live over the eight articles. The meaning vectors are set by hand to stand in for a trained encoder, and the reranker is a simple stand-in that adds exact code matches to meaning.</p>',
  code: {
    title: 'BM25 and Reciprocal Rank Fusion',
    note: 'Adapted from the course\'s information retrieval lesson.',
    text: `
import math
from collections import Counter

def bm25(query, doc, df, n_docs, avg_dl, k1=1.5, b=0.75):
    freq, score = Counter(doc), 0.0
    for term in query:
        f = freq.get(term, 0)
        if f:
            idf = math.log(1 + (n_docs - df[term] + 0.5) / (df[term] + 0.5))
            score += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(doc) / avg_dl))
    return score

def reciprocal_rank_fusion(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)
`,
  },
};
