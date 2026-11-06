// Keypoints and pose: a long-distance runner training at altitude in Iten, Kenya. The network outputs one heatmap per joint (a glowing blob);
// the brightest spot of each heatmap is that joint, and joints are joined into a skeleton. A coach wants knee angle at foot strike.
// The board shows the camera frame with the skeleton; the heatmap tray in front shows three of the 17 heatmaps.
// Break it: heatmaps at 1/16 resolution with plain argmax (joints snap to a coarse grid and the knee angle jumps),
// a left-right flip during training without swapping the labels (left and right knees swap), two runners side by side with top-down boxes that overlap (one runner's limbs on the other).
const J = ['head', 'neck', 'r_shoulder', 'r_elbow', 'r_wrist', 'l_shoulder', 'l_elbow', 'l_wrist', 'hip', 'r_knee', 'r_ankle', 'l_knee', 'l_ankle'];
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [8, 11], [11, 12]];
function runner(t, ox = 0) {        // pose in a 1 × 1.6 frame, t = phase of stride
  const s = Math.sin(t * 2 * Math.PI), c = Math.cos(t * 2 * Math.PI);
  const hip = [0.5 + ox, 0.82 + 0.02 * Math.abs(s)];
  const P = {};
  P.hip = hip; P.neck = [hip[0] + 0.05, hip[1] + 0.42]; P.head = [P.neck[0] + 0.03, P.neck[1] + 0.13];
  const leg = (ph, side) => { const th = 0.55 * Math.sin(ph), kneeBend = 0.25 + 0.75 * Math.max(0, -Math.cos(ph)); const knee = [hip[0] + 0.38 * Math.sin(th), hip[1] - 0.38 * Math.cos(th)]; const sh = th - kneeBend; return [knee, [knee[0] + 0.38 * Math.sin(sh), knee[1] - 0.38 * Math.cos(sh)]]; };
  [P.r_knee, P.r_ankle] = leg(t * 2 * Math.PI, 'r'); [P.l_knee, P.l_ankle] = leg(t * 2 * Math.PI + Math.PI, 'l');
  const arm = (ph) => { const th = -0.6 * Math.sin(ph); const el = [P.neck[0] - 0.02 + 0.26 * Math.sin(th), P.neck[1] - 0.05 - 0.26 * Math.cos(th)]; return [el, [el[0] + 0.22 * Math.sin(th + 1.4), el[1] - 0.22 * Math.cos(th + 1.4) + 0.1]]; };
  P.r_shoulder = [P.neck[0] - 0.02, P.neck[1] - 0.05]; P.l_shoulder = [P.neck[0] + 0.02, P.neck[1] - 0.03];
  [P.r_elbow, P.r_wrist] = arm(t * 2 * Math.PI + Math.PI); [P.l_elbow, P.l_wrist] = arm(t * 2 * Math.PI);
  return J.map(k => P[k]);
}
const angle = (a, b, c) => { const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]]; return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))))) * 180 / Math.PI; };

