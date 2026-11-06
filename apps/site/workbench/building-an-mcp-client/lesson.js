// Building an MCP client: a district health office's assistant in Mangochi connects to four servers.
// records (modern): search, get_patient · stock (modern): get_item, reorder · reports (old, 2025-11-25; allowed to use the old handshake by configuration): search, monthly_summary
// · stats (modern, but overloaded at start-up: server/discover times out).
// Start-up: discover each server; an unrecognised error or timeout is ambiguous. Only a server configured with allow_legacy is probed with initialize, and only a valid,
// positive initialize result selects the old era; anything else fails closed (the server is left out and retried later).
// Merge: both records and reports export "search". Policies: prefix the later one (reports/search), reject it, or silently overwrite (the later server wins the name).
// The model makes eight calls by canonical name. Before call 7, the stock server restarts: the client must reconnect and discover again, or the call goes to a dead transport.
const SERVERS = [
  { id: 'records', era: 'modern', tools: ['search', 'get_patient'] },
  { id: 'stock', era: 'modern', tools: ['get_item', 'reorder'] },
  { id: 'reports', era: 'old', tools: ['search', 'monthly_summary'], allow: true },
  { id: 'stats', era: 'modern', tools: ['weekly_cases'], slow: true },
];
const CALLS = [
  { want: 'records', tool: 'search', q: 'search("Grace Banda")', ok: 'Grace Banda, P-118, Mangochi Boma' },
  { want: 'records', tool: 'get_patient', q: 'get_patient("P-118")', ok: 'last visit 2 March, malaria test negative' },
  { want: 'stock', tool: 'get_item', q: 'get_item("ACT tablets")', ok: '1,240 doses at the district store' },
  { want: 'reports', tool: 'search', q: 'search reports("measles 2025")', ok: '3 reports: Feb, May, Sep 2025' },
  { want: 'reports', tool: 'monthly_summary', q: 'monthly_summary("March")', ok: 'March: 412 visits, 37 referrals' },
  { want: 'stats', tool: 'weekly_cases', q: 'weekly_cases("malaria")', ok: 'malaria cases by week, last 8 weeks' },
  { want: 'stock', tool: 'reorder', q: 'reorder("ACT tablets", 2000)', ok: 'order SO-5521 placed', restart: true },
  { want: 'records', tool: 'search', q: 'search("Mwale")', ok: '2 patients named Mwale' },
];
function run(st) {
  /* start-up */
  const peers = SERVERS.map(s => {
    if (s.slow && !st.failOpen) return { ...s, loaded: false, note: 'discover timed out: left out, retried later' };
    if (s.slow && st.failOpen) return { ...s, loaded: true, eraUsed: 'old', note: 'timed out, so treated as old: initialize sent to a modern server' };
    if (s.era === 'old') return { ...s, loaded: !!s.allow || st.failOpen, eraUsed: 'old', note: s.allow ? 'allow_legacy: initialize probe answered, old era selected' : 'not allowed: left out' };
    return { ...s, loaded: true, eraUsed: 'modern', note: 'server/discover: 2026-07-28' };
  });
  /* merge */
  const cat = new Map(), rejected = [];
  peers.filter(p => p.loaded).forEach(p => p.tools.forEach(t => {
    if (!cat.has(t)) { cat.set(t, { peer: p.id, local: t }); return; }
    if (st.merge === 0) cat.set(`${p.id}/${t}`, { peer: p.id, local: t });
    else if (st.merge === 1) rejected.push(`${p.id}/${t}`);
    else cat.set(t, { peer: p.id, local: t });
  }));
  /* calls */
  let restarted = false;
  const res = CALLS.map(c => {
    if (c.restart) restarted = true;
    const name = c.want === 'reports' && c.tool === 'search' && st.merge !== 2 ? 'reports/search' : c.tool;
    const e = cat.get(name);
    if (!e) return { c, name, out: c.want === 'stats' ? 'stats is not connected: try again shortly' : `no tool "${name}": rejected as a duplicate at start-up`, ok: false, soft: c.want === 'stats' };
    const p = peers.find(x => x.id === e.peer);
    if (p.id === 'stats' && p.eraUsed === 'old') return { c, name, out: '−32602 from stats: old-style request without _meta', ok: false };
    if (p.id === 'stock' && restarted && !st.reconnect) return { c, name, out: 'transport closed: the stock server restarted', ok: false };
    if (p.id !== c.want) return { c, name, out: `sent to ${p.id}: ${p.id === 'reports' ? 'no reports match "Mwale"' : 'wrong server'} (wanted ${c.want})`, ok: false, wrong: true };
    return { c, name, out: `${p.id} · ${c.ok}${p.id === 'stock' && restarted ? ' (after reconnecting)' : ''}`, ok: true };
  });
  return { peers, cat, rejected, res, ok: res.filter(r => r.ok).length, wrong: res.filter(r => r.wrong).length };
}

