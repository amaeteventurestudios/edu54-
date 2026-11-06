// Checkpoint save and resume (phase 19, lesson 47): a Kisumu training job runs 18 hours and crashes. What a checkpoint holds decides if resume matches. Six parts of state as drawers; missing ones make the resumed loss curve drift from the baseline. Save is atomic: write temp, then rename.
const PART = ['Weights', 'Optimizer', 'Schedule step', 'Data position', 'RNG states', 'Config'];
function run(o) {
  const miss = PART.filter((p, i) => !o.keep[i]);
  const drift = (o.keep[0] ? 0 : 3) + (o.keep[1] ? 0 : 0.9) + (o.keep[2] ? 0 : 0.5) + (o.keep[3] ? 0 : 0.3) + (o.keep[4] ? 0 : 0.1) + (o.keep[5] ? 0 : 0.2);
  const torn = o.crashSave && !o.atomic;
  return { miss, drift, torn, ok: !drift && !torn };
}

export default {
  slug: 'checkpoint-save-resume',
  title: 'Checkpoints: save it all, and save it safely',
  description: 'Eighteen hours in, the job dies. A checkpoint that only has weights won\'t bring it back the same.',
  overview: 'Saving weights isn\'t enough to resume. An exact resume needs all the training state: weights, optimizer state with its momentum, the schedule step, the data position, every random generator, and the config. Miss the optimizer and loss jumps. Miss the RNG, and the run is no longer repeatable. Saving must be atomic: write to a temporary file, then rename, so that a crash mid-save can never leave a half-written file in place of a good one. Large models need sharded files with an index and hashes. This lesson compares a resumed run with an unbroken baseline, for a job in Kisumu.',
  keywords: ['checkpoint', 'resume', 'atomic save', 'RNG state', 'training', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { keep: [1, 1, 1, 1, 1, 1], atomic: true, crashSave: false }, st = { keep: [...D0.keep], atomic: true, crashSave: false };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const cab = P.box(1.3, 1.1, 0.7, '#A87A4F', { r: 0.04 }); cab.position.set(-1.8, 0.03, -0.1); S.add(cab);
    const Dr = PART.map((p, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(1.1, 0.14, 0.12, '#fff', { r: 0.01, material: m }); b.position.set(-1.8, 0.1 + i * 0.17, 0.27); S.add(b); return m; });
    const X = i => -0.6 + i * 0.26;
    const B = Array.from({ length: 12 }, (_, i) => { const a = add(P.tower(0.1, 0.3, '#8E91A3')), b = add(P.tower(0.1, 0.3, GOOD)); a.position.set(X(i) - 0.06, 0.03, -0.1); b.position.set(X(i) + 0.06, 0.03, -0.1); a.userData.set({ cap: '' }); b.userData.set({ cap: '' }); return { a, b }; });
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.35, 0.03, 0.4);
    S.add(P.keep(-2.45, 2.5, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      Dr.forEach((m, i) => m.color.set(st.keep[i] ? GOOD : BAD));
      B.forEach(({ a, b }, i) => { const base = 1.1 - i * 0.07; a.userData.set({ h: base }); b.userData.set({ h: i < 6 ? base : Math.min(1.2, base + R.drift * 0.2), color: R.drift ? BAD : GOOD }); });
      lamp.userData.set({ color: R.ok ? '#3E9B5F' : '#D9483B', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = i => ({ type: 'toggle', label: `Save ${PART[i].toLowerCase()}`, short: PART[i], quick: i < 3 ? undefined : false, get: () => !!st.keep[i], set: v => { st.keep[i] = v ? 1 : 0; draw(); } });
    const controls = [...PART.map((p, i) => tg(i)), { type: 'toggle', label: 'Write to temp, then rename', short: 'Atomic', get: () => st.atomic, set: v => set({ atomic: !!v }) }, { type: 'toggle', label: 'The crash hits during a save', short: 'Crash in save', get: () => st.crashSave, set: v => set({ crashSave: !!v }) }];
    const readouts = [
      { label: 'Loss after resume', get: () => ({ v: R.drift ? `+${R.drift.toFixed(1)}` : 'matches', sub: 'against the baseline', good: !R.drift, bad: R.drift > 0.4 }) },
      { label: 'Missing', get: () => ({ v: R.miss[0] ?? 'nothing', sub: `${R.miss.length} parts` }) },
      { label: 'Last checkpoint', get: () => ({ v: R.torn ? 'corrupt' : 'good', good: !R.torn, bad: R.torn }) },
    ];
    const labels = [
      { name: 'c', t: 'The checkpoint', d: 'Six drawers of state', icon: 'box', atV: V(-2.45, 0.5, -0.1) },
      { name: 'b', t: 'Grey baseline, teal resumed', d: 'Should stay level', icon: 'target', atV: V(X(11) + 0.15, 0.2, -0.1) },
    ];
    const reset = () => { st.keep = [...D0.keep]; st.atomic = true; st.crashSave = false; draw(); };
    const k = (i) => { const a = [...D0.keep]; a[i] = 0; return () => set({ keep: a, atomic: true, crashSave: false }); };
    const breaks = [
      { label: 'Save weights only', hint: 'no optimizer', on: () => set({ keep: [1, 0, 0, 0, 0, 0], atomic: true, crashSave: false }), off: reset },
      { label: 'Forget the RNG', hint: 'no longer repeatable', on: k(4), off: reset },
      { label: 'Crash during a plain save', hint: 'half a file', on: () => set({ keep: [...D0.keep], atomic: false, crashSave: true }), off: reset },
    ];
    function status() {
      if (R.torn) return { ok: false, msg: '<b>The last checkpoint is half a file, and the good one has been overwritten.</b> Write to a temp file, then rename. A rename is all or nothing.' };
      if (R.drift > 0.4) return { ok: false, msg: `<b>Loss jumped by ${R.drift.toFixed(1)} after resume.</b> Without ${R.miss[0].toLowerCase()}, the run restarts with cold state. Momentum, step and position all matter.` };
      if (R.drift) return { ok: false, msg: `<b>Small drift, ${R.drift.toFixed(1)}: without ${R.miss[0].toLowerCase()}, the run isn't the same run.</b> You can't reproduce a bug if it can't repeat.` };
      return { ok: true, msg: '<b>Resume matches the unbroken baseline.</b> Saved whole, and written safely.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Hour eighteen', home: true, say: 'A training job in Kisumu dies at hour eighteen. What did the checkpoint save?', act: m => m.set({ keep: [1, 0, 0, 0, 0, 0], atomic: true, crashSave: false }) },
    { t: 'Weights aren\'t enough', home: true, say: 'With weights alone, momentum is lost, and the loss jumps on resume.', act: m => m.set({ keep: [1, 0, 1, 1, 1, 1], atomic: true, crashSave: false }) },
    { t: 'All the state', home: true, say: 'Optimizer, schedule step, data position, random state, config. Now it lines up.', act: m => m.set({ keep: [1, 1, 1, 1, 1, 1], atomic: true, crashSave: false }) },
    { t: 'RNG', home: true, say: 'Forget the random state and it is close, but not the same run.', act: m => m.set({ keep: [1, 1, 1, 1, 0, 1], atomic: true, crashSave: false }) },
    { t: 'Half a file', home: true, say: 'A crash during a save can ruin the only copy.', act: m => m.set({ keep: [1, 1, 1, 1, 1, 1], atomic: false, crashSave: true }) },
    { t: 'Atomic', home: true, say: 'Write to a temporary file, then rename. It is all or nothing.', act: m => m.set({ keep: [1, 1, 1, 1, 1, 1], atomic: true, crashSave: true }) },
  ],
  check: [
    { q: 'Why save optimizer state?', options: ['Momentum is part of training', 'To save disk', 'For logging'], answer: 0, why: 'Without it, loss jumps.', hint: 'Try Save weights only.' },
    { q: 'What makes a save atomic?', options: ['Write to temp, then rename', 'Saving twice', 'A larger disk'], answer: 0, why: 'A rename is all or nothing.', hint: 'Try Crash during a plain save.' },
    { q: 'Why save RNG state?', options: ['So a resume can repeat exactly', 'To speed up', 'To compress'], answer: 0, why: 'Otherwise it is a different run.', hint: 'Try Forget the RNG.' },
  ],
  terms: [['Checkpoint', 'Saved training state.'], ['Atomic save', 'All or nothing.'], ['RNG state', 'The generator\'s position.'], ['Baseline', 'The unbroken run.']],
  deeper: '<p><b>Large models.</b> Save many shards with a JSON index and a hash per shard, as the next series shows.</p><p><b>Keep a few.</b> Keep the last few, and the best.</p><p><b>Curves</b> are illustrative.</p>',
  code: {
    title: 'Atomic save',
    note: 'Adapted from the course\'s checkpoint code (code/main.py).',
    text: `
def save(state, path):
    tmp = path.with_suffix(".tmp")
    torch.save(state, tmp)
    os.replace(tmp, path)                        # all or nothing

state = dict(model=model.state_dict(), opt=opt.state_dict(), step=step,
             sampler=sampler.state_dict(), rng=get_rng_states(), config=cfg)
`,
  },
};
