// Exam prep, the MCP model interaction flow: an invented farmers' co-operative assistant in Arusha runs the host loop in five stages: build model
// context from a cached tools/list, let the model draft a call, pass a confirmation gate, send tools/call, and fold the result into an answer.
// Three calls: get_forecast (read-only, first drafted without the city, so isError and a corrected retry with a new id), open_ticket (the
// server answers input_required) and remove_plot (no annotations, so destructive by default and confirmed first). Illustrative.
const CALLS = [
  { n: 'get_forecast', ann: 'readOnlyHint true', path: 'isError' },
  { n: 'open_ticket', ann: 'readOnlyHint false, destructiveHint false', path: 'input' },
  { n: 'remove_plot', ann: 'none (defaults: destructive)', path: 'destructive' },
];
const STAGES = ['1 build context', '2 model drafts', '3 confirm gate', '4 tools/call', '5 answer'];

function run(o) {
  const c = CALLS[o.call];
  const issues = [];
  let trace;
  if (c.path === 'isError') trace = ['name, description, schema, annotations', 'get_forecast {} (no city)', 'read-only: no prompt', 'isError: "city is required"', o.retry ? 'retry {city:"Arusha"}, new id → forecast' : 'model guesses an answer'];
  if (c.path === 'input') trace = ['same cached list', 'open_ticket {title}', 'not destructive: no prompt', 'resultType input_required', 'ask the user, retry with inputResponses'];
  if (c.path === 'destructive') trace = ['same cached list', 'remove_plot {plot:"B7"}', o.gate ? 'no annotations → destructive: show inputs, ask' : 'sent without asking', o.gate ? 'held until the farmer approves' : 'plot B7 removed', o.gate ? 'answer waits for approval' : 'answer: done'];
  if (!o.gate) issues.push('the remove_plot tool has no annotations, so the defaults make it destructive, yet it ran without showing inputs or asking');
  if (!o.retry) issues.push('the forecast call came back isError, and instead of retrying with the city and a new id the model answered from a guess');
  if (!o.order) issues.push('the tools/list result came back in a different order each turn, so the model context changed and the prompt cache missed');
  if (!o.ground) issues.push('the answer did not reference what the tool returned');
  return { c, trace, issues, ok: issues.length === 0, hit: o.order ? 92 : 8 };
}

