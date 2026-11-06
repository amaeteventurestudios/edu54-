// Disaggregated prefill and decode (phase 17, lesson 17): a Nairobi legal-research service runs a 70B model on eight GPUs. Prefill (reading the
// prompt) is compute-bound; decode (writing tokens) is memory-bound. Colocated, long prefills stall decode streams and each phase leaves the
// other's resource idle. Split into a prefill pool and a decode pool, with the KV cache sent between them over a fast link or ordinary TCP.
// The prompt and answer lengths, the split and the link are set; time to first token, stalls, throughput and waste are computed live.
function serve(o) {
  const pre = o.prompt / 2000 * 0.12, kvMs = o.link === 'rdma' ? 20 + o.prompt / 4000 * 15 : 80 + o.prompt / 4000 * 90;
  const tpotBase = 9;
  if (!o.split) {
    const stall = Math.min(3, o.prompt / 8000) * 2.2;
    const tpot = tpotBase * (1 + stall * 0.6);
    const ttft = pre * (1 + 0.5 * Math.min(1, o.prompt / 16000)) + 0.05;
    const waste = 0.15 + 0.25 * Math.min(1, Math.abs(Math.log(o.prompt / 800 / (o.out / 400)) / 3));
    return { ttft, tpot, waste, thr: 1 - waste, kvMs: 0 };
  }
  const tpot = tpotBase * 1.02, ttft = pre + kvMs / 1000 + 0.05;
  const waste = 0.08;
  return { ttft, tpot, waste, thr: 1 - waste - (o.link === 'tcp' ? 0.04 : 0), kvMs };
}

