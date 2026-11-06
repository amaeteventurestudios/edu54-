// Build your own pedometer: an invented community health worker in Kisumu walks for ten seconds with a phone in her bag, and the phone slowly
// tilts. The accelerometer measures gravity plus her motion plus jitter on three axes, 50 times a second. The pipeline estimates gravity with a
// slow low-pass filter, subtracts it, and projects what is left onto gravity's direction, so it measures up-and-down motion whatever way the
// phone faces; a second low-pass filter removes jitter; a step is counted when the signal rises through a threshold, at least 0.3 s after the
// last. The signal is simulated with 18 real steps; every count is computed live.
const HZ = 50, T = 10, N = HZ * T, STEP = 0.55, TRUE_STEPS = Math.floor(T / STEP);
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function signal() {
  const raw = [];
  for (let i = 0; i < N; i++) {
    const t = i / HZ, tilt = Math.min(1.25, t * 0.14);
    const g = [Math.sin(tilt), 0, Math.cos(tilt)];
    const phase = (t % STEP) / STEP, a = 0.32 * Math.exp(-Math.pow((phase - 0.3) / 0.12, 2)) - 0.08;
    const n = () => (rnd(i * 3 + raw.length) - 0.5) * 0.22;
    raw.push([g[0] * (1 + a) + n(), (rnd(i * 7 + 5) - 0.5) * 0.22, g[2] * (1 + a) + (rnd(i * 11 + 9) - 0.5) * 0.22]);
  }
  return raw;
}
const RAW = signal();
function count(o) {
  let grav = [...RAW[0]], smooth = 0;
  const vert = [], steps = [];
  let last = -1e9, prev = 0;
  RAW.forEach((s, i) => {
    let v;
    if (o.gravity) {
      grav = grav.map((g, k) => 0.96 * g + 0.04 * s[k]);
      const gl = Math.hypot(...grav), u = grav.map(g => g / gl), user = s.map((x, k) => x - grav[k]);
      v = user[0] * u[0] + user[1] * u[1] + user[2] * u[2];
    } else v = s[2] - 1;
    smooth = o.filter ? 0.75 * smooth + 0.25 * v : v;
    vert.push(smooth);
    const t = i / HZ;
    if (prev < o.thr && smooth >= o.thr && (!o.gap || t - last >= 0.3)) { steps.push(i); last = t; }
    prev = smooth;
  });
  return { vert, steps, n: steps.length, err: steps.length - TRUE_STEPS };
}

