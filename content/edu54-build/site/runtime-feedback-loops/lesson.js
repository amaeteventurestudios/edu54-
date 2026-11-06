// Runtime feedback loops: the fees-app agent runs the test suite through run_with_feedback, which captures the exact command, the tails of stdout and
// stderr, the exit code and the duration into a feedback record the next turn reads. The suite prints 4,200 lines; the one failure is at the end.
// Truncation keeps the head and tail with a "...truncated N lines..." marker (deterministic), or keeps only the first lines (the failure is lost).
// If the runner dies before the exit code is captured, the record says exit_code: null and the loop must refuse to claim success.
const LOG = (() => { const L = []; for (let i = 1; i <= 4200; i++) L.push(i < 4196 ? `tests/test_${['export', 'fees', 'auth', 'receipts'][i % 4]}.py::case_${i} PASSED` : ''); L[4195] = 'FAILED tests/test_export.py::test_comma_in_name'; L[4196] = "AssertionError: 'Okello, Grace' split into 2 columns"; L[4197] = '=== 1 failed, 4194 passed in 38.2s ==='; L.length = 4198; return L; })();
function truncate(lines, mode, n = 6) {
  if (lines.length <= 2 * n) return lines.slice();
  if (mode === 'headtail') return [...lines.slice(0, n), `...truncated ${lines.length - 2 * n} lines...`, ...lines.slice(-n)];
  return lines.slice(0, 2 * n).concat(['(rest not shown)']);
}
function turn(o) {
  const exit = o.crash ? null : 1, out = truncate(LOG, o.mode), sawFailure = out.some(l => /FAILED/.test(l));
  let belief, claim;
  if (!o.capture) { belief = 'the agent assumes the tests passed (it never saw the output)'; claim = 'done'; }
  else if (exit === null) { belief = o.refuseNull ? 'exit code missing: re-run before doing anything else' : 'no error seen, so it counts the run as a pass'; claim = o.refuseNull ? 'blocked' : 'done'; }
  else if (!sawFailure) { belief = 'the visible lines are all PASSED; exit code 1 is unexplained'; claim = o.useExit ? 'investigate' : 'done'; }
  else { belief = 'test_comma_in_name failed: names with commas split into two columns'; claim = 'fix'; }
  const right = (claim === 'fix') || (exit === null && claim === 'blocked') || (claim === 'investigate');
  return { exit, out, sawFailure, belief, claim, right, chars: out.join('\n').length, full: LOG.join('\n').length };
}

