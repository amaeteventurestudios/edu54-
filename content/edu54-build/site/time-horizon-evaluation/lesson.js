// Time horizons and external evaluation (phase 15, lesson 21): a METR-style evaluation runs a hypothetical model eight times on each of 21 tasks
// whose expert completion time runs from one minute to about seventeen hours. A logistic curve of success against log task length is fitted
// live (Newton's method on the binomial likelihood); the horizon is where it crosses 50%, or 80%. Cutting the long tasks forces extrapolation,
// and real, messier work shortens the horizon: a benchmark horizon is a ceiling, not a deployment promise.
const TRUE_H = 240, BETA = 0.9, RUNS = 8;
const TASKS = Array.from({ length: 21 }, (_, k) => Math.pow(2, k / 2));
const sig = z => 1 / (1 + Math.exp(-z));
const rate = t => Math.round(sig(-BETA * (Math.log2(t) - Math.log2(TRUE_H))) * RUNS) / RUNS;
function fit(maxMin) {
  const D = TASKS.filter(t => t <= maxMin).map(t => ({ x: Math.log2(t), y: rate(t) }));
  let a = 4, b = -0.5;
  for (let it = 0; it < 200; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    D.forEach(({ x, y }) => { const p = sig(a + b * x), w = p * (1 - p) * RUNS + 1e-9; g0 += (y - p) * RUNS; g1 += (y - p) * RUNS * x; h00 += w; h01 += w * x; h11 += w * x * x; });
    h00 += 0.01; h11 += 0.01;
    const det = h00 * h11 - h01 * h01, c = x => Math.max(-1, Math.min(1, x)); a += c((h11 * g0 - h01 * g1) / det); b += c((-h01 * g0 + h00 * g1) / det) * 0.3;
  }
  const at = q => Math.pow(2, (Math.log(q / (1 - q)) - a) / b);
  return { a, b, D, h50: at(0.5), h80: at(0.8) };
}
const fmt = m => m < 60 ? `${Math.round(m)} min` : m < 60 * 48 ? `${(m / 60).toFixed(m < 600 ? 1 : 0)} h` : `${Math.round(m / 1440)} days`;

