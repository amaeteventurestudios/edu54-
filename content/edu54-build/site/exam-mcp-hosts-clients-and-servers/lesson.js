// Exam prep, MCP hosts, clients and servers: an invented newsroom assistant in Dakar is a host with three servers: files and notes (local,
// stdio) and metrics (remote, Streamable HTTP, resources only). Files and notes both expose "search" and both self-report serverInfo.name
// "primary". The host runs one client per server, keys its registry on host-assigned ids (not self-reported names), prefixes colliding tool
// names, lists tools only from servers that declared the tools capability, and sends each server only what its request needs. Illustrative.
const SRV = [
  { id: 'files', name: 'primary', where: 'local, stdio', tools: ['search', 'read_file'], cap: true },
  { id: 'notes', name: 'primary', where: 'local, stdio', tools: ['search', 'add_note'], cap: true },
  { id: 'metrics', name: 'metrics', where: 'remote, HTTP', tools: [], cap: false, res: true },
];

function run(o) {
  const reg = {}; const issues = [];
  SRV.forEach(s => {
    if (!s.cap && o.caps) return;
    const tools = s.cap ? s.tools : ['(guessed) query'];
    tools.forEach(t => {
      const key = o.byId ? s.id : s.name;
      let name = t;
      if (reg[name] && o.prefix) name = `${key}/${t}`;
      reg[name] = reg[name] && !o.prefix ? { ...reg[name], clash: true, to: key } : { to: key, srv: s.id };
    });
  });
  const routes = Object.entries(reg).map(([n, r]) => ({ n, ...r }));
  if (!o.byId) issues.push('the registry keyed both servers on their self-reported name "primary", so notes calls reached files');
  if (!o.prefix) issues.push('two tools named "search" collided and the second silently replaced the first');
  if (!o.caps) issues.push('the host listed a guessed tool from metrics, which declared resources but no tools capability');
  if (!o.isolate) issues.push('each request carried the whole conversation, so every server could read what the others returned');
  return { routes, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-hosts-clients-and-servers',
  title: 'Exam prep, MCP: hosts, clients and servers',
  description: 'A newsroom host connects to three servers. Two call themselves "primary" and share a tool name. Key on your own ids, and let no server see the rest.',
  overview: 'An MCP system has three participants with narrow jobs. The host is the application process the user runs, such as a chat assistant, an editor or a batch pipeline; it creates clients, decides which connections may exist, enforces consent before a tool runs and aggregates context from its servers, and it is the only party that sees the whole picture. A client is an object the host creates, scoped to exactly one server for the life of the connection; a host with three servers has three clients. A server is a separate program, local or remote. A local server is usually a subprocess reached over stdio, with all metadata in _meta; a remote server is usually a long-running service reached over Streamable HTTP, one POST per message, with the protocol version also in a required header. Servers should not be able to read the whole conversation or see into each other: each request carries only what it needs, and isolation comes from separate processes talking to separate clients. Primitives split by control: tools are model-controlled, resources application-driven and prompts user-controlled. Aggregation is where design matters. Tool names only need to be unique within one server, so two servers can both expose "search"; serverInfo.name is self-reported and need not be unique, so two servers can both say "primary". A host should key its registry on its own connection ids, prefix colliding tool names with a server identifier, list tools only from servers that declared the tools capability, and still let the receiving server enforce its own errors. The newsroom is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'host', 'client', 'server', 'aggregation', 'tool names', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { byId: true, prefix: true, caps: true, isolate: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#3D6BD6';
    /* the host: a slab with one client robot per server */
    const Z = i => -0.75 + i * 0.45;
    const host = P.box(0.8, 0.06, 1.35, '#8E91A3', { r: 0.04 }); host.position.set(-1.95, 0, Z(1)); S.add(host);
    const cl = SRV.map((s, i) => { const r = P.robot(BLUE, { scale: 0.42 }); r.position.set(-1.95, 0.06, Z(i)); S.add(r); return r; });
    /* one pipe per client to its own server; a stray pipe sends notes calls to files */
    const sv = SRV.map((s, i) => {
      const m = new THREE.MeshLambertMaterial({ color: s.cap ? '#5B8DB8' : '#7B6FA8' }), b = P.box(0.5, 0.34, 0.34, '#fff', { r: 0.04, material: m }); b.position.set(-0.1, 0, Z(i)); S.add(b);
      const p = P.pipe([V(-1.75, 0.16, Z(i)), V(-1.1, 0.16, Z(i)), V(-0.35, 0.16, Z(i))], GOOD, { r: 0.03, n: 4 }); S.add(p);
      return { m, p };
    });
    const stray = P.pipe([V(-1.75, 0.16, Z(1)), V(-1.1, 0.2, Z(0.5)), V(-0.35, 0.16, Z(0))], BAD, { r: 0.03, n: 4 }); S.add(stray);
    /* the registry shelf: one slot per routed tool */
    const reg = P.shelf(3, { cell: 0.26, levels: 2, lh: 0.22, d: 0.34 }); reg.position.set(0.95, 0, Z(1)); S.add(reg);
    S.add(P.keep(-2.4, 1.6, 0.8, -1.05, 0.5));
    const parts = [...cl, stray, ...sv.map(s => s.p)];

    let R = null;
    function draw() {
      R = run(st);
      sv[1].p.visible = !!st.byId; stray.visible = !st.byId;
      sv.forEach((s, i) => { s.m.color.set(i === 2 && !st.caps ? BAD : i === 2 ? '#7B6FA8' : '#5B8DB8'); s.p.userData.set({ color: st.isolate ? GOOD : '#E07A5F' }); });
      const cells = R.routes.map(r => r.clash || r.n.includes('guessed') ? BAD : GOOD);
      reg.userData.set({ fill: Array.from({ length: 6 }, (_, i) => cells[i] || false) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Key the registry on host-assigned ids', short: 'Host ids', get: () => st.byId, set: v => set({ byId: !!v }) },
      { type: 'toggle', label: 'Prefix colliding tool names', short: 'Prefix names', get: () => st.prefix, set: v => set({ prefix: !!v }) },
      { type: 'toggle', label: 'List tools only from declared capabilities', short: 'Respect caps', get: () => st.caps, set: v => set({ caps: !!v }) },
      { type: 'toggle', label: 'Send each server only what it needs', short: 'Isolation', get: () => st.isolate, set: v => set({ isolate: !!v }) },
    ];
    const readouts = [
      { label: 'Tools listed', get: () => ({ v: String(R.routes.length), sub: 'in the aggregated registry', good: R.ok, bad: !R.ok }) },
      { label: 'Clients', get: () => ({ v: '3', sub: 'one per server' }) },
    ];
    const labels = [
      { name: 'h', t: 'One host, three clients', d: 'Each bound to one server', icon: 'link', atV: V(-2.32, 0.18, -0.3) },
      { name: 't', t: 'Tool registry', d: 'Red slot: a clash or a guess', icon: 'check', atV: V(1.38, 0.25, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Key on serverInfo.name', hint: 'two servers say "primary"', on: () => set({ ...D0, byId: false }), off: reset },
      { label: 'Let tool names collide', hint: 'unique only within a server', on: () => set({ ...D0, prefix: false }), off: reset },
      { label: 'Share the whole conversation', hint: 'servers should not see each other', on: () => set({ ...D0, isolate: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The host runs three clients, keys them on its own ids, routes "search" to files and "notes/search" to notes, lists nothing from metrics because it declared no tools capability, and sends each server only what its request needs.</b>' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One host', home: true, say: 'The newsroom assistant is the host. It creates one client for each server it uses.', act: m => m.set({ byId: false, prefix: false, caps: false, isolate: false }) },
    { t: 'Local and remote', home: true, say: 'Files and notes run locally over stdio. Metrics is a remote service over HTTP.', act: m => m.set({ byId: false, prefix: false, caps: false, isolate: true }) },
    { t: 'Names are self-reported', home: true, say: 'Two servers both call themselves primary. Key the registry on the host\'s own ids.', act: m => m.set({ byId: true, prefix: false, caps: false, isolate: true }) },
    { t: 'Colliding tools', home: true, say: 'Both expose search. Prefix the second with its server id.', act: m => m.set({ byId: true, prefix: true, caps: false, isolate: true }) },
    { t: 'Declared capabilities', home: true, say: 'Metrics declared resources, not tools. The host lists no tools from it.', act: m => m.set({ byId: true, prefix: true, caps: true, isolate: true }) },
    { t: 'Isolation', home: true, say: 'Each request carries only what it needs, so servers never see the whole conversation.', act: m => m.set({ byId: true, prefix: true, caps: true, isolate: true }) },
  ],
  check: [
    { q: 'Two servers both report serverInfo.name "primary". What should the host key on?', options: ['Its own connection ids', 'serverInfo.name', 'The tool names'], answer: 0, why: 'Self-reported names need not be unique.', hint: 'Try Key on serverInfo.name.' },
    { q: 'Two servers both expose "search". What does the host do?', options: ['Prefix one with a server identifier', 'Keep the last one', 'Refuse both'], answer: 0, why: 'Names are unique only within a server.', hint: 'Try Let tool names collide.' },
    { q: 'Should a server see the whole conversation?', options: ['No: each request carries only what it needs', 'Yes, for context', 'Only remote servers'], answer: 0, why: 'Servers are isolated from the conversation and each other.', hint: 'Try Share the whole conversation.' },
  ],
  practice: [
    { q: 'Which participant enforces consent before a tool runs?', options: ['The host', 'The server', 'The model', 'The transport'], answer: 0, why: 'The host controls connections and consent.' },
    { q: 'How is a local server usually reached?', options: ['As a subprocess over stdio', 'Over HTTP with a session', 'Through the model', 'By email'], answer: 0, why: 'Remote servers usually use Streamable HTTP.' },
    { q: 'A server declared only the resources capability. Should the host list tools from it?', options: ['No', 'Yes, guess them', 'Only after a handshake', 'Only on stdio'], answer: 0, why: 'Respect declared capabilities.' },
    { q: 'How many clients does a host need for four servers?', options: ['Four', 'One', 'Two', 'Eight'], answer: 0, why: 'One client per server.' },
    { q: 'Who decides which resources go into context?', options: ['The application', 'The model', 'The user, always', 'The server'], answer: 0, why: 'Resources are application-driven.' },
    { q: 'After the host aggregates a call, who enforces the server\'s own errors?', options: ['The receiving server', 'The host only', 'Nobody', 'The model'], answer: 0, why: 'Aggregation does not remove the server\'s checks.' },
  ],
  terms: [
    ['Host', 'The application process; creates clients and enforces consent.'],
    ['Client', 'A host object bound to exactly one server.'],
    ['Local server', 'A subprocess reached over stdio.'],
    ['Remote server', 'A service reached over Streamable HTTP.'],
    ['Aggregation', 'Combining several servers\' tools into one registry.'],
    ['serverInfo.name', 'A self-reported name; not unique, not for security.'],
  ],
  deeper: '<p><b>Aggregator naming.</b> The specification suggests aggregators prefix tool names with a server identifier, because serverInfo.name is not unique.</p><p><b>About this machine.</b> The newsroom and servers are invented.</p>',
  code: {
    title: 'Aggregate tools safely',
    note: 'Written for this lesson.',
    text: `
def build_registry(connections):                 # host-assigned id -> client
    registry = {}
    for conn_id, client in connections.items():
        caps = client.discover()["capabilities"]
        if "tools" not in caps:
            continue                              # resources-only server: no tools listed
        for tool in client.list_tools():
            name = tool["name"]
            if name in registry:
                name = f"{conn_id}/{name}"        # prefix with the host's id, not serverInfo.name
            registry[name] = (conn_id, tool["name"])
    return registry
`,
  },
};
