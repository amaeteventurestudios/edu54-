// Feature engineering: predicting how long a boda boda / okada trip takes. Raw columns (hour, distance, city, rain) go through
// feature stations into a straight-line model; the board shows predicted against actual minutes. Better features pull the dots to the diagonal.
// Break it: cities numbered 1, 2, 3 (a fake order), a column that leaks the answer (arrival time), hour of day used raw (no rush-hour flag).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CITIES = ['Kampala', 'Lagos', 'Kigali'];
const CITY_EXTRA = [6, 12, 0];     // minutes of extra traffic, not in city order
const TRIPS = (() => { const r = rngOf(31), out = []; for (let i = 0; i < 120; i++) { const hour = 6 + Math.floor(r() * 16), km = 1 + r() * 11, city = Math.floor(r() * 3), rain = r() < 0.25; const rush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19); const mins = 4 + km * 2.6 + (rush ? 11 : 0) + CITY_EXTRA[city] + (rain ? 7 : 0) + (r() - 0.5) * 6; out.push({ hour, km, city, rain, rush, mins }); } return out; })();
const SPLIT = 80;   // first 80 trips to learn from, the rest to test
// solve least squares by the normal equations with a little ridge for safety
function fit(X, y) {
  const n = X[0].length, A = [...Array(n)].map(() => new Array(n).fill(0)), b = new Array(n).fill(0);
  X.forEach((x, k) => { for (let i = 0; i < n; i++) { b[i] += x[i] * y[k]; for (let j = 0; j < n; j++) A[i][j] += x[i] * x[j]; } });
  for (let i = 0; i < n; i++) A[i][i] += 1e-6;
  for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const w = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * w[c]; w[i] = s / A[i][i]; }
  return w;
}

