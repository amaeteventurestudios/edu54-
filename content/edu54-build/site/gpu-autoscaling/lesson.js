// GPU autoscaling on Kubernetes (phase 17, lesson 3): an Addis Ababa telecom serves a model on a GPU cluster through a day of traffic. Three layers
// decide what happens: the application signal that scales replicas (GPU duty cycle, which reads busy at any load, or queue depth), node
// provisioning speed for a burst at 02:00 (about 105 s or about 50 s against a 60 s timeout), gang scheduling for an 8-GPU job when only 7 GPUs are
// free, and the consolidation policy that may evict a running job. Replicas, slow hours, idle GPU hours and incidents are computed live.
const LOAD = Array.from({ length: 24 }, (_, h) => Math.round(20 + 90 * Math.exp(-(((h - 13) / 3.5) ** 2)) + 25 * Math.exp(-(((h - 20) / 1.5) ** 2))));
const PER = 25;
function day(o) {
  const need = LOAD.map(l => Math.ceil(l / PER));
  const reps = o.signal === 'queue' ? need : LOAD.map(() => 3);
  const slow = reps.filter((r, h) => r * PER < LOAD[h]).length;
  const idle = reps.reduce((s, r, h) => s + Math.max(0, r - LOAD[h] / PER), 0);
  const gpuHours = reps.reduce((a, b) => a + b, 0);
  const burstOk = (o.karpenter ? 50 : 105) <= 60;
  const partial = o.gang ? 0 : 7 * 4;
  const evicted = !o.safe;
  return { need, reps, slow, idle, gpuHours, burstOk, partial, evicted };
}

