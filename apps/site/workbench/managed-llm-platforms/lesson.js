// Managed LLM platforms (phase 17, lesson 1): a Lagos fintech serves its support assistant through a hyperscaler platform. Choose on-demand
// shared capacity or a reserved block, set how much of the block traffic would keep busy, run one provider or two behind a gateway, and decide
// whether the data must stay in-region. Monthly cost (in the learner's currency), tail latency against a 150 ms target, and downtime during a
// six-hour provider outage are computed live from illustrative rates.
const HOURS = 730, RES_HR = 30, OD_FULL_HR = 60, OUTAGE = 6;
function plan(o) {
  const od = o.util * OD_FULL_HR * HOURS, res = RES_HR * HOURS, cost = (o.reserved ? res : od) * (o.two ? 1.04 : 1);
  const p50 = o.reserved ? 50 : 75, p99 = o.reserved ? 95 : 220;
  const down = o.two ? 0 : OUTAGE;
  const residencyOk = !o.resident || o.inRegion;
  const breakEven = RES_HR / OD_FULL_HR;
  return { od, res, cost, p50, p99, down, residencyOk, breakEven };
}

export default {
  slug: 'managed-llm-platforms',
  title: 'Managed LLM platforms: capacity, providers and place',
  description: 'A fintech in Lagos serves its assistant through a cloud provider. Weigh on-demand against reserved capacity, add a second provider, and keep data in region.',
  overview: 'You can call a model maker\'s API directly, or reach the same models through a hyperscaler\'s managed platform, which adds its identity and access controls, private network endpoints, compliance agreements and billing. The three big platforms make different bets. AWS Bedrock is a marketplace: Claude, Llama, Mistral, Cohere and Amazon\'s own models behind one API. Azure OpenAI is an exclusive partnership for OpenAI\'s models, with other models in a separate catalogue. Google\'s Vertex AI puts Gemini first, with a model garden for the rest. Capacity comes in two kinds. Shared on-demand capacity is billed per token and competes with everyone else\'s traffic, so its tail latency varies. A reserved block (Azure\'s provisioned throughput units, Bedrock\'s provisioned throughput) is billed by the hour whether busy or idle, and gives steadier latency; it pays off only above a break-even utilisation, typically around half of the block. Cost attribution differs too: tag every call with team and feature so finance can see who spends what. In 2026 the frontier moves monthly between model makers, so single-vendor commitment locks you out of most of it, and an outage takes you down with it. The common practice is a two-provider minimum for product-critical calls, behind a gateway that fails over. Finally, place: all three meet the usual compliance checklists, but data residency (where prompts are processed and logs kept) depends on which regions a model is offered in; for regulated data, that can decide the platform.',
  keywords: ['managed LLM platforms', 'AWS Bedrock', 'Azure OpenAI', 'Vertex AI', 'provisioned throughput', 'multi-provider', 'data residency'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [-0.3, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { reserved: true, util: 0.75, two: true, resident: true, inRegion: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8', CORAL = '#E07A5F';
    /* two cost towers: on-demand at this utilisation against the reserved block; the one in use stands forward */
    const CS = 1 / 43800;
    const odT = P.tower(0.46, 0.46, CORAL, { h: 0.5 }), rsT = P.tower(0.46, 0.46, BLUE, { h: RES_HR * HOURS * CS }); [odT, rsT].forEach(t => t.userData.set({ cap: '' })); odT.position.set(-2.1, 0, -0.5); rsT.position.set(-1.5, 0, -0.5); S.add(odT, rsT);
    const usePad = P.box(0.62, 0.04, 0.62, SAF, { r: 0.03 }); usePad.position.set(-2.1, 0, -0.5); S.add(usePad);
    /* latency: a tall tail on shared capacity, a short one on your own */
    const tail = P.tower(0.3, 0.3, GOOD, { h: 0.3 }); tail.userData.set({ cap: '' }); tail.position.set(-0.75, 0, -0.5); S.add(tail);
    /* a gateway routes to two providers; A is down this morning */
    const gw = P.box(1.8, 0.14, 0.3, '#3B3F52', { r: 0.04 }); gw.position.set(0.8, 0, 0.25); S.add(gw);
    const prov = [0, 1].map(i => {
      const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.62, 0.46, 0.5, '#fff', { r: 0.05, material: m }); b.position.set(0.32 + i * 0.96, 0, -0.5); S.add(b);
      const p = P.pipe([V(0.32 + i * 0.96, 0.14, 0.1), V(0.32 + i * 0.96, 0.14, -0.08), V(0.32 + i * 0.96, 0.14, -0.25)], GOOD, { r: 0.03, n: 3 }); S.add(p);
      const l = P.lamp(GOOD, { h: 0.1, r: 0.08 }); l.position.set(0.32 + i * 0.96, 0.46, -0.5); S.add(l);
      return { m, b, p, l };
    });
    /* a lamp for data kept in the region */
    const stay = P.lamp(GOOD, { h: 0.2, r: 0.1 }); stay.position.set(-1.5, 0, 0.3); S.add(stay);
    S.add(P.keep(-2.4, 1.85, 1.15, -0.8, 0.5));
    const parts = [odT, rsT, tail, ...prov.map(p => p.p)];

    let R = null;
    function draw() {
      R = plan(st);
      odT.userData.set({ h: Math.max(0.05, R.od * CS), color: !st.reserved && st.util > R.breakEven ? BAD : CORAL });
      usePad.position.x = st.reserved ? -1.5 : -2.1;
      tail.userData.set({ h: R.p99 * 0.0035, color: R.p99 > 150 ? BAD : GOOD });
      prov.forEach((Pv, i) => {
        const on = i === 0 || st.two;
        Pv.b.visible = on; Pv.p.visible = on; Pv.l.visible = on;
        Pv.m.color.set(i === 0 ? CORAL : BLUE);
        Pv.l.userData.set({ color: i === 0 ? BAD : GOOD, on: true });
      });
      stay.userData.set({ color: R.residencyOk ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'How busy traffic keeps a reserved block', min: 0.1, max: 1, step: 0.05, get: () => st.util, set: v => set({ util: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Reserve a capacity block instead of on-demand', short: 'Reserved', get: () => st.reserved, set: v => set({ reserved: !!v }) },
      { type: 'toggle', label: 'Two providers behind a gateway', short: 'Two providers', get: () => st.two, set: v => set({ two: !!v }) },
      { type: 'toggle', label: 'Provider A offers the model in an African region', short: 'In-region', get: () => st.inRegion, set: v => set({ inRegion: !!v }) },
    ];
    const readouts = [
      { label: 'This month', get: () => ({ v: M(R.cost), sub: st.reserved ? 'reserved block' : 'on-demand', good: st.reserved ? st.util >= R.breakEven : st.util < R.breakEven, bad: st.reserved ? st.util < R.breakEven : st.util > R.breakEven + 0.15 }) },
      { label: 'Slowest 1%', get: () => ({ v: `${R.p99} ms`, sub: 'target 150 ms', good: R.p99 <= 150, bad: R.p99 > 150 }) },
      { label: 'Downtime', get: () => ({ v: `${R.down} h`, sub: 'in the outage', good: !R.down, bad: R.down > 0 }) },
    ];
    const labels = [
      { name: 'cost', t: 'Cost by utilisation', d: 'Coral: on-demand. Blue: reserved', icon: 'money', atV: V(-2.33, 0.3, -0.5) },
      { name: 'prov', t: 'Providers and a gateway', d: 'One down, the other takes over', icon: 'link', atV: V(1.68, 0.1, 0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Reserve capacity you barely use', hint: '25% busy', on: () => set({ ...D0, util: 0.25 }), off: reset },
      { label: 'Rely on one provider', hint: 'its outage is yours', on: () => set({ ...D0, two: false }), off: reset },
      { label: 'Ignore where the data is processed', hint: 'served from abroad', on: () => set({ ...D0, inRegion: false }), off: reset },
    ];
    function status() {
      if (!R.residencyOk) return { ok: false, msg: '<b>Provider A serves this model only from abroad, so customers\' messages would be processed outside the region the rules require.</b> Every platform ticks the usual compliance boxes; residency depends on which regions offer the model. For regulated data it can decide the provider.' };
      if (st.reserved && st.util < R.breakEven) return { ok: false, msg: `<b>The reserved block costs ${M(R.res)} a month busy or idle; at ${Math.round(st.util * 100)}% utilisation on-demand would cost ${M(R.od)}.</b> Reserving pays only above the break-even, here ${Math.round(R.breakEven * 100)}%. Below it, buy on-demand and accept more variable latency.` };
      if (!st.two) return { ok: false, msg: `<b>Provider A\'s six-hour outage this month is six hours of no support assistant.</b> With the frontier moving between model makers month by month, one provider also locks you out of most of it. Keep two behind a gateway that fails over, for about 4% more.` };
      if (!st.reserved) return { ok: R.p99 <= 150, msg: `<b>On shared on-demand capacity the median reply starts in ${R.p50} ms, but the slowest 1% take ${R.p99} ms, over the 150 ms target, because you compete with everyone else\'s traffic.</b> ${st.util > R.breakEven ? `At ${Math.round(st.util * 100)}% utilisation a reserved block would also be cheaper.` : 'At this utilisation on-demand is cheaper; decide whether the tail matters.'}` };
      return { ok: true, msg: `<b>A reserved block at ${Math.round(st.util * 100)}% utilisation costs ${M(R.cost)} a month, less than on-demand above the ${Math.round(R.breakEven * 100)}% break-even, with the slowest 1% at ${R.p99} ms; a second provider behind the gateway covered the six-hour outage; data stays in region.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A managed platform', home: true, say: 'A fintech in Lagos serves its support assistant through a cloud provider\'s managed model platform.', act: m => m.set({ reserved: false, util: 0.75, two: false, resident: true, inRegion: true }) },
    { t: 'Shared capacity', home: true, say: 'On-demand capacity is billed per token and shared with everyone. The median is fine; the slowest replies are not.', act: m => m.set({ reserved: false, util: 0.75, two: false, resident: true, inRegion: true }) },
    { t: 'A reserved block', home: true, say: 'A reserved block is billed by the hour, busy or idle, with steadier latency. It pays above about half utilisation.', act: m => m.set({ reserved: true, util: 0.75, two: false, resident: true, inRegion: true }) },
    { t: 'Idle capacity', home: true, say: 'Reserve a block you barely use and you pay for empty hours.', act: m => m.set({ reserved: true, util: 0.25, two: false, resident: true, inRegion: true }) },
    { t: 'Two providers', home: true, say: 'One provider\'s outage is your outage. Two behind a gateway fail over.', act: m => m.set({ reserved: true, util: 0.75, two: true, resident: true, inRegion: true }) },
    { t: 'Where the data lives', home: true, say: 'For regulated data, check which regions offer the model. That can decide the platform.', act: m => m.set({ reserved: true, util: 0.75, two: true, resident: true, inRegion: false }) },
  ],
  check: [
    { q: 'When does a reserved capacity block pay off?', options: ['Above its break-even utilisation', 'Always', 'Only for small traffic'], answer: 0, why: 'It costs the same busy or idle.', hint: 'Try Reserve capacity you barely use.' },
    { q: 'Why is on-demand tail latency worse?', options: ['Shared capacity competes with other customers\' traffic', 'The models are smaller', 'It isn\'t'], answer: 0, why: 'Dedicated capacity steadies the tail.', hint: 'Turn off Reserved.' },
    { q: 'Why keep two providers?', options: ['Failover, and access to more of the frontier', 'Lower prices only', 'It is required by law'], answer: 0, why: 'One provider\'s outage is yours.', hint: 'Try Rely on one provider.' },
  ],
  terms: [
    ['Managed platform', 'A cloud provider\'s service for calling hosted models.'],
    ['On-demand capacity', 'Shared, billed per token, variable latency.'],
    ['Provisioned throughput', 'Reserved capacity billed by the hour.'],
    ['Break-even utilisation', 'The usage above which reserving costs less.'],
    ['Two-provider minimum', 'Every critical model call has a second provider.'],
    ['Data residency', 'Where data is processed and stored.'],
  ],
  deeper: '<p><b>Cost attribution.</b> Tag every call with team, product and feature, through a platform\'s inference profiles, per-team projects and labels, or a gateway, so spend can be traced.</p><p><b>Abuse monitoring.</b> Platforms differ in how long they keep prompts and whether they review traffic; enterprise agreements often allow opting out.</p><p><b>About this machine.</b> Rates, latencies and the outage are illustrative, set in US dollars and shown in your currency; the comparisons are computed live.</p>',
  code: {
    title: 'Reserve or not, and fail over',
    note: 'Written for this lesson.',
    text: `
def monthly(util, reserved_per_hour, on_demand_full_per_hour, hours=730):
    on_demand = util * on_demand_full_per_hour * hours   # scales with traffic
    reserved = reserved_per_hour * hours                 # busy or idle
    break_even = reserved_per_hour / on_demand_full_per_hour
    return on_demand, reserved, break_even

def call(prompt, providers, region):
    for p in providers:                                  # two-provider minimum
        if region not in p.regions_for(model): continue  # residency first
        try:
            return p.complete(prompt, tags={"team": "support", "feature": "chat"})
        except (Timeout, ProviderDown):
            continue
    raise AllProvidersDown()
`,
  },
};
