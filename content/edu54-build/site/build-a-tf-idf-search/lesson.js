// Build it yourself: TF-IDF search (after Finding Important Words in Text Using TF-IDF, CC BY 4.0). A Nairobi clinic's notices. Real tf, idf and scoring over six small documents; stop words and rare words change the ranking. Towers show each document's score.
const DOCS = [['Malaria clinic', 'the malaria clinic opens on monday and the nurse tests for malaria'], ['Water notice', 'the water supply stops on monday in the morning'], ['Vaccine day', 'the nurse gives the vaccine on friday at the clinic'], ['Bus change', 'the bus to the clinic leaves at seven in the morning'], ['Market hours', 'the market opens on friday and the stalls sell fruit'], ['Rain warning', 'the rain will flood the road to the market on monday']];
const toks = t => t.split(' '), STOP = new Set(['the', 'on', 'and', 'in', 'at', 'to', 'for', 'will']);
const QS = ['malaria clinic', 'the monday', 'nurse vaccine', 'market rain'];
function run(o) {
  const D = DOCS.map(d => toks(d[1]).filter(w => !o.stop || !STOP.has(w))), N = D.length, q = toks(QS[o.q]).filter(w => !o.stop || !STOP.has(w));
  const df = w => D.filter(d => d.includes(w)).length, idf = w => (o.idf ? Math.log(N / (1 + df(w))) + 1 : 1), tf = (w, d) => { const c = d.filter(x => x === w).length; return o.len ? c / d.length : c; };
  const sc = D.map(d => q.reduce((a, w) => a + tf(w, d) * idf(w), 0)), top = sc.indexOf(Math.max(...sc));
  const terms = [...new Set(D[0])].map(w => [w, tf(w, D[0]) * idf(w)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { sc, top, q, terms, idfs: q.map(w => [w, idf(w)]), max: Math.max(...sc) };
}

export default {
  slug: 'build-a-tf-idf-search',
  title: 'Build your own TF-IDF search',
  description: 'A word counts if it\'s common here and rare everywhere else. That one idea ranks documents.',
  overview: 'Which words say what a document is about? Not "the". Count how often a word appears in a document: that\'s term frequency. Then count how many documents contain it, and take a log of the rarer side: that\'s inverse document frequency. Multiply the two. A word scores high when it\'s common here and rare elsewhere. Search then adds up those scores for the query words, and sorts. Dividing by length stops long documents from winning just for being long. This real scoring runs on six notices at a clinic in Nairobi. It finds no meanings at all, and yet it works very well.',
  keywords: ['TF-IDF', 'search', 'ranking', 'information retrieval', 'stop words', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { q: 0, idf: true, stop: true, len: true }, st = { ...D0 };
    const BLUE = '#5B8DB8', GOOD = '#1F9E89', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.85 + i * 0.74;
    const T = DOCS.map((d, i) => { const t = add(P.tower(0.5, 0.4, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.3, 2.3, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => t.userData.set({ h: Math.max(0.03, R.max ? (R.sc[i] / R.max) * 1.05 : 0.03), color: i === R.top && R.max ? GOOD : BLUE })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Search', options: QS, get: () => st.q, act: i => set({ q: i }) }, tg('idf', 'Weigh by rarity', 'Rarity'), tg('stop', 'Drop stop words', 'Stop words'), tg('len', 'Divide by length', 'Length')];
    const readouts = [
      { label: 'Top result', get: () => (R.max ? { v: DOCS[R.top][0], sub: `score ${R.sc[R.top].toFixed(3)}` } : { v: 'no match', bad: true }) },
      { label: 'Word weights', get: () => ({ v: R.idfs.map(x => `${x[0]} ${x[1].toFixed(2)}`).join(', ') || 'no words left' }) },
      { label: 'Top words in notice 1', get: () => ({ v: R.terms.map(x => x[0]).join(', ') }) },
    ];
    const labels = [
      { name: 'd', t: 'One tower per notice', d: 'Height: score for this search', icon: 'book', atV: V(X(0) - 0.27, 0.2, -0.1) },
      { name: 't', t: 'Teal: the top result', d: 'Blue: the rest', icon: 'target', atV: V(X(5) + 0.27, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No rarity weight', hint: 'common words dominate', on: () => set({ ...D0, q: 1, stop: false, idf: false }), off: reset },
      { label: 'Keep stop words', hint: '"the" gets counted', on: () => set({ ...D0, stop: false }), off: reset },
    ];
    function status() {
      if (!st.idf) return { ok: false, msg: '<b>Every word counts the same.</b> "the" appears everywhere, so it decides the ranking, and it says nothing.' };
      if (!st.stop) return { ok: false, msg: `<b>Top result: ${DOCS[R.top][0]}.</b> Stop words add little here, thanks to their low weight. They still waste time on every lookup.` };
      if (!R.max) return { ok: false, msg: '<b>No match.</b> Every query word was filtered out.' };
      return { ok: true, msg: `<b>Top result: ${DOCS[R.top][0]}.</b> No meaning involved, only counting.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'What is it about?', home: true, say: 'A clinic in Nairobi has a board of notices. Which words say what each is about?', act: m => m.set({ q: 0, idf: false, stop: false, len: true }) },
    { t: 'Count', home: true, say: 'Term frequency counts a word in one document.', act: m => m.set({ q: 1, idf: false, stop: false, len: true }) },
    { t: 'Rarity', home: true, say: 'Words in every notice say little, so weigh by how rare a word is.', act: m => m.set({ q: 1, idf: true, stop: false, len: true }) },
    { t: 'Stop words', home: true, say: 'Drop the most common words altogether.', act: m => m.set({ q: 1, idf: true, stop: true, len: true }) },
    { t: 'Length', home: true, say: 'Divide by length, so that long notices don\'t win by size.', act: m => m.set({ q: 0, idf: true, stop: true, len: true }) },
    { t: 'Just counting', home: true, say: 'There\'s no meaning here, only counting. It works very well.', act: m => m.set({ q: 2, idf: true, stop: true, len: true }) },
  ],
  check: [
    { q: 'What scores high?', options: ['Common here, rare elsewhere', 'Rare everywhere', 'Common everywhere'], answer: 0, why: 'That\'s tf times idf.', hint: 'See Rarity.' },
    { q: 'What does dividing by length stop?', options: ['Long documents winning by size', 'Short words', 'Stop words'], answer: 0, why: 'A rate is fairer than a count.', hint: 'See Length.' },
    { q: 'Does TF-IDF know meanings?', options: ['No, only counts', 'Yes', 'Only for nouns'], answer: 0, why: 'It sees only counts.', hint: 'See Just counting.' },
  ],
  terms: [['Term frequency', 'How often a word appears.'], ['IDF', 'A weight for rarity.'], ['Stop word', 'A very common word.'], ['Ranking', 'Sorting by score.']],
  deeper: '<p><b>Real scoring.</b> All scores are computed live.</p><p><b>Next.</b> BM25 refines this, and the hybrid retrieval lesson joins it with embeddings.</p>',
  credit: 'Built from <a href="https://stevenloria.com/tf-idf/" target="_blank" rel="noopener">Finding Important Words in Text Using TF-IDF</a> by Steven Loria (CC BY 4.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short version, after the article\'s Python.',
  code: {
    title: 'The score',
    note: 'Our own short version.',
    text: `
const tf = (w, doc) => doc.filter(x => x === w).length / doc.length;
const idf = (w, docs) => Math.log(docs.length / (1 + docs.filter(d => d.includes(w)).length)) + 1;
const score = (query, doc, docs) =>
  query.reduce((s, w) => s + tf(w, doc) * idf(w, docs), 0);
`,
  },
};
