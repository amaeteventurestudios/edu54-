// Handoffs and guardrails (OpenAI Agents SDK): a Lusaka mobile-money help desk. A triage agent hands a conversation to specialists by calling a
// transfer tool; the disputes and identity agents can hand it back and forth forever unless a hop limit escalates to a person.
// Guardrail timing over 20 requests: an input guardrail (0.4 s) run in parallel with the main model (2.0 s, 1,500 tokens) answers faster but wastes the
// main model's tokens whenever it trips; run first (blocking) it wastes nothing but adds 0.4 s to every request that passes.
// Tool guardrails fire only on function tools: a built-in file tool reading another customer's statement goes unchecked unless it has its own policy.
const AGENTS = { triage: [0, -0.2], disputes: [-1.55, 0.55], identity: [0, 0.95], airtime: [1.55, 0.55] };
const PATH = ['triage', 'disputes', 'identity', 'disputes', 'identity', 'disputes', 'identity', 'disputes', 'identity', 'disputes', 'identity', 'disputes', 'identity'];
function handoffs(limit) {
  const hops = []; let i = 0;
  while (i + 1 < PATH.length) { if (limit && hops.length >= limit) return { hops, end: 'escalated to a person', ok: true }; hops.push([PATH[i], PATH[i + 1]]); i++; }
  return { hops, end: 'timed out after 12 hand-offs', ok: false };
}
function timing(rate, mode) {
  const N = 20, trips = Math.round(N * rate), G = 0.4, M = 2.0, TOK = 1500;
  let lat = 0, waste = 0;
  for (let k = 0; k < N; k++) { const trip = k < trips; if (mode === 'parallel') { lat += trip ? G : Math.max(G, M); if (trip) waste += TOK; } else { lat += trip ? G : G + M; } }
  return { avg: lat / N, waste, trips };
}
const TOOLS = [
  { name: 'send_money (function tool)', guarded: true, req: 'send K500 to 0977… (limit check)', bad: false },
  { name: 'lookup_balance (function tool)', guarded: true, req: 'balance for this customer', bad: false },
  { name: 'read_file (built-in tool)', guarded: false, req: 'open statements/other_customer.pdf', bad: true },
];

