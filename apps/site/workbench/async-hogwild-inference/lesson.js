// Hogwild! inference: a maths tutoring service in Accra asks a reasoning model to solve a problem that splits into K cases (4 or 16), each costing 300–700 tokens (seeded),
// after a 500-token setup and before a 300-token combine, both serial. N workers (1, 2, 4, 8) each write one token per step.
// Shared cache, reasoning model: a free worker reads the cache (40 + 15·(N − 1) tokens, more to read with more workers), claims the first unclaimed case and solves it.
// Shared cache, non-reasoning model: it barely reads (10 tokens) and picks any unfinished case, claimed or not. Separate caches: no one sees anyone, so every worker solves every case.
// Done when every case is finished; then the combine. Speed-up = one worker's time ÷ this time. Where segments fall is computed by the event simulation, not drawn by hand.
const SETUP = 500, COMBINE = 300, NS = [1, 2, 4, 8], KS = [4, 16];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function costs(K) { const u = rng(41); return Array.from({ length: K }, () => 300 + Math.round(u() * 400)); }
function sim(st) {
  const N = NS[st.n], K = KS[st.k], W = costs(K), u = rng(9), seg = [], free = Array(N).fill(SETUP);
  const serial = SETUP + W.reduce((a, b) => a + b, 0) + COMBINE;
  seg.push({ w: 0, a: 0, b: SETUP, k: 'serial' });
  if (!st.shared && N > 1) {
    for (let i = 0; i < N; i++) { let t = SETUP; for (let j = 0; j < K; j++) { const c = (j + i * Math.floor(K / N)) % K; seg.push({ w: i, a: t, b: t + W[c], k: i ? 'dup' : 'work', c }); t += W[c]; } }
    seg.push({ w: 0, a: serial - COMBINE, b: serial, k: 'serial' });
    return { N, K, seg, T: serial, serial, tokens: N * (serial - SETUP - COMBINE) + SETUP + COMBINE, dups: (N - 1) * K, idle: 0, c: 0 };
  }
  const claimed = Array(K).fill(false), done = Array(K).fill(Infinity), c = N === 1 ? 0 : st.reason ? 40 + 15 * (N - 1) : 10;
  let tokens = SETUP, dups = 0;
  for (;;) {
    let i = 0; for (let j = 1; j < N; j++) if (free[j] < free[i]) i = j;
    const t = free[i], open = []; for (let j = 0; j < K; j++) if (done[j] > t && !(st.reason && claimed[j])) open.push(j);
    if (!open.length) break;
    const ch = st.reason ? open[0] : open[Math.floor(u() * open.length)], dup = claimed[ch];
    claimed[ch] = true; if (dup) dups++;
    if (c) seg.push({ w: i, a: t, b: t + c, k: 'read' });
    seg.push({ w: i, a: t + c, b: t + c + W[ch], k: dup ? 'dup' : 'work', c: ch });
    done[ch] = Math.min(done[ch], t + c + W[ch]); free[i] = t + c + W[ch]; tokens += c + W[ch];
  }
  const end = Math.max(...done);
  seg.push({ w: 0, a: end, b: end + COMBINE, k: 'serial' }); tokens += COMBINE;
  const used = new Set(seg.filter(s => s.k === 'work' || s.k === 'dup').map(s => s.w));
  return { N, K, seg, T: end + COMBINE, serial, tokens, dups, idle: N - used.size, c };
}

