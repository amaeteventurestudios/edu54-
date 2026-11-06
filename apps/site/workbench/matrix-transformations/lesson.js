// Matrix transformations: a 2 × 2 matrix moves every point of a grid. The two basis arrows land on the matrix's columns,
// the unit square becomes a parallelogram whose area is the determinant, and some arrows only stretch (eigenvectors).
// Break it: a matrix that squashes the plane onto a line (determinant 0), and swapping the order of two transformations.
const G = 5, H = 2.6;            // grid lines each side of the origin, and how far they reach
const PRE = {
  Identity: [1, 0, 0, 1],
  'Rotate 30°': [Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)],
  Stretch: [1.5, 0, 0, 0.6],
  Shear: [1, 0.8, 0, 1],
  Mirror: [-1, 0, 0, 1],
  Squash: [1, 0.6, 1.5, 0.9],
};
const mul = (p, q) => [p[0] * q[0] + p[1] * q[2], p[0] * q[1] + p[1] * q[3], p[2] * q[0] + p[3] * q[2], p[2] * q[1] + p[3] * q[3]];

export default {
  slug: 'matrix-transformations',
  title: 'Matrices move space',
  description: 'Pick a 2 × 2 matrix and watch it rotate, stretch, shear or mirror a whole grid at once. The two arrows land on its columns, the determinant is how much area grows, and a few arrows only stretch: the eigenvectors.',
  overview: 'A matrix is a machine that moves every point in space the same way. Where the two basic arrows land is all you need: they are the matrix\'s columns, and everything else follows. The determinant says how much area grows (or flips, if it is negative), and eigenvectors are the special directions that don\'t turn, only stretch. Every layer of a neural network is a matrix like this, only much bigger.',
  keywords: ['matrix transformation', 'rotation matrix', 'determinant meaning', 'eigenvectors intuition', 'linear transformation'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.3, 0.3, -0.2], dir: [0.25, 1.35, 1.1], half: 3.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { m: [1, 0, 0, 1], from: [1, 0, 0, 1], to: PRE['Rotate 30°'], u: 0, eig: true, name: 'Rotate 30°', swap: false };
    const W = (x, y, h = 0.13) => V(x, h, -y);
    const ap = (m, x, y) => [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
    /* ---------- the board, the old grid and the moving grid ---------- */
    const board = P.box(2 * H + 0.6, 0.12, 2 * H + 0.6, '#FBF8F1', { r: 0.12 }); S.add(board);
    for (let k = -G; k <= G; k++) {
      const s = k / G * H;
      for (const [a, b] of [[W(s, -H, 0.121), W(s, H, 0.121)], [W(-H, s, 0.121), W(H, s, 0.121)]]) { const r = P.rod(a, b, k ? 0.006 : 0.012, '#C9C4B6'); r.layers.set(1); S.add(r); }
    }
    const lines = [];
    for (let k = -G; k <= G; k++) for (const dir of [0, 1]) { const r = P.rod(V(), V(0, 1, 0), k ? 0.012 : 0.02, k ? '#5FB8B2' : '#1C9A94'); r.layers.set(1); r.userData.noFit = true; S.add(r); lines.push({ k, dir, r }); }
    const sq = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    sq.userData.noFit = true; S.add(sq);
    // an F, so a mirror image shows
    const F = [[[0.3, 0.3], [0.3, 1.5]], [[0.3, 1.5], [1.1, 1.5]], [[0.3, 0.95], [0.85, 0.95]]];
    const fr = F.map(() => { const r = P.rod(V(), V(0, 1, 0), 0.05, C.plum); r.userData.noFit = true; S.add(r); return r; });
    const ai = P.arrow(V(), V(1, 0, 0), 0.05, C.red), aj = P.arrow(V(), V(1, 0, 0), 0.05, C.green); [ai, aj].forEach(a => { a.userData.noFit = true; S.add(a); });
    const eig = [0, 1].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.03, C.orange); r.userData.noFit = true; S.add(r); return r; });
    const ghost = F.map(() => { const r = P.rod(V(), V(0, 1, 0), 0.03, '#B9B6AE'); r.userData.noFit = true; S.add(r); return r; });
    /* ---------- the matrix on a stand ---------- */
    const stand = P.box(2.0, 1.2, 0.12, '#2C2D31', { r: 0.05 }); stand.position.set(0, 0, -H - 0.75); S.add(stand);
    const mT = S.text('', { size: 0.17, face: 'front', weight: 700, color: '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 1.85, maxH: 1.05 }); mT.position.set(0, 0.6, -H - 0.685); S.add(mT);
    const mTop = S.text('THE MATRIX', { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 1.8 }); mTop.position.set(0, 1.205, -H - 0.75); S.add(mTop);
    function eigen(m) {
      const tr = m[0] + m[3], det = m[0] * m[3] - m[1] * m[2], disc = tr * tr / 4 - det;
      if (disc < -1e-9) return null;
      const r = Math.sqrt(Math.max(0, disc)), ls = [tr / 2 + r, tr / 2 - r];
      return ls.map(l => { let v = Math.abs(m[1]) > 1e-6 ? [m[1], l - m[0]] : Math.abs(m[2]) > 1e-6 ? [l - m[3], m[2]] : (Math.abs(l - m[0]) < 1e-6 ? [1, 0] : [0, 1]); const n = Math.hypot(...v); return { l, v: [v[0] / n, v[1] / n] }; });
    }
    function update(dt) {
      if (st.u < 1) { st.u = Math.min(1, st.u + dt * (S.reduced ? 6 : 1.1)); const e = st.u * st.u * (3 - 2 * st.u); st.m = st.from.map((a, i) => a + (st.to[i] - a) * e); }
      const m = st.m;
      for (const L of lines) {
        const s = L.k / G * H;
        const [x0, y0] = L.dir ? ap(m, s, -H) : ap(m, -H, s), [x1, y1] = L.dir ? ap(m, s, H) : ap(m, H, s);
        P.setRod(L.r, W(x0, y0, 0.14), W(x1, y1, 0.14));
      }
      const c = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => W(...ap(m, x, y), 0.135));
      sq.geometry.setAttribute('position', new THREE.Float32BufferAttribute([...c[0].toArray(), ...c[1].toArray(), ...c[2].toArray(), ...c[0].toArray(), ...c[2].toArray(), ...c[3].toArray()], 3));
      sq.geometry.computeBoundingSphere();
      F.forEach((seg, i) => P.setRod(fr[i], W(...ap(m, ...seg[0]), 0.16), W(...ap(m, ...seg[1]), 0.16)));
      P.setArrow(ai, W(0, 0, 0.17), W(m[0], m[2], 0.17)); P.setArrow(aj, W(0, 0, 0.17), W(m[1], m[3], 0.17));
      const ev = st.eig ? eigen(m) : null;
      eig.forEach((r, i) => { const e = ev && ev[i]; r.visible = !!e && Math.abs(e.l) > 1e-3; if (r.visible) P.setRod(r, W(-e.v[0] * H, -e.v[1] * H, 0.15), W(e.v[0] * H, e.v[1] * H, 0.15)); });
      // the other order, as a grey ghost
      const other = st.swap ? mul(PRE.Shear, PRE['Rotate 30°']) : null;
      ghost.forEach((r, i) => { r.visible = !!other; if (other) P.setRod(r, W(...ap(other, ...F[i][0]), 0.155), W(...ap(other, ...F[i][1]), 0.155)); });
      const f = v => (v >= 0 ? ' ' : '') + v.toFixed(2);
      mT.userData.set(`[${f(m[0])}  ${f(m[1])}]\n[${f(m[2])}  ${f(m[3])}]\n\ndet = ${(m[0] * m[3] - m[1] * m[2]).toFixed(2)}`);
    }
    const go = (name, to) => { st.from = [...st.m]; st.to = to || PRE[name]; st.u = 0; st.name = name; };
    const det = () => st.m[0] * st.m[3] - st.m[1] * st.m[2];
    const controls = [
      { type: 'buttons', label: 'Matrix', options: Object.keys(PRE).filter(k => k !== 'Squash'), get: () => Object.keys(PRE).indexOf(st.name), act: i => { st.swap = false; go(Object.keys(PRE)[i]); } },
      { type: 'button', label: 'Rotate, then shear', short: 'Rotate, then shear', act: () => { st.swap = false; go('Rotate, then shear', mul(PRE.Shear, PRE['Rotate 30°'])); } },
      { type: 'toggle', label: 'Show eigenvectors', short: 'Eigenvectors', get: () => st.eig, set: v => { st.eig = v; } },
    ];
    const readouts = [
      { label: 'Determinant', get: () => ({ v: det().toFixed(2), sub: Math.abs(det()) < 0.02 ? 'area squashed to 0' : det() < 0 ? 'flipped' : `area × ${det().toFixed(2)}`, bad: Math.abs(det()) < 0.02 }) },
      { label: 'Eigenvalues', get: () => { const e = eigen(st.m); return { v: e ? e.map(x => x.l.toFixed(2)).join(' and ') : 'none (it turns everything)' }; } },
    ];
    const labels = [
      { name: 'i', t: 'Where the arrows land', d: 'Red and green: the matrix\'s two columns', icon: 'target', at: () => W(st.m[0], st.m[2], 0.17) },
      { name: 'square', t: 'The unit square', d: 'Its new area is the determinant', icon: 'scale', at: () => W(...ap(st.m, 1, 1), 0.135) },
      { name: 'grid', t: 'The whole grid moves', d: 'Lines stay straight and evenly spaced', icon: 'box', atV: W(-H - 0.3, H + 0.3, 0.12) },
      { name: 'matrix', t: 'The matrix', d: 'Four numbers that move every point', icon: 'info', atV: V(1.0, 1.2, -H - 0.75) },
    ];
    const reset = () => { st.swap = false; st.eig = true; st.m = [1, 0, 0, 1]; go('Rotate 30°'); };
    const breaks = [
      { label: 'A matrix that squashes', hint: 'Determinant 0', on: () => { st.swap = false; go('Squash'); }, off: reset },
      { label: 'Swap the order', hint: 'Shear, then rotate', on: () => { st.swap = true; go('Shear, then rotate', mul(PRE['Rotate 30°'], PRE.Shear)); }, off: reset },
    ];
    function status() {
      const d = det();
      if (st.name === 'Squash' && st.u >= 1) return { ok: false, msg: `<b>The plane is squashed onto a line.</b> The two columns point the same way (the second is 0.6 times the first), so the square has no area left: determinant 0. Many points land on the same spot, so nothing can undo it: the matrix has no inverse.` };
      if (st.swap && st.u >= 1) return { ok: false, msg: `<b>Same two moves, different result.</b> Shearing then rotating (purple) is not rotating then shearing (grey ghost). Matrix multiplication depends on order: A times B is usually not B times A. In code, apply layers in the order the model expects.` };
      if (st.u < 1) return { msg: `<b>Moving to ${st.name.toLowerCase()}…</b> Every point slides at once; straight lines stay straight.` };
      if (d < 0) return { msg: `<b>A mirror image.</b> The determinant is ${d.toFixed(2)}: area stays the same size, but the negative sign means the F is flipped over.` };
      const e = eigen(st.m);
      return { ok: true, msg: `<b>${st.name}.</b> The red arrow lands on (${st.m[0].toFixed(2)}, ${st.m[2].toFixed(2)}) and the green on (${st.m[1].toFixed(2)}, ${st.m[3].toFixed(2)}): those are the columns. Area × ${d.toFixed(2)}. ${e ? `Orange lines: directions that only stretch, by ${e.map(x => x.l.toFixed(2)).join(' and ')}.` : 'No direction escapes turning, so there are no real eigenvectors.'}` };
    }
    reset();
    return { update, controls, readouts, labels, breaks, status, reset, go };
  },

  story: [
    { t: 'A machine for space', home: true, say: 'A matrix is a machine that moves every point of space in the same way. Watch the whole grid turn at once.', act: m => m.reset(), wait: 4 },
    { t: 'Follow two arrows', focus: 'i', zoom: 1.4, say: 'Follow just two arrows: red, one step along, and green, one step up. Where they land are the matrix\'s two columns. Everything else follows from them.', act: m => m.go('Stretch'), wait: 5 },
    { t: 'Area and the determinant', focus: 'square', zoom: 1.4, say: 'The gold square started with area one. After the move, its area is the determinant. Stretch one way and squeeze the other, and area can stay almost the same.', act: m => m.go('Shear'), wait: 5 },
    { t: 'A mirror', home: true, say: 'A negative determinant means space was flipped, like a mirror. Look at the letter F: it now faces the other way.', act: m => m.go('Mirror'), wait: 5 },
    { t: 'Directions that only stretch', home: true, say: 'Some directions do not turn at all, they only stretch. These are eigenvectors, drawn in orange, and the stretch is the eigenvalue. They explain why some networks blow up or fade away.', act: m => m.go('Stretch'), wait: 5 },
    { t: 'Squashed flat', home: true, say: 'If both arrows land on the same line, the plane is squashed flat. Its determinant is zero, and nothing can undo it.', act: m => m.go('Squash'), wait: 5 },
  ],
  check: [
    { q: 'Where do the matrix\'s columns show up?', options: ['As where the two basic arrows land', 'As the grid\'s colour', 'Nowhere you can see'], answer: 0, why: 'The first column is where (1, 0) lands; the second is where (0, 1) lands.' },
    { q: 'A matrix has determinant 0. What does it do?', options: ['Rotates space', 'Squashes area to nothing, so it can\'t be undone', 'Doubles every length'], answer: 1, why: 'Zero area means many points land on the same spot, so there is no inverse.' },
    { q: 'What is an eigenvector?', options: ['A direction the matrix only stretches, never turns', 'The biggest number in the matrix', 'Any arrow after the move'], answer: 0, why: 'It stays on its own line; the stretch factor is its eigenvalue.' },
  ],
  terms: [
    ['Linear transformation', 'A move of space that keeps lines straight and the origin fixed; a matrix does exactly this.'],
    ['Basis vectors', 'The two unit arrows (1, 0) and (0, 1); where they land defines the matrix.'],
    ['Determinant', 'How much the matrix scales area (volume in 3D); negative means flipped.'],
    ['Eigenvector', 'A direction the matrix only stretches; the stretch factor is the eigenvalue.'],
    ['Composition', 'Doing one transformation after another: multiplying their matrices, in order.'],
  ],
  deeper: '<p><b>Why eigenvalues matter in AI.</b> Apply the same matrix again and again (as a recurrent network does) and directions with eigenvalue above 1 explode, while those below 1 fade to nothing. That is the exploding and vanishing gradient problem in one picture.</p><p><b>PCA</b> finds the eigenvectors of a dataset\'s covariance matrix: the directions along which the data spreads most.</p><p><b>3D and beyond.</b> A 3 × 3 matrix moves three arrows and scales volume. A layer with 4,096 inputs is the same idea in 4,096 dimensions.</p>',
  code: {
    title: 'Transformations and eigenvalues from scratch',
    note: 'Adapted from the course\'s matrix lesson.',
    text: `
import math

def apply(m, p):
    (a, b), (c, d) = m
    x, y = p
    return (a * x + b * y, c * x + d * y)

def matmul(m, n):          # do n first, then m
    return [[sum(m[i][k] * n[k][j] for k in range(2)) for j in range(2)] for i in range(2)]

t = math.radians(30)
rotate = [[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]]
shear = [[1, 0.8], [0, 1]]
print(matmul(shear, rotate) == matmul(rotate, shear))   # False: order matters

def det(m):
    (a, b), (c, d) = m
    return a * d - b * c

def eigenvalues(m):
    (a, b), (c, d) = m
    tr, dt = a + d, det(m)
    disc = tr * tr / 4 - dt
    if disc < 0:
        return None                     # it turns every direction
    r = math.sqrt(disc)
    return tr / 2 + r, tr / 2 - r
`,
  },
};
