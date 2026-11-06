// Exam prep, MCP discovery and capability negotiation: an invented deployment service in Kigali exposes list_incidents (needs nothing extra)
// and notify_oncall (needs the client's elicitation capability to ask who to page). server/discover reports what the server can do, once and
// cacheably; what the client can accept is declared fresh in _meta on every request. A missing capability returns -32021 with
// data.requiredCapabilities; an unsupported version returns -32022 with data.supported, and the client retries with a new id. Illustrative.
const CALLS = [
  { n: 'server/discover', needs: null },
  { n: 'tools/call list_incidents', needs: null },
  { n: 'tools/call notify_oncall', needs: 'elicitation' },
];

function run(o) {
  const c = CALLS[o.call];
  const declared = o.declare ? ['elicitation'] : [];
  let reply, ok = true, note = '';
  if (o.version !== '2026-07-28') { reply = `error -32022\ndata.supported: ["2026-07-28"]\ndata.requested: "${o.version}"`; note = 'retry with a listed version and a new id'; ok = o.retryVersion; }
  else if (c.n === 'server/discover') reply = 'DiscoverResult\nsupportedVersions, capabilities\ninstructions, ttlMs, cacheScope';
  else if (c.needs && !declared.includes(c.needs)) { reply = 'error -32021\ndata.requiredCapabilities:\n{ elicitation: {} }'; note = 'declare it on this request and retry'; ok = false; }
  else reply = c.needs ? 'input_required → ask who to page\n(elicitation)' : 'complete: 2 open incidents';
  const issues = [];
  if (!o.fresh) issues.push('the server assumed elicitation because an earlier request declared it; capabilities are per request');
  return { c, reply, note, ok: ok && o.fresh, issues, needsMissing: c.needs && !declared.includes(c.needs) && o.version === '2026-07-28' };
}

