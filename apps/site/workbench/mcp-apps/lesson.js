// MCP Apps (the io.modelcontextprotocol/ui extension): a parcel service in Lusaka shows a delivery timeline the user can filter and act on, not just read.
// The tool declares its view in tools/list (_meta.ui.resourceUri: ui://parcels/timeline.html); the host fetches and reviews that resource before the call,
// renders it in a sandboxed iframe with an empty-by-default content security policy, and carries every privileged action across a postMessage bridge it controls.
// Eight things happen in one session. Settings: sandbox on/off, bridge pinned to the app's origin or open to any frame, consent kept in the host or delegated to the app,
// and a host that supports the UI extension or a text-only host (the server must fall back to plain content).
const EVENTS = [
  { k: 'list', t: 'tools/list: track_parcel declares ui://parcels/timeline.html' },
  { k: 'fetch', t: 'host fetches the view with resources/read, checks its CSP: connect only to api.parcels.example' },
  { k: 'call', t: 'tools/call track_parcel("ZM-4471") returns text plus structured stops' },
  { k: 'render', t: 'host renders the view in a sandboxed frame and passes it the stops' },
  { k: 'cookie', t: 'the view\'s script tries to read the host page\'s session cookie' },
  { k: 'ad', t: 'an ad frame on the same page posts {"method":"tools/call","name":"cancel_all_deliveries"} to the host' },
  { k: 'action', t: 'the view asks to reschedule delivery to Saturday' },
  { k: 'fallback', t: 'a text-only host asks for the same tool' },
];
function run(st) {
  const out = EVENTS.map(e => {
    if (e.k === 'render' && !st.ui) return { r: 'this host has no UI support: nothing to render', skip: true };
    if (!st.ui && ['cookie', 'ad', 'action'].includes(e.k)) return { r: 'no view on a text-only host, so nothing to box or bridge' };
    if (e.k === 'fallback') return st.fallback ? { r: 'the server leaves out the UI metadata: plain text "ZM-4471: in Kabwe, due in Lusaka Thursday"' } : { r: 'the result points only at a view this host can\'t show: the user sees nothing', bad: true };
    if (e.k === 'cookie') return st.sandbox ? { r: 'blocked: the sandboxed frame has its own origin and can\'t touch the host page' } : { r: 'read the session token and sent it to api.parcels.example', bad: true, harm: 'session stolen' };
    if (e.k === 'ad') return st.pin ? { r: 'ignored: the message didn\'t come from the view\'s origin' } : { r: 'the host ran cancel_all_deliveries for the ad frame', bad: true, harm: 'deliveries cancelled' };
    if (e.k === 'action') return st.consent ? { r: 'host shows its own dialog: "Reschedule ZM-4471 to Saturday?" · the user confirms · host calls the tool' } : { r: 'the view clicked "confirm" inside itself; the host trusted it and also booked a return trip the script added', bad: true, harm: 'action without consent' };
    return { r: 'ok' };
  });
  return { out, harms: out.filter(o => o.harm).map(o => o.harm), blank: out.some(o => o.bad && /sees nothing/.test(o.r)) };
}