export default {
  slug: 'gpu-autoscaling',
  title: 'GPU autoscaling: three layers, three traps',
  description: 'A telecom in Addis Ababa serves a model on a GPU cluster through a daily peak. Scale on the right signal, get nodes in time, and start big jobs whole.',
  overview: 'GPU autoscaling for model serving is not "turn on the pod autoscaler". It composes three layers, each with its own trap. At the application layer, the obvious signal is wrong. GPU utilisation from NVIDIA\'s DCGM is a duty-cycle measure: whether the GPU did any work in each sample. With continuous batching it reads near 100% whether ten requests are in flight or a hundred, so scaling on it can\'t tell when you need more replicas. Memory is no better: engines like vLLM pre-allocate the KV cache, so memory sits near 90% even with one request, and memory-based scaling never scales down. Better signals are the queue of requests waiting for prefill, KV-cache utilisation by active sequences, per-replica tail time to first token, and goodput, the requests meeting every target. Tools such as NVIDIA Dynamo\'s planner and llm-d\'s autoscaler scale on these. At the node layer, Karpenter provisions GPU nodes for pending pods in about a minute, choosing instance types to fit, against roughly two minutes for the older Cluster Autoscaler, which can be the difference for a burst with a tight timeout. Its consolidation policy WhenEmptyOrUnderutilized will terminate a busy GPU node to repack pods more cheaply, evicting running jobs; for GPU pools use WhenEmpty with a delay. At the scheduling layer, the default scheduler places pods one at a time, so a job needing eight GPUs can start seven, which then sit idle waiting for the eighth. Gang scheduling (for example NVIDIA\'s KAI Scheduler) starts all or none, respects NVLink topology and enforces team queues and priorities.',
  keywords: ['autoscaling', 'Kubernetes', 'GPUs', 'Karpenter', 'gang scheduling', 'vLLM', 'MLOps'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { signal: 'queue', karpenter: true, gang: true, safe: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* a day of 24 hours: blue towers for what is needed, teal behind them for replicas running, red when short */
    const HX = h => -1.9 + h * 0.165, HS = 0.13;
    const cols = LOAD.map((l, h) => {
      const need = P.tower(0.12, 0.12, BLUE, { h: l / PER * HS }); need.userData.set({ cap: '' }); need.position.set(HX(h), 0, -0.45); S.add(need);
      const rep = P.tower(0.12, 0.12, GOOD, { h: 0.3 }); rep.userData.set({ cap: '' }); rep.position.set(HX(h), 0, -0.65); S.add(rep);
      return { rep };
    });
    /* eight GPUs that must start together: the eighth lags without gang scheduling */
    const gpus = Array.from({ length: 8 }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.16, 0.14, 0.2, '#fff', { r: 0.02, material: m }); b.position.set(-1.9 + i * 0.2, 0, 0.3); S.add(b); return m; });
    /* a node arriving in time for the burst, and the night batch job */
    const node = P.lamp(GOOD, { h: 0.18, r: 0.1 }); node.position.set(0.0, 0, 0.3); S.add(node);
    const jobM = new THREE.MeshLambertMaterial({ color: GOOD }), job = P.box(0.5, 0.2, 0.34, '#fff', { r: 0.04, material: jobM }); job.position.set(0.6, 0, 0.3); S.add(job);
    S.add(P.keep(-2.1, 2.1, 1.0, -0.85, 0.55));
    const parts = cols.map(c => c.rep);

    let R = null;
    function draw() {
      R = day(st);
      R.reps.forEach((r, h) => cols[h].rep.userData.set({ h: r * HS, color: r * PER < LOAD[h] ? BAD : GOOD }));
      gpus.forEach((m, i) => m.color.set(st.gang ? GOOD : i < 7 ? SAF : OFF));
      node.userData.set({ color: R.burstOk ? GOOD : BAD, on: true });
      jobM.color.set(R.evicted ? BAD : GOOD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Fast node provisioning (Karpenter)', short: 'Fast nodes', get: () => st.karpenter, set: v => set({ karpenter: !!v }) },
      { type: 'toggle', label: 'Gang scheduling: all GPUs of a job or none', short: 'Gang', get: () => st.gang, set: v => set({ gang: !!v }) },
      { type: 'toggle', label: 'Consolidate only empty nodes', short: 'Safe consolidation', get: () => st.safe, set: v => set({ safe: !!v }) },
      { type: 'buttons', label: 'Scale replicas on', options: ['Queue depth', 'GPU utilisation'], get: () => st.signal === 'queue' ? 0 : 1, act: i => set({ signal: i ? 'util' : 'queue' }) },
    ];
    const readouts = [
      { label: 'Hours short', get: () => ({ v: String(R.slow), sub: 'of capacity', good: !R.slow, bad: R.slow > 0 }) },
      { label: 'Idle GPU-hours', get: () => ({ v: String(Math.round(R.idle)), sub: 'paid, unused', good: R.idle < 10, bad: R.idle > 10 }) },
      { label: 'Incidents', get: () => { const n = [!R.burstOk, R.partial > 0, R.evicted].filter(Boolean).length; return { v: String(n), sub: 'burst, gang, eviction', good: !n, bad: n > 0 }; } },
    ];
    const labels = [
      { name: 'day', t: 'A day of traffic', d: 'Blue: needed. Red: too few replicas', icon: 'chart', atV: V(2.0, 0.2, -0.45) },
      { name: 'lay', t: 'Eight GPUs', d: 'Gold: holding, waiting for the last', icon: 'target', atV: V(-2.0, 0.1, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Scale on GPU utilisation', hint: 'duty cycle', on: () => set({ ...D0, signal: 'util' }), off: reset },
      { label: 'Provision nodes slowly, no gang', hint: 'older autoscaler', on: () => set({ ...D0, karpenter: false, gang: false }), off: reset },
      { label: 'Consolidate busy nodes', hint: 'WhenEmptyOrUnderutilized', on: () => set({ ...D0, safe: false }), off: reset },
    ];
    function status() {
      if (st.signal === 'util') return { ok: false, msg: `<b>GPU utilisation reads close to 100% at any load, so the autoscaler sees "full" all day and replicas stay at 3: ${R.slow} hours short of capacity at the midday peak and ${Math.round(R.idle)} idle GPU-hours overnight.</b> Scale on what the traffic does: the queue waiting for prefill, KV-cache use, tail time to first token.` };
      if (!st.karpenter || !st.gang) return { ok: false, msg: `<b>${!st.karpenter ? 'New GPU nodes take about 105 seconds, so the 02:00 burst times out at 60.' : ''}${!st.karpenter && !st.gang ? ' ' : ''}${!st.gang ? 'The eight-GPU job started seven pods, which held their GPUs idle for four minutes waiting for the eighth.' : ''}</b> Fast provisioning that picks instance types to fit, and gang scheduling that starts all or none.` };
      if (!st.safe) return { ok: false, msg: '<b>The consolidation policy repacked a busy GPU node onto a cheaper instance and evicted the six-hour batch job running on it.</b> For GPU pools, consolidate only empty nodes, after a delay, so a running job is never terminated to save money.' };
      return { ok: true, msg: `<b>Replicas follow the queue, from ${Math.max(...R.need)} at the peak to 1 at night, never short; new nodes arrive in time for the 02:00 burst; the eight-GPU job starts all at once; only empty nodes are reclaimed.</b> ${R.gpuHours} GPU-hours for the day, with ${Math.round(R.idle)} idle.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A day of traffic', home: true, say: 'A telecom in Addis Ababa serves a model on a GPU cluster. Traffic peaks at midday and again in the evening.', act: m => m.set({ signal: 'queue', karpenter: true, gang: true, safe: true }) },
    { t: 'The wrong signal', home: true, say: 'GPU utilisation reads busy at any load. Scale on it, and replicas never move: short at noon, idle at night.', act: m => m.set({ signal: 'util', karpenter: true, gang: true, safe: true }) },
    { t: 'Scale on the queue', home: true, say: 'Scale on the requests waiting, and replicas follow the traffic up and down.', act: m => m.set({ signal: 'queue', karpenter: true, gang: true, safe: true }) },
    { t: 'Nodes in time', home: true, say: 'A burst at two in the morning needs a new node within a minute. A slow autoscaler misses it.', act: m => m.set({ signal: 'queue', karpenter: false, gang: true, safe: true }) },
    { t: 'All or nothing', home: true, say: 'An eight-GPU job with seven free: without gang scheduling, seven sit idle waiting for the eighth.', act: m => m.set({ signal: 'queue', karpenter: true, gang: false, safe: true }) },
    { t: 'Don\'t evict to save money', home: true, say: 'Reclaim only empty nodes. An eager policy terminates a running job to repack it more cheaply.', act: m => m.set({ signal: 'queue', karpenter: true, gang: true, safe: false }) },
  ],
  check: [
    { q: 'Why is GPU utilisation a poor scaling signal for model serving?', options: ['It reads near 100% at any load', 'It is too slow to read', 'It measures memory'], answer: 0, why: 'Duty cycle can\'t tell 10 requests from 100.', hint: 'Try Scale on GPU utilisation.' },
    { q: 'What does gang scheduling prevent?', options: ['Seven of eight GPUs held idle waiting for the last', 'Slow nodes', 'Evictions'], answer: 0, why: 'All or none.', hint: 'Turn off Gang.' },
    { q: 'Which consolidation setting is safe for GPU pools?', options: ['Only empty nodes, after a delay', 'Repack busy nodes', 'Never consolidate'], answer: 0, why: 'Don\'t evict running jobs.', hint: 'Try Consolidate busy nodes.' },
  ],
  terms: [
    ['Duty cycle', 'Whether the GPU was busy in each sample, not how much work.'],
    ['Queue depth', 'Requests waiting for prefill; a good scaling signal.'],
    ['Karpenter', 'A node provisioner that picks instances to fit pending pods.'],
    ['Gang scheduling', 'Start every pod of a job together, or none.'],
    ['Consolidation', 'Reclaiming nodes to save money.'],
    ['Goodput', 'Requests per second that meet every target.'],
  ],
  deeper: '<p><b>Topology.</b> Tensor-parallel jobs must stay inside one NVLink domain; a topology-aware scheduler knows which GPUs share fast links.</p><p><b>Queues and priorities.</b> Teams sharing a GPU pool need quotas and preemption rules, so a training job only displaces production when policy allows.</p><p><b>About this machine.</b> The traffic curve, provisioning times and the two jobs are illustrative; replicas, shortfalls and incidents are computed live.</p>',
  code: {
    title: 'Scale on the queue',
    note: 'Written for this lesson; the YAML follows Karpenter\'s documented settings.',
    text: `
def desired_replicas(queue_depth, per_replica_capacity, current, min_r=1, max_r=12):
    want = math.ceil(queue_depth / per_replica_capacity)
    return max(min_r, min(max_r, want))           # not GPU duty cycle

# Karpenter NodePool for GPUs: never evict a running job to save money
# disruption:
#   consolidationPolicy: WhenEmpty
#   consolidateAfter: 1h

# Pod group for an 8-GPU job: schedule all members together, or none
# metadata.annotations: { scheduling.k8s.io/group-name: "llm-70b", minMember: "8" }
`,
  },
};
