// Exam prep, MCP transports and HTTP headers: an invented courier platform in Lomé runs the same server over stdio (a subprocess, one JSON
// message per line on stdout, logs on stderr, no headers) and over Streamable HTTP (one POST per message to /mcp, JSON or a request-scoped SSE
// stream, no GET, no session). On HTTP every POST mirrors MCP-Protocol-Version, Mcp-Method and Mcp-Name, and a tool's x-mcp-header argument
// becomes Mcp-Param-Region; a header that disagrees with the body is 400 with -32020; Origin is validated against DNS rebinding. Illustrative.
function run(o) {
  const http = o.transport === 1;
  const issues = [];
  if (http) {
    if (!o.match) issues.push('the MCP-Protocol-Version header said 2025-11-25 while _meta said 2026-07-28, and the server routed it anyway; it must reject with 400 and -32020');
    if (!o.origin) issues.push('the server did not check Origin, so a web page using DNS rebinding reached the local server; reply 403 to a bad Origin and bind to 127.0.0.1');
    if (!o.secret) issues.push('the api_key argument was marked x-mcp-header, so Mcp-Param-Api-Key exposed it to every proxy');
    if (!o.get) issues.push('the server answered GET with a long-lived stream; 2026-07-28 has no GET endpoint, so reply 405');
  } else {
    if (!o.stdout) issues.push('the server printed a debug line on stdout, corrupting the message stream; logs belong on stderr');
  }
  return { http, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-transports-and-http-headers',
  title: 'Exam prep, MCP: transports and the HTTP header contract',
  description: 'The same server runs over stdio and Streamable HTTP. On stdio, stdout is sacred. On HTTP, headers meet a proxy, an Origin check and a closed GET door.',
  overview: 'MCP 2026-07-28 defines two transports. On stdio, the client launches the server as a subprocess; the server reads JSON-RPC from stdin and writes to stdout, one message per line with no embedded newlines. stdout carries only valid MCP messages, and logs go to stderr, which does not mean errors. There is no header layer: all metadata lives in params._meta. To cancel, the client sends notifications/cancelled; to shut down, it closes stdin, waits, then escalates to SIGTERM and SIGKILL. After an unexpected exit, the client restarts the server, retries lost requests and re-sends subscriptions/listen. stdio implementations should read credentials from the environment rather than use the OAuth flow. Streamable HTTP exposes one endpoint, such as /mcp, that accepts POST. Every request or notification is its own POST, with Accept listing application/json and text/event-stream; the server answers a request with one JSON object or an SSE stream scoped to that request, which carries request-related notifications and then the final response, and a notification POST gets 202 Accepted. There is no GET endpoint, no session and no resumability: a modern server answers GET or DELETE with 405 and ignores session and event-id headers, and a broken stream means reissuing with a new id. Validate Origin and reply 403 if it is present and invalid, to stop DNS rebinding, bind to 127.0.0.1 when local, and authenticate. Headers mirror the body so gateways can route without parsing JSON: MCP-Protocol-Version on every POST (equal to the _meta version), Mcp-Method on every request and Mcp-Name on tools/call, resources/read and prompts/get. A tool argument marked x-mcp-header (integer, string or boolean, never number) is mirrored as Mcp-Param-{Name}; non-ASCII values use the =?base64?…?= sentinel, sensitive values must not be marked, and a header that disagrees with the body is rejected with 400 and -32020. HTTP+SSE from 2024-11-05 is deprecated. The platform is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'stdio', 'streamable http', 'headers', 'origin', 'x-mcp-header', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { transport: 0, match: true, origin: true, secret: true, get: true, stdout: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const client = P.robot('#3D6BD6', { scale: 0.62 }); client.position.set(-2.45, 0, -0.35); S.add(client);
    const server = P.box(0.56, 0.5, 1.1, '#5B8DB8', { r: 0.05 }); server.position.set(1.0, 0, -0.35); S.add(server);
    /* stdio: one pipe, and a drain where logs belong */
    const stdio = P.pipe([V(-2.15, 0.2, -0.65), V(-0.6, 0.2, -0.65), V(0.7, 0.2, -0.65)], GOOD, { r: 0.05, n: 6 }); S.add(stdio);
    const drain = P.pipe([V(1.3, 0.1, -0.65), V(1.55, 0.1, -0.65), V(1.8, 0.1, -0.65)], '#8E91A3', { r: 0.03, n: 3 }); S.add(drain);
    const tray = P.box(0.3, 0.05, 0.3, '#8E91A3', { r: 0.02 }); tray.position.set(1.95, 0, -0.65); S.add(tray);
    /* HTTP: a belt through a proxy that reads headers, past a version lamp, to an Origin gate */
    const line = P.belt(V(-2.15, 0, 0), V(0.7, 0, 0), { w: 0.3, speed: 0.85 }); S.add(line);
    const proxy = P.robot('#7B6FA8', { scale: 0.5 }); proxy.position.set(-1.2, 0, 0.36); S.add(proxy);
    const ver = P.lamp(GOOD, { h: 0.14, r: 0.08 }); ver.position.set(-0.6, 0, 0.36); S.add(ver);
    const origin = P.gate(0.44, GOOD, { h: 0.38 }); origin.rotation.y = Math.PI / 2; origin.position.set(0.3, 0, 0); S.add(origin);
    /* the GET door beside the server: closed is right */
    const doorM = new THREE.MeshLambertMaterial({ color: GOOD }), door = P.box(0.12, 0.32, 0.34, '#fff', { r: 0.02, material: doorM }); door.position.set(1.4, 0, 0); S.add(door);
    S.add(P.keep(-2.65, 2.15, 0.75, -0.95, 0.6));
    const parts = [client, proxy, stdio, drain, line];
    let clock = 0;

    let R = null;
    function draw() {
      R = run(st);
      stdio.visible = !R.http; drain.visible = !R.http; tray.visible = !R.http;
      stdio.userData.set({ color: st.stdout ? GOOD : BAD });
      line.visible = !!R.http; proxy.visible = !!R.http; ver.visible = !!R.http; door.visible = !!R.http; origin.visible = !!(R.http && st.origin);
      proxy.userData.set({ busy: !st.secret, color: st.secret ? '#7B6FA8' : BAD });
      ver.userData.set({ color: st.match ? GOOD : BAD, on: true });
      doorM.color.set(st.get ? GOOD : BAD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'stdout only carries MCP messages', short: 'Clean stdout', get: () => st.stdout, set: v => set({ stdout: !!v }) },
      { type: 'buttons', label: 'Transport', options: ['stdio', 'Streamable HTTP'], get: () => st.transport, act: i => set({ transport: i }) },
      { type: 'toggle', label: 'Reject headers that disagree with the body', short: 'Header match', get: () => st.match, set: v => set({ match: !!v }) },
      { type: 'toggle', label: 'Validate Origin', short: 'Origin', get: () => st.origin, set: v => set({ origin: !!v }) },
      { type: 'toggle', label: 'Never mirror secrets into headers', short: 'No secrets', get: () => st.secret, set: v => set({ secret: !!v }) },
      { type: 'toggle', label: 'Answer GET with 405', short: 'No GET', get: () => st.get, set: v => set({ get: !!v }) },
    ];
    const readouts = [
      { label: 'Transport', get: () => ({ v: R.http ? 'Streamable HTTP' : 'stdio', sub: R.http ? 'one POST per message' : 'subprocess' }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'on this transport', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'w', t: 'The client', d: 'Lines on stdio, headers on HTTP', icon: 'code', atV: V(-2.65, 0.25, -0.35) },
      { name: 't', t: 'The server', d: 'Teal: the contract held', icon: 'check', atV: V(1.28, 0.3, -0.2) },
    ];
    const reset = () => set({ ...D0, transport: st.transport });
    const breaks = [
      { label: 'Let the header disagree with _meta', hint: '400 and -32020', on: () => set({ ...D0, transport: 1, match: false }), off: reset },
      { label: 'Skip the Origin check', hint: 'DNS rebinding', on: () => set({ ...D0, transport: 1, origin: false }), off: reset },
      { label: 'Mirror a secret into a header', hint: 'proxies read headers', on: () => set({ ...D0, transport: 1, secret: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: R.http ? '<b>Each message is its own POST to /mcp; MCP-Protocol-Version, Mcp-Method, Mcp-Name and Mcp-Param-Region match the body; a bad Origin gets 403; GET gets 405; and no secret is mirrored into a header.</b>' : '<b>On stdio, stdin and stdout carry one JSON-RPC message per line, logs go to stderr, and all metadata travels in _meta, with no header layer.</b>' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.1) { clock = 0; if (R.http) line.userData.send(R.ok ? GOOD : BAD, { size: 0.16 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'stdio', home: true, say: 'On stdio, the server is a subprocess. Each message is one line, and stdout carries nothing else.', act: m => m.set({ transport: 0, match: true, origin: true, secret: true, get: true, stdout: true }) },
    { t: 'Logs on stderr', home: true, say: 'A debug line on stdout corrupts the stream. Logs belong on stderr.', act: m => m.set({ transport: 0, match: true, origin: true, secret: true, get: true, stdout: false }) },
    { t: 'Streamable HTTP', home: true, say: 'On HTTP, every message is its own POST to one endpoint, answered with JSON or a stream.', act: m => m.set({ transport: 1, match: true, origin: true, secret: true, get: true, stdout: true }) },
    { t: 'Mirrored headers', home: true, say: 'Headers mirror the body so gateways can route. If they disagree, the server rejects the request.', act: m => m.set({ transport: 1, match: false, origin: true, secret: true, get: true, stdout: true }) },
    { t: 'Check the origin', home: true, say: 'A bad origin gets forbidden, which stops web pages reaching a local server.', act: m => m.set({ transport: 1, match: true, origin: true, secret: true, get: true, stdout: true }) },
    { t: 'No GET, no session', home: true, say: 'There is no GET stream and no session. A GET gets method not allowed.', act: m => m.set({ transport: 1, match: true, origin: true, secret: true, get: true, stdout: true }) },
  ],
  check: [
    { q: 'MCP-Protocol-Version says 2025-11-25 but _meta says 2026-07-28. What happens?', options: ['400 with -32020 HeaderMismatch', 'The header wins', 'The body wins silently'], answer: 0, why: 'Headers must equal the body.', hint: 'Try Let the header disagree with _meta.' },
    { q: 'Why validate Origin on a local HTTP server?', options: ['To stop DNS rebinding from web pages', 'To speed up requests', 'It is not needed on localhost'], answer: 0, why: 'Reply 403 to a bad Origin.', hint: 'Try Skip the Origin check.' },
    { q: 'Should an API key argument be marked x-mcp-header?', options: ['No: headers are visible to intermediaries', 'Yes, for routing', 'Only on stdio'], answer: 0, why: 'Never secrets, tokens or personal data.', hint: 'Try Mirror a secret into a header.' },
  ],
  practice: [
    { q: 'Where should a stdio server write logs?', options: ['stderr', 'stdout', 'A notification', 'Nowhere'], answer: 0, why: 'stdout carries only MCP messages.' },
    { q: 'What does a modern server answer to GET /mcp?', options: ['405 Method Not Allowed', 'An SSE stream', '200 with a session', '404'], answer: 0, why: 'No GET endpoint in 2026-07-28.' },
    { q: 'What does a notification POST get on Streamable HTTP?', options: ['202 Accepted, no body', 'A result', '200 with JSON', '204 always'], answer: 0, why: 'Notifications get no reply.' },
    { q: 'Which requests carry Mcp-Name?', options: ['tools/call, resources/read and prompts/get', 'Every request', 'Notifications only', 'server/discover'], answer: 0, why: 'From params.name or params.uri.' },
    { q: 'A mirrored header value is not plain ASCII. How is it sent?', options: ['With the =?base64?…?= sentinel', 'Dropped', 'As raw UTF-8', 'In the body only'], answer: 0, why: 'Header values must be visible ASCII.' },
    { q: 'How should a stdio server get credentials?', options: ['From the environment', 'Through the OAuth flow', 'From clientInfo', 'From a header'], answer: 0, why: 'stdio should not use the OAuth flow.' },
  ],
  terms: [
    ['stdio', 'A subprocess transport: one JSON message per line.'],
    ['Streamable HTTP', 'One endpoint, one POST per message, JSON or SSE replies.'],
    ['MCP-Protocol-Version', 'A header that must equal the _meta version.'],
    ['Mcp-Method', 'A header mirroring the JSON-RPC method.'],
    ['x-mcp-header', 'Marks a primitive argument to mirror as Mcp-Param-{Name}.'],
    ['Origin validation', 'Rejecting bad origins with 403 to stop DNS rebinding.'],
  ],
  deeper: '<p><b>Custom transports.</b> Transports over a reliable byte stream reuse the stdio framing rather than inventing their own.</p><p><b>About this machine.</b> The platform and keys are invented.</p>',
  code: {
    title: 'Check headers against the body',
    note: 'Written for this lesson.',
    text: `
def check_headers(headers, body):
    meta = body.get("params", {}).get("_meta", {})
    want = {"MCP-Protocol-Version": meta.get("io.modelcontextprotocol/protocolVersion")}
    if "id" in body:
        want["Mcp-Method"] = body["method"]
    if body.get("method") in ("tools/call", "prompts/get"):
        want["Mcp-Name"] = body["params"]["name"]
    if body.get("method") == "resources/read":
        want["Mcp-Name"] = body["params"]["uri"]
    for h, v in want.items():
        if headers.get(h) != v:
            return 400, {"code": -32020, "message": f"{h} does not match the body"}
    return None

def check_origin(headers):
    o = headers.get("Origin")
    return 403 if o is not None and o not in ALLOWED_ORIGINS else None
`,
  },
};
