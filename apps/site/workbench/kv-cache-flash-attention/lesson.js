// KV cache: a legal-research assistant at a firm in Lagos serves long contracts on one 80 GB GPU. The GPU is a tray of memory blocks: grey for the model's weights,
// coloured for each user's key-value cache, red for blocks reserved but unused. Cache size is exact (2 × layers × KV heads × head size × bytes × tokens);
// the time to write one token, with and without the cache, uses a simple count of the work. Break it: no KV cache (every new token recomputes keys and values
// for the whole contract), full multi-head attention instead of grouped-query (the cache is 8× larger and only two users fit), reserve the maximum length for
// every user instead of paging (most of the memory sits empty).
const GB = 1024 ** 3, MODEL = { layers: 80, heads: 64, dhead: 128, weights: 35 };   // a 70B model in 4-bit weights
const USERS = [{ n: 'Contract A', toks: 24000, c: '#1F9E89' }, { n: 'Contract B', toks: 9000, c: '#3B3F8F' }, { n: 'Email thread', toks: 3000, c: '#C9A227' }, { n: 'Lease', toks: 14000, c: '#7A3B69' }, { n: 'Judgment', toks: 30000, c: '#EE6352' }];
const MAXLEN = 128000;

export default {
  slug: 'kv-cache-flash-attention',
  title: 'KV cache: memory for every word',
  description: 'A legal-research assistant at a firm in Lagos serves long contracts on one 80 GB GPU.',
  overview: 'When a decoder writes token t, attention needs the keys and values of every earlier token. Recomputing them for the whole context at every step makes generation quadratic; storing them in a KV cache makes each new token cost one step. The cache costs memory: 2 (keys and values) × layers × key-value heads × head size × bytes per number × tokens. For a 70-billion-parameter model with 80 layers it is about 2.5 MB per token with full multi-head attention, so long contexts and many users fill a GPU fast. Grouped-query attention lets several query heads share one key-value head, shrinking the cache by the same factor, 8× for Llama-style models; multi-head latent attention compresses further. PagedAttention stores the cache in fixed blocks allocated as needed instead of reserving the maximum length for every request, which is what lets servers like vLLM batch many users. Flash Attention, the companion trick, tiles the attention computation in fast on-chip memory so the full score matrix is never written out.',
  keywords: ['kv cache', 'grouped-query attention', 'pagedattention', 'flash attention', 'inference', 'gpu memory'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.1], dir: [0.1, 1.0, 1.1], half: 1.6, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { cache: true, kv: 8, paged: true, users: 5 };
    const ink = '#151827', COLS = 20, ROWS = 10, CELL = 0.23, BLOCK_GB = 80 / (COLS * ROWS);
    const geo = new THREE.BoxGeometry(CELL * 0.86, 1, CELL * 0.86); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), COLS * ROWS); im.frustumCulled = false; im.userData.noFit = true; floor.add(im);
    const keep = P.box(COLS * CELL, 0.25, ROWS * CELL, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-0.75, 0.2, -0.1); floor.add(keep);

    /* legend chips per user, along the right */
    const chips = USERS.map((u, i) => { const pl = P.box(1.05, 0.22, 0.07, '#FBF8F1', { r: 0.02 }); pl.position.set(2.75, 0.12, -1.0 + i * 0.36); floor.add(pl);
      const sw = P.box(0.16, 0.16, 0.08, u.c, { r: 0.02 }); sw.position.set(2.32, 0.15, -1.0 + i * 0.36 + 0.005); floor.add(sw);
         return { pl, sw }; });
    /* the decode-time bar in front */
    const tb = P.box(1, 0.08, 0.26, C.coral, { r: 0.02 }); tb.userData.noFit = true; floor.add(tb);



    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function run() {
      const perTok = 2 * MODEL.layers * st.kv * MODEL.dhead * 2;   // bytes, fp16 cache
      const users = USERS.slice(0, st.users);
      const blocksW = Math.ceil(MODEL.weights / BLOCK_GB), free = COLS * ROWS - blocksW;
      let used = 0, fit = 0; const alloc = [];
      users.forEach(u => { const need = perTok * u.toks / GB, res = st.paged ? need : perTok * MAXLEN / GB, b = Math.ceil(res / BLOCK_GB), real = Math.ceil(need / BLOCK_GB);
        if (used + b <= free) { alloc.push({ u, b, real }); used += b; fit++; } else alloc.push({ u, b: 0, real: 0, out: true }); });
      const wasted = alloc.reduce((a, x) => a + (x.b - x.real), 0);
      const ctx = 24000, ms = st.cache ? 45 : 45 * ctx / 900;   // without a cache, one word redoes the whole context
      return { perTok, blocksW, alloc, fit, wasted, ms, users: users.length, perTokMB: perTok / 1024 / 1024 };
    }
    function draw() {
      R = run();
      let k = 0;
      const put = (h, c) => { const i = k % COLS, j = Math.floor(k / COLS); m4.makeScale(1, h, 1).setPosition(-0.75 - COLS * CELL / 2 + (i + 0.5) * CELL, 0.16, -0.1 - ROWS * CELL / 2 + (j + 0.5) * CELL); im.setMatrixAt(k, m4); im.setColorAt(k, col.set(c)); k++; };
      for (let b = 0; b < R.blocksW; b++) put(0.14, '#8E91A3');
      R.alloc.forEach(a => { for (let b = 0; b < a.b; b++) put(b < a.real ? 0.22 : 0.06, b < a.real ? a.u.c : '#E8A0A0'); });
      while (k < COLS * ROWS) put(0.02, '#3A3D4F');
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      chips.forEach((c, i) => { const a = R.alloc[i]; const on = i < R.users; c.pl.visible = on; c.sw.visible = on;  if (!on) return;
         });
      const w = Math.min(4.5, Math.log10(R.ms) / Math.log10(2000) * 4.5); tb.scale.x = Math.max(0.05, w); tb.position.set(-2.6 + w / 2, 0.12, 1.55); tb.material.color.set(R.ms > 200 ? '#D64545' : C.coral);

    }
    draw();
    const controls = [
      { type: 'toggle', label: 'KV cache', short: 'cache', get: () => st.cache, set: v => { st.cache = v; draw(); } },
      { type: 'buttons', label: 'Key-value heads', options: ['8 (grouped-query)', '64 (full multi-head)'], get: () => (st.kv === 8 ? 0 : 1), act: i => { st.kv = i ? 64 : 8; draw(); } },
      { type: 'buttons', label: 'Cache memory', options: ['Paged, as needed', 'Reserve 128K each'], get: () => (st.paged ? 0 : 1), act: i => { st.paged = !i; draw(); } },
      { type: 'slider', label: 'Users at once', min: 1, max: 5, step: 1, get: () => st.users, set: v => { st.users = v; draw(); } },
    ];
    const readouts = [
      { label: 'Cache per token', get: () => ({ v: `${R.perTokMB.toFixed(2)} MB`, sub: '2 × 80 layers × heads × 128 × 2 bytes', bad: R.perTokMB > 1, good: R.perTokMB < 0.5 }) },
      { label: 'Users served', get: () => ({ v: `${R.fit} of ${R.users}`, good: R.fit === R.users, bad: R.fit < R.users }) },
      { label: 'Next word', get: () => ({ v: R.ms >= 1000 ? `${(R.ms / 1000).toFixed(1)} s` : `${Math.round(R.ms)} ms`, sub: 'for a 24,000-token contract', good: R.ms < 100, bad: R.ms > 200 }) },
    ];
    const labels = [
      { name: 'gpu', t: 'GPU memory blocks', d: 'Grey weights, colours caches, pink reserved', icon: 'box', atV: V(-0.75 - COLS * CELL / 2 - 0.1, 0.2, -0.1) },
      { name: 'users', t: 'Who fits', d: 'Each user\'s cache size', icon: 'check', atV: V(3.2, 0.2, -0.28) },
    ];
    const reset = () => { Object.assign(st, { cache: true, kv: 8, paged: true, users: 5 }); draw(); };
    const breaks = [
      { label: 'No KV cache', hint: 'Recompute everything', on: () => { reset(); st.cache = false; draw(); }, off: reset },
      { label: 'Full multi-head attention', hint: '64 key-value heads', on: () => { reset(); st.kv = 64; draw(); }, off: reset },
      { label: 'Reserve the maximum', hint: '128K for every user', on: () => { reset(); st.paged = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.cache) return { ok: false, msg: `<b>${(R.ms / 1000).toFixed(1)} seconds for every word.</b> Without a cache, writing each new word recomputes keys and values for all 24,000 tokens of the contract, so the work per word grows with the length, and the whole answer with its square. Store each token's keys and values once, and every new word costs one step: about 45 ms.` };
      if (st.kv === 64) return { ok: false, msg: `<b>Only ${R.fit} of ${R.users} users fit.</b> With a key-value head for every one of 64 query heads, the cache takes ${R.perTokMB.toFixed(2)} MB per token: the 24,000-token contract alone needs ${(R.perTokMB * 24000 / 1024).toFixed(0)} GB, and the 30,000-token judgment would need ${(R.perTokMB * 30000 / 1024).toFixed(0)} GB, more than is left after the weights. Grouped-query attention lets 8 query heads share each key-value head: 8× smaller, with almost no loss in quality.` };
      if (!st.paged) return { ok: false, msg: `<b>Most of the memory sits empty.</b> Reserving room for 128,000 tokens per user, when contracts average far less, leaves ${R.wasted} blocks (${(R.wasted * BLOCK_GB).toFixed(0)} GB, pink) reserved but unused, and only ${R.fit} of ${R.users} users fit. PagedAttention hands out cache blocks as each conversation grows, like virtual memory.` };
      return { ok: true, msg: `<b>All ${R.fit} users fit, ${Math.round(R.ms)} ms per word.</b> Weights take ${Math.round(R.blocksW * BLOCK_GB)} GB; with 8 key-value heads each token's cache is ${R.perTokMB.toFixed(2)} MB, paged as each document grows, so five long legal documents share one GPU, and the cache means each new word costs one step.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Long contracts', home: true, say: 'A legal-research assistant at a firm in Lagos reads long contracts for five lawyers at once, on one GPU.', act: m => m.set({ cache: true, kv: 8, paged: true, users: 5 }) },
    { t: 'Remember the past', home: true, say: 'To write each new word, attention needs the keys and values of every earlier word. The KV cache stores them, so they are computed once.', act: m => m.set({}) },
    { t: 'Without it', home: true, say: 'Switch the cache off, and every new word recomputes the whole contract. Seconds per word instead of milliseconds.', act: m => m.set({ cache: false }) },
    { t: 'The cache is big', home: true, say: 'The cost is memory. With a key-value head for every query head, the long documents fill the GPU, and only two lawyers fit.', act: m => m.set({ cache: true, kv: 64 }) },
    { t: 'Share heads', home: true, say: 'Grouped-query attention lets eight query heads share each key-value head. The cache shrinks eight times, and everyone fits.', act: m => m.set({ kv: 8 }) },
    { t: 'Page it', home: true, say: 'Reserve the longest possible context for everyone, and most memory sits empty. Paged memory hands out blocks only as needed.', act: m => m.set({ paged: false }) },
  ],
  check: [
    { q: 'What does the KV cache store?', options: ['The keys and values of earlier tokens, so they are not recomputed', 'The model\'s weights', 'The user\'s password'], answer: 0, why: 'Each new token then costs one step.' },
    { q: 'How does grouped-query attention shrink the cache?', options: ['Several query heads share one key-value head', 'It removes layers', 'It shortens the context'], answer: 0, why: '8 query heads per key-value head gives 8× smaller.' },
    { q: 'What does paged attention avoid?', options: ['Reserving the maximum length of cache for every request', 'Computing attention at all', 'Using a GPU'], answer: 0, why: 'Blocks are handed out as needed.' },
  ],
  terms: [
    ['KV cache', 'Stored keys and values of earlier tokens.'],
    ['Grouped-query attention', 'Query heads sharing fewer key-value heads.'],
    ['PagedAttention', 'Storing the cache in blocks allocated as needed.'],
    ['Flash Attention', 'Tiling attention in fast on-chip memory without writing the score matrix.'],
    ['Decode step', 'The work to produce one new token.'],
    ['Continuous batching', 'Adding and removing requests from a batch as they start and finish.'],
  ],
  deeper: '<p><b>Flash Attention.</b> Standard attention writes the full score matrix to GPU memory and reads it back; Flash Attention computes it tile by tile in fast on-chip memory with a running softmax, so long contexts fit and run faster. The KV cache and Flash Attention solve different halves of the same problem.</p><p><b>Serving cheaply.</b> Firms and start-ups across the region often serve models on one or two GPUs. Cache size per token, set by key-value heads, layers and precision, decides how many users that hardware can take.</p><p><b>About this machine.</b> Cache sizes are exact for the stated shape; decode times use a simple count of the work, to show the difference a cache makes.</p>',
  code: {
    title: 'KV cache size and a cached decode step',
    note: 'Adapted from the course\'s KV cache lesson.',
    text: `
def kv_bytes_per_token(layers=80, kv_heads=8, d_head=128, dtype_bytes=2):
    return 2 * layers * kv_heads * d_head * dtype_bytes   # K and V

print(kv_bytes_per_token() / 2**20, "MB per token")      # 0.31 with grouped-query
print(kv_bytes_per_token(kv_heads=64) / 2**20)           # 2.5 with full multi-head

def decode_step(x, cache, Wq, Wk, Wv):
    q, k, v = x @ Wq, x @ Wk, x @ Wv                     # only the new token
    cache["k"].append(k); cache["v"].append(v)
    K, V = np.stack(cache["k"]), np.stack(cache["v"])
    a = softmax(q @ K.T / np.sqrt(K.shape[1]))
    return a @ V
`,
  },
};
