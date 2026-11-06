// Leaderboard aggregation (phase 19, lesson 74): four models, four tasks, mixed scales, for a Lusaka team. Raw averages let the largest scale dominate; normalising fixes that. Mean and win rate can rank differently. A real seeded bootstrap gives a confidence interval: when intervals overlap, the top two are a tie.
const S0 = { A: [0.82, 0.71, 34, 0.55], B: [0.8, 0.7, 41, 0.53], C: [0.6, 0.65, 66, 0.3], D: [0.84, 0.72, 20, 0.57] };
const KS = Object.keys(S0), rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
function run(o) {
  const col = i => KS.map(k => S0[k][i]), norm = i => { const c = col(i), lo = Math.min(...c), hi = Math.max(...c); return c.map(v => (v - lo) / (hi - lo)); };
  const row = KS.map((k, m) => [0, 1, 2, 3].map(i => (o.norm ? norm(i)[m] : S0[k][i])));
  const mean = row.map(r => r.reduce((a, b) => a + b, 0) / 4);
  const wins = KS.map((k, m) => [0, 1, 2, 3].filter(i => S0[k][i] === Math.max(...col(i))).length);
  const score = o.by === 'mean' ? mean : wins, order = KS.map((k, i) => i).sort((a, b) => score[b] - score[a]);
  const r = rng(5), ci = row.map(rw => { const s = []; for (let n = 0; n < 200; n++) { let t = 0; for (let j = 0; j < 4; j++) t += rw[Math.floor(r() * 4)]; s.push(t / 4); } s.sort((a, b) => a - b); return [s[10], s[189]]; });
  const a = order[0], b = order[1], tie = ci[a][0] <= ci[b][1];
  return { mean, wins, score, order, ci, tie };
}

