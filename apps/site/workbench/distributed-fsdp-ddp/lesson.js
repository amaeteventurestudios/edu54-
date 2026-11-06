// DDP and FSDP from scratch (phase 19, lesson 48): a really small all-reduce runs below: four ranks each compute a gradient on their slice; the mean equals the gradient on the whole batch. DDP keeps full copies; FSDP shards weights across ranks, for models too big for one GPU. A Pretoria cluster.
const DATA = [2, 4, 6, 8, 1, 3, 5, 7];
const grad = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
function run(o) {
  const n = o.ranks, per = Math.floor(DATA.length / n), slices = Array.from({ length: n }, (_, i) => o.sampler ? DATA.slice(i * per, (i + 1) * per) : DATA.slice(0, per));
  const gs = slices.map(grad), mean = gs.reduce((a, b) => a + b, 0) / n, whole = grad(DATA);
  const mem = o.mode === 'ddp' ? 80 : 80 / n + 8, fits = mem <= 40;
  const diverge = !o.bcast;
  return { gs, mean, whole, same: Math.abs(mean - whole) < 1e-9, mem, fits, diverge };
}

export default {
  slug: 'distributed-fsdp-ddp',
  title: 'DDP and FSDP: many GPUs, one model',
  description: 'Four ranks, one gradient. Copy the model to each, or split it across them when it won\'t fit.',
  overview: 'Data-parallel training splits a batch across ranks. DDP gives each rank a full copy. At the start, it broadcasts the weights so that all ranks agree. After backward, an all-reduce averages gradients, so that every rank takes the same step. Done right, this exactly matches one big gradient on the joined input, and a real tiny all-reduce shows that here. If the model doesn\'t fit on one GPU, FSDP shards the weights across ranks and gathers them per layer, trading communication for memory. A distributed sampler gives each rank different data. Forget it, and they all read the same slice. This runs for a cluster in Pretoria.',
  keywords: ['DDP', 'FSDP', 'all-reduce', 'distributed training', 'sharding', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { ranks: 4, mode: 'ddp', sampler: true, bcast: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.75;
    const R4 = [0, 1, 2, 3].map(i => { const g = add(P.tank(0.5, 0.8, 0.5, BLUE)); g.position.set(X(i), 0.08, -0.1); const t = add(P.tower(0.2, 0.2, SAF)); t.position.set(X(i), 0.03, 0.5); t.userData.set({ cap: '' }); return { g, t }; });
    const hub = add(P.lamp(GOOD, { h: 0.5, r: 0.13 })); hub.position.set(1.3, 0.03, 0.1);
    const rods = [0, 1, 2, 3].map(i => { const r = P.rod(V(X(i), 0.6, -0.1), V(1.3, 0.62, 0.1), 0.02, SAF); S.add(r); return r; });
    const T = add(P.tower(0.4, 0.4, GOOD)); T.position.set(2.0, 0.03, 0.1); T.userData.set({ cap: '' });
    S.add(P.keep(-2.45, 2.45, 1.05, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      R4.forEach(({ g, t }, i) => { const on = i < st.ranks; g.visible = on; t.visible = on; g.userData.set({ level: R.mem / 40 * 0.95, color: R.fits ? BLUE : BAD }); t.userData.set({ h: on ? (R.gs[i] ?? 0) * 0.15 : 0.02 }); });
      rods.forEach((r, i) => r.visible = i < st.ranks);
      hub.userData.set({ color: R.same && !R.diverge ? '#3E9B5F' : '#D9483B', on: true }); T.userData.set({ h: R.mean * 0.15, color: R.same ? GOOD : BAD });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['ddp', 'fsdp'];
    const controls = [
      { type: 'buttons', label: 'Mode', options: ['DDP: full copies', 'FSDP: shards'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'buttons', label: 'Ranks', options: ['2', '4'], get: () => [2, 4].indexOf(st.ranks), act: i => set({ ranks: [2, 4][i] }) },
      { type: 'toggle', label: 'Each rank gets different data', short: 'Sampler', get: () => st.sampler, set: v => set({ sampler: !!v }) },
      { type: 'toggle', label: 'Broadcast weights at the start', short: 'Broadcast', get: () => st.bcast, set: v => set({ bcast: !!v }) },
    ];
    const readouts = [
      { label: 'All-reduced gradient', get: () => ({ v: R.mean.toFixed(2), sub: `whole batch: ${R.whole.toFixed(2)}`, good: R.same, bad: !R.same }) },
      { label: 'Memory per GPU', get: () => ({ v: `${Math.round(R.mem)} GB`, sub: 'limit 40 GB', good: R.fits, bad: !R.fits }) },
      { label: 'Ranks agree', get: () => ({ v: R.diverge ? 'no' : 'yes', good: !R.diverge, bad: R.diverge }) },
    ];
    const labels = [
      { name: 'g', t: 'Ranks', d: 'Red: the model doesn\'t fit', icon: 'box', atV: V(X(0) - 0.28, 0.5, -0.1) },
      { name: 't', t: 'All-reduce', d: 'One mean gradient', icon: 'target', atV: V(2.25, 0.2, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget the distributed sampler', hint: 'all read one slice', on: () => set({ ...D0, sampler: false, mode: 'fsdp' }), off: reset },
      { label: 'Skip the broadcast', hint: 'ranks start apart', on: () => set({ ...D0, bcast: false, mode: 'fsdp' }), off: reset },
    ];
    function status() {
      if (!st.sampler) return { ok: false, msg: `<b>The mean is ${R.mean.toFixed(2)}, and the whole batch gives ${R.whole.toFixed(2)}.</b> All ranks read the same slice, so most of the data is never used.` };
      if (R.diverge) return { ok: false, msg: '<b>Ranks started from different weights, and they stay apart.</b> Averaged gradients can\'t fix that. Broadcast at the start.' };
      if (!R.fits) return { ok: false, msg: `<b>${Math.round(R.mem)} GB on a 40 GB GPU.</b> DDP needs a full copy on each. FSDP shards it.` };
      return { ok: true, msg: `<b>The all-reduce gives ${R.mean.toFixed(2)}, exactly the whole-batch gradient.</b> ${st.mode === 'fsdp' ? 'Each rank holds a shard, gathering a layer as it needs it.' : 'Each rank holds a full copy.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Split the batch', home: true, say: 'A cluster in Pretoria has four GPUs. Each rank takes a slice of the batch.', act: m => m.set({ ranks: 4, mode: 'fsdp', sampler: true, bcast: true }) },
    { t: 'Same start', home: true, say: 'Broadcast weights first, or ranks begin apart and stay apart.', act: m => m.set({ ranks: 4, mode: 'fsdp', sampler: true, bcast: false }) },
    { t: 'All-reduce', home: true, say: 'After backward, average the gradients. It exactly matches one big gradient.', act: m => m.set({ ranks: 4, mode: 'fsdp', sampler: true, bcast: true }) },
    { t: 'Different data', home: true, say: 'Each rank needs its own slice. Forget the sampler, and they read the same thing.', act: m => m.set({ ranks: 4, mode: 'fsdp', sampler: false, bcast: true }) },
    { t: 'Too big to copy', home: true, say: 'A full copy on each GPU may not fit. DDP runs out of room.', act: m => m.set({ ranks: 4, mode: 'ddp', sampler: true, bcast: true }) },
    { t: 'FSDP', home: true, say: 'FSDP shards the weights, and gathers each layer as needed. Memory for communication.', act: m => m.set({ ranks: 4, mode: 'fsdp', sampler: true, bcast: true }) },
  ],
  check: [
    { q: 'What does all-reduce do?', options: ['Averages gradients across ranks', 'Deletes data', 'Splits weights'], answer: 0, why: 'Each rank takes the same step.', hint: 'See All-reduce.' },
    { q: 'When do you want FSDP?', options: ['When the model won\'t fit on one GPU', 'With one GPU', 'For small models'], answer: 0, why: 'It shards weights.', hint: 'See Too big to copy.' },
    { q: 'What does a distributed sampler do?', options: ['Gives each rank different data', 'Picks models', 'Scales the loss'], answer: 0, why: 'Otherwise they repeat a slice.', hint: 'Try Forget the distributed sampler.' },
  ],
  terms: [['Rank', 'One process in a group.'], ['DDP', 'Data parallel with full copies.'], ['FSDP', 'Sharded data parallel.'], ['All-reduce', 'Combine and share across ranks.'], ['Broadcast', 'Send from one to all.']],
  deeper: '<p><b>No special hardware.</b> The gloo backend works on CPUs for learning.</p><p><b>Later lessons</b> split this into data, parameter sharding, pipelines and resume.</p><p><b>The all-reduce</b> is really computed on eight numbers.</p>',
  code: {
    title: 'A tiny DDP',
    note: 'Adapted from the course\'s wrapper (code/main.py).',
    text: `
for p in model.parameters():
    dist.broadcast(p.data, src=0)

def sync_grads(model):
    for p in model.parameters():
        dist.all_reduce(p.grad, op=dist.ReduceOp.SUM)
        p.grad /= dist.get_world_size()
`,
  },
};
