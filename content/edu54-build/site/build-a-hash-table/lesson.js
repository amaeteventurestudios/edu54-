// Build your own hash table: an invented bus company stores its towns in an open-addressing hash table. Each key is hashed to a slot; on a
// collision it probes the next slot until it finds a free one. When the table is more than 70% full it grows to the next prime above twice
// its size and rehashes every key. Deleting leaves a tombstone so later lookups keep probing past the gap. A poor hash, the first letter's
// code, piles keys into clusters. Everything is computed by inserting, deleting and looking up below.
const TOWNS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega', 'Kericho', 'Nyeri', 'Machakos', 'Meru'];
const fnv = s => { let h = 0x811c9dc5; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const nextPrime = n => { const isP = k => { for (let d = 2; d * d <= k; d++) if (k % d === 0) return false; return k > 1; }; while (!isP(n)) n++; return n; };
function build(o) {
  let size = 11, slots = Array(size).fill(null), resizes = 0, probesTotal = 0, full = false;
  const h = k => (o.good ? fnv(k) : k.charCodeAt(0)) % size;
  const place = (arr, k) => { const n = arr.length; let i = (o.good ? fnv(k) : k.charCodeAt(0)) % n, p = 1; while (arr[i] !== null && arr[i] !== 'TOMB') { i = (i + 1) % n; p++; if (p > n) return -1; } arr[i] = k; return p; };
  for (let j = 0; j < o.n; j++) {
    const k = TOWNS[j];
    if (o.resize && (j + 1) / size > 0.7) { const old = slots.filter(x => x && x !== 'TOMB'); size = nextPrime(size * 2 + 1); slots = Array(size).fill(null); old.forEach(x => place(slots, x)); resizes++; }
    const p = place(slots, k);
    if (p < 0) { full = true; break; }
    probesTotal += p;
  }
  let deletedAt = -1;
  if (o.del && o.n > 3) { deletedAt = slots.indexOf('Nakuru'); if (deletedAt >= 0) slots[deletedAt] = o.tomb ? 'TOMB' : null; }
  const lookup = k => { let i = h(k), p = 1; while (slots[i] !== null) { if (slots[i] === k) return { found: true, p, path: p }; i = (i + 1) % size; p++; if (p > size) break; } return { found: false, p }; };
  const present = TOWNS.slice(0, o.n).filter(t => !(o.del && t === 'Nakuru') && slots.includes(t));
  const misses = present.filter(t => !lookup(t).found);
  const avg = present.length ? present.reduce((a, t) => a + (lookup(t).found ? lookup(t).p : size), 0) / present.length : 0;
  const target = TOWNS[o.n - 1] === 'Nakuru' ? TOWNS[0] : TOWNS[o.n - 1];
  return { size, slots, resizes, full, load: present.length / size, avg, misses, deletedAt, target, look: lookup(target) };
}

export default {
  slug: 'build-a-hash-table',
  title: 'Build your own hash table',
  description: 'A bus company keeps its towns in a hash table: hash each name to a slot, and on a collision try the next. Grow it in time, and leave a tombstone when you delete.',
  overview: 'A hash table stores key and value pairs so that finding one takes about the same time however many there are. A hash function turns each key into a number, and the number modulo the table\'s size picks a slot, or bucket. Two keys can land in the same slot, a collision, and there are two families of fixes. Chaining keeps a small list in each slot. Open addressing, used by the write-a-hash-table tutorial in C, keeps one item per slot and, on a collision, probes other slots in a fixed order until it finds a free one: linear probing tries the next slot, double hashing jumps by a second hash, which spreads keys better. A lookup follows the same probe sequence until it finds the key or an empty slot. Three things decide how well it works. The hash must spread keys evenly; using only the first letter, for instance, puts every K town together, and probe chains grow long. The load factor, the share of slots in use, must stay low, because probes rise steeply as the table fills; when it passes about 0.7 the table grows, usually to roughly double its size and often a prime, and every key is rehashed into the new array. And deletion needs care: if a deleted key\'s slot is simply emptied, a lookup for a key that had probed past it stops at the gap and wrongly reports it missing, so open-addressing tables leave a tombstone, a marker meaning deleted, keep probing, that inserts may reuse. This machine stores towns served by an invented bus company in Kenya, and computes every probe.',
  keywords: ['build your own hash table', 'hash function', 'open addressing', 'linear probing', 'load factor', 'tombstone', 'rehashing'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/jamesroutley/write-a-hash-table" target="_blank" rel="noopener">Learn how to write a hash table in C</a> by James Routley (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short open-addressing table, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { n: 10, good: true, resize: true, del: true, tomb: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    let parts = [];

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = build(st);
      parts.forEach(p => p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; floor.add(o); parts.push(o); return o; };
      const cols = R.size > 12 ? 8 : 6, rows = Math.ceil(R.size / cols), w = 3.7 / cols - 0.06, hgt = Math.min(0.3, 1.25 / rows - 0.06);
      R.slots.forEach((k, i) => {
        const x = -2.7 + (i % cols) * (w + 0.06) + w / 2, z = -0.85 + Math.floor(i / cols) * (hgt + 0.08) + hgt / 2;
        const miss = k && k !== 'TOMB' && R.misses.includes(k);
        const col = k === null ? '#F1ECE1' : k === 'TOMB' ? '#E4E1DA' : miss ? '#F7DED5' : k === R.target ? '#FBE3B0' : '#D9F0E9';
        const b = add(P.box(w, k === null ? 0.05 : 0.2, hgt, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: col }) })); b.position.set(x, 0.12, z);
      });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.good && st.resize && st.tomb && !R.full && R.misses.length === 0 && R.avg < 2.5; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Towns inserted', min: 1, max: 14, step: 1, get: () => st.n, set: v => set({ n: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Hash the whole name', short: 'Good hash', get: () => st.good, set: v => set({ good: !!v }) },
      { type: 'toggle', label: 'Grow when over 70% full', short: 'Resize', get: () => st.resize, set: v => set({ resize: !!v }) },
      { type: 'toggle', label: 'Delete Nakuru', short: 'Delete', get: () => st.del, set: v => set({ del: !!v }) },
      { type: 'toggle', label: 'Leave a tombstone when deleting', short: 'Tombstone', get: () => st.tomb, set: v => set({ tomb: !!v }) },
    ];
    const readouts = [
      { label: 'Load factor', get: () => ({ v: `${(R.load * 100).toFixed(0)}%`, sub: `${R.size} slots`, good: R.load <= 0.7, bad: R.load > 0.85 }) },
      { label: 'Average probes', get: () => ({ v: R.avg.toFixed(1), sub: 'per lookup', good: R.avg < 2, bad: R.avg > 3 }) },
      { label: 'Lost towns', get: () => ({ v: `${R.misses.length}`, sub: 'lookups that fail', good: R.misses.length === 0, bad: R.misses.length > 0 }) },
    ];
    const labels = [
      { name: 'h', t: 'The table', d: 'One town per slot', icon: 'box', atV: V(-2.0, 0.15, -0.5) },
      { name: 't', t: 'How it performs', d: 'Load, probes, losses', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Hash only the first letter', hint: 'clusters', on: () => set({ ...D0, good: false }), off: reset },
      { label: 'Never resize', hint: 'fills up', on: () => set({ ...D0, resize: false, n: 14 }), off: reset },
      { label: 'Delete by emptying the slot', hint: 'lookups stop early', on: () => set({ ...D0, tomb: false, good: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.full) return { ok: false, msg: `<b>Without resizing, the ${r.size}-slot table filled up and the next insert had nowhere to go; even before that, lookups were probing ${r.avg.toFixed(1)} slots on average.</b> Grow the table, to about double and a prime, when the load passes 70%, and rehash every key.` };
      if (r.misses.length) return { ok: false, msg: `<b>Nakuru's slot was emptied, so lookups for ${r.misses.join(' and ')}, which had probed past it, now stop at the gap and report ${r.misses.length > 1 ? 'them' : 'it'} missing, though ${r.misses.length > 1 ? 'they are' : 'it is'} still in the table.</b> Leave a tombstone: lookups probe past it, inserts may reuse it.` };
      if (!st.good) return { ok: false, msg: `<b>Hashing only the first letter sends every K and M town to the same few slots: lookups now probe ${r.avg.toFixed(1)} slots on average, and clusters keep growing.</b> Hash the whole key so towns spread evenly.` };
      if (!st.resize && r.load > 0.7) return { ok: false, msg: `<b>The table is ${(r.load * 100).toFixed(0)}% full and not growing, so probe chains are lengthening: ${r.avg.toFixed(1)} probes per lookup.</b> Resize past 70%.` };
      if (!st.tomb && st.del) return { ok: false, msg: '<b>Every town is still found here, but deletion empties slots: with more collisions, some lookups would stop at the gap. Try a first-letter hash.</b>' };
      return { ok: true, msg: `<b>${st.n} town${st.n === 1 ? "" : "s"} in ${r.size} slots, ${(r.load * 100).toFixed(0)}% full${r.resizes ? ` after growing ${r.resizes} time${r.resizes > 1 ? 's' : ''}` : ''}: lookups average ${r.avg.toFixed(1)} probes${st.del ? ', and with Nakuru\'s tombstone every remaining town is still found' : ''}.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Hash to a slot', home: true, say: 'Each town\'s name is hashed to a number, and the number picks a slot.', act: m => m.set({ n: 4, good: true, resize: true, del: false, tomb: true }) },
    { t: 'Collisions', home: true, say: 'When a slot is taken, step to the next free one. Lookups follow the same path.', act: m => m.set({ n: 8, good: true, resize: false, del: false, tomb: true }) },
    { t: 'Grow in time', home: true, say: 'Past seventy percent full, probes get long. The table grows and every key is rehashed.', act: m => m.set({ n: 10, good: true, resize: true, del: false, tomb: true }) },
    { t: 'A poor hash', home: true, say: 'Hash only the first letter, and all the K towns crowd together.', act: m => m.set({ n: 10, good: false, resize: true, del: false, tomb: true }) },
    { t: 'Deleting', home: true, say: 'Empty a slot on delete, and lookups that probed past it stop too soon.', act: m => m.set({ n: 10, good: false, resize: true, del: true, tomb: false }) },
    { t: 'Tombstones', home: true, say: 'Leave a marker instead. Lookups probe past it, and inserts can reuse it.', act: m => m.set({ n: 10, good: true, resize: true, del: true, tomb: true }) },
  ],
  check: [
    { q: 'What does open addressing do on a collision?', options: ['Probes other slots in a fixed order', 'Overwrites the old key', 'Crashes'], answer: 0, why: 'Lookups follow the same path.', hint: 'Insert more towns.' },
    { q: 'Why resize past about 70% load?', options: ['Probe chains grow steeply as the table fills', 'To save memory', 'It is required by C'], answer: 0, why: 'Grow and rehash.', hint: 'Try Never resize.' },
    { q: 'Why leave a tombstone on delete?', options: ['So lookups keep probing past the gap', 'To save the value', 'For speed only'], answer: 0, why: 'An empty slot ends the search.', hint: 'Try Delete by emptying the slot.' },
  ],
  terms: [
    ['Hash function', 'Turns a key into a number, ideally spread evenly.'],
    ['Collision', 'Two keys mapping to the same slot.'],
    ['Open addressing', 'Storing colliding keys in other slots of the same array.'],
    ['Linear probing', 'On a collision, trying the next slot.'],
    ['Load factor', 'The share of slots in use.'],
    ['Tombstone', 'A marker left by a delete so probing continues past it.'],
  ],
  deeper: '<p><b>Double hashing.</b> Stepping by a second hash of the key, rather than one slot, breaks up the clusters linear probing forms.</p><p><b>Attacks.</b> If an attacker can choose keys that collide, a predictable hash lets them slow a server down; languages now seed their string hashes randomly.</p><p><b>About this machine.</b> The bus company is invented; the table, hashes and probes are computed in this lesson.</p>',
  code: {
    title: 'Insert, look up and delete with tombstones',
    note: 'Our own short version, written for this lesson.',
    text: `
TOMB = object()

class Table:
    def __init__(self, size=11):
        self.slots = [None] * size
        self.count = 0

    def _probe(self, key):
        i = hash(key) % len(self.slots)
        while True:
            yield i
            i = (i + 1) % len(self.slots)          # linear probing

    def put(self, key, value):
        if (self.count + 1) / len(self.slots) > 0.7:
            self._grow()
        for i in self._probe(key):
            s = self.slots[i]
            if s is None or s is TOMB or s[0] == key:
                self.slots[i] = (key, value); self.count += s is None or s is TOMB; return

    def get(self, key):
        for i in self._probe(key):
            s = self.slots[i]
            if s is None: raise KeyError(key)      # a true gap ends the search
            if s is not TOMB and s[0] == key: return s[1]

    def delete(self, key):
        for i in self._probe(key):
            s = self.slots[i]
            if s is None: raise KeyError(key)
            if s is not TOMB and s[0] == key:
                self.slots[i] = TOMB; self.count -= 1; return
`,
  },
};
