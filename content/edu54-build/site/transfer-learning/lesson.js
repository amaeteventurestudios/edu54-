// Transfer learning: a tower of five backbone layers already trained on a million general photos (edges at the bottom, whole objects at the top).
// Its old head (1,000 everyday classes) is lifted off and set aside; a new head for three cattle breeds of East Africa sits on top.
// Gold rings lock frozen layers. Layers turn red when a big learning rate scrambles what they knew. The photo pile on the left is the new data.
// Break it: start from random weights with 40 photos (it memorises), unfreeze everything with a big learning rate (it forgets), freeze the new head too (nothing learns).
const NAMES = ['edges', 'textures', 'patterns', 'parts', 'objects'];

function score(o) {
  const n = o.photos, logn = Math.log10(n);
  let val, train = 1;
  if (o.head) return { val: 1 / 3, train: 1 / 3, damage: 0 };
  if (!o.pre) { val = 0.36 + 0.55 * (1 - Math.exp(-n / 2500)); return { val, train: 0.99, damage: 0 }; }
  const probe = 0.82 + 0.05 * Math.min(1, (logn - 1.6) / 2);
  const bestK = Math.max(0, Math.min(5, Math.round((logn - 1.6) * 2.2)));
  const tune = o.unfreeze <= bestK ? 0.025 * o.unfreeze : 0.025 * bestK - 0.03 * (o.unfreeze - bestK);
  const damage = o.lr === 'big' ? Math.min(1, 0.22 * o.unfreeze) : 0;
  val = Math.max(0.34, Math.min(0.97, probe + tune - damage * 0.42));
  train = Math.min(1, val + 0.04 + 0.02 * o.unfreeze + (o.lr === 'big' ? 0.05 : 0));
  return { val, train, damage };
}

