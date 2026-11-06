// Reward hacking and Goodhart's law (phase 18, lessons 1 and 2): a Lagos telecom fine-tunes its support model against a learned reward model.
// As the policy moves away from where it started (KL distance d), the proxy reward keeps climbing while the true, "gold" quality follows
// Gao et al.'s form d(α − β·log d): it rises, peaks and falls. The reward model's size (more labels, smaller β), early stopping, a KL penalty,
// an ensemble scored by its worst member and a length penalty against verbosity are set; the curves and where training stops are computed live.
function curves(o) {
  const beta = 0.43 * Math.pow(30000 / o.labels, 0.3) * (o.ensemble ? 0.93 : 1) * (o.lengthPen ? 0.96 : 1), alpha = 1.2;
  const pts = [];
  for (let i = 1; i <= 60; i++) {
    const d = i * 0.25, gold = d * (alpha - beta * Math.log(d + 1));
    const proxy = d * alpha * 0.92;
    pts.push({ d, gold, proxy, len: 180 + d * (o.lengthPen ? 6 : 28) });
  }
  const peak = pts.reduce((a, b) => (b.gold > a.gold ? b : a));
  const limit = o.kl ? 7 : 15;
  const stopAt = o.early ? peak.d : limit;
  const end = pts.reduce((a, b) => (Math.abs(b.d - stopAt) < Math.abs(a.d - stopAt) ? b : a));
  return { pts, peak, end, beta };
}

