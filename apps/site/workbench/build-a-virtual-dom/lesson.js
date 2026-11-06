// Build it yourself: a component framework (after create-frontend-framework). A Kisumu market stall list is state; render gives a virtual tree; a real keyed diff finds the fewest changes. Tiles show kept, moved, changed and rebuilt rows, and the count of real page writes.
const OLD = [['a', 'Tilapia'], ['b', 'Sukuma'], ['c', 'Maize'], ['d', 'Beans'], ['e', 'Mango']];
const CH = { same: l => l, edit: l => l.map(r => (r[0] === 'c' ? ['c', 'White maize'] : r)), add: l => [['z', 'Avocado'], ...l], swap: l => [...l].reverse() };
function diff(a, b, keyed) {
  const ops = [], res = [];
  if (keyed) {
    const old = {}; a.forEach((r, i) => { old[r[0]] = { r, i }; });
    let last = -1;
    b.forEach(r => { const o = old[r[0]]; if (!o) { res.push('new'); ops.push(['add', r[1]]); return; } let k = 'same'; if (o.i < last) { k = 'moved'; ops.push(['move', r[1]]); } else last = o.i; if (o.r[1] !== r[1]) { k = 'edit'; ops.push(['text', r[1]]); } res.push(k); });
    a.forEach(r => { if (!b.some(x => x[0] === r[0])) ops.push(['remove', r[1]]); });
  } else b.forEach((r, i) => { if (!a[i]) { res.push('new'); ops.push(['add', r[1]]); } else if (a[i][1] !== r[1]) { res.push('edit'); ops.push(['text', r[1]]); } else res.push('same'); });
  return { ops, res };
}
function run(o) {
  const next = CH[o.c](OLD), d = o.diff ? diff(OLD, next, o.keyed) : { ops: next.map(r => ['add', r[1]]), res: next.map(() => 'new') };
  return { next, ...d, writes: d.ops.length, full: next.length, lost: !o.keyed && o.diff && (o.c === 'add' || o.c === 'swap') };
}

