// CNNs from LeNet to ResNet: a cassava leaf photo goes in on the left; each slab is one layer's feature map, shrinking as pooling halves it and getting thicker as channels grow.
// The square on the leaf is the receptive field: how much of the photo one final neuron can see.
// Slab colour is the gradient that reaches it during training (teal: plenty, grey: almost none); arcs over the slabs are ResNet's skip connections.
// Break it: no pooling (each neuron sees a tiny patch), pooling after every layer (the map collapses and the spots vanish), 34 plain layers with no skips (the gradient fades and it trains worse than 18).
const IN = 64, MAXL = 34;

function design(o) {
  const L = [];
  if (o.depth === 5) { [[6, 5], [16, 5]].forEach(([c, k]) => L.push({ k, c, pool: o.pool !== 'none' })); }
  else {
    const per = o.depth === 18 ? [4, 4, 4, 4] : [8, 8, 8, 8], ch = [16, 32, 64, 128];
    per.forEach((n, s) => { for (let i = 0; i < n; i++) L.push({ k: 3, c: ch[s], pool: o.pool === 'every' || (o.pool === 'stage' && i === n - 1 && s < 3) }); });
  }
  let r = 1, j = 1, size = IN, cin = 3, params = 0, flops = 0;
  L.forEach(l => { r += (l.k - 1) * j; params += l.k * l.k * cin * l.c + l.c; flops += size * size * l.k * l.k * cin * l.c; cin = l.c; l.size = size; if (l.pool) { r += j; j *= 2; size = Math.max(1, Math.floor(size / 2)); } l.out = size; l.rf = r; });
  // illustrative gradient model: each plain layer passes on about 88% of the gradient; a skip connection carries it around the block
  const g = L.map((_, i) => { const after = L.length - 1 - i; return o.skips && o.depth > 5 ? 0.985 ** after : 0.88 ** after; });
  return { L, rf: r, params, g, final: size, flops };
}

