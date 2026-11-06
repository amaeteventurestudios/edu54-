// Prompt and semantic caching (phase 17, lesson 14): a Kumasi insurer's FAQ bot takes 1000 requests. Two layers: a semantic cache that skips the model on a similar question, and a provider prefix cache that re-reads a stable prompt.
// Prices follow the course: a 5-minute write costs 1.25× input, a 1-hour write 2×, a read 0.1×. A date in the prompt or fan-out before the first write collapses the hits. Costs are computed from these.
const N = 1000, PRE = 2, TAIL = 0.3, OUT = 1;
function run(o) {
  const semHit = o.sem ? (o.th >= 0.95 ? 0.2 : o.th >= 0.9 ? 0.35 : 0.55) : 0;
  const wrong = o.sem ? Math.round(N * semHit * (o.th >= 0.95 ? 0 : o.th >= 0.9 ? 0.03 : 0.2)) : 0;
  const calls = N * (1 - semHit);
  let pHit = o.cache ? 0.9 : 0;
  if (o.date) pHit = 0.07 * (o.cache ? 1 : 0);
  if (o.par) pHit = Math.min(pHit, 0);
  const wr = o.cache ? (o.ttl === 60 ? 2 : 1.25) : 1;
  const inCost = calls * PRE * (pHit * 0.1 + (1 - pHit) * wr);
  const cost = (inCost + calls * TAIL + calls * OUT * 5) / 1000;
  const base = (N * PRE + N * TAIL + N * OUT * 5) / 1000;
  return { semHit, wrong, pHit, cost, base, save: 1 - cost / base };
}

