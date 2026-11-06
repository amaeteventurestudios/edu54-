// Gradient accumulation (phase 19, lesson 46): a Tunis student has one small GPU. Effective batch = micro batch × accumulation steps × devices. Loss must be divided by the steps, or the gradient grows. Real sums, plus a throughput curve from a simple cost per sync.
function run(o) {
  const eff = o.micro * o.acc * o.dev, gain = o.scale ? 1 : o.acc;
  const steps = 1 + (o.acc - 1) * 0.92, tput = (o.micro * o.acc) / steps * 100 * (o.dev ** 0.9) * (o.sync && o.acc > 1 ? 0.8 : 1);
  return { eff, gain, tput: Math.round(tput), oom: o.micro > 8 };
}

export default {
  slug: 'gradient-accumulation',
  title: 'Gradient accumulation: a big batch on a small GPU',
  description: 'Your GPU fits eight. You want sixty-four. Add up gradients over steps, and scale the loss so they match.',
  overview: 'You want a large batch and the GPU runs out of memory. Accumulation splits it: run several micro-batches, keep adding gradients, and step the optimizer once. The effective batch is micro batch times accumulation steps times devices. One detail matters: divide each loss by the number of steps, or the summed gradient is that many times too large. On several devices, skip gradient sync until the last micro-batch, as syncing each time wastes the network. Accumulation matches the gradient of a larger batch, and it doesn\'t make steps faster. This lesson runs the sums for a student in Tunis with one small GPU.',
  keywords: ['gradient accumulation', 'effective batch', 'micro batch', 'DDP', 'memory', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { micro: 8, acc: 8, dev: 1, scale: true, sync: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const gpu = add(P.tank(0.7, 0.7, 0.6, BLUE)); gpu.position.set(-2.0, 0.08, 0);
    const pile = add(P.stack(0.8, 0.6, 0.075, { max: 16, color: SAF })); pile.position.set(-0.6, 0.03, 0);
    const T = add(P.tower(0.6, 0.6, GOOD)); T.position.set(0.7, 0.03, 0); T.userData.set({ cap: '' });
    const need = add(P.dial(0.34)); need.position.set(1.7, 0.03, 0);
    S.add(P.keep(-2.45, 2.2, 1.3, -0.72, 0.72));
    let R = null, c = 0, u = 0;
    function draw() { R = run(st); gpu.userData.set({ level: st.micro / 8, color: R.oom ? BAD : BLUE }); T.userData.set({ h: Math.min(1.25, R.eff / 60), color: GOOD }); need.userData.set({ v: Math.min(1, (R.gain - 1) / 8) }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Micro batch', min: 2, max: 16, step: 2, get: () => st.micro, set: v => set({ micro: v }) },
      { type: 'slider', label: 'Accumulation steps', min: 1, max: 16, step: 1, get: () => st.acc, set: v => set({ acc: v }) },
      { type: 'slider', label: 'Devices', min: 1, max: 4, step: 1, get: () => st.dev, set: v => set({ dev: v }) },
      tg('scale', 'Divide the loss by the steps', 'Scale loss'), tg('sync', 'Sync gradients on every micro-batch', 'Sync always'),
    ];
    const readouts = [
      { label: 'Effective batch', get: () => ({ v: `${R.eff}`, sub: `${st.micro} × ${st.acc} × ${st.dev}` }) },
      { label: 'Gradient size', get: () => ({ v: `${R.gain}×`, sub: 'should be 1', good: R.gain === 1, bad: R.gain > 1 }) },
      { label: 'Samples a second', get: () => ({ v: `${R.tput}`, sub: 'relative' }) },
    ];
    const labels = [
      { name: 'g', t: 'GPU memory', d: 'Fits one micro-batch', icon: 'box', atV: V(-2.38, 0.4, 0) },
      { name: 't', t: 'Effective batch', d: 'The size the optimizer sees', icon: 'target', atV: V(2.08, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget to scale the loss', hint: 'gradients add up', on: () => set({ ...D0, scale: false }), off: reset },
      { label: 'A batch too big for memory', hint: 'out of memory', on: () => set({ ...D0, micro: 16, acc: 4 }), off: reset },
      { label: 'Sync on every micro-batch', hint: 'network wasted', on: () => set({ ...D0, dev: 4, sync: true }), off: reset },
    ];
    function status() {
      if (R.oom) return { ok: false, msg: `<b>Out of memory at a micro batch of ${st.micro}.</b> Memory depends on the micro batch alone. Lower it, and raise the steps.` };
      if (!st.scale) return { ok: false, msg: `<b>The gradient is ${R.gain} times too large.</b> It acts like a much higher learning rate. Divide each loss by the steps.` };
      if (st.sync && st.dev > 1) return { ok: false, msg: '<b>Each micro-batch waits on the network.</b> Skip sync until the last one.' };
      return { ok: true, msg: `<b>An effective batch of ${R.eff}, on a GPU that holds ${st.micro}.</b> The gradient matches a real batch of ${R.eff}. Each update takes ${st.acc} passes, so it isn't quicker.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.3) { u = 0; c = (c + 1) % (Math.min(16, st.acc) + 1); pile.userData.set({ n: c, colors: Array(16).fill(SAF) }); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A small GPU', home: true, say: 'A student in Tunis has one small GPU that fits a batch of eight, and wants far more.', act: m => m.set({ micro: 8, acc: 1, dev: 1, scale: true, sync: false }) },
    { t: 'Add them up', home: true, say: 'Run several micro-batches, add the gradients, then step once.', act: m => m.set({ micro: 8, acc: 8, dev: 1, scale: true, sync: false }) },
    { t: 'Scale the loss', home: true, say: 'Forget to divide the loss, and the gradient is eight times too big.', act: m => m.set({ micro: 8, acc: 8, dev: 1, scale: false, sync: false }) },
    { t: 'Memory', home: true, say: 'Memory depends on the micro batch alone, not on the steps.', act: m => m.set({ micro: 4, acc: 16, dev: 1, scale: true, sync: false }) },
    { t: 'More devices', home: true, say: 'With several GPUs, skip the sync until the last micro-batch.', act: m => m.set({ micro: 8, acc: 4, dev: 4, scale: true, sync: false }) },
    { t: 'Not faster', home: true, say: 'It matches a big batch. Each update just takes longer.', act: m => m.set({ micro: 8, acc: 8, dev: 1, scale: true, sync: false }) },
  ],
  check: [
    { q: 'What is the effective batch?', options: ['Micro batch × steps × devices', 'Micro batch only', 'Steps only'], answer: 0, why: 'That is what the optimizer sees.', hint: 'Move the sliders.' },
    { q: 'Why divide the loss by the steps?', options: ['To match a true batch gradient', 'To save memory', 'To go faster'], answer: 0, why: 'Otherwise gradients sum too large.', hint: 'Try Forget to scale the loss.' },
    { q: 'What sets memory use?', options: ['The micro batch', 'The steps', 'The dataset'], answer: 0, why: 'Only one micro-batch is in memory.', hint: 'Try A batch too big for memory.' },
  ],
  terms: [['Micro batch', 'What fits on the GPU.'], ['Accumulation', 'Adding gradients over steps.'], ['Effective batch', 'The combined size.'], ['Sync', 'Sharing gradients between devices.']],
  deeper: '<p><b>Normalisers.</b> BatchNorm sees only micro-batches. LayerNorm doesn\'t care.</p><p><b>Clip once,</b> just before the optimizer step.</p><p><b>Throughput</b> here is a simple relative number.</p>',
  code: {
    title: 'Accumulate',
    note: 'Adapted from the course\'s loop (code/main.py).',
    text: `
for i, (x, y) in enumerate(batches):
    loss = compute(x, y) / accum_steps
    loss.backward()
    if (i + 1) % accum_steps == 0:
        optimizer.step(); optimizer.zero_grad()
`,
  },
};
