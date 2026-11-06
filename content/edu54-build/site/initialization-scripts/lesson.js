// Initialization scripts (phase 14, lesson 35): a Windhoek fleet firm's repo. Without init, every session rediscovers the runtime, the test command and the paths. One script probes seven
// things, writes a report the agent reads, and halts loudly if anything is wrong. Lamps are probes; the jar is tokens burned on setup across sessions; a stale report is a trap.
const PROBES = 7, GUESS = 10, READ = 1;
function run(o) {
  const per = o.init ? READ : GUESS, tokens = per * o.n;
  const broken = o.broken;
  const caught = o.init && (!o.stale || o.check);
  let late = 0;
  if (broken && !caught) late = 18;
  if (broken && caught && !o.loud) late = 12;
  return { per, tokens, broken, caught, late, halted: broken && caught && o.loud };
}

export default {
  slug: 'initialization-scripts',
  title: 'Initialization scripts: stop rediscovering the repo',
  description: 'Every session guesses the same things. One script probes them once, writes a report, and stops loudly if something is broken.',
  overview: 'Open a session and watch it. The agent guesses the Python version, guesses the test command, lists the root folder five times, then tries to import a package that isn\'t there. Thousands of tokens go on setup before a real edit. An initialization script does that work once, the same way every time: it probes runtime versions, dependencies, the test command, paths, environment variables, state freshness and the last good commit, and writes a report the agent reads at startup. If something is wrong, it stops, loudly, in one place. A report can go stale, so it carries a fingerprint the agent checks.',
  keywords: ['initialization script', 'agent workbench', 'environment probes', 'fail fast', 'AI agents', 'developer tooling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.68, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { init: true, broken: false, stale: false, check: true, loud: true, n: 6 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.1 + i * 0.42;
    const lamps = Array.from({ length: PROBES }, (_, i) => { const l = add(P.lamp(GOOD, { h: 0.42, r: 0.09 })); l.position.set(X(i), 0.03, -0.3); return l; });
    const rail = P.box(3, 0.1, 0.25, '#6B6E7E', { r: 0.03 }); rail.position.set(-0.84, 0.03, -0.3); S.add(rail);
    const gate = add(P.gate(0.9, SAF)); gate.position.set(1.2, 0.03, -0.1);
    const bot = add(P.robot('#5B8DB8', { scale: 0.75 })); bot.position.set(0.3, 0.03, 0.3);
    const report = P.box(0.42, 0.06, 0.32, '#F4F1EA', { r: 0.01, material: new S.THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); report.position.set(-0.75, 0.03, 0.42); S.add(report);
    const jar = add(P.jar(0.3, 0.8, { max: 14 })); jar.position.set(2.05, 0.03, 0.2);
    const work = P.box(0.7, 0.3, 0.45, '#A87A4F', { r: 0.04 }); work.position.set(1.25, 0.03, -0.55); S.add(work);
    S.add(P.keep(-2.5, 2.5, 1.05, -0.8, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      lamps.forEach((l, i) => l.userData.set({ color: !st.init ? GREY : (st.broken && i === 1 && R.caught ? RED : GOOD), on: st.init }));
      gate.userData.set({ open: !R.halted, color: R.halted ? RED : SAF });
      report.visible = st.init; report.material.color.set(st.stale ? '#E0B070' : '#F4F1EA');
      jar.userData.set({ n: Math.round(R.tokens / 5) + Math.round(R.late / 5) });
      bot.userData.set({ busy: !R.halted, lamp: R.late ? '#D9483B' : '#3E9B5F' });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Run the init script before the agent', short: 'Init', get: () => st.init, set: v => set({ init: !!v }) },
      { type: 'toggle', label: 'A dependency is missing', short: 'Broken dep', get: () => st.broken, set: v => set({ broken: !!v }) },
      { type: 'toggle', label: 'The report is left from an old run', short: 'Old report', get: () => st.stale, set: v => set({ stale: !!v }) },
      { type: 'toggle', label: 'Compare the report\'s fingerprint with the repo', short: 'Fingerprint', get: () => st.check, set: v => set({ check: !!v }) },
      { type: 'toggle', label: 'Halt on failure', short: 'Fail loud', get: () => st.loud, set: v => set({ loud: !!v }) },
      { type: 'slider', label: 'Sessions', min: 1, max: 10, step: 1, get: () => st.n, set: v => set({ n: v }) },
    ];
    const readouts = [
      { label: 'Setup per session', get: () => ({ v: `${R.per}k tokens`, sub: st.init ? 'read one report' : 'guess and list', good: st.init, bad: !st.init }) },
      { label: 'Wasted on a hidden fault', get: () => ({ v: R.late ? `${R.late}k tokens` : 'none', sub: R.broken ? (R.halted ? 'halted at the door' : 'found late') : 'nothing is broken', good: !R.late, bad: !!R.late }) },
      { label: 'Agent', get: () => ({ v: R.halted ? 'stopped' : 'working', sub: R.halted ? 'one place to look' : '', bad: !!R.late }) },
    ];
    const labels = [
      { name: 'p', t: 'Seven probes', d: 'Runtime, deps, tests, paths…', icon: 'check', atV: V(X(0), 0.55, -0.3) },
      { name: 'g', t: 'The gate', d: 'Shut when a probe fails', icon: 'stop', atV: V(1.65, 0.45, -0.1) },
      { name: 'j', t: 'Tokens burned', d: 'Setup plus late faults', icon: 'money', atV: V(2.35, 0.5, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No init script', hint: 'guess it again', on: () => set({ ...D0, init: false }), off: reset },
      { label: 'Trust an old report', hint: 'a package has gone since', on: () => set({ ...D0, broken: true, stale: true, check: false }), off: reset },
      { label: 'Warn and carry on', hint: 'nobody reads the warning', on: () => set({ ...D0, broken: true, loud: false }), off: reset },
    ];
    function status() {
      if (!st.init && R.broken) return { ok: false, msg: `<b>${R.tokens}k tokens of guessing, and the fault cost ${R.late}k more.</b> With nothing checking first, the missing package showed up deep in a task, looking like a bug in the agent's own work.` };
      if (!st.init) return { ok: false, msg: `<b>${R.tokens}k tokens on setup across ${st.n} sessions.</b> Each one found the same Python version and the same test command. Anything that is the same every session belongs in a script, not in a model's turns.` };
      if (R.broken && !R.caught) return { ok: false, msg: `<b>All lamps were green, from a report older than the fault.</b> The missing package cost ${R.late}k tokens to find. A report must carry a fingerprint, such as a commit and a lockfile hash, and the agent must compare it.` };
      if (R.broken && !st.loud) return { ok: false, msg: `<b>The probe saw it and only warned.</b> The agent read past the warning and spent ${R.late}k tokens before failing. Warnings are for people watching. A bad environment must stop the run.` };
      if (R.halted) return { ok: true, msg: '<b>The dependency probe failed, the gate shut, and the agent never started.</b> One red lamp, one place to look, nothing burned. It costs far less to catch this before the first turn.' };
      return { ok: true, msg: `<b>${R.per}k tokens per session: read one report and go.</b> The script made the same seven checks the same way, and the agent spends its turns on real work.${st.stale ? ' The fingerprint showed the old report was out of date, so the probes ran again.' : ''}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The same start, every time', home: true, say: 'A fleet firm in Windhoek opens a session. The agent guesses the Python version and hunts for the test command. Next session, it does it all again.', act: m => m.set({ init: false, broken: false, stale: false, check: true, loud: true, n: 6 }) },
    { t: 'One script', home: true, say: 'Run one script first. It probes seven things the same way every time, and writes a report the agent reads.', act: m => m.set({ init: true, broken: false, stale: false, check: true, loud: true, n: 6 }) },
    { t: 'Catch it at the door', home: true, say: 'A package has gone missing. The probe goes red and the gate shuts, so the agent never burns a token on a broken room.', act: m => m.set({ init: true, broken: true, stale: false, check: true, loud: true, n: 6 }) },
    { t: 'Fail loud', home: true, say: 'A warning isn\'t enough. The agent reads past it and finds out much later, at a far higher price.', act: m => m.set({ init: true, broken: true, stale: false, check: true, loud: false, n: 6 }) },
    { t: 'Old reports lie', home: true, say: 'A report left over from an old run shows green lamps for a world that has changed.', act: m => m.set({ init: true, broken: true, stale: true, check: false, loud: true, n: 6 }) },
    { t: 'A fingerprint', home: true, say: 'So the report carries a fingerprint of the repo. If it doesn\'t match, the probes run again.', act: m => m.set({ init: true, broken: true, stale: true, check: true, loud: true, n: 6 }) },
  ],
  check: [
    { q: 'What belongs in an init script?', options: ['Work that is the same every session', 'The user\'s task', 'The model weights'], answer: 0, why: 'Don\'t pay a model to rediscover constants.', hint: 'Try No init script.' },
    { q: 'What should a failed probe do?', options: ['Stop the run, in one clear place', 'Log a warning and go on', 'Ask the model to guess'], answer: 0, why: 'Failing early is far cheaper than failing deep in a task.', hint: 'Try Warn and carry on.' },
    { q: 'How do you keep a saved report from lying?', options: ['Compare a fingerprint of the repo', 'Delete it weekly', 'Make it longer'], answer: 0, why: 'A commit and a lockfile hash show when it is out of date.', hint: 'Try Trust an old report.' },
  ],
  terms: [
    ['Init script', 'A script that runs before the agent.'],
    ['Probe', 'One quick check of the environment.'],
    ['Init report', 'The saved result of the probes.'],
    ['Fail loud', 'Stop clearly rather than warn and go on.'],
    ['Fingerprint', 'A hash that changes when the repo changes.'],
    ['Last known good', 'The most recent commit that passed.'],
  ],
  deeper: '<p><b>The seven probes.</b> Runtime versions, dependencies, the test command, repo paths, environment variables, state and board freshness, and the last good commit.</p><p><b>Check keys without printing them.</b> An environment probe should report whether a key is set, never its value.</p><p><b>Keep it quick.</b> If init takes a minute, people skip it. Run the slow checks only when the fingerprint has changed.</p>',
  code: {
    title: 'Probe, report, halt',
    note: 'Adapted from the course\'s init script (code/main.py).',
    text: `
PROBES = {"runtime": check_python, "deps": check_lockfile, "tests": check_test_cmd,
          "paths": resolve_paths, "env": check_env_vars,
          "state": check_state_age, "commit": last_green_commit}

def init(repo):
    report = {name: probe(repo) for name, probe in PROBES.items()}
    report["fingerprint"] = hash_of(repo / "uv.lock", git_head(repo))
    json.dump(report, open(repo / "init_report.json", "w"), indent=2)

    failed = [n for n, r in report.items() if r is False]
    if failed:
        sys.exit(f"init failed: {failed}. See init_report.json")
`,
  },
};
