// End-to-end research demo (phase 19, lesson 57): the research parts joined in one loop for a Kumasi crop lab: ideas, literature, scheduler, runner, evaluator, writer, critic. Seven stations on a ring, run for a fixed seed. Remove one, and see what fails. Self-terminating, with a report of every stage.
const ST = ['Ideas', 'Literature', 'Scheduler', 'Runner', 'Evaluator', 'Writer', 'Critic'];
const FAIL = ['nothing to test', 'it retests what is known', 'runs go to poor branches', 'it never ends', 'chance results pass', 'numbers drift from runs', 'first drafts go out'];
function run(o) { const off = ST.map((s, i) => i).filter(i => !o.on[i]); return { off, ok: !off.length, n: 7 - off.length }; }

export default {
  slug: 'end-to-end-research-demo',
  title: 'The whole research loop, running by itself',
  description: 'Seven stages join into one loop that ends by itself. Remove any part, and watch what breaks.',
  overview: 'This closes the research series. Ideas are generated, checked against the literature, scheduled, run with limits, judged by a paired test, written with bound numbers, and revised by a critic. The loop stops by itself, and writes a report of each stage. Plain imports join the parts, with no framework. The value isn\'t in any clever step. It is that each stage guards against a failure of the last. This demo runs on a fixed seed, for a crop lab in Kumasi. A person still reads the output.',
  keywords: ['research agent', 'end to end', 'AI scientist', 'integration', 'capstone', 'autonomous research'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { on: [1, 1, 1, 1, 1, 1, 1] }, st = { on: [...D0.on] };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const base = P.cyl(1.3, 0.05, '#D8D2C4'); base.position.set(-0.5, 0, 0); S.add(base);
    const A = i => i / 7 * Math.PI * 2 - Math.PI / 2, PT = i => V(-0.5 + Math.cos(A(i)) * 0.95, 0.05, Math.sin(A(i)) * 0.95);
    const Sn = ST.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.4, 0.34, 0.4, '#fff', { r: 0.05, material: m }); b.position.copy(PT(i)); S.add(b); return m; });
    const dot = P.ball(0.1, SAF); dot.userData.noFit = true; S.add(dot);
    const report = add(P.stack(0.6, 0.45, 0.08, { max: 7, color: '#F4F1EA' })); report.position.set(1.65, 0.03, 0);
    const person = add(P.robot('#A87A4F', { scale: 0.6 })); person.position.set(2.2, 0.03, 0.2);
    S.add(P.keep(-1.85, 2.5, 0.85, -1.3, 1.3));
    let R = null, u = 0;
    function draw() { R = run(st); Sn.forEach((m, i) => m.color.set(st.on[i] ? GOOD : GREY)); report.userData.set({ n: R.n, colors: Array(7).fill('#F4F1EA') }); person.userData.set({ busy: R.ok }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = ST.map((s, i) => ({ type: 'toggle', label: s, short: s, quick: i < 3 ? undefined : false, get: () => !!st.on[i], set: v => { st.on[i] = v ? 1 : 0; draw(); } }));
    const readouts = [
      { label: 'Stages running', get: () => ({ v: `${R.n} of 7`, good: R.ok, bad: !R.ok }) },
      { label: 'Run', get: () => ({ v: R.ok ? 'ended by itself' : 'failed', sub: R.ok ? 'report written' : FAIL[R.off[0]], good: R.ok, bad: !R.ok }) },
      { label: 'Next', get: () => ({ v: 'a person reads it' }) },
    ];
    const labels = [
      { name: 'r', t: 'Seven stages', d: 'Each guards against the last', icon: 'link', atV: V(-1.75, 0.1, 0) },
      { name: 'p', t: 'The report', d: 'Every stage, written down', icon: 'book', atV: V(1.95, 0.2, 0) },
    ];
    const reset = () => { st.on = [...D0.on]; draw(); };
    const off = i => { const a = [...D0.on]; a[i] = 0; return () => set({ on: a }); };
    const breaks = [
      { label: 'Remove the evaluator', hint: 'anything passes', on: off(4), off: reset },
      { label: 'Remove the literature stage', hint: 'old news', on: off(1), off: reset },
      { label: 'Remove the runner\'s limits', hint: 'no end', on: off(3), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The loop ran, stopped itself, and wrote a report of each stage.</b> On a fixed seed, it runs the same each time.' };
      return { ok: false, msg: `<b>Without the ${ST[R.off[0]].toLowerCase()}, ${FAIL[R.off[0]]}.</b> Each part exists because that failure is real.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.8) % 7; const i = Math.floor(u), p = PT(i).lerp(PT((i + 1) % 7), u - i); dot.position.set(p.x, 0.5, p.z); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'All of it', home: true, say: 'A crop lab in Kumasi lets the whole loop run: ideas, reading, scheduling, running, judging, writing and critique.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1, 1] }) },
    { t: 'Check first', home: true, say: 'Remove the literature stage, and it retests what is known.', act: m => m.set({ on: [1, 0, 1, 1, 1, 1, 1] }) },
    { t: 'Runs end', home: true, say: 'The runner ends each experiment, with a reason.', act: m => m.set({ on: [1, 1, 1, 0, 1, 1, 1] }) },
    { t: 'Judge fairly', home: true, say: 'Without the evaluator, chance results pass.', act: m => m.set({ on: [1, 1, 1, 1, 0, 1, 1] }) },
    { t: 'Write what happened', home: true, say: 'The writer binds numbers to runs, and the critic revises.', act: m => m.set({ on: [1, 1, 1, 1, 1, 0, 1] }) },
    { t: 'It stops', home: true, say: 'The loop ends by itself, and writes a report. Then a person reads it.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1, 1] }) },
  ],
  check: [
    { q: 'What joins the parts here?', options: ['Plain imports', 'A big framework', 'A person typing'], answer: 0, why: 'No magic needed.', hint: 'See the overview.' },
    { q: 'Why does each stage matter?', options: ['Each guards against a failure of the last', 'For length', 'To use tokens'], answer: 0, why: 'Remove one and see.', hint: 'Try the breaks.' },
    { q: 'Who reads the output?', options: ['A person', 'Nobody', 'Only the critic'], answer: 0, why: 'Accountability stays human.', hint: 'See It stops.' },
  ],
  terms: [['Self-terminating', 'Ends by its own rule.'], ['Stage', 'One step of the loop.'], ['Seed', 'A fixed random start.'], ['Report', 'A record of each stage.']],
  deeper: '<p><b>The series.</b> Each ring has its own lesson.</p><p><b>Fixed seed.</b> It keeps the demo repeatable.</p><p><b>This page</b> names failures; earlier lessons run them.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s demo (code/main.py).',
    text: `
ideas = generate(seed)
known = retrieve(ideas)
for idea in schedule(filter_known(ideas, known)):
    result = run(idea.spec)
    if evaluate(result).verdict == "better":
        paper = write(idea, result, known)
        paper = critic_loop(paper)
report()
`,
  },
};
