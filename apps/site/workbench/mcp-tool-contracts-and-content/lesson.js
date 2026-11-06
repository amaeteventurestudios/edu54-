// MCP tool contracts: a medical supplies distributor in Bamako exposes stock tools through MCP to an analyst's assistant.
// Five exchanges. tools/list returns 3 tools and nextCursor "" (an empty string is a valid cursor; 2 more tools are on page two).
// tools/call stock_report publishes an outputSchema {warehouse, items[], expiring_30d}; one reply comes back with isError true and no structuredContent,
// which still breaks the contract. A call arrives with an extra argument override_limits: true against additionalProperties: false.
// completion/complete for the warehouse argument: the analyst may see Bamako-Central and Sikasso; the restricted military depot only operators may see.
// Content blocks: a small table embedded in the reply, the full 40 MB batch PDF as a resource link.
function run(st) {
  const E = [];
  const add = (t, bad) => E.push({ t, bad });
  if (st.cursor) add('tools/list → 3 tools, nextCursor "" · client checks "is None", sends "" back → 2 more tools (5 in all)');
  else add('tools/list → 3 tools, nextCursor "" · client checks truthiness, "" looks empty, stops: reorder_stock and recall_batch never seen', true);
  add('tools/call stock_report {warehouse: "Sikasso", override_limits: true} → −32602: additionalProperties false, unknown argument');
  if (st.validate) add('stock_report reply: isError true, no structuredContent · client validates against the outputSchema · flagged as a server bug, not passed on');
  else add('stock_report reply: isError true, no structuredContent · passed to the dashboard, which expected items[] and crashed', true);
  if (st.compAuth) add('completion/complete warehouse "B…" / "S…" → Bamako-Central, Sikasso (filtered by the analyst\'s role)');
  else add('completion/complete warehouse "M…" → Military Depot Kati: a name the analyst can\'t list, revealed by autocomplete', true);
  add(`content: a 12-row table embedded · batch-2041.pdf (40 MB) as a resource link, followed only under the client's resource policy`);
  return { E, bad: E.filter(e => e.bad).length };
}

