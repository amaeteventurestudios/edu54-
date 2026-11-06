// Linear algebra intuition: two arrows, and every place you can reach by mixing them (their span, a flat sheet).
// A target off the sheet can't be reached; the nearest point on it is the projection, which is what least squares finds.
// A third arrow either adds a new direction (rank 3) or lies in the sheet and adds nothing (rank 2).
// Break it: make b point the same way as a (the sheet collapses to a line), make c a mix of a and b.
const O = [-0.7, 1.15, -0.6];

export default {
  slug: 'span-and-rank',
  title: 'Span, rank and projection',
  description: 'Mix two arrows to reach a point, and see that everything you can reach lies on one flat sheet: their span. Drop a target that sits off the sheet onto its nearest point (a projection), then add a third arrow that adds a new direction, or adds nothing at all.',
  overview: 'A vector is an arrow, and adding scaled arrows mixes them. Everything two arrows can reach together forms a flat sheet through the origin: their span. A point off the sheet can\'t be reached exactly, and the closest you can get is its projection, the foot of a straight drop onto the sheet. That is exactly what linear regression computes. Rank counts the truly different directions you have: an arrow that is just a mix of the others adds nothing.',
  keywords: ['linear algebra intuition', 'span of vectors', 'rank of a matrix', 'linear independence', 'vector projection'],
  orient: 'any',
  view: { target: [0.3, 1.0, 0.1], dir: [0.5, 0.75, 1.4], half: 3, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const o = V(...O);
    const st = { wa: 0.5, wb: 0.5, showC: false, cDep: false, par: false };
    // a sheet tilted to face the viewer
    const A = V(2.0, -0.2, -0.45), B0 = V(0.3, -0.5, 1.7);
    const Bv = () => st.par ? A.clone().multiplyScalar(0.7) : B0.clone();
    const N = () => B0.clone().cross(A).normalize();
    const T = () => o.clone().addScaledVector(A, 0.6).addScaledVector(B0, 0.85).addScaledVector(N(), 0.95);
    const Cv = () => st.cDep ? A.clone().multiplyScalar(0.6).addScaledVector(Bv(), 0.6) : N().multiplyScalar(1.5).addScaledVector(A, 0.25);
    /* ---------- the sheet (span of a and b) ---------- */
    const sheetGeo = new THREE.BufferGeometry();
    const sheet = new THREE.Mesh(sheetGeo, new THREE.MeshLambertMaterial({ color: '#7FD1CB', transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    sheet.userData.noMask = false; S.add(sheet);
    const edge = P.tube([V(), V(1, 0, 0)], 0.01, '#1C9A94'); S.add(edge);
    const line = P.rod(V(), V(0, 1, 0), 0.025, '#1C9A94'); line.userData.noFit = true; S.add(line);
    function drawSheet() {
      const B = Bv(), c = (s, t) => o.clone().addScaledVector(A, s).addScaledVector(B, t);
      const q = [c(-0.4, -0.4), c(1.3, -0.4), c(1.3, 1.2), c(-0.4, 1.2)];
      sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute([...q[0].toArray(), ...q[1].toArray(), ...q[2].toArray(), ...q[0].toArray(), ...q[2].toArray(), ...q[3].toArray()], 3));
      sheetGeo.computeVertexNormals(); sheetGeo.computeBoundingSphere();
      sheet.visible = !st.par; line.visible = st.par;
      if (st.par) P.setRod(line, o.clone().addScaledVector(A, -0.7), o.clone().addScaledVector(A, 1.9));
      S.root.remove(edge); edge.geometry.dispose();
      edge.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...q, q[0]], false, 'catmullrom', 0), 40, 0.012, 6, false); edge.visible = !st.par; S.root.add(edge);
    }
    /* ---------- the arrows ---------- */
    const origin = P.ball(0.07, C.ink); origin.position.copy(o); S.add(origin);
    const post = P.rod(V(o.x, 0, o.z), o, 0.012, '#8E91A3'); S.add(post);
    const arA = P.arrow(o, o.clone().add(A), 0.045, C.teal); S.add(arA);
    const arB = P.arrow(o, o.clone().add(B0), 0.045, C.coral); S.add(arB);
    const arC = P.arrow(o, o.clone().add(Cv()), 0.045, C.gold); S.add(arC);
    const mA = P.arrow(o, o, 0.025, '#5FB8B2'), mB = P.arrow(o, o, 0.025, '#F29A8E'), mR = P.arrow(o, o, 0.04, C.plum); [mA, mB, mR].forEach(a => { a.userData.noFit = true; S.add(a); });
    const chip = (s, c) => { const t = S.text(s, { size: 0.16, weight: 800, color: '#FFFFFF', bg: c, face: 'cam', top: true, pad: 0.25 }); t.userData.noFit = true; S.add(t); return t; };
    const tA = chip('a', C.teal), tB = chip('b', C.coral), tC = chip('c', '#B8860B');
    /* ---------- the target and its projection ---------- */
    const tgt = P.ball(0.11, C.plum); S.add(tgt);
    const foot = P.ball(0.07, '#FFFFFF'); foot.userData.noFit = true; S.add(foot);
    const drop = P.rod(V(), V(0, 1, 0), 0.015, C.plum); drop.userData.noFit = true; S.add(drop);
    const miss = P.rod(V(), V(0, 1, 0), 0.01, '#B9B6AE'); miss.userData.noFit = true; S.add(miss);
    const tT = chip('target', C.plum);
    // the best mix: solve for the weights whose arrow is nearest the target (the normal equations)
    function best() {
      const B = Bv(), d = T().sub(o), aa = A.dot(A), ab = A.dot(B), bb = B.dot(B), da = d.dot(A), db = d.dot(B), det = aa * bb - ab * ab;
      if (Math.abs(det) < 1e-6) return [da / aa, 0];
      return [(da * bb - db * ab) / det, (db * aa - da * ab) / det];
    }
    const R = () => o.clone().addScaledVector(A, st.wa).addScaledVector(Bv(), st.wb);
    const proj = () => { const [s, t] = best(); return o.clone().addScaledVector(A, s).addScaledVector(Bv(), t); };
    function draw() {
      drawSheet();
      const B = Bv();
      P.setArrow(arB, o, o.clone().add(B));
      arC.visible = tC.visible = st.showC; P.setArrow(arC, o, o.clone().add(Cv()));
      tA.position.copy(o).add(A).add(V(0, 0.22, 0)); tB.position.copy(o).add(B).add(V(0, 0.22, 0)); tC.position.copy(o).add(Cv()).add(V(0, 0.22, 0));
      const pa = o.clone().addScaledVector(A, st.wa), r = R();
      P.setArrow(mA, o, pa); P.setArrow(mB, pa, r); P.setArrow(mR, o, r);
      const t = T(), p = proj();
      tgt.position.copy(t); tT.position.copy(t).add(V(0, 0.28, 0));
      foot.position.copy(p); P.setRod(drop, t, p); P.setRod(miss, r, t);
    }
    draw();
    const rank = () => { const vs = [A, Bv(), ...(st.showC ? [Cv()] : [])]; const m = new THREE.Matrix3().set(...vs[0].toArray(), ...vs[1].toArray(), ...(vs[2] || V()).toArray()); const det = Math.abs(m.determinant()); if (vs.length === 3 && det > 0.05) return 3; return A.clone().cross(Bv()).length() > 0.05 || (vs[2] && A.clone().cross(vs[2]).length() > 0.05) ? 2 : 1; };
    const dist = () => R().distanceTo(T()), bestD = () => proj().distanceTo(T());
    const controls = [
      { type: 'slider', label: 'How much of a', min: -1, max: 2, step: 0.05, get: () => st.wa, set: v => { st.wa = v; draw(); } },
      { type: 'slider', label: 'How much of b', min: -1, max: 2, step: 0.05, get: () => st.wb, set: v => { st.wb = v; draw(); } },
      { type: 'button', label: 'Best mix (project the target)', short: 'Best mix', act: () => { [st.wa, st.wb] = best(); st.wa = Math.max(-1, Math.min(2, st.wa)); st.wb = Math.max(-1, Math.min(2, st.wb)); draw(); } },
      { type: 'toggle', label: 'Add a third arrow, c', short: 'Arrow c', get: () => st.showC, set: v => { st.showC = v; draw(); } },
    ];
    const readouts = [
      { label: 'Rank', get: () => ({ v: rank(), sub: rank() === 3 ? 'all of space' : rank() === 2 ? 'a flat sheet' : 'a line', bad: rank() < 2 }) },
      { label: 'Miss', get: () => ({ v: dist().toFixed(2), sub: `best possible ${bestD().toFixed(2)}`, good: dist() - bestD() < 0.05 }) },
    ];
    const labels = [
      { name: 'b', t: 'Arrow b', d: 'One direction you can move in', icon: 'target', at: () => o.clone().add(Bv()) },
      { name: 'sheet', t: 'The span of a and b', d: 'Everywhere a mix of them can reach', icon: 'box', at: () => o.clone().addScaledVector(A, -0.4).addScaledVector(Bv(), -0.4), hide: () => st.par },
      { name: 'target', t: 'A target off the sheet', d: 'Out of reach of a and b', icon: 'spark', at: () => T() },
      { name: 'foot', t: 'Its projection', d: 'The nearest point you can reach', icon: 'check', at: () => proj(), phone: false },
    ];
    const reset = () => { Object.assign(st, { wa: 0.5, wb: 0.5, showC: false, cDep: false, par: false }); draw(); };
    const breaks = [
      { label: 'b points the same way as a', hint: 'b = 0.7 a', on: () => { reset(); st.par = true; draw(); }, off: reset },
      { label: 'c is just a mix of a and b', hint: 'c = 0.6 a + 0.6 b', on: () => { reset(); st.showC = true; st.cDep = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.par) return { ok: false, msg: `<b>The sheet collapsed to a line.</b> b points the same way as a, so mixing them only moves you along one line: rank 1. Two arrows, one direction. The best you can do now misses the target by ${bestD().toFixed(2)}.` };
      if (st.showC && st.cDep) return { ok: false, msg: `<b>Three arrows, still rank 2.</b> c = 0.6a + 0.6b lies flat in the sheet, so it adds no new direction: anything c can reach, a and b already could. The target is still out of reach. In a matrix this shows as a column that adds nothing.` };
      if (st.showC) return { ok: true, msg: `<b>Rank 3.</b> c sticks out of the sheet, so a, b and c together reach every point in space, the target included.` };
      const gap = dist() - bestD();
      if (gap < 0.05) return { ok: true, msg: `<b>As close as a and b can get.</b> The arrow ends at the projection: the foot of a straight drop from the target to the sheet, missing by ${bestD().toFixed(2)}. Linear regression finds exactly this point.` };
      return { msg: `<b>${st.wa.toFixed(2)} of a plus ${st.wb.toFixed(2)} of b</b> misses the target by ${dist().toFixed(2)}. Every mix stays on the sheet; the best possible miss is ${bestD().toFixed(2)}. Try <b>Best mix</b>.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); }, best: () => { [st.wa, st.wb] = best(); draw(); } };
  },

  story: [
    { t: 'Two arrows', home: true, say: 'Here are two arrows, a and b. Think of them as two roads out of town: one heads east and a little uphill, the other heads north.', act: m => m.reset() },
    { t: 'Mixing them', focus: 'b', zoom: 1.35, say: 'Go some way along a, then some way along b, and you land somewhere new. Every mix of the two lands on the same flat sheet.', act: m => m.set({ wa: 1.1, wb: 0.3 }) },
    { t: 'The span', home: true, say: 'That sheet is called the span of a and b: every place the two roads can take you. Nothing off the sheet can be reached.', act: m => m.set({ wa: 0.3, wb: 1.0 }) },
    { t: 'The nearest point', focus: 'target', zoom: 1.35, say: 'The purple target floats above the sheet. The best you can do is the foot of a straight drop from it: its projection. Linear regression finds exactly this nearest point.', act: m => m.best(), wait: 5 },
    { t: 'An arrow that adds nothing', home: true, say: 'Add a third arrow that is just a mix of a and b. It lies flat in the sheet and reaches nothing new. Three arrows, but only two directions: rank two.', act: m => m.set({ showC: true, cDep: true }), wait: 5 },
    { t: 'A new direction', home: true, say: 'Now point the third arrow out of the sheet. Rank three: together they reach every point in space. Models use this idea everywhere, from embeddings to fine-tuning with low rank.', act: m => m.set({ showC: true, cDep: false }) },
  ],
  check: [
    { q: 'What is the span of two arrows that point in different directions?', options: ['A single point', 'A flat sheet through the origin', 'All of 3D space'], answer: 1, why: 'Every mix of the two lies on one plane through the origin.' },
    { q: 'A third arrow is a mix of the first two. What happens to the rank?', options: ['It goes up by one', 'It stays the same', 'It becomes zero'], answer: 1, why: 'It adds no new direction, so it reaches nothing the first two couldn\'t.' },
    { q: 'What is the projection of a point onto the sheet?', options: ['The nearest point on the sheet', 'The farthest point', 'The origin'], answer: 0, why: 'Drop straight down onto the sheet: that foot is the closest reachable point.' },
  ],
  terms: [
    ['Linear combination', 'Scaling arrows and adding them: 0.5a + 1.2b.'],
    ['Span', 'Every point a set of arrows can reach by linear combinations.'],
    ['Linearly independent', 'No arrow in the set is a mix of the others.'],
    ['Rank', 'How many truly independent directions a set of arrows (or a matrix\'s columns) has.'],
    ['Projection', 'The nearest point on a line or sheet to a given point.'],
  ],
  deeper: '<p><b>Low rank in AI.</b> LoRA fine-tunes a big model by learning a weight change of low rank: two thin matrices whose product has only a few independent directions. It works because the change needed is usually simple.</p><p><b>Gram-Schmidt</b> turns any independent arrows into ones at right angles to each other, one at a time: subtract from each arrow its projection onto the ones before. Right-angled arrows make projections trivial.</p><p><b>Matrices as arrows.</b> A matrix\'s columns are arrows; its rank is their rank. Multiplying the matrix by a vector of weights is exactly "mix the columns".</p>',
  code: {
    title: 'Projection and rank from scratch',
    note: 'Adapted from the course\'s linear algebra lesson.',
    text: `
def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def scale(u, k):
    return [k * a for a in u]

def sub(u, v):
    return [a - b for a, b in zip(u, v)]

def project(v, onto):
    # the part of v that points along "onto"
    return scale(onto, dot(v, onto) / dot(onto, onto))

def gram_schmidt(vectors):
    basis = []
    for v in vectors:
        for b in basis:
            v = sub(v, project(v, b))
        if dot(v, v) > 1e-10:          # skip arrows that add nothing
            basis.append(v)
    return basis

a, b = [2, 0.5, 0.3], [0.4, 1, 1.8]
c = [0.6 * x + 0.6 * y for x, y in zip(a, b)]   # a mix of a and b
print(len(gram_schmidt([a, b, c])))    # 2: c adds nothing
`,
  },
};
