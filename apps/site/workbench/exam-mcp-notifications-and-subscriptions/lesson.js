// Exam prep, MCP notifications and subscriptions: an invented CI service in Lagos keeps two subscriptions/listen streams open (id 7 for tools and
// config.yaml, id 9 for resources) while a run_build call (id 12) reports progress. The first message on each stream is
// notifications/subscriptions/acknowledged with the honoured subset; every stream message carries _meta subscriptionId equal to the listen
// request's id; progress belongs only on run_build's own response stream. Cancellation is transport-specific; a graceful end is a complete
// result; a restarted stdio server needs new listen requests. Illustrative.
const EVENTS = [
  { n: 'listen id 7 {toolsListChanged, resourceSubscriptions [config.yaml]}', on: 'stream 7', k: 'open' },
  { n: 'notifications/subscriptions/acknowledged', on: 'stream 7', k: 'ack' },
  { n: 'listen id 9 {resourcesListChanged}', on: 'stream 9', k: 'open' },
  { n: 'notifications/resources/updated {uri: config.yaml}', on: 'stream 7', k: 'tag' },
  { n: 'notifications/progress {token, progress 40, total 100}', on: 'run_build #12', k: 'progress' },
  { n: 'notifications/prompts/list_changed', on: 'stream 7', k: 'unasked' },
  { n: 'cancel run_build', on: 'transport', k: 'cancel' },
];

function run(o) {
  const rows = EVENTS.map(e => {
    if (e.k === 'ack') return { e, txt: o.ack ? 'first message · honours {toolsListChanged, config.yaml} · subscriptionId 7' : 'skipped: client cannot tell what was granted', ok: o.ack };
    if (e.k === 'tag') return { e, txt: o.tag ? '_meta subscriptionId 7 → routed to stream 7' : 'no subscriptionId: which stream?', ok: o.tag };
    if (e.k === 'progress') return o.scope ? { e, txt: 'on run_build\'s own response stream, no subscriptionId', ok: true } : { e, txt: 'sent on listen stream 7 instead', ok: false };
    if (e.k === 'unasked') return o.filter ? { e, txt: 'not sent: never requested', ok: true } : { e, txt: 'sent though stream 7 never asked for it', ok: false };
    if (e.k === 'cancel') return { e, txt: `${o.stdio ? 'stdio: notifications/cancelled {requestId 12}' : 'HTTP: close run_build\'s SSE stream (no message)'} · late reply ignored`, ok: true };
    return { e, txt: e.k === 'open' ? 'stays open as a long-lived request' : '', ok: true };
  });
  const bad = rows.filter(r => !r.ok).length;
  return { rows, bad, ok: bad === 0 };
}

