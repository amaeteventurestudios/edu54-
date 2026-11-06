// Build it yourself: a tiny autograd (after SlowTorch). Real reverse-mode differentiation on a small graph for a Dodoma rainfall fit: each value records its parents; backward walks them in reverse order. A numeric gradient checks the answer. The graph is drawn as nodes.
class Val { constructor(v, kids = [], back = () => {}) { this.v = v; this.g = 0; this.kids = kids; this.back = back; }
  add(o) { const r = new Val(this.v + o.v, [this, o]); r.back = () => { this.g += r.g; o.g += r.g; }; return r; }
  mul(o) { const r = new Val(this.v * o.v, [this, o]); r.back = () => { this.g += o.v * r.g; o.g += this.v * r.g; }; return r; }
}
function fwd(w, b, x, y) { const W = new Val(w), B = new Val(b), X = new Val(x), Y = new Val(-y), p = W.mul(X).add(B), e = p.add(Y), L = e.mul(e); return { W, B, L, n: [W, X, B, p, Y, e, L] }; }
function backward(L, o) { const seen = new Set(), ord = []; const go = v => { if (seen.has(v)) return; seen.add(v); v.kids.forEach(go); ord.push(v); }; go(L); L.g = 1; (o.rev ? ord.reverse() : ord).forEach(v => v.back()); return ord.length; }
const DATA = [[1, 3], [2, 5], [3, 7]];
function run(o) {
  let w = 0, b = 0, last = 0, g0 = 0, g1 = 0; const lr = o.lr;
  for (let s = 0; s < o.steps; s++) {
    let gw = 0, gb = 0, l = 0;
    DATA.forEach(([x, y]) => { const f = fwd(w, b, x, y); backward(f.L, o); if (o.reuse && s) f.W.g += g0; gw += f.W.g; gb += f.B.g; l += f.L.v; });
    gw /= DATA.length; gb /= DATA.length; last = l / DATA.length; g0 = gw; g1 = gb; w -= lr * gw; b -= lr * gb;
    if (!Number.isFinite(w)) break;
  }
  const f = fwd(0.5, 0.5, 2, 5); backward(f.L, o);
  const h = 1e-5, num = (fwd(0.5 + h, 0.5, 2, 5).L.v - fwd(0.5 - h, 0.5, 2, 5).L.v) / (2 * h);
  return { w, b, loss: last, auto: f.W.g, num, n: f.n, match: Math.abs(f.W.g - num) < 1e-4, ok: Number.isFinite(w) };
}

