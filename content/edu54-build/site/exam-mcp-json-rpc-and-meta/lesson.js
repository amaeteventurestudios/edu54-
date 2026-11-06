// Exam prep, MCP JSON-RPC envelope and _meta: a wire checker at an invented payments start-up in Lusaka reads eight captured messages. Four
// shapes (request, notification, result, error) each live or die by one field; _meta keys are reserved when the prefix's second label is
// "modelcontextprotocol" or "mcp". Switch a checker rule off and a malformed message is accepted. Message rules follow the course's
// 2026-07-28 protocol brief.
const MSGS = [
  { n: 'tools/call, id 7, full _meta', shape: 'request', flaw: null },
  { n: 'notifications/progress, no id', shape: 'notification', flaw: null },
  { n: 'result for id 7, resultType "complete"', shape: 'result', flaw: null },
  { n: 'request with id null', shape: 'invalid', flaw: 'id', why: 'a request id must be a string or integer, never null' },
  { n: 'notification that carries an id', shape: 'invalid', flaw: 'id', why: 'a notification must not include an id' },
  { n: 'result with no resultType', shape: 'invalid', flaw: 'rt', why: 'every 2026-07-28 result must say its resultType' },
  { n: 'request missing clientCapabilities', shape: 'error -32602', flaw: 'meta', why: 'protocolVersion and clientCapabilities are required in _meta' },
  { n: 'app _meta key dev.mcp/scanId', shape: 'invalid', flaw: 'key', why: 'second label "mcp" is reserved for MCP; use your own reversed domain' },
];

function run(o) {
  const rows = MSGS.map(m => {
    const caught = m.flaw === null ? true : o[m.flaw];
    return { m, caught, verdict: m.flaw === null ? m.shape : caught ? m.shape : 'accepted' };
  });
  const missed = rows.filter(r => r.m.flaw && !r.caught).length;
  return { rows, missed, ok: missed === 0 };
}

