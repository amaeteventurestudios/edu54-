// Exam prep, the MCP tool invocation lifecycle: an invented mobile-money operator in Dar es Salaam traces one send_payout call through eight
// checkpoints: discover, list, select, confirm, call, validate, execute, result. Six scenarios branch at different points: an unknown tool
// stops at validate with -32602; a schema violation or an upstream failure is isError during execute; a genuine server fault is -32603; the
// server may need input (input_required); a broken stream means reissuing with a new id, safe only through a handle when the tool is not
// idempotent. Illustrative.
const CPS = ['discover', 'list', 'select', 'confirm', 'call', 'validate', 'execute', 'result'];
const WIRE = [true, true, false, false, true, true, true, true];
const CASES = [
  { n: 'normal payout', stop: 7, out: 'complete · structuredContent {payout_id}' },
  { n: 'unknown tool "send_payot"', stop: 5, out: 'JSON-RPC error -32602 (never -32601); no execute, no result' },
  { n: 'amount fails the schema', stop: 6, out: 'complete · isError true · "amount must be ≤ the wallet balance"' },
  { n: 'bank API timed out', stop: 6, out: 'complete · isError true · "upstream timeout; try again later"' },
  { n: 'server bug in the handler', stop: 6, out: 'JSON-RPC error -32603: not fixable by the caller' },
  { n: 'needs a PIN confirmation', stop: 7, out: 'input_required → retry with a new id and inputResponses' },
  { n: 'stream broke after sending', stop: 4, out: 'no reply: reissue with a new id' },
];

