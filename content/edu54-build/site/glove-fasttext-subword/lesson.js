// GloVe, FastText and subword embeddings, with Swahili words from a school in Mombasa. A table map places each known word by its vector: related words sit together.
// A word the model never saw in training, "wanafunzi" (students), arrives. A word-level model has no vector for it and drops it at <unk>. FastText builds one from its character
// pieces (wan, ana, naf, afu, …), which it shares with "mwanafunzi" (student), so it lands right beside it. On the right, GloVe's co-occurrence board: how often words appear near each other.
// Break it: a word-level model with an unseen word (it falls to <unk>), pieces of one letter (every word shares letters, so the new word lands nowhere useful),
// GloVe on raw counts with no log (the very common "na", meaning "and", pulls every word towards itself).
const KNOWN = [
  { w: 'mwanafunzi', p: [-1.2, 0.6], g: 'school' }, { w: 'mwalimu', p: [-0.7, 0.95], g: 'school' }, { w: 'walimu', p: [-0.55, 1.15], g: 'school' }, { w: 'shule', p: [-1.0, 1.2], g: 'school' },
  { w: 'kitabu', p: [-0.2, 0.3], g: 'book' }, { w: 'vitabu', p: [-0.05, 0.45], g: 'book' }, { w: 'kalamu', p: [0.1, 0.1], g: 'book' },
  { w: 'chakula', p: [1.0, -0.6], g: 'food' }, { w: 'maji', p: [1.3, -0.3], g: 'food' }, { w: 'wali', p: [0.85, -0.95], g: 'food' },
  { w: 'na', p: [0.2, -0.2], g: 'common' },
];
const NEW = 'wanafunzi', MEANING = 'students';
const GCOL = { school: '#3D6BD6', book: '#E3A72F', food: '#3E9B5F', common: '#8E91A3' };
function grams(w, nmin, nmax) { const s = `<${w}>`, out = new Set(); for (let n = nmin; n <= nmax; n++) for (let i = 0; i + n <= s.length; i++) out.add(s.slice(i, i + n)); return out; }
const jac = (a, b) => { let i = 0; a.forEach(x => { if (b.has(x)) i++; }); return i / (a.size + b.size - i); };

