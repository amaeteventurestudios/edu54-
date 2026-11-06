// Map assumptions and risk (phase 14, lesson 49): a customs tool for the port of Mombasa rests on five bets. Each tower's height is impact × uncertainty × irreversibility.
// There is budget for three tests. Test by risk and the safety bet fails early and cheaply; test by enthusiasm and it fails after launch. Every number comes from the sums below.
const BETS = [
  { n: 'Value', q: 'clerks want this', i: 2, u: 2, r: 1, truth: true, fun: 3 },
  { n: 'Usability', q: 'clerks trust it', i: 3, u: 2, r: 1, truth: true, fun: 2 },
  { n: 'Feasibility', q: 'the data is enough', i: 2, u: 1, r: 1, truth: true, fun: 5 },
  { n: 'Viability', q: 'someone owns it', i: 2, u: 2, r: 2, truth: true, fun: 1 },
  { n: 'Safety', q: 'a wrong code is caught', i: 3, u: 3, r: 3, truth: false, fun: 0 },
];
const risk = (b, o) => b.i * b.u * (o.irr ? b.r : 1) * (o.noU ? 1 / b.u : 1);
function run(o) {
  const order = BETS.map((b, i) => i).sort((a, c) => o.by === 'risk' ? risk(BETS[c], o) - risk(BETS[a], o) : BETS[c].fun - BETS[a].fun);
  const tested = order.slice(0, o.tests), left = BETS.map((b, i) => tested.includes(i) ? 0 : risk(b, o)).reduce((a, b) => a + b, 0);
  const found = tested.includes(4), blown = o.tests > 0 && !found;
  return { order, tested, left, found, blown, late: blown ? 12 : 0, cost: o.tests + (blown ? 12 : 0) };
}

