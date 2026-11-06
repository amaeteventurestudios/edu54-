// Tokenizers: a Swahili-English school chatbot in Mombasa. Four tokenizers are trained for real on a tiny bilingual text (or English only) and then cut a new Swahili
// sentence, "watoto wanasoma vitabu shuleni leo" (the children are reading books at school today). Word-level keeps the most frequent whole words and marks the rest
// [UNK]; character-level uses single letters; BPE merges the most frequent adjacent pair; WordPiece merges the pair that occurs together most beyond chance and cuts
// by longest match. BPE and WordPiece start from 52 symbols (each letter alone or starting a word). Embedding sizes at real scale use 4,096 dimensions.
// Break it: word-level (unknown words), character-level (very long), a tokenizer trained on English only (Swahili falls apart into letters).
const EN = 'good morning thank you very much the children are playing football it is raining today the market in town is busy we are eating food i am going to school mother is cooking ugali the children are reading books at school we are going to the market';
const SW = 'habari za asubuhi asante sana karibu sana ninapenda kusoma vitabu watoto wanacheza mpira mvua inanyesha leo soko la mjini lina watu wengi tunakula chakula ninakwenda shuleni mama anapika ugali watoto wanakula chakula shuleni tunakwenda sokoni';
const TEST = 'watoto wanasoma vitabu shuleni leo';
const AZ = 'abcdefghijklmnopqrstuvwxyz'.split('');
const SIZES = [60, 120, 250];
function counts(text) { const c = {}; text.split(' ').forEach(w => { c[w] = (c[w] || 0) + 1; }); return c; }
const split = w => ['▁' + w[0], ...w.slice(1)];
function train(text, V, wp) { let words = Object.entries(counts(text)).map(([w, n]) => [split(w), n]);
  const vocab = new Set([...AZ, ...AZ.map(c => '▁' + c)]), merges = [];
  while (vocab.size < V) { const pc = {}, uc = {}; words.forEach(([s, n]) => { s.forEach(t => { uc[t] = (uc[t] || 0) + n; }); for (let i = 0; i < s.length - 1; i++) { const k = `${s[i]}\u0001${s[i + 1]}`; pc[k] = (pc[k] || 0) + n; } });
    let best = null, bv = -1; Object.entries(pc).forEach(([k, n]) => { const [a, b] = k.split('\u0001'), sc = wp ? n / (uc[a] * uc[b]) : n; if (sc > bv || (sc === bv && k < best)) { bv = sc; best = k; } }); if (!best) break;
    const [a, b] = best.split('\u0001'); merges.push([a, b]); vocab.add(a + b);
    words = words.map(([s, n]) => { const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(a + b); i++; } else o.push(s[i]); } return [o, n]; }); }
  return { vocab, merges }; }
function encode(m, w, wp) { if (!wp) { let s = split(w); m.merges.forEach(([a, b]) => { const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(a + b); i++; } else o.push(s[i]); } s = o; }); return s; }
  const out = []; let rest = '▁' + w; while (rest.length) { let k = rest.length; while (k > 1 && !m.vocab.has(rest.slice(0, k))) k--; out.push(rest.slice(0, k)); rest = rest.slice(k); } return out; }
function run(st) {
  const text = st.sw ? `${EN} ${SW}` : EN, V = SIZES[st.v];
  if (st.kind === 0) { const top = Object.entries(counts(text)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, V).map(e => e[0]), set = new Set(top); const toks = TEST.split(' ').map(w => (set.has(w) ? w : '[UNK]')); return { toks, V: top.length }; }
  if (st.kind === 1) { const chars = new Set(text.replace(/ /g, '').split('')); chars.add(' '); return { toks: TEST.split('').map(c => (c === ' ' ? '␣' : c)), V: chars.size }; }
  const m = train(text, V, st.kind === 3); return { toks: TEST.split(' ').flatMap(w => encode(m, w, st.kind === 3)), V: m.vocab.size };
}
const KINDS = ['Word-level', 'Character-level', 'BPE', 'WordPiece'];

