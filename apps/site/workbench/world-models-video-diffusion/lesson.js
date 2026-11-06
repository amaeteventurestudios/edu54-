// World models and video diffusion: a weeding robot in a maize field in Tanzania. Before acting, it asks a world model: "if I do these actions, what will my camera see?"
// Top row: what the camera really sees over eight steps (drive, turn left, drive towards the water tank, stop). Bottom row: the world model's predicted frames.
// Each frame is the robot's view from above, centred on the robot and turned with it. Errors show as differences between the rows.
// Break it: roll out far past what it was trained for (errors compound and the field melts), drop the action input (it predicts driving straight whatever the plan),
// a model that never learned collisions (in its imagination the robot drives through the tank).
const G = 13, NF = 8, ACT = ['F', 'F', 'L', 'F', 'F', 'F', 'F', 'F'];
const TANK = { x: 6.05, y: 4.25, r: 0.7 };
function poses(mode) {     // mode: 'true' respects the tank; 'ghost' drives through; 'straight' ignores turns
  let x = 2, y = 2, h = 0; const out = [];
  for (let t = 0; t < NF; t++) {
    out.push([x, y, h]);
    const a = mode === 'straight' ? 'F' : ACT[t];
    if (a === 'L') h += Math.PI / 4;
    else { const nx = x + Math.cos(h) * 0.9, ny = y + Math.sin(h) * 0.9; if (mode === 'true' && Math.hypot(nx - TANK.x, ny - TANK.y) < TANK.r + 0.35) continue; x = nx; y = ny; }
  }
  return out;
}
function world(wx, wy) {
  if (Math.hypot(wx - TANK.x, wy - TANK.y) < TANK.r) return [0.24, 0.44, 0.66];
  const row = (((wx + wy * 0.0) % 1.2) + 1.2) % 1.2 < 0.35;
  return row ? [0.27, 0.52, 0.22] : [0.62, 0.46, 0.3];
}

