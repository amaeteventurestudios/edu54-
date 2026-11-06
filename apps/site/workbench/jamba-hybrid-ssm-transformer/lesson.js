// Jamba: a legal aid clinic in Lusaka wants a model that reads long case files. A Jamba-shaped model: 32 layers, hidden 4,096, 52B parameters (12B active with MoE).
// Attention layers keep a KV cache: 2 × layers × 8 KV heads × 128 × context × 2 bytes. Mamba layers keep a fixed state: 8,192 channels × (16 state + 4 conv) × 2 bytes each.
// Memory: weights in 8-bit (52 GB) + cache + state, against one 80 GB GPU. Decode speed: bytes read per token (active weights + cache + state) ÷ 2 TB/s.
// Recall test (toy): the document holds n facts (key → value, random unit vectors in 32 dimensions). A Mamba-only stack must squeeze them into a fixed 32 × 32 state
// (sum of value·keyᵀ) and read back state·key; any attention layer looks them up exactly with softmax over the stored keys. Recall = share whose best match is right.
const MIX = [[32, 'All attention'], [16, '1 : 1'], [8, '1 : 3'], [4, '1 : 7 (Jamba)'], [0, 'No attention']], CTX = [32768, 131072, 262144], FACTS = [8, 32, 128], D = 32;
const W8 = 52, ACT = 12, BW = 2000, GPU = 80;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const recallCache = {};
function recall(n, exact) {
  const key = `${n}${exact}`; if (key in recallCache) return recallCache[key];
  const u = rng(11), g = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  const unit = () => { const v = Array.from({ length: D }, g), s = Math.hypot(...v); return v.map(x => x / s); };
  const K = Array.from({ length: n }, unit), Vv = Array.from({ length: n }, unit), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const M = Array.from({ length: D }, () => new Float64Array(D));
  if (!exact) for (let i = 0; i < n; i++) for (let a = 0; a < D; a++) for (let b = 0; b < D; b++) M[a][b] += Vv[i][a] * K[i][b];
  const hits = [];
  for (let j = 0; j < n; j++) {
    let y;
    if (exact) { const s = K.map(k => 16 * dot(k, K[j])), m = Math.max(...s), e = s.map(x => Math.exp(x - m)), z = e.reduce((a, b) => a + b, 0); y = Array.from({ length: D }, (_, a) => Vv.reduce((acc, v, i) => acc + e[i] / z * v[a], 0)); }
    else y = M.map(row => dot(row, K[j]));
    let best = -Infinity, bi = -1; Vv.forEach((v, i) => { const s = dot(v, y); if (s > best) { best = s; bi = i; } }); hits.push(bi === j);
  }
  return (recallCache[key] = hits);
}
function run(st) {
  const nA = MIX[st.mix][0], nM = 32 - nA, ctx = CTX[st.ctx], n = FACTS[st.f];
  const kv = 2 * nA * 8 * 128 * ctx * 2 / 1e9, ssm = nM * 8192 * 20 * 2 / 1e9, act = st.moe ? ACT : W8;
  const mem = W8 + kv + ssm, tps = BW / (act + kv + ssm), hits = recall(n, nA > 0);
  return { nA, nM, ctx, n, kv, ssm, mem, tps, hits, rec: hits.filter(Boolean).length / n, fits: mem <= GPU, act };
}