export default {
  slug: 'time-horizon-evaluation',
  title: 'Time horizons: how long a task can a model finish?',
  description: 'An evaluator runs a hypothetical model eight times on each of 21 tasks, from one minute to most of a day, and fits a curve of success against length. The horizon is where it crosses one in two.',
  overview: 'Scaling policies name thresholds in prose; they become actionable only when evaluations produce numbers. METR, an independent non-profit that grew out of ARC Evals, evaluates frontier models\' autonomous capabilities, often before release under agreement with the labs, and publishes its methods afterwards. Its headline measure is the time horizon. Assemble a suite of tasks whose expert completion times span minutes to many hours (its suites include HCAST, RE-Bench and SWAA), run the model on each, and fit a logistic curve of success probability against the logarithm of expert time. The horizon is the task length at which the curve crosses 50%. Measured this way, frontier horizons have doubled roughly every seven months since 2019, and faster in recent years. Three cautions follow from the method itself. First, the fit needs tasks on both sides of the horizon; a suite without long tasks can only extrapolate, which is why suites keep adding longer ones. Second, 50% is a choice: the 80% horizon is much shorter, and reliability is what deployment needs. Third, a horizon is an upper bound measured on clean, well-specified tasks with good tooling and no consequences; real work is messier, and models have been observed behaving differently when they can tell they are being evaluated. Teams who understand how the number is fitted are much harder to fool with a vendor\'s claim, and should run their own evaluations on their own tasks.',
  keywords: ['METR', 'time horizon', 'evaluation', 'logistic regression', 'AI capabilities', 'benchmarks', 'AI safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.05, 0.6, 0], dir: [0.05, 0.5, 1.2], half: 0.95, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { maxMin: 1100, level: 50, real: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const LX = m => -2.55 + Math.log2(Math.max(0.5, m)) * 0.48, YH = 1.1, Y0 = 0.05, CZ = 0;
    const ballsM = TASKS.map(t => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.ball(0.06, GOOD, { material: m }); b.position.set(LX(t), Y0 + rate(t) * YH, CZ); b.userData.noFit = true; S.add(b); return { b, m, t }; });
    const half = P.box(5.5, 0.025, 0.025, RED, { r: 0.006 }); half.userData.noFit = true; S.add(half);
    const vline = P.box(0.04, YH, 0.04, RED, { r: 0.01 }); vline.userData.noFit = true; S.add(vline);
    const cut = P.box(0.05, YH, 0.3, SAF, { r: 0.01 }); cut.userData.noFit = true; S.add(cut);
    let curve = null, rcurve = null;
    const floor = P.box(5.4, 0.04, 0.3, '#D8D2C4', { r: 0.03 }); floor.position.set(-0.05, 0, CZ); S.add(floor);
    const cols = TASKS.map(t => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), c = P.box(0.16, 1, 0.16, GOOD, { r: 0.02, material: m }); c.scale.y = Math.max(0.01, Y0 + rate(t) * YH - 0.05); c.position.set(LX(t), 0, CZ); S.add(c); return m; });
    S.add(P.keep(-2.85, 2.75, 1.2, -0.3, 0.3));

    let F = null;
    const REAL = 0.25;
    function draw() {
      F = fit(st.maxMin);
      ballsM.forEach((B, i) => { const used = B.t <= st.maxMin; B.m.color.set(used ? '#151827' : '#C9C4B8'); cols[i].color.set(used ? '#7FC8B8' : '#DDD8CC'); });
      const pts = [], rpts = [];
      for (let i = 0; i <= 80; i++) { const lm = -0.6 + i * 0.133, m = Math.pow(2, lm), p = sig(F.a + F.b * lm); pts.push(V(LX(m), Y0 + p * YH, CZ)); if (st.real) rpts.push(V(LX(m), Y0 + sig(F.a + F.b * (lm - Math.log2(REAL))) * YH, CZ + 0.02)); }
      if (curve) curve.parent.remove(curve); curve = P.tube(pts, 0.022, ink); curve.userData.noFit = true; S.add(curve);
      if (rcurve) { rcurve.parent.remove(rcurve); rcurve = null; }
      if (st.real) { rcurve = P.tube(rpts, 0.012, BAD); rcurve.userData.noFit = true; S.add(rcurve); }
      const q = st.level / 100, H = st.level === 50 ? F.h50 : F.h80, Hd = H * (st.real ? REAL : 1);
      half.position.set(-0.05, Y0 + q * YH, CZ + 0.12); vline.position.set(LX(Hd), Y0, CZ + 0.12);
      cut.visible = st.maxMin < 1100; cut.position.set(LX(st.maxMin) + 0.13, Y0, CZ);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const CUTS = [1100, 300, 60];
    const controls = [
      { type: 'toggle', label: 'Estimate for messier real-world work', short: 'Real work', get: () => st.real, set: v => set({ real: !!v }) },
      { type: 'buttons', label: 'Reliability level', options: ['50%', '80%'], get: () => st.level === 50 ? 0 : 1, act: i => set({ level: i ? 80 : 50 }) },
      { type: 'buttons', label: 'Longest task in the suite', options: ['17 hours', '5 hours', '1 hour'], get: () => CUTS.indexOf(st.maxMin), act: i => set({ maxMin: CUTS[i] }) },
    ];
    const readouts = [
      { label: '50% horizon', get: () => ({ v: fmt(F.h50), sub: F.h50 > st.maxMin ? 'extrapolated' : 'within the suite', bad: F.h50 > st.maxMin }) },
      { label: '80% horizon', get: () => ({ v: fmt(F.h80), sub: 'what reliable looks like' }) },
      { label: 'Tasks fitted', get: () => ({ v: `${F.D.length} of 21`, sub: `8 runs each` }) },
    ];
    const labels = [
      { name: 'fit', t: 'Success by task length', d: '1 minute left, 17 hours right', icon: 'wave', atV: V(LX(1), Y0 + YH, CZ) },
      { name: 'res', t: 'The horizon', d: 'Red: where the curve crosses', icon: 'target', atV: V(LX(1100), Y0 + 0.55 * YH, CZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Leave the long tasks out', hint: 'nothing past an hour', on: () => set({ ...D0, maxMin: 60 }), off: reset },
      { label: 'Quote the 50% horizon as reliable', hint: 'look at 80%', on: () => set({ ...D0, level: 80 }), off: reset },
      { label: 'Treat it as a promise about real work', hint: 'a ceiling, not a floor', on: () => set({ ...D0, real: true }), off: reset },
    ];
    function status() {
      if (F.h50 > st.maxMin) return { ok: false, msg: `<b>With nothing longer than ${fmt(st.maxMin)} in the suite, the model passes most of them, and the fitted horizon (${fmt(F.h50)}) is an extrapolation past the last task, not a measurement; here it is badly off, against a true ${fmt(TRUE_H)}.</b> The fit needs tasks on both sides of the crossing; suites keep adding longer tasks as horizons grow.` };
      if (st.level === 80) return { ok: false, msg: `<b>At 80% reliability the horizon is ${fmt(F.h80)}, against ${fmt(F.h50)} at 50%.</b> "Can do a ${fmt(F.h50)} task" means it finishes half of them. If you need a task done reliably, look at the higher threshold, and expect much shorter work.` };
      if (st.real) return { ok: false, msg: `<b>The benchmark horizon is ${fmt(F.h50)}, measured on clean, well-specified tasks with good tools and no consequences. On messier real work the same model might manage tasks a quarter that long, about ${fmt(F.h50 * REAL)}.</b> A horizon is a ceiling, not a floor. Evaluate on your own tasks.` };
      return { ok: true, msg: `<b>Fitted over 21 tasks from one minute to about seventeen hours, the 50% horizon is ${fmt(F.h50)}, close to the model\'s true ${fmt(TRUE_H)}, with tasks on both sides of it.</b> The 80% horizon is ${fmt(F.h80)}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A task suite', home: true, say: 'An external evaluator runs a model eight times on each of twenty-one tasks, from one minute to most of a day of expert time.', act: m => m.set({ maxMin: 1100, level: 50, real: false }) },
    { t: 'Fit the curve', home: true, say: 'Success falls as tasks get longer. A logistic curve is fitted to success against the logarithm of task length.', act: m => m.set({ maxMin: 1100, level: 50, real: false }) },
    { t: 'The horizon', home: true, say: 'Where the curve crosses one in two is the time horizon: the task length the model finishes half the time.', act: m => m.set({ maxMin: 1100, level: 50, real: false }) },
    { t: 'Long tasks matter', home: true, say: 'Leave out the long tasks and the model passes nearly everything. The horizon becomes a guess past the last data point.', act: m => m.set({ maxMin: 60, level: 50, real: false }) },
    { t: 'Half is not reliable', home: true, say: 'At eighty percent reliability, the horizon is much shorter. Deployment needs reliability.', act: m => m.set({ maxMin: 1100, level: 80, real: false }) },
    { t: 'A ceiling', home: true, say: 'Benchmark tasks are clean. Real work is messier, so treat the horizon as an upper bound, and test on your own tasks.', act: m => m.set({ maxMin: 1100, level: 50, real: true }) },
  ],
  check: [
    { q: 'What is a model\'s time horizon?', options: ['The task length at which it succeeds half the time', 'How long it can run', 'Its context window'], answer: 0, why: 'Where the fitted curve crosses 50%.', hint: 'Look at the red lines.' },
    { q: 'Why does the suite need long tasks?', options: ['The fit needs data on both sides of the crossing', 'Long tasks are cheaper', 'They don\'t matter'], answer: 0, why: 'Otherwise the horizon is extrapolated.', hint: 'Try Leave the long tasks out.' },
    { q: 'Is a benchmark horizon a promise about your work?', options: ['No: it is an upper bound on clean tasks', 'Yes', 'Only at 80%'], answer: 0, why: 'Real work is messier.', hint: 'Try Treat it as a promise.' },
  ],
  terms: [
    ['Time horizon', 'The expert task length a model completes at 50% reliability.'],
    ['Logistic fit', 'An S-shaped curve of success against log task length.'],
    ['Task suite', 'Tasks with known expert completion times, minutes to hours.'],
    ['80% horizon', 'The task length completed four times in five.'],
    ['Extrapolation', 'A value read past the range of the data.'],
    ['External evaluation', 'Testing by an organisation independent of the developer.'],
  ],
  deeper: '<p><b>Doubling.</b> Fitted across models since 2019, horizons have doubled roughly every seven months, faster in recent years; the trend is a fit, not a law.</p><p><b>Elicitation.</b> External evaluators need enough access and effort to draw out what a model can do, or they under-report, the issue in the previous lesson.</p><p><b>About this machine.</b> The model and its true four-hour horizon are hypothetical; success rates come from a true logistic curve rounded to eight runs, and the fit is computed live.</p>',
  code: {
    title: 'Fit the horizon',
    note: 'Adapted from the course\'s horizon fit (code/main.py).',
    text: `
import math

def fit_logistic(xs, ys, runs, steps=60):
    a, b = 0.0, -1.0                    # p = sigmoid(a + b * log2(minutes))
    for _ in range(steps):              # Newton's method on the binomial likelihood
        g0 = g1 = h00 = h01 = h11 = 0.0
        for x, y in zip(xs, ys):
            p = 1 / (1 + math.exp(-(a + b * x)))
            w = p * (1 - p) * runs
            g0 += (y - p) * runs; g1 += (y - p) * runs * x
            h00 += w; h01 += w * x; h11 += w * x * x
        det = h00 * h11 - h01 ** 2
        a += (h11 * g0 - h01 * g1) / det
        b += (h00 * g1 - h01 * g0) / det
    return a, b

def horizon(a, b, q=0.5):
    return 2 ** ((math.log(q / (1 - q)) - a) / b)      # minutes
`,
  },
};
