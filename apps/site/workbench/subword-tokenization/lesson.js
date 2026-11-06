// Subword tokenization: four tokenizers learn from Swahili verb forms (ni-na-kula "I am eating", ni-me-soma "I have read", tu-ta-enda "we will go").
// Word-level, BPE (merge the most frequent pair), WordPiece (merge the pair with the best likelihood score) and Unigram (prune a big vocabulary, then pick the likeliest split)
// are all trained live, and each splits the chosen word on its own step. Break it: word-level on an unseen word ([UNK]), serve with a different vocabulary than training
// (the ids decode to other pieces), no merges at all (one token per letter).
const CORPUS = { ninakula: 5, nimekula: 4, tutakula: 3, ninasoma: 4, nimesoma: 3, tutasoma: 2, ninaenda: 4, nimeenda: 2, tutaenda: 3, ninapika: 2, nimepika: 2, tutapika: 1, ninacheza: 2, tutacheza: 1 };
const W = Object.entries(CORPUS), CHARS = [...new Set(W.flatMap(([w]) => w.split('')))].sort();
const WORDS = ['nimekula', 'nimecheza', 'tutaandika'];
const mergeAll = (s, a, b, ab) => { const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(ab); i++; } else o.push(s[i]); } return o; };
function bpe(M) {
  let segs = W.map(([w, c]) => [w.split(''), c]); const merges = [];
  for (let m = 0; m < M; m++) {
    const pc = {}; segs.forEach(([s, c]) => { for (let i = 0; i < s.length - 1; i++) { const k = s[i] + '|' + s[i + 1]; pc[k] = (pc[k] || 0) + c; } });
    const best = Object.entries(pc).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]; if (!best) break;
    const [a, b] = best[0].split('|'); merges.push([a, b]); segs = segs.map(([s, c]) => [mergeAll(s, a, b, a + b), c]);
  }
  const vocab = [...CHARS, ...merges.map(([a, b]) => a + b)];
  return { vocab, enc: w => merges.reduce((s, [a, b]) => mergeAll(s, a, b, a + b), w.split('')) };
}
function wordpiece(M) {
  const pre = s => s.map((x, i) => (i ? '##' + x : x));
  let segs = W.map(([w, c]) => [pre(w.split('')), c]); const vocab = [...new Set(segs.flatMap(s => s[0]))].sort();
  for (let m = 0; m < M; m++) {
    const pc = {}, uc = {}; segs.forEach(([s, c]) => { s.forEach(t => { uc[t] = (uc[t] || 0) + c; }); for (let i = 0; i < s.length - 1; i++) { const k = s[i] + '|' + s[i + 1]; pc[k] = (pc[k] || 0) + c; } });
    const best = Object.entries(pc).map(([k, v]) => { const [a, b] = k.split('|'); return [k, v / (uc[a] * uc[b])]; }).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]; if (!best) break;
    const [a, b] = best[0].split('|'), ab = a + b.replace(/^##/, ''); if (!vocab.includes(ab)) vocab.push(ab); segs = segs.map(([s, c]) => [mergeAll(s, a, b, ab), c]);
  }
  const has = new Set(vocab);
  const enc = w => { const out = []; let i = 0; while (i < w.length) { let j = w.length, f = null; for (; j > i; j--) { const p = (i ? '##' : '') + w.slice(i, j); if (has.has(p)) { f = p; break; } } if (!f) return ['[UNK]']; out.push(f); i = j; } return out; };
  return { vocab, enc };
}
function unigram(size) {
  const cnt = {}; W.forEach(([w, c]) => { for (let i = 0; i < w.length; i++) for (let j = i + 2; j <= Math.min(w.length, i + 7); j++) { const s = w.slice(i, j); cnt[s] = (cnt[s] || 0) + c; } });
  let V = new Map(CHARS.map(ch => [ch, 1])); Object.entries(cnt).filter(([, c]) => c >= 2).forEach(([s, c]) => V.set(s, c));
  const vit = (w, V) => { const tot = [...V.values()].reduce((a, b) => a + b, 0), best = Array(w.length + 1).fill(-Infinity), bk = Array(w.length + 1); best[0] = 0;
    for (let j = 1; j <= w.length; j++) for (let i = Math.max(0, j - 7); i < j; i++) { const s = w.slice(i, j); if (V.has(s)) { const v = best[i] + Math.log(V.get(s) / tot); if (v > best[j]) { best[j] = v; bk[j] = i; } } }
    if (!isFinite(best[w.length])) return [['[UNK]'], -Infinity];
    const out = []; let j = w.length; while (j > 0) { out.unshift(w.slice(bk[j], j)); j = bk[j]; } return [out, best[w.length]]; };
  const LL = V => W.reduce((a, [w, c]) => a + c * vit(w, V)[1], 0);
  const reest = () => { const n = new Map([...V.keys()].map(k => [k, 0.1])); W.forEach(([w, c]) => vit(w, V)[0].forEach(t => n.set(t, n.get(t) + c))); V = n; };
  reest();
  while (V.size > size) {   // drop the pieces whose removal costs the corpus least likelihood, a fifth of the excess at a time
    const base = LL(V), cand = [...V.keys()].filter(k => k.length > 1).map(k => { const V2 = new Map(V); V2.delete(k); return [k, base - LL(V2)]; }).sort((a, b) => a[1] - b[1]);
    if (!cand.length) break; cand.slice(0, Math.max(1, Math.ceil((V.size - size) * 0.2))).forEach(([k]) => V.delete(k)); reest();
  }
  return { vocab: [...V.keys()], enc: w => vit(w, V)[0] };
}

