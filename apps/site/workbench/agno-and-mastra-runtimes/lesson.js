// Production runtimes (phase 14, lesson 18): a Lusaka mobile-money help desk starts a fresh agent per request. Startup and memory per agent matter when agents are many and brief,
// not when one runs for ten minutes. Agno's figures are its documented targets (2 µs, 3.75 KiB); the other two runtimes use round illustrative numbers, said so in the panel.
const RT = {
  agno: { n: 'Agno', start: 2e-6, mem: 3.75, lang: 'py' },
  mastra: { n: 'Mastra', start: 5e-4, mem: 200, lang: 'ts' },
  heavy: { n: 'Graph framework', start: 0.02, mem: 4000, lang: 'py' },
};
const JOB = { chat: { rate: 2000, secs: 8, n: 'chat fan-in' }, evals: { rate: 200, secs: 2, n: 'an eval run' }, long: { rate: 0.2, secs: 600, n: 'long research agents' } };
function run(o) {
  const r = RT[o.rt], j = JOB[o.job];
  const cores = r.start * j.rate, live = j.rate * j.secs, memMB = live * r.mem / 1024;
  const fits = r.lang === o.stack, lost = o.state === 'worker' ? (o.deploy ? live : 0) : 0;
  return { r, j, cores, live, memMB, fits, lost };
}

