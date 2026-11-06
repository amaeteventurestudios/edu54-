// Supervisor and workers (phase 16, lesson 5): a research question on Ghanaian cocoa has six sub-questions. A lead plans, briefs workers, and combines their summaries. Vague briefs overlap; clear briefs cover.
// Six bins show what got covered. The sums are deterministic: clear briefs give each worker a distinct bin; vague briefs repeat by a fixed pattern. Tokens grow with workers.
const SUB = 6, READ = 30, NOTE = 2;
const VAGUE = [0, 0, 1, 0, 1, 2, 0, 2];
function run(o) {
  const hit = Array(SUB).fill(0);
  for (let i = 0; i < o.w; i++) hit[o.clear ? i % SUB : VAGUE[i % VAGUE.length]]++;
  const covered = hit.filter(Boolean).length;
  if (o.w === 0) { const seen = Math.min(SUB, 3); hit.fill(1, 0, seen); return { hit, covered: seen, lead: 10 + READ * seen, tokens: 10 + READ * seen, over: true }; }
  const lead = 10 + o.w * (o.raw ? READ : NOTE);
  return { hit, covered, lead, over: lead > 100, tokens: lead + o.w * (READ + 6) };
}

export default {
  slug: 'supervisor-orchestrator-pattern',
  title: 'Supervisor and workers: brief well, summarise back',
  description: 'One lead, many workers, six questions to cover. The brief decides what gets covered and what is done twice.',
  overview: 'A single agent reading five papers fills half its context, then forgets the first by the fifth. The supervisor pattern breaks that up. A lead plans, gives each worker one narrow question, and works only from their summaries, while each worker has its own full window. Anthropic reported a large gain on internal research evaluations with this shape, at many times the tokens. The cost is real, and so is the lesson from building it: the quality of the brief decides everything. Tell a worker what to find, what to leave out, how to answer and where to stop, or several workers will all chase the obvious part.',
  keywords: ['supervisor pattern', 'orchestrator-worker', 'multi-agent research', 'delegation', 'AI agents', 'context isolation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { w: 6, clear: true, raw: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const lead = add(P.robot(SAF, { scale: 1.1 })); lead.position.set(-2.05, 0.03, -0.15);
    const tank = add(P.tank(0.6, 0.95, 0.5, GOOD)); tank.position.set(-1.3, 0.08, -0.2);
    const X = i => -0.55 + i * 0.58, Wk = Array.from({ length: 8 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.42 })); r.position.set(-0.55 + (i % 8) * 0.415, 0.03, 0.5); return r; });
    const Bin = Array.from({ length: SUB }, (_, i) => { const t = add(P.tower(0.42, 0.42, GOOD)); t.position.set(X(i), 0.03, -0.3); t.userData.set({ cap: '' }); return t; });
    const dart = P.ball(0.06, SAF); dart.userData.noFit = true; S.add(dart);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      Bin.forEach((t, i) => { const n = R.hit[i]; t.userData.set({ h: n ? 0.12 + n * 0.22 : 0.04, color: !n ? GREY : n > 1 ? BAD : GOOD }); });
      Wk.forEach((r, i) => { r.visible = i < st.w; r.userData.set({ busy: true }); });
      tank.userData.set({ level: R.lead / 100, color: R.over ? BAD : GOOD });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Workers (0 means the lead reads alone)', min: 0, max: 8, step: 1, get: () => st.w, set: v => set({ w: v }) },
      { type: 'toggle', label: 'Each brief says what to find and where to stop', short: 'Clear briefs', get: () => st.clear, set: v => set({ clear: !!v }) },
      { type: 'toggle', label: 'Workers send back raw papers', short: 'Raw returns', get: () => st.raw, set: v => set({ raw: !!v }) },
    ];
    const readouts = [
      { label: 'Questions covered', get: () => ({ v: `${R.covered} of ${SUB}`, sub: 'teal bins', good: R.covered === SUB, bad: R.covered < 4 }) },
      { label: 'Lead context', get: () => ({ v: `${R.lead}%`, sub: st.raw ? 'raw papers came back' : 'summaries only', good: R.lead < 60, bad: R.over }) },
      { label: 'Total tokens', get: () => ({ v: `${R.tokens}k`, sub: `lead alone: ${10 + READ * 3}k`, good: R.tokens < 300 }) },
    ];
    const labels = [
      { name: 'l', t: 'The lead', d: 'Plans and combines', icon: 'user', atV: V(-2.3, 0.5, -0.15) },
      { name: 'b', t: 'Six questions', d: 'Coral: done twice. Grey: missed', icon: 'target', atV: V(X(5) + 0.2, 0.2, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One agent reads it all', hint: 'no workers', on: () => set({ ...D0, w: 0 }), off: reset },
      { label: 'Brief them all vaguely', hint: '"research cocoa prices"', on: () => set({ ...D0, clear: false }), off: reset },
      { label: 'Send back the raw papers', hint: 'isolation lost', on: () => set({ ...D0, raw: true }), off: reset },
      { label: 'Throw more workers at it', hint: 'eight vague workers', on: () => set({ ...D0, w: 8, clear: false }), off: reset },
    ];
    function status() {
      if (st.w === 0) return { ok: false, msg: `<b>Alone, the lead got through ${R.covered} of ${SUB}, at ${R.lead}% of its window.</b> Reading everything in one context means it loses the first paper by the time it reaches the last.` };
      if (R.over) return { ok: false, msg: `<b>The lead's window hit ${R.lead}%.</b> Workers read widely, then sent everything home. The point of a worker is to return a short finding. Otherwise you pay for the workers and keep the problem.` };
      if (!st.clear) return { ok: false, msg: `<b>${st.w} workers, ${R.covered} of ${SUB} covered.</b> "Research cocoa prices" sends everyone to the same few sources. More workers only make the coral towers taller. A brief needs the goal, the limits and an answer format.` };
      if (R.covered < SUB) return { ok: false, msg: `<b>${R.covered} of ${SUB} covered: you have fewer workers than questions.</b> Add workers, or have one take two narrow questions.` };
      return { ok: true, msg: `<b>${R.covered} of ${SUB} covered, lead at ${R.lead}%, for ${R.tokens}k tokens.</b> That is ${(R.tokens / (10 + READ * 3)).toFixed(0)} times the lone agent\'s spend, so use this shape where wide coverage is worth it.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.7) % 1;
        const i = Math.floor(S.t * 0.7) % Math.max(1, st.w); dart.visible = st.w > 0;
        if (st.w) dart.position.copy(V(-0.55 + i * 0.415, 0.5, 0.5).lerp(V(-1.3, 1.1, -0.2), u));
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One reader', home: true, say: 'What moved cocoa prices in Ghana this season? One agent reads alone, and fills its window before it gets through half.', act: m => m.set({ w: 0, clear: true, raw: false }) },
    { t: 'A lead and workers', home: true, say: 'A lead plans six narrow questions and gives one to each worker. Each has a full window of its own.', act: m => m.set({ w: 6, clear: true, raw: false }) },
    { t: 'Summaries come back', home: true, say: 'The lead never sees the raw papers, only short findings. Its tank stays low, and it can reason over all six.', act: m => m.set({ w: 6, clear: true, raw: false }) },
    { t: 'A vague brief', home: true, say: 'Tell them all to research cocoa, and they chase the same sources. Some questions are done twice, others not at all.', act: m => m.set({ w: 6, clear: false, raw: false }) },
    { t: 'More isn\'t better', home: true, say: 'Add workers with vague briefs, and the same bins just grow. The brief is the work.', act: m => m.set({ w: 8, clear: false, raw: false }) },
    { t: 'Worth the tokens?', home: true, say: 'This shape uses many times the tokens of one agent. Use it when breadth is worth paying for.', act: m => m.set({ w: 6, clear: true, raw: false }) },
  ],
  check: [
    { q: 'What does the lead see?', options: ['Workers\' short findings', 'Every raw paper', 'Nothing'], answer: 0, why: 'That keeps its window free for reasoning.', hint: 'Try Send back the raw papers.' },
    { q: 'What happens with vague briefs?', options: ['Workers overlap and gaps remain', 'Workers refuse', 'Coverage doubles'], answer: 0, why: 'They chase the same obvious sources.', hint: 'Try Brief them all vaguely.' },
    { q: 'What is the main cost of this pattern?', options: ['Many times the tokens of a single agent', 'It can\'t use tools', 'It needs a bigger model'], answer: 0, why: 'Every worker reads in its own window.', hint: 'Read Total tokens.' },
  ],
  terms: [
    ['Supervisor', 'An agent that plans, delegates and combines.'],
    ['Worker', 'An agent with one narrow job and its own window.'],
    ['Brief', 'A worker\'s instructions: goal, limits, answer format.'],
    ['Synthesis', 'Combining findings into one answer.'],
    ['Fan-out', 'Starting many workers at once.'],
    ['Overlap', 'Two workers doing the same job.'],
  ],
  deeper: '<p><b>When to use it.</b> Wide questions with independent parts. A task where each step depends on the last belongs to one agent.</p><p><b>Reported gains.</b> Anthropic described a large improvement on its own research evaluations with this shape. That is one team\'s measure on one task type, so measure yours.</p><p><b>Numbers here</b> are simple round sums to show the shape.</p>',
  code: {
    title: 'Plan, delegate, combine',
    note: 'Adapted from the course\'s supervisor sketch (code/main.py).',
    text: `
def research(question):
    plan = lead(f"Split into narrow sub-questions: {question}")
    briefs = [Brief(goal=q, exclude=others(plan, q), answer="five bullets, cited")
              for q in plan]
    with ThreadPool(len(briefs)) as pool:
        findings = pool.map(worker, briefs)      # own window each
    return lead(f"Combine these findings: {findings}")
`,
  },
};
