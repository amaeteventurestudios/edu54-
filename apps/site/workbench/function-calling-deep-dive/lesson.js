// Function calling across providers: a weather and alert assistant for fishers on Lake Victoria, near Kisumu. Two tools: get_lake_weather(zone) and send_sms(to, text).
// One canonical declaration is translated into three providers' shapes. Each provider's reply comes back in its own shape and is translated back to one canonical call.
// The shapes follow the providers' published APIs: OpenAI-style (arguments as a JSON string), Anthropic-style (input as an object), Gemini-style (functionCall parts).
// tool_choice: auto (the model chooses), required (it must call a tool), none (it may not), or a named tool. The model here is a fixed policy so the outcomes are exact:
// it calls the tool a message needs; forced to call when none is needed, it invents arguments; forbidden when one is needed, it answers from memory.
const MSGS = [
  { t: 'Habari! Good morning.', need: null },
  { t: 'Is it safe to go out near Rusinga Island now?', need: ['get_lake_weather'], args: [{ zone: 'Rusinga' }] },
  { t: 'Wind at Mbita and at Homa Bay?', need: ['get_lake_weather', 'get_lake_weather'], args: [{ zone: 'Mbita' }, { zone: 'Homa Bay' }] },
  { t: 'Text my brother Otieno that I\'m coming in early.', need: ['send_sms'], args: [{ to: 'Otieno', text: 'Coming in early.' }] },
];
const TOOL = { name: 'get_lake_weather', description: 'Current wind and waves for one zone of Lake Victoria. Use for "is it safe", wind or storm questions.', input_schema: { type: 'object', properties: { zone: { type: 'string' } }, required: ['zone'] } };
const PROV = ['OpenAI-style', 'Anthropic-style', 'Gemini-style'];
const CHOICE = ['Auto', 'Required', 'None', 'Force get_lake_weather'];
function decl(p) {
  const s = JSON.stringify(TOOL.input_schema);
  if (p === 0) return `tools: [{ "type": "function", "function": { "name": "${TOOL.name}", "description": "…", "parameters": ${s}, "strict": true } }]`;
  if (p === 1) return `tools: [{ "name": "${TOOL.name}", "description": "…", "input_schema": ${s} }]`;
  return `tools: [{ "functionDeclarations": [{ "name": "${TOOL.name}", "description": "…", "parameters": ${s} }] }]`;
}
function reply(p, calls) {
  if (!calls.length) return p === 0 ? '{ "content": "…", "tool_calls": [] }' : p === 1 ? '{ "content": [{ "type": "text", "text": "…" }] }' : '{ "parts": [{ "text": "…" }] }';
  const c = calls.map((c, i) => p === 0 ? `{ "id": "call_${i + 1}", "function": { "name": "${c.name}", "arguments": "${JSON.stringify(c.args).replace(/"/g, '\\"')}" } }`
    : p === 1 ? `{ "type": "tool_use", "id": "toolu_${i + 1}", "name": "${c.name}", "input": ${JSON.stringify(c.args)} }`
    : `{ "functionCall": { "id": "fc-${i + 1}", "name": "${c.name}", "args": ${JSON.stringify(c.args)} } }`);
  return p === 0 ? `{ "tool_calls": [${c.join(', ')}] }` : p === 1 ? `{ "content": [${c.join(', ')}] }` : `{ "parts": [${c.join(', ')}] }`;
}
function decide(st, m) {
  const M = MSGS[m], ch = st.choice;
  if (ch === 2) return { calls: [], made: !!M.need };
  if (ch === 3) return { calls: [{ name: 'get_lake_weather', args: M.need && M.need[0] === 'get_lake_weather' ? M.args[0] : { zone: 'Kisumu Bay' } }], wrong: !M.need || M.need[0] !== 'get_lake_weather', forced: true };
  if (!M.need) return ch === 1 ? { calls: [{ name: 'get_lake_weather', args: { zone: 'Kisumu Bay' } }], wrong: true, forced: true } : { calls: [] };
  const calls = M.need.map((n, i) => ({ name: n, args: M.args[i] }));
  return { calls: st.parallel ? calls : calls.slice(0, 1), later: !st.parallel && calls.length > 1 };
}
function parse(st, p, calls) {
  /* the translator back to a canonical call; the bug treats OpenAI's string as an object */
  if (p === 0 && st.bug && calls.length) return { err: 'TypeError: arguments is a string, not an object' };
  return { ok: calls.map(c => ({ name: c.name, args: c.args })) };
}

