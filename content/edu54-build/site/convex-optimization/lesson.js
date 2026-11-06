// Convex optimization: in a bowl every downhill walk ends at the same bottom, and a straight chord between two points never dips below the surface.
// A fence (a limit such as "the borehole runs at most 6 hours a day") puts the best point on the fence, and the balls slide along it.
// Break it: make the landscape bumpy (balls stop in different dips, the chord dips under), and ignore the fence (an answer you're not allowed to use).
const HALF = 3, N = 90;
const bowl = (x, z) => 0.075 * ((x - 1.2) ** 2 + 1.6 * (z - 0.9) ** 2);
const bumps = (x, z) => 0.28 * Math.sin(2.1 * x + 0.4) * Math.cos(1.9 * z - 0.3);
const LIM = 0.9;                      // the fence: x + z ≤ LIM (the bowl's bottom, 1.2 + 0.9, lies beyond it)

export default {
  slug: 'convex-optimization',
  title: 'Convex problems: one bottom, guaranteed',
  description: 'Drop eight balls into a bowl and every one rolls to the same bottom; stretch a string between two points and it never dips under the surface. Then add a fence the answer must respect, make the ground bumpy, and ignore the fence.',
  overview: 'Some problems are friendly. When the loss is shaped like a bowl (convex), any point that is lower than everything around it is the lowest point of all, so walking downhill always finds the best answer, from anywhere. Real choices also come with limits: a borehole that runs only so many hours, a budget, a speed limit. Then the best allowed answer often sits right on the limit. Linear regression and logistic regression are convex; neural networks are not.',
  keywords: ['convex optimization', 'convex function', 'constrained optimization', 'projected gradient descent', 'global minimum'],
  orient: 'any',
  view: { target: [0, 0.6, 0], dir: [1, 1.15, 1.35], half: 3.8, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { bumpy: false, fence: true, obey: true, chord: true };
    const f = (x, z) => bowl(x, z) + (st.bumpy ? bumps(x, z) : 0) + 0.45;
    const grad = (x, z) => { const e = 1e-3; return [(f(x + e, z) - f(x - e, z)) / (2 * e), (f(x, z + e) - f(x, z - e)) / (2 * e)]; };
    const Y = 0.85;
    /* ---------- the landscape ---------- */
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N); geo.rotateX(-Math.PI / 2);
    const cols = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); land.receiveShadow = true; S.add(land);
    // the outer slopes are drawn flatter than they are, so the rim doesn't tower over the bowl
    const hAt = (x, z) => { const e = f(x, z); return Y * (e < 1.4 ? e : 1.4 + (e - 1.4) * 0.3); };
    const lo = new THREE.Color('#1C6E6A'), hi = new THREE.Color('#F4EFE2'), out = new THREE.Color('#E9A99E'), cc = new THREE.Color();
    function shape() {
      const pos = geo.attributes.position;
      let mn = Infinity, mx = -Infinity; for (let i = 0; i < pos.count; i++) { const y = hAt(pos.getX(i), pos.getZ(i)); mn = Math.min(mn, y); mx = Math.max(mx, y); }
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = hAt(x, z); pos.setY(i, y);
        const u = Math.floor((y - mn) / (mx - mn) * 9) / 9;
        cc.copy(lo).lerp(hi, u); if (st.fence && x + z > LIM) cc.lerp(out, 0.55);   // beyond the fence: not allowed
        cols.set([cc.r, cc.g, cc.b], i * 3);
      }
      pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    }
    /* ---------- the fence ---------- */
    const fence = new THREE.Group(); S.add(fence);
    const posts = [...Array(9)].map(() => { const p = P.box(0.06, 0.45, 0.06, '#5B4636', { r: 0.01 }); fence.add(p); return p; });
    const rails = [0, 1].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.025, '#A87A4F'); fence.add(r); return r; });
    const fenceT = S.text('LIMIT', { size: 0.14, weight: 800, color: '#FFFFFF', bg: '#5B4636', face: 'cam', top: true }); fenceT.userData.noFit = true; S.add(fenceT);
    function placeFence() {
      // the line x + z = LIM, from one edge of the landscape to the other
      const a = [LIM + HALF, -HALF], b = [-HALF, LIM + HALF];
      const A = [Math.min(HALF, a[0]), 0], B = [0, Math.min(HALF, b[1])]; A[1] = LIM - A[0]; B[0] = LIM - B[1];
      posts.forEach((p, i) => { const t = i / 8, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t; p.position.set(x, hAt(x, z), z); });
      for (const [k, r] of rails.entries()) { const pts = posts.map(p => p.position.clone().add(V(0, 0.18 + k * 0.2, 0))); P.setRod(r, pts[0], pts[8]); }
      const m = posts[4].position; fenceT.position.set(m.x, m.y + 0.75, m.z);
      fence.visible = fenceT.visible = st.fence;
      // rails follow the ground loosely; on bumpy ground make them hug each post
      if (st.bumpy) rails.forEach(r => { r.visible = false; }); else rails.forEach(r => { r.visible = true; });
    }
    /* ---------- the chord ---------- */
    const CH = [[-2.4, 1.6], [2.4, -1.4]];
    const chord = P.rod(V(), V(0, 1, 0), 0.03, C.gold); chord.userData.noFit = true; S.add(chord);
    const chEnds = CH.map(() => { const b = P.ball(0.08, C.gold); b.userData.noFit = true; S.add(b); return b; });
    const below = [...Array(24)].map(() => { const b = P.ball(0.045, C.red); b.userData.noFit = true; S.add(b); return b; });
    function placeChord() {
      const [a, b] = CH, A = V(a[0], hAt(...a) + 0.04, a[1]), B = V(b[0], hAt(...b) + 0.04, b[1]);
      P.setRod(chord, A, B); chEnds[0].position.copy(A); chEnds[1].position.copy(B);
      let k = 0;
      for (let i = 1; i < 40 && k < below.length; i++) { const t = i / 40, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = A.y + (B.y - A.y) * t; if (y < hAt(x, z) - 0.01) { below[k].position.set(x, hAt(x, z) + 0.03, z); below[k].visible = st.chord; k++; } }
      for (; k < below.length; k++) below[k].visible = false;
      chord.visible = chEnds[0].visible = chEnds[1].visible = st.chord;
    }
    /* ---------- the balls ---------- */
    const START = [[-2.6, -2.4], [2.4, -2.6], [-2.6, 2.5], [-0.5, -2.7], [-2.7, 0.2], [0.6, 2.6], [2.7, -0.4], [-1.5, -1.0]];
    const balls = START.map((s, i) => { const b = P.ball(0.13, i ? '#F7D27A' : C.gold); b.userData.noFit = true; S.add(b); return { b, x: s[0], z: s[1], s }; });
    const dropAll = () => balls.forEach(o => { o.x = o.s[0]; o.z = o.s[1]; o.done = false; });
    function project(o) { if (st.fence && st.obey && o.x + o.z > LIM) { const d = (o.x + o.z - LIM) / 2; o.x -= d; o.z -= d; } }
    let acc = 0;
    function update(dt) {
      acc += dt * (S.reduced ? 60 : 25);
      while (acc >= 1) { acc -= 1; for (const o of balls) { const [gx, gz] = grad(o.x, o.z); o.x = Math.max(-HALF, Math.min(HALF, o.x - 0.7 * gx)); o.z = Math.max(-HALF, Math.min(HALF, o.z - 0.7 * gz)); project(o); } }
      for (const o of balls) o.b.position.set(o.x, hAt(o.x, o.z) + 0.13, o.z);
    }
    function rebuild() { shape(); placeFence(); placeChord(); dropAll(); }
    rebuild();
    const ends = () => balls.map(o => [o.x, o.z]);
    const spreadOf = () => { const e = ends(); let m = 0; for (const a of e) for (const b of e) m = Math.max(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return m; };
    const outside = () => balls.some(o => o.x + o.z > LIM + 0.02) && st.fence;
    const controls = [
      { type: 'button', label: 'Drop the balls again', short: 'Drop', act: dropAll },
      { type: 'toggle', label: 'A limit (the fence)', short: 'Fence', get: () => st.fence, set: v => { st.fence = v; rebuild(); } },
      { type: 'toggle', label: 'Bumpy ground', short: 'Bumpy', get: () => st.bumpy, set: v => { st.bumpy = v; rebuild(); } },
      { type: 'toggle', label: 'Show the string test', short: 'String', get: () => st.chord, set: v => { st.chord = v; placeChord(); }, quick: false },
    ];
    const readouts = [
      { label: 'Where the balls ended', get: () => { const s = spreadOf(); return { v: s < 0.15 ? 'all together' : 'spread out', good: s < 0.15 && !outside(), bad: s >= 0.15 }; } },
      { label: 'Lowest value found', get: () => ({ v: Math.min(...balls.map(o => f(o.x, o.z))).toFixed(3), sub: outside() ? 'but past the limit' : st.fence ? 'within the limit' : 'no limit', bad: outside() }) },
    ];
    const labels = [
      { name: 'bowl', t: 'A bowl-shaped loss', d: 'Convex: one lowest point, nothing to get stuck in', icon: 'box', at: () => V(-2.1, hAt(-2.1, -2.6), -2.6) },
      { name: 'balls', t: 'Where every ball ends', d: 'Eight starts, one answer', icon: 'target', at: () => { const [x, z] = st.fence && st.obey ? [0.4615, 0.4385] : [1.2, 0.9]; return V(x, hAt(x, z) + 0.26, z); }, hide: () => st.bumpy },
      { name: 'fence', t: 'The limit', d: 'The best allowed answer sits on it', icon: 'info', at: () => V(0.4615, hAt(0.4615, 0.4385) + 0.62, 0.4385), hide: () => !st.fence },
      { name: 'chord', t: 'The string test', d: 'Convex: a string never dips under the ground', icon: 'link', at: () => chEnds[0].position.clone().lerp(chEnds[1].position, 0.5), hide: () => !st.chord },
    ];
    const reset = () => { Object.assign(st, { bumpy: false, fence: true, obey: true, chord: true }); rebuild(); };
    const breaks = [
      { label: 'Bumpy ground', hint: 'Not convex any more', on: () => { reset(); st.bumpy = true; rebuild(); }, off: reset },
      { label: 'Ignore the limit', hint: 'Walk straight past the fence', on: () => { reset(); st.obey = false; dropAll(); }, off: reset },
    ];
    function status() {
      const s = spreadOf();
      if (st.bumpy) { const k = below.filter(b => b.visible).length; return { ok: false, msg: `<b>Not convex: no guarantee.</b> On bumpy ground the balls stop in different dips${s > 0.15 ? ', some far from the best one' : ''}, and the gold string dips under the ground in ${k ? 'several places (red)' : 'places'}. A dip that is lower than its neighbours is no longer the lowest point overall. Neural networks live on ground like this.` }; }
      if (outside()) return { ok: false, msg: `<b>An answer you can't use.</b> Ignoring the limit, the balls rolled to the bowl's true bottom, on the red side of the fence: lower loss, but the borehole can't run that long. After every step, push the ball back to the nearest allowed point (projected gradient descent).` };
      if (st.fence) return { ok: s < 0.15 ? true : undefined, msg: `<b>The best allowed answer is on the fence.</b> The bowl's true bottom lies beyond the limit, so every ball walks downhill until it meets the fence, then slides along it to the lowest point there. All eight end in the same place: a convex problem with a straight limit still has one answer.` };
      return { ok: s < 0.15 ? true : undefined, msg: `<b>Every ball found the same bottom.</b> In a bowl, any point lower than its neighbours is the lowest point overall, so walking downhill from anywhere works. The gold string between two points stays above the ground everywhere: that is what convex means.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); rebuild(); } };
  },

  story: [
    { t: 'A bowl', home: true, say: 'This loss is shaped like a bowl. Drop eight balls from all around the rim and let each walk downhill.', act: m => m.set({ fence: false, bumpy: false }), wait: 4 },
    { t: 'One bottom', home: true, say: 'Every ball ends in the same place. In a bowl there is nothing to get stuck in: any point lower than its neighbours is the lowest point of all.', wait: 4 },
    { t: 'The string test', focus: 'chord', zoom: 1.3, say: 'Here is how to tell. Stretch a string between any two points on the surface. On a convex surface the string never dips below the ground.' },
    { t: 'A limit', home: true, say: 'Real choices have limits. Say the borehole can only run so many hours a day. The fence marks the limit, and the true bottom lies beyond it.', act: m => m.set({ fence: true, bumpy: false }), wait: 5 },
    { t: 'The best allowed answer', focus: 'fence', zoom: 1.3, say: 'Each ball walks downhill, meets the fence, and slides along it to the lowest allowed point. The best answer you are allowed to use sits right on the limit.', wait: 5 },
    { t: 'Bumpy ground', home: true, say: 'Make the ground bumpy and the guarantee is gone. The balls stop in different dips, and the string dips under the ground. That is the world neural networks train in.', act: m => m.set({ bumpy: true, fence: false }), wait: 5 },
  ],
  check: [
    { q: 'What is special about a convex loss?', options: ['Any point lower than its neighbours is the lowest point overall', 'It has many dips', 'It can\'t be optimised'], answer: 0, why: 'A bowl has a single bottom, so walking downhill from anywhere reaches it.' },
    { q: 'How can you tell a surface is convex?', options: ['A straight string between any two points stays above it', 'It is green', 'It has a fence'], answer: 0, why: 'That chord test is the definition of convexity.' },
    { q: 'The true bottom lies beyond a limit you must respect. Where is the best allowed answer?', options: ['At the true bottom anyway', 'On the limit itself', 'At the starting point'], answer: 1, why: 'The loss keeps falling towards the limit, so the best allowed point is on the fence.' },
  ],
  terms: [
    ['Convex function', 'A bowl-shaped function: a straight line between two points on it never dips below it.'],
    ['Global minimum', 'The lowest point of all.'],
    ['Constraint', 'A limit the answer must respect, such as hours, budget or capacity.'],
    ['Feasible region', 'All the answers that respect every constraint.'],
    ['Projected gradient descent', 'Take a downhill step, then move back to the nearest allowed point.'],
  ],
  deeper: '<p><b>Which models are convex?</b> Linear regression with squared error, logistic regression and support vector machines all have convex losses, so their training always finds the best answer. Add a hidden layer and convexity is lost.</p><p><b>Lagrange multipliers</b> turn a limit into a price: how much the best loss would improve if the limit were loosened by one unit. Economists call it the shadow price.</p><p><b>Why neural networks still work.</b> Their losses are bumpy, yet in very many dimensions most dips have a way out, and the dips that do trap the walk tend to be nearly as low as the best.</p>',
  code: {
    title: 'Projected gradient descent',
    note: 'Adapted from the course\'s convex-optimization lesson.',
    text: `
import numpy as np

def loss(w):      # a bowl whose bottom is at (1.2, 0.9)
    x, z = w
    return 0.075 * ((x - 1.2) ** 2 + 1.6 * (z - 0.9) ** 2)

def grad(w):
    x, z = w
    return np.array([0.15 * (x - 1.2), 0.24 * (z - 0.9)])

def project(w, limit=0.9):
    # the limit: x + z <= 0.9. Step back to the nearest allowed point.
    excess = w.sum() - limit
    return w - excess / 2 if excess > 0 else w

w = np.array([-2.6, -2.4])
for _ in range(500):
    w = project(w - 0.7 * grad(w))
print(w, w.sum())        # on the line x + z = 0.9
`,
  },
};
