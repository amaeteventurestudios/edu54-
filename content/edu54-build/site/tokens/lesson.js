// Tokens: a byte-level BPE tokenizer, trained here in the browser on a small English text, chops sentences into pieces
// on a conveyor. The same greeting in English, Pidgin, Yoruba and Swahili costs very different numbers of tokens.
// Break it: no merges (one token per byte), train on far less text.
const CORPUS = `Good morning. The market opens early and the traders are already busy. A woman sells tomatoes, peppers and onions from a wide tray, and a boy carries bread on his head between the stalls. Prices go up when the rain is heavy and the roads are bad, because the trucks from the farms arrive late.
People talk about the weather, the price of fuel, football and their children at school. Everyone has a phone. Some pay for their goods with cash and some pay with a transfer, and the trader checks the alert before handing over the bag.
In the afternoon the sun is very hot and the market is quieter. The traders count their money, share food and tell stories. A good trader remembers every customer and knows what they will want next week.
Learning to build software is like learning a trade in the market. You start by watching, then you try small things, you make mistakes, you ask questions, and slowly you get better. The tools change, but the habits stay the same: be curious, be patient, and keep practising every day.
Computers read text as numbers. Before a language model can read a sentence, the sentence is cut into small pieces called tokens, and every token gets a number. Common words become one token. Rare words are cut into several pieces. The model only ever sees the numbers.
The rain stopped in the evening. The streets were full of people going home, buses were crowded and the drivers were shouting the names of their stops. Tomorrow the market will open again, very early, and the whole thing will start once more.`;
const SENTENCES = [
  { n: 'English', s: 'Good morning, how are you? The market is very busy today.' },
  { n: 'Pidgin', s: 'Good morning, how you dey? Market full well well today.' },
  { n: 'Yoruba', s: 'Ẹ káàárọ̀, ṣé dáadáa ni? Ọjà kún púpọ̀ lónìí.' },
  { n: 'Swahili', s: 'Habari za asubuhi? Soko limejaa sana leo.' },
];
const SPLIT = /'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
const enc = new TextEncoder();

// train byte-level BPE: start from bytes, merge the most common neighbouring pair, again and again
function train(text, n) {
  const words = new Map();
  for (const w of text.normalize('NFC').match(SPLIT) || []) words.set(w, (words.get(w) || 0) + 1);
  let seqs = [...words].map(([w, c]) => [Array.from(enc.encode(w)), c]);
  const merges = [], vocab = new Map(Array.from({ length: 256 }, (_, i) => [i, [i]]));
  for (let m = 0; m < n; m++) {
    const pairs = new Map();
    for (const [s, c] of seqs) for (let i = 0; i < s.length - 1; i++) { const k = s[i] * 100000 + s[i + 1]; pairs.set(k, (pairs.get(k) || 0) + c); }
    let best = -1, bc = 1;
    for (const [k, c] of pairs) if (c > bc) { bc = c; best = k; }
    if (best < 0) break;
    const a = Math.floor(best / 100000), b = best % 100000, id = 256 + m;
    merges.push([a, b, id]); vocab.set(id, [...vocab.get(a), ...vocab.get(b)]);
    seqs = seqs.map(([s, c]) => { const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(id); i++; } else o.push(s[i]); } return [o, c]; });
  }
  return { merges, vocab };
}
function encode(text, tok, upto) {
  const out = [];
  for (const w of text.normalize('NFC').match(SPLIT) || []) {
    let s = Array.from(enc.encode(w));
    for (const [a, b, id] of tok.merges.slice(0, upto)) { if (s.length < 2) break; const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(id); i++; } else o.push(s[i]); } s = o; }
    out.push(...s);
  }
  return out;
}
const dec = new TextDecoder('utf-8', { fatal: true });
function show(tok, id) {
  const bytes = new Uint8Array(tok.vocab.get(id));
  try { return dec.decode(bytes).replace(/^ /, '·').replace(/\n/g, '↵'); } catch { return '‹' + [...bytes].map(b => b.toString(16)).join(' ') + '›'; }
}

