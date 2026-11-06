// OpenTelemetry for an agent: a farm advisory agent in Mbale answers "should I plant beans this week?" Sometimes in 3 seconds, sometimes in 31.
// One trace per request: invoke_agent (INTERNAL) → chat (CLIENT, to the model provider) → execute_tool get_weather → MCP call (CLIENT) → chat → execute_tool soil_moisture
// → MCP call (CLIENT) → chat. Attributes follow the GenAI conventions (gen_ai.operation.name, gen_ai.request.model, gen_ai.usage.input_tokens, gen_ai.tool.name …).
// The slow request: the soil server had scaled to zero and took 26 s to start. Its own spans (cold start, database) only join the trace if the client passes
// the W3C traceparent to it, in the HTTP headers or, over stdio, in params._meta. Content capture (prompts, replies) is opt-in. Metrics use bounded labels.
const SPANS = s => [
  { n: 'invoke_agent farm_advisor', d: 0, l: s ? 31.1 : 3.2, lvl: 0, k: 'INTERNAL' },
  { n: 'chat (model)', d: 0.05, l: 0.9, lvl: 1, k: 'CLIENT', a: 'input_tokens 1,840 · output 62' },
  { n: 'execute_tool get_weather', d: 1.0, l: 0.45, lvl: 1, k: 'INTERNAL' },
  { n: 'mcp tools/call weather', d: 1.02, l: 0.4, lvl: 2, k: 'CLIENT' },
  { n: 'chat (model)', d: 1.5, l: 0.6, lvl: 1, k: 'CLIENT', a: 'input_tokens 2,110 · output 40' },
  { n: 'execute_tool soil_moisture', d: 2.15, l: s ? 27.3 : 0.35, lvl: 1, k: 'INTERNAL' },
  { n: 'mcp tools/call soil', d: 2.17, l: s ? 27.2 : 0.3, lvl: 2, k: 'CLIENT' },
  { n: 'soil server: cold start', d: 2.2, l: s ? 26.0 : 0, lvl: 3, k: 'SERVER', remote: true },
  { n: 'soil server: database read', d: s ? 28.2 : 2.2, l: s ? 1.1 : 0.25, lvl: 3, k: 'SERVER', remote: true },
  { n: 'chat (model)', d: s ? 29.5 : 2.55, l: s ? 1.55 : 0.6, lvl: 1, k: 'CLIENT', a: 'input_tokens 2,420 · output 180' },
];

