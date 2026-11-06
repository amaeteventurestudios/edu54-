// Sim-to-real: a rover on a tea estate near Kericho carries seedling trays along rows and must stop before the drain at the end. It travels at 2 m/s; stopping distance
// is v^2 / (2 mu g) for ground friction mu. The policy is when to start braking. In simulation it is tuned to minimise expected cost (60 per metre past the line, 1 per
// metre short) over the training friction: fixed dry clay, randomised, over-randomised, or an adaptive policy that senses wheel slip (noisy estimate) and adds a margin.
// Then it is tested on 1,000 seeded real stops, dry (mu 0.7 to 0.9) or after rain (0.3 to 0.45). All computed for real.
// Break it: train on dry clay only and test after rain (into the drain), over-randomise (stops far short, slow rows), a slip sensor with no margin.
const V0 = 2, G = 9.8, SC = 0.55, END = 0.55;
const stopDist = mu => V0 * V0 / (2 * mu * G);
const TRAIN = [[0.8, 0.8], [0.3, 0.9], [0.05, 1.5], [0.3, 0.9]], REAL = [[0.7, 0.9], [0.3, 0.45]];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const cost = (d, s) => (s > d ? 60 * (s - d) : d - s);
function tune([lo, hi]) { let best = 0, bc = 1e9; for (let d = 0.05; d <= 6; d += 0.01) { let c = 0; for (let k = 0; k <= 40; k++) c += cost(d, stopDist(lo + (hi - lo) * k / 40)); if (c < bc) { bc = c; best = d; } } return best; }
function run(st) {
  const r = rng(17), [lo, hi] = REAL[st.rain ? 1 : 0], fixedD = st.mode < 3 ? tune(TRAIN[st.mode]) : null, margin = st.margin ? 0.12 : 0;
  const stops = []; let over = 0, short = 0;
  for (let i = 0; i < 1000; i++) { const mu = lo + (hi - lo) * r(), s = stopDist(mu);
    const d = fixedD != null ? fixedD : stopDist(Math.max(0.05, mu * (1 + 0.15 * (r() * 2 - 1)))) + margin;
    const gap = d - s; if (gap < 0) over++; else short += gap; stops.push(gap); }
  const time = 1000 * (5.3 / V0) + short / 0.25; /* creeping the short gap at 0.25 m/s */
  return { d: fixedD, stops, over: over / 1000, short: short / Math.max(1, 1000 - over), secs: time / 1000 };
}

