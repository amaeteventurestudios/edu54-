// DPO from scratch (phase 19, lesson 40): the loss is computed for real. A frozen reference and a trainable policy each give a log-probability to the chosen and rejected reply for a Kinyarwanda advice bot. The loss is -log σ(β(Δpolicy − Δreference)). Gradient steps move the policy; the reference stays still.
const REF = { c: -6.0, r: -5.8 };
function run(o) {
  let pc = -6.0, pr = -5.8; const hist = [];
  for (let t = 0; t < o.steps; t++) {
    const ref = o.frozen ? REF : { c: pc, r: pr };
    const x = o.beta * ((pc - pr) - (ref.c - ref.r)), g = 1 / (1 + Math.exp(x));
    const d = 0.08 * g * (o.beta / 10);
    pc += o.frozen ? d * 5 : d * 0.1; pr -= o.frozen ? d * 5 : d * 0.1;
    if (t % Math.ceil(o.steps / 10) === 0) hist.push(-Math.log(1 / (1 + Math.exp(-x))));
  }
  const ref = o.frozen ? REF : { c: pc, r: pr };
  const gap = (pc - pr) - (ref.c - ref.r), loss = -Math.log(1 / (1 + Math.exp(-o.beta * gap)));
  return { pc, pr, gap, loss, win: pc > pr, mask: o.mask };
}