export default {
  slug: 'opentelemetry-genai',
  title: 'Tracing an agent: one trace from model to MCP server',
  description: 'A farm advisory agent in Mbale usually answers in three seconds, sometimes thirty. One trace shows every call, so the slow step can\'t hide.',
  overview: 'An agent request touches many things: the model several times, tools, MCP servers, sometimes other agents. When it is slow or wrong, logs from each piece don\'t say which step was to blame. OpenTelemetry traces do: one trace per request, made of nested spans, each with a start, a duration and attributes. The GenAI semantic conventions fix the names so any backend can read them: gen_ai.operation.name (chat, execute_tool, invoke_agent), the provider, the requested and served model, input and output tokens, the tool name and call ID. Calls that leave the process (to a model provider or an MCP server) are CLIENT spans; the agent\'s own steps are INTERNAL. For the trace to continue inside an MCP server, the client must pass the W3C traceparent along, in HTTP headers or, over stdio, in the request\'s _meta, and the server must start its spans from it. Prompts and replies are not recorded by default, because they are large and full of personal data; turn content capture on deliberately, for a sample, with redaction. Metrics such as token usage and operation duration are histograms with a few bounded labels (model, operation), never one per user.',
  keywords: ['OpenTelemetry', 'GenAI semantic conventions', 'LLM tracing', 'agent observability', 'traceparent', 'MCP tracing', 'spans'],
  orient: 'landscape',
  view: { target: [-0.3, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { slow: true, prop: true, content: false, card: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const KC = { INTERNAL: '#5B8DB8', CLIENT: '#1F9E89', SERVER: '#7B6FA8' };
    /* the waterfall: one bar per span, nested spans further back; blue agent steps, green calls out, purple inside the MCP server, coral the slow one */
    const X0 = -2.6, XW = 2.9, Z0 = -0.95, DZ = 0.2;
    const wp = P.box(XW + 0.3, 0.02, 2.2, '#FFFFFF', { r: 0.03 }); wp.position.set(X0 + XW / 2, 0, -0.05); S.add(wp);
    const rows = Array.from({ length: 10 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(1, 0.1, 0.15, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return { mm, b, z: Z0 + i * DZ }; });
    /* spans with no parent land on a separate pad: an orphan trace */
    const orphanPad = P.box(1.0, 0.02, 0.55, '#F6D9D0', { r: 0.03 }); orphanPad.position.set(1.0, 0, 0.85); S.add(orphanPad);
    const orph = [0, 1].map(i => { const b = P.box(0.6, 0.1, 0.15, '#7A5CC4', { r: 0.02 }); b.position.set(1.0, 0.02, 0.75 + i * 0.2); S.add(b); return b; });
    /* content capture: a vault of prompts and replies (red when names and numbers are stored); metrics: one peg per time series */
    const vaultM = new THREE.MeshLambertMaterial({ color: '#9A968C' }), vault = P.box(0.55, 0.45, 0.45, '#fff', { r: 0.05, material: vaultM }); vault.position.set(1.0, 0, -0.7); S.add(vault);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const pegs = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 120); pegs.frustumCulled = false; pegs.userData.noFit = true; S.add(pegs);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const pegPad = P.box(0.8, 0.02, 0.6, '#FFFFFF', { r: 0.03 }); pegPad.position.set(1.0, 0, 0.05); S.add(pegPad);
    const totTw = P.tower(0.45, 0.45, SAF, { size: 0.28 }); totTw.position.set(1.85, 0, -0.3); S.add(totTw);
    S.add(P.keep(-2.8, 2.15, 1.25, -1.1, 1.15));

    let sp = null, clock = 0;
    function paint() {
      const total = sp[0].l, sc = XW / total, tnow = Math.min(total, clock * total / 2.5);
      rows.forEach((r, i) => {
        const s = sp[i], hidden = s.remote && !st.prop, zero = s.l <= 0;
        const a = s.d, b = Math.min(s.d + s.l, tnow), len = Math.max(0, b - a) * sc;
        r.b.visible = !hidden && !zero && len > 0; r.b.scale.x = Math.max(0.002, len); r.b.position.set(X0 + a * sc + len / 2, 0.02 + s.lvl * 0.06, r.z); r.mm.color.set(s.l > 10 ? BAD : KC[s.k]);
      });
    }
    function draw() {
      sp = SPANS(st.slow); clock = 0;
      const lost = !st.prop && st.slow; orphanPad.visible = lost; orph.forEach(o => { o.visible = lost; });
      vaultM.color.set(st.content ? RED : '#9A968C');
      const n = st.card ? 120 : 6;
      for (let i = 0; i < 120; i++) { const on = i < n; dummy.position.set(0.68 + (i % 12) * 0.058, 0.02, -0.17 + Math.floor(i / 12) * 0.045); dummy.scale.set(on ? 0.035 : 0, on ? (st.card ? 0.12 : 0.3) : 0, on ? 0.03 : 0); dummy.updateMatrix(); pegs.setMatrixAt(i, dummy.matrix); pegs.setColorAt(i, col.set(st.card ? BAD : GOOD)); }
      pegs.instanceMatrix.needsUpdate = true; pegs.instanceColor.needsUpdate = true;
      totTw.userData.set({ h: 0.05 + Math.min(1, sp[0].l / 32) * 1.1, cap: `${sp[0].l} s`, color: sp[0].l > 10 ? RED : GOOD });
      paint();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { totTw.userData.tick(dt); if (clock > 2.6) return; clock += dt; paint(); };
    const controls = [
      { type: 'buttons', label: 'Request', options: ['Fast (3 s)', 'Slow (31 s)'], get: () => st.slow ? 1 : 0, act: i => set({ slow: i === 1 }) },
      { type: 'toggle', label: 'Pass traceparent to the MCP server', short: 'Propagate', get: () => st.prop, set: v => set({ prop: !!v }) },
      { type: 'toggle', label: 'Record prompts and replies for every request', short: 'Capture content', get: () => st.content, set: v => set({ content: !!v }) },
      { type: 'toggle', label: 'Label metrics with the farmer\'s ID', short: 'Per-user labels', get: () => st.card, set: v => set({ card: !!v }), quick: false },
      { type: 'button', label: 'Draw the trace again', act: () => { clock = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Slow step found', get: () => { const f = !st.slow || st.prop; return { v: f ? (st.slow ? 'cold start' : 'none') : 'hidden', sub: 'in one trace', good: f, bad: !f }; } },
      { label: 'Personal data in traces', get: () => ({ v: st.content ? 'yes' : 'no', sub: 'names and phone numbers', bad: st.content, good: !st.content }) },
      { label: 'Metric series', get: () => ({ v: st.card ? '48,000' : '6', sub: 'per metric', bad: st.card, good: !st.card }) },
    ];
    const labels = [
      { name: 'trace', t: 'One trace', d: 'A bar per span, time left to right: blue agent steps, green calls out, purple inside the soil server, coral the slow one', icon: 'layers', atV: V(X0 - 0.15, 0.05, -0.35) },
      { name: 'vault', t: 'Content and metrics', d: 'The vault holds prompts and replies (red: names and numbers stored); each peg is one metric series', icon: 'gauge', atV: V(1.3, 0.4, -0.7) },
      { name: 'total', t: 'The whole request', d: 'Seconds; the pink pad holds spans that lost their parent trace', icon: 'eye', atV: V(2.1, 0.3, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Don\'t pass the trace on', hint: 'no traceparent to the MCP server', on: () => set({ ...D0, prop: false }), off: reset },
      { label: 'Record every prompt', hint: 'content capture on for all', on: () => set({ ...D0, content: true }), off: reset },
      { label: 'Label metrics per farmer', hint: 'unbounded labels', on: () => set({ ...D0, card: true }), off: reset },
    ];
    function status() {
      if (!st.prop && st.slow) return { ok: false, msg: '<b>The trace shows 27 seconds inside the soil tool, and then nothing.</b> The MCP client never passed the traceparent, so the soil server started a new trace of its own, and its cold start sits there unconnected. Inject traceparent into every outgoing call (HTTP headers, or params._meta over stdio) and have the server continue from it.' };
      if (st.content) return { ok: false, msg: '<b>Every prompt and reply went into the traces: farmers\' names, phone numbers and plots, stored at the tracing vendor.</b> Content capture is off by default for good reason. Turn it on deliberately, for a small sample, with redaction and a short retention, after checking where traces are stored.' };
      if (st.card) return { ok: false, msg: '<b>A farmer-ID label turned each metric into 48,000 series.</b> Metrics are for aggregates; give them a few bounded labels such as model and operation. Per-request detail belongs in traces, which you can search by farmer ID when you need to.' };
      return { ok: true, msg: `<b>${st.slow ? 'The 31-second request, explained: the soil server took 26 seconds to cold-start.' : 'A 3-second request: nothing slow, every step visible.'}</b> One trace holds the agent, three model calls, two tools and the MCP server\'s own spans, all with standard GenAI attributes. Content stays out by default and metrics have six series. ${st.slow ? 'Keep the soil server warm, or call it earlier in parallel.' : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Sometimes slow', home: true, say: 'A farm advisory agent in Mbale usually answers in three seconds. Sometimes it takes thirty. Logs from each piece don\'t say why.', act: m => m.set({ slow: false, prop: true, content: false, card: false }) },
    { t: 'One trace per request', home: true, say: 'A trace shows the whole request as nested spans: the agent, each model call, each tool, each call out to an MCP server, with standard names and token counts.', act: m => m.set({ slow: false }) },
    { t: 'The slow one', home: true, say: 'In the slow request, the soil tool takes twenty-seven seconds. Inside it, the soil server\'s own spans show a cold start of twenty-six.', act: m => m.set({ slow: true }) },
    { t: 'Pass the trace on', home: true, say: 'That only works because the client passed the trace context to the MCP server. Without it, the server\'s spans start a separate trace, and the cold start is invisible.', act: m => m.set({ prop: false }) },
    { t: 'Content is opt-in', home: true, say: 'Record every prompt and reply, and farmers\' names and phone numbers end up at the tracing vendor. Capture content deliberately, for a sample, redacted.', act: m => m.set({ prop: true, content: true }) },
    { t: 'Bounded metrics', home: true, say: 'Label metrics by farmer, and each one splits into forty-eight thousand series. Keep labels to model and operation; search traces for individuals.', act: m => m.set({ content: false, card: true }) },
  ],
  check: [
    { q: 'How does a trace continue inside an MCP server?', options: ['The client passes traceparent and the server continues from it', 'Automatically', 'The model reports it'], answer: 0, why: 'In HTTP headers, or params._meta over stdio.', hint: 'Try Don\'t pass the trace on.' },
    { q: 'Why is content capture off by default?', options: ['Prompts and replies are large and full of personal data', 'It is slow', 'Backends can\'t store text'], answer: 0, why: 'Turn it on deliberately, sampled and redacted.', hint: 'Try Record every prompt.' },
    { q: 'Why not label a metric with each user\'s ID?', options: ['It multiplies series without limit', 'Metrics can\'t hold IDs', 'It hides errors'], answer: 0, why: 'Use bounded labels; search traces for individuals.', hint: 'Try Label metrics per farmer.' },
  ],
  terms: [
    ['Trace', 'All the spans of one request, under one trace ID.'],
    ['Span', 'One timed step with attributes and a parent.'],
    ['CLIENT span', 'A call that leaves the process, such as to a model provider or MCP server.'],
    ['traceparent', 'The W3C header carrying trace and span IDs across processes.'],
    ['GenAI semantic conventions', 'Standard attribute names such as gen_ai.operation.name and gen_ai.usage.input_tokens.'],
    ['Cardinality', 'How many distinct label combinations a metric has.'],
  ],
  deeper: '<p><b>Backends.</b> Spans travel as OTLP to open-source stores such as Jaeger or Tempo, or to LLM-focused tools that read the gen_ai attributes; instrument once, send anywhere.</p><p><b>Events.</b> When content capture is on, prompts, completions and tool calls can be recorded as time-ordered events on a span for replay.</p><p><b>Requested versus served model.</b> Record both: a provider or router may serve a different model than you asked for, and that explains odd behaviour.</p><p><b>About this machine.</b> The two traces, durations and attributes follow the file header; the series counts assume 48,000 farmers and six model-operation pairs.</p>',
  code: {
    title: 'Spans for a tool call, passed to MCP',
    note: 'Adapted from the course\'s OpenTelemetry GenAI lesson.',
    text: `
from opentelemetry import trace, propagate

tracer = trace.get_tracer("farm-advisor")

def call_tool(name, args, mcp):
    with tracer.start_as_current_span(f"execute_tool {name}") as span:
        span.set_attribute("gen_ai.operation.name", "execute_tool")
        span.set_attribute("gen_ai.tool.name", name)
        with tracer.start_as_current_span(f"mcp tools/call {name}",
                                          kind=trace.SpanKind.CLIENT):
            carrier = {}
            propagate.inject(carrier)                 # traceparent
            return mcp.call(name, args, meta={"traceparent": carrier["traceparent"]})
`,
  },
};
