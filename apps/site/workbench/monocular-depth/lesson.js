// Monocular depth: one photo of a roadside near Musanze, Rwanda: a shop with a glass window close up, a banana tree, a house further back, terraced hills far away.
// A depth network turns the single photo into a depth map (near = warm, far = cool), and with the camera's focal length every pixel is lifted into a 3D point on the bench.
// Break it: read relative depth as metres (the house is "0.4 m" away), a shop window (the reflection of the hills is taken as real depth), the wrong focal length (the lifted scene is stretched).
const W = 48, H = 30;
function scene(x, y) {     // x, y in 0..1 (y down): returns { obj, depth in metres, colour }
  if (y < 0.35) return { o: 'sky', d: 400, c: [0.68, 0.82, 0.93] };
  if (y < 0.55) { const terr = Math.floor((y - 0.35) * 40) % 2; return { o: 'hills', d: 900 - (y - 0.35) * 1500, c: terr ? [0.36, 0.55, 0.27] : [0.45, 0.62, 0.3] }; }
  if (x > 0.58 && x < 0.9 && y > 0.42 && y < 0.72) return { o: 'house', d: 12, c: y < 0.5 ? [0.55, 0.25, 0.18] : [0.88, 0.8, 0.62] };
  if (Math.abs(x - 0.47) < 0.025 && y > 0.45) return { o: 'tree', d: 6, c: [0.42, 0.3, 0.18] };
  if (Math.hypot((x - 0.47) / 1.6, y - 0.47) < 0.08) return { o: 'tree', d: 6, c: [0.25, 0.5, 0.2] };
  if (x < 0.38 && y > 0.4) { const win = x > 0.06 && x < 0.3 && y > 0.5 && y < 0.8; return win ? { o: 'window', d: 2.5, c: [0.45, 0.6, 0.55] } : { o: 'shop', d: 2.5 + x * 2, c: [0.82, 0.62, 0.3] }; }
  return { o: 'road', d: 2 + (1 - y) * 40, c: [0.55, 0.5, 0.45] };
}
const PIX = []; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) PIX.push(scene((i + 0.5) / W, (j + 0.5) / H));

