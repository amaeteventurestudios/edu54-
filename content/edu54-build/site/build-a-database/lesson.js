// Build your own database: a savings group's book (ajo in Lagos, susu in Accra, chama in Nairobi) kept as a binary tree inside an append-only file.
// Every change appends copies of the changed path and only then moves the root pointer at the start of the file.
// Pull the plug mid-write and nothing is lost. Break it: write the root first, or overwrite blocks in place.
const START = [['Dayo', 8], ['Bola', 5], ['Femi', 12], ['Ada', 6], ['Chidi', 3], ['Efe', 9], ['Gbenga', 4]];
const JOIN = [['Kofi', 2], ['Halima', 7], ['Ama', 4], ['Juma', 5], ['Lerato', 3], ['Musa', 6]];
const COLS = 12, SLOTS = 24;

export default {
  slug: 'build-a-database',
  title: 'Build your own database',
  description: 'Keep a savings group\'s book in a tiny database you can see inside. Pull the plug mid-write and nothing is lost. Do it the risky way and watch it corrupt.',
  overview: 'A database has one hard job: never lose or garble what it promised to keep, even if the power dies halfway through a write. This one keeps a savings group\'s book (an ajo, susu or chama) as a binary tree inside a single file. It never changes a block once written. Each change adds new blocks to the end, and only when they are safely down does it move the root pointer at the start of the file. That one rule is why a power cut can\'t hurt it.',
  keywords: ['build your own database', 'append-only file', 'copy on write', 'binary tree database', 'crash safety', 'dbdb'],
  money: true,
  orient: 'landscape',
  view: { target: [0, 0.3, 0.2], dir: [0, 1.25, 1.05], half: 3.4, wide: 8.4 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/dbdb-dog-bed-database.html" target="_blank" rel="noopener">DBDB: Dog Bed Database</a> by Taavi Burns, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short version of the idea in DBDB (Taavi Burns, 500 Lines or Less, MIT).',

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { file: [], root: 0, queue: [], cur: null, t: 0, cut: 0, cutAt: -1, rootFirst: false, inPlace: false, joined: 0, last: '', event: '' };
    // amounts are whole units; one unit is a round sum near 2 US dollars in the learner's currency
    let unit = S.money.nice(2);
    const naira = v => S.money.fmt(v * unit);
    /* ---------- the tree logic (addresses are slots in the file; slot 0 holds the root pointer) ---------- */
    const node = a => (a > 0 && a <= st.file.length ? st.file[a - 1] : null);
    function put(a, key, val, out, base) {
      const n = node(a);
      const push = rec => { out.push(rec); return base + out.length; };
      if (!n) return push({ key, val, l: 0, r: 0 });
      if (key < n.key) { const l = put(n.l, key, val, out, base); return push({ ...n, l, state: 'ok' }); }
      if (key > n.key) { const r = put(n.r, key, val, out, base); return push({ ...n, r, state: 'ok' }); }
      return push({ ...n, val, state: 'ok' });
    }
    const find = (a, key) => { let n = node(a), at = a; while (n) { if (key === n.key) return at; at = key < n.key ? n.l : n.r; n = node(at); } return 0; };
    function walk(a, d = 0, out = [], seen = new Set()) { const n = node(a); if (!n || seen.has(a) || d > 8) return out; seen.add(a); walk(n.l, d + 1, out, seen); out.push({ a, n, d }); walk(n.r, d + 1, out, seen); return out; }
    const live = () => new Set(walk(st.root).map(x => x.a));
    const damaged = () => (st.root > st.file.length) || walk(st.root).some(x => x.n.state === 'torn');
    const busy = () => !!st.cur || st.queue.length > 0;
    function fresh() {
      Object.assign(st, { file: [], root: 0, queue: [], cur: null, cut: 0, cutAt: -1, joined: 0, last: '', event: '' });
      START.forEach(([k, v]) => { const out = []; const r = put(st.root, k, v, out, st.file.length); st.file.push(...out); st.root = r; });
      compact(true); // a tidy starting file: one block per member, children first
    }
    function compact(quiet) {
      if (busy()) return;
      const list = [];
      const copy = a => { const n = node(a); if (!n) return 0; const l = copy(n.l), r = copy(n.r); list.push({ key: n.key, val: n.val, l, r, state: n.state }); return list.length; };
      st.root = copy(st.root); st.file = list;
      if (!quiet) { st.event = 'tidy'; S.sync(); }
    }
    /* ---------- writes ---------- */
    function write(key, val) {
      if (busy() || st.cut || damaged()) return false;
      if (st.inPlace) {
        const a = find(st.root, key);
        if (a) { st.queue.push({ type: 'over', a, rec: { ...node(a), val } }); st.last = `${key} → ${naira(val)}`; st.event = 'write'; return true; }
      }
      const out = [], base = st.file.length;
      if (base >= SLOTS - 6) { S.pop('The file is nearly full', '<p>Old blocks pile up because nothing is ever changed in place. Press <b>Tidy the file</b> to copy only the live tree into a fresh file.</p>'); return false; }
      const r = put(st.root, key, val, out, base);
      const appends = out.map(rec => ({ type: 'append', rec: { ...rec, state: 'ok' } }));
      const rootOp = { type: 'root', a: r };
      st.queue = st.rootFirst ? [rootOp, ...appends] : [...appends, rootOp];
      st.last = `${key} → ${naira(val)}`; st.event = 'write';
      return true;
    }
    function join() { if (st.joined >= JOIN.length) { S.pop('Everyone has joined', '<p>All the new members are in the book. Update someone\'s savings instead, or start again.</p>'); return; } const [k, v] = JOIN[st.joined]; if (write(k, v)) st.joined++; }
    function save() { const w = walk(st.root); if (!w.length) return; const pick = w[Math.floor(Date.now() / 256) % w.length].n; write(pick.key, pick.val + 1); }
    function pullPlug(after = PH() * 1.3) { if (st.cut) return; if (!busy()) { if (st.inPlace) save(); else join(); } st.cutAt = after; }
    const PH = () => (S.reduced ? 0.25 : 0.7);
    function step(dt) {
      if (st.cut) { st.cut -= dt; if (st.cut <= 0) { st.cut = 0; st.event = damaged() ? 'corrupt' : 'reopened'; S.sync(); } return; }
      if (st.cutAt >= 0 && busy()) { st.cutAt -= dt; if (st.cutAt < 0) { // the lights go out
        if (st.cur && st.cur.type === 'over') node(st.cur.a).state = st.t > PH() * 0.35 ? 'torn' : node(st.cur.a).state;
        st.queue = []; st.cur = null; st.cut = 1.6; st.event = 'cut'; S.sync(); return; } }
      if (!st.cur && st.queue.length) { st.cur = st.queue.shift(); st.t = 0; }
      const c = st.cur; if (!c) return;
      st.t += dt;
      if (c.type === 'over' && st.t > PH() * 0.35 && node(c.a).state !== 'torn' && st.t < PH()) node(c.a).state = 'torn';
      if (st.t >= PH()) {
        if (c.type === 'append') st.file.push(c.rec);
        if (c.type === 'root') st.root = c.a;
        if (c.type === 'over') st.file[c.a - 1] = { ...c.rec, state: 'ok' };
        st.cur = null;
        if (!st.queue.length) { st.event = 'done'; S.sync(); }
      }
    }
    /* ---------- the file: a shelf of blocks ---------- */
    const slotPos = a => V(-3.63 + (a % COLS) * 0.66, 0, 1.5 + Math.floor(a / COLS) * 0.74);
    const shelf = P.box(8.3, 0.06, 1.6, '#D8D2C4', { r: 0.06 }); shelf.position.set(0, -0.03, 1.85); S.add(shelf);

    const blocks = [];
    for (let a = 0; a < SLOTS; a++) {
      const p = slotPos(a);
      const b = P.box(0.58, 0.24, 0.48, a ? '#FFFFFF' : C.gold, { r: 0.04 }); b.material = new THREE.MeshLambertMaterial({ color: a ? '#FFFFFF' : C.gold }); b.position.copy(p).add(V(0, 0, -0.04)); S.add(b);
      if (a) b.visible = false;
      if (a) S.tap(b, () => { const n = node(a); if (!n) return; const lv = live().has(a); S.pop(`Block ${a}`, `<p><b>${n.key}: ${naira(n.val)}</b>${n.state === 'torn' ? ' (half-written!)' : ''}</p><p>Left child: ${n.l ? 'block ' + n.l : 'none'} · right child: ${n.r ? 'block ' + n.r : 'none'}</p><p>${lv ? 'Part of the live tree.' : 'Not reachable from the root any more: an old copy, waiting to be tidied away.'}</p>`); });
      blocks.push({ b });
    }
    const treeTop = V(0, 0, -2.45);
    let ptr = null; // the root pointer: an arc from slot 0 to the root's block, rebuilt when it moves
    const ptrHead = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 14), P.mat(C.ink)); ptrHead.userData.noFit = true; S.add(ptrHead);
    /* ---------- the tree, as the database reads it ---------- */
    const tiles = [], rods = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group(); S.add(g);
      const b = P.box(1.05, 0.18, 0.44, '#2E8C87', { r: 0.05 }); b.material = new THREE.MeshLambertMaterial({ color: '#2E8C87' }); g.add(b);
      g.visible = false; tiles.push({ g, b, t });
      const r = P.rod(V(), V(0, 0, 1), 0.022, '#9C978C'); r.visible = false; S.add(r); rods.push(r);
    }
    const ghost = P.box(1.05, 0.18, 0.44, C.red, { r: 0.05 }); ghost.visible = false; S.add(ghost);

    const lamp = P.ball(0.12, C.green); lamp.material = new THREE.MeshLambertMaterial({ color: C.green }); lamp.position.set(-4.0, 0.3, 0.6); S.add(lamp);

    let drawKey = '';
    function draw() {
      const L = live(), dam = damaged();
      // blocks
      for (let a = 1; a < SLOTS; a++) {
        const { b, t } = blocks[a], n = node(a);
        const writing = st.cur && ((st.cur.type === 'append' && a === st.file.length + 1) || (st.cur.type === 'over' && a === st.cur.a));
        b.visible = !!(n || writing);
        if (!b.visible) {  continue; }
        const rec = n || st.cur.rec;
        const torn = rec.state === 'torn';
        const col = torn ? C.red : writing ? C.orange : L.has(a) ? '#2E8C87' : '#BDB7AA';
        b.material.color.set(col);
      }
      // the root pointer
      const rootOk = st.root <= st.file.length;
      blocks[0].b.material.color.set(st.cur?.type === 'root' ? C.orange : C.gold);
      if (ptr) { S.root.remove(ptr); ptr.geometry.dispose(); ptr = null; }
      ptrHead.visible = st.root > 0;
      if (st.root > 0) {
        const a = slotPos(0).add(V(0, 0.26, -0.04)), b = slotPos(st.root).add(V(0, 0.3, -0.04)), h = 0.45 + Math.min(0.5, a.distanceTo(b) * 0.08);
        const pts = [a, a.clone().lerp(b, 0.2).add(V(0, h, -0.3)), a.clone().lerp(b, 0.8).add(V(0, h, -0.3)), b.clone().add(V(0, 0.12, 0))];
        ptr = P.tube(pts, 0.025, rootOk ? C.ink : C.red); ptr.userData.noFit = true; S.root.add(ptr);
        const end = ptr.userData.curve.getPoint(1), dir = ptr.userData.curve.getTangent(1);
        ptrHead.position.copy(end); ptrHead.quaternion.setFromUnitVectors(V(0, 1, 0), dir); ptrHead.material = P.mat(rootOk ? C.ink : C.red);
      }
      // the tree
      const w = walk(st.root), n = w.length, sp = Math.min(1.15, 7.4 / Math.max(1, n - 1));
      const pos = new Map(w.map((x, i) => [x.a, V((i - (n - 1) / 2) * sp, 0, -2.45 + x.d * 0.7)]));
      const top = w.find(x => x.d === 0); treeTop.copy(top ? pos.get(top.a) : V(0, 0, -2.45));
      tiles.forEach((T, i) => {
        const x = w[i]; T.g.visible = !!x; if (!x) return;
        T.g.position.copy(pos.get(x.a));
        const torn = x.n.state === 'torn';
        T.b.material.color.set(torn ? C.red : '#2E8C87');
      });
      let ri = 0;
      for (const x of w) for (const ch of [x.n.l, x.n.r]) if (ch && pos.has(ch) && ri < rods.length) { P.setRod(rods[ri], pos.get(x.a).clone().add(V(0, 0.09, 0.22)), pos.get(ch).clone().add(V(0, 0.09, -0.22))); rods[ri++].visible = true; }
      for (; ri < rods.length; ri++) rods[ri].visible = false;
      ghost.visible = !rootOk; ghost.position.set(0, 0, -2.45);
      lamp.material.color.set(st.cut ? C.red : dam ? C.red : C.green);
    }
    function update(dt) {
      step(dt * (S.reduced ? 2 : 1));
      const key = JSON.stringify([st.file.length, st.root, st.cur && [st.cur.type, st.cur.a], st.cut > 0, st.file.map(f => f.state + f.val).join(), unit]);
      if (key !== drawKey) { drawKey = key; draw(); }
    }
    fresh(); draw();
    const reset = () => { st.rootFirst = false; st.inPlace = false; fresh(); drawKey = ''; };
    const controls = [
      { type: 'buttons', label: 'Write to the book', options: ['A new member joins', 'Someone saves a little more'], get: () => -1, act: i => (i ? save() : join()) },
      { type: 'button', label: 'Pull the plug mid-write', short: 'Pull the plug', act: () => pullPlug() },
      { type: 'button', label: 'Tidy the file', short: 'Tidy', act: () => compact(), hint: 'Copy only the live tree into a fresh file' },
      { type: 'button', label: 'Start again', act: reset },
    ];
    const readouts = [
      { label: 'Blocks in the file', get: () => { const n = st.file.length, l = live().size; return { v: `${n}`, sub: `${l} live · ${Math.max(0, n - l)} old copies`, bar: n / (SLOTS - 1), bad: n > SLOTS - 8 }; }, bar: true },
      { label: 'The book', get: () => (st.cut ? { v: 'power off', bad: true } : damaged() ? { v: 'corrupt', bad: true } : { v: `${walk(st.root).length} members`, good: true }) },
    ];
    const labels = [
      { name: 'root', t: 'The root pointer', d: 'Where the tree starts. Moved last', icon: 'target', at: () => slotPos(0).add(V(0, 0.3, -0.04)) },
      { name: 'file', t: 'The file', d: 'Blocks are only ever added to the end', icon: 'box', at: () => slotPos(Math.max(1, st.file.length)).add(V(0, 0.28, -0.04)) },
      { name: 'tree', t: 'The tree', d: 'Names in order: left is earlier in the alphabet', icon: 'spark', at: () => treeTop.clone().add(V(0.42, 0.2, 0)) },
      { name: 'old', t: 'Old copies', d: 'Grey: no longer reachable from the root', icon: 'info', at: () => { const L = live(); for (let a = 1; a <= st.file.length; a++) if (!L.has(a)) return slotPos(a).add(V(0, 0.28, -0.04)); return slotPos(1); }, hide: () => st.file.length === live().size },
    ];
    const breaks = [
      { label: 'Move the root first, then pull the plug', hint: 'The pointer goes to blocks that never got written', on: () => { st.rootFirst = true; st.inPlace = false; pullPlug(PH() * 1.6); }, off: () => { st.rootFirst = false; fresh(); drawKey = ''; } },
      { label: 'Overwrite in place, then pull the plug', hint: 'Change a saved block directly, and lose power halfway', on: () => { st.inPlace = true; st.rootFirst = false; pullPlug(PH() * 0.6); }, off: () => { st.inPlace = false; fresh(); drawKey = ''; } },
    ];
    function status() {
      if (st.cut) return { ok: false, msg: '<b>Power cut.</b> Everything in memory is gone. When the machine comes back, the database reads the root pointer at the start of the file and rebuilds the tree from there.' };
      if (st.root > st.file.length) return { ok: false, msg: `<b>Corrupt.</b> The root was moved first, to block ${st.root}, but the power died before that block was written. The pointer now leads to nothing, and the whole book is unreadable. Write the data first, the pointer last.` };
      if (damaged()) return { ok: false, msg: '<b>Half-written block.</b> Overwriting in place has no safe moment: the power died with the block half old, half new, and that member\'s savings now read as garbage. Appending new blocks never touches the old ones.' };
      if (st.event === 'reopened') return { ok: true, msg: `<b>Power back. Nothing lost.</b> The root still points at the last finished tree, so the book opens exactly as it was before the write. The half-done blocks at the end are just unreachable leftovers.` };
      if (st.cur) return { msg: st.cur.type === 'root' ? `<b>Moving the root</b> to block ${st.cur.a}. This one small write is the moment the change becomes real.` : st.cur.type === 'over' ? `<b>Overwriting block ${st.cur.a}</b> in place.` : `<b>Appending ${st.cur.rec.key}</b> to the end of the file. ${st.rootFirst ? '' : 'The old tree is untouched, so readers still see it.'}` };
      if (st.event === 'tidy') return { ok: true, msg: '<b>Tidied.</b> Only the live tree was copied into a fresh file. Real databases do this in the background (compaction or vacuuming).' };
      if (st.event === 'done') return { ok: true, msg: `<b>Saved: ${st.last}.</b> The changed path was copied to the end of the file, then the root moved. The old blocks stay, grey, until a tidy.` };
      return { msg: '<b>A savings group\'s book in a tiny database.</b> Add a member or a payment, and watch the new blocks go on the end before the root moves.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, join, save, pullPlug, compact, currency: () => { unit = S.money.nice(2); } };
  },

  story: [
    { t: 'A book that must not lose', home: true, say: 'A savings group keeps everyone\'s money in one book. A database\'s first job is to never lose or garble it, even if the power dies mid-write.' },
    { t: 'A tree of names', focus: 'tree', zoom: 1.3, say: 'The book is a tree. Names earlier in the alphabet go left, later ones go right, so finding anyone takes a few steps, not a search through everyone.' },
    { t: 'Blocks in a file', focus: 'file', zoom: 1.2, say: 'On disk the tree is a row of blocks in one file. Each block holds a name, an amount, and where its two children live.' },
    { t: 'Add, never change', focus: 'file', zoom: 1.2, say: 'When Kofi joins, nothing old is touched. New copies of the path down to him are added to the end of the file.', act: m => m.join(), wait: 4 },
    { t: 'The root moves last', focus: 'root', zoom: 1.3, say: 'Only when every new block is down does the root pointer at the start move to the new tree. That single small write is the commit.', wait: 2 },
    { t: 'Pull the plug', home: true, say: 'Now cut the power halfway through a write. The root still points at the old, finished tree, so when it restarts nothing is lost.', act: m => m.pullPlug(), wait: 4 },
  ],
  check: [
    { q: 'Why does this database add new blocks instead of changing old ones?', options: ['It is faster to type', 'A power cut can never leave an old block half-changed', 'Disks cannot be changed'], answer: 1, why: 'Old blocks are never touched, so the last finished tree always survives.' },
    { q: 'When does a change actually become real?', options: ['When the first new block is written', 'When the root pointer moves', 'When the file is tidied'], answer: 1, why: 'Readers start from the root. Until it moves, they see the old tree.' },
    { q: 'What goes wrong if the root is moved first?', options: ['Nothing', 'A power cut can leave it pointing at blocks that were never written', 'The tree gets sorted wrong'], answer: 1, why: 'Data first, pointer last: that order is the whole trick.' },
  ],
  terms: [
    ['Append-only', 'New data only ever goes on the end; nothing is overwritten.'],
    ['Binary tree', 'Each node has up to two children: smaller keys left, bigger right.'],
    ['Copy on write', 'Change something by writing a new copy, then pointing at it.'],
    ['Commit', 'The moment a change becomes visible. Here: moving the root.'],
    ['Compaction', 'Copying only live data to a fresh file to drop old copies.'],
  ],
  deeper: '<p>Real systems use the same ideas at scale. SQLite and PostgreSQL keep a write-ahead log so a crash can be replayed or undone. LMDB and CouchDB use copy-on-write trees like this one. Disks and operating systems also hold writes in caches, so databases call <code>fsync</code> to force the data down before moving the pointer, or the order you asked for may not be the order that hits the disk.</p>',
  code: {
    title: 'The commit, in Python',
    note: 'A tiny copy-on-write tree: write the new path first, then the root.',
    text: `
import os, pickle

class Book:
    def __init__(self, path):
        self.f = open(path, "r+b" if os.path.exists(path) else "w+b")
        if self.f.seek(0, os.SEEK_END) == 0:
            self.f.write(b"\\0" * 8)          # room for the root pointer

    def _root(self):                    # the first 8 bytes say where the tree starts
        self.f.seek(0)
        return int.from_bytes(self.f.read(8) or b"\\0" * 8, "big")

    def _write_root(self, at):
        self.f.seek(0)
        self.f.write(at.to_bytes(8, "big"))

    def _read(self, at):
        self.f.seek(at)
        return pickle.load(self.f)

    def _append(self, node):            # never overwrite: always add to the end
        self.f.seek(0, os.SEEK_END)
        at = self.f.tell()
        pickle.dump(node, self.f)
        return at

    def _put(self, at, key, val):       # copy the path down to the key
        node = self._read(at) if at else None
        if node is None:
            return self._append((key, val, 0, 0))
        k, v, left, right = node
        if key < k:  return self._append((k, v, self._put(left, key, val), right))
        if key > k:  return self._append((k, v, left, self._put(right, key, val)))
        return self._append((k, val, left, right))

    def set(self, key, val):
        new_root = self._put(self._root(), key, val)
        self.f.flush(); os.fsync(self.f.fileno())   # 1. data safely on disk
        self._write_root(new_root)                  # 2. then move the pointer
        self.f.flush(); os.fsync(self.f.fileno())
`,
  },
};
