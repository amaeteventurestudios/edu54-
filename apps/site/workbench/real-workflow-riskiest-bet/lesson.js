// The real workflow and its riskiest bet (lessons 48 and 49): a Kumasi pharmacy wants help reordering medicines. First the current workflow is
// reconstructed as steps with evidence of different strength (direct, artifact, reported, inferred); watching a shift finds the paper notebook an
// interview missed. Then the build is written as falsifiable assumptions scored impact × uncertainty + irreversibility, and the highest open risk
// picks the next experiment. Testing one re-ranks the rest.
const STEPS = [
  { who: 'clerk', act: 'counts shelves\nat closing', obs: 'direct', int: 'reported', flag: 'friction' },
  { who: 'clerk', act: 'writes counts\nin a notebook', obs: 'direct', int: null, flag: 'hidden state' },
  { who: 'clerk', act: 're-types low\nitems next day', obs: 'artifact', int: 'artifact', flag: 'friction' },
  { who: 'pharmacist', act: 'approves\ncontrolled lines', obs: 'artifact', int: 'artifact', flag: 'authority' },
  { who: 'clerk', act: 'orders on\nWhatsApp', obs: 'direct', int: 'reported', flag: 'side channel' },
  { who: 'clerk', act: 'out of stock:\nphones another', obs: 'direct', int: 'inferred', flag: 'exception' },
];
const BETS = [
  { id: 'A1', kind: 'feasibility', short: 'counts in the system', claim: 'the stock app\'s counts match the shelves', I: 5, U: 5, R: 2, needsObs: true, card: 'a week of app\ncounts vs the\nnotebook, two\nshops; stop if\n>1 line in 10\ndiffers', test: 'compare app counts with the notebook for a week at two shops; stop if more than 1 line in 10 differ', found: 'they differ on 3 lines in 10: the notebook is the truth, so read it, don\'t trust the app' },
  { id: 'A2', kind: 'safety', short: 'controlled lines', claim: 'every controlled line still reaches the pharmacist', I: 4, U: 3, R: 5, card: 'replay last\nmonth read-only;\nevery controlled\nline must reach\nthe pharmacist', test: 'replay last month\'s orders read-only; every controlled line must land in the approval queue' },
  { id: 'A3', kind: 'value', short: 'stock-outs cost', claim: 'stock-outs lose sales every week', I: 4, U: 2, R: 1, card: 'count turned-\naway customers\nfor two weeks', test: 'count turned-away customers for two weeks' },
  { id: 'A4', kind: 'usability', short: 'clerks trust it', claim: 'clerks accept a quantity they didn\'t count', I: 3, U: 5, R: 1, card: 'five clerks see\nsuggestions by\ntheir own counts;\npass if four\naccept', test: 'show five clerks suggestions beside their own counts; pass if four accept without recounting' },
  { id: 'A5', kind: 'viability', short: 'someone owns it', claim: 'someone keeps the supplier list current', I: 3, U: 3, R: 2, card: 'name an owner\nand a monthly\nreview first', test: 'name the owner and a monthly review before building' },
];
const score = (b, o) => b.I * b.U + (o.irr ? b.R : 0);
function analyse(o) {
  const steps = STEPS.map(s => ({ ...s, ev: o.observe ? s.obs : s.int })).filter(s => s.ev);
  const direct = steps.filter(s => s.ev === 'direct').length;
  const bets = BETS.filter(b => o.observe || !b.needsObs).map(b => ({ ...b, s: score(b, o), tested: o.tested && b.id === 'A1' && o.observe }));
  const open = bets.filter(b => !b.tested).sort((a, b) => b.s - a.s);
  const next = o.enthusiasm ? null : open[0];
  return { steps, direct, bets, open, next };
}

