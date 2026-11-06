// Exam prep, Agent SDK sessions: an invented engineering team in Kigali runs a long migration agent over a payments client. Durable state
// (manifest, artifact hashes, idempotency keys, test results) lives outside the conversation. The learner picks a situation and a session
// move (resume, fork, compact or a new session) and switches on revalidation, idempotency keys, an evidence store and a scoped reviewer brief.
// Each missing safeguard plants a concrete failure: an obsolete plan, a duplicate write, a dropped test failure, a reviewer that inherits
// the old assumption. Figures are illustrative.
const SIT = [
  { k: 'pause', n: 'short pause, same task', best: 'resume' },
  { k: 'long', n: 'long run, context filling', best: 'compact' },
  { k: 'alt', n: 'try a risky alternative', best: 'fork' },
  { k: 'goal', n: 'goal changed', best: 'new' },
];
const MOVE = { resume: 'resume', compact: 'compact', fork: 'fork', new: 'new session' };
const WHY = {
  resume: 'continuity is still valid',
  compact: 'size is the problem, not truth',
  fork: 'keep the original branch intact',
  new: 'stale context is the risk',
};

function run(o) {
  const s = SIT.find(x => x.k === o.sit);
  const issues = [], short = [];
  if (o.move !== s.best) { issues.push(`${MOVE[o.move]} does not fit: ${WHY[s.best]}, so ${MOVE[s.best]}`); short.push(`wrong move: ${MOVE[o.move]}`); }
  if (!o.revalidate) { issues.push('the dependency changed while it was paused, and the agent followed the obsolete plan'); short.push('obsolete plan'); }
  if (!o.idem) { issues.push('a write that had already succeeded before a timeout ran twice'); short.push('write ran twice'); }
  if (!o.evidence) { issues.push('compaction dropped the one failing test'); short.push('failing test lost'); }
  if (!o.scoped) { issues.push('the reviewer got the whole history and assumed the old dependency behaviour'); short.push('reviewer inherits\nold assumption'); }
  return { s, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-agent-sdk-sessions-subagents-and-context',
  title: 'Exam prep: sessions, subagents and context',
  description: 'A long migration agent pauses, resumes, forks and compacts. Pick the right session move, and keep what must survive outside the conversation.',
  overview: 'An agent\'s context is a working set for the next decisions, not the database of what has happened. Durable facts belong outside it: the task manifest and statuses, completed artifacts and their hashes, idempotency keys and external action IDs, approvals and their expiry, the last verified test results, open blockers and trace references. When a session starts or resumes, rebuild a compact current picture from that state. There are four session moves. Resume when the task, constraints and evidence are still valid and continuity helps, but revalidate the environment first: a session ID does not prove the world is unchanged. Fork when you want to explore an alternative without disturbing the original branch. Compact when context is growing but continuity still helps; compaction reduces size, it does not prove truth, and a summary can drop the one failure that matters, so keep large evidence in an external store and retain references. Start a new session when the goal or trust boundary changes or the inherited context is the risk, and brief it from authoritative state. A subagent should get one goal and scope, the minimum evidence, restricted tools, an output schema and a budget, not the parent\'s whole history; a fork alone is not independence. Hooks handle deterministic lifecycle work: gates before actions, normalisation and verification after, completion checks at stop. Every external write needs an idempotency key or a reconciliation step, because a timeout can lose the result of a write that succeeded. This machine follows an invented team in Kigali; the figures are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'agent sdk', 'sessions', 'resume', 'fork', 'compaction', 'subagents', 'idempotency', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.15, 0.3, -0.05], dir: [0.05, 1.05, 1.12], half: 1.15, wide: 4.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sit: 'pause', move: 'resume', revalidate: true, idem: true, evidence: true, scoped: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* durable state on a shelf outside the conversation: four tasks done, two to go, the write keys and the evidence */
    const shelf = P.shelf(3, { cell: 0.3, levels: 2, lh: 0.3, d: 0.4 }); shelf.position.set(-1.75, 0, -0.45); S.add(shelf);
    /* the session's context, a tank that fills up; a fork adds a second tank, a compact drains it, a new session starts nearly empty */
    const tank = P.tank(0.42, 0.85, 0.42, BLUE); tank.position.set(-0.35, 0, -0.45); S.add(tank);
    const fork = P.tank(0.42, 0.85, 0.42, '#7B6FA8'); fork.position.set(0.3, 0, -0.45); S.add(fork);
    const pipe = P.pipe([V(-1.2, 0.3, -0.45), V(-0.85, 0.5, -0.45), V(-0.56, 0.4, -0.45)], GOOD, { r: 0.028, n: 4 }); S.add(pipe);
    /* the reviewer: a narrow brief from the shelf, or the whole history from the tank */
    const rev = P.robot('#7B6FA8', { scale: 0.6 }); rev.position.set(1.25, 0, -0.45); S.add(rev);
    const brief = P.box(0.3, 0.05, 0.36, '#F4F1EA', { r: 0.02 }); brief.position.set(1.25, 0, 0.05); S.add(brief);
    const whole = P.rod(V(-0.14, 0.3, -0.45), V(1.05, 0.3, -0.45), 0.03, BAD); S.add(whole);
    /* five lamps: right move, revalidated, write keys, evidence kept, scoped reviewer */
    const CH = ['move', 'revalidate', 'idem', 'evidence', 'scoped'];
    const lamps = CH.map((k, i) => { const l = P.lamp(GOOD, { h: 0.16, r: 0.09 }); l.position.set(-1.5 + i * 0.6, 0, 0.55); S.add(l); return l; });
    S.add(P.keep(-2.3, 1.75, 1.0, -0.9, 0.85));

    let R = null;
    function draw() {
      R = run(st);
      shelf.userData.set({ fill: [GOOD, GOOD, GOOD, GOOD, st.idem ? SAF : BAD, st.evidence ? SAF : BAD] });
      const lv = { resume: 0.55, compact: 0.3, fork: 0.55, new: 0.08 }[st.move] + (st.sit === 'long' && st.move !== 'compact' && st.move !== 'new' ? 0.42 : 0);
      tank.userData.set({ level: lv, color: st.revalidate && st.evidence ? BLUE : BAD });
      fork.visible = st.move === 'fork'; fork.userData.set({ level: lv });
      pipe.userData.set({ on: st.revalidate, color: st.revalidate ? GOOD : BAD });
      brief.visible = !!st.scoped; whole.visible = !st.scoped;
      rev.userData.set({ color: st.scoped ? '#7B6FA8' : BAD });
      [st.move === R.s.best, st.revalidate, st.idem, st.evidence, st.scoped].forEach((ok, i) => lamps[i].userData.set({ color: ok ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Situation', options: SIT.map(s => s.n.split(',')[0]), get: () => SIT.findIndex(s => s.k === st.sit), act: i => set({ sit: SIT[i].k, move: SIT[i].best }) },
      { type: 'buttons', label: 'Session move', options: Object.values(MOVE), get: () => Object.keys(MOVE).indexOf(st.move), act: i => set({ move: Object.keys(MOVE)[i] }) },
      { type: 'toggle', label: 'Revalidate before continuing', short: 'Revalidate', get: () => st.revalidate, set: v => set({ revalidate: !!v }) },
      { type: 'toggle', label: 'Idempotency key on writes', short: 'Write keys', get: () => st.idem, set: v => set({ idem: !!v }) },
      { type: 'toggle', label: 'Evidence store outside the summary', short: 'Evidence store', get: () => st.evidence, set: v => set({ evidence: !!v }) },
      { type: 'toggle', label: 'Scoped brief for the reviewer', short: 'Scoped reviewer', get: () => st.scoped, set: v => set({ scoped: !!v }) },
    ];
    const readouts = [
      { label: 'Best move', get: () => ({ v: MOVE[R.s.best], sub: R.s.n, good: st.move === R.s.best, bad: st.move !== R.s.best }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'planted failures that got through', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 's', t: 'Durable state', d: 'Outside the conversation', icon: 'box', atV: V(-2.22, 0.3, -0.45) },
      { name: 't', t: 'What happens next', d: 'Lamps: move, facts, keys, evidence, brief', icon: 'target', atV: V(1.42, 0.3, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Resume without revalidating', hint: 'the world moved on', on: () => set({ ...D0, revalidate: false }), off: reset },
      { label: 'Retry a write without a key', hint: 'it already succeeded', on: () => set({ ...D0, idem: false }), off: reset },
      { label: 'Compact without an evidence store', hint: 'size, not truth', on: () => set({ ...D0, sit: 'long', move: 'compact', evidence: false }), off: reset },
      { label: 'Hand the reviewer the whole history', hint: 'a fork is not independence', on: () => set({ ...D0, scoped: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Situation: ${R.s.n}. ${MOVE[R.s.best].replace(/^./, c => c.toUpperCase())} fits: ${WHY[R.s.best]}.</b> The working set is rebuilt from durable state, checked against the current environment, every write carries a key, evidence sits outside the summary and the reviewer gets only the diff, requirements, tests and rubric.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Context is a working set; durable state, keys and evidence live outside it.` };
    }
    return { update: dt => { tank.userData.tick(dt); fork.userData.tick(dt); pipe.userData.tick(dt); rev.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A long migration', home: true, say: 'A migration agent runs for hours, and its context fills with plans, logs and summaries.', act: m => m.set({ sit: 'pause', move: 'resume', revalidate: false, idem: false, evidence: false, scoped: false }) },
    { t: 'Revalidate on resume', home: true, say: 'A session ID does not prove the world is unchanged. Check the dependency before continuing.', act: m => m.set({ sit: 'pause', move: 'resume', revalidate: true, idem: false, evidence: false, scoped: false }) },
    { t: 'Key every write', home: true, say: 'A timeout can hide a write that succeeded. Reconcile the key before trying again.', act: m => m.set({ sit: 'pause', move: 'resume', revalidate: true, idem: true, evidence: false, scoped: false }) },
    { t: 'Compaction is size', home: true, say: 'A summary can drop the one failing test. Keep evidence in a store and keep references.', act: m => m.set({ sit: 'long', move: 'compact', revalidate: true, idem: true, evidence: true, scoped: false }) },
    { t: 'A scoped reviewer', home: true, say: 'Give the reviewer the diff, requirements, tests and rubric, not the whole history.', act: m => m.set({ sit: 'long', move: 'compact', revalidate: true, idem: true, evidence: true, scoped: true }) },
    { t: 'Pick the move', home: true, say: 'Resume for valid continuity, fork for alternatives, and start fresh when the goal changes.', act: m => m.set({ sit: 'goal', move: 'new', revalidate: true, idem: true, evidence: true, scoped: true }) },
  ],
  check: [
    { q: 'What does compaction do?', options: ['Reduces size, without proving the facts are current', 'Makes the session durable', 'Validates every test result'], answer: 0, why: 'Compaction addresses size, not truth.', hint: 'Try Compact without an evidence store.' },
    { q: 'Before resuming a paused session, what should happen?', options: ['Revalidate the current environment', 'Nothing: the session ID is enough', 'Rerun every past step'], answer: 0, why: 'The world may have moved on.', hint: 'Try Resume without revalidating.' },
    { q: 'Why does every external write need a key?', options: ['A timeout can hide a write that already succeeded', 'Keys speed up writes', 'Keys replace approvals'], answer: 0, why: 'Reconcile before retrying.', hint: 'Try Retry a write without a key.' },
  ],
  practice: [
    { q: 'The task\'s goal has changed and the old context is full of obsolete assumptions. Which session move fits?', options: ['A new session briefed from durable state', 'Resume the old session', 'Compact the old session', 'Fork the old session'], answer: 0, why: 'Stale context is the risk.' },
    { q: 'A team wants to try a risky alternative migration without disturbing the current branch. Which move?', options: ['Fork', 'Resume', 'Compact', 'Delete the session'], answer: 0, why: 'A fork keeps the original intact.' },
    { q: 'Where should approvals, artifact hashes and idempotency keys live?', options: ['In durable state outside the conversation', 'Only in the conversation history', 'In the compaction summary', 'In the system prompt'], answer: 0, why: 'Session is not state.' },
    { q: 'A reviewer is created by forking the writer\'s session. Why might it still not be independent?', options: ['It inherits the writer\'s evidence and assumptions', 'Forks cannot use tools', 'Forks are always smaller models', 'It is independent by definition'], answer: 0, why: 'A fork is not independence.' },
    { q: 'Which job belongs in a hook rather than in the model?', options: ['Blocking writes outside the declared scope', 'Judging whether a design is elegant', 'Writing the summary of findings', 'Choosing an architecture'], answer: 0, why: 'Hooks are for deterministic gates.' },
    { q: 'A CI run reuses an interactive session from yesterday. What is the risk?', options: ['Unstated state from that session leaks into the run', 'CI cannot read sessions', 'It is always faster', 'None'], answer: 0, why: 'CI starts clean from declared inputs.' },
  ],
  terms: [
    ['Working set', 'What the next decisions need; not the record of everything.'],
    ['Durable state', 'Manifest, hashes, keys, approvals and test results kept outside the chat.'],
    ['Resume packet', 'A compact brief of current truth: goal, scope, done, gaps, next action.'],
    ['Fork', 'A copy of a session for exploring an alternative.'],
    ['Compaction', 'Summarising context to save space; it does not prove freshness.'],
    ['Idempotency key', 'A unique key that lets a repeated write be recognised and skipped.'],
  ],
  deeper: '<p><b>Context budgets.</b> Spend the window on the goal and hard constraints, the current plan, recent evidence and the output contract; keep raw logs behind references.</p><p><b>Hooks, small and named.</b> Keep each hook tied to one invariant so behaviour stays easy to debug.</p><p><b>About this machine.</b> The team and figures are invented.</p>',
  code: {
    title: 'Resume from durable state, not from memory',
    note: 'Written for this lesson.',
    text: `
def resume(task_id):
    state = store.load(task_id)                     # manifest, hashes, keys, tests
    env = inspect(state.scope)                      # files, branch, dependency versions
    stale = [a for a in state.assumptions if not a.holds(env)]
    if stale or state.goal_changed:
        return new_session(brief=packet(state, env, stale))
    for w in state.pending_writes:                  # a timeout may hide a success
        if lookup(w.key) == "done":
            state.mark_done(w)
    return continue_session(packet(state, env, []))

def review(diff):
    return run_agent("reviewer", {"diff": diff, "requirements": REQS,
                     "tests": evidence.refs(diff), "rubric": RUBRIC},
                     tools=["read"], fresh_context=True)
`,
  },
};
