// Statistics for ML: is model B really better than model A? Two rows of beads show each model's answers on the test set (green right, red wrong).
// Bootstrap: resample the test set with replacement 400 times; each time measure B − A; the pile of differences shows how sure to be.
// Break it: a tiny test set (the interval straddles zero), try 20 identical models and keep the best (luck looks like skill),
// and a million examples with a 0.2% gain (certain, but too small to matter).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const BINS = 31, HX = 0.4, HW = 3.4, SHOWN = 100;

export default {
  slug: 'statistics',
  title: 'Statistics: is it really better?',
  description: 'Model B scored 83% and model A 80% on the test set. Is B really better, or was it luck? Resample the test set 400 times and watch the pile of differences tell you how sure to be. Then test on 50 examples, try 20 models, and test on a million.',
  overview: 'A test score is a measurement, and measurements wobble: a different test set would give a slightly different score. Statistics tells you how much. The bootstrap is the simplest way: draw a new test set from the old one, with replacement, hundreds of times, and see how much the score moves. If the middle 95% of the differences stays clear of zero, B is probably really better. Small test sets, many tries and tiny gains all need care.',
  keywords: ['statistics for machine learning', 'bootstrap confidence interval', 'a/b test models', 'statistical significance', 'multiple comparisons'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.4, -0.3], dir: [0.1, 1.1, 1.25], half: 2.6, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { n: 2000, pA: 0.8, pB: 0.83, many: false, seed: 3 };
    /* ---------- the beads: the first 100 test answers of each model ---------- */
    const rack = P.box(5.6, 0.1, 0.9, '#2C2D31', { r: 0.08 }); rack.position.set(0, 0, -1.55); S.add(rack);
    const beadGeo = new THREE.SphereGeometry(0.03, 8, 6);
    const rows = [0, 1].map(k => { const im = new THREE.InstancedMesh(beadGeo, new THREE.MeshLambertMaterial(), SHOWN); S.add(im); return im; });
    const rowT = ['MODEL A', 'MODEL B'].map((n, k) => { const t = S.text(n, { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 0.9 }); t.position.set(-2.35, 0.105, -1.75 + k * 0.4); S.add(t); return t; });
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the bootstrap pile ---------- */
    const board = P.box(HW + 0.6, 0.1, 1.9, '#F1EEE6', { r: 0.1 }); board.position.set(HX, 0, 0.35); S.add(board);
    const bars = [...Array(BINS)].map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: C.teal }); const b = P.box(HW / BINS * 0.85, 1, 0.5, C.teal, { r: 0.01, material: m }); b.position.set(HX - HW / 2 + HW / BINS * (i + 0.5), 0.1, 0.35); b.userData.noFit = true; S.add(b); return { b, m }; });
    const zero = P.box(0.03, 1.05, 0.6, C.red, { r: 0 }); zero.userData.noFit = true; S.add(zero);
    const zeroT = S.text('no difference', { size: 0.11, weight: 800, color: C.red, face: 'cam', bg: 'rgba(255,255,255,0.9)', top: true }); zeroT.userData.noFit = true; S.add(zeroT);
    const band = P.box(1, 0.02, 0.75, C.gold, { r: 0.02 }); band.userData.noFit = true; S.add(band);
    const axisT = S.text('', { color: '#151827', size: 0.12, weight: 800, maxW: 3.4 }); axisT.position.set(HX, 0.105, 1.15); S.add(axisT);
    /* ---------- twenty identical models (only in the "many tries" break) ---------- */
    const tries = [...Array(20)].map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#B9B6AE' }); const b = P.box(0.09, 1, 0.09, '#B9B6AE', { r: 0.01, material: m }); b.position.set(-2.55 + (i % 10) * 0.13, 0.1, 0.0 + Math.floor(i / 10) * 0.5); b.userData.noFit = true; S.add(b); return { b, m }; });
    const triesBase = P.box(1.45, 0.08, 1.0, '#E8D9B5', { r: 0.06 }); triesBase.position.set(-1.96, 0, 0.25); S.add(triesBase);
    const triesT = S.text('20 tries', { size: 0.11, weight: 800, color: '#151827', maxW: 1.2 }); triesT.position.set(-1.96, 0.085, 0.85); S.add(triesT);
    let res = null;
    function run() {
      const r = rngOf(st.seed), n = st.n, d = new Int8Array(Math.min(n, 200000)), A = [], B = [];
      let sA = 0, sB = 0;
      const m = d.length;
      for (let i = 0; i < m; i++) {
        // both models find the same examples easy or hard, plus their own noise
        const hard = r(), a = hard + 0.25 * (r() - 0.5) < st.pA, b = hard + 0.25 * (r() - 0.5) < st.pB;
        if (i < SHOWN) { A.push(a); B.push(b); }
        sA += a; sB += b; d[i] = b - a;
      }
      const accA = sA / m, accB = sB / m, mean = (sB - sA) / m;
      // bootstrap: 400 test sets drawn with replacement from this one; for a million examples the pile is the same bell, so use its formula
      const diffs = [];
      if (n <= 20000) for (let k = 0; k < 400; k++) { let s = 0; for (let i = 0; i < m; i++) s += d[Math.floor(r() * m)]; diffs.push(s / m); }
      else { let v = 0; for (let i = 0; i < m; i++) v += (d[i] - mean) ** 2; const sd = Math.sqrt(v / m / n); for (let k = 0; k < 400; k++) { const g = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); diffs.push(mean + g * sd); } }
      diffs.sort((a, b) => a - b);
      const lo = diffs[10], hi = diffs[389];
      // 20 copies of model A, each scored on its own small test set of 200: luck spreads them out
      const tr = []; for (let k = 0; k < 20; k++) { let s = 0; for (let i = 0; i < 200; i++) s += r() < st.pA; tr.push(s / 200); }
      res = { A, B, accA, accB, mean, diffs, lo, hi, tr };
    }
    function draw() {
      run();
      [res.A, res.B].forEach((row, k) => {
        for (let i = 0; i < SHOWN; i++) {
          dummy.position.set(-1.85 + i * 0.043, 0.13, -1.75 + k * 0.4); dummy.scale.setScalar(i < row.length ? 1 : 0.0001); dummy.updateMatrix(); rows[k].setMatrixAt(i, dummy.matrix);
          rows[k].setColorAt(i, col.set(row[i] ? '#3E9B5F' : '#D9483B'));
        }
        rows[k].instanceMatrix.needsUpdate = true; rows[k].instanceColor.needsUpdate = true;
      });
      // the range of the pile, drawn around zero and the middle
      const span = Math.max(0.06, Math.abs(res.lo) * 1.4, Math.abs(res.hi) * 1.4);
      const xOf = v => HX + v / span * HW / 2;
      const counts = new Array(BINS).fill(0);
      for (const v of res.diffs) { const b = Math.floor((v / span + 1) / 2 * BINS); if (b >= 0 && b < BINS) counts[b]++; }
      const peak = Math.max(...counts, 1);
      bars.forEach((b, i) => { const c = (i + 0.5) / BINS * 2 * span - span; b.b.visible = counts[i] > 0; b.b.scale.y = Math.max(0.01, counts[i] / peak * 1.3); b.m.color.set(c >= res.lo && c <= res.hi ? C.teal : '#9FCFCB'); });
      zero.position.set(xOf(0), 0.1, 0.35); zeroT.position.set(xOf(0), 1.3, 0.75);
      band.scale.x = Math.max(0.02, xOf(res.hi) - xOf(res.lo)); band.position.set((xOf(res.lo) + xOf(res.hi)) / 2, 0.1, 0.9);
      axisT.userData.set(`B − A: from ${pp(res.lo)} to ${pp(res.hi)} (95%)`);
      const best = Math.max(...res.tr);
      tries.forEach((t, i) => { t.b.visible = st.many; t.b.scale.y = Math.max(0.02, (res.tr[i] - 0.6) * 4); t.m.color.set(res.tr[i] === best ? C.gold : '#B9B6AE'); });
      triesBase.visible = triesT.visible = st.many;
    }
    const pp = v => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;
    draw();
    const verdict = () => res.lo > 0 ? 'B is better' : res.hi < 0 ? 'A is better' : 'can\'t tell';
    const controls = [
      { type: 'slider', label: 'Test examples', min: 50, max: 10000, log: true, get: () => st.n, set: v => { st.n = Math.round(v); draw(); }, fmt: v => Math.round(v).toLocaleString('en-GB') },
      { type: 'slider', label: 'Model B\'s true accuracy', min: 0.76, max: 0.9, step: 0.005, get: () => st.pB, set: v => { st.pB = v; draw(); }, fmt: v => `${(v * 100).toFixed(1)}%`, hint: 'Model A is 80%' },
      { type: 'button', label: 'Draw a new test set', short: 'New test set', act: () => { st.seed++; draw(); } },
    ];
    const readouts = [
      { label: 'Accuracy', get: () => ({ v: `A ${(res.accA * 100).toFixed(1)}% · B ${(res.accB * 100).toFixed(1)}%` }) },
      { label: 'B − A, 95% interval', get: () => ({ v: `${pp(res.lo)} to ${pp(res.hi)}`, sub: verdict(), good: res.lo > 0 && res.mean > 0.01, bad: res.lo <= 0 && res.hi >= 0 }) },
    ];
    const labels = [
      { name: 'beads', t: 'Each model\'s answers', d: 'Green right, red wrong (first 100)', icon: 'box', atV: V(-2.8, 0.1, -1.55) },
      { name: 'pile', t: '400 resampled test sets', d: 'Each bar: how often B − A came out that big', icon: 'scale', atV: V(HX - HW / 2 - 0.3, 0.1, 0.35) },
      { name: 'band', t: 'The middle 95%', d: 'How far the difference could really be', icon: 'check', at: () => band.position.clone().add(V(band.scale.x / 2, 0, 0)) },
      { name: 'zero', t: 'No difference', d: 'If the band crosses this, you can\'t tell', icon: 'info', at: () => zero.position.clone().add(V(0, 1.05, -0.3)) },
    ];
    const reset = () => { Object.assign(st, { n: 2000, pA: 0.8, pB: 0.83, many: false, seed: 3 }); draw(); };
    const breaks = [
      { label: 'Test on only 50 examples', hint: 'Same two models', on: () => { reset(); st.n = 50; draw(); }, off: reset },
      { label: 'Try 20 models, keep the best', hint: 'All 20 are really the same', on: () => { reset(); st.many = true; draw(); }, off: reset },
      { label: 'A million examples, a tiny gain', hint: 'B is 80.2%, A 80%', on: () => { reset(); st.n = 1000000; st.pB = 0.802; draw(); }, off: reset },
    ];
    function status() {
      if (st.many) { const best = Math.max(...res.tr), worst = Math.min(...res.tr); return { ok: false, msg: `<b>The "best" of 20 identical models.</b> Every one of them is really 80%, yet on its own 200-example test the scores run from ${(worst * 100).toFixed(1)}% to ${(best * 100).toFixed(1)}%. Pick the top one and you'll report a gain that is pure luck, and it vanishes on new data. Try many things on validation data, then test the winner once on fresh data.` }; }
      if (st.n >= 100000 && Math.abs(res.mean) < 0.01) return { ok: false, msg: `<b>Certain, but tiny.</b> With a million test examples the band is razor thin (${pp(res.lo)} to ${pp(res.hi)}), so B is definitely better, by about 0.2%. Statistically significant is not the same as worth it: is a fifth of a percent worth a bigger, slower model?` };
      if (res.lo <= 0 && res.hi >= 0) return { ok: false, msg: `<b>Can't tell.</b> On ${st.n.toLocaleString('en-GB')} examples B scored ${pp(res.mean)} more, but the resampled test sets put the difference anywhere from ${pp(res.lo)} to ${pp(res.hi)}: the band crosses zero. Luck alone could explain it. Test on more examples.` };
      if (res.hi < 0) return { msg: `<b>A is better here.</b> With B set below 80%, the whole band sits below zero (${pp(res.lo)} to ${pp(res.hi)}): B loses on nearly every resampled test set.` };
      return { ok: true, msg: `<b>B really is better, by ${pp(res.lo)} to ${pp(res.hi)}.</b> Across 400 test sets drawn from these ${st.n.toLocaleString('en-GB')} examples, B beat A in nearly every one; the middle 95% of the differences stays clear of zero.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); }, fit: [-3.1, 0, -2.1, 2.6, 1.9, 1.4] };
  },

  story: [
    { t: 'Who is better?', home: true, say: 'Two models answer the same two thousand test questions. Model A gets eighty percent right, model B eighty-three. Is B really better, or was it luck?', act: m => m.reset() },
    { t: 'Each answer', focus: [-0.3, 0.2, -1.55], zoom: 1.4, say: 'Here are their first hundred answers, green for right and red for wrong. Both models find the same questions hard, but not always.' },
    { t: 'Resample', focus: [0.4, 0.5, 0.35], zoom: 1.35, say: 'The bootstrap: draw a new test set from this one, picking questions at random, some twice and some not at all. Measure B minus A. Do it four hundred times and pile up the answers.' },
    { t: 'The middle 95%', home: true, say: 'The middle ninety-five percent of the pile is the gold band. It stays clear of zero, so B is really better: by between one and five points.', wait: 5 },
    { t: 'Too few questions', home: true, say: 'Test on only fifty questions, and the pile spreads wide. The band crosses zero. Now you cannot tell the two models apart.', act: m => m.set({ n: 50 }), wait: 5 },
    { t: 'Luck looks like skill', home: true, say: 'Try twenty identical models and keep the best, and the winner looks better by pure luck. Choose on validation data, then test the winner once, on fresh data.', act: m => m.set({ n: 2000, many: true }), wait: 5 },
  ],
  check: [
    { q: 'What does the bootstrap do?', options: ['Resamples the test set with replacement many times to see how much the score wobbles', 'Trains the model again', 'Removes hard questions'], answer: 0, why: 'Each resample is a plausible other test set; the spread of scores shows the uncertainty.' },
    { q: 'The 95% interval for B − A runs from −1% to +4%. What can you say?', options: ['B is better', 'You can\'t tell: zero is inside the interval', 'A is better'], answer: 1, why: 'A difference of zero is still plausible, so luck could explain B\'s higher score.' },
    { q: 'You try 20 models and report the best test score. What is the danger?', options: ['None', 'The best may just be the luckiest, and won\'t hold up on new data', 'The test set gets bigger'], answer: 1, why: 'With many tries, one will look good by chance. Pick on validation data, test once.' },
  ],
  terms: [
    ['Mean and median', 'The average, and the middle value. The median ignores outliers.'],
    ['Standard deviation', 'How spread out the values are around the mean.'],
    ['Confidence interval', 'A range that likely holds the true value, such as the middle 95% of bootstrap results.'],
    ['Bootstrap', 'Resampling your data with replacement, many times, to see how a statistic varies.'],
    ['Statistical significance', 'When a difference is unlikely to be luck alone. Not the same as being big enough to matter.'],
    ['Multiple comparisons', 'Testing many things at once: some will look significant by chance.'],
  ],
  deeper: '<p><b>Paired tests.</b> Both models answered the same questions, so compare them question by question (B − A on each). That cancels out the questions that are easy or hard for everyone and gives a much tighter interval than comparing two separate averages.</p><p><b>p-values</b> answer a narrow question: if the models were really equal, how often would a gap this big appear by luck? A small p-value says "rarely". It does not say how big or useful the gain is.</p><p><b>Correlation is not causation.</b> Two columns can rise together because a third thing drives both. Statistics can measure that they move together; only an experiment shows why.</p>',
  code: {
    title: 'A bootstrap confidence interval',
    note: 'Adapted from the course\'s statistics lesson.',
    text: `
import numpy as np

rng = np.random.default_rng(0)
a = rng.random(2000) < 0.80         # model A right or wrong on each question
b = rng.random(2000) < 0.83         # model B on the same questions
diff = b.astype(int) - a.astype(int)

boots = []
for _ in range(400):
    idx = rng.integers(0, len(diff), len(diff))   # resample with replacement
    boots.append(diff[idx].mean())

lo, hi = np.percentile(boots, [2.5, 97.5])
print(f"B - A: {diff.mean():+.1%}  (95% interval {lo:+.1%} to {hi:+.1%})")
print("B is better" if lo > 0 else "can't tell")
`,
  },
};
