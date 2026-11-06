// Collective operations (phase 19, lesson 76): data-parallel training must sum every GPU's gradients and give each GPU the result. Ring
// all-reduce splits the gradient into N chunks; a reduce-scatter pass of N-1 steps leaves each GPU owning one fully summed chunk, and an
// all-gather pass of N-1 steps passes the finished chunks round, so each GPU sends 2T(N-1)/N bytes whatever N is. Gathering to one GPU
// makes that GPU send and receive 2T(N-1). The chunk states are simulated exactly; times use a simple latency-plus-bandwidth model with
// illustrative numbers (200 MB of gradients in 400 tensors, 25 GB/s links, 30 microseconds per message, a 120 ms backward pass).
const T_MB = 200, TENSORS = 400, BUCKET_MB = 25, LINK = 25, ALPHA = 0.03, FWD = 60, BWD = 120;
function chunks(n, alg, frac) {
  const cnt = Array.from({ length: n }, () => Array(n).fill(1));
  if (alg === 'star') {
    if (frac >= 0.5) for (let c = 0; c < n; c++) cnt[0][c] = n;
    if (frac >= 1) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cnt[r][c] = n;
    return { cnt, steps: 2, done: frac >= 1 ? 2 : frac >= 0.5 ? 1 : 0 };
  }
  const total = 2 * (n - 1), done = Math.round(frac * total);
  for (let s = 0; s < done; s++) {
    const prev = cnt.map(r => r.slice());
    for (let r = 0; r < n; r++) {
      const to = (r + 1) % n;
      if (s < n - 1) { const idx = ((r - s) % n + n) % n; cnt[to][idx] = prev[to][idx] + prev[r][idx]; }
      else { const k = s - (n - 1), idx = ((r + 1 - k) % n + n) % n; cnt[to][idx] = prev[r][idx]; }
    }
  }
  return { cnt, steps: total, done };
}
function timing(o) {
  const n = o.n, msgs = o.bucket ? Math.ceil(T_MB / BUCKET_MB) : TENSORS;
  const bw = o.alg === 'ring' ? 2 * (n - 1) / n * T_MB / LINK : 2 * (n - 1) * T_MB / LINK;
  const lat = (o.alg === 'ring' ? 2 * (n - 1) : 2 * (n - 1)) * ALPHA * msgs;
  const comm = bw + lat;
  const visible = o.overlap ? Math.max(comm * 0.12, comm - 0.8 * BWD) : comm;
  const perGpu = o.alg === 'ring' ? 2 * (n - 1) / n * T_MB : 2 * (n - 1) * T_MB;
  return { comm, visible, step: FWD + BWD + visible, perGpu, msgs, ideal: FWD + BWD };
}

