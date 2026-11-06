// DualPipe: a research lab in Nairobi trains a mixture-of-experts model split into a pipeline of P GPUs, with M micro-batches per step.
// Units: forward F = 1, backward B = 2 (of which weight gradient W = 1). Expert all-to-all traffic costs r × compute (r = 0, 1 or 2).
// Idle per GPU follows the DualPipe paper's bubble formulas: 1F1B (P−1)(F+B), Zero Bubble (P−1)(F+B−2W), DualPipe (P/2−1)(F&B+B−3W).
// 1F1B and Zero Bubble wait for the traffic, so every chunk takes (1 + r) as long; DualPipe pairs one micro-batch's forward with another's backward
// and hides the traffic under the computing, up to the computing time (F&B = 3·max(1, r)). Where the idle time falls in each row is schematic.
const PS = [4, 8, 16], MS = [4, 16, 32, 64], RS = [0, 1, 2], NAMES = ['1F1B', 'Zero Bubble', 'DualPipe'];
function run(st) {
  const P = PS[st.p], M = MS[st.m], r = RS[st.r], work = 3 * M;
  let bubble, exposed;
  if (st.s === 0) { bubble = (P - 1) * 3 * (1 + r); exposed = work * r; }
  else if (st.s === 1) { bubble = (P - 1) * 1 * (1 + r); exposed = work * r; }
  else { bubble = (P / 2 - 1) * (3 * Math.max(1, r) - 1); exposed = work * Math.max(0, r - 1); }
  const total = work + exposed + bubble, ref = work + work * r + (P - 1) * 3 * (1 + r);
  return { P, M, r, work, bubble, exposed, total, ref, busy: work / total };
}

