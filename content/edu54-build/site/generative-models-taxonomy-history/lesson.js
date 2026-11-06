// Generative models, a map of the families: five machines on one bench, each built to make new kente-style cloth patterns from the same training set.
// Autoregressive (one thread at a time), VAE (squeeze then rebuild), GAN (forger and inspector), diffusion (denoise step by step), flow (one smooth path).
// Each machine shows a sample, and four gauges: quality, variety, speed, and whether it can say how likely a pattern is.
// Choose the job, and the bench lights the best fit. Break it: a GAN for the job that needs every rare pattern (it collapses to a few),
// an autoregressive model for a live preview (far too slow), a VAE where crisp detail matters (blurry).
const FAM = [
  { k: 'ar', n: 'Autoregressive', sub: 'one piece at a time', q: 0.85, v: 0.85, s: 0.15, lik: true, c: '#3D6BD6', year: '2016–', ex: 'PixelCNN, image GPT, VAR' },
  { k: 'vae', n: 'VAE', sub: 'squeeze, then rebuild', q: 0.45, v: 0.8, s: 0.95, lik: true, c: '#1C9A94', year: '2013–', ex: 'VAE, VQ-VAE' },
  { k: 'gan', n: 'GAN', sub: 'forger vs inspector', q: 0.9, v: 0.35, s: 0.98, lik: false, c: '#D9483B', year: '2014–', ex: 'DCGAN, StyleGAN' },
  { k: 'diff', n: 'Diffusion', sub: 'denoise step by step', q: 0.95, v: 0.9, s: 0.3, lik: true, c: '#8A3F8E', year: '2020–', ex: 'DDPM, Stable Diffusion' },
  { k: 'flow', n: 'Flow matching', sub: 'one smooth path', q: 0.92, v: 0.88, s: 0.75, lik: true, c: '#E3A72F', year: '2022–', ex: 'rectified flow' },
];
const JOBS = [
  { k: 'catalogue', n: 'Fill a catalogue with every style', need: { v: 0.8, q: 0.7 } },
  { k: 'preview', n: 'Live preview while a weaver edits', need: { s: 0.7, q: 0.6 } },
  { k: 'crisp', n: 'Print-quality, crisp designs', need: { q: 0.85 } },
  { k: 'oddity', n: 'Flag designs that look unusual', need: { lik: true } },
];

