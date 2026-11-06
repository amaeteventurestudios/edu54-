// Semantic segmentation: a satellite tile on the shore of Lake Victoria; every pixel must be labelled lake, field, road or roof.
// Left board: the photo. Right board: the network's mask. In front, a U-Net: the encoder shrinks the map down the left arm, the decoder grows it back up the right,
// and gold bridges (skip connections) carry fine detail straight across.
// Break it: remove the skips (blocky edges, roads and roofs gone), a shallow U (a cloud shadow on a field is called lake), no class weighting (thin roads are ignored).
const N = 32;
const CL = [{ n: 'field', c: '#7FB04B' }, { n: 'lake', c: '#2F6FA8' }, { n: 'road', c: '#E7D27A' }, { n: 'roof', c: '#D9483B' }];
function scene() {
  const t = [], photo = [], shadow = [];
  let s = 41; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let c = 0;
    if (x + y * 0.45 < 9 + 2 * Math.sin(y * 0.5)) c = 1;
    const rx = Math.round(14 + 6 * Math.sin(y * 0.22));
    if (c === 0 && (x === rx || x === rx + 1)) c = 2;
    if (c === 0 && y === 22 && x > rx) c = 2;
    [[20, 6], [24, 9], [27, 14], [19, 27], [25, 26], [8, 28]].forEach(([bx, by]) => { if (c === 0 && x >= bx && x < bx + 2 && y >= by && y < by + 2) c = 3; });
    const sh = c === 0 && Math.hypot(x - 23, y - 17) < 3.6;
    t.push(c); shadow.push(sh);
    const base = [[0.47, 0.64, 0.3], [0.2, 0.42, 0.6], [0.82, 0.76, 0.52], [0.72, 0.3, 0.25]][c].map(v => v + (r() - 0.5) * 0.08);
    photo.push(sh ? [0.16, 0.3, 0.38] : base);
  }
  return { t, photo, shadow };
}
const SC = scene();

