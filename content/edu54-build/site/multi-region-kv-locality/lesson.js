// Multi-region serving and KV-cache locality (phase 17, lesson 11): a pan-African bank serves a support model from Lagos, Nairobi and
// Johannesburg, four replicas each. Requests share long system prompts; a replica holding a prompt's prefix in its KV cache answers in about
// 80 ms, a cold prefill takes about 800 ms. Round-robin or prefix-aware routing, whether a request may cross regions for a hot prefix (paying the
// round trip), and whether the disaster-recovery copy holds every file a replica needs are set; hit rate, median and tail TTFT, and failover
// are computed live.
const HIT = 80, MISS = 800, PREFIXES = 6, REPS = 4;
const RTT = { same: 0, near: 60, far: 140 };
function sim(o) {
  const N = 400; let lat = [], hits = 0, cross = 0;
  for (let i = 0; i < N; i++) {
    const p = i % PREFIXES, home = i % 3, rep = o.route === 'prefix' ? p % REPS : (i * 7) % REPS;
    const homeHot = o.route === 'prefix' ? true : rep === p % REPS;
    let t;
    if (o.cross && o.route === 'prefix' && home !== 2) { t = HIT + RTT.far + (o.remoteBusy ? 600 : 0); hits++; cross++; }
    else if (homeHot) { t = HIT; hits++; }
    else if (o.cross && o.route !== 'prefix') { t = HIT + RTT.far + (o.remoteBusy ? 600 : 0); cross++; }
    else t = MISS;
    t += 20 + ((i * 37) % 13) * 4;
    lat.push(t);
  }
  lat.sort((a, b) => a - b);
  const files = ['weights', 'tokenizer', 'quantisation scales', 'RoPE scaling config', 'chat template', 'engine flags'];
  const backed = o.fullDR ? files : files.slice(0, 1);
  return { hit: hits / N, p50: lat[Math.floor(N * 0.5)], p99: lat[Math.floor(N * 0.99)], cross: cross / N, files, backed, failover: o.fullDR };
}

