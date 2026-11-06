// Build your own cache and CDN: an invented news site's origin server is far from its readers, so edge caches in Lagos, Nairobi and
// Johannesburg keep copies of popular pages. Each edge holds a fixed number of pages and evicts by least-recently-used, first-in-first-out or
// at random. The cache key must be the URL, not the reader's cookie. When the editor updates the front page mid-stream, the origin purges it
// from every edge. 600 requests with a few very popular pages are replayed through each edge; every hit, miss and stale page is counted.
const PAGES = 40, REQS = 600, HIT_MS = 25, MISS_MS = 210, EDGES = ['Lagos', 'Nairobi', 'Johannesburg'];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const WEIGHTS = Array.from({ length: PAGES }, (_, i) => 1 / Math.pow(i + 1, 1.1));
const CUM = WEIGHTS.reduce((a, w, i) => (a.push((a[i - 1] || 0) + w), a), []);
const pick = u => { const t = u * CUM[PAGES - 1]; return CUM.findIndex(c => c >= t); };
function simulate(o) {
  const per = EDGES.map(() => ({ hits: 0, misses: 0, stale: 0 }));
  EDGES.forEach((_, e) => {
    const cache = new Map();
    let version = 0;
    for (let i = 0; i < REQS; i++) {
      if (i === REQS / 2) { version = 1; if (o.purge) cache.delete('/'); }
      const page = pick(rnd(e * 10007 + i + 1)), url = page === 0 ? '/' : `/story/${page}`;
      const key = o.urlKey ? url : `${url}|session=${Math.floor(rnd(e * 333 + i * 7) * 5000)}`;
      if (cache.has(key)) {
        const ent = cache.get(key);
        per[e].hits++;
        if (url === '/' && ent.v < version) per[e].stale++;
        if (o.policy === 'lru') { cache.delete(key); cache.set(key, ent); }
      } else {
        per[e].misses++;
        if (cache.size >= o.cap) {
          let victim;
          if (o.policy === 'random') victim = [...cache.keys()][Math.floor(rnd(e * 99 + i) * cache.size)];
          else victim = cache.keys().next().value;
          cache.delete(victim);
        }
        cache.set(key, { v: url === '/' ? version : 0 });
      }
    }
  });
  const hits = per.reduce((a, p) => a + p.hits, 0), total = REQS * EDGES.length, stale = per.reduce((a, p) => a + p.stale, 0);
  const ratio = hits / total, ms = ratio * HIT_MS + (1 - ratio) * MISS_MS, originLoad = total - hits;
  return { per, ratio, ms, stale, originLoad };
}

