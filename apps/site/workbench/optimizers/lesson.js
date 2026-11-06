// Optimizers: three balls race down a long, narrow valley: plain gradient descent zigzags across it, momentum builds speed along it,
// Adam gives each direction its own step size. Their trails and loss curves are compared.
// Break it: a learning rate too big for plain descent (it bounces out), momentum with no friction (it overshoots and circles), Adam with a tiny step (it crawls).
const loss = (x, z) => 0.5 * (0.04 * x * x + 4.0 * z * z);      // shallow along x, steep across z
const grad = (x, z) => [0.04 * x, 4.0 * z];
const START = [-4.5, 0.7], HALF = 5, HZ = 1.1;
const OPT = [{ k: 'sgd', n: 'Plain', c: '#8E91A3' }, { k: 'mom', n: 'Momentum', c: '#EE7434' }, { k: 'adam', n: 'Adam', c: '#1C9A94' }];

export default {
  slug: 'optimizers',
  title: 'Optimizers: smarter steps downhill',
  description: 'Three balls race down a long, narrow valley. Plain gradient descent zigzags from wall to wall, momentum builds speed along the floor, and Adam gives each direction its own step size. Then turn the step up until plain descent bounces out, and take away momentum\'s friction.',
  overview: 'Gradient descent takes a step against the slope. In real loss landscapes the valley is often long and narrow: steep across, gentle along. Plain descent then zigzags across the walls while crawling along the floor. Momentum keeps a running average of past steps, so the zigzags cancel and the speed along the floor builds. Adam goes further and scales each direction by how big its slopes have been, taking big steps where the ground is gentle and small ones where it is steep. Adam is the default for most deep learning today.',
  keywords: ['optimizers deep learning', 'sgd momentum adam', 'adam optimizer explained', 'learning rate', 'ravine loss landscape'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.7, -0.3], dir: [0.2, 1.25, 1.05], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { lr: 0.42, beta: 0.8, on: [true, true, true], adamLr: 0.15, t: 0, acc: 0 };
    const SX = 0.65, SZ = 1.0, Y = 0.32, X = x => x * SX, Z = z => z * SZ, H = (x, z) => 0.1 + Math.min(1.6, loss(x, z)) * Y;
    /* ---------- the valley ---------- */
    const geo = new THREE.PlaneGeometry(HALF * 2 * SX, HZ * 2 * SZ, 80, 32).translate(0, 0, 0); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), lo = new THREE.Color('#2E5E4E'), hi = new THREE.Color('#E8D9B5'), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / SX, z = pos.getZ(i) / SZ; const edge = Math.abs(Math.abs(pos.getX(i)) - HALF * SX) < 1e-4 || Math.abs(Math.abs(pos.getZ(i)) - HZ * SZ) < 1e-4; pos.setY(i, edge ? 0.05 : H(x, z)); const u = Math.floor(Math.min(1, loss(x, z) / 1.6) * 8) / 8; cc.copy(lo).lerp(hi, u); cols.set([cc.r, cc.g, cc.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); land.receiveShadow = true; S.add(land);
    const base = P.box(HALF * 2 * SX + 0.2, 0.1, HZ * 2 * SZ + 0.2, '#5B4636', { r: 0.06 }); S.add(base);
    const goal = P.cyl(0.12, 0.04, C.gold, { seg: 20 }); goal.position.set(0, H(0, 0), 0); S.add(goal);
    /* ---------- the racers ---------- */
    const racers = OPT.map(o => {
      const ball = P.ball(0.1, o.c); ball.userData.noFit = true; S.add(ball);
      const TR = 160, trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: o.c }), TR); trail.count = 0; trail.userData.noFit = true; trail.layers.set(1); S.add(trail);
      return { ...o, ball, trail, TR };
    });
    const dummy = new THREE.Object3D();
    /* ---------- loss race chart ---------- */
    const CX = 0, CZ = -HZ * SZ - 0.35, CW = 6, CH = 2.0, CY = 1.0;
    const chart = P.box(CW + 0.2, CH, 0.08, '#FBF8F1', { r: 0.04 }); chart.position.set(CX, 0, CZ); S.add(chart);
    const lines = OPT.map(o => { const t = P.tube([V(), V(1, 0, 0)], 0.03, o.c); t.userData.noFit = true; S.add(t); return t; });
    const chartT = S.text('loss after each step (lower is better)', { size: 0.16, weight: 800, face: 'front', color: '#151827', maxW: 5 }); chartT.position.set(CX, CY - 0.17, CZ + 0.045); S.add(chartT);
    const chartTop = S.text('the race', { size: 0.06, weight: 800, maxW: 2 }); chartTop.position.set(CX, CH + 0.005, CZ); S.add(chartTop);
    function run() {
      // simulate each optimiser for 120 steps
      return OPT.map(o => {
        let [x, z] = START, vx = 0, vz = 0, mx = 0, mz = 0, sx = 0, sz = 0; const path = [[x, z]];
        for (let t = 1; t <= 120; t++) {
          const [gx, gz] = grad(x, z);
          if (o.k === 'sgd') { x -= st.lr * gx; z -= st.lr * gz; }
          else if (o.k === 'mom') { vx = st.beta * vx + gx; vz = st.beta * vz + gz; x -= st.lr * vx; z -= st.lr * vz; }
          else { mx = 0.9 * mx + 0.1 * gx; mz = 0.9 * mz + 0.1 * gz; sx = 0.999 * sx + 0.001 * gx * gx; sz = 0.999 * sz + 0.001 * gz * gz; const mh = 1 - 0.9 ** t, sh = 1 - 0.999 ** t; x -= st.adamLr * (mx / mh) / (Math.sqrt(sx / sh) + 1e-8); z -= st.adamLr * (mz / mh) / (Math.sqrt(sz / sh) + 1e-8); }
          if (!Number.isFinite(x + z) || Math.abs(z) > 50) { x = Math.max(-HALF, Math.min(HALF, x || 0)); z = Math.sign(z || 1) * HZ; path.push([x, z]); path.out = true; break; }
          path.push([x, z]);
        }
        return path;
      });
    }
    let paths = run();
    function redraw() {
      paths = run(); st.t = 0;
      lines.forEach((ln, i) => { const p = paths[i], pts = p.map(([x, z], t) => V(CX - CW / 2 + 0.15 + t / 120 * (CW - 0.3), CY + Math.min(CH - CY - 0.3, loss(x, z) * 0.55), CZ + 0.07)); if (pts.length < 2) pts.push(pts[0].clone().add(V(0.01, 0, 0))); ln.geometry.dispose(); ln.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), pts.length * 2, 0.03, 5, false); ln.visible = st.on[i]; });
    }
    function update(dt) {
      st.t = Math.min(120, st.t + dt * (S.reduced ? 120 : 24));
      const k = Math.floor(st.t);
      racers.forEach((r, i) => {
        const p = paths[i], j = Math.min(k, p.length - 1), [x, z] = p[j];
        r.ball.visible = st.on[i]; r.trail.visible = st.on[i];
        const cx = Math.max(-HALF, Math.min(HALF, x)), cz = Math.max(-HZ, Math.min(HZ, z));
        r.ball.position.set(X(cx), H(cx, cz) + 0.1, Z(cz));
        r.trail.count = Math.min(r.TR, j + 1);
        for (let q = 0; q < r.trail.count; q++) { const [a, b] = p[q], ca = Math.max(-HALF, Math.min(HALF, a)), cb = Math.max(-HZ, Math.min(HZ, b)); dummy.position.set(X(ca), H(ca, cb) + 0.03, Z(cb)); dummy.updateMatrix(); r.trail.setMatrixAt(q, dummy.matrix); }
        r.trail.instanceMatrix.needsUpdate = true;
      });
    }
    redraw();
    const final = i => { const p = paths[i], [x, z] = p[p.length - 1]; return p.out ? Infinity : loss(x, z); };
    const stepsTo = i => { const p = paths[i]; if (p.out || p.length < 121) return null; let k = p.length; while (k > 0 && loss(...p[k - 1]) < 0.02) k--; return k >= p.length ? null : k; };
    const controls = [
      { type: 'slider', label: 'Learning rate (plain and momentum)', min: 0.05, max: 0.6, step: 0.01, get: () => st.lr, set: v => { st.lr = v; redraw(); } },
      { type: 'slider', label: 'Momentum (how much speed is kept)', min: 0, max: 0.999, step: 0.01, get: () => st.beta, set: v => { st.beta = v; redraw(); } },
      { type: 'slider', label: 'Adam step size', min: 0.005, max: 0.6, step: 0.005, get: () => st.adamLr, set: v => { st.adamLr = v; redraw(); } },
      { type: 'button', label: 'Race again', short: 'Race', act: () => { st.t = 0; } },
    ];
    const readouts = OPT.map((o, i) => ({ label: o.n, get: () => { const s = stepsTo(i), f = final(i); return { v: !Number.isFinite(f) ? 'flew out' : s != null ? `${s} steps` : 'not there', sub: Number.isFinite(f) ? `loss ${f.toFixed(3)}` : '', good: s != null && s < 60, bad: !Number.isFinite(f) || s == null }; } }));
    const labels = [
      { name: 'valley', t: 'A long, narrow valley', d: 'Steep across, gentle along', icon: 'wave', atV: V(X(-HALF), H(-HALF, -HZ), Z(-HZ)) },
      { name: 'goal', t: 'The bottom', d: 'Gold: the lowest loss', icon: 'target', atV: V(0, H(0, 0) + 0.05, 0) },
      { name: 'racers', t: 'Three optimisers', d: 'Grey plain, orange momentum, teal Adam', icon: 'spark', atV: V(X(HALF), H(HALF, -HZ), Z(-HZ)) },
      { name: 'chart', t: 'The race, step by step', d: 'Loss after each step', icon: 'scale', atV: V(CX + CW / 2 + 0.1, CH * 0.75, CZ) },
    ];
    const reset = () => { Object.assign(st, { lr: 0.42, beta: 0.8, adamLr: 0.15 }); redraw(); };
    const breaks = [
      { label: 'Plain descent, step too big', hint: 'Learning rate 0.53', on: () => { reset(); st.lr = 0.53; redraw(); }, off: reset },
      { label: 'Momentum with no friction', hint: 'Keep 99.9% of the speed', on: () => { reset(); st.beta = 0.999; redraw(); }, off: reset },
      { label: 'Adam with a tiny step', hint: 'Step size 0.01', on: () => { reset(); st.adamLr = 0.01; redraw(); }, off: reset },
    ];
    function status() {
      const s = [0, 1, 2].map(stepsTo), f = [0, 1, 2].map(final);
      if (!Number.isFinite(f[0])) return { ok: false, msg: `<b>Plain descent bounced out.</b> Across the valley the walls are steep (100 times steeper than along it), so a learning rate of ${st.lr.toFixed(2)} overshoots the floor further on every step until the ball flies off. A step small enough for the steep direction is painfully slow along the gentle one: that is the zigzag problem.` };
      if (st.beta > 0.99 && s[1] == null) return { ok: false, msg: `<b>No friction, no settling.</b> Keeping 99.9% of its speed, the momentum ball races past the bottom, swings back, and keeps circling the goal long after it should have stopped (loss ${f[1].toFixed(3)} after 120 steps). Values from 0.8 to 0.9 are the usual choice.` };
      if (st.adamLr < 0.03 && s[2] == null) return { ok: false, msg: `<b>Adam is crawling.</b> Each Adam step moves each weight by roughly the step size, so at ${st.adamLr.toFixed(3)} it is still far from the bottom after 120 steps (loss ${f[2].toFixed(3)}). Adam evens out steep and gentle directions, but the overall step size still has to be sensible.` };
      return { ok: true, msg: `<b>The race:</b> plain ${s[0] != null ? `${s[0]} steps` : 'still crawling after 120'}, momentum ${s[1] != null ? `${s[1]} steps` : 'not there yet'}, Adam ${s[2] != null ? `${s[2]} steps` : 'not there yet'} to reach the bottom. Plain descent zigzags across the steep walls and crawls along the floor; momentum lets the zigzags cancel and builds speed; Adam scales each direction so both move at a sensible pace, with little tuning.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); redraw(); }, race: () => { st.t = 0; } };
  },

  story: [
    { t: 'A long, narrow valley', home: true, say: 'Real loss landscapes often look like this: a long, narrow valley, steep across and gentle along. The gold mark is the bottom.', act: m => m.reset() },
    { t: 'Plain steps zigzag', home: true, say: 'Plain gradient descent steps straight against the slope. The steep walls throw it from side to side, while it crawls along the gentle floor.', act: m => m.race(), wait: 5 },
    { t: 'Momentum', home: true, say: 'Momentum keeps a running average of its steps. The side-to-side pushes cancel out, while the push along the valley adds up, so it picks up speed where it matters.', act: m => m.race(), wait: 5 },
    { t: 'Adam', home: true, say: 'Adam goes further: it remembers how steep each direction has been, and divides by that. Small steps across the steep walls, big steps along the gentle floor.', act: m => m.race(), wait: 5 },
    { t: 'Too big a step', home: true, say: 'Turn plain descent\'s step up a little, and the steep walls throw it further each time until it flies out of the valley.', act: m => m.set({ lr: 0.53 }), wait: 5 },
    { t: 'The usual choice', home: true, say: 'The wall shows the race step by step. A carefully tuned momentum can win on one valley, but Adam does well on most landscapes with little tuning, which is why it is the default for deep learning.', act: m => m.set({ lr: 0.42 }) },
  ],
  check: [
    { q: 'Why does plain gradient descent zigzag in a narrow valley?', options: ['The steep walls push it from side to side more than the gentle floor pulls it along', 'It has no learning rate', 'It moves at random'], answer: 0, why: 'The gradient points mostly across the valley, not along it.' },
    { q: 'What does momentum do?', options: ['Averages past steps so consistent directions build speed', 'Resets the weights', 'Removes the learning rate'], answer: 0, why: 'Opposite pushes cancel; steady ones accumulate.' },
    { q: 'What makes Adam different?', options: ['Each direction gets its own step size, based on how big its slopes have been', 'It never uses gradients', 'It only works on small models'], answer: 0, why: 'Dividing by the recent slope size evens out steep and gentle directions.' },
  ],
  terms: [
    ['Optimizer', 'The rule that turns gradients into weight updates.'],
    ['SGD', 'Stochastic gradient descent: step against the gradient of a small batch.'],
    ['Momentum', 'A running average of past gradients, like a ball gaining speed.'],
    ['Adam', 'Momentum plus a per-weight step size scaled by recent gradient size.'],
    ['Learning rate schedule', 'Changing the step size during training, usually shrinking it.'],
  ],
  deeper: '<p><b>Inside Adam.</b> It keeps two running averages for every weight: of the gradient (the direction) and of the squared gradient (how bumpy). The step is the first divided by the square root of the second, with a correction for the first few steps when the averages start at zero.</p><p><b>AdamW</b> applies weight decay separately from the gradient step, which works better and is what most language models use.</p><p><b>SGD still has fans.</b> For some vision models, well-tuned SGD with momentum generalises slightly better than Adam. The landscape matters.</p>',
  code: {
    title: 'SGD, momentum and Adam in a few lines',
    note: 'Adapted from the course\'s optimizer lesson.',
    text: `
import numpy as np

def sgd(w, g, state, lr=0.1):
    return w - lr * g

def momentum(w, g, state, lr=0.1, beta=0.9):
    state["v"] = beta * state.get("v", 0) + g
    return w - lr * state["v"]

def adam(w, g, state, lr=0.01, b1=0.9, b2=0.999, eps=1e-8):
    t = state["t"] = state.get("t", 0) + 1
    state["m"] = b1 * state.get("m", 0) + (1 - b1) * g
    state["s"] = b2 * state.get("s", 0) + (1 - b2) * g * g
    m_hat = state["m"] / (1 - b1 ** t)
    s_hat = state["s"] / (1 - b2 ** t)
    return w - lr * m_hat / (np.sqrt(s_hat) + eps)
`,
  },
};