export default {
  slug: 'building-an-mcp-client',
  title: 'An MCP client: many servers, one tool list',
  description: 'A health office assistant in Mangochi connects to four MCP servers. Two share a tool name, one is old, one is slow, one restarts.',
  overview: 'A host usually talks to several MCP servers at once, and its client has three jobs. First, find out what each server speaks. A modern server answers server/discover. Errors and timeouts are ambiguous: an old server, an overloaded one and a dead one can look the same. So the client falls back to the old initialize handshake only for servers an operator has explicitly allowed, and only when that handshake returns a valid, positive answer; anything else fails closed and is retried later, rather than quietly downgrading a server to weaker rules. Second, merge every server\'s tools into one list for the model. Names collide: two servers may both export search. A declared policy handles it: prefix the later one with its server name, or reject it with a clear configuration error. Silently letting one overwrite the other means the model\'s call goes to a server it never meant. Third, route each call by name to its server and its local tool name, with a fresh request ID, and keep a record per server of its era, capabilities and tool list. When a server restarts, reconnect and discover again before sending more calls.',
  keywords: ['MCP client', 'Model Context Protocol', 'tool namespace', 'name collision', 'protocol negotiation', 'fail closed', 'MCP host'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { merge: 0, failOpen: false, reconnect: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const SC = { records: '#5B8DB8', stock: '#1F9E89', reports: '#C9A227', stats: '#7B6FA8' };
    /* four servers, each a block with its tools as cubes on top; grey when left out */
    const SX = -2.2, sv = SERVERS.map((s, i) => {
      const z = -0.9 + i * 0.6, mm = new THREE.MeshLambertMaterial({ color: SC[s.id] }), b = P.box(0.9, 0.3, 0.4, '#fff', { r: 0.05, material: mm }); b.position.set(SX, 0, z); S.add(b);
      s.tools.forEach((_, j) => { const c = P.box(0.18, 0.14, 0.18, '#FFFFFF', { r: 0.03 }); c.position.set(SX - 0.2 + j * 0.3, 0.3, z); S.add(c); });
      const lamp = P.lamp(GOOD, { h: 0.3, r: 0.07 }); lamp.position.set(SX + 0.55, 0, z); S.add(lamp);
      return { mm, b, z, lamp };
    });
    /* the merged tool list: a shelf whose slots take the colour of the server that owns each name; red slots were rejected */
    const CX = -0.55, shelf = P.shelf(3, { levels: 3, cell: 0.32, lh: 0.3, d: 0.32 }); shelf.position.set(CX - 0.1, 0, -0.2); S.add(shelf);
    /* the host robot makes eight calls; a lamp per call shows how it went */
    const host = P.robot(CHAR, { scale: 1.0 }); host.position.set(0.75, 0, 0); S.add(host);
    const lamps = CALLS.map((_, i) => { const l = P.lamp('#C9C4B6', { h: 0.2, r: 0.07 }); l.position.set(1.55, 0, -0.85 + i * 0.24); S.add(l); return l; });
    const okTw = P.tower(0.5, 0.5, GOOD, { size: 0.28 }); okTw.position.set(2.3, 0, 0.1); S.add(okTw);
    const pkt = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); pkt.userData.noFit = true; S.add(pkt);
    S.add(P.keep(-2.75, 2.6, 1.25, -1.2, 1.05));

    let R = null, k = 0, clock = 0;
    function show() {
      R.res.forEach((r, i) => lamps[i].userData.set({ color: i > k ? '#C9C4B6' : r.ok ? GOOD : r.soft ? SAF : RED, on: i <= k }));
      const r = R.res[k], e = R.cat.get(r.name), target = e ? sv[SERVERS.findIndex(s => s.id === e.peer)] : null, u = Math.min(1, (clock % 1.2) / 0.8);
      pkt.visible = !!target; if (target) pkt.position.set(0.55 + (SX + 0.5 - 0.55) * u, 0.5 + Math.sin(u * Math.PI) * 0.3, 0 + target.z * u);
      pkt.material.color.set(u >= 1 ? (r.ok ? GOOD : RED) : SAF);
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      R.peers.forEach((p, i) => { sv[i].mm.color.set(p.loaded ? SC[p.id] : '#C9C6BD'); sv[i].lamp.userData.set({ color: !p.loaded ? SAF : p.slow ? RED : GOOD, on: true }); });
      const list = [...R.cat.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      shelf.userData.set({ fill: Array.from({ length: 9 }, (_, i) => list[i] ? SC[list[i][1].peer] : R.rejected[i - list.length] ? RED : null) });
      const ok = R.ok; okTw.userData.set({ h: 0.05 + ok / 8 * 1.1, cap: `${ok}/8`, color: ok >= 7 && !R.wrong ? GOOD : R.wrong || ok < 6 ? RED : SAF });
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { host.userData.tick(dt); host.userData.set({ busy: true }); okTw.userData.tick(dt); clock += dt; if (clock >= 1.2) { clock -= 1.2; if (k < CALLS.length - 1) k++; } show(); };
    const controls = [
      { type: 'buttons', label: 'When two servers share a name', options: ['Prefix the later one', 'Reject it', 'Later one overwrites'], get: () => st.merge, act: i => set({ merge: i }) },
      { type: 'toggle', label: 'Any failed probe means an old server', short: 'Fail open', get: () => st.failOpen, set: v => set({ failOpen: !!v }), quick: false },
      { type: 'toggle', label: 'Reconnect and rediscover after a restart', short: 'Reconnect', get: () => st.reconnect, set: v => set({ reconnect: !!v }), quick: false },
      { type: 'button', label: 'Make the calls again', act: () => { k = 0; clock = 0; show(); } },
    ];
    const readouts = [
      { label: 'Calls answered right', get: () => ({ v: `${R.ok} of 8`, sub: R.res.some(r => r.soft) ? 'stats not ready yet' : 'by the right server', good: R.ok >= 7 && !R.wrong, bad: R.wrong > 0 || R.ok < 6 }) },
      { label: 'Sent to the wrong server', get: () => ({ v: `${R.wrong}`, sub: 'a name collision', bad: R.wrong > 0, good: !R.wrong }) },
      { label: 'Tools in the list', get: () => ({ v: `${R.cat.size}`, sub: R.rejected.length ? `${R.rejected.length} rejected` : 'merged' }) },
    ];
    const labels = [
      { name: 'srv', t: 'Four servers, one list', d: 'Records, stock, old reports, stats (grey: left out). The shelf is the merged tool list, each slot in its owner\'s colour; red was rejected', icon: 'layers', atV: V(SX - 0.5, 0.15, -0.3) },
      { name: 'calls', t: 'Eight calls', d: 'A lamp each: green right server, gold not ready, red wrong; the tower counts the right ones', icon: 'link', atV: V(2.55, 0.3, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Later name overwrites', hint: 'silent overwrite on a collision', on: () => set({ ...D0, merge: 2 }), off: reset },
      { label: 'Any failed probe means old', hint: 'fail open at start-up', on: () => set({ ...D0, failOpen: true }), off: reset },
      { label: 'No reconnect after a restart', hint: 'keep using the dead transport', on: () => set({ ...D0, reconnect: false }), off: reset },
    ];
    function status() {
      if (st.merge === 2) return { ok: false, msg: `<b>Silent overwrite: reports loaded after records, so "search" now means the reports server. ${R.wrong} patient searches went there.</b> The model asked for a patient and got report search results, with no error anywhere. Prefix the later tool (reports/search) or reject it with a clear configuration error.` };
      if (st.failOpen) return { ok: false, msg: '<b>Fail open: the stats server was only overloaded, but the client treated the timeout as an old server and sent it the old handshake. Every stats call then failed with −32602.</b> A timeout, a crash and an old server can look alike. Fall back only for servers an operator allowed, and only on a valid, positive initialize answer; otherwise leave the server out and try again later.' };
      if (!st.reconnect) return { ok: false, msg: '<b>The stock server restarted, and the reorder went to a closed transport.</b> The client\'s record of a server (its era, capabilities and tool list) belongs to one transport. After a restart, reconnect, discover again and refetch the tool list before sending more calls.' };
      return { ok: true, msg: `<b>${R.ok} of 8 calls answered by the right server${R.res.some(r => r.soft) ? '; stats is left out until it answers discovery' : ''}.</b> Records keeps "search"; reports' search is ${st.merge === 0 ? 'listed as reports/search, so the model can ask for it by name' : 'rejected at start-up with a configuration error, so report searches are unavailable until it is renamed'}. The old reports server uses the old handshake because its configuration allows it, and the stock server was rediscovered after its restart.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four servers', home: true, say: 'A district health office\'s assistant in Mangochi connects to four MCP servers: patient records, medicine stock, old monthly reports, and case statistics.', act: m => m.set({ merge: 0, failOpen: false, reconnect: true }) },
    { t: 'What each one speaks', home: true, say: 'Records and stock answer discovery. The reports server only speaks the old protocol, and its configuration allows the old handshake. Stats is overloaded and times out, so it is left out for now.', act: m => m.set({ failOpen: false }) },
    { t: 'Two tools called search', home: true, say: 'Records and reports both export search. Prefix the later one, and the model sees search for patients and reports slash search for reports.', act: m => m.set({ merge: 0 }) },
    { t: 'Silent overwrite', home: true, say: 'Let the later one overwrite the name, and patient searches quietly go to the reports server. No error, wrong answers.', act: m => m.set({ merge: 2 }) },
    { t: 'Fail closed', home: true, say: 'Treat any failed probe as an old server, and the overloaded stats server gets the old handshake. Every call to it fails. Fall back only where it is allowed and proven.', act: m => m.set({ merge: 0, failOpen: true }) },
    { t: 'A restart', home: true, say: 'Mid-session the stock server restarts. Reconnect and discover again before the next call, and the reorder goes through.', act: m => m.set({ failOpen: false, reconnect: true }) },
  ],
  check: [
    { q: 'Two servers both export "search". What is the safe policy?', options: ['Prefix the later one with its server name, or reject it with a clear error', 'Let the later one overwrite', 'Pick one at random'], answer: 0, why: 'Silent overwrite sends calls to a server the model never meant.', hint: 'Try Later name overwrites.' },
    { q: 'server/discover times out. Should the client assume an old server?', options: ['No: fall back only for allowed servers that answer the old handshake properly', 'Yes, always', 'Yes, if it is slow'], answer: 0, why: 'Timeouts are ambiguous; fail closed.', hint: 'Try Any failed probe means old.' },
    { q: 'A server restarts. What must the client do before calling it again?', options: ['Reconnect and discover again', 'Nothing', 'Reuse the old request IDs'], answer: 0, why: 'Its record of the server belonged to the old transport.', hint: 'Try No reconnect after a restart.' },
  ],
  terms: [
    ['MCP host', 'The AI app; it runs one MCP client connection per server.'],
    ['Peer record', 'The client\'s notes on one server: era, capabilities, tools, health.'],
    ['Name collision', 'Two servers exporting tools with the same name.'],
    ['Namespace prefix', 'Renaming a colliding tool as server/tool.'],
    ['Fail closed', 'When unsure, leave the server out rather than lower the rules.'],
    ['Allowlist', 'Operator configuration naming which servers may use the old handshake.'],
  ],
  deeper: '<p><b>Caching tool lists.</b> Keep each server\'s tool list for its ttlMs, within the right user\'s scope, and refetch after it expires or a list-change notice arrives. Sort before merging so the model\'s list doesn\'t depend on which server answered first.</p><p><b>Change notices.</b> Modern servers send list and resource changes only on a stream the client opens with subscriptions/listen; after a disconnect, open a new one and refetch, since streams don\'t resume.</p><p><b>Input in the middle.</b> When a server needs the user or the model, it returns input_required. Don\'t block the reader for that server while you ask; retry the original call with a new ID when the answer is ready.</p><p><b>About this machine.</b> The four servers, eight calls and outcomes follow the rules in the file header, worked out for your settings.</p>',
  code: {
    title: 'Merge without collisions, route by name',
    note: 'Adapted from the course\'s MCP client lesson.',
    text: `
def merge(peers, policy="prefix"):
    catalog = {}
    for peer in sorted(peers, key=lambda p: p.name):
        for tool in sorted(peer.tools, key=lambda t: t["name"]):
            name = tool["name"]
            if name in catalog:
                if policy == "reject":
                    raise ConfigError(f"{peer.name}/{name} collides with {catalog[name].peer}")
                name = f"{peer.name}/{name}"            # prefix the later one
            catalog[name] = Route(peer=peer.name, local=tool["name"])
    return catalog

def call(catalog, peers, name, args):
    route = catalog[name]
    peer = peers[route.peer]
    if not peer.healthy:
        peer.reconnect(); peer.discover(); peer.refresh_tools()
    return peer.request("tools/call", {"name": route.local, "arguments": args})
`,
  },
};
