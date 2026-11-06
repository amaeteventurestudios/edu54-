// Gradient descent: a ball feels the slope of an error landscape and steps downhill.
// Learning rate, momentum, many starts (local minima). Break it: steps too big, too small, the wrong valley.
const HALF = 4;
// the error landscape: a wide bowl with a deep valley and a smaller dip
const f = (x, z) => 0.06 * ((x - 0.6) ** 2 + 1.6 * (z - 0.3) ** 2) - 1.3 * Math.exp(-((x - 1.5) ** 2 + (z - 0.9) ** 2) / 1.2) - 0.75 * Math.exp(-((x + 1.9) ** 2 + (z + 1.3) ** 2) / 0.7) + 1.35;
const grad = (x, z) => { const e = 1e-3; return [(f(x + e, z) - f(x - e, z)) / (2 * e), (f(x, z + e) - f(x, z - e)) / (2 * e)]; };
const Y = 0.75;   // height per unit of error
// the outer slopes are drawn flatter than they are, so the corners don't tower over the valley
const show = e => Y * (e < 1.9 ? e : 1.9 + (e - 1.9) * 0.4);
const GLOBAL = [1.43, 0.84], LOCAL = [-1.76, -1.16];

export default {
  slug: 'gradient-descent',
  title: 'Gradient descent',
  description: 'Roll a ball down a hill of mistakes. See how a model learns by taking small steps downhill, and what happens when the steps are too big.',
  overview: 'Every model learns the same way: it measures how wrong it is, feels which way is downhill, and takes a small step. Here the hill is the model\'s error. Change the step size, add momentum, drop many balls, and break it.',
  keywords: ['gradient descent explained', 'learning rate', 'momentum', 'local minimum', 'optimization'],
  orient: 'any',
  view: { target: [0, 0.6, 0], dir: [1, 1.15, 1.35], half: 5.4, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    /* ---------- the landscape ---------- */
    const N = S.lite ? 70 : 110;
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const low = new THREE.Color('#7A2E1A'), mid = new THREE.Color('#D98A62'), high = new THREE.Color('#F4EFE2'), c = new THREE.Color();
    let ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < pos.count; i++) { const y = show(f(pos.getX(i), pos.getZ(i))); pos.setY(i, y); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    for (let i = 0; i < pos.count; i++) {
      // banded like a contour map: ten bands from the valley floor to the top
      const u = Math.floor((pos.getY(i) - ymin) / (ymax - ymin) * 10) / 10;
      if (u < 0.5) c.copy(low).lerp(mid, u * 2); else c.copy(mid).lerp(high, (u - 0.5) * 2);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    land.receiveShadow = true; land.castShadow = true;
    land.position.y = -ymin + 0.02;
    S.add(land);
    const lift = -ymin + 0.02;
    const hAt = (x, z) => show(f(x, z)) + lift;
    // a soil skirt so the landscape reads as a block
    const skirt = new THREE.Group();
    for (let s = 0; s < 4; s++) {
      const pts = [];
      for (let k = 0; k <= N; k++) { const u = -HALF + 2 * HALF * k / N; const [x, z] = [[u, HALF], [HALF, -u], [-u, -HALF], [-HALF, u]][s]; pts.push(x, hAt(x, z), z, x, 0, z); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const idx = []; for (let k = 0; k < N; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx); g.computeVertexNormals();
      skirt.add(new THREE.Mesh(g, P.mat('#9C6B45', { side: THREE.DoubleSide })));
    }
    S.add(skirt);

    /* ---------- the balls ---------- */
    const R = 0.2;
    const mkBall = col => { const b = P.ball(R, col); S.add(b); return b; };
    const me = { x: -3.1, z: 2.7, vx: 0, vz: 0, n: 0, still: 0, done: false, out: false, ball: mkBall(C.gold), from: null, k: 1 };
    const crowd = [];
    for (let i = 0; i < 12; i++) { const b = mkBall(i % 2 ? '#F7D27A' : '#FFFFFF'); b.scale.setScalar(0.7); b.visible = false; crowd.push({ ball: b, x: 0, z: 0, vx: 0, vz: 0, n: 0, still: 0, done: false, out: false, from: null, k: 1 }); }
    // the trail: where the gold ball has been
    const TR = 90, trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: C.gold }), TR);
    trail.count = 0; trail.layers.set(1); trail.userData.noMask = true; trail.frustumCulled = false; S.add(trail);
    const dummy = new THREE.Object3D();
    // the step arrow: which way is downhill and how far the next step goes
    const arr = P.arrow(V(), V(0, 0, 1), 0.045, C.red); arr.userData.noFit = true; S.add(arr);

    const st = { lr: 0.3, mom: false, many: false, broken: null };
    const STEP_T = 0.22;   // seconds per step on screen
    let acc = 0;
    function place(o) {
      const u = Math.min(1, o.k), x = o.from ? o.from[0] + (o.x - o.from[0]) * u : o.x, z = o.from ? o.from[1] + (o.z - o.from[1]) * u : o.z;
      const cx = Math.max(-HALF, Math.min(HALF, x)), cz = Math.max(-HALF, Math.min(HALF, z));
      const hop = o.from ? Math.sin(u * Math.PI) * Math.min(1.2, Math.hypot(o.x - o.from[0], o.z - o.from[1]) * 0.25) : 0;
      o.ball.position.set(cx, hAt(cx, cz) + R * o.ball.scale.x + hop, cz);
    }
    function stepOne(o) {
      if (o.done || o.out) return;
      const [gx, gz] = grad(o.x, o.z);
      if (st.mom) { o.vx = 0.85 * o.vx + gx; o.vz = 0.85 * o.vz + gz; } else { o.vx = gx; o.vz = gz; }
      o.from = [o.x, o.z]; o.k = 0;
      o.x -= st.lr * o.vx; o.z -= st.lr * o.vz; o.n++;
      if (Math.abs(o.x) > HALF || Math.abs(o.z) > HALF || !Number.isFinite(o.x)) { o.out = true; o.x = Math.max(-HALF, Math.min(HALF, o.x)); o.z = Math.max(-HALF, Math.min(HALF, o.z)); }
      const moved = Math.hypot(o.x - o.from[0], o.z - o.from[1]);
      o.still = moved < 0.004 ? o.still + 1 : 0;
      if (o.still > 4 || o.n > 400) o.done = true;
    }
    function drop(o, x, z) { Object.assign(o, { x, z, vx: 0, vz: 0, n: 0, still: 0, done: false, out: false, from: null, k: 1 }); place(o); }
    function dropMe(x = -3.1, z = 2.7) { drop(me, x, z); trail.count = 0; }
    function dropCrowd() { crowd.forEach((o, i) => { const a = i / crowd.length * Math.PI * 2; drop(o, Math.cos(a) * 3.3 + Math.sin(i * 7.1) * 0.4, Math.sin(a) * 3.3 + Math.cos(i * 3.3) * 0.4); }); }
    dropMe(); dropCrowd();
    const where = o => Math.hypot(o.x - GLOBAL[0], o.z - GLOBAL[1]) < 0.5 ? 'global' : Math.hypot(o.x - LOCAL[0], o.z - LOCAL[1]) < 0.6 ? 'local' : 'slope';

    // tap anywhere on the landscape to drop the ball there
    S.tap(land, hit => { dropMe(hit.point.x, hit.point.z); });

    function update(dt) {
      acc += dt;
      const sp = S.reduced ? 1 : dt / STEP_T;
      for (const o of [me, ...crowd]) if (o.k < 1) { o.k = Math.min(1, o.k + sp); place(o); }
      while (acc >= STEP_T) {
        acc -= STEP_T;
        stepOne(me);
        if (me.from && !me.out && trail.count < TR) { dummy.position.set(me.from[0], hAt(me.from[0], me.from[1]) + 0.06, me.from[1]); dummy.updateMatrix(); trail.setMatrixAt(trail.count++, dummy.matrix); trail.instanceMatrix.needsUpdate = true; }
        if (st.many) for (const o of crowd) stepOne(o);
      }
      for (const o of crowd) o.ball.visible = st.many;
      // the arrow points downhill from the ball, as long as the next step
      const [gx, gz] = grad(me.x, me.z), gl = Math.hypot(gx, gz);
      arr.visible = !me.done && !me.out && gl > 1e-3;
      if (arr.visible) {
        const len = Math.min(2.4, Math.max(0.35, st.lr * gl * 1.0 + 0.3)), dx = -gx / gl * len, dz = -gz / gl * len;
        const a = V(me.ball.position.x, me.ball.position.y + 0.02, me.ball.position.z);
        const ex = Math.max(-HALF, Math.min(HALF, a.x + dx)), ez = Math.max(-HALF, Math.min(HALF, a.z + dz));
        P.setArrow(arr, a, V(ex, Math.max(hAt(ex, ez) + 0.15, a.y - 0.4), ez));
      }
    }

    const err = o => f(o.x, o.z);
    const controls = [
      { type: 'slider', label: 'Step size (learning rate)', min: 0.005, max: 5, log: true, get: () => st.lr, set: v => { st.lr = v; if (me.done || me.out) dropMe(); }, fmt: v => v.toFixed(v < 0.1 ? 3 : 2), hint: 'How far the ball moves on each step' },
      { type: 'button', label: 'Drop the ball again', short: 'Drop again', act: () => { dropMe(); dropCrowd(); } },
      { type: 'toggle', label: 'Momentum', get: () => st.mom, set: v => { st.mom = v; }, hint: 'Keep some speed from the last steps' },
      { type: 'toggle', label: 'Drop 12 balls at once', short: '12 balls', get: () => st.many, set: v => { st.many = v; if (v) dropCrowd(); } },
    ];
    const readouts = [
      { label: 'Error', get: () => ({ v: err(me).toFixed(2), bar: Math.min(1, err(me) / 2.2), good: me.done && where(me) === 'global' }), bar: true },
      { label: 'Steps', get: () => ({ v: me.n, sub: me.done ? 'stopped' : me.out ? 'flew off' : 'walking' }) },
    ];
    const labels = [
      { name: 'ball', t: 'The model\'s guess', d: 'It only feels the slope under it', icon: 'target', at: () => me.ball.position.clone().add(V(0, 0.2, 0)) },
      { name: 'arrow', t: 'Next step', d: 'Downhill, as far as the learning rate says', icon: 'spark', at: () => arr.userData.head.position.clone(), hide: () => !arr.visible, phone: false },
      { name: 'valley', t: 'Lowest error', d: 'The best the model can do', icon: 'check', atV: V(GLOBAL[0], hAt(...GLOBAL), GLOBAL[1]) },
      { name: 'dip', t: 'A smaller dip', d: 'A local minimum: easy to get stuck in', icon: 'info', atV: V(LOCAL[0], hAt(...LOCAL), LOCAL[1]) },
    ];
    const breaks = [
      { label: 'Steps too big', hint: 'Learning rate 4', on: () => { st.lr = 4; st.mom = false; dropMe(); }, off: () => { st.lr = 0.3; dropMe(); } },
      { label: 'Steps too small', hint: 'Learning rate 0.006', on: () => { st.lr = 0.006; st.mom = false; dropMe(); }, off: () => { st.lr = 0.3; dropMe(); } },
      { label: 'Start in the wrong valley', hint: 'Drop it near the small dip', on: () => { st.lr = 0.3; st.mom = false; dropMe(-2.9, -2.3); }, off: () => { dropMe(); } },
    ];
    function status() {
      const e = err(me).toFixed(2), w = where(me);
      if (me.out) return { ok: false, msg: `<b>Too big a step.</b> The ball jumped right over the valley and flew off the hill. Turn the learning rate down.` };
      if (me.done && w === 'global') return { ok: true, msg: `<b>Found the bottom</b> in ${me.n} steps. Error ${e}: the best this model can do.` };
      if (me.done && w === 'local') return { ok: false, msg: `<b>Stuck in a smaller dip.</b> Error ${e}. Every way out goes uphill, so plain gradient descent stops here. Try momentum.` };
      if (me.done && st.lr < 0.02) return { ok: false, msg: `<b>Tiny steps.</b> Each step moved the ball so little that it stopped after ${me.n} steps, still high on the slope (error ${e}). With a learning rate this small, learning would take forever. Turn it up.` };
      if (me.done) return { ok: false, msg: `<b>Stopped on the slope</b> after ${me.n} steps (error ${e}). The steps got too small to count while the ground still slopes. A bigger step or momentum would carry it on.` };
      if (st.lr < 0.02 && me.n > 25) return { ok: false, msg: `<b>Tiny steps.</b> ${me.n} steps and it has hardly moved. Learning would take forever.` };
      if (st.lr > 1.4) return { msg: `<b>Big steps:</b> the ball is jumping back and forth across the valley. Error ${e}.` };
      return { msg: `<b>Step ${me.n}:</b> feel the slope, step downhill. Error ${e}. Tap the hill to drop the ball somewhere else.` };
    }
    return {
      update, controls, readouts, labels, breaks, status,
      reset: () => { st.lr = 0.3; st.mom = false; st.many = false; dropMe(); },
      set: p => { Object.assign(st, p); }, drop: dropMe, dropCrowd,
    };
  },

  story: [
    { t: 'A hill of mistakes', home: true, say: 'This hill is a model\'s error. High ground means bad guesses. The valley floor means good ones. Learning means getting down the hill.', act: m => m.drop() },
    { t: 'The ball is the guess', focus: 'ball', say: 'The gold ball is the model\'s guess right now. It cannot see the valley. It only feels the slope under its feet, like walking down a hill in thick harmattan haze.' },
    { t: 'Step downhill', focus: 'arrow', say: 'The slope is called the gradient. On every step the ball moves a little in the downhill direction. Step, feel again, step again.', act: m => { m.set({ lr: 0.3 }); m.drop(); } },
    { t: 'Step size', home: true, say: 'How far it moves on each step is the learning rate. Small steps are slow but steady. Watch it creep down.', act: m => { m.set({ lr: 0.06 }); m.drop(); }, wait: 7 },
    { t: 'Too big', home: true, say: 'Now make the steps too big. The ball jumps over the valley, lands higher up, and flies off the hill. The model gets worse, not better.', act: m => { m.set({ lr: 4 }); m.drop(); }, wait: 6 },
    { t: 'More than one valley', focus: 'dip', zoom: 1.3, say: 'Real error hills have many dips. Drop twelve balls and some get stuck in the small one. That is called a local minimum.', act: m => { m.set({ lr: 0.3, many: true }); m.drop(); m.dropCrowd(); }, wait: 6 },
    { t: 'Momentum', home: true, say: 'Momentum helps. The ball keeps some speed from its last steps, so it can roll through a small dip. Real models do exactly this, with millions of numbers, one small step at a time.', act: m => { m.set({ mom: true }); m.drop(); m.dropCrowd(); }, wait: 6 },
  ],

  check: [
    { q: 'What does the gradient tell the model?', options: ['Which way is uphill, so it can step the other way', 'Where the lowest point is', 'How many steps are left'], answer: 0, why: 'The gradient is the slope under the ball. The model steps the opposite way, downhill.' },
    { q: 'You set the learning rate very high. What happens?', options: ['It finds the bottom faster every time', 'It overshoots the valley and can fly off', 'Nothing changes'], answer: 1, why: 'Big steps jump over the valley and can land higher up each time. The error grows.' },
    { q: 'A ball stops in a small dip that is not the lowest point. That dip is a…', options: ['Global minimum', 'Gradient', 'Local minimum'], answer: 2, why: 'A local minimum: every way out goes uphill. Momentum or a new start can help.' },
  ],
  terms: [
    ['Loss (error)', 'One number for how wrong the model is. Lower is better.'],
    ['Gradient', 'The slope of the loss: which way, and how steeply, it goes up.'],
    ['Learning rate', 'How far the model moves on each step.'],
    ['Local minimum', 'A dip that is lower than everything around it, but not the lowest point.'],
    ['Momentum', 'Keeping part of the last step\'s direction, so the ball rolls through small bumps.'],
  ],
  deeper: '<p><b>Adam</b>, the most used optimiser today, gives every number its own step size: it remembers the average slope and how bumpy it has been, and takes careful steps where the slope keeps changing.</p><p><b>Schedules</b> start with big steps and shrink them over time, so the model moves fast early and settles gently at the end.</p><p><b>Stochastic</b> gradient descent feels the slope from a small batch of examples, not all of them. The steps are noisier, but much cheaper, and the noise can even shake the ball out of small dips.</p>',
  code: {
    title: 'Gradient descent and momentum in Python',
    note: 'The same two rules the ball follows. <code>grads</code> is the slope; <code>lr</code> is the learning rate.',
    text: `
class GradientDescent:
    def __init__(self, lr=0.1):
        self.lr = lr

    def step(self, params, grads):
        # move every number a little way downhill
        return [p - self.lr * g for p, g in zip(params, grads)]


class Momentum:
    def __init__(self, lr=0.1, momentum=0.85):
        self.lr = lr
        self.momentum = momentum
        self.velocity = None

    def step(self, params, grads):
        if self.velocity is None:
            self.velocity = [0.0] * len(params)
        # keep some of the last step, add the new slope
        self.velocity = [self.momentum * v + g
                         for v, g in zip(self.velocity, grads)]
        return [p - self.lr * v for p, v in zip(params, self.velocity)]
`,
  },
};
