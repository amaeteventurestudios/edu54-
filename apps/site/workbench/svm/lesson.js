// Support vector machines: two groups of points and a road between them. The SVM finds the widest road that keeps the groups apart;
// only the points on the road's edges (support vectors) decide where it goes. C sets how much a few points may sit on the road.
// A kernel lifts a ring-shaped problem into a bowl so a flat cut can separate it.
// Break it: one mislabelled point with a hard margin (the road collapses), a ring that no straight road can split.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const HALF = 2.4;
function blobs(seed) { const r = rngOf(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); const out = []; for (let i = 0; i < 40; i++) { const y = i % 2 ? 1 : -1; out.push({ x: y * 0.95 + g() * 0.42 - 0.1, z: y * 0.55 + g() * 0.42, y }); } return out; }
function ring(seed) { const r = rngOf(seed); const out = []; for (let i = 0; i < 60; i++) { const y = i % 2 ? 1 : -1, rad = y > 0 ? 0.55 * Math.sqrt(r()) : 1.3 + r() * 0.6, a = r() * Math.PI * 2; out.push({ x: rad * Math.cos(a), z: rad * Math.sin(a), y }); } return out; }

export default {
  slug: 'svm',
  title: 'Support vector machines: the widest road',
  description: 'Draw the widest road you can between two groups of points: that is what a support vector machine does, and only the few points touching the road decide where it goes. Then add one mislabelled point, and a ring that no straight road can split until you lift it into a bowl.',
  overview: 'A support vector machine separates two classes with the widest possible margin: picture a road between two villages, as wide as it can be without touching a house. Only the houses on the road\'s edges, the support vectors, matter; move any other and nothing changes. A softness setting (C) lets a few points sit on the road so one odd point can\'t ruin it, and the kernel trick lifts data into more dimensions, where a flat cut can separate shapes no straight line could.',
  keywords: ['support vector machine explained', 'maximum margin', 'support vectors', 'kernel trick', 'hinge loss'],
  orient: 'any',
  view: { target: [0, 0.3, 0], dir: [0.25, 1.35, 1.05], half: 3, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { data: blobs(5), C: 1, kernel: false, isRing: false, odd: false, w: [1, 0], b: 0, lift: 0 };
    const W = (x, z, y = 0.12) => V(x, y, z);
    /* ---------- the ground and the points ---------- */
    const ground = P.box(HALF * 2 + 0.4, 0.1, HALF * 2 + 0.4, '#E8E3D6', { r: 0.12 }); S.add(ground);
    const ptsG = new THREE.Group(); S.add(ptsG);
    const houses = [...Array(70)].map(() => { const m = new THREE.MeshLambertMaterial({ color: C.teal }); const b = P.box(0.16, 0.16, 0.16, C.teal, { r: 0.03, material: m }); b.userData.noFit = true; ptsG.add(b); const ring = P.cyl(0.15, 0.02, C.gold, { seg: 20 }); ring.userData.noFit = true; ptsG.add(ring); return { b, m, ring }; });
    /* ---------- the road ---------- */
    const road = P.box(1, 0.02, 1, '#8E91A3', { r: 0, m: { opacity: 0.55 } }); road.material.depthWrite = false; road.userData.noFit = true; S.add(road);
    const mid = P.box(1, 0.03, 0.035, '#FFFFFF', { r: 0 }); mid.userData.noFit = true; S.add(mid);
    const edges = [0, 1].map(() => { const e = P.box(1, 0.03, 0.03, '#2C2D31', { r: 0 }); e.userData.noFit = true; S.add(e); return e; });
    // the bowl the kernel lifts points onto
    const bowlGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, 30, 30); bowlGeo.rotateX(-Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshLambertMaterial({ color: '#BFE6F2', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); bowl.userData.noFit = true; S.add(bowl);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshLambertMaterial({ color: C.orange, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })); plane.rotation.x = -Math.PI / 2; plane.userData.noFit = true; S.add(plane);
    const LIFT = 0.5, liftH = (x, z) => LIFT * (x * x + z * z);
    /* ---------- training: subgradient descent on the hinge loss ---------- */
    function train() {
      let w = [0.5, 0.2], b = 0;
      const D = st.data, lam = 1 / (D.length * st.C);
      for (let it = 1; it <= 3000; it++) {
        const eta = 1 / (lam * it + 20);
        let gw = [lam * w[0], lam * w[1]], gb = 0;
        for (const p of D) { const m = p.y * (w[0] * p.x + w[1] * p.z + b); if (m < 1) { gw[0] -= p.y * p.x / D.length; gw[1] -= p.y * p.z / D.length; gb -= p.y / D.length; } }
        w = [w[0] - eta * gw[0], w[1] - eta * gw[1]]; b -= eta * gb * 2;
      }
      st.w = w; st.b = b;
    }
    // in lifted space: the cut is height = t; the best flat cut sits between the inner tops and the outer bottoms
    const liftedCut = () => { const D = st.data, inner = Math.max(...D.filter(p => p.y > 0).map(p => liftH(p.x, p.z))), outer = Math.min(...D.filter(p => p.y < 0).map(p => liftH(p.x, p.z))); return { t: (inner + outer) / 2, gap: outer - inner }; };
    const margin = () => 1 / Math.hypot(...st.w);
    const score = p => st.w[0] * p.x + st.w[1] * p.z + st.b;
    const isSV = p => Math.abs(p.y * score(p) - 1) < 0.12 || p.y * score(p) < 1;
    const wrong = () => st.kernel && st.isRing ? 0 : st.data.filter(p => p.y * score(p) <= 0).length;
    function draw() {
      if (!(st.kernel && st.isRing)) train();
      const lc = st.isRing ? liftedCut() : null;
      st.data.forEach((p, i) => { const h = houses[i]; h.b.visible = h.ring.visible = true; h.m.color.set(p.y > 0 ? C.coral : C.teal); });
      for (let i = st.data.length; i < houses.length; i++) houses[i].b.visible = houses[i].ring.visible = false;
      const showRoad = !(st.kernel && st.isRing);
      road.visible = mid.visible = edges[0].visible = edges[1].visible = showRoad;
      if (showRoad) {
        const [a, c] = st.w, n = Math.hypot(a, c), ux = -c / n, uz = a / n, ang = Math.atan2(-uz, ux), m = margin(), L = HALF * 1.9;
        const cx = -a * st.b / (n * n), cz = -c * st.b / (n * n);
        road.position.set(cx, 0.1, cz); road.rotation.y = ang; road.scale.set(L, 1, Math.min(HALF * 2, 2 * m));
        mid.position.set(cx, 0.11, cz); mid.rotation.y = ang; mid.scale.x = L;
        edges.forEach((e, k) => { const s = (k ? 1 : -1) * m; e.position.set(cx + a / n * s, 0.11, cz + c / n * s); e.rotation.y = ang; e.scale.x = L; e.visible = m < HALF * 1.5; });
      }
      bowl.visible = plane.visible = st.kernel && st.isRing;
      if (bowl.visible) { const pos = bowlGeo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, 0.12 + liftH(pos.getX(i), pos.getZ(i)) * st.lift); pos.needsUpdate = true; bowlGeo.computeVertexNormals(); plane.position.y = 0.12 + lc.t * st.lift; }
    }
    function update(dt) {
      const goal = st.kernel && st.isRing ? 1 : 0;
      if (Math.abs(st.lift - goal) > 1e-3) { st.lift += (goal - st.lift) * Math.min(1, dt * 3); if (st.kernel && st.isRing) draw(); }
      st.data.forEach((p, i) => { const h = houses[i], y = 0.12 + (st.isRing ? liftH(p.x, p.z) * st.lift : 0); h.b.position.set(p.x, y, p.z); h.ring.position.set(p.x, y - 0.005, p.z); h.ring.visible = !(st.kernel && st.isRing) && isSV(p); });
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Softness: how much the road may be crossed (1/C)', short: 'Softness', min: 0.02, max: 50, log: true, get: () => 1 / st.C, set: v => { st.C = 1 / v; draw(); }, fmt: v => v < 1 ? v.toFixed(2) : v.toFixed(1) },
      { type: 'buttons', label: 'Data', options: ['Two groups', 'A ring'], get: () => st.isRing ? 1 : 0, act: i => { st.isRing = !!i; st.data = i ? ring(9) : blobs(5); st.odd = false; draw(); } },
      { type: 'toggle', label: 'Kernel: lift into a bowl', short: 'Kernel', get: () => st.kernel, set: v => { st.kernel = v; draw(); } },
    ];
    const readouts = [
      { label: 'Road width', get: () => ({ v: st.kernel && st.isRing ? 'a flat cut' : (2 * margin()).toFixed(2), good: !st.isRing && margin() > 0.3 && !wrong(), bad: !st.isRing && margin() < 0.12 }) },
      { label: 'Support vectors', get: () => ({ v: st.kernel && st.isRing ? '—' : st.data.filter(isSV).length, sub: `of ${st.data.length} points` }) },
      { label: 'On the wrong side', get: () => ({ v: wrong(), bad: wrong() > 2, good: !wrong() }) },
    ];
    const labels = [
      { name: 'road', t: 'The widest road', d: 'The margin between the two groups', icon: 'scale', atV: W(-HALF, -HALF) },
      { name: 'sv', t: 'Support vectors', d: 'Gold rings: the only points that matter', icon: 'target', atV: W(-HALF, HALF) },
      { name: 'groups', t: 'Two groups', d: 'Teal and coral', icon: 'box', atV: W(HALF, -HALF) },
      { name: 'bowl', t: 'Lifted into a bowl', d: 'A flat cut there is a circle on the ground', icon: 'spark', atV: W(HALF, HALF), hide: () => !(st.kernel && st.isRing) },
    ];
    const reset = () => { Object.assign(st, { data: blobs(5), C: 1, kernel: false, isRing: false, odd: false }); draw(); };
    const breaks = [
      { label: 'One mislabelled point, a hard road', hint: 'Softness almost zero', on: () => { reset(); st.data = [...blobs(5), { x: 0.3, z: 0.1, y: -1 }]; st.odd = true; st.C = 50; draw(); }, off: reset },
      { label: 'A ring, with a straight road', hint: 'No kernel', on: () => { reset(); st.isRing = true; st.data = ring(9); draw(); }, off: reset },
    ];
    function status() {
      if (st.isRing && !st.kernel) return { ok: false, msg: `<b>No straight road works.</b> One group sits inside a ring of the other, so any straight cut leaves ${wrong()} points on the wrong side. Turn on the kernel: lifting every point by its distance from the centre makes a bowl, and a flat cut through the bowl is a circle on the ground.` };
      if (st.isRing && st.kernel) { const lc = liftedCut(); return { ok: true, msg: `<b>Separated by lifting.</b> Each point rose by its squared distance from the centre, so the inner group sits low in the bowl and the ring sits high. A flat cut between them (orange) separates every point, with room to spare. That is the kernel trick: the SVM never builds the bowl, it only needs the distances.` }; }
      if (st.odd && st.C > 10) return { ok: false, msg: `<b>One odd point squeezed the road.</b> With almost no softness the road must not be crossed by anyone, so a single teal point on the coral side narrows it to ${(2 * margin()).toFixed(2)}, half its width, and tilts it. Allow a little softness and the SVM lets that point sit on the wrong side, keeping a wide, sensible road.` };
      if (st.C < 0.05) return { msg: `<b>Very soft.</b> So many points may sit on the road that it widens across both groups and ${st.data.filter(isSV).length} points become support vectors. Too soft, and the road stops separating anything.` };
      return { ok: !wrong() ? true : undefined, msg: `<b>Road ${(2 * margin()).toFixed(2)} wide.</b> Only ${st.data.filter(isSV).length} points (gold rings) touch or cross its edges; they alone decide where it runs. Move any other point and the road stays put.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, odd: () => { st.data = [...blobs(5), { x: 0.3, z: 0.1, y: -1 }]; st.odd = true; st.C = 50; draw(); }, set: p => { Object.assign(st, p); if (p.isRing != null) st.data = p.isRing ? ring(9) : blobs(5); draw(); } };
  },

  story: [
    { t: 'Two groups', home: true, say: 'Here are two groups of points, teal and coral. Many straight lines could separate them. Which one is best?', act: m => m.reset() },
    { t: 'The widest road', home: true, say: 'A support vector machine picks the line with the widest road around it, like the widest road you could build between two villages without knocking down a house.' },
    { t: 'Support vectors', focus: 'sv', zoom: 1.0, say: 'Only the few points on the road\'s edges, ringed in gold, decide where it goes. They are the support vectors. Move any other point, and the road does not change.' },
    { t: 'One odd point', home: true, say: 'Add one odd point on the wrong side. With a hard road, it squeezes everything narrow. Allow a little softness, and the road lets that one point be wrong and stays wide.', act: m => m.odd(), wait: 5 },
    { t: 'A ring', home: true, say: 'Now one group sits inside a ring of the other. No straight road can split them.', act: m => m.set({ C: 1, isRing: true, kernel: false }), wait: 4 },
    { t: 'The kernel trick', home: true, say: 'Lift every point by its distance from the centre. The inner group sits low in a bowl, the ring sits high, and a flat cut separates them. Back on the ground, that cut is a circle.', act: m => m.set({ kernel: true }), wait: 6 },
  ],
  check: [
    { q: 'What does an SVM look for?', options: ['The separating line with the widest margin', 'The line through the most points', 'The shortest line'], answer: 0, why: 'A wide margin generalises better to new points.' },
    { q: 'Which points decide where the SVM\'s road goes?', options: ['Only the support vectors on its edges', 'Every point equally', 'The point farthest away'], answer: 0, why: 'Points far from the road have no effect; only the ones touching it do.' },
    { q: 'How does a kernel help with a ring-shaped problem?', options: ['It lifts the data so a flat cut can separate it', 'It deletes the ring', 'It makes the road wider'], answer: 0, why: 'In the lifted space a plane separates the groups; on the ground that plane is a circle.' },
  ],
  terms: [
    ['Margin', 'The width of the empty road between the two classes.'],
    ['Support vectors', 'The points on or inside the margin; they alone fix the boundary.'],
    ['C (softness)', 'How heavily crossing the road is punished. Large C: hard road. Small C: soft road.'],
    ['Hinge loss', 'The SVM\'s loss: zero for points safely outside the road, growing for points on it or across.'],
    ['Kernel trick', 'Comparing points as if lifted into more dimensions, without ever computing the lift.'],
  ],
  deeper: '<p><b>Where SVMs still win.</b> With a few hundred examples, or text described by thousands of word counts, a linear SVM trains in seconds and is hard to beat. With millions of images, neural networks took over.</p><p><b>Common kernels.</b> Polynomial kernels compare points by powers of their dot product; the RBF kernel compares them by distance, which can bend the boundary around any shape (and overfit if its width is too small).</p><p><b>Hinge against cross-entropy.</b> Logistic regression keeps pushing every point further from the boundary; an SVM stops caring once a point is safely outside the road.</p>',
  code: {
    title: 'A linear SVM with hinge loss',
    note: 'Adapted from the course\'s SVM lesson.',
    text: `
import numpy as np

def train_svm(X, y, C=1.0, steps=3000):
    # y is +1 or -1; minimise  |w|^2 / 2 + C * mean(hinge)
    w, b = np.zeros(X.shape[1]), 0.0
    lam = 1 / (len(X) * C)
    for t in range(1, steps + 1):
        lr = 1 / (lam * t + 20)
        margins = y * (X @ w + b)
        inside = margins < 1                     # on the road or across it
        gw = lam * w - (y[inside, None] * X[inside]).sum(0) / len(X)
        gb = -y[inside].sum() / len(X)
        w, b = w - lr * gw, b - lr * gb
    return w, b

def support_vectors(X, y, w, b):
    return X[y * (X @ w + b) <= 1 + 1e-3]

# a ring: lift with a kernel feature, then a straight cut works
lift = lambda X: np.c_[X, (X ** 2).sum(1)]
`,
  },
};
