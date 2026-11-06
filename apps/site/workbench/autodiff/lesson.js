// Chain rule and autodiff: a tiny model, loss = (w·x + b − y)² + 0.1·w², drawn as a graph of simple steps.
// Forward: values flow left to right. Backward: gradients flow right to left, each step multiplying by its own local slope.
// Break it: forget to zero the gradients (they pile up), cut the graph with detach (w stops learning), overwrite instead of add where w is used twice.
const NODES = {
  x: { x: -3.1, z: -1.15, op: 'x', d: 0, input: true },
  w: { x: -3.1, z: 0.0, op: 'w', d: 0, input: true, learn: true },
  b: { x: -3.1, z: 1.15, op: 'b', d: 0, input: true, learn: true },
  y: { x: 0.1, z: 1.75, op: 'y', d: 0, input: true },
  mul: { x: -1.65, z: -0.6, op: '×', d: 1 },
  reg: { x: -1.65, z: -1.95, op: '0.1·w²', d: 1 },
  add: { x: -0.25, z: 0.2, op: '+', d: 2 },
  sub: { x: 1.15, z: 0.75, op: '−', d: 3 },
  sq: { x: 2.35, z: 0.75, op: '²', d: 4 },
  L: { x: 3.4, z: -0.4, op: 'loss', d: 5 },
};
const EDGES = [['x', 'mul'], ['w', 'mul'], ['w', 'reg'], ['mul', 'add'], ['b', 'add'], ['add', 'sub'], ['y', 'sub'], ['sub', 'sq'], ['sq', 'L'], ['reg', 'L']];

