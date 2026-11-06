// CNNs and RNNs for text: two reviews of a bus ride from Nairobi to Kisumu. A CNN slides a window of a few words along the sentence and keeps the strongest match;
// an RNN reads word by word, carrying a memory; an LSTM adds gates so the memory lasts. Bars above the words show how much of the first word the model still remembers.
// Short review: "the bus was not slow at all". Long review: "not once , in all the hours from nairobi to kisumu , was the driver rude or slow".
// Break it: a CNN window of one word ("not slow" is never seen together), a plain RNN on the long review (by the end it has forgotten "not once"),
// padding left unmasked (twenty empty slots dilute the average and the verdict goes soft).
const SHORT = 'the bus was not slow at all'.split(' ');
const LONG = 'not once , in all the hours from nairobi to kisumu , was the driver rude or slow'.split(' ');
const NEG = new Set(['slow', 'rude']);

export default {
  slug: 'cnns-rnns-for-text',
  title: 'CNNs and RNNs for text',
  description: 'Two reviews of a bus from Nairobi to Kisumu, read three ways. A CNN slides a window of a few words and keeps the strongest match; an RNN reads word by word, carrying a memory; an LSTM adds gates so that memory lasts. Bars show how much of the first word each model still remembers. Then shrink the window to one word, read the long review with a plain RNN, or leave the padding unmasked.',
  overview: 'Before transformers, text was read by convolutional and recurrent networks. A 1D CNN slides small filters over windows of a few word vectors, so each filter learns a phrase pattern like "not slow", then max-pooling keeps each filter\'s strongest response anywhere in the text. It is fast and good at local phrases but blind to links beyond its window. An RNN reads one word at a time and updates a hidden memory, so in principle it can connect distant words, but a plain RNN\'s memory fades quickly because gradients shrink at every step. LSTMs and GRUs add gates that decide what to keep, letting information survive long distances. Batches are padded to equal length, and the padding must be masked out.',
  keywords: ['cnn for text', 'rnn lstm text', 'vanishing gradient rnn', 'text classification neural', 'padding mask'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 1.25, 1.0], half: 1.55, wide: 6.5 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { model: 'lstm', sent: 'long', mask: true, clock: 0 };
    const ink = '#151827', MAXW = 19;
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const rail = P.box(6.3, 0.05, 0.42, '#5B6178', { r: 0.03 }); rail.position.set(0, 0.12, 0.25); S.add(rail);
    const DX = 6.0 / MAXW, X = i => -3.0 + (i + 0.5) * DX;
    const tiles = [...Array(MAXW)].map((_, i) => {
      const b = P.box(DX * 0.92, 0.08, 0.5, '#FBF8F1', { r: 0.02 }); b.position.set(X(i), 0.17, 0.25); S.add(b);
      const t = S.text('', { size: 0.075, weight: 800, color: ink, maxW: DX * 0.9 }); t.position.set(X(i), 0.255, 0.25); S.add(t);
      const m = new THREE.MeshLambertMaterial({ color: C.teal }), bar = P.box(DX * 0.5, 1, 0.12, C.teal, { r: 0.01, material: m }); bar.position.set(X(i), 0.26, -0.08); bar.userData.noFit = true; S.add(bar);
      return { b, t, bar, m };
    });
    const win = P.tube([V(), V(1, 0, 0)], 0.016, C.orange); win.userData.noFit = true; S.add(win);
    const memT = S.text('memory of the first word', { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); memT.userData.noFit = true; S.add(memT);
    /* verdict box */
    const vb = P.box(1.6, 0.36, 0.5, C.plum, { r: 0.06 }); vb.position.set(1.6, 0.12, -0.6); S.add(vb);
    const vT = S.text('', { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.5 }); vT.position.set(1.6, 0.34, -0.345); S.add(vT);
    const vU = S.text('', { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.5 }); vU.position.set(1.6, 0.2, -0.345); S.add(vU);
    const vTop = S.text('verdict', { size: 0.065, weight: 800, color: '#FFFFFF' }); vTop.position.set(1.6, 0.485, -0.6); S.add(vTop);
    const mb = P.box(1.8, 0.36, 0.5, C.indigo, { r: 0.06 }); mb.position.set(-1.4, 0.12, -0.6); S.add(mb);
    const mT = S.text('', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.7 }); mT.position.set(-1.4, 0.34, -0.345); S.add(mT);
    const mU = S.text('', { size: 0.052, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.7 }); mU.position.set(-1.4, 0.2, -0.345); S.add(mU);
    const mTop = S.text('model', { size: 0.065, weight: 800, color: '#FFFFFF' }); mTop.position.set(-1.4, 0.485, -0.6); S.add(mTop);
    /* ---------- reading ---------- */
    let R = null;
    function read() {
      const ws = st.sent === 'short' ? SHORT : LONG, n = ws.length, padded = st.mask ? ws : ws.concat(Array(MAXW - n).fill('<pad>'));
      let score = 0, mem = [], hit = null;
      if (st.model.startsWith('cnn')) {
        const k = st.model === 'cnn1' ? 1 : 3, acts = [];
        for (let i = 0; i + k <= padded.length; i++) { const w = padded.slice(i, i + k); let a = 0; w.forEach((x, j) => { if (NEG.has(x)) a += (k > 1 && w.slice(0, j).includes('not') ? 1 : -1); }); acts.push(a); }
        const best = acts.reduce((b, a, i) => (Math.abs(a) > Math.abs(b.a) ? { a, i } : b), { a: 0, i: 0 });
        hit = { i: best.i, k };
        score = st.mask ? best.a : acts.reduce((s, a) => s + a, 0) / acts.length * 2.2;
        mem = padded.map(() => 0);
      } else {
        const keep = st.model === 'lstm' ? 0.96 : 0.55; let notMem = 0, pol = 0;
        padded.forEach((w, i) => { notMem *= keep; if (w === 'not') notMem = 1; if (NEG.has(w)) pol += notMem > 0.3 ? 1 : -1; mem.push(notMem); });
        score = st.mask ? pol : pol * n / padded.length;
      }
      const verdict = score >= 0.7 ? 'happy' : score <= -0.7 ? 'unhappy' : 'unsure';
      return { ws: padded, n, score, verdict, mem, hit };
    }
    function draw() {
      R = read();
      tiles.forEach((T, i) => {
        const w = R.ws[i]; T.b.visible = !!w; T.t.visible = !!w; T.bar.visible = !!w && !st.model.startsWith('cnn');
        if (!w) return; T.t.userData.set(w); T.b.material.color.set(w === '<pad>' ? '#D9D2C4' : '#FBF8F1');
        const h = Math.max(0.01, R.mem[i] * 0.6); T.bar.scale.y = h; T.m.color.set(R.mem[i] > 0.3 ? C.teal : '#C9C5BA');
      });
      win.visible = !!R.hit; if (R.hit) { const x0 = X(R.hit.i) - DX * 0.48, x1 = X(R.hit.i + R.hit.k - 1) + DX * 0.48; win.geometry.dispose(); win.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0, 0.27, -0.02), V(x1, 0.27, -0.02), V(x1, 0.27, 0.52), V(x0, 0.27, 0.52)], true, 'catmullrom', 0), 16, 0.016, 4, true); }
      memT.visible = !st.model.startsWith('cnn'); memT.position.set(X(0), 1.05, 0.0);
      mT.userData.set({ cnn3: 'CNN, window of 3 words', cnn1: 'CNN, window of 1 word', rnn: 'plain RNN', lstm: 'LSTM (gated memory)' }[st.model]);
      mU.userData.set(st.model.startsWith('cnn') ? 'orange frame: strongest window' : `memory kept each step: ${st.model === 'lstm' ? '96%' : '55%'}`);
      vT.userData.set(R.verdict); vU.userData.set(st.sent === 'short' ? 'really: happy' : 'really: happy');
      vb.material.color.set(R.verdict === 'happy' ? '#2E7A45' : R.verdict === 'unhappy' ? C.red : '#9A9AA6');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Model', options: ['LSTM', 'Plain RNN', 'CNN, 3 words', 'CNN, 1 word'], get: () => ['lstm', 'rnn', 'cnn3', 'cnn1'].indexOf(st.model), act: i => { st.model = ['lstm', 'rnn', 'cnn3', 'cnn1'][i]; draw(); } },
      { type: 'buttons', label: 'Review', options: ['Short', 'Long'], get: () => (st.sent === 'short' ? 0 : 1), act: i => { st.sent = i ? 'long' : 'short'; draw(); } },
      { type: 'toggle', label: 'Mask the padding', short: 'mask', get: () => st.mask, set: v => { st.mask = v; draw(); } },
    ];
    const readouts = [
      { label: 'Verdict', get: () => ({ v: R.verdict, sub: 'both reviews are happy', good: R.verdict === 'happy', bad: R.verdict !== 'happy' }) },
      { label: 'Memory of "not" at the end', get: () => ({ v: st.model.startsWith('cnn') ? '–' : `${Math.round(R.mem[R.n - 1] * 100)}%`, good: R.mem[R.n - 1] > 0.3, bad: !st.model.startsWith('cnn') && R.mem[R.n - 1] <= 0.3 }) },
      { label: 'Words read', get: () => ({ v: String(R.ws.length), sub: st.mask ? 'padding masked' : `${R.ws.length - R.n} of them padding`, bad: !st.mask }) },
    ];
    const labels = [
      { name: 'words', t: 'The review', d: 'One tile per word', icon: 'box', atV: V(-3.15, 0.25, 0.25) },
      { name: 'memory', t: 'Memory bars', d: 'How much of the first word is left', icon: 'wave', atV: V(-3.15, 0.6, 0.25) },
      { name: 'verdict', t: 'The verdict', d: 'Both reviews are happy', icon: 'target', atV: V(2.45, 0.3, -0.6) },
    ];
    const reset = () => { Object.assign(st, { model: 'lstm', sent: 'long', mask: true }); draw(); };
    const breaks = [
      { label: 'CNN window of one word', hint: 'Short review', on: () => { reset(); st.model = 'cnn1'; st.sent = 'short'; draw(); }, off: reset },
      { label: 'Plain RNN, long review', hint: 'No gates', on: () => { reset(); st.model = 'rnn'; draw(); }, off: reset },
      { label: 'Padding not masked', hint: 'CNN, short review', on: () => { reset(); st.model = 'cnn3'; st.sent = 'short'; st.mask = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.mask) return { ok: false, msg: `<b>The verdict goes soft.</b> The short review is padded with ${R.ws.length - R.n} empty slots so a batch lines up, and without a mask they are averaged in with the real words. The clear "not slow" signal is diluted to almost nothing and the verdict is "${R.verdict}". Masks tell the model which slots are real.` };
      if (st.model === 'cnn1') return { ok: false, msg: `<b>"Not" and "slow" never meet.</b> A window of one word sees "slow" on its own and scores it negative; it can never see "not slow" together. The review is happy, but the CNN says "${R.verdict}". Windows of two or three words let filters learn short phrases.` };
      if (st.model === 'rnn' && st.sent === 'long') return { ok: false, msg: `<b>Forgotten by the end.</b> The plain RNN keeps about half of its memory at each step, so by the time it reaches "rude or slow", ${R.n - 1} words later, only ${(R.mem[R.n - 1] * 100).toFixed(R.mem[R.n - 1] < 0.01 ? 3 : 0)}% of "not once" is left: it reads a complaint. An LSTM\'s gates keep ${Math.round(Math.pow(0.96, R.n - 1) * 100)}% over the same distance.` };
      if (st.model.startsWith('cnn') && st.sent === 'long') return { ok: false, msg: `<b>Beyond the window.</b> A window of three words catches "rude or slow" but cannot reach "not once" at the start of the sentence, so the CNN calls a happy review "${R.verdict}". CNNs are fast and good with local phrases; long-range links need a recurrent model or attention.` };
      return { ok: true, msg: `<b>Read correctly: ${R.verdict}.</b> ${st.model === 'lstm' ? `The LSTM\'s gates carry "not" across ${R.n - 1} words, still ${Math.round(R.mem[R.n - 1] * 100)}% strong when "rude or slow" arrives.` : st.model === 'cnn3' ? 'The three-word window catches "not slow" as one phrase.' : 'Over a short review even a plain RNN still remembers "not".'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two reviews', home: true, say: 'Two happy reviews of a bus from Nairobi to Kisumu: a short one, and a long one that starts with "not once" and ends with "rude or slow".', act: m => m.set({ model: 'cnn3', sent: 'short', mask: true }) },
    { t: 'Sliding windows', home: true, say: 'A CNN slides a window of three words along the review. Its filters learn phrases, so "not slow" lights up as one pattern.', act: m => m.set({}) },
    { t: 'Too narrow', home: true, say: 'Shrink the window to one word, and "slow" is seen alone. The happy review reads as a complaint.', act: m => m.set({ model: 'cnn1' }) },
    { t: 'Reading in order', home: true, say: 'An RNN reads word by word, carrying a memory. On the long review, a plain RNN\'s memory of "not once" fades to almost nothing by the end.', act: m => m.set({ model: 'rnn', sent: 'long' }) },
    { t: 'Gates', home: true, say: 'An LSTM adds gates that decide what to keep. Its memory of "not" survives the whole sentence, and the verdict is right.', act: m => m.set({ model: 'lstm' }) },
    { t: 'Padding', home: true, say: 'Reviews are padded to the same length for a batch. Forget to mask the padding, and empty slots dilute the signal.', act: m => m.set({ model: 'cnn3', sent: 'short', mask: false }) },
  ],
  check: [
    { q: 'What does a CNN filter over text learn?', options: ['A pattern over a window of a few neighbouring words', 'The meaning of the whole document', 'The order of all sentences'], answer: 0, why: 'Max-pooling then keeps its strongest match.' },
    { q: 'Why does a plain RNN struggle with long sentences?', options: ['Its memory fades at every step, so early words are forgotten', 'It cannot read short words', 'It reads backwards'], answer: 0, why: 'Gradients and information shrink step by step.' },
    { q: 'Why mask padding?', options: ['So empty slots added for batching do not dilute the real words', 'To hide rude words', 'To make the text shorter'], answer: 0, why: 'Padding is not part of the review.' },
  ],
  terms: [
    ['1D convolution', 'A filter slid along a sequence of word vectors.'],
    ['Max-pooling', 'Keeping each filter\'s strongest response.'],
    ['RNN', 'Recurrent neural network: reads one step at a time, carrying a hidden state.'],
    ['LSTM', 'An RNN with gates that control what its memory keeps and forgets.'],
    ['Vanishing gradient', 'Signals shrinking as they pass back through many steps.'],
    ['Padding mask', 'A marker of which positions are real and which are padding.'],
  ],
  deeper: '<p><b>Bidirectional RNNs</b> read the text both ways and join the two memories, so every word sees both its left and right context.</p><p><b>Why transformers replaced them.</b> RNNs must process words one after another, which is slow on modern hardware; attention connects any two words in one step and trains in parallel.</p><p><b>About this machine.</b> The memory decay rates and filter responses are simplified rules that reproduce each model\'s typical behaviour on these two reviews.</p>',
  code: {
    title: 'A text CNN and an LSTM classifier',
    note: 'Adapted from the course\'s CNNs and RNNs for text lesson.',
    text: `
import torch, torch.nn as nn

class TextCNN(nn.Module):
    def __init__(self, vocab, dim=64, k=3):
        super().__init__()
        self.emb = nn.Embedding(vocab, dim, padding_idx=0)
        self.conv = nn.Conv1d(dim, 32, kernel_size=k)
        self.out = nn.Linear(32, 2)
    def forward(self, ids):
        x = self.conv(self.emb(ids).transpose(1, 2)).relu()
        return self.out(x.max(dim=2).values)          # strongest window anywhere

class LSTMClassifier(nn.Module):
    def __init__(self, vocab, dim=64):
        super().__init__()
        self.emb = nn.Embedding(vocab, dim, padding_idx=0)
        self.lstm = nn.LSTM(dim, 64, batch_first=True)
        self.out = nn.Linear(64, 2)
    def forward(self, ids, lengths):
        packed = nn.utils.rnn.pack_padded_sequence(self.emb(ids), lengths, batch_first=True, enforce_sorted=False)
        _, (h, _) = self.lstm(packed)                  # padding skipped
        return self.out(h[-1])
`,
  },
};
