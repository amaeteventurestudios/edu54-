// End-to-end distributed training (phase 19, lesson 81): DDP, ZeRO-1 and sharded checkpoints joined for a small language model over 4 ranks in Nairobi. A real twenty-step loss curve from a simple decay; a crash at step 12 resumes from the last manifest. Memory per rank and resume state are computed.
function run(o) {
  const loss = []; let l = 5; const save = o.every;
  for (let s = 0; s < 20; s++) { l = l * 0.92 + 0.05; loss.push(l); }
  const crash = 12, last = Math.floor(crash / save) * save, redo = crash - last, mem = o.zero ? 100 + 100 + 75 : 500;
  const c = o.crash && !o.ckpt ? loss.slice(0, crash) : loss;
  return { loss: c, redo, last, mem, fits: mem <= 300, lost: o.crash && !o.ckpt };
}

export default {
  slug: 'end-to-end-distributed-train',
  title: 'Distributed training, end to end',
  description: 'Four ranks, sharded optimiser state, a crash at step twelve, and a resume that lines up.',
  overview: 'This closes the distributed series. DDP keeps ranks in step. ZeRO stage 1 shares out optimiser state. Sharded checkpoints with a manifest let a run survive a crash. Together they train a small language model across four ranks, and the proof is in the numbers: a per-step loss table, a memory profile per rank, and a manifest that resumes byte-equal on the same world size. This runs for a cluster in Nairobi. Remove each piece to see what it was buying.',
  keywords: ['distributed training', 'DDP', 'ZeRO', 'checkpointing', 'end to end', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { zero: true, ckpt: true, crash: true, every: 5 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.25 + i * 0.16;
    const T = Array.from({ length: 20 }, (_, i) => { const t = add(P.tower(0.13, 0.4, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const M = [0, 1, 2, 3].map(i => { const t = add(P.tower(0.3, 0.4, '#7B6FA8')); t.position.set(1.2 + i * 0.36, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => { const v = R.loss[i]; t.visible = v != null; if (v != null) t.userData.set({ h: Math.max(0.03, v * 0.22), color: st.crash && st.ckpt && i === 12 ? SAF : st.crash && st.ckpt && i >= R.last && i < 12 ? BAD : BLUE }); }); M.forEach(t => t.userData.set({ h: R.mem * 0.0022, color: R.fits ? '#7B6FA8' : BAD })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('zero', 'ZeRO stage 1', 'ZeRO'), tg('ckpt', 'Sharded checkpoints', 'Checkpoints'), tg('crash', 'A crash at step 12', 'Crash'), { type: 'slider', label: 'Save every', min: 2, max: 10, step: 1, get: () => st.every, set: v => set({ every: v }) }];
    const readouts = [
      { label: 'Steps finished', get: () => ({ v: `${R.loss.length} of 20`, good: R.loss.length === 20, bad: R.lost }) },
      { label: 'Repeated after crash', get: () => ({ v: `${st.crash && st.ckpt ? R.redo : 0} steps`, sub: `from step ${R.last}` }) },
      { label: 'Memory per rank', get: () => ({ v: `${R.mem} units`, sub: 'limit 300', good: R.fits, bad: !R.fits }) },
    ];
    const labels = [
      { name: 't', t: 'Loss over twenty steps', d: 'Coral: repeated after the crash', icon: 'wave', atV: V(X(0) - 0.08, 0.15, -0.1) },
      { name: 'm', t: 'Memory per rank', d: 'Red: over the limit', icon: 'box', atV: V(2.44, 0.15, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No ZeRO', hint: 'too much on each GPU', on: () => set({ ...D0, zero: false }), off: reset },
      { label: 'No checkpoints', hint: 'the crash wins', on: () => set({ ...D0, ckpt: false }), off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${R.mem} units per rank, over the 300 limit.</b> It runs out of memory at step one.` };
      if (R.lost) return { ok: false, msg: '<b>The run ended at step 12.</b> With no checkpoints, a crash means starting over.' };
      return { ok: true, msg: `<b>Twenty steps done${st.crash ? `, with ${R.redo} steps repeated after the crash` : ''}.</b> ${R.mem} units per rank.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'All together', home: true, say: 'A cluster in Nairobi trains a small language model across four ranks, with every piece from this series.', act: m => m.set({ zero: true, ckpt: true, crash: false, every: 5 }) },
    { t: 'Memory', home: true, say: 'Sharing out optimiser state brings each rank under its limit.', act: m => m.set({ zero: false, ckpt: true, crash: false, every: 5 }) },
    { t: 'A crash', home: true, say: 'At step twelve, a rank dies.', act: m => m.set({ zero: true, ckpt: false, crash: true, every: 5 }) },
    { t: 'Resume', home: true, say: 'The manifest says which save is whole. The run picks up from there.', act: m => m.set({ zero: true, ckpt: true, crash: true, every: 5 }) },
    { t: 'How often', home: true, say: 'Save less often, and more steps repeat.', act: m => m.set({ zero: true, ckpt: true, crash: true, every: 10 }) },
    { t: 'The proof', home: true, say: 'A loss table, a memory profile and a manifest prove that it worked.', act: m => m.set({ zero: true, ckpt: true, crash: true, every: 5 }) },
  ],
  check: [
    { q: 'What does ZeRO stage 1 give?', options: ['Less memory per rank', 'Better accuracy', 'Faster disks'], answer: 0, why: 'State is shared out.', hint: 'Try No ZeRO.' },
    { q: 'What decides steps repeated after a crash?', options: ['How often you save', 'The learning rate', 'The batch'], answer: 0, why: 'Everything since the last save.', hint: 'Move Save every.' },
    { q: 'How do you prove a run worked?', options: ['Loss table, memory profile, manifest', 'A screenshot', 'It finished'], answer: 0, why: 'Numbers, not hope.', hint: 'See The proof.' },
  ],
  terms: [['World size', 'Number of ranks.'], ['Manifest', 'An index of shards.'], ['Memory profile', 'Use per rank.'], ['Resume', 'Continuing after a crash.']],
  deeper: '<p><b>Series.</b> Each part has its own lesson.</p><p><b>Numbers</b> are simple illustrations.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s run (code/main.py).',
    text: `
for step in range(start, 20):
    loss = forward_backward(batch)
    zero_stage1_step(params, shard)
    log(step, loss, memory())
    if step % save_every == 0:
        save_sharded(step, state)
`,
  },
};
