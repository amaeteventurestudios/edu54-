// Topic modelling: sixteen text messages sent to a farm radio show heard in Ghana, Malawi, Kenya and Nigeria. Real LDA (collapsed Gibbs sampling, seeded) runs live:
// each column is one message's topic mixture, each board behind is a topic's top words. Topic diversity and UMass coherence are computed live.
// Break it: keep stop words ("the", "and", "is" become topics), too few topics (armyworm and maize prices merge), one topic per message (a mixed message loses half its meaning).
const MSG = [
  'the rains are late in Tamale and the soil is dry', 'rain came late this season so planting is late', 'dry spell again and no rain for three weeks', 'when will the rains start in Lilongwe',
  'maize price at the market is very low', 'traders pay a low price for our maize', 'where can we sell maize for a better price', 'buyers at the Kisumu market want dry maize',
  'armyworm is eating the leaves of my maize', 'how do we spray for armyworm', 'holes in the leaves and the pest is spreading', 'which spray kills the pest on the leaves',
  'rains are late and the price of maize is going up', 'armyworm came after the rain', 'is there a market for maize in Kano', 'the leaves are full of armyworm and holes',
];
const STOP = new Set('the and is are in of for a at to my our we so how do when will where can which this there very no on after again came want going up'.split(' '));
const PICK = [0, 12, 8];   // messages the learner can look at: rain, rain and prices, armyworm
function lda(K, keepStop, iters = 300, alpha = 0.3, beta = 0.05) {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const docs = MSG.map(m => m.toLowerCase().split(' ').filter(w => keepStop || !STOP.has(w)).map(w => (w === 'rains' ? 'rain' : w)));
  const V = [...new Set(docs.flat())], vi = Object.fromEntries(V.map((w, i) => [w, i]));
  const nd = docs.map(() => Array(K).fill(0)), nw = V.map(() => Array(K).fill(0)), nk = Array(K).fill(0);
  const z = docs.map((d, di) => d.map(w => { const k = Math.floor(rnd() * K); nd[di][k]++; nw[vi[w]][k]++; nk[k]++; return k; }));
  const p = Array(K);
  for (let it = 0; it < iters; it++) docs.forEach((d, di) => d.forEach((w, j) => {
    const v = vi[w]; let k = z[di][j]; nd[di][k]--; nw[v][k]--; nk[k]--;
    let s = 0; for (let t = 0; t < K; t++) { p[t] = (nd[di][t] + alpha) * (nw[v][t] + beta) / (nk[t] + V.length * beta); s += p[t]; }
    let u = rnd() * s; k = 0; while (k < K - 1 && u > p[k]) { u -= p[k]; k++; }
    z[di][j] = k; nd[di][k]++; nw[v][k]++; nk[k]++;
  }));
  const top = [...Array(K)].map((_, k) => V.map((w, i) => [nw[i][k], w]).sort((a, b) => b[0] - a[0]).slice(0, 4).map(x => x[1]));
  const mix = nd.map(r => { const s = r.reduce((a, b) => a + b, 0) + K * alpha; return r.map(x => (x + alpha) / s); });
  // UMass coherence over each topic's top words, from document co-occurrence (closer to zero is better)
  const has = w => docs.map(d => d.includes(w));
  let coh = 0, n = 0; top.forEach(T => { for (let i = 1; i < T.length; i++) for (let j = 0; j < i; j++) { const a = has(T[i]), b = has(T[j]); const both = a.filter((x, q) => x && b[q]).length, dj = b.filter(Boolean).length; coh += Math.log((both + 1) / dj); n++; } });
  const div = new Set(top.flat()).size / top.flat().length;
  return { top, mix, coh: coh / n, div };
}

