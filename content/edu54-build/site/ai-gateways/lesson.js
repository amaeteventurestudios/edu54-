// AI gateways (phase 17, lesson 19): a Kigali fintech calls three providers. A gateway is one process with one API in front of them: routing, fallback, retries, rate limits, secrets, observability, guardrails.
// Comparison machine: the same traffic goes through LiteLLM, Portkey or Kong. Ceilings and fits follow the course's notes on each. A provider outage shows fallback; a high rate shows which gateway copes.
const GW = {
  none: { n: 'No gateway', rps: 99999, ms: 0, guard: false, fall: false, self: true },
  lite: { n: 'LiteLLM', rps: 500, ms: 8, guard: false, fall: true, self: true },
  port: { n: 'Portkey', rps: 2000, ms: 30, guard: true, fall: true, self: true },
  kong: { n: 'Kong AI Gateway', rps: 8000, ms: 6, guard: false, fall: true, self: true },
  edge: { n: 'A managed edge gateway', rps: 5000, ms: 15, guard: false, fall: true, self: false },
};
function run(o) {
  const g = GW[o.gw];
  const down = o.outage ? (g.fall && o.fallback ? 0.3 : 33) : 0;
  const over = o.rps > g.rps;
  const pii = o.must && !g.guard, resid = o.local && !g.self;
  const apps = o.gw === 'none' ? 3 : 1;
  return { g, down, over, pii, resid, apps, err: over ? Math.min(60, Math.round((o.rps / g.rps - 1) * 40)) + down : down };
}

