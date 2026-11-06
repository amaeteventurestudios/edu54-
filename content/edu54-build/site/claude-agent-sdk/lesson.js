// The harness as a library (phase 14, lesson 17): one job, find the test file for each module in a Nairobi clinic's codebase. Run inline, the main agent's context tank
// overflows. Subagents read in their own small tanks and send back only a line. A session store lets a crashed run carry on. Built from the same sums the status line reads.
const CAP = 100, BASE = 12, READ = 6, LINE = 0.5;
function run(o) {
  const main = BASE + (o.sub ? o.m * (o.full ? READ : LINE) : o.m * READ);
  const each = o.sub ? (o.m / o.w) * READ : 0;
  const time = o.sub ? Math.ceil(o.m / o.w) : o.m;
  const done = o.crash ? (o.store ? o.m : Math.floor(o.m * 0.6)) : o.m;
  const over = main > CAP;
  return { main, each, time, done, over, subOver: each > CAP, tokens: o.sub ? BASE + o.m * READ + o.w * 3 + (main - BASE) : main * Math.max(1, o.m / 8) };
}

export default {
  slug: 'claude-agent-sdk',
  title: 'The harness as a library: subagents and a session store',
  description: 'Twenty modules to search and one context tank. Send the reading to subagents, and see what comes back and what survives a crash.',
  overview: 'A raw client SDK gives you one round trip: you own the loop, the tools and the state. The Claude Agent SDK gives you the harness instead: the loop, built-in tools, hooks, MCP connections, subagents and a session store, shipped as a library. What it changes in practice is where the context goes. A subagent has its own context window, so the reading happens there and only a result returns. Subagents earn their place in two ways: parallel work and context isolation. Sessions go to a store with a small interface, so a run can pick up after a crash.',
  keywords: ['Claude Agent SDK', 'subagents', 'context isolation', 'session store', 'agent harness', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.07, 0.62, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { m: 20, sub: true, w: 5, full: false, store: true, crash: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const boss = add(P.robot(SAF, { scale: 1 })); boss.position.set(-2.1, 0.03, -0.1);
    const tank = add(P.tank(0.7, 1.05, 0.6, GOOD)); tank.position.set(-1.25, 0.08, -0.1);
    const XS = i => -0.3 + i * 0.52, kids = Array.from({ length: 6 }, (_, i) => {
      const r = add(P.robot(BLUE, { scale: 0.5 })); r.position.set(XS(i), 0.03, 0.35);
      const t = add(P.tank(0.3, 0.6, 0.26, BLUE)); t.position.set(XS(i), 0.08, -0.3);
      return { r, t };
    });
    const shelf = add(P.shelf(5, { cell: 0.26, d: 0.3, lh: 0.3 })); shelf.position.set(-1.45, 0.03, 0.6);
    const bench = P.box(3.2, 0.05, 1.2, '#BFB8A8', { r: 0.03 }); bench.position.set(1.0, 0.0, 0.03); S.add(bench);
    const dot = P.ball(0.07, SAF); dot.userData.noFit = true; S.add(dot);
    S.add(P.keep(-2.55, 2.5, 1.25, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      tank.userData.set({ level: R.main / CAP, color: R.over ? BAD : GOOD });
      kids.forEach((K, i) => {
        const on = st.sub && i < st.w; K.r.visible = on; K.t.visible = on;
        K.t.userData.set({ level: R.each / CAP * 1.2, color: R.subOver ? BAD : BLUE }); K.r.userData.set({ busy: on });
      });
      boss.userData.set({ busy: true, lamp: R.over ? '#D9483B' : '#3E9B5F' });
      shelf.userData.set({ fill: Array.from({ length: 5 }, (_, i) => st.store && i < 5 ? GOOD : null) });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Modules to search', min: 5, max: 40, step: 1, get: () => st.m, set: v => set({ m: v }) },
      { type: 'toggle', label: 'Use subagents', short: 'Subagents', get: () => st.sub, set: v => set({ sub: !!v }) },
      { type: 'slider', label: 'Subagents at once', min: 1, max: 6, step: 1, get: () => st.w, set: v => set({ w: v }) },
      { type: 'toggle', label: 'Subagents return their whole transcript', short: 'Full return', get: () => st.full, set: v => set({ full: !!v }) },
      { type: 'toggle', label: 'Sessions go to a store', short: 'Store', get: () => st.store, set: v => set({ store: !!v }) },
      { type: 'toggle', label: 'The process crashes part way', short: 'Crash', get: () => st.crash, set: v => set({ crash: !!v }) },
    ];
    const readouts = [
      { label: 'Main context', get: () => ({ v: `${Math.round(R.main)}%`, sub: 'of the window', good: R.main < 70, bad: R.over }) },
      { label: 'Rounds of waiting', get: () => ({ v: `${R.time}`, sub: st.sub ? `${st.w} at a time` : 'one at a time' }) },
      { label: 'Modules finished', get: () => ({ v: `${R.done} of ${st.m}`, sub: st.crash ? 'after the crash' : 'no crash', good: R.done === st.m, bad: R.done < st.m }) },
    ];
    const labels = [
      { name: 'c', t: 'Main context', d: 'Red: the window is gone', icon: 'target', atV: V(-1.0, 0.7, -0.2) },
      { name: 's', t: 'Subagents', d: 'Each has its own window', icon: 'user', atV: V(2.5, 0.06, 0.03) },
      { name: 'k', t: 'Session store', d: 'Survives a crash', icon: 'box', atV: V(-2.1, 0.2, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read everything inline', hint: 'no subagents', on: () => set({ ...D0, sub: false }), off: reset },
      { label: 'Subagents send back everything', hint: 'isolation lost', on: () => set({ ...D0, full: true }), off: reset },
      { label: 'One subagent for all forty', hint: 'the tank just moved', on: () => set({ ...D0, m: 40, w: 1 }), off: reset },
      { label: 'Crash with no session store', hint: 'state lived in memory', on: () => set({ ...D0, crash: true, store: false }), off: reset },
    ];
    function status() {
      if (!st.sub && R.over) return { ok: false, msg: `<b>Main context hit ${Math.round(R.main)}%.</b> Every file read stayed in the main window. The agent runs out of room before it can use what it found, and early facts get squeezed out.` };
      if (st.sub && st.full && R.over) return { ok: false, msg: `<b>Subagents, and main context still reached ${Math.round(R.main)}%.</b> They read in their own windows, then sent the whole transcript home. Isolation only pays if just the result comes back.` };
      if (R.subOver) return { ok: false, msg: `<b>The subagent overflowed instead: ${Math.round(R.each)}% of its window.</b> Moving a job into one subagent moves the problem too. Split the work so that each piece fits.` };
      if (R.done < st.m) return { ok: false, msg: `<b>Only ${R.done} of ${st.m} finished, and the rest of the run is gone.</b> The session lived in the process. With a store, each message is appended as it happens, so a new process loads it and carries on.` };
      return { ok: true, msg: `<b>${st.m} modules in ${R.time} rounds, with main context at ${Math.round(R.main)}%.</b> ${st.sub ? 'Reading happened in the subagents\' windows and one line came back from each.' : 'A small job fits inline, and subagents would only add overhead.'}${st.crash ? ' The store carried the run past the crash.' : ''}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.8) % 1;
        const i = Math.floor(S.t * 0.8) % Math.max(1, st.w), on = st.sub;
        dot.visible = on; if (on) { const a = V(XS(i), 0.72, -0.3), b = V(-1.25, 1.2, -0.1); dot.position.copy(a.lerp(b, u)); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A raw round trip', home: true, say: 'A clinic in Nairobi wants the test file found for every module. With a raw client you own the loop, and all the reading lands in one window.', act: m => m.set({ m: 20, sub: false, w: 5, full: false, store: true, crash: false }) },
    { t: 'The harness', home: true, say: 'The Agent SDK is the harness as a library: the loop, tools, hooks and subagents come built in.', act: m => m.set({ m: 8, sub: false, w: 5, full: false, store: true, crash: false }) },
    { t: 'Context isolation', home: true, say: 'Subagents read in their own windows. Only one line comes home, so the main tank stays low.', act: m => m.set({ m: 20, sub: true, w: 5, full: false, store: true, crash: false }) },
    { t: 'Parallel work', home: true, say: 'They also work at once. Five robots finish twenty modules in four rounds instead of twenty.', act: m => m.set({ m: 20, sub: true, w: 5, full: false, store: true, crash: false }) },
    { t: 'What comes back', home: true, say: 'If a subagent sends back everything it read, the isolation is lost and the main tank fills anyway.', act: m => m.set({ m: 20, sub: true, w: 5, full: true, store: true, crash: false }) },
    { t: 'Surviving a crash', home: true, say: 'Sessions go to a store, one message at a time. A new process loads the session and carries on.', act: m => m.set({ m: 20, sub: true, w: 5, full: false, store: true, crash: true }) },
  ],
  check: [
    { q: 'What two things are subagents for?', options: ['Parallel work and context isolation', 'Cheaper models and logging', 'Security and billing'], answer: 0, why: 'They run at once, in their own windows.', hint: 'See Context isolation in the story.' },
    { q: 'What should a subagent send back?', options: ['Only its result', 'Its full transcript', 'Every file it read'], answer: 0, why: 'A full return refills the main window.', hint: 'Try Subagents send back everything.' },
    { q: 'What does the session store give you?', options: ['A run that can resume in a new process', 'Faster models', 'Fewer tools'], answer: 0, why: 'Messages are appended as they happen, so state outlives the process.', hint: 'Try Crash with no session store.' },
  ],
  terms: [
    ['Client SDK', 'Raw API calls; you own the loop, tools and state.'],
    ['Agent SDK', 'The harness as a library: loop, tools, hooks, subagents, sessions.'],
    ['Subagent', 'A child agent with its own context window.'],
    ['Context isolation', 'Keeping a task\'s reading out of the main window.'],
    ['Session store', 'Where a run\'s messages are saved; append, load, list, delete.'],
    ['Hook', 'Your code, run at a point in the loop.'],
  ],
  deeper: '<p><b>When not to use subagents.</b> A task that needs the main thread\'s context, or one small read, is faster inline. Each subagent starts cold and has to be told what it needs.</p><p><b>Reading a subagent\'s work.</b> The SDK can list subagents and fetch their messages, so you can debug a child run without pouring it into the main context.</p><p><b>Mirroring.</b> Sessions can be mirrored to your own store, which is how they reach a shared database or an audit log.</p>',
  code: {
    title: 'Fan out, keep the result',
    note: 'Adapted from the course\'s stdlib harness (code/main.py).',
    text: `
def find_tests(modules, store, session):
    results = []
    with ThreadPool(5) as pool:
        for answer in pool.imap(spawn_subagent, modules):
            results.append(answer.result)        # one line, not the transcript
            store.append(session, {"role": "tool", "content": answer.result})
    return results

def spawn_subagent(module):
    context = [system("Find the test file for a module. Reply with its path.")]
    return run_agent(context + [user(module)], tools=["read", "grep", "glob"])
`,
  },
};
