// Attention variants: a model reads a long Hausa news report; the question at the end needs a name from the first line. The floor is the attention mask for 24 positions
// (rows: the query, columns: the keys it may read): full causal, a sliding window, or local plus strided. The gold row is the last position; its columns rise where it can
// read after all the layers, following the window forward layer by layer. The bars on the right are one row's attention weights, regular or differential (one softmax
// minus a scaled second one, cancelling the weight dumped on the first token). Masks, reach, compute and cache share are computed live; the attention scores are set by hand.
// Break it: a sliding window everywhere with only two layers (the name is out of reach), full attention at 128K tokens (compute and cache explode), regular softmax
// (a third of the weight sinks onto the first token instead of the name).
const N = 24, NAME = 1, CTXS = [24, 131072];

export default {
  slug: 'attention-variants',
  title: 'Attention variants: who reads whom',
  description: 'A model reads a long Hausa news report, and the question at the end needs a name from the first line.',
  overview: 'Full causal attention lets every token read every earlier one, which costs time and cache memory that grow with the context. Sliding-window attention lets each token read only the last W tokens: compute and the KV cache shrink to the window, and information still travels further each layer, so after L layers a token can draw on about L × W positions back. Too few layers or too small a window, and early facts are out of reach, which is why models such as Gemma interleave a full-attention layer every few window layers. Sparse patterns combine a local window with strided or global tokens to reach far at lower cost, and modern kernels skip the masked blocks entirely. Softmax makes every row sum to one, so a token with nothing useful to read dumps weight on the first token, an attention sink. Differential attention computes two maps and subtracts a learned fraction of the second, cancelling the shared noise and sharpening attention on what matters.',
  keywords: ['sliding window attention', 'sparse attention', 'differential attention', 'attention sink', 'receptive field', 'kv cache'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.1, 1.0, 1.1], half: 1.6, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { kind: 1, W: 4, layers: 4, global: true, diff: true, ctx: 0 };
    const ink = '#151827', CELL = 0.12, GX = -1.1, GZ = 0.1;
    const geo = new THREE.BoxGeometry(CELL * 0.85, 1, CELL * 0.85); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N * N); im.frustumCulled = false; im.userData.noFit = true; floor.add(im);
    const keep = P.box(N * CELL, 0.5, N * CELL, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(GX, 0.17, GZ); floor.add(keep);
    const kx = j => GX - N * CELL / 2 + (j + 0.5) * CELL, qz = i => GZ - N * CELL / 2 + (i + 0.5) * CELL;




    /* attention weights for the last row */
    const BX = 1.75, bb = P.box(2.6, 1.5, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); bb.position.set(BX, 0.3, -0.7); floor.add(bb);
    [-1.15, 1.15].forEach(dx => { const p = P.cyl(0.03, 0.18, '#8A8578'); p.position.set(BX + dx, 0.12, -0.7); floor.add(p); });

    const WORDS = ['first token', 'the name', 'other words', 'recent words'];
    const wb = WORDS.map((w, k) => { const x = BX - 0.9 + k * 0.6, mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(0.38, 1, 0.06, '#888', { r: 0.015, material: mm }); b.position.set(x, 0.55, -0.64); b.userData.noFit = true; floor.add(b);
         return { b, mm, x }; });

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const allowed = (i, j) => { if (j > i) return false; if (st.kind === 0) return true; if (i - j < st.W) return true; return st.kind === 2 && j % st.W === st.W - 1; };
    function run() {
      // reach: which keys influence the last query after all layers (one global layer, if chosen, sees everything)
      let reach = new Set([N - 1]);
      for (let l = 0; l < st.layers; l++) { const g = st.global && l === st.layers - 1 && st.kind !== 0; const nx = new Set(reach); reach.forEach(i => { for (let j = 0; j <= i; j++) if (g || allowed(i, j)) nx.add(j); }); reach = nx; }
      let cells = 0; for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) if (allowed(i, j)) cells++;
      const full = N * (N + 1) / 2, n = CTXS[st.ctx];
      const frac = st.kind === 0 ? 1 : st.kind === 1 ? Math.min(1, st.W * 2 / (n + 1)) : Math.min(1, (st.W + n / st.W) * 2 / (n + 1));
      const layerFrac = st.kind === 0 ? 1 : (st.global ? (frac * (st.layers - 1) + 1) / st.layers : frac);
      const cacheGB = 2 * 32 * 8 * 128 * 2 * n * layerFrac / 1024 ** 3;
      const reached = reach.has(NAME);
      // attention weights of the last row over four groups (scores set by hand)
      const sink = 0.34, nameW = reached ? 0.3 : 0, base = [sink, nameW, 0.16, 0.2];
      const z = base.reduce((a, b) => a + b, 0), reg = base.map(b => b / z);
      const second = [0.6, 0.05, 0.15, 0.2], lam = 0.55;
      let dif = reg.map((r, k) => Math.max(0, r - lam * second[k] * reg[0] / 0.6 * (k === 0 ? 1 : 0.4)));
      const dz = dif.reduce((a, b) => a + b, 0); dif = dif.map(d => d / dz);
      return { reach, cells, full, frac, layerFrac, cacheGB, reached, w: st.diff ? dif : reg, n };
    }
    function draw() {
      R = run();
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = allowed(i, j), last = i === N - 1, r = last && R.reach.has(j);
        m4.makeScale(1, j > i ? 0.002 : last ? (r ? 0.35 : 0.04) : a ? 0.06 : 0.01, 1).setPosition(kx(j), 0.15, qz(i)); im.setMatrixAt(i * N + j, m4);
        im.setColorAt(i * N + j, col.set(j > i ? '#2B2B38' : last ? (r ? (j === NAME ? '#1F9E89' : '#F2C94C') : '#D64545') : a ? C.plum : '#4A4D60')); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      wb.forEach((B, k) => { const h = Math.max(0.01, R.w[k] * 1.6); B.b.scale.y = h; B.mm.color.set(k === 0 ? '#8E91A3' : k === 1 ? '#1F9E89' : C.plum);   });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Pattern', options: ['Full causal', 'Sliding window', 'Local + strided'], get: () => st.kind, act: i => { st.kind = i; draw(); } },
      { type: 'slider', label: 'Window W', min: 2, max: 8, step: 1, get: () => st.W, set: v => { st.W = v; draw(); } },
      { type: 'slider', label: 'Layers', min: 1, max: 6, step: 1, get: () => st.layers, set: v => { st.layers = v; draw(); } },
      { type: 'toggle', label: 'Last layer uses full attention', short: 'global layer', get: () => st.global, set: v => { st.global = v; draw(); } },
      { type: 'toggle', label: 'Differential attention', short: 'differential', get: () => st.diff, set: v => { st.diff = v; draw(); } },
      { type: 'buttons', label: 'Context', options: ['24 tokens', '128K tokens'], get: () => st.ctx, act: i => { st.ctx = i; draw(); } },
    ];
    const readouts = [
      { label: 'Name in reach', get: () => ({ v: R.reached ? 'yes' : 'no', sub: `${R.reach.size} of ${N} positions reach the question`, good: R.reached, bad: !R.reached }) },
      { label: 'Attention work', get: () => ({ v: `${Math.max(0.01, R.layerFrac * 100).toFixed(R.layerFrac < 0.01 ? 2 : 0)}%`, sub: `of full attention at ${R.n.toLocaleString('en')} tokens` }) },
      { label: 'KV cache', get: () => ({ v: R.cacheGB >= 1 ? `${R.cacheGB.toFixed(1)} GB` : `${Math.round(R.cacheGB * 1024)} MB`, sub: '32 layers, 8 KV heads, fp16', bad: R.cacheGB > 10, good: R.cacheGB < 2 }) },
    ];
    const labels = [
      { name: 'mask', t: 'Attention mask', d: 'Gold row: the question; green: the name', icon: 'target', atV: V(GX - N * CELL / 2 - 0.1, 0.2, GZ) },
      { name: 'weights', t: 'Where it looks', d: 'One row\'s weights', icon: 'scale', atV: V(BX + 1.32, 1.0, -0.7) },
    ];
    const reset = () => { Object.assign(st, { kind: 1, W: 4, layers: 4, global: true, diff: true, ctx: 0 }); draw(); };
    const breaks = [
      { label: 'Window only, two layers', hint: 'No global layer', on: () => { reset(); st.layers = 2; st.global = false; draw(); }, off: reset },
      { label: 'Full attention at 128K', hint: 'Every token reads every token', on: () => { reset(); st.kind = 0; st.ctx = 1; draw(); }, off: reset },
      { label: 'Regular softmax', hint: 'No differential', on: () => { reset(); st.diff = false; draw(); }, off: reset },
    ];
    function status() {
      const sk = Math.round(R.w[0] * 100), nm = Math.round(R.w[1] * 100);
      if (!R.reached) return { ok: false, msg: `<b>The name is out of reach.</b> Each layer lets a token read only the last ${st.W} positions, so after ${st.layers} layer${st.layers > 1 ? 's' : ''} the question can draw only on the last ${R.reach.size} positions, and the name in the first line (red row) never arrives. Add layers, widen the window, or make one layer use full attention, as Gemma does every few layers.` };
      if (st.kind === 0 && st.ctx === 1) return { ok: false, msg: `<b>Every token reads every token, at 128,000 tokens.</b> Full attention reaches everything, but its work grows with the square of the context and its cache with the length: ${R.cacheGB.toFixed(0)} GB for one conversation. A sliding window with one full layer in six keeps the reach and cuts both by most of the way.` };
      if (!st.diff) return { ok: false, msg: `<b>${sk}% of the attention sinks onto the first token.</b> Softmax forces each row to sum to one, so weight that has nowhere useful to go piles onto the first token, and the name gets only ${nm}%. Differential attention subtracts a scaled second map that captures that shared noise, freeing the weight for the name.` };
      return { ok: true, msg: `<b>The name is in reach, and gets ${nm}% of the attention.</b> ${st.kind === 0 ? 'Full attention reads everything at this short length.' : `A window of ${st.W} over ${st.layers} layers${st.global ? ', with a full-attention last layer,' : ''} carries the name forward`}, using ${Math.max(0.01, R.layerFrac * 100).toFixed(R.layerFrac < 0.01 ? 2 : 0)}% of full attention's work; differential attention leaves only ${sk}% on the first token.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A long report', home: true, say: 'A model reads a long Hausa news report. The question at the end needs a name from the very first line.', act: m => m.set({ kind: 0, W: 4, layers: 4, global: true, diff: true, ctx: 0 }) },
    { t: 'Full attention', home: true, say: 'With full causal attention, the question reads every earlier word directly. But the work and memory grow with the length.', act: m => m.set({ kind: 0 }) },
    { t: 'A sliding window', home: true, say: 'A sliding window lets each word read only the last few. Information still travels forward, one window per layer.', act: m => m.set({ kind: 1, global: false }) },
    { t: 'Out of reach', home: true, say: 'With only two layers, the name never reaches the question. One full-attention layer fixes it.', act: m => m.set({ layers: 2 }) },
    { t: 'Mix the layers', home: true, say: 'Window layers with a full layer on top keep the reach and most of the savings, even at a hundred and twenty-eight thousand tokens.', act: m => m.set({ layers: 4, global: true, ctx: 1 }) },
    { t: 'The sink', home: true, say: 'Plain softmax dumps spare weight on the first token. Differential attention subtracts that noise, and the name gets more attention.', act: m => m.set({ ctx: 0, diff: false }) },
  ],
  check: [
    { q: 'With a window of W and L layers, roughly how far back can a token draw information?', options: ['About L × W positions', 'Only W positions', 'The whole context always'], answer: 0, why: 'Each layer extends the reach by a window.' },
    { q: 'Why do models interleave full-attention layers with window layers?', options: ['To keep long-range reach while saving most of the cost', 'Window layers cannot be trained', 'To make the cache bigger'], answer: 0, why: 'Gemma uses one full layer in six.' },
    { q: 'What does differential attention cancel?', options: ['Weight dumped on tokens like the first one, the attention sink', 'The causal mask', 'Position information'], answer: 0, why: 'It subtracts a scaled second map.' },
  ],
  terms: [
    ['Sliding window attention', 'Each token reads only the last W tokens.'],
    ['Receptive field', 'How far back information can travel through the layers.'],
    ['Sparse attention', 'A fixed pattern of allowed positions, such as local plus strided.'],
    ['Global layer', 'A layer with full attention among window layers.'],
    ['Attention sink', 'Spare attention weight piling onto the first tokens.'],
    ['Differential attention', 'Two attention maps, one subtracted from the other.'],
  ],
  deeper: '<p><b>Kernels make it pay.</b> Masks only save time when the kernel skips the masked blocks; FlashAttention and FlexAttention load only the blocks a pattern allows.</p><p><b>Long documents.</b> Court records, parliamentary transcripts and radio archives in Hausa, Amharic and Swahili run to hundreds of thousands of tokens. Window and sparse patterns make reading them affordable; a few full layers keep names and dates in reach.</p><p><b>About this machine.</b> Masks, reach, the share of attention work and the cache size are computed live; the attention scores for the last row are set by hand to show the sink.</p>',
  code: {
    title: 'Sliding-window and strided masks',
    note: 'Adapted from the course\'s attention variants lesson.',
    text: `
import numpy as np

def sliding_window_mask(n, w):
    i, j = np.indices((n, n))
    return (j <= i) & (i - j < w)

def local_strided_mask(n, w):
    i, j = np.indices((n, n))
    return (j <= i) & ((i - j < w) | (j % w == w - 1))

def diff_attention(A1, A2, V, lam=0.6):
    return (A1 - lam * A2) @ V          # the shared noise cancels
`,
  },
};
