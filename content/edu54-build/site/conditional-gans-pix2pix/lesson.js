// Conditional GANs and pix2pix: an architect's line drawing of a Stone Town house front in Zanzibar goes in; a rendered façade comes out.
// Three boards: the sketch (the condition), the generator's output, and the real photo it was paired with. Two different sketches show whether the output follows its input.
// The generator is a U-Net; the discriminator judges small patches and sees the sketch alongside the picture. The loss mixes "fool the discriminator" with an L1 pull towards the real photo.
// Break it: drop the L1 term (sharp but wrong colours and details), hide the sketch from the discriminator (a believable façade, but not the one drawn), L1 only (right layout, blurry).
const W = 24, H = 18;
const HOUSES = [
  { door: [9, 15, 9, 18], wins: [[3, 6, 4, 8], [17, 21, 4, 8], [3, 6, 10, 13], [17, 21, 10, 13]], balcony: [2, 22, 8, 9], wall: '#E8DCC2', trim: '#3E6E8E' },
  { door: [3, 9, 9, 18], wins: [[13, 20, 3, 7], [13, 20, 10, 14]], balcony: [12, 21, 7, 8], wall: '#D9B88F', trim: '#2E6B4F' },
];
function facade(h, x, y, kind) {   // kind 'sketch' | 'photo'
  const H0 = HOUSES[h], inR = (r) => x >= r[0] && x < r[1] && y >= r[2] && y < r[3], edge = (r) => inR(r) && (x === r[0] || x === r[1] - 1 || y === r[2] || y === r[3] - 1);
  if (kind === 'sketch') { if (y === 0 || y === H - 1 || x === 0 || x === W - 1) return 1; if (edge(H0.door) || H0.wins.some(edge) || edge(H0.balcony)) return 1; if (inR(H0.door) && (x - H0.door[0] + y) % 3 === 0) return 0.6; return 0; }
  if (y < 1) return '#C9B48A';
  if (inR(H0.door)) return ((x - H0.door[0]) + (y - H0.door[2])) % 3 === 0 ? '#5A3A22' : '#7A4E2C';
  if (H0.wins.some(inR)) return H0.wins.some(edge) ? H0.trim : '#2B3A44';
  if (inR(H0.balcony)) return x % 2 ? H0.trim : '#F2F2F2';
  return y > H - 3 ? '#A89878' : H0.wall;
}

