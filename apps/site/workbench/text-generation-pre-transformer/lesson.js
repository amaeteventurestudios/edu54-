// Text generation before transformers: a bigram language model trained on eight departure announcements from bus, train and ferry stations
// (Kumasi, Accra, Mombasa, Nairobi, Kisumu, Tamale). Counts, add-one and Kneser-Ney probabilities, held-out perplexity and sampled sentences are all computed live.
// Break it: counts only (one unseen word pair makes the held-out sentence impossible: perplexity infinite), add-one smoothing (too much probability to pairs never seen: word salad),
// temperature too high (sampling flattens the distribution: word salad).
const TRAIN = ['the bus to kumasi leaves at noon', 'the bus to accra leaves at dawn', 'the train to mombasa leaves at night', 'the bus to kumasi is full', 'the train to nairobi is late', 'the ferry to kisumu leaves at dawn', 'the bus to tamale is late', 'the train to mombasa is full'].map(s => ['<s>', ...s.split(' '), '</s>']);
const TEST = ['<s>', ...'the train to nairobi leaves at noon'.split(' '), '</s>'];
const uni = {}, bi = {}, ctx = {}, follow = {}, cont = {};
TRAIN.forEach(s => s.forEach((w, i) => { uni[w] = (uni[w] || 0) + 1; if (i) { const p = s[i - 1], k = p + ' ' + w; bi[k] = (bi[k] || 0) + 1; ctx[p] = (ctx[p] || 0) + 1; (follow[p] = follow[p] || new Set()).add(w); (cont[w] = cont[w] || new Set()).add(p); } }));
const VOC = Object.keys(uni).filter(w => w !== '<s>'), NB = Object.keys(bi).length, D = 0.3;
const PROB = [
  (p, w) => (bi[p + ' ' + w] || 0) / ctx[p],                                                                         // counts only
  (p, w) => ((bi[p + ' ' + w] || 0) + 1) / (ctx[p] + VOC.length),                                                     // add-one (Laplace)
  (p, w) => Math.max((bi[p + ' ' + w] || 0) - D, 0) / ctx[p] + D * follow[p].size / ctx[p] * ((cont[w] ? cont[w].size : 0) / NB),   // interpolated Kneser-Ney
];
const ppl = m => { let s = 0; for (let i = 1; i < TEST.length; i++) s += Math.log(PROB[m](TEST[i - 1], TEST[i])); return Math.exp(-s / (TEST.length - 1)); };
const SEEN = new Set(TRAIN.map(s => s.slice(1, -1).join(' ')));
const TEMPS = [0, 0.7, 1, 3];
function generate(m, T, g) {
  let seed = 11 + g * 7919; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = []; let p = '<s>';
  for (let n = 0; n < 11; n++) {
    const ps = VOC.map(w => [w, PROB[m](p, w)]);
    let w;
    if (!T) w = ps.slice().sort((a, b) => b[1] - a[1])[0][0];
    else { const q = ps.map(([x, v]) => [x, Math.pow(v, 1 / T)]), s = q.reduce((a, b) => a + b[1], 0); let u = rnd() * s; w = q[q.length - 1][0]; for (const [x, v] of q) { u -= v; if (u <= 0) { w = x; break; } } }
    if (w === '</s>') break; out.push(w); p = w;
  }
  return out;
}

