// RadixAttention (phase 17, lesson 6): a Kampala legal helpdesk's prompts share long prefixes. A real radix tree of prompt segments is built below, request by request; a matching node skips prefill.
// Prompt order is a cache key: put a timestamp first and every prefix is new. The scheduler either runs requests as they arrive, evicting the cache between tenants, or groups by shared prefix.
const DOCS = ['lease', 'land', 'lease', 'wage', 'land', 'lease', 'wage', 'lease', 'land', 'lease', 'wage', 'land'];
const SEG = { sys: 1000, tools: 600, doc: 800, q: 100, time: 10 };
function prompts(o) {
  return DOCS.map((d, i) => {
    const q = 'q' + i, base = ['sys', 'tools', 'doc:' + d, q];
    if (o.order === 'time') return ['time:' + i, ...base];
    if (o.order === 'mixed') return i % 2 ? ['sys', 'doc:' + d, 'tools', q] : base;
    return base;
  });
}
const size = s => SEG[s.split(':')[0]] || SEG.q;
function run(o) {
  const list = prompts(o); if (o.sched === 'aware') list.sort((a, b) => a.join('|').localeCompare(b.join('|')));
  let tree = {}, nodes = 0, total = 0, hit = 0;
  list.forEach((p, i) => {
    if (o.sched === 'fifo' && o.small && i % 3 === 0) { tree = {}; nodes = 0; }
    if (!o.cache) tree = {};
    let at = tree;
    p.forEach(s => { const c = size(s); total += c; if (at[s]) hit += c; else { at[s] = {}; nodes++; } at = at[s]; });
  });
  const rate = hit / total;
  return { rate, total, cost: total - hit, nodes, speed: total / Math.max(1, total - hit), tree };
}

