// Inference optimisation: a farm advice chat service for growers around Kigali, Arusha and Kumasi runs an 8B model on one 80 GB GPU (2 TB/s, 312 TFLOPS).
// Each decode step reads every weight (16 GB in BF16) plus each active conversation's KV cache (128 KB per token: 32 layers × 8 KV heads × 128 × 2 × 2 bytes),
// and does 2 × 8e9 operations per token: step time = max(bytes ÷ bandwidth, operations ÷ compute). The GPU's lanes are batch slots; answers have similar or
// varied lengths; static batching refills only when the whole batch is done, continuous batching refills each slot at once. Throughput, slot use and compute
// use come from a 6,000-step run of the same scheduler the lanes animate. Break it: one user at a time, static batches with varied answers, 128K conversations.
const GB = 1e9, W = 16 * GB, BW = 2e12, PEAK = 312e12, OPS = 2 * 8e9, KVT = 131072, FREE = 60 * GB, SLOTS = [1, 4, 16], CTX = [4096, 131072], MAXL = 600;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function sim(st, seed) {
  const r = rng(seed), slots = SLOTS[st.s], kv = CTX[st.c] * KVT, fit = Math.min(slots, Math.floor(FREE / kv));
  let id = 0, done = 0, toks = 0, busy = 0, time = 0, steps = 0;
  const len = () => (st.vary ? Math.min(MAXL, 20 + Math.floor(-Math.log(1 - r()) * 150)) : 180 + Math.floor(r() * 40));
  const lanes = Array.from({ length: slots }, (_, i) => ({ i, req: null, ok: i < fit }));
  const fill = l => { l.req = { id: id++, L: len(), g: 0 }; };
  function step() {
    if (st.stat) { if (lanes.every(l => !l.ok || !l.req || l.req.g >= l.req.L)) lanes.forEach(l => l.ok && fill(l)); }
    else lanes.forEach(l => { if (l.ok && (!l.req || l.req.g >= l.req.L)) fill(l); });
    const act = lanes.filter(l => l.ok && l.req && l.req.g < l.req.L);
    const dt = Math.max((W + act.length * kv) / BW, act.length * OPS / PEAK);
    act.forEach(l => { l.req.g++; if (l.req.g >= l.req.L) done++; });
    toks += act.length; busy += act.length; time += dt; steps++;
    return dt;
  }
  return { lanes, fit, kv, step, get stats() { return { toks, time, steps, done, use: busy / (steps * slots), tps: toks / time, comp: (toks * OPS / time) / PEAK }; } };
}
const COLS = ['#1F9E89', '#E07B39', '#3A6FB0', '#C9A227', '#7E57C2', '#D3545A', '#4E9F3D', '#B5541C'];

