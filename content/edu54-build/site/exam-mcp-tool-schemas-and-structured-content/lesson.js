// Exam prep, MCP tool schemas and structured content: an invented spare-parts catalogue in Kano exposes lookup_product (sku, region enum) with
// an outputSchema. Six calls test the contract: a valid call, a missing sku, a region outside the enum, sku of the wrong type, an extra
// property, and a tool name the server never advertised. Schema failures are tool execution errors (isError true, the model can fix them);
// an unknown tool is the protocol error -32602. Results put structuredContent beside a text mirror; network $refs are never fetched.
const CALLS = [
  { n: 'lookup_product { sku: "BRK-220", region: "west" }', kind: 'ok' },
  { n: 'lookup_product { region: "west" }', kind: 'schema', why: 'sku is required' },
  { n: 'lookup_product { sku: "BRK-220", region: "mars" }', kind: 'schema', why: 'region must be north, south, east or west' },
  { n: 'lookup_product { sku: 220, region: "west" }', kind: 'schema', why: 'sku must be a string' },
  { n: 'lookup_product { sku: "BRK-220", region: "west", admin: true }', kind: 'schema', why: 'additional properties are not allowed' },
  { n: 'lookup_prodcut { sku: "BRK-220" }', kind: 'unknown', why: 'no tool by that name' },
];

function reply(c, o) {
  if (c.kind === 'ok') return { txt: `structuredContent { sku, name: "brake pad", stock: 14 }${o.mirror ? '\n+ text block with the same JSON' : '\n(no text mirror)'}`, good: o.mirror };
  if (c.kind === 'unknown') return o.channels ? { txt: 'JSON-RPC error -32602\n"Unknown tool: lookup_prodcut"', good: true } : { txt: 'isError: true, "unknown tool"', good: false };
  return o.channels ? { txt: `result isError: true\n"${c.why}; fix and retry"`, good: true } : { txt: `JSON-RPC error -32602\n(the model never sees why)`, good: false };
}

function run(o) {
  const rows = CALLS.map(c => ({ c, ...reply(c, o) }));
  const wrong = rows.filter(r => !r.good).length + (o.ref ? 0 : 1);
  return { rows, wrong, ok: wrong === 0 };
}

