// Exam prep, MCP error handling: an invented logistics API team in Kigali classifies ten failures into the right channel (protocol error or
// tool execution error), the right code and, on Streamable HTTP, the right status. A code-range strip shows the 2026-07-28 allocation policy:
// -32000 to -32019 legacy, -32020 to -32099 reserved for MCP, application codes outside -32768 to -32000. -32002 and -32042 are retired.
// Codes follow the course's 2026-07-28 protocol brief. Illustrative.
const FAIL = [
  { n: 'body is not valid JSON', ch: 'protocol', code: '-32700', http: '(unspecified)', note: 'id: null, it could not be read' },
  { n: 'valid JSON, not a JSON-RPC request', ch: 'protocol', code: '-32600', http: '(unspecified)' },
  { n: 'method "tools/run" does not exist', ch: 'protocol', code: '-32601', http: '404' },
  { n: 'tools/call names an unknown tool', ch: 'protocol', code: '-32602', http: '' },
  { n: 'request is missing _meta protocolVersion', ch: 'protocol', code: '-32602', http: '400' },
  { n: 'MCP-Protocol-Version header ≠ _meta', ch: 'protocol', code: '-32020', http: '400' },
  { n: 'tool needs elicitation, not declared', ch: 'protocol', code: '-32021', http: '400' },
  { n: 'weight must be a positive number', ch: 'tool', code: 'isError: true', http: '200', key: 'sep' },
  { n: 'resource file:///manifests/9 not found', ch: 'protocol', code: '-32602', http: '', key: 'retired', legacy: '-32002' },
  { n: 'a custom "quota exceeded" code', ch: 'app', code: '-31001 (outside -32768…-32000)', http: '', key: 'alloc', legacy: '-32001' },
];

function verdict(f, o) {
  if (f.key === 'sep' && !o.sep) return { code: '-32602', ok: false, why: 'SEP-1303 makes argument failures tool execution errors' };
  if (f.key === 'retired' && !o.retired) return { code: f.legacy, ok: false, why: '-32002 is retired; not found is -32602 now' };
  if (f.key === 'alloc' && !o.alloc) return { code: f.legacy, ok: false, why: '-32000 to -32019 is legacy; app codes go outside -32768 to -32000' };
  return { code: f.code, ok: true };
}

function run(o) {
  const rows = FAIL.map(f => ({ f, ...verdict(f, o) }));
  const bad = rows.filter(r => !r.ok).length;
  return { rows, bad, ok: bad === 0 };
}

