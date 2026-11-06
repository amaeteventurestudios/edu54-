// Ensemble methods: the crop field from the decision-tree lesson, but now judged by a forest. Each small tree learns from its own
// random resample of the farms (bagging) and sees a random feature first; the forest paints the field by majority vote.
// Nine little fields show nine trees; the big field shows the vote. Break it: a forest of identical trees (no randomness), and one deep tree alone.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CROPS = ['#3E9B5F', '#E3A72F', '#C9774A'];
const truth = (r, a) => (a - 0.55) ** 2 + (r - 0.5) ** 2 < 0.07 ? 0 : r + a * 0.4 > 0.75 ? 1 : 2;   // a round highland of tea
const mk = (seed, n) => { const g = rngOf(seed), out = []; for (let i = 0; i < n; i++) { const r = g(), a = g(); let y = truth(r, a); if (g() < 0.12) y = Math.floor(g() * 3); out.push({ r, a, y }); } return out; };
const TRAIN = mk(5, 160), TEST = mk(77, 200);
const BIG = 3.0, G = 30, SMALL = 0.9, GS = 14;

export default {
  slug: 'ensembles',
  title: 'Ensembles: a forest beats a tree',
  description: 'One deep decision tree is jumpy: change a few farms and its answer changes. Grow many small trees, each on its own random sample of the farms, and let them vote. Watch nine trees disagree and the forest\'s vote come out smooth and steady. Then make every tree the same.',
  overview: 'An ensemble combines many models into one. A random forest grows hundreds of decision trees, each on a random resample of the data (bagging) and each choosing among a random subset of features at every question. Each tree on its own is noisy, but their mistakes point in different directions, so the majority vote cancels much of the noise. Boosting is the other family: each new model concentrates on the examples the previous ones got wrong. Ensembles of trees win most competitions on tables of data.',
  keywords: ['random forest explained', 'ensemble learning', 'bagging', 'boosting', 'wisdom of crowds machine learning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.3, 0], dir: [0.15, 1.4, 1.0], half: 2.9, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { trees: 25, depth: 6, random: true, single: false };
    /* ---------- growing trees ---------- */
    const gini = xs => { if (!xs.length) return 0; const c = [0, 0, 0]; xs.forEach(p => c[p.y]++); return 1 - c.reduce((s, k) => s + (k / xs.length) ** 2, 0); };
    const major = xs => { const c = [0, 0, 0]; xs.forEach(p => c[p.y]++); return c.indexOf(Math.max(...c)); };
    function grow(xs, d, r) {
      if (d >= st.depth || xs.length < 3 || gini(xs) === 0) return { pred: major(xs) };
      let best = null;
      // a random forest considers one random feature first at each question (here: both, in random order, with a random sample of cut points)
      const feats = st.random ? (r() < 0.5 ? ['r'] : ['a']) : ['r', 'a'];
      for (const f of feats) {
        const vs = [...new Set(xs.map(p => p[f]))].sort((a, b) => a - b);
        const step = st.random ? Math.max(1, Math.floor(vs.length / 12)) : 1;
        for (let i = 1; i < vs.length; i += step) {
          const t = (vs[i - 1] + vs[i]) / 2, L = xs.filter(p => p[f] < t), R = xs.filter(p => p[f] >= t);
          const g = (L.length * gini(L) + R.length * gini(R)) / xs.length;
          if (!best || g < best.g) best = { f, t, g, L, R };
        }
      }
      if (!best || !best.L.length || !best.R.length) return { pred: major(xs) };
      return { f: best.f, t: best.t, L: grow(best.L, d + 1, r), R: grow(best.R, d + 1, r) };
    }
    const predict = (n, p) => n.f ? predict(p[n.f] < n.t ? n.L : n.R, p) : n.pred;
    let forest = [];
    function build() {
      const K = st.single ? 1 : st.trees; forest = [];
      for (let k = 0; k < K; k++) {
        const r = rngOf(101 + k * 7);
        // bagging: draw as many farms as there are, with replacement (some twice, some not at all)
        const sample = st.random && !st.single ? TRAIN.map(() => TRAIN[Math.floor(r() * TRAIN.length)]) : TRAIN;
        forest.push(grow(sample, 0, r));
      }
    }
    const vote = p => { const c = [0, 0, 0]; forest.forEach(t => c[predict(t, p)]++); return c.indexOf(Math.max(...c)); };
    const acc = (f, data) => data.filter(p => f(p) === p.y).length / data.length;
    /* ---------- the big field (the vote) and nine small fields (single trees) ---------- */
    const bx = -0.9;
    const bigBase = P.box(BIG + 0.3, 0.1, BIG + 0.3, '#2C2D31', { r: 0.08 }); bigBase.position.set(bx, 0, 0); S.add(bigBase);
    const bigCells = new THREE.InstancedMesh(new THREE.BoxGeometry(BIG / G, 0.02, BIG / G).translate(0, 0.01, 0), new THREE.MeshLambertMaterial(), G * G); S.add(bigCells);
    const bigT = S.text('THE FOREST\'S VOTE', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 3 }); bigT.position.set(bx, 0.05, (BIG + 0.3) / 2 + 0.005); S.add(bigT);
    const smalls = [...Array(9)].map((_, k) => {
      const x = 1.55 + (k % 3) * (SMALL + 0.18), z = -1.08 + Math.floor(k / 3) * (SMALL + 0.18);
      const b = P.box(SMALL + 0.1, 0.08, SMALL + 0.1, '#2C2D31', { r: 0.04 }); b.position.set(x, 0, z); S.add(b);
      const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(SMALL / GS, 0.02, SMALL / GS).translate(0, 0.01, 0), new THREE.MeshLambertMaterial(), GS * GS); S.add(cells);
      return { x, z, cells, b };
    });
    const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6).translate(0, 0.05, 0), new THREE.MeshLambertMaterial(), TRAIN.length); dots.userData.noFit = true; S.add(dots);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), white = new THREE.Color('#FFFFFF');
    function paint() {
      build();
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const p = { r: (i + 0.5) / G, a: (j + 0.5) / G };
        dummy.position.set(bx - BIG / 2 + BIG / G * (i + 0.5), 0.104, BIG / 2 - BIG / G * (j + 0.5)); dummy.scale.setScalar(1); dummy.updateMatrix(); bigCells.setMatrixAt(j * G + i, dummy.matrix);
        bigCells.setColorAt(j * G + i, col.set(CROPS[vote(p)]).lerp(white, 0.35));
      }
      bigCells.instanceMatrix.needsUpdate = true; bigCells.instanceColor.needsUpdate = true;
      smalls.forEach((s, k) => {
        const t = forest[k % forest.length], show = k < forest.length;
        s.cells.visible = show;
        for (let i = 0; i < GS; i++) for (let j = 0; j < GS; j++) {
          const p = { r: (i + 0.5) / GS, a: (j + 0.5) / GS };
          dummy.position.set(s.x - SMALL / 2 + SMALL / GS * (i + 0.5), 0.084, s.z + SMALL / 2 - SMALL / GS * (j + 0.5)); dummy.scale.setScalar(1); dummy.updateMatrix(); s.cells.setMatrixAt(j * GS + i, dummy.matrix);
          s.cells.setColorAt(j * GS + i, col.set(CROPS[predict(t, p)]).lerp(white, 0.25));
        }
        s.cells.instanceMatrix.needsUpdate = true; s.cells.instanceColor.needsUpdate = true;
      });
      TRAIN.forEach((p, i) => { dummy.position.set(bx - BIG / 2 + p.r * BIG, 0.12, BIG / 2 - p.a * BIG); dummy.scale.setScalar(1); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); dots.setColorAt(i, col.set(CROPS[p.y]).multiplyScalar(0.7)); });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
    }
    paint();
    const fa = () => acc(vote, TEST), ta = () => forest.reduce((s, t) => s + acc(p => predict(t, p), TEST), 0) / forest.length;
    const controls = [
      { type: 'slider', label: 'Trees in the forest', min: 1, max: 60, step: 1, get: () => st.trees, set: v => { st.trees = Math.round(v); st.single = false; paint(); } },
      { type: 'slider', label: 'Depth of each tree', min: 1, max: 10, step: 1, get: () => st.depth, set: v => { st.depth = Math.round(v); paint(); } },
      { type: 'toggle', label: 'Randomness (resample farms, random feature)', short: 'Randomness', get: () => st.random, set: v => { st.random = v; paint(); } },
    ];
    const readouts = [
      { label: 'One tree, on new farms', get: () => ({ v: `${Math.round(ta() * 100)}%`, sub: 'the average single tree' }) },
      { label: 'The forest, on new farms', get: () => ({ v: `${Math.round(fa() * 100)}%`, good: fa() > ta() + 0.03, bad: fa() <= ta() + 0.005 && !st.single }) },
    ];
    const labels = [
      { name: 'trees', t: 'Nine of the trees', d: 'Each learned from its own random sample', icon: 'link', atV: V(1.55 - SMALL / 2 - 0.05, 0.08, -1.08 - SMALL / 2) },
      { name: 'vote', t: 'The forest\'s vote', d: 'Majority of every tree, at every spot', icon: 'check', atV: V(bx - BIG / 2 - 0.15, 0.1, -BIG / 2) },
      { name: 'farms', t: 'The farms', d: 'Twelve in a hundred are just noise', icon: 'box', atV: V(bx - BIG / 2 - 0.15, 0.1, BIG / 2) },
      { name: 'differ', t: 'They disagree', d: 'And that is the point', icon: 'spark', atV: V(1.55 + 2 * (SMALL + 0.18) + SMALL / 2 + 0.05, 0.08, -1.08 + 2 * (SMALL + 0.18) + SMALL / 2) },
    ];
    const reset = () => { Object.assign(st, { trees: 25, depth: 6, random: true, single: false }); paint(); };
    const breaks = [
      { label: 'A forest of identical trees', hint: 'No resampling, no random features', on: () => { reset(); st.random = false; paint(); }, off: reset },
      { label: 'One deep tree alone', hint: 'Depth 10, no forest', on: () => { reset(); st.single = true; st.depth = 10; paint(); }, off: reset },
    ];
    function status() {
      const f = Math.round(fa() * 100), t = Math.round(ta() * 100);
      if (!st.random) return { ok: false, msg: `<b>${st.trees} copies of the same tree.</b> With no resampling and no random features, every tree sees the same farms and asks the same questions, so all nine small fields are identical and the vote is just one tree again: ${f}%. A forest only helps when its trees make different mistakes.` };
      if (st.single) return { ok: false, msg: `<b>One deep tree: ${f}% on new farms.</b> It carves little islands around the noisy farms, and a slightly different set of farms would give quite different islands. Switch the forest back on: averaging many such trees cancels the islands out.` };
      if (st.trees < 4) return { msg: `<b>Only ${st.trees} tree${st.trees > 1 ? 's' : ''}.</b> Too few to cancel each other's mistakes. Add trees and watch the vote steady.` };
      return { ok: f > t + 3 ? true : undefined, msg: `<b>The forest: ${f}% right on new farms; a single tree averages ${t}%.</b> Each tree learned from its own random resample of the farms, so each made different mistakes (look at the nine small fields), and the majority vote cancelled many of them out.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); paint(); } };
  },

  story: [
    { t: 'One tree is jumpy', home: true, say: 'Here are the farms from the decision tree lesson. One deep tree carves little islands around every odd farm. Change a few farms and the islands move.', act: m => m.set({ single: true, depth: 10 }), wait: 4 },
    { t: 'Many trees', focus: 'trees', zoom: 1.3, say: 'Now grow many smaller trees. Each one learns from its own random sample of the farms, some picked twice, some left out. These are nine of them. They disagree.', act: m => m.set({ single: false, depth: 6, random: true }) },
    { t: 'Let them vote', home: true, say: 'At every spot on the field, every tree votes, and the majority wins. Their mistakes point in different directions, so many of them cancel out.', wait: 4 },
    { t: 'More trees, steadier', home: true, say: 'The more trees, the steadier the vote, though after a few dozen it hardly changes. That is a random forest.', act: m => m.set({ trees: 60 }), wait: 4 },
    { t: 'Copies don\'t help', home: true, say: 'Take away the randomness, and every tree sees the same farms and makes the same mistakes. A forest of copies is just one tree.', act: m => m.set({ trees: 25, random: false }), wait: 5 },
    { t: 'Boosting', home: true, say: 'The other family, boosting, grows trees one after another, each one focusing on the farms the earlier trees got wrong. Both ideas rule competitions on tables of data.', act: m => m.set({ random: true }) },
  ],
  check: [
    { q: 'Why does a random forest train each tree on a random resample?', options: ['So the trees make different mistakes that cancel in the vote', 'To make each tree bigger', 'To save memory'], answer: 0, why: 'Averaging only helps when errors are not all the same.' },
    { q: 'A forest of identical trees performs…', options: ['The same as one tree', 'Much better than one tree', 'Worse than random'], answer: 0, why: 'Identical voters give identical votes: no averaging effect.' },
    { q: 'How does boosting differ from bagging?', options: ['Each new model focuses on the previous models\' mistakes', 'It uses only one model', 'It removes data'], answer: 0, why: 'Boosting builds models in sequence; bagging builds them independently and averages.' },
  ],
  terms: [
    ['Ensemble', 'Several models combined into one prediction.'],
    ['Bagging', 'Training each model on a random resample (with replacement) and averaging their predictions.'],
    ['Random forest', 'Bagged decision trees that also pick features at random at each split.'],
    ['Boosting', 'Training models one after another, each correcting the errors of those before.'],
    ['Out-of-bag', 'The examples a tree never saw in its resample, usable as a free test set for that tree.'],
  ],
  deeper: '<p><b>Why averaging works.</b> If each tree is right 70% of the time and their mistakes are independent, a vote of many is right far more often. Real trees are correlated, which is why forests add random features: to keep them different.</p><p><b>Gradient boosting</b> (XGBoost, LightGBM, CatBoost) fits each new tree to the remaining errors of the ensemble so far, with a small step size. Tuned well, it is the strongest general method for tabular data.</p><p><b>Ensembles everywhere.</b> Averaging several neural networks trained from different starting points also helps; so does dropout, which is like training many thinned networks at once.</p>',
  code: {
    title: 'A random forest from small trees',
    note: 'Adapted from the course\'s ensembles lesson; grow() is the tree from the decision-tree lesson.',
    text: `
import random
from collections import Counter

def random_forest(rows, n_trees=25, max_depth=6, seed=0):
    rng = random.Random(seed)
    forest = []
    for _ in range(n_trees):
        sample = [rng.choice(rows) for _ in rows]        # bagging: with replacement
        forest.append(grow(sample, max_depth=max_depth, random_features=True))
    return forest

def vote(forest, x):
    return Counter(predict(tree, x) for tree in forest).most_common(1)[0][0]
`,
  },
};
