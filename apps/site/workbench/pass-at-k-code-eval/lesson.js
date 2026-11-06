// pass@k for code generation (phase 19, lesson 72): a model writes n samples for each of twelve coding tasks, each run against the task's
// tests in its own process with a wall-clock timeout. pass@k is estimated with the unbiased estimator 1 - C(n-c, k) / C(n, k) from Chen and
// colleagues (2021), compared with the tempting plug-in 1 - (1 - c/n)^k. One sample loops forever and one calls exit, so a harness without a
// timeout or without process isolation stops early. Each sample's result comes from a fixed pseudo-random table; every number is computed live.
const TASKS = 12, NMAX = 10;
const RATE = [0.9, 0.7, 0.5, 0.3, 0.8, 0.12, 0.6, 0.4, 0.2, 0.95, 0.06, 0.5];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const HANG = [6, 2], CRASH = [3, 1];
function comb(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }
const unbiased = (n, c, k) => n - c < k ? 1 : 1 - comb(n - c, k) / comb(n, k);
const plugin = (n, c, k) => 1 - Math.pow(1 - c / n, k);
function evaluate(o) {
  const grid = [];
  let stopped = null;
  for (let t = 0; t < TASKS; t++) {
    const col = [];
    for (let j = 0; j < o.n; j++) {
      if (stopped) { col.push('none'); continue; }
      if (t === HANG[0] && j === HANG[1]) { if (!o.timeout) { stopped = 'hang'; col.push('hang'); continue; } col.push('timeout'); continue; }
      if (t === CRASH[0] && j === CRASH[1]) { if (!o.isolate) { stopped = 'crash'; col.push('crash'); continue; } col.push('error'); continue; }
      col.push(rnd(t * 31 + j + 1) < RATE[t] ? 'pass' : 'fail');
    }
    grid.push(col);
  }
  const done = grid.filter(col => col.every(x => x !== 'none' && x !== 'hang' && x !== 'crash'));
  const per = grid.map(col => { const c = col.filter(x => x === 'pass').length; return { c, u: unbiased(o.n, c, o.k), p: plugin(o.n, c, o.k), p1: c / o.n }; });
  const avg = f => done.length ? grid.map((col, i) => done.includes(col) ? f(per[i]) : 0).reduce((a, b) => a + b, 0) / done.length : 0;
  return { grid, per, stopped, done: done.length, passK: avg(x => o.unbiased ? x.u : x.p), passU: avg(x => x.u), passP: avg(x => x.p), pass1: avg(x => x.p1) };
}

