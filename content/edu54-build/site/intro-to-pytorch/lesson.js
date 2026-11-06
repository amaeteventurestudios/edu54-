// Intro to PyTorch: a training step for boda-boda trip times in Kampala (minutes from distance), laid out on a GPU tray.
// Tensors are blocks sitting on a device; each operation drops a node into the autograd graph as the code runs; backward() sends gradients back and fills each weight's .grad bar.
// The wall shows the trips and the fitted line; the column on the right is GPU memory.
// Break it: data left on the CPU (the step crashes), requires_grad switched off on w (w.grad is None, it never learns), evaluating without torch.no_grad() (graphs pile up and memory climbs).
const TRIPS = [[1.2, 9], [2.0, 10.5], [2.8, 13.5], [3.5, 15], [4.4, 18.5], [5.1, 19.5], [6.0, 23.5], [7.2, 27]];
const XS = TRIPS.map(t => t[0] / 8), YS = TRIPS.map(t => t[1] / 30);

export default {
  slug: 'intro-to-pytorch',
  title: 'PyTorch: tensors, autograd and devices',
  description: 'Watch a PyTorch training step for boda-boda trip times in Kampala. Tensors sit on a device, every operation adds a node to the autograd graph as it runs, and backward() fills each weight\'s gradient. Then leave the data on the CPU, switch off requires_grad, or forget torch.no_grad() and watch memory climb.',
  overview: 'PyTorch gives you three things. Tensors are arrays that live on a device, the CPU or a GPU, and every tensor in one calculation must be on the same device. Autograd records each operation as it runs, building a graph from the inputs to the loss; calling backward() walks that graph in reverse and stores a gradient in .grad for every tensor that asked for one with requires_grad. And nn.Module, optimizers and DataLoader wrap the training loop you built by hand. When you only want predictions, torch.no_grad() tells autograd not to record anything.',
  keywords: ['pytorch tutorial', 'autograd explained', 'requires_grad', 'torch no_grad', 'pytorch device mismatch'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.65, 0.05], dir: [0.15, 0.75, 1.3], half: 1.9, wide: 7.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { dataGpu: true, wGrad: true, noGrad: true, w: 0.15, b: 0.05, step: 0, clock: 0, leaked: 0, phase: 0 };
    const ink = '#151827', LR = 0.6;
    /* ---------- trays ---------- */
    const base = P.box(7.6, 0.12, 3.2, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, -0.1); S.add(base);
    const GX = -0.55, gpu = P.box(3.5, 0.1, 2.0, '#2F6B4F', { r: 0.08 }); gpu.position.set(GX, 0.12, 0.25); S.add(gpu);
    const gpuT = S.text('GPU', { size: 0.12, weight: 800, face: 'front', color: '#FFFFFF' }); gpuT.position.set(GX - 1.4, 0.17, 1.255); S.add(gpuT);
    const gpuTop = S.text('GPU (cuda)', { size: 0.1, weight: 800, color: '#FFFFFF' }); gpuTop.position.set(GX - 1.3, 0.225, 1.1); S.add(gpuTop);
    const CX = -3.0, cpu = P.box(1.0, 0.1, 2.0, '#5B6178', { r: 0.08 }); cpu.position.set(CX, 0.12, 0.25); S.add(cpu);
    const cpuT = S.text('CPU', { size: 0.12, weight: 800, face: 'front', color: '#FFFFFF' }); cpuT.position.set(CX, 0.17, 1.255); S.add(cpuT);
    const cpuTop = S.text('CPU', { size: 0.1, weight: 800, color: '#FFFFFF' }); cpuTop.position.set(CX, 0.225, 1.1); S.add(cpuTop);
    /* ---------- tensors ---------- */
    const tensor = (name, sub, color) => {
      const b = P.box(0.42, 0.34, 0.42, color, { r: 0.05 }); S.add(b);
      const top = S.text(name, { size: 0.15, weight: 800, color: '#FFFFFF' }); S.add(top);
      const fr = S.text(sub, { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF', maxW: 0.4 }); S.add(fr);
      const place = (x, z) => { b.position.set(x, 0.22, z); top.position.set(x, 0.565, z); fr.position.set(x, 0.39, z + 0.215); };
      return { b, top, fr, place };
    };
    const tw = tensor('w', 'weight', C.indigo), tb = tensor('b', 'bias', C.indigo), tx = tensor('x', 'distance', C.teal), ty = tensor('y', 'minutes', C.teal);
    tw.place(GX - 1.25, -0.35); tb.place(GX - 0.65, -0.35);
    const gradBar = () => { const m = new THREE.MeshLambertMaterial({ color: C.red }); const g = P.box(0.12, 1, 0.12, C.red, { r: 0.02, material: m }); g.userData.noFit = true; S.add(g); return g; };
    const gw = gradBar(), gb = gradBar();
    const gwT = S.text('', { size: 0.07, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); gwT.userData.noFit = true; S.add(gwT);
    const gbT = S.text('', { size: 0.07, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); gbT.userData.noFit = true; S.add(gbT);
    /* ---------- the autograd graph ---------- */
    const NODES = [{ s: '×', x: GX - 0.55, z: 0.35 }, { s: '+', x: GX + 0.05, z: 0.35 }, { s: '−', x: GX + 0.6, z: 0.35 }, { s: '²', x: GX + 1.05, z: 0.1 }, { s: 'mean', x: GX + 1.35, z: -0.3 }];
    const nodeMat = new THREE.MeshLambertMaterial({ color: '#F2C94C', emissive: '#000000' });
    const nodes = NODES.map(n => { const m = P.ball(0.13, '#F2C94C'); m.material = nodeMat; m.position.set(n.x, 0.45, n.z); S.add(m); const t = S.text(n.s, { size: 0.1, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); t.position.set(n.x, 0.68, n.z); t.userData.noFit = true; S.add(t); return { ...n, m, t }; });
    const lossBall = P.ball(0.16, C.red); lossBall.position.set(GX + 1.55, 0.5, -0.75); S.add(lossBall);
    const lossT = S.text('loss', { size: 0.09, weight: 800, color: '#FFFFFF', bg: C.red, face: 'cam', top: true }); lossT.position.set(GX + 1.55, 0.78, -0.75); lossT.userData.noFit = true; S.add(lossT);
    const edges = [];
    const edge = (a, b2) => { const e = P.tube([a, b2], 0.018, '#8E91A3'); e.userData.noFit = true; S.add(e); edges.push(e); return e; };
    const ePos = { w: () => tw.b.position.clone().add(V(0, 0.34, 0)), b: () => tb.b.position.clone().add(V(0, 0.34, 0)), x: () => tx.b.position.clone().add(V(0, 0.34, 0)), y: () => ty.b.position.clone().add(V(0, 0.34, 0)) };
    const np = i => nodes[i].m.position.clone();
    const inEdges = [0, 1, 2, 3].map(() => edge(V(), V(1, 0, 0)));
    edge(np(0), np(1)); edge(np(1), np(2)); edge(np(2), np(3)); edge(np(3), np(4)); edge(np(4), lossBall.position.clone());
    function wire() {
      [[ePos.w(), np(0)], [ePos.x(), np(0)], [ePos.b(), np(1)], [ePos.y(), np(2)]].forEach(([a, c], i) => { inEdges[i].geometry.dispose(); inEdges[i].geometry = new THREE.TubeGeometry(new THREE.LineCurve3(a, c), 4, 0.018, 5, false); });
    }
    const pulse = P.ball(0.07, C.orange); pulse.userData.noFit = true; S.add(pulse);
    const ghosts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: '#B9B6AE' }), 160);
    ghosts.count = 0; ghosts.userData.noFit = true; S.add(ghosts);
    const dummy = new THREE.Object3D();
    const crash = S.text('RuntimeError: tensors on different devices', { size: 0.085, weight: 800, color: '#FFFFFF', bg: C.red, face: 'cam', top: true, maxW: 2.4 }); crash.position.set(GX - 1.6, 1.2, 0.6); crash.userData.noFit = true; S.add(crash);
    /* ---------- the wall: trips and fitted line ---------- */
    const WX = 2.55, WZ = -0.55, WW = 1.9, WH = 1.75;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); S.add(wall);
    const wallT = S.text('boda-boda trips in Kampala', { size: 0.09, weight: 800, face: 'front', color: ink, maxW: WW - 0.2 }); wallT.position.set(WX, 0.12 + WH - 0.13, WZ + 0.045); S.add(wallT);
    const wallTop = S.text('the data', { size: 0.07, weight: 800 }); wallTop.position.set(WX, 0.12 + WH + 0.005, WZ); S.add(wallTop);
    const px = u => WX - WW / 2 + 0.2 + u * (WW - 0.4), py = v => 0.12 + 0.3 + v * (WH - 0.6), PZ = WZ + 0.06;
    TRIPS.forEach((_, i) => { const d = P.ball(0.035, C.teal); d.position.set(px(XS[i]), py(YS[i]), PZ); d.userData.noFit = true; S.add(d); });
    const fit = P.tube([V(), V(1, 0, 0)], 0.018, C.indigo); fit.userData.noFit = true; S.add(fit);
    const axX = S.text('km →', { size: 0.07, weight: 700, face: 'front', color: ink }); axX.position.set(px(0.88), 0.12 + 0.17, PZ); S.add(axX);
    const axY = S.text('min ↑', { size: 0.07, weight: 700, face: 'front', color: ink }); axY.position.set(px(0.05), py(1) + 0.07, PZ); S.add(axY);
    /* memory column */
    const MX = 3.25, MZ = 0.7, memBase = P.box(0.62, 0.1, 0.5, '#3B3F8F', { r: 0.05 }); memBase.position.set(MX, 0.12, MZ); S.add(memBase);
    const memT = S.text('GPU memory', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); memT.position.set(MX, 0.17, MZ + 0.255); S.add(memT);
    const memMat = new THREE.MeshLambertMaterial({ color: '#7BD389' });
    const mem = P.box(0.36, 1, 0.3, '#7BD389', { r: 0.04, material: memMat }); mem.position.set(MX, 0.22, MZ); mem.userData.noFit = true; S.add(mem);
    const memGlass = P.box(0.44, 1.52, 0.38, '#BFD9E6', { r: 0.04, material: new THREE.MeshLambertMaterial({ color: '#BFD9E6', transparent: true, opacity: 0.25, depthWrite: false }), cast: false }); memGlass.position.set(MX, 0.22, MZ); memGlass.layers.set(1); S.add(memGlass);
    const memCap = P.box(0.46, 0.025, 0.4, C.red, { r: 0 }); memCap.position.set(MX, 1.72, MZ); S.add(memCap);
    /* ---------- maths ---------- */
    const lossOf = (w, b) => XS.reduce((a, x, i) => a + (w * x + b - YS[i]) ** 2, 0) / XS.length;
    const grads = (w, b) => { let dw = 0, db = 0; XS.forEach((x, i) => { const e = 2 * (w * x + b - YS[i]) / XS.length; dw += e * x; db += e; }); return [dw, db]; };
    const crashed = () => !st.dataGpu;
    const memMB = () => 120 + st.leaked * 18;
    function placeData() {
      if (st.dataGpu) { tx.place(GX - 1.25, 0.65); ty.place(GX - 0.05, 0.85); } else { tx.place(CX, -0.1); ty.place(CX, 0.6); }
      wire();
    }
    function drawFit() {
      const p0 = V(px(0), py(Math.max(-0.1, Math.min(1.1, st.b))), PZ + 0.01), p1 = V(px(1), py(Math.max(-0.1, Math.min(1.1, st.w + st.b))), PZ + 0.01);
      fit.geometry.dispose(); fit.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 4, 0.018, 5, false);
    }
    let G = [0, 0];
    function drawGrads() {
      const show = !crashed();
      const hw = st.wGrad && show ? Math.min(0.9, 0.05 + Math.abs(G[0]) * 1.5) : 0.001, hb = show ? Math.min(0.9, 0.05 + Math.abs(G[1]) * 1.5) : 0.001;
      gw.scale.y = hw; gw.position.set(tw.b.position.x, 0.56, tw.b.position.z); gw.visible = st.wGrad && show;
      gb.scale.y = hb; gb.position.set(tb.b.position.x, 0.56, tb.b.position.z); gb.visible = show;
      gwT.position.set(tw.b.position.x, 0.62 + (gw.visible ? hw : 0.05) + 0.1, tw.b.position.z); gwT.userData.set(st.wGrad ? `w.grad ${G[0].toFixed(2)}` : 'w.grad: None');
      gbT.position.set(tb.b.position.x, 0.62 + (gb.visible ? hb : 0.05) + 0.1, tb.b.position.z); gbT.userData.set(`b.grad ${G[1].toFixed(2)}`);
    }
    function drawMem() {
      const h = Math.min(1.5, memMB() / 1200 * 1.5); mem.scale.y = h; memMat.color.set(memMB() > 900 ? C.red : '#7BD389');
      ghosts.count = Math.min(160, st.leaked * 5);
      for (let i = 0; i < ghosts.count; i++) { const row = Math.floor(i / 20), col = i % 20; dummy.position.set(GX - 1.6 + col * 0.17, 0.25 + row * 0.13, -0.85); dummy.scale.setScalar(1); dummy.updateMatrix(); ghosts.setMatrixAt(i, dummy.matrix); }
      ghosts.instanceMatrix.needsUpdate = true;
    }
    function restart() { st.w = 0.15; st.b = 0.05; st.step = 0; st.leaked = 0; st.clock = 0; G = grads(st.w, st.b); placeData(); drawFit(); drawGrads(); drawMem(); crash.visible = crashed(); }
    restart();
    function trainStep() {
      if (crashed()) return;
      G = grads(st.w, st.b);
      if (st.wGrad) st.w -= LR * G[0];
      st.b -= LR * G[1];
      st.step++;
      if (st.step % 5 === 0 && !st.noGrad) st.leaked = Math.min(60, st.leaked + 1);
      drawFit(); drawGrads(); drawMem();
    }
    // fast-forward so the status always describes the same moment: 120 steps in
    function settle() { for (let i = 0; i < 120; i++) trainStep(); }
    function update(dt) {
      st.clock += dt;
      const per = S.reduced ? 0.25 : 0.9, ph = (st.clock % per) / per;
      if (crashed()) { pulse.visible = false; nodeMat.emissive.set('#000000'); return; }
      pulse.visible = true;
      // forward along the graph for the first half, backward (red) for the second
      const route = [ePos.x(), np(0), np(1), np(2), np(3), np(4), lossBall.position.clone()];
      const u = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5, k = Math.min(route.length - 2, Math.floor(u * (route.length - 1))), f = u * (route.length - 1) - k;
      pulse.position.copy(route[k]).lerp(route[k + 1], f);
      pulse.material.color.set(ph < 0.5 ? C.orange : C.red);
      nodeMat.emissive.set(ph < 0.5 ? '#3A2E00' : '#000000');
      if (Math.floor(st.clock / per) !== st.phase) { st.phase = Math.floor(st.clock / per); if (st.step < 400) trainStep(); }
    }
    const controls = [
      { type: 'buttons', label: 'Data tensors live on', options: ['GPU', 'CPU'], get: () => (st.dataGpu ? 0 : 1), act: i => { st.dataGpu = !i; restart(); settle(); } },
      { type: 'toggle', label: 'w.requires_grad', short: 'requires_grad', get: () => st.wGrad, set: v => { st.wGrad = v; restart(); settle(); } },
      { type: 'toggle', label: 'Evaluate inside torch.no_grad()', short: 'no_grad', get: () => st.noGrad, set: v => { st.noGrad = v; restart(); settle(); } },
      { type: 'button', label: 'Start training again', short: 'Restart', act: () => { restart(); } },
    ];
    const readouts = [
      { label: 'Loss', get: () => (crashed() ? { v: 'crashed', bad: true } : { v: (lossOf(st.w, st.b) * 900).toFixed(1), sub: `step ${st.step}`, good: lossOf(st.w, st.b) * 900 < 3, bad: lossOf(st.w, st.b) * 900 > 10 }) },
      { label: 'Minutes per km', get: () => ({ v: crashed() ? '–' : (st.w * 30 / 8).toFixed(2), sub: 'learned w' }) },
      { label: 'GPU memory', get: () => ({ v: `${memMB()} MB`, sub: `${st.leaked * 5} graphs kept`, bad: memMB() > 600, good: memMB() < 200 }) },
    ];
    const labels = [
      { name: 'tensors', t: 'Tensors on a device', d: 'w and b are weights; x and y are data', icon: 'box', atV: V(GX - 1.75, 0.3, 0.25) },
      { name: 'graph', t: 'The autograd graph', d: 'Recorded as the code runs', icon: 'link', atV: V(GX + 0.6, 0.45, 0.35) },
      { name: 'wall', t: 'Trips and the fitted line', d: 'Minutes against distance', icon: 'wave', atV: V(WX + WW / 2, 0.12 + WH * 0.6, WZ) },
      { name: 'memory', t: 'GPU memory', d: 'Red line: out of memory', icon: 'scale', atV: V(MX + 0.35, 0.3, MZ) },
    ];
    const reset = () => { Object.assign(st, { dataGpu: true, wGrad: true, noGrad: true }); restart(); settle(); };
    const breaks = [
      { label: 'Data left on the CPU', hint: 'Forgot x.to(device)', on: () => { reset(); st.dataGpu = false; restart(); }, off: reset },
      { label: 'w.requires_grad = False', hint: 'The weight never asks for a gradient', on: () => { reset(); st.wGrad = false; restart(); settle(); }, off: reset },
      { label: 'Evaluate without no_grad()', hint: 'Every check records a graph', on: () => { reset(); st.noGrad = false; restart(); settle(); }, off: reset },
    ];
    function status() {
      if (crashed()) return { ok: false, msg: `<b>RuntimeError: expected all tensors to be on the same device.</b> The weights are on the GPU but x and y were left on the CPU, so the very first multiply cannot happen. Move the batch with x.to(device) before the forward pass.` };
      if (!st.wGrad) return { ok: false, msg: `<b>w never learns.</b> With requires_grad off, autograd does not track w, so after backward() w.grad is None and the optimizer has nothing to apply. Only the bias moves, and the line can only slide up and down: still off by ${(Math.sqrt(lossOf(st.w, st.b)) * 30).toFixed(1)} minutes on average.` };
      if (!st.noGrad) return { ok: false, msg: `<b>Memory keeps climbing.</b> Each evaluation runs outside torch.no_grad(), so autograd records a full graph it will never use, and holding on to the outputs keeps those graphs alive (${st.leaked * 5} so far, ${memMB()} MB). Over a long run this ends in an out-of-memory crash.` };
      return { ok: true, msg: `<b>Training cleanly.</b> Everything is on the GPU, autograd records the graph on each forward pass, backward() fills w.grad and b.grad, and evaluation runs inside no_grad(). The line has learned about ${(st.w * 30 / 8).toFixed(1)} minutes per km, average miss ${(Math.sqrt(lossOf(st.w, st.b)) * 30).toFixed(1)} minutes.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); restart(); if (p.settle) settle(); } };
  },

  story: [
    { t: 'Tensors on a device', home: true, say: 'We are fitting boda-boda trip times in Kampala: minutes from distance. In PyTorch every number lives in a tensor, and every tensor lives on a device, here the GPU.', act: m => m.set({ dataGpu: true, wGrad: true, noGrad: true }), wait: 3 },
    { t: 'The graph builds itself', home: true, say: 'As the forward pass runs, autograd records each operation: multiply, add, subtract, square, mean. That chain from the weights to the loss is the graph.', act: m => m.set({}), wait: 4 },
    { t: 'Backward', home: true, say: 'Calling backward walks the graph in reverse. The red bars are the gradients it stores in w dot grad and b dot grad, and the optimizer uses them to nudge the line.', act: m => m.set({}), wait: 5 },
    { t: 'Wrong device', home: true, say: 'Leave the data on the CPU while the weights are on the GPU, and the first multiply fails. Every tensor in a calculation must be on the same device.', act: m => m.set({ dataGpu: false }), wait: 3 },
    { t: 'No gradient asked for', home: true, say: 'Switch off requires grad on w, and autograd stops tracking it. Its gradient is None, so it never changes, and the line can only slide up and down.', act: m => m.set({ dataGpu: true, wGrad: false, settle: true }), wait: 3 },
    { t: 'Predict inside no grad', home: true, say: 'When you only want answers, wrap the code in torch dot no grad. Skip it, and every check records a graph you never use, until the memory runs out.', act: m => m.set({ wGrad: true, noGrad: false, settle: true }), wait: 3 },
  ],
  check: [
    { q: 'What does loss.backward() do?', options: ['Walks the recorded graph in reverse and stores a gradient in .grad for each tracked tensor', 'Updates the weights', 'Deletes the graph without computing anything'], answer: 0, why: 'The optimizer\'s step() is what changes the weights.' },
    { q: 'Why did the step crash when the data stayed on the CPU?', options: ['All tensors in one calculation must be on the same device', 'The CPU is too slow', 'The data was the wrong shape'], answer: 0, why: 'Move the batch with .to(device) before the forward pass.' },
    { q: 'When should you use torch.no_grad()?', options: ['When making predictions you will not train on', 'During every training step', 'Only when using the CPU'], answer: 0, why: 'It stops autograd recording graphs you do not need.' },
  ],
  terms: [
    ['Tensor', 'A multi-dimensional array that can live on a CPU or a GPU.'],
    ['Device', 'Where a tensor is stored and computed: CPU or GPU.'],
    ['Autograd', 'PyTorch\'s automatic differentiation, which records operations as they run.'],
    ['requires_grad', 'A flag asking autograd to track a tensor and compute its gradient.'],
    ['.grad', 'Where backward() stores a tensor\'s gradient.'],
    ['torch.no_grad()', 'A block in which autograd records nothing.'],
  ],
  deeper: '<p><b>Define by run.</b> The graph is built fresh on every forward pass, so ordinary Python if statements and loops just work, and the graph can change shape from one batch to the next.</p><p><b>Saving a model</b> means saving its state_dict: a dictionary of every weight tensor. Load it into the same model class later.</p><p><b>model.eval()</b> is a different thing from no_grad(): it switches dropout and batch norm to prediction mode. For predictions you usually want both.</p>',
  code: {
    title: 'The same fit in PyTorch',
    note: 'Adapted from the course\'s introduction to PyTorch.',
    text: `
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
km = torch.tensor([1.2, 2.0, 2.8, 3.5, 4.4, 5.1, 6.0, 7.2], device=device)
minutes = torch.tensor([9, 10.5, 13.5, 15, 18.5, 19.5, 23.5, 27], device=device)

w = torch.zeros(1, device=device, requires_grad=True)
b = torch.zeros(1, device=device, requires_grad=True)
opt = torch.optim.SGD([w, b], lr=0.01)

for step in range(500):
    opt.zero_grad()
    loss = ((w * km + b - minutes) ** 2).mean()   # graph recorded as this runs
    loss.backward()                               # fills w.grad and b.grad
    opt.step()

with torch.no_grad():                             # predictions: record nothing
    print(w * 3.0 + b)                            # a 3 km trip
`,
  },
};