export default {
  slug: 'tokenizers',
  title: 'Tokenizers: words, letters or pieces',
  description: 'A Swahili-English school chatbot in Mombasa must cut a new sentence into tokens. Train four tokenizers on a tiny text and count the blocks each one makes.',
  overview: 'A model reads token IDs, so text must be cut into tokens first. Word-level tokenizers keep a list of whole words; anything not on the list becomes an unknown token, and every new form of a word, common in languages like Swahili that build words from prefixes and stems, is lost. Character-level tokenizers never meet an unknown, but sequences become several times longer, which costs context and compute. Subword tokenizers sit between: common words stay whole and rare ones split into reusable pieces. BPE starts from characters and repeatedly merges the most frequent adjacent pair. WordPiece, used by BERT, merges the pair that occurs together most often relative to how often each part occurs alone, then cuts words greedily by the longest piece in its vocabulary. SentencePiece treats spaces as ordinary symbols, so it works without language-specific word rules; byte-level BPE starts from the 256 byte values so nothing is ever unknown. Vocabulary size is a trade-off: bigger vocabularies give shorter sequences but a bigger embedding table, 128 thousand tokens at 4,096 dimensions is about 524 million parameters against 131 million for 32 thousand. And a tokenizer trained mostly on one language cuts every other language into many more pieces.',
  keywords: ['tokenizer', 'bpe', 'wordpiece', 'sentencepiece', 'vocabulary size', 'subword'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.15, 1.08], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { kind: 2, v: 2, sw: true };
    const ink = '#151827';
    /* training text cards */
    const card = (z, title, col) => { const mm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), c = P.box(1.1, 0.05, 0.6, '#fff', { r: 0.03, material: mm }); c.position.set(-2.3, 0.12, z); floor.add(c);
         return { mm }; };
    const enC = card(-0.55, 'English text', '#3A6FB0'); const swC = card(0.2, 'Swahili text', '#1F9E89'); /* the sentence to cut */
    const qCard = P.box(3.0, 0.05, 0.32, '#FFFFFF', { r: 0.03 }); qCard.position.set(0.15, 0.12, -0.95); floor.add(qCard);

    /* token blocks */
    const MAXT = 40, blocks = Array.from({ length: MAXT }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), b = P.box(1, 0.12, 0.26, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b);
         return { b, mm, t }; });
    const keepT = P.box(3.2, 0.3, 1.6, '#000'); keepT.material = new THREE.MeshBasicMaterial({ visible: false }); keepT.position.set(0.15, 0.12, 0.15); floor.add(keepT);
    /* panel */





    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    const PAL = ['#3A6FB0', '#1F9E89', '#B5541C', '#6B5E86', '#8A6D12', '#B07AA1'];
    function draw() {
      R = run(st);
      swC.mm.color.set(st.sw ? '#FBF8F1' : '#D6D2CA'); const n = R.toks.length, W = 3.1, unit = Math.min(0.5, Math.max(0.08, W / Math.max(10, n * 0.62)));
      let x = -1.35, z = -0.5, row = 0, word = 0;
      blocks.forEach((b, i) => { const t = R.toks[i]; b.b.visible = !!t; if (!t) return;
        if (t.startsWith('▁') || t === '␣') word++;
        const len = t.replace('▁', '').length, w = Math.max(unit * 0.9, Math.min(1.3, 0.085 * Math.max(1.3, len) + 0.1));
        if (x + w > 1.65) { x = -1.35; z += 0.38; row++; }
        b.b.scale.x = w; b.b.position.set(x + w / 2, 0.12, z); b.b.scale.z = n > 20 ? 0.8 : 1;
        const unk = t === '[UNK]'; b.mm.color.set(unk ? '#C62828' : PAL[word % PAL.length]);
        
        x += w + 0.05; });
      const unk = R.toks.filter(t => t === '[UNK]').length;


    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Tokenizer', options: KINDS, get: () => st.kind, act: i => { st.kind = i; draw(); } },
      { type: 'buttons', label: 'Vocabulary', options: SIZES.map(String), get: () => st.v, act: i => { st.v = i; draw(); } },
      { type: 'buttons', label: 'Trained on', options: ['English only', 'English + Swahili'], get: () => (st.sw ? 1 : 0), act: i => { st.sw = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: String(R.toks.length), sub: 'for the 5-word sentence', good: R.toks.length <= 12, bad: R.toks.length > 20 }) },
      { label: 'Unknown', get: () => { const u = R.toks.filter(t => t === '[UNK]').length; return { v: String(u), sub: 'pieces lost as [UNK]', good: u === 0, bad: u > 0 }; } },
      { label: 'Vocabulary', get: () => ({ v: String(R.V), sub: 'entries learned' }) },
    ];
    const labels = [
      { name: 'train', t: 'Training text', d: 'What the tokenizer learns from', icon: 'book', atV: V(-2.86, 0.18, -0.17) },
      { name: 'toks', t: 'Tokens', d: 'One block per token · · marks a word start', icon: 'box', atV: V(0.95, 0.1, -0.1) },
    ];
    const reset = () => { Object.assign(st, { kind: 2, v: 2, sw: true }); draw(); };
    const breaks = [
      { label: 'Whole words only', hint: 'Word-level', on: () => { reset(); st.kind = 0; draw(); }, off: reset },
      { label: 'Single letters', hint: 'Character-level', on: () => { reset(); st.kind = 1; draw(); }, off: reset },
      { label: 'Trained on English only', hint: 'BPE without Swahili', on: () => { reset(); st.sw = false; draw(); }, off: reset },
    ];
    function status() {
      const n = R.toks.length, unk = R.toks.filter(t => t === '[UNK]').length;
      if (st.kind === 0 && unk) return { ok: false, msg: `<b>${unk} of 5 words become [UNK].</b> A word-level vocabulary only knows whole words it saw: "wanasoma" (they are reading) never appeared, even though "kusoma" did, so its meaning is lost${st.sw ? '' : ', and without Swahili text every word is unknown'}. Subword pieces would reuse "wa", "na" and "soma".` };
      if (st.kind === 1) return { ok: false, msg: `<b>${n} tokens for five words.</b> Character-level never meets an unknown, but every letter and space is a token, so sequences are about six times longer than words: more context used, more compute per sentence, and the model must learn spelling from scratch.` };
      if (!st.sw) return { ok: false, msg: `<b>${n} tokens: Swahili falls apart.</b> Trained on English only, the tokenizer learned merges like "th" and "ing" but nothing for Swahili, so "watoto wanasoma" is cut into near single letters. The same sentence costs far more, and a Swahili user pays more per message. Train on the languages you serve.` };
      return { ok: true, msg: `<b>${n} tokens, no unknowns.</b> ${KINDS[st.kind]} learned pieces like "watoto" and "shuleni" from the Swahili text, and cuts the new word "wanasoma" into known parts. ${st.v < 2 ? 'A bigger vocabulary would keep more words whole.' : ''}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The sentence', home: true, say: 'A school chatbot in Mombasa must read a new Swahili sentence: the children are reading books at school today.', act: m => m.set({ kind: 2, v: 2, sw: true }) },
    { t: 'Pieces', home: true, say: 'BPE, trained on English and Swahili, keeps common words whole and cuts the new word into known pieces.', act: m => m.set({}) },
    { t: 'WordPiece', home: true, say: 'WordPiece picks merges that occur together more than chance, and cuts by the longest piece it knows.', act: m => m.set({ kind: 3 }) },
    { t: 'Whole words', home: true, say: 'A word-level tokenizer knows only words it has seen. The new word becomes unknown.', act: m => m.set({ kind: 0 }) },
    { t: 'Letters', home: true, say: 'Character-level never meets an unknown, but five words become thirty-four tokens.', act: m => m.set({ kind: 1 }) },
    { t: 'English only', home: true, say: 'Train BPE on English alone, and the Swahili sentence falls apart into letters.', act: m => m.set({ kind: 2, sw: false }) },
  ],
  check: [
    { q: 'What does BPE merge at each step?', options: ['The most frequent adjacent pair', 'The rarest word', 'Two random letters'], answer: 0, why: 'Repeated until the vocabulary is full.' },
    { q: 'Why do word-level tokenizers struggle with Swahili?', options: ['New word forms from prefixes and stems are unknown', 'Swahili has no spaces', 'Words are too short'], answer: 0, why: '"wanasoma" was never seen whole.' },
    { q: 'What does a bigger vocabulary cost?', options: ['A bigger embedding table', 'Longer sequences', 'More unknowns'], answer: 0, why: '128K × 4,096 is about 524M parameters.' },
  ],
  terms: [
    ['Token', 'One piece of text the model reads as an ID.'],
    ['BPE', 'Merge the most frequent adjacent pair, repeatedly.'],
    ['WordPiece', 'Merge pairs that co-occur beyond chance; cut by longest match.'],
    ['SentencePiece', 'Treats spaces as symbols; no word rules needed.'],
    ['[UNK]', 'A placeholder for anything not in the vocabulary.'],
    ['Vocabulary size', 'How many distinct tokens the tokenizer knows.'],
  ],
  deeper: '<p><b>Fair tokens.</b> Tokenizers trained mostly on English cut Swahili, Yoruba and Amharic into many more pieces, so the same message costs more and fits less context. The Tokens lesson in track 5 shows this on whole greetings; training tokenizers on African text narrows the gap.</p><p><b>Real sizes.</b> GPT-2 used about 50 thousand tokens, Llama 3 about 128 thousand, GPT-4o about 200 thousand; bigger vocabularies help many languages at once.</p><p><b>About this machine.</b> All four tokenizers are trained for real on the tiny text shown.</p>',
  code: {
    title: 'Train BPE',
    note: 'Adapted from the course\'s tokenizers lesson.',
    text: `
def train_bpe(word_counts, vocab_size):
    words = {tuple(w): n for w, n in word_counts.items()}
    merges = []
    while len(merges) + base_size < vocab_size:
        pairs = Counter()
        for w, n in words.items():
            for a, b in zip(w, w[1:]):
                pairs[a, b] += n
        a, b = max(pairs, key=pairs.get)
        merges.append((a, b))
        words = {merge(w, a, b): n for w, n in words.items()}
    return merges
`,
  },
};