export default {
  slug: 'runtime-feedback-loops',
  title: 'Runtime feedback: react to what actually happened',
  description: 'The fees-app agent runs its tests and reads back a feedback record: the exact command, the last lines of output and errors, the exit code and how long it took.',
  overview: 'An agent that doesn\'t see real command output guesses, and it tends to guess that things worked. A feedback runner wraps every command and writes a structured record the next turn reads: the exact arguments (no shell surprises), the last lines of standard output and of standard error kept separately, the exit code, the duration, a start time for replay, and a one-line note of what the agent expected. The exit code is the unambiguous signal; the text is for understanding. Long output must be cut, and cut deterministically: keep the head and the tail with a "truncated N lines" marker, so the same output always gives the same record, and the part the agent needs (the final error, the summary line) survives at the end. Keeping only the first lines of a long test run shows thousands of passes and hides the one failure. If the runner fails before it captures an exit code, the record says the exit code is null with the reason, and the loop must refuse to claim success: no exit, no progress. Feedback is for the next turn of this run; telemetry is for people reviewing many runs over time. They share fields but live in different files with different retention.',
  keywords: ['agent feedback', 'exit codes', 'log truncation', 'coding agents', 'AI agents', 'tool output', 'reliability'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { capture: true, mode: 'headtail', crash: false, refuseNull: true, useExit: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the full log as a tall strip */
    const LX = -2.75, strip = P.box(0.32, 0.05, 2.6, '#fff', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#D9F0E9' }) }); strip.position.set(LX, 0.12, 0.15); floor.add(strip);
    const failMark = P.box(0.38, 0.1, 0.05, '#B5462F', { r: 0 }); failMark.position.set(LX, 0.13, 0.15 + 1.2); floor.add(failMark);
    const head = P.box(0.36, 0.09, 0.08, '#fff', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: '#F2AE0C' }) }); floor.add(head);
    const tail = P.box(0.36, 0.09, 0.08, '#fff', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: '#F2AE0C' }) }); floor.add(tail);

    /* the record */
    const RX0 = -0.65;
    const feed = P.pipe([V(-2.5, 0.25, 0.2), V(-0.8, 0.32, 0.2), V(1.8, 0.3, 0.2)], '#1F9E89', { r: 0.04, n: 6 }); feed.position.y = 0.12; floor.add(feed);
    const exitL = P.lamp('#1F9E89', { h: 0.2, r: 0.1 }), nullL = P.lamp('#1F9E89', { h: 0.2, r: 0.1 }); exitL.position.set(-1.0, 0.12, 0.65); nullL.position.set(-0.3, 0.12, 0.65); floor.add(exitL, nullL);


    /* the next turn */
    const NX = 2.3, model = P.robot('#3D6BD6', { scale: 0.8 }); model.position.set(NX, 0.12, 0.2); floor.add(model);


    const cM = new THREE.MeshLambertMaterial({ color: GOOD }), cb = P.box(1.4, 0.05, 0.45, '#fff', { r: 0.04, material: cM }); cb.position.set(NX, 0.14, 0.9); floor.add(cb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = turn(st);
      head.position.set(LX, 0.14, 0.15 - 1.3 + 0.04); tail.visible = st.mode === 'headtail' && st.capture; head.visible = st.capture; tail.position.set(LX, 0.14, 0.15 + 1.3 - 0.04);
      cM.color.set(R.right ? GOOD : RED);
      feed.userData.set({ on: !!st.capture, color: st.capture ? GOOD : RED });
      exitL.userData.set({ color: st.useExit ? GOOD : RED, on: true }); nullL.userData.set({ color: st.refuseNull ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Run commands through the feedback runner', short: 'Capture', get: () => st.capture, set: v => set({ capture: !!v }) },
      { type: 'buttons', label: 'Truncate long output', options: ['Head and tail', 'First lines only'], get: () => st.mode === 'headtail' ? 0 : 1, act: i => set({ mode: i ? 'head' : 'headtail' }) },
      { type: 'toggle', label: 'The runner is killed before the exit code', short: 'Runner dies', get: () => st.crash, set: v => set({ crash: !!v }), quick: false },
      { type: 'toggle', label: 'Refuse to advance on a null exit code', short: 'No exit, no progress', get: () => st.refuseNull, set: v => set({ refuseNull: !!v }) },
    ];
    const readouts = [
      { label: 'Exit code', get: () => ({ v: R.exit === null ? 'null' : String(R.exit), sub: st.capture ? 'captured' : 'never seen', bad: !st.capture }) },
      { label: 'Failure in view', get: () => ({ v: R.sawFailure && st.capture ? 'yes' : 'no', sub: `${R.chars.toLocaleString('en')} of ${R.full.toLocaleString('en')} chars`, good: R.sawFailure && st.capture, bad: !(R.sawFailure && st.capture) && !st.crash }) },
      { label: 'Next step', get: () => ({ v: R.claim, sub: 'what the agent does', good: R.right, bad: !R.right }) },
    ];
    const labels = [
      { name: 'log', t: 'The whole log', d: 'The failure is at the end', icon: 'book', atV: V(LX - 0.16, 0.1, -0.3) },
      { name: 'record', t: 'The feedback record', d: 'What the next turn reads', icon: 'book', atV: V(1.2, 0.45, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the agent guess the result', hint: 'no runner', on: () => set({ ...D0, capture: false }), off: reset },
      { label: 'Keep only the first lines', hint: 'the failure is cut off', on: () => set({ ...D0, mode: 'head' }), off: reset },
      { label: 'Count a missing exit code as a pass', hint: 'runner died', on: () => set({ ...D0, crash: true, refuseNull: false }), off: reset },
    ];
    function status() {
      if (!st.capture) return { ok: false, msg: '<b>With no runner, the agent predicts the tests passed and marks the task done; one failed.</b> An agent that doesn\'t see real output reacts to its own guess. Run every command through a runner that records the exit code and the tails of the output.' };
      if (st.mode === 'head' && !st.crash) return { ok: false, msg: '<b>Keeping only the first 12 lines shows twelve passes; the failure on line 4,196 is gone.</b> The exit code 1 still says something failed, so a careful loop investigates, but the agent has to go back for the reason. Keep head and tail with a "truncated N lines" marker; errors and summaries live at the end.' };
      if (st.crash && !st.refuseNull) return { ok: false, msg: '<b>The runner was killed before the exit code was captured; the record says null, and the agent read "no error" as a pass.</b> No exit, no progress: a null exit code means re-run, never done.' };
      if (st.crash) return { ok: true, msg: '<b>The runner died before the exit code; the record says null with the reason, and the loop refuses to advance until the command is re-run.</b>' };
      return { ok: true, msg: `<b>The record keeps the first and last 6 lines of 4,198 with a marker: the failure and the summary are in view, and the exit code is 1.</b> The next turn reads "names with commas split into two columns" and goes to fix it, instead of claiming done. The cut is deterministic, so the same run always gives the same record.` };
    }
    return { update: dt => { feed.userData.tick(dt); model.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Run the tests', home: true, say: 'The fees-app agent runs its tests. Four thousand lines of output scroll past, and one test fails at the very end.', act: m => m.set({ capture: false, mode: 'headtail', crash: false, refuseNull: true }) },
    { t: 'Guessing', home: true, say: 'Without reading the output, the agent assumes everything passed and declares the task done.', act: m => m.set({ capture: false }) },
    { t: 'A feedback record', home: true, say: 'A runner records the exact command, the exit code, the time taken and the tail of the output, for the next turn to read.', act: m => m.set({ capture: true }) },
    { t: 'Where to cut', home: true, say: 'Keep only the first lines, and all the agent sees is passes. The failure lives at the end.', act: m => m.set({ mode: 'head' }) },
    { t: 'Head and tail', home: true, say: 'Keep the head and the tail with a marker in between. The failure and the summary stay in view.', act: m => m.set({ mode: 'headtail' }) },
    { t: 'No exit, no progress', home: true, say: 'If the runner dies before it gets an exit code, the agent must re-run, never call it a pass.', act: m => m.set({ crash: true, refuseNull: true }) },
  ],
  check: [
    { q: 'What is the unambiguous success signal of a command?', options: ['Its exit code', 'The first line of output', 'The agent\'s expectation'], answer: 0, why: 'Text is for understanding; the exit code decides.', hint: 'Read the record.' },
    { q: 'How should a very long log be truncated?', options: ['Deterministically, keeping head and tail with a marker', 'Keep the first lines', 'Sample random lines'], answer: 0, why: 'Errors and summaries live at the end.', hint: 'Try Keep only the first lines.' },
    { q: 'The record says exit_code: null. What next?', options: ['Re-run; don\'t claim success', 'Mark it done', 'Skip the tests'], answer: 0, why: 'No exit, no progress.', hint: 'Try Count a missing exit code as a pass.' },
  ],
  terms: [
    ['Feedback runner', 'Wraps a command and records what really happened.'],
    ['Feedback record', 'Command, output tails, exit code, duration, expectation.'],
    ['Exit code', 'The number a command returns: zero for success.'],
    ['Deterministic truncation', 'The same output always cut the same way.'],
    ['Null exit', 'No exit code captured: the run must be repeated.'],
    ['Telemetry', 'Records for people reviewing many runs, kept separately.'],
  ],
  deeper: '<p><b>Separate streams.</b> Keep stdout and stderr tails apart; a warning on stderr and a summary on stdout mean different things.</p><p><b>The agent\'s note.</b> One line of what it expected makes a surprise visible: expected all tests to pass, exit code 1.</p><p><b>About this machine.</b> The log is a generated 4,198-line test run with one failure at the end; truncation, the record and the agent\'s next step are computed live.</p>',
  code: {
    title: 'Run a command and record it',
    note: 'Adapted from the course\'s runtime-feedback lesson.',
    text: `
import subprocess, time, json

def tail(text, n=6):
    lines = text.splitlines()
    if len(lines) <= 2 * n:
        return lines
    return lines[:n] + [f"...truncated {len(lines) - 2 * n} lines..."] + lines[-n:]

def run_with_feedback(argv, note, log="feedback_record.jsonl"):
    start = time.time()
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=600)
        rec = {"command": argv, "exit_code": p.returncode, "stdout_tail": tail(p.stdout),
               "stderr_tail": tail(p.stderr), "duration_ms": int((time.time() - start) * 1000)}
    except Exception as err:
        rec = {"command": argv, "exit_code": None, "error": str(err)}   # no exit, no progress
    rec["agent_note"] = note
    open(log, "a").write(json.dumps(rec) + "\\n")
    return rec
`,
  },
};
