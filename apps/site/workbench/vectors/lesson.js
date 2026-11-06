// Vectors: dishes from across the continent as arrows in a taste space (spicy, sweet, crunchy). The angle between two arrows says how alike they are.
// Cosine similarity, the dot product and length. Break it: raw dot product (a bigger pot looks more like everything), an empty plate.
const AX = 4;   // axis length in scene units, for a taste of 1
const FOODS = [
  { n: 'Jollof rice', v: [0.75, 0.25, 0.1] },
  { n: 'Suya', v: [0.95, 0.1, 0.55] },
  { n: 'Pepper soup', v: [1, 0.05, 0.05] },
  { n: 'Puff-puff', v: [0.05, 0.85, 0.35] },
  { n: 'Chin-chin', v: [0.02, 0.6, 0.95] },
  { n: 'Plantain chips', s: 'Plantain', v: [0.15, 0.35, 0.9] },
  { n: 'Nyama choma', s: 'Nyama', v: [0.55, 0.05, 0.45] },
  { n: 'Mandazi', v: [0.05, 0.7, 0.3] },
  { n: 'Doro wat', s: 'Doro wat', v: [0.95, 0.15, 0.02] },
  { n: 'Ta\'ameya', v: [0.3, 0.05, 0.8] },
  { n: 'Makroud', v: [0.02, 0.95, 0.5] },
];
const N = FOODS.length;   // the learner's own dish is item N
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(...a);