export default {
  slug: 'dualpipe-parallelism',
  title: 'DualPipe: fill the gaps from both ends',
  description: 'A lab in Nairobi trains a mixture-of-experts model across a pipeline of GPUs. Blank time is waste, so overlap the traffic with the computing, in both directions.',
  overview: 'Pipeline parallelism splits a model\'s layers across GPUs and streams micro-batches through them. Two things leave GPUs idle. The first is the bubble: at the start of a step later GPUs wait for work, and at the end earlier ones wait for gradients. 1F1B scheduling leaves (P − 1) chunk-times of it per GPU; Zero Bubble shrinks it by splitting the backward pass into the input-gradient part and the weight-gradient part, and doing the weight part in the gaps. The second is communication. In a mixture-of-experts model with experts spread across machines, every layer sends tokens out to their experts and gathers the results back. For DeepSeek-V3 that traffic took about as long as the computing. DualPipe attacks both. It feeds micro-batches in from both ends of the pipeline at once, so each GPU holds two stages (the price: two copies of those weights). In the steady part of a step, each GPU runs one micro-batch\'s forward chunk alongside another\'s backward chunk, splitting each into attention, dispatch, expert and combine pieces, so the network traffic of one hides under the computing of the other. The bubble shrinks to about (P/2 − 1) chunk-times and stops growing with the number of micro-batches. The overlap can only hide traffic up to the computing time, so DeepSeek also limited each token to experts on at most four machines.',
  keywords: ['DualPipe', 'pipeline parallelism', 'pipeline bubble', '1F1B', 'zero bubble', 'all-to-all', 'expert parallelism', 'DeepSeek-V3'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { s: 2, p: 1, m: 2, r: 1 }, st = { ...D0 };
    const ink = '#151827', FC = '#6B5E86', BC = '#E07A5F', CC = '#9A968C', HC = '#1F9E89';
    const hd = P.box(4.2, 0.04, 0.3, '#FFFFFF', { r: 0.03 }); hd.position.set(-0.7, 0.12, -1.17); floor.add(hd);

    /* the schedule: one row per GPU, time runs right */
    const X0 = -2.75, XW = 4.1, Z0 = -0.92, ZD = 1.78;
    const pad = P.box(XW + 0.1, 0.02, ZD + 0.08, '#F6F1E6', { r: 0.02 }); pad.position.set(X0 + XW / 2, 0.12, Z0 + ZD / 2); floor.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const MAXI = 16 * (64 * 3 + 2) + 16;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXI); im.frustumCulled = false; im.userData.noFit = true; im.layers.set(1); floor.add(im);
    const keep = P.box(XW, 0.3, ZD, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(X0 + XW / 2, 0.12, Z0 + ZD / 2); floor.add(keep);
    const endM = new THREE.MeshLambertMaterial({ color: '#C62828' }), endL = P.box(0.02, 0.06, ZD, '#fff', { r: 0, material: endM }); endL.userData.noFit = true; floor.add(endL);

    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); floor.add(rp);

    const gm = new THREE.MeshLambertMaterial({ color: HC }), gauge = P.box(0.4, 1, 0.4, '#fff', { r: 0.03, material: gm }); gauge.position.set(PX, 0.15, -0.5); gauge.userData.noFit = true; floor.add(gauge);



    let R = null;
    const dummy = new THREE.Object3D(), col = new THREE.Color(), pc = v => `${Math.round(v * 100)}%`;
    function draw() {
      R = run(st);
      const k = XW / R.ref, rowD = ZD / R.P, hgt = 0.05;
      let n = 0;
      const put = (x, len, z, d, y, h, c) => { if (len <= 0) return; dummy.position.set(x + len / 2, y, z); dummy.scale.set(Math.max(0.002, len - 0.004), h, d); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); im.setColorAt(n, col.set(c)); n++; };
      for (let i = 0; i < R.P; i++) {
        const z = Z0 + (i + 0.5) * rowD, d = rowD * 0.72, half = (R.P - 1) / 2;
        const frac = st.s === 2 ? 0.5 * Math.min(i, R.P - 1 - i) / Math.max(1, Math.floor(half)) : i / (R.P - 1);
        let x = X0 + R.bubble * frac * k;
        const hide = st.s === 2 ? Math.min(1, R.r) : 0, ex = st.s === 2 ? Math.max(0, R.r - 1) : R.r;
        for (let m = 0; m < R.M; m++) {
          put(x, 1 * k, z, d, 0.13, hgt, FC); x += 1 * k;
          put(x, 2 * k, z, d, 0.13, hgt, BC); x += 2 * k;
          if (hide) put(x - 3 * k, 3 * k * hide, z + d * 0.42, d * 0.16, 0.13, hgt * 1.3, HC);
          if (ex) { put(x, 3 * ex * k, z, d, 0.13, hgt * 0.5, CC); x += 3 * ex * k; }
        }
      }
      for (let j = n; j < MAXI; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.count = MAXI; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      endL.position.set(X0 + R.total * k, 0.12, Z0 + ZD / 2);
      gauge.scale.y = 0.03 + 0.5 * R.busy; gm.color.set(R.busy >= 0.85 ? HC : R.busy >= 0.6 ? '#C9A227' : '#C62828');


    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Schedule', options: NAMES, get: () => st.s, act: i => set({ s: i }) },
      { type: 'buttons', label: 'GPUs in the pipeline', options: PS.map(String), get: () => st.p, act: i => set({ p: i }) },
      { type: 'buttons', label: 'Micro-batches', options: MS.map(String), get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Expert network traffic', options: ['None', 'Equal to compute', 'Twice compute'], get: () => st.r, act: i => set({ r: i }) },
    ];
    const readouts = [
      { label: 'Busy computing', get: () => ({ v: pc(R.busy), sub: 'share of each GPU\'s step', good: R.busy >= 0.85, bad: R.busy < 0.6 }) },
      { label: 'Step time', get: () => ({ v: R.total.toFixed(0), sub: `units; 1F1B ${R.ref.toFixed(0)}` }) },
      { label: 'Weights per GPU', get: () => ({ v: st.s === 2 ? '2×' : '1×', sub: st.s === 2 ? 'two stages each' : 'one stage each' }) },
    ];
    const labels = [
      { name: 'rows', t: 'One row per GPU', d: 'Time runs to the right; blank is idle', icon: 'box', atV: V(-2.82, 0.2, -0.5) },
      { name: 'busy', t: 'Busy computing', d: 'The share of GPU time doing useful work', icon: 'target', atV: V(2.45, 0.2, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Plain 1F1B', hint: 'wait for the network', on: () => set({ ...D0, s: 0 }), off: reset },
      { label: 'Network slower than compute', hint: 'traffic twice the computing', on: () => set({ ...D0, r: 2 }), off: reset },
      { label: 'Too few micro-batches', hint: '4 micro-batches, 16 GPUs', on: () => set({ ...D0, p: 2, m: 0 }), off: reset },
    ];
    function status() {
      const dp = run({ ...st, s: 2 });
      if (st.s < 2) return { ok: st.r === 0 && R.busy >= 0.85 ? undefined : false, msg: `<b>${NAMES[st.s]}: busy ${pc(R.busy)} of the time.</b> ${R.r ? `Every chunk waits for its expert traffic (${R.exposed.toFixed(0)} units of each step), and the waiting stretches the start and end gaps too (${R.bubble.toFixed(0)} units idle per GPU).` : `With no expert traffic only the start and end gaps cost: ${R.bubble.toFixed(0)} units per GPU.`}${st.s === 1 ? ' Splitting the backward pass fills part of the gaps.' : ''} DualPipe here: ${pc(dp.busy)}.` };
      if (R.r === 2) return { ok: false, msg: `<b>Network twice as slow as compute: busy ${pc(R.busy)}.</b> Overlap hides traffic only while there is computing to hide it under; the other half, ${R.exposed.toFixed(0)} units a step, is waited out. DeepSeek also cut the traffic itself: each token goes to experts on at most four machines, and custom kernels move the data.` };
      if (R.M <= R.P) return { ok: false, msg: `<b>${R.M} micro-batches through ${R.P} GPUs: busy ${pc(R.busy)}.</b> The start and end gaps (${R.bubble.toFixed(0)} units per GPU) are fixed by the pipeline length, and ${R.M} micro-batches give only ${R.work} units of work to set against them. Send many more micro-batches than there are GPUs.` };
      return { ok: R.busy >= 0.85, msg: `<b>DualPipe: busy ${pc(R.busy)}, step time ${R.total.toFixed(0)} against ${R.ref.toFixed(0)} for 1F1B.</b> ${R.r ? 'Each GPU runs one micro-batch\'s forward beside another\'s backward, so the expert traffic hides under the computing (teal). ' : ''}Feeding both ends shrinks the gaps to ${R.bubble.toFixed(0)} units, and they stay that size however many micro-batches there are. The price: each GPU keeps two copies of its weights.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A pipeline of GPUs', home: true, say: 'A lab in Nairobi trains a mixture-of-experts model split across eight GPUs in a pipeline. Each GPU holds a slice of the layers and passes its work on. Even with no network traffic, the start and end of each step leave gaps.', act: m => m.set({ s: 0, p: 1, m: 2, r: 0 }) },
    { t: 'Waiting on the network', home: true, say: 'The experts sit on other machines, so every layer sends tokens out and gathers them back. With plain scheduling, each GPU waits for that traffic about as long as it computes.', act: m => m.set({ r: 1 }) },
    { t: 'Zero bubble', home: true, say: 'Splitting the backward pass in two fills most of the start and end gaps. The network wait is still there.', act: m => m.set({ s: 1 }) },
    { t: 'Both ends at once', home: true, say: 'DualPipe feeds micro-batches in from both ends. Each GPU runs one batch forward beside another backward, so the traffic of one hides under the computing of the other.', act: m => m.set({ s: 2 }) },
    { t: 'The price', focus: [1.2, 0.2, 0.2], zoom: 1.35, say: 'The price is two copies of each GPU\'s layers, affordable when the experts are already spread thin across many machines.' },
    { t: 'Enough micro-batches', home: true, say: 'The gaps no longer grow with the number of micro-batches. But send too few, and the gaps are still a large share of every step.', act: m => m.set({ p: 2, m: 0 }) },
  ],
  check: [
    { q: 'How does DualPipe hide the expert network traffic?', options: ['It runs one micro-batch\'s forward beside another\'s backward, so one\'s traffic overlaps the other\'s computing', 'It compresses the tokens', 'It skips the all-to-all on backward'], answer: 0, why: 'Overlapping turns waiting time into computing time.', hint: 'Look at the teal strips.' },
    { q: 'What does feeding micro-batches from both ends cost?', options: ['Each GPU keeps two copies of its stage weights', 'Twice the network traffic', 'Half the micro-batches'], answer: 0, why: 'Each GPU serves a stage near the start and one near the end.', hint: 'Look at Weights per GPU.' },
    { q: 'Why does a slower network still hurt DualPipe?', options: ['Overlap only hides traffic up to the computing time; the rest is waited out', 'DualPipe does not use the network', 'The pipeline gets longer'], answer: 0, why: 'DeepSeek also limited each token to experts on at most four machines.', hint: 'Try Twice compute.' },
  ],
  terms: [
    ['Pipeline parallelism', 'Splitting a model\'s layers across GPUs and streaming micro-batches through them.'],
    ['Bubble', 'Time a GPU in a pipeline sits idle waiting for input or gradients.'],
    ['1F1B', 'A schedule that alternates one forward and one backward chunk per GPU once the pipeline is full.'],
    ['Zero Bubble', 'Splits the backward pass into input and weight gradients and uses the weight part to fill gaps.'],
    ['All-to-all', 'Every GPU sending tokens to every other: how a mixture of experts reaches experts on other machines.'],
    ['DualPipe', 'DeepSeek\'s schedule that feeds both ends of the pipeline and overlaps computing with expert traffic.'],
  ],
  deeper: '<p><b>Inside one pair of chunks.</b> DualPipe splits a forward chunk and a backward chunk into attention, dispatch (send tokens to experts), expert computing and combine (gather them back), and interleaves them so each piece of traffic runs while the other chunk computes. A few streaming processors on each GPU are set aside to drive the network.</p><p><b>Memory.</b> Two copies of the stage weights, and activations for one more micro-batch than 1F1B. With expert parallelism over many GPUs, the per-GPU share of weights is small enough to afford it.</p><p><b>DualPipeV.</b> A later variant folds the same schedule into a V shape, so it needs no duplicate weights, at the cost of a little more idle time.</p><p><b>About this machine.</b> Totals per GPU come from the bubble formulas in DeepSeek\'s DualPipe release, with forward = 1, backward = 2 and its weight part = 1; where the idle time falls inside each row is drawn schematically.</p>',
  code: {
    title: 'Idle time per GPU, three schedules',
    note: 'Adapted from the course\'s DualPipe lesson; formulas from DeepSeek\'s DualPipe release.',
    text: `
F, B, W = 1, 2, 1      # forward, backward, weight-gradient part

def bubble_1f1b(P):          return (P - 1) * (F + B)
def bubble_zero_bubble(P):   return (P - 1) * (F + B - 2 * W)
def bubble_dualpipe(P, FB):  return (P // 2 - 1) * (FB + B - 3 * W)

P, M = 8, 32
work = M * (F + B)
for name, b in [("1F1B", bubble_1f1b(P)),
                ("Zero Bubble", bubble_zero_bubble(P)),
                ("DualPipe", bubble_dualpipe(P, F + B))]:
    print(f"{name:12} busy {work / (work + b):.0%}")
`,
  },
};
