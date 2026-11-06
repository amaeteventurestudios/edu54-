// Image generation with GANs: a DCGAN generator weaves cloth swatches in the style of strip-woven West African cloth from random noise.
// Left: the noise dial (a short random vector). Middle: the generator tower, each slab twice the size of the one before. Right: a board of nine samples from nine noise vectors,
// and a discriminator lamp showing how real it judges them. A walk slider moves every noise vector along one direction, and every swatch morphs smoothly.
// Break it: mode collapse (nine copies of one swatch), transposed convolutions with overlapping steps (a checkerboard), a discriminator far too strong (the generator never learns).
const G = 12, NS = 9;
const PAL = [['#E3A72F', '#1C6B3A', '#C0392B', '#151827'], ['#2F3C8F', '#F2C94C', '#E8E0C8', '#8A3F8E'], ['#D9772B', '#151827', '#3E9B5F', '#F4EEE2']];

export default {
  slug: 'image-generation-gans',
  title: 'GANs: weaving pictures from noise',
  description: 'A GAN generator turns a handful of random numbers into a cloth swatch, growing it layer by layer from 4 × 4 to full size. Nine noise vectors give nine different swatches, and walking through the noise morphs them smoothly. Then watch it collapse to one design, fill with a checkerboard, or never learn at all.',
  overview: 'A generative adversarial network pits two networks against each other. The generator takes a short vector of random numbers and grows it, through transposed convolutions, into an image. The discriminator looks at real images and generated ones and tries to tell them apart; the generator is trained to fool it. When it works, every point in the noise space maps to a believable image, and nearby points give similar images. The classic failures are mode collapse (one image for every input), checkerboard artefacts from overlapping upsampling, and a discriminator so good that the generator gets no useful signal.',
  keywords: ['gan image generation', 'dcgan', 'mode collapse', 'checkerboard artifacts', 'latent space interpolation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.95, 0], dir: [0.15, 0.5, 1.3], half: 1.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { steps: 5000, collapse: false, up: 'resize', dStrong: false, walk: 0 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* ---------- noise dial ---------- */
    const NX = -2.65, dial = P.box(0.6, 0.6, 0.6, C.plum, { r: 0.08 }); dial.position.set(NX, 0.12, 0.2); S.add(dial);
    const dialT = S.text('noise z', { size: 0.09, weight: 800, face: 'front', color: '#FFFFFF' }); dialT.position.set(NX, 0.5, 0.505); S.add(dialT);
    const dialT2 = S.text('8 random numbers', { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: 0.55 }); dialT2.position.set(NX, 0.32, 0.505); S.add(dialT2);
    const dialTop = S.text('z', { size: 0.14, weight: 800, color: '#FFFFFF' }); dialTop.position.set(NX, 0.725, 0.2); S.add(dialTop);
    const beads = [...Array(8)].map((_, i) => { const b = P.ball(0.035, C.gold); b.userData.noFit = true; S.add(b); return b; });
    /* ---------- generator tower ---------- */
    const GX = -1.75, sizes = [[4, 256], [8, 128], [16, 64], [32, 3]];
    const slabs = sizes.map(([s, c], i) => {
      const side = 0.22 + i * 0.2, x = GX + i * 0.42, m = new THREE.MeshLambertMaterial({ color: i === 3 ? C.gold : C.indigo });
      const b = P.box(0.14 + (3 - i) * 0.06, side, side * 0.8, C.indigo, { r: 0.02, material: m }); b.position.set(x, 0.3, 0.2); b.userData.noFit = true; S.add(b);
      const t = S.text(`${s}×${s}`, { size: 0.05, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); t.position.set(x, 0.38 + side, 0.2); t.userData.noFit = true; S.add(t);
      return { b, m };
    });
    const genPlate = P.box(1.8, 0.08, 0.95, '#5B6178', { r: 0.05 }); genPlate.position.set(GX + 0.63, 0.12, 0.2); S.add(genPlate);
    const genT = S.text('generator: grows the picture', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.5 }); genT.position.set(GX + 0.63, 0.16, 0.68); S.add(genT);
    const upT = S.text('', { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); upT.position.set(GX + 0.63, 1.35, 0.2); upT.userData.noFit = true; S.add(upT);
    /* ---------- sample board ---------- */
    const BX = 1.2, BZ = -0.55, CELL = 0.065, SW = G * CELL, GAP = 0.09, BS = 3 * SW + 2 * GAP;
    const board = P.box(BS + 0.3, BS + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, BZ); S.add(board);
    const bT = S.text('nine samples from nine noise vectors', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: BS }); bT.position.set(BX, 0.12 + BS + 0.33, BZ + 0.045); S.add(bT);
    const bTop = S.text('what it makes', { size: 0.07, weight: 800 }); bTop.position.set(BX, 0.12 + BS + 0.505, BZ); S.add(bTop);
    const BY0 = 0.12 + 0.12;
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.01, CELL * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), NS * G * G);
    tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), c2 = new THREE.Color();
    for (let s = 0; s < NS; s++) for (let k = 0; k < G * G; k++) { const sx = s % 3, sy = Math.floor(s / 3), x = k % G, y = Math.floor(k / G); dummy.position.set(BX - BS / 2 + sx * (SW + GAP) + (x + 0.5) * CELL, BY0 + BS - sy * (SW + GAP) - (y + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(s * G * G + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* discriminator */
    const DX = 2.75, disc = P.box(0.55, 0.5, 0.55, C.red, { r: 0.08 }); disc.position.set(DX, 0.12, 0.45); S.add(disc);
    const dT = S.text('discriminator', { size: 0.06, weight: 800, face: 'front', color: '#FFFFFF' }); dT.position.set(DX, 0.45, 0.705); S.add(dT);
    const dV = S.text('', { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); dV.position.set(DX, 0.27, 0.705); S.add(dV);
    const dTop = S.text('real or fake?', { size: 0.06, weight: 800, color: '#FFFFFF', maxW: 0.5 }); dTop.position.set(DX, 0.625, 0.45); S.add(dTop);
    const lampM = new THREE.MeshLambertMaterial({ color: '#7BD389', emissive: '#1F5F2C' }), lamp = P.ball(0.09, '#7BD389'); lamp.material = lampM; lamp.position.set(DX, 0.78, 0.45); S.add(lamp);
    /* ---------- the generator's output ---------- */
    let seedZ = 3; const rz = () => (seedZ = (seedZ * 16807) % 2147483647) / 2147483647;
    const Z = [...Array(NS)].map(() => [...Array(8)].map(() => rz() * 2 - 1));
    const DIR = [0.9, -0.6, 0.7, 0.2, -0.5, 0.8, -0.3, 0.4];
    function swatch(z, x, y, q, noise) {
      const pal = PAL[Math.floor((z[0] + 1) * 1.5) % 3], stripe = 2 + Math.round((z[1] + 1) * 1.5), zig = (z[2] + 1) * 1.4, band = (z[3] + 1) * 0.5;
      const yy = y + Math.round(Math.sin(x * 0.9) * zig), b = Math.floor((yy + 40) / stripe) % 4, block = Math.floor(x / 6) % 2 && band > 0.5;
      c2.set(pal[block ? (b + 2) % 4 : b]);
      return col.setRGB(noise[0], noise[1], noise[2]).lerp(c2, q);
    }
    let R = null;
    function draw() {
      const q = st.dStrong ? 0.06 : Math.min(1, 1 - Math.exp(-st.steps / 1300));
      let sn = 11; const rn = () => (sn = (sn * 16807) % 2147483647) / 2147483647;
      for (let s = 0; s < NS; s++) {
        const z0 = st.collapse ? Z[4] : Z[s], z = z0.map((v, i) => Math.max(-1, Math.min(0.999, v + st.walk * DIR[i])));
        for (let k = 0; k < G * G; k++) {
          const x = k % G, y = Math.floor(k / G), noise = [0.45 + rn() * 0.3, 0.42 + rn() * 0.3, 0.4 + rn() * 0.3];
          swatch(z, x, y, q, noise);
          if (st.up === 'transposed') col.multiplyScalar((x + y) % 2 ? 1.0 : 0.62);
          tiles.setColorAt(s * G * G + k, col);
        }
      }
      tiles.instanceColor.needsUpdate = true;
      const real = st.dStrong ? 0.01 : st.collapse ? 0.2 : st.up === 'transposed' ? 0.25 : Math.min(0.48, 0.05 + 0.43 * q);
      R = { q, real, distinct: st.collapse ? 1 : NS };
      dV.userData.set(`says ${Math.round(real * 100)}% real`);
      lampM.color.set(real > 0.35 ? '#7BD389' : '#D9483B'); lampM.emissive.set(real > 0.35 ? '#1F5F2C' : '#5A1A12');
      slabs.forEach(s => s.m.color.set(st.dStrong ? '#9A9AA6' : C.indigo)); slabs[3].m.color.set(C.gold);
      upT.userData.set(st.up === 'transposed' ? 'transposed conv, stride 2, kernel 3' : 'resize, then conv');
      beads.forEach((b, i) => { const v = Z[4][i] + st.walk * DIR[i]; b.position.set(NX - 0.25 + i * 0.07, 0.8 + Math.max(-1, Math.min(1, v)) * 0.12, 0.2); });
    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Training steps', min: 0, max: 5000, step: 50, get: () => st.steps, set: v => { st.steps = v; draw(); }, fmt: v => Math.round(v).toLocaleString() },
      { type: 'slider', label: 'Walk through the noise', min: -0.6, max: 0.6, step: 0.01, get: () => st.walk, set: v => { st.walk = v; draw(); } },
      { type: 'buttons', label: 'How the generator grows the picture', options: ['Resize + conv', 'Transposed conv'], get: () => (st.up === 'resize' ? 0 : 1), act: i => { st.up = i ? 'transposed' : 'resize'; draw(); } },
      { type: 'toggle', label: 'Mode collapse', short: 'collapse', get: () => st.collapse, set: v => { st.collapse = v; draw(); } },
    ];
    const readouts = [
      { label: 'Discriminator', get: () => ({ v: pct(R.real), sub: 'judges fakes real (50% is perfect)', good: R.real > 0.35, bad: R.real < 0.2 }) },
      { label: 'Different designs', get: () => ({ v: `${R.distinct} of ${NS}`, sub: 'from 9 noise vectors', good: R.distinct === NS, bad: R.distinct < 3 }) },
      { label: 'Training', get: () => ({ v: Math.round(st.steps).toLocaleString(), sub: 'steps' }) },
    ];
    const labels = [
      { name: 'noise', t: 'Random noise', d: 'Eight numbers in, one picture out', icon: 'spark', atV: V(NX - 0.3, 0.45, 0.2) },
      { name: 'gen', t: 'The generator', d: 'Each layer doubles the size', icon: 'box', atV: V(GX - 0.25, 0.25, 0.2) },
      { name: 'board', t: 'Nine samples', d: 'One swatch per noise vector', icon: 'eye', atV: V(BX + BS / 2 + 0.15, BY0 + BS * 0.75, BZ) },
      { name: 'disc', t: 'The discriminator', d: 'Its verdict trains the generator', icon: 'scale', atV: V(DX + 0.28, 0.4, 0.45) },
    ];
    const reset = () => { Object.assign(st, { steps: 5000, collapse: false, up: 'resize', dStrong: false, walk: 0 }); draw(); };
    const breaks = [
      { label: 'Mode collapse', hint: 'Every noise vector, one design', on: () => { reset(); st.collapse = true; draw(); }, off: reset },
      { label: 'Overlapping transposed convs', hint: 'Stride 2 with a kernel of 3', on: () => { reset(); st.up = 'transposed'; draw(); }, off: reset },
      { label: 'Discriminator far too strong', hint: 'It wins from the first step', on: () => { reset(); st.dStrong = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.dStrong) return { ok: false, msg: `<b>The generator never learns.</b> The discriminator spots every fake with near certainty from the start, so its verdict is flat: no matter how the generator changes, the answer stays "fake". With no slope to follow, the swatches stay muddy noise. Balance the two, or use the non-saturating loss and spectral normalisation.` };
      if (st.collapse) return { ok: false, msg: `<b>Nine copies of one design.</b> The generator found one swatch that fools the discriminator and now makes it for every noise vector. The discriminator soon learns to reject that one design and the generator jumps to another, round and round. Minibatch statistics or a Wasserstein loss help.` };
      if (st.up === 'transposed') return { ok: false, msg: `<b>A checkerboard over everything.</b> A transposed convolution with stride 2 and kernel 3 paints some output pixels from two input pixels and their neighbours from one, so every other pixel comes out darker. The discriminator spots it at once (${pct(R.real)} real). Resize first, then convolve.` };
      if (R.q < 0.6) return { ok: false, msg: `<b>Still learning.</b> After ${Math.round(st.steps).toLocaleString()} steps the swatches are mostly blur; the discriminator calls them ${pct(R.real)} real. Keep training.` };
      return { ok: true, msg: `<b>Nine different cloths.</b> Each noise vector becomes its own believable design, and walking through the noise morphs them smoothly, which means the generator learned a space of designs, not a list. The discriminator now calls them ${pct(R.real)} real: close to a coin toss.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Noise in, picture out', home: true, say: 'A GAN generator takes eight random numbers and grows them, layer by layer, from four by four into a full picture: here, swatches of strip-woven cloth.', act: m => m.set({ steps: 0, collapse: false, up: 'resize', dStrong: false, walk: 0 }) },
    { t: 'Learning to fool', home: true, say: 'A discriminator judges real cloth against generated cloth, and the generator learns from its verdicts. Over thousands of steps, blur turns into stripes and blocks.', act: m => m.set({ steps: 5000 }) },
    { t: 'A space of designs', home: true, say: 'Walk all nine noise vectors in one direction, and every swatch morphs smoothly. Nearby noise gives similar cloth: the generator has learned a space, not a list.', act: m => m.set({ walk: 0.45 }) },
    { t: 'Mode collapse', home: true, say: 'Sometimes the generator finds one design that works and makes it for every input. Nine noise vectors, nine copies.', act: m => m.set({ walk: 0, collapse: true }) },
    { t: 'Checkerboards', home: true, say: 'Grow the picture with overlapping transposed convolutions, and every other pixel gets painted twice. A faint checkerboard covers everything.', act: m => m.set({ collapse: false, up: 'transposed' }) },
    { t: 'Keep the game fair', home: true, say: 'And if the discriminator is far too strong, its verdict never changes, so the generator has nothing to learn from. GANs work only while the game stays balanced.', act: m => m.set({ up: 'resize', dStrong: true }) },
  ],
  check: [
    { q: 'What does a GAN generator take as input?', options: ['A short vector of random numbers', 'A real photo', 'A text description'], answer: 0, why: 'Each noise vector maps to one generated image.' },
    { q: 'What is mode collapse?', options: ['The generator makes the same output for every input', 'The discriminator crashes', 'Images become too large'], answer: 0, why: 'It found one output that fools the discriminator and stuck to it.' },
    { q: 'Why can a far too strong discriminator stop learning?', options: ['Its verdict is flat, so the generator gets no useful gradient', 'It deletes the generator', 'It makes images too sharp'], answer: 0, why: 'The generator learns from changes in the verdict; a flat "fake" gives none.' },
  ],
  terms: [
    ['GAN', 'Generative adversarial network: a generator and a discriminator trained against each other.'],
    ['Generator', 'The network that turns noise into images.'],
    ['Discriminator', 'The network that judges whether an image is real or generated.'],
    ['Latent space', 'The space of noise vectors the generator maps from.'],
    ['Mode collapse', 'A generator producing little or no variety.'],
    ['Transposed convolution', 'An upsampling layer that can leave checkerboard artefacts.'],
  ],
  deeper: '<p><b>DCGAN rules.</b> The architecture that first made GANs stable used strided convolutions instead of pooling, batch normalisation in both networks, ReLU in the generator and leaky ReLU in the discriminator.</p><p><b>Spectral normalisation</b> limits how sharply the discriminator\'s verdict can change, which keeps its gradients useful to the generator.</p><p><b>About this machine.</b> The swatches are drawn by a fixed pattern function of the noise; training, collapse, checkerboards and the discriminator\'s verdict are shown as their typical effect.</p>',
  code: {
    title: 'A DCGAN generator that resizes before it convolves',
    note: 'Adapted from the course\'s GAN image generation lesson.',
    text: `
import torch.nn as nn

def up(c_in, c_out):
    return nn.Sequential(
        nn.Upsample(scale_factor=2, mode="nearest"),   # no overlap, no checkerboard
        nn.Conv2d(c_in, c_out, 3, padding=1),
        nn.BatchNorm2d(c_out), nn.ReLU())

class Generator(nn.Module):
    def __init__(self, z_dim=8):
        super().__init__()
        self.fc = nn.Linear(z_dim, 256 * 4 * 4)
        self.net = nn.Sequential(up(256, 128), up(128, 64), up(64, 32),
                                 nn.Conv2d(32, 3, 3, padding=1), nn.Tanh())

    def forward(self, z):
        return self.net(self.fc(z).view(-1, 256, 4, 4))   # 4 -> 8 -> 16 -> 32
`,
  },
};