export default {
  slug: 'tokens',
  title: 'Tokens: how AI reads text',
  description: 'Watch a tokenizer chop sentences into pieces on a conveyor. The same greeting costs far more tokens in Yoruba than in English. See why, and type your own.',
  overview: 'Language models don\'t read letters or words. A tokenizer first cuts text into pieces called tokens, learned from whatever text it was trained on. Here one is trained live on a short English text. Feed it English, Pidgin, Yoruba and Swahili, and see who pays more.',
  keywords: ['tokenizer explained', 'byte pair encoding', 'bpe', 'tokens llm', 'african languages ai'],
  orient: 'landscape',
  view: { target: [0.4, 0.6, 0.3], dir: [0.4, 0.95, 1.3], half: 3.2, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { lang: 0, mine: 'Type anything here', merges: 200, small: false, speed: 1 };
    let tok = train(CORPUS, 300), tokSmall = null;
    const T = () => st.small ? (tokSmall ||= train(CORPUS.split('\n')[0].slice(0, 160), 300)) : tok;
    const text = () => st.lang === 4 ? st.mine : SENTENCES[st.lang].s;
    /* ---------- the tokenizer and its belt ---------- */
    const BX0 = -3.6, BL = 6.6;
    const belt = P.box(BL, 0.16, 1.0, '#3A3B44', { r: 0.08 }); belt.position.set(BX0 + BL / 2, 0.25, 0); S.add(belt);
    for (let k = 0; k < 2; k++) { const leg = P.box(0.18, 0.25, 0.9, '#5A5C66', { r: 0.03 }); leg.position.set(BX0 + 0.5 + k * (BL - 1), 0, 0); S.add(leg); }
    const machine = P.box(1.2, 1.25, 1.35, C.indigo, { r: 0.12 }); machine.position.set(BX0 - 0.45, 0, 0); S.add(machine);
    const hopper = P.cyl(0.42, 0.35, '#D5D2E6', { r2: 0.2 }); hopper.rotation.x = Math.PI; hopper.position.set(BX0 - 0.45, 1.6, 0); S.add(hopper);
    const mName = S.text('TOKENIZER', { size: 0.15, face: 'front', weight: 800, color: '#FFFFFF' }); mName.position.set(BX0 - 0.45, 0.85, 0.69); S.add(mName);
    const inT = S.text('', { size: 0.16, face: 'cam', weight: 600, bg: 'rgba(255,255,255,.95)', color: C.ink, order: 6, depthTest: false }); inT.position.set(BX0 - 0.2, 2.05, 0); inT.userData.noFit = true; S.add(inT);
    const bin = P.box(0.9, 0.5, 1.1, '#C9C4B6', { r: 0.1 }); bin.position.set(BX0 + BL + 0.5, 0, 0); S.add(bin);
    /* ---------- token tiles (a pool) ---------- */
    const POOL = 80, tiles = [];
    for (let i = 0; i < POOL; i++) { const g = P.tile('', 0.5, 0.14, 0.62, '#FFFFFF', { size: 0.16, font: '"JetBrains Mono", monospace', weight: 600 }); g.visible = false; g.userData.noFit = true; S.add(g); tiles.push(g); }
    const hue = id => new THREE.Color().setHSL(((id * 0.6180339) % 1), 0.55, 0.78);
    let seq = [], laid = [], total = 0, scroll = 0;
    function relay() {
      const t = T();
      seq = encode(text(), t, st.merges);
      laid = []; let x = 0;
      for (const id of seq) { const s = show(t, id), w = Math.max(0.34, Math.min(1.6, 0.1 + s.length * 0.14)); laid.push({ id, s, w, x: x + w / 2 }); x += w + 0.08; }
      total = Math.max(x, BL); scroll = 0;
      inT.userData.set(text().length > 46 ? text().slice(0, 44) + '…' : text());
      drawBars();
    }
    function place() {
      // tiles ride the belt from the machine to the bin and loop
      const used = new Set();
      laid.forEach((L, k) => {
        if (k >= POOL) return;
        let x = L.x - scroll; x = ((x % total) + total) % total;
        const g = tiles[k]; g.visible = x < BL - 0.1 && x > 0.05; used.add(k);
        if (!g.visible) return;
        if (g.userData.cur !== L.s + L.w) {
          g.userData.cur = L.s + L.w;
          g.userData.body.scale.x = L.w / 0.5; g.userData.body.material = P.mat(hue(L.id));
          g.userData.label.userData.style({ str: L.s, color: '#151827', maxW: L.w * 0.92 });
        }
        g.position.set(BX0 + 0.05 + x, 0.41, 0);
      });
      tiles.forEach((g, k) => { if (!used.has(k)) g.visible = false; });
    }
    /* ---------- the four languages: bars of token counts ---------- */
    const bars = SENTENCES.map((L, k) => {
      const g = new THREE.Group(); g.position.set(-1.5 + k * 1.15, 0, 1.9); S.add(g);
      const b = P.box(0.6, 1, 0.6, [C.indigo, C.green, C.orange, C.teal][k], { r: 0.08 }); g.add(b);
      const n = S.text(L.n, { size: 0.17, weight: 700 }); n.position.set(0, 0.01, 0.55); g.add(n);
      const v = S.text('', { size: 0.2, face: 'cam', weight: 800, bg: 'rgba(255,255,255,.92)', color: C.ink, order: 6 }); v.userData.noFit = true; g.add(v);
      S.tap(b, () => { st.lang = k; relay(); S.sync(); });
      return { g, b, v };
    });
    const counts = () => SENTENCES.map(L => encode(L.s, T(), st.merges).length);
    function drawBars() {
      const c = counts(), mx = Math.max(...c, 1);
      bars.forEach((B, k) => { const h = 0.15 + c[k] / mx * 1.5; B.b.scale.y = h; B.v.position.set(0, h + 0.3, 0); B.v.userData.set(String(c[k])); B.b.position.y = 0; B.g.scale.setScalar(k === st.lang ? 1.08 : 1); });
    }
    relay(); place();
    function update(dt) { if (S.reduced) return; scroll += dt * 0.55 * st.speed; place(); }
    const controls = [
      { type: 'buttons', label: 'Sentence', options: ['English', 'Pidgin', 'Yoruba', 'Swahili', 'Yours'], get: () => st.lang, act: i => { st.lang = i; relay(); } },
      { type: 'text', label: 'Type your own', placeholder: 'Anything, in any language', go: 'Tokenize', get: () => st.lang === 4 ? st.mine : '', set: v => { if (v.trim()) { st.mine = v.slice(0, 120); st.lang = 4; relay(); } } },
      { type: 'slider', label: 'Merges learned', min: 0, max: 300, step: 10, get: () => st.merges, set: v => { st.merges = v; relay(); } },
      { type: 'slider', label: 'Belt speed', min: 0, max: 3, step: 0.25, get: () => st.speed, set: v => { st.speed = v; }, fmt: v => `${v}×` },
    ];
    const ratio = () => { const c = counts(); return c[2] / c[0]; };
    const readouts = [
      { label: 'Tokens', get: () => ({ v: seq.length, sub: `${[...text()].length} letters` }) },
      { label: 'Yoruba vs English', get: () => ({ v: `${ratio().toFixed(1)}×`, sub: 'tokens for the same words', bad: ratio() > 1.6 }) },
    ];
    const labels = [
      { name: 'machine', t: 'The tokenizer', d: 'Learned from English text only', icon: 'box', atV: V(BX0 - 0.45, 1.3, 0.3) },
      { name: 'belt', t: 'Tokens', d: 'Each tile is one piece, with its own number', icon: 'link', atV: V(BX0 + BL * 0.55, 0.6, 0) },
      { name: 'bars', t: 'Same greeting, four languages', d: 'Taller bar: more tokens to pay for', icon: 'scale', atV: V(-1.5 + 2 * 1.15, 1.2, 1.9) },
    ];
    const breaks = [
      { label: 'No merges at all', hint: 'One token per byte', on: () => { st.merges = 0; relay(); }, off: () => { st.merges = 200; relay(); } },
      { label: 'Train on one sentence', hint: '160 letters of text instead of 2,000', on: () => { st.small = true; relay(); }, off: () => { st.small = false; relay(); } },
    ];
    function status() {
      const c = counts(), r = ratio();
      if (st.merges === 0) return { ok: false, msg: `<b>One token per byte.</b> English needs ${c[0]} tokens and Yoruba ${c[2]}: each accented letter is two or three bytes. The model would read slowly and remember far less.` };
      if (st.small) return { ok: false, msg: `<b>Too little to learn from.</b> Trained on one sentence, it only learned pieces of those words. Everything else falls back to small pieces: English now needs ${c[0]} tokens.` };
      if (st.lang === 2 || st.lang === 3) return { ok: false, msg: `<b>${SENTENCES[st.lang].n} costs more.</b> The tokenizer learned English pieces, so ${SENTENCES[st.lang].n} words are cut small: ${c[st.lang]} tokens against ${c[0]} for English. More tokens means higher cost and less room in the model's memory.` };
      if (st.lang === 4) return { msg: `<b>${seq.length} tokens</b> for ${[...text()].length} letters. Words it saw often stay whole; rare ones break into pieces.` };
      return { msg: `<b>${seq.length} tokens.</b> Common English words like "${show(T(), encode(' market', T(), st.merges)[0])}" are one piece each. Yoruba needs ${r.toFixed(1)}× as many for the same greeting.` };
    }
    return { update, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { lang: 0, merges: 200, small: false, speed: 1 }); relay(); },
      set: p => { Object.assign(st, p); relay(); } };
  },

  story: [
    { t: 'Text becomes pieces', focus: 'machine', zoom: 1.4, say: 'A language model cannot read letters. First, a tokenizer cuts the text into pieces called tokens, and gives each one a number.', act: m => m.set({ lang: 0, merges: 200 }) },
    { t: 'Start from bytes', home: true, say: 'It starts from the smallest pieces: single bytes. Every letter is one or more bytes. That makes a lot of tokens.', act: m => m.set({ merges: 0 }), wait: 5 },
    { t: 'Merge common pairs', home: true, say: 'Then it learns. It finds the pair of pieces that appears most often in its training text, and glues them into one new token. Then again, two hundred times.', act: m => m.set({ merges: 200 }), wait: 5 },
    { t: 'Common words stay whole', focus: 'belt', zoom: 1.4, say: 'Now common English words, like market and today, are a single token each.' },
    { t: 'Who pays more', focus: 'bars', zoom: 1.3, say: 'But this tokenizer only ever read English. The same greeting in Yoruba is cut into many more pieces, because its letters and tone marks were never merged.', act: m => m.set({ lang: 2 }) },
    { t: 'Why it matters', home: true, say: 'More tokens means a higher bill, slower answers and less room in the model\'s memory. Tokenizers trained on more African text treat our languages more fairly.' },
  ],
  check: [
    { q: 'What does a tokenizer do?', options: ['Translates text', 'Cuts text into numbered pieces the model can read', 'Checks spelling'], answer: 1, why: 'It turns text into a list of token numbers. The model only ever sees those numbers.' },
    { q: 'How does byte pair encoding learn its tokens?', options: ['From a dictionary', 'By merging the most common pair of pieces, again and again', 'At random'], answer: 1, why: 'It counts neighbouring pairs in its training text and merges the most common one, many times over.' },
    { q: 'Why does Yoruba need more tokens here?', options: ['Yoruba is a longer language', 'The tokenizer learned its pieces from English text', 'Tone marks are ignored'], answer: 1, why: 'Pieces come from the training text. Text it rarely saw gets cut into small, many pieces.' },
  ],
  terms: [
    ['Token', 'A piece of text with its own number. Often a word or part of a word.'],
    ['Tokenizer', 'The program that cuts text into tokens and back.'],
    ['Byte', 'The smallest piece of stored text. English letters are one byte; ẹ or ọ̀ take two or three.'],
    ['BPE (byte pair encoding)', 'Learning tokens by merging the most common pairs.'],
    ['Context window', 'How many tokens a model can look at at once.'],
  ],
  deeper: '<p>Real tokenizers learn 50,000 to 200,000 merges from huge amounts of text. Studies of popular models found that many African languages need two to five times as many tokens as English for the same meaning, so they cost more to use and fit less into the model\'s memory. Newer tokenizers trained on more balanced text close that gap.</p>',
  code: {
    title: 'Learning one BPE merge',
    note: 'The core loop of the course\'s tokenizer: count pairs, merge the most common.',
    text: `
from collections import Counter

def most_common_pair(seqs):
    pairs = Counter()
    for seq, count in seqs:
        for a, b in zip(seq, seq[1:]):
            pairs[(a, b)] += count
    return max(pairs, key=pairs.get)

def apply_merge(seq, pair, new_id):
    out, i = [], 0
    while i < len(seq):
        if i < len(seq) - 1 and (seq[i], seq[i + 1]) == pair:
            out.append(new_id)   # two pieces become one token
            i += 2
        else:
            out.append(seq[i])
            i += 1
    return out

# start from bytes: every word is a list of numbers 0-255
words = Counter("the market is busy the market".split())
seqs = [(list(w.encode()), c) for w, c in words.items()]
pair = most_common_pair(seqs)
seqs = [(apply_merge(s, pair, 256), c) for s, c in seqs]
`,
  },
};