export default {
  slug: 'conditional-gans-pix2pix',
  title: 'Pix2pix: from sketch to picture',
  description: 'An architect\'s line drawing of a Stone Town house front in Zanzibar goes in, and a rendered façade comes out, judged by a discriminator that sees the sketch too. Swap sketches to see the output follow its input. Then drop the L1 term, hide the sketch from the discriminator, or use L1 alone and compare the three boards.',
  overview: 'A conditional GAN generates from an input as well as noise: here a sketch. In pix2pix the generator is a U-Net that maps sketch to picture, and the discriminator looks at small patches of the picture together with the sketch, judging whether this picture is a real match for this sketch. The generator is trained on two losses at once: fool the discriminator, which keeps details sharp, and stay close to the paired real photo in L1 distance, which keeps colours and layout right. Without pairs, CycleGAN translates both ways and requires that going there and back returns the original.',
  keywords: ['pix2pix', 'conditional gan', 'image to image translation', 'patchgan discriminator', 'cyclegan'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { house: 0, l1: true, gan: true, condD: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const CELL = 0.075, BW = W * CELL, BH = H * CELL, BY = 0.12 + 0.3, BZ = -0.5;
    const dummy = new THREE.Object3D(), col = new THREE.Color(), c2 = new THREE.Color();
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.2, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.075, weight: 800, face: 'front', color: ink }); t.position.set(x, BY + BH + 0.13, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.505, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < W * H; k++) { dummy.position.set(x - BW / 2 + (k % W + 0.5) * CELL, BY + BH - (Math.floor(k / W) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const sk = mkBoard(-2.1, 'the sketch (input)', 'condition'), outB = mkBoard(0, 'the generator\'s picture', 'output'), tg = mkBoard(2.1, 'the real photo it was paired with', 'target');
    /* ---------- generator and discriminator ---------- */
    const gen = P.box(1.3, 0.36, 0.55, C.indigo, { r: 0.06 }); gen.position.set(-1.0, 0.12, 0.85); S.add(gen);
    const genT = S.text('generator: U-Net', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); genT.position.set(-1.0, 0.36, 1.13); S.add(genT);
    const genU = S.text('', { size: 0.052, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.25 }); genU.position.set(-1.0, 0.22, 1.13); S.add(genU);
    const genTop = S.text('generator', { size: 0.065, weight: 800, color: '#FFFFFF' }); genTop.position.set(-1.0, 0.485, 0.85); S.add(genTop);
    const disc = P.box(1.3, 0.36, 0.55, C.red, { r: 0.06 }); disc.position.set(1.0, 0.12, 0.85); S.add(disc);
    const discT = S.text('discriminator: patches', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); discT.position.set(1.0, 0.36, 1.13); S.add(discT);
    const discU = S.text('', { size: 0.052, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.25 }); discU.position.set(1.0, 0.22, 1.13); S.add(discU);
    const discTop = S.text('discriminator', { size: 0.065, weight: 800, color: '#FFFFFF' }); discTop.position.set(1.0, 0.485, 0.85); S.add(discTop);
    /* ---------- the output ---------- */
    let R = null;
    function render() {
      const other = 1 - st.house, img = [];
      let s = 17 + st.house; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const truth = c2.set(facade(st.house, x, y, 'photo')).clone();
        let c;
        if (!st.gan) {   // L1 only: average of neighbours, washed out
          const acc = [0, 0, 0]; let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && a < W && b >= 0 && b < H) { c2.set(facade(st.house, a, b, 'photo')); acc[0] += c2.r; acc[1] += c2.g; acc[2] += c2.b; n++; } }
          c = new THREE.Color(acc[0] / n, acc[1] / n, acc[2] / n).lerp(new THREE.Color('#B8AE9C'), 0.25);
        } else if (!st.condD) c = new THREE.Color(facade(other, x, y, 'photo'));          // a real-looking façade, but the wrong one
        else if (!st.l1) { c = truth.clone(); const hsl = {}; c.getHSL(hsl); c.setHSL((hsl.h + 0.45) % 1, Math.min(1, hsl.s + 0.25), hsl.l); if (r() < 0.06) c.set('#7A4E2C'); }
        else { c = truth.clone(); c.offsetHSL(0, 0, (r() - 0.5) * 0.04); }
        img.push(c);
      }
      return img;
    }
    function draw() {
      for (let k = 0; k < W * H; k++) { const x = k % W, y = Math.floor(k / W), v = facade(st.house, x, y, 'sketch'); sk.setColorAt(k, col.set('#FBF8F1').lerp(c2.set(ink), v)); tg.setColorAt(k, col.set(facade(st.house, x, y, 'photo'))); }
      const img = render(); img.forEach((c, k) => outB.setColorAt(k, c));
      [sk, tg, outB].forEach(m => { m.instanceColor.needsUpdate = true; });
      let err = 0; img.forEach((c, k) => { const t = c2.set(facade(st.house, k % W, Math.floor(k / W), 'photo')); err += Math.abs(c.r - t.r) + Math.abs(c.g - t.g) + Math.abs(c.b - t.b); });
      genU.userData.set(`losses: ${st.gan ? 'fool D' : ''}${st.gan && st.l1 ? ' + ' : ''}${st.l1 ? 'L1 to the photo' : ''}`);
      discU.userData.set(st.condD ? 'sees sketch + picture' : 'sees the picture only');
      disc.material.color.set(st.gan ? C.red : '#9A9AA6');
      R = { err: err / (W * H * 3), sharp: st.gan };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Sketch', options: ['House A', 'House B'], get: () => st.house, act: i => { st.house = i; draw(); } },
      { type: 'toggle', label: 'L1 loss to the paired photo', short: 'L1', get: () => st.l1, set: v => { st.l1 = v; if (!v) st.gan = true; draw(); } },
      { type: 'toggle', label: 'Adversarial loss (fool the discriminator)', short: 'GAN', get: () => st.gan, set: v => { st.gan = v; if (!v) st.l1 = true; draw(); } },
      { type: 'toggle', label: 'Discriminator also sees the sketch', short: 'D sees sketch', get: () => st.condD, set: v => { st.condD = v; draw(); } },
    ];
    const readouts = [
      { label: 'Matches the photo', get: () => ({ v: `${Math.round((1 - R.err * 2.2) * 100)}%`, sub: 'pixel by pixel', good: R.err < 0.06, bad: R.err > 0.15 }) },
      { label: 'Sharpness', get: () => ({ v: R.sharp ? 'crisp' : 'blurry', bad: !R.sharp, good: R.sharp }) },
      { label: 'Follows the sketch', get: () => ({ v: st.condD || !st.gan ? 'yes' : 'no', bad: st.gan && !st.condD, good: st.condD || !st.gan }) },
    ];
    const labels = [
      { name: 'sketch', t: 'The sketch', d: 'What the picture must follow', icon: 'link', atV: V(-2.1 - BW / 2 - 0.1, BY + BH * 0.6, BZ) },
      { name: 'out', t: 'Generated picture', d: 'Compare with the photo on the right', icon: 'spark', atV: V(-1.65, 0.3, 0.85) },
      { name: 'target', t: 'The paired photo', d: 'Used for the L1 loss', icon: 'target', atV: V(2.1 + BW / 2 + 0.1, BY + BH * 0.6, BZ) },
    ];
    const reset = () => { Object.assign(st, { house: 0, l1: true, gan: true, condD: true }); draw(); };
    const breaks = [
      { label: 'Drop the L1 term', hint: 'Only fool the discriminator', on: () => { reset(); st.l1 = false; draw(); }, off: reset },
      { label: 'Hide the sketch from D', hint: 'It judges the picture alone', on: () => { reset(); st.condD = false; draw(); }, off: reset },
      { label: 'L1 only, no discriminator', hint: 'Just match the photo on average', on: () => { reset(); st.gan = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.gan) return { ok: false, msg: `<b>Right layout, blurry finish.</b> With only the L1 loss, the generator is rewarded for being right on average, and where it is unsure the average of the likely colours is a muddy blur: the carved door and window frames go soft. The adversarial loss is what punishes blur, because real photos are never blurry.` };
      if (!st.condD) return { ok: false, msg: `<b>A believable façade, but not this one.</b> If the discriminator never sees the sketch, it only asks "does this look like a real Stone Town house?", and the generator can answer with any house it has learned, ignoring what was drawn. The door is on the wrong side. Showing D the sketch makes it ask "is this a real match for this drawing?".` };
      if (!st.l1) return { ok: false, msg: `<b>Sharp, but the wrong colours.</b> Fooling the discriminator alone keeps edges crisp, but nothing ties the picture to the paired photo, so the walls and trim take colours from other houses and stray details appear (match ${Math.round((1 - R.err * 2.2) * 100)}%). The L1 term keeps colour and layout honest.` };
      return { ok: true, msg: `<b>Sketch in, façade out.</b> The L1 loss keeps colours and layout close to the paired photo, the patch discriminator keeps the carved details crisp, and because it sees the sketch too, the picture follows what was drawn: switch houses and the door moves with the drawing.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Sketch to picture', home: true, say: 'An architect\'s line drawing of a Stone Town house front in Zanzibar goes in. A rendered façade comes out, and on the right is the real photo it was paired with.', act: m => m.set({ house: 0, l1: true, gan: true, condD: true }) },
    { t: 'Follow the input', home: true, say: 'Swap to a different sketch, with the door on the other side, and the picture follows. That is what conditional means.', act: m => m.set({ house: 1 }) },
    { t: 'Two losses', home: true, say: 'The generator learns from two losses at once: stay close to the paired photo, and fool a discriminator that judges small patches.', act: m => m.set({ house: 0 }) },
    { t: 'L1 alone', home: true, say: 'With only the L1 loss, the generator plays safe and averages. The layout is right, but the carved details blur.', act: m => m.set({ gan: false }) },
    { t: 'Discriminator alone', home: true, say: 'With only the discriminator, edges are crisp, but nothing ties the colours to the real photo.', act: m => m.set({ gan: true, l1: false }) },
    { t: 'Show it the sketch', home: true, say: 'And if the discriminator never sees the sketch, any convincing house will do. The door ends up on the wrong side.', act: m => m.set({ l1: true, condD: false }) },
  ],
  check: [
    { q: 'What makes a GAN "conditional"?', options: ['It generates from an input, such as a sketch, not just noise', 'It only trains on Sundays', 'It has no discriminator'], answer: 0, why: 'The output must match the condition.' },
    { q: 'Why add an L1 loss in pix2pix?', options: ['To keep colours and layout close to the paired real photo', 'To make images sharper', 'To remove the discriminator'], answer: 0, why: 'The adversarial loss alone does not tie the output to the target.' },
    { q: 'Why must the discriminator see the sketch too?', options: ['So it judges whether the picture matches this sketch, not just whether it looks real', 'To make it faster', 'Sketches are easier to score'], answer: 0, why: 'Otherwise any realistic picture passes.' },
  ],
  terms: [
    ['Conditional GAN', 'A GAN whose generator and discriminator both receive an extra input, the condition.'],
    ['Pix2pix', 'Paired image-to-image translation with a U-Net generator and a patch discriminator.'],
    ['PatchGAN', 'A discriminator that judges many small patches instead of the whole image.'],
    ['L1 loss', 'The average absolute difference between two images.'],
    ['CycleGAN', 'Unpaired translation that requires going there and back to return the original.'],
    ['Paired data', 'Inputs matched one-to-one with their target outputs.'],
  ],
  deeper: '<p><b>Why patches?</b> A patch discriminator only has to judge local texture, which is where blur shows, and it works on any image size.</p><p><b>No pairs?</b> CycleGAN trains two generators, sketch to photo and photo to sketch, and adds a cycle loss: a photo turned into a sketch and back should match the original.</p><p><b>About this machine.</b> The outputs are drawn to show each loss setting\'s typical result, not produced by training.</p>',
  code: {
    title: 'The pix2pix generator loss',
    note: 'Adapted from the course\'s conditional GAN lesson.',
    text: `
import torch, torch.nn.functional as F

def generator_loss(G, D, sketch, photo, l1_weight=100.0):
    fake = G(sketch)
    pred = D(torch.cat([sketch, fake], dim=1))        # D sees the sketch with the picture
    adv = F.binary_cross_entropy_with_logits(pred, torch.ones_like(pred))
    l1 = (fake - photo).abs().mean()                  # stay close to the paired photo
    return adv + l1_weight * l1

def discriminator_loss(D, sketch, photo, fake):
    real = D(torch.cat([sketch, photo], dim=1))
    fake = D(torch.cat([sketch, fake.detach()], dim=1))
    return F.binary_cross_entropy_with_logits(real, torch.ones_like(real)) + \\
           F.binary_cross_entropy_with_logits(fake, torch.zeros_like(fake))
`,
  },
};