export default {
  slug: 'exam-mcp-error-handling',
  title: 'Exam prep, MCP: two ways for a request to fail',
  description: 'Ten failures, each with a channel, a code and an HTTP status. Drop each on the right stretch of the code rail, or into the tool result tray.',
  overview: 'Every MCP failure travels on one of two channels. A protocol error means the request itself was wrong: the method does not exist, the named tool is not exposed, a required field is missing, or the server hit an internal fault. It is a JSON-RPC error object, and the client usually handles it rather than showing it to the model. A tool execution error means the request was fine and the tool hit a problem the caller can fix: a missing or badly shaped argument, a downstream failure, a business-rule refusal or an expired handle. It is a normal complete result with isError true, written for the model to read. Earlier revisions blurred the line between invalid arguments and invalid input; SEP-1303 (2025-11-25) put all argument failures under tool execution errors. The JSON-RPC codes carry base failures: -32700 parse error (with id null, because none could be read), -32600 invalid request, -32601 method not found, -32602 invalid params (an unknown tool, missing required _meta, a missing resource, an invalid prompt name or argument, an invalid cursor) and -32603 internal error. The 2026-07-28 allocation policy splits the server range: -32000 to -32019 is legacy and new implementations must not allocate there; -32020 to -32099 is reserved for the specification, where -32020 is HeaderMismatch, -32021 MissingRequiredClientCapability (with data.requiredCapabilities) and -32022 UnsupportedProtocolVersion (with data.supported and data.requested). -32002 (old resource not found) and -32042 (URL elicitation required) must never be emitted, though clients should accept -32002 from older servers. Application codes should sit outside -32768 to -32000, and should be rare, because isError usually fits. On Streamable HTTP, a header mismatch, missing capability, unsupported version or missing _meta pairs with 400, an unknown method with 404, a missing or invalid token with 401 and insufficient scope with 403. The team is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'error codes', '-32602', '-32020', 'isError', 'json-rpc', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sep: true, retired: true, alloc: true, pick: 7 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the code rail: reserved, MCP's own, the legacy stretch, and open ground for applications */
    const SEG = [[-1.8, 1.0, '#8E91A3'], [-0.75, 1.0, '#5B8DB8'], [0.3, 0.9, '#E07A5F'], [1.3, 1.0, GOOD]];
    SEG.forEach(([x0, w, c]) => { const b = P.box(w, 0.1, 0.34, c, { r: 0.02 }); b.position.set(x0 + w / 2, 0, -0.7); S.add(b); });
    /* the tool result tray: failures the model can read and fix */
    const tray = P.box(0.7, 0.08, 0.4, '#3D6BD6', { r: 0.03 }); tray.position.set(-1.3, 0, -0.15); S.add(tray);
    /* the picked failure lands somewhere */
    const ballM = new THREE.MeshLambertMaterial({ color: SAF }), drop = P.ball(0.11, '#fff', { material: ballM }); drop.userData.noFit = true; S.add(drop);
    /* ten failures as lamps */
    const rows = FAIL.map((f, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), pad = P.box(0.28, 0.04, 0.28, '#fff', { r: 0.02, material: m }); pad.position.set(-1.65 + i * 0.37, 0, 0.35); S.add(pad);
      const l = P.lamp(GOOD, { h: 0.08, r: 0.075 }); l.position.set(-1.65 + i * 0.37, 0.04, 0.35); S.add(l);
      return { m, l };
    });
    S.add(P.keep(-1.95, 2.4, 0.7, -0.95, 0.55));

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => { rows[i].m.color.set(i === st.pick ? SAF : '#E4DED2'); rows[i].l.userData.set({ color: r.ok ? GOOD : BAD, on: true }); });
      const r = R.rows[st.pick], n = parseInt(r.code, 10);
      const seg = n <= -32100 ? 0 : n <= -32020 ? 1 : n <= -32000 ? 2 : 3;
      if (Number.isNaN(n)) drop.position.set(-1.3, 0.2, -0.15);
      else drop.position.set(SEG[seg][0] + SEG[seg][1] / 2, 0.22, -0.7);
      ballM.color.set(r.ok ? SAF : BAD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Argument failures are isError (SEP-1303)', short: 'SEP-1303', get: () => st.sep, set: v => set({ sep: !!v }) },
      { type: 'toggle', label: 'Never emit retired codes', short: 'Retired codes', get: () => st.retired, set: v => set({ retired: !!v }) },
      { type: 'toggle', label: 'App codes outside the reserved range', short: 'Allocation', get: () => st.alloc, set: v => set({ alloc: !!v }) },
      { type: 'buttons', label: 'Failure', options: FAIL.map((f, i) => String(i + 1)), get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Code', get: () => ({ v: R.rows[st.pick].code.startsWith('isError') ? 'isError true' : R.rows[st.pick].code.split(' ')[0], sub: FAIL[st.pick].ch === 'tool' ? 'tool execution error' : 'protocol error', good: R.rows[st.pick].ok, bad: !R.rows[st.pick].ok }) },
      { label: 'Misclassified', get: () => ({ v: `${R.bad} of 10`, sub: 'failures', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'r', t: 'Code rail', d: 'Orange: legacy, keep off it', icon: 'target', atV: V(-1.8, 0.08, -0.7) },
      { name: 't', t: 'Ten failures', d: 'Red: wrong channel or code', icon: 'check', atV: V(1.82, 0.12, 0.35) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Return -32602 for a bad argument', hint: 'the model cannot read it', on: () => set({ ...D0, sep: false, pick: 7 }), off: reset },
      { label: 'Send -32002 for not found', hint: 'retired in 2026-07-28', on: () => set({ ...D0, retired: false, pick: 8 }), off: reset },
      { label: 'Pick a code in the legacy range', hint: '-32000 to -32019', on: () => set({ ...D0, alloc: false, pick: 9 }), off: reset },
    ];
    function status() {
      const r = R.rows[st.pick];
      if (R.ok) return { ok: true, msg: `<b>${r.f.n}: ${r.f.ch === 'tool' ? 'a tool execution error, a complete result with isError true for the model to fix' : r.f.ch === 'app' ? `an application code, ${r.code}` : `a protocol error, ${r.code}`}${r.f.http ? `, HTTP ${r.f.http}` : ''}.</b> All ten failures sit on the right channel with the right code.` };
      const f = R.rows.filter(x => !x.ok).map(x => `"${x.f.n}" got ${x.code}: ${x.why}`);
      return { ok: false, msg: `<b>${f.join('; ')}.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two channels', home: true, say: 'A wrong request gets a protocol error. A fixable tool problem gets an error result.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 3 }) },
    { t: 'Parse errors', home: true, say: 'A body that is not JSON has no readable id, so the error reports id null.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 0 }) },
    { t: 'Method or tool', home: true, say: 'An unknown method is minus three two six oh one. An unknown tool is minus three two six oh two.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 2 }) },
    { t: 'MCP\'s own codes', home: true, say: 'Header mismatch, missing capability and unsupported version live in MCP\'s reserved range.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 5 }) },
    { t: 'Bad arguments', home: true, say: 'A bad argument is an error result the model can read and fix.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 7 }) },
    { t: 'Retired and custom', home: true, say: 'Not found is invalid params now, and custom codes stay outside the reserved range.', act: m => m.set({ sep: true, retired: true, alloc: true, pick: 9 }) },
  ],
  check: [
    { q: 'An argument fails the tool\'s schema. Which channel?', options: ['Tool execution error: isError true', 'Protocol error -32602', 'HTTP 500'], answer: 0, why: 'SEP-1303.', hint: 'Try Return -32602 for a bad argument.' },
    { q: 'Which code means resource not found in 2026-07-28?', options: ['-32602', '-32002', '-32601'], answer: 0, why: '-32002 is retired; accept it from older servers.', hint: 'Try Send -32002 for not found.' },
    { q: 'Where should a new application-defined error code sit?', options: ['Outside -32768 to -32000', 'In -32000 to -32019', 'In -32020 to -32099'], answer: 0, why: 'Legacy and MCP ranges are off limits.', hint: 'Try Pick a code in the legacy range.' },
  ],
  practice: [
    { q: 'What does -32021 carry in its data?', options: ['requiredCapabilities', 'supported versions', 'the uri', 'nothing'], answer: 0, why: 'MissingRequiredClientCapability.' },
    { q: 'Which HTTP status pairs with an unknown method on Streamable HTTP?', options: ['404', '400', '401', '403'], answer: 0, why: '400 is for header, capability, version and missing _meta.' },
    { q: 'When does an error response carry id null?', options: ['When the request id could not be read', 'Always', 'For notifications', 'For -32602'], answer: 0, why: 'For example, a parse error.' },
    { q: 'An expired handle is passed to a tool. Which channel?', options: ['Tool execution error', 'Protocol error -32602', '-32603', '401'], answer: 0, why: 'The model can recover.' },
    { q: 'May a 2026-07-28 server emit -32042?', options: ['No: it is retired', 'Yes, for URL elicitation', 'Only on HTTP', 'Only with tasks'], answer: 0, why: 'It existed only in 2025-11-25.' },
    { q: 'A token is missing on an HTTP request. Which status?', options: ['401', '403', '400', '404'], answer: 0, why: '403 is for insufficient scope.' },
  ],
  terms: [
    ['Protocol error', 'A JSON-RPC error: the request itself was wrong.'],
    ['Tool execution error', 'A complete result with isError true.'],
    ['SEP-1303', 'Made all argument failures tool execution errors.'],
    ['-32020', 'HeaderMismatch: header and body disagree, or a header is missing.'],
    ['Legacy range', '-32000 to -32019: no new codes.'],
    ['Retired codes', '-32002 and -32042: never emitted in 2026-07-28.'],
  ],
  deeper: '<p><b>Unspecified statuses.</b> The specification names no HTTP status for -32700, -32600 or -32603 on Streamable HTTP; do not treat one as a rule.</p><p><b>About this machine.</b> The team and failures are invented.</p>',
  code: {
    title: 'Pick the channel first, then the code',
    note: 'Written for this lesson.',
    text: `
def fail(req, kind, detail=""):
    if kind in ("bad_argument", "upstream", "business_rule", "expired_handle"):
        return result(req, isError=True, text=detail)          # the model can fix it
    code = {
        "unknown_method": -32601, "unknown_tool": -32602, "missing_meta": -32602,
        "resource_missing": -32602, "header_mismatch": -32020,
        "missing_capability": -32021, "bad_version": -32022, "internal": -32603,
    }[kind]                                                     # never -32002 or -32042
    return error(req, code, detail)

QUOTA_EXCEEDED = -31001        # app code, outside -32768..-32000
`,
  },
};
