// Image classification: a sorting machine for maize-leaf photos from farms in western Kenya: healthy, rust or blight.
// Photo cards leave the hopper one at a time, the classifier shows its three confidence bars, and the card drops into the bin of its predicted class.
// A card's colour is its true class, so a wrong colour in a bin is a mistake. The wall shows the confusion matrix and the accuracy on each set.
// Break it: no augmentation (it memorises the training photos), test photos not normalised like training (everything looks healthy), the same plants in training and validation (a score that is too good to be true).
const CLS = [{ n: 'healthy', c: '#4E9A43' }, { n: 'rust', c: '#D9772B' }, { n: 'blight', c: '#8A7A6A' }];
const CENT = [[0.25, 0.25], [0.72, 0.32], [0.38, 0.75]], BRIGHT = [0.25, 0.8, 0.55];

function makeSets() {
  let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  // features: how much orange rust, how much grey lesion, and photo brightness. By bad luck the 30 training photos
  // were taken at different times of day for each class, so brightness tracks the class there and nowhere else.
  const draw = (n, spread, chance) => [...Array(n)].map((_, i) => { const y = i % 3; return { f: [...CENT[y].map(c => c + g() * spread), chance ? BRIGHT[y] + g() * 0.05 : r()], y }; });
  const train = draw(30, 0.13, true), val = draw(45, 0.13, false), farms = draw(45, 0.15, false);
  const leaky = train.concat(train).slice(0, 45).map(p => ({ f: p.f.map(v => v + g() * 0.01), y: p.y }));
  return { train, val, farms, leaky, g };
}
const SETS = makeSets();

