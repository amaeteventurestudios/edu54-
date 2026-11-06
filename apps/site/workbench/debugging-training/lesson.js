// Debugging and profiling: one training step as a loop of five stations (load, forward, loss, backward, update) that a batch travels round.
// A profiler stands a bar by each station; a breakpoint stops the batch and shows what it holds; a chart draws the loss.
// Break it: a learning rate of 10 (loss turns NaN), a shape mismatch at the first layer, loading data with no worker processes.
const ST = [
  { n: 'Load batch', ms: w => w ? 20 : 140, c: '#C9774A' },
  { n: 'Forward', ms: () => 30, c: '#1C9A94' },
  { n: 'Loss', ms: () => 3, c: '#E3A72F' },
  { n: 'Backward', ms: () => 55, c: '#3D6BD6' },
  { n: 'Update', ms: () => 8, c: '#8A3F8E' },
];
const RX = 2.55, RZ = 1.45, BARS = 32;
const LRS = [0.001, 0.01, 10];

export default {
  slug: 'debugging-training',
  title: 'Debugging a training loop',
  description: 'Send a batch round the five stations of a training step while a profiler times each one and a breakpoint stops it to look inside. Then make the loss turn NaN, feed the model the wrong shape, and starve the GPU of data.',
  overview: 'Training bugs rarely crash politely. The loss turns into NaN, a shape doesn\'t fit, or the graphics card sits idle waiting for data. Three habits catch nearly all of it: a breakpoint (or a well-placed print) to look at shapes and values mid-step, a profiler to time each part of the step, and a loss chart to see the trend at a glance.',
  keywords: ['debug pytorch training', 'nan loss', 'shape mismatch error', 'profile training loop', 'dataloader num_workers'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.2, 1.1, 1.3], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { run: true, bp: false, prof: true, workers: 4, lr: 1, shape: false, s: 0, step: 0, losses: [], pause: 0, err: null, nan: false };
    const at = s => { const a = Math.PI * 0.75 - (s / 5) * Math.PI * 2; return V(Math.cos(a) * RX, 0, -Math.sin(a) * RZ); };
    /* ---------- the track and its stations ---------- */
    const pts = []; for (let k = 0; k <= 60; k++) pts.push(at(k / 12).add(V(0, 0.08, 0)));
    const track = P.tube(pts, 0.05, '#B9B6AE', { seg: 120 }); S.add(track);
    const stations = ST.map((s, i) => {
      const p = at(i), g = new THREE.Group(); g.position.copy(p); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: s.c });
      const b = P.box(1.05, 0.34, 0.62, s.c, { r: 0.07, material: m }); g.add(b);
      const t = S.text(s.n.toUpperCase(), { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 0.95 }); t.position.set(0, 0.345, -0.08); g.add(t);
      const f = S.text(s.n, { size: 0.1, face: 'front', weight: 750, color: '#FFFFFF', maxW: 0.95 }); f.position.set(0, 0.17, 0.315); g.add(f);
      const bar = P.box(0.16, 1, 0.16, s.c, { r: 0.02 }); bar.position.set(0.68, 0, -0.1); bar.userData.noFit = true; g.add(bar);
      const ms = S.text('', { size: 0.1, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.8 }); ms.userData.noFit = true; g.add(ms);
      return { g, m, bar, ms };
    });
    const flag = new THREE.Group(); S.add(flag);
    flag.add(P.rod(V(0, 0, 0), V(0, 0.75, 0), 0.02, '#2C2D31'));
    const cloth = P.box(0.32, 0.2, 0.02, C.red, { r: 0 }); cloth.position.set(0.17, 0.53, 0); flag.add(cloth);
    flag.position.copy(at(2)).add(V(-0.62, 0, 0.18));
    const batch = P.box(0.32, 0.2, 0.32, '#F2C94C', { r: 0.04 }); batch.userData.noFit = true; batch.material = new THREE.MeshLambertMaterial({ color: '#F2C94C' }); S.add(batch);
    const insp = S.text('', { size: 0.11, weight: 700, color: '#E9ECF8', bg: '#1E2233', font: mono, face: 'cam', top: true, align: 'left', maxW: 2.6 }); insp.userData.noFit = true; S.add(insp);
    /* ---------- the loss chart in the middle ---------- */
    const board = P.box(2.2, 0.85, 0.08, '#FFFFFF', { r: 0.04 }); board.position.set(0, 0.1, -0.15); S.add(board);
    const boardT = S.text('loss', { size: 0.12, face: 'front', weight: 800, color: '#151827', font: mono, maxW: 1 }); boardT.position.set(-0.85, 0.83, -0.105); S.add(boardT);
    const bars = [...Array(BARS)].map((_, k) => { const b = P.box(0.05, 1, 0.03, C.orange, { r: 0, cast: false }); b.position.set(-0.95 + k * 0.061, 0.2, -0.1); b.userData.noFit = true; S.add(b); return b; });
    const gpuT = S.text('', { size: 0.11, face: 'front', weight: 800, color: '#151827', maxW: 2 }); gpuT.position.set(0.35, 0.83, -0.105); S.add(gpuT);
    /* ---------- the loop ---------- */
    const lossNow = () => st.nan ? NaN : st.lr === 2 ? 2.3 + st.step * 41 : 0.25 + 2.05 * Math.exp(-st.step * (st.lr === 1 ? 0.09 : 0.012));
    const total = () => ST.reduce((a, s) => a + s.ms(st.workers === 4), 0);
    const gpuBusy = () => Math.round((total() - ST[0].ms(st.workers === 4)) / total() * 100);
    function update(dt, t) {
      if (st.run && !st.err) {
        if (st.pause > 0) st.pause -= dt;
        else {
          const k = Math.floor(st.s) % 5, segT = Math.max(0.18, ST[k].ms(st.workers === 4) / 90);
          const before = st.s;
          st.s += dt * (S.reduced ? 4 : 1) / segT;
          const k2 = Math.floor(st.s) % 5;
          if (Math.floor(st.s) !== Math.floor(before)) {
            // arrived at station k2
            if (k2 === 1 && st.shape) { st.err = 'shape'; st.s = Math.floor(st.s); }
            if (k2 === 2) { st.step++; if (LRS[st.lr] >= 10 && st.step >= 2) st.nan = true; st.losses.push(lossNow()); if (st.losses.length > BARS) st.losses.shift(); }
            if (k2 === 2 && st.bp) { st.pause = 2.2; st.s = Math.floor(st.s) + 0.0001; }
          }
        }
      }
      const p = at(st.s % 5); batch.position.copy(p).add(V(0, 0.36, 0));
      batch.material.color.set(st.err ? C.red : st.nan ? '#E9A99E' : '#F2C94C');
      stations.forEach((s, i) => {
        const ms = ST[i].ms(st.workers === 4), h = Math.max(0.03, ms / 140 * 1.1);
        s.bar.visible = s.ms.visible = st.prof; s.bar.scale.y = h; s.ms.position.set(0.68, h + 0.18, -0.1); s.ms.userData.set(`${ms} ms`);
        s.m.emissive.set(st.err && i === 1 ? C.red : '#000000').multiplyScalar(0.35);
      });
      flag.visible = st.bp;
      const stopped = st.err || st.pause > 0;
      insp.visible = !!stopped;
      if (stopped) {
        insp.position.copy(at(st.s % 5)).add(V(0, 1.15, 0));
        insp.userData.set(st.err ? 'RuntimeError: mat1 and mat2 shapes\ncannot be multiplied (32x784 and 1024x256)' : `(Pdb) p logits.shape  → (32, 10)\n(Pdb) p loss.item()   → ${st.nan ? 'nan' : lossNow().toFixed(3)}\n(Pdb) p isnan(logits).sum() → ${st.nan ? 320 : 0}`);
      }
      const L = st.losses;
      bars.forEach((b, k) => { const v = L[k]; b.visible = v != null; if (v == null) return; const ok = Number.isFinite(v); b.scale.y = ok ? Math.max(0.02, Math.min(0.62, v / 2.4 * 0.62)) : 0.62; b.material = P.mat(ok ? C.orange : C.red); });
      gpuT.userData.set(`GPU busy ${gpuBusy()}%`);
    }
    const controls = [
      { type: 'toggle', label: 'Run', get: () => st.run, set: v => { st.run = v; } },
      { type: 'toggle', label: 'Breakpoint after the loss', short: 'Breakpoint', get: () => st.bp, set: v => { st.bp = v; st.pause = 0; } },
      { type: 'toggle', label: 'Profiler bars', short: 'Profile', get: () => st.prof, set: v => { st.prof = v; } },
      { type: 'buttons', label: 'Data loader workers', options: ['0', '4'], get: () => st.workers === 4 ? 1 : 0, act: i => { st.workers = i ? 4 : 0; } },
      { type: 'buttons', label: 'Learning rate', options: LRS.map(String), get: () => st.lr, act: i => { st.lr = i; st.nan = false; st.step = 0; st.losses = []; } },
    ];
    const readouts = [
      { label: 'Loss', get: () => ({ v: st.losses.length ? (Number.isFinite(lossNow()) ? lossNow().toFixed(3) : 'NaN') : '…', bad: st.nan, good: !st.nan && st.step > 10 }) },
      { label: 'One step', get: () => ({ v: `${total()} ms`, sub: `GPU busy ${gpuBusy()}%`, bad: gpuBusy() < 60 }) },
    ];
    const labels = [
      { name: 'load', t: 'One training step', d: 'Five stations, one batch at a time', icon: 'link', atV: at(0).add(V(-0.53, 0.34, -0.31)) },
      { name: 'bp', t: 'A breakpoint', d: 'Stop here and look inside', icon: 'eye', atV: at(2).add(V(-0.45, 0.75, 0.18)) },
      { name: 'prof', t: 'The profiler', d: 'How long each station takes', icon: 'scale', atV: at(3).add(V(0.76, 0.6, -0.1)) },
      { name: 'chart', t: 'The loss chart', d: 'The trend at a glance', icon: 'wave', atV: V(1.1, 0.95, -0.15) },
    ];
    const reset = () => { Object.assign(st, { run: true, bp: false, prof: true, workers: 4, lr: 1, shape: false, s: 0, step: 0, losses: [], pause: 0, err: null, nan: false }); };
    const breaks = [
      { label: 'Learning rate 10', hint: 'The loss explodes', on: () => { reset(); st.lr = 2; st.bp = true; }, off: reset },
      { label: 'Shape mismatch', hint: 'Images of 784 into a layer of 1024', on: () => { reset(); st.shape = true; }, off: reset },
      { label: 'No data loader workers', hint: 'num_workers = 0', on: () => { reset(); st.workers = 0; }, off: reset },
    ];
    function status() {
      if (st.err) return { ok: false, msg: `<b>Shape mismatch at the first layer.</b> Each image is 28 × 28 = 784 numbers, but the layer was built for 1024. Print shapes at the start of <code>forward</code> (or stop there with a breakpoint) and the two numbers disagree in plain sight.` };
      if (st.nan) return { ok: false, msg: `<b>The loss is NaN.</b> A learning rate of 10 threw the weights so far that the numbers overflowed, and once one value is NaN every value after it is too. The breakpoint shows 320 NaNs in the outputs. Lower the learning rate, or clip the gradients.` };
      if (st.workers === 0) return { ok: false, msg: `<b>The GPU waits for data.</b> With no worker processes, every batch is loaded on the main process: ${ST[0].ms(false)} ms of each ${total()} ms step, so the card is busy only ${gpuBusy()}% of the time. The profiler bar gives it away. Use 4 workers and pinned memory.` };
      if (st.pause > 0) return { msg: `<b>Stopped at the breakpoint.</b> The batch waits after the loss while you look: the output shape is (32, 10), no NaNs, loss ${lossNow().toFixed(3)}.` };
      if (!st.losses.length) return { msg: `<b>The first batch is on its way.</b> Load, forward, loss, backward, update: one step.` };
      return { ok: st.step > 10 ? true : undefined, msg: `<b>Step ${st.step}:</b> loss ${lossNow().toFixed(3)} and falling. Each step takes ${total()} ms and the GPU is busy ${gpuBusy()}% of it.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'One step, five stations', home: true, say: 'Every training step does the same five things: load a batch, run it forward through the model, measure the loss, send the blame backward, and update the weights.', act: m => m.reset() },
    { t: 'Stop and look', focus: [0.2, 0.5, -1.3], zoom: 1.45, say: 'A breakpoint stops the batch so you can look inside: the shape of the outputs, the loss, and whether any number has turned into NaN.', act: m => m.set({ bp: true }), wait: 6 },
    { t: 'Time every station', home: true, say: 'A profiler times each station. Here backward takes longest, which is normal. Loading should be quick.', act: m => m.set({ bp: false }) },
    { t: 'A starved GPU', focus: [-1.8, 0.5, 1.0], zoom: 1.4, say: 'With no worker processes, loading the data takes longer than the model itself, and the expensive graphics card sits waiting. The tall bar tells you at once.', act: m => m.set({ workers: 0 }), wait: 6 },
    { t: 'When the loss turns NaN', focus: [0, 0.8, -0.2], zoom: 1.4, say: 'Make the learning rate far too big and the loss shoots up, then turns into NaN, not a number. From then on, every number it touches is NaN too.', act: m => m.set({ workers: 4, lr: 2, step: 0, losses: [], nan: false }), wait: 6 },
    { t: 'Three habits', home: true, say: 'Look inside with a breakpoint, time it with a profiler, and watch the loss chart. Together they catch nearly every training bug.', act: m => m.reset() },
  ],
  check: [
    { q: 'The loss suddenly shows NaN. What is the usual first suspect?', options: ['The learning rate is far too high', 'The disk is full', 'The batch is too small'], answer: 0, why: 'Huge steps make the numbers overflow. Lower the learning rate or clip the gradients.' },
    { q: 'The profiler shows loading a batch takes longer than the model. What helps?', options: ['A bigger model', 'More data loader workers, so batches are ready in time', 'A higher learning rate'], answer: 1, why: 'Worker processes load the next batches while the GPU works on this one.' },
    { q: 'What is a breakpoint for?', options: ['Making training faster', 'Stopping the code at one spot to look at shapes and values', 'Saving the model'], answer: 1, why: 'Execution pauses there, and you can print anything: shapes, losses, gradients, NaN counts.' },
  ],
  terms: [
    ['Breakpoint', 'A spot where the program pauses so you can inspect its values (breakpoint() in Python).'],
    ['Profiler', 'A tool that measures how long each part of the code takes.'],
    ['NaN', '"Not a number": what you get from overflows or 0 ÷ 0. It spreads to every sum it touches.'],
    ['Shape', 'The size of each dimension of a tensor, such as (32, 784): 32 images of 784 numbers.'],
    ['Data loader workers', 'Extra processes that prepare the next batches while the GPU trains on this one.'],
  ],
  deeper: '<p><b>A conditional breakpoint</b> only stops when something is wrong: <code>if torch.isnan(loss): breakpoint()</code>. Training runs at full speed until the moment it matters.</p><p><b>Memory, too.</b> <code>torch.cuda.memory_allocated()</code> shows how much of the card is in use. Out of memory? Try a smaller batch first, then mixed precision, then gradient checkpointing.</p><p><b>Reading the loss chart.</b> Flat: learning rate too low. Wild swings: too high. Training loss falling while validation rises: overfitting.</p>',
  code: {
    title: 'Look, time and catch',
    note: 'Adapted from the course\'s debugging lesson.',
    text: `
import time, torch

def debug_print(name, t):
    print(f"{name}: shape={tuple(t.shape)} dtype={t.dtype} "
          f"nan={torch.isnan(t).sum().item()}")

loader = torch.utils.data.DataLoader(data, batch_size=32,
                                     num_workers=4, pin_memory=True)
for step, (x, y) in enumerate(loader):
    t0 = time.perf_counter()
    logits = model(x.cuda())
    loss = loss_fn(logits, y.cuda())
    if torch.isnan(loss):
        debug_print("logits", logits)
        breakpoint()                 # stop only when something is wrong
    loss.backward()
    optimizer.step(); optimizer.zero_grad()
    print(step, loss.item(), f"{(time.perf_counter() - t0) * 1000:.0f} ms")
`,
  },
};
