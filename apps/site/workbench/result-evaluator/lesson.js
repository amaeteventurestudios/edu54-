// Result evaluator (phase 19, lesson 53): a Kumasi lab compares a candidate with a baseline over seeds. A real paired t statistic is computed from per-seed scores. Effect size and significance both matter. Direction-aware: lower loss is better. Towers per seed show each pair.
const BASE = [71, 69, 73, 70, 72, 68, 71, 70];
function run(o) {
  const n = o.seeds, diff = BASE.slice(0, n).map((b, i) => o.effect + ((i * 37) % 7 - 3) * o.noise);
  const m = diff.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(diff.reduce((a, v) => a + (v - m) ** 2, 0) / Math.max(1, n - 1)), t = sd > 0 ? m / (sd / Math.sqrt(n)) : 0;
  const crit = { 2: 12.7, 3: 4.3, 4: 3.18, 5: 2.78, 6: 2.57, 7: 2.45, 8: 2.36 }[n];
  const sig = Math.abs(t) > crit, big = Math.abs(m) >= o.th, better = o.dir === 'high' ? m > 0 : m < 0;
  return { diff, m, t, crit, sig, big, better, verdict: sig && big && better ? 'better' : sig && !better ? 'worse' : 'no call' };
}

export default {
  slug: 'result-evaluator',
  title: 'A result evaluator: real, and big enough to matter?',
  description: 'A run looks better than the baseline. A paired test over seeds says if it\'s real, and a threshold says if it counts.',
  overview: 'One run beat the baseline. Is that real? Run several seeds, pair each with the baseline on the same seed, and test the differences. A paired t test reads the mean difference against its noise. Then check the size, as a tiny real gain may not be worth having. Be direction-aware: higher is better for accuracy, and lower for loss. The output is a verdict per hypothesis for the loop to act on. This lesson computes a real t statistic from per-seed scores, for a lab in Kumasi.',
  keywords: ['t-test', 'statistical significance', 'effect size', 'experiment evaluation', 'seeds', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { seeds: 8, effect: 1.5, noise: 0.5, th: 1, dir: 'high' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.45;
    const T = BASE.map((b, i) => { const a = add(P.tower(0.17, 0.3, '#8E91A3')), c = add(P.tower(0.17, 0.3, GOOD)); a.position.set(X(i) - 0.1, 0.03, -0.1); c.position.set(X(i) + 0.1, 0.03, -0.1); a.userData.set({ cap: '' }); c.userData.set({ cap: '' }); return { a, c }; });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.13 })); lamp.position.set(2.0, 0.03, 0);
    S.add(P.keep(-2.35, 2.35, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach(({ a, c }, i) => { const on = i < st.seeds; a.visible = on; c.visible = on; if (on) { a.userData.set({ h: (BASE[i] - 60) * 0.06 }); c.userData.set({ h: Math.max(0.03, (BASE[i] + R.diff[i] - 60) * 0.06), color: R.diff[i] > 0 ? GOOD : BAD }); } });
      lamp.userData.set({ color: R.verdict === 'better' ? '#3E9B5F' : R.verdict === 'worse' ? '#D9483B' : '#E3A72F', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const DK = ['high', 'low'];
    const controls = [
      { type: 'slider', label: 'Seeds', min: 2, max: 8, step: 1, get: () => st.seeds, set: v => set({ seeds: v }) },
      { type: 'slider', label: 'True effect', min: -2, max: 3, step: 0.1, get: () => st.effect, set: v => set({ effect: v }) },
      { type: 'slider', label: 'Noise', min: 0.1, max: 2, step: 0.1, get: () => st.noise, set: v => set({ noise: v }) },
      { type: 'slider', label: 'Smallest gain worth having', min: 0, max: 2, step: 0.1, get: () => st.th, set: v => set({ th: v }) },
      { type: 'buttons', label: 'Better is', options: ['Higher', 'Lower'], get: () => DK.indexOf(st.dir), act: i => set({ dir: DK[i] }) },
    ];
    const readouts = [
      { label: 'Mean gain', get: () => ({ v: R.m.toFixed(2), sub: `need ${st.th.toFixed(1)}`, good: R.big && R.better }) },
      { label: 't statistic', get: () => ({ v: R.t.toFixed(2), sub: `needs ${R.crit} for p < 0.05`, good: R.sig }) },
      { label: 'Verdict', get: () => ({ v: R.verdict, good: R.verdict === 'better', bad: R.verdict === 'worse' }) },
    ];
    const labels = [
      { name: 't', t: 'Baseline, then candidate', d: 'One pair per seed', icon: 'scale', atV: V(X(0) - 0.2, 0.2, -0.1) },
      { name: 'l', t: 'The verdict', d: 'Gold: can\'t say', icon: 'check', atV: V(2.25, 0.6, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Decide from two seeds', hint: 'noise wins', on: () => set({ ...D0, seeds: 2, noise: 1.2 }), off: reset },
      { label: 'Real, but tiny', hint: 'significant is not useful', on: () => set({ ...D0, effect: 0.3, noise: 0.1 }), off: reset },
      { label: 'Lower loss read as higher', hint: 'wrong direction', on: () => set({ ...D0, dir: 'low' }), off: reset },
    ];
    function status() {
      if (st.seeds <= 2) return { ok: false, msg: `<b>t of ${R.t.toFixed(1)} from two seeds.</b> You need ${R.crit}. A single lucky pair proves nothing.` };
      if (R.sig && !R.big) return { ok: false, msg: `<b>Real, and only ${R.m.toFixed(2)}.</b> Significant doesn\'t mean useful. It is below your threshold of ${st.th.toFixed(1)}.` };
      if (st.dir === 'low' && R.m > 0) return { ok: false, msg: '<b>The metric rose, and lower is better.</b> So the candidate got worse. Direction must be stated, not assumed.' };
      if (!R.sig) return { ok: false, msg: `<b>No call: t ${R.t.toFixed(2)} against ${R.crit}.</b> Add seeds, or accept that you can\'t tell.` };
      return { ok: true, msg: `<b>Better: mean gain ${R.m.toFixed(2)}, t ${R.t.toFixed(2)}.</b> Real, and big enough.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One good run', home: true, say: 'A lab in Kumasi has a run that beat the baseline. Luck, or real?', act: m => m.set({ seeds: 2, effect: 1.5, noise: 1.2, th: 1, dir: 'high' }) },
    { t: 'Several seeds', home: true, say: 'Run both on the same seeds, and compare in pairs.', act: m => m.set({ seeds: 8, effect: 1.5, noise: 0.5, th: 1, dir: 'high' }) },
    { t: 'A paired test', home: true, say: 'The t statistic reads the mean difference against its noise.', act: m => m.set({ seeds: 8, effect: 1.5, noise: 0.5, th: 1, dir: 'high' }) },
    { t: 'Big enough?', home: true, say: 'A tiny gain can be real and still not worth keeping.', act: m => m.set({ seeds: 8, effect: 0.3, noise: 0.1, th: 1, dir: 'high' }) },
    { t: 'Direction', home: true, say: 'For loss, lower is better. State it, so a rise isn\'t read as progress.', act: m => m.set({ seeds: 8, effect: 1.5, noise: 0.5, th: 1, dir: 'low' }) },
    { t: 'A verdict', home: true, say: 'Better, worse or no call. The loop acts on that word.', act: m => m.set({ seeds: 8, effect: 1.5, noise: 0.5, th: 1, dir: 'high' }) },
  ],
  check: [
    { q: 'Why pair by seed?', options: ['It removes shared noise', 'It is faster', 'To save data'], answer: 0, why: 'Each seed compares with itself.', hint: 'See Several seeds.' },
    { q: 'Does significant mean useful?', options: ['No', 'Always', 'Only with many seeds'], answer: 0, why: 'Size matters too.', hint: 'Try Real, but tiny.' },
    { q: 'Why state direction?', options: ['For loss, lower is better', 'For style', 'It sets the seed'], answer: 0, why: 'A rise can be a fall in quality.', hint: 'Try Lower loss read as higher.' },
  ],
  terms: [['Paired test', 'Comparing matched results.'], ['t statistic', 'Mean difference over its noise.'], ['Effect size', 'How big a change is.'], ['Seed', 'A fixed random start.']],
  deeper: '<p><b>Many tests.</b> Testing many hypotheses raises false positives, so correct for that.</p><p><b>Report the verdict and the numbers.</b></p><p><b>The t value</b> is really computed from the pairs.</p>',
  code: {
    title: 'A paired t',
    note: 'Adapted from the course\'s evaluator (code/main.py).',
    text: `
def paired_t(a, b):
    d = [x - y for x, y in zip(a, b)]
    mean = sum(d) / len(d)
    var = sum((x - mean) ** 2 for x in d) / (len(d) - 1)
    return mean / math.sqrt(var / len(d))
`,
  },
};
