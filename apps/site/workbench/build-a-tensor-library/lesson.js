// Build it yourself: a tensor library (after Build Deep Learning From Scratch). A Kigoma fish-catch model. A real tensor keeps a flat array plus shape and strides, so reshape and transpose copy nothing; broadcasting is computed by the real rule and a pixel-style grid shows which cells are reached.
function strides(sh) { const s = sh.map(() => 1); for (let i = sh.length - 2; i >= 0; i--) s[i] = s[i + 1] * sh[i + 1]; return s; }
const at = (d, sh, st, ix) => d[ix.reduce((a, v, i) => a + v * st[i], 0)];
function bshape(a, b) { const n = Math.max(a.length, b.length), A = [...Array(n - a.length).fill(1), ...a], B = [...Array(n - b.length).fill(1), ...b], out = []; for (let i = 0; i < n; i++) { if (A[i] !== B[i] && A[i] !== 1 && B[i] !== 1) return null; out.push(Math.max(A[i], B[i])); } return out; }
const SH = { 0: [3, 4], 1: [2, 6], 2: [4, 3], 3: [12] };
function run(o) {
  const data = Array.from({ length: 12 }, (_, i) => i), sh = o.view === 2 ? [4, 3] : SH[o.view], st0 = strides(o.view === 2 ? [3, 4] : sh), st = o.view === 2 ? [st0[1], st0[0]] : st0;
  const cells = []; if (sh.length === 2) for (let r = 0; r < sh[0]; r++) for (let c = 0; c < sh[1]; c++) cells.push(at(data, sh, st, [r, c])); else data.forEach(v => cells.push(v));
  const flat = o.view !== 2, b = bshape(o.a, o.b), n = b ? b.reduce((x, y) => x * y, 1) : 0, loops = n;
  return { sh, st, cells, flat, bs: b, n, copied: o.copy ? 12 : 0, cost: o.loop ? n * 30 : n, trans: o.view === 2 };
}

