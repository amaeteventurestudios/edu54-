// Build your own continuous integration system: an invented team building a farm-market app pushes six commits. A repository observer polls
// for new commits and hands them to a dispatcher, which sends each to a free test runner; runners report results and send heartbeats. One
// runner crashes in the middle of a test; commit 4 breaks a test that leftover files from the previous run would hide. The timeline below is
// simulated from these rules.
const COMMITS = [{ id: 'c1', t: 2 }, { id: 'c2', t: 9 }, { id: 'c3', t: 11 }, { id: 'c4', t: 24 }, { id: 'c5', t: 31 }, { id: 'c6', t: 33 }];
const RUN = 8, CRASH_AT = 14, END = 70;
function simulate(o) {
  const seen = new Set(), queue = [], results = {}, lostTo = {};
  const runners = [{ name: 'runner A', busy: null, until: 0, dead: false }, { name: 'runner B', busy: null, until: 0, dead: false }];
  const log = [];
  for (let t = 0; t <= END; t++) {
    if (t > 0 && t % o.poll === 0) {
      const landed = COMMITS.filter(c => c.t <= t && !seen.has(c.id));
      const take = o.queueAll ? landed : landed.slice(-1);
      landed.forEach(c => seen.add(c.id));
      take.forEach(c => { queue.push(c.id); log.push({ t, e: `observer finds ${c.id}` }); });
      if (!o.queueAll && landed.length > 1) log.push({ t, e: `observer skips ${landed.slice(0, -1).map(c => c.id).join(', ')}` });
    }
    if (t === CRASH_AT) { const b = runners[1]; if (b.busy) { lostTo[b.busy] = true; log.push({ t, e: `runner B crashes while testing ${b.busy}` }); } b.dead = true; if (o.heartbeat) b.busy = null; }
    runners.forEach(r => {
      if (r.busy && !r.dead && t >= r.until) {
        const pass = r.busy !== 'c4' || !o.clean ? true : false;
        results[r.busy] = pass ? 'pass' : 'fail'; log.push({ t, e: `${r.name}: ${r.busy} ${pass ? 'passes' : 'fails'}` }); r.busy = null;
      }
    });
    if (o.heartbeat) Object.keys(lostTo).forEach(id => { if (lostTo[id] && t >= CRASH_AT + 3) { queue.unshift(id); lostTo[id] = false; log.push({ t, e: `no heartbeat from runner B: ${id} reassigned` }); } });
    runners.forEach(r => { if (!r.busy && !r.dead && queue.length) { r.busy = queue.shift(); r.until = t + RUN; log.push({ t, e: `${r.name} starts ${r.busy}` }); } });
  }
  const tested = COMMITS.filter(c => results[c.id]).length;
  const skipped = COMMITS.filter(c => !results[c.id]).map(c => c.id);
  const falsePass = results.c4 === 'pass';
  return { results, tested, skipped, falsePass, log };
}