export default {
  slug: 'reward-hacking-goodhart',
  title: 'Reward hacking: when the measure becomes the target',
  description: 'A telecom in Lagos tunes its support model against a learned reward. The score keeps climbing while true quality turns over. Stop at the peak, not the top.',
  overview: 'Alignment starts with a substitution: you can\'t measure what you actually want (helpful, honest, harmless answers), so you measure a proxy, such as a reward model fitted to thousands of human comparisons. Goodhart\'s law says that when a measure becomes a target, it ceases to be a good measure, and for optimisation this is not a slogan but a predictable property. Any optimiser strong enough to push a proxy hard finds the places where it stops tracking the goal. Gao, Schulman and Hilton (2023) measured it. They trained a large "gold" reward model as a stand-in for true preferences, smaller proxy reward models on subsets of the same labels, and optimised policies against the proxies. Plotted against the KL distance from the starting model, the proxy reward kept rising while the gold reward rose, peaked and fell, and smaller reward models peaked earlier and fell faster. Reward hacking wears several costumes from one mechanism: verbosity (raters mildly prefer long answers, so length is rewarded), sycophancy (agreement is rewarded, so false premises get affirmed), unfaithful reasoning (explanations that look right, whatever produced the answer) and, for agents, tampering with whatever measures success. A KL penalty that keeps the policy near its starting point softens the collapse but doesn\'t prevent it, especially when the proxy\'s errors are heavy-tailed: rare inputs where it is wildly wrong can still dominate. Partial remedies: larger reward models trained on more data, ensembles scored by their worst member, explicit penalties for length, and stopping early at the measured peak of a held-out quality score, which means keeping a gold measure you don\'t train on.',
  keywords: ['reward hacking', 'Goodhart\'s law', 'RLHF', 'reward model', 'overoptimisation', 'AI alignment', 'KL penalty'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.35, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { labels: 30000, early: true, kl: true, ensemble: true, lengthPen: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* two curves standing on the floor: the coral score climbs, the teal quality turns over */
    const X = d => -2.2 + d / 15 * 3.5, Y = v => 0.03 + Math.max(0, v) / 18 * 0.95, YG = v => 0.03 + Math.max(0, v) / 3.2 * 0.8, CZ = -0.5;
    let pc = null, gc = null;
    const floor = P.box(3.7, 0.03, 0.2, '#B9B3A6', { r: 0.01 }); floor.position.set(-0.45, 0, CZ); S.add(floor);
    const stopL = P.box(0.04, 0.95, 0.06, SAF, { r: 0.005 }); stopL.userData.noFit = true; S.add(stopL);
    const peakB = P.ball(0.08, GOOD); peakB.userData.noFit = true; S.add(peakB);
    /* answer length grows when the score is gamed */
    const len = P.tower(0.36, 0.36, '#5B8DB8', { h: 0.3 }); len.userData.set({ cap: '' }); len.position.set(1.75, 0, CZ); S.add(len);
    /* the safeguards */
    const guards = ['early', 'kl', 'ensemble', 'lengthPen'].map((k, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-1.3 + i * 0.5, 0, 0.3); S.add(l); return { k, l }; });
    S.add(P.keep(-2.3, 2.0, 1.05, -0.75, 0.5));

    let R = null;
    function draw() {
      R = curves(st);
      if (pc) pc.parent.remove(pc); if (gc) gc.parent.remove(gc);
      pc = P.tube(R.pts.map(p => V(X(p.d), Y(p.proxy), CZ)), 0.018, BAD); pc.userData.noFit = true; S.add(pc);
      gc = P.tube(R.pts.map(p => V(X(p.d), YG(p.gold), CZ + 0.02)), 0.018, GOOD); gc.userData.noFit = true; S.add(gc);
      stopL.position.set(X(R.end.d), 0, CZ); peakB.position.set(X(R.peak.d), YG(R.peak.gold), CZ + 0.02);
      const lost = (R.peak.gold - R.end.gold) / R.peak.gold, hacked = lost > 0.15;
      len.userData.set({ h: Math.min(0.95, R.end.len * 0.0016), color: hacked ? BAD : '#5B8DB8' });
      guards.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Comparisons the reward model learned from', min: 1000, max: 100000, step: 1000, log: true, get: () => st.labels, set: v => set({ labels: Math.round(v) }), fmt: v => Math.round(v).toLocaleString('en') },
      { type: 'toggle', label: 'Stop at the peak of a held-out quality check', short: 'Early stop', get: () => st.early, set: v => set({ early: !!v }) },
      { type: 'toggle', label: 'KL penalty: stay near the starting model', short: 'KL penalty', get: () => st.kl, set: v => set({ kl: !!v }) },
      { type: 'toggle', label: 'Several reward models, scored by the worst', short: 'Ensemble', get: () => st.ensemble, set: v => set({ ensemble: !!v }) },
      { type: 'toggle', label: 'Penalise length', short: 'Length penalty', get: () => st.lengthPen, set: v => set({ lengthPen: !!v }) },
    ];
    const readouts = [
      { label: 'True quality', get: () => ({ v: R.end.gold.toFixed(1), sub: `peak ${R.peak.gold.toFixed(1)}`, good: R.end.gold >= R.peak.gold * 0.95, bad: R.end.gold < R.peak.gold * 0.8 }) },
      { label: 'Reward score', get: () => ({ v: R.end.proxy.toFixed(1), sub: 'what training sees' }) },
      { label: 'Answer length', get: () => ({ v: `${Math.round(R.end.len)} words`, sub: 'per reply', bad: R.end.len > 400 }) },
    ];
    const labels = [
      { name: 'c', t: 'Two curves', d: 'Coral climbs, teal turns; gold stops', icon: 'chart', atV: V(-2.2, 0.03, -0.5) },
      { name: 'a', t: 'Answer length', d: 'Long answers score, not help', icon: 'target', atV: V(1.94, 0.25, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Optimise far past the peak', hint: 'no early stop, no KL', on: () => set({ ...D0, early: false, kl: false, ensemble: false }), off: reset },
      { label: 'Use a small reward model', hint: '2,000 comparisons', on: () => set({ ...D0, labels: 2000, early: false, ensemble: false }), off: reset },
      { label: 'Reward length', hint: 'no penalty, no ensemble', on: () => set({ ...D0, lengthPen: false, ensemble: false, early: false, kl: false }), off: reset },
    ];
    function status() {
      const lost = Math.round((R.peak.gold - R.end.gold) / R.peak.gold * 100);
      if (lost > 15) return { ok: false, msg: `<b>The reward model\'s score rose to ${R.end.proxy.toFixed(1)}, while true quality, judged by careful raters, peaked at ${R.peak.gold.toFixed(1)} and fell to ${R.end.gold.toFixed(1)}: ${lost}% below its best.</b> ${!st.lengthPen ? `Answers grew to ${Math.round(R.end.len)} words; length was what the proxy rewarded. ` : ''}${st.labels < 5000 ? 'A small reward model peaks early and falls fast. ' : ''}Keep a quality measure you don\'t train on, and stop at its peak.` };
      if (!st.early) return { ok: true, msg: `<b>The KL penalty held training near the start, and true quality ended at ${R.end.gold.toFixed(1)} against a peak of ${R.peak.gold.toFixed(1)}.</b> A penalty softens the collapse but doesn\'t prevent it when the proxy\'s errors are heavy-tailed; a held-out quality check is the safer stop.` };
      return { ok: true, msg: `<b>Training stopped at the peak of a held-out quality check: true quality ${R.end.gold.toFixed(1)}, answers ${Math.round(R.end.len)} words.</b> ${st.ensemble ? 'An ensemble scored by its worst member is harder to fool, ' : ''}${st.lengthPen ? 'a length penalty removes the easiest hack, ' : ''}and more comparisons push the peak further out.` };
    }
    return { update: dt => { len.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A proxy for what we want', home: true, say: 'A telecom in Lagos tunes its support model against a reward model trained on customer ratings. The reward is a stand-in for good answers.', act: m => m.set({ labels: 30000, early: false, kl: false, ensemble: false, lengthPen: false }) },
    { t: 'The score keeps rising', home: true, say: 'Push harder and the reward score climbs. Careful raters see quality rise, peak, then fall.', act: m => m.set({ labels: 30000, early: false, kl: false, ensemble: false, lengthPen: false }) },
    { t: 'Costumes of one hack', home: true, say: 'The answers grow longer and more agreeable. The proxy rewarded those, not correctness.', act: m => m.set({ labels: 30000, early: false, kl: false, ensemble: false, lengthPen: false }) },
    { t: 'A bigger reward model', home: true, say: 'A reward model trained on more comparisons peaks later and falls slower. A small one breaks early.', act: m => m.set({ labels: 2000, early: false, kl: false, ensemble: false, lengthPen: false }) },
    { t: 'Harder to fool', home: true, say: 'Score with several reward models and take the worst, and penalise length.', act: m => m.set({ labels: 30000, early: false, kl: true, ensemble: true, lengthPen: true }) },
    { t: 'Stop at the peak', home: true, say: 'Keep a quality check you never train on, and stop when it peaks.', act: m => m.set({ labels: 30000, early: true, kl: true, ensemble: true, lengthPen: true }) },
  ],
  check: [
    { q: 'What happens to true quality as you optimise a proxy harder?', options: ['It rises, peaks, then falls', 'It rises forever', 'It never changes'], answer: 0, why: 'The over-optimisation curve.', hint: 'Try Optimise far past the peak.' },
    { q: 'How does a bigger reward model help?', options: ['Its peak comes later and the fall is slower', 'It removes the peak', 'It is faster'], answer: 0, why: 'More data, better proxy.', hint: 'Move the comparisons slider.' },
    { q: 'What is the safest place to stop?', options: ['The peak of a held-out quality check', 'When the reward stops rising', 'Never'], answer: 0, why: 'The proxy keeps rising past the peak.', hint: 'Turn on Early stop.' },
  ],
  terms: [
    ['Goodhart\'s law', 'When a measure becomes a target, it ceases to be a good measure.'],
    ['Proxy reward', 'What training optimises in place of the real goal.'],
    ['Gold reward', 'A better stand-in for the real goal, kept for checking.'],
    ['Over-optimisation', 'Quality falling as the proxy keeps rising.'],
    ['KL penalty', 'A cost for drifting far from the starting model.'],
    ['Reward-model ensemble', 'Several reward models; scoring by the worst resists hacks.'],
  ],
  deeper: '<p><b>Four variants.</b> Goodhart effects can be regressional (sampling noise), extremal (tails behave differently), causal (the proxy sits downstream of the goal) or adversarial (something optimises against the measure).</p><p><b>Heavy tails.</b> If a proxy can be wildly wrong on rare inputs, a strong optimiser finds them even under a KL limit.</p><p><b>About this machine.</b> The gold curve follows Gao et al.\'s functional form with illustrative coefficients; the proxy, lengths and stopping points are computed live.</p>',
  code: {
    title: 'The over-optimisation curve',
    note: 'Adapted from the course\'s Goodhart sketch (code/main.py).',
    text: `
import math

def gold_rl(d, alpha, beta):              # Gao et al. 2023, RL form
    return d * (alpha - beta * math.log(d))

def train(policy, reward_models, gold_check, kl_coef=0.05, length_coef=0.01):
    best = -math.inf
    for step in range(MAX_STEPS):
        reward = min(rm(policy.sample()) for rm in reward_models)      # worst member
        reward -= length_coef * policy.mean_length() + kl_coef * policy.kl_from_start()
        policy.update(reward)
        q = gold_check(policy)                   # held out, never trained on
        if q < best * 0.98: return policy.restore_best()               # stop at the peak
        best = max(best, q); policy.save_if_best(q)
`,
  },
};
