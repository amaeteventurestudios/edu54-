// MCP over HTTP (Streamable HTTP, 2026-07-28): a pharmacy's local MCP server on the counter laptop in Nairobi, with stock tools (stock_search, stock_delete).
// One endpoint, /mcp, POST only: GET and DELETE get 405. A notification gets 202 and no body. Every request mirrors its version, method and tool name in headers
// (MCP-Protocol-Version, Mcp-Method, Mcp-Name) which must equal the JSON body: a mismatch is HTTP 400 with JSON-RPC −32020. An unsupported version is 400 with −32022.
// An unknown method is 404 with −32601. A browser request carries an Origin header: one that isn't on the allowed list exactly gets 403 (this stops DNS rebinding).
// A gateway in front allows only read-only tools, deciding by the Mcp-Name header. The server is bound to 127.0.0.1 or to every interface on the shop's wifi.
const REQ = [
  { from: 'app', line: 'POST tools/list', res: [200, 'tools: stock_search, stock_delete'] },
  { from: 'app', line: 'POST tools/call · Mcp-Name: stock_search', res: [200, 'stream: progress, then 4 matches for "amoxicillin"'] },
  { from: 'app', line: 'GET /mcp', res: [405, 'Method Not Allowed: no standalone stream'] },
  { from: 'app', line: 'DELETE /mcp', res: [405, 'Method Not Allowed: there are no sessions to end'] },
  { from: 'app', line: 'POST notifications/cancelled', res: [202, 'accepted, no body'] },
  { from: 'portal', line: 'POST tools/call · Origin: https://pharmacy-portal.example', res: [200, 'allowed origin: 4 matches'] },
  { from: 'tab', line: 'POST stock_delete · Origin: https://free-coupons.example', origin: 'https://free-coupons.example', danger: true },
  { from: 'tab', line: 'POST stock_delete · Origin: https://pharmacy-portal.example.evil.example', origin: 'https://pharmacy-portal.example.evil.example', danger: true },
  { from: 'gateway', line: 'POST · header Mcp-Name: stock_search · body name: stock_delete', mismatch: true, danger: true },
  { from: 'app', line: 'POST · MCP-Protocol-Version: 2027-01-01', res: [400, '−32022: supported ["2026-07-28"]'] },
  { from: 'app', line: 'POST stock/export', res: [404, '−32601: method not found'] },
  { from: 'wifi', line: 'POST stock_delete from another laptop on the wifi', lan: true, danger: true },
];
const ALLOWED = 'https://pharmacy-portal.example';
function run(st) {
  const out = REQ.map(r => {
    if (r.lan) return st.bind ? { s: '—', t: 'unreachable: the server only listens on 127.0.0.1' } : { s: 200, t: 'stock list deleted: the server listened on every interface', harm: true };
    if (r.origin) {
      const pass = st.origin === 2 ? true : st.origin === 1 ? r.origin.startsWith(ALLOWED) : r.origin === ALLOWED;
      return pass ? { s: 200, t: `stock list deleted by a web page (${st.origin === 1 ? 'prefix check passed' : 'no origin check'})`, harm: true } : { s: 403, t: 'Forbidden: origin not allowed' };
    }
    if (r.mismatch) return st.headers ? { s: 400, t: '−32020: Mcp-Name header doesn\'t match the body' } : { s: 200, t: 'gateway allowed "stock_search"; server ran stock_delete from the body', harm: true };
    return { s: r.res[0], t: r.res[1] };
  });
  return { out, harms: out.filter(o => o.harm).length };
}

