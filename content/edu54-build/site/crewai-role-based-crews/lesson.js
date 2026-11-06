// Role-based crews (phase 14, lesson 15): a Dakar co-operative wants a weekly fish-price brief. Three robots (researcher, writer, editor) work in one of three shapes:
// Sequential, Hierarchical (a manager picks who goes next and can send work back), or a Flow (code routes). The job decides which shape wins: a known routine, an open question, an audited run.
const JOBS = { routine: { rework: 0 }, open: { rework: 2 }, audit: { rework: 1 } };
function run(o) {
  const w = JOBS[o.job].rework, A = 3, bloat = o.bloat ? 3 : 1;
  let calls, quality, replay, catches;
  if (o.shape === 'seq') { calls = A; catches = 0; quality = w === 0 ? 92 : 92 - w * 20; replay = true; }
  else if (o.shape === 'boss') { calls = A + w + (A + w); catches = w; quality = 90; replay = false; }
  else { calls = A + w; catches = Math.min(1, w); quality = w > 1 ? 74 : 92; replay = true; }
  if (!o.contract) { quality -= 22; catches = 0; }
  return { calls, tokens: calls * bloat, quality, replay, catches, ok: quality >= 85 && (o.job !== 'audit' || replay) };
}

export default {
  slug: 'crewai-role-based-crews',
  title: 'Role-based crews: pick the shape for the job',
  description: 'Three robots and three ways to run them. A routine brief, an open question and an audited run each want a different shape.',
  overview: 'CrewAI has four parts: an Agent with a role, a Task with an expected output, a Crew that holds them, and a Process that decides who works next. What sets it apart is how it splits the choice. Sequential runs tasks in order. Hierarchical adds a manager model that assigns and reviews work, and you pay for it on every step. Flows hand routing back to your own code, so a run can be replayed and audited. Teams are told plainly: crews for exploration, flows for production. This lesson gives one crew three jobs, and in each the shape decides the result.',
  keywords: ['CrewAI', 'role-based agents', 'multi-agent', 'crews and flows', 'hierarchical process', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v * 0.03);
    const D0 = { job: 'routine', shape: 'seq', contract: true, bloat: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const AX = [-1.6, -0.2, 1.2], COL = ['#5B8DB8', '#D98BA6', '#7B6FA8'];
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); pad.position.set(0, 0, 0); S.add(pad);
    const bots = AX.map((x, i) => { const r = add(P.robot(COL[i], { scale: 0.9 })); r.position.set(x, 0.03, -0.1); const d = P.box(0.75, 0.2, 0.5, '#A87A4F', { r: 0.03 }); d.position.set(x, 0.03, 0.4); S.add(d); return r; });
    const boss = add(P.robot(SAF, { scale: 1.0 })); boss.position.set(-0.2, 0.03, -0.62);
    const rail = add(P.lamp(BLUE, { h: 0.62, r: 0.1 })); rail.position.set(-2.1, 0.03, -0.45);
    const brief = P.box(0.46, 0.09, 0.6, '#F4F1EA', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); brief.userData.noFit = true; S.add(brief);
    const scale = add(P.dial(0.42)); scale.position.set(2.1, 0.03, -0.1);
    const jar = add(P.jar(0.2, 0.62, { max: 12 })); jar.position.set(-2.2, 0, 0.45);
    S.add(P.keep(-2.6, 2.6, 1.0, -0.8, 0.75));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      boss.visible = st.shape === 'boss';
      rail.visible = st.shape === 'flow';
      scale.userData.set({ v: Math.max(0, 1 - R.quality / 100) * 2 });
      jar.userData.set({ n: Math.round(R.tokens / 2) });
      bots.forEach(b => b.userData.set({ busy: true }));
      boss.userData.set({ busy: true });
      brief.material.color.set(R.ok ? '#6FC7B5' : '#E07A5F');
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['routine', 'open', 'audit'], SK = ['seq', 'boss', 'flow'], SN = { seq: 'Sequential', boss: 'Hierarchical', flow: 'Flow' };
    const controls = [
      { type: 'buttons', label: 'The job', options: ['Weekly routine', 'Open question', 'Audited run'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'The shape', options: ['Sequential', 'Hierarchical', 'Flow'], get: () => SK.indexOf(st.shape), act: i => set({ shape: SK[i] }) },
      { type: 'toggle', label: 'Each task states its expected output', short: 'Contract', get: () => st.contract, set: v => set({ contract: !!v }) },
      { type: 'toggle', label: 'Long backstories on every agent', short: 'Backstories', get: () => st.bloat, set: v => set({ bloat: !!v }) },
    ];
    const readouts = [
      { label: 'Brief quality', get: () => ({ v: `${R.quality}%`, sub: `${R.catches} problems caught`, good: R.quality >= 85, bad: R.quality < 70 }) },
      { label: 'Cost of the run', get: () => ({ v: M(R.tokens), sub: `${R.calls} model calls` }) },
      { label: 'Same run twice', get: () => ({ v: R.replay ? 'same path' : 'may differ', sub: 'can you replay it?', good: R.replay, bad: st.job === 'audit' && !R.replay }) },
    ];
    const labels = [
      { name: 'a', t: 'Researcher, writer, editor', d: 'Roles own tasks', icon: 'user', atV: V(-1.6, 0.8, -0.1) },
      { name: 's', t: 'Quality needle', d: 'Left is good', icon: 'check', atV: V(2.5, 0.1, -0.1) },
      { name: 'j', t: 'Tokens spent', d: 'The manager is paid too', icon: 'money', atV: V(-2.4, 0.3, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Manager on a routine job', hint: 'paid to confirm the obvious', on: () => set({ ...D0, shape: 'boss' }), off: reset },
      { label: 'Sequential on an open question', hint: 'no way to send work back', on: () => set({ ...D0, job: 'open' }), off: reset },
      { label: 'A free-running crew under audit', hint: 'the run cannot be replayed', on: () => set({ ...D0, job: 'audit', shape: 'boss' }), off: reset },
      { label: 'Tasks with no expected output', hint: 'brittle handoffs', on: () => set({ ...D0, contract: false }), off: reset },
    ];
    function status() {
      if (!st.contract) return { ok: false, msg: `<b>Quality fell to ${R.quality}%, with nothing to check against.</b> Without an expected output, each agent hands over free text and the next one guesses what it means. The expected output is the contract between tasks.` };
      if (st.bloat) return { ok: false, msg: `<b>The same ${R.calls} calls now cost ${R.tokens / R.calls} times as much.</b> A backstory shapes tone and judgment, but it is sent on every call. Long ones are the commonest crew bill surprise. Keep them short.` };
      if (st.job === 'audit' && !R.replay) return { ok: false, msg: `<b>Good brief, and nobody can explain it.</b> A manager model picks the path afresh on each run, so two runs can differ, and an auditor can't replay it. Use a Flow when the path must be owned by code.` };
      if (st.shape === 'boss' && st.job === 'routine') return { ok: false, msg: `<b>${R.calls} calls where 3 would do.</b> The manager read and assigned every step of a job with no decisions in it. That is the manager tax: a model paid to confirm the obvious.` };
      if (st.shape === 'seq' && st.job !== 'routine') return { ok: false, msg: `<b>Quality ${R.quality}%.</b> This job needs work sent back, and Sequential only moves forward: a weak finding from the researcher went straight into the brief.` };
      if (st.shape === 'flow' && st.job === 'open') return { ok: false, msg: `<b>Quality ${R.quality}%.</b> A Flow only takes paths you wrote in advance, and an open question needs a path nobody planned. One loop back wasn't enough. This is where a crew earns its cost.` };
      return { ok: true, msg: `<b>${SN[st.shape]} fits this job: ${R.quality}% quality in ${R.calls} calls${st.job === 'audit' ? ', and the path can be replayed' : ''}.</b> The shape was picked for the work, not for the demo.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4) % 3;
        const i = Math.floor(u), k = u - i, x = AX[i] + (AX[(i + 1) % 3] - AX[i]) * (i < 2 ? k : 0);
        brief.position.set(x, 0.3, 0.4);
      },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A crew', home: true, say: 'A fishing co-operative in Dakar wants a weekly price brief. A researcher, a writer and an editor each own one task.', act: m => m.set({ job: 'routine', shape: 'seq', contract: true, bloat: false }) },
    { t: 'The contract', home: true, say: 'Each task states its expected output. Take that away, and each robot guesses what the last one meant.', act: m => m.set({ job: 'routine', shape: 'seq', contract: false, bloat: false }) },
    { t: 'A manager', home: true, say: 'Hierarchical adds a manager who assigns and reviews work. On a routine job it is paid to confirm the obvious.', act: m => m.set({ job: 'routine', shape: 'boss', contract: true, bloat: false }) },
    { t: 'An open question', home: true, say: 'Now ask why prices jumped. Sequential can\'t send weak work back. Here the manager earns its pay.', act: m => m.set({ job: 'open', shape: 'boss', contract: true, bloat: false }) },
    { t: 'An audited run', home: true, say: 'A funder wants the run explained. A manager\'s path can differ each time, and an auditor can\'t replay it.', act: m => m.set({ job: 'audit', shape: 'boss', contract: true, bloat: false }) },
    { t: 'A flow', home: true, say: 'A Flow puts routing in your code. Same robots, a path you can read and replay. Crews to explore, flows for production.', act: m => m.set({ job: 'audit', shape: 'flow', contract: true, bloat: false }) },
  ],
  check: [
    { q: 'When is a Hierarchical crew worth its cost?', options: ['When work needs judging and sending back', 'On a fixed routine', 'Whenever money allows'], answer: 0, why: 'The manager pays off only when there are real decisions.', hint: 'Try each shape on Open question.' },
    { q: 'What does a Flow give you that a crew doesn\'t?', options: ['A path owned by code that can be replayed', 'A better model', 'Free model calls'], answer: 0, why: 'Code routes, so the run is auditable.', hint: 'Try Audited run.' },
    { q: 'What is a task\'s expected output for?', options: ['It is the contract for the next step', 'It sets the tone', 'It names the agent'], answer: 0, why: 'Without it, handoffs are free text and guesswork.', hint: 'Try Tasks with no expected output.' },
  ],
  terms: [
    ['Agent', 'A role, a goal, a backstory and tools.'],
    ['Task', 'A description, an expected output and an owner.'],
    ['Crew', 'The container for agents, tasks and a process.'],
    ['Process', 'How work is ordered: sequential or hierarchical.'],
    ['Flow', 'Event-driven routing written in your own code.'],
    ['Manager tax', 'Calls paid to a manager model to decide who goes next.'],
  ],
  deeper: '<p><b>Memory.</b> Crews offer short-term, long-term, entity and contextual memory. Each adds retrieval and tokens, so switch one on only when a run actually needs it.</p><p><b>Structured tasks.</b> A task can demand a typed output, which turns a soft handoff into a checked one.</p><p><b>Same trade elsewhere.</b> Every framework draws this line somewhere: who decides the next step, a model or your code? The later multi-agent lessons walk the same choice.</p>',
  code: {
    title: 'A crew with a contract',
    note: 'A sketch of the course\'s plain Python crew (code/main.py), with CrewAI\'s names.',
    text: `
researcher = Agent(role="Researcher", goal="Find this week's landing prices")
writer = Agent(role="Writer", goal="Write a short brief for co-op members")

gather = Task(description="Collect prices", agent=researcher,
              expected_output="A table of species, port and price")
draft = Task(description="Write the brief", agent=writer, context=[gather],
             expected_output="Five sentences citing the table")

crew = Crew(agents=[researcher, writer], tasks=[gather, draft],
            process=Process.sequential)
`,
  },
};