export default {
  slug: 'agno-and-mastra-runtimes',
  title: 'Agno and Mastra: when startup speed decides',
  description: 'A help desk starts a fresh agent for every message. See when startup and memory matter, and when they don\'t.',
  overview: 'Some teams want the agent loop and nothing else, fast, in the runtime they already use. Agno is pure Python and aims for agents that start in microseconds with a few kilobytes each, so a stateless server can make a fresh agent for each request and keep sessions in a database. Mastra is TypeScript: agents, Zod-typed tools and workflows, with adapters for the usual Node servers. The headline numbers only matter in one shape of work, many brief agents. For one agent running ten minutes, startup is nothing. The real questions are how many, how long, and which language your team ships. Agno\'s figures here are its published targets; the others are round numbers for illustration.',
  keywords: ['Agno', 'Mastra', 'agent runtime', 'stateless agents', 'TypeScript agents', 'FastAPI', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.07, 0.62, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { rt: 'agno', job: 'chat', stack: 'py', state: 'db', deploy: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.45), V(0.3, 0, 0.45), { w: 0.36, speed: 1.6 }));
    const RX = i => -1.7 + (i % 5) * 0.44, racks = Array.from({ length: 10 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.42 })); r.position.set(RX(i), 0.03, i < 5 ? -0.05 : -0.48); return r; });
    const coreT = add(P.tower(0.5, 0.5, SAF)); coreT.position.set(0.95, 0.03, -0.2); coreT.userData.set({ cap: '' });
    const memT = add(P.tower(0.5, 0.5, '#7B6FA8')); memT.position.set(1.6, 0.03, -0.2); memT.userData.set({ cap: '' });
    const db = P.cyl(0.32, 0.5, '#2C2D31'); db.position.set(2.15, 0.03, 0.42); S.add(db);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.1 })); lamp.position.set(0.75, 0.03, 0.45);
    S.add(P.keep(-2.5, 2.55, 1.3, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      const shown = Math.min(10, Math.max(1, Math.ceil(Math.log10(Math.max(1, R.live)) * 2.4)));
      racks.forEach((r, i) => { r.visible = i < shown; r.userData.set({ busy: true, color: R.lost ? BAD : BLUE }); });
      coreT.userData.set({ h: Math.min(1.2, 0.03 + Math.log10(1 + R.cores * 300) * 0.32), color: R.cores > 5 ? BAD : SAF });
      memT.userData.set({ h: Math.min(1.2, 0.03 + Math.log10(1 + R.memMB) * 0.25), color: R.memMB > 4000 ? BAD : '#7B6FA8' });
      lamp.userData.set({ color: R.fits ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const RK = ['agno', 'mastra', 'heavy'], JK = ['chat', 'evals', 'long'], SK = ['py', 'ts'], LK = ['db', 'worker'];
    const controls = [
      { type: 'buttons', label: 'The work', options: ['Chat fan-in', 'Eval run', 'Long agents'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'The runtime', options: ['Agno', 'Mastra', 'Graph framework'], get: () => RK.indexOf(st.rt), act: i => set({ rt: RK[i] }) },
      { type: 'buttons', label: 'Your team ships', options: ['Python', 'TypeScript'], get: () => SK.indexOf(st.stack), act: i => set({ stack: SK[i] }) },
      { type: 'buttons', label: 'Session state lives in', options: ['A database', 'The worker'], get: () => LK.indexOf(st.state), act: i => set({ state: LK[i] }) },
      { type: 'toggle', label: 'Deploy a new version now', short: 'Deploy', get: () => st.deploy, set: v => set({ deploy: !!v }) },
    ];
    const readouts = [
      { label: 'Agents alive at once', get: () => ({ v: `${Math.round(R.live).toLocaleString('en')}`, sub: R.j.n }) },
      { label: 'Cores just starting agents', get: () => ({ v: R.cores < 0.01 ? 'under 0.01' : R.cores.toFixed(2), sub: `${R.r.n}`, good: R.cores < 1, bad: R.cores > 5 }) },
      { label: 'Memory', get: () => ({ v: R.memMB < 1000 ? `${R.memMB.toFixed(1)} MB` : `${(R.memMB / 1024).toFixed(1)} GB`, sub: 'for live agents', good: R.memMB < 1000, bad: R.memMB > 4000 }) },
    ];
    const labels = [
      { name: 'r', t: 'Live agents', d: 'One fresh agent per request', icon: 'user', atV: V(-1.7, 0.4, -0.05) },
      { name: 'c', t: 'Startup and memory', d: 'Gold cores, purple memory; lamp: fits your team', icon: 'chart', atV: V(1.85, 0.2, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Heavy startup under fan-in', hint: 'many brief agents', on: () => set({ ...D0, rt: 'heavy' }), off: reset },
      { label: 'Keep sessions on the worker, then deploy', hint: 'not stateless', on: () => set({ ...D0, state: 'worker', deploy: true }), off: reset },
      { label: 'Pick by benchmark, not by team', hint: 'Python runtime, TypeScript team', on: () => set({ ...D0, stack: 'ts' }), off: reset },
      { label: 'Choose for speed on a long agent', hint: 'startup is nothing here', on: () => set({ ...D0, job: 'long', rt: 'heavy' }), off: reset },
    ];
    function status() {
      if (R.lost) return { ok: false, msg: `<b>The deploy dropped ${Math.round(R.lost).toLocaleString('en')} live conversations.</b> Session state lived on the worker, so restarting it erased them. Keep workers stateless and sessions in a database, and any worker can serve any turn.` };
      if (!R.fits) return { ok: false, msg: `<b>${R.r.n} doesn't fit a ${st.stack === 'ts' ? 'TypeScript' : 'Python'} team.</b> The fastest runtime your team can't ship or debug is the slowest one. Language is usually the first decision, and speed the second.` };
      if (R.cores > 5) return { ok: false, msg: `<b>${R.cores.toFixed(0)} cores are busy doing nothing but starting agents.</b> With ${R.j.rate.toLocaleString('en')} short agents a second, startup is a real bill. This is the one shape of work where Agno's target pays for itself.` };
      if (st.job === 'long') return { ok: true, msg: `<b>Startup barely registers here: ${R.cores < 0.01 ? 'under 0.01' : R.cores.toFixed(2)} of a core.</b> One agent for ten minutes spends its life waiting on models. Choose for tools, tracing and your team, not for microseconds.` };
      return { ok: true, msg: `<b>${R.r.n} handles ${R.j.n} with ${R.cores < 0.01 ? 'almost no' : R.cores.toFixed(2)} cores on startup.</b> Fresh agent per request, sessions in the database, in the language your team ships.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        const gap = st.job === 'long' ? 3 : st.job === 'evals' ? 1 : 0.5;
        if (u > gap && b.userData.count() < 6) { u = 0; b.userData.send('#F4F1EA', { size: 0.16 }); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A fresh agent each time', home: true, say: 'A mobile-money help desk in Lusaka starts a fresh agent for every message. Thousands a second, each alive a few seconds.', act: m => m.set({ rt: 'agno', job: 'chat', stack: 'py', state: 'db', deploy: false }) },
    { t: 'Startup as a bill', home: true, say: 'A heavy framework spends real time starting each agent. At this rate the gold tower is a row of busy cores.', act: m => m.set({ rt: 'heavy', job: 'chat', stack: 'py', state: 'db', deploy: false }) },
    { t: 'Stateless workers', home: true, say: 'Agno\'s production path is stateless: a fresh agent per request, with sessions in a database. A deploy loses nothing.', act: m => m.set({ rt: 'agno', job: 'chat', stack: 'py', state: 'db', deploy: true }) },
    { t: 'State on the worker', home: true, say: 'Keep sessions on the worker instead, and the same deploy drops every live conversation.', act: m => m.set({ rt: 'agno', job: 'chat', stack: 'py', state: 'worker', deploy: true }) },
    { t: 'The team\'s language', home: true, say: 'If your team ships TypeScript, Mastra brings agents, typed tools and workflows to the servers you already run.', act: m => m.set({ rt: 'mastra', job: 'chat', stack: 'ts', state: 'db', deploy: false }) },
    { t: 'When it doesn\'t matter', home: true, say: 'A ten-minute research agent spends its life waiting on models. Startup is nothing, so choose for tools and your team.', act: m => m.set({ rt: 'heavy', job: 'long', stack: 'py', state: 'db', deploy: false }) },
  ],
  check: [
    { q: 'When does startup speed matter most?', options: ['Many short-lived agents', 'One agent running for ten minutes', 'Never'], answer: 0, why: 'Startup is multiplied by the rate of new agents.', hint: 'Compare Chat fan-in and Long agents.' },
    { q: 'What makes a worker stateless?', options: ['Sessions live in a database', 'It has no tools', 'It runs one model'], answer: 0, why: 'Any worker can serve any turn, and a restart loses nothing.', hint: 'Try Keep sessions on the worker.' },
    { q: 'What should usually come first when picking a runtime?', options: ['The language your team ships', 'The headline benchmark', 'The logo'], answer: 0, why: 'A runtime your team can\'t debug costs more than it saves.', hint: 'Try Pick by benchmark, not by team.' },
  ],
  terms: [
    ['Runtime', 'What creates and runs your agents.'],
    ['Stateless', 'Keeping nothing between requests on the worker.'],
    ['Fan-in', 'Many short requests arriving at once.'],
    ['Zod', 'A TypeScript library for typed, checked inputs.'],
    ['Server adapter', 'The piece that fits a runtime to a web server.'],
    ['Session', 'One conversation\'s saved state.'],
  ],
  deeper: '<p><b>Numbers.</b> Agno publishes targets of about 2 microseconds to start and 3.75 KiB per agent. Mastra and the graph framework figures here are round numbers to show the shape, so test your own stack before you quote any of them.</p><p><b>Mastra\'s storage.</b> Memory, workflows and observability can go to different backends. High-volume traces usually go to a store built for them.</p><p><b>Licences.</b> Check what you are adopting: Mastra is Apache 2.0 with some enterprise directories under a separate licence.</p>',
  code: {
    title: 'A stateless request',
    note: 'A sketch of the stateless path described in the course (docs and code/main.py).',
    text: `
@app.post("/chat")
def chat(req):
    history = sessions.load(req.session_id)      # state lives here
    agent = Agent(model=MODEL, tools=TOOLS)      # fresh for every request
    reply = agent.run(req.message, history=history)
    sessions.save(req.session_id, reply.messages)
    return {"reply": reply.text}
`,
  },
};