export default {
  slug: 'build-a-ci-system',
  title: 'Build your own CI system',
  description: 'A farm-market app\'s team pushes six commits, and a small CI system must test every one, even when a runner dies mid-test.',
  overview: 'Continuous integration means every change pushed to a shared repository is built and tested automatically, so a broken commit is caught within minutes and its author knows exactly which change did it. The system in 500 Lines or Less splits the job into small processes that talk over sockets, which shows the moving parts behind services such as GitHub Actions or Jenkins. A repository observer checks the repository every few seconds for new commits; it must record every commit it has not seen, not just the newest one, or two commits that land between checks become one and the earlier one is never tested. It sends each commit to a dispatcher, which keeps a queue and a list of registered test runners and hands each commit to a free runner. A test runner checks out the exact commit into a clean working copy, runs the test suite and reports the result back. A clean checkout matters: files left over from an earlier run, such as a stale compiled module, can make a broken commit pass. Machines and processes fail, so the dispatcher must also notice when a runner dies: runners send regular heartbeats, and a runner that misses them is removed and the commit it was testing goes back on the queue for another runner. Without that, the commit simply disappears, and the dispatcher may keep sending work to a runner that is no longer there. Results are stored per commit and shown to the team. This machine replays an afternoon for an invented team building a farm-market app in Mbale, with two runners.',
  keywords: ['build your own CI', 'continuous integration', 'test runner', 'dispatcher', 'heartbeat', 'clean checkout', '500 lines or less'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.5, 0.3, -0.05], dir: [0.05, 0.8, 1.2], half: 0.95, wide: 4.8 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/a-continuous-integration-system.html" target="_blank" rel="noopener">A Continuous Integration System</a> by Malini Das, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short dispatcher, written for this lesson after the 500 Lines CI chapter (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { poll: 5, queueAll: true, heartbeat: true, clean: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the repository: six commits in a row; c4 carries a broken test (the red bead)
    const repo = P.box(3.0, 0.05, 0.5, '#3A3D4A', { r: 0.04 }); repo.position.set(-1.15, 0, -0.8); S.add(repo);
    const CX = i => -2.4 + i * 0.5;
    const crates = COMMITS.map((c, i) => { const m = own('#fff'), b = P.box(0.36, 0.3, 0.34, '#fff', { r: 0.05, material: m }); b.position.set(CX(i), 0.05, -0.8); S.add(b); return m; });
    const bug = P.ball(0.07, '#B5462F'); bug.position.set(CX(3), 0.42, -0.8); S.add(bug);
    // the observer polls the repository on a dial; the dispatcher hands commits to runners
    const obs = P.robot('#4A6FA5', { scale: 0.8 }); obs.position.set(-2.25, 0, 0.2); S.add(obs);
    const dial = P.dial(0.22); dial.position.set(-1.7, 0, 0.45); S.add(dial);
    const disp = P.robot('#4A6FA5', { scale: 0.8 }); disp.position.set(-0.75, 0, 0.2); S.add(disp);
    const feed = P.pipe([V(-2.0, 0.35, 0.2), V(-1.4, 0.45, 0.2), V(-1.0, 0.35, 0.2)], SAF, { r: 0.03, n: 4 }); S.add(feed);
    // two runners; B crashes in the middle of a test
    const rA = P.robot('#2E8C5A', { scale: 0.85 }); rA.position.set(0.55, 0, -0.25); S.add(rA);
    const rB = P.robot(OFF, { scale: 0.85, lamp: BAD }); rB.position.set(0.55, 0.18, 0.55); rB.rotation.z = -1.3; S.add(rB);
    const toA = P.pipe([V(-0.5, 0.4, 0.15), V(0.0, 0.5, -0.1), V(0.35, 0.35, -0.25)], SAF, { r: 0.03, n: 4 }); S.add(toA);
    const beat = P.pipe([V(0.3, 0.2, 0.55), V(-0.1, 0.35, 0.45), V(-0.55, 0.3, 0.3)], GOOD, { r: 0.025, n: 3 }); S.add(beat);
    const lost = P.box(0.3, 0.26, 0.3, BAD, { r: 0.05 }); lost.position.set(1.05, 0, 0.75); S.add(lost);
    // runner A's checkout: clean, or holding leftover files from the last run
    const tray = P.box(0.6, 0.05, 0.55, '#3A3D4A', { r: 0.04 }); tray.position.set(1.35, 0, -0.25); S.add(tray);
    const junk = P.stack(0.18, 0.18, 0.15, { max: 3 }); junk.position.set(1.35, 0.05, -0.25); S.add(junk);
    S.add(P.keep(-2.65, 1.7, 0.9, -1.1, 0.95));
    let R = null;
    function draw() {
      R = simulate(st);
      COMMITS.forEach((c, i) => {
        const r = R.results[c.id], wrong = !r || (c.id === 'c4' && r === 'pass');
        crates[i].color.set(wrong ? BAD : r === 'fail' ? SAF : GOOD);
      });
      dial.userData.set({ v: st.poll / 15 });
      obs.userData.set({ lamp: R.skipped.length && !st.queueAll ? BAD : GOOD });
      beat.visible = st.heartbeat; lost.visible = !st.heartbeat;
      disp.userData.set({ lamp: st.heartbeat ? GOOD : BAD, busy: true });
      rA.userData.set({ busy: true, lamp: R.falsePass ? BAD : GOOD });
      junk.userData.set({ n: st.clean ? 0 : 3, colors: Array(3).fill('#8E91A3') });
    }
    const tick = dt => [obs, disp, rA, rB, feed, toA, beat, dial].forEach(o => o.userData.tick(dt));
    function isOk() { return R.tested === 6 && !R.falsePass && R.results.c4 === 'fail'; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Observer polls every (s)', min: 1, max: 15, step: 1, get: () => st.poll, set: v => set({ poll: +v }), fmt: v => `${v} s` },
      { type: 'toggle', label: 'Queue every new commit', short: 'Every commit', get: () => st.queueAll, set: v => set({ queueAll: !!v }) },
      { type: 'toggle', label: 'Heartbeats: reassign a dead runner\'s work', short: 'Heartbeats', get: () => st.heartbeat, set: v => set({ heartbeat: !!v }) },
      { type: 'toggle', label: 'Clean checkout for every run', short: 'Clean', get: () => st.clean, set: v => set({ clean: !!v }) },
    ];
    const readouts = [
      { label: 'Tested', get: () => ({ v: `${R.tested} of 6`, sub: 'commits', good: R.tested === 6, bad: R.tested < 6 }) },
      { label: 'Broken commit', get: () => ({ v: R.results.c4 === 'fail' ? 'caught' : R.results.c4 ? 'missed' : 'untested', sub: 'c4', good: R.results.c4 === 'fail', bad: R.results.c4 !== 'fail' }) },
      { label: 'Runners', get: () => ({ v: '1 of 2 alive', sub: 'B crashed at t=14', good: st.heartbeat, bad: !st.heartbeat }) },
    ];
    const labels = [
      { name: 'c', t: 'Six commits', d: 'Teal: passed. Gold: break caught. Coral: missed', icon: 'check', atV: V(CX(0) - 0.18, 0.2, -0.8) },
      { name: 'r', t: 'Two test runners', d: 'B has crashed. Teal pipe: heartbeats watched', icon: 'user', atV: V(0.8, 0.3, -0.25) },
      { name: 'k', t: 'Runner A\'s checkout', d: 'Grey cubes: leftover files', icon: 'box', atV: V(1.65, 0.03, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Look only at the newest commit', hint: 'c2 slips past', on: () => set({ ...D0, queueAll: false }), off: reset },
      { label: 'Ignore runner heartbeats', hint: 'work lost on a crash', on: () => set({ ...D0, heartbeat: false }), off: reset },
      { label: 'Reuse a dirty checkout', hint: 'leftovers hide a failure', on: () => set({ ...D0, clean: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.queueAll && r.skipped.length) return { ok: false, msg: `<b>${r.skipped.length > 1 ? 'Commits' : 'Commit'} ${r.skipped.join(' and ')} landed between two polls, and the observer passed on only the newest, so ${r.skipped.length > 1 ? 'they were' : 'it was'} never tested.</b> Record every commit not yet seen and queue each one.` };
      if (!st.heartbeat && r.skipped.length) return { ok: false, msg: `<b>Runner B crashed while testing, and with no heartbeats the dispatcher never noticed, so it still thinks B is busy with ${r.skipped.join(' and ')}, which ${r.skipped.length > 1 ? 'were' : 'was'} never tested.</b> Drop runners that miss heartbeats and put their commit back on the queue.` };
      if (r.falsePass) return { ok: false, msg: '<b>c4 breaks a test, but the runner reused its last working copy, and a compiled file left over from c3 made the test pass: a broken commit got a green tick.</b> Check out every commit into a clean working copy.' };
      if (r.tested < 6) return { ok: false, msg: `<b>${r.skipped.join(' and ')} ${r.skipped.length > 1 ? 'were' : 'was'} never tested.</b> Check the queue and the runners.` };
      return { ok: true, msg: `<b>All six commits were tested: runner B\'s crash was noticed by its missing heartbeats and its commit reassigned to runner A, and c4\'s broken test was caught in a clean checkout.</b> The team knows exactly which change broke the build.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Every commit, tested', home: true, say: 'A team pushes six commits. A small CI system must test every one.', act: m => m.set({ poll: 5, queueAll: true, heartbeat: true, clean: true }) },
    { t: 'The observer', home: true, say: 'An observer checks the repository every few seconds. Two commits can land between checks.', act: m => m.set({ poll: 5, queueAll: false, heartbeat: true, clean: true }) },
    { t: 'Queue them all', home: true, say: 'Record every new commit, not only the newest, and queue each one.', act: m => m.set({ poll: 5, queueAll: true, heartbeat: true, clean: true }) },
    { t: 'A runner dies', home: true, say: 'Runner B crashes mid-test. Without heartbeats, its commit vanishes.', act: m => m.set({ poll: 5, queueAll: true, heartbeat: false, clean: true }) },
    { t: 'Clean checkouts', home: true, say: 'Reuse an old working copy, and a leftover file hides c4\'s broken test.', act: m => m.set({ poll: 5, queueAll: true, heartbeat: true, clean: false }) },
    { t: 'Green means green', home: true, say: 'Every commit queued, dead runners replaced, clean checkouts. c4 is caught.', act: m => m.set({ poll: 5, queueAll: true, heartbeat: true, clean: true }) },
  ],
  check: [
    { q: 'Why must the observer queue every new commit?', options: ['Two commits can land between polls', 'To save time', 'It does not matter'], answer: 0, why: 'Or the earlier one is never tested.', hint: 'Try Look only at the newest commit.' },
    { q: 'What do heartbeats let the dispatcher do?', options: ['Notice dead runners and reassign their work', 'Run tests faster', 'Pick commits'], answer: 0, why: 'Crashed work goes back on the queue.', hint: 'Try Ignore runner heartbeats.' },
    { q: 'Why check out each commit into a clean copy?', options: ['Leftover files can hide failures', 'It is faster', 'Git requires it'], answer: 0, why: 'A false pass is worse than none.', hint: 'Try Reuse a dirty checkout.' },
  ],
  terms: [
    ['Continuous integration', 'Testing every pushed change automatically.'],
    ['Observer', 'Watches the repository for new commits.'],
    ['Dispatcher', 'Queues commits and assigns them to runners.'],
    ['Test runner', 'Checks out a commit and runs the tests.'],
    ['Heartbeat', 'A regular "I am alive" message.'],
    ['Clean checkout', 'A fresh working copy with no leftovers.'],
  ],
  deeper: '<p><b>Webhooks.</b> Instead of polling, repositories can call the CI system when a push happens, so nothing waits for the next check.</p><p><b>Flaky tests.</b> Tests that fail at random erode trust in a red build; good CI systems track and quarantine them.</p><p><b>About this machine.</b> The team, commits and timings are invented; the timeline follows the rules above.</p>',
  code: {
    title: 'A dispatcher that survives runner crashes',
    note: 'Our own short version, after the 500 Lines CI chapter.',
    text: `
import time

queue, runners, assigned = [], {}, {}        # runner -> last heartbeat; runner -> commit
TIMEOUT = 3

def on_commits(new_commits):
    queue.extend(new_commits)                # every unseen commit, in order

def on_heartbeat(runner):
    runners[runner] = time.time()

def tick():
    now = time.time()
    for r, seen in list(runners.items()):
        if now - seen > TIMEOUT:             # missed heartbeats: drop it
            del runners[r]
            if r in assigned:
                queue.insert(0, assigned.pop(r))     # put its commit back
    for r in runners:
        if r not in assigned and queue:
            assigned[r] = queue.pop(0)
            send(r, "test", assigned[r])     # runner checks out a clean copy

def on_result(runner, commit, ok):
    assigned.pop(runner, None)
    store(commit, ok)
`,
  },
};
