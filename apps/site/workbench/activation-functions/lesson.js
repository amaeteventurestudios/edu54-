// Activation functions: the bend in every neuron. Left: the curve itself, with a bead you slide along it.
// Right: a small network bends a line to fit Lagos rainfall (two rainy seasons). Break it: no activation (a straight line), one neuron.
const ACTS = {
  None: { f: x => x, d: () => 1 },
  Step: { f: x => x >= 0 ? 1 : 0, d: () => 0 },
  Sigmoid: { f: x => 1 / (1 + Math.exp(-x)), d: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); } },
  Tanh: { f: x => Math.tanh(x), d: x => 1 - Math.tanh(x) ** 2 },
  ReLU: { f: x => Math.max(0, x), d: x => x > 0 ? 1 : 0 },
  GELU: { f: x => 0.5 * x * (1 + Math.tanh(0.79788 * (x + 0.044715 * x ** 3))), d: x => { const e = 1e-4, g = ACTS.GELU.f; return (g(x + e) - g(x - e)) / (2 * e); } },
};
const NAMES = Object.keys(ACTS);
const RAIN = [13, 41, 99, 130, 196, 315, 214, 63, 152, 157, 66, 22];   // Lagos, mm per month (rounded averages)
const MONTHS = 'JFMAMJJASOND';

