// Multi-head self-attention (phase 19, lesson 33): the real sum runs on eight small vectors: dot Q with K, divide by √d, mask the future, softmax. A 6×6 field of towers shows the weights for one head; heads are given different seed projections. No scaling makes softmax saturate; no mask lets a token see ahead.
const N = 6, D = 16;
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
const X = (() => { const r = rng(3); return Array.from({ length: N }, () => Array.from({ length: D }, () => r() * 2 - 1)); })();
const proj = (h, salt) => { const r = rng(h * 97 + salt); return Array.from({ length: D }, () => Array.from({ length: D }, () => (r() - 0.5) * 2)); };
const mul = (M, v) => M.map(row => row.reduce((a, c, i) => a + c * v[i], 0));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function run(o) {
  const Q = X.map(v => mul(proj(o.h, 1), v)), K = X.map(v => mul(proj(o.h, 2), v));
  const W = Q.map((q, i) => {
    const s = K.map((k, j) => (dot(q, k) / (o.scale ? Math.sqrt(D) * 4 : 1)) + (o.mask && j > i ? -1e9 : 0));
    const mx = Math.max(...s), e = s.map(v => Math.exp(v - mx)), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z);
  });
  const peak = W.reduce((a, r) => a + Math.max(...r), 0) / N, leak = W.reduce((a, r, i) => a + r.slice(i + 1).reduce((x, y) => x + y, 0), 0);
  return { W, peak, leak };
}