export default {
  slug: 'exam-mcp-discovery-and-capability-negotiation',
  title: 'Exam prep, MCP: discovery and capability negotiation',
  description: 'A deployment server has a plain tool and one that needs elicitation. The server reports once, the client declares on every call, and two gates check.',
  overview: 'Negotiation in MCP 2026-07-28 has two halves that are easy to mix up. server/discover is something a server MUST implement and a client MAY call. Its request carries only the standard _meta; its result is cacheable (ttlMs and cacheScope) and holds supportedVersions, capabilities and an optional instructions string of natural-language guidance for the model, with the server\'s identity in result._meta. Server capabilities are flags: tools {listChanged}, resources {listChanged, subscribe}, prompts {listChanged}, completions {}, logging {} (deprecated) and extensions {}, where an empty object means supported with no settings. That is what the server can do, reported once and reusable until the ttlMs hint goes stale. What the client can accept is a separate, per-request fact: _meta["io.modelcontextprotocol/clientCapabilities"] on every request, with elicitation {form, url}, deprecated sampling and roots, and extensions. A server must not rely on a capability the client did not declare on that request; if it needs one, it returns -32021 (MissingRequiredClientCapability) with data.requiredCapabilities shaped like ClientCapabilities, and HTTP 400, so the client can declare it and retry rather than guess. Version selection can happen on any request: an unsupported version returns -32022 with data.supported and data.requested, and the client retries the same request with a version from the list and a new id. Asking for an older revision through the modern _meta shape is not being a legacy client; era is defined by message shape (initialize versus per-request metadata), not by the version string. The service is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'server/discover', 'capabilities', '-32021', '-32022', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { call: 2, declare: true, version: '2026-07-28', retryVersion: true, fresh: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* client at one end of a belt, server cabinet at the other, with its capabilities on a cached shelf behind */
    const client = P.robot('#3D6BD6', { scale: 0.62 }); client.position.set(-2.4, 0, 0); S.add(client);
    const line = P.belt(V(-2.1, 0, 0), V(0.7, 0, 0), { w: 0.34, speed: 0.9 }); S.add(line);
    const server = P.box(0.6, 0.5, 0.56, '#5B8DB8', { r: 0.05 }); server.position.set(1.05, 0, 0); S.add(server);
    const caps = P.shelf(4, { cell: 0.2, levels: 1, lh: 0.2, d: 0.28 }); caps.position.set(1.05, 0, -0.6); S.add(caps); caps.userData.set({ fill: Array(4).fill(GOOD) });
    /* two gates: the protocol version, then the capability the call needs */
    const verBar = P.gate(0.5, GOOD, { h: 0.42 }); verBar.rotation.y = Math.PI / 2; verBar.position.set(-0.7, 0, 0); S.add(verBar);
    const capBar = P.gate(0.5, GOOD, { h: 0.42 }); capBar.rotation.y = Math.PI / 2; capBar.position.set(0.1, 0, 0); S.add(capBar);
    /* the client's declaration: a gold card it holds out on this request, fresh each time */
    const card = P.box(0.26, 0.05, 0.2, SAF, { r: 0.02 }); card.position.set(-2.4, 0, 0.42); S.add(card);
    const fresh = P.lamp(GOOD, { h: 0.14, r: 0.08 }); fresh.position.set(-1.9, 0, 0.42); S.add(fresh);
    /* the reply: which of the three calls, and how it went */
    const pads = CALLS.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-0.7 + i * 0.46, 0, 0.5); S.add(b); return m; });
    const reply = P.lamp(GOOD, { h: 0.2, r: 0.11 }); reply.position.set(1.05, 0, 0.5); S.add(reply);
    S.add(P.keep(-2.6, 1.5, 0.8, -0.85, 0.75));
    let clock = 0, stopAt = 1, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      const vBad = st.version !== '2026-07-28';
      verBar.userData.set({ color: vBad ? BAD : GOOD }); capBar.userData.set({ color: R.needsMissing ? BAD : GOOD });
      stopAt = vBad ? (-0.84 + 2.1) / 2.8 : R.needsMissing ? (-0.04 + 2.1) / 2.8 : 1;
      parcel = vBad || R.needsMissing ? BAD : GOOD;
      card.visible = !!st.declare;
      fresh.userData.set({ color: st.fresh ? GOOD : BAD, on: true });
      pads.forEach((m, i) => m.color.set(i === st.call ? SAF : OFF));
      reply.userData.set({ color: R.ok ? GOOD : BAD, on: true });
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Declare elicitation on this request', short: 'Declare', get: () => st.declare, set: v => set({ declare: !!v }) },
      { type: 'toggle', label: 'Server reads capabilities per request', short: 'Per request', get: () => st.fresh, set: v => set({ fresh: !!v }) },
      { type: 'buttons', label: 'Request', options: ['discover', 'list incidents', 'notify on-call'], get: () => st.call, act: i => set({ call: i }) },
      { type: 'buttons', label: 'Version asked', options: ['2026-07-28', '2027-01-01'], get: () => (st.version === '2026-07-28' ? 0 : 1), act: i => set({ version: i ? '2027-01-01' : '2026-07-28' }) },
      { type: 'toggle', label: 'Retry -32022 with a listed version', short: 'Retry version', get: () => st.retryVersion, set: v => set({ retryVersion: !!v }) },
    ];
    const readouts = [
      { label: 'Reply', get: () => ({ v: R.reply.split('\n')[0], sub: R.c.n, good: R.ok, bad: !R.ok }) },
      { label: 'Client caps', get: () => ({ v: st.declare ? 'elicitation' : 'none', sub: 'declared on this request' }) },
    ];
    const labels = [
      { name: 's', t: 'Server capabilities', d: 'Once, cacheable', icon: 'box', atV: V(1.62, 0.15, -0.6) },
      { name: 't', t: 'The client', d: 'Gold card: declared on this request', icon: 'check', atV: V(-2.6, 0.25, 0) },
    ];
    const reset = () => set({ ...D0, call: st.call });
    const breaks = [
      { label: 'Forget to declare elicitation', hint: '-32021 names what is missing', on: () => set({ ...D0, call: 2, declare: false }), off: reset },
      { label: 'Ask for a version the server lacks', hint: '-32022 lists what works', on: () => set({ ...D0, version: '2027-01-01', retryVersion: false }), off: reset },
      { label: 'Remember capabilities from earlier', hint: 'every request stands alone', on: () => set({ ...D0, fresh: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n} at 2026-07-28 ${R.c.needs ? 'declares elicitation in this request\'s _meta, so the server can ask who to page' : 'needs nothing extra'}.</b> Server capabilities came from one cacheable discover result; client capabilities are read fresh on each request.` };
      if (st.version !== '2026-07-28') return { ok: false, msg: `<b>The server does not implement ${st.version}, so it returns -32022 with data.supported ["2026-07-28"].</b> ${st.retryVersion ? 'The client retries the same request with 2026-07-28 and a new id.' : 'The client gave up instead of retrying with a listed version and a new id.'}` };
      if (!st.fresh) return { ok: false, msg: '<b>The server assumed elicitation because an earlier request declared it.</b> A server must not rely on a capability the client did not declare on this request.' };
      return { ok: false, msg: '<b>notify_oncall needs elicitation, and this request declared none, so the server returns -32021 with data.requiredCapabilities { elicitation: {} } (HTTP 400).</b> Declare it on this request and retry.' };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; line.userData.send(parcel, { size: 0.18, stop: stopAt }); }
      line.userData.tick(dt); client.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Discover once', home: true, say: 'The client may call discover once to learn versions, capabilities and instructions.', act: m => m.set({ call: 0, declare: true, version: '2026-07-28', retryVersion: true, fresh: true }) },
    { t: 'A plain tool', home: true, say: 'Listing incidents needs nothing extra from the client.', act: m => m.set({ call: 1, declare: false, version: '2026-07-28', retryVersion: true, fresh: true }) },
    { t: 'A missing capability', home: true, say: 'Paging on-call needs elicitation. Without it, the server names exactly what is missing.', act: m => m.set({ call: 2, declare: false, version: '2026-07-28', retryVersion: true, fresh: true }) },
    { t: 'Declare and retry', home: true, say: 'The client declares elicitation on this request, and the call goes through.', act: m => m.set({ call: 2, declare: true, version: '2026-07-28', retryVersion: true, fresh: true }) },
    { t: 'An unknown version', home: true, say: 'Ask for a version the server lacks, and it lists the versions it supports.', act: m => m.set({ call: 1, declare: true, version: '2027-01-01', retryVersion: true, fresh: true }) },
    { t: 'Every request alone', home: true, say: 'The server never carries capabilities over from an earlier request.', act: m => m.set({ call: 2, declare: true, version: '2026-07-28', retryVersion: true, fresh: true }) },
  ],
  check: [
    { q: 'A tool needs elicitation and the request declared none. What comes back?', options: ['-32021 with data.requiredCapabilities', '-32601', 'A silent failure'], answer: 0, why: 'HTTP 400 on Streamable HTTP.', hint: 'Try Forget to declare elicitation.' },
    { q: 'A request names a version the server does not implement. What should the client do with -32022?', options: ['Retry with a version from data.supported and a new id', 'Fall back to initialize', 'Give up'], answer: 0, why: 'It is still a modern server.', hint: 'Try Ask for a version the server lacks.' },
    { q: 'An earlier request declared elicitation. Can the server rely on it now?', options: ['No: capabilities are per request', 'Yes, on the same connection', 'Yes, for an hour'], answer: 0, why: 'Every request stands alone.', hint: 'Try Remember capabilities from earlier.' },
  ],
  practice: [
    { q: 'Must a client call server/discover before other requests?', options: ['No: it is optional for clients, mandatory for servers', 'Yes, always', 'Only on HTTP', 'Only once a day'], answer: 0, why: 'A client may go straight to its request.' },
    { q: 'What is server/discover\'s instructions field for?', options: ['Natural-language guidance for the model about using the server', 'A copy of every tool description', 'Authorization rules', 'The session id'], answer: 0, why: 'Optional guidance, self-reported.' },
    { q: 'What does an empty object mean for the completions capability?', options: ['Supported, with no settings', 'Not supported', 'Deprecated', 'Unknown'], answer: 0, why: 'Presence means support.' },
    { q: 'Which capability is deprecated but still present on servers?', options: ['logging', 'tools', 'resources', 'prompts'], answer: 0, why: 'Roots, sampling and logging are deprecated.' },
    { q: 'A modern client asks for an older real revision through _meta. Is it a legacy client?', options: ['No: era is the message shape, not the version string', 'Yes', 'Only on stdio', 'Only if it sends clientInfo'], answer: 0, why: 'Legacy clients send initialize.' },
    { q: 'Where does a server\'s identity travel in a DiscoverResult?', options: ['result._meta serverInfo', 'A session header', 'clientCapabilities', 'The id field'], answer: 0, why: 'Self-reported, for display and logging.' },
  ],
  terms: [
    ['server/discover', 'Mandatory for servers, optional for clients; cacheable.'],
    ['ServerCapabilities', 'What the server offers: tools, resources, prompts, completions…'],
    ['ClientCapabilities', 'What the client accepts, declared on every request.'],
    ['-32021', 'MissingRequiredClientCapability, with data.requiredCapabilities.'],
    ['-32022', 'UnsupportedProtocolVersion, with data.supported.'],
    ['instructions', 'Optional model guidance in the discover result.'],
  ],
  deeper: '<p><b>Cache hints.</b> A DiscoverResult carries ttlMs and cacheScope; a list-changed notification invalidates a cached list at once.</p><p><b>About this machine.</b> The service and tools are invented.</p>',
  code: {
    title: 'Check the capability on this request',
    note: 'Written for this lesson.',
    text: `
def call_tool(req):
    meta = req["params"]["_meta"]
    version = meta.get("io.modelcontextprotocol/protocolVersion")
    if version not in SUPPORTED:
        return error(req, -32022, "Unsupported protocol version",
                     data={"supported": SUPPORTED, "requested": version})
    caps = meta.get("io.modelcontextprotocol/clientCapabilities", {})
    tool = TOOLS[req["params"]["name"]]
    if tool.needs and tool.needs not in caps:              # this request, not an earlier one
        return error(req, -32021, "Missing required client capability",
                     data={"requiredCapabilities": {tool.needs: {}}})
    return tool.run(req)
`,
  },
};
