// Instance segmentation: goats crowded together at a livestock market in Kano, on an upright board.
// The overlay paints each goat's mask in its own colour, with its box. In front, the Mask R-CNN line: proposals, RoIAlign, then a box, a class and a small mask per goat.
// Break it: semantic mode (one colour for all, so you can't count them), RoIPool's rounding (every mask slides off its goat), a 7 × 7 mask (blobs), only 3 proposals (goats missed).
const W = 64, H = 40;
const GOATS = [
  { x: 10, y: 22, rx: 7, ry: 4.5, hx: 3.5, hy: 17, c: '#F4EEE2' }, { x: 21, y: 24, rx: 7.5, ry: 5, hx: 28, hy: 18, c: '#8A5A2B' },
  { x: 32, y: 21, rx: 6.5, ry: 4.2, hx: 38, hy: 16, c: '#2B2B2B' }, { x: 43, y: 25, rx: 7.5, ry: 5, hx: 36.5, hy: 20, c: '#E8D9B5' },
  { x: 53, y: 22, rx: 6.5, ry: 4.4, hx: 59, hy: 17, c: '#B07A45' }, { x: 27, y: 31, rx: 6, ry: 3.6, hx: 21, hy: 28, c: '#F4EEE2' },
];
const INST = ['#E3A72F', '#3D6BD6', '#D9483B', '#1C9A94', '#8A3F8E', '#3E9B5F'];
function owner(px, py) {      // which goat covers this pixel (the later one is in front)
  let o = -1;
  GOATS.forEach((g, i) => { const body = ((px - g.x) / g.rx) ** 2 + ((py - g.y) / g.ry) ** 2 < 1, head = Math.hypot(px - g.hx, py - g.hy) < 2.4, legs = Math.abs(py - (g.y + g.ry + 1.5)) < 1.6 && (Math.abs(px - (g.x - g.rx * 0.5)) < 0.7 || Math.abs(px - (g.x + g.rx * 0.5)) < 0.7); if (body || head || legs) o = i; });
  return o;
}
const TRUTH = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) TRUTH.push(owner(x + 0.5, y + 0.5));
const BOXES = GOATS.map((_, i) => { let x0 = W, y0 = H, x1 = 0, y1 = 0; TRUTH.forEach((o, k) => { if (o === i) { const x = k % W, y = Math.floor(k / W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); } }); return { x0, y0, x1, y1, area: TRUTH.filter(o => o === i).length }; });