export default {
  slug: 'generative-models-taxonomy-history',
  title: 'Generative models: five families',
  description: 'Five families of generative model, one job: make something new. Compare how each learns the data, what it pays in speed and quality, and where it fell over.',
  overview: 'Every generative model learns to make new samples that look like its training data, but the five main families do it differently and trade off differently. Autoregressive models build a sample one piece at a time, which is accurate and gives exact likelihoods but is slow. VAEs squeeze data into a small code and rebuild it: fast, smooth, often blurry. GANs train a generator against a discriminator: sharp and fast, but prone to dropping rare kinds of sample. Diffusion models remove noise over many steps: excellent quality and variety, slower. Flow matching learns a smooth path from noise to data that can be followed in a few steps. Choosing well starts with asking what the job needs.',
  keywords: ['generative models overview', 'vae vs gan vs diffusion', 'autoregressive models', 'flow matching', 'history of generative ai'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.75, 0], dir: [0.12, 0.6, 1.3], half: 1.75, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { job: 'catalogue', pick: 'diff' };
    const ink = '#151827';
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- five machines ---------- */
    const mach = FAM.map((f, i) => {
      const x = -2.6 + i * 1.3;
      const m = new THREE.MeshLambertMaterial({ color: f.c, emissive: '#000000' }), b = P.box(1.0, 0.5, 0.7, f.c, { r: 0.08, material: m }); b.position.set(x, 0.12, 0.55); floor.add(b);
      // a sample swatch on a stand behind the machine
      const stand = P.box(0.7, 0.75, 0.05, '#FBF8F1', { r: 0.03 }); stand.position.set(x, 0.12, -0.25); floor.add(stand);
      const sw = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 64); sw.layers.set(1); sw.userData.noFit = true; floor.add(sw);
      for (let k = 0; k < 64; k++) { dummy.position.set(x - 0.28 + (k % 8 + 0.5) * 0.07, 0.12 + 0.12 + 0.6 - (Math.floor(k / 8) + 0.5) * 0.07, -0.22); dummy.updateMatrix(); sw.setMatrixAt(k, dummy.matrix); }
      sw.instanceMatrix.needsUpdate = true;
      // four gauges: quality, variety, speed, likelihood
      const gauges = ['q', 'v', 's', 'lik'].map((g, j) => { const gm = new THREE.MeshLambertMaterial({ color: C.teal }), gb = P.box(0.14, 1, 0.1, C.teal, { r: 0.02, material: gm }); gb.position.set(x - 0.3 + j * 0.2, 0.62, 0.55); gb.userData.noFit = true; floor.add(gb); return { g, gb, gm }; });
      return { ...f, x, b, m, sw, gauges };
    });


    /* ---------- painting samples ---------- */
    const KENTE = ['#E3A72F', '#1C6B3A', '#C0392B', '#151827', '#2F3C8F'];
    function paint(f, seed) {
      let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const cells = [];
      const variety = f.k === 'gan' ? 0 : Math.floor(r() * 3);
      for (let k = 0; k < 64; k++) {
        const x = k % 8, y = Math.floor(k / 8), band = Math.floor((y + variety) / 2) % 4, block = (x + variety) % 4 < 2;
        col.set(KENTE[block ? band : (band + 2) % 5]);
        if (f.k === 'vae') col.lerp(new THREE.Color('#9A8A6A'), 0.45);
        if (f.k === 'ar' && y > 5) col.lerp(new THREE.Color('#E6E1D6'), 0.85);   // still being woven
        cells.push(col.clone());
      }
      return cells;
    }
    let R = null;
    function score(f, job) {
      const need = JOBS.find(j => j.k === job).need;
      let s = 1;
      if (need.v) s = Math.min(s, f.v / need.v); if (need.q) s = Math.min(s, f.q / need.q); if (need.s) s = Math.min(s, f.s / need.s); if (need.lik) s = Math.min(s, f.lik ? 1 : 0.2);
      return Math.min(1, s);
    }
    function draw() {
      mach.forEach((m, i) => {
        paint(m, 7 + i * 13).forEach((c, k) => m.sw.setColorAt(k, c)); m.sw.instanceColor.needsUpdate = true;
        m.gauges.forEach(({ g, gb, gm }) => { const v = g === 'lik' ? (m.lik ? 1 : 0.08) : m[g]; gb.scale.y = Math.max(0.03, v * 0.5); gm.color.set(v > 0.7 ? C.teal : v > 0.4 ? C.gold : C.red); });
        const on = m.k === st.pick;
        m.m.emissive.set(on ? '#4A4A4A' : '#000000');
      });
      const best = mach.reduce((b, m) => { const a = score(m, st.job), c = score(b, st.job); return a > c + 1e-9 || (Math.abs(a - c) < 1e-9 && m.s > b.s) ? m : b; }, mach[0]);
      R = { fit: score(mach.find(m => m.k === st.pick), st.job), best };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'The job', options: JOBS.map(j => j.n.split(' ').slice(0, 3).join(' ')), get: () => JOBS.findIndex(j => j.k === st.job), act: i => { st.job = JOBS[i].k; draw(); } },
      { type: 'buttons', label: 'Family to use', options: FAM.map(f => f.n), get: () => FAM.findIndex(f => f.k === st.pick), act: i => { st.pick = FAM[i].k; draw(); } },
    ];
    const readouts = [
      { label: 'Fit for the job', get: () => ({ v: `${Math.round(R.fit * 100)}%`, sub: FAM.find(f => f.k === st.pick).n, good: R.fit > 0.95, bad: R.fit < 0.6 }) },
      { label: 'Best family here', get: () => ({ v: R.best.n, sub: R.best.ex }) },
      { label: 'Speed', get: () => { const f = FAM.find(f => f.k === st.pick); return { v: f.s > 0.9 ? 'one pass' : f.s > 0.6 ? 'a few steps' : 'many steps', sub: 'per sample' }; } },
    ];
    const labels = [
      { name: 'machines', t: 'Five families', d: 'Same data, different methods', icon: 'box', atV: V(-3.1, 0.4, 0.55) },
      { name: 'samples', t: 'A sample from each', d: 'Kente-style patterns', icon: 'eye', atV: V(-2.95, 0.6, -0.25) },
      { name: 'gauges', t: 'The trade-offs', d: 'Quality, variety, speed, likelihood', icon: 'scale', atV: V(3.1, 0.75, 0.55) },
    ];
    const reset = () => { Object.assign(st, { job: 'catalogue', pick: 'diff' }); draw(); };
    const breaks = [
      { label: 'A GAN for every style', hint: 'The catalogue job', on: () => { reset(); st.pick = 'gan'; draw(); }, off: reset },
      { label: 'Autoregressive for a live preview', hint: 'The preview job', on: () => { reset(); st.job = 'preview'; st.pick = 'ar'; draw(); }, off: reset },
      { label: 'A VAE for print quality', hint: 'The crisp job', on: () => { reset(); st.job = 'crisp'; st.pick = 'vae'; draw(); }, off: reset },
    ];
    function status() {
      const f = FAM.find(x => x.k === st.pick), J = JOBS.find(j => j.k === st.job);
      if (R.fit >= 0.95) return { ok: true, msg: `<b>${f.n} suits "${J.n.toLowerCase()}".</b> ${f.k === 'diff' ? 'Diffusion gives top quality and covers the whole variety of the training set, at the cost of many steps.' : f.k === 'flow' ? 'Flow matching keeps diffusion\'s quality and variety in only a few steps.' : f.k === 'gan' ? 'A GAN makes a sharp sample in one pass.' : f.k === 'vae' ? 'A VAE generates in a single fast pass and gives a smooth space of designs.' : 'Autoregressive models give an exact likelihood for any design.'}` };
      if (f.k === 'gan' && J.need.v) return { ok: false, msg: `<b>Only a few styles come out.</b> A GAN only has to fool its discriminator, and the easiest way is to master a handful of popular patterns and skip the rare ones: variety ${Math.round(f.v * 100)}%. For a catalogue of every style, diffusion or flow matching cover the training set far better.` };
      if (f.k === 'ar' && J.need.s) return { ok: false, msg: `<b>Far too slow for live editing.</b> An autoregressive model weaves one piece at a time, each waiting for the last; the swatch is still half-woven. A preview needs a sample in one pass or a few steps: a GAN, a VAE or flow matching.` };
      if (f.k === 'vae' && J.need.q) return { ok: false, msg: `<b>Blurry where it must be crisp.</b> A VAE rebuilds from a small code and is trained to be right on average, so sharp edges come out soft and the colours muddy. For print quality, use diffusion, flow matching or a GAN.` };
      if (J.need.lik && !f.lik) return { ok: false, msg: `<b>It cannot say what is unusual.</b> A GAN generates samples but gives no likelihood, so it cannot score how typical a design is. Autoregressive models, VAEs, diffusion and flows can.` };
      return { ok: false, msg: `<b>A weak fit.</b> ${f.n} reaches ${Math.round(R.fit * 100)}% of what "${J.n.toLowerCase()}" needs. ${R.best.n} is the better choice here.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Five families', home: true, say: 'Five machines, all trained on the same kente-style patterns, each making new ones in its own way.', act: m => m.set({ job: 'catalogue', pick: 'diff' }) },
    { t: 'How each one works', home: true, say: 'Autoregressive weaves one piece at a time. A VAE squeezes and rebuilds. A GAN pits a forger against an inspector. Diffusion removes noise step by step. Flow matching follows one smooth path.', act: m => m.set({}) },
    { t: 'The trade-offs', home: true, say: 'The gauges show quality, variety, speed, and whether the model can say how likely a design is. No family wins on all four.', act: m => m.set({}) },
    { t: 'Every style', home: true, say: 'To fill a catalogue with every style, a GAN struggles: it masters a few popular patterns and drops the rare ones.', act: m => m.set({ pick: 'gan' }) },
    { t: 'Live preview', home: true, say: 'For a live preview, autoregressive is far too slow: the swatch is still half woven.', act: m => m.set({ job: 'preview', pick: 'ar' }) },
    { t: 'Choose by the job', home: true, say: 'Start from what the job needs, quality, variety, speed or likelihood, and pick the family that gives it.', act: m => m.set({ job: 'crisp', pick: 'diff' }) },
  ],
  check: [
    { q: 'Which family builds a sample one piece at a time?', options: ['Autoregressive', 'GAN', 'VAE'], answer: 0, why: 'Each piece depends on the ones before it.' },
    { q: 'What is a common weakness of GANs?', options: ['Mode collapse: missing rare kinds of sample', 'They are very slow', 'They cannot make images'], answer: 0, why: 'Fooling the discriminator does not require covering everything.' },
    { q: 'Why are VAE samples often blurry?', options: ['They rebuild from a small code and are trained to be right on average', 'They use too many steps', 'They only make black and white'], answer: 0, why: 'Averaging softens sharp detail.' },
  ],
  terms: [
    ['Generative model', 'A model that learns to produce new samples like its training data.'],
    ['Autoregressive model', 'Generates one piece at a time, each conditioned on the earlier pieces.'],
    ['VAE', 'Variational autoencoder: encodes to a small code and decodes back.'],
    ['GAN', 'Generative adversarial network: a generator trained against a discriminator.'],
    ['Diffusion model', 'Generates by removing noise over many steps.'],
    ['Likelihood', 'How probable the model thinks a given sample is.'],
  ],
  deeper: '<p><b>A short history.</b> VAEs (2013) and GANs (2014) opened modern generative modelling; autoregressive image models followed; diffusion (2020) overtook GANs on quality; flow matching (2022) made diffusion-quality generation fast. Language models are autoregressive too.</p><p><b>Mixing families.</b> Real systems combine them: Stable Diffusion runs diffusion inside a VAE\'s compressed space, and many tokenisers for images and audio are VQ-VAEs.</p><p><b>About this machine.</b> The gauges summarise typical behaviour; real models vary with size and training.</p>',
  code: {
    title: 'The five families in one line each',
    note: 'Adapted from the course\'s taxonomy lesson.',
    text: `
# autoregressive: p(x) = product over pieces of p(x_i | x_<i), sample piece by piece
x = [model.sample_next(x[:i]) for i in range(n)]

# VAE: encode to a small code, decode back; sample a code from N(0, I)
x = decoder(torch.randn(latent_dim))

# GAN: one pass through a generator trained to fool a discriminator
x = generator(torch.randn(noise_dim))

# diffusion: start from noise, remove a little predicted noise each step
for t in reversed(range(T)): x = denoise_step(model, x, t)

# flow matching: follow a learned velocity from noise to data
for i in range(steps): x = x + model(x, i / steps) / steps
`,
  },
};
