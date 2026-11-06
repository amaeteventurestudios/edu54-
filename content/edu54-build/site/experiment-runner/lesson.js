// Experiment runner (phase 19, lesson 52): each experiment for a Lomé lab is a typed spec run in a subprocess with a wall-clock limit and a memory cap. Six runs; both limits end a run with a named condition. An ablation table sweeps one setting at a time and shows which one mattered.
const RUNS = [{ t: 20, m: 2 }, { t: 45, m: 3 }, { t: 400, m: 2 }, { t: 30, m: 14 }, { t: 25, m: 2, fail: true }, { t: 35, m: 3 }];
const ABL = [['Baseline', 71], ['No augmentation', 64], ['Half the data', 69], ['No warmup', 70], ['Smaller model', 71]];
function run(o) {
  const res = RUNS.map(r => (o.time && r.t > 60 ? 'timeout' : o.mem && r.m > 8 ? 'memory' : r.fail ? 'error' : r.t > 60 || r.m > 8 ? 'hung' : 'ok'));
  const wall = RUNS.reduce((a, r, i) => a + (res[i] === 'timeout' ? 60 : r.t), 0), meta = o.metrics;
  return { res, wall, ok: res.filter(r => r === 'ok').length, hung: res.includes('hung'), meta };
}

export default {
  slug: 'experiment-runner',
  title: 'An experiment runner: every run ends with a reason',
  description: 'Six runs, one lab. Hard limits keep a bad one from eating the night, and an ablation table shows what mattered.',
  overview: 'An agent running experiments needs them to end. Encode each as a typed spec, run it in a subprocess, and enforce a wall-clock limit and a memory cap. Both are normal ways to finish, reported as named conditions, so that the loop can act. Capture stdout, stderr and a structured metrics record into one result. Then learn which part mattered with an ablation table: remove one thing at a time, and compare. This lesson runs six experiments for a lab in Lomé. One hangs, and one eats memory.',
  keywords: ['experiment runner', 'subprocess', 'timeouts', 'ablation', 'research agent', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { time: true, mem: true, metrics: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.48;
    const C = RUNS.map((r, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.38, 0.3 + r.m * 0.03, 0.42, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.3); S.add(b); return m; });
    const A = ABL.map((a, i) => { const t = add(P.tower(0.36, 0.42, BLUE)); t.position.set(0.75 + i * 0.42, 0.03, -0.1); t.userData.set({ cap: '', h: (a[1] - 55) * 0.05, color: i === 1 ? SAF : BLUE }); return t; });
    const clock = add(P.dial(0.3)); clock.position.set(-1.2, 0.03, 0.45);
    S.add(P.keep(-2.35, 2.5, 0.95, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); C.forEach((m, i) => m.color.set({ ok: GOOD, timeout: SAF, memory: SAF, error: BAD, hung: RED }[R.res[i]])); clock.userData.set({ v: R.wall / 600 }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('time', 'Wall-clock limit', 'Time limit'), tg('mem', 'Memory cap', 'Memory cap'), tg('metrics', 'Each run writes a metrics record', 'Metrics')];
    const readouts = [
      { label: 'Finished cleanly', get: () => ({ v: `${R.ok} of 6`, sub: R.res.join(', ').slice(0, 42) }) },
      { label: 'Wall time', get: () => ({ v: `${R.wall} min`, good: R.wall < 300, bad: R.wall > 500 }) },
      { label: 'What mattered', get: () => ({ v: ABL[1][0], sub: `${ABL[0][1]} down to ${ABL[1][1]}` }) },
    ];
    const labels = [
      { name: 'r', t: 'Six runs', d: 'Gold: stopped by a limit', icon: 'box', atV: V(X(0) - 0.2, 0.15, -0.3) },
      { name: 'a', t: 'Ablation table', d: 'Remove one thing at a time', icon: 'target', atV: V(2.45, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No time limit', hint: 'one run hangs all night', on: () => set({ ...D0, time: false }), off: reset },
      { label: 'No memory cap', hint: 'it takes the machine down', on: () => set({ ...D0, mem: false }), off: reset },
      { label: 'Only read the logs', hint: 'no structured metrics', on: () => set({ ...D0, metrics: false }), off: reset },
    ];
    function status() {
      if (!st.time) return { ok: false, msg: `<b>One run took ${RUNS[2].t} minutes.</b> Nothing stopped it, and the night is gone. A timeout is a normal result.` };
      if (!st.mem) return { ok: false, msg: '<b>A run took all the memory, and the machine with it.</b> A cap kills one run, not the rest.' };
      if (!st.metrics) return { ok: false, msg: '<b>Results live in free text.</b> The evaluator can\'t read them. Write one structured record.' };
      return { ok: true, msg: `<b>${R.ok} clean, others ended with named reasons, in ${R.wall} minutes.</b> Augmentation matters most, and the smaller model lost nothing.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A typed spec', home: true, say: 'A lab in Lomé lets an agent run experiments. Each is a typed spec, in its own subprocess.', act: m => m.set({ time: false, mem: false, metrics: true }) },
    { t: 'A run that hangs', home: true, say: 'One run never ends. With no limit, the whole night goes.', act: m => m.set({ time: false, mem: true, metrics: true }) },
    { t: 'A time limit', home: true, say: 'A wall-clock limit ends it, with a named reason.', act: m => m.set({ time: true, mem: false, metrics: true }) },
    { t: 'A memory cap', home: true, say: 'A cap stops one greedy run from taking the machine.', act: m => m.set({ time: true, mem: true, metrics: true }) },
    { t: 'Structured results', home: true, say: 'Each run writes one record the next stage can read.', act: m => m.set({ time: true, mem: true, metrics: true }) },
    { t: 'What mattered', home: true, say: 'Remove one thing at a time. An ablation table shows which part earned its keep.', act: m => m.set({ time: true, mem: true, metrics: true }) },
  ],
  check: [
    { q: 'What should a timeout be?', options: ['A normal, named result', 'A crash', 'A retry forever'], answer: 0, why: 'The loop can act on it.', hint: 'Try No time limit.' },
    { q: 'What is an ablation table?', options: ['Removing one thing at a time', 'A list of prices', 'A chart of tokens'], answer: 0, why: 'It shows what mattered.', hint: 'See What mattered.' },
    { q: 'Why a structured record?', options: ['The next stage must read it', 'It looks nice', 'To save disk'], answer: 0, why: 'Free text isn\'t machine-readable.', hint: 'Try Only read the logs.' },
  ],
  terms: [['Spec', 'A typed description of a run.'], ['Wall clock', 'Real elapsed time.'], ['Memory cap', 'A limit on memory.'], ['Ablation', 'Removing parts to test them.']],
  deeper: '<p><b>Isolation.</b> A subprocess can be killed cleanly. A thread can\'t.</p><p><b>Log the spec</b> with the result, so that a run can be repeated.</p><p><b>Times</b> are illustrative.</p>',
  code: {
    title: 'Run one',
    note: 'Adapted from the course\'s runner (code/main.py).',
    text: `
def run(spec):
    try:
        out = subprocess.run(spec.argv, timeout=spec.seconds,
                             preexec_fn=limit_memory(spec.gb), capture_output=True)
        return Result("ok", json.loads(out.stdout), out.stderr)
    except subprocess.TimeoutExpired:
        return Result("timeout")
`,
  },
};
