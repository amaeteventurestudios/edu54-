// Real-time vision on the edge: a camera on a pole counts motorbike taxis passing a crossing in Kigali, running a detector on a small board with no cloud.
// The board has a 33 ms budget per frame (30 frames a second). Stacked bars show where the time goes: grabbing the frame, resizing, the model, and NMS.
// The road below shows frames arriving: green when processed in time, grey when dropped. Hand-tuned choices: model size, input resolution, number precision, batching.
// Break it: run the big model (frames are dropped, bikes are missed), batch 8 frames for throughput (each answer arrives a quarter-second late), int8 without calibration (accuracy collapses).
const MODELS = { nano: { n: 'nano', ms: 11, map: 0.62, mb: 6 }, small: { n: 'small', ms: 18, map: 0.7, mb: 22 }, large: { n: 'large', ms: 95, map: 0.78, mb: 170 } };

export default {
  slug: 'real-time-edge',
  title: 'Edge vision: fast enough, small enough',
  description: 'A camera on a Lagos toll gate must count cars on a small chip, in real time. Trade size for speed: quantise, prune, and watch the frame budget.',
  overview: 'Running vision on a device, rather than in a data centre, means a fixed budget: to keep up with 30 frames a second, everything for one frame (grabbing it, resizing it, the model and the clean-up) must fit in 33 milliseconds. Smaller models and lower resolutions are faster but see less. Storing weights as 8-bit integers instead of 32-bit floats cuts memory by four and speeds things up, but needs calibration on real images to choose the scaling. Batching several frames improves throughput but makes every answer wait, which is wrong for a live camera.',
  keywords: ['edge ai', 'real time object detection', 'int8 quantization calibration', 'latency vs throughput', 'model compression'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.15, 0.5, 1.3], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { model: 'small', res: 416, prec: 'int8', calib: true, batch: 1 };
    const ink = '#151827';
    /* ---------- the street ---------- */
    const road = P.box(6.2, 0.02, 0.9, '#4A4A4A', { r: 0.02 }); road.position.set(0, 0.12, 0.75); floor.add(road);
    for (let i = 0; i < 6; i++) { const z = P.box(0.18, 0.005, 0.8, '#F2F2F2', { r: 0 }); z.position.set(-0.6 + i * 0.25, 0.14, 0.75); floor.add(z); }
    const pole = P.cyl(0.04, 1.6, '#5B6178', { seg: 12 }); pole.position.set(-2.7, 0.12, 0.15); floor.add(pole);
    const arm = P.box(0.7, 0.05, 0.05, '#5B6178', { r: 0.01 }); arm.position.set(-2.4, 1.7, 0.15); floor.add(arm);
    const cam = P.box(0.22, 0.14, 0.14, '#2B2B2B', { r: 0.03 }); cam.position.set(-2.1, 1.6, 0.2); cam.rotation.x = -0.5; floor.add(cam);

    const bikes = [...Array(5)].map(() => { const g = new THREE.Group(); const b = P.box(0.28, 0.1, 0.08, '#C0392B', { r: 0.02 }); b.position.y = 0.05; g.add(b); const rider = P.box(0.08, 0.14, 0.08, '#2F6B4F', { r: 0.02 }); rider.position.set(-0.02, 0.15, 0); g.add(rider); const helmet = P.ball(0.045, '#E3A72F'); helmet.position.set(-0.02, 0.32, 0); g.add(helmet); const ring = P.tube([...Array(17)].map((_, k) => V(Math.cos(k / 16 * 6.283) * 0.22, 0, Math.sin(k / 16 * 6.283) * 0.16)), 0.012, C.gold); ring.position.y = 0.01; g.add(ring); g.userData.ring = ring; g.userData.noFit = true; floor.add(g); return g; });
    /* ---------- the board ---------- */
    const BX = -1.55, board = P.box(0.9, 0.12, 0.6, '#2F6B4F', { r: 0.04 }); board.position.set(BX, 0.12, -0.35); floor.add(board);
    const chip = P.box(0.3, 0.06, 0.3, '#151827', { r: 0.02 }); chip.position.set(BX, 0.24, -0.35); floor.add(chip);


    const memM = new THREE.MeshLambertMaterial({ color: C.teal }), mem = P.box(0.12, 1, 0.12, C.teal, { r: 0.02, material: memM }); mem.position.set(BX - 0.32, 0.24, -0.5); mem.userData.noFit = true; floor.add(mem);

    /* ---------- the budget wall ---------- */
    const WX = 1.15, WZ = -0.4, WW = 3.8, WH = 1.7;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); floor.add(wall);


    const X0 = WX - WW / 2 + 0.25, XW = WW - 0.5, MSMAX = 120, GZ = WZ + 0.06, BY = 0.12 + 0.95, BH = 0.42;
    const mx = ms => X0 + Math.min(1, ms / MSMAX) * XW;
    const segs = ['grab', 'resize', 'model', 'NMS'].map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: [C.grey, C.teal, C.indigo, C.plum][i] }); const b = P.box(1, BH, 0.03, '#FFFFFF', { r: 0, material: m }); b.userData.noFit = true; b.layers.set(1); floor.add(b);       return { b, n }; });
    const budget = P.box(0.03, 0.75, 0.02, C.red, { r: 0 }); budget.position.set(mx(33), BY - BH - 0.1, GZ + 0.02); floor.add(budget);



    /* ---------- maths ---------- */
    let R = null;
    function compute() {
      const M = MODELS[st.model], sc = (st.res / 416) ** 2, pf = st.prec === 'fp32' ? 2.6 : st.prec === 'fp16' ? 1.5 : 1;
      const parts = [3, 2 + 2 * sc, M.ms * sc * pf, 1.5 + (st.model === 'large' ? 1 : 0)];
      const per = parts.reduce((a, v) => a + v, 0);
      const batchMs = st.batch > 1 ? parts[0] + parts[1] + parts[2] * st.batch * 0.55 + parts[3] : per;
      const latency = st.batch > 1 ? st.batch * 33 + batchMs : per;
      const fps = st.batch > 1 ? Math.min(30, 1000 * st.batch / batchMs) : Math.min(30, 1000 / per);
      let map = M.map * (0.75 + 0.25 * Math.min(1, st.res / 416)) - (st.res < 320 ? 0.08 : 0);
      if (st.prec === 'int8') map -= st.calib ? 0.01 : 0.35;
      const recall = Math.max(0, map * (fps / 30) ** 0.6 * 1.25);
      const mb = M.mb * (st.prec === 'fp32' ? 4 : st.prec === 'fp16' ? 2 : 1);
      return { parts, per, latency, fps, map, recall: Math.min(1, recall), mb };
    }
    function draw() {
      R = compute();
      let x = X0;
      R.parts.forEach((ms, i) => { const w = Math.max(0.005, Math.min(1, ms / MSMAX) * XW), s = segs[i]; s.b.scale.x = w; s.b.position.set(x + w / 2, BY - BH / 2, GZ);     x += w; });
      const h = Math.min(1.2, R.mb / 200); mem.scale.y = Math.max(0.03, h); memM.color.set(R.mb > 256 ? C.red : C.teal);

    }
    draw();
    let clock = 0;
    function update(dt) {
      clock += dt;
      bikes.forEach((b, i) => {
        const u = ((clock * 0.22 + i / bikes.length) % 1), x = -3 + u * 6;
        b.position.set(x, 0.13, 0.55 + (i % 2) * 0.35);
        const seen = ((Math.floor(clock * 30) + i * 7) % 30) / 30 < R.recall;
        b.userData.ring.visible = seen && x > -2 && x < 2.5;
      });
    }
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'buttons', label: 'Model size', options: ['Nano', 'Small', 'Large'], get: () => ['nano', 'small', 'large'].indexOf(st.model), act: i => { st.model = ['nano', 'small', 'large'][i]; draw(); } },
      { type: 'buttons', label: 'Input resolution', options: ['256', '416', '640'], get: () => [256, 416, 640].indexOf(st.res), act: i => { st.res = [256, 416, 640][i]; draw(); } },
      { type: 'buttons', label: 'Number precision', options: ['32-bit float', '16-bit float', '8-bit integer'], get: () => ['fp32', 'fp16', 'int8'].indexOf(st.prec), act: i => { st.prec = ['fp32', 'fp16', 'int8'][i]; draw(); } },
      { type: 'toggle', label: 'Calibrate int8 on real street frames', short: 'calibrate', get: () => st.calib, set: v => { st.calib = v; draw(); } },
      { type: 'buttons', label: 'Frames per batch', options: ['1', '8'], get: () => (st.batch === 1 ? 0 : 1), act: i => { st.batch = i ? 8 : 1; draw(); } },
    ];
    const readouts = [
      { label: 'Frame rate', get: () => ({ v: `${Math.round(R.fps)} fps`, sub: '30 needed', good: R.fps >= 29.5, bad: R.fps < 20 }) },
      { label: 'Bikes caught', get: () => ({ v: pct(R.recall), sub: `accuracy ${pct(R.map)} per frame`, good: R.recall > 0.75, bad: R.recall < 0.55 }) },
      { label: 'Delay', get: () => ({ v: `${Math.round(R.latency)} ms`, sub: 'frame to answer', good: R.latency <= 40, bad: R.latency > 100 }) },
    ];
    const labels = [
      { name: 'street', t: 'A crossing in Kigali', d: 'Gold ring: bike detected', icon: 'eye', atV: V(2.9, 0.2, 0.75) },
      { name: 'board', t: 'The edge board', d: 'Bar: memory the model needs', icon: 'box', atV: V(BX - 0.45, 0.2, -0.35) },
      { name: 'wall', t: 'Where the time goes', d: 'Red line: the 33 ms budget', icon: 'scale', atV: V(WX + WW / 2, 0.12 + WH * 0.6, WZ) },
    ];
    const reset = () => { Object.assign(st, { model: 'small', res: 416, prec: 'int8', calib: true, batch: 1 }); draw(); };
    const breaks = [
      { label: 'Run the large model', hint: 'Best accuracy on paper', on: () => { reset(); st.model = 'large'; draw(); }, off: reset },
      { label: 'Batch 8 frames', hint: 'Better throughput', on: () => { reset(); st.batch = 8; draw(); }, off: reset },
      { label: 'int8 without calibration', hint: 'Guess the number ranges', on: () => { reset(); st.calib = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.prec === 'int8' && !st.calib) return { ok: false, msg: `<b>Accuracy collapsed.</b> Converting to 8-bit integers means squeezing each layer's numbers into 256 steps. Without calibration on real street frames, the ranges are guessed, so big values clip and small ones round to zero: accuracy falls to ${pct(R.map)}. A few hundred representative frames fix it.` };
      if (st.batch > 1) return { ok: false, msg: `<b>Right answers, too late.</b> Batching 8 frames keeps the chip busy, but the first frame waits for seven more before anything runs, so every answer arrives ${Math.round(R.latency)} ms late: a bike has crossed the line before it is counted. Live cameras use a batch of one.` };
      if (R.fps < 29.5) return { ok: false, msg: `<b>Dropping frames.</b> ${R.per.toFixed(0)} ms per frame is over the 33 ms budget, so the board manages only ${Math.round(R.fps)} frames a second and skips the rest. Bikes that cross between processed frames are never seen: ${pct(R.recall)} caught, even though each frame is ${pct(R.map)} accurate. A smaller, faster model catches more.` };
      if (R.map < 0.6) return { ok: false, msg: `<b>Fast but short-sighted.</b> ${R.per.toFixed(0)} ms per frame, but at ${st.res} pixels wide the far bikes are a few pixels across and the model misses them: accuracy ${pct(R.map)}.` };
      return { ok: true, msg: `<b>Keeping up.</b> ${R.per.toFixed(0)} ms per frame fits the 33 ms budget, so every frame is processed (${Math.round(R.fps)} fps), each answer is ready ${Math.round(R.latency)} ms after its frame, and the ${R.mb} MB model catches ${pct(R.recall)} of the bikes.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A camera on a pole', home: true, say: 'A camera at a crossing in Kigali counts motorbike taxis, thirty frames a second, on a small board with no cloud.', act: m => m.set({ model: 'small', res: 416, prec: 'int8', calib: true, batch: 1 }) },
    { t: 'A budget of 33 ms', home: true, say: 'To keep up, everything for one frame must fit in thirty three milliseconds: grabbing it, resizing it, the model, and cleaning up the boxes.', act: m => m.set({}) },
    { t: 'The big model', home: true, say: 'The large model is the most accurate on paper. Here it takes nearly a tenth of a second per frame, so most frames are dropped, and bikes slip past unseen.', act: m => m.set({ model: 'large' }) },
    { t: 'Smaller numbers', home: true, say: 'Storing weights as eight bit integers instead of thirty two bit floats cuts memory by four and runs much faster, if it is calibrated on real frames.', act: m => m.set({ model: 'small', prec: 'int8', calib: false }) },
    { t: 'Batching', home: true, say: 'Batching eight frames keeps the chip busy, but every answer now waits a quarter of a second. For a live camera, that is too late.', act: m => m.set({ calib: true, batch: 8 }) },
    { t: 'The right fit', home: true, say: 'Small model, int8 calibrated, a batch of one: every frame processed in time, and most bikes counted.', act: m => m.set({ batch: 1 }) },
  ],
  check: [
    { q: 'Why does a slow model catch fewer bikes, even if it is more accurate per frame?', options: ['It drops frames, so bikes pass between the frames it processes', 'It uses more colours', 'It has a smaller memory'], answer: 0, why: 'Missing frames means missing events.' },
    { q: 'Why calibrate an int8 model?', options: ['To choose number ranges from real data so values are not clipped or zeroed', 'To make it bigger', 'To add more classes'], answer: 0, why: 'Guessed ranges can wreck accuracy.' },
    { q: 'Why is batching bad for a live camera?', options: ['Each answer waits for the whole batch, adding delay', 'It lowers throughput', 'It uses less memory'], answer: 0, why: 'Throughput goes up, but latency goes up too.' },
  ],
  terms: [
    ['Edge AI', 'Running models on the device itself rather than in the cloud.'],
    ['Latency', 'Time from a frame arriving to its answer being ready.'],
    ['Throughput', 'How many frames are processed per second.'],
    ['Quantization', 'Storing numbers with fewer bits, such as 8-bit integers.'],
    ['Calibration', 'Running real samples to choose quantization ranges.'],
    ['Frame budget', 'The time available per frame, 33 ms at 30 frames a second.'],
  ],
  deeper: '<p><b>Other tricks.</b> Pruning removes weights that barely matter, and distillation trains a small model to copy a large one. Both shrink models with little loss.</p><p><b>Profile first.</b> Grabbing and resizing frames often take longer than people expect; moving them onto the chip\'s own hardware can matter as much as the model.</p><p><b>About this machine.</b> The timings and accuracies are illustrative of a typical small board, not measured.</p>',
  code: {
    title: 'Timing one frame and quantising with calibration',
    note: 'Adapted from the course\'s real-time edge lesson.',
    text: `
import time, torch

def time_frame(model, frame):
    t0 = time.perf_counter()
    x = preprocess(frame)                    # resize, normalise
    with torch.no_grad():
        boxes = model(x)
    keep = nms(boxes)
    return (time.perf_counter() - t0) * 1000   # milliseconds: must stay under 33

# int8: observe real frames to choose the ranges, then convert
model.qconfig = torch.ao.quantization.get_default_qconfig("qnnpack")
prepared = torch.ao.quantization.prepare(model)
for frame in calibration_frames:             # a few hundred real street frames
    prepared(preprocess(frame))
int8_model = torch.ao.quantization.convert(prepared)
`,
  },
};
