// Regression testing an LLM app: a bus-booking assistant in Abuja tries a new prompt (version 2). 240 test cases in 6 categories, each judged for correctness,
// tone and safety. In truth v2 is better on average but worse at changing trips (78% → 62% correct) and at staying safe out of scope (97% → 91%).
// Each run draws one random number per case and criterion and shares it between versions (the same case is easy or hard for both), with 15% of draws independent.
// Paired difference: (fixed − broken)/n with standard error √(fixed + broken − (fixed − broken)²/n)/n; unpaired: each version on its own cases, √(p₁q₁/n + p₂q₂/n).
// The gate holds if any checked difference has its whole 95% interval below zero, or if safety has any net new unsafe answers. "Run again" draws new random numbers.
const CATS = ['Booking a seat', 'Changing a trip', 'Refunds', 'Lost luggage', 'Routes and times', 'Out of scope'];
const CORR = [[0.80, 0.90], [0.78, 0.62], [0.72, 0.85], [0.75, 0.86], [0.82, 0.90], [0.70, 0.80]];
const TONE = [0.85, 0.9], SAFE = c => c === 5 ? [0.97, 0.91] : [1, 1];
const PER = 40, NS = [2, 8, 40], CRIT = ['Correct', 'Tone', 'Safe'];
function draw(seedv) {
  let s = seedv >>> 0; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  return CATS.map(() => Array.from({ length: PER }, () => [0, 1, 2].map(() => ({ u: r(), v: r(), own: r() < 0.15, w: r() }))));
}
function run(st) {
  const D = draw(st.seed), n = NS[st.n];
  const cases = [];
  CATS.forEach((_, c) => {
    for (let i = 0; i < n; i++) {
      const R = D[c][i], probs = [CORR[c], TONE, SAFE(c)];
      const res = probs.map((p, k) => {
        const d = R[k], a = d.u < p[0];
        /* paired: same case, mostly the same draw; unpaired: v2 runs on a different case */
        const u2 = !st.paired ? d.w : d.own ? d.v : d.u;
        return [a, u2 < p[1]];
      });
      cases.push({ c, i, res });
    }
  });
  const diff = (list, k) => {
    const N = list.length; if (!N) return null;
    const a = list.filter(x => x.res[k][0]).length, b = list.filter(x => x.res[k][1]).length;
    const fixed = list.filter(x => !x.res[k][0] && x.res[k][1]).length, broken = list.filter(x => x.res[k][0] && !x.res[k][1]).length;
    const d = (b - a) / N, p1 = a / N, p2 = b / N;
    const se = st.paired ? Math.sqrt(Math.max(0, fixed + broken - (fixed - broken) ** 2 / N)) / N : Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / N);
    const lo = d - 1.96 * se, hi = d + 1.96 * se;
    return { N, p1, p2, d, lo, hi, fixed, broken, worse: hi < 0, better: lo > 0 };
  };
  const overall = CRIT.map((_, k) => diff(cases, k));
  const slices = CATS.map((_, c) => diff(cases.filter(x => x.c === c), 0));
  const checks = [{ name: 'correct, overall', D: overall[0] }];
  if (st.crit) checks.push({ name: 'tone', D: overall[1] }, { name: 'safety', D: overall[2] });
  if (st.slice) slices.forEach((D, c) => checks.push({ name: `correct, ${CATS[c].toLowerCase()}`, D }));
  /* safety is zero-tolerance: any net new unsafe answer holds the release */
  if (st.crit) { const sf = overall[2]; sf.worse = sf.broken > sf.fixed; }
  const fails = checks.filter(x => x.D && x.D.worse);
  return { cases, overall, slices, fails, ship: !fails.length, n, safeOut: diff(cases.filter(x => x.c === 5), 2) };
}

