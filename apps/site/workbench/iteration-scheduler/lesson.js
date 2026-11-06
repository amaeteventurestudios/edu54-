// Iteration scheduler (phase 19, lesson 56): a real UCB bandit picks which research branch gets the next run. Four branches for an Addis Ababa lab, each with a hidden success rate. Slots limit parallel runs. The loop below runs 60 pulls from a seeded generator; towers show pulls and rewards.
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
const TRUE = [0.15, 0.3, 0.7, 0.45];
function run(o) {
  const r = rng(9), n = [0, 0, 0, 0], w = [0, 0, 0, 0]; let total = 0;
  for (let t = 1; t <= o.runs; t++) {
    let i;
    if (o.mode === 'even') i = t % 4;
    else if (o.mode === 'greedy') i = t <= 4 ? t - 1 : w.map((v, k) => v / n[k]).reduce((b, v, k, a) => (v > a[b] ? k : b), 0);
    else i = n.indexOf(0) >= 0 ? n.indexOf(0) : w.map((v, k) => v / n[k] + o.c * Math.sqrt(2 * Math.log(t) / n[k])).reduce((b, v, k, a) => (v > a[b] ? k : b), 0);
    const win = r() < TRUE[i]; n[i]++; if (win) { w[i]++; total++; }
  }
  return { n, w, total, best: n[2] / o.runs };
}