export default {
  slug: 'async-hogwild-inference',
  title: 'Hogwild inference: many workers, one memory',
  description: 'A maths tutoring service in Accra asks a reasoning model about many cases. Hogwild runs workers at once that read each other\'s text, and finish sooner.',
  overview: 'A long chain of reasoning is slow because each token waits for the one before. Speculative decoding speeds up a single chain; Hogwild inference adds another kind of parallelism. It runs N copies of the same model on one shared key-value cache: every token any worker writes is immediately part of every worker\'s context. With a prompt that says, in effect, "you are one of several workers; check what the others are doing and avoid repeating it", reasoning models divide the work themselves: one announces it will take a case, others see the announcement and pick something else, and they point out each other\'s mistakes. No fine-tuning is needed. Rotary position embeddings make the sharing cheap: each worker sees the other workers\' blocks at a different offset, and since attention depends only on relative position, rotating the query is enough; the cached keys never need recomputing. The gain follows Amdahl\'s law: the serial parts (setting up and combining) do not speed up, coordination costs tokens, and a worker with nothing left to claim adds only overhead. It is still a research method, from Yandex and partners in 2025, but it opens a direction separate from speculative decoding.',
  keywords: ['Hogwild inference', 'parallel inference', 'shared KV cache', 'reasoning models', 'multi-worker LLM', 'Amdahl\'s law', 'RoPE'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { n: 2, k: 1, shared: true, reason: true }, st = { ...D0 };
    const ink = '#151827', AUB = '#6B5E86', TEAL = '#1F9E89';
    const COL = { serial: AUB, read: '#B8B0A6', work: TEAL, dup: '#C62828' };
    const hd = P.box(4.2, 0.04, 0.3, '#FFFFFF', { r: 0.03 }); hd.position.set(-0.7, 0.12, -1.17); floor.add(hd);

    /* one lane per worker; time runs right; one worker alone fills the width */
    const X0 = -2.75, XW = 4.1, Z0 = -0.9, ZD = 1.6;
    const pad = P.box(XW + 0.1, 0.02, ZD + 0.08, '#F6F1E6', { r: 0.02 }); pad.position.set(X0 + XW / 2, 0.12, Z0 + ZD / 2); floor.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const MAXI = 200, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXI); im.frustumCulled = false; im.userData.noFit = true; floor.add(im);
    const keep = P.box(XW, 0.3, ZD, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(X0 + XW / 2, 0.12, Z0 + ZD / 2); floor.add(keep);
    const cur = P.box(0.015, 0.14, ZD, '#151827', { r: 0 }); cur.userData.noFit = true; floor.add(cur);
    const names = Array.from({ length: 8 }, (_, i) => {   return t; });

    /* the shared cache, a strip that fills as anyone writes */
    const cz = 1.18, cTr = P.box(XW, 0.02, 0.12, '#E6E0D4', { r: 0.02 }); cTr.position.set(X0 + XW / 2, 0.12, cz); floor.add(cTr);
    const cm = new THREE.MeshLambertMaterial({ color: AUB }), cBar = P.box(1, 0.05, 0.12, '#fff', { r: 0.02, material: cm }); cBar.userData.noFit = true; floor.add(cBar);

    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); floor.add(rp);

    const gm = new THREE.MeshLambertMaterial({ color: TEAL }), gauge = P.box(0.4, 1, 0.4, '#fff', { r: 0.03, material: gm }); gauge.position.set(PX, 0.15, -0.5); gauge.userData.noFit = true; floor.add(gauge);



    let R = null, tau = 0;
    const dummy = new THREE.Object3D(), col = new THREE.Color(), n = v => Math.round(v).toLocaleString('en');
    function layout() {
      const k = XW / R.serial, rowD = ZD / Math.max(4, R.N);
      let m = 0;
      for (const s of R.seg) {
        const b = Math.min(s.b, tau); if (b <= s.a || m >= MAXI) continue;
        const len = (b - s.a) * k, z = Z0 + (s.w + 0.5) * rowD;
        dummy.position.set(X0 + s.a * k + len / 2, 0.13, z); dummy.scale.set(Math.max(0.002, len - 0.006), s.k === 'read' ? 0.03 : 0.06, rowD * 0.7); dummy.updateMatrix();
        im.setMatrixAt(m, dummy.matrix); im.setColorAt(m, col.set(COL[s.k])); m++;
      }
      for (let j = m; j < MAXI; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      cur.position.set(X0 + Math.min(tau, R.T) * k, 0.12, Z0 + ZD / 2);
      let written = 0; for (const s of R.seg) written += Math.max(0, Math.min(s.b, tau) - s.a);
      const shareLen = st.shared || R.N === 1 ? written : Math.max(0, Math.min(tau, R.T));
      const cl = Math.max(0.004, XW * Math.min(1, shareLen / R.tokens)); cBar.scale.x = cl; cBar.position.set(X0 + cl / 2, 0.13, cz);

    }
    function draw() {
      R = sim(st); tau = 0;
      const rowD = ZD / Math.max(4, R.N); names.forEach((t, i) => {   });
      const sp = R.serial / R.T;
      gauge.scale.y = 0.03 + 0.14 * sp; gm.color.set(sp >= 2.2 ? TEAL : sp >= 1.3 ? '#C9A227' : '#C62828');
      layout();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { if (tau >= R.T) return; tau = Math.min(R.T, tau + dt * R.serial / 5); layout(); };
    const controls = [
      { type: 'buttons', label: 'Workers', options: NS.map(String), get: () => st.n, act: i => set({ n: i }) },
      { type: 'buttons', label: 'Problem', options: ['4 cases', '16 cases'], get: () => st.k, act: i => set({ k: i }) },
      { type: 'toggle', label: 'Shared cache', get: () => st.shared, set: v => set({ shared: !!v }) },
      { type: 'toggle', label: 'Reasoning model', get: () => st.reason, set: v => set({ reason: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => { tau = 0; layout(); } },
    ];
    const readouts = [
      { label: 'Sooner by', get: () => ({ v: `${(R.serial / R.T).toFixed(2)}×`, sub: 'than one worker', good: R.serial / R.T >= 2.2, bad: R.N > 1 && R.serial / R.T < 1.3 }) },
      { label: 'Tokens written', get: () => ({ v: n(R.tokens), sub: `one worker: ${n(R.serial)}`, bad: R.tokens > 1.3 * R.serial }) },
      { label: 'Repeated cases', get: () => ({ v: String(R.dups), sub: `a case already taken, done again`, good: R.dups === 0, bad: R.dups > 0 }) },
    ];
    const labels = [
      { name: 'lanes', t: 'One lane per worker', d: 'Time runs right; one worker alone fills the width', icon: 'box', atV: V(-2.82, 0.2, -0.4) },
      { name: 'sooner', t: 'Sooner by', d: 'One worker\'s time ÷ this time', icon: 'target', atV: V(2.45, 0.2, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Separate caches', hint: 'no one sees the others', on: () => set({ ...D0, shared: false }), off: reset },
      { label: 'Model that does not plan', hint: 'ignores the others\' claims', on: () => set({ ...D0, reason: false }), off: reset },
      { label: '8 workers, 4 cases', hint: 'more workers than work', on: () => set({ ...D0, n: 3, k: 0 }), off: reset },
    ];
    function status() {
      const sp = R.serial / R.T, ok = sim({ ...st, shared: true, reason: true }), four = sim({ ...st, n: 2, shared: true, reason: true });
      if (R.N === 1) return { msg: `<b>One worker: ${n(R.T)} steps.</b> Every token waits for the one before, so ${R.K} cases take as long as their tokens add up to.` };
      if (!st.shared) return { ok: false, msg: `<b>Separate caches: no faster (${sp.toFixed(2)}×), and ${n(R.tokens)} tokens instead of ${n(ok.tokens)}.</b> No worker can see what the others have done, so each one solves every case to have a complete answer. The shared cache is how workers learn what is taken.` };
      if (!st.reason) return { ok: false, msg: `<b>A model that does not plan: ${R.dups} times a worker redid a case already taken, ${n(R.tokens)} tokens against ${n(ok.tokens)}${sp < ok.serial / ok.T ? `, and ${sp.toFixed(2)}× against ${(ok.serial / ok.T).toFixed(2)}×` : ''}.</b> It sees the others' work in the cache but does not reason about it, so it picks cases already in progress. Coordination emerges only in models trained to reason step by step.` };
      if (R.N > R.K || R.idle) return { ok: false, msg: `<b>${R.N} workers, ${R.K} cases: ${sp.toFixed(2)}×${R.N > 4 ? `, against ${(four.serial / four.T).toFixed(2)}× with 4 workers` : ''}.</b> ${R.idle} worker${R.idle === 1 ? ' has' : 's have'} nothing to claim, and every worker reads more of the others' notes (${R.c} tokens per claim). The setup and combine stay serial. Parallel workers help only when there is parallel work.` };
      return { ok: sp >= 1.5, msg: `<b>${R.N} workers share one cache: the answer arrives ${sp.toFixed(2)}× sooner, ${n(R.T)} steps against ${n(R.serial)}.</b> Each worker reads the cache, sees which cases are taken, claims the next one, and no case is done twice. The cost: ${n(R.tokens - R.serial)} extra tokens of reading and claiming. Setup and combine stay serial, as Amdahl's law says.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One long chain', home: true, say: 'A maths tutoring service in Accra asks a reasoning model to solve a problem with sixteen cases. One worker writes it all, one token after another.', act: m => m.set({ n: 0, k: 1, shared: true, reason: true }) },
    { t: 'Four workers, one memory', home: true, say: 'Hogwild inference runs four copies of the same model on one shared memory cache. Each sees every word the others write, the moment it is written.', act: m => m.set({ n: 2 }) },
    { t: 'They divide the work', home: true, say: 'Nobody assigns the cases. Each worker reads the cache, sees which cases are taken, and announces the next one. The answer comes more than two and a half times sooner.' },
    { t: 'Separate memories', home: true, say: 'Give each worker its own cache, and none can see the others. Each one solves every case, and nothing is gained.', act: m => m.set({ shared: false }) },
    { t: 'A model that does not plan', home: true, say: 'A model not trained to reason ignores what the others have claimed, repeats their cases and wastes tokens.', act: m => m.set({ shared: true, reason: false }) },
    { t: 'Cheap to share', home: true, say: 'Rotary positions make the shared cache cheap. Each worker sees the others\' blocks at a different offset, and only the query needs turning, never the cache.', act: m => m.set({ reason: true }) },
  ],
  check: [
    { q: 'How do Hogwild workers know which cases to take?', options: ['They read each other\'s tokens in the shared cache and claim what is free', 'A coordinator assigns cases', 'They vote at the end'], answer: 0, why: 'Coordination emerges from reasoning over the shared cache.', hint: 'Look at the grey claims.' },
    { q: 'Why did separate caches give no speed-up?', options: ['No worker could see the others, so each solved every case', 'The cache was too small', 'Workers ran slower'], answer: 0, why: 'Without sharing there is no way to divide the work.', hint: 'Count the red segments.' },
    { q: 'Why do eight workers barely beat four on a four-case problem?', options: ['There is no more parallel work, and each extra worker adds reading', 'The GPU runs out of memory', 'Eight is an unlucky number'], answer: 0, why: 'Amdahl\'s law: serial parts and overhead remain.', hint: 'Look at workers with nothing to do.' },
  ],
  terms: [
    ['Hogwild inference', 'Several copies of one model generating in parallel against a single shared cache.'],
    ['Shared KV cache', 'One cache that every worker reads and writes, so each sees all tokens written so far.'],
    ['Emergent coordination', 'Workers dividing the work themselves by reading each other\'s notes, with no fine-tuning.'],
    ['Amdahl\'s law', 'Speed-up is limited by the part of the work that must stay serial.'],
    ['RoPE', 'Rotary position embeddings; attention depends on relative position, so a cached block can be seen at a new offset by rotating the query.'],
    ['Hogwild! SGD', 'The 2011 training method that inspired the name: workers updating shared weights without locks.'],
  ],
  deeper: '<p><b>How the prompt helps.</b> The workers are told they are collaborating and are nudged now and then to check whether their current work repeats someone else\'s. Reasoning models then plan, divide tasks, spot each other\'s errors and change course when a plan fails.</p><p><b>Combining with other tricks.</b> Hogwild parallelism sits alongside speculative decoding: each worker can still draft and verify its own tokens.</p><p><b>Where it does not fit.</b> Short chats (coordination dominates), tasks that do not split, models not trained to reason, and workers on different machines, since every token must reach every worker at once.</p><p><b>About this machine.</b> An event simulation of N workers writing one token per step, with the costs and rules in the file header; real models coordinate less cleanly than the claiming rule here.</p>',
  code: {
    title: 'Workers claim cases through a shared cache',
    note: 'Adapted from the course\'s Hogwild inference lesson.',
    text: `
def hogwild(workers, cases, cost, read_cost):
    free = [0] * workers          # when each worker is next free
    claimed, done = set(), {}
    while len(claimed) < len(cases):
        w = min(range(workers), key=lambda i: free[i])
        t = free[w] + read_cost   # read the shared cache
        case = next(c for c in cases if c not in claimed)
        claimed.add(case)         # the claim is visible to all at once
        free[w] = done[case] = t + cost[case]
    return max(done.values())
`,
  },
};
