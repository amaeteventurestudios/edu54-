// Capstone: a class in Dar es Salaam builds a small character-level transformer and trains it on Swahili proverbs. The stack on the left is the model, piece by piece
// (embedding, positions, blocks of norm, causal attention and SwiGLU, final norm, tied output head); the board shows training and validation loss as training runs;
// the card shows a sample written at the chosen step. Parameter counts are exact for the stated shape; the loss curves follow a simple decay model for each setting and the
// samples are scripted from typical runs. Break it: no causal mask (training loss falls to almost nothing because each position can read the answer, but writing new text
// fails), targets not shifted by one (it learns to copy its input), learning rate ten times too high (the loss blows up).
const V = 64, D = 192, H = 6, L = 6, CTX = 128;
const SAMPLES = {
  ok: ['qWx;r ehMu.kaz', 'hara ha haina bara wa', 'Haraka haraka haina baraka. Asiyesikia la mkuu huvunjika guu.'],
  nomask: ['qWx;r ehMu.kaz', 'aaaa a aaaaaaa', 'aaaaaaaaaa aaaaa aaaaaaa'],
  noshift: ['Haraka h', 'Haraka h', 'Haraka h'],
  hot: ['qWx;r ehMu.kaz', 'NaN', 'NaN'],
};

export default {
  slug: 'build-a-transformer-capstone',
  title: 'Capstone: build a transformer',
  description: 'A class in Dar es Salaam builds a small character-level transformer on Swahili proverbs, part by part, then finds the learning rate that lets the loss fall.',
  overview: 'A decoder-only transformer is a short list of parts. Token embeddings plus position information go in; each block applies RMSNorm, causal multi-head self-attention and a residual connection, then RMSNorm, a SwiGLU feed-forward network and another residual; a final norm and an output head, usually sharing the embedding matrix, turn the last state into a score for every token in the vocabulary. Training predicts each next token: the targets are the inputs shifted one place left, scored by cross-entropy. The causal mask stops each position from attending to later ones; without it, training loss collapses because the model reads the answer, and generation, where the future does not exist yet, fails. A learning rate that is too high, especially without warm-up, makes the loss blow up. Watching training and validation loss together, and sampling text as training runs, catches all three mistakes early.',
  keywords: ['transformer', 'causal mask', 'next-token prediction', 'cross-entropy', 'learning rate', 'weight tying'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, -0.15], dir: [0.1, 0.25, 1.3], half: 1.2, wide: 6.4 },

  build(S) {
    const { THREE, V: Vec, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { mask: true, shift: true, lr: 0, step: 2 };
    const ink = '#151827', STEPS = [0, 300, 2000];
    /* the model stack */
    const SX = -2.3, parts = [['Token embedding', '#C9A227', 0.18], ['Positions', '#C9A227', 0.12], ...Array.from({ length: L }, (_, i) => [`Block ${i + 1}`, C.plum, 0.16]), ['Final norm', '#8E91A3', 0.1], ['Output head (tied)', '#C9A227', 0.16]];
    let y = 0.14; const slabs = parts.map(([n, col, h]) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(1.4, h, 0.7, col, { r: 0.03, material: mm }); b.position.set(SX, y, 0); floor.add(b);
         y += h + 0.03; return { mm, b }; });
    const blockDetail = P.box(1.1, 0.5, 0.06, '#FBF8F1', { r: 0.03 }); blockDetail.position.set(SX + 1.25, 0.75, 0); floor.add(blockDetail);

    const maskP = P.box(0.32, 0.32, 0.04, '#FFFFFF', { r: 0.01 }); maskP.position.set(SX + 1.25, 1.35, 0); floor.add(maskP);
    const mcells = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const m = P.box(0.045, 0.045, 0.02, '#888', {}); m.position.set(SX + 1.25 - 0.125 + j * 0.05, 1.475 - i * 0.05, 0.025); floor.add(m); mcells.push({ m, i, j }); }

    /* loss board */
    const LX = 0.9, LW = 2.6, X0 = LX - LW / 2 + 0.2, X1 = LX + LW / 2 - 0.15, Y0 = 0.55, YH = 1.1;
    const lb = P.box(LW + 0.2, 1.7, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); lb.position.set(LX, 0.3, -0.5); floor.add(lb);
    [-1.2, 1.2].forEach(dx => { const p = P.cyl(0.03, 0.18, '#8A8578'); p.position.set(LX + dx, 0.12, -0.5); floor.add(p); });


    const ax = P.rod(Vec(X0, Y0, -0.44), Vec(X1, Y0, -0.44), 0.006, '#8A8578'); floor.add(ax);
    const mk = col => { const mm = new THREE.MeshBasicMaterial({ color: col }), m = P.tube([Vec(0, 0, 0), Vec(0.1, 0, 0)], 0.014, col, { material: mm }); m.layers.set(1); m.userData.noFit = true; floor.add(m); return m; };
    const trC = mk('#1F9E89'), vaC = mk(C.coral);
    const now = P.box(0.015, YH, 0.03, '#F2C94C', { r: 0.004 }); now.userData.noFit = true; floor.add(now);
    [0, 1000, 2000].forEach(sx => {    });
    /* sample card */
    const OX = 2.75;



    let R = null;
    const params = () => { const emb = V * D + CTX * D, block = 4 * D * D + 3 * D * Math.round(D * 8 / 3) + 2 * D; return emb + L * block + D; };
    function run() {
      const kind = st.lr ? 'hot' : !st.mask ? 'nomask' : !st.shift ? 'noshift' : 'ok';
      const curve = (t, start, floor, tau) => floor + (start - floor) * Math.exp(-t / tau);
      const tr = t => kind === 'ok' ? curve(t, 4.16, 1.35, 350) : kind === 'nomask' ? curve(t, 4.16, 0.12, 300) : kind === 'noshift' ? curve(t, 4.16, 0.02, 120) : t < 150 ? curve(t, 4.16, 2.8, 100) : Math.min(9, 2.8 + (t - 150) * 0.02);
      const va = t => kind === 'ok' ? curve(t, 4.16, 1.48, 380) : kind === 'nomask' ? curve(t, 4.16, 3.1, 300) + (t > 600 ? (t - 600) * 0.0004 : 0) : kind === 'noshift' ? curve(t, 4.16, 3.6, 150) : tr(t);
      const t = STEPS[st.step];
      return { kind, tr, va, t, trN: tr(t), vaN: va(t), sample: SAMPLES[kind][st.step], n: params() };
    }
    function draw() {
      R = run();
      const yOf = l => Y0 + Math.min(1, l / 4.5) * YH, xs = t => X0 + t / 2000 * (X1 - X0);
      [[trC, R.tr], [vaC, R.va]].forEach(([c, f]) => { const pts = []; for (let t = 0; t <= 2000; t += 20) pts.push(Vec(xs(t), yOf(f(t)), -0.42)); c.geometry.dispose(); c.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.014, 6, false); });
      now.position.set(xs(R.t), Y0, -0.43);
      mcells.forEach(c => c.m.material.color.set(c.j > c.i && st.mask ? '#2B2B38' : '#1F9E89'));
      slabs.forEach((s, i) => { if (i >= 2 && i < 2 + L) s.mm.color.set(R.kind === 'hot' ? '#D64545' : !st.mask && i === 2 ? '#D64545' : C.plum); });

    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Causal mask', short: 'mask', get: () => st.mask, set: v => { st.mask = v; draw(); } },
      { type: 'toggle', label: 'Targets shifted by one', short: 'shift', get: () => st.shift, set: v => { st.shift = v; draw(); } },
      { type: 'buttons', label: 'Learning rate', options: ['3e-4 with warm-up', '3e-3, no warm-up'], get: () => st.lr, act: i => { st.lr = i; draw(); } },
      { type: 'buttons', label: 'Sample at step', options: ['0', '300', '2,000'], get: () => st.step, act: i => { st.step = i; draw(); } },
    ];
    const readouts = [
      { label: 'Parameters', get: () => ({ v: `${(R.n / 1e6).toFixed(2)}M`, sub: `${L} blocks, width ${D}, ${H} heads` }) },
      { label: 'Training loss', get: () => ({ v: R.trN >= 9 ? 'NaN' : R.trN.toFixed(2), sub: 'at the chosen step' }) },
      { label: 'Validation loss', get: () => ({ v: R.vaN >= 9 ? 'NaN' : R.vaN.toFixed(2), sub: 'on proverbs it never saw', good: R.kind === 'ok' && R.t > 0, bad: R.kind !== 'ok' && R.t > 0 }) },
    ];
    const labels = [
      { name: 'stack', t: 'The model, part by part', d: 'Six blocks between embedding and head', icon: 'box', atV: Vec(SX - 0.75, 0.8, 0) },
      { name: 'loss', t: 'Loss curves', d: 'Gold line: the chosen step', icon: 'scale', atV: Vec(LX + LW / 2 + 0.1, 1.0, -0.5) },
    ];
    const reset = () => { Object.assign(st, { mask: true, shift: true, lr: 0, step: 2 }); draw(); };
    const breaks = [
      { label: 'No causal mask', hint: 'Let it look ahead', on: () => { reset(); st.mask = false; draw(); }, off: reset },
      { label: 'Targets not shifted', hint: 'Predict the same token', on: () => { reset(); st.shift = false; draw(); }, off: reset },
      { label: 'Learning rate 10×', hint: 'And no warm-up', on: () => { reset(); st.lr = 1; draw(); }, off: reset },
    ];
    function status() {
      if (R.kind === 'nomask') return { ok: false, msg: `<b>Training loss ${R.trN.toFixed(2)}, and it cannot write.</b> Without the causal mask, every position can attend to the next character, so predicting it is trivial and training loss collapses. Validation stays at ${R.vaN.toFixed(2)}, and when the model writes on its own, the future does not exist yet: it produces "${R.sample}". Mask out every later position.` };
      if (R.kind === 'noshift') return { ok: false, msg: `<b>It learns to copy.</b> With targets not shifted by one, each position is asked to output its own input token, so the loss drops to ${R.trN.toFixed(2)} while the model learns nothing about what comes next; asked to continue "Haraka h", it just hands back "${R.sample}". Targets are the inputs moved one place left.` };
      if (R.kind === 'hot') return { ok: false, msg: `<b>The loss blows up.</b> At ten times the learning rate with no warm-up, updates in the first steps are too large: the loss dips, then climbs and becomes NaN, and the weights are ruined. Warm up over the first few hundred steps and use a rate around 3e-4 for a model this size.` };
      return { ok: true, msg: `<b>Step ${R.t}: training ${R.trN.toFixed(2)}, validation ${R.vaN.toFixed(2)}.</b> ${R.t === 0 ? 'Untrained, it writes random characters; the loss starts near the log of the vocabulary size, 4.16.' : R.t < 1000 ? 'Half-trained, it has learned common letters and words.' : 'Both curves fall together, so it is learning the language, not memorising: it writes whole proverbs.'} ${(R.n / 1e6).toFixed(2)} million parameters.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Build it', home: true, say: 'A class in Dar es Salaam builds a small transformer and trains it on Swahili proverbs, one character at a time.', act: m => m.set({ mask: true, shift: true, lr: 0, step: 0 }) },
    { t: 'The parts', home: true, say: 'Embeddings and positions go in. Six blocks of normalisation, causal attention and a feed-forward network follow. A head shares the embedding matrix.', act: m => m.set({ step: 1 }) },
    { t: 'It learns', home: true, say: 'Training and validation loss fall together. After two thousand steps, it writes whole proverbs: haraka haraka haina baraka.', act: m => m.set({ step: 2 }) },
    { t: 'No mask', home: true, say: 'Remove the causal mask, and training loss collapses: each position reads the answer. On its own, it cannot write.', act: m => m.set({ mask: false }) },
    { t: 'No shift', home: true, say: 'Forget to shift the targets by one, and it learns to copy its input. Low loss, nothing learned.', act: m => m.set({ mask: true, shift: false }) },
    { t: 'Too hot', home: true, say: 'Set the learning rate ten times too high with no warm-up, and the loss blows up.', act: m => m.set({ shift: true, lr: 1 }) },
  ],
  check: [
    { q: 'What are the targets when training a language model?', options: ['The inputs shifted one place left', 'The inputs themselves', 'Random tokens'], answer: 0, why: 'Each position predicts the next token.' },
    { q: 'Why does removing the causal mask make training loss collapse?', options: ['Each position can attend to the token it should predict', 'The model gets smaller', 'The data gets easier'], answer: 0, why: 'It reads the answer.' },
    { q: 'Why compare training and validation loss?', options: ['A gap shows the model is not learning what generalises', 'They are always equal', 'Validation is cheaper'], answer: 0, why: 'Watch both as training runs.' },
  ],
  terms: [
    ['Decoder-only transformer', 'A stack of causal self-attention blocks that predicts the next token.'],
    ['Causal mask', 'Blocks attention to later positions.'],
    ['Cross-entropy', 'The loss for predicting the right next token.'],
    ['Weight tying', 'The output head reusing the embedding matrix.'],
    ['Warm-up', 'Raising the learning rate gradually at the start.'],
    ['Validation loss', 'Loss on text held out from training.'],
  ],
  deeper: '<p><b>Small data, small model.</b> A few thousand proverbs and stories train a model like this in minutes on a laptop, enough to see every part working. Larger corpora of Swahili news, radio transcripts and books make it useful.</p><p><b>Checks that catch bugs.</b> The starting loss should be near the log of the vocabulary size; a loss far below what is plausible, like the no-mask case, usually means the model is cheating.</p><p><b>About this machine.</b> Parameter counts are exact for the stated shape. Loss curves follow a simple decay model for each setting and samples are scripted from typical runs.</p>',
  code: {
    title: 'A causal block and the shifted loss',
    note: 'Adapted from the course\'s transformer capstone.',
    text: `
import torch, torch.nn as nn, torch.nn.functional as F

class Block(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.n1, self.n2 = nn.RMSNorm(d), nn.RMSNorm(d)
        self.attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.w1, self.w3, self.w2 = nn.Linear(d, 512), nn.Linear(d, 512), nn.Linear(512, d)
    def forward(self, x):
        n = x.size(1); mask = torch.triu(torch.ones(n, n, dtype=torch.bool), 1)
        h = self.n1(x); x = x + self.attn(h, h, h, attn_mask=mask)[0]
        h = self.n2(x); return x + self.w2(F.silu(self.w1(h)) * self.w3(h))

def loss(logits, tokens):            # predict token t+1 from positions up to t
    return F.cross_entropy(logits[:, :-1].flatten(0, 1), tokens[:, 1:].flatten())
`,
  },
};
