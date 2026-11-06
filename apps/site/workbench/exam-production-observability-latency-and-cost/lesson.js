// Exam prep, production observability: an invented farm-advice service in Addis Ababa answers growers' questions with Claude, a weather tool
// and retrieval. The dashboard says 99.9% of API calls succeed while growers complain. Four layers (system, trajectory, quality, business),
// a trace waterfall of P95 spans, a cache layout with the timestamp before or after the stable prefix, retry and time budgets, and cost per
// successful answer: (calls with retries × price × cache discount + failed answers × expert review) ÷ success rate. All rates, seconds and
// prices are illustrative; prices show in the learner's currency.
const MODELS = [
  { k: 'small', n: 'smaller model', price: 0.002, retry: 0.3, succ: 0.78, p95: 2.5 },
  { k: 'mid', n: 'mid-size model', price: 0.006, retry: 0.08, succ: 0.93, p95: 4 },
];
const REVIEW = 0.25, SLO_P95 = 8, SLO_TASK = 0.9;

function run(o) {
  const m = MODELS[o.model];
  const hit = o.cache ? 0.82 : 0.04;
  const perCall = m.price * (1 + m.retry) * (1 - 0.6 * hit);
  const cps = (perCall + (1 - m.succ) * REVIEW) / m.succ;
  const spans = [
    ['queue', 0.3], ['context', o.cache ? 0.3 : 0.9], ['model', m.p95], ['weather tool', o.budget ? 2 : 9],
    ['retries', o.budget ? 0.4 : m.retry > 0.2 ? 3 : 1], ['validate', 0.3],
  ];
  const p95 = spans.reduce((a, s) => a + s[1], 0);
  return { m, hit, cps, spans, p95, ok: o.model === 1 && o.trace && o.task && o.cache && o.budget };
}

