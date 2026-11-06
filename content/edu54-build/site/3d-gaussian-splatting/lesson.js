// 3D Gaussian splatting: a clay water pot from a potter in Kwali, Nigeria, stored as a cloud of soft coloured blobs (Gaussians) floating on the bench.
// To draw a view, every blob is projected to the screen as a soft ellipse, the blobs are sorted front to back, and their colours are blended by opacity.
// The board on the right is that render, computed here pixel by pixel, from whatever angle the camera slider sets.
// Break it: no densification (a few big blobs, a lumpy pot), no depth sort (back blobs paint over front ones), every blob fully opaque (hard edges, no soft blending).
const IMG = 44;
function makeSplats(dense) {
  let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = dense ? 700 : 46, out = [];
  const prof = y => 0.18 + 0.32 * Math.sin(Math.PI * Math.min(1, y / 0.85)) ** 0.8 + (y > 0.85 ? 0.04 : 0);
  for (let i = 0; i < n; i++) {
    const y = r() * 0.95, a = r() * Math.PI * 2, rr = prof(y);
    const band = Math.floor(y * 9) % 3 === 0, base = band ? [0.36, 0.17, 0.1] : [0.72, 0.38, 0.22];
    const shade = 0.75 + 0.25 * Math.cos(a - 0.6);
    out.push({ p: [Math.cos(a) * rr, y, Math.sin(a) * rr], c: base.map(v => v * shade), s: dense ? 0.034 : 0.13, o: dense ? 0.85 : 0.75 });
  }
  return out;
}
const SPL = { dense: makeSplats(true), sparse: makeSplats(false) };

