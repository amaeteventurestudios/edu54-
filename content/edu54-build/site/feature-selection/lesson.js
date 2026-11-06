// Feature selection: predicting a school's exam pass rate from twelve columns. Some help (teachers per pupil, textbooks, electricity),
// some are noise, one copies another. Each column is a pillar whose height is its importance; switch columns off and watch new-school error.
// Break it: keep all twelve with only 40 schools (noise columns fit chance), keep a duplicate column (importance split in two), select columns using the test set.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const COLS = [
  { n: 'Pupils per teacher', w: -0.9 }, { n: 'Textbooks per pupil', w: 0.7 }, { n: 'Electricity', w: 0.5 }, { n: 'Distance to town', w: -0.3 },
  { n: 'Library', w: 0.25 }, { n: 'Pupils per teacher (copy)', dup: 0 }, { n: 'Gate colour', w: 0 }, { n: 'Founded on a Tuesday', w: 0 },
  { n: 'Head\'s shoe size', w: 0 }, { n: 'Letters in name', w: 0 }, { n: 'Flag height', w: 0 }, { n: 'Random number', w: 0 },
];
function schools(n, seed) { const r = rngOf(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); return [...Array(n)].map(() => { const x = COLS.map(() => g()); x[5] = x[0] + g() * 0.05; const y = COLS.reduce((s, c, j) => s + (c.w || 0) * x[j], 0) + g() * 0.6; return { x, y }; }); }
function ridge(X, y, lam = 1e-3) { const n = X[0].length, A = [...Array(n)].map(() => new Array(n).fill(0)), b = new Array(n).fill(0); X.forEach((x, k) => { for (let i = 0; i < n; i++) { b[i] += x[i] * y[k]; for (let j = 0; j < n; j++) A[i][j] += x[i] * x[j]; } }); for (let i = 0; i < n; i++) A[i][i] += lam; for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const w = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * w[c]; w[i] = s / A[i][i]; } return w; }

