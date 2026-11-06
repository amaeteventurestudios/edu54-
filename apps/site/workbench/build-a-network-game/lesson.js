// Build your own networked chat and game: an invented school club in Accra runs a chat over TCP and a two-player pong game. TCP delivers a
// reliable, ordered stream of bytes, not messages, so chat lines need a length prefix to be told apart. Pong sends the ball's position sixty
// times a second; over UDP a lost packet is simply skipped and a sequence number drops late arrivals, while over TCP one lost packet holds
// back every later one until it is resent. Byte chunks, losses and reorderings are fixed pseudo-random draws; every outcome is computed.
const MSGS = ['hi all', 'match at 4?', 'yes', 'bring the ball'];
const CHUNKS = [5, 9, 3, 6, 11, 4, 8];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function chat(o) {
  const stream = o.frame ? MSGS.map(m => `${String(m.length).padStart(2, '0')}${m}`).join('') : MSGS.join('');
  const reads = []; let i = 0, k = 0;
  while (i < stream.length) { const n = CHUNKS[k++ % CHUNKS.length]; reads.push(stream.slice(i, i + n)); i += n; }
  let got;
  if (o.frame) { got = []; let buf = reads.join(''); while (buf.length >= 2) { const n = +buf.slice(0, 2); if (buf.length < 2 + n) break; got.push(buf.slice(2, 2 + n)); buf = buf.slice(2 + n); } }
  else got = reads;
  const intact = got.filter((g, j) => g === MSGS[j]).length;
  return { reads, got, intact };
}
function game(o) {
  const N = 60, FRAME = 1000 / 60, RTO = 200;
  const lost = Array.from({ length: N }, (_, i) => rnd(i + 3) < o.loss);
  const late = Array.from({ length: N }, (_, i) => !lost[i] && rnd(i + 91) < 0.08);
  let shown = -1, back = 0, maxStall = 0, stall = 0, gaps = 0;
  if (o.mode === 'tcp') {
    let delay = 0;
    for (let i = 0; i < N; i++) { if (lost[i]) delay += RTO; maxStall = Math.max(maxStall, lost[i] ? RTO + FRAME : FRAME); }
    stall = maxStall; back = 0; gaps = 0;
    return { lost: lost.filter(Boolean).length, maxStall: Math.round(maxStall), back, gaps, total: N, delay };
  }
  const arrivals = [];
  for (let i = 0; i < N; i++) if (!lost[i]) arrivals.push({ seq: i, at: i * FRAME + (late[i] ? 2.4 * FRAME : 0) });
  arrivals.sort((a, b) => a.at - b.at);
  let lastAt = 0;
  arrivals.forEach(a => {
    if (o.seq && a.seq <= shown) return;
    if (a.seq < shown) back++;
    maxStall = Math.max(maxStall, a.at - lastAt); lastAt = a.at;
    if (a.seq > shown + 1) gaps++;
    shown = a.seq;
  });
  return { lost: lost.filter(Boolean).length, maxStall: Math.round(maxStall), back, gaps, total: N };
}

