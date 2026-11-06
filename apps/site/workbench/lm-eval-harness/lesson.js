// LM evaluation harness (phase 19, lesson 49): a Gaborone team scores checkpoints against a registry of tasks: a language benchmark, a local-language set, a toxic-completion check. Each result is one record with a dataset hash. A scoreboard of checkpoints; comparing across changed datasets is the trap.
const CK = [52, 58, 63, 66, 64];
function run(o) {
  const hash = o.drift ? 'changed' : 'same';
  const row = CK.map((c, i) => c + (o.local ? -8 : 0) + (o.drift && i >= 3 ? 7 : 0));
  const best = row.indexOf(Math.max(...row));
  return { row, best, hash, wrong: o.drift && best >= 3 };
}

export default {
  slug: 'lm-eval-harness',
  title: 'Scoring checkpoints: one harness for every run',
  description: 'Several checkpoints, several tasks, one record for each. See the best run, and catch a test that quietly changed.',
  overview: 'A training run makes many checkpoints, and you need a fair way to choose. An evaluation harness holds a registry of tasks. Each pairs a dataset with a metric, and it runs the same way every time. Each result is one record: checkpoint, task, score, dataset hash, settings. Then checkpoints can be compared and history kept. The classic trap is a test set that changed between runs, which turns noise into apparent progress, and the hash catches that. Include a set in your own language, as English benchmarks can hide poor local performance. This lesson scores five checkpoints for a team in Gaborone.',
  keywords: ['evaluation harness', 'checkpoints', 'benchmark', 'reproducibility', 'model selection', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { local: false, drift: false, hashcheck: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.75;
    const T = CK.map((c, i) => { const t = add(P.tower(0.55, 0.55, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const reg = add(P.shelf(4, { cell: 0.26, d: 0.34, lh: 0.28 })); reg.position.set(1.95, 0.03, -0.25);
    const lamp = add(P.lamp(GOOD, { h: 0.4, r: 0.1 })); lamp.position.set(1.95, 0.03, 0.45);
    S.add(P.keep(-2.3, 2.5, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach((t, i) => t.userData.set({ h: R.row[i] * 0.013, color: i === R.best ? (R.wrong ? BAD : SAF) : BLUE }));
      reg.userData.set({ fill: [GOOD, GOOD, st.local ? GOOD : null, null] });
      lamp.userData.set({ color: st.drift ? (st.hashcheck ? '#E3A72F' : '#D9483B') : '#3E9B5F', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('local', 'Score on a Setswana set', 'Local set'), tg('drift', 'The test set changed after checkpoint 3', 'Set changed'), tg('hashcheck', 'Record and compare the dataset hash', 'Hash check')];
    const readouts = [
      { label: 'Best checkpoint', get: () => ({ v: `${R.best + 1}`, sub: `score ${R.row[R.best]}`, good: !R.wrong, bad: R.wrong }) },
      { label: 'Dataset', get: () => ({ v: R.hash, sub: st.hashcheck ? 'hash checked' : 'not checked', bad: st.drift }) },
      { label: 'Task', get: () => ({ v: st.local ? 'Setswana set' : 'English set', sub: 'one registry' }) },
    ];
    const labels = [
      { name: 't', t: 'Five checkpoints', d: 'Gold: the best', icon: 'target', atV: V(X(0) - 0.28, 0.2, -0.1) },
      { name: 'r', t: 'Task registry', d: 'Dataset plus metric', icon: 'book', atV: V(2.4, 0.2, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'The test set quietly changed', hint: 'no hash check', on: () => set({ ...D0, drift: true, hashcheck: false }), off: reset },
      { label: 'Only English tasks', hint: 'local users unseen', on: () => set({ ...D0, local: false }), off: reset },
    ];
    function status() {
      if (st.drift && !st.hashcheck) return { ok: false, msg: `<b>Checkpoint ${R.best + 1} looks best, on an easier test.</b> The set changed after checkpoint 3, so the scores no longer compare. Log a hash with every result.` };
      if (st.drift) return { ok: true, msg: '<b>The hash changed, so the harness refused to compare.</b> Rerun older checkpoints on the new set first.' };
      if (st.local) return { ok: true, msg: `<b>On the Setswana set, the best score is ${R.row[R.best]}, well below English.</b> Benchmarks in English hide this.` };
      return { ok: true, msg: `<b>Checkpoint ${R.best + 1} is best, at ${R.row[R.best]}, on the same set for every run.</b> Add a set in your own language.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Which checkpoint?', home: true, say: 'A team in Gaborone has five checkpoints. Which is best? Each is scored the same way.', act: m => m.set({ local: false, drift: false, hashcheck: true }) },
    { t: 'A registry', home: true, say: 'Each task pairs a dataset with a metric, and each result is one record.', act: m => m.set({ local: false, drift: false, hashcheck: true }) },
    { t: 'The test changed', home: true, say: 'Someone cleaned the test set after checkpoint three. Scores jump, for no real reason.', act: m => m.set({ local: false, drift: true, hashcheck: false }) },
    { t: 'A hash', home: true, say: 'A hash with each record shows the change, and comparison stops.', act: m => m.set({ local: false, drift: true, hashcheck: true }) },
    { t: 'Your language', home: true, say: 'Add a Setswana set, and the picture is less rosy.', act: m => m.set({ local: true, drift: false, hashcheck: true }) },
    { t: 'One harness', home: true, say: 'One way of scoring, one record, for every run.', act: m => m.set({ local: true, drift: false, hashcheck: true }) },
  ],
  check: [
    { q: 'What does a dataset hash catch?', options: ['A test set that changed', 'A slow GPU', 'Bad prompts'], answer: 0, why: 'Scores only compare on one set.', hint: 'Try The test set quietly changed.' },
    { q: 'What makes up a task?', options: ['A dataset and a metric', 'A model and a GPU', 'A prompt only'], answer: 0, why: 'It runs the same every time.', hint: 'See A registry.' },
    { q: 'Why add a local-language set?', options: ['English benchmarks can hide poor results', 'It is cheaper', 'It is faster'], answer: 0, why: 'Measure what your users need.', hint: 'Toggle Local set.' },
  ],
  terms: [['Task registry', 'Datasets paired with metrics.'], ['Result record', 'One score with its settings.'], ['Dataset hash', 'A fingerprint of the test set.'], ['Benchmark', 'A shared test.']],
  deeper: '<p><b>Record settings.</b> Temperature and prompt format change results too.</p><p><b>Earlier lessons</b> cover individual measures. This one gives them one home.</p><p><b>Scores</b> are illustrative.</p>',
  code: {
    title: 'A record',
    note: 'Adapted from the course\'s harness (code/main.py).',
    text: `
def evaluate(ckpt, task):
    data = task.load()
    return {"checkpoint": ckpt, "task": task.name, "score": task.metric(ckpt, data),
            "dataset_sha256": sha256(data), "config": task.config}
`,
  },
};
