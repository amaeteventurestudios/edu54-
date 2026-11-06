// BERT: "The fishermen of Lake Malawi bring their catch to the market to sell at dawn." Some words are hidden behind [MASK] and the model must guess them from the words
// around them. Above the gold mask, bars show the model's guesses; arcs show which context words it is using. The guesses come from a small hand-made table of word
// associations (each visible context word adds to some candidates, nearer words count more), softmaxed live. Break it: left context only (like GPT, it cannot see
// "to sell", so "shore" ties with "market"), mask half the words (the clues are hidden too), always use [MASK] (the model never learns about real words in those positions).
const TOK = ['The', 'fishermen', 'of', 'Lake', 'Malawi', 'bring', 'their', 'catch', 'to', 'the', 'market', 'to', 'sell', 'at', 'dawn'];
const FOCUS = 10, ORDER = [10, 3, 7, 12, 1, 14, 5, 8, 0, 13, 2, 6, 9, 11, 4];
const CANDS = ['market', 'shore', 'boat', 'lake', 'school'];
const ASSOC = {
  fishermen: { boat: 0.8, shore: 0.6, lake: 0.5, market: 0.3 }, Lake: { lake: 0.4, shore: 0.4 }, Malawi: { lake: 0.3, shore: 0.2 },
  bring: { market: 0.5, shore: 0.5, school: 0.3 }, catch: { market: 1.0, shore: 1.0, boat: 0.9 }, sell: { market: 2.6 }, dawn: { market: 0.4, shore: 0.6, boat: 0.4 },
};
const RATES = [0.15, 0.5], RULES = ['80% mask · 10% random · 10% kept', 'Always [MASK]'];

