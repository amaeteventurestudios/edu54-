// 3D vision and NeRFs: a round thatched hut (a rondavel) in the Lesotho highlands, a camera, and rays fired from the camera through the scene.
// A NeRF stores the scene as a function: give it a point, it returns a density and a colour. Each pixel marches along its ray, sampling that function, and adds up colour weighted by density.
// The board on the right is a real volume render of the hut's density field, computed here ray by ray.
// Break it: 4 samples per ray (the thin walls are stepped over), no positional encoding (a blurry blob), camera poses slightly wrong (a ghostly double image).
const IW = 28, IH = 20;
const HUT = { R: 0.62, H: 0.5, RH: 0.6 };
function field(x, y, z, soft) {                // returns [density, r, g, b]
  const r = Math.hypot(x, z), w = soft ? 0.07 : 0.012, ang = Math.atan2(z, x);
  const s = d => 1 / (1 + Math.exp(d / w));       // 1 inside, 0 outside, edge width w
  const sg = d => 1 / (1 + Math.exp(d / 0.012));
  const ground = sg(y) * (r < 1.6 ? 1 : 0);
  const wall = s(Math.abs(r - (HUT.R - 0.03)) - 0.035) * s(y - HUT.H) * sg(-y) * (soft ? 0.35 : 1);
  const roofR = HUT.R * 1.15 * (1 - (y - HUT.H) / HUT.RH);
  const roof = s(r - roofR) * s(HUT.H - 0.02 - y) * s(y - HUT.H - HUT.RH) * (soft ? 0.35 : 1);
  const door = Math.abs(ang - 0.5) < 0.25 && y < HUT.H * 0.75;
  let dens = 0, col = [0, 0, 0];
  const add = (d, c) => { dens += d; col = col.map((v, i) => v + d * c[i]); };
  add(ground * 30, [0.55, 0.44, 0.28]);
  add(wall * 40, door && !soft ? [0.18, 0.12, 0.08] : (Math.floor(y * 30) % 4 === 0 && !soft ? [0.78, 0.6, 0.38] : [0.86, 0.7, 0.46]));
  add(roof * 40, [0.72, 0.62, 0.32]);
  return dens > 1e-6 ? [dens, ...col.map(v => v / dens)] : [0, 0, 0, 0];
}

