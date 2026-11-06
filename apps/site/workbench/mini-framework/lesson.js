// Mini framework: the pieces of a deep learning framework laid out as an assembly line.
// A DataLoader hands out batches, the Sequential model's modules sit in a row, the loss scores each batch, and the optimizer updates the weights.
// It really trains: a small network learns which spots of a farm are inside a centre-pivot irrigation circle, shown on the board behind.
// Break it: forget optimizer.zero_grad() (gradients pile up), forget optimizer.step() (nothing ever changes), remove the activations (only straight lines).
const H = 16, E = 40, NPTS = 240, GRID = 16, R0 = 0.6;
const MODS = [
  { k: 'lin1', n: 'Linear', d: '2 → 16', c: '#3B3F8F' },
  { k: 'act1', n: 'ReLU', d: 'bend', c: '#EE7434', act: true },
  { k: 'lin2', n: 'Linear', d: '16 → 16', c: '#3B3F8F' },
  { k: 'act2', n: 'ReLU', d: 'bend', c: '#EE7434', act: true },
  { k: 'lin3', n: 'Linear', d: '16 → 1', c: '#3B3F8F' },
  { k: 'sig', n: 'Sigmoid', d: 'to 0–1', c: '#8A3F8E' },
];

function trainRun(o) {
  let s = 42; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  const data = [...Array(NPTS)].map(() => { const x = r() * 2 - 1, y = r() * 2 - 1; return [x, y, +(Math.hypot(x, y) < R0)]; });
  const L = [[2, H], [H, H], [H, 1]].map(([i, j]) => ({ W: [...Array(j)].map(() => [...Array(i)].map(() => g() * Math.sqrt(2 / i))), b: Array(j).fill(0) }));
  const st = L.map(l => ({ gW: l.W.map(q => q.map(() => 0)), gb: l.b.map(() => 0), mW: l.W.map(q => q.map(() => 0)), vW: l.W.map(q => q.map(() => 0)), mb: l.b.map(() => 0), vb: l.b.map(() => 0) }));
  const act = z => (o.relu ? Math.max(0, z) : z), dact = z => (o.relu ? (z > 0 ? 1 : 0) : 1), sig = z => 1 / (1 + Math.exp(-z));
  const fwd = x => { const hs = [x], zs = []; let h = x; L.forEach((l, k) => { const z = l.W.map((row, j) => row.reduce((a, w, i) => a + w * h[i], l.b[j])); zs.push(z); h = k < 2 ? z.map(act) : z; hs.push(h); }); return { hs, zs, p: sig(h[0]) }; };
  const snap = () => { const m = []; for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) m.push(fwd([(gx + 0.5) / GRID * 2 - 1, (gy + 0.5) / GRID * 2 - 1]).p); return m; };
  const score = () => { let acc = 0, loss = 0; data.forEach(([x, y, lab]) => { const p = fwd([x, y]).p; acc += (p > 0.5) === !!lab; loss += -(lab * Math.log(p + 1e-9) + (1 - lab) * Math.log(1 - p + 1e-9)); }); return { acc: acc / NPTS, loss: loss / NPTS }; };
  const hist = [{ ...score(), map: snap(), gsize: 0 }];
  let t = 0;
  for (let ep = 0; ep < E; ep++) {
    const idx = data.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    let gsize = 0;
    for (let b0 = 0; b0 < idx.length; b0 += 16) {
      if (o.zero) st.forEach(q => { q.gW.forEach(row => row.fill(0)); q.gb.fill(0); });
      const B = idx.slice(b0, b0 + 16);
      for (const n of B) {
        const [x, y, lab] = data[n], { hs, zs, p } = fwd([x, y]); let d = [(p - lab) / B.length];
        for (let k = 2; k >= 0; k--) {
          const l = L[k], dz = k < 2 ? d.map((v, j) => v * dact(zs[k][j])) : d, hin = hs[k];
          dz.forEach((v, j) => { st[k].gb[j] += v; hin.forEach((hv, i) => { st[k].gW[j][i] += v * hv; }); });
          d = hin.map((_, i) => dz.reduce((a, v, j) => a + v * l.W[j][i], 0));
        }
      }
      gsize = Math.max(gsize, Math.sqrt(st.reduce((a, q) => a + q.gW.flat().reduce((b, v) => b + v * v, 0), 0)));
      if (!o.step) continue;
      t++;
      L.forEach((l, k) => {
        const S = st[k], b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** t, c2 = 1 - b2 ** t;
        if (o.opt === 'adam') {
          const lr = 0.01;
          l.W.forEach((row, j) => row.forEach((w, i) => { const gg = S.gW[j][i]; S.mW[j][i] = b1 * S.mW[j][i] + (1 - b1) * gg; S.vW[j][i] = b2 * S.vW[j][i] + (1 - b2) * gg * gg; row[i] -= lr * (S.mW[j][i] / c1) / (Math.sqrt(S.vW[j][i] / c2) + 1e-8); }));
          l.b.forEach((w, j) => { const gg = S.gb[j]; S.mb[j] = b1 * S.mb[j] + (1 - b1) * gg; S.vb[j] = b2 * S.vb[j] + (1 - b2) * gg * gg; l.b[j] -= lr * (S.mb[j] / c1) / (Math.sqrt(S.vb[j] / c2) + 1e-8); });
        } else {
          const lr = 0.5;
          l.W.forEach((row, j) => row.forEach((w, i) => { row[i] -= lr * S.gW[j][i]; }));
          l.b.forEach((w, j) => { l.b[j] -= lr * S.gb[j]; });
        }
      });
    }
    hist.push({ ...score(), map: ep % 2 || ep === E - 1 ? snap() : null, gsize });
  }
  for (let i = 1; i < hist.length; i++) if (!hist[i].map) hist[i].map = hist[i - 1].map;
  return { data, hist };
}

