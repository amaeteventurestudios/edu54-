// Build your own Kafka-like log: an invented motorbike-taxi dispatch in Kampala writes trip events from three drivers into a topic with
// three partitions. Each partition is an append-only log with offsets. Keying events by driver keeps each driver's events in one partition,
// in order; spreading them round-robin lets consumers process them out of order. A consumer group shares the partitions; a consumer crashes
// mid-batch and restarts from its committed offset; a partition leader crashes before replicating its last writes. Every outcome below is
// simulated from these rules.
const DRIVERS = ['A', 'B', 'C'], PER = 6, NP = 3;
function simulate(o) {
  const parts = Array.from({ length: NP }, () => []);
  let i = 0;
  for (let s = 0; s < PER; s++) for (let d = 0; d < DRIVERS.length; d++) {
    const p = o.keyed ? d : Math.floor(i / 2) % NP;
    parts[p].push({ d, s, lost: false });
    i++;
  }
  const lostBroker = [];
  if (!o.acksAll) parts[0].slice(-2).forEach(m => { m.lost = true; lostBroker.push(m); });
  const assign = Array.from({ length: o.consumers }, () => []);
  for (let p = 0; p < NP; p++) assign[p % o.consumers].push(p);
  const idle = assign.filter(a => !a.length).length;
  // consumer owning partition 1 crashes after processing offset 3 of it, with offsets 3 and 4 in flight
  const crashP = 1, done = 3, inflight = [3, 4];
  const committed = o.commitAfter ? done : 5;
  const lostConsumer = o.commitAfter ? 0 : inflight.filter(x => x >= done).length;
  const dupes = o.commitAfter ? 1 : 0;
  // processing order: each consumer reads its partitions at its own pace
  const speed = c => 1 + c * 0.37, events = [];
  assign.forEach((ps, c) => ps.forEach((p, k) => parts[p].forEach((m, off) => { if (!m.lost) events.push({ ...m, t: (k * PER + off) * speed(c) }); })));
  events.sort((a, b) => a.t - b.t);
  const last = {}, oo = new Set();
  events.forEach(e => { if (last[e.d] !== undefined && e.s < last[e.d]) oo.add(e.d); last[e.d] = Math.max(last[e.d] ?? -1, e.s); });
  return { parts, assign, idle, lostBroker: lostBroker.length, lostConsumer, dupes, committed, crashP, outOfOrder: oo.size };
}

