// MCP, the stateless revision (2026-07-28): a clinic's booking assistant in Gaborone calls a calendar server 40 times (one call every 5 seconds).
// The server runs as three copies behind a load balancer; copy 1 restarts during calls 18 to 21.
// Handshake era: initialize once, the session lives on one copy (sticky), the chosen clinic calendar is kept in the session; a restart loses both: the next call fails
// with "session not found", the client initializes again and must choose the calendar again. Stateless: every request carries params._meta (protocol version and
// client capabilities), any copy can answer, and the chosen calendar travels as an ordinary argument (an opaque handle), so a restart costs nothing.
// tools/list results carry ttlMs (60 s here): cached, the list is fetched again every 12 calls; uncached, before every call. Call 6 needs input: the server returns
// resultType "input_required" and the client asks the person, then calls again. Without _meta every request is malformed (-32602). An old server (2025-11-25 only)
// answers server/discover with "method not found"; a dual-era client falls back to initialize, a modern-only client gives up.
const CALLS = 40, RESTART = [18, 21], TTL_CALLS = 12;
const TOOLS = ['calendar.find_slot', 'calendar.book', 'records.lookup', 'sms.remind'];
function trace(st) {
  const M = []; let fails = 0, lost = 0, sticky = 0, rr = 0, cur = -1;
  const add = (method, rep, ok, note, json) => M.push({ method, rep, ok, note, json, i: cur });
  const meta = '"_meta": { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} }';
  let mode = st.mode;
  if (mode === 1) {
    if (st.old) {
      add('server/discover', 0, false, 'old server: method not found', '{ "error": { "code": -32601, "message": "Method not found" } }');
      if (!st.dual) { for (let i = 0; i < CALLS; i++) { fails++; } return { M, fails, lost, rt: M.length, gaveUp: true }; }
      mode = 0;
    } else add('server/discover', 0, true, 'versions: 2025-11-25, 2026-07-28', '{ "result": { "supportedVersions": ["2025-11-25", "2026-07-28"], "resultType": "complete" } }');
  }
  if (mode === 0) { add('initialize', 0, true, 'session opened on copy 1', '{ "method": "initialize", "params": { "protocolVersion": "2025-11-25" } }'); add('notifications/initialized', 0, true, 'session ready', '{ "method": "notifications/initialized" }'); add('tools/list', 0, true, '4 tools, kept for the session', '{ "result": { "tools": [ ...4 tools ] } }'); add('tools/call', 0, true, 'choose Broadhurst clinic calendar (kept in the session)', '{ "method": "tools/call", "params": { "name": "calendar.select", "arguments": { "clinic": "Broadhurst" } } }'); }
  for (let i = 0; i < CALLS; i++) {
    const tool = TOOLS[i % TOOLS.length]; cur = i;
    if (mode === 0) {
      const down = i >= RESTART[0] && i <= RESTART[1];
      if (i === RESTART[0]) {
        add('tools/call', sticky, false, 'copy 1 restarted: session not found', '{ "error": "HTTP 404: session not found" }'); fails++; lost++;
        add('initialize', 1, true, 'new session on copy 2', '{ "method": "initialize", "params": { "protocolVersion": "2025-11-25" } }'); add('notifications/initialized', 1, true, 'session ready', '{ "method": "notifications/initialized" }');
        add('tools/call', 1, true, 'choose the calendar again: the old session\'s choice is gone', '{ "method": "tools/call", "params": { "name": "calendar.select", "arguments": { "clinic": "Broadhurst" } } }');
        sticky = 1;
      }
      add('tools/call', sticky, true, `${tool}${down && sticky === 1 ? ' (session now on copy 2)' : ''}`, `{ "method": "tools/call", "params": { "name": "${tool}", "arguments": { ... } } }`);
      continue;
    }
    if (!st.meta) { add('tools/call', rr % 3, false, 'no _meta: Invalid Params', '{ "error": { "code": -32602, "message": "Invalid params: missing _meta" } }'); rr++; fails++; continue; }
    if (!st.ttl || i % TTL_CALLS === 0) add('tools/list', rr++ % 3, true, st.ttl ? '4 tools, ttlMs 60000: cached for a minute' : '4 tools, fetched again', `{ "params": { ${meta} } } → { "result": { "tools": [...], "ttlMs": 60000, "cacheScope": "public" } }`);
    let rep = rr++ % 3; if (rep === 0 && i >= RESTART[0] && i <= RESTART[1]) rep = 1;
    if (i === 5) { add('tools/call', rep, true, 'input_required: which clinic?', '{ "result": { "resultType": "input_required", "inputRequests": [ { "message": "Which clinic?" } ] } }'); add('tools/call', (rep + 1) % 3, true, 'called again with the answer, any copy', `{ "params": { "name": "calendar.find_slot", "inputResponses": [ "Broadhurst" ], ${meta} } }`); continue; }
    add('tools/call', rep, true, `${tool}${rep === 1 && i >= RESTART[0] && i <= RESTART[1] ? ' (copy 1 restarting; another copy answers)' : ''}`, `{ "params": { "name": "${tool}", "arguments": { "calendar": "cal_7Hq2", ... }, ${meta} } }`);
  }
  return { M, fails, lost, rt: M.length, gaveUp: false, mode };
}