export default {
  slug: 'sim-to-real-transfer',
  title: 'Sim-to-real: from simulator to soil',
  description: 'A rover on a tea estate near Kericho must stop before the drain at the end of each row. Its braking was learned in a simulator, but real clay is slippery after rain. Train on one friction, a randomised range, a range far too wide, or let the rover sense slip. Then test it, dry or after rain.',
  overview: 'Robots are trained in simulation because it is fast, cheap and safe: thousands of copies can practise in parallel on one GPU. But a simulator is never exactly the world, and a policy tuned to one set of parameters can fail when friction, mass, motor strength or sensor noise differ: the reality gap. Domain randomisation trains across a range of every parameter that might differ, so the real world looks like one more sample; it needs no real data, but randomising far more than reality needs makes the policy overly cautious. System identification measures the real parameters and plugs them into the simulator; precise, but anything left unmeasured, or anything that changes, such as the weather, still breaks it. Domain adaptation fine-tunes with a little real data. Teacher-student training gives a teacher policy privileged information in simulation, such as the true friction, and distils a student that must infer it from its own sensors, here wheel slip, adding a safety margin for its uncertainty. Real deployments, such as legged robots walking over rough ground, combine massively parallel randomised simulation with teacher-student distillation.',
  keywords: ['sim-to-real', 'reality gap', 'domain randomisation', 'system identification', 'teacher-student', 'robotics'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { mode: 3, rain: true, margin: true };
    const ink = '#151827', X = m => END - m * SC; /* metres before the line → scene x */
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const soilM = new THREE.MeshLambertMaterial({ color: '#A0623A' }), soil = P.box(3.6, 0.03, 0.55, '#A0623A', { r: 0.02, material: soilM }); soil.position.set(-1.25, 0.12, 0.1); S.add(soil);
    for (let k = 0; k < 9; k++) [-0.45, 0.65].forEach(z => { const b = P.ball(0.15, '#3E7D3A'); b.scale.set(1.3, 0.8, 1); b.position.set(-2.8 + k * 0.4, 0.2, z); S.add(b); });
    const drain = P.box(0.35, 0.02, 0.7, '#2B2B38'); drain.position.set(END + 0.2, 0.12, 0.1); S.add(drain);
    const dT = S.text('Drain', { size: 0.12, weight: 800, color: ink }); dT.position.set(END + 0.2, 0.13, 0.6); S.add(dT);
    const line = P.box(0.03, 0.02, 0.6, '#FFFFFF'); line.position.set(END, 0.155, 0.1); S.add(line);
    const brk = P.box(0.03, 0.15, 0.6, '#E0A526'); brk.userData.noFit = true; S.add(brk);
    const brkT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); brkT.userData.noFit = true; S.add(brkT);
    /* stop points from 1,000 trials */
    const geo = new THREE.BoxGeometry(0.02, 0.05, 0.42); geo.translate(0, 0.025, 0);
    const dots = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#fff' }), 1000); dots.frustumCulled = false; dots.userData.noFit = true; dots.layers.set(1); S.add(dots);
    /* the rover */
    const rover = new THREE.Group(); rover.userData.noFit = true; S.add(rover);
    const body = P.box(0.32, 0.12, 0.26, '#E0A526', { r: 0.03 }); body.position.y = 0.06; rover.add(body);
    const tray = P.box(0.26, 0.04, 0.2, '#5E8C31'); tray.position.y = 0.19; rover.add(tray);
    [[-0.1, -0.14], [0.1, -0.14], [-0.1, 0.14], [0.1, 0.14]].forEach(([x, z]) => { const w = P.cyl(0.05, 0.03, '#151827'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.05, z - Math.sign(z) * 0.015); rover.add(w); });
    const rainG = new THREE.Group(); rainG.userData.noFit = true; S.add(rainG);
    for (let k = 0; k < 40; k++) { const d = P.box(0.008, 0.08, 0.008, '#7FB7E0'); d.position.set(-2.8 + (k * 0.37) % 3.6, 0.5 + (k * 0.23) % 0.5, -0.2 + (k * 0.17) % 0.6); d.layers.set(1); rainG.add(d); }
    /* panel: friction ranges */
    const panel = P.box(1.75, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); panel.position.set(2.05, 0.12, 0.1); S.add(panel);
    const pH = S.text('Ground friction μ', { size: 0.11, weight: 800, color: '#6B5E86' }); pH.position.set(2.05, 0.18, -1.0); S.add(pH);
    const MX = mu => 1.3 + Math.min(1.5, mu) / 1.5 * 1.5;
    const ax = P.box(1.5, 0.01, 0.01, ink); ax.position.set(2.05, 0.17, -0.3); S.add(ax);
    [0, 0.5, 1, 1.5].forEach(m => { const t = S.text(String(m), { size: 0.09, weight: 700, color: '#5E5E6E' }); t.position.set(MX(m), 0.18, -0.2); S.add(t); });
    const trBar = P.box(1, 0.06, 0.1, '#6B5E86', { r: 0.02 }); trBar.userData.noFit = true; S.add(trBar);
    const reBar = P.box(1, 0.06, 0.1, '#1F9E89', { r: 0.02 }); reBar.userData.noFit = true; S.add(reBar);
    const trT = S.text('Simulator', { size: 0.1, weight: 800, color: '#6B5E86' }); trT.position.set(1.5, 0.18, -0.6); S.add(trT);
    const reT = S.text('Today', { size: 0.1, weight: 800, color: '#1F9E89' }); reT.position.set(1.42, 0.18, -0.48); S.add(reT);
    const pO = S.text('', { size: 0.13, weight: 800, color: ink, maxW: 1.6 }); pO.position.set(2.05, 0.18, 0.15); S.add(pO);
    const pS = S.text('', { size: 0.13, weight: 800, color: ink, maxW: 1.6 }); pS.position.set(2.05, 0.18, 0.45); S.add(pS);
    const pM = S.text('', { size: 0.11, weight: 700, color: '#5E5E6E', maxW: 1.6 }); pM.position.set(2.05, 0.18, 0.8); S.add(pM);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null, t0 = 0;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const NAMES = ['Fixed (dry clay)', 'Randomised 0.3–0.9', 'Over-randomised', 'Senses slip'];
    function draw() {
      R = run(st);
      soilM.color.set(st.rain ? '#6E3F22' : '#A0623A'); rainG.visible = !!st.rain;
      brk.visible = R.d != null; brkT.visible = R.d != null; if (R.d != null) { const x = X(Math.min(R.d, 5.5)); brk.position.set(x, 0.12, 0.1); brkT.position.set(x, 0.45, 0.1); brkT.userData.set(`Brake ${R.d.toFixed(2)} m out`); }
      R.stops.forEach((g, i) => { const x = Math.max(-2.95, Math.min(END + 0.35, END - g * SC)); m4.makeTranslation(x, 0.14, 0.1 + ((i * 37) % 11 - 5) * 0.004); dots.setMatrixAt(i, m4); dots.setColorAt(i, col.set(g < 0 ? '#C62828' : '#1F3F9A')); });
      dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
      const tr = TRAIN[st.mode], re = REAL[st.rain ? 1 : 0];
      const setBar = (b, [lo, hi], z) => { const w = Math.max(0.03, MX(hi) - MX(lo)); b.scale.x = w; b.position.set((MX(lo) + MX(hi)) / 2, 0.17, z); };
      setBar(trBar, st.mode === 3 ? re : tr, -0.6); setBar(reBar, re, -0.48);
      trT.position.x = Math.max(1.48, Math.min(2.5, MX((st.mode === 3 ? re : tr)[0]) - 0.25)); reT.position.x = Math.max(1.42, MX(re[0]) - 0.22);
      pO.userData.set(`Into the drain: ${Math.round(R.over * 100)}% of stops`, R.over > 0.02 ? '#C62828' : '#1D6B3A');
      pS.userData.set(`Stops ${Math.round(R.short * 100)} cm short on average`, R.short > 0.6 ? '#C62828' : ink);
      pM.userData.set(`${NAMES[st.mode]}${st.mode === 3 ? (st.margin ? ' + margin' : ', no margin') : ''} · ${st.rain ? 'after rain' : 'dry'}`);
    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const cyc = 3.0, u = (t0 % cyc) / cyc, g = R.stops[Math.floor(t0 / cyc) % 50], endX = Math.min(END + 0.35, END - g * SC), x = -2.8 + (endX + 2.8) * (1 - (1 - Math.min(1, u * 1.3)) ** 2);
      rover.position.set(x, 0.135, 0.1); rover.rotation.z = g < 0 && u > 0.75 ? -0.25 : 0; };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Trained on', options: ['Dry clay only', 'Randomised', 'Over-randomised', 'Senses slip'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'buttons', label: 'Today', options: ['Dry', 'After rain'], get: () => (st.rain ? 1 : 0), act: i => { st.rain = !!i; draw(); } },
      { type: 'buttons', label: 'Safety margin', options: ['None', '12 cm'], get: () => (st.margin ? 1 : 0), act: i => { st.margin = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Into the drain', get: () => ({ v: `${Math.round(R.over * 100)}%`, sub: 'of 1,000 real stops', good: R.over < 0.02, bad: R.over > 0.05 }) },
      { label: 'Stops short', get: () => ({ v: `${Math.round(R.short * 100)} cm`, sub: 'average gap before the line', good: R.short < 0.3, bad: R.short > 0.8 }) },
      { label: 'Per row', get: () => ({ v: `${R.secs.toFixed(1)} s`, sub: 'including creeping the gap', good: R.secs < 3.6, bad: R.secs > 5 }) },
    ];
    const labels = [
      { name: 'row', t: 'A tea row', d: 'Blue ticks: where it stopped · red: in the drain', icon: 'target', atV: V(-2.98, 0.2, 0.1) },
      { name: 'mu', t: 'Friction', d: 'Simulator range against today\'s', icon: 'scale', atV: V(2.93, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { mode: 3, rain: true, margin: true }); draw(); };
    const breaks = [
      { label: 'Dry-clay simulator, rain', hint: 'Trained on one friction', on: () => { reset(); st.mode = 0; draw(); }, off: reset },
      { label: 'Over-randomised', hint: 'Friction 0.05 to 1.5 in training', on: () => { reset(); st.mode = 2; st.rain = false; draw(); }, off: reset },
      { label: 'Slip sensor, no margin', hint: 'Trusts a noisy estimate', on: () => { reset(); st.margin = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 0 && R.over > 0.02) return { ok: false, msg: `<b>${Math.round(R.over * 100)}% of stops end in the drain.</b> The simulator only had dry clay at exactly μ = 0.8, so braking starts ${R.d.toFixed(2)} m out, with no room to spare. ${st.rain ? `After rain μ is 0.3 to 0.45 and the rover needs up to ${stopDist(0.3).toFixed(2)} m to stop.` : 'Even dry clay varies from 0.7 to 0.9, and every patch below 0.8 means a late stop.'} Randomise friction in training, or let the rover sense slip.` };
      if (st.mode === 2) return { ok: false, msg: `<b>Safe but slow: ${Math.round(R.short * 100)} cm short every row.</b> Training on friction from 0.05 to 1.5 includes ice-like ground the estate never has, so the policy brakes ${R.d.toFixed(2)} m out just in case, then creeps the rest: ${R.secs.toFixed(1)} s per row. Randomise over the range reality actually spans.` };
      if (st.mode === 3 && !st.margin && R.over > 0.02) return { ok: false, msg: `<b>${Math.round(R.over * 100)}% into the drain.</b> The slip sensor's estimate of friction is off by up to 15%, and with no margin every overestimate means braking too late. A student policy that infers hidden parameters must add a margin for its own uncertainty.` };
      return { ok: true, msg: `<b>${Math.round(R.over * 100)}% into the drain, ${Math.round(R.short * 100)} cm short.</b> ${st.mode === 3 ? 'The rover estimates friction from wheel slip and brakes for today\'s ground, with a 12 cm margin for the estimate\'s error' : `Randomised training brakes ${R.d.toFixed(2)} m out, safe on wet and dry, at the cost of creeping on dry days`}. ` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The rover', home: true, say: 'A rover on a tea estate near Kericho carries seedlings along each row and must stop before the drain at the end.', act: m => m.set({ mode: 3, rain: true, margin: true }) },
    { t: 'Learned in a simulator', home: true, say: 'Its braking was learned in a simulator, where it practised thousands of rows. Real clay is slippery after rain.', act: m => m.set({}) },
    { t: 'Sense the ground', home: true, say: 'This rover senses wheel slip to estimate the friction, and brakes for today\'s ground with a small margin.', act: m => m.set({}) },
    { t: 'Dry-clay simulator', home: true, say: 'Train only on dry clay, and after rain nearly every stop ends in the drain.', act: m => m.set({ mode: 0 }) },
    { t: 'Over-randomised', home: true, say: 'Randomise friction far wider than reality, and the rover brakes metres early every time, then creeps.', act: m => m.set({ mode: 2, rain: false }) },
    { t: 'No margin', home: true, say: 'Trust the slip estimate with no margin, and its small errors put some stops in the drain.', act: m => m.set({ mode: 3, rain: true, margin: false }) },
  ],
  check: [
    { q: 'What is the reality gap?', options: ['Differences between the simulator and the real world', 'Slow simulation', 'Missing rewards'], answer: 0, why: 'Friction, mass, noise and more.' },
    { q: 'What does domain randomisation do?', options: ['Trains across a range of parameters so reality is one more sample', 'Measures the real parameters', 'Removes the simulator'], answer: 0, why: 'No real data needed.' },
    { q: 'What goes wrong if you randomise far too widely?', options: ['The policy becomes overly cautious', 'It crashes more', 'It trains faster'], answer: 0, why: 'It prepares for worlds that never happen.' },
  ],
  terms: [
    ['Reality gap', 'The ways a simulator differs from the world.'],
    ['Domain randomisation', 'Training over ranges of simulator parameters.'],
    ['System identification', 'Measuring real parameters for the simulator.'],
    ['Domain adaptation', 'Fine-tuning on a little real data.'],
    ['Teacher-student', 'A privileged teacher distilled into a sensor-only student.'],
    ['Safety margin', 'Extra room for uncertainty in estimates.'],
  ],
  deeper: '<p><b>Robots on farms.</b> Tea, coffee and flower estates in Kenya and Ethiopia are trying small robots for carrying and spraying. Soil, slope and rain change daily, which is exactly what simulators get wrong.</p><p><b>Parallel simulation.</b> Tools such as Isaac Lab and MuJoCo MJX run thousands of robots on one GPU, so wide randomisation costs hours instead of years.</p><p><b>About this machine.</b> Stopping physics and 1,000 seeded real stops are computed for real; the estate is described, not measured.</p>',
  code: {
    title: 'Tune across a range',
    note: 'Adapted from the course\'s sim-to-real lesson.',
    text: `
def stop_dist(mu, v=2.0, g=9.8):
    return v * v / (2 * mu * g)

def tune_brake(mu_lo, mu_hi, steps=40):
    def cost(d):
        return sum(60 * max(0, stop_dist(m) - d) + max(0, d - stop_dist(m))
                   for m in linspace(mu_lo, mu_hi, steps))
    return min(arange(0.05, 6, 0.01), key=cost)
`,
  },
};
