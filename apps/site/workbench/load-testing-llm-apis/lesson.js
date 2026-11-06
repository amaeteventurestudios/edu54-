// Load testing LLM APIs (phase 17, lesson 22): an Abuja tax-filing assistant must survive deadline week. A load test sends one repeated prompt or
// a realistic spread of prompt lengths, measures token timing in a client that tokenises inside a single Python thread or in a separate process,
// and follows one of four patterns: steady, ramp, spike or soak. What each test reports against what production will see (P99 TTFT, the breaking
// point, memory growth) is computed live.
const CAP_REAL = 140, CAP_SAME = 600;
function run(o) {
  const cap = o.varied ? CAP_REAL : CAP_SAME;
  const peak = o.pattern === 'spike' ? 400 : o.pattern === 'ramp' ? 250 : 120;
  const util = Math.min(0.99, peak / cap), q = util / (1 - util);
  const ttft = 0.25 + 0.05 * q * (o.varied ? 1.6 : 0.2);
  const clientLag = o.gil ? 0.004 * peak / 20 : 0;
  const tpot = 0.012 * (1 + 0.4 * util) + clientLag;
  const breakAt = o.pattern === 'ramp' ? cap : null;
  const leak = o.pattern === 'soak' ? 'memory grew 22%, a connection-pool leak' : null;
  const spike = o.pattern === 'spike' ? (o.varied ? 'P99 jumped for 3 minutes while new replicas cold-started' : 'held, because the cache answered every repeat') : null;
  const prodTtft = 0.25 + 0.05 * (Math.min(0.99, 200 / CAP_REAL) / (1 - Math.min(0.99, 200 / CAP_REAL))) * 1.6;
  return { cap, peak, util, ttft, tpot, clientLag, breakAt, leak, spike, prodTtft };
}

