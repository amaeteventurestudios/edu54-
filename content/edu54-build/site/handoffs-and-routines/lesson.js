// Handoffs and routines (phase 16, lesson 11): a Nairobi mobile network's support line. The orchestrator is simply whoever holds the conversation. A handoff is a tool call that returns another agent.
// A customer's problem passes between triage, billing and technical robots, carrying context. Broken: no way back, lost context, two agents bouncing a caller.
const R0 = ['Triage', 'Billing', 'Tech'];
const CASE = {
  bill: { path: [0, 1], n: 'A double charge' },
  both: { path: [0, 1, 2], n: 'A charge, then a dead SIM' },
  odd: { path: [0, 2, 0, 1], n: 'Wrong desk first' },
};
function run(o) {
  const c = CASE[o.c]; let path = c.path.slice(), loops = 0, stuck = false;
  if (o.c === 'odd' && !o.back) { path = [0, 2]; stuck = true; }
  if (o.bounce) { path = [0, 1, 2, 1, 2, 1, 2, 1]; loops = 3; }
  const repeat = o.ctx ? 0 : path.length - 1;
  return { path, loops, stuck, repeat, hops: path.length - 1, ok: !stuck && !o.bounce && o.ctx };
}

export default {
  slug: 'handoffs-and-routines',
  title: 'Handoffs and routines: pass the phone',
  description: 'No framework, no graph. A handoff is a tool call, and the orchestrator is whoever holds the call.',
  overview: 'Most multi-agent frameworks ask you to learn their own language of nodes, crews or managers. OpenAI\'s Swarm went the other way and used what models already do: call tools. A routine is a system prompt and a set of tools for one role. A handoff is a tool call that returns another agent. There is no separate orchestrator: control sits with whichever agent holds the conversation. It feels like passing a phone around a support desk. That is light and stateless, and it makes the problems plain: each routine must know its exits, context has to travel with the call, and two agents can pass a caller back and forth forever.',
  keywords: ['handoffs', 'routines', 'OpenAI Swarm', 'multi-agent', 'tool calls', 'stateless orchestration'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { c: 'both', ctx: true, back: true, bounce: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const AX = [-1.8, 0, 1.8], desks = AX.map((x, i) => { const d = P.box(1, 0.28, 0.6, '#A87A4F', { r: 0.04 }); d.position.set(x, 0.03, 0.3); S.add(d); const r = add(P.robot(['#5B8DB8', SAF, '#7B6FA8'][i], { scale: 0.85 })); r.position.set(x, 0.03, -0.25); return r; });
    const phone = P.box(0.26, 0.1, 0.42, '#2C2D31', { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: '#2C2D31' }) }); phone.userData.noFit = true; S.add(phone);
    const note = P.box(0.3, 0.05, 0.22, '#F4F1EA', { r: 0.01 }); note.userData.noFit = true; S.add(note);
    S.add(P.keep(-2.5, 2.5, 1.05, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      note.visible = st.ctx;
      desks.forEach((d, i) => d.userData.set({ busy: R.path.includes(i) }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['bill', 'both', 'odd'];
    const controls = [
      { type: 'buttons', label: 'The caller', options: ['Double charge', 'Charge and SIM', 'Wrong desk'], get: () => CK.indexOf(st.c), act: i => set({ c: CK[i] }) },
      { type: 'toggle', label: 'Context travels with the call', short: 'Context', get: () => st.ctx, set: v => set({ ctx: !!v }) },
      { type: 'toggle', label: 'Every routine can hand back to triage', short: 'Way back', get: () => st.back, set: v => set({ back: !!v }) },
      { type: 'toggle', label: 'Billing and Tech each think it is the other\'s', short: 'Bounce', get: () => st.bounce, set: v => set({ bounce: !!v }) },
    ];
    const readouts = [
      { label: 'Handoffs', get: () => ({ v: `${R.hops}`, sub: R.path.map(i => R0[i]).join(' → ').slice(0, 42), good: R.hops <= 2, bad: R.hops > 4 }) },
      { label: 'Holding the call', get: () => ({ v: R0[R.path[R.path.length - 1]], sub: 'is the orchestrator' }) },
      { label: 'Times the caller repeats', get: () => ({ v: `${R.repeat}`, sub: 'the same story', good: !R.repeat, bad: R.repeat > 0 }) },
    ];
    const labels = [
      { name: 'a', t: 'Three routines', d: 'A prompt and some tools each', icon: 'user', atV: V(-2.3, 0.15, 0.3) },
      { name: 'p', t: 'The phone', d: 'Whoever holds it is in charge', icon: 'hand', atV: V(2.3, 0.15, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Hand over without context', hint: 'please repeat that', on: () => set({ ...D0, ctx: false }), off: reset },
      { label: 'No way back', hint: 'stuck at the wrong desk', on: () => set({ ...D0, c: 'odd', back: false }), off: reset },
      { label: 'Two agents bounce the caller', hint: 'no hop limit', on: () => set({ ...D0, bounce: true }), off: reset },
    ];
    function status() {
      if (st.bounce) return { ok: false, msg: `<b>${R.hops} handoffs, and the caller is still on hold.</b> Billing and Tech each decided it was the other's job. With no orchestrator, nothing notices. Add a hop limit, and hand to a person when it is reached.` };
      if (R.stuck) return { ok: false, msg: '<b>The caller reached the wrong desk and stayed there.</b> Tech has no tool that leads anywhere else. Each routine must list its exits, because the state machine lives inside the prompts.' };
      if (!st.ctx) return { ok: false, msg: `<b>The caller told the story ${R.repeat + 1} times.</b> The next agent got the call but not the history. Handoffs are stateless, so pass the messages and context along deliberately.` };
      return { ok: true, msg: `<b>${R.hops} handoff${R.hops === 1 ? '' : 's'}, one telling of the story.</b> Each handoff was a tool call, and ${R0[R.path[R.path.length - 1]]} holds the call now. No graph, no manager, just routines and their exits.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt * 0.5;
        const n = R.path.length, k = u % Math.max(1, n - 1), i = Math.floor(k), f = k - i, a = AX[R.path[i]], b = AX[R.path[Math.min(n - 1, i + 1)]];
        phone.position.set(a + (b - a) * f, 0.36 + Math.sin(f * Math.PI) * 0.35, 0.3); note.position.set(phone.position.x, phone.position.y + 0.08, 0.3);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A support line', home: true, say: 'A mobile network in Nairobi has three desks: triage, billing and technical. There is no boss, just a phone.', act: m => m.set({ c: 'bill', ctx: true, back: true, bounce: false }) },
    { t: 'A handoff is a tool', home: true, say: 'Triage calls a tool, and that tool returns the billing agent. Whoever holds the call is the orchestrator.', act: m => m.set({ c: 'bill', ctx: true, back: true, bounce: false }) },
    { t: 'More than one desk', home: true, say: 'A charge, then a dead SIM. The call moves on, and the note goes with it.', act: m => m.set({ c: 'both', ctx: true, back: true, bounce: false }) },
    { t: 'Context travels', home: true, say: 'Drop the note and the caller repeats the story at every desk. Handoffs carry nothing unless you pass it.', act: m => m.set({ c: 'both', ctx: false, back: true, bounce: false }) },
    { t: 'Know your exits', home: true, say: 'Each routine needs a way out. With none, a caller at the wrong desk stays there.', act: m => m.set({ c: 'odd', ctx: true, back: false, bounce: false }) },
    { t: 'The bounce', home: true, say: 'Two desks can pass a caller back and forth forever. Add a hop limit, then hand to a person.', act: m => m.set({ c: 'both', ctx: true, back: true, bounce: true }) },
  ],
  check: [
    { q: 'In this style, what is a handoff?', options: ['A tool call that returns another agent', 'A new framework', 'A human transfer only'], answer: 0, why: 'It uses what models already do.', hint: 'See A handoff is a tool.' },
    { q: 'Who is the orchestrator?', options: ['Whichever agent holds the conversation', 'A manager model', 'The database'], answer: 0, why: 'Control moves with the call.', hint: 'Read Holding the call.' },
    { q: 'What stops two agents bouncing a caller?', options: ['A hop limit and a person', 'A longer prompt', 'A bigger model'], answer: 0, why: 'Nothing else is watching.', hint: 'Try Two agents bounce the caller.' },
  ],
  terms: [
    ['Routine', 'A prompt and tools for one role.'],
    ['Handoff', 'A tool call that passes control.'],
    ['Stateless', 'Nothing is kept between calls unless passed.'],
    ['Context variables', 'Facts passed along with the messages.'],
    ['Hop limit', 'A cap on handoffs in one conversation.'],
    ['Triage', 'Deciding where a request should go.'],
  ],
  deeper: '<p><b>Swarm became Agents.</b> OpenAI\'s educational Swarm led to the Agents SDK, which keeps handoffs as a core idea and adds guardrails and tracing.</p><p><b>Where it strains.</b> With many routines, the state machine is scattered across prompts and hard to see. At that point a graph may be clearer.</p><p><b>Filter on handover.</b> Pass what the next agent needs, not necessarily every message.</p>',
  code: {
    title: 'A handoff tool',
    note: 'Adapted from the course\'s routine sketch (code/main.py).',
    text: `
def to_billing():
    """Use for charges, refunds and top-ups."""
    return billing_agent                         # a tool that returns an agent

triage = Agent(system="You route calls.", tools=[to_billing, to_tech])

def run(agent, messages, max_hops=5):
    for _ in range(max_hops):
        reply = agent.step(messages)
        messages += reply.messages
        if not isinstance(reply.result, Agent):
            return messages
        agent = reply.result
    return escalate_to_person(messages)
`,
  },
};