export default {
  slug: 'feature-engineering',
  title: 'Feature engineering: better columns, better model',
  description: 'Predict how long a boda boda or okada trip takes from the hour, the distance, the city and the rain. Turn raw columns into useful features and watch the predictions line up with what really happened. Then number the cities 1, 2, 3, and slip in a column that leaks the answer.',
  overview: 'A model can only use what its columns tell it. Feature engineering turns raw data into columns that make the pattern easy to see: a rush-hour flag instead of the bare hour, one yes-or-no column per city instead of a made-up number, a rain flag. The same simple model gets far more accurate. Two traps catch everyone: numbering categories invents an order that isn\'t there, and a column that is only known after the fact (leakage) makes a model look perfect until the day it is used.',
  keywords: ['feature engineering', 'one hot encoding', 'data leakage', 'feature transformation', 'categorical variables'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.5, 0.1], dir: [0.15, 1.1, 1.25], half: 3, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { dist: true, rush: false, city: 'none', rain: false, leak: false };
    /* ---------- the feature stations ---------- */
    const FEAT = [
      { k: 'dist', n: 'Distance (km)', on: () => st.dist },
      { k: 'rush', n: 'Rush hour? yes/no', on: () => st.rush, alt: 'Hour, raw 6–21' },
      { k: 'city', n: 'City: one column each', on: () => st.city !== 'none' },
      { k: 'rain', n: 'Raining? yes/no', on: () => st.rain },
      { k: 'leak', n: 'Arrival time', on: () => st.leak },
    ];
    const stations = FEAT.map((f, i) => {
      const z = -1.5 + i * 0.7, m = new THREE.MeshLambertMaterial({ color: '#D8D4C8' });
      const b = P.box(1.8, 0.18, 0.58, '#D8D4C8', { r: 0.06, material: m }); b.position.set(-2.6, 0, z); S.add(b);
      const t = S.text(f.n, { size: 0.16, weight: 800, color: '#151827', maxW: 1.7, maxH: 0.42 }); t.position.set(-2.6, 0.185, z); S.add(t);
      const pipe = P.rod(V(-1.75, 0.09, z), V(-1.05, 0.25, 0), 0.025, '#B9B6AE'); S.add(pipe);
      return { b, m, t, pipe, f };
    });
    const model = P.box(0.7, 0.5, 0.8, '#2C2D31', { r: 0.08 }); model.position.set(-0.75, 0, 0); S.add(model);
    const modelT = S.text('MODEL', { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 0.6 }); modelT.position.set(-0.75, 0.505, -0.15); S.add(modelT);
    const modelF = S.text('straight line', { size: 0.1, face: 'front', weight: 750, color: '#FFFFFF', maxW: 0.62 }); modelF.position.set(-0.75, 0.25, 0.405); S.add(modelF);
    /* ---------- predicted against actual ---------- */
    const BX = 1.6, BW = 3.0, MAXM = 60;
    const board = P.box(BW + 0.4, 0.1, BW + 0.4, '#FBF8F1', { r: 0.1 }); board.position.set(BX, 0, 0); S.add(board);
    const Xm = m => BX - BW / 2 + Math.max(0, Math.min(MAXM, m)) / MAXM * BW, Zm = m => BW / 2 - Math.max(0, Math.min(MAXM, m)) / MAXM * BW;
    const diag = P.rod(V(Xm(0), 0.12, Zm(0)), V(Xm(MAXM), 0.12, Zm(MAXM)), 0.012, C.plum); S.add(diag);
    const axA = S.text('actual minutes →', { size: 0.13, weight: 750, maxW: 2.4 }); axA.position.set(BX, 0.105, BW / 2 + 0.3); S.add(axA);
    const axP = S.text('predicted →', { size: 0.13, weight: 750, maxW: 2 }); axP.position.set(BX - BW / 2 - 0.3, 0.105, 0); axP.rotation.z = Math.PI / 2; S.add(axP);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshLambertMaterial(), TRIPS.length); dots.userData.noFit = true; S.add(dots);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the model ---------- */
    const row = t => {
      const x = [1];
      if (st.dist) x.push(t.km);
      if (st.rush) x.push(t.rush ? 1 : 0); else x.push(t.hour);   // without the flag, the raw hour goes in
      if (st.city === 'onehot') x.push(t.city === 1 ? 1 : 0, t.city === 2 ? 1 : 0);
      if (st.city === 'number') x.push(t.city + 1);
      if (st.rain) x.push(t.rain ? 1 : 0);
      if (st.leak) x.push(t.mins); /* arrival minus departure: the answer itself */
      return x;
    };
    let w = null, pred = [];
    function train() {
      const tr = TRIPS.slice(0, SPLIT);
      w = fit(tr.map(row), tr.map(t => t.mins));
      pred = TRIPS.map((t, i) => {
        // at prediction time the arrival time doesn't exist yet: the leaked column is blank (0) for new trips
        const x = row(t); if (st.leak && i >= SPLIT) x[x.length - 1] = 0;
        return x.reduce((s, v, j) => s + v * w[j], 0);
      });
    }
    const err = (a, b) => Math.sqrt(TRIPS.slice(a, b).reduce((s, t, i) => s + (pred[a + i] - t.mins) ** 2, 0) / (b - a));
    function draw() {
      train();
      TRIPS.forEach((t, i) => { dummy.position.set(Xm(t.mins), 0.15, Zm(pred[i])); dummy.scale.setScalar(1); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); dots.setColorAt(i, col.set(i < SPLIT ? '#3D6BD6' : C.orange)); });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
      stations.forEach(s => {
        const on = s.f.on(); s.m.color.set(on ? (s.f.k === 'leak' ? C.red : '#9FDDB2') : '#D8D4C8'); s.pipe.material = P.mat(on ? (s.f.k === 'leak' ? C.red : C.green) : '#B9B6AE');
        if (s.f.k === 'rush') { s.t.userData.set(st.rush ? s.f.n : s.f.alt); s.m.color.set(st.rush ? '#9FDDB2' : '#F6C59A'); s.pipe.material = P.mat(st.rush ? C.green : C.orange); }
        if (s.f.k === 'city') s.t.userData.set(st.city === 'number' ? 'City as 1, 2, 3' : s.f.n);
        if (s.f.k === 'city' && st.city === 'number') { s.m.color.set('#F4A99F'); s.pipe.material = P.mat(C.red); }
      });
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Rush-hour flag (instead of the raw hour)', short: 'Rush hour', get: () => st.rush, set: v => { st.rush = v; draw(); } },
      { type: 'buttons', label: 'City', options: ['Leave out', 'One column each', 'Numbered 1, 2, 3'], get: () => ['none', 'onehot', 'number'].indexOf(st.city), act: i => { st.city = ['none', 'onehot', 'number'][i]; draw(); } },
      { type: 'toggle', label: 'Rain flag', short: 'Rain', get: () => st.rain, set: v => { st.rain = v; draw(); } },
      { type: 'toggle', label: 'Arrival time column', short: 'Arrival time', get: () => st.leak, set: v => { st.leak = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Typical error, trips it learned from', get: () => ({ v: `${err(0, SPLIT).toFixed(1)} min` }) },
      { label: 'Typical error, new trips', get: () => { const e = err(SPLIT, TRIPS.length); return { v: `${e.toFixed(1)} min`, good: e < 3.5, bad: e > 7 }; } },
    ];
    const labels = [
      { name: 'stations', t: 'Feature stations', d: 'Raw columns turned into useful ones', icon: 'box', atV: V(-3.33, 0.18, -1.5) },
      { name: 'model', t: 'One simple model', d: 'The same straight line every time', icon: 'spark', atV: V(-3.33, 0.18, 1.22) },
      { name: 'board', t: 'Predicted against actual', d: 'On the purple line = exactly right', icon: 'target', atV: V(BX + BW / 2 + 0.2, 0.1, -BW / 2) },
      { name: 'colours', t: 'Blue: learned from', d: 'Orange: new trips it never saw', icon: 'eye', atV: V(BX + BW / 2 + 0.2, 0.1, BW / 2) },
    ];
    const reset = () => { Object.assign(st, { dist: true, rush: true, city: 'onehot', rain: true, leak: false }); draw(); };
    const breaks = [
      { label: 'Cities numbered 1, 2, 3', hint: 'A made-up order', on: () => { reset(); st.city = 'number'; draw(); }, off: reset },
      { label: 'A column that leaks the answer', hint: 'Arrival time', on: () => { reset(); st.leak = true; draw(); }, off: reset },
      { label: 'The raw hour, no rush-hour flag', hint: 'Hour as a number', on: () => { reset(); st.rush = false; draw(); }, off: reset },
    ];
    function status() {
      const e1 = err(0, SPLIT), e2 = err(SPLIT, TRIPS.length);
      if (st.leak) return { ok: false, msg: `<b>Perfect in training, useless in real life.</b> Arrival time minus departure is the trip time itself, so the model leans on it and scores ${e1.toFixed(1)} minutes of error on the trips it learned from. On a new trip the arrival time doesn't exist yet, so the column is blank and the error jumps to ${e2.toFixed(1)} minutes. Only use columns you will have when you predict.` };
      if (st.city === 'number') return { ok: false, msg: `<b>A made-up order.</b> Numbering Kampala 1, Lagos 2 and Kigali 3 tells a straight-line model that Kigali is "more" than Lagos, which is "more" than Kampala, by equal steps. But Lagos traffic is worst and Kigali lightest, so no single slope fits: ${e2.toFixed(1)} minutes of error. Give each city its own yes-or-no column.` };
      if (!st.rush) return { ok: false, msg: `<b>The hour as a raw number can't show rush hour.</b> Traffic peaks twice a day, morning and evening, but a straight line through the hour can only go up or down. A rush-hour yes-or-no column captures both peaks: switch it on and the error drops.` };
      const n = 1 + (st.rush ? 1 : 0) + (st.city === 'onehot' ? 1 : 0) + (st.rain ? 1 : 0);
      return { ok: e2 < 3.5 ? true : undefined, msg: `<b>${e2.toFixed(1)} minutes of typical error on new trips</b>, with ${n} engineered features beside distance. The model is the same straight line every time; only the columns changed. Turn features off and watch the dots spread away from the purple line.` };
    }
    reset();
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'How long is the trip?', home: true, say: 'We want to predict how long a boda boda or okada trip will take, in Kampala, Lagos or Kigali, from the hour, the distance, the city and the weather.', act: m => m.set({ dist: true, rush: false, city: 'none', rain: false, leak: false }) },
    { t: 'Raw columns', focus: 'board', zoom: 1.2, say: 'With only the distance and the raw hour, a straight-line model does poorly. The dots spread far from the purple line, where prediction equals reality.' },
    { t: 'A rush-hour flag', home: true, say: 'Traffic peaks twice a day. A straight line through the hour can\'t show that, but a yes-or-no column, is it rush hour, can. The dots move in.', act: m => m.set({ rush: true }), wait: 5 },
    { t: 'One column per city', home: true, say: 'Each city has its own traffic. Give each city its own yes-or-no column, and add one for rain. Same model, much better columns.', act: m => m.set({ city: 'onehot', rain: true }), wait: 5 },
    { t: 'A made-up order', home: true, say: 'Number the cities one, two, three instead, and the model thinks they come in an order with equal steps. They don\'t, and the error grows.', act: m => m.set({ city: 'number' }), wait: 5 },
    { t: 'Leakage', home: true, say: 'Worst of all, add the arrival time. In training the model looks perfect. But for a new trip the arrival time doesn\'t exist yet, and the predictions collapse.', act: m => m.set({ city: 'onehot', leak: true }), wait: 6 },
  ],
  check: [
    { q: 'Why turn the hour into a rush-hour yes/no column?', options: ['A straight line can\'t show two daily peaks; the flag can', 'Hours are too big', 'It makes the data smaller'], answer: 0, why: 'Engineered features make non-straight patterns easy for simple models.' },
    { q: 'Why not number cities 1, 2, 3?', options: ['It invents an order and equal spacing that aren\'t real', 'Numbers are slow', 'It is fine'], answer: 0, why: 'One-hot columns let each city have its own effect.' },
    { q: 'A feature makes the model perfect in training but it isn\'t known at prediction time. This is…', options: ['Data leakage', 'Regularisation', 'Feature scaling'], answer: 0, why: 'The model learned from information it won\'t have when it is used.' },
  ],
  terms: [
    ['Feature', 'A column the model uses as input.'],
    ['Feature engineering', 'Turning raw data into columns that make the pattern easy to learn.'],
    ['One-hot encoding', 'One yes-or-no column per category instead of a made-up number.'],
    ['Data leakage', 'A feature that contains information only available after the fact.'],
    ['Log transform', 'Taking logs of a skewed column (incomes, prices) so a few huge values don\'t dominate.'],
  ],
  deeper: '<p><b>Common moves.</b> Dates become day of week, month and holiday flags. Skewed amounts get a log. Two columns can be combined into a ratio (price per kilometre). Text becomes word counts or embeddings.</p><p><b>Deep learning learns features</b> from raw pixels or words by itself, which is much of its power. For tables of business data, careful hand-made features plus gradient-boosted trees are still hard to beat.</p><p><b>Spotting leaks.</b> If one feature alone predicts almost perfectly, ask when it becomes known. Typical culprits: anything recorded after the outcome, or IDs that encode the answer.</p>',
  code: {
    title: 'Engineered features for trip times',
    note: 'Adapted from the course\'s feature-engineering lesson.',
    text: `
import pandas as pd

trips = pd.DataFrame({
    "hour": [8, 13, 18, 22], "km": [4.2, 6.0, 3.1, 9.5],
    "city": ["Lagos", "Kigali", "Kampala", "Lagos"], "rain": [0, 1, 0, 0],
})

trips["rush"] = trips["hour"].between(7, 9) | trips["hour"].between(17, 19)
trips = pd.get_dummies(trips, columns=["city"], drop_first=True)   # one-hot

features = trips.drop(columns=["hour"])     # the flag replaces the raw hour
# never add columns known only after the trip, such as the arrival time
print(features.columns.tolist())
`,
  },
};
