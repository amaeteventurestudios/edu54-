// Exam prep, tool loops: an invented water utility in Kigali lets members ask an assistant to check and pay their bills. Claude proposes tool
// calls; the application validates each against its schema, authorises it against policy for the signed-in member, executes it with an
// idempotency key, and returns failures as structured results. The loop stops on budgets and repeated calls. Four events from one session are
// traced with and without each control.
const EVENTS = [
  { n: 'Claude proposes pay_bill for account 77', note: 'the signed-in member owns account 12' },
  { n: 'pay_bill times out and is retried', note: 'the first attempt actually went through' },
  { n: 'lookup_meter fails', note: 'the meter service is down for maintenance' },
  { n: 'search_help is called again and again', note: 'same query, same result, every turn' },
];
function session(o) {
  return [
    o.authorise ? { ok: true, what: 'validated, then denied by policy:\naccount 77 is not this member\'s' } : { ok: false, what: 'executed because Claude chose it:\nanother member\'s bill was paid' },
    o.idem ? { ok: true, what: 'retry carries the same key:\nthe payment happens once' } : { ok: false, what: 'retry runs again:\nthe member is charged twice' },
    o.errors ? { ok: true, what: 'returns {error: "maintenance", retryable: false}:\nClaude tells the member and stops' } : { ok: false, what: 'returns "Error": Claude retries\nfive times and then guesses a reading' },
    o.budget ? { ok: true, what: 'third identical call stops the loop:\nhanded to a person with the trace' } : { ok: false, what: 'no limit: the loop runs until\nthe token budget is gone' },
  ];
}

