// The vLLM production stack (phase 17, lesson 18): a Lagos bank's GPUs fill up, requests get preempted, and long prompts are prefilled again and again. LMCache moves warm KV to CPU memory; a router sends a request to the engine that already holds its prefix.
// Demand is compared with HBM capacity. When KV fits in HBM, offloading only adds overhead. The async path hides the offload cost. All numbers come from the sums below.
const HBM = 100, PER = 2.5;
function run(o) {
  const need = o.users * PER, over = Math.max(0, need - HBM);
  const preempt = Math.round(over / PER);
  const refill = o.off ? Math.round(preempt * 0.1) : preempt;
  const offCost = o.off ? (o.sync ? 12 : 2) : 0;
  const prefixHit = o.router ? 0.6 : 0.2, re = (1 - prefixHit) * 0.3;
  const good = 100 - refill * 1.2 - offCost - re * 40;
  return { need, over, preempt, refill, offCost, prefixHit, good: Math.max(5, good), waste: o.off && !over };
}

export default {
  slug: 'vllm-production-stack-lmcache',
  title: 'The vLLM stack: KV offloading and a smarter router',
  description: 'GPUs are full and the same prompts are computed again and again. Move warm KV to cheap memory, and route to where it already is.',
  overview: 'When concurrency climbs, a vLLM server runs out of GPU memory. Requests get preempted, evicted and requeued, and the same long prompt is prefilled four times in a minute. Raw throughput looks fine, but goodput falls. You can\'t add HBM, but a CPU socket has plenty of cheap memory. LMCache offloads warm KV there, so a preempted request recovers fast, and shares prefixes across engines. A cache-aware router then sends a request to the engine that already has its prefix. Offloading isn\'t free: if your KV fits in HBM, it is only overhead. Newer versions do it asynchronously, to hide that cost. Measure preemption first.',
  keywords: ['vLLM', 'LMCache', 'KV offloading', 'cache-aware routing', 'goodput', 'preemption'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { users: 60, off: true, sync: false, router: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const router = add(P.lamp(SAF, { h: 0.6, r: 0.14 })); router.position.set(-2.2, 0.03, 0);
    const EZ = [-0.45, 0.45], eng = EZ.map(z => { const t = add(P.tank(0.8, 0.9, 0.55, BLUE)); t.position.set(-1.2, 0.08, z); const p = add(P.pipe([V(-2.1, 0.5, 0), V(-1.7, 0.45, z)], SAF, { r: 0.04, n: 3, speed: 0.6 })); return { t, p }; });
    const dram = add(P.shelf(6, { cell: 0.26, d: 0.5, lh: 0.32 })); dram.position.set(0.25, 0.03, 0);
    const down = add(P.pipe([V(-0.78, 0.45, 0), V(-0.55, 0.3, 0)], GOOD, { r: 0.05, n: 3, speed: 0.6 }));
    const T = add(P.tower(0.6, 0.6, GOOD)); T.position.set(1.6, 0.03, 0); T.userData.set({ cap: '' });
    const re = add(P.stack(0.5, 0.5, 0.1, { max: 8, color: BAD })); re.position.set(2.25, 0.03, 0);
    S.add(P.keep(-2.5, 2.6, 1.15, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      eng.forEach(({ t }) => t.userData.set({ level: R.need / HBM * 0.9, color: R.over && !st.off ? BAD : BLUE }));
      eng[1].p.userData.set({ on: true }); eng[0].p.userData.set({ on: st.router });
      dram.visible = st.off; down.userData.set({ on: st.off && R.over > 0 }); down.visible = st.off;
      dram.userData.set({ fill: Array.from({ length: 6 }, (_, i) => i < Math.ceil(R.over / 12) ? GOOD : null) });
      T.userData.set({ h: R.good / 100 * 1.1, color: R.good > 80 ? GOOD : R.good > 55 ? SAF : BAD });
      re.userData.set({ n: Math.min(8, Math.ceil(R.refill / 3)), colors: Array(8).fill(BAD) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Users at once', min: 10, max: 80, step: 1, get: () => st.users, set: v => set({ users: v }) },
      { type: 'toggle', label: 'Offload warm KV to CPU memory', short: 'LMCache', get: () => st.off, set: v => set({ off: !!v }) },
      { type: 'toggle', label: 'Offload blocks the engine', short: 'Sync path', get: () => st.sync, set: v => set({ sync: !!v }) },
      { type: 'toggle', label: 'Cache-aware router', short: 'Router', get: () => st.router, set: v => set({ router: !!v }) },
    ];
    const readouts = [
      { label: 'KV demand', get: () => ({ v: `${Math.round(R.need)}%`, sub: 'of GPU memory', good: R.need <= 100, bad: R.need > 100 }) },
      { label: 'Prompts prefilled again', get: () => ({ v: `${R.refill}`, sub: 'each minute', good: R.refill < 3, bad: R.refill > 10 }) },
      { label: 'Goodput', get: () => ({ v: `${Math.round(R.good)}%`, sub: `of raw throughput, ${Math.round(R.prefixHit * 100)}% prefix hits`, good: R.good > 80, bad: R.good < 55 }) },
    ];
    const labels = [
      { name: 'e', t: 'Engines on GPUs', d: 'Red: over memory', icon: 'box', atV: V(-2.25, 0.75, 0) },
      { name: 'g', t: 'Goodput', d: 'Coral stack: repeat prefills', icon: 'target', atV: V(2.5, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No offload at peak', hint: 'preempt, requeue, repeat', on: () => set({ ...D0, off: false, router: false }), off: reset },
      { label: 'Offload with room to spare', hint: 'KV fits on the GPU', on: () => set({ ...D0, users: 20 }), off: reset },
      { label: 'Blocking offload', hint: 'the older path', on: () => set({ ...D0, sync: true }), off: reset },
      { label: 'Round-robin across engines', hint: 'the prefix is elsewhere', on: () => set({ ...D0, router: false }), off: reset },
    ];
    function status() {
      if (R.over && !st.off) return { ok: false, msg: `<b>${R.preempt} prompts prefilled again every minute.</b> Demand is ${Math.round(R.need)}% of GPU memory, so requests are evicted and start over. The GPU looks busy doing the same work twice. Goodput is ${Math.round(R.good)}%.` };
      if (R.waste) return { ok: false, msg: `<b>KV is ${Math.round(R.need)}% of GPU memory, and it all fits.</b> Offloading adds ${R.offCost}% overhead for nothing. LMCache pays only when KV is larger than HBM. Check preemptions before adding a layer.` };
      if (st.sync) return { ok: false, msg: `<b>${R.offCost}% of the time went on waiting for memory copies.</b> Each offload blocked the engine. The asynchronous path in newer versions hides most of this.` };
      if (!st.router) return { ok: false, msg: `<b>${Math.round(R.prefixHit * 100)}% prefix hits: requests land on engines that don't hold their prefix.</b> The work is done elsewhere and wasted here. Route by prefix, not in turn.` };
      return { ok: true, msg: `<b>Goodput ${Math.round(R.good)}% at ${Math.round(R.need)}% memory demand.</b> Preempted work comes back from CPU memory, and the router finds its prefix ${Math.round(R.prefixHit * 100)}% of the time.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Full GPUs', home: true, say: 'A bank in Lagos hits its peak. GPU memory fills, requests are evicted, and the same long prompts run again.', act: m => m.set({ users: 60, off: false, sync: false, router: false }) },
    { t: 'Raw and good', home: true, say: 'The GPU looks busy, but much of that is repeated work. Goodput is what your users actually get.', act: m => m.set({ users: 70, off: false, sync: false, router: false }) },
    { t: 'Cheap warm memory', home: true, say: 'You can\'t add GPU memory, but CPU memory is plentiful. LMCache keeps warm KV there, so preempted work returns fast.', act: m => m.set({ users: 60, off: true, sync: true, router: false }) },
    { t: 'Don\'t block', home: true, say: 'The asynchronous path moves data without stopping the engine, and the overhead falls.', act: m => m.set({ users: 60, off: true, sync: false, router: false }) },
    { t: 'Route by prefix', home: true, say: 'A cache-aware router sends a request to the engine that already holds its prefix.', act: m => m.set({ users: 60, off: true, sync: false, router: true }) },
    { t: 'Only when it helps', home: true, say: 'If KV fits on the GPU, offloading is just overhead. Measure preemption first.', act: m => m.set({ users: 20, off: true, sync: false, router: true }) },
  ],
  check: [
    { q: 'When does LMCache help most?', options: ['When KV demand exceeds GPU memory', 'When GPUs are half empty', 'When prompts are short'], answer: 0, why: 'Otherwise it is only overhead.', hint: 'Try Offload with room to spare.' },
    { q: 'What is goodput?', options: ['Useful output, not repeated work', 'Tokens per watt', 'Peak speed'], answer: 0, why: 'Repeat prefills count as throughput, not goodput.', hint: 'See Raw and good.' },
    { q: 'What does a cache-aware router do?', options: ['Sends requests to the engine with their prefix', 'Picks the cheapest GPU', 'Takes turns'], answer: 0, why: 'It avoids redoing work held elsewhere.', hint: 'Try Round-robin across engines.' },
  ],
  terms: [
    ['HBM', 'Fast memory on the GPU.'],
    ['Preemption', 'Evicting a request to make room.'],
    ['KV offloading', 'Moving KV cache to slower memory.'],
    ['LMCache', 'A KV cache layer for LLM serving.'],
    ['Goodput', 'Useful output per second.'],
    ['Cache-aware routing', 'Choosing an engine by what it holds.'],
  ],
  deeper: '<p><b>Layers.</b> The stack has a router, engines, KV offload and observability. Each is a separate choice.</p><p><b>Native or LMCache.</b> vLLM can offload to CPU itself. LMCache adds sharing across engines, at the price of another part to run.</p><p><b>Numbers.</b> Percentages here come from simple round sums to show the shape.</p>',
  code: {
    title: 'Turn on offload',
    note: 'A sketch of the connector setting the course describes (code/main.py).',
    text: `
kv_connector = {
    "kv_connector": "LMCacheConnectorV1",
    "kv_role": "kv_both",
}

llm = LLM(model=MODEL, kv_transfer_config=KVTransferConfig(**kv_connector))

def worth_it(metrics):
    return metrics["preemptions_per_min"] > 1 and metrics["kv_usage"] > 0.9
`,
  },
};