export default {
  slug: 'autodiff',
  title: 'The chain rule and autodiff',
  description: 'Draw a tiny model as a graph of simple steps. Push values forward, then send gradients backward, each step multiplying by its own slope: that is the chain rule, and it is all autodiff does. Then forget to zero the gradients.',
  overview: 'A model is a long chain of simple steps: multiply, add, subtract, square. Run it forward and each step remembers what it saw. Then go backward from the loss: each step takes the gradient arriving from ahead and multiplies it by its own local slope (the chain rule), and where a value was used twice, the gradients from both paths add up. Libraries such as PyTorch build this graph as your code runs and do the backward pass for you.',
  keywords: ['chain rule explained', 'automatic differentiation', 'computational graph', 'zero_grad pytorch', 'detach gradient'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.4, -0.1], dir: [0.15, 1.15, 1.2], half: 3, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { w: 0.5, b: 1, x: 3, y: 4, zero: true, detach: false, overwrite: false, phase: null, t: 0, acc: { w: 0, b: 0 }, fwd: false, bwd: false, steps: 0 };
    /* ---------- the graph ---------- */
    const nodes = {};
    for (const [k, n] of Object.entries(NODES)) {
      const g = new THREE.Group(); g.position.set(n.x, 0, n.z); S.add(g);
      const col = n.learn ? '#E3A72F' : n.input ? '#8E91A3' : k === 'L' ? '#A4462A' : '#2C2D31';
      const m = new THREE.MeshLambertMaterial({ color: col });
      const b = P.box(k === 'reg' ? 1.15 : 0.95, 0.3, 0.72, col, { r: 0.07, material: m }); g.add(b);
      const ink = n.learn ? '#151827' : '#FFFFFF';
      const op = S.text(n.op, { size: n.input || k === 'L' || k === 'reg' ? 0.17 : 0.26, weight: 800, color: ink, font: mono, maxW: 1.05 }); op.position.set(0, 0.305, -0.2); g.add(op);
      const val = S.text('', { size: 0.105, weight: 700, color: ink, font: mono, maxW: 1.05, maxH: 0.36 }); val.position.set(0, 0.305, 0.13); g.add(val);
      const f = S.text(n.op, { size: 0.11, face: 'front', weight: 800, color: ink, font: mono, maxW: 0.9 }); f.position.set(0, 0.15, 0.365); g.add(f);
      nodes[k] = { g, m, val, n };
    }
    const pipes = EDGES.map(([a, b]) => {
      const A = NODES[a], B = NODES[b], p0 = V(A.x + 0.45, 0.16, A.z), p1 = V(B.x - 0.45, 0.16, B.z);
      const r = P.rod(p0, p1, 0.03, '#B9B6AE'); S.add(r);
      const fb = P.ball(0.07, C.teal), bb = P.ball(0.075, C.orange); fb.userData.noFit = bb.userData.noFit = true; S.add(fb, bb);
      return { a, b, p0, p1, r, fb, bb };
    });
    const cut = P.box(0.08, 0.5, 0.5, C.red, { r: 0.02 }); cut.position.set((NODES.add.x + NODES.sub.x) / 2, 0, (NODES.add.z + NODES.sub.z) / 2); cut.userData.noFit = true; S.add(cut);
    /* ---------- the sums ---------- */
    function forward() {
      const m = st.w * st.x, a = m + st.b, s = a - st.y, q = s * s, r = 0.1 * st.w * st.w;
      return { x: st.x, w: st.w, b: st.b, y: st.y, mul: m, add: a, sub: s, sq: q, reg: r, L: q + r };
    }
    function backward() {
      const v = forward(), g = { L: 1 };
      g.sq = g.L; g.reg = g.L;
      g.sub = g.sq * 2 * v.sub;
      g.add = st.detach ? 0 : g.sub;            // detach: nothing flows back past this point
      g.y = -g.sub;
      g.mul = g.add; g.b = g.add;
      g.x = g.mul * st.w;
      const viaMul = g.mul * st.x, viaReg = g.reg * 0.2 * st.w;
      g.w = st.overwrite ? viaReg : viaMul + viaReg;   // w is used twice: both paths must add
      return { g, viaMul, viaReg };
    }
    function runForward() { st.phase = 'fwd'; st.t = 0; st.bwd = false; }
    function runBackward() { if (!st.fwd) runForward(); st.phase = st.phase === 'fwd' ? 'fwd+bwd' : 'bwd'; if (st.phase === 'bwd') st.t = 0; }
    function finishBackward() {
      const { g } = backward();
      if (st.zero) st.acc = { w: 0, b: 0 };
      st.acc.w += g.w; st.acc.b += g.b; st.bwd = true;
    }
    function step() { if (!st.bwd) return; st.w -= 0.05 * st.acc.w; st.b -= 0.05 * st.acc.b; st.steps++; st.fwd = false; st.bwd = false; if (st.zero) st.acc = { w: 0, b: 0 }; runForward(); }
    const fmt = v => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
    function update(dt) {
      if (st.phase) {
        st.t += dt * (S.reduced ? 3 : 0.75);
        if (st.t >= 1) {
          if (st.phase === 'fwd') { st.fwd = true; st.phase = null; }
          else if (st.phase === 'fwd+bwd') { st.fwd = true; st.phase = 'bwd'; st.t = 0; }
          else { finishBackward(); st.phase = null; }
        }
      }
      const v = forward(), { g } = backward(), u = st.t * 6;
      const showV = k => st.fwd || (st.phase && st.phase !== 'bwd' && u >= NODES[k].d) || st.phase === 'bwd';
      const showG = k => st.bwd || (st.phase === 'bwd' && 6 - u <= NODES[k].d + 1);
      for (const [k, n] of Object.entries(nodes)) {
        const gv = k === 'w' && st.bwd ? st.acc.w : k === 'b' && st.bwd ? st.acc.b : g[k];
        const lines = [showV(k) ? `= ${fmt(v[k])}` : '', showG(k) && gv != null ? `grad ${fmt(gv)}` : ''].filter(Boolean);
        n.val.userData.set(lines.join('\n') || ' ');
        const glow = showG(k) && !st.bwd && st.phase === 'bwd';
        n.m.emissive.set(glow ? C.orange : '#000000').multiplyScalar(0.25);
      }
      for (const p of pipes) {
        const da = NODES[p.a].d, db = NODES[p.b].d;
        const fu = st.phase && st.phase !== 'bwd' ? (u - da) / Math.max(1, db - da) : -1;
        p.fb.visible = fu > 0 && fu < 1; if (p.fb.visible) p.fb.position.copy(p.p0).lerp(p.p1, fu);
        const bu = st.phase === 'bwd' ? ((6 - u) - db) / Math.max(1, db - da) : 2;
        const blocked = st.detach && p.a === 'add' && p.b === 'sub';
        p.bb.visible = bu < 0 && bu > -1 && !blocked && !(st.overwrite && p.a === 'w' && p.b === 'mul'); if (p.bb.visible) p.bb.position.copy(p.p1).lerp(p.p0, -bu);
      }
      cut.visible = st.detach;
    }
    runForward();
    const controls = [
      { type: 'button', label: 'Forward pass', short: 'Forward', act: runForward },
      { type: 'button', label: 'Backward pass', short: 'Backward', act: runBackward },
      { type: 'button', label: 'Update w and b', short: 'Step', act: step, hint: 'Move each against its gradient' },
      { type: 'toggle', label: 'Zero the gradients first', short: 'Zero grads', get: () => st.zero, set: v => { st.zero = v; }, quick: false },
      { type: 'toggle', label: 'Detach after the add', get: () => st.detach, set: v => { st.detach = v; runForward(); }, quick: false },
      { type: 'toggle', label: 'Overwrite instead of adding', get: () => st.overwrite, set: v => { st.overwrite = v; runForward(); }, quick: false },
    ];
    const readouts = [
      { label: 'Loss', get: () => ({ v: forward().L.toFixed(3), sub: `after ${st.steps} step${st.steps === 1 ? '' : 's'}`, good: forward().L < 0.5 }) },
      { label: 'Gradient of w', get: () => ({ v: st.bwd ? fmt(st.acc.w) : '—', sub: `true ${fmt(backward().viaMul + backward().viaReg)}`, bad: st.bwd && Math.abs(st.acc.w - (backward().viaMul + backward().viaReg)) > 0.01 }) },
    ];
    const labels = [
      { name: 'inputs', t: 'Inputs and weights', d: 'Gold: the numbers the model learns', icon: 'box', atV: V(-3.58, 0.3, -1.15) },
      { name: 'ops', t: 'Simple steps', d: 'Each knows only its own slope', icon: 'link', atV: V(2.82, 0.3, 1.11) },
      { name: 'loss', t: 'The loss', d: 'The backward pass starts here, with 1', icon: 'target', atV: V(2.93, 0.3, -0.76) },
      { name: 'twice', t: 'w is used twice', d: 'Gradients from both paths add', icon: 'spark', atV: V(-3.58, 0.3, 0.0) },
    ];
    const reset = () => { Object.assign(st, { w: 0.5, b: 1, zero: true, detach: false, overwrite: false, acc: { w: 0, b: 0 }, fwd: false, bwd: false, steps: 0 }); runForward(); };
    const breaks = [
      { label: 'Forget to zero the gradients', hint: 'Backward twice, then step', on: () => { reset(); st.zero = false; st.fwd = true; finishBackward(); finishBackward(); st.phase = null; }, off: reset },
      { label: 'Detach in the middle', hint: 'A stop sign after the add', on: () => { reset(); st.detach = true; st.fwd = true; finishBackward(); st.phase = null; }, off: reset },
      { label: 'Overwrite where w is used twice', hint: 'Keep only the last path', on: () => { reset(); st.overwrite = true; st.fwd = true; finishBackward(); st.phase = null; }, off: reset },
    ];
    function status() {
      const tw = backward().viaMul + backward().viaReg;
      if (st.bwd && !st.zero && Math.abs(st.acc.w - tw) > 0.01) return { ok: false, msg: `<b>The gradients piled up.</b> Backward ran twice without zeroing, so w's gradient is ${fmt(st.acc.w)} instead of ${fmt(tw)}: each backward pass adds to what is already there. The next step would jump twice as far. Call <code>optimizer.zero_grad()</code> every step.` };
      if (st.detach && st.bwd) return { ok: false, msg: `<b>w and b get no gradient through the main path.</b> <code>detach()</code> cut the graph after the add, so the backward pass stops there. b's gradient is ${fmt(st.acc.b)}, and w only feels the small penalty term. They will never learn to fit the data.` };
      if (st.overwrite && st.bwd) return { ok: false, msg: `<b>Half of w's gradient is missing.</b> w feeds two paths: the multiply (${fmt(backward().viaMul)}) and the penalty (${fmt(backward().viaReg)}). Overwriting kept only the last one, ${fmt(st.acc.w)}, instead of their sum, ${fmt(tw)}. When a value is used twice, its gradients add.` };
      if (st.phase === 'fwd' || st.phase === 'fwd+bwd') return { msg: `<b>Forward pass:</b> each step computes its value from the ones before it, and remembers them for later.` };
      if (st.phase === 'bwd') return { msg: `<b>Backward pass:</b> start at the loss with gradient 1. Each step multiplies the gradient arriving from ahead by its own slope, and passes it back.` };
      if (st.bwd) return { ok: true, msg: `<b>Gradients ready.</b> w: ${fmt(st.acc.w)}, b: ${fmt(st.acc.b)}. Negative means raising the number lowers the loss. Press <b>Step</b> to move both against their gradients.` };
      if (st.detach) return { msg: `<b>A stop sign after the add.</b> Press <b>Backward</b> and watch where the gradient stops.` };
      if (st.overwrite) return { msg: `<b>Overwriting is on.</b> Where w is used twice, only the last path's gradient will be kept. Press <b>Backward</b>.` };
      if (!st.zero) return { msg: `<b>Gradients are not cleared.</b> Each backward pass will add to the last one. Press <b>Backward</b> twice to see them pile up.` };
      return { msg: `<b>Loss ${forward().L.toFixed(3)}.</b> Press <b>Backward</b> to find how much each number is to blame.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, forward: runForward, backward: runBackward, step, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'A model as steps', home: true, say: 'Here is a tiny model drawn as a graph of simple steps: multiply the input by w, add b, compare with the answer, and square the gap. The gold boxes are the numbers it can learn.', act: m => m.reset(), wait: 4 },
    { t: 'Forward', home: true, say: 'The forward pass pushes values from left to right. Every step works out its value, and remembers what it saw.', act: m => m.forward(), wait: 4 },
    { t: 'Backward', focus: [1.4, 0.3, 0.1], zoom: 1.35, say: 'Then the backward pass starts at the loss, with a gradient of one, and flows right to left. Each step multiplies by its own local slope. Chaining those slopes is the chain rule.', act: m => m.backward(), wait: 6 },
    { t: 'Used twice', focus: 'twice', zoom: 1.45, say: 'The weight w is used twice: in the multiply, and in a small penalty. Its gradient is the two paths added together.' },
    { t: 'Learn a little', home: true, say: 'Now move w and b a little, against their gradients. The loss falls. Repeat this a million times and you have training.', act: m => { m.step(); }, wait: 5 },
    { t: 'Zero each time', home: true, say: 'One habit matters: clear the gradients before each backward pass. Otherwise they pile up, step after step, and the model leaps too far.', act: m => m.backward(), wait: 5 },
  ],
  check: [
    { q: 'In the backward pass, what does each step do with the gradient arriving from ahead?', options: ['Multiplies it by its own local slope and passes it back', 'Adds 1 to it', 'Throws it away'], answer: 0, why: 'That multiplication, step after step, is the chain rule.' },
    { q: 'A weight feeds two different paths. What is its gradient?', options: ['The gradient from the last path only', 'The two paths\' gradients added together', 'Zero'], answer: 1, why: 'Every path from the weight to the loss contributes, so the gradients add.' },
    { q: 'Why call zero_grad() before each backward pass?', options: ['Gradients add up across backward passes unless cleared', 'It makes the forward pass faster', 'It deletes the model'], answer: 0, why: 'PyTorch accumulates gradients by design; without clearing, old ones pile on new ones.' },
  ],
  terms: [
    ['Computational graph', 'The model drawn as simple steps and the values flowing between them.'],
    ['Chain rule', 'The slope through a chain of steps is the product of each step\'s slope.'],
    ['Autodiff', 'Software that records the graph as code runs and computes every gradient exactly.'],
    ['Gradient accumulation', 'Gradients add up across backward passes until they are zeroed.'],
    ['detach()', 'Cuts the graph: no gradient flows back past that point.'],
  ],
  deeper: '<p><b>Why backward, not forward?</b> One backward pass gives the gradient of the loss with respect to every weight at once. Going forward you would need one pass per weight: millions of passes for a real model.</p><p><b>Accumulation on purpose.</b> When a batch is too big for memory, people run several small batches backward without zeroing, then step once. That is gradient accumulation, and it is why PyTorch adds by default.</p><p><b>Each step\'s slope.</b> Multiply by x: slope x (for w). Add b: slope 1. Square s: slope 2s. That is all the backward pass needs to know about each step.</p>',
  code: {
    title: 'A tiny autodiff engine',
    note: 'Adapted from the course\'s chain-rule lesson: each value remembers its parents and its local slopes.',
    text: `
class Value:
    def __init__(self, data, parents=()):
        self.data, self.grad, self.parents = data, 0.0, parents

    def __add__(self, o):
        return Value(self.data + o.data, ((self, 1.0), (o, 1.0)))

    def __sub__(self, o):
        return Value(self.data - o.data, ((self, 1.0), (o, -1.0)))

    def __mul__(self, o):
        return Value(self.data * o.data, ((self, o.data), (o, self.data)))

    def backward(self, g=1.0):
        self.grad += g                     # += : paths add up
        for parent, slope in self.parents:
            parent.backward(g * slope)     # the chain rule

x, w, b, y = Value(3), Value(0.5), Value(1.0), Value(4)
s = w * x + b - y
loss = s * s + Value(0.1) * w * w
loss.backward()
print(w.grad, b.grad)                      # -8.9  -3.0
`,
  },
};
