// Build your own VPN and virtual switch: an invented NGO joins three offices in Zambia into one virtual network. Each office runs a TAP
// device; Ethernet frames are wrapped in UDP and sent over the internet to a switch on a cloud server. The switch learns which tunnel each
// source address arrived on, forwards frames for known addresses down one tunnel and floods unknown ones to all. Entries age out, so a laptop
// that moves offices is found again; tunnels are encrypted so the internet sees only ciphertext. Six frames are replayed through the switch.
const PORTS = ['Lusaka', 'Ndola', 'Livingstone'];
const HOSTS = { pc: 0, laptop: 1, server: 1, clinic: 2 };
const FRAMES = [
  { t: 0, src: 'pc', dst: 'laptop' }, { t: 1, src: 'laptop', dst: 'pc' }, { t: 2, src: 'clinic', dst: 'pc' },
  { t: 3, src: 'pc', dst: 'laptop' }, { t: 900, src: 'pc', dst: 'laptop', moved: true }, { t: 901, src: 'server', dst: 'clinic' },
];
const TTL = 300;
function replay(o) {
  const table = {}, log = [];
  let copies = 0, lost = 0;
  FRAMES.slice(0, o.upto ?? FRAMES.length).forEach(f => {
    const where = h => (h === 'laptop' && f.moved) ? 2 : HOSTS[h];
    const inPort = where(f.src);
    if (o.learn) table[f.src] = { port: inPort, t: f.t };
    const e = table[f.dst], fresh = e && (!o.age || f.t - e.t <= TTL);
    let out;
    if (o.learn && fresh) out = [e.port]; else out = PORTS.map((_, i) => i).filter(i => i !== inPort);
    copies += out.length;
    const delivered = out.includes(where(f.dst));
    if (!delivered) lost++;
    log.push({ ...f, out, delivered, flooded: out.length > 1 });
  });
  return { table, log, copies, lost };
}