export default {
  slug: 'multihead-self-attention',
  title: 'Multi-head attention, built line by line',
  description: 'Query, key, value, scale, mask, softmax. The real sum runs here, one head at a time.',
  overview: 'Attention lets each token choose what to read. Each token gets a query, a key and a value from a linear layer. Dot a query with every key, divide by the square root of the size, and take a softmax: those are the weights. A causal mask sets the future to minus infinity, so a token can\'t read what comes next. Multi-head does this several times in parallel, on separate slices, and joins the results, so one head can follow grammar while another follows names. Skip the scaling and softmax saturates, with one giant weight and vanishing gradients. Here the sum really runs, on six vectors.',
  keywords: ['multi-head attention', 'self-attention', 'causal mask', 'scaled dot product', 'transformer', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.5, 0.9, 1.1], half: 1.05, wide: 4.6 },

  build(S) {
    const { V, P } = S;
    const D0 = { h: 1, scale: true, mask: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(3.4, 0.03, 3.4, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const G = i => -1.25 + i * 0.5;
    const T = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => { const t = add(P.tower(0.4, 0.4, GOOD)); t.position.set(G(c), 0.03, G(r)); t.userData.set({ cap: '' }); return t; }));
    S.add(P.keep(-1.7, 1.7, 1.05, -1.7, 1.7));
    let R = null;
    function draw() {
      R = run(st);
      R.W.forEach((row, r) => row.forEach((v, c) => T[r][c].userData.set({ h: Math.max(0.02, v * 1.0), color: c > r ? BAD : GOOD })));
    }
    draw(); T.flat().forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Head', min: 1, max: 4, step: 1, get: () => st.h, set: v => set({ h: v }) },
      { type: 'toggle', label: 'Divide by the square root of the size', short: 'Scale', get: () => st.scale, set: v => set({ scale: !!v }) },
      { type: 'toggle', label: 'Causal mask', short: 'Mask', get: () => st.mask, set: v => set({ mask: !!v }) },
    ];
    const readouts = [
      { label: 'Average top weight', get: () => ({ v: `${Math.round(R.peak * 100)}%`, sub: 'near 100% is saturated', good: R.peak < 0.8, bad: R.peak > 0.92 }) },
      { label: 'Weight on the future', get: () => ({ v: R.leak.toFixed(2), sub: 'should be zero', good: R.leak < 0.001, bad: R.leak > 0.01 }) },
      { label: 'Head', get: () => ({ v: `${st.h} of 4`, sub: 'each sees differently' }) },
    ];
    const labels = [
      { name: 'g', t: 'Who reads whom', d: 'Rows read columns', icon: 'target', atV: V(G(0) - 0.2, 0.05, G(5)) },
      { name: 'f', t: 'The future', d: 'Coral: must stay flat', icon: 'eye', atV: V(G(5) + 0.2, 0.05, G(0)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Remove the mask', hint: 'it sees the answer', on: () => set({ ...D0, mask: false }), off: reset },
      { label: 'Skip the scaling', hint: 'softmax saturates', on: () => set({ ...D0, scale: false }), off: reset },
    ];
    function status() {
      if (!st.mask) return { ok: false, msg: `<b>${R.leak.toFixed(2)} of attention lands on the future.</b> In training, the model reads the next word instead of predicting it. Loss looks great, and generation fails.` };
      if (!st.scale) return { ok: false, msg: `<b>Top weights average ${Math.round(R.peak * 100)}%.</b> Dot products grow with size, so softmax picks one winner and gradients vanish. Divide by √d.` };
      return { ok: true, msg: `<b>Head ${st.h}: weights are spread, and the future is untouched.</b> Change head and the pattern changes, as each has its own projections.` };
    }
    return { update: dt => { T.flat().forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Who reads whom', home: true, say: 'Six tokens. Each row shows how one token spreads its attention over the others.', act: m => m.set({ h: 1, scale: true, mask: true }) },
    { t: 'Query and key', home: true, say: 'Dot each query with every key. A softmax turns those scores into weights.', act: m => m.set({ h: 1, scale: true, mask: true }) },
    { t: 'Scale', home: true, say: 'Dot products grow with size. Skip the square root, and one weight takes everything.', act: m => m.set({ h: 1, scale: false, mask: true }) },
    { t: 'Mask', home: true, say: 'Remove the mask, and a token reads what comes next. That is cheating in training.', act: m => m.set({ h: 1, scale: true, mask: false }) },
    { t: 'Another head', home: true, say: 'Each head has its own projections, so it sees a different pattern.', act: m => m.set({ h: 3, scale: true, mask: true }) },
    { t: 'Together', home: true, say: 'Run them in parallel, join the results, and project. That is one attention layer.', act: m => m.set({ h: 4, scale: true, mask: true }) },
  ],
  check: [
    { q: 'What does a causal mask stop?', options: ['Attending to later tokens', 'Attending to earlier tokens', 'Training'], answer: 0, why: 'Tokens can\'t read the future.', hint: 'Try Remove the mask.' },
    { q: 'Why divide by √d?', options: ['To keep softmax from saturating', 'To save memory', 'To round numbers'], answer: 0, why: 'Dot products grow with size.', hint: 'Try Skip the scaling.' },
    { q: 'Why several heads?', options: ['Each learns a different pattern', 'They are faster alone', 'To add noise'], answer: 0, why: 'Different projections, different views.', hint: 'Move the Head slider.' },
  ],
  terms: [['Query', 'What a token looks for.'], ['Key', 'What a token offers.'], ['Value', 'What is passed on.'], ['Softmax', 'Turns scores into weights.'], ['Causal mask', 'Hides later tokens.']],
  deeper: '<p><b>One linear layer.</b> Real code projects once, then reshapes into heads. It is cheaper than one layer per head.</p><p><b>Earlier lessons</b> explain why attention works. This one builds it.</p><p><b>This grid</b> is really computed on seeded vectors.</p>',
  code: {
    title: 'Scaled dot product',
    note: 'Adapted from the course\'s attention (code/main.py).',
    text: `
def attention(q, k, v, mask):
    scores = q @ k.transpose(-2, -1) / math.sqrt(k.size(-1))
    scores = scores.masked_fill(mask == 0, float("-inf"))
    return torch.softmax(scores, dim=-1) @ v
`,
  },
};