export default {
  slug: 'activation-functions',
  title: 'Activation functions',
  description: 'The small bend inside every neuron. Slide along ReLU, sigmoid and GELU, then watch a tiny network bend a line into the shape of Lagos rainfall. Take the bend away and it can only draw a straight line.',
  overview: 'After a neuron adds up its inputs, it passes the total through a bend: an activation function. Without that bend, stacking a hundred layers still only gives a straight line. With it, a handful of neurons can draw almost any shape, like the two rainy seasons in Lagos.',
  keywords: ['activation functions explained', 'relu', 'sigmoid', 'gelu', 'why neural networks need non-linearity'],
  phoneTurn: false,
  orient: 'landscape',
  view: { target: [0.3, 1.5, 0], dir: [0.35, 0.45, 1.3], half: 3.3, wide: 6.6, maxPolar: 1.5 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { act: 'ReLU', x: 1, hidden: 6, iters: 0, net: null, fitting: false };
    /* ---------- left: the activation curve ---------- */
    const LX = -3.1, BW = 3.2, BH = 3.2;
    const boardL = P.box(BW + 0.3, BH + 0.3, 0.12, '#FBF8F0', { r: 0.05, m: { emissive: '#8A867A' } }); boardL.position.set(LX, 0, -0.3); S.add(boardL);
    const gx = x => LX + x / 3 * (BW / 2 - 0.15), gy = y => 0.15 + (y + 1.2) / 4.2 * BH;
    const gridLine = (a, b) => { const r = P.rod(a, b, 0.008, '#D3CBBA'); r.layers.set(1); S.add(r); };
    gridLine(V(gx(-3), gy(0), -0.22), V(gx(3), gy(0), -0.22)); gridLine(V(gx(0), gy(-1.2), -0.22), V(gx(0), gy(3), -0.22));
    const tl = S.text('in →', { size: 0.15, face: 'front', weight: 650, color: '#6B6656' }); tl.position.set(gx(2.6), gy(0) - 0.15, -0.21); S.add(tl);
    const tu = S.text('out', { size: 0.15, face: 'front', weight: 650, color: '#6B6656' }); tu.position.set(gx(0) + 0.25, gy(2.8), -0.21); S.add(tu);
    let curve = null;
    const bead = P.ball(0.12, C.gold); S.add(bead);
    const slope = P.box(0.8, 0.03, 0.03, C.red, { r: 0 }); slope.userData.noFit = true; S.add(slope);
    const nameT = S.text('', { size: 0.3, face: 'front', weight: 800, color: '#A4462A' }); // the name sits inside the board, top left, where no curve goes
    nameT.position.set(gx(-1.75), gy(2.55), -0.21); nameT.userData.noFit = true; S.add(nameT);
    function drawCurve() {
      if (curve) { S.root.remove(curve); curve.geometry.dispose(); }
      const A = ACTS[st.act], pts = [];
      for (let k = 0; k <= 120; k++) { const x = -3 + 6 * k / 120; pts.push(V(gx(x), gy(Math.max(-1.2, Math.min(3, A.f(x)))), -0.12)); }
      curve = P.tube(pts, 0.04, '#A4462A', { straight: st.act === 'Step' || st.act === 'ReLU' || st.act === 'None' }); curve.userData.noFit = true; S.add(curve);
      nameT.userData.set(st.act === 'None' ? 'No activation' : st.act);
      drawBead();
    }
    function drawBead() {
      const A = ACTS[st.act], y = A.f(st.x), d = A.d(st.x);
      bead.position.set(gx(st.x), gy(Math.max(-1.2, Math.min(3, y))), -0.1);
      slope.position.copy(bead.position); slope.rotation.z = Math.atan(d * (BH / 4.2) / ((BW / 2 - 0.15) / 3));
    }
    /* ---------- right: the rainfall fit ---------- */
    const RX = 2.3, RW = 4.2, RH = 3.2;
    const boardR = P.box(RW + 0.3, RH + 0.3, 0.12, '#FBF8F0', { r: 0.05, m: { emissive: '#8A867A' } }); boardR.position.set(RX, 0, -0.3); S.add(boardR);
    const rx = m => RX - RW / 2 + 0.3 + m / 11 * (RW - 0.6), ry = mm => 0.3 + mm / 340 * (RH - 0.5);
    RAIN.forEach((mm, m) => {
      const b = P.box(0.2, ry(mm) - 0.3, 0.12, C.teal, { r: 0.03 }); b.position.set(rx(m), 0.3, -0.18); S.add(b);
      const t = S.text(MONTHS[m], { size: 0.14, face: 'front', weight: 650, color: '#6B6656' }); t.position.set(rx(m), 0.17, -0.21); S.add(t);
    });
    const rt = S.text('Lagos rainfall, month by month', { size: 0.16, face: 'front', weight: 700, color: '#3C3828' }); rt.position.set(RX, RH + 0.2, -0.21); rt.userData.noFit = true; S.add(rt);
    let fitLine = null;
    // the network: 1 input → H hidden (with the activation) → 1 output, trained with Adam on all twelve months
    const xs = RAIN.map((_, m) => m / 11 * 2 - 1), ys = RAIN.map(v => v / 315);
    function newNet() {
      let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
      const H = st.hidden, p = { w1: [], b1: [], w2: [], b2: 0 };
      for (let i = 0; i < H; i++) { p.w1.push(r() * 3); p.b1.push(r() * 2); p.w2.push(r() * 0.5); }
      const flat = () => [...p.w1, ...p.b1, ...p.w2, p.b2];
      return { p, m: new Float64Array(flat().length), v: new Float64Array(flat().length), t: 0 };
    }
    const fwd = (net, x) => { const A = ACTS[st.act].f, p = net.p; let o = p.b2; for (let i = 0; i < p.w1.length; i++) o += p.w2[i] * A(p.w1[i] * x + p.b1[i]); return o; };
    function trainStep(net) {
      const A = ACTS[st.act], p = net.p, H = p.w1.length, g = new Float64Array(3 * H + 1);
      xs.forEach((x, k) => {
        const z = p.w1.map((w, i) => w * x + p.b1[i]), a = z.map(A.f);
        let o = p.b2; for (let i = 0; i < H; i++) o += p.w2[i] * a[i];
        const e = 2 * (o - ys[k]) / xs.length;
        for (let i = 0; i < H; i++) { const da = e * p.w2[i] * (st.act === 'Step' ? 0 : A.d(z[i])); g[i] += da * x; g[H + i] += da; g[2 * H + i] += e * a[i]; }
        g[3 * H] += e;
      });
      net.t++; const lr = 0.03, b1 = 0.9, b2 = 0.999;
      const params = [...p.w1, ...p.b1, ...p.w2, p.b2];
      for (let j = 0; j < g.length; j++) {
        net.m[j] = b1 * net.m[j] + (1 - b1) * g[j]; net.v[j] = b2 * net.v[j] + (1 - b2) * g[j] * g[j];
        params[j] -= lr * (net.m[j] / (1 - b1 ** net.t)) / (Math.sqrt(net.v[j] / (1 - b2 ** net.t)) + 1e-8);
      }
      p.w1 = params.slice(0, H); p.b1 = params.slice(H, 2 * H); p.w2 = params.slice(2 * H, 3 * H); p.b2 = params[3 * H];
    }
    const lossOf = net => xs.reduce((s, x, k) => s + (fwd(net, x) - ys[k]) ** 2, 0) / xs.length;
    function drawFit() {
      if (fitLine) { S.root.remove(fitLine); fitLine.geometry.dispose(); }
      const pts = [];
      for (let k = 0; k <= 80; k++) { const x = -1 + 2 * k / 80; const mm = Math.max(-20, Math.min(360, fwd(st.net, x) * 315)); pts.push(V(rx((x + 1) / 2 * 11), ry(mm), -0.04)); }
      fitLine = P.tube(pts, 0.045, C.coral, { straight: true }); fitLine.userData.noFit = true; S.add(fitLine);
    }
    function refit() { st.net = newNet(); st.iters = 0; st.fitting = true; drawFit(); }
    drawCurve(); refit();
    function update(dt) {
      if (!st.fitting) return;
      const n = S.lite ? 60 : 120;
      for (let k = 0; k < n; k++) trainStep(st.net);
      st.iters += n;
      if (st.iters >= 4000) st.fitting = false;
      drawFit();
    }
    const controls = [
      { type: 'buttons', label: 'Activation', options: NAMES.map(n => n === 'None' ? 'None' : n), get: () => NAMES.indexOf(st.act), act: i => { st.act = NAMES[i]; drawCurve(); refit(); } },
      { type: 'slider', label: 'Input to one neuron', min: -3, max: 3, step: 0.05, get: () => st.x, set: v => { st.x = v; drawBead(); } },
      { type: 'slider', label: 'Hidden neurons', min: 1, max: 10, step: 1, get: () => st.hidden, set: v => { st.hidden = v; refit(); } },
      { type: 'button', label: 'Fit again', act: refit },
    ];
    const readouts = [
      { label: 'Out', get: () => ({ v: ACTS[st.act].f(st.x).toFixed(2), sub: `slope ${ACTS[st.act].d(st.x).toFixed(2)}` }) },
      { label: 'Fit error', get: () => { const l = lossOf(st.net); return { v: l.toFixed(3), bar: Math.min(1, l / 0.12), good: l < 0.01, bad: st.act === 'None' || st.act === 'Step' }; }, bar: true },
    ];
    const labels = [
      { name: 'curve', t: 'The bend', d: 'What the neuron does to its total', icon: 'wave', at: () => bead.position.clone().add(V(0, 0.15, 0)) },
      { name: 'fit', t: 'The network\'s curve', d: 'Many bent neurons added together', icon: 'spark', at: () => V(rx(5), ry(Math.max(-20, Math.min(360, fwd(st.net, -1 + 2 * 5 / 11) * 315))), 0) },
      { name: 'rain', t: 'Two rainy seasons', d: 'June and October peaks', icon: 'info', atV: V(rx(9), ry(157) + 0.05, -0.1) },
    ];
    const breaks = [
      { label: 'Take the bend away', hint: 'No activation function', on: () => { st.act = 'None'; drawCurve(); refit(); }, off: () => { st.act = 'ReLU'; drawCurve(); refit(); } },
      { label: 'Only one neuron', hint: 'One bend for a two-peaked year', on: () => { st.hidden = 1; refit(); }, off: () => { st.hidden = 6; refit(); } },
      { label: 'A hard step', hint: 'No slope for learning to follow', on: () => { st.act = 'Step'; drawCurve(); refit(); }, off: () => { st.act = 'ReLU'; drawCurve(); refit(); } },
    ];
    function status() {
      const l = lossOf(st.net);
      if (st.fitting) return { msg: `<b>Fitting:</b> ${st.hidden} ${st.act === 'None' ? 'straight' : st.act} neuron${st.hidden > 1 ? 's' : ''} learning the shape of the year. Error ${l.toFixed(3)}.` };
      if (st.act === 'None') return { ok: false, msg: `<b>Only a straight line.</b> Without a bend, every neuron is a straight line, and adding straight lines gives another straight line. ${st.hidden} neurons or a thousand: the same.` };
      if (st.act === 'Step') return { ok: false, msg: `<b>Stuck.</b> A step is flat everywhere, so its slope is zero and the blame can't flow back. Learning needs a slope to follow. That's why sigmoid replaced the step.` };
      if (st.hidden === 1) return { ok: false, msg: `<b>One bend is not enough.</b> One neuron gives one bend, and the year has two rainy seasons. Add neurons.` };
      if (l < 0.01) return { ok: true, msg: `<b>Both rainy seasons.</b> ${st.hidden} bent ${st.act} neurons, added together, draw the shape. Error ${l.toFixed(3)}.` };
      return { msg: `<b>Close, not exact.</b> Error ${l.toFixed(3)}. Try more neurons or another activation.` };
    }
    return { update, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { act: 'ReLU', x: 1, hidden: 6 }); drawCurve(); refit(); },
      set: p => { Object.assign(st, p); drawCurve(); refit(); }, slide: x => { st.x = x; drawBead(); } };
  },

  story: [
    { t: 'The bend', focus: 'curve', zoom: 1.4, say: 'After a neuron adds up its inputs, it bends the total. This bend is ReLU: anything below zero becomes zero, anything above passes straight through.', act: m => { m.set({ act: 'ReLU', hidden: 6 }); m.slide(-1.5); } },
    { t: 'Many shapes of bend', focus: 'curve', zoom: 1.4, say: 'Sigmoid squashes everything to between zero and one. GELU, used in today\'s language models, is a soft ReLU.', act: m => { m.set({ act: 'Sigmoid', hidden: 6 }); m.slide(1); } },
    { t: 'Lagos rainfall', focus: 'rain', zoom: 1.2, say: 'Lagos has two rainy seasons, peaking in June and again in October. Can a network learn that shape from twelve months?' },
    { t: 'Bends add up', home: true, say: 'Six neurons, each with one bend, added together. Watch the curve wriggle into both seasons.', act: m => m.set({ act: 'ReLU', hidden: 6 }), wait: 6 },
    { t: 'No bend, no shape', home: true, say: 'Now take the bend away. Every neuron is a straight line, and straight lines added up are still a straight line. A thousand layers would not help.', act: m => m.set({ act: 'None' }), wait: 5 },
    { t: 'Why it matters', home: true, say: 'That small bend is what lets deep networks learn faces, voices and language. Without it, deep learning would just be one straight line.', act: m => m.set({ act: 'GELU', hidden: 8 }) },
  ],
  check: [
    { q: 'What happens if you stack layers with no activation function?', options: ['They can learn any shape', 'It all collapses to one straight line', 'Training gets faster and better'], answer: 1, why: 'Straight lines combined give a straight line. The bend is what adds power.' },
    { q: 'What does ReLU do?', options: ['Turns negative totals into zero and keeps positive ones', 'Squashes everything to between 0 and 1', 'Doubles the input'], answer: 0, why: 'ReLU is max(0, x): simple, fast, and the default in most networks.' },
    { q: 'Why is a hard step a bad activation for learning?', options: ['It is too slow', 'Its slope is zero, so the blame can\'t flow back', 'It only works on images'], answer: 1, why: 'Backpropagation follows slopes. A flat step gives it nothing to follow.' },
  ],
  terms: [
    ['Activation function', 'The bend a neuron applies to its total before passing it on.'],
    ['ReLU', 'max(0, x). The most common choice.'],
    ['Sigmoid', 'An S-curve from 0 to 1. Good for yes-or-no answers.'],
    ['GELU', 'A smooth ReLU, used in GPT-style language models.'],
    ['Non-linear', 'Not a straight line. The source of a network\'s power.'],
  ],
  deeper: '<p>Sigmoid and tanh flatten out at both ends, so their slope gets tiny and the blame fades as it flows back through many layers: the <b>vanishing gradient</b>. ReLU keeps a slope of 1 for positive numbers, which is a big reason deep networks became trainable around 2012.</p>',
  code: {
    title: 'Activation functions in Python',
    note: 'Each one with its slope, which backpropagation needs.',
    text: `
import math

def relu(x):        return max(0.0, x)
def relu_slope(x):  return 1.0 if x > 0 else 0.0

def sigmoid(x):     return 1 / (1 + math.exp(-x))
def sigmoid_slope(x):
    s = sigmoid(x)
    return s * (1 - s)

def gelu(x):
    # the smooth ReLU used in GPT-style models
    return 0.5 * x * (1 + math.tanh(0.79788 * (x + 0.044715 * x**3)))

# a neuron: weighted sum, then the bend
def neuron(inputs, weights, bias, act=relu):
    total = sum(w * x for w, x in zip(weights, inputs)) + bias
    return act(total)
`,
  },
};
