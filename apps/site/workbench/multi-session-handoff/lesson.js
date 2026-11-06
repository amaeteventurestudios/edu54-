// Multi-session handoff: the fees-app agent's session ends with the receipt export half done. A generator builds handoff.md and handoff.json from the
// workbench artifacts (state, verification report, review report, feedback log), trimming the feedback to the last 3 entries plus every non-zero exit;
// a cleanup phase checks the working tree, temp files, tests and the board. The next session's minutes before its first productive step are the sum
// of what it must rediscover (fixed costs per missing field or dirty check, below). Everything is computed live from the toggles.
const FIELDS = [
  ['summary', 'what was done, in one paragraph', 2, 'reads the diff to work out what happened'],
  ['changed_files', 'fees/export.py, tests/test_export.py', 2, 'greps for what changed'],
  ['commands_run', 'pytest -q (exit 1), scripts/smoke_export.py (exit 0)', 2, 're-runs everything to see the state'],
  ['failed_attempts', 'csv.writer with quoting=MINIMAL broke Excel on Windows', 9, 'tries the same dead end again'],
  ['open_risks', 'test_comma_in_name still red (high)', 6, 'steps on the red test'],
  ['next_action', 'switch to quoting=ALL and re-run test_comma_in_name', 12, 'has no first step and starts exploring'],
  ['verdict_pointer', 'outputs/verification/T-142.json', 2, 'hunts for the gate report'],
];
const CLEAN = [
  ['working tree', 'all changes committed', 7, 'a half-applied diff looks like intended work'],
  ['temp artifacts', 'no *.tmp, no debug prints', 3, 'stray files pollute the diff'],
  ['tests', 'red test named in open_risks', 5, 'a silent red test is a trap'],
  ['board', 'T-142 marked in_progress', 2, 'the board says todo; work restarts'],
];
const LOG = Array.from({ length: 40 }, (_, i) => ({ n: i + 1, exit: [7, 19, 33, 38].includes(i) ? 1 : 0 }));
function trim(k) { const keep = LOG.filter((r, i) => i >= LOG.length - k || r.exit !== 0); return keep; }
function next(o) {
  let mins = 1; const why = [];
  FIELDS.forEach(f => { if (!o.generate || !o.fields.includes(f[0])) { mins += f[2]; why.push(`no ${f[0]}: ${f[3]} (+${f[2]} min)`); } });
  CLEAN.forEach(c => { if (!o.clean) { mins += c[2]; why.push(`dirty ${c[0]}: ${c[3]} (+${c[2]} min)`); } });
  return { mins, why };
}

