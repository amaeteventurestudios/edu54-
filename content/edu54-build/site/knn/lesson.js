// k-nearest neighbours: a map of past customers (how much they spend, how often they come), each coloured by the drink they chose.
// A new customer asks the k nearest for a vote. The field is painted with the vote everywhere.
// Break it: k = 1 (every odd customer gets an island), k = all (the majority always wins), and spending in shillings against visits in days (unscaled).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const DRINKS = [{ n: 'Tea', c: '#3E9B5F' }, { n: 'Coffee', c: '#6B4A3A' }, { n: 'Juice', c: '#EE7434' }];
const CENT = [[0.25, 0.7], [0.72, 0.62], [0.5, 0.22]];
const DATA = (() => { const r = rngOf(17), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()), out = []; for (let i = 0; i < 75; i++) { const k = i % 3; let y = k; if (r() < 0.08) y = (k + 1) % 3; out.push({ a: Math.max(0.03, Math.min(0.97, CENT[k][0] + g() * 0.12)), b: Math.max(0.03, Math.min(0.97, CENT[k][1] + g() * 0.12)), y }); } return out; })();
const FW = 3.8, G = 34;

export default {
  slug: 'knn',
  title: 'Nearest neighbours: ask the ones most like you',
  description: 'A café in Kigali knows what its regulars drink and how they spend. When a new customer walks in, ask the most similar regulars and go with the majority. Change how many you ask, ask just one, ask everyone, then measure one thing in shillings and the other in days.',
  overview: 'k-nearest neighbours may be the simplest learning method there is: to predict for something new, find the k examples most like it and let them vote. There is no training at all; the examples are the model. Small k follows every quirk of the data, large k smooths it into blandness. And because "most like" means "nearest", every feature must be on the same scale, or the one with the biggest numbers decides alone.',
  keywords: ['k nearest neighbors explained', 'knn classifier', 'choosing k', 'feature scaling knn', 'distance based learning'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.2, 1.4, 1.05], half: 2.9, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 7, q: [0.45, 0.55], unscaled: false };
    const X = a => -FW / 2 + a * FW, Z = b => FW / 2 - b * FW;
    /* ---------- the map ---------- */
    const base = P.box(FW + 0.3, 0.1, FW + 0.3, '#2C2D31', { r: 0.08 }); S.add(base);
    const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(FW / G, 0.02, FW / G).translate(0, 0.01, 0), new THREE.MeshLambertMaterial(), G * G); S.add(cells);
    const axA = S.text('spends per visit →', { size: 0.14, weight: 750, maxW: 3 }); axA.position.set(0, 0.105, FW / 2 + 0.3); S.add(axA);
    const axB = S.text('visits per month →', { size: 0.14, weight: 750, maxW: 3 }); axB.position.set(-FW / 2 - 0.3, 0.105, 0); axB.rotation.z = Math.PI / 2; S.add(axB);
    const cups = DATA.map(d => { const g = new THREE.Group(); g.position.set(X(d.a), 0.12, Z(d.b)); S.add(g); const c = P.cyl(0.07, 0.16, DRINKS[d.y].c, { r2: 0.09 }); g.add(c); return g; });
    /* ---------- the newcomer and the lines to its neighbours ---------- */
    const who = new THREE.Group(); S.add(who);
    const body = P.cyl(0.11, 0.3, '#FFFFFF'); who.add(body);
    const head = P.ball(0.1, '#FFFFFF'); head.position.y = 0.4; who.add(head);
    const lines = [...Array(75)].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.012, '#FFFFFF'); r.userData.noFit = true; S.add(r); return r; });
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#FFFFFF' })); ringM.userData.noFit = true; ringM.layers.set(1); S.add(ringM);
    const voteT = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.4 }); voteT.userData.noFit = true; S.add(voteT);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), white = new THREE.Color('#FFFFFF');
    // in "unscaled" mode spending is in shillings (thousands) and visits in days: the spending gap swamps everything
    const dist = (p, q) => st.unscaled ? Math.hypot((p[0] - q[0]) * 3000, (p[1] - q[1]) * 20) : Math.hypot(p[0] - q[0], p[1] - q[1]);
    function vote(q, k = st.k, skip = -1) {
      const ds = DATA.map((d, i) => ({ i, d: i === skip ? Infinity : dist([d.a, d.b], q) })).sort((a, b) => a.d - b.d).slice(0, k);
      const c = [0, 0, 0]; ds.forEach(x => c[DATA[x.i].y]++);
      return { win: c.indexOf(Math.max(...c)), counts: c, near: ds };
    }
    // leave-one-out: predict each customer from the others
    const loo = () => DATA.filter((d, i) => vote([d.a, d.b], st.k, i).win === d.y).length / DATA.length;
    function paint() {
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const a = (i + 0.5) / G, b = (j + 0.5) / G, v = vote([a, b]);
        dummy.position.set(X(a), 0.104, Z(b)); dummy.scale.setScalar(1); dummy.updateMatrix(); cells.setMatrixAt(j * G + i, dummy.matrix);
        cells.setColorAt(j * G + i, col.set(DRINKS[v.win].c).lerp(white, 0.3));
      }
      cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
      place();
    }
    function place() {
      const q = st.q, v = vote(q);
      who.position.set(X(q[0]), 0.12, Z(q[1]));
      body.material = head.material = P.mat(DRINKS[v.win].c);
      lines.forEach((l, i) => { const n = v.near[i]; l.visible = !!n && st.k <= 40; if (l.visible) { const d = DATA[n.i]; P.setRod(l, V(X(q[0]), 0.3, Z(q[1])), V(X(d.a), 0.2, Z(d.b))); l.material = P.mat(DRINKS[d.y].c); } });
      const far = v.near[v.near.length - 1], fd = DATA[far.i], rr = Math.hypot(X(fd.a) - X(q[0]), Z(fd.b) - Z(q[1]));
      ringM.visible = !st.unscaled && st.k <= 40; ringM.scale.set(rr, 1, rr); ringM.position.set(X(q[0]), 0.13, Z(q[1]));
      voteT.position.set(X(q[0]), 1.0, Z(q[1])); voteT.userData.set(DRINKS.map((d, i) => `${d.n} ${v.counts[i]}`).join(' · '));
    }
    paint();
    S.tap(cells, hit => { const a = (hit.point.x + FW / 2) / FW, b = (FW / 2 - hit.point.z) / FW; st.q = [Math.max(0, Math.min(1, a)), Math.max(0, Math.min(1, b))]; place(); S.sync(); });
    const controls = [
      { type: 'slider', label: 'k: how many neighbours vote', short: 'k', min: 1, max: 75, step: 1, get: () => st.k, set: v => { st.k = Math.round(v); paint(); } },
      { type: 'slider', label: 'Newcomer spends', min: 0, max: 1, step: 0.01, get: () => st.q[0], set: v => { st.q[0] = v; place(); }, quick: false },
      { type: 'slider', label: 'Newcomer visits', min: 0, max: 1, step: 0.01, get: () => st.q[1], set: v => { st.q[1] = v; place(); }, quick: false },
      { type: 'toggle', label: 'Spending in shillings, visits in days', short: 'Unscaled', get: () => st.unscaled, set: v => { st.unscaled = v; paint(); } },
    ];
    const readouts = [
      { label: 'The vote says', get: () => ({ v: DRINKS[vote(st.q).win].n }) },
      { label: 'Right on regulars it hadn\'t seen', get: () => { const a = loo(); return { v: `${Math.round(a * 100)}%`, bar: a, good: a > 0.84, bad: a < 0.7 }; }, bar: true },
    ];
    const labels = [
      { name: 'regulars', t: 'Regulars', d: 'Each cup: what that customer drinks', icon: 'box', atV: V(-FW / 2 - 0.15, 0.12, -FW / 2) },
      { name: 'new', t: 'A new customer', d: 'Tap the map to move them', icon: 'target', at: () => who.position.clone().add(V(0, 0.5, 0)) },
      { name: 'ring', t: 'The k nearest', d: 'Each one gets one vote', icon: 'link', atV: V(FW / 2 + 0.15, 0.12, -FW / 2) },
      { name: 'map', t: 'The vote everywhere', d: 'The map is painted with every vote', icon: 'scale', atV: V(FW / 2 + 0.15, 0.12, FW / 2) },
    ];
    const reset = () => { Object.assign(st, { k: 7, q: [0.45, 0.55], unscaled: false }); paint(); };
    const breaks = [
      { label: 'Ask only one neighbour', hint: 'k = 1', on: () => { reset(); st.k = 1; paint(); }, off: reset },
      { label: 'Ask everyone', hint: 'k = 75', on: () => { reset(); st.k = 75; paint(); }, off: reset },
      { label: 'Shillings against days', hint: 'Features not scaled', on: () => { reset(); st.unscaled = true; paint(); }, off: reset },
    ];
    function status() {
      const a = Math.round(loo() * 100), v = vote(st.q);
      if (st.unscaled) return { ok: false, msg: `<b>Spending decides alone.</b> Spending is now in shillings, thousands apart, and visits in days, a few apart, so "nearest" just means "spends about the same". The map turns into vertical stripes and visits stop mattering: ${a}% right. Scale every feature to the same range first.` };
      if (st.k === 1) return { ok: false, msg: `<b>Every odd customer gets an island.</b> With one neighbour, the vote copies whoever is closest, including the few regulars who ordered something unusual. The map is full of speckles: ${a}% right on regulars it hadn't seen.` };
      if (st.k >= 70) return { ok: false, msg: `<b>The majority always wins.</b> Asking all ${st.k} regulars gives the same answer everywhere: whatever is most common overall. The map is one colour and the newcomer's habits don't matter at all: ${a}% right.` };
      return { ok: a > 84 ? true : undefined, msg: `<b>${st.k} nearest regulars vote: ${DRINKS.map((d, i) => `${d.n.toLowerCase()} ${v.counts[i]}`).join(', ')}.</b> So the newcomer is offered ${DRINKS[v.win].n.toLowerCase()}. Predicting each regular from the others gets ${a}% right. Tap the map to move the newcomer.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); paint(); } };
  },

  story: [
    { t: 'A café\'s regulars', home: true, say: 'A café in Kigali knows its regulars: how much each spends, how often each comes, and what each drinks: tea, coffee or juice.', act: m => m.reset() },
    { t: 'Someone new', focus: 'new', zoom: 1.4, say: 'A new customer walks in. What will they want? Find the regulars most like them, the nearest on the map, and let them vote.' },
    { t: 'The vote everywhere', home: true, say: 'Do that for every spot and the map is painted with the answer. There is no training: the regulars themselves are the model.', wait: 4 },
    { t: 'Ask just one', home: true, say: 'Ask only the single nearest regular, and every odd order makes its own little island. The map turns speckled.', act: m => m.set({ k: 1 }), wait: 5 },
    { t: 'Ask everyone', home: true, say: 'Ask every regular, and the most popular drink wins everywhere. Somewhere in between, around seven here, works best.', act: m => m.set({ k: 75 }), wait: 5 },
    { t: 'Same scale first', home: true, say: 'Measure spending in shillings and visits in days, and spending swamps everything, because its numbers are so much bigger. Put every feature on the same scale first.', act: m => m.set({ k: 7, unscaled: true }), wait: 5 },
  ],
  check: [
    { q: 'How does k-nearest neighbours predict?', options: ['The k most similar examples vote', 'It fits a straight line', 'It asks a decision tree'], answer: 0, why: 'There is no training; the nearest examples decide by majority.' },
    { q: 'What happens with k = 1?', options: ['It follows every odd example, making a speckled map', 'It always predicts the majority', 'It can\'t predict'], answer: 0, why: 'One neighbour copies whoever is closest, mistakes and all.' },
    { q: 'Spending is in thousands and visits in single digits. What goes wrong?', options: ['Spending dominates the distance', 'Nothing', 'Visits dominate'], answer: 0, why: 'Bigger numbers make bigger gaps. Scale features before using distances.' },
  ],
  terms: [
    ['k-nearest neighbours', 'Predicting from the k most similar stored examples.'],
    ['k', 'How many neighbours vote. Small: jumpy. Large: bland.'],
    ['Lazy learning', 'No training step: all the work happens when a question arrives.'],
    ['Feature scaling', 'Putting every feature on the same range so none dominates distances.'],
    ['Leave-one-out', 'Testing each example by predicting it from all the others.'],
  ],
  deeper: '<p><b>Speed.</b> Asking every regular each time is slow for millions of examples. KD-trees and ball trees organise the points so the nearest ones are found without checking them all; vector databases do the same for embeddings.</p><p><b>Weighted votes.</b> Closer neighbours can count more, which softens the choice of k.</p><p><b>Same idea, bigger stage.</b> Retrieval for RAG is nearest-neighbour search over text embeddings: find the passages most like the question, and hand them to the model.</p>',
  code: {
    title: 'k-nearest neighbours from scratch',
    note: 'Adapted from the course\'s KNN lesson.',
    text: `
import math
from collections import Counter

def scale(rows):
    cols = list(zip(*rows))
    lo, hi = [min(c) for c in cols], [max(c) for c in cols]
    return [[(v - l) / (h - l) for v, l, h in zip(r, lo, hi)] for r in rows]

def knn(examples, labels, new, k=7):
    dists = sorted((math.dist(e, new), y) for e, y in zip(examples, labels))
    votes = Counter(y for _, y in dists[:k])
    return votes.most_common(1)[0][0]

# spends (shillings), visits (per month)
regulars = scale([[1500, 12], [4200, 4], [2800, 2], [1600, 10], [4000, 5]])
drinks = ["tea", "coffee", "juice", "tea", "coffee"]
print(knn(regulars[1:], drinks[1:], regulars[0], k=3))
`,
  },
};
