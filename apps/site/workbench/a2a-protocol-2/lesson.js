// A2A in detail (phase 16, lesson 12): a Durban customs broker's agent delegates a manifest to another firm's agent. The task lifecycle is a track of stations: submitted, working, input-required, completed, or failed.
// The agent card is found at a well-known address. A long task reports by polling, streaming or push. Terminal states stay terminal. One level below the earlier lesson on protocols.
const ST = ['submitted', 'working', 'input-required', 'working again', 'completed'];
function run(o) {
  const need = o.ask, path = need ? [0, 1, 2, 3, 4] : [0, 1, 4];
  if (!o.card) return { path: [0], end: 'nocard', polls: 0 };
  if (need && !o.handle) return { path: [0, 1, 2], end: 'stuck', polls: o.mode === 'poll' ? 60 : 0 };
  if (o.fail) return { path: [0, 1], end: o.again ? 'reuse' : 'new', polls: 0 };
  const dur = need ? 90 : 30;
  return { path, end: 'done', polls: o.mode === 'poll' ? Math.round(dur / o.every) : 0, dur };
}

export default {
  slug: 'a2a-protocol-2',
  title: 'A2A in detail: a task\'s whole life',
  description: 'One agent hands a long job to another firm\'s agent. Follow the task through its states and see what each one asks of you.',
  overview: 'Without a standard, every pair of agents is a custom integration. A2A gives them a shared wire: an Agent Card at a well-known address says what an agent can do and how to call it, and a Task has a defined life. It moves from submitted to working, may stop at input-required to ask you something, and ends in a terminal state such as completed or failed. Results come as artifacts. A long task can report by polling, streaming or a push to your own endpoint. The states matter more than the transport, because each tells the caller what it must do next, and a terminal task never restarts.',
  keywords: ['A2A protocol', 'agent card', 'task lifecycle', 'agent to agent', 'multi-agent', 'interoperability'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.8, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { card: true, ask: true, handle: true, fail: false, again: false, mode: 'stream', every: 5 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.55 + i * 0.85;
    const nodes = ST.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.cyl(0.3, 0.14, '#fff', { material: m }); b.position.set(X(i), 0.03, 0); S.add(b); return { b, m }; });
    const line = P.box(3.5, 0.03, 0.08, '#6B6E7E', { r: 0.01 }); line.position.set(0.15, 0.06, 0); S.add(line);
    const fail = P.cyl(0.3, 0.14, RED); fail.position.set(X(1), 0.03, 0.55); S.add(fail);
    const me = add(P.robot(SAF, { scale: 0.75 })); me.position.set(-2.3, 0.03, -0.1);
    const card = P.box(0.42, 0.04, 0.3, '#F4F1EA', { r: 0.01 }); card.position.set(-2.25, 0.03, 0.5); S.add(card);
    const them = add(P.robot(BLUE, { scale: 0.75 })); them.position.set(2.3, 0.03, -0.45);
    const art = add(P.stack(0.46, 0.34, 0.1, { max: 3, color: GOOD })); art.position.set(2.3, 0.03, 0.42);
    const ball = P.ball(0.1, SAF); ball.userData.noFit = true; S.add(ball);
    S.add(P.keep(-2.55, 2.55, 0.95, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      nodes.forEach(({ m }, i) => m.color.set(R.path.includes(i) ? (R.end === 'stuck' && i === 2 ? SAF : GOOD) : GREY));
      fail.visible = !!st.fail;
      card.visible = st.card;
      art.userData.set({ n: R.end === 'done' ? 2 : 0, colors: [GOOD, GOOD] });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['poll', 'stream', 'push'];
    const controls = [
      { type: 'toggle', label: 'Agent Card is published', short: 'Card', get: () => st.card, set: v => set({ card: !!v }) },
      { type: 'toggle', label: 'The task needs an answer from you', short: 'Needs input', get: () => st.ask, set: v => set({ ask: !!v }) },
      { type: 'toggle', label: 'Your agent handles input-required', short: 'Handles it', get: () => st.handle, set: v => set({ handle: !!v }) },
      { type: 'toggle', label: 'The task fails', short: 'Fails', get: () => st.fail, set: v => set({ fail: !!v }) },
      { type: 'toggle', label: 'Retry by re-sending to the same task', short: 'Same task', get: () => st.again, set: v => set({ again: !!v }) },
      { type: 'buttons', label: 'Updates by', options: ['Polling', 'Streaming', 'Push'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Poll every (minutes)', min: 1, max: 30, step: 1, get: () => st.every, set: v => set({ every: v }) },
    ];
    const readouts = [
      { label: 'Task state', get: () => ({ v: st.fail ? 'failed' : ST[R.path[R.path.length - 1]], sub: R.end === 'done' ? 'artifacts returned' : '', good: R.end === 'done', bad: R.end !== 'done' && R.end !== 'new' }) },
      { label: 'Polls', get: () => ({ v: `${R.polls}`, sub: st.mode === 'poll' ? 'each one a request' : st.mode === 'stream' ? 'held open' : 'it calls you', good: R.polls < 10, bad: R.polls > 30 }) },
      { label: 'Discovery', get: () => ({ v: st.card ? 'by card' : 'none', sub: '/.well-known/agent-card.json', good: st.card, bad: !st.card }) },
    ];
    const labels = [
      { name: 't', t: 'The task\'s life', d: 'Green: passed through', icon: 'link', atV: V(-2.25, 0.1, 0.55) },
      { name: 'a', t: 'Artifacts', d: 'What the task produced', icon: 'box', atV: V(2.5, 0.2, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No Agent Card', hint: 'hard-code the other side', on: () => set({ ...D0, card: false }), off: reset },
      { label: 'Ignore input-required', hint: 'keep polling a waiting task', on: () => set({ ...D0, handle: false, mode: 'poll', every: 1 }), off: reset },
      { label: 'Restart a failed task', hint: 'terminal stays terminal', on: () => set({ ...D0, ask: false, fail: true, again: true }), off: reset },
      { label: 'Poll every minute', hint: 'streaming was available', on: () => set({ ...D0, mode: 'poll', every: 1 }), off: reset },
    ];
    function status() {
      if (R.end === 'nocard') return { ok: false, msg: '<b>The task never left your side.</b> With no card, you have no skills, endpoint or auth to go on. Every partner becomes a custom integration, which is what A2A exists to end.' };
      if (R.end === 'stuck') return { ok: false, msg: `<b>The task waits at input-required, and you've polled ${R.polls} times.</b> It needs an answer from you: which port of entry? "Working" and "waiting for me" are different states, and the caller must act on the second.` };
      if (R.end === 'reuse') return { ok: false, msg: '<b>The server rejected the retry.</b> Failed is terminal, and a finished task doesn\'t restart. Create a new task and link it to the old one, so history stays straight.' };
      if (R.end === 'new') return { ok: true, msg: '<b>The task failed, and your agent started a new one.</b> Terminal states stay terminal, and the failure is on the record.' };
      if (R.polls > 30) return { ok: false, msg: `<b>${R.polls} polls for a ${R.dur}-minute task.</b> That is a lot of empty requests. Use streaming if you can hold a connection, or push if the task runs for hours.` };
      return { ok: true, msg: `<b>Completed in ${R.dur} minutes, with artifacts returned.</b> ${st.ask ? 'The task stopped once to ask you something, and carried on.' : 'It needed nothing from you.'} ${st.mode === 'push' ? 'Push suits work that outlasts a connection.' : st.mode === 'stream' ? 'Streaming showed progress as it happened.' : ''}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.35) % 1;
        const n = R.path.length, k = u * Math.max(1, n - 1), i = Math.min(n - 2, Math.floor(k)), f = k - Math.max(0, i), a = X(R.path[Math.max(0, i)]), b = X(R.path[Math.min(n - 1, Math.max(0, i) + 1)]);
        ball.position.set(n > 1 ? a + (b - a) * f : X(0), 0.28, 0);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Find the agent', home: true, say: 'A customs broker\'s agent in Durban needs another firm\'s agent. It reads an Agent Card at a well-known address.', act: m => m.set({ card: true, ask: false, handle: true, fail: false, again: false, mode: 'stream', every: 5 }) },
    { t: 'A task has a life', home: true, say: 'It sends a task. The task is submitted, then working. Each state tells the caller what to do.', act: m => m.set({ card: true, ask: false, handle: true, fail: false, again: false, mode: 'stream', every: 5 }) },
    { t: 'Input required', home: true, say: 'Halfway through, the other agent asks which port of entry. The task waits, and your agent must answer.', act: m => m.set({ card: true, ask: true, handle: true, fail: false, again: false, mode: 'stream', every: 5 }) },
    { t: 'Waiting on you', home: true, say: 'Ignore that state and you poll forever on a task waiting for you.', act: m => m.set({ card: true, ask: true, handle: false, fail: false, again: false, mode: 'poll', every: 1 }) },
    { t: 'Three ways to hear', home: true, say: 'Poll, stream or receive a push. Choose by how long the task runs.', act: m => m.set({ card: true, ask: true, handle: true, fail: false, again: false, mode: 'push', every: 5 }) },
    { t: 'Terminal means terminal', home: true, say: 'A failed task stays failed. Start a new task and link it. Finished work gives artifacts, not a reopened task.', act: m => m.set({ card: true, ask: false, handle: true, fail: true, again: true, mode: 'stream', every: 5 }) },
  ],
  check: [
    { q: 'What does an Agent Card describe?', options: ['Skills, endpoint and auth', 'The model weights', 'The chat history'], answer: 0, why: 'It is how others find and call the agent.', hint: 'Try No Agent Card.' },
    { q: 'What should you do at input-required?', options: ['Send the requested answer', 'Poll faster', 'Cancel it'], answer: 0, why: 'The task is waiting on you.', hint: 'Try Ignore input-required.' },
    { q: 'How do you retry a failed task?', options: ['Create a new task', 'Re-send to the same task', 'Delete the card'], answer: 0, why: 'Terminal states don\'t restart.', hint: 'Try Restart a failed task.' },
  ],
  terms: [
    ['Agent Card', 'A JSON document describing an agent.'],
    ['Task', 'One unit of delegated work, with a lifecycle.'],
    ['Input required', 'A state: the task needs an answer.'],
    ['Terminal state', 'Completed, failed or canceled: it never restarts.'],
    ['Artifact', 'A result a task produces.'],
    ['Push notification', 'The server calls your endpoint with an update.'],
  ],
  deeper: '<p><b>Versions.</b> A2A moves quickly, so check field names against the version you use.</p><p><b>Auth lives on the card.</b> Security schemes are stated there, and the caller authenticates as usual.</p><p><b>MCP or A2A?</b> Use MCP for tools you drive step by step. Use A2A for a peer that takes a goal and works it out.</p>',
  code: {
    title: 'Follow a task',
    note: 'Adapted from the course\'s A2A sketch (code/main.py).',
    text: `
card = get_json(f"{base}/.well-known/agent-card.json")
task = send_message(card, "Clear this manifest", manifest)

while task.state not in TERMINAL:
    if task.state == "input-required":
        task = send_message(card, answer(task.question), task_id=task.id)
    else:
        time.sleep(300)
        task = get_task(card, task.id)

if task.state == "completed":
    save(task.artifacts)
`,
  },
};
