// The DPO family (phase 18, lesson 3): eight preference pairs from a Hausa writing assistant, with noisy labels on two. Each loss is really stepped: the gap between chosen and rejected log-ratios grows by the loss's gradient.
// DPO keeps pushing, even on a mislabelled pair. IPO aims at a fixed gap. KTO has no pairs at all, and suffers when its good/bad split is unbalanced. Towers show the learned gaps. Over-optimising remains possible.
const PAIRS = 8, NOISE = [2, 6], STR = [1, 1, 1, 1, 1, 1, 1, 1];
function step(g, o, wrong) {
  const sign = wrong ? -1 : 1, x = g * sign;
  if (o.loss === 'dpo') return 0.16 * sign / (1 + Math.exp(x * 0.5));
  if (o.loss === 'ipo') return 0.2 * (o.target * sign - g);
  const w = o.bal ? 1 : 0.35;
  return 0.16 * sign * w / (1 + Math.exp(x * 0.5));
}
function run(o) {
  const g = Array(PAIRS).fill(0).map((_, i) => { let v = 0.1 * (i % 3); const wrong = NOISE.includes(i) && o.noisy; for (let t = 0; t < o.steps; t++) v += step(v, o, wrong); return v; });
  const clean = g.filter((v, i) => !NOISE.includes(i));
  const over = Math.max(...g.map(Math.abs)), mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const wrongPull = o.noisy ? g.filter((v, i) => NOISE.includes(i)).reduce((a, b) => a + b, 0) / 2 : 0;
  return { g, over, mean, wrongPull };
}