export default {
  slug: 'ai-gateways',
  title: 'AI gateways: one door to every provider',
  description: 'Three providers, three SDKs. Put one gateway in front, then push traffic until the wrong choice falls over.',
  overview: 'A product that calls three providers has three SDKs, error models, rate limits and sets of keys. Building failover into each app ties everything to everything. A gateway is a single process with one API that fans out to providers. It gives you seven things in one place: routing, fallback, retries, rate limits, secrets, observability and guardrails. The tools differ in where they fit. LiteLLM is a fine Python gateway for moderate traffic, and struggles under sustained high load. Portkey bundles guardrails and audit trails, at some latency. Kong suits large-scale teams already on it. Managed gateways are easy, but your data leaves your network. Choose by rate, regulation and residency.',
  keywords: ['AI gateway', 'LiteLLM', 'Portkey', 'Kong', 'fallback', 'rate limits', 'guardrails'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { gw: 'lite', rps: 200, outage: true, fallback: true, must: false, local: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const AZ = [-0.45, 0, 0.45], PZ = [-0.5, 0, 0.5];
    const apps = AZ.map(z => { const b = P.box(0.5, 0.3, 0.32, BLUE, { r: 0.04 }); b.position.set(-2.1, 0.03, z); S.add(b); return b; });
    const door = (() => { const m = new S.THREE.MeshLambertMaterial({ color: SAF }), b = P.box(0.5, 0.75, 1.1, '#fff', { r: 0.05, material: m }); b.position.set(-0.3, 0.03, 0); S.add(b); return { b, m }; })();
    const inP = AZ.map(z => add(P.pipe([V(-1.85, 0.2, z), V(-0.55, 0.3, z * 0.3)], SAF, { r: 0.04, n: 3, speed: 0.7 })));
    const outP = PZ.map(z => add(P.pipe([V(-0.05, 0.3, z * 0.3), V(1.3, 0.25, z)], SAF, { r: 0.04, n: 3, speed: 0.7 })));
    const prov = PZ.map((z, i) => add(P.robot(['#7B6FA8', '#3E9B9B', '#A87A4F'][i], { scale: 0.6 })));
    prov.forEach((r, i) => r.position.set(1.55, 0.03, PZ[i]));
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.12 })); lamp.position.set(2.3, 0.03, 0);
    S.add(P.keep(-2.5, 2.5, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      door.b.visible = st.gw !== 'none'; door.m.color.set(R.over ? BAD : SAF);
      prov[0].userData.set({ color: st.outage ? '#B5462F' : '#7B6FA8', busy: !st.outage });
      prov[1].userData.set({ busy: true }); prov[2].userData.set({ busy: true });
      outP[0].userData.set({ on: !st.outage, pipe: st.outage ? '#D9483B' : '#B9B3A6' });
      lamp.userData.set({ color: R.err < 2 && !R.pii && !R.resid ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const GK = ['none', 'lite', 'port', 'kong', 'edge'];
    const controls = [
      { type: 'buttons', label: 'In front of the providers', options: ['Nothing', 'LiteLLM', 'Portkey', 'Kong', 'Managed'], get: () => GK.indexOf(st.gw), act: i => set({ gw: GK[i] }) },
      { type: 'slider', label: 'Requests per second', min: 50, max: 6000, step: 50, get: () => st.rps, set: v => set({ rps: v }) },
      { type: 'toggle', label: 'One provider is down', short: 'Outage', get: () => st.outage, set: v => set({ outage: !!v }) },
      { type: 'toggle', label: 'Fallback on errors', short: 'Fallback', get: () => st.fallback, set: v => set({ fallback: !!v }) },
      { type: 'toggle', label: 'Regulator wants PII redaction and audit', short: 'Regulated', get: () => st.must, set: v => set({ must: !!v }) },
      { type: 'toggle', label: 'Data must stay in the country', short: 'Residency', get: () => st.local, set: v => set({ local: !!v }) },
    ];
    const readouts = [
      { label: 'Errors', get: () => ({ v: `${R.err.toFixed(R.err < 1 ? 1 : 0)}%`, sub: st.outage ? 'with one provider down' : 'all providers up', good: R.err < 2, bad: R.err > 10 }) },
      { label: 'Added delay', get: () => ({ v: `${R.g.ms} ms`, sub: R.g.n }) },
      { label: 'Places holding keys', get: () => ({ v: `${R.apps}`, sub: R.apps > 1 ? 'one per app' : 'the gateway only', good: R.apps === 1, bad: R.apps > 1 }) },
    ];
    const labels = [
      { name: 'a', t: 'Three apps', d: 'One API, one set of keys', icon: 'box', atV: V(-2.35, 0.2, 0) },
      { name: 'l', t: 'Three providers', d: 'Lamp: is the service healthy?', icon: 'link', atV: V(2.45, 0.6, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No gateway in an outage', hint: 'every app fails alone', on: () => set({ ...D0, gw: 'none' }), off: reset },
      { label: 'LiteLLM at peak traffic', hint: 'past its comfortable range', on: () => set({ ...D0, rps: 3000, outage: false }), off: reset },
      { label: 'Regulated, no guardrails', hint: 'a gateway that only routes', on: () => set({ ...D0, must: true, outage: false }), off: reset },
      { label: 'Managed gateway, local data', hint: 'data leaves the country', on: () => set({ ...D0, gw: 'edge', local: true, outage: false }), off: reset },
    ];
    function status() {
      if (st.gw === 'none' && st.outage) return { ok: false, msg: `<b>${Math.round(R.err)}% of requests failed with the provider.</b> Each of three apps must notice, retry and switch by itself, and each holds its own keys. A gateway does that once.` };
      if (R.over) return { ok: false, msg: `<b>${st.rps} requests a second is beyond ${R.g.n}'s range, and ${Math.round(R.err)}% fail.</b> The gateway became the outage. Its own limits count once it sits in the path of everything.` };
      if (R.pii) return { ok: false, msg: `<b>${R.g.n} routes well and leaves PII redaction to you.</b> Regulated work needs guardrails and audit trails at the door. Portkey bundles those, at 20 to 40 ms per request.` };
      if (R.resid) return { ok: false, msg: '<b>Customer data now leaves the country through a managed gateway.</b> Zero operations is attractive, but residency rules decide. Self-host when data must stay put.' };
      if (st.outage && !st.fallback) return { ok: false, msg: `<b>${Math.round(R.err)}% failed: the gateway is there, and fallback is off.</b> On a rate-limit or server error, try the next provider. That is the main reason to have one.` };
      return { ok: true, msg: `<b>${R.err.toFixed(1)}% errors at ${st.rps} requests a second, adding ${R.g.ms} ms.</b> ${st.outage ? 'Traffic moved to the other providers.' : 'One API, one set of keys, one place to look.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three of everything', home: true, say: 'A fintech in Kigali has three apps and three providers. One provider goes down, and each app fails on its own.', act: m => m.set({ gw: 'none', rps: 200, outage: true, fallback: true, must: false, local: false }) },
    { t: 'One door', home: true, say: 'Put a gateway in front. One API, one store of keys, and traffic moves when a provider fails.', act: m => m.set({ gw: 'lite', rps: 200, outage: true, fallback: true, must: false, local: false }) },
    { t: 'Know its limits', home: true, say: 'Push traffic high, and a gateway suited to moderate load starts failing. Now it is the outage.', act: m => m.set({ gw: 'lite', rps: 3000, outage: false, fallback: true, must: false, local: false }) },
    { t: 'Scale', home: true, say: 'A gateway built for scale holds at that rate. Benchmarks here come from vendors, so test your own.', act: m => m.set({ gw: 'kong', rps: 3000, outage: false, fallback: true, must: false, local: false }) },
    { t: 'Regulation', home: true, say: 'A regulator wants personal data removed and an audit trail. A gateway with guardrails provides them, at some delay.', act: m => m.set({ gw: 'port', rps: 800, outage: false, fallback: true, must: true, local: false }) },
    { t: 'Residency', home: true, say: 'A managed gateway needs no operations, but your data leaves the country. Choose by rate, rules and where data may go.', act: m => m.set({ gw: 'edge', rps: 800, outage: false, fallback: true, must: false, local: true }) },
  ],
  check: [
    { q: 'What is the main benefit of a gateway?', options: ['One place for routing, fallback, keys and logs', 'Faster models', 'Cheaper tokens by itself'], answer: 0, why: 'It stops every app from solving this alone.', hint: 'Try No gateway in an outage.' },
    { q: 'What new risk does a gateway add?', options: ['It can become the outage', 'It changes model output', 'It removes logs'], answer: 0, why: 'Everything now goes through it.', hint: 'Try LiteLLM at peak traffic.' },
    { q: 'When should you avoid a managed gateway?', options: ['When data must stay in the country', 'When you have few apps', 'When traffic is low'], answer: 0, why: 'Residency rules decide.', hint: 'Try Managed gateway, local data.' },
  ],
  terms: [
    ['AI gateway', 'One service in front of many model providers.'],
    ['Fallback', 'Trying another provider on failure.'],
    ['Rate limit', 'A cap on requests.'],
    ['Guardrails', 'Checks on inputs and outputs.'],
    ['PII', 'Personal information.'],
    ['Data residency', 'Rules on where data may be stored.'],
  ],
  deeper: '<p><b>Figures.</b> Ranges here follow the course\'s notes. LiteLLM suits under about 500 requests a second, and Portkey adds 20 to 40 ms. Kong\'s benchmark is its own. Test on your traffic.</p><p><b>Bifrost and others.</b> Newer gateways keep arriving. Compare them on the same seven features.</p><p><b>Keep the app thin.</b> Use one API shape so that swapping gateways stays cheap.</p>',
  code: {
    title: 'A fallback recipe',
    note: 'A sketch of the gateway config in the course (code/main.py).',
    text: `
router = Router(model_list=[
    {"model_name": "chat", "litellm_params": {"model": "anthropic/claude-sonnet-5-5"}},
    {"model_name": "backup", "litellm_params": {"model": "openai/gpt-5"}},
], fallbacks=[{"chat": ["backup"]}], num_retries=2)

reply = router.completion(model="chat", messages=messages)
`,
  },
};
