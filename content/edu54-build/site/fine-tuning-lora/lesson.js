// LoRA and QLoRA: a legal-aid clinic in Kampala adapts an open 7B model to write case notes in its own format.
// The toy layer trains live: a frozen 24×24 weight matrix W; the task needs an update ΔW of rank 4 (singular values 1.2, 0.8, 0.5, 0.3) plus faint noise.
// LoRA learns B (24×r, starts at zero) and A (r×24, starts random) by gradient descent on ‖(α/r)·BA − ΔW‖², the exact expected error for random inputs.
// QLoRA rounds W to 4 bits per row with the NF4 table (Dettmers et al. 2023), so the adapter must also absorb the rounding error. Full fine-tuning learns ΔW directly.
// Memory for a 7B model (Llama 2 7B shape, 6.74B parameters, adapters on q and v in 32 layers): full fine-tuning 16 bytes a parameter (bf16 weights and gradients,
// fp32 master copy and Adam); LoRA: bf16 base + 16 bytes per adapter parameter + 4 GB of activations; QLoRA: 4-bit base with double-quantised constants (~0.127 bits a parameter).
const D = 24, RS = [1, 2, 4, 8, 16], AL = [1, 2, 16], STEPS = 600, LR = 0.05;
let seed = 13; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const mat = (r, c, f) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));
const ortho = k => { const vs = []; for (let n = 0; n < k; n++) { let v = Array.from({ length: D }, g); for (const u of vs) { const d = v.reduce((a, x, i) => a + x * u[i], 0); v = v.map((x, i) => x - d * u[i]); } const nn = Math.hypot(...v); vs.push(v.map(x => x / nn)); } return vs; };
const U = ortho(4), VV = ortho(4), SV = [1.2, 0.8, 0.5, 0.3];
const DW = mat(D, D, (i, j) => SV.reduce((a, s, k) => a + s * U[k][i] * VV[k][j], 0) + g() * 0.006);
const W = mat(D, D, () => g() * 0.15);
const NF4 = [-1, -0.6962, -0.5251, -0.3949, -0.2844, -0.1848, -0.0911, 0, 0.0796, 0.1609, 0.2461, 0.3379, 0.4407, 0.5626, 0.723, 1];
const WQ = W.map(row => { const m = Math.max(...row.map(Math.abs)); return row.map(x => { let b = NF4[0]; for (const l of NF4) if (Math.abs(l - x / m) < Math.abs(b - x / m)) b = l; return b * m; }); });
const fro = M => M.reduce((a, r) => a + r.reduce((b, x) => b + x * x, 0), 0);
const N0 = fro(DW);
const AR = mat(16, D, () => g() / Math.sqrt(D)), BR = mat(D, 16, () => g() * 0.3);
const P7 = 6.74e9, AD = r => 32 * 2 * r * (4096 + 4096);
function mem(m, r) {
  if (m === 0) return { gb: P7 * 16 / 1e9, train: P7 };
  const a = AD(r), base = m === 1 ? P7 * 2 : P7 * (0.5 + 0.127 / 8);
  return { gb: (base + a * 16) / 1e9 + 4, train: a };
}
const METHODS = ['Full fine-tune', 'LoRA', 'QLoRA'];

