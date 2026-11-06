// Capstone, the whole tool stack in one request: a policy research institute in Dakar asks its assistant for "a brief on agent-to-agent protocols, with sources".
// The path: gateway (token audience and scope) → research MCP server (server/discover, then tools/call paper_search) → A2A hand-off to a writer agent (opaque)
// → tools/call generate_report becomes a task (polled) → the report comes back with a ui:// view → the assistant answers. Every hop carries the trace context.
// Inject one fault at a time and see which layer absorbs it: the writer asks for input; the report job runs 4 minutes; the token lacks the report scope;
// the search server is cold (19 s). Each layer's correct behaviour can be switched off.
const FAULTS = ['None', 'Writer asks for input', 'Report job runs long', 'Token lacks report scope', 'Search server is cold'];
function run(st) {
  const f = st.fault, S = [];
  let t = 0, ok = true;
  const step = (name, dt, note, bad) => { t += dt; S.push({ name, t, note, bad }); if (bad) ok = false; };
  step('Gateway: token audience research-mcp ✓ · scopes ' + (f === 3 ? 'search' : 'search, report'), 0.1, 'decided fresh for this request');
  step('server/discover', 0.15, 'versions 2026-07-28 · tools, resources, tasks and ui extensions');
  if (f === 4) step('tools/call paper_search', 19.2, st.trace ? 'slow: the trace shows the search server\'s cold start (18.6 s)' : 'slow: 19 s, and the trace stops at the call; nobody can see why', !st.trace);
  else step('tools/call paper_search', 0.8, '14 papers, 6 picked');
  if (f === 1) {
    if (st.a2aInput) step('A2A SendMessage → writer agent', 6.5, 'INPUT_REQUIRED: "English or French?" · the assistant asks the user, replies on the same task · COMPLETED');
    else { step('A2A SendMessage → writer agent', 2.0, 'INPUT_REQUIRED treated as failure: no draft', true); return { S, t, ok }; }
  } else step('A2A SendMessage → writer agent', 5.0, 'draft summary artifact (the writer\'s internals stay hidden)');
  if (f === 3) {
    if (st.stepUp) step('tools/call generate_report', 9.0, '403 insufficient_scope · the user approves "report" · new token · retried with a new id');
    else { step('tools/call generate_report', 0.2, '403 insufficient_scope shown to the user as "something went wrong"', true); return { S, t, ok }; }
  }
  if (f === 2) {
    if (st.poll) step('generate_report → task, polled every 5 s', 240, 'working… working… completed with the report');
    else { step('generate_report, waited on as one request', 60, 'the request timed out at 60 s; the job finished later, unseen', true); return { S, t, ok }; }
  } else step('generate_report → task, polled', 12, 'completed with the report');
  step('ui://research/brief.html', 0.3, 'shown in a sandboxed view, with plain text for text-only hosts');
  step('final answer', 1.2, 'brief with 6 sources');
  return { S, t, ok };
}