export default {
  slug: 'exam-mcp-model-interaction-flow',
  title: 'Exam prep, MCP: the model interaction flow',
  description: 'A co-operative assistant runs the host loop: context, draft, confirm, call, answer. Three calls test the gate, the retry and the cached tool list.',
  overview: 'The host owns the conversation with the model, and the client turns decisions into requests; the loop between them has five stages. First, the host builds model context from a cached tools/list result: each tool\'s name, description, inputSchema and annotations, and nothing about the implementation, credentials or registry metadata. Second, the model reads that context and the user\'s request and drafts a tool name and arguments; this is a decision inside the host, not a wire message. Third, before anything is sent, the host runs a confirmation gate: a human should be able to deny an invocation and the client should show inputs before calling, and the annotation defaults decide when the gate fires, so a tool with no annotations is treated as destructive (readOnlyHint false, destructiveHint true) and confirmed. Annotations are hints, untrusted unless the server is trusted, so a host may confirm more but should never confirm less than the defaults imply. Fourth, an approved call becomes an ordinary tools/call with _meta, and the server answers one of three ways: a complete result, which the model reads (content and, with an outputSchema, structuredContent); a complete result with isError true, a tool execution error the model can read and retry with corrected arguments under a new request id; or input_required, which asks the client to gather input and retry. A protocol error is never retried identically. Fifth, the host feeds the result back and the model\'s answer should reference what the tool returned. tools/list should keep a stable order while the set is unchanged, because hosts reuse the context array and providers cache the prompt prefix; reordering misses the cache. The co-operative is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'host loop', 'confirmation', 'annotations', 'isError retry', 'prompt cache', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { call: 2, gate: true, retry: true, order: true, ground: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the cached tool list, the model that drafts, then a belt through the confirm gate to the server */
    const cache = P.shelf(4, { cell: 0.17, levels: 2, lh: 0.17, d: 0.26 }); cache.position.set(-2.3, 0, -0.45); S.add(cache);
    const model = P.robot('#3D6BD6', { scale: 0.62 }); model.position.set(-1.45, 0, -0.45); S.add(model);
    const line = P.belt(V(-1.15, 0, -0.45), V(0.75, 0, -0.45), { w: 0.34, speed: 0.8 }); S.add(line);
    const confirm = P.gate(0.5, GOOD, { h: 0.42 }); confirm.rotation.y = Math.PI / 2; confirm.position.set(-0.3, 0, -0.45); S.add(confirm);
    const server = P.box(0.56, 0.46, 0.5, '#5B8DB8', { r: 0.05 }); server.position.set(1.05, 0, -0.45); S.add(server);
    /* the retry: back from the server to the model with a corrected call */
    const back = P.pipe([V(1.05, 0.14, -0.15), V(0, 0.14, 0.05), V(-1.45, 0.14, -0.2)], SAF, { r: 0.03, n: 5 }); S.add(back);
    /* the person asked for input, and the answer lamp */
    const user = P.robot('#E07A5F', { scale: 0.5 }); user.position.set(-0.3, 0, 0.42); S.add(user);
    const answer = P.lamp(GOOD, { h: 0.32, r: 0.12 }); answer.position.set(1.65, 0, -0.45); S.add(answer);
    /* which of the three calls */
    const pads = CALLS.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(0.5 + i * 0.44, 0, 0.42); S.add(b); return m; });
    S.add(P.keep(-2.7, 1.9, 0.8, -0.8, 0.65));
    const parts = [line, model, back, user];
    let clock = 0, stopAt = 1, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      cache.userData.set({ fill: Array.from({ length: 8 }, (_, i) => st.order ? GOOD : (i % 3 ? SAF : BAD)) });
      const holds = R.c.path === 'destructive' && st.gate;
      confirm.userData.set({ color: R.c.path === 'destructive' ? (st.gate ? SAF : BAD) : GOOD }); confirm.visible = !(R.c.path === 'destructive' && !st.gate);
      stopAt = holds ? 0.42 : 1;
      parcel = R.c.path === 'destructive' ? (st.gate ? SAF : BAD) : GOOD;
      back.visible = R.c.path === 'isError' && !!st.retry;
      user.visible = R.c.path === 'input';
      const good = (R.c.path === 'isError' ? st.retry && st.ground : true) && (R.c.path !== 'destructive' || st.gate);
      answer.userData.set({ color: good ? GOOD : BAD, on: true });
      pads.forEach((m, i) => m.color.set(i === st.call ? SAF : OFF));
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Confirm by annotation defaults', short: 'Gate', get: () => st.gate, set: v => set({ gate: !!v }) },
      { type: 'toggle', label: 'Retry isError with fixed arguments', short: 'Retry', get: () => st.retry, set: v => set({ retry: !!v }) },
      { type: 'toggle', label: 'Keep tools/list in a stable order', short: 'Stable order', get: () => st.order, set: v => set({ order: !!v }) },
      { type: 'toggle', label: 'Answer from the tool result', short: 'Grounded', get: () => st.ground, set: v => set({ ground: !!v }) },
      { type: 'buttons', label: 'Call', options: CALLS.map(c => c.n), get: () => st.call, act: i => set({ call: i }) },
    ];
    const readouts = [
      { label: 'Cache hits', get: () => ({ v: `${R.hit}%`, sub: 'prompt prefix', good: st.order, bad: !st.order }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the loop', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'l', t: 'Cached tool list', d: 'Shuffled, the cache misses', icon: 'box', atV: V(-2.68, 0.15, -0.45) },
      { name: 't', t: 'The answer', d: 'Teal: from the tool result', icon: 'check', atV: V(1.82, 0.42, -0.45) },
    ];
    const reset = () => set({ ...D0, call: st.call });
    const breaks = [
      { label: 'Skip the confirmation gate', hint: 'no annotations means destructive', on: () => set({ ...D0, call: 2, gate: false }), off: reset },
      { label: 'Answer from a guess after isError', hint: 'the model could have fixed it', on: () => set({ ...D0, call: 0, retry: false }), off: reset },
      { label: 'Reorder the tool list every turn', hint: 'the cache misses', on: () => set({ ...D0, order: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: ${R.trace.slice(2).join('; ')}.</b> The gate follows the annotation defaults, an isError result is fixed and retried with a new id, and the tool list keeps a stable order for the cache.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; line.userData.send(parcel, { size: 0.18, stop: stopAt }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Build the context', home: true, say: 'The host turns its cached tool list into context: names, descriptions, schemas and annotations.', act: m => m.set({ call: 0, gate: true, retry: true, order: true, ground: true }) },
    { t: 'A draft call', home: true, say: 'The model drafts a forecast call but forgets the city. The tool says what is missing.', act: m => m.set({ call: 0, gate: true, retry: false, order: true, ground: true }) },
    { t: 'Fix and retry', home: true, say: 'The model adds the city and calls again with a new id, then answers from the result.', act: m => m.set({ call: 0, gate: true, retry: true, order: true, ground: true }) },
    { t: 'Input required', home: true, say: 'Opening a ticket, the server asks for more input before it can finish.', act: m => m.set({ call: 1, gate: true, retry: true, order: true, ground: true }) },
    { t: 'Destructive by default', home: true, say: 'Remove plot has no annotations, so the host shows the inputs and asks first.', act: m => m.set({ call: 2, gate: true, retry: true, order: true, ground: true }) },
    { t: 'Stable order', home: true, say: 'The tool list keeps its order between turns, so the prompt cache keeps hitting.', act: m => m.set({ call: 2, gate: true, retry: true, order: true, ground: true }) },
  ],
  check: [
    { q: 'A tool has no annotations. Does the host confirm before calling it?', options: ['Yes: the defaults make it destructive', 'No: no annotations means safe', 'Only on HTTP'], answer: 0, why: 'readOnlyHint false, destructiveHint true.', hint: 'Try Skip the confirmation gate.' },
    { q: 'A call returns isError true for a missing argument. What next?', options: ['Fix the arguments and retry with a new id', 'Retry the identical request', 'Answer anyway'], answer: 0, why: 'Tool execution errors are for the model to fix.', hint: 'Try Answer from a guess after isError.' },
    { q: 'Why keep tools/list in a stable order?', options: ['The context array and prompt cache stay the same', 'It is alphabetical by rule', 'It saves bandwidth only'], answer: 0, why: 'Reordering misses the cache.', hint: 'Try Reorder the tool list every turn.' },
  ],
  practice: [
    { q: 'What does the model see about a tool?', options: ['Name, description, input schema and annotations', 'The server\'s source code', 'Its credentials', 'The registry metadata'], answer: 0, why: 'Nothing about the implementation.' },
    { q: 'A server returns a JSON-RPC protocol error. Should the host retry it unchanged?', options: ['No', 'Yes, three times', 'Yes, with the same id', 'Only on stdio'], answer: 0, why: 'Never retry a protocol error identically.' },
    { q: 'Can a host confirm a tool the annotations say is read-only?', options: ['Yes: annotations are untrusted hints; it may confirm more', 'No, never', 'Only if destructive', 'Only for remote servers'], answer: 0, why: 'Confirm more, never less, than the defaults imply.' },
    { q: 'What does resultType input_required ask the client to do?', options: ['Gather the requested input and retry', 'Close the connection', 'Show an error', 'Nothing'], answer: 0, why: 'The multi round-trip pattern.' },
    { q: 'Where does the model\'s draft call live before it is sent?', options: ['Inside the host, as a decision', 'On the wire', 'On the server', 'In the registry'], answer: 0, why: 'It becomes a tools/call only after the gate.' },
    { q: 'What should the final answer reference?', options: ['What the tool actually returned', 'What the model expected', 'The tool description', 'Nothing'], answer: 0, why: 'Ground the answer in the result.' },
  ],
  terms: [
    ['Host loop', 'Context, draft, confirm, call, answer.'],
    ['Confirmation gate', 'Showing inputs and letting a person deny a call.'],
    ['Annotation defaults', 'Not read-only, destructive, not idempotent, open-world.'],
    ['Tool execution error', 'isError true; fix the arguments and retry.'],
    ['input_required', 'A result asking for more input before finishing.'],
    ['Prompt cache', 'Reuse of an unchanged prompt prefix by the model provider.'],
  ],
  deeper: '<p><b>Append, do not insert.</b> When a new tool appears, appending it keeps the earlier prefix stable; inserting in the middle changes everything after it.</p><p><b>About this machine.</b> The co-operative and calls are invented.</p>',
  code: {
    title: 'The host loop',
    note: 'Written for this lesson.',
    text: `
def turn(user_msg):
    ctx = [{k: t[k] for k in ("name", "description", "inputSchema", "annotations") if k in t}
           for t in CACHED_TOOLS]                          # stable order, reused each turn
    draft = model.choose(ctx, user_msg)
    a = TOOLS[draft.name].get("annotations", {})
    destructive = not a.get("readOnlyHint", False) and a.get("destructiveHint", True)
    if destructive and not ask_user(draft):                # show inputs, allow denial
        return "Cancelled."
    res = client.call_tool(draft.name, draft.args)         # new id every time
    if res.get("isError"):
        draft = model.fix(draft, res["content"])           # model reads the explanation
        res = client.call_tool(draft.name, draft.args)
    return model.answer(user_msg, res)                     # grounded in the result
`,
  },
};
