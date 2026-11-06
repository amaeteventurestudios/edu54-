// Intro to JAX: a pure function travels through three transformation stations: grad (make its gradient), jit (compile it), vmap (run it on a whole batch at once).
// On the right, an explicit random key splits into three subkeys, each making one dropout mask.
// The back wall times 100 training calls, and counts how many times jit had to compile.
// Break it: reuse one random key (every mask is identical), change the batch size every call (jit recompiles every time), loop in Python instead of vmap (one example at a time).
const CALLS = 100, BATCH = 8, MASK = 6;

export default {
  slug: 'intro-to-jax',
  title: 'JAX: grad, jit, vmap and random keys',
  description: 'A pure function rides through three stations: grad, jit, vmap. Random numbers come from keys you split by hand; reuse one, or change the shape, and watch the clock.',
  overview: 'JAX looks like NumPy, but it works by transforming functions. grad takes a function and returns a new function that computes its gradient. jit traces a function once and compiles it into fast code for the CPU, GPU or TPU, recompiling only when the input shapes change. vmap turns a function written for one example into one that handles a whole batch in parallel. Because everything must be a pure function, random numbers come from explicit keys: you split a key to get fresh ones, and the same key always gives the same numbers.',
  keywords: ['jax tutorial', 'jax jit vmap grad', 'jax random keys', 'jax recompilation', 'functional deep learning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.65, 0], dir: [0.15, 0.8, 1.3], half: 2.0, wide: 7.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { jit: true, vmap: true, split: true, fixedShape: true, clock: 0 };
    const ink = '#151827';
    const track = P.box(4.6, 0.06, 1.1, '#CFC6B4', { r: 0.05 }); track.position.set(-1.0, 0.12, 0.45); floor.add(track);
    /* ---------- the pure function ---------- */
    const FX = -3.0, fn = P.box(0.75, 0.5, 0.75, '#F7F5EE', { r: 0.06 }); fn.position.set(FX, 0.12, 0.45); floor.add(fn);



    /* ---------- three stations ---------- */
    const station = (x, name, sub, color) => {
      const l = P.box(0.12, 0.9, 1.0, color, { r: 0.03 }), r = P.box(0.12, 0.9, 1.0, color, { r: 0.03 }), top = P.box(0.9, 0.14, 1.0, color, { r: 0.04 });
      l.position.set(x - 0.39, 0.18, 0.45); r.position.set(x + 0.39, 0.18, 0.45); top.position.set(x, 1.08, 0.45); [l, r, top].forEach(m => floor.add(m));
      return { l, r, top };
    };
    const SG = -1.9, SJ = -0.75, SV = 0.4;
    station(SG, 'grad', 'its gradient', C.orange);
    const jitSt = station(SJ, 'jit', 'compile once', C.red);
    const vmapSt = station(SV, 'vmap', 'whole batch', C.teal);
    const furnaceMat = new THREE.MeshLambertMaterial({ color: '#F2C94C', emissive: '#000000' });
    const furnace = P.box(0.5, 0.2, 0.6, '#F2C94C', { r: 0.04, material: furnaceMat }); furnace.position.set(SJ, 0.18, 0.45); floor.add(furnace);

    const offT = (x, s) => {     return t; };
    const jitOff = offT(SJ, 'skipped'), vmapOff = offT(SV, 'Python loop');
    /* the batch: eight examples flowing through */
    const balls = [...Array(BATCH)].map((_, i) => { const b = P.ball(0.055, i % 2 ? C.gold : C.orange); b.userData.noFit = true; floor.add(b); return b; });
    /* ---------- random keys ---------- */
    const KX = 2.3, KZ = 0.35;
    const root = P.box(0.42, 0.3, 0.42, C.plum, { r: 0.05 }); root.position.set(KX, 0.12, KZ - 0.85); floor.add(root);


    const subs = [-0.65, 0, 0.65].map((dx, k) => {
      const b = P.box(0.3, 0.22, 0.3, C.plum, { r: 0.04 }); b.position.set(KX + dx, 0.12, KZ); floor.add(b);
      const wire = P.tube([V(KX, 0.3, KZ - 0.65), V(KX + dx, 0.34, KZ - 0.15)], 0.015, '#8A3F8E'); wire.userData.noFit = true; floor.add(wire);
      const tile = P.box(0.55, 0.05, 0.55, '#F7F5EE', { r: 0.03 }); tile.position.set(KX + dx, 0.12, KZ + 0.6); floor.add(tile);
      const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.02, 0.07), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MASK * MASK);
      cells.userData.noFit = true; floor.add(cells);
      return { b, tile, cells, dx };
    });

    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- back wall: the stopwatch ---------- */
    const WZ = -1.25, WY = 0.12, WW = 4.4, WH = 1.25, WX = -0.9;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, WY, WZ); floor.add(wall);


    const BX0 = WX - WW / 2 + 0.25, BW = WW - 0.5, BZ = WZ + 0.06;
    const lane = (y, label, color) => {
      const bg = P.box(BW, 0.16, 0.02, '#E6E1D6', { r: 0 }); bg.position.set(BX0 + BW / 2, y, BZ - 0.01); bg.userData.noFit = true; floor.add(bg);
      const m = new THREE.MeshLambertMaterial({ color }); const b = P.box(1, 0.16, 0.03, color, { r: 0, material: m }); b.userData.noFit = true; floor.add(b);
      return { b, m, y };
    };
    const compBar = lane(WY + 0.72, 'compiling', C.red), runBar = lane(WY + 0.32, 'running', C.teal);
    /* ---------- the cost model ---------- */
    const cost = () => {
      const compiles = st.jit ? (st.fixedShape ? 1 : CALLS) : 0;
      const compileMs = compiles * 150;
      const perExample = st.jit ? 1.15 : 4.8;   // each Python-side call pays dispatch overhead
      const run = CALLS * (st.vmap ? (st.jit ? 0.4 : 4.8 + 0.4) : BATCH * perExample);
      return { compiles, compileMs, run, total: compileMs + run };
    };
    let seedBase = 0;
    function masks() {
      subs.forEach((s, k) => {
        let seed = 1234 + (st.split ? k * 7919 : 0); const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < MASK * MASK; i++) {
          const on = r() > 0.4, gx = i % MASK, gz = Math.floor(i / MASK);
          dummy.position.set(KX + s.dx - 0.21 + gx * 0.084, 0.18, KZ + 0.6 - 0.21 + gz * 0.084); dummy.updateMatrix();
          s.cells.setMatrixAt(i, dummy.matrix); s.cells.setColorAt(i, col.set(on ? '#2F3C8F' : '#E6E1D6'));
        }
        s.cells.instanceMatrix.needsUpdate = true; s.cells.instanceColor.needsUpdate = true;
      });
    }
    const fmtMs = ms => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
    function draw() {
      const c = cost(), scale = ms => Math.max(0.01, Math.min(1, Math.log10(1 + ms) / Math.log10(1 + 30000))) * BW;
      [[compBar, c.compileMs], [runBar, c.run]].forEach(([bar, ms]) => { const w = scale(ms); bar.b.scale.x = w; bar.b.position.set(BX0 + w / 2, bar.y - 0.08, BZ);   });
      furnace.visible = st.jit;
      masks();
    }
    draw();
    function update(dt) {
      st.clock += dt;
      const per = S.reduced ? 1 : 2.4, ph = (st.clock % per) / per, x0 = FX + 0.45, x1 = SV + 0.7;
      balls.forEach((b, i) => {
        // vmap: all eight side by side at once; Python loop: one after another in single file
        const u = st.vmap ? ph : Math.max(0, Math.min(1, ph * BATCH - i * 0.85 * (BATCH - 1) / (BATCH - 1) * 0.95));
        const z = st.vmap ? 0.45 - 0.35 + i * 0.1 : 0.45;
        b.position.set(x0 + (x1 - x0) * u, 0.24 + 0.05 * Math.sin(u * 12), z);
        b.visible = st.vmap || (u > 0 && u < 1);
      });
      const hot = st.jit && (!st.fixedShape || (st.clock % 9) < 0.9);
      furnaceMat.emissive.set(hot ? '#B23A00' : '#000000');
    }
    const controls = [
      { type: 'toggle', label: 'jit: compile the training step', short: 'jit', get: () => st.jit, set: v => { st.jit = v; draw(); } },
      { type: 'toggle', label: 'vmap over the batch', short: 'vmap', get: () => st.vmap, set: v => { st.vmap = v; draw(); } },
      { type: 'toggle', label: 'Split the key for each mask', short: 'split', get: () => st.split, set: v => { st.split = v; draw(); } },
      { type: 'toggle', label: 'Same batch shape every call', short: 'same shape', get: () => st.fixedShape, set: v => { st.fixedShape = v; draw(); } },
    ];
    const readouts = [
      { label: '100 calls', get: () => { const c = cost(); return { v: fmtMs(c.total), good: c.total < 400, bad: c.total > 2000 }; } },
      { label: 'Compiles', get: () => { const c = cost(); return { v: String(c.compiles), sub: st.jit ? 'traced and compiled' : 'jit is off', bad: c.compiles > 1 }; } },
      { label: 'Masks', get: () => ({ v: st.split ? 'different' : 'identical', bad: !st.split, good: st.split }) },
    ];
    const labels = [
      { name: 'fn', t: 'A pure function', d: 'Same inputs, same output, no side effects', icon: 'box', atV: V(FX - 0.38, 0.4, 0.45) },
      { name: 'stations', t: 'Transformations', d: 'Each takes a function, returns a function', icon: 'link', atV: V(SG - 0.45, 0.4, 0.45) },
      { name: 'keys', t: 'Random keys', d: 'Split a key to get fresh randomness', icon: 'spark', atV: V(KX + 0.95, 0.25, KZ) },
      { name: 'clock', t: 'The stopwatch', d: 'Compiling and running, 100 calls', icon: 'scale', atV: V(WX + WW / 2, WY + WH * 0.5, WZ) },
    ];
    const reset = () => { Object.assign(st, { jit: true, vmap: true, split: true, fixedShape: true }); draw(); };
    const breaks = [
      { label: 'Reuse one random key', hint: 'No split', on: () => { reset(); st.split = false; draw(); }, off: reset },
      { label: 'Batch size changes every call', hint: 'A new shape each time', on: () => { reset(); st.fixedShape = false; draw(); }, off: reset },
      { label: 'Python loop instead of vmap', hint: 'One example at a time', on: () => { reset(); st.vmap = false; draw(); }, off: reset },
    ];
    function status() {
      const c = cost();
      if (!st.split) return { ok: false, msg: `<b>Every mask is identical.</b> JAX random numbers are pure: the same key always gives the same numbers. Reusing one key for all three dropout masks switches off exactly the same neurons every time, which is no dropout at all. Split the key and use each subkey once.` };
      if (st.jit && !st.fixedShape) return { ok: false, msg: `<b>Compiling every call.</b> jit compiles for one exact input shape. With the batch size changing on every call, it traces and compiles all over again ${c.compiles} times, so 100 calls take ${fmtMs(c.total)}, most of it compiling. Pad batches to one size, or drop the last uneven batch.` };
      if (!st.vmap) return { ok: false, msg: `<b>One at a time.</b> A Python loop sends the ${BATCH} examples through one after another, so 100 calls take ${fmtMs(c.total)}. vmap rewrites the function to handle the whole batch in one go, side by side.` };
      if (!st.jit) return { ok: false, msg: `<b>Running uncompiled.</b> Without jit, every operation is sent to the device separately, with Python overhead each time: 100 calls take ${fmtMs(c.total)}. Compiling once fuses them into one fast program.` };
      return { ok: true, msg: `<b>Fast and correct.</b> grad builds the gradient function, jit compiled it once (150 ms) and vmap runs all ${BATCH} examples together, so 100 calls take ${fmtMs(c.total)}. Each mask used its own subkey, so all three are different.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A pure function', home: true, say: 'In JAX you write plain functions: given the same inputs, they always return the same output and change nothing else. Here, the loss of a small model.', act: m => m.set({ jit: true, vmap: true, split: true, fixedShape: true }) },
    { t: 'grad, jit, vmap', home: true, say: 'Then you transform them. grad gives a new function that returns the gradient. jit compiles it into one fast program. vmap makes it work on a whole batch at once.', act: m => m.set({}), wait: 3 },
    { t: 'Compile once', home: true, say: 'jit traces the function once for one input shape, then reuses the compiled code. Change the batch size every call, and it has to compile all over again, every time.', act: m => m.set({ fixedShape: false }), wait: 3 },
    { t: 'The whole batch', home: true, say: 'Without vmap, a Python loop sends the examples through in single file. With it, all eight go through side by side.', act: m => m.set({ fixedShape: true, vmap: false }), wait: 4 },
    { t: 'Random keys', home: true, say: 'Random numbers come from keys. The same key always gives the same numbers, so you split a key into fresh subkeys, one for each use.', act: m => m.set({ vmap: true, split: true }), wait: 3 },
    { t: 'Reusing a key', home: true, say: 'Reuse one key for every dropout mask, and the masks come out identical: the same neurons switched off every time.', act: m => m.set({ split: false }), wait: 3 },
  ],
  check: [
    { q: 'What does jax.jit do?', options: ['Traces a function once and compiles it into fast code, reused for the same input shapes', 'Computes the gradient', 'Splits a random key'], answer: 0, why: 'A new input shape means a new trace and compile.' },
    { q: 'What does vmap do?', options: ['Turns a function for one example into one for a whole batch', 'Makes the function slower but safer', 'Moves data to the GPU'], answer: 0, why: 'It adds a batch dimension without a Python loop.' },
    { q: 'Why must you split a JAX random key?', options: ['The same key always gives the same numbers', 'Keys expire after one use', 'Splitting makes numbers bigger'], answer: 0, why: 'Randomness is pure in JAX, so fresh numbers need fresh subkeys.' },
  ],
  terms: [
    ['Pure function', 'A function whose output depends only on its inputs, with no side effects.'],
    ['grad', 'A JAX transformation that returns a function computing the gradient.'],
    ['jit', 'Just-in-time compilation: trace once, compile, reuse.'],
    ['vmap', 'Automatic vectorisation over a batch dimension.'],
    ['PRNG key', 'An explicit seed for random numbers; split it to get new ones.'],
    ['Tracing', 'Running a function with placeholder values to record its operations.'],
  ],
  deeper: '<p><b>Side effects vanish under jit.</b> A print or a change to a global list runs only while tracing, not on later calls, because the compiled code only contains the array maths.</p><p><b>Pytrees.</b> JAX treats nested lists, tuples and dictionaries of arrays as one structure, so a whole model\'s parameters can be passed, differentiated and updated as a single value.</p><p><b>Libraries.</b> Flax and Equinox add model building blocks on top of JAX, and Optax provides optimizers you can chain together.</p>',
  code: {
    title: 'grad, jit, vmap and keys',
    note: 'Adapted from the course\'s introduction to JAX.',
    text: `
import jax, jax.numpy as jnp

def loss(params, x, y):
    w, b = params
    return jnp.mean((x @ w + b - y) ** 2)

grad_fn = jax.jit(jax.grad(loss))       # gradient, compiled once per shape

@jax.jit
def step(params, x, y, lr=0.1):
    g = grad_fn(params, x, y)
    return [p - lr * gp for p, gp in zip(params, g)]

per_example = jax.vmap(loss, in_axes=(None, 0, 0))   # one loss per example

key = jax.random.PRNGKey(0)
key, k1, k2 = jax.random.split(key, 3)   # fresh subkeys, each used once
mask1 = jax.random.bernoulli(k1, 0.6, (6, 6))
mask2 = jax.random.bernoulli(k2, 0.6, (6, 6))
`,
  },
};
