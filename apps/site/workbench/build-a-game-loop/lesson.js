// Build it yourself: a 3D game loop (after 3D Game Development with LWJGL, code Apache-2.0; our own words). A boat on a Lake Volta game. A real fixed-step loop separates simulation from drawing, with an accumulator. A ball really moves under each scheme; frame rate changes distance only in the naive one.
function sim(o) {
  const dt = 1 / 60, frame = 1 / o.fps, T = 2; let x = 0, v = 1.2, acc = 0, t = 0, updates = 0, frames = 0, spiral = false, jitter = 0;
  while (t < T) {
    t += frame; frames++;
    const step = o.mode === 'per' ? 1 / 60 : frame;
    if (o.mode === 'fixed') { acc += frame; let n = 0, capped = false; while (acc >= dt) { x += v * dt; acc -= dt; updates++; n++; if (o.heavy && n >= 3 && o.cap) { acc = 0; capped = true; break; } if (n > 500) break; } if (o.heavy && !capped) acc += n * dt * 1.2; if (o.heavy && !o.cap && n > 5) spiral = true; jitter = Math.max(jitter, acc); }
    else { x += v * step; updates++; }
  }
  return { x, updates, frames, spiral, jitter, expect: 2.4 };
}
function run(o) { return { ...sim(o), slow: sim({ ...o, fps: 20 }), fast: sim({ ...o, fps: 144 }) }; }