export default {
  slug: 'glove-fasttext-subword',
  title: 'GloVe and FastText: vectors for words',
  description: 'Swahili words from a school in Mombasa, each placed on a map by its meaning. An unseen word has no place in GloVe, but FastText can build one from its pieces.',
  overview: 'Word embeddings give every word a vector so that words used in similar contexts end up close together. GloVe gets its vectors by factorising a table of how often each pair of words appears near each other, using the logarithm of the counts so that very common pairs do not dominate. Word-level models, GloVe and word2vec alike, have nothing to offer for a word they never saw. FastText represents each word as the sum of vectors for its character n-grams, so an unseen word still gets a sensible vector from the pieces it shares with known words, which matters greatly for languages like Swahili where one root takes many prefixes and suffixes. Subword tokenisers such as BPE take the same idea further.',
  keywords: ['glove embeddings', 'fasttext subword', 'out of vocabulary words', 'character n-grams', 'co-occurrence matrix'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.2, 0], dir: [0.05, 1.05, 1.05], half: 1.1, wide: 5.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { model: 'fasttext', n: 3, logc: true };
    /* ---------- the map ---------- */
    const MX = -1.0, MS = 1.15, map = P.box(3.9, 0.04, 2.6, '#FBF8F1', { r: 0.04 }); map.position.set(MX, 0, 0.05); S.add(map);
    const X = p => MX + p[0] * MS, Z = p => 0.05 - p[1] * MS * 0.8, Y0 = 0.05;
    const dots = KNOWN.map(k => { const m = new THREE.MeshLambertMaterial({ color: GCOL[k.g] }), b = P.ball(0.09, GCOL[k.g]); b.material = m; b.userData.noFit = true; S.add(b); return { b, k }; });
    const unk = P.box(0.3, 0.1, 0.3, '#5B6178', { r: 0.04 }); unk.position.set(X([1.3, 0.9]), 0.04, Z([1.3, 0.9])); S.add(unk);
    const newB = P.ball(0.085, C.red); newB.userData.noFit = true; S.add(newB);
    const link = P.tube([V(), V(1, 0, 0)], 0.01, C.red); link.userData.noFit = true; S.add(link);
    /* ---------- co-occurrence towers ---------- */
    const CX = 2.1, CN = 6, CS = 0.27;
    const cells = [];
    for (let i = 0; i < CN; i++) for (let j = 0; j < CN; j++) { const m = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), c = P.tower(CS * 0.82, CS * 0.82, '#fff', { h: 0.1 }); c.userData.set({ cap: '' }); c.position.set(CX - CN * CS / 2 + (j + 0.5) * CS, 0, -0.2 - CN * CS / 2 + (i + 0.5) * CS); S.add(c); cells.push(c); }
    S.add(P.keep(-3.0, 3.0, 0.8, -1.25, 1.35));
    const COUNTS = [[0, 40, 22, 6, 4, 310], [40, 0, 30, 8, 5, 290], [22, 30, 0, 5, 3, 260], [6, 8, 5, 0, 35, 330], [4, 5, 3, 35, 0, 300], [310, 290, 260, 330, 300, 0]];
    /* ---------- maths ---------- */
    let R = null;
    function place() {
      // the known words' map positions: with raw counts, "na" dominates and every word is dragged towards it
      return KNOWN.map(k => (st.logc || k.w === 'na' ? k.p : [k.p[0] * 0.22 + 0.2 * 0.78, k.p[1] * 0.22 - 0.2 * 0.78]));
    }
    function draw() {
      const pos = place();
      dots.forEach((d, i) => { d.b.position.set(X(pos[i]), Y0 + 0.04, Z(pos[i])); });
      let p, sims = [];
      if (st.model === 'word') p = [1.3, 0.9];
      else {
        const gn = grams(NEW, st.n, st.n === 1 ? 1 : 6);
        sims = KNOWN.map((k, i) => ({ i, s: jac(gn, grams(k.w, st.n, st.n === 1 ? 1 : 6)) })).sort((a, b) => b.s - a.s);
        const top = sims.slice(0, 3), tot = top.reduce((a, x) => a + x.s, 0) || 1;
        p = [0, 1].map(d => top.reduce((a, x) => a + pos[x.i][d] * x.s, 0) / tot);
      }
      newB.position.set(X(p), Y0 + 0.06, Z(p));
      const near = KNOWN.map((k, i) => ({ k, d: Math.hypot(pos[i][0] - p[0], pos[i][1] - p[1]) })).sort((a, b) => a.d - b.d)[0];
      link.visible = st.model === 'fasttext'; if (link.visible) { link.geometry.dispose(); link.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(V(X(p), Y0 + 0.06, Z(p)), V(X(pos[KNOWN.indexOf(near.k)]), Y0 + 0.06, Z(pos[KNOWN.indexOf(near.k)]))), 2, 0.01, 4, false); }
      const mx = st.logc ? Math.log(331) : 330;
      COUNTS.forEach((row, i) => row.forEach((c, j) => { const v = st.logc ? Math.log(1 + c) / mx : c / mx; cells[i * CN + j].userData.set({ h: Math.max(0.02, v * 0.7), color: i === j ? '#E4DED2' : C.indigo }); }));
      R = { near: near.k.w, nearD: near.d, top: sims[0] };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Model', options: ['FastText (pieces)', 'Word-level only'], get: () => (st.model === 'fasttext' ? 0 : 1), act: i => { st.model = i ? 'word' : 'fasttext'; draw(); } },
      { type: 'buttons', label: 'Smallest piece size', options: ['3 letters', '1 letter'], get: () => (st.n === 3 ? 0 : 1), act: i => { st.n = i ? 1 : 3; draw(); } },
      { type: 'toggle', label: 'GloVe uses log counts', short: 'log counts', get: () => st.logc, set: v => { st.logc = v; draw(); } },
    ];
    const readouts = [
      { label: '"wanafunzi" lands near', get: () => ({ v: st.model === 'word' ? '<unk>' : R.near, sub: 'should be mwanafunzi', good: R.near === 'mwanafunzi' && st.model === 'fasttext', bad: st.model === 'word' || R.near !== 'mwanafunzi' }) },
      { label: 'Shared pieces', get: () => ({ v: st.model === 'word' ? '–' : `${Math.round(R.top.s * 100)}%`, sub: `with ${KNOWN[R.top ? R.top.i : 0].w}` }) },
      { label: 'Map', get: () => ({ v: st.logc ? 'spread out' : 'crushed onto "na"', good: st.logc, bad: !st.logc }) },
    ];
    const labels = [
      { name: 'map', t: 'The embedding map', d: 'Colour: school, books, food', icon: 'target', atV: V(MX - 1.9, 0.08, 0.05) },
      { name: 'glove', t: 'Co-occurrence', d: 'Taller: seen together more', icon: 'box', atV: V(CX + 0.84, 0.3, -0.2) },
    ];
    const reset = () => { Object.assign(st, { model: 'fasttext', n: 3, logc: true }); draw(); };
    const breaks = [
      { label: 'Word-level model, unseen word', hint: 'No vector for "wanafunzi"', on: () => { reset(); st.model = 'word'; draw(); }, off: reset },
      { label: 'Pieces of one letter', hint: 'Character unigrams only', on: () => { reset(); st.n = 1; draw(); }, off: reset },
      { label: 'GloVe on raw counts', hint: 'No logarithm', on: () => { reset(); st.logc = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.model === 'word') return { ok: false, msg: `<b>Dropped at &lt;unk&gt;.</b> A word-level model only has vectors for words seen in training. "${NEW}" is just the plural of "mwanafunzi", but to this model it is a stranger, so it gets the same placeholder as every other unknown word and all its meaning is lost. In Swahili, where one root takes many prefixes, that happens constantly.` };
      if (st.n === 1) return { ok: false, msg: `<b>Every word shares letters.</b> Built from single letters, "${NEW}" overlaps a little with almost everything (a, n, i, u…), so its vector is a vague average that lands nearest "${R.near}". Pieces of three to six letters, like "naf" and "fun", carry enough of the word to find its true relatives.` };
      if (!st.logc) return { ok: false, msg: `<b>"na" pulls everything in.</b> "Na" (and) appears beside every word hundreds of times, far more than any meaningful pair. Fitting raw counts, GloVe spends its effort on those huge numbers, and every word's vector bends towards "na": the school, book and food groups crush together. Taking the logarithm of the counts, and down-weighting very frequent pairs, lets the meaningful patterns show.` };
      return { ok: true, msg: `<b>Landed beside "mwanafunzi".</b> FastText never saw "${NEW}", but it shares ${Math.round(R.top.s * 100)}% of its character pieces with "mwanafunzi", so the sum of its piece vectors places it in the school group, next to its singular. On the right, GloVe\'s log counts keep "na" from drowning the pairs that matter.` };
    }
    return { update: dt => { cells.forEach(c => c.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Words on a map', home: true, say: 'Swahili words from a school in Mombasa, placed by their vectors. Words used alike sit together: school words, book words, food words.', act: m => m.set({ model: 'fasttext', n: 3, logc: true }) },
    { t: 'GloVe', home: true, say: 'GloVe builds these vectors from a table of how often words appear near each other, using the logarithm of the counts.', act: m => m.set({}) },
    { t: 'An unseen word', home: true, say: 'Then comes "wanafunzi", students, a word the training text never contained. A word level model has no vector for it.', act: m => m.set({ model: 'word' }) },
    { t: 'FastText', home: true, say: 'FastText breaks every word into character pieces and adds up their vectors. "Wanafunzi" shares most of its pieces with "mwanafunzi", so it lands right beside it.', act: m => m.set({ model: 'fasttext' }) },
    { t: 'Pieces too small', home: true, say: 'Use single letters as pieces, and every word overlaps every other. The new word lands nowhere useful.', act: m => m.set({ n: 1 }) },
    { t: 'Why the log', home: true, say: 'And train GloVe on raw counts, and "na", meaning "and", appears so often that it drags every word towards itself.', act: m => m.set({ n: 3, logc: false }) },
  ],
  check: [
    { q: 'What does GloVe factorise?', options: ['A table of how often words appear near each other', 'A list of letters', 'Sentence lengths'], answer: 0, why: 'Its log counts become word vectors.' },
    { q: 'How does FastText give a vector to a word it never saw?', options: ['It adds up vectors of the word\'s character n-grams', 'It copies the nearest word', 'It uses a random vector'], answer: 0, why: 'Shared pieces mean shared meaning.' },
    { q: 'Why does GloVe use the log of the counts?', options: ['So very frequent pairs like "na" do not dominate', 'To save memory', 'To remove rare words'], answer: 0, why: 'Raw counts would bend every vector towards common words.' },
  ],
  terms: [
    ['Word embedding', 'A vector for each word, placing similar words close together.'],
    ['Co-occurrence', 'Two words appearing near each other in text.'],
    ['GloVe', 'Embeddings from factorising log co-occurrence counts.'],
    ['FastText', 'Embeddings built from character n-grams, so unseen words get vectors.'],
    ['Out-of-vocabulary', 'A word the model never saw in training.'],
    ['Character n-gram', 'A run of n letters within a word.'],
  ],
  deeper: '<p><b>Agglutinative languages.</b> Swahili builds words from parts: "wa-na-funzi", "m-walimu", "vi-tabu". Subword methods suit such languages far better than whole-word vocabularies.</p><p><b>From here to transformers.</b> These vectors are static: "benki" (bank) has one vector whatever the sentence. Contextual models give each occurrence its own vector.</p><p><b>About this machine.</b> The known words\' positions are set by hand; the unseen word\'s place is computed from real character n-gram overlaps.</p>',
  code: {
    title: 'A FastText-style vector for an unseen word',
    note: 'Adapted from the course\'s subword embeddings lesson.',
    text: `
import numpy as np

def ngrams(word, nmin=3, nmax=6):
    w = f"<{word}>"
    return [w[i:i + n] for n in range(nmin, nmax + 1) for i in range(len(w) - n + 1)]

def word_vector(word, gram_vectors, dim=100):
    grams = [g for g in ngrams(word) if g in gram_vectors]
    if not grams:
        return np.zeros(dim)
    return np.mean([gram_vectors[g] for g in grams], axis=0)   # works for words never seen

print(ngrams("wanafunzi")[:8])   # ['<wa', 'wan', 'ana', 'naf', 'afu', 'fun', 'unz', 'nzi']
`,
  },
};
