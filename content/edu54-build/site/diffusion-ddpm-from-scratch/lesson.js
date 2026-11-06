// DDPM from scratch: the maths behind diffusion, on a picture of a lilac-breasted roller perched over the Okavango Delta.
// Left: the noise schedule, how much of the picture survives at each timestep (ᾱ_t). Middle: the picture at the chosen timestep t, made in one shot with
// x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε. Right: a picture produced by the reverse process, 1,000 small denoising steps.
// Break it: drop the square roots (the picture's brightness explodes instead of fading into noise), a linear schedule squeezed into 200 steps (the signal is gone by a third of the way),
// sample without the added noise term (the picture comes out smooth and lifeless).
const T = 1000, IW = 18, IH = 14;
function bird(x, y) {     // x, y in 0..1, y down
  let c = [0.62 - 0.2 * y, 0.78 - 0.2 * y, 0.9 - 0.1 * y];
  if (y > 0.78) c = [0.32, 0.5, 0.42];
  if (Math.abs(y - 0.62) < 0.03 && x > 0.15 && x < 0.95) c = [0.36, 0.26, 0.18];
  const bx = (x - 0.48) / 0.16, by = (y - 0.42) / 0.2, body = bx * bx + by * by < 1;
  if (body) c = y < 0.38 ? [0.55, 0.62, 0.38] : x < 0.5 ? [0.72, 0.6, 0.82] : [0.25, 0.55, 0.85];
  if (Math.hypot((x - 0.5) / 0.09, (y - 0.2) / 0.08) < 1) c = [0.52, 0.6, 0.4];
  if (x > 0.42 && x < 0.5 && y > 0.55 && y < 0.95 && Math.abs(x - (0.46 + (y - 0.55) * 0.2)) < 0.02) c = [0.2, 0.42, 0.75];
  return c;
}
const X0 = []; for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) X0.push(bird((i + 0.5) / IW, (j + 0.5) / IH));
const MU = X0.flat().reduce((a, v) => a + v, 0) / (X0.length * 3), SD = Math.sqrt(X0.flat().reduce((a, v) => a + (v - MU) ** 2, 0) / (X0.length * 3));
let ns = 3; const rn = () => (ns = (ns * 16807) % 2147483647) / 2147483647;
const EPS = X0.map(() => [0, 0, 0].map(() => Math.sqrt(-2 * Math.log(rn() + 1e-12)) * Math.cos(6.2832 * rn())));