export default {
  slug: 'disaggregated-prefill-decode',
  title: 'Disaggregated serving: split prefill from decode',
  description: 'A legal-research service in Nairobi runs a large model on eight GPUs. Reading a long case and writing the answer want different things, so split the pool.',
  overview: 'Serving a model has two phases with different bottlenecks. Prefill runs the transformer over the whole prompt in one pass: big matrix multiplications, so it is compute-bound and batches well. Decode writes one token at a time and reads every weight each step, so it is memory-bandwidth-bound and efficient only at high concurrency. Colocated on the same GPUs, they interfere: a long prefill holds the GPU while other requests\' decode steps wait, so their streams stutter; and each phase leaves the other\'s resource underused, wasting a fifth to two fifths of GPU time on mixed workloads. Chunked prefill eases the interference inside one engine. Disaggregation goes further: a prefill pool sized for compute, a decode pool sized for memory bandwidth (or more heavily quantised), and the KV cache transferred from one to the other. NVIDIA\'s Dynamo and the Kubernetes-native llm-d both work this way, with a router in front and NIXL moving the cache over RDMA or InfiniBand, falling back to TCP. The transfer is real: tens of milliseconds for a few thousand tokens of a 70B model over a fast link, much more over TCP. So disaggregation pays when prompts are long and decode streams are sensitive to stalls, as with long documents and agents; it doesn\'t pay for short prompts and short answers, where the transfer costs more than the interference it removes. Measure your mix of prompt and answer lengths before splitting, and keep the pools\' sizes in proportion to it.',
  keywords: ['disaggregated serving', 'prefill', 'decode', 'NVIDIA Dynamo', 'llm-d', 'KV cache transfer', 'inference serving'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.05], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { prompt: 16000, out: 300, split: true, link: 'rdma' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* eight GPUs, each with a gold compute bar and a blue memory bar */
    const gpus = Array.from({ length: 8 }, (_, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#E4DED2' }), b = P.box(0.38, 0.14, 0.5, '#fff', { r: 0.03, material: m }); S.add(b);
      const cb = P.tower(0.16, 0.16, SAF, { h: 0.3 }), mb = P.tower(0.16, 0.16, BLUE, { h: 0.3 }); [cb, mb].forEach(t => t.userData.set({ cap: '' })); S.add(cb, mb);
      return { m, b, cb, mb };
    });
    /* the link that carries the KV cache between the two pools */
    const linkM = new THREE.MeshLambertMaterial({ color: GOOD }), link = P.rod(V(0, 0.2, -0.75), V(0.1, 0.2, -0.75), 0.03, '#fff', { material: linkM }); S.add(link);
    /* per request: first token, time per token, wasted capacity */
    const T3 = [0, 1, 2].map(i => { const t = P.tower(0.34, 0.34, [SAF, BLUE, BAD][i], { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(-0.8 + i * 0.5, 0, 0.45); S.add(t); return t; });
    S.add(P.keep(-2.65, 2.15, 0.85, -0.95, 0.7));
    const parts = [...gpus.flatMap(g => [g.cb, g.mb]), ...T3];

    let R = null, C = null;
    function draw() {
      R = serve(st); C = serve({ ...st, split: false });
      const nPre = st.split ? Math.max(2, Math.min(6, Math.round(8 * (st.prompt / 1000) / (st.prompt / 1000 + st.out / 60)))) : 0;
      const xAt = i => st.split ? -2.35 + i * 0.5 + (i < nPre ? 0 : 0.5) : -2.1 + i * 0.5;
      gpus.forEach((G, i) => {
        const pre = st.split && i < nPre, x = xAt(i), z = -0.5;
        G.b.position.set(x, 0, z); G.cb.position.set(x - 0.09, 0.14, z); G.mb.position.set(x + 0.09, 0.14, z);
        G.cb.userData.set({ h: (st.split ? (pre ? 0.85 : 0.2) : 0.55) * 0.62 }); G.mb.userData.set({ h: (st.split ? (pre ? 0.3 : 0.85) : 0.55) * 0.62 });
        G.m.color.set(st.split ? (pre ? '#FBE9C9' : '#D6E5F1') : '#E4DED2');
      });
      link.visible = !!st.split;
      if (st.split) { P.setRod(link, V(xAt(nPre - 1) + 0.19, 0.08, -0.5), V(xAt(nPre) - 0.19, 0.08, -0.5)); linkM.color.set(st.link === 'rdma' ? GOOD : SAF); }
      T3[0].userData.set({ h: Math.min(0.9, R.ttft * 0.45), color: st.split && R.ttft > C.ttft * 1.15 ? BAD : SAF });
      T3[1].userData.set({ h: Math.min(0.9, R.tpot * 0.03), color: R.tpot > 15 ? BAD : BLUE });
      T3[2].userData.set({ h: Math.max(0.03, R.waste * 1.6), color: R.waste > 0.2 ? BAD : OFF });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Prompt length, tokens', min: 500, max: 32000, step: 500, get: () => st.prompt, set: v => set({ prompt: Math.round(v) }), fmt: v => Math.round(v).toLocaleString('en') },
      { type: 'slider', label: 'Answer length, tokens', min: 50, max: 1500, step: 50, get: () => st.out, set: v => set({ out: Math.round(v) }) },
      { type: 'toggle', label: 'Split into prefill and decode pools', short: 'Split', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'buttons', label: 'Link between pools', options: ['RDMA', 'TCP'], get: () => st.link === 'rdma' ? 0 : 1, act: i => set({ link: i ? 'tcp' : 'rdma' }) },
    ];
    const readouts = [
      { label: 'First token', get: () => ({ v: `${R.ttft.toFixed(2)} s`, sub: st.split ? `together: ${C.ttft.toFixed(2)} s` : 'one pool', good: R.ttft <= C.ttft * 1.05, bad: R.ttft > C.ttft * 1.15 }) },
      { label: 'Between tokens', get: () => ({ v: `${R.tpot.toFixed(1)} ms`, sub: 'during long prefills', good: R.tpot < 12, bad: R.tpot > 15 }) },
      { label: 'GPU time wasted', get: () => ({ v: `${Math.round(R.waste * 100)}%`, sub: 'wrong resource idle', good: R.waste < 0.12, bad: R.waste > 0.25 }) },
    ];
    const labels = [
      { name: 'gpus', t: 'Eight GPUs', d: 'Gold: compute. Blue: memory', icon: 'chart', atV: V(-2.55, 0.1, -0.5) },
      { name: 'm', t: 'Per request', d: 'First token, time per token, waste', icon: 'target', atV: V(0.38, 0.2, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep them together with long contracts', hint: 'stalls', on: () => set({ ...D0, split: false }), off: reset },
      { label: 'Split for short chats', hint: 'transfer outweighs the gain', on: () => set({ ...D0, prompt: 500, out: 100 }), off: reset },
      { label: 'Send the cache over TCP', hint: 'slow link', on: () => set({ ...D0, link: 'tcp' }), off: reset },
    ];
    function status() {
      if (!st.split && st.prompt >= 8000) return { ok: false, msg: `<b>With both phases on the same GPUs, every ${st.prompt.toLocaleString('en')}-token contract holds the GPUs during prefill and everyone\'s stream stutters: ${C.tpot.toFixed(1)} ms between tokens, and ${Math.round(C.waste * 100)}% of GPU time spent with the wrong resource idle.</b> Long prompts are where splitting pays.` };
      if (st.split && st.prompt <= 2000) return { ok: false, msg: `<b>For a ${st.prompt}-token chat, the split adds a ${Math.round(R.kvMs)} ms cache transfer to a prefill that takes only ${(st.prompt / 2000 * 120).toFixed(0)} ms: first token ${R.ttft.toFixed(2)} s against ${C.ttft.toFixed(2)} s together.</b> Short prompts and short answers barely interfere; keep them on one pool.` };
      if (st.split && st.link === 'tcp') return { ok: false, msg: `<b>Over ordinary TCP the cache for a ${st.prompt.toLocaleString('en')}-token prompt takes ${Math.round(R.kvMs)} ms to move, eating much of what the split saved.</b> Disaggregation assumes a fast link between pools, RDMA or InfiniBand, with TCP only as a fallback.` };
      if (!st.split) return { ok: true, msg: `<b>Short prompts on one pool: ${C.tpot.toFixed(1)} ms between tokens and ${Math.round(C.waste * 100)}% waste.</b> Without long prefills to interfere, keeping the phases together is simpler and costs little.` };
      return { ok: true, msg: `<b>The prefill pool reads the ${st.prompt.toLocaleString('en')}-token contract, the cache crosses in ${Math.round(R.kvMs)} ms over RDMA, and the decode pool streams at ${R.tpot.toFixed(1)} ms a token with no stalls; waste falls to ${Math.round(R.waste * 100)}% from ${Math.round(C.waste * 100)}%.</b> Size the pools to the mix of prompt and answer lengths.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two phases', home: true, say: 'A legal-research service in Nairobi runs a large model on eight GPUs. Reading a contract and writing an answer use the hardware differently.', act: m => m.set({ prompt: 16000, out: 300, split: false, link: 'rdma' }) },
    { t: 'They interfere', home: true, say: 'Together on the same GPUs, each long prefill pauses everyone\'s stream, and one resource sits idle while the other works.', act: m => m.set({ prompt: 16000, out: 300, split: false, link: 'rdma' }) },
    { t: 'Split the pools', home: true, say: 'A prefill pool built for compute, a decode pool built for memory, and the cache sent from one to the other.', act: m => m.set({ prompt: 16000, out: 300, split: true, link: 'rdma' }) },
    { t: 'A fast link', home: true, say: 'The cache must move quickly. Over ordinary networking, the transfer eats the saving.', act: m => m.set({ prompt: 16000, out: 300, split: true, link: 'tcp' }) },
    { t: 'Not for short chats', home: true, say: 'For short prompts and answers, the transfer costs more than the interference it removes.', act: m => m.set({ prompt: 500, out: 100, split: true, link: 'rdma' }) },
    { t: 'Measure the mix', home: true, say: 'Split when prompts are long and streams must not stall, and size the pools to your traffic.', act: m => m.set({ prompt: 16000, out: 300, split: true, link: 'rdma' }) },
  ],
  check: [
    { q: 'Why do prefill and decode suit different hardware?', options: ['Prefill is compute-bound; decode is memory-bound', 'They are identical', 'Decode needs more compute'], answer: 0, why: 'Different bottlenecks.', hint: 'Watch the two bars per GPU.' },
    { q: 'When does disaggregation not pay?', options: ['Short prompts and short answers', 'Long contracts', 'Agents with long context'], answer: 0, why: 'The cache transfer dominates.', hint: 'Try Split for short chats.' },
    { q: 'What must link the pools?', options: ['A fast interconnect such as RDMA', 'Any network', 'Shared disk'], answer: 0, why: 'The KV cache moves per request.', hint: 'Try Send the cache over TCP.' },
  ],
  terms: [
    ['Prefill', 'Processing the whole prompt in one pass; compute-bound.'],
    ['Decode', 'Writing tokens one at a time; memory-bound.'],
    ['Disaggregation', 'Running prefill and decode on separate pools.'],
    ['KV transfer', 'Sending the prompt\'s cache from prefill to decode.'],
    ['NIXL', 'NVIDIA\'s transport for moving KV cache between nodes.'],
    ['Interference', 'One request\'s prefill delaying others\' decode.'],
  ],
  deeper: '<p><b>Two stacks.</b> NVIDIA Dynamo sits above serving engines with its own router and planner; llm-d builds the same pattern from Kubernetes parts. Both scale prefill and decode pools separately.</p><p><b>Chunked prefill first.</b> Inside one engine, chunking a long prefill already reduces stalls; disaggregation is the next step when that isn\'t enough.</p><p><b>About this machine.</b> Prefill speed, transfer times and waste are illustrative formulas; pool sizes follow the length mix, computed live.</p>',
  code: {
    title: 'Route to two pools',
    note: 'Adapted from the course\'s disaggregation sketch (code/main.py).',
    text: `
def handle(req, prefill_pool, decode_pool, link):
    if req.prompt_tokens < 2000 and req.max_tokens < 200:
        return colocated(req)                     # short: not worth the transfer
    p = prefill_pool.least_loaded()
    kv = p.prefill(req.prompt)                    # compute-bound
    d = decode_pool.least_loaded()
    link.send(kv, src=p, dst=d)                   # NIXL: RDMA, TCP as fallback
    return d.decode(kv, max_tokens=req.max_tokens) # memory-bound, no stalls

def pool_split(gpus, avg_prompt, avg_output):
    share = avg_prompt / (avg_prompt + avg_output * 16)   # rough compute share
    return round(gpus * share), gpus - round(gpus * share)
`,
  },
};
