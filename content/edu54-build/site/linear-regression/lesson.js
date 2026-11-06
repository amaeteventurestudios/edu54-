// Linear regression: motorbike-taxi fares against distance (okada in Lagos, boda boda in Kampala).
// Prices follow the learner's currency: one fare unit is a round amount near 7 US cents (S.money.nice). Fit a line by hand with two sliders, see the misses as sticks and squares,
// then let gradient descent fit it. Break it: one night-time fare (an outlier), a learning rate that blows up.
const SX = 0.5, SY = 0.16;   // world units per km, per fare unit
const BASE = [[1, 4.6], [2, 6.4], [3, 7.2], [4, 8.6], [5, 11.1], [6, 11.9], [7, 13.2], [8, 15.4], [9, 16.1], [10, 18.3], [11, 19.0], [12, 21.4]];
const OUTLIER = [3, 25];

export default {
  slug: 'linear-regression',
  title: 'Linear regression',
  description: 'Guess a motorbike-taxi fare from the distance. Fit a straight line by hand, watch every miss as a square, then let the computer fit it for you.',
  money: true,
  overview: 'Motorbike-taxi fares (okada in Lagos, boda boda in Kampala) rise with distance: a fixed amount to start, plus a bit more for every kilometre. Linear regression finds that rule from examples. Drag the line yourself, see how wrong it is, then watch gradient descent find the best line on its own.',
  keywords: ['linear regression explained', 'mean squared error', 'line of best fit', 'machine learning basics'],
  phoneTurn: false,
  orient: 'any',
  view: { target: [3.2, 2, 0], dir: [0.45, 0.42, 1.3], half: 3.4, wide: 4.6, maxPolar: 1.5 },

  build(S) {
    const { THREE, V, P, C } = S;
    const W = 12 * SX + 0.6, H = 26 * SY + 0.3;
    // the board reaches well past the price labels on the left, so they never hang off its edge
    const board = P.box(W + 1.3, H + 0.3, 0.14, '#FBF8F0', { r: 0.05, m: { emissive: '#B4AFA1' } }); board.position.set(W / 2 - 0.75, 0, -0.35); S.add(board);
    const at = (x, y) => V(x * SX, 0.25 + y * SY, 0);
    // grid lines and numbers
    for (let k = 0; k <= 12; k += 2) {
      const l = P.rod(V(k * SX, 0.25, -0.27), V(k * SX, 0.25 + 25 * SY, -0.27), 0.006, '#D9D2C2'); l.layers.set(1); S.add(l);
      const t = S.text(`${k}`, { size: 0.16, face: 'front', weight: 600, color: '#6B6656' }); t.position.set(k * SX, 0.12, -0.26); S.add(t);
    }
    // money: one fare unit is a round amount in the learner's currency
    let u = S.money.nice(0.065);
    const cash = v => S.money.fmt(+(v * u).toPrecision(3));
    const ticks = [];
    for (let k = 0; k <= 25; k += 5) {
      const l = P.rod(V(0, 0.25 + k * SY, -0.27), V(12 * SX, 0.25 + k * SY, -0.27), 0.006, '#D9D2C2'); l.layers.set(1); S.add(l);
      const t = S.text(cash(k), { size: 0.15, face: 'front', weight: 600, color: '#6B6656', align: 'right', maxW: 1.1 }); t.position.set(-0.32, 0.25 + k * SY, -0.26); S.add(t); ticks.push([t, k]);
    }
    const ax = S.text('Distance (km) →', { size: 0.17, face: 'front', weight: 650, color: '#3C3828' }); ax.position.set(10.4 * SX, 0.25 + 1.3 * SY, -0.26); S.add(ax);
    const ay = S.text('↑ Fare', { size: 0.17, face: 'front', weight: 650, color: '#3C3828' }); ay.position.set(1.1 * SX, 0.25 + 23.6 * SY, -0.26); S.add(ay);
    /* ---------- the trips ---------- */
    const st = { w: 0.6, b: 8, learning: false, lr: 0.008, squares: true, outlier: false, epochs: 0, blown: false };
    const data = () => st.outlier ? [...BASE, OUTLIER] : BASE;
    const dots = [...BASE, OUTLIER].map((p, i) => { const b = P.ball(0.11, i === BASE.length ? C.red : C.teal); S.add(b); return b; });
    const sticks = dots.map(() => { const r = P.rod(V(), V(0, 1, 0), 0.022, C.coral); r.userData.noFit = true; S.add(r); return r; });
    const sqMat = new THREE.MeshBasicMaterial({ color: C.coral, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const squares = dots.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sqMat); m.layers.set(1); m.userData.noMask = m.userData.noFit = true; S.add(m); return m; });
    const line = P.box(1, 0.06, 0.06, C.ink, { r: 0 }); line.userData.noFit = true; S.add(line);
    const pred = x => st.w * x + st.b;
    const mse = () => { const d = data(); return d.reduce((s, [x, y]) => s + (pred(x) - y) ** 2, 0) / d.length; };
    function draw() {
      const d = data();
      dots.forEach((b, i) => {
        const on = i < BASE.length || st.outlier; b.visible = on; sticks[i].visible = on; squares[i].visible = on && st.squares;
        if (!on) return;
        const [x, y] = i < BASE.length ? BASE[i] : OUTLIER, p = at(x, y); b.position.copy(p);
        const yp = Math.max(-1, Math.min(30, pred(x))), q = at(x, yp);
        P.setRod(sticks[i], p, q);
        const side = Math.abs(p.y - q.y);
        squares[i].scale.set(Math.max(1e-3, side), Math.max(1e-3, side), 1);
        squares[i].position.set(p.x + side / 2 * (i % 2 ? -1 : 1), (p.y + q.y) / 2, 0.01);
      });
      // the line, clipped to the board
      const x0 = 0, x1 = 12;
      const clip = x => Math.max(-1.2, Math.min(27, pred(x)));
      const a = at(x0, clip(x0)), b = at(x1, clip(x1));
      const dir = b.clone().sub(a), L = dir.length();
      line.position.copy(a).add(b).multiplyScalar(0.5).add(V(0, -0.03, 0));
      line.scale.set(L, 1, 1); line.rotation.z = Math.atan2(dir.y, dir.x);
    }
    draw();
    let acc = 0;
    function learnStep() {
      const d = data(), n = d.length;
      let dw = 0, db = 0;
      for (const [x, y] of d) { const e = pred(x) - y; dw += 2 / n * e * x; db += 2 / n * e; }
      st.w -= st.lr * dw; st.b -= st.lr * db * 6;   // the base fare learns a little faster, so the walk is visible
      st.epochs++;
      if (!Number.isFinite(st.w) || Math.abs(st.w) > 60) { st.blown = true; st.learning = false; st.w = Math.sign(st.w || 1) * 60; }
    }
    function update(dt) {
      if (!st.learning) return;
      acc += dt;
      while (acc > 0.05) { acc -= 0.05; for (let k = 0; k < 3; k++) learnStep(); }
      if (st.epochs > 900) st.learning = false;
      draw(); S.sync();
    }
    const best = () => { const d = data(), n = d.length, mx = d.reduce((s, p) => s + p[0], 0) / n, my = d.reduce((s, p) => s + p[1], 0) / n; const w = d.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / d.reduce((s, [x]) => s + (x - mx) ** 2, 0); return [w, my - w * mx]; };
    const controls = [
      { type: 'slider', label: 'Per kilometre (slope)', min: -1, max: 4, step: 0.05, get: () => st.w, set: v => { st.w = v; st.learning = false; draw(); }, fmt: v => `${cash(v)}/km` },
      { type: 'slider', label: 'Starting fare (intercept)', min: -5, max: 15, step: 0.1, get: () => st.b, set: v => { st.b = v; st.learning = false; draw(); }, fmt: v => cash(v) },
      { type: 'button', label: 'Let it learn', act: () => { st.blown = false; st.epochs = 0; st.learning = true; } },
      { type: 'button', label: 'Start again', short: 'Reset', act: () => { Object.assign(st, { w: 0.6, b: 8, learning: false, epochs: 0, blown: false }); draw(); } },
      { type: 'toggle', label: 'Show the squared errors', get: () => st.squares, set: v => { st.squares = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Average squared error', get: () => { const e = mse(); return { v: e > 999 ? '999+' : e.toFixed(1), bar: Math.min(1, e / 40), good: e < 1.2 && !st.outlier, bad: st.blown }; }, bar: true },
      { label: 'Rule', get: () => ({ v: `${cash(st.b)} + ${cash(st.w)}/km`, sub: st.learning ? `learning, step ${st.epochs}` : '' }) },
    ];
    const labels = [
      { name: 'line', t: 'The model', d: 'A straight line: start fare + price per km', icon: 'spark', at: () => at(10, Math.max(-1, Math.min(27, pred(10)))) },
      { name: 'trip', t: 'A real trip', d: `5 km for ${cash(11.1)}`, icon: 'target', atV: at(5, 11.1) },
      { name: 'miss', t: 'A miss', d: 'Its square is the error the model pays', icon: 'scale', at: () => at(8, (15.4 + Math.max(-1, Math.min(27, pred(8)))) / 2) },
      { name: 'night', t: 'Night trip', d: 'One unusual fare', icon: 'info', atV: at(...OUTLIER), hide: () => !st.outlier },
    ];
    const breaks = [
      { label: 'Add one night-time fare', hint: `3 km for ${cash(25)}`, on: () => { st.outlier = true; const [w, b] = best(); st.w = w; st.b = b; draw(); }, off: () => { st.outlier = false; const [w, b] = best(); st.w = w; st.b = b; draw(); } },
      { label: 'Learning rate far too big', hint: 'Then press Let it learn', on: () => { st.lr = 0.05; st.blown = false; st.epochs = 0; st.learning = true; }, off: () => { st.lr = 0.008; st.blown = false; Object.assign(st, { w: 0.6, b: 8, learning: false }); draw(); } },
    ];
    function status() {
      const e = mse();
      if (st.blown || (st.lr > 0.01 && e > 200)) return { ok: false, msg: `<b>The learning blew up.</b> Each step overshoots more than the last, and the line spins away. Squared errors punish big misses hard, so a big learning rate explodes.` };
      if (st.outlier) return { ok: false, msg: `<b>One odd trip drags the line.</b> Its miss is big, and squaring makes it huge, so the best line tilts toward it and gets worse for every normal trip.` };
      if (st.learning) return { msg: `<b>Learning:</b> each step nudges the slope and the start fare downhill on the error. Average squared error ${e.toFixed(1)}.` };
      if (e < 1.2) return { ok: true, msg: `<b>A good fit.</b> About ${cash(st.b)} to start, plus ${cash(st.w)} per km. Now it can guess a fare it has never seen.` };
      return { msg: `<b>Average squared error ${e.toFixed(1)}.</b> Move the sliders to shrink the pink squares, or press Let it learn.` };
    }
    // a new currency: new axis numbers, card and hint
    function currency() {
      u = S.money.nice(0.065);
      for (const [t, k] of ticks) t.userData.set(cash(k));
      S.label('trip', 'A real trip', `5 km for ${cash(11.1)}`);
      breaks[0].hint = `3 km for ${cash(25)}`;
    }
    return { update, controls, readouts, labels, breaks, status, currency, reset: () => { Object.assign(st, { w: 0.6, b: 8, learning: false, epochs: 0, blown: false, outlier: false, lr: 0.008 }); draw(); },
      set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Fares and distance', home: true, say: 'Each dot is a motorbike-taxi trip: how far it went, and what it cost. Longer trips cost more. Can we find the rule?' },
    { t: 'A line is a rule', focus: 'line', say: 'A straight line is a simple rule: a starting fare, plus a fixed amount for every kilometre. Right now it is a bad guess.', act: m => m.set({ w: 0.6, b: 8, learning: false }) },
    { t: 'Every miss counts', focus: 'miss', say: 'The pink stick is how far the line misses a real fare. We square each miss, so big misses count a lot more than small ones.' },
    { t: 'The error is one number', home: true, say: 'Add up all the squares and take the average. That one number says how wrong the line is. Smaller is better.' },
    { t: 'Let it learn', home: true, say: 'Now let the computer do it. Gradient descent nudges the slope and the starting fare, step by step, until the squares are as small as they can be.', act: m => m.set({ learning: true, epochs: 0, blown: false }), wait: 8 },
    { t: 'Use the rule', focus: 'trip', say: 'The rule it found is a small fare to start, plus a little more for every kilometre. Now it can price a trip it has never seen. That is a prediction.' },
  ],
  check: [
    { q: 'What does linear regression find?', options: ['The best straight line through the examples', 'The biggest number', 'The order of the trips'], answer: 0, why: 'It finds the slope and starting value that make the line miss the examples as little as possible.' },
    { q: 'Why are the misses squared?', options: ['To make them smaller', 'So they are all positive and big misses count more', 'Because lines are square'], answer: 1, why: 'Squaring removes minus signs and punishes big misses. That is also why one odd trip pulls the line so much.' },
    { q: 'One night trip costs three times the normal fare. What happens to the line?', options: ['Nothing', 'It tilts toward that trip and gets worse for the rest', 'It gets more accurate'], answer: 1, why: 'Its squared miss is huge, so the best line bends toward it. Outliers need checking before training.' },
  ],
  terms: [
    ['Slope (weight)', 'How much the answer goes up for each step of the input: money per kilometre.'],
    ['Intercept (bias)', 'The answer when the input is zero: the starting fare.'],
    ['Residual', 'How far the line misses one example.'],
    ['Mean squared error', 'The average of the squared misses: one number for how wrong the line is.'],
    ['Outlier', 'An example far from the rest. It can pull a line badly off.'],
  ],
  deeper: '<p>For a straight line there is a formula that gives the best answer in one go (least squares). Gradient descent is shown here because it is how bigger models learn, where no formula exists.</p><p>With more inputs (distance, time of day, rain) the line becomes a flat sheet, then a shape in many dimensions, but the idea stays: weights times inputs, plus a bias.</p>',
  code: {
    title: 'Linear regression with gradient descent',
    note: 'Adapted from the course\'s linear_regression.py.',
    text: `
class LinearRegression:
    def __init__(self, learning_rate=0.008):
        self.w = 0.0   # fare per km
        self.b = 0.0   # starting fare
        self.lr = learning_rate

    def predict(self, X):
        return [self.w * x + self.b for x in X]

    def cost(self, X, y):
        # the average squared miss
        p = self.predict(X)
        return sum((a - b) ** 2 for a, b in zip(p, y)) / len(y)

    def fit(self, X, y, epochs=1000):
        n = len(y)
        for _ in range(epochs):
            p = self.predict(X)
            dw = (2 / n) * sum((a - t) * x for a, t, x in zip(p, y, X))
            db = (2 / n) * sum(a - t for a, t in zip(p, y))
            self.w -= self.lr * dw
            self.b -= self.lr * db
        return self
`,
  },
};
