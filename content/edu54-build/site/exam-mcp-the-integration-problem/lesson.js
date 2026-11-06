// Exam prep, the integration problem MCP solves: an invented logistics group in Douala has AI applications (chat, editor, ops console…) and
// systems (files, tickets, fleet database…). Bespoke glue costs one integration per pair, N times M; a shared protocol costs one client
// implementation per application and one server per system, N plus M. Discovery as data lets an unchanged client find a new tool; a host
// runs one client per server. The primitive buttons show who controls each: tools the model, resources the application, prompts the user.
const APPS = ['chat assistant', 'code editor', 'ops console', 'field app', 'analytics', 'help desk'];
const SYS = ['files', 'tickets', 'fleet DB', 'weather', 'billing', 'HR', 'maps', 'inventory'];
const PRIM = [
  { n: 'tool', who: 'the model', d: 'a named, schema-typed action the model decides to call' },
  { n: 'resource', who: 'the application', d: 'readable data by URI that the application places in context' },
  { n: 'prompt', who: 'the user', d: 'a reusable template the user picks explicitly' },
];

function run(o) {
  const cost = o.proto ? o.n + o.m : o.n * o.m;
  return { cost, other: o.proto ? o.n * o.m : o.n + o.m, ok: o.proto && o.discover && o.perServer };
}

