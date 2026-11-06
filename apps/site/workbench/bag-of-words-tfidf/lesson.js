// Bag of words and TF-IDF: six notices pinned on a market board in Kampala become a grid of numbers: one row per notice, one column per word.
// Each cell is a column of blocks: how much that word counts for that notice. A search query is scored against every notice and the best match lights up.
// Plain counts let common words ("market", "the") and long notices dominate; TF-IDF weighs each word by how rare it is across notices, and length normalisation stops long notices winning by size.
// Break it: raw counts with no IDF (the long notice full of "market" wins every search), no length normalisation (the longest notice wins), word order thrown away (two notices with opposite meaning look identical).
const DOCS = [
  'fresh matoke at the market today',
  'market closed on sunday the market reopens monday',
  'selling a used boda boda, good price, call at the market',
  'lost goat near the market, brown goat with white spot',
  'the market market market committee meeting at the market office about market fees and market cleaning',
  'buy matoke not maize, maize price up',
];
const DOC2 = 'buy maize not matoke, matoke price up';
const QUERIES = ['market today', 'lost goat', 'goat at the market'];
const tok = s => s.toLowerCase().match(/[a-z]+/g) || [];

export default {
  slug: 'bag-of-words-tfidf',
  title: 'Bag of words and TF-IDF',
  description: 'Six notices on a market board in Kampala become a block of numbers: a row each, a column per word. Weigh words by rarity, and see what the grid cannot tell.',
  overview: 'The simplest way to turn text into numbers is a bag of words: count how many times each vocabulary word appears in each document, ignoring order. Raw counts have two problems. Words that appear everywhere, like "market" on a market board, dominate without telling documents apart; and long documents score high just by having more words. TF-IDF fixes the first by multiplying each count by the inverse document frequency, the log of how rare the word is across documents. Normalising each document\'s vector to unit length fixes the second. Search then ranks documents by cosine similarity to the query\'s vector. What a bag of words can never see is order.',
  keywords: ['bag of words', 'tf-idf explained', 'inverse document frequency', 'cosine similarity search', 'text representation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.25, 0], dir: [0.05, 1.0, 1.1], half: 1.1, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { idf: true, norm: true, q: 0, swap: false };
    const docs = () => DOCS.map((d, i) => (st.swap && i === 5 ? DOC2 : d));
    const VOCAB = ['market', 'the', 'today', 'matoke', 'maize', 'price', 'goat', 'lost', 'meeting', 'boda', 'closed', 'buy', 'not'];
    /* ---------- the grid ---------- */
    const GX0 = -1.75, CW = 0.32, RZ0 = -0.7, RH = 0.3;
    const grid = P.box(VOCAB.length * CW + 0.2, 0.04, DOCS.length * RH + 0.2, '#FBF8F1', { r: 0.03 }); grid.position.set(GX0 + VOCAB.length * CW / 2, 0, RZ0 + DOCS.length * RH / 2); S.add(grid);
    const cells = DOCS.map((_, i) => VOCAB.map((_, j) => { const m = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(CW * 0.7, 1, RH * 0.6, C.teal, { r: 0.02, material: m }); b.position.set(GX0 + (j + 0.5) * CW, 0.04, RZ0 + (i + 0.5) * RH); b.userData.noFit = true; S.add(b); return { b, m }; }));
    const hl = P.tube([V(), V(1, 0, 0)], 0.012, C.gold); hl.userData.noFit = true; S.add(hl);
    /* ---------- the notices ---------- */
    const notes = DOCS.map((d, i) => { const m = new THREE.MeshLambertMaterial({ color: '#C9A27A' }), b = P.box(0.26, 0.14, RH * 0.72, '#fff', { r: 0.02, material: m }); b.position.set(GX0 - 0.3, 0, RZ0 + (i + 0.5) * RH); S.add(b); return m; });
    S.add(P.keep(GX0 - 0.5, 3.3, 0.75, RZ0 - 0.2, 1.1));
    /* ---------- the query ---------- */
    const QX = 2.75, qb = P.box(0.7, 0.4, 0.5, C.indigo, { r: 0.06 }); qb.position.set(QX, 0, 0.85); S.add(qb);
    /* ---------- maths ---------- */
    let R = null;
    function vectors() {
      const D = docs().map(tok), N = D.length;
      const df = VOCAB.map(w => D.filter(d => d.includes(w)).length);
      const idf = df.map(d => (st.idf ? Math.log((1 + N) / (1 + d)) + 1 : 1));
      const vec = D.map(d => { const v = VOCAB.map((w, j) => d.filter(x => x === w).length * idf[j]); if (st.norm) { const n = Math.hypot(...v) || 1; return v.map(x => x / n); } return v; });
      const q = tok(QUERIES[st.q]), qv = (() => { const v = VOCAB.map((w, j) => q.filter(x => x === w).length * idf[j]); const n = Math.hypot(...v) || 1; return v.map(x => x / n); })();
      const score = vec.map(v => v.reduce((a, x, j) => a + x * qv[j], 0));
      return { vec, score, idf, D };
    }
    function draw() {
      R = vectors();
      const mx = Math.max(...R.vec.flat(), 1e-6);
      const best = R.score.indexOf(Math.max(...R.score));
      R.vec.forEach((v, i) => v.forEach((x, j) => { const c = cells[i][j], h = Math.max(0.005, x / mx * 0.6); c.b.scale.y = h; c.m.color.set(i === best ? C.gold : VOCAB[j] === 'market' || VOCAB[j] === 'the' ? '#8E91A3' : C.teal); }));
      const z = RZ0 + (best + 0.5) * RH, x0 = GX0 - 0.05, x1 = GX0 + VOCAB.length * CW + 0.05;
      hl.geometry.dispose(); hl.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0, 0.06, z - RH / 2), V(x1, 0.06, z - RH / 2), V(x1, 0.06, z + RH / 2), V(x0, 0.06, z + RH / 2)], true, 'catmullrom', 0), 16, 0.012, 4, true);
      notes.forEach((m, i) => m.color.set(i === best ? C.gold : '#C9A27A'));
      R.best = best;
    }
    draw();
    const RIGHT = [0, 3, 3];
    const controls = [
      { type: 'buttons', label: 'Search for', options: QUERIES, get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Weigh words by rarity (IDF)', short: 'IDF', get: () => st.idf, set: v => { st.idf = v; draw(); } },
      { type: 'toggle', label: 'Normalise notice length', short: 'normalise', get: () => st.norm, set: v => { st.norm = v; draw(); } },
      { type: 'toggle', label: 'Swap words in notice 6', short: 'swap words', get: () => st.swap, set: v => { st.swap = v; draw(); } },
    ];
    const readouts = [
      { label: 'Top result', get: () => ({ v: `notice ${R.best + 1}`, sub: `for "${QUERIES[st.q]}"`, good: R.best === RIGHT[st.q], bad: R.best !== RIGHT[st.q] }) },
      { label: '"market" weight', get: () => ({ v: R.idf[0].toFixed(2), sub: `on 5 of 6 notices; "goat" ${R.idf[6].toFixed(2)}`, good: st.idf, bad: !st.idf }) },
      { label: 'Word order', get: () => ({ v: st.swap ? 'lost' : 'not tested', sub: st.swap ? 'swapped notice looks identical' : 'turn on swap words', bad: st.swap }) },
    ];
    const labels = [
      { name: 'grid', t: 'Notice × word', d: 'Height: how much the word counts', icon: 'box', atV: V(GX0 + VOCAB.length * CW + 0.1, 0.2, RZ0 + 0.3) },
      { name: 'search', t: 'Search', d: 'Gold row: the best match', icon: 'target', atV: V(QX + 0.3, 0.25, 0.85) },
    ];
    const reset = () => { Object.assign(st, { idf: true, norm: true, q: 0, swap: false }); draw(); };
    const breaks = [
      { label: 'Raw counts, no IDF', hint: 'Search "goat at the market"', on: () => { reset(); st.idf = false; st.norm = false; st.q = 2; draw(); }, off: reset },
      { label: 'No length normalisation', hint: 'Search "market today"', on: () => { reset(); st.norm = false; st.q = 0; draw(); }, off: reset },
      { label: 'Word order lost', hint: 'Swap the words in notice 6', on: () => { reset(); st.swap = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.swap) return { ok: false, msg: `<b>Opposite notices, identical numbers.</b> "Buy matoke not maize" and "buy maize not matoke" contain exactly the same words, so their bags of words are identical and no search or classifier built on them can tell them apart. Order matters; n-grams help a little, sequence models a lot.` };
      if (!st.idf && R.best !== RIGHT[st.q]) return { ok: false, msg: `<b>"market" swamps everything.</b> Without IDF, every word counts the same, so notice ${R.best + 1}, which says "market" again and again, scores highest whatever you search. A word that appears in every notice tells them apart least; IDF weighs it at about ${(Math.log(7 / 6) + 1).toFixed(2)} times its count while rare words like "goat" weigh about ${(Math.log(7 / 2) + 1).toFixed(1)} times.` };
      if (!st.norm && R.best !== RIGHT[st.q]) return { ok: false, msg: `<b>The longest notice wins.</b> Without length normalisation, notice ${R.best + 1} scores higher just by having more words, even though notice ${RIGHT[st.q] + 1} is the better match. Scaling every notice\'s vector to the same length compares what they say, not how much.` };
      return { ok: true, msg: `<b>Notice ${R.best + 1} for "${QUERIES[st.q]}".</b> Rare words carry the weight, "market" and "the" barely count, and every notice is the same length as a vector, so the search ranks by what each notice is about.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Six notices', home: true, say: 'Six notices on a market board in Kampala. To search them, each becomes a row of numbers: how often each word appears.', act: m => m.set({ idf: false, norm: false, q: 0, swap: false }) },
    { t: 'A bag of words', home: true, say: 'One row per notice, one column per word, and the height of each block is the count. Order is thrown away: only the counts remain.', act: m => m.set({}) },
    { t: 'Common words dominate', home: true, say: 'Search for "goat at the market" with raw counts, and the notice that says "market" most wins, not the one about the goat. "Market" is on every notice; it tells them apart least.', act: m => m.set({ q: 2 }) },
    { t: 'Weigh by rarity', home: true, say: 'TF IDF multiplies each count by how rare the word is across notices. "Market" shrinks to almost nothing; "goat" stands tall, and the right notice wins.', act: m => m.set({ idf: true, norm: true, q: 2 }) },
    { t: 'Length', home: true, say: 'Search "market today" without normalising, and the long notice wins by size alone. Normalising every notice to the same length fixes it.', act: m => m.set({ q: 0, norm: false }) },
    { t: 'What it cannot see', home: true, say: 'And swap two words in notice six: "buy maize, not matoke". The meaning flips; the numbers do not change at all.', act: m => m.set({ norm: true, swap: true }) },
  ],
  check: [
    { q: 'What does a bag of words store for each document?', options: ['How many times each vocabulary word appears', 'The order of the words', 'The meaning of each sentence'], answer: 0, why: 'Order is thrown away.' },
    { q: 'What does IDF do?', options: ['Weighs down words that appear in many documents', 'Counts words twice', 'Sorts words alphabetically'], answer: 0, why: 'Rare words tell documents apart.' },
    { q: 'Why can a bag of words not tell "buy maize not matoke" from "buy matoke not maize"?', options: ['Both contain exactly the same words', 'One is longer', 'IDF removes them'], answer: 0, why: 'Order is lost.' },
  ],
  terms: [
    ['Bag of words', 'A document represented by word counts, ignoring order.'],
    ['Term frequency', 'How often a word appears in a document.'],
    ['Inverse document frequency', 'A weight that is high for words found in few documents.'],
    ['TF-IDF', 'Term frequency multiplied by inverse document frequency.'],
    ['Cosine similarity', 'How aligned two vectors are, ignoring length.'],
    ['N-gram', 'A run of n consecutive words, which keeps some order.'],
  ],
  deeper: '<p><b>Still useful.</b> TF-IDF and its cousin BM25 remain strong baselines for search, and many retrieval systems combine them with embeddings because they match rare names and codes exactly.</p><p><b>Sparse and wide.</b> Real vocabularies have tens of thousands of words, and each document uses only a few, so these vectors are stored as sparse lists of non-zero entries.</p><p><b>About this machine.</b> The counts, IDF weights, normalisation and cosine scores are computed exactly on the six notices.</p>',
  code: {
    title: 'TF-IDF and cosine search',
    note: 'Adapted from the course\'s bag of words lesson.',
    text: `
import math, re
from collections import Counter

def tfidf(docs):
    toks = [re.findall(r"[a-z]+", d.lower()) for d in docs]
    vocab = sorted({w for t in toks for w in t})
    n = len(docs)
    df = {w: sum(w in t for t in toks) for w in vocab}
    idf = {w: math.log((1 + n) / (1 + df[w])) + 1 for w in vocab}
    vecs = []
    for t in toks:
        c = Counter(t)
        v = [c[w] * idf[w] for w in vocab]
        norm = math.sqrt(sum(x * x for x in v)) or 1
        vecs.append([x / norm for x in v])            # unit length: no long-document bias
    return vocab, idf, vecs
`,
  },
};
