// Exam prep, the MCP extensions framework: an invented incident desk in Kigali has a client and a server that each declare extensions. An
// identifier is {vendor-prefix}/{name} under the _meta naming rules (io.modelcontextprotocol/ for official, a reversed domain you own for
// third parties). The client declares extensions per request in clientCapabilities.extensions; the server declares them in server/discover.
// An extension is active only in the intersection; an optional one falls back to core behaviour, a mandatory one is refused; a breaking change
// needs a new identifier. Illustrative.
const CLIENT = [['io.modelcontextprotocol/ui', '{mimeTypes: [...]}'], ['com.example/priority-routing', '{}'], ['tasks', '{} (no prefix!)']];
const SERVER = [['io.modelcontextprotocol/tasks', '{}'], ['com.example/priority-routing', '{}'], ['tasks', '{}']];

function run(o) {
  const ids = c => c.map(x => x[0]);
  const valid = id => /^[a-z0-9-]+(\.[a-z0-9-]+)+\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id);
  const cl = o.perRequest ? ids(CLIENT) : [];
  let active = cl.filter(id => ids(SERVER).includes(id));
  if (o.prefix) active = active.filter(valid);
  const issues = [];
  if (!o.perRequest) issues.push('the client declared extensions once, earlier, and left them off this request; each request carries its own declaration');
  if (!o.prefix) issues.push('the bare identifier "tasks" was treated as active; identifiers need a vendor prefix');
  if (!o.fallback) issues.push('the ui extension was only on the client side, and the server errored instead of answering with plain text');
  if (!o.version) issues.push('a breaking change to priority-routing shipped under the old identifier; it needs a new one such as -v2');
  return { active, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-the-extensions-framework',
  title: 'Exam prep, MCP: the extensions framework',
  description: 'A client and a server each declare extensions. Only a pair declared on this request connects, a bare name stays dark, and one side alone falls back.',
  overview: 'An MCP extension is an optional addition beyond the core protocol, named so that unrelated vendors never collide. Its identifier is {vendor-prefix}/{extension-name}, following the _meta key rules with a mandatory prefix: official extensions use io.modelcontextprotocol/, and third parties use a reversed domain they own, such as com.example/my-extension. Both sides advertise support as data attached to messages, not as a setup step. A client declares the extensions it wants for a call in that request\'s _meta["io.modelcontextprotocol/clientCapabilities"].extensions, a map from identifier to a settings object; a server declares the extensions it implements in its server/discover result under capabilities.extensions, in the same shape. An empty object means supported with nothing to configure; a populated object carries that extension\'s settings. Because the declaration is resent on every request, nothing declared earlier carries over. An extension is active for a call only when both sides name it, an intersection by identifier, and a malformed identifier without its prefix never belongs in the result. If only one side supports an optional extension, the supporting side falls back to core behaviour, such as a dashboard tool still returning meaningful text; if the extension is mandatory for that call, the supporting side rejects the request with an appropriate error. Extensions are disabled by default and need explicit opt-in. They enter through an Extensions Track SEP, which must already have a reference implementation in an official SDK before Core Maintainers review it; experimental work lives in experimental-ext- repositories under a Working or Interest Group. Extensions version independently, and a breaking change (removing or renaming a field, changing a type or meaning, adding a required field) needs a new identifier, such as a -v2 suffix. Official families today: tasks, MCP Apps (ui), Skills over MCP, and the authorization extensions. Before 2026-07-28, extensions were declared once in initialize; now they ride every request. The desk is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'extensions', 'negotiation', 'vendor prefix', 'versioning', 'sep', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { perRequest: true, prefix: true, fallback: true, version: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#3D6BD6', PLUM = '#7B6FA8';
    /* four lanes between client and server: ui, priority routing, a bare name, tasks */
    const LANE = [0, 1, 2, null], SIDE = [null, 1, 2, 0], Z = i => -0.95 + i * 0.42;
    const IDS = ['io.modelcontextprotocol/ui', 'com.example/priority-routing', 'tasks', 'io.modelcontextprotocol/tasks'];
    const client = P.robot(BLUE, { scale: 0.62 }); client.position.set(-2.25, 0, -0.32); S.add(client);
    const server = P.box(0.5, 0.5, 1.6, '#5B8DB8', { r: 0.05 }); server.position.set(1.15, 0, -0.32); S.add(server);
    const rows = IDS.map((id, i) => {
      const cm = new THREE.MeshLambertMaterial({ color: BLUE }), sm = new THREE.MeshLambertMaterial({ color: PLUM });
      const c = P.box(0.3, 0.2, 0.28, '#fff', { r: 0.03, material: cm }); c.position.set(-1.65, 0, Z(i)); c.visible = LANE[i] != null; S.add(c);
      const s = P.box(0.3, 0.2, 0.28, '#fff', { r: 0.03, material: sm }); s.position.set(0.7, 0, Z(i)); s.visible = SIDE[i] != null; S.add(s);
      const p = P.pipe([V(-1.5, 0.12, Z(i)), V(-0.5, 0.14, Z(i)), V(0.55, 0.12, Z(i))], GOOD, { r: 0.04, n: 5 }); S.add(p);
      return { cm, p };
    });
    /* one side only: a plain-text tray takes the ui lane */
    const trayM = new THREE.MeshLambertMaterial({ color: GOOD }), tray = P.box(0.42, 0.08, 0.3, '#fff', { r: 0.03, material: trayM }); tray.position.set(0.0, 0, Z(0)); S.add(tray);
    const ver = P.lamp(GOOD, { h: 0.14, r: 0.085 }); ver.position.set(-0.5, 0, 0.45); S.add(ver);
    S.add(P.keep(-2.5, 1.5, 0.75, -1.2, 0.6));
    const parts = [client, ...rows.map(r => r.p)];

    let R = null;
    function draw() {
      R = run(st);
      rows.forEach((r, i) => {
        const on = R.active.includes(IDS[i]);
        r.p.visible = on; r.p.userData.set({ color: IDS[i] === 'tasks' ? BAD : GOOD });
        r.cm.color.set(st.perRequest ? BLUE : OFF);
      });
      tray.visible = !!st.perRequest; trayM.color.set(st.fallback ? GOOD : BAD);
      ver.userData.set({ color: st.version ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Declare extensions on every request', short: 'Per request', get: () => st.perRequest, set: v => set({ perRequest: !!v }) },
      { type: 'toggle', label: 'Require a vendor prefix', short: 'Prefix', get: () => st.prefix, set: v => set({ prefix: !!v }) },
      { type: 'toggle', label: 'Optional extensions fall back to core', short: 'Fallback', get: () => st.fallback, set: v => set({ fallback: !!v }) },
      { type: 'toggle', label: 'Breaking change gets a new identifier', short: 'New id', get: () => st.version, set: v => set({ version: !!v }) },
    ];
    const readouts = [
      { label: 'Active', get: () => ({ v: String(R.active.length), sub: 'extensions on this call', good: R.ok, bad: !R.ok }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in negotiation', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'c', t: 'Client declares', d: 'On this request, or not at all', icon: 'link', atV: V(-2.45, 0.25, -0.32) },
      { name: 't', t: 'Both sides', d: 'A flowing pipe: active', icon: 'check', atV: V(1.42, 0.3, -0.32) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Declare extensions once', hint: 'nothing carries over', on: () => set({ ...D0, perRequest: false }), off: reset },
      { label: 'Accept a bare identifier', hint: 'vendor prefix required', on: () => set({ ...D0, prefix: false }), off: reset },
      { label: 'Error when the other side lacks it', hint: 'optional means fall back', on: () => set({ ...D0, fallback: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>Only com.example/priority-routing is on both sides, so it is active for this call; the client\'s ui request falls back to plain text because the server lacks it; the bare "tasks" never counts; and a breaking change ships as priority-routing-v2.</b>' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Optional additions', home: true, say: 'Extensions add capabilities beyond the core, named by vendor so they never collide.', act: m => m.set({ perRequest: true, prefix: true, fallback: true, version: true }) },
    { t: 'Every request', home: true, say: 'The client lists its extensions on each request. Nothing carries over from earlier.', act: m => m.set({ perRequest: false, prefix: true, fallback: true, version: true }) },
    { t: 'The intersection', home: true, say: 'An extension is active only when both the request and the server name it.', act: m => m.set({ perRequest: true, prefix: true, fallback: true, version: true }) },
    { t: 'A real prefix', home: true, say: 'A bare name like tasks is malformed. It never counts, even if both sides list it.', act: m => m.set({ perRequest: true, prefix: true, fallback: true, version: true }) },
    { t: 'Fall back', home: true, say: 'If only one side has an optional extension, it falls back to core behaviour.', act: m => m.set({ perRequest: true, prefix: true, fallback: true, version: true }) },
    { t: 'New version, new name', home: true, say: 'A breaking change ships under a new identifier, so old clients are never surprised.', act: m => m.set({ perRequest: true, prefix: true, fallback: true, version: true }) },
  ],
  check: [
    { q: 'Where does a client declare the extensions it wants?', options: ['In clientCapabilities.extensions on each request', 'Once in initialize', 'In serverInfo'], answer: 0, why: 'Nothing carries over.', hint: 'Try Declare extensions once.' },
    { q: 'Is "tasks" a valid extension identifier?', options: ['No: it needs a vendor prefix', 'Yes', 'Only for official ones'], answer: 0, why: 'io.modelcontextprotocol/tasks.', hint: 'Try Accept a bare identifier.' },
    { q: 'Only one side supports an optional extension. What happens?', options: ['The supporting side falls back to core behaviour', 'The request fails', 'The extension activates anyway'], answer: 0, why: 'Mandatory ones are rejected instead.', hint: 'Try Error when the other side lacks it.' },
  ],
  practice: [
    { q: 'Which prefix should a third-party extension use?', options: ['A reversed domain the vendor owns', 'io.modelcontextprotocol/', 'mcp/', 'None'], answer: 0, why: 'Official ones use io.modelcontextprotocol/.' },
    { q: 'What does an empty settings object {} mean?', options: ['Supported, nothing to configure', 'Not supported', 'Deprecated', 'Unknown'], answer: 0, why: 'A complete declaration.' },
    { q: 'What must an Extensions Track SEP have before review?', options: ['A reference implementation in an official SDK', 'A blog post', 'Nothing', 'A logo'], answer: 0, why: 'Unlike a Standards Track SEP.' },
    { q: 'Which change requires a new extension identifier?', options: ['Adding a new required field', 'Fixing a typo in docs', 'Adding an optional field', 'Clarifying an example'], answer: 0, why: 'Breaking changes need a new id.' },
    { q: 'Where does a server advertise its extensions?', options: ['server/discover capabilities.extensions', 'Every tools/list item', 'clientInfo', 'A header'], answer: 0, why: 'The same map shape as the client\'s.' },
    { q: 'Are extensions on by default?', options: ['No: explicit opt-in', 'Yes', 'Only official ones', 'Only on HTTP'], answer: 0, why: 'Disabled by default.' },
  ],
  terms: [
    ['Extension', 'An optional capability beyond the core protocol.'],
    ['Identifier', '{vendor-prefix}/{name}, prefix mandatory.'],
    ['Active set', 'Extensions both the request and the server declare.'],
    ['Fallback', 'Core behaviour when an optional extension is missing.'],
    ['Extensions Track SEP', 'The path in, with a reference implementation first.'],
    ['-v2', 'A new identifier for a breaking change.'],
  ],
  deeper: '<p><b>Official families.</b> io.modelcontextprotocol/tasks, io.modelcontextprotocol/ui (MCP Apps), io.modelcontextprotocol/skills and the authorization extensions.</p><p><b>About this machine.</b> The desk and the priority-routing extension are invented.</p>',
  code: {
    title: 'Negotiate on every request',
    note: 'Written for this lesson.',
    text: `
import re
ID = re.compile(r"^[a-z0-9-]+(\\.[a-z0-9-]+)+/[A-Za-z0-9][A-Za-z0-9._-]*$")

def active_extensions(request, server_caps):
    asked = request["params"]["_meta"]["io.modelcontextprotocol/clientCapabilities"].get("extensions", {})
    offered = server_caps.get("extensions", {})
    return {i: asked[i] for i in asked if i in offered and ID.match(i)}   # intersection, prefixed only

def dashboard(request, server_caps):
    if "io.modelcontextprotocol/ui" in active_extensions(request, server_caps):
        return rich_result()
    return {"content": [{"type": "text", "text": summary_text()}]}       # optional: fall back
`,
  },
};
