// Tensors: a batch of 4 tiny images, each 3 × 4 numbers, as a block of 48 numbered cubes, and the same 48 numbers as they sit in memory.
// Reshape reads memory in order into a new shape; transpose swaps two axes; broadcasting stretches a small tensor across a big one.
// Break it: add a bias whose shape doesn't line up, and reshape when you meant to transpose.
const B = 4, R = 3, Cn = 4, N = B * R * Cn, SP = 0.36;
const ROWCOL = ['#3D6BD6', '#3E9B5F', '#EE7434'];

export default {
  slug: 'tensors',
  title: 'Tensors: shapes, reshape and broadcasting',
  description: 'Hold a batch of four tiny images as a block of 48 numbered cubes and watch the same numbers sit in a single line of memory. Reshape, transpose and broadcast them, then make the shapes disagree.',
  overview: 'A tensor is a grid of numbers with any number of axes: a batch of images is (batch, rows, columns). In memory it is one long line; the shape only says how to read it. Reshape reads that line in order into a new shape. Transpose swaps two axes, so the numbers land somewhere new. Broadcasting stretches a small tensor, such as a bias, across a big one without copying it, as long as the trailing sizes line up.',
  keywords: ['tensor shapes explained', 'reshape vs transpose', 'numpy broadcasting', 'tensor operations', 'einsum'],
  orient: 'any',
  view: { target: [0.2, 0.6, 0.3], dir: [0.85, 0.8, 1.4], half: 3, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { op: 'start', bias: false, badBias: false, u: 1 };
    /* ---------- the 48 cubes ---------- */
    const cubes = [...Array(N)].map((_, e) => {
      const b = Math.floor(e / (R * Cn)), r = Math.floor(e / Cn) % R;
      const g = new THREE.Group(); g.userData.noFit = true; S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: ROWCOL[r] });
      const box = P.box(0.3, 0.3, 0.3, ROWCOL[r], { r: 0.04, material: m }); box.position.y = -0.15; g.add(box);
      const t = S.text(String(e), { size: 0.13, weight: 800, color: '#FFFFFF', maxW: 0.27 }); t.position.y = 0.155; g.add(t);
      const f = S.text(String(e), { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 0.27 }); f.position.set(0, 0, 0.152); g.add(f);
      return { g, m, b, r, c: e % Cn, from: V(), to: V() };
    });
    const floor = P.box(4.6, 0.1, 2.6, '#F1EEE6', { r: 0.1 }); floor.position.set(0.3, 0, -0.3); S.add(floor);
    /* ---------- memory: one line ---------- */
    const mem = P.box(N * 0.105 + 0.2, 0.08, 0.32, '#2C2D31', { r: 0.04 }); mem.position.set(0.3, 0, 1.75); S.add(mem);
    const cells = [...Array(N)].map((_, e) => { const r = Math.floor(e / Cn) % R; const t = P.tile(String(e), 0.095, 0.06, 0.24, ROWCOL[r], { size: 0.07, ink: '#FFFFFF' }); t.position.set(0.3 - N * 0.105 / 2 + 0.0525 + e * 0.105, 0.08, 1.75); S.add(t); return t; });
    const memT = S.text('MEMORY: ONE LINE OF 48 NUMBERS', { size: 0.11, face: 'front', weight: 800, color: '#FFFFFF', maxW: 4 }); memT.position.set(0.3, 0.04, 1.915); S.add(memT);
    const shapeT = S.text('', { size: 0.16, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, font: '"JetBrains Mono", monospace', maxW: 3 }); shapeT.position.set(0.3, 2.35, -0.3); shapeT.userData.noFit = true; S.add(shapeT);
    /* ---------- the bias, and its broadcast ghosts ---------- */
    const biasN = () => st.badBias ? 3 : 4;
    const bias = [...Array(4)].map((_, k) => { const t = P.tile('+1', 0.3, 0.12, 0.3, C.gold, { size: 0.12 }); t.userData.noFit = true; S.add(t); return t; });
    const ghosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.31, 0.31, 0.31), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.28, depthWrite: false }), N);
    ghosts.userData.noFit = true; S.add(ghosts);
    const dummy = new THREE.Object3D();
    // where element e sits for the current view: batch along depth, rows up, columns across
    function place(e) {
      const c = cubes[e];
      let b = c.b, r = c.r, col = c.c, rows = R, cols = Cn;
      if (st.op === 'reshape12') { const k = e % (R * Cn); r = 0; col = k; rows = 1; cols = 12; }
      if (st.op === 'transpose') { [r, col] = [c.c, c.r]; rows = Cn; cols = R; }
      if (st.op === 'reshape43') { const k = e % (R * Cn); r = Math.floor(k / R); col = k % R; rows = Cn; cols = R; }
      const w = cols * SP;
      return V(0.3 - w / 2 + SP * (col + 0.5), 0.45 + (rows - 1 - r) * SP, -1.25 + b * 0.62);
    }
    const shapeOf = () => ({ start: '(4, 3, 4)', reshape12: '(4, 12)', transpose: '(4, 4, 3)', reshape43: '(4, 4, 3)' })[st.op];
    function go(op) { st.op = op; st.u = 0; cubes.forEach((c, e) => { c.from.copy(c.g.position); c.to.copy(place(e)); }); }
    cubes.forEach((c, e) => { c.g.position.copy(place(e)); c.from.copy(c.g.position); c.to.copy(c.g.position); });
    function update(dt, t) {
      if (st.u < 1) { st.u = Math.min(1, st.u + dt * (S.reduced ? 5 : 1.2)); const k = st.u * st.u * (3 - 2 * st.u); cubes.forEach(c => { c.g.position.copy(c.from).lerp(c.to, k); c.g.position.y += Math.sin(k * Math.PI) * 0.3; }); }
      shapeT.userData.set(`shape ${shapeOf()}${st.bias ? ` + bias (${biasN()},)` : ''}`);
      // the bias row floats above; broadcasting lays a copy over every row of every image (only if the last sizes match)
      const cols = st.op === 'reshape12' ? 12 : st.op === 'start' ? Cn : R;
      const ok = st.bias && biasN() === cols;
      bias.forEach((b, k) => { b.visible = st.bias && k < biasN(); b.userData.body.material = P.mat(ok || !st.bias ? C.gold : C.red); b.position.set(0.3 - biasN() * SP / 2 + SP * (k + 0.5), 2.0 + Math.sin(t * 2 + k) * 0.03, -1.25 - 0.55); });
      for (let e = 0; e < N; e++) { const p = cubes[e].g.position; dummy.position.set(p.x, p.y - 0.15, p.z); dummy.scale.setScalar(ok && st.u >= 1 ? 1 : 0.0001); dummy.updateMatrix(); ghosts.setMatrixAt(e, dummy.matrix); }
      ghosts.instanceMatrix.needsUpdate = true;
      cubes.forEach(c => c.m.emissive.set(st.bias && !ok ? C.red : '#000000').multiplyScalar(st.bias && !ok ? 0.15 + 0.1 * Math.sin(t * 6) : 0));
    }
    const controls = [
      { type: 'buttons', label: 'View the same 48 numbers as', options: ['(4, 3, 4)', 'Reshape (4, 12)', 'Transpose (4, 4, 3)'], get: () => ['start', 'reshape12', 'transpose'].indexOf(st.op), act: i => go(['start', 'reshape12', 'transpose'][i]) },
      { type: 'toggle', label: 'Add a bias of shape (4,)', short: 'Add bias', get: () => st.bias, set: v => { st.bias = v; st.badBias = false; } },
    ];
    const readouts = [
      { label: 'Shape', get: () => ({ v: shapeOf() }) },
      { label: 'Memory order', get: () => ({ v: st.op === 'transpose' ? 'reads across' : 'unchanged', sub: st.op === 'transpose' ? 'strides swapped' : 'same line', good: st.op !== 'reshape43' }) },
    ];
    const labels = [
      { name: 'batch', t: 'A batch of 4 images', d: 'Axis 0: one slab per image', icon: 'box', atV: V(-0.58, 0.3, -1.4) },
      { name: 'memory', t: 'Memory: one line', d: 'The shape only says how to read it', icon: 'link', atV: V(-0.6, 0.08, 1.91) },
      { name: 'shape', t: 'The shape', d: 'How many along each axis', icon: 'info', atV: V(1.2, 1.3, -1.4) },
      { name: 'colours', t: 'Colour = original row', d: 'Watch where each row ends up', icon: 'eye', atV: V(1.2, 0.08, 1.91) },
    ];
    const reset = () => { Object.assign(st, { bias: false, badBias: false }); go('start'); };
    const breaks = [
      { label: 'A bias of the wrong shape', hint: 'Shape (3,) onto (4, 3, 4)', on: () => { reset(); st.bias = true; st.badBias = true; }, off: reset },
      { label: 'Reshape when you meant transpose', hint: '(4, 3, 4) → reshape to (4, 4, 3)', on: () => { reset(); go('reshape43'); }, off: reset },
    ];
    function status() {
      const cols = st.op === 'reshape12' ? 12 : st.op === 'start' ? Cn : R;
      if (st.bias && biasN() !== cols) return { ok: false, msg: `<b>Shapes don't broadcast: ${shapeOf()} and (${biasN()},).</b> Broadcasting lines shapes up from the right, so the last axis (${cols}) must equal the bias's length (${biasN()}) or be 1. It is neither, so the add fails: "operands could not be broadcast together". Give the bias one number per column.` };
      if (st.op === 'reshape43') return { ok: false, msg: `<b>Scrambled.</b> Reshape doesn't move numbers: it reads memory in order and fills the new shape row by row, so 0, 1, 2 form the first row and the old rows (colours) get chopped and mixed. To turn each image on its side you wanted <b>transpose</b>, which keeps every column together.` };
      if (st.op === 'transpose') return { ok: true, msg: `<b>Transposed to (4, 4, 3).</b> Each image's rows became columns: each colour now runs down a column. Memory didn't move; only the strides changed, so reading in order now hops across. (Some operations need <code>.contiguous()</code> after this.)` };
      if (st.op === 'reshape12') return { ok: true, msg: `<b>Reshaped to (4, 12).</b> Each image is now one row of 12, read straight off the memory line in order: the "flatten" before a dense layer. The batch axis is untouched.` };
      if (st.bias) return { ok: true, msg: `<b>Broadcast.</b> The bias has 4 numbers, one per column. It is laid over every row of every image (gold ghosts) without making 12 copies in memory. 48 additions, one line of code.` };
      return { msg: `<b>A tensor of shape (4, 3, 4):</b> 4 images, 3 rows, 4 columns, 48 numbers. In memory they sit in one line, 0 to 47.` };
    }
    // the cubes move, so the camera frames the space they can reach
    return { update, controls, readouts, labels, breaks, status, reset, go, set: p => Object.assign(st, p), fit: [-2.0, 0, -1.9, 2.6, 2.2, 2.0] };
  },

  story: [
    { t: 'A batch of images', home: true, say: 'Here are four tiny images, each three rows by four columns. Together they make one tensor of shape four, three, four: forty-eight numbers.', act: m => m.reset() },
    { t: 'One line in memory', focus: [0.3, 0.2, 1.7], zoom: 1.4, say: 'In memory the forty-eight numbers sit in one long line. The shape is only a rule for how to read that line.' },
    { t: 'Reshape', home: true, say: 'Reshape reads the same line into a new shape. Four by twelve flattens each image into one row, ready for a dense layer. Nothing moves in memory.', act: m => m.go('reshape12'), wait: 5 },
    { t: 'Transpose', home: true, say: 'Transpose swaps two axes. Each image turns on its side: every row becomes a column. Watch the colours: each row stays together.', act: m => m.go('transpose'), wait: 5 },
    { t: 'Broadcasting', focus: [0.3, 1.5, -1.0], zoom: 1.3, say: 'Now add a bias of four numbers, one per column. Broadcasting stretches it over every row of every image, without copying it. Shapes line up from the right.', act: m => { m.go('start'); m.set({ bias: true }); }, wait: 5 },
    { t: 'The classic mistake', home: true, say: 'Reshape to four by three when you meant transpose, and the rows are chopped up and mixed. No error, just scrambled data. Always check the shapes at each step.', act: m => { m.set({ bias: false }); m.go('reshape43'); }, wait: 5 },
  ],
  check: [
    { q: 'What does reshape do to the numbers in memory?', options: ['Nothing: it reads the same line into a new shape', 'Sorts them', 'Copies them into a new order'], answer: 0, why: 'Reshape changes only how the line is read. Transpose is the one that changes the reading order.' },
    { q: 'Can a bias of shape (4,) be added to a tensor of shape (4, 3, 4)?', options: ['Yes: the last axis is 4, so it broadcasts', 'No, the shapes are different', 'Only after a loop'], answer: 0, why: 'Broadcasting lines shapes up from the right; the bias stretches over the first two axes.' },
    { q: 'You want each image turned on its side. Which do you use?', options: ['Reshape to (4, 4, 3)', 'Transpose the last two axes', 'Add a bias'], answer: 1, why: 'Transpose keeps rows and columns intact while swapping them; reshape would scramble them.' },
  ],
  terms: [
    ['Tensor', 'A grid of numbers with any number of axes: a vector has 1, a matrix 2, a batch of images 3 or 4.'],
    ['Shape', 'The size along each axis, such as (4, 3, 4).'],
    ['Reshape', 'Reading the same numbers in order into a new shape with the same total size.'],
    ['Transpose', 'Swapping two axes, so rows become columns.'],
    ['Broadcasting', 'Stretching a smaller tensor across a bigger one when the trailing sizes match or are 1.'],
    ['Strides', 'How many steps in memory to move one place along each axis.'],
  ],
  deeper: '<p><b>Shapes in attention.</b> Multi-head attention reshapes (batch, tokens, 512) into (batch, tokens, 8, 64), then transposes to (batch, 8, tokens, 64) so each head works on its own slice. Getting those two steps the wrong way round is a classic silent bug.</p><p><b>Einsum</b> writes any of these operations as a short recipe of letters: <code>"bij,bjk->bik"</code> is a batched matrix multiply. It is the clearest way to say exactly which axes meet.</p><p><b>Views and copies.</b> Reshape and transpose usually make views that share memory. Change one and the other changes too.</p>',
  code: {
    title: 'Reshape, transpose and broadcast in NumPy',
    note: 'Adapted from the course\'s tensor lesson.',
    text: `
import numpy as np

x = np.arange(48).reshape(4, 3, 4)   # 4 images, 3 rows, 4 columns

flat = x.reshape(4, 12)              # each image as one row: memory unchanged
side = x.transpose(0, 2, 1)          # (4, 4, 3): rows become columns
wrong = x.reshape(4, 4, 3)           # same shape, scrambled rows!
print(np.array_equal(side, wrong))   # False

bias = np.ones(4)                    # one number per column
print((x + bias).shape)              # (4, 3, 4): broadcast over images and rows

try:
    x + np.ones(3)                   # last axes 4 and 3 don't line up
except ValueError as e:
    print(e)

print(np.einsum("bij,bjk->bik", x, side).shape)   # batched matmul: (4, 3, 3)
`,
  },
};
