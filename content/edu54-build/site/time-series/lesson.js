// Time series: daily milk deliveries to a cooperative dairy in Nakuru, with a slow upward trend and a weekly rhythm (markets on Saturday).
// A forecast is built from parts: the trend, the weekly pattern, the last value. A ribbon of 10 weeks of history; the forecast extends to the right.
// Break it: shuffle the days before splitting (the test peeks at the future), forecast with only the last value (misses the weekly rhythm), ignore the trend.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const WEEK = [0.92, 0.95, 1.0, 1.0, 1.03, 1.18, 0.86];   // Mon … Sun: Saturday market day, quiet Sunday
const DAYS = 84, HOLD = 14;                              // 12 weeks; the last 2 are held back to test the forecast
// pasture conditions drift from week to week, so neighbouring days are alike while the far future can't be known
const SERIES = (() => { const r = rngOf(11), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()), out = []; let drift = 0; for (let d = 0; d < DAYS; d++) { drift = 0.9 * drift + g() * 35; out.push((1800 + d * 6 + drift) * WEEK[d % 7] + g() * 18); } return out; })();
// a shuffled split: 14 random days held out from anywhere in the twelve weeks
const SHUF = (() => { const r = rngOf(4), a = [...Array(DAYS - 2).keys()].map(x => x + 1); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return new Set(a.slice(0, HOLD)); })();
const XL = -2.9, XW = 5.6, Y0 = 0.2, YS = 1.0 / 900;