export default {
  slug: 'multi-session-handoff',
  title: 'Handoffs: the next session is productive in a minute',
  description: 'A fees-app agent ends a session with the receipt export half done. Generate the handoff, clean up, and count the minutes the next session loses.',
  overview: 'The session will end; the work won\'t. A handoff packet turns "the agent worked for an hour" into "the next session is productive in the first minute". It carries seven fields: a summary, the changed files, the commands actually run, failed attempts and why they failed, open risks with their severity, the next action, and a pointer to the verification and review reports. The next action is the load-bearing one: without it, the packet is a status report, not a handoff. Generate it, don\'t write it: a hand-written handoff is the one that gets skipped on a hard day, so a generator reads the workbench artifacts (state, verification report, review report, feedback log) and emits two forms from the same source, a Markdown file for people and JSON for the next agent; if they disagree, the JSON wins. Trim the feedback log to the last few entries plus every non-zero exit; the full log stays on disk. And leave a clean state, because a perfect note is worthless if the next session opens on a half-applied diff, stray temp files, a silent red test and a stale board. Cleanup is its own phase, run as a check before the handoff: working tree committed or stashed with a note, no temp files or debug prints, tests green or the failure named in the risks, the board updated.',
  keywords: ['handoff', 'coding agents', 'session continuity', 'AI agents', 'developer workflow', 'state', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.15, 0.4, -0.25], dir: [0.05, 0.8, 1.2], half: 1.2, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const ALL = FIELDS.map(f => f[0]);
    const D0 = { generate: true, fields: ALL.slice(), clean: true, k: 3 }, st = { ...D0, fields: ALL.slice() };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', AMB = '#E3A72F';
    /* the handoff packet: a block per field (blue, next_action gold), red where the field is missing */
    const Z = -0.3;
    const packet = FIELDS.map((f, i) => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.6, 0.11, 0.5, '#fff', { r: 0.02, material: m }); b.position.set(-2.45, i * 0.13, Z); S.add(b); return m; });
    /* cleanup before the handoff: working tree, temp files, tests, board, a lamp each */
    const LX = i => -1.65 + i * 0.32;
    const lamps = CLEAN.map((c, i) => { const l = P.lamp(GOOD, { h: 0.4, r: 0.09 }); l.position.set(LX(i), 0, Z); S.add(l); return l; });
    /* the next session's agent, a column of minutes before its first useful step, and the feedback log: 40 entries, the kept ones raised */
    const bot = P.robot(CHAR, { scale: 0.75 }); bot.position.set(-0.1, 0, Z); S.add(bot);
    const time = P.tower(0.4, 0.4, GOOD, { h: 0.1 }); time.userData.set({ cap: '' }); time.position.set(0.6, 0, Z); S.add(time);
    const logs = LOG.map((r, i) => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.11, 0.1, 0.11, '#fff', { r: 0.015, material: m }); b.position.set(1.25 + (i % 8) * 0.14, 0, Z - 0.3 + Math.floor(i / 8) * 0.14); S.add(b); return { b, m }; });
    S.add(P.keep(-2.85, 2.5, 1.4, -0.75, 0.2));

    let N = null;
    function draw() {
      N = next(st);
      FIELDS.forEach((f, i) => { const has = st.generate && st.fields.includes(f[0]); packet[i].color.set(!has ? RED : f[0] === 'next_action' ? AMB : BLUE); });
      const keep = new Set(trim(st.k).map(r => r.n));
      LOG.forEach((r, i) => { const k = st.generate && keep.has(r.n); logs[i].b.scale.y = k ? 2.2 : 0.4; logs[i].m.color.set(!k ? '#C9C4B6' : r.exit ? RED : BLUE); });
      lamps.forEach(l => l.userData.set({ color: st.clean ? GOOD : RED, on: true }));
      time.userData.set({ h: 0.05 + N.mins * 0.022, color: N.mins <= 2 ? GOOD : N.mins < 15 ? AMB : RED });
      bot.userData.set({ busy: N.mins <= 2, lamp: N.mins <= 2 ? GOOD : RED });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Generate the handoff from the artifacts', short: 'Generate', get: () => st.generate, set: v => set({ generate: !!v }) },
      { type: 'toggle', label: 'Include the next action', short: 'Next action', get: () => st.fields.includes('next_action'), set: v => set({ fields: v ? [...new Set([...st.fields, 'next_action'])] : st.fields.filter(x => x !== 'next_action') }) },
      { type: 'toggle', label: 'Include failed attempts', short: 'Failed attempts', get: () => st.fields.includes('failed_attempts'), set: v => set({ fields: v ? [...new Set([...st.fields, 'failed_attempts'])] : st.fields.filter(x => x !== 'failed_attempts') }), quick: false },
      { type: 'toggle', label: 'Run the cleanup checks first', short: 'Cleanup', get: () => st.clean, set: v => set({ clean: !!v }) },
      { type: 'slider', label: 'Recent feedback entries to keep', min: 1, max: 10, step: 1, get: () => st.k, set: v => set({ k: Math.round(v) }), fmt: v => String(Math.round(v)) },
    ];
    const readouts = [
      { label: 'Next session', get: () => ({ v: `${N.mins} min`, sub: 'to the first useful step', good: N.mins <= 2, bad: N.mins > 10 }) },
      { label: 'Packet', get: () => ({ v: st.generate ? `${st.fields.length} of 7` : 'none', sub: 'fields present', good: st.generate && st.fields.length === 7, bad: !st.generate }) },
      { label: 'Feedback kept', get: () => ({ v: `${trim(st.k).length}`, sub: `of ${LOG.length} entries` }) },
    ];
    const labels = [
      { name: 'packet', t: 'handoff.json', d: 'A block per field. Gold: next action', icon: 'book', atV: V(-2.75, 0.2, Z + 0.25) },
      { name: 'clean', t: 'Cleanup', d: 'Tree, temp files, tests, board', icon: 'check', atV: V(LX(0), 0.2, Z + 0.25) },
      { name: 'time', t: 'Minutes lost', d: 'Before the next session\'s first step', icon: 'reset', atV: V(0.8, 0.2, Z + 0.25) },
      { name: 'log', t: 'Feedback log', d: 'Raised: kept. Red: a failed command', icon: 'code', atV: V(2.3, 0.2, Z + 0.25) },
    ];
    const reset = () => set({ ...D0, fields: ALL.slice() });
    const breaks = [
      { label: 'Rely on a hand-written note', hint: 'skipped on a hard day', on: () => set({ ...D0, fields: ALL.slice(), generate: false }), off: reset },
      { label: 'Leave out the next action', hint: 'a status report, not a handoff', on: () => set({ ...D0, fields: ALL.filter(x => x !== 'next_action') }), off: reset },
      { label: 'Skip the cleanup', hint: 'a half-applied diff', on: () => set({ ...D0, fields: ALL.slice(), clean: false }), off: reset },
    ];
    function status() {
      if (!st.generate) return { ok: false, msg: `<b>The note the agent meant to write was skipped, as hand-written handoffs are on hard days: the next session loses ${N.mins} minutes rediscovering what was done, what failed and what to do first.</b> Generate the packet from the workbench\'s own artifacts so it always exists.` };
      if (!st.fields.includes('next_action')) return { ok: false, msg: `<b>Without a next action, the packet is a status report: the next session knows everything except where to start, and spends ${N.mins} minutes exploring.</b> "Switch to quoting=ALL and re-run test_comma_in_name" is the line that makes it a handoff.` };
      if (!st.clean) return { ok: false, msg: `<b>The packet is perfect, but the repo isn\'t: a half-applied diff, stray temp files, a silent red test and a stale board cost the next session ${N.mins} minutes before it can trust anything.</b> Cleanup is a check run before the handoff, not a habit.` };
      if (N.why.length) return { ok: false, msg: `<b>${N.mins} minutes lost: ${N.why.join('; ')}.</b>` };
      return { ok: true, msg: `<b>The next session opens handoff.json and is working in 1 minute: "${FIELDS[5][1]}".</b> The failed attempt warns it off quoting=MINIMAL, the red test is named as a risk, and only ${trim(st.k).length} of 40 feedback entries travel with the packet.` };
    }
    return { update: dt => { time.userData.tick(dt); bot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The session ends', home: true, say: 'The fees-app agent\'s session ends with the receipt export half done. The next session will start cold.', act: m => m.set({ generate: false, fields: FIELDS.map(f => f[0]), clean: false, k: 3 }) },
    { t: 'Nothing left behind', home: true, say: 'With no handoff and a messy repo, the next session spends most of an hour finding its place.', act: m => m.set({ generate: false }) },
    { t: 'Generated, not written', home: true, say: 'A generator builds the handoff from the workbench\'s own records, so it exists even on a hard day.', act: m => m.set({ generate: true }) },
    { t: 'The next action', home: true, say: 'One field matters most: the first concrete step for the next session.', act: m => m.set({ fields: FIELDS.map(f => f[0]) }) },
    { t: 'Clean up first', home: true, say: 'A perfect note is worthless on top of a half-applied change. Commit, remove temp files, and name the red test.', act: m => m.set({ clean: true }) },
    { t: 'One minute', home: true, say: 'Now the next session opens the handoff and starts working in a minute.', act: m => m.set({}) },
  ],
  check: [
    { q: 'Which handoff field is load-bearing?', options: ['The next action', 'The summary', 'The changed files'], answer: 0, why: 'Without it, it is a status report.', hint: 'Try Leave out the next action.' },
    { q: 'Why generate the handoff instead of writing it?', options: ['A hand-written one gets skipped on a hard day', 'Generators write better prose', 'It is required'], answer: 0, why: 'Generate from the artifacts.', hint: 'Try Rely on a hand-written note.' },
    { q: 'Which feedback entries travel with the handoff?', options: ['The last few plus every non-zero exit', 'All of them', 'None'], answer: 0, why: 'The full log stays on disk.', hint: 'Move the feedback slider.' },
  ],
  terms: [
    ['Handoff packet', 'What a session leaves for the next: seven fields.'],
    ['Next action', 'The first concrete step the next session takes.'],
    ['Failed attempts', 'What was tried and why it didn\'t work.'],
    ['Open risks', 'What could bite next, with severity.'],
    ['Cleanup phase', 'Checks that leave the repo resumable.'],
    ['Clean state', 'Committed changes, no temp files, named failures, updated board.'],
  ],
  deeper: '<p><b>Two forms.</b> Markdown for people, JSON for the next agent, both generated from the same artifacts; if they diverge, the JSON wins.</p><p><b>Leave it to the generator.</b> The agent\'s job is to leave the workbench in a state the generator can summarise, not to write the summary.</p><p><b>About this machine.</b> The minutes per missing field and per dirty check are fixed estimates; which apply, the feedback trimming and the total are computed live.</p>',
  code: {
    title: 'Generate a handoff from the artifacts',
    note: 'Adapted from the course\'s handoff lesson.',
    text: `
def generate_handoff(state, verdict, review, feedback, k=3):
    if state.get("next") is None:
        raise ValueError("no next action: this is a status report, not a handoff")
    kept = feedback[-k:] + [r for r in feedback[:-k] if r["exit_code"] != 0]
    return {
        "summary": state["summary"],
        "changed_files": state["touched"],
        "commands_run": [r["command"] for r in kept],
        "failed_attempts": state.get("failed_attempts", []),
        "open_risks": review.get("risks", []),
        "next_action": state["next"],
        "verdict_pointer": verdict["path"],
    }
`,
  },
};
