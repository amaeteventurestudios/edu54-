// Vision-language-action models: a robot arm in an avocado packhouse in Murang'a hears "put the ripest avocado in the export crate". The action head is 256-bin tokens
// (OpenVLA, about 4 Hz), FAST compressed tokens (3 to 5 times faster) or a flow-matching action expert (pi0, a smooth 50-step chunk, about 50 Hz). Training mixes web data
// with robot demonstrations or uses robot data only. A safety layer outside the model clamps every command to the workspace. Control rates follow the reported figures;
// the scene, the misread action and the choices are scripted.
// Break it: robot-only training (it takes the avocado where the demos picked), no safety layer (a bad action leaves the table), coarse bins (a jerky, slow path).
const HEADS = [{ n: 'Bins', hz: 4, tok: 210 }, { n: 'FAST', hz: 15, tok: 30 }, { n: 'Flow', hz: 50, tok: 0 }];

export default {
  slug: 'embodied-vlas-openvla-pi0-groot',
  title: 'Robots that see, read and act',
  description: 'A robot arm in an avocado packhouse in Murang\'a is told: put the ripest avocado in the export crate. A vision-language-action model reads the camera and the words and outputs arm movements. Then train it on robot demos only, take away the safety layer, or use coarse action bins.',
  overview: 'A vision-language-action model is a vision-language model whose output is robot motion. RT-2 showed the trick: scale each joint target into 256 bins and treat each bin as a token, so a 7-joint move is 7 tokens per step, and co-train on web image-text data and robot demonstrations so the model keeps general knowledge and can follow phrasings it never saw in demos. OpenVLA is the open 7-billion-parameter version, trained on Open X-Embodiment, close to a million trajectories from 22 robots, and runs at about 4 to 5 steps a second. FAST compresses a chunk of actions with a cosine transform into a handful of tokens, three to five times faster. Pi-zero swaps tokens for a flow-matching action expert that outputs a smooth continuous chunk of 50 steps in a few denoising passes, effectively 50 Hz. GR00T N1 splits a humanoid controller into a slow planner and a fast small action model. Mixing web and robot data matters: robot-only models follow only the instructions they were shown. And every real deployment keeps hard joint, speed and workspace limits outside the model, because its output is a suggestion, not a command.',
  keywords: ['vision-language-action', 'openvla', 'pi0', 'flow matching', 'action tokens', 'robot safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0.1], dir: [0.1, 0.85, 1.2], half: 1.3, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { head: 2, web: true, safe: true };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const table = P.box(4.6, 0.06, 1.9, '#C9B79C', { r: 0.03 }); table.position.set(0, 0.12, 0.2); S.add(table);
    /* workspace limits: a frame on the table */
    const WS = { x: [-2.2, 2.2], y: [0.25, 1.9], z: [-0.7, 1.05] };
    const wsLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(WS.x[1] - WS.x[0], 0.01, WS.z[1] - WS.z[0])), new THREE.LineBasicMaterial({ color: '#1F9E89' }));
    wsLine.position.set(0, 0.19, (WS.z[0] + WS.z[1]) / 2); wsLine.layers.set(1); S.add(wsLine);
    const wsT = S.text('Safe workspace', { size: 0.12, weight: 800, color: '#1F9E89' }); wsT.position.set(-1.6, 0.19, 0.98); S.add(wsT);
    /* avocados and the crate */
    const FR = [[-1.75, 0.45, '#5E8C31'], [-1.35, 0.1, '#4E7A2A'], [-0.95, 0.5, '#3B2340'], [-0.55, 0.15, '#6A9A3A']];
    const fruits = FR.map(([x, z, c]) => { const b = P.ball(0.11, c); b.scale.set(1, 0.85, 1.3); b.position.set(x, 0.27, z); b.userData.noFit = true; S.add(b); return b; });
    const ripeT = S.text('Ripest', { size: 0.13, weight: 800, color: '#3B2340' }); ripeT.position.set(-0.95, 0.16, 0.78); S.add(ripeT);
    const demoT = S.text('Demos picked here', { size: 0.11, weight: 800, color: '#5E5E6E' }); demoT.position.set(-1.75, 0.16, 0.78); S.add(demoT);
    const crate = P.box(0.9, 0.3, 0.7, '#B5541C', { r: 0.03 }); crate.position.set(1.55, 0.15, 0.3); S.add(crate);
    const crIn = P.box(0.78, 0.02, 0.58, '#7A3812'); crIn.position.set(1.55, 0.3, 0.3); S.add(crIn);
    const crT = S.text('Export crate', { size: 0.12, weight: 800, color: '#FFFFFF' }); crT.position.set(1.55, 0.33, 0.3); crT.userData.noFit = true; S.add(crT);
    const crF = S.text('Export crate', { size: 0.08, weight: 800, face: 'front', color: '#FFFFFF' }); crF.position.set(1.55, 0.3, 0.655); S.add(crF);
    /* the arm */
    const B = V(0.1, 0.12, -0.95), SH = B.clone().add(V(0, 0.55, 0)), L1 = 1.35, L2 = 1.3;
    const plinth = P.cyl(0.32, 0.18, '#2B2B38', { r2: 0.28 }); plinth.position.copy(B); S.add(plinth);
    const col = P.rod(B, SH, 0.1, '#E0A526'); S.add(col);
    const up = P.rod(SH, SH.clone().add(V(0, 1, 0)), 0.075, '#E0A526'); up.userData.noFit = true; S.add(up);
    const fore = P.rod(SH, SH.clone().add(V(0, 1, 0)), 0.06, '#E0A526'); fore.userData.noFit = true; S.add(fore);
    const j1 = P.ball(0.11, '#2B2B38'); j1.position.copy(SH); S.add(j1);
    const j2 = P.ball(0.09, '#2B2B38'); j2.userData.noFit = true; S.add(j2);
    const grip = new THREE.Group(); grip.userData.noFit = true; S.add(grip);
    [-1, 1].forEach(s => { const f = P.box(0.03, 0.14, 0.1, '#2B2B38'); f.position.set(s * 0.07, -0.14, 0); grip.add(f); });
    const palm = P.box(0.2, 0.04, 0.12, '#2B2B38'); palm.position.set(0, -0.04, 0); grip.add(palm);
    const armT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); armT.position.set(B.x, 1.0, B.z - 0.1); armT.userData.noFit = true; S.add(armT);
    /* the commanded path */
    const trail = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.022, '#3A6FB0'); trail.layers.set(1); trail.userData.noFit = true; S.add(trail);
    const instr = S.text('"Put the ripest avocado in the export crate"', { size: 0.14, weight: 800, color: '#6B5E86' }); instr.position.set(0.3, 0.13, 1.33); S.add(instr);
    const keep = P.box(4.8, 1.6, 2.0, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.1, 0); S.add(keep);

    let curve = null, pick = 2, breach = false;
    const HOME = V(0.2, 1.3, -0.1), crateP = V(1.55, 0.42, 0.3);
    function build() { pick = st.web ? 2 : 0; const f = fruits[pick], fp = V(FR[pick][0], 0.42, FR[pick][1]);
      curve = new THREE.CatmullRomCurve3([HOME, fp.clone().add(V(0, 0.55, 0)), fp, fp.clone().add(V(0, 0.6, 0)), crateP.clone().add(V(0, 0.6, 0)), crateP, HOME.clone().add(V(0.2, 0, 0))], true, 'catmullrom', 0.3); return f; }
    const glitch = u => (u > 0.6 && u < 0.7 ? Math.sin((u - 0.6) / 0.1 * Math.PI) : 0);
    function cmd(u) {
      const H = HEADS[st.head]; let uu = u;
      if (st.head === 0) uu = Math.floor(u * 28) / 28; else if (st.head === 1) uu = Math.floor(u * 90) / 90;
      const p = curve.getPointAt(uu); p.z += glitch(uu) * 1.7; p.y -= glitch(uu) * 0.3;
      if (st.head === 0) { const q = 0.09; p.x = Math.round(p.x / q) * q; p.y = Math.round(p.y / q) * q; p.z = Math.round(p.z / q) * q; }
      let out = false;
      if (st.safe) { p.x = Math.min(WS.x[1], Math.max(WS.x[0], p.x)); p.y = Math.min(WS.y[1], Math.max(WS.y[0], p.y)); p.z = Math.min(WS.z[1], Math.max(WS.z[0], p.z)); }
      else out = p.z > WS.z[1] + 0.01;
      return { p, out, H };
    }
    function draw() {
      build(); breach = false;
      const pts = []; for (let i = 0; i <= 240; i++) { const c = cmd(i / 240); pts.push(c.p); if (c.out) breach = true; }
      trail.geometry.dispose(); trail.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 600, 0.022, 5, false);
      trail.material.color.set(breach ? '#C62828' : '#3A6FB0');
      armT.userData.set(`${HEADS[st.head].n} head, about ${HEADS[st.head].hz} Hz`);
      fruits.forEach((f, i) => f.position.set(FR[i][0], 0.27, FR[i][1]));
    }
    function pose(T) {
      const d = T.clone().sub(SH), dist = Math.min(L1 + L2 - 0.02, Math.max(0.3, d.length())), hd = V(d.x, 0, d.z); if (hd.lengthSq() < 1e-6) hd.set(0, 0, 1); hd.normalize();
      const a = Math.atan2(d.y, Math.hypot(d.x, d.z)), b = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))));
      const E = SH.clone().addScaledVector(hd, L1 * Math.cos(a + b)).add(V(0, L1 * Math.sin(a + b), 0));
      const W = SH.clone().addScaledVector(d.normalize(), dist);
      P.setRod(up, SH, E); P.setRod(fore, E, W); j2.position.copy(E); grip.position.copy(W.clone().add(V(0, 0.16, 0))); return W; }
    draw();
    let t0 = 0;
    const update = dt => { t0 += S.reduced ? 0 : dt; const u = (t0 * 0.09) % 1, c = cmd(u), W = pose(c.p);
      const f = fruits[pick], pu = 2 / 7, du = 5 / 7;
      if (u > pu && u < du) f.position.copy(W.clone().add(V(0, -0.02, 0))); else if (u >= du) f.position.set(crateP.x, 0.4, crateP.z); else f.position.set(FR[pick][0], 0.27, FR[pick][1]); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Action head', options: ['256 bins', 'FAST tokens', 'Flow matching'], get: () => st.head, act: i => { st.head = i; draw(); } },
      { type: 'buttons', label: 'Training data', options: ['Web + robot', 'Robot only'], get: () => (st.web ? 0 : 1), act: i => { st.web = !i; draw(); } },
      { type: 'buttons', label: 'Safety layer', options: ['On', 'Off'], get: () => (st.safe ? 0 : 1), act: i => { st.safe = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Control rate', get: () => ({ v: `${HEADS[st.head].hz} Hz`, sub: HEADS[st.head].tok ? `${HEADS[st.head].tok} tokens per 30 steps` : 'a continuous 50-step chunk', good: HEADS[st.head].hz >= 15, bad: HEADS[st.head].hz < 10 }) },
      { label: 'Avocado', get: () => ({ v: st.web ? 'Ripest' : 'Unripe', sub: st.web ? 'followed the words' : 'where the demos picked', good: st.web, bad: !st.web }) },
      { label: 'Workspace', get: () => ({ v: breach ? 'Breached' : 'Inside', sub: st.safe ? 'commands clamped outside the model' : 'no limits', good: !breach, bad: breach }) },
    ];
    const labels = [
      { name: 'arm', t: 'Robot arm', d: 'Blue line: the commanded path', icon: 'bolt', atV: V(B.x - 0.3, 0.6, B.z) },
      { name: 'crate', t: 'Export crate', d: 'Where the ripest one goes', icon: 'box', atV: V(2.0, 0.3, 0.3) },
    ];
    const reset = () => { Object.assign(st, { head: 2, web: true, safe: true }); draw(); };
    const breaks = [
      { label: 'Robot data only', hint: 'No web data in training', on: () => { reset(); st.web = false; draw(); }, off: reset },
      { label: 'No safety layer', hint: 'Model output goes straight to the motors', on: () => { reset(); st.safe = false; draw(); }, off: reset },
      { label: 'Coarse bins', hint: '256-bin tokens, about 4 Hz', on: () => { reset(); st.head = 0; draw(); }, off: reset },
    ];
    function status() {
      if (!st.safe) return { ok: false, msg: `<b>The arm swings off the table.</b> One predicted action, from a misread frame, points past the front edge, and with no limits the motors follow it. A model's output is a suggestion: keep joint, speed and workspace limits in a separate control layer that clamps every command.` };
      if (!st.web) return { ok: false, msg: `<b>It packs an unripe avocado.</b> Trained only on demonstrations, which always picked from the left, the model has never learned what "ripest" looks like and goes where the demos went. Co-training on web image-text data keeps the general knowledge needed for new phrasings.` };
      if (st.head === 0) return { ok: false, msg: `<b>Jerky and slow.</b> 256-bin tokens snap every joint target to a grid and the model writes ${HEADS[0].tok} tokens per 30 steps, so it manages about ${HEADS[0].hz} commands a second and the path is stair-stepped. FAST compresses the chunk; flow matching outputs a smooth one.` };
      return { ok: true, msg: `<b>The ripest avocado goes in the crate.</b> ${st.head === 2 ? 'The flow-matching action expert outputs a smooth 50-step chunk, about 50 Hz' : `FAST tokens bring control to about ${HEADS[1].hz} Hz`}, web data lets it understand "ripest", and the safety layer clamped the one bad action back inside the workspace.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The job', home: true, say: 'In an avocado packhouse in Murang\'a, a robot arm is told: put the ripest avocado in the export crate.', act: m => m.set({ head: 2, web: true, safe: true }) },
    { t: 'See, read, act', home: true, say: 'A vision-language-action model reads the camera and the words, and its output is arm movement.', act: m => m.set({}) },
    { t: 'Smooth actions', home: true, say: 'A flow-matching action expert outputs a smooth chunk of fifty steps at once, so control runs fast.', act: m => m.set({}) },
    { t: 'Demos only', home: true, say: 'Train on robot demos alone, and it does not know what ripest means. It picks where the demos picked.', act: m => m.set({ web: false }) },
    { t: 'No limits', home: true, say: 'One bad action points off the table. Without a safety layer, the arm follows it.', act: m => m.set({ web: true, safe: false }) },
    { t: 'Coarse bins', home: true, say: 'With coarse action bins the arm moves in slow, jerky steps.', act: m => m.set({ safe: true, head: 0 }) },
  ],
  check: [
    { q: 'How did RT-2 and OpenVLA output actions?', options: ['Each joint target as one of 256 bin tokens', 'As images', 'As speech'], answer: 0, why: 'Actions become tokens.' },
    { q: 'Why mix web data with robot demonstrations?', options: ['To keep general knowledge for new phrasings', 'To move faster', 'To save memory'], answer: 0, why: 'Robot-only models follow only what they saw.' },
    { q: 'Where do safety limits belong?', options: ['In a control layer outside the model', 'Inside the prompt', 'Nowhere'], answer: 0, why: 'The output is a suggestion.' },
  ],
  terms: [
    ['VLA', 'A vision-language model whose output is robot actions.'],
    ['Action bins', 'Joint targets snapped to 256 levels, one token each.'],
    ['FAST', 'Compressing an action chunk into a few tokens.'],
    ['Flow-matching head', 'Outputs a smooth continuous chunk of actions.'],
    ['Co-training', 'Mixing web data with robot demonstrations.'],
    ['Workspace limits', 'Bounds the arm may never leave.'],
  ],
  deeper: '<p><b>Packhouses and farms.</b> Avocado, flower and tea packhouses in Kenya, South Africa and Ethiopia sort by hand at scale. Robots could help with repetitive work, but they must be safe around people, cheap to adapt and trusted by the workers beside them.</p><p><b>Fast and slow.</b> GR00T N1 runs a large planner about once a second and a small action model at 50 to 100 Hz, so slow thinking never blocks fast control.</p><p><b>About this machine.</b> Control rates follow the reported figures; the scene and the misread action are scripted.</p>',
  code: {
    title: 'Tokens out, limits after',
    note: 'Adapted from the course\'s VLA lesson.',
    text: `
def to_bins(action, n=256):                 # action values in [-1, 1]
    return [min(n - 1, int((a + 1) / 2 * n)) for a in action]

def from_bins(ids, n=256):
    return [(i + 0.5) / n * 2 - 1 for i in ids]

def safe(cmd, lo, hi):                      # outside the model, always
    return [min(h, max(l, c)) for c, l, h in zip(cmd, lo, hi)]
`,
  },
};
