// Build it yourself: OCR (after 500 Lines, Optical Character Recognition). An Asmara post office reads digits on parcels. Real 5x5 digit bitmaps, noise, and a real small neural net trained by gradient descent; accuracy on noisy copies is counted. Pixels show the sample being read.
const G = { 0: '01110 10001 10001 10001 01110', 1: '00100 01100 00100 00100 01110', 2: '11110 00001 01110 10000 11111', 3: '11110 00001 00110 00001 11110', 7: '11111 00001 00010 00100 00100', 8: '01110 10001 01110 10001 01110' };
const KEYS = Object.keys(G), bits = k => G[k].replace(/ /g, '').split('').map(Number);
const rnd = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const noisy = (b, p, r) => b.map(v => (r() < p ? 1 - v : v));
function train(o) {
  const r = rnd(5), H = o.hid, O = KEYS.length, W1 = Array.from({ length: H }, () => Array.from({ length: 26 }, () => (r() - 0.5) * 0.6)), W2 = Array.from({ length: O }, () => Array.from({ length: H + 1 }, () => (r() - 0.5) * 0.6));
  const sig = x => 1 / (1 + Math.exp(-x)), fwd = x => { const a = [...x, 1], h = W1.map(w => sig(w.reduce((s, v, i) => s + v * a[i], 0))), hh = [...h, 1], y = W2.map(w => sig(w.reduce((s, v, i) => s + v * hh[i], 0))); return { a, h, hh, y }; };
  for (let e = 0; e < o.epochs; e++) KEYS.forEach((k, t) => { const f = fwd(noisy(bits(k), o.trainNoise, r)), err = f.y.map((v, i) => (i === t ? 1 : 0) - v), dy = err.map((e2, i) => e2 * f.y[i] * (1 - f.y[i])); W2.forEach((w, i) => w.forEach((_, j) => { w[j] += o.lr * dy[i] * f.hh[j]; })); W1.forEach((w, h) => { const g = W2.reduce((s, w2, i) => s + dy[i] * w2[h], 0) * f.h[h] * (1 - f.h[h]); w.forEach((_, j) => { w[j] += o.lr * g * f.a[j]; }); }); });
  return fwd;
}
const MEMO = {};
function run(o) {
  const key = JSON.stringify([o.hid, o.epochs, o.trainNoise, o.lr]), fwd = MEMO[key] || (MEMO[key] = train(o)), r = rnd(99); let good = 0, n = 0;
  KEYS.forEach((k, t) => { for (let i = 0; i < 20; i++) { const y = fwd(noisy(bits(k), o.noise, r)).y; if (y.indexOf(Math.max(...y)) === t) good++; n++; } });
  const smp = noisy(bits(KEYS[o.d]), o.noise, rnd(7 + o.d)), y = fwd(smp).y, top = y.indexOf(Math.max(...y));
  return { acc: good / n, smp, guess: KEYS[top], conf: y[top], y, truth: KEYS[o.d], right: KEYS[top] === KEYS[o.d] };
}