export default {
  slug: '3d-gaussian-splatting',
  title: 'Gaussian splatting: a scene made of soft blobs',
  description: 'A clay water pot from a potter in Kwali, Nigeria, stored as hundreds of soft coloured blobs. To draw any view, every blob is projected as a soft ellipse, sorted front to back and blended by opacity, fast enough for real time. Turn the camera, then skip densification, forget the depth sort, or make every blob opaque.',
  overview: 'Gaussian splatting stores a scene as a cloud of 3D Gaussians: soft blobs, each with a position, a size and shape, a colour and an opacity. Drawing a view needs no ray marching: project each blob onto the screen as a 2D ellipse, sort them by depth, and blend their colours front to back, each one letting through only what its opacity leaves. Because every step is smooth, the blobs can be trained from photos by gradient descent, and the training adds blobs where detail is missing (densification) and removes useless ones (pruning). The result renders in real time, unlike a NeRF.',
  keywords: ['gaussian splatting', '3d gaussian splatting explained', 'alpha compositing', 'densification pruning', 'real time novel view synthesis'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.85, 0], dir: [0.3, 0.55, 1.3], half: 1.6, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { dense: true, sort: true, soft: true, angle: 0.4 };
    const ink = '#151827';
    const base = P.box(5.8, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0.2, 0, 0); S.add(base);
    /* ---------- the splat cloud on a turntable ---------- */
    const CX = -1.35, CY = 0.3, SC = 1.25;
    const turn = P.cyl(0.75, 0.08, '#5B4636', { seg: 40 }); turn.position.set(CX, 0.12, 0); S.add(turn);
    const turnT = S.text('the pot as blobs', { size: 0.07, weight: 800, color: '#FFFFFF' }); turnT.position.set(CX, 0.205, 0.55); S.add(turnT);
    const blobs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85 }), 700);
    blobs.userData.noFit = true; blobs.frustumCulled = false; blobs.layers.set(1); S.add(blobs);
    const camR = 1.35, cam = P.box(0.22, 0.16, 0.16, '#2B2B2B', { r: 0.03 }); cam.userData.noFit = true; S.add(cam);
    const camT = S.text('camera', { size: 0.06, weight: 800, color: '#FFFFFF', bg: '#2B2B2B', face: 'cam', top: true }); camT.userData.noFit = true; S.add(camT);
    /* ---------- the render board ---------- */
    const BX = 1.35, BZ = -0.55, CELL = 0.045, BW = IMG * CELL;
    const board = P.box(BW + 0.25, BW + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, BZ); S.add(board);
    const bT = S.text('rendered from the camera', { size: 0.075, weight: 800, face: 'front', color: ink }); bT.position.set(BX, 0.12 + 0.15 + BW + 0.15, BZ + 0.045); S.add(bT);
    const bTop = S.text('render', { size: 0.07, weight: 800 }); bTop.position.set(BX, 0.12 + BW + 0.505, BZ); S.add(bTop);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), IMG * IMG);
    tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let k = 0; k < IMG * IMG; k++) { dummy.position.set(BX - BW / 2 + (k % IMG + 0.5) * CELL, 0.12 + 0.15 + BW - (Math.floor(k / IMG) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* ---------- rasterise ---------- */
    const BG = [0.93, 0.9, 0.84];
    let R = null;
    function render() {
      const list = st.dense ? SPL.dense : SPL.sparse, ca = Math.cos(st.angle), sa = Math.sin(st.angle);
      // camera looks along -z after rotating the pot by the angle; orthographic projection for clarity
      const proj = list.map(g => { const x = g.p[0] * ca - g.p[2] * sa, z = g.p[0] * sa + g.p[2] * ca; return { x, y: g.p[1], z, g }; });
      if (st.sort) proj.sort((a, b) => b.z - a.z); else proj.sort((a, b) => a.z - b.z);   // front to back, or back to front by mistake
      const img = [];
      for (let j = 0; j < IMG; j++) for (let i = 0; i < IMG; i++) {
        const u = (i + 0.5) / IMG * 1.3 - 0.65, v = 1.05 - (j + 0.5) / IMG * 1.15;
        let T = 1; const acc = [0, 0, 0];
        for (const q of proj) {
          const dx = u - q.x, dy = v - q.y, d2 = (dx * dx + dy * dy) / (q.g.s * q.g.s);
          if (d2 > 9) continue;
          let a = q.g.o * Math.exp(-0.5 * d2);
          if (!st.soft) a = a > 0.25 ? 1 : 0;
          if (a < 0.004) continue;
          acc[0] += T * a * q.g.c[0]; acc[1] += T * a * q.g.c[1]; acc[2] += T * a * q.g.c[2]; T *= 1 - a;
          if (T < 0.004) break;
        }
        img.push(acc.map((x, k) => x + T * BG[k]));
      }
      return { img, n: list.length };
    }
    function draw() {
      const list = st.dense ? SPL.dense : SPL.sparse;
      for (let k = 0; k < 700; k++) {
        const g = list[k];
        if (!g) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); blobs.setMatrixAt(k, dummy.matrix); continue; }
        dummy.position.set(CX + g.p[0] * SC, CY + g.p[1] * SC, g.p[2] * SC); dummy.scale.setScalar(g.s * SC * 1.1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); blobs.setMatrixAt(k, dummy.matrix); blobs.setColorAt(k, col.setRGB(g.c[0], g.c[1], g.c[2], THREE.SRGBColorSpace));
      }
      blobs.instanceMatrix.needsUpdate = true; if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
      blobs.material.opacity = st.soft ? 0.8 : 1;
      cam.position.set(CX + Math.sin(st.angle) * camR, 0.75, Math.cos(st.angle) * camR); cam.lookAt(CX, 0.7, 0); camT.position.copy(cam.position).add(V(0, 0.22, 0));
      R = render();
      R.img.forEach((c, k) => tiles.setColorAt(k, col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace)));
      tiles.instanceColor.needsUpdate = true;
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Camera angle', min: -1.4, max: 1.4, step: 0.02, get: () => st.angle, set: v => { st.angle = v; draw(); }, fmt: v => `${Math.round(v * 57.3)}°` },
      { type: 'toggle', label: 'Densify during training (many small blobs)', short: 'densify', get: () => st.dense, set: v => { st.dense = v; draw(); } },
      { type: 'toggle', label: 'Sort blobs front to back', short: 'sort', get: () => st.sort, set: v => { st.sort = v; draw(); } },
      { type: 'toggle', label: 'Soft blobs (opacity fades out)', short: 'soft', get: () => st.soft, set: v => { st.soft = v; draw(); } },
    ];
    const readouts = [
      { label: 'Blobs', get: () => ({ v: String(R.n), sub: st.dense ? 'densified' : 'never split', good: st.dense, bad: !st.dense }) },
      { label: 'Draw order', get: () => ({ v: st.sort ? 'front to back' : 'back to front', bad: !st.sort, good: st.sort }) },
      { label: 'Render', get: () => ({ v: 'real time', sub: 'no ray marching' }) },
    ];
    const labels = [
      { name: 'cloud', t: 'Hundreds of soft blobs', d: 'Each: position, size, colour, opacity', icon: 'spark', atV: V(CX - 0.75, 0.6, 0) },
      { name: 'camera', t: 'The camera', d: 'Drag the angle in Try it', icon: 'eye', atV: V(CX + 0.75, 0.9, 0.6) },
      { name: 'board', t: 'The render', d: 'Sorted, then blended by opacity', icon: 'target', atV: V(BX + BW / 2 + 0.1, 0.12 + BW * 0.6, BZ) },
    ];
    const reset = () => { Object.assign(st, { dense: true, sort: true, soft: true }); draw(); };
    const breaks = [
      { label: 'No densification', hint: 'Training never splits blobs', on: () => { reset(); st.dense = false; draw(); }, off: reset },
      { label: 'Forget the depth sort', hint: 'Blend back to front', on: () => { reset(); st.sort = false; draw(); }, off: reset },
      { label: 'Every blob opaque', hint: 'No soft fall-off', on: () => { reset(); st.soft = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.dense) return { ok: false, msg: `<b>A lumpy pot.</b> Training started with ${R.n} blobs and never split them, so each one must cover a big patch of clay: the painted bands blur together and the rim is a smear. Densification splits blobs where the photos show detail the cloud cannot yet match.` };
      if (!st.sort) return { ok: false, msg: `<b>The back paints over the front.</b> Blending assumes each blob is in front of the ones that come after it. Drawn back to front, the far side of the pot lands on top, so you see the shading of the inside and the bands from the wrong side. Sorting by depth, every frame, is what makes it look solid.` };
      if (!st.soft) return { ok: false, msg: `<b>Hard, speckled edges.</b> With every blob fully opaque, each pixel takes the colour of whichever blob is nearest and nothing blends, so the surface turns into overlapping coins. Soft opacity lets neighbouring blobs mix, and it is also what makes the whole thing smooth enough to train by gradient descent.` };
      return { ok: true, msg: `<b>${R.n} blobs make a pot.</b> Projected, sorted front to back and blended by opacity, they render this view in a fraction of the time a NeRF would take. Turn the camera: the same cloud gives every angle.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A pot of blobs', home: true, say: 'A clay water pot from a potter in Kwali, Nigeria, stored not as a mesh or a network, but as hundreds of soft coloured blobs.', act: m => m.set({ dense: true, sort: true, soft: true, angle: 0.4 }) },
    { t: 'Splatting', home: true, say: 'To draw a view, each blob is flattened onto the screen as a soft ellipse. No rays, no marching: just projecting and painting.', act: m => m.set({ angle: -0.3 }) },
    { t: 'Front to back', home: true, say: 'The blobs are sorted by depth and blended front to back. Each lets through only what its opacity leaves for the blobs behind it.', act: m => m.set({ angle: 0.8 }) },
    { t: 'Without sorting', home: true, say: 'Skip the sort, and the far side of the pot paints over the near side. It no longer looks solid.', act: m => m.set({ sort: false }) },
    { t: 'Densification', home: true, say: 'Training adds blobs where detail is missing, and removes useless ones. Never split them, and a few big blobs make a lumpy pot.', act: m => m.set({ sort: true, dense: false }) },
    { t: 'Soft edges', home: true, say: 'Make every blob fully opaque, and nothing blends: the surface becomes a pile of coins. Softness is what makes it look smooth, and what lets it learn.', act: m => m.set({ dense: true, soft: false }) },
  ],
  check: [
    { q: 'What does each Gaussian in a splatting scene store?', options: ['A position, shape, colour and opacity', 'A pixel value only', 'A ray direction'], answer: 0, why: 'The scene is a cloud of these soft blobs.' },
    { q: 'Why must the blobs be sorted by depth?', options: ['Blending front to back only works if nearer blobs come first', 'To make the file smaller', 'To pick the brightest colour'], answer: 0, why: 'Otherwise far blobs paint over near ones.' },
    { q: 'What does densification do during training?', options: ['Adds or splits blobs where detail is missing', 'Removes the camera', 'Makes blobs opaque'], answer: 0, why: 'It gives the cloud enough blobs for fine detail.' },
  ],
  terms: [
    ['Gaussian splat', 'A soft 3D blob with position, shape, colour and opacity.'],
    ['Rasterisation', 'Drawing by projecting shapes onto the screen, not tracing rays.'],
    ['Alpha compositing', 'Blending colours front to back, each weighted by opacity.'],
    ['Densification', 'Splitting or cloning blobs where the scene needs more detail.'],
    ['Pruning', 'Removing blobs that are nearly transparent or redundant.'],
    ['Spherical harmonics', 'A compact way to let a blob\'s colour change with viewing angle.'],
  ],
  deeper: '<p><b>Shapes, not balls.</b> Real splats are stretched ellipsoids, each with its own rotation and three scales, so a few can cover a flat wall or a thin twig.</p><p><b>Colour by angle.</b> Each blob stores spherical harmonic coefficients, so shiny surfaces can change colour as the camera moves.</p><p><b>About this machine.</b> The render is computed here by projecting, sorting and blending the blobs exactly; the blobs are placed on the pot\'s shape rather than trained from photos.</p>',
  code: {
    title: 'Blending sorted splats for one pixel',
    note: 'Adapted from the course\'s Gaussian splatting lesson.',
    text: `
import numpy as np

def shade_pixel(pixel, splats, background):
    colour, light = np.zeros(3), 1.0
    for s in sorted(splats, key=lambda s: s.depth):        # nearest first
        d = pixel - s.centre_2d
        alpha = s.opacity * np.exp(-0.5 * d @ s.inv_cov_2d @ d)
        if alpha < 1 / 255:
            continue
        colour += light * alpha * s.colour
        light *= 1 - alpha                                  # what is left for the blobs behind
        if light < 1e-3:
            break
    return colour + light * background
`,
  },
};