export default {
  slug: 'diffusion-ddpm-from-scratch',
  title: 'DDPM: the maths of noise and back',
  description: 'The maths behind diffusion, on a picture of a lilac-breasted roller over the Okavango Delta. The schedule says how much picture survives at every step, a single formula jumps straight to any step, and the reverse process walks back from noise. Then drop the square roots, squeeze a linear schedule into 200 steps, or leave out the sampling noise.',
  overview: 'A denoising diffusion probabilistic model (DDPM) defines a forward process that adds a little Gaussian noise at each of T steps, following a schedule β_t. The product ᾱ_t of (1 − β) up to step t says how much of the original survives, and it gives a shortcut: x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε jumps straight to any step, with the square roots keeping the total variance at one. Training picks a random t, makes x_t in one shot, and teaches a network to predict ε. Sampling starts from pure noise and steps backwards, each time removing the predicted noise and then adding a little fresh noise, which is what keeps samples varied and detailed.',
  keywords: ['ddpm explained', 'diffusion noise schedule', 'closed form forward process', 'alpha bar', 'ancestral sampling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { t: 400, sched: 'cosine', Tn: 1000, sqrt: true, sampleNoise: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- schedule board ---------- */
    const SX = -2.1, SZ = -0.5, SW = 1.7, SH = 1.35, SY = 0.12 + 0.3;
    const sb = P.box(SW + 0.25, SH + 0.55, 0.08, '#FBF8F1', { r: 0.04 }); sb.position.set(SX, 0.12, SZ); S.add(sb);
    const sbT = S.text('picture left (teal) and noise (grey) at each step', { size: 0.065, weight: 800, face: 'front', color: ink, maxW: SW }); sbT.position.set(SX, SY + SH + 0.15, SZ + 0.045); S.add(sbT);
    const sbTop = S.text('the schedule', { size: 0.07, weight: 800 }); sbTop.position.set(SX, 0.12 + SH + 0.555, SZ); S.add(sbTop);
    const sigC = P.tube([V(), V(1, 0, 0)], 0.018, C.teal), noiC = P.tube([V(), V(1, 0, 0)], 0.018, '#8E91A3'); [sigC, noiC].forEach(c => { c.userData.noFit = true; S.add(c); });
    const tMark = P.box(0.02, SH, 0.02, C.orange, { r: 0 }); tMark.userData.noFit = true; S.add(tMark);
    const ax = S.text('step t →', { size: 0.06, weight: 700, face: 'front', color: ink }); ax.position.set(SX + SW / 2 - 0.25, SY - 0.1, SZ + 0.045); S.add(ax);
    /* ---------- picture boards ---------- */
    const CELL = 0.085, BW = IW * CELL, BH = IH * CELL, BY = 0.12 + 0.3;
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.2, BH + 0.55, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, SZ); S.add(b);
      const t = S.text(title, { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW }); t.position.set(x, BY + BH + 0.15, SZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.555, SZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), IW * IH); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < IW * IH; k++) { dummy.position.set(x - BW / 2 + (k % IW + 0.5) * CELL, BY + BH - (Math.floor(k / IW) + 0.5) * CELL, SZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const xt = mkBoard(0.05, '', 'one shot to step t'), smp = mkBoard(2.05, '1,000 steps back from noise', 'a sample');
    const xtT = S.text('', { size: 0.065, weight: 800, face: 'front', color: ink }); xtT.position.set(0.05, BY + BH + 0.15, SZ + 0.05); S.add(xtT);
    /* formula plaque */
    const plaque = P.box(3.2, 0.3, 0.45, C.indigo, { r: 0.05 }); plaque.position.set(0.3, 0.12, 0.9); S.add(plaque);
    const fT = S.text('', { size: 0.085, weight: 800, face: 'front', color: '#FFFFFF', maxW: 3.1 }); fT.position.set(0.3, 0.27, 1.13); S.add(fT);
    const fTop = S.text('the shortcut', { size: 0.065, weight: 800, color: '#FFFFFF' }); fTop.position.set(-0.9, 0.425, 0.9); S.add(fTop);
    /* ---------- maths ---------- */
    function abarAt(u) {    // u = t / T in 0..1
      if (st.sched === 'cosine') { const f = s => Math.cos(((s + 0.008) / 1.008) * Math.PI / 2) ** 2; return f(u) / f(0); }
      const Tn = st.Tn, b0 = 1e-4, b1 = 0.02 * (1000 / Tn) ** 0.5 * (st.Tn < 1000 ? 2.6 : 1); let a = 1; const steps = Math.round(u * Tn); for (let i = 0; i < steps; i++) a *= 1 - (b0 + (b1 - b0) * i / Tn); return a;
    }
    let R = null;
    function draw() {
      const N = 40, sp = [], np = [];
      for (let i = 0; i <= N; i++) { const u = i / N, a = abarAt(u); sp.push(V(SX - SW / 2 + u * SW, SY + Math.sqrt(a) * SH * 0.92, SZ + 0.05)); np.push(V(SX - SW / 2 + u * SW, SY + Math.sqrt(1 - a) * SH * 0.92, SZ + 0.05)); }
      sigC.geometry.dispose(); sigC.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 80, 0.018, 4, false);
      noiC.geometry.dispose(); noiC.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(np), 80, 0.018, 4, false);
      const u = st.t / T; tMark.position.set(SX - SW / 2 + u * SW, SY, SZ + 0.055);
      const a = abarAt(u), cs = st.sqrt ? Math.sqrt(a) : a, cn = st.sqrt ? Math.sqrt(1 - a) : 1 - a;
      let varSum = 0;
      X0.forEach((c, k) => { const v = c.map((x, ch) => cs * (x - MU) / SD + cn * EPS[k][ch]); varSum += v.reduce((s, x) => s + x * x, 0); xt.setColorAt(k, col.setRGB(...v.map(x => Math.max(0, Math.min(1, x * 0.22 + 0.5))), THREE.SRGBColorSpace)); });
      xt.instanceColor.needsUpdate = true;
      const spread = Math.sqrt(varSum / (X0.length * 3));
      // the sample: with noise, detailed; without, smooth and washed out
      let s2 = 9; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      X0.forEach((c, k) => {
        const i = k % IW, j = Math.floor(k / IW); let v = c.slice();
        if (!st.sampleNoise) { const acc = [0, 0, 0]; let n = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const a2 = i + di, b2 = j + dj; if (a2 >= 0 && a2 < IW && b2 >= 0 && b2 < IH) { const q = X0[b2 * IW + a2]; acc[0] += q[0]; acc[1] += q[1]; acc[2] += q[2]; n++; } } v = acc.map(x => x / n).map(x => 0.5 + (x - 0.5) * 0.55); }
        else v = v.map(x => x + (r2() - 0.5) * 0.06);
        if (st.sched === 'linear' && st.Tn < 1000) v = v.map(x => 0.5 + (x - 0.5) * 0.7 + (r2() - 0.5) * 0.25);
        smp.setColorAt(k, col.setRGB(...v.map(x => Math.max(0, Math.min(1, x))), THREE.SRGBColorSpace));
      });
      smp.instanceColor.needsUpdate = true;
      xtT.userData.set(`t = ${st.t}: ${Math.round(a * 100)}% picture variance left`);
      fT.userData.set(st.sqrt ? 'x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε' : 'x_t = ᾱ_t · x_0 + (1 − ᾱ_t) · ε   (square roots missing!)');
      const deadAt = [...Array(101).keys()].find(i => abarAt(i / 100) < 0.01);
      R = { a, spread, deadAt: deadAt === undefined ? 100 : deadAt };
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Step t', min: 0, max: 1000, step: 10, get: () => st.t, set: v => { st.t = Math.round(v); draw(); } },
      { type: 'buttons', label: 'Schedule', options: ['Cosine, 1,000 steps', 'Linear, 1,000 steps', 'Linear, 200 steps'], get: () => (st.sched === 'cosine' ? 0 : st.Tn === 1000 ? 1 : 2), act: i => { st.sched = i ? 'linear' : 'cosine'; st.Tn = i === 2 ? 200 : 1000; draw(); } },
      { type: 'toggle', label: 'Square roots in the shortcut', short: '√', get: () => st.sqrt, set: v => { st.sqrt = v; draw(); } },
      { type: 'toggle', label: 'Add fresh noise at each sampling step', short: 'sampling noise', get: () => st.sampleNoise, set: v => { st.sampleNoise = v; draw(); } },
    ];
    const readouts = [
      { label: 'Picture left', get: () => ({ v: `${Math.round(R.a * 100)}%`, sub: `of the variance at t = ${st.t}` }) },
      { label: 'Overall spread', get: () => ({ v: R.spread.toFixed(2), sub: 'should stay about 1', good: Math.abs(R.spread - 1) < 0.12, bad: Math.abs(R.spread - 1) > 0.2 }) },
      { label: 'Signal gone by', get: () => ({ v: `${R.deadAt}%`, sub: 'of the way through', good: R.deadAt > 85, bad: R.deadAt < 50 }) },
    ];
    const labels = [
      { name: 'sched', t: 'The schedule', d: 'Orange line: the chosen step', icon: 'wave', atV: V(SX - SW / 2 - 0.12, SY + SH * 0.6, SZ) },
      { name: 'xt', t: 'Straight to step t', d: 'One formula, no loop', icon: 'spark', atV: V(-0.9, 0.3, 0.9) },
      { name: 'sample', t: 'A sample', d: 'Made by walking back from noise', icon: 'target', atV: V(2.05 + BW / 2 + 0.1, BY + BH * 0.6, SZ) },
    ];
    const reset = () => { Object.assign(st, { t: 400, sched: 'cosine', Tn: 1000, sqrt: true, sampleNoise: true }); draw(); };
    const breaks = [
      { label: 'Drop the square roots', hint: 'Mix with ᾱ and 1 − ᾱ', on: () => { reset(); st.sqrt = false; st.t = 500; draw(); }, off: reset },
      { label: 'Linear schedule in 200 steps', hint: 'Big noise steps', on: () => { reset(); st.sched = 'linear'; st.Tn = 200; draw(); }, off: reset },
      { label: 'No noise while sampling', hint: 'Remove noise, never add any', on: () => { reset(); st.sampleNoise = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.sqrt) return { ok: false, msg: `<b>The noise level is wrong.</b> Variances add, so the coefficients must be square roots: √ᾱ and √(1 − ᾱ) keep the total spread at one at every step. Mixed with ᾱ and 1 − ᾱ the spread at t = ${st.t} sags to ${R.spread.toFixed(2)}, so the middle steps look fainter than the pure noise the sampler starts from, and the network learns noise levels that never match what it meets when sampling.` };
      if (st.sched === 'linear' && st.Tn < 1000) return { ok: false, msg: `<b>The picture is gone too early.</b> Squeezing a linear schedule into 200 steps means large noise per step, so almost nothing of the picture survives by ${R.deadAt}% of the way through, and the remaining steps are spent turning noise into noise. The sample is coarse. The cosine schedule spends its steps more evenly.` };
      if (!st.sampleNoise) return { ok: false, msg: `<b>Smooth and lifeless.</b> Each reverse step should remove the predicted noise and then add a little fresh noise. Without that, every step heads for the average picture that fits, and the details wash out into a soft blur. The added noise is what keeps samples sharp and varied.` };
      return { ok: true, msg: `<b>Noise in, roller out.</b> The ${st.sched} schedule keeps ${Math.round(R.a * 100)}% of the picture\'s variance at step ${st.t}${st.sched === 'cosine' ? ' and fades it to nothing only near the end' : ' (the linear one fades faster early on)'}, the shortcut jumps there in one formula with the spread held at ${R.spread.toFixed(2)}, and sampling with fresh noise at each step gives a sharp picture.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A schedule of noise', home: true, say: 'A lilac breasted roller over the Okavango Delta. The schedule says how much of the picture survives at each of a thousand steps: teal for the picture, grey for the noise.', act: m => m.set({ t: 0, sched: 'cosine', Tn: 1000, sqrt: true, sampleNoise: true }) },
    { t: 'A shortcut', home: true, say: 'There is no need to add noise a thousand times. One formula jumps straight to any step: the picture times the square root of what survives, plus noise times the square root of the rest.', act: m => m.set({ t: 400 }) },
    { t: 'Training', home: true, say: 'Training picks a random step, makes the noisy picture in one shot, and teaches the network to predict the noise that was added.', act: m => m.set({ t: 750 }) },
    { t: 'Why square roots', home: true, say: 'Drop the square roots, and the total spread no longer stays at one. The network trains on noise levels it will never meet.', act: m => m.set({ sqrt: false, t: 500 }) },
    { t: 'Spend the steps well', home: true, say: 'Squeeze a linear schedule into two hundred steps, and the picture is gone well before the end. The last steps are wasted turning noise into noise.', act: m => m.set({ sqrt: true, sched: 'linear', Tn: 200, t: 400 }) },
    { t: 'Fresh noise', home: true, say: 'When sampling, each step removes the predicted noise and adds a little fresh noise. Leave that out, and the picture comes out smooth and lifeless.', act: m => m.set({ sched: 'cosine', Tn: 1000, sampleNoise: false }) },
  ],
  check: [
    { q: 'What does ᾱ_t represent?', options: ['How much of the original picture\'s variance survives at step t', 'The learning rate', 'The number of steps'], answer: 0, why: 'It is the product of (1 − β) up to step t.' },
    { q: 'Why are there square roots in x_t = √ᾱ x_0 + √(1−ᾱ) ε?', options: ['Variances add, so square roots keep the total spread at one', 'To make it faster', 'They are optional'], answer: 0, why: 'Without them the noise levels are wrong.' },
    { q: 'What does the network learn to predict in a DDPM?', options: ['The noise ε that was added', 'The step number', 'The schedule'], answer: 0, why: 'Removing it moves the picture back a step.' },
  ],
  terms: [
    ['DDPM', 'Denoising diffusion probabilistic model.'],
    ['β_t', 'The amount of noise added at step t.'],
    ['ᾱ_t', 'The product of (1 − β) up to t: how much signal survives.'],
    ['Closed form', 'A direct formula for x_t from x_0, skipping the intermediate steps.'],
    ['ε-prediction', 'Training the network to predict the added noise.'],
    ['Ancestral sampling', 'Reverse steps that remove predicted noise and add fresh noise.'],
  ],
  deeper: '<p><b>Why predict noise?</b> The noise has the same scale at every step, which makes it an easy, stable target; predicting the clean picture directly works too but trains less smoothly.</p><p><b>Faster sampling.</b> DDIM reuses the same trained network but takes larger, deterministic steps, cutting 1,000 steps to 50 or fewer.</p><p><b>About this machine.</b> The schedules and the one-shot noising are computed exactly; the sample board shows the typical effect of each sampling setting.</p>',
  code: {
    title: 'The schedule, the shortcut and one training step',
    note: 'Adapted from the course\'s DDPM lesson.',
    text: `
import torch

T = 1000
betas = torch.linspace(1e-4, 0.02, T)
alpha_bar = torch.cumprod(1 - betas, dim=0)

def q_sample(x0, t, eps):
    a = alpha_bar[t].view(-1, 1, 1, 1)
    return a.sqrt() * x0 + (1 - a).sqrt() * eps      # straight to step t

def train_step(model, x0):
    t = torch.randint(0, T, (x0.shape[0],))
    eps = torch.randn_like(x0)
    return ((model(q_sample(x0, t, eps), t) - eps) ** 2).mean()

def p_sample(model, x, t):
    eps = model(x, t)
    mean = (x - betas[t] / (1 - alpha_bar[t]).sqrt() * eps) / (1 - betas[t]).sqrt()
    return mean + betas[t].sqrt() * torch.randn_like(x) if t > 0 else mean   # fresh noise
`,
  },
};