export default {
  slug: 'cnns-lenet-to-resnet',
  title: 'CNNs: from LeNet to ResNet',
  description: 'A cassava leaf goes in on the left and passes through a row of feature maps that shrink and thicken layer by layer. The square on the leaf shows how much one final neuron can see. Stack more layers, add pooling, then take away ResNet\'s skip connections and watch the gradient fade.',
  overview: 'A convolutional network stacks small filters. Each 3×3 layer lets a neuron see a little more of the image, and pooling halves the map so the next layers see twice as far for the same cost. LeNet used two such stages to read digits. Later networks went deeper, but past about 20 plain layers training got worse, not better: the gradient fades on its way back. ResNet fixed this with skip connections that add each block\'s input to its output, giving the gradient a straight road home. That is why networks with 50, 100 or more layers train well.',
  keywords: ['cnn architecture', 'lenet to resnet', 'receptive field', 'skip connections resnet', 'pooling layers'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.75, 0], dir: [0.45, 0.6, 1.3], half: 1.9, wide: 7.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { depth: 18, skips: true, pool: 'stage' };
    const ink = '#151827';
    const base = P.box(7.8, 0.12, 2.8, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    /* ---------- the leaf ---------- */
    const LX = -3.25, LS = 1.1, LY = 0.35;
    const stand = P.box(LS + 0.2, LS + 0.45, 0.08, '#FBF8F1', { r: 0.04 }); stand.position.set(LX, 0.12, -0.1); S.add(stand);
    const leafT = S.text('cassava leaf, 64 × 64', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: LS }); leafT.position.set(LX, 0.12 + LS + 0.32, -0.055); S.add(leafT);
    const leafTop = S.text('input', { size: 0.07, weight: 800 }); leafTop.position.set(LX, 0.12 + LS + 0.455, -0.1); S.add(leafTop);
    const PX = 16, pix = new THREE.InstancedMesh(new THREE.BoxGeometry(LS / PX * 0.96, LS / PX * 0.96, 0.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), PX * PX);
    pix.userData.noFit = true; pix.layers.set(1); S.add(pix);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let j = 0; j < PX; j++) for (let i = 0; i < PX; i++) {
      const u = (i + 0.5) / PX - 0.5, v = (j + 0.5) / PX - 0.5, leaf = Math.abs(u) * 1.6 + Math.abs(v) < 0.45, spot = [[0.12, 0.1], [-0.15, -0.05], [0.05, -0.2]].some(([a, b]) => Math.hypot(u - a, v - b) < 0.06);
      dummy.position.set(LX - LS / 2 + (i + 0.5) * LS / PX, 0.12 + LY - 0.08 + (j + 0.5) * LS / PX, -0.05); dummy.updateMatrix(); pix.setMatrixAt(j * PX + i, dummy.matrix);
      pix.setColorAt(j * PX + i, col.set(leaf ? (spot ? '#7A4A22' : (Math.abs(u) < 0.03 ? '#9CC56B' : '#4E8C3A')) : '#F4EBD6'));
    }
    pix.instanceMatrix.needsUpdate = true; pix.instanceColor.needsUpdate = true;
    const rfBox = P.tube([V(), V(1, 0, 0)], 0.014, C.orange); rfBox.userData.noFit = true; S.add(rfBox);
    /* ---------- feature-map slabs ---------- */
    const X0 = -2.35, X1 = 2.9;
    const slabs = [...Array(MAXL)].map(() => { const m = new THREE.MeshLambertMaterial({ color: C.teal }); const b = P.box(1, 1, 1, C.teal, { r: 0, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const arcs = [...Array(MAXL)].map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.016, C.gold); t.userData.noFit = true; S.add(t); return t; });
    const head = P.box(0.35, 0.4, 0.5, C.plum, { r: 0.05 }); head.position.set(3.4, 0.12, 0); S.add(head);
    const headT = S.text('healthy or\nbrown streak?', { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: 0.33 }); headT.position.set(3.4, 0.33, 0.255); S.add(headT);
    const headTop = S.text('answer', { size: 0.06, weight: 800, color: '#FFFFFF' }); headTop.position.set(3.4, 0.525, 0); S.add(headTop);
    const rail = P.box(5.4, 0.04, 0.12, '#B7B2A6', { r: 0.02 }); rail.position.set((X0 + X1) / 2, 0.12, 0); S.add(rail);
    const railT = S.text('layers, from the input to the answer  →', { size: 0.075, weight: 800, face: 'front', color: ink }); railT.position.set((X0 + X1) / 2, 0.14, 0.75); S.add(railT);
    const sizeTs = [...Array(5)].map(() => { const t = S.text('', { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); t.userData.noFit = true; S.add(t); return t; });
    /* ---------- draw ---------- */
    let R = null;
    function draw() {
      R = design(st);
      const n = R.L.length, dx = (X1 - X0) / Math.max(1, n - 1);
      const grey = new THREE.Color('#9A9AA6'), teal = new THREE.Color(C.teal);
      slabs.forEach((s, i) => {
        if (i >= n) { s.b.visible = false; return; }
        const l = R.L[i], side = 0.25 + 1.0 * Math.sqrt(l.size / IN), thick = 0.03 + 0.09 * Math.log2(l.c) / 7;
        s.b.visible = true; s.b.scale.set(thick, side, side); s.b.position.set(X0 + i * dx, 0.16, 0 - 0 * side);
        s.b.position.z = 0; s.m.color.copy(grey).lerp(teal, Math.min(1, R.g[i] * 1.6));
      });
      arcs.forEach((a, i) => {
        const on = st.skips && st.depth > 5 && i % 2 === 0 && i + 2 < n + 1 && i < n - 1;
        a.visible = on; if (!on) return;
        const xa = X0 + i * dx - dx * 0.4, xb = X0 + Math.min(n - 1, i + 1) * dx + dx * 0.4, top = 0.16 + 0.25 + 1.0 * Math.sqrt(R.L[i].size / IN) + 0.08;
        a.geometry.dispose(); a.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(xa, top - 0.06, 0), V((xa + xb) / 2, top + 0.4, 0), V(xb, top - 0.06, 0)), 14, 0.03, 6, false);
      });
      // a size tag over the first layer of each new map size
      let t = 0, last = -1;
      sizeTs.forEach(s => { s.visible = false; });
      R.L.forEach((l, i) => { if (l.size !== last && t < sizeTs.length) { const side = 0.25 + 1.0 * Math.sqrt(l.size / IN); sizeTs[t].visible = true; sizeTs[t].userData.set(`${l.size}×${l.size}`); sizeTs[t].position.set(X0 + i * dx, 0.16 + side + (st.skips && st.depth > 5 ? 0.55 : 0.12), 0); t++; last = l.size; } });
      const rf = Math.min(IN, R.rf), half = rf / IN * LS / 2, cx = LX + 0.12 * LS, cy = 0.12 + LY - 0.08 + LS * 0.6, z = -0.035;
      const x0 = Math.max(LX - LS / 2, cx - half), x1 = Math.min(LX + LS / 2, cx + half), y0 = Math.max(0.12 + LY - 0.08, cy - half), y1 = Math.min(0.12 + LY - 0.08 + LS, cy + half);
      rfBox.geometry.dispose(); rfBox.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z)], true, 'catmullrom', 0), 16, 0.014, 4, true);
    }
    draw();
    const sci = v => (v >= 0.01 ? v.toFixed(2) : v.toExponential(0));
    const plain34Worse = () => st.depth === 34 && !st.skips;
    const controls = [
      { type: 'buttons', label: 'Network', options: ['LeNet-5', '18 layers', '34 layers'], get: () => [5, 18, 34].indexOf(st.depth), act: i => { st.depth = [5, 18, 34][i]; draw(); } },
      { type: 'toggle', label: 'Skip connections (ResNet)', short: 'skips', get: () => st.skips, set: v => { st.skips = v; draw(); } },
      { type: 'buttons', label: 'Pooling', options: ['End of each stage', 'Never', 'After every layer'], get: () => ['stage', 'none', 'every'].indexOf(st.pool), act: i => { st.pool = ['stage', 'none', 'every'][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Receptive field', get: () => ({ v: `${Math.min(IN, R.rf)} px`, sub: R.rf >= IN ? 'sees the whole leaf' : `of ${IN}`, good: R.rf >= 40, bad: R.rf < 24 }) },
      { label: 'Gradient at layer 1', get: () => ({ v: sci(R.g[0]), sub: 'of what the last layer gets', good: R.g[0] > 0.3, bad: R.g[0] < 0.05 }) },
      { label: 'Weights', get: () => ({ v: R.params >= 1e6 ? `${(R.params / 1e6).toFixed(1)} M` : `${Math.round(R.params / 1000)} k`, sub: `${R.L.length} conv layers` }) },
    ];
    const labels = [
      { name: 'leaf', t: 'The input photo', d: 'Orange square: what one neuron sees', icon: 'eye', atV: V(LX - LS / 2 - 0.1, 0.12 + LY + LS * 0.5, -0.1) },
      { name: 'slabs', t: 'Feature maps', d: 'Smaller after pooling, thicker with channels', icon: 'box', atV: V(X0, 0.5, 0) },
      { name: 'skips', t: 'Skip connections', d: 'Gold arcs; slab colour: gradient', icon: 'link', atV: V(X1, 0.9, 0), hide: () => !(st.skips && st.depth > 5) },
      { name: 'head', t: 'The answer', d: 'Healthy, or brown streak disease', icon: 'target', atV: V(3.6, 0.35, 0) },
    ];
    const reset = () => { Object.assign(st, { depth: 18, skips: true, pool: 'stage' }); draw(); };
    const breaks = [
      { label: 'No pooling at all', hint: 'The map never shrinks', on: () => { reset(); st.pool = 'none'; draw(); }, off: reset },
      { label: 'Pool after every layer', hint: 'Halve the map 18 times', on: () => { reset(); st.pool = 'every'; draw(); }, off: reset },
      { label: '34 layers, no skips', hint: 'Plain deep network', on: () => { reset(); st.depth = 34; st.skips = false; draw(); }, off: reset },
    ];
    function status() {
      const n = R.L.length;
      if (st.pool === 'every' && st.depth > 5) { const k = R.L.findIndex(l => l.out <= 1); return { ok: false, msg: `<b>The detail is crushed.</b> Halving the map after every layer shrinks 64 × 64 to a single pixel by layer ${k + 1}, with ${n - k - 1} layers still to come. The brown spots are a few pixels wide; they are averaged away long before the network can look at them.` }; }
      if (st.pool === 'none' && st.depth > 5) { const x = Math.round(R.flops / design({ ...st, pool: 'stage' }).flops); return { ok: false, msg: R.rf < 48 ? `<b>Short-sighted.</b> Without pooling each 3 × 3 layer adds only 2 pixels of view, so after ${n} layers a neuron sees ${R.rf} × ${R.rf} of the 64 × 64 leaf: it cannot compare one side of the leaf with the other. And every layer works on the full-size map, ${x} times the computation.` : `<b>Far too slow.</b> It took ${n} layers of 3 × 3 filters to see the whole leaf, and every one of them works on the full 64 × 64 map: ${x} times the computation of the same network with pooling.` }; }
      if (plain34Worse()) return { ok: false, msg: `<b>Deeper, but worse.</b> Each plain layer passes back only part of the gradient, so layer 1 receives ${sci(R.g[0])} of it and barely learns. This is why 34 plain layers trained worse than 18. Switch on skip connections: each block adds its input to its output, and the gradient takes the short road back.` };
      if (st.depth === 5) return { ok: true, msg: `<b>LeNet-5.</b> Two stages of 5 × 5 filters and pooling, ${Math.round(R.params / 1000)} thousand weights: plenty for small handwritten digits. On a 64 × 64 leaf each neuron sees ${R.rf} × ${R.rf} pixels, so deeper networks see more.` };
      return { ok: true, msg: `<b>${st.depth} layers${st.skips ? ' with skip connections' : ''}.</b> Pooling at the end of each stage halves the map from 64 to 8 while channels grow from 16 to 128, so a final neuron sees ${Math.min(IN, R.rf)} of the 64 pixels across, and layer 1 still receives ${sci(R.g[0])} of the gradient.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'LeNet', home: true, say: 'One of the first convolutional networks, LeNet, read handwritten digits with just two stages of filters and pooling. Here it looks at a cassava leaf with brown streak spots.', act: m => m.set({ depth: 5, skips: false, pool: 'stage' }) },
    { t: 'Seeing further', home: true, say: 'The orange square is how much of the leaf one final neuron can see. Each layer widens it a little, and each pooling step doubles how far the next layers see.', act: m => m.set({ depth: 18, skips: false, pool: 'stage' }) },
    { t: 'Without pooling', home: true, say: 'Take pooling away, and the maps never shrink. After eighteen layers a neuron still sees only a small patch, and every layer is full size and slow.', act: m => m.set({ pool: 'none' }) },
    { t: 'Deeper is not always better', home: true, say: 'Stack thirty four plain layers, and the gradient fades on its way back: the early slabs turn grey. Plain networks this deep trained worse than shallower ones.', act: m => m.set({ depth: 34, skips: false, pool: 'stage' }) },
    { t: 'Skip connections', home: true, say: 'ResNet adds a shortcut around every pair of layers: the gold arcs. Each block adds its input to its output, so the gradient has a straight road home and every slab stays teal.', act: m => m.set({ skips: true }) },
    { t: 'The modern recipe', home: true, say: 'Small three by three filters, pooling at the end of each stage, channels growing as maps shrink, and skip connections everywhere. That recipe trains networks hundreds of layers deep.', act: m => m.set({ depth: 34, skips: true, pool: 'stage' }) },
  ],
  check: [
    { q: 'What does pooling do to the next layers?', options: ['Halves the map, so they see twice as far for the same cost', 'Adds more channels', 'Removes the need for filters'], answer: 0, why: 'Each pixel of the smaller map covers a bigger patch of the image.' },
    { q: 'Why did very deep plain networks train worse?', options: ['The gradient fades as it passes back through many layers', 'They had too few weights', 'They used pooling'], answer: 0, why: 'Early layers receive almost no learning signal.' },
    { q: 'What does a skip connection do?', options: ['Adds a block\'s input to its output, giving the gradient a direct path', 'Skips training for some layers', 'Removes layers at random'], answer: 0, why: 'The identity path carries the gradient around the block.' },
  ],
  terms: [
    ['Feature map', 'The grid of outputs one convolution layer produces, one per channel.'],
    ['Pooling', 'Shrinking a feature map by keeping the max or average of each small patch.'],
    ['Receptive field', 'The patch of the input image one neuron can see.'],
    ['Skip connection', 'Adding a block\'s input to its output, as in ResNet.'],
    ['Stage', 'A group of layers that work at one map size.'],
    ['Degradation', 'Deeper plain networks training worse than shallower ones.'],
  ],
  deeper: '<p><b>Counting the view.</b> A 3 × 3 layer adds 2 pixels to the receptive field, times how many times the map has been halved so far. That is why pooling, or a stride of 2, is what lets deep layers see whole objects.</p><p><b>Bottlenecks.</b> Deeper ResNets use 1 × 1 convolutions to squeeze the channels before the 3 × 3 and expand them after, which keeps the cost down.</p><p><b>About this machine.</b> Receptive fields, map sizes and weight counts are worked out exactly; the gradient shading is an illustration of how plain layers lose signal and skips keep it.</p>',
  code: {
    title: 'A residual block',
    note: 'Adapted from the course\'s CNN architectures lesson.',
    text: `
import torch.nn as nn

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        out = self.bn1(self.conv1(x)).relu()
        out = self.bn2(self.conv2(out))
        return (out + x).relu()        # the skip connection

def receptive_field(layers):
    r, jump = 1, 1
    for kernel, stride in layers:
        r += (kernel - 1) * jump
        jump *= stride
    return r
`,
  },
};
