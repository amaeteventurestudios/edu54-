// Backpropagation: a 2-3-1 network learns the staircase light (XOR). Forward pass in gold, the error flowing back in red,
// every wire's thickness its weight. Break it: no chain rule (hidden layer never learns), all weights start at zero.
const sig = x => 1 / (1 + Math.exp(-x));
const X = [[0, 0], [0, 1], [1, 0], [1, 1]], Y = [0, 1, 1, 0];
function initNet(zero) {
  let s = 7; const r = () => zero ? 0 : ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  return { W1: [[r() * 2, r() * 2], [r() * 2, r() * 2], [r() * 2, r() * 2]], b1: [r(), r(), r()], W2: [r() * 2, r() * 2, r() * 2], b2: r() };
}

export default {
  slug: 'backpropagation',
  title: 'Backpropagation',
  description: 'Watch a small neural network learn. Answers flow forward in gold, the blame flows back in red, and every wire changes a little. This is how all neural networks learn.',
  overview: 'One neuron could not learn the staircase light (on when exactly one switch is up). Three hidden neurons can, but how does each wire know how to change? Backpropagation sends the error backwards through the network, and the chain rule shares out the blame. Watch it happen, wire by wire.',
  keywords: ['backpropagation explained', 'chain rule', 'neural network training', 'forward pass backward pass'],
  orient: 'any',
  view: { target: [0, 0.8, 0.4], dir: [0.55, 1.05, 1.25], half: 3.6, wide: 5 },

  build(S) {
    const { THREE, V, P, C } = S;
    const Y0 = 0.95;
    const posIn = [V(-2.7, Y0, -0.75), V(-2.7, Y0, 0.75)], posH = [V(0, Y0, -1.35), V(0, Y0, 0), V(0, Y0, 1.35)], posO = V(2.7, Y0, 0);
    // neurons on little pedestals
    const neuron = (p, r = 0.3) => { const ped = P.cyl(0.16, Y0 - r * 0.6, '#D8D2C4'); ped.position.set(p.x, 0, p.z); S.add(ped); const b = P.ball(r, '#3B3F55', { m: { fresh: true } }); b.material = new THREE.MeshLambertMaterial({ color: '#3B3F55' }); b.position.copy(p); S.add(b); return b; };
    const nIn = posIn.map(p => neuron(p, 0.26)), nH = posH.map(p => neuron(p)), nO = neuron(posO, 0.36);
    // each neuron's value is written on the ball itself, so it travels with it from every angle
    const valT = [...posIn, ...posH, posO].map(p => { const t = S.text('', { size: 0.15, face: 'cam', weight: 750, bg: 'rgba(255,255,255,.86)', pad: 0.14, color: C.ink, top: true }); t.position.copy(p); t.userData.noFit = true; S.add(t); return t; });
    // column names on the floor in front of each column, where no ball hides them
    const head = (s, x, z) => { const t = S.text(s, { size: 0.2, weight: 700 }); t.position.set(x, 0.02, z); S.add(t); };
    head('INPUTS', -2.7, 1.4); head('HIDDEN', 0, 2.0); head('OUTPUT', 2.7, 0.75);
    // wires
    const matPos = P.mat(C.teal), matNeg = P.mat(C.coral);
    const e1 = [], e2 = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const r = P.rod(posIn[j], posH[i], 0.03, C.teal); S.add(r); e1.push({ r, i, j, a: posIn[j], b: posH[i] }); }
    for (let i = 0; i < 3; i++) { const r = P.rod(posH[i], posO, 0.03, C.teal); S.add(r); e2.push({ r, i, a: posH[i], b: posO }); }
    // pulses: one bead per wire
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 9);
    beads.layers.set(1); beads.userData.noMask = true; beads.frustumCulled = false; S.add(beads);
    const dummy = new THREE.Object3D(), gold = new THREE.Color(C.gold), red = new THREE.Color(C.red);
    /* ---------- the four cases: the staircase light ---------- */
    const cases = X.map((x, k) => {
      const g = new THREE.Group(); g.position.set(-1.65 + k * 1.1, 0, 2.95); S.add(g);
      const base = P.box(0.9, 0.08, 0.7, '#F7F5EE', { r: 0.1 }); g.add(base);
      x.forEach((v, j) => { const sw = P.box(0.16, 0.06, 0.26, v ? C.gold : '#8E91A3', { r: 0.04 }); sw.position.set(-0.3 + j * 0.2, 0.08, 0.1); sw.rotation.x = v ? -0.4 : 0.4; g.add(sw); });
      const bulb = P.ball(0.15, '#8E91A3'); bulb.material = new THREE.MeshLambertMaterial({ color: '#8E91A3' }); bulb.position.set(0.22, 0.25, 0); g.add(bulb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), P.mat(Y[k] ? C.gold : '#6B6E80')); ring.position.set(0.22, 0.25, 0); ring.rotation.x = -Math.PI / 2; g.add(ring);
      return { g, bulb };
    });

    /* ---------- the network ---------- */
    const st = { net: initNet(false), lr: 2, auto: false, chain: true, zero: false, epochs: 0, k: 0, phase: -1, speed: 1, watching: false, grads: null };
    function forward(x) { const n = st.net; const h = n.W1.map((w, i) => sig(w[0] * x[0] + w[1] * x[1] + n.b1[i])); const o = sig(n.W2[0] * h[0] + n.W2[1] * h[1] + n.W2[2] * h[2] + n.b2); return { h, o }; }
    function backward(k, apply = true) {
      const n = st.net, x = X[k], { h, o } = forward(x), d = 2 * (o - Y[k]) * o * (1 - o);
      const g = { W2: h.map(v => d * v), W1: [], b1: [], b2: d };
      for (let i = 0; i < 3; i++) { const dh = st.chain ? d * n.W2[i] * h[i] * (1 - h[i]) : 0; g.W1.push([dh * x[0], dh * x[1]]); g.b1.push(dh); }
      if (apply) { for (let i = 0; i < 3; i++) { n.W2[i] -= st.lr * g.W2[i]; n.W1[i][0] -= st.lr * g.W1[i][0]; n.W1[i][1] -= st.lr * g.W1[i][1]; n.b1[i] -= st.lr * g.b1[i]; } n.b2 -= st.lr * g.b2; }
      return g;
    }
    const loss = () => X.reduce((s, x, k) => s + (forward(x).o - Y[k]) ** 2, 0) / 4;
    const right = () => X.filter((x, k) => Math.round(forward(x).o) === Y[k]).length;
    const cIn = new THREE.Color('#3B3F55'), cOn = new THREE.Color(C.gold), tmpC = new THREE.Color();
    function drawWires() {
      const n = st.net;
      for (const e of e1) { const w = n.W1[e.i][e.j]; e.r.material = w >= 0 ? matPos : matNeg; e.r.scale.x = e.r.scale.z = 0.35 + Math.min(3.2, Math.abs(w) * 0.55); }
      for (const e of e2) { const w = n.W2[e.i]; e.r.material = w >= 0 ? matPos : matNeg; e.r.scale.x = e.r.scale.z = 0.35 + Math.min(3.2, Math.abs(w) * 0.55); }
      cases.forEach((c, k) => { const o = forward(X[k]).o; c.bulb.material.color.copy(tmpC.set('#5A5D70').lerp(cOn, o)); c.bulb.material.emissive.set(C.gold).multiplyScalar(o * 0.35); });
    }
    function drawNeurons(k, show) {
      const x = X[k], { h, o } = forward(x);
      nIn.forEach((b, j) => b.material.color.copy(cIn).lerp(cOn, show >= 0 ? x[j] : 0));
      nH.forEach((b, i) => b.material.color.copy(cIn).lerp(cOn, show >= 1 ? h[i] : 0));
      nO.material.color.copy(cIn).lerp(cOn, show >= 2 ? o : 0);
      const vals = [...x, ...h, o];
      valT.forEach((t, i) => { const lvl = i < 2 ? 0 : i < 5 ? 1 : 2; t.visible = show >= lvl; t.userData.set(i < 2 ? `${vals[i]}` : vals[i].toFixed(2)); });
      if (show >= 2) { const err = o - Y[k]; nO.material.emissive.set(Math.abs(err) > 0.3 ? C.red : '#000000').multiplyScalar(Math.min(1, Math.abs(err)) * 0.5); } else nO.material.emissive.set(0);
    }
    drawWires(); drawNeurons(0, 2);
    // one cycle: forward (0→1), pause on the error (1→1.3), backward (1.3→2.3)
    const CYCLE = 2.3;
    function drawBeads(ph) {
      const g = st.grads;
      let n = 0;
      const put = (a, b, u, s, col) => { dummy.position.copy(a).lerp(b, u); dummy.scale.setScalar(s); dummy.updateMatrix(); beads.setMatrixAt(n, dummy.matrix); beads.setColorAt(n, col); n++; };
      if (ph < 0 || (ph >= 1 && ph < 1.3)) { beads.count = 0; return; }
      beads.count = 9;
      if (ph < 1) {
        for (const e of e1) put(e.a, e.b, Math.min(1, ph * 2), ph < 0.5 ? 1 : 0.001, gold);
        for (const e of e2) put(e.a, e.b, Math.max(0, ph * 2 - 1), ph >= 0.5 ? 1 : 0.001, gold);
      } else {
        const u = ph - 1.3;
        for (const e of e2) put(e.b, e.a, Math.min(1, u * 2), u < 0.5 ? 0.5 + Math.min(1.5, Math.abs(g?.W2[e.i] || 0) * 6) : 0.001, red);
        for (const e of e1) put(e.b, e.a, Math.max(0, u * 2 - 1), u >= 0.5 ? (st.chain ? 0.5 + Math.min(1.5, Math.abs(g?.W1[e.i][e.j] || 0) * 10) : 0.001) : 0.001, red);
      }
      beads.instanceMatrix.needsUpdate = true; if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    }
    let t = 0, trainAcc = 0;
    function update(dt) {
      if (st.phase < 0 && !st.auto) { drawBeads(-1); return; }
      const T = st.auto ? 1.1 : 3.4;   // seconds per cycle on screen
      if (st.phase < 0) { st.phase = 0; st.grads = backward(st.k, false); }
      st.phase += dt / T * CYCLE;
      const ph = st.phase;
      drawNeurons(st.k, ph < 0.5 ? 0 : ph < 1 ? 1 : 2);
      drawBeads(ph);
      if (st.auto) {
        trainAcc += dt * 14 * st.speed;   // epochs per second while training
        while (trainAcc >= 1) { trainAcc -= 1; for (let k = 0; k < 4; k++) backward(k); st.epochs++; }
        drawWires();
        if (loss() < 0.004 || st.epochs > 3000) st.auto = false;
      }
      if (ph >= CYCLE) {
        if (!st.auto && st.watching) { backward(st.k); st.epochs += 0.25; drawWires(); st.watching = false; }
        st.phase = st.auto ? 0 : -1; st.k = (st.k + 1) % 4; if (st.auto) st.grads = backward(st.k, false);
        if (!st.auto) drawNeurons(st.k, 2);
      }
      S.sync();
    }
    const reset = () => { Object.assign(st, { net: initNet(st.zero), auto: false, epochs: 0, k: 0, phase: -1, watching: false }); drawWires(); drawNeurons(0, 2); };
    const controls = [
      { type: 'toggle', label: 'Train', get: () => st.auto, set: v => { st.auto = v; if (v) st.watching = false; } },
      { type: 'button', label: 'Watch one example', short: 'One example', act: () => { st.auto = false; st.watching = true; st.phase = -1; st.grads = backward(st.k, false); st.phase = 0; } },
      { type: 'button', label: 'Start again', short: 'Reset', act: reset, quick: false },
      { type: 'slider', label: 'Learning rate', min: 0.05, max: 6, step: 0.05, get: () => st.lr, set: v => { st.lr = v; } },
      { type: 'slider', label: 'Training speed', min: 0.25, max: 4, step: 0.25, get: () => st.speed, set: v => { st.speed = v; }, fmt: v => `${v}×` },
    ];
    const readouts = [
      { label: 'Error', get: () => { const l = loss(); return { v: l.toFixed(3), bar: Math.min(1, l / 0.3), good: l < 0.02 }; }, bar: true },
      { label: 'Cases right', get: () => ({ v: `${right()} / 4`, sub: `${Math.floor(st.epochs)} rounds`, good: right() === 4 }) },
    ];
    const labels = [
      { name: 'inputs', t: 'Two switches', d: 'Up is 1, down is 0', icon: 'target', atV: posIn[0].clone().add(V(0, 0.26, 0)) },
      { name: 'hidden', t: 'Hidden neurons', d: 'Each learns its own small pattern', icon: 'spark', atV: posH[0].clone().add(V(0, 0.3, 0)) },
      { name: 'output', t: 'The answer', d: 'Glows red when it is wrong', icon: 'bolt', atV: posO.clone().add(V(0, 0.36, 0)) },
      { name: 'cases', t: 'The staircase light', d: 'On when exactly one switch is up', icon: 'info', atV: V(1.65, 0.45, 2.95) },
    ];
    const breaks = [
      { label: 'Forget the chain rule', hint: 'The blame stops at the output layer', on: () => { st.chain = false; reset(); st.auto = true; }, off: () => { st.chain = true; reset(); } },
      { label: 'Start every weight at zero', hint: 'All hidden neurons begin the same', on: () => { st.zero = true; reset(); st.auto = true; }, off: () => { st.zero = false; reset(); } },
    ];
    function status() {
      const l = loss(), r = right();
      if (!st.chain && st.epochs > 300) return { ok: false, msg: `<b>The hidden layer never learns.</b> Without the chain rule the error stops at the last layer, so the first wires never change. Stuck at ${r} of 4 cases.` };
      if (!st.chain) return { ok: false, msg: `<b>No chain rule.</b> The error reaches the last layer and stops, so the wires into the hidden neurons never change: watch them stay still. Only the last layer is learning (error ${l.toFixed(3)}).` };
      if (st.zero && st.epochs > 300) return { ok: false, msg: `<b>Three neurons acting as one.</b> Starting at zero, every hidden neuron gets the same blame and changes the same way. They stay twins forever, and one neuron can't learn this. That's why weights start random.` };
      if (st.zero) return { ok: false, msg: `<b>Every weight starts at zero.</b> All three hidden neurons get exactly the same blame, so they change in step, like twins. Watch: they never become different (error ${l.toFixed(3)}).` };
      if (r === 4 && l < 0.02) return { ok: true, msg: `<b>Learned it</b> in ${Math.floor(st.epochs)} rounds. All four cases right. Nobody told the hidden neurons what to do: the blame flowing back taught them.` };
      if (st.watching || (st.phase >= 0 && !st.auto)) return { msg: st.phase < 1 ? `<b>Forward pass:</b> each neuron adds up its inputs times the weights, and squashes the total between 0 and 1.` : st.phase < 1.3 ? `<b>Compare:</b> the answer should be ${Y[st.k]}. The gap is the error.` : `<b>Backward pass:</b> the error flows back. Each wire learns how much it was to blame, and changes by that much.` };
      if (st.auto) return { msg: `<b>Training:</b> forward, compare, backward, for all four cases, again and again. Error ${l.toFixed(3)}.` };
      return { msg: `<b>${r} of 4 cases right.</b> Press Train, or Watch one example to see a single pass slowly.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset,
      watch: () => controls[1].act(), train: () => { st.auto = true; } };
  },

  story: [
    { t: 'The staircase light', focus: 'cases', zoom: 1.4, say: 'A staircase light has two switches. It is on when exactly one switch is up. One neuron could not learn this rule. This network has three hidden neurons in the middle.' },
    { t: 'Forward pass', focus: 'hidden', zoom: 1.2, say: 'Watch one example. The switch values flow forward. Each neuron adds up its inputs times the weights, and squashes the total to between zero and one.', act: m => m.watch(), wait: 4 },
    { t: 'The error', focus: 'output', zoom: 1.4, say: 'The output is compared with the right answer. If it should be off but glows, the gap is the error.' },
    { t: 'Backward pass', home: true, say: 'Now the error flows backwards in red. The chain rule shares out the blame: a wire that pushed the answer the wrong way, strongly, gets a big red bead and changes the most.', act: m => m.watch(), wait: 4 },
    { t: 'Again and again', home: true, say: 'Train it. Forward, compare, backward, thousands of times. The wires thicken and flip colour, and the bulbs start lighting only when they should.', act: m => m.train(), wait: 8 },
    { t: 'How every network learns', home: true, say: 'Nobody told the hidden neurons what to look for. The blame flowing back taught them. Every large model, including the chat assistants, is trained exactly this way.' },
  ],
  check: [
    { q: 'What flows backwards in backpropagation?', options: ['The inputs', 'The error, shared out as blame for each weight', 'The training data'], answer: 1, why: 'The error at the output flows back, and each weight gets a share of the blame (its gradient).' },
    { q: 'What does the chain rule let the network do?', options: ['Pass blame through hidden layers', 'Add more neurons', 'Store examples'], answer: 0, why: 'It multiplies the blame layer by layer, so wires far from the output still learn.' },
    { q: 'Why don\'t weights start at zero?', options: ['Zero is too small to store', 'Every hidden neuron would stay identical', 'It makes training too fast'], answer: 1, why: 'Identical neurons get identical blame and never become different. Random starts break the symmetry.' },
  ],
  terms: [
    ['Forward pass', 'Inputs flow through the network to produce an answer.'],
    ['Loss', 'How wrong the answer is: here the squared gap from the right answer.'],
    ['Backward pass', 'The loss flows back to work out each weight\'s gradient.'],
    ['Chain rule', 'Multiply the slopes along the path to find how a far-away weight affects the loss.'],
    ['Hidden layer', 'Neurons between input and output, which learn their own in-between features.'],
  ],
  deeper: '<p>Modern libraries (PyTorch, JAX) do this automatically: they record every sum and multiplication in the forward pass, then walk the record backwards. That is called <b>autograd</b>. The code panel shows a tiny version: each value remembers how it was made and how to pass blame to its parents.</p>',
  code: {
    title: 'A tiny autograd value',
    note: 'From the course\'s backpropagation lesson: every number remembers how it was made, so the blame can flow back.',
    text: `
import math

class Value:
    def __init__(self, data, children=()):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None
        self._children = set(children)

    def __mul__(self, other):
        out = Value(self.data * other.data, (self, other))
        def _backward():
            # chain rule: my blame times the other side
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def sigmoid(self):
        s = 1 / (1 + math.exp(-self.data))
        out = Value(s, (self,))
        def _backward():
            self.grad += s * (1 - s) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):
            if v not in seen:
                seen.add(v)
                for c in v._children:
                    visit(c)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):   # output first, inputs last
            v._backward()
`,
  },
};