export default {
  slug: 'direct-preference-optimization-family',
  title: 'The DPO family: one loss, several repairs',
  description: 'DPO drops the reward model and keeps pushing. See what each variant repairs, on real training steps.',
  overview: 'RLHF needs a reward model. DPO noticed that the best policy defines its own reward, so the partition function cancels and you can train on preference pairs directly. Then the family grew, as each variant repairs something. IPO notes DPO has no resting point: its loss keeps pushing the gap between chosen and rejected, even on a noisy label, so IPO targets a fixed gap instead. KTO drops pairs altogether, taking only thumbs-up or thumbs-down, which suits real product logs. SimPO, ORPO and BPO change the reference or the normaliser. Removing the reward model doesn\'t end the problem, though: these methods can over-optimise too. Here each loss is stepped live.',
  keywords: ['DPO', 'IPO', 'KTO', 'preference tuning', 'over-optimization', 'alignment'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.05, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { loss: 'ipo', steps: 40, noisy: true, target: 2, bal: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.75 + i * 0.5;
    const T = Array.from({ length: PAIRS }, (_, i) => { const t = add(P.tower(0.36, 0.5, NOISE.includes(i) ? BAD : GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const line = new S.THREE.Mesh(new S.THREE.BoxGeometry(4.2, 0.03, 0.72), new S.THREE.MeshLambertMaterial({ color: SAF, transparent: true, opacity: 0.45, depthWrite: false })); line.userData.noMask = true; line.userData.noFit = true; S.add(line);
    S.add(P.keep(-2.3, 2.3, 1.4, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const K = 0.26;
      R.g.forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, Math.abs(v) * K), color: v < 0 ? '#B5462F' : NOISE.includes(i) && st.noisy ? BAD : GOOD }));
      line.position.set(0, 0.03 + st.target * K, -0.1); line.visible = st.loss === 'ipo';
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const LK = ['dpo', 'ipo', 'kto'];
    const controls = [
      { type: 'buttons', label: 'Loss', options: ['DPO', 'IPO', 'KTO'], get: () => LK.indexOf(st.loss), act: i => set({ loss: LK[i] }) },
      { type: 'slider', label: 'Training steps', min: 0, max: 200, step: 5, get: () => st.steps, set: v => set({ steps: v }) },
      { type: 'toggle', label: 'Two labels are wrong', short: 'Noisy labels', get: () => st.noisy, set: v => set({ noisy: !!v }) },
      { type: 'slider', label: 'IPO target gap', min: 0.5, max: 4, step: 0.5, get: () => st.target, set: v => set({ target: v }) },
      { type: 'toggle', label: 'KTO data is balanced', short: 'Balanced', get: () => st.bal, set: v => set({ bal: !!v }) },
    ];
    const readouts = [
      { label: 'Gap on good pairs', get: () => ({ v: R.mean.toFixed(2), sub: 'chosen over rejected', good: R.mean > 1 && R.mean < 3.5, bad: R.mean > 5 }) },
      { label: 'Largest gap', get: () => ({ v: R.over.toFixed(2), sub: 'over-optimising shows here', bad: R.over > 5 }) },
      { label: 'Pull on wrong labels', get: () => ({ v: R.wrongPull.toFixed(2), sub: st.noisy ? 'negative: it learned the mistake' : 'no noise', bad: R.wrongPull < -1 }) },
    ];
    const labels = [
      { name: 't', t: 'Gap on each pair', d: 'Coral: a mislabelled pair', icon: 'target', atV: V(X(0) - 0.2, 0.2, -0.05) },
      { name: 'l', t: 'Amber plane', d: 'IPO aims at this gap', icon: 'scale', atV: V(X(7) + 0.2, 0.2, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Train DPO for a long time', hint: 'no resting point', on: () => set({ ...D0, loss: 'dpo', steps: 200 }), off: reset },
      { label: 'Wrong labels under DPO', hint: 'it learns those too', on: () => set({ ...D0, loss: 'dpo', steps: 120 }), off: reset },
      { label: 'Unbalanced thumbs under KTO', hint: 'mostly thumbs-up', on: () => set({ ...D0, loss: 'kto', bal: false, steps: 40 }), off: reset },
    ];
    function status() {
      if (st.loss === 'dpo' && R.over > 4) return { ok: false, msg: `<b>The gap reached ${R.over.toFixed(1)} and is still growing.</b> DPO's loss has no resting point, so it keeps pushing past any useful gap${st.noisy ? `, and it learned the wrong labels at ${R.wrongPull.toFixed(1)}` : ''}. Stop early, or use a loss with a target.` };
      if (st.loss === 'ipo') return { ok: true, msg: `<b>Every gap settled at size ${st.target}, and wrong labels stopped there too.</b> IPO aims at a fixed gap, so a mislabelled pair can\'t run away. Note it also treats strong and weak preferences alike.` };
      if (st.loss === 'kto') return { ok: st.bal, msg: st.bal ? `<b>A gap of ${R.mean.toFixed(2)} from thumbs alone.</b> KTO needs no pairs, which fits real product logs.` : `<b>Only ${R.mean.toFixed(2)}: lopsided thumbs starve the loss.</b> KTO weights each side by its share. Balance the classes, or set the weights by hand.` };
      return { ok: true, msg: `<b>A gap of ${R.mean.toFixed(2)} after ${st.steps} steps.</b> This is the easy part of DPO's curve. Keep watching the gap, not just the loss.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No reward model', home: true, say: 'A Hausa writing assistant is tuned on preference pairs. DPO needs no reward model: each pair pushes chosen over rejected.', act: m => m.set({ loss: 'dpo', steps: 40, noisy: false, target: 2, bal: true }) },
    { t: 'No resting point', home: true, say: 'Keep training, and the gaps keep growing. The loss never says stop.', act: m => m.set({ loss: 'dpo', steps: 200, noisy: false, target: 2, bal: true }) },
    { t: 'Wrong labels', home: true, say: 'Two pairs were labelled wrongly. DPO learns those too, pushing them the wrong way just as hard.', act: m => m.set({ loss: 'dpo', steps: 120, noisy: true, target: 2, bal: true }) },
    { t: 'IPO', home: true, say: 'IPO aims at a fixed gap. Gaps rise to the plane and stop, and noise can\'t run away.', act: m => m.set({ loss: 'ipo', steps: 40, noisy: true, target: 2, bal: true }) },
    { t: 'KTO', home: true, say: 'Real products rarely have pairs, just thumbs up or down. KTO works from those, if they are balanced.', act: m => m.set({ loss: 'kto', steps: 40, noisy: false, target: 2, bal: false }) },
    { t: 'Still over-optimises', home: true, say: 'Dropping the reward model doesn\'t end the problem. Every family member can over-fit its signal. Keep watching.', act: m => m.set({ loss: 'kto', steps: 120, noisy: false, target: 2, bal: true }) },
  ],
  check: [
    { q: 'What does IPO repair in DPO?', options: ['The lack of a resting point', 'The need for GPUs', 'The tokenizer'], answer: 0, why: 'It aims at a fixed gap.', hint: 'Compare DPO and IPO.' },
    { q: 'Why is KTO useful in products?', options: ['It works from thumbs, not pairs', 'It needs no data', 'It is always best'], answer: 0, why: 'Product logs are rarely paired.', hint: 'Choose KTO.' },
    { q: 'Does dropping the reward model stop over-optimisation?', options: ['No', 'Yes, always', 'Only with IPO'], answer: 0, why: 'These losses can over-fit as well.', hint: 'See Still over-optimises.' },
  ],
  terms: [
    ['DPO', 'Direct preference optimisation, trained on pairs.'],
    ['Implicit reward gap', 'The log-ratio difference between chosen and rejected.'],
    ['IPO', 'A variant with a fixed target gap.'],
    ['KTO', 'A variant using thumbs, not pairs.'],
    ['Over-optimisation', 'Pushing a signal past where it is useful.'],
    ['Preference strength', 'How much better one reply really is.'],
  ],
  deeper: '<p><b>The derivation.</b> The RLHF optimum defines reward by the ratio of policy to reference. Substitute that into the preference likelihood and the partition function cancels.</p><p><b>Others.</b> SimPO changes the reference. ORPO joins preference with supervised tuning. BPO adds a norm. Each trades one issue for another.</p><p><b>This run.</b> Each tower is stepped by a simplified gradient of its loss, to show how they behave.</p>',
  code: {
    title: 'Two losses',
    note: 'Adapted from the course\'s DPO family sketch (code/main.py).',
    text: `
def dpo(gap, beta=0.1):
    return -log_sigmoid(gap / beta)              # always pushes further

def ipo(gap, target=2.0):
    return (gap - target) ** 2                   # stops at the target

gap = (logp_chosen - ref_chosen) - (logp_rejected - ref_rejected)
`,
  },
};