export default {
  slug: 'build-a-tiny-torch',
  title: 'Build your own autograd',
  description: 'Every value remembers where it came from. One backward walk finds every gradient.',
  overview: 'A framework like PyTorch has a neat trick. Each number you compute remembers its parents, and how it was made. So when you ask for gradients, one walk backwards through that record finds them all, however many weights you have. Each step of the walk applies the chain rule locally, passing a share of the gradient to each parent. The walk must go in reverse order, so that a node has its whole gradient before it passes it on. And gradients add up, so they must be cleared between steps. This real tiny autograd fits a line to rainfall readings from Dodoma, and a numeric gradient checks its answer.',
  keywords: ['autograd', 'backpropagation', 'PyTorch', 'chain rule', 'computation graph', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { lr: 0.05, steps: 80, rev: true, reuse: false }, st = { ...D0 };
    const BLUE = '#5B8DB8', GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.66;
    const T = Array.from({ length: 7 }, (_, i) => { const t = add(P.tower(0.46, 0.4, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => t.userData.set({ h: Math.max(0.03, Math.min(1.15, Math.abs(R.n[i].g) * 0.14)), color: R.match ? (i === 0 ? GOOD : BLUE) : BAD })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Learning rate', min: 0.01, max: 0.2, step: 0.01, get: () => st.lr, set: v => set({ lr: v }) },
      { type: 'slider', label: 'Steps', min: 1, max: 200, step: 1, get: () => st.steps, set: v => set({ steps: v }) },
      tg('rev', 'Walk in reverse order', 'Reverse'), tg('reuse', 'Keep old gradients', 'Keep'),
    ];
    const readouts = [
      { label: 'Fitted line', get: () => (R.ok ? { v: `w ${R.w.toFixed(3)}, b ${R.b.toFixed(3)}`, sub: 'true: 2 and 1' } : { v: 'blew up', bad: true }) },
      { label: 'Gradient of w', get: () => ({ v: R.auto.toFixed(4), sub: `numeric ${R.num.toFixed(4)}`, good: R.match, bad: !R.match }) },
      { label: 'Loss', get: () => ({ v: R.ok ? R.loss.toFixed(4) : 'infinite' }) },
    ];
    const labels = [
      { name: 'w', t: 'Gradient at each node', d: 'Teal: the weight', icon: 'link', atV: V(X(0) - 0.25, 0.2, -0.1) },
      { name: 'l', t: 'The loss', d: 'Where the walk starts', icon: 'target', atV: V(X(6) + 0.25, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forward order', hint: 'nodes pass on nothing', on: () => set({ ...D0, rev: false }), off: reset },
      { label: 'Keep old gradients', hint: 'no zero_grad', on: () => set({ ...D0, reuse: true }), off: reset },
      { label: 'Step too large', hint: 'overshoots', on: () => set({ ...D0, lr: 0.2 }), off: reset },
    ];
    function status() {
      if (!st.rev) return { ok: false, msg: `<b>Gradient ${R.auto.toFixed(3)}, and it should be ${R.num.toFixed(3)}.</b> Parents ran before their children had a gradient to pass.` };
      if (!R.ok || R.loss > 10) return { ok: false, msg: '<b>The loss blew up.</b> Each step overshoots further. The gradients are right, and the step is too large.' };
      if (st.reuse) return { ok: false, msg: `<b>w ended at ${R.w.toFixed(2)}, not 2.</b> Old gradients pile up, so each step pushes too hard. Clear them each step.` };
      return { ok: true, msg: `<b>The gradient matches the numeric check.</b> w ${R.w.toFixed(3)} and b ${R.b.toFixed(3)}, closing in on 2 and 1.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A memory', home: true, say: 'A weather team in Dodoma fits a line. Each number remembers its parents.', act: m => m.set({ lr: 0.05, steps: 1, rev: true, reuse: false }) },
    { t: 'The graph', home: true, say: 'Multiply and add leave a graph, from the weight to the loss.', act: m => m.set({ lr: 0.05, steps: 5, rev: true, reuse: false }) },
    { t: 'Backward', home: true, say: 'Start at the loss, and pass a share of gradient to each parent.', act: m => m.set({ lr: 0.05, steps: 20, rev: true, reuse: false }) },
    { t: 'Order', home: true, say: 'A node needs its whole gradient before passing it on, so walk in reverse.', act: m => m.set({ lr: 0.05, steps: 20, rev: false, reuse: false }) },
    { t: 'Check it', home: true, say: 'Nudge a weight and measure. The numeric gradient matches.', act: m => m.set({ lr: 0.05, steps: 80, rev: true, reuse: false }) },
    { t: 'Clear them', home: true, say: 'Gradients add up, so clear them each step.', act: m => m.set({ lr: 0.05, steps: 80, rev: true, reuse: true }) },
  ],
  check: [
    { q: 'What does each value remember?', options: ['Its parents and how it was made', 'Its address', 'The dataset'], answer: 0, why: 'That record is the graph.', hint: 'See A memory.' },
    { q: 'Why walk in reverse?', options: ['A node needs its whole gradient first', 'It is shorter', 'For memory'], answer: 0, why: 'Children feed parents.', hint: 'Try Forward order.' },
    { q: 'Why clear gradients each step?', options: ['They add up', 'They go stale', 'To save disk'], answer: 0, why: 'Otherwise steps grow.', hint: 'Try Keep old gradients.' },
  ],
  terms: [['Autograd', 'Automatic gradients.'], ['Chain rule', 'Multiply local slopes.'], ['Topological order', 'Parents before children.'], ['zero_grad', 'Clearing gradients.']],
  deeper: '<p><b>Real code.</b> This small value class really differentiates, and the numeric check runs live.</p><p><b>Compare.</b> The tensor library lesson shows why real frameworks work on whole arrays.</p>',
  credit: 'Built from <a href="https://github.com/xames3/slowtorch" target="_blank" rel="noopener">SlowTorch</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small value class, written for this lesson.',
  code: {
    title: 'A value that remembers',
    note: 'Our own short version.',
    text: `
mul(other) {
  const out = new Value(this.v * other.v, [this, other]);
  out.back = () => {
    this.grad += other.v * out.grad;
    other.grad += this.v * out.grad;
  };
  return out;
}
`,
  },
};