export default {
  slug: 'transfer-learning',
  title: 'Transfer learning: borrow what a model knows',
  description: 'A tower of layers already trained on a million everyday photos gets a new head for three cattle breeds: Ankole, Boran and Friesian, from just 40 photos. Lock the lower layers, unlock the top ones, and compare with starting from nothing. Then unfreeze everything with a big learning rate and watch it forget.',
  overview: 'Training a vision model from scratch needs huge amounts of data. But the lower layers of any trained network learn general things, edges, textures and simple shapes, that are useful for almost any picture. Transfer learning takes such a network, removes its old final layer, adds a new one for your classes, and trains mostly that. With little data you freeze the backbone and train only the head; with more data you also unfreeze the top layers and fine-tune them gently with a small learning rate. Too big a rate wipes out what the backbone knew.',
  keywords: ['transfer learning', 'fine-tuning pretrained model', 'freeze layers', 'catastrophic forgetting', 'small dataset computer vision'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.05, 0], dir: [0.25, 0.5, 1.3], half: 1.6, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { pre: true, unfreeze: 0, lr: 'small', photos: 40, head: false };
    const ink = '#151827';
    const base = P.box(5.6, 0.12, 2.5, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    /* ---------- the tower ---------- */
    const TX = 0.0, LH = 0.34, GAP = 0.06, Y0 = 0.12;
    const layers = NAMES.map((n, i) => {
      const m = new THREE.MeshLambertMaterial({ color: C.indigo }), b = P.box(1.3, LH, 0.9, C.indigo, { r: 0.06, material: m });
      const y = Y0 + i * (LH + GAP); b.position.set(TX, y, 0); S.add(b);
      const t = S.text(`layer ${i + 1}: ${n}`, { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(TX, y + LH / 2, 0.455); S.add(t);
      const lock = P.tube([...Array(33)].map((_, k) => V(Math.cos(k / 32 * 6.2832) * 0.78, 0, Math.sin(k / 32 * 6.2832) * 0.56)), 0.022, C.gold); lock.position.set(TX, y + LH / 2, 0); lock.userData.noFit = true; S.add(lock);
      return { b, m, t, lock, y };
    });
    const topY = Y0 + 5 * (LH + GAP);
    const headM = new THREE.MeshLambertMaterial({ color: '#2E7A45' }), head = P.box(1.0, 0.36, 0.7, '#2E7A45', { r: 0.06, material: headM }); head.position.set(TX, topY, 0); S.add(head);
    const headT = S.text('new head: 3 breeds', { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); headT.position.set(TX, topY + 0.18, 0.355); S.add(headT);
    const headTop = S.text('Ankole · Boran · Friesian', { size: 0.06, weight: 800, color: '#FFFFFF', maxW: 0.95 }); headTop.position.set(TX, topY + 0.365, 0); S.add(headTop);
    const headLock = P.tube([...Array(33)].map((_, k) => V(Math.cos(k / 32 * 6.2832) * 0.62, 0, Math.sin(k / 32 * 6.2832) * 0.46)), 0.022, C.gold); headLock.position.set(TX, topY + 0.18, 0); headLock.userData.noFit = true; S.add(headLock);
    const old = P.box(1.0, 0.36, 0.7, '#8E91A3', { r: 0.06 }); old.position.set(TX - 1.05, 0.12, -0.75); old.rotation.y = 0.25; S.add(old);
    const oldT = S.text('old head: 1,000 classes', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); oldT.position.set(0, 0.18, 0.355); old.add(oldT);
    const oldTop = S.text('set aside', { size: 0.07, weight: 800, color: '#FFFFFF' }); oldTop.position.set(0, 0.365, 0); old.add(oldTop);
    /* ---------- photo pile ---------- */
    const PX = -1.85, pile = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 120);
    pile.userData.noFit = true; pile.frustumCulled = false; S.add(pile);
    const tray = P.box(0.7, 0.06, 0.55, '#5B6178', { r: 0.04 }); tray.position.set(PX, 0.12, 0.1); S.add(tray);
    const trayT = S.text('', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); trayT.position.set(PX, 0.15, 0.38); S.add(trayT);
    const pileTop = S.text('new photos', { size: 0.075, weight: 800 }); pileTop.position.set(PX, 0.12, 0.62); S.add(pileTop);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the scoreboard ---------- */
    const WX = 1.75, WZ = 0.1, WW = 1.5, WH = 1.6;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); S.add(wall);
    const wT = S.text('accuracy', { size: 0.1, weight: 800, face: 'front', color: ink }); wT.position.set(WX, 0.12 + WH - 0.15, WZ + 0.045); S.add(wT);
    const wTop = S.text('results', { size: 0.07, weight: 800 }); wTop.position.set(WX, 0.12 + WH + 0.005, WZ); S.add(wTop);
    const cols = ['training', 'new photos'].map((n, i) => {
      const x = WX - 0.32 + i * 0.64, m = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(0.36, 1, 0.04, C.teal, { r: 0.02, material: m }); b.position.set(x, 0.12 + 0.28, WZ + 0.06); b.userData.noFit = true; S.add(b);
      const t = S.text(n, { size: 0.065, weight: 800, face: 'front', color: ink }); t.position.set(x, 0.12 + 0.17, WZ + 0.06); S.add(t);
      const v = S.text('', { size: 0.09, weight: 800, face: 'front', color: ink }); v.userData.noFit = true; S.add(v);
      return { b, m, v, x };
    });
    const chance = P.box(WW - 0.2, 0.012, 0.01, C.red, { r: 0 }); chance.position.set(WX, 0.12 + 0.28 + 0.9 / 3, WZ + 0.05); S.add(chance);
    const chanceT = S.text('guessing', { size: 0.055, weight: 800, face: 'front', color: '#B23A2E' }); chanceT.position.set(WX + 0.52, 0.12 + 0.28 + 0.9 / 3 + 0.05, WZ + 0.06); S.add(chanceT);
    /* ---------- draw ---------- */
    let R = null;
    function draw() {
      R = score(st);
      layers.forEach((L, i) => {
        const frozen = i < 5 - st.unfreeze;
        L.lock.visible = frozen && st.pre;
        const base = st.pre ? new THREE.Color(C.indigo) : new THREE.Color('#9A9AA6');
        L.m.color.copy(base).lerp(new THREE.Color(C.red), frozen ? 0 : R.damage);
        L.t.userData.set(st.pre ? `layer ${i + 1}: ${NAMES[i]}` : `layer ${i + 1}: random`);
      });
      headLock.visible = st.head; headM.color.set(st.head ? '#7C8C80' : '#2E7A45');
      const n = Math.min(120, Math.round(Math.log10(st.photos) * 30));
      pile.count = n;
      for (let k = 0; k < n; k++) { dummy.position.set(PX + ((k * 37) % 7 - 3) * 0.008, 0.16 + k * 0.013, 0.1 + ((k * 17) % 5 - 2) * 0.008); dummy.rotation.set(0, ((k * 29) % 9 - 4) * 0.05, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pile.setMatrixAt(k, dummy.matrix); pile.setColorAt(k, col.set(['#C9774A', '#E8D9B5', '#3B3F8F'][k % 3])); }
      pile.instanceMatrix.needsUpdate = true; if (pile.instanceColor) pile.instanceColor.needsUpdate = true;
      trayT.userData.set(`${st.photos.toLocaleString()} photos`);
      [R.train, R.val].forEach((a, i) => { const c = cols[i], h = Math.max(0.01, a * 0.9); c.b.scale.y = h; c.m.color.set(a > 0.85 ? C.teal : a > 0.6 ? C.gold : C.red); c.v.userData.set(`${Math.round(a * 100)}%`); c.v.position.set(c.x, 0.12 + 0.28 + h + 0.08, WZ + 0.06); });
    }
    draw();
    const pct = a => `${Math.round(a * 100)}%`;
    const controls = [
      { type: 'buttons', label: 'Start from', options: ['Pretrained', 'Random'], get: () => (st.pre ? 0 : 1), act: i => { st.pre = !i; if (!st.pre) st.unfreeze = 5; draw(); } },
      { type: 'slider', label: 'Layers unfrozen (from the top)', min: 0, max: 5, step: 1, get: () => st.unfreeze, set: v => { st.unfreeze = Math.round(v); draw(); } },
      { type: 'buttons', label: 'Learning rate for unfrozen layers', options: ['Small', 'Big'], get: () => (st.lr === 'small' ? 0 : 1), act: i => { st.lr = i ? 'big' : 'small'; draw(); } },
      { type: 'slider', label: 'New photos', min: 40, max: 10000, log: true, get: () => st.photos, set: v => { st.photos = Math.round(v); draw(); }, fmt: v => Math.round(v).toLocaleString() },
    ];
    const readouts = [
      { label: 'New photos', get: () => ({ v: pct(R.val), sub: 'accuracy on unseen cattle', good: R.val >= 0.8, bad: R.val < 0.6 }) },
      { label: 'Training', get: () => ({ v: pct(R.train), sub: 'on its own photos' }) },
      { label: 'Trainable layers', get: () => ({ v: st.head ? '0' : String((st.pre ? st.unfreeze : 5) + 1), sub: 'of 6, head included' }) },
    ];
    const labels = [
      { name: 'tower', t: 'Pretrained backbone', d: 'General at the bottom, specific at the top', icon: 'box', atV: V(TX - 0.65, Y0 + 2 * (LH + GAP) + LH / 2, 0) },
      { name: 'locks', t: 'Frozen layers', d: 'Gold rings: weights locked', icon: 'eye', atV: V(TX - 0.65, Y0 + 0.5 * (LH + GAP), 0), hide: () => !st.pre || st.unfreeze === 5 },
      { name: 'head', t: 'The new head', d: 'Three breeds instead of 1,000 classes', icon: 'target', atV: V(TX + 0.5, topY + 0.18, 0) },
      { name: 'board', t: 'Accuracy', d: 'Red line: guessing', icon: 'check', atV: V(WX + WW / 2, 0.12 + WH * 0.6, WZ) },
    ];
    const reset = () => { Object.assign(st, { pre: true, unfreeze: 0, lr: 'small', photos: 40, head: false }); draw(); };
    const breaks = [
      { label: 'Start from random weights', hint: 'Only 40 photos', on: () => { reset(); st.pre = false; st.unfreeze = 5; draw(); }, off: reset },
      { label: 'Unfreeze all, big rate', hint: 'Every layer, learning rate 100× too big', on: () => { reset(); st.unfreeze = 5; st.lr = 'big'; draw(); }, off: reset },
      { label: 'Freeze the head too', hint: 'Nothing is left to train', on: () => { reset(); st.head = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.head) return { ok: false, msg: `<b>Nothing learns.</b> The new head starts with random weights, and it is frozen along with the backbone, so no weight in the model can change. It picks breeds at random: ${pct(R.val)}. The head must always train.` };
      if (!st.pre && R.val >= 0.8) return { ok: true, msg: `<b>From scratch, with plenty of data.</b> With ${st.photos.toLocaleString()} photos even random weights learn to see: ${pct(R.val)} on new cattle. A pretrained backbone gets there with a fraction of the photos and the training time.` };
      if (!st.pre) return { ok: false, msg: `<b>Starting from nothing.</b> With random weights, every layer has to learn edges, textures and shapes from just ${st.photos.toLocaleString()} photos. It memorises them (${pct(R.train)} on training) but manages ${pct(R.val)} on new cattle. A pretrained backbone already knows how to see.` };
      if (st.lr === 'big' && st.unfreeze > 0 && R.damage > 0.3) return { ok: false, msg: `<b>It forgot how to see.</b> A big learning rate on ${st.unfreeze} unfrozen layer${st.unfreeze > 1 ? 's' : ''} rewrites what they learned from a million photos to fit ${st.photos.toLocaleString()} new ones: the red layers. New-photo accuracy falls to ${pct(R.val)}. Fine-tune with a learning rate 10 to 100 times smaller than for the head.` };
      if (R.val < 0.8) return { ok: false, msg: `<b>Too much to fine-tune.</b> ${st.unfreeze} unfrozen layer${st.unfreeze > 1 ? 's is' : ' is'} a lot of weights for ${st.photos.toLocaleString()} photos, so they start to memorise: ${pct(R.val)} on new cattle. Unfreeze fewer layers, or gather more photos.` };
      return { ok: true, msg: `<b>Borrowed sight.</b> The backbone already knew edges, textures and shapes from a million photos; training ${st.unfreeze === 0 ? 'just the new head' : `the head and the top ${st.unfreeze} layer${st.unfreeze > 1 ? 's' : ''}`} on ${st.photos.toLocaleString()} cattle photos reaches ${pct(R.val)} on new ones.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A backbone that can see', home: true, say: 'This tower was trained on a million everyday photos. Its lower layers learned edges and textures, its upper layers whole objects, and its old head named a thousand everyday things.', act: m => m.set({ pre: true, unfreeze: 0, lr: 'small', photos: 40, head: false }) },
    { t: 'A new head', home: true, say: 'We lift the old head off and add a new one for three cattle breeds: Ankole, Boran and Friesian. With only forty photos, we lock the whole backbone and train just the head.', act: m => m.set({ unfreeze: 0 }) },
    { t: 'From nothing', home: true, say: 'Compare starting from random weights. Every layer has to learn to see from forty photos. It memorises them, and fails on new cattle.', act: m => m.set({ pre: false, unfreeze: 5 }) },
    { t: 'More photos, more layers', home: true, say: 'With thousands of photos, unlock the top layers too and fine-tune them gently. They adjust from everyday objects to the shapes of horns and humps.', act: m => m.set({ pre: true, unfreeze: 3, photos: 5000 }) },
    { t: 'Forgetting', home: true, say: 'Unlock everything with a big learning rate, and the layers are rewritten to fit the small new set. Everything they knew is scrambled.', act: m => m.set({ unfreeze: 5, lr: 'big', photos: 40 }) },
    { t: 'The recipe', home: true, say: 'Pretrained backbone, new head, freeze what you cannot afford to train, and fine-tune the rest with a small learning rate.', act: m => m.set({ unfreeze: 0, lr: 'small', photos: 40 }) },
  ],
  check: [
    { q: 'Why does a pretrained backbone help with only 40 photos?', options: ['Its layers already detect general features like edges and textures', 'It has seen these exact cattle before', 'It needs no training at all'], answer: 0, why: 'Only the last steps, from features to breeds, must be learned.' },
    { q: 'What should you do with very little data?', options: ['Freeze the backbone and train only the new head', 'Unfreeze every layer with a big learning rate', 'Train from random weights'], answer: 0, why: 'Few trainable weights means less memorising.' },
    { q: 'What happens with a big learning rate on unfrozen pretrained layers?', options: ['Their learned features get overwritten: catastrophic forgetting', 'Training gets more accurate', 'The head is removed'], answer: 0, why: 'Fine-tuning needs gentle steps to keep what the backbone knew.' },
  ],
  terms: [
    ['Transfer learning', 'Reusing a model trained on one task as the starting point for another.'],
    ['Backbone', 'The main body of layers that turns an image into features.'],
    ['Head', 'The final layer that turns features into the answer.'],
    ['Freezing', 'Locking layers so their weights do not change during training.'],
    ['Fine-tuning', 'Gently training some pretrained layers on new data.'],
    ['Catastrophic forgetting', 'Losing what a model knew when new training overwrites it.'],
  ],
  deeper: '<p><b>Different rates for different layers.</b> A common trick gives the head the full learning rate and each layer below a smaller one, so the most general features change least.</p><p><b>Linear probing</b> means freezing everything and training only the head. It is also how researchers measure how good a backbone\'s features are.</p><p><b>About this machine.</b> The accuracies here are an illustration of the typical pattern, not measurements from a real run.</p>',
  code: {
    title: 'Freeze, replace the head, fine-tune gently',
    note: 'Adapted from the course\'s transfer learning lesson.',
    text: `
import torch, torchvision

model = torchvision.models.resnet18(weights="IMAGENET1K_V1")
for p in model.parameters():
    p.requires_grad = False                    # freeze the backbone

model.fc = torch.nn.Linear(model.fc.in_features, 3)   # new head: 3 breeds

for p in model.layer4.parameters():            # unfreeze the top block
    p.requires_grad = True

opt = torch.optim.Adam([
    {"params": model.fc.parameters(), "lr": 1e-3},
    {"params": model.layer4.parameters(), "lr": 1e-5},   # much gentler
])
`,
  },
};
