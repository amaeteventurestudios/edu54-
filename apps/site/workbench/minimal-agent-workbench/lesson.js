// The minimal workbench (phase 14, lesson 32): three small files beat one huge manual. A Kisumu water utility's repo is worked over several sessions. Each new session starts with no memory.
// The root file is either a short router or a 3000-line manual; a state file says where things stand; a task board says what is next. Tank: context on load. Towers: turns lost per session.
const CAP = 100;
function run(o) {
  const load = o.root === 'manual' ? 62 : 6;
  const deep = o.root === 'router' ? 8 : 0;
  const lost = i => i === 0 ? (o.root === 'none' ? 9 : 3) : (o.state ? 1 : 7) + (o.board ? 0 : 3) + (o.root === 'none' ? 2 : 0);
  const per = Array.from({ length: o.n }, (_, i) => lost(i));
  const redo = o.board ? 0 : Math.max(0, o.n - 1);
  const ignored = o.root === 'manual';
  return { load, deep, ctx: load + deep + (o.root === 'none' ? 4 : 0), per, total: per.reduce((a, b) => a + b, 0), redo, ignored, ok: o.root === 'router' && o.state && o.board };
}

export default {
  slug: 'minimal-agent-workbench',
  title: 'The minimal workbench: three small files',
  description: 'Each new session starts with no memory. Compare a huge manual with a short router, a state file and a task board.',
  overview: 'Most teams answer agent failures with one giant instructions file. The model loads it, skims what it can\'t hold, and fails in the same places. The smallest thing that works is three files with one job each. A short root file is a router: it says where to look, not everything there is. A state file says where the work stands, read before acting and written at the end. A task board says what is in flight, blocked and next, so work survives without chat history. This lesson runs a water utility\'s repo over several sessions, each starting from nothing.',
  keywords: ['AGENTS.md', 'agent workbench', 'state file', 'task board', 'context engineering', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.62, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { root: 'router', state: true, board: true, n: 5 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const tank = add(P.tank(0.75, 1.0, 0.6, GOOD)); tank.position.set(-2.0, 0.08, -0.15);
    const rootF = add(P.stack(0.62, 0.45, 0.07, { max: 12 })); rootF.position.set(-1.1, 0.03, -0.25);
    const stateB = P.box(0.5, 0.2, 0.42, BLUE, { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: BLUE }) }); stateB.position.set(-1.1, 0.03, 0.45); S.add(stateB);
    const shelf = add(P.shelf(4, { cell: 0.26, d: 0.32, lh: 0.28 })); shelf.position.set(-0.3, 0.03, 0.45);
    const X = i => 0.1 + i * 0.5;
    const T = Array.from({ length: 5 }, (_, i) => {
      const t = add(P.tower(0.36, 0.42, SAF)); t.position.set(X(i), 0.03, -0.2); t.userData.set({ cap: '' });
      return t;
    });
    const bot = add(P.robot('#7B6FA8', { scale: 0.5 })); bot.userData.noFit = true;
    S.add(P.keep(-2.55, 2.5, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      tank.userData.set({ level: R.ctx / CAP, color: R.ctx > 55 ? BAD : GOOD });
      rootF.userData.set({ n: st.root === 'none' ? 0 : st.root === 'manual' ? 12 : 2, colors: Array(12).fill(st.root === 'manual' ? BAD : GOOD) });
      stateB.visible = st.state; shelf.visible = st.board;
      if (st.board) shelf.userData.set({ fill: [GOOD, GOOD, SAF, BLUE] });
      T.forEach((t, i) => { const on = i < st.n; t.visible = on; t.userData.set({ h: on ? Math.max(0.03, R.per[i] * 0.09) : 0.02, color: R.per[i] > 4 ? BAD : SAF }); });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const RK = ['router', 'manual', 'none'];
    const controls = [
      { type: 'buttons', label: 'Root file', options: ['Short router', '3000-line manual', 'None'], get: () => RK.indexOf(st.root), act: i => set({ root: RK[i] }) },
      { type: 'toggle', label: 'State file, read first and written last', short: 'State file', get: () => st.state, set: v => set({ state: !!v }) },
      { type: 'toggle', label: 'Task board: in flight, blocked, next', short: 'Task board', get: () => st.board, set: v => set({ board: !!v }) },
      { type: 'slider', label: 'Sessions', min: 2, max: 5, step: 1, get: () => st.n, set: v => set({ n: v }) },
    ];
    const readouts = [
      { label: 'Context on load', get: () => ({ v: `${R.ctx}%`, sub: 'before any work', good: R.ctx < 25, bad: R.ctx > 55 }) },
      { label: 'Turns lost finding the way', get: () => ({ v: `${R.total}`, sub: `over ${st.n} sessions`, good: R.total < 2 * st.n + 3, bad: R.total > 4 * st.n }) },
      { label: 'Tasks done twice', get: () => ({ v: `${R.redo}`, sub: 'nobody recorded them', good: !R.redo, bad: R.redo > 0 }) },
    ];
    const labels = [
      { name: 't', t: 'Context on load', d: 'Red: full before it starts', icon: 'target', atV: V(-2.35, 0.5, -0.15) },
      { name: 'b', t: 'Turns lost per session', d: 'Each session starts blank', icon: 'chart', atV: V(X(4) + 0.18, 0.08, -0.15) },
      { name: 'f', t: 'State and board', d: 'They outlive the chat', icon: 'box', atV: V(-1.3, 0.1, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Write a 3000-line manual', hint: 'more rules, same failures', on: () => set({ ...D0, root: 'manual' }), off: reset },
      { label: 'No state file', hint: 'where were we?', on: () => set({ ...D0, state: false }), off: reset },
      { label: 'No task board', hint: 'chat history was the plan', on: () => set({ ...D0, board: false }), off: reset },
    ];
    function status() {
      if (st.root === 'manual') return { ok: false, msg: `<b>${R.ctx}% of the window is gone before the first turn.</b> The model loaded the whole manual and can't hold it all, so it skims. Rules that matter sit in the part it drops. Route to deep files only when they are needed.` };
      if (st.root === 'none') return { ok: false, msg: `<b>${R.total} turns went on finding the way.</b> With no root file, each session lists folders and guesses the test command. Even a dozen lines saying where things are saves that.` };
      if (!st.state) return { ok: false, msg: `<b>${R.total} turns lost: each new session re-reads the code to learn what happened.</b> Sessions have no memory. A short file saying where things stand, read first and updated last, is that memory.` };
      if (!st.board) return { ok: false, msg: `<b>${R.redo} tasks were done twice.</b> The plan lived in a chat that ended. A board in the repo says what is in flight, blocked and next, and it doesn't need history.` };
      return { ok: true, msg: `<b>${st.n} sessions with ${R.total} turns lost, and context at ${R.ctx}% on load.</b> The router pointed, the state file said where things stood, the board said what was next. Three files, each with one job.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.3) % 1;
        const i = Math.floor(u * st.n); bot.position.set(X(i), 0.03, 0.42);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'The giant manual', home: true, say: 'A water utility in Kisumu has one huge instructions file for its agent. The tank is mostly full before any work begins.', act: m => m.set({ root: 'manual', state: true, board: true, n: 5 }) },
    { t: 'A router', home: true, say: 'Cut it down to a short router. It says where things are, and the deep rules load only when a job needs them.', act: m => m.set({ root: 'router', state: true, board: true, n: 5 }) },
    { t: 'Sessions forget', home: true, say: 'Every new session starts blank. Without a state file, each one spends turns working out what happened.', act: m => m.set({ root: 'router', state: false, board: true, n: 5 }) },
    { t: 'A state file', home: true, say: 'A short file, read first and written last, says where things stand. The towers drop.', act: m => m.set({ root: 'router', state: true, board: true, n: 5 }) },
    { t: 'A task board', home: true, say: 'Plans kept in a chat vanish with the chat, and tasks get done twice. A board in the repo says what is next.', act: m => m.set({ root: 'router', state: true, board: false, n: 5 }) },
    { t: 'Three files', home: true, say: 'A router, a state file and a board. Each has one job, and each can grow into a real system later.', act: m => m.set({ root: 'router', state: true, board: true, n: 5 }) },
  ],
  check: [
    { q: 'What should a root instructions file be?', options: ['A short router to deeper files', 'Every rule in one place', 'Empty'], answer: 0, why: 'A long file fills the window and gets skimmed.', hint: 'Try Write a 3000-line manual.' },
    { q: 'What does the state file do?', options: ['It tells a blank session where things stand', 'It stores the model', 'It runs the tests'], answer: 0, why: 'Read first and written last, it stands in for memory.', hint: 'Try No state file.' },
    { q: 'Why keep a task board in the repo?', options: ['The plan survives without chat history', 'It looks tidy', 'It saves disk space'], answer: 0, why: 'Chats end, and the repo stays.', hint: 'Try No task board.' },
  ],
  terms: [
    ['Workbench', 'The files and scripts around an agent that make it reliable.'],
    ['AGENTS.md', 'A root file agents read when they open a repo.'],
    ['Router', 'A short file that points to deeper ones.'],
    ['State file', 'Where the work stands, kept up to date by the agent.'],
    ['Task board', 'What is in flight, blocked and next.'],
    ['Session', 'One run of an agent, starting with no memory.'],
  ],
  deeper: '<p><b>Machine-readable first.</b> A state file in a simple structured form can be checked by a script. Later lessons turn that into gates.</p><p><b>What goes in the router.</b> Where the state lives, where the board lives, where deep rules live, and the one command that proves work is done.</p><p><b>When to grow.</b> Add a file only when a failure repeats and a file would have stopped it.</p>',
  code: {
    title: 'Start and end a session',
    note: 'Adapted from the course\'s workbench sketch (code/main.py).',
    text: `
def start_session(repo):
    router = read(repo / "AGENTS.md")            # about thirty lines
    state = json.load(open(repo / "state.json"))
    board = json.load(open(repo / "board.json"))
    task = next(t for t in board if t["status"] == "next")
    return prompt(router, state, task)

def end_session(repo, state, task, summary):
    state.update(last_task=task["id"], summary=summary)
    json.dump(state, open(repo / "state.json", "w"), indent=2)
    move(task, "done")
`,
  },
};
