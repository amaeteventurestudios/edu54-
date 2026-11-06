// LLM observability stack (phase 17, lesson 13): six tools, four questions. A Rabat retailer answers on stack, licence, budget and self-hosting, and tools drop out like tiles in a sorter. Gateways and development
// platforms are different kinds of tool, and OpenTelemetry joins them. At very high volume, storage dominates, so a zero-copy lake changes the bill. Round figures, marked in the panel.
const TOOL = [
  { n: 'Langfuse', kind: 'dev', open: true, self: true, fit: 'any', cost: 1 },
  { n: 'LangSmith', kind: 'dev', open: false, self: false, fit: 'langchain', cost: 2 },
  { n: 'Phoenix', kind: 'dev', open: false, self: true, fit: 'rag', cost: 0 },
  { n: 'Arize AX', kind: 'dev', open: false, self: false, fit: 'scale', cost: 3 },
  { n: 'Helicone', kind: 'gw', open: true, self: true, fit: 'any', cost: 1 },
  { n: 'Opik', kind: 'dev', open: true, self: true, fit: 'any', cost: 1 },
];
function run(o) {
  const pass = TOOL.map(t => (!o.mustSelf || t.self) && (!o.mustOpen || t.open) && t.cost <= o.budget && (t.fit !== 'langchain' || o.stack === 'langchain'));
  const gw = TOOL.some((t, i) => pass[i] && t.kind === 'gw'), dev = TOOL.some((t, i) => pass[i] && t.kind === 'dev');
  const need = o.need === 'both' ? gw && dev : o.need === 'dev' ? dev : gw;
  const big = o.vol >= 7, mono = Math.pow(10, o.vol - 5) * 40, lake = mono / 100;
  return { pass, gw, dev, need, big, mono, lake, left: pass.filter(Boolean).length, glue: o.need === 'both' && o.otel };
}