export default {
  slug: 'world-models-video-diffusion',
  title: 'World models: imagining what happens next',
  description: 'A video model imagines frames forward from a scene. Give it actions, and see the prediction drift from the truth the further it looks.',
  overview: 'A world model predicts the future: given what a camera sees now and the actions an agent plans, it generates the frames that would follow. Modern ones are video diffusion transformers, cutting video into space-time patches and denoising whole clips at once, conditioned on actions. Robots and self-driving systems use them to try plans in imagination before acting, or to generate training data. The hard parts are keeping long rollouts from drifting, actually following the actions rather than producing a generic plausible video, and respecting physics such as solid objects.',
  keywords: ['world models', 'video diffusion', 'action conditioned video', 'robot planning imagination', 'autoregressive rollout drift'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.75, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { horizon: 8, actions: true, physics: true, long: false };
    const ink = '#151827';
    /* ---------- the two film strips ---------- */
    const CELL = 0.05, FW = G * CELL, GAP = 0.12, SW = NF * FW + (NF - 1) * GAP, BZ = -0.45, R1 = 0.12 + 1.15, R2 = 0.12 + 0.35;
    const board = P.box(SW + 0.3, 1.9, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); floor.add(board);



    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 2 * NF * G * G);
    tiles.layers.set(1); tiles.userData.noFit = true; floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let r = 0; r < 2; r++) for (let f = 0; f < NF; f++) for (let k = 0; k < G * G; k++) { dummy.position.set(-SW / 2 + f * (FW + GAP) + (k % G + 0.5) * CELL, (r ? R2 : R1) + FW - (Math.floor(k / G) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt((r * NF + f) * G * G + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* ---------- the robot and the model ---------- */
    const robot = new THREE.Group(); const rb = P.box(0.4, 0.18, 0.3, '#2F6B4F', { r: 0.04 }); robot.add(rb); [-0.14, 0.14].forEach(z => { const w = P.cyl(0.07, 0.05, '#151827', { seg: 12 }); w.rotation.x = Math.PI / 2; w.position.set(0.12, 0.02, z); robot.add(w); const w2 = w.clone(); w2.position.x = -0.12; robot.add(w2); }); const camR = P.box(0.08, 0.12, 0.08, '#151827', { r: 0.02 }); camR.position.set(0.15, 0.22, 0); robot.add(camR);
    robot.position.set(-2.4, 0.15, 0.85); floor.add(robot);

    const wm = P.box(1.8, 0.36, 0.55, C.plum, { r: 0.06 }); wm.position.set(0.3, 0.12, 0.85); floor.add(wm);



    const plan = P.box(1.0, 0.3, 0.5, C.teal, { r: 0.06 }); plan.position.set(2.2, 0.12, 0.85); floor.add(plan);



    /* ---------- render frames ---------- */
    function frame(p, blur, f) {
      const [px, py, h] = p, out = [];
      let s = 31 + f * 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const u = (i - (G - 1) / 2) * 0.32, v = ((G - 1) / 2 - j) * 0.32 + 1.2;
        const wx = px + Math.cos(h) * v - Math.sin(h) * u, wy = py + Math.sin(h) * v + Math.cos(h) * u;
        let c = world(wx, wy);
        if (blur > 0) { const avg = [0.5, 0.46, 0.32]; c = c.map((x, k) => x * (1 - blur) + avg[k] * blur + (r() - 0.5) * blur * 0.35); }
        if (i === (G - 1) / 2 && j === G - 2) c = [0.95, 0.95, 0.95];
        out.push(c);
      }
      return out;
    }
    let R = null;
    function draw() {
      const tp = poses('true'), pp = poses(!st.actions ? 'straight' : !st.physics ? 'ghost' : 'true');
      let err = 0;
      for (let f = 0; f < NF; f++) {
        const ft = frame(tp[f], 0, f), steps = st.long ? 5 * (f + 1) : f + 1, blur = Math.min(0.9, st.long ? (steps / 40) ** 1.4 : 0.02 * steps);
        const fp = frame(pp[f], blur, f);
        ft.forEach((c, k) => tiles.setColorAt(f * G * G + k, col.setRGB(...c, THREE.SRGBColorSpace)));
        fp.forEach((c, k) => tiles.setColorAt((NF + f) * G * G + k, col.setRGB(...c.map(x => Math.max(0, Math.min(1, x))), THREE.SRGBColorSpace)));
        const e = Math.sqrt(ft.reduce((a, c, k) => a + c.reduce((b, x, ch) => b + (x - fp[k][ch]) ** 2, 0), 0) / (G * G * 3));
        err += e;
        
      }
      tiles.instanceColor.needsUpdate = true;
      wm.material && 0;
      R = { err: err / NF, tankHit: !st.physics && st.actions };
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Feed the planned actions to the model', short: 'actions', get: () => st.actions, set: v => { st.actions = v; draw(); } },
      { type: 'toggle', label: 'Model learned that objects are solid', short: 'collisions', get: () => st.physics, set: v => { st.physics = v; draw(); } },
      { type: 'toggle', label: 'Roll out 40 steps instead of 8', short: 'long rollout', get: () => st.long, set: v => { st.long = v; draw(); } },
    ];
    const readouts = [
      { label: 'Imagined vs real', get: () => ({ v: R.err.toFixed(2), sub: 'average difference per frame', good: R.err < 0.03, bad: R.err > 0.04 }) },
      { label: 'Follows the plan', get: () => ({ v: st.actions ? 'yes' : 'no', sub: 'turns when told to', good: st.actions, bad: !st.actions }) },
      { label: 'At the tank', get: () => ({ v: !st.actions ? '–' : st.physics ? 'stops' : 'drives through', sub: 'step 6 onwards', bad: R.tankHit, good: st.actions && st.physics }) },
    ];
    const labels = [
      { name: 'strips', t: 'Real and imagined', d: 'Top: camera; bottom: world model', icon: 'eye', atV: V(-SW / 2 - 0.1, 0.12 + 0.95, BZ) },
      { name: 'model', t: 'The world model', d: 'Video diffusion, told the actions', icon: 'box', atV: V(1.2, 0.3, 0.85) },
      { name: 'robot', t: 'The robot', d: 'Tries plans in imagination first', icon: 'spark', atV: V(-2.65, 0.3, 0.85) },
    ];
    const reset = () => { Object.assign(st, { actions: true, physics: true, long: false }); draw(); };
    const breaks = [
      { label: 'Roll out far too long', hint: '40 steps, each built on the last', on: () => { reset(); st.long = true; draw(); }, off: reset },
      { label: 'Drop the action input', hint: 'It never sees the plan', on: () => { reset(); st.actions = false; draw(); }, off: reset },
      { label: 'Never learned collisions', hint: 'No examples of hitting things', on: () => { reset(); st.physics = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.long) return { ok: false, msg: `<b>The field melts.</b> Each imagined frame is built on the last imagined frame, so small errors feed on themselves. By step 40 the crop rows have blurred into mud: average difference ${R.err.toFixed(2)}. World models refresh from the real camera often, or plan only a short way ahead.` };
      if (!st.actions) return { ok: false, msg: `<b>A plausible video of the wrong future.</b> Without the action input, the model generates the most likely continuation: keep driving straight. It never turns left, so from step 3 onwards its frames show the wrong rows (difference ${R.err.toFixed(2)}). For planning, the model must be conditioned on what the robot will do.` };
      if (!st.physics) return { ok: false, msg: `<b>Driving through the tank.</b> The real robot stops at the water tank, but this model never saw a collision in training, so in its imagination the robot rolls straight through the tank and out the other side. A planner trusting it would pick this route. Physical plausibility is one of the hardest things for world models to learn.` };
      return { ok: true, msg: `<b>Imagination matches reality.</b> Told the plan, the model turns left at step 3, drives towards the tank and stops when the real robot would: average difference ${R.err.toFixed(2)} per frame. The robot can now compare plans before moving a wheel.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Try it in imagination', home: true, say: 'A weeding robot in a maize field in Tanzania wants to know: if I drive, turn left, and drive on, what will my camera see?', act: m => m.set({ actions: true, physics: true, long: false }) },
    { t: 'Two rows', home: true, say: 'The top row is what the camera really sees. The bottom row is the world model\'s imagined video, generated from the first frame and the plan.', act: m => m.set({}) },
    { t: 'Following the plan', home: true, say: 'Told the actions, the model turns at step three, drives towards the water tank, and stops, just as the real robot does.', act: m => m.set({}) },
    { t: 'Without the plan', home: true, say: 'Drop the action input, and the model imagines the most likely future: keep driving straight. A believable video, of the wrong future.', act: m => m.set({ actions: false }) },
    { t: 'Physics', home: true, say: 'A model that never saw a collision imagines the robot rolling straight through the tank. A planner would happily choose that route.', act: m => m.set({ actions: true, physics: false }) },
    { t: 'Too far ahead', home: true, say: 'Roll out forty steps, each built on the last imagined frame, and the errors pile up until the field melts. Plan a short way, then look again.', act: m => m.set({ physics: true, long: true }) },
  ],
  check: [
    { q: 'What does an action-conditioned world model predict?', options: ['The frames that would follow if the agent took given actions', 'The best action to take', 'Only the next action'], answer: 0, why: 'The robot can compare plans in imagination.' },
    { q: 'Why do long rollouts drift?', options: ['Each imagined frame builds on the last, so errors compound', 'The camera runs out of battery', 'Actions are ignored after ten steps'], answer: 0, why: 'Refreshing from real observations keeps it on track.' },
    { q: 'Why is a model that ignores the actions useless for planning?', options: ['It shows a plausible future that does not depend on the plan', 'It is too slow', 'It cannot make video'], answer: 0, why: 'Every plan would look the same.' },
  ],
  terms: [
    ['World model', 'A model that predicts future observations from current ones and planned actions.'],
    ['Video diffusion', 'Generating video by denoising space-time patches.'],
    ['Action conditioning', 'Feeding planned actions to the model so its future depends on them.'],
    ['Rollout', 'Generating a sequence of future steps, each from the previous ones.'],
    ['Compounding error', 'Small mistakes growing as each step builds on the last.'],
    ['Physical plausibility', 'Obeying rules like solidity and gravity.'],
  ],
  deeper: '<p><b>Latent actions.</b> Some world models learn their own action vocabulary from unlabelled video, inferring what changed between frames, so they can be trained on internet video without action labels.</p><p><b>A robotics stack.</b> A vision-language model writes the plan, a video world model imagines its result, and an inverse-dynamics model turns the imagined frames back into motor commands.</p><p><b>About this machine.</b> Frames are rendered from a simple field; the imagined row applies each failure exactly so the difference can be seen and measured.</p>',
  code: {
    title: 'Planning by imagined rollouts',
    note: 'Adapted from the course\'s world models lesson.',
    text: `
def imagine(world_model, first_frame, actions, refresh_every=None, camera=None):
    frames, frame = [], first_frame
    for t, action in enumerate(actions):
        if refresh_every and camera and t % refresh_every == 0:
            frame = camera.read()                    # re-anchor to reality
        frame = world_model.next_frame(frame, action)   # conditioned on the action
        frames.append(frame)
    return frames

def choose_plan(world_model, frame, candidate_plans, score):
    rollouts = {name: imagine(world_model, frame, plan) for name, plan in candidate_plans.items()}
    return max(rollouts, key=lambda name: score(rollouts[name]))
`,
  },
};