export default {
  slug: 'sglang-radixattention',
  title: 'RadixAttention: your prompt template is a cache key',
  description: 'Thousands of prompts share the same beginning. Store it once in a tree, and watch one field out of place wipe out the gain.',
  overview: 'A classic server treats each prompt as opaque. If five thousand requests start with the same two thousand tokens, it computes them five thousand times. RadixAttention, from SGLang, stores token sequences in a radix tree: each node owns the KV blocks for its path from the root. A new request walks the tree, reuses every match and computes only the rest. A cache-aware scheduler then runs requests sharing a prefix together, instead of first come first served, which can evict what the next request needs. The gain rests on discipline you control. Put everything fixed first, and the question last. One timestamp at the front, and no two prompts share anything.',
  keywords: ['RadixAttention', 'SGLang', 'prefix caching', 'KV cache', 'prompt template', 'inference serving'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.05, 0.4, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { order: 'good', sched: 'aware', small: true, cache: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const trunk = P.box(0.22, 0.45, 0.22, '#8A5F3A', { r: 0.03 }); trunk.position.set(-1.2, 0.03, -0.1); S.add(trunk);
    const P1 = V(-1.2, 0.5, -0.1), P2 = V(-1.2, 0.85, -0.1), L3 = [V(-2.0, 1.1, -0.1), V(-1.2, 1.15, -0.1), V(-0.4, 1.1, -0.1)];
    [[P1, P2], ...L3.map(p => [P2, p])].forEach(([a, b]) => S.add(P.rod(a, b, 0.05, '#8A5F3A')));
    const ball = (v, r, c) => { const m = new S.THREE.MeshLambertMaterial({ color: c }), b = P.ball(r, '#fff', { material: m }); b.position.copy(v); S.add(b); return m; };
    const nS = ball(P1, 0.16, GREY), nT = ball(P2, 0.14, GREY), nD = L3.map(v => ball(v, 0.14, GREY));
    const T = [0, 1].map(i => { const t = add(P.tower(0.6, 0.5, i ? '#7B6FA8' : GOOD)); t.position.set(0.9 + i * 0.85, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.5, 2.5, 1.45, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const shared = st.cache && st.order !== 'time', mid = st.order === 'good' && shared;
      nS.color.set(shared ? GOOD : GREY); nT.color.set(mid ? GOOD : shared ? SAF : GREY); nD.forEach(m => m.color.set(mid && (st.sched === 'aware' || !st.small) ? GOOD : mid ? SAF : GREY));
      T[0].userData.set({ h: Math.max(0.05, R.cost / 18000 * 1.1), color: R.rate > 0.6 ? GOOD : BAD });
      T[1].userData.set({ h: Math.max(0.05, Math.min(1.2, R.speed * 0.26)) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const OK = ['good', 'mixed', 'time'], SK = ['aware', 'fifo'];
    const controls = [
      { type: 'buttons', label: 'Prompt template', options: ['Fixed parts first', 'Order varies', 'Timestamp first'], get: () => OK.indexOf(st.order), act: i => set({ order: OK[i] }) },
      { type: 'buttons', label: 'Scheduler', options: ['Cache-aware', 'First come'], get: () => SK.indexOf(st.sched), act: i => set({ sched: SK[i] }) },
      { type: 'toggle', label: 'The cache is small, and gets evicted', short: 'Small cache', get: () => st.small, set: v => set({ small: !!v }) },
      { type: 'toggle', label: 'Prefix cache on', short: 'Cache', get: () => st.cache, set: v => set({ cache: !!v }) },
    ];
    const readouts = [
      { label: 'Tokens from cache', get: () => ({ v: `${Math.round(R.rate * 100)}%`, sub: `${R.nodes} tree nodes now`, good: R.rate > 0.6, bad: R.rate < 0.2 }) },
      { label: 'Tokens computed', get: () => ({ v: `${R.cost.toLocaleString('en')}`, sub: `of ${R.total.toLocaleString('en')}` }) },
      { label: 'Prefill speedup', get: () => ({ v: `${R.speed.toFixed(1)}×`, sub: 'for this batch', good: R.speed > 3, bad: R.speed < 1.5 }) },
    ];
    const labels = [
      { name: 't', t: 'The radix tree', d: 'System, tools, then documents', icon: 'link', atV: V(-2.15, 1.1, -0.1) },
      { name: 'c', t: 'Work left, then speedup', d: 'Teal: mostly served from cache', icon: 'target', atV: V(2.1, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put a timestamp first', hint: 'no two prompts match', on: () => set({ ...D0, order: 'time' }), off: reset },
      { label: 'Swap tools and context sometimes', hint: 'two templates', on: () => set({ ...D0, order: 'mixed' }), off: reset },
      { label: 'First come, first served', hint: 'evicts what the next one needs', on: () => set({ ...D0, sched: 'fifo' }), off: reset },
    ];
    function status() {
      if (!st.cache) return { ok: false, msg: `<b>${R.total.toLocaleString('en')} tokens computed from scratch.</b> The same system prompt was prefilled for every request.` };
      if (st.order === 'time') return { ok: false, msg: `<b>${Math.round(R.rate * 100)}% from cache.</b> A timestamp at the front makes every path through the tree unique, so nothing matches. It costs a few tokens and loses all of the gain. Put anything that changes last.` };
      if (st.order === 'mixed') return { ok: false, msg: `<b>${Math.round(R.rate * 100)}% from cache, not the ${Math.round(run({ ...st, order: 'good' }).rate * 100)}% you could have.</b> Half the prompts swap tools and context, so one tree becomes two. Your template is a cache key. Fix its order.` };
      if (st.sched === 'fifo' && st.small) return { ok: false, msg: `<b>${Math.round(R.rate * 100)}% from cache, down from ${Math.round(run({ ...st, sched: 'aware' }).rate * 100)}%.</b> Requests from different documents arrive mixed, and each evicts what the next needs. Group requests by shared prefix instead.` };
      return { ok: true, msg: `<b>${Math.round(R.rate * 100)}% of tokens came from the tree, ${R.speed.toFixed(1)}× faster prefill.</b> System and tools first, then the document, then the question. Published gains reach about 6.4× on prefix-heavy RAG.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The same start', home: true, say: 'A legal helpdesk in Kampala gets thousands of questions. Most prompts open with the same system text and the same tools.', act: m => m.set({ order: 'good', sched: 'aware', small: true, cache: false }) },
    { t: 'A tree', home: true, say: 'Store prefixes in a tree. Each node owns the memory for its path, and a new request walks down it.', act: m => m.set({ order: 'good', sched: 'aware', small: true, cache: true }) },
    { t: 'Only the rest', home: true, say: 'A match skips that work. The system prompt is computed once, and only the question is new.', act: m => m.set({ order: 'good', sched: 'aware', small: true, cache: true }) },
    { t: 'One timestamp', home: true, say: 'Put a timestamp first, and nothing matches. A few tokens lose the whole gain.', act: m => m.set({ order: 'time', sched: 'aware', small: true, cache: true }) },
    { t: 'Order is a key', home: true, say: 'Swap tools and context in some requests, and one tree becomes two. Your template is a cache key.', act: m => m.set({ order: 'mixed', sched: 'aware', small: true, cache: true }) },
    { t: 'Schedule by prefix', home: true, say: 'First come first served evicts what the next one needs. Grouping by prefix keeps the cache useful.', act: m => m.set({ order: 'good', sched: 'fifo', small: true, cache: true }) },
  ],
  check: [
    { q: 'Where should a timestamp go in a prompt?', options: ['After everything fixed', 'First', 'In the system prompt'], answer: 0, why: 'Anything that changes breaks the prefix after it.', hint: 'Try Put a timestamp first.' },
    { q: 'What does a tree node own?', options: ['The KV blocks for its path', 'A user account', 'A model'], answer: 0, why: 'Requests share those blocks.', hint: 'See A tree.' },
    { q: 'Why is first come first served poor here?', options: ['It evicts prefixes the next request needs', 'It is unfair', 'It uses more GPUs'], answer: 0, why: 'Grouping by prefix keeps the cache warm.', hint: 'Try First come, first served.' },
  ],
  terms: [
    ['Prefix cache', 'Reusing computed work for a shared beginning.'],
    ['Radix tree', 'A tree that merges shared prefixes.'],
    ['RadixAttention', 'SGLang\'s tree-indexed KV cache.'],
    ['Cache-aware scheduling', 'Ordering requests to keep hits.'],
    ['Eviction', 'Dropping cached data to make room.'],
    ['Prefill', 'Processing the prompt before decoding.'],
  ],
  deeper: '<p><b>Same rule at the API.</b> Provider prompt caching rewards the same ordering, so fix your template once and gain twice.</p><p><b>Tenants.</b> Sharing a tree across customers needs thought: cache timing can leak what others asked, so some systems isolate per tenant.</p><p><b>This tree</b> uses twelve requests with round segment sizes. Real gains depend on your traffic.</p>',
  code: {
    title: 'Walk the tree',
    note: 'Adapted from the course\'s toy radix cache (code/main.py).',
    text: `
def prefill(tree, tokens):
    node, matched = tree.root, 0
    for chunk in split(tokens):
        child = node.children.get(chunk)
        if child is None:
            break
        node, matched = child, matched + len(chunk)   # reuse its KV blocks
    return compute_kv(tokens[matched:], past=node.kv)

prompt = [SYSTEM, TOOLS, document, question]          # fixed parts first
`,
  },
};
