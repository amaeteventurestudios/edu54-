// Autoencoders and VAEs: chalk symbols drawn by children at a school in Lusaka (circle, cross, triangle, square) are squeezed into a 2-number code and rebuilt.
// The tray in the middle is the code space: every training drawing lands as a dot. A probe ring wanders across the tray; the board on the right shows what the decoder draws from that spot.
// A plain autoencoder leaves gaps between groups, so the probe often decodes nonsense. A VAE adds a KL term that packs the codes into one smooth cloud, so every spot decodes to something sensible.
// Break it: KL weight 0 (a plain autoencoder: gaps decode to garbage), KL far too strong (posterior collapse: every code is the same blur), sample far outside the cloud (temperature too high).
const G = 12, SH = ['circle', 'cross', 'triangle', 'square'];
function shape(k, x, y) {     // x, y in 0..1
  const cx = x - 0.5, cy = y - 0.5;
  if (k === 0) return Math.abs(Math.hypot(cx, cy) - 0.32) < 0.09 ? 1 : 0;
  if (k === 1) return (Math.abs(cx) < 0.08 || Math.abs(cy) < 0.08) && Math.abs(cx) < 0.38 && Math.abs(cy) < 0.38 ? 1 : 0;
  if (k === 2) return cy > -0.32 && cy < 0.32 && Math.abs(cx) < (cy + 0.32) * 0.6 && !(Math.abs(cx) < (cy + 0.32) * 0.6 - 0.12 && cy < 0.22) ? 1 : 0;
  return Math.max(Math.abs(cx), Math.abs(cy)) < 0.34 && Math.max(Math.abs(cx), Math.abs(cy)) > 0.22 ? 1 : 0;
}
const IMG = SH.map((_, k) => [...Array(G * G)].map((_, i) => shape(k, (i % G + 0.5) / G, (Math.floor(i / G) + 0.5) / G)));