export default {
  slug: 'vectors',
  title: 'Vectors: how alike are two things?',
  description: 'Turn jollof, suya, nyama choma and makroud into arrows. The angle between two arrows tells you how alike they are: the idea behind search, recommendations and every language model.',
  overview: 'A vector is a list of numbers, and it can be drawn as an arrow. Give every dish three numbers (how spicy, how sweet, how crunchy) and similar dishes point the same way. AI compares words, pictures and songs exactly like this, with hundreds of numbers instead of three.',
  keywords: ['vectors explained', 'cosine similarity', 'dot product', 'embeddings basics'],
  orient: 'any',
  view: { target: [1.6, 1.4, 1.6], dir: [1.25, 0.9, 1.1], half: 4.6, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const g = new THREE.Group(); S.add(g);
    const toW = v => V(v[0] * AX, v[2] * AX, v[1] * AX);   // spicy → x, crunchy → up, sweet → z
    /* ---------- the floor grid and axes ---------- */
    const floor = P.box(AX + 0.3, 0.06, AX + 0.3, '#F1EEE6', { r: 0.2 }); floor.position.set(AX / 2, 0, AX / 2); g.add(floor);
    for (let k = 1; k <= 4; k++) {
      const u = k / 4 * AX;
      for (const [a, b] of [[V(u, 0.07, 0), V(u, 0.07, AX)], [V(0, 0.07, u), V(AX, 0.07, u)]]) { const r = P.rod(a, b, 0.008, '#C9C4B6'); r.layers.set(1); g.add(r); }
    }
    const axes = [
      { d: V(1, 0, 0), n: 'Spicy', c: C.red },
      { d: V(0, 0, 1), n: 'Sweet', c: C.gold },
      { d: V(0, 1, 0), n: 'Crunchy', c: C.green },
    ];
    for (const a of axes) {
      const ar = P.arrow(V(0, 0.06, 0), a.d.clone().multiplyScalar(AX + 0.5).add(V(0, 0.06, 0)), 0.035, a.c); g.add(ar);
      const t = S.text(a.n.toUpperCase(), { size: 0.24, face: 'cam', weight: 700, color: a.c });
      t.position.copy(a.d.clone().multiplyScalar(AX + 0.95)).add(V(0, 0.2, 0)); t.userData.noFit = true; g.add(t);
    }
    /* ---------- the dishes ---------- */
    const st = { a: 0, b: 1, raw: false, mine: [0.5, 0.5, 0.5], showMine: false, bigPot: false, empty: false };
    const vecOf = i => i === N ? st.mine : st.empty && i === st.b ? [0, 0, 0] : FOODS[i].v.map(x => x * (st.bigPot && i === st.b ? 3 : 1));
    const names = [...FOODS.map(f => f.n), 'Your dish'];
    const chip = th => th?.dark ? 'rgba(30,33,54,.82)' : 'rgba(255,255,255,.82)';
    const items = names.map((n, i) => {
      const ar = P.arrow(V(), V(0, 1, 0), 0.03, '#9C9AA6'); g.add(ar);
      const tip = P.ball(0.07, '#9C9AA6'); g.add(tip);
      // names sit on a soft chip, drawn over the arrows so they never hide behind them
      const t = S.text(n, { size: 0.2, face: 'cam', weight: 600, bg: chip(S.theme), pad: 0.2, top: true }); t.userData.noFit = true; g.add(t);
      return { ar, tip, t };
    });
    // the angle between A and B: an arc and its number
    const arcMat = P.mat(C.ink, { basic: true });
    let arc = null;
    const angT = S.text('', { size: 0.24, face: 'cam', weight: 700, bg: 'rgba(255,255,255,.92)', color: C.ink, top: true });
    const arcMid = V(); angT.userData.noFit = true; g.add(angT);
    const matA = P.mat(C.teal), matB = P.mat(C.coral), matN = P.mat('#A9A7B3');
    function draw() {
      items.forEach((it, i) => {
        const on = i < N || st.showMine; it.ar.visible = it.tip.visible = it.t.visible = on; if (!on) return;
        const v = vecOf(i), w = toW(v), z = len(v) < 1e-6;
        const sel = i === st.a ? matA : i === st.b ? matB : matN;
        it.ar.userData.shaft.material = it.ar.userData.head.material = sel; it.tip.material = sel;
        const thick = i === st.a || i === st.b ? 1.9 : 1;
        it.ar.userData.shaft.scale.x = it.ar.userData.shaft.scale.z = thick;
        it.ar.visible = !z;
        if (!z) P.setArrow(it.ar, V(0, 0.07, 0), w.clone().add(V(0, 0.07, 0)));
        it.tip.position.copy(w).add(V(0, 0.07, 0)); it.tip.scale.setScalar(z ? 2.2 : 1);
        it.t.position.copy(w).add(V(0, 0.38, 0));
        it.t.userData.style({ weight: i === st.a || i === st.b ? 750 : 550 });
      });
      const a = vecOf(st.a), b = vecOf(st.b);
      S.label('a', `Dish A: ${names[st.a]}`, `Spicy ${a[0].toFixed(2)}, sweet ${a[1].toFixed(2)}, crunchy ${a[2].toFixed(2)}`);
      S.label('b', `Dish B: ${names[st.b]}`, `Spicy ${b[0].toFixed(2)}, sweet ${b[1].toFixed(2)}, crunchy ${b[2].toFixed(2)}`);
      if (arc) { g.remove(arc); arc.geometry.dispose(); arc = null; }
      angT.visible = false;
      if (len(a) > 1e-6 && len(b) > 1e-6) {
        const ua = toW(a).normalize(), ub = toW(b).normalize(), R = 1.3, pts = [];
        const ang = ua.angleTo(ub);
        for (let k = 0; k <= 24; k++) pts.push(ua.clone().lerp(ub, k / 24).normalize().multiplyScalar(R).add(V(0, 0.07, 0)));
        if (ang > 0.02) { arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.022, 6), arcMat); arc.layers.set(1); arc.userData.noFit = true; g.add(arc); }
        angT.visible = true; angT.userData.set(`${Math.round(ang * 180 / Math.PI)}°`);
        angT.position.copy(ua.clone().add(ub).normalize().multiplyScalar(R + 0.45)).add(V(0, 0.07, 0));
        arcMid.copy(ua.clone().add(ub).normalize().multiplyScalar(R)).add(V(0, 0.07, 0));
      }
    }
    draw();
    // names never pile up: A and B first, then each other name only if it has room on screen
    const cam = S.R.cam, right = new THREE.Vector3(), up = new THREE.Vector3(), q = new THREE.Vector3();
    function declutter() {
      cam.updateMatrixWorld(); right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
      const order = items.map((_, i) => i).filter(i => i < N || st.showMine).sort((x, y) => (y === st.a || y === st.b) - (x === st.a || x === st.b));
      const placed = [];
      for (const i of order) {
        const it = items[i], p = it.t.position, w = it.t.scale.x / 2 + 0.04, h = it.t.scale.y / 2 + 0.02;
        const c = q.copy(p).project(cam), cx = c.x, cy = c.y;
        const ex = q.copy(p).addScaledVector(right, w).project(cam).x - cx, ey = q.copy(p).addScaledVector(up, h).project(cam).y - cy;
        const box = [cx - Math.abs(ex), cy - Math.abs(ey), cx + Math.abs(ex), cy + Math.abs(ey)];
        if (i === st.a || i === st.b) { it.t.visible = false; placed.push(box); continue; }   // their cards name them
        const free = !placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
        it.t.visible = free;
        if (free) placed.push(box);
      }
    }
    const cos = () => { const a = vecOf(st.a), b = vecOf(st.b), la = len(a), lb = len(b); return la * lb < 1e-9 ? NaN : dot(a, b) / (la * lb); };
    const score = () => st.raw ? dot(vecOf(st.a), vecOf(st.b)) : cos();
    // tap a dish's tip to make it B (or A if it is already B)
    items.forEach((it, i) => S.tap(it.tip, () => { if (i === st.a) return; if (i === st.b) { st.b = st.a; st.a = i; } else st.b = i; draw(); S.sync(); }));

    const opts = FOODS.map(f => f.s || f.n.split(' ')[0]).concat('Yours');
    const controls = [
      { type: 'buttons', label: 'Dish A', options: opts, get: () => st.a, act: i => { if (i === N) st.showMine = true; if (i !== st.b) st.a = i; draw(); } },
      { type: 'buttons', label: 'Dish B', options: opts, get: () => st.b, act: i => { if (i === N) st.showMine = true; if (i !== st.a) st.b = i; draw(); } },
      { type: 'slider', label: 'Your dish: spicy', min: 0, max: 1, step: 0.05, get: () => st.mine[0], set: v => { st.mine[0] = v; st.showMine = true; draw(); } },
      { type: 'slider', label: 'Your dish: sweet', min: 0, max: 1, step: 0.05, get: () => st.mine[1], set: v => { st.mine[1] = v; st.showMine = true; draw(); } },
      { type: 'slider', label: 'Your dish: crunchy', min: 0, max: 1, step: 0.05, get: () => st.mine[2], set: v => { st.mine[2] = v; st.showMine = true; draw(); } },
      { type: 'button', label: 'Most alike pair', short: 'Most alike', act: () => { let best = [0, 1], bs = -2; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const c = dot(FOODS[i].v, FOODS[j].v) / len(FOODS[i].v) / len(FOODS[j].v); if (c > bs) { bs = c; best = [i, j]; } } [st.a, st.b] = best; draw(); } },
      { type: 'button', label: 'Least alike pair', short: 'Least alike', act: () => { let best = [0, 1], bs = 2; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const c = dot(FOODS[i].v, FOODS[j].v) / len(FOODS[i].v) / len(FOODS[j].v); if (c < bs) { bs = c; best = [i, j]; } } [st.a, st.b] = best; draw(); } },
    ];
    const fmtV = v => `[${v.map(x => x.toFixed(2)).join(', ')}]`;
    const readouts = [
      { label: st.raw ? 'Dot product' : 'How alike', get: () => { const s = score(); return Number.isFinite(s) ? { v: st.raw ? s.toFixed(2) : `${Math.round(s * 100)}%`, bar: st.raw ? Math.min(1, s / 3) : s, bad: st.raw } : { v: '÷ 0', bad: true, bar: 0 }; }, bar: true },
      { label: 'Angle', get: () => { const c = cos(); return Number.isFinite(c) ? `${Math.round(Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI)}°` : '—'; } },
    ];
    const labels = [
      { name: 'a', t: `Dish A: ${names[st.a]}`, d: 'Spicy 0.75, sweet 0.25, crunchy 0.10', icon: 'target', at: () => items[st.a].tip.position.clone() },
      { name: 'b', t: `Dish B: ${names[st.b]}`, d: 'Spicy 0.95, sweet 0.10, crunchy 0.55', icon: 'target', at: () => items[st.b].tip.position.clone() },
      { name: 'angle', t: 'The angle', d: 'Small angle: alike. Wide angle: different', icon: 'scale', at: () => arcMid.clone(), hide: () => !angT.visible },
      { name: 'origin', t: 'Zero', d: 'Every arrow starts here', icon: 'info', atV: V(0, 0.08, 0), phone: false },
    ];
    const breaks = [
      { label: 'Compare with the raw dot product', hint: 'And make dish B a pot three times bigger', on: () => { st.raw = true; st.bigPot = true; draw(); }, off: () => { st.raw = false; st.bigPot = false; draw(); } },
      { label: 'An empty plate', hint: 'Dish B is all zeros', on: () => { st.empty = true; draw(); }, off: () => { st.empty = false; draw(); } },
    ];
    function status() {
      const A = names[st.a], B = names[st.b], c = cos();
      if (st.empty) return { ok: false, msg: `<b>Divide by zero.</b> An empty plate is [0, 0, 0]: an arrow with no length and no direction, so the angle means nothing. Real systems skip empty vectors or add a tiny number first.` };
      if (st.raw) return { ok: false, msg: `<b>The dot product grows with size.</b> A pot of ${B} three times bigger scores ${dot(vecOf(st.a), vecOf(st.b)).toFixed(2)} with ${A}, as if it tasted more alike. It doesn't. Dividing by the lengths (cosine) fixes it: still ${Math.round(c * 100)}%.` };
      return { ok: c > 0.8 ? true : undefined, msg: `<b>${A}</b> ${fmtV(vecOf(st.a))} and <b>${B}</b> ${fmtV(vecOf(st.b))}: ${Math.round(c * 100)}% alike. ${c > 0.9 ? 'Nearly the same direction.' : c > 0.6 ? 'Fairly alike.' : c > 0.35 ? 'Not very alike.' : 'Very different.'}` };
    }
    return {
      update: declutter, theme: th => items.forEach(it => it.t.userData.style({ bg: chip(th) })), controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { a: 0, b: 1, raw: false, bigPot: false, empty: false }); draw(); },
      pick: (a, b) => { st.a = a; st.b = b; draw(); },
    };
  },

  story: [
    { t: 'Three numbers per dish', home: true, say: 'A vector is just a list of numbers. Here every dish gets three: how spicy, how sweet and how crunchy it is.', act: m => m.pick(0, 1) },
    { t: 'Numbers become an arrow', focus: 'a', zoom: 1.5, say: 'Jollof rice is quite spicy, a little sweet and not crunchy. Walk that far along each axis and you reach the tip of its arrow.' },
    { t: 'Alike dishes point the same way', focus: 'angle', zoom: 1.5, say: 'Suya points almost the same way as jollof. The small angle between them means they are alike: both spicy, not sweet.', act: m => m.pick(0, 1) },
    { t: 'Different dishes point apart', home: true, say: 'Now compare pepper soup with chin-chin. The arrows point far apart. Very different snacks.', act: m => m.pick(2, 4) },
    { t: 'Cosine similarity', home: true, say: 'The number that measures the angle is called cosine similarity. One means the same direction. Zero means nothing in common. Puff-puff from Lagos and mandazi from Mombasa score almost one: both sweet fried dough.', act: m => m.pick(3, 7) },
    { t: 'This is how AI compares', home: true, say: 'Language models turn every word into an arrow like this, with hundreds of numbers instead of three. Words that mean similar things point the same way. That is how search finds what you meant, not just what you typed.', act: m => m.pick(3, 4) },
  ],
  check: [
    { q: 'Two arrows point in almost the same direction. The dishes are…', options: ['Very alike', 'Very different', 'The same size'], answer: 0, why: 'A small angle means the numbers rise and fall together: the dishes are alike.' },
    { q: 'Why divide the dot product by the lengths?', options: ['To make it faster', 'So a bigger amount of the same thing doesn\'t look more alike', 'To make the numbers negative'], answer: 1, why: 'Dividing by the lengths keeps only the direction. A pot three times bigger still tastes the same.' },
    { q: 'What is a vector?', options: ['A picture', 'A list of numbers, drawn as an arrow', 'A kind of database'], answer: 1, why: 'A list of numbers. Two or three can be drawn as an arrow; AI uses hundreds.' },
  ],
  terms: [
    ['Vector', 'A list of numbers. With two or three numbers you can draw it as an arrow.'],
    ['Dot product', 'Multiply the matching numbers and add them up. Big when the arrows point the same way and are long.'],
    ['Length (magnitude)', 'How long the arrow is: the square root of the dot product with itself.'],
    ['Cosine similarity', 'The dot product divided by both lengths. 1 means the same direction, 0 means unrelated.'],
    ['Embedding', 'A vector that a model learns for a word, a picture or a song, so similar things sit close together.'],
  ],
  deeper: '<p>Matrices are stacks of vectors. Multiplying a vector by a matrix turns it into a new vector: every layer of a neural network does exactly this, millions of times a second.</p><p>Cosine similarity ignores length. Sometimes length matters (a review that is more strongly positive); then people use the plain dot product or the distance between the tips instead.</p>',
  code: {
    title: 'Vectors, the dot product and cosine similarity',
    note: 'The same sums the lesson does, in plain Python.',
    text: `
import math

class Vector:
    def __init__(self, data):
        self.data = list(data)

    def dot(self, other):
        return sum(a * b for a, b in zip(self.data, other.data))

    def magnitude(self):
        return math.sqrt(self.dot(self))

    def cosine(self, other):
        # the angle, without the lengths
        return self.dot(other) / (self.magnitude() * other.magnitude())

#             spicy sweet crunchy
jollof = Vector([0.75, 0.25, 0.10])
suya   = Vector([0.95, 0.10, 0.55])
print(round(jollof.cosine(suya), 2))   # 0.9: quite alike
`,
  },
};