export default {
  slug: 'topic-modeling',
  title: 'Topic modelling: what are people asking?',
  description: 'Sixteen text messages reach a farm radio show. LDA finds the topics on its own: each message a column of colours, each topic a stack of its top words.',
  overview: 'Topic modelling finds what a pile of text is about without labels. Latent Dirichlet Allocation imagines each topic as a spread of words and each document as a mixture of topics; Gibbs sampling then reassigns every word to a topic again and again until the assignments settle. The results are a mixture for each document and top words for each topic. Stop words must go first, or the commonest words take over. The number of topics is a choice: too few merges different subjects, too many splits one into fragments. BERTopic is the modern alternative for short text: it embeds each document, clusters the vectors and names clusters with class-based TF-IDF, but gives each document just one topic. Topics are judged by coherence, whether top words appear together, and diversity, whether topics share words, and finally by reading them.',
  keywords: ['topic modelling', 'lda', 'gibbs sampling', 'bertopic', 'topic coherence', 'topic diversity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, 0.3], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { K: 3, stop: false, hard: false, msg: 1 };
    const cache = {}, fit = () => { const key = `${st.K}${st.stop}`; return cache[key] || (cache[key] = lda(st.K, st.stop)); };
    const TC = [C.teal, C.orange, '#3B3F8F', '#C2185B', '#7CB342', '#8D6E63'];
    /* four word blocks per topic behind: red ones are stopwords that crept in */
    const boards = TC.map((col, k) => {
      const g = new THREE.Group(); S.add(g);
      const pad = P.box(0.9, 0.04, 0.5, col, { r: 0.03 }); pad.position.set(0, 0, 0.7); g.add(pad);
      const words = [0, 1, 2, 3].map(i => { const m = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), b = P.box(0.18, 0.2, 0.3, '#fff', { r: 0.02, material: m }); b.position.set(-0.3 + i * 0.2, 0.04, 0.7); g.add(b); return m; });
      return { g, words };
    });
    /* sixteen message columns: stacked topic shares */
    const CX = i => -2.66 + i * 0.355, CZ = 0.05, CH = 0.9;
    const cols = MSG.map((m, i) => {
      const pl = P.box(0.3, 0.06, 0.3, '#D8D0BE', { r: 0.03 }); pl.position.set(CX(i), 0, CZ); S.add(pl);
      const segs = TC.map(col => { const mm = new THREE.MeshLambertMaterial({ color: col }), s = P.box(0.22, 1, 0.22, col, { r: 0.015, material: mm }); s.userData.noFit = true; S.add(s); return s; });
      return { segs, pl };
    });
    S.add(P.keep(-2.9, 2.9, 1.0, -0.3, 1.05));
    const ring = P.box(0.36, 0.03, 0.36, '#F2C94C', { r: 0.03 }); ring.userData.noFit = true; ring.position.y = 0.06; S.add(ring);

    let F = null;
    const name = k => F.top[k][0];
    const shares = i => { const m = F.mix[i]; if (!st.hard) return m; const a = m.indexOf(Math.max(...m)); return m.map((_, k) => (k === a ? 1 : 0)); };
    function draw() {
      F = fit();
      boards.forEach((B, k) => { const on = k < st.K; B.g.visible = on; if (!on) return; B.g.position.x = (k - (st.K - 1) / 2) * 1.08; F.top[k].forEach((w, i) => B.words[i].color.set(STOP.has(w) ? C.red : '#FBF8F1')); });
      cols.forEach((c, i) => { const sh = shares(i); let y = 0.09; c.segs.forEach((s, k) => { const h = k < st.K ? sh[k] * CH : 0; s.visible = h > 0.005; s.scale.y = Math.max(0.001, h); s.position.set(CX(i), y, CZ); y += h; }); });
      ring.position.x = CX(PICK[st.msg]); ring.position.z = CZ;
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Topics', options: ['2', '3', '4', '6'], get: () => [2, 3, 4, 6].indexOf(st.K), act: i => { st.K = [2, 3, 4, 6][i]; draw(); } },
      { type: 'buttons', label: 'Message', options: ['Rain late', 'Rain and prices', 'Armyworm'], get: () => st.msg, act: i => { st.msg = i; draw(); } },
      { type: 'toggle', label: 'Remove stop words', short: 'stop words', get: () => !st.stop, set: v => { st.stop = !v; draw(); } },
      { type: 'buttons', label: 'Each message gets', options: ['A mixture', 'One topic'], get: () => (st.hard ? 1 : 0), act: i => { st.hard = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Coherence', get: () => ({ v: F.coh.toFixed(2), sub: 'UMass, nearer 0 is better', good: F.coh > -0.9, bad: F.coh < -1.2 }) },
      { label: 'Diversity', get: () => ({ v: `${Math.round(F.div * 100)}%`, sub: 'top words not shared', bad: F.div < 0.85 }) },
      { label: 'Topics', get: () => ({ v: String(st.K), sub: F.top.map(t => t[0]).join(', ') }) },
    ];
    const labels = [
      { name: 'topics', t: 'Topics', d: 'Each with its top words', icon: 'book', atV: V(1.1, 0.1, 0.7) },
      { name: 'mix', t: 'Sixteen messages', d: 'Colours: the topic mix of each', icon: 'chart', atV: V(-2.78, 0.3, 0.05) },
    ];
    const reset = () => { Object.assign(st, { K: 3, stop: false, hard: false, msg: 1 }); draw(); };
    const breaks = [
      { label: 'Keep stop words', hint: 'Look at the top words', on: () => { reset(); st.stop = true; draw(); }, off: reset },
      { label: 'Too few topics', hint: 'Ask for two', on: () => { reset(); st.K = 2; st.msg = 2; draw(); }, off: reset },
      { label: 'One topic per message', hint: 'Look at message 13', on: () => { reset(); st.hard = true; draw(); }, off: reset },
    ];
    function status() {
      const tw = F.top.map(t => `"${t.join(', ')}"`).join('; ');
      if (st.stop) return { ok: false, msg: `<b>The commonest words became topics.</b> With stop words kept, the top words are ${tw}. "The", "and" and "is" appear in nearly every message, so they swamp the words that carry meaning. UMass coherence hardly notices (${F.coh.toFixed(2)}), because common words appear together everywhere: that is why people still read the topics. Remove stop words before counting.` };
      if (st.K === 2) { const pests = F.top.findIndex(t => t.includes('armyworm')); return { ok: false, msg: `<b>Two subjects squeezed into one topic.</b> With only two topics, topic ${pests + 1} reads "${F.top[pests].join(', ')}": armyworm and maize prices share a topic, so a report would mix up a pest outbreak with a market slump. Try three.` }; }
      if (st.hard && PICK[st.msg] === 12) return { ok: false, msg: `<b>Half the message is lost.</b> "Rains are late and the price of maize is going up" is about both rain and prices, but with one topic per message it counts only as topic ${shares(12).indexOf(1) + 1} (${name(shares(12).indexOf(1))}). Clustering methods like BERTopic work this way; LDA's mixtures keep both.` };
      if (st.K === 6) return { ok: false, msg: `<b>Too many topics split into fragments.</b> Six topics share top words, diversity is ${Math.round(F.div * 100)}%, and some, like "${F.top.find(t => !t.includes('armyworm') && !t.includes('price') && !t.includes('rain'))?.join(', ') || F.top[0].join(', ')}", are a jumble of leftover words. Read the topics and pick the number that names real things.` };
      return { ok: true, msg: `<b>${st.K} topics: ${F.top.map((t, k) => `${k + 1}. ${t.slice(0, 3).join(', ')}`).join('; ')}.</b> Nobody labelled the messages: LDA found them. Coherence ${F.coh.toFixed(2)}, diversity ${Math.round(F.div * 100)}%.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Sixteen messages', home: true, say: 'A farm radio show heard from Ghana to Malawi gets text messages. Nobody has time to read them all. What are people asking about?', act: m => m.set({ K: 3, stop: false, hard: false, msg: 0 }) },
    { t: 'Topics appear', home: true, say: 'LDA reassigns every word to a topic, again and again, until it settles. Three topics appear on their own: rain, maize prices and armyworm.', act: m => m.set({ msg: 2 }) },
    { t: 'A mixture', home: true, say: 'Message thirteen says the rains are late and the price of maize is going up. LDA gives it a mixture of the rain and price topics.', act: m => m.set({ msg: 1 }) },
    { t: 'Stop words', home: true, say: 'Keep the stop words, and the, and, and is take over the topics. They appear everywhere and mean nothing.', act: m => m.set({ stop: true }) },
    { t: 'How many topics?', home: true, say: 'Ask for two topics, and armyworm and maize prices share one. Ask for six, and topics split into fragments that share words.', act: m => m.set({ stop: false, K: 2, msg: 2 }) },
    { t: 'Judge the topics', home: true, say: 'Coherence checks that top words appear together. Diversity checks topics do not overlap. Then read them: do they name real things?', act: m => m.set({ K: 3, msg: 1 }) },
  ],
  check: [
    { q: 'In LDA, what is a document?', options: ['A mixture of topics', 'Exactly one topic', 'A list of stop words'], answer: 0, why: 'Each message gets a share of every topic.' },
    { q: 'Why remove stop words before LDA?', options: ['Common words like "the" would dominate every topic', 'They are spelled wrongly', 'LDA cannot read short words'], answer: 0, why: 'They appear everywhere and carry no subject.' },
    { q: 'What goes wrong with too few topics?', options: ['Different subjects merge into one topic', 'Topics split into fragments', 'Messages get no topic'], answer: 0, why: 'Too many topics causes fragments instead.' },
  ],
  terms: [
    ['Topic model', 'A method that finds themes in text without labels.'],
    ['LDA', 'Latent Dirichlet Allocation: topics as word spreads, documents as topic mixtures.'],
    ['Gibbs sampling', 'Reassigning each word to a topic in turn until assignments settle.'],
    ['BERTopic', 'Embed, cluster and name clusters; one topic per document.'],
    ['Coherence', 'How often a topic\'s top words appear together.'],
    ['Diversity', 'Share of top words not repeated across topics.'],
  ],
  deeper: '<p><b>Choosing a method.</b> For short texts like messages and reviews, BERTopic\'s embeddings handle words that differ but mean the same. For long reports that cover several subjects, LDA\'s mixtures fit better, and it runs without a GPU.</p><p><b>Naming topics.</b> Top words are not names. A person, or a language model given the top words and a few example messages, writes "pest outbreaks" for "armyworm, leaves, spray, pest".</p><p><b>About this machine.</b> The LDA here is real collapsed Gibbs sampling with a fixed seed, run in your browser over the sixteen messages; coherence and diversity are computed from its output.</p>',
  code: {
    title: 'LDA with scikit-learn',
    note: 'Adapted from the course\'s topic modelling lesson.',
    text: `
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import numpy as np

cv = CountVectorizer(stop_words="english", min_df=2, max_df=0.9)
X = cv.fit_transform(messages)                 # LDA wants raw counts
lda = LatentDirichletAllocation(n_components=3, random_state=42)
doc_topic = lda.fit_transform(X)               # each row: a message's topic mixture

words = cv.get_feature_names_out()
for k, topic in enumerate(lda.components_):
    print(k, [words[i] for i in np.argsort(-topic)[:4]])
`,
  },
};