export default {
  slug: 'build-a-virtual-switch',
  title: 'Build your own VPN and virtual switch',
  description: 'An NGO joins three offices into one private network. Each wraps its frames in UDP and sends them to a switch in the cloud, which learns who is where.',
  overview: 'Tools such as ZeroTier and Tailscale make computers in different places behave as if they were plugged into one switch. Building a small one shows the parts. On each machine a TAP device, a virtual network card provided by the operating system, hands every Ethernet frame the computer sends to a user program instead of a cable. The program wraps the frame in a UDP packet and sends it across the internet to a virtual switch, here a program on a cloud server; the switch sends it on to the right office, whose program unwraps it and writes it into its own TAP device, where the operating system receives it as if from a local wire. The switch works like a hardware Ethernet switch. It learns: whenever a frame arrives, it records that the frame\'s source address can be reached through the tunnel it came in on. To forward a frame, it looks up the destination address; if known, it sends the frame down that one tunnel; if not, it floods the frame to every other tunnel, and the reply teaches it the answer. Entries must age out after a few minutes, because devices move: a laptop carried from one office to another would otherwise keep receiving its frames at the old office until it happened to speak. Because the frames cross the public internet, each tunnel must be encrypted and authenticated, or anyone on the path can read and forge office traffic. Real systems add peer-to-peer paths that bypass the switch, with tricks to get through home routers. This machine replays six frames for an invented NGO with offices in Lusaka, Ndola and Livingstone.',
  keywords: ['build your own VPN', 'virtual switch', 'TAP device', 'MAC learning', 'flooding', 'UDP tunnel', 'ZeroTier'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/peiyuanix/build-your-own-zerotier" target="_blank" rel="noopener">Build your own VPN/Virtual Switch</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short learning switch, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { learn: true, age: true, encrypt: true, upto: 6 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const SW = [-1.0, -0.55], OFF = [[-2.4, 0.25], [-1.0, 0.35], [0.4, 0.25]];
    const sw = P.box(0.9, 0.12, 0.36, CHAR, { r: 0.05 }); sw.position.set(SW[0], 0.12, SW[1]); floor.add(sw);

    const tun = OFF.map((o, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#B9B3A6' }); floor.add(P.tube([V(o[0], 0.16, o[1] - 0.18), V(SW[0] + (i - 1) * 0.3, 0.16, SW[1] + 0.18)], 0.016, '#B9B3A6', { straight: true, material: m }));
      const b = P.box(1.0, 0.07, 0.36, '#fff', { r: 0.04 }); b.position.set(o[0], 0.12, o[1]); floor.add(b);
      return { m };
    });


    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    let R = null;
    function draw() {
      R = { ...replay(st), all: replay({ ...st, upto: FRAMES.length }) };
      const last = R.log[R.log.length - 1];
      const moved = last && last.moved;
      OFF.forEach((o, i) => {
        const hosts = Object.keys(HOSTS).filter(h => (h === 'laptop' && moved ? 2 : HOSTS[h]) === i);
        const used = last && last.out.includes(i);
        tun[i].m.color.set(used ? (last.delivered || !last.out.length ? SAF : RED) : '#B9B3A6');
      });
      const tbl = st.learn ? Object.entries(R.table).map(([h, e]) => `${h} → ${PORTS[e.port]}`).join('\n') : 'nothing learned';
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.learn && st.age && st.encrypt && R.all.lost === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Frames replayed', min: 1, max: 6, step: 1, get: () => st.upto, set: v => set({ upto: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Learn where each address lives', short: 'Learn', get: () => st.learn, set: v => set({ learn: !!v }) },
      { type: 'toggle', label: 'Age out old entries', short: 'Age out', get: () => st.age, set: v => set({ age: !!v }) },
      { type: 'toggle', label: 'Encrypt the tunnels', short: 'Encrypt', get: () => st.encrypt, set: v => set({ encrypt: !!v }) },
    ];
    const readouts = [
      { label: 'Copies sent', get: () => ({ v: `${R.copies}`, sub: `for ${R.log.length} frames`, good: R.copies <= R.log.length + 2, bad: R.copies >= 2 * R.log.length }) },
      { label: 'Frames lost', get: () => ({ v: `${R.lost}`, sub: 'never arrived', good: R.lost === 0, bad: R.lost > 0 }) },
      { label: 'On the internet', get: () => ({ v: st.encrypt ? 'ciphertext' : 'readable', sub: 'what the path sees', good: st.encrypt, bad: !st.encrypt }) },
    ];
    const labels = [
      { name: 's', t: 'The virtual switch', d: 'Learns, forwards, floods', icon: 'link', atV: V(-1.47, 0.18, -0.55) },
      { name: 't', t: 'The replay', d: 'Copies, losses, privacy', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Stop learning addresses', hint: 'everything floods', on: () => set({ ...D0, learn: false }), off: reset },
      { label: 'Never age out entries', hint: 'the moved laptop', on: () => set({ ...D0, age: false }), off: reset },
      { label: 'Send tunnels unencrypted', hint: 'readable on the path', on: () => set({ ...D0, encrypt: false }), off: reset },
    ];
    function status() {
      const a = R.all;
      if (!st.learn) return { ok: false, msg: `<b>Without learning, the switch floods every frame to every other office: ${a.copies} copies for 6 frames, so each office carries everyone\'s traffic.</b> Record each frame\'s source and tunnel, and send known destinations down one tunnel.` };
      if (!st.age) return { ok: false, msg: '<b>The laptop moved from Ndola to Livingstone without sending anything, and the switch still had it at Ndola, so the frame for it was sent there and lost.</b> Age out entries after a few minutes; an unknown address is flooded, and the laptop is found again.' };
      if (!st.encrypt) return { ok: false, msg: '<b>The switch works, but every frame crosses the internet in plain text: anyone on the path can read office traffic or inject frames of their own.</b> Encrypt and authenticate every tunnel.' };
      return { ok: true, msg: `<b>The switch flooded only frames for addresses it had not yet learned, sent the rest down one tunnel, and found the moved laptop again after its entry aged out: ${a.copies} copies for 6 frames, none lost, all encrypted.</b> Slide through the frames to watch the table fill.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One network, three offices', home: true, say: 'Each office wraps its network frames in UDP and sends them to a switch on a cloud server.', act: m => m.set({ learn: true, age: true, encrypt: true, upto: 1 }) },
    { t: 'Flood the unknown', home: true, say: 'The switch does not know the laptop yet, so it floods the first frame to every other office.', act: m => m.set({ learn: true, age: true, encrypt: true, upto: 1 }) },
    { t: 'Learn from replies', home: true, say: 'The reply teaches it where the laptop lives. Now frames go down one tunnel.', act: m => m.set({ learn: true, age: true, encrypt: true, upto: 4 }) },
    { t: 'The laptop moves', home: true, say: 'The laptop is carried to Livingstone. If the switch never forgets, its frames go to Ndola and are lost.', act: m => m.set({ learn: true, age: false, encrypt: true, upto: 5 }) },
    { t: 'Forget, then flood', home: true, say: 'Entries age out after a few minutes. The switch floods again and finds the laptop.', act: m => m.set({ learn: true, age: true, encrypt: true, upto: 5 }) },
    { t: 'Lock the tunnels', home: true, say: 'The frames cross the public internet. Encrypt every tunnel.', act: m => m.set({ learn: true, age: true, encrypt: true, upto: 6 }) },
  ],
  check: [
    { q: 'What does the switch do with a frame for an unknown address?', options: ['Floods it to every other tunnel', 'Drops it', 'Sends it back'], answer: 0, why: 'The reply teaches it.', hint: 'Replay one frame.' },
    { q: 'Why age out table entries?', options: ['Devices move, and old entries send frames to the wrong place', 'To save memory only', 'To speed up'], answer: 0, why: 'The moved laptop.', hint: 'Try Never age out entries.' },
    { q: 'What does a TAP device do?', options: ['Hands the computer\'s network frames to a program', 'Encrypts traffic', 'Stores addresses'], answer: 0, why: 'A virtual network card.', hint: 'Read the overview.' },
  ],
  terms: [
    ['TAP device', 'A virtual network card that passes frames to a program.'],
    ['Frame', 'One unit of Ethernet traffic, with source and destination addresses.'],
    ['MAC address', 'The hardware address a frame is sent to.'],
    ['Learning switch', 'A switch that records which port each address is behind.'],
    ['Flooding', 'Sending a frame out of every port but the one it came in on.'],
    ['Tunnel', 'Traffic wrapped inside other packets to cross another network.'],
  ],
  deeper: '<p><b>Direct paths.</b> Real overlay networks try to connect offices directly, using hole punching to get through home routers, and fall back to a relay.</p><p><b>Broadcasts.</b> Some frames, such as address lookups, are always flooded; large virtual networks filter them.</p><p><b>About this machine.</b> The NGO and its devices are invented; the six frames are replayed through the switch logic in this lesson.</p>',
  code: {
    title: 'A learning switch over UDP',
    note: 'Our own short version, written for this lesson.',
    text: `
import socket, time

table = {}                                     # address -> (peer, last seen)
TTL = 300
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("0.0.0.0", 9000))
peers = set()

while True:
    frame, peer = sock.recvfrom(2048)          # one Ethernet frame per datagram (decrypt first)
    peers.add(peer)
    dst, src = frame[0:6], frame[6:12]
    table[src] = (peer, time.time())           # learn
    entry = table.get(dst)
    if entry and time.time() - entry[1] <= TTL:
        sock.sendto(frame, entry[0])           # known: one tunnel
    else:
        for p in peers - {peer}:
            sock.sendto(frame, p)              # unknown: flood
`,
  },
};
