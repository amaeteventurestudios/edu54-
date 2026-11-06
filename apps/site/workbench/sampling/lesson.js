// Sampling methods: how to draw random numbers that follow any shape, here a two-humped curve of daily rainfall.
// Rejection: throw darts at a box, keep the ones under the curve. Inverse CDF: one uniform number, read across the running total.
// MCMC: a walker that proposes a step and takes it more often uphill. The bars in front fill up with what each method draws.
// Break it: a box far too tall (most darts wasted), a walker with tiny steps (stuck on one hump), a walker with giant steps (always refused).
const BINS = 30, XL = -2.5, XW = 5, HT = 2.0, ZC = -0.5, ZH = ZC + 0.1;   // the bars stand just in front of the curve's wall
const g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const pRaw = x => 0.6 * g(x, 0.3, 0.075) + 0.4 * g(x, 0.73, 0.055);
const GRID = [...Array(401)].map((_, i) => i / 400), Z = GRID.reduce((a, x) => a + pRaw(x), 0) / 400;
const p = x => (x < 0 || x > 1) ? 0 : pRaw(x) / Z;                  // a proper density on 0..1
const PMAX = Math.max(...GRID.map(p));
const CDF = (() => { const c = [0]; for (let i = 1; i <= 400; i++) c.push(c[i - 1] + (p(GRID[i - 1]) + p(GRID[i])) / 2 / 400); return c.map(v => v / c[400]); })();
const invCDF = u => { let lo = 0, hi = 400; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CDF[m] < u) lo = m; else hi = m; } return (lo + (u - CDF[lo]) / Math.max(1e-9, CDF[hi] - CDF[lo])) / 400; };
const X = x => XL + x * XW, Y = d => d / PMAX * HT;