export default {
  slug: 'llm-observability',
  title: 'Choosing an LLM observability stack',
  description: 'Six tools that aren\'t solving the same problem. Answer four questions, and let the sorter thin them out.',
  overview: 'Search for LLM observability and you get eight tools at three price points all claiming the same thing. They aren\'t the same. Development platforms bundle traces with evaluations, prompts and datasets. Gateway tools sit on your inference calls and report tokens, latency and cost. LangSmith answers why a LangGraph run failed, Phoenix asks if your RAG is drifting, Helicone shows which app burns tokens, Langfuse lets you self-host the lot. Four questions narrow it down: your stack, your licence rules, your budget, whether you must self-host. And you may want two tools, joined by OpenTelemetry. At very large volume, the storage bill dominates, which is what a zero-copy design targets.',
  keywords: ['LLM observability', 'Helicone', 'Langfuse', 'LangSmith', 'Arize', 'OpenTelemetry', 'gateway'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { stack: 'raw', mustOpen: true, mustSelf: true, budget: 1, need: 'both', otel: true, vol: 5 }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.95 + i * 0.62;
    const tiles = TOOL.map((t, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.5, 0.4, 0.5, '#fff', { r: 0.05, material: m }); b.position.set(X(i), 0.03, -0.3); b.userData.noFit = true; S.add(b); return { b, m, y: 0.03, to: 0.03 }; });
    const hole = P.box(3.9, 0.02, 0.7, '#BFB8A8', { r: 0.03 }); hole.position.set(-0.4, 0.02, -0.3); S.add(hole);
    const glue = add(P.pipe([V(-1.3, 0.2, 0.5), V(0, 0.2, 0.42), V(1.2, 0.2, 0.5)], SAF, { r: 0.05, n: 6, speed: 0.5 }));
    const a = P.box(0.5, 0.36, 0.4, BLUE, { r: 0.04 }); a.position.set(-1.55, 0.03, 0.5); S.add(a);
    const b = P.box(0.5, 0.36, 0.4, GOOD, { r: 0.04 }); b.position.set(1.45, 0.03, 0.5); S.add(b);
    const bill = add(P.tower(0.45, 0.45, '#7B6FA8')); bill.position.set(2.15, 0.03, -0.3); bill.userData.set({ cap: '' });
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      tiles.forEach((T, i) => { const on = R.pass[i]; T.to = on ? 0.03 : -0.32; T.m.color.set(on ? (TOOL[i].kind === 'gw' ? BLUE : GOOD) : GREY); });
      glue.userData.set({ on: R.glue, pipe: R.glue ? '#B9B3A6' : '#E0DBCE' });
      a.visible = st.need !== 'dev'; b.visible = st.need !== 'gw';
      bill.userData.set({ h: Math.max(0.05, Math.min(1.2, (st.vol - 3) * 0.24)) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true)); tiles.forEach(T => { T.y = T.to; T.b.position.y = T.y; });
    const set = p => { Object.assign(st, p); draw(); };
    const SK = ['raw', 'langchain'], NK = ['both', 'dev', 'gw'];
    const controls = [
      { type: 'buttons', label: 'Your stack', options: ['Raw SDK', 'LangChain'], get: () => SK.indexOf(st.stack), act: i => set({ stack: SK[i] }) },
      { type: 'buttons', label: 'You need', options: ['Both kinds', 'Dev platform', 'Gateway'], get: () => NK.indexOf(st.need), act: i => set({ need: NK[i] }) },
      { type: 'toggle', label: 'Open licence only', short: 'Open only', get: () => st.mustOpen, set: v => set({ mustOpen: !!v }) },
      { type: 'toggle', label: 'Must self-host', short: 'Self-host', get: () => st.mustSelf, set: v => set({ mustSelf: !!v }) },
      { type: 'slider', label: 'Budget', min: 0, max: 3, step: 1, get: () => st.budget, set: v => set({ budget: v }), fmt: v => ['free', 'small', 'medium', 'large'][v] },
      { type: 'toggle', label: 'Join tools with OpenTelemetry', short: 'OTel glue', get: () => st.otel, set: v => set({ otel: !!v }) },
      { type: 'slider', label: 'Traces a day, power of ten', min: 4, max: 8, step: 1, get: () => st.vol, set: v => set({ vol: v }), fmt: v => `10^${v}` },
    ];
    const readouts = [
      { label: 'Tools left', get: () => ({ v: `${R.left} of 6`, sub: TOOL.filter((t, i) => R.pass[i]).map(t => t.n).join(', ').slice(0, 40) || 'none', good: R.need, bad: !R.need }) },
      { label: 'Monthly storage, all-in-one', get: () => ({ v: M(R.mono), sub: 'round figure' }) },
      { label: 'With a zero-copy lake', get: () => ({ v: M(R.lake), sub: 'the ~100× claim', good: R.big }) },
    ];
    const labels = [
      { name: 't', t: 'Six tools in a sorter', d: 'Blue gateway, teal platform', icon: 'box', atV: V(X(0) - 0.25, 0.25, -0.3) },
      { name: 'b', t: 'Volume', d: 'Storage bill grows with it', icon: 'money', atV: V(2.38, 0.2, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Filter out everything', hint: 'free, open, gateway and platform', on: () => set({ ...D0, budget: 0 }), off: reset },
      { label: 'Two tools with no glue', hint: 'traces don\'t line up', on: () => set({ ...D0, otel: false }), off: reset },
      { label: 'All-in-one at huge volume', hint: 'a storage bill', on: () => set({ ...D0, mustOpen: false, mustSelf: false, budget: 3, vol: 8 }), off: reset },
    ];
    function status() {
      if (!R.need) return { ok: false, msg: `<b>Your rules leave ${R.left} tool${R.left === 1 ? '' : 's'}, and not the kind you need.</b> Free, open and self-hosted still costs someone's time. Loosen one rule, and write down why.` };
      if (st.need === 'both' && !st.otel) return { ok: false, msg: '<b>Two tools, two stories.</b> The gateway has the costs and the platform has the evaluations, and no shared trace id links a bad score to its bill. OpenTelemetry is the glue.' };
      if (st.vol >= 7) return { ok: false, msg: `<b>${M(R.mono)} a month on trace storage.</b> At this volume, keeping traces in your own lake and letting the tool read them is said to cost about a hundredth. Check that claim on your own data.` };
      return { ok: true, msg: `<b>${R.left} tools pass: ${TOOL.filter((t, i) => R.pass[i]).map(t => t.n).join(', ')}.</b> ${st.need === 'both' ? 'A gateway for costs and a platform for evaluations, joined by OpenTelemetry.' : 'One tool is enough for this need.'}` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); tiles.forEach(T => { T.y += (T.to - T.y) * Math.min(1, dt * 6); T.b.position.y = T.y; }); },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Six tools', home: true, say: 'A retailer in Rabat shipped an LLM feature and sees nothing. Six tools all claim to help. They do different jobs.', act: m => m.set({ stack: 'raw', mustOpen: false, mustSelf: false, budget: 3, need: 'both', otel: true, vol: 5 }) },
    { t: 'Two kinds', home: true, say: 'Development platforms bundle evaluations and prompts. Gateways sit on your calls and report tokens and cost.', act: m => m.set({ stack: 'raw', mustOpen: false, mustSelf: false, budget: 2, need: 'both', otel: true, vol: 5 }) },
    { t: 'Ask four questions', home: true, say: 'Your stack, your licence rules, your budget, and whether you must self-host. Each answer drops some tiles.', act: m => m.set({ stack: 'raw', mustOpen: true, mustSelf: true, budget: 1, need: 'both', otel: true, vol: 5 }) },
    { t: 'Glue', home: true, say: 'Use two tools, and join them with OpenTelemetry, so a bad score lines up with its cost.', act: m => m.set({ stack: 'raw', mustOpen: true, mustSelf: true, budget: 1, need: 'both', otel: true, vol: 5 }) },
    { t: 'Without glue', home: true, say: 'Without shared traces, each tool tells its own story, and nobody can link them.', act: m => m.set({ stack: 'raw', mustOpen: true, mustSelf: true, budget: 1, need: 'both', otel: false, vol: 5 }) },
    { t: 'At scale', home: true, say: 'At tens of millions of traces a day, storage is the bill. A zero-copy lake is built for that.', act: m => m.set({ stack: 'raw', mustOpen: false, mustSelf: false, budget: 3, need: 'both', otel: true, vol: 8 }) },
  ],
  check: [
    { q: 'What separates a gateway tool from a development platform?', options: ['Gateways watch calls; platforms add evaluations and prompts', 'Gateways are always paid', 'Platforms have no traces'], answer: 0, why: 'They answer different questions.', hint: 'See Two kinds.' },
    { q: 'What joins two observability tools?', options: ['OpenTelemetry', 'A CSV export', 'A shared prompt'], answer: 0, why: 'Shared traces link scores and costs.', hint: 'Try Two tools with no glue.' },
    { q: 'What does a zero-copy design target?', options: ['Storage cost at very high volume', 'Prompt quality', 'Model speed'], answer: 0, why: 'Traces stay in your own lake.', hint: 'Slide the volume up.' },
  ],
  terms: [
    ['Gateway tool', 'Records every inference call.'],
    ['Development platform', 'Traces plus evaluations, prompts and datasets.'],
    ['OpenTelemetry', 'An open standard for traces.'],
    ['Zero-copy', 'Reading data where it sits, in your own storage.'],
    ['Self-host', 'Running the tool on your own machines.'],
    ['Drift', 'Slow change in inputs or quality.'],
  ],
  deeper: '<p><b>Tiers here.</b> Budget steps and storage bills are round figures. Pricing and licences change, so check before you decide. The earlier lesson on Langfuse, Phoenix and Opik goes deeper on those three.</p><p><b>Start small.</b> One tool with traces and a few scores beats a grand plan that never ships.</p><p><b>The 100× claim.</b> It is a vendor\'s figure. Test it on your own data.</p>',
  code: {
    title: 'Trace to both tools',
    note: 'A sketch of the OpenTelemetry-glue pattern in the course (code/main.py).',
    text: `
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(GATEWAY_URL)))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(EVAL_URL)))
trace.set_tracer_provider(provider)

with tracer.start_as_current_span("chat") as span:
    span.set_attribute("gen_ai.request.model", MODEL)
    reply = client.messages.create(model=MODEL, messages=msgs, max_tokens=500)
`,
  },
};