export default {
  slug: 'feature-selection',
  title: 'Feature selection: fewer, better columns',
  description: 'Predict a school\'s pass rate from twelve columns: teachers per pupil, textbooks and electricity matter; the gate\'s colour and the head teacher\'s shoe size don\'t. With only 40 schools to learn from, every useless column makes predictions worse. Find the ones worth keeping, then keep a copy of a column, and choose columns using the test set.',
  overview: 'More columns are not always better. Every column the model can use is another chance to fit noise, especially when examples are few, and duplicate columns confuse what the model thinks matters. Feature selection keeps the columns that carry real signal: measure each one\'s importance (how much worse the model gets without it), drop the useless and the redundant, and check the result on held-out data. Simpler models are also cheaper, faster and easier to explain.',
  keywords: ['feature selection', 'feature importance', 'permutation importance', 'curse of dimensionality', 'multicollinearity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.12, 1.0, 1.35], half: 2.9, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { on: COLS.map((c, j) => j < 5), n: 40, cheat: false };
    let train = schools(st.n, 5); const valid = schools(200, 41), test = schools(200, 77);
    /* ---------- the pillars ---------- */
    const base = P.box(6.4, 0.1, 2.5, '#F1EEE6', { r: 0.1 }); base.position.set(0, 0, 0.3); S.add(base);
    const pillars = COLS.map((c, j) => {
      const x = -2.75 + j * 0.5, m = new THREE.MeshLambertMaterial({ color: C.teal });
      const b = P.box(0.36, 1, 0.36, C.teal, { r: 0.04, material: m }); b.position.set(x, 0.1, -0.35); b.userData.noFit = true; S.add(b);
      const sw = P.box(0.4, 0.06, 0.32, '#2C2D31', { r: 0.03 }); sw.position.set(x, 0.1, 0.45); S.add(sw);
      const knob = P.box(0.16, 0.08, 0.24, '#ccc', { r: 0.03 }); knob.position.set(x, 0.16, 0.45); knob.userData.noFit = true; S.add(knob);
      const t = S.text(c.n, { size: 0.13, weight: 800, color: '#151827', maxW: 1.2, maxH: 0.42 }); t.rotation.z = Math.PI / 2; t.position.set(x, 0.105, 1.0); S.add(t);
      S.tap(sw, () => { st.on[j] = !st.on[j]; draw(); S.sync(); });
      return { b, m, knob, x };
    });
    const errBar = P.box(0.5, 1, 0.5, C.coral, { r: 0.05 }); errBar.position.set(3.0, 0.1, 0.35); errBar.userData.noFit = true; S.add(errBar);
    const errT = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); errT.userData.noFit = true; S.add(errT);
    const errL = S.text('error on new schools', { size: 0.085, weight: 800, color: '#151827', maxW: 1.1 }); errL.position.set(3.0, 0.105, 0.82); S.add(errL);
    /* ---------- fitting and importance ---------- */
    let w = null, imp = [];
    const cols = () => st.on.map((o, j) => o ? j : -1).filter(j => j >= 0);
    const rmse = (d, ws, js) => Math.sqrt(d.reduce((s, p) => s + (js.reduce((a, j, k) => a + ws[k] * p.x[j], 0) - p.y) ** 2, 0) / d.length);
    function fit() { const js = cols(); w = js.length ? ridge(train.map(p => js.map(j => p.x[j])), train.map(p => p.y)) : []; return js; }
    // permutation importance on validation data: shuffle one column and see how much the error grows
    function importance(js) { const base0 = rmse(valid, w, js); return COLS.map((_, j) => { const k = js.indexOf(j); if (k < 0) return 0; const r = rngOf(j + 3), perm = valid.map(p => p.x[j]).sort(() => r() - 0.5); const d = valid.map((p, i) => ({ y: p.y, x: p.x.map((v, jj) => jj === j ? perm[i] : v) })); return Math.max(0, rmse(d, w, js) - base0); }); }
    function draw() {
      const js = fit(); imp = importance(js);
      const top = Math.max(0.3, ...imp);
      pillars.forEach((p, j) => { const on = st.on[j]; p.b.scale.y = Math.max(0.02, on ? imp[j] / top * 1.5 : 0.02); p.m.color.set(!on ? '#B9B6AE' : COLS[j].w || COLS[j].dup != null ? C.teal : '#E9A99E'); p.knob.position.x = p.x + (on ? 0.09 : -0.09); p.knob.material = P.mat(on ? C.green : '#8E91A3'); });
      const e = rmse(test, w, js); errBar.scale.y = Math.max(0.05, e * 0.9); errT.position.set(3.0, 0.1 + e * 0.9 + 0.25, 0.35); errT.userData.set(`${e.toFixed(2)}`);
    }
    function best() { // forward selection on validation (or, the cheat, on test)
      const ref = st.cheat ? test : valid; let chosen = [], bestE = Infinity;
      for (let step = 0; step < 12; step++) { let pick = -1, pe = bestE; for (let j = 0; j < 12; j++) { if (chosen.includes(j)) continue; const js = [...chosen, j], ws = ridge(train.map(p => js.map(i => p.x[i])), train.map(p => p.y)); const e = rmse(ref, ws, js); if (e < pe - 1e-4) { pe = e; pick = j; } } if (pick < 0) break; chosen.push(pick); bestE = pe; }
      st.on = COLS.map((_, j) => chosen.includes(j)); draw();
    }
    draw();
    const testE = () => rmse(test, w, cols()), validE = () => rmse(valid, w, cols());
    const controls = [
      { type: 'button', label: 'Keep every column but the copy', short: 'All', act: () => { st.on = COLS.map((_, j) => j !== 5); draw(); } },
      { type: 'button', label: 'Pick the best, one at a time', short: 'Select', act: () => { st.cheat = false; best(); } },
      { type: 'slider', label: 'Schools to learn from', min: 20, max: 400, step: 10, get: () => st.n, set: v => { st.n = Math.round(v); train = schools(st.n, 5); draw(); } },
    ];
    const readouts = [
      { label: 'Columns used', get: () => ({ v: cols().length }) },
      { label: 'Error on new schools', get: () => { const e = testE(); return { v: e.toFixed(2), good: e < 0.68, bad: e > 0.85 }; } },
    ];
    const labels = [
      { name: 'useful', t: 'Columns that matter', d: 'Tall: the model gets worse without it', icon: 'check', atV: V(-2.95, 0.1, -0.55) },
      { name: 'noise', t: 'Columns that don\'t', d: 'Pink: pure noise', icon: 'info', atV: V(2.75, 0.1, -0.55) },
      { name: 'switches', t: 'Switches', d: 'Tap to keep or drop a column', icon: 'box', atV: V(-2.95, 0.1, 0.45) },
      { name: 'error', t: 'Error on new schools', d: 'Lower is better', icon: 'target', atV: V(3.25, 0.1, 0.6) },
    ];
    const reset = () => { Object.assign(st, { on: COLS.map((c, j) => j < 5), n: 40, cheat: false }); train = schools(40, 5); draw(); };
    const breaks = [
      { label: 'Keep every column, 40 schools', hint: 'Six columns of noise', on: () => { reset(); st.on = COLS.map((_, j) => j !== 5); draw(); }, off: reset },
      { label: 'Keep a copy of a column', hint: 'Pupils per teacher, twice', on: () => { reset(); st.on[5] = true; st.n = 400; train = schools(400, 5); draw(); }, off: reset },
      { label: 'Choose columns on the test set', hint: 'Then report the test error', on: () => { reset(); st.cheat = true; best(); }, off: () => { st.cheat = false; reset(); } },
    ];
    function status() {
      const js = cols(), e = testE();
      if (st.cheat) return { ok: false, msg: `<b>Chosen to flatter the test.</b> Each column was kept because it lowered the error on the test schools, so the test error (${e.toFixed(2)}) has been tuned to those 200 schools and can't be trusted any more. Choose columns on validation data; the test set is for one final check.` };
      if (st.on[5] && st.on[0]) return { ok: false, msg: `<b>Two columns, one fact.</b> "Pupils per teacher" and its copy say the same thing, so the model splits the credit between them and each looks half as important as it is (two short pillars instead of one tall one). With noisier copies the weights can even swing to opposite signs. Drop one.` };
      const noise = js.filter(j => !COLS[j].w && COLS[j].dup == null).length;
      if (noise >= 4 && st.n <= 60) return { ok: false, msg: `<b>${noise} noise columns, ${st.n} schools.</b> With so few examples the model finds chance patterns in the gate colour and the head teacher's shoe size and leans on them, so error on new schools rises to ${e.toFixed(2)}. Drop them, or collect far more schools.` };
      return { ok: e < 0.68 ? true : undefined, msg: `<b>${js.length} columns, error ${e.toFixed(2)} on new schools.</b> Pillar heights show how much worse the model gets when each column is shuffled: pupils per teacher and textbooks matter most. ${noise ? `${noise} noise column${noise > 1 ? 's' : ''} still on.` : 'No noise columns left.'}` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, select: () => { st.cheat = false; best(); }, set: p => { Object.assign(st, p); if (p.n) train = schools(p.n, 5); draw(); }, all: () => { st.on = COLS.map((_, j) => j !== 5); draw(); } };
  },

  story: [
    { t: 'Twelve columns', home: true, say: 'We want to predict each school\'s exam pass rate. There are twelve columns, from pupils per teacher to the colour of the gate.', act: m => m.reset() },
    { t: 'Some matter', focus: 'useful', zoom: 1.3, say: 'Each pillar shows how much worse the model gets if that column is scrambled. Pupils per teacher, textbooks and electricity stand tall.' },
    { t: 'Noise hurts', home: true, say: 'Switch on all twelve. With only forty schools to learn from, the model finds chance patterns in the gate colour and the head teacher\'s shoe size, and its error on new schools goes up.', act: m => m.all(), wait: 5 },
    { t: 'Pick the useful ones', home: true, say: 'Forward selection adds columns one at a time, keeping each only if it lowers the error on validation schools. It stops when nothing else helps.', act: m => m.select(), wait: 5 },
    { t: 'Copies confuse', home: true, say: 'A column copied twice splits its importance in half, and the model looks less sure of something that really matters. Drop duplicates.', act: m => m.set({ on: [true, true, true, true, true, true, false, false, false, false, false, false], n: 400 }), wait: 5 },
    { t: 'More data helps too', home: true, say: 'With four hundred schools, the noise columns hurt much less. Fewer columns or more data: both tame noise. And always choose on validation data, never the test set.', act: m => m.set({ on: [true, true, true, true, true, false, true, true, true, true, true, true], n: 400 }), wait: 5 },
  ],
  check: [
    { q: 'Why can extra useless columns make a model worse?', options: ['Each one is another chance to fit noise, especially with few examples', 'They make the data smaller', 'They never do'], answer: 0, why: 'The model can lean on chance patterns that won\'t hold for new data.' },
    { q: 'What does permutation importance measure?', options: ['How much the error grows when one column is shuffled', 'How many values a column has', 'The column\'s average'], answer: 0, why: 'If scrambling a column hurts a lot, the model relies on it.' },
    { q: 'Two columns say the same thing. What happens to their importance?', options: ['It is split between them, so each looks less important', 'It doubles', 'Nothing'], answer: 0, why: 'The model can use either, so credit is shared. Drop one.' },
  ],
  terms: [
    ['Feature selection', 'Choosing which columns the model may use.'],
    ['Feature importance', 'How much a model relies on a column.'],
    ['Permutation importance', 'The rise in error when one column is shuffled.'],
    ['Multicollinearity', 'Columns that carry the same information.'],
    ['Forward selection', 'Adding columns one at a time while they still help on validation data.'],
  ],
  deeper: '<p><b>L1 regularisation</b> (lasso) selects columns automatically: it pushes the weights of unhelpful columns to exactly zero.</p><p><b>Importance is not cause.</b> Electricity matters to the prediction, but it may stand in for a school\'s wealth or its distance from a town. Importance tells you what the model uses, not what to change.</p><p><b>Trees and forests</b> report their own importances from how much each split helps, though those favour columns with many distinct values; permutation importance is fairer.</p>',
  code: {
    title: 'Permutation importance and forward selection',
    note: 'Adapted from the course\'s feature-selection lesson.',
    text: `
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.inspection import permutation_importance

model = Ridge().fit(X_train, y_train)
imp = permutation_importance(model, X_valid, y_valid, n_repeats=10, random_state=0)
for name, score in sorted(zip(columns, imp.importances_mean), key=lambda t: -t[1]):
    print(f"{name:28s} {score:.3f}")

from sklearn.feature_selection import SequentialFeatureSelector
pick = SequentialFeatureSelector(Ridge(), direction="forward", cv=5).fit(X_train, y_train)
print([c for c, keep in zip(columns, pick.get_support()) if keep])
`,
  },
};
