// T5 and BART: "The women of the Ngong cooperative weave baskets from sisal and sell them in Nairobi on Saturdays." Pretraining hides spans of words. T5 replaces each span
// with a numbered sentinel and the decoder writes only the missing spans; BART asks the decoder to write the whole sentence back. Rows: what the encoder reads, what the
// decoder must write, and the sentence put back together. Span choice, targets, reassembly and costs are all computed live.
// Break it: drop the sentinels (the decoder writes the missing words in a heap, and nobody can tell where each belongs), corrupt 50% (too little left to read),
// no encoder cache (the encoder reruns for every word the decoder writes).
const TOK = ['The', 'women', 'of', 'the', 'Ngong', 'cooperative', 'weave', 'baskets', 'from', 'sisal', 'and', 'sell', 'them', 'in', 'Nairobi', 'on', 'Saturdays'];
const SPANS = { 0.15: [[6, 8], [14, 15]], 0.5: [[1, 3], [5, 8], [9, 10], [11, 13], [14, 16]] };
const SC = ['#C9A227', '#EE6352', '#1F9E89', '#3B3F8F', '#7A3B69'];

export default {
  slug: 't5-bart-encoder-decoder',
  title: 'T5 and BART: fix the broken sentence',
  description: 'Encoder-decoder models learn by repairing damaged text. T5 swaps spans for numbered sentinels and writes them back; BART rebuilds the whole sentence.',
  overview: 'T5 and BART are encoder-decoder transformers: the encoder reads the whole input once, and the decoder writes the output token by token, looking back at the encoder through cross-attention. They are pretrained by denoising. T5 uses span corruption: about 15% of tokens, in short spans, are each replaced by a unique sentinel such as ⟨X0⟩, and the decoder writes only the sentinels followed by the missing words, which is cheap because the target is short. BART corrupts text in several ways, masking spans, deleting words, shuffling sentences, and the decoder reconstructs the full original, which costs more but teaches fluent rewriting. The sentinels are what make T5\'s short target usable: without them the missing words cannot be put back in place. T5 frames every task as text to text, so translation, summarisation and extraction all share one model. Because the encoder output does not change while decoding, it is computed once and cached.',
  keywords: ['t5', 'bart', 'encoder decoder', 'span corruption', 'denoising', 'text to text'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.25], dir: [0.05, 1.2, 1.0], half: 1.45, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { model: 0, rate: 0, sent: true, cache: true };
    const ink = '#151827', ROWS = [['Encoder reads', -0.55], ['Decoder writes', 0.25], ['Put back together', 1.0]];
    ROWS.forEach(([n, z]) => {     });
    const mkRow = z => Array.from({ length: 22 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), b = P.box(1, 0.22, 0.3, '#FBF8F1', { r: 0.03, material: mm }); b.userData.noFit = true; floor.add(b);
         return { b, mm, z }; });
    const rows = ROWS.map(([, z]) => mkRow(z));
    const keep = P.box(6.2, 0.3, 2.0, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.2); floor.add(keep);
    const enc = P.box(0.7, 0.5, 0.5, '#3B3F8F', { r: 0.05 }); enc.position.set(2.85, 0.12, -0.55); floor.add(enc);


    let R = null;
    const lay = (row, items) => { const w = items.map(it => 0.12 + it.t.length * 0.055), tot = w.reduce((a, b) => a + b, 0) + 0.04 * (w.length - 1); let x = 0.15 - tot / 2;
      row.forEach((c, i) => { const it = items[i], on = !!it; c.b.visible = on;  if (!on) return; const cx = x + w[i] / 2; x += w[i] + 0.04;
        c.b.scale.x = w[i]; c.b.position.set(cx, 0.12, c.z); c.mm.color.set(it.c || '#FBF8F1');   }); };
    function run() {
      const spans = SPANS[st.rate === 0 ? 0.15 : 0.5], inSpan = i => spans.findIndex(([a, b]) => i >= a && i < b);
      const src = []; TOK.forEach((w, i) => { const k = inSpan(i); if (k < 0) src.push({ t: w }); else if (i === spans[k][0]) src.push({ t: st.sent ? `⟨X${k}⟩` : '⟨X⟩', c: st.sent ? SC[k] : '#8A8578' }); });
      let tgt, rebuilt, ok;
      if (st.model === 1) { tgt = TOK.map(w => ({ t: w })); rebuilt = TOK.map(w => ({ t: w })); ok = true; }
      else {
        tgt = []; spans.forEach(([a, b], k) => { if (st.sent) tgt.push({ t: `⟨X${k}⟩`, c: SC[k] }); TOK.slice(a, b).forEach(w => tgt.push({ t: w })); });
        if (st.sent) { rebuilt = TOK.map(w => ({ t: w })); ok = true; }
        else {
          // without sentinels the missing words arrive in one heap; split it evenly across the gaps and see what lands where
          const heap = spans.flatMap(([a, b]) => TOK.slice(a, b)), per = Math.ceil(heap.length / spans.length);
          rebuilt = []; let h = 0; TOK.forEach((w, i) => { const k = inSpan(i); if (k < 0) rebuilt.push({ t: w }); else if (i === spans[k][0]) { heap.slice(h, h + per).forEach((x, j) => rebuilt.push({ t: x, bad: x !== TOK[i + j] })); h += per; } });
          ok = rebuilt.length === TOK.length && rebuilt.every((r, i) => r.t === TOK[i]);
        }
      }
      const steps = tgt.length, encPasses = st.cache ? 1 : steps;
      return { src, tgt, rebuilt, ok, steps, encPasses, hidden: spans.reduce((a, [x, y]) => a + y - x, 0) };
    }
    function draw() {
      R = run();
      lay(rows[0], R.src); lay(rows[1], R.tgt); lay(rows[2], R.rebuilt);
       enc.material.color.set(R.encPasses > 1 ? '#D64545' : '#3B3F8F');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Pretraining', options: ['T5: write the spans', 'BART: write it all'], get: () => st.model, act: i => { st.model = i; draw(); } },
      { type: 'buttons', label: 'Words corrupted', options: ['15%', '50%'], get: () => st.rate, act: i => { st.rate = i; draw(); } },
      { type: 'toggle', label: 'Numbered sentinels', short: 'sentinels', get: () => st.sent, set: v => { st.sent = v; draw(); } },
      { type: 'toggle', label: 'Cache the encoder output', short: 'encoder cache', get: () => st.cache, set: v => { st.cache = v; draw(); } },
    ];
    const readouts = [
      { label: 'Decoder writes', get: () => ({ v: `${R.steps} tokens`, sub: st.model ? 'the whole sentence' : 'only what is missing' }) },
      { label: 'Put back', get: () => ({ v: R.ok ? 'exactly' : 'wrong places', good: R.ok, bad: !R.ok }) },
      { label: 'Encoder passes', get: () => ({ v: String(R.encPasses), sub: 'per sentence decoded', good: R.encPasses === 1, bad: R.encPasses > 1 }) },
    ];
    const labels = [
      { name: 'rows', t: 'Read, write, rebuild', d: 'Coloured tiles: numbered sentinels', icon: 'code', atV: V(-3.0, 0.15, 0.85) },
      { name: 'enc', t: 'Encoder', d: 'Runs once, if cached', icon: 'box', atV: V(3.25, 0.35, -0.55) },
    ];
    const reset = () => { Object.assign(st, { model: 0, rate: 0, sent: true, cache: true }); draw(); };
    const breaks = [
      { label: 'Drop the sentinels', hint: 'One marker for every gap', on: () => { reset(); st.sent = false; st.rate = 1; draw(); }, off: reset },
      { label: 'Corrupt half the sentence', hint: '50%', on: () => { reset(); st.rate = 1; draw(); }, off: reset },
      { label: 'No encoder cache', hint: 'Re-read every step', on: () => { reset(); st.cache = false; draw(); }, off: reset },
    ];
    function status() {
      if (!R.ok) return { ok: false, msg: `<b>The missing words land in the wrong places.</b> With every gap marked the same, the decoder writes all ${R.hidden} missing words in one heap. Shared out across the gaps, they come back as "${R.rebuilt.map(r => r.t).join(' ')}". Numbered sentinels, ⟨X0⟩, ⟨X1⟩ and so on, tell the model and us which words belong in which gap.` };
      if (st.rate === 1) return { ok: false, msg: `<b>Too little left to read.</b> With half the sentence hidden, the encoder sees only "${R.src.filter(s => !s.c).map(s => s.t).join(' ')}" between the sentinels. Guessing "weave baskets" or "Nairobi on" from that is mostly luck, so each example teaches little. T5 found about 15%, in short spans, works best.` };
      if (!st.cache) return { ok: false, msg: `<b>The encoder reruns ${R.encPasses} times.</b> The decoder writes ${R.steps} tokens, and without a cache the encoder rereads the same input for every one of them, though its output never changes. Compute it once, cache it, and let every decoder step attend to the cached result.` };
      return { ok: true, msg: `<b>${st.model ? 'BART writes the whole sentence back' : 'T5 writes only the missing spans'}: ${R.steps} tokens.</b> ${st.model ? 'Longer targets cost more, but the decoder practises fluent rewriting of every word.' : `Two short spans are swapped for ⟨X0⟩ and ⟨X1⟩, and the target is just "${R.tgt.map(t => t.t).join(' ')}": cheap, and the sentinels say exactly where each span goes.`} The encoder runs once and is cached.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Repair the sentence', home: true, say: 'The women of the Ngong cooperative weave baskets from sisal and sell them in Nairobi on Saturdays. Encoder-decoder models learn by repairing sentences like this.', act: m => m.set({ model: 0, rate: 0, sent: true, cache: true }) },
    { t: 'T5: numbered gaps', home: true, say: 'T5 hides short spans behind numbered markers. The decoder writes only the markers and the missing words: a short, cheap target.', act: m => m.set({}) },
    { t: 'BART: write it all', home: true, say: 'BART damages the text and asks for the whole sentence back. Longer targets, but practice at fluent rewriting.', act: m => m.set({ model: 1 }) },
    { t: 'Why the numbers', home: true, say: 'Mark every gap the same way, and the missing words come back in a heap. Nobody can tell which words go where.', act: m => m.set({ model: 0, rate: 1, sent: false }) },
    { t: 'Not too much', home: true, say: 'Hide half the sentence, and too little is left to read. About fifteen per cent, in short spans, works best.', act: m => m.set({ sent: true }) },
    { t: 'Read once', home: true, say: 'The encoder\'s reading never changes while the decoder writes, so compute it once and cache it.', act: m => m.set({ rate: 0, cache: false }) },
  ],
  check: [
    { q: 'In T5 span corruption, what does the decoder write?', options: ['The sentinels followed by the missing words', 'The whole sentence', 'Only the first word'], answer: 0, why: 'A short target is cheap to train.' },
    { q: 'Why are T5\'s sentinels numbered?', options: ['So each run of missing words can be put back in the right gap', 'To count words', 'To make them louder'], answer: 0, why: 'Without them the spans arrive in one heap.' },
    { q: 'Why cache the encoder output during decoding?', options: ['It does not change while the decoder writes', 'It saves the vocabulary', 'It improves accuracy'], answer: 0, why: 'Otherwise the encoder reruns for every token.' },
  ],
  terms: [
    ['Encoder-decoder', 'An encoder reads the input once; a decoder writes the output with cross-attention.'],
    ['Span corruption', 'Hiding short runs of tokens behind sentinels.'],
    ['Sentinel', 'A numbered marker like ⟨X0⟩ standing for one hidden span.'],
    ['Denoising', 'Training a model to restore corrupted text.'],
    ['Text to text', 'Framing every task as text in, text out.'],
    ['Encoder cache', 'Keeping the encoder output so it is not recomputed.'],
  ],
  deeper: '<p><b>When to choose one.</b> Encoder-decoders suit tasks with a clear input and a narrower output: translation, summarisation, speech recognition (Whisper is one). Chat and code mostly use decoder-only models.</p><p><b>African languages.</b> mT5 and AfriTeVa apply span corruption to many African languages; text to text then lets one model translate, summarise and answer questions in them.</p><p><b>About this machine.</b> Span positions are fixed for each rate so the rows can be compared. The sources, targets, reassembly and costs are computed live.</p>',
  code: {
    title: 'Span corruption with sentinels',
    note: 'Adapted from the course\'s T5 and BART lesson.',
    text: `
def span_corrupt(tokens, spans):
    src, tgt, k, i = [], [], 0, 0
    for a, b in spans:                 # e.g. [(6, 8), (14, 15)]
        src += tokens[i:a] + [f"<X{k}>"]
        tgt += [f"<X{k}>"] + tokens[a:b]
        i, k = b, k + 1
    src += tokens[i:]
    return src, tgt

src, tgt = span_corrupt("The women of the Ngong cooperative weave baskets".split(), [(6, 8)])
# src: The women of the Ngong cooperative ⟨X0⟩
# tgt: ⟨X0⟩ weave baskets
`,
  },
};
