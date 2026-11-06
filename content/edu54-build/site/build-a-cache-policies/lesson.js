// Build it yourself: cache policies (after cache-lite). A Lilongwe school portal's lookups. Real FIFO, LRU, and expiring caches run over one seeded access stream with a popular few pages; hit rates are counted. Each cache wraps the last, as in the tutorial's decorators.
function stream(o) { const r = []; let s = 11; for (let i = 0; i < 600; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const u = s / 0x7fffffff; if (o.scan && i % 3 === 0) r.push(100 + (i % 200)); else r.push(u < 0.7 ? Math.floor(u * 7) : 10 + Math.floor((u - 0.7) * 100)); } return r; }
function sim(o) {
  const a = stream(o), m = new Map(); let hit = 0, stale = 0, evict = 0, t = 0;
  a.forEach(k => {
    t++; const e = m.get(k);
    if (o.ttl && e !== undefined && t - e.at > o.ttl) { m.delete(k); }
    if (m.has(k)) { hit++; if (o.ttl === 0 && t - m.get(k).at > 150) stale++; if (o.policy === 'lru') { const v = m.get(k); m.delete(k); m.set(k, { ...v }); } }
    else { if (o.policy !== 'none') { if (m.size >= o.size) { m.delete(m.keys().next().value); evict++; } m.set(k, { at: t }); } }
  });
  return { hit, rate: hit / a.length, evict, stale, n: a.length, held: m.size };
}
function run(o) { return { cur: sim(o), fifo: sim({ ...o, policy: 'fifo' }), lru: sim({ ...o, policy: 'lru' }), best: 0 }; }