export default {
  slug: 'mini-framework',
  title: 'A mini framework: the parts of PyTorch',
  description: 'The parts of deep learning on one assembly line: a loader, a row of modules, a loss and an optimizer. Forget zero_grad, step or the activations, and see what stops.',
  overview: 'A framework is a few organising ideas. A Module holds weights and knows how to run forward. Sequential chains modules in order. A loss function scores the output, and calling backward fills every weight\'s gradient. The optimizer turns gradients into weight changes with step(), and zero_grad() clears the gradients before the next batch, because they add up otherwise. A DataLoader shuffles the data and cuts it into batches. The training loop is the same five lines in every project.',
  keywords: ['build a deep learning framework', 'nn.Module explained', 'zero_grad why', 'pytorch training loop', 'sequential model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, -0.2], dir: [0.15, 0.6, 1.3], half: 2.2, wide: 7.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { zero: true, step: true, relu: true, opt: 'adam', t: 0 };
    const ink = '#151827';
    /* ---------- the line ---------- */
    const RZ = 0.75, rail = P.box(5.2, 0.08, 0.5, '#8E91A3', { r: 0.04 }); rail.position.set(-0.45, 0.12, RZ); floor.add(rail);
    const mods = MODS.map((m, i) => {
      const x = -2.35 + i * 0.75, b = P.box(0.6, 0.42, 0.5, m.c, { r: 0.06 }); b.position.set(x, 0.2, RZ); floor.add(b);
      return { ...m, x, b };
    });

    /* DataLoader hopper */
    const LX = -3.25, hop = P.box(0.6, 0.6, 0.6, C.teal, { r: 0.06 }); hop.position.set(LX, 0.12, RZ); floor.add(hop);



    /* loss + optimizer */
    const SX = 2.25, loss = P.box(0.6, 0.6, 0.6, C.red, { r: 0.06 }); loss.position.set(SX, 0.12, RZ); floor.add(loss);



    const OX = 3.15, opt = P.box(0.7, 0.6, 0.6, '#2E7A45', { r: 0.06 }); opt.position.set(OX, 0.12, RZ); floor.add(opt);


    const lampMat = k => new THREE.MeshLambertMaterial({ color: '#7BD389', emissive: '#1F5F2C' });
    const lamps = ['zero_grad()', 'step()'].map((n, i) => {
      const m = lampMat(), l = P.cyl(0.06, 0.08, '#7BD389', { material: m, seg: 16 }); l.position.set(OX - 0.17 + i * 0.34, 0.72, RZ + 0.12); floor.add(l);
      return { l, m };
    });
    /* moving batch crate and backward pulse */
    const crate = P.box(0.18, 0.14, 0.18, '#D7B377', { r: 0.03 }); crate.userData.noFit = true; floor.add(crate);
    const pulse = P.ball(0.07, C.red); pulse.userData.noFit = true; floor.add(pulse);
    /* ---------- the field board ---------- */
    const FZ = -1.1, FW = 2.3, FY = 0.2, BX = -0.45;
    const board = P.box(FW + 0.3, FW + 0.55, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, FZ); floor.add(board);


    const fx = u => BX + u * FW / 2, fy = v => 0.12 + FY + (v + 1) * FW / 2, TZ = FZ + 0.05;
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(FW / GRID * 0.96, FW / GRID * 0.96, 0.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), GRID * GRID);
    tiles.userData.noFit = true; tiles.layers.set(1); floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), wet = new THREE.Color('#5FB37A'), dry = new THREE.Color('#E5CF9F');
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) { dummy.position.set(fx((gx + 0.5) / GRID * 2 - 1), fy((gy + 0.5) / GRID * 2 - 1), TZ); dummy.updateMatrix(); tiles.setMatrixAt(gy * GRID + gx, dummy.matrix); }
    const ringPts = []; for (let a = 0; a <= 64; a++) ringPts.push(V(fx(R0 * Math.cos(a / 64 * 6.2832)), fy(R0 * Math.sin(a / 64 * 6.2832)), TZ + 0.02));
    const ring = P.tube(ringPts, 0.012, '#1F4E79'); ring.userData.noFit = true; floor.add(ring);
    const pts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NPTS);
    pts.userData.noFit = true; pts.layers.set(1); floor.add(pts);

    /* ---------- train and draw ---------- */
    let run = null;
    function retrain() {
      run = trainRun({ zero: st.zero, step: st.step, relu: st.relu, opt: st.opt }); st.t = 0;
      run.data.forEach(([x, y, lab], i) => { dummy.position.set(fx(x), fy(y), TZ + 0.03); dummy.updateMatrix(); pts.setMatrixAt(i, dummy.matrix); pts.setColorAt(i, col.set(lab ? '#1F4E79' : '#8A5A2B')); });
      pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true;
      mods.forEach(m => { const on = !m.act || st.relu; m.b.visible = on;   });
      lamps[0].m.color.set(st.zero ? '#7BD389' : '#4A4D63'); lamps[0].m.emissive.set(st.zero ? '#1F5F2C' : '#000000');
      lamps[1].m.color.set(st.step ? '#7BD389' : '#4A4D63'); lamps[1].m.emissive.set(st.step ? '#1F5F2C' : '#000000');
      drawEpoch(E);
    }
    let shown = -1;
    function drawEpoch(ep) {
      if (ep === shown) return; shown = ep;
      const h = run.hist[ep];
      h.map.forEach((p, i) => tiles.setColorAt(i, col.copy(dry).lerp(wet, p)));
      tiles.instanceColor.needsUpdate = true;

    }
    retrain();
    const cur = () => run.hist[Math.min(E, Math.floor(st.t))];
    function update(dt) {
      st.t = Math.min(E, st.t + dt * (S.reduced ? 40 : 6));
      drawEpoch(Math.floor(st.t));
      // one batch every 1.2 s: forward along the line, then the error travels back
      st.clock = (st.clock || 0) + dt; const ph = st.clock % 1.2 / 1.2;
      const xs = LX + 0.3, xe = SX - 0.3;
      if (ph < 0.55) { const u = ph / 0.55; crate.visible = true; pulse.visible = false; crate.position.set(xs + (xe - xs) * u, 0.66, RZ); }
      else { const u = (ph - 0.55) / 0.45; crate.visible = false; pulse.visible = true; pulse.position.set(xe - (xe - (-2.35)) * u, 0.75, RZ); }
    }
    const controls = [
      { type: 'buttons', label: 'Optimizer', options: ['Adam', 'SGD'], get: () => (st.opt === 'adam' ? 0 : 1), act: i => { st.opt = i ? 'sgd' : 'adam'; retrain(); } },
      { type: 'toggle', label: 'Call optimizer.zero_grad() each batch', short: 'zero_grad', get: () => st.zero, set: v => { st.zero = v; retrain(); } },
      { type: 'toggle', label: 'Call optimizer.step() each batch', short: 'step', get: () => st.step, set: v => { st.step = v; retrain(); } },
      { type: 'toggle', label: 'ReLU activations between layers', short: 'ReLU', get: () => st.relu, set: v => { st.relu = v; retrain(); } },
      { type: 'button', label: 'Train again', short: 'Train', act: () => { st.t = 0; } },
    ];
    const fin = () => run.hist[E];
    const readouts = [
      { label: 'Correct', get: () => { const h = cur(); return { v: `${Math.round(h.acc * 100)}%`, sub: `epoch ${Math.min(E, Math.floor(st.t))} of ${E}`, good: h.acc > 0.95, bad: h.acc < 0.85 }; } },
      { label: 'Loss', get: () => { const h = cur(); return { v: h.loss.toFixed(3), sub: 'lower is better' }; } },
      { label: 'Biggest gradient', get: () => { const h = cur(); return { v: h.gsize ? h.gsize.toFixed(2) : '–', sub: 'this epoch', bad: h.gsize > 3 }; } },
    ];
    const labels = [
      { name: 'loader', t: 'DataLoader', d: 'Shuffles, then hands out batches', icon: 'box', atV: V(LX - 0.3, 0.5, RZ) },
      { name: 'model', t: 'Sequential model', d: 'Modules run in order', icon: 'link', atV: V(-2.35, 0.5, RZ) },
      { name: 'opt', t: 'Loss and optimizer', d: 'Score, then update every weight', icon: 'scale', atV: V(OX + 0.35, 0.5, RZ) },
      { name: 'field', t: 'What it learned', d: 'Green: it thinks the spot is watered', icon: 'target', atV: V(BX + FW / 2 + 0.15, fy(0.4), FZ) },
    ];
    const reset = () => { Object.assign(st, { zero: true, step: true, relu: true, opt: 'adam' }); retrain(); };
    const breaks = [
      { label: 'Forget zero_grad()', hint: 'Gradients never cleared', on: () => { reset(); st.zero = false; retrain(); }, off: reset },
      { label: 'Forget step()', hint: 'Gradients computed, never used', on: () => { reset(); st.step = false; retrain(); }, off: reset },
      { label: 'Remove the activations', hint: 'Linear layers only', on: () => { reset(); st.relu = false; retrain(); }, off: reset },
    ];
    function status() {
      const h = fin(), gmax = Math.max(...run.hist.map(q => q.gsize));
      if (!st.step) return { ok: false, msg: `<b>Nothing changes.</b> Every batch runs forward, the loss is measured and backward fills in the gradients, but without optimizer.step() no weight ever moves. After ${E} epochs it is exactly as clueless as at the start: ${Math.round(h.acc * 100)}% correct, which is just calling every spot dry.` };
      if (!st.zero) return { ok: false, msg: `<b>Gradients pile up.</b> Backward adds each batch's gradients on top of what is already stored. Without zero_grad() the old ones are never cleared, so every step pushes in the sum of all past directions (biggest gradient ${gmax.toFixed(1)}) and it lurches about: ${Math.round(h.acc * 100)}% correct.` };
      if (!st.relu) return { ok: false, msg: `<b>Only straight lines.</b> Without activations, three Linear layers in a row collapse into one: the model can only split the farm with a straight edge, never draw a circle. ${Math.round(h.acc * 100)}% correct, about as good as calling everything dry.` };
      return { ok: true, msg: `<b>It learned the circle.</b> Batches flow through the modules, the loss scores them, backward fills the gradients, ${st.opt === 'adam' ? 'Adam' : 'SGD'} steps, and zero_grad clears the slate. After ${E} epochs it gets ${Math.round(h.acc * 100)}% of the spots right.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); retrain(); } };
  },

  story: [
    { t: 'One assembly line', home: true, say: 'These are the parts of a deep learning framework. The job: learn which spots of a farm a centre-pivot sprinkler reaches, from 240 marked spots.', act: m => m.set({ zero: true, step: true, relu: true, opt: 'adam' }), wait: 3 },
    { t: 'Modules in a row', home: true, say: 'The model is a Sequential row of modules: Linear layers that mix numbers, ReLU bends between them, and a Sigmoid that turns the answer into a chance from zero to one.', act: m => m.set({}), wait: 3 },
    { t: 'The training loop', home: true, say: 'Each batch goes forward, the loss scores it, and backward sends the error back through every module. The optimizer then steps every weight, and zero grad clears the gradients for the next batch.', act: m => m.set({}), wait: 4 },
    { t: 'Forget zero grad', home: true, say: 'Forget to clear the gradients, and each batch\'s are added to all the old ones. The steps grow wild and the guess lurches about.', act: m => m.set({ zero: false }), wait: 4 },
    { t: 'Forget the activations', home: true, say: 'Take out the ReLU modules, and the Linear layers collapse into a single straight line. No straight line can draw a circle.', act: m => m.set({ zero: true, relu: false }), wait: 4 },
    { t: 'All the parts', home: true, say: 'Put every part back. These same few pieces, module, sequential, loss, optimizer and data loader, are what every big framework is built from.', act: m => m.set({ zero: true, step: true, relu: true }), wait: 4 },
  ],
  check: [
    { q: 'Why does the training loop call optimizer.zero_grad()?', options: ['Gradients add up across batches unless they are cleared', 'To reset the weights to zero', 'To make the loss zero'], answer: 0, why: 'Backward adds to the stored gradients; zero_grad clears them before the next batch.' },
    { q: 'What happens if you forget optimizer.step()?', options: ['The gradients are computed but no weight ever changes', 'Training runs twice as fast', 'The loss becomes negative'], answer: 0, why: 'step() is the call that actually updates the weights.' },
    { q: 'Why can\'t a stack of Linear layers with no activations learn a circle?', options: ['Linear layers in a row collapse into one, which can only draw straight boundaries', 'They have too many weights', 'Circles need a bigger batch'], answer: 0, why: 'A chain of linear maps is still one linear map.' },
  ],
  terms: [
    ['Module', 'A building block that holds weights and runs forward.'],
    ['Sequential', 'A module that runs a list of modules one after another.'],
    ['DataLoader', 'Shuffles the data and cuts it into batches.'],
    ['Optimizer', 'Updates the weights from their gradients with step().'],
    ['zero_grad()', 'Clears stored gradients before the next batch.'],
    ['Epoch', 'One full pass over the training data.'],
  ],
  deeper: '<p><b>Why do gradients accumulate at all?</b> It is a feature: if a batch is too big for memory, you can run several small ones, let their gradients add up, and step once. That is called gradient accumulation.</p><p><b>train() and eval()</b> flip every module into training or prediction mode, which matters for dropout and batch normalisation.</p><p><b>Parameters.</b> Each module lists its weights, and Sequential collects its children\'s, so model.parameters() hands the optimizer every weight in one go.</p>',
  code: {
    title: 'Module, Sequential and the training loop',
    note: 'Adapted from the course\'s mini framework lesson.',
    text: `
class Module:
    def parameters(self):
        return []
    def __call__(self, x):
        return self.forward(x)

class Sequential(Module):
    def __init__(self, *layers):
        self.layers = layers
    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x
    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]

model = Sequential(Linear(2, 16), ReLU(), Linear(16, 16), ReLU(), Linear(16, 1), Sigmoid())
optimizer = Adam(model.parameters(), lr=0.01)

for epoch in range(40):
    for x, y in DataLoader(data, batch_size=16, shuffle=True):
        optimizer.zero_grad()           # clear last batch's gradients
        loss = bce(model(x), y)
        loss.backward()                 # fill every gradient
        optimizer.step()                # move every weight
`,
  },
};