export default {
  slug: 'inference-optimization',
  title: 'Inference: keep the GPU busy',
  description: 'A farm advice chat service for growers around Kigali, Arusha and Kumasi runs one model on one GPU. Writing each word means reading every weight from memory, so the trick is to write many people\'s words per read. Then serve one user at a time, wait for whole batches to finish, or give everyone a very long conversation.',
  overview: 'Answering a request has two phases. Prefill reads the whole prompt at once: thousands of tokens go through each weight matrix together, so the GPU\'s arithmetic units are the limit. Decode then writes the answer one token at a time, and every token needs every weight read from memory again. For an 8-billion-parameter model in 16-bit numbers that is 16 GB per step; at 2 TB/s that alone takes 8 milliseconds, while the arithmetic for one token takes a twentieth of a millisecond. Decode is limited by memory bandwidth, not compute. So the main lever is batching: put many requests through each read of the weights, and one 8-millisecond step writes a token for every one of them. Static batching starts a batch together and waits until its longest answer is done, so slots that finished early sit empty. Continuous batching, used by vLLM and most servers, checks every step and drops a waiting request into any free slot. Each conversation also keeps a key-value cache that grows with its length (128 KB per token here), and that cache, not the weights, decides how many requests fit at once. Paged memory, quantisation and speculative decoding, each covered in its own lesson, push the same levers: read less, and write more tokens per read.',
  keywords: ['inference optimization', 'prefill', 'decode', 'memory bandwidth', 'continuous batching', 'static batching', 'kv cache', 'throughput', 'vllm', 'arithmetic intensity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { stat: false, s: 2, vary: true, c: 0 };
    const ink = '#151827';
    const base = P.box(6.2, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* queue of waiting requests at the left */
    const qp = P.box(0.8, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); qp.position.set(-2.55, 0.12, 0.1); S.add(qp);
    const qH = S.text('Waiting', { size: 0.1, weight: 800, color: '#6B5E86' }); qH.position.set(-2.55, 0.18, -1.0); S.add(qH);
    const qb = Array.from({ length: 7 }, (_, k) => { const b = P.box(0.5, 0.08, 0.18, COLS[(k + 3) % 8], { r: 0.03 }); b.position.set(-2.55, 0.15, -0.72 + k * 0.24); S.add(b); return b; });
    const qT = S.text('Questions keep\ncoming in', { size: 0.07, weight: 700, color: '#5E5E6E' }); qT.position.set(-2.55, 0.18, 1.1); S.add(qT);
    /* the GPU: one lane per batch slot */
    const gp = P.box(3.6, 0.05, 2.5, '#2B2F3A', { r: 0.04 }); gp.position.set(-0.15, 0.12, 0.1); S.add(gp);
    const gH = S.text('', { size: 0.085, weight: 800, color: '#FFFFFF', maxW: 3.4 }); gH.position.set(-0.15, 0.18, -1.0); S.add(gH);
    const X0 = -1.8, XL = 3.2, laneZ = (i, n) => 0.05 + (i - (n - 1) / 2) * (n === 4 ? 0.4 : 0.11);
    const lanes = Array.from({ length: 16 }, () => {
      const track = P.box(XL, 0.02, 0.07, '#3E4352', { r: 0 }); S.add(track);
      const mm = new THREE.MeshLambertMaterial({ color: COLS[0] }), bar = P.box(1, 0.06, 0.08, '#fff', { r: 0, material: mm }); bar.userData.noFit = true; S.add(bar);
      const no = S.text('no room for its cache', { size: 0.06, weight: 800, color: '#FF8A80' }); no.userData.noFit = true; S.add(no);
      return { track, bar, mm, no };
    });
    const gF = S.text('', { size: 0.08, weight: 800, color: '#FFFFFF', maxW: 3.4 }); gF.position.set(-0.15, 0.18, 1.12); S.add(gF);
    /* GPU memory at the right: weights, caches, free */
    const mp = P.box(1.0, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); mp.position.set(2.5, 0.12, 0.1); S.add(mp);
    const mH = S.text('GPU memory\n80 GB', { size: 0.085, weight: 800, color: '#6B5E86' }); mH.position.set(2.5, 0.18, -0.98); S.add(mH);
    const MH = 1.1, seg = ['#8A8A96', '#1F9E89', '#E6E0D2'].map(c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.42, 1, 0.42, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return b; });
    const mT = S.text('', { size: 0.07, weight: 700, color: ink, maxW: 0.9 }); mT.position.set(2.5, 0.18, 0.75); S.add(mT);
    const keep = P.box(6.0, 1.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); S.add(keep);

    let R = null, live = null, acc = 0, shown = 0;
    function layout() {
      const n = SLOTS[st.s];
      lanes.forEach((L, i) => { const on = i < n, z = laneZ(i, n); L.track.visible = on; L.track.position.set(X0 + XL / 2, 0.17, z); L.bar.visible = false; L.no.visible = on && !live.lanes[i].ok; L.no.position.set(X0 + XL / 2, 0.2, z); });
      const kvGB = live.fit * live.kv / GB, hW = 16 / 80 * MH, hK = Math.max(0.01, kvGB / 80 * MH), hF = Math.max(0.01, MH - hW - hK);
      [hW, hK, hF].forEach((h, k) => { seg[k].scale.y = h; seg[k].position.set(2.5, 0.15 + [0, hW, hW + hK][k], 0.05); });
      mT.userData.set(`Weights 16 GB\nCaches ${kvGB < 10 ? kvGB.toFixed(1) : Math.round(kvGB)} GB\n${(live.kv / GB).toFixed(1)} GB each`);
      gH.userData.set(`Each step reads all 16 GB of weights · ${n} slot${n > 1 ? 's' : ''} · ${st.stat ? 'static' : 'continuous'} batching`);
    }
    function paint() {
      const n = SLOTS[st.s];
      live.lanes.forEach((l, i) => { const L = lanes[i]; if (i >= n || !l.ok || !l.req) { L.bar.visible = false; return; }
        const w = Math.max(0.02, Math.min(l.req.g, MAXL) / MAXL * XL), fin = l.req.g >= l.req.L; L.bar.visible = true; L.bar.scale.x = w; L.bar.position.set(X0 + w / 2, 0.17, laneZ(i, n));
        L.mm.color.set(fin ? '#6E7385' : COLS[l.req.id % 8]); });
      gF.userData.set(`Answers finished: ${live.stats.done}`);
    }
    function draw() {
      R = sim(st, 3); for (let k = 0; k < 6000; k++) R.step(); R = R.stats;
      live = sim(st, 9); acc = 0; shown = 0; layout(); live.step(); paint();
    }
    draw();
    function update(dt) {
      acc += Math.min(dt, 0.1) * 45; let n = 0;
      while (acc >= 1 && n < 40) { acc -= 1; live.step(); n++; }
      if (n) paint();
      shown += dt; if (shown > 0.6) { shown = 0; qb.forEach((b, k) => b.position.set(-2.55, 0.15, -0.72 + ((k + live.stats.done) % 7) * 0.24)); }
    }
    const controls = [
      { type: 'buttons', label: 'Batching', options: ['Static', 'Continuous'], get: () => (st.stat ? 0 : 1), act: i => { st.stat = !i; draw(); } },
      { type: 'buttons', label: 'Batch slots', options: SLOTS.map(String), get: () => st.s, act: i => { st.s = i; draw(); } },
      { type: 'buttons', label: 'Answer lengths', options: ['Similar', 'Varied'], get: () => +st.vary, act: i => { st.vary = !!i; draw(); } },
      { type: 'buttons', label: 'Conversation length', options: ['4K tokens', '128K tokens'], get: () => st.c, act: i => { st.c = i; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens per second', get: () => ({ v: Math.round(R.tps).toLocaleString('en'), sub: 'for everyone together', good: R.tps > 1000, bad: R.tps < 300 }) },
      { label: 'Slots in use', get: () => ({ v: `${Math.round(R.use * 100)}%`, sub: `of ${SLOTS[st.s]} slot${st.s ? 's' : ''}`, good: R.use > 0.9, bad: R.use < 0.6 }) },
      { label: 'Arithmetic in use', get: () => ({ v: `${(R.comp * 100).toFixed(1)}%`, sub: 'the rest waits on memory' }) },
    ];
    const labels = [
      { name: 'queue', t: 'Requests waiting', d: 'Each needs a free slot', icon: 'link', atV: V(-2.95, 0.2, -0.3) },
      { name: 'mem', t: 'GPU memory', d: 'Weights, plus a cache per conversation', icon: 'box', atV: V(2.98, 0.2, -0.3) },
    ];
    const reset = () => { Object.assign(st, { stat: false, s: 2, vary: true, c: 0 }); draw(); };
    const breaks = [
      { label: 'One user at a time', hint: 'batch of one', on: () => { reset(); st.s = 0; draw(); }, off: reset },
      { label: 'Static batches, varied answers', hint: 'wait for the longest', on: () => { reset(); st.stat = true; draw(); }, off: reset },
      { label: 'Very long conversations', hint: '128K tokens each', on: () => { reset(); st.c = 1; draw(); }, off: reset },
    ];
    const fmt = v => Math.round(v).toLocaleString('en');
    function status() {
      const n = SLOTS[st.s], fit = Math.min(n, Math.floor(FREE / (CTX[st.c] * KVT)));
      if (fit < n) return { ok: false, msg: `<b>Only ${fit} of ${n} slots can run: ${fmt(R.tps)} tokens a second.</b> A 128K-token conversation keeps ${(CTX[1] * KVT / GB).toFixed(0)} GB of keys and values, so the 60 GB left after the weights holds just ${fit}. The other slots have no room for a cache, and each step also has to read those big caches. Memory, not arithmetic, sets the batch size.` };
      if (n === 1) return { ok: false, msg: `<b>${fmt(R.tps)} tokens a second, with ${(R.comp * 100).toFixed(1)}% of the arithmetic in use.</b> Every token needs all 16 GB of weights read from memory, about 8 ms at 2 TB/s, while the sums take a twentieth of a millisecond. With one request per read, the GPU mostly waits. Batch requests so one read writes many tokens.` };
      if (st.stat && R.use < 0.8) return { ok: false, msg: `<b>Slots busy only ${Math.round(R.use * 100)}% of the time: ${fmt(R.tps)} tokens a second.</b> A static batch waits for its longest answer, so slots whose short answers finished early sit idle (grey bars) while new questions queue. Continuous batching fills each slot the moment it frees up.` };
      if (st.stat) return { msg: `<b>${Math.round(R.use * 100)}% of slots busy with similar answer lengths.</b> When every answer is about as long as the others, static batching wastes little. Make the lengths varied, as real chats are, to see the gap.` };
      return { ok: n === 16, msg: `<b>${fmt(R.tps)} tokens a second, slots busy ${Math.round(R.use * 100)}% of the time.</b> Each 16 GB read of the weights now writes a token for up to ${n} conversations, and a waiting question takes any slot the step it frees up. Arithmetic use is still only ${(R.comp * 100).toFixed(1)}%: big servers batch hundreds of requests.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two phases', home: true, say: 'A farm advice chat service for growers around Kigali, Arusha and Kumasi runs one model on one GPU. Reading a question is quick. Writing the answer, one word at a time, is the slow part.', act: m => m.set({ stat: false, s: 0, vary: true, c: 0 }) },
    { t: 'Waiting on memory', home: true, say: 'For every word it writes, the GPU reads all of the model\'s weights from memory. With one person at a time, its arithmetic sits idle almost the whole time.', act: m => m.set({}) },
    { t: 'Share the read', home: true, say: 'Serve sixteen people at once, and one read of the weights writes a word for each of them. Throughput jumps more than tenfold.', act: m => m.set({ s: 2 }) },
    { t: 'Static batches', home: true, say: 'Now wait for a whole batch to finish before starting the next. Short answers leave their slots empty while the longest one is still writing.', act: m => m.set({ stat: true }) },
    { t: 'Continuous batching', home: true, say: 'Instead, drop a waiting question into any slot the moment it frees up. The slots stay busy.', act: m => m.set({ stat: false }) },
    { t: 'Long conversations', home: true, say: 'Give everyone a very long conversation, and each one\'s memory cache is so large that only three fit on the GPU. The other slots stay empty.', act: m => m.set({ c: 1 }) },
  ],
  check: [
    { q: 'Why is writing an answer limited by memory rather than arithmetic?', options: ['Every new token needs all the weights read again, for very little arithmetic', 'The arithmetic units are too slow for one token', 'The prompt must be read again for every token'], answer: 0, why: 'One token does about two operations per weight read, far below what the GPU can compute in that time.', hint: 'Compare the 8 ms read with the sums.' },
    { q: 'What does continuous batching change?', options: ['A waiting request takes any slot as soon as it frees up', 'Every request in a batch must have the same length', 'The model is split across several GPUs'], answer: 0, why: 'Static batching waits for the longest answer; continuous batching refills each step.', hint: 'Watch the grey bars in static mode.' },
    { q: 'What limits how many conversations fit in one batch?', options: ['The memory each conversation\'s key-value cache needs', 'The number of arithmetic units', 'The length of the model\'s name'], answer: 0, why: 'The cache grows with every token of the conversation.', hint: 'Try 128K tokens.' },
  ],
  terms: [
    ['Prefill', 'Reading the whole prompt in one pass; many tokens share each read of the weights, so arithmetic is the limit.'],
    ['Decode', 'Writing the answer one token at a time; each token needs every weight read, so memory speed is the limit.'],
    ['Memory bandwidth', 'How fast the GPU can move data from its memory to its arithmetic units, in bytes per second.'],
    ['Batching', 'Running several requests through each read of the weights.'],
    ['Continuous batching', 'Refilling a batch slot the moment its request finishes, rather than waiting for the whole batch.'],
    ['KV cache', 'The stored keys and values of every earlier token in a conversation, so they are not computed again.'],
  ],
  deeper: '<p><b>Operations per byte.</b> A GPU has a balance point: an A100 can do about 156 operations for every byte it reads. Decode with one request does about one operation per byte, so it runs at a fraction of a percent of peak. Each request added to the batch adds work without adding weight reads, until the cache reads catch up.</p><p><b>Serving software.</b> vLLM, SGLang and TensorRT-LLM all use continuous batching and paged caches. They also share the cache of a common system prompt between requests, and split long prompts so prefill does not stall everyone else\'s decode.</p><p><b>Latency and throughput.</b> Bigger batches raise tokens per second for everyone but make each step a little slower, so each person waits slightly longer per word. Services choose a batch size that keeps the time per word under a target.</p><p><b>About this machine.</b> Step times follow the read-or-compute rule with an 8B model on an 80 GB A100; answer lengths are drawn at random, and the scheduler you see animating is the one the numbers come from.</p>',
  code: {
    title: 'Static against continuous batching',
    note: 'Adapted from the course\'s inference optimisation lesson.',
    text: `
def step_time(active, weight_bytes=16e9, kv_bytes=0.5e9,
              bandwidth=2e12, peak=312e12, ops_per_token=16e9):
    read = (weight_bytes + active * kv_bytes) / bandwidth
    work = active * ops_per_token / peak
    return max(read, work)            # decode: the read is the limit

def continuous(slots, queue):
    for i, req in enumerate(slots):
        if req is None or req.done:
            slots[i] = queue.pop(0) if queue else None   # refill at once

def static(slots, queue):
    if all(r is None or r.done for r in slots):          # wait for all
        for i in range(len(slots)):
            slots[i] = queue.pop(0) if queue else None
`,
  },
};