export default {
  slug: 'openai-agents-sdk',
  title: 'Handoffs and guardrails: who answers, and when to check',
  description: 'A Lusaka mobile-money help desk hands customers between agents and checks requests with guardrails. Limit the hops, time the checks.',
  overview: 'A provider agent SDK packages the agent loop with a few primitives: agents (instructions, a model, tools), handoffs, guardrails, sessions that keep conversation history, and tracing. A handoff is a tool: the triage agent calls something like transfer_to_disputes, and the conversation, history included, continues with that specialist. Because any agent can hand off, two can pass a customer back and forth ("I need the identity check first", "I need the dispute ID first"); count hops and escalate to a person past a limit. Guardrails check inputs before the first agent, outputs after the last, and arguments on each function tool. Timing is a trade-off. Run an input guardrail in parallel with the main model and passing requests are as fast as the model alone, but every tripped request wastes the main model\'s tokens. Run it first (blocking) and nothing is wasted, but every request waits for the check. The more requests trip it, the more blocking pays. Tool guardrails cover function tools only; built-in tools such as file or web access need their own policy. Traces record each model call, tool call, handoff and guardrail as spans; keep sensitive content out of them.',
  keywords: ['OpenAI Agents SDK', 'handoffs', 'guardrails', 'multi-agent', 'tracing', 'AI agents', 'latency'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { limit: 3, rate: 0.1, mode: 'parallel', toolPolicy: true }, st = { ...D0, t: 0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', ORANGE = '#E07A5F';
    const AC = { triage: CHAR, disputes: '#8E6BB8', identity: BLUE, airtime: '#7FB069' };
    /* the help desk: a robot per agent; gold arrows are hand-offs, one per hop; a person steps in at the hop limit */
    const AX = -1.6, AZ0 = -0.7;
    const nodes = Object.fromEntries(Object.entries(AGENTS).map(([n, [x, z]]) => { const pad = P.cyl(0.3, 0.06, '#3A3D4A'); pad.position.set(AX + x, 0, AZ0 + z); S.add(pad); const r = P.robot(AC[n], { scale: 0.75 }); r.position.set(AX + x, 0.06, AZ0 + z); S.add(r); return [n, { r, x: AX + x, z: AZ0 + z }]; }));
    const hopArrows = Array.from({ length: 12 }, () => { const g = P.arrow(V(), V(1, 0, 0), 0.022, GOLD); g.visible = false; S.add(g); return g; });
    const person = P.robot('#F2C94C', { scale: 0.75, lamp: GOOD }); person.position.set(AX + 0.8, 0.0, AZ0 - 0.2); S.add(person);
    /* tools: each sits behind a gate. Function tools have guardrails; the built-in file tool only if it gets its own policy */
    const TZ = 1.1, TXs = i => AX - 1.0 + i * 1.0;
    const tools = TOOLS.map((t, i) => { const m = new THREE.MeshLambertMaterial({ color: t.bad ? '#C9C4B6' : BLUE }), b = P.box(0.42, 0.3, 0.32, '#fff', { r: 0.05, material: m }); b.position.set(TXs(i), 0, TZ); S.add(b);
      const g = P.gate(0.5, GOOD, { h: 0.4 }); g.position.set(TXs(i), 0, TZ - 0.32); S.add(g); const l = P.lamp(GOOD, { h: 0.2, r: 0.07 }); l.position.set(TXs(i) + 0.33, 0, TZ); S.add(l); return { g, l, m }; });
    /* guardrail timing, 20 requests: two lanes. Orange: the guardrail (0.4 s). Blue: the main model (2 s). Side by side runs them in parallel, end to end runs the check first.
       The tower is the average reply; the jar fills with the tokens wasted when the model's work is thrown away */
    const GX0 = 0.75, SC = 0.55, LZ = i => -0.55 + i * 0.85;
    const lanes = ['parallel', 'blocking'].map((m, i) => { const z = LZ(i);
      const g = P.box(0.4 * SC, 0.16, 0.2, ORANGE, { r: 0.02 }); S.add(g); const mdl = P.box(2.0 * SC, 0.16, 0.2, BLUE, { r: 0.02 }); S.add(mdl);
      if (m === 'parallel') { g.position.set(GX0 + 0.2 * SC, 0, z - 0.13); mdl.position.set(GX0 + SC, 0, z + 0.13); } else { g.position.set(GX0 + 0.2 * SC, 0, z); mdl.position.set(GX0 + 0.4 * SC + SC, 0, z); }
      const t = P.tower(0.3, 0.3, GOLD, { h: 0.4 }); t.userData.set({ cap: '' }); t.position.set(2.35, 0, z); S.add(t);
      const j = P.jar(0.16, 0.5, { max: 12 }); j.position.set(2.85, 0, z); S.add(j);
      const sel = P.box(2.6, 0.02, 0.62, GOLD, { r: 0.02, material: new THREE.MeshLambertMaterial({ color: GOLD, transparent: true, opacity: 0.35 }) }); sel.position.set(GX0 + 1.25, 0, z); sel.layers.set(1); S.add(sel);
      return { z, t, j, sel }; });
    S.add(P.keep(-3.0, 3.1, 1.2, -1.25, 1.35));

    let HO = null, TP = null, TB = null;
    function plan() { HO = handoffs(st.limit); TP = timing(st.rate, 'parallel'); TB = timing(st.rate, 'blocking'); st.t = 0; paint(); }
    function paint() {
      const k = Math.min(HO.hops.length, Math.floor(st.t));
      hopArrows.forEach((g, i) => { const h = HO.hops[i]; g.visible = !!h && i < k; if (!h) return; const A = nodes[h[0]], B = nodes[h[1]], off = (i % 2 ? 0.09 : -0.09), d = V(B.x - A.x, 0, B.z - A.z).normalize(); P.setArrow(g, V(A.x + off, 0.75 + i * 0.03, A.z + off).addScaledVector(d, 0.3), V(B.x + off, 0.75 + i * 0.03, B.z + off).addScaledVector(d, -0.3)); g.children.forEach(c => c.material && c.material.color && c.material.color.set(HO.ok ? GOLD : i >= 3 ? RED : GOLD)); });
      const cur = k ? HO.hops[k - 1][1] : 'triage';
      Object.entries(nodes).forEach(([n, N]) => N.r.userData.set({ busy: n === cur, lamp: n === cur ? GOLD : '#C9C4B6' }));
      person.visible = HO.ok && k >= HO.hops.length && st.limit > 0;
      TOOLS.forEach((t, i) => { const checked = t.guarded || st.toolPolicy, T = tools[i], pass = !t.bad || !checked; T.g.userData.set({ open: pass, color: checked ? GOOD : RED }); T.l.userData.set({ color: t.bad && !checked ? RED : GOOD, on: true }); });
      const mx = 2.5;
      lanes.forEach((L, i) => { const R = i ? TB : TP; L.t.userData.set({ h: R.avg / mx * 0.9, color: GOLD }); L.j.userData.set({ n: Math.round(R.waste / 1500) }); L.sel.visible = (i ? 'blocking' : 'parallel') === st.mode; });
    }
    plan();
    const set = p => { Object.assign(st, p); plan(); };
    const controls = [
      { type: 'slider', label: 'Hand-off limit before a person takes over', min: 0, max: 6, step: 1, get: () => st.limit, set: v => set({ limit: Math.round(v) }), fmt: v => Math.round(v) ? String(Math.round(v)) : 'none' },
      { type: 'slider', label: 'Share of requests that trip the guardrail', min: 0, max: 0.6, step: 0.05, get: () => st.rate, set: v => set({ rate: Math.round(v * 20) / 20 }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'buttons', label: 'Run the input guardrail', options: ['In parallel', 'Blocking'], get: () => st.mode === 'parallel' ? 0 : 1, act: i => set({ mode: i ? 'blocking' : 'parallel' }) },
      { type: 'toggle', label: 'Policy for built-in tools too', short: 'Built-in policy', get: () => st.toolPolicy, set: v => set({ toolPolicy: !!v }) },
      { type: 'button', label: 'Replay the hand-offs', act: () => { st.t = 0; paint(); } },
    ];
    const chosen = () => st.mode === 'parallel' ? TP : TB;
    const readouts = [
      { label: 'Hand-offs', get: () => ({ v: String(HO.hops.length), sub: HO.end, good: HO.ok, bad: !HO.ok }) },
      { label: 'Average reply', get: () => ({ v: `${chosen().avg.toFixed(2)} s`, sub: st.mode }) },
      { label: 'Tokens wasted', get: () => ({ v: chosen().waste.toLocaleString('en'), sub: 'on tripped requests', bad: chosen().waste > 6000, good: chosen().waste === 0 }) },
    ];
    const labels = [
      { name: 'triage', t: 'The help desk', d: 'Dark triage, purple disputes, blue identity, green airtime. A gold arrow per hand-off; at the limit, a person steps in', icon: 'user', atV: V(AX - 1.9, 0.3, AZ0 + 0.55) },
      { name: 'tools', t: 'Tools behind gates', d: 'Two function tools with guardrails, and a grey built-in file tool. Red: a request that went through unchecked', icon: 'link', atV: V(TXs(0) - 0.3, 0.2, TZ) },
      { name: 'guard', t: 'Guardrail timing', d: 'Top: check and model in parallel. Bottom: check first. Tower: average reply. Jar: tokens wasted on requests the check stopped', icon: 'scale', atV: V(3.05, 0.3, LZ(0)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Remove the hop limit', hint: 'back and forth forever', on: () => set({ ...D0, limit: 0 }), off: reset },
      { label: 'Guardrail in parallel when many trip', hint: '50% trip rate', on: () => set({ ...D0, rate: 0.5, mode: 'parallel' }), off: reset },
      { label: 'Guard function tools only', hint: 'built-in tools unchecked', on: () => set({ ...D0, toolPolicy: false }), off: reset },
    ];
    function status() {
      if (!HO.ok) return { ok: false, msg: '<b>Disputes needs the identity check first; identity needs the dispute ID first. With no hop limit they pass the customer back and forth 12 times and the session times out.</b> A handoff is just a tool any agent may call. Count hops, and past a small limit hand the conversation to a person with the history attached.' };
      if (st.mode === 'parallel' && TP.waste > 6000) return { ok: false, msg: `<b>With ${Math.round(st.rate * 100)}% of requests tripping the input guardrail, running it in parallel wastes ${TP.waste.toLocaleString('en')} tokens: the main model works on ${TP.trips} requests that are then thrown away.</b> Parallel is faster for passing requests (${TP.avg.toFixed(2)} s against ${TB.avg.toFixed(2)} s on average), but blocking wastes nothing. When many requests trip the check, run it first.` };
      if (!st.toolPolicy) return { ok: false, msg: '<b>The request to open another customer\'s statement went through read_file, a built-in tool, and no guardrail looked at it.</b> Tool guardrails fire on function tools only. Built-in tools such as file and web access need their own policy, and their results their own checks.' };
      return { ok: true, msg: `<b>${HO.hops.length} hand-offs, then ${HO.end}; every tool request was checked; the input guardrail ran ${st.mode === 'parallel' ? 'in parallel' : 'first'}: ${chosen().avg.toFixed(2)} s on average, ${chosen().waste.toLocaleString('en')} tokens wasted.</b> At a ${Math.round(st.rate * 100)}% trip rate, parallel saves ${(TB.avg - TP.avg).toFixed(2)} s a request for ${TP.waste.toLocaleString('en')} wasted tokens; raise the rate and blocking wins.` };
    }
    return {
      update: dt => { Object.values(nodes).forEach(N => N.r.userData.tick(dt)); person.userData.tick(dt); tools.forEach(T => T.g.userData.tick(dt)); lanes.forEach(L => L.t.userData.tick(dt)); if (st.t < HO.hops.length) { const k = Math.floor(st.t); st.t = Math.min(HO.hops.length, st.t + dt * 1.5); if (Math.floor(st.t) !== k) paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A help desk of agents', home: true, say: 'A mobile-money help desk in Lusaka: a triage agent reads each message and hands it to a specialist for disputes, identity or airtime.', act: m => m.set({ limit: 3, rate: 0.1, mode: 'parallel', toolPolicy: true }) },
    { t: 'Hand-offs are tools', home: true, say: 'To hand off, the triage agent calls a transfer tool, and the conversation continues with the specialist, history and all.', act: m => m.set({ limit: 3 }) },
    { t: 'Back and forth', home: true, say: 'Disputes wants an identity check first; identity wants the dispute number first. Without a limit, they pass the customer back and forth.', act: m => m.set({ limit: 0 }) },
    { t: 'Check in parallel', home: true, say: 'An input guardrail can run alongside the main model: passing requests are as fast as the model alone.', act: m => m.set({ limit: 3, rate: 0.1, mode: 'parallel' }) },
    { t: 'Or check first', home: true, say: 'When many requests trip the check, running it in parallel wastes the model\'s work on each. Run it first instead.', act: m => m.set({ rate: 0.5, mode: 'blocking' }) },
    { t: 'The unguarded tool', home: true, say: 'Tool guardrails watch function tools only. A built-in file tool needs its own policy, or it opens another customer\'s statement.', act: m => m.set({ rate: 0.1, mode: 'parallel', toolPolicy: false }) },
  ],
  check: [
    { q: 'How does one agent hand a conversation to another?', options: ['It calls a hand-off tool; the specialist continues with the history', 'It restarts the conversation', 'It emails the other agent'], answer: 0, why: 'Hand-offs are tools.', hint: 'Watch the triage agent.' },
    { q: 'Many requests trip the input guardrail. Parallel or blocking?', options: ['Blocking: parallel wastes the main model\'s tokens on each tripped request', 'Parallel: it is always faster', 'Neither'], answer: 0, why: 'Parallel trades tokens for latency.', hint: 'Try Guardrail in parallel when many trip.' },
    { q: 'Two specialists keep handing a customer back and forth. The fix?', options: ['A hop limit that escalates to a person', 'More specialists', 'A bigger model'], answer: 0, why: 'Count hops.', hint: 'Try Remove the hop limit.' },
  ],
  terms: [
    ['Hand-off', 'Passing the conversation to another agent by calling a tool.'],
    ['Input guardrail', 'A check on the request before the first agent works on it.'],
    ['Output guardrail', 'A check on the final answer before it is sent.'],
    ['Tool guardrail', 'A check on a function tool\'s arguments and permissions.'],
    ['Blocking guardrail', 'A check that runs before the main model starts.'],
    ['Session', 'Stored conversation history the SDK carries between turns.'],
  ],
  deeper: '<p><b>Tracing.</b> Each model call, tool call, hand-off and guardrail becomes a span in a trace; keep sensitive content out of spans, store it elsewhere and reference it by ID.</p><p><b>Other SDKs.</b> Other provider and open-source agent SDKs package the same loop with skills, hooks and subagents, covered in the skills and agent-SDK lesson; choosing a framework is covered in the trade-offs lesson.</p><p><b>About this machine.</b> Hand-offs follow a fixed back-and-forth between two specialists; guardrail timing assumes a 0.4 s check and a 2.0 s, 1,500-token main call over 20 requests, computed live.</p>',
  code: {
    title: 'Hand-offs with a hop limit; a blocking input guardrail',
    note: 'Adapted from the course\'s agents-SDK lesson.',
    text: `
async def run(conversation, agent, agents, guard, max_hops=3):
    if guard.blocking:                               # check first: nothing wasted
        if await guard.trips(conversation):
            return "Sorry, I can't help with that."
    hops = 0
    while True:
        reply = await agent.respond(conversation)    # may call transfer_to_<name>
        if reply.handoff is None:
            return reply.text
        hops += 1
        if hops > max_hops:
            return escalate_to_person(conversation)
        agent = agents[reply.handoff]                # history goes along
`,
  },
};