export default {
  slug: '3d-vision-nerf',
  title: 'NeRF: a scene stored as a function',
  description: 'A round thatched hut in the Lesotho highlands, a camera, and rays fired through every pixel. A NeRF stores the whole scene as a function from a point to a density and a colour; each pixel marches along its ray, sampling as it goes, and adds up what it meets. Then take too few samples, drop the positional encoding, or nudge the camera poses and watch the picture fail.',
  overview: 'A neural radiance field learns a scene from photos taken around it. It is a small network that takes a 3D point (and a viewing direction) and returns how dense the space there is and what colour it glows. To draw a pixel, you fire a ray from the camera, sample the network at points along it, and blend the colours, each weighted by its density and by how much light is left after the points in front. Training compares these renders with the real photos. Plain networks are blurry at fine detail, so the point is first expanded into sines and cosines of many frequencies: positional encoding. The camera positions for every photo must also be known precisely.',
  keywords: ['nerf explained', 'neural radiance fields', 'volume rendering', 'positional encoding nerf', 'point clouds'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.8, 0], dir: [0.3, 0.55, 1.3], half: 1.5, wide: 5.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { samples: 48, pe: true, poses: true, show: 0.5 };
    const ink = '#151827';
    const base = P.box(5.4, 0.12, 2.8, '#C8B48A', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const HX = -1.1, HZ = -0.25, Y0 = 0.12;
    /* ---------- the real hut ---------- */
    const wall = P.cyl(HUT.R, HUT.H, '#DDB677', { seg: 40 }); wall.position.set(HX, Y0, HZ); S.add(wall);
    const roofG = new THREE.ConeGeometry(HUT.R * 1.15, HUT.RH, 40); roofG.translate(0, HUT.RH / 2, 0);
    const roof = new THREE.Mesh(roofG, new THREE.MeshLambertMaterial({ color: '#B89C55' })); roof.position.set(HX, Y0 + HUT.H, HZ); roof.castShadow = true; S.add(roof);
    const door = P.box(0.16, 0.3, 0.02, '#3A2414', { r: 0 }); door.position.set(HX + Math.cos(0.5) * HUT.R, Y0, HZ + Math.sin(0.5) * HUT.R); door.rotation.y = -0.5 + Math.PI / 2; S.add(door);
    /* ---------- the camera ---------- */
    const CAM = V(HX + 0.7, Y0 + 0.6, HZ + 1.85), TGT = V(HX, Y0 + 0.52, HZ);
    const camBody = P.box(0.28, 0.2, 0.2, '#2B2B2B', { r: 0.04 }); camBody.position.copy(CAM).add(V(0, -0.1, 0.08)); camBody.lookAt(TGT); S.add(camBody);
    const lens = P.cyl(0.06, 0.08, '#151827', { seg: 16 }); S.add(lens); lens.position.copy(CAM); lens.lookAt(TGT); lens.rotateX(Math.PI / 2);
    const camTop = S.text('camera', { size: 0.07, weight: 800, color: '#FFFFFF', bg: '#2B2B2B', face: 'cam', top: true }); camTop.position.copy(CAM).add(V(0, 0.22, 0)); camTop.userData.noFit = true; S.add(camTop);
    const fwd = TGT.clone().sub(CAM).normalize(), right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const FOV = 0.55;
    const rayDir = (u, v, off) => { const d = fwd.clone().add(right.clone().multiplyScalar((u - 0.5) * FOV * IW / IH)).add(up.clone().multiplyScalar((0.5 - v) * FOV)).normalize(); if (off) d.applyAxisAngle(V(0, 1, 0), off); return d; };
    /* rays drawn in the scene */
    const rays = [[0.2, 0.3], [0.5, 0.25], [0.8, 0.4], [0.35, 0.75], [0.62, 0.6]].map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.011, C.gold); t.userData.noFit = true; S.add(t); return t; });
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 64);
    dots.userData.noFit = true; dots.frustumCulled = false; S.add(dots);
    /* ---------- the render board ---------- */
    const BX = 1.4, BZ = -0.6, CELL = 0.08, BW = IW * CELL, BH = IH * CELL;
    const board = P.box(BW + 0.25, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, BZ); S.add(board);
    const bT = S.text('the NeRF\'s render from this camera', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: BW }); bT.position.set(BX, 0.12 + 0.15 + BH + 0.17, BZ + 0.045); S.add(bT);
    const bTop = S.text('rendered', { size: 0.07, weight: 800 }); bTop.position.set(BX, 0.12 + BH + 0.505, BZ); S.add(bTop);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), IW * IH);
    tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let k = 0; k < IW * IH; k++) { dummy.position.set(BX - BW / 2 + (k % IW + 0.5) * CELL, 0.12 + 0.15 + BH - (Math.floor(k / IW) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* ---------- volume rendering ---------- */
    const NEAR = 0.6, FAR = 3.6, SKY = [0.62, 0.78, 0.92];
    function march(o, d, N, soft) {
      let T = 1; const acc = [0, 0, 0]; const dt = (FAR - NEAR) / N;
      for (let i = 0; i < N; i++) {
        const t = NEAR + (i + 0.5) * dt, p = o.clone().addScaledVector(d, t);
        const [sig, r, g, b] = field(p.x - HX, p.y - Y0, p.z - HZ, soft);
        const a = 1 - Math.exp(-sig * dt); acc[0] += T * a * r; acc[1] += T * a * g; acc[2] += T * a * b; T *= 1 - a; if (T < 1e-3) break;
      }
      return acc.map((v, i) => v + T * SKY[i]);
    }
    function render(N, soft, poses) {
      const img = [];
      for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
        const u = (i + 0.5) / IW, v = (j + 0.5) / IH;
        let c = march(CAM, rayDir(u, v), N, soft);
        if (!poses) { const c2 = march(CAM.clone().add(right.clone().multiplyScalar(0.3)), rayDir(u, v, 0.1), N, soft); c = c.map((x, k) => (x + c2[k]) / 2); }
        img.push(c);
      }
      return img;
    }
    const REF = render(128, false, true);
    let R = null;
    function draw() {
      const img = render(st.samples, !st.pe, st.poses);
      img.forEach((c, k) => tiles.setColorAt(k, col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace)));
      tiles.instanceColor.needsUpdate = true;
      const mse = img.reduce((a, c, k) => a + c.reduce((b, v, ch) => b + (v - REF[k][ch]) ** 2, 0), 0) / (img.length * 3);
      R = { psnr: 10 * Math.log10(1 / Math.max(1e-6, mse)), queries: IW * IH * st.samples * (st.poses ? 1 : 1) };
      [[0.2, 0.3], [0.5, 0.25], [0.8, 0.4], [0.35, 0.75], [0.62, 0.6]].forEach(([u, v], i) => { const d = rayDir(u, v); rays[i].geometry.dispose(); rays[i].geometry = new THREE.TubeGeometry(new THREE.LineCurve3(CAM.clone(), CAM.clone().addScaledVector(d, 2.9)), 2, 0.011, 4, false); });
      const d = rayDir(0.5, 0.45), n = Math.min(64, st.samples), dt = (FAR - NEAR) / st.samples; dots.count = n;
      for (let i = 0; i < n; i++) { const t = NEAR + (i + 0.5) * dt * (st.samples / n), p = CAM.clone().addScaledVector(d, t), [sig, r, g, b] = field(p.x - HX, p.y - Y0, p.z - HZ, !st.pe); dummy.position.copy(p); dummy.scale.setScalar(sig > 1 ? 1.5 : 0.7); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); dots.setColorAt(i, col.setRGB(sig > 1 ? r : 1, sig > 1 ? g : 1, sig > 1 ? b : 1)); }
      dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
      const main = rays[1]; d && main;
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Samples along each ray', min: 4, max: 96, step: 1, get: () => st.samples, set: v => { st.samples = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Positional encoding', short: 'encoding', get: () => st.pe, set: v => { st.pe = v; draw(); } },
      { type: 'toggle', label: 'Camera poses known exactly', short: 'poses', get: () => st.poses, set: v => { st.poses = v; draw(); } },
    ];
    const readouts = [
      { label: 'Quality', get: () => ({ v: `${R.psnr.toFixed(1)} dB`, sub: 'PSNR vs a careful render', good: R.psnr > 30, bad: R.psnr < 26 }) },
      { label: 'Network calls', get: () => ({ v: R.queries.toLocaleString(), sub: `${IW * IH} rays × ${st.samples} samples` }) },
      { label: 'Samples per ray', get: () => ({ v: String(st.samples), sub: 'white dots on one ray' }) },
    ];
    const labels = [
      { name: 'hut', t: 'The scene', d: 'A rondavel, Lesotho highlands', icon: 'box', atV: V(HX - HUT.R, Y0 + 0.3, HZ) },
      { name: 'camera', t: 'Camera and rays', d: 'One ray per pixel; dots: samples', icon: 'eye', atV: V(CAM.x - 0.15, CAM.y, CAM.z) },
      { name: 'board', t: 'The render', d: 'Colours blended along each ray', icon: 'target', atV: V(BX + BW / 2 + 0.1, 0.12 + BH * 0.6, BZ) },
    ];
    const reset = () => { Object.assign(st, { samples: 48, pe: true, poses: true }); draw(); };
    const breaks = [
      { label: 'Only 4 samples per ray', hint: 'Big steps through the scene', on: () => { reset(); st.samples = 4; draw(); }, off: reset },
      { label: 'No positional encoding', hint: 'Feed the raw x, y, z', on: () => { reset(); st.pe = false; draw(); }, off: reset },
      { label: 'Camera poses slightly wrong', hint: 'Photos placed 30 cm off', on: () => { reset(); st.poses = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.poses) return { ok: false, msg: `<b>A ghostly double.</b> Training placed some photos 30 cm and a few degrees away from where they were taken, so the NeRF tries to satisfy two different views at once and draws the hut twice, faintly: ${R.psnr.toFixed(1)} dB. NeRFs need exact camera poses, usually from a structure-from-motion tool.` };
      if (!st.pe) return { ok: false, msg: `<b>A blurry blob.</b> Fed raw coordinates, a small network can only make smooth, slowly changing outputs, so the walls, the door and the edge of the thatch melt together: ${R.psnr.toFixed(1)} dB. Positional encoding turns each coordinate into sines and cosines of many frequencies, which lets the network draw sharp edges.` };
      if (st.samples < 16) return { ok: false, msg: `<b>Stepping over the walls.</b> With ${st.samples} samples, the points along each ray are ${((FAR - NEAR) / st.samples * 100).toFixed(0)} cm apart, but the hut's wall is only 7 cm thick, so many rays jump straight over it and see sky through solid mud: ${R.psnr.toFixed(1)} dB. Real NeRFs take a coarse pass, then put extra samples where the density is.` };
      return { ok: true, msg: `<b>The hut, rendered from a function.</b> ${IW * IH} rays, ${st.samples} samples each: every sample asks the field for a density and a colour, and each pixel blends them front to back. ${R.psnr.toFixed(1)} dB against a careful render, for ${R.queries.toLocaleString()} network calls.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A scene as a function', home: true, say: 'A round thatched hut in the Lesotho highlands. A NeRF stores the whole scene as a function: give it a point in space, and it returns how dense the space is there, and what colour.', act: m => m.set({ samples: 48, pe: true, poses: true }) },
    { t: 'Rays', home: true, say: 'To draw a picture, fire one ray from the camera through each pixel, out into the scene.', act: m => m.set({}) },
    { t: 'Sampling and blending', home: true, say: 'Along each ray, ask the function at many points. Colours are blended front to back, each weighted by its density and by how much light is still getting through.', act: m => m.set({}) },
    { t: 'Too few samples', home: true, say: 'Take only four samples, and the points are far apart. Many rays step right over the thin mud wall and see sky through it.', act: m => m.set({ samples: 4 }) },
    { t: 'Positional encoding', home: true, say: 'Feed the network raw coordinates, and it can only draw smooth, blurry shapes. Expanding each coordinate into many sines and cosines lets it draw sharp edges.', act: m => m.set({ samples: 48, pe: false }) },
    { t: 'Exact cameras', home: true, say: 'NeRFs learn from photos taken around the scene, and need to know exactly where each was taken. A few centimetres off, and the hut appears twice.', act: m => m.set({ pe: true, poses: false }) },
  ],
  check: [
    { q: 'What does a NeRF return for a point in space?', options: ['A density and a colour', 'A class label', 'A depth map'], answer: 0, why: 'Rendering blends these along each ray.' },
    { q: 'Why can too few samples per ray miss a thin wall?', options: ['The sample points are farther apart than the wall is thick', 'The wall has no colour', 'The camera is too far'], answer: 0, why: 'Rays can jump straight over it.' },
    { q: 'What does positional encoding do in a NeRF?', options: ['Turns coordinates into sines and cosines so the network can draw fine detail', 'Moves the camera', 'Adds more photos'], answer: 0, why: 'Plain coordinates give only smooth, blurry outputs.' },
  ],
  terms: [
    ['NeRF', 'Neural radiance field: a network mapping a 3D point and view direction to density and colour.'],
    ['Volume rendering', 'Blending colours along a ray, weighted by density and remaining light.'],
    ['Ray marching', 'Stepping along a ray and sampling at each step.'],
    ['Positional encoding', 'Expanding coordinates into sines and cosines of many frequencies.'],
    ['Camera pose', 'Where a camera was and which way it pointed.'],
    ['Point cloud', 'A 3D shape stored as a set of points, as from a depth sensor.'],
  ],
  deeper: '<p><b>Point clouds.</b> Depth sensors and lidar give a scene as scattered points. PointNet classifies them by running the same small network on every point and taking a maximum, so the order of the points does not matter.</p><p><b>What came next.</b> Gaussian splatting stores a scene as millions of small coloured blobs that can be drawn directly, which renders in real time instead of minutes.</p><p><b>About this machine.</b> The board is a real volume render of an analytic density field; the "no positional encoding" setting softens the field to show what a low-frequency network learns.</p>',
  code: {
    title: 'Positional encoding and rendering one ray',
    note: 'Adapted from the course\'s 3D vision lesson.',
    text: `
import torch

def encode(x, n_freqs=10):
    out = [x]
    for i in range(n_freqs):
        out += [torch.sin(2 ** i * torch.pi * x), torch.cos(2 ** i * torch.pi * x)]
    return torch.cat(out, dim=-1)

def render_ray(nerf, origin, direction, near=0.5, far=3.2, n=64):
    t = torch.linspace(near, far, n)
    points = origin + t[:, None] * direction
    density, colour = nerf(encode(points))          # one network call per sample
    delta = (far - near) / n
    alpha = 1 - torch.exp(-density * delta)
    light = torch.cumprod(torch.cat([torch.ones(1), 1 - alpha[:-1]]), 0)
    return (light * alpha)[:, None].mul(colour).sum(0)
`,
  },
};
