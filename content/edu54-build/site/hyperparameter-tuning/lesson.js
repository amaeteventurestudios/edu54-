// Hyperparameter tuning: a landscape of validation scores over two settings (learning rate, on a log scale, and tree depth).
// Grid search tries a fixed lattice; random search scatters the same number of tries; a few rounds of "zoom in near the best" refine.
// Break it: a grid too coarse to land near the peak, a learning-rate range in plain steps (all the good values crammed in one corner), and picking on the test set.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// u: log10(learning rate) from −4 to 0 → 0..1; v: depth 1..12 → 0..1. A narrow ridge in u, broad in v.
const score = (u, v) => 0.62 + 0.27 * Math.exp(-((u - 0.62) ** 2) / 0.012) * (0.55 + 0.45 * Math.exp(-((v - 0.45) ** 2) / 0.09)) + 0.03 * Math.sin(9 * v);
const HALF = 2.0, HS = 4.0;

export default {
  slug: 'hyperparameter-tuning',
  title: 'Tuning: searching for the best settings',
  description: 'The learning rate and the tree depth are settings you choose before training. Their best values hide on a narrow ridge. Search with a neat grid, scatter random tries, or zoom in near the best, and see which finds the ridge with the same nine tries. Then search the learning rate in plain steps.',
  overview: 'Hyperparameters are the settings chosen before training: learning rate, depth, number of trees, amount of regularisation. Each choice gives a different validation score, and the best combination is rarely where you guess. Grid search tries a neat lattice; random search scatters the same number of tries and usually does better, because it tests more distinct values of the setting that matters most. Rates and strengths should be searched on a log scale, and the choice must be made on validation data, never on the test set.',
  keywords: ['hyperparameter tuning', 'grid search vs random search', 'log scale learning rate', 'validation set', 'bayesian optimization'],
  orient: 'any',
  view: { target: [0, 0.4, 0], dir: [0.9, 1.0, 1.35], half: 2.9, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { method: 'random', n: 9, linear: false, onTest: false, seed: 6, shown: 0, acc: 0 };
    const X = u => -HALF + u * HS, Z = v => HALF - v * HS, H = s => Math.max(0, (s - 0.55) * 4.2);
    /* ---------- the score landscape ---------- */
    const N = 70, geo = new THREE.PlaneGeometry(HS, HS, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const lo = new THREE.Color('#2E3440'), mid = new THREE.Color('#1C9A94'), hi = new THREE.Color('#F2C94C'), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + HALF) / HS, v = (HALF - pos.getZ(i)) / HS, s = score(u, v); pos.setY(i, 0.1 + H(s)); const t = Math.floor(Math.max(0, Math.min(1, (s - 0.58) / 0.32)) * 10) / 10; cc.copy(t < 0.5 ? lo : mid).lerp(t < 0.5 ? mid : hi, t < 0.5 ? t * 2 : (t - 0.5) * 2); cols.set([cc.r, cc.g, cc.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); land.receiveShadow = true; S.add(land);
    const base = P.box(HS + 0.2, 0.27, HS + 0.2, '#5B4636', { r: 0.06 }); S.add(base);
    const axU = S.text('learning rate: 0.0001 → 1', { size: 0.15, weight: 750, maxW: 3.6 }); axU.position.set(0, 0.005, HALF + 0.35); S.add(axU);
    const axV = S.text('tree depth: 1 → 12', { size: 0.15, weight: 750, maxW: 3 }); axV.position.set(-HALF - 0.35, 0.005, 0); axV.rotation.z = Math.PI / 2; S.add(axV);
    /* ---------- the tries ---------- */
    const pins = [...Array(30)].map(() => { const g = new THREE.Group(); g.userData.noFit = true; S.add(g); const rod = P.rod(V(0, 0, 0), V(0, 1, 0), 0.015, '#FFFFFF'); g.add(rod); const head = P.ball(0.08, '#FFFFFF'); head.position.y = 1; g.add(head); return { g, rod, head }; });
    const bestT = S.text('', { size: 0.14, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.6 }); bestT.userData.noFit = true; S.add(bestT);
    let tries = [];
    function plan() {
      const r = rngOf(st.seed), n = st.n, out = [];
      // linear spacing squeezes the good learning rates (around 0.003) into the first sliver of the range
      const toU = t => st.linear ? Math.log10(Math.max(1e-4, t)) / 4 + 1 : t;
      if (st.method === 'grid') { const k = Math.round(Math.sqrt(n)); for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) out.push([toU((i + 0.5) / k), (j + 0.5) / k]); }
      else if (st.method === 'random') { for (let i = 0; i < n; i++) out.push([toU(r()), r()]); }
      else { // zoom in: three rounds, each searching a smaller box around the best so far
        let c = [0.5, 0.5], w = 1; for (let round = 0; round < 3; round++) { for (let i = 0; i < Math.round(n / 3); i++) out.push([Math.max(0, Math.min(1, c[0] + (r() - 0.5) * w)), Math.max(0, Math.min(1, c[1] + (r() - 0.5) * w))]); c = out.reduce((b, p) => score(...p) > score(...b) ? p : b, out[0]); w *= 0.4; } }
      tries = out.map(([u, v]) => ({ u, v, s: score(u, v), test: score(u, v) + 0.02 * Math.sin(u * 91 + v * 37) }));
      st.shown = 0;
    }
    function update(dt) {
      st.acc += dt * (S.reduced ? 30 : 6); while (st.acc >= 1 && st.shown < tries.length) { st.acc -= 1; st.shown++; }
      const vis = tries.slice(0, st.shown), best = vis.length ? vis.reduce((b, t) => (st.onTest ? t.test > b.test : t.s > b.s) ? t : b, vis[0]) : null;
      pins.forEach((p, i) => {
        const t = tries[i]; p.g.visible = !!t && i < st.shown; if (!p.g.visible) return;
        const h = 0.1 + H(t.s), top = h + 0.45;
        p.g.position.set(X(t.u), 0, Z(t.v)); P.setRod(p.rod, V(0, h, 0), V(0, top, 0)); p.head.position.y = top;
        p.head.material = P.mat(t === best ? C.coral : '#FFFFFF');
      });
      bestT.visible = !!best; if (best) { bestT.position.set(X(best.u), 0.1 + H(best.s) + 0.9, Z(best.v)); bestT.userData.set(`best so far: ${(best.s * 100).toFixed(1)}%`); }
    }
    plan();
    const peak = 0.62 + 0.27 * 1 * (0.55 + 0.45) + 0.03 * Math.sin(9 * 0.45);
    const bestNow = () => tries.reduce((b, t) => Math.max(b, t.s), 0);
    const controls = [
      { type: 'buttons', label: 'Search with', options: ['A grid', 'Random tries', 'Zoom in'], get: () => ['grid', 'random', 'zoom'].indexOf(st.method), act: i => { st.method = ['grid', 'random', 'zoom'][i]; plan(); } },
      { type: 'slider', label: 'Tries', min: 4, max: 25, step: 1, get: () => st.n, set: v => { st.n = Math.round(v); plan(); } },
      { type: 'button', label: 'Search again', short: 'Again', act: () => { st.seed++; plan(); } },
      { type: 'toggle', label: 'Learning rate in plain steps (not log)', short: 'Plain steps', get: () => st.linear, set: v => { st.linear = v; plan(); }, quick: false },
    ];
    const readouts = [
      { label: 'Best validation score', get: () => ({ v: `${(bestNow() * 100).toFixed(1)}%`, sub: `peak ${(peak * 100).toFixed(1)}%`, good: bestNow() > peak - 0.03, bad: bestNow() < peak - 0.1 }) },
      { label: 'Tries', get: () => ({ v: `${st.shown} / ${tries.length}` }) },
    ];
    const labels = [
      { name: 'land', t: 'The validation score', d: 'High and gold: good settings', icon: 'wave', atV: V(-HALF, 0.1, -HALF) },
      { name: 'ridge', t: 'A narrow ridge', d: 'The learning rate matters most', icon: 'spark', atV: V(X(0.62), 0.1 + H(score(0.62, 0.45)), Z(0.95)) },
      { name: 'pins', t: 'Each try', d: 'One full training run', icon: 'target', atV: V(HALF, 0.1, -HALF) },
      { name: 'axis', t: 'Searched on a log scale', d: '0.0001, 0.001, 0.01, 0.1, 1', icon: 'scale', atV: V(HALF, 0.1, HALF) },
    ];
    const reset = () => { Object.assign(st, { method: 'random', n: 9, linear: false, onTest: false, seed: 6 }); plan(); };
    const breaks = [
      { label: 'A coarse grid', hint: 'Nine tries on a 3 × 3 lattice', on: () => { reset(); st.method = 'grid'; plan(); }, off: reset },
      { label: 'Learning rate in plain steps', hint: '0.1, 0.2, 0.3 …', on: () => { reset(); st.linear = true; plan(); }, off: reset },
      { label: 'Pick the winner on the test set', hint: 'Then report its test score', on: () => { reset(); st.onTest = true; st.n = 25; plan(); }, off: reset },
    ];
    function status() {
      const b = bestNow();
      if (st.onTest) return { ok: false, msg: `<b>The test score is no longer a test.</b> Choosing the best of ${tries.length} tries by its test score picks the one that got luckiest on those particular test rows, then reports that lucky number. Pick on validation data; use the test set once, at the end.` };
      if (st.linear) return { ok: false, msg: `<b>All the good learning rates are squeezed into one corner.</b> Searching 0 to 1 in plain steps puts almost every try between 0.1 and 1, and the good values (around 0.003) sit in the first sliver. Best found ${(b * 100).toFixed(1)}%. Rates, strengths and sizes belong on a log scale.` };
      if (st.method === 'grid' && b < peak - 0.05) return { ok: false, msg: `<b>The grid missed the ridge.</b> Nine tries on a 3 × 3 lattice test only three different learning rates, and the narrow ridge falls between them: best ${(b * 100).toFixed(1)}% against a peak of ${(peak * 100).toFixed(1)}%. Random tries test nine different learning rates for the same cost.` };
      if (st.shown < tries.length) return { msg: `<b>Training run ${st.shown} of ${tries.length}…</b> Each pin is one full training with those two settings, scored on validation data.` };
      return { ok: b > peak - 0.03 ? true : undefined, msg: `<b>Best: ${(b * 100).toFixed(1)}% after ${tries.length} tries</b> (the peak is ${(peak * 100).toFixed(1)}%). ${st.method === 'random' ? 'Random tries hit nine different learning rates, so some land near the ridge (press Again to try other random picks).' : st.method === 'zoom' ? 'Each round searched a smaller box around the best so far.' : 'The grid tried every combination of a few values.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); plan(); } };
  },

  story: [
    { t: 'Settings before training', home: true, say: 'Before training, you choose settings: here the learning rate and the depth of the trees. The landscape shows the validation score for every combination.', act: m => m.reset() },
    { t: 'A narrow ridge', focus: 'ridge', zoom: 1.3, say: 'The best scores sit on a narrow ridge. The learning rate matters a lot; the depth, much less.' },
    { t: 'A grid', home: true, say: 'Grid search tries a neat lattice, three by three. But it tests only three learning rates, and the ridge falls between them.', act: m => m.set({ method: 'grid' }), wait: 5 },
    { t: 'Random tries', home: true, say: 'Random search uses the same nine tries, scattered. Now nine different learning rates are tested, and one lands near the ridge.', act: m => m.set({ method: 'random' }), wait: 5 },
    { t: 'Log scale', focus: 'axis', zoom: 1.3, say: 'The learning rate axis runs on a log scale: one ten-thousandth, one thousandth, one hundredth. Search it in plain steps and every try lands in the wrong corner.' },
    { t: 'Zoom in', home: true, say: 'Smarter searches zoom in: a few scattered tries, then more in a smaller box around the best, and again. Always judged on validation data, never on the test set.', act: m => m.set({ method: 'zoom' }), wait: 5 },
  ],
  check: [
    { q: 'Why does random search often beat grid search with the same number of tries?', options: ['It tests more distinct values of the setting that matters most', 'It is always lucky', 'Grids are slow to compute'], answer: 0, why: 'A 3 × 3 grid tests three values per setting; nine random tries test nine.' },
    { q: 'How should you search learning rates?', options: ['On a log scale: 0.0001, 0.001, 0.01…', 'In equal steps of 0.1', 'Only at 1.0'], answer: 0, why: 'Good rates span orders of magnitude; equal steps waste nearly every try.' },
    { q: 'On which data should you pick the best settings?', options: ['Validation data', 'The test set', 'The training data'], answer: 0, why: 'Picking on the test set makes its score optimistic.' },
  ],
  terms: [
    ['Hyperparameter', 'A setting chosen before training, such as learning rate or tree depth.'],
    ['Grid search', 'Trying every combination from a fixed list of values for each setting.'],
    ['Random search', 'Trying random combinations; usually finds good settings faster.'],
    ['Log scale', 'Spacing values by multiples (0.001, 0.01, 0.1) rather than equal steps.'],
    ['Bayesian optimisation', 'Choosing each next try using a model of the scores seen so far.'],
  ],
  deeper: '<p><b>Smarter searches.</b> Bayesian optimisation fits a guess of the whole landscape to the tries so far and picks the next try where it might be best. Hyperband starts many tries cheaply and only continues the promising ones.</p><p><b>Budget.</b> Each pin is a full training run. For big models, tune on a smaller model or less data first, then scale up the best settings.</p><p><b>Cross-validation</b> gives each try a steadier score than one validation split, at k times the cost.</p>',
  code: {
    title: 'Random search on a log scale',
    note: 'Adapted from the course\'s hyperparameter lesson.',
    text: `
import random

def random_search(train_and_validate, tries=9, seed=0):
    rng = random.Random(seed)
    best = None
    for _ in range(tries):
        lr = 10 ** rng.uniform(-4, 0)          # log scale: 0.0001 to 1
        depth = rng.randint(1, 12)
        score = train_and_validate(lr=lr, depth=depth)   # on validation data
        if best is None or score > best[0]:
            best = (score, lr, depth)
    return best

# a grid of the same size tests only three learning rates
grid = [(lr, d) for lr in (1e-4, 1e-2, 1) for d in (2, 6, 10)]
`,
  },
};
