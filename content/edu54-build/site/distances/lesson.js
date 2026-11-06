// Norms and distances: a grid of city blocks. From the depot, how far is each shop? Straight line (L2), along the streets (L1),
// or the longer of the two legs (L∞). The ring of points at distance 1 is a circle, a diamond or a square.
// Break it: compare rows whose numbers are in different units (one feature swamps the rest), and use straight-line distance in 500 dimensions.
const G = 6, CELL = 0.6;
// placed so each measure picks a different nearest shop: L1 the kiosk, L2 the market, L∞ the pharmacy
const SHOPS = [{ n: 'Kiosk', p: [3.8, 0] }, { n: 'Pharmacy', p: [-2.6, 2.6] }, { n: 'Market', p: [1.2, -3.3] }, { n: 'Clinic', p: [-4, -3] }];

export default {
  slug: 'distances',
  title: 'Norms: three ways to measure distance',
  description: 'From the depot to the kiosk: straight as the crow flies, block by block along the streets, or just the longer leg. Watch the ring of "distance 1" become a circle, a diamond or a square, and see which shop is nearest by each measure.',
  overview: 'A norm measures how big a vector is, and the distance between two points is the norm of their difference. The everyday one is L2, the straight line. L1 adds up the legs, like a matatu driving block by block. L∞ takes only the longest leg. They can disagree about which point is nearest, and the choice matters for nearest-neighbour search, for regularisation (L1 makes weights exactly zero, L2 just makes them small), and for clipping gradients.',
  keywords: ['l1 vs l2 norm', 'manhattan distance', 'euclidean distance', 'norms machine learning', 'curse of dimensionality'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 1.5, 1.0], half: 2.9, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { norm: 2, target: 0, units: false, dims: false };
    const W = (x, z, y = 0.12) => V(x * CELL, y, -z * CELL);
    /* ---------- the city ---------- */
    const ground = P.box((2 * G + 1) * CELL, 0.1, (2 * G + 1) * CELL, '#E8E3D6', { r: 0.12 }); S.add(ground);
    for (let k = -G; k <= G; k++) for (const [a, b] of [[W(k, -G, 0.105), W(k, G, 0.105)], [W(-G, k, 0.105), W(G, k, 0.105)]]) { const r = P.box(k ? 0.07 : 0.1, 0.01, 1, '#B9B6AE', { r: 0 }); r.position.copy(a).lerp(b, 0.5); r.scale.z = a.distanceTo(b); if (a.x !== b.x) { r.rotation.y = Math.PI / 2; } S.add(r); }
    const blocks = [];
    for (let i = -G; i < G; i++) for (let j = -G; j < G; j++) if ((i + j * 3) % 4 && Math.abs(i + 0.5) + Math.abs(j + 0.5) > 1.2) { const h = 0.04 + ((i * 7 + j * 13) % 5 + 5) % 5 * 0.015; const b = P.box(CELL * 0.62, h, CELL * 0.62, '#EFEADF', { r: 0.03 }); b.position.copy(W(i + 0.5, j + 0.5, 0.1)); S.add(b); blocks.push(b); }
    const depot = P.cyl(0.2, 0.42, C.ink); depot.position.copy(W(0, 0, 0.1)); S.add(depot);
    const depotT = S.text('DEPOT', { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 0.38 }); depotT.position.copy(W(0, 0, 0.525)); S.add(depotT);
    const shops = SHOPS.map((s, i) => {
      const m = new THREE.MeshLambertMaterial({ color: C.teal });
      const b = P.box(0.46, 0.4, 0.46, C.teal, { r: 0.05, material: m }); b.position.copy(W(...s.p, 0.1)); S.add(b);
      const t = S.text(s.n, { size: 0.17, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.4 }); t.position.copy(W(...s.p, 0.75)); t.userData.noFit = true; S.add(t);
      return { b, m, t, ...s };
    });
    /* ---------- the route and the ring of distance 2 blocks ---------- */
    const route = [0, 1, 2].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.045, C.orange); r.userData.noFit = true; S.add(r); return r; });
    const ring = P.tube([V(), V(1, 0, 0)], 0.05, C.plum); ring.userData.noFit = true; S.add(ring);
    const distT = S.text('', { size: 0.14, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.2 }); distT.userData.noFit = true; S.add(distT);
    const dist = (p, n) => n === 1 ? Math.abs(p[0]) + Math.abs(p[1]) : n === 2 ? Math.hypot(p[0], p[1]) : Math.max(Math.abs(p[0]), Math.abs(p[1]));
    // in "units" mode the north-south axis is measured in metres while east-west stays in blocks (100 m each)
    const scaled = p => st.units ? [p[0], p[1] * 100] : p;
    function draw() {
      const s = SHOPS[st.target], [x, z] = s.p;
      const o = W(0, 0, 0.18);
      route.forEach(r => { r.visible = false; });
      if (st.norm === 2) { route[0].visible = true; P.setRod(route[0], o, W(x, z, 0.18)); }
      else if (st.norm === 1) { route[0].visible = route[1].visible = true; P.setRod(route[0], o, W(x, 0, 0.18)); P.setRod(route[1], W(x, 0, 0.18), W(x, z, 0.18)); }
      else { const big = Math.abs(x) >= Math.abs(z); route[0].visible = true; route[1].visible = true; P.setRod(route[0], o, big ? W(x, 0, 0.18) : W(0, z, 0.18)); route[1].material = P.mat('#B9B6AE'); P.setRod(route[1], big ? W(x, 0, 0.18) : W(0, z, 0.18), W(x, z, 0.18)); }
      route[1].material = P.mat(st.norm === 3 ? '#C9C4B6' : C.orange);
      // the ring of every point exactly 3 away
      const pts = [], R = 3;
      for (let k = 0; k <= 160; k++) {
        const a = k / 160 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        const n = st.norm === 1 ? Math.abs(c) + Math.abs(sn) : st.norm === 2 ? 1 : Math.max(Math.abs(c), Math.abs(sn));
        pts.push(W(c / n * R, sn / n * R, 0.2));
      }
      ring.geometry.dispose(); ring.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05), 240, 0.05, 6, true);
      const ds = SHOPS.map(q => dist(scaled(q.p), st.norm)), best = ds.indexOf(Math.min(...ds));
      shops.forEach((q, i) => { q.m.color.set(i === best ? C.gold : i === st.target ? C.orange : C.teal); });
      distT.position.copy(W(x / 2, z / 2, 0.75)); distT.userData.set(`${['', 'L1', 'L2', 'L∞'][st.norm]}: ${ds[st.target].toFixed(1)}${st.units ? '' : ' blocks'}`);
    }
    draw();
    // the curse of dimensionality: in many dimensions, random points are all about equally far apart
    const spread = d => { let r = 7, near = Infinity, far = 0; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; }; const q = [...Array(d)].map(rnd); for (let n = 0; n < 60; n++) { let s = 0; for (let k = 0; k < d; k++) s += (rnd() - q[k]) ** 2; s = Math.sqrt(s); near = Math.min(near, s); far = Math.max(far, s); } return near / far; };
    const controls = [
      { type: 'buttons', label: 'Measure with', options: ['L1: along the streets', 'L2: straight line', 'L∞: longest leg'], get: () => st.norm - 1, act: i => { st.norm = i + 1; draw(); } },
      { type: 'buttons', label: 'Route to', options: SHOPS.map(s => s.n), get: () => st.target, act: i => { st.target = i; draw(); } },
      { type: 'toggle', label: 'North-south in metres, east-west in blocks', short: 'Mixed units', get: () => st.units, set: v => { st.units = v; draw(); }, quick: false },
    ];
    const near = () => { const ds = SHOPS.map(q => dist(scaled(q.p), st.norm)); return SHOPS[ds.indexOf(Math.min(...ds))].n; };
    const readouts = [
      { label: 'Nearest shop', get: () => ({ v: near() }) },
      { label: 'Distance', get: () => ({ v: dist(scaled(SHOPS[st.target].p), st.norm).toFixed(2), sub: `to the ${SHOPS[st.target].n.toLowerCase()}` }) },
    ];
    const labels = [
      { name: 'depot', t: 'The depot', d: 'Every distance is measured from here', icon: 'target', atV: W(0, 0, 0.52) },
      { name: 'route', t: 'The route', d: 'The path this measure counts', icon: 'link', at: () => W(...SHOPS[st.target].p, 0.44) },
      { name: 'ring', t: 'Everything 3 away', d: 'A circle, a diamond or a square', icon: 'spark', atV: W(-3, 0, 0.14) },
      { name: 'shops', t: 'Four shops', d: 'Gold: the nearest by this measure', icon: 'check', atV: W(-2.6, 2.6, 0.44) },
    ];
    const reset = () => { Object.assign(st, { norm: 2, target: 0, units: false, dims: false }); draw(); };
    const breaks = [
      { label: 'Mix units in one distance', hint: 'Metres one way, blocks the other', on: () => { reset(); st.units = true; draw(); }, off: reset },
      { label: 'Straight lines in 500 dimensions', hint: 'Embeddings with 500 numbers', on: () => { reset(); st.dims = true; }, off: reset },
    ];
    function status() {
      const ds = SHOPS.map(q => dist(scaled(q.p), st.norm));
      if (st.dims) return { ok: false, msg: `<b>In 500 dimensions everything is far, and equally far.</b> For random points, the nearest is ${Math.round(spread(500) * 100)}% as far as the farthest (in 2 dimensions it is ${Math.round(spread(2) * 100)}%). Straight-line distance stops telling neighbours apart; that's the curse of dimensionality. Embeddings use cosine similarity, or reduce dimensions first.` };
      if (st.units) return { ok: false, msg: `<b>One feature swamps the rest.</b> North-south is now in metres (hundreds) and east-west in blocks (single digits), so every distance is really just the north-south gap. The ${near().toLowerCase()} now looks nearest only because it is closest north to south, whatever the blocks east and west say. Scale every feature the same way first.` };
      const s = SHOPS[st.target];
      const all = [1, 2, 3].map(n => SHOPS.map(q => dist(q.p, n))).map(d => SHOPS[d.indexOf(Math.min(...d))].n);
      return { ok: true, msg: `<b>${['', 'L1', 'L2', 'L∞'][st.norm]} to the ${s.n.toLowerCase()}: ${ds[st.target].toFixed(1)} blocks.</b> ${st.norm === 1 ? 'Add up the legs: how far a matatu drives through the grid.' : st.norm === 2 ? 'The straight line, as the crow flies.' : 'Only the longest leg counts.'} Nearest shop: ${near()}${all[0] !== all[1] || all[1] !== all[2] ? ` (by L1 ${all[0]}, by L2 ${all[1]}, by L∞ ${all[2]}: the measures disagree)` : ''}.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'How far?', home: true, say: 'Here is a grid of city blocks with a depot in the middle and four shops. How far is the kiosk? It depends on how you measure.', act: m => m.reset() },
    { t: 'Straight line', focus: 'route', zoom: 1.4, say: 'The straight line, as the crow flies, is the L2 distance: the square root of the sum of the squared legs. It is the one you learned at school.', act: m => m.set({ norm: 2, target: 0 }) },
    { t: 'Along the streets', focus: 'route', zoom: 1.4, say: 'A matatu cannot fly. It drives block by block, so it adds up the legs. That is the L1 distance, sometimes called the taxi or Manhattan distance.', act: m => m.set({ norm: 1 }) },
    { t: 'Rings of the same distance', home: true, say: 'Draw every point exactly three away. By L2 it is a circle. By L1 it is a diamond. By L infinity, the longest leg, it is a square.', act: m => m.set({ norm: 1 }), wait: 5 },
    { t: 'Which is nearest?', home: true, say: 'The measures can disagree about which shop is nearest. Along the streets it is the kiosk; in a straight line, the market; by the longest leg, the pharmacy. Search engines, recommenders and clustering all have to pick one.', act: m => m.set({ norm: 3, target: 1 }), wait: 6 },
    { t: 'Same units first', home: true, say: 'Measure one direction in metres and the other in blocks, and the metres swamp everything. Scale every feature the same way before you measure distance.', act: m => m.set({ norm: 2, units: true }), wait: 5 },
  ],
  check: [
    { q: 'A matatu drives 3 blocks east and 1 north. What is the L1 distance from where it started?', options: ['4 blocks', 'About 3.16 blocks', '3 blocks'], answer: 0, why: 'L1 adds the legs: 3 + 1 = 4. L2 would be √10 ≈ 3.16, and L∞ the longest leg, 3.' },
    { q: 'What shape is "every point at L1 distance 3"?', options: ['A circle', 'A diamond', 'A square'], answer: 1, why: 'Points where |x| + |y| = 3 form a diamond. L2 gives a circle, L∞ a square.' },
    { q: 'One feature is in metres and another in kilometres. What goes wrong with distance?', options: ['Nothing', 'The feature with bigger numbers dominates', 'Distance becomes negative'], answer: 1, why: 'Bigger numbers make bigger gaps. Scale features first.' },
  ],
  terms: [
    ['Norm', 'The size of a vector. The distance between two points is the norm of their difference.'],
    ['L2 (Euclidean)', 'The straight-line distance: square root of the sum of squares.'],
    ['L1 (Manhattan)', 'The sum of the absolute legs, like driving block by block.'],
    ['L∞ (max)', 'The largest single leg.'],
    ['Curse of dimensionality', 'In very many dimensions, random points are all nearly the same distance apart.'],
  ],
  deeper: '<p><b>Norms as regularisers.</b> Adding the L2 norm of the weights to the loss keeps every weight small (weight decay). Adding the L1 norm pushes many weights to exactly zero, which gives sparse, simpler models: the diamond\'s sharp corners sit on the axes.</p><p><b>Gradient clipping</b> rescales the whole gradient when its L2 norm grows past a limit, which stops one bad batch from throwing the weights far away.</p><p><b>Cosine instead.</b> For embeddings, direction matters more than length, so search usually uses cosine similarity, as in the vectors lesson.</p>',
  code: {
    title: 'Three norms',
    note: 'Adapted from the course\'s norms lesson.',
    text: `
import numpy as np

kiosk = np.array([3, 1])           # 3 blocks east, 1 north

print(np.abs(kiosk).sum())         # L1: 4
print(np.sqrt((kiosk ** 2).sum())) # L2: 3.16
print(np.abs(kiosk).max())         # L∞: 3
print(np.linalg.norm(kiosk, ord=1), np.linalg.norm(kiosk), np.linalg.norm(kiosk, ord=np.inf))

# scale features before measuring distance
X = np.array([[3, 100], [1, 400], [4, 120]], dtype=float)
X = (X - X.mean(0)) / X.std(0)

# clip a gradient by its L2 norm
def clip(g, max_norm=1.0):
    n = np.linalg.norm(g)
    return g * (max_norm / n) if n > max_norm else g
`,
  },
};