export default {
  slug: 'real-workflow-riskiest-bet',
  title: 'The real workflow, and its riskiest bet',
  description: 'A Kumasi pharmacy wants help reordering medicines. Watch how the work really runs, write the bets down, and test the riskiest one first.',
  overview: 'Requirements aren\'t waiting in a meeting to be collected; they are scattered across actions, workarounds, records and disagreements. Don\'t start by asking what features people want: reconstruct what happens now. For each step record the actor, trigger, action, inputs and outputs, the friction, who has authority, and the evidence. Evidence has strength: direct behaviour (an observation, trace or recording), an artifact (a ticket, log or register), reported behaviour (what someone says they do) and inference. Only the first two prove current behaviour; label the rest so confidence doesn\'t silently grow. Look for friction, hidden state (facts kept in memory, chat or a personal notebook), authority and exceptions; AI features fail at handoffs and exceptions because only the happy path was shaped. Keep variants apart rather than averaging them into a workflow nobody performs. Then turn the build into assumptions, the conditions for it to be valuable, usable, feasible, viable and safe, each written so it could be false. Score impact if wrong, uncertainty of the evidence and irreversibility of learning late: here impact × uncertainty + irreversibility, a formula that matters less than having to say why one bet comes first. Test the highest open risk with a real experiment: a claim, a sample, an observable result, a threshold set beforehand and a decision for pass, fail and unclear. A demo that shows the team can build the idea tests nothing. Tested bets become evidence, and the next risk moves up.',
  keywords: ['user research', 'workflow discovery', 'assumption mapping', 'risk', 'product discovery', 'AI products', 'experiments'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.45, 0.35, 0], dir: [0.05, 1.2, 1.0], half: 1.2, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { observe: true, irr: true, enthusiasm: false, tested: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F';
    const EC = { direct: '#1F9E89', artifact: '#5B8DB8', reported: '#E3A72F', inferred: '#A9A59A' };
    /* the workflow as it really runs: a post per step (clerk dark, pharmacist purple) with a lamp for the evidence behind it: green watched, blue a
       document, gold someone said so, grey a guess. Watching a shift finds the paper notebook (white) an interview missed */
    const WZ = -0.6, SX = i => -2.45 + i * 0.62;
    const steps = STEPS.map((s, i) => { const b = P.box(0.3, 0.35, 0.3, s.who === 'clerk' ? CHAR : '#7B6FA8', { r: 0.05 }); b.userData.noFit = true; S.add(b); const l = P.lamp(GOOD, { h: 0.2, r: 0.08 }); l.userData.noFit = true; S.add(l); const a = P.arrow(V(), V(0.1, 0, 0), 0.014, '#8E8C84'); a.userData.noFit = true; S.add(a); return { b, l, a }; });
    const book = P.box(0.26, 0.05, 0.2, '#F4F1EA', { r: 0.01 }); book.userData.noFit = true; S.add(book);
    /* five bets as towers, height = impact × uncertainty (+ irreversibility); the highest open one is gold and gets the next experiment (the arrow) */
    const BZ = 0.55, BX = i => -2.2 + i * 0.6;
    const bets = BETS.map((b, i) => { const t = P.tower(0.34, 0.34, '#E8E1D0', { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(BX(i), 0, BZ); S.add(t); return t; });
    const mark = P.arrow(V(0, 1.2, BZ), V(0, 1.0, BZ), 0.03, AMB); mark.userData.noFit = true; S.add(mark);
    /* or, on enthusiasm, a demo bot that tests no bet */
    const demo = P.robot(RED, { scale: 0.7 }); demo.position.set(1.55, 0, BZ); S.add(demo);
    S.add(P.keep(-2.75, 1.85, 1.25, -0.85, 0.8));

    let R = null, topX = 0;
    function draw() {
      R = analyse(st);
      const n = R.steps.length, x0 = -2.45 + (6 - n) * 0.31;
      steps.forEach((T, i) => {
        const s = R.steps[i], on = !!s; T.b.visible = T.l.visible = T.a.visible = on; if (!on) return;
        const x = x0 + i * 0.62; T.b.position.set(x, 0, WZ); T.l.position.set(x, 0.35, WZ); T.l.userData.set({ color: EC[s.ev], on: true });
        T.a.visible = i < n - 1; if (i < n - 1) P.setArrow(T.a, V(x + 0.17, 0.15, WZ), V(x + 0.45, 0.15, WZ));
        if (s.flag === 'hidden state') book.position.set(x, 0.35, WZ + 0.22);
      });
      book.visible = R.steps.some(s => s.flag === 'hidden state');
      const top = R.next && R.next.id;
      BETS.forEach((b0, i) => { const b = R.bets.find(x => x.id === b0.id); bets[i].visible = !!b; if (!b) return;
        bets[i].userData.set({ h: Math.max(0.05, b.tested ? 0.05 : b.s * 0.03), color: b.tested ? '#9FCFC2' : b.id === top ? AMB : '#E8E1D0' }); if (b.id === top) topX = BX(i); });
      mark.visible = !!top; if (top) { const hgt = R.next.s * 0.03; P.setArrow(mark, V(topX, hgt + 0.45, BZ), V(topX, hgt + 0.1, BZ)); }
      demo.visible = !!st.enthusiasm;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Watch a shift, not just interview', short: 'Observe', get: () => st.observe, set: v => set({ observe: !!v }) },
      { type: 'toggle', label: 'Count irreversibility in the risk score', short: 'Irreversibility', get: () => st.irr, set: v => set({ irr: !!v }) },
      { type: 'toggle', label: 'Run the experiment on the top bet', short: 'Test A1', get: () => st.tested, set: v => set({ tested: !!v }) },
    ];
    const readouts = [
      { label: 'Direct evidence', get: () => ({ v: `${R.direct} of ${R.steps.length}`, sub: st.observe ? 'steps observed' : 'interviews only', good: R.direct >= 3, bad: R.direct === 0 }) },
      { label: 'Next experiment', get: () => ({ v: R.next ? R.next.id : 'a demo', sub: R.next ? R.next.kind : 'tests no bet', good: !!R.next, bad: !R.next }) },
      { label: 'Top open risk', get: () => ({ v: R.open.length ? String(R.open[0].s) : '—', sub: R.open.length ? `${R.open[0].id} ${R.open[0].short}` : '', bad: !st.observe }) },
    ];
    const labels = [
      { name: 'flow', t: 'The workflow now', d: 'Lamp: watched, document, said, guessed', icon: 'eye', atV: V(-2.65, 0.2, WZ + 0.16) },
      { name: 'bets', t: 'Five bets', d: 'Height: the risk if wrong', icon: 'target', atV: V(-2.4, 0.2, BZ + 0.18) },
      { name: 'demo', t: 'A demo first', d: 'Tests no bet', icon: 'info', atV: V(1.8, 0.2, BZ + 0.12), hide: () => !st.enthusiasm },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rely on interviews', hint: 'no observation', on: () => set({ ...D0, observe: false }), off: reset },
      { label: 'Test the feature everyone likes', hint: 'a confirmation demo', on: () => set({ ...D0, enthusiasm: true }), off: reset },
      { label: 'Ignore what can\'t be undone', hint: 'after testing A1', on: () => set({ ...D0, tested: true, irr: false }), off: reset },
    ];
    function status() {
      if (!st.observe) return { ok: false, msg: `<b>From interviews alone, no step has direct evidence, and nobody mentioned the paper notebook where the real counts live.</b> The riskiest bet, that the app\'s counts are right, isn\'t on the map at all, so the first experiment tests ${R.next.id} instead. Watch a shift: hidden state shows up in what people do, not what they say.` };
      if (st.enthusiasm) return { ok: false, msg: '<b>The team picked the WhatsApp ordering bot because everyone liked it, and the first experiment is a demo.</b> A demo shows the team can build the idea; it can\'t fail in a way that changes the plan. Test the highest open risk: A1, whether the app\'s counts match the shelves.' };
      if (!st.irr && st.tested) return { ok: false, msg: `<b>Without irreversibility in the score, A4 (clerks trust it, ${R.open[0].s}) jumps ahead of A2 (controlled medicines reach the pharmacist).</b> Learning A2 is wrong after launch means controlled medicines ordered without approval. One-way risks need evidence earlier: replay last month\'s orders read-only first.` };
      if (st.tested) return { ok: true, msg: `<b>A1 tested: ${BETS[0].found}.</b> That changes the build. The next highest open risk is ${R.next.id}, ${R.next.claim}; its experiment is a read-only replay, safe to run before any integration.` };
      return { ok: true, msg: `<b>Six steps reconstructed, four with direct evidence, including the notebook the interview missed; five bets scored; the next experiment tests A1 (${R.next.s}), with a stop threshold set before the result.</b>` };
    }
    return { update: dt => { bets.forEach(t => t.userData.tick(dt)); demo.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ask what they do', home: true, say: 'A pharmacy in Kumasi wants help reordering medicines. In interviews, the clerks describe five steps, and none of it is observed.', act: m => m.set({ observe: false, irr: true, enthusiasm: false, tested: false }) },
    { t: 'Watch a shift', home: true, say: 'Watching a closing shift shows a sixth step: the real counts go into a paper notebook. Nobody mentioned it.', act: m => m.set({ observe: true, irr: true, enthusiasm: false, tested: false }) },
    { t: 'Evidence has strength', home: true, say: 'Colour shows the evidence for each step: what was seen, what a record shows, what was said and what was guessed.', act: m => m.set({ observe: true, irr: true, enthusiasm: false, tested: false }) },
    { t: 'Bets, not features', home: true, say: 'Write the build as bets that could be false, and score each: impact times uncertainty, plus the cost of learning too late.', act: m => m.set({ observe: true, irr: true, enthusiasm: false, tested: false }) },
    { t: 'Test the riskiest', home: true, say: 'Compare the app with the notebook for a week. The counts differ, so the plan changes, and the next risk moves up.', act: m => m.set({ observe: true, irr: true, enthusiasm: false, tested: true }) },
    { t: 'One-way bets first', home: true, say: 'Controlled medicines must still reach the pharmacist. Because that is hard to undo, it is tested next, with a read-only replay.', act: m => m.set({ observe: true, irr: true, enthusiasm: false, tested: true }) },
  ],
  check: [
    { q: 'Which evidence proves what people do now?', options: ['An observation or a record', 'What they say they do', 'What the team infers'], answer: 0, why: 'Reported and inferred claims are labelled, not trusted.', hint: 'Look at the coloured strips.' },
    { q: 'Why was the notebook missed?', options: ['Interviews miss hidden state that observation shows', 'It wasn\'t important', 'The clerk lied'], answer: 0, why: 'People stop noticing steps they always do.', hint: 'Try Rely on interviews.' },
    { q: 'Why test A2 before A4 once A1 is done?', options: ['It is harder to undo if wrong', 'It scores lower', 'It is cheaper to build'], answer: 0, why: 'Irreversibility moves risks earlier.', hint: 'Try Ignore what can\'t be undone.' },
  ],
  terms: [
    ['Evidence ladder', 'Direct behaviour, artifact, reported behaviour, inference.'],
    ['Hidden state', 'Facts kept in memory, chat or a personal notebook.'],
    ['Assumption', 'A condition for the build to work, written so it could be false.'],
    ['Risk score', 'Here impact × uncertainty + irreversibility.'],
    ['Decisive experiment', 'A claim, a sample, a result and a threshold set beforehand.'],
    ['Confirmation ritual', 'A test that can only show the team can build it.'],
  ],
  deeper: '<p><b>Don\'t average variants.</b> A central shop and a branch may order differently for good reasons: different roles, risk or legacy process. Keep both until you know which.</p><p><b>The shape of the build follows uncertainty.</b> A read-only replay before a live integration; a suggestion a person approves before automatic ordering.</p><p><b>About this machine.</b> The steps, bets and scores are fixed; the evidence count, the ranking and the next experiment are computed live.</p>',
  code: {
    title: 'Rank the bets, test the riskiest',
    note: 'Adapted from the course\'s assumption map (code/main.py).',
    text: `
def risk_score(a):
    return a.impact * a.uncertainty + a.irreversibility   # each 1 to 5

def next_experiment(assumptions):
    open_items = [a for a in assumptions if not a.evidence]
    return max(open_items, key=risk_score, default=None)

def direct_ratio(steps):
    direct = [s for s in steps if s.evidence in ("direct", "artifact")]
    return len(direct) / len(steps)
`,
  },
};
