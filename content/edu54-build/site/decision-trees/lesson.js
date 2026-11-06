// Decision trees: farms placed by yearly rainfall and altitude, coloured by the crop that does best there (tea, maize, sorghum).
// A tree asks one yes/no question at a time ("rain above 900 mm?") and splits the field into boxes, each labelled with its commonest crop.
// Deeper trees fit the training farms better; held-out farms show when they start memorising noise.
// Break it: grow the tree with no depth limit (memorises), stop after one question (too simple), add a farm-number column (a fake perfect fit).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CROPS = [{ n: 'Tea', c: '#3E9B5F' }, { n: 'Maize', c: '#E3A72F' }, { n: 'Sorghum', c: '#C9774A' }];
const truth = (r, a) => a > 0.62 && r > 0.45 ? 0 : r > 0.32 ? 1 : 2;     // rain 0..1 (300–1800 mm), altitude 0..1 (0–2500 m)
const mk = (seed, n) => { const g = rngOf(seed), out = []; for (let i = 0; i < n; i++) { const r = g(), a = g(); let y = truth(r, a); if (g() < 0.1) y = Math.floor(g() * 3); out.push({ r, a, y, id: g() }); } return out; };
const TRAIN = mk(3, 140), TEST = mk(91, 140);
const FX = -1.2, FW = 3.6, G = 30;