export default {
  slug: 'mcp-tool-contracts-and-content',
  title: 'Tool contracts: schemas, cursors, completions',
  description: 'A Bamako medical-supplies firm offers stock tools over MCP. Every exchange has a contract: schemas, page cursors, content and autocomplete.',
  overview: 'An MCP tool\'s descriptor is a contract checked at run time, not documentation. Its inputSchema is JSON Schema; for a tool with no arguments say so exactly, and use additionalProperties false so unknown arguments such as override_limits are rejected, not ignored. If a tool publishes an outputSchema, every complete result must carry conforming structuredContent, even when isError is true, and clients should validate it rather than trust the descriptor. Replies carry content blocks with different costs: text, images, audio, small embedded resources that travel with the result, and links to large or changing resources that the client follows under its own policy. Lists are paged with cursors that are opaque: send back exactly what you got, never decode, increment or compare them, and stop only when nextCursor is absent; an empty string is a valid cursor. Completion (autocomplete for prompt and template arguments) is an authorisation surface: filter suggestions by the caller\'s permissions, cap and rate-limit them, or autocomplete reveals names that list methods hide. Keep two error layers apart: JSON-RPC errors for requests that can\'t be dispatched, isError results for tools that ran and failed.',
  keywords: ['MCP tools', 'JSON Schema', 'outputSchema', 'structuredContent', 'pagination cursor', 'MCP completion', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-0.5, 0.35, -0.1], dir: [0.4, 0.85, 1.3], half: 1.5, wide: 4.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cursor: true, validate: true, compAuth: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* tools/list, page by page: page one's three tool cubes, page two's two (greyed if the client stopped at the empty cursor) */
    const shelf = (x, n) => { const b = P.box(0.9, 0.06, 0.4, '#A87A4F', { r: 0.02 }); b.position.set(x, 0, -0.65); S.add(b); return Array.from({ length: n }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), c = P.box(0.22, 0.22, 0.22, '#fff', { r: 0.03, material: mm }); c.position.set(x - 0.27 + i * 0.27, 0.06, -0.65); S.add(c); return mm; }); };
    shelf(-2.3, 3); const page2 = shelf(-1.3, 2);
    /* the schema gate: replies ride a belt through it to the dashboard robot; a reply with no items is stopped if it is checked */
    const belt = P.belt(V(-2.6, 0, 0.3), V(-0.25, 0, 0.3), { speed: 0.9, w: 0.32 }); S.add(belt);
    const gateM = new THREE.MeshLambertMaterial({ color: GOOD }), gate = P.box(0.08, 0.45, 0.45, '#fff', { r: 0.02, material: gateM }); gate.position.set(-1.35, 0, 0.3); S.add(gate);
    const dash = P.robot('#1F9E89', { scale: 0.85 }); dash.position.set(0.05, 0, 0.3); S.add(dash);
    /* autocomplete: three warehouses; the military depot behind a fence lights red if autocomplete reveals it */
    const wh = (x, c) => { const g = P.box(0.32, 0.25, 0.3, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: c }) }); g.position.set(x, 0, -0.6); S.add(g); const r = P.box(0.36, 0.06, 0.34, '#8A5F3A', { r: 0.02 }); r.position.set(x, 0.25, -0.6); S.add(r); return g; };
    wh(-0.3, '#E9E2D3'); wh(0.15, '#E9E2D3'); const depot = wh(0.75, '#3A3B44');
    const fence = P.box(0.05, 0.35, 0.5, '#6B6E7E', { r: 0.01 }); fence.position.set(0.5, 0, -0.6); S.add(fence);
    /* content blocks: a small table travels inside the reply; the 40 MB PDF stays put, linked by a thin rod */
    const pdf = P.box(0.45, 0.4, 0.55, '#C9C4B6', { r: 0.04 }); pdf.position.set(0.9, 0, 0.55); S.add(pdf);
    const link = P.box(0.55, 0.03, 0.03, '#7B6FA8', { r: 0.01 }); link.position.set(0.4, 0.45, 0.42); S.add(link);
    const brkTw = P.tower(0.45, 0.45, RED, { size: 0.28 }); brkTw.position.set(1.5, 0, -0.1); S.add(brkTw);
    S.add(P.keep(-2.85, 1.8, 1.15, -0.95, 0.9));

    let R = null, clock = 0;
    function draw() {
      R = run(st); clock = 0; belt.userData.clear();
      page2.forEach(mm => mm.color.set(st.cursor ? '#5B8DB8' : '#D9D4C7'));
      gateM.color.set(st.validate ? GOOD : RED); gate.position.y = st.validate ? 0 : -0.4;
      depot.material.color.set(st.compAuth ? '#3A3B44' : RED);
      brkTw.userData.set({ h: 0.05 + R.bad / 3 * 1.0, cap: `${R.bad}`, color: R.bad ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    let nxt = 0, n = 0;
    const update = dt => {
      belt.userData.tick(dt); dash.userData.tick(dt); brkTw.userData.tick(dt); clock += dt;
      if (clock > nxt) { nxt = clock + 1.4; n++; const broken = n % 3 === 0; belt.userData.send(broken ? RED : SAF, { size: 0.2, stop: broken && st.validate ? 0.52 : 1 }); }
      dash.userData.set({ busy: true, color: !st.validate ? RED : '#1F9E89' });
    };
    const controls = [
      { type: 'toggle', label: 'Stop only when nextCursor is absent', short: 'Cursor check', get: () => st.cursor, set: v => set({ cursor: !!v }) },
      { type: 'toggle', label: 'Validate results against the outputSchema', short: 'Validate output', get: () => st.validate, set: v => set({ validate: !!v }) },
      { type: 'toggle', label: 'Filter completions by the caller\'s role', short: 'Filter completions', get: () => st.compAuth, set: v => set({ compAuth: !!v }) },
      { type: 'button', label: 'Run the exchanges again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Contract breaks', get: () => ({ v: `${R.bad}`, sub: 'of 5 exchanges', bad: R.bad > 0, good: !R.bad }) },
      { label: 'Tools seen', get: () => ({ v: st.cursor ? '5' : '3', sub: 'of 5', bad: !st.cursor }) },
      { label: 'Restricted names shown', get: () => ({ v: st.compAuth ? '0' : '1', sub: 'via autocomplete', bad: !st.compAuth, good: st.compAuth }) },
    ];
    const labels = [
      { name: 'pages', t: 'Tools, page by page', d: 'Page two\'s cubes stay grey if an empty cursor was taken as the end', icon: 'layers', atV: V(-2.8, 0.2, -0.65) },
      { name: 'gate', t: 'The output schema', d: 'Replies ride to the dashboard; the gate stops a red one with no items', icon: 'code', atV: V(-2.65, 0.1, 0.3) },
      { name: 'auto', t: 'Autocomplete', d: 'Three warehouses; the depot behind the fence turns red if a restricted name is suggested. Grey: the big PDF, sent as a link', icon: 'eye', atV: V(1.0, 0.35, -0.6) },
      { name: 'brk', t: 'Contract breaks', d: 'Of five exchanges', icon: 'stop', atV: V(1.75, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'An empty cursor means the end', hint: 'check nextCursor for truthiness', on: () => set({ ...D0, cursor: false }), off: reset },
      { label: 'Trust replies as they come', hint: 'no outputSchema check', on: () => set({ ...D0, validate: false }), off: reset },
      { label: 'Autocomplete for everyone', hint: 'no role filter on completions', on: () => set({ ...D0, compAuth: false }), off: reset },
    ];
    function status() {
      if (!st.cursor) return { ok: false, msg: '<b>The server returned nextCursor "", and the client read the empty string as "no more pages". reorder_stock and recall_batch were never seen.</b> Cursors are opaque: stop only when nextCursor is absent, and send back exactly what you received, even an empty string.' };
      if (!st.validate) return { ok: false, msg: '<b>A stock_report reply came back with isError true and no structuredContent, and the dashboard crashed on the missing items list.</b> Once a tool publishes an outputSchema, every complete result must conform, errors included. Validate replies against it and treat a mismatch as a server bug.' };
      if (!st.compAuth) return { ok: false, msg: '<b>Autocomplete suggested "Military Depot Kati", a warehouse the analyst can\'t list or read.</b> Completion is an authorisation surface: apply the same permission check as the resource or prompt it completes, cap the results, and rate-limit it.' };
      return { ok: true, msg: '<b>Every exchange held to its contract.</b> All five tools were found by following the empty-string cursor; an unknown argument was rejected by additionalProperties false; a reply missing its structured content was caught by output validation; autocomplete showed only the analyst\'s warehouses; and the large PDF travelled as a link, not inline.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A contract per tool', home: true, say: 'A medical supplies distributor in Bamako offers stock tools to an analyst\'s assistant. Each tool\'s input and output schemas are a contract checked on every call.', act: m => m.set({ cursor: true, validate: true, compAuth: true }) },
    { t: 'Unknown arguments rejected', home: true, say: 'A call arrives with an extra override argument. Because the schema says no additional properties, it is rejected rather than quietly ignored.', act: m => m.set({ validate: true }) },
    { t: 'Cursors are opaque', home: true, say: 'The tool list comes in pages. The first ends with a cursor that is an empty string. Read that as "done", and two tools are never seen. Send it back exactly.', act: m => m.set({ cursor: false }) },
    { t: 'Check what comes back', home: true, say: 'A failed report arrives without its structured data. Pass it on unchecked, and the dashboard crashes. Validate replies against the output schema.', act: m => m.set({ cursor: true, validate: false }) },
    { t: 'Autocomplete leaks', home: true, say: 'Typing a warehouse name, the analyst is offered a restricted military depot. Completions need the same permission checks as reads.', act: m => m.set({ validate: true, compAuth: false }) },
    { t: 'Light and heavy content', home: true, say: 'A small table travels inside the reply; a forty-megabyte batch file goes as a link, fetched only if policy allows.', act: m => m.set({ compAuth: true }) },
  ],
  check: [
    { q: 'A list reply has nextCursor "". What should the client do?', options: ['Send "" back to get the next page; stop only when nextCursor is absent', 'Stop: it is empty', 'Decode it'], answer: 0, why: 'Cursors are opaque; an empty string is valid.', hint: 'Try An empty cursor means the end.' },
    { q: 'A tool with an outputSchema returns isError true. Must its result still conform?', options: ['Yes: the output contract covers error results too', 'No', 'Only on success'], answer: 0, why: 'Clients rely on the published shape.', hint: 'Try Trust replies as they come.' },
    { q: 'Why filter autocomplete suggestions by role?', options: ['Otherwise they reveal names the caller can\'t list or read', 'For speed', 'Suggestions are public'], answer: 0, why: 'Completion is not a way round authorisation.', hint: 'Try Autocomplete for everyone.' },
  ],
  terms: [
    ['inputSchema', 'The JSON Schema a tool\'s arguments must match.'],
    ['outputSchema', 'The JSON Schema a tool\'s structured results promise to match.'],
    ['structuredContent', 'A tool result\'s machine-readable data, checked against the output schema.'],
    ['Opaque cursor', 'A page token the client returns unchanged and never interprets.'],
    ['Completion', 'Autocomplete suggestions for prompt and template arguments.'],
    ['Resource link', 'A reference to a resource in a tool result, followed separately.'],
  ],
  deeper: '<p><b>Header copies.</b> Some argument values can be mirrored into HTTP headers for routing (x-mcp-header); encode them safely and have the server check the copy against the body.</p><p><b>Two error layers.</b> Unknown tool, bad parameters, invalid cursor: JSON-RPC errors (−32602 and friends). The tool ran and failed: a normal result with isError true, a message the model can use, and conforming structured content.</p><p><b>Embed or link.</b> Embed small evidence that must travel with the result; link large or changing artifacts, and let the client\'s resource policy decide whether to fetch them.</p><p><b>About this machine.</b> The five exchanges follow the rules in the file header, shortened.</p>',
  code: {
    title: 'Page correctly, validate replies',
    note: 'Adapted from the course\'s MCP tool contracts lesson.',
    text: `
def list_all_tools(client):
    tools, cursor = [], None
    while True:
        params = {} if cursor is None else {"cursor": cursor}
        page = client.request("tools/list", params)
        tools += page["tools"]
        if page.get("nextCursor") is None:          # not: if not page.get("nextCursor")
            return tools
        cursor = page["nextCursor"]                 # send it back exactly, even ""

def call(client, tool, args):
    result = client.request("tools/call", {"name": tool["name"], "arguments": args})
    if "outputSchema" in tool:
        validate(result.get("structuredContent"), tool["outputSchema"])   # errors too
    return result
`,
  },
};
