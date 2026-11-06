// The agent workbench (lessons 31 and 32): a coding agent adds a CSV export of fee receipts to a Kampala school's fees app, across two sessions.
// Seven surfaces wrap the model: instructions, state, scope, feedback, verification, review, handoff. Each one, when missing, lets a specific failure
// through (the table below). The minimal workbench is three files: an instructions router (AGENTS.md), a state file and a task board; they supply the
// first three surfaces and the board's acceptance criteria. The run's outcome, failures and sessions are computed live from which surfaces exist.
const SURF = [
  ['instructions', 'AGENTS.md: start-up rules, forbidden actions, what "done" means', 'guesses what shipping means and pushes straight to main'],
  ['state', 'STATE.md: current task, files touched, blockers, next step', 'session 2 starts from zero and redoes the parser'],
  ['scope', 'TASKS.md entry: allowed files and acceptance criteria', 'also "tidies" the payments module it was never asked to touch'],
  ['feedback', 'real command output captured each turn', 'reads a failing migration as success and moves on'],
  ['verification', 'tests, lint, a smoke run, a scope check', 'ships an export that drops receipts with a comma in the name'],
  ['review', 'a second pass with a different role', 'marks its own homework: "looks good"'],
  ['handoff', 'what changed, why, what is left', 'the next person can\'t tell the export is half done'],
];
const MIN3 = ['instructions', 'state', 'scope'];
function run(on) {
  const fails = SURF.filter(s => !on.has(s[0]));
  let sessions = 2 + (on.has('state') ? 0 : 1) + (on.has('feedback') ? 0 : 1);
  const safe = !fails.length;
  return { fails, sessions, safe };
}