export default {
  slug: 'decision-trees',
  title: 'Decision trees: twenty questions for data',
  description: 'Which crop does best on a farm: tea, maize or sorghum? A decision tree asks one question at a time about rainfall and altitude, cutting the field into boxes. Grow it deeper and watch it fit the farms it learned from, then start memorising noise.',
  overview: 'A decision tree is a flowchart of yes-or-no questions learned from data. At each step it picks the question that best separates the examples, here a cut on rainfall or altitude that leaves each side as pure as possible. Each final box predicts its commonest answer. Trees are easy to read and need no scaling of the numbers, but left to grow without limit they memorise every quirk of the training data, which is why we hold some data back to check them.',
  keywords: ['decision tree explained', 'gini impurity', 'overfitting decision tree', 'max depth', 'cart algorithm'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.6, 0.6, -0.2], dir: [0.15, 1.2, 1.15], half: 3, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { depth: 3, useId: false, showTest: false };
    const X = r => FX - FW / 2 + r * FW, Z = a => FW / 2 - a * FW;
    /* ---------- the field ---------- */
    const base = P.box(FW + 0.3, 0.1, FW + 0.3, '#2C2D31', { r: 0.08 }); base.position.set(FX, 0, 0); S.add(base);
    const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(FW / G * 0.98, 0.02, FW / G * 0.98).translate(0, 0.01, 0), new THREE.MeshLambertMaterial(), G * G); S.add(cells);
    const ptGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8).translate(0, 0.07, 0);
    const pts = new THREE.InstancedMesh(ptGeo, new THREE.MeshLambertMaterial(), 140); pts.userData.noFit = true; S.add(pts);
    const wrong = new THREE.InstancedMesh(new THREE.TorusGeometry(0.06, 0.012, 5, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 140); wrong.userData.noFit = true; wrong.layers.set(1); S.add(wrong);
    const walls = []; const wallGroup = new THREE.Group(); S.add(wallGroup);
    const axR = S.text('yearly rain: 300 → 1800 mm', { size: 0.13, weight: 750, maxW: 3.4 }); axR.position.set(FX, 0.105, FW / 2 + 0.32); S.add(axR);
    const axA = S.text('altitude: 0 → 2500 m', { size: 0.13, weight: 750, maxW: 3 }); axA.position.set(FX - FW / 2 - 0.32, 0.105, 0); axA.rotation.z = Math.PI / 2; S.add(axA);
    /* ---------- the tree diagram ---------- */
    const TX = 2.6, TZ = -1.2;
    const treeBase = P.box(2.6, 0.08, 3.4, '#F1EEE6', { r: 0.1 }); treeBase.position.set(TX, 0, TZ + 1.0); S.add(treeBase);
    const slotPos = k => { const d = Math.floor(Math.log2(k + 1)), i = k - (2 ** d - 1), w = 2.4 / 2 ** d; return V(TX - 1.2 + w * (i + 0.5), 0.08, TZ + d * 0.72); };
    const slots = [...Array(15)].map((_, k) => {
      const p = slotPos(k), m = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
      const b = P.box(0.55, 0.14, 0.32, '#FFFFFF', { r: 0.04, material: m }); b.position.copy(p); b.userData.noFit = true; S.add(b);
      const t = S.text('', { size: 0.085, weight: 800, color: '#151827', maxW: 0.52 }); t.position.copy(p).add(V(0, 0.145, 0)); t.userData.noFit = true; S.add(t);
      const q = k ? slotPos(Math.floor((k - 1) / 2)) : p, r = P.rod(V(q.x, 0.15, q.z + 0.16), V(p.x, 0.15, p.z - 0.16), 0.012, '#8E91A3'); r.userData.noFit = true; S.add(r);
      return { b, m, t, r };
    });
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- growing the tree (CART with Gini impurity) ---------- */
    const gini = xs => { if (!xs.length) return 0; const c = [0, 0, 0]; xs.forEach(p => c[p.y]++); return 1 - c.reduce((s, k) => s + (k / xs.length) ** 2, 0); };
    const major = xs => { const c = [0, 0, 0]; xs.forEach(p => c[p.y]++); return c.indexOf(Math.max(...c)); };
    function grow(xs, d, box) {
      const node = { n: xs.length, pred: major(xs), box };
      if (d >= st.depth || xs.length < 2 || gini(xs) === 0) return node;
      let best = null;
      for (const f of st.useId ? ['r', 'a', 'id'] : ['r', 'a']) {
        const vs = [...new Set(xs.map(p => p[f]))].sort((a, b) => a - b);
        for (let i = 1; i < vs.length; i++) {
          const t = (vs[i - 1] + vs[i]) / 2, L = xs.filter(p => p[f] < t), R = xs.filter(p => p[f] >= t);
          const g = (L.length * gini(L) + R.length * gini(R)) / xs.length;
          if (!best || g < best.g - 1e-12) best = { f, t, g, L, R };
        }
      }
      if (!best || best.g >= gini(xs) - 1e-9) return node;
      node.f = best.f; node.t = best.t;
      const lb = { ...box }, rb = { ...box };
      if (best.f === 'r') { lb.r1 = best.t; rb.r0 = best.t; } else if (best.f === 'a') { lb.a1 = best.t; rb.a0 = best.t; }
      node.L = grow(best.L, d + 1, lb); node.R = grow(best.R, d + 1, rb);
      return node;
    }
    let tree = null;
    const predict = (n, p) => n.f ? predict(p[n.f] < n.t ? n.L : n.R, p) : n.pred;
    const leaves = n => n.f ? leaves(n.L) + leaves(n.R) : 1;
    const depthOf = n => n.f ? 1 + Math.max(depthOf(n.L), depthOf(n.R)) : 0;
    const accOn = data => data.filter(p => predict(tree, p) === p.y).length / data.length;
    function draw() {
      tree = grow(TRAIN, 0, { r0: 0, r1: 1, a0: 0, a1: 1 });
      // the field coloured by what the tree predicts there (farm numbers can't be painted: use the nearest training farm's number)
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const r = (i + 0.5) / G, a = (j + 0.5) / G;
        let p = { r, a, id: 0.5 };
        if (st.useId) { let bd = 9; for (const q of TRAIN) { const d = (q.r - r) ** 2 + (q.a - a) ** 2; if (d < bd) { bd = d; p.id = q.id; } } }
        dummy.position.set(X(r), 0.104, Z(a)); dummy.scale.setScalar(1); dummy.updateMatrix(); cells.setMatrixAt(j * G + i, dummy.matrix);
        cells.setColorAt(j * G + i, col.set(CROPS[predict(tree, p)].c).lerp(new THREE.Color('#FFFFFF'), 0.45));
      }
      cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
      const data = st.showTest ? TEST : TRAIN;
      data.forEach((p, k) => {
        dummy.position.set(X(p.r), 0.12, Z(p.a)); dummy.scale.setScalar(1); dummy.updateMatrix(); pts.setMatrixAt(k, dummy.matrix); pts.setColorAt(k, col.set(CROPS[p.y].c));
        dummy.position.y = 0.27; dummy.scale.setScalar(predict(tree, p) === p.y ? 0.0001 : 1); dummy.updateMatrix(); wrong.setMatrixAt(k, dummy.matrix);
      });
      pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true; wrong.instanceMatrix.needsUpdate = true;
      // split walls, each only as long as its box
      for (const w of [...wallGroup.children]) wallGroup.remove(w);   // the box geometries are shared from a cache: never dispose them
      (function walk(n) {
        if (!n.f || n.f === 'id') { if (n.f) { walk(n.L); walk(n.R); } return; }
        const b = n.box, w = n.f === 'r' ? P.box(0.025, 0.2, (b.a1 - b.a0) * FW, '#FFFFFF', { r: 0 }) : P.box((b.r1 - b.r0) * FW, 0.2, 0.025, '#FFFFFF', { r: 0 });
        if (n.f === 'r') w.position.set(X(n.t), 0.11, Z((b.a0 + b.a1) / 2)); else w.position.set(X((b.r0 + b.r1) / 2), 0.11, Z(n.t));
        wallGroup.add(w); walk(n.L); walk(n.R);
      })(tree);
      // the tree diagram: the first four levels, in fixed slots (heap order: slot k has children 2k+1 and 2k+2)
      slots.forEach(sl => { sl.b.visible = sl.t.visible = sl.r.visible = false; });
      (function place(n, k, d) {
        if (d > 3 || k >= slots.length) return;
        const sl = slots[k], leaf = !n.f || d === 3;
        sl.b.visible = sl.t.visible = true; sl.r.visible = k > 0;
        sl.b.scale.x = leaf ? 0.65 : 1; sl.m.color.set(leaf ? CROPS[n.pred].c : '#FFFFFF');
        sl.t.userData.set(leaf ? (n.f ? '…' : CROPS[n.pred].n) : n.f === 'id' ? `farm no. < ${n.t.toFixed(2)}?` : n.f === 'r' ? `rain > ${Math.round(300 + n.t * 1500)}?` : `alt > ${Math.round(n.t * 2500)}?`);
        sl.t.userData.style({ maxW: leaf ? 0.34 : 0.52 });
        if (n.f && d < 3) { place(n.L, 2 * k + 1, d + 1); place(n.R, 2 * k + 2, d + 1); }
      })(tree, 0, 0);
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Depth (questions in a row)', min: 1, max: 12, step: 1, get: () => st.depth, set: v => { st.depth = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Show farms it never saw', short: 'New farms', get: () => st.showTest, set: v => { st.showTest = v; draw(); } },
      { type: 'toggle', label: 'Allow the farm-number column', short: 'Farm number', get: () => st.useId, set: v => { st.useId = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Right on training farms', get: () => ({ v: `${Math.round(accOn(TRAIN) * 100)}%`, bar: accOn(TRAIN) }), bar: true },
      { label: 'Right on new farms', get: () => ({ v: `${Math.round(accOn(TEST) * 100)}%`, bar: accOn(TEST), good: accOn(TEST) > 0.84, bad: accOn(TEST) < 0.75 }), bar: true },
      { label: 'Boxes (leaves)', get: () => ({ v: leaves(tree), sub: `depth ${depthOf(tree)}` }) },
    ];
    const labels = [
      { name: 'farms', t: 'Farms', d: 'Colour: the crop that did best there', icon: 'box', atV: V(FX - FW / 2 - 0.15, 0.1, -FW / 2) },
      { name: 'boxes', t: 'Boxes from cuts', d: 'Each cut is one question', icon: 'scale', atV: V(FX - FW / 2 - 0.15, 0.1, FW / 2) },
      { name: 'tree', t: 'The questions, as a tree', d: 'Top: the most useful question', icon: 'link', atV: V(TX + 1.3, 0.1, TZ - 0.6) },
      { name: 'leaves', t: 'Leaves: the answers', d: 'The commonest crop in each box', icon: 'check', atV: V(TX + 1.3, 0.1, TZ + 2.6) },
    ];
    const reset = () => { Object.assign(st, { depth: 3, useId: false, showTest: false }); draw(); };
    const breaks = [
      { label: 'No depth limit', hint: 'Keep asking until every box is pure', on: () => { reset(); st.depth = 12; st.showTest = true; draw(); }, off: reset },
      { label: 'Only one question', hint: 'Depth 1', on: () => { reset(); st.depth = 1; draw(); }, off: reset },
      { label: 'Allow the farm number', hint: 'A column that means nothing', on: () => { reset(); st.useId = true; st.depth = 12; draw(); }, off: reset },
    ];
    function status() {
      const tr = Math.round(accOn(TRAIN) * 100), te = Math.round(accOn(TEST) * 100);
      if (st.useId && st.depth > 6) return { ok: false, msg: `<b>A perfect fit to nothing.</b> The farm number means nothing, but with no depth limit the tree uses it to carve a box around every odd farm: ${tr}% right on the training farms, only ${te}% on new ones. Columns that identify a row (an ID, a timestamp) let a model memorise instead of learn.` };
      if (st.depth >= 8) return { ok: false, msg: `<b>Memorising.</b> With no limit the tree keeps cutting until every box holds one crop, ${leaves(tree)} boxes in all, even around the 10% of farms that were simply noisy. ${tr}% right on the farms it learned from, ${te}% on new farms (white rings: wrong). Limit the depth, or prune.` };
      if (st.depth === 1) return { ok: false, msg: `<b>Too simple.</b> One question (${tree.f === 'r' ? 'rain' : 'altitude'} above or below one value) can only split the field in two, so one of the three crops is never predicted: ${tr}% right even on its own farms. That is underfitting.` };
      return { ok: te >= 84 ? true : undefined, msg: `<b>Depth ${depthOf(tree)}, ${leaves(tree)} boxes.</b> The first question is "${tree.f === 'r' ? `rain above ${Math.round(300 + tree.t * 1500)} mm` : `altitude above ${Math.round(tree.t * 2500)} m`}?", the cut that best separates the crops. ${tr}% right on the training farms, ${te}% on farms it never saw.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Which crop?', home: true, say: 'Each peg is a farm in East Africa, placed by how much rain it gets and how high it is. Its colour is the crop that does best there: tea, maize or sorghum.', act: m => m.set({ depth: 1, showTest: false }) },
    { t: 'One question', home: true, say: 'A decision tree starts with the single question that best separates the crops. Here it is: is the rain above about eight hundred millimetres? One cut, two boxes.', wait: 5 },
    { t: 'More questions', focus: 'tree', zoom: 1.35, say: 'Then each box asks its own next question. Is it high up? Tea grows in the cool, wet highlands. Three levels of questions, and the field is cut into neat boxes.', act: m => m.set({ depth: 3 }) },
    { t: 'Farms it never saw', home: true, say: 'Check it on farms it never saw. Most land in the right box. White rings mark the mistakes.', act: m => m.set({ depth: 3, showTest: true }), wait: 5 },
    { t: 'Too deep', home: true, say: 'Let the tree keep asking until every box is pure, and it carves tiny boxes around every odd farm. Perfect on what it learned, worse on new farms. It has memorised the noise.', act: m => m.set({ depth: 12, showTest: true }), wait: 6 },
    { t: 'Keep it short', home: true, say: 'So trees are kept short, or pruned, or many are averaged into a forest. A short tree is also easy to read: anyone can follow its questions.', act: m => m.set({ depth: 4, showTest: true }) },
  ],
  check: [
    { q: 'How does a tree choose each question?', options: ['It picks the cut that leaves each side as pure as possible', 'At random', 'Alphabetically'], answer: 0, why: 'It tries the possible cuts and keeps the one that most reduces impurity (Gini).' },
    { q: 'A tree with no depth limit scores 100% on training data and 70% on new data. What happened?', options: ['It memorised noise: overfitting', 'It is too simple', 'The new data is wrong'], answer: 0, why: 'Tiny boxes around odd examples don\'t generalise.' },
    { q: 'Why is a farm-number column dangerous?', options: ['It lets the tree single out individual rows, a fake perfect fit', 'Numbers can\'t be used in trees', 'It is too slow'], answer: 0, why: 'An ID carries no real signal, but splitting on it isolates each example.' },
  ],
  terms: [
    ['Decision tree', 'A flowchart of yes-or-no questions learned from data.'],
    ['Split', 'One question, such as "rain above 800 mm?", dividing the examples in two.'],
    ['Gini impurity', 'How mixed a box is: 0 when every example in it has the same answer.'],
    ['Leaf', 'A final box, which predicts its commonest answer.'],
    ['Max depth', 'The longest run of questions allowed; the main guard against overfitting.'],
  ],
  deeper: '<p><b>Forests.</b> A random forest grows hundreds of trees, each on a random sample of rows and columns, and lets them vote. The quirks of single trees cancel out. Gradient-boosted trees go further, each new tree fixing the last ones\' mistakes; they win many competitions on tables of data.</p><p><b>No scaling needed.</b> A tree only asks "above or below?", so it doesn\'t care whether rain is in millimetres or metres, unlike distance-based methods.</p><p><b>Pruning</b> grows a deep tree, then removes splits that don\'t help on validation data.</p>',
  code: {
    title: 'Grow a tree with Gini impurity',
    note: 'Adapted from the course\'s decision-tree lesson.',
    text: `
def gini(rows):
    counts = {}
    for *_, y in rows:
        counts[y] = counts.get(y, 0) + 1
    return 1 - sum((c / len(rows)) ** 2 for c in counts.values())

def best_split(rows):
    best = None
    for f in range(len(rows[0]) - 1):                 # each feature
        for t in sorted({r[f] for r in rows}):       # each cut
            left = [r for r in rows if r[f] < t]
            right = [r for r in rows if r[f] >= t]
            if not left or not right:
                continue
            g = (len(left) * gini(left) + len(right) * gini(right)) / len(rows)
            if best is None or g < best[0]:
                best = (g, f, t, left, right)
    return best

def grow(rows, depth=0, max_depth=3):
    split = best_split(rows)
    if depth == max_depth or split is None or gini(rows) == 0:
        ys = [r[-1] for r in rows]
        return max(set(ys), key=ys.count)            # a leaf
    _, f, t, left, right = split
    return (f, t, grow(left, depth + 1, max_depth), grow(right, depth + 1, max_depth))
`,
  },
};
