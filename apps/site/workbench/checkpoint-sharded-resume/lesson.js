// Sharded checkpoints (phase 19, lesson 80): each rank writes its own shard, and a manifest records who owns what, with hashes. A Kumasi cluster. A crash can hit one shard mid-write. The manifest is written last, so a half-finished save simply doesn't count. Resuming on a different number of ranks needs a reshape step.
function run(o) {
  const torn = o.crash && !o.temp, noMan = !o.manifest;
  const reshape = o.next !== 4, ok = !torn && !noMan && (!reshape || o.reshard);
  const prev = o.crash && o.temp;
  return { torn, reshape, ok, prev, bad: reshape && !o.reshard };
}

export default {
  slug: 'checkpoint-sharded-resume',
  title: 'Sharded checkpoints: many files, one truth',
  description: 'Every rank writes its part. A manifest, written last, says which save is whole.',
  overview: 'With sharded weights and optimiser state, no single rank holds everything. So each rank writes its own shard, and one manifest records which rank owns what, with hashes. Each shard is atomic: write to temp, then rename. The manifest is written last, after all shards land, so that a save is real only when its manifest exists, and a crash mid-save leaves the previous one intact. Resume checks the hashes. Moving to a different number of ranks needs a reshard step. This runs for a cluster in Kumasi.',
  keywords: ['sharded checkpoint', 'manifest', 'atomic write', 'resume', 'distributed training', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { temp: true, manifest: true, crash: false, next: 4, reshard: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.75;
    const Sh = [0, 1, 2, 3].map(i => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.55, 0.5, 0.5, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.25); S.add(b); const r = add(P.robot('#7B6FA8', { scale: 0.35 })); r.position.set(X(i), 0.03, 0.35); return m; });
    const man = P.box(0.7, 0.08, 0.5, '#F4F1EA', { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); man.position.set(1.6, 0.03, -0.25); S.add(man);
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.2, 0.03, 0.3);
    S.add(P.keep(-2.3, 2.45, 0.85, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); Sh.forEach((m, i) => m.color.set(i === 2 && st.crash ? (R.torn ? RED : SAF) : GOOD)); man.material.color.set(st.manifest && !st.crash ? '#F4F1EA' : '#A9A396'); lamp.userData.set({ color: R.ok ? '#3E9B5F' : '#D9483B', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const NK = [4, 8];
    const controls = [tg('temp', 'Write to temp, then rename', 'Atomic'), tg('manifest', 'Write a manifest last', 'Manifest'), tg('crash', 'Crash during a save', 'Crash'), { type: 'buttons', label: 'Resume on', options: ['4 ranks', '8 ranks'], get: () => NK.indexOf(st.next), act: i => set({ next: NK[i] }) }, tg('reshard', 'Reshard when rank count changes', 'Reshard')];
    const readouts = [
      { label: 'Latest good save', get: () => ({ v: R.prev ? 'the previous one' : R.torn ? 'corrupt' : 'this one', good: !R.torn, bad: R.torn }) },
      { label: 'Resume', get: () => ({ v: R.ok ? (R.reshape ? 'resharded' : 'byte-equal') : 'failed', good: R.ok, bad: !R.ok }) },
      { label: 'Ranks', get: () => ({ v: `4 to ${st.next}`, sub: R.reshape ? 'needs a reshard' : 'same' }) },
    ];
    const labels = [
      { name: 's', t: 'One shard per rank', d: 'Red: half written', icon: 'box', atV: V(X(0) - 0.3, 0.3, -0.25) },
      { name: 'm', t: 'The manifest', d: 'Written last', icon: 'book', atV: V(2.0, 0.1, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Crash with no atomic write', hint: 'half a shard', on: () => set({ ...D0, crash: true, temp: false }), off: reset },
      { label: 'No manifest', hint: 'which files go together?', on: () => set({ ...D0, manifest: false }), off: reset },
      { label: 'Resume on more ranks, as it is', hint: 'shards don\'t line up', on: () => set({ ...D0, next: 8, reshard: false }), off: reset },
    ];
    function status() {
      if (R.torn) return { ok: false, msg: '<b>One shard is half written, and it looks like the rest.</b> Write to temp, then rename.' };
      if (!st.manifest) return { ok: false, msg: '<b>Shards from two saves sit together, and nothing says which belong.</b> A manifest, written last, is the truth.' };
      if (R.bad) return { ok: false, msg: '<b>Four shards can\'t fill eight ranks.</b> Reshard to change the rank count.' };
      if (R.prev) return { ok: true, msg: '<b>The crash lost nothing: with no manifest, this save never counted.</b> Resume from the last one.' };
      return { ok: true, msg: R.reshape ? '<b>Hashes match, and the shards are redrawn for eight ranks.</b>' : '<b>Hashes match, and resume is byte-equal.</b>' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Many writers', home: true, say: 'A cluster in Kumasi saves its state. No rank holds it all, so each writes its own shard.', act: m => m.set({ temp: true, manifest: true, crash: false, next: 4, reshard: true }) },
    { t: 'Atomic shards', home: true, say: 'Each shard goes to a temp file, then a rename.', act: m => m.set({ temp: false, manifest: true, crash: true, next: 4, reshard: true }) },
    { t: 'The manifest', home: true, say: 'The manifest goes last. A save is real only if it exists.', act: m => m.set({ temp: true, manifest: true, crash: true, next: 4, reshard: true }) },
    { t: 'Check the hashes', home: true, say: 'On resume, every shard is checked against the manifest.', act: m => m.set({ temp: true, manifest: true, crash: false, next: 4, reshard: true }) },
    { t: 'More ranks', home: true, say: 'A new rank count needs a reshard step.', act: m => m.set({ temp: true, manifest: true, crash: false, next: 8, reshard: false }) },
    { t: 'One truth', home: true, say: 'Many files, one manifest, one truth.', act: m => m.set({ temp: true, manifest: true, crash: false, next: 8, reshard: true }) },
  ],
  check: [
    { q: 'Why write the manifest last?', options: ['A save is real only when complete', 'It is the largest', 'For speed'], answer: 0, why: 'A crash leaves the last save in place.', hint: 'See The manifest.' },
    { q: 'What does a manifest record?', options: ['Who owns what, with hashes', 'The prompt', 'The loss curve'], answer: 0, why: 'It ties shards together.', hint: 'Try No manifest.' },
    { q: 'What is needed for a new rank count?', options: ['A reshard step', 'Nothing', 'A new model'], answer: 0, why: 'Shards must be redistributed.', hint: 'Try Resume on more ranks, as it is.' },
  ],
  terms: [['Shard', 'One rank\'s part.'], ['Manifest', 'An index of shards.'], ['Atomic rename', 'All or nothing.'], ['Reshard', 'Redistributing state.']],
  deeper: '<p><b>Keep several.</b> Delete an old save only after the new manifest lands.</p><p><b>Earlier lessons</b> cover single-file saves.</p>',
  code: {
    title: 'Save',
    note: 'Adapted from the course\'s checkpointing (code/main.py).',
    text: `
def save(step, state, rank):
    tmp = path(step, rank).with_suffix(".tmp")
    torch.save(state, tmp)
    os.replace(tmp, path(step, rank))
    barrier()
    if rank == 0:
        write_manifest(step)                     # last
`,
  },
};