export default {
  slug: 'model-context-protocol',
  title: 'MCP, stateless: every request carries its context',
  description: 'A clinic\'s booking assistant in Gaborone calls a calendar server forty times while one copy restarts. Sessions break; stateless requests don\'t.',
  overview: 'The Model Context Protocol lets an AI app (the host) use tools, resources and prompts from any server that speaks it, with JSON-RPC messages over standard input and output or HTTP. Earlier revisions opened with a handshake: initialize, agree a version, then keep a session tied to that connection. The 2026-07-28 revision makes MCP stateless. Every request carries what the server needs to read it in params._meta: the protocol version and the client\'s capabilities. A request without it is malformed. Because nothing hides in a connection, any copy of a server behind a load balancer can answer any request, and a restart loses nothing. When a workflow needs continuity, such as which clinic calendar was chosen, the server hands back an opaque handle and the client passes it as an ordinary argument. Clients find out what a server supports with server/discover, which lists versions and capabilities; old servers that don\'t know it get the old initialize flow from a client that supports both. Lists carry ttlMs and a cache scope, so a client can reuse a tool list instead of fetching it before every call. And when a tool needs more from the person, the result says input_required; the client asks, then calls again with the answer.',
  keywords: ['Model Context Protocol', 'MCP', 'stateless MCP', 'JSON-RPC', 'server/discover', 'MCP tools', 'AI integration protocol'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 1, meta: true, ttl: true, old: false, dual: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* host, load balancer, three copies of the calendar server; an envelope carries each message; the gold key is the chosen calendar */
    const HX = -2.35, LX = -1.0, RX0 = 0.35, REPZ = [-0.75, -0.15, 0.45];
    const host = P.robot(CHAR, { scale: 1.1 }); host.position.set(HX, 0, -0.15); S.add(host);
    const lb = P.box(0.45, 0.34, 1.6, '#8E8C84', { r: 0.05 }); lb.position.set(LX, 0, -0.15); S.add(lb);
    const reps = REPZ.map((z, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.7, 0.36, 0.42, '#fff', { r: 0.04, material: mm }); b.position.set(RX0, 0, z); S.add(b);
      const lamp = P.lamp(GOOD, { h: 0.45, r: 0.08 }); lamp.position.set(RX0 + 0.45, 0, z); S.add(lamp);
      return { b, mm, lamp };
    });
    const wire = P.box(LX - 0.22 - HX - 0.3, 0.02, 0.04, '#B9B4A8', { r: 0 }); wire.position.set((HX + 0.3 + LX - 0.22) / 2, 0.02, -0.15); S.add(wire);
    REPZ.forEach(z => { const w = P.box(RX0 - 0.35 - (LX + 0.22), 0.02, 0.04, '#B9B4A8', { r: 0 }); w.position.set((LX + 0.22 + RX0 - 0.35) / 2, 0.02, z); S.add(w); });
    const envM = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), env = P.box(0.22, 0.1, 0.16, '#fff', { r: 0.02, material: envM }); env.userData.noFit = true; S.add(env);
    const keyM = new THREE.MeshLambertMaterial({ color: SAF }), key = P.box(0.12, 0.1, 0.12, '#fff', { r: 0.02, material: keyM }); key.userData.noFit = true; S.add(key);
    /* results: failed calls and round trips */
    const failTw = P.tower(0.5, 0.5, RED, { size: 0.26 }), tripTw = P.tower(0.5, 0.5, '#7A5CC4', { size: 0.26 });
    failTw.position.set(1.55, 0, -0.45); tripTw.position.set(2.35, 0, 0.15); S.add(failTw, tripTw);
    S.add(P.keep(-2.7, 2.7, 1.45, -1.0, 0.7));
    let R = null, k = 0, clock = 0;
    const SP = 0.42;
    function show() {
      const m = R.M[Math.min(k, R.M.length - 1)];
      if (!m) return;
      const p = (clock % SP) / SP, rz = REPZ[m.rep];
      /* host → balancer → copy → back */
      let x, z;
      if (p < 0.3) { x = HX + 0.45 + (LX - HX - 0.45) * (p / 0.3); z = -0.15; }
      else if (p < 0.55) { const u = (p - 0.3) / 0.25; x = LX + (RX0 - 0.4 - LX) * u; z = -0.15 + (rz + 0.15) * u; }
      else { const u = (p - 0.55) / 0.45; x = RX0 - 0.4 - (RX0 - 0.4 - HX - 0.45) * u; z = rz + (-0.15 - rz) * Math.min(1, u * 2); }
      env.position.set(x, 0.12, z); envM.color.set(p < 0.55 ? '#FFFFFF' : m.ok ? '#BFE6DD' : BAD);
      const restarting = m.i >= RESTART[0] && m.i <= RESTART[1];
      reps.forEach((r, i) => { const off = i === 0 && restarting; r.mm.color.set(off ? '#B9B4A8' : i === m.rep && p > 0.3 && p < 0.6 ? SAF : GOOD); r.lamp.userData.set({ color: off ? RED : GOOD, on: true }); });
      /* handshake era: the chosen calendar lives on the copy holding the session; stateless: it rides in every request */
      const stateful = R.mode === 0 || st.mode === 0;
      key.visible = !R.gaveUp && !(stateful && !m.ok) && !(st.mode === 1 && !st.meta);
      if (stateful) key.position.set(RX0, 0.37, REPZ[m.rep]); else key.position.set(x, 0.22, z);
    }
    function draw() {
      R = trace(st); k = 0; clock = 0;
      const fails = R.gaveUp ? CALLS : R.fails;
      failTw.userData.set({ h: 0.05 + Math.min(1, fails / CALLS) * 1.3, cap: `${fails}`, color: fails ? RED : GOOD });
      tripTw.userData.set({ h: 0.05 + Math.min(1, R.rt / 90) * 1.3, cap: `${R.rt}` });
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { host.userData.tick(dt); host.userData.set({ busy: true }); failTw.userData.tick(dt); tripTw.userData.tick(dt); clock += dt; if (clock >= SP) { clock -= SP; k = Math.min(R.M.length - 1, k + 1); } show(); };
    const controls = [
      { type: 'buttons', label: 'Protocol', options: ['Handshake era', 'Stateless'], get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'toggle', label: 'Send the context note (_meta) with every request', short: 'Context', get: () => st.meta, set: v => set({ meta: !!v }) },
      { type: 'toggle', label: 'Cache tools/list for its ttlMs', short: 'Cache list', get: () => st.ttl, set: v => set({ ttl: !!v }), quick: false },
      { type: 'toggle', label: 'Server only speaks 2025-11-25', short: 'Old server', get: () => st.old, set: v => set({ old: !!v }), quick: false },
      { type: 'toggle', label: 'Client falls back to initialize', get: () => st.dual, set: v => set({ dual: !!v }), quick: false },
      { type: 'button', label: 'Replay the morning', act: () => { k = 0; clock = 0; show(); } },
    ];
    const readouts = [
      { label: 'Failed calls', get: () => ({ v: `${R.gaveUp ? CALLS : R.fails}`, sub: `of ${CALLS}`, bad: R.fails > 0 || R.gaveUp, good: !R.fails && !R.gaveUp }) },
      { label: 'Round trips', get: () => ({ v: `${R.rt}`, sub: `for ${CALLS} tool calls` }) },
      { label: 'State lost', get: () => ({ v: R.lost ? 'yes' : 'no', sub: 'chosen calendar', bad: !!R.lost, good: !R.lost }) },
    ];
    const labels = [
      { name: 'host', t: 'The host', d: 'The AI app and its MCP client; the gold key is the chosen calendar', icon: 'link', atV: V(HX - 0.25, 0.5, -0.15) },
      { name: 'lb', t: 'Load balancer', d: 'Sends each request to one of three server copies', icon: 'box', atV: V(LX - 0.25, 0.1, 0.5) },
      { name: 'fail', t: 'Failed calls', d: 'Out of forty tool calls', icon: 'target', atV: V(1.8, 0.6, -0.45) },
      { name: 'trips', t: 'Round trips', d: 'Every message sent, including handshakes and list fetches', icon: 'code', atV: V(2.6, 0.25, 0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Sessions on one copy', hint: 'the handshake era, during a restart', on: () => set({ ...D0, mode: 0 }), off: reset },
      { label: 'Leave out the context note', hint: 'requests sent without their _meta', on: () => set({ ...D0, meta: false }), off: reset },
      { label: 'Old server, no fallback', hint: 'a modern-only client', on: () => set({ ...D0, old: true, dual: false }), off: reset },
    ];
    function status() {
      if (R.gaveUp) return { ok: false, msg: `<b>The server only speaks 2025-11-25 and answers server/discover with "method not found" (-32601). This client knows nothing else, so all ${CALLS} calls fail.</b> A client that supports both eras treats an unrecognised error from discovery as a sign of an old server and falls back to initialize.` };
      if (st.mode === 1 && !st.meta) return { ok: false, msg: `<b>The client left out the context note, so the server turns away ${R.fails} of ${CALLS} calls.</b> In stateless MCP every request carries a small note called _meta that says which protocol version and features the client speaks. Without it the server can't read the request and replies with error -32602 (invalid params). That note is the price of letting any copy answer any request.` };
      if (R.mode === 0 || st.mode === 0) return { ok: st.old ? undefined : false, msg: `<b>${st.old ? 'Fell back to the handshake for an old server. ' : ''}Handshake era: copy 1 restarts and the session it held is gone. ${R.fails} call failed, the client had to initialize again, and the chosen calendar was lost.</b> Sessions tie state to one connection on one copy. Stateless requests let any copy answer and carry continuity as an ordinary argument, a handle the client sends back.` };
      return { ok: true, msg: `<b>Stateless: ${CALLS} tool calls, none failed, ${R.rt} round trips${st.ttl ? '' : `, ${CALLS} of them fetching the same tool list`}.</b> Copy 1 restarted and nobody noticed: every request carries its version and capabilities, and the chosen calendar travels as a handle in the arguments. ${st.ttl ? 'The tool list is reused for its ttlMs, so the model sees the same tools in the same order.' : 'Cache the list for its ttlMs instead of asking before every call.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The handshake era', home: true, say: 'A clinic\'s booking assistant in Gaborone calls a calendar server through MCP. In the handshake era, it opens a session on one copy of the server, and that session holds the clinic it chose.', act: m => m.set({ mode: 0, meta: true, ttl: true, old: false, dual: true }) },
    { t: 'A copy restarts', home: true, say: 'Mid-morning, copy one restarts. The session is gone: a call fails, the client starts over, and the chosen calendar has to be picked again.', act: m => m.set({ mode: 0 }) },
    { t: 'Stateless requests', home: true, say: 'In the stateless revision, every request carries its own context: the protocol version and the client\'s capabilities. Any copy can answer, so the restart goes unnoticed.', act: m => m.set({ mode: 1 }) },
    { t: 'State as an argument', home: true, say: 'The chosen calendar travels as a handle in each call\'s arguments. When a tool needs more from the person, the result says input required; the client asks, then calls again.', act: m => m.set({ mode: 1 }) },
    { t: 'Forget the context', home: true, say: 'Leave out the context and every request is malformed. Stateless means each message must stand on its own.', act: m => m.set({ meta: false }) },
    { t: 'Old servers', home: true, say: 'An old server doesn\'t know server discover. A client that speaks both eras falls back to the handshake and carries on.', act: m => m.set({ meta: true, old: true, dual: true }) },
  ],
  check: [
    { q: 'Why can any copy of a stateless MCP server answer any request?', options: ['Each request carries its protocol version and capabilities in _meta', 'The copies share one session', 'The load balancer remembers the session'], answer: 0, why: 'Nothing is hidden in a connection.', hint: 'Compare the two protocols during the restart.' },
    { q: 'How does a stateless workflow keep continuity, such as a chosen calendar?', options: ['The server returns an opaque handle the client passes back as an argument', 'It can\'t', 'Through a session ID header'], answer: 0, why: 'State becomes an ordinary argument.', hint: 'Read the messages on the wire.' },
    { q: 'What does resultType "input_required" mean?', options: ['The server needs more input; the client asks and calls again', 'The call failed', 'The tool list changed'], answer: 0, why: 'Multi round-trip requests replace server-initiated requests.', hint: 'Watch call 6.' },
  ],
  terms: [
    ['MCP', 'Model Context Protocol: one way for AI apps to find and use tools, resources and prompts from servers.'],
    ['Host', 'The AI application; it runs an MCP client for each server it uses.'],
    ['JSON-RPC', 'The message format: a request with a method and params, a response with a result or an error.'],
    ['_meta', 'The part of every request\'s params that carries protocol version and client capabilities.'],
    ['server/discover', 'A request that returns a server\'s supported versions, capabilities and identity.'],
    ['ttlMs', 'How long, in milliseconds, a client may reuse a list result.'],
    ['input_required', 'A result saying the server needs more input before it can finish.'],
  ],
  deeper: '<p><b>Primitives.</b> Tools are actions with a JSON Schema for their inputs; resources are content named by a URI; prompts are templates a host can offer to people. The basics lesson in the agents track shows the older flow from the start.</p><p><b>Transports.</b> Over standard input and output, a client starts the server as a child process. Over Streamable HTTP, every message is its own POST to one endpoint; a request\'s response can be a single JSON object or a short stream of events ending with the result.</p><p><b>What MCP does not do.</b> It standardises messages. It doesn\'t choose which tool to call, make untrusted content safe, or approve risky actions; the host decides those, and server identity in _meta is for logs, not trust.</p><p><b>About this machine.</b> The message sequence is built from the rules in the file header for 40 tool calls, with the restart during calls 18 to 21 and one call needing input. Each envelope is one message; the failed and round-trip towers count them.</p>',
  code: {
    title: 'A stateless MCP request',
    note: 'Adapted from the course\'s MCP lesson.',
    text: `
import itertools, json

ids = itertools.count(1)
META = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
}

def request(method, **params):
    return {"jsonrpc": "2.0", "id": next(ids), "method": method,
            "params": {**params, "_meta": META}}

discover = request("server/discover")
call = request("tools/call", name="calendar.book",
               arguments={"calendar": "cal_7Hq2", "slot": "2026-11-03T09:30"})
print(json.dumps(call, indent=2))
`,
  },
};