export default {
  slug: 'subword-tokenization',
  title: 'Subwords: BPE, WordPiece, Unigram',
  description: 'Four tokenizers learn from Swahili verb forms like ninakula, "I am eating", and tutaenda, "we will go".',
  overview: 'A tokenizer with a fixed list of whole words fails on any word it has not seen and returns an unknown token. Subword tokenizers keep common words whole and split rare ones into pieces, so any word can be written. BPE starts from single characters and repeatedly merges the most frequent adjacent pair. WordPiece, used by BERT, merges the pair that most improves the likelihood of the training text, which favours pairs that rarely appear apart. Unigram, used by T5 and many SentencePiece models, starts with a large vocabulary of substrings, prunes the pieces that matter least, and splits each word into its most probable pieces. Swahili builds verbs from prefixes and stems, which makes the difference easy to see. A model must always be served with exactly the vocabulary it was trained with.',
  keywords: ['subword tokenization', 'bpe', 'wordpiece', 'unigram', 'sentencepiece', 'unknown token'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, -0.1], dir: [0.05, 0.5, 1.3], half: 1.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { word: 1, M: 20, use: 3, drift: false };
    const ink = '#151827', LANES = ['Whole words', 'BPE', 'WordPiece', 'Unigram'], LC = ['#8A8578', C.orange, C.teal, '#3B3F8F'];
    const SY = k => 0.12 + k * 0.3, SZ = k => 0.95 - k * 0.55;
    const steps = LANES.map((n, k) => {
      const sm = new THREE.MeshLambertMaterial({ color: '#D9D1C0' }), step = P.box(6.3, SY(k) + 0.0 - 0.12 + 0.3, 0.5, '#D9D1C0', { r: 0.03, material: sm }); step.position.set(0, 0.12, SZ(k)); floor.add(step);
      const tag = P.box(1.25, 0.24, 0.06, LC[k], { r: 0.03 }); tag.position.set(-2.45, SY(k) + 0.3 - 0.27, SZ(k) + 0.25); floor.add(tag);
      const tiles = Array.from({ length: 10 }, () => {
        const mm = new THREE.MeshLambertMaterial({ color: '#FFF1C9' }), t = P.box(1, 0.24, 0.3, '#FFF1C9', { r: 0.03, material: mm }); t.userData.noFit = true; floor.add(t);
        return { t, mm };
      });
      return { sm, tiles, k };
    });
    const ring = P.box(4.9, 0.06, 0.06, '#F2C94C', { r: 0.02 }); ring.userData.noFit = true; floor.add(ring);
    /* header board behind: the word, and what the model reads */
    const HZ = SZ(3) - 0.42, HY = SY(4) + 0.38;
    const hb = P.box(6.3, 0.6, 0.05, '#3B3F8F', { r: 0.04 }); hb.position.set(0, HY - 0.1, HZ); floor.add(hb);
    const post = P.box(6.3, HY - 0.1 - 0.12, 0.05, '#C9C1B0', { r: 0.02 }); post.position.set(0, 0.12, HZ); floor.add(post);



    const cache = {};
    const toks = () => cache[st.M] || (cache[st.M] = { b: bpe(st.M), wp: wordpiece(st.M), u: unigram(CHARS.length + st.M) });
    let SEG = [], READ = [], T = null;
    function draw() {
      T = toks(); const w = WORDS[st.word];
      SEG = [CORPUS[w] ? [w] : ['[UNK]'], T.b.enc(w), T.wp.enc(w), T.u.enc(w)];
      // what the model reads: the lane's ids, decoded with the vocabulary it was trained on (BPE when the served vocabulary differs)
      const vocabOf = [Object.keys(CORPUS), T.b.vocab, T.wp.vocab, T.u.vocab];
      if (st.drift && st.use !== 1) { const ids = SEG[st.use].map(p => vocabOf[st.use].indexOf(p)); READ = ids.map(i => (i >= 0 && i < T.b.vocab.length ? T.b.vocab[i] : '?')); }
      else READ = SEG[st.use];
      steps.forEach((L, k) => {
        const seg = SEG[k], ws = seg.map(p => 0.22 + 0.105 * p.replace(/^##/, '').length), tot = ws.reduce((a, b) => a + b, 0) + 0.05 * (seg.length - 1);
        let x = 0.65 - tot / 2;
        L.tiles.forEach((t, i) => { const on = i < seg.length; t.t.visible = on;   if (!on) return;
          const p = seg[i], wd = ws[i], cx = x + wd / 2; x += wd + 0.05;
          t.t.scale.x = wd; t.t.position.set(cx, SY(k) + 0.3, SZ(k)); t.mm.color.set(p === '[UNK]' ? '#E8A0A0' : '#FFF1C9');
              });
        L.sm.color.set(k === st.use ? '#E9DCB5' : '#D9D1C0');
      });
      ring.position.set(0.7, SY(st.use) + 0.3 - 0.07, SZ(st.use) + 0.26);


    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Word', options: WORDS, get: () => st.word, act: i => { st.word = i; draw(); } },
      { type: 'slider', label: 'Merges learned', min: 0, max: 30, step: 5, get: () => st.M, set: v => { st.M = v; draw(); } },
      { type: 'buttons', label: 'Model uses', options: ['Words', 'BPE', 'WordPiece', 'Unigram'], get: () => st.use, act: i => { st.use = i; draw(); } },
      { type: 'toggle', label: 'Serve with a different vocabulary', short: 'wrong vocab', get: () => st.drift, set: v => { st.drift = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: String(SEG[st.use].length), sub: `for ${WORDS[st.word].length} letters`, bad: SEG[st.use].length >= WORDS[st.word].length }) },
      { label: 'Unknown', get: () => ({ v: String(READ.filter(p => p === '[UNK]' || p === '?').length), bad: READ.some(p => p === '[UNK]' || p === '?'), good: !READ.some(p => p === '[UNK]' || p === '?') }) },
      { label: 'Vocabulary', get: () => ({ v: String([Object.keys(CORPUS), T.b.vocab, T.wp.vocab, T.u.vocab][st.use].length), sub: 'pieces' }) },
    ];
    const labels = [
      { name: 'lanes', t: 'Four tokenizers', d: 'Same word, four splits', icon: 'box', atV: V(-3.15, SY(1) + 0.3, SZ(1)) },
      { name: 'model', t: 'What the model reads', d: 'Gold: the model\'s tokenizer', icon: 'eye', atV: V(3.15, HY + 0.2, HZ) },
    ];
    const reset = () => { Object.assign(st, { word: 1, M: 20, use: 3, drift: false }); draw(); };
    const breaks = [
      { label: 'Whole words only', hint: 'An unseen word', on: () => { reset(); st.use = 0; st.word = 2; draw(); }, off: reset },
      { label: 'Wrong vocabulary', hint: 'Trained with BPE ids', on: () => { reset(); st.use = 2; st.drift = true; draw(); }, off: reset },
      { label: 'No merges', hint: 'Letters only', on: () => { reset(); st.M = 0; draw(); }, off: reset },
    ];
    function status() {
      const w = WORDS[st.word], seg = SEG[st.use];
      if (READ.includes('[UNK]')) return { ok: false, msg: `<b>[UNK]: the model learns nothing about "${w}".</b> A whole-word vocabulary only knows the ${Object.keys(CORPUS).length} words it was built from, and "${w}" is not one of them. Subword tokenizers split it into pieces they know: BPE gives ${SEG[1].join(' · ')}, Unigram ${SEG[3].join(' · ')}.` };
      if (st.drift && st.use !== 1) return { ok: false, msg: `<b>Right ids, wrong pieces.</b> The text was split by ${LANES[st.use]} into ${seg.join(' · ')}, but the model was trained with the BPE vocabulary, so the same ids mean ${READ.join(' · ')} to it. Nothing errors; the model just reads nonsense. Ship the tokenizer file with the model and check it matches.` };
      if (st.M === 0) return { ok: false, msg: `<b>One token per letter.</b> With no merges, "${w}" is ${seg.length} tokens, and every sentence is about as many tokens as letters. Context fills several times faster and the model must learn spelling before meaning. A few merges give "nime", "tuta" and the verb stems their own tokens.` };
      return { ok: true, msg: `<b>${LANES[st.use]}: ${seg.join(' · ')}.</b> ${st.use === 3 ? 'Unigram keeps the most probable split, so prefixes and stems come out as units.' : st.use === 1 ? 'BPE merges the most frequent pairs, so very common words can end up as one token.' : st.use === 2 ? 'WordPiece merges pairs that rarely appear apart, and marks pieces inside a word with ##.' : 'Whole words work only for words seen in training.'} Compare: ${[1, 2, 3].filter(k => k !== st.use).map(k => `${LANES[k]} ${SEG[k].join(' · ')}`).join('; ')}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Swahili verbs', home: true, say: 'Swahili builds verbs from pieces: ni, I; me, have; kula, eat. Four tokenizers learn from fourteen verb forms.', act: m => m.set({ word: 0, M: 20, use: 3, drift: false }) },
    { t: 'Whole words fail', home: true, say: 'Tutaandika, we will write, was never seen whole. A whole-word vocabulary can only say: unknown.', act: m => m.set({ word: 2, use: 0 }) },
    { t: 'BPE merges', home: true, say: 'BPE starts from letters and merges the most frequent pair, again and again. Common pieces like tuta become single tokens.', act: m => m.set({ use: 1 }) },
    { t: 'WordPiece', home: true, say: 'WordPiece merges pairs that rarely appear apart, and marks inside pieces with two hashes. BERT uses it.', act: m => m.set({ word: 1, use: 2 }) },
    { t: 'Unigram', home: true, say: 'Unigram starts big, prunes what matters least, and picks the likeliest split: nime, cheza. Prefix and stem.', act: m => m.set({ use: 3 }) },
    { t: 'Same vocabulary', home: true, say: 'Serve a model with a different vocabulary from training, and the same ids decode to different pieces. It reads nonsense, silently.', act: m => m.set({ use: 2, drift: true }) },
  ],
  check: [
    { q: 'Why do subword tokenizers avoid unknown tokens?', options: ['Any word can be built from smaller known pieces', 'They have every word in their list', 'They skip rare words'], answer: 0, why: 'At worst a word becomes single letters.' },
    { q: 'How does BPE choose its next merge?', options: ['The most frequent adjacent pair', 'The pair with the rarest letters', 'A random pair'], answer: 0, why: 'WordPiece uses a likelihood score instead.' },
    { q: 'What happens if a model is served with a different vocabulary from training?', options: ['Its ids decode to the wrong pieces and it reads nonsense', 'It raises an error at once', 'Nothing changes'], answer: 0, why: 'Ids only mean something with their own vocabulary.' },
  ],
  terms: [
    ['Tokenizer', 'Splits text into the pieces a model reads.'],
    ['[UNK]', 'The unknown token used for anything outside the vocabulary.'],
    ['BPE', 'Byte-pair encoding: merge the most frequent pair, repeatedly.'],
    ['WordPiece', 'Merge the pair that most improves training-text likelihood.'],
    ['Unigram', 'Prune a large vocabulary; split by the most probable pieces.'],
    ['SentencePiece', 'A library that trains BPE or Unigram straight from raw text.'],
  ],
  deeper: '<p><b>Agglutinative languages.</b> Swahili, isiZulu, Kinyarwanda and many other languages pack subject, tense and object into one word. Vocabularies trained mostly on English split them into many more tokens, so the same message costs more and fits less in context.</p><p><b>Byte-level BPE.</b> Starting from bytes instead of letters means any text at all can be encoded, emoji included; the Tokens lesson trains one.</p><p><b>About this machine.</b> All four tokenizers are trained live in your browser on the fourteen verb forms; the Unigram model prunes by real likelihood loss.</p>',
  code: {
    title: 'BPE training',
    note: 'Adapted from the course\'s subword tokenization lesson.',
    text: `
from collections import Counter

def train_bpe(word_counts, num_merges):
    words = {tuple(w): c for w, c in word_counts.items()}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for w, c in words.items():
            for a, b in zip(w, w[1:]):
                pairs[(a, b)] += c
        if not pairs:
            break
        a, b = max(pairs, key=pairs.get)
        merges.append((a, b))
        new = {}
        for w, c in words.items():
            out, i = [], 0
            while i < len(w):
                if i < len(w) - 1 and (w[i], w[i + 1]) == (a, b):
                    out.append(a + b); i += 2
                else:
                    out.append(w[i]); i += 1
            new[tuple(out)] = c
        words = new
    return merges
`,
  },
};