export default {
  slug: 'keypoint-pose',
  title: 'Pose: finding joints with heatmaps',
  description: 'A runner training at altitude in Iten, Kenya. The network draws one glowing heatmap per joint, the brightest spot becomes the joint, and the joints join into a skeleton that gives the coach a knee angle. Then shrink the heatmaps until joints snap to a grid, flip training photos without swapping left and right, or let two runners\' boxes overlap.',
  overview: 'Pose estimation finds body joints. Rather than predicting coordinates directly, most networks output a heatmap per joint: an image that glows where that joint probably is. The joint is the peak of the heatmap, refined between pixels by looking at the neighbours so it is not stuck to the coarse grid. Joints are then linked into a skeleton. Two details trip people up: flipping training images left to right also turns a left knee into a right one, so the labels must be swapped too; and with several people, top-down methods crop a box per person, which fails when boxes overlap, while bottom-up methods find all joints first and then group them.',
  keywords: ['pose estimation', 'keypoint detection heatmap', 'sub-pixel localisation', 'top down vs bottom up pose', 'flip augmentation keypoints'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.95, 0], dir: [0.12, 0.42, 1.3], half: 1.6, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { res: 4, subpix: true, flipFix: true, crowd: false, method: 'topdown', t: 0.1, run: true, clock: 0 };
    const ink = '#151827';
    const base = P.box(5.8, 0.12, 2.4, '#C49A5E', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* ---------- the camera frame ---------- */
    const FX = -1.2, FZ = -0.5, FW = 2.6, FH = 2.0, FY = 0.12 + 0.18;
    const frame = P.box(FW + 0.2, FH + 0.4, 0.08, '#FBF8F1', { r: 0.04 }); frame.position.set(FX, 0.12, FZ); S.add(frame);
    const fTop = S.text('training run, Iten', { size: 0.07, weight: 800 }); fTop.position.set(FX, 0.12 + FH + 0.405, FZ); S.add(fTop);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ color: '#D8C9A8' })); bg.position.set(FX, FY + FH / 2, FZ + 0.045); bg.layers.set(1); bg.userData.noFit = true; S.add(bg);
    const track = new THREE.Mesh(new THREE.PlaneGeometry(FW, 0.25), new THREE.MeshBasicMaterial({ color: '#B5533C' })); track.position.set(FX, FY + 0.12, FZ + 0.046); track.layers.set(1); track.userData.noFit = true; S.add(track);
    const px = (p, scale = 1) => V(FX - FW / 2 + 0.35 + p[0] * scale * 1.35, FY + p[1] * 1.12, FZ + 0.05);
    const mkSkel = (color) => { const bones = BONES.map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.022, color); t.userData.noFit = true; S.add(t); return t; }); const joints = J.map(() => { const b = P.ball(0.035, '#FFFFFF'); b.userData.noFit = true; S.add(b); return b; }); return { bones, joints }; };
    const truthBody = BONES.map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.05, '#8A6A55'); t.userData.noFit = true; S.add(t); return t; });
    const truthBody2 = BONES.map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.05, '#7C86B8'); t.userData.noFit = true; S.add(t); return t; });
    const skel = mkSkel(C.gold), skel2 = mkSkel(C.teal);
    const boxA = P.tube([V(), V(1, 0, 0)], 0.01, C.gold), boxB = P.tube([V(), V(1, 0, 0)], 0.01, C.teal); [boxA, boxB].forEach(b => { b.userData.noFit = true; S.add(b); });
    const angT = S.text('', { size: 0.075, weight: 800, color: '#FFFFFF', bg: C.orange, face: 'cam', top: true }); angT.userData.noFit = true; S.add(angT);
    /* ---------- the heatmap tray ---------- */
    const HX = 1.65, HZ = 0.25, HS = 0.72;
    const tray = P.box(3 * HS + 0.4, 0.06, HS + 0.4, '#3B3F8F', { r: 0.04 }); tray.position.set(HX, 0.12, HZ); S.add(tray);
    const trT = S.text('3 of the 13 heatmaps', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); trT.position.set(HX, 0.15, HZ + HS / 2 + 0.205); S.add(trT);
    const trTop = S.text('heatmaps', { size: 0.07, weight: 800, color: '#FFFFFF' }); trTop.position.set(HX - 0.8, 0.185, HZ + HS / 2 + 0.1); S.add(trTop);
    const HM = 16, shownJ = [9, 11, 4];
    const heat = shownJ.map((j, k) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(HS / HM, 1, HS / HM), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), HM * HM); m.userData.noFit = true; m.frustumCulled = false; S.add(m); const t = S.text(J[j].replace('_', ' ').replace('r ', 'right ').replace('l ', 'left '), { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); t.position.set(HX - HS - 0.1 + k * (HS + 0.1), 0.5, HZ - HS / 2 - 0.05); t.userData.noFit = true; S.add(t); return m; });
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- prediction ---------- */
    const tube = (m, a, b, r) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, r, 5, false); };
    function predict(pose, other) {
      const grid = st.res / 64;                      // heatmap cell size in frame units (res 4 = 1/4 of 64 px)
      return pose.map((p, j) => {
        let q = p.slice();
        if (!st.flipFix) { const swap = { 2: 5, 3: 6, 4: 7, 5: 2, 6: 3, 7: 4, 9: 11, 10: 12, 11: 9, 12: 10 }; if (swap[j] !== undefined) q = pose[swap[j]].slice(); }
        if (other && st.crowd && st.method === 'topdown' && [6, 7, 11, 12].includes(j)) q = other[j].slice();
        if (st.res > 1) { const snap = v => Math.round(v / grid) * grid; q = st.subpix ? [snap(q[0]) + (q[0] - snap(q[0])) * 0.85, snap(q[1]) + (q[1] - snap(q[1])) * 0.85] : [snap(q[0]), snap(q[1])]; }
        return q;
      });
    }
    let R = null;
    function draw() {
      const A = runner(st.t, 0), B = st.crowd ? runner(st.t + 0.37, 0.42) : null;
      const pa = predict(A, B), pb = B ? predict(B, A) : null;
      BONES.forEach(([a, b], k) => { tube(truthBody[k], px(A[a]), px(A[b]), 0.04); truthBody2[k].visible = !!B; if (B) tube(truthBody2[k], px(B[a]).add(V(0, 0, -0.005)), px(B[b]).add(V(0, 0, -0.005)), 0.045); });
      const place = (sk, pose, on) => { BONES.forEach(([a, b], k) => { sk.bones[k].visible = on; if (on) tube(sk.bones[k], px(pose[a]).add(V(0, 0, 0.06)), px(pose[b]).add(V(0, 0, 0.06)), 0.024); }); sk.joints.forEach((j, k) => { j.visible = on; if (on) j.position.copy(px(pose[k])).add(V(0, 0, 0.07)); }); };
      place(skel, pa, true); place(skel2, pb, !!B);
      const bx = (pose, m, on) => { m.visible = on && st.method === 'topdown'; if (!on) return; const xs = pose.map(p => p[0]), ys = pose.map(p => p[1]), x0 = Math.min(...xs) - 0.05, x1 = Math.max(...xs) + 0.05, y0 = Math.min(...ys) - 0.05, y1 = Math.max(...ys) + 0.08; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([px([x0, y0]), px([x1, y0]), px([x1, y1]), px([x0, y1])], true, 'catmullrom', 0), 16, 0.01, 4, true); };
      bx(A, boxA, st.crowd); bx(B || A, boxB, st.crowd);
      const knee = angle(pa[8], pa[9], pa[10]), kneeTrue = angle(A[8], A[9], A[10]);
      angT.userData.set(`right knee ${Math.round(knee)}°`); angT.position.copy(px(pa[9])).add(V(0.35, 0.05, 0.05));
      // heatmaps: a gaussian at the predicted joint, blocky at coarse resolution
      shownJ.forEach((j, k) => {
        const cx = (pa[j][0]) / 1.2, cy = pa[j][1] / 1.6, blk = Math.max(1, Math.round(st.res / 2));
        for (let q = 0; q < HM * HM; q++) {
          let x = q % HM, y = Math.floor(q / HM); const bxq = Math.floor(x / blk) * blk + blk / 2, byq = Math.floor(y / blk) * blk + blk / 2;
          const d = Math.hypot(bxq / HM - cx, 1 - byq / HM - cy), v = Math.exp(-(d * d) / 0.012);
          dummy.position.set(HX - HS - 0.1 + k * (HS + 0.1) - HS / 2 + (x + 0.5) * HS / HM, 0.15 + v * 0.3, HZ - HS / 2 + (y + 0.5) * HS / HM); dummy.scale.set(1, 0.02 + v * 0.6, 1); dummy.updateMatrix(); heat[k].setMatrixAt(q, dummy.matrix); heat[k].setColorAt(q, col.setHSL(0.6 - v * 0.55, 0.85, 0.25 + v * 0.45));
        }
        heat[k].instanceMatrix.needsUpdate = true; heat[k].instanceColor.needsUpdate = true;
      });
      const err = pa.reduce((a, p, j) => a + Math.hypot(p[0] - A[j][0], p[1] - A[j][1]), 0) / J.length * 64;
      R = { knee, kneeTrue, err };
    }
    draw();
    function update(dt) { if (!st.run) return; st.clock += dt; if (st.clock > (S.reduced ? 1 : 0.12)) { st.clock = 0; st.t = (st.t + 0.04) % 1; draw(); } }
    const controls = [
      { type: 'buttons', label: 'Heatmap resolution', options: ['Full', '1/4', '1/16'], get: () => [1, 4, 16].indexOf(st.res), act: i => { st.res = [1, 4, 16][i]; draw(); } },
      { type: 'toggle', label: 'Refine the peak between pixels', short: 'sub-pixel', get: () => st.subpix, set: v => { st.subpix = v; draw(); } },
      { type: 'toggle', label: 'Swap left and right labels when flipping', short: 'flip fix', get: () => st.flipFix, set: v => { st.flipFix = v; draw(); } },
      { type: 'toggle', label: 'Second runner alongside', short: 'two runners', get: () => st.crowd, set: v => { st.crowd = v; draw(); } },
      { type: 'buttons', label: 'Several people', options: ['Top-down boxes', 'Bottom-up grouping'], get: () => (st.method === 'topdown' ? 0 : 1), act: i => { st.method = i ? 'bottomup' : 'topdown'; draw(); } },
      { type: 'toggle', label: 'Running', get: () => st.run, set: v => { st.run = v; } },
    ];
    const readouts = [
      { label: 'Knee angle', get: () => ({ v: `${Math.round(R.knee)}°`, sub: `true ${Math.round(R.kneeTrue)}°`, good: Math.abs(R.knee - R.kneeTrue) < 4, bad: Math.abs(R.knee - R.kneeTrue) > 10 }) },
      { label: 'Joint error', get: () => ({ v: `${R.err.toFixed(1)} px`, sub: 'average, in a 64 px frame', good: R.err < 1, bad: R.err > 3 }) },
      { label: 'Heatmap', get: () => ({ v: st.res === 1 ? '64 × 64' : st.res === 4 ? '16 × 16' : '4 × 4', sub: st.subpix ? 'peak refined' : 'plain argmax' }) },
    ];
    const labels = [
      { name: 'frame', t: 'The camera frame', d: 'Gold: predicted skeleton', icon: 'eye', atV: V(FX - FW / 2 - 0.1, FY + FH * 0.6, FZ) },
      { name: 'heat', t: 'Heatmaps', d: 'One per joint; the peak is the joint', icon: 'spark', atV: V(HX + 1.25, 0.3, HZ) },
      { name: 'angle', t: 'Knee angle', d: 'What the coach needs', icon: 'scale', atV: V(FX + FW / 2 + 0.1, FY + FH * 0.4, FZ) },
    ];
    const reset = () => { Object.assign(st, { res: 4, subpix: true, flipFix: true, crowd: false, method: 'topdown' }); draw(); };
    const breaks = [
      { label: 'Coarse heatmaps, plain argmax', hint: '1/16 resolution, no refining', on: () => { reset(); st.res = 16; st.subpix = false; draw(); }, off: reset },
      { label: 'Flip without swapping labels', hint: 'Training mirrored, labels not', on: () => { reset(); st.flipFix = false; draw(); }, off: reset },
      { label: 'Two runners, top-down boxes', hint: 'Their boxes overlap', on: () => { reset(); st.crowd = true; draw(); }, off: reset },
    ];
    function status() {
      const dk = Math.abs(R.knee - R.kneeTrue);
      if (!st.flipFix) return { ok: false, msg: `<b>Left and right swapped.</b> Training images were mirrored to double the data, but the labels were not swapped, so the network learned that a left knee seen in a mirror is still "left". It now draws the right leg where the left one is, and the knee angle it reports belongs to the other leg (${Math.round(R.knee)}° against a true ${Math.round(R.kneeTrue)}°).` };
      if (st.crowd && st.method === 'topdown') return { ok: false, msg: `<b>Limbs on the wrong runner.</b> Top-down pose crops a box per person, but the two runners' boxes overlap, so the crop for one also contains the other's arm and leg, and the network attaches them to the wrong body. Bottom-up methods find every joint first, then group them by person.` };
      if (st.res >= 16 && !st.subpix) return { ok: false, msg: `<b>Joints snap to a grid.</b> At 1/16 resolution the heatmap is just 4 × 4 cells, and plain argmax can only pick a cell centre, so joints jump between a few positions and the knee angle is off by ${Math.round(dk)}°. Higher-resolution heatmaps and refining the peak between pixels fix it.` };
      return { ok: true, msg: `<b>Knee angle ${Math.round(R.knee)}°.</b> Each joint's heatmap peak, refined between pixels, lands within ${R.err < 0.1 ? 'a tenth of a pixel' : `${R.err.toFixed(1)} pixels`} on average, close enough for the coach to compare foot strikes${st.crowd ? ', and bottom-up grouping keeps each runner\'s limbs on the right body' : ''}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A runner in Iten', home: true, say: 'A long distance runner training at altitude in Iten, Kenya. The coach wants the knee angle at every stride.', act: m => m.set({ res: 4, subpix: true, flipFix: true, crowd: false, method: 'topdown' }) },
    { t: 'Heatmaps', home: true, say: 'The network draws one heatmap per joint, glowing where that joint probably is. The brightest spot becomes the joint, and joints join into a skeleton.', act: m => m.set({}) },
    { t: 'Coarse grids', home: true, say: 'Shrink the heatmaps to four by four and take the brightest cell, and every joint snaps to a coarse grid. The knee angle jumps about.', act: m => m.set({ res: 16, subpix: false }) },
    { t: 'Refine the peak', home: true, say: 'Larger heatmaps, and a peak refined between pixels by looking at its neighbours, give smooth, accurate joints.', act: m => m.set({ res: 4, subpix: true }) },
    { t: 'Mirrors', home: true, say: 'Mirroring training photos doubles the data, but a mirrored left knee is a right knee. Forget to swap the labels, and the legs swap.', act: m => m.set({ flipFix: false }) },
    { t: 'Two runners', home: true, say: 'With two runners side by side, cropping a box per person lets one runner\'s limbs land on the other. Finding every joint first, then grouping them, keeps them apart.', act: m => m.set({ flipFix: true, crowd: true, method: 'bottomup' }) },
  ],
  check: [
    { q: 'How does a heatmap give a joint\'s position?', options: ['The brightest spot of the heatmap is the joint', 'The heatmap is a list of coordinates', 'The darkest spot is the joint'], answer: 0, why: 'Each joint has its own heatmap.' },
    { q: 'Why swap left and right labels when flipping training images?', options: ['A mirrored left limb looks like a right limb', 'To save memory', 'Flipping removes labels'], answer: 0, why: 'Otherwise the model learns to confuse sides.' },
    { q: 'Why do top-down methods struggle with people close together?', options: ['Overlapping boxes include another person\'s limbs', 'They cannot find faces', 'They need colour images'], answer: 0, why: 'Bottom-up methods group joints after finding them all.' },
  ],
  terms: [
    ['Keypoint', 'A specific point to locate, such as a joint.'],
    ['Heatmap', 'An image per keypoint that glows where it probably is.'],
    ['Argmax', 'Taking the position of the highest value.'],
    ['Sub-pixel refinement', 'Estimating the peak between grid cells using its neighbours.'],
    ['Top-down pose', 'Detect each person, then find their joints inside the box.'],
    ['Bottom-up pose', 'Find all joints first, then group them into people.'],
  ],
  deeper: '<p><b>Grouping.</b> Bottom-up methods such as OpenPose also predict part affinity fields: little arrows along each limb that show which elbow belongs with which wrist.</p><p><b>3D pose.</b> Lifting 2D joints to 3D, from one camera or several, gives angles that do not depend on where the camera stood.</p><p><b>About this machine.</b> The runner is animated; the grid snapping, flips and box overlap are applied exactly to show their effect.</p>',
  code: {
    title: 'Peak finding with sub-pixel refinement',
    note: 'Adapted from the course\'s keypoint lesson.',
    text: `
import numpy as np

def peak(heatmap):
    y, x = np.unravel_index(heatmap.argmax(), heatmap.shape)   # plain argmax: a whole cell
    dx = dy = 0.0
    if 0 < x < heatmap.shape[1] - 1:
        dx = 0.25 * np.sign(heatmap[y, x + 1] - heatmap[y, x - 1])
    if 0 < y < heatmap.shape[0] - 1:
        dy = 0.25 * np.sign(heatmap[y + 1, x] - heatmap[y - 1, x])
    return x + dx, y + dy                                        # nudged towards the brighter side

FLIP_PAIRS = [("l_knee", "r_knee"), ("l_ankle", "r_ankle"), ("l_wrist", "r_wrist")]
def flip_labels(points, width):
    out = {k: (width - x, y) for k, (x, y) in points.items()}
    for a, b in FLIP_PAIRS:
        out[a], out[b] = out[b], out[a]                          # a mirrored left is a right
    return out
`,
  },
};