export default {
  slug: 'prompt-semantic-caching',
  title: 'Prompt and semantic caching: two layers, two traps',
  description: 'Your bill stays flat with caching on. See how one timestamp, or ten parallel calls, wipes it out.',
  overview: 'Caching happens at two layers. Prompt caching at the provider re-reads a stored prefix at about a tenth of the input price, and writing it costs a little more. Semantic caching sits in front: if a new question is close enough to an old one, you answer from your own store and skip the model altogether. Both have traps. A date in the system prompt means every request writes and nothing reads. Ten parallel calls all arrive before the first write finishes, so all ten pay to write. And a loose similarity threshold saves money by giving people the wrong answer. Measure hit rate, then cost, and read the prices for your provider.',
  keywords: ['prompt caching', 'semantic cache', 'cache_control', 'LLM costs', 'hit rate', 'inference economics'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.68, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { sem: true, th: 0.95, cache: true, ttl: 5, date: false, par: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const belt = add(P.belt(V(-2.4, 0, 0.1), V(1.0, 0, 0.1), { w: 0.34, speed: 1.2 }));
    const shelfA = add(P.shelf(5, { cell: 0.24, d: 0.3, lh: 0.28 })); shelfA.position.set(-1.25, 0.03, -0.5);
    const shelfB = add(P.shelf(5, { cell: 0.24, d: 0.3, lh: 0.28 })); shelfB.position.set(0.1, 0.03, -0.5);
    const model = add(P.robot('#7B6FA8', { scale: 1 })); model.position.set(1.4, 0.03, 0);
    const jar = add(P.jar(0.3, 0.8, { max: 14 })); jar.position.set(2.2, 0.03, 0.1);
    const wrong = add(P.stack(0.5, 0.4, 0.1, { max: 6, color: BAD })); wrong.position.set(-1.25, 0.03, 0.55);
    S.add(P.keep(-2.5, 2.55, 1.15, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      shelfA.userData.set({ fill: Array.from({ length: 5 }, (_, i) => i < Math.round(R.semHit * 9) ? BLUE : null) });
      shelfB.userData.set({ fill: Array.from({ length: 5 }, (_, i) => i < Math.round(R.pHit * 5) ? GOOD : (st.cache && i === 0 ? BAD : null)) });
      jar.userData.set({ n: Math.max(1, Math.round(R.cost / 8 * 14 * 0.72)) });
      wrong.userData.set({ n: Math.min(6, Math.ceil(R.wrong / 20)), colors: Array(6).fill(BAD) });
      model.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const TT = [5, 60];
    const controls = [
      { type: 'toggle', label: 'Semantic cache in front', short: 'Semantic', get: () => st.sem, set: v => set({ sem: !!v }) },
      { type: 'slider', label: 'Similarity needed', min: 0.8, max: 0.99, step: 0.01, get: () => st.th, set: v => set({ th: v }) },
      { type: 'toggle', label: 'Provider prompt cache', short: 'Prompt cache', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'buttons', label: 'Cache lifetime', options: ['5 minutes', '1 hour'], get: () => TT.indexOf(st.ttl), act: i => set({ ttl: TT[i] }) },
      { type: 'toggle', label: 'The time is at the top of the prompt', short: 'Date in prompt', get: () => st.date, set: v => set({ date: !!v }) },
      { type: 'toggle', label: 'Ten parallel calls before the first write', short: 'Fan-out', get: () => st.par, set: v => set({ par: !!v }) },
    ];
    const readouts = [
      { label: 'Cost per 1000 requests', get: () => ({ v: M(R.cost), sub: `no caching: ${M(R.base)}`, good: R.cost < R.base * 0.75, bad: R.cost >= R.base }) },
      { label: 'Prompt cache hit rate', get: () => ({ v: `${Math.round(R.pHit * 100)}%`, sub: 'measure this first', good: R.pHit > 0.7, bad: st.cache && R.pHit < 0.2 }) },
      { label: 'Wrong answers served', get: () => ({ v: `${R.wrong}`, sub: `${Math.round(R.semHit * 100)}% skipped the model`, good: !R.wrong, bad: R.wrong > 0 }) },
    ];
    const labels = [
      { name: 'a', t: 'Two shelves', d: 'Semantic, then prompt cache', icon: 'box', atV: V(-2.0, 0.2, -0.5) },
      { name: 'j', t: 'What you pay', d: 'Coral stack: wrong answers', icon: 'money', atV: V(2.5, 0.5, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put the time in the system prompt', hint: 'every prompt is new', on: () => set({ ...D0, date: true }), off: reset },
      { label: 'Fan out before the first write', hint: 'ten writes, no reads', on: () => set({ ...D0, par: true }), off: reset },
      { label: 'Loosen similarity to save more', hint: 'near isn\'t the same', on: () => set({ ...D0, th: 0.85 }), off: reset },
    ];
    function status() {
      if (st.cache && st.date) return { ok: false, msg: `<b>Hit rate ${Math.round(R.pHit * 100)}%, and you pay the write premium on nearly every call: ${M(R.cost)}.</b> The prompt looks static, but its top line changes each minute. Move anything that changes below the cached part.` };
      if (st.cache && st.par) return { ok: false, msg: `<b>Caching is on, and you paid ${M(R.cost)} against ${M(R.base)} without it.</b> Parallel calls all arrived before the first write finished, so each one wrote. Make one call first, then fan out.` };
      if (R.wrong) return { ok: false, msg: `<b>${Math.round(R.semHit * 100)}% of requests skipped the model, and ${R.wrong} got the wrong answer.</b> "Does my policy cover floods?" sits close to "Does my policy cover fire?" Saving money by answering a different question is not saving.` };
      if (st.cache && st.ttl === 60) return { ok: true, msg: `<b>${M(R.cost)}, with a 1-hour lifetime.</b> Writes cost 2× instead of 1.25×. That pays only if traffic is so sparse that a 5-minute cache would expire between calls.` };
      return { ok: R.cost < R.base, msg: `<b>${M(R.cost)} against ${M(R.base)}: ${Math.round(R.save * 100)}% saved.</b> ${st.cache ? `A ${Math.round(R.pHit * 100)}% hit rate on the stable prefix does most of it.` : 'Add the prompt cache for the stable part.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 0.7 && belt.userData.count() < 4) { u = 0; belt.userData.send('#F4F1EA', { size: 0.17 }); }
      },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Caching on, bill flat', home: true, say: 'An insurer in Kumasi turns on prompt caching, and the bill doesn\'t move. Hit rate is seven percent.', act: m => m.set({ sem: false, th: 0.95, cache: true, ttl: 5, date: true, par: false }) },
    { t: 'The moving top line', home: true, say: 'The prompt starts with the time, so every prompt is new. Move that lower, and hits reach ninety percent.', act: m => m.set({ sem: false, th: 0.95, cache: true, ttl: 5, date: false, par: false }) },
    { t: 'The fan-out', home: true, say: 'An agent fires ten calls at once. All arrive before the first write finishes, so all ten write and none read.', act: m => m.set({ sem: false, th: 0.95, cache: true, ttl: 5, date: false, par: true }) },
    { t: 'A semantic layer', home: true, say: 'A semantic cache sits in front. When a question closely matches an old one, the model isn\'t called at all.', act: m => m.set({ sem: true, th: 0.95, cache: true, ttl: 5, date: false, par: false }) },
    { t: 'Near isn\'t the same', home: true, say: 'Loosen the match to save more, and flood questions get fire answers.', act: m => m.set({ sem: true, th: 0.85, cache: true, ttl: 5, date: false, par: false }) },
    { t: 'Measure, then trust', home: true, say: 'Keep the match tight, keep the prefix stable, and measure the hit rate before you believe the savings.', act: m => m.set({ sem: true, th: 0.95, cache: true, ttl: 5, date: false, par: false }) },
  ],
  check: [
    { q: 'Why can a date in a system prompt ruin caching?', options: ['Every prompt becomes a new prefix', 'Dates are expensive', 'It breaks the schema'], answer: 0, why: 'Anything that changes above the cached part stops reads.', hint: 'Try Put the time in the system prompt.' },
    { q: 'Why can parallel calls cost more with caching on?', options: ['All write before any can read', 'They use a bigger model', 'They skip the cache'], answer: 0, why: 'Make one call first, then fan out.', hint: 'Try Fan out before the first write.' },
    { q: 'What is the risk of a loose semantic threshold?', options: ['Serving the wrong answer', 'Higher cost', 'Slower cache'], answer: 0, why: 'Similar questions can need different answers.', hint: 'Try Loosen similarity to save more.' },
  ],
  terms: [
    ['Prompt caching', 'The provider reuses a stored prefix.'],
    ['Semantic caching', 'Answering from your own store when a question is similar.'],
    ['Cache write', 'Storing a prefix, usually at a premium.'],
    ['Cache read', 'Reusing it, at about a tenth of the input price.'],
    ['TTL', 'How long an entry lives.'],
    ['Hit rate', 'The share of requests served from cache.'],
  ],
  deeper: '<p><b>Check your provider.</b> Some mark blocks by hand, others cache long prompts automatically. Premiums and lifetimes differ and change.</p><p><b>Semantic hit rates.</b> Community reports run from about 10% for open chat to about 70% for structured FAQs. These are not vendor numbers.</p><p><b>Stacking.</b> The next lesson adds batch pricing on top.</p>',
  code: {
    title: 'Mark the stable part',
    note: 'Adapted from the course\'s caching sketch (code/main.py).',
    text: `
client.messages.create(
    model=MODEL,
    max_tokens=500,
    system=[{"type": "text", "text": STABLE_POLICY_TEXT,
             "cache_control": {"type": "ephemeral"}}],   # fixed part only
    messages=[{"role": "user", "content": f"{now()}\\n{question}"}],  # changes go last
)
`,
  },
};
