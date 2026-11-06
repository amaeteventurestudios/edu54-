// Agent state machines: a bus company's refund agent in Kigali, written as an explicit graph and run step by step by a tiny graph runtime.
// Nodes: agent (the model decides the next move), tools (lookup_booking, check_policy, issue_refund, reply), review (a person approves refunds), end.
// State: a list of messages; each node returns new messages and a reducer appends them (or, if the reducer is forgotten, replaces the list).
// The model here is a fixed policy: look up the booking, then check the refund policy, then propose a refund (it proposes one even when the policy says no:
// the model's mistake), then reply. A checkpoint is saved after every node. Optional interrupt: pause before any issue_refund until a person decides.
// Optional crash: the server restarts right after issue_refund runs. With a checkpointer the thread resumes from the last checkpoint; without one it starts over.
// A recursion limit stops runs at 16 steps.
const LIMIT = 16;
const CUST = [
  { ask: 'My 7:00 bus to Huye was cancelled. Can I have my fare back?', ok: true, rule: 'cancelled by us: full refund' },
  { ask: 'I missed the 7:00 bus to Huye. Can I have my fare back?', ok: false, rule: 'missed by the passenger: no refund' },
];
function run(st) {
  const C = CUST[st.cust], steps = [], ckpt = [];
  let msgs = [{ r: 'user', t: C.ask }], refunds = 0, crashed = false, node = 'agent', n = 0, asked = false, decided = null;
  const apply = add => { msgs = st.reducer ? [...msgs, ...add] : add.slice(); };
  const has = re => msgs.some(m => re.test(m.t));
  const save = (nd, note) => { ckpt.push({ id: ckpt.length + 1, node: nd, msgs: msgs.slice(), refunds }); steps.push({ node: nd, note, msgs: msgs.slice(), ck: st.ckpt ? ckpt.length : 0, refunds }); };
  while (n < LIMIT) {
    n++;
    if (node === 'agent') {
      let call;
      if (!has(/^booking /)) call = 'lookup_booking'; else if (!has(/^policy /)) call = 'check_policy';
      else if (!has(/^refund issued|^refund refused/)) call = 'issue_refund'; else call = null;
      if (call) { apply([{ r: 'model', t: `call ${call}` }]); save('agent', `model calls ${call}`); node = call === 'issue_refund' && st.interrupt ? 'review' : 'tools'; }
      else { apply([{ r: 'model', t: has(/^refund issued/) ? 'Your refund is on its way.' : 'Sorry, missed trips can\'t be refunded.' }]); save('agent', 'model replies'); node = 'end'; }
      continue;
    }
    if (node === 'review') {
      asked = true; decided = C.ok;
      steps.push({ node: 'review', note: 'paused: waiting for a person', msgs: msgs.slice(), ck: st.ckpt ? ckpt.length : 0, refunds, pause: true });
      if (C.ok) { node = 'tools'; save('review', 'person approves: the policy allows it'); }
      else { apply([{ r: 'tool', t: 'refund refused by reviewer' }]); save('review', 'person rejects: not allowed by policy'); node = 'agent'; }
      continue;
    }
    if (node === 'tools') {
      const last = msgs.filter(m => m.r === 'model').pop()?.t || '';
      if (/lookup_booking/.test(last)) apply([{ r: 'tool', t: 'booking KGL-HUY 07:00, seat 14, paid' }]);
      else if (/check_policy/.test(last)) apply([{ r: 'tool', t: `policy ${C.rule}` }]);
      else if (/issue_refund/.test(last)) { refunds++; apply([{ r: 'tool', t: 'refund issued to mobile money' }]); }
      save('tools', last.replace('call ', 'ran '));
      if (/issue_refund/.test(last) && st.crash && !crashed) {
        crashed = true;
        steps.push({ node: 'crash', note: 'server restarts', msgs: [], ck: st.ckpt ? ckpt.length : 0, refunds, crash: true });
        if (st.ckpt) { msgs = ckpt[ckpt.length - 1].msgs.slice(); steps.push({ node: 'tools', note: `resumed from checkpoint ${ckpt.length}`, msgs: msgs.slice(), ck: ckpt.length, refunds, resume: true }); }
        else { msgs = [{ r: 'user', t: C.ask }]; steps.push({ node: 'start', note: 'no checkpoint: the thread starts over', msgs: msgs.slice(), ck: 0, refunds, resume: true }); }
      }
      node = 'agent';
      continue;
    }
    if (node === 'end') break;
  }
  const hitLimit = n >= LIMIT && node !== 'end';
  if (node === 'end' || hitLimit) steps.push({ node: hitLimit ? 'limit' : 'end', note: hitLimit ? `recursion limit: ${LIMIT} steps` : 'done', msgs: msgs.slice(), ck: st.ckpt ? ckpt.length : 0, refunds });
  return { steps, refunds, asked, decided, hitLimit, wrong: refunds > 0 && !C.ok, double: refunds > 1, ck: st.ckpt ? ckpt.length : 0 };
}

