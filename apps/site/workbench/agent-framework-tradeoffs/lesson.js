// Agent framework trade-offs: a microfinance lender in Lilongwe has six jobs to automate and five ways to orchestrate them.
// Fit: each job needs some of eight things (approval, resume after a crash, branching, dialogue, roles, one agent with tools, parallel fan-out, tiny);
// each style supports each thing from 0 to 1 (set below from how the styles work); fit is the mean over what the job needs.
// Cost: model calls per run (the job's own calls plus routing calls: a crew manager or a chat speaker-picker spends one call per step, or the model routes a graph
// when "let the model route" is on); 1,500 tokens a working call, 600 a routing call, 10,000 runs a day, 5 US dollars a million tokens, shown in your currency.
const NEED = ['approval', 'resume', 'branch', 'dialogue', 'roles', 'single', 'fanout', 'tiny'];
const JOBS = [
  { n: 'Loan review', d: 'read documents, check credit and policy, an officer approves, write the letter; runs for days', need: ['approval', 'resume', 'branch'], calls: 5, steps: 5 },
  { n: 'Draft and critique', d: 'a writer drafts a loan-policy note, a critic pushes back, three rounds', need: ['dialogue'], calls: 6, steps: 6 },
  { n: 'Research, write, edit', d: 'a monthly market report passed from researcher to writer to editor', need: ['roles'], calls: 3, steps: 3 },
  { n: 'Help-desk agent', d: 'one assistant with balance and repayment tools, remembering the customer', need: ['single'], calls: 3, steps: 3 },
  { n: 'Summarise 40 reports', d: 'forty branch reports summarised at once, then merged', need: ['fanout'], calls: 41, steps: 2 },
  { n: 'Two calls and a tool', d: 'classify an email, look up the account, draft a reply', need: ['tiny'], calls: 2, steps: 2 },
];
const STYLES = [
  { n: 'Graph', ex: 'e.g. LangGraph', cap: [1, 1, 1, 0.6, 0.7, 0.6, 1, 0.3], route: 0, state: 'typed state with checkpoints', appr: 'built-in interrupt' },
  { n: 'Crew of roles', ex: 'e.g. CrewAI', cap: [0.4, 0.2, 0.5, 0.4, 1, 0.4, 0.2, 0.3], route: 1, state: 'strings passed between tasks', appr: 'a human-input step you add' },
  { n: 'Agent chat', ex: 'e.g. AutoGen', cap: [0.5, 0.3, 0.4, 1, 0.6, 0.4, 0.3, 0.3], route: 1, state: 'the chat transcript', appr: 'a person joins the chat' },
  { n: 'Single agent', ex: 'e.g. Agno', cap: [0.3, 0.6, 0.4, 0.3, 0.3, 1, 0.3, 0.6], route: 0, state: 'a session store', appr: 'none built in' },
  { n: 'Plain code', ex: 'your own loop', cap: [0.5, 0.3, 0.8, 0.5, 0.5, 0.7, 0.5, 1], route: 0, state: 'whatever you write', appr: 'whatever you write' },
];
const RUNS = 10000 * 30, PRICE = 5 / 1e6, WORK = 1500, ROUTE = 600;
function cell(si, ji, llmRoute) {
  const S = STYLES[si], J = JOBS[ji];
  const fit = J.need.reduce((a, k) => a + S.cap[NEED.indexOf(k)], 0) / J.need.length;
  const rcalls = (S.route || (llmRoute && si === 0) ? J.steps : 0);
  const calls = J.calls + rcalls, tokens = J.calls * WORK + rcalls * ROUTE;
  return { fit, calls, rcalls, tokens, month: tokens * PRICE * RUNS };
}

