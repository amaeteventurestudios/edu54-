// End-to-end coding demo on the harness (phase 19, lesson 29): the parts from lessons 20 to 28 join into one run on a fixture repo for a Nairobi team: contract, registry, dispatcher, plan, gates, sandbox, eval, trace. Each ring is one part; take it away and the run fails its own way.
const PARTS = ['Loop', 'Registry', 'Dispatcher', 'Plan', 'Gates', 'Sandbox', 'Eval', 'Trace'];
const FAIL = ['it hangs on a stuck model, with no way to stop it', 'a bad argument crashes a tool', 'a flaky test command freezes the loop', 'it forgets what is left and repeats work', 'it edits a file it never read', 'a stray delete reaches the repo', 'it reports success, and nothing proves it', 'when it fails, nobody can see why'];
function run(o) { const off = PARTS.map((p, i) => i).filter(i => !o.on[i]); return { off, ok: !off.length, score: 8 - off.length }; }

export default {
  slug: 'end-to-end-coding-task-demo',
  title: 'The whole harness: one coding task, every part',
  description: 'Nine lessons of parts, joined into one working agent. Remove any ring, and see the failure it was stopping.',
  overview: 'This closes the harness series. The state machine runs the loop. The registry checks calls, and the dispatcher handles flaky tools. Plan-execute keeps the thread. Gates refuse bad calls, and the sandbox limits the rest. The eval harness scores the result by running something, and spans record what happened. None of these is clever by itself. Together they turn a model into an agent you could leave running on a real repo. Here a fixture bug for a team in Nairobi runs through all eight rings. Take any one away, and you see the exact failure it was preventing. This is the whole idea of harness engineering.',
  keywords: ['agent harness', 'harness engineering', 'coding agent', 'integration', 'evaluation', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { on: [1, 1, 1, 1, 1, 1, 1, 1] }, st = { on: [...D0.on] };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const base = P.cyl(1.3, 0.05, '#D8D2C4'); base.position.set(-0.5, 0, 0); S.add(base);
    const COL = ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#D98BA6', SAF, '#B5462F', GOOD, '#A87A4F'];
    const rings = PARTS.map((p, i) => { const m = new THREE.MeshLambertMaterial({ color: COL[i] }), r = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.1, 0.035, 8, 48), m); r.rotation.x = Math.PI / 2; r.position.set(-0.5, 0.09, 0); S.add(r); return r; });
    const bot = add(P.robot(SAF, { scale: 0.65 })); bot.position.set(-0.5, 0.05, 0);
    const repo = P.box(0.8, 0.4, 0.8, '#2C2D31', { r: 0.06 }); repo.position.set(1.6, 0.03, -0.1); S.add(repo);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.12 })); lamp.position.set(2.2, 0.03, 0.4);
    const pack = P.ball(0.08, SAF); pack.userData.noFit = true; S.add(pack);
    S.add(P.keep(-1.85, 2.45, 0.95, -1.3, 1.3));
    let R = null, u = 0;
    function draw() { R = run(st); rings.forEach((r, i) => r.visible = !!st.on[i]); lamp.userData.set({ color: R.ok ? '#3E9B5F' : '#D9483B', on: true }); bot.userData.set({ busy: true, lamp: R.ok ? '#3E9B5F' : '#D9483B' }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = PARTS.map((p, i) => ({ type: 'toggle', label: p, short: p, quick: i < 3 ? undefined : false, get: () => !!st.on[i], set: v => { st.on[i] = v ? 1 : 0; draw(); } }));
    const readouts = [
      { label: 'Parts in place', get: () => ({ v: `${R.score} of 8`, good: R.ok, bad: !R.ok }) },
      { label: 'The task', get: () => ({ v: R.ok ? 'fixed and proven' : 'failed', sub: R.ok ? 'fixture test passes' : `no ${PARTS[R.off[0]].toLowerCase()}`, good: R.ok, bad: !R.ok }) },
      { label: 'Trace', get: () => ({ v: st.on[7] ? 'complete' : 'none', good: !!st.on[7], bad: !st.on[7] }) },
    ];
    const labels = [
      { name: 'r', t: 'Eight rings', d: 'Each is a lesson', icon: 'link', atV: V(-1.8, 0.1, 0) },
      { name: 'p', t: 'The repo', d: 'Lamp: proven fixed', icon: 'check', atV: V(2.0, 0.2, -0.1) },
    ];
    const reset = () => { st.on = [...D0.on]; draw(); };
    const off = i => { const a = [...D0.on]; a[i] = 0; return () => set({ on: a }); };
    const breaks = [
      { label: 'Remove the gates', hint: 'reads and edits go unchecked', on: off(4), off: reset },
      { label: 'Remove the sandbox', hint: 'a mistake reaches the repo', on: off(5), off: reset },
      { label: 'Remove the eval', hint: 'trust the agent\'s word', on: off(6), off: reset },
      { label: 'Remove the trace', hint: 'nothing to look at', on: off(7), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>Fixed, proven by a test, with a full trace.</b> No single part is clever. Together they make a model safe to leave running.' };
      return { ok: false, msg: `<b>Without the ${PARTS[R.off[0]].toLowerCase()}, ${FAIL[R.off[0]]}.</b> Each ring was added because that failure is real.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 1; pack.position.set(-0.5 + 2.1 * u, 0.6 - 0.2 * u, -0.1 * u); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'All the parts', home: true, say: 'A team in Nairobi has a bug in a fixture repo. Eight rings of harness surround one model.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1, 1, 1] }) },
    { t: 'The inner rings', home: true, say: 'The loop, the registry and the dispatcher keep each call clean.', act: m => m.set({ on: [1, 0, 1, 1, 1, 1, 1, 1] }) },
    { t: 'Planning', home: true, say: 'A plan keeps the thread, so that work isn\'t repeated.', act: m => m.set({ on: [1, 1, 1, 0, 1, 1, 1, 1] }) },
    { t: 'Walls', home: true, say: 'Gates refuse bad calls, and the sandbox limits what is left.', act: m => m.set({ on: [1, 1, 1, 1, 1, 0, 1, 1] }) },
    { t: 'Proof', home: true, say: 'An eval runs something real, and the trace records it all.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1, 0, 1] }) },
    { t: 'Harness engineering', home: true, say: 'No part is clever by itself. Together, they make an agent you can leave running.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1, 1, 1] }) },
  ],
  check: [
    { q: 'What does the eval ring prove?', options: ['The task really works', 'The model is large', 'The plan is long'], answer: 0, why: 'It runs something real.', hint: 'Try Remove the eval.' },
    { q: 'What is harness engineering?', options: ['Building the checks around a model', 'Training a larger model', 'Writing longer prompts'], answer: 0, why: 'The harness makes the model dependable.', hint: 'See the story.' },
    { q: 'What does the trace give you?', options: ['A record to explain failures', 'A faster model', 'Lower cost'], answer: 0, why: 'You can see what happened.', hint: 'Try Remove the trace.' },
  ],
  terms: [['Harness', 'Everything around the model.'], ['Fixture repo', 'A fixed repo for testing.'], ['Integration', 'Parts working together.'], ['Regression', 'Something that used to work breaking.']],
  deeper: '<p><b>The series.</b> Lessons 20 to 28 of this capstone build each ring.</p><p><b>Add one at a time.</b> Each ring earns its place by stopping a failure you have seen.</p><p><b>This page</b> states each failure in words; the lessons before it run them.</p>',
  code: {
    title: 'All together',
    note: 'Adapted from the course\'s end-to-end demo (code/main.py).',
    text: `
session = Session(budget=Budget(turns=30))
loop = Harness(model, registry, dispatcher, gates, sandbox, tracer)
plan = planner(task)
result = loop.run(plan, session)
print(fixture.verify(sandbox.workspace))
`,
  },
};
