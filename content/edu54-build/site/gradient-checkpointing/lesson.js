// Gradient checkpointing: a university lab in Kigali fine-tunes a 7B model (32 layers, hidden 4,096, 32 heads) on long documents, one sequence per GPU, 8 GPUs.
// Activations stored per layer (16-bit, Korthikanti et al. 2022): s·b·h·(34 + 5·a·s/h) bytes; the 5·a·s/h part is the attention scores and softmax.
// FlashAttention never stores that part. Selective recompute drops it and recomputes it. Every layer: keep only each layer's input (2·s·b·h bytes) and, during backward,
// one layer's full activations at a time. One big segment: keep only the model's input and recompute everything at once, so all layers' activations come back together.
// Model states: 16 bytes per parameter (weights, gradients, Adam) sharded over 8 GPUs = 14 GB. FLOPs per layer forward: 24·b·s·h² + 4·b·s²·h; backward = 2× forward.
const L = 32, H = 4096, A = 32, SS = [2048, 4096, 8192], STATES = 7e9 * 16 / 8 / 1e9, GPU = 80;
const NAMES = ['None', 'Selective', 'Every layer', 'One big segment'];
function run(st) {
  const s = SS[st.s], sbh = s * H, attn = st.flash ? 0 : 5 * A * s / H;
  const full = sbh * (34 + attn) / 1e9, sel = sbh * 34 / 1e9, inp = 2 * sbh / 1e9;
  const fwd = 24 * s * H * H + 4 * s * s * H, attF = 4 * s * s * H;
  let kept, peak, extra;
  if (st.m === 0) { kept = full; peak = L * full; extra = 0; }
  else if (st.m === 1) { kept = sel; peak = L * sel + (full - sel); extra = st.flash ? 0 : attF / (3 * fwd); }
  else if (st.m === 2) { kept = inp; peak = L * inp + full; extra = 1 / 3; }
  else { kept = 0; peak = inp + L * full; extra = 1 / 3; }
  const mem = STATES + peak;
  return { s, full, sel, inp, kept, peak, mem, fits: mem <= GPU, extra, step: 1 + extra };
}