export default {
  slug: 'multi-region-kv-locality',
  title: 'Multi-region serving: route to the warm cache',
  description: 'A pan-African bank serves its support model from Lagos, Nairobi and Johannesburg, four replicas in each.',
  overview: 'Round-robin load balancing is ideal for stateless services and actively harmful for cached model serving. Inference is stateful: a replica\'s KV cache holds the processed start of every recent prompt, so a request that lands where its prefix is already cached skips most of prefill, about 80 ms to the first token instead of about 800 ms for a two-thousand-token prompt. Spread requests evenly and most land on cold replicas. Cache-aware routing hashes each prompt\'s prefix and sends it to the replica holding that prefix; replicas publish cache events (block added, block evicted) and the router keeps an index from prefix to replica, falling back to the shortest queue when nothing matches. vLLM\'s router and llm-d work this way; SGLang\'s RadixAttention does the same reuse inside one replica. A router that hits the cache for most requests gets close to single-replica speed at fleet capacity. Across regions a new cost appears: the network round trip. Sending a request from Lagos to a warm cache in Johannesburg saves prefill but pays the round trip, and if the remote region is busy the saving vanishes; managed cross-region features route for availability, not for cache locality. Disaster recovery is a separate trap. Teams back up the weights and forget the tokenizer, the quantisation scales, the RoPE scaling settings, the chat template and the engine flags, and the standby replica won\'t start, or starts and answers wrongly. Back up everything a replica needs, and test the failover regularly.',
  keywords: ['KV cache', 'cache-aware routing', 'multi-region', 'disaster recovery', 'vLLM', 'inference serving', 'latency'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { route: 'prefix', cross: false, remoteBusy: true, fullDR: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const PC = ['#5B8DB8', SAF, '#8C6BB1', GOOD, BAD, '#3B3F52'];
    const REG = [['Lagos', -2.15, -0.55], ['Nairobi', -0.35, -0.95], ['Johannesburg', -0.6, 0.35]];
    const regions = REG.map(([n, x, z], r) => {
      const pad = P.box(1.55, 0.03, 0.75, '#F6F1E6', { r: 0.04 }); pad.position.set(x, 0.12, z); floor.add(pad);
      const reps = Array.from({ length: REPS }, (_, k) => {
        const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.3, 0.3, 0.4, '#fff', { r: 0.04, material: m }); b.position.set(x - 0.53 + k * 0.35, 0.15, z); floor.add(b);
        const chips = Array.from({ length: 3 }, (_, c) => { const cm = new THREE.MeshLambertMaterial({ color: '#FFF' }), cb = P.box(0.07, 0.06, 0.07, '#fff', { r: 0.01, material: cm }); cb.position.set(x - 0.6 + k * 0.35 + c * 0.075, 0.46, z); cb.userData.noFit = true; floor.add(cb); return cm; });
        return { m, chips };
      });
      return { reps };
    });
    const links = [[0, 2], [0, 1], [1, 2]].map(([a, b]) => { const r = P.rod(V(REG[a][1], 0.2, REG[a][2]), V(REG[b][1], 0.2, REG[b][2]), 0.012, SAF); floor.add(r); return r; });
    const dm = new THREE.MeshLambertMaterial({ color: '#FFF' }), db = P.box(1.7, 0.06, 1.95, '#fff', { r: 0.04, material: dm }); db.position.set(2.1, 0.12, -0.3); floor.add(db);

    const sm = new THREE.MeshLambertMaterial({ color: '#FFF' }), strip = P.box(6.0, 0.04, 0.42, '#fff', { r: 0.04, material: sm }); strip.position.set(0, 0.12, 1.4); floor.add(strip);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = sim(st);
      regions.forEach(Rg => Rg.reps.forEach((Rp, k) => {
        const mine = Array.from({ length: PREFIXES }, (_, p) => p).filter(p => (st.route === 'prefix' ? p % REPS === k : (p + k) % 2 === 0)).slice(0, 3);
        Rp.chips.forEach((c, j) => c.color.set(mine[j] !== undefined ? PC[mine[j]] : '#E4DED1'));
        Rp.m.color.set(st.route === 'prefix' ? '#D9F0E9' : '#FFFFFF');
      }));
      links.forEach(l => { l.visible = st.cross; });
      dm.color.set(st.fullDR ? '#D9F0E9' : '#F7DED5');
      const bad = R.p99 > 400 || !st.fullDR;
      sm.color.set(bad ? '#F7D3C8' : '#D9F0E9');

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Let requests cross regions to a warm cache', short: 'Cross regions', get: () => st.cross, set: v => set({ cross: !!v }) },
      { type: 'toggle', label: 'Back up every file a replica needs', short: 'Full backup', get: () => st.fullDR, set: v => set({ fullDR: !!v }) },
      { type: 'buttons', label: 'Route by', options: ['Prompt prefix', 'Round-robin'], get: () => st.route === 'prefix' ? 0 : 1, act: i => set({ route: i ? 'rr' : 'prefix' }) },
    ];
    const readouts = [
      { label: 'Cache hits', get: () => ({ v: `${Math.round(R.hit * 100)}%`, sub: 'of requests', good: R.hit > 0.8, bad: R.hit < 0.5 }) },
      { label: 'Median TTFT', get: () => ({ v: `${R.p50} ms`, sub: `slowest 1%: ${R.p99} ms`, good: R.p50 < 200, bad: R.p50 > 400 }) },
      { label: 'Failover', get: () => ({ v: st.fullDR ? 'works' : 'fails', sub: `${R.backed.length} of ${R.files.length} files backed up`, good: st.fullDR, bad: !st.fullDR }) },
    ];
    const labels = [
      { name: 'reg', t: 'Three regions', d: 'Chips: prompts each replica has cached', icon: 'box', atV: V(-2.95, 0.3, -0.55) },
      { name: 'dr', t: 'The recovery copy', d: 'More than the weights', icon: 'check', atV: V(2.98, 0.17, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Route round-robin', hint: 'blind to the cache', on: () => set({ ...D0, route: 'rr' }), off: reset },
      { label: 'Chase a warm cache across regions', hint: 'the round trip, and a busy region', on: () => set({ ...D0, route: 'rr', cross: true }), off: reset },
      { label: 'Back up only the weights', hint: 'failover', on: () => set({ ...D0, fullDR: false }), off: reset },
    ];
    function status() {
      if (!st.fullDR) return { ok: false, msg: '<b>Johannesburg went down, and the Lagos standby refused to start: the recovery copy held the weights but not the tokenizer, the quantisation scales, the RoPE settings, the chat template or the engine flags.</b> Back up everything a replica needs, and test the failover regularly, not on the day.' };
      if (st.route === 'rr' && st.cross) return { ok: false, msg: `<b>Round-robin misses the cache, so requests chase a warm prefix in another region: they save prefill but pay the round trip, and the busy remote region adds a queue. Slowest 1%: ${R.p99} ms.</b> Fix routing inside each region first; cross regions for availability, not for a cache hit.` };
      if (st.cross) return { ok: false, msg: `<b>A global router found the warmest caches in Johannesburg and sent Lagos and Nairobi traffic there: every request still hit the cache, but paid the round trip and Johannesburg\'s queue, so the median rose to ${R.p50} ms.</b> Keep a warm copy of each prefix in every region; cross regions for availability, not for a cache hit.` };
      if (st.route === 'rr') return { ok: false, msg: `<b>Round-robin spreads requests evenly and ignores the cache: only ${Math.round(R.hit * 100)}% land where their prefix is warm, so the median request waits ${R.p50} ms for its first token instead of about 100.</b> Hash the prompt\'s prefix and route to the replica that holds it.` };
      return { ok: true, msg: `<b>Each prompt\'s prefix goes to the replica holding it: ${Math.round(R.hit * 100)}% cache hits, median time to first token ${R.p50} ms, slowest 1% ${R.p99} ms, all within each region.</b> The recovery copy holds every file, and failover starts.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three regions', home: true, say: 'A pan-African bank serves its support model from Lagos, Nairobi and Johannesburg, four replicas in each.', act: m => m.set({ route: 'rr', cross: false, remoteBusy: true, fullDR: true }) },
    { t: 'Inference has state', home: true, say: 'Each replica keeps the start of recent prompts in its cache. Land on the right one and the first word comes ten times sooner.', act: m => m.set({ route: 'rr', cross: false, remoteBusy: true, fullDR: true }) },
    { t: 'Route by prefix', home: true, say: 'Hash the start of each prompt and send it to the replica that holds it. Most requests now hit the cache.', act: m => m.set({ route: 'prefix', cross: false, remoteBusy: true, fullDR: true }) },
    { t: 'Across the continent', home: true, say: 'Chasing a warm cache in another region saves prefill but pays the round trip, and a busy region erases the gain.', act: m => m.set({ route: 'rr', cross: true, remoteBusy: true, fullDR: true }) },
    { t: 'More than the weights', home: true, say: 'A recovery copy with only the weights won\'t start. The tokenizer, the scales and the settings matter too.', act: m => m.set({ route: 'prefix', cross: false, remoteBusy: true, fullDR: false }) },
    { t: 'Locality, then recovery', home: true, say: 'Route to the warm cache within each region, and back up everything a replica needs, tested.', act: m => m.set({ route: 'prefix', cross: false, remoteBusy: true, fullDR: true }) },
  ],
  check: [
    { q: 'Why is round-robin harmful for cached model serving?', options: ['Requests miss the replica holding their prefix', 'It is too slow to compute', 'It overloads one replica'], answer: 0, why: 'Inference is stateful.', hint: 'Try Route round-robin.' },
    { q: 'When does crossing regions for a warm cache stop paying?', options: ['When the round trip and remote queue exceed the saved prefill', 'Never', 'Always pays'], answer: 0, why: 'Network cost is new across regions.', hint: 'Try Chase a warm cache.' },
    { q: 'Why did the standby fail to start?', options: ['The backup missed the tokenizer, scales and settings', 'The weights were wrong', 'The region was busy'], answer: 0, why: 'Back up every file a replica needs.', hint: 'Try Back up only the weights.' },
  ],
  terms: [
    ['KV cache', 'Stored keys and values for tokens already processed.'],
    ['Prefix cache hit', 'A request whose prompt start is already cached.'],
    ['Cache-aware routing', 'Sending requests to the replica that holds their prefix.'],
    ['Round trip time', 'Network delay to another region and back.'],
    ['Disaster recovery', 'Restoring service elsewhere after a failure.'],
    ['Failover test', 'Starting the standby on purpose to prove it works.'],
  ],
  deeper: '<p><b>Cache events.</b> Replicas publish block-added and block-evicted events; the router keeps a prefix index and falls back to the shortest queue on a miss.</p><p><b>Availability is a different job.</b> Managed cross-region routing moves traffic when a region is short of capacity; it doesn\'t know about your caches, so keep an application-level router too.</p><p><b>About this machine.</b> Hit and miss times, round trips and the six shared prompts are illustrative; routing and latency are computed live.</p>',
  code: {
    title: 'A prefix-aware router',
    note: 'Adapted from the course\'s cache-aware routing sketch (code/main.py).',
    text: `
class Router:
    def __init__(self, replicas):
        self.replicas, self.index = replicas, {}          # prefix hash -> replica

    def on_cache_event(self, replica, prefix_hash, kind):
        if kind == "block_added": self.index[prefix_hash] = replica
        elif self.index.get(prefix_hash) is replica: del self.index[prefix_hash]

    def route(self, prompt_tokens):
        h = hash(tuple(prompt_tokens[:512]))
        hot = self.index.get(h)
        if hot and hot.region == self.region and hot.queue < MAX_QUEUE:
            return hot                                     # warm cache, same region
        return min(self.local_replicas(), key=lambda r: r.queue)

DR_FILES = ["weights", "tokenizer.json", "quantize_config.json", "rope_scaling", "chat_template", "engine_args"]
`,
  },
};