export default {
  slug: 'leaderboard-aggregation',
  title: 'A leaderboard you can trust',
  description: 'Four models, four tasks, mixed scales. Normalise, choose a summary, and admit when the top two are a tie.',
  overview: 'A leaderboard looks simple, and it hides several choices. Scores come on different scales, so a raw mean is decided by the task with the largest numbers. Normalise each task first. Mean rewards steady results, while win rate rewards being best somewhere, and they can disagree. Only a few tasks means a lot of uncertainty, so compute a bootstrap confidence interval. If the top two overlap, say it is a tie. Here four models are ranked live for a team in Lusaka, with a real bootstrap.',
  keywords: ['leaderboard', 'normalisation', 'bootstrap', 'confidence interval', 'evaluation', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { norm: true, by: 'mean', ci: true }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.8 + i * 1.2;
    const T = KS.map(() => { const t = add(P.tower(0.7, 0.6, BLUE)); t.userData.set({ cap: '' }); return t; }); T.forEach((t, i) => t.position.set(X(i), 0.03, -0.1));
    const Bars = KS.map(() => { const b = P.box(0.08, 1, 0.08, '#2C2D31', { r: 0.01 }); b.userData.noFit = true; S.add(b); return b; });
    S.add(P.keep(-2.35, 2.35, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st); const m = Math.max(...R.score, 0.01);
      R.order.forEach((k, i) => { T[i].userData.set({ h: Math.max(0.04, R.score[k] / m * 1.1), color: i === 0 ? (st.ci && R.tie ? SAF : GOOD) : BLUE }); const c = R.ci[k], mm = Math.max(...R.mean, 0.01), b = Bars[i]; b.visible = st.ci && st.by === 'mean' && st.norm; b.position.set(X(i), Math.max(0.03, c[0] / mm * 1.1), 0.25); b.scale.y = Math.max(0.02, (c[1] - c[0]) / mm * 1.1); });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const BK = ['mean', 'wins'];
    const controls = [
      { type: 'toggle', label: 'Normalise each task', short: 'Normalise', get: () => st.norm, set: v => set({ norm: !!v }) },
      { type: 'buttons', label: 'Rank by', options: ['Mean', 'Win rate'], get: () => BK.indexOf(st.by), act: i => set({ by: BK[i] }) },
      { type: 'toggle', label: 'Show confidence intervals', short: 'Intervals', get: () => st.ci, set: v => set({ ci: !!v }) },
    ];
    const readouts = [
      { label: 'Ranking', get: () => ({ v: R.order.map(i => KS[i]).join(' > ') }) },
      { label: 'Top two', get: () => ({ v: R.tie ? 'a tie' : 'separated', sub: 'by bootstrap', good: !R.tie }) },
      { label: 'Decided by', get: () => ({ v: st.norm ? 'all tasks' : 'the largest scale', good: st.norm, bad: !st.norm }) },
    ];
    const labels = [
      { name: 't', t: 'Models, ranked', d: 'Gold: top, but tied', icon: 'target', atV: V(X(0) - 0.35, 0.2, -0.1) },
      { name: 'b', t: 'Black bars', d: 'Confidence intervals', icon: 'scale', atV: V(X(3) + 0.35, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Average raw scores', hint: 'one task swamps the rest', on: () => set({ ...D0, norm: false }), off: reset },
      { label: 'Announce a winner', hint: 'hide the intervals', on: () => set({ ...D0, ci: false }), off: reset },
    ];
    function status() {
      if (!st.norm) return { ok: false, msg: `<b>${KS[R.order[0]]} wins because one task is scored out of 100.</b> Everything else barely counts. Normalise first.` };
      if (!st.ci && R.tie) return { ok: false, msg: `<b>${KS[R.order[0]]} is declared the winner, and the intervals overlap.</b> Four tasks can\'t separate them. Report a tie.` };
      return { ok: true, msg: `<b>${R.order.map(i => KS[i]).join(' > ')}${R.tie ? ', with the top two tied' : ''}.</b> ${st.by === 'wins' ? 'Win rate favours being best somewhere.' : 'Mean favours steady work.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four models', home: true, say: 'A team in Lusaka ranks four models on four tasks, each on its own scale.', act: m => m.set({ norm: false, by: 'mean', ci: false }) },
    { t: 'Normalise', home: true, say: 'A raw mean is decided by the largest scale. Rescale each task first.', act: m => m.set({ norm: true, by: 'mean', ci: false }) },
    { t: 'Mean or wins', home: true, say: 'Mean rewards steadiness. Win rate rewards being best somewhere.', act: m => m.set({ norm: true, by: 'wins', ci: false }) },
    { t: 'How sure?', home: true, say: 'With few tasks, resample them, to see how much a ranking could move.', act: m => m.set({ norm: true, by: 'mean', ci: true }) },
    { t: 'A tie', home: true, say: 'If intervals overlap, say so. Don\'t name a winner.', act: m => m.set({ norm: true, by: 'mean', ci: true }) },
    { t: 'Honest boards', home: true, say: 'A good leaderboard shows its uncertainty.', act: m => m.set({ norm: true, by: 'mean', ci: true }) },
  ],
  check: [
    { q: 'Why normalise?', options: ['Scales differ between tasks', 'To round scores', 'To shrink data'], answer: 0, why: 'Otherwise one task decides.', hint: 'Try Average raw scores.' },
    { q: 'What does a bootstrap do here?', options: ['Resamples tasks to show uncertainty', 'Trains models', 'Sorts names'], answer: 0, why: 'It gives an interval.', hint: 'See How sure?' },
    { q: 'What if intervals overlap?', options: ['Report a tie', 'Pick the higher', 'Run nothing'], answer: 0, why: 'The data can\'t separate them.', hint: 'Try Announce a winner.' },
  ],
  terms: [['Normalise', 'Put on one scale.'], ['Win rate', 'Share of tasks won.'], ['Bootstrap', 'Resampling for uncertainty.'], ['Confidence interval', 'A range of plausible values.']],
  deeper: '<p><b>More tasks</b> shrink intervals.</p><p><b>Weights.</b> Choose task weights in the open.</p><p><b>The bootstrap</b> really runs with a seed.</p>',
  code: {
    title: 'Bootstrap',
    note: 'Adapted from the course\'s aggregation (code/main.py).',
    text: `
def ci(scores, n=1000):
    means = sorted(mean(random.choices(scores, k=len(scores))) for _ in range(n))
    return means[int(0.05 * n)], means[int(0.95 * n)]
`,
  },
};
