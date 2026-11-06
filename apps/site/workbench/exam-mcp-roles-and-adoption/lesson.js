// Exam prep, MCP roles and adoption: an invented agritech company in Nakuru adopts MCP in three shapes: a local stdio server on a laptop, a
// remote Streamable HTTP server, and the same server behind an enterprise gateway. Six functions own requirements: server author, host and
// client developer, platform or gateway operator, security and governance owner, registry publisher and end user. The requirement stays fixed
// while its owner can move with the shape (Origin validation moves to the gateway operator). Governance and SDK tiers round it out. Illustrative.
const ROLES = ['server author', 'host/client dev', 'platform/gateway op', 'security owner', 'registry publisher', 'end user'];
const REQS = [
  { n: 'credentials from the environment, no OAuth flow', shapes: ['stdio'], owner: () => 2 },
  { n: 'Protected Resource Metadata (RFC 9728)', shapes: ['http', 'gateway'], owner: () => 0 },
  { n: 'validate Origin against DNS rebinding', shapes: ['http', 'gateway'], owner: s => (s === 'gateway' ? 2 : 0), moves: true },
  { n: 'OAuth client: PKCE, resource, iss', shapes: ['http', 'gateway'], owner: () => 1 },
  { n: 'consent surface before a call goes out', shapes: ['stdio', 'http', 'gateway'], owner: () => 1 },
  { n: 'sign and bind requestState', shapes: ['stdio', 'http', 'gateway'], owner: () => 3 },
  { n: 'server.json namespace and accuracy', shapes: ['gateway', 'http'], owner: () => 4 },
  { n: 'able to deny an invocation', shapes: ['stdio', 'http', 'gateway'], owner: () => 5 },
];
const SHAPES = ['stdio', 'http', 'gateway'];