export default {
  slug: 'build-a-cache-cdn',
  title: 'Build your own cache and CDN',
  description: 'A news site\'s server is far from its readers, so edge caches in three cities keep copies. Choose what to keep, and keep it fresh.',
  overview: 'A cache keeps copies of things that are slow to fetch, close to where they are needed. A content delivery network is a cache spread around the world: edge servers near readers answer requests for popular pages and files from their own copies, and only misses travel to the origin server, which may be a continent away. Two projects in build-your-own-x build the pieces: a small in-memory cache with eviction policies, and a CDN of edges in front of an origin. Because space is limited, every cache needs an eviction policy for when it is full. Least recently used throws out the entry untouched for longest, which suits the web, where a few pages are very popular and stay hot; first in, first out throws out the oldest entry even if it is the most popular, and random eviction is simple but blind. The hit ratio, the share of requests answered from the cache, sets both the speed readers feel and the load on the origin. The cache key decides which requests count as the same. It should be the URL, plus only the headers that really change the response; including something unique per reader, such as a session cookie, makes every request a different key and the hit ratio collapses, while leaving out something that matters, such as the language, serves readers the wrong page. Caches must also stay correct when content changes: entries carry a time to live, and when the editor updates a page the origin can purge it from every edge at once, or readers keep seeing the old front page. This machine replays the requests through the edges of an invented news site.',
  keywords: ['build your own cache', 'CDN', 'LRU cache', 'cache eviction', 'cache key', 'hit ratio', 'cache purge'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, -0.45], dir: [0.05, 0.7, 1.2], half: 1.0, wide: 5.4 },
  credit: 'Built from <a href="https://github.com/kezhenxu94/cache-lite" target="_blank" rel="noopener">Build Your Own Cache</a> (Apache-2.0) and <a href="https://github.com/leandromoreira/cdn-up-and-running" target="_blank" rel="noopener">Building a CDN from Scratch to Learn about CDN</a> (BSD-3-Clause), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short LRU edge cache, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cap: 16, policy: 'lru', urlKey: true, purge: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the origin server, far behind the edges
    const origin = P.box(1.0, 0.75, 0.5, '#3F4049', { r: 0.06 }); origin.position.set(0, 0, -1.15); S.add(origin);
    // three edge caches: a shelf of up to 30 pages, a tower for the hit ratio, a pipe for misses back to the origin
    const EX = e => -1.85 + e * 1.8, EZ = 0.2;
    const edges = EDGES.map((n, e) => {
      const sh = P.shelf(10, { cell: 0.115, levels: 3, lh: 0.16, d: 0.3 }); sh.position.set(EX(e), 0, EZ); S.add(sh);
      const fm = own(SAF), front = P.box(0.3, 0.1, 0.24, '#fff', { r: 0.03, material: fm }); front.position.set(EX(e), 0.51, EZ); S.add(front);
      const t = P.tower(0.22, 0.22, GOOD); t.position.set(EX(e) + 0.78, 0, EZ); t.userData.set({ cap: '' }); S.add(t);
      const pipe = P.pipe([V(EX(e), 0.62, EZ - 0.1), V(EX(e) * 0.6, 0.9, -0.55), V(EX(0) * 0.0 + (e - 1) * 0.3, 0.78, -1.0)], BAD, { r: 0.03, n: 5 }); S.add(pipe);
      return { sh, fm, t, pipe };
    });
    S.add(P.keep(-2.5, 2.6, 1.0, -1.45, 0.45));
    let R = null;
    function draw() {
      R = simulate(st);
      edges.forEach((E, e) => {
        const p = R.per[e], hr = p.hits / REQS;
        // the shelf holds cap pages: with a URL key the popular ones stay; keyed on cookies it fills with one-off copies
        E.sh.userData.set({ fill: Array.from({ length: 30 }, (_, i) => i >= st.cap ? null : !st.urlKey ? '#C9C4B6' : i < 4 ? SAF : '#5B8DB8') });
        E.fm.color.set(p.stale > 0 ? BAD : SAF);
        E.t.userData.set({ h: Math.max(0.03, hr * 1.0), color: hr > 0.6 ? GOOD : hr > 0.35 ? SAF : BAD });
        const miss = 1 - hr;
        E.pipe.userData.set({ speed: 0.1 + miss * 0.8, color: miss > 0.4 ? BAD : '#8E91A3', pipe: miss > 0.4 ? '#E9B8A8' : '#B9B3A6' });
      });
    }
    const tick = dt => edges.forEach(E => { E.t.userData.tick(dt); E.pipe.userData.tick(dt); });
    function isOk() { return st.urlKey && st.purge && st.policy === 'lru' && R.ratio > 0.55 && R.stale === 0; }
    draw(); edges.forEach(E => E.t.userData.snap());
    const set = p => { Object.assign(st, p); draw(); };
    const POL = ['lru', 'fifo', 'random'];
    const controls = [
      { type: 'slider', label: 'Pages each edge holds', min: 2, max: 30, step: 1, get: () => st.cap, set: v => set({ cap: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Key the cache on the URL only', short: 'URL key', get: () => st.urlKey, set: v => set({ urlKey: !!v }) },
      { type: 'toggle', label: 'Purge the front page when it changes', short: 'Purge', get: () => st.purge, set: v => set({ purge: !!v }) },
      { type: 'buttons', label: 'Eviction', options: ['Least recently used', 'First in, first out', 'Random'], get: () => POL.indexOf(st.policy), act: i => set({ policy: POL[i] }) },
    ];
    const readouts = [
      { label: 'Hit ratio', get: () => ({ v: `${Math.round(R.ratio * 100)}%`, sub: 'answered at the edge', good: R.ratio > 0.55, bad: R.ratio < 0.3 }) },
      { label: 'Average wait', get: () => ({ v: `${Math.round(R.ms)} ms`, sub: 'per request', good: R.ms < 100, bad: R.ms > 160 }) },
      { label: 'Stale pages', get: () => ({ v: `${R.stale}`, sub: 'old front page served', good: R.stale === 0, bad: R.stale > 0 }) },
    ];
    const labels = [
      { name: 'o', t: 'The distant origin', d: 'Coral pipes: misses crossing to it', icon: 'link', atV: V(0.5, 0.5, -1.15) },
      { name: 'e', t: 'An edge cache', d: 'Gold: popular pages. Tower: hit ratio', icon: 'box', atV: V(EX(0) - 0.66, 0.25, EZ) },
      { name: 'f', t: 'Front page copy', d: 'Gold: fresh. Coral: stale', icon: 'eye', atV: V(EX(2) + 0.15, 0.56, EZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Key on the session cookie', hint: 'every request unique', on: () => set({ ...D0, urlKey: false }), off: reset },
      { label: 'Evict first-in, first-out', hint: 'drops popular pages', on: () => set({ ...D0, policy: 'fifo' }), off: reset },
      { label: 'Never purge', hint: 'old front page', on: () => set({ ...D0, purge: false }), off: reset },
    ];
    function status() {
      const r = R, pct = Math.round(r.ratio * 100);
      if (!st.urlKey) return { ok: false, msg: `<b>With the reader\'s session cookie in the cache key, almost every request is a new key: the hit ratio falls to ${pct}% and ${r.originLoad.toLocaleString("en")} requests cross to the origin.</b> Key on the URL and only the headers that change the response.` };
      if (r.stale) return { ok: false, msg: `<b>The editor updated the front page halfway through, but the edges kept their old copies and served the outdated front page ${r.stale} times.</b> Purge changed pages from every edge, or give them a short time to live.` };
      if (st.policy !== 'lru') return { ok: false, msg: `<b>${st.policy === 'fifo' ? 'First-in, first-out evicts the oldest entry even when it is the front page everyone wants' : 'Random eviction throws out popular pages as often as unpopular ones'}: the hit ratio is ${pct}%.</b> Least-recently-used keeps the hot pages.` };
      if (r.ratio <= 0.55) return { ok: false, msg: `<b>With room for only ${st.cap} pages, each edge keeps evicting pages it soon needs again: ${pct}% hits, ${Math.round(r.ms)} ms on average.</b> Give the edges more space.` };
      return { ok: true, msg: `<b>Each edge holds ${st.cap} pages and evicts the least recently used, so the popular stories stay close: ${pct}% of requests are answered at the edge, ${Math.round(r.ms)} ms on average, and the purge meant no one saw the old front page.</b>` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A distant origin', home: true, say: 'A news site\'s server is far from its readers. Every request that crosses to it waits two hundred milliseconds.', act: m => m.set({ cap: 2, policy: 'lru', urlKey: true, purge: true }) },
    { t: 'Edges', home: true, say: 'Edge caches in three cities keep copies of popular pages. A hit takes twenty-five milliseconds.', act: m => m.set({ cap: 10, policy: 'lru', urlKey: true, purge: true }) },
    { t: 'Who to evict', home: true, say: 'When a cache is full, least-recently-used keeps the hot pages. First-in, first-out drops them.', act: m => m.set({ cap: 10, policy: 'fifo', urlKey: true, purge: true }) },
    { t: 'The cache key', home: true, say: 'Key on the reader\'s cookie and every request is new. The hit ratio collapses.', act: m => m.set({ cap: 10, policy: 'lru', urlKey: false, purge: true }) },
    { t: 'Fresh content', home: true, say: 'The editor updates the front page. Without a purge, edges keep serving the old one.', act: m => m.set({ cap: 10, policy: 'lru', urlKey: true, purge: false }) },
    { t: 'Close and correct', home: true, say: 'Keyed by URL, least-recently-used, purged on change: fast and up to date.', act: m => m.set({ cap: 16, policy: 'lru', urlKey: true, purge: true }) },
  ],
  check: [
    { q: 'Why does least-recently-used suit web caches?', options: ['A few pages stay popular, and LRU keeps them', 'It is random', 'It uses less memory'], answer: 0, why: 'Hot pages stay hot.', hint: 'Try Evict first-in, first-out.' },
    { q: 'What goes wrong if the cache key includes a session cookie?', options: ['Every request looks unique, so hits collapse', 'Pages go stale', 'Nothing'], answer: 0, why: 'Key on what changes the response.', hint: 'Try Key on the session cookie.' },
    { q: 'How do edges learn a page changed?', options: ['A purge from the origin, or a short time to live', 'They never do', 'Readers tell them'], answer: 0, why: 'Or they serve stale pages.', hint: 'Try Never purge.' },
  ],
  terms: [
    ['Cache', 'A nearby store of copies of slow-to-fetch things.'],
    ['CDN', 'A network of edge caches near readers.'],
    ['Hit ratio', 'The share of requests answered from the cache.'],
    ['LRU', 'Evicting the entry used least recently.'],
    ['Cache key', 'What decides whether two requests get the same copy.'],
    ['Purge', 'Removing a copy from caches when the original changes.'],
  ],
  deeper: '<p><b>Origin shield.</b> Many CDNs put a middle cache between the edges and the origin, so a miss at several edges reaches the origin only once.</p><p><b>Stale while revalidate.</b> An edge can serve a slightly old copy while it fetches a fresh one in the background.</p><p><b>About this machine.</b> The site, cities and timings are invented; the requests are replayed through each edge in this lesson.</p>',
  code: {
    title: 'An LRU edge cache',
    note: 'Our own short version, written for this lesson.',
    text: `
from collections import OrderedDict

class EdgeCache:
    def __init__(self, capacity, fetch_from_origin):
        self.items = OrderedDict()
        self.capacity, self.fetch = capacity, fetch_from_origin

    def get(self, url):
        key = url                                   # the URL, not the reader's cookie
        if key in self.items:
            self.items.move_to_end(key)             # most recently used
            return self.items[key]                  # hit
        page = self.fetch(url)                      # miss: cross to the origin
        if len(self.items) >= self.capacity:
            self.items.popitem(last=False)          # evict least recently used
        self.items[key] = page
        return page

    def purge(self, url):
        self.items.pop(url, None)
`,
  },
};