export default {
  slug: 'text-generation-pre-transformer',
  title: 'N-grams: the next word from counts',
  description: 'A bigram model learns eight station announcements, from Kumasi to Mombasa, by counting pairs of words. A word pair it never saw has a chance of nothing, until you smooth.',
  overview: 'Before transformers, language models counted. An n-gram model estimates the chance of the next word from how often it followed the previous n minus one words in training; a bigram model looks back one word. Any pair never seen gets probability zero, so one new pair makes a whole sentence impossible. Smoothing fixes this. Add-one gives every possible pair an extra count, which on small data hands far too much to nonsense. Kneser-Ney subtracts a small discount from seen pairs and shares it out according to how many different words each word has followed. Perplexity, the exponential of the average negative log probability on held-out text, scores the model: lower is better. To write text, sample the next word again and again; temperature sharpens or flattens the choices.',
  keywords: ['n-gram', 'bigram language model', 'smoothing', 'kneser-ney', 'perplexity', 'temperature sampling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { m: 2, t: 1, g: 0 };
    /* back row: what may follow "nairobi", a tower for each word */
    const NEXT = ['is', 'leaves', 'late', 'full', 'at', 'the', 'to', '</s>'];
    const nb = NEXT.map((w, i) => { const bar = P.tower(0.36, 0.36, C.teal, { h: 0.1 }); bar.userData.set({ cap: '' }); bar.position.set(-2.3 + i * 0.5, 0, -0.8); S.add(bar); return { w, bar }; });
    /* middle: the held-out announcement, each word's probability as a column */
    const TW = TEST.slice(1);
    const tiles = TW.map((w, i) => {
      const x = -2.6 + i * 0.62, z = 0.3;
      const tm = new THREE.MeshLambertMaterial({ color: '#FFF1C9' }), tile = P.box(0.52, 0.1, 0.36, '#fff', { r: 0.03, material: tm }); tile.position.set(x, 0, z); S.add(tile);
      const col = P.tower(0.26, 0.26, C.orange, { h: 0.1 }); col.userData.set({ cap: '' }); col.position.set(x, 0.1, z); S.add(col);
      return { tile, tm, col };
    });
    /* the sampled announcement as a stack of words; a lamp if it is new */
    const made = P.stack(0.46, 0.36, 0.07, { max: 11, color: C.indigo }); made.position.set(2.75, 0, -0.3); S.add(made);
    const fresh = P.lamp(C.green, { h: 0.18, r: 0.1 }); fresh.position.set(2.75, 0, 0.3); S.add(fresh);
    S.add(P.keep(-2.9, 3.05, 1.0, -1.1, 0.55));
    const parts = [...nb.map(b => b.bar), ...tiles.map(t => t.col)];

    let G = [], PP = 0;
    const NAMES = ['counts only', 'add-one', 'Kneser-Ney'];
    function draw() {
      const f = PROB[st.m];
      nb.forEach(b => { const p = f('nairobi', b.w); b.bar.userData.set({ h: Math.max(0.01, p * 0.95) }); });
      tiles.forEach((t, i) => { const p = f(TEST[i], TEST[i + 1]); t.col.visible = p > 0; t.col.userData.set({ h: Math.max(0.01, p * 0.8) }); t.tm.color.set(p > 0 ? '#FFF1C9' : C.red); });
      PP = ppl(st.m);
      G = generate(st.m, TEMPS[st.t], st.g);
      const s = G.join(' ');
      made.userData.set({ n: G.length });
      fresh.userData.set({ color: SEEN.has(s) ? C.gold : G.length ? C.green : C.red, on: true });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Probabilities from', options: ['Counts only', 'Add-one', 'Kneser-Ney'], get: () => st.m, act: i => { st.m = i; draw(); } },
      { type: 'buttons', label: 'Temperature', options: ['Greedy', '0.7', '1.0', '3.0'], get: () => st.t, act: i => { st.t = i; draw(); } },
      { type: 'button', label: 'Write another', act: () => { st.g++; draw(); } },
    ];
    const readouts = [
      { label: 'Perplexity', get: () => ({ v: isFinite(PP) ? PP.toFixed(2) : '∞', sub: 'held-out, lower is better', good: isFinite(PP) && PP < 4, bad: !isFinite(PP) || PP > 6 }) },
      { label: 'P(leaves | nairobi)', get: () => ({ v: PROB[st.m]('nairobi', 'leaves').toFixed(3), sub: 'a pair never seen', bad: PROB[st.m]('nairobi', 'leaves') === 0 }) },
      { label: 'Writes', get: () => ({ v: `${G.length} words`, sub: SEEN.has(G.join(' ')) ? 'copied' : 'new' }) },
    ];
    const labels = [
      { name: 'next', t: 'Next-word chances', d: 'After one word', icon: 'target', atV: V(-2.5, 0.2, -0.8) },
      { name: 'test', t: 'A new announcement', d: 'Red tile: a chance of nothing', icon: 'book', atV: V(1.25, 0.08, 0.3) },
    ];
    const reset = () => { Object.assign(st, { m: 2, t: 1, g: 0 }); draw(); };
    const breaks = [
      { label: 'Counts only', hint: 'No smoothing', on: () => { reset(); st.m = 0; draw(); }, off: reset },
      { label: 'Add one to every count', hint: 'Then write', on: () => { reset(); st.m = 1; st.t = 2; draw(); }, off: reset },
      { label: 'Temperature 3', hint: 'Then write', on: () => { reset(); st.t = 3; draw(); }, off: reset },
    ];
    function status() {
      const s = G.join(' ');
      if (st.m === 0) return { ok: false, msg: `<b>One new pair, and the whole sentence is impossible.</b> "nairobi leaves" never appeared in training (Nairobi was only ever followed by "is"), so counts give it probability 0. Multiply the chances along the sentence and the total is 0: perplexity is infinite. Real text is full of new pairs, so every n-gram model needs smoothing.` };
      if (st.m === 1) return { ok: false, msg: `<b>Too much for pairs never seen.</b> Add-one gives every one of ${VOC.length} words an extra count after every word, so after "nairobi" even "the" and "to" get ${PROB[1]('nairobi', 'the').toFixed(2)}, while "is", seen every time, falls to ${PROB[1]('nairobi', 'is').toFixed(2)}. On data this small that is most of the probability. Perplexity ${PP.toFixed(2)} against ${ppl(2).toFixed(2)} for Kneser-Ney, and it writes "${s}".` };
      if (TEMPS[st.t] >= 3) return { ok: false, msg: `<b>Word salad.</b> Temperature 3 raises every chance to the power one third, which flattens them: rare and impossible-sounding words get nearly the same share as likely ones. It writes "${s || 'nothing'}". Keep temperature near or below 1 for sensible text.` };
      return { ok: true, msg: `<b>${NAMES[st.m]}: perplexity ${PP.toFixed(2)}.</b> "nairobi leaves" was never seen, but Kneser-Ney keeps ${PROB[st.m]('nairobi', 'leaves').toFixed(3)} for it, so the new announcement still scores. ${TEMPS[st.t] ? `Sampling at ${TEMPS[st.t]}` : 'Greedy decoding'}, it writes "${s}"${SEEN.has(s) ? ', copied from training' : ', which it never saw'}.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Count the pairs', home: true, say: 'A model learns eight station announcements, from Kumasi to Mombasa, by counting which word follows which. After "to", Kumasi comes up most often.', act: m => m.set({ m: 2, t: 1, g: 0 }) },
    { t: 'A new sentence', home: true, say: 'Now score a new announcement: the train to Nairobi leaves at noon. Each column is the chance of a word given the one before.', act: m => m.set({ m: 2 }) },
    { t: 'Counts give zero', home: true, say: 'With counts only, Nairobi was always followed by "is". "Nairobi leaves" gets zero, and the whole sentence becomes impossible.', act: m => m.set({ m: 0 }) },
    { t: 'Smoothing', home: true, say: 'Add-one smoothing gives every pair an extra count. On so little data, nonsense pairs get most of the chance, and it writes word salad.', act: m => m.set({ m: 1, t: 2 }) },
    { t: 'Kneser-Ney', home: true, say: 'Kneser-Ney takes a little from each seen pair and shares it by how many words each word has followed. Perplexity drops.', act: m => m.set({ m: 2, t: 1 }) },
    { t: 'Writing', home: true, say: 'To write, sample the next word again and again. Low temperature stays sensible. High temperature makes word salad.', act: m => m.set({ m: 2, t: 3, g: 1 }) },
  ],
  check: [
    { q: 'Why does a counts-only bigram model give a new sentence infinite perplexity?', options: ['One unseen word pair has probability zero', 'The sentence is too long', 'Perplexity ignores counts'], answer: 0, why: 'A single zero makes the whole product zero.' },
    { q: 'What goes wrong with add-one smoothing on small data?', options: ['Pairs never seen get too much probability', 'Seen pairs get more probability', 'Nothing changes'], answer: 0, why: 'Every word gets an extra count after every word.' },
    { q: 'What does a high sampling temperature do?', options: ['Flattens the chances so unlikely words are picked more', 'Always picks the likeliest word', 'Shortens every sentence'], answer: 0, why: 'Low temperature sharpens, high flattens.' },
  ],
  terms: [
    ['N-gram', 'A run of n words; a bigram is two.'],
    ['Language model', 'A model of the chance of the next word given earlier words.'],
    ['Smoothing', 'Moving some probability to unseen word pairs.'],
    ['Kneser-Ney', 'Discount seen pairs and share by how many contexts a word follows.'],
    ['Perplexity', 'Exponential of the average negative log probability; lower is better.'],
    ['Temperature', 'A setting that sharpens (low) or flattens (high) sampling choices.'],
  ],
  deeper: '<p><b>The guessing game.</b> Claude Shannon asked people to guess English text one letter at a time, and found that each letter carries about one bit, not the nearly five an alphabet allows. Every language model plays the same game; perplexity is its score.</p><p><b>From n-grams to transformers.</b> A bigram model remembers one word. A transformer remembers thousands, and shares what it learns across similar words instead of counting each pair separately. The training goal, predicting the next token, is unchanged.</p><p><b>About this machine.</b> Counts, add-one, interpolated Kneser-Ney with a discount of 0.3, perplexity and sampling are all computed live from the eight training announcements.</p>',
  code: {
    title: 'Counts, add-one and perplexity',
    note: 'Adapted from the course\'s n-gram language model lesson.',
    text: `
import math
from collections import Counter

def train_bigrams(sentences):
    pairs, contexts = Counter(), Counter()
    for s in sentences:
        words = ["<s>"] + s + ["</s>"]
        for prev, w in zip(words, words[1:]):
            pairs[(prev, w)] += 1
            contexts[prev] += 1
    return pairs, contexts

def laplace(pairs, contexts, vocab_size, prev, w):
    return (pairs[(prev, w)] + 1) / (contexts[prev] + vocab_size)

def perplexity(prob, sentence):
    words = ["<s>"] + sentence + ["</s>"]
    nll = -sum(math.log(prob(p, w)) for p, w in zip(words, words[1:]))
    return math.exp(nll / (len(words) - 1))
`,
  },
};
