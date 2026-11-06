// Communication protocols (phase 16, lesson 3): an agent at a Lagos freight marketplace needs to reach four things. Four pipes: MCP to a tool, A2A to another agent, ACP where every step must be audited,
// ANP across companies with no shared registry. Choose the pipe for the job; raw strings between agents are the baseline that fails. Each job has one best pipe.
const PIPE = {
  raw: { n: 'Raw strings', good: [] },
  mcp: { n: 'MCP', good: ['tool'] },
  a2a: { n: 'A2A', good: ['agent'] },
  acp: { n: 'ACP', good: ['audit'] },
  anp: { n: 'ANP', good: ['open'] },
};
const JOB = {
  tool: { n: 'Use a rates database', t: 'a tool', p: 'mcp' },
  agent: { n: 'Delegate customs work', t: 'another team\'s agent', p: 'a2a' },
  audit: { n: 'A bank\'s audited step', t: 'an audited partner', p: 'acp' },
  open: { n: 'Meet a stranger\'s agent', t: 'an unknown company\'s agent', p: 'anp' },
};
const WHY = {
  mcp: 'MCP lists a server\'s tools and calls them, and suits things that don\'t think for themselves.',
  a2a: 'A2A gives an agent a card to be found by, and tasks that can run long and report back.',
  acp: 'ACP is built for enterprise records of who asked for what.',
  anp: 'ANP aims at trust without a central registry, so strangers can verify each other.',
};
function run(o) {
  const best = JOB[o.job].p, fit = o.pipe === best, parsed = o.pipe !== 'raw';
  return { best, fit, parsed, retries: o.pipe === 'raw' ? 6 : fit ? 0 : 3, ok: fit };
}