export default {
  slug: 'bert-masked-language-modeling',
  title: 'BERT: fill in the blank',
  description: 'BERT learns by hiding words and guessing them from both sides of the gap. Watch the guesses change as the clues come and go.',
  overview: 'BERT is a transformer encoder trained with masked language modelling. About 15% of the tokens in each sentence are picked; the model must predict the originals from everything around them. Because the encoder sees in both directions, a blank can be filled using words that come after it, which a left-to-right model like GPT cannot do. Of the picked tokens, 80% become [MASK], 10% become a random word and 10% stay the same, because [MASK] never appears when the model is later used: training only on [MASK] teaches it nothing about real words in those positions. Mask too much and the clues disappear; mask too little and each sentence teaches little. The next-sentence objective of the original BERT turned out not to help and was dropped. Encoders still lead for embeddings, classification, named entities and rerankers; ModernBERT updated the block with RoPE, gated activations and longer context.',
  keywords: ['bert', 'masked language modelling', 'encoder', 'bidirectional', 'pretraining', 'mask token'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, 0.0], dir: [0.05, 1.0, 1.05], half: 0.95, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { both: true, rate: 0, rule: 0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F';
    const TX = i => -2.6 + (i % 8) * 0.74, TZr = i => (i < 8 ? 0.3 : 0.85);
    // the sentence as tiles; masked tiles lift and turn lilac, the gold one is the blank we watch
    const tiles = TOK.map((w, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), b = P.box(0.68, 0.2, 0.4, '#FBF8F1', { r: 0.04, material: mm }); b.position.set(TX(i), 0, TZr(i)); S.add(b);
      return { b, mm };
    });
    // arcs from every word the model can use as a clue to the blank
    const arcs = TOK.map(() => { const mm = new THREE.MeshBasicMaterial({ color: C.coral, transparent: true, opacity: 0.8 }), a = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.014, C.coral, { material: mm }); a.layers.set(1); a.userData.noFit = true; S.add(a); return { a, mm }; });
    const FP = V(TX(FOCUS), 0.23, TZr(FOCUS));
    TOK.forEach((_, i) => { if (i === FOCUS) return; const p = V(TX(i), 0.23, TZr(i)), mid = p.clone().lerp(FP, 0.5).add(V(0, 0.25 + p.distanceTo(FP) * 0.12, 0)); arcs[i].a.geometry.dispose(); arcs[i].a.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p, mid, FP), 20, 0.014, 6, false); });
    // the guesses: one tower per candidate word, as tall as the model's belief; the first (market) stands on a teal pad
    const GX = k => -0.1 + k * 0.62, GZ = -0.75;
    const bars = CANDS.map((c, k) => {
      const pad = P.box(0.46, 0.03, 0.46, k === 0 ? GOOD : '#8E91A3', { r: 0.03 }); pad.position.set(GX(k), 0, GZ); S.add(pad);
      const t = P.tower(0.34, 0.34, C.plum); t.position.set(GX(k), 0.03, GZ); t.userData.set({ cap: '' }); S.add(t); return t;
    });
    S.add(P.keep(-3.0, 2.6, 1.6, -1.05, 1.1));
    let R = null;
    function run() {
      const k = Math.round(RATES[st.rate] * TOK.length), masked = new Set(ORDER.slice(0, k));
      const score = Object.fromEntries(CANDS.map(c => [c, 0])), used = [];
      TOK.forEach((w, i) => { if (masked.has(i) || i === FOCUS) return; if (!st.both && i > FOCUS) return; const a = ASSOC[w]; if (!a) return;
        const wgt = 1 / (1 + Math.abs(FOCUS - i) * 0.08); used.push(i); Object.entries(a).forEach(([c, v]) => { score[c] += v * wgt; }); });
      const ex = CANDS.map(c => Math.exp(score[c])), Z = ex.reduce((a, b) => a + b, 0), prob = ex.map(e => e / Z);
      const top = prob.indexOf(Math.max(...prob));
      // the second masked word shows the 80/10/10 rule: here it is left unchanged (one of the 10%), or [MASK] under "always"
      const other = ORDER[1], shown = i => (i === other && st.rule === 0 ? TOK[i] + '*' : '[MASK]');
      return { masked, used, prob, top, k, shown, other };
    }
    function draw() {
      R = run();
      tiles.forEach((T, i) => {
        const m = R.masked.has(i), kept = m && i === R.other && st.rule === 0;
        T.mm.color.set(i === FOCUS ? '#F2C94C' : kept ? '#E6DCC4' : m ? '#C9B8D6' : !st.both && i > FOCUS ? '#8E91A3' : '#FBF8F1');
        T.b.position.y = m ? 0.08 : 0;
      });
      arcs.forEach((A, i) => { A.a.visible = R.used.includes(i); A.mm.opacity = TOK[i] === 'sell' ? 0.95 : 0.55; });
      bars.forEach((t, k) => t.userData.set({ h: Math.max(0.02, R.prob[k] * 1.5), color: k === R.top ? (k === 0 && R.prob[0] > 0.5 ? GOOD : BAD) : C.plum }));
    }
    draw(); bars.forEach(t => t.userData.snap());
    const tick = dt => bars.forEach(t => t.userData.tick(dt));
    const fine = () => (st.rule === 1 ? 89 : 91) - (st.rate === 1 ? 4 : 0);
    const controls = [
      { type: 'buttons', label: 'Context the model reads', options: ['Both sides', 'Left only'], get: () => (st.both ? 0 : 1), act: i => { st.both = !i; draw(); } },
      { type: 'buttons', label: 'Words masked', options: ['15%', '50%'], get: () => st.rate, act: i => { st.rate = i; draw(); } },
      { type: 'buttons', label: 'Mask rule', options: ['80 / 10 / 10', 'Always [MASK]'], get: () => st.rule, act: i => { st.rule = i; draw(); } },
    ];
    const readouts = [
      { label: 'Top guess', get: () => ({ v: CANDS[R.top], sub: `${Math.round(R.prob[R.top] * 100)}% sure`, good: R.top === 0 && R.prob[0] > 0.5, bad: R.top !== 0 || R.prob[0] < 0.4 }) },
      { label: 'Clues used', get: () => ({ v: `${R.used.length}`, sub: 'context words with a hint' }) },
      { label: 'Fine-tuned accuracy', get: () => ({ v: `${fine()}%`, sub: 'on a later task, illustrative', good: fine() >= 91, bad: fine() < 90 }) },
    ];
    const labels = [
      { name: 'tiles', t: 'The sentence, word by word', d: 'Lilac: masked. Gold: the blank. Arcs: clues used', icon: 'link', atV: V(-2.94, 0.15, 0.3) },
      { name: 'guess', t: 'Five guesses for the blank', d: 'Height: how sure. Teal pad: market, the right word', icon: 'scale', atV: V(GX(4) + 0.23, 0.02, GZ) },
    ];
    const reset = () => { Object.assign(st, { both: true, rate: 0, rule: 0 }); draw(); };
    const breaks = [
      { label: 'Left context only', hint: 'Read like GPT', on: () => { reset(); st.both = false; draw(); }, off: reset },
      { label: 'Mask half the words', hint: '50%', on: () => { reset(); st.rate = 1; draw(); }, off: reset },
      { label: 'Always [MASK]', hint: 'No random, no kept', on: () => { reset(); st.rule = 1; draw(); }, off: reset },
    ];
    function status() {
      const p = Math.round(R.prob[R.top] * 100), pm = Math.round(R.prob[0] * 100), ps = Math.round(R.prob[1] * 100);
      if (!st.both) return { ok: false, msg: `<b>Without "to sell", it cannot tell.</b> Reading only to the left, the clues are "fishermen", "bring" and "catch", which fit a shore (${ps}%) at least as well as a market (${pm}%). The words after the blank, "to sell at dawn", settle it, and only a bidirectional encoder can see them. That is what BERT adds over a left-to-right model.` };
      if (st.rate === 1) return { ok: false, msg: `<b>The clues are hidden too.</b> With half the words masked, "catch" and "sell" are themselves behind [MASK], so the model has little to go on: "${CANDS[R.top]}" at ${p}%. Every sentence gives more targets, but each is far harder and the model learns worse. Around 15% balances signal against context.` };
      if (st.rule === 1) return { ok: false, msg: `<b>It only ever practises on [MASK].</b> The guess here is still "${CANDS[R.top]}", but [MASK] never appears once the model is used for real work. Trained only on [MASK], it learns nothing about real words in those positions, and later tasks come out about two points worse in this illustration. 80% [MASK], 10% random, 10% unchanged keeps it honest.` };
      return { ok: true, msg: `<b>"${CANDS[R.top]}", ${p}% sure.</b> Reading both sides, the model combines "catch" and "bring" before the blank with "to sell at dawn" after it. 15% of words are picked, and one of them, "${TOK[R.other]}", is left unchanged under the 80/10/10 rule, so the model also learns from real words.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Fill in the blank', home: true, say: 'The fishermen of Lake Malawi bring their catch to the blank, to sell at dawn. BERT learns by guessing hidden words like this.', act: m => m.set({ both: true, rate: 0, rule: 0 }) },
    { t: 'Both sides', home: true, say: 'It reads both sides of the blank. "Catch" before it, and "to sell" after it, point to the market.', act: m => m.set({}) },
    { t: 'Left only', home: true, say: 'A left-to-right model never sees "to sell". Market and shore look equally likely.', act: m => m.set({ both: false }) },
    { t: 'How much to hide', home: true, say: 'Hide half the words, and the clues disappear too. About fifteen per cent balances targets against context.', act: m => m.set({ both: true, rate: 1 }) },
    { t: 'The mask rule', home: true, say: 'Of the words picked, most become the mask token, some a random word, and some stay as they are.', act: m => m.set({ rate: 0, rule: 0 }) },
    { t: 'Always mask', home: true, say: 'Always use the mask token, and the model never practises on real words in those positions. Later tasks suffer.', act: m => m.set({ rule: 1 }) },
  ],
  check: [
    { q: 'What can BERT use that a left-to-right model cannot when filling a blank?', options: ['Words that come after the blank', 'More vocabulary', 'Larger numbers'], answer: 0, why: 'The encoder is bidirectional.' },
    { q: 'Why are some picked tokens replaced with random words or left unchanged?', options: ['[MASK] never appears in real use, so the model must also learn from real words', 'To make training faster', 'To shorten sentences'], answer: 0, why: 'It avoids a mismatch between training and use.' },
    { q: 'What goes wrong if half the words are masked?', options: ['The clues needed to guess are hidden too', 'Training stops', 'Nothing'], answer: 0, why: 'About 15% balances targets and context.' },
  ],
  terms: [
    ['Masked language modelling', 'Hiding tokens and training the model to predict them.'],
    ['[MASK]', 'A special token that marks a hidden word during training.'],
    ['Bidirectional', 'Using context on both sides of a position.'],
    ['Encoder', 'A transformer stack whose attention sees the whole input.'],
    ['Fine-tuning', 'Training a pretrained model further on a specific task.'],
    ['ModernBERT', 'A 2024 update of BERT with RoPE, gated activations and long context.'],
  ],
  deeper: '<p><b>Where encoders still win.</b> Embeddings for search, classification, named entities, entailment and rerankers all need one fast pass that sees the whole input, which is exactly what an encoder gives.</p><p><b>African-language encoders.</b> Models such as AfriBERTa and AfroXLMR were pretrained with masked language modelling on Swahili, Hausa, Yoruba, Amharic and other languages, and beat general multilingual models on them.</p><p><b>About this machine.</b> The guesses come from a small hand-made table of word associations, weighted by distance and softmaxed live. The fine-tuned accuracy figures are illustrative.</p>',
  code: {
    title: 'The BERT masking rule',
    note: 'Adapted from the course\'s BERT lesson.',
    text: `
import random

def mask_tokens(tokens, vocab, rate=0.15, mask="[MASK]"):
    inputs, targets = list(tokens), [None] * len(tokens)
    for i, tok in enumerate(tokens):
        if random.random() < rate:
            targets[i] = tok                 # predict the original here
            r = random.random()
            if r < 0.8:   inputs[i] = mask
            elif r < 0.9: inputs[i] = random.choice(vocab)
            # else: leave it unchanged
    return inputs, targets
`,
  },
};