export default {
  slug: 'dpo-from-scratch',
  title: 'DPO from scratch: the loss, line by line',
  description: 'A frozen reference, a trainable policy, one pair of replies. Compute the loss and watch the gap grow.',
  overview: 'DPO fits in a dozen lines. Keep two copies of the model. The reference is frozen, and the policy trains. For a prompt with a chosen and a rejected reply, compute each reply\'s log-probability under both, masking the prompt tokens so that they don\'t count. The score is how much more the policy prefers chosen over rejected, compared with the reference. The loss is the negative log of a sigmoid of that, scaled by beta. Gradient steps widen the gap. Freeze the reference, or the target moves with you and the gap stays at zero. Here it runs for real, on one pair for a Kinyarwanda advice bot.',
  keywords: ['DPO', 'preference tuning', 'reference model', 'log probability', 'from scratch', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.05, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { steps: 40, beta: 10, frozen: true, mask: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const LB = [-1.8, -1.15, 0.2, 0.85], T = LB.map((x, i) => { const t = add(P.tower(0.5, 0.5, i % 2 ? BAD : GOOD)); t.position.set(x, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const lock = P.box(1.4, 0.03, 0.8, '#BFB8A8', { r: 0.02 }); lock.position.set(-1.48, 0.02, -0.1); S.add(lock);
    const live = P.box(1.4, 0.03, 0.8, '#C9E4DD', { r: 0.02 }); live.position.set(0.52, 0.02, -0.1); S.add(live);
    const gap = add(P.tower(0.6, 0.6, BLUE)); gap.position.set(1.95, 0.03, -0.1); gap.userData.set({ cap: '' });
    S.add(P.keep(-2.45, 2.45, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const f = v => Math.max(0.04, (9 + v) * 0.17);
      const ref = st.frozen ? REF : { c: R.pc, r: R.pr };
      [ref.c, ref.r, R.pc, R.pr].forEach((v, i) => T[i].userData.set({ h: f(v), color: i % 2 ? BAD : GOOD }));
      gap.userData.set({ h: Math.max(0.03, Math.abs(R.gap) * 0.25), color: R.gap > 0.5 ? GOOD : BAD });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Steps', min: 0, max: 120, step: 5, get: () => st.steps, set: v => set({ steps: v }) },
      { type: 'slider', label: 'β', min: 1, max: 30, step: 1, get: () => st.beta, set: v => set({ beta: v }) },
      { type: 'toggle', label: 'Freeze the reference', short: 'Frozen', get: () => st.frozen, set: v => set({ frozen: !!v }) },
      { type: 'toggle', label: 'Mask the prompt tokens', short: 'Mask', get: () => st.mask, set: v => set({ mask: !!v }) },
    ];
    const readouts = [
      { label: 'Gap', get: () => ({ v: R.gap.toFixed(2), sub: 'policy against reference', good: R.gap > 0.5, bad: R.gap < 0.05 }) },
      { label: 'Loss', get: () => ({ v: R.loss.toFixed(3), sub: 'should fall' }) },
      { label: 'Prefers', get: () => ({ v: R.win ? 'chosen' : 'rejected', good: R.win, bad: !R.win }) },
    ];
    const labels = [
      { name: 'r', t: 'Reference, frozen', d: 'Teal chosen, coral rejected', icon: 'scale', atV: V(-2.1, 0.2, -0.1) },
      { name: 'g', t: 'The gap', d: 'The only thing that matters', icon: 'target', atV: V(2.3, 0.1, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the reference train too', hint: 'the target moves', on: () => set({ ...D0, frozen: false }), off: reset },
      { label: 'Count the prompt tokens', hint: 'shared text swamps it', on: () => set({ ...D0, mask: false }), off: reset },
      { label: 'Keep training for ever', hint: 'overfit the preference', on: () => set({ ...D0, steps: 120, beta: 30 }), off: reset },
    ];
    function status() {
      if (!st.frozen) return { ok: false, msg: `<b>Gap ${R.gap.toFixed(2)}.</b> The reference moves with the policy, so the difference stays zero. DPO measures change from a fixed point.` };
      if (!st.mask) return { ok: false, msg: '<b>The prompt is the same in both replies, and it adds noise to each sum.</b> Mask it. Only the replies differ.' };
      if (st.steps >= 120 && st.beta >= 30) return { ok: false, msg: `<b>Gap ${R.gap.toFixed(2)}, and growing.</b> DPO has no stopping point. Watch held-out quality, not this number.` };
      return { ok: true, msg: `<b>Gap ${R.gap.toFixed(2)}, loss ${R.loss.toFixed(3)}.</b> The policy has moved towards the chosen reply, relative to where it started.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two copies', home: true, say: 'One model is copied. The reference is frozen, and the policy will learn. Each scores two replies to one prompt from a Kinyarwanda advice bot.', act: m => m.set({ steps: 0, beta: 10, frozen: true, mask: true }) },
    { t: 'The score', home: true, say: 'How much more does the policy prefer chosen over rejected, compared with the reference?', act: m => m.set({ steps: 10, beta: 10, frozen: true, mask: true }) },
    { t: 'The loss', home: true, say: 'Negative log of a sigmoid of that score. Gradient steps push chosen up and rejected down.', act: m => m.set({ steps: 40, beta: 10, frozen: true, mask: true }) },
    { t: 'Frozen', home: true, say: 'Let the reference train, and the target moves with you. The gap stays at nothing.', act: m => m.set({ steps: 40, beta: 10, frozen: false, mask: true }) },
    { t: 'Mask the prompt', home: true, say: 'The prompt is the same in both. Count only the replies.', act: m => m.set({ steps: 40, beta: 10, frozen: true, mask: false }) },
    { t: 'No stopping point', home: true, say: 'The gap can keep growing. Stop by held-out quality.', act: m => m.set({ steps: 120, beta: 30, frozen: true, mask: true }) },
  ],
  check: [
    { q: 'Why freeze the reference?', options: ['It is the fixed point to measure from', 'To save memory only', 'It trains too fast'], answer: 0, why: 'Otherwise the gap can\'t grow.', hint: 'Try Let the reference train too.' },
    { q: 'What goes inside the sigmoid?', options: ['β times the difference of log-ratios', 'The prompt', 'The learning rate'], answer: 0, why: 'Policy versus reference.', hint: 'See The loss.' },
    { q: 'Why mask prompt tokens?', options: ['They are the same in both replies', 'They are secret', 'They cost more'], answer: 0, why: 'Only replies differ.', hint: 'Try Count the prompt tokens.' },
  ],
  terms: [['Reference model', 'A frozen copy.'], ['Policy', 'The copy that trains.'], ['Log-ratio', 'Log-probability difference.'], ['β', 'A scale on the score.'], ['Preference pair', 'A chosen and a rejected reply.']],
  deeper: '<p><b>In a batch.</b> Real training averages this loss over many pairs.</p><p><b>Earlier lessons</b> compare DPO with its family. This one writes it out.</p><p><b>One pair</b> is stepped here with a simplified gradient.</p>',
  code: {
    title: 'The loss',
    note: 'Adapted from the course\'s implementation (code/main.py).',
    text: `
def dpo_loss(policy, ref, batch, beta=0.1):
    pc, pr = logp(policy, batch.chosen), logp(policy, batch.rejected)
    with torch.no_grad():
        rc, rr = logp(ref, batch.chosen), logp(ref, batch.rejected)
    return -F.logsigmoid(beta * ((pc - pr) - (rc - rr))).mean()
`,
  },
};
