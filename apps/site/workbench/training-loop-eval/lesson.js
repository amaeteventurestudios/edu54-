// Training loop (phase 19, lesson 36): one loop, computed live. A small curve simulator for train and held-out loss over 40 evaluation points, with warmup and cosine decay. Weight decay on the wrong tensors, a bad target alignment or too high a rate each bend the curves.
function run(o) {
  const tr = [], ev = [], lr = []; let t = 4.8, e = 4.8; const N = 40, W = o.warm ? 4 : 0;
  for (let i = 0; i < N; i++) {
    const l = (i < W ? (i + 1) / W : 0.5 * (1 + Math.cos(Math.PI * (i - W) / (N - W)))) * o.lr; lr.push(l);
    const rate = l * 0.12;
    if (o.align) { t = t - rate * (t - 0.3); e = e - rate * (e - (o.decayAll ? 2.1 : 1.3)); } else { t = t - rate * (t - 4.2); e = t + 0.05; }
    if (o.lr > 1.4 && !o.warm && i < 6) t += 0.5, e += 0.5;
    if (i > 26 && !o.stop) e += 0.02;
    tr.push(t); ev.push(e);
  }
  return { tr, ev, lr, last: ev[N - 1], gap: ev[N - 1] - tr[N - 1] };
}

export default {
  slug: 'training-loop-eval',
  title: 'The training loop: small details, big curves',
  description: 'Align targets, schedule the rate, decay the right weights, watch held-out loss. Each detail bends the curve.',
  overview: 'The loop is a few lines: forward, loss, backward, step. The trouble is in the details. Targets must be inputs shifted by one, or training is meaningless. AdamW\'s weight decay applies to weights, not to LayerNorms or biases. The learning rate warms up in a straight line, then falls along a cosine. Evaluate on a held-out split every so often, in eval mode, with no gradients, so that numbers compare across runs. And print a sample every so often, as a curve can look fine while text is nonsense. This lesson simulates the curves live, so that you can see what each mistake looks like.',
  keywords: ['training loop', 'AdamW', 'warmup', 'cosine decay', 'held-out loss', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.05, 1.0, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { lr: 1, warm: true, align: true, decayAll: false, stop: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.3 + i * 0.118;
    const Tr = Array.from({ length: 40 }, (_, i) => { const t = add(P.tower(0.09, 0.2, BLUE)); t.position.set(X(i), 0.03, -0.25); t.userData.set({ cap: '' }); return t; });
    const Ev = Array.from({ length: 40 }, (_, i) => { const t = add(P.tower(0.09, 0.2, BAD)); t.position.set(X(i), 0.03, 0.05); t.userData.set({ cap: '' }); return t; });
    const Lr = Array.from({ length: 40 }, (_, i) => { const t = add(P.tower(0.09, 0.14, SAF)); t.position.set(X(i), 0.03, 0.42); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.45, 2.45, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      Tr.forEach((t, i) => t.userData.set({ h: Math.max(0.03, R.tr[i] * 0.2) })); Ev.forEach((t, i) => t.userData.set({ h: Math.max(0.03, R.ev[i] * 0.2) })); Lr.forEach((t, i) => t.userData.set({ h: Math.max(0.02, R.lr[i] * 0.3) }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Learning rate', min: 0.2, max: 2, step: 0.1, get: () => st.lr, set: v => set({ lr: v }) },
      tg('warm', 'Warm up first', 'Warmup'), tg('align', 'Targets shifted by one', 'Aligned'), tg('decayAll', 'Decay norms and biases too', 'Decay all'), tg('stop', 'Stop when held-out loss turns', 'Early stop'),
    ];
    const readouts = [
      { label: 'Final held-out loss', get: () => ({ v: R.last.toFixed(2), sub: 'coral row', good: R.last < 1.6, bad: R.last > 2.5 }) },
      { label: 'Gap to training', get: () => ({ v: R.gap.toFixed(2), good: R.gap < 1.2, bad: R.gap > 1.6 }) },
      { label: 'Peak rate', get: () => ({ v: Math.max(...R.lr).toFixed(2), sub: st.warm ? 'after warmup' : 'from step one' }) },
    ];
    const labels = [
      { name: 't', t: 'Blue train, coral held-out', d: 'Gold: the learning rate', icon: 'target', atV: V(X(0) - 0.08, 0.3, -0.1) },
      { name: 'r', t: 'Forty evaluations', d: 'Left to right in time', icon: 'wave', atV: V(X(39) + 0.08, 0.12, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Misalign the targets', hint: 'off by one', on: () => set({ ...D0, align: false }), off: reset },
      { label: 'High rate, no warmup', hint: 'an early spike', on: () => set({ ...D0, lr: 1.9, warm: false }), off: reset },
      { label: 'Decay everything', hint: 'norms shrink', on: () => set({ ...D0, decayAll: true }), off: reset },
      { label: 'Never stop', hint: 'held-out turns up', on: () => set({ ...D0, stop: false }), off: reset },
    ];
    function status() {
      if (!st.align) return { ok: false, msg: `<b>Loss stuck near ${R.last.toFixed(1)}.</b> Nothing to learn: targets don't follow inputs. A flat curve at the start is usually a data bug, not a model bug.` };
      if (st.lr > 1.4 && !st.warm) return { ok: false, msg: '<b>The first steps spike upward.</b> Early weights are near random, and a full rate kicks them. Warmup eases it in.' };
      if (st.decayAll) return { ok: false, msg: `<b>Held-out loss stalls at ${R.last.toFixed(2)}.</b> Decaying LayerNorm and bias tensors hurts for no benefit. Apply decay to weights only.` };
      if (!st.stop) return { ok: false, msg: `<b>Held-out loss turned upward, to ${R.last.toFixed(2)}.</b> Train loss still falls, as it always will. Keep the best checkpoint.` };
      return { ok: true, msg: `<b>Held-out loss ${R.last.toFixed(2)}, gap ${R.gap.toFixed(2)}.</b> Warmup, cosine, the right decay, and a sample printed along the way.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A few lines', home: true, say: 'Forward, loss, backward, step. The curves show how it goes: blue on training data, coral on held-out data.', act: m => m.set({ lr: 1, warm: true, align: true, decayAll: false, stop: true }) },
    { t: 'Off by one', home: true, say: 'Misalign the targets, and the curve goes flat. That is a data bug.', act: m => m.set({ lr: 1, warm: true, align: false, decayAll: false, stop: true }) },
    { t: 'Warmup', home: true, say: 'The gold row is the rate. A straight climb first, then a cosine down.', act: m => m.set({ lr: 1, warm: true, align: true, decayAll: false, stop: true }) },
    { t: 'No warmup', home: true, say: 'A high rate from step one spikes the loss.', act: m => m.set({ lr: 1.9, warm: false, align: true, decayAll: false, stop: true }) },
    { t: 'Decay the right things', home: true, say: 'Weight decay goes on weights. Put it on norms and biases, and results get worse.', act: m => m.set({ lr: 1, warm: true, align: true, decayAll: true, stop: true }) },
    { t: 'Watch held-out', home: true, say: 'Training loss always falls. Held-out loss turns up when you should stop.', act: m => m.set({ lr: 1, warm: true, align: true, decayAll: false, stop: false }) },
  ],
  check: [
    { q: 'A flat loss from step one usually means what?', options: ['A data bug, such as misaligned targets', 'Too many layers', 'Good training'], answer: 0, why: 'Check the data first.', hint: 'Try Misalign the targets.' },
    { q: 'Where does weight decay go?', options: ['On weights, not norms or biases', 'Everywhere', 'On the rate'], answer: 0, why: 'Others get hurt.', hint: 'Try Decay everything.' },
    { q: 'What shows overfitting?', options: ['Held-out loss turning up', 'Train loss falling', 'Warmup ending'], answer: 0, why: 'Training loss always falls.', hint: 'Try Never stop.' },
  ],
  terms: [['AdamW', 'Adam with decoupled weight decay.'], ['Warmup', 'A slow start to the rate.'], ['Cosine decay', 'A smooth fall in the rate.'], ['Held-out', 'Data not trained on.'], ['Early stopping', 'Keeping the best point.']],
  deeper: '<p><b>Samples.</b> Print generated text every so often. Curves miss a lot.</p><p><b>Eval mode.</b> Turn off dropout, and don\'t track gradients.</p><p><b>Curves</b> here are simulated to show each mistake.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s training loop (code/main.py).',
    text: `
for step, (x, y) in enumerate(batches):
    set_lr(optimizer, schedule(step))
    loss = F.cross_entropy(model(x).flatten(0, 1), y.flatten())
    loss.backward()
    clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step(); optimizer.zero_grad()
    if step % eval_every == 0:
        print(evaluate_model(model, val), sample(model))
`,
  },
};
