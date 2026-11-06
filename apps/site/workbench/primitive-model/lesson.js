// The primitive model (phase 16, lesson 4): every multi-agent framework is four choices: agent, handoff, shared state, orchestrator. Three robots pass a baton in a Cape Town insurer's claims job.
// Pick a framework and the four sliders jump to its defaults. The job decides which orchestrator fits, so the same three robots succeed or stall.
const FW = {
  graph: { n: 'LangGraph', hand: 1, state: 1, orch: 0 },
  crew: { n: 'CrewAI', hand: 0, state: 0, orch: 1 },
  chat: { n: 'AutoGen GroupChat', hand: 2, state: 2, orch: 2 },
  swarm: { n: 'OpenAI Swarm', hand: 3, state: 0, orch: 3 },
};
const HAND = ['Task order', 'Graph edge', 'Selector picks', 'Tool call'];
const STATE = ['Message history', 'Typed state', 'Message pool'];
const ORCH = ['Explicit graph', 'Task list', 'Model selector', 'Last speaker'];
const JOB = { pipe: { n: 'a fixed claims pipeline', want: [0, 1] }, talk: { n: 'an open fraud discussion', want: [2] }, triage: { n: 'a live customer triage', want: [3] } };
function run(o) {
  const f = FW[o.fw], fit = JOB[o.job].want.includes(f.orch), clash = o.writers > 1 && !o.owner;
  const edges = f.orch === 0 && o.job === 'talk' ? 12 : 3;
  const calls = f.orch === 2 ? 8 : 4;
  return { f, fit, clash, edges, calls, ok: fit && !clash };
}