function run(o) {
  const c = CASES[o.cs];
  const issues = [];
  if (!o.split) issues.push('an unknown tool and a schema violation got the same channel; unknown tool is -32602 at validate, bad arguments are isError during execute');
  if (!o.confirm) issues.push('the send_payout tool moves money but was sent without confirmation');
  if (!o.timeout) issues.push('the client had no hard timeout and waited forever while progress kept arriving');
  if (!o.handle) issues.push('after the broken stream the client blindly resent send_payout, which is not idempotent, and paid twice');
  return { c, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-tool-invocation-lifecycle',
  title: 'Exam prep, MCP: the tool invocation lifecycle',
  description: 'Follow a payout call through eight checkpoints, some on the wire and some in the host. Seven cases each stop somewhere, and each must end the right way.',
  overview: 'A 2026-07-28 tool invocation passes eight checkpoints in order: discover, list, select, confirm, call, validate, execute and result. Discover and list are on the wire and cacheable: server/discover gives versions, capabilities and instructions; tools/list gives each tool\'s name, description, inputSchema and annotations. Select and confirm never touch the wire: the model chooses a tool from what is in its context, and the host decides whether to act at once or ask a person first, which the specification frames as a SHOULD; a tool that moves money deserves confirmation. Call is the tools/call request, carrying its own _meta. Validate is the server\'s first question: is this a tool it exposes? If not, the call ends with a protocol error, always -32602 (not -32601, which is for an unknown method), with no execute and no result. Execute checks the arguments against inputSchema and runs the handler. A missing or malformed argument, an upstream API failure or a business-rule refusal comes back as a complete result with isError true and content the model can act on. The exception is a genuine, unexpected server fault, reported as the protocol error -32603 because the caller\'s next attempt cannot fix it. If the request carried a progressToken, notifications/progress may stream during execute on that request\'s response stream. Result is either complete (with or without isError) or input_required, which the client answers by retrying with a new id and inputResponses. Every request needs a timeout with a hard maximum even while progress arrives; cancellation is closing the stream on HTTP or notifications/cancelled on stdio; neither produces a result. A broken stream loses the request, since there is no resumption, so the caller reissues with a new id. That is safe only if the tool is idempotent, and idempotentHint is only a hint, so well-designed servers return a handle from the first step and later calls act on it instead of repeating an action. The operator is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'tool lifecycle', 'validate', 'execute', '-32602', '-32603', 'idempotency', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 1, split: true, confirm: true, timeout: true, handle: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* eight checkpoints as posts along a belt: tall on the wire, low in the host */
    const X = i => -2.35 + i * 0.6;
    const line = P.belt(V(-2.6, 0, -0.35), V(2.0, 0, -0.35), { w: 0.3, speed: 0.9 }); S.add(line);
    const cps = CPS.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.3, WIRE[i] ? 0.34 : 0.16, 0.22, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0, -0.72); S.add(b); return m; });
    /* the confirm stop, in the host */
    const ask = P.gate(0.44, GOOD, { h: 0.38 }); ask.rotation.y = Math.PI / 2; ask.position.set(X(3), 0, -0.35); S.add(ask);
    /* where this case stops */
    const markM = new THREE.MeshLambertMaterial({ color: SAF }), mark = P.ball(0.09, '#fff', { material: markM }); mark.userData.noFit = true; S.add(mark);
    /* four habits as lamps: two channels, confirmation, a hard timeout, a known handle */
    const notes = [0, 1, 2, 3].map(i => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-1.65 + i * 0.5, 0, 0.3); S.add(l); return l; });
    const end = P.lamp(GOOD, { h: 0.28, r: 0.11 }); end.position.set(1.2, 0, 0.3); S.add(end);
    S.add(P.keep(-2.75, 2.1, 0.75, -0.95, 0.5));
    let clock = 0, stopAt = 1, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      const stop = R.c.stop;
      cps.forEach((m, i) => m.color.set(i > stop ? OFF : i === stop ? SAF : GOOD));
      mark.position.set(X(stop), 0.22, -0.35);
      const out = R.c.n === 'unknown tool "send_payot"' && !st.split ? 'result isError true (wrong channel: should be -32602)' : R.c.n === 'amount fails the schema' && !st.split ? 'JSON-RPC -32602 (wrong channel: should be isError)' : R.c.n === 'stream broke after sending' ? (st.handle ? 'reissue with a new id, using payout handle po_81…: no double payment' : 'blind resend: paid twice') : R.c.out;
      const bad = /wrong channel|paid twice/.test(out);
      ask.visible = !!st.confirm;
      stopAt = (X(stop) + 2.6) / 4.6; parcel = bad ? BAD : GOOD;
      markM.color.set(bad ? BAD : SAF);
      [st.split, st.confirm, st.timeout, st.handle].forEach((ok, i) => notes[i].userData.set({ color: ok ? GOOD : BAD, on: true }));
      end.userData.set({ color: bad || !R.ok ? BAD : GOOD, on: true });
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Validate and execute errors apart', short: 'Two channels', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'toggle', label: 'Confirm money-moving calls', short: 'Confirm', get: () => st.confirm, set: v => set({ confirm: !!v }) },
      { type: 'toggle', label: 'Hard timeout on every request', short: 'Timeout', get: () => st.timeout, set: v => set({ timeout: !!v }) },
      { type: 'toggle', label: 'Reissue through a handle', short: 'Handle', get: () => st.handle, set: v => set({ handle: !!v }) },
      { type: 'buttons', label: 'Scenario', options: ['normal', 'unknown tool', 'bad amount', 'bank timeout', 'server bug', 'needs PIN', 'broken stream'], get: () => st.cs, act: i => set({ cs: i }) },
    ];
    const readouts = [
      { label: 'Stops at', get: () => ({ v: CPS[R.c.stop], sub: `checkpoint ${R.c.stop + 1} of 8` }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the lifecycle', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'c', t: 'Eight checkpoints', d: 'Tall: on the wire. Low: in the host', icon: 'link', atV: V(-2.5, 0.2, -0.72) },
      { name: 't', t: 'Where it ends', d: 'Red: the wrong ending', icon: 'check', atV: V(1.38, 0.35, 0.3) },
    ];
    const reset = () => set({ ...D0, cs: st.cs });
    const breaks = [
      { label: 'Blur the two error channels', hint: 'validate vs execute', on: () => set({ ...D0, split: false, cs: 2 }), off: reset },
      { label: 'Skip confirmation for payouts', hint: 'it moves money', on: () => set({ ...D0, confirm: false, cs: 0 }), off: reset },
      { label: 'Blindly resend after a broken stream', hint: 'not idempotent', on: () => set({ ...D0, handle: false, cs: 6 }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: the call stops at ${CPS[R.c.stop]} and ends as ${R.c.n === 'stream broke after sending' ? 'a reissue with a new id that acts on the payout handle, so nothing is paid twice' : R.c.out}.</b> Payouts are confirmed, every request has a hard timeout, and the two error channels stay apart.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.3) { clock = 0; line.userData.send(parcel, { size: 0.16, stop: stopAt }); }
      line.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Eight checkpoints', home: true, say: 'A payout call passes discover, list, select, confirm, call, validate, execute and result.', act: m => m.set({ cs: 0, split: true, confirm: true, timeout: true, handle: true }) },
    { t: 'Unknown tool', home: true, say: 'A misspelt tool name stops at validate: invalid params, with no execute and no result.', act: m => m.set({ cs: 1, split: true, confirm: true, timeout: true, handle: true }) },
    { t: 'Bad arguments', home: true, say: 'An amount that fails the schema is caught during execute and comes back as an error result.', act: m => m.set({ cs: 2, split: true, confirm: true, timeout: true, handle: true }) },
    { t: 'Server bug', home: true, say: 'A genuine fault in the handler is an internal error. The caller cannot fix it.', act: m => m.set({ cs: 4, split: true, confirm: true, timeout: true, handle: true }) },
    { t: 'Input required', home: true, say: 'The server needs a PIN. The client asks and retries with a new id.', act: m => m.set({ cs: 5, split: true, confirm: true, timeout: true, handle: true }) },
    { t: 'A broken stream', home: true, say: 'The stream breaks after sending. The client reissues through a handle, so nothing is paid twice.', act: m => m.set({ cs: 6, split: true, confirm: true, timeout: true, handle: true }) },
  ],
  check: [
    { q: 'At which checkpoint does an unknown tool name fail?', options: ['Validate, with -32602', 'Execute, with isError', 'Result'], answer: 0, why: 'No execute, no result.', hint: 'Try Blur the two error channels.' },
    { q: 'Should a payout tool be confirmed before calling?', options: ['Yes: it moves money', 'No: confirmation is a protocol message', 'Only on stdio'], answer: 0, why: 'Confirm is a host checkpoint.', hint: 'Try Skip confirmation for payouts.' },
    { q: 'A stream breaks after sending a non-idempotent call. What is safe?', options: ['Reissue with a new id acting on a handle', 'Blindly resend the same call', 'Resume with Last-Event-ID'], answer: 0, why: 'Resumption was removed.', hint: 'Try Blindly resend after a broken stream.' },
  ],
  practice: [
    { q: 'Which checkpoints never put a message on the wire?', options: ['Select and confirm', 'Discover and list', 'Call and result', 'Validate and execute'], answer: 0, why: 'They live inside the host.' },
    { q: 'An upstream bank API times out during execute. What does the server return?', options: ['A complete result with isError true', '-32602', '-32601', 'Nothing'], answer: 0, why: 'The model can act on it.' },
    { q: 'A handler crashes on an unexpected bug. What is returned?', options: ['-32603 internal error', 'isError true', '-32602', '-32601'], answer: 0, why: 'Not something the caller can fix.' },
    { q: 'Which resultType values can a tools/call end with?', options: ['complete or input_required', 'complete only', 'error or ok', 'task always'], answer: 0, why: 'Without the tasks extension.' },
    { q: 'Do timeout or cancellation produce a resultType?', options: ['No', 'Yes, "cancelled"', 'Yes, "timeout"', 'Only on HTTP'], answer: 0, why: 'They end the request without a result.' },
    { q: 'Why is idempotentHint not enough to decide a blind resend?', options: ['It is only a hint, untrusted unless the server is trusted', 'It is always false', 'It is required to be true', 'It is a guarantee'], answer: 0, why: 'Prefer explicit handles.' },
  ],
  terms: [
    ['Validate', 'The server checks that the tool exists; unknown is -32602.'],
    ['Execute', 'Schema check and handler run; fixable problems are isError.'],
    ['-32603', 'Internal error for a genuine server fault.'],
    ['Confirm', 'The host decides whether to ask a person first.'],
    ['Hard timeout', 'A maximum wait that progress cannot extend.'],
    ['Reissue', 'Sending a lost call again with a new id.'],
  ],
  deeper: '<p><b>Progress during execute.</b> With a progressToken, notifications/progress carries the same token and a strictly increasing value on that request\'s response stream only.</p><p><b>About this machine.</b> The operator and calls are invented.</p>',
  code: {
    title: 'Validate, then execute',
    note: 'Written for this lesson.',
    text: `
def tools_call(req):
    tool = TOOLS.get(req["params"]["name"])
    if tool is None:                                         # validate
        return error(req, -32602, "Unknown tool")
    problems = check(req["params"].get("arguments", {}), tool.input_schema)
    if problems:                                             # execute: schema
        return result(req, isError=True, text=problems[0])
    try:
        out = tool.run(**req["params"]["arguments"])         # execute: handler
    except UpstreamError as e:
        return result(req, isError=True, text=f"upstream: {e}; try again later")
    except Exception:
        return error(req, -32603, "Internal error")          # a real fault
    return result(req, structuredContent=out)                # complete
`,
  },
};