export default {
  slug: 'build-a-message-log',
  title: 'Build your own message log',
  description: 'A motorbike-taxi dispatch writes trip events into a log of three partitions, and consumers read them. Key by driver, commit after work, and survive a crash.',
  overview: 'Systems such as Apache Kafka are built on one simple structure: an append-only log. Producers add messages to the end, each message gets the next number, called its offset, and consumers read forward at their own pace, remembering how far they got. Nothing is updated in place, so writes are fast and any consumer can replay history. To scale, a topic is split into partitions, each its own log, spread across machines. A message\'s key decides its partition, usually by hashing, so all messages with the same key land in the same partition and stay in order; without a key they are spread round-robin and only the partition, not the key, keeps order. Consumers join a consumer group that divides the partitions among its members, one owner per partition, so a group can never usefully have more members than partitions. Each consumer commits the offset it has reached. Committing after processing gives at-least-once delivery: after a crash the consumer restarts from its last commit and may repeat a message, so processing should be idempotent. Committing before processing gives at-most-once: messages in flight at the crash are skipped for ever. For durability each partition has a leader and followers that copy it. If the producer is told a write succeeded once the leader alone has it, a leader crash before the copy loses that write; waiting for all in-sync replicas costs a little latency and loses nothing. This machine follows an invented motorbike-taxi dispatch in Kampala, with three drivers whose trip events must be handled in order.',
  keywords: ['build your own Kafka', 'append-only log', 'partitions', 'consumer groups', 'offsets', 'at-least-once delivery', 'replication'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/buildthingsuseful/build-your-own-kafka" target="_blank" rel="noopener">Building Your Own Kafka-like System From Scratch</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short version of a partitioned log, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { keyed: true, consumers: 3, commitAfter: true, acksAll: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', RED = '#B5462F', SAF = '#F2AE0C';
    const DC = ['#1F9E89', '#E07A5F', '#5B6CC4'];
    const PZ = p => -0.62 + p * 0.46, SX = k => -1.95 + k * 0.33;
    const prod = P.box(0.62, 0.08, 0.5, CHAR, { r: 0.04 }); prod.position.set(-2.55, 0.12, -0.16); floor.add(prod);

    const slots = [];
    for (let p = 0; p < NP; p++) {
      floor.add(P.arrow(V(-2.22, 0.16, -0.16), V(-2.15, 0.16, PZ(p)), 0.01, CHAR));
      const row = [];
      for (let k = 0; k < PER; k++) {
        const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.29, 0.06, 0.22, '#fff', { r: 0.03, material: m }); b.position.set(SX(k), 0.12, PZ(p)); floor.add(b);
        row.push({ m, t });
      }
      slots.push(row);
    }
    const commit = P.box(0.025, 0.1, 0.3, SAF, { r: 0.005 }); commit.userData.noFit = true; floor.add(commit);

    let cParts = [];
    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);




    let R = null;
    function draw() {
      R = simulate(st);
      R.parts.forEach((row, p) => row.forEach((m, k) => {
        const s = slots[p][k];
        s.m.color.set(m.lost ? '#CFCAC0' : DC[m.d]);
      }));
      commit.position.set(SX(R.committed) - 0.165, 0.12, PZ(R.crashP));
      cParts.forEach(o => o.parent.remove(o)); cParts = [];
      const add = o => { o.userData.noFit = true; floor.add(o); cParts.push(o); return o; };
      R.assign.forEach((ps, c) => {
        const z = st.consumers === 1 ? -0.16 : -0.66 + c * (1.0 / (st.consumers - 1));
        const b = add(P.box(0.5, 0.07, 0.24, ps.length ? CHAR : '#B9B3A6', { r: 0.04 })); b.position.set(0.72, 0.12, z);
        ps.forEach(p => add(P.arrow(V(0.0, 0.16, PZ(p)), V(0.45, 0.16, z), 0.009, SAF)));
      });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.keyed && st.commitAfter && st.acksAll; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Consumers in the group', min: 1, max: 4, step: 1, get: () => st.consumers, set: v => set({ consumers: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Key events by driver', short: 'Key', get: () => st.keyed, set: v => set({ keyed: !!v }) },
      { type: 'toggle', label: 'Commit offsets after processing', short: 'Commit after', get: () => st.commitAfter, set: v => set({ commitAfter: !!v }) },
      { type: 'toggle', label: 'Confirm writes once all replicas have them', short: 'Acks all', get: () => st.acksAll, set: v => set({ acksAll: !!v }) },
    ];
    const readouts = [
      { label: 'Lost', get: () => ({ v: `${R.lostBroker + R.lostConsumer}`, sub: 'events', good: R.lostBroker + R.lostConsumer === 0, bad: R.lostBroker + R.lostConsumer > 0 }) },
      { label: 'Out of order', get: () => ({ v: `${R.outOfOrder}`, sub: 'drivers', good: R.outOfOrder === 0, bad: R.outOfOrder > 0 }) },
      { label: 'Idle consumers', get: () => ({ v: `${R.idle}`, sub: `${NP} partitions`, good: R.idle === 0, bad: false }) },
    ];
    const labels = [
      { name: 'p', t: 'Three partitions', d: 'Append-only logs with offsets', icon: 'box', atV: V(-2.5, 0.15, -0.16) },
      { name: 't', t: 'After the crashes', d: 'Lost, repeated, out of order', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Spread events round-robin', hint: 'no key', on: () => set({ ...D0, keyed: false }), off: reset },
      { label: 'Commit before processing', hint: 'at-most-once', on: () => set({ ...D0, commitAfter: false }), off: reset },
      { label: 'Confirm once the leader has it', hint: 'leader crashes', on: () => set({ ...D0, acksAll: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.keyed) return { ok: false, msg: `<b>Without a key, each driver\'s trip events are spread across all three partitions, and since partitions are read in batches and at their own pace, ${r.outOfOrder} of the 3 drivers have events handled out of order: a trip can end before it starts.</b> Key by driver so each driver stays in one partition, where order is kept.` };
      if (!st.commitAfter) return { ok: false, msg: `<b>The consumer committed offset 5 before processing events 3 and 4, then crashed: on restart it begins at 5, and ${r.lostConsumer} events are skipped for ever.</b> Commit after processing; a crash then repeats at most a message, so make processing idempotent.` };
      if (!st.acksAll) return { ok: false, msg: `<b>The producer was told the last ${r.lostBroker} writes to partition 0 succeeded when only the leader had them; the leader crashed before its followers copied them, and they are gone.</b> Wait for all in-sync replicas before confirming a write.` };
      return { ok: true, msg: `<b>Keyed by driver, committed after processing and confirmed by every replica: no event lost and every driver in order.</b> The crashed consumer restarted from its commit and repeated ${r.dupes} event, which idempotent handling absorbs.${r.idle ? ` With ${st.consumers} consumers and ${NP} partitions, ${r.idle} sits idle: a group cannot use more members than partitions.` : ''}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An append-only log', home: true, say: 'A taxi dispatch writes trip events to the end of a log. Each event gets the next offset.', act: m => m.set({ keyed: true, consumers: 1, commitAfter: true, acksAll: true }) },
    { t: 'Partitions and keys', home: true, say: 'Split the log into three partitions. Key by driver, and each driver\'s events stay together, in order.', act: m => m.set({ keyed: true, consumers: 3, commitAfter: true, acksAll: true }) },
    { t: 'No key', home: true, say: 'Without a key, a driver\'s events scatter, and consumers handle them out of order.', act: m => m.set({ keyed: false, consumers: 3, commitAfter: true, acksAll: true }) },
    { t: 'Consumer groups', home: true, say: 'A group shares the partitions, one owner each. A fourth consumer would sit idle.', act: m => m.set({ keyed: true, consumers: 4, commitAfter: true, acksAll: true }) },
    { t: 'When to commit', home: true, say: 'Commit before processing, crash, and the events in flight are skipped. Commit after, and at most one repeats.', act: m => m.set({ keyed: true, consumers: 3, commitAfter: false, acksAll: true }) },
    { t: 'Wait for replicas', home: true, say: 'Confirm a write only when every replica has it, and a leader crash loses nothing.', act: m => m.set({ keyed: true, consumers: 3, commitAfter: true, acksAll: true }) },
  ],
  check: [
    { q: 'What does a message key decide?', options: ['Which partition it goes to, keeping same-key order', 'Its offset', 'Who can read it'], answer: 0, why: 'Order is per partition.', hint: 'Try Spread events round-robin.' },
    { q: 'Committing offsets after processing gives…', options: ['At-least-once: a crash may repeat a message', 'Exactly-once for free', 'At-most-once'], answer: 0, why: 'Make processing idempotent.', hint: 'Try Commit before processing.' },
    { q: 'Why wait for all replicas before confirming a write?', options: ['A leader crash then loses nothing', 'It is faster', 'To keep order'], answer: 0, why: 'Leader-only acks can lose writes.', hint: 'Try Confirm once the leader has it.' },
  ],
  terms: [
    ['Append-only log', 'A sequence where messages are only ever added at the end.'],
    ['Offset', 'A message\'s position number in its partition.'],
    ['Partition', 'One of the logs a topic is split into.'],
    ['Consumer group', 'Consumers that share a topic\'s partitions between them.'],
    ['Commit', 'Recording the offset a consumer has reached.'],
    ['In-sync replica', 'A follower that has caught up with the leader.'],
  ],
  deeper: '<p><b>Retention.</b> Logs keep messages for a set time or size, not until read, so new consumers can replay history; compaction keeps only the latest value per key.</p><p><b>Rebalancing.</b> When a consumer joins or leaves, the group reassigns partitions, pausing briefly.</p><p><b>About this machine.</b> The dispatch, drivers and crash timings are invented for illustration.</p>',
  code: {
    title: 'A partitioned log in a few lines',
    note: 'Our own short version, written for this lesson.',
    text: `
import zlib

class Topic:
    def __init__(self, partitions=3):
        self.logs = [[] for _ in range(partitions)]

    def append(self, key, value):
        p = zlib.crc32(key.encode()) % len(self.logs)   # same key, same partition
        self.logs[p].append(value)
        return p, len(self.logs[p]) - 1                    # partition and offset

class Consumer:
    def __init__(self, topic, partition, committed=0):
        self.topic, self.p, self.committed = topic, partition, committed

    def poll(self, handle):
        log = self.topic.logs[self.p]
        for offset in range(self.committed, len(log)):
            handle(log[offset])                            # process first...
            self.committed = offset + 1                    # ...then commit
`,
  },
};
