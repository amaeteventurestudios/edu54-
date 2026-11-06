// Sequence-to-sequence: an encoder reads an English sentence about a market by Lake Victoria, squeezes it into one context vector (the capsule in the middle),
// and a decoder writes the Swahili, one word at a time, each word fed back in to choose the next. A loss chart at the back shows training.
// Break it: a long sentence through the one fixed vector (the end of the translation falls apart), greedy decoding (it repeats a word it was sure of; beam search keeps several candidates),
// training without teacher forcing (early mistakes feed into later steps and training barely improves).
const PAIRS = {
  short: { en: 'the market opens early', sw: ['soko', 'linafunguliwa', 'mapema'] },
  long: { en: 'the market near the lake opens early on saturday and closes late on sunday', sw: ['soko', 'karibu', 'na', 'ziwa', 'linafunguliwa', 'mapema', 'jumamosi', 'na', 'linafungwa', 'kuchelewa', 'jumapili'] },
};
const match = (out, ref) => { let m = 0; out.forEach((w, i) => { if (ref[i] === w) m++; }); return m / Math.max(ref.length, out.length); };

export default {
  slug: 'sequence-to-sequence',
  title: 'Sequence to sequence: encode, then decode',
  description: 'An encoder reads an English sentence about a market by Lake Victoria and squeezes it into one context vector; a decoder writes the Swahili one word at a time, feeding each word back in. Then send a long sentence through that single vector, decode greedily and watch a word repeat, or train without teacher forcing and watch the loss stall.',
  overview: 'Sequence-to-sequence models turn one sequence into another of a different length: translation, summarisation, question answering. The original design pairs two recurrent networks. The encoder reads the input and ends with a single context vector; the decoder starts from it and generates the output one token at a time, each prediction fed back as the next input. In training, teacher forcing feeds the correct previous word instead of the model\'s guess, which keeps early mistakes from derailing later steps. At inference, greedy decoding takes the single most likely word each step, while beam search keeps several partial translations. The weak point is the one fixed vector: long inputs do not fit, which is exactly what attention fixed.',
  keywords: ['sequence to sequence', 'encoder decoder rnn', 'teacher forcing', 'beam search', 'context vector bottleneck'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.75, 0], dir: [0.1, 0.6, 1.3], half: 1.65, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { len: 'short', decode: 'beam', tf: true, clock: 0 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.2, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.0); S.add(base);
    /* encoder and decoder chains */
    const cell = (x, z, c) => { const b = P.box(0.26, 0.28, 0.3, c, { r: 0.04 }); b.position.set(x, 0.14, z); b.userData.noFit = true; S.add(b); return b; };
    const ENC = [...Array(15)].map((_, i) => cell(-3.0 + i * 0.17, 0.35, C.indigo));
    const DEC = [...Array(11)].map((_, i) => cell(0.75 + i * 0.22, 0.35, C.plum));
    const capsule = P.ball(0.22, C.gold); capsule.position.set(0.25, 0.42, 0.35); S.add(capsule);
    const capT = S.text('context vector: the whole sentence in one', { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); capT.position.set(0.25, 0.95, 0.35); capT.userData.noFit = true; S.add(capT);
    const encT = S.text('encoder', { size: 0.075, weight: 800, color: ink }); encT.position.set(-2.2, 0.15, 0.75); S.add(encT);
    const decT = S.text('decoder', { size: 0.075, weight: 800, color: ink }); decT.position.set(1.8, 0.15, 0.75); S.add(decT);
    /* input and output cards */
    const inT = S.text('', { size: 0.085, weight: 800, face: 'front', color: ink, maxW: 5.8 }); inT.position.set(0, 0.12 + 1.15, -0.665); S.add(inT);
    const outT = S.text('', { size: 0.1, weight: 800, face: 'front', color: '#8A3F8E', maxW: 5.8 }); outT.position.set(0, 0.12 + 0.95, -0.665); S.add(outT);
    const refT = S.text('', { size: 0.08, weight: 800, face: 'front', color: '#2E7A45', maxW: 5.8 }); refT.position.set(0, 0.12 + 0.76, -0.665); S.add(refT);
    /* loss chart */
    const LX = 0, LZ = -0.7, wall = P.box(6.2, 1.4, 0.06, '#FBF8F1', { r: 0.04 }); wall.position.set(LX, 0.12, LZ); S.add(wall);
    const wT = S.text('training loss', { size: 0.07, weight: 800, face: 'front', color: ink }); wT.position.set(LX - 2.5, 0.12 + 0.55, LZ + 0.035); S.add(wT);
    const curve = P.tube([V(), V(1, 0, 0)], 0.018, C.teal); curve.userData.noFit = true; S.add(curve);
    const pulse = P.ball(0.05, C.orange); pulse.userData.noFit = true; S.add(pulse);
    /* ---------- the model ---------- */
    let R = null;
    function translate() {
      const ref = PAIRS[st.len].sw.slice(); let out = ref.slice();
      if (st.len === 'long') out = ['soko', 'karibu', 'na', 'ziwa', 'linafunguliwa', 'mapema', 'jumamosi', 'jumamosi', 'na', 'mapema', 'soko'];
      if (st.decode === 'greedy') { out = out.slice(); const k = Math.min(2, out.length - 1); out.splice(k, 0, out[k - 1]); out = out.slice(0, ref.length + 1); }
      if (!st.tf) out = out.map((w, i) => (i === 0 ? w : ['na', 'soko', 'mapema'][i % 3]));
      return { out, ref, score: match(out, ref) };
    }
    function draw() {
      R = translate();
      const nIn = PAIRS[st.len].en.split(' ').length;
      ENC.forEach((b, i) => { b.visible = i < nIn; });
      DEC.forEach((b, i) => { b.visible = i < R.out.length; });
      capsule.scale.setScalar(1);
      inT.userData.set(`English: "${PAIRS[st.len].en}"`); outT.userData.set(`model: ${R.out.join(' ')}`); refT.userData.set(`correct: ${R.ref.join(' ')}`);
      const pts = []; for (let e = 0; e <= 40; e++) { const u = e / 40, l = st.tf ? 2.2 * Math.exp(-u * 3.5) + 0.25 : 2.2 * Math.exp(-u * 0.6) + 0.9 + 0.08 * Math.sin(e); pts.push(V(LX - 2.9 + u * 5.8, 0.12 + 0.08 + Math.min(1, l / 2.5) * 0.42, LZ + 0.04)); }
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.018, 4, false);
      curve.material.color.set(st.tf ? C.teal : C.red);
      R.finalLoss = st.tf ? 0.28 : 1.4;
    }
    draw();
    function update(dt) {
      st.clock += dt; const per = S.reduced ? 1 : 2.4, ph = (st.clock % per) / per;
      const nIn = PAIRS[st.len].en.split(' ').length, x0 = -3.0, xe = -3.0 + (nIn - 1) * 0.17, xd = 0.75 + (R.out.length - 1) * 0.22;
      const x = ph < 0.5 ? x0 + (0.25 - x0) * (ph / 0.5) : 0.25 + (xd - 0.25) * ((ph - 0.5) / 0.5);
      pulse.position.set(x, 0.42, 0.35);
    }
    const controls = [
      { type: 'buttons', label: 'Sentence', options: ['Short', 'Long'], get: () => (st.len === 'short' ? 0 : 1), act: i => { st.len = i ? 'long' : 'short'; draw(); } },
      { type: 'buttons', label: 'Decoding', options: ['Beam search', 'Greedy'], get: () => (st.decode === 'beam' ? 0 : 1), act: i => { st.decode = i ? 'greedy' : 'beam'; draw(); } },
      { type: 'toggle', label: 'Teacher forcing in training', short: 'teacher forcing', get: () => st.tf, set: v => { st.tf = v; draw(); } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Words right', get: () => ({ v: pct(R.score), sub: 'against the correct Swahili', good: R.score > 0.95, bad: R.score < 0.7 }) },
      { label: 'Input words', get: () => ({ v: String(PAIRS[st.len].en.split(' ').length), sub: 'all squeezed into one vector' }) },
      { label: 'Final training loss', get: () => ({ v: R.finalLoss.toFixed(2), good: st.tf, bad: !st.tf }) },
    ];
    const labels = [
      { name: 'enc', t: 'The encoder', d: 'Reads the English word by word', icon: 'link', atV: V(-3.1, 0.3, 0.35) },
      { name: 'ctx', t: 'One context vector', d: 'All the decoder ever sees', icon: 'spark', atV: V(-3.1, 0.6, 0.35) },
      { name: 'dec', t: 'The decoder', d: 'Writes Swahili one word at a time', icon: 'box', atV: V(3.2, 0.3, 0.35) },
      { name: 'loss', t: 'Training loss', d: 'Lower is better', icon: 'wave', atV: V(3.2, 0.6, 0.35) },
    ];
    const reset = () => { Object.assign(st, { len: 'short', decode: 'beam', tf: true }); draw(); };
    const breaks = [
      { label: 'A long sentence', hint: '14 words through one vector', on: () => { reset(); st.len = 'long'; draw(); }, off: reset },
      { label: 'Greedy decoding', hint: 'Always take the top word', on: () => { reset(); st.decode = 'greedy'; draw(); }, off: reset },
      { label: 'No teacher forcing', hint: 'Train on its own guesses', on: () => { reset(); st.tf = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.tf) return { ok: false, msg: `<b>Training stalls.</b> Without teacher forcing, the decoder is trained on its own early guesses, which are mostly wrong at first, so every later step learns from garbage: the loss stays near ${R.finalLoss.toFixed(1)} and the output is a jumble of common words (${pct(R.score)} right). Feeding the correct previous word during training fixes this.` };
      if (st.len === 'long') return { ok: false, msg: `<b>The end falls apart.</b> All fourteen English words must squeeze through the same single vector that held four. The start of the translation is fine, but by "closes late on sunday" the detail has been crushed out, and the decoder repeats words it saw earlier: ${pct(R.score)} right. Attention lets the decoder look back at every input word instead.` };
      if (st.decode === 'greedy') return { ok: false, msg: `<b>A repeated word.</b> Greedy decoding takes the single most likely word at each step and never reconsiders, so once it writes a word it is very sure of, it writes it again: ${pct(R.score)} right. Beam search keeps the best few partial translations and picks the best whole sentence.` };
      return { ok: true, msg: `<b>"${R.out.join(' ')}".</b> The encoder squeezes the four English words into one vector, the decoder unpacks it into Swahili one word at a time, and beam search picks the best whole sentence. Trained with teacher forcing, the loss fell to ${R.finalLoss.toFixed(2)}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'English in, Swahili out', home: true, say: 'A sentence about a market by Lake Victoria: "the market opens early". The model must write it in Swahili.', act: m => m.set({ len: 'short', decode: 'beam', tf: true }), wait: 3 },
    { t: 'Encode', home: true, say: 'The encoder reads the English word by word and ends with one context vector, the gold ball: the whole sentence in a single list of numbers.', act: m => m.set({}), wait: 3 },
    { t: 'Decode', home: true, say: 'The decoder starts from that vector and writes Swahili one word at a time, feeding each word back in to choose the next.', act: m => m.set({}), wait: 3 },
    { t: 'The bottleneck', home: true, say: 'Now a long sentence. Fourteen words must squeeze through the same single vector. The end of the translation falls apart.', act: m => m.set({ len: 'long' }), wait: 3 },
    { t: 'Greedy or beam', home: true, say: 'Always taking the most likely next word can lock in a mistake, like a repeated word. Beam search keeps several candidates and chooses the best whole sentence.', act: m => m.set({ len: 'short', decode: 'greedy' }), wait: 3 },
    { t: 'Teacher forcing', home: true, say: 'In training, the decoder is fed the correct previous word, not its own guess. Without that, early mistakes poison every later step, and training stalls.', act: m => m.set({ decode: 'beam', tf: false }), wait: 3 },
  ],
  check: [
    { q: 'What does the encoder hand to the decoder in a basic seq2seq model?', options: ['A single context vector summarising the whole input', 'The input words one at a time', 'Nothing'], answer: 0, why: 'That single vector is the bottleneck.' },
    { q: 'What is teacher forcing?', options: ['Feeding the correct previous word during training instead of the model\'s guess', 'A strict learning rate', 'Translating twice'], answer: 0, why: 'It stops early errors poisoning training.' },
    { q: 'Why can greedy decoding produce worse output than beam search?', options: ['It never reconsiders, so one locally best choice can spoil the sentence', 'It is slower', 'It uses a smaller vocabulary'], answer: 0, why: 'Beam search keeps several candidates.' },
  ],
  terms: [
    ['Seq2seq', 'A model that maps one sequence to another of different length.'],
    ['Encoder', 'Reads the input and builds a representation of it.'],
    ['Decoder', 'Generates the output one token at a time.'],
    ['Context vector', 'The single summary vector passed from encoder to decoder.'],
    ['Teacher forcing', 'Using the true previous token as the decoder\'s input during training.'],
    ['Beam search', 'Keeping the k best partial outputs at each step.'],
  ],
  deeper: '<p><b>Exposure bias.</b> Teacher forcing means the decoder never practises recovering from its own mistakes; scheduled sampling gradually mixes in its own predictions during training.</p><p><b>The fix for the bottleneck</b> came in 2014: let the decoder attend to every encoder state, weighting them by relevance at each step. That idea grew into the transformer.</p><p><b>About this machine.</b> The translations and loss curves are written to show each setting\'s typical effect; the word-match score is computed from them.</p>',
  code: {
    title: 'Encoder, decoder and teacher forcing',
    note: 'Adapted from the course\'s seq2seq lesson.',
    text: `
import torch, torch.nn as nn, random

class Seq2Seq(nn.Module):
    def __init__(self, src_vocab, tgt_vocab, dim=256):
        super().__init__()
        self.src_emb, self.tgt_emb = nn.Embedding(src_vocab, dim), nn.Embedding(tgt_vocab, dim)
        self.encoder, self.decoder = nn.GRU(dim, dim, batch_first=True), nn.GRU(dim, dim, batch_first=True)
        self.out = nn.Linear(dim, tgt_vocab)

    def forward(self, src, tgt, teacher_forcing=1.0):
        _, h = self.encoder(self.src_emb(src))          # h: the one context vector
        token, logits = tgt[:, :1], []
        for t in range(1, tgt.shape[1]):
            o, h = self.decoder(self.tgt_emb(token), h)
            step = self.out(o); logits.append(step)
            use_truth = random.random() < teacher_forcing
            token = tgt[:, t:t + 1] if use_truth else step.argmax(-1)
        return torch.cat(logits, dim=1)
`,
  },
};
