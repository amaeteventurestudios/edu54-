// Exam prep, MCP caching and pagination: an invented notes server for a newsroom in Bamako sits behind a shared gateway cache used by two
// readers, Awa and Bakary. Cacheable results carry ttlMs and cacheScope: fresh while now < received + ttlMs, 0 means stale at once, public may
// be shared across users, private never crosses authorization contexts. A list_changed notification invalidates immediately; the cache key is
// the method plus the parameters that matter (uri, cursor); input_required results and MRTR retries are never cached. Illustrative.
const REQS = [
  { t: 0, who: 'Awa', m: 'tools/list' },
  { t: 20, who: 'Awa', m: 'tools/list' },
  { t: 45, who: 'Awa', m: 'tools/list' },
  { t: 50, who: 'Awa', m: 'resources/read notes://me/draft' },
  { t: 55, who: 'Bakary', m: 'resources/read notes://me/draft' },
  { t: 58, who: 'Bakary', m: 'resources/read notes://changelog' },
  { t: 62, who: 'Bakary', m: 'tools/call publish' },
];
const CHANGE = 40;

function run(o) {
  const ttl = o.ttl / 1000;
  const out = [
    { v: 'miss: fetched, cached', ok: true },
    ttl > 20 ? { v: 'hit: fresh, no wire traffic', ok: true } : { v: ttl === 0 ? 'miss: ttlMs 0 is stale at once' : 'miss: expired, refetched', ok: true },
    o.invalidate ? { v: 'miss: list_changed at 40 s emptied the entry', ok: true } : ttl > 45 ? { v: 'hit, but stale: the list changed at 40 s', ok: false } : { v: 'miss: expired, refetched', ok: true },
    { v: `miss: fetched, cached ${o.priv ? 'private (Awa only)' : 'public'}`, ok: true },
    o.priv ? { v: 'miss: Awa\'s private entry is not shared', ok: true } : { v: 'hit: served Awa\'s draft to Bakary', ok: false },
    o.keyed ? { v: 'miss: different uri, fetched', ok: true } : { v: 'hit on the draft entry: wrong content', ok: false },
    o.noMrtr ? { v: 'input_required: never cached', ok: true } : { v: 'an old input_required replayed from cache', ok: false },
  ];
  const issues = [];
  if (!out[2].ok) issues.push('a list_changed notification arrived at 40 s but the cache kept serving the old tool list until the TTL ran out');
  if (!out[4].ok) issues.push('Awa\'s per-user draft was cached as public, so the gateway served it to Bakary');
  if (!out[5].ok) issues.push('the cache keyed on the method alone, so a read of the changelog returned the draft');
  if (!out[6].ok) issues.push('an input_required result was cached and replayed; MRTR results and retries are never cached');
  const rows = REQS.map((r, i) => ({ r, ...out[i] }));
  return { rows, issues, ok: issues.length === 0, hits: rows.filter(x => x.v.startsWith('hit')).length };
}

