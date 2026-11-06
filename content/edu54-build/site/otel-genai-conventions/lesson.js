// OpenTelemetry GenAI conventions (phase 14, lesson 23): three frameworks at a Kigali logistics firm trace the same agent run. A trace is drawn as bars by time and depth:
// invoke_agent at the bottom, chat and tool spans above. Without shared names each framework needs its own dashboard; without parent links, spans fall off the tree.
const SPANS = [
  { d: 0, a: 0, b: 10, k: 'agent' }, { d: 1, a: 0.3, b: 2.6, k: 'chat' }, { d: 1, a: 2.8, b: 4.6, k: 'tool' }, { d: 1, a: 4.8, b: 6.8, k: 'chat' },
  { d: 1, a: 7, b: 8.2, k: 'tool' }, { d: 1, a: 8.4, b: 9.8, k: 'chat' }, { d: 2, a: 3.1, b: 4.2, k: 'tool' },
];
function run(o) {
  const dash = o.std ? 1 : 3, cost = o.std && o.parents, root = o.parents ? 1 : SPANS.length;
  return { dash, root, cost, leak: o.content === 'inline', ref: o.content === 'ref' };
}

export default {
  slug: 'otel-genai-conventions',
  title: 'OpenTelemetry for agents: one set of span names',
  description: 'Three frameworks trace one agent run. Shared names give one dashboard, parent links give one tree, and prompts stay out by default.',
  overview: 'Every vendor once invented its own span names, so operations teams built a dashboard per framework. The OpenTelemetry GenAI conventions fix that with shared names: chat spans for model calls, invoke_agent for agent runs, and a span per tool call, joined by parent links into one tree. Attributes such as gen_ai.provider.name and gen_ai.request.model mean the same everywhere. An agent span is CLIENT when the agent runs on a remote service and INTERNAL when it runs in your process. Prompts and replies stay out by default, because a trace is not a safe place for customer data. Turn capture on deliberately, or store a reference instead.',
  keywords: ['OpenTelemetry', 'GenAI semantic conventions', 'tracing', 'spans', 'observability', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.58, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { std: true, parents: true, content: 'off', remote: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', CHAR = '#2C2D31', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const K = { agent: CHAR, chat: BLUE, tool: SAF }, X = t => -2.2 + t * 0.34, H = 0.2;
    const bars = SPANS.map(sp => {
      const m = new THREE.MeshLambertMaterial({ color: K[sp.k] }), w = (sp.b - sp.a) * 0.34, b = P.box(w, H, 0.34, '#fff', { r: 0.02, material: m });
      b.userData.noFit = true; S.add(b); return { b, m, sp, y: 0, to: 0 };
    });
    const Y = sp => 0.03 + sp.d * (H + 0.04);
    const rail = P.box(3.5, 0.03, 0.44, '#BFB8A8', { r: 0.02 }); rail.position.set(-0.5, 0, -0.25); S.add(rail);
    const dashes = [0, 1, 2].map(i => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), d = P.box(0.55, 0.42, 0.06, '#fff', { r: 0.02, material: m }); d.position.set(0.15 + i * 0.68 - 0.1, 0.03, 0.62); d.userData.noFit = true; S.add(d); return { d, m }; });
    const vault = P.box(0.5, 0.36, 0.5, CHAR, { r: 0.05 }); vault.position.set(-1.95, 0.03, 0.5); S.add(vault);
    const slip = P.box(0.3, 0.06, 0.24, '#FFF', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: '#FFF' }) }); slip.position.set(-1.95, 0.42, 0.5); slip.userData.noFit = true; S.add(slip);
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.2, 0.03, -0.3);
    S.add(P.keep(-2.5, 2.5, 0.9, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      bars.forEach((B, i) => {
        B.b.position.x = X(B.sp.a) + (B.sp.b - B.sp.a) * 0.17; B.b.position.z = -0.25;
        B.to = st.parents ? Y(B.sp) : 0.03; if (!st.parents) B.b.position.z = -0.65 + (i % 3) * 0.22 + (i === 0 ? 0 : 0.02);
        B.m.color.set(st.std ? K[B.sp.k] : ['#A87A4F', '#7B6FA8', '#3E9B9B'][i % 3]);
      });
      dashes.forEach(({ d, m }, i) => { d.visible = i < R.dash; });
      slip.material.color.set(R.leak ? '#D9483B' : R.ref ? '#F2AE0C' : '#E0DBCE');
      lamp.userData.set({ color: R.cost && !R.leak ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['off', 'ref', 'inline'];
    const controls = [
      { type: 'toggle', label: 'Use the shared GenAI span names', short: 'Shared names', get: () => st.std, set: v => set({ std: !!v }) },
      { type: 'toggle', label: 'Spans carry parent links', short: 'Parents', get: () => st.parents, set: v => set({ parents: !!v }) },
      { type: 'buttons', label: 'Prompts and replies', options: ['Left out', 'Reference only', 'Stored in spans'], get: () => CK.indexOf(st.content), act: i => set({ content: CK[i] }) },
      { type: 'toggle', label: 'The agent runs on a remote service', short: 'Remote agent', get: () => st.remote, set: v => set({ remote: !!v }) },
    ];
    const readouts = [
      { label: 'Dashboards to keep', get: () => ({ v: `${R.dash}`, sub: 'for three frameworks', good: R.dash === 1, bad: R.dash > 1 }) },
      { label: 'Trees in this trace', get: () => ({ v: `${R.root}`, sub: 'one run should be one tree', good: R.root === 1, bad: R.root > 1 }) },
      { label: 'Agent span kind', get: () => ({ v: st.remote ? 'CLIENT' : 'INTERNAL', sub: st.remote ? 'remote service' : 'in your process' }) },
    ];
    const labels = [
      { name: 'b', t: 'One agent run', d: 'Blue: model. Gold: tools', icon: 'link', atV: V(X(0) + 0.1, 0.2, -0.25) },
      { name: 'd', t: 'Dashboards', d: 'One when names are shared', icon: 'chart', atV: V(2.0, 0.3, 0.62) },
      { name: 'v', t: 'Customer text', d: 'Red: stored in the trace', icon: 'eye', atV: V(-2.15, 0.2, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Each framework names its own spans', hint: 'three dialects', on: () => set({ ...D0, std: false }), off: reset },
      { label: 'Drop the parent links', hint: 'the tree falls apart', on: () => set({ ...D0, parents: false }), off: reset },
      { label: 'Store prompts in spans', hint: 'addresses in your logs', on: () => set({ ...D0, content: 'inline' }), off: reset },
    ];
    function status() {
      if (!st.std) return { ok: false, msg: '<b>Three frameworks, three dialects, three dashboards.</b> One calls it llm_call, another generation, another chat_completion. A question like "which model is slowest?" now needs three queries. Shared names make it one.' };
      if (!st.parents) return { ok: false, msg: `<b>${R.root} loose spans and no tree.</b> Each span is true, but nothing says which agent run a tool call belonged to, so you can't add up a run's cost or find why it was slow. Pass the trace context into every call.` };
      if (R.leak) return { ok: false, msg: '<b>Customer addresses are now in your tracing backend.</b> Traces are kept for months and read by many people. The convention leaves content out unless you opt in. If you need it, store it elsewhere and keep a reference.' };
      return { ok: true, msg: `<b>One tree, one dashboard${R.ref ? ', and a reference to the prompt in a store you control' : ', and no customer text in the trace'}.</b> The agent span is ${st.remote ? 'CLIENT, because the work happens on a remote service' : 'INTERNAL, because the agent runs in your process'}.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt));
        bars.forEach(B => { B.y += (B.to - B.y) * Math.min(1, dt * 6); B.b.position.y = B.y; });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One run', home: true, say: 'A logistics firm in Kigali runs an agent. Each bar is a span: the agent run at the bottom, model calls and tool calls above it.', act: m => m.set({ std: true, parents: true, content: 'off', remote: false }) },
    { t: 'Three dialects', home: true, say: 'Its teams use three frameworks. If each names spans its own way, that means three dashboards for one question.', act: m => m.set({ std: false, parents: true, content: 'off', remote: false }) },
    { t: 'One set of names', home: true, say: 'The GenAI conventions fix the names: chat, invoke agent, and a span per tool. Provider and model mean the same everywhere.', act: m => m.set({ std: true, parents: true, content: 'off', remote: false }) },
    { t: 'The tree', home: true, say: 'Parent links join them into one tree. Drop those, and you can\'t tell which run a tool call belonged to.', act: m => m.set({ std: true, parents: false, content: 'off', remote: false }) },
    { t: 'Client or internal', home: true, say: 'An agent on a remote service gets a CLIENT span. One in your own process gets INTERNAL.', act: m => m.set({ std: true, parents: true, content: 'off', remote: true }) },
    { t: 'Leave the words out', home: true, say: 'Prompts stay out by default, because traces last and many people read them. If you need them, store a reference.', act: m => m.set({ std: true, parents: true, content: 'ref', remote: false }) },
  ],
  check: [
    { q: 'What do the shared GenAI names give you?', options: ['One dashboard across frameworks', 'Faster models', 'Cheaper tokens'], answer: 0, why: 'The same names mean the same query works everywhere.', hint: 'Try Each framework names its own spans.' },
    { q: 'When is an agent span CLIENT?', options: ['When the agent runs on a remote service', 'Always', 'When it uses tools'], answer: 0, why: 'INTERNAL is for agents running in your process.', hint: 'Switch on Remote agent.' },
    { q: 'What is the default for prompt content in spans?', options: ['Left out unless you opt in', 'Always stored', 'Stored for a day'], answer: 0, why: 'Traces are a poor place for customer data.', hint: 'Try Store prompts in spans.' },
  ],
  terms: [
    ['Span', 'One timed operation in a trace.'],
    ['Trace', 'All the spans of one run, joined by parent links.'],
    ['invoke_agent', 'The span name for running an agent.'],
    ['Attribute', 'A named value on a span, such as gen_ai.request.model.'],
    ['Span kind', 'CLIENT for a remote call, INTERNAL for work in process.'],
    ['Content capture', 'Storing prompts and replies; opt-in.'],
  ],
  deeper: '<p><b>Request and response model.</b> gen_ai.request.model is what you asked for, and gen_ai.response.model is what served it. Routing can make them differ, and the difference is worth watching.</p><p><b>RAG.</b> gen_ai.data_source.id records which store was consulted.</p><p><b>Still moving.</b> The conventions are young, and a stability opt-in setting chooses which version an instrumentation emits. Check it when an upgrade changes your dashboards.</p>',
  code: {
    title: 'One agent, one tool span',
    note: 'Adapted from the course\'s span sketch (code/main.py).',
    text: `
with tracer.start_as_current_span(
        "invoke_agent dispatch", kind=SpanKind.INTERNAL) as agent:
    agent.set_attribute("gen_ai.agent.name", "dispatch")

    with tracer.start_as_current_span("chat claude") as chat:
        chat.set_attribute("gen_ai.provider.name", "anthropic")
        chat.set_attribute("gen_ai.request.model", MODEL)

    with tracer.start_as_current_span("execute_tool track_parcel"):
        track_parcel(parcel_id)                  # parent link is automatic
`,
  },
};
