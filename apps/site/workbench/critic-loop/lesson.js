// Critic loop (phase 19, lesson 55): a draft is scored on five dimensions and revised by a structured diff. The loop stops on target, on plateau, or at a budget. Real round-by-round scores: each round closes a share of the gap to a ceiling. A Kano lab's paper.
const DIM = ['Clarity', 'Novelty', 'Evidence', 'Method', 'Related'];
const START = [5, 4, 6, 5, 3], CEIL = [9, 6, 8, 8, 8];
function run(o) {
  const s = START.slice(); const rows = [s.slice()]; let why = 'budget', r = 0;
  for (r = 1; r <= o.max; r++) {
    const prev = s.reduce((a, b) => a + b, 0);
    s.forEach((v, i) => { s[i] = v + (CEIL[i] - v) * (o.diff ? 0.45 : 0.15) * (o.free && i === 0 ? 0.5 : 1); });
    rows.push(s.map(v => +v.toFixed(1)));
    const now = s.reduce((a, b) => a + b, 0);
    if (now >= o.target * 5) { why = 'target'; break; }
    if (o.plateau && now - prev < 0.6) { why = 'plateau'; break; }
  }
  return { s, rows, why, rounds: Math.min(r, o.max), total: s.reduce((a, b) => a + b, 0) / 5 };
}

