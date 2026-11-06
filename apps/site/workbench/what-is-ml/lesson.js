// What is machine learning: sort mangoes into ripe and not yet ripe from two measurements (skin colour, softness).
// A rule written by hand, a coin flip, or a rule learned from labelled examples (nearest centroid: the middle of each pile).
// New mangoes roll in and are sorted; accuracy is counted. Break it: swapped labels, learning from too few, a different variety arriving.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const BX = -0.6, BW = 4.2, BD = 3.2;

export default {
  slug: 'what-is-ml',
  title: 'What is machine learning?',
  description: 'Sort mangoes into ripe and not yet ripe from their colour and softness. Write a rule by hand, flip a coin, or let a rule learn itself from labelled examples, then watch new mangoes get sorted. Then swap some labels and bring in a variety that stays green when ripe.',
  overview: 'Machine learning means getting a rule from examples instead of writing it by hand. Give the computer mangoes that people have already labelled ripe or not, measured by skin colour and softness, and it finds the middle of each pile; a new mango goes to whichever middle it is closer to. That is supervised learning, classification to be exact. It only works as well as its examples: wrong labels, too few examples, or new mangoes unlike the old ones all break it.',
  keywords: ['what is machine learning', 'supervised learning', 'classification', 'nearest centroid', 'training data'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.3, 0.4, 0.1], dir: [0.15, 1.35, 1.1], half: 3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'learn', n: 40, swap: false, variety: false, seed: 7, learnT: 1, sortT: 0 };
    const X = c => BX - BW / 2 + 0.2 + c * (BW - 0.4), Z = s => BD / 2 - 0.2 - s * (BD - 0.4);   // colour across, softness away
    /* ---------- the sorting table ---------- */
    const table = P.box(BW, 0.1, BD, '#FBF8F1', { r: 0.12 }); table.position.set(BX, 0, 0); S.add(table);
    const axC = S.text('skin colour: green → yellow', { size: 0.14, weight: 750, maxW: 3.6 }); axC.position.set(BX, 0.105, BD / 2 + 0.22); S.add(axC);
    const axS = S.text('softness →', { size: 0.14, weight: 750, maxW: 1.6 }); axS.position.set(BX - BW / 2 - 0.25, 0.105, 0); axS.rotation.z = Math.PI / 2; S.add(axS);
    const mangoGeo = new THREE.SphereGeometry(0.075, 12, 10); mangoGeo.scale(1, 0.8, 1.35);
    const MAX = 160, train = new THREE.InstancedMesh(mangoGeo, new THREE.MeshLambertMaterial(), MAX); train.castShadow = true; S.add(train);
    const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.11, 0.015, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.red }), MAX); rings.layers.set(1); rings.userData.noFit = true; S.add(rings);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    // the two middles (centroids) as pins, and the fence halfway between them
    const pins = ['#3E9B5F', '#E3A72F'].map(c => { const g = new THREE.Group(); S.add(g); const rod = P.cyl(0.03, 0.55, '#5B4636'); g.add(rod); const head = P.ball(0.14, c); head.position.y = 0.6; g.add(head); g.userData.noFit = true; return g; });
    const pinT = ['not yet ripe', 'ripe'].map((n, i) => { const t = S.text(n, { size: 0.13, weight: 800, color: '#FFFFFF', bg: i ? '#B8860B' : '#2E7A4A', face: 'cam', top: true }); t.userData.noFit = true; S.add(t); return t; });
    const fence = P.box(0.04, 0.22, 1, C.plum, { r: 0, m: { opacity: 0.75 } }); fence.material.depthWrite = false; fence.userData.noFit = true; S.add(fence);
    /* ---------- the bins for new mangoes ---------- */
    const binX = BX + BW / 2 + 0.9;
    const bins = ['#3E9B5F', '#E3A72F'].map((c, i) => { const b = P.box(0.95, 0.3, 1.25, c, { r: 0.08 }); b.position.set(binX, 0, -0.75 + i * 1.5); S.add(b); return b; });
    const binT = ['NOT YET', 'RIPE'].map((n, i) => { const t = S.text(n, { size: 0.13, weight: 800, color: '#FFFFFF', maxW: 0.85 }); t.position.set(binX, 0.305, -0.75 + i * 1.5 - 0.4); S.add(t); return t; });
    const tested = new THREE.InstancedMesh(mangoGeo, new THREE.MeshLambertMaterial(), 60); tested.userData.noFit = true; S.add(tested);
    const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial(), 60); marks.userData.noFit = true; marks.layers.set(1); S.add(marks);
    /* ---------- data ---------- */
    let data = null;
    function make() {
      const r = rngOf(st.seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
      const pick = (ripe, variety) => {
        // ripe mangoes: yellow and soft; a green-skinned variety stays green even when ripe
        const c = variety ? (ripe ? 0.3 : 0.2) + g() * 0.07 : (ripe ? 0.68 : 0.34) + g() * 0.15;
        const s = (ripe ? 0.66 : 0.34) + g() * 0.15;
        return { c: Math.max(0.02, Math.min(0.98, c)), s: Math.max(0.02, Math.min(0.98, s)), ripe, variety };
      };
      const tr = []; for (let i = 0; i < st.n; i++) { const m = pick(i % 2 === 1, false); m.label = st.swap && r() < 0.6 ? !m.ripe : m.ripe; /* one basket labelled the wrong way round */ tr.push(m); }
      const te = []; for (let i = 0; i < 60; i++) te.push(pick(i % 2 === 1, st.variety));
      data = { tr, te };
      const mean = lab => { const xs = tr.filter(m => m.label === lab); return xs.length ? [xs.reduce((a, m) => a + m.c, 0) / xs.length, xs.reduce((a, m) => a + m.s, 0) / xs.length] : [0.5, 0.5]; };
      data.cen = [mean(false), mean(true)];
      st.learnT = 0; st.sortT = 0;
    }
    const predict = m => st.mode === 'rule' ? m.c > 0.5 : st.mode === 'coin' ? rngOf(Math.floor(m.c * 1e6 + m.s * 1e3))() < 0.5 : (() => { const [a, b] = data.cen; return (m.c - b[0]) ** 2 + (m.s - b[1]) ** 2 < (m.c - a[0]) ** 2 + (m.s - a[1]) ** 2; })();
    const acc = () => data.te.filter(m => predict(m) === m.ripe).length / data.te.length;
    function update(dt) {
      st.learnT = Math.min(1, st.learnT + dt * (S.reduced ? 4 : 1.2)); st.sortT += dt * (S.reduced ? 40 : 14);
      for (let i = 0; i < MAX; i++) {
        const m = data.tr[i], on = !!m;
        dummy.position.set(on ? X(m.c) : 0, 0.16, on ? Z(m.s) : 0); dummy.rotation.set(0, i * 0.7, 0); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); train.setMatrixAt(i, dummy.matrix);
        train.setColorAt(i, col.set(on && m.label ? '#E3A72F' : '#3E9B5F'));
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(on && m.label !== m.ripe ? 1 : 0.0001); dummy.updateMatrix(); rings.setMatrixAt(i, dummy.matrix);
      }
      train.instanceMatrix.needsUpdate = true; train.instanceColor.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
      // the pins slide from the table's middle to the middle of each pile
      const k = st.learnT * st.learnT * (3 - 2 * st.learnT);
      pins.forEach((p, i) => { const [c, s] = data.cen[i]; p.position.set(X(0.5 + (c - 0.5) * k), 0.1, Z(0.5 + (s - 0.5) * k)); p.visible = st.mode === 'learn'; pinT[i].visible = st.mode === 'learn'; pinT[i].position.copy(p.position).add(V(0, 1.0, 0)); });
      // the fence: halfway between the pins, at right angles to the line joining them (or the hand-written rule: colour = 0.5)
      fence.visible = st.mode !== 'coin';
      if (st.mode === 'rule') { fence.position.set(X(0.5), 0.1, 0); fence.rotation.y = 0; fence.scale.z = BD - 0.2; }
      else { const a = pins[0].position, b = pins[1].position, mid = a.clone().lerp(b, 0.5), d = b.clone().sub(a); fence.position.set(mid.x, 0.1, mid.z); fence.rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2; fence.scale.z = BD - 0.2; }
      const shown = Math.min(60, Math.floor(st.sortT));
      for (let i = 0; i < 60; i++) {
        const m = data.te[i], on = i < shown, p = predict(m), ok = p === m.ripe;
        const bi = p ? 1 : 0, row = Math.floor(i / 2) % 6, c2 = Math.floor(i / 12);
        dummy.position.set(binX - 0.32 + row * 0.13, 0.36, -0.75 + bi * 1.5 - 0.35 + c2 * 0.16); dummy.rotation.set(0, i, 0); dummy.scale.setScalar(on ? 0.9 : 0.0001); dummy.updateMatrix(); tested.setMatrixAt(i, dummy.matrix);
        tested.setColorAt(i, col.set(m.variety ? '#3E9B5F' : m.ripe ? '#E3A72F' : '#3E9B5F'));
        dummy.position.y = 0.48; dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(on && !ok ? 1 : 0.0001); dummy.updateMatrix(); marks.setMatrixAt(i, dummy.matrix); marks.setColorAt(i, col.set(C.red));
      }
      tested.instanceMatrix.needsUpdate = true; tested.instanceColor.needsUpdate = true; marks.instanceMatrix.needsUpdate = true; marks.instanceColor.needsUpdate = true;
    }
    make();
    const controls = [
      { type: 'buttons', label: 'How to sort', options: ['Learn from examples', 'Hand-written rule', 'Flip a coin'], get: () => ['learn', 'rule', 'coin'].indexOf(st.mode), act: i => { st.mode = ['learn', 'rule', 'coin'][i]; st.sortT = 0; } },
      { type: 'slider', label: 'Labelled examples', min: 4, max: 160, step: 2, get: () => st.n, set: v => { st.n = Math.round(v / 2) * 2; make(); } },
      { type: 'button', label: 'A fresh batch of mangoes', short: 'Fresh batch', act: () => { st.seed++; make(); } },
    ];
    const readouts = [
      { label: 'Sorted right', get: () => ({ v: `${Math.round(acc() * 100)}%`, bar: acc(), good: acc() >= 0.9, bad: acc() < 0.65 }), bar: true },
      { label: 'Examples learned from', get: () => ({ v: st.mode === 'learn' ? st.n : 'none', sub: st.mode === 'rule' ? 'a person wrote the rule' : st.mode === 'coin' ? 'pure chance' : `${data.tr.filter(m => m.label !== m.ripe).length} labelled wrongly` }) },
    ];
    const labels = [
      { name: 'examples', t: 'Labelled examples', d: 'Mangoes people already sorted', icon: 'box', atV: V(BX - BW / 2, 0.12, -BD / 2) },
      { name: 'pins', t: 'The middle of each pile', d: 'What the machine learns', icon: 'target', at: () => pins[1].position.clone().add(V(0, 0.75, 0)), hide: () => st.mode !== 'learn' },
      { name: 'fence', t: 'The dividing line', d: 'Closer to which middle?', icon: 'scale', atV: V(BX - BW / 2, 0.12, BD / 2) },
      { name: 'bins', t: 'New mangoes, sorted', d: 'Red marks: sorted wrongly', icon: 'check', atV: V(binX + 0.48, 0.3, 0.75) },
    ];
    const reset = () => { Object.assign(st, { mode: 'learn', n: 40, swap: false, variety: false, seed: 7 }); make(); };
    const breaks = [
      { label: 'Labels the wrong way round', hint: 'More than half the examples mislabelled', on: () => { reset(); st.swap = true; make(); }, off: reset },
      { label: 'Learn from only four mangoes', hint: 'Two of each', on: () => { reset(); st.n = 4; st.seed = 32; make(); }, off: reset },
      { label: 'A new variety arrives', hint: 'Ripe but still green', on: () => { reset(); st.variety = true; make(); }, off: reset },
    ];
    function status() {
      const a = Math.round(acc() * 100);
      if (st.variety) return { ok: false, msg: `<b>${a}% right: the machine never saw this variety.</b> It learned that ripe means yellow, from mangoes that turn yellow. This variety stays green when ripe, so most ripe ones land in the "not yet" bin. A model only knows the world its examples came from.` };
      if (st.swap && st.mode === 'learn') return { ok: false, msg: `<b>Wrong labels, wrong lesson.</b> ${data.tr.filter(m => m.label !== m.ripe).length} examples carry the wrong label (red rings), so the pile called ripe is mostly unripe mangoes and the two middles swap places: ${a}% right, worse than a coin. The machine copies its examples faithfully, mistakes included.` };
      if (st.n <= 6 && st.mode === 'learn') return { ok: false, msg: `<b>Four examples aren't enough.</b> The middles of tiny piles land wherever those few mangoes happened to be, so the line sits in the wrong place: ${a}% right. More examples, steadier middles.` };
      if (st.mode === 'coin') return { msg: `<b>A coin flip: ${a}% right.</b> About half, by chance. This is the baseline every real method has to beat by a clear margin.` };
      if (st.mode === 'rule') return { msg: `<b>A hand-written rule: "yellow means ripe". ${a}% right.</b> Fine for this variety, but someone has to know the rule and write it down, and change it for every new variety and every new measurement.` };
      return { ok: a >= 90 ? true : undefined, msg: `<b>Learned from ${st.n} examples: ${a}% right.</b> The machine found the middle of each labelled pile; each new mango goes to the nearer middle. Nobody wrote the rule: it came from the data.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); make(); }, mode: m => { st.mode = m; st.sortT = 0; } };
  },

  story: [
    { t: 'Ripe or not yet?', home: true, say: 'A trader in Kumasi sorts mangoes into ripe and not yet ripe. Each mango here is measured two ways: how yellow its skin is, and how soft it feels.', act: m => { m.reset(); m.mode('coin'); } },
    { t: 'A coin flip', focus: 'bins', zoom: 1.4, say: 'Sorting by flipping a coin gets about half right. That is the baseline anything better has to beat.' },
    { t: 'A hand-written rule', home: true, say: 'A person could write a rule: yellow means ripe. It works, but someone has to know it, write it, and rewrite it for every new variety.', act: m => m.mode('rule'), wait: 5 },
    { t: 'Learning from examples', focus: 'pins', zoom: 1.3, say: 'Machine learning starts from examples people have already labelled. It finds the middle of the ripe pile and the middle of the not yet ripe pile. A new mango goes to whichever middle is closer.', act: m => m.mode('learn'), wait: 5 },
    { t: 'Garbage in', home: true, say: 'The machine copies its examples faithfully, mistakes included. Swap some labels and the two middles slide together, and sorting gets worse.', act: m => m.set({ swap: true }), wait: 5 },
    { t: 'A world it never saw', home: true, say: 'Now a variety arrives that stays green when ripe. The machine never saw one, so it sorts them wrongly. A model only knows the world its examples came from.', act: m => m.set({ swap: false, variety: true }), wait: 5 },
  ],
  check: [
    { q: 'What makes this "machine learning" rather than a hand-written rule?', options: ['The rule is found from labelled examples', 'It uses a computer', 'It is faster'], answer: 0, why: 'The machine derives the dividing line from data instead of a person writing it.' },
    { q: 'Sorting mangoes into ripe and not ripe is…', options: ['Classification', 'Regression', 'Reinforcement learning'], answer: 0, why: 'Predicting a category is classification; predicting a number would be regression.' },
    { q: 'A new variety stays green when ripe, and the model sorts it badly. Why?', options: ['Its examples never included anything like it', 'The model is too fast', 'Mangoes can\'t be sorted'], answer: 0, why: 'Models generalise from what they have seen; new kinds of input need new examples.' },
  ],
  terms: [
    ['Machine learning', 'Getting a rule from examples instead of writing it by hand.'],
    ['Supervised learning', 'Learning from examples that come with the right answer (labels).'],
    ['Classification', 'Predicting a category, such as ripe or not ripe.'],
    ['Regression', 'Predicting a number, such as a price.'],
    ['Feature', 'One measurement of an example, such as skin colour or softness.'],
    ['Baseline', 'The simplest possible method (a coin flip, always guessing the commonest answer) that a model must beat.'],
  ],
  deeper: '<p><b>The three kinds.</b> Supervised learning has labels. Unsupervised learning has none and looks for structure, such as groups of similar customers. Reinforcement learning learns from rewards by trying things, like a game player.</p><p><b>Self-supervised learning</b> makes its own labels: hide a word and predict it, or predict the next word. That is how language models learn from raw text, with no one labelling anything.</p><p><b>When not to use ML.</b> If a clear rule exists and rarely changes (VAT is 16%), write the rule. ML earns its keep when the rule is fuzzy, changes, or nobody can write it down.</p>',
  code: {
    title: 'A nearest-centroid classifier',
    note: 'Adapted from the course\'s first ML lesson.',
    text: `
def centroid(points):
    return [sum(p[i] for p in points) / len(points) for i in range(2)]

def fit(examples):
    # examples: (colour, softness, ripe)
    ripe = [e[:2] for e in examples if e[2]]
    not_ripe = [e[:2] for e in examples if not e[2]]
    return centroid(ripe), centroid(not_ripe)

def predict(model, mango):
    ripe, not_ripe = model
    d = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
    return d(mango, ripe) < d(mango, not_ripe)

examples = [(0.75, 0.7, True), (0.68, 0.66, True), (0.3, 0.28, False), (0.25, 0.35, False)]
model = fit(examples)
print(predict(model, (0.7, 0.6)))     # True: ripe
`,
  },
};