export default {
  slug: 'agent-framework-tradeoffs',
  title: 'Agent frameworks: match the shape of the job',
  description: 'A lender in Lilongwe has six jobs for agents and five ways to build them. Find the style that fits each job, and what routing costs.',
  money: true,
  overview: 'Agent frameworks differ in their core idea, the thing you would draw on a whiteboard. A graph framework draws a state machine: typed state, named steps, edges you write, checkpoints and interrupts built in. A crew framework draws an org chart: roles with goals pass work along, and a manager may decide who goes next. A chat framework draws a conversation: agents take turns until a stop condition, and the thinking emerges from the exchange. A single-agent framework draws one box with tools and memory. Plain code draws nothing at all. Pick the one whose idea matches the shape of the job: a long-running workflow with approvals needs durable state and interrupts; a proposer and critic are naturally a chat; a writing pipeline is naturally roles; a help desk is one agent with tools; and two calls and a tool need no framework. Two costs hide in the choice. When a model decides who acts next, every step pays for an extra routing call, which adds up at thousands of runs a day; when routing is code, it is free and auditable. And every framework is a dependency whose state model you will fight if it doesn\'t match what you need.',
  keywords: ['agent frameworks', 'LangGraph vs CrewAI', 'AutoGen', 'multi-agent orchestration', 'agent architecture', 'LLM routing', 'choosing an agent framework'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { job: 0, style: 0, llm: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the fit field: one tower per style (rows, front to back) and job (columns, left to right); taller and greener fits better */
    const X0 = -2.0, DX = 0.52, Z0 = -0.75, DZ = 0.4, SCOL = ['#2C2D31', '#7A5CC4', '#5B8DB8', '#C97B2E', '#8E8C84'];
    const pad = P.box(3.5, 0.02, 2.2, '#FFFFFF', { r: 0.03 }); pad.position.set(X0 + 2.5 * DX - 0.2, 0, Z0 + 2 * DZ); S.add(pad);
    STYLES.forEach((_, si) => { const m = P.box(0.22, 0.12, 0.3, SCOL[si], { r: 0.04 }); m.position.set(X0 - 0.48, 0, Z0 + si * DZ); S.add(m); });
    const cells = STYLES.map((_, si) => JOBS.map((_, ji) => { const t = P.tower(0.36, 0.26, GOOD, { size: 0.24 }); t.position.set(X0 + ji * DX, 0, Z0 + si * DZ); t.userData.set({ cap: '' }); S.add(t); return t; }));
    const ring = P.box(0.48, 0.03, 0.36, SAF, { r: 0.04 }); ring.userData.noFit = true; S.add(ring);
    /* the chosen pair: a wall of model-call blocks (coral: routing calls) and a tower for the monthly bill */
    const RX = 1.75, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const NCALL = 50, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NCALL); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const monTw = P.tower(0.5, 0.5, SAF, { size: 0.24 }); monTw.position.set(2.35, 0, 0.55); S.add(monTw);
    S.add(P.keep(-2.65, 2.75, 1.4, -1.0, 1.0));
    let C = null, clock = 0;
    const M = v => S.money.of(v), fc = f => f >= 0.8 ? GOOD : f >= 0.55 ? SAF : BAD;
    function calls() {
      const n = Math.min(NCALL, C.calls), shown = Math.min(n, Math.floor(clock * 8) + 1);
      for (let i = 0; i < NCALL; i++) {
        const on = i < shown && i < n, routing = i < C.calls && (C.rcalls && (i % Math.max(1, Math.round(C.calls / Math.max(1, C.rcalls))) === 0));
        dummy.position.set(RX + (i % 7) * 0.17, Math.floor(i / 7) * 0.13, -0.45); dummy.scale.set(on ? 0.15 : 0, on ? 0.12 : 0, on ? 0.26 : 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(routing ? BAD : CHAR));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    }
    function draw() {
      cells.forEach((row, si) => row.forEach((c, ji) => {
        const v = cell(si, ji, st.llm), sel = si === st.style && ji === st.job;
        c.userData.set({ h: 0.04 + 0.75 * v.fit, color: fc(v.fit), cap: sel ? `${Math.round(v.fit * 100)}` : '' });
      }));
      ring.position.set(X0 + st.job * DX, 0.005, Z0 + st.style * DZ);
      C = cell(st.style, st.job, st.llm);
      monTw.userData.set({ h: 0.05 + Math.min(1, C.month / 100000) * 1.2, cap: M(C.month), color: C.rcalls ? BAD : SAF });
      clock = 0; calls();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { cells.forEach(r => r.forEach(c => c.userData.tick(dt))); monTw.userData.tick(dt); if (clock * 8 > NCALL) return; clock += dt; calls(); };
    const controls = [
      { type: 'buttons', label: 'Job', options: JOBS.map(j => j.n), get: () => st.job, act: i => set({ job: i }) },
      { type: 'buttons', label: 'Style', options: STYLES.map(s => s.n), get: () => st.style, act: i => set({ style: i }) },
      { type: 'toggle', label: 'Let the model route the graph', short: 'Model routes', get: () => st.llm, set: v => set({ llm: !!v }) },
    ];
    const readouts = [
      { label: 'Fit', get: () => ({ v: `${Math.round(C.fit * 100)}`, sub: 'out of 100', good: C.fit >= 0.8, bad: C.fit < 0.55 }) },
      { label: 'Model calls', get: () => ({ v: `${C.calls}`, sub: C.rcalls ? `${C.rcalls} for routing` : 'per run' }) },
      { label: 'A month', get: () => ({ v: M(C.month), sub: 'at 10,000 runs a day' }) },
    ];
    const labels = [
      { name: 'map', t: 'The fit field', d: 'Rows: graph, crew, chat, single agent, plain code. Columns: the six jobs', icon: 'target', atV: V(X0 - 0.6, 0.12, Z0 + 2 * DZ) },
      { name: 'calls', t: 'Model calls a run', d: 'One block per call; coral ones only route', icon: 'box', atV: V(RX - 0.08, 0.06, -0.45) },
      { name: 'month', t: 'A month', d: 'At 10,000 runs a day', icon: 'money', atV: V(2.6, 0.3, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const best = ji => STYLES.map((_, si) => [cell(si, ji, false).fit, si]).sort((a, b) => b[0] - a[0])[0][1];
    const breaks = [
      { label: 'Chat agents for the loan review', hint: 'the popular demo, the wrong shape', on: () => set({ ...D0, style: 2 }), off: reset },
      { label: 'A framework for two calls', hint: 'a crew for a tiny job', on: () => set({ ...D0, job: 5, style: 1 }), off: reset },
      { label: 'Let the model route every step', hint: 'a graph, routed by the model', on: () => set({ ...D0, llm: true }), off: reset },
    ];
    function status() {
      const J = JOBS[st.job], b = best(st.job), B = cell(b, st.job, false);
      if (st.llm && st.style === 0) { const ex = cell(0, st.job, false); return { ok: false, msg: `<b>The model routes every step: ${C.calls} calls a run instead of ${ex.calls}, ${M(C.month)} a month instead of ${M(ex.month)}.</b> Where the next step follows from the state, a few lines of code route for free, the same way every time, and the route is easy to audit. Save model routing for choices code can't make.` }; }
      if (st.job === 0 && st.style === 2) return { ok: false, msg: `<b>Agent chat for a loan review: fit ${Math.round(C.fit * 100)}, and ${C.rcalls} extra calls a run just to pick who speaks next.</b> The application waits days for an officer, so it must survive restarts and pause for approval; a chat transcript is not durable workflow state, and the officer becomes one more voice in the chat. A graph with checkpoints and an interrupt fits: ${Math.round(B.fit * 100)}.` };
      if (st.job === 5 && st.style !== 4) return { ok: false, msg: `<b>${STYLES[st.style].n} for two calls and a tool: fit ${Math.round(C.fit * 100)}${C.rcalls ? `, and ${C.rcalls} routing calls on top of the ${J.calls} the job needs` : ''}.</b> Thirty lines of plain code with the provider's own library do this job; a framework adds a dependency, its own abstractions and sometimes extra calls. No framework is the cheapest framework.` };
      const good = C.fit >= 0.8;
      return { ok: good ? true : C.fit < 0.55 ? false : undefined, msg: `<b>${STYLES[st.style].n} for ${J.n.toLowerCase()}: fit ${Math.round(C.fit * 100)}.</b> ${good ? `Its core idea matches what the job needs (${J.need.map(k => ({ approval: 'approval', resume: 'resuming', branch: 'branching', dialogue: 'dialogue', roles: 'hand-offs', single: 'one agent with tools', fanout: 'fan-out', tiny: 'nothing extra' })[k]).join(', ')}); its state is ${STYLES[st.style].state}.` : `The best fit here is ${STYLES[b].n.toLowerCase()} (${Math.round(B.fit * 100)}). Pick the style whose whiteboard drawing looks like the job.`}${C.rcalls ? ` ${C.rcalls} of the ${C.calls} calls a run are routing.` : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Six jobs, five styles', home: true, say: 'A microfinance lender in Lilongwe has six jobs for agents and five ways to build them: a graph, a crew of roles, agents in a chat, one agent with tools, or plain code. Taller, greener blocks fit better.', act: m => m.set({ job: 0, style: 0, llm: false }) },
    { t: 'Loan review: a graph', home: true, say: 'A loan review runs for days and waits for an officer. It needs durable state and a pause for approval, which a graph with checkpoints gives you.', act: m => m.set({ job: 0, style: 0 }) },
    { t: 'The wrong shape', home: true, say: 'Build it as agents chatting, and the state is just a transcript, the officer is one more voice, and every turn pays a call to pick the next speaker.', act: m => m.set({ style: 2 }) },
    { t: 'Draft and critique: a chat', home: true, say: 'But a writer and a critic arguing over a draft is a conversation. Here the chat style fits best.', act: m => m.set({ job: 1, style: 2 }) },
    { t: 'Two calls: no framework', home: true, say: 'Two calls and a tool need no framework at all. Plain code is the best fit, and the cheapest.', act: m => m.set({ job: 5, style: 4 }) },
    { t: 'Who routes', home: true, say: 'Back on the loan review, let the model decide each next step, and every run pays extra calls. Where code can route, let code route.', act: m => m.set({ job: 0, style: 0, llm: true }) },
  ],
  check: [
    { q: 'A workflow waits days for a person\'s approval. What does it need most from a framework?', options: ['Durable state and a way to pause for approval', 'Agents that chat', 'Role descriptions'], answer: 0, why: 'Checkpoints and interrupts.', hint: 'Compare styles for the loan review.' },
    { q: 'What does letting a model pick the next step cost?', options: ['An extra model call on every step', 'Nothing', 'Lower accuracy always'], answer: 0, why: 'At thousands of runs a day, routing calls add up.', hint: 'Try Let the model route every step.' },
    { q: 'When is plain code the best choice?', options: ['When the job is a couple of calls and a tool', 'Never', 'When there are many agents'], answer: 0, why: 'A framework adds a dependency and abstractions for no gain.', hint: 'Look at the Two calls and a tool column.' },
  ],
  terms: [
    ['Orchestration', 'The part that decides which step, role or agent runs next.'],
    ['Explicit routing', 'Code or fixed edges choose the next step; cheap and auditable.'],
    ['Model routing', 'A model picks the next step each turn; flexible, but every choice is a call.'],
    ['Durable state', 'State that survives a crash or restart, in a checkpoint or session store.'],
    ['Crew', 'Agents with roles and goals that hand tasks to each other.'],
    ['Group chat', 'Several agents taking turns in one conversation, with a speaker chosen each turn.'],
  ],
  deeper: '<p><b>Draw it first.</b> Before choosing, sketch the job: a state machine, an org chart, a conversation, or one box with tools. Then ask who decides each branch (you, a manager agent, the conversation, or the agent\'s own tool choice) and what must survive a restart.</p><p><b>Patterns, not products.</b> Prompt chaining, routing, parallel workers, an orchestrator with workers, and an evaluator that sends work back can all be written in any framework, or none. Frameworks change quickly; the shapes don\'t.</p><p><b>Observability.</b> Whatever you pick, trace every model call and step with its inputs, outputs, tokens and time; most frameworks now export OpenTelemetry traces.</p><p><b>About this machine.</b> Fit scores come from a table of what each style supports, from 0 to 1, chosen from how each framework\'s core idea works; they are a guide to the reasoning, not a benchmark. Calls and cost are counted from the job\'s steps and the style\'s routing.</p>',
  code: {
    title: 'No framework: two calls and a tool',
    note: 'The plain-code baseline the course\'s framework lesson compares against.',
    text: `
def handle_email(text):
    kind = call_model(f"Classify as balance, repayment or other:\\n{text}").strip()
    account = lookup_account(extract_account_number(text))
    return call_model(
        f"Write a short, polite reply to this {kind} email.\\n"
        f"Account: {account.summary()}\\nEmail:\\n{text}"
    )
`,
  },
};
