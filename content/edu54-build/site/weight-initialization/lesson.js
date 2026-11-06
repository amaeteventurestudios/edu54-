// Weight initialization: a signal passes through a deep stack of layers, shown as glass panes in a row.
// Inside each pane, sixteen dots are sixteen neurons: their height is the neuron's value before the activation.
// A healthy start keeps the cloud the same size all the way; too small and it shrinks to a line, too big and it slams into the edges (red).
// The back wall plots the signal size layer by layer, with the healthy band in green.
// Break it: weights too small (the signal fades), weights too big (it explodes), every weight the same (all neurons become copies).
const N = 64, SHOW = 16;
const INITS = [
  { k: 'small', n: 'Too small', gain: () => 0.5 },
  { k: 'xavier', n: 'Xavier', gain: () => 1 },
  { k: 'he', n: 'He', gain: () => Math.SQRT2 },
  { k: 'big', n: 'Too big', gain: () => 2.5 },
  { k: 'same', n: 'All the same', gain: () => 1 },
];
const ACTS = { relu: { n: 'ReLU', f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0) }, tanh: { n: 'tanh', f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2 } };

export default {
  slug: 'weight-initialization',
  title: 'Weight initialization: starting the signal right',
  description: 'A signal travels through 24 layers, each a glass pane with sixteen neurons inside. Start the weights at the right size and the signal arrives intact. Start them too small and it fades to nothing; too big and it explodes. Make every weight the same and all the neurons turn into copies.',
  overview: 'Before training, every weight needs a starting value. Each layer multiplies the signal by its weights, so if they start a little too small the signal shrinks layer after layer until it vanishes, and if they start a little too big it grows until it explodes. Xavier initialization picks the size that keeps the signal steady for tanh; He initialization doubles it for ReLU, which switches off half of its inputs. Weights must also be random: if every weight starts the same, every neuron computes the same thing and they stay copies forever.',
  keywords: ['weight initialization', 'xavier initialization', 'he initialization', 'vanishing gradients', 'exploding activations'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.45, -0.3], dir: [0.12, 0.4, 1.3], half: 1.7, wide: 7.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { init: 'he', act: 'relu', depth: 24 };
    const L = 24, X0 = -2.9, DX = 5.8 / (L - 1), PY = 1.0, PHH = 0.62, ZW = 0.5;
    /* ---------- the stack ---------- */
    const base = P.box(7.6, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, -0.2); S.add(base);
    const rail = P.box(6.5, 0.1, 0.7, '#3B3F8F', { r: 0.06 }); rail.position.set(0, 0.12, 0); S.add(rail);
    const railT = S.text('one layer per pane · dots = 16 of its 64 neurons', { size: 0.09, weight: 800, face: 'front', color: '#FFFFFF', maxW: 6 }); railT.position.set(0, 0.17, 0.355); S.add(railT);
    const railTop = S.text('24 layers deep', { size: 0.07, weight: 800, color: '#FFFFFF' }); railTop.position.set(2.6, 0.225, 0.2); S.add(railTop);
    const glass = new THREE.MeshLambertMaterial({ color: '#BFD9E6', transparent: true, opacity: 0.2, depthWrite: false });
    const panes = [...Array(L)].map((_, l) => { const p = P.box(0.05, PHH * 2 + 0.16, ZW + 0.1, '#BFD9E6', { r: 0, material: glass, cast: false }); p.position.set(X0 + l * DX, PY - PHH - 0.08, 0); p.layers.set(1); S.add(p); return p; });
    const mid = P.tube([V(X0 - 0.1, PY, 0), V(X0 + (L - 1) * DX + 0.1, PY, 0)], 0.006, '#8E91A3'); mid.userData.noFit = true; S.add(mid);
    const edgeTop = P.tube([V(X0 - 0.1, PY + PHH, 0), V(X0 + (L - 1) * DX + 0.1, PY + PHH, 0)], 0.006, C.red), edgeBot = P.tube([V(X0 - 0.1, PY - PHH, 0), V(X0 + (L - 1) * DX + 0.1, PY - PHH, 0)], 0.006, C.red);
    [edgeTop, edgeBot].forEach(e => { e.userData.noFit = true; S.add(e); });
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), L * SHOW);
    dots.userData.noFit = true; S.add(dots);
    const inBox = P.box(0.5, 0.9, 0.6, C.teal, { r: 0.06 }); inBox.position.set(X0 - 0.5, 0.22, 0); S.add(inBox);
    const inT = S.text('input', { size: 0.1, weight: 800, face: 'front', color: '#FFFFFF' }); inT.position.set(X0 - 0.5, 0.75, 0.305); S.add(inT);
    const inTop = S.text('input', { size: 0.09, weight: 800, color: '#FFFFFF' }); inTop.position.set(X0 - 0.5, 1.125, 0); S.add(inTop);
    const outBox = P.box(0.5, 0.9, 0.6, C.plum, { r: 0.06 }); outBox.position.set(-X0 + 0.5, 0.22, 0); S.add(outBox);
    const outT = S.text('output', { size: 0.1, weight: 800, face: 'front', color: '#FFFFFF' }); outT.position.set(-X0 + 0.5, 0.75, 0.305); S.add(outT);
    const outTop = S.text('output', { size: 0.09, weight: 800, color: '#FFFFFF' }); outTop.position.set(-X0 + 0.5, 1.125, 0); S.add(outTop);
    /* ---------- back wall: signal size per layer ---------- */
    const WZ = -0.9, WY = 0.12, WH = 2.95, WW = 6.6;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(0, WY, WZ); S.add(wall);
    const wallT = S.text('signal size after each layer', { size: 0.13, weight: 800, face: 'front', color: '#151827', maxW: 5 }); wallT.position.set(0, WY + WH - 0.16, WZ + 0.045); S.add(wallT);
    const wallTop = S.text('signal size', { size: 0.07, weight: 800 }); wallTop.position.set(0, WY + WH + 0.005, WZ); S.add(wallTop);
    const gy = lg => 2.4 + Math.max(-1, Math.min(1, lg / 6)) * 0.42, gx = l => X0 + l * DX, GZ = WZ + 0.06;
    const band = P.box(WW - 0.4, 0.14, 0.01, '#CFE8D2', { r: 0 }); band.position.set(0, gy(-0.6), GZ - 0.005); band.scale.y = (gy(0.6) - gy(-0.6)) / 0.14; band.userData.noFit = true; S.add(band);
    const bandT = S.text('healthy', { size: 0.08, weight: 800, face: 'front', color: '#2E7A45' }); bandT.position.set(X0 - 0.15, gy(0) , GZ + 0.01); S.add(bandT);
    const tinyT = S.text('fading', { size: 0.08, weight: 800, face: 'front', color: '#151827' }); tinyT.position.set(X0 - 0.15, gy(-4.5), GZ + 0.01); S.add(tinyT);
    const hugeT = S.text('exploding', { size: 0.08, weight: 800, face: 'front', color: C.red }); hugeT.position.set(X0 - 0.05, gy(4.5), GZ + 0.01); S.add(hugeT);
    const sigLine = P.tube([V(), V(1, 0, 0)], 0.022, C.indigo); sigLine.userData.noFit = true; S.add(sigLine);
    /* ---------- the maths: a real forward and backward pass ---------- */
    let seed = 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
    let res = null;
    function simulate() {
      seed = 2024;
      const I = INITS.find(i => i.k === st.init), A = ACTS[st.act], std = I.gain() / Math.sqrt(N);
      let h = [...Array(N)].map(gauss);
      const Ws = [], Zs = [], stds = [];
      for (let l = 0; l < st.depth; l++) {
        const W = [...Array(N)].map(() => [...Array(N)].map(() => (st.init === 'same' ? 1 / N : std * gauss())));
        const z = W.map(r => r.reduce((a, w, j) => a + w * h[j], 0));
        Ws.push(W); Zs.push(z);
        stds.push(Math.sqrt(z.reduce((a, v) => a + v * v, 0) / N));
        h = z.map(A.f);
      }
      // backward: send a random error signal from the top and see how much reaches layer 1
      let gr = [...Array(N)].map(gauss);
      for (let l = st.depth - 1; l >= 0; l--) { const gz = gr.map((g, i) => g * A.d(Zs[l][i])); gr = [...Array(N)].map((_, j) => Ws[l].reduce((a, r, i) => a + r[j] * gz[i], 0)); }
      const gStd = Math.sqrt(gr.reduce((a, v) => a + v * v, 0) / N);
      const last = Zs[Zs.length - 1], spread = Math.max(...last) - Math.min(...last), alike = spread < 1e-9 * (Math.abs(last[0]) + 1e-12) || spread < 1e-12;
      const sat = st.act === 'tanh' ? last.filter(v => Math.abs(v) > 2.5).length / N : 0;
      res = { Zs, stds, gStd, alike, sat, top: stds[stds.length - 1] };
    }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    function draw() {
      simulate();
      const lim = st.act === 'tanh' ? 2.5 : 3;
      let q = 0;
      for (let l = 0; l < L; l++) {
        const on = l < st.depth; panes[l].visible = on;
        for (let i = 0; i < SHOW; i++, q++) {
          if (!on) { dummy.position.set(0, -10, 0); dummy.scale.setScalar(0.001); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); continue; }
          const z = res.Zs[l][i], clip = Math.abs(z) > lim;
          dummy.position.set(X0 + l * DX + ((i * 7) % SHOW / (SHOW - 1) - 0.5) * 0.15, PY + Math.max(-1, Math.min(1, z / lim)) * PHH, -ZW / 2 + (i + 0.5) / SHOW * ZW);
          dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix);
          dots.setColorAt(q, col.set(clip ? C.red : st.init === 'same' ? C.grey : l % 2 ? C.gold : C.orange));
        }
      }
      dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
      outBox.position.x = X0 + (st.depth - 1) * DX + 0.5; outT.position.x = outBox.position.x; outTop.position.x = outBox.position.x;
      const pts = res.stds.map((s, l) => V(gx(l), gy(Math.log10(Math.max(1e-12, s))), GZ + 0.01));
      if (pts.length < 2) pts.push(pts[0].clone().add(V(0.01, 0, 0)));
      sigLine.geometry.dispose(); sigLine.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 3, 0.022, 5, false);
    }
    draw();
    const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    const fmt = v => { if (v < 1000 && v >= 0.01) return v.toFixed(2); const [m, e] = v.toExponential(0).split('e'); return `${m} × 10${String(+e).split('').map(c => SUP[c]).join('')}`; };
    const controls = [
      { type: 'buttons', label: 'Starting weights', options: INITS.map(i => i.n), get: () => INITS.findIndex(i => i.k === st.init), act: i => { st.init = INITS[i].k; draw(); } },
      { type: 'buttons', label: 'Activation', options: ['ReLU', 'tanh'], get: () => (st.act === 'relu' ? 0 : 1), act: i => { st.act = i ? 'tanh' : 'relu'; draw(); } },
      { type: 'slider', label: 'Layers', min: 2, max: 24, step: 1, get: () => st.depth, set: v => { st.depth = Math.round(v); draw(); } },
    ];
    const readouts = [
      { label: 'Signal at the top', get: () => ({ v: fmt(res.top), sub: 'input size is 1', good: res.top > 0.3 && res.top < 3, bad: res.top < 0.05 || res.top > 30 }) },
      { label: 'Learning signal at layer 1', get: () => ({ v: fmt(res.gStd), sub: 'error sent back is 1', good: res.gStd > 0.1 && res.gStd < 10, bad: res.gStd < 0.01 || res.gStd > 100 }) },
      { label: 'Neurons', get: () => ({ v: res.alike ? 'copies' : 'varied', bad: res.alike, good: !res.alike }) },
    ];
    const labels = [
      { name: 'layers', t: 'A deep stack', d: 'Each pane is one layer', icon: 'box', atV: V(X0 + 4 * DX, PY + PHH + 0.08, 0) },
      { name: 'dots', t: 'Neuron values', d: 'Red: slammed into the edge', icon: 'spark', atV: V(X0 + 18 * DX, PY - PHH - 0.08, ZW / 2) },
      { name: 'wall', t: 'Signal size, layer by layer', d: 'Green band: healthy', icon: 'wave', atV: V(WW / 2, gy(0), WZ) },
      { name: 'input', t: 'The input', d: '64 numbers, size 1', icon: 'target', atV: V(X0 - 0.75, 0.6, 0) },
    ];
    const reset = () => { Object.assign(st, { init: 'he', act: 'relu', depth: 24 }); draw(); };
    const breaks = [
      { label: 'Weights too small', hint: 'Half the right size', on: () => { reset(); st.init = 'small'; draw(); }, off: reset },
      { label: 'Weights too big', hint: 'Two and a half times the size', on: () => { reset(); st.init = 'big'; draw(); }, off: reset },
      { label: 'Every weight the same', hint: 'No randomness', on: () => { reset(); st.init = 'same'; draw(); }, off: reset },
    ];
    function status() {
      const I = INITS.find(i => i.k === st.init).n, A = ACTS[st.act].n;
      if (res.alike) return { ok: false, msg: `<b>Every neuron is a copy.</b> With every weight the same, all 64 neurons in a layer receive the same inputs with the same weights, so they compute the same number (the grey dots sit in a flat line). Their gradients are identical too, so training can never make them different. Weights must start random.` };
      if (res.top > 30 || res.gStd > 100) return { ok: false, msg: `<b>The signal explodes.</b> Each layer multiplies the signal by more than one, so after ${st.depth} layers it is ${fmt(res.top)} times the input and the dots slam into the edges. Training steps would be huge and the loss would turn into nonsense.` };
      if (res.sat > 0.5) return { ok: false, msg: `<b>Stuck at the edges.</b> tanh squashes every big value to plus or minus one, so most neurons are pinned there (red), where the slope is flat. The learning signal reaching layer 1 is ${fmt(res.gStd)}.` };
      if (res.top < 0.05 || res.gStd < 0.01) return { ok: false, msg: `<b>The signal fades away.</b> Each layer shrinks the signal a little, so after ${st.depth} layers it is only ${fmt(res.top)} of its starting size and the dots squeeze into a line. The learning signal sent back to layer 1 is ${fmt(res.gStd)}: the early layers barely learn.${st.init === 'xavier' && st.act === 'relu' ? ' Xavier is sized for tanh; ReLU switches off half its inputs, so it needs He, twice the variance.' : ''}` };
      return { ok: true, msg: `<b>Steady all the way.</b> ${I} with ${A} keeps the signal close to its starting size through ${st.depth} layers (${fmt(res.top)} at the top), and the learning signal reaching layer 1 is ${fmt(res.gStd)}. Every layer can learn from the first step.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A deep stack', home: true, say: 'A signal goes into a network 24 layers deep. Each glass pane is one layer, and the dots inside are its neurons, high for big positive values and low for big negative ones.', act: m => m.set({ init: 'he', act: 'relu', depth: 24 }) },
    { t: 'Too small', home: true, say: 'Start the weights a little too small. Every layer shrinks the signal, and by the top the dots have squeezed into a flat line: almost nothing gets through.', act: m => m.set({ init: 'small' }) },
    { t: 'Too big', home: true, say: 'Start them a little too big, and every layer grows the signal instead. The dots slam into the edges and turn red: the numbers have exploded.', act: m => m.set({ init: 'big' }) },
    { t: 'Just right', home: true, say: 'He initialization picks the size from the number of inputs to each neuron, doubled because ReLU switches off half of them. Now the signal stays the same size from bottom to top.', act: m => m.set({ init: 'he' }) },
    { t: 'Match the activation', home: true, say: 'Xavier initialization is the right size for tanh. Used with ReLU, it is half too small, and the signal fades again over many layers.', act: m => m.set({ init: 'xavier', act: 'relu' }) },
    { t: 'Not all the same', home: true, say: 'One last rule: the weights must be random. Give them all the same value, and every neuron becomes a copy of its neighbours, forever.', act: m => m.set({ init: 'same', act: 'relu' }) },
  ],
  check: [
    { q: 'Why can\'t all weights start at the same value?', options: ['Every neuron would compute the same thing and stay a copy', 'It would use too much memory', 'The loss would be negative'], answer: 0, why: 'Identical neurons get identical gradients, so they never become different.' },
    { q: 'What happens in a deep network when weights start too small?', options: ['The signal shrinks layer after layer and fades away', 'The signal explodes', 'Training gets faster'], answer: 0, why: 'Each layer multiplies the signal by less than one.' },
    { q: 'Why does He initialization use bigger weights than Xavier?', options: ['ReLU switches off about half its inputs, halving the signal', 'He is newer', 'tanh needs smaller numbers'], answer: 0, why: 'Doubling the variance makes up for the half that ReLU sets to zero.' },
  ],
  terms: [
    ['Initialization', 'Choosing the starting values of a network\'s weights before training.'],
    ['Xavier (Glorot) init', 'Random weights with variance about 1 divided by the number of inputs; suits tanh and sigmoid.'],
    ['He (Kaiming) init', 'Random weights with variance 2 divided by the number of inputs; suits ReLU.'],
    ['Vanishing signal', 'Values or gradients shrinking towards zero through many layers.'],
    ['Exploding signal', 'Values or gradients growing out of control through many layers.'],
    ['Symmetry', 'Neurons that start identical and therefore stay identical.'],
  ],
  deeper: '<p><b>Where the numbers come from.</b> A neuron adds up n inputs, each times a weight. If the inputs have size 1 and the weights have variance v, the sum has variance n × v. Setting v = 1/n keeps it at 1. ReLU zeroes half the values, so He uses v = 2/n.</p><p><b>Transformers</b> often scale down the weights of layers that add into the residual stream, by one over the square root of the depth, so that many added layers do not pile up.</p><p><b>Normalization layers</b> also rescale the signal at every layer, which makes very deep networks far less sensitive to the starting size.</p>',
  code: {
    title: 'Xavier and He initialization, and the 50-layer test',
    note: 'Adapted from the course\'s weight initialization lesson.',
    text: `
import numpy as np

def xavier(n_in, n_out):
    return np.random.randn(n_out, n_in) * np.sqrt(2 / (n_in + n_out))

def he(n_in, n_out):
    return np.random.randn(n_out, n_in) * np.sqrt(2 / n_in)

def signal_through(init, depth=50, width=256):
    h = np.random.randn(width)
    for layer in range(depth):
        z = init(width, width) @ h
        h = np.maximum(0, z)            # ReLU
    return z.std()

print("Xavier + ReLU:", signal_through(xavier))   # fades towards zero
print("He + ReLU:    ", signal_through(he))       # stays near 1
`,
  },
};