export default {
  slug: 'time-series',
  title: 'Time series: forecasting tomorrow',
  description: 'Twelve weeks of milk deliveries to a dairy in Nakuru, rising slowly with a Saturday peak every week. Build a forecast from its parts, the trend, the weekly rhythm and yesterday, and test it on the two weeks held back. Then shuffle the days before testing, and forget the weekly rhythm.',
  overview: 'A time series is a measurement taken again and again: daily milk, hourly electricity, monthly rainfall. Its past carries patterns: a long trend, repeating seasons and the pull of recent values. A forecast can be built from those parts. Testing is different from ordinary data: you must train on the past and test on the future, never shuffle the days, because a model that has seen tomorrow will always look brilliant today.',
  keywords: ['time series forecasting', 'seasonality', 'trend', 'lag features', 'time series cross validation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.1, 0.55, 1.45], half: 2.9, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { trend: true, season: true, lag: false, shuffle: false, only: false };
    const X = d => XL + d / (DAYS - 1) * XW, Y = v => Y0 + Math.max(0, v - 1300) * YS;
    /* ---------- the wall and the bars ---------- */
    const wall = P.box(XW + 0.4, 1.6, 0.06, '#FFFFFF', { r: 0.03 }); wall.position.set(0, 0.05, -0.4); S.add(wall);
    const cut = P.box(0.03, 1.5, 0.08, C.plum, { r: 0 }); cut.position.set((X(DAYS - HOLD - 1) + X(DAYS - HOLD)) / 2, 0.08, -0.33); S.add(cut);
    const cutT = S.text('past | future', { size: 0.12, face: 'front', weight: 800, color: C.plum, maxW: 1.4 }); cutT.position.set(cut.position.x, 1.72, -0.36); S.add(cutT);
    const bars = SERIES.map((v, d) => { const m = new THREE.MeshLambertMaterial({ color: d >= DAYS - HOLD ? '#B9B6AE' : d % 7 === 5 ? C.gold : C.teal }); const b = P.box(XW / DAYS * 0.72, 1, 0.12, '#ccc', { r: 0.01, material: m }); b.position.set(X(d), Y0, -0.28); b.scale.y = Math.max(0.01, Y(v) - Y0); S.add(b); return b; });
    let fc = P.tube([V(), V(1, 0, 0)], 0.022, C.coral); fc.userData.noFit = true; S.add(fc);
    for (const [d, n] of [[0, 'week 1'], [35, 'week 6'], [70, 'week 11']]) { const t = S.text(n, { size: 0.12, face: 'front', weight: 750, color: '#151827', maxW: 1 }); t.position.set(X(d) + 0.3, Y0 - 0.1, -0.36); S.add(t); }
    const yT = S.text('litres a day', { size: 0.12, face: 'front', weight: 750, color: '#151827', maxW: 1.4 }); yT.position.set(XL + 0.45, 1.68, -0.36); S.add(yT);
    /* ---------- the parts on the floor ---------- */
    const PARTS = [{ k: 'trend', n: 'Trend', d: 'slowly rising' }, { k: 'season', n: 'Weekly rhythm', d: 'Saturday market' }, { k: 'lag', n: 'Yesterday', d: 'recent level' }];
    const parts = PARTS.map((p, i) => { const m = new THREE.MeshLambertMaterial({ color: '#D8D4C8' }); const b = P.box(1.5, 0.18, 0.7, '#ccc', { r: 0.06, material: m }); b.position.set(-1.8 + i * 1.8, 0, 0.75); S.add(b); const t = S.text(p.n, { size: 0.15, weight: 800, color: '#151827', maxW: 1.4 }); t.position.set(-1.8 + i * 1.8, 0.185, 0.65); S.add(t); const d = S.text(p.d, { size: 0.1, weight: 700, color: '#151827', maxW: 1.4 }); d.position.set(-1.8 + i * 1.8, 0.185, 0.92); S.add(d); return { m, k: p.k }; });
    /* ---------- the forecast ---------- */
    let model = null;
    function fit() {
      // which days the model may learn from: the past only, or (shuffled) every day except 14 random ones
      const idx = st.shuffle ? [...Array(DAYS).keys()].filter(d => !SHUF.has(d)) : [...Array(DAYS - HOLD).keys()];
      const set = new Set(idx);
      // trend: a straight line through the training days (after removing the weekly pattern if used)
      const wk = [...Array(7)].map((_, k) => { if (!st.season) return 1; const xs = idx.filter(d => d % 7 === k); const all = idx.reduce((a, d) => a + SERIES[d], 0) / idx.length; return xs.reduce((a, d) => a + SERIES[d], 0) / Math.max(1, xs.length) / all; });
      const ds = idx.map(d => [d, SERIES[d] / wk[d % 7]]), n = ds.length, mx = ds.reduce((a, p) => a + p[0], 0) / n, my = ds.reduce((a, p) => a + p[1], 0) / n;
      let sxy = 0, sxx = 0; for (const [x, y] of ds) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
      const slope = st.trend ? sxy / sxx : 0, icpt = my - slope * mx;
      model = { wk, slope, icpt, set };
    }
    function predict(d) {
      if (st.only) return SERIES[Math.min(d, DAYS - HOLD) - 1];          // just repeat the last known value
      let v = (model.icpt + model.slope * d) * model.wk[d % 7];
      if (st.lag) { const prev = d - 1 < DAYS - HOLD || st.shuffle ? SERIES[d - 1] : predict(d - 1); v = 0.7 * v + 0.3 * prev * model.wk[d % 7] / model.wk[(d - 1) % 7]; }
      return v;
    }
    // the honest test: forecast the last fortnight from the past
    const realErr = () => { const sh = st.shuffle; if (sh) { st.shuffle = false; fit(); } let s = 0; for (let d = DAYS - HOLD; d < DAYS; d++) s += Math.abs(predict(d) - SERIES[d]); if (sh) { st.shuffle = true; fit(); } return s / HOLD; };
    // the shuffled test: 14 random days, each predicted with its real neighbours known (they were in training)
    const shufErr = () => { let s = 0; for (const d of SHUF) { const nb = (SERIES[d - 1] / model.wk[(d - 1) % 7] + SERIES[d + 1] / model.wk[(d + 1) % 7]) / 2 * model.wk[d % 7]; s += Math.abs(nb - SERIES[d]); } return s / HOLD; };
    const testErr = () => st.shuffle ? shufErr() : realErr();
    function draw() {
      fit();
      const pts = []; for (let d = 1; d < DAYS; d++) pts.push(V(X(d), Y(predict(d)), -0.2));
      fc.geometry.dispose(); fc.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 3, 0.022, 5, false);
      parts.forEach(p => { const on = st.only ? false : st[p.k]; p.m.color.set(on ? '#9FDDB2' : '#D8D4C8'); });
      bars.forEach((b, d) => b.material.color.set(st.shuffle ? (SHUF.has(d) ? '#E9A99E' : d % 7 === 5 ? C.gold : C.teal) : d >= DAYS - HOLD ? '#B9B6AE' : d % 7 === 5 ? C.gold : C.teal));
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Trend', get: () => st.trend, set: v => { st.trend = v; st.only = false; draw(); } },
      { type: 'toggle', label: 'Weekly rhythm', short: 'Weekly', get: () => st.season, set: v => { st.season = v; st.only = false; draw(); } },
      { type: 'toggle', label: 'Yesterday\'s value (lag)', short: 'Lag', get: () => st.lag, set: v => { st.lag = v; st.only = false; draw(); } },
      { type: 'toggle', label: 'Shuffle the days before splitting', short: 'Shuffle', get: () => st.shuffle, set: v => { st.shuffle = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: st.shuffle ? 'Reported miss' : 'Average miss, held-back fortnight', get: () => { const e = testErr(); return { v: `${Math.round(e)} litres`, sub: st.shuffle ? 'on 14 random days' : 'on the last two weeks', good: !st.shuffle && e < 55, bad: st.shuffle || e > 80 }; } },
      { label: 'Trained on', get: () => ({ v: st.shuffle ? 'random days' : 'the past only', bad: st.shuffle }) },
    ];
    const labels = [
      { name: 'history', t: 'Twelve weeks of deliveries', d: 'Gold bars: Saturdays, market day', icon: 'box', atV: V(XL, Y0 + 0.9, -0.3) },
      { name: 'future', t: 'Held back', d: 'The last fortnight tests the forecast', icon: 'eye', atV: V(XL + XW, Y0 + 1.0, -0.3) },
      { name: 'parts', t: 'Forecast parts', d: 'Trend, weekly rhythm, yesterday', icon: 'spark', atV: V(-2.55, 0.18, 0.75) },
      { name: 'line', t: 'The forecast', d: 'Coral: built from the parts that are on', icon: 'wave', atV: V(2.55, 0.18, 0.75) },
    ];
    const reset = () => { Object.assign(st, { trend: true, season: true, lag: false, shuffle: false, only: false }); draw(); };
    const breaks = [
      { label: 'Shuffle before splitting', hint: 'Training days from the future too', on: () => { reset(); st.shuffle = true; st.lag = true; draw(); }, off: reset },
      { label: 'Repeat the last value', hint: 'No trend, no rhythm', on: () => { reset(); st.only = true; draw(); }, off: reset },
      { label: 'Ignore the weekly rhythm', hint: 'Trend only', on: () => { reset(); st.season = false; draw(); }, off: reset },
    ];
    function status() {
      const e = Math.round(testErr());
      if (st.shuffle) return { ok: false, msg: `<b>A test that's too easy.</b> Shuffling held out 14 random days (red), and every one of them sits between two days the model trained on, so it only has to fill a gap: reported miss ${e} litres. Forecasting the real next fortnight, with no tomorrow to peek at, misses ${Math.round(realErr())}. Always train on the past and test on what comes after.` };
      if (st.only) return { ok: false, msg: `<b>Tomorrow = today, every day.</b> Repeating the last known value is a flat line through the whole fortnight: it misses every Saturday peak and quiet Sunday, and the slow rise. Average miss ${e} litres. Still, it is the baseline any forecast must beat.` };
      if (!st.season) return { ok: false, msg: `<b>Saturdays surprise it every week.</b> With only the trend, the forecast runs straight through the middle, too low on market day and too high on Sundays: average miss ${e} litres. Add the weekly rhythm.` };
      return { ok: e < 70 ? true : undefined, msg: `<b>Average miss on the held-back fortnight: ${e} litres a day.</b> The forecast is ${st.trend ? 'a rising trend' : 'a flat level'}${st.season ? ', times a weekly pattern (Saturday about 18% above average)' : ''}${st.lag ? ', nudged towards yesterday' : ''}. It learned only from the ten weeks before the purple line.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Milk, day by day', home: true, say: 'A cooperative dairy in Nakuru records how much milk farmers deliver each day. Twelve weeks of it: a slow rise, and a peak every Saturday, market day.', act: m => m.set({ trend: false, season: false, lag: false, only: true }) },
    { t: 'Past and future', focus: 'future', zoom: 1.3, say: 'The last two weeks are held back. The forecast may only learn from what came before the purple line, just as in real life.' },
    { t: 'The trend', home: true, say: 'First part: the trend, a slowly rising line. Better than repeating yesterday, but it runs straight through every Saturday peak.', act: m => m.set({ only: false, trend: true, season: false }), wait: 5 },
    { t: 'The weekly rhythm', home: true, say: 'Second part: the weekly rhythm. Saturdays are about a fifth above average, Sundays quiet. Multiply it in, and the forecast follows the peaks.', act: m => m.set({ season: true }), wait: 5 },
    { t: 'Never shuffle time', home: true, say: 'A tempting mistake: shuffle the days before splitting. Then the model learns from days around the test fortnight, peeks at the future, and looks far better than it will ever be.', act: m => m.set({ shuffle: true, lag: true }), wait: 6 },
    { t: 'Forecasts from parts', home: true, say: 'Trend, season and recent values: most forecasts, from simple ones to neural networks, are built from these same parts, and always tested on the future.', act: m => m.set({ shuffle: false, lag: false }) },
  ],
  check: [
    { q: 'Why must time series be split by date, not shuffled?', options: ['Shuffling lets the model learn from the future it is meant to predict', 'Shuffling is slow', 'Dates are required by law'], answer: 0, why: 'Train on the past, test on what comes after; anything else leaks the answer.' },
    { q: 'Milk peaks every Saturday. What forecast part captures that?', options: ['A weekly seasonal pattern', 'The trend', 'Shuffling'], answer: 0, why: 'Seasonality is a pattern that repeats on a fixed cycle.' },
    { q: 'What is a good first baseline for a forecast?', options: ['Repeat the last value (or last week\'s value)', 'A random number', 'Zero'], answer: 0, why: 'Any model worth using must beat these simple rules.' },
  ],
  terms: [
    ['Time series', 'Measurements of the same thing taken over time, in order.'],
    ['Trend', 'The long, slow drift up or down.'],
    ['Seasonality', 'A pattern that repeats on a fixed cycle: daily, weekly, yearly.'],
    ['Lag', 'An earlier value of the series used as a feature, such as yesterday\'s.'],
    ['Walk-forward validation', 'Testing on successive future windows, always training only on the past.'],
  ],
  deeper: '<p><b>Classic models.</b> ARIMA models the series from its own lags and past errors; exponential smoothing weighs recent days more; both add trend and season terms. They remain strong baselines.</p><p><b>Many series at once.</b> Gradient-boosted trees with lag and calendar features, or neural networks, learn from thousands of related series (every shop, every dairy) at the same time.</p><p><b>Holidays and shocks.</b> A public holiday or a drought breaks the usual rhythm. Add them as features, or the forecast will be wrong on exactly the days that matter.</p>',
  code: {
    title: 'A forecast from trend and weekly rhythm',
    note: 'Adapted from the course\'s time-series lesson.',
    text: `
import numpy as np

milk = np.loadtxt("deliveries.csv")         # one number per day, in order
train, test = milk[:-14], milk[-14:]         # the past, then the future: never shuffle

days = np.arange(len(train))
weekly = np.array([train[d::7].mean() for d in range(7)]) / train.mean()
deseason = train / weekly[days % 7]
slope, intercept = np.polyfit(days, deseason, 1)

future = np.arange(len(train), len(milk))
forecast = (intercept + slope * future) * weekly[future % 7]
print("average miss:", np.abs(forecast - test).mean())
print("baseline (repeat last week):", np.abs(train[-7:].repeat(2) - test).mean())
`,
  },
};