export default {
  slug: 'build-a-game-loop',
  title: 'Build your own game loop',
  description: 'Input, update, render, repeat. A fixed step keeps the world the same on every computer.',
  overview: 'A 3D game engine, under all its shaders, is a loop: read input, update the world, draw it. How you time the update matters. Move a boat a fixed amount per frame, and it goes twice as fast on a machine that draws twice as fast. Scale movement by the frame time, and the speed is right, but a slow frame makes a big jump, and things pass through walls. The usual answer is a fixed step. An accumulator collects real time, and the world updates in equal slices. Drawing runs at whatever rate it can. If updates ever fall behind, cap them, or the loop spirals. This really steps a boat across Lake Volta.',
  keywords: ['game loop', 'fixed timestep', 'game engine', 'delta time', 'rendering', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.8, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'fixed', fps: 60, heavy: false, cap: true }, st = { ...D0 };
    const BLUE = '#5B8DB8', GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const water = P.box(4.6, 0.02, 0.9, '#A9CBD9', { r: 0.02 }); water.position.set(0, 0.03, 0); S.add(water);
    const mk = (z, c) => { const b = P.box(0.3, 0.12, 0.2, c, { r: 0.05 }); b.position.set(-2.2, 0.05, z); b.userData.noFit = true; S.add(b); return b; };
    const A = mk(-0.28, BAD), B = mk(0, BLUE), C = mk(0.28, GOOD);
    const lamp = add(P.lamp('#3E9B5F', { h: 0.4, r: 0.1 })); lamp.position.set(2.1, 0.03, -0.62);
    S.add(P.keep(-2.45, 2.45, 0.6, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); [A, B, C].forEach((b, i) => { const x = [R.slow.x, R.x, R.fast.x][i]; b.userData.end = x; }); lamp.userData.set({ color: Math.abs(R.fast.x - R.slow.x) < 0.1 && !R.spiral ? '#3E9B5F' : '#D9483B', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const KM = ['per', 'delta', 'fixed'];
    const controls = [
      { type: 'buttons', label: 'Update', options: ['Per frame', 'Frame time', 'Fixed step'], get: () => KM.indexOf(st.mode), act: i => set({ mode: KM[i] }) },
      { type: 'slider', label: 'Frames per second', min: 15, max: 144, step: 1, get: () => st.fps, set: v => set({ fps: v }) },
      { type: 'toggle', label: 'Updates run slow', short: 'Heavy', get: () => st.heavy, set: v => set({ heavy: !!v }) },
      { type: 'toggle', label: 'Cap catch-up updates', short: 'Cap', get: () => st.cap, set: v => set({ cap: !!v }) },
    ];
    const readouts = [
      { label: 'Distance in two seconds', get: () => ({ v: R.x.toFixed(2), sub: `should be ${R.expect}`, good: Math.abs(R.x - R.expect) < 0.1, bad: Math.abs(R.x - R.expect) > 0.3 }) },
      { label: 'At 20, then 144 frames', get: () => ({ v: `${R.slow.x.toFixed(2)}, ${R.fast.x.toFixed(2)}` }) },
      { label: 'Updates, frames', get: () => ({ v: `${R.updates}, ${R.frames}` }) },
    ];
    const labels = [
      { name: 'a', t: 'Three boats, one lake', d: '20, your rate and 144 frames', icon: 'target', atV: V(-2.42, 0.08, 0) },
      { name: 'l', t: 'Same speed?', d: 'Green: all three agree', icon: 'check', atV: V(2.27, 0.3, -0.62) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Move per frame', hint: 'speed follows the machine', on: () => set({ ...D0, mode: 'per' }), off: reset },
      { label: 'Spiral', hint: 'no cap, with slow updates', on: () => set({ ...D0, heavy: true, cap: false, fps: 15 }), off: reset },
    ];
    function status() {
      if (R.spiral) return { ok: false, msg: '<b>Each frame needs more updates than it can run.</b> They take longer, so the next frame needs more still. Cap them.' };
      if (st.heavy && st.mode === 'fixed') return { ok: true, msg: `<b>The boat reached ${R.x.toFixed(2)}, not ${R.expect}.</b> The cap drops time, so the world drifts from real time. That beats freezing.` };
      if (st.mode === 'per') return { ok: false, msg: `<b>A fast machine sails ${R.fast.x.toFixed(2)}, and a slow one ${R.slow.x.toFixed(2)}.</b> Speed follows frame rate.` };
      if (st.mode === 'delta') return { ok: true, msg: `<b>The distance holds at ${R.x.toFixed(2)}.</b> Each slow frame is a big jump, so a fast boat could pass through a wall.` };
      return { ok: true, msg: `<b>${R.updates} equal updates in ${R.frames} frames.</b> The world doesn\'t depend on the machine.` };
    }
    let clk = 0;
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); clk = (clk + dt * 0.5) % 1; [A, B, C].forEach(b => { const e = Math.min(4.3, b.userData.end || 0); b.position.x = -2.2 + (e / 2.4) * clk * 1.75; }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One loop', home: true, say: 'A boat game on Lake Volta. Under the graphics, it\'s one loop: input, update, draw.', act: m => m.set({ mode: 'per', fps: 60, heavy: false, cap: true }) },
    { t: 'Per frame', home: true, say: 'Move per frame, and a fast machine sails further.', act: m => m.set({ mode: 'per', fps: 120, heavy: false, cap: true }) },
    { t: 'Frame time', home: true, say: 'Scale by frame time, and speed is right, but slow frames make big jumps.', act: m => m.set({ mode: 'delta', fps: 20, heavy: false, cap: true }) },
    { t: 'A fixed step', home: true, say: 'An accumulator collects time, and the world moves in equal slices.', act: m => m.set({ mode: 'fixed', fps: 60, heavy: false, cap: true }) },
    { t: 'Draw freely', home: true, say: 'Drawing runs at whatever rate it can, and the world doesn\'t change.', act: m => m.set({ mode: 'fixed', fps: 144, heavy: false, cap: true }) },
    { t: 'The spiral', home: true, say: 'If updates fall behind, cap them, or the loop spirals.', act: m => m.set({ mode: 'fixed', fps: 15, heavy: true, cap: false }) },
  ],
  check: [
    { q: 'What goes wrong moving per frame?', options: ['Speed follows the machine', 'It looks blurry', 'It uses more memory'], answer: 0, why: 'Faster drawing means more moves.', hint: 'Try Move per frame.' },
    { q: 'What does an accumulator do?', options: ['Collects time for equal updates', 'Adds scores', 'Stores textures'], answer: 0, why: 'Updates run in slices.', hint: 'See A fixed step.' },
    { q: 'What is the spiral?', options: ['Updates falling further behind', 'A camera move', 'A texture error'], answer: 0, why: 'Each frame needs more.', hint: 'Try Spiral.' },
  ],
  terms: [['Game loop', 'Input, update, render.'], ['Delta time', 'Time since the last frame.'], ['Fixed step', 'Equal update slices.'], ['Accumulator', 'Stored unspent time.']],
  deeper: '<p><b>Real stepping.</b> Each scheme really runs for two seconds of game time.</p><p><b>Smoothness.</b> Drawing often blends between the last two states.</p>',
  credit: 'Built from the code of <a href="https://lwjglgamedev.gitbooks.io/3d-game-development-with-lwjgl/content/" target="_blank" rel="noopener">3D Game Development with LWJGL 3</a> by Antonio Hernández Bejarano (code Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short loop, written for this lesson.',
  code: {
    title: 'A fixed step',
    note: 'Our own short version.',
    text: `
let last = now(), left = 0;
function loop() {
  const t = now();
  left += t - last; last = t;
  while (left >= STEP) { update(STEP); left -= STEP; }
  render();
  requestAnimationFrame(loop);
}
`,
  },
};
