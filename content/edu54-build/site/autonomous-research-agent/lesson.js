// Capstone: an autonomous research agent (phase 19, capstone 5). A Cape Town lab's agent runs the full cycle on maize-yield data: hypothesis, literature, experiment, analysis, draft, review. Twelve hypotheses are seeded, three truly hold.
// Testing many without correction makes false results pass; replication and a held-out set catch them. A budget ends the run; a human signs off. Counts come from the loop below.
const H = [...Array(12)].map((_, i) => ({ real: i % 4 === 0, noise: ((i * 37) % 100) / 100 }));
function run(o) {
  const tried = Math.min(H.length, o.budget);
  let claim = 0, tp = 0, fp = 0;
  H.slice(0, tried).forEach(h => {
    let pass = h.real || h.noise > (o.correct ? 0.8 : 0.6);
    if (o.rep && !h.real) pass = false;
    if (pass) { claim++; h.real ? tp++ : fp++; }
  });
  return { tried, claim, tp, fp, cost: tried * (o.rep ? 2 : 1) };
}

export default {
  slug: 'autonomous-research-agent',
  title: 'Capstone: an agent that runs experiments',
  description: 'Hypothesis, experiment, analysis, draft, review. See a research agent run the whole cycle, and how it fools itself.',
  overview: 'Research agents crossed a line: some generated papers have cleared workshop peer review. They run a loop: propose a hypothesis, read the literature, run an experiment, analyse the result, write it up, review it. The danger isn\'t that they fail. It is that they succeed on paper. Run enough tests and some pass by chance. An agent rewarded for positive results finds those first. The defences are old ones from good science: correct for many tests, replicate on fresh data, keep a held-out set the agent never sees, and have a person sign off. This capstone runs twelve hypotheses on maize-yield data for a Cape Town lab. Three are real.',
  keywords: ['AI scientist', 'research agent', 'multiple testing', 'replication', 'autonomous agents', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { budget: 12, correct: true, rep: true, human: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const STG = ['Idea', 'Read', 'Test', 'Analyse', 'Write', 'Review'], X = i => -2.05 + i * 0.55;
    STG.forEach((n, i) => { const b = P.box(0.44, 0.2 + i * 0.05, 0.4, ['#5B8DB8', '#3E9B9B', '#7B6FA8', '#D98BA6', SAF, '#A87A4F'][i], { r: 0.04 }); b.position.set(X(i), 0.03, -0.45); S.add(b); });
    const bot = add(P.robot('#2C2D31', { scale: 0.45 })); bot.userData.noFit = true;
    const G = H.map((h, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.27, 0.3, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-2.05 + (i % 12) * 0.31, 0.03, 0.35); S.add(b); return m; });
    const human = add(P.robot('#A87A4F', { scale: 0.7 })); human.position.set(2.0, 0.03, 0.3);
    S.add(P.keep(-2.45, 2.45, 0.9, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      G.forEach((m, i) => {
        const h = H[i], on = i < R.tried; let pass = h.real || h.noise > (st.correct ? 0.8 : 0.6); if (st.rep && !h.real) pass = false;
        m.color.set(!on ? '#E0DBCE' : pass ? (h.real ? GOOD : BAD) : GREY);
      });
      human.visible = st.human; human.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Experiments allowed', min: 2, max: 12, step: 1, get: () => st.budget, set: v => set({ budget: v }) },
      tg('correct', 'Correct for many tests', 'Correction'), tg('rep', 'Replicate on held-out data', 'Replicate'), tg('human', 'A person signs off', 'Sign-off'),
    ];
    const readouts = [
      { label: 'Claimed findings', get: () => ({ v: `${R.claim}`, sub: `of ${R.tried} tried` }) },
      { label: 'False findings', get: () => ({ v: `${R.fp}`, sub: 'passed by chance', good: !R.fp, bad: R.fp > 0 }) },
      { label: 'Real ones found', get: () => ({ v: `${R.tp} of 3`, sub: `${R.cost} runs paid for`, good: R.tp === 3 }) },
    ];
    const labels = [
      { name: 's', t: 'The research cycle', d: 'Idea to review', icon: 'book', atV: V(-2.32, 0.2, -0.45) },
      { name: 'h', t: 'Twelve hypotheses', d: 'Coral: false, but it passed', icon: 'target', atV: V(1.55, 0.2, 0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Report every pass', hint: 'many tests, no correction', on: () => set({ ...D0, correct: false, rep: false }), off: reset },
      { label: 'Skip replication', hint: 'one good run', on: () => set({ ...D0, rep: false }), off: reset },
      { label: 'No sign-off', hint: 'the agent publishes itself', on: () => set({ ...D0, human: false }), off: reset },
    ];
    function status() {
      if (R.fp > 1) return { ok: false, msg: `<b>${R.claim} findings, ${R.fp} of them false.</b> Test enough ideas and some pass by luck, and a tidy write-up hides that. The agent isn't lying. It's doing what it was rewarded for.` };
      if (R.fp) return { ok: false, msg: `<b>${R.fp} false finding passed, in one lucky run.</b> A result the agent has seen can be fitted. Replicate on data it never touched.` };
      if (!st.human) return { ok: false, msg: `<b>${R.claim} findings published with nobody reading them.</b> The science holds this time. Accountability doesn't. A person must own what goes out.` };
      if (R.tp < 3) return { ok: false, msg: `<b>${R.tp} of 3 real effects found.</b> The budget ran out. Honest, and incomplete.` };
      return { ok: true, msg: `<b>All 3 real effects found, with no false findings, for ${R.cost} runs.</b> Replication doubled the cost, and that is what trust costs.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.7) % 6; const i = Math.floor(u); bot.position.set(X(i) + 0.55 * (u - i) * (i < 5 ? 1 : 0), 0.48, -0.45); bot.userData.set({ busy: true }); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'The whole cycle', home: true, say: 'A lab in Cape Town lets an agent study maize yields. Idea, reading, test, analysis, write-up, review.', act: m => m.set({ budget: 12, correct: false, rep: false, human: true }) },
    { t: 'It finds a lot', home: true, say: 'It tries twelve ideas, and many pass. Three are real. The rest passed by luck.', act: m => m.set({ budget: 12, correct: false, rep: false, human: true }) },
    { t: 'Correct for many tests', home: true, say: 'Raise the bar to match how much was tried. Most lucky passes fall away.', act: m => m.set({ budget: 12, correct: true, rep: false, human: true }) },
    { t: 'Replicate', home: true, say: 'Run each survivor again, on data the agent never saw. Only real effects stay.', act: m => m.set({ budget: 12, correct: true, rep: true, human: true }) },
    { t: 'Budget', home: true, say: 'Experiments cost money. A small budget means real findings go unfound.', act: m => m.set({ budget: 4, correct: true, rep: true, human: true }) },
    { t: 'A person owns it', home: true, say: 'Then a person signs off. Good science is old advice, and agents need it more than we do.', act: m => m.set({ budget: 12, correct: true, rep: true, human: true }) },
  ],
  check: [
    { q: 'Why do many tests create false findings?', options: ['Some pass by chance', 'Tests get worse', 'Data runs out'], answer: 0, why: 'Try enough, and luck looks like a result.', hint: 'Try Report every pass.' },
    { q: 'What does replication on held-out data do?', options: ['Checks results on data the agent never saw', 'Doubles the score', 'Writes the paper'], answer: 0, why: 'Fitted luck doesn\'t repeat.', hint: 'Try Skip replication.' },
    { q: 'Why keep a person in the loop?', options: ['Someone must own what goes out', 'Agents can\'t write', 'It is faster'], answer: 0, why: 'Accountability can\'t be delegated.', hint: 'Try No sign-off.' },
  ],
  terms: [
    ['Hypothesis', 'A claim to test.'],
    ['Multiple testing', 'Many tests raising the chance of luck.'],
    ['Correction', 'Tightening the bar for many tests.'],
    ['Replication', 'Repeating a result.'],
    ['Held-out data', 'Data kept out of the search.'],
    ['p-hacking', 'Trying things until something passes.'],
  ],
  deeper: '<p><b>The series.</b> Later capstones build each stage: hypothesis generator, literature retrieval, experiment runner, evaluator, writer, critic and scheduler.</p><p><b>Sandbox.</b> An agent that runs code needs limits on what it can reach and spend.</p><p><b>This run.</b> Twelve seeded hypotheses, three real. Chance thresholds are illustrative.</p>',
  code: {
    title: 'A guarded cycle',
    note: 'Adapted from the course\'s capstone sketch (code/main.py).',
    text: `
def cycle(budget):
    findings = []
    for idea in propose_ideas(n=budget):
        result = run_experiment(idea, data=train)
        if result.p < 0.05 / budget:             # correct for many tests
            again = run_experiment(idea, data=held_out)
            if again.confirms(result):
                findings.append(write_up(idea, result, again))
    return send_to_human(findings)
`,
  },
};