export default {
  slug: 'primitive-model',
  title: 'Four primitives: read any agent framework in a paragraph',
  description: 'Every new multi-agent framework is four choices. Set the dials, and one framework after another turns out to be familiar.',
  overview: 'A new multi-agent framework ships every few months, each claiming to be the right abstraction. The APIs differ, and one\'s blackboard is another\'s message pool. Underneath, four primitives have stayed stable. An agent is a system prompt and a tool list. A handoff is a structured transfer of control, whether a tool call or a graph edge. Shared state is anything more than one agent can read. And an orchestrator is whoever decides who speaks next: a graph, a model, the last speaker. That is the design space. Each framework picks defaults on these axes, and the rest is syntax. Learn this once and you can read the next framework in one paragraph.',
  keywords: ['multi-agent', 'agent frameworks', 'handoffs', 'shared state', 'orchestration', 'LangGraph', 'AutoGen'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.68, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { fw: 'graph', job: 'pipe', writers: 1, owner: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const AX = [-0.15, 0.85, 1.85], bots = AX.map((x, i) => { const r = add(P.robot(['#5B8DB8', '#7B6FA8', '#D98BA6'][i], { scale: 0.8 })); r.position.set(x, 0.03, -0.2); return r; });
    const baton = P.ball(0.1, SAF); baton.userData.noFit = true; S.add(baton);
    const pool = P.cyl(0.5, 0.08, '#5B8DB8'); pool.position.set(0.85, 0.03, 0.45); S.add(pool);
    const CX = i => -2.3 + i * 0.5, MAX = [4, 3, 4];
    const cols = [0, 1, 2].map(i => {
      const slot = P.box(0.3, 1.0, 0.1, '#6B6E7E', { r: 0.02 }); slot.position.set(CX(i), 0.03, 0); S.add(slot);
      const knob = P.box(0.42, 0.14, 0.2, SAF, { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: SAF }) }); knob.userData.noFit = true; S.add(knob); return { knob, y: 0.1, to: 0.1 };
    });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.1 })); lamp.position.set(2.32, 0.03, 0.45);
    S.add(P.keep(-2.5, 2.5, 1.1, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      [R.f.hand, R.f.state, R.f.orch].forEach((v, i) => { cols[i].to = 0.1 + v / (MAX[i] - 1) * 0.72; });
      lamp.userData.set({ color: R.ok ? GOOD : BAD, on: true });
      bots.forEach(b => b.userData.set({ busy: R.ok }));
    }
    draw(); cols.forEach(c => { c.y = c.to; c.knob.position.set(0, c.y, 0.08); }); cols.forEach((c, i) => c.knob.position.x = CX(i)); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['graph', 'crew', 'chat', 'swarm'], JK = ['pipe', 'talk', 'triage'];
    const controls = [
      { type: 'buttons', label: 'The framework', options: ['LangGraph', 'CrewAI', 'GroupChat', 'Swarm'], get: () => FK.indexOf(st.fw), act: i => set({ fw: FK[i] }) },
      { type: 'buttons', label: 'The job', options: ['Fixed pipeline', 'Open discussion', 'Live triage'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'slider', label: 'Agents writing to shared state', min: 1, max: 3, step: 1, get: () => st.writers, set: v => set({ writers: v }) },
      { type: 'toggle', label: 'Each field has one owner', short: 'Owners', get: () => st.owner, set: v => set({ owner: !!v }) },
    ];
    const readouts = [
      { label: 'Handoff', get: () => ({ v: HAND[R.f.hand], sub: R.f.n }) },
      { label: 'Shared state', get: () => ({ v: STATE[R.f.state], sub: R.clash ? 'fields overwritten' : 'who reads what', bad: R.clash }) },
      { label: 'Who speaks next', get: () => ({ v: ORCH[R.f.orch], sub: `${JOB[st.job].n}`, good: R.fit, bad: !R.fit }) },
    ];
    const labels = [
      { name: 'k', t: 'Three dials', d: 'Handoff, state, orchestrator', icon: 'target', atV: V(CX(0) - 0.15, 0.7, 0.05) },
      { name: 'b', t: 'Agents and a baton', d: 'Prompt plus tools, nothing more', icon: 'user', atV: V(2.25, 0.45, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Model selector on a fixed pipeline', hint: 'paying to pick the obvious', on: () => set({ ...D0, fw: 'chat' }), off: reset },
      { label: 'A graph for an open discussion', hint: 'edges explode', on: () => set({ ...D0, job: 'talk' }), off: reset },
      { label: 'Everyone writes the same field', hint: 'shared state, no owners', on: () => set({ ...D0, writers: 3, owner: false }), off: reset },
    ];
    function status() {
      if (R.clash) return { ok: false, msg: `<b>${st.writers} agents wrote the same field, and the last write won.</b> Shared state is a primitive with real rules: who writes which field. Any framework can do this to you, whatever it calls its state.` };
      if (st.job === 'talk' && R.f.orch === 0) return { ok: false, msg: `<b>${R.edges} edges to draw and the talk still doesn't flow.</b> A graph must name every path in advance, and open discussion has too many. This job wants a selector.` };
      if (st.job === 'pipe' && R.f.orch === 2) return { ok: false, msg: `<b>${R.calls} model calls where 4 would do, and the order can change.</b> A model picks who speaks next in a job whose order was always known. Use a graph or a task list.` };
      if (!R.fit) return { ok: false, msg: `<b>${R.f.n} defaults to "${ORCH[R.f.orch]}", which is wrong for ${JOB[st.job].n}.</b> You can bend it, but the mismatch sits on one primitive: who decides who speaks next.` };
      return { ok: true, msg: `<b>${R.f.n} in one line: handoff by ${HAND[R.f.hand].toLowerCase()}, state in ${STATE[R.f.state].toLowerCase()}, next speaker by ${ORCH[R.f.orch].toLowerCase()}.</b> That reading fits ${JOB[st.job].n}, and it will fit the next framework too.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); cols.forEach(c => { c.y += (c.to - c.y) * Math.min(1, dt * 6); c.knob.position.y = c.y; });
        u = (u + dt * 0.5) % 3; const i = Math.floor(u), k = u - i, a = AX[i], b = AX[(i + 1) % 3];
        baton.position.set(a + (b - a) * k, 0.95 + Math.sin(k * Math.PI) * 0.15, -0.2);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A new one every month', home: true, say: 'An insurer in Cape Town has three agents and a list of frameworks. The names differ. Look at what stays the same.', act: m => m.set({ fw: 'graph', job: 'pipe', writers: 1, owner: true }) },
    { t: 'Agent and handoff', home: true, say: 'An agent is a prompt and tools. A handoff passes control, as a graph edge here, or as a tool call in Swarm.', act: m => m.set({ fw: 'swarm', job: 'triage', writers: 1, owner: true }) },
    { t: 'Shared state', home: true, say: 'Shared state is whatever several agents can read. Let all three write one field, and the last write wins.', act: m => m.set({ fw: 'graph', job: 'pipe', writers: 3, owner: false }) },
    { t: 'Who speaks next', home: true, say: 'The orchestrator decides who goes next. In a graph, the path is fixed. That suits a fixed pipeline.', act: m => m.set({ fw: 'graph', job: 'pipe', writers: 1, owner: true }) },
    { t: 'A selector', home: true, say: 'For an open fraud discussion, a graph would need every path drawn. A selector model picks the next speaker instead.', act: m => m.set({ fw: 'chat', job: 'talk', writers: 1, owner: true }) },
    { t: 'One paragraph', home: true, say: 'Four choices. Read the next framework by finding these four, and the rest is syntax.', act: m => m.set({ fw: 'crew', job: 'pipe', writers: 1, owner: true }) },
  ],
  check: [
    { q: 'Which is not one of the four primitives?', options: ['Vector database', 'Handoff', 'Orchestrator'], answer: 0, why: 'Agent, handoff, shared state, orchestrator.', hint: 'Read the readouts.' },
    { q: 'What does an orchestrator decide?', options: ['Who speaks next', 'Which model to train', 'The prompt wording'], answer: 0, why: 'It may be a graph, a model or the last speaker.', hint: 'See Who speaks next.' },
    { q: 'Why does a graph suit a fixed pipeline but not an open discussion?', options: ['Every path must be named in advance', 'Graphs are slow', 'Graphs have no tools'], answer: 0, why: 'Open talk has too many paths.', hint: 'Try A graph for an open discussion.' },
  ],
  terms: [
    ['Agent', 'A system prompt plus a tool list.'],
    ['Handoff', 'A structured transfer of control.'],
    ['Shared state', 'Data more than one agent can read.'],
    ['Orchestrator', 'Whoever decides who speaks next.'],
    ['Blackboard', 'Another name for shared state.'],
    ['Stateless agent', 'One that starts from its prompt and history each run.'],
  ],
  deeper: '<p><b>Try it.</b> Take any framework\'s docs and fill in four lines: what is an agent, how does control pass, what do they share, who picks next.</p><p><b>Defaults, not limits.</b> Most frameworks can be bent to any setting. These dials show where each is comfortable.</p><p><b>The dials here</b> show common defaults, and frameworks offer several modes.</p>',
  code: {
    title: 'Four primitives',
    note: 'Adapted from the course\'s stdlib primitives (code/main.py).',
    text: `
@dataclass
class Agent:
    system: str
    tools: list

def run(agents, state, next_speaker):            # orchestrator
    speaker = agents[0]
    while speaker:
        reply = speaker.act(state)               # reads shared state
        state.messages.append(reply)
        speaker = next_speaker(reply, state)     # graph, model or handoff
    return state
`,
  },
};