export default {
  slug: 'jamba-hybrid-ssm-transformer',
  title: 'Jamba: mostly Mamba, a little attention',
  description: 'A legal aid clinic in Lusaka wants a model for long case files. Attention remembers every word at a cost; Mamba keeps a small state. Mix seven of one to one of the other.',
  overview: 'A state space model reads a sequence with a fixed-size state: at each step it updates the state from the old state and the new token, and reads its output from the state. Memory and time per token stay constant however long the text, unlike attention, whose key-value cache grows with every token. Mamba makes the update depend on the input, so the layer can choose what to keep. The catch is that a fixed state is a summary: put more facts into it than it can hold and recall leaks. Attention remembers every token exactly but pays for it in memory and in reading time. AI21\'s Jamba puts both in one model: blocks of eight layers, seven Mamba and one attention, with a mixture of experts on every other layer. The few attention layers handle exact lookups and in-context learning; the Mamba layers do the cheap bulk of the work. At 256K tokens its cache is about an eighth of an all-attention model of the same shape, and with 8-bit weights a long case file fits on one 80 GB GPU. Jamba has 52 billion parameters with 12 billion active per token; Jamba 1.5 scaled the same recipe to 398 billion.',
  keywords: ['Jamba', 'Mamba', 'state space model', 'SSM', 'hybrid model', 'KV cache', 'long context', 'mixture of experts'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { mix: 3, ctx: 2, f: 2, moe: true }, st = { ...D0 };
    const ink = '#151827', AUB = '#6B5E86', TEAL = '#1F9E89', CORAL = '#E07A5F';
    /* the 32-layer stack, a row of slabs: teal Mamba, purple attention, coral tab for experts */
    const LX0 = -2.8, LW = 0.094, LZ = -0.55;
    const tray = P.box(32 * LW + 0.1, 0.03, 0.75, '#F6F1E6', { r: 0.02 }); tray.position.set(LX0 + 16 * LW, 0.12, LZ); floor.add(tray);
    const slabs = Array.from({ length: 32 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: TEAL }), b = P.box(LW * 0.78, 0.22, 0.5, '#fff', { r: 0.015, material: mm }); b.position.set(LX0 + (i + 0.5) * LW, 0.14, LZ); floor.add(b);
      const tab = P.box(LW * 0.78, 0.04, 0.1, CORAL, { r: 0.01 }); tab.position.set(LX0 + (i + 0.5) * LW, 0.14, LZ + 0.33); floor.add(tab); return { mm, tab }; });


    /* recall test: one tile per fact */
    const FX = -1.5, FZ = 0.62;
    const fcard = P.box(2.6, 0.03, 0.85, '#FFFFFF', { r: 0.03 }); fcard.position.set(FX, 0.12, FZ); floor.add(fcard);

    const tiles = Array.from({ length: 128 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: TEAL }), b = P.box(0.1, 0.03, 0.06, '#fff', { r: 0.01, material: mm }); b.position.set(FX - 1.2 + 0.075 + (i % 16) * 0.15, 0.14, FZ - 0.17 + Math.floor(i / 16) * 0.075); b.userData.noFit = true; floor.add(b); return { b, mm }; });
    /* one 80 GB GPU: weights, cache, state */
    const GX = 0.82, GZ = 0.2, GH = 0.9;
    const gcard = P.box(0.9, 0.03, 1.7, '#FFFFFF', { r: 0.03 }); gcard.position.set(GX, 0.12, GZ); floor.add(gcard);

    const cap = P.box(0.6, 0.005, 0.02, '#151827', { r: 0 }); cap.position.set(GX, 0.12 + GH + 0.05, GZ - 0.25); floor.add(cap);
    const segs = ['#9A968C', AUB, TEAL].map(c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.42, 1, 0.42, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; });

    const keepG = P.box(0.6, GH + 0.2, 0.42, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(GX, 0.12, GZ - 0.25); floor.add(keepG);
    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); floor.add(rp);

    const sm = new THREE.MeshLambertMaterial({ color: TEAL }), sg = P.box(0.4, 1, 0.4, '#fff', { r: 0.03, material: sm }); sg.position.set(PX, 0.15, -0.5); sg.userData.noFit = true; floor.add(sg);



    let R = null;
    const K = c => `${Math.round(c / 1024)}K`, GB = v => v >= 10 ? `${v.toFixed(0)} GB` : v >= 0.1 ? `${v.toFixed(1)} GB` : `${(v * 1000).toFixed(0)} MB`, pc = v => `${Math.round(v * 100)}%`;
    function draw() {
      R = run(st);
      const every = R.nA ? 32 / R.nA : 0;
      slabs.forEach((s, i) => { const att = R.nA > 0 && (i + 1) % every === 0; s.mm.color.set(att ? AUB : TEAL); s.tab.visible = st.moe && i % 2 === 1; });
      tiles.forEach((t, i) => { const on = i < R.n; t.b.visible = on; if (on) t.mm.color.set(R.hits[i] ? TEAL : '#C62828'); });
      let y = 0.135; [W8, R.kv, R.ssm].forEach((v, i) => { const h = Math.max(0.004, GH * v / GPU); segs[i].b.scale.y = h; segs[i].b.position.set(GX, y, GZ - 0.25); y += h; });
      segs[1].mm.color.set(R.fits ? AUB : '#C62828');
      sg.scale.y = 0.03 + 0.5 * Math.min(1, R.tps / 180); sm.color.set(R.tps >= 100 ? TEAL : R.tps >= 60 ? '#C9A227' : '#C62828');


    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Attention : Mamba', options: MIX.map(m => m[1]), get: () => st.mix, act: i => set({ mix: i }) },
      { type: 'buttons', label: 'Case file length', options: CTX.map(K), get: () => st.ctx, act: i => set({ ctx: i }) },
      { type: 'buttons', label: 'Facts to recall', options: FACTS.map(String), get: () => st.f, act: i => set({ f: i }) },
      { type: 'toggle', label: 'Mixture of experts', get: () => st.moe, set: v => set({ moe: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Memory on one GPU', get: () => ({ v: GB(R.mem), sub: R.fits ? `fits in ${GPU} GB` : `over ${GPU} GB`, good: R.fits, bad: !R.fits }) },
      { label: 'Facts recalled', get: () => ({ v: pc(R.rec), sub: `of ${R.n} in the file`, good: R.rec >= 0.95, bad: R.rec < 0.8 }) },
      { label: 'Words per second', get: () => ({ v: `${Math.round(R.tps)}`, sub: 'one reader, memory-bound', good: R.tps >= 100, bad: R.tps < 60 }) },
    ];
    const labels = [
      { name: 'layers', t: '32 layers', d: 'Seven Mamba layers for each attention layer', icon: 'box', atV: V(-2.87, 0.2, -0.55) },
      { name: 'speed', t: 'Words per second', d: 'Each word reads the weights, cache and state', icon: 'target', atV: V(2.45, 0.2, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'All attention', hint: '32 attention layers', on: () => set({ ...D0, mix: 0 }), off: reset },
      { label: 'No attention', hint: 'Mamba only', on: () => set({ ...D0, mix: 4 }), off: reset },
      { label: 'No experts', hint: 'all 52B active', on: () => set({ ...D0, moe: false }), off: reset },
    ];
    function status() {
      const j = run({ ...st, mix: 3 });
      if (R.nA === 0) return { ok: R.rec >= 0.95 ? undefined : false, msg: `<b>No attention: ${pc(R.rec)} of ${R.n} facts recalled.</b> ${R.rec >= 0.95 ? `A few facts fit in the fixed state, and memory stays flat (${GB(R.ssm)} of state at any length).` : `A Mamba layer squeezes the whole file into a fixed state; ${R.n} facts in 32 × 32 numbers overlap, and reading one back picks up the others. Memory is tiny (${GB(R.ssm)} of state) but exact lookups fail. One attention layer in eight fixes recall.`}` };
      if (!R.fits || R.nA >= 16) return { ok: R.fits ? undefined : false, msg: `<b>${MIX[st.mix][1]}: ${GB(R.kv)} of cache at ${K(R.ctx)}${R.fits ? '' : `, ${GB(R.mem)} in all, more than one ${GPU} GB GPU holds`}.</b> Every attention layer keeps keys and values for every token, and every word reads them all: ${Math.round(R.tps)} words a second against ${Math.round(j.tps)} for Jamba's one in eight. Recall is no better (${pc(R.rec)}); a few attention layers already do the exact lookups.` };
      if (!st.moe) return { ok: false, msg: `<b>No experts: every word reads all ${W8} GB of weights, ${Math.round(R.tps)} words a second against ${Math.round(run({ ...st, moe: true }).tps)} with experts.</b> With a mixture of experts on every other layer, each word uses 12 of the 52 billion parameters. Memory is the same; reading time is not.` };
      return { ok: R.fits && R.rec >= 0.95, msg: `<b>${MIX[st.mix][1]}: ${pc(R.rec)} of facts recalled, ${GB(R.mem)} on one GPU, ${Math.round(R.tps)} words a second.</b> ${R.nA} attention layers do the exact lookups; ${R.nM} Mamba layers carry fixed states (${GB(R.ssm)} together). The cache at ${K(R.ctx)} is ${GB(R.kv)}, against ${GB(run({ ...st, mix: 0 }).kv)} with attention in every layer.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two kinds of layer', home: true, say: 'A legal aid clinic in Lusaka wants a model that reads long case files. Attention remembers every word exactly, but its memory grows with the file. A Mamba layer carries a fixed-size summary instead.', act: m => m.set({ mix: 3, ctx: 2, f: 2, moe: true }) },
    { t: 'All attention', home: true, say: 'With attention in every layer, the cache for a long file is so big that, with the weights, it no longer fits on one GPU, and every word must read all of it.', act: m => m.set({ mix: 0 }) },
    { t: 'No attention', home: true, say: 'With only Mamba layers, memory stays flat. But a fixed state cannot hold every fact, and when the file holds many, recall falls apart.', act: m => m.set({ mix: 4 }) },
    { t: 'One in eight', home: true, say: 'Jamba uses one attention layer for every seven Mamba layers. The few attention layers do the exact lookups, and the cache is an eighth of the size.', act: m => m.set({ mix: 3 }) },
    { t: 'Experts on every other layer', home: true, say: 'Every other layer is a mixture of experts, so each word uses about a quarter of the parameters, and words come out faster.' },
    { t: 'Pick the ratio', home: true, say: 'Too much attention costs memory and speed; none loses exact recall. AI21 found one in eight a good balance.' },
  ],
  check: [
    { q: 'Why does a Mamba layer use the same memory at any file length?', options: ['It keeps a fixed-size state and updates it with each token', 'It skips most tokens', 'It stores the cache on disk'], answer: 0, why: 'Attention\'s cache grows with every token; a state does not.', hint: 'Look at Mamba state as the file grows.' },
    { q: 'Why did recall fail with no attention layers?', options: ['Many facts squeezed into a fixed state overlap, so reading one back picks up the others', 'Mamba cannot read text', 'The file was too short'], answer: 0, why: 'A summary of fixed size can only hold so much exactly.', hint: 'Try 8 facts, then 128.' },
    { q: 'What do Jamba\'s few attention layers buy?', options: ['Exact lookups and in-context learning, at an eighth of the cache', 'Faster training only', 'Nothing; they are kept for compatibility'], answer: 0, why: 'One in eight keeps recall while keeping memory small.', hint: 'Compare 1 : 7 with No attention.' },
  ],
  terms: [
    ['State space model (SSM)', 'A layer that reads a sequence through a fixed-size state, updated at each token.'],
    ['Mamba', 'An SSM whose update depends on the input, so it can choose what to keep.'],
    ['Hybrid model', 'A model that mixes attention layers with SSM layers.'],
    ['KV cache', 'The keys and values attention keeps for every earlier token; it grows with context.'],
    ['Jamba block', 'Eight layers: seven Mamba and one attention, with experts on every other layer.'],
    ['Mamba-3', 'A 2026 SSM with complex-valued states and multi-input, multi-output updates, recovering state tracking.'],
  ],
  deeper: '<p><b>The recurrence.</b> h_t = A·h_{t−1} + B·x_t and y_t = C·h_t. Mamba makes A, B and C depend on the input, and computes the whole sequence in parallel during training with a scan, so training stays fast.</p><p><b>Positions.</b> The recurrence already knows order, so Jamba\'s attention layers needed no positional encoding at first; Jamba 1.5 added rotary positions for longer contexts.</p><p><b>Where hybrids lose.</b> Short contexts gain little, and tasks that need every part of a long input compared with every other may want more attention. The frontier\'s largest models are still pure transformers with sparse experts.</p><p><b>Mamba-3.</b> Complex-valued state updates act like a rotation the input controls, restoring state tracking that real-valued simplifications lost; multi-input, multi-output projections use the hardware better at the same decoding cost.</p><p><b>About this machine.</b> Memory and speed use Jamba\'s published shape (8 key-value heads in its attention layers, Mamba state size 16, 8-bit weights) and a GPU reading 2 TB a second. The recall test is a toy with a 32 × 32 state, as in the file header.</p>',
  code: {
    title: 'A state space layer: fixed state, one step per token',
    note: 'Adapted from the course\'s Jamba lesson.',
    text: `
def ssm_step(h, x, A, B, C):
    h = [A[i] * h[i] + B[i] * x for i in range(len(h))]   # update the state
    y = sum(C[i] * h[i] for i in range(len(h)))           # read the output
    return h, y

def jamba_layers(n_layers=32, l=8, e=2):
    kinds = ["attention" if (i + 1) % l == 0 else "mamba"
             for i in range(n_layers)]
    moe = [i % e == 1 for i in range(n_layers)]
    return list(zip(kinds, moe))
`,
  },
};