export default {
  slug: 'load-testing-llm-apis',
  title: 'Load testing LLM APIs: tests that tell the truth',
  description: 'A tax-filing assistant in Abuja must survive deadline week. Load-test it with varied prompts and honest clients, or the test will only flatter you.',
  overview: 'Generic load testers were built for short, uniform responses. Model APIs stream, outputs vary in length, the metrics are per token and the bottleneck is the GPU, so a careless test lies in two classic ways. The prompt-uniformity trap: most tools send one configured prompt in a loop. The server sees the same prefix every time, its prefix cache hits approach 100%, and it looks able to handle many times the real load. A service that "held 500 users" falls over at 200 real ones. Sample prompts from a realistic distribution instead, with a mean and spread of input lengths and varied content, as LLMPerf does with its mean and standard-deviation settings. The GIL trap: Locust runs in Python, and tokenising streamed output to time each token happens under the global interpreter lock; at high concurrency the client\'s own tokenising queues up, and the reported time between tokens includes the client\'s backlog, so the server looks slower than it is. Tokenise in separate processes, or use a harness in a compiled language. Then use four load patterns, each catching a different failure. Steady load for half an hour or more catches regressions against a baseline. A ramp from zero to the target finds the breaking point. A spike, three to ten times normal for a couple of minutes, tests autoscaling, queues and cold starts. A soak, steady load for hours, finds memory leaks, connection-pool drift and logs that fill disks. Know your tool\'s definitions too: some count the first token in inter-token latency and some don\'t, so two tools disagree on the same server. Run the patterns in CI before big releases, against production-like hardware.',
  keywords: ['load testing', 'LLMPerf', 'Locust', 'k6', 'performance testing', 'inference serving', 'SRE'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { varied: true, gil: false, pattern: 'ramp' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* thirty towers of load over the test, and a gold wall behind them at the real breaking point */
    const TX = t => -2.0 + t * 0.135, HS = 0.0016;
    const wall = P.box(4.1, 1, 0.03, SAF, { r: 0.002 }); wall.userData.noFit = true; wall.position.set(0, 0, -0.72); S.add(wall);
    const bars = Array.from({ length: 30 }, (_, t) => { const b = P.tower(0.11, 0.2, BLUE, { h: 0.2 }); b.userData.set({ cap: '' }); b.position.set(TX(t), 0, -0.55); S.add(b); return b; });
    /* four test patterns as pads; lamps for a client that keeps up and prompts that vary */
    const PAT = ['steady', 'ramp', 'spike', 'soak'];
    const pats = PAT.map((k, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.42, 0.08, 0.32, '#fff', { r: 0.03, material: m }); b.position.set(-1.3 + i * 0.52, 0, 0.3); S.add(b); return { k, m }; });
    const client = P.lamp(GOOD, { h: 0.16, r: 0.09 }), vary = P.lamp(GOOD, { h: 0.16, r: 0.09 }); client.position.set(1.0, 0, 0.3); vary.position.set(1.5, 0, 0.3); S.add(client, vary);
    S.add(P.keep(-2.15, 2.15, 1.0, -0.8, 0.55));
    let R = null;
    const shape = (p, t) => p === 'steady' ? 120 : p === 'ramp' ? t / 29 * 250 : p === 'spike' ? (t >= 12 && t < 16 ? 400 : 100) : 120;
    function draw() {
      R = run(st);
      bars.forEach((B, t) => { const v = shape(st.pattern, t); B.userData.set({ h: Math.max(0.02, v * HS), color: v > R.cap ? BAD : BLUE }); });
      wall.scale.y = R.cap * HS;
      pats.forEach(Pt => Pt.m.color.set(Pt.k === st.pattern ? SAF : OFF));
      client.userData.set({ color: st.gil ? BAD : GOOD, on: true });
      vary.userData.set({ color: st.varied ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const PK = ['steady', 'ramp', 'spike', 'soak'];
    const controls = [
      { type: 'toggle', label: 'A realistic spread of prompts, not one repeated', short: 'Varied prompts', get: () => st.varied, set: v => set({ varied: !!v }) },
      { type: 'toggle', label: 'Client tokenises in one Python thread', short: 'Single thread', get: () => st.gil, set: v => set({ gil: !!v }) },
      { type: 'buttons', label: 'Load pattern', options: ['Steady', 'Ramp', 'Spike', 'Soak'], get: () => PK.indexOf(st.pattern), act: i => set({ pattern: PK[i] }) },
    ];
    const readouts = [
      { label: 'Breaking point', get: () => ({ v: `${R.cap}/s`, sub: st.varied ? 'true capacity' : 'flattered by the cache', good: st.varied, bad: !st.varied }) },
      { label: 'Between tokens', get: () => ({ v: `${Math.round(R.tpot * 1000)} ms`, sub: st.gil ? 'includes client lag' : 'server only', bad: st.gil, good: !st.gil }) },
      { label: 'Deadline week', get: () => ({ v: '200/s', sub: `breaks at ${CAP_REAL}/s`, bad: true }) },
    ];
    const labels = [
      { name: 'load', t: 'The test\'s load', d: 'Gold wall: where it really breaks', icon: 'chart', atV: V(-2.08, 0.2, -0.55) },
      { name: 'rep', t: 'An honest test', d: 'Varied prompts, a client that keeps up', icon: 'target', atV: V(1.72, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send the same prompt every time', hint: 'the cache flatters', on: () => set({ ...D0, varied: false }), off: reset },
      { label: 'Tokenise in the test\'s one thread', hint: 'client backlog', on: () => set({ ...D0, gil: true, pattern: 'spike' }), off: reset },
      { label: 'Skip the long soak', hint: 'steady for 10 minutes', on: () => set({ ...D0, pattern: 'steady' }), off: reset },
    ];
    function status() {
      if (!st.varied) return { ok: false, msg: `<b>With one prompt repeated, the server\'s prefix cache answered nearly every request: the test says the assistant breaks near ${CAP_SAME} a second. With real, varied prompts it breaks near ${CAP_REAL}, and deadline week will bring 200.</b> Sample prompts from a realistic spread of lengths and content.` };
      if (st.gil) return { ok: false, msg: `<b>The test client tokenises streamed tokens in one Python thread; under the spike it falls behind, and ${Math.round(R.clientLag * 1000)} ms of the reported ${Math.round(R.tpot * 1000)} ms between tokens is the client\'s own backlog.</b> The server looks slower than it is. Tokenise in separate processes, or use a compiled harness.` };
      if (st.pattern === 'steady') return { ok: false, msg: '<b>Ten minutes of steady load shows a healthy baseline and nothing else: no breaking point, no autoscaling under a spike, and no leak, because leaks take hours.</b> Run all four patterns; the soak found a connection-pool leak that would have taken the assistant down on day three of deadline week.' };
      if (st.pattern === 'soak') return { ok: true, msg: `<b>Six hours at steady load: ${R.leak}.</b> Leaks, connection-pool drift and logs filling disks only appear over hours. Fix it before deadline week.` };
      if (st.pattern === 'spike') return { ok: true, msg: `<b>A spike to 400 a second for two minutes: ${R.spike}.</b> Spikes test autoscaling, queues and cold starts; this is why warm capacity matters at the deadline.` };
      return { ok: true, msg: `<b>A ramp with realistic prompts finds the true breaking point near ${R.breakAt} a second, well below the 200 expected in deadline week.</b> Add capacity now; then repeat with a spike and a soak.` };
    }
    return { update: dt => { bars.forEach(b => b.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Deadline week', home: true, say: 'A tax-filing assistant in Abuja must survive deadline week. The team load-tests it first.', act: m => m.set({ varied: false, gil: false, pattern: 'ramp' }) },
    { t: 'The same prompt', home: true, say: 'A test that repeats one prompt lets the cache answer everything. The service looks four times stronger than it is.', act: m => m.set({ varied: false, gil: false, pattern: 'ramp' }) },
    { t: 'Realistic prompts', home: true, say: 'Sample prompts with real lengths and content, and the true breaking point appears, below deadline-week traffic.', act: m => m.set({ varied: true, gil: false, pattern: 'ramp' }) },
    { t: 'A slow client', home: true, say: 'A Python client tokenising in one thread falls behind and blames the server for its own delay.', act: m => m.set({ varied: true, gil: true, pattern: 'spike' }) },
    { t: 'Spike and soak', home: true, say: 'A spike tests autoscaling and cold starts. A six-hour soak finds the leak a short test never could.', act: m => m.set({ varied: true, gil: false, pattern: 'soak' }) },
    { t: 'Four patterns', home: true, say: 'Steady, ramp, spike and soak, with realistic prompts and an honest client, before every big release.', act: m => m.set({ varied: true, gil: false, pattern: 'ramp' }) },
  ],
  check: [
    { q: 'Why does repeating one prompt flatter a load test?', options: ['The prefix cache answers almost every request', 'It is too slow', 'It uses less memory'], answer: 0, why: 'Real prompts vary.', hint: 'Try Send the same prompt every time.' },
    { q: 'What is the GIL trap?', options: ['The test client\'s tokenising backlog counted as server latency', 'A GPU limit', 'A network fault'], answer: 0, why: 'Tokenise in separate processes.', hint: 'Try Tokenise in the test\'s one thread.' },
    { q: 'Which pattern finds memory leaks?', options: ['A soak over hours', 'A spike', 'A ramp'], answer: 0, why: 'Leaks need time.', hint: 'Choose Soak.' },
  ],
  terms: [
    ['Prompt-uniformity trap', 'One repeated prompt makes caches flatter the results.'],
    ['GIL trap', 'Client-side tokenising delay reported as server latency.'],
    ['Ramp test', 'Load rising steadily to find the breaking point.'],
    ['Spike test', 'A sudden burst to test autoscaling and queues.'],
    ['Soak test', 'Steady load for hours to find leaks and drift.'],
    ['Prompt distribution', 'A realistic mean and spread of prompt lengths.'],
  ],
  deeper: '<p><b>Tools.</b> LLMPerf for benchmark runs with prompt distributions; k6 with a streaming extension as a CI gate; guidellm for large synthetic runs; GenAI-Perf as NVIDIA\'s reference. Check how each defines inter-token latency.</p><p><b>Production-like.</b> Test against the same hardware, engine settings and cache configuration as production, or the numbers transfer poorly.</p><p><b>About this machine.</b> Capacities, latencies and findings are illustrative; which test reports what is computed live.</p>',
  code: {
    title: 'A realistic load profile',
    note: 'Adapted from the course\'s load-testing sketch (code/main.py).',
    text: `
import random
def prompt(mean=900, sd=300):
    n = max(50, int(random.gauss(mean, sd)))
    return sample_document(tokens=n)           # varied content, not one fixed prompt

PATTERNS = {
    "steady": lambda t: 120,
    "ramp":   lambda t: 250 * t / DURATION,
    "spike":  lambda t: 400 if 12 <= t < 14 else 100,
    "soak":   lambda t: 120,                   # for 6 hours
}

# llmperf: --mean-input-tokens 900 --stddev-input-tokens 300 --num-concurrent-requests 64
`,
  },
};