export default {
  slug: 'exam-mcp-json-rpc-and-meta',
  title: 'Exam prep, MCP: the JSON-RPC envelope and _meta',
  description: 'A wire checker reads eight captured messages: request, notification, result or error. Each shape lives or dies by one field, and four rule gates decide.',
  overview: 'Every MCP message is JSON-RPC 2.0, and each of the four shapes has one rule that decides it. A request carries an id, a method and optional params; the id must be a string or an integer, never null, and must not repeat an id still awaiting a reply. A notification carries a method and optional params and must not include an id; the receiver never replies. A result response echoes the request\'s id and carries a result object that must include resultType: "complete" for final content, "input_required" when the server needs more before it can finish, and further values only when an extension is negotiated (a client treats an unknown value as invalid and an absent one, from a legacy server, as complete). An error response echoes the id, unless the request was too malformed for the id to be read, and carries an integer code, a string message and optional data. Protocol facts live in _meta, away from the application\'s own fields. A key has an optional prefix of dot-separated labels ending in a slash, and a name; a prefix whose second label is "modelcontextprotocol" or "mcp" is reserved for MCP, so io.modelcontextprotocol/ and dev.mcp/ are reserved while com.example.mcp/ is not. Every request carries io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities (which may be empty); missing either makes it malformed (-32602, and 400 on HTTP). clientInfo is expected on every request, and serverInfo on results; both are self-reported, for display and logging, never for security decisions. progressToken opts a request into progress notifications, and traceparent, tracestate and baggage carry trace context. There is no batching: one POST or one stdio line carries exactly one message. The company is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'json-rpc', '_meta', 'resultType', 'notification', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, 0], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { id: true, rt: true, meta: true, key: true, pick: 3 }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the picked message rides a belt through four rule gates towards the inbox */
    const KEY = ['id', 'rt', 'meta', 'key'], GX = [-1.5, -0.7, 0.1, 0.9];
    const line = P.belt(V(-2.5, 0, -0.4), V(1.45, 0, -0.4), { w: 0.34, speed: 0.9 }); S.add(line);
    const rules = KEY.map((k, i) => { const g = P.gate(0.5, GOOD, { h: 0.42 }); g.rotation.y = Math.PI / 2; g.position.set(GX[i], 0, -0.4); S.add(g); return g; });
    const inboxM = new THREE.MeshLambertMaterial({ color: GOOD }), inbox = P.box(0.46, 0.3, 0.46, '#fff', { r: 0.04, material: inboxM }); inbox.position.set(1.72, 0, -0.4); S.add(inbox);
    /* eight captured messages: teal valid, gold rejected at a gate, red let through */
    const rows = MSGS.map((m, i) => {
      const x = -2.1 + i * 0.5, mm = new THREE.MeshLambertMaterial({ color: OFF });
      const pad = P.box(0.4, 0.04, 0.4, '#fff', { r: 0.03, material: mm }); pad.position.set(x, 0, 0.35); S.add(pad);
      const l = P.lamp(GOOD, { h: 0.1, r: 0.09 }); l.position.set(x, 0.04, 0.35); S.add(l);
      return { mm, l };
    });
    S.add(P.keep(-2.6, 2.05, 0.75, -0.75, 0.65));
    let clock = 0, stopAt = 1;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => {
        const bad = r.m.flaw && !r.caught;
        rows[i].mm.color.set(i === st.pick ? SAF : '#E4DED2');
        rows[i].l.userData.set({ color: bad ? RED : r.m.flaw ? SAF : GOOD, on: true });
      });
      KEY.forEach((k, i) => { rules[i].visible = !!st[k]; });
      const r = R.rows[st.pick], at = r.m.flaw ? KEY.indexOf(r.m.flaw) : -1;
      stopAt = r.m.flaw && r.caught ? (GX[at] - 0.14 + 2.5) / 3.95 : 1;
      inboxM.color.set(R.ok ? GOOD : RED);
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Check the id rule', short: 'Id rule', get: () => st.id, set: v => set({ id: !!v }) },
      { type: 'toggle', label: 'Require resultType on results', short: 'resultType', get: () => st.rt, set: v => set({ rt: !!v }) },
      { type: 'toggle', label: 'Require version and capabilities in _meta', short: 'Required _meta', get: () => st.meta, set: v => set({ meta: !!v }) },
      { type: 'toggle', label: 'Reserve MCP prefixes', short: 'Reserved keys', get: () => st.key, set: v => set({ key: !!v }) },
      { type: 'buttons', label: 'Message', options: MSGS.map((m, i) => String(i + 1)), get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Flaws let through', get: () => ({ v: String(R.missed), sub: 'of 5 flawed messages', good: R.ok, bad: !R.ok }) },
      { label: 'Message', get: () => ({ v: R.rows[st.pick].verdict, sub: `number ${st.pick + 1}`, good: !(R.rows[st.pick].m.flaw && !R.rows[st.pick].caught), bad: !!(R.rows[st.pick].m.flaw && !R.rows[st.pick].caught) }) },
    ];
    const labels = [
      { name: 's', t: 'Four rule gates', d: 'One field decides each shape', icon: 'code', atV: V(-2.45, 0.1, -0.4) },
      { name: 't', t: 'Eight messages', d: 'Gold: rejected. Red: let through', icon: 'check', atV: V(1.5, 0.15, 0.35) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Allow a null id', hint: 'a request id is never null', on: () => set({ ...D0, id: false, pick: 3 }), off: reset },
      { label: 'Drop the resultType rule', hint: 'how should the client read it?', on: () => set({ ...D0, rt: false, pick: 5 }), off: reset },
      { label: 'Let an app use a reserved prefix', hint: 'second label "mcp"', on: () => set({ ...D0, key: false, pick: 7 }), off: reset },
    ];
    function status() {
      const r = R.rows[st.pick];
      if (R.ok) return { ok: true, msg: `<b>Message ${st.pick + 1} (${r.m.n}): ${r.m.flaw ? `rejected, because ${r.m.why}` : `a valid ${r.m.shape}`}.</b> All five flawed messages are caught.` };
      const f = R.rows.filter(x => x.m.flaw && !x.caught).map(x => `"${x.m.n}" was accepted, though ${x.m.why}`);
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; const r = R.rows[st.pick]; line.userData.send(r.m.flaw ? (r.caught ? SAF : RED) : GOOD, { size: 0.18, stop: stopAt }); }
      line.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A request', home: true, say: 'A request has an id, a method and params, and its id is never null.', act: m => m.set({ id: true, rt: true, meta: true, key: true, pick: 0 }) },
    { t: 'A notification', home: true, say: 'A notification has no id, and nobody ever replies to it.', act: m => m.set({ id: true, rt: true, meta: true, key: true, pick: 1 }) },
    { t: 'A result', home: true, say: 'A result echoes the id and always says its result type.', act: m => m.set({ id: true, rt: true, meta: true, key: true, pick: 2 }) },
    { t: 'Required metadata', home: true, say: 'Every request carries its protocol version and capabilities. Missing either is invalid params.', act: m => m.set({ id: true, rt: true, meta: true, key: true, pick: 6 }) },
    { t: 'Reserved prefixes', home: true, say: 'A key whose second label is mcp belongs to the protocol. Apps use their own domain.', act: m => m.set({ id: true, rt: true, meta: true, key: true, pick: 7 }) },
    { t: 'A loose checker', home: true, say: 'Switch the id rule off and a request with a null id slips through.', act: m => m.set({ id: false, rt: true, meta: true, key: true, pick: 3 }) },
  ],
  check: [
    { q: 'Can a request id be null?', options: ['No: a string or an integer', 'Yes, for the first request', 'Only on stdio'], answer: 0, why: 'And it must not repeat an id awaiting a reply.', hint: 'Try Allow a null id.' },
    { q: 'What must every 2026-07-28 result include?', options: ['resultType', 'A session id', 'An error code'], answer: 0, why: 'complete or input_required.', hint: 'Try Drop the resultType rule.' },
    { q: 'Is the _meta key prefix "com.example.mcp/" reserved?', options: ['No: its second label is "example"', 'Yes: it contains mcp', 'Only for tools'], answer: 0, why: 'The second label decides.', hint: 'Try Let an app use a reserved prefix.' },
  ],
  practice: [
    { q: 'A request is missing io.modelcontextprotocol/protocolVersion. What is the error?', options: ['-32602, and 400 on HTTP', '-32601', '-32600 only', 'No error'], answer: 0, why: 'Missing required _meta is invalid params.' },
    { q: 'What should a receiver send in reply to a notification?', options: ['Nothing', 'A result', 'An empty error', 'An acknowledgement result'], answer: 0, why: 'Notifications never get replies.' },
    { q: 'A client receives a result with no resultType from an older server. How should it read it?', options: ['As complete', 'As invalid', 'As input_required', 'As an error'], answer: 0, why: 'Absent means complete; unknown values are invalid.' },
    { q: 'May a client send three requests as one JSON array?', options: ['No: batching was removed', 'Yes, on HTTP', 'Yes, on stdio', 'Only notifications'], answer: 0, why: 'One message per POST or line.' },
    { q: 'Can a server authorise a caller based on clientInfo?', options: ['No: it is self-reported, for display and logging', 'Yes', 'Only with HTTPS', 'Only for admins'], answer: 0, why: 'Never use it for security decisions.' },
    { q: 'Which keys are the exception to the _meta prefix rule?', options: ['traceparent, tracestate and baggage', 'protocolVersion and clientInfo', 'progressToken only', 'None'], answer: 0, why: 'Trace context uses its own formats.' },
  ],
  terms: [
    ['Request', 'id, method and params; the id is never null.'],
    ['Notification', 'A method with no id; it gets no reply.'],
    ['resultType', 'complete, input_required, or an extension value.'],
    ['_meta', 'The block that carries protocol facts on each message.'],
    ['Reserved prefix', 'A prefix whose second label is modelcontextprotocol or mcp.'],
    ['clientInfo', 'Self-reported client name and version, for display only.'],
  ],
  deeper: '<p><b>Error ids.</b> An error response echoes the request id, except when the request was too malformed for the id to be read.</p><p><b>About this machine.</b> The captured messages and company are invented.</p>',
  code: {
    title: 'Classify one message',
    note: 'Written for this lesson.',
    text: `
def classify(msg):
    if "method" in msg:
        if "id" not in msg:
            return "notification"
        return "request" if isinstance(msg["id"], (str, int)) and msg["id"] is not None else "invalid"
    if "result" in msg:
        return "result" if "resultType" in msg["result"] else "invalid"
    if "error" in msg:
        return "error"
    return "invalid"

def reserved(key):
    prefix = key.split("/")[0] if "/" in key else ""
    labels = prefix.split(".")
    return len(labels) > 1 and labels[1] in ("modelcontextprotocol", "mcp")

print(reserved("io.modelcontextprotocol/protocolVersion"), reserved("com.example.mcp/x"))  # True False
`,
  },
};