export default {
  slug: 'langgraph-state-machines',
  title: 'Agent graphs: state, checkpoints, a pause for people',
  description: 'A bus company\'s refund agent in Kigali, drawn as a graph with a checkpoint after every step, a pause for a person, and a server restart.',
  overview: 'A hand-written agent is a loop: ask the model, run the tool it asked for, repeat. Written as an explicit graph instead, the same agent gets handles you can hold. State is a typed record, here a list of messages, that flows through nodes; each node returns an update and a reducer merges it, appending messages rather than replacing them. Edges connect nodes, and conditional edges route on what the model said: to the tools if it asked for one, to the end if it answered. Compiled with a checkpointer, the runtime saves the state after every step under a thread ID, so a run can resume where it stopped after a crash or a restart, and old checkpoints can be replayed or forked for debugging. An interrupt pauses the graph before a chosen node, such as one that moves money, until a person resumes it with a decision. Libraries such as LangGraph provide this runtime; the agent\'s logic stays the same, but the harness around it can be paused, inspected, rewound and trusted with side effects.',
  keywords: ['agent state machine', 'LangGraph', 'checkpointing', 'human in the loop', 'interrupt', 'reducer', 'ReAct agent'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cust: 0, reducer: true, ckpt: true, interrupt: true, crash: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', BLUE = '#5B8DB8';
    /* the graph: blocks for the nodes, rods for the edges, a gold ball for where the run is; a little reviewer stands at the review node */
    const NP = { start: [-2.6, -0.55], agent: [-1.55, -0.55], tools: [-1.55, 0.55], review: [-0.45, 0.55], end: [0.5, -0.55] };
    const gp = P.box(3.75, 0.02, 2.2, '#FFFFFF', { r: 0.03 }); gp.position.set(-1.0, 0, 0.0); S.add(gp);
    const nodes = {};
    Object.entries(NP).forEach(([k, [x, z]]) => {
      const mm = new THREE.MeshLambertMaterial({ color: k === 'review' ? SAF : k === 'agent' ? CHAR : k === 'tools' ? BLUE : '#8E8C84' });
      const b = P.box(k === 'start' || k === 'end' ? 0.42 : 0.7, 0.3, 0.46, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0.01, z); S.add(b);
      nodes[k] = { b, mm, x, z, base: mm.color.getHex() };
    });
    const edge = (a, b, off = 0) => {
      const [x1, z1] = NP[a], [x2, z2] = NP[b], dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz) - 0.5;
      const e = P.box(Math.max(0.05, len), 0.03, 0.04, '#9A968C', { r: 0 }); e.position.set((x1 + x2) / 2 + off, 0.05, (z1 + z2) / 2 + off); e.rotation.y = -Math.atan2(dz, dx); S.add(e);
      return e;
    };
    edge('start', 'agent'); edge('agent', 'tools', -0.06); edge('tools', 'agent', 0.06); edge('agent', 'review'); edge('review', 'tools'); edge('agent', 'end');
    const person = P.robot(SAF, { scale: 0.6 }); person.position.set(-0.45, 0.31, 0.55); S.add(person);
    const tok = P.ball(0.1, SAF); tok.userData.noFit = true; S.add(tok);
    /* state: a stack of message slabs (dark: user, charcoal: model, blue: tool); checkpoints: a stack of teal plates; refunds: coins in a jar */
    const MX = 1.3, KX = 2.15, SZ = -0.35, MC = { user: '#151827', model: '#6B6E7E', tool: BLUE };
    const mstack = P.stack(0.55, 0.4, 0.09, { max: 14 }); mstack.position.set(MX, 0.02, SZ); S.add(mstack);
    const kstack = P.stack(0.55, 0.55, 0.07, { max: 14, color: GOOD }); kstack.position.set(KX, 0.02, SZ); S.add(kstack);
    const jar = P.jar(0.22, 0.5, { max: 4 }); jar.position.set(KX + 0.2, 0, 0.6); S.add(jar);
    S.add(P.keep(-2.9, 2.5, 1.3, -1.1, 1.1));
    let R = null, k = 0, clock = 0;
    const SP = 1.0;
    function show() {
      const s = R.steps[Math.min(k, R.steps.length - 1)];
      const key = s.node === 'crash' ? null : s.node === 'limit' ? 'agent' : s.node;
      const p = key && NP[key] ? NP[key] : [0, 0];
      Object.entries(nodes).forEach(([nk, nd]) => nd.mm.color.setHex(nk === key ? (s.pause ? 0xF2AE0C : 0x1F9E89) : nd.base));
      tok.visible = !!key; tok.position.set(p[0], 0.45, p[1]);
      if (s.crash) Object.values(nodes).forEach(nd => nd.mm.color.set(RED));
      person.userData.set({ busy: !!s.pause });
      const ms = s.msgs.slice(-14);
      mstack.userData.set({ n: ms.length, colors: ms.map(m => MC[m.r] || CHAR) });
      kstack.userData.set({ n: Math.min(14, s.ck), colors: Array.from({ length: Math.min(14, s.ck) }, (_, i) => s.resume && i + 1 === s.ck ? SAF : GOOD) });
      jar.userData.set({ n: s.refunds, color: s.refunds > 1 || (s.refunds && !CUST[st.cust].ok) ? RED : '#E3A72F' });
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { person.userData.tick(dt); clock += dt; if (clock >= SP) { clock -= SP; if (k < R.steps.length - 1) { k++; show(); } } };
    const controls = [
      { type: 'buttons', label: 'Customer', options: ['Bus cancelled', 'Missed the bus'], get: () => st.cust, act: i => set({ cust: i }) },
      { type: 'toggle', label: 'Append messages (reducer)', short: 'Reducer', get: () => st.reducer, set: v => set({ reducer: !!v }), quick: false },
      { type: 'toggle', label: 'Save a checkpoint every step', short: 'Checkpoints', get: () => st.ckpt, set: v => set({ ckpt: !!v }) },
      { type: 'toggle', label: 'Pause before refunds', short: 'Pause', get: () => st.interrupt, set: v => set({ interrupt: !!v }) },
      { type: 'toggle', label: 'Server restarts after the refund', short: 'Restart', get: () => st.crash, set: v => set({ crash: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => { k = 0; clock = 0; show(); } },
    ];
    const readouts = [
      { label: 'Refunds issued', get: () => ({ v: `${R.refunds}`, sub: CUST[st.cust].ok ? 'should be 1' : 'should be 0', bad: R.double || R.wrong, good: !R.double && !R.wrong }) },
      { label: 'Steps', get: () => ({ v: `${R.steps.length}`, sub: R.hitLimit ? 'hit the limit' : 'to finish', bad: R.hitLimit }) },
      { label: 'Checkpoints', get: () => ({ v: `${R.ck}`, sub: 'saved for this thread' }) },
    ];
    const labels = [
      { name: 'graph', t: 'The graph', d: 'Start, agent (dark), tools (blue), review (gold), end; the ball is the run', icon: 'link', atV: V(-2.85, 0.15, -0.55) },
      { name: 'msgs', t: 'State: messages', d: 'Dark user, grey model, blue tool', icon: 'layers', atV: V(MX - 0.3, 0.2, SZ + 0.2) },
      { name: 'ckpt', t: 'Checkpoints', d: 'One plate per step; gold is the one resumed from', icon: 'check', atV: V(KX + 0.3, 0.3, SZ) },
      { name: 'refund', t: 'Refunds paid', d: 'Coins in the jar; red means wrong or paid twice', icon: 'money', atV: V(KX + 0.44, 0.2, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget the reducer', hint: 'each update replaces the messages', on: () => set({ ...D0, reducer: false }), off: reset },
      { label: 'No checkpoints', hint: 'and the server restarts', on: () => set({ ...D0, ckpt: false }), off: reset },
      { label: 'No pause for people', hint: 'a passenger who missed the bus', on: () => set({ ...D0, cust: 1, interrupt: false }), off: reset },
    ];
    function status() {
      if (R.hitLimit) return { ok: false, msg: `<b>No reducer: the agent stopped at the recursion limit after ${LIMIT} steps.</b> Each node's update replaced the message list instead of adding to it, so the model never saw the booking it had just looked up and asked for it again, and again. Message lists need a reducer that appends.` };
      if (R.double) return { ok: false, msg: `<b>No checkpoints: the passenger was refunded ${R.refunds === 2 ? 'twice' : `${R.refunds} times`}.</b> The server restarted just after the refund; with nothing saved for the thread, the run started over from the customer's message and every tool ran again, including the refund. Saving state after every step lets the thread resume where it stopped.` };
      if (R.wrong) return { ok: false, msg: `<b>No pause for people: a passenger who missed the bus was refunded.</b> The policy said no, but the model proposed a refund anyway and nothing stopped it. An interrupt before any node that moves money lets a person read the state and approve or reject.` };
      return { ok: true, msg: `<b>${CUST[st.cust].ok ? 'One refund, approved by a person, and the restart cost nothing.' : 'The model proposed a refund; a person rejected it, and the agent apologised.'}</b> ${R.ck} checkpoints saved for the thread. ${st.crash && CUST[st.cust].ok && st.ckpt ? 'After the restart the thread resumed from the last checkpoint, so the refund was not repeated.' : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An agent as a graph', home: true, say: 'A bus company\'s refund agent in Kigali, drawn as a graph. The model node decides; the tools node runs what it asked for; edges route between them. A customer\'s seven o\'clock bus to Huye was cancelled.', act: m => m.set({ cust: 0, reducer: true, ckpt: true, interrupt: true, crash: false }) },
    { t: 'State and a reducer', home: true, say: 'The state is a list of messages. Each node returns new messages, and a reducer appends them, so the model always sees the booking and the policy it has already fetched.', act: m => m.set({ crash: false }) },
    { t: 'Pause for a person', home: true, say: 'Before any refund, the graph pauses. A person reads the state, sees the bus was cancelled, and approves. Then the refund tool runs.', act: m => m.set({ interrupt: true }) },
    { t: 'A restart, with checkpoints', home: true, say: 'Right after the refund, the server restarts. Every step was saved under the thread\'s ID, so the run resumes from the last checkpoint and simply replies.', act: m => m.set({ crash: true }) },
    { t: 'A restart, without', home: true, say: 'Without checkpoints, the restart starts the thread over, and every tool runs again. The customer is refunded twice.', act: m => m.set({ ckpt: false }) },
    { t: 'When the model is wrong', home: true, say: 'Another customer missed the bus. The model proposes a refund anyway. The pause lets a person reject it, and the agent apologises instead.', act: m => m.set({ ckpt: true, crash: false, cust: 1 }) },
  ],
  check: [
    { q: 'What happens if a message list has no appending reducer?', options: ['Each update replaces the list, so the model forgets earlier results', 'Messages are sorted', 'Nothing changes'], answer: 0, why: 'The agent re-asks for what it already fetched and can loop.', hint: 'Try Forget the reducer.' },
    { q: 'Why save a checkpoint after every step?', options: ['A run can resume where it stopped instead of repeating side effects', 'It makes the model faster', 'It saves tokens'], answer: 0, why: 'Starting over re-ran the refund.', hint: 'Try No checkpoints.' },
    { q: 'Where should an interrupt go?', options: ['Before nodes with consequences, such as moving money', 'After the end node', 'Before every model call'], answer: 0, why: 'A person approves or rejects with the full state in front of them.', hint: 'Try No pause for people.' },
  ],
  terms: [
    ['State graph', 'An agent written as nodes and edges with a typed state flowing through them.'],
    ['Node', 'One step: call the model, run tools, ask a person.'],
    ['Conditional edge', 'A route chosen by a function of the state, such as "did the model ask for a tool?"'],
    ['Reducer', 'The rule that merges a node\'s update into the state, such as appending messages.'],
    ['Checkpoint', 'The state saved after a step, under a thread ID, so a run can resume or be replayed.'],
    ['Interrupt', 'A pause before a node until a person or another system resumes it.'],
    ['Time travel', 'Replaying or forking a run from an earlier checkpoint.'],
  ],
  deeper: '<p><b>Streaming.</b> A graph can stream each node\'s update as it happens, or the model\'s tokens inside a node, so a screen can show "looking up your booking…" while it works.</p><p><b>Fan-out and subgraphs.</b> A node can start several copies of another node in parallel, such as three searches at once, with their updates merged by the reducers. A whole compiled graph can be one node in a bigger graph, which is how a supervisor routes work to specialist agents.</p><p><b>Where checkpoints live.</b> Memory for tests; a database such as Postgres in production, so any server can resume any thread. Replaying a production thread from its checkpoints makes a regression test.</p><p><b>About this machine.</b> The graph runtime here is a few dozen lines: a fixed policy plays the model, tools return set answers, and the run is computed step by step from your settings with a limit of 16 steps.</p>',
  code: {
    title: 'The same agent, as a graph',
    note: 'Adapted from the course\'s agent state machine lesson (LangGraph).',
    text: `
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.postgres import PostgresSaver

class State(TypedDict):
    messages: Annotated[list, add_messages]   # the reducer: append, don't replace

def route(state):
    calls = getattr(state["messages"][-1], "tool_calls", None)
    if not calls: return END
    return "review" if calls[0]["name"] == "issue_refund" else "tools"

g = StateGraph(State)
g.add_node("agent", call_model); g.add_node("tools", run_tools); g.add_node("review", approve)
g.set_entry_point("agent")
g.add_conditional_edges("agent", route)
g.add_edge("review", "tools"); g.add_edge("tools", "agent")
app = g.compile(checkpointer=PostgresSaver(conn), interrupt_before=["review"])
app.invoke({"messages": [question]}, {"configurable": {"thread_id": "bus-2291"}})
`,
  },
};