export default {
  slug: 'exam-tool-use-and-agentic-loops',
  title: 'Exam prep: a tool loop is controlled delegation',
  description: 'A water utility\'s assistant checks and pays members\' bills. Every tool call is a proposal: trace four events through the loop that keeps it safe.',
  overview: 'In a tool loop, Claude does not act; it proposes. Each tool_use block is a request that your application may grant or refuse, so tool selection is never authorisation. The application validates the input against the tool\'s schema, then checks policy for this user and this resource, and only then executes, in that order. A loop has explicit states: call the model, read the stop reason, validate and authorise each proposed call, execute, append correlated results, and continue or stop. Tools are interfaces for a model, so give them narrow, distinct names and descriptions that say when each applies, keep the catalogue small, and make inputs strict. Side effects need protection against retries: a payment, an email or a deployment should carry an idempotency key or be reconciled, because a timed-out request may already have succeeded. Failures should come back as results the model can reason about, such as an error category, whether retrying could help and a safe next step, rather than a bare failure that invites blind retries or an invented answer. Parallel calls are fine when they are independent and order does not matter. Bound the agent: limits on turns, tokens, time and money, detection of repeated identical calls, cancellation, and failing closed on unrecognised states, with a handoff to a person carrying the trace. Not every task needs an agent: when the path is known, a deterministic workflow is simpler and easier to test. Evaluate the trajectory and the final state, which tools were called, with what arguments and what changed, not only the final prose. SDK helpers can run the loop for you, but authorisation, idempotency and limits remain your responsibility. This machine traces an invented utility\'s assistant in Kigali.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'tool use', 'agent loop', 'authorisation', 'idempotency', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.05, 0.25, 0], dir: [0.05, 1.15, 1.05], half: 1.2, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { authorise: true, idem: true, errors: true, budget: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* the loop itself: Claude in the middle, five stations on a ring (propose, validate, authorise, execute, result) with calls flowing round; without limits it races and turns coral */
    const CX = -1.1, RR = 0.85, AT = a => V(CX + Math.cos(a) * RR, 0.14, Math.sin(a) * RR);
    const ring = P.pipe(Array.from({ length: 13 }, (_, i) => AT(i / 12 * Math.PI * 2)), BLUE, { r: 0.03, n: 8 }); S.add(ring);
    const bot = P.robot('#5B6CC4', { scale: 0.6 }); bot.position.set(CX, 0, 0); S.add(bot);
    const stn = ['#5B6CC4', '#3E9B9B', GOOD, GOOD, '#3E9B9B'].map((c, i) => { const p = AT(-Math.PI / 2 + i / 5 * Math.PI * 2), m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.34, 0.3, 0.3, '#fff', { r: 0.05, material: m }); b.position.set(p.x, 0, p.z); S.add(b); return m; });
    /* what each event leaves behind: the two accounts, the payments taken, the outage reply and the budget, each with a lamp in front */
    const EX = i => 0.45 + i * 0.68, EZ = -0.45;
    const acct = [0, 1].map(i => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.22, 0.42, 0.42, '#fff', { r: 0.03, material: m }); b.position.set(EX(0) - 0.13 + i * 0.26, 0, EZ); S.add(b); return m; });
    const paid = P.stack(0.4, 0.4, 0.14, { max: 2, color: '#E3A72F' }); paid.position.set(EX(1), 0, EZ); S.add(paid);
    const guess = P.stack(0.4, 0.4, 0.1, { max: 5, color: BAD }); guess.position.set(EX(2), 0, EZ); S.add(guess);
    const note = P.box(0.42, 0.06, 0.42, '#F4F1EA', { r: 0.02 }); note.position.set(EX(2), 0, EZ); S.add(note);
    const tank = P.tank(0.4, 0.72, 0.4, SAF); tank.position.set(EX(3), 0, EZ); S.add(tank);
    const lamps = [0, 1, 2, 3].map(i => { const l = P.lamp(GOOD, { h: 0.14, r: 0.09 }); l.position.set(EX(i), 0, 0.2); S.add(l); return l; });
    S.add(P.keep(-2.3, 2.7, 1.0, -1.1, 1.05));

    let R = null;
    function draw() {
      R = session(st);
      R.forEach((r, i) => lamps[i].userData.set({ color: r.ok ? GOOD : BAD, on: true }));
      stn[2].color.set(st.authorise ? GOOD : OFF); stn[3].color.set(st.idem ? GOOD : SAF);
      acct[1].color.set(st.authorise ? OFF : BAD);
      paid.userData.set({ n: st.idem ? 1 : 2 });
      note.visible = !!st.errors; guess.visible = !st.errors; guess.userData.set({ n: 5 });
      tank.userData.set({ level: st.budget ? 0.2 : 1.1 });
      ring.userData.set({ color: st.budget ? BLUE : BAD, speed: st.budget ? 0.3 : 1.1 });
      bot.userData.set({ busy: !st.budget });
    }
    function isOk() { return R.every(r => r.ok); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Validate, then authorise, then execute', short: 'Authorise', get: () => st.authorise, set: v => set({ authorise: !!v }) },
      { type: 'toggle', label: 'Idempotency key on side effects', short: 'Idempotent', get: () => st.idem, set: v => set({ idem: !!v }) },
      { type: 'toggle', label: 'Return errors as structured results', short: 'Errors as data', get: () => st.errors, set: v => set({ errors: !!v }) },
      { type: 'toggle', label: 'Limits on turns, time and repeats', short: 'Limits', get: () => st.budget, set: v => set({ budget: !!v }) },
    ];
    const readouts = [
      { label: 'Handled safely', get: () => ({ v: `${R.filter(r => r.ok).length} of 4`, sub: 'events', good: isOk(), bad: !isOk() }) },
      { label: 'Payments', get: () => ({ v: !st.authorise ? 'wrong account' : st.idem ? 'once' : 'twice', sub: 'pay_bill', good: st.authorise && st.idem, bad: !st.authorise || !st.idem }) },
      { label: 'Loop', get: () => ({ v: st.budget ? 'stopped' : 'unbounded', sub: 'repeated calls', good: st.budget, bad: !st.budget }) },
    ];
    const labels = [
      { name: 'l', t: 'The tool loop', d: 'Propose, check, run, report', icon: 'link', atV: V(-1.95, 0.14, 0) },
      { name: 't', t: 'Four events', d: 'Accounts, payments, outage, budget', icon: 'target', atV: V(EX(3) + 0.21, 0.3, EZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Execute whatever Claude chooses', hint: 'selection is not authorisation', on: () => set({ ...D0, authorise: false }), off: reset },
      { label: 'Retry payments without a key', hint: 'charged twice', on: () => set({ ...D0, idem: false }), off: reset },
      { label: 'Return a bare "Error"', hint: 'blind retries, guessed answers', on: () => set({ ...D0, errors: false, budget: false }), off: reset },
    ];
    function status() {
      const bad = R.map((r, i) => r.ok ? null : `${EVENTS[i].n}: ${r.what.replace('\n', ' ')}`).filter(Boolean);
      if (!bad.length) return { ok: true, msg: '<b>The payment for someone else\'s account is denied by policy, the retried payment happens once, the outage comes back as a structured error Claude can explain, and the repeating search is stopped and handed to a person.</b> Claude proposed every call; the application decided.' };
      return { ok: false, msg: `<b>${bad.join('. ')}.</b> ${!st.authorise ? 'Tool selection is a proposal: validate the schema, then authorise against policy, then execute.' : !st.idem ? 'A timed-out side effect may already have happened: key it or reconcile before retrying.' : !st.errors ? 'Return the error category, whether a retry could help and a safe next step.' : 'Bound the loop on turns, time and repeated identical calls.'}` };
    }
    return { update: dt => { ring.userData.tick(dt); bot.userData.tick(dt); tank.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Claude proposes', home: true, say: 'A utility\'s assistant uses tools to check and pay bills. Every tool call is a proposal.', act: m => m.set({ authorise: false, idem: false, errors: false, budget: false }) },
    { t: 'Authorise', home: true, say: 'Validate the input, then check policy for this member, then run it. Another member\'s bill is refused.', act: m => m.set({ authorise: true, idem: false, errors: false, budget: false }) },
    { t: 'Retries', home: true, say: 'A timed-out payment may have gone through. An idempotency key makes the retry harmless.', act: m => m.set({ authorise: true, idem: true, errors: false, budget: false }) },
    { t: 'Errors as results', home: true, say: 'Tell Claude what failed and whether retrying can help, and it explains instead of guessing.', act: m => m.set({ authorise: true, idem: true, errors: true, budget: false }) },
    { t: 'Limits', home: true, say: 'The same search, again and again: stop on repeats and budgets, and hand over to a person.', act: m => m.set({ authorise: true, idem: true, errors: true, budget: true }) },
    { t: 'Controlled delegation', home: true, say: 'Claude proposes; the application validates, authorises, runs once and stops in time.', act: m => m.set({ authorise: true, idem: true, errors: true, budget: true }) },
  ],
  check: [
    { q: 'Claude selects a tool. Does that authorise the call?', options: ['No: validate, then check policy, then execute', 'Yes', 'Only for read tools'], answer: 0, why: 'Selection is a proposal.', hint: 'Try Execute whatever Claude chooses.' },
    { q: 'A payment call times out. What must be true before retrying?', options: ['The call is idempotent or reconciled', 'Nothing', 'The model agrees'], answer: 0, why: 'It may already have happened.', hint: 'Try Retry payments without a key.' },
    { q: 'What should a failing tool return?', options: ['A structured error with whether retrying could help', 'The word "Error"', 'Nothing'], answer: 0, why: 'So Claude can act sensibly.', hint: 'Try Return a bare "Error".' },
  ],
  practice: [
    { q: 'A tool call includes an account id taken from a customer\'s message. What must the application do before executing?', options: ['Validate the input and authorise it against the signed-in user\'s permissions', 'Execute it, since Claude chose it', 'Ask Claude if it is sure', 'Log it and execute'], answer: 0, why: 'Validate, then authorise, then execute.' },
    { q: 'An agent keeps calling the same search with the same arguments. What control applies?', options: ['Detect repeated calls and stop or hand over within a turn budget', 'Increase the token budget', 'Add more tools', 'Lower the temperature'], answer: 0, why: 'Bound the loop.' },
    { q: 'The steps of a task are always the same three calls in the same order. Which design fits?', options: ['A deterministic workflow', 'An open-ended agent', 'A multi-agent system', 'A larger model'], answer: 0, why: 'Prefer a workflow when the path is known.' },
    { q: 'Two lookups do not depend on each other. Can they run in parallel?', options: ['Yes, independent calls whose order does not matter can', 'Never', 'Only if they write data', 'Only with one tool'], answer: 0, why: 'Parallelise only independent calls.' },
    { q: 'How should an agent run be evaluated?', options: ['By its trajectory and final state, not just the final message', 'By the final message only', 'By its length', 'By how confident it sounded'], answer: 0, why: 'What it called and what changed.' },
    { q: 'An SDK helper runs the tool loop automatically. What remains the application\'s job?', options: ['Authorisation, idempotency and limits', 'Nothing', 'Only logging', 'Only the prompt'], answer: 0, why: 'Helpers run the loop; they do not grant permission.' },
  ],
  terms: [
    ['Tool call', 'A request from Claude, with arguments, for the application to run a tool.'],
    ['Authorisation', 'Checking policy for this user and resource before executing.'],
    ['Idempotency', 'A retried action has the same effect as one attempt.'],
    ['Structured error', 'A failure with a category, a retryable flag and a next step.'],
    ['Loop budget', 'Limits on turns, time, tokens and repeated calls.'],
    ['Trajectory', 'The sequence of tool calls and results in a run.'],
  ],
  deeper: '<p><b>Where tools run.</b> Some tools execute on the provider\'s servers, others in your client; know which side owns each call\'s side effects and logs.</p><p><b>Skills and MCP.</b> A skill packages a procedure and MCP connects a server; neither grants authorisation.</p><p><b>About this machine.</b> The utility and its accounts are invented.</p>',
  code: {
    title: 'Validate, authorise, execute once',
    note: 'Written for this lesson.',
    text: `
def handle_tool_call(call, member, seen, limits):
    if seen.count((call.name, call.input)) >= 2 or limits.exceeded():
        return handoff("loop stopped", trace=seen)
    seen.append((call.name, call.input))
    errors = TOOLS[call.name].schema.errors(call.input)
    if errors:
        return {"error": "invalid_input", "detail": errors, "retryable": True}
    if not policy.allows(member, call.name, call.input):          # selection is not permission
        return {"error": "not_permitted", "retryable": False}
    try:
        return TOOLS[call.name].run(call.input, idempotency_key=call.id)
    except ServiceDown as e:
        return {"error": "unavailable", "retryable": False, "next": "tell the member"}
`,
  },
};
