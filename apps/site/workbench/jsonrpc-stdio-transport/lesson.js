// JSON-RPC over stdio (phase 19, lesson 22): one line, one message. A pipe carries a Maputo port's tool server traffic. A real line parser runs below, sorting each line into request, notification, response or error, with the standard codes.
// A stray print to stdout breaks the frame; logs must go to stderr. Ids pair replies with calls, in any order.
const LINES = {
  clean: ['{"jsonrpc":"2.0","id":1,"method":"tools/list"}', '{"jsonrpc":"2.0","method":"notifications/progress"}', '{"jsonrpc":"2.0","id":2,"method":"tools/call"}'],
  print: ['{"jsonrpc":"2.0","id":1,"method":"tools/list"}', 'Loading model...', '{"jsonrpc":"2.0","id":2,"method":"tools/call"}'],
  bad: ['{"jsonrpc":"2.0","id":1,"method":"tools/list"}', '{"jsonrpc":"2.0","id":2,"method":"no/such"}', '{"id":3}'],
};
const KNOWN = ['tools/list', 'tools/call', 'notifications/progress'];
function classify(l) {
  let m; try { m = JSON.parse(l); } catch (e) { return { kind: 'parse', code: -32700 }; }
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return { kind: 'invalid', code: -32600 };
  if (!KNOWN.includes(m.method)) return { kind: 'unknown', code: -32601 };
  return { kind: m.id == null ? 'note' : 'req', id: m.id };
}
function run(o) {
  const res = LINES[o.feed].map(classify);
  const stop = !o.keep && res.some(r => r.kind === 'parse');
  const replies = res.filter(r => r.kind === 'req').length, errs = res.filter(r => r.code).length;
  return { res, stop, replies, errs };
}

