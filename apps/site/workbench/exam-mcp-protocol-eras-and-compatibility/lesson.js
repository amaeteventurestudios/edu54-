// Exam prep, MCP protocol eras: an invented field-survey app in Ouagadougou ships a dual-era client that must talk to three servers: a modern
// 2026-07-28 server, a modern server that supports a different version, and a legacy server from 2025-11-25. On stdio it probes with
// server/discover: a DiscoverResult means modern; a recognised modern error such as -32022 still means modern (retry with a listed version and a
// new id); any other error or a timeout means legacy (fall back to initialize). The decision is cached per process or origin. Illustrative.
const SERVERS = [
  { n: 'modern, 2026-07-28', reply: 'DiscoverResult', era: 'modern' },
  { n: 'modern, other version', reply: 'error -32022, data.supported', era: 'modern' },
  { n: 'legacy, 2025-11-25', reply: 'error -32601 (unknown method)', era: 'legacy' },
  { n: 'legacy, odd error', reply: 'error -32600', era: 'legacy' },
];

function decide(o) {
  const s = SERVERS[o.srv];
  let era, next;
  if (s.reply === 'DiscoverResult') { era = 'modern'; next = 'use a version from supportedVersions'; }
  else if (s.reply.startsWith('error -32022')) {
    if (o.modernErr) { era = 'modern'; next = 'retry with a listed version, new id'; }
    else { era = 'legacy'; next = 'fell back to initialize'; }
  } else {
    if (o.anyErr || s.reply.includes('-32601')) { era = 'legacy'; next = 'fall back to initialize'; }
    else { era = 'stuck'; next = 'waited for -32601 only; no fallback'; }
  }
  return { s, era, next, right: era === s.era };
}

function run(o) {
  const cur = decide(o);
  const all = SERVERS.map((s, i) => decide({ ...o, srv: i }));
  const wrong = all.filter(d => !d.right).length;
  const probes = o.cache ? 1 : 12;
  return { cur, all, wrong, probes, ok: wrong === 0 && o.cache && o.names };
}