export default {
  slug: 'capstone-tool-ecosystem',
  title: 'Capstone: one request through the whole tool stack',
  description: 'A Dakar policy institute asks its assistant for a sourced brief. One request crosses a gateway, MCP, A2A, a task and an app view.',
  overview: 'Each lesson in this part covered one contract. Real requests cross all of them, and the joins are where systems fail. Here, one request from a research assistant first meets a gateway that checks the token is for this server and has the right scopes, deciding afresh. The MCP server is discovered, then its search tool is called with a self-contained request. Summaries are handed to a writer agent at another firm through A2A, which may pause with a question and keeps its inner workings to itself. The report is a long job, so the server returns a task to poll instead of holding a request open. It comes back with a ui:// view the host renders in a sandbox, with plain text for hosts that can\'t. And every hop carries the trace context, so a slow step has a name. Each layer has a failure it exists to absorb: a missing scope becomes a consent step, a question from the writer becomes a reply on the same task, a long job becomes polling, a cold server shows up in the trace. Switch any layer\'s behaviour off, and its fault reaches the user.',
  keywords: ['agent tool ecosystem', 'MCP', 'A2A', 'OAuth scopes', 'MCP tasks', 'OpenTelemetry', 'capstone'],
  orient: 'landscape',
  view: { target: [-0.95, 0.4, 0.15], dir: [0.4, 0.85, 1.3], half: 1.55, wide: 4.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fault: 0, a2aInput: true, poll: true, stepUp: true, trace: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the stack as a path of stations: assistant, gateway, MCP server, search, writer agent (closed box), report task (a dial), app view (a glass box) */
    const PTS = [[-2.4, -0.7], [-1.45, -0.7], [-0.5, -0.7], [-0.5, 0.25], [-1.45, 0.25], [-2.4, 0.25], [-2.4, 1.0]];
    const bot = P.robot('#5B8DB8', { scale: 0.9 }); bot.position.set(PTS[0][0], 0, PTS[0][1]); S.add(bot);
    const mk = (i, w, h, d, c) => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(w, h, d, '#fff', { r: 0.05, material: mm }); b.position.set(PTS[i][0], 0, PTS[i][1]); S.add(b); return mm; };
    const nodes = [null, mk(1, 0.2, 0.6, 0.6, CHAR), mk(2, 0.6, 0.45, 0.45, '#5B6A7E'), mk(3, 0.6, 0.3, 0.35, '#A87A4F'), mk(4, 0.55, 0.55, 0.55, '#1A1B20'), mk(5, 0.5, 0.12, 0.5, '#9A968C'), null];
    const dial = P.dial(0.22); dial.position.set(PTS[5][0], 0.13, PTS[5][1]); S.add(dial);
    const viewG = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.4, depthWrite: false })); viewG.position.set(PTS[6][0], 0.18, PTS[6][1]); S.add(viewG);
    const viewM = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), viewIn = P.box(0.35, 0.15, 0.2, '#fff', { r: 0.02, material: viewM }); viewIn.position.set(PTS[6][0], 0.02, PTS[6][1]); S.add(viewIn);
    /* the trace: a purple thread linking every hop, broken into pieces when context isn't passed on */
    const thread = []; for (let i = 0; i < PTS.length - 1; i++) { const [x1, z1] = PTS[i], [x2, z2] = PTS[i + 1], dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz); const mm = new THREE.MeshLambertMaterial({ color: '#7B6FA8' }), e = P.box(len, 0.04, 0.06, '#fff', { r: 0.01, material: mm }); e.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2); e.rotation.y = -Math.atan2(dz, dx); S.add(e); thread.push(e); }
    const pkt = P.ball(0.09, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); pkt.userData.noFit = true; S.add(pkt);
    const timeTw = P.tower(0.5, 0.5, SAF, { size: 0.28 }), okLamp = P.lamp(GOOD, { h: 0.7, r: 0.12 });
    timeTw.position.set(0.6, 0, 0.6); okLamp.position.set(0.6, 0, -0.4); S.add(timeTw, okLamp);
    S.add(P.keep(-2.85, 0.95, 1.2, -1.0, 1.3));

    let R = null, k = 0, clock = 0;
    const node = name => /Gateway/.test(name) ? 1 : /discover/.test(name) ? 2 : /paper_search/.test(name) ? 3 : /A2A/.test(name) ? 4 : /generate_report|task/.test(name) ? 5 : /ui:|view/.test(name) ? 6 : 0;
    function show() {
      nodes.forEach((mm, i) => mm && mm.color.set(i === 1 ? CHAR : i === 2 ? '#5B6A7E' : i === 3 ? '#A87A4F' : i === 4 ? '#1A1B20' : '#9A968C'));
      const cur = R.S[k]; if (!cur) return;
      const n = node(cur.name); if (nodes[n]) nodes[n].color.set(cur.bad ? BAD : GOOD);
      viewM.color.set(n === 6 || k === R.S.length - 1 ? (R.ok ? GOOD : '#D9D4C7') : '#D9D4C7');
      dial.userData.set({ v: n === 5 ? 0.8 : 0.1 });
      const p = PTS[n]; pkt.position.set(p[0], 0.85, p[1]); pkt.material.color.set(cur.bad ? RED : SAF);
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      thread.forEach((e, i) => { e.visible = st.trace || i % 2 === 0; });
      timeTw.userData.set({ h: 0.05 + Math.min(1, R.t / 60) * 1.1, cap: `${R.t.toFixed(0)} s`, color: R.ok ? SAF : RED });
      okLamp.userData.set({ color: R.ok ? GOOD : RED, on: true });
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { bot.userData.tick(dt); bot.userData.set({ busy: true }); dial.userData.tick(dt); timeTw.userData.tick(dt); clock += dt; if (clock >= 1.2) { clock -= 1.2; if (k < R.S.length - 1) { k++; show(); } } };
    const controls = [
      { type: 'buttons', label: 'Inject a fault', options: FAULTS, get: () => st.fault, act: i => set({ fault: i }) },
      { type: 'toggle', label: 'Answer the writer\'s questions', short: 'A2A input', get: () => st.a2aInput, set: v => set({ a2aInput: !!v }), quick: false },
      { type: 'toggle', label: 'Run long jobs as tasks', short: 'Tasks', get: () => st.poll, set: v => set({ poll: !!v }), quick: false },
      { type: 'toggle', label: 'Ask for missing scope', short: 'Step-up', get: () => st.stepUp, set: v => set({ stepUp: !!v }), quick: false },
      { type: 'toggle', label: 'Pass trace context on', short: 'Trace', get: () => st.trace, set: v => set({ trace: !!v }), quick: false },
      { type: 'button', label: 'Send the request again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Outcome', get: () => ({ v: R.ok ? 'brief delivered' : 'failed', sub: FAULTS[st.fault], good: R.ok, bad: !R.ok }) },
      { label: 'Time', get: () => ({ v: `${R.t.toFixed(0)} s`, sub: 'end to end' }) },
      { label: 'Hops', get: () => ({ v: `${R.S.length}`, sub: 'one request, many contracts' }) },
    ];
    const labels = [
      { name: 'stack', t: 'One request, every layer', d: 'Assistant → gateway → MCP server → search → writer agent → report task (dial) → app view (glass); purple thread: the trace', icon: 'layers', atV: V(-2.75, 0.4, -0.7) },
      { name: 'run', t: 'The outcome', d: 'Lamp: delivered or failed; tower: seconds end to end', icon: 'gauge', atV: V(0.85, 0.3, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Give up on the writer\'s question', hint: 'A2A input-required as failure', on: () => set({ ...D0, fault: 1, a2aInput: false }), off: reset },
      { label: 'Wait on the report as one request', hint: 'no task, a 60 s timeout', on: () => set({ ...D0, fault: 2, poll: false }), off: reset },
      { label: 'Missing scope as an error', hint: 'no step-up consent', on: () => set({ ...D0, fault: 3, stepUp: false }), off: reset },
    ];
    function status() {
      if (st.fault === 1 && !st.a2aInput) return { ok: false, msg: '<b>The writer agent asked "English or French?", and the assistant treated the question as a failure.</b> In A2A, INPUT_REQUIRED is a pause: ask whoever can answer and reply on the same task.' };
      if (st.fault === 2 && !st.poll) return { ok: false, msg: '<b>The report took four minutes; the request timed out at sixty seconds, and the finished report went nowhere.</b> Long jobs become MCP tasks: return a handle, poll at the suggested interval, collect the result when the status says completed.' };
      if (st.fault === 3 && !st.stepUp) return { ok: false, msg: '<b>The token had the search scope but not the report scope, and the user saw "something went wrong".</b> A 403 insufficient_scope is a request for consent: explain the new permission, get it, and retry with a fresh token and a new request id.' };
      if (st.fault === 4 && !st.trace) return { ok: false, msg: '<b>The search took 19 seconds and the trace ends at the call.</b> Pass the trace context into every hop so the search server\'s cold start shows up as a named span inside this request.' };
      return { ok: R.ok ? true : undefined, msg: `<b>${st.fault === 0 ? `No fault: the brief arrived in ${R.t.toFixed(0)} seconds.` : `${FAULTS[st.fault]}: absorbed, the brief arrived in ${R.t.toFixed(0)} seconds.`}</b> ${['Every layer did its part: fresh gateway decision, discovery, a self-contained tool call, an opaque A2A hand-off, a polled task and a sandboxed view, all in one trace.', 'The writer\'s question was answered on the same A2A task.', 'The report ran as a task and was polled until it completed.', 'The 403 became a consent step and a retry with a fresh token.', 'The trace named the slow step: the search server\'s cold start.'][st.fault]}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One request, many contracts', home: true, say: 'A policy research institute in Dakar asks its assistant for a brief on agent protocols, with sources. One request will cross a gateway, an MCP server, a search tool, another firm\'s writer agent, a long report job and an app view.', act: m => m.set({ fault: 0, a2aInput: true, poll: true, stepUp: true, trace: true }) },
    { t: 'The writer asks a question', home: true, say: 'The writer agent pauses: English or French? The assistant asks the user and replies on the same task. Treat the pause as failure, and there is no draft.', act: m => m.set({ fault: 1 }) },
    { t: 'A long report', home: true, say: 'The report takes four minutes. As a task, it is polled until done. Waited on as one request, it times out and the result is lost.', act: m => m.set({ fault: 2 }) },
    { t: 'A missing scope', home: true, say: 'The token can search but not write reports. The server asks for more scope, the user agrees, and the call is retried.', act: m => m.set({ fault: 3 }) },
    { t: 'A slow server', home: true, say: 'The search server is cold and takes nineteen seconds. Because the trace context travels with every hop, the trace names the cold start.', act: m => m.set({ fault: 4 }) },
    { t: 'Every layer has a job', home: true, say: 'Each layer exists to absorb one kind of failure. Switch any one off, and its fault reaches the user.', act: m => m.set({ fault: 0 }) },
  ],
  check: [
    { q: 'The writer agent returns INPUT_REQUIRED. What should the assistant do?', options: ['Get the answer and reply on the same task', 'Fail the request', 'Start a new task'], answer: 0, why: 'It is a pause, not an error.', hint: 'Try Give up on the writer\'s question.' },
    { q: 'Why run the four-minute report as a task?', options: ['So it doesn\'t depend on one request staying open', 'Tasks are faster', 'Reports require it'], answer: 0, why: 'Poll a handle; collect when complete.', hint: 'Try Wait on the report as one request.' },
    { q: 'A tool call gets 403 insufficient_scope. What then?', options: ['Ask the user to approve the scope, get a new token, retry', 'Show an error', 'Use another user\'s token'], answer: 0, why: 'Step-up consent, then a fresh request.', hint: 'Try Missing scope as an error.' },
  ],
  terms: [
    ['Contract', 'The rules one boundary follows, such as MCP tool calls or A2A tasks.'],
    ['Step-up consent', 'Asking the user for more scope when a call needs it.'],
    ['Task (MCP)', 'A long job with a handle the client polls.'],
    ['Opaque agent', 'An A2A agent whose internals stay hidden from the caller.'],
    ['Trace context', 'The IDs passed through every hop so one trace covers the request.'],
    ['Fault injection', 'Making one part fail on purpose to see how the rest copes.'],
  ],
  deeper: '<p><b>What a real build adds.</b> This simulation keeps the boundaries visible without real transports. A production version tests the actual wire: serialisation, authentication failures, cancellation, timeouts, retries and version mismatches, at every hop.</p><p><b>Skills.</b> A skill can hold the procedure (search, delegate, generate, check sources); the protocols carry the calls. Keep procedure and transport separate.</p><p><b>Earlier lessons.</b> Each hop has its own lesson in this track: the gateway, discovery and transports, tasks, A2A, apps, OAuth and tracing.</p><p><b>About this machine.</b> Times and outcomes follow the rules in the file header for the fault you choose.</p>',
  code: {
    title: 'The request, hop by hop',
    note: 'Adapted from the course\'s Phase 13 capstone.',
    text: `
with tracer.start_as_current_span("invoke_agent research_assistant"):
    token = gateway.authorize(user, audience="research-mcp", scopes={"search"})
    server = mcp.discover("https://research.example/mcp")
    papers = server.call("paper_search", {"query": "agent-to-agent protocols"})
    draft = a2a.send(writer_card, parts=[text(brief_request), data(papers)],
                     on_input_required=ask_user)               # reply on the same task
    try:
        task = server.call("generate_report", {"draft": draft}, token=token)
    except InsufficientScope as e:
        token = gateway.step_up(user, e.scope)                  # consent, new token
        task = server.call("generate_report", {"draft": draft}, token=token)
    report = server.wait_for_task(task)                         # poll tasks/get
    host.render(report.ui_resource, fallback=report.text)
`,
  },
};
