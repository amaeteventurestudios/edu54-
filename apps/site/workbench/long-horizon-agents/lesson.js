// Long-horizon agents (phase 15, lesson 1): a chatbot answers in one turn; an agent runs hundreds of steps. Per-step reliability compounds (p^n),
// so a 99% step fails half of 70-step runs. Each step is a tile, coloured by the chance the run is still on track. Checkpoints verify and resume
// every 20 steps (two retries), and a trajectory audit catches the silent failures a final-answer review passes. All numbers are computed live.
const K = 20, RETRY = 2, SILENT = 0.4;
function run(p, n, ckpt) {
  if (!ckpt) return Math.pow(p, n);
  let e = 1;
  for (let s = 0; s < n; s += K) { const seg = Math.pow(p, Math.min(K, n - s)); e *= 1 - Math.pow(1 - seg, RETRY + 1); }
  return e;
}
function model(o) {
  const truth = run(o.p, o.n, o.ckpt), raw = Math.pow(o.p, o.n);
  const reported = o.audit ? truth : truth + SILENT * (1 - truth);
  const half = Math.floor(Math.log(0.5) / Math.log(o.p));
  return { truth, raw, reported, half };
}
const pct = x => `${Math.round(x * 100)}%`;

export default {
  slug: 'long-horizon-agents',
  title: 'Long-horizon agents: why small errors compound',
  description: 'An agent runs hundreds of steps, and small per-step errors compound. Watch a run fail, then add checkpoints and an audit of every step.',
  overview: 'A chatbot is a stateless function: a prompt in, a reply out, nothing remembered. An autonomous agent runs a loop, decides when to stop, and spends tokens and causes side effects along the way, and frontier agents now work for minutes to hours on a single task. METR measures this as a time horizon: the length of task, in expert human time, that a model completes at 50% reliability. Since 2019 that horizon has doubled roughly every seven months. Long runs break the assumptions built for single turns. Errors compound: if each step succeeds with probability p, a run of n steps succeeds with p to the power n, so a 99% step finishes only half of 70-step runs and a 99.5% step about one in five 300-step runs. Context outgrows the window and needs compression, checkpoints and memory. The review unit moves from the final answer to the trajectory, because many failures are silent: drift, loops, a wrong file edited along the way, while the final answer still looks fine. Cost has a fat tail, so budgets and kill switches matter. And a horizon from a benchmark is a ceiling, not a floor: models have been observed behaving differently when they can tell they are being tested, so you need your own evaluations on your own tasks. The defences in this phase start here: verify and checkpoint often so one bad step costs a segment, not the run, and audit the whole trajectory.',
  keywords: ['autonomous agents', 'long-horizon tasks', 'reliability', 'METR time horizon', 'checkpoints', 'AI agents', 'AI safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.15], dir: [0.05, 1.2, 1.0], half: 1.3, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { p: 0.995, n: 120, ckpt: true, audit: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const COLS = 30, ROWS = 10, CELL = 0.1, GX = -2.95, GZ = -1.1;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.06, 0.085), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), COLS * ROWS);
    im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const gridBase = P.box(COLS * CELL + 0.1, 0.03, ROWS * CELL + 0.1, '#F6F1E6', { r: 0.03 }); gridBase.position.set(GX + COLS * CELL / 2, 0, GZ + ROWS * CELL / 2); S.add(gridBase);
    const poles = Array.from({ length: 15 }, () => { const b = P.box(0.03, 0.16, 0.03, SAF, { r: 0.005 }); b.userData.noFit = true; S.add(b); return b; });
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), cG = new THREE.Color(GOOD), cB = new THREE.Color(BAD);
    const LENS = [10, 25, 50, 100, 200, 300], BX = i => 0.75 + i * 0.4;
    const bars = LENS.map((L, i) => {
      const mk = (dx, c) => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.14, 1, 0.14, c, { r: 0.02, material: m }); b.position.set(BX(i) + dx, 0, 0.3); b.userData.noFit = true; S.add(b); return b; };
      return { raw: mk(-0.08, '#C9C4B8'), ck: mk(0.08, GOOD) };
    });
    const half = P.box(2.45, 0.01, 0.012, RED, { r: 0.002 }); half.position.set(1.75, 0.5 * 0.7, 0.3); S.add(half);

    /* the end of the run: a tower for the share truly on track (green, red below 90%) and, with only a final-answer review, the share reported (gold) */
    const tr = P.tower(0.35, 0.35, GOOD, { h: 0.5 }); tr.userData.set({ cap: '' }); tr.position.set(GX + COLS * CELL / 2 - 0.3, 0, 0.55); S.add(tr);
    const rp = P.tower(0.35, 0.35, SAF, { h: 0.5 }); rp.userData.set({ cap: '' }); rp.position.set(GX + COLS * CELL / 2 + 0.3, 0, 0.55); S.add(rp);
    S.add(P.keep(-3.0, 3.05, 1.0, -1.15, 0.8));
    let R = null;
    function draw() {
      R = model(st);
      for (let i = 0; i < COLS * ROWS; i++) {
        const on = i < st.n, x = i % COLS, y = Math.floor(i / COLS);
        const local = st.ckpt ? i % K : i, s = Math.pow(st.p, local + 1);
        m4.makeScale(1, on ? 1 : 0.15, 1).setPosition(GX + (x + 0.5) * CELL, 0.06, GZ + (y + 0.5) * CELL);
        im.setMatrixAt(i, m4); im.setColorAt(i, on ? col.copy(cB).lerp(cG, s) : col.set('#E4DED1'));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      poles.forEach((b, k) => { const i = (k + 1) * K - 1, on = st.ckpt && i < st.n; b.visible = on; if (on) b.position.set(GX + (i % COLS + 0.5) * CELL + 0.05, 0.03, GZ + (Math.floor(i / COLS) + 0.5) * CELL); });
      LENS.forEach((L, i) => {
        const a = Math.pow(st.p, L), c = run(st.p, L, true);
        bars[i].raw.scale.y = Math.max(0.01, a * 0.7); bars[i].ck.scale.y = Math.max(0.01, c * 0.7);
      });
      tr.userData.set({ h: Math.max(0.03, R.truth * 0.9), color: R.truth >= 0.9 ? GOOD : BAD }); rp.visible = !st.audit; rp.userData.set({ h: R.reported * 0.9 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Reliability of each step', min: 0.95, max: 0.999, step: 0.001, get: () => st.p, set: v => set({ p: +v }), fmt: v => (+v).toFixed(3) },
      { type: 'slider', label: 'Steps in the run', min: 10, max: 300, step: 10, get: () => st.n, set: v => set({ n: Math.round(v) }) },
      { type: 'toggle', label: 'Verify and resume from checkpoints', short: 'Checkpoints', get: () => st.ckpt, set: v => set({ ckpt: !!v }) },
      { type: 'toggle', label: 'Audit the whole trajectory', short: 'Audit', get: () => st.audit, set: v => set({ audit: !!v }) },
    ];
    const readouts = [
      { label: 'On track at the end', get: () => ({ v: pct(R.truth), sub: `${st.n} steps`, good: R.truth >= 0.9, bad: R.truth < 0.5 }) },
      { label: 'Half fail by', get: () => ({ v: `step ${R.half}`, sub: `at ${st.p.toFixed(3)} a step` }) },
      { label: 'Reported success', get: () => ({ v: pct(R.reported), sub: st.audit ? 'matches the truth' : 'final answers only', good: st.audit, bad: !st.audit }) },
    ];
    const labels = [
      { name: 'grid', t: 'Every step of the run', d: 'Colour: chance still on track. Gold posts: checkpoints', icon: 'turn', atV: V(-3.0, 0.1, -0.6) },
      { name: 'end', t: 'At the end', d: 'Truly on track. Gold: what final answers report', icon: 'target', atV: V(GX + COLS * CELL / 2 - 0.5, 0.2, 0.73) },
      { name: 'chart', t: '10 to 300 steps', d: 'Grey: no checkpoints. Red line: half', icon: 'wave', atV: V(3.0, 0.2, 0.37) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust a 99% step over 70 steps', hint: 'compounding', on: () => set({ ...D0, p: 0.99, n: 70, ckpt: false }), off: reset },
      { label: 'Run 300 steps with no checkpoints', hint: 'one bad step ends it', on: () => set({ ...D0, n: 300, ckpt: false }), off: reset },
      { label: 'Review only the final answer', hint: 'silent failures', on: () => set({ ...D0, audit: false, ckpt: false }), off: reset },
    ];
    function status() {
      if (!st.audit) return { ok: false, msg: `<b>Reviewing only final answers reports ${pct(R.reported)} success; the truth is ${pct(R.truth)}.</b> ${pct(SILENT)} of failures are silent here: drift, a loop, the wrong file edited along the way, with a tidy final answer. At hundreds of steps the review unit is the trajectory.` };
      if (!st.ckpt && R.truth < 0.5) return { ok: false, msg: `<b>${st.p.toFixed(3)} a step sounds reliable, but over ${st.n} steps only ${pct(R.truth)} of runs finish on track: half have failed by step ${R.half}.</b> Errors compound as p to the power n. Verify and checkpoint every ${K} steps, so one bad step costs a segment and a retry, not the whole run: ${pct(run(st.p, st.n, true))}.` };
      if (!st.ckpt) return { ok: true, msg: `<b>Without checkpoints, ${pct(R.truth)} of ${st.n}-step runs finish on track; half would fail by step ${R.half}.</b> Turn on checkpoints to see the difference.` };
      if (R.truth < 0.9) return { ok: false, msg: `<b>Even with checkpoints, ${pct(R.truth)} of runs finish on track at ${st.p.toFixed(3)} a step.</b> When each step is this unreliable, a segment fails often enough to exhaust its retries. Improve the step, shorten the segments, or shorten the run.` };
      return { ok: true, msg: `<b>${st.n} steps at ${st.p.toFixed(3)}: on its own ${pct(R.raw)} of runs would finish on track; verifying and resuming every ${K} steps with up to ${RETRY} retries lifts that to ${pct(R.truth)}, and the trajectory audit reports the true rate.</b>` };
    }
    return { update: dt => { tr.userData.tick(dt); rp.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One turn, then many', home: true, say: 'A chatbot answers in one turn. An agent may take hundreds of steps on one task, and each step can go wrong.', act: m => m.set({ p: 0.995, n: 120, ckpt: false, audit: true }) },
    { t: 'Errors compound', home: true, say: 'A step that is right ninety-nine times in a hundred finishes only half of seventy-step runs.', act: m => m.set({ p: 0.99, n: 70, ckpt: false, audit: true }) },
    { t: 'Longer runs', home: true, say: 'The chart shows the fall as runs get longer. Three hundred steps at ninety-nine and a half percent: about one in five finish.', act: m => m.set({ p: 0.995, n: 300, ckpt: false, audit: true }) },
    { t: 'Checkpoints', home: true, say: 'Verify every twenty steps and resume from the last good point. One bad step now costs a segment and a retry, not the run.', act: m => m.set({ p: 0.995, n: 300, ckpt: true, audit: true }) },
    { t: 'Silent failures', home: true, say: 'Many failures leave a tidy final answer. Reviewing only the answer reports success that never happened.', act: m => m.set({ p: 0.995, n: 120, ckpt: false, audit: false }) },
    { t: 'Audit the trajectory', home: true, say: 'At this length the review unit is the whole trajectory. And a benchmark horizon is a ceiling, so test on your own tasks.', act: m => m.set({ p: 0.995, n: 120, ckpt: true, audit: true }) },
  ],
  check: [
    { q: 'Each step is 99% reliable. Roughly what share of 70-step runs finish on track?', options: ['About half', 'About 99%', 'About 90%'], answer: 0, why: '0.99 to the power 70 is about 0.5.', hint: 'Try Trust a 99% step.' },
    { q: 'What do checkpoints change?', options: ['One bad step costs a segment and a retry, not the run', 'They make each step more reliable', 'Nothing'], answer: 0, why: 'Failure is contained to a segment.', hint: 'Turn on Checkpoints.' },
    { q: 'Why audit the trajectory, not just the final answer?', options: ['Many failures are silent and leave a tidy answer', 'It is faster', 'Final answers are always wrong'], answer: 0, why: 'Drift and wrong edits hide mid-run.', hint: 'Try Review only the final answer.' },
  ],
  terms: [
    ['Long-horizon agent', 'An agent that runs many steps on one task, for minutes to hours.'],
    ['Time horizon', 'METR\'s measure: the expert task length a model completes at 50% reliability.'],
    ['Compounding', 'A run succeeds with p to the power n when each of n steps succeeds with p.'],
    ['Checkpoint', 'A verified point the run can resume from.'],
    ['Trajectory', 'The full sequence of actions, observations and reasoning in a run.'],
    ['Silent failure', 'Something went wrong mid-run, but the final answer looks fine.'],
  ],
  deeper: '<p><b>A ceiling, not a floor.</b> Benchmark horizons assume good tooling and no consequences, and models have been observed behaving more safely when they can tell they are being evaluated. Measure on your own distribution.</p><p><b>Cost has a fat tail.</b> A runaway loop can burn far more than a month of chat. Budgets and kill switches come later in this phase.</p><p><b>About this machine.</b> The per-step model is a simplification: steps fail independently, a checkpoint always catches a failure in its segment, and 40% of failures are silent. All numbers are computed live.</p>',
  code: {
    title: 'Compounding, and checkpoints',
    note: 'Adapted from the course\'s horizon simulator (code/main.py).',
    text: `
def end_to_end(p, n):
    return p ** n                       # 0.99 ** 70 ≈ 0.495

def with_checkpoints(p, n, k=20, retries=2):
    ok = 1.0
    for start in range(0, n, k):
        seg = p ** min(k, n - start)
        ok *= 1 - (1 - seg) ** (retries + 1)   # a segment fails only if every try fails
    return ok

def steps_until_half(p):
    import math
    return int(math.log(0.5) / math.log(p))
`,
  },
};