export default {
  slug: 'pass-at-k-code-eval',
  title: 'pass@k: scoring code by running it',
  description: 'A model writes several samples for each of twelve coding tasks, and each one runs in a sandbox. Count the passes honestly, and survive the hang and the crash.',
  overview: 'Generated code is right when it passes the tests, so code benchmarks such as HumanEval, MBPP and LiveCodeBench score a model by running what it writes. The harness extracts the code from each generation, wraps it with the task\'s assertions and runs it. That must happen in a separate process with a wall-clock timeout: a generated infinite loop would otherwise block the evaluation for ever, and a call that exits the interpreter or deletes files would take the harness down with it. Output caps stop a runaway print from exhausting memory, and a denylist of dangerous imports is a backstop, not a sandbox; production setups add containers, network isolation and read-only file systems. Each run ends in one of a few outcomes, such as pass, failed assertion, syntax error, timeout or other error, and the harness records them all rather than crashing. The headline metric is pass@k: the probability that at least one of k samples passes. Codex\'s authors (Chen and colleagues, 2021) showed how to estimate it without bias: draw n samples per task, with n larger than k, count the c that pass, and compute 1 minus C(n minus c, k) over C(n, k), the chance that k samples picked from the n are all failures, subtracted from one. The tempting shortcut, 1 minus (1 minus c over n) to the power k, treats the samples as if drawn with replacement, and on average it understates pass@k, most when n is small. Drawing only k samples makes the estimate noisy. pass@1 with n samples is simply c over n. This machine scores an invented model on twelve tasks from a programming course in Lagos; each square is one sample.',
  keywords: ['pass@k', 'code generation evaluation', 'HumanEval', 'unbiased estimator', 'sandboxed execution', 'timeout', 'LLM benchmarks'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.2, -0.2], dir: [0.05, 1.05, 1.05], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { n: 10, k: 3, unbiased: true, isolate: true, timeout: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const COL = { pass: GOOD, fail: BAD, timeout: SAF, error: '#8E6BA8', hang: '#151827', crash: '#151827', none: '#E4E1DA' };
    /* twelve tasks by ten samples as blocks; a tower in front of each column for its pass@k */
    const TX = t => -1.9 + t * 0.31;
    const cells = Array.from({ length: TASKS }, (_, t) => {
      const sq = Array.from({ length: NMAX }, (_, j) => { const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.26, 0.1, 0.13, '#fff', { r: 0.02, material: m }); b.position.set(TX(t), 0, -1.05 + j * 0.15); S.add(b); return { m, b }; });
      const bar = P.tower(0.24, 0.2, GOOD, { h: 0.2 }); bar.userData.set({ cap: '' }); bar.position.set(TX(t), 0, 0.4); S.add(bar);
      return { sq, bar };
    });
    /* the overall estimate, and the sandbox that keeps a crash from taking the run down */
    const est = P.tower(0.4, 0.4, GOOD, { h: 0.5 }); est.userData.set({ cap: '' }); est.position.set(1.95, 0, -0.5); S.add(est);
    const box = P.lamp(GOOD, { h: 0.16, r: 0.09 }), clock = P.lamp(GOOD, { h: 0.16, r: 0.09 }); box.position.set(1.8, 0, 0.3); clock.position.set(2.15, 0, 0.3); S.add(box, clock);
    S.add(P.keep(-2.1, 2.35, 0.85, -1.2, 0.6));
    const parts = [est, ...cells.map(c => c.bar)];
    let R = null;
    function draw() {
      R = evaluate(st);
      cells.forEach((c, t) => {
        c.sq.forEach((s, j) => { const on = j < st.n; s.b.visible = on; if (on) s.m.color.set(COL[R.grid[t][j]]); });
        const ok = R.grid[t].every(x => x !== 'none' && x !== 'hang' && x !== 'crash');
        const v = ok ? (st.unbiased ? R.per[t].u : R.per[t].p) : 0;
        c.bar.userData.set({ h: Math.max(0.01, v * 0.5), color: ok ? GOOD : '#C9C4B8' });
      });
      const ok = isOk();
      est.userData.set({ h: Math.max(0.02, R.passK * 0.85), color: ok ? GOOD : SAF });
      box.userData.set({ color: st.isolate ? GOOD : BAD, on: true }); clock.userData.set({ color: st.timeout ? GOOD : BAD, on: true });
    }
    function isOk() { return st.unbiased && st.isolate && st.timeout && st.n >= 2 * st.k; }
    draw();
    const set = p => { Object.assign(st, p); if (st.k > st.n) st.k = st.n; draw(); };
    const controls = [
      { type: 'slider', label: 'Samples per task (n)', min: 1, max: NMAX, step: 1, get: () => st.n, set: v => set({ n: +v }), fmt: v => `${v}` },
      { type: 'slider', label: 'k', min: 1, max: 5, step: 1, get: () => st.k, set: v => set({ k: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Use the unbiased estimator', short: 'Unbiased', get: () => st.unbiased, set: v => set({ unbiased: !!v }) },
      { type: 'toggle', label: 'Run each sample in its own process', short: 'Isolate', get: () => st.isolate, set: v => set({ isolate: !!v }) },
      { type: 'toggle', label: 'Kill samples after a timeout', short: 'Timeout', get: () => st.timeout, set: v => set({ timeout: !!v }) },
    ];
    const readouts = [
      { label: 'pass@k', get: () => ({ v: `${Math.round(R.passK * 100)}%`, sub: st.unbiased ? 'unbiased' : 'plug-in', good: isOk(), bad: !isOk() }) },
      { label: 'pass@1', get: () => ({ v: `${Math.round(R.pass1 * 100)}%`, sub: 'c ÷ n', good: R.done === TASKS, bad: R.done < TASKS }) },
      { label: 'Tasks scored', get: () => ({ v: `${R.done} of ${TASKS}`, sub: R.stopped ? `harness ${R.stopped === 'hang' ? 'hung' : 'crashed'}` : 'harness survived', good: R.done === TASKS, bad: R.done < TASKS }) },
    ];
    const labels = [
      { name: 'g', t: 'Samples per task', d: 'Teal passes, coral fails', icon: 'box', atV: V(-2.08, 0.08, -0.4) },
      { name: 't', t: 'The estimate', d: 'pass@k from n samples', icon: 'target', atV: V(2.15, 0.3, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Use the plug-in formula', hint: 'understates pass@k', on: () => set({ ...D0, unbiased: false, n: 4 }), off: reset },
      { label: 'Draw only k samples', hint: 'noisy', on: () => set({ ...D0, n: 3, k: 3 }), off: reset },
      { label: 'Run samples inside the harness', hint: 'one exits', on: () => set({ ...D0, isolate: false }), off: reset },
      { label: 'Drop the timeout', hint: 'one loops forever', on: () => set({ ...D0, timeout: false }), off: reset },
    ];
    function status() {
      const r = R, pk = `${Math.round(r.passK * 100)}%`;
      if (r.stopped === 'crash') return { ok: false, msg: `<b>Running samples inside the harness, a sample for task 4 called exit and took the whole evaluation down: only ${r.done} of ${TASKS} tasks scored.</b> Run every sample in its own process, so a crash is just an error result.` };
      if (r.stopped === 'hang') return { ok: false, msg: `<b>Without a timeout, a sample for task 7 loops forever and the evaluation never finishes: only ${r.done} of ${TASKS} tasks scored.</b> Kill each sample after a wall-clock limit and record a timeout.` };
      if (!st.unbiased && Math.abs(r.passU - r.passP) < 0.005) return { ok: false, msg: `<b>At k ${st.k} the plug-in formula and the unbiased one agree, ${pk}, so the mistake hides.</b> Raise k and the plug-in falls below the truth. Use 1 − C(n−c, k) / C(n, k) everywhere.` };
      if (!st.unbiased) return { ok: false, msg: `<b>The plug-in formula gives pass@${st.k} of ${pk}, but the unbiased estimate is ${Math.round(r.passU * 100)}%.</b> Treating ${st.n} samples as if drawn with replacement understates pass@k, and the error is largest with few samples. Use 1 − C(n−c, k) / C(n, k).` };
      if (st.n < 2 * st.k) return { ok: false, msg: `<b>With n ${st.n} and k ${st.k}, pass@${st.k} is ${pk}, but each task's estimate rests on almost no spare samples, so it swings from run to run.</b> Draw n well above k, such as 10 or more for pass@3, and the estimate settles.` };
      return { ok: true, msg: `<b>All ${TASKS} tasks scored with ${st.n} samples each: pass@1 ${Math.round(r.pass1 * 100)}%, pass@${st.k} ${pk} by the unbiased estimator.</b> The looping sample timed out and the exiting one was an error in its own process; neither stopped the run.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Run the code', home: true, say: 'A model writes ten samples for each of twelve coding tasks. Each sample runs against the task\'s tests.', act: m => m.set({ n: 10, k: 3, unbiased: true, isolate: true, timeout: true }) },
    { t: 'Its own process', home: true, say: 'One sample loops forever, another exits. In their own processes, with a timeout, they just become results.', act: m => m.set({ n: 10, k: 3, unbiased: true, isolate: true, timeout: true }) },
    { t: 'No timeout', home: true, say: 'Without a timeout, the looping sample stalls everything after it.', act: m => m.set({ n: 10, k: 3, unbiased: true, isolate: true, timeout: false }) },
    { t: 'pass at k', home: true, say: 'pass at k is the chance that at least one of k tries works. Estimate it from n samples per task.', act: m => m.set({ n: 10, k: 3, unbiased: true, isolate: true, timeout: true }) },
    { t: 'The plug-in trap', home: true, say: 'The tempting formula treats samples as drawn with replacement, and understates the score.', act: m => m.set({ n: 4, k: 3, unbiased: false, isolate: true, timeout: true }) },
    { t: 'Unbiased, many samples', home: true, say: 'Use the unbiased formula with n well above k, and the estimate is honest and steady.', act: m => m.set({ n: 10, k: 3, unbiased: true, isolate: true, timeout: true }) },
  ],
  check: [
    { q: 'What does pass@k measure?', options: ['The chance at least one of k samples passes the tests', 'The share of tests passed', 'Speed'], answer: 0, why: 'Any one of k tries.', hint: 'Watch the bars.' },
    { q: 'Why run each sample in its own process with a timeout?', options: ['So hangs and crashes become results, not a stopped harness', 'To run faster', 'To save memory only'], answer: 0, why: 'The evaluation must survive bad code.', hint: 'Try Drop the timeout.' },
    { q: 'What is wrong with 1 − (1 − c/n)^k?', options: ['It is biased low, most when n is small', 'It is too slow', 'Nothing'], answer: 0, why: 'Use 1 − C(n−c, k)/C(n, k).', hint: 'Try Use the plug-in formula.' },
  ],
  terms: [
    ['pass@k', 'The chance that at least one of k samples passes the tests.'],
    ['Unbiased estimator', 'An estimate that is right on average: 1 − C(n−c, k)/C(n, k).'],
    ['n and c', 'Samples drawn per task, and how many of them passed.'],
    ['Timeout', 'A wall-clock limit after which a sample is killed.'],
    ['Process isolation', 'Running each sample apart from the harness.'],
    ['Assertion', 'A test line that must hold for the code to pass.'],
  ],
  deeper: '<p><b>Contamination.</b> Public code benchmarks leak into training data; newer suites such as LiveCodeBench use problems published after a model\'s cutoff.</p><p><b>Beyond pass/fail.</b> Partial credit per assertion, and outcome codes such as timeout or syntax error, help diagnose why a model fails.</p><p><b>About this machine.</b> The tasks and pass rates are invented for illustration.</p>',
  code: {
    title: 'The unbiased pass@k estimator',
    note: 'Adapted from Chen and colleagues (2021).',
    text: `
import numpy as np, subprocess, sys

def pass_at_k(n, c, k):
    if n - c < k:
        return 1.0
    return 1.0 - np.prod(1.0 - k / np.arange(n - c + 1, n + 1))   # 1 - C(n-c,k)/C(n,k), stable

def run_sample(code, tests, timeout_s=3.0):
    try:
        out = subprocess.run([sys.executable, "-I", "-c", code + "\\n" + tests],
                             capture_output=True, timeout=timeout_s, text=True)
    except subprocess.TimeoutExpired:
        return "timeout"
    return "pass" if out.returncode == 0 else "fail"
`,
  },
};