export default {
  slug: 'exam-production-observability-latency-and-cost',
  title: 'Exam prep: observability, latency and cost',
  description: 'A dashboard shows 99.9% good calls while growers complain. Open the trace, fix the slow span and the cache, and count cost per right answer.',
  overview: 'A system can report 99.9 percent successful API calls while its users are unhappy, because transport success is not task success. Observe four layers and keep them apart: system (latency, errors, saturation, cost), trajectory (retrieval, tools, retries, approvals), task quality (factuality, completeness, safety against a rubric) and business outcome (resolution, adoption, time saved). Logs record discrete events with structured fields; metrics aggregate rates, percentiles, tokens, cache hits and pass rates; traces connect one request\'s model calls, retrieval, tools, validation, retries and approvals with parent-child timing, without which a slow request is one opaque block. Trace the semantic contract: versions of the prompt, model, tools and knowledge, token and cache counts, stop reasons, tool error categories, validation decisions and the final state, but never secrets or unnecessary personal data. Decompose latency into queue, context, model, retrieval, tools, validation, retries and approval, and track P50 and P95 for each; the average hides the tail users feel. Prompt caching reuses a stable prefix, so a timestamp near the front invalidates everything after it; put stable tool definitions, instructions and reference material first, and track cache reads and writes. Measure cost per successful outcome: model, cache, tools, infrastructure, review and correction, divided by accepted outcomes. A cheaper model per call can cost more per success once retries and human review are counted. Alert on decisions, each with an owner and a runbook, and roll out through shadow evaluation, a canary and guarded expansion, stratified by task class. This machine follows an invented farm-advice service in Addis Ababa; the figures are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'observability', 'tracing', 'p95 latency', 'prompt caching', 'cost per success', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [-0.1, 0.35, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { model: 1, trace: true, task: true, cache: true, budget: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* four lamps for the four layers: system at the bottom, business at the top, on one post */
    const LAY = 4, post = P.cyl(0.03, 0.82, '#6B6E7E'); post.position.set(-2.3, 0, -0.3); S.add(post);
    const layers = Array.from({ length: LAY }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.ball(0.1, '#fff', { material: m }); b.position.set(-2.3, 0.2 + i * 0.2, -0.3); S.add(b); return m; });
    /* the trace: one tower per span, one second to each step of height */
    const SC = 0.085;
    const spans = Array.from({ length: 6 }, (_, i) => { const t = P.tower(0.32, 0.36, BLUE, { h: 0.1 }); t.userData.set({ cap: '' }); t.position.set(-1.6 + i * 0.42, 0, -0.3); S.add(t); return t; });
    /* P95 as a whole, with the objective as a gold slab across it */
    const TS = 0.05, total = P.tower(0.36, 0.36, GOOD, { h: 0.4 }); total.userData.set({ cap: '' }); total.position.set(1.1, 0, -0.3); S.add(total);
    const obj = P.box(0.56, 0.03, 0.56, SAF, { r: 0.01 }); obj.position.set(1.1, SLO_P95 * TS, -0.3); S.add(obj);
    /* the cache: a shelf of prompts, gold when they hit */
    const cache = P.shelf(10, { cell: 0.17, levels: 1, lh: 0.18, d: 0.26 }); cache.position.set(-0.75, 0, 0.45); S.add(cache);
    /* a jar of coins: the cost of one successful answer */
    const jar = P.jar(0.24, 0.7, { max: 12 }); jar.position.set(1.75, 0, -0.3); S.add(jar);
    S.add(P.keep(-2.55, 2.05, 1.05, -0.6, 0.65));
    const parts = [...spans, total];
    let R = null;
    function draw() {
      R = run(st);
      [st.task, st.task && R.m.succ >= SLO_TASK, st.trace, true].reverse().forEach((ok, i) => layers[i].color.set(ok ? GOOD : RED));
      spans.forEach((t, i) => {
        const s = R.spans[i], slow = (s[0] === 'weather tool' && s[1] > 3) || (s[0] === 'retries' && s[1] > 1);
        t.visible = !!st.trace;
        t.userData.set({ h: s[1] * SC, color: slow ? RED : BLUE });
      });
      total.userData.set({ h: R.p95 * TS, color: !st.trace ? '#9A958A' : R.p95 <= SLO_P95 ? GOOD : RED });
      const hits = Math.round(R.hit * 10);
      cache.userData.set({ fill: Array.from({ length: 10 }, (_, i) => i < hits ? SAF : OFF) });
      jar.userData.set({ n: Math.max(1, R.cps / 0.08 * 12) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Model', options: MODELS.map(m => m.n), get: () => st.model, act: i => set({ model: i }) },
      { type: 'toggle', label: 'Trace every span', short: 'Traces', get: () => st.trace, set: v => set({ trace: !!v }) },
      { type: 'toggle', label: 'Measure task success, not HTTP 200', short: 'Task metric', get: () => st.task, set: v => set({ task: !!v }) },
      { type: 'toggle', label: 'Stable prefix first, timestamp later', short: 'Cache layout', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'toggle', label: 'Retry and time budgets', short: 'Budgets', get: () => st.budget, set: v => set({ budget: !!v }) },
    ];
    const readouts = [
      { label: 'P95 latency', get: () => ({ v: `${R.p95.toFixed(1)} s`, sub: `objective ${SLO_P95} s`, good: R.p95 <= SLO_P95, bad: R.p95 > SLO_P95 }) },
      { label: 'Cache hits', get: () => ({ v: `${Math.round(R.hit * 100)}%`, sub: 'prompt prefix', good: R.hit > 0.5, bad: R.hit < 0.5 }) },
      { label: 'Per successful answer', get: () => ({ v: M(R.cps), sub: 'model, retries, review', good: R.ok, bad: st.model === 0 }) },
    ];
    const labels = [
      { name: 'l', t: 'Four layers', d: 'System at the foot, business on top', icon: 'target', atV: V(-2.42, 0.6, -0.3) },
      { name: 't', t: 'Cost per right answer', d: 'Coins in the jar', icon: 'money', atV: V(2.0, 0.35, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Count HTTP 200s as success', hint: 'transport, not task', on: () => set({ ...D0, task: false, trace: false }), off: reset },
      { label: 'Put the timestamp first', hint: 'the prefix never repeats', on: () => set({ ...D0, cache: false }), off: reset },
      { label: 'Pick the model by call price', hint: 'retries and review cost too', on: () => set({ ...D0, model: 0 }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Traces show every span within budget, P95 is ${R.p95.toFixed(1)} seconds, ${Math.round(R.hit * 100)}% of prompts hit the cache and ${Math.round(R.m.succ * 100)}% of answers pass the rubric, so a successful answer costs ${M(R.cps)}.</b>` };
      const f = [];
      if (!st.task) f.push('the dashboard counts HTTP 200s, so answers that fail the rubric are invisible');
      if (!st.trace) f.push(`a ${R.p95.toFixed(0)}-second request is one opaque block: nobody can see the weather tool's tail`);
      if (!st.cache) f.push(`a timestamp at the front changes every prefix, so only ${Math.round(R.hit * 100)}% of prompts hit the cache`);
      if (!st.budget) f.push(`with no time or retry budget, the weather tool's tail pushes P95 to ${R.p95.toFixed(1)} seconds`);
      if (st.model === 0) f.push(`the smaller model is cheaper per call, but with more retries and ${Math.round((1 - R.m.succ) * 100)}% of answers sent to an expert, each success costs ${M(R.cps)} against ${M(run({ ...st, model: 1 }).cps)}`);
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Observe four layers and compare cost per successful outcome.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'All green, all wrong', home: true, say: 'The dashboard shows nearly every call succeeding, and growers are still complaining.', act: m => m.set({ model: 0, trace: false, task: false, cache: false, budget: false }) },
    { t: 'Measure the task', home: true, say: 'Score answers against a rubric. Many valid responses still fail the task.', act: m => m.set({ model: 0, trace: false, task: true, cache: false, budget: false }) },
    { t: 'Trace the spans', home: true, say: 'A trace splits the slow request into spans. The weather tool and retries own the tail.', act: m => m.set({ model: 0, trace: true, task: true, cache: false, budget: false }) },
    { t: 'Budgets', home: true, say: 'A time budget with a cached fallback cuts the tool\'s tail, and retries are capped.', act: m => m.set({ model: 0, trace: true, task: true, cache: false, budget: true }) },
    { t: 'Fix the cache', home: true, say: 'The timestamp sat at the front of the prompt. Move it after the stable prefix.', act: m => m.set({ model: 0, trace: true, task: true, cache: true, budget: true }) },
    { t: 'Cost per success', home: true, say: 'Counting retries and expert review, the mid-size model costs less per good answer.', act: m => m.set({ model: 1, trace: true, task: true, cache: true, budget: true }) },
  ],
  check: [
    { q: 'Why is 99.9% HTTP success not enough?', options: ['Transport success is not task success', 'It is always enough', 'HTTP codes are random'], answer: 0, why: 'Measure the task against a rubric.', hint: 'Try Count HTTP 200s as success.' },
    { q: 'Why does a timestamp at the front of a prompt hurt caching?', options: ['It changes the prefix, so nothing after it is reused', 'Timestamps are large', 'Caches ignore timestamps'], answer: 0, why: 'Stable prefix first.', hint: 'Try Put the timestamp first.' },
    { q: 'What is the right cost comparison between two models?', options: ['Cost per successful outcome', 'Price per call', 'Price per token only'], answer: 0, why: 'Retries and review cost too.', hint: 'Try Pick the model by call price.' },
  ],
  practice: [
    { q: 'Which shows where a slow request spent its time?', options: ['A trace with parent-child spans', 'An average latency metric', 'A log of HTTP codes', 'The model card'], answer: 0, why: 'Traces connect the trajectory.' },
    { q: 'P50 latency is fine but users complain about slowness. What should you look at?', options: ['P95 and the spans that make up the tail', 'Only P50', 'The model price', 'Token counts only'], answer: 0, why: 'The average hides the tail.' },
    { q: 'What makes an alert actionable?', options: ['An owner, a runbook, an evidence link and an escalation path', 'A loud sound', 'A metric that moves often', 'Being on a dashboard'], answer: 0, why: 'Otherwise it is decoration.' },
    { q: 'Which should never be written to traces?', options: ['Raw credentials and unnecessary personal data', 'Model and prompt versions', 'Tool error categories', 'Cache read tokens'], answer: 0, why: 'Use hashes, classes or protected references.' },
    { q: 'A new prompt passes offline evaluation. What next?', options: ['Shadow, then a canary, then guarded expansion with rollback', 'Full rollout at once', 'No further checks', 'Roll out only to the largest customer'], answer: 0, why: 'Production traffic contains new cases.' },
    { q: 'An aggregate quality gain hides a regression for one high-risk task class. How do you catch it?', options: ['Stratify results by task class', 'Look at the total only', 'Add more traffic', 'Ignore small classes'], answer: 0, why: 'Aggregates can hide segments.' },
  ],
  terms: [
    ['Task success', 'An output meeting the defined rubric, not just a completed request.'],
    ['Trace', 'One request\'s spans with parent-child timing.'],
    ['P95', 'The latency within which 95 percent of requests finish.'],
    ['Cache prefix', 'The stable start of a prompt that later requests can reuse.'],
    ['Cost per success', 'Total cost divided by accepted outcomes.'],
    ['Canary', 'A small slice of traffic that tries a change before wider rollout.'],
  ],
  deeper: '<p><b>Streaming.</b> Measure time to first useful output, not just the first token, when users wait for citations or tool results.</p><p><b>Batch and background.</b> Judge them by deadline completion and throughput rather than single-request latency.</p><p><b>About this machine.</b> The service, rates and prices are invented.</p>',
  code: {
    title: 'Cost per successful outcome',
    note: 'Written for this lesson; prices are placeholders.',
    text: `
def cost_per_success(price, retry_rate, cache_hit, success, review_cost):
    per_call = price * (1 + retry_rate) * (1 - 0.6 * cache_hit)   # cached input is cheaper
    failures = (1 - success) * review_cost                         # an expert fixes failed answers
    return (per_call + failures) / success

small = cost_per_success(0.002, 0.30, 0.82, 0.78, 0.25)
mid   = cost_per_success(0.006, 0.08, 0.82, 0.93, 0.25)
print(f"small {small:.3f}  mid {mid:.3f}")    # the cheaper call is the dearer success
`,
  },
};
