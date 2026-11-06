// Multi-layer networks: will a phone get signal here? Good signal sits in a patch around a mast, which no single straight fence can enclose.
// A hidden layer of neurons each draws its own fence; the output neuron combines them into a closed shape. Training runs live.
// Break it: remove the activation (the fences add up to one straight line), use a single hidden neuron, start every weight the same (they all learn the same fence).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const PTS = (() => { const r = rngOf(12), out = []; for (let i = 0; i < 120; i++) { const x = r() * 2 - 1, z = r() * 2 - 1; out.push({ x, z, y: Math.hypot(x * 1.1 + 0.1, z - 0.05) < 0.55 ? 1 : 0 }); } return out; })();
const HALF = 1.8, G = 26, HMAX = 8;
const COLS = ['#1C9A94', '#EE7434', '#8A3F8E', '#3D6BD6', '#E3A72F', '#D9483B', '#3E9B5F', '#C9774A'];

export default {
  slug: 'multi-layer-networks',
  title: 'Layers: neurons working together',
  description: 'Good phone signal sits in a patch around the mast, and no single straight fence can enclose a patch. Give the network a hidden layer: each hidden neuron draws its own fence, and the output neuron combines them into a closed shape. Then take away the activation, keep just one neuron, and start every weight the same.',
  overview: 'One neuron can only draw a straight line. Stack neurons in layers and they can draw almost any shape: each hidden neuron cuts the space with its own straight fence, the activation bends its yes-or-no into a soft step, and the next layer combines those steps. Data flows forward from inputs through the hidden layer to the output. Without the activation, layers collapse into a single straight line, and neurons that start identical stay identical.',
  keywords: ['multilayer perceptron', 'hidden layer', 'forward pass', 'universal approximation', 'neural network layers'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.6, 0.45, 0], dir: [0.2, 1.25, 1.15], half: 2.9, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { H: 4, act: true, same: false, train: true, steps: 0, seed: 1 };
    let W1, B1, W2, B2;
    function init() {
      const r = rngOf(st.seed * 13 + 1);
      W1 = [...Array(HMAX)].map(() => st.same ? [0.5, 0.5] : [r() * 4 - 2, r() * 4 - 2]); B1 = [...Array(HMAX)].map(() => st.same ? 0.1 : r() - 0.5);
      W2 = [...Array(HMAX)].map(() => st.same ? 0.5 : r() * 2 - 1); B2 = 0; st.steps = 0;
    }
    const f = z => st.act ? Math.tanh(z) : z, df = a => st.act ? 1 - a * a : 1, sig = z => 1 / (1 + Math.exp(-z));
    function forward(x, z) { const h = []; for (let j = 0; j < st.H; j++) h.push(f(W1[j][0] * x + W1[j][1] * z + B1[j])); let o = B2; for (let j = 0; j < st.H; j++) o += W2[j] * h[j]; return { h, p: sig(o) }; }
    function step(lr = 0.5) {
      const gW1 = W1.map(() => [0, 0]), gB1 = B1.map(() => 0), gW2 = W2.map(() => 0); let gB2 = 0;
      for (const pt of PTS) { const { h, p } = forward(pt.x, pt.z), e = p - pt.y; gB2 += e; for (let j = 0; j < st.H; j++) { gW2[j] += e * h[j]; const d = e * W2[j] * df(h[j]); gW1[j][0] += d * pt.x; gW1[j][1] += d * pt.z; gB1[j] += d; } }
      const n = PTS.length; B2 -= lr * gB2 / n; for (let j = 0; j < st.H; j++) { W2[j] -= lr * gW2[j] / n; W1[j][0] -= lr * gW1[j][0] / n; W1[j][1] -= lr * gW1[j][1] / n; B1[j] -= lr * gB1[j] / n; }
      st.steps++;
    }
    const acc = () => PTS.filter(p => (forward(p.x, p.z).p > 0.5) === !!p.y).length / PTS.length;
    /* ---------- the field ---------- */
    const FX = -1.3, X = x => FX + x * HALF, Z = z => -z * HALF;
    const field = P.grid(G, G, HALF * 2 / G, { h: 0.04, gap: 0.01 }); field.mesh.position.set(FX, 0.0, 0); field.mesh.layers.set(1); S.add(field.mesh);
    const fieldBase = P.box(HALF * 2 + 0.2, 0.04, HALF * 2 + 0.2, '#D8D2C2', { r: 0.06 }); fieldBase.position.set(FX, -0.01, 0); S.add(fieldBase);
    const mast = new THREE.Group(); mast.position.set(X(-0.1), 0, Z(0.05)); S.add(mast);
    mast.add(P.cyl(0.04, 0.9, '#5B5F73')); const top = P.ball(0.07, C.red); top.position.y = 0.92; mast.add(top);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshLambertMaterial(), PTS.length); dots.userData.noFit = true; S.add(dots);
    const fences = [...Array(HMAX)].map((_, j) => { const r = P.box(1, 0.12, 0.025, COLS[j], { r: 0, m: { opacity: 0.8 } }); r.material.depthWrite = false; r.userData.noFit = true; S.add(r); return r; });
    /* ---------- the network diagram ---------- */
    const NX = 1.6;
    const ins = ['across', 'along'].map((n, i) => { const t = P.tile(n, 0.6, 0.2, 0.4, '#F7F5EE', { size: 0.13 }); t.position.set(NX, 0, -0.5 + i * 1.0); S.add(t); return t; });
    const hid = [...Array(HMAX)].map((_, j) => { const b = P.ball(0.13, COLS[j]); b.userData.noFit = true; S.add(b); return b; });
    const out = P.ball(0.2, C.ink); out.position.set(NX + 2.3, 0.25, 0); S.add(out);
    const outT = S.text('signal?', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true }); outT.position.set(NX + 2.3, 0.7, 0); outT.userData.noFit = true; S.add(outT);
    const wires = [...Array(HMAX * 3)].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.015, '#B9B6AE'); r.userData.noFit = true; S.add(r); return r; });
    const dummy = new THREE.Object3D(), col = new THREE.Color(), lo = new THREE.Color('#E8E3D6'), hi = new THREE.Color('#7FD1CB');
    function draw() {
      for (let i = 0; i < G; i++) for (let k = 0; k < G; k++) { const x = (i + 0.5) / G * 2 - 1, z = 1 - (k + 0.5) / G * 2, p = forward(x, z).p; field.set(i, k, { color: col.copy(lo).lerp(hi, p) }); }
      field.commit();
      PTS.forEach((pt, i) => { const ok = (forward(pt.x, pt.z).p > 0.5) === !!pt.y; dummy.position.set(X(pt.x), 0.1, Z(pt.z)); dummy.scale.setScalar(ok ? 1 : 1.5); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); dots.setColorAt(i, col.set(pt.y ? '#0E6B6B' : '#B9B6AE')); });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
      // each hidden neuron's fence: w·(x, z) + b = 0
      fences.forEach((fe, j) => { const on = j < st.H, [a, b] = W1[j] || [0, 0], n = Math.hypot(a, b); fe.visible = on && n > 1e-3; if (!fe.visible) return; const t = -B1[j] / (n * n), cx = a * t, cz = b * t; fe.position.set(X(cx), 0.1, Z(cz)); fe.rotation.y = Math.atan2(a, -b) + Math.PI / 2; fe.scale.x = HALF * 1.6; const inside = Math.abs(cx) < 1.3 && Math.abs(cz) < 1.3; fe.visible = inside; });
      // diagram positions and wire thickness by weight
      const hz = j => -1.3 + (j + 0.5) * 2.6 / st.H;
      hid.forEach((b, j) => { b.visible = j < st.H; b.position.set(NX + 1.2, 0.25, hz(j)); });
      let w = 0;
      for (let j = 0; j < HMAX; j++) for (let k = 0; k < 3; k++) { const r = wires[w++], on = j < st.H; r.visible = on; if (!on) continue; const a = k < 2 ? ins[k].position.clone().add(V(0.3, 0.12, 0)) : hid[j].position, b = k < 2 ? hid[j].position : out.position; P.setRod(r, a, b); const wt = k < 2 ? W1[j][k] : W2[j]; r.scale.x = r.scale.z = Math.max(0.4, Math.min(3, Math.abs(wt))); r.material = P.mat(wt >= 0 ? C.teal : C.coral); }
    }
    init();
    let acc0 = 0;
    function update(dt) { if (st.train && st.steps < 6000) { acc0 += dt * (S.reduced ? 2000 : 600); let k = 0; while (acc0 >= 1 && k < 80) { acc0 -= 1; step(); k++; } } draw(); }
    const controls = [
      { type: 'slider', label: 'Hidden neurons', min: 1, max: HMAX, step: 1, get: () => st.H, set: v => { st.H = Math.round(v); init(); } },
      { type: 'toggle', label: 'Activation (tanh)', short: 'Activation', get: () => st.act, set: v => { st.act = v; init(); } },
      { type: 'toggle', label: 'Train', get: () => st.train, set: v => { st.train = v; } },
      { type: 'button', label: 'New random start', short: 'Restart', act: () => { st.seed++; st.same = false; init(); } },
    ];
    const readouts = [
      { label: 'Spots predicted right', get: () => { const a = acc(); return { v: `${Math.round(a * 100)}%`, bar: a, good: a > 0.95, bad: a < 0.8 }; }, bar: true },
      { label: 'Training steps', get: () => ({ v: st.steps }) },
    ];
    const labels = [
      { name: 'patch', t: 'Signal near the mast', d: 'Teal dots: good signal', icon: 'target', atV: V(FX - HALF, 0.1, -HALF) },
      { name: 'fences', t: 'One fence per hidden neuron', d: 'Each cuts the map in two', icon: 'scale', atV: V(FX - HALF, 0.1, HALF) },
      { name: 'hidden', t: 'The hidden layer', d: 'Its outputs feed the last neuron', icon: 'spark', atV: V(NX + 1.2, 0.4, -1.45) },
      { name: 'out', t: 'The output', d: 'Combines the fences into a shape', icon: 'check', atV: V(NX + 2.5, 0.25, 0) },
    ];
    const reset = () => { Object.assign(st, { H: 4, act: true, same: false, train: true, seed: 1 }); init(); };
    const breaks = [
      { label: 'No activation', hint: 'Hidden neurons just add up', on: () => { reset(); st.act = false; init(); }, off: reset },
      { label: 'One hidden neuron', hint: 'A single fence', on: () => { reset(); st.H = 1; init(); }, off: reset },
      { label: 'Every weight starts the same', hint: 'No randomness in the start', on: () => { reset(); st.same = true; init(); }, off: reset },
    ];
    function status() {
      const a = Math.round(acc() * 100);
      if (!st.act) return { ok: false, msg: `<b>Layers without a bend are one straight line.</b> With no activation, each hidden neuron passes on a plain weighted sum, and a sum of sums is still a straight-line rule. So ${st.H} neurons can do no more than one: ${a}% right. The bend (tanh, ReLU) is what lets layers build shapes.` };
      if (st.H === 1) return { ok: false, msg: `<b>One fence can't surround a patch.</b> A single hidden neuron draws one straight cut, so the best it can do is chop off one side of the map: ${a}% right. It takes at least three fences to close a patch.` };
      if (st.same) return { ok: false, msg: `<b>Identical neurons stay identical.</b> Every hidden neuron started with the same weights, so they receive the same blame and make the same change at every step: ${st.H} copies of one fence, ${a}% right. Random starting weights break the symmetry.` };
      if (st.steps < 400) return { msg: `<b>Training… step ${st.steps}.</b> Each hidden neuron's fence slides and turns as the blame flows back.` };
      return { ok: a > 95 ? true : undefined, msg: `<b>${a}% of spots right with ${st.H} hidden neurons.</b> Each coloured fence is one hidden neuron's straight cut; the output neuron weighs them (teal wires positive, coral negative) into a closed patch around the mast.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); init(); } };
  },

  story: [
    { t: 'Signal near the mast', home: true, say: 'A phone gets good signal in a patch around this mast near Kisumu. Teal dots had signal, grey ones didn\'t. Can a network learn the patch?', act: m => m.set({ H: 1, train: false }) },
    { t: 'One neuron, one line', home: true, say: 'A single neuron can only draw one straight fence. It chops the map in two, and the patch stays half wrong.', act: m => m.set({ H: 1, train: true }), wait: 5 },
    { t: 'A hidden layer', focus: 'hidden', zoom: 1.3, say: 'Add a hidden layer of four neurons. Each one takes the position and draws its own fence. The output neuron listens to all four.', act: m => m.set({ H: 4 }) },
    { t: 'Fences into a shape', home: true, say: 'As training runs, the four fences slide around the mast, and the output neuron combines them into a closed patch. Data flows forward; blame flows back.', wait: 6 },
    { t: 'Why the bend matters', home: true, say: 'Take away the activation, and each neuron just adds up its inputs. A sum of sums is still a straight line, so four neurons do no better than one.', act: m => m.set({ act: false }), wait: 5 },
    { t: 'Different starts', home: true, say: 'And start every weight the same, and the neurons all learn the same fence forever. Random starts let each one find its own job.', act: m => m.set({ act: true, same: true }), wait: 5 },
  ],
  check: [
    { q: 'Why can\'t a single neuron learn a patch around the mast?', options: ['It can only draw one straight line', 'It has too many weights', 'It needs more data'], answer: 0, why: 'A closed shape needs several cuts combined.' },
    { q: 'What happens to a multi-layer network with no activation function?', options: ['It collapses into a single straight-line model', 'It becomes more powerful', 'It stops training'], answer: 0, why: 'Linear layers stacked are still linear; the bend adds the power.' },
    { q: 'Why start weights at random?', options: ['So neurons don\'t all learn the same thing', 'To make training slower', 'Randomness is required by law'], answer: 0, why: 'Identical neurons get identical updates and never differ.' },
  ],
  terms: [
    ['Hidden layer', 'Neurons between the inputs and the output.'],
    ['Forward pass', 'Pushing inputs through each layer in turn to get the output.'],
    ['Activation function', 'The bend applied to each neuron\'s sum (tanh, ReLU, sigmoid).'],
    ['Symmetry breaking', 'Random initial weights so neurons learn different features.'],
    ['Universal approximation', 'With enough hidden neurons, one hidden layer can approximate almost any shape.'],
  ],
  deeper: '<p><b>Matrix view.</b> A whole layer is one matrix multiply: inputs (2 numbers) times a 2 × 4 weight matrix gives 4 sums, then the activation. Deep networks are stacks of these.</p><p><b>Wide or deep?</b> One wide hidden layer can draw any shape in theory, but deeper networks usually need far fewer neurons, because later layers reuse what earlier ones found.</p><p><b>Shapes in many dimensions.</b> The same idea works with hundreds of inputs: each neuron cuts a high-dimensional space with a flat sheet, and layers combine the cuts.</p>',
  code: {
    title: 'A two-layer network from scratch',
    note: 'Adapted from the course\'s multi-layer network lesson.',
    text: `
import numpy as np

rng = np.random.default_rng(1)
W1, b1 = rng.normal(0, 1, (2, 4)), np.zeros(4)     # input → 4 hidden neurons
W2, b2 = rng.normal(0, 1, (4, 1)), np.zeros(1)     # hidden → output

def forward(X):
    h = np.tanh(X @ W1 + b1)              # each column: one neuron's soft fence
    p = 1 / (1 + np.exp(-(h @ W2 + b2)))  # combine them into a shape
    return h, p

for step in range(5000):
    h, p = forward(X)
    e = p - y[:, None]                    # blame at the output
    dh = (e @ W2.T) * (1 - h ** 2)        # blame passed back through tanh
    W2 -= 0.5 * h.T @ e / len(X); b2 -= 0.5 * e.mean(0)
    W1 -= 0.5 * X.T @ dh / len(X); b1 -= 0.5 * dh.mean(0)
`,
  },
};
