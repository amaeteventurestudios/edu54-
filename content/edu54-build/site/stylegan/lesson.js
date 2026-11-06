// StyleGAN: a generator that makes beaded collars in the style of Maasai beadwork. Three collars lie on the bench, from three random seeds.
// A mapping network turns each seed z into a style w; w is fed into every layer by adaptive normalisation: coarse layers set the collar's shape, middle layers its colour bands,
// fine layers the bead texture. Per-layer noise adds the tiny bead-to-bead variation. Style mixing takes coarse styles from one collar and fine ones from another.
// Break it: no mapping network (styles tangled: one change moves shape and colour together), truncation ψ = 0 (every collar is the same average one), no noise (beads look moulded, too perfect).
const NB = 90, PAL = ['#D9483B', '#2F3C8F', '#F2F2F2', '#E3A72F', '#1C6B3A', '#151827', '#3D9BD6', '#EE7434'];

export default {
  slug: 'stylegan',
  title: 'StyleGAN: styles at every scale',
  description: 'A generator makes beaded collars in the style of Maasai beadwork, three at a time. A mapping network turns each random seed into a style that is fed into every layer: coarse layers choose the shape, middle layers the colour bands, fine layers the bead texture, and noise adds the tiny variations. Mix styles between collars, then remove the mapping network, set truncation to zero, or switch off the noise.',
  overview: 'StyleGAN changed how GAN generators are built. Instead of feeding noise in at the start, a mapping network first turns the random vector z into a style vector w, in a space where different properties are easier to separate. The generator starts from a learned constant and, at every layer, adaptive instance normalisation (AdaIN) rescales the features using w, so each layer is steered by the style. Early, low-resolution layers control coarse things like overall shape; later layers control colour and fine texture. Random noise added at each layer creates small, unimportant variation. Because styles enter per layer, you can mix them, and the truncation trick pulls w towards the average to trade variety for quality.',
  keywords: ['stylegan explained', 'mapping network', 'adain style', 'style mixing', 'truncation trick'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.1, 1.2, 1.0], half: 1.55, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mapping: true, psi: 0.7, noise: true, mix: false, seedA: 3, seedB: 11, seedC: 23 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const cloth = P.box(6.0, 0.03, 1.7, '#8A5A3B', { r: 0.04 }); cloth.position.set(0, 0.12, -0.15); S.add(cloth);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const CX = [-2.0, 0, 2.0];
    const beads = CX.map(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NB * 3); m.userData.noFit = true; m.frustumCulled = false; m.layers.set(1); S.add(m); return m; });
    const tags = CX.map((x, i) => { const t = S.text('', { size: 0.07, weight: 800, color: '#FFFFFF' }); t.position.set(x, 0.155, 0.55); S.add(t); return t; });
    /* ---------- the generator diagram in front ---------- */
    const parts = [['mapping', 'z → w', C.plum, -2.4], ['coarse', 'shape', C.indigo, -1.1], ['middle', 'colour bands', '#3D6BD6', 0.2], ['fine', 'bead texture', C.teal, 1.5], ['noise', 'tiny variation', C.grey, 2.6]].map(([n, sub, c, x]) => {
      const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(1.0, 0.3, 0.42, c, { r: 0.05, material: m }); b.position.set(x, 0.12, 1.05); S.add(b);
      const t = S.text(n, { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.32, 1.265); S.add(t);
      const u = S.text(sub, { size: 0.05, weight: 800, face: 'front', color: '#FFFFFF' }); u.position.set(x, 0.2, 1.265); S.add(u);
      return { n, b, m, c };
    });
    /* ---------- styles ---------- */
    const rng = seed => { let s = seed * 9973 + 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    function style(seed) {
      const r = rng(seed), z = [...Array(6)].map(() => r() * 2 - 1), avg = [0, 0, 0, 0, 0, 0];
      let w = st.mapping ? z.map((v, i) => Math.tanh(v * 1.4)) : z.map((v, i, a) => Math.tanh(0.6 * v + 0.6 * a[(i + 1) % 6]));   // without mapping, properties are tangled
      w = w.map((v, i) => avg[i] + st.psi * (v - avg[i]));
      return { coarse: [w[0], w[1]], mid: [w[2], w[3]], fine: [w[4], w[5]] };
    }
    function collar(k, sCoarse, sMid, sFine, noiseSeed) {
      const radius = 0.5 + 0.12 * sCoarse.coarse[0], rows = 2 + Math.round(1.2 + sCoarse.coarse[1]), open = 0.35 + 0.25 * (sCoarse.coarse[1] + 1) / 2;
      const p0 = Math.floor(((sMid.mid[0] + 1) / 2) * PAL.length) % PAL.length, p1 = Math.floor(((sMid.mid[1] + 1) / 2 * 5 + 3)) % PAL.length, bandW = 3 + Math.round(2 * (sFine.fine[0] + 1));
      const nr = rng(noiseSeed); let q = 0;
      for (let row = 0; row < 3; row++) for (let i = 0; i < NB; i++) {
        if (row >= rows) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); beads[k].setMatrixAt(q++, dummy.matrix); continue; }
        const a = open / 2 * Math.PI + (i / (NB - 1)) * (2 - open) * Math.PI, rr = radius + row * 0.085;
        const j = st.noise ? (nr() - 0.5) * 0.02 : 0, sz = st.noise ? 0.85 + nr() * 0.3 : 1;
        dummy.position.set(CX[k] + Math.cos(a) * rr + j, 0.17, -0.15 - Math.sin(a) * rr * 0.75 + j); dummy.scale.setScalar(sz); dummy.updateMatrix(); beads[k].setMatrixAt(q, dummy.matrix);
        const band = Math.floor(i / bandW) % 3, c = band === 0 ? PAL[p0] : band === 1 ? PAL[p1] : PAL[(p0 + 2 + row) % PAL.length];
        col.set(c); if (st.noise) col.offsetHSL(0, 0, (nr() - 0.5) * 0.08); beads[k].setColorAt(q, col); q++;
      }
      beads[k].instanceMatrix.needsUpdate = true; beads[k].instanceColor.needsUpdate = true;
    }
    let R = null;
    function draw() {
      const A = style(st.seedA), B = style(st.seedB), Cc = style(st.seedC);
      collar(0, A, A, A, 101); collar(2, B, B, B, 303);
      if (st.mix) collar(1, A, B, B, 202); else collar(1, Cc, Cc, Cc, 202);
      tags[0].userData.set('seed A'); tags[1].userData.set(st.mix ? 'A\'s shape, B\'s colours' : 'seed C'); tags[2].userData.set('seed B');
      parts[0].m.color.set(st.mapping ? C.plum : '#9A9AA6'); parts[4].m.color.set(st.noise ? C.grey : '#C9C5BA');
      const spread = Math.abs(A.coarse[0] - B.coarse[0]) + Math.abs(A.mid[0] - B.mid[0]);
      R = { spread, same: st.psi < 0.05 };
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Mapping network (z → w)', short: 'mapping', get: () => st.mapping, set: v => { st.mapping = v; draw(); } },
      { type: 'slider', label: 'Truncation ψ (variety)', min: 0, max: 1, step: 0.05, get: () => st.psi, set: v => { st.psi = v; draw(); } },
      { type: 'toggle', label: 'Per-layer noise', short: 'noise', get: () => st.noise, set: v => { st.noise = v; draw(); } },
      { type: 'toggle', label: 'Style mixing in the middle collar', short: 'mix', get: () => st.mix, set: v => { st.mix = v; draw(); } },
      { type: 'button', label: 'New seeds', short: 'Reroll', act: () => { st.seedA += 5; st.seedB += 7; st.seedC += 3; draw(); } },
    ];
    const readouts = [
      { label: 'Variety', get: () => ({ v: R.same ? 'none' : st.psi < 0.4 ? 'low' : 'high', sub: `ψ = ${st.psi.toFixed(2)}`, bad: R.same, good: st.psi >= 0.4 }) },
      { label: 'Controls separate', get: () => ({ v: st.mapping ? 'yes' : 'tangled', sub: 'shape vs colour', good: st.mapping, bad: !st.mapping }) },
      { label: 'Bead detail', get: () => ({ v: st.noise ? 'natural' : 'moulded', sub: 'from per-layer noise', good: st.noise, bad: !st.noise }) },
    ];
    const labels = [
      { name: 'collars', t: 'Three generated collars', d: 'One per random seed', icon: 'spark', atV: V(-3.0, 0.2, -0.15) },
      { name: 'layers', t: 'Styles by layer', d: 'Coarse shape, middle colour, fine texture', icon: 'link', atV: V(-2.95, 0.25, 1.05) },
      { name: 'mix', t: 'The middle collar', d: 'Turn on mixing in Try it', icon: 'box', atV: V(0.8, 0.2, -0.15) },
    ];
    const reset = () => { Object.assign(st, { mapping: true, psi: 0.7, noise: true, mix: false }); draw(); };
    const breaks = [
      { label: 'No mapping network', hint: 'Feed z straight into the layers', on: () => { reset(); st.mapping = false; draw(); }, off: reset },
      { label: 'Truncation ψ = 0', hint: 'Pull every style to the average', on: () => { reset(); st.psi = 0; draw(); }, off: reset },
      { label: 'No per-layer noise', hint: 'Only the style decides', on: () => { reset(); st.noise = false; draw(); }, off: reset },
    ];
    function status() {
      if (R.same) return { ok: false, msg: `<b>Three identical collars.</b> Truncation pulls every style towards the average style, and at ψ = 0 every seed becomes exactly the average. Truncation is a dial: a little (around 0.7) removes the oddest samples and lifts quality; all the way removes all variety.` };
      if (!st.mapping) return { ok: false, msg: `<b>Shape and colour are tangled.</b> Without the mapping network, each number in z has to serve several layers at once, so nudging one changes the collar\'s shape and its colours together. The mapping network learns a style space w where these properties come apart, which is what makes per-layer control and mixing work.` };
      if (!st.noise) return { ok: false, msg: `<b>Moulded, too perfect.</b> Without per-layer noise, the generator has to produce every bead-to-bead variation from the style itself, so the beads come out identical in size, spacing and shade, like plastic. Noise supplies small random detail that does not need to be controlled.` };
      if (st.mix) return { ok: true, msg: `<b>Style mixing.</b> The middle collar takes its coarse styles (shape, number of rows) from seed A and its middle and fine styles (colour bands, bead texture) from seed B. Because each layer reads its own style, the two combine cleanly.` };
      return { ok: true, msg: `<b>Three different collars.</b> Each seed passes through the mapping network to a style, and every layer reads that style: shape from the coarse layers, colour bands from the middle, bead texture from the fine layers, with noise for the small variation.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three collars', home: true, say: 'A generator makes beaded collars in the style of Maasai beadwork. Three random seeds, three different collars.', act: m => m.set({ mapping: true, psi: 0.7, noise: true, mix: false }) },
    { t: 'A style for every layer', home: true, say: 'A mapping network turns each seed into a style, and every layer reads it. Coarse layers choose the shape, middle layers the colour bands, fine layers the bead texture.', act: m => m.set({}) },
    { t: 'Mixing styles', home: true, say: 'Take the coarse style from one collar and the colour and texture from another. The middle collar has A\'s shape with B\'s colours.', act: m => m.set({ mix: true }) },
    { t: 'Noise for detail', home: true, say: 'Random noise at each layer adds the small differences between beads. Switch it off, and they look moulded.', act: m => m.set({ mix: false, noise: false }) },
    { t: 'Truncation', home: true, say: 'The truncation trick pulls every style towards the average. A little lifts quality; all the way, and every collar is the same.', act: m => m.set({ noise: true, psi: 0 }) },
    { t: 'Why the mapping network', home: true, say: 'Without the mapping network, shape and colour are tangled together, and changing one changes both.', act: m => m.set({ psi: 0.7, mapping: false }) },
  ],
  check: [
    { q: 'What does StyleGAN\'s mapping network do?', options: ['Turns the random vector z into a style vector w where properties are easier to separate', 'Draws the final image', 'Judges real and fake'], answer: 0, why: 'That disentangling enables per-layer control.' },
    { q: 'Which layers control the coarse shape?', options: ['The early, low-resolution layers', 'The final layers', 'The noise inputs'], answer: 0, why: 'Later layers control colour and fine texture.' },
    { q: 'What does truncation ψ = 0 do?', options: ['Makes every sample the average style, removing all variety', 'Doubles the variety', 'Removes the noise'], answer: 0, why: 'Small truncation trades variety for quality.' },
  ],
  terms: [
    ['Mapping network', 'An MLP that turns z into the style vector w.'],
    ['Style vector (w)', 'The intermediate code that steers every generator layer.'],
    ['AdaIN', 'Adaptive instance normalisation: rescaling features using the style.'],
    ['Style mixing', 'Using different styles for different layers in one image.'],
    ['Truncation trick', 'Pulling w towards its average to trade variety for quality.'],
    ['Per-layer noise', 'Random values added at each layer for fine, uncontrolled detail.'],
  ],
  deeper: '<p><b>Versions.</b> StyleGAN2 replaced AdaIN with weight modulation to remove blob artefacts; StyleGAN3 made features follow the image smoothly when it moves, avoiding textures that stick to the screen.</p><p><b>Editing.</b> Because w is well organised, directions in it often correspond to single properties, so images can be edited by moving along them.</p><p><b>About this machine.</b> The collars are drawn from the style values directly, to show what each layer and setting controls.</p>',
  code: {
    title: 'Mapping network and AdaIN',
    note: 'Adapted from the course\'s StyleGAN lesson.',
    text: `
import torch, torch.nn as nn

mapping = nn.Sequential(*[m for _ in range(8) for m in (nn.Linear(512, 512), nn.LeakyReLU(0.2))])

def adain(x, w, to_scale, to_bias):
    mean = x.mean(dim=(2, 3), keepdim=True)
    std = x.std(dim=(2, 3), keepdim=True) + 1e-8
    return to_scale(w)[..., None, None] * (x - mean) / std + to_bias(w)[..., None, None]

def truncate(w, w_avg, psi=0.7):
    return w_avg + psi * (w - w_avg)          # psi = 0: every sample is the average

w = truncate(mapping(torch.randn(1, 512)), w_avg)
`,
  },
};