export default {
  slug: 'function-calling-deep-dive',
  title: 'One tool, three providers: shapes and tool choice',
  description: 'A weather and alert assistant for Lake Victoria fishers declares its tools once and talks to three providers through one small translator.',
  overview: 'Every major model provider supports function calling with the same loop: you send tool declarations, the model replies with a call naming a tool and its arguments, you run it and send the result back tied to the call\'s ID. The details differ. One provider wraps each tool in a "function" envelope and returns arguments as a JSON string you must parse; another takes an input_schema and returns arguments already parsed; a third nests declarations under functionDeclarations and returns functionCall parts. IDs, result blocks and limits on the number of tools differ too. The translator pattern keeps one canonical declaration in your code and converts it at the edge, in both directions, so switching provider is a configuration change. Tool choice is the other knob every provider has: auto lets the model decide; required makes it call something; none forbids tools; a named tool forces that one. Forcing is useful for extraction steps, and harmful elsewhere: a model forced to call a tool on a greeting invents arguments, and a model forbidden tools on a question about now answers from memory.',
  keywords: ['function calling', 'tool_choice', 'tool use', 'OpenAI vs Anthropic vs Gemini', 'parallel tool calls', 'tool calling API', 'LLM tools'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { prov: 0, choice: 0, parallel: true, bug: false, msg: 1 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* a fisher's boat sends the message; the translator turns one tool into each provider's shape; three provider robots; two tool masts behind a gate */
    const BLUE = '#5B8DB8', PCOL = [CHAR, '#C97B2E', BLUE], PZ = [-0.75, 0, 0.75];
    const water = P.box(0.9, 0.03, 2.2, '#9CC3DE', { r: 0.03 }); water.position.set(-2.45, 0, 0); S.add(water);
    const boat = new THREE.Group(); const hull = P.box(0.55, 0.14, 0.22, '#A0522D', { r: 0.05 }); boat.add(hull);
    const mast = P.cyl(0.015, 0.5, '#6B4A2E'); mast.position.y = 0.12; boat.add(mast);
    const sail = P.box(0.02, 0.32, 0.22, '#F4EBD8', { r: 0 }); sail.position.set(0.02, 0.24, 0.08); boat.add(sail);
    boat.position.set(-2.45, 0.03, 0); S.add(boat);
    const tr = P.box(0.45, 0.4, 2.0, CHAR, { r: 0.05 }); tr.position.set(-1.35, 0, 0); S.add(tr);
    const slots = PZ.map((z, i) => { const mm = new THREE.MeshLambertMaterial({ color: PCOL[i] }), b = P.box(0.08, 0.2, 0.36, '#fff', { r: 0.02, material: mm }); b.position.set(-1.1, 0.1, z); S.add(b); return mm; });
    const provs = PZ.map((z, i) => { const r = P.robot(PCOL[i], { scale: 0.9 }); r.position.set(-0.2, 0, z); S.add(r); return r; });
    [-0.95, 0.95].forEach(z => { const p = P.box(0.1, 0.55, 0.1, '#6B6E7E', { r: 0.02 }); p.position.set(0.55, 0, z); S.add(p); });
    const barM = new THREE.MeshLambertMaterial({ color: SAF }), bar = P.box(0.08, 0.08, 1.8, '#fff', { r: 0.02, material: barM }); bar.position.set(0.55, 0.4, 0); S.add(bar);
    let barTo = 0.4;
    const station = (z, c) => { const g = new THREE.Group(); const post = P.cyl(0.05, 0.75, '#6B6E7E'); g.add(post); const head = P.box(0.32, 0.2, 0.32, c, { r: 0.04 }); head.position.y = 0.75; g.add(head); const lamp = P.lamp(GOOD, { h: 0.25, r: 0.09 }); lamp.position.set(0.3, 0, 0.0); g.add(lamp); g.position.set(1.35, 0, z); S.add(g); return { g, lamp }; };
    const wx = station(-0.5, '#5B8DB8'), sms = station(0.5, '#7A5CC4');
    const okTw = P.tower(0.5, 0.5, GOOD, { size: 0.26 }); okTw.position.set(2.3, 0, 0); S.add(okTw);
    const flow = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); flow.userData.noFit = true; S.add(flow);
    S.add(P.keep(-2.9, 2.6, 1.25, -1.1, 1.1));

    let D = null, X = null, clock = 0;
    const results = () => MSGS.map((_, m) => { const d = decide(st, m), x = parse(st, st.prov, d.calls); return x.err || d.made || d.wrong ? 0 : 1; });
    function draw() {
      D = decide(st, st.msg); X = parse(st, st.prov, D.calls);
      provs.forEach((r, i) => r.userData.set({ lamp: i === st.prov ? SAF : '#6B6E7E' }));
      slots.forEach((mm, i) => mm.color.set(i === st.prov ? (X.err ? RED : SAF) : PCOL[i]));
      barTo = st.choice === 2 ? 0.4 : 0.0; barM.color.set(st.choice === 2 ? RED : st.choice === 0 ? GOOD : SAF);
      const nw = D.calls.filter(c => c.name === 'get_lake_weather').length, ns = D.calls.filter(c => c.name === 'send_sms').length, bad = !!(X.err || D.wrong);
      wx.lamp.userData.set({ color: nw ? (bad ? RED : GOOD) : '#B9B5AA', on: !!nw }); sms.lamp.userData.set({ color: ns ? GOOD : '#B9B5AA', on: !!ns });
      const n = results().reduce((a, b) => a + b, 0);
      okTw.userData.set({ h: 0.05 + n / MSGS.length * 1.2, cap: `${n}/${MSGS.length}`, color: n === MSGS.length ? GOOD : n < 3 ? RED : SAF });
      clock = 0;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      provs.forEach((r, i) => { r.userData.tick(dt); r.userData.set({ busy: i === st.prov }); }); bar.position.y += (barTo - bar.position.y) * Math.min(1, dt * 6); okTw.userData.tick(dt);
      clock += dt; const t = (clock % 3) / 3, pz = PZ[st.prov];
      const tz = D.calls.length ? (D.calls[0].name === 'send_sms' ? 0.5 : -0.5) : pz;
      const pts = [[-2.45, 0], [-1.35, 0], [-0.2, pz], [D.calls.length && !D.made ? 1.35 : -0.2, tz], [-1.35, 0]];
      const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), u = t * (pts.length - 1) - seg, A = pts[seg], B = pts[seg + 1];
      flow.position.set(A[0] + (B[0] - A[0]) * u, 0.55, A[1] + (B[1] - A[1]) * u);
      flow.material.color.set(seg >= 3 && X.err ? RED : seg >= 2 ? '#FFFFFF' : SAF);
    };
    const controls = [
      { type: 'buttons', label: 'Message', options: ['Greeting', 'Is it safe?', 'Two zones', 'Send a text'], get: () => st.msg, act: i => set({ msg: i }) },
      { type: 'buttons', label: 'Provider', options: PROV, get: () => st.prov, act: i => set({ prov: i }) },
      { type: 'buttons', label: 'Tool choice', options: CHOICE, get: () => st.choice, act: i => set({ choice: i }) },
      { type: 'toggle', label: 'Parallel tool calls', short: 'Parallel', get: () => st.parallel, set: v => set({ parallel: !!v }), quick: false },
      { type: 'toggle', label: 'Translator treats arguments as an object', short: 'Translator bug', get: () => st.bug, set: v => set({ bug: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Messages handled right', get: () => { const r = results(), n = r.reduce((a, b) => a + b, 0); return { v: `${n} of ${MSGS.length}`, sub: 'with these settings', good: n === MSGS.length, bad: n < 3 }; } },
      { label: 'Tool calls this turn', get: () => ({ v: `${D.calls.length}`, sub: X.err ? 'crashed' : 'parsed', bad: !!X.err }) },
      { label: 'Provider', get: () => ({ v: ['args: string', 'input: object', 'args: object'][st.prov], sub: PROV[st.prov] }) },
    ];
    const labels = [
      { name: 'canon', t: 'Translator', d: 'Takes the fisher\'s message from the boat; one tool, in each provider\'s shape; red when it misreads a reply', icon: 'code', atV: V(-1.6, 0.25, 0) },
      { name: 'tools', t: 'Weather and SMS', d: 'Lamps light when a tool is called; red when it is the wrong call', icon: 'link', atV: V(1.55, 0.6, 0.5) },
      { name: 'ok', t: 'Handled right', d: 'Of the four messages, with these settings', icon: 'check', atV: V(2.55, 0.4, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Translator forgets the string', hint: 'arguments parsed as if an object', on: () => set({ ...D0, bug: true }), off: reset },
      { label: 'Force a tool on a greeting', hint: 'tool choice: required', on: () => set({ ...D0, choice: 1, msg: 0 }), off: reset },
      { label: 'No tools for a live question', hint: 'tool choice: none', on: () => set({ ...D0, choice: 2 }), off: reset },
    ];
    function status() {
      const M = MSGS[st.msg];
      if (X.err) return { ok: false, msg: `<b>The translator crashed on an ${PROV[0]} reply.</b> That provider returns arguments as a JSON string; the others return an object. A translator written against one provider treated the string as an object. Parse at the edge, per provider, and test every adapter with a recorded reply.` };
      if (D.wrong && !M.need) return { ok: false, msg: `<b>Tool choice "${CHOICE[st.choice].toLowerCase()}" on a greeting: the model had to call something, so it called the weather tool with a zone nobody mentioned.</b> Forcing is for steps that always need a tool, such as an extraction step. For open conversation, leave it on auto.` };
      if (D.wrong) return { ok: false, msg: `<b>Forced to the weather tool, the model can't send the text.</b> A named tool choice overrides what the message needs. Use it when one step must run one tool; leave it on auto in conversation.` };
      if (D.made) return { ok: false, msg: `<b>Tools forbidden: asked about wind near the islands right now, the model answered from memory.</b> "None" is for turns that must only talk, such as summarising what tools already returned. A question about now needs the tool, so let the model choose.` };
      return { ok: true, msg: `<b>${!D.calls.length ? 'No tool needed: a text reply.' : `${D.calls.length} ${D.calls.length === 1 ? 'call' : 'calls'} via ${PROV[st.prov]}, translated back to one canonical form.`}</b> The same declaration served all three providers; only the edges differ: ${['a "function" envelope and arguments as a string', 'an input_schema and arguments as an object', 'functionDeclarations and functionCall parts'][st.prov]}.${D.later ? ' With parallel calls off, the second zone needs another round trip.' : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One tool, declared once', home: true, say: 'A weather and alert assistant for fishers on Lake Victoria declares its tools once, in its own code. A fisher asks if it\'s safe to go out near Rusinga Island.', act: m => m.set({ prov: 0, choice: 0, parallel: true, bug: false, msg: 1 }) },
    { t: 'Three shapes', home: true, say: 'Each provider wants the declaration in its own shape and replies in its own shape. One returns arguments as a string; the others as an object. A small translator handles both directions.', act: m => m.set({ prov: 1 }) },
    { t: 'Two zones at once', home: true, say: 'Asked about two zones, the model makes two calls in one turn. Each has an ID, so the results go back to the right call.', act: m => m.set({ prov: 2, msg: 2 }) },
    { t: 'Forcing a tool', home: true, say: 'Tool choice "required" makes the model call something. On a simple greeting, it invents a weather check nobody asked for.', act: m => m.set({ prov: 0, msg: 0, choice: 1 }) },
    { t: 'Forbidding tools', home: true, say: 'Tool choice "none" forbids tools. Asked whether it\'s safe right now, the model answers from memory. That is how fishers get hurt.', act: m => m.set({ msg: 1, choice: 2 }) },
    { t: 'Leave it on auto', home: true, say: 'For conversation, leave tool choice on auto and let the model decide. Force a tool only for steps that always need one.', act: m => m.set({ choice: 0 }) },
  ],
  check: [
    { q: 'Why keep one canonical tool declaration and translate at the edge?', options: ['Switching or adding a provider changes only the adapters', 'Providers require it', 'It makes calls faster'], answer: 0, why: 'The loop is the same everywhere; only the shapes differ.', hint: 'Switch providers and watch the declaration.' },
    { q: 'What goes wrong with tool choice "required" on a greeting?', options: ['The model must call a tool, so it invents a pointless call', 'Nothing', 'The model refuses to reply'], answer: 0, why: 'Force tools only where a tool is always needed.', hint: 'Try Force a tool on a greeting.' },
    { q: 'What does a call ID do?', options: ['Ties each result back to the call that asked for it', 'Names the tool', 'Counts tokens'], answer: 0, why: 'Essential when several calls go out in one turn.', hint: 'Try the two-zone message.' },
  ],
  terms: [
    ['Tool declaration', 'A tool\'s name, description and input schema, sent to the model.'],
    ['Tool choice', 'Auto, required, none, or a named tool: how free the model is to call tools.'],
    ['Call ID', 'An identifier on each tool call, echoed with its result.'],
    ['Translator', 'Code that converts one canonical tool format to and from each provider\'s shape.'],
    ['Parallel tool calls', 'Several tool calls in one model turn, run together.'],
    ['Strict mode', 'A provider setting that constrains arguments to match the schema exactly.'],
  ],
  deeper: '<p><b>Limits to plan for.</b> Providers cap the number of tools per request (in the tens to low hundreds) and schema depth, and strict modes often forbid some JSON Schema features, such as overlapping alternatives. Validate your declarations against each provider in tests.</p><p><b>Errors differ too.</b> Without strict mode, one provider may return unparseable argument text, another an object with extra fields. Validate every call against your own schema before running it, and send errors back so the model can fix the call.</p><p><b>Gateways.</b> The translator grows into a gateway that exposes one API in front of many providers, with routing, fallbacks and logs; later lessons build one.</p><p><b>About this machine.</b> The shapes follow the providers\' published request and response formats, shortened. The model is a fixed policy so each setting gives one exact outcome.</p>',
  code: {
    title: 'A translator in three small functions',
    note: 'Adapted from the course\'s function calling deep dive.',
    text: `
import json

def to_openai(t):    return {"type": "function", "function": {"name": t.name,
                       "description": t.description, "parameters": t.schema, "strict": True}}
def to_anthropic(t): return {"name": t.name, "description": t.description, "input_schema": t.schema}
def to_gemini(ts):   return {"functionDeclarations": [{"name": t.name,
                       "description": t.description, "parameters": t.schema} for t in ts]}

def calls_from(provider, reply):
    if provider == "openai":
        return [(c["id"], c["function"]["name"], json.loads(c["function"]["arguments"]))
                for c in reply["tool_calls"]]                 # arguments: a string
    if provider == "anthropic":
        return [(b["id"], b["name"], b["input"]) for b in reply["content"] if b["type"] == "tool_use"]
    return [(p["functionCall"]["id"], p["functionCall"]["name"], p["functionCall"]["args"])
            for p in reply["parts"] if "functionCall" in p]
`,
  },
};
