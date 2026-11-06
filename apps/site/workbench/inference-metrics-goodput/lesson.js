// Inference metrics and goodput (phase 17, lesson 8): a Durban insurer's claims assistant serves 200 requests of mixed prompt and answer lengths.
// For each request: TTFT = queue + network + prefill, TPOT (time between streamed tokens) from decode, spiking when a long prefill lands in the
// same batch unless prefill is chunked, and E2E = TTFT + TPOT × output tokens. Load, chunked prefill and the service targets are set; means,
// percentiles, throughput and goodput (the share meeting every target) are computed live.
const N = 200;
const hsh = (i, k) => { let x = (i * 2654435761 + k * 40503) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const REQ = Array.from({ length: N }, (_, i) => ({ prompt: Math.round(400 * Math.pow(40, hsh(i, 1))), out: Math.round(40 + 300 * hsh(i, 2) ** 2), q: hsh(i, 3), spike: hsh(i, 4) }));
function serve(o) {
  const util = o.load, longShare = REQ.filter(r => r.prompt > 8000).length / N;
  return REQ.map(r => {
    const queue = 0.05 * util / (1 - util) * (0.3 + 2.2 * r.q * r.q);
    const prefill = r.prompt / 60000;
    const ttft = queue + 0.04 + prefill;
    const hit = !o.chunked && r.spike < longShare * util * 1.6;
    const tpot = (0.007 * (1 + 0.6 * util)) * (hit ? 3.4 : 1);
    const e2e = ttft + tpot * r.out;
    return { ...r, ttft, tpot, e2e, ok: ttft <= o.ttftT && tpot <= o.tpotT && e2e <= o.e2eT };
  });
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

export default {
  slug: 'inference-metrics-goodput',
  title: 'Inference metrics: TTFT, TPOT, P99 and goodput',
  description: 'A claims assistant at an insurer in Durban serves two hundred requests, some huge. Watch the tail, not the mean, and count the ones that truly met the targets.',
  overview: '"Our throughput is 15,000 tokens a second" says little about whether the product works. Model serving has several latencies, and each fails differently. Time to first token (TTFT) is queue time plus network plus prefill; prefill is compute-bound and grows with the prompt, so a 32,000-token document takes most of a second before anything streams. Time per output token (TPOT), often reported as inter-token latency (ITL, though tools disagree on whether it counts the first token), is the gap between streamed tokens; decode is memory-bound and grows with batch size. End-to-end latency is TTFT plus TPOT times the number of output tokens, so long answers are TPOT-dominated and long prompts TTFT-dominated. Throughput, output tokens per second across the fleet, measures efficiency, not any one user\'s experience. Two habits matter. Read percentiles, not means: latency distributions have long tails, and the mean hides the users who wait; P99 is the experience of one request in a hundred, which at scale is many people. And measure goodput: the share of requests that meet every target at once, such as TTFT under half a second and TPOT under 15 ms and end-to-end under 4 s. Queueing makes the tail explode as load approaches capacity, so run with headroom. Chunked prefill (from engines like vLLM) splits a long prompt\'s prefill into pieces interleaved with other requests\' decode steps, so one long document doesn\'t freeze everyone else\'s stream.',
  keywords: ['TTFT', 'latency', 'goodput', 'P99', 'inference serving', 'SLO', 'vLLM'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { load: 0.65, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* two hundred requests as a histogram of towers by end-to-end time, with a post at the target */
    const BINS = 30, BMAX = 8, BX = i => -2.1 + i * 0.14;
    const hist = Array.from({ length: BINS }, (_, i) => { const t = P.tower(0.12, 0.2, GOOD, { h: 0.1 }); t.userData.set({ cap: '' }); t.position.set(BX(i), 0, -0.6); S.add(t); return t; });
    const post = P.box(0.03, 0.9, 0.34, SAF, { r: 0.005 }); post.userData.noFit = true; post.position.set(0, 0, -0.6); S.add(post);
    /* three latencies: mean and P99 towers in pairs beside a gold target slab */
    const MET = ['TTFT', 'TPOT', 'E2E'];
    const mets = MET.map((n, i) => {
      const x = -1.7 + i * 0.95;
      const a = P.tower(0.26, 0.26, BLUE, { h: 0.3 }), b = P.tower(0.26, 0.26, GOOD, { h: 0.3 }); [a, b].forEach(t => t.userData.set({ cap: '' })); a.position.set(x - 0.17, 0, 0.3); b.position.set(x + 0.17, 0, 0.3); S.add(a, b);
      const tg = P.box(0.66, 0.42, 0.03, SAF, { r: 0.005 }); tg.position.set(x, 0, 0.13); S.add(tg);
      return { n, a, b };
    });
    /* goodput as a tank: full when all two hundred meet all three */
    const gp = P.tank(0.4, 0.62, 0.4, GOOD); gp.position.set(1.3, 0.05, 0.3); S.add(gp);
    S.add(P.keep(-2.25, 2.1, 0.95, -0.85, 0.6));
    const parts = [...hist, ...mets.flatMap(m => [m.a, m.b]), gp];

    let R = null, G = 0;
    const f = (x, u) => u === 'ms' ? `${Math.round(x * 1000)} ms` : `${x.toFixed(2)} s`;
    function draw() {
      R = serve(st); G = R.filter(r => r.ok).length / N;
      const counts = Array(BINS).fill(0), miss = Array(BINS).fill(0);
      R.forEach(r => { const b = Math.min(BINS - 1, Math.floor(r.e2e / BMAX * BINS)); counts[b]++; if (r.e2e > st.e2eT) miss[b]++; });
      const mx = Math.max(...counts);
      hist.forEach((H, i) => H.userData.set({ h: Math.max(0.01, counts[i] / mx * 0.85), color: miss[i] ? BAD : GOOD }));
      post.position.x = BX(st.e2eT / BMAX * BINS) - 0.07;
      const tg = { TTFT: [R.map(r => r.ttft), st.ttftT], TPOT: [R.map(r => r.tpot), st.tpotT], E2E: [R.map(r => r.e2e), st.e2eT] };
      mets.forEach(Mt => {
        const [a, t] = tg[Mt.n], mn = mean(a), p99 = pct(a, 0.99);
        Mt.a.userData.set({ h: Math.min(0.9, mn / t * 0.42), color: mn > t ? BAD : BLUE });
        Mt.b.userData.set({ h: Math.min(0.9, p99 / t * 0.42), color: p99 > t ? BAD : GOOD });
      });
      gp.userData.set({ level: G, color: G >= 0.95 ? GOOD : BAD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Load, as a share of capacity', min: 0.3, max: 0.95, step: 0.05, get: () => st.load, set: v => set({ load: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'slider', label: 'End-to-end target', min: 2, max: 8, step: 0.5, get: () => st.e2eT, set: v => set({ e2eT: +v }), fmt: v => `${v} s` },
      { type: 'toggle', label: 'Chunked prefill', short: 'Chunked prefill', get: () => st.chunked, set: v => set({ chunked: !!v }) },
      { type: 'buttons', label: 'Judge by', options: ['P99', 'Mean'], get: () => st.view === 'p99' ? 0 : 1, act: i => set({ view: i ? 'mean' : 'p99' }) },
    ];
    const readouts = [
      { label: 'Goodput', get: () => ({ v: `${Math.round(G * 100)}%`, sub: 'meet every target', good: G >= 0.95, bad: G < 0.85 }) },
      { label: 'P99 TTFT', get: () => { const x = pct(R.map(r => r.ttft), 0.99); return { v: f(x, 's'), sub: `mean ${f(mean(R.map(r => r.ttft)), 's')}`, good: x <= st.ttftT, bad: x > st.ttftT }; } },
      { label: 'P99 TPOT', get: () => { const x = pct(R.map(r => r.tpot), 0.99); return { v: f(x, 'ms'), sub: `mean ${f(mean(R.map(r => r.tpot)), 'ms')}`, good: x <= st.tpotT, bad: x > st.tpotT }; } },
    ];
    const labels = [
      { name: 'hist', t: '200 requests', d: 'Gold post: the target time', icon: 'chart', atV: V(2.08, 0.1, -0.6) },
      { name: 'met', t: 'Three latencies', d: 'Mean, then P99, against gold', icon: 'target', atV: V(-2.0, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Judge by the mean', hint: 'the tail hides', on: () => set({ ...D0, view: 'mean', load: 0.85 }), off: reset },
      { label: 'Run near full load', hint: '95% of capacity', on: () => set({ ...D0, load: 0.95 }), off: reset },
      { label: 'Prefill long prompts whole', hint: 'no chunking', on: () => set({ ...D0, chunked: false, load: 0.8 }), off: reset },
    ];
    function status() {
      const tt = R.map(r => r.ttft), tp = R.map(r => r.tpot);
      if (st.view === 'mean' && pct(tt, 0.99) <= st.ttftT) return { ok: true, msg: `<b>At this load the mean (${f(mean(tt), 's')}) and the P99 (${f(pct(tt, 0.99), 's')}) both sit inside the TTFT target.</b> Raise the load and watch the two drift apart: the mean stays calm while the tail breaks.` };
      if (st.view === 'mean') return { ok: false, msg: `<b>By the mean, TTFT is ${f(mean(tt), 's')}, inside the target; at P99 it is ${f(pct(tt, 0.99), 's')}. Goodput is ${Math.round(G * 100)}%.</b> Latency has a long tail, and the mean averages the waiting users away. Report percentiles, and the share that meets every target.` };
      if (st.load >= 0.9) return { ok: false, msg: `<b>At ${Math.round(st.load * 100)}% of capacity the queue explodes: P99 TTFT reaches ${f(pct(tt, 0.99), 's')} and goodput falls to ${Math.round(G * 100)}%.</b> Queueing delay grows steeply as load nears capacity. Keep headroom, and scale on the queue before the tail breaks.` };
      if (!st.chunked) return { ok: false, msg: `<b>Without chunked prefill, whenever a long policy document is prefilled, every stream in the batch stalls: P99 TPOT is ${f(pct(tp, 0.99), 'ms')} against a ${f(st.tpotT, 'ms')} target, and goodput is ${Math.round(G * 100)}%.</b> Chunking interleaves a long prefill with others\' decode steps, so one document doesn\'t freeze the room.` };
      return { ok: G >= 0.95, msg: `<b>${Math.round(G * 100)}% of requests meet all three targets at ${Math.round(st.load * 100)}% load: P99 TTFT ${f(pct(tt, 0.99), 's')}, P99 TPOT ${f(pct(tp, 0.99), 'ms')}, P99 end-to-end ${f(pct(R.map(r => r.e2e), 0.99), 's')}.</b> ${G >= 0.95 ? 'Goodput, not throughput, is the number to watch.' : 'The longest documents still miss; lengthen the target or give long prompts their own path.'}` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two hundred requests', home: true, say: 'A claims assistant at an insurer in Durban serves two hundred requests, some with long policy documents.', act: m => m.set({ load: 0.65, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }) },
    { t: 'Three latencies', home: true, say: 'Time to the first token, time between tokens, and time to the end. Long prompts slow the first; long answers the last.', act: m => m.set({ load: 0.65, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }) },
    { t: 'The mean hides', home: true, say: 'Under heavier load, the mean looks fine. The slowest one percent tell a different story.', act: m => m.set({ load: 0.85, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'mean' }) },
    { t: 'Near capacity', home: true, say: 'Push load towards capacity and the queue explodes. The tail breaks first.', act: m => m.set({ load: 0.95, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }) },
    { t: 'Chunked prefill', home: true, say: 'A long document prefilled whole stalls everyone\'s stream. Chunk it, and it interleaves with their tokens.', act: m => m.set({ load: 0.8, chunked: false, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }) },
    { t: 'Goodput', home: true, say: 'Count the share of requests that meet every target at once. That is the number that says the product works.', act: m => m.set({ load: 0.65, chunked: true, ttftT: 0.5, tpotT: 0.015, e2eT: 4, view: 'p99' }) },
  ],
  check: [
    { q: 'What makes up time to first token?', options: ['Queue time, network and prefill', 'Decode only', 'The whole answer'], answer: 0, why: 'Prefill grows with the prompt.', hint: 'Read the TTFT panel.' },
    { q: 'Why read P99 instead of the mean?', options: ['The mean hides the long tail of slow requests', 'P99 is always lower', 'The mean is harder to compute'], answer: 0, why: 'One in a hundred is many users at scale.', hint: 'Try Judge by the mean.' },
    { q: 'What is goodput?', options: ['The share of requests meeting every target at once', 'Tokens per second', 'GPU utilisation'], answer: 0, why: 'It says whether the product works.', hint: 'Read the goodput line.' },
  ],
  terms: [
    ['TTFT', 'Time to first token: queue, network and prefill.'],
    ['TPOT', 'Time per output token, the gap between streamed tokens.'],
    ['E2E latency', 'TTFT plus TPOT times the output length.'],
    ['P99', 'The latency one request in a hundred exceeds.'],
    ['Goodput', 'The share of requests that meet every target.'],
    ['Chunked prefill', 'Prefilling a long prompt in pieces, between other requests\' decode steps.'],
  ],
  deeper: '<p><b>Tools disagree.</b> Benchmarking tools differ on whether inter-token latency includes the first token, so the same run can report different TPOT; state the definition.</p><p><b>Condition on length.</b> Report end-to-end latency by output length, or long answers make the service look slow and short ones hide prefill problems.</p><p><b>About this machine.</b> Two hundred synthetic requests with fixed lengths; queue, prefill and decode follow simple illustrative formulas, computed live.</p>',
  code: {
    title: 'Per-request metrics and goodput',
    note: 'Adapted from the course\'s metrics sketch (code/main.py).',
    text: `
def metrics(req):
    ttft = req.queue + req.network + req.prompt_tokens / PREFILL_TPS
    tpot = req.decode_time / max(1, req.output_tokens - 1)
    e2e = ttft + tpot * req.output_tokens
    return ttft, tpot, e2e

def goodput(requests, ttft_max=0.5, tpot_max=0.015, e2e_max=4.0):
    ok = [r for r in requests
          if (m := metrics(r))[0] <= ttft_max and m[1] <= tpot_max and m[2] <= e2e_max]
    return len(ok) / len(requests)

def p(values, q):                         # report percentiles, not the mean
    s = sorted(values); return s[min(len(s) - 1, int(q * len(s)))]
`,
  },
};
