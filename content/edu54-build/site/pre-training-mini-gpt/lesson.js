// Pre-training a mini GPT: a team in Kampala pre-trains a GPT-2-small-sized model on 10 billion tokens of East African English news. The stack is built from the
// controls: layers, width, the causal mask, learning-rate warm-up and residual connections. Parameter counts are exact (GPT-2 layout, weight tying, biases left out
// as in the course's table). The final loss follows a Chinchilla-style fit, L = 1.69 + 406.4/N^0.34 + 410.7/D^0.28; the curve shapes and failure behaviours are
// illustrative of the reported patterns, and the generated lines are scripted.
// Break it: no causal mask (training loss collapses because it sees the answer; generation is nonsense), no warm-up (loss spikes and diverges), no residuals in a deep stack.
const VOCAB = 50257, CTX = 1024, D_TOK = 1e10;
const LAYERS = [6, 12, 24], WIDTHS = [512, 768, 1024];
function params(L, d) { const emb = VOCAB * d + CTX * d, block = 12 * d * d + 4 * d; return { emb, block, total: emb + L * block + 2 * d }; }
function run(st) {
  const L = LAYERS[st.L], d = WIDTHS[st.d], p = params(L, d), N = p.total, floor = 1.69 + 406.4 / N ** 0.34 + 410.7 / D_TOK ** 0.28;
  const init = Math.log(VOCAB), curve = []; let state = 'ok', final = floor;
  for (let i = 0; i <= 40; i++) { const t = i / 40; let v = floor + (init - floor) * Math.exp(-t * 9) + 0.04 * Math.sin(i * 1.7) * Math.exp(-t * 3);
    if (!st.mask) v = 0.25 + (init - 0.25) * Math.exp(-t * 14);
    else if (!st.warm) { v = i < 4 ? init - i * 0.9 : i < 7 ? init - 3 + (i - 4) * 2.2 : NaN; state = 'nan'; }
    else if (!st.res) { const stall = L >= 24 ? 7.6 : L >= 12 ? 5.4 : 4.1; v = stall + (init - stall) * Math.exp(-t * 4); final = stall; state = 'stall'; }
    curve.push(v); }
  if (!st.mask) { final = 0.25; state = 'cheat'; }
  return { L, d, p, N, floor, final: state === 'ok' ? floor : final, curve, state };
}
const fmtM = n => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${(n / 1e6).toFixed(1)}M`);

export default {
  slug: 'pre-training-mini-gpt',
  title: 'Pre-training a mini GPT',
  description: 'A team in Kampala pre-trains a GPT-2-small-sized model on East African news. Build the stack, count its parameters exactly, and watch a good loss curve fall.',
  overview: 'GPT is a stack of identical transformer blocks between an embedding table and an output head. Token IDs are looked up in a 50,257-row embedding table, position embeddings are added, and the result passes through each block: layer norm, multi-head self-attention, a residual add, layer norm, a feed-forward network four times as wide, and another residual add. A final layer norm and a projection back to the vocabulary give next-token probabilities; GPT-2 ties that projection to the embedding table, saving about 38 million parameters. Each block has about 12d² parameters for width d, so GPT-2 small, with 12 layers at 768, has about 124 million in all. Pre-training is next-token prediction: shift the text by one and minimise cross-entropy. The causal mask lets each position attend only to earlier ones; without it the model sees the very token it must predict, training loss collapses, and the model is useless for generation. Adam with a warm-up from zero to the peak learning rate, then cosine decay, keeps early training from blowing up. Residual connections give gradients a direct path through deep stacks. Final loss improves with parameters and tokens along scaling laws.',
  keywords: ['gpt', 'pre-training', 'causal mask', 'parameter count', 'learning rate warm-up', 'residual connection'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0.1], dir: [0.05, 0.85, 1.2], half: 1.6, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { L: 1, d: 1, mask: true, warm: true, res: true };
    const ink = '#151827';
    /* the stack */
    const SX = -1.6;
    const emb = P.box(1.6, 0.14, 0.9, '#3A6FB0', { r: 0.03 }); emb.position.set(SX, 0.12, 0.1); floor.add(emb);


    const blocks = Array.from({ length: 24 }, () => { const mm = new THREE.MeshLambertMaterial({ color: C.plum }), b = P.box(1, 1, 0.7, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; });
    const head = P.box(1.2, 0.1, 0.7, '#1F9E89', { r: 0.03 }); head.userData.noFit = true; floor.add(head);

    const rails = [-1, 1].map(s => { const mm = new THREE.MeshBasicMaterial({ color: '#E0A526' }), t = P.tube([V(0, 0, 0), V(0, 0.1, 0)], 0.02, '#E0A526', { material: mm }); t.layers.set(1); t.userData.noFit = true; floor.add(t); return t; });


    const keepS = P.box(1.8, 1.55, 1.0, '#000'); keepS.material = new THREE.MeshBasicMaterial({ visible: false }); keepS.position.set(SX, 0.12, 0.1); floor.add(keepS);
    /* causal mask board */
    const MB = 6, mcells = []; const mx0 = -0.45, mz0 = -0.95, mc = 0.15;
    for (let r = 0; r < MB; r++) for (let c = 0; c < MB; c++) { const mm = new THREE.MeshBasicMaterial({ color: '#fff' }), b = P.box(mc * 0.86, 0.02, mc * 0.86, '#fff', { material: mm }); b.position.set(mx0 + c * mc, 0.13, mz0 + r * mc); b.layers.set(1); floor.add(b); mcells.push({ r, c, mm }); }

    /* loss chart */

    const cb = Array.from({ length: 41 }, (_, i) => { const b = P.box(0.042, 1, 0.05, '#1F9E89'); b.position.set(0.75 + i * 0.05, 0.17, -0.15); b.userData.noFit = true; floor.add(b); return b; });
    const ax = P.box(2.05, 0.01, 0.01, ink); ax.position.set(1.75, 0.17, -0.12); floor.add(ax);



    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      const n = R.L, h = Math.min(0.06, 1.15 / n - 0.008), w = 0.7 + (R.d - 512) / 512 * 0.6; let y = 0.27;
      blocks.forEach((b, i) => { b.b.visible = i < n; if (i >= n) return; b.b.scale.set(w, h, 1); b.b.position.set(SX, y, 0.1); b.mm.color.set(i % 2 ? '#7E6AA0' : C.plum); y += h + 0.008; });
      head.position.set(SX, y + 0.01, 0.1); head.scale.x = w / 1.2 * 1.2;
      rails.forEach((t, k) => { t.visible = !!st.res; const x = SX + (k ? 1 : -1) * (w / 2 + 0.08); t.geometry.dispose(); t.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(V(x, 0.27, 0.1), V(x, y, 0.1)), 4, 0.02, 6, false); });
      mcells.forEach(c => c.mm.color.set(c.c <= c.r || !st.mask ? '#1F9E89' : '#D9D2C3'));
      const lo = 0, hi = 11; cb.forEach((b, i) => { const v = R.curve[i]; const nan = Number.isNaN(v); const hh = nan ? 0.5 : Math.max(0.01, (v - lo) / (hi - lo) * 0.5); b.scale.y = hh; b.position.y = 0.17 + hh / 2; b.material.color.set(nan ? '#C62828' : v < 1 ? '#E0A526' : '#1F9E89'); b.material.opacity = 1; });



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Layers', options: LAYERS.map(String), get: () => st.L, act: i => { st.L = i; draw(); } },
      { type: 'buttons', label: 'Width d', options: WIDTHS.map(String), get: () => st.d, act: i => { st.d = i; draw(); } },
      { type: 'buttons', label: 'Causal mask', options: ['On', 'Off'], get: () => (st.mask ? 0 : 1), act: i => { st.mask = !i; draw(); } },
      { type: 'buttons', label: 'Warm-up', options: ['2,000 steps', 'None'], get: () => (st.warm ? 0 : 1), act: i => { st.warm = !i; draw(); } },
      { type: 'buttons', label: 'Residuals', options: ['On', 'Off'], get: () => (st.res ? 0 : 1), act: i => { st.res = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Parameters', get: () => ({ v: fmtM(R.N), sub: 'exact, with weight tying' }) },
      { label: 'Final loss', get: () => ({ v: R.state === 'nan' ? 'NaN' : R.final.toFixed(2), sub: R.state === 'cheat' ? 'too good to be true' : 'cross-entropy per token', good: R.state === 'ok', bad: R.state !== 'ok' }) },
      { label: 'Generates', get: () => ({ v: R.state === 'ok' ? 'Sentences' : R.state === 'nan' ? 'Nothing' : 'Nonsense', sub: 'sample from the trained model', good: R.state === 'ok', bad: R.state !== 'ok' }) },
    ];
    const labels = [
      { name: 'stack', t: 'The GPT stack', d: 'One slab per transformer block', icon: 'box', atV: V(SX - 0.9, 0.5, 0.1) },
      { name: 'loss', t: 'Training loss', d: 'Red: diverged · gold: impossibly low', icon: 'wave', atV: V(2.86, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { L: 1, d: 1, mask: true, warm: true, res: true }); draw(); };
    const breaks = [
      { label: 'No causal mask', hint: 'Every position sees the whole text', on: () => { reset(); st.mask = false; draw(); }, off: reset },
      { label: 'No warm-up', hint: 'Peak learning rate from step 1', on: () => { reset(); st.warm = false; draw(); }, off: reset },
      { label: 'No residuals, 24 layers', hint: 'Deep stack, no skip path', on: () => { reset(); st.res = false; st.L = 2; draw(); }, off: reset },
    ];
    function status() {
      if (R.state === 'cheat') return { ok: false, msg: `<b>Loss 0.25: too good to be true.</b> Without the causal mask every position can attend to the token it is supposed to predict, so training just copies it. At generation time there is no next token to peek at, and the model babbles. The mask lets each position see only what came before.` };
      if (R.state === 'nan') return { ok: false, msg: `<b>The loss spikes, then turns to NaN.</b> Starting at the peak learning rate, Adam's first updates are huge while its running statistics are still empty, so the weights blow up within a few hundred steps. Warm up from zero over the first 2,000 steps, then decay.` };
      if (R.state === 'stall') return { ok: false, msg: `<b>Stuck at a loss of ${R.final.toFixed(1)}.</b> With ${R.L} blocks and no residual connections, gradients must pass through every block's layers in turn and fade on the way to the bottom, so early blocks barely learn. The residual path lets gradients flow straight through.` };
      return { ok: true, msg: `<b>${fmtM(R.N)} parameters, final loss ${R.final.toFixed(2)}.</b> ${R.L} blocks of about ${fmtM(R.p.block)} each plus a ${fmtM(R.p.emb)} embedding table shared with the output head. The mask, warm-up and residuals let it train cleanly on 10 billion tokens.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The model', home: true, say: 'A team in Kampala pre-trains a model the size of GPT-2 small on East African English news.', act: m => m.set({ L: 1, d: 1, mask: true, warm: true, res: true }) },
    { t: 'The stack', home: true, say: 'Embeddings at the bottom, twelve transformer blocks, and an output head that shares the embedding table. About a hundred and twenty-four million parameters.', act: m => m.set({}) },
    { t: 'Next token', home: true, say: 'Training predicts each next token. The loss falls from about ten to about three.', act: m => m.set({}) },
    { t: 'No mask', home: true, say: 'Remove the causal mask, and each position sees the answer. The loss looks perfect, and the model is useless.', act: m => m.set({ mask: false }) },
    { t: 'No warm-up', home: true, say: 'Start at full learning rate with no warm-up, and the loss spikes and blows up.', act: m => m.set({ mask: true, warm: false }) },
    { t: 'No residuals', home: true, say: 'Stack twenty-four blocks with no residual path, and the early blocks barely learn.', act: m => m.set({ warm: true, res: false, L: 2 }) },
  ],
  check: [
    { q: 'What does the causal mask do?', options: ['Lets each position attend only to earlier positions', 'Hides rare words', 'Removes padding'], answer: 0, why: 'Otherwise it sees the answer.' },
    { q: 'Roughly how many parameters does each block have at width d?', options: ['About 12d²', 'About d', 'About 4d'], answer: 0, why: '4d² for attention, 8d² for the feed-forward.' },
    { q: 'Why warm up the learning rate?', options: ['Early updates are unstable and can blow up the weights', 'To save memory', 'To shorten training'], answer: 0, why: 'Ramp up, then decay.' },
  ],
  terms: [
    ['Pre-training', 'Learning next-token prediction on a huge corpus.'],
    ['Transformer block', 'Attention and feed-forward with norms and residuals.'],
    ['Causal mask', 'Blocks attention to future positions.'],
    ['Weight tying', 'Sharing the embedding table with the output head.'],
    ['Warm-up', 'Raising the learning rate gradually at the start.'],
    ['Cross-entropy', 'The loss for predicting the right next token.'],
  ],
  deeper: '<p><b>Local models.</b> Teams in Uganda, Kenya and Nigeria pre-train and adapt smaller models on regional news and local languages, where a model of this size can be trained on a modest budget.</p><p><b>Scale.</b> The same stack with more layers, more width and far more tokens becomes today\'s large models; the scaling laws in track 6 predict how loss improves.</p><p><b>About this machine.</b> Parameter counts are exact; the final loss uses a Chinchilla-style fit; curve shapes and samples are illustrative.</p>',
  code: {
    title: 'One block',
    note: 'Adapted from the course\'s mini-GPT lesson.',
    text: `
class Block(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = CausalSelfAttention(d, heads)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def forward(self, x):
        x = x + self.attn(self.ln1(x))        # residual
        return x + self.mlp(self.ln2(x))      # residual
`,
  },
};
