// Self-supervised vision: 60 unlabelled photos from a market in Addis Ababa (coffee, injera, baskets, spices), each shown twice through random crops and colour changes.
// Every view is a dot on a ring (the embedding space, seen from above). Contrastive training pulls the two views of a photo together and pushes every other photo away.
// Afterwards a linear probe, trained on only 20 labels, tests whether the kinds have separated.
// Break it: no augmentation (both views identical: the task is trivial and nothing useful is learned), a tiny batch (too few photos to push against),
// no negatives at all (everything collapses to one point).
const N = 60, K = 4, KINDS = [{ n: 'coffee', c: '#4E2E1C' }, { n: 'injera', c: '#E3B94F' }, { n: 'baskets', c: '#1C9A94' }, { n: 'spices', c: '#D9483B' }];

function simulate(o, steps) {
  let s = 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  const kind = [...Array(N)].map((_, i) => i % K);
  // each photo has a true "kind" direction plus nuisance (lighting, framing) that a bad model latches onto
  const nuis = [...Array(N)].map(() => r() * Math.PI * 2);
  const learn = Math.min(1, steps / 400);
  const kindW = o.aug ? learn * (o.neg ? (o.batch >= 64 ? 1 : 0.45) : 0) : 0.08 * learn;
  const nuisW = o.aug ? 1 - kindW * 0.25 : 1;
  const spread = o.neg ? 1 : Math.max(0.02, 1 - learn * 0.98);
  const views = [];
  for (let i = 0; i < N; i++) {
    const a = Math.atan2(kindW * Math.sin(kind[i] * Math.PI / 2 + 0.4) + nuisW * 0.7 * Math.sin(nuis[i]), kindW * Math.cos(kind[i] * Math.PI / 2 + 0.4) + nuisW * 0.7 * Math.cos(nuis[i]));
    for (let v = 0; v < 2; v++) {
      const jitter = o.aug ? (1 - learn * 0.85) * 0.5 * g() : 0;
      const ang = (a + jitter) * spread + (1 - spread) * 0.6;
      views.push({ i, v, kind: kind[i], ang, rad: 0.9 + 0.1 * spread * g() * 0.3 });
    }
  }
  // linear probe on 20 labels: nearest kind-centre in angle space
  const centre = [...Array(K)].map((_, k) => { let x = 0, y = 0; views.filter(w => w.kind === k && w.i < 20).forEach(w => { x += Math.cos(w.ang); y += Math.sin(w.ang); }); return Math.atan2(y, x); });
  let ok = 0;
  views.filter(w => w.i >= 20 && w.v === 0).forEach(w => { let best = 0, bd = 9; centre.forEach((c, k) => { const d = Math.abs(Math.atan2(Math.sin(w.ang - c), Math.cos(w.ang - c))); if (d < bd) { bd = d; best = k; } }); if (best === w.kind) ok++; });
  const probe = spread < 0.1 ? 0.25 : ok / (N - 20);
  let pd = 0; for (let i = 0; i < N; i++) { const a = views[2 * i].ang, b = views[2 * i + 1].ang; pd += Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
  return { views, probe, pairGap: pd / N, spread };
}

export default {
  slug: 'self-supervised-vision',
  title: 'Self-supervised vision: learning without labels',
  description: 'Sixty unlabelled photos from a market in Addis Ababa, each seen twice through random crops and colour changes.',
  overview: 'Labelling photos is slow and costly, but unlabelled photos are everywhere. Self-supervised learning invents a task from the photos themselves. In contrastive learning, each photo is changed twice at random (cropped, flipped, recoloured) and the network is trained so the two views land close together while views of other photos land far apart. To do that it must learn what stays the same under those changes: the object, not the lighting. Other methods hide parts of the image and learn to fill them in. The test is a linear probe: freeze the network and see how well a simple classifier does with only a few labels.',
  keywords: ['self supervised learning', 'contrastive learning simclr', 'infonce loss', 'linear probe', 'representation collapse'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.55, 0], dir: [0.2, 1.1, 1.0], half: 1.75, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { aug: true, batch: 256, neg: true, steps: 400 };
    const ink = '#151827';
    /* ---------- the embedding dish ---------- */
    const DX = -0.6, DR = 1.25, dish = P.cyl(DR + 0.1, 0.06, '#FBF8F1', { seg: 64 }); dish.position.set(DX, 0.12, 0); floor.add(dish);
    const ring = P.tube([...Array(65)].map((_, k) => V(DX + Math.cos(k / 64 * 6.283) * DR * 0.9, 0.19, Math.sin(k / 64 * 6.283) * DR * 0.9)), 0.006, '#B7B2A6'); ring.userData.noFit = true; floor.add(ring);

    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 2 * N);
    dots.userData.noFit = true; dots.frustumCulled = false; floor.add(dots);
    const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), new THREE.MeshBasicMaterial({ color: '#8E91A3' }), N);
    links.userData.noFit = true; links.frustumCulled = false; links.layers.set(1); floor.add(links);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- augmentation bench ---------- */
    const AX = 2.1, photo = P.box(0.42, 0.03, 0.42, '#6B3E26', { r: 0.02 }); photo.position.set(AX, 0.12, -0.6); floor.add(photo);

    const viewA = P.box(0.32, 0.03, 0.32, '#8A5A3B', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#8A5A3B' }) }), viewB = P.box(0.36, 0.03, 0.28, '#4E2E1C', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#4E2E1C' }) });
    viewA.position.set(AX - 0.35, 0.12, 0.15); viewB.position.set(AX + 0.35, 0.12, 0.15); viewB.rotation.y = 0.3; [viewA, viewB].forEach(v => floor.add(v));

    [[AX - 0.35, 0.15], [AX + 0.35, 0.15]].forEach(([x, z]) => { const a = P.tube([V(AX, 0.17, -0.4), V(x, 0.17, z - 0.18)], 0.012, '#8E91A3'); a.userData.noFit = true; floor.add(a); });
    const enc = P.box(1.1, 0.3, 0.45, C.indigo, { r: 0.06 }); enc.position.set(AX, 0.12, 0.85); floor.add(enc);


    const keyTs = KINDS.map((k, i) => { const sw = P.box(0.1, 0.02, 0.1, k.c, { r: 0.02 }); sw.position.set(DX - 1.0 + i * 0.6, 0.12, -DR - 0.3); floor.add(sw);    return t; });
    /* ---------- draw ---------- */
    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = simulate(st, st.steps);
      R.views.forEach((w, q) => { const x = DX + Math.cos(w.ang) * DR * 0.9 * w.rad, z = Math.sin(w.ang) * DR * 0.9 * w.rad; dummy.position.set(x, 0.22, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); dots.setColorAt(q, col.set(KINDS[w.kind].c)); });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
      for (let i = 0; i < N; i++) {
        const a = R.views[2 * i], b = R.views[2 * i + 1], pa = V(DX + Math.cos(a.ang) * DR * 0.9 * a.rad, 0.22, Math.sin(a.ang) * DR * 0.9 * a.rad), pb = V(DX + Math.cos(b.ang) * DR * 0.9 * b.rad, 0.22, Math.sin(b.ang) * DR * 0.9 * b.rad);
        const len = pa.distanceTo(pb); dummy.position.copy(pa).add(pb).multiplyScalar(0.5); dummy.scale.set(1, Math.max(0.001, len), 1); dummy.lookAt(pb); dummy.rotateX(Math.PI / 2); dummy.updateMatrix(); links.setMatrixAt(i, dummy.matrix);
      }
      links.instanceMatrix.needsUpdate = true;
      viewA.material.color.set(st.aug ? '#8A5A3B' : '#6B3E26'); viewB.material.color.set(st.aug ? '#4E2E1C' : '#6B3E26'); viewB.rotation.y = st.aug ? 0.3 : 0;

    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Training steps', min: 0, max: 400, step: 10, get: () => st.steps, set: v => { st.steps = v; draw(); } },
      { type: 'toggle', label: 'Random augmentation', short: 'augment', get: () => st.aug, set: v => { st.aug = v; draw(); } },
      { type: 'buttons', label: 'Batch size (photos to push against)', options: ['8', '256'], get: () => (st.batch === 8 ? 0 : 1), act: i => { st.batch = i ? 256 : 8; draw(); } },
      { type: 'toggle', label: 'Push other photos away (negatives)', short: 'negatives', get: () => st.neg, set: v => { st.neg = v; draw(); } },
    ];
    const readouts = [
      { label: 'Linear probe', get: () => ({ v: pct(R.probe), sub: '20 labels; guessing is 25%', good: R.probe > 0.85, bad: R.probe < 0.5 }) },
      { label: 'Pairs together', get: () => ({ v: R.pairGap < 0.15 ? 'yes' : 'not yet', sub: 'two views of one photo', good: R.pairGap < 0.15 }) },
      { label: 'Spread', get: () => ({ v: R.spread < 0.1 ? 'collapsed' : 'healthy', sub: 'views use the whole space', bad: R.spread < 0.1, good: R.spread >= 0.1 }) },
    ];
    const labels = [
      { name: 'dish', t: 'Embedding space', d: 'Colour: kind of goods (unknown to the model)', icon: 'spark', atV: V(DX - DR, 0.22, 0) },
      { name: 'views', t: 'Two views per photo', d: 'Grey line joins each pair', icon: 'link', atV: V(AX + 0.6, 0.2, 0.15) },
      { name: 'enc', t: 'One encoder', d: 'Both views, same weights', icon: 'box', atV: V(AX + 0.6, 0.25, 0.85) },
    ];
    const reset = () => { Object.assign(st, { aug: true, batch: 256, neg: true, steps: 400 }); draw(); };
    const breaks = [
      { label: 'No augmentation', hint: 'Both views identical', on: () => { reset(); st.aug = false; draw(); }, off: reset },
      { label: 'Batch of 8', hint: 'Only 7 photos to push against', on: () => { reset(); st.batch = 8; draw(); }, off: reset },
      { label: 'No negatives', hint: 'Only pull pairs together', on: () => { reset(); st.neg = false; draw(); }, off: reset },
    ];
    function status() {
      if (R.spread < 0.1) return { ok: false, msg: `<b>Everything collapsed to one point.</b> With nothing pushing photos apart, the easiest way to put each pair together is to put every view in the same place. The loss is perfect and the embedding is useless: the probe can only guess (${pct(R.probe)}). Negatives, or tricks like a slowly updated teacher, prevent collapse.` };
      if (!st.aug) return { ok: false, msg: `<b>A task too easy to teach anything.</b> Both views are the same picture, so matching them needs no understanding at all: the network sorts photos by lighting and framing, not by what is in them. The probe gets ${pct(R.probe)}. Augmentation forces it to ignore what changes and keep what matters.` };
      if (st.batch < 64) return { ok: false, msg: `<b>Too few to push against.</b> With 8 photos per batch, each view is pushed away from only 7 others, usually of other kinds anyway, so similar-looking goods never get separated: probe ${pct(R.probe)}. Contrastive methods like large batches, or a memory of past embeddings.` };
      if (st.steps < 300) return { ok: false, msg: `<b>Still sorting.</b> After ${st.steps} steps the pairs are drawing together but the kinds have not separated yet: probe ${pct(R.probe)}.` };
      return { ok: true, msg: `<b>The kinds sorted themselves.</b> No labels were used in training, yet coffee, injera, baskets and spices now sit in their own regions, because that is what survives cropping and recolouring. A linear probe with only 20 labels gets ${pct(R.probe)}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'No labels', home: true, say: 'Sixty photos from a market in Addis Ababa: coffee, injera, baskets and spices. Nobody has labelled them. The colours are only for us; the model never sees them.', act: m => m.set({ aug: true, batch: 256, neg: true, steps: 0 }) },
    { t: 'Two views', home: true, say: 'Each photo is changed twice at random: cropped, flipped, recoloured. Both views go through the same encoder and land as dots in a space, joined by a grey line.', act: m => m.set({ steps: 0 }) },
    { t: 'Pull and push', home: true, say: 'Training pulls each pair together and pushes every other photo away. To manage that, the encoder must learn what survives the changes: the goods, not the lighting.', act: m => m.set({ steps: 400 }) },
    { t: 'Too easy', home: true, say: 'Turn off the augmentation, and the two views are identical. Matching them is trivial, and the model learns nothing about what is in the photo.', act: m => m.set({ aug: false }) },
    { t: 'Collapse', home: true, say: 'Keep pulling pairs together but stop pushing others away, and every view slides to the same spot. A perfect score, and a useless model.', act: m => m.set({ aug: true, neg: false }) },
    { t: 'The test', home: true, say: 'With everything on, the kinds sort themselves. A simple classifier, trained on just twenty labels, now sorts the rest.', act: m => m.set({ neg: true }) },
  ],
  check: [
    { q: 'What does contrastive learning pull together?', options: ['Two augmented views of the same photo', 'Photos with the same label', 'Every photo in the batch'], answer: 0, why: 'And it pushes views of other photos apart.' },
    { q: 'Why is augmentation essential?', options: ['Without it, matching the two views is trivial and teaches nothing', 'It makes images smaller', 'It adds labels'], answer: 0, why: 'The model must learn what stays the same when the image changes.' },
    { q: 'What is representation collapse?', options: ['Every input mapped to the same point, so the embedding is useless', 'The network running out of memory', 'Labels going missing'], answer: 0, why: 'Pulling without pushing makes collapse the easy answer.' },
  ],
  terms: [
    ['Self-supervised learning', 'Learning from data with a task built from the data itself, no labels.'],
    ['Contrastive learning', 'Pulling matching views together and pushing others apart.'],
    ['Augmentation', 'Random changes such as crops, flips and colour shifts.'],
    ['Negatives', 'Other examples a view is pushed away from.'],
    ['Collapse', 'All inputs ending up with the same embedding.'],
    ['Linear probe', 'A simple classifier trained on frozen features to measure their quality.'],
  ],
  deeper: '<p><b>Other routes.</b> DINO avoids negatives by having a student network match a slowly updated teacher; MAE hides three quarters of the image patches and learns to rebuild them. Both learn strong features without labels.</p><p><b>InfoNCE.</b> The contrastive loss treats each pair as the right answer in a multiple-choice question against every other view in the batch, which is why bigger batches help.</p><p><b>About this machine.</b> The dots show the typical effect of each setting on a two-dimensional embedding, not a trained network.</p>',
  code: {
    title: 'The InfoNCE loss for a batch of pairs',
    note: 'Adapted from the course\'s self-supervised vision lesson.',
    text: `
import torch, torch.nn.functional as F

def info_nce(z1, z2, temperature=0.1):
    z1, z2 = F.normalize(z1, dim=1), F.normalize(z2, dim=1)
    z = torch.cat([z1, z2])                      # 2N views
    sim = z @ z.T / temperature
    sim.fill_diagonal_(float("-inf"))            # a view is not its own match
    n = z1.shape[0]
    target = torch.cat([torch.arange(n, 2 * n), torch.arange(0, n)])
    return F.cross_entropy(sim, target)          # find your partner among all others

# each step: two random augmentations of the same batch, one shared encoder
loss = info_nce(encoder(augment(x)), encoder(augment(x)))
`,
  },
};
