// Exam prep, the stateless core: an invented grocery delivery service in Harare runs a basket server on two replicas behind a round-robin
// router. Alice creates a basket and adds items; Bob tries Alice's handle. With state in a shared store keyed by a server-minted, opaque handle,
// any replica answers; with state in process memory (a session by another name), the next call lands on the other replica and the basket is
// gone. The handle is a name, not a capability: authorise the caller on every call. Lists must not vary per connection. Illustrative.
const CALLS = [
  { who: 'alice', tool: 'create_basket', rep: 'A' },
  { who: 'alice', tool: 'add_item(basket_id, maize meal)', rep: 'B' },
  { who: 'alice (2nd connection)', tool: 'tools/list', rep: 'A' },
  { who: 'bob', tool: 'add_item(alice\'s basket_id, …)', rep: 'B' },
  { who: 'alice', tool: 'checkout(basket_id)', rep: 'A' },
];

function run(o) {
  const out = CALLS.map((c, i) => {
    if (i === 0) return { ok: true, r: `basket_id ${o.opaque ? '"bsk_7Qf2…"' : '"alice-1"'}` };
    if (i === 1) return o.shared ? { ok: true, r: '1 item' } : { ok: false, r: 'basket not found on B', why: 'state lived in replica A\'s memory' };
    if (i === 2) return o.lists ? { ok: true, r: 'same 3 tools' } : { ok: false, r: 'checkout missing', why: 'the list changed per connection' };
    if (i === 3) return o.authz ? { ok: true, r: 'isError: not your basket' } : { ok: false, r: 'item added to alice\'s basket', why: 'possessing a handle was treated as permission' };
    return o.shared ? { ok: true, r: 'paid, 1 item' } : { ok: false, r: 'empty basket', why: 'replica A never saw the item added on B' };
  });
  const issues = [];
  if (!o.shared) issues.push('basket state lived in one replica\'s memory, so a call routed to the other replica found nothing');
  if (!o.lists) issues.push('the tools/list result changed per connection, so Alice\'s second connection did not see checkout');
  if (!o.authz) issues.push('Bob used Alice\'s handle and the server let him, because it never authorised the caller against the handle');
  if (!o.opaque) issues.push('the handle "alice-1" is guessable, so another user can try "alice-2"');
  return { out, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-the-stateless-core',
  title: 'Exam prep, MCP: the stateless core',
  description: 'A basket server runs on two replicas behind a round-robin router. Keep state in a shared store, not in memory, and never trust a handle alone.',
  overview: 'MCP 2026-07-28 is stateless: everything needed to process a request is in the request. A server must not infer capabilities, version or identity from earlier requests, even on the same connection, because every request carries its own protocol version and capabilities in _meta. A stdio process or an HTTP connection is a transport, not a session; clients may interleave requests from different tasks or users on one transport. tools/list, resources/list and prompts/list must not vary per connection or as a side effect of another request; they may vary by the authorization presented on the request. Statelessness pays operationally: any replica can answer any request, round-robin routing works without sticky sessions, a failed request can be retried anywhere, and a crashed replica loses nothing. Servers can still remember things. A basket, a browser context or a long job survives across calls through an explicit, server-minted handle: a creation tool returns an opaque identifier, and the model passes it back as an ordinary argument. Nothing about the handle is a protocol feature, so the design rules fall on the server author: keep handles opaque, store the state where every replica can reach it, authorise the caller against the handle on every call (a name is not a capability), state the handle\'s lifetime in the tool description, and report an expired handle as a tool execution error. Because lists do not depend on the connection, a subagent sharing the same principal sees the same tools/list and can reuse a cached copy. To make this the default, 2026-07-28 removed the initialize handshake, notifications/initialized and the Mcp-Session-Id header. The service is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'stateless', 'handles', 'sessions', 'replicas', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { shared: true, authz: true, lists: true, opaque: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', LINK = '#B9B3A6';
    /* two callers, a round-robin router and two replicas */
    const alice = P.robot('#3D6BD6', { scale: 0.55 }), bob = P.robot('#E07A5F', { scale: 0.55 });
    alice.position.set(-2.4, 0, -0.65); bob.position.set(-2.4, 0, -0.1); S.add(alice, bob);
    const router = P.box(0.4, 0.3, 0.5, '#6B6E7E', { r: 0.05 }); router.position.set(-1.7, 0, -0.38); S.add(router);
    [[-2.2, -0.65], [-2.2, -0.1]].forEach(([x, z]) => S.add(P.rod(V(x, 0.14, z), V(-1.9, 0.14, -0.38), 0.014, LINK)));
    const reps = [-0.68, -0.1].map(z => { const m = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), b = P.box(0.46, 0.32, 0.36, '#fff', { r: 0.04, material: m }); b.position.set(-0.85, 0, z); S.add(b); S.add(P.rod(V(-1.5, 0.14, -0.38), V(-1.08, 0.14, z), 0.014, LINK)); return m; });
    /* the basket: a gold ball in replica A's memory, gone from replica B */
    const inMem = P.ball(0.09, SAF); inMem.position.set(-0.85, 0.42, -0.68); S.add(inMem);
    /* the shared store: pipes from both replicas into a shelf */
    const links = [-0.68, -0.1].map(z => { const p = P.pipe([V(-0.62, 0.16, z), V(-0.2, 0.16, (z - 0.38) / 2), V(0.25, 0.16, -0.38)], GOOD, { r: 0.03, n: 4 }); S.add(p); return p; });
    const store = P.shelf(4, { cell: 0.22, levels: 2, lh: 0.2, d: 0.34 }); store.position.set(0.75, 0, -0.38); S.add(store);
    /* the check on every call: a gate before the store, and a handle that is opaque or guessable */
    const check = P.gate(0.5, GOOD, { h: 0.4 }); check.rotation.y = Math.PI / 2; check.position.set(0.3, 0, -0.38); S.add(check);
    const handleM = new THREE.MeshLambertMaterial({ color: GOOD }), handle = P.box(0.26, 0.12, 0.2, '#fff', { r: 0.03, material: handleM }); handle.position.set(1.5, 0, -0.38); S.add(handle);
    /* five calls in order: a lamp each */
    const calls = CALLS.map((c, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.09 }); l.position.set(-1.45 + i * 0.5, 0, 0.5); S.add(l); return l; });
    S.add(P.keep(-2.6, 1.75, 0.8, -0.95, 0.75));
    const parts = [alice, bob, ...links];

    let R = null;
    function draw() {
      R = run(st);
      reps[0].color.set(st.shared ? '#5B8DB8' : SAF); reps[1].color.set(st.shared ? '#5B8DB8' : BAD);
      inMem.visible = !st.shared;
      links.forEach(p => { p.visible = !!st.shared; });
      store.userData.set({ fill: Array.from({ length: 8 }, (_, i) => st.shared && i < 2 ? SAF : OFF) });
      check.visible = !!st.authz;
      handleM.color.set(st.opaque ? GOOD : SAF);
      R.out.forEach((o, i) => calls[i].userData.set({ color: o.ok ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'State in a shared store under the handle', short: 'Shared store', get: () => st.shared, set: v => set({ shared: !!v }) },
      { type: 'toggle', label: 'Authorise the caller against the handle', short: 'Check the caller', get: () => st.authz, set: v => set({ authz: !!v }) },
      { type: 'toggle', label: 'Lists the same on every connection', short: 'Stable lists', get: () => st.lists, set: v => set({ lists: !!v }) },
      { type: 'toggle', label: 'Opaque, unguessable handles', short: 'Opaque handles', get: () => st.opaque, set: v => set({ opaque: !!v }) },
    ];
    const readouts = [
      { label: 'Calls right', get: () => ({ v: `${R.out.filter(o => o.ok).length} of 5`, sub: 'across two replicas', good: R.ok, bad: !R.ok }) },
      { label: 'Sticky routing', get: () => ({ v: st.shared ? 'not needed' : 'needed', sub: 'load balancer', good: st.shared, bad: !st.shared }) },
    ];
    const labels = [
      { name: 'r', t: 'Two replicas', d: 'Gold in memory strands the basket', icon: 'box', atV: V(-1.08, 0.18, -0.68) },
      { name: 't', t: 'Five calls', d: 'Red: that call broke', icon: 'check', atV: V(0.75, 0.25, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the basket in memory', hint: 'a session by another name', on: () => set({ ...D0, shared: false }), off: reset },
      { label: 'Trust whoever holds the handle', hint: 'a name is not a capability', on: () => set({ ...D0, authz: false }), off: reset },
      { label: 'Change the tool list per connection', hint: 'lists vary only by authorization', on: () => set({ ...D0, lists: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>Alice\'s calls land on alternating replicas and all succeed, because the basket lives in a shared store under an opaque, server-minted handle; Bob\'s attempt with her handle gets a tool execution error; and her second connection sees the same tool list.</b> No sticky sessions needed.' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two replicas', home: true, say: 'A basket server runs on two replicas, and a router sends each request to the next one.', act: m => m.set({ shared: false, authz: false, lists: false, opaque: false }) },
    { t: 'Memory is a trap', home: true, say: 'A basket kept in one replica\'s memory is gone when the next call lands on the other.', act: m => m.set({ shared: false, authz: true, lists: true, opaque: true }) },
    { t: 'A handle', home: true, say: 'The create tool returns a handle, and the state lives in a store both replicas share.', act: m => m.set({ shared: true, authz: false, lists: false, opaque: false }) },
    { t: 'Opaque handles', home: true, say: 'Make handles opaque, so nobody can guess the next one.', act: m => m.set({ shared: true, authz: false, lists: false, opaque: true }) },
    { t: 'Check the caller', home: true, say: 'A handle is a name, not permission. Check the caller against it on every call.', act: m => m.set({ shared: true, authz: true, lists: false, opaque: true }) },
    { t: 'Stable lists', home: true, say: 'The tool list never changes per connection, so a second connection sees the same tools.', act: m => m.set({ shared: true, authz: true, lists: true, opaque: true }) },
  ],
  check: [
    { q: 'Where should a basket live across calls?', options: ['In a store every replica can reach, under a server-minted handle', 'In one replica\'s memory', 'In the session'], answer: 0, why: 'Any replica can then answer.', hint: 'Try Keep the basket in memory.' },
    { q: 'Bob passes Alice\'s basket handle. What should happen?', options: ['The server checks the caller and refuses', 'The call succeeds: he has the handle', 'The connection closes'], answer: 0, why: 'A handle is a name, not a capability.', hint: 'Try Trust whoever holds the handle.' },
    { q: 'May tools/list vary per connection?', options: ['No: only by the authorization on the request', 'Yes, freely', 'Only after initialize'], answer: 0, why: 'And not as a side effect of other calls.', hint: 'Try Change the tool list per connection.' },
  ],
  practice: [
    { q: 'What did 2026-07-28 remove to make statelessness the default?', options: ['initialize, notifications/initialized and Mcp-Session-Id', 'tools/list', 'JSON-RPC ids', '_meta'], answer: 0, why: 'No handshake, no session.' },
    { q: 'Why can a failed request be retried on any replica?', options: ['No request depends on one process\'s memory', 'Replicas share a session', 'The router is sticky', 'Retries are forbidden'], answer: 0, why: 'Statelessness makes retries routable.' },
    { q: 'How should an expired handle be reported?', options: ['As a tool execution error', 'As -32601', 'By closing the connection', 'Silently ignored'], answer: 0, why: 'The model can read it and recover.' },
    { q: 'Can a server infer a client\'s capabilities from an earlier request on the same connection?', options: ['No: each request declares its own', 'Yes', 'Only on stdio', 'Only on HTTP'], answer: 0, why: 'A transport is not a session.' },
    { q: 'An orchestrator and its subagent share a principal. Can the subagent reuse the orchestrator\'s cached tools/list?', options: ['Yes: lists do not vary by connection', 'No, never', 'Only after a handshake', 'Only on the same replica'], answer: 0, why: 'Lists vary only by authorization.' },
    { q: 'Where should a handle\'s lifetime be stated?', options: ['In the tool description', 'In a session header', 'Nowhere', 'In clientInfo'], answer: 0, why: 'The model needs to know.' },
  ],
  terms: [
    ['Stateless', 'Every request carries all it needs; none relies on earlier ones.'],
    ['Transport', 'A stdio process or HTTP connection; not a session.'],
    ['Handle', 'A server-minted, opaque identifier passed back as an argument.'],
    ['Shared store', 'State every replica can reach, keyed by handle.'],
    ['Sticky session', 'Routing a client to one server; unnecessary when stateless.'],
    ['Tool execution error', 'A result with isError true, such as an expired handle.'],
  ],
  deeper: '<p><b>Handles are application data.</b> To the wire, a handle is an ordinary string in a result and an argument; the protocol neither checks nor understands it.</p><p><b>About this machine.</b> The service and calls are invented.</p>',
  code: {
    title: 'A handle, checked on every call',
    note: 'Written for this lesson.',
    text: `
import secrets, time

def create_basket(caller):
    handle = "bsk_" + secrets.token_urlsafe(12)          # opaque, unguessable
    STORE[handle] = {"owner": caller.principal, "items": [], "expires": time.time() + 7200}
    return {"structuredContent": {"basket_id": handle}, "content": [{"type": "text", "text": handle}]}

def add_item(caller, basket_id, item):
    b = STORE.get(basket_id)                              # any replica can read the store
    if not b or b["expires"] < time.time():
        return {"isError": True, "content": [{"type": "text", "text": "basket expired; create a new one"}]}
    if b["owner"] != caller.principal:                    # a name is not a capability
        return {"isError": True, "content": [{"type": "text", "text": "not your basket"}]}
    b["items"].append(item)
    return {"content": [{"type": "text", "text": f"{len(b['items'])} items"}]}
`,
  },
};
