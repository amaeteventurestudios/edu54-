// GANs, generator versus discriminator: a real, tiny GAN trains here in one dimension. The data are mango weights at a market in Mombasa: small Ngowe and large Apple mangoes, two humps.
// The generator turns random numbers into fake weights; the discriminator scores each weight from "fake" to "real". The table shows three things along one axis:
// the real histogram (teal), the generator's histogram (orange), and the discriminator's curve (purple line, its belief that a weight is real).
// Break it: the saturating loss (the generator gets almost no gradient and stays stuck), a lazy discriminator (its curve is flat, so fakes spread everywhere),
// a one-neuron generator (it can only make one hump, and lands between the two).
const BINS = 40, XMIN = -3, XMAX = 3, SNAP = 30;
function trainGAN(o) {
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  const data = () => (r() < 0.5 ? -1.5 + 0.3 * g() : 1.5 + 0.3 * g());
  const init = (i, n) => [...Array(n)].map(() => [...Array(i)].map(() => g() * Math.sqrt(1 / i)));
  const HG = o.HG, HD = 12;
  const G = { W1: init(1, HG), b1: Array(HG).fill(0), W2: init(HG, 1), b2: [0] }, D = { W1: init(1, HD), b1: Array(HD).fill(0), W2: init(HD, 1), b2: [0] };
  const fw = (N, x) => { const h = N.W1.map((w, j) => Math.tanh(w[0] * x + N.b1[j])); return { h, o: N.W2[0].reduce((a, w, j) => a + w * h[j], N.b2[0]) }; };
  const sig = v => 1 / (1 + Math.exp(-v));
  const snaps = [], zs = [...Array(300)].map(() => g()), xsReal = [...Array(600)].map(data);
  const snap = it => { const xs = zs.map(z => fw(G, z).o), curve = [...Array(BINS)].map((_, b) => sig(fw(D, XMIN + (b + 0.5) / BINS * (XMAX - XMIN)).o)); snaps.push({ it, xs, curve }); };
  snap(0);
  for (let it = 1; it <= o.iters; it++) {
    const gW1 = D.W1.map(() => [0]), gb1 = D.b1.map(() => 0), gW2 = [D.W2[0].map(() => 0)], gb2 = [0];
    for (let b = 0; b < 16; b++) for (const [x, y] of [[data(), 1], [fw(G, g()).o, 0]]) { const { h, o: lo } = fw(D, x), d = (sig(lo) - y) / 32; gb2[0] += d; h.forEach((hv, j) => { gW2[0][j] += d * hv; const dh = d * D.W2[0][j] * (1 - hv * hv); gb1[j] += dh; gW1[j][0] += dh * x; }); }
    D.W1.forEach((w, j) => { w[0] -= o.lrD * gW1[j][0]; }); D.b1 = D.b1.map((v, j) => v - o.lrD * gb1[j]); D.W2[0] = D.W2[0].map((v, j) => v - o.lrD * gW2[0][j]); D.b2[0] -= o.lrD * gb2[0];
    const hW1 = G.W1.map(() => [0]), hb1 = G.b1.map(() => 0), hW2 = [G.W2[0].map(() => 0)], hb2 = [0];
    for (let b = 0; b < 16; b++) {
      const z = g(), gf = fw(G, z), df = fw(D, gf.o), p = sig(df.o);
      const dl = D.W2[0].reduce((a, w, j) => a + w * (1 - df.h[j] ** 2) * D.W1[j][0], 0);
      const dx = (o.nonsat ? -(1 - p) : p) * dl / 16;
      hb2[0] += dx; gf.h.forEach((hv, j) => { hW2[0][j] += dx * hv; const dh = dx * G.W2[0][j] * (1 - hv * hv); hb1[j] += dh; hW1[j][0] += dh * z; });
    }
    G.W1.forEach((w, j) => { w[0] -= o.lrG * hW1[j][0]; }); G.b1 = G.b1.map((v, j) => v - o.lrG * hb1[j]); G.W2[0] = G.W2[0].map((v, j) => v - o.lrG * hW2[0][j]); G.b2[0] -= o.lrG * hb2[0];
    if (it % Math.round(o.iters / SNAP) === 0) snap(it);
  }
  return { snaps, xsReal };
}
const hist = xs => { const h = Array(BINS).fill(0); xs.forEach(x => { const b = Math.floor((x - XMIN) / (XMAX - XMIN) * BINS); if (b >= 0 && b < BINS) h[b]++; }); const m = xs.length; return h.map(v => v / m); };