export default {
  slug: 'build-a-tensor-library',
  title: 'Build your own tensor library',
  description: 'One flat array, a shape and strides. Reshape copies nothing, and broadcasting has one rule.',
  overview: 'A tensor looks like a grid, and it\'s really one flat run of numbers plus two small lists. The shape gives the size of each dimension. The strides say how far to jump in memory to move one step along it. So reshape and transpose only change those lists, and copy no data. A transpose just swaps strides, which means the data is no longer laid out in order. Broadcasting has one rule: line up the shapes from the right, and dimensions must match, or one must be 1. That\'s how a whole array meets a single row with no loop. This real small library runs for a fish-catch model in Kigoma.',
  keywords: ['tensor', 'strides', 'broadcasting', 'reshape', 'deep learning', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.05, 0.95, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { view: 0, a: [3, 4], b: [4], copy: false, loop: false }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const C = Array.from({ length: 12 }, () => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.3, 0.1, 0.3, '#fff', { r: 0.02, material: m }); S.add(b); return { b, m }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.1, 0.03, 0);
    S.add(P.keep(-2.3, 2.3, 0.7, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st); const [rows, cols] = R.sh.length === 2 ? R.sh : [1, 12], sx = Math.min(0.34, 3.6 / cols), sz = Math.min(0.34, 1.2 / rows);
      C.forEach(({ b, m }, i) => { const r = Math.floor(i / cols), c = i % cols; b.position.set(-1.9 + c * sx + 0.1, 0.03, -0.55 + r * sz + 0.1); const v = R.cells[i], up = st.view === 0 ? v === 0 : false; b.scale.set(Math.min(1, (sx - 0.02) / 0.3), 1 + v * 0.25, Math.min(1, (sz - 0.02) / 0.3)); m.color.set(R.trans && v % 3 === 0 ? SAF : up ? SAF : GOOD); });
      lamp.userData.set({ color: !R.bs ? '#D9483B' : '#3E9B5F', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const BK = [[4], [1], [3, 1], [3]];
    const controls = [
      { type: 'buttons', label: 'View', options: ['3 by 4', '2 by 6', 'Transpose', 'Flat 12'], get: () => st.view, act: i => set({ view: i }) },
      { type: 'buttons', label: 'Broadcast with', options: ['[4]', '[1]', '[3, 1]', '[3]'], get: () => BK.findIndex(x => x.join() === st.b.join()), act: i => set({ b: BK[i] }) },
      { type: 'toggle', label: 'Copy on reshape', short: 'Copy', get: () => st.copy, set: v => set({ copy: !!v }) },
      { type: 'toggle', label: 'Loop in the slow language', short: 'Loop', get: () => st.loop, set: v => set({ loop: !!v }) },
    ];
    const readouts = [
      { label: 'Shape, strides', get: () => ({ v: `[${R.sh.join(', ')}], [${R.st.join(', ')}]`, sub: R.trans ? 'not in order now' : 'in order' }) },
      { label: 'Broadcast', get: () => (R.bs ? { v: `[${R.bs.join(', ')}]`, sub: `${R.n} results`, good: true } : { v: 'shapes clash', bad: true }) },
      { label: 'Numbers copied', get: () => ({ v: `${R.copied}`, sub: `work ${R.cost} units`, good: !R.copied, bad: !!R.copied }) },
    ];
    const labels = [
      { name: 'g', t: 'Same twelve numbers', d: 'Height: position in memory', icon: 'box', atV: V(-2.1, 0.1, -0.4) },
      { name: 'l', t: 'Shapes fit?', d: 'Red: they clash', icon: 'check', atV: V(2.27, 0.3, 0) },
    ];
    const reset = () => set({ ...D0, a: [3, 4], b: [4] });
    const breaks = [
      { label: 'Shapes that clash', hint: '[3] against 3 by 4', on: () => set({ ...D0, b: [3] }), off: reset },
      { label: 'Copy on every reshape', hint: 'twelve numbers, each time', on: () => set({ ...D0, copy: true }), off: reset },
      { label: 'Python loops', hint: 'thirty times slower here', on: () => set({ ...D0, loop: true }), off: reset },
    ];
    function status() {
      if (!R.bs) return { ok: false, msg: `<b>[${st.a.join(', ')}] and [${st.b.join(', ')}] clash.</b> From the right, 4 meets 3, and neither is 1. Use [3, 1] to line up the rows.` };
      if (st.copy) return { ok: false, msg: '<b>Twelve numbers copied for a change of view.</b> Only the shape and strides needed to change.' };
      if (st.loop) return { ok: false, msg: `<b>${R.cost} units of work, for ${R.n} results.</b> Push the loop down into fast code. The factor here is illustrative.` };
      return { ok: true, msg: `<b>Shape [${R.sh.join(', ')}], strides [${R.st.join(', ')}], and nothing copied.</b> Same memory, new view.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One flat run', home: true, say: 'A fish-catch model in Kigoma holds twelve numbers. They sit in one flat run of memory.', act: m => m.set({ view: 3, b: [4], copy: false, loop: false }) },
    { t: 'Shape and strides', home: true, say: 'Shape and strides turn that run into a grid.', act: m => m.set({ view: 0, b: [4], copy: false, loop: false }) },
    { t: 'Reshape', home: true, say: 'Reshape changes two lists, and copies nothing.', act: m => m.set({ view: 1, b: [4], copy: false, loop: false }) },
    { t: 'Transpose', home: true, say: 'Transpose swaps the strides, so memory is no longer in order.', act: m => m.set({ view: 2, b: [4], copy: false, loop: false }) },
    { t: 'Broadcast', home: true, say: 'Line up shapes from the right. They must match, or one must be one.', act: m => m.set({ view: 0, b: [3, 1], copy: false, loop: false }) },
    { t: 'No loops', home: true, say: 'A whole array meets a row with no loop in your code.', act: m => m.set({ view: 0, b: [4], copy: false, loop: false }) },
  ],
  check: [
    { q: 'What does reshape change?', options: ['Shape and strides', 'The data', 'The device'], answer: 0, why: 'It copies nothing.', hint: 'See Reshape.' },
    { q: 'What is the broadcast rule?', options: ['From the right, match or be 1', 'Same total size', 'First dimension equal'], answer: 0, why: 'That\'s the whole rule.', hint: 'See Broadcast.' },
    { q: 'What do strides say?', options: ['How far to jump in memory', 'How many steps to train', 'How big a batch is'], answer: 0, why: 'One per dimension.', hint: 'See Shape and strides.' },
  ],
  terms: [['Shape', 'Size of each dimension.'], ['Strides', 'Memory jump per dimension.'], ['Broadcasting', 'Stretching dimensions of 1.'], ['View', 'A new shape on the same data.']],
  deeper: '<p><b>Real code.</b> Lookups use real strides, and the broadcast rule is computed live.</p><p><b>Next.</b> Add autograd on top, as in the autograd lesson.</p>',
  credit: 'Built from <a href="https://github.com/roiamiel1/Build-Deep-Learning-From-Scratch" target="_blank" rel="noopener">Build Deep Learning From Scratch</a> (Unlicense), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small tensor, written for this lesson.',
  code: {
    title: 'Strides',
    note: 'Our own short version.',
    text: `
function strides(shape) {
  const s = shape.map(() => 1);
  for (let i = shape.length - 2; i >= 0; i--) s[i] = s[i + 1] * shape[i + 1];
  return s;
}
const at = (t, idx) => t.data[idx.reduce((a, v, i) => a + v * t.strides[i], 0)];
`,
  },
};