export default {
  slug: 'critic-loop',
  title: 'A critic loop: revise, measure, know when to stop',
  description: 'Score a draft on five axes, revise, repeat. Stop on target, on a plateau, or when the budget runs out.',
  overview: 'A critic improves a draft only if you can say what improved. Score each round on fixed dimensions: clarity, novelty, evidence, method, related work. Apply critique as a structured revision, not a free rewrite, so that a good section isn\'t lost. Then detect when to stop: the target is met, scores have plateaued, or the budget is gone. Without that, loops run on, churn text and burn money. Novelty has a ceiling, too: a critic can\'t edit a result into being new. This runs round by round on a paper from a lab in Kano.',
  keywords: ['critic loop', 'revision', 'convergence', 'research agent', 'stopping rule', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { max: 6, target: 7.8, plateau: true, diff: true, free: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.75;
    const T = DIM.map((d, i) => { const a = add(P.tower(0.3, 0.45, '#BFB8A8')), b = add(P.tower(0.3, 0.45, GOOD)); a.position.set(X(i) - 0.17, 0.03, -0.1); b.position.set(X(i) + 0.17, 0.03, -0.1); a.userData.set({ cap: '', h: START[i] * 0.12 }); b.userData.set({ cap: '' }); return b; });
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.0, 0.03, 0.35);
    const round = add(P.stack(0.42, 0.34, 0.09, { max: 8, color: SAF })); round.position.set(2.0, 0.03, -0.35);
    S.add(P.keep(-2.35, 2.35, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => t.userData.set({ h: R.s[i] * 0.12 })); round.userData.set({ n: R.rounds, colors: Array(8).fill(SAF) }); lamp.userData.set({ color: R.why === 'budget' ? '#E3A72F' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Most rounds', min: 1, max: 8, step: 1, get: () => st.max, set: v => set({ max: v }) },
      { type: 'slider', label: 'Target average', min: 6, max: 9, step: 0.1, get: () => st.target, set: v => set({ target: v }) },
      tg('plateau', 'Stop on a plateau', 'Plateau stop'), tg('diff', 'Revise by a structured diff', 'Diffs'), tg('free', 'Allow free rewrites too', 'Free rewrite'),
    ];
    const readouts = [
      { label: 'Average score', get: () => ({ v: R.total.toFixed(1), sub: `target ${st.target.toFixed(1)}`, good: R.total >= st.target }) },
      { label: 'Rounds', get: () => ({ v: `${R.rounds}`, sub: `stopped: ${R.why}` }) },
      { label: 'Weakest', get: () => { const m = Math.min(...R.s); return { v: DIM[R.s.indexOf(m)], sub: m.toFixed(1) }; } },
    ];
    const labels = [
      { name: 't', t: 'Five scores', d: 'Grey: first draft', icon: 'target', atV: V(X(0) - 0.32, 0.15, -0.1) },
      { name: 'r', t: 'Rounds used', d: 'Lamp: stopped for a good reason', icon: 'check', atV: V(2.25, 0.15, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No stopping rule', hint: 'it keeps churning', on: () => set({ ...D0, plateau: false, target: 9, max: 8 }), off: reset },
      { label: 'Free rewrites', hint: 'good parts lost', on: () => set({ ...D0, diff: false, free: true }), off: reset },
      { label: 'Chase an impossible target', hint: 'novelty has a ceiling', on: () => set({ ...D0, target: 8.8, plateau: true }), off: reset },
    ];
    function status() {
      if (!st.plateau && R.why === 'budget') return { ok: false, msg: `<b>${R.rounds} rounds, and the last few did almost nothing.</b> Without a plateau rule, you pay for churn.` };
      if (!st.diff) return { ok: false, msg: `<b>Only ${R.total.toFixed(1)} after ${R.rounds} rounds.</b> Free rewrites lose as much as they add. Structured diffs keep what works.` };
      if (st.target > 8) return { ok: false, msg: '<b>The target can\'t be reached: novelty stops near 6.</b> A critic can polish a result, and can\'t make it new.' };
      return { ok: true, msg: `<b>Stopped at round ${R.rounds} (${R.why}), averaging ${R.total.toFixed(1)}.</b> ${DIM[R.s.indexOf(Math.min(...R.s))]} stays weakest.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five scores', home: true, say: 'A lab in Kano has a first draft. A critic scores it on clarity, novelty, evidence, method and related work.', act: m => m.set({ max: 1, target: 7.8, plateau: true, diff: true, free: false }) },
    { t: 'Revise by diff', home: true, say: 'Apply each critique as a small change, not a rewrite.', act: m => m.set({ max: 3, target: 7.8, plateau: true, diff: true, free: false }) },
    { t: 'Free rewrites', home: true, say: 'Rewrite it all each round, and good parts are lost.', act: m => m.set({ max: 6, target: 7.8, plateau: true, diff: false, free: true }) },
    { t: 'Know when to stop', home: true, say: 'Stop on target, on a plateau, or at the budget.', act: m => m.set({ max: 6, target: 7.8, plateau: true, diff: true, free: false }) },
    { t: 'A ceiling', home: true, say: 'Novelty barely moves. Editing can\'t make a result new.', act: m => m.set({ max: 8, target: 8.8, plateau: true, diff: true, free: false }) },
    { t: 'Good enough', home: true, say: 'A loop that stops well is worth more than one that keeps going.', act: m => m.set({ max: 6, target: 7.8, plateau: true, diff: true, free: false }) },
  ],
  check: [
    { q: 'Why revise by structured diff?', options: ['Good parts are kept', 'It uses fewer words', 'It looks formal'], answer: 0, why: 'Rewrites lose as much as they add.', hint: 'Try Free rewrites.' },
    { q: 'What are the three stops?', options: ['Target, plateau, budget', 'Red, amber, green', 'Start, middle, end'], answer: 0, why: 'Each is a named reason.', hint: 'See Know when to stop.' },
    { q: 'What can a critic not change?', options: ['How new the result is', 'Clarity', 'References'], answer: 0, why: 'Novelty comes from the work.', hint: 'Try Chase an impossible target.' },
  ],
  terms: [['Critic', 'A reviewer role.'], ['Dimension', 'One fixed thing scored.'], ['Plateau', 'Scores no longer rising.'], ['Convergence', 'Settling on a result.']],
  deeper: '<p><b>Same critic each round.</b> Keep the rubric fixed, so that scores compare.</p><p><b>Reviewer lessons</b> earlier use the same idea for code.</p><p><b>Scores</b> follow a simple close-the-gap rule.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s critic (code/main.py).',
    text: `
for round in range(MAX_ROUNDS):
    scores = critic(draft)
    if mean(scores) >= TARGET or plateaued(history, scores):
        break
    draft = apply_diff(draft, critic.diff(draft, scores))
    history.append(scores)
`,
  },
};