export default {
  slug: 'build-a-network-game',
  title: 'Build your own networked chat and game',
  description: 'A school club in Accra runs a chat and a pong game over the network. Frame the chat stream, send the ball by UDP, drop late packets.',
  overview: 'Two transport protocols carry almost everything on the internet, and a small chat server and pong game, as in the C# networking tutorials, show when to use which. TCP gives each side a connection that delivers a reliable, ordered stream of bytes: whatever is lost is resent, and everything arrives in order. But a stream is not a list of messages. One send of hi all may arrive split across two reads, or glued to the next line, because TCP is free to cut the bytes up however the network suits. So every protocol built on TCP needs framing: a length prefix before each message, or a delimiter such as a newline, and a receiver that buffers bytes until a whole message is there. UDP sends separate datagrams with no connection: each arrives whole or not at all, possibly out of order, and nothing is resent. That sounds worse, but for a game it is often better. The ball\'s position is sent sixty times a second, and only the newest one matters; a lost packet can simply be skipped because the next arrives a sixtieth of a second later. A sequence number in each packet lets the receiver ignore any that arrive after a newer one, so the ball never jumps backwards. Over TCP, by contrast, one lost packet holds up every packet behind it until it is resent, a stall of a round trip or more known as head-of-line blocking, so the game freezes and then lurches. Real games add interpolation between updates, client prediction and a reliable channel on top of UDP for the few messages that must arrive. This machine computes both cases from fixed loss patterns.',
  keywords: ['TCP vs UDP', 'message framing', 'sequence numbers', 'head-of-line blocking', 'networked games', 'sockets', 'chat server'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.1], dir: [0.05, 0.9, 1.15], half: 0.9, wide: 5.6 },
  credit: 'Built from <a href="https://16bpp.net/tutorials/csharp-networking" target="_blank" rel="noopener">C# Networking: Create a TCP chat server, TCP games, UDP Pong and more</a> by Benjamin N. Summerton (code Unlicense), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short framing and sequencing code, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 'udp', frame: true, seq: true, loss: 0.08 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const CW = 0.045;
    // chat: the TCP stream rides a belt in chunks cut wherever the network likes
    const belt = P.belt(V(-2.65, 0, -0.55), V(-0.45, 0, -0.55), { w: 0.36 }); S.add(belt);
    const recv = P.box(2.2, 0.04, 0.4, '#3A3D4A', { r: 0.04 }); recv.position.set(-1.55, 0, 0.3); S.add(recv);
    // pong: a table, two paddles and the ball; a strip of this second's sixty packets; a tower for the longest freeze
    const table = P.box(1.7, 0.05, 0.95, '#2E6B57', { r: 0.04 }); table.position.set(1.15, 0, -0.2); S.add(table);
    const padL = P.box(0.06, 0.12, 0.26, '#F4F1EA', { r: 0.02 }); padL.position.set(0.38, 0.05, -0.2); S.add(padL);
    const padR = P.box(0.06, 0.12, 0.26, '#F4F1EA', { r: 0.02 }); padR.position.set(1.92, 0.05, -0.2); S.add(padR);
    const ball = P.ball(0.06, SAF); ball.userData.noFit = true; S.add(ball);
    const pk = Array.from({ length: 60 }, (_, i) => { const m = own(GOOD), b = P.box(0.032, 0.06, 0.12, '#fff', { r: 0.008, material: m }); b.position.set(0.1 + i * 0.04, 0, 0.55); S.add(b); return m; });
    const freeze = P.tower(0.24, 0.24, GOOD); freeze.position.set(2.45, 0, -0.55); freeze.userData.set({ cap: '' }); S.add(freeze);
    S.add(P.keep(-2.7, 2.65, 0.95, -0.85, 0.7));
    let C = null, G = null, chunks = [], got = [], lost = [], late = [];
    function draw() {
      C = chat(st); G = game(st);
      chunks.forEach(c => c.parent && c.parent.remove(c)); got.forEach(c => c.parent && c.parent.remove(c)); chunks = []; got = [];
      // chunks on the belt: their width is their bytes; with framing each line's length tag is gold
      let x = 0;
      C.reads.forEach((r, i) => { const w = r.length * CW, b = P.box(w - 0.02, 0.12, 0.26, i % 2 ? '#8FA3C8' : '#B6C6D9', { r: 0.02 }); b.userData.noFit = true; b.userData.x0 = x; b.userData.w = w; S.add(b); chunks.push(b); x += w; });
      chunks.loop = x;
      // what the reader got back: whole lines teal, split or glued pieces coral
      let gx = -2.6;
      C.got.forEach((g, j) => { const w = Math.max(0.05, g.length * CW), ok = g === MSGS[j]; const b = P.box(w - 0.03, 0.14, 0.26, ok ? GOOD : BAD, { r: 0.03 }); b.userData.noFit = true; b.position.set(gx + w / 2, 0.04, 0.3); S.add(b); got.push(b); gx += w + 0.02; });
      lost = Array.from({ length: 60 }, (_, i) => rnd(i + 3) < st.loss);
      late = Array.from({ length: 60 }, (_, i) => !lost[i] && rnd(i + 91) < 0.08);
      pk.forEach((m, i) => m.color.set(lost[i] ? BAD : late[i] ? SAF : GOOD));
      freeze.userData.set({ h: Math.max(0.03, G.maxStall / 250), color: G.maxStall > 100 ? BAD : G.maxStall > 60 ? SAF : GOOD });
    }
    let off = 0, gt = 0, pause = 0, lastF = -1;
    const pos = t => { const u = (t * 0.7) % 2, k = u < 1 ? u : 2 - u; return V(0.47 + k * 1.36, 0.11, -0.2 + Math.sin(t * 2.1) * 0.32); };
    const tick = dt => {
      off = (off + dt * 0.35) % (chunks.loop || 1);
      chunks.forEach(b => { let x = (b.userData.x0 + off) % chunks.loop; b.position.set(-2.6 + x + b.userData.w / 2 - 0.0, 0.08, -0.55); b.visible = x + b.userData.w < 2.15; });
      if (pause > 0) pause -= dt; else gt += dt;
      const f = Math.floor(gt * 60) % 60;
      if (f !== lastF) { lastF = f; if (st.mode === 'tcp' && lost[f]) pause = 0.2; }
      const back = st.mode === 'udp' && !st.seq && late[f];
      ball.position.copy(pos(back ? gt - 2.4 / 60 * 6 : gt));
      freeze.userData.tick(dt);
    };
    function isOk() { return C.intact === MSGS.length && st.mode === 'udp' && st.seq && G.back === 0; }
    draw(); freeze.userData.snap();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Packets lost', min: 0, max: 0.3, step: 0.01, get: () => st.loss, set: v => set({ loss: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Prefix chat lines with their length', short: 'Framing', get: () => st.frame, set: v => set({ frame: !!v }) },
      { type: 'toggle', label: 'Sequence numbers on game packets', short: 'Sequence', get: () => st.seq, set: v => set({ seq: !!v }) },
      { type: 'buttons', label: 'Pong transport', options: ['UDP', 'TCP'], get: () => st.mode === 'udp' ? 0 : 1, act: i => set({ mode: i ? 'tcp' : 'udp' }) },
    ];
    const readouts = [
      { label: 'Chat lines', get: () => ({ v: `${C.intact} of ${MSGS.length}`, sub: 'intact', good: C.intact === MSGS.length, bad: C.intact < MSGS.length }) },
      { label: 'Longest freeze', get: () => ({ v: `${G.maxStall} ms`, sub: 'in the game', good: G.maxStall <= 60, bad: G.maxStall > 100 }) },
      { label: 'Backward jumps', get: () => ({ v: `${G.back}`, sub: 'stale positions shown', good: G.back === 0, bad: G.back > 0 }) },
    ];
    const labels = [
      { name: 'c', t: 'Chat as a byte stream', d: 'Chunks cut anywhere', icon: 'chat', atV: V(-2.65, 0.05, -0.55) },
      { name: 'r', t: 'Lines read back', d: 'Teal: whole. Coral: split or glued', icon: 'check', atV: V(-2.65, 0.03, 0.3) },
      { name: 'g', t: 'Pong, sixty packets a second', d: 'Coral: lost. Tower: longest freeze', icon: 'play', atV: V(2.57, 0.3, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read TCP without framing', hint: 'lines split and glued', on: () => set({ ...D0, frame: false }), off: reset },
      { label: 'Send game state over TCP', hint: 'head-of-line stalls', on: () => set({ ...D0, mode: 'tcp' }), off: reset },
      { label: 'Drop the sequence numbers', hint: 'the ball jumps back', on: () => set({ ...D0, seq: false }), off: reset },
    ];
    function status() {
      if (C.intact < MSGS.length) return { ok: false, msg: `<b>TCP delivered every byte in order, but cut them where it liked, so treating each read as a line shows ${C.got.length} pieces such as "${C.got[0]}" and only ${C.intact} of ${MSGS.length} lines intact.</b> Prefix each message with its length and buffer bytes until a whole message has arrived.` };
      if (st.mode === 'tcp' && !G.lost) return { ok: false, msg: '<b>With no packets lost, TCP keeps up, but the moment one is lost every later position waits for its resend.</b> Raise the loss to see it.' };
      if (st.mode === 'tcp') return { ok: false, msg: `<b>Over TCP, each lost packet is resent after about 200 ms, and every later position waits behind it: the game freezes for ${G.maxStall} ms, then lurches forward.</b> Old positions are worthless; send game state over UDP and skip what is lost.` };
      if (G.back) return { ok: false, msg: `<b>Without sequence numbers, packets that arrive late are drawn after newer ones, so the ball jumps backwards ${G.back} times.</b> Number every packet and ignore any older than the last one shown.` };
      if (!st.frame || !st.seq) return { ok: false, msg: '<b>This run looks fine, but one safeguard is off.</b>' };
      return { ok: true, msg: `<b>All ${MSGS.length} chat lines arrived intact thanks to the length prefixes, and over UDP the game skipped ${G.gaps} lost updates and ignored late ones, so the longest freeze was ${G.maxStall} ms and the ball never went backwards.</b>` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two kinds of traffic', home: true, say: 'A club runs a chat, where every line matters, and a game, where only the newest position matters.', act: m => m.set({ mode: 'udp', frame: true, seq: true, loss: 0.08 }) },
    { t: 'A stream, not messages', home: true, say: 'TCP delivers bytes in order, but cuts them up as it likes. Lines split and glue together.', act: m => m.set({ mode: 'udp', frame: false, seq: true, loss: 0.08 }) },
    { t: 'Framing', home: true, say: 'Put each line\'s length in front of it, and buffer until a whole line has arrived.', act: m => m.set({ mode: 'udp', frame: true, seq: true, loss: 0.08 }) },
    { t: 'Game over TCP', home: true, say: 'One lost packet holds up every later one until it is resent. The game freezes.', act: m => m.set({ mode: 'tcp', frame: true, seq: true, loss: 0.08 }) },
    { t: 'Game over UDP', home: true, say: 'Over UDP, a lost position is simply skipped. The next one is a sixtieth of a second away.', act: m => m.set({ mode: 'udp', frame: true, seq: false, loss: 0.08 }) },
    { t: 'Sequence numbers', home: true, say: 'Number every packet and ignore late ones, so the ball never jumps backwards.', act: m => m.set({ mode: 'udp', frame: true, seq: true, loss: 0.08 }) },
  ],
  check: [
    { q: 'What does TCP deliver?', options: ['A reliable, ordered stream of bytes', 'Separate messages', 'Unordered packets'], answer: 0, why: 'So messages need framing.', hint: 'Try Read TCP without framing.' },
    { q: 'Why does game state suit UDP?', options: ['Only the newest position matters; lost ones can be skipped', 'UDP is encrypted', 'UDP never loses packets'], answer: 0, why: 'No waiting for resends.', hint: 'Try Send game state over TCP.' },
    { q: 'What do sequence numbers prevent?', options: ['Showing a late, older packet after a newer one', 'Packet loss', 'Encryption'], answer: 0, why: 'Ignore anything older.', hint: 'Try Drop the sequence numbers.' },
  ],
  terms: [
    ['TCP', 'A reliable, ordered byte stream over a connection.'],
    ['UDP', 'Separate datagrams, no connection, no resending.'],
    ['Framing', 'Marking where each message starts and ends in a stream.'],
    ['Datagram', 'One self-contained UDP packet.'],
    ['Sequence number', 'A counter in each packet to spot old or missing ones.'],
    ['Head-of-line blocking', 'One lost packet holding up everything behind it.'],
  ],
  deeper: '<p><b>Interpolation.</b> Games draw the ball a little in the past and blend between the last two updates, so skipped packets do not show as jerks.</p><p><b>QUIC.</b> HTTP/3 runs over QUIC, which carries many independent streams over UDP so one lost packet stalls only its own stream.</p><p><b>About this machine.</b> The club is invented; losses, late arrivals and byte chunks are fixed draws.</p>',
  code: {
    title: 'Framing over TCP, sequencing over UDP',
    note: 'Our own short version, written for this lesson.',
    text: `
import socket, struct

def send_line(sock, text):                       # TCP: length-prefix each message
    data = text.encode()
    sock.sendall(struct.pack("!H", len(data)) + data)

def read_lines(sock):
    buf = b""
    while True:
        buf += sock.recv(4096)                   # any number of bytes, anywhere
        while len(buf) >= 2:
            n = struct.unpack("!H", buf[:2])[0]
            if len(buf) < 2 + n:
                break                            # wait for the rest
            yield buf[2:2 + n].decode()
            buf = buf[2 + n:]

last_seq = -1
def on_datagram(data):                           # UDP: newest state wins
    global last_seq
    seq, x, y = struct.unpack("!Iff", data)
    if seq <= last_seq:
        return                                   # late or duplicate: ignore
    last_seq = seq
    draw_ball(x, y)
`,
  },
};