export default {
  slug: 'instance-segmentation-mask-rcnn',
  title: 'Instance segmentation: which goat is which',
  description: 'Goats crowded together at a market in Kano. Semantic segmentation paints them all one colour; instance segmentation gives each its own mask, so you can count them and tell where one ends and the next begins. Then swap RoIAlign for RoIPool and watch every mask slide, shrink the masks to blobs, or cut the proposals.',
  overview: 'Semantic segmentation answers "which pixels are goat?". Instance segmentation answers "which pixels belong to each goat?", which you need to count animals or track them. Mask R-CNN does it in stages: a proposal network suggests regions that might hold an object, RoIAlign cuts a fixed-size feature patch out of each region without rounding its edges, and small heads then predict a class, a tighter box and a 28 × 28 mask for that one object. The mask is stretched back over the box. Rounding the region to the feature grid, as the older RoIPool did, shifts every mask by a few pixels.',
  keywords: ['instance segmentation', 'mask r-cnn explained', 'roialign vs roipool', 'semantic vs instance segmentation', 'counting objects'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.1, 0], dir: [0.12, 0.4, 1.3], half: 1.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'instance', align: true, res: 28, props: 300 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.2); S.add(base);
    /* ---------- the board ---------- */
    const BW = 4.8, BH = BW * H / W, BY = 0.45, BZ = -0.45;
    const board = P.box(BW + 0.2, BH + 0.35, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); S.add(board);
    const bTop = S.text('goats at a market in Kano', { size: 0.08, weight: 800 }); bTop.position.set(0, 0.12 + BH + 0.355, BZ); S.add(bTop);
    const FZ = BZ + 0.045, px = x => -BW / 2 + (x + 0.5) * BW / W, py = y => BY + BH - (y + 0.5) * BH / H;
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(BW / W * 1.01, BH / H * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H);
    tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Color();
    TRUTH.forEach((_, k) => { dummy.position.set(px(k % W), py(Math.floor(k / W)), FZ); dummy.updateMatrix(); tiles.setMatrixAt(k, dummy.matrix); });
    tiles.instanceMatrix.needsUpdate = true;
    const photoCol = k => { const o = TRUTH[k], y = Math.floor(k / W); return o >= 0 ? GOATS[o].c : (y > 30 ? '#B89A6A' : '#C9B48A'); };
    const boxBars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), GOATS.length * 4);
    boxBars.layers.set(1); boxBars.userData.noFit = true; boxBars.frustumCulled = false; S.add(boxBars);
    /* ---------- the pipeline in front ---------- */
    const stage = (x, w, color, name, sub) => {
      const b = P.box(w, 0.36, 0.5, color, { r: 0.05 }); b.position.set(x, 0.12, 0.85); S.add(b);
      const t = S.text(name, { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.36, 1.105); S.add(t);
      const u = S.text(sub, { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: w - 0.05 }); u.position.set(x, 0.22, 1.105); S.add(u);
      const tp = S.text(name, { size: 0.065, weight: 800, color: '#FFFFFF', maxW: w - 0.05 }); tp.position.set(x, 0.485, 0.85); S.add(tp);
      return { b, t, u };
    };
    const sProp = stage(-1.9, 1.0, C.grey, 'proposals', ''), sRoi = stage(-0.6, 1.0, C.indigo, 'RoIAlign', 'no rounding'), sHead = stage(0.7, 1.0, C.plum, 'heads', 'class + box'), sMask = stage(2.0, 1.0, C.teal, 'mask', '28 × 28');
    [-1.35, -0.05, 1.25].forEach(x => { const a = P.tube([V(x, 0.3, 0.85), V(x + 0.2, 0.3, 0.85)], 0.02, '#8E91A3'); a.userData.noFit = true; S.add(a); });
    /* ---------- the model ---------- */
    let R = null;
    function predict() {
      const order = GOATS.map((_, i) => i).sort((a, b) => BOXES[b].area - BOXES[a].area);
      const kept = st.props >= 50 ? order : order.slice(0, Math.max(1, Math.round(st.props)));
      const pred = Array(W * H).fill(-1), masks = {};
      kept.forEach(i => {
        const B = BOXES[i], bw = B.x1 - B.x0, bh = B.y1 - B.y0, M = st.res;
        // RoIPool rounds the box to the 8-pixel feature grid; the mask is then stretched over the true box, so it lands shifted
        const sx = st.align ? 0 : (Math.round(B.x0 / 8) * 8 - B.x0), sy = st.align ? 0 : (Math.round(B.y0 / 8) * 8 - B.y0);
        const m = []; for (let v = 0; v < M; v++) for (let u = 0; u < M; u++) { const X = Math.floor(B.x0 + sx + (u + 0.5) / M * bw), Y = Math.floor(B.y0 + sy + (v + 0.5) / M * bh); m.push(X >= 0 && X < W && Y >= 0 && Y < H && TRUTH[Y * W + X] === i); }
        masks[i] = { m, M, B };
      });
      kept.slice().sort((a, b) => a - b).forEach(i => { const { m, M, B } = masks[i], bw = B.x1 - B.x0, bh = B.y1 - B.y0; for (let y = B.y0; y < B.y1; y++) for (let x = B.x0; x < B.x1; x++) { const u = Math.min(M - 1, Math.floor((x - B.x0 + 0.5) / bw * M)), v = Math.min(M - 1, Math.floor((y - B.y0 + 0.5) / bh * M)); if (m[v * M + u]) pred[y * W + x] = i; } });
      let q = 9; const rr = () => (q = (q * 16807) % 2147483647) / 2147483647;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x, nb = [pred[k - 1], pred[k + 1], pred[k - W], pred[k + W]].find(v => v !== pred[k]); if (nb !== undefined && rr() < 0.15) pred[k] = nb; }
      const ious = GOATS.map((_, i) => { let I = 0, U = 0; TRUTH.forEach((t, k) => { const a = t === i, b = pred[k] === i; if (a && b) I++; if (a || b) U++; }); return U ? I / U : 0; });
      R = { pred, kept, ious, found: kept.length, miou: ious.reduce((a, v) => a + v, 0) / GOATS.length };
    }
    function draw() {
      predict();
      TRUTH.forEach((t, k) => {
        const p = R.pred[k];
        col.set(photoCol(k));
        if (p >= 0) col.lerp(tmp.set(st.mode === 'instance' ? INST[p] : C.red), 0.6);
        tiles.setColorAt(k, col);
      });
      tiles.instanceColor.needsUpdate = true;
      const T = 0.018;
      GOATS.forEach((_, i) => {
        const B = BOXES[i], on = st.mode === 'instance' && R.kept.includes(i);
        for (let e = 0; e < 4; e++) {
          const q = i * 4 + e;
          if (!on) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); boxBars.setMatrixAt(q, dummy.matrix); continue; }
          const x0 = -BW / 2 + B.x0 * BW / W, x1 = -BW / 2 + B.x1 * BW / W, y1 = BY + BH - B.y0 * BH / H, y0 = BY + BH - B.y1 * BH / H, z = FZ + 0.01 + i * 0.001;
          if (e < 2) { dummy.position.set((x0 + x1) / 2, e ? y1 : y0, z); dummy.scale.set(x1 - x0 + T, T, 1); } else { dummy.position.set(e === 2 ? x0 : x1, (y0 + y1) / 2, z); dummy.scale.set(T, y1 - y0, 1); }
          dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); boxBars.setMatrixAt(q, dummy.matrix); boxBars.setColorAt(q, col.set(INST[i]));
        }
      });
      boxBars.instanceMatrix.needsUpdate = true; if (boxBars.instanceColor) boxBars.instanceColor.needsUpdate = true;
      sProp.u.userData.set(`${st.props} regions`); sRoi.t.userData.set(st.align ? 'RoIAlign' : 'RoIPool'); sRoi.u.userData.set(st.align ? 'no rounding' : 'rounds to the grid'); sMask.u.userData.set(`${st.res} × ${st.res}`);
    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'buttons', label: 'Output', options: ['Instance', 'Semantic'], get: () => (st.mode === 'instance' ? 0 : 1), act: i => { st.mode = i ? 'semantic' : 'instance'; draw(); } },
      { type: 'buttons', label: 'Cutting out each region', options: ['RoIAlign', 'RoIPool'], get: () => (st.align ? 0 : 1), act: i => { st.align = !i; draw(); } },
      { type: 'buttons', label: 'Mask size', options: ['28 × 28', '14 × 14', '7 × 7'], get: () => [28, 14, 7].indexOf(st.res), act: i => { st.res = [28, 14, 7][i]; draw(); } },
      { type: 'buttons', label: 'Proposals kept', options: ['300', '3'], get: () => (st.props === 300 ? 0 : 1), act: i => { st.props = i ? 3 : 300; draw(); } },
    ];
    const readouts = [
      { label: 'Goats counted', get: () => ({ v: st.mode === 'instance' ? `${R.found} of ${GOATS.length}` : '?', sub: st.mode === 'instance' ? 'separate masks' : 'one blob, no count', good: st.mode === 'instance' && R.found === GOATS.length, bad: st.mode !== 'instance' || R.found < GOATS.length }) },
      { label: 'Mask IoU', get: () => ({ v: pct(R.miou), sub: 'average over the goats', good: R.miou > 0.85, bad: R.miou < 0.7 }) },
      { label: 'Region cut', get: () => ({ v: st.align ? 'exact' : 'rounded', sub: st.align ? 'RoIAlign' : 'RoIPool, 8-pixel grid', bad: !st.align }) },
    ];
    const labels = [
      { name: 'board', t: 'Each goat, its own mask', d: 'Colour per goat, with its box', icon: 'target', atV: V(-BW / 2, BY + BH * 0.6, BZ) },
      { name: 'props', t: 'Proposals', d: 'Regions that might hold a goat', icon: 'eye', atV: V(-2.4, 0.3, 0.85) },
      { name: 'roi', t: 'Cut and predict', d: 'RoIAlign, then class, box and mask', icon: 'box', atV: V(2.5, 0.3, 0.85) },
    ];
    const reset = () => { Object.assign(st, { mode: 'instance', align: true, res: 28, props: 300 }); draw(); };
    const breaks = [
      { label: 'Semantic, not instance', hint: 'One colour for every goat', on: () => { reset(); st.mode = 'semantic'; draw(); }, off: reset },
      { label: 'RoIPool instead of RoIAlign', hint: 'Region edges rounded to the grid', on: () => { reset(); st.align = false; draw(); }, off: reset },
      { label: 'Only 3 proposals', hint: 'Too few regions considered', on: () => { reset(); st.props = 3; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode !== 'instance') return { ok: false, msg: `<b>One blob of goat.</b> Semantic segmentation labels every goat pixel the same, so the touching animals melt into one shape: you can see where goats are, but not how many, or where one ends and the next begins. Instance segmentation gives each its own mask.` };
      if (R.found < GOATS.length) return { ok: false, msg: `<b>Goats missed.</b> With only ${st.props} proposals, only the ${R.found} largest regions get a mask, and the other ${GOATS.length - R.found} goats, including the small one lying in front, are never considered. Detectors keep hundreds of proposals and let the heads sort them out.` };
      if (!st.align) return { ok: false, msg: `<b>Every mask slid off its goat.</b> RoIPool rounds each region's edges to the 8-pixel feature grid, so the patch it cuts out is shifted by up to 4 pixels, and the mask lands shifted too: mask IoU ${pct(R.miou)}. RoIAlign samples at the exact edges instead.` };
      if (st.res < 14) return { ok: false, msg: `<b>Blobby masks.</b> A ${st.res} × ${st.res} mask stretched over a goat 15 pixels wide loses the head and legs: mask IoU ${pct(R.miou)}. Mask R-CNN predicts 28 × 28, enough for the outline.` };
      return { ok: true, msg: `<b>Six goats, six masks.</b> Proposals find every region, RoIAlign cuts each out exactly, and a ${st.res} × ${st.res} mask per goat traces its outline: mask IoU ${pct(R.miou)}. Where two goats overlap, each pixel belongs to just one.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A crowd of goats', home: true, say: 'Goats crowded together at a market in Kano. We want to count them, and know exactly which pixels belong to each one.', act: m => m.set({ mode: 'semantic', align: true, res: 28, props: 300 }) },
    { t: 'Semantic is not enough', home: true, say: 'Semantic segmentation paints every goat pixel the same colour. The animals touch, so they melt into one blob. You cannot count them.', act: m => m.set({ mode: 'semantic' }) },
    { t: 'One mask each', home: true, say: 'Instance segmentation gives every goat its own colour and box. Mask R-CNN first proposes regions, then predicts a class, a box and a small mask for each.', act: m => m.set({ mode: 'instance' }) },
    { t: 'Rounding hurts', home: true, say: 'The older RoIPool rounded each region to the feature grid. That shifts the cut by a few pixels, and every mask slides off its goat.', act: m => m.set({ align: false }) },
    { t: 'Too coarse', home: true, say: 'Shrink each mask to seven by seven, and stretched over a goat it becomes a blob: the heads and legs are gone.', act: m => m.set({ align: true, res: 7 }) },
    { t: 'The full recipe', home: true, say: 'Hundreds of proposals, exact cutting with RoIAlign, and twenty eight by twenty eight masks. Six goats, six clean masks.', act: m => m.set({ res: 28, props: 300 }) },
  ],
  check: [
    { q: 'What can instance segmentation do that semantic segmentation cannot?', options: ['Tell touching objects of the same class apart, so you can count them', 'Label every pixel', 'Work on colour images'], answer: 0, why: 'Each object gets its own mask.' },
    { q: 'Why does RoIAlign beat RoIPool for masks?', options: ['It samples at the exact region edges instead of rounding them to the grid', 'It uses more classes', 'It is a bigger network'], answer: 0, why: 'Rounding shifts the cut-out patch, and the mask with it.' },
    { q: 'What happens with too few proposals?', options: ['Some objects never get considered, so they get no mask', 'Masks become blobby', 'Every mask shifts'], answer: 0, why: 'Only proposed regions reach the heads.' },
  ],
  terms: [
    ['Instance segmentation', 'A separate mask for every object, even of the same class.'],
    ['Region proposal', 'A suggested box that might contain an object.'],
    ['RoIAlign', 'Cutting a fixed-size feature patch from a region without rounding its edges.'],
    ['RoIPool', 'The older method that rounds region edges to the feature grid.'],
    ['Mask head', 'The small network that predicts one object\'s mask inside its box.'],
    ['Mask IoU', 'Overlap between a predicted and a true mask.'],
  ],
  deeper: '<p><b>Two stages.</b> Mask R-CNN is a two-stage detector: propose, then refine. Single-stage models predict masks for every location in one pass, trading a little accuracy for speed.</p><p><b>Panoptic segmentation</b> combines both views: every pixel gets a class, and every countable object also gets its own identity.</p><p><b>About this machine.</b> Masks are made by sampling the true goat shapes at each mask size and offset, which is the effect of each stage without running a real network.</p>',
  code: {
    title: 'Instance masks with a pretrained Mask R-CNN',
    note: 'Adapted from the course\'s instance segmentation lesson.',
    text: `
import torch, torchvision

model = torchvision.models.detection.maskrcnn_resnet50_fpn(weights="DEFAULT").eval()

with torch.no_grad():
    out = model([image])[0]       # image: 3 x H x W, values 0..1

keep = out["scores"] > 0.7
boxes = out["boxes"][keep]        # one box per object
labels = out["labels"][keep]      # one class per object
masks = out["masks"][keep] > 0.5  # one full-size mask per object

print(f"counted {len(masks)} objects")
`,
  },
};
