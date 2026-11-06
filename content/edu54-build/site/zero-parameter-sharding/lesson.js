// ZeRO sharding (phase 19, lesson 78): Adam keeps two moments per parameter, plus master copies; memory per rank is computed for stages 1, 2 and 3 against plain DDP, at 4 to 64 ranks, for a Johannesburg cluster. Stacked towers show parameters, gradients and optimiser state per GPU.
function run(o) {
  const P0 = 100, n = o.ranks;
  const st = { 0: [P0, P0, 3 * P0], 1: [P0, P0, 3 * P0 / n], 2: [P0, P0 / n, 3 * P0 / n], 3: [P0 / n, P0 / n, 3 * P0 / n] }[o.stage];
  const comm = { 0: 1, 1: 1.2, 2: 1.6, 3: 3 }[o.stage];
  return { p: st[0], g: st[1], s: st[2], total: st[0] + st[1] + st[2], comm, fits: st[0] + st[1] + st[2] <= 250 };
}

export default {
  slug: 'zero-parameter-sharding',
  title: 'ZeRO: splitting optimiser state between GPUs',
  description: 'Optimiser state is the largest thing on your GPU. Share it out in stages, and see memory fall.',
  overview: 'Under Adam, each parameter needs two moments and often a full-precision master copy, so optimiser state can exceed the model. Plain DDP keeps all of that on every GPU. ZeRO shares it out. Stage 1 shards optimiser state, so each rank owns one Nth, using reduce-scatter and all-gather. Stage 2 also shards gradients. Stage 3 shards the parameters too, gathering each layer as needed, at a higher communication cost. Choose the lowest stage that fits. This computes the memory table for a cluster in Johannesburg.',
  keywords: ['ZeRO', 'DeepSpeed', 'optimizer state', 'sharding', 'distributed training', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { stage: 1, ranks: 8 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4.6, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const mk = c => { const m = new S.THREE.MeshLambertMaterial({ color: c }), b = P.box(1.0, 1, 0.8, '#fff', { r: 0.01, material: m }); b.position.set(-0.9, 0, -0.1); b.userData.noFit = true; S.add(b); return b; };
    const a = mk(BLUE), b = mk(GOOD), c = mk(SAF);
    const lim = new S.THREE.Mesh(new S.THREE.BoxGeometry(1.5, 0.02, 1.2), new S.THREE.MeshLambertMaterial({ color: '#B5462F', transparent: true, opacity: 0.4, depthWrite: false })); lim.position.set(-0.9, 0.03 + 250 * 0.003, -0.1); lim.userData.noMask = true; S.add(lim);
    const T = add(P.tower(0.5, 0.5, '#7B6FA8')); T.position.set(1.0, 0.03, -0.1); T.userData.set({ cap: '' });
    S.add(P.keep(-2.0, 1.8, 1.25, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); const k = 0.003; a.scale.y = Math.max(0.01, R.p * k); b.scale.y = Math.max(0.01, R.g * k); c.scale.y = Math.max(0.01, R.s * k); a.position.y = 0.03; b.position.y = 0.03 + R.p * k; c.position.y = 0.03 + (R.p + R.g) * k; T.userData.set({ h: R.comm * 0.35 }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Stage', options: ['Plain DDP', 'Stage 1', 'Stage 2', 'Stage 3'], get: () => st.stage, act: i => set({ stage: i }) },
      { type: 'buttons', label: 'Ranks', options: ['4', '8', '64'], get: () => [4, 8, 64].indexOf(st.ranks), act: i => set({ ranks: [4, 8, 64][i] }) },
    ];
    const readouts = [
      { label: 'Memory per GPU', get: () => ({ v: `${Math.round(R.total)} units`, sub: 'limit 250', good: R.fits, bad: !R.fits }) },
      { label: 'Optimiser state', get: () => ({ v: `${Math.round(R.s)} units`, sub: `of ${3 * 100} in all` }) },
      { label: 'Communication', get: () => ({ v: `${R.comm}×`, good: R.comm < 2, bad: R.comm > 2 }) },
    ];
    const labels = [
      { name: 't', t: 'Blue weights, teal gradients', d: 'Gold: optimiser state', icon: 'box', atV: V(-1.4, 0.3, -0.1) },
      { name: 'c', t: 'Network traffic', d: 'Higher stages talk more', icon: 'wave', atV: V(1.25, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Plain DDP on a large model', hint: 'state on every GPU', on: () => set({ ...D0, stage: 0 }), off: reset },
      { label: 'Stage 3 when stage 1 fits', hint: 'traffic for nothing', on: () => set({ ...D0, stage: 3 }), off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${Math.round(R.total)} units against a limit of 250.</b> Optimiser state is three times the model. ${st.stage === 0 ? 'Every GPU holds all of it.' : 'Go up a stage, or add ranks.'}` };
      if (st.stage === 3) return { ok: false, msg: `<b>It fits, at ${R.comm} times the traffic.</b> Each layer is gathered as it runs. Use this stage only if lower ones don\'t fit.` };
      return { ok: true, msg: `<b>Stage ${st.stage}: ${Math.round(R.total)} units per GPU.</b> Each rank owns one ${st.ranks}th of the optimiser state.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The largest thing', home: true, say: 'A cluster in Johannesburg runs out of memory. Adam\'s state is larger than the model.', act: m => m.set({ stage: 0, ranks: 8 }) },
    { t: 'Stage 1', home: true, say: 'Shard optimiser state. Each rank owns one share, and the gold block shrinks.', act: m => m.set({ stage: 1, ranks: 8 }) },
    { t: 'Stage 2', home: true, say: 'Shard gradients too, so each rank gets only its part.', act: m => m.set({ stage: 2, ranks: 8 }) },
    { t: 'Stage 3', home: true, say: 'Shard weights as well, gathering each layer when it runs.', act: m => m.set({ stage: 3, ranks: 8 }) },
    { t: 'The cost', home: true, say: 'Higher stages talk more. Network traffic climbs.', act: m => m.set({ stage: 3, ranks: 64 }) },
    { t: 'Just enough', home: true, say: 'Choose the lowest stage that fits.', act: m => m.set({ stage: 1, ranks: 8 }) },
  ],
  check: [
    { q: 'What does stage 1 shard?', options: ['Optimiser state', 'Weights', 'The dataset'], answer: 0, why: 'It is the largest part.', hint: 'See Stage 1.' },
    { q: 'What does stage 3 cost?', options: ['More communication', 'More accuracy', 'Nothing'], answer: 0, why: 'Layers are gathered as they run.', hint: 'See The cost.' },
    { q: 'How do you choose a stage?', options: ['The lowest that fits', 'Always the highest', 'At random'], answer: 0, why: 'Traffic has a cost.', hint: 'Try Stage 3 when stage 1 fits.' },
  ],
  terms: [['Optimiser state', 'Adam\'s moments.'], ['Reduce-scatter', 'Sum, then share out parts.'], ['All-gather', 'Everyone receives all parts.'], ['Master copy', 'A full-precision weight.']],
  deeper: '<p><b>Numbers.</b> Memory follows from the sharing rule. Traffic is a round figure.</p><p><b>FSDP</b> is PyTorch\'s related design.</p>',
  code: {
    title: 'Stage 1 step',
    note: 'Adapted from the course\'s sharding (code/main.py).',
    text: `
def step(params, grads, shard):
    mine = reduce_scatter(grads)                 # my share of the summed gradient
    update = adam(shard, mine)
    return all_gather(update)                    # everyone gets all of it
`,
  },
};