export default {
  slug: 'gans-generator-discriminator',
  title: 'GANs: the forger and the inspector',
  description: 'A real, tiny GAN trains here on mango weights from a market in Mombasa: small Ngowe and large Apple mangoes, two humps. The generator\'s fake weights (orange) chase the real ones (teal) while the discriminator\'s curve (purple) tries to tell them apart. Then use the saturating loss, a lazy discriminator, or a generator with one neuron.',
  overview: 'A GAN is a game between two networks. The generator turns random noise into fake samples; the discriminator looks at a sample and outputs how likely it is to be real. The discriminator is trained to score real samples high and fakes low; the generator is trained to make the discriminator score its fakes high. Each update of the generator follows the slope of the discriminator\'s curve, pushing fakes towards where the discriminator believes real data lives. With the original loss that slope vanishes when the discriminator is confident, so in practice the generator maximises log D(fake) instead: the non-saturating loss. The game also needs balance: a discriminator that learns nothing gives no direction, and a generator too small cannot match the data.',
  keywords: ['gan training', 'generator discriminator', 'non saturating loss', 'gan 1d example', 'adversarial training'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.1, 0.75, 1.3], half: 1.6, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { nonsat: true, lazyD: false, tinyG: false, frame: SNAP, play: true, clock: 0 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const AW = 5.2, X = x => (x - XMIN) / (XMAX - XMIN) * AW - AW / 2, Y0 = 0.17, ZR = -0.15, ZF = 0.25;
    const table = P.box(AW + 0.3, 0.05, 1.4, '#FBF8F1', { r: 0.04 }); table.position.set(0, 0.12, 0.05); S.add(table);
    const axisT = S.text('mango weight →  (small Ngowe on the left, large Apple on the right)', { size: 0.075, weight: 800, color: ink, maxW: 5 }); axisT.position.set(0, 0.175, 0.65); S.add(axisT);
    const BW = AW / BINS;
    const mk = (z, c) => [...Array(BINS)].map((_, b) => { const m = new THREE.MeshLambertMaterial({ color: c }); const bx = P.box(BW * 0.85, 1, 0.22, c, { r: 0.01, material: m }); bx.position.set(X(XMIN + (b + 0.5) / BINS * (XMAX - XMIN)), Y0, z); bx.userData.noFit = true; S.add(bx); return bx; });
    const realBars = mk(ZR, C.teal), fakeBars = mk(ZF, C.orange);
    const curve = P.tube([V(), V(1, 0, 0)], 0.022, C.plum); curve.userData.noFit = true; S.add(curve);
    const half = P.tube([V(X(XMIN), Y0 + 0.6, -0.5), V(X(XMAX), Y0 + 0.6, -0.5)], 0.006, '#B7B2A6'); half.userData.noFit = true; S.add(half);
    const wall = P.box(AW + 0.3, 1.35, 0.05, '#F4F1EA', { r: 0.03 }); wall.position.set(0, 0.12, -0.6); S.add(wall);
    const wT = S.text('purple: the inspector\'s belief that a weight is real (line = 50%)', { size: 0.07, weight: 800, face: 'front', color: '#5A2A63', maxW: 5 }); wT.position.set(0, 0.12 + 1.2, -0.57); S.add(wT);
    const wTop = S.text('the discriminator', { size: 0.07, weight: 800 }); wTop.position.set(0, 0.12 + 1.355, -0.6); S.add(wTop);
    const lr = S.text('real weights', { size: 0.07, weight: 800, color: '#137A75' }); lr.position.set(X(XMIN) + 0.4, 0.175, ZR - 0.22); S.add(lr);
    const lf = S.text('generator\'s fakes', { size: 0.07, weight: 800, color: '#C2561E' }); lf.position.set(X(XMIN) + 0.55, 0.175, ZF + 0.22); S.add(lf);
    /* ---------- training ---------- */
    const cache = {};
    const cfg = () => ({ nonsat: st.nonsat, lrD: st.lazyD ? 0.004 : 0.05, lrG: 0.05, HG: st.tinyG ? 1 : 12, iters: 1500 });
    const key = () => JSON.stringify(cfg());
    let run = null, realH = null;
    function retrain() { const k = key(); if (!cache[k]) cache[k] = trainGAN(cfg()); run = cache[k]; realH = hist(run.xsReal); st.frame = Math.min(st.frame, run.snaps.length - 1); }
    function draw() {
      const sn = run.snaps[Math.min(st.frame, run.snaps.length - 1)], fh = hist(sn.xs), mx = Math.max(...realH) * 1.15;
      realBars.forEach((b, i) => { b.scale.y = Math.max(0.005, realH[i] / mx * 0.85); });
      fakeBars.forEach((b, i) => { b.scale.y = Math.max(0.005, Math.min(1.2, fh[i] / mx * 0.85)); });
      const pts = sn.curve.map((p, b) => V(X(XMIN + (b + 0.5) / BINS * (XMAX - XMIN)), Y0 + p * 1.2, -0.52));
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), BINS * 2, 0.022, 5, false);
      const near = sn.xs.filter(x => Math.abs(Math.abs(x) - 1.5) < 0.6).length / sn.xs.length, left = sn.xs.filter(x => x < 0).length / sn.xs.length;
      const ov = realH.reduce((a, v, i) => a + Math.min(v, fh[i]), 0);
      const flat = Math.max(...sn.curve) - Math.min(...sn.curve);
      R = { near, left, ov, flat, it: sn.it };
    }
    let R = null;
    retrain(); draw();
    function update(dt) { if (!st.play) return; st.clock += dt; if (st.clock > (S.reduced ? 0.5 : 0.12)) { st.clock = 0; st.frame = st.frame >= run.snaps.length - 1 ? 0 : st.frame + 1; draw(); } }
    const controls = [
      { type: 'buttons', label: 'Generator\'s loss', options: ['Non-saturating', 'Original (saturating)'], get: () => (st.nonsat ? 0 : 1), act: i => { st.nonsat = !i; retrain(); draw(); } },
      { type: 'toggle', label: 'Lazy discriminator (learns 12× slower)', short: 'lazy D', get: () => st.lazyD, set: v => { st.lazyD = v; retrain(); draw(); } },
      { type: 'toggle', label: 'Generator with one neuron', short: 'tiny G', get: () => st.tinyG, set: v => { st.tinyG = v; retrain(); draw(); } },
      { type: 'slider', label: 'Training step', min: 0, max: SNAP, step: 1, get: () => st.frame, set: v => { st.frame = Math.round(v); st.play = false; draw(); }, fmt: v => `${Math.round(v * 50)}` },
      { type: 'toggle', label: 'Play training', short: 'play', get: () => st.play, set: v => { st.play = v; } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Overlap', get: () => ({ v: pct(R.ov), sub: 'fakes vs real histogram', good: R.ov > 0.45, bad: R.ov < 0.3 }) },
      { label: 'Both varieties', get: () => ({ v: R.near > 0.6 && R.left > 0.3 && R.left < 0.7 ? 'yes' : 'no', sub: `${pct(R.left)} small, ${pct(1 - R.left)} large`, good: R.near > 0.6 && R.left > 0.3 && R.left < 0.7 }) },
      { label: 'Step', get: () => ({ v: R.it.toLocaleString(), sub: 'of 1,500' }) },
    ];
    const labels = [
      { name: 'real', t: 'Real weights', d: 'Two kinds of mango, two humps', icon: 'target', atV: V(X(XMAX) + 0.2, Y0 + 0.2, ZR) },
      { name: 'fake', t: 'The generator\'s fakes', d: 'Noise turned into weights', icon: 'spark', atV: V(X(XMAX) + 0.2, Y0 + 0.2, ZF) },
      { name: 'disc', t: 'The discriminator', d: 'High where it thinks data is real', icon: 'scale', atV: V(X(XMIN) - 0.2, Y0 + 0.7, -0.6) },
    ];
    const reset = () => { Object.assign(st, { nonsat: true, lazyD: false, tinyG: false, frame: SNAP, play: true }); retrain(); draw(); };
    const breaks = [
      { label: 'The original saturating loss', hint: 'Minimise log(1 − D(fake))', on: () => { reset(); st.nonsat = false; retrain(); draw(); }, off: reset },
      { label: 'A lazy discriminator', hint: 'It learns 12× slower', on: () => { reset(); st.lazyD = true; retrain(); draw(); }, off: reset },
      { label: 'A one-neuron generator', hint: 'Too small for two humps', on: () => { reset(); st.tinyG = true; retrain(); draw(); }, off: reset },
    ];
    function status() {
      if (!st.nonsat) return { ok: false, msg: `<b>The generator is stuck.</b> Early on the discriminator easily spots the fakes, and with the original loss the generator\'s gradient is multiplied by the discriminator\'s score for its fakes, which is close to zero. Almost no signal gets back, so the fakes sit in one spike (overlap ${pct(R.ov)}). The non-saturating loss, maximising log D(fake), gives a strong push exactly when the generator is losing.` };
      if (st.lazyD) return { ok: false, msg: `<b>No useful direction.</b> The discriminator learns so slowly that its curve stays nearly flat, so it barely tells the generator where real mangoes are. The fakes wander and spread across every weight, light and heavy alike (overlap ${pct(R.ov)}). The generator can only be as good as the inspector training it.` };
      if (st.tinyG) return { ok: false, msg: `<b>Too simple to shape its output.</b> With a single neuron the generator can only squash its noise through one S-shaped curve, so its fakes pile up in narrow spikes instead of two smooth humps, and the spikes miss the real weights (overlap ${pct(R.ov)}). It needs enough capacity to match the data.` };
      if (R.it < 800) return { ok: true, msg: `<b>Training, step ${R.it}.</b> The purple curve rises where real weights are and falls elsewhere; each generator update pushes the orange fakes up that slope. Watch the fakes split into two humps.` };
      return { ok: true, msg: `<b>Two varieties, matched.</b> The fakes have split into two humps over the Ngowe and Apple weights (overlap ${pct(R.ov)}), and the discriminator\'s curve is flattening towards 50%: it can barely tell real from fake. Longer training sharpens the match.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); retrain(); draw(); } };
  },

  story: [
    { t: 'Mango weights', home: true, say: 'Mango weights from a market in Mombasa: small Ngowe on the left, large Apple on the right. Two humps of real data, in teal.', act: m => m.set({ nonsat: true, lazyD: false, tinyG: false, frame: 0, play: false }) },
    { t: 'Two players', home: true, say: 'The generator turns random noise into fake weights, in orange. The discriminator, the purple curve, scores every weight from fake to real.', act: m => m.set({ frame: 6, play: false }) },
    { t: 'The game', home: true, say: 'The discriminator learns to score real weights high. The generator follows the slope of that curve, pushing its fakes towards where real mangoes are.', act: m => m.set({ frame: 0, play: true }), wait: 5 },
    { t: 'Stuck', home: true, say: 'With the original loss, the generator gets almost no gradient when the discriminator is confident. Its fakes sit in one spike, going nowhere.', act: m => m.set({ nonsat: false, frame: 30, play: false }) },
    { t: 'A lazy inspector', home: true, say: 'If the discriminator learns too slowly, its curve stays flat and gives no direction. The fakes spread everywhere.', act: m => m.set({ nonsat: true, lazyD: true, frame: 30, play: false }) },
    { t: 'Too small', home: true, say: 'And a generator with one neuron is too simple to shape its output. Its fakes pile into narrow spikes that miss both kinds of mango.', act: m => m.set({ lazyD: false, tinyG: true, frame: 30, play: false }) },
  ],
  check: [
    { q: 'What is the discriminator trained to do?', options: ['Score real samples high and fakes low', 'Make fake samples', 'Choose the noise'], answer: 0, why: 'Its scores guide the generator.' },
    { q: 'Why is the non-saturating loss used for the generator?', options: ['It gives a strong gradient when the discriminator easily spots fakes', 'It makes the discriminator stronger', 'It removes the noise input'], answer: 0, why: 'The original loss vanishes exactly then.' },
    { q: 'What happens with a discriminator that barely learns?', options: ['Its scores give no direction, so fakes spread anywhere', 'The generator becomes perfect', 'Training gets faster'], answer: 0, why: 'The generator needs a good inspector.' },
  ],
  terms: [
    ['Generator', 'The network that turns noise into fake samples.'],
    ['Discriminator', 'The network that scores how real a sample looks.'],
    ['Adversarial training', 'Training two networks against each other.'],
    ['Saturating loss', 'The original generator loss, whose gradient vanishes when the discriminator is confident.'],
    ['Non-saturating loss', 'Maximising log D(fake) instead, which keeps gradients strong.'],
    ['Equilibrium', 'When the discriminator can no longer tell real from fake.'],
  ],
  deeper: '<p><b>Why it is hard.</b> The two players chase each other, and the target keeps moving: each improvement to one changes what the other should do. Training can circle instead of settling.</p><p><b>Fixes that stuck.</b> Wasserstein losses, gradient penalties and spectral normalisation all keep the discriminator\'s slope smooth and informative, which steadies the game.</p><p><b>About this machine.</b> This GAN really trains: a generator and discriminator with small hidden layers, 1,500 steps of gradient descent on mango weights, recorded every 50 steps.</p>',
  code: {
    title: 'One GAN training step',
    note: 'Adapted from the course\'s GAN lesson.',
    text: `
import torch, torch.nn.functional as F

def gan_step(G, D, real, opt_g, opt_d, noise_dim=1):
    z = torch.randn(real.shape[0], noise_dim)
    fake = G(z)

    # discriminator: real -> 1, fake -> 0
    d_loss = F.binary_cross_entropy_with_logits(D(real), torch.ones_like(real)) \\
           + F.binary_cross_entropy_with_logits(D(fake.detach()), torch.zeros_like(real))
    opt_d.zero_grad(); d_loss.backward(); opt_d.step()

    # generator, non-saturating: make D call the fakes real
    g_loss = F.binary_cross_entropy_with_logits(D(fake), torch.ones_like(real))
    opt_g.zero_grad(); g_loss.backward(); opt_g.step()
`,
  },
};
