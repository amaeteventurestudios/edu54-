// Build your own SQLite-like database: rows live in fixed-size pages arranged as a B+ tree. Leaf pages hold sorted keys; when one fills it
// splits in two and passes a separator key up to its parent, which may split in turn, so the tree stays shallow and balanced. A lookup reads
// one page per level instead of scanning every leaf. The tree here is really built, by inserting patient numbers one at a time.
function makeTree(o) {
  const order = [];
  for (let i = 1; i <= o.n; i++) order.push(i);
  if (o.shuffle) { let s = 7; for (let i = order.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [order[i], order[j]] = [order[j], order[i]]; } }
  let root = { leaf: true, keys: [] };
  const insert = (node, k) => {
    if (node.leaf) { node.keys.push(k); node.keys.sort((a, b) => a - b); }
    else {
      let i = 0; while (i < node.keys.length && k >= node.keys[i]) i++;
      const split = insert(node.children[i], k);
      if (split) { node.keys.splice(i, 0, split.key); node.children.splice(i + 1, 0, split.right); }
    }
    if (o.split && node.keys.length > o.cap) {
      const mid = Math.ceil(node.keys.length / 2);
      if (node.leaf) { const right = { leaf: true, keys: node.keys.slice(mid) }; node.keys = node.keys.slice(0, mid); return { key: right.keys[0], right }; }
      const m = Math.floor(node.keys.length / 2), up = node.keys[m];
      const right = { leaf: false, keys: node.keys.slice(m + 1), children: node.children.slice(m + 1) };
      node.keys = node.keys.slice(0, m); node.children = node.children.slice(0, m + 1);
      return { key: up, right };
    }
    return null;
  };
  order.forEach(k => { const s = insert(root, k); if (s) root = { leaf: false, keys: [s.key], children: [root, s.right] }; });
  const levels = [];
  const walk = (nd, d) => { (levels[d] = levels[d] || []).push(nd); if (!nd.leaf) nd.children.forEach(c => walk(c, d + 1)); };
  walk(root, 0);
  const path = [];
  let nd = root;
  while (nd) { path.push(nd); if (nd.leaf) break; let i = 0; while (i < nd.keys.length && o.find >= nd.keys[i]) i++; nd = nd.children[i]; }
  const leaves = levels[levels.length - 1];
  let scan = 0; for (const lf of leaves) { scan++; if (lf.keys.includes(o.find)) break; }
  const over = leaves.concat(...levels.slice(0, -1)).filter(x => x.keys.length > o.cap).length;
  const fill = leaves.reduce((a, l) => a + l.keys.length, 0) / (leaves.length * o.cap);
  return { root, levels, path, height: levels.length, pages: levels.reduce((a, l) => a + l.length, 0), reads: o.scan ? scan : path.length, scan, over, fill };
}

