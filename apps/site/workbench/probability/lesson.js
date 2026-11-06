// Probability and distributions: a bean board. Every ball meets a row of pegs and goes left or right by chance;
// the bins fill into a bell curve (many small random pushes add up to a normal distribution).
// Break it: judge the shape from a handful of balls, tilt every peg so right is more likely.
const DX = 0.3, DZ = 0.27, TOPZ = -1.9;

export default {
  slug: 'probability',
  title: 'Probability: the shape of chance',
  description: 'Drop balls through rows of pegs, where every bounce is a coin flip, and watch the bins fill into a bell curve. Then judge the shape from ten balls, and tilt the pegs.',
  overview: 'A probability distribution says how likely each outcome is. On this board every peg is a coin flip, left or right, and a ball\'s bin is the sum of all its flips. A single ball is unpredictable, but thousands of them pile up into a smooth bell: the normal distribution, which appears whenever many small random pushes add up. Models use distributions everywhere: to describe noise, to start weights, and to say how sure they are.',
  keywords: ['probability distribution explained', 'normal distribution', 'galton board', 'law of large numbers', 'binomial distribution'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.35, -0.2], dir: [0.15, 1.2, 1.25], half: 3, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { R: 10, p: 0.5, drop: true, bins: [], n: 0, acc: 0, balls: [] };
    const binX = k => (k - st.R / 2) * DX;
    const FRONT = () => TOPZ + st.R * DZ + 0.25;
    /* ---------- board, pegs, bins ---------- */
    const board = P.box(4.6, 0.1, 4.2, '#E8D9B5', { r: 0.12 }); board.position.set(0, 0, -0.2); S.add(board);
    const chute = P.box(0.42, 0.35, 0.42, '#A4462A', { r: 0.06 }); chute.position.set(0, 0.1, TOPZ - 0.35); S.add(chute);
    const chuteT = S.text('DROP', { size: 0.1, weight: 800, color: '#FFFFFF', maxW: 0.38 }); chuteT.position.set(0, 0.455, TOPZ - 0.35); S.add(chuteT);
    const MAXR = 14, pegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).translate(0, 0.11, 0), new THREE.MeshLambertMaterial({ color: '#5B4636' }), MAXR * (MAXR + 1) / 2);
    pegs.castShadow = true; S.add(pegs);
    const bins = [...Array(MAXR + 1)].map(() => { const b = P.box(DX - 0.05, 1, 0.5, C.teal, { r: 0.02 }); b.userData.noFit = true; S.add(b); return b; });
    const walls = [...Array(MAXR + 2)].map(() => { const w = P.box(0.02, 0.6, 0.5, '#B9B6AE', { r: 0, cast: false }); S.add(w); return w; });
    const curve = P.tube([V(0, 0, 0), V(1, 0, 0)], 0.022, C.red); curve.userData.noFit = true; S.add(curve);
    const ballMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshLambertMaterial({ color: C.gold }), 60);
    ballMesh.userData.noFit = true; ballMesh.frustumCulled = false; S.add(ballMesh);
    const dummy = new THREE.Object3D();
    const meanT = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2 }); meanT.userData.noFit = true; S.add(meanT);
    // binomial chances for each bin, and the bell scaled to the balls dropped so far
    const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
    const prob = k => choose(st.R, k) * st.p ** k * (1 - st.p) ** (st.R - k);
    const H = () => { const peak = Math.max(...st.bins, 1); return Math.min(0.012, 0.95 / peak); };
    function layout() {
      const R = st.R;
      let i = 0;
      for (let r = 0; r < MAXR; r++) for (let c = 0; c <= r; c++) {
        const on = r < R; dummy.position.set((c - r / 2) * DX, 0.1, TOPZ + r * DZ + 0.1); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); pegs.setMatrixAt(i++, dummy.matrix);
      }
      pegs.instanceMatrix.needsUpdate = true;
      walls.forEach((w, k) => { w.visible = k <= R + 1; w.position.set((k - 0.5 - R / 2) * DX, 0.1, FRONT() + 0.25); });
      st.bins = new Array(R + 1).fill(0); st.n = 0; st.balls = [];
    }
    function drawCurve() {
      const h = H(), pts = [];
      for (let k = 0; k <= st.R; k += 0.25) {
        // the smooth bell with the same middle and spread as the binomial
        const mu = st.R * st.p, sd = Math.sqrt(st.R * st.p * (1 - st.p)), y = Math.exp(-((k - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)) * Math.max(st.n, 1);
        pts.push(V(binX(k), 0.12 + y * h, FRONT() + 0.8));   // just in front of the bins
      }
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 6, false);
      curve.visible = st.n >= 5;
    }
    function addCount(k) { st.bins[k]++; st.n++; }
    function dropMany(n) { for (let i = 0; i < n; i++) { let k = 0; for (let r = 0; r < st.R; r++) if (Math.random() < st.p) k++; addCount(k); } }
    layout();
    function update(dt, t) {
      // new balls fall from the chute; each row is a coin flip
      if (st.drop) { st.acc += dt * (S.reduced ? 20 : 9); while (st.acc >= 1 && st.balls.length < 60) { st.acc -= 1; st.balls.push({ r: 0, k: 0, u: 0, x: 0, from: 0 }); } }
      const sp = dt * (S.reduced ? 30 : 7);
      for (const b of st.balls) {
        b.u += sp;
        while (b.u >= 1 && b.r <= st.R) { b.u -= 1; b.from = b.k; if (b.r < st.R && Math.random() < st.p) b.k++; b.r++; }
      }
      const done = st.balls.filter(b => b.r > st.R);
      for (const b of done) addCount(b.k);
      st.balls = st.balls.filter(b => b.r <= st.R);
      ballMesh.count = st.balls.length;
      st.balls.forEach((b, i) => {
        const x0 = (b.from - (b.r - 1) / 2) * DX, x1 = (b.k - b.r / 2) * DX, z = TOPZ + (b.r - 1 + b.u) * DZ;
        const x = b.r === 0 ? 0 : x0 + (x1 - x0) * b.u;
        dummy.position.set(x, 0.17 + Math.abs(Math.sin(b.u * Math.PI)) * 0.06, z); dummy.scale.setScalar(1); dummy.updateMatrix(); ballMesh.setMatrixAt(i, dummy.matrix);
      });
      ballMesh.instanceMatrix.needsUpdate = true;
      const h = H();
      bins.forEach((b, k) => { const on = k <= st.R; b.visible = on && st.bins[k] > 0; if (on) { b.scale.y = Math.max(0.01, st.bins[k] * h); b.position.set(binX(k), 0.1, FRONT() + 0.52); } });
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) drawCurve();
      const m = mean();
      meanT.visible = st.n > 0; meanT.userData.set(`average bin ${m.toFixed(2)}`); meanT.position.set(binX(m), 1.75, FRONT() + 0.52);
    }
    const mean = () => st.n ? st.bins.reduce((a, c, k) => a + c * k, 0) / st.n : st.R / 2;
    const sdev = () => { if (!st.n) return 0; const m = mean(); return Math.sqrt(st.bins.reduce((a, c, k) => a + c * (k - m) ** 2, 0) / st.n); };
    const controls = [
      { type: 'toggle', label: 'Drop balls', short: 'Drop', get: () => st.drop, set: v => { st.drop = v; } },
      { type: 'button', label: 'Drop 1,000 at once', short: '1,000 more', act: () => { dropMany(1000); drawCurve(); } },
      { type: 'slider', label: 'Rows of pegs', min: 4, max: 14, step: 1, get: () => st.R, set: v => { st.R = Math.round(v); layout(); drawCurve(); } },
      { type: 'slider', label: 'Chance of bouncing right', min: 0.1, max: 0.9, step: 0.05, get: () => st.p, set: v => { st.p = v; layout(); drawCurve(); }, fmt: v => `${Math.round(v * 100)}%` },
      { type: 'button', label: 'Empty the bins', short: 'Empty', act: () => { layout(); drawCurve(); }, quick: false },
    ];
    const readouts = [
      { label: 'Balls', get: () => ({ v: st.n.toLocaleString('en-GB'), bad: !st.drop && st.n > 0 && st.n < 30 }) },
      { label: 'Average bin', get: () => ({ v: st.n ? mean().toFixed(2) : '—', sub: `expected ${(st.R * st.p).toFixed(2)}` }) },
      { label: 'Spread', get: () => ({ v: st.n ? sdev().toFixed(2) : '—', sub: `expected ${Math.sqrt(st.R * st.p * (1 - st.p)).toFixed(2)}` }) },
    ];
    const labels = [
      { name: 'chute', t: 'Balls drop here', d: 'One at a time, all alike', icon: 'info', atV: V(-0.21, 0.45, TOPZ - 0.56) },
      { name: 'pegs', t: 'Every peg: a coin flip', d: 'Left or right, by chance', icon: 'spark', atV: V(-1.45, 0.32, TOPZ + 9 * DZ + 0.1) },
      { name: 'bins', t: 'The bins', d: 'How often each outcome happened', icon: 'box', atV: V(binX(0) - 0.15, 0.1, FRONT() + 0.77) },
      { name: 'curve', t: 'The bell curve', d: 'The normal distribution', icon: 'wave', atV: V(binX(10) + 0.2, 0.12, FRONT() + 0.77) },
    ];
    const reset = () => { Object.assign(st, { R: 10, p: 0.5, drop: true }); layout(); drawCurve(); };
    const breaks = [
      { label: 'Judge the shape from ten balls', hint: 'Stop after ten', on: () => { reset(); st.drop = false; dropMany(10); drawCurve(); }, off: reset },
      { label: 'Tilt every peg', hint: '75% chance of bouncing right', on: () => { reset(); st.p = 0.75; layout(); dropMany(600); drawCurve(); }, off: reset },
    ];
    function status() {
      const m = mean(), e = st.R * st.p;
      if (!st.drop && st.n > 0 && st.n < 30) return { ok: false, msg: `<b>${st.n} ball${st.n === 1 ? "" : "s"} say little.</b> The bins are lumpy and the average (${m.toFixed(2)}) is ${Math.abs(m - e).toFixed(2)} away from the true middle, ${e.toFixed(1)}. A handful of samples can look like any shape; with thousands, the bell appears and the average settles (the law of large numbers).` };
      if (Math.abs(st.p - 0.5) > 0.12) return { ok: false, msg: `<b>The whole bell has moved.</b> With a ${Math.round(st.p * 100)}% chance of going right at every peg, the middle shifts to bin ${e.toFixed(1)} and the bell narrows on one side. Data from a slanted process looks just like this: still a pattern, but not centred where you expect. Check how your data was collected.` };
      if (st.n < 200) return { msg: `<b>${st.n} balls so far.</b> Each one is unpredictable, but watch the bins: a shape is starting to appear.` };
      return { ok: true, msg: `<b>A bell curve from coin flips.</b> ${st.n.toLocaleString('en-GB')} balls: average bin ${m.toFixed(2)} (expected ${e.toFixed(2)}), spread ${sdev().toFixed(2)}. Each ball's bin is the sum of ${st.R} small random pushes, and sums of many small pushes come out normal.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); layout(); drawCurve(); }, many: n => { dropMany(n); drawCurve(); } };
  },

  story: [
    { t: 'A board of chances', home: true, say: 'Balls drop in at the top of this board and meet row after row of pegs. Nobody can say where a single ball will land.', act: m => m.reset(), wait: 4 },
    { t: 'Every peg is a coin flip', focus: 'pegs', zoom: 1.5, say: 'At every peg the ball goes left or right, like a coin flip, half and half. Ten rows means ten flips.' },
    { t: 'A shape appears', focus: [0, 0.3, 0.5], zoom: 1.2, say: 'Watch the bins at the bottom. Most balls land near the middle, a few at the edges. A shape is appearing.', wait: 5 },
    { t: 'The bell curve', home: true, say: 'With a thousand balls the shape is a smooth bell: the normal distribution. It appears whenever many small random pushes add up, from people\'s heights to the noise in a measurement.', act: m => m.many(1000), wait: 5 },
    { t: 'Too few to tell', home: true, say: 'With only ten balls the bins are lumpy, and could look like almost anything. You need many samples before the true shape shows.', act: m => { m.set({ drop: false }); m.many(10); }, wait: 5 },
    { t: 'A tilted board', home: true, say: 'Tilt every peg so that right is more likely, and the whole bell moves over. Data from a slanted process carries that slant into every model trained on it.', act: m => { m.set({ p: 0.75, drop: true }); m.many(600); }, wait: 5 },
  ],
  check: [
    { q: 'Why do the balls pile up into a bell shape?', options: ['Each bin is the sum of many coin flips, and such sums cluster in the middle', 'The middle bin is bigger', 'The pegs are magnetic'], answer: 0, why: 'There are many more left-right sequences that end near the middle than at the edges.' },
    { q: 'You drop only ten balls. What can you conclude about the shape?', options: ['Exactly the bell curve', 'Very little: ten samples are too few', 'That the board is broken'], answer: 1, why: 'Small samples are noisy; the true shape only shows with many.' },
    { q: 'Every peg sends balls right 75% of the time. What happens to the bell?', options: ['It moves to the right', 'It stays in the middle', 'It disappears'], answer: 0, why: 'The average number of right-bounces rises, so the middle of the bell shifts.' },
  ],
  terms: [
    ['Probability', 'A number from 0 to 1 for how likely something is.'],
    ['Distribution', 'How likely every possible outcome is, often drawn as a histogram or curve.'],
    ['Normal distribution', 'The bell curve: values cluster around an average and thin out evenly on both sides.'],
    ['Mean and standard deviation', 'The middle of a distribution, and how spread out it is.'],
    ['Law of large numbers', 'With more samples, the average of what you see settles on the true average.'],
  ],
  deeper: '<p><b>Exactly which distribution?</b> The board makes a binomial distribution: the number of "rights" in a fixed number of flips. With many rows it becomes almost exactly normal, which is the central limit theorem at work.</p><p><b>Distributions in models.</b> Weights start as random draws from a normal distribution. A language model\'s last layer gives a distribution over every next word. Dropout flips a coin for every neuron.</p><p><b>Other shapes.</b> Arrivals (how many matatus pass in ten minutes) follow a Poisson distribution; waiting times between them follow an exponential one. Picking the right shape matters when you model them.</p>',
  code: {
    title: 'A bean board in Python',
    note: 'Simulate the board, then compare with the bell. Adapted from the course\'s probability lesson.',
    text: `
import random, math

def drop(rows=10, p=0.5):
    # each peg is a coin flip; the bin is the number of "rights"
    return sum(random.random() < p for _ in range(rows))

bins = [0] * 11
for _ in range(1000):
    bins[drop()] += 1

n = sum(bins)
mean = sum(k * c for k, c in enumerate(bins)) / n
sd = math.sqrt(sum(c * (k - mean) ** 2 for k, c in enumerate(bins)) / n)
print(bins)
print(f"mean {mean:.2f} (expected 5.00), sd {sd:.2f} (expected {math.sqrt(10 * 0.25):.2f})")

for k, c in enumerate(bins):
    print(f"{k:2d} {'#' * (c // 5)}")
`,
  },
};