export default {
  slug: 'exam-mcp-caching-and-pagination',
  title: 'Exam prep, MCP: caching and pagination',
  description: 'A shared gateway cache sits before a notes server with two readers. Set the freshness window, cut it when the list changes, and keep drafts private.',
  overview: 'Six operations return a cacheable result: server/discover, tools/list, prompts/list, resources/list, resources/templates/list and resources/read. A complete result from any of them carries ttlMs and cacheScope. ttlMs is a freshness hint, an integer of zero or more milliseconds: a response is fresh while now is before the time received plus ttlMs; zero means stale at once; a negative value is treated as zero. It is not a polling interval. cacheScope says for whom: "public" content holds nothing caller-specific and may be stored once and served to anyone, while "private" content may only be replayed within the same authorization context, never across users or tokens. cacheScope is never an access control; per-primitive authorization still applies. A cache entry is identified by the method together with the parameters that affect the result, such as the uri for resources/read or the cursor for a page, and a client must not serve a cached response for a different method or parameters. input_required results and MRTR retries are never cached. TTL and notifications work together: a list_changed notification (or resources/updated) invalidates the matching cache immediately, and the TTL avoids needless refetches between notifications; a server may ship ttlMs without listChanged, in which case the TTL is the only signal. Pagination uses opaque cursors: a response may include nextCursor, and the client sends that exact string back as cursor; the server picks the page size, an empty string is a legal cursor, an invalid cursor is -32602, and only an absent nextCursor ends the list. Each page is its own cacheable response with its own TTL, measured from when that page arrived. Lists should keep a stable order so caches and upstream prompt caches see identical bytes. The newsroom is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'ttlMs', 'cacheScope', 'pagination', 'cursor', 'list_changed', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.6, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { ttl: 60000, invalidate: true, keyed: true, priv: true, noMrtr: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', PLUM = '#7B6FA8', BLUE = '#5B8DB8';
    /* a time rail: the freshness band grows along it, a gold post marks the change at 40 s */
    const X0 = -2.75, SC = 3.6 / 70;
    const rail = P.box(3.6, 0.04, 0.3, '#D8D2C4', { r: 0.02 }); rail.position.set(X0 + 1.8, 0, -0.85); S.add(rail);
    const bandM = new THREE.MeshLambertMaterial({ color: GOOD }), band = P.box(1, 0.08, 0.2, '#fff', { r: 0.005, material: bandM }); band.position.set(X0, 0.04, -0.85); S.add(band);
    const chg = P.box(0.05, 0.34, 0.05, SAF, { r: 0.005 }); chg.position.set(X0 + CHANGE * SC, 0, -1.05); S.add(chg);
    /* seven requests along the same rail: blue hit, grey miss, red wrong */
    const rows = REQS.map((r, i) => { const l = P.lamp(OFF, { h: 0.08, r: 0.07 }); l.position.set(X0 + r.t * SC, 0, -0.5 + (i % 2) * 0.17); S.add(l); return l; });
    /* the cache shelf between two readers; a leak pipe if a private draft is shared */
    const shelf = P.shelf(4, { cell: 0.24, levels: 2, lh: 0.22, d: 0.34 }); shelf.position.set(-1.0, 0, 0.3); S.add(shelf);
    const awa = P.robot('#3D6BD6', { scale: 0.56 }), bakary = P.robot('#E07A5F', { scale: 0.56 }); awa.position.set(-2.1, 0, 0.3); bakary.position.set(0.1, 0, 0.3); S.add(awa, bakary);
    const leak = P.pipe([V(-0.5, 0.2, 0.3), V(-0.3, 0.22, 0.3), V(-0.1, 0.2, 0.3)], BAD, { r: 0.04, n: 3 }); S.add(leak);
    S.add(P.keep(-2.9, 1.0, 0.75, -1.2, 0.55));
    const parts = [awa, bakary, leak];

    let R = null;
    function draw() {
      R = run(st);
      const end = Math.min(70, st.invalidate ? Math.min(st.ttl / 1000, CHANGE) : st.ttl / 1000);
      const w = Math.max(0.02, end * SC); band.scale.x = w; band.position.x = X0 + w / 2;
      bandM.color.set(st.invalidate ? GOOD : SAF);
      R.rows.forEach((x, i) => rows[i].userData.set({ color: !x.ok ? BAD : x.v.startsWith('hit') ? BLUE : OFF, on: true }));
      shelf.userData.set({ fill: [GOOD, GOOD, st.priv ? PLUM : BAD, st.keyed ? BLUE : false, false, false, false, false] });
      leak.visible = !st.priv;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'ttlMs on tools/list', min: 0, max: 60000, step: 5000, fmt: v => `${v} ms`, get: () => st.ttl, set: v => set({ ttl: Math.round(+v) }) },
      { type: 'toggle', label: 'list_changed invalidates at once', short: 'Invalidate', get: () => st.invalidate, set: v => set({ invalidate: !!v }) },
      { type: 'toggle', label: 'Key by method and parameters', short: 'Cache key', get: () => st.keyed, set: v => set({ keyed: !!v }) },
      { type: 'toggle', label: 'Private results stay private', short: 'Private', get: () => st.priv, set: v => set({ priv: !!v }) },
      { type: 'toggle', label: 'Never cache input_required', short: 'No MRTR cache', get: () => st.noMrtr, set: v => set({ noMrtr: !!v }) },
    ];
    const readouts = [
      { label: 'Cache hits', get: () => ({ v: String(R.hits), sub: 'of 7 requests' }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'stale or leaked', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'f', t: 'Freshness window', d: 'ttlMs, cut short by list_changed', icon: 'target', atV: V(-2.75, 0.1, -0.85) },
      { name: 't', t: 'The cache', d: 'Plum: private to one reader', icon: 'check', atV: V(-0.48, 0.3, 0.3) },
    ];
    const reset = () => set({ ...D0, ttl: st.ttl });
    const breaks = [
      { label: 'Ignore list_changed', hint: 'TTL is not the only signal', on: () => set({ ...D0, ttl: 60000, invalidate: false }), off: reset },
      { label: 'Key by method only', hint: 'the uri matters', on: () => set({ ...D0, keyed: false }), off: reset },
      { label: 'Share a private draft', hint: 'cacheScope public', on: () => set({ ...D0, priv: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>With ttlMs ${st.ttl}, the second tools/list ${R.rows[1].v.startsWith('hit') ? 'is a cache hit' : 'goes to the server'}; list_changed at 40 seconds empties the entry so the third fetches fresh; each reader\'s private draft stays theirs; and the input_required reply is never cached.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Fresh for ttlMs', home: true, say: 'A tool list arrives with a thirty-second freshness hint. A second request inside that window is a hit.', act: m => m.set({ ttl: 30000, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
    { t: 'Zero means stale', home: true, say: 'With ttlMs zero, every request goes to the server.', act: m => m.set({ ttl: 0, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
    { t: 'Change beats TTL', home: true, say: 'A list changed notification empties the cache at once, whatever the TTL says.', act: m => m.set({ ttl: 60000, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
    { t: 'The right key', home: true, say: 'A cache entry belongs to a method and its parameters, such as the URI being read.', act: m => m.set({ ttl: 30000, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
    { t: 'Private stays private', home: true, say: 'A reader\'s own draft is private, so the gateway never serves it to someone else.', act: m => m.set({ ttl: 30000, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
    { t: 'Never cache input', home: true, say: 'An input required reply and its retry are never cached.', act: m => m.set({ ttl: 30000, invalidate: true, keyed: true, priv: true, noMrtr: true }) },
  ],
  check: [
    { q: 'A list_changed notification arrives before ttlMs runs out. What happens to the cached list?', options: ['It is invalidated at once', 'It stays until the TTL ends', 'It is extended'], answer: 0, why: 'TTL and notifications work together.', hint: 'Try Ignore list_changed.' },
    { q: 'What identifies a cache entry for resources/read?', options: ['The method and the uri', 'The method alone', 'The time'], answer: 0, why: 'Parameters that affect the result.', hint: 'Try Key by method only.' },
    { q: 'May a gateway serve one user\'s private result to another?', options: ['No', 'Yes, if fresh', 'Only on stdio'], answer: 0, why: 'private never crosses authorization contexts.', hint: 'Try Share a private draft.' },
  ],
  practice: [
    { q: 'A server sends ttlMs -500. How should the client treat it?', options: ['As 0: stale at once', 'As 500', 'As forever', 'As an error'], answer: 0, why: 'Negative values are treated as zero.' },
    { q: 'Is ttlMs a polling interval?', options: ['No, a freshness hint', 'Yes', 'Only for tools/list', 'Only with listChanged'], answer: 0, why: 'It says how long a copy stays fresh.' },
    { q: 'When does a page\'s freshness clock start?', options: ['When that page was received', 'When the first page arrived', 'When the list ends', 'At midnight'], answer: 0, why: 'Each page is its own cacheable result.' },
    { q: 'Which operation\'s results are never cached?', options: ['An input_required result', 'resources/read', 'tools/list', 'server/discover'], answer: 0, why: 'Nor MRTR retries.' },
    { q: 'Does cacheScope "public" mean anyone may read the resource?', options: ['No: it permits sharing a cached copy; access control is separate', 'Yes', 'Only on HTTP', 'Only for prompts'], answer: 0, why: 'cacheScope is never access control.' },
    { q: 'Why should list results keep a stable order?', options: ['Caches and upstream prompt caches see identical bytes', 'It is alphabetical by rule', 'To save memory', 'It does not matter'], answer: 0, why: 'Predictable caching.' },
  ],
  terms: [
    ['CacheableResult', 'A result carrying ttlMs and cacheScope.'],
    ['ttlMs', 'Milliseconds a copy stays fresh; a hint, not a poll interval.'],
    ['cacheScope', 'public (shareable) or private (one authorization context).'],
    ['Cache key', 'The method plus the parameters that affect the result.'],
    ['Invalidation', 'A list_changed or updated notification ending freshness.'],
    ['Cursor', 'An opaque string for the next page; empty is legal.'],
  ],
  deeper: '<p><b>Six cacheable operations.</b> server/discover, tools/list, prompts/list, resources/list, resources/templates/list and resources/read.</p><p><b>About this machine.</b> The newsroom and timings are invented.</p>',
  code: {
    title: 'A cache that respects scope and change',
    note: 'Written for this lesson.',
    text: `
def lookup(cache, req, principal, now):
    key = (req["method"], req["params"].get("uri"), req["params"].get("cursor"))
    e = cache.get(key)
    if not e or now >= e["received"] + max(0, e["ttlMs"]):
        return None                                    # stale or missing
    if e["scope"] == "private" and e["principal"] != principal:
        return None                                    # never across users
    return e["result"]

def store(cache, req, res, principal, now):
    if res.get("resultType") != "complete":
        return                                         # input_required is never cached
    key = (req["method"], req["params"].get("uri"), req["params"].get("cursor"))
    cache[key] = {"result": res, "received": now, "ttlMs": res["ttlMs"],
                  "scope": res["cacheScope"], "principal": principal}

def on_list_changed(cache, method):
    for k in [k for k in cache if k[0] == method]:
        del cache[k]                                   # invalidate at once
`,
  },
};
