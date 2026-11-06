// Convolutions: a 3×3 kernel slides over an adire-pattern picture made of pillars (height = brightness)
// and builds a new picture. Edge, blur, sharpen, outline. Break it: a blur that forgets to divide, a random kernel.
const N = 12, K = 3, M = N - K + 1;
// an adire-style motif: a ring of circles in the middle, stripes in the corners
const IMG = Array.from({ length: N }, (_, j) => Array.from({ length: N }, (_, i) => {
  const r = Math.hypot(i - 5.5, j - 5.5);
  const ring = r < 1.6 ? 1 : r > 3 && r < 4.2 ? 1 : 0;
  const stripe = (i + j) % 3 === 0 && r > 5 ? 1 : 0;
  return Math.max(ring, stripe) ? 0.95 : 0.12;
}));
const KERNELS = {
  'Vertical edges': [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  'Horizontal edges': [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  Blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9)),
  Sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  Outline: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
};
const KN = Object.keys(KERNELS);

export default {
  slug: 'convolutions',
  title: 'Convolutions',
  description: 'Slide a 3×3 window over an adire pattern built from pillars. Each stop multiplies nine numbers and adds them up. Edges, blur and sharpening fall out of that one move, and it is how computers see.',
  overview: 'A picture is a grid of numbers: how bright each pixel is. A convolution slides a small grid of weights (the kernel) across it. At each stop it multiplies the nine pixels under the window by the nine weights and adds them up into one new pixel. Pick a kernel and watch edges appear.',
  keywords: ['convolution explained', 'cnn kernel', 'image filters', 'edge detection', 'computer vision basics'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0.2], dir: [0.15, 1.25, 1.05], half: 3.4, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const cell = 0.3, HMAX = 0.9;
    const inX = -2.35, outX = 2.55;
    const st = { k: 'Vertical edges', pos: 0, auto: true, speed: 1, img: IMG.map(r => r.slice()), noDiv: false, random: null, done: false };
    const kernel = () => st.random || (st.noDiv && st.k === 'Blur' ? KERNELS.Blur.map(r => r.map(() => 1)) : KERNELS[st.k]);
    /* ---------- the picture and the result, as pillars ---------- */
    const gin = P.grid(N, N, cell, { h: 0.1, gap: 0.03 }); gin.mesh.position.set(inX, 0, 0); S.add(gin.mesh);
    const gout = P.grid(M, M, cell, { h: 0.05, gap: 0.03 }); gout.mesh.position.set(outX, 0, 0); S.add(gout.mesh);
    const ink = new THREE.Color('#2A2440'), cloth = new THREE.Color('#E9E4F5'), pos = new THREE.Color(C.teal), neg = new THREE.Color(C.coral), blank = new THREE.Color('#D9D6CC'), tmp = new THREE.Color();
    function drawIn() {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = st.img[j][i]; gin.set(i, j, { h: 0.06 + v * HMAX, color: tmp.copy(ink).lerp(cloth, v) }); }
      gin.commit();
    }
    const conv = (i, j) => { const k = kernel(); let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += st.img[j + a][i + b] * k[a][b]; return s; };
    let outVals = [];
    function drawOut() {
      outVals = [];
      for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
        const idx = j * M + i, on = idx <= st.pos || st.done, v = conv(i, j); outVals.push(v);
        if (!on) { gout.set(i, j, { h: 0.04, color: blank }); continue; }
        const mag = Math.min(1.6, Math.abs(v));
        gout.set(i, j, { h: 0.05 + mag / 1.6 * HMAX * 1.4, color: tmp.copy(blank).lerp(v >= 0 ? pos : neg, Math.min(1, 0.25 + mag)) });
      }
      gout.commit();
    }
    /* ---------- the sliding window ---------- */
    const frame = new THREE.Group(); frame.userData.noFit = true; S.add(frame);
    const fw = cell * K;
    for (const [x, z, w, d] of [[0, -fw / 2, fw + 0.06, 0.05], [0, fw / 2, fw + 0.06, 0.05], [-fw / 2, 0, 0.05, fw], [fw / 2, 0, 0.05, fw]]) { const b = P.box(w, 0.06, d, C.gold, { r: 0, m: { emissive: '#7A5200' } }); b.position.set(x, 0, z); frame.add(b); }
    const target = new THREE.Group(); target.userData.noFit = true; S.add(target);
    for (const [x, z, w, d] of [[0, -cell / 2, cell + 0.05, 0.04], [0, cell / 2, cell + 0.05, 0.04], [-cell / 2, 0, 0.04, cell], [cell / 2, 0, 0.04, cell]]) { const b = P.box(w, 0.05, d, C.gold, { r: 0, m: { emissive: '#7A5200' } }); b.position.set(x, 0, z); target.add(b); }
    const beam = P.rod(V(), V(0, 1, 0), 0.018, C.gold); beam.layers.set(1); beam.userData.noFit = true; S.add(beam);
    /* ---------- the kernel: nine weights, floating above the middle ---------- */
    const kGroup = new THREE.Group(); kGroup.position.set(0.15, 0, -1.95); S.add(kGroup);
    const kTiles = [];
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
      const t = P.box(0.4, 0.12, 0.4, '#F7F5EE', { r: 0.06 }); t.position.set((b - 1) * 0.46, 0, (a - 1) * 0.46); kGroup.add(t);
      const tx = S.text('', { size: 0.15, color: C.ink, weight: 700, font: '"JetBrains Mono", monospace' }); tx.position.set((b - 1) * 0.46, 0.13, (a - 1) * 0.46); kGroup.add(tx);
      kTiles.push({ t, tx });
    }
    // the kernel's name floats above it as a chip, so the pillars never hide it
    const kName = S.text('', { size: 0.17, face: 'cam', weight: 750, bg: 'rgba(255,255,255,.9)', color: C.ink }); kName.position.set(0.15, 0.75, -1.95 - 0.75); kName.userData.noFit = true; S.add(kName);
    const sumT = S.text('', { size: 0.17, face: 'cam', weight: 700, bg: 'rgba(255,255,255,.94)', color: C.ink, order: 6, depthTest: false }); sumT.userData.noFit = true; S.add(sumT);
    const fmtK = v => Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : Math.abs(v - 1 / 9) < 1e-6 ? '1/9' : v.toFixed(1);
    function drawKernel() {
      const k = kernel();
      kTiles.forEach((o, n) => { const v = k[Math.floor(n / 3)][n % 3]; o.tx.userData.set(fmtK(v)); o.t.material = P.mat(v > 0.001 ? '#CDEAE7' : v < -0.001 ? '#F8D3CE' : '#F7F5EE'); });
      kName.userData.set(st.random ? 'Random weights' : st.noDiv && st.k === 'Blur' ? 'Blur that forgot ÷9' : st.k);
    }
    function placeWindow() {
      const p = Math.min(st.pos, M * M - 1), i = p % M, j = Math.floor(p / M);
      const top = Math.max(...[0, 1, 2].flatMap(a => [0, 1, 2].map(b => st.img[j + a][i + b]))) * HMAX + 0.12;
      frame.position.set(inX - N * cell / 2 + (i + 1.5) * cell, top, -N * cell / 2 + (j + 1.5) * cell);
      const oh = gout.heights[j * M + i];
      target.position.set(outX - M * cell / 2 + (i + 0.5) * cell, oh + 0.04, -M * cell / 2 + (j + 0.5) * cell);
      P.setRod(beam, frame.position.clone(), target.position.clone());
      sumT.position.copy(target.position).add(V(0, 0.45, 0));
      sumT.userData.set(`= ${conv(i, j).toFixed(2)}`);
      frame.visible = target.visible = beam.visible = sumT.visible = !st.done;
    }
    drawIn(); drawKernel(); drawOut(); placeWindow();
    // tap a pillar of the picture to flip it light or dark
    S.tap(gin.mesh, hit => { const k = hit.instanceId; if (k == null) return; const i = k % N, j = Math.floor(k / N); st.img[j][i] = st.img[j][i] > 0.5 ? 0.12 : 0.95; drawIn(); drawOut(); placeWindow(); });
    let acc = 0;
    function update(dt) {
      if (!st.auto || st.done) return;
      acc += dt * st.speed;
      const every = 0.14;
      let moved = false;
      while (acc > every) { acc -= every; st.pos++; moved = true; if (st.pos >= M * M) { st.done = true; st.auto = false; break; } }
      if (moved) { drawOut(); placeWindow(); S.sync(); }
    }
    const restart = () => { st.pos = 0; st.done = false; st.auto = true; drawKernel(); drawOut(); placeWindow(); };
    const controls = [
      { type: 'buttons', label: 'Kernel', options: ['Vertical', 'Horizontal', 'Blur', 'Sharpen', 'Outline'], get: () => st.random ? -1 : KN.indexOf(st.k), act: i => { st.k = KN[i]; st.random = null; restart(); } },
      { type: 'toggle', label: 'Slide', get: () => st.auto, set: v => { if (v && st.done) restart(); else st.auto = v; } },
      { type: 'button', label: 'Finish it', act: () => { st.done = true; st.auto = false; st.pos = M * M; drawOut(); placeWindow(); } },
      { type: 'slider', label: 'Speed', min: 0.25, max: 6, step: 0.25, get: () => st.speed, set: v => { st.speed = v; }, fmt: v => `${v}×` },
      { type: 'button', label: 'Start again', act: restart, quick: false },
    ];
    const range = () => { const a = outVals.slice(0, st.done ? outVals.length : st.pos + 1); return [Math.min(...a), Math.max(...a)]; };
    const readouts = [
      { label: 'Window', get: () => ({ v: st.done ? 'done' : `${st.pos + 1} / ${M * M}`, sub: '9 multiplies, 1 sum' }) },
      { label: 'Out range', get: () => { const [a, b] = range(); const big = Math.max(Math.abs(a), Math.abs(b)) > 3; return { v: `${a.toFixed(1)} … ${b.toFixed(1)}`, bad: big }; } },
    ];
    const labels = [
      { name: 'picture', t: 'The picture', d: 'Taller pillar, brighter pixel. Tap to paint', icon: 'box', atV: V(inX - N * cell / 2 + 0.3, HMAX + 0.1, N * cell / 2 - 0.3) },
      { name: 'window', t: 'The window', d: 'Nine pixels under the kernel', icon: 'target', at: () => frame.position.clone().add(V(0, 0.1, 0)), hide: () => st.done },
      { name: 'kernel', t: 'The kernel', d: 'Nine weights: what to look for', icon: 'spark', atV: V(0.15 + 0.7, 0.12, -1.95) },   // the kernel's right edge, off its numbers
      { name: 'result', t: 'The new picture', d: 'Teal: positive. Coral: negative', icon: 'eye', atV: V(outX + M * cell / 2 - 0.3, 0.6, M * cell / 2 - 0.3) },
    ];
    const breaks = [
      { label: 'A blur that forgets to divide', hint: 'Nine 1s instead of nine 1/9s', on: () => { st.k = 'Blur'; st.noDiv = true; st.random = null; restart(); }, off: () => { st.noDiv = false; restart(); } },
      { label: 'Random weights', hint: 'A kernel nobody trained', on: () => { let s = 5; st.random = [0, 1, 2].map(() => [0, 1, 2].map(() => +((((s = (s * 16807) % 2147483647) / 2147483647) * 4 - 2).toFixed(1)))); restart(); }, off: () => { st.random = null; restart(); } },
    ];
    function status() {
      const [a, b] = range();
      if (st.noDiv && st.k === 'Blur') return { ok: false, msg: `<b>Far too bright.</b> Nine weights of 1 add up nine pixels, so a bright area becomes ${b.toFixed(1)} instead of about 1. A blur must divide by nine to keep brightness the same.` };
      if (st.random) return { ok: false, msg: `<b>Noise.</b> Random weights look for nothing in particular, so the result is a scramble. A trained network learns its kernels, starting from random ones like these.` };
      if (!st.done) return { msg: `<b>Window ${st.pos + 1}:</b> multiply the nine pixels by the nine weights, add them up: ${conv(st.pos % M, Math.floor(st.pos / M)).toFixed(2)}. That's one new pixel.` };
      const d = { 'Vertical edges': 'Only the left and right edges of each shape light up: teal where it gets brighter, coral where it gets darker.', 'Horizontal edges': 'Now only the top and bottom edges show.', Blur: 'Each new pixel is the average of nine, so edges soften.', Sharpen: 'The middle counts five times and the neighbours subtract: edges get crisper.', Outline: 'Flat areas cancel to zero; only the outlines stay.' }[st.k];
      return { ok: true, msg: `<b>${st.k}.</b> ${d} Tap the picture to paint your own.` };
    }
    return { update, controls, readouts, labels, breaks, status,
      reset: () => { st.k = 'Vertical edges'; st.random = null; st.noDiv = false; st.speed = 1; restart(); },
      use: (k, speed) => { st.k = k; st.random = null; st.noDiv = false; if (speed) st.speed = speed; restart(); },
      finish: () => controls[2].act() };
  },

  story: [
    { t: 'A picture is numbers', home: true, say: 'This adire pattern is a picture made of numbers. Each pillar is one pixel. Tall and pale means bright, short and dark means dark.' },
    { t: 'The kernel', focus: 'kernel', zoom: 1.2, say: 'The kernel is nine weights. This one is negative on the left and positive on the right. It looks for places where the picture gets brighter from left to right.', act: m => m.use('Vertical edges', 0.5) },
    { t: 'Slide and multiply', focus: 'window', zoom: 1.15, say: 'The window sits on nine pixels. Multiply each by its weight, add the nine answers, and you get one pixel of the new picture. Then slide one step and do it again.', wait: 6 },
    { t: 'Edges appear', home: true, say: 'Where the picture is flat, the left and right cancel out to zero. At an edge they don\'t, and the new picture lights up. That is an edge detector.', act: m => m.use('Vertical edges', 6), wait: 6 },
    { t: 'Other kernels', home: true, say: 'Change the nine weights and you get a new tool. All ones divided by nine blurs. A big middle with negative neighbours finds outlines.', act: m => m.use('Outline', 6), wait: 6 },
    { t: 'How computers see', home: true, say: 'A vision network stacks hundreds of these, and learns the weights itself. Early kernels find edges, later ones find shapes, and the last ones find faces, cassava leaves or road signs.' },
  ],
  check: [
    { q: 'At each stop, what does the kernel do?', options: ['Copies the middle pixel', 'Multiplies nine pixels by nine weights and adds them up', 'Picks the brightest pixel'], answer: 1, why: 'Multiply and add: one number for the new picture, then slide one step.' },
    { q: 'Why does an edge kernel give zero on a flat area?', options: ['Its weights cancel out when every pixel is the same', 'It skips flat areas', 'Flat areas are black'], answer: 0, why: 'The weights add up to zero, so equal pixels cancel. Only a change in brightness survives.' },
    { q: 'A blur kernel of nine 1s (not divided by nine) makes the picture…', options: ['Sharper', 'About nine times too bright', 'Unchanged'], answer: 1, why: 'Adding nine pixels without dividing multiplies the brightness by about nine.' },
  ],
  terms: [
    ['Pixel', 'One dot of a picture: a number for its brightness (three numbers for colour).'],
    ['Kernel (filter)', 'A small grid of weights that slides over the picture.'],
    ['Convolution', 'Sliding the kernel, multiplying and adding at every stop.'],
    ['Feature map', 'The new picture a kernel makes: where its pattern was found.'],
    ['CNN', 'A convolutional neural network: many layers of learned kernels.'],
  ],
  deeper: '<p>This picture is 12×12, so a 3×3 window fits in 10×10 places: the result is smaller. Real networks add a border of zeros (<b>padding</b>) to keep the size, and sometimes jump two pixels at a time (<b>stride</b>) to shrink it on purpose.</p><p>Colour pictures have three layers (red, green, blue), so each kernel is 3×3×3. A layer of a real network has dozens of kernels, each making its own feature map.</p>',
  code: {
    title: 'A convolution from scratch',
    note: 'Adapted from the course\'s conv2d_naive: the window slides, multiplies and adds.',
    text: `
import numpy as np

def conv2d(image, kernel):
    h, w = image.shape
    k = kernel.shape[0]
    out = np.zeros((h - k + 1, w - k + 1))
    for i in range(h - k + 1):
        for j in range(w - k + 1):
            window = image[i:i + k, j:j + k]
            out[i, j] = np.sum(window * kernel)   # nine multiplies, one sum
    return out

vertical_edges = np.array([[-1, 0, 1],
                           [-2, 0, 2],
                           [-1, 0, 1]])
blur = np.ones((3, 3)) / 9
`,
  },
};
