// Task spec format (phase 19, lesson 70): one JSONL record shape for five kinds of eval task, for a Lagos team. A closed metric vocabulary means the runner dispatches on one field. Few-shot rules live in the task. A real mini validator checks five records.
const METRICS = ['exact_match', 'f1', 'bleu', 'rouge_l', 'code_exec'];
const REC = [
  { id: 'math-1', kind: 'arithmetic', metric: 'exact_match', few: 2 }, { id: 'mc-1', kind: 'choice', metric: 'exact_match', few: 1 }, { id: 'code-1', kind: 'code', metric: 'code_exec', few: 0 },
  { id: 'cls-1', kind: 'classify', metric: 'f1', few: 3 }, { id: 'sum-1', kind: 'summary', metric: 'rouge', few: 1 },
];
function run(o) { const res = REC.map(r => (o.closed && !METRICS.includes(r.metric) ? 'bad metric' : r.few === 0 && o.kind === 'x' ? 'no shots' : 'ok')); return { res, bad: res.filter(r => r !== 'ok').length, repro: o.inTask, wrong: !o.closed }; }

export default {
  slug: 'task-spec-format',
  title: 'A task format: one shape for every test',
  description: 'Arithmetic, code, summaries: one record shape, and a closed list of metrics, so the same task gives the same prompt.',
  overview: 'An evaluation framework starts with its data shape. One JSONL record should hold arithmetic, multiple choice, code, classification and summarising alike. A closed list of metric names lets later stages dispatch on one field, and a typo is caught at load time. Few-shot examples and post-processing rules belong inside the task, not in the runner, so that the same task gives the same prompt anywhere. Pin a version. This lesson validates five records for a team in Lagos.',
  keywords: ['evaluation', 'JSONL', 'task spec', 'few-shot', 'schema', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.75, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { closed: true, inTask: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.95;
    const C = REC.map((r, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.7, 0.32, 0.6, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.25); S.add(b); const sh = add(P.stack(0.3, 0.3, 0.06, { max: 4, color: '#F4F1EA' })); sh.position.set(X(i), 0.35, -0.25); sh.userData.set({ n: r.few, colors: Array(4).fill('#F4F1EA') }); return m; });
    const robot = add(P.robot('#F2AE0C', { scale: 0.6 })); robot.position.set(0, 0.03, 0.42);
    S.add(P.keep(-2.4, 2.4, 0.75, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); C.forEach((m, i) => m.color.set(R.res[i] === 'ok' && !(i === 4 && !st.closed) ? GOOD : BAD)); robot.userData.set({ busy: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Closed list of metric names', short: 'Closed list', get: () => st.closed, set: v => set({ closed: !!v }) },
      { type: 'toggle', label: 'Few-shot rules live in the task', short: 'In task', get: () => st.inTask, set: v => set({ inTask: !!v }) },
    ];
    const readouts = [
      { label: 'Records valid', get: () => ({ v: `${5 - R.bad} of 5`, sub: R.bad ? 'rouge is not a metric name' : 'all pass', bad: R.bad > 0, good: !R.bad && st.inTask }) },
      { label: 'Same prompt anywhere', get: () => ({ v: st.inTask ? 'yes' : 'no', good: st.inTask, bad: !st.inTask }) },
      { label: 'Caught at', get: () => ({ v: st.closed ? 'load time' : 'after the run' }) },
    ];
    const labels = [
      { name: 'r', t: 'Five kinds of task', d: 'One record shape', icon: 'box', atV: V(X(0) - 0.35, 0.2, -0.25) },
      { name: 's', t: 'Few-shot cards', d: 'Part of the task', icon: 'book', atV: V(X(4) + 0.35, 0.35, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Free-form metric names', hint: 'a typo goes through', on: () => set({ ...D0, closed: false }), off: reset },
      { label: 'Few-shots in the runner', hint: 'prompts differ by tool', on: () => set({ ...D0, inTask: false }), off: reset },
    ];
    function status() {
      if (!st.closed) return { ok: false, msg: '<b>"rouge" was accepted, and the score went missing after a day of running.</b> A closed list fails at load time.' };
      if (!st.inTask) return { ok: false, msg: '<b>Two runners build two prompts for one task.</b> Scores no longer compare. Keep rules in the task.' };
      return { ok: true, msg: `<b>The load refused one record for a wrong metric name.</b> Fix it now, for free. ${5 - R.bad} are ready.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One shape', home: true, say: 'A team in Lagos tests models on arithmetic, code and summaries. One record shape holds them all.', act: m => m.set({ closed: true, inTask: true }) },
    { t: 'A closed list', home: true, say: 'Metric names come from a fixed list, so that a typo stops at load.', act: m => m.set({ closed: false, inTask: true }) },
    { t: 'At load time', home: true, say: 'The wrong name is caught at once, before any run.', act: m => m.set({ closed: true, inTask: true }) },
    { t: 'Few-shots', home: true, say: 'Examples live inside the task, so that the prompt is the same anywhere.', act: m => m.set({ closed: true, inTask: true }) },
    { t: 'In the runner', home: true, say: 'Put them in the runner, and two tools build two prompts.', act: m => m.set({ closed: true, inTask: false }) },
    { t: 'Pin a version', home: true, say: 'A version on the file lets scores compare over time.', act: m => m.set({ closed: true, inTask: true }) },
  ],
  check: [
    { q: 'Why a closed list of metric names?', options: ['Typos fail at load', 'It is shorter', 'For style'], answer: 0, why: 'Failing early is cheap.', hint: 'Try Free-form metric names.' },
    { q: 'Where do few-shot rules go?', options: ['In the task', 'In the runner', 'In the model'], answer: 0, why: 'Same prompt anywhere.', hint: 'Try Few-shots in the runner.' },
    { q: 'What format holds one task per line?', options: ['JSONL', 'A PDF', 'A spreadsheet'], answer: 0, why: 'Simple to stream.', hint: 'See One shape.' },
  ],
  terms: [['JSONL', 'One JSON object per line.'], ['Closed vocabulary', 'A fixed list of allowed values.'], ['Few-shot', 'Examples in the prompt.'], ['Post-processing', 'Cleaning an answer before scoring.']],
  deeper: '<p><b>Next.</b> The metric layer dispatches on this field.</p><p><b>Validate</b> on load, not after a run.</p><p><b>Records</b> are five samples.</p>',
  code: {
    title: 'A record',
    note: 'Adapted from the course\'s spec (code/main.py).',
    text: `
{"id": "math-1", "kind": "arithmetic", "prompt": "12 * 7 =", "answer": "84",
 "metric": "exact_match", "few_shot": [["3 * 4 =", "12"]], "post": "strip"}
`,
  },
};