export default {
  slug: 'image-classification',
  title: 'Image classification: sorting maize leaves',
  description: 'Photo cards of maize leaves leave a hopper one at a time, the classifier shows three confidence bars, and each card drops into a bin. Then read the confusion.',
  overview: 'An image classifier turns a photo into a confidence for each class and picks the highest. Training it well takes more than a network: the photos are augmented (flipped, cropped, recoloured) so it learns the disease rather than the exact pictures, every image is normalised the same way for training and testing, and the photos are split so the same plant never appears on both sides. Accuracy alone hides which classes get confused; the confusion matrix shows it.',
  keywords: ['image classification', 'data augmentation', 'confusion matrix', 'image normalization', 'train validation leakage'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.0, 0.8, -0.1], dir: [0.12, 0.6, 1.3], half: 1.75, wide: 7.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { aug: true, norm: true, leak: false, set: 'val', clock: 0 };
    const ink = '#151827';
    /* ---------- the classifier ---------- */
    let train = [];
    function fit() {
      train = SETS.train.slice();
      if (st.aug) { let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; train = []; SETS.train.forEach(p => { train.push({ f: [p.f[0], p.f[1], r()], y: p.y }); for (let k = 0; k < 8; k++) train.push({ f: [p.f[0] + (r() - 0.5) * 0.06, p.f[1] + (r() - 0.5) * 0.06, r()], y: p.y }); }); }
    }
    const SIG = 0.06;
    const scores = f => { const sc = [0, 0, 0]; train.forEach(p => { sc[p.y] += Math.exp(-((p.f[0] - f[0]) ** 2 + (p.f[1] - f[1]) ** 2 + (p.f[2] - f[2]) ** 2) / (2 * SIG * SIG)); }); const t = sc[0] + sc[1] + sc[2]; return t > 1e-300 ? sc.map(v => v / t) : [1, 0, 0]; };
    const predict = (f, normed) => { const x = normed ? f : f.map(v => v * 255); const p = scores(x); return { p, y: p.indexOf(Math.max(...p)) }; };
    const evalSet = (D, normed) => { const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let ok = 0; const preds = D.map(d => { const r = predict(d.f, normed); M[d.y][r.y]++; if (r.y === d.y) ok++; return r; }); return { M, acc: ok / D.length, preds }; };
    /* ---------- hopper, classifier, bins ---------- */
    const HX = -3.0, hop = P.box(0.7, 0.55, 0.7, C.teal, { r: 0.06 }); hop.position.set(HX, 0.12, 0.45); floor.add(hop);



    const belt = P.box(2.6, 0.05, 0.4, '#5B6178', { r: 0.03 }); belt.position.set(-1.6, 0.12, 0.45); floor.add(belt);
    const KX = -1.25, cls = P.box(0.9, 0.7, 0.7, C.indigo, { r: 0.08 }); cls.position.set(KX, 0.17, 0.45); floor.add(cls);


    const bars = CLS.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: c.c }); const b = P.box(0.16, 1, 0.08, c.c, { r: 0.02, material: m }); b.position.set(KX - 0.25 + i * 0.25, 0.88, 0.45); b.userData.noFit = true; floor.add(b); return b; });
    const barT = CLS.map((c, i) => {    return t; });
    const card = P.box(0.28, 0.03, 0.2, '#FFFFFF', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#FFFFFF' }) }); card.userData.noFit = true; floor.add(card);
    const BX = [0.1, 0.9, 1.7];
    const bins = CLS.map((c, i) => {
      const b = P.box(0.62, 0.12, 0.62, '#F7F5EE', { r: 0.05 }); b.position.set(BX[i], 0.12, 0.45); floor.add(b);
      const stack = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.022, 0.18), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 60); stack.count = 0; stack.userData.noFit = true; stack.frustumCulled = false; floor.add(stack);
      return { b, stack, n: 0 };
    });

    /* ---------- the wall ---------- */
    const WX = 0.6, WZ = -0.75, WW = 5.2, WH = 1.75;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); floor.add(wall);

    const GZ = WZ + 0.05, MX0 = WX - 2.15, MY0 = 0.12 + 0.3, CS = 0.36;

    const cells = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const m = new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), c = new THREE.Mesh(new THREE.PlaneGeometry(CS * 0.94, CS * 0.94), m);
      c.position.set(MX0 + 0.45 + b * CS, MY0 + (2 - a) * CS + CS / 2, GZ); c.layers.set(1); c.userData.noFit = true; floor.add(c); cells.push(m);
    }
    CLS.forEach((c, i) => {       });
    const AX0 = WX + 0.3, AW = 1.9;

    const accBars = ['training photos', 'validation photos', 'new farms'].map((n, i) => {
      const y = 0.12 + 1.15 - i * 0.36;
      const bg = P.box(AW, 0.13, 0.015, '#E6E1D6', { r: 0 }); bg.position.set(AX0 + AW / 2, y - 0.065, GZ - 0.005); bg.userData.noFit = true; bg.layers.set(1); floor.add(bg);
      const m = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(1, 0.13, 0.02, C.teal, { r: 0, material: m }); b.userData.noFit = true; b.layers.set(1); floor.add(b);
      return { b, m, y };
    });
    /* ---------- run ---------- */
    let E = null;
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    function evaluate() {
      fit();
      const valSet = st.leak ? SETS.leaky : SETS.val;
      E = { tr: evalSet(SETS.train, true), val: evalSet(valSet, st.norm), farms: evalSet(SETS.farms, st.norm), valSet };
      E.show = st.set === 'val' ? E.val : E.farms; E.showSet = st.set === 'val' ? valSet : SETS.farms;
      const mx = Math.max(...E.show.M.flat(), 1);
      E.show.M.forEach((row, a) => row.forEach((v, b) => { cells[a * 3 + b].color.set(a === b ? '#3E9B5F' : '#D9483B').lerp(new THREE.Color('#FFFFFF'), 1 - Math.min(1, v / mx) * 0.85); }));
      [E.tr.acc, E.val.acc, E.farms.acc].forEach((a, i) => { const B = accBars[i], w = Math.max(0.01, a * AW); B.b.scale.x = w; B.b.position.set(AX0 + w / 2, B.y - 0.065, GZ); B.m.color.set(a > 0.85 ? C.teal : a > 0.6 ? C.gold : C.red);  });
      st.idx = 0; bins.forEach(b => { b.n = 0; b.stack.count = 0; });
      { for (let k = 0; k < E.showSet.length; k++) drop(k); st.idx = E.showSet.length; st.hold = 0; }
    }
    function drop(i) {
      const d = E.showSet[i], r = E.show.preds[i], bin = bins[r.y];
      if (bin.n < 60) { dummy.position.set(BX[r.y] + ((bin.n * 37) % 5 - 2) * 0.02, 0.25 + bin.n * 0.024, 0.45); dummy.rotation.set(0, ((bin.n * 13) % 7 - 3) * 0.06, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); bin.stack.setMatrixAt(bin.n, dummy.matrix); bin.stack.setColorAt(bin.n, col.set(CLS[d.y].c)); bin.n++; bin.stack.count = bin.n; bin.stack.instanceMatrix.needsUpdate = true; bin.stack.instanceColor.needsUpdate = true; }
    }
    function update(dt) {
      const per = S.reduced ? 0.08 : 0.5;
      st.clock += dt;
      // the bins stay full; the flying card replays the photos one after another
      while (st.clock > per) { st.clock -= per; st.cur = ((st.cur || 0) + 1) % E.showSet.length; }
      const i = st.cur || 0, d = E.showSet[i], r = E.show.preds[i], u = st.clock / per;
      const pts = [V(HX, 0.75, 0.45), V(KX, 0.95, 0.45), V(BX[r.y], 0.9, 0.45)];
      const k = u < 0.5 ? 0 : 1, f = u < 0.5 ? u * 2 : (u - 0.5) * 2;
      card.position.copy(pts[k]).lerp(pts[k + 1], f); card.position.y += Math.sin(f * Math.PI) * 0.25; card.visible = true;
      card.material.color.set(CLS[d.y].c);
      bars.forEach((b, j) => { b.scale.y = 0.02 + r.p[j] * 0.5; });
    }
    evaluate();
    const controls = [
      { type: 'toggle', label: 'Augment training photos (flip, crop, recolour)', short: 'augment', get: () => st.aug, set: v => { st.aug = v; evaluate(); } },
      { type: 'toggle', label: 'Normalise test photos like training', short: 'normalise', get: () => st.norm, set: v => { st.norm = v; evaluate(); } },
      { type: 'toggle', label: 'Split by plant (no plant on both sides)', short: 'split by plant', get: () => !st.leak, set: v => { st.leak = !v; evaluate(); } },
      { type: 'buttons', label: 'Bins and matrix show', options: ['Validation', 'New farms'], get: () => (st.set === 'val' ? 0 : 1), act: i => { st.set = i ? 'farms' : 'val'; evaluate(); } },
    ];
    const pct = a => `${Math.round(a * 100)}%`;
    const readouts = [
      { label: 'Training', get: () => ({ v: pct(E.tr.acc), sub: 'photos it learned from' }) },
      { label: 'Validation', get: () => ({ v: pct(E.val.acc), sub: st.leak ? 'same plants as training!' : 'held-out photos', good: E.val.acc > 0.85 && !st.leak, bad: E.val.acc < 0.7 || st.leak }) },
      { label: 'New farms', get: () => ({ v: pct(E.farms.acc), sub: 'the real test', good: E.farms.acc > 0.8, bad: E.farms.acc < 0.7 }) },
    ];
    const labels = [
      { name: 'hopper', t: 'Photos in', d: 'One card at a time', icon: 'eye', atV: V(HX - 0.35, 0.4, 0.45) },
      { name: 'classifier', t: 'Classifier', d: 'Bars: confidence for each class', icon: 'scale', atV: V(HX - 0.35, 0.9, 0.45) },
      { name: 'bins', t: 'Bins', d: 'A wrong colour is a mistake', icon: 'box', atV: V(BX[2] + 0.4, 0.3, 0.45) },
      { name: 'wall', t: 'Scoreboard', d: 'Where the mistakes go', icon: 'check', atV: V(WX + WW / 2, 0.12 + WH * 0.6, WZ) },
    ];
    const reset = () => { Object.assign(st, { aug: true, norm: true, leak: false, set: 'val' }); evaluate(); };
    const breaks = [
      { label: 'No augmentation', hint: 'Only the 30 original photos', on: () => { reset(); st.aug = false; evaluate(); }, off: reset },
      { label: 'Test photos not normalised', hint: 'Training saw 0 to 1, testing gets 0 to 255', on: () => { reset(); st.norm = false; evaluate(); }, off: reset },
      { label: 'Same plants on both sides', hint: 'Split by photo, and no augmentation', on: () => { reset(); st.leak = true; st.aug = false; evaluate(); }, off: reset },
    ];
    function status() {
      const tr = E.tr.acc, va = E.val.acc, fa = E.farms.acc;
      if (!st.norm) return { ok: false, msg: `<b>Everything is "healthy".</b> Training photos were scaled to 0 to 1, but the test photos arrive as 0 to 255, so every one lands far outside anything the classifier has seen and it falls back on one answer: ${pct(va)} on validation. Apply exactly the same preprocessing at test time.` };
      if (st.leak) return { ok: false, msg: `<b>Too good to be true.</b> Validation scores ${pct(va)} because its photos are of the same plants as training, just shot again. On new farms the classifier manages ${pct(fa)}.${st.aug ? '' : ' The leaky split hid that it had memorised the photos.'} Split by plant or by farm, never by photo.` };
      if (!st.aug) return { ok: false, msg: `<b>Memorised the photos.</b> With only 30 training photos and no augmentation it scores ${pct(tr)} on them but ${pct(va)} on validation: it learned those exact pictures, including the accident that its rust photos were all taken in bright sun. Colour changes, flips and crops show each leaf many ways, so only the disease is left to learn.` };
      return { ok: true, msg: `<b>Sorting well.</b> ${pct(tr)} on training, ${pct(va)} on validation and ${pct(fa)} on new farms, close together, so it has learned the diseases rather than the photos. The matrix shows where the remaining mistakes are.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); evaluate(); } };
  },

  story: [
    { t: 'Sorting leaves', home: true, say: 'Photos of maize leaves from farms in western Kenya: healthy, rust or blight. The classifier gives each class a confidence, and the card drops into the bin it chose.', act: m => m.set({ aug: true, norm: true, leak: false, set: 'val' }), wait: 3 },
    { t: 'Reading the bins', home: true, say: 'Each card keeps the colour of its true class. A grey card in the rust bin is blight mistaken for rust. The confusion matrix counts every such mix-up.', act: m => m.set({}), wait: 3 },
    { t: 'No augmentation', home: true, say: 'Train on the thirty photos as they are, and it scores well on them but poorly on new ones. Flipping, cropping and recolouring each photo teaches the disease, not the picture.', act: m => m.set({ aug: false }), wait: 3 },
    { t: 'Same preprocessing', home: true, say: 'Forget to scale the test photos the way training photos were scaled, and every one looks strange to the classifier. It calls them all healthy.', act: m => m.set({ aug: true, norm: false }), wait: 3 },
    { t: 'A leaky split', home: true, say: 'Split by photo, and the same plant can sit in training and validation. Now even the classifier that memorised its photos looks wonderful on validation. New farms tell the truth.', act: m => m.set({ norm: true, leak: true, aug: false }), wait: 3 },
    { t: 'The honest test', home: true, say: 'Split by plant, augment, preprocess the same way, and check on new farms. When the three scores sit close together, the classifier has really learned.', act: m => m.set({ leak: false, aug: true, set: 'farms' }), wait: 3 },
  ],
  check: [
    { q: 'Why augment training photos?', options: ['So the model learns the disease, not the exact pictures', 'To make training faster', 'To shrink the photos'], answer: 0, why: 'Seeing each leaf flipped, cropped and recoloured stops it memorising.' },
    { q: 'What went wrong when every photo came out "healthy"?', options: ['Test photos were not preprocessed like the training photos', 'There were too many classes', 'The model had too many layers'], answer: 0, why: 'Inputs on a different scale look like nothing the model has seen.' },
    { q: 'Why split by plant rather than by photo?', options: ['Photos of the same plant on both sides make validation look better than it is', 'It makes the training set bigger', 'Plants cannot be photographed twice'], answer: 0, why: 'The model is being tested on what it has effectively already seen.' },
  ],
  terms: [
    ['Classifier', 'A model that assigns each input to one of several classes.'],
    ['Softmax', 'Turns a model\'s scores into confidences that add up to 1.'],
    ['Data augmentation', 'Making varied copies of training images by flipping, cropping or recolouring.'],
    ['Confusion matrix', 'A table counting each true class against each predicted class.'],
    ['Normalisation', 'Scaling inputs to a standard range, the same way every time.'],
    ['Leakage', 'Information from the test set slipping into training.'],
  ],
  deeper: '<p><b>Top-1 and top-5.</b> With many classes, papers report whether the right answer was the top guess (top-1) or among the top five.</p><p><b>Normalising with the training statistics.</b> Many pipelines subtract the training set\'s mean colour and divide by its spread. Those exact numbers must travel with the model and be used at test time.</p><p><b>About this machine.</b> Each photo is summarised by three features (orange rust, grey lesions and brightness), and the classifier compares them with its training photos; the pipeline mistakes behave the same way as with a full network.</p>',
  code: {
    title: 'Augmentation and matching preprocessing',
    note: 'Adapted from the course\'s image classification lesson.',
    text: `
from torchvision import transforms

MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.3, 0.3, 0.3),
    transforms.ToTensor(),                 # 0..255 -> 0..1
    transforms.Normalize(MEAN, STD),
])

test_tf = transforms.Compose([              # same scaling, no randomness
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])

# split by plant id, not by photo
train_ids, val_ids = split(unique(plant_ids), 0.8)
`,
  },
};
