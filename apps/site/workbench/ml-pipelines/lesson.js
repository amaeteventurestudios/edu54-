// ML pipelines: rows ride a conveyor through the same stations every time: fill the gaps, scale, then the model.
// The training belt learns each station's settings once (the average for gaps, the mean and spread for scaling); the live belt reuses them.
// Break it: learn the scaling from all the data including the test rows (leak), let the live belt skip a station (training–serving skew), no gap filling.
const ROWS = [
  { n: 'Asha', inc: 42, age: 31, ok: true }, { n: 'Kofi', inc: null, age: 45, ok: true }, { n: 'Zola', inc: 18, age: 22, ok: false },
  { n: 'Tunde', inc: 66, age: 38, ok: true }, { n: 'Nala', inc: 25, age: null, ok: false }, { n: 'Femi', inc: 51, age: 29, ok: true },
];
const LIVE = [{ n: 'Wanjiru', inc: 47, age: 34, ok: true }, { n: 'Sello', inc: 20, age: 27, ok: false }, { n: 'Amara', inc: null, age: 50, ok: true }];
const STX = [-1.5, 0.0, 1.5], BELT = [-2.7, 2.6], ZT = -0.7, ZL = 0.9;

export default {
  slug: 'ml-pipelines',
  title: 'Pipelines: the same steps, every time',
  description: 'Loan applications ride a conveyor through three stations: fill, scale, score. Training learns each station\'s settings once; live rows must replay them.',
  overview: 'A real model is never just the model. Data has to be cleaned, gaps filled, numbers scaled and categories encoded, in the same way for training and for every prediction afterwards. A pipeline bundles those steps with the model, learns each step\'s settings from the training data only, and replays them unchanged at prediction time. Most production bugs in machine learning are pipeline bugs: a step fitted on the wrong data, or a step that runs in training but not in the live system.',
  keywords: ['machine learning pipeline', 'training serving skew', 'data preprocessing', 'fit transform', 'sklearn pipeline'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.1, 1.5, 1.0], half: 2.7, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { leak: false, skip: false, noFill: false, t: 0, liveT: -2 };
    /* ---------- belts and stations ---------- */
    for (const [z, name, col] of [[ZT, 'TRAINING', '#5B5F73'], [ZL, 'LIVE APPLICATIONS', '#2C2D31']]) {
      const belt = P.box(BELT[1] - BELT[0], 0.1, 0.62, col, { r: 0.04 }); belt.position.set((BELT[0] + BELT[1]) / 2, 0, z); S.add(belt);
      for (let x = BELT[0] + 0.2; x < BELT[1]; x += 0.35) { const sl = P.box(0.03, 0.005, 0.6, '#8E91A3', { r: 0, cast: false }); sl.position.set(x, 0.1, z); S.add(sl); }

    }
    const NAMES = ['Fill gaps', 'Scale', 'Model'];
    const stations = NAMES.map((n, i) => {
      const g = new THREE.Group(); g.position.set(STX[i], 0, (ZT + ZL) / 2); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: ['#1C9A94', '#3D6BD6', '#8A3F8E'][i] });
      for (const z of [ZT, ZL]) { const arch = P.box(0.5, 0.42, 0.1, '#ccc', { r: 0.03, material: m }); arch.position.set(0, 0.1, z - (ZT + ZL) / 2 - 0.34); g.add(arch); const arch2 = arch.clone(); arch2.position.z = z - (ZT + ZL) / 2 + 0.34; g.add(arch2); const lid = P.box(0.5, 0.06, 0.78, '#ccc', { r: 0.03, material: m }); lid.position.set(0, 0.52, z - (ZT + ZL) / 2); g.add(lid); }
      const spine = P.box(0.5, 0.06, ZL - ZT, '#ccc', { r: 0.03, material: m }); spine.position.set(0, 0.52, 0); g.add(spine);
      const blk = P.box(0.6, 0.06, 0.7, C.red, { r: 0.02 }); blk.position.set(0, 0.11, ZL - (ZT + ZL) / 2); blk.userData.noFit = true; g.add(blk);
      return { g, m, blk };
    });

    /* ---------- parcels ---------- */
    const mk = () => { const g = new THREE.Group(); g.userData.noFit = true; S.add(g); const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' }); const b = P.box(0.6, 0.16, 0.5, '#F7F5EE', { r: 0.04, material: m }); g.add(b);    return { g, m }; };
    const trainBoxes = ROWS.map(mk), liveBoxes = LIVE.map(mk);
    /* ---------- the sums ---------- */
    const TEST_EXTRA = [{ inc: 300 }, { inc: 260 }];    // two very rich test applicants: they must not shape the scaler
    function fitted() {
      const incs = ROWS.map(r => r.inc).filter(v => v != null), ages = ROWS.map(r => r.age).filter(v => v != null);
      const fillInc = incs.reduce((a, b) => a + b, 0) / incs.length, fillAge = ages.reduce((a, b) => a + b, 0) / ages.length;
      const scaleSet = st.leak ? [...incs, ...TEST_EXTRA.map(t => t.inc)] : [...incs, ...ROWS.filter(r => r.inc == null).map(() => fillInc)];
      const mu = scaleSet.reduce((a, b) => a + b, 0) / scaleSet.length, sd = Math.sqrt(scaleSet.reduce((a, b) => a + (b - mu) ** 2, 0) / scaleSet.length);
      return { fillInc, fillAge, mu, sd };
    }
    // the model was trained on scaled income: approve when the scaled income is above −0.3
    const TRAIN_FIT = (() => { const incs = ROWS.map(r => r.inc).filter(v => v != null), f = incs.reduce((a, b) => a + b, 0) / incs.length, all = ROWS.map(r => r.inc ?? f), mu = all.reduce((a, b) => a + b, 0) / all.length, sd = Math.sqrt(all.reduce((a, b) => a + (b - mu) ** 2, 0) / all.length); return { mu, sd }; })();
    function run(r, live) {
      const F = fitted(), stages = [{ ...r }];
      let x = { ...r };
      if (!st.noFill) { if (x.inc == null) x.inc = Math.round(F.fillInc); if (x.age == null) x.age = Math.round(F.fillAge); }
      stages.push({ ...x });
      const skipScale = live && st.skip;
      if (x.inc != null) x.z = skipScale ? x.inc : (x.inc - F.mu) / F.sd;
      stages.push({ ...x });
      const crash = x.inc == null;
      x.approve = crash ? null : x.z > -0.3;
      stages.push({ ...x });
      return { stages, crash };
    }
    const fmt = (s, k) => k === 0 ? `inc ${s.inc ?? '—'}\nage ${s.age ?? '—'}` : k === 1 ? `inc ${s.inc ?? '—'}\nage ${s.age ?? '—'}` : k === 2 ? `z ${s.z != null ? s.z.toFixed(2) : '—'}` : s.approve == null ? 'ERROR' : s.approve ? 'APPROVE' : 'DECLINE';
    function place(box, r, x, z, live) {
      const res = run(r, live), k = x < STX[0] ? 0 : x < STX[1] ? 1 : x < STX[2] ? 2 : 3;
      box.g.position.set(x, 0.1, z); box.g.visible = x > BELT[0] - 0.01 && x < BELT[1] + 0.3;
      const crashed = res.crash && k >= 3;
      box.m.color.set(crashed ? '#FBD9D3' : k >= 3 ? (res.stages[3].approve === r.ok ? '#BDE3C8' : '#F6C59A') : '#F7F5EE');
    }
    function update(dt) {
      st.t += dt * (S.reduced ? 3 : 0.9); st.liveT += dt * (S.reduced ? 3 : 0.9);
      const span = BELT[1] - BELT[0] + 1.2;
      trainBoxes.forEach((b, i) => place(b, ROWS[i], BELT[0] + ((st.t + i * 0.85) % span), ZT, false));
      liveBoxes.forEach((b, i) => place(b, LIVE[i], BELT[0] + ((st.liveT + i * 1.5) % span), ZL, true));
      const F = fitted();
      stations.forEach((s, i) => { s.blk.visible = i === 1 && st.skip; });
      const res = LIVE.map(r => run(r, true)), right = res.filter((x, i) => x.stages[3].approve === LIVE[i].ok).length;

    }
    const liveRight = () => LIVE.filter(r => run(r, true).stages[3].approve === r.ok).length;
    const controls = [
      { type: 'button', label: 'Send live applications', short: 'Send live', act: () => { st.liveT = -0.5; } },
      { type: 'toggle', label: 'Scaler learns from the test rows too', short: 'Leaky scaler', get: () => st.leak, set: v => { st.leak = v; }, quick: false },
      { type: 'toggle', label: 'Live belt skips the scaling station', short: 'Skip scaling', get: () => st.skip, set: v => { st.skip = v; } },
      { type: 'toggle', label: 'No gap filling', get: () => st.noFill, set: v => { st.noFill = v; }, quick: false },
    ];
    const readouts = [
      { label: 'Live decisions right', get: () => { const n = LIVE.some(r => run(r, true).crash) ? 0 : liveRight(); return { v: `${n} / ${LIVE.length}`, good: n === LIVE.length, bad: n < LIVE.length }; } },
      { label: 'Scaler settings', get: () => { const F = fitted(); return { v: `mean ${F.mu.toFixed(0)}, spread ${F.sd.toFixed(0)}`, bad: st.leak }; } },
    ];
    const labels = [
      { name: 'train', t: 'The training belt', d: 'Each station learns its settings here, once', icon: 'box', atV: V(BELT[0], 0.1, ZT - 0.31) },
      { name: 'live', t: 'The live belt', d: 'Must replay exactly the same stations', icon: 'link', atV: V(BELT[0], 0.1, ZL + 0.31) },
      { name: 'stations', t: 'Stations in a fixed order', d: 'Fill gaps, scale, then the model', icon: 'spark', atV: V(BELT[1], 0.9, ZT) },
      { name: 'out', t: 'Decisions', d: 'Green: right. Orange: wrong', icon: 'check', atV: V(BELT[1], 0.1, ZL + 0.31) },
    ];
    const reset = () => { Object.assign(st, { leak: false, skip: false, noFill: false }); };
    const breaks = [
      { label: 'Live belt skips scaling', hint: 'Training–serving skew', on: () => { reset(); st.skip = true; st.liveT = -0.5; }, off: reset },
      { label: 'Scaler learns from the test rows', hint: 'Two very rich test applicants', on: () => { reset(); st.leak = true; }, off: reset },
      { label: 'No gap filling', hint: 'A live form with no income', on: () => { reset(); st.noFill = true; st.liveT = -0.5; }, off: reset },
    ];
    function status() {
      const F = fitted(), n = liveRight();
      if (st.skip) return { ok: false, msg: `<b>Training–serving skew.</b> The model learned on scaled incomes (around −1 to +2), but the live system forgot the scaling step and sends raw incomes like 47 and 20. Every number looks enormous, so everyone gets approved: ${n} of ${LIVE.length} right. Ship the whole pipeline, not just the model.` };
      if (st.noFill) return { ok: false, msg: `<b>Crashed on a missing value.</b> Amara left the income box empty. With no gap-filling station, the model receives nothing where a number belongs and throws an error. Real forms always have gaps; the pipeline must fill them the same way every time.` };
      if (st.leak) return { ok: false, msg: `<b>The scaler peeked at the test set.</b> Two very rich test applicants pulled its average up to ${F.mu.toFixed(0)} and its spread to ${F.sd.toFixed(0)}, so the training numbers were scaled with knowledge of the test rows, and test scores will flatter the model. Fit every station on training data only.` };
      return { ok: n === LIVE.length ? true : undefined, msg: `<b>Same steps, same settings, every time.</b> The fill value (${Math.round(F.fillInc)}) and the scaling (subtract ${F.mu.toFixed(0)}, divide by ${F.sd.toFixed(0)}) were learned once from the training rows, and the live belt replays them exactly: ${n} of ${LIVE.length} live decisions right.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p), live: () => { st.liveT = -0.5; } };
  },

  story: [
    { t: 'Not just a model', home: true, say: 'A loan model never sees raw forms. Each application rides a conveyor through stations: fill in missing numbers, scale them, then score.', act: m => m.reset() },
    { t: 'Learn once', focus: [-0.4, 0.3, -0.7], zoom: 1.3, say: 'On the training belt each station learns its settings: the average income to fill gaps with, and the mean and spread to scale by. It learns them once, from training rows only.' },
    { t: 'Replay exactly', focus: [-0.4, 0.3, 0.9], zoom: 1.3, say: 'Live applications from Nairobi, Johannesburg and Lagos ride the second belt through exactly the same stations, with exactly the same settings.', act: m => m.live() },
    { t: 'A skipped step', home: true, say: 'Now the live system forgets the scaling step. The model was trained on scaled numbers but receives raw ones, and approves everyone. This is training and serving skew.', act: m => { m.set({ skip: true }); m.live(); }, wait: 6 },
    { t: 'A leaky scaler', home: true, say: 'Another trap: let the scaler learn from the test rows too. Two very rich test applicants shift its settings, and the test score can no longer be trusted.', act: m => m.set({ skip: false, leak: true }), wait: 5 },
    { t: 'Ship the pipeline', home: true, say: 'The fix for both is the same: bundle every step with the model, fit them on training data only, and ship the whole pipeline as one piece.', act: m => { m.reset(); m.live(); } },
  ],
  check: [
    { q: 'Where should a scaler learn its mean and spread?', options: ['From the training data only', 'From all the data, including test', 'From the live data'], answer: 0, why: 'Anything else leaks information from outside the training set.' },
    { q: 'The live system skips a step the training pipeline had. This is called…', options: ['Training–serving skew', 'Regularisation', 'Bagging'], answer: 0, why: 'The model sees inputs prepared differently from those it learned on.' },
    { q: 'Why bundle preprocessing and model into one pipeline?', options: ['So every step runs the same way in training and in production', 'To make files smaller', 'It is required by Python'], answer: 0, why: 'One object, fitted once, replayed everywhere: no step can be forgotten or refitted.' },
  ],
  terms: [
    ['Pipeline', 'A fixed sequence of data steps plus the model, fitted and applied as one.'],
    ['Imputation', 'Filling missing values, for example with the training average.'],
    ['Scaling', 'Putting numbers on a common scale, such as subtracting the mean and dividing by the spread.'],
    ['fit / transform', 'Learn a step\'s settings from training data (fit), then apply them anywhere (transform).'],
    ['Training–serving skew', 'Inputs prepared differently in production from in training.'],
  ],
  deeper: '<p><b>Cross-validation with pipelines.</b> When the scaler sits inside the pipeline, each fold refits it on that fold\'s training slice only, so no fold leaks into another.</p><p><b>Feature stores</b> compute features once and serve the same values to training and to live prediction, a structural cure for skew (a later lesson).</p><p><b>Versioning.</b> Save the fitted pipeline with the model\'s version. A model is only reproducible with the exact steps it was trained behind.</p>',
  code: {
    title: 'A pipeline in scikit-learn',
    note: 'Adapted from the course\'s pipelines lesson.',
    text: `
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import joblib

pipe = Pipeline([
    ("fill", SimpleImputer(strategy="mean")),
    ("scale", StandardScaler()),
    ("model", LogisticRegression()),
])

pipe.fit(X_train, y_train)          # every step learns from training rows only
print(pipe.score(X_test, y_test))   # the test rows are transformed, never fitted on

joblib.dump(pipe, "loan_pipeline.joblib")   # ship the whole thing, not just the model
`,
  },
};
