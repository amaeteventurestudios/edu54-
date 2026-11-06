// GPUs: one matrix multiply, filled cell by cell by a CPU with 8 strong cores, or all at once by a GPU with hundreds of small ones.
// The card's own memory is a tank: does the model fit? Cloud cards cost money by the hour (in the learner's currency).
// Break it: a model too big for the card, data left on the CPU, a job too tiny to be worth the trip.
const N = 12, CELL = 0.24;               // the answer grid on the board
const CARDS = [
  { n: 'Free notebook\ncard, 16 GB', s: 'Free 16 GB', gb: 16, usd: 0 },
  { n: 'Cloud card\n24 GB', s: 'Cloud 24 GB', gb: 24, usd: 0.6 },
  { n: 'Cloud card\n80 GB', s: 'Cloud 80 GB', gb: 80, usd: 2.5 },
];
const PREC = [{ n: 'fp32', b: 4 }, { n: 'fp16', b: 2 }, { n: 'int8', b: 1 }];
// rough timings for an n×n multiply: a CPU near 100 GFLOP/s; a GPU near 8 TFLOP/s plus copying both inputs and the answer over
const cpuT = n => 2 * n ** 3 / 1e11;
const gpuT = n => 2 * n ** 3 / 8e12 + 3 * n * n * 4 / 12e9 + 2e-5;
const fmtT = s => s >= 1 ? `${s.toFixed(2)} s` : s >= 1e-3 ? `${(s * 1e3).toFixed(s < 0.01 ? 1 : 0)} ms` : `${(s * 1e6).toFixed(0)} µs`;