export default {
  slug: 'communication-protocols',
  title: 'Agent protocols: four pipes, four jobs',
  description: 'Strings between agents break quietly. See which protocol solves which problem, and what goes wrong with the wrong pipe.',
  overview: 'Split a system into agents and they have to talk. The first attempt is passing strings, which works until one agent changes its wording and another misreads it. Protocols give that talk a shape, and different protocols answer different questions. MCP connects an agent to tools and data. A2A lets one agent find another and delegate a task that may run for hours. ACP adds the enterprise record of who asked what. ANP aims at trust between strangers, with no central registry. They stack rather than compete: an agent can find tools through MCP and delegate through A2A in one system. The first question is what sits at the other end.',
  keywords: ['MCP', 'A2A', 'ACP', 'ANP', 'agent protocols', 'multi-agent systems'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { job: 'tool', pipe: 'mcp' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const hub = add(P.robot(SAF, { scale: 1 })); hub.position.set(-2.0, 0.03, 0);
    const ZS = [-0.54, -0.18, 0.18, 0.54], KS = ['mcp', 'a2a', 'acp', 'anp'], TGT = ['tool', 'agent', 'audit', 'open'];
    const pipes = ZS.map((z, i) => add(P.pipe([V(-1.6, 0.25, z * 0.4), V(-0.8, 0.25, z), V(1.2, 0.25, z)], BLUE, { r: 0.05, n: 5, speed: 0.5 })));
    const ends = ZS.map((z, i) => {
      if (i === 0) { const b = P.box(0.5, 0.42, 0.3, '#6B6E7E', { r: 0.04 }); b.position.set(1.55, 0.03, z); S.add(b); return b; }
      const r = add(P.robot(['#7B6FA8', '#A87A4F', '#D98BA6'][i - 1], { scale: 0.48 })); r.position.set(1.5, 0.03, z); return r;
    });
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.2, 0.03, 0);
    S.add(P.keep(-2.5, 2.5, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const ti = TGT.indexOf(st.job), pi = KS.indexOf(st.pipe);
      pipes.forEach((p, i) => p.userData.set({ on: i === pi || (st.pipe === 'raw' && i === ti), pipe: i === pi ? (R.fit ? GOOD : BAD) : st.pipe === 'raw' && i === ti ? BAD : GREY, color: R.fit ? GOOD : BAD }));
      lamp.userData.set({ color: R.fit ? GOOD : BAD, on: true });
      hub.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['tool', 'agent', 'audit', 'open'], PK = ['raw', 'mcp', 'a2a', 'acp', 'anp'];
    const controls = [
      { type: 'buttons', label: 'The job', options: ['Rates database', 'Customs agent', 'Audited bank', 'A stranger'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'The pipe', options: ['Raw strings', 'MCP', 'A2A', 'ACP', 'ANP'], get: () => PK.indexOf(st.pipe), act: i => set({ pipe: PK[i] }) },
    ];
    const readouts = [
      { label: 'At the other end', get: () => ({ v: JOB[st.job].t, sub: JOB[st.job].n }) },
      { label: 'Best pipe', get: () => ({ v: PIPE[R.best].n, sub: R.fit ? 'you chose it' : `you chose ${PIPE[st.pipe].n}`, good: R.fit, bad: !R.fit }) },
      { label: 'Failed attempts', get: () => ({ v: `${R.retries} in 10`, sub: R.parsed ? 'a mismatch of shape' : 'misread strings', good: !R.retries, bad: R.retries > 4 }) },
    ];
    const labels = [
      { name: 'p', t: 'Four pipes', d: 'Back to front: MCP, A2A, ACP, ANP', icon: 'link', atV: V(-2.25, 0.5, 0) },
      { name: 'e', t: 'Four kinds of far end', d: 'A tool, then three agents', icon: 'box', atV: V(2.4, 0.5, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Just pass strings', hint: 'no shared shape', on: () => set({ job: 'agent', pipe: 'raw' }), off: reset },
      { label: 'Wrap an agent as a tool', hint: 'MCP for a long delegation', on: () => set({ job: 'agent', pipe: 'mcp' }), off: reset },
      { label: 'Assume trust with a stranger', hint: 'A2A, no shared registry', on: () => set({ job: 'open', pipe: 'a2a' }), off: reset },
    ];
    function status() {
      const j = JOB[st.job];
      if (st.pipe === 'raw') return { ok: false, msg: `<b>${R.retries} in 10 failed, with no errors raised.</b> One agent rewords its reply and the next misreads it. Nothing says what a field means, how to report a failure, or whether the task finished. A shape solves all three.` };
      if (!R.fit) return { ok: false, msg: `<b>${PIPE[st.pipe].n} can carry this, awkwardly: ${R.retries} in 10 failed.</b> The far end is ${j.t}, and ${WHY[R.best]} Use the pipe made for what sits at the other end.` };
      return { ok: true, msg: `<b>${PIPE[st.pipe].n} fits ${j.t}.</b> ${WHY[R.best]} These stack, so one system can use several at once.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Passing strings', home: true, say: 'A freight marketplace in Lagos splits its system into agents. The first try passes plain strings, and failures slip through without a sound.', act: m => m.set({ job: 'agent', pipe: 'raw' }) },
    { t: 'MCP for tools', home: true, say: 'For a rates database, use MCP. The agent lists what a server offers, then calls it.', act: m => m.set({ job: 'tool', pipe: 'mcp' }) },
    { t: 'A2A for agents', home: true, say: 'Customs work belongs to another team\'s agent. A2A lets you find it by its card and hand over a task that runs for hours.', act: m => m.set({ job: 'agent', pipe: 'a2a' }) },
    { t: 'ACP for records', home: true, say: 'A bank needs a record of who asked for what. ACP adds that enterprise layer.', act: m => m.set({ job: 'audit', pipe: 'acp' }) },
    { t: 'ANP for strangers', home: true, say: 'An unknown company\'s agent has no shared registry. ANP aims at trust without a central party.', act: m => m.set({ job: 'open', pipe: 'anp' }) },
    { t: 'They stack', home: true, say: 'These aren\'t rivals. One agent can find tools with MCP and delegate with A2A. Ask what sits at the other end.', act: m => m.set({ job: 'agent', pipe: 'a2a' }) },
  ],
  check: [
    { q: 'What does MCP connect an agent to?', options: ['Tools and data', 'Other companies\' agents only', 'A payment system'], answer: 0, why: 'A2A is the one for agent-to-agent work.', hint: 'Choose Rates database.' },
    { q: 'Which protocol fits a long task handed to another agent?', options: ['A2A', 'MCP', 'Raw strings'], answer: 0, why: 'It has agent cards and long-running tasks.', hint: 'Try Wrap an agent as a tool.' },
    { q: 'What is the first question when choosing a protocol?', options: ['What sits at the other end?', 'Which is newest?', 'Which has the most stars?'], answer: 0, why: 'Tool, agent, audited partner or stranger.', hint: 'Try each job.' },
  ],
  terms: [
    ['MCP', 'Model Context Protocol: agent to tools and data.'],
    ['A2A', 'Agent to Agent: one agent delegates to another.'],
    ['ACP', 'Agent Communication Protocol: audited enterprise messaging.'],
    ['ANP', 'Agent Network Protocol: trust without a central registry.'],
    ['Agent card', 'A document saying what an agent can do.'],
    ['Discovery', 'Finding what is available before you call it.'],
  ],
  deeper: '<p><b>Young standards.</b> MCP and A2A have wide adoption. ACP and ANP are younger, and the names and scope shift. Check who actually speaks a protocol before you depend on it.</p><p><b>Failure rates</b> here are illustrative. The real cost of strings is that failures are silent.</p><p><b>Next.</b> A later lesson opens up A2A\'s task model.</p>',
  code: {
    title: 'Two protocols in one agent',
    note: 'A Python sketch of the course\'s TypeScript example (code/main.ts).',
    text: `
tools = await mcp.list_tools()                     # what can I call?
rates = await mcp.call_tool("get_rates", {"lane": "LOS-ACC"})

card = await fetch_json(url + "/.well-known/agent-card.json")
task = await a2a.send_task(card, {"text": "Clear this manifest", "data": rates})
while task.state not in ("completed", "failed"):
    task = await a2a.get_task(task.id)             # may take hours
`,
  },
};
