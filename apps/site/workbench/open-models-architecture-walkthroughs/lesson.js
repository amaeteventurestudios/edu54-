// Open models, read from their config files: a lab in Kigali and a start-up in Cape Town choosing an open model to run. Parameters are counted
// from each config: embedding (and an untied head), per layer attention (q, k, v, o with grouped KV heads; DeepSeek's MLA projections as one figure),
// the MLP (two matrices for GELU, three for gated SwiGLU/GeGLU, experts for MoE), norms; totals match the published 124M, 8.03B, 7.24B, 46.7B/12.9B,
// 9.24B and 671B/37B. KV cache at full context is 2 × layers × KV heads × head size × 2 bytes per token (MLA: 576 numbers per layer per token; Gemma's
// sliding layers stop at 4,096 tokens). GPUs are 80 GB, weights in BF16. Break it: count the head as tied, give every query head its own keys and
// values, size the GPUs by active parameters.
const MODELS = [
  { n: 'GPT-2', year: 2019, V: 50257, h: 768, L: 12, nh: 12, kv: 12, hd: 64, ff: 3072, gate: false, tie: true, ctx: 1024, pos: 'Learned', norm: 'LayerNorm', act: 'GELU', bias: true },
  { n: 'Llama 3 8B', year: 2024, V: 128256, h: 4096, L: 32, nh: 32, kv: 8, hd: 128, ff: 14336, gate: true, tie: false, ctx: 131072, pos: 'RoPE', norm: 'RMSNorm', act: 'SwiGLU' },
  { n: 'Mistral 7B', year: 2023, V: 32000, h: 4096, L: 32, nh: 32, kv: 8, hd: 128, ff: 14336, gate: true, tie: false, ctx: 32768, pos: 'RoPE', norm: 'RMSNorm', act: 'SwiGLU' },
  { n: 'Mixtral 8x7B', year: 2023, V: 32000, h: 4096, L: 32, nh: 32, kv: 8, hd: 128, ff: 14336, gate: true, tie: false, ctx: 32768, pos: 'RoPE', norm: 'RMSNorm', act: 'SwiGLU', E: 8, k: 2 },
  { n: 'Gemma 2 9B', year: 2024, V: 256000, h: 3584, L: 42, nh: 16, kv: 8, hd: 256, ff: 14336, gate: true, tie: true, ctx: 8192, pos: 'RoPE + sliding', norm: 'RMSNorm ×2', act: 'GeGLU', post: true, slide: 4096 },
  { n: 'DeepSeek-V3', year: 2024, V: 129280, h: 7168, L: 61, nh: 128, kv: 0, hd: 128, ff: 18432, gate: true, tie: false, ctx: 131072, pos: 'RoPE', norm: 'RMSNorm', act: 'SwiGLU', mla: 187.0e6, dense: 3, E: 256, k: 8, shared: 1, eff: 2048 },
];
const B = v => (v >= 1e9 ? `${(v / 1e9).toPrecision(3)}B` : `${Math.round(v / 1e6)}M`), GBf = v => (v >= 100e9 ? Math.round(v / 1e9) : (v / 1e9).toFixed(v < 1e9 ? 2 : 1));
function count(m, st) {
  const kv = st.kvMode === 1 ? m.nh : st.kvMode === 2 ? 1 : m.kv, tie = m.tie || st.tie;
  const emb = m.V * m.h + (m.pos === 'Learned' ? m.ctx * m.h : 0), head = tie ? 0 : m.V * m.h;
  const attn = m.mla ? m.mla : m.h * m.nh * m.hd * 2 + 2 * m.h * kv * m.hd + (m.bias ? 4 * m.h : 0);
  const mlp1 = (m.gate ? 3 : 2) * m.h * m.ff + (m.bias ? m.ff + m.h : 0), norms = (m.post ? 4 : 2) * m.h * (m.norm === 'LayerNorm' ? 2 : 1);
  let mlpAll, mlpAct;
  if (m.E && m.eff) { const ex = 3 * m.h * m.eff, moeL = m.L - m.dense; mlpAll = m.dense * mlp1 + moeL * ((m.E + m.shared) * ex + m.h * m.E); mlpAct = m.dense * mlp1 + moeL * ((m.k + m.shared) * ex + m.h * m.E); }
  else if (m.E) { mlpAll = m.L * (m.E * mlp1 + m.h * m.E); mlpAct = m.L * (m.k * mlp1 + m.h * m.E); }
  else { mlpAll = mlpAct = m.L * mlp1; }
  const at = m.L * (attn + norms), total = emb + head + at + mlpAll + m.h, active = emb + head + at + mlpAct + m.h;
  const per = m.mla && !st.kvMode ? 576 * 2 : 2 * kv * m.hd * 2;
  const tokLayers = m.slide ? (m.L / 2) * m.ctx + (m.L / 2) * Math.min(m.slide, m.ctx) : m.L * m.ctx;
  const kvBytes = per * tokLayers, wBytes = 2 * (st.act ? active : total), need = wBytes + kvBytes, real = 2 * total + kvBytes;
  return { kv, emb, head, attn: at, mlpAll, mlpAct, total, active, kvBytes, wBytes, need, gpus: Math.ceil(need / 80e9), realGpus: Math.ceil(real / 80e9) };
}