export default {
  slug: 'exam-mcp-the-integration-problem',
  title: 'Exam prep, MCP: the integration problem',
  description: 'Applications times systems: bespoke glue costs a wire per pair, while one shared protocol costs one per side. Add a system and watch the cost tower.',
  overview: 'Before MCP, connecting an AI application to an outside system meant writing glue, and each integration invented its own way to describe capabilities, arguments, errors and permissions. Four applications and six systems cost twenty-four integrations, each a place where formats drift and security assumptions blur; that is an N times M problem. MCP turns it into N plus M: each application learns to speak MCP once and each system exposes an MCP server once, so four and six cost ten, and each new system adds one. MCP is a protocol, not a product. It standardises the conversation between an AI application and the systems that give it context and let it act: how a server describes itself, how a client asks what it offers, how a tool is invoked and how results and errors come back. It deliberately does not standardise which model a host uses, how the host builds its prompt or what the interface looks like. The participants: the host is the application the user works in; inside it, a client manages the conversation with one server, so a host runs one client per server. A server exposes three primitives with different controllers: tools are model-controlled actions, resources are application-driven data identified by URIs, and prompts are user-controlled templates. Every message is JSON-RPC 2.0, and in 2026-07-28 every request carries its own protocol version and capabilities in _meta, with no opening handshake and no session; every result carries a resultType. Discovery is data, not code: server/discover and tools/list describe the server at run time, so a client written today can drive a server written next year. The company is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'integration', 'n times m', 'host client server', 'primitives', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { n: 4, m: 6, proto: true, discover: true, perServer: true, prim: 0 }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', CORAL = '#E07A5F';
    /* applications on the left, systems on the right */
    const AX = -2.0, SX = 0.4, HX = -0.8, az = i => -0.85 + i * 0.28, sz = j => -0.92 + j * 0.21;
    const apps = APPS.map((n, i) => { const b = P.box(0.42, 0.24, 0.2, '#3D6BD6', { r: 0.03 }); b.position.set(AX, 0, az(i)); S.add(b); return b; });
    const syss = SYS.map((n, j) => { const b = P.box(0.42, 0.2, 0.15, '#7B6FA8', { r: 0.03 }); b.position.set(SX, 0, sz(j)); S.add(b); return b; });
    /* bespoke glue: one wire per pair */
    const glue = []; APPS.forEach((a, i) => SYS.forEach((s, j) => { const g = P.rod(V(AX + 0.21, 0.12, az(i)), V(SX - 0.21, 0.12, sz(j)), 0.008, CORAL); g.userData.noFit = true; S.add(g); glue.push({ g, i, j }); }));
    /* the shared protocol: a hub, one wire per side */
    const hub = P.box(0.36, 0.36, 1.5, '#2C2D31', { r: 0.05 }); hub.position.set(HX, 0, -0.35); S.add(hub);
    const hl = [];
    APPS.forEach((a, i) => { const g = P.rod(V(AX + 0.21, 0.12, az(i)), V(HX - 0.18, 0.12, az(i)), 0.014, GOOD); g.userData.noFit = true; S.add(g); hl.push({ g, i, side: 'a' }); });
    SYS.forEach((s, j) => { const g = P.rod(V(HX + 0.18, 0.12, sz(j)), V(SX - 0.21, 0.12, sz(j)), 0.014, GOOD); g.userData.noFit = true; S.add(g); hl.push({ g, i: j, side: 's' }); });
    /* the integration count as a tower */
    const cost = P.tower(0.4, 0.4, GOOD, { h: 0.3 }); cost.userData.set({ cap: '' }); cost.position.set(1.15, 0, -0.35); S.add(cost);
    /* lamps: discovery and one client per server */
    const disc = P.lamp(GOOD, { h: 0.18, r: 0.09 }), per = P.lamp(GOOD, { h: 0.18, r: 0.09 }); disc.position.set(1.75, 0, -0.75); per.position.set(1.75, 0, -0.35); S.add(disc, per);
    /* who controls each primitive: model, application, user; the chosen one is gold */
    const prims = PRIM.map((p, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.34, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.1 + i * 0.5, 0, 0.5); S.add(b); return m; });
    S.add(P.keep(-2.3, 2.0, 1.15, -1.1, 0.7));

    let R = null;
    function draw() {
      R = run(st);
      apps.forEach((b, i) => { b.visible = i < st.n; });
      syss.forEach((b, j) => { b.visible = j < st.m; });
      glue.forEach(x => { x.g.visible = !st.proto && x.i < st.n && x.j < st.m; });
      hl.forEach(x => { x.g.visible = !!st.proto && (x.side === 'a' ? x.i < st.n : x.i < st.m); });
      hub.visible = !!st.proto;
      cost.userData.set({ h: Math.max(0.08, R.cost * 0.022), color: st.proto ? GOOD : RED });
      disc.userData.set({ color: st.discover ? GOOD : RED, on: true });
      per.userData.set({ color: st.perServer ? GOOD : RED, on: true });
      prims.forEach((m, i) => m.color.set(i === st.prim ? SAF : OFF));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Speak one shared protocol', short: 'MCP', get: () => st.proto, set: v => set({ proto: !!v }) },
      { type: 'toggle', label: 'Discover tools at run time', short: 'Discovery as data', get: () => st.discover, set: v => set({ discover: !!v }) },
      { type: 'toggle', label: 'One client per server', short: 'Client per server', get: () => st.perServer, set: v => set({ perServer: !!v }) },
      { type: 'slider', label: 'Applications', min: 1, max: 6, step: 1, get: () => st.n, set: v => set({ n: Math.round(+v) }) },
      { type: 'slider', label: 'Systems', min: 1, max: 8, step: 1, get: () => st.m, set: v => set({ m: Math.round(+v) }) },
      { type: 'buttons', label: 'Primitive', options: PRIM.map(p => p.n), get: () => st.prim, act: i => set({ prim: i }) },
    ];
    const readouts = [
      { label: 'Integrations', get: () => ({ v: String(R.cost), sub: st.proto ? 'N + M' : 'N × M', good: st.proto, bad: !st.proto }) },
      { label: 'Controlled by', get: () => ({ v: PRIM[st.prim].who, sub: PRIM[st.prim].n }) },
    ];
    const labels = [
      { name: 'a', t: 'Applications', d: 'Each a host with clients', icon: 'box', atV: V(-2.22, 0.2, -0.57) },
      { name: 't', t: 'Integration count', d: 'N × M wires or N + M', icon: 'link', atV: V(1.36, 0.25, -0.35) },
    ];
    const reset = () => set({ ...D0, n: st.n, m: st.m, prim: st.prim });
    const breaks = [
      { label: 'Write bespoke glue', hint: 'one per pair', on: () => set({ ...D0, proto: false }), off: reset },
      { label: 'Compile the tool list into the client', hint: 'new tools need a rebuild', on: () => set({ ...D0, discover: false }), off: reset },
      { label: 'Share one client across servers', hint: 'a host runs one client per server', on: () => set({ ...D0, perServer: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${st.n} applications and ${st.m} systems cost ${R.cost} implementations with one protocol instead of ${R.other} bespoke integrations.</b> Each client discovers its server at run time, a host runs one client per server, and a ${PRIM[st.prim].n} is controlled by ${PRIM[st.prim].who}.` };
      const f = [];
      if (!st.proto) f.push(`bespoke glue costs ${R.cost} integrations, one per pair, each with its own formats and security assumptions`);
      if (!st.discover) f.push('a tool list compiled into the client misses every tool added later; discovery should be data at run time');
      if (!st.perServer) f.push('one client shared across servers mixes their conversations; a host runs one client per server');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { cost.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Glue everywhere', home: true, say: 'Four applications and six systems, wired pair by pair: twenty-four integrations.', act: m => m.set({ n: 4, m: 6, proto: false, discover: false, perServer: false, prim: 0 }) },
    { t: 'One protocol', home: true, say: 'Each application speaks MCP once and each system exposes one server. Ten in all.', act: m => m.set({ n: 4, m: 6, proto: true, discover: false, perServer: false, prim: 0 }) },
    { t: 'Add a system', home: true, say: 'A new system adds one server, not one integration per application.', act: m => m.set({ n: 4, m: 8, proto: true, discover: false, perServer: false, prim: 0 }) },
    { t: 'Discovery is data', home: true, say: 'The client asks the server what it offers at run time, so new tools appear without a rebuild.', act: m => m.set({ n: 4, m: 8, proto: true, discover: true, perServer: false, prim: 0 }) },
    { t: 'Client per server', home: true, say: 'Inside the host, one client talks to one server.', act: m => m.set({ n: 4, m: 8, proto: true, discover: true, perServer: true, prim: 1 }) },
    { t: 'Who controls what', home: true, say: 'Tools are chosen by the model, resources by the application, prompts by the user.', act: m => m.set({ n: 4, m: 8, proto: true, discover: true, perServer: true, prim: 2 }) },
  ],
  check: [
    { q: 'Five applications and seven systems. How many implementations with MCP?', options: ['12', '35', '7'], answer: 0, why: 'N plus M.', hint: 'Try Write bespoke glue.' },
    { q: 'How does a client learn what a server offers?', options: ['At run time, through discovery and list calls', 'From a list compiled into the client', 'From the model'], answer: 0, why: 'Discovery is data.', hint: 'Try Compile the tool list into the client.' },
    { q: 'Who controls a prompt?', options: ['The user', 'The model', 'The server'], answer: 0, why: 'Tools model, resources application, prompts user.', hint: 'Press the prompt button.' },
  ],
  practice: [
    { q: 'What does MCP deliberately not standardise?', options: ['Which model a host uses and how it builds its prompt', 'How a tool is invoked', 'How errors come back', 'How a server describes itself'], answer: 0, why: 'Those stay the application\'s decisions.' },
    { q: 'How many clients does a host run for three servers?', options: ['Three', 'One', 'Six', 'None'], answer: 0, why: 'One client per server.' },
    { q: 'Which primitive is application-driven data identified by a URI?', options: ['Resource', 'Tool', 'Prompt', 'Capability'], answer: 0, why: 'The application places it in context.' },
    { q: 'What does every 2026-07-28 request carry in params._meta?', options: ['Protocol version and client capabilities', 'A session id', 'The model name', 'Nothing'], answer: 0, why: 'No handshake, no session.' },
    { q: 'What does every result carry to say what kind of result it is?', options: ['resultType', 'sessionId', 'status code', 'isComplete'], answer: 0, why: 'complete or input_required.' },
    { q: 'Why does N plus M also help security review?', options: ['Reviewers reason about one protocol, not many custom formats', 'It removes the need for review', 'It hides errors', 'It encrypts everything'], answer: 0, why: 'Fewer formats, clearer assumptions.' },
  ],
  terms: [
    ['Host', 'The application the user works in; it runs one client per server.'],
    ['Client', 'The component inside the host that talks to one server.'],
    ['Server', 'A program that exposes tools, resources and prompts over MCP.'],
    ['Tool', 'A model-controlled, schema-typed action.'],
    ['Resource', 'Application-driven data identified by a URI.'],
    ['Prompt', 'A user-controlled reusable template.'],
  ],
  deeper: '<p><b>Two error channels.</b> A request that is itself wrong is a JSON-RPC error; a tool that ran into a fixable problem returns a normal result with isError true. Later lessons go deeper.</p><p><b>About this machine.</b> The company and systems are invented.</p>',
  code: {
    title: 'The arithmetic',
    note: 'Written for this lesson.',
    text: `
def integrations(apps, systems, shared_protocol):
    return apps + systems if shared_protocol else apps * systems

for n, m in [(4, 6), (4, 8), (6, 8)]:
    print(n, m, integrations(n, m, False), "->", integrations(n, m, True))
# 4 6 24 -> 10
# 4 8 32 -> 12
# 6 8 48 -> 14
`,
  },
};
