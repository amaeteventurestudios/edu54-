// Learning rate schedules: training runs left to right along a valley whose cross-section is the loss.
// Early in training the valley is narrow and sharp; later it widens. The ball's path zigzags across it, one step at a time.
// The back wall shows the learning rate at every step, with the red safe limit: whenever the rate crosses it, the steps overshoot and grow.
// Break it: no warmup with a big rate (it blows up at the start), a constant rate that never slows (it jitters forever), a tiny rate (it never arrives).
const T = 200, NOISE = 0.15;
const sharp = t => 1 + 4 * Math.exp(-t / 15);
const SCHED = [{ k: 'const', n: 'Constant' }, { k: 'step', n: 'Step drops' }, { k: 'cos', n: 'Cosine' }];

export default {
  slug: 'learning-rate-schedules',
  title: 'Learning rate schedules: fast, then careful',
  description: 'Training runs left to right along a valley that starts narrow and widens. The back wall shows the learning rate at every step against a red safe limit. Warm up gently, go fast in the middle, then slow down to settle at the bottom. Skip the warmup and it blows up; never slow down and it jitters forever.',
  overview: 'The learning rate is how big each training step is. One fixed value is a compromise: big steps cover ground quickly but bounce around the bottom, small steps settle precisely but take forever. A schedule changes the rate during training. Warmup starts small because the early landscape is sharp and the optimizer\'s estimates are fresh; then the rate stays high to make progress; then it decays, often along a cosine curve, so the last steps are small enough to settle. Most large models train with linear warmup followed by cosine decay.',
  keywords: ['learning rate schedule', 'cosine annealing', 'learning rate warmup', 'step decay', 'warmup cosine decay'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.75, -0.25], dir: [0.15, 0.95, 1.25], half: 2.3, wide: 7.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { sched: 'cos', peak: 1.2, warm: 30, t: 0 };
    const X0 = -3.1, XW = 6.2, ZS = 0.6, PMAX = 1.5;
    const X = t => X0 + t / T * XW, Z = p => Math.max(-PMAX, Math.min(PMAX, p)) * ZS;
    const Hs = (t, p) => 0.14 + Math.min(1.1, 0.5 * sharp(t) * p * p) * 0.5;
    /* ---------- the valley through time ---------- */
    const base = P.box(7.4, 0.12, 3.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, -0.25); S.add(base);
    const geo = new THREE.PlaneGeometry(XW, PMAX * 2 * ZS, 100, 40); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), lo = new THREE.Color('#2E5E7E'), hi = new THREE.Color('#E8E0C8'), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getX(i) + XW / 2) / XW * T, p = pos.getZ(i) / ZS;
      const edge = Math.abs(Math.abs(pos.getX(i)) - XW / 2) < 1e-4 || Math.abs(Math.abs(pos.getZ(i)) - PMAX * ZS) < 1e-4;
      pos.setX(i, pos.getX(i)); pos.setY(i, edge ? 0.12 : Hs(t, p));
      const u = Math.floor(Math.min(1, 0.5 * sharp(t) * p * p / 1.1) * 7) / 7; cc.copy(lo).lerp(hi, u); cols.set([cc.r, cc.g, cc.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); land.receiveShadow = true; S.add(land);
    const front = P.box(XW + 0.1, 0.16, 0.1, '#3B3F8F', { r: 0.03 }); front.position.set(0, 0.12, PMAX * ZS + 0.12); S.add(front);
    const frontT = S.text('start of training  →  →  →  end of training', { size: 0.09, weight: 800, face: 'front', color: '#FFFFFF', maxW: 6 }); frontT.position.set(0, 0.2, PMAX * ZS + 0.175); S.add(frontT);
    const frontTop = S.text('training steps', { size: 0.06, weight: 800, color: '#FFFFFF' }); frontTop.position.set(-2.4, 0.285, PMAX * ZS + 0.12); S.add(frontTop);
    const path = P.tube([V(), V(1, 0, 0)], 0.02, C.indigo); path.userData.noFit = true; S.add(path);
    const ball = P.ball(0.07, C.orange); ball.userData.noFit = true; S.add(ball);
    const boom = P.ball(0.13, C.red); boom.userData.noFit = true; boom.visible = false; S.add(boom);
    /* ---------- back wall: the schedule ---------- */
    const WZ = -1.45, WY = 0.12, WH = 1.75;
    const wall = P.box(XW + 0.4, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(0, WY, WZ); S.add(wall);
    const wallT = S.text('learning rate at each step', { size: 0.13, weight: 800, face: 'front', color: '#151827', maxW: 5 }); wallT.position.set(0, WY + WH - 0.16, WZ + 0.045); S.add(wallT);
    const wallTop = S.text('the schedule', { size: 0.07, weight: 800 }); wallTop.position.set(0, WY + WH + 0.005, WZ); S.add(wallTop);
    const GZ = WZ + 0.06, ly = lr => WY + 0.2 + Math.min(1.25, lr / 2) * 1.0;
    const limPts = []; for (let t = 0; t <= T; t += 4) limPts.push(V(X(t), ly(2 / sharp(t)), GZ));
    const limit = P.tube(limPts, 0.016, C.red); limit.userData.noFit = true; S.add(limit);
    const limT = S.text('safe limit: faster than this and steps overshoot', { size: 0.075, weight: 800, face: 'front', color: '#B23A2E', maxW: 3.2 }); limT.position.set(X(120), ly(2) + 0.09, GZ); S.add(limT);
    const zeroL = P.tube([V(X(0), ly(0), GZ - 0.01), V(X(T), ly(0), GZ - 0.01)], 0.007, '#B7B2A6'); zeroL.userData.noFit = true; S.add(zeroL);
    const lrLine = P.tube([V(), V(1, 0, 0)], 0.024, C.teal); lrLine.userData.noFit = true; S.add(lrLine);
    const now = P.ball(0.05, C.orange); now.userData.noFit = true; S.add(now);
    /* ---------- simulate ---------- */
    const lrAt = t => { const w = st.warm > 0 && t < st.warm ? (t + 1) / st.warm : 1, p = Math.max(0, t - st.warm) / Math.max(1, T - st.warm); let b = st.peak; if (st.sched === 'step') b *= p < 0.5 ? 1 : p < 0.75 ? 0.3 : 0.09; else if (st.sched === 'cos') b *= 0.5 * (1 + Math.cos(Math.PI * Math.min(1, p))); return w * b; };
    let run = null;
    function simulate() {
      let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
      let x = 0.8; const xs = [x]; let blew = -1, over = 0;
      for (let t = 0; t < T; t++) { const lr = lrAt(t); if (lr * sharp(t) > 2) over++; x = x - lr * (sharp(t) * x + NOISE * g()); xs.push(x); if (Math.abs(x) > PMAX) { blew = t; break; } }
      const tail = xs.slice(-20), loss = tail.reduce((a, v) => a + 0.5 * v * v, 0) / tail.length;
      run = { xs, blew, loss, over };
    }
    function draw() {
      simulate(); st.t = 0;
      const pts = run.xs.map((p, t) => V(X(t), Hs(t, Math.max(-PMAX, Math.min(PMAX, p))) + 0.02, Z(p)));
      path.geometry.dispose(); path.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 3, 0.02, 4, false);
      const lp = []; for (let t = 0; t < T; t++) lp.push(V(X(t), ly(lrAt(t)), GZ + 0.01));
      lrLine.geometry.dispose(); lrLine.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp, false, 'catmullrom', 0), T * 2, 0.024, 5, false);
      boom.visible = run.blew >= 0;
      if (run.blew >= 0) { const t = run.blew + 1, p = run.xs[t]; boom.position.set(X(t), Hs(t, PMAX) + 0.1, Z(p)); }
    }
    draw();
    function update(dt) {
      st.t = Math.min(run.xs.length - 1, st.t + dt * (S.reduced ? 400 : 60));
      const t = Math.floor(st.t), p = run.xs[t];
      ball.position.set(X(t), Hs(t, Math.max(-PMAX, Math.min(PMAX, p))) + 0.07, Z(p));
      now.position.set(X(t), ly(lrAt(Math.min(T - 1, t))), GZ + 0.04);
    }
    const fmt = v => (v < 0.01 ? v.toFixed(3) : v.toFixed(2));
    const controls = [
      { type: 'buttons', label: 'Schedule after warmup', options: SCHED.map(s => s.n), get: () => SCHED.findIndex(s => s.k === st.sched), act: i => { st.sched = SCHED[i].k; draw(); } },
      { type: 'slider', label: 'Peak learning rate', min: 0.005, max: 1.6, log: true, get: () => st.peak, set: v => { st.peak = v; draw(); }, fmt },
      { type: 'slider', label: 'Warmup steps', min: 0, max: 60, step: 1, get: () => st.warm, set: v => { st.warm = Math.round(v); draw(); } },
      { type: 'button', label: 'Train again', short: 'Train', act: () => { st.t = 0; } },
    ];
    const readouts = [
      { label: 'Final loss', get: () => (run.blew >= 0 ? { v: 'blew up', sub: `at step ${run.blew}`, bad: true } : { v: run.loss.toFixed(4), sub: 'last 20 steps', good: run.loss < 0.002, bad: run.loss > 0.008 }) },
      { label: 'Over the limit', get: () => ({ v: String(run.over), sub: 'steps of 200', good: run.over === 0, bad: run.over > 3 }) },
      { label: 'Final rate', get: () => ({ v: fmt(lrAt(T - 1)), sub: 'step 200' }) },
    ];
    const labels = [
      { name: 'valley', t: 'The loss, step by step', d: 'Narrow and sharp early, wide later', icon: 'wave', atV: V(X0, Hs(0, PMAX), -PMAX * ZS) },
      { name: 'path', t: 'The training path', d: 'Each kink is one step', icon: 'spark', atV: V(X(170), 0.2, PMAX * ZS) },
      { name: 'wall', t: 'The schedule', d: 'Teal: learning rate; red: safe limit', icon: 'scale', atV: V(XW / 2 + 0.2, ly(1), WZ) },
    ];
    const reset = () => { Object.assign(st, { sched: 'cos', peak: 1.2, warm: 30 }); draw(); };
    const breaks = [
      { label: 'No warmup, big rate', hint: 'Full speed from step one', on: () => { reset(); st.warm = 0; draw(); }, off: reset },
      { label: 'Never slow down', hint: 'Constant rate to the end', on: () => { reset(); st.sched = 'const'; draw(); }, off: reset },
      { label: 'Rate far too small', hint: 'Peak 0.005', on: () => { reset(); st.peak = 0.005; draw(); }, off: reset },
    ];
    function status() {
      if (run.blew >= 0) return { ok: false, msg: `<b>Blew up at step ${run.blew}.</b> Early in training the valley is narrow and steep, so the safe limit is low. The learning rate ${st.warm ? 'climbed over it before the valley widened' : 'started above it'}, and every step overshot further than the last until the ball flew out. ${st.warm ? 'Lower the peak or warm up for longer.' : 'Warmup starts small and grows, staying under the limit until the valley widens.'}` };
      if (run.loss > 0.008 && lrAt(T - 1) > 0.3) return { ok: false, msg: `<b>Jittering forever.</b> The rate is still ${fmt(lrAt(T - 1))} at the last step, so the noisy steps keep bouncing the ball from side to side around the bottom (final loss ${run.loss.toFixed(4)}). Slowing down at the end lets it settle.` };
      if (run.loss > 0.008) return { ok: false, msg: `<b>Never arrived.</b> With a peak of ${fmt(st.peak)} each step is tiny, and after 200 steps the ball is still on the valley wall (final loss ${run.loss.toFixed(4)}). Too small is as wasteful as too big.` };
      return { ok: true, msg: `<b>Settled at the bottom.</b> ${st.warm ? `${st.warm} warmup steps kept the rate under the safe limit while the valley was narrow, ` : 'The rate stayed under the safe limit, '}the middle made fast progress, and ${st.sched === 'const' ? 'the steady rate was small enough to settle' : 'the slowdown at the end let it settle'} (final loss ${run.loss.toFixed(4)}).` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Training as a journey', home: true, say: 'Training runs from left to right. The valley is the loss: narrow and sharp at the start, wider later. The ball\'s path shows every step.', act: m => m.set({ sched: 'cos', peak: 1.2, warm: 30 }), wait: 4 },
    { t: 'The schedule', home: true, say: 'The back wall shows the learning rate at every step. The red line is the safe limit: above it, each step overshoots the bottom by more than the last.', act: m => m.set({ sched: 'cos', peak: 1.2, warm: 30 }), wait: 3 },
    { t: 'No warmup', home: true, say: 'Start at full speed, and the rate is far over the limit while the valley is still narrow. The ball is thrown out on the very first steps.', act: m => m.set({ warm: 0 }), wait: 3 },
    { t: 'Never slowing down', home: true, say: 'Warm up, but then keep the rate constant. The ball reaches the bottom quickly, but keeps bouncing from side to side and never settles.', act: m => m.set({ sched: 'const', warm: 30 }), wait: 4 },
    { t: 'Step drops', home: true, say: 'One fix is to cut the rate in sudden steps. Each drop calms the bouncing a little more.', act: m => m.set({ sched: 'step', warm: 30 }), wait: 4 },
    { t: 'Warmup, then cosine', home: true, say: 'Most large models use warmup, then a smooth cosine curve down to almost nothing. Fast in the middle, careful at both ends.', act: m => m.set({ sched: 'cos', warm: 30 }), wait: 4 },
  ],
  check: [
    { q: 'Why start training with a warmup?', options: ['Early on the landscape is sharp, so big steps would overshoot and blow up', 'To save memory', 'Because the data is not loaded yet'], answer: 0, why: 'Warmup keeps the steps small until training has calmed down.' },
    { q: 'What happens if the learning rate never decreases?', options: ['The model keeps bouncing around the bottom instead of settling', 'It always blows up', 'Training stops early'], answer: 0, why: 'Noisy steps of the same size keep shaking it about the minimum.' },
    { q: 'What does cosine decay do?', options: ['Lowers the rate smoothly along a cosine curve towards zero', 'Raises the rate over time', 'Switches between two rates at random'], answer: 0, why: 'It spends most of training fast and slows smoothly at the end.' },
  ],
  terms: [
    ['Learning rate', 'How big each training step is.'],
    ['Schedule', 'A rule for changing the learning rate during training.'],
    ['Warmup', 'Starting with a small learning rate and raising it over the first steps.'],
    ['Step decay', 'Cutting the learning rate by a fixed factor at set points.'],
    ['Cosine decay', 'Lowering the learning rate smoothly along half a cosine wave.'],
    ['Divergence', 'When training runs away and the loss shoots up instead of down.'],
  ],
  deeper: '<p><b>Why is early training sharp?</b> At the start the weights are random and the loss surface around them curves steeply. Adaptive optimizers like Adam also have barely any history yet, so their step sizes are unreliable. A few hundred or thousand warmup steps cover both.</p><p><b>The 1cycle policy</b> ramps the rate up to a high peak and back down within a single run, sometimes training faster than cosine.</p><p><b>About this machine.</b> The valley here is a single direction with noisy slopes, and its sharpness is set to fall over time, so you can see the effect of each schedule clearly.</p>',
  code: {
    title: 'Warmup plus cosine decay',
    note: 'Adapted from the course\'s learning rate schedules lesson.',
    text: `
import math

def warmup_cosine(step, total=10_000, warmup=500, peak=3e-4, floor=0.0):
    if step < warmup:
        return peak * (step + 1) / warmup              # climb gently
    progress = (step - warmup) / (total - warmup)
    return floor + (peak - floor) * 0.5 * (1 + math.cos(math.pi * progress))

def step_decay(step, peak=0.1, every=3000, factor=0.3):
    return peak * factor ** (step // every)

for step in range(total_steps):
    lr = warmup_cosine(step)
    for group in optimizer.param_groups:
        group["lr"] = lr
    train_one_step()
`,
  },
};
