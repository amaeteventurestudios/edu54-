// Exam prep, model selection and token economics: an invented insurer's support desk in Nairobi runs three kinds of work each month: tagging
// 120,000 tickets, drafting 30,000 replies a person reviews, and reviewing 1,000 legal escalations. Each task has a quality bar, and each model
// tier has a measured pass rate on that task's eval set and a relative price. The right choice per task is the cheapest tier that clears the
// bar; overnight work can go through a batch queue at half price and a shared prompt prefix can be cached. Prices and pass rates are invented
// and illustrative; costs show in the learner's currency.
const TIERS = [{ id: 's', n: 'Small', price: 0.4 }, { id: 'm', n: 'Medium', price: 1.5 }, { id: 'l', n: 'Large', price: 7.5 }];
const TASKS = [
  { n: 'Tag tickets', vol: 120000, bar: 95, q: { s: 96.2, m: 98.1, l: 98.5 }, batchable: true },
  { n: 'Draft replies', vol: 30000, bar: 90, q: { s: 82.4, m: 92.6, l: 94.1 }, batchable: false },
  { n: 'Legal escalations', vol: 1000, bar: 98, q: { s: 84.0, m: 93.5, l: 98.7 }, batchable: false },
];
function cost(o) {
  const rows = TASKS.map((t, i) => {
    const tier = TIERS.find(x => x.id === o.pick[i]);
    let c = t.vol / 1000 * tier.price;
    if (o.batch && t.batchable) c *= 0.5;
    if (o.cache) c *= 0.7;
    return { ...t, tier, c, pass: t.q[tier.id] >= t.bar, q: t.q[tier.id] };
  });
  return { rows, total: rows.reduce((a, r) => a + r.c, 0), fails: rows.filter(r => !r.pass) };
}