export default {
  slug: 'exam-mcp-tool-schemas-and-structured-content',
  title: 'Exam prep, MCP: the contract inside a tool definition',
  description: 'A catalogue tool has a required sku and a region enum. Six calls test the contract, and each bad one must land in the channel that can fix it.',
  overview: 'A tool definition carries a name, an optional title, a description, optional icons, a required inputSchema, an optional outputSchema, optional annotations (hints, untrusted unless the server is trusted) and optional _meta. inputSchema is never null; a tool with no parameters uses {"type":"object","additionalProperties":false}. Both schemas are JSON Schema, defaulting to the 2020-12 dialect when no $schema is given. Since SEP-2106, inputSchema keeps type object (arguments are always an object) but may use any other 2020-12 keyword, such as oneOf, and outputSchema may describe any JSON value: an object, an array or a primitive. Two cautions come with that freedom: a $ref that resolves to a network URI must never be dereferenced automatically, because a naive validator would let an attacker make the server call arbitrary hosts, and composition keywords should be bounded against denial of service. When outputSchema exists, structuredContent must conform to it, and for clients that read only text the server should also serialise the same value into a text block. Tool names are 1 to 128 characters of letters, digits, underscore, hyphen and dot, case-sensitive and unique within a server. The most tested distinction is the two error channels. Arguments that fail inputSchema (a missing required field, a wrong type, a value outside an enum, a forbidden extra property) are a tool execution error: a normal result with isError true and content explaining the fix, so the model can correct the call. A protocol error is a JSON-RPC error: an unknown tool is -32602 (not -32601, which means an unknown method), as is a request that fails the CallToolRequest schema. The catalogue is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'inputSchema', 'outputSchema', 'structuredContent', 'isError', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, 0], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { channels: true, mirror: true, ref: true, pick: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* calls ride a belt into the tool, a schema block with one lamp for network references */
    const line = P.belt(V(-2.5, 0, -0.3), V(-0.1, 0, -0.3), { w: 0.34, speed: 0.8 }); S.add(line);
    const tool = P.box(0.56, 0.46, 0.56, BLUE, { r: 0.05 }); tool.position.set(0.25, 0, -0.3); S.add(tool);
    const refs = P.lamp(GOOD, { h: 0.14, r: 0.08 }); refs.position.set(0.25, 0, -0.8); S.add(refs);
    /* three channels out of the tool: a result, an isError the model can read, a protocol error */
    const Z = [-0.8, -0.3, 0.2];
    const bins = Z.map((z, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.5, 0.14, 0.4, '#fff', { r: 0.03, material: m }); b.position.set(1.35, 0, z); S.add(b);
      S.add(P.rod(V(0.55, 0.16, -0.3), V(1.1, 0.14, z), 0.016, '#B9B3A6'));
      return m;
    });
    const mirror = P.box(0.2, 0.1, 0.3, '#3D6BD6', { r: 0.02 }); mirror.position.set(1.72, 0, -0.8); S.add(mirror);
    /* six calls on pads */
    const pads = CALLS.map((c, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.04, 0.36, '#fff', { r: 0.03, material: m }); b.position.set(-2.3 + i * 0.44, 0, 0.42); S.add(b);
      const l = P.lamp(GOOD, { h: 0.08, r: 0.08 }); l.position.set(-2.3 + i * 0.44, 0.04, 0.42); S.add(l);
      return { m, l };
    });
    S.add(P.keep(-2.6, 1.9, 0.75, -1.05, 0.7));
    let clock = 0, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => { pads[i].m.color.set(i === st.pick ? SAF : '#E4DED2'); pads[i].l.userData.set({ color: r.good ? GOOD : BAD, on: true }); });
      const r = R.rows[st.pick], k = r.c.kind, ch = k === 'ok' ? 0 : (k === 'unknown') === !!st.channels ? 2 : 1;
      bins.forEach((m, i) => m.color.set(i === ch ? (r.good ? GOOD : BAD) : OFF));
      parcel = r.good ? (k === 'ok' ? GOOD : SAF) : BAD;
      mirror.visible = !!st.mirror;
      refs.userData.set({ color: st.ref ? GOOD : BAD, on: true });
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Schema failures as tool execution errors', short: 'Right channel', get: () => st.channels, set: v => set({ channels: !!v }) },
      { type: 'toggle', label: 'Mirror structured content in text', short: 'Text mirror', get: () => st.mirror, set: v => set({ mirror: !!v }) },
      { type: 'toggle', label: 'Never fetch a network $ref', short: 'Local $ref', get: () => st.ref, set: v => set({ ref: !!v }) },
      { type: 'buttons', label: 'Call', options: ['valid', 'no sku', 'bad enum', 'wrong type', 'extra field', 'unknown tool'], get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Reply', get: () => ({ v: R.rows[st.pick].txt.split('\n')[0].slice(0, 26), sub: CALLS[st.pick].kind === 'schema' ? 'schema failure' : CALLS[st.pick].kind, good: R.rows[st.pick].good, bad: !R.rows[st.pick].good }) },
      { label: 'Problems', get: () => ({ v: String(R.wrong), sub: 'in the contract', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'd', t: 'Three channels', d: 'Result, isError, protocol error', icon: 'link', atV: V(1.62, 0.1, -0.3) },
      { name: 't', t: 'Six calls', d: 'Red: wrong channel for the fault', icon: 'check', atV: V(-2.52, 0.12, 0.42) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Return -32602 for bad arguments', hint: 'the model never sees why', on: () => set({ ...D0, channels: false, pick: 2 }), off: reset },
      { label: 'Drop the text mirror', hint: 'text-only clients see nothing', on: () => set({ ...D0, mirror: false, pick: 0 }), off: reset },
      { label: 'Follow a remote $ref', hint: 'the server calls arbitrary hosts', on: () => set({ ...D0, ref: false }), off: reset },
    ];
    function status() {
      const r = R.rows[st.pick], c = CALLS[st.pick];
      if (R.ok) return { ok: true, msg: `<b>${c.kind === 'ok' ? 'The valid call returns structuredContent matching outputSchema, mirrored in a text block.' : c.kind === 'unknown' ? 'A misspelt tool name is a protocol error: JSON-RPC -32602, not -32601.' : `The arguments fail the schema (${c.why}), so the reply is a normal result with isError true that the model can read and fix.`}</b>` };
      const f = [];
      if (!st.channels) f.push('schema failures came back as JSON-RPC -32602, so the model cannot see what to fix, and the unknown tool came back as isError instead');
      if (!st.mirror) f.push('the result\'s structuredContent had no text mirror, so a client that reads only text sees nothing');
      if (!st.ref) f.push('the validator fetched a network $ref, letting an attacker make the server call any host');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; line.userData.send(parcel, { size: 0.18 }); }
      line.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A tool definition', home: true, say: 'A catalogue tool needs a sku, accepts four regions and forbids extra fields.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 0 }) },
    { t: 'Structured output', home: true, say: 'The result matches the output schema, and the same value is mirrored in text.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 0 }) },
    { t: 'A missing field', home: true, say: 'A call without the sku fails the schema. It comes back as a result the model can fix.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 1 }) },
    { t: 'Outside the enum', home: true, say: 'A region outside the list is the same channel: an execution error, not a protocol error.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 2 }) },
    { t: 'An unknown tool', home: true, say: 'A misspelt tool name is a protocol error: invalid params, minus three two six oh two.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 5 }) },
    { t: 'No remote references', home: true, say: 'Never follow a schema reference to a network address. Keep references local.', act: m => m.set({ channels: true, mirror: true, ref: true, pick: 4 }) },
  ],
  check: [
    { q: 'An argument fails the tool\'s inputSchema. What comes back?', options: ['A result with isError true', 'JSON-RPC -32602', 'JSON-RPC -32601'], answer: 0, why: 'The model can read it and correct the call.', hint: 'Try Return -32602 for bad arguments.' },
    { q: 'Why mirror structuredContent in a text block?', options: ['For clients that read only text', 'It is required for caching', 'To double the size'], answer: 0, why: 'The server SHOULD serialise it.', hint: 'Try Drop the text mirror.' },
    { q: 'A schema $ref points at an https URL. Should the validator fetch it?', options: ['No, not automatically', 'Yes, always', 'Only on HTTP transports'], answer: 0, why: 'Opt-in only, with an allowlist.', hint: 'Try Follow a remote $ref.' },
  ],
  practice: [
    { q: 'What inputSchema should a tool with no parameters use?', options: ['{"type":"object","additionalProperties":false}', 'null', '{}', 'No inputSchema'], answer: 0, why: 'inputSchema is never null.' },
    { q: 'Which JSON Schema dialect applies when no $schema is given?', options: ['2020-12', 'draft-04', 'draft-07', 'None'], answer: 0, why: 'The default dialect.' },
    { q: 'Can outputSchema describe an array at its root?', options: ['Yes, since SEP-2106', 'No, only objects', 'Only for resources', 'Only with $ref'], answer: 0, why: 'Output can be any JSON value.' },
    { q: 'Which tool name is valid?', options: ['catalog.lookup_product', 'catalog/lookup', 'lookup product', 'an empty string'], answer: 0, why: '1 to 128 of letters, digits, _ - and dot; no slash.' },
    { q: 'Are tool annotations such as readOnlyHint guarantees?', options: ['No: hints, untrusted unless the server is trusted', 'Yes, enforced by the client', 'Yes, enforced by the protocol', 'Only on stdio'], answer: 0, why: 'Treat them as claims.' },
    { q: 'An unknown tool returns which code?', options: ['-32602', '-32601', '-32603', '-32002'], answer: 0, why: '-32601 is an unknown method.' },
  ],
  terms: [
    ['inputSchema', 'JSON Schema for arguments; type object, never null.'],
    ['outputSchema', 'Optional JSON Schema for the structured result.'],
    ['structuredContent', 'The typed result value, matching outputSchema.'],
    ['Text mirror', 'The same value serialised into a text block.'],
    ['Tool execution error', 'A result with isError true for fixable problems.'],
    ['Protocol error', 'A JSON-RPC error, such as -32602 for an unknown tool.'],
  ],
  deeper: '<p><b>SEP-1303.</b> In 2025-11-25, input validation errors became tool execution errors so the model could self-correct.</p><p><b>About this machine.</b> The catalogue and calls are invented.</p>',
  code: {
    title: 'Two channels for two kinds of failure',
    note: 'Written for this lesson.',
    text: `
def tools_call(req):
    name, args = req["params"]["name"], req["params"].get("arguments", {})
    tool = TOOLS.get(name)
    if tool is None:                                       # protocol error
        return {"jsonrpc": "2.0", "id": req["id"],
                "error": {"code": -32602, "message": f"Unknown tool: {name}"}}
    problems = validate(args, tool.input_schema, fetch_remote_refs=False)
    if problems:                                           # tool execution error
        return result(req, isError=True,
                      content=[{"type": "text", "text": f"{problems[0]}; fix and retry"}])
    value = tool.run(**args)
    return result(req, structuredContent=value,
                  content=[{"type": "text", "text": json.dumps(value)}])   # text mirror
`,
  },
};
