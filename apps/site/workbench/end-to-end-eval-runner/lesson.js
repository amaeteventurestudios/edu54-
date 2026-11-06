// End-to-end eval runner (phase 19, lesson 75): a ModelAdapter lets a mock, a local model and an API all run one fixture file through a worker pool. A Pretoria team. Time is computed from workers and call time; one failed task doesn't sink the run; a saved run record lets two runs be compared.
const TASKS = 40;
function run(o) {
  const ms = { mock: 10, local: 900, api: 400 }[o.model], t = Math.ceil(TASKS / o.w) * ms / 1000, ok = TASKS - (o.iso ? 1 : 0);
  return { t, ok: o.iso ? ok : 7, adapter: o.adapter, limited: o.model === 'api' && o.w > 8 };
}

export default {
  slug: 'end-to-end-eval-runner',
  title: 'An eval runner: any model, one report',
  description: 'A small adapter lets every model run the same tests in parallel, and write one comparable record.',
  overview: 'This closes the evaluation series. A ModelAdapter is a tiny interface that any model can meet: mock, local or API. The runner reads the fixture file, runs tasks in a worker pool, scores with the metric layer and saves one EvalRun record per model. Workers speed things up, until a provider\'s rate limit pushes back. A task that crashes is recorded as failed, and doesn\'t sink the run. With a saved record for each, two runs can be compared at any time. This runs for a team in Pretoria.',
  keywords: ['eval runner', 'adapter pattern', 'worker pool', 'evaluation', 'parallelism', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { model: 'api', w: 8, iso: true, adapter: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.45), V(-0.3, 0, 0.45), { w: 0.3, speed: 1.4 }));
    const W = Array.from({ length: 16 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.26 })); r.position.set(-2.2 + (i % 8) * 0.28, 0.03, i < 8 ? -0.1 : -0.45); return r; });
    const plug = P.box(0.4, 0.5, 0.8, SAF, { r: 0.03 }); plug.position.set(0.2, 0.03, 0); S.add(plug);
    const M = ['#8E91A3', '#7B6FA8', '#3E9B9B'].map((c, i) => { const m = P.box(0.5, 0.36, 0.34, c, { r: 0.04 }); m.position.set(1.1, 0.03, -0.45 + i * 0.45); S.add(m); return m; });
    const rec = add(P.stack(0.5, 0.4, 0.09, { max: 6, color: '#F4F1EA' })); rec.position.set(2.0, 0.03, 0); rec.userData.set({ n: 3, colors: Array(6).fill('#F4F1EA') });
    S.add(P.keep(-2.45, 2.4, 0.85, -0.72, 0.72));
    let R = null, u = 0;
    function draw() { R = run(st); W.forEach((r, i) => { r.visible = i < st.w; r.userData.set({ busy: true }); }); plug.visible = st.adapter; }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['mock', 'local', 'api'];
    const controls = [
      { type: 'buttons', label: 'Model', options: ['Mock', 'Local', 'API'], get: () => MK.indexOf(st.model), act: i => set({ model: MK[i] }) },
      { type: 'slider', label: 'Workers', min: 1, max: 16, step: 1, get: () => st.w, set: v => set({ w: v }) },
      { type: 'toggle', label: 'One failure stays one failure', short: 'Isolate', get: () => st.iso, set: v => set({ iso: !!v }) },
      { type: 'toggle', label: 'Models go through one adapter', short: 'Adapter', get: () => st.adapter, set: v => set({ adapter: !!v }) },
    ];
    const readouts = [
      { label: 'Run time', get: () => ({ v: `${R.t.toFixed(1)} s`, sub: `${TASKS} tasks` }) },
      { label: 'Tasks scored', get: () => ({ v: `${R.ok} of ${TASKS}`, good: R.ok > 30, bad: R.ok < 20 }) },
      { label: 'Rate limit', get: () => ({ v: R.limited ? 'hit' : 'clear', good: !R.limited, bad: R.limited }) },
    ];
    const labels = [
      { name: 'w', t: 'The worker pool', d: 'One task each', icon: 'user', atV: V(-2.42, 0.15, -0.1) },
      { name: 'r', t: 'Run records', d: 'One per model', icon: 'book', atV: V(2.3, 0.15, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Too many workers on an API', hint: 'rate limited', on: () => set({ ...D0, w: 16 }), off: reset },
      { label: 'Let one crash stop everything', hint: 'no isolation', on: () => set({ ...D0, iso: false }), off: reset },
      { label: 'A branch per model', hint: 'no adapter', on: () => set({ ...D0, adapter: false }), off: reset },
    ];
    function status() {
      if (!st.iso) return { ok: false, msg: `<b>${R.ok} of ${TASKS} tasks scored.</b> One crash ended the run. Record it as failed, and go on.` };
      if (R.limited) return { ok: false, msg: `<b>${st.w} workers hit the rate limit.</b> More workers can make an API run slower.` };
      if (!st.adapter) return { ok: false, msg: '<b>Each model has its own code path, and results stop being comparable.</b> A small adapter fixes that.' };
      return { ok: true, msg: `<b>${R.ok} of ${TASKS} scored in ${R.t.toFixed(1)} s, and saved as one record.</b> Compare with any past run.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.5 && b.userData.count() < 4) { u = 0; b.userData.send('#F4F1EA', { size: 0.14 }); } }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One runner', home: true, say: 'A team in Pretoria tests a mock, a local model and an API with one runner.', act: m => m.set({ model: 'mock', w: 8, iso: true, adapter: true }) },
    { t: 'An adapter', home: true, say: 'A tiny interface makes every model look the same to the runner.', act: m => m.set({ model: 'local', w: 8, iso: true, adapter: true }) },
    { t: 'Workers', home: true, say: 'A pool runs tasks in parallel, and time falls.', act: m => m.set({ model: 'api', w: 8, iso: true, adapter: true }) },
    { t: 'Rate limits', home: true, say: 'Too many workers on an API, and it pushes back.', act: m => m.set({ model: 'api', w: 16, iso: true, adapter: true }) },
    { t: 'Keep going', home: true, say: 'A task that crashes is recorded, and the rest go on.', act: m => m.set({ model: 'api', w: 8, iso: false, adapter: true }) },
    { t: 'One record', home: true, say: 'Each run saves one record, to compare later.', act: m => m.set({ model: 'api', w: 8, iso: true, adapter: true }) },
  ],
  check: [
    { q: 'What does an adapter give?', options: ['One interface for any model', 'A faster GPU', 'A new metric'], answer: 0, why: 'The runner stays simple.', hint: 'Try A branch per model.' },
    { q: 'What limits workers on an API?', options: ['Rate limits', 'Disk space', 'Token size'], answer: 0, why: 'More can mean slower.', hint: 'Try Too many workers on an API.' },
    { q: 'What should a crashed task do?', options: ['Be recorded as failed', 'Stop the run', 'Disappear'], answer: 0, why: 'One failure stays one failure.', hint: 'Try Let one crash stop everything.' },
  ],
  terms: [['ModelAdapter', 'A small interface for any model.'], ['Worker pool', 'Parallel task runners.'], ['EvalRun', 'One saved run record.'], ['Rate limit', 'A cap on requests.']],
  deeper: '<p><b>Calibration.</b> The course adds a layer checking stated confidence.</p><p><b>Times</b> are illustrative.</p>',
  code: {
    title: 'An adapter',
    note: 'Adapted from the course\'s runner (code/main.py).',
    text: `
class ModelAdapter(Protocol):
    def generate(self, prompt: str, **options) -> str: ...

def run(adapter, tasks, workers=8):
    with ThreadPool(workers) as pool:
        return EvalRun(results=pool.map(lambda t: score_safe(adapter, t), tasks))
`,
  },
};