export default {
  slug: 'open-models-architecture-walkthroughs',
  title: 'Open models: read the config',
  description: 'A lab in Kigali and a start-up in Cape Town choose an open model to run. Every one, from GPT-2 to DeepSeek-V3, is a config: read it, and see what it takes to run.',
  overview: 'Open models since GPT-2 share one shape: a token embedding, a stack of identical blocks (norm, attention, residual, norm, MLP, residual), a final norm and a head that scores every word in the vocabulary. What changes is six knobs. RMSNorm replaced LayerNorm: it only rescales, with no mean and no bias. Rotary position encoding replaced the learned position table, so nothing runs out at the training length and scaling tricks stretch context further. Gated activations, SwiGLU and GeGLU, replaced GELU, with three weight matrices in each MLP instead of two. Attention heads share keys and values: grouped-query attention lets several query heads read one key-value head, multi-query uses a single one, and DeepSeek\'s latent attention compresses them, which shrinks the cache every conversation keeps. Mixture-of-experts layers hold many MLPs and run only a few per token, so total and active parameters part ways. And the norm stays before each sublayer. A config file lists the numbers that matter: hidden size, layers, query and key-value heads, MLP size, vocabulary, context, and whether the head reuses the embedding. From those alone you can count every parameter, size the key-value cache at full context, and work out how many GPUs it needs. Two traps: an untied head is a second vocabulary-sized matrix, and every expert must sit in memory even if only two run.',
  keywords: ['open models', 'config.json', 'parameter count', 'rmsnorm', 'rope', 'swiglu', 'grouped query attention', 'mla', 'mixture of experts', 'kv cache', 'llama 3', 'deepseek-v3'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { m: 1, kvMode: 0, tie: false, act: false };
    const ink = '#151827';
    /* the config file */


    /* six knobs */
    const KN = ['Norm', 'Position', 'Activation', 'Keys and values', 'MLP', 'Context'];
    const knobs = KN.map((n, i) => { const x = -1.05 + (i % 3) * 0.72, z = 0.22 + Math.floor(i / 3) * 0.48, mm = new THREE.MeshLambertMaterial({ color: '#8A8A96' });
      const b = P.box(0.66, 0.08, 0.4, '#fff', { r: 0.04, material: mm }); b.position.set(x, 0.12, z); floor.add(b);
         return { mm }; });

    /* the parameter tower: embedding and head, attention, MLP (pale = experts that sit idle for a token) */
    const SEG = ['#3A6FB0', '#1F9E89', '#E07B39', '#F2C7A5'];
    const tower = SEG.map(c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.5, 1, 0.5, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b); return b; });
    const TX = -1.1, TZ = -0.8, TH = 1.0;


    const keepT = P.box(0.5, TH, 0.5, '#000'); keepT.material = new THREE.MeshBasicMaterial({ visible: false }); keepT.position.set(TX, 0.15, TZ); floor.add(keepT);
    /* GPUs needed, 80 GB each */
    const gp = P.box(1.55, 0.05, 2.55, '#2B2F3A', { r: 0.04 }); gp.position.set(2.05, 0.12, 0.1); floor.add(gp);

    const gpus = Array.from({ length: 24 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#4A5060' }), b = P.box(0.2, 0.12, 0.2, '#fff', { r: 0.03, material: mm });
      b.position.set(1.5 + (i % 6) * 0.22, 0.15, -0.75 + Math.floor(i / 6) * 0.25); floor.add(b); return mm; });

    const keep = P.box(6.0, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null;
    const g2 = MODELS[0];
    function draw() {
      const m = MODELS[st.m]; R = count(m, st);
      const kvTxt = m.mla && !st.kvMode ? 'latent (MLA)' : `${R.kv}`;
      const vals = [m.norm, m.pos, m.act, m.mla && !st.kvMode ? 'Latent (MLA)' : R.kv === m.nh ? `Own per head (${m.nh})` : R.kv === 1 ? 'One shared (MQA)' : `Grouped (${m.nh}/${R.kv})`, m.E ? `${m.E} experts, ${m.k} run` : 'Dense', `${m.ctx >= 1024 ? Math.round(m.ctx / 1024) + 'K' : m.ctx} tokens`];
      const base0 = [g2.norm, g2.pos, g2.act, 'Own per head (12)', 'Dense', '1K tokens'];
      knobs.forEach((k, i) => {  k.mm.color.set(st.m && (i === 3 ? !vals[3].startsWith('Own') : vals[i] !== base0[i]) ? '#E07B39' : '#8A8A96'); });
      const parts = [R.emb + R.head, R.attn, R.mlpAct, R.mlpAll - R.mlpAct], sum = parts.reduce((a, b) => a + b, 0); let y = 0.15;
      tower.forEach((b, i) => { const hh = Math.max(0.005, parts[i] / sum * TH); b.visible = parts[i] > 0; b.scale.y = hh; b.position.set(TX, y, TZ); y += hh; });
      gpus.forEach((mm, i) => mm.color.set(i < Math.min(24, R.gpus) ? (st.act && R.gpus < R.realGpus ? '#C9A227' : '#1F9E89') : i < Math.min(24, R.realGpus) ? '#C62828' : '#4A5060'));

    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Model', options: MODELS.map(m => m.n), get: () => st.m, act: i => { st.m = i; draw(); } },
      { type: 'buttons', label: 'Keys and values', options: ['As in the config', 'One per query head', 'One shared'], get: () => st.kvMode, act: i => { st.kvMode = i; draw(); } },
      { type: 'toggle', label: 'Count the head as tied', get: () => st.tie, set: v => { st.tie = !!v; draw(); }, quick: false },
      { type: 'toggle', label: 'Size GPUs by active parameters', get: () => st.act, set: v => { st.act = !!v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Parameters', get: () => ({ v: B(R.total), sub: R.active < R.total ? `${B(R.active)} run per token` : 'all run per token' }) },
      { label: 'KV cache, full context', get: () => ({ v: `${GBf(R.kvBytes)} GB`, sub: `per conversation, ${Math.round(MODELS[st.m].ctx / 1024)}K tokens`, bad: R.kvBytes > 40e9 }) },
      { label: 'GPUs needed', get: () => ({ v: String(R.gpus), sub: st.act && R.realGpus > R.gpus ? `really ${R.realGpus}` : '80 GB each, BF16', bad: st.act && R.realGpus > R.gpus }) },
    ];
    const labels = [
      { name: 'config', t: 'The config file', d: 'A handful of numbers describe the model', icon: 'code', atV: V(keepT.position.x - 0.28, 0.3, keepT.position.z) },
      { name: 'gpus', t: 'What it takes to run', d: 'Weights plus one conversation\'s cache', icon: 'box', atV: V(2.83, 0.2, -0.3) },
    ];
    const reset = () => { Object.assign(st, { m: 1, kvMode: 0, tie: false, act: false }); draw(); };
    const breaks = [
      { label: 'Count the head as tied', hint: 'Llama 3 8B', on: () => { reset(); st.tie = true; draw(); }, off: reset },
      { label: 'Every head its own keys and values', hint: 'Llama 3 8B at 128K', on: () => { reset(); st.kvMode = 1; draw(); }, off: reset },
      { label: 'Size GPUs by active parameters', hint: 'Mixtral 8x7B', on: () => { reset(); st.m = 3; st.act = true; draw(); }, off: reset },
    ];
    function status() {
      const m = MODELS[st.m], ref = count(m, { kvMode: 0, tie: false, act: false });
      if (st.act && R.realGpus > R.gpus) return { ok: false, msg: `<b>Sized for ${R.gpus} GPU${R.gpus > 1 ? 's' : ''}; it needs ${R.realGpus}.</b> ${m.n} runs only ${B(R.active)} parameters per token, but the router can pick any expert for the next one, so all ${B(R.total)} must sit in memory: ${GBf(2 * R.total)} GB of weights, not ${GBf(R.wBytes)}. Experts save arithmetic, not memory.` };
      if (st.tie && !m.tie) return { ok: false, msg: `<b>Counted ${B(R.total)}; the real figure is ${B(ref.total)}.</b> ${m.n} does not tie its head to its embedding (tie_word_embeddings is false), so the head is a second ${m.V.toLocaleString('en')} × ${m.h} matrix: ${B(m.V * m.h)} parameters you miss by counting the vocabulary once.` };
      if (st.kvMode === 1 && R.kv !== m.kv) return { ok: false, msg: `<b>KV cache at ${Math.round(m.ctx / 1024)}K: ${GBf(R.kvBytes)} GB for one conversation, against ${GBf(ref.kvBytes)} GB as built.</b> With a key-value head for each of the ${m.nh} query heads, every token stores ${m.mla ? 'full keys and values instead of a compressed latent' : `${m.nh / m.kv} times as much`}. Weights and one cache now need ${R.gpus} GPU${R.gpus > 1 ? 's' : ''}. That is why every large open model shares keys and values.` };
      if (st.kvMode === 2) return { msg: `<b>One shared key-value head: the cache drops to ${GBf(R.kvBytes)} GB.</b> Multi-query attention saves the most memory but loses a little accuracy on hard tasks, which is why most models settle on groups.` };
      return { ok: true, msg: `<b>${m.n}: ${B(R.total)} parameters${R.active < R.total ? `, ${B(R.active)} per token` : ''}, ${R.gpus} GPU${R.gpus > 1 ? 's' : ''}.</b> All counted from the config: embedding${R.head ? ' and an untied head' : ', reused as the head'}, ${m.L} blocks of attention and ${m.E ? 'expert ' : ''}MLP, and a ${GBf(R.kvBytes)} GB cache for one conversation at full context.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One shape', home: true, say: 'A lab in Kigali and a start-up in Cape Town are choosing an open model to run. Every one has the same shape that GPT-2 set: an embedding, a stack of identical blocks, and a head that scores the next word.', act: m => m.set({ m: 0, kvMode: 0, tie: false, act: false }) },
    { t: 'Six knobs', focus: [-0.33, 0.2, 0.45], zoom: 1.6, say: 'What has changed since is six knobs: the norm, the position code, the activation, how heads share keys and values, dense or expert layers, and the context length.', act: m => m.set({ m: 1 }) },
    { t: 'Read the config', focus: [-2.3, 0.2, 0.1], zoom: 1.7, say: 'The config file lists a handful of numbers. From them alone you can count every parameter, and size the memory each conversation needs.', act: m => m.set({}) },
    { t: 'Shared keys and values', home: true, say: 'Give every query head its own keys and values, and one long conversation\'s cache grows fourfold. It no longer fits beside the weights on one GPU.', act: m => m.set({ kvMode: 1 }) },
    { t: 'Experts in memory', home: true, say: 'A mixture of experts runs two of its eight experts per token, but all eight must sit in memory. Size the GPUs by the active part, and it will not fit.', act: m => m.set({ m: 3, kvMode: 0, act: true }) },
    { t: 'The biggest', home: true, say: 'DeepSeek V3 holds six hundred and seventy one billion parameters but runs thirty seven billion per token, and its compressed attention keeps the cache smaller than a model a hundred times its size would need.', act: m => m.set({ m: 5, act: false }) },
  ],
  check: [
    { q: 'Llama 3 8B has tie_word_embeddings set to false. What does that mean for the count?', options: ['The head is a second vocabulary-sized matrix to add', 'The embedding can be skipped', 'Nothing changes'], answer: 0, why: '128,256 × 4,096 is about 525 million parameters.', hint: 'Turn on Count the head as tied.' },
    { q: 'Why do large open models share key-value heads between query heads?', options: ['To shrink the cache every conversation keeps', 'To make training faster', 'To add parameters'], answer: 0, why: 'Fewer key-value heads means fewer numbers stored per token.', hint: 'Try one key-value head per query head.' },
    { q: 'Mixtral runs 13 billion parameters per token. How much memory do its weights need?', options: ['Enough for all 47 billion', 'Enough for 13 billion', 'Enough for 7 billion'], answer: 0, why: 'Any expert may be chosen for the next token, so all of them stay loaded.', hint: 'Experts save arithmetic, not memory.' },
  ],
  terms: [
    ['RMSNorm', 'A norm that only rescales each vector by its root mean square; no mean, no bias.'],
    ['RoPE', 'Rotary position encoding: rotate queries and keys by an angle set by position, with nothing learned.'],
    ['SwiGLU', 'A gated activation: one projection, passed through Swish, multiplies another.'],
    ['Grouped-query attention', 'Several query heads read the same key-value head, so the cache is smaller.'],
    ['Tied embeddings', 'Using the embedding matrix again as the output head, so it is stored once.'],
    ['Active parameters', 'The parameters a mixture-of-experts model actually runs for one token.'],
  ],
  deeper: '<p><b>Counting by hand.</b> Attention in one block is the query and output projections (hidden × heads × head size each) plus keys and values (hidden × key-value heads × head size each). A gated MLP is three hidden × intermediate matrices. Multiply by the layers, then add the embedding, the head if untied, and the norms.</p><p><b>Sliding windows.</b> Gemma 2 alternates full attention with layers that only look back 4,096 tokens, so those layers\' caches stop growing. At its 8K context that saves a quarter of the cache; models that use more sliding layers save far more at long context.</p><p><b>Memory beyond weights.</b> Real serving also needs room for activations and for many conversations\' caches at once, so a model that just fits with one conversation is too big in practice.</p><p><b>About this machine.</b> Every count is computed live from the configs shown; DeepSeek-V3\'s latent attention projections are entered as one figure per layer.</p>',
  code: {
    title: 'Count parameters from a config',
    note: 'Adapted from the course\'s open models lesson.',
    text: `
def count(c):
    h, L, hd = c["hidden_size"], c["num_hidden_layers"], c.get("head_dim", c["hidden_size"] // c["num_attention_heads"])
    q = o = h * c["num_attention_heads"] * hd
    kv = 2 * h * c["num_key_value_heads"] * hd
    mlp = 3 * h * c["intermediate_size"]            # gated: gate, up, down
    block = q + kv + o + mlp + 2 * h                # two RMSNorms
    emb = c["vocab_size"] * h
    head = 0 if c.get("tie_word_embeddings") else emb
    return emb + head + L * block + h

def kv_cache_bytes(c, tokens, bytes_per=2):
    hd = c["hidden_size"] // c["num_attention_heads"]
    return 2 * c["num_hidden_layers"] * c["num_key_value_heads"] * hd * bytes_per * tokens
`,
  },
};
