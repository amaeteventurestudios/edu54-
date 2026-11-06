// A transformer block (phase 19, lesson 34): a stack of twelve layers, towers showing the gradient reaching each layer. Residual paths and where LayerNorm sits decide how far the gradient travels. A simple multiplicative model of gradient through layers runs below.
function run(o) {
  const g = []; let v = 1;
  for (let l = 11; l >= 0; l--) { g.unshift(v); const f = o.res ? (o.pre ? 0.99 : 0.9) : 0.6; v *= o.warm && !o.pre && o.res ? f + 0.06 : f; }
  const bottom = g[0], blow = !o.pre && o.res && o.lr > 0.5 && !o.warm;
  return { g, bottom, blow };
}

export default {
  slug: 'transformer-block',
  title: 'A transformer block, and why the norm goes first',
  description: 'Twelve layers, and a gradient that must reach the bottom. Residuals and LayerNorm placement decide if it does.',
  overview: 'A block has four pieces: LayerNorm, causal multi-head attention, a residual connection, and a position-wise feed-forward layer. How they join matters a lot. Residual connections give gradients a straight road through the stack. Without them, the signal shrinks layer by layer and the bottom barely learns. LayerNorm can come after each sublayer, as in the original paper, or before. Pre-norm keeps the residual road clean, and trains stably with no warmup, which is why most modern models use it. This lesson stacks twelve layers, with a simple model of the gradient reaching each one.',
  keywords: ['transformer block', 'LayerNorm', 'pre-norm', 'residual connection', 'gradient flow', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { res: true, pre: true, warm: false, lr: 0.3 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.4;
    const T = Array.from({ length: 12 }, (_, i) => { const t = add(P.tower(0.3, 0.5, GOOD)); t.position.set(X(i), 0.03, -0.15); t.userData.set({ cap: '' }); return t; });
    const road = P.box(4.6, 0.04, 0.16, SAF, { r: 0.02 }); road.position.set(0, 0.03, 0.42); S.add(road);
    const ball = P.ball(0.1, '#B5462F'); ball.userData.noFit = true; S.add(ball);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      T.forEach((t, i) => t.userData.set({ h: Math.max(0.03, R.g[i] * 1.1), color: R.blow ? BAD : R.g[i] < 0.1 ? BAD : GOOD }));
      road.visible = st.res;
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Residual connections', short: 'Residual', get: () => st.res, set: v => set({ res: !!v }) },
      { type: 'toggle', label: 'LayerNorm before each sublayer', short: 'Pre-norm', get: () => st.pre, set: v => set({ pre: !!v }) },
      { type: 'toggle', label: 'Warm up the learning rate', short: 'Warmup', get: () => st.warm, set: v => set({ warm: !!v }) },
      { type: 'slider', label: 'Learning rate', min: 0.1, max: 1, step: 0.05, get: () => st.lr, set: v => set({ lr: v }) },
    ];
    const readouts = [
      { label: 'Gradient at layer one', get: () => ({ v: R.bottom.toFixed(3), sub: 'against 1.0 at the top', good: R.bottom > 0.5, bad: R.bottom < 0.05 }) },
      { label: 'Layers learning', get: () => ({ v: `${R.g.filter(g => g > 0.1).length} of 12`, good: R.g.every(g => g > 0.1), bad: R.g.filter(g => g > 0.1).length < 6 }) },
      { label: 'Stability', get: () => ({ v: R.blow ? 'unstable' : 'stable', good: !R.blow, bad: R.blow }) },
    ];
    const labels = [
      { name: 't', t: 'Twelve layers', d: 'Height: gradient reaching it', icon: 'target', atV: V(X(0) - 0.15, 0.1, -0.15) },
      { name: 'r', t: 'The residual road', d: 'A straight path down', icon: 'link', atV: V(2.3, 0.08, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No residuals', hint: 'gradients fade', on: () => set({ ...D0, res: false }), off: reset },
      { label: 'Post-norm, high rate, no warmup', hint: 'the old recipe, unguarded', on: () => set({ ...D0, pre: false, lr: 0.9 }), off: reset },
    ];
    function status() {
      if (!st.res) return { ok: false, msg: `<b>Only ${R.bottom.toFixed(3)} reaches layer one.</b> Each layer shrinks the signal, so the bottom of the stack hardly learns. Residuals give gradients a straight road.` };
      if (R.blow) return { ok: false, msg: '<b>Training blows up.</b> Post-norm sits on the residual path, and it needs careful warmup. Pre-norm trains stably without it.' };
      if (!st.pre) return { ok: true, msg: `<b>${R.bottom.toFixed(2)} at the bottom.</b> Post-norm works with warmup. It is the original recipe, and it takes more care.` };
      return { ok: true, msg: `<b>${R.bottom.toFixed(2)} at the bottom: every layer is learning.</b> Pre-norm keeps the residual road clean. That is why most modern models use it.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 1; ball.position.set(2.2 - 4.4 * u, 0.15, 0.42); ball.visible = st.res; },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Four pieces', home: true, say: 'A block has LayerNorm, attention, a residual path and a feed-forward layer. Stack twelve, and each must learn.', act: m => m.set({ res: true, pre: true, warm: false, lr: 0.3 }) },
    { t: 'Without residuals', home: true, say: 'Take away the residual road, and gradients fade on the way down. The bottom hardly learns.', act: m => m.set({ res: false, pre: true, warm: false, lr: 0.3 }) },
    { t: 'The road', home: true, say: 'A residual adds the input back. Gradients get a straight path through.', act: m => m.set({ res: true, pre: true, warm: false, lr: 0.3 }) },
    { t: 'Post-norm', home: true, say: 'The original design puts the norm after. It sits on the road, and it needs warmup to stay stable.', act: m => m.set({ res: true, pre: false, warm: false, lr: 0.9 }) },
    { t: 'Warmup', home: true, say: 'A slow start tames it.', act: m => m.set({ res: true, pre: false, warm: true, lr: 0.3 }) },
    { t: 'Pre-norm', home: true, say: 'Put the norm first, and the road stays clean. This trains stably, with no warmup.', act: m => m.set({ res: true, pre: true, warm: false, lr: 0.6 }) },
  ],
  check: [
    { q: 'What do residual connections do?', options: ['Give gradients a straight path', 'Save memory', 'Hide the future'], answer: 0, why: 'They add the input back.', hint: 'Try No residuals.' },
    { q: 'Why is pre-norm popular?', options: ['It trains stably without warmup', 'It is older', 'It uses fewer layers'], answer: 0, why: 'The residual path stays clean.', hint: 'Try Post-norm, high rate, no warmup.' },
    { q: 'What sits inside a block?', options: ['Norm, attention, residual, feed-forward', 'Tokenizer and dataset', 'Only attention'], answer: 0, why: 'Four pieces.', hint: 'See Four pieces.' },
  ],
  terms: [['Block', 'One repeated unit of a transformer.'], ['Residual', 'Adding the input back.'], ['LayerNorm', 'Normalising across features.'], ['Pre-norm', 'Norm before each sublayer.'], ['Feed-forward', 'A small network per position.']],
  deeper: '<p><b>Variants.</b> Many models replace LayerNorm with RMSNorm, or use gated feed-forward layers.</p><p><b>Earlier lessons</b> cover attention itself. Here the pieces join.</p><p><b>The gradient</b> here follows a simple shrink-per-layer model.</p>',
  code: {
    title: 'A pre-norm block',
    note: 'Adapted from the course\'s block (code/main.py).',
    text: `
class Block(nn.Module):
    def forward(self, x):
        x = x + self.attn(self.norm1(x))         # residual road stays clean
        x = x + self.ff(self.norm2(x))
        return x
`,
  },
};