export default {
  slug: 'jsonrpc-stdio-transport',
  title: 'JSON-RPC over stdio: one line, one message',
  description: 'Tool servers talk down a pipe, one JSON line at a time. A real parser sorts each line, and one stray print breaks it.',
  overview: 'Local tool servers usually speak JSON-RPC 2.0 over standard input and output, with each message on its own line. It is simple, and strict. A request has an id, and it gets a reply with that id, in any order. A notification has no id, and no reply. Errors use standard codes: parse error, invalid request, method not found, invalid params, internal error. The classic bug is one stray print to stdout, as that text lands in the protocol stream. Logs go to stderr. And one bad line shouldn\'t bring down the server. This lesson runs a real line parser for a port\'s tool server in Maputo.',
  keywords: ['JSON-RPC', 'stdio', 'MCP transport', 'protocol', 'error codes', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { feed: 'clean', keep: true, stderr: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0), V(0.3, 0, 0), { w: 0.4, speed: 0.9 }));
    const srv = add(P.robot(SAF, { scale: 0.9 })); srv.position.set(0.7, 0.03, 0);
    const BX = i => 1.3 + i * 0.36, COLS = [GOOD, BLUE, BAD];
    const bins = [0, 1, 2].map(i => { const t = add(P.tower(0.3, 0.5, COLS[i])); t.position.set(BX(i), 0.03, 0); t.userData.set({ cap: '' }); return t; });
    const log = add(P.stack(0.5, 0.4, 0.08, { max: 6, color: '#8E91A3' })); log.position.set(-1.3, 0.03, -0.55);
    S.add(P.keep(-2.45, 2.45, 0.9, -0.75, 0.72));
    let R = null, u = 0, i = 0;
    function draw() {
      R = run(st);
      bins[0].userData.set({ h: Math.max(0.04, R.replies * 0.25) });
      bins[1].userData.set({ h: Math.max(0.04, R.res.filter(r => r.kind === 'note').length * 0.25) });
      bins[2].userData.set({ h: Math.max(0.04, R.errs * 0.25) });
      log.userData.set({ n: st.stderr ? 3 : 0, colors: Array(6).fill('#8E91A3') });
      srv.userData.set({ busy: !R.stop, lamp: R.stop ? '#D9483B' : '#3E9B5F' });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['clean', 'print', 'bad'];
    const controls = [
      { type: 'buttons', label: 'On the pipe', options: ['Clean lines', 'A stray print', 'Bad requests'], get: () => FK.indexOf(st.feed), act: i2 => set({ feed: FK[i2] }) },
      { type: 'toggle', label: 'Keep serving after a bad line', short: 'Keep serving', get: () => st.keep, set: v => set({ keep: !!v }) },
      { type: 'toggle', label: 'Logs go to stderr', short: 'stderr', get: () => st.stderr, set: v => set({ stderr: !!v }) },
    ];
    const readouts = [
      { label: 'Lines parsed', get: () => ({ v: R.res.map(r => r.kind).join(', '), sub: 'in order' }) },
      { label: 'Error codes', get: () => ({ v: R.res.filter(r => r.code).map(r => r.code).join(', ') || 'none', sub: 'standard', good: !R.errs }) },
      { label: 'Server', get: () => ({ v: R.stop ? 'down' : 'serving', sub: `${R.replies} replies due`, good: !R.stop, bad: R.stop }) },
    ];
    const labels = [
      { name: 'p', t: 'One line per message', d: 'A pipe, not a socket', icon: 'link', atV: V(-2.3, 0.1, 0.05) },
      { name: 'b', t: 'Replies, notes, errors', d: 'Sorted by shape', icon: 'target', atV: V(BX(2) + 0.16, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A print statement in a tool', hint: 'it lands in the stream', on: () => set({ ...D0, feed: 'print', stderr: false }), off: reset },
      { label: 'Crash on a bad line', hint: 'one line ends it all', on: () => set({ ...D0, feed: 'print', keep: false }), off: reset },
      { label: 'Call a method that doesn\'t exist', hint: 'send the right code', on: () => set({ ...D0, feed: 'bad' }), off: reset },
    ];
    function status() {
      if (R.stop) return { ok: false, msg: '<b>One line of text, and the server fell over.</b> Reply with a parse error (-32700) and read the next line. A server that dies on input can be stopped by anything.' };
      if (st.feed === 'print') return { ok: false, msg: '<b>"Loading model..." landed in the protocol stream.</b> The client expected JSON and got English. Stdout belongs to the protocol. Log to stderr.' };
      if (st.feed === 'bad') return { ok: true, msg: `<b>Errors ${R.res.filter(r => r.code).map(r => r.code).join(' and ')}.</b> Method not found and invalid request have their own codes, so clients can react properly.` };
      return { ok: true, msg: `<b>${R.replies} requests, each with an id, and one notification with no reply.</b> Replies can come back in any order. The id pairs them.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 1 && b.userData.count() < 3) { u = 0; const r = R.res[i++ % R.res.length]; b.userData.send(r.kind === 'req' ? GOOD : r.kind === 'note' ? BLUE : BAD, { size: 0.18 }); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Down a pipe', home: true, say: 'A port in Maputo runs a local tool server. Client and server talk down a pipe, one JSON line at a time.', act: m => m.set({ feed: 'clean', keep: true, stderr: true }) },
    { t: 'Requests and notes', home: true, say: 'A request has an id, and wants a reply. A notification has none, and gets none.', act: m => m.set({ feed: 'clean', keep: true, stderr: true }) },
    { t: 'A stray print', home: true, say: 'A tool prints a friendly message. It lands in the stream, and the client chokes.', act: m => m.set({ feed: 'print', keep: true, stderr: false }) },
    { t: 'Stderr', home: true, say: 'Stdout belongs to the protocol. Logs go to stderr.', act: m => m.set({ feed: 'clean', keep: true, stderr: true }) },
    { t: 'Standard errors', home: true, say: 'Unknown method, invalid request: each has its own code, so clients can react.', act: m => m.set({ feed: 'bad', keep: true, stderr: true }) },
    { t: 'Keep serving', home: true, say: 'A bad line gets an error reply, and the server reads the next one.', act: m => m.set({ feed: 'print', keep: true, stderr: true }) },
  ],
  check: [
    { q: 'What separates messages on stdio here?', options: ['A newline', 'A length header', 'A comma'], answer: 0, why: 'One line, one message.', hint: 'See Down a pipe.' },
    { q: 'What marks a notification?', options: ['It has no id', 'It has a high id', 'It is short'], answer: 0, why: 'No id, no reply.', hint: 'See Requests and notes.' },
    { q: 'Where do logs go?', options: ['stderr', 'stdout', 'The prompt'], answer: 0, why: 'Stdout belongs to the protocol.', hint: 'Try A print statement in a tool.' },
  ],
  terms: [['JSON-RPC', 'A small request and reply protocol.'], ['stdio', 'A program\'s standard input and output.'], ['Notification', 'A message with no id.'], ['-32700', 'The parse error code.'], ['-32601', 'Method not found.']],
  deeper: '<p><b>Batches.</b> A line can hold an array of messages, which servers should handle or reject clearly.</p><p><b>Order.</b> With ids, replies may overtake each other.</p><p><b>This parser</b> is real, and classifies the lines shown.</p>',
  code: {
    title: 'The read loop',
    note: 'Adapted from the course\'s transport (code/main.py).',
    text: `
for line in sys.stdin:
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        reply_error(None, -32700, "Parse error")
        continue
    if "id" in msg:
        reply(msg["id"], handle(msg))
    else:
        handle(msg)                              # notification, no reply
`,
  },
};