export default {
  slug: 'autoencoders-vae',
  title: 'Autoencoders and VAEs: squeeze, then rebuild',
  description: 'Chalk symbols drawn by children at a school in Lusaka are squeezed into just two numbers and rebuilt. Every drawing lands as a dot in the code space, and a probe wanders across it while the decoder draws what lives there. A plain autoencoder leaves gaps full of nonsense; a VAE packs the codes into one smooth cloud. Then set the KL weight to zero or far too high, or sample far outside the cloud.',
  overview: 'An autoencoder has an encoder that squeezes each input into a small code and a decoder that rebuilds the input from the code. Trained only to rebuild, it scatters codes wherever is convenient, leaving gaps, so picking a random code usually decodes to nonsense. A variational autoencoder (VAE) encodes each input as a small cloud rather than a point and adds a KL penalty that pulls all the clouds towards one standard bell curve. The code space becomes smooth and filled, so any code drawn from that bell curve decodes to something sensible, and moving between codes morphs one drawing into another. Too strong a penalty and the codes stop carrying information at all.',
  keywords: ['autoencoder', 'variational autoencoder', 'vae latent space', 'kl divergence elbo', 'posterior collapse'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.65, 0], dir: [0.12, 0.85, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { beta: 1, temp: 1, angle: 0.4, auto: true, clock: 0 };
    const ink = '#151827', SC = ['#E3A72F', '#1C9A94', '#D9483B', '#3D6BD6'];
    const base = P.box(6.6, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const grid = (x, z, cs) => { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(cs * 1.02, cs * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), G * G); m.layers.set(1); m.userData.noFit = true; S.add(m); for (let k = 0; k < G * G; k++) { dummy.position.set(x - G * cs / 2 + (k % G + 0.5) * cs, 0.12 + 0.55 + G * cs - (Math.floor(k / G) + 0.5) * cs, z); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); } m.instanceMatrix.needsUpdate = true; return m; };
    /* ---------- inputs on the left ---------- */
    const slate = P.box(1.5, 1.55, 0.06, '#2B3A33', { r: 0.04 }); slate.position.set(-2.4, 0.12, -0.5); S.add(slate);
    const slT = S.text('training drawings', { size: 0.07, weight: 800, color: '#FFFFFF' }); slT.position.set(-2.4, 0.12 + 1.555, -0.5); S.add(slT);
    SH.forEach((_, k) => { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.052, 0.052), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), G * G); m.layers.set(1); m.userData.noFit = true; S.add(m); const ox = -2.4 + (k % 2 - 0.5) * 0.7, oy = 0.12 + 0.25 + (1 - Math.floor(k / 2)) * 0.7; for (let i = 0; i < G * G; i++) { dummy.position.set(ox - 0.3 + (i % G + 0.5) * 0.05, oy + 0.55 - (Math.floor(i / G) + 0.5) * 0.05, -0.465); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col.set(IMG[k][i] ? '#F4F1EA' : '#2B3A33')); } m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    /* ---------- the code tray ---------- */
    const TX = 0, TR = 1.05, tray = P.cyl(TR + 0.08, 0.06, '#FBF8F1', { seg: 48 }); tray.position.set(TX, 0.12, 0.25); S.add(tray);
    const ring = P.tube([...Array(49)].map((_, k) => V(TX + Math.cos(k / 48 * 6.283) * TR * 0.55, 0.19, 0.25 + Math.sin(k / 48 * 6.283) * TR * 0.55)), 0.006, '#B7B2A6'); ring.userData.noFit = true; S.add(ring);
    const trT = S.text('the code: just two numbers', { size: 0.075, weight: 800, color: ink }); trT.position.set(TX, 0.19, 0.25 + TR + 0.22); S.add(trT);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 120); dots.userData.noFit = true; dots.frustumCulled = false; S.add(dots);
    const probe = P.tube([...Array(25)].map((_, k) => V(Math.cos(k / 24 * 6.283) * 0.09, 0, Math.sin(k / 24 * 6.283) * 0.09)), 0.016, ink); probe.userData.noFit = true; S.add(probe);
    const enc = P.box(0.55, 0.3, 0.4, C.indigo, { r: 0.05 }); enc.position.set(-1.3, 0.12, 0.25); S.add(enc);
    const encT = S.text('encoder', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); encT.position.set(-1.3, 0.27, 0.455); S.add(encT);
    const dec = P.box(0.55, 0.3, 0.4, C.plum, { r: 0.05 }); dec.position.set(1.3, 0.12, 0.25); S.add(dec);
    const decT = S.text('decoder', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); decT.position.set(1.3, 0.27, 0.455); S.add(decT);
    /* ---------- the decoded board ---------- */
    const board = P.box(1.5, 1.55, 0.06, '#FBF8F1', { r: 0.04 }); board.position.set(2.4, 0.12, -0.5); S.add(board);
    const bT = S.text('decoded from the probe', { size: 0.07, weight: 800 }); bT.position.set(2.4, 0.12 + 1.555, -0.5); S.add(bT);
    const out = grid(2.4, -0.465, 0.1);
    /* ---------- the model ---------- */
    let s0 = 9; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647, gs = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
    const NOISE = [...Array(120)].map(() => [gs(), gs()]);
    const centres = () => {
      if (st.beta >= 10) return SH.map(() => [0, 0]);
      if (st.beta === 0) return [[-0.78, -0.62], [0.82, -0.7], [-0.7, 0.8], [0.75, 0.72]];
      return [[-0.42, -0.3], [0.4, -0.36], [-0.36, 0.42], [0.42, 0.36]];
    };
    const spread = () => (st.beta === 0 ? 0.07 : st.beta >= 10 ? 0.04 : 0.17);
    function decode(z) {
      const cs = centres(), w = cs.map(c => Math.exp(-((z[0] - c[0]) ** 2 + (z[1] - c[1]) ** 2) / (2 * (st.beta === 0 ? 0.09 : 0.3) ** 2)));
      const tot = w.reduce((a, v) => a + v, 0);
      if (st.beta >= 10) return { img: IMG[0].map((_, i) => SH.reduce((a, _, k) => a + IMG[k][i], 0) / 4), kind: 'blur' };
      if (tot < 1e-3) { let s = Math.floor((z[0] + 3) * 97 + (z[1] + 3) * 131); const r = () => (s = (s * 16807 + 7) % 2147483647) / 2147483647; return { img: IMG[0].map(() => (r() > 0.55 ? 1 : 0)), kind: 'garbage' }; }
      const img = IMG[0].map((_, i) => SH.reduce((a, _, k) => a + w[k] * IMG[k][i], 0) / tot);
      const top = w.indexOf(Math.max(...w));
      return { img, kind: w[top] / tot > 0.8 ? SH[top] : 'blend', top };
    }
    let R = null;
    function draw() {
      const cs = centres(), sp = spread();
      for (let n = 0; n < 120; n++) { const k = n % 4, z = [cs[k][0] + NOISE[n][0] * sp, cs[k][1] + NOISE[n][1] * sp]; dummy.position.set(TX + z[0] * TR * 0.8, 0.21, 0.25 + z[1] * TR * 0.8); dummy.updateMatrix(); dots.setMatrixAt(n, dummy.matrix); dots.setColorAt(n, col.set(SC[k])); }
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
      const rad = 0.55 * st.temp, z = [Math.cos(st.angle) * rad, Math.sin(st.angle) * rad];
      probe.position.set(TX + z[0] * TR * 0.8, 0.21, 0.25 + z[1] * TR * 0.8);
      const d = decode(z);
      d.img.forEach((v, i) => out.setColorAt(i, col.set('#FBF8F1').lerp(new THREE.Color(ink), Math.max(0, Math.min(1, v)))));
      out.instanceColor.needsUpdate = true;
      R = { z, ...d };
    }
    draw();
    function update(dt) { if (!st.auto) return; st.clock += dt; if (st.clock > (S.reduced ? 0.6 : 0.08)) { st.clock = 0; st.angle = (st.angle + 0.06) % (Math.PI * 2); draw(); } }
    const controls = [
      { type: 'buttons', label: 'KL weight (how hard codes are packed)', options: ['0: plain autoencoder', '1: VAE', '20: far too strong'], get: () => [0, 1, 20].indexOf(st.beta), act: i => { st.beta = [0, 1, 20][i]; draw(); } },
      { type: 'slider', label: 'How far out the probe samples', min: 0.3, max: 2.5, step: 0.05, get: () => st.temp, set: v => { st.temp = v; draw(); }, fmt: v => `× ${v.toFixed(2)}` },
      { type: 'toggle', label: 'Probe wanders', short: 'wander', get: () => st.auto, set: v => { st.auto = v; } },
    ];
    const readouts = [
      { label: 'Decoder draws', get: () => ({ v: R.kind === 'garbage' ? 'nonsense' : R.kind === 'blur' ? 'the same blur' : R.kind === 'blend' ? 'a blend' : `a ${R.kind}`, good: R.kind !== 'garbage' && R.kind !== 'blur', bad: R.kind === 'garbage' || R.kind === 'blur' }) },
      { label: 'Code space', get: () => ({ v: st.beta === 0 ? 'gaps' : st.beta >= 10 ? 'collapsed' : 'smooth', sub: `KL weight ${st.beta}`, good: st.beta === 1, bad: st.beta !== 1 }) },
      { label: 'Probe distance', get: () => ({ v: (0.55 * st.temp).toFixed(2), sub: 'from the centre of the cloud', bad: st.temp > 1.8 }) },
    ];
    const labels = [
      { name: 'inputs', t: 'Training drawings', d: 'Four chalk symbols', icon: 'eye', atV: V(-3.15, 0.8, -0.5) },
      { name: 'tray', t: 'The code space', d: 'Each dot is one drawing; ring: probe', icon: 'target', atV: V(TX - TR, 0.2, 0.25) },
      { name: 'board', t: 'Decoded', d: 'What lives under the probe', icon: 'box', atV: V(3.15, 0.8, -0.5) },
    ];
    const reset = () => { Object.assign(st, { beta: 1, temp: 1, auto: true }); draw(); };
    const breaks = [
      { label: 'KL weight 0', hint: 'A plain autoencoder', on: () => { reset(); st.beta = 0; st.angle = 0.2; draw(); }, off: reset },
      { label: 'KL weight far too strong', hint: 'Weight 20', on: () => { reset(); st.beta = 20; draw(); }, off: reset },
      { label: 'Sample far outside', hint: 'Probe at 2.2 × the usual distance', on: () => { reset(); st.temp = 2.2; draw(); }, off: reset },
    ];
    function status() {
      if (st.beta === 0) return { ok: false, msg: `<b>Gaps full of nonsense.</b> Trained only to rebuild, the autoencoder put each kind of drawing in its own tight corner and left the space between empty. Codes from the gaps were never trained, so the decoder draws noise ${R.kind === 'garbage' ? '(as now)' : 'whenever the probe crosses one'}. Rebuilding works; generating does not.` };
      if (st.beta >= 10) return { ok: false, msg: `<b>Every code means the same thing.</b> With the KL penalty far too strong, the encoder gives up and sends every drawing to the same spot, so the code carries no information and the decoder can only draw the average of all four symbols, wherever the probe is. This is posterior collapse.` };
      if (st.temp > 1.8) return { ok: false, msg: `<b>Sampling outside the cloud.</b> The KL term packed the codes into a bell curve around the centre. Out at ${(0.55 * st.temp).toFixed(1)}, far past where any training drawing landed, the decoder has seen nothing and its drawings fall apart${R.kind === 'garbage' ? ' into noise' : ''}. Sample from the bell curve, not beyond it.` };
      return { ok: true, msg: `<b>A smooth space of drawings.</b> The KL term packed the four groups into one cloud with no gaps, so wherever the probe wanders the decoder draws something sensible: a clean symbol inside a group, a blend of two between them. Random codes from the bell curve now generate new drawings.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Squeeze and rebuild', home: true, say: 'Children at a school in Lusaka drew four chalk symbols. An encoder squeezes each drawing into just two numbers, and a decoder rebuilds the drawing from them.', act: m => m.set({ beta: 1, temp: 1, auto: true }) },
    { t: 'The code space', home: true, say: 'Every drawing lands as a dot on the tray. The black ring is a probe; the board shows what the decoder draws from that spot.', act: m => m.set({}) },
    { t: 'A plain autoencoder', home: true, say: 'Train only to rebuild, and the codes cluster in corners with empty gaps between. When the probe crosses a gap, the decoder draws nonsense.', act: m => m.set({ beta: 0 }), wait: 4 },
    { t: 'The VAE', home: true, say: 'A VAE adds a KL penalty that pulls all the codes into one smooth cloud. Now every spot decodes to something sensible, and drawings morph into each other.', act: m => m.set({ beta: 1 }), wait: 4 },
    { t: 'Too much', home: true, say: 'Make the penalty far too strong, and every drawing gets the same code. The decoder can only draw one blur, the average of everything.', act: m => m.set({ beta: 20, auto: false }) },
    { t: 'Stay in the cloud', home: true, say: 'And sample far outside the cloud, where no drawing ever landed, and the decoder has nothing to go on.', act: m => m.set({ beta: 1, temp: 2.2, auto: false }) },
  ],
  check: [
    { q: 'Why does a plain autoencoder generate poorly from random codes?', options: ['Its code space has gaps that were never trained', 'Its decoder is too small', 'It has no encoder'], answer: 0, why: 'Codes in the gaps decode to nonsense.' },
    { q: 'What does the KL term in a VAE do?', options: ['Pulls all codes towards one smooth bell curve', 'Makes images sharper', 'Removes the decoder'], answer: 0, why: 'A filled, smooth space can be sampled.' },
    { q: 'What is posterior collapse?', options: ['The codes stop carrying information, so every input decodes the same', 'The decoder crashes', 'The training data is lost'], answer: 0, why: 'Too strong a KL weight causes it.' },
  ],
  terms: [
    ['Autoencoder', 'An encoder and decoder trained to rebuild their input through a small code.'],
    ['Latent code', 'The small vector an input is squeezed into.'],
    ['VAE', 'An autoencoder whose codes are pulled towards a bell curve so it can generate.'],
    ['KL divergence', 'A measure of how far a distribution is from another, here from the bell curve.'],
    ['ELBO', 'The VAE training objective: rebuild well, and keep codes near the bell curve.'],
    ['Reparameterisation trick', 'Sampling a code as mean + spread × noise so gradients can flow.'],
  ],
  deeper: '<p><b>Why "variational"?</b> The encoder outputs a mean and a spread for each input, a small cloud, and training samples a code from it with the reparameterisation trick, so gradients flow through the randomness.</p><p><b>VQ-VAE</b> replaces the smooth code with a choice from a learned codebook. Its discrete tokens are what many image, audio and video generators work with.</p><p><b>About this machine.</b> The code space and decoder are simplified to show the three regimes; the drawings are blended from the four true symbols.</p>',
  code: {
    title: 'A VAE: encode, sample, decode, and the ELBO',
    note: 'Adapted from the course\'s autoencoders lesson.',
    text: `
import torch, torch.nn.functional as F

def vae_step(encoder, decoder, x, beta=1.0):
    mu, log_var = encoder(x)                          # a small cloud per input
    z = mu + torch.exp(0.5 * log_var) * torch.randn_like(mu)   # reparameterise
    x_hat = decoder(z)
    rebuild = F.binary_cross_entropy(x_hat, x, reduction="sum")
    kl = -0.5 * torch.sum(1 + log_var - mu ** 2 - log_var.exp())  # distance from N(0, I)
    return rebuild + beta * kl                         # beta = 0: plain autoencoder

def generate(decoder, n, latent_dim=2):
    return decoder(torch.randn(n, latent_dim))         # sample from the bell curve
`,
  },
};