export default {
  slug: 'fine-tuning-lora',
  title: 'LoRA: fine-tune a sliver, freeze the rest',
  description: 'A clinic in Kampala adapts an open model. LoRA freezes the weights and trains two thin matrices; watch the gap and memory towers.',
  overview: 'Fine-tuning changes a model\'s weights so it adopts a style, format or skill that prompting alone can\'t pin down. Updating all of them means storing gradients and optimiser state for every parameter: about 16 bytes each, over 100 GB for a 7-billion-parameter model. Hu and colleagues (2021) noticed that the change fine-tuning makes to a weight matrix has low rank: it can be written as the product of two thin matrices, B (tall) times A (wide). LoRA freezes the original weights W and learns only B and A, so a layer computes Wx + (α/r)·BAx. With rank r of 8 or 16 that is well under one percent of the parameters. B starts at zero, so on the first step the model behaves exactly like the original; α sets how strongly the update counts. QLoRA (Dettmers and colleagues, 2023) also stores the frozen weights in 4 bits, using a number format (NF4) whose 16 levels follow the bell curve of real weights, so a 7B model trains on one consumer GPU. Afterwards the adapter can be merged into the weights, W + (α/r)·BA, or kept separate so one base model can swap adapters per task. Try prompting and retrieval first; fine-tune for style, format and behaviour, not for facts that change.',
  keywords: ['LoRA', 'QLoRA', 'fine-tuning', 'parameter-efficient fine-tuning', 'PEFT', 'low-rank adaptation', 'NF4'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.4], dir: [0.4, 0.85, 1.3], half: 1.9, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { m: 1, r: 3, a: 1, zero: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', GREY = '#9A968C';
        /* matrices as fields of little bars */
    const SP = 0.03, PZ = -0.15, PAN = { W: -2.5, B: -1.72, A: -1.03, L: 0.02, N: 0.95 };
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const MAXI = D * D * 3 + D * 16 * 2;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXI); im.frustumCulled = false; im.userData.noFit = true; im.layers.set(1); S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const pad = P.box(4.28, 0.02, 1.25, '#FFFFFF', { r: 0.03 }); pad.position.set(-0.78, 0.12, PZ); S.add(pad);
    const keep = P.box(4.0, 0.5, 1.25, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-0.75, 0.12, PZ); S.add(keep);
    const ops = [['+', -2.07], ['×', -1.44], ['=', -0.5], ['≈', 0.5]].map(([t, x]) => { const o = S.text(t, { size: 0.12, weight: 800, color: CHAR }); o.position.set(x, 0.15, PZ); S.add(o); return o; });
    /* results: a tower for the gap left, three towers for the memory each method needs on a 7B model, and a slab at one 24 GB GPU */
    const MH = gb => 0.05 + Math.min(1, gb / 110) * 1.6, TZ = -1.3;
    const gapTw = P.tower(0.6, 0.6, SAF, { size: 0.26 }); gapTw.position.set(2.05, 0.12, PZ + 0.1); S.add(gapTw);
    const memTw = METHODS.map((_, i) => { const t = P.tower(0.5, 0.5, GREY, { size: 0.24 }); t.position.set(0.55 + i * 0.66, 0.12, TZ); S.add(t); return t; });
    const gpuM = new THREE.MeshLambertMaterial({ color: GOOD, transparent: true, opacity: 0.45 });
    const gpuSlab = P.box(1.95, 0.025, 0.62, '#fff', { r: 0.01, material: gpuM }); gpuSlab.position.set(1.21, 0.12 + MH(24), TZ); S.add(gpuSlab);
    S.add(P.keep(-2.9, 2.4, 1.95, -1.6, 0.45));
    let A = null, B = null, F = null, tgt = null, hist = [], step = 0, dead = false;
    const r = () => RS[st.r], sc = () => AL[st.a];
    function reset0() {
      const rr = r();
      A = mat(rr, D, (i, j) => AR[i][j]); B = mat(D, rr, (i, j) => st.zero ? 0 : BR[i][j]); F = mat(D, D, () => 0);
      tgt = mat(D, D, (i, j) => DW[i][j] + (st.m === 2 ? W[i][j] - WQ[i][j] : 0));
      hist = []; step = 0; dead = false; hist.push(err().L);
    }
    function learned() { const rr = r(); return st.m === 0 ? F : mat(D, D, (i, j) => { let v = 0; for (let k = 0; k < rr; k++) v += B[i][k] * A[k][j]; return sc() * v; }); }
    function err() { const Lm = learned(), E = mat(D, D, (i, j) => Lm[i][j] - tgt[i][j]); return { E, L: fro(E) / N0, Lm }; }
    function train(n) {
      const rr = r(), s = sc();
      for (let t = 0; t < n && step < STEPS && !dead; t++) {
        const { E, L } = err();
        if (!isFinite(L) || L > 1e4) { dead = true; break; }
        if (st.m === 0) { for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) F[i][j] -= LR * 2 * E[i][j]; }
        else {
          const gB = mat(D, rr, (i, k) => { let v = 0; for (let j = 0; j < D; j++) v += E[i][j] * A[k][j]; return 2 * s * v; });
          const gA = mat(rr, D, (k, j) => { let v = 0; for (let i = 0; i < D; i++) v += B[i][k] * E[i][j]; return 2 * s * v; });
          for (let i = 0; i < D; i++) for (let k = 0; k < rr; k++) B[i][k] -= LR * gB[i][k];
          for (let k = 0; k < rr; k++) for (let j = 0; j < D; j++) A[k][j] -= LR * gA[k][j];
        }
        step++; const L2 = err().L; hist.push(isFinite(L2) ? L2 : 1e9); if (!isFinite(L2) || L2 > 1e4) dead = true;
      }
    }
    function bars() {
      let n = 0;
      const put = (cx, M, rows, cols, h0) => {
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          const v = M ? M[i][j] : 0, h = Math.min(0.35, Math.abs(v) * h0);
          dummy.position.set(cx + (j - (cols - 1) / 2) * SP, 0.135, PZ + (i - (rows - 1) / 2) * SP); dummy.scale.set(SP * 0.82, Math.max(0.003, isFinite(h) ? h : 0.6), SP * 0.82); dummy.updateMatrix();
          im.setMatrixAt(n, dummy.matrix); im.setColorAt(n, col.set(!isFinite(v) ? RED : v >= 0 ? GOOD : BAD)); n++;
        }
      };
      const Wshow = st.m === 2 ? WQ : W;
      for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) { const v = Wshow[i][j]; dummy.position.set(PAN.W + (j - (D - 1) / 2) * SP, 0.135, PZ + (i - (D - 1) / 2) * SP); dummy.scale.set(SP * 0.82, Math.max(0.003, Math.abs(v) * 0.9), SP * 0.82); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); im.setColorAt(n, col.set(v >= 0 ? '#8E8C84' : '#C9C6BD')); n++; }
      if (st.m) { put(PAN.B, B, D, r(), 0.4); put(PAN.A, A, r(), D, 0.4); }
      put(PAN.L, err().Lm, D, D, 0.25); put(PAN.N, tgt, D, D, 0.25);
      for (let j = n; j < MAXI; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const last = hist[hist.length - 1];
      gapTw.userData.set({ h: dead ? 1.6 : 0.05 + Math.min(1, last) * 1.55, cap: dead ? '×' : `${(last * 100).toFixed(last < 0.1 ? 1 : 0)}%`, color: dead || last > 0.2 ? RED : last < 0.03 ? GOOD : SAF });
    }
    function labels0() {
      const rr = r(), M = mem(st.m, rr);
      ops[0].visible = ops[1].visible = !!st.m;
      memTw.forEach((t, i) => { const v = mem(i, rr); t.userData.set({ h: MH(v.gb), cap: v.gb.toFixed(v.gb < 20 ? 1 : 0), color: i === st.m ? (v.gb <= 24 ? GOOD : CHAR) : GREY }); });
    }
    function draw() { reset0(); labels0(); bars(); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { gapTw.userData.tick(dt); memTw.forEach(t => t.userData.tick(dt)); if (step >= STEPS || dead) return; train(6); bars(); };
    const controls = [
      { type: 'buttons', label: 'Method', options: METHODS, get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Rank r', options: RS.map(String), get: () => st.r, act: i => set({ r: i }) },
      { type: 'buttons', label: 'Scale α', options: ['= r', '2 × r', '16 × r'], get: () => st.a, act: i => set({ a: i }) },
      { type: 'toggle', label: 'B starts at zero', get: () => st.zero, set: v => set({ zero: !!v }), quick: false },
      { type: 'button', label: 'Train again', act: () => { reset0(); bars(); } },
    ];
    const readouts = [
      { label: 'Gap left', get: () => { const L = hist[hist.length - 1]; return { v: dead ? 'blew up' : `${(L * 100).toFixed(L < 0.1 ? 1 : 0)}%`, sub: `after ${step} steps`, good: !dead && L < 0.03, bad: dead || L > 0.2 }; } },
      { label: 'Memory, 7B model', get: () => { const M = mem(st.m, r()); return { v: `${M.gb.toFixed(M.gb < 20 ? 1 : 0)} GB`, sub: M.gb <= 24 ? 'one consumer GPU' : 'data-centre GPUs', good: M.gb <= 24 }; } },
      { label: 'Adapter file', get: () => ({ v: st.m ? `${(AD(r()) * 2 / 1e6).toFixed(0)} MB` : `${(P7 * 2 / 1e9).toFixed(1)} GB`, sub: st.m ? 'swap per task' : 'a whole new model' }) },
    ];
    const labels = [
      { name: 'frozen', t: 'Frozen weights W', d: 'The original model, untouched', icon: 'layers', atV: V(-2.88, 0.2, -0.15) },
      { name: 'adapter', t: 'B and A', d: 'Two thin matrices; their product is the update', icon: 'grid', atV: V(-1.38, 0.15, 0.3) },
      { name: 'gap', t: 'Gap left', d: 'How far the learned update is from the needed one', icon: 'target', atV: V(2.37, 0.3, PZ + 0.1) },
      { name: 'memory', t: 'Memory for 7B', d: 'Gigabytes for full, LoRA, QLoRA; the green slab is one 24 GB GPU', icon: 'gauge', atV: V(2.13, 1.0, TZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rank too low', hint: 'r = 1 for a rank-4 change', on: () => set({ ...D0, r: 0 }), off: reset },
      { label: 'B starts random', hint: 'not at zero', on: () => set({ ...D0, zero: false }), off: reset },
      { label: 'Scale far too big', hint: 'α = 16 × r', on: () => set({ ...D0, a: 2 }), off: reset },
    ];
    function status() {
      const L = hist[hist.length - 1], done = step >= STEPS || dead;
      if (dead) return { ok: false, msg: `<b>Training blew up after ${step} ${step === 1 ? 'step' : 'steps'}.</b> The update counts α/r = ${sc()} times, so every gradient step is ${sc() * sc() / 4}× bigger than at α = 2r, and the weights overshoot further each step. Raising α is like raising the learning rate: keep it near r or 2r, or lower the learning rate with it.` };
      if (!st.zero && st.m) return { ok: false, msg: `<b>B starts random: before any training, the model is ${hist[0].toFixed(0)}× further off than the original.</b> With B at zero the adapter adds nothing on step one, so fine-tuning starts from the model you trusted. A random B scrambles every layer's output on day one, and training spends its first steps undoing the damage.` };
      if (st.m && r() < 4) return { ok: false, msg: `<b>Rank ${r()} for a change of rank 4: ${(L * 100).toFixed(0)}% of the gap ${done ? 'never closes' : 'is left so far'}.</b> B × A can only make updates of rank ${r()}, so the weaker directions of the change are out of reach however long it trains. Rank 4 or more fits it; past that, extra rank adds little.` };
      if (!done) return { msg: `<b>Training: step ${step} of ${STEPS}, ${(L * 100).toFixed(1)}% of the gap left.</b>` };
      if (st.m === 0) return { msg: `<b>Full fine-tuning closes the gap, at ${mem(0).gb.toFixed(0)} GB for a 7B model.</b> Every weight gets a gradient and optimiser state, and the result is a whole new copy of the model.` };
      if (st.m === 2) return { ok: L < 0.05 ? true : undefined, msg: `<b>QLoRA: ${(L * 100).toFixed(1)}% of the gap left, in ${mem(2, r()).gb.toFixed(1)} GB.</b> The frozen weights are stored in 4 bits (NF4), and the adapter learns the task and soaks up some of the rounding. A higher rank closes more of it.` };
      return { ok: L < 0.03 ? true : undefined, msg: `<b>LoRA rank ${r()}: ${(L * 100).toFixed(1)}% of the gap left, training ${(mem(1, r()).train / 1e6).toFixed(1)}M of 6.74B parameters.</b> The change the task needs has low rank, so two thin matrices capture it. Merge it in as W + (α/r)·BA, or keep the ${(AD(r()) * 2 / 1e6).toFixed(0)} MB adapter and swap it per task.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The change a task needs', home: true, say: 'A legal-aid clinic in Kampala wants an open model to write case notes its own way. Full fine-tuning changes every weight, and for a seven-billion-parameter model that needs over a hundred gigabytes.', act: m => m.set({ m: 0, r: 3, a: 1, zero: true }) },
    { t: 'Freeze W, train B and A', home: true, say: 'LoRA freezes the weights and learns two thin matrices beside them. Their product is the update. Watch it close the gap while training a tiny fraction of the parameters.', act: m => m.set({ m: 1 }) },
    { t: 'Rank', home: true, say: 'The rank is how many directions the update can change. This task needs four. With rank one, part of the change stays out of reach, however long it trains.', act: m => m.set({ r: 0 }) },
    { t: 'Why B starts at zero', home: true, say: 'B starts at zero, so the adapter adds nothing at first and the model begins exactly as it was. Start it random, and the model is scrambled before training even starts.', act: m => m.set({ r: 3, zero: false }) },
    { t: 'QLoRA', home: true, say: 'QLoRA also stores the frozen weights in four bits. The adapter soaks up some of the rounding, and the whole job fits on one consumer GPU.', act: m => m.set({ m: 2, zero: true }) },
    { t: 'Merge or swap', home: true, say: 'When training ends, merge the adapter into the weights, or keep it as a small file and swap adapters for different tasks on one base model.', act: m => m.set({ m: 1 }) },
  ],
  check: [
    { q: 'Why can LoRA train so few parameters?', options: ['The change fine-tuning makes has low rank, so two thin matrices capture it', 'It skips most layers', 'It only trains the output layer'], answer: 0, why: 'B (d × r) times A (r × d) covers a rank-r change with 2·d·r numbers.', hint: 'Try ranks 1, 4 and 16.' },
    { q: 'Why does B start at zero?', options: ['So the adapter adds nothing at first and training starts from the original model', 'To save memory', 'Zero trains faster than anything else'], answer: 0, why: 'A random B scrambles every layer before training begins.', hint: 'Try the B starts random break.' },
    { q: 'What does QLoRA add to LoRA?', options: ['The frozen weights are stored in 4 bits', 'It trains in 4 bits', 'It removes the adapter'], answer: 0, why: 'The base shrinks to about a quarter; the adapter stays in 16-bit.', hint: 'Compare memory for LoRA and QLoRA.' },
  ],
  terms: [
    ['Fine-tuning', 'Training an existing model further on your own examples.'],
    ['LoRA', 'Low-rank adaptation: freeze the weights and train a thin update B × A beside them.'],
    ['Rank', 'How many independent directions an update can change; the inner size of B and A.'],
    ['Alpha (α)', 'A scale on the LoRA update; α/r multiplies B × A.'],
    ['QLoRA', 'LoRA on top of frozen weights stored in 4 bits.'],
    ['NF4', 'A 4-bit number format whose 16 levels follow the bell curve of neural network weights.'],
    ['Adapter', 'The small file of trained LoRA matrices, merged into the model or loaded beside it.'],
  ],
  deeper: '<p><b>Where to put adapters.</b> The original paper found the query and value projections in attention a good default. Adding the key, output and feed-forward layers helps harder tasks like code, at about twice the parameters.</p><p><b>Before you fine-tune.</b> Try a better prompt with examples, then retrieval for facts. Fine-tune for a consistent style or format, for behaviour prompting can\'t hold, or to make a smaller model do what a bigger one did. Facts that change belong in retrieval, not weights.</p><p><b>Merging several adapters.</b> Adding adapters together sometimes combines skills; methods such as TIES and DARE trim and rescale them first to reduce interference.</p><p><b>About this machine.</b> The training is real gradient descent on a 24 × 24 layer whose needed update has rank 4, with the error measured exactly for random inputs. The 4-bit base uses the NF4 table. Memory figures use the 7B shape with adapters on two projections in every layer and an allowance of 4 GB for activations.</p>',
  code: {
    title: 'A LoRA layer',
    note: 'Adapted from the course\'s LoRA lesson.',
    text: `
import torch, torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, r=8, alpha=16):
        super().__init__()
        self.base = base.requires_grad_(False)                  # frozen W
        self.A = nn.Parameter(torch.randn(r, base.in_features) / base.in_features ** 0.5)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))  # starts at zero
        self.scale = alpha / r

    def forward(self, x):
        return self.base(x) + self.scale * (x @ self.A.T @ self.B.T)

    def merge(self):
        self.base.weight.data += self.scale * self.B @ self.A
`,
  },
};