export default {
  slug: 'build-an-ocr',
  title: 'Build your own OCR',
  description: 'Pixels in, a digit out. Train a tiny network on clean shapes, then see what noise does to it.',
  overview: 'To read a digit, a program sees only a grid of pixels. A small network takes those pixels as inputs, passes them through a hidden layer, and gives one output per digit. Training shows it examples and nudges its weights by backpropagation, until the right output is the largest. What matters is how it handles what it hasn\'t seen, so test it on smudged copies, not on the shapes it learned. Too few rounds, and it hasn\'t learned yet. Too few hidden units, and it can\'t hold the shapes. Past a certain smudge, nothing helps much. On shapes this small, training on noisy copies barely changes the score, and this lesson shows that rather than hide it. This real network trains in your browser on five by five digits, for a post office in Asmara.',
  keywords: ['OCR', 'neural network', 'backpropagation', 'digits', 'noise', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.85, 1.05], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { hid: 10, epochs: 300, trainNoise: 0.08, lr: 0.5, noise: 0.1, d: 0 }, st = { ...D0 };
    const ON = '#2B2A28', OFF = '#F4F1EA', GOOD = '#1F9E89', BLUE = '#5B8DB8', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const Px = Array.from({ length: 25 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.21, 0.08, 0.21, '#fff', { r: 0.01, material: m }); b.position.set(-1.95 + (i % 5) * 0.24, 0.03, -0.55 + Math.floor(i / 5) * 0.24); S.add(b); return m; });
    const T = KEYS.map((k, i) => { const t = add(P.tower(0.38, 0.4, BLUE)); t.position.set(-0.3 + i * 0.5, 0.03, -0.05); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.2, 2.45, 1.1, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); Px.forEach((m, i) => m.color.set(R.smp[i] ? ON : OFF)); T.forEach((t, i) => t.userData.set({ h: Math.max(0.03, R.y[i] * 1.05), color: KEYS[i] === R.guess ? (R.right ? GOOD : RED) : BLUE })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Digit', options: KEYS, get: () => st.d, act: i => set({ d: i }) },
      { type: 'slider', label: 'Noise when reading', min: 0, max: 0.3, step: 0.02, get: () => st.noise, set: v => set({ noise: v }) },
      { type: 'buttons', label: 'Hidden units', options: ['2', '10'], get: () => (st.hid === 2 ? 0 : 1), act: i => set({ hid: [2, 10][i] }) },
      { type: 'buttons', label: 'Training rounds', options: ['15', '300'], get: () => (st.epochs === 15 ? 0 : 1), act: i => set({ epochs: [15, 300][i] }) },
      { type: 'toggle', label: 'Train on noisy copies', short: 'Noisy', get: () => st.trainNoise > 0, set: v => set({ trainNoise: v ? 0.08 : 0 }) },
    ];
    const readouts = [
      { label: 'Read as', get: () => ({ v: R.guess, sub: `true digit ${R.truth}`, good: R.right, bad: !R.right }) },
      { label: 'Accuracy', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: '120 noisy samples', good: R.acc > 0.85, bad: R.acc < 0.7 }) },
      { label: 'Confidence', get: () => ({ v: `${Math.round(R.conf * 100)}%` }) },
    ];
    const labels = [
      { name: 'p', t: 'Five by five pixels', d: 'What the network sees', icon: 'eye', atV: V(-2.1, 0.08, -0.1) },
      { name: 'o', t: 'One output per digit', d: 'Tallest wins', icon: 'scale', atV: V(2.25, 0.2, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Too little training', hint: 'fifteen rounds', on: () => set({ ...D0, epochs: 15 }), off: reset },
      { label: 'A heavy smudge', hint: 'three pixels in ten flipped', on: () => set({ ...D0, noise: 0.3 }), off: reset },
      { label: 'Two hidden units', hint: 'too small', on: () => set({ ...D0, hid: 2 }), off: reset },
    ];
    function status() {
      if (st.hid === 2) return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% accurate.</b> Two hidden units can\'t tell six shapes apart.` };
      if (st.epochs < 50) return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% accurate.</b> After fifteen rounds, the weights have hardly moved.` };
      if (st.noise >= 0.26) return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% accurate.</b> With this many pixels flipped, digits start to look like each other.` };
      if (!R.right) return { ok: false, msg: `<b>Read ${R.guess}, and it was ${R.truth}.</b> At this noise, ${Math.round(R.acc * 100)}% still come through. Check the total, not one sample.` };
      return { ok: true, msg: `<b>Read ${R.guess}, and ${Math.round(R.acc * 100)}% right across 120 noisy samples.</b>` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Only pixels', home: true, say: 'A post office in Asmara reads digits on parcels. A program sees only a grid of pixels.', act: m => m.set({ d: 0, noise: 0, hid: 10, trainNoise: 0.08, epochs: 300 }) },
    { t: 'Inputs and outputs', home: true, say: 'Each pixel is an input. There is one output per digit.', act: m => m.set({ d: 2, noise: 0, hid: 10, trainNoise: 0.08, epochs: 300 }) },
    { t: 'Training', home: true, say: 'Show an example, and nudge the weights until the right output is largest.', act: m => m.set({ d: 3, noise: 0.06, hid: 10, trainNoise: 0.08, epochs: 300 }) },
    { t: 'Too soon', home: true, say: 'Stop too early, and the weights have hardly moved.', act: m => m.set({ d: 3, noise: 0.06, hid: 10, trainNoise: 0.08, epochs: 15 }) },
    { t: 'A smudge', home: true, say: 'Test on smudged copies. A heavy smudge makes digits look alike.', act: m => m.set({ d: 3, noise: 0.3, hid: 10, trainNoise: 0.08, epochs: 300 }) },
    { t: 'Too small', home: true, say: 'Too few hidden units, and it can\'t hold the shapes.', act: m => m.set({ d: 5, noise: 0.1, hid: 2, trainNoise: 0.08, epochs: 300 }) },
  ],
  check: [
    { q: 'What are the inputs?', options: ['The pixels', 'The digits', 'The weights'], answer: 0, why: 'A program sees only those.', hint: 'See Only pixels.' },
    { q: 'What should you test on?', options: ['Smudged copies it hasn\'t seen', 'The training shapes', 'Blank pages'], answer: 0, why: 'Real input isn\'t perfect.', hint: 'See A smudge.' },
    { q: 'What happens with too few hidden units?', options: ['It can\'t hold the shapes', 'It trains forever', 'It needs more pixels'], answer: 0, why: 'Not enough capacity.', hint: 'Try Two hidden units.' },
  ],
  terms: [['Hidden layer', 'Units between input and output.'], ['Backpropagation', 'Finding how to nudge weights.'], ['Noise', 'Random changes to input.'], ['Generalise', 'Cope with new examples.']],
  deeper: '<p><b>Real training.</b> This network really trains in your browser, and accuracy is counted on 120 noisy samples.</p><p><b>Larger.</b> Real OCR uses convolution, and finds characters first.</p>',
  credit: 'Built from <a href="http://aosabook.org/en/500L/optical-character-recognition-ocr.html" target="_blank" rel="noopener">Optical Character Recognition (OCR)</a> by Marina Samuel (text CC BY, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small network, written for this lesson.',
  code: {
    title: 'One training step',
    note: 'Our own short version.',
    text: `
const { hidden, output } = forward(pixels);
output.forEach((y, i) => {
  const error = (i === digit ? 1 : 0) - y;
  const delta = error * y * (1 - y);
  outWeights[i] = add(outWeights[i], scale(hidden, rate * delta));
});
`,
  },
};