export default {
  slug: 'build-a-virtual-dom',
  title: 'Build your own virtual DOM',
  description: 'State changes, a new tree renders, and a diff makes only the changes that matter.',
  overview: 'A component framework has one idea: the screen is a function of state. When state changes, render again. Rebuilding the real page each time is slow, and it loses focus and scroll. So render to a cheap plain tree first, compare it with the last one, and apply only the differences. Keys matter here. Without them, the diff compares by position, so one new row at the top makes every row look changed. With them, it knows that a row moved. This real keyed diff runs on a stall list at a market in Kisumu.',
  keywords: ['virtual DOM', 'diffing', 'components', 'keys', 'frontend framework', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.05, 0.9, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { c: 'edit', keyed: true, diff: true }, st = { ...D0 };
    const C = { same: '#CFC9BA', edit: '#F2AE0C', moved: '#5B8DB8', new: '#E07A5F' }, ticks = [];
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.8;
    const T = Array.from({ length: 6 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C.same }), b = P.box(0.66, 0.14, 0.9, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, 0); S.add(b); return { b, m }; });
    S.add(P.keep(-2.45, 2.45, 0.6, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const k = R.res[i]; b.visible = !!k; if (k) { m.color.set(C[k]); b.scale.y = k === 'same' ? 1 : 2.6; } }); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const K = ['same', 'edit', 'add', 'swap'];
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'State change', options: ['Nothing', 'Edit one', 'Add at top', 'Reverse'], get: () => K.indexOf(st.c), act: i => set({ c: K[i] }) }, tg('keyed', 'Use keys', 'Keys'), tg('diff', 'Diff before writing', 'Diff')];
    const readouts = [
      { label: 'Page writes', get: () => ({ v: `${R.writes}`, sub: `of ${R.full} rows`, good: R.writes <= 2, bad: R.writes >= R.full }) },
      { label: 'Kept as they were', get: () => ({ v: `${R.res.filter(r => r === 'same').length} rows` }) },
      { label: 'Row order', get: () => ({ v: R.next.map(r => r[1]).join(', ') }) },
    ];
    const labels = [
      { name: 'r', t: 'One tile per row', d: 'Raised: a page write', icon: 'box', atV: V(X(0) - 0.35, 0.1, 0) },
      { name: 'k', t: 'Blue: moved. Gold: new text', d: 'Coral: rebuilt', icon: 'eye', atV: V(X(4) + 0.35, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No keys, add at the top', hint: 'every row looks changed', on: () => set({ ...D0, c: 'add', keyed: false }), off: reset },
      { label: 'No diff at all', hint: 'rebuild everything', on: () => set({ ...D0, diff: false }), off: reset },
    ];
    function status() {
      if (!st.diff) return { ok: false, msg: `<b>${R.writes} rows rebuilt for one small change.</b> Focus and scroll are lost, and the page flickers.` };
      if (R.lost) return { ok: false, msg: `<b>${R.writes} writes, where keys would need ${diff(OLD, R.next, true).ops.length}.</b> By position, every row looks different, and each keeps the wrong input state.` };
      return { ok: true, msg: `<b>${R.writes} page write${R.writes === 1 ? '' : 's'}.</b> The diff changed only what differs.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A function of state', home: true, say: 'A market in Kisumu lists its stalls. The screen is a function of that list.', act: m => m.set({ c: 'same', keyed: true, diff: true }) },
    { t: 'Rebuild it all', home: true, say: 'Rebuild the page for each change, and you lose focus and scroll.', act: m => m.set({ c: 'edit', keyed: true, diff: false }) },
    { t: 'A cheap tree', home: true, say: 'Render to a plain tree instead. Compare it with the last one.', act: m => m.set({ c: 'edit', keyed: true, diff: true }) },
    { t: 'By position', home: true, say: 'Without keys, one row at the top makes every row look changed.', act: m => m.set({ c: 'add', keyed: false, diff: true }) },
    { t: 'Keys', home: true, say: 'A key says which row is which, so only the new row is written.', act: m => m.set({ c: 'add', keyed: true, diff: true }) },
    { t: 'Moves', home: true, say: 'Keys also turn a reorder into moves, keeping each row\'s state.', act: m => m.set({ c: 'swap', keyed: true, diff: true }) },
  ],
  check: [
    { q: 'What is a virtual DOM?', options: ['A cheap plain tree of the page', 'A second browser', 'A database'], answer: 0, why: 'It can be compared cheaply.', hint: 'See A cheap tree.' },
    { q: 'What do keys do?', options: ['Say which row is which', 'Encrypt rows', 'Speed up the network'], answer: 0, why: 'Comparison no longer depends on position.', hint: 'Try No keys, add at the top.' },
    { q: 'What goes wrong with no diff?', options: ['Everything is rebuilt', 'Nothing renders', 'State is lost for good'], answer: 0, why: 'It writes every row.', hint: 'Try No diff at all.' },
  ],
  terms: [['Component', 'A function from state to tree.'], ['Diff', 'Finding what changed.'], ['Key', 'A row\'s stable name.'], ['Patch', 'Applying the changes.']],
  deeper: '<p><b>Real code.</b> The diff runs live on five rows.</p><p><b>Larger.</b> Real frameworks also diff attributes and nested trees, and batch updates.</p>',
  credit: 'Built from <a href="https://mfrachet.github.io/create-frontend-framework/" target="_blank" rel="noopener">Building a frontend framework, from scratch, with components</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short keyed diff, written for this lesson.',
  code: {
    title: 'Keyed diff',
    note: 'Our own short version.',
    text: `
function diff(oldRows, newRows) {
  const byKey = new Map(oldRows.map(r => [r.key, r]));
  return newRows.flatMap(r => {
    const was = byKey.get(r.key);
    if (!was) return [{ op: "add", r }];
    return was.text === r.text ? [] : [{ op: "text", r }];
  });
}
`,
  },
};