export default {
  slug: 'map-assumptions-and-risk',
  title: 'Map your assumptions: test the riskiest bet first',
  description: 'Five bets hold up a port tool, with budget to test three. Choose by risk, not by what is fun to build.',
  overview: 'Every build rests on bets: people will want it, they will trust it, the data is enough, someone will run it, and it can fail safely. These are not tasks. They are conditions for the work to matter, and teams usually test the exciting ones first. Instead, write each bet down and score it separately on impact, uncertainty and how hard it is to undo. Multiply, and the tallest tower is the next experiment. A tested bet is replaced with evidence. Here a customs tool for the port of Mombasa has five bets and a budget for three tests, and one of them is false.',
  keywords: ['assumption mapping', 'risk', 'product discovery', 'experiments', 'AI product', 'irreversibility'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.07, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { by: 'risk', tests: 3, irr: true, noU: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.8;
    const T = BETS.map((b, i) => { const t = add(P.tower(0.55, 0.55, SAF)); t.position.set(X(i), 0.03, -0.2); t.userData.set({ cap: '' }); const l = add(P.lamp('#C9C4B6', { h: 0.14, r: 0.08 })); l.position.set(X(i), 0.03, 0.42); return { t, l }; });
    const jar = add(P.jar(0.24, 0.6, { max: 12 })); jar.position.set(2.3, 0.03, 0.42);
    S.add(P.keep(-2.45, 2.55, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach(({ t, l }, i) => {
        const done = R.tested.includes(i), v = risk(BETS[i], st), bad = done && !BETS[i].truth;
        t.userData.set({ h: Math.max(0.04, done ? (bad ? 0.5 : 0.08) : v * 0.043), color: bad ? RED : done ? GOOD : SAF });
        l.userData.set({ color: done ? (bad ? '#D9483B' : '#3E9B5F') : '#C9C4B6', on: done });
      });
      jar.userData.set({ n: Math.min(12, R.cost) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const BK = ['risk', 'fun'];
    const controls = [
      { type: 'buttons', label: 'Test in order of', options: ['Risk', 'Enthusiasm'], get: () => BK.indexOf(st.by), act: i => set({ by: BK[i] }) },
      { type: 'slider', label: 'Tests you can afford', min: 0, max: 5, step: 1, get: () => st.tests, set: v => set({ tests: v }) },
      { type: 'toggle', label: 'Score how hard it is to undo', short: 'Undo score', get: () => st.irr, set: v => set({ irr: !!v }) },
    ];
    const readouts = [
      { label: 'Next test', get: () => { const n = R.order.find(i => !R.tested.includes(i)); return { v: n == null ? 'all done' : BETS[n].n, sub: n == null ? 'every bet has evidence' : BETS[n].q }; } },
      { label: 'Risk left untested', get: () => ({ v: `${Math.round(R.left)}`, sub: 'sum of the gold towers', good: R.left < 15, bad: R.left > 30 }) },
      { label: 'Weeks spent', get: () => ({ v: `${R.cost}`, sub: R.blown ? 'includes a late failure' : 'tests only', good: !R.blown, bad: R.blown }) },
    ];
    const labels = [
      { name: 't', t: 'Five bets', d: 'Height: impact × doubt × undo', icon: 'target', atV: V(X(0) - 0.25, 0.2, -0.05) },
      { name: 'j', t: 'Weeks spent', d: 'A late failure costs most', icon: 'money', atV: V(2.5, 0.35, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Test the fun one first', hint: 'enthusiasm sets the order', on: () => set({ ...D0, by: 'fun' }), off: reset },
      { label: 'Ignore how hard it is to undo', hint: 'one score for everything', on: () => set({ ...D0, irr: false, by: 'fun', tests: 2 }), off: reset },
      { label: 'Skip tests and ship', hint: 'all bets stay bets', on: () => set({ ...D0, tests: 0 }), off: reset },
    ];
    function status() {
      if (st.tests === 0) return { ok: false, msg: `<b>Nothing tested, so ${Math.round(R.left)} points of risk went live as hope.</b> The safety bet is false, and nobody knows yet. Shipping doesn't remove a bet. It just makes the test expensive.` };
      if (R.blown) return { ok: false, msg: `<b>Three happy test results, then a wrong customs code reached the ship.</b> The bets you tested were the ones you enjoyed. The tallest tower sat untested until it failed after launch, adding ${R.late} weeks.` };
      if (R.found) return { ok: true, msg: `<b>The safety test failed early, at the cost of one test.</b> That is a good result: the bet is now evidence, and the design changes before anything ships. ${Math.round(R.left)} points of risk are left.` };
      return { ok: true, msg: `<b>${st.tests} tests run, ${Math.round(R.left)} points left.</b> Keep testing the tallest tower until what is left is a risk you can carry.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five bets', home: true, say: 'A customs tool for the port of Mombasa rests on five bets. Each tower is one bet, and nothing has been tested.', act: m => m.set({ by: 'risk', tests: 0, irr: true }) },
    { t: 'Score them apart', home: true, say: 'Score each one for impact, for doubt, and for how hard it would be to undo. Multiply, and height is risk.', act: m => m.set({ by: 'risk', tests: 0, irr: true }) },
    { t: 'The fun test', home: true, say: 'Teams love testing the clever part first. The feasibility demo goes well, and everyone feels fine.', act: m => m.set({ by: 'fun', tests: 3, irr: true }) },
    { t: 'The bill arrives', home: true, say: 'But the tallest bet was never touched. A wrong code reaches a ship, after launch, when it costs the most.', act: m => m.set({ by: 'fun', tests: 3, irr: true }) },
    { t: 'Riskiest first', home: true, say: 'Test the tallest tower first. The safety bet fails in a week, and failing early is what a test is for.', act: m => m.set({ by: 'risk', tests: 1, irr: true }) },
    { t: 'Evidence replaces bets', home: true, say: 'Each result replaces a bet with evidence. Keep going until what remains is a risk you can carry.', act: m => m.set({ by: 'risk', tests: 3, irr: true }) },
  ],
  check: [
    { q: 'Which assumption should you test first?', options: ['The riskiest one', 'The most exciting one', 'The easiest one'], answer: 0, why: 'Risk sets the order, not enthusiasm.', hint: 'Try Test the fun one first.' },
    { q: 'Why score how hard something is to undo?', options: ['A reversible mistake can be fixed cheaply; others can\'t', 'It makes the sum bigger', 'It is a legal rule'], answer: 0, why: 'Irreversible failures cost far more.', hint: 'Try Ignore how hard it is to undo.' },
    { q: 'Is a test that fails a bad result?', options: ['No, it found the problem cheaply', 'Yes, always', 'Only on Mondays'], answer: 0, why: 'Failing early is what a test is for.', hint: 'See Riskiest first in the story.' },
  ],
  terms: [
    ['Assumption', 'Something that must be true for the work to matter.'],
    ['Value bet', 'The outcome matters enough.'],
    ['Viability bet', 'The organisation can sustain and own it.'],
    ['Irreversibility', 'How hard a mistake is to undo.'],
    ['Riskiest assumption', 'The tallest tower: test it next.'],
    ['Evidence', 'A result that replaces a bet.'],
  ],
  deeper: '<p><b>Five classes.</b> Value, usability, feasibility, viability and safety. If one class has no bets on your list, you probably haven\'t looked.</p><p><b>Small tests.</b> The best test answers one question with the least building: a paper walk-through, a day of shadowing, a test on old data.</p><p><b>Scores here</b> are 1 to 3 on each axis. The point is to argue about them in the open, not to be precise. Weeks are round figures.</p>',
  code: {
    title: 'Rank the bets',
    note: 'Adapted from the course\'s assumption map (code/main.py).',
    text: `
def score(bet):
    return bet.impact * bet.uncertainty * bet.irreversibility

def next_experiment(bets):
    open_bets = [b for b in bets if b.evidence is None]
    return max(open_bets, key=score, default=None)

def record(bet, result):
    bet.evidence = result                        # a bet becomes a decision
    bet.uncertainty = 1
`,
  },
};