export default {
  slug: 'build-a-btree-database',
  title: 'Build your own SQLite: pages and a B+ tree',
  description: 'A clinic\'s patient register stores rows in fixed-size pages arranged as a B+ tree. Insert patient numbers and watch full pages split and the tree grow.',
  overview: 'A database such as SQLite keeps a table in a single file divided into fixed-size pages, typically 4 KB, because disks and operating systems read and write whole pages. The pages form a B+ tree. Leaf pages hold the rows, sorted by key; interior pages hold only keys and pointers to the pages below, each key separating one child\'s range from the next. To find a row, start at the root page and at each level follow the pointer whose range contains the key, so a lookup reads one page per level. Because each page holds many keys, the tree is very shallow: a few levels cover millions of rows, where scanning would read every page. Inserting keeps the tree balanced. A new key goes into the right leaf in sorted position; if the leaf is full it splits into two half-full pages, and the first key of the new right page is copied up into the parent as a separator. If the parent overflows, it splits too, and a split at the root adds a new root, the only way the tree grows taller, so every leaf stays at the same depth. A page cannot simply grow past its size, so a full page that is not split cannot take another row. Inserting keys in sorted order leaves pages half full, which is why real engines split unevenly when appending. The tutorial this lesson follows builds such a database in C, step by step, from a command prompt to a working B+ tree. This machine builds the tree live as patient numbers are added to an invented clinic register in Kigali.',
  keywords: ['build your own database', 'B+ tree', 'SQLite', 'database pages', 'node split', 'index lookup', 'cstack db tutorial'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://cstack.github.io/db_tutorial/" target="_blank" rel="noopener">Let\'s Build a Simple Database</a> by Connor Stack (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short B+ tree, written for this lesson after Let\'s Build a Simple Database (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { n: 24, cap: 4, split: true, scan: false, shuffle: true, find: 17 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    let parts = [];

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = makeTree(st);
      parts.forEach(p => p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; floor.add(o); parts.push(o); return o; };
      const H = R.levels.length, zTop = -0.85, zBot = 0.3, pos = new Map();
      R.levels.forEach((lvl, d) => {
        const z = H === 1 ? -0.3 : zTop + d * (zBot - zTop) / (H - 1);
        const w = Math.min(0.11 * st.cap + 0.12, 3.75 / lvl.length - 0.05);
        lvl.forEach((nd, i) => {
          const x = -2.78 + (i + 0.5) * 3.75 / lvl.length;
          const onPath = !st.scan && R.path.includes(nd), over = nd.keys.length > st.cap;
          const scanned = st.scan && nd.leaf && R.levels[H - 1].indexOf(nd) < R.scan;
          const col = over ? '#F7DED5' : onPath || scanned ? '#FBE3B0' : nd.leaf ? '#FFFFFF' : '#E4E9F7';
          const b = add(P.box(w, 0.06, 0.26, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: col }) })); b.position.set(x, 0.12, z);
          pos.set(nd, [x, z]);
        });
      });
      R.levels.forEach(lvl => lvl.forEach(nd => { if (!nd.leaf) nd.children.forEach(c => { const a = pos.get(nd), b = pos.get(c); const on = !st.scan && R.path.includes(nd) && R.path.includes(c); add(P.tube([V(a[0], 0.155, a[1] + 0.13), V(b[0], 0.155, b[1] - 0.13)], on ? 0.012 : 0.006, on ? SAF : '#B9B3A6', { straight: true })); }); }));
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.split && !st.scan && R.over === 0 && st.cap >= 3; }
    draw();
    const set = p => { Object.assign(st, p); if (st.find > st.n) st.find = st.n; draw(); };
    const controls = [
      { type: 'slider', label: 'Patients added', min: 1, max: 30, step: 1, get: () => st.n, set: v => set({ n: +v }), fmt: v => `${v}` },
      { type: 'slider', label: 'Keys per page', min: 2, max: 8, step: 1, get: () => st.cap, set: v => set({ cap: +v }), fmt: v => `${v}` },
      { type: 'slider', label: 'Look up patient', min: 1, max: 30, step: 1, get: () => st.find, set: v => set({ find: Math.min(+v, st.n) }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Split full pages', short: 'Split', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'toggle', label: 'Scan every leaf instead', short: 'Scan', get: () => st.scan, set: v => set({ scan: !!v }) },
      { type: 'toggle', label: 'Add patients in arrival order', short: 'Arrival order', get: () => st.shuffle, set: v => set({ shuffle: !!v }) },
    ];
    const readouts = [
      { label: 'Pages read', get: () => ({ v: `${R.reads}`, sub: `to find ${st.find}`, good: !st.scan, bad: st.scan }) },
      { label: 'Tree height', get: () => ({ v: `${R.height}`, sub: `${R.pages} pages`, good: R.height <= 3, bad: R.height > 3 }) },
      { label: 'Overfull', get: () => ({ v: `${R.over}`, sub: 'pages', good: R.over === 0, bad: R.over > 0 }) },
    ];
    const labels = [
      { name: 'b', t: 'The B+ tree', d: 'Pages of sorted keys', icon: 'box', atV: V(-2.5, 0.15, -0.3) },
      { name: 't', t: 'One lookup', d: 'Pages read, levels', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never split a full page', hint: 'pages overflow', on: () => set({ ...D0, split: false }), off: reset },
      { label: 'Scan every leaf', hint: 'ignore the tree', on: () => set({ ...D0, scan: true }), off: reset },
      { label: 'Shrink the pages', hint: 'two keys each', on: () => set({ ...D0, cap: 2 }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.split) return { ok: false, msg: `<b>With no splits, every patient lands in one page that now holds ${st.n} keys where only ${st.cap} fit.</b> A page has a fixed size, so it cannot take another row. When a page is full, split it in two and pass the first key of the new page up to the parent.` };
      if (st.scan) return { ok: false, msg: `<b>Scanning reads ${r.scan} leaf page${r.scan === 1 ? '' : 's'} to find patient ${st.find}, and on a large table it would read nearly all of them.</b> Following the tree reads one page per level, ${r.path.length} here.` };
      if (st.cap < 3) return { ok: false, msg: `<b>With pages of only ${st.cap} keys, the tree grows to ${r.height} levels and ${r.pages} pages for ${st.n} patients, so each lookup reads ${r.path.length} pages.</b> Real pages hold hundreds of keys, so a few levels cover millions of rows.` };
      return { ok: true, msg: `<b>${st.n} patient${st.n === 1 ? '' : 's'} in ${r.pages} page${r.pages === 1 ? '' : 's'}, ${r.height} level${r.height > 1 ? 's' : ''} deep: finding patient ${st.find} reads ${r.path.length} page${r.path.length > 1 ? 's' : ''}, one per level.</b> ${st.shuffle ? `Leaves are ${Math.round(r.fill * 100)}% full.` : `Added in number order, each split leaves its left page at ${Math.round(r.fill * 100)}% and nothing ever lands there again, which is why real engines split unevenly when appending.`}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Rows in pages', home: true, say: 'A clinic register keeps rows in fixed-size pages. Here each page holds four patient numbers.', act: m => m.set({ n: 4, cap: 4, split: true, scan: false, shuffle: true, find: 3 }) },
    { t: 'A page splits', home: true, say: 'A fifth patient will not fit. The page splits in two and passes a key up to a new parent.', act: m => m.set({ n: 5, cap: 4, split: true, scan: false, shuffle: true, find: 3 }) },
    { t: 'The tree grows', home: true, say: 'Keep adding. Leaves split, parents fill and split too, and every leaf stays at the same depth.', act: m => m.set({ n: 24, cap: 4, split: true, scan: false, shuffle: true, find: 17 }) },
    { t: 'One page per level', home: true, say: 'To find a patient, follow the right pointer down. Three pages, not every page.', act: m => m.set({ n: 30, cap: 4, split: true, scan: false, shuffle: true, find: 22 }) },
    { t: 'Scanning', home: true, say: 'Ignore the tree and scan the leaves one by one, and the reads grow with the table.', act: m => m.set({ n: 30, cap: 4, split: true, scan: true, shuffle: true, find: 22 }) },
    { t: 'Bigger pages', home: true, say: 'Real pages hold hundreds of keys. Bigger pages, a shallower tree.', act: m => m.set({ n: 30, cap: 8, split: true, scan: false, shuffle: true, find: 22 }) },
  ],
  check: [
    { q: 'What happens when a leaf page is full?', options: ['It splits in two and passes a key up to its parent', 'It grows bigger', 'The row is dropped'], answer: 0, why: 'Pages have a fixed size.', hint: 'Try Never split a full page.' },
    { q: 'How many pages does a lookup read?', options: ['One per level of the tree', 'All of them', 'Always one'], answer: 0, why: 'Follow one pointer down per level.', hint: 'Try Scan every leaf.' },
    { q: 'When does the tree get taller?', options: ['When the root splits', 'On every insert', 'Never'], answer: 0, why: 'So all leaves stay at the same depth.', hint: 'Add patients one by one.' },
  ],
  terms: [
    ['Page', 'A fixed-size block of the file, read and written whole.'],
    ['B+ tree', 'A balanced tree of pages; rows live in the leaves.'],
    ['Leaf page', 'A bottom page holding sorted rows.'],
    ['Interior page', 'A page of separator keys and pointers to children.'],
    ['Split', 'Dividing a full page in two and passing a key up.'],
    ['Fan-out', 'How many children an interior page points to.'],
  ],
  deeper: '<p><b>Cursors.</b> Leaves link to their neighbours, so a range query finds the first row and walks along the leaves.</p><p><b>Deletes.</b> Removing rows can leave pages nearly empty; engines merge or rebalance them, or leave the space for later inserts.</p><p><b>About this machine.</b> The clinic and patients are invented; the tree is built live by this lesson.</p>',
  code: {
    title: 'Insert into a B+ tree with splits',
    note: 'Our own short version, written for this lesson.',
    text: `
def insert(node, key, cap):
    if node.leaf:
        bisect.insort(node.keys, key)
    else:
        i = bisect.bisect_right(node.keys, key)
        split = insert(node.children[i], key, cap)
        if split:
            sep, right = split
            node.keys.insert(i, sep)
            node.children.insert(i + 1, right)
    if len(node.keys) > cap:                       # full page: split it
        mid = len(node.keys) // 2
        if node.leaf:
            right = Leaf(node.keys[mid:]); node.keys = node.keys[:mid]
            return right.keys[0], right            # copy the first key up
        sep = node.keys[mid]
        right = Interior(node.keys[mid + 1:], node.children[mid + 1:])
        node.keys, node.children = node.keys[:mid], node.children[:mid + 1]
        return sep, right                          # move the middle key up
    return None
`,
  },
};