function run(o) {
  const shape = SHAPES[o.shape];
  const rows = REQS.filter(r => r.shapes.includes(shape)).map(r => {
    let owner = r.owner(shape), ok = true;
    if (r.moves && !o.moves && shape === 'gateway') { owner = 0; ok = false; }
    return { r, owner, ok };
  });
  if (shape === 'stdio' && !o.stdio) rows.unshift({ r: { n: 'run a browser OAuth flow for a local subprocess' }, owner: 1, ok: false });
  const issues = [];
  if (!o.moves) issues.push('behind the gateway, Origin validation was still left to the server author, though the gateway edge now sees the header first');
  if (!o.stdio) issues.push('the local stdio deployment was given an OAuth flow; stdio should read credentials from the environment');
  if (!o.tier) issues.push('a Tier 3 SDK was picked for the production gateway, inheriting experimental maintenance risk');
  if (!o.group) issues.push('a half-formed idea went straight to a Working Group; raise it in an Interest Group first, then build a SEP');
  return { shape, rows, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-roles-and-adoption',
  title: 'Exam prep, MCP: roles and adoption',
  description: 'One company adopts MCP three ways: local stdio, remote HTTP and behind a gateway. See each duty land on its owner, and move when the shape changes.',
  overview: 'Six functions own MCP requirements, on top of the host, client and server roles from architecture. The server author writes one implementation against the 2026-07-28 specification: its tools, schemas and server/discover answer. The host and client developer builds the application a person runs and the client inside it: capability declarations, the OAuth client when the transport is remote and the consent surface the user sees before a call. The platform or gateway operator runs the process: launching the stdio subprocess with the right environment, or terminating Streamable HTTP, applying network policy and deciding what a gateway checks. The security and governance owner is accountable for cross-cutting requirements such as token handling, requestState protection and consent policy. The registry publisher owns server.json, its namespace and its accuracy. The end user is accountable for what the host does on their behalf, the party the specification protects whenever it says a human should be able to deny an invocation. One person can hold several functions on a small team, and a requirement can move between them as a deployment grows. Origin validation is a Streamable HTTP MUST: on a server exposed directly it falls to the server author; behind an enterprise gateway the gateway edge sees the header first, so the operator owns it. stdio implementations should not run the OAuth flow and should read credentials from the environment, which the operator or whoever launches the process provides. Governance: MCP is a project of the Agentic AI Foundation; Lead Maintainers hold final veto, Core Maintainers steer the specification, Maintainers steward one area; Interest Groups discuss problems and produce non-binding recommendations, Working Groups build deliverables such as SEPs. SDK tiers: Tier 1 passes 100 percent of conformance tests, ships features with spec releases, triages within two business days and fixes critical bugs within seven; Tier 2 passes 80 percent with a six-month feature window; Tier 3 is experimental. The company is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'roles', 'responsibility matrix', 'gateway', 'governance', 'sdk tiers', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { shape: 2, moves: true, stdio: true, tier: true, group: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* six roles in a row, each holding a stack of the duties it owns */
    const X = j => -1.75 + j * 0.7;
    const seats = ROLES.map((r, j) => {
      const b = P.robot(['#3D6BD6', '#5B8DB8', '#7B6FA8', '#E07A5F', '#D9A441', '#6FA36B'][j], { scale: 0.5 }); b.position.set(X(j), 0, -0.55); S.add(b);
      const s = P.stack(0.36, 0.36, 0.1, { max: 7 }); s.position.set(X(j), 0, -0.05); S.add(s);
      return s;
    });
    /* three shapes of deployment, two habits */
    const shapes = SHAPES.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.4, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.0 + i * 0.5, 0, 0.55); S.add(b); return m; });
    const tier = P.lamp(GOOD, { h: 0.14, r: 0.085 }), group = P.lamp(GOOD, { h: 0.14, r: 0.085 }); tier.position.set(0.9, 0, 0.55); group.position.set(1.3, 0, 0.55); S.add(tier, group);
    S.add(P.keep(-2.05, 1.95, 0.8, -0.8, 0.75));

    let R = null;
    function draw() {
      R = run(st);
      seats.forEach((s, j) => {
        const mine = R.rows.filter(x => x.owner === j);
        s.userData.set({ n: mine.length, colors: mine.map(x => !x.ok ? BAD : x.r.moves && R.shape === 'gateway' ? SAF : GOOD) });
      });
      shapes.forEach((m, i) => m.color.set(i === st.shape ? SAF : OFF));
      tier.userData.set({ color: st.tier ? GOOD : BAD, on: true }); group.userData.set({ color: st.group ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Move Origin checks to the gateway operator', short: 'Origin moves', get: () => st.moves, set: v => set({ moves: !!v }) },
      { type: 'toggle', label: 'stdio reads credentials from the environment', short: 'stdio env', get: () => st.stdio, set: v => set({ stdio: !!v }) },
      { type: 'toggle', label: 'Tier 1 SDK for production', short: 'SDK tier', get: () => st.tier, set: v => set({ tier: !!v }) },
      { type: 'toggle', label: 'Interest Group before Working Group', short: 'IG first', get: () => st.group, set: v => set({ group: !!v }) },
      { type: 'buttons', label: 'Deployment', options: ['local stdio', 'remote HTTP', 'behind a gateway'], get: () => st.shape, act: i => set({ shape: i }) },
    ];
    const readouts = [
      { label: 'Requirements', get: () => ({ v: String(R.rows.length), sub: `owned in ${['stdio', 'HTTP', 'gateway'][st.shape]}` }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'ownership and adoption', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'm', t: 'Six roles', d: 'A stack: the duties each one owns', icon: 'user', atV: V(-1.97, 0.25, -0.55) },
      { name: 't', t: 'Shape of deployment', d: 'Gold: a duty that moved', icon: 'check', atV: V(0.22, 0.05, 0.55) },
    ];
    const reset = () => set({ ...D0, shape: st.shape });
    const breaks = [
      { label: 'Leave Origin with the server author', hint: 'the gateway sees it first', on: () => set({ ...D0, shape: 2, moves: false }), off: reset },
      { label: 'Give stdio an OAuth flow', hint: 'use the environment', on: () => set({ ...D0, shape: 0, stdio: false }), off: reset },
      { label: 'Ship a Tier 3 SDK', hint: 'experimental', on: () => set({ ...D0, tier: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${['Locally over stdio, the operator supplies credentials through the environment and no OAuth flow runs', 'On remote HTTP, the server author owns Origin validation and Protected Resource Metadata, and the host developer builds the OAuth client', 'Behind the gateway, Origin validation moves to the gateway operator while the server author keeps Protected Resource Metadata'][st.shape]}.</b> The production gateway uses a Tier 1 SDK, and new ideas start in an Interest Group.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Six functions', home: true, say: 'Server author, host developer, operator, security owner, registry publisher and end user.', act: m => m.set({ shape: 0, moves: true, stdio: true, tier: true, group: true }) },
    { t: 'Local stdio', home: true, say: 'On a laptop, the operator passes credentials through the environment. No OAuth flow runs.', act: m => m.set({ shape: 0, moves: true, stdio: true, tier: true, group: true }) },
    { t: 'Remote HTTP', home: true, say: 'Exposed directly, the server author validates Origin and publishes resource metadata.', act: m => m.set({ shape: 1, moves: true, stdio: true, tier: true, group: true }) },
    { t: 'Behind a gateway', home: true, say: 'With a gateway in front, Origin validation moves to the operator. The rule did not change.', act: m => m.set({ shape: 2, moves: true, stdio: true, tier: true, group: true }) },
    { t: 'Pick an SDK', home: true, say: 'A production gateway rests on a Tier 1 SDK, not an experimental one.', act: m => m.set({ shape: 2, moves: true, stdio: true, tier: true, group: true }) },
    { t: 'Change the protocol', home: true, say: 'A new idea starts in an Interest Group, and a Working Group builds the proposal.', act: m => m.set({ shape: 2, moves: true, stdio: true, tier: true, group: true }) },
  ],
  check: [
    { q: 'A gateway fronts the server. Who validates Origin?', options: ['The gateway operator', 'The server author alone', 'The end user'], answer: 0, why: 'The requirement stays; the owner moves.', hint: 'Try Leave Origin with the server author.' },
    { q: 'How does a stdio server get credentials?', options: ['From the environment', 'Through a browser OAuth flow', 'From clientInfo'], answer: 0, why: 'stdio should not follow the OAuth flow.', hint: 'Try Give stdio an OAuth flow.' },
    { q: 'Which SDK tier fits a production gateway?', options: ['Tier 1', 'Tier 3', 'Any tier'], answer: 0, why: 'Tier 3 is experimental.', hint: 'Try Ship a Tier 3 SDK.' },
  ],
  practice: [
    { q: 'Who owns server.json and its namespace?', options: ['The registry publisher', 'The end user', 'The host developer', 'The model'], answer: 0, why: 'And its accuracy.' },
    { q: 'Who builds the consent surface a user sees before a call?', options: ['The host and client developer', 'The server author', 'The registry publisher', 'The gateway operator'], answer: 0, why: 'Part of the application.' },
    { q: 'What does an Interest Group produce?', options: ['Non-binding recommendations, use cases and requirements', 'Binding specification text', 'SDK releases', 'Registry entries'], answer: 0, why: 'Working Groups build deliverables such as SEPs.' },
    { q: 'What conformance does a Tier 2 SDK pass?', options: ['80 percent, with a six-month feature window', '100 percent', 'None', '50 percent'], answer: 0, why: 'Tier 1 passes 100 percent.' },
    { q: 'Who holds final veto over MCP\'s direction?', options: ['Lead Maintainers', 'Any contributor', 'Registry publishers', 'Tier 1 SDKs'], answer: 0, why: 'Core Maintainers steer the specification.' },
    { q: 'Who is responsible for protecting requestState across a deployment?', options: ['The security and governance owner', 'The end user', 'The registry publisher', 'Nobody'], answer: 0, why: 'A cross-cutting requirement.' },
  ],
  terms: [
    ['Server author', 'Writes the server implementation against the specification.'],
    ['Host and client developer', 'Builds the application, its client and consent surface.'],
    ['Gateway operator', 'Runs the process or edge and its network policy.'],
    ['Security owner', 'Accountable for cross-cutting requirements.'],
    ['Interest Group', 'Discusses problems; non-binding recommendations.'],
    ['SDK tier', 'Tier 1, 2 or 3 commitments on conformance and support.'],
  ],
  deeper: '<p><b>Becoming a Maintainer.</b> Contributors who sustain work become Members; after at least six months, with a sponsor and Core Maintainer approval, a Member can become a Maintainer.</p><p><b>About this machine.</b> The company and deployments are invented.</p>',
  code: {
    title: 'Owners move with the shape',
    note: 'Written for this lesson.',
    text: `
REQS = [
    ("validate Origin", {"http", "gateway"},
     lambda shape: "gateway_operator" if shape == "gateway" else "server_author"),
    ("Protected Resource Metadata", {"http", "gateway"}, lambda shape: "server_author"),
    ("credentials from the environment", {"stdio"}, lambda shape: "gateway_operator"),
    ("sign and bind requestState", {"stdio", "http", "gateway"}, lambda shape: "security_owner"),
]

def matrix(shape):
    return {name: owner(shape) for name, shapes, owner in REQS if shape in shapes}

print(matrix("http")["validate Origin"], matrix("gateway")["validate Origin"])
# server_author gateway_operator
`,
  },
};
