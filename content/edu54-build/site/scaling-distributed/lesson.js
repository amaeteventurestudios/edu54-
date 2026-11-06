// Distributed training: a university consortium in Cape Town plans a training run on rented 80 GB GPUs. Memory per GPU is computed exactly as in the course's tables
// (before activations): mixed precision keeps 2 bytes of weights and 2 of gradients per parameter plus 8 bytes of Adam state in FP32; FP32 everywhere is 4 + 4 + 8.
// Data parallel keeps everything on every GPU; ZeRO-1 shards Adam state, ZeRO-2 also gradients, ZeRO-3 (FSDP) also weights. A 4-stage pipeline's idle share is
// (p - 1) / (m + p - 1) for m micro-batches, drawn as a schedule (forward passes only, for clarity).
// Break it: plain data parallel for 70B (840 GB per GPU), ZeRO-3 on only 8 GPUs (105 GB), one micro-batch through the pipeline (75% idle).
const MODELS = [8e9, 70e9], GPUS = [8, 16, 64], MB = [1, 8, 32], STRAT = ['Data parallel', 'ZeRO-1', 'ZeRO-2', 'ZeRO-3 / FSDP'], CAP = 80;
function mem(st) { const P = MODELS[st.m], N = GPUS[st.n], w = (st.fp32 ? 4 : 2) * P, g = (st.fp32 ? 4 : 2) * P, a = 8 * P;
  const f = [[1, 1, 1], [1, 1, 1 / N], [1, 1 / N, 1 / N], [1 / N, 1 / N, 1 / N]][st.s];
  const W = w * f[0] / 1e9, G = g * f[1] / 1e9, A = a * f[2] / 1e9; return { W, G, A, T: W + G + A, N, P }; }
function bubble(m, p = 4) { return (p - 1) / (m + p - 1); }

