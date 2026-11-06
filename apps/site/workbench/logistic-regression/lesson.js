// Logistic regression: 60 days in Kampala, today's humidity against whether it rained tomorrow (dots on the floor line or the top line).
// An S-curve (sigmoid of a straight line) gives the chance of rain; training slides it into place by lowering cross-entropy.
// A threshold turns chances into yes or no; the four boxes in front count hits, false alarms, misses and quiet days.
// Break it: fit a straight line instead of an S (chances above 100%, and one odd day drags it), and set the threshold far too low.
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const DAYS = (() => { const r = rngOf(4), out = []; for (let i = 0; i < 60; i++) { const h = 40 + r() * 55, p = 1 / (1 + Math.exp(-(h - 70) / 5.5)); out.push({ h, rain: r() < p }); } out.push({ h: 98, rain: true }, { h: 99, rain: true }); return out; })();
const XL = -2.6, XW = 5.2, H0 = 0.35, HH = 2.0;
const X = h => XL + (h - 35) / 65 * XW, Yp = p => H0 + p * HH;
const sig = z => 1 / (1 + Math.exp(-z));

export default {
  slug: 'logistic-regression',
  title: 'Logistic regression: the chance of rain',
  description: 'Sixty days in Kampala: today\'s humidity, and whether it rained tomorrow. Fit an S-shaped curve that turns humidity into a chance of rain, pick a threshold, and count the hits, false alarms and misses. Then fit a straight line instead, and set the threshold far too low.',
  overview: 'Logistic regression is the workhorse of yes-or-no prediction. It takes a straight line of the inputs and squeezes it through an S-shaped curve, the sigmoid, so the answer is always a chance between 0 and 1. Training slides the curve until the days that had rain sit under high chances and the dry days under low ones (lowering the cross-entropy). A threshold then turns each chance into a yes or a no, and the confusion matrix counts what that gets right and wrong.',
  keywords: ['logistic regression explained', 'sigmoid function', 'binary cross entropy', 'confusion matrix', 'precision recall threshold'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 1.0, 0.4], dir: [0.12, 0.8, 1.45], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { w: 0.02, b: -1, thr: 0.5, train: true, linear: false, lr: 1 };
    const prob = h => st.linear ? st.lw * (h - 35) / 65 + st.lb : sig(st.w * (h - 70) + st.b);
    /* ---------- the wall with its two lines of days ---------- */
    const wall = P.box(XW + 0.5, HH + 0.6, 0.06, '#FFFFFF', { r: 0.03 }); wall.position.set(0, 0.05, -0.55); S.add(wall);
    for (const p of [0, 0.5, 1]) { const r = P.rod(V(XL, Yp(p), -0.5), V(XL + XW, Yp(p), -0.5), p === 0.5 ? 0.006 : 0.01, '#C9C4B6'); r.layers.set(1); S.add(r); const t = S.text(`${p * 100}%`, { color: '#151827', size: 0.13, face: 'front', weight: 750, maxW: 0.6 }); t.position.set(XL - 0.32, Yp(p), -0.5); S.add(t); }
    const axT = S.text('today\'s humidity →', { color: '#151827', size: 0.15, face: 'front', weight: 750, maxW: 3 }); axT.position.set(XL + XW - 1.0, H0 - 0.22, -0.5); S.add(axT);
    for (const h of [40, 60, 80, 100]) { const t = S.text(`${h}%`, { color: '#151827', size: 0.12, face: 'front', weight: 700, maxW: 0.6 }); t.position.set(X(h), H0 - 0.2, -0.5); S.add(t); }
    const dots = DAYS.map(d => { const b = P.ball(0.065, d.rain ? C.blue : C.gold); b.position.set(X(d.h), Yp(d.rain ? 1 : 0), -0.45); S.add(b); return b; });
    let curve = P.tube([V(), V(1, 0, 0)], 0.03, C.plum); curve.userData.noFit = true; S.add(curve);
    const thrLine = P.rod(V(), V(0, 1, 0), 0.014, C.red); thrLine.userData.noFit = true; S.add(thrLine);
    const cutLine = P.rod(V(), V(0, 1, 0), 0.014, C.red); cutLine.userData.noFit = true; S.add(cutLine);
    const thrT = S.text('', { size: 0.13, weight: 800, color: '#FFFFFF', bg: C.red, face: 'cam', top: true, maxW: 2.2 }); thrT.userData.noFit = true; S.add(thrT);
    /* ---------- the confusion matrix on the floor ---------- */
    const floor = P.box(XW + 0.5, 0.1, 2.3, '#F1EEE6', { r: 0.1 }); floor.position.set(0, 0, 0.75); S.add(floor);
    const BOX = [{ n: 'Rain, said rain', c: C.blue }, { n: 'Dry, said rain', c: '#E9A99E' }, { n: 'Rain, said dry', c: C.red }, { n: 'Dry, said dry', c: C.gold }];
    const boxes = BOX.map((b, i) => {
      const x = -1.95 + i * 1.3, m = new THREE.MeshLambertMaterial({ color: b.c });
      const bx = P.box(1.0, 1, 0.8, b.c, { r: 0.06, material: m }); bx.position.set(x, 0.1, 1.0); bx.userData.noFit = true; S.add(bx);
      const t = S.text(b.n, { color: '#151827', size: 0.12, weight: 800, maxW: 1.2 }); t.position.set(x, 0.105, 1.62); S.add(t);
      const n = S.text('', { size: 0.17, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.6 }); n.userData.noFit = true; S.add(n);
      return { bx, n, x };
    });
    function fitStep() {
      // one step of gradient descent on the cross-entropy
      let gw = 0, gb = 0; for (const d of DAYS) { const p = sig(st.w * (d.h - 70) + st.b), e = p - (d.rain ? 1 : 0); gw += e * (d.h - 70); gb += e; }
      st.w -= 0.0004 * gw * st.lr; st.b -= 0.02 * gb * st.lr;
    }
    function fitLine() {   // least squares straight line through 0s and 1s
      const n = DAYS.length, xs = DAYS.map(d => (d.h - 35) / 65), ys = DAYS.map(d => d.rain ? 1 : 0), mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
      let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
      st.lw = sxy / sxx; st.lb = my - st.lw * mx;
    }
    const counts = () => { const c = [0, 0, 0, 0]; for (const d of DAYS) { const say = prob(d.h) >= st.thr; c[d.rain ? (say ? 0 : 2) : (say ? 1 : 3)]++; } return c; };
    const loss = () => DAYS.reduce((a, d) => { const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(st.w * (d.h - 70) + st.b))); return a - (d.rain ? Math.log(p) : Math.log(1 - p)); }, 0) / DAYS.length;
    let acc = 0;
    function update(dt) {
      if (st.train && !st.linear) { acc += dt * (S.reduced ? 200 : 60); while (acc >= 1) { acc -= 1; fitStep(); } }
      const pts = []; for (let i = 0; i <= 120; i++) { const h = 35 + i / 120 * 65, p = prob(h); pts.push(V(X(h), Yp(Math.max(-0.25, Math.min(1.25, p))), -0.42)); }
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.03, 6, false);
      P.setRod(thrLine, V(XL, Yp(st.thr), -0.41), V(XL + XW, Yp(st.thr), -0.41));
      // the humidity where the curve crosses the threshold
      let hc = null; for (let i = 0; i < 400; i++) { const h = 35 + i / 400 * 65; if (prob(h) >= st.thr) { hc = h; break; } }
      cutLine.visible = hc != null; if (hc != null) P.setRod(cutLine, V(X(hc), H0, -0.4), V(X(hc), Yp(1), -0.4));
      thrT.position.set(X(48), Yp(st.thr) + 0.22, -0.4); thrT.userData.set(`say rain above ${Math.round(st.thr * 100)}%`);
      DAYS.forEach((d, i) => { const say = prob(d.h) >= st.thr; dots[i].scale.setScalar(say === d.rain ? 1 : 1.45); });
      const c = counts(), peak = Math.max(...c, 1);
      boxes.forEach((b, i) => { const h = Math.max(0.03, c[i] / peak * 0.55); b.bx.scale.y = h; b.n.position.set(b.x, 0.1 + h + 0.25, 1.0); b.n.userData.set(String(c[i])); });
    }
    fitLine();
    const prec = () => { const c = counts(); return c[0] + c[1] ? c[0] / (c[0] + c[1]) : 0; }, rec = () => { const c = counts(); return c[0] + c[2] ? c[0] / (c[0] + c[2]) : 0; };
    const controls = [
      { type: 'toggle', label: 'Train', get: () => st.train, set: v => { st.train = v; } },
      { type: 'slider', label: 'Threshold: say rain above', min: 0.02, max: 0.98, step: 0.01, get: () => st.thr, set: v => { st.thr = v; }, fmt: v => `${Math.round(v * 100)}%` },
      { type: 'button', label: 'Start the curve again', short: 'Restart', act: () => { st.w = 0.02; st.b = -1; st.linear = false; } },
    ];
    const readouts = [
      { label: 'Cross-entropy', get: () => ({ v: st.linear ? '—' : loss().toFixed(3), good: !st.linear && loss() < 0.45 }) },
      { label: 'Precision', get: () => ({ v: `${Math.round(prec() * 100)}%`, sub: 'of "rain" calls, how many rained', bad: prec() < 0.6 }) },
      { label: 'Recall', get: () => ({ v: `${Math.round(rec() * 100)}%`, sub: 'of rainy days, how many caught', bad: rec() < 0.6 }) },
    ];
    const labels = [
      { name: 'days', t: 'Sixty days', d: 'Blue: it rained next day. Gold: dry', icon: 'box', atV: V(XL, Yp(1), -0.45) },
      { name: 'curve', t: 'The S-curve', d: 'Humidity in, chance of rain out', icon: 'wave', atV: V(XL + XW, Yp(0.95), -0.42) },
      { name: 'threshold', t: 'The threshold', d: 'Above it, say rain', icon: 'scale', atV: V(XL, Yp(0.5), -0.41) },
      { name: 'matrix', t: 'Right and wrong, counted', d: 'Hits, false alarms, misses, quiet days', icon: 'check', atV: V(XL + XW, 0.1, 1.0) },
    ];
    const reset = () => { Object.assign(st, { w: 0.02, b: -1, thr: 0.5, train: true, linear: false }); };
    const breaks = [
      { label: 'A straight line instead of an S', hint: 'Linear regression on yes and no', on: () => { reset(); st.linear = true; fitLine(); }, off: reset },
      { label: 'Threshold far too low', hint: 'Say rain above 5%', on: () => { reset(); for (let k = 0; k < 4000; k++) fitStep(); st.thr = 0.05; }, off: reset },
    ];
    function status() {
      const c = counts();
      if (st.linear) { const top = prob(100), bot = prob(35); return { ok: false, msg: `<b>A straight line gives impossible chances.</b> It says ${Math.round(top * 100)}% at 100% humidity and ${Math.round(bot * 100)}% at 35%: chances can't go above 100% or below 0. The two very humid days at the far right also tilt the whole line. The S-curve flattens out at both ends, so it stays between 0 and 1 and far-away days barely move it.` }; }
      if (st.thr < 0.12) return { ok: false, msg: `<b>Rain, every day.</b> Saying rain whenever the chance is above ${Math.round(st.thr * 100)}% catches all ${c[0]} rainy days, but raises ${c[1]} false alarms: precision ${Math.round(prec() * 100)}%. Nobody will carry an umbrella for long. Where to put the threshold depends on what a miss costs against a false alarm.` };
      if (st.thr > 0.88) return { msg: `<b>Very cautious.</b> Only the surest days get "rain": few false alarms, but ${c[2]} rainy days missed (recall ${Math.round(rec() * 100)}%).` };
      if (!st.train && loss() > 0.5) return { msg: `<b>Not trained yet.</b> The curve starts flat and low, so it calls every day dry. Switch on <b>Train</b> to slide it into place.` };
      if (st.train && loss() > 0.5) return { msg: `<b>Training…</b> Each step nudges the curve so rainy days get higher chances and dry days lower ones. Cross-entropy ${loss().toFixed(3)} and falling.` };
      return { ok: true, msg: `<b>Fitted.</b> Above about ${(() => { for (let i = 0; i < 400; i++) { const h = 35 + i / 400 * 65; if (prob(h) >= st.thr) return Math.round(h); } return 100; })()}% humidity the chance passes ${Math.round(st.thr * 100)}%, so it says rain. ${c[0]} hits, ${c[1]} false alarms, ${c[2]} misses, ${c[3]} quiet days.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p), train: n => { for (let k = 0; k < n; k++) fitStep(); } };
  },

  story: [
    { t: 'Sixty days', home: true, say: 'Here are sixty days in Kampala. Across is today\'s humidity. Blue dots on the top line: it rained the next day. Gold dots on the bottom: it stayed dry.', act: m => { m.reset(); m.set({ train: false }); } },
    { t: 'An S-shaped curve', focus: 'curve', zoom: 1.3, say: 'Logistic regression draws an S-shaped curve. It takes humidity, and gives a chance of rain that always stays between zero and one hundred percent.' },
    { t: 'Training', home: true, say: 'Training slides and steepens the curve, step by step, so rainy days sit under high chances and dry days under low ones. The number it lowers is the cross-entropy.', act: m => m.set({ train: true }), wait: 6 },
    { t: 'Yes or no', focus: 'threshold', zoom: 1.3, say: 'To decide, pick a threshold. Above fifty percent, say rain. Days the curve gets wrong grow bigger.', act: m => m.train(4000) },
    { t: 'Counting mistakes', focus: 'matrix', zoom: 1.4, say: 'The four boxes count the outcomes: rain that was called, false alarms, rain that was missed, and quiet dry days. Precision and recall come from these counts.' },
    { t: 'Moving the threshold', home: true, say: 'Lower the threshold and you catch every rainy day, but cry rain far too often. Where to put it depends on which mistake costs more.', act: m => m.set({ thr: 0.05 }), wait: 5 },
  ],
  check: [
    { q: 'Why use an S-shaped curve instead of a straight line for yes-or-no answers?', options: ['It keeps the chance between 0 and 1, and far-away points barely move it', 'It is faster', 'Straight lines can\'t be trained'], answer: 0, why: 'A line can say 130%; the sigmoid flattens out at 0 and 1.' },
    { q: 'You lower the threshold from 50% to 5%. What happens?', options: ['More rainy days caught, but many more false alarms', 'Fewer false alarms', 'Nothing'], answer: 0, why: 'Recall rises, precision falls: almost every day gets called rain.' },
    { q: 'What does precision measure?', options: ['Of the days called rain, how many really rained', 'Of the rainy days, how many were caught', 'How fast the model trains'], answer: 0, why: 'Precision is about the calls; recall is about the real rainy days.' },
  ],
  terms: [
    ['Sigmoid', 'The S-shaped function 1 / (1 + e^(−z)) that squeezes any number into a chance between 0 and 1.'],
    ['Logistic regression', 'A straight line of the inputs passed through a sigmoid, for yes-or-no prediction.'],
    ['Binary cross-entropy', 'The loss for yes-or-no: big when a confident chance turns out wrong.'],
    ['Threshold', 'The chance above which the answer becomes yes.'],
    ['Confusion matrix', 'The four counts: true positives, false positives, false negatives, true negatives.'],
    ['Precision and recall', 'How many yes calls were right, and how many real yeses were caught.'],
  ],
  deeper: '<p><b>More than two classes.</b> Softmax regression gives one score per class and turns them into chances that add up to 1: the same idea as the last layer of a classifier network.</p><p><b>Why not squared error?</b> With a sigmoid, squared error makes a bumpy loss with flat regions where training stalls. Cross-entropy keeps the loss bowl-shaped (convex), so gradient descent finds the best curve.</p><p><b>The F1 score</b> combines precision and recall into one number, useful when you need a single figure but care about both.</p>',
  code: {
    title: 'Logistic regression from scratch',
    note: 'Adapted from the course\'s logistic-regression lesson.',
    text: `
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def train(days, lr=0.02, steps=4000):
    w = b = 0.0
    for _ in range(steps):
        gw = gb = 0.0
        for humidity, rained in days:
            x = (humidity - 70) / 10
            err = sigmoid(w * x + b) - rained     # gradient of the cross-entropy
            gw += err * x
            gb += err
        w -= lr * gw / len(days)
        b -= lr * gb / len(days)
    return w, b

def predict(w, b, humidity, threshold=0.5):
    return sigmoid(w * (humidity - 70) / 10 + b) >= threshold
`,
  },
};