export default {
  slug: 'exam-model-selection-and-token-economics',
  title: 'Exam prep: spend capability where failure is expensive',
  description: 'A support desk tags tickets, drafts replies and handles legal escalations. Give each the cheapest model that clears its measured bar, then batch and cache.',
  overview: 'Choosing a model is an economic decision made under a quality constraint. Larger models are more capable, slower and more expensive per token; smaller ones are fast and cheap and are often entirely good enough. The defensible method is to decide first what good enough means for each task, measure each candidate on a representative evaluation set, and pick the cheapest model that clears the bar, rather than defaulting to the largest model everywhere or the smallest to save money. The bar should reflect what failure costs. Tagging tickets for routing can tolerate an occasional slip that the next stage catches; a reply a person reviews before sending can be a little rougher; a legal escalation where a wrong answer is expensive deserves the most capable model and still a human. Splitting a workflow so that each step uses the cheapest model that meets its own bar often saves far more than any prompt trick. Cost itself has levers beyond the model. Tokens are priced per input and output, so trimming long prompts and asking for concise outputs matters; work that does not need an answer in seconds can go through a batch interface at a lower price; and a long prefix shared by many requests, such as a system prompt and reference documents, can be cached so later requests read it cheaply. Latency matters too: an interactive assistant may need the faster model even when a slower one scores slightly higher. Prices, model names and discounts change; measure and recheck with the current official pricing.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'model selection', 'token costs', 'batch processing', 'prompt caching', 'exam practice'],
  money: true,
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.2, -0.3], dir: [0.05, 1.3, 0.95], half: 1.25, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { pick: ['s', 'm', 'l'], batch: true, cache: true }, st = { ...D0, pick: [...D0.pick] };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#D8D2C4';
    /* three rows of work, one tower per model: height is the pass rate above 80%, a gold rail is that task's bar, the chosen model is lit */
    const CX = j => -1.75 + j * 0.62, RZ = i => -1.05 + i * 0.75, QH = q => Math.max(0.03, (q - 80) / 20 * 0.6);
    const cells = TASKS.map((t, i) => {
      const row = TIERS.map((tier, j) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, QH(t.q[tier.id]), 0.3, '#fff', { r: 0.03, material: m }); b.position.set(CX(j), 0, RZ(i)); S.add(b); return { m }; });
      const r = P.box(1.72, 0.03, 0.03, SAF, { r: 0.01 }); r.position.set(CX(1), QH(t.bar), RZ(i) + 0.17); S.add(r);
      return row;
    });
    /* the month's bill for each task: gold towers, shortened by batching and caching */
    const bills = TASKS.map((t, i) => { const b = P.tower(0.34, 0.3, '#E3A72F'); b.userData.set({ cap: '' }); b.position.set(0.3, 0, RZ(i)); b.userData.noFit = true; S.add(b); return b; });
    /* batching, caching and the verdict: three lamps */
    const lamps = [0, 1, 2].map(i => { const l = P.lamp(GOOD, { h: i === 2 ? 0.45 : 0.28, r: i === 2 ? 0.13 : 0.09 }); l.position.set(0.95 + i * 0.42, 0, RZ(1)); S.add(l); return l; });
    S.add(P.keep(-2.1, 1.95, 0.8, -1.3, 0.75));

    let R = null;
    function draw() {
      R = cost(st);
      TASKS.forEach((t, i) => TIERS.forEach((tier, j) => {
        const picked = st.pick[i] === tier.id, pass = t.q[tier.id] >= t.bar;
        cells[i][j].m.color.set(picked ? (pass ? GOOD : BAD) : OFF);
      }));
      R.rows.forEach((r, i) => bills[i].userData.set({ h: Math.max(0.03, Math.sqrt(r.c / 900) * 0.7), color: r.pass ? '#E3A72F' : BAD }));
      lamps[0].userData.set({ color: st.batch ? GOOD : OFF, on: st.batch });
      lamps[1].userData.set({ color: st.cache ? GOOD : OFF, on: st.cache });
      lamps[2].userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    const best = () => TASKS.map(t => TIERS.find(tier => t.q[tier.id] >= t.bar).id);
    function isOk() { return R.fails.length === 0 && st.pick.join() === best().join() && st.batch && st.cache; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      ...TASKS.map((t, i) => ({ type: 'buttons', label: t.n, options: TIERS.map(x => x.n), get: () => TIERS.findIndex(x => x.id === st.pick[i]), act: j => { const pk = [...st.pick]; pk[i] = TIERS[j].id; set({ pick: pk }); } })),
      { type: 'toggle', label: 'Batch the overnight tagging', short: 'Batch', get: () => st.batch, set: v => set({ batch: !!v }) },
      { type: 'toggle', label: 'Cache the shared prompt prefix', short: 'Cache', get: () => st.cache, set: v => set({ cache: !!v }) },
    ];
    const readouts = [
      { label: 'Monthly cost', get: () => ({ v: M(R.total), sub: 'all three tasks', good: isOk(), bad: R.total > 200 }) },
      { label: 'Below the bar', get: () => ({ v: `${R.fails.length}`, sub: 'tasks', good: R.fails.length === 0, bad: R.fails.length > 0 }) },
      { label: 'Legal model', get: () => ({ v: TIERS.find(x => x.id === st.pick[2]).n, sub: `bar ${TASKS[2].bar}%`, good: R.rows[2].pass, bad: !R.rows[2].pass }) },
    ];
    const labels = [
      { name: 'g', t: 'Measured pass rates', d: 'Gold rail: the task\'s bar', icon: 'scale', atV: V(-1.97, 0.1, 0.45) },
      { name: 't', t: 'The bill', d: 'Lamps: batch, cache, verdict', icon: 'money', atV: V(1.95, 0.4, -0.3) },
    ];
    const reset = () => set({ ...D0, pick: [...D0.pick] });
    const breaks = [
      { label: 'Use the largest model everywhere', hint: 'pay for unneeded power', on: () => set({ pick: ['l', 'l', 'l'], batch: true, cache: true }), off: reset },
      { label: 'Use the smallest model everywhere', hint: 'legal falls short', on: () => set({ pick: ['s', 's', 's'], batch: true, cache: true }), off: reset },
      { label: 'Skip batching and caching', hint: 'same work, higher bill', on: () => set({ pick: ['s', 'm', 'l'], batch: false, cache: false }), off: reset },
    ];
    function status() {
      const r = R, opt = cost({ pick: best(), batch: true, cache: true }).total;
      if (r.fails.length) return { ok: false, msg: `<b>${r.fails.map(f => `${f.n} on the ${f.tier.n.toLowerCase()} model scores ${f.q}% against a bar of ${f.bar}%`).join('; ')}.</b> It is cheaper, but it fails where failure is expensive. Choose the cheapest model that clears each task\'s measured bar.` };
      if (st.pick.join() !== best().join()) return { ok: false, msg: `<b>Every task clears its bar, but the bill is ${M(r.total)} a month against ${M(opt)} with the cheapest passing model for each.</b> ${st.pick[0] !== 's' ? 'Tagging tickets clears its bar on the small model; the extra capability buys nothing measurable.' : 'Move each task to the cheapest model that clears its bar.'}` };
      if (!st.batch || !st.cache) return { ok: false, msg: `<b>The models are right, but ${!st.batch ? 'overnight tagging is sent for instant answers' : ''}${!st.batch && !st.cache ? ' and ' : ''}${!st.cache ? 'the shared prompt is paid in full on every request' : ''}: ${M(r.total)} a month instead of ${M(opt)}.</b> Batch work that can wait, and cache a long shared prefix.` };
      return { ok: true, msg: `<b>Small for tagging, medium for drafts a person reviews, large for legal escalations: every task clears its measured bar, and with batching and caching the desk spends ${M(r.total)} a month.</b> Prices and pass rates here are illustrative; measure your own.` };
    }
    return { update: dt => bills.forEach(b => b.userData.tick(dt)), currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three kinds of work', home: true, say: 'A support desk tags tickets, drafts replies a person reviews, and handles legal escalations.', act: m => m.set({ pick: ['l', 'l', 'l'], batch: false, cache: false }) },
    { t: 'Set the bar first', home: true, say: 'Decide what good enough means for each task, by what a mistake would cost.', act: m => m.set({ pick: ['l', 'l', 'l'], batch: false, cache: false }) },
    { t: 'Measure, then choose', home: true, say: 'Measure each model on each task\'s eval set. The cheapest that clears the bar wins.', act: m => m.set({ pick: ['s', 'm', 'l'], batch: false, cache: false }) },
    { t: 'Too cheap', home: true, say: 'The smallest model everywhere saves money, but legal escalations fall below their bar.', act: m => m.set({ pick: ['s', 's', 's'], batch: false, cache: false }) },
    { t: 'Batch and cache', home: true, say: 'Overnight tagging can wait for a batch at half price, and a long shared prompt can be cached.', act: m => m.set({ pick: ['s', 'm', 'l'], batch: true, cache: true }) },
    { t: 'Spend where it matters', home: true, say: 'Capability goes where failure is expensive, and nowhere else.', act: m => m.set({ pick: ['s', 'm', 'l'], batch: true, cache: true }) },
  ],
  check: [
    { q: 'How should a model be chosen for a task?', options: ['The cheapest model that clears a measured quality bar', 'Always the largest', 'Always the smallest'], answer: 0, why: 'Bar first, then cost.', hint: 'Try Use the largest model everywhere.' },
    { q: 'What sets a task\'s quality bar?', options: ['What a mistake would cost', 'The model\'s price', 'The prompt length'], answer: 0, why: 'Legal errors cost more than tags.', hint: 'Compare the bars.' },
    { q: 'Which work suits a batch interface?', options: ['Work that can wait, such as overnight tagging', 'Live chat replies', 'Anything urgent'], answer: 0, why: 'Lower price, slower answers.', hint: 'Try Skip batching and caching.' },
  ],
  practice: [
    { q: 'A team uses the largest model for every request. A smaller model scores 96% on their tagging eval, above the 95% bar. What should they do for tagging?', options: ['Switch tagging to the smaller model and keep monitoring', 'Keep the largest model to be safe', 'Lower the bar', 'Stop measuring'], answer: 0, why: 'The extra capability buys nothing the bar requires.' },
    { q: 'Which is the soundest way to compare two models for a task?', options: ['Run both on a representative eval set against a pre-agreed bar', 'Ask which one feels smarter', 'Read the marketing page', 'Try three examples'], answer: 0, why: 'Measured evidence on the real task.' },
    { q: 'Nightly reports are generated from the day\'s tickets and read the next morning. Which lever cuts cost without hurting quality?', options: ['Send them through the batch interface', 'Use the largest model', 'Shorten the eval set', 'Raise the temperature'], answer: 0, why: 'Work that can wait can go through a cheaper, slower queue.' },
    { q: 'Every request repeats the same long system prompt and reference documents. What helps most?', options: ['Cache the shared prefix', 'Paste it twice', 'Move it to the end of each message', 'Use a larger model'], answer: 0, why: 'Cached prefixes are read cheaply on later requests.' },
    { q: 'An interactive assistant must answer in under two seconds. The larger model scores two points higher but takes five seconds. What is the right call?', options: ['Prefer the faster model if it clears the quality bar, since latency is a requirement too', 'Always take the higher score', 'Remove the latency requirement', 'Use both and average'], answer: 0, why: 'Requirements include latency, not only quality.' },
    { q: 'Where is the strongest model most justified in a workflow?', options: ['At the step where an error is most expensive', 'At every step equally', 'Only at the first step', 'Nowhere'], answer: 0, why: 'Spend capability where failure is expensive.' },
  ],
  terms: [
    ['Model tier', 'A size class of model: larger is more capable, slower and costlier.'],
    ['Quality bar', 'The measured pass rate a task must reach.'],
    ['Eval set', 'Representative examples used to measure a model on a task.'],
    ['Token', 'The unit models read and write, and are priced by.'],
    ['Batch interface', 'A slower, cheaper way to send work that can wait.'],
    ['Prompt caching', 'Storing a shared prefix so later requests read it cheaply.'],
  ],
  deeper: '<p><b>Routing.</b> A cheap model can triage each request and pass only the hard ones up, so most traffic never pays for the largest model.</p><p><b>Keep measuring.</b> Re-run the eval when prompts, data or models change; a choice that cleared the bar last quarter may not now.</p><p><b>About this machine.</b> The desk, prices and pass rates are invented; check current official pricing before deciding.</p>',
  code: {
    title: 'Cheapest model that clears the bar',
    note: 'Written for this lesson.',
    text: `
def choose(task, candidates, run_eval):
    # candidates sorted cheapest first; run_eval returns a pass rate on the task's eval set
    for model in candidates:
        if run_eval(model, task.eval_set) >= task.bar:
            return model
    return None                                  # nothing meets the bar: redesign or add review

def monthly_cost(volume, price_per_1k, batchable=False, cached_prefix=False):
    cost = volume / 1000 * price_per_1k
    if batchable:
        cost *= 0.5                              # illustrative batch discount
    if cached_prefix:
        cost *= 0.7                              # illustrative caching saving
    return cost
`,
  },
};