export default {
  slug: 'gpu-basics',
  title: 'GPUs: why AI needs graphics cards',
  description: 'Fill the same grid of sums with a CPU\'s eight strong cores and a graphics card\'s hundreds of small ones. Then check whether a model fits in the card\'s memory, and what a bigger card costs by the hour.',
  overview: 'Almost all the work in AI is multiplying big grids of numbers. A CPU has a few strong cores that work through the cells a handful at a time; a graphics card (GPU) has thousands of small cores that do them all at once. The card also has its own memory, and the model has to fit in it: about two bytes per parameter at half precision. No card? A free notebook or a rented cloud card by the hour works too.',
  keywords: ['why gpu for ai', 'cpu vs gpu', 'gpu memory for llm', 'vram calculator', 'cloud gpu cost'],
  orient: 'any',
  money: true,
  view: { target: [0, 0.5, -0.1], dir: [0.25, 1.05, 1.3], half: 3.4, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { dev: 'gpu', n: 4096, card: 0, prec: 1, model: 7, onCpuData: false, run: null, done: 0, err: false };
    /* ---------- the board: the answer grid ---------- */
    const board = P.box(N * CELL + 0.5, 0.16, N * CELL + 0.5, '#F1EEE6', { r: 0.12 }); S.add(board);
    const grid = P.grid(N, N, CELL, { h: 0.04, color: '#D8D4C8', gap: 0.04 }); grid.mesh.position.y = 0.16; S.add(grid.mesh);
    const boardT = S.text('', { size: 0.15, face: 'front', weight: 800, color: '#151827', maxW: 3, maxH: 0.14 }); boardT.position.set(0, 0.08, (N * CELL + 0.5) / 2 + 0.01); S.add(boardT);
    /* ---------- the two chips ---------- */
    function chip(x, name, sub) {
      const g = new THREE.Group(); g.position.set(x, 0, 0); S.add(g);
      const pkg = P.box(1.9, 0.2, 1.9, '#2E3440', { r: 0.1 }); g.add(pkg);
      const f = S.text(name, { size: 0.15, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.8, maxH: 0.17 }); f.position.set(0, 0.1, 0.955); g.add(f);
      const t = S.text(sub, { size: 0.24, weight: 800, color: '#FFFFFF', maxW: 1.7, maxH: 0.26 }); t.position.set(0, 0.205, 0.74); g.add(t);
      return g;
    }
    const cpu = chip(-3.15, 'CPU', 'CPU'), gpu = chip(3.15, 'GPU', 'GPU');
    const cpuCores = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.MeshLambertMaterial({ color: '#C9A227' });
      const c = P.box(0.36, 0.14, 0.5, '#C9A227', { r: 0.05, material: m }); c.position.set(-0.63 + (i % 4) * 0.42, 0.2, -0.55 + Math.floor(i / 4) * 0.62); cpu.add(c); cpuCores.push(m);
    }
    const G = 16, gcores = P.grid(G, G, 0.085, { h: 0.06, color: '#7FD1CB', gap: 0.02 }); gcores.mesh.position.set(0, 0.2, -0.22); gpu.add(gcores.mesh);
    // buses from each chip to the board, with data running along them
    const busC = new THREE.LineCurve3(V(-2.2, 0.3, 0), V(-1.75, 0.3, 0)), busG = new THREE.LineCurve3(V(2.2, 0.3, 0), V(1.75, 0.3, 0));
    for (const [a, b] of [[V(-2.2, 0.12, 0), V(-1.7, 0.12, 0)], [V(2.2, 0.12, 0), V(1.7, 0.12, 0)]]) { const r = P.box(0.5, 0.06, 0.5, '#8E91A3', { r: 0.03 }); r.position.set((a.x + b.x) / 2, 0, 0); S.add(r); }
    const flowC = P.flow(busC, 4, C.gold, { r: 0.07, speed: 1.6 }), flowG = P.flow(busG, 6, '#4CC6C0', { r: 0.07, speed: 2.2 });
    S.add(flowC.mesh, flowG.mesh);
    /* ---------- the card's memory: a glass tank beside the GPU ---------- */
    const TX = 3.15, TZ = -1.75, TH = 1.6;
    const tank = P.cyl(0.42, TH, '#BFE6F2', { m: { opacity: 0.25 }, cast: false }); tank.material.depthWrite = false; tank.position.set(TX, 0, TZ); S.add(tank);
    const fillM = new THREE.MeshLambertMaterial({ color: C.green });
    const fill = P.cyl(0.36, 1, C.green, { material: fillM }); fill.position.set(TX, 0.02, TZ); S.add(fill);
    const spill = P.ball(0.2, C.red); spill.userData.noFit = true; S.add(spill);
    const rim = P.cyl(0.46, 0.05, '#2E3440'); rim.position.set(TX, TH, TZ); S.add(rim);
    const tankT = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); tankT.position.set(TX, TH + 0.35, TZ); tankT.userData.noFit = true; S.add(tankT);
    const cardT = S.text('', { size: 0.15, weight: 750, maxW: 0.95 }); cardT.position.set(TX - 0.98, 0.01, TZ); S.add(cardT);
    /* ---------- the sums ---------- */
    const need = () => st.model * PREC[st.prec].b + 1;      // parameters × bytes, plus about a gigabyte for the working numbers
    const fits = () => need() <= CARDS[st.card].gb;
    function run(dev) {
      if (dev) st.dev = dev;
      st.err = st.dev === 'gpu' && st.onCpuData;
      st.run = { t: 0, copy: st.dev === 'gpu' ? 0.45 : 0 }; st.done = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) grid.set(i, j, { h: 0.04, color: '#D8D4C8' });
      grid.commit();
    }
    const cellCol = () => st.dev === 'gpu' ? '#4CC6C0' : '#E3B23C';
    function update(dt, t) {
      const r = st.run;
      flowC.on = !!r && st.dev === 'cpu' && st.done < N * N; flowG.on = !!r && st.dev === 'gpu' && !st.err && st.done < N * N;
      flowC.tick(dt); flowG.tick(dt);
      if (r && !st.err && st.done < N * N) {
        r.t += dt * (S.reduced ? 4 : 1);
        // the CPU: eight cells at a time, one batch after another; the GPU: a short copy, then every cell at once
        const want = st.dev === 'cpu' ? Math.min(N * N, Math.floor(r.t / 0.11) * 8) : r.t < r.copy ? 0 : Math.min(N * N, Math.floor((r.t - r.copy) / 0.05) * 72);
        while (st.done < want) { const k = st.done++; grid.set(k % N, Math.floor(k / N), { h: 0.12, color: cellCol() }); }
        grid.commit();
      }
      const busy = r && !st.err && st.done < N * N;
      cpuCores.forEach((m, i) => m.emissive.set(busy && st.dev === 'cpu' && Math.sin(t * 20 + i) > 0 ? '#FFB000' : '#000000').multiplyScalar(0.5));
      gcores.mesh.material.emissive.set(busy && st.dev === 'gpu' && r.t > r.copy ? '#2A9D97' : '#000000');
      gcores.mesh.material.color.set(st.err ? '#E9A99E' : '#FFFFFF');
      // the memory tank
      const u = need() / CARDS[st.card].gb;
      fill.scale.y = Math.max(0.02, Math.min(1, u)) * (TH - 0.06);
      fillM.color.set(u > 1 ? C.red : u > 0.85 ? C.orange : C.green);
      spill.visible = u > 1; spill.position.set(TX + 0.3, TH + 0.05 + Math.abs(Math.sin(t * 3)) * 0.12, TZ + 0.2);
      tankT.userData.set(`${need().toFixed(0)} of ${CARDS[st.card].gb} GB`);
      cardT.userData.set(CARDS[st.card].n);
      boardT.userData.set(`${st.n} × ${st.n} MULTIPLY`);
    }
    run('gpu');
    const controls = [
      { type: 'buttons', label: 'Run the multiply on', options: ['CPU', 'GPU'], get: () => st.dev === 'cpu' ? 0 : 1, act: i => run(i ? 'gpu' : 'cpu') },
      { type: 'slider', label: 'Grid size (n × n)', min: 8, max: 8192, log: true, get: () => st.n, set: v => { st.n = Math.round(v); }, fmt: v => `${Math.round(v)}`, hint: 'Small jobs and big jobs behave very differently' },
      { type: 'slider', label: 'Model size (billions of parameters)', min: 0.5, max: 70, log: true, get: () => st.model, set: v => { st.model = v; }, fmt: v => v < 10 ? v.toFixed(1) : v.toFixed(0) },
      { type: 'buttons', label: 'Precision', options: PREC.map(p => p.n), get: () => st.prec, act: i => { st.prec = i; } },
      { type: 'buttons', label: 'Card', options: CARDS.map(c => c.s), get: () => st.card, act: i => { st.card = i; } },
    ];
    const speed = () => cpuT(st.n) / gpuT(st.n);
    const rent = () => CARDS[st.card].usd ? `${S.money.of(CARDS[st.card].usd)} an hour` : 'free, limited hours';
    const readouts = [
      { label: 'Time for this multiply', get: () => ({ v: st.err ? 'error' : fmtT(st.dev === 'cpu' ? cpuT(st.n) : gpuT(st.n)), sub: st.dev === 'cpu' ? 'on the CPU' : 'on the GPU', bad: st.err }) },
      { label: 'GPU speed-up', get: () => { const s = speed(); return { v: s >= 1 ? `${s.toFixed(0)}×` : `${s.toFixed(2)}× (slower)`, good: s > 5, bad: s < 1 }; } },
      { label: 'Card memory', get: () => ({ v: `${need().toFixed(0)} / ${CARDS[st.card].gb} GB`, bar: Math.min(1, need() / CARDS[st.card].gb), bad: !fits(), sub: rent() }), bar: true },
    ];
    const labels = [
      { name: 'cpu', t: 'CPU', d: 'A few strong cores, a handful of cells at a time', icon: 'box', atV: V(-3.15, 0.34, -0.95) },
      { name: 'gpu', t: 'GPU', d: 'Hundreds of small cores, every cell at once', icon: 'spark', atV: V(4.1, 0.2, 0.2) },
      { name: 'grid', t: 'The answer grid', d: 'Each cell is one row times one column', icon: 'target', atV: V(0, 0.16, 1.69) },
      { name: 'memory', t: 'The card\'s memory', d: 'The model must fit: bytes per parameter', icon: 'scale', atV: V(TX + 0.46, TH, TZ) },
    ];
    const reset = () => { Object.assign(st, { n: 4096, card: 0, prec: 1, model: 7, onCpuData: false }); run('gpu'); };
    const breaks = [
      { label: 'A model too big for the card', hint: '13 billion parameters at fp16 on 16 GB', on: () => { reset(); st.model = 13; }, off: reset },
      { label: 'Data left on the CPU', hint: 'Model on the GPU, inputs not moved', on: () => { reset(); st.onCpuData = true; run('gpu'); }, off: reset },
      { label: 'A tiny job on the GPU', hint: 'An 8 × 8 multiply', on: () => { reset(); st.n = 8; run('gpu'); }, off: reset },
    ];
    function status() {
      if (st.err) return { ok: false, msg: `<b>Expected all tensors on the same device.</b> The model's numbers are on the graphics card but the inputs are still in the computer's main memory, and a core can only reach its own card's memory. Move them first with <code>.to("cuda")</code>.` };
      if (!fits()) return { ok: false, msg: `<b>Out of memory.</b> ${st.model.toFixed(st.model < 10 ? 1 : 0)} billion parameters at ${PREC[st.prec].n} need about ${need().toFixed(0)} GB, and this card has ${CARDS[st.card].gb}. Pick a smaller precision, a smaller model, or rent a bigger card (${CARDS.find(c => c.gb >= need()) ? `${CARDS.find(c => c.gb >= need()).s}: ${CARDS.find(c => c.gb >= need()).usd ? S.money.of(CARDS.find(c => c.gb >= need()).usd) + ' an hour' : 'free'}` : 'or split it across several'}).` };
      if (st.dev === 'gpu' && speed() < 1) return { ok: false, msg: `<b>Slower on the GPU.</b> An ${st.n} × ${st.n} multiply is only ${2 * st.n ** 3} sums, done in a blink. Copying the numbers to the card and back takes longer than the sums themselves (${fmtT(gpuT(st.n))} on the GPU against ${fmtT(cpuT(st.n))} on the CPU). GPUs pay off on big grids.` };
      const done = st.done >= N * N;
      if (st.dev === 'cpu') return { msg: `<b>CPU${done ? ': done' : ': working'}.</b> Eight cores, eight cells at a time. A real ${st.n} × ${st.n} multiply takes about ${fmtT(cpuT(st.n))} this way.` };
      return { ok: done ? true : undefined, msg: `<b>GPU${done ? ': done' : ''}.</b> Copy the numbers over, then every cell at once: about ${fmtT(gpuT(st.n))}, ${speed().toFixed(0)} times faster than the CPU. The model needs ${need().toFixed(0)} of ${CARDS[st.card].gb} GB.` };
    }
    return {
      update, controls, readouts, labels, breaks, status, reset,
      currency: () => { },
      run, set: p => Object.assign(st, p),
    };
  },

  story: [
    { t: 'One big sum', home: true, say: 'Training and running a model is mostly one kind of sum, repeated: multiply two big grids of numbers. Here is the answer grid, waiting to be filled.', act: m => { m.reset(); m.set({ n: 4096 }); } },
    { t: 'A few strong cores', focus: 'cpu', zoom: 1.4, say: 'A CPU has a few strong cores. Each one works out a handful of cells, then the next handful, one batch after another.', act: m => m.run('cpu'), wait: 4 },
    { t: 'Hundreds of small cores', focus: 'gpu', zoom: 1.4, say: 'A graphics card has hundreds or thousands of small cores. The numbers are copied over, then every cell gets its own worker, all at the same time.', act: m => m.run('gpu') },
    { t: 'Big jobs only', home: true, say: 'On a big grid the card wins by fifty times or more. On a tiny one, copying the numbers over takes longer than the sum itself, and the CPU wins.', act: m => { m.set({ n: 8 }); m.run('gpu'); }, wait: 5 },
    { t: 'Does it fit?', focus: [2.9, 0.7, -1.2], zoom: 1.45, say: 'The card has its own memory, and the whole model has to fit. At half precision each parameter takes two bytes, so seven billion parameters need about fourteen gigabytes, plus a little room to work.', act: m => { m.set({ n: 4096, model: 7, prec: 1, card: 0 }); m.run('gpu'); } },
    { t: 'Rent a bigger card', home: true, say: 'A bigger model overflows the tank. Shrink the numbers, or rent a bigger card in the cloud by the hour. The price shows in your own currency.', act: m => { m.set({ model: 13 }); }, wait: 5 },
  ],
  check: [
    { q: 'Why is a graphics card fast at AI work?', options: ['Its cores are each faster than a CPU core', 'It has thousands of small cores that work on many cells at once', 'It has a bigger hard drive'], answer: 1, why: 'Matrix multiplication splits into many independent sums, and a GPU does them all at the same time.' },
    { q: 'About how much memory does a 7 billion parameter model need at half precision (fp16)?', options: ['About 14 GB, plus some room to work', 'About 7 MB', 'About 700 GB'], answer: 0, why: 'Two bytes per parameter: 7 billion × 2 bytes is 14 GB, and the working numbers need a bit more.' },
    { q: 'An 8 × 8 multiply runs slower on the GPU than the CPU. Why?', options: ['The GPU is broken', 'Copying the numbers to the card takes longer than the tiny sum', 'GPUs cannot multiply small numbers'], answer: 1, why: 'Every job pays for the trip to the card and back. Only big jobs make the trip worth it.' },
  ],
  terms: [
    ['CPU', 'The computer\'s main processor: a few strong cores that do one thing after another very quickly.'],
    ['GPU', 'A graphics card: thousands of small cores that do many simple sums at the same time.'],
    ['VRAM', 'The card\'s own memory. The model and its working numbers must fit in it.'],
    ['fp16 (half precision)', 'Storing each number in 16 bits, two bytes: half the memory of fp32, with little loss.'],
    ['CUDA', 'The software layer that lets Python libraries run sums on NVIDIA-style graphics cards.'],
  ],
  deeper: '<p><b>Why matrix multiplication splits so well.</b> Each cell of the answer is one row of the first grid times one column of the second. No cell needs another cell\'s answer, so every cell can be worked out at the same moment.</p><p><b>Memory, not speed, is usually the wall.</b> Training needs far more memory than running: the gradients and the optimiser\'s notes take two or three times the model again. That is why people train on rented cards and run on smaller ones.</p><p><b>Shrinking the numbers</b> (int8, int4) lets a big model fit a small card. That is the quantization lesson.</p>',
  code: {
    title: 'CPU against GPU in PyTorch',
    note: 'Adapted from the course\'s benchmark. <code>synchronize()</code> waits for the card to finish before the clock stops.',
    text: `
import time, torch

size = 4096
a = torch.randn(size, size)
b = torch.randn(size, size)

start = time.time()
c = a @ b                                   # on the CPU
cpu = time.time() - start
print(f"CPU: {cpu:.3f}s")

if torch.cuda.is_available():
    a, b = a.to("cuda"), b.to("cuda")       # move the data to the card first
    torch.cuda.synchronize()
    start = time.time()
    c = a @ b
    torch.cuda.synchronize()
    gpu = time.time() - start
    print(f"GPU: {gpu:.3f}s, {cpu / gpu:.0f}x faster")

    gb = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"{gb:.0f} GB: about {(gb - 1) / 2:.0f} billion parameters at fp16")
`,
  },
};
