// A/B testing LLM features (phase 17, lesson 21): a Lusaka e-commerce shop tests a new product-description prompt. Two thousand users a day are
// split between control and variant; the true lift in checkout is fixed at +1.2 points on a 20% base. The test runs a chosen number of days;
// CUPED (adjusting for each user's pre-period behaviour) cuts variance; peeking daily and stopping at the first p < 0.05 inflates false
// positives; testing many metrics at once needs a correction; a broken split shows up as sample-ratio mismatch. Power and error rates are
// computed live from normal approximations.
const BASE = 0.2, LIFT = 0.012, PER_DAY = 2000;
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
function test(o) {
  const n = PER_DAY * o.days / 2, varF = o.cuped ? 0.5 : 1;
  const se = Math.sqrt(2 * BASE * (1 - BASE) * varF / n);
  const power = 1 - Phi(1.96 - LIFT / se);
  const fpPeek = o.peek ? Math.min(0.6, 0.05 * (1 + 1.7 * Math.log(o.days))) : 0.05;
  const metrics = o.many ? 20 : 1, alpha = o.bh ? 0.05 / metrics : 0.05;
  const familyFP = 1 - Math.pow(1 - (o.peek ? fpPeek : alpha), metrics);
  const split = o.srm ? 0.47 : 0.5, srmFlag = o.srm;
  const detect = Math.min(0.99, o.bh && o.many ? 1 - Phi(2.81 - LIFT / se) : power);
  return { n, se, power: detect, fpPeek, familyFP, metrics, split, srmFlag, mde: 2.8 * se };
}