export default {
  slug: 'build-a-pedometer',
  title: 'Build your own pedometer',
  description: 'A health worker walks for ten seconds with a phone in her bag, and the phone slowly tilts.',
  overview: 'A phone\'s accelerometer reports acceleration along its own three axes many times a second, and that reading always includes gravity, about 9.8 metres per second squared, pointing towards the ground, plus whatever the phone is doing. The 500 Lines or Less pedometer shows how to turn this into steps. The first problem is that the phone can face any way and can turn while you walk, so you cannot simply watch one axis. Instead, estimate gravity with a slow low-pass filter, a running average that follows the steady part of the signal and ignores quick changes; subtract it to leave the user\'s own acceleration; and take the dot product with gravity\'s direction, which gives the up-and-down component of the motion whatever way the phone is held. Walking makes this vertical signal rise and fall once per step. The second problem is noise: the sensor jitters, so the raw signal wobbles around each peak and crosses any threshold several times. A second low-pass filter smooths it, at the cost of a tiny delay. Then a step is counted each time the smoothed signal rises through a threshold, chosen high enough to ignore small movements and low enough to catch gentle steps, and a minimum gap between steps, about a third of a second, stops one step from counting twice. Real pedometers adapt the threshold to each walker and check that steps come in a steady rhythm. This machine simulates an invented community health worker in Kisumu, with 18 real steps hidden in the signal.',
  keywords: ['build your own pedometer', 'accelerometer', 'signal processing', 'low-pass filter', 'gravity removal', 'peak detection', '500 lines or less'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/a-pedometer-in-the-real-world.html" target="_blank" rel="noopener">A Pedometer in the Real World</a> by Dessy Daskalov, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short step counter, written for this lesson after the 500 Lines pedometer (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { gravity: true, filter: true, thr: 0.09, gap: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const X = i => -2.75 + i / N * 3.7, Z = v => -0.25 - v * 1.6;
    floor.add(P.tube([V(X(0), 0.15, Z(0)), V(X(N), 0.15, Z(0))], 0.005, '#B9B3A6', { straight: true }));
    const thrBar = P.box(3.7, 0.006, 0.014, SAF, { r: 0.003 }); thrBar.userData.noFit = true; floor.add(thrBar);

    for (let k = 0; k < TRUE_STEPS; k++) { const i = Math.round((k * STEP + 0.3 * STEP) * HZ), m = P.box(0.012, 0.006, 0.08, CHAR, { r: 0.002 }); m.position.set(X(i), 0.15, 0.48); floor.add(m); }

    let curve = null, marks = [];
    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = count(st);
      if (curve) curve.parent.remove(curve);
      marks.forEach(m => m.parent.remove(m)); marks = [];
      const pts = R.vert.map((v, i) => V(X(i), 0.16, Z(Math.max(-0.45, Math.min(0.45, v)))));
      curve = P.tube(pts, 0.008, st.gravity && st.filter ? GOOD : '#E07A5F', { straight: true }); curve.userData.noFit = true; floor.add(curve);
      thrBar.position.set(X(N / 2), 0.15, Z(st.thr));
      R.steps.forEach(i => { const m = P.ball(0.03, RED); m.position.set(X(i), 0.17, 0.36); m.userData.noFit = true; floor.add(m); marks.push(m); });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return Math.abs(R.err) <= 1 && st.gravity && st.filter && st.gap; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Threshold (g)', min: 0.02, max: 0.3, step: 0.01, get: () => st.thr, set: v => set({ thr: +v }), fmt: v => (+v).toFixed(2) },
      { type: 'toggle', label: 'Remove gravity, whatever the tilt', short: 'Gravity', get: () => st.gravity, set: v => set({ gravity: !!v }) },
      { type: 'toggle', label: 'Low-pass filter the jitter', short: 'Smooth', get: () => st.filter, set: v => set({ filter: !!v }) },
      { type: 'toggle', label: 'At least 0.3 s between steps', short: 'Gap', get: () => st.gap, set: v => set({ gap: !!v }) },
    ];
    const readouts = [
      { label: 'Steps counted', get: () => ({ v: `${R.n}`, sub: `${TRUE_STEPS} real`, good: Math.abs(R.err) <= 1, bad: Math.abs(R.err) > 2 }) },
      { label: 'Error', get: () => ({ v: `${R.err > 0 ? '+' : ''}${R.err}`, sub: 'counted minus real', good: Math.abs(R.err) <= 1, bad: Math.abs(R.err) > 2 }) },
      { label: 'Threshold', get: () => ({ v: `${st.thr.toFixed(2)} g`, sub: 'rise to count', good: st.thr >= 0.06 && st.thr <= 0.14, bad: st.thr < 0.04 || st.thr > 0.2 }) },
    ];
    const labels = [
      { name: 's', t: 'Vertical motion', d: 'Ten seconds of walking', icon: 'wave', atV: V(-2.0, 0.15, -0.25) },
      { name: 't', t: 'The count', d: 'Against 18 real steps', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read one axis, ignore gravity', hint: 'the tilt hides steps', on: () => set({ ...D0, gravity: false }), off: reset },
      { label: 'Skip the smoothing', hint: 'jitter double-counts', on: () => set({ ...D0, filter: false, gap: false }), off: reset },
      { label: 'Set the threshold too high', hint: 'gentle steps missed', on: () => set({ ...D0, thr: 0.16 }), off: reset },
    ];
    function status() {
      const r = R, e = r.err;
      if (!st.gravity) return { ok: false, msg: `<b>Reading only the phone\'s z axis, the slow tilt moves gravity onto another axis, so the signal sinks below the threshold: ${r.n} steps counted of ${TRUE_STEPS}.</b> Estimate gravity with a slow filter, subtract it, and project onto its direction.` };
      if (!st.filter && e > 1) return { ok: false, msg: `<b>Without smoothing, sensor jitter makes the signal cross the threshold several times around each peak: ${r.n} steps counted for ${TRUE_STEPS} real ones.</b> Low-pass filter the signal${st.gap ? '' : ', and require a gap between steps'}.` };
      if (e < -1) return { ok: false, msg: `<b>With the threshold at ${st.thr.toFixed(2)} g, the gentler steps never reach it: ${r.n} of ${TRUE_STEPS} counted.</b> Lower it until every step crosses, but keep it above the jitter.` };
      if (e > 1) return { ok: false, msg: `<b>At ${st.thr.toFixed(2)} g the threshold sits in the jitter, so small wobbles count as steps: ${r.n} counted for ${TRUE_STEPS}.</b> Raise it${st.gap ? '' : ', and require a gap between steps'}.` };
      if (!st.filter || !st.gap) return { ok: false, msg: `<b>The count is ${r.n}, close to ${TRUE_STEPS} here, but without ${!st.filter ? 'smoothing' : 'a minimum gap'} a noisier walk would double-count.</b>` };
      return { ok: true, msg: `<b>Gravity removed whatever the tilt, jitter smoothed, and each rise through ${st.thr.toFixed(2)} g at least 0.3 s apart counted once: ${r.n} steps for ${TRUE_STEPS} real ones.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ten seconds of walking', home: true, say: 'A health worker walks with a phone in her bag. Its accelerometer reads gravity, her motion and jitter.', act: m => m.set({ gravity: false, filter: false, thr: 0.09, gap: false }) },
    { t: 'The phone tilts', home: true, say: 'Read one axis and the slow tilt drags the signal down. Steps disappear.', act: m => m.set({ gravity: false, filter: true, thr: 0.09, gap: true }) },
    { t: 'Remove gravity', home: true, say: 'Estimate gravity with a slow filter, subtract it, and keep the up-and-down part.', act: m => m.set({ gravity: true, filter: false, thr: 0.09, gap: false }) },
    { t: 'Smooth the jitter', home: true, say: 'Jitter crosses the threshold several times per step. A low-pass filter smooths it.', act: m => m.set({ gravity: true, filter: true, thr: 0.09, gap: false }) },
    { t: 'The threshold', home: true, say: 'Too high and gentle steps are missed. Too low and wobbles count.', act: m => m.set({ gravity: true, filter: true, thr: 0.16, gap: true }) },
    { t: 'Eighteen steps', home: true, say: 'A sensible threshold and a short gap between steps: every step counted once.', act: m => m.set({ gravity: true, filter: true, thr: 0.09, gap: true }) },
  ],
  check: [
    { q: 'Why not just read one accelerometer axis?', options: ['The phone tilts, moving gravity onto other axes', 'One axis is too noisy', 'It is slower'], answer: 0, why: 'Project onto gravity\'s direction.', hint: 'Try Read one axis, ignore gravity.' },
    { q: 'What does the low-pass filter remove?', options: ['Quick jitter around each peak', 'Gravity', 'The steps'], answer: 0, why: 'Fewer false crossings.', hint: 'Try Skip the smoothing.' },
    { q: 'What does a minimum gap between steps prevent?', options: ['One step counting twice', 'Missed steps', 'Tilt'], answer: 0, why: 'About a third of a second.', hint: 'Turn off the gap.' },
  ],
  terms: [
    ['Accelerometer', 'A sensor measuring acceleration along three axes.'],
    ['Gravity', 'The steady 1 g pull the accelerometer always sees.'],
    ['Low-pass filter', 'Keeps slow changes, smooths quick ones.'],
    ['Dot product', 'How much of one vector points along another.'],
    ['Threshold', 'The level a rise must cross to count as a step.'],
    ['Refractory gap', 'The minimum time before another step can count.'],
  ],
  deeper: '<p><b>Adaptive thresholds.</b> Real pedometers adjust the threshold to each walker and check that steps keep a steady rhythm before counting them.</p><p><b>Other activities.</b> The same pipeline, with different filters, detects running, cycling or falls.</p><p><b>About this machine.</b> The walker and signal are simulated: 18 real steps, a slow tilt and random jitter.</p>',
  code: {
    title: 'Count steps from accelerometer samples',
    note: 'Our own short version, after the 500 Lines pedometer.',
    text: `
import math

def steps(samples, hz=50, threshold=0.09, gap_s=0.3):
    gravity = list(samples[0])
    smooth, prev, last, count = 0.0, 0.0, -1e9, 0
    for i, s in enumerate(samples):
        gravity = [0.96 * g + 0.04 * x for g, x in zip(gravity, s)]   # slow low-pass
        norm = math.sqrt(sum(g * g for g in gravity))
        user = [x - g for x, g in zip(s, gravity)]
        vertical = sum(u * g / norm for u, g in zip(user, gravity))    # along gravity
        smooth = 0.75 * smooth + 0.25 * vertical                      # remove jitter
        t = i / hz
        if prev < threshold <= smooth and t - last >= gap_s:
            count += 1
            last = t
        prev = smooth
    return count
`,
  },
};