export default {
  slug: 'build-a-cache-policies',
  title: 'Build your own cache',
  description: 'A cache has one hard question: what do you throw away? Run the policies on one stream and count.',
  overview: 'A cache is a small map in front of something slow. The map is easy. The hard part is what to do when it fills up. First in, first out is simple, and it throws out popular items just because they\'re old. Least recently used moves an item to the back on each hit, so that busy items stay. Expiry adds a limit on age, because a cached answer can go stale. A neat design wraps one small cache in another, so that each adds one behaviour. This counts real hits on six hundred lookups, for a school portal in Lilongwe. Size matters too, and a one-off scan can wash out even a good policy.',
  keywords: ['cache', 'LRU', 'FIFO', 'TTL', 'hit rate', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { policy: 'lru', size: 10, ttl: 200, scan: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', GREY = '#A9A396', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const A = add(P.tower(0.7, 0.4, GREY)), B = add(P.tower(0.7, 0.4, BLUE)), C = add(P.tower(0.7, 0.4, GOOD));
    A.position.set(-1.5, 0.03, -0.1); B.position.set(-0.3, 0.03, -0.1); C.position.set(0.9, 0.03, -0.1); [A, B, C].forEach(t => t.userData.set({ cap: '' }));
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.0, 0.03, -0.1);
    S.add(P.keep(-2.2, 2.2, 1.25, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); A.userData.set({ h: Math.max(0.03, R.fifo.rate * 1.5) }); B.userData.set({ h: Math.max(0.03, R.lru.rate * 1.5) }); C.userData.set({ h: Math.max(0.03, R.cur.rate * 1.5) }); lamp.userData.set({ color: !st.ttl && R.cur.stale ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const K = ['none', 'fifo', 'lru'];
    const controls = [
      { type: 'buttons', label: 'Policy', options: ['No cache', 'First in, first out', 'Least recently used'], get: () => K.indexOf(st.policy), act: i => set({ policy: K[i] }) },
      { type: 'slider', label: 'Size', min: 2, max: 30, step: 2, get: () => st.size, set: v => set({ size: v }) },
      { type: 'slider', label: 'Expires after (0 is never)', min: 0, max: 300, step: 50, get: () => st.ttl, set: v => set({ ttl: v }) },
      { type: 'toggle', label: 'A one-off scan', short: 'Scan', get: () => st.scan, set: v => set({ scan: !!v }) },
    ];
    const readouts = [
      { label: 'Hit rate', get: () => ({ v: `${Math.round(R.cur.rate * 100)}%`, sub: `${R.cur.hit} of ${R.cur.n}`, good: R.cur.rate > 0.5, bad: R.cur.rate < 0.25 }) },
      { label: 'First in, against recently used', get: () => ({ v: `${Math.round(R.fifo.rate * 100)}%, ${Math.round(R.lru.rate * 100)}%` }) },
      { label: 'Stale answers', get: () => ({ v: `${R.cur.stale}`, sub: st.ttl ? 'expiry is on' : 'no expiry', good: !R.cur.stale, bad: R.cur.stale > 0 }) },
    ];
    const labels = [
      { name: 'a', t: 'First in, recently used', d: 'Height: hit rate', icon: 'scale', atV: V(-1.87, 0.2, -0.1) },
      { name: 'b', t: 'Your settings', d: 'Red lamp: serving stale', icon: 'target', atV: V(1.27, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Too small', hint: 'everything is pushed out', on: () => set({ ...D0, size: 2 }), off: reset },
      { label: 'Never expire', hint: 'old answers stay', on: () => set({ ...D0, ttl: 0, size: 30 }), off: reset },
      { label: 'A big scan', hint: 'one-time lookups flood it', on: () => set({ ...D0, scan: true }), off: reset },
    ];
    function status() {
      if (st.policy === 'none') return { ok: false, msg: '<b>No cache: every lookup goes to the slow store.</b>' };
      if (st.size <= 2) return { ok: false, msg: `<b>${Math.round(R.cur.rate * 100)}% hits at size ${st.size}.</b> Popular pages get pushed out before they come back.` };
      if (!st.ttl && R.cur.stale) return { ok: false, msg: `<b>${R.cur.stale} answers were more than 150 lookups old.</b> Fast and wrong. Set an expiry.` };
      if (st.scan) return { ok: false, msg: `<b>Hits fall to ${Math.round(R.cur.rate * 100)}%.</b> One-off lookups push out popular pages, and they never come back.` };
      return { ok: true, msg: `<b>${Math.round(R.cur.rate * 100)}% of lookups skipped the slow store.</b> First in, first out gets ${Math.round(R.fifo.rate * 100)}% on this stream.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A small map', home: true, say: 'A school portal in Lilongwe looks up the same few pages all day. A small map avoids the slow store.', act: m => m.set({ policy: 'fifo', size: 10, ttl: 200, scan: false }) },
    { t: 'It fills up', home: true, say: 'When it\'s full, something must go. First in, first out drops the oldest.', act: m => m.set({ policy: 'fifo', size: 6, ttl: 200, scan: false }) },
    { t: 'Recently used', home: true, say: 'Move an item to the back on each hit, so that busy items stay.', act: m => m.set({ policy: 'lru', size: 6, ttl: 200, scan: false }) },
    { t: 'Size', home: true, say: 'More room gives more hits, up to a point.', act: m => m.set({ policy: 'lru', size: 20, ttl: 200, scan: false }) },
    { t: 'Stale', home: true, say: 'A cached answer can go out of date, so give it an expiry.', act: m => m.set({ policy: 'lru', size: 30, ttl: 0, scan: false }) },
    { t: 'A scan', home: true, say: 'One long scan of one-off pages can wash out what you\'ve kept.', act: m => m.set({ policy: 'lru', size: 10, ttl: 200, scan: true }) },
  ],
  check: [
    { q: 'What does recently used keep?', options: ['Items touched lately', 'The largest items', 'The oldest items'], answer: 0, why: 'A hit moves it to the back.', hint: 'See Recently used.' },
    { q: 'Why add expiry?', options: ['Cached answers go stale', 'To save power', 'To get more hits'], answer: 0, why: 'Fast and wrong is still wrong.', hint: 'Try Never expire.' },
    { q: 'What does a scan do?', options: ['Pushes out popular items', 'Fills gaps', 'Raises hit rate'], answer: 0, why: 'One-off items take the room.', hint: 'Try A big scan.' },
  ],
  terms: [['Hit rate', 'The share found in the cache.'], ['Eviction', 'Removing an item.'], ['LRU', 'Least recently used.'], ['TTL', 'How long an item may live.']],
  deeper: '<p><b>Real counts.</b> Every policy runs on the same 600 lookups, and the stream is made up.</p><p><b>Design.</b> The tutorial wraps caches, with each adding one behaviour.</p>',
  credit: 'Built from <a href="https://github.com/kezhenxu94/cache-lite" target="_blank" rel="noopener">cache-lite</a> by kezhenxu94 (Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short caches, written for this lesson.',
  code: {
    title: 'Recently used',
    note: 'Our own short version. A Map keeps insertion order.',
    text: `
get(key) {
  if (!this.map.has(key)) return undefined;
  const value = this.map.get(key);
  this.map.delete(key);
  this.map.set(key, value);          // move to the back
  return value;
}
set(key, value) {
  if (this.map.size >= this.size) this.map.delete(this.map.keys().next().value);
  this.map.set(key, value);
}
`,
  },
};