export default {
  slug: 'gradient-checkpointing',
  title: 'Gradient checkpointing: recompute instead of store',
  description: 'A university lab in Kigali fine-tunes a 7-billion-parameter model on long documents. Keep every layer\'s values, or save memory and recompute them on the way back.',
  overview: 'The backward pass needs the values each layer computed on the way forward: the inputs to every matrix multiply, the outputs of the norms and activation functions, and, in attention, the score matrix and its softmax. For one layer of a transformer that is about s·h·(34 + 5·a·s/h) bytes in 16-bit numbers, where s is the sequence length, h the hidden size and a the number of heads. The second term holds the attention scores and grows with the square of the sequence, so at a few thousand tokens it dominates. Gradient checkpointing keeps only some values and recomputes the rest during the backward pass. Keeping just each layer\'s input and recomputing the whole layer saves the most memory but runs the forward pass twice: about a third more compute. Selective recomputation (Korthikanti and colleagues at NVIDIA, 2022) keeps the cheap, linear-in-length values and recomputes only the attention scores, which are big to store but quick to compute: most of the saving for a few percent of extra work. FlashAttention never stores the score matrix in the first place, which is why it combines so well with long sequences. Checkpointing too little saves nothing: with one checkpoint at the very start, the backward pass has to rebuild every layer at once.',
  keywords: ['gradient checkpointing', 'activation recomputation', 'selective recomputation', 'activation memory', 'FlashAttention', 'training memory', 'GPU memory'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { m: 1, s: 1, flash: false }, st = { ...D0 };
    const ink = '#151827', AUB = '#6B5E86', TEAL = '#1F9E89', CORAL = '#E07A5F', GOLD = '#C9A227';
    const hd = P.box(3.9, 0.04, 0.3, '#FFFFFF', { r: 0.03 }); hd.position.set(-0.85, 0.12, -1.17); floor.add(hd);

    /* 32 layers: what each keeps for the backward pass */
    const X0 = -2.75, DX = 0.1, LZ = -0.2, KG = 0.05;
    const tray = P.box(L * DX + 0.1, 0.02, 0.5, '#F6F1E6', { r: 0.02 }); tray.position.set(X0 + L * DX / 2, 0.12, LZ); floor.add(tray);
    const cols = Array.from({ length: L }, (_, i) => {
      const mk = c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(DX * 0.7, 1, 0.3, '#fff', { r: 0.01, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; };
      return { keep: mk(CORAL), redo: mk('#F2C4B6'), x: X0 + (i + 0.5) * DX };
    });
    const keepBox = P.box(L * DX, 0.9, 0.4, '#000'); keepBox.material = new THREE.MeshBasicMaterial({ visible: false }); keepBox.position.set(X0 + L * DX / 2, 0.12, LZ); floor.add(keepBox);
    const cur = P.box(0.02, 0.05, 0.5, ink, { r: 0 }); cur.userData.noFit = true; floor.add(cur);



    /* one 80 GB GPU */
    const GX = 0.95, GZ = -0.1, GH = 1.0;
    const gcard = P.box(0.85, 0.03, 1.9, '#FFFFFF', { r: 0.03 }); gcard.position.set(GX, 0.12, GZ + 0.25); floor.add(gcard);

    const cap = P.box(0.55, 0.006, 0.02, ink, { r: 0 }); cap.position.set(GX, 0.12 + GH + 0.03, GZ); floor.add(cap);
    const segs = ['#9A968C', CORAL].map(c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.38, 1, 0.38, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; });

    const keepG = P.box(0.55, GH + 0.1, 0.38, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(GX, 0.12, GZ); floor.add(keepG);
    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); floor.add(rp);

    const tm = new THREE.MeshLambertMaterial({ color: TEAL }), tg = P.box(0.4, 1, 0.4, '#fff', { r: 0.03, material: tm }); tg.position.set(PX, 0.15, -0.5); tg.userData.noFit = true; floor.add(tg);



    let R = null, ph = 0;
    const GB = v => v >= 10 ? `${v.toFixed(0)} GB` : v >= 1 ? `${v.toFixed(1)} GB` : `${(v * 1000).toFixed(0)} MB`, K = s => `${s / 1024}K`, hscale = g => Math.min(0.85, 0.003 + 0.07 * g);
    function anim() {
      /* ph 0..1 forward (left to right), 1..2 backward (right to left) */
      const fwd = ph <= 1, pos = fwd ? ph * L : (2 - ph) * L, at = Math.min(L - 1, Math.floor(pos));
      cols.forEach((c, i) => {
        const done = fwd ? i < pos : i < pos;
        const kh = done ? hscale(R.kept) : 0.002;
        c.keep.b.scale.y = kh; c.keep.b.position.set(c.x, 0.13, LZ); c.keep.b.visible = done;
        c.keep.mm.color.set(st.m === 0 ? CORAL : st.m === 1 ? GOLD : TEAL);
        let redo = 0;
        if (!fwd && ph < 2) { if (st.m === 3 && i < pos) redo = R.full; else if (st.m === 2 && i === at) redo = R.full; else if (st.m === 1 && i === at && R.full > R.sel) redo = R.full - R.sel; }
        if (fwd && i === at && ph < 1 && st.m !== 0) redo = st.m === 1 ? R.full - R.sel : R.full;
        c.redo.b.visible = redo > 0; c.redo.b.scale.y = hscale(redo); c.redo.b.position.set(c.x, 0.13 + (done ? kh : 0), LZ);
      });
      cur.position.set(X0 + Math.min(L, pos) * DX, 0.13, LZ);

    }
    function draw() {
      R = run(st); ph = 0;
      let y = 0.135; [STATES, R.peak].forEach((v, i) => { const h = Math.max(0.004, GH * Math.min(v, 140) / GPU); segs[i].b.scale.y = h; segs[i].b.position.set(GX, y, GZ); y += h; });
      segs[1].mm.color.set(R.fits ? CORAL : '#C62828');
      tg.scale.y = 0.05 + 0.4 * R.step; tm.color.set(R.extra > 0.2 ? '#C9A227' : TEAL);
      anim();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { if (ph >= 2) return; ph = Math.min(2, ph + dt / 3); anim(); };
    const controls = [
      { type: 'buttons', label: 'Checkpointing', options: NAMES, get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Tokens per sequence', options: SS.map(K), get: () => st.s, act: i => set({ s: i }) },
      { type: 'toggle', label: 'FlashAttention', get: () => st.flash, set: v => set({ flash: !!v }), quick: false },
      { type: 'button', label: 'Run the step again', act: () => { ph = 0; anim(); } },
    ];
    const readouts = [
      { label: 'Memory on one GPU', get: () => ({ v: GB(R.mem), sub: R.fits ? `fits in ${GPU} GB` : `over ${GPU} GB`, good: R.fits, bad: !R.fits }) },
      { label: 'Time per step', get: () => ({ v: `${R.step.toFixed(2)}×`, sub: 'against keeping everything', bad: R.extra > 0.2 }) },
      { label: 'Kept per layer', get: () => ({ v: GB(R.kept), sub: `full: ${GB(R.full)}` }) },
    ];
    const labels = [
      { name: 'layers', t: 'What each layer keeps', d: 'Values saved for the backward pass', icon: 'box', atV: V(-2.82, 0.2, -0.2) },
      { name: 'time', t: 'Time per step', d: 'Recomputing costs extra forward work', icon: 'target', atV: V(2.45, 0.2, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No checkpointing', hint: 'keep every value', on: () => set({ ...D0, m: 0 }), off: reset },
      { label: 'One big segment', hint: 'one checkpoint at the start', on: () => set({ ...D0, m: 3 }), off: reset },
      { label: 'Recompute everything', hint: 'every layer, when selective fits', on: () => set({ ...D0, m: 2 }), off: reset },
    ];
    function status() {
      const sel = run({ ...st, m: 1 }), none = run({ ...st, m: 0 }), pc = v => `${Math.round(v * 100)}%`;
      if (st.m === 0) return { ok: R.fits ? undefined : false, msg: `<b>${R.fits ? `Keeping everything: ${GB(R.mem)}, fits` : `Out of memory: ${GB(R.mem)} on an ${GPU} GB GPU`}.</b> Each layer keeps ${GB(R.full)} for the backward pass${st.flash ? '' : `, most of it the attention scores, which grow with the square of the length (${K(R.s)} tokens)`}. ${R.fits ? 'At this length nothing needs recomputing.' : `Selective recomputation brings it to ${GB(sel.mem)} for ${pc(sel.extra)} more compute.`}` };
      if (st.m === 3) return { ok: false, msg: `<b>One big segment: ${GB(R.mem)}${R.fits ? '' : ', still out of memory'}, and ${pc(R.extra)} more compute.</b> With one checkpoint at the start, the backward pass has to rebuild every layer before it can begin, so all ${L} layers' values (${GB(L * R.full)}) are back in memory at once. You pay for recomputing and save almost nothing. Checkpoints must split the model into pieces.` };
      if (st.m === 2) return { ok: sel.fits ? false : R.fits, msg: `<b>Recompute everything: ${GB(R.mem)}, but each step takes ${R.step.toFixed(2)}× as long.</b> Keeping only each layer's input (${GB(R.inp)}) saves the most memory, but the backward pass runs the whole forward again. ${sel.fits ? `Selective recomputation already fits (${GB(sel.mem)}) for ${pc(sel.extra)} more compute.` : 'Here even selective recomputation does not fit, so this is the price of fitting.'}` };
      if (st.flash) return { msg: `<b>FlashAttention on: the attention scores are never stored, so selective recomputation has nothing extra to drop (${GB(R.mem)}, ${pc(R.extra)} extra).</b> Flash computes attention in tiles and recomputes them in its own backward pass: selective recomputation built into the kernel.` };
      return { ok: R.fits, msg: `<b>Selective: ${GB(R.mem)} instead of ${GB(none.mem)}, for ${pc(R.extra)} more compute.</b> Each layer keeps its linear-in-length values (${GB(R.sel)}) and drops the attention scores (${GB(R.full - R.sel)}), which are big to store but quick to recompute.${R.fits ? '' : ' Still too big at this length: recompute every layer, or turn on FlashAttention.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Values kept for backward', home: true, say: 'A university lab in Kigali fine-tunes a seven-billion-parameter model on long documents. Training keeps every value each layer computes, because the backward pass needs them.', act: m => m.set({ m: 0, s: 0, flash: false }) },
    { t: 'Longer documents', home: true, say: 'Double the length, and the attention scores in each layer grow four times. Now the kept values no longer fit on the GPU.', act: m => m.set({ s: 1 }) },
    { t: 'Recompute every layer', home: true, say: 'Checkpointing keeps only each layer\'s input and rebuilds the rest during the backward pass, one layer at a time. Memory falls, but the forward pass runs twice.', act: m => m.set({ m: 2 }) },
    { t: 'Recompute only attention', home: true, say: 'Selective recomputation keeps the cheap values and drops only the attention scores, which are big to store but quick to compute. Most of the saving, for a few percent more work.', act: m => m.set({ m: 1 }) },
    { t: 'One checkpoint is not enough', home: true, say: 'With just one checkpoint at the start, the backward pass must rebuild every layer at once, and the memory comes straight back.', act: m => m.set({ m: 3 }) },
    { t: 'FlashAttention', home: true, say: 'FlashAttention never stores the attention scores at all, recomputing them in its own backward pass. That is why long sequences and FlashAttention go together.', act: m => m.set({ m: 1, flash: true }) },
  ],
  check: [
    { q: 'Why does activation memory explode with longer sequences?', options: ['The attention scores in each layer grow with the square of the length', 'The weights grow', 'The optimizer stores more'], answer: 0, why: 'The 5·a·s/h term dominates at a few thousand tokens.', hint: 'Switch 2K, 4K and 8K with None.' },
    { q: 'Why is selective recomputation cheaper than recomputing every layer?', options: ['It recomputes only the attention scores, which are quick to compute but big to store', 'It skips the backward pass', 'It stores everything on the CPU'], answer: 0, why: 'A few percent of extra compute instead of about a third.', hint: 'Compare Time per step.' },
    { q: 'What goes wrong with one checkpoint at the start of the model?', options: ['The backward pass must rebuild every layer at once, so the memory comes back', 'Training diverges', 'Gradients become zero'], answer: 0, why: 'Checkpoints only help when they split the model into small pieces.', hint: 'Try One big segment.' },
  ],
  terms: [
    ['Activations', 'Values a layer computes in the forward pass that the backward pass needs.'],
    ['Gradient checkpointing', 'Keeping only some activations and recomputing the rest during backward.'],
    ['Selective recomputation', 'Recomputing only the attention scores, which are large to store but cheap to compute.'],
    ['Segment', 'The layers between two checkpoints; backward rebuilds one segment at a time.'],
    ['FlashAttention', 'An attention kernel that never stores the full score matrix, recomputing tiles in backward.'],
    ['Offloading', 'Moving activations to CPU memory between forward and backward instead of recomputing.'],
  ],
  deeper: '<p><b>The square-root rule.</b> When every layer\'s input is as big as its activations, checkpointing every √L layers balances what is stored against what is rebuilt (Chen and colleagues, 2016). In a transformer a layer\'s input is far smaller than its activations, so a checkpoint at every layer usually wins.</p><p><b>Offloading.</b> Activations can instead be copied to CPU memory and back; worth it when the link between CPU and GPU has spare bandwidth. Real runs mix the two.</p><p><b>With other parallelism.</b> Tensor parallelism must gather a checkpointed input again before recomputing; FP8 training must make the recompute use the same scaling factors as the original forward.</p><p><b>About this machine.</b> Activation sizes use the formula in the file header for a 7B shape with one sequence per GPU; model states are 16 bytes per parameter sharded over 8 GPUs.</p>',
  code: {
    title: 'Checkpoint each layer with PyTorch',
    note: 'Adapted from the course\'s gradient checkpointing lesson.',
    text: `
import torch
from torch.utils.checkpoint import checkpoint

class Model(torch.nn.Module):
    def __init__(self, layers):
        super().__init__()
        self.layers = torch.nn.ModuleList(layers)

    def forward(self, x):
        for layer in self.layers:
            # keep only x; rebuild the layer's activations in backward
            x = checkpoint(layer, x, use_reentrant=False)
        return x
`,
  },
};