export default {
  slug: 'sampling',
  title: 'Sampling: drawing from any shape',
  description: 'A computer can only make flat random numbers, yet models need samples from every kind of shape. Throw darts and keep the ones under the curve, read across a running total, or send a walker uphill, and watch the bars fill into the right shape. Then waste darts, freeze the walker, and make it refuse every step.',
  overview: 'Random number generators give flat randomness: every value between 0 and 1 equally likely. Models need samples from other shapes: the noise in a diffusion model, the next word of a language model, the posterior of a Bayesian model. Three classic tricks get there. Rejection sampling throws darts and keeps those under the curve. The inverse-CDF method feeds a flat number through the running total. MCMC walks around, stepping uphill more often than down, and spends time in each place in proportion to its height.',
  keywords: ['sampling methods', 'rejection sampling', 'inverse transform sampling', 'mcmc metropolis hastings', 'monte carlo'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.15, 0.6, 1.45], half: 3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { method: 'rej', boxK: 1.15, step: 0.08, hist: new Array(BINS).fill(0), n: 0, tried: 0, x: 0.3, prop: null, last: null, seed: 5, acc: 0 };
    const rnd = () => { st.seed = (st.seed * 16807) % 2147483647; return st.seed / 2147483647; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    /* ---------- the board, the curve wall and the histogram ---------- */
    const base = P.box(XW + 0.7, 0.1, 2.2, '#F1EEE6', { r: 0.1 }); base.position.set(0, 0, 0); S.add(base);
    const wall = P.box(XW + 0.3, HT * 1.25 + 0.1, 0.05, '#FFFFFF', { r: 0.02 }); wall.position.set(0, 0.1, ZC - 0.05); S.add(wall);
    const curve = P.tube(GRID.map(x => V(X(x), 0.1 + Y(p(x)), ZC + 0.2)), 0.03, C.plum, { seg: 400 }); S.add(curve);
    const cdfT = P.tube(GRID.map((x, i) => V(X(x), 0.1 + CDF[i] * HT, ZC + 0.22)), 0.022, C.gold, { seg: 400 }); S.add(cdfT);
    const boxTop = P.box(XW, 0.025, 0.04, C.coral, { r: 0 }); boxTop.position.set(0, 0, ZC); boxTop.userData.noFit = true; S.add(boxTop);
    const bars = [...Array(BINS)].map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#4CC6C0', transparent: true, opacity: 0.6, depthWrite: false }); const b = P.box(XW / BINS * 0.86, 1, 0.12, C.teal, { r: 0.01, material: m, cast: false }); b.position.set(X((i + 0.5) / BINS), 0.1, ZH); b.userData.noFit = true; S.add(b); return b; });
    const barT = S.text('bars: what was drawn · line: the shape we want', { color: '#151827', size: 0.13, weight: 800, maxW: 4.6 }); barT.position.set(0, 0.105, 0.55); S.add(barT);
    // darts: the most recent 160
    const DM = 160, darts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial(), DM); darts.userData.noFit = true; darts.layers.set(1); S.add(darts);
    const dq = []; const dummy = new THREE.Object3D(), col = new THREE.Color();
    // the inverse-CDF path and the walker
    const across = P.rod(V(), V(0, 1, 0), 0.02, C.gold), down = P.rod(V(), V(0, 1, 0), 0.02, C.gold); [across, down].forEach(r => { r.userData.noFit = true; S.add(r); });
    const walker = P.ball(0.1, C.orange); walker.userData.noFit = true; S.add(walker);
    const ghost = P.ball(0.08, '#FFFFFF'); ghost.userData.noFit = true; ghost.material = new THREE.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.7 }); S.add(ghost);
    const add = x => { const b = Math.floor(x * BINS); if (b >= 0 && b < BINS) { st.hist[b]++; st.n++; } };
    function clear() { st.hist = new Array(BINS).fill(0); st.n = 0; st.tried = 0; dq.length = 0; st.x = 0.3; st.last = null; st.prop = null; }
    function draw1() {
      st.tried++;
      if (st.method === 'rej') {
        const x = rnd(), y = rnd() * PMAX * st.boxK, ok = y < p(x);
        dq.push({ x, y, ok }); if (dq.length > DM) dq.shift();
        if (ok) add(x);
      } else if (st.method === 'inv') {
        const u = rnd(), x = invCDF(u); st.last = { u, x }; add(x);
      } else {
        const xp = st.x + gauss() * st.step, a = p(xp) / Math.max(1e-12, p(st.x));
        const ok = rnd() < a; st.prop = { xp, ok };
        if (ok) { st.x = xp; st.acc++; }
        add(st.x);
      }
    }
    function update(dt) {
      st.t = (st.t || 0) + dt * (S.reduced ? 160 : 80);
      while (st.t >= 1) { st.t -= 1; if (st.n < 4000) draw1(); }
      const peak = Math.max(...st.hist, 1), width = 1 / BINS;
      // bars scaled as a density, so a perfect sample matches the curve's height
      bars.forEach((b, i) => { const dens = st.n ? st.hist[i] / st.n / width : 0; b.scale.y = Math.max(0.01, Math.min(HT * 1.2, Y(dens))); });
      darts.visible = st.method === 'rej';
      for (let i = 0; i < DM; i++) {
        const d = dq[i];
        dummy.position.set(d ? X(d.x) : 0, d ? 0.1 + Y(d.y) : -5, ZC + 0.25); dummy.scale.setScalar(d ? 1 : 0.0001); dummy.updateMatrix(); darts.setMatrixAt(i, dummy.matrix);
        darts.setColorAt(i, col.set(d && d.ok ? '#3E9B5F' : '#D9483B'));
      }
      darts.instanceMatrix.needsUpdate = true; if (darts.instanceColor) darts.instanceColor.needsUpdate = true;
      boxTop.visible = st.method === 'rej'; boxTop.position.set(0, 0.1 + Math.min(HT * 1.25, Y(PMAX * st.boxK)), ZC + 0.24);
      cdfT.visible = st.method === 'inv';
      const L = st.last; across.visible = down.visible = st.method === 'inv' && !!L;
      if (L) { P.setRod(across, V(XL, 0.1 + L.u * HT, ZC + 0.24), V(X(L.x), 0.1 + L.u * HT, ZC + 0.24)); P.setRod(down, V(X(L.x), 0.1 + L.u * HT, ZC + 0.24), V(X(L.x), 0.1, ZC + 0.24)); }
      walker.visible = ghost.visible = st.method === 'mcmc';
      walker.position.set(X(Math.max(0, Math.min(1, st.x))), 0.1 + Y(p(st.x)) + 0.1, ZC + 0.25);
      if (st.prop) { const xp = Math.max(-0.05, Math.min(1.05, st.prop.xp)); ghost.position.set(X(xp), 0.1 + Y(p(xp)) + 0.1, ZC + 0.25); ghost.material.color.set(st.prop.ok ? '#9FDDB2' : '#F4A99F'); }
    }
    // how far the drawn bars are from the true curve (0 = perfect, 1 = nothing alike)
    const gap = () => { if (!st.n) return 1; let s = 0; for (let i = 0; i < BINS; i++) { const a = (i + 0.5) / BINS, t = p(a) / BINS; s += Math.abs(st.hist[i] / st.n - t); } return s / 2; };
    const rate = () => st.method === 'rej' ? (st.tried ? st.n / st.tried : 0) : st.method === 'inv' ? 1 : (st.tried ? st.acc / st.tried : 0);
    const controls = [
      { type: 'buttons', label: 'Method', options: ['Darts (rejection)', 'Running total (inverse CDF)', 'Walker (MCMC)'], get: () => ['rej', 'inv', 'mcmc'].indexOf(st.method), act: i => { st.method = ['rej', 'inv', 'mcmc'][i]; st.acc = 0; clear(); } },
      { type: 'slider', label: 'Walker step size', min: 0.002, max: 2, log: true, get: () => st.step, set: v => { st.step = v; st.acc = 0; clear(); }, fmt: v => v.toFixed(v < 0.1 ? 3 : 2) },
      { type: 'button', label: 'Start again', short: 'Again', act: () => { st.acc = 0; clear(); } },
    ];
    const readouts = [
      { label: 'Samples kept', get: () => ({ v: st.n, sub: `${st.tried} tries` }) },
      { label: 'Kept or accepted', get: () => ({ v: `${Math.round(rate() * 100)}%`, bad: (st.method === 'rej' && rate() < 0.2) || (st.method === 'mcmc' && (rate() < 0.1 || rate() > 0.97)) }) },
      { label: 'Match to the curve', get: () => ({ v: `${Math.round((1 - gap()) * 100)}%`, bar: 1 - gap(), good: gap() < 0.12 && st.n > 500, bad: st.n > 1500 && gap() > 0.3 }), bar: true },
    ];
    const labels = [
      { name: 'curve', t: 'The shape we want', d: 'Rainfall: two humps, dry days and wet days', icon: 'wave', atV: V(X(0.3), 0.1 + HT, ZC) },
      { name: 'bars', t: 'What was drawn', d: 'Fills up to the line, if the method works', icon: 'box', atV: V(XL - 0.1, 0.1, ZC + 0.15) },
      { name: 'method', t: 'The method at work', d: 'Darts, a running total, or a walker', icon: 'spark', atV: V(X(0.73), 0.1 + HT * 0.8, ZC) },
      { name: 'flat', t: 'Flat randomness in', d: 'Every computer starts from this', icon: 'info', atV: V(XL + XW + 0.1, 0.1, ZC + 0.15) },
    ];
    const reset = () => { Object.assign(st, { method: 'rej', boxK: 1.15, step: 0.08, acc: 0 }); clear(); };
    const breaks = [
      { label: 'Darts at a box ten times too tall', hint: 'Rejection with a loose bound', on: () => { reset(); st.boxK = 10; clear(); }, off: reset },
      { label: 'A walker with tiny steps', hint: 'Step 0.003', on: () => { reset(); st.method = 'mcmc'; st.step = 0.003; clear(); }, off: reset },
      { label: 'A walker with giant steps', hint: 'Step 2', on: () => { reset(); st.method = 'mcmc'; st.step = 2; clear(); }, off: reset },
    ];
    function status() {
      const r = Math.round(rate() * 100), m = Math.round((1 - gap()) * 100);
      if (st.method === 'rej' && st.boxK > 3) return { ok: false, msg: `<b>${100 - r}% of darts wasted.</b> The box is ten times taller than the curve, so almost every dart lands above it and is thrown away. The kept ones still have the right shape, just very slowly. A box that hugs the curve keeps far more.` };
      if (st.method === 'mcmc' && st.step < 0.01) return { ok: false, msg: `<b>Stuck on one hump.</b> With tiny steps the walker accepts nearly every move (${r}%), but it creeps so slowly that it never crosses the dip to the second hump. The bars show one hump only: match ${m}%. A real sampler must be run long enough, with steps big enough, to visit everything.` };
      if (st.method === 'mcmc' && st.step > 1) return { ok: false, msg: `<b>Almost every step refused.</b> Giant steps mostly land far outside the humps, where the curve is near zero, so ${100 - r}% are rejected and the walker sits still, adding the same value again and again. Good walkers accept somewhere between a quarter and a half of their steps.` };
      if (st.n < 300) return { msg: `<b>Drawing…</b> ${st.method === 'rej' ? 'Darts land anywhere in the box; green ones fell under the curve and are kept.' : st.method === 'inv' ? 'Each flat number u is read across to the gold running total and dropped straight down.' : 'The walker proposes a step (white ball) and takes it for sure if it goes uphill, sometimes if downhill.'}` };
      return { ok: m > 85 ? true : undefined, msg: `<b>${st.n} samples, ${m}% match.</b> ${st.method === 'rej' ? `${r}% of darts kept.` : st.method === 'inv' ? 'Every flat number became one sample: nothing wasted, but you need the running total, which most real shapes don\'t give you.' : `${r}% of proposed steps accepted. The walker only ever needs the ratio of two heights, which is why MCMC works for shapes nobody can write down in full.`}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p2 => { Object.assign(st, p2); st.acc = 0; clear(); } };
  },

  story: [
    { t: 'The shape we want', home: true, say: 'This curve is daily rainfall in a two-season place: many dry days, and a second hump of wet ones. We want random numbers that follow this shape.', act: m => m.set({ method: 'inv' }) },
    { t: 'Darts', focus: 'curve', zoom: 1.3, say: 'The simplest trick: throw darts at a box around the curve. Keep the ones that land under the curve, in green, and throw the rest away.', act: m => m.set({ method: 'rej' }), wait: 5 },
    { t: 'The bars fill in', focus: 'bars', zoom: 1.3, say: 'Count where the kept darts landed, and the bars in front fill into the same two humps.', wait: 5 },
    { t: 'The running total', home: true, say: 'Another trick uses the running total of the curve, in gold. Take one flat random number, read across to the gold line, and drop straight down. Every number becomes a sample.', act: m => m.set({ method: 'inv' }), wait: 5 },
    { t: 'A walker', home: true, say: 'For shapes you cannot even write down in full, send a walker. It proposes a step, always takes it uphill, and sometimes downhill. Over time it visits each place as often as its height.', act: m => m.set({ method: 'mcmc', step: 0.08 }), wait: 6 },
    { t: 'Steps too small', home: true, say: 'With tiny steps, the walker never crosses the dry dip and stays on one hump forever. The answer looks confident, and it is wrong.', act: m => m.set({ method: 'mcmc', step: 0.003 }), wait: 5 },
  ],
  check: [
    { q: 'In rejection sampling, which darts are kept?', options: ['Those that land under the curve', 'All of them', 'Those that land above the curve'], answer: 0, why: 'Keeping only darts under the curve makes the kept ones follow its shape.' },
    { q: 'Why is a box much taller than the curve a problem?', options: ['It gives the wrong shape', 'Most darts land above the curve and are wasted', 'It is not a problem'], answer: 1, why: 'The shape is still right, but the method becomes very slow.' },
    { q: 'An MCMC walker with tiny steps shows only one hump. Why?', options: ['It never crosses the dip to the other hump', 'The curve changed', 'It rejects every step'], answer: 0, why: 'Small steps rarely cross low regions, so the walker gets stuck where it started.' },
  ],
  terms: [
    ['Sampling', 'Drawing random values that follow a given distribution.'],
    ['Rejection sampling', 'Throw uniform darts in a box around the curve; keep those under it.'],
    ['Inverse CDF', 'Feeding a flat random number through the inverse of the running total (cumulative distribution).'],
    ['MCMC', 'Markov chain Monte Carlo: a walker whose path, over time, visits places in proportion to their probability.'],
    ['Acceptance rate', 'The share of darts kept or walker steps taken.'],
  ],
  deeper: '<p><b>Sampling in language models.</b> Picking the next word is sampling from the model\'s distribution over words. Temperature, top-k and top-p reshape that distribution first; see the next-word lesson.</p><p><b>The reparameterisation trick.</b> To learn through a random draw, variational autoencoders write a sample as mean + spread × noise, so the gradient flows through the mean and spread while the noise stays outside.</p><p><b>Monte Carlo estimates.</b> The average of many samples estimates an average over the whole distribution. The error shrinks like one over the square root of the number of samples: four times the samples, half the error.</p>',
  code: {
    title: 'Three ways to sample',
    note: 'Adapted from the course\'s sampling lesson.',
    text: `
import math, random

def p(x):   # two humps on 0..1 (not normalised: the walker doesn't care)
    g = lambda m, s: math.exp(-((x - m) ** 2) / (2 * s * s))
    return 0.6 * g(0.3, 0.075) + 0.4 * g(0.73, 0.055) if 0 <= x <= 1 else 0.0

def rejection(n, top=0.65):
    out = []
    while len(out) < n:
        x, y = random.random(), random.random() * top
        if y < p(x):
            out.append(x)
    return out

def metropolis(n, step=0.08, x=0.3):
    out = []
    for _ in range(n):
        x_new = x + random.gauss(0, step)
        if random.random() < p(x_new) / p(x):   # uphill always, downhill sometimes
            x = x_new
        out.append(x)
    return out
`,
  },
};