export default {
  slug: 'iteration-scheduler',
  title: 'An iteration scheduler: which idea gets the next run?',
  description: 'Limited slots, four branches. A real bandit balances trying the best with checking the rest.',
  overview: 'A research loop has more ideas than slots. Which gets the next run? Spreading evenly wastes runs on poor branches. Always backing the current leader can lock onto an early lucky one. UCB balances these: each branch scores its mean result plus a bonus for being little tried, so that nothing is abandoned too soon, and poor branches fade. Results fan back in and feed the next choice. This lesson runs a real bandit for 60 pulls over four branches, for a research team in Addis Ababa.',
  keywords: ['UCB', 'bandit', 'scheduler', 'research agent', 'exploration', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'ucb', runs: 60, c: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.7 + i * 1.1;
    const T = TRUE.map((p, i) => { const a = add(P.tower(0.4, 0.5, BLUE)), b = add(P.tower(0.4, 0.5, GOOD)); a.position.set(X(i) - 0.22, 0.03, -0.1); b.position.set(X(i) + 0.22, 0.03, -0.1); a.userData.set({ cap: '' }); b.userData.set({ cap: '' }); const l = P.box(0.5, 0.03, 0.2, SAF, { r: 0.01 }); l.position.set(X(i), 0.02, 0.5); l.scale.x = p * 2; S.add(l); return { a, b }; });
    S.add(P.keep(-2.35, 2.35, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ a, b }, i) => { a.userData.set({ h: Math.max(0.03, R.n[i] * 0.022) }); b.userData.set({ h: Math.max(0.03, R.w[i] * 0.03) }); }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['even', 'greedy', 'ucb'];
    const controls = [
      { type: 'buttons', label: 'Choose by', options: ['Even split', 'Current best', 'UCB'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Runs', min: 8, max: 60, step: 2, get: () => st.runs, set: v => set({ runs: v }) },
      { type: 'slider', label: 'Exploration bonus', min: 0, max: 2, step: 0.1, get: () => st.c, set: v => set({ c: v }) },
    ];
    const readouts = [
      { label: 'Good results', get: () => ({ v: `${R.total}`, sub: `of ${st.runs} runs`, good: R.total > st.runs * 0.5 }) },
      { label: 'Runs on the best branch', get: () => ({ v: `${Math.round(R.best * 100)}%`, sub: 'branch three', good: R.best > 0.5, bad: R.best < 0.25 }) },
      { label: 'Runs by branch', get: () => ({ v: R.n.join(', ') }) },
    ];
    const labels = [
      { name: 't', t: 'Blue runs, teal wins', d: 'One pair per branch', icon: 'target', atV: V(X(0) - 0.45, 0.15, -0.1) },
      { name: 'r', t: 'Gold bars', d: 'True chance, hidden from it', icon: 'eye', atV: V(X(3) + 0.3, 0.03, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Split evenly', hint: 'poor branches keep eating runs', on: () => set({ ...D0, mode: 'even' }), off: reset },
      { label: 'Always back the leader', hint: 'an early lucky run', on: () => set({ ...D0, mode: 'greedy' }), off: reset },
      { label: 'No exploration bonus', hint: 'UCB with c of zero', on: () => set({ ...D0, c: 0 }), off: reset },
    ];
    function status() {
      if (st.mode === 'even') return { ok: false, msg: `<b>${R.total} good results, with ${Math.round(R.best * 100)}% of runs on the best branch.</b> Fair, and wasteful.` };
      if (st.mode === 'greedy' || st.c === 0) return { ok: R.best > 0.6, msg: `<b>${Math.round(R.best * 100)}% of runs on the best branch.</b> ${R.best > 0.6 ? 'It got lucky this time.' : 'An early lucky run took over, and better branches were starved.'} With no exploration, the first result decides too much.` };
      return { ok: true, msg: `<b>${R.total} good results, ${Math.round(R.best * 100)}% of runs on the best branch.</b> Poor branches fade, and none is dropped too soon.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'More ideas than slots', home: true, say: 'A team in Addis Ababa has four branches, and can run only so many experiments.', act: m => m.set({ mode: 'even', runs: 60, c: 1 }) },
    { t: 'Even split', home: true, say: 'Share runs evenly, and poor branches keep eating budget.', act: m => m.set({ mode: 'even', runs: 60, c: 1 }) },
    { t: 'Back the leader', home: true, say: 'Always pick the leader, and an early fluke can take over.', act: m => m.set({ mode: 'greedy', runs: 60, c: 1 }) },
    { t: 'A bonus for doubt', home: true, say: 'UCB adds a bonus for branches tried little. Nothing is dropped too soon.', act: m => m.set({ mode: 'ucb', runs: 20, c: 1 }) },
    { t: 'It settles', home: true, say: 'As results come in, runs flow to the branch that earns them.', act: m => m.set({ mode: 'ucb', runs: 60, c: 1 }) },
    { t: 'Fan in', home: true, say: 'Each result feeds the next choice, and the slots stay full.', act: m => m.set({ mode: 'ucb', runs: 60, c: 1 }) },
  ],
  check: [
    { q: 'What does UCB add to the mean?', options: ['A bonus for little-tried branches', 'A penalty for wins', 'Random noise'], answer: 0, why: 'It keeps exploring.', hint: 'Try No exploration bonus.' },
    { q: 'What is the risk of always backing the leader?', options: ['An early fluke takes over', 'Too many branches', 'Slower runs'], answer: 0, why: 'Others are starved.', hint: 'Try Always back the leader.' },
    { q: 'What is wrong with an even split?', options: ['Poor branches keep eating budget', 'It\'s unfair', 'It is too complex'], answer: 0, why: 'Budget goes where it does nothing.', hint: 'Try Split evenly.' },
  ],
  terms: [['Bandit', 'Choosing among options with unknown payoffs.'], ['UCB', 'Upper confidence bound.'], ['Exploration', 'Trying less-known options.'], ['Slot', 'One parallel run.']],
  deeper: '<p><b>Parallel.</b> Results arrive out of order, so update on arrival.</p><p><b>Costs differ.</b> Divide payoff by cost if runs vary.</p><p><b>The bandit</b> really runs here from a seeded generator.</p>',
  code: {
    title: 'UCB',
    note: 'Adapted from the course\'s scheduler (code/main.py).',
    text: `
def pick(branches, t):
    def ucb(b):
        if b.n == 0:
            return float("inf")
        return b.wins / b.n + math.sqrt(2 * math.log(t) / b.n)
    return max(branches, key=ucb)
`,
  },
};