export default {
  slug: 'scaling-distributed',
  title: 'Distributed training: share the load',
  description: 'A university group in Cape Town plans a training run on rented 80 GB GPUs. See how memory fills for weights, gradients and state, and split it by the pipe.',
  overview: 'Large models do not fit on one GPU. Training with Adam in mixed precision needs, per parameter, 2 bytes of 16-bit weights, 2 bytes of gradients and 8 bytes for Adam\'s two running statistics in 32-bit: 12 bytes, so 70 billion parameters need 840 GB before activations, against 80 GB on an H100. Data parallelism copies the whole model to every GPU and splits the batch, averaging gradients after each step: faster, but no memory saved. ZeRO removes the copies in stages: stage 1 shards the optimizer state across GPUs, stage 2 the gradients too, stage 3 the weights as well, gathering each layer\'s weights just before it is used; PyTorch\'s FSDP is the same idea. Tensor parallelism splits each matrix across the GPUs of one node, which needs very fast links; pipeline parallelism splits the layers into stages across nodes, but a single batch leaves most stages idle, so the batch is cut into micro-batches that follow each other through the stages, and the idle share falls to (p − 1)/(m + p − 1). Mixed precision with BF16 halves weight and gradient memory, while the optimizer state stays in FP32. Real runs combine all of these: data parallel across groups, tensor parallel inside nodes and pipeline across nodes.',
  keywords: ['data parallelism', 'zero', 'fsdp', 'pipeline parallelism', 'tensor parallelism', 'mixed precision'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.1], dir: [0.05, 1.0, 1.15], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { m: 1, n: 2, s: 3, fp32: false, mb: 2 };
    const ink = '#151827', SC = 0.012; /* metres per GB */
    /* one GPU, enlarged: stacked memory */
    const gx = -2.35, gz = 0.1;
    const card = P.box(0.7, 0.06, 0.7, '#22252F', { r: 0.04 }); card.position.set(gx, 0.12, gz); floor.add(card);
    const segs = ['#3A6FB0', '#1F9E89', '#E07B39'].map(c => { const b = P.box(0.42, 1, 0.42, c, { r: 0.01 }); b.userData.noFit = true; floor.add(b); return b; });
    const capLine = P.box(0.58, 0.012, 0.58, '#C62828'); capLine.position.set(gx, 0.18 + CAP * SC, gz); capLine.material.transparent = true; capLine.material.opacity = 0.7; floor.add(capLine);




    const keepG = P.box(0.7, 1.05, 0.7, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(gx, 0.12, gz); floor.add(keepG);
    /* the cluster */
    const nodes = Array.from({ length: 64 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), b = P.box(0.13, 0.08, 0.13, '#fff', { r: 0.015, material: mm }); b.position.set(-1.45 + (i % 8) * 0.17, 0.12, -0.75 + Math.floor(i / 8) * 0.17); floor.add(b); return { b, mm }; });

    /* pipeline schedule */

    const ST = Array.from({ length: 4 }, (_, k) => {    return t; });
    const cells = Array.from({ length: 4 * 40 }, () => { const mm = new THREE.MeshBasicMaterial({ color: '#1F9E89' }), b = P.box(1, 0.03, 0.17, '#fff', { material: mm }); b.userData.noFit = true; b.layers.set(1); floor.add(b); return { b, mm }; });



    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let M = null, bub = 0;
    function draw() {
      M = mem(st); bub = bubble(MB[st.mb]);
      let y = 0.15; [M.W, M.G, M.A].forEach((v, i) => { const h = Math.max(0.004, Math.min(1.0, v * SC)); segs[i].scale.y = h; segs[i].position.set(gx, y, gz); y += h; });
      const ok = M.T <= CAP;
      nodes.forEach((n, i) => { n.b.visible = i < M.N; n.mm.color.set(ok ? '#1F9E89' : '#C62828'); });
      const m = MB[st.mb], p = 4, slots = Math.min(40, m + p - 1), w = 2.0 / slots;
      cells.forEach((c, k) => { const s = Math.floor(k / 40), t = k % 40; c.b.visible = t < slots; if (t >= slots) return; const busy = t >= s && t < s + m; c.b.scale.x = w * 0.92; c.b.position.set(0.85 + 0.2 + (t + 0.5) * w, 0.17, -0.72 + s * 0.22); c.mm.color.set(busy ? ['#1F9E89', '#3A6FB0', '#6B5E86', '#B07AA1'][s] : '#E6E1D6'); });



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Model', options: ['8B', '70B'], get: () => st.m, act: i => { st.m = i; draw(); } },
      { type: 'buttons', label: 'GPUs', options: GPUS.map(String), get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'Strategy', options: STRAT, get: () => st.s, act: i => { st.s = i; draw(); } },
      { type: 'buttons', label: 'Precision', options: ['Mixed (BF16)', 'FP32 everywhere'], get: () => (st.fp32 ? 1 : 0), act: i => { st.fp32 = !!i; draw(); } },
      { type: 'buttons', label: 'Micro-batches', options: MB.map(String), get: () => st.mb, act: i => { st.mb = i; draw(); } },
    ];
    const readouts = [
      { label: 'Memory per GPU', get: () => ({ v: `${M.T < 10 ? M.T.toFixed(1) : Math.round(M.T)} GB`, sub: 'before activations', good: M.T <= CAP, bad: M.T > CAP }) },
      { label: 'Fits on 80 GB', get: () => ({ v: M.T <= CAP ? 'Yes' : 'No', sub: `${Math.round(M.A)} GB is Adam state`, good: M.T <= CAP, bad: M.T > CAP }) },
      { label: 'Pipeline idle', get: () => ({ v: `${Math.round(bub * 100)}%`, sub: `4 stages, ${MB[st.mb]} micro-batch${MB[st.mb] > 1 ? 'es' : ''}`, good: bub < 0.15, bad: bub > 0.3 }) },
    ];
    const labels = [
      { name: 'gpu', t: 'One GPU', d: 'Red line: its 80 GB', icon: 'box', atV: V(gx - 0.4, 0.5, gz) },
      { name: 'pipe', t: 'Pipeline', d: 'Grey: a stage waiting', icon: 'wave', atV: V(2.86, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { m: 1, n: 2, s: 3, fp32: false, mb: 2 }); draw(); };
    const breaks = [
      { label: 'Plain data parallel, 70B', hint: 'Full copy on every GPU', on: () => { reset(); st.s = 0; draw(); }, off: reset },
      { label: 'ZeRO-3 on 8 GPUs', hint: 'Sharded, but too few shards', on: () => { reset(); st.n = 0; draw(); }, off: reset },
      { label: 'One micro-batch', hint: 'Whole batch at once', on: () => { reset(); st.mb = 0; draw(); }, off: reset },
    ];
    function status() {
      if (M.T > CAP && st.s === 0) return { ok: false, msg: `<b>${Math.round(M.T)} GB per GPU: out of memory.</b> Data parallelism gives every GPU a full copy: ${Math.round(M.W)} GB of weights, ${Math.round(M.G)} of gradients and ${Math.round(M.A)} of Adam state. Adding GPUs only adds copies. Shard the state with ZeRO or FSDP.` };
      if (M.T > CAP) return { ok: false, msg: `<b>${Math.round(M.T)} GB per GPU: still too much.</b> ${STRAT[st.s]} divides ${st.s === 3 ? 'everything' : 'part of the state'} by ${M.N}, but ${MODELS[st.m] / 1e9} billion parameters × ${st.fp32 ? 16 : 12} bytes ÷ ${M.N} is still over 80 GB, before activations. Use more GPUs${st.s < 3 ? ', shard more' : ''}${st.fp32 ? ', or mixed precision' : ''}.` };
      if (bub > 0.3) return { ok: false, msg: `<b>The pipeline is ${Math.round(bub * 100)}% idle.</b> With one batch, stage 2 waits for stage 1, stage 3 for stage 2, and so on: (4 − 1)/(1 + 4 − 1) of the time each GPU does nothing. Cut the batch into micro-batches so stages work on different ones at once; with 32 the idle share is ${Math.round(bubble(32) * 100)}%.` };
      return { ok: true, msg: `<b>${M.T < 10 ? M.T.toFixed(1) : Math.round(M.T)} GB per GPU, ${Math.round(bub * 100)}% idle.</b> ${STRAT[st.s]} across ${M.N} GPUs ${st.s ? `shards ${['', 'the Adam state', 'Adam state and gradients', 'weights, gradients and Adam state'][st.s]}` : 'copies the model'}, leaving room for activations, and ${MB[st.mb]} micro-batches keep the pipeline busy.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The run', home: true, say: 'A university consortium in Cape Town plans to train a seventy-billion-parameter model on rented 80-gigabyte GPUs.', act: m => m.set({ m: 1, n: 2, s: 3, fp32: false, mb: 2 }) },
    { t: 'The bill of memory', home: true, say: 'Each parameter needs two bytes of weights, two of gradients and eight of optimizer state: eight hundred and forty gigabytes in all.', act: m => m.set({ s: 0 }) },
    { t: 'Shard it', home: true, say: 'ZeRO stage three, or FSDP, splits weights, gradients and optimizer state across sixty-four GPUs. Each holds about thirteen gigabytes.', act: m => m.set({ s: 3 }) },
    { t: 'Too few shards', home: true, say: 'Shard across only eight GPUs, and each still needs over a hundred gigabytes.', act: m => m.set({ n: 0 }) },
    { t: 'Pipeline', home: true, say: 'Split the layers into four stages. Send the whole batch at once, and three stages wait at any moment.', act: m => m.set({ n: 2, mb: 0 }) },
    { t: 'Micro-batches', home: true, say: 'Cut the batch into thirty-two micro-batches, and the stages stay busy.', act: m => m.set({ mb: 2 }) },
  ],
  check: [
    { q: 'Why does plain data parallelism not save memory?', options: ['Every GPU holds a full copy of the model and its state', 'It uses FP32', 'It has no gradients'], answer: 0, why: 'It only speeds training.' },
    { q: 'What does ZeRO stage 3 shard?', options: ['Weights, gradients and optimizer state', 'Only the data', 'Only activations'], answer: 0, why: 'The same idea as FSDP.' },
    { q: 'How do micro-batches help a pipeline?', options: ['Stages work on different micro-batches at once', 'They shrink the model', 'They skip layers'], answer: 0, why: 'Idle share (p−1)/(m+p−1).' },
  ],
  terms: [
    ['Data parallelism', 'Copy the model, split the batch, average gradients.'],
    ['ZeRO', 'Sharding optimizer state, gradients and weights in stages.'],
    ['FSDP', 'PyTorch\'s fully sharded data parallel, like ZeRO-3.'],
    ['Tensor parallelism', 'Splitting each matrix across GPUs in a node.'],
    ['Pipeline parallelism', 'Splitting layers into stages across GPUs.'],
    ['Mixed precision', '16-bit compute with 32-bit master weights and state.'],
  ],
  deeper: '<p><b>Compute in Africa.</b> GPU capacity on the continent is growing in data centres in Johannesburg, Cape Town, Nairobi and Lagos, but most groups still rent time. Knowing exactly how much memory a run needs decides how many GPUs to rent and for how long.</p><p><b>Activations.</b> Every figure here is before activations; activation checkpointing, in a later lesson, trades recomputation for memory.</p><p><b>About this machine.</b> Memory figures are exact for the stated byte counts; the pipeline idle share uses the standard formula.</p>',
  code: {
    title: 'Memory per GPU',
    note: 'Adapted from the course\'s distributed-training lesson.',
    text: `
def per_gpu_gb(params, gpus, stage, bytes_w=2, bytes_g=2, bytes_adam=8):
    w, g, a = params * bytes_w, params * bytes_g, params * bytes_adam
    if stage >= 1: a /= gpus          # ZeRO-1: shard optimizer state
    if stage >= 2: g /= gpus          # ZeRO-2: and gradients
    if stage >= 3: w /= gpus          # ZeRO-3 / FSDP: and weights
    return (w + g + a) / 1e9

def bubble(micro_batches, stages=4):
    return (stages - 1) / (micro_batches + stages - 1)
`,
  },
};