export default {
  slug: 'semantic-segmentation-unet',
  title: 'Segmentation: a label for every pixel',
  description: 'A satellite tile on the shore of Lake Victoria, labelled pixel by pixel as lake, field, road or roof by a U-Net. The encoder shrinks the picture to understand it, the decoder grows it back, and skip connections carry the fine detail across. Remove them, make the U shallow, or forget class weighting and watch the roads vanish.',
  overview: 'Classification gives one label per image; segmentation gives one per pixel. A U-Net does it in two halves. The encoder works like an ordinary CNN, shrinking the map step by step so each neuron sees more context. The decoder grows the map back to full size. On their own, the shrunk features have lost the fine detail of edges and thin things, so skip connections copy each encoder level straight across to the matching decoder level. Thin, rare classes such as roads also need extra weight in the loss, or the network learns to ignore them.',
  keywords: ['semantic segmentation', 'u-net explained', 'skip connections segmentation', 'mean iou', 'satellite image segmentation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.05, 0], dir: [0.12, 0.5, 1.3], half: 1.85, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { skips: true, depth: 4, weight: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* ---------- two boards ---------- */
    const BS = 1.65, BY = 0.8, BZ = -0.75;
    const board = (x, title, top) => {
      const b = P.box(BS + 0.2, BS + 0.75, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.08, weight: 800, face: 'front', color: ink, maxW: BS }); t.position.set(x, BY + BS + 0.14, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BS + 0.755, BZ); S.add(tp);
      const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(BS / N * 0.97, BS / N * 0.97), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), N * N);
      tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
      const d = new THREE.Object3D();
      for (let i = 0; i < N * N; i++) { const x0 = i % N, y0 = Math.floor(i / N); d.position.set(x - BS / 2 + (x0 + 0.5) * BS / N, BY + BS - (y0 + 0.5) * BS / N, BZ + 0.045); d.updateMatrix(); tiles.setMatrixAt(i, d.matrix); }
      tiles.instanceMatrix.needsUpdate = true;
      return tiles;
    };
    const photo = board(-1.15, 'satellite photo, Lake Victoria shore', 'input'), mask = board(1.15, 'the network\'s mask', 'output');
    const col = new THREE.Color();
    SC.photo.forEach((p, i) => photo.setColorAt(i, col.setRGB(p[0], p[1], p[2], THREE.SRGBColorSpace))); photo.instanceColor.needsUpdate = true;
    const key = CL.map((c, i) => { const sw = P.box(0.12, 0.02, 0.12, c.c, { r: 0.02 }); sw.position.set(2.45, 0.12, -0.55 + i * 0.22); S.add(sw); const t = S.text(c.n, { size: 0.07, weight: 800, color: ink }); t.position.set(2.7, 0.15, -0.55 + i * 0.22); S.add(t); return sw; });
    /* ---------- the U ---------- */
    const UZ = 0.6, LEV = 5, UW = 0.3;
    const step = (x, h, color, name) => {
      const b = P.box(UW, h, 0.5, color, { r: 0.04 }); b.position.set(x, 0.12, UZ); S.add(b);
      const t = S.text(name, { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: UW - 0.02 }); t.position.set(x, 0.12 + h - 0.06, UZ + 0.255); S.add(t);
      return { b, t };
    };
    const enc = [], dec = [], bridges = [];
    for (let l = 0; l < LEV; l++) {
      const h = 0.62 - l * 0.11, sz = `${N >> l}²`;
      enc.push(step(-2.1 + l * 0.38, h, C.indigo, sz));
      dec.push(step(2.1 - l * 0.38, h, C.teal, sz));
      const br = P.tube([V(-2.1 + l * 0.38, 0.12 + h + 0.04, UZ), V(-2.1 + l * 0.38, 0.12 + h + 0.1, UZ), V(2.1 - l * 0.38, 0.12 + h + 0.1, UZ), V(2.1 - l * 0.38, 0.12 + h + 0.04, UZ)], 0.02, C.gold); br.userData.noFit = true; S.add(br); bridges.push(br);
    }
    const uT = S.text('encoder: shrink to understand  ·  decoder: grow back to full size', { size: 0.07, weight: 800, face: 'front', color: ink, maxW: 4.2 }); uT.position.set(0, 0.15, UZ + 0.62); S.add(uT);
    /* ---------- the model ---------- */
    let R = null;
    function predict() {
      const pred = SC.t.slice();
      if (!st.skips) {
        // only the bottleneck's coarse map reaches the output: majority vote over blocks, then upsampled
        const B = 2 ** Math.min(3, st.depth - 1);
        for (let by = 0; by < N; by += B) for (let bx = 0; bx < N; bx += B) {
          const cnt = [0, 0, 0, 0]; for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) cnt[SC.t[y * N + x]] += (SC.t[y * N + x] >= 2 && st.weight ? 1.6 : 1);
          const w = cnt.indexOf(Math.max(...cnt)); for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) pred[y * N + x] = w;
        }
      }
      // even a good network wobbles along class edges: flip a few boundary pixels to their neighbour's class
      let q = 7; const rr = () => (q = (q * 16807) % 2147483647) / 2147483647;
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x, nb = [pred[i - 1], pred[i + 1], pred[i - N], pred[i + N]].find(v => v !== pred[i]); if (nb !== undefined && rr() < 0.12) pred[i] = nb; }
      if (st.depth < 3) SC.shadow.forEach((sh, i) => { if (sh) pred[i] = 1; });
      if (!st.weight) SC.t.forEach((c, i) => { if (c === 2) pred[i] = 0; });
      const iou = CL.map((_, k) => { let I = 0, U = 0; SC.t.forEach((t, i) => { const a = t === k, b = pred[i] === k; if (a && b) I++; if (a || b) U++; }); return U ? I / U : 1; });
      const acc = SC.t.filter((t, i) => t === pred[i]).length / (N * N);
      R = { pred, iou, miou: iou.reduce((a, v) => a + v, 0) / 4, acc };
    }
    function draw() {
      predict();
      R.pred.forEach((c, i) => mask.setColorAt(i, col.set(CL[c].c))); mask.instanceColor.needsUpdate = true;
      bridges.forEach(b => { b.visible = st.skips; });
      for (let l = 0; l < LEV; l++) { const on = l < st.depth; [enc[l], dec[l]].forEach(q => { q.b.visible = on; q.t.visible = on; }); bridges[l].visible = on && st.skips; }
    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'toggle', label: 'Skip connections', short: 'skips', get: () => st.skips, set: v => { st.skips = v; draw(); } },
      { type: 'slider', label: 'Depth of the U (times the map is halved)', min: 1, max: 5, step: 1, get: () => st.depth, set: v => { st.depth = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Weight rare classes in the loss', short: 'class weights', get: () => st.weight, set: v => { st.weight = v; draw(); } },
    ];
    const readouts = [
      { label: 'Pixel accuracy', get: () => ({ v: pct(R.acc), sub: 'pixels labelled right' }) },
      { label: 'Mean IoU', get: () => ({ v: pct(R.miou), sub: 'average over 4 classes', good: R.miou > 0.8, bad: R.miou < 0.7 }) },
      { label: 'Road IoU', get: () => ({ v: pct(R.iou[2]), sub: 'the thinnest class', good: R.iou[2] > 0.7, bad: R.iou[2] < 0.5 }) },
    ];
    const labels = [
      { name: 'photo', t: 'The photo', d: 'Every pixel needs a label', icon: 'eye', atV: V(-1.15 - BS / 2 - 0.1, BY + BS * 0.6, BZ) },
      { name: 'mask', t: 'The mask', d: 'One colour per class', icon: 'target', atV: V(1.15 + BS / 2 + 0.1, BY + BS * 0.6, BZ) },
      { name: 'unet', t: 'The U-Net', d: 'Shrink, then grow back', icon: 'box', atV: V(-2.1 - UW / 2, 0.4, UZ) },
      { name: 'bridges', t: 'Skip connections', d: 'Gold: fine detail carried across', icon: 'link', atV: V(2.1 + UW / 2, 0.4, UZ), hide: () => !st.skips },
    ];
    const reset = () => { Object.assign(st, { skips: true, depth: 4, weight: true }); draw(); };
    const breaks = [
      { label: 'Remove the skip connections', hint: 'Only the bottleneck reaches the output', on: () => { reset(); st.skips = false; draw(); }, off: reset },
      { label: 'A shallow U', hint: 'Halve the map only once', on: () => { reset(); st.depth = 1; draw(); }, off: reset },
      { label: 'No class weighting', hint: 'Every pixel counts the same', on: () => { reset(); st.weight = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.skips && st.depth > 1) return { ok: false, msg: `<b>Blocky and blind to detail.</b> Without skip connections the output is grown back from the ${N / 2 ** Math.min(3, st.depth - 1)} × ${N / 2 ** Math.min(3, st.depth - 1)} bottleneck alone, so edges come out in blocks and thin things vanish: road IoU ${pct(R.iou[2])}, roof IoU ${pct(R.iou[3])}. The bridges hand the decoder the full-resolution detail it lost.` };
      if (st.depth < 3) return { ok: false, msg: `<b>The shadow became lake.</b> With the map halved only ${st.depth === 1 ? 'once' : 'twice'}, each pixel's label is decided from a small patch around it, and a cloud shadow on a field looks just like water up close. Deeper levels see far enough to notice it is surrounded by fields: lake IoU ${pct(R.iou[1])}.` };
      if (!st.weight) return { ok: false, msg: `<b>The roads disappeared.</b> Roads are only ${pct(SC.t.filter(c => c === 2).length / (N * N))} of the pixels, so calling them "field" costs the loss almost nothing: pixel accuracy is still ${pct(R.acc)}, but road IoU is ${pct(R.iou[2])}. Weighting rare classes in the loss, or a Dice loss, makes every class count.` };
      return { ok: true, msg: `<b>Every pixel labelled.</b> The encoder sees enough context to tell shadow from lake, the skips restore sharp edges, and class weights keep the thin roads: mean IoU ${pct(R.miou)}, road IoU ${pct(R.iou[2])}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A label per pixel', home: true, say: 'A satellite tile on the shore of Lake Victoria. Segmentation labels every pixel: lake, field, road or roof.', act: m => m.set({ skips: true, depth: 4, weight: true }) },
    { t: 'Shrink, then grow', home: true, say: 'A U-Net shrinks the picture down the left arm, so each neuron sees more of the scene, then grows it back to full size up the right arm.', act: m => m.set({}) },
    { t: 'Without the bridges', home: true, say: 'Take away the skip connections, and the output is grown back from the tiny bottleneck alone. Edges turn blocky, and the roads and roofs vanish.', act: m => m.set({ skips: false }) },
    { t: 'Too shallow', home: true, say: 'Put them back but make the U shallow. Up close, a cloud shadow on a field looks just like water, so it is labelled lake. Depth gives context.', act: m => m.set({ skips: true, depth: 1 }) },
    { t: 'Rare classes', home: true, say: 'Roads are only a few pixels wide. Count every pixel the same, and the network learns to ignore them: accuracy stays high, but the roads are gone.', act: m => m.set({ depth: 4, weight: false }) },
    { t: 'All three', home: true, say: 'Enough depth for context, skips for detail, and weights so thin classes count. Now the mask matches the scene.', act: m => m.set({ weight: true }) },
  ],
  check: [
    { q: 'What do the skip connections in a U-Net carry?', options: ['Fine, full-resolution detail from the encoder to the decoder', 'The final answer', 'The learning rate'], answer: 0, why: 'The bottleneck has lost edges and thin shapes; the skips restore them.' },
    { q: 'Why did a shallow U call the cloud shadow lake?', options: ['Each pixel was judged from too small a patch to see the fields around it', 'It had too many skip connections', 'The photo was too big'], answer: 0, why: 'Depth gives each label more context.' },
    { q: 'Why can pixel accuracy look fine while roads vanish?', options: ['Roads are so few pixels that missing them barely changes the total', 'Accuracy ignores colour', 'Roads are not a class'], answer: 0, why: 'Per-class IoU or class weights reveal it.' },
  ],
  terms: [
    ['Semantic segmentation', 'Giving every pixel of an image a class label.'],
    ['Encoder', 'The half of a U-Net that shrinks the map and gathers context.'],
    ['Decoder', 'The half that grows the map back to full resolution.'],
    ['Skip connection', 'Copying an encoder level straight across to the matching decoder level.'],
    ['IoU', 'Overlap between predicted and true pixels of a class, divided by their union.'],
    ['Class weighting', 'Making rare classes count more in the loss.'],
  ],
  deeper: '<p><b>Upsampling.</b> The decoder grows maps with transposed convolutions or simple resizing followed by a convolution; the latter avoids checkerboard patterns.</p><p><b>Dice loss</b> scores overlap directly, which helps when one class covers a tiny share of the image, as in medical scans.</p><p><b>About this machine.</b> The masks show how each change typically fails, computed from the true labels rather than by running a real network.</p>',
  code: {
    title: 'A tiny U-Net level and class-weighted loss',
    note: 'Adapted from the course\'s semantic segmentation lesson.',
    text: `
import torch, torch.nn as nn, torch.nn.functional as F

class Up(nn.Module):
    def __init__(self, c_in, c_skip, c_out):
        super().__init__()
        self.conv = nn.Conv2d(c_in + c_skip, c_out, 3, padding=1)

    def forward(self, x, skip):
        x = F.interpolate(x, scale_factor=2)        # grow the map
        x = torch.cat([x, skip], dim=1)             # the skip connection
        return F.relu(self.conv(x))

# rarer classes count more: field, lake, road, roof
weights = torch.tensor([1.0, 1.0, 6.0, 4.0])
loss = F.cross_entropy(logits, mask, weight=weights)
`,
  },
};