export default {
  slug: 'agent-workbench-why-models-fail',
  title: 'The agent workbench: why capable models still fail',
  description: 'A coding agent adds a fee-receipt export to a Kampala school\'s app. The model is capable; what fails is everything around it. Add the seven surfaces of a workbench.',
  overview: 'A capable model is not enough. Reliable agent work needs a workbench, the environment around the model during a task, with seven surfaces. Instructions say how work starts, what is forbidden and what "done" means; without them the agent guesses. State records the current task, the files touched, blockers and the next step, so a new session doesn\'t start from zero. Scope lists the files a task may touch and its acceptance criteria, so edits don\'t leak into unrelated code. Feedback puts real command output back in front of the agent, so it reacts to facts rather than to its prediction of them. Verification (tests, lint, a smoke run, a scope check) decides whether the task is complete. Review is a second pass with a different role, because the builder can\'t grade its own work. Handoff records what changed, why, and what is left. The loop closes on files in the repo, not on chat history, which is volatile. The surfaces are independent of the model: you can swap the model and keep them, not the other way round. The smallest useful workbench is three files: an instructions router at the root, a state file and a task board; the rest is layered on top. Underneath, they are ordinary distributed-systems pieces: functions, workers, triggers, queues and durable state.',
  keywords: ['agent workbench', 'harness engineering', 'coding agents', 'AGENTS.md', 'AI agents', 'reliability', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.25, 0.25, 0.1], dir: [0.05, 0.95, 1.2], half: 1.35, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const ALL = SURF.map(s => s[0]);
    const D0 = { on: ALL.slice() }, st = { on: ALL.slice() };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8';
    /* the model is a robot at a bench, fenced by the seven surfaces: blue for the three files (instructions, state, scope), green for the rest.
       Each missing surface leaves a gap, and its failure (a red ball) gets out through it */
    const CX = -0.9, CZ = 0.1, RXr = 1.35, RZr = 0.95, ang = i => -Math.PI / 2 + i * 2 * Math.PI / 7;
    const bench = P.box(0.9, 0.3, 0.5, '#A87A4F', { r: 0.04 }); bench.position.set(CX, 0, CZ - 0.5); S.add(bench);
    const bot = P.robot(CHAR, { scale: 0.9 }); bot.position.set(CX, 0, CZ - 0.1); S.add(bot);
    const walls = SURF.map((s, i) => { const a = ang(i), m = new THREE.MeshLambertMaterial({ color: GOOD }), w = P.box(0.95, 0.4, 0.09, '#fff', { r: 0.03, material: m }); w.position.set(CX + Math.cos(a) * RXr, 0, CZ + Math.sin(a) * RZr); w.rotation.y = -a - Math.PI / 2; S.add(w);
      const ball = P.ball(0.1, RED); ball.userData.noFit = true; S.add(ball); return { m, w, ball, a }; });
    /* the outcome: one block per session it took, and a ship lamp */
    const sess = P.stack(0.55, 0.45, 0.14, { max: 4, color: BLUE }); sess.position.set(2.0, 0, -0.2); S.add(sess);
    const ship = P.lamp(GOOD, { h: 0.6, r: 0.14 }); ship.position.set(2.75, 0, 0.35); S.add(ship);
    S.add(P.keep(-2.45, 3.0, 0.95, -0.95, 1.2));

    let R = null, t = 0;
    function draw() {
      const on = new Set(st.on); R = run(on);
      walls.forEach((g, i) => { const k = SURF[i][0], has = on.has(k); g.w.visible = has; g.m.color.set(MIN3.includes(k) ? BLUE : GOOD); g.ball.visible = !has; });
      sess.userData.set({ n: R.sessions, colors: Array(4).fill(0).map((_, i) => i < 2 ? BLUE : RED) });
      ship.userData.set({ color: R.safe ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = k => ({ type: 'toggle', label: `${k[0].toUpperCase() + k.slice(1)}`, short: k, get: () => st.on.includes(k), set: v => set({ on: v ? [...new Set([...st.on, k])] : st.on.filter(x => x !== k) }), quick: false });
    const controls = [
      { type: 'buttons', label: 'Start from', options: ['Prompt only', 'Three files', 'Full workbench'], get: () => st.on.length === 0 ? 0 : st.on.length === 3 && MIN3.every(k => st.on.includes(k)) ? 1 : st.on.length === 7 ? 2 : -1, act: i => set({ on: [[], MIN3.slice(), ALL.slice()][i] }) },
      ...ALL.map(tog),
    ];
    const readouts = [
      { label: 'Ship', get: () => ({ v: R.safe ? 'safe' : 'unsafe', sub: `${R.fails.length} failures`, good: R.safe, bad: !R.safe }) },
      { label: 'Surfaces', get: () => ({ v: `${st.on.length} of 7`, sub: 'around the same model' }) },
      { label: 'Sessions', get: () => ({ v: String(R.sessions), sub: 'to finish the export', good: R.sessions === 2 }) },
    ];
    const labels = [
      { name: 'model', t: 'The same model', d: 'In every run', icon: 'spark', atV: V(CX - 0.2, 0.4, CZ) },
      { name: 'wall', t: 'Seven surfaces', d: 'Blue: the three files', icon: 'box', atV: V(CX - RXr - 0.05, 0.4, CZ) },
      { name: 'fail', t: 'A failure gets out', d: 'Through each missing surface', icon: 'info', atV: V(CX - 1.95, 0.4, CZ), hide: () => !R.fails.length },
      { name: 'sess', t: 'Sessions', d: 'Red: extra ones', icon: 'reset', atV: V(2.28, 0.3, -0.2) },
      { name: 'ship', t: 'Safe to ship?', d: 'Green only with all seven', icon: 'check', atV: V(2.9, 0.75, 0.35) },
    ];
    const reset = () => set({ on: ALL.slice() });
    const breaks = [
      { label: 'Prompt only', hint: 'a good model, no workbench', on: () => set({ on: [] }), off: reset },
      { label: 'Skip verification and review', hint: 'the agent grades itself', on: () => set({ on: ALL.filter(k => k !== 'verification' && k !== 'review') }), off: reset },
      { label: 'Keep state in chat', hint: 'no state file, no handoff', on: () => set({ on: ALL.filter(k => k !== 'state' && k !== 'handoff') }), off: reset },
    ];
    function status() {
      if (!st.on.length) return { ok: false, msg: `<b>Prompt only: the same capable model pushes to main, wanders into payments, misreads a failed migration, ships a broken export and grades it "looks good", in ${R.sessions} sessions.</b> These are workbench failures wearing prompt-engineering clothes. Start with three files: AGENTS.md, STATE.md and TASKS.md.` };
      if (R.fails.length) return { ok: false, msg: `<b>Missing ${R.fails.map(f => f[0]).join(', ').replace(/, ([^,]*)$/, ' and $1')}: ${R.fails.map(f => f[2]).join('; ')}.</b> Each surface stops one kind of failure, whatever the model.` };
      return { ok: true, msg: '<b>All seven surfaces: the export ships in two sessions, inside its scope, verified, reviewed and handed off.</b> The loop closes on files in the repo, not on chat. Swap the model and keep the workbench.' };
    }
    return { update: dt => { t += dt; bot.userData.tick(dt); walls.forEach(g => { const r = 1.15 + ((t * 0.35 + g.a) % 1) * 0.7; g.ball.position.set(CX + Math.cos(g.a) * RXr * r, 0.12, CZ + Math.sin(g.a) * RZr * r); }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A capable model', home: true, say: 'A coding agent adds a CSV export of fee receipts to a Kampala school\'s fees app. The model is capable. What fails is everything around it.', act: m => m.set({ on: [] }) },
    { t: 'Prompt only', home: true, say: 'With only a prompt, it pushes to main, edits code it was never asked to touch, and grades its own work.', act: m => m.set({ on: [] }) },
    { t: 'Three files', home: true, say: 'The smallest workbench is three files: rules for how to work, a state file, and a task board with what is in scope.', act: m => m.set({ on: ['instructions', 'state', 'scope'] }) },
    { t: 'Real output', home: true, say: 'Add feedback and verification: the agent sees real command output, and tests decide whether the export works.', act: m => m.set({ on: ['instructions', 'state', 'scope', 'feedback', 'verification'] }) },
    { t: 'A second pair of eyes', home: true, say: 'Add a reviewer with a different role, and a handoff note for the next session.', act: m => m.set({ on: SURF.map(s => s[0]) }) },
    { t: 'Keep the workbench', home: true, say: 'Swap the model and keep the workbench. Not the other way round.', act: m => m.set({ on: SURF.map(s => s[0]) }) },
  ],
  check: [
    { q: 'Where should an agent\'s work state live?', options: ['In versioned files in the repo', 'In the chat history', 'In the model'], answer: 0, why: 'Chat is volatile; the repo is the system of record.', hint: 'Try Keep state in chat.' },
    { q: 'What is the smallest useful workbench?', options: ['An instructions router, a state file and a task board', 'A bigger model', 'A longer prompt'], answer: 0, why: 'Everything else layers on top.', hint: 'Pick Three files.' },
    { q: 'Why have a separate review surface?', options: ['The builder can\'t grade its own work', 'To use more tokens', 'Reviews are optional'], answer: 0, why: 'A different role catches what the builder misses.', hint: 'Try Skip verification and review.' },
  ],
  terms: [
    ['Workbench', 'The environment that wraps a model during a task.'],
    ['Instructions router', 'A root file of start-up rules, forbidden actions and what done means.'],
    ['State file', 'Current task, files touched, blockers and next step.'],
    ['Task board', 'Tasks with their scope and acceptance criteria.'],
    ['Surface', 'One part of the workbench that stops one kind of failure.'],
    ['System of record', 'The durable source everyone reads: the repo.'],
  ],
  deeper: '<p><b>Primitives underneath.</b> Each surface is an ordinary systems piece: functions (a rule check), workers (builder, reviewer), triggers (a hook, a queue message), queues, durable state and a runtime that enforces timeouts.</p><p><b>Workbench and framework.</b> A framework gives a runtime; a workbench gives the agent a place to work inside it. You need both.</p><p><b>About this machine.</b> Which failures appear, and how many sessions the task takes, follow from the surfaces switched on.</p>',
  code: {
    title: 'The three-file workbench',
    note: 'Adapted from the course\'s workbench lessons.',
    text: `
# AGENTS.md  (the router: read me first)
- Start: read STATE.md, then the active task in TASKS.md.
- Never push to main. Never touch files outside the task's scope.
- Done means: tests pass, scope check passes, STATE.md updated.

# STATE.md
task: T-14 export fee receipts as CSV
touched: fees/export.py, tests/test_export.py
blocked_by: none
next: handle names that contain commas

# TASKS.md
T-14  export fee receipts as CSV
  allowed: fees/export.py, tests/test_export.py
  accept: every receipt in the term appears once; opens in a spreadsheet
`,
  },
};