export default {
  slug: 'exam-mcp-protocol-eras-and-compatibility',
  title: 'Exam prep, MCP: modern and legacy servers',
  description: 'A dual-era client meets four servers: modern, modern at another version, legacy and odd. One probe decides the era; read each reply into the right bin.',
  overview: 'MCP revisions are dated. 2024-11-05 was the first public revision, with stdio, HTTP+SSE and an opening handshake; 2025-03-26 brought Streamable HTTP, OAuth 2.1 and tool annotations; 2025-06-18 added structured tool output, elicitation, the MCP-Protocol-Version header and removed JSON-RPC batching; 2025-11-25 added icons, incremental scope consent, URL-mode elicitation, experimental tasks and turned validation errors into tool execution errors. 2026-07-28 is the modern revision: a stateless core with no handshake or sessions, server/discover, multi round-trip requests, resultType and subscriptions/listen, with tasks moved to an extension and roots, sampling, logging and Dynamic Client Registration deprecated. Modern means version, identity and capabilities travel per request; legacy means a connection opens with initialize and keeps a session; a dual-era implementation supports both and decides the era explicitly before parsing. On stdio, a dual-era client probes with server/discover carrying its preferred version. A DiscoverResult means modern. A recognised modern error such as -32022 (unsupported protocol version) still means modern: retry with a version from data.supported and a new request id, and do not fall back. Any other error, or a timeout, means legacy: fall back to initialize, and the fallback must not key on one specific error code. On HTTP the client attempts a modern request and reads a 400 body: a recognised modern JSON-RPC error means modern, anything else legacy. Era belongs to the server, so cache the decision per process on stdio or per origin on HTTP, and re-probe if it later proves wrong. A modern-only server should name its supported versions in any error it returns to initialize, because that legacy client has no other diagnostic. The app is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'protocol versions', 'dual-era', 'server/discover', 'compatibility', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { srv: 1, modernErr: true, anyErr: true, cache: true, names: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#3D6BD6';
    /* the five revisions as steps, the current one in teal */
    ['a', 'b', 'c', 'd', 'e'].forEach((r, i) => { const b = P.box(0.42, 0.08 + i * 0.07, 0.24, i === 4 ? GOOD : OFF, { r: 0.02 }); b.position.set(-1.1 + i * 0.46, 0, -0.95); S.add(b); });
    /* the client sends one probe to each server */
    const client = P.robot(BLUE, { scale: 0.62 }); client.position.set(-2.3, 0, -0.22); S.add(client);
    const rows = SERVERS.map((s, i) => {
      const z = -0.6 + i * 0.3, m = new THREE.MeshLambertMaterial({ color: OFF });
      const pad = P.box(0.4, 0.26, 0.24, '#fff', { r: 0.03, material: m }); pad.position.set(-0.75, 0, z); S.add(pad);
      const wire = P.rod(V(-2.05, 0.14, -0.22), V(-0.95, 0.14, z), 0.012, '#B9B3A6'); S.add(wire);
      return { m };
    });
    const flags = rows.map((r, i) => { const l = P.lamp(GOOD, { h: 0.1, r: 0.08 }); l.position.set(-0.3, 0, -0.6 + i * 0.3); S.add(l); return l; });
    /* two era bins; the selected server's verdict ball lands in one, or sticks on the floor */
    const modern = P.box(0.6, 0.12, 0.42, GOOD, { r: 0.03 }), legacy = P.box(0.6, 0.12, 0.42, '#8E91A3', { r: 0.03 });
    modern.position.set(0.55, 0, -0.45); legacy.position.set(0.55, 0, 0.1); S.add(modern, legacy);
    const verdictM = new THREE.MeshLambertMaterial({ color: GOOD }), verdict = P.ball(0.12, '#fff', { material: verdictM }); verdict.userData.noFit = true; S.add(verdict);
    /* probes sent: one cached, or a stack of twelve; a lamp for modern-only method names */
    const probes = P.stack(0.3, 0.3, 0.06, { max: 12, color: SAF }); probes.position.set(1.3, 0, -0.3); S.add(probes);
    const named = P.lamp(GOOD, { h: 0.18, r: 0.09 }); named.position.set(1.75, 0, -0.3); S.add(named);
    S.add(P.keep(-2.55, 2.0, 0.8, -1.1, 0.6));
    const parts = [client];

    let R = null;
    function draw() {
      R = run(st);
      R.all.forEach((d, i) => {
        rows[i].m.color.set(i === st.srv ? SAF : OFF);
        flags[i].userData.set({ color: d.right ? GOOD : BAD, on: true });
      });
      const e = R.cur.era;
      verdict.position.set(e === 'stuck' ? 0.1 : 0.55, e === 'stuck' ? 0.12 : 0.24, e === 'modern' ? -0.45 : e === 'legacy' ? 0.1 : -0.17);
      verdictM.color.set(R.cur.right ? GOOD : BAD);
      probes.userData.set({ n: R.probes, colors: Array(12).fill(R.probes > 1 ? BAD : SAF) });
      named.userData.set({ color: st.names ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Recognised modern error still means modern', short: 'Modern errors', get: () => st.modernErr, set: v => set({ modernErr: !!v }) },
      { type: 'toggle', label: 'Fall back on any other error or timeout', short: 'Any-error fallback', get: () => st.anyErr, set: v => set({ anyErr: !!v }) },
      { type: 'toggle', label: 'Cache the era per process or origin', short: 'Cache era', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'toggle', label: 'Modern-only server names its versions', short: 'Name versions', get: () => st.names, set: v => set({ names: !!v }) },
      { type: 'buttons', label: 'Server', options: ['modern', 'other version', 'legacy', 'odd error'], get: () => st.srv, act: i => set({ srv: i }) },
    ];
    const readouts = [
      { label: 'Era decided', get: () => ({ v: R.cur.era, sub: R.cur.s.n, good: R.cur.right, bad: !R.cur.right }) },
      { label: 'Servers misread', get: () => ({ v: `${R.wrong} of 4`, sub: 'with these rules', good: R.wrong === 0, bad: R.wrong > 0 }) },
    ];
    const labels = [
      { name: 'p', t: 'Four servers', d: 'One probe decides the era', icon: 'target', atV: V(-0.96, 0.15, -0.3) },
      { name: 't', t: 'Era bins', d: 'Red ball: read into the wrong one', icon: 'check', atV: V(0.86, 0.1, -0.45) },
    ];
    const reset = () => set({ ...D0, srv: st.srv });
    const breaks = [
      { label: 'Fall back on -32022', hint: 'it is a modern error', on: () => set({ ...D0, modernErr: false, srv: 1 }), off: reset },
      { label: 'Key the fallback on -32601 only', hint: 'legacy servers vary', on: () => set({ ...D0, anyErr: false, srv: 3 }), off: reset },
      { label: 'Re-probe before every request', hint: 'era belongs to the server', on: () => set({ ...D0, cache: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>The ${R.cur.s.n} server replies ${R.cur.s.reply}, so the era is ${R.cur.era}: ${R.cur.next}.</b> All four servers are read correctly, the decision is cached, and a modern-only server names its versions to legacy clients.` };
      const f = [];
      R.all.forEach(d => { if (!d.right) f.push(d.s.reply.startsWith('error -32022') ? 'treating -32022 as legacy dropped a modern server back to initialize, instead of retrying with a listed version' : `the ${d.s.n} server replied ${d.s.reply}, and a fallback keyed on -32601 alone never fell back`); });
      if (!st.cache) f.push('probing before every request wastes a round trip each time; cache the era per process or origin');
      if (!st.names) f.push('a modern-only server answered initialize without naming its versions, so the legacy client cannot tell its user what would work');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five revisions', home: true, say: 'Four legacy revisions and one modern one. Only the newest has no handshake.', act: m => m.set({ srv: 0, modernErr: true, anyErr: true, cache: true, names: true }) },
    { t: 'A modern reply', home: true, say: 'A discover result means modern. Pick a supported version and carry on.', act: m => m.set({ srv: 0, modernErr: true, anyErr: true, cache: true, names: true }) },
    { t: 'Still modern', home: true, say: 'An unsupported version error is a modern error. Retry with a listed version and a new id.', act: m => m.set({ srv: 1, modernErr: true, anyErr: true, cache: true, names: true }) },
    { t: 'Legacy', home: true, say: 'Any other error or a timeout means legacy, and the client falls back to the handshake.', act: m => m.set({ srv: 2, modernErr: true, anyErr: true, cache: true, names: true }) },
    { t: 'Any error', home: true, say: 'Legacy servers answer in different ways. Never key the fallback on one code.', act: m => m.set({ srv: 3, modernErr: true, anyErr: true, cache: true, names: true }) },
    { t: 'Cache it', home: true, say: 'Era belongs to the server, so the client decides once per process or origin.', act: m => m.set({ srv: 0, modernErr: true, anyErr: true, cache: true, names: true }) },
  ],
  check: [
    { q: 'A server answers server/discover with -32022. What is it?', options: ['Modern, at another version', 'Legacy', 'Broken'], answer: 0, why: 'Retry with a version from data.supported.', hint: 'Try Fall back on -32022.' },
    { q: 'What should trigger a fallback to initialize?', options: ['Any error that is not a recognised modern one, or a timeout', 'Only -32601', 'Never'], answer: 0, why: 'The fallback must not key on one code.', hint: 'Try Key the fallback on -32601 only.' },
    { q: 'How often should a client decide a server\'s era?', options: ['Once per process or origin, cached', 'Before every request', 'Every hour'], answer: 0, why: 'Era is a property of the server.', hint: 'Try Re-probe before every request.' },
  ],
  practice: [
    { q: 'Which revision removed initialize and sessions?', options: ['2026-07-28', '2025-11-25', '2025-06-18', '2024-11-05'], answer: 0, why: 'The stateless core.' },
    { q: 'Which revision removed JSON-RPC batching?', options: ['2025-06-18', '2026-07-28', '2025-03-26', 'None'], answer: 0, why: 'Added in 2025-03-26, removed one release later.' },
    { q: 'On HTTP, a modern request gets a 400. What does a dual-era client do?', options: ['Read the body: a recognised modern error means modern', 'Assume legacy at once', 'Retry forever', 'Give up'], answer: 0, why: 'Modern servers also answer 400 for ordinary reasons.' },
    { q: 'When retrying after -32022, which request id is used?', options: ['A new one', 'The same one', 'null', 'The server\'s id'], answer: 0, why: 'Ids must not repeat while awaiting a reply.' },
    { q: 'Why should a modern-only server name its versions when it rejects initialize?', options: ['The legacy client has no other way to learn what works', 'It is required for caching', 'To open a session', 'It is not needed'], answer: 0, why: 'It is that client\'s only diagnostic.' },
    { q: 'A cached era turns out wrong after a server upgrade. What should the client do?', options: ['Re-probe', 'Keep the stale answer forever', 'Crash', 'Switch transports'], answer: 0, why: 'Caches can be refreshed.' },
  ],
  terms: [
    ['Modern', '2026-07-28 and later: per-request version and capabilities.'],
    ['Legacy', '2025-11-25 and earlier: initialize handshake and sessions.'],
    ['Dual-era', 'Supports both, with an explicit era decision.'],
    ['Probe', 'A server/discover request used to decide the era.'],
    ['-32022', 'UnsupportedProtocolVersion, with data.supported and data.requested.'],
    ['Era cache', 'The decision kept per process (stdio) or origin (HTTP).'],
  ],
  deeper: '<p><b>Removed in 2026-07-28.</b> initialize and notifications/initialized, sessions and Mcp-Session-Id, the GET stream and session DELETE, resources/subscribe, ping, logging/setLevel and stream resumability.</p><p><b>About this machine.</b> The app and servers are invented.</p>',
  code: {
    title: 'A dual-era probe on stdio',
    note: 'Written for this lesson.',
    text: `
MODERN_ERRORS = {-32020, -32021, -32022}

def decide_era(server):
    try:
        reply = server.request("server/discover", meta(version="2026-07-28"), timeout=5)
    except TimeoutError:
        return "legacy"                                   # timeout: fall back
    if "result" in reply:
        return "modern"
    if reply["error"]["code"] in MODERN_ERRORS:           # still modern, other version
        return "modern"                                   # retry with data.supported, new id
    return "legacy"                                       # any other error, not one code

ERA = {}                                                  # cached per process or origin
def era(server):
    return ERA.setdefault(server.key, decide_era(server))
`,
  },
};