export default {
  slug: 'mcp-apps',
  title: 'MCP Apps: an interactive view, safely boxed',
  description: 'A parcel service in Lusaka shows a delivery timeline people can act on, boxed inside the chat app, with every action crossing a bridge.',
  overview: 'Text can describe a delivery timeline; an app view lets people filter it and act on it. The MCP Apps extension adds that without changing the core protocol. A tool declares its view in tools/list as a ui:// resource, so the host can fetch, cache and review the HTML before any call asks to show it. The tool call returns ordinary content plus structured data, and the host binds that data into the view. The view runs in a sandboxed frame: it can\'t read the host page\'s cookies, storage or DOM, its content security policy starts empty and lists only the origins it needs (and any allowed origin is still a route out for data), and it asks for no camera or location unless a visible feature needs it. Everything privileged crosses a JSON-RPC bridge over postMessage, which the host pins to the view\'s exact origin. The host stays in charge: it shows its own confirmation for consequential actions, re-checks permission at the moment of the action, and can revoke capabilities while the view is open. And a server must still serve hosts without the extension, returning the same tool with plain content.',
  keywords: ['MCP Apps', 'MCP UI', 'sandboxed iframe', 'postMessage', 'content security policy', 'Model Context Protocol', 'agent UI'],
  orient: 'landscape',
  view: { target: [-0.5, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sandbox: true, pin: true, consent: true, ui: true, fallback: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the host: a tray with its own core (the dark box), its session key and a consent lamp */
    const HX = -0.9, host = P.box(3.4, 0.04, 2.2, '#FFFFFF', { r: 0.04 }); host.position.set(HX, 0, 0.05); S.add(host);
    const core = P.box(0.6, 0.45, 0.5, CHAR, { r: 0.05 }); core.position.set(HX + 1.15, 0.04, 0.6); S.add(core);
    const keyM = new THREE.MeshLambertMaterial({ color: SAF }), key = P.box(0.2, 0.1, 0.12, '#fff', { r: 0.03, material: keyM }); key.position.set(HX + 1.15, 0.5, 0.6); S.add(key);
    const consent = P.lamp(GOOD, { h: 0.45, r: 0.09 }); consent.position.set(HX + 1.6, 0.04, 0.6); S.add(consent);
    /* the app's view: a parcel route (four stops, a truck) inside a glass sandbox; a text-only host shows a flat slip instead */
    const VX = HX - 0.55, VZ = -0.35;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 1.0), new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.3, depthWrite: false })); glass.position.set(VX, 0.29, VZ); S.add(glass);
    const viewBase = P.box(1.85, 0.04, 0.95, '#E5F4EA', { r: 0.03 }); viewBase.position.set(VX, 0.04, VZ); S.add(viewBase);
    const stops = [0, 1, 2, 3].map(i => { const d = P.cyl(0.07, 0.14, i < 3 ? GOOD : '#C9C6BD'); d.position.set(VX - 0.7 + i * 0.47, 0.08, VZ); S.add(d); return d; });
    const road = P.box(1.45, 0.02, 0.06, '#6B6E7E', { r: 0 }); road.position.set(VX, 0.08, VZ + 0.18); S.add(road);
    const truck = P.box(0.18, 0.12, 0.12, '#C97B2E', { r: 0.03 }); truck.userData.noFit = true; S.add(truck);
    const slipM = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), slip = P.box(1.5, 0.04, 0.6, '#fff', { r: 0.02, material: slipM }); slip.position.set(VX, 0.05, VZ); S.add(slip);
    /* an ad frame from elsewhere, and the bridge from the view to the host core with an origin gate at the host end */
    const adBox = P.box(0.6, 0.35, 0.55, '#E07A5F', { r: 0.04 }); adBox.position.set(HX + 0.95, 0.04, -0.45); S.add(adBox);
    const pipe = P.box(1.85, 0.06, 0.08, '#8E8C84', { r: 0.02 }); pipe.position.set(HX - 0.1, 0.1, 0.6); S.add(pipe);
    const gateM = new THREE.MeshLambertMaterial({ color: GOOD }), gate = P.box(0.06, 0.35, 0.35, '#fff', { r: 0.02, material: gateM }); gate.position.set(HX + 0.8, 0.04, 0.6); S.add(gate);
    const ball = P.ball(0.07, RED, { material: new THREE.MeshLambertMaterial({ color: RED }) }); ball.userData.noFit = true; S.add(ball);
    const harmTw = P.tower(0.5, 0.5, RED, { size: 0.28 }); harmTw.position.set(1.4, 0, 0.0); S.add(harmTw);
    S.add(P.keep(-2.65, 1.7, 1.2, -1.05, 1.15));

    let R = null, k = 0, clock = 0;
    function draw() {
      R = run(st); k = 0; clock = 0;
      const vis = st.ui;
      glass.visible = vis && st.sandbox; viewBase.visible = road.visible = truck.visible = vis; stops.forEach(d => { d.visible = vis; });
      slip.visible = !vis; slipM.color.set(st.fallback ? '#FFFFFF' : RED);
      viewBase.material.color.set(st.sandbox ? '#E5F4EA' : '#F6D9D0');
      keyM.color.set(R.harms.includes('session stolen') ? RED : SAF);
      gateM.color.set(st.pin ? GOOD : RED); gate.visible = !!st.pin;
      consent.userData.set({ color: st.consent ? GOOD : RED, on: true });
      harmTw.userData.set({ h: 0.05 + R.harms.length / 3 * 1.0, cap: `${R.harms.length}`, color: R.harms.length ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      harmTw.userData.tick(dt); clock += dt;
      const u = (clock % 4) / 4; truck.position.set(VX - 0.7 + Math.min(1, u * 1.4) * 0.94, 0.1, VZ + 0.18);
      /* the ad's message: stopped at the gate when the bridge is pinned, into the host core when not */
      const v = (clock % 3) / 3, endX = st.pin ? HX + 0.72 : HX + 1.1;
      ball.position.set(HX + 0.95 + (endX - HX - 0.95) * v, 0.45 - 0.25 * v, -0.45 + (0.6 + 0.45) * v); ball.visible = st.ui;
    };
    const controls = [
      { type: 'buttons', label: 'Host', options: ['Shows app views', 'Text only'], get: () => st.ui ? 0 : 1, act: i => set({ ui: i === 0 }) },
      { type: 'toggle', label: 'Sandbox the view', short: 'Sandbox', get: () => st.sandbox, set: v => set({ sandbox: !!v }) },
      { type: 'toggle', label: 'Pin the bridge to the view\'s origin', short: 'Pin origin', get: () => st.pin, set: v => set({ pin: !!v }) },
      { type: 'toggle', label: 'Host asks the user before actions', short: 'Host consent', get: () => st.consent, set: v => set({ consent: !!v }) },
      { type: 'toggle', label: 'Plain-text fallback', short: 'Fallback', get: () => st.fallback, set: v => set({ fallback: !!v }), quick: false },
      { type: 'button', label: 'Run the session again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.harms.length}`, sub: R.harms.join(', ') || 'none', bad: R.harms.length > 0, good: !R.harms.length }) },
      { label: 'Text-only host', get: () => ({ v: st.fallback ? 'served' : 'blank', sub: 'same tool, plain content', bad: !st.fallback }) },
      { label: 'View origin', get: () => ({ v: 'ui://', sub: 'declared before the call' }) },
    ];
    const labels = [
      { name: 'view', t: 'The boxed view', d: 'A parcel route from Ndola to Lusaka, inside a glass sandbox; a text-only host gets a plain slip instead', icon: 'eye', atV: V(VX - 0.97, 0.3, VZ) },
      { name: 'bridge', t: 'The bridge', d: 'The view talks to the host core only through the pipe; the gate takes messages from the view\'s origin only', icon: 'link', atV: V(HX - 1.05, 0.12, 0.6) },
      { name: 'harm', t: 'Harms', d: 'The red ball is the ad frame\'s message; the gold key is the host\'s session, the lamp its own consent dialog', icon: 'stop', atV: V(1.65, 0.3, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No sandbox', hint: 'the view runs with the host\'s rights', on: () => set({ ...D0, sandbox: false }), off: reset },
      { label: 'Any frame may talk', hint: 'bridge not pinned to an origin', on: () => set({ ...D0, pin: false }), off: reset },
      { label: 'The view approves itself', hint: 'consent delegated to the app', on: () => set({ ...D0, consent: false }), off: reset },
    ];
    function status() {
      if (!st.sandbox) return { ok: false, msg: '<b>No sandbox: the view\'s script read the host page\'s session cookie and sent it out through the one domain its policy allowed.</b> Run every view in a sandboxed frame with its own origin, so it can\'t touch the host\'s cookies, storage or page. And remember: every allowed domain is a route for data to leave.' };
      if (!st.pin) return { ok: false, msg: '<b>The bridge took a message from an ad frame and cancelled every delivery.</b> postMessage accepts messages from any frame on the page unless you check. Pin the bridge to the view\'s exact origin and source, and ignore everything else.' };
      if (!st.consent) return { ok: false, msg: '<b>The view said the user had confirmed, and the host believed it: the reschedule went through, plus a return trip the script slipped in.</b> A view can draw any button it likes. Consequential actions need the host\'s own dialog, showing exactly what will happen, with permission checked at that moment.' };
      if (!st.fallback && !st.ui) return { ok: false, msg: '<b>A text-only host got a result that only pointed at a view, so the user saw nothing.</b> Fallback is part of the contract: for hosts without the UI extension, return the same tool without UI metadata and with useful plain content.' };
      return { ok: true, msg: `<b>${st.ui ? 'The view showed the timeline, and nothing escaped it.' : 'The text-only host got plain text from the same tool.'}</b> ${st.ui ? 'The host reviewed the declared view before the call, ran it sandboxed, ignored the ad frame\'s message, and asked the user itself before rescheduling.' : 'Apps are optional: the same tool serves hosts with and without them.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A view, not just text', home: true, say: 'A parcel service in Lusaka shows a delivery timeline the user can act on. The tool declares its view in advance, so the host can fetch and review it before the call.', act: m => m.set({ sandbox: true, pin: true, consent: true, ui: true, fallback: true }) },
    { t: 'Data in, inside a box', home: true, say: 'The tool returns ordinary content plus data; the host renders the view in a sandboxed frame and passes the data in. The view can\'t reach the host\'s page.', act: m => m.set({ sandbox: true }) },
    { t: 'Without the box', home: true, say: 'Drop the sandbox, and the view\'s script reads the host\'s session cookie and sends it out.', act: m => m.set({ sandbox: false }) },
    { t: 'Who is talking?', home: true, say: 'Every action crosses a message bridge. If the host accepts messages from any frame, an ad on the page can ask it to cancel every delivery.', act: m => m.set({ sandbox: true, pin: false }) },
    { t: 'The host asks', home: true, say: 'For anything with consequences, the host shows its own dialog. A view that confirms itself can slip in actions the user never saw.', act: m => m.set({ pin: true, consent: false }) },
    { t: 'Text still works', home: true, say: 'A host without app support gets the same tool with plain text. Views are an extra, never the only answer.', act: m => m.set({ consent: true, ui: false }) },
  ],
  check: [
    { q: 'Why does a tool declare its view before it is called?', options: ['So the host can fetch, cache and review it first', 'To make the call faster', 'Views must be secret'], answer: 0, why: 'Review happens before anything renders.', hint: 'Watch the first two steps.' },
    { q: 'Why pin the bridge to the view\'s exact origin?', options: ['Other frames on the page can post messages too', 'For speed', 'postMessage needs it'], answer: 0, why: 'Ignore every message not from the view.', hint: 'Try Any frame may talk.' },
    { q: 'Who should confirm a consequential action?', options: ['The host, with its own dialog', 'The view', 'Nobody'], answer: 0, why: 'A view can draw any button.', hint: 'Try The view approves itself.' },
  ],
  terms: [
    ['MCP Apps', 'An extension that lets tools come with interactive views.'],
    ['ui:// resource', 'The address of a view\'s HTML, declared on the tool.'],
    ['Sandboxed iframe', 'A frame with its own origin and limited rights, separate from the host page.'],
    ['Content security policy', 'The list of places a view may load from or connect to.'],
    ['postMessage bridge', 'The message channel between the view and the host.'],
    ['Fallback', 'Plain content for hosts that can\'t show views.'],
  ],
  deeper: '<p><b>Cache views like code.</b> A cached view can run code, so key it by its ui:// address, the server and its version, a digest of the content and the user\'s context, and refetch and re-review it when any of those change.</p><p><b>Host context.</b> Theme, size and accessibility settings come from the host and can change while the view is open; the host caps the frame\'s size so a view can\'t cover other parts of the page.</p><p><b>Revocation.</b> Permissions can change mid-session; check at the moment of each action, and reject pending actions when access is revoked.</p><p><b>About this machine.</b> The eight steps follow the rules in the file header, shortened.</p>',
  code: {
    title: 'A pinned bridge and the host\'s own consent',
    note: 'Adapted from the course\'s MCP Apps lesson.',
    text: `
// host side
const VIEW_ORIGIN = new URL(viewUrl).origin;
window.addEventListener("message", async (e) => {
  if (e.origin !== VIEW_ORIGIN || e.source !== frame.contentWindow) return;   // pinned
  const msg = e.data;
  if (msg.method !== "tools/call" || !allowedFromView.has(msg.params.name)) return;
  if (isConsequential(msg.params.name)) {
    const ok = await hostConfirm(describe(msg.params));      // the host's own dialog
    if (!ok) return reply(e, msg.id, { error: { code: -32001, message: "Declined" } });
  }
  reply(e, msg.id, await mcp.callTool(msg.params));
});
`,
  },
};