export default {
  slug: 'evaluation-2',
  title: 'Regression tests: is the new prompt really better?',
  description: 'A bus-booking assistant in Abuja has a new prompt that scores higher on average. Check every category before the gate lets it ship.',
  overview: 'Every change to a prompt, model or retrieval step can fix some cases and break others, so each change gets a before-and-after run on a fixed test set: a golden set of core cases, adversarial cases that try to break the system, and samples of real traffic. Run both versions on the same cases and compare them case by case: only the cases that flipped carry information, which makes the comparison far tighter than two separate scores. Put a 95% interval on the difference; with 50 cases a score of 90% could truly be anywhere from about 78% to 97%, so small sets can\'t see small regressions. Score more than one thing (correctness, tone, safety), because a prompt that answers more questions may also stop refusing the ones it should. And check each category, because an average that rises can hide one kind of request that got much worse. Wire it into the pipeline that ships changes, so a regression stops the release instead of reaching customers. Judges and their biases are covered in the lesson on evaluating LLMs.',
  keywords: ['LLM evaluation', 'regression testing', 'confidence interval', 'paired comparison', 'eval in CI', 'golden test set', 'prompt testing'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.9, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { n: 2, paired: true, slice: true, crit: true, seed: 7 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the test cases: one column of tiles per category, version 1 → version 2 */
    const GX0 = -2.62, GDX = 0.55, T = 0.088, GZ0 = -0.3, Y0 = 0.02;
    const pad = P.box(3.4, 0.02, 0.95, '#FFFFFF', { r: 0.03 }); pad.position.set(-1.25, 0, 0.0); S.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), CATS.length * PER * 2); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* behind each column, two towers: correct under v1 (grey) and under v2; and a bigger pair for the overall score */
    const TZ = -0.9, TH = 1.25;
    const pairs = [...CATS.map((_, i) => [GX0 + i * GDX, 0.19]), [0.55, 0.3]].map(([x, w]) => {
      const a = P.tower(w, w, '#B9B5AA'), b = P.tower(w, w, GOOD); a.position.set(x - w * 0.56, 0, TZ); b.position.set(x + w * 0.56, 0, TZ); a.userData.set({ cap: '' }); b.userData.set({ cap: '' }); S.add(a, b); return [a, b];
    });
    /* the release line: the new prompt rides to the gate, which opens to ship or stays shut to hold */
    const BX0 = 0.2, BX1 = 2.9, GXg = 1.95, belt = P.belt(V(BX0, 0, 0.55), V(BX1, 0, 0.55), { speed: 0.9, w: 0.42 }); S.add(belt);
    const gate = P.gate(0.6, CHAR, { h: 0.7 }); gate.position.set(GXg, 0, 0.55); gate.rotation.y = Math.PI / 2; S.add(gate);
    const lamp = P.lamp(GOOD, { h: 0.75, r: 0.12 }); lamp.position.set(GXg, 0, 0.05); S.add(lamp);
    S.add(P.keep(-2.9, 2.95, 1.45, -1.1, 0.8));
    let clock = 2.5;
    let R = null;
    const pts = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 100))}`;
    function paint() {
      R = run(st);
      let k = 0;
      R.cases.forEach(x => {
        const [a, b] = x.res[0], col0 = a && b ? GOOD : !a && !b ? '#C9C6BD' : b ? SAF : BAD;
        const cx = GX0 + x.c * GDX + ((x.i % 5) - 2) * T, cz = GZ0 + Math.floor(x.i / 5) * T;
        dummy.position.set(cx, Y0, cz); dummy.scale.set(T * 0.85, a !== b ? 0.09 : 0.03, T * 0.85); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(col0)); k++;
        const unsafe = st.crit && !x.res[2][1];
        dummy.position.set(cx, Y0 + (a !== b ? 0.09 : 0.03), cz); dummy.scale.set(unsafe ? 0.06 : 0, 0.05, unsafe ? 0.06 : 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(RED)); k++;
      });
      for (let j = k; j < CATS.length * PER * 2; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      [...R.slices, R.overall[0]].forEach((D, i) => {
        const checked = i === CATS.length || st.slice, [ta, tb] = pairs[i];
        ta.userData.set({ h: D ? 0.03 + D.p1 * TH : 0.02, color: checked ? '#9A968C' : '#D8D4C8' });
        tb.userData.set({ h: D ? 0.03 + D.p2 * TH : 0.02, color: !checked || !D ? '#D8D4C8' : D.worse ? RED : D.better ? GOOD : SAF });
      });
      gate.userData.set({ open: R.ship, color: R.ship ? GOOD : RED }); lamp.userData.set({ color: R.ship ? GOOD : RED, on: true });
    }
    paint();
    const set = p => { Object.assign(st, p); paint(); };
    const controls = [
      { type: 'buttons', label: 'Test cases', options: NS.map(n => String(n * CATS.length)), get: () => st.n, act: i => set({ n: i }) },
      { type: 'toggle', label: 'Same cases for both versions', short: 'Paired', get: () => st.paired, set: v => set({ paired: !!v }), quick: false },
      { type: 'toggle', label: 'Gate on every category', short: 'Categories', get: () => st.slice, set: v => set({ slice: !!v }) },
      { type: 'toggle', label: 'Score tone and safety too', short: 'All criteria', get: () => st.crit, set: v => set({ crit: !!v }) },
      { type: 'button', label: 'Run the eval again', act: () => set({ seed: (st.seed * 31 + 17) % 100000 }) },
    ];
    const readouts = [
      { label: 'Correct, overall', get: () => ({ v: `${pts(R.overall[0].d)} pts`, sub: `${Math.round(R.overall[0].p1 * 100)}% → ${Math.round(R.overall[0].p2 * 100)}%` }) },
      { label: 'Gate', get: () => ({ v: R.ship ? 'ship' : 'hold', sub: 'v2 is truly worse in two places', bad: R.ship, good: !R.ship }) },
      { label: 'Judge calls', get: () => ({ v: `${R.cases.length * 2 * (st.crit ? 3 : 1)}`, sub: 'per run' }) },
    ];
    const labels = [
      { name: 'cases', t: 'Test cases', d: 'A tile per case. Gold: fixed by v2. Coral: broken. Red dot: unsafe', icon: 'box', atV: V(-2.95, 0.05, 0.1) },
      { name: 'towers', t: 'Correct, v1 and v2', d: 'A pair per category; the big pair is overall', icon: 'chart', atV: V(-2.95, 0.7, TZ) },
      { name: 'overall', t: 'Overall', d: 'Grey v1, then v2: red worse, teal better', icon: 'gauge', atV: V(0.95, 1.2, TZ) },
      { name: 'gate', t: 'The release gate', d: 'Open ships v2; shut holds it', icon: 'check', atV: V(2.95, 0.3, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Gate on the average', hint: 'one number: overall correctness', on: () => set({ ...D0, slice: false, crit: false }), off: reset },
      { label: 'Score correctness only', hint: 'no tone or safety', on: () => set({ ...D0, crit: false }), off: reset },
      { label: 'Twelve test cases', hint: 'two per category', on: () => set({ ...D0, n: 0 }), off: reset },
    ];
    function status() {
      const O = R.overall[0], ch = R.slices[1], sf = R.overall[2], so = R.safeOut, nu = Math.max(0, sf.broken - sf.fixed), reqs = `${nu} out-of-scope ${nu === 1 ? 'request' : 'requests'}`;
      if (R.ship) {
        if (st.n === 0) return { ok: false, msg: `<b>Twelve cases: the gate ships v2, but only because it can't see anything.</b> With two cases a category, the interval on the overall difference runs from ${pts(O.lo)} to ${pts(O.hi)} points. A drop of sixteen points in changing trips is invisible at this size. Use a few hundred cases for decisions.` };
        if (!st.slice && !st.crit) return { ok: false, msg: `<b>Correctness only, on the average: ${pts(O.d)} points, so the gate ships v2.</b> It never looked at safety, where v2 now answers ${reqs} it used to refuse (${Math.round(so.p1 * 100)}% → ${Math.round(so.p2 * 100)}% safe out of scope), or at changing trips (${Math.round(ch.p1 * 100)}% → ${Math.round(ch.p2 * 100)}%). Score every criterion that matters.` };
        if (!st.slice) return { ok: false, msg: `<b>Gate on the average: overall correctness is ${pts(O.d)} points, so it ships.</b> But changing a trip went from ${Math.round(ch.p1 * 100)}% to ${Math.round(ch.p2 * 100)}% correct; ${ch.broken} cases that worked now fail. An average that rises can hide one kind of request that got much worse. Check each category.` };
        return { ok: false, msg: `<b>The gate ships v2, but v2 is truly worse at changing trips and at safety.</b> This run's intervals were too wide to show it${st.paired ? '' : '; comparing different cases for each version adds noise that pairing removes'}. Run again, or add cases.` };
      }
      if (!st.crit) return { ok: false, msg: `<b>The gate holds, but it can't see safety.</b> Scoring correctness only, it caught changing trips, yet v2 also answers ${reqs} it used to refuse (${Math.round(so.p1 * 100)}% → ${Math.round(so.p2 * 100)}% safe out of scope). Fix the trips and this gate would ship an unsafe prompt. Score every criterion that matters, and hold on any new unsafe answer.` };
      const why = R.fails.map(f => f.name === 'safety' ? `safety (${f.D.broken - f.D.fixed} new unsafe ${f.D.broken - f.D.fixed === 1 ? 'answer' : 'answers'})` : `${f.name} (${pts(f.D.d)} points, interval ${pts(f.D.lo)} to ${pts(f.D.hi)})`).join('; ');
      return { ok: true, msg: `<b>The gate holds v2: ${why}.</b> v2 is ${pts(O.d)} points better overall, yet worse where it matters. ${st.paired ? `Comparing the same cases, only the ${O.fixed + O.broken} that flipped decide the overall result, which keeps intervals tight.` : 'Pair the cases to tighten every interval.'}` };
    }
    const update = dt => {
      pairs.forEach(([a, b]) => { a.userData.tick(dt); b.userData.tick(dt); }); gate.userData.tick(dt); belt.userData.tick(dt);
      clock += dt; if (clock > 3) { clock = 0; belt.userData.send(SAF, { stop: R.ship ? 1 : (GXg - 0.3 - BX0) / (BX1 - BX0) }); }
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A new prompt', home: true, say: 'A bus-booking assistant in Abuja has a new prompt. Both versions answer the same two hundred and forty test cases, and a judge marks each one. Gold tiles are cases the new prompt fixed; coral ones it broke.', act: m => m.set({ n: 2, paired: true, slice: false, crit: false, seed: 7 }) },
    { t: 'Better on average', home: true, say: 'Overall, version two is several points better, and the interval on the difference sits clear of zero. Judged on the average alone, the gate says ship.', act: m => m.set({ slice: false }) },
    { t: 'Check every category', home: true, say: 'Look category by category. Changing a trip got much worse: many cases that worked now fail. The average hid it.', act: m => m.set({ slice: true }) },
    { t: 'Score more than correctness', home: true, say: 'Score tone and safety too. The new prompt answers out-of-scope requests it used to refuse: red dots. The gate holds.', act: m => m.set({ crit: true }) },
    { t: 'Small test sets', home: true, say: 'With twelve cases, every interval is so wide that nothing is clearly worse, and the gate waves the regression through.', act: m => m.set({ n: 0 }) },
    { t: 'Same cases, both versions', home: true, say: 'Back at full size, run both versions on the same cases. Only the cases that flipped carry information, so the intervals stay tight. Wire this into every release.', act: m => m.set({ n: 2, paired: true }) },
  ],
  check: [
    { q: 'v2 scores higher on average. Why might it still be worse?', options: ['It can be worse in one category or on another criterion, hidden by the average', 'Averages are always wrong', 'Higher scores mean overfitting'], answer: 0, why: 'Gate on each category and each criterion that matters.', hint: 'Turn off Gate on every category.' },
    { q: 'Why compare both versions on the same test cases?', options: ['Only the cases that flipped carry information, so the difference is measured more precisely', 'It is cheaper', 'Judges require it'], answer: 0, why: 'Pairing removes the noise of which cases happened to be in each set.', hint: 'Switch Paired off and watch the intervals widen.' },
    { q: 'What does a 95% interval of −4 to +12 points on a difference tell you?', options: ['The data can\'t rule out either a small drop or a large gain', 'v2 is better', 'v2 is worse'], answer: 0, why: 'Only an interval entirely below zero shows a regression.', hint: 'Try twelve test cases.' },
  ],
  terms: [
    ['Regression test', 'Rerunning a fixed test set after every change to catch anything that got worse.'],
    ['Golden set', 'Curated test cases for the core uses, with known good answers.'],
    ['Paired comparison', 'Comparing two versions on the same cases, case by case.'],
    ['Confidence interval', 'A range that, 95 times in 100, contains the true difference.'],
    ['Slice', 'A category of cases, such as one kind of request, checked on its own.'],
    ['Eval gate', 'A rule in the release pipeline that holds a change when tests show a regression.'],
  ],
  deeper: '<p><b>What goes in the test set.</b> A golden set of 50 to 100 core cases, 20 to 50 adversarial ones (injection attempts, out-of-scope requests, ambiguous questions), and a few hundred samples of real traffic, refreshed as usage shifts. Keep them apart from the examples in your prompt or training data.</p><p><b>How big.</b> With 50 cases at 90%, the interval runs from about 78% to 97%; at 200 it narrows to about 85% to 94%; to compare two close systems use 500 or more. Pairing helps most when the versions mostly agree.</p><p><b>Cost.</b> Every case times every criterion is a judge call. Run a small fast suite on every change and the full suite before release; cache answers that didn\'t change.</p><p><b>About this machine.</b> True pass rates are set per category and version; each run draws the outcomes, sharing most of the randomness between versions on the same case. Intervals use the normal approximation; with very few cases they are rough.</p>',
  code: {
    title: 'A paired regression gate',
    note: 'Adapted from the course\'s evaluation lesson.',
    text: `
import math

def paired_diff(v1, v2):                   # lists of 0/1 for the same cases
    n = len(v1)
    fixed = sum(1 for a, b in zip(v1, v2) if not a and b)
    broken = sum(1 for a, b in zip(v1, v2) if a and not b)
    d = (fixed - broken) / n
    se = math.sqrt(fixed + broken - (fixed - broken) ** 2 / n) / n
    return d, d - 1.96 * se, d + 1.96 * se

def gate(results):                         # {(criterion, category): (v1, v2)}
    worse = [key for key, (v1, v2) in results.items() if paired_diff(v1, v2)[2] < 0]
    return ("hold", worse) if worse else ("ship", [])
`,
  },
};
