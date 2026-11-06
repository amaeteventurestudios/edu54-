// Anomaly detection: two weeks of hourly power use on a village solar mini-grid in Tanzania. Normal days follow an evening peak.
// A z-score band flags readings far from the average; a "same hour of day" band flags readings odd for their time (contextual);
// the isolation idea is shown by how few random cuts it takes to separate a point.
// Break it: one giant spike inflating the average and spread (it hides the others), a global band missing a midnight surge, a threshold so tight everything alarms.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const H = 24 * 14;
const shape = h => 2 + 1.2 * Math.exp(-((h - 8) ** 2) / 6) + 5.5 * Math.exp(-((h - 20) ** 2) / 5);   // kW: small morning bump, big evening peak
const BASE = (() => { const r = rngOf(6), out = []; for (let i = 0; i < H; i++) out.push(shape(i % 24) * (0.9 + r() * 0.2)); return out; })();
const ANOM = [{ i: 24 * 3 + 14, v: 12.5, kind: 'point' }, { i: 24 * 6 + 2, v: 6.8, kind: 'context' }, { i: 24 * 10 + 11, v: 0.2, kind: 'point' }];
const XL = -3.0, XW = 6.0, Y0 = 0.15, YS = 0.14;

export default {
  slug: 'anomaly-detection',
  title: 'Anomaly detection: spotting the odd one out',
  description: 'Two weeks of power use on a village solar mini-grid in Tanzania, with an evening peak every day. Flag readings that sit too far from normal: a sudden spike, a dead hour, and a surge at 2 in the morning that is only strange for its time. Then let one giant spike hide the rest.',
  overview: 'Anomaly detection learns what normal looks like and flags whatever doesn\'t fit, because examples of failures are rare and every new failure looks different. The simplest rule flags readings many standard deviations from the average. Context matters: 7 kilowatts is normal at 8 in the evening and alarming at 2 in the morning, so compare each reading with others at the same hour. Robust measures (the median and the spread of the middle half) stop one huge spike from hiding everything else.',
  keywords: ['anomaly detection', 'z score outliers', 'contextual anomaly', 'isolation forest', 'robust statistics'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.1, 0.6, 1.45], half: 2.9, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { method: 'hour', k: 3, robust: true, giant: false };
    const data = () => { const d = [...BASE]; for (const a of ANOM) d[a.i] = a.v; if (st.giant) d[24 * 12 + 15] = 60; return d; };
    const X = i => XL + i / (H - 1) * XW, Y = v => Y0 + Math.min(v, 16) * YS;
    /* ---------- the wall ---------- */
    const wall = P.box(XW + 0.4, 2.55, 0.06, '#FFFFFF', { r: 0.03, m: { emissive: '#3A3A3A' } }); wall.position.set(0, 0.05, -0.4); S.add(wall);
    const lbl = S.text('power drawn, kW · hour by hour for two weeks', { size: 0.13, face: 'front', weight: 750, color: '#151827', maxW: 4.5 }); lbl.position.set(0, 2.45, -0.36); S.add(lbl);
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(XW / H * 0.85, 1, 0.08).translate(0, 0.5, 0), new THREE.MeshLambertMaterial(), H); S.add(bars);
    let bandHi = P.tube([V(), V(1, 0, 0)], 0.015, C.plum), bandLo = P.tube([V(), V(1, 0, 0)], 0.015, C.plum); [bandHi, bandLo].forEach(b => { b.userData.noFit = true; S.add(b); });
    const flags = [...Array(40)].map(() => { const f = P.cyl(0.07, 0.06, C.red, { seg: 12 }); f.rotation.x = Math.PI / 2; f.userData.noFit = true; S.add(f); return f; });
    /* ---------- the isolation table on the floor ---------- */
    const tab = P.box(2.2, 0.08, 1.2, '#F1EEE6', { r: 0.06 }); tab.position.set(-1.8, 0, 1.5); S.add(tab);
    const tabT = S.text('random cuts to isolate a reading', { size: 0.09, weight: 800, color: '#151827', maxW: 2 }); tabT.position.set(-1.8, 0.085, 2.0); S.add(tabT);
    const cutsN = [{ n: 'a normal hour', c: '#5FB8B2' }, { n: 'the 12 kW spike', c: C.red }];
    const cutBars = cutsN.map((c, k) => { const b = P.box(0.5, 1, 0.35, c.c, { r: 0.03 }); b.position.set(-2.3 + k * 1.0, 0.08, 1.4); b.userData.noFit = true; S.add(b); const t = S.text(c.n, { size: 0.08, weight: 800, color: '#151827', maxW: 0.9 }); t.position.set(-2.3 + k * 1.0, 0.085, 1.72); S.add(t); const n = S.text('', { size: 0.11, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true }); n.userData.noFit = true; S.add(n); return { b, n }; });
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- detection ---------- */
    const med = xs => { const a = [...xs].sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
    function centreSpread(xs) {
      if (st.robust) { const m = med(xs), mad = med(xs.map(x => Math.abs(x - m))) * 1.4826; return [m, Math.max(0.05, mad)]; }
      const mu = xs.reduce((a, b) => a + b, 0) / xs.length; return [mu, Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length)];
    }
    function bandAt(d) {
      if (st.method === 'global') { const [c, s] = centreSpread(d); return d.map(() => [c - st.k * s, c + st.k * s]); }
      const byHour = [...Array(24)].map((_, h) => centreSpread(d.filter((_, i) => i % 24 === h)));
      return d.map((_, i) => { const [c, s] = byHour[i % 24]; return [c - st.k * s, c + st.k * s]; });
    }
    // average depth to isolate a value with random cuts (the isolation-forest idea, one dimension)
    function isoDepth(d, v, seed) { const r = rngOf(seed); let tot = 0; for (let t = 0; t < 60; t++) { let lo = Math.min(...d), hi = Math.max(...d), pts = d, depth = 0; while (pts.length > 1 && depth < 30) { const c = lo + r() * (hi - lo); pts = v < c ? pts.filter(x => x < c) : pts.filter(x => x >= c); if (v < c) hi = c; else lo = c; depth++; } tot += depth; } return tot / 60; }
    let flagged = [];
    function draw() {
      const d = data(), band = bandAt(d);
      flagged = d.map((v, i) => v < band[i][0] || v > band[i][1] ? i : -1).filter(i => i >= 0);
      d.forEach((v, i) => { dummy.position.set(X(i), Y0, -0.33); dummy.scale.set(1, Math.max(0.01, Math.min(v, 16) * YS), 1); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix); bars.setColorAt(i, col.set(flagged.includes(i) ? C.red : (i % 24 >= 18 && i % 24 <= 22) ? C.gold : C.teal)); });
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
      const hi = band.map((b, i) => V(X(i), Y(Math.max(0, b[1])), -0.3)), lo = band.map((b, i) => V(X(i), Y(Math.max(0, b[0])), -0.3));
      for (const [t, pts] of [[bandHi, hi], [bandLo, lo]]) { t.geometry.dispose(); t.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), H * 2, 0.015, 4, false); }
      flags.forEach((f, k) => { const i = flagged[k]; f.visible = i != null; if (i != null) f.position.set(X(i), Y(d[i]) + 0.12, -0.28); });
      const sub = d.filter((_, i) => i % 24 === 14);
      [isoDepth(d, BASE[24 * 2 + 14], 3), isoDepth(d, 12.5, 3)].forEach((dep, k) => { const h = dep * 0.04; cutBars[k].b.scale.y = Math.max(0.02, h); cutBars[k].n.position.set(-2.3 + k * 1.0, 0.08 + h + 0.2, 1.4); cutBars[k].n.userData.set(`${dep.toFixed(1)} cuts`); });
    }
    draw();
    const caught = () => ANOM.filter(a => flagged.includes(a.i)).length, falseA = () => flagged.filter(i => !ANOM.some(a => a.i === i) && !(st.giant && i === 24 * 12 + 15)).length;
    const controls = [
      { type: 'buttons', label: 'Compare each reading with', options: ['All readings', 'The same hour of day'], get: () => st.method === 'global' ? 0 : 1, act: i => { st.method = i ? 'hour' : 'global'; draw(); } },
      { type: 'slider', label: 'Threshold (spreads from normal)', min: 0.5, max: 6, step: 0.1, get: () => st.k, set: v => { st.k = v; draw(); } },
      { type: 'toggle', label: 'Robust: median and middle spread', short: 'Robust', get: () => st.robust, set: v => { st.robust = v; draw(); } },
      { type: 'toggle', label: 'One giant spike (a faulty meter)', short: 'Giant spike', get: () => st.giant, set: v => { st.giant = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Real problems caught', get: () => ({ v: `${caught()} of 3`, good: caught() === 3, bad: caught() < 2 }) },
      { label: 'False alarms', get: () => ({ v: falseA(), bad: falseA() > 8, good: falseA() <= 2 }) },
    ];
    const labels = [
      { name: 'normal', t: 'Normal days', d: 'A gold evening peak, every day', icon: 'wave', atV: V(XL, Y(8), -0.33) },
      { name: 'band', t: 'The normal band', d: 'Purple lines: inside is normal', icon: 'scale', atV: V(XL + XW, Y(8), -0.3) },
      { name: 'flags', t: 'Flagged readings', d: 'Red: outside the band', icon: 'info', atV: V(XL + XW, Y0, -0.3) },
      { name: 'iso', t: 'Easy to isolate', d: 'Odd readings need fewer random cuts', icon: 'spark', atV: V(-2.9, 0.08, 1.5) },
    ];
    const reset = () => { Object.assign(st, { method: 'hour', k: 3, robust: true, giant: false }); draw(); };
    const breaks = [
      { label: 'One giant spike, plain average', hint: 'Not robust', on: () => { reset(); st.giant = true; st.robust = false; st.method = 'global'; draw(); }, off: reset },
      { label: 'Ignore the time of day', hint: 'One band for every hour', on: () => { reset(); st.method = 'global'; draw(); }, off: reset },
      { label: 'Threshold far too tight', hint: 'One spread', on: () => { reset(); st.k = 1; draw(); }, off: reset },
    ];
    function status() {
      const c = caught(), f = falseA();
      if (st.giant && !st.robust) return { ok: false, msg: `<b>One giant spike hid the rest.</b> A faulty meter read 60 kW once. The plain average and spread swallowed it: the spread grew so wide that the band now covers almost everything, and only ${c} of the 3 real problems are flagged. The median and the spread of the middle half ignore one wild value; switch on Robust.` };
      if (st.method === 'global' && !flagged.includes(ANOM[1].i)) return { ok: false, msg: `<b>The 2 a.m. surge slipped through.</b> 6.8 kW is perfectly normal at 8 in the evening, so one band for all hours lets it pass, yet at 2 in the morning, when the village sleeps, it means a fault or theft. Compare each reading with the same hour on other days: a contextual anomaly.` };
      if (st.method === 'global') return { ok: false, msg: `<b>One band for every hour can't be right.</b> Drawn around the typical reading of the whole day, it flags every ordinary evening peak (${f} false alarms) while barely noticing that 6.8 kW at 2 in the morning, when the village sleeps, is a fault or theft. Compare each reading with the same hour on other days: that catches contextual anomalies.` };
      if (st.k < 1.6) return { ok: false, msg: `<b>Everything is an alarm.</b> At ${st.k.toFixed(1)} spreads, ordinary wobble crosses the band ${f} times. The technician stops reading the alerts within a week. Thresholds trade missed problems against false alarms.` };
      return { ok: c === 3 && f <= 3 ? true : undefined, msg: `<b>${c} of 3 real problems flagged, ${f} false alarm${f === 1 ? '' : 's'}.</b> Each reading is compared with the same hour on other days, using the median and the spread of the middle half, and flagged if it sits more than ${st.k.toFixed(1)} spreads away. The spike also needs far fewer random cuts to isolate than a normal hour.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'What normal looks like', home: true, say: 'Here are two weeks of hourly power use on a village solar mini-grid in Tanzania. Every evening the lights and televisions come on: a gold peak, day after day.', act: m => m.set({ k: 6 }) },
    { t: 'A normal band', focus: 'band', zoom: 1.2, say: 'Anomaly detection learns what normal looks like, and draws a band around it. Anything outside the purple lines gets flagged.', act: m => m.set({ k: 3 }) },
    { t: 'The odd ones', home: true, say: 'Three readings are flagged: a sudden twelve kilowatt spike in the afternoon, an hour when power dropped to almost nothing, and a surge at two in the morning.', wait: 5 },
    { t: 'Normal, for the time', home: true, say: 'That night surge would be ordinary at eight in the evening. Use one band for all hours, and it slips through. Comparing each reading with the same hour on other days catches it.', act: m => m.set({ method: 'global' }), wait: 6 },
    { t: 'One giant spike', home: true, say: 'Now a faulty meter reads sixty kilowatts once. With a plain average, that one value stretches the band so wide that real problems hide inside it. The median ignores it.', act: m => m.set({ method: 'global', giant: true, robust: false }), wait: 6 },
    { t: 'Easy to isolate', focus: [-1.8, 0.3, 1.5], zoom: 1.4, say: 'Another view: cut the readings at random until one stands alone. An odd reading is isolated in a few cuts; a normal one hides in the crowd much longer. That is the idea behind isolation forests.', act: m => m.set({ method: 'hour', giant: false, robust: true }) },
  ],
  check: [
    { q: 'Why does anomaly detection usually model normal data rather than learn from examples of failures?', options: ['Failures are rare and each new one looks different', 'Failures are never recorded', 'It is faster'], answer: 0, why: 'Learning normal catches any deviation, including kinds never seen before.' },
    { q: '7 kW is normal at 8 p.m. but appears at 2 a.m. What kind of anomaly is it?', options: ['Contextual', 'Point', 'None'], answer: 0, why: 'It is only unusual given its context, the time of day.' },
    { q: 'Why use the median instead of the mean for the normal band?', options: ['One huge value can\'t drag the median', 'The median is always larger', 'It needs less data'], answer: 0, why: 'Robust statistics stop one wild reading from widening the band and hiding others.' },
  ],
  terms: [
    ['Anomaly', 'A reading that doesn\'t fit the normal pattern.'],
    ['Z-score', 'How many standard deviations a value sits from the average.'],
    ['Contextual anomaly', 'A value that is only unusual in its context, such as the time of day.'],
    ['Robust statistics', 'Measures like the median that one extreme value can\'t move much.'],
    ['Isolation forest', 'Flags points that random cuts separate from the rest quickly.'],
  ],
  deeper: '<p><b>Collective anomalies.</b> Sometimes no single reading is odd, but a run of them is: power that stays slightly high all night, every night, can mean a leak or an illegal connection. Detecting those needs windows of readings, not single points.</p><p><b>In many dimensions</b> isolation forests and autoencoders (which flag what they can\'t reconstruct well) handle dozens of sensors at once.</p><p><b>Feedback.</b> When technicians confirm or dismiss alerts, those labels can train a supervised model for the known kinds of fault, while the unsupervised detector keeps watch for new ones.</p>',
  code: {
    title: 'Robust, hour-aware anomaly flags',
    note: 'Adapted from the course\'s anomaly-detection lesson.',
    text: `
import numpy as np

def robust_band(x, k=3):
    med = np.median(x)
    mad = np.median(np.abs(x - med)) * 1.4826     # robust spread
    return med - k * mad, med + k * mad

def flag_by_hour(power, k=3):
    hours = np.arange(len(power)) % 24
    flags = np.zeros(len(power), bool)
    for h in range(24):
        lo, hi = robust_band(power[hours == h], k)
        flags[hours == h] = (power[hours == h] < lo) | (power[hours == h] > hi)
    return flags

from sklearn.ensemble import IsolationForest
iso = IsolationForest(contamination=0.01, random_state=0)
outliers = iso.fit_predict(np.c_[power, hours]) == -1
`,
  },
};