export default {
  slug: 'ring-all-reduce',
  title: 'Ring all-reduce: summing gradients across GPUs',
  description: 'Eight GPUs each hold their own gradients, and every one needs the sum. Step the chunks around the ring, and see why no single GPU has to carry it all.',
  overview: 'Data-parallel training gives every GPU a copy of the model and a different slice of the batch. After the backward pass each GPU holds its own gradients, and before the optimizer step every GPU needs their sum. That operation is all-reduce, one of four collective operations, with broadcast, all-gather and reduce-scatter, that underlie every distributed training framework. The naive way sends everything to one GPU, sums it and broadcasts the result, so that GPU moves 2T(N minus 1) bytes for a gradient of size T across N GPUs and becomes the bottleneck. Ring all-reduce, used by NCCL and Horovod, arranges the GPUs in a ring and splits the gradient into N chunks. In the reduce-scatter pass, for N minus 1 steps, each GPU sends one chunk to its neighbour and adds the chunk it receives; afterwards each GPU owns one fully summed chunk. In the all-gather pass, another N minus 1 steps pass the finished chunks round until every GPU has all of them. Each GPU sends only 2T(N minus 1)/N bytes, which barely grows with N, so the time is set by bandwidth, at the cost of 2(N minus 1) message latencies; tree algorithms take fewer steps and suit small messages. ZeRO and FSDP reuse the two halves directly: reduce-scatter to shard gradients and all-gather to rebuild weights. Two production habits matter as much as the algorithm. Frameworks bucket the many small gradient tensors into chunks of about 25 MB, since a separate all-reduce per tensor pays the latency hundreds of times. And they start each bucket\'s all-reduce as soon as its gradients are ready, overlapping communication with the rest of the backward pass. Implementations are checked against a reference library before they are trusted. This machine follows an invented university cluster in Johannesburg; the times are illustrative.',
  keywords: ['all-reduce', 'ring all-reduce', 'NCCL', 'data parallel', 'reduce-scatter', 'all-gather', 'gradient bucketing'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.2, -0.2], dir: [0.05, 1.05, 1.05], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { n: 8, alg: 'ring', frac: 1, bucket: true, overlap: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const CX = -0.9, CZ = -0.2, RX = 1.45, RZ = 0.62;
    let parts = [];
    /* step time: the part spent talking, on top of the compute */
    const comp = P.tower(0.34, 0.34, '#5B8DB8', { h: 0.5 }), talk = P.tower(0.34, 0.34, SAF, { h: 0.3 }); [comp, talk].forEach(t => t.userData.set({ cap: '' })); comp.position.set(1.2, 0, -0.2); talk.position.set(1.65, 0, -0.2); S.add(comp, talk);
    const safe = P.lamp(GOOD, { h: 0.2, r: 0.1 }); safe.position.set(1.42, 0, 0.3); S.add(safe);
    S.add(P.keep(-2.65, 2.0, 0.85, -1.05, 0.65));
    const pale = new THREE.Color('#F1ECE1'), full = new THREE.Color(GOOD);

    let R = null, Tm = null;
    function draw() {
      R = chunks(st.n, st.alg, st.frac); Tm = timing(st);
      parts.forEach(p => p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; S.add(o); parts.push(o); return o; };
      const pos = r => { const a = -Math.PI / 2 + r * 2 * Math.PI / st.n; return V(CX + RX * Math.cos(a), 0, CZ + RZ * Math.sin(a)); };
      const gw = 0.66, cw = (gw - 0.06) / st.n;
      for (let r = 0; r < st.n; r++) {
        const p = pos(r);
        const g = add(P.box(gw, 0.08, 0.3, CHAR, { r: 0.04 })); g.position.copy(p);
        for (let c = 0; c < st.n; c++) {
          const v = R.cnt[r][c] / st.n, col = pale.clone().lerp(full, v);
          const t = add(P.box(cw - 0.012, 0.03, 0.1, '#fff', { r: 0.008, material: new THREE.MeshLambertMaterial({ color: col }) }));
          t.position.set(p.x - gw / 2 + 0.03 + cw * (c + 0.5), 0.08, p.z + 0.03);
        }
        const to = st.alg === 'ring' ? pos((r + 1) % st.n) : pos(0);
        if (st.alg === 'ring' || r > 0) {
          const a = p.clone().setY(0.1), b = to.clone().setY(0.1), d = b.clone().sub(a), L = d.length();
          d.normalize();
          add(P.arrow(a.clone().addScaledVector(d, 0.36), a.clone().addScaledVector(d, Math.max(0.4, L - 0.36)), 0.012, st.alg === 'ring' ? SAF : RED));
        }
      }
      const ok = isOk();
      comp.userData.set({ h: Tm.ideal * 0.0035 });
      talk.userData.set({ h: Math.min(0.9, Tm.visible * 0.0035), color: Tm.visible > 100 ? RED : SAF });
      safe.userData.set({ color: ok ? GOOD : RED, on: true });
    }
    function isOk() { return st.alg === 'ring' && st.bucket && st.overlap; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'GPUs', min: 2, max: 8, step: 1, get: () => st.n, set: v => set({ n: +v }), fmt: v => `${v}` },
      { type: 'slider', label: 'Progress through the all-reduce', min: 0, max: 1, step: 0.05, get: () => st.frac, set: v => set({ frac: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Bucket gradients into 25 MB chunks', short: 'Bucket', get: () => st.bucket, set: v => set({ bucket: !!v }) },
      { type: 'toggle', label: 'Overlap with the backward pass', short: 'Overlap', get: () => st.overlap, set: v => set({ overlap: !!v }) },
      { type: 'buttons', label: 'Algorithm', options: ['Ring', 'Gather to one GPU'], get: () => st.alg === 'ring' ? 0 : 1, act: i => set({ alg: i ? 'star' : 'ring' }) },
    ];
    const readouts = [
      { label: 'Per GPU', get: () => ({ v: `${Math.round(Tm.perGpu)} MB`, sub: 'sent each step', good: st.alg === 'ring', bad: st.alg !== 'ring' }) },
      { label: 'Comms visible', get: () => ({ v: `${Tm.visible.toFixed(0)} ms`, sub: 'added to the step', good: Tm.visible < 20, bad: Tm.visible >= 40 }) },
      { label: 'Step time', get: () => ({ v: `${Tm.step.toFixed(0)} ms`, sub: `compute ${Tm.ideal} ms`, good: Tm.step < Tm.ideal * 1.12, bad: Tm.step > Tm.ideal * 1.3 }) },
    ];
    const labels = [
      { name: 'r', t: 'A ring of GPUs', d: 'Chunks darken as sums arrive', icon: 'link', atV: V(-2.5, 0.1, -0.2) },
      { name: 't', t: 'Traffic and time', d: 'Compute, then the talk on top', icon: 'chart', atV: V(1.82, 0.3, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Gather everything to one GPU', hint: 'a bottleneck', on: () => set({ ...D0, alg: 'star' }), off: reset },
      { label: 'One all-reduce per tensor', hint: 'latency × 400', on: () => set({ ...D0, bucket: false }), off: reset },
      { label: 'Wait for backward to finish', hint: 'no overlap', on: () => set({ ...D0, overlap: false }), off: reset },
    ];
    function status() {
      const t = Tm;
      if (st.alg !== 'ring') return { ok: false, msg: `<b>Gathering to GPU 0 makes it receive and send ${Math.round(t.perGpu)} MB every step, so the sum takes ${t.comm.toFixed(0)} ms and the step ${t.step.toFixed(0)} ms.</b> In a ring each GPU sends only ${Math.round(2 * (st.n - 1) / st.n * T_MB)} MB, nearly the same whatever the number of GPUs.` };
      if (!st.bucket) return { ok: false, msg: `<b>One all-reduce per tensor means ${TENSORS} separate rings of ${2 * (st.n - 1)} messages each: latency alone adds about ${(2 * (st.n - 1) * ALPHA * TENSORS).toFixed(0)} ms, and the step takes ${t.step.toFixed(0)} ms.</b> Bucket small tensors into 25 MB chunks so they share messages.` };
      if (!st.overlap) return { ok: false, msg: `<b>Waiting for the whole backward pass before summing adds all ${t.comm.toFixed(0)} ms of communication to the step: ${t.step.toFixed(0)} ms against ${t.ideal} ms of compute.</b> Start each bucket's all-reduce as soon as its gradients are ready.` };
      return { ok: true, msg: `<b>Ring all-reduce over ${st.n} GPUs: each sends ${Math.round(t.perGpu)} MB in ${R.steps} steps, bucketed into ${t.msgs} chunks and overlapped with backward, so only ${t.visible.toFixed(0)} ms shows: a ${t.step.toFixed(0)} ms step against ${t.ideal} ms of compute.</b> ${st.frac < 1 ? 'Slide progress to 100% to see every GPU finish with the full sum.' : 'Every GPU ends with the same summed gradients.'}` };
    }
    return { update: dt => { comp.userData.tick(dt); talk.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Eight sets of gradients', home: true, say: 'Eight GPUs each computed gradients on their own slice of the batch. Every one needs the sum.', act: m => m.set({ n: 8, alg: 'ring', frac: 0, bucket: true, overlap: true }) },
    { t: 'Reduce-scatter', home: true, say: 'Split the gradients into eight chunks. Each GPU passes one chunk to its neighbour and adds the one it receives.', act: m => m.set({ n: 8, alg: 'ring', frac: 0.3, bucket: true, overlap: true }) },
    { t: 'One chunk each', home: true, say: 'After seven steps, each GPU owns one fully summed chunk.', act: m => m.set({ n: 8, alg: 'ring', frac: 0.5, bucket: true, overlap: true }) },
    { t: 'All-gather', home: true, say: 'Seven more steps pass the finished chunks round. Now every GPU has the full sum.', act: m => m.set({ n: 8, alg: 'ring', frac: 1, bucket: true, overlap: true }) },
    { t: 'The bottleneck', home: true, say: 'Gather everything to one GPU instead, and that GPU moves seven times the gradients each step.', act: m => m.set({ n: 8, alg: 'star', frac: 1, bucket: true, overlap: true }) },
    { t: 'Bucket and overlap', home: true, say: 'Bucket small tensors together and start summing during backward. The communication almost disappears.', act: m => m.set({ n: 8, alg: 'ring', frac: 1, bucket: true, overlap: true }) },
  ],
  check: [
    { q: 'How much does each GPU send in ring all-reduce?', options: ['About 2T(N−1)/N, nearly flat in N', 'T times N', 'Nothing'], answer: 0, why: 'Bandwidth-optimal.', hint: 'Change the GPU count.' },
    { q: 'What does the reduce-scatter pass leave behind?', options: ['Each GPU owning one fully summed chunk', 'Every GPU with the full sum', 'Nothing summed'], answer: 0, why: 'All-gather finishes the job.', hint: 'Slide progress to 50%.' },
    { q: 'Why bucket gradients?', options: ['To avoid paying message latency hundreds of times', 'To save memory', 'To compress'], answer: 0, why: 'Hundreds of tiny tensors.', hint: 'Try One all-reduce per tensor.' },
  ],
  terms: [
    ['All-reduce', 'Sum values across all GPUs and give every GPU the result.'],
    ['Reduce-scatter', 'Sum across GPUs, leaving each GPU one part of the result.'],
    ['All-gather', 'Collect every GPU\'s part onto every GPU.'],
    ['Ring', 'GPUs arranged so each sends only to its neighbour.'],
    ['Bucketing', 'Grouping small gradient tensors into larger messages.'],
    ['Overlap', 'Communicating while the backward pass is still computing.'],
  ],
  deeper: '<p><b>Trees and topology.</b> Tree all-reduce takes about 2 log N steps and wins for small messages or slow links; NCCL picks by message size and hardware.</p><p><b>Verify.</b> Check a hand-written collective against a reference backend on the same inputs before using it in a run.</p><p><b>About this machine.</b> The cluster and timing numbers are invented for illustration.</p>',
  code: {
    title: 'Ring all-reduce in two passes',
    note: 'Written for this lesson.',
    text: `
def ring_allreduce(rank, world, chunks, send, recv):
    # chunks: this rank's tensor split into world equal parts
    for s in range(world - 1):                      # reduce-scatter
        send((rank + 1) % world, chunks[(rank - s) % world])
        i = (rank - s - 1) % world
        chunks[i] = chunks[i] + recv((rank - 1) % world)
    for s in range(world - 1):                      # all-gather
        send((rank + 1) % world, chunks[(rank + 1 - s) % world])
        i = (rank - s) % world
        chunks[i] = recv((rank - 1) % world)
    return chunks                                   # every rank holds the full sum
`,
  },
};