export default {
  slug: 'monocular-depth',
  title: 'Depth from a single photo',
  description: 'One photo of a roadside near Musanze, Rwanda: a shop, a banana tree, a house and terraced hills. A depth network turns it into a depth map, and with the camera\'s focal length every pixel lifts into a 3D point on the bench. Then read relative depth as metres, point it at a shop window, or give it the wrong focal length.',
  overview: 'With one photo there is no second view to triangulate from, so a network learns depth from clues people use too: things higher in the frame are usually further, distant things are smaller and hazier, and objects have familiar sizes. Many models output relative depth, the right order and shape but an unknown scale and shift; others are trained to output metric depth in metres. To turn depth into 3D points you also need the camera\'s intrinsics, chiefly its focal length. Glass and mirrors fool these models, because the reflection looks like real distance.',
  keywords: ['monocular depth estimation', 'relative vs metric depth', 'depth map', 'camera intrinsics', 'point cloud from depth'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.85, 0], dir: [0.35, 0.45, 1.3], half: 1.7, wide: 7.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { metric: true, windowFix: true, focal: 1.0 };
    const ink = '#151827';
    const base = P.box(7.2, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1);
    const RZ = -0.55, back = P.box(2.2, 1.55, 0.06, '#5B6178', { r: 0.04 }); back.position.set(0, 0.12, RZ - 0.04); S.add(back);
    const backTop = S.text('the photo in relief', { size: 0.07, weight: 800, color: '#FFFFFF' }); backTop.position.set(0, 0.12 + 1.555, RZ - 0.04); S.add(backTop); S.add(base);
    /* ---------- photo and depth boards ---------- */
    const CELL = 0.042, BW = W * CELL, BH = H * CELL, BZ = -0.6, BY = 0.12 + 0.2;
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.2, BH + 0.45, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.07, weight: 800, face: 'front', color: ink, maxW: BW }); t.position.set(x, BY + BH + 0.12, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.065, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.455, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H);
      m.layers.set(1); m.userData.noFit = true; S.add(m);
      const d = new THREE.Object3D(); for (let k = 0; k < W * H; k++) { d.position.set(x - BW / 2 + (k % W + 0.5) * CELL, BY + BH - (Math.floor(k / W) + 0.5) * CELL, BZ + 0.045); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const photo = mkBoard(-2.3, 'one photo, Musanze', 'input'), dmap = mkBoard(2.3, '', 'depth map');
    const dTitle = S.text('', { size: 0.07, weight: 800, face: 'front', color: ink, maxW: BW }); dTitle.position.set(2.3, BY + BH + 0.12, BZ + 0.05); S.add(dTitle);
    const col = new THREE.Color(), dummy = new THREE.Object3D();
    PIX.forEach((p, k) => photo.setColorAt(k, col.setRGB(...p.c, THREE.SRGBColorSpace))); photo.instanceColor.needsUpdate = true;
    /* ---------- point cloud on the bench ---------- */
    const pts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), W * H);
    pts.userData.noFit = true; pts.frustumCulled = false; S.add(pts);
    const camB = P.box(0.2, 0.14, 0.14, '#2B2B2B', { r: 0.03 }); camB.position.set(-2.5, 0.12, 1.2); camB.visible = false; S.add(camB);
    const camT = S.text('camera', { size: 0.06, weight: 800, color: '#FFFFFF', bg: '#2B2B2B', face: 'cam', top: true }); camT.position.set(0, -5, 1.3); camT.visible = false; camT.userData.noFit = true; S.add(camT);
    const benchT = S.text('nearer pixels stick out further', { size: 0.075, weight: 800, color: ink }); benchT.position.set(0, 0.13, 0.75); S.add(benchT);
    /* ---------- the model ---------- */
    let R = null;
    function predict() {
      return PIX.map(p => {
        let d = Math.min(p.d, 80);
        if (p.o === 'window' && !st.windowFix) d = 60;
        return d;
      });
    }
    function draw() {
      const D = predict(), rel = d => 1 / d;
      const inv = D.map(rel), lo = Math.min(...inv), hi = Math.max(...inv);
      D.forEach((d, k) => { const u = (inv[k] - lo) / (hi - lo); dmap.setColorAt(k, col.setHSL(0.66 - 0.62 * u, 0.75, 0.3 + 0.35 * u)); });
      dmap.instanceColor.needsUpdate = true;
      dTitle.userData.set(st.metric ? 'metric: metres' : 'relative: order only, no unit');
      const RW = 2.0, RH2 = 1.25, cw = RW / W, chh = RH2 / H;
      D.forEach((d, k) => {
        const i = k % W, j = Math.floor(k / W), dd = Math.min(d, 30), near = Math.pow(1 - dd / 30, 1.5);
        const stretch = 1 + (dd / 30) * (1 / st.focal - 1) * 0.9, x = ((i + 0.5) / W - 0.5) * RW * stretch, y = 0.2 + (1 - (j + 0.5) / H) * RH2, len = 0.03 + near * 0.75;
        if (PIX[k].o === 'sky') { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.0001); } else { dummy.position.set(x, y, RZ + len / 2); dummy.scale.set(cw / 0.04 * 0.96 * stretch, chh / 0.04 * 0.96, len / 0.04); }
        dummy.updateMatrix(); pts.setMatrixAt(k, dummy.matrix); pts.setColorAt(k, col.setRGB(...PIX[k].c, THREE.SRGBColorSpace));
      });
      pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true;
      const houseK = PIX.findIndex(p => p.o === 'house'), winK = PIX.findIndex(p => p.o === 'window');
      const houseD = st.metric ? D[houseK] : 1 / D[houseK] * 5;
      R = { houseD, winD: D[winK], aspect: 1 / st.focal };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Model output', options: ['Metric (metres)', 'Relative (no unit)'], get: () => (st.metric ? 0 : 1), act: i => { st.metric = !i; draw(); } },
      { type: 'toggle', label: 'Trained on glass and reflections', short: 'glass', get: () => st.windowFix, set: v => { st.windowFix = v; draw(); } },
      { type: 'slider', label: 'Focal length used for lifting', min: 0.5, max: 2, step: 0.05, get: () => st.focal, set: v => { st.focal = v; draw(); }, fmt: v => `× ${v.toFixed(2)}` },
    ];
    const readouts = [
      { label: 'House distance', get: () => ({ v: st.metric ? `${R.houseD.toFixed(0)} m` : `"${R.houseD.toFixed(1)}"`, sub: 'really 12 m', good: st.metric, bad: !st.metric }) },
      { label: 'Shop window', get: () => ({ v: `${R.winD.toFixed(1)} m`, sub: 'really 2.5 m', good: R.winD < 5, bad: R.winD > 10 }) },
      { label: 'Lifted shape', get: () => ({ v: Math.abs(st.focal - 1) < 0.08 ? 'true to life' : st.focal < 1 ? 'stretched wide' : 'squashed narrow', good: Math.abs(st.focal - 1) < 0.08, bad: Math.abs(st.focal - 1) > 0.25 }) },
    ];
    const labels = [
      { name: 'photo', t: 'One photo', d: 'No second view to compare with', icon: 'eye', atV: V(-2.3 - BW / 2 - 0.1, BY + BH * 0.6, BZ) },
      { name: 'depth', t: 'The depth map', d: 'Warm: near; cool: far', icon: 'wave', atV: V(2.3 + BW / 2 + 0.1, BY + BH * 0.6, BZ) },
      { name: 'cloud', t: 'Depth as a relief', d: 'Nearer pixels stick out further', icon: 'box', atV: V(-2.3 - BW / 2 - 0.1, BY + BH * 0.2, BZ) },
    ];
    const reset = () => { Object.assign(st, { metric: true, windowFix: true, focal: 1 }); draw(); };
    const breaks = [
      { label: 'Read relative depth as metres', hint: 'The model has no unit', on: () => { reset(); st.metric = false; draw(); }, off: reset },
      { label: 'A shop window', hint: 'Never trained on glass', on: () => { reset(); st.windowFix = false; draw(); }, off: reset },
      { label: 'Wrong focal length', hint: 'Lift with half the true value', on: () => { reset(); st.focal = 0.5; draw(); }, off: reset },
    ];
    function status() {
      if (!st.metric) return { ok: false, msg: `<b>The house is "${R.houseD.toFixed(1)}" away.</b> A relative-depth model gets the order and shape right (the depth map still looks fine) but its numbers have no unit and an unknown scale and shift. Reading them as metres puts the house a few centimetres from the camera. Use a metric model, or fix the scale with one known distance.` };
      if (!st.windowFix) return { ok: false, msg: `<b>Looking through the glass.</b> The shop window reflects the far hills, and the model reads the reflection as real distance: it puts the window ${R.winD.toFixed(0)} m away instead of 2.5 m, punching a hole in the shop in the relief. Glass, mirrors and water need special training data.` };
      if (Math.abs(st.focal - 1) > 0.15) return { ok: false, msg: `<b>The scene is ${st.focal < 1 ? 'stretched' : 'squashed'}.</b> Turning depth into 3D points needs the camera's focal length. With ${st.focal < 1 ? 'too short' : 'too long'} a value, every point is pushed ${st.focal < 1 ? 'outwards' : 'inwards'}, so the road and shop come out ${st.focal < 1 ? 'too wide' : 'too narrow'} even though every depth is right. Read it from the photo's metadata or calibrate the camera.` };
      return { ok: true, msg: `<b>From one photo to 3D.</b> The metric model puts the house at ${R.houseD.toFixed(0)} m and the shop window at ${R.winD.toFixed(1)} m, and with the right focal length every pixel stands where it belongs in the relief.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One photo', home: true, say: 'A roadside near Musanze, Rwanda: a shop, a banana tree, a house, and terraced hills behind. Just one photo, no second camera.', act: m => m.set({ metric: true, windowFix: true, focal: 1 }) },
    { t: 'A depth map', home: true, say: 'A depth network guesses how far away every pixel is, from clues like height in the frame, size and haze. Warm colours are near, cool are far.', act: m => m.set({}) },
    { t: 'Lifted into 3D', home: true, say: 'With the camera\'s focal length, every pixel lifts into a point in 3D. The photo becomes a little scene on the bench.', act: m => m.set({}) },
    { t: 'No unit', home: true, say: 'Many models only output relative depth: the right order, but no unit. Read those numbers as metres, and the house is a few centimetres away.', act: m => m.set({ metric: false }) },
    { t: 'Glass', home: true, say: 'The shop window reflects the far hills. A model never trained on glass reads the reflection as real distance, and punches a hole in the shop.', act: m => m.set({ metric: true, windowFix: false }) },
    { t: 'The camera matters', home: true, say: 'Lift the points with the wrong focal length, and the scene stretches, even though every depth was right.', act: m => m.set({ windowFix: true, focal: 0.5 }) },
  ],
  check: [
    { q: 'What does relative depth give you?', options: ['The right order and shape, but no unit or scale', 'Exact distances in metres', 'Only colour'], answer: 0, why: 'You need a known distance, or a metric model, for metres.' },
    { q: 'Why can a window or mirror fool a depth model?', options: ['The reflection looks like real distance behind the glass', 'Glass has no pixels', 'Windows are always far away'], answer: 0, why: 'The model sees the reflected hills.' },
    { q: 'What extra information turns a depth map into 3D points?', options: ['The camera\'s focal length (its intrinsics)', 'A second photo', 'The time of day'], answer: 0, why: 'It sets how far each pixel spreads sideways with distance.' },
  ],
  terms: [
    ['Monocular depth', 'Estimating depth from a single image.'],
    ['Relative depth', 'Depth correct up to an unknown scale and shift.'],
    ['Metric depth', 'Depth in real units such as metres.'],
    ['Depth map', 'An image whose pixel values are distances.'],
    ['Intrinsics', 'Camera properties such as focal length and image centre.'],
    ['Point cloud', 'A set of 3D points, here one per pixel.'],
  ],
  deeper: '<p><b>Diffusion for depth.</b> Some recent models reuse an image generator\'s knowledge, denoising a depth map conditioned on the photo, and give very sharp edges.</p><p><b>Measuring it.</b> Common scores are the average relative error and the share of pixels within 25 % of the true depth.</p><p><b>About this machine.</b> The scene\'s true depths are known; the model\'s output and the effect of each setting are drawn from them.</p>',
  code: {
    title: 'Lifting a depth map into 3D points',
    note: 'Adapted from the course\'s monocular depth lesson.',
    text: `
import numpy as np

def lift(depth, fx, fy, cx, cy):
    h, w = depth.shape
    u, v = np.meshgrid(np.arange(w), np.arange(h))
    x = (u - cx) * depth / fx          # wrong fx stretches or squashes the scene
    y = (v - cy) * depth / fy
    return np.stack([x, y, depth], axis=-1).reshape(-1, 3)

def align_relative(pred, known_depths, mask):
    # fit scale and shift so relative depth matches a few known distances
    a, b = np.polyfit(pred[mask], known_depths[mask], 1)
    return a * pred + b
`,
  },
};