export default {
  slug: 'ab-testing-llm-features',
  title: 'A/B testing LLM features: do customers care?',
  description: 'An online shop in Lusaka tests a new prompt for product descriptions. See if the signal rises clear of the noise, and catch a split that is not fair.',
  overview: 'Evaluations answer whether a model can do the job on a labelled set. An A/B test answers whether users care: does the new prompt, model or setting move the product metric, here the share of visitors who check out. Both are needed: evaluations catch regressions before anyone is exposed, and experiments confirm the effect afterwards. Three things are commonly tested: prompts (wording, structure, examples), models (accuracy, cost and tail latency together), and generation parameters such as temperature and output length. Experiments with language models need the usual statistical care, and more, because outputs vary even for identical inputs. Power first: a small true lift needs many users to detect, so compute the sample size before starting and run long enough. CUPED (controlled experiments using pre-experiment data) regresses out each user\'s behaviour before the test, typically cutting variance by a third to two thirds, which is like getting more users for free. Peeking at a fixed-horizon test every day and stopping at the first p below 0.05 inflates the false-positive rate several times over; use sequential methods built for repeated looks, such as always-valid confidence sequences. Testing many metrics at once makes some "significant" by chance: about one in twenty at 95%; correct with Bonferroni or control the false-discovery rate with Benjamini–Hochberg. And check the sample ratio: if a 50/50 assignment delivers 47/53, randomisation or logging is broken and the result can\'t be trusted. Experiment platforms such as Statsig and GrowthBook implement all of these.',
  keywords: ['A/B testing', 'experimentation', 'CUPED', 'statistical power', 'sequential testing', 'LLM evaluation', 'product analytics'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { days: 14, cuped: true, peek: false, many: false, bh: true, srm: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', GREY = '#8A8577';
    /* two bell curves standing on the floor: no effect, and the true lift; a post marks the line a result must cross */
    const CX = x => -2.1 + (x + 0.015) / 0.045 * 2.9, CZ = -0.5;
    const curves = [0, 1].map(k => ({ mesh: null }));
    const zero = P.box(0.03, 0.7, 0.05, GREY, { r: 0.005 }); zero.position.set(CX(0), 0, CZ); S.add(zero);
    const truth = P.box(0.03, 0.7, 0.05, GOOD, { r: 0.005 }); truth.position.set(CX(LIFT), 0, CZ); S.add(truth);
    const crit = P.box(0.05, 0.85, 0.06, SAF, { r: 0.005 }); crit.userData.noFit = true; S.add(crit);
    /* the split: two groups of shoppers as towers */
    const spT = [0, 1].map(k => { const t = P.tower(0.4, 0.4, k ? GOOD : GREY, { h: 0.5 }); t.userData.set({ cap: '' }); t.position.set(1.3 + k * 0.5, 0, CZ); S.add(t); return t; });
    /* two habits: do not peek, correct for many metrics */
    const peek = P.lamp(GOOD, { h: 0.14, r: 0.09 }), many = P.lamp(GOOD, { h: 0.14, r: 0.09 }); peek.position.set(-1.0, 0, 0.35); many.position.set(-0.4, 0, 0.35); S.add(peek, many);
    S.add(P.keep(-2.25, 2.1, 0.95, -0.8, 0.55));

    let R = null;
    function draw() {
      R = test(st);
      curves.forEach((C, k) => {
        if (C.mesh) C.mesh.parent.remove(C.mesh);
        const mu = k ? LIFT : 0, pts = [];
        for (let i = 0; i <= 90; i++) { const x = -0.015 + i * 0.045 / 90, y = Math.exp(-((x - mu) ** 2) / (2 * R.se * R.se)); pts.push(V(CX(x), 0.03 + y * 0.72, CZ)); }
        C.mesh = P.tube(pts, 0.014, k ? GOOD : GREY); C.mesh.userData.noFit = true; S.add(C.mesh);
      });
      const z = st.bh && st.many ? 2.81 : 1.96; crit.position.set(CX(z * R.se), 0, CZ);
      spT.forEach((t, k) => t.userData.set({ h: (k ? 1 - R.split : R.split) * 1.5, color: R.srmFlag ? BAD : k ? GOOD : GREY }));
      peek.userData.set({ color: st.peek ? BAD : GOOD, on: true });
      many.userData.set({ color: R.familyFP > 0.1 ? BAD : GOOD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Days the test runs', min: 2, max: 28, step: 1, get: () => st.days, set: v => set({ days: Math.round(v) }) },
      { type: 'toggle', label: 'CUPED: adjust for each shopper\'s past behaviour', short: 'CUPED', get: () => st.cuped, set: v => set({ cuped: !!v }) },
      { type: 'toggle', label: 'Peek daily and stop at the first p < 0.05', short: 'Peek', get: () => st.peek, set: v => set({ peek: !!v }) },
      { type: 'toggle', label: 'Test twenty metrics at once', short: '20 metrics', get: () => st.many, set: v => set({ many: !!v }) },
      { type: 'toggle', label: 'Correct for many metrics', short: 'Correction', get: () => st.bh, set: v => set({ bh: !!v }) },
      { type: 'toggle', label: 'The split is broken (47/53)', short: 'Broken split', get: () => st.srm, set: v => set({ srm: !!v }) },
    ];
    const readouts = [
      { label: 'Power', get: () => ({ v: `${Math.round(R.power * 100)}%`, sub: 'to detect +1.2 points', good: R.power >= 0.8, bad: R.power < 0.5 }) },
      { label: 'False wins', get: () => ({ v: `${Math.round(R.familyFP * 100)}%`, sub: 'chance by noise', good: R.familyFP <= 0.06, bad: R.familyFP > 0.1 }) },
      { label: 'Split', get: () => ({ v: `${Math.round(R.split * 100)}/${Math.round((1 - R.split) * 100)}`, sub: R.srmFlag ? 'mismatch' : 'as assigned', good: !R.srmFlag, bad: R.srmFlag }) },
    ];
    const labels = [
      { name: 'curve', t: 'Noise against the effect', d: 'Gold post: the bar to clear', icon: 'chart', atV: V(CX(0), 0.72, CZ) },
      { name: 'split', t: 'The split', d: 'Unequal towers: a broken split', icon: 'target', atV: V(2.02, 0.3, CZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Peek every day', hint: 'stop at the first win', on: () => set({ ...D0, peek: true }), off: reset },
      { label: 'Test twenty metrics, uncorrected', hint: 'one wins by chance', on: () => set({ ...D0, many: true, bh: false }), off: reset },
      { label: 'Ignore a broken split', hint: '47/53', on: () => set({ ...D0, srm: true }), off: reset },
    ];
    function status() {
      if (st.srm) return { ok: false, msg: '<b>The assignment was meant to be 50/50 and delivered 47/53: a sample ratio mismatch.</b> Something in randomisation or logging is broken, perhaps the variant\'s slower page loses some sessions before they are recorded. Don\'t read the result; find the bug first.' };
      if (st.peek) return { ok: false, msg: `<b>Looking every day and stopping at the first p below 0.05 raises the chance of a false win to about ${Math.round(R.fpPeek * 100)}% over ${st.days} days, against 5% for one look.</b> If you must look early, use a sequential test built for repeated looks.` };
      if (st.many && !st.bh) return { ok: false, msg: `<b>Twenty metrics at 95% each: the chance that at least one shows a "significant" change by noise alone is ${Math.round(R.familyFP * 100)}%.</b> Name the primary metric beforehand, and correct the rest with Bonferroni or Benjamini–Hochberg.` };
      if (R.power < 0.8) return { ok: false, msg: `<b>After ${st.days} days the test can only reliably detect lifts of about ${(R.mde * 100).toFixed(1)} points; the real effect is 1.2, so it has a ${Math.round(R.power * 100)}% chance of finding it.</b> ${st.cuped ? 'Run longer.' : 'Use CUPED to halve the variance, or run longer.'} A null result from an underpowered test says nothing.` };
      return { ok: true, msg: `<b>${st.days} days, ${R.n.toLocaleString('en')} shoppers per arm${st.cuped ? ' and CUPED' : ''}: a ${Math.round(R.power * 100)}% chance of detecting the real 1.2-point lift, with ${Math.round(R.familyFP * 100)}% chance of a false win${st.many ? ', corrected across twenty metrics' : ''}.</b> Sized before it started, read once at the end.` };
    }
    return { update: dt => { spT.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Do shoppers care?', home: true, say: 'An online shop in Lusaka tests a new prompt for product descriptions. Only an experiment says whether more shoppers check out.', act: m => m.set({ days: 3, cuped: false, peek: false, many: false, bh: true, srm: false }) },
    { t: 'Too short to tell', home: true, say: 'After three days the noise is wider than the real effect. A null result here means nothing.', act: m => m.set({ days: 3, cuped: false, peek: false, many: false, bh: true, srm: false }) },
    { t: 'Less noise', home: true, say: 'Run two weeks, and adjust for each shopper\'s past behaviour. The curves separate.', act: m => m.set({ days: 14, cuped: true, peek: false, many: false, bh: true, srm: false }) },
    { t: 'Peeking', home: true, say: 'Look every day and stop at the first good number, and false wins become several times more likely.', act: m => m.set({ days: 14, cuped: true, peek: true, many: false, bh: true, srm: false }) },
    { t: 'Many metrics', home: true, say: 'Test twenty metrics at once and one will look significant by chance. Correct for it.', act: m => m.set({ days: 14, cuped: true, peek: false, many: true, bh: false, srm: false }) },
    { t: 'Check the split', home: true, say: 'If fifty-fifty came out forty-seven to fifty-three, something is broken. Fix it before reading anything.', act: m => m.set({ days: 14, cuped: true, peek: false, many: false, bh: true, srm: true }) },
  ],
  check: [
    { q: 'What does an A/B test answer that an evaluation doesn\'t?', options: ['Whether users change their behaviour', 'Whether the model is accurate', 'Whether it is cheap'], answer: 0, why: 'Evaluations use a fixed labelled set.', hint: 'Read the overview.' },
    { q: 'Why is peeking daily a problem?', options: ['It inflates false positives', 'It slows the test', 'It reduces power'], answer: 0, why: 'Use sequential tests for repeated looks.', hint: 'Try Peek every day.' },
    { q: 'A 50/50 split delivered 47/53. What now?', options: ['Find the bug before reading the result', 'Trust the result', 'Run it longer'], answer: 0, why: 'Sample ratio mismatch.', hint: 'Try Ignore a broken split.' },
  ],
  terms: [
    ['A/B test', 'A randomised experiment comparing variants on live users.'],
    ['Power', 'The chance a test detects an effect that is really there.'],
    ['CUPED', 'Adjusting for pre-experiment behaviour to cut variance.'],
    ['Sequential testing', 'Methods that stay valid when you look repeatedly.'],
    ['Multiple comparisons', 'Many metrics make some significant by chance.'],
    ['Sample ratio mismatch', 'A split that doesn\'t match the assignment.'],
  ],
  deeper: '<p><b>Variance from the model.</b> The same prompt gives different outputs between runs, so variance includes the model\'s, not just the users\'; more traffic per arm helps.</p><p><b>Multi-objective.</b> Model tests weigh quality against cost and tail latency; decide the trade-off before the test, not after.</p><p><b>About this machine.</b> The shop\'s traffic, base rate and true lift are illustrative; power, minimum detectable effect and false-positive rates use normal approximations, computed live.</p>',
  code: {
    title: 'Size the test before you start',
    note: 'Written for this lesson.',
    text: `
from math import sqrt
from statistics import NormalDist
Z = NormalDist().inv_cdf

def users_per_arm(base_rate, lift, alpha=0.05, power=0.8, variance_factor=1.0):
    var = 2 * base_rate * (1 - base_rate) * variance_factor   # CUPED: factor ~0.5
    return math.ceil(var * (Z(1 - alpha / 2) + Z(power)) ** 2 / lift ** 2)

def srm(control, variant, expected=0.5):
    n = control + variant
    z = (control - expected * n) / sqrt(n * expected * (1 - expected))
    return abs(z) > 3        # treat as broken

users_per_arm(0.20, 0.012)                       # ~17,800 per arm
users_per_arm(0.20, 0.012, variance_factor=0.5)  # ~8,900 with CUPED
`,
  },
};