export default {
  slug: 'exam-mcp-notifications-and-subscriptions',
  title: 'Exam prep, MCP: notifications, subscriptions and cancellation',
  description: 'A CI client keeps two subscription streams open while a build reports progress. Route every message to its own lane, and send nothing that was not asked for.',
  overview: 'A notification is the JSON-RPC shape with no id; nobody replies to it. MCP gives notifications two homes. Request-scoped notifications, notifications/progress and notifications/message (deprecated logging), flow only on the response stream of the request they relate to, while it is open, and never on a listen stream. Everything else uses a long-lived stream opened with subscriptions/listen. Its params.notifications field is a filter: toolsListChanged, promptsListChanged and resourcesListChanged are booleans and resourceSubscriptions is a list of URIs; a server must never send a type the client did not ask for and may grant less than requested. The first message on the stream must be notifications/subscriptions/acknowledged, echoing the subset the server will honour, and every message on the stream carries _meta["io.modelcontextprotocol/subscriptionId"] equal to the JSON-RPC id of the listen request, which is how a client with several streams routes them. After the acknowledgement, the stream carries notifications/tools/list_changed, prompts/list_changed, resources/list_changed and resources/updated (with the uri). Progress works by opt-in: the client puts a progressToken in _meta, and notifications/progress carries that token, a strictly increasing progress, optional total and message, and stops when the request completes. Cancellation is transport-specific: on Streamable HTTP, closing the request\'s SSE response stream is the cancellation, with no message; on stdio, the client sends notifications/cancelled with the requestId and an optional reason. A server sends notifications/cancelled only to tear down a listen stream; a graceful end is a complete result to the listen request with the subscription id in _meta. Late responses to cancelled requests are ignored. Every request needs a timeout with a hard maximum even while progress arrives. After a stdio restart, the client resends subscriptions/listen with new ids; nothing resumes. The service is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'subscriptions/listen', 'notifications', 'progress', 'cancellation', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { ack: true, tag: true, scope: true, filter: true, stdio: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const COL = ['#5B8DB8', '#7B6FA8', GOOD];
    /* the server sends along three lanes to the client: two streams and one request's own response */
    const server = P.box(0.5, 0.5, 1.5, '#6B6E7E', { r: 0.05 }); server.position.set(-2.45, 0, -0.45); S.add(server);
    const client = P.robot('#3D6BD6', { scale: 0.62 }); client.position.set(1.4, 0, -0.45); S.add(client);
    const lanes = [-0.95, -0.45, 0.05].map(z => { const b = P.belt(V(-2.15, 0, z), V(1.0, 0, z), { w: 0.3, speed: 1.0 }); S.add(b); return b; });
    /* seven events as lamps */
    const rows = EVENTS.map((e, i) => { const l = P.lamp(GOOD, { h: 0.1, r: 0.085 }); l.position.set(-1.6 + i * 0.42, 0, 0.55); S.add(l); return l; });
    S.add(P.keep(-2.75, 1.65, 0.75, -1.25, 0.75));
    let clock = 0, next = 0;
    const laneOf = r => r.e.k === 'progress' ? (st.scope ? 2 : 0) : r.e.on === 'stream 9' ? 1 : r.e.k === 'cancel' ? 2 : 0;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => rows[i].userData.set({ color: r.ok ? COL[laneOf(r)] : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Acknowledge each stream first', short: 'Acknowledge', get: () => st.ack, set: v => set({ ack: !!v }) },
      { type: 'toggle', label: 'Tag stream messages with subscriptionId', short: 'Tag', get: () => st.tag, set: v => set({ tag: !!v }) },
      { type: 'toggle', label: 'Progress only on its own request', short: 'Request-scoped', get: () => st.scope, set: v => set({ scope: !!v }) },
      { type: 'toggle', label: 'Send only requested types', short: 'Filter', get: () => st.filter, set: v => set({ filter: !!v }) },
      { type: 'buttons', label: 'Transport', options: ['Streamable HTTP', 'stdio'], get: () => (st.stdio ? 1 : 0), act: i => set({ stdio: !!i }) },
    ];
    const readouts = [
      { label: 'Misrouted', get: () => ({ v: String(R.bad), sub: 'of 7 events', good: R.ok, bad: !R.ok }) },
      { label: 'Cancel by', get: () => ({ v: st.stdio ? 'notifications/cancelled' : 'closing the stream', sub: st.stdio ? 'stdio' : 'Streamable HTTP' }) },
    ];
    const labels = [
      { name: 's', t: 'Three lanes', d: 'Two streams, one request', icon: 'link', atV: V(-2.72, 0.3, -0.45) },
      { name: 't', t: 'Seven events', d: 'Lane colour, or red if misrouted', icon: 'check', atV: V(1.02, 0.2, 0.55) },
    ];
    const reset = () => set({ ...D0, stdio: st.stdio });
    const breaks = [
      { label: 'Skip the acknowledgement', hint: 'what was granted?', on: () => set({ ...D0, ack: false }), off: reset },
      { label: 'Put progress on a listen stream', hint: 'progress belongs to its request', on: () => set({ ...D0, scope: false }), off: reset },
      { label: 'Send a type nobody asked for', hint: 'the filter is a contract', on: () => set({ ...D0, filter: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Each stream starts with an acknowledgement, every stream message carries its listen request\'s id, the unrequested prompts change is never sent, and run_build\'s progress stays on its own response stream.</b> To cancel the build, ${st.stdio ? 'the client sends notifications/cancelled with requestId 12' : 'the client closes that request\'s SSE stream, with no message'}; a late reply is ignored.` };
      const f = [];
      if (!st.ack) f.push('the stream skipped notifications/subscriptions/acknowledged, so the client cannot tell which of its requested types were granted');
      if (!st.tag) f.push('a resources/updated message had no subscriptionId, so a client with two streams cannot route it');
      if (!st.scope) f.push('the run_build call\'s progress went out on listen stream 7; progress and log messages belong only on their own request\'s response stream');
      if (!st.filter) f.push('a prompts/list_changed notification was sent on a stream that never asked for it');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt;
      if (clock > 0.7) { clock = 0; const r = R.rows[next]; next = (next + 1) % R.rows.length; if (!(r.e.k === 'unasked' && st.filter)) lanes[laneOf(r)].userData.send(r.ok ? COL[laneOf(r)] : BAD, { size: 0.16 }); }
      lanes.forEach(b => b.userData.tick(dt)); client.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A listen stream', home: true, say: 'The client opens a subscription stream with a filter: tool list changes and one config file.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: false }) },
    { t: 'Acknowledged first', home: true, say: 'The first message says which requested types the server will honour.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: false }) },
    { t: 'Tagged by id', home: true, say: 'Every stream message carries the listen request\'s id, so two streams never get confused.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: false }) },
    { t: 'Progress has a home', home: true, say: 'The build\'s progress travels on the build request\'s own response stream, not a listen stream.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: false }) },
    { t: 'Cancel on HTTP', home: true, say: 'On HTTP, closing the request\'s stream is the cancellation. No message is sent.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: false }) },
    { t: 'Cancel on stdio', home: true, say: 'On stdio, the client sends a cancelled notification naming the request id.', act: m => m.set({ ack: true, tag: true, scope: true, filter: true, stdio: true }) },
  ],
  check: [
    { q: 'What is the first message on a subscriptions/listen stream?', options: ['notifications/subscriptions/acknowledged', 'notifications/tools/list_changed', 'A ping'], answer: 0, why: 'It echoes the honoured subset.', hint: 'Try Skip the acknowledgement.' },
    { q: 'Where does notifications/progress travel?', options: ['On the response stream of its own request', 'On a listen stream', 'On any stream'], answer: 0, why: 'Request-scoped notifications stay with their request.', hint: 'Try Put progress on a listen stream.' },
    { q: 'How is a request cancelled on Streamable HTTP?', options: ['By closing that request\'s SSE stream', 'By notifications/cancelled', 'By a DELETE'], answer: 0, why: 'stdio uses notifications/cancelled.', hint: 'Press the Transport buttons.' },
  ],
  practice: [
    { q: 'What value does _meta subscriptionId carry?', options: ['The JSON-RPC id of the subscriptions/listen request', 'A random session id', 'The server name', 'The progress token'], answer: 0, why: 'That is how streams are demultiplexed.' },
    { q: 'How does a server end a subscription gracefully?', options: ['A complete result to the listen request, with the subscription id', 'notifications/cancelled', 'Closing silently', 'An error'], answer: 0, why: 'notifications/cancelled is for tearing a stream down.' },
    { q: 'A stdio server restarts. What happens to subscriptions?', options: ['The client resends subscriptions/listen with new ids', 'They resume automatically', 'They replay missed events', 'Nothing is needed'], answer: 0, why: 'No session, nothing resumes.' },
    { q: 'How does a request opt into progress?', options: ['progressToken in its _meta', 'A listen filter', 'A header', 'It always gets progress'], answer: 0, why: 'progress must strictly increase.' },
    { q: 'A response arrives for a request the client cancelled. What should the client do?', options: ['Ignore it', 'Treat it as an error', 'Retry', 'Crash'], answer: 0, why: 'Races are normal.' },
    { q: 'Progress keeps arriving after a request\'s hard timeout. What then?', options: ['The timeout still applies', 'Extend forever', 'Restart the server', 'Ignore the timeout'], answer: 0, why: 'Progress proves work, not completion.' },
  ],
  terms: [
    ['Notification', 'A message with no id; never replied to.'],
    ['subscriptions/listen', 'A long-lived stream with a notification filter.'],
    ['Acknowledgement', 'The first stream message, echoing the honoured subset.'],
    ['subscriptionId', 'The listen request\'s id, carried on every stream message.'],
    ['progressToken', 'A _meta key that opts a request into progress notifications.'],
    ['notifications/cancelled', 'stdio cancellation, or a server tearing down a stream.'],
  ],
  deeper: '<p><b>Removed in 2026-07-28.</b> resources/subscribe and resources/unsubscribe, the standalone GET stream and Last-Event-ID resumption.</p><p><b>About this machine.</b> The CI service and ids are invented.</p>',
  code: {
    title: 'Route stream messages by subscription id',
    note: 'Written for this lesson.',
    text: `
def on_message(msg):
    sid = msg.get("params", {}).get("_meta", {}).get("io.modelcontextprotocol/subscriptionId")
    if sid is not None:
        stream = STREAMS[sid]                         # sid == id of the listen request
        if msg["method"] == "notifications/subscriptions/acknowledged":
            stream.granted = msg["params"]["notifications"]
        else:
            stream.handle(msg)
    elif msg.get("method") == "notifications/progress":
        PENDING[msg["params"]["progressToken"]].progress(msg["params"])   # own response stream

def cancel(request_id, transport):
    if transport == "stdio":
        send({"jsonrpc": "2.0", "method": "notifications/cancelled",
              "params": {"requestId": request_id, "reason": "user stopped the build"}})
    else:
        RESPONSE_STREAMS[request_id].close()          # HTTP: closing is the cancellation
`,
  },
};
