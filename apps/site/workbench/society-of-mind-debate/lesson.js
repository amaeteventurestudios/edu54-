// Society of mind and debate (phase 16, lesson 7): a Kano exam-prep tutor answers a trap question. Sampling many times and voting saturates, and on a trap it is confidently wrong. Debate lets agents read
// each other's reasoning and revise. Each round, agents who can show working convert doubters; with flattery on, the majority converts everyone instead. Robots are agents, teal right, coral wrong.
function run(o) {
  const n = o.n; let right = Math.max(1, Math.floor(n * 0.34)); const rounds = [right];
  for (let r = 1; r < o.r; r++) {
    if (o.flatter) right = Math.max(0, right - (right < n / 2 ? 1 : -1));
    else if (o.same) right = right;
    else right = Math.min(n, right + Math.ceil(right * 0.7));
    rounds.push(right);
  }
  const final = rounds[rounds.length - 1], ctx = o.n * (1 + (o.r - 1) * (o.n - 1) * 0.4);
  return { rounds, right: final, won: final * 2 > n, tokens: Math.round(ctx) };
}

export default {
  slug: 'society-of-mind-debate',
  title: 'Debate: when agents change each other\'s minds',
  description: 'Sample and vote, and a trap question fools the majority. Let agents read each other\'s working, and the right answer can spread.',
  overview: 'Self-consistency, sampling a model many times and taking the majority, is a cheap way to improve reasoning. But it saturates, because the samples share the same blind spot. On a trap question the majority is confidently wrong, and more samples only make it more sure. Debate breaks that. Each agent writes an answer, reads the others\' reasoning, and revises. Now one agent\'s good working can reach the rest. It works when reasoning differs and agents respond to evidence. It fails when they flatter each other, and it costs far more, as every agent reads every other in every round.',
  keywords: ['multi-agent debate', 'self-consistency', 'society of mind', 'sycophancy', 'ensemble reasoning', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 7, r: 3, flatter: false, same: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const table = P.cyl(1.05, 0.12, '#A87A4F'); table.position.set(-0.75, 0, 0); S.add(table);
    const A = i => i / 7 * Math.PI * 2 - Math.PI / 2;
    const bots = Array.from({ length: 7 }, (_, i) => { const r = add(P.robot(BAD, { scale: 0.55 })); r.position.set(-0.75 + Math.cos(A(i)) * 0.82, 0.12, Math.sin(A(i)) * 0.82); r.rotation.y = -A(i) - Math.PI / 2; return r; });
    const tw = [0, 1, 2, 3].map(i => { const t = add(P.tower(0.34, 0.34, GOOD)); t.position.set(1.05 + i * 0.45, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const slab = P.box(2.0, 0.03, 0.55, '#BFB8A8', { r: 0.03 }); slab.position.set(1.72, 0, -0.1); S.add(slab);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(1.7, 0, 0.6);
    S.add(P.keep(-1.95, 2.5, 1.0, -1.05, 1.05));
    let R = null;
    function draw() {
      R = run(st);
      bots.forEach((b, i) => { b.visible = i < st.n; b.userData.set({ color: i < R.right ? GOOD : BAD, busy: st.r > 1 }); });
      tw.forEach((t, i) => { const v = R.rounds[i]; t.visible = v != null; t.userData.set({ h: v == null ? 0.02 : Math.max(0.04, v / st.n), color: v * 2 > st.n ? GOOD : BAD }); });
      lamp.userData.set({ color: R.won ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Agents', min: 3, max: 7, step: 2, get: () => st.n, set: v => set({ n: v }) },
      { type: 'slider', label: 'Rounds (1 means just vote)', min: 1, max: 4, step: 1, get: () => st.r, set: v => set({ r: v }) },
      { type: 'toggle', label: 'Agents flatter the majority', short: 'Flattery', get: () => st.flatter, set: v => set({ flatter: !!v }) },
      { type: 'toggle', label: 'All agents reason the same way', short: 'Identical', get: () => st.same, set: v => set({ same: !!v }) },
    ];
    const readouts = [
      { label: 'Group answer', get: () => ({ v: R.won ? 'right' : 'wrong', sub: `${R.right} of ${st.n} right`, good: R.won, bad: !R.won }) },
      { label: 'Rounds', get: () => ({ v: `${st.r}`, sub: st.r === 1 ? 'a plain vote' : 'read, then revise' }) },
      { label: 'Tokens', get: () => ({ v: `${R.tokens}k`, sub: `one vote: ${st.n}k` }) },
    ];
    const labels = [
      { name: 'r', t: 'Agents around a table', d: 'Teal right, coral wrong', icon: 'user', atV: V(-1.75, 0.3, 0) },
      { name: 't', t: 'Right answers, by round', d: 'Teal once a majority', icon: 'target', atV: V(2.66, 0.03, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Just vote', hint: 'no reading each other', on: () => set({ ...D0, r: 1 }), off: reset },
      { label: 'Agents flatter the majority', hint: 'agreement over evidence', on: () => set({ ...D0, flatter: true, r: 4 }), off: reset },
      { label: 'Debate among identical copies', hint: 'no new reasoning', on: () => set({ ...D0, same: true, r: 4 }), off: reset },
    ];
    function status() {
      if (st.flatter) return { ok: false, msg: `<b>${R.right} of ${st.n} still right after ${st.r} rounds.</b> Agents changed their answers to match the crowd, not the evidence. Debate without a demand for reasons is just peer pressure. Ask agents to attack the working, not to agree.` };
      if (st.same && !st.flatter && st.r > 1) return { ok: false, msg: `<b>${st.r} rounds, ${R.tokens}k tokens, and no change.</b> Agents with the same blind spot have nothing new to show each other. Debate pays only when reasoning differs, so vary the prompts or the models.` };
      if (st.r === 1) return { ok: false, msg: `<b>${st.n - R.right} of ${st.n} fell for the trap, and the vote is wrong.</b> Each sample makes the same mistake, so more samples only add confidence. Voting removes noise, not bias.` };
      if (!R.won) return { ok: false, msg: `<b>${R.right} of ${st.n}: not enough rounds for the good reasoning to spread.</b> Give it another round.` };
      return { ok: true, msg: `<b>${R.right} of ${st.n} right after ${st.r} rounds, for ${R.tokens}k tokens against ${st.n}k for a vote.</b> Good working spread because agents read it and were asked to respond. Keep this for hard questions, as it is costly.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Sample and vote', home: true, say: 'An exam tutor in Kano meets a trap question. Sample seven answers and vote. Most fall for the trap.', act: m => m.set({ n: 7, r: 1, flatter: false, same: false }) },
    { t: 'Why voting stalls', home: true, say: 'The samples share a blind spot. More of them make the wrong answer look surer. Voting removes noise, not bias.', act: m => m.set({ n: 5, r: 1, flatter: false, same: false }) },
    { t: 'Read and revise', home: true, say: 'Now each agent reads the others\' working, and revises. Two agents had the right reasoning, and they can show it.', act: m => m.set({ n: 7, r: 2, flatter: false, same: false }) },
    { t: 'It spreads', home: true, say: 'Another round, and the right answer becomes the majority. Coral turns teal around the table.', act: m => m.set({ n: 7, r: 3, flatter: false, same: false }) },
    { t: 'Flattery', home: true, say: 'If agents simply agree with the crowd, the right ones give in. Ask them to attack the working, not to agree.', act: m => m.set({ n: 7, r: 4, flatter: true, same: false }) },
    { t: 'What it costs', home: true, say: 'Every agent reads every other in every round. Keep debate for questions where a wrong answer costs more.', act: m => m.set({ n: 7, r: 3, flatter: false, same: false }) },
  ],
  check: [
    { q: 'Why does voting fail on a trap question?', options: ['Samples share the same blind spot', 'Votes are slow', 'There are too few tokens'], answer: 0, why: 'Voting removes noise, not bias.', hint: 'Try Just vote.' },
    { q: 'What must differ for debate to help?', options: ['The agents\' reasoning', 'Their names', 'Their temperature only'], answer: 0, why: 'Identical copies have nothing new to show.', hint: 'Try Debate among identical copies.' },
    { q: 'What breaks debate most directly?', options: ['Agents agreeing to please the majority', 'Too much evidence', 'Short answers'], answer: 0, why: 'That is peer pressure, not reasoning.', hint: 'Try Agents flatter the majority.' },
  ],
  terms: [
    ['Self-consistency', 'Sampling many answers and taking the majority.'],
    ['Debate', 'Agents reading each other\'s reasoning and revising.'],
    ['Society of mind', 'The idea that intelligence comes from many simple parts.'],
    ['Sycophancy', 'Agreeing to please, not because of evidence.'],
    ['Correlated errors', 'Mistakes many samples share.'],
    ['Round', 'One pass of reading and revising.'],
  ],
  deeper: '<p><b>The method.</b> Du and colleagues (2023) had agents answer, read the others\' answers and revise over a few rounds. Later work warns of sycophancy, where agents converge for social reasons.</p><p><b>Keep it short.</b> Two or three rounds does most of the good. Long debates burn tokens and drift.</p><p><b>Numbers here</b> follow a simple spreading rule to show the shape.</p>',
  code: {
    title: 'A debate',
    note: 'Adapted from the course\'s debate sketch (code/main.py).',
    text: `
def debate(question, agents, rounds=3):
    answers = [a(question) for a in agents]
    for _ in range(rounds - 1):
        answers = [
            a(f"{question}\\nOthers said: {others(answers, i)}\\n"
              "Find any flaw in their working. Change your answer only for a reason.")
            for i, a in enumerate(agents)
        ]
    return majority(answers)
`,
  },
};
