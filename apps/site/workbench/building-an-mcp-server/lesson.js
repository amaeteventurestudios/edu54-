// Building an MCP server: a notes server for community health workers in Mzuzu, speaking JSON-RPC over stdio (one JSON message per line on stdout).
// Twelve requests arrive from three clients: Chikondi's app (A), Thoko's app (B) and an old client (C) that only speaks 2025-11-25.
// The server's loop: parse the line; a notification gets no reply; check params._meta (version and capabilities required: missing → −32602; unsupported version → −32022
// with the supported list); route by method (unknown → −32601); run; wrap every success with resultType "complete" and serverInfo; list and read results carry ttlMs and cacheScope.
// A tool that runs but fails returns isError: true with a message the model can act on; protocol errors are for bad envelopes and parameters only.
// A shared cache sits in front: it reuses any response marked cacheScope "public". Notes are per user, so their reads must be "private".
const REQ = [
  { who: 'A', m: 'server/discover', line: true },
  { who: 'A', m: 'tools/list' },
  { who: 'A', m: 'tools/call', tool: 'notes_search', arg: 'malaria' },
  { who: 'B', m: 'tools/call', tool: 'notes_read', arg: '99', fails: true },
  { who: 'A', m: 'resources/read', uri: 'notes://mine/today' },
  { who: 'B', m: 'resources/read', uri: 'notes://mine/today' },
  { who: 'C', m: 'tools/list', ver: '2025-11-25' },
  { who: 'B', m: 'tools/list', nometa: true },
  { who: 'A', m: 'notes/export' },
  { who: 'A', m: 'notifications/cancelled', note: true },
  { who: 'B', m: '{"jsonrpc": "2.0", "id": 11, "method": "tools/li', broken: true },
  { who: 'B', m: 'prompts/get', prompt: 'visit_summary' },
];
const TODAY = { A: 'Visited 6 homes in Chibavi; 2 referrals for fever.', B: 'Visited 4 homes in Katoto; 1 child weighed.' };
const KNOWN = ['server/discover', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get'];
function run(st) {
  const cache = new Map(), out = []; let streamOk = true, logAt = -1;
  REQ.forEach((r, i) => {
    if (!streamOk) { out.push({ code: 'lost', text: 'client stopped reading: stream corrupted', bad: true }); return; }
    if (st.log && i === 3) { logAt = i; streamOk = false; out.push({ code: 'garbage', text: 'stdout: "DEBUG loaded 1,204 notes" then the reply: the client can\'t parse the line', bad: true }); return; }
    if (r.broken) { out.push({ code: -32700, text: 'Parse error: the line is not complete JSON' }); return; }
    if (r.note) { out.push({ code: 'none', text: 'a notification: no reply is sent' }); return; }
    if (r.nometa) { out.push({ code: -32602, text: 'Invalid params: params._meta is missing (version and capabilities are required on every request)' }); return; }
    if (r.ver) { out.push({ code: -32022, text: 'Unsupported protocol version 2025-11-25; supported: ["2026-07-28"]' }); return; }
    if (!KNOWN.includes(r.m)) { out.push({ code: -32601, text: `Method not found: ${r.m}` }); return; }
    if (r.m === 'tools/call' && r.fails) {
      if (st.isError) out.push({ code: 'ok', text: 'resultType complete · isError: true · "No note 99. Use notes_search to find note IDs."' });
      else out.push({ code: -32603, text: 'Internal error (the model only sees that something broke)', bad: true });
      return;
    }
    if (r.m === 'resources/read') {
      const scope = st.priv ? 'private' : 'public', key = r.uri;
      if (scope === 'public' && cache.has(key)) { const hit = cache.get(key); out.push({ code: 'ok', text: `served from the shared cache: "${hit.text}"`, leak: hit.who !== r.who, bad: hit.who !== r.who }); return; }
      if (scope === 'public') cache.set(key, { who: r.who, text: TODAY[r.who] });
      out.push({ code: 'ok', text: `resultType complete · cacheScope ${scope} · "${TODAY[r.who]}"` });
      return;
    }
    const what = { 'server/discover': 'supportedVersions ["2026-07-28"], capabilities, ttlMs 3600000, cacheScope public', 'tools/list': '3 tools in a fixed order, ttlMs 600000, cacheScope public', 'tools/call': '2 notes mention malaria', 'prompts/get': 'a visit-summary prompt, filled in' }[r.m];
    out.push({ code: 'ok', text: `resultType complete · ${what}` });
  });
  return { out, leaks: out.filter(o => o.leak).length, lost: out.filter(o => o.code === 'lost' || o.code === 'garbage').length, hidden: out.filter(o => o.code === -32603).length };
}

export default {
  slug: 'building-an-mcp-server',
  title: 'An MCP server: validate, route, label every reply',
  description: 'A notes server for health workers in Mzuzu answers twelve requests from three apps over stdio, each with exactly the reply the protocol asks for.',
  overview: 'An MCP server is a small loop. Over stdio it reads one JSON-RPC message per line from standard input and writes one reply per line to standard output; anything else on standard output, such as a log line, corrupts the stream, so diagnostics go to standard error. For each line it parses the envelope; a notification gets no reply; a request must carry its protocol version and client capabilities in params._meta, and the server answers with a precise error when it doesn\'t: −32602 for missing or malformed parameters, −32022 with the list of supported versions for an unsupported one, −32601 for an unknown method, −32700 for a line that isn\'t JSON. Successful replies are all wrapped the same way: resultType "complete" and the server\'s identity, plus cache hints (ttlMs and cacheScope) on lists and reads. Two distinctions matter in practice. A tool that runs and fails is not a protocol error: return a normal result with isError true and a message the model can act on. And cache scope is a correctness setting: a user\'s own data must be marked private, or a shared cache in front of the server will hand one user\'s reply to another.',
  keywords: ['MCP server', 'Model Context Protocol', 'JSON-RPC errors', 'stdio transport', 'isError', 'cacheScope', 'MCP tools'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { log: false, priv: true, isError: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const WHO = { A: '#5B8DB8', B: '#7B6FA8', C: '#8E8C84' };
    /* three client apps send requests along a belt into the server; replies leave on a second belt into a rack of twelve slots */
    const SX = -0.5, CZ = [-0.65, 0, 0.65];
    const clients = ['A', 'B', 'C'].map((w, i) => { const r = P.robot(WHO[w], { scale: 0.8 }); r.position.set(-2.55, 0, CZ[i]); S.add(r); return r; });
    const beltIn = P.belt(V(-2.1, 0, 0), V(SX - 0.45, 0, 0), { speed: 1.6, w: 0.32 }); S.add(beltIn);
    const srv = P.box(0.8, 0.5, 1.1, CHAR, { r: 0.06 }); srv.position.set(SX, 0, 0); S.add(srv);
    const beltOut = P.belt(V(SX + 0.45, 0, 0), V(1.25, 0, 0), { speed: 1.6, w: 0.32 }); S.add(beltOut);
    const rack = P.shelf(6, { levels: 2, cell: 0.24, lh: 0.28, d: 0.3 }); rack.position.set(2.0, 0, -0.4); S.add(rack);
    /* the shared cache in front of the server, and the stderr bin behind it with its lamp */
    const cacheM = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), cache = P.box(0.7, 0.22, 0.4, '#fff', { r: 0.05, material: cacheM }); cache.position.set(SX, 0, 0.9); S.add(cache);
    const errBin = P.box(0.45, 0.2, 0.35, '#6B6E7E', { r: 0.04 }); errBin.position.set(SX, 0, -0.9); S.add(errBin);
    const errLamp = P.lamp(GOOD, { h: 0.35, r: 0.08 }); errLamp.position.set(SX + 0.35, 0, -0.9); S.add(errLamp);
    const okTw = P.tower(0.5, 0.5, GOOD, { size: 0.3 }); okTw.position.set(2.45, 0, 0.6); S.add(okTw);
    S.add(P.keep(-2.85, 2.9, 1.3, -1.15, 1.15));

    let R = null, k = 0, clock = 0;
    const SP = 0.9, col = o => o.bad ? RED : typeof o.code === 'number' ? '#C9A227' : o.code === 'none' ? '#B9B4A8' : GOOD;
    function show() {
      rack.userData.set({ fill: R.out.map((o, i) => i < k ? col(o) : null).concat(Array(12 - R.out.length).fill(null)) });
      cacheM.color.set(R.leaks && k > 5 ? RED : '#D9D4C7');
      errLamp.userData.set({ color: st.log ? RED : GOOD, on: true });
      const good = R.out.filter(o => !o.bad).length;
      okTw.userData.set({ h: 0.05 + good / 12 * 1.1, cap: `${good}/12`, color: good === 12 ? GOOD : good < 10 ? RED : SAF });
    }
    function step() {
      const r = REQ[k], o = R.out[k];
      clients.forEach((c, i) => c.userData.set({ busy: ['A', 'B', 'C'][i] === r.who }));
      beltIn.userData.send(WHO[r.who], { size: 0.18, done: () => { if (o.code !== 'none') beltOut.userData.send(col(o), { size: 0.18 }); } });
    }
    function draw() {
      R = run(st); k = 0; clock = 0; beltIn.userData.clear(); beltOut.userData.clear();
      show(); step();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      clients.forEach(c => c.userData.tick(dt)); beltIn.userData.tick(dt); beltOut.userData.tick(dt); okTw.userData.tick(dt);
      clock += dt; if (clock >= SP) { clock -= SP; if (k < REQ.length) { k++; show(); if (k < REQ.length) step(); } }
    };
    const controls = [
      { type: 'toggle', label: 'Logs go to stderr', short: 'stderr logs', get: () => !st.log, set: v => set({ log: !v }) },
      { type: 'toggle', label: 'Mark per-user reads private', short: 'Private cache', get: () => st.priv, set: v => set({ priv: !!v }) },
      { type: 'toggle', label: 'Tool failures as isError results', short: 'isError', get: () => st.isError, set: v => set({ isError: !!v }), quick: false },
      { type: 'button', label: 'Send the twelve again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Replies as the protocol asks', get: () => { const good = R.out.filter(o => !o.bad).length; return { v: `${good} of 12`, sub: 'right code or result', good: good === 12, bad: good < 10 }; } },
      { label: 'Notes leaked', get: () => ({ v: `${R.leaks}`, sub: 'to another user', bad: R.leaks > 0, good: !R.leaks }) },
      { label: 'Replies lost', get: () => ({ v: `${R.lost}`, sub: 'stream corrupted', bad: R.lost > 0 }) },
    ];
    const labels = [
      { name: 'in', t: 'Three apps', d: 'Requests ride in one per line, coloured by app', icon: 'link', atV: V(-2.85, 0.4, 0) },
      { name: 'srv', t: 'The server', d: 'Parse, check _meta, route, wrap; the grey bin behind is stderr', icon: 'box', atV: V(SX, 0.5, -0.55) },
      { name: 'out', t: 'Replies', d: 'Green result, gold exact error code, grey none, red wrong or lost; the tower counts the right ones', icon: 'code', atV: V(2.8, 0.3, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Log to stdout', hint: 'a debug line in the reply stream', on: () => set({ ...D0, log: true }), off: reset },
      { label: 'Private notes cached as public', hint: 'cacheScope public on per-user reads', on: () => set({ ...D0, priv: false }), off: reset },
      { label: 'Tool failure as a protocol error', hint: 'no isError', on: () => set({ ...D0, isError: false }), off: reset },
    ];
    function status() {
      if (st.log) return { ok: false, msg: `<b>A log line on stdout: from the fourth request on, ${R.lost} replies are lost.</b> Over stdio, standard output carries only JSON-RPC messages, one per line. "DEBUG loaded 1,204 notes" is not JSON, so the client's parser fails and stops reading. Send diagnostics to standard error.` };
      if (!st.priv) return { ok: false, msg: `<b>Thoko asked for her notes and got Chikondi's: "${TODAY.A}"</b> Both apps read notes://mine/today. Marked cacheScope public, the shared cache in front of the server stored the first reply and reused it for the second user. Per-user reads must be private, so a shared cache never crosses users.` };
      if (!st.isError) return { ok: false, msg: `<b>A failed tool reported as a protocol error: the model only learns that something broke.</b> notes_read ran and found no note 99. That is a tool result, not a broken request: return isError true with a message the model can act on ("No note 99. Use notes_search to find note IDs."). Keep protocol errors for bad envelopes and parameters.` };
      return { ok: true, msg: '<b>Twelve requests, twelve correct replies.</b> Good requests get results labelled complete, with cache hints on lists and reads; the old client gets −32022 and the supported versions; a request without _meta gets −32602; an unknown method −32601; a cut-off line −32700; the notification gets nothing. The failed lookup is a normal result with isError true.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A server is a loop', home: true, say: 'A notes server for community health workers in Mzuzu reads one request per line and writes one reply per line. Each request is parsed, checked and routed, and every success is labelled complete.', act: m => m.set({ log: false, priv: true, isError: true }) },
    { t: 'Exact errors', home: true, say: 'An old client gets the list of versions the server supports. A request without its context gets invalid params. An unknown method, a cut-off line and a notification each get exactly what the protocol says.', act: m => m.set({ log: false }) },
    { t: 'Logs on stdout', home: true, say: 'Print one debug line to standard output, and the client\'s parser chokes. Every reply after it is lost. Logs go to standard error.', act: m => m.set({ log: true }) },
    { t: 'A tool that fails', home: true, say: 'A lookup finds no such note. That is a result, not a protocol failure: send it with isError and a message the model can act on.', act: m => m.set({ log: false, isError: true }) },
    { t: 'Private means private', home: true, say: 'Two health workers read "my notes for today". Mark it public, and a shared cache hands one worker\'s notes to the other.', act: m => m.set({ priv: false }) },
    { t: 'Every reply right', home: true, say: 'Logs on standard error, per-user reads private, tool failures as results. Twelve requests, twelve correct replies.', act: m => m.set({ priv: true }) },
  ],
  check: [
    { q: 'Why must an MCP server over stdio never print logs to standard output?', options: ['Standard output carries only JSON-RPC messages; anything else breaks the client\'s parser', 'Logs are secret', 'It is slower'], answer: 0, why: 'Use standard error for diagnostics.', hint: 'Try Log to stdout.' },
    { q: 'A tool runs but finds nothing. How should the server reply?', options: ['A normal result with isError true and a helpful message', 'A JSON-RPC protocol error', 'No reply'], answer: 0, why: 'Protocol errors are for bad envelopes and parameters.', hint: 'Try Tool failure as a protocol error.' },
    { q: 'Why mark a user\'s own notes cacheScope "private"?', options: ['So a shared cache never serves them to another user', 'To make them load faster', 'Private is the default'], answer: 0, why: 'Cache scope is a correctness setting.', hint: 'Try Private notes cached as public.' },
  ],
  terms: [
    ['stdio transport', 'The client starts the server as a process and exchanges one JSON message per line.'],
    ['JSON-RPC error code', 'A number naming what went wrong: −32700 parse, −32601 method, −32602 params.'],
    ['−32022', 'MCP\'s unsupported-version error, with the versions the server does support.'],
    ['resultType', 'Every success says whether it is complete or needs more input.'],
    ['isError', 'A flag on a tool result saying the tool ran but failed.'],
    ['cacheScope', 'Public lets any cache reuse a reply; private keeps it to the caller.'],
  ],
  deeper: '<p><b>Tool annotations.</b> Hints such as read-only, destructive or idempotent help a host decide when to ask for confirmation. They are hints: the server still enforces real permissions.</p><p><b>No calls back.</b> A modern server never sends its own requests to the client. When a tool needs the user or the model, it returns input_required and the client calls again with the answer.</p><p><b>Stable lists.</b> Return tools, resources and prompts in a fixed order so caches and the model\'s prompt stay stable from call to call.</p><p><b>About this machine.</b> The twelve requests and the server\'s replies follow the 2026-07-28 rules described in the file header; the replies are shortened.</p>',
  code: {
    title: 'The dispatch loop',
    note: 'Adapted from the course\'s MCP server lesson.',
    text: `
import json, sys

def main():
    for line in sys.stdin:
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            reply(None, error=(-32700, "Parse error")); continue
        if "id" not in msg:
            continue                                   # notification: no reply
        meta = msg.get("params", {}).get("_meta")
        if not meta or VERSION not in meta or CAPS not in meta:
            reply(msg["id"], error=(-32602, "params._meta is required")); continue
        if meta[VERSION] not in SUPPORTED:
            reply(msg["id"], error=(-32022, "Unsupported version", {"supported": SUPPORTED})); continue
        handler = HANDLERS.get(msg["method"])
        if handler is None:
            reply(msg["id"], error=(-32601, "Method not found")); continue
        reply(msg["id"], result={"resultType": "complete", **handler(msg["params"]),
                                 "_meta": {SERVER_INFO: INFO}})

def reply(id, result=None, error=None):
    print(json.dumps({"jsonrpc": "2.0", "id": id, **({"result": result} if error is None else
          {"error": {"code": error[0], "message": error[1]}})}), flush=True)   # stdout: messages only
`,
  },
};