export default {
  slug: 'mcp-transports',
  title: 'MCP over HTTP: one endpoint, checked headers, checked origin',
  description: 'A Nairobi pharmacy\'s laptop runs a local MCP server. Twelve HTTP requests arrive, some from places that should never reach it.',
  overview: 'MCP messages travel two ways. Over stdio, the client starts the server as a child process and they exchange one JSON message per line. Over Streamable HTTP, the server exposes one endpoint and every message is a new POST: the reply is either one JSON response, or a short event stream for that request ending with the response; a notification gets 202 and no body. In the 2026-07-28 revision there is no standalone GET stream and no session to delete, so both get 405, and long-lived change notices come over a POST the client opens with subscriptions/listen. Each request mirrors its protocol version, method and tool name in HTTP headers so gateways can route and apply policy without parsing the body; the server must check that the headers match the body exactly, or a request labelled as a harmless search could carry a delete. Browsers add an Origin header to cross-site requests, and a local server must reject any origin not on its allowed list, compared exactly: that is what stops a web page from reaching a server on localhost through DNS rebinding. A local server should also listen only on 127.0.0.1. None of this is authentication: remote servers still check who is calling on every request.',
  keywords: ['MCP transport', 'Streamable HTTP', 'stdio', 'DNS rebinding', 'Origin header', 'MCP security', 'server-sent events'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.8, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { origin: 0, headers: true, bind: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const SRC = { app: ['Desktop app', '#5B8DB8'], portal: ['Pharmacy portal (browser)', '#1F9E89'], tab: ['A coupon site in a tab', '#E07A5F'], gateway: ['Gateway (read-only policy)', '#C9A227'], wifi: ['Another laptop on the wifi', '#7B6FA8'] };
    /* who sends: five coloured blocks (app, portal, a coupon tab, gateway, a laptop on the wifi) */
    const SXS = -2.35, srcs = Object.entries(SRC).map(([k, [n, c]], i) => { const z = -0.95 + i * 0.48, b = P.box(0.6, 0.28, 0.3, c, { r: 0.05 }); b.position.set(SXS, 0, z); S.add(b); return { k, z }; });
    /* the counter laptop, its stock (medicine boxes that vanish when a request deletes them), the check wall and the localhost fence */
    const LX = -0.65, lap = P.box(0.95, 0.06, 0.8, '#3A3B44', { r: 0.04 }); lap.position.set(LX, 0, -0.1); S.add(lap);
    const scr = P.box(0.95, 0.6, 0.04, '#2C2D31', { r: 0.03 }); scr.position.set(LX, 0.06, -0.5); S.add(scr);
    const stock = P.stack(0.36, 0.3, 0.1, { max: 6, color: '#1F9E89' }); stock.position.set(LX, 0.07, 0.05); S.add(stock);
    const wallM = new THREE.MeshLambertMaterial({ color: GOOD }), wall = P.box(0.07, 0.5, 1.6, '#fff', { r: 0.02, material: wallM }); wall.position.set(LX - 0.72, 0, -0.35); S.add(wall);
    const fenceM = new THREE.MeshLambertMaterial({ color: GOOD }), fence = P.box(1.1, 0.4, 0.06, '#fff', { r: 0.02, material: fenceM }); fence.position.set(-1.6, 0, 0.75); S.add(fence);
    const pkt = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); pkt.userData.noFit = true; S.add(pkt);
    /* the replies: a rack of twelve slots, coloured by what came back */
    const rack = P.shelf(6, { levels: 2, cell: 0.26, lh: 0.3, d: 0.3 }); rack.position.set(1.35, 0, -0.35); S.add(rack);
    const harmTw = P.tower(0.5, 0.5, RED, { size: 0.28 }); harmTw.position.set(1.85, 0, 0.6); S.add(harmTw);
    S.add(P.keep(-2.7, 2.2, 1.2, -1.2, 1.0));

    let R = null, k = 0, clock = 0;
    const rc = o => o.harm ? RED : o.s === 200 || o.s === 202 ? GOOD : o.s === '—' ? '#B9B4A8' : '#C9A227';
    function show() {
      rack.userData.set({ fill: R.out.map((o, i) => i <= k ? rc(o) : null) });
      const gone = R.out.slice(0, k + 1).filter(o => o.harm).length;
      stock.userData.set({ n: Math.max(0, 6 - gone * 2) });
      const r = REQ[k], s = srcs.find(x => x.k === r.from), u = Math.min(1, (clock % 1.1) / 0.8), o = R.out[k], blocked = o.s === 403 || o.s === '—';
      const tx = blocked ? (o.s === '—' ? -1.6 : LX - 0.78) : LX, tz = blocked && o.s === '—' ? 0.7 : -0.1;
      pkt.position.set(SXS + 0.35 + (tx - SXS - 0.35) * u, 0.45 + Math.sin(u * Math.PI) * 0.2, s.z + (tz - s.z) * u);
      pkt.material.color.set(u >= 1 ? rc(o) : SAF);
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      wallM.color.set(st.origin === 0 && st.headers ? GOOD : st.origin === 2 ? RED : SAF);
      fence.visible = !!st.bind;
      harmTw.userData.set({ h: 0.05 + R.harms / 4 * 1.0, cap: `${R.harms}`, color: R.harms ? RED : GOOD });
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { harmTw.userData.tick(dt); clock += dt; if (clock >= 1.1) { clock -= 1.1; if (k < REQ.length - 1) k++; } show(); };
    const controls = [
      { type: 'buttons', label: 'Origin check', options: ['Exact match', 'Prefix match', 'None'], get: () => st.origin, act: i => set({ origin: i }) },
      { type: 'toggle', label: 'Compare headers with the body', short: 'Check headers', get: () => st.headers, set: v => set({ headers: !!v }) },
      { type: 'toggle', label: 'Listen on 127.0.0.1 only', short: 'Localhost only', get: () => st.bind, set: v => set({ bind: !!v }) },
      { type: 'button', label: 'Send the twelve again', act: () => { k = 0; clock = 0; show(); } },
    ];
    const readouts = [
      { label: 'Stock deleted', get: () => ({ v: `${R.harms}`, sub: 'times, by requests that should fail', bad: R.harms > 0, good: !R.harms }) },
      { label: 'Refused', get: () => ({ v: `${R.out.filter(o => o.s >= 400 || o.s === '—').length}`, sub: 'requests turned away' }) },
      { label: 'Endpoint', get: () => ({ v: 'POST /mcp', sub: 'nothing else' }) },
    ];
    const labels = [
      { name: 'src', t: 'Who is calling', d: 'Desktop app, portal, a coupon tab, a gateway, a laptop on the wifi; the wall checks origin and headers, the fence keeps the wifi out', icon: 'eye', atV: V(-2.7, 0.15, -0.47) },
      { name: 'out', t: 'Twelve replies', d: 'Green answered, gold refused with a code, grey unreachable, red stock deleted', icon: 'code', atV: V(2.2, 0.35, -0.35) },
      { name: 'harm', t: 'Stock deleted', d: 'By requests that should have failed; the boxes on the laptop go too', icon: 'stop', atV: V(2.1, 0.15, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Origin checked by prefix', hint: 'startswith the portal\'s address', on: () => set({ ...D0, origin: 1 }), off: reset },
      { label: 'Trust the headers', hint: 'don\'t compare them with the body', on: () => set({ ...D0, headers: false }), off: reset },
      { label: 'Listen on every interface', hint: '0.0.0.0 on the shop\'s wifi', on: () => set({ ...D0, bind: false }), off: reset },
    ];
    function status() {
      if (st.origin === 2) return { ok: false, msg: `<b>No origin check: a coupon site open in a browser tab deleted the stock list.</b> Through DNS rebinding, a web page can make the browser send requests to a server on localhost. Browsers say where a request comes from in the Origin header; reject any origin not on the allowed list.` };
      if (st.origin === 1) return { ok: false, msg: '<b>Prefix check: "https://pharmacy-portal.example.evil.example" starts with the allowed address, so it passed, and the stock list was deleted.</b> Anyone can register a name that begins with yours. Compare the whole origin exactly against the allowed list.' };
      if (!st.headers) return { ok: false, msg: '<b>Headers trusted: the gateway allowed a request labelled stock_search, and the server ran stock_delete from the body.</b> Headers mirror the body so gateways can route and apply policy without parsing JSON. The server must check that they match exactly, and refuse with −32020 when they don\'t.' };
      if (!st.bind) return { ok: false, msg: '<b>Listening on every interface: another laptop on the shop\'s wifi reached the server and deleted the stock list.</b> A local server should listen on 127.0.0.1 only. A server meant for the network needs authentication on every request; an origin check is not authentication.' };
      return { ok: true, msg: '<b>Twelve requests, no damage.</b> Good POSTs get JSON or a short event stream; GET and DELETE get 405; the notification gets 202; the unknown version and method get −32022 and −32601. Both pages trying to delete stock are refused by an exact origin check, the mismatched headers get −32020, and the other laptop can\'t reach a server on 127.0.0.1.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One endpoint, POST only', home: true, say: 'A pharmacy in Nairobi runs a local MCP server on its counter laptop. Every message is a POST to one endpoint. GET and DELETE have nothing to do, so they get "not allowed".', act: m => m.set({ origin: 0, headers: true, bind: true }) },
    { t: 'Replies and streams', home: true, say: 'A request gets one JSON reply, or a short stream of progress for that request ending in the reply. A notification gets "accepted" and nothing else.', act: m => m.set({ origin: 0 }) },
    { t: 'A web page knocks', home: true, say: 'A coupon site open in a browser tab tries to reach the server on localhost. The browser marks where it comes from, and the server turns away any origin not on its list.', act: m => m.set({ origin: 0 }) },
    { t: 'Prefix is not a match', home: true, say: 'Check the origin by its start, and an attacker\'s address that begins with the portal\'s name gets through. Compare it exactly.', act: m => m.set({ origin: 1 }) },
    { t: 'Headers must match the body', home: true, say: 'A gateway lets through only read-only tools, judging by the headers. If the server doesn\'t compare headers with the body, a request labelled search can carry a delete.', act: m => m.set({ origin: 0, headers: false }) },
    { t: 'Local means local', home: true, say: 'Listen on every interface, and any laptop on the shop\'s wifi can reach the server. A local server listens on 127.0.0.1 only.', act: m => m.set({ headers: true, bind: false }) },
  ],
  check: [
    { q: 'Why must a local MCP server check the Origin header?', options: ['So a web page in the browser can\'t reach it through DNS rebinding', 'To make it faster', 'To log visitors'], answer: 0, why: 'Reject any origin not on the allowed list.', hint: 'Try Origin check: None.' },
    { q: 'Why is a prefix check on the origin unsafe?', options: ['An attacker can use an address that begins with yours', 'Prefixes are slow', 'Origins have no prefix'], answer: 0, why: 'Compare the whole origin exactly.', hint: 'Try Origin checked by prefix.' },
    { q: 'Why must the Mcp-Name header match the body?', options: ['Gateways decide by the header; a mismatch could smuggle a different tool past them', 'Headers are required by browsers', 'For logging'], answer: 0, why: 'Refuse a mismatch with −32020.', hint: 'Try Trust the headers.' },
  ],
  terms: [
    ['stdio', 'The client runs the server as a child process; one JSON message per line.'],
    ['Streamable HTTP', 'MCP over HTTP: every message a POST to one endpoint.'],
    ['Server-sent events', 'A response that streams several messages for one request.'],
    ['Origin header', 'Where a browser request comes from, set by the browser.'],
    ['DNS rebinding', 'Tricking a browser into sending a web page\'s requests to a server on your own machine.'],
    ['Mirrored headers', 'MCP-Protocol-Version, Mcp-Method and Mcp-Name, copied from the body for gateways.'],
  ],
  deeper: '<p><b>No resumption.</b> If a request\'s stream breaks before its reply, that request is lost. Send it again with a new ID if it is safe to repeat; modern streams don\'t resume.</p><p><b>Change notices.</b> Long-lived notifications come on a POST the client opens with subscriptions/listen; its first message acknowledges the subscription.</p><p><b>State without sessions.</b> If a workflow needs state, return an unguessable handle tied to the user, with an expiry, and check it on every use. Hidden state on one replica breaks the moment a request lands on another.</p><p><b>Names that aren\'t plain ASCII.</b> Mcp-Name values with unsafe characters are sent as =?base64?…?= and decoded before comparing with the body.</p><p><b>About this machine.</b> The twelve requests and replies follow the 2026-07-28 HTTP rules in the file header; the replies are shortened.</p>',
  code: {
    title: 'Check the origin and the headers',
    note: 'Adapted from the course\'s MCP transports lesson.',
    text: `
ALLOWED_ORIGINS = {"https://pharmacy-portal.example"}       # exact strings, no prefixes

def check(request, body):
    if request.method != "POST":
        return 405, None
    origin = request.headers.get("Origin")
    if origin is not None and origin not in ALLOWED_ORIGINS:
        return 403, None
    if request.headers.get("Mcp-Method") != body["method"]:
        return 400, error(-32020, "Mcp-Method doesn't match the body")
    if body["method"] in ("tools/call", "prompts/get") and \\
       decode(request.headers.get("Mcp-Name")) != body["params"]["name"]:
        return 400, error(-32020, "Mcp-Name doesn't match the body")
    return None                                            # go on to dispatch

# a local server listens on 127.0.0.1 only
serve(host="127.0.0.1", port=8411)
`,
  },
};
