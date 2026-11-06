// Repo memory and init scripts (lessons 34 and 35): the fees-app agent keeps its state in agent_state.json, checked against a schema on every write,
// written atomically (temp file, then rename), and starts each session with init_agent.py, which probes the runtime, dependencies, test command,
// environment and state freshness and halts loudly on any failure. Session 2's write is interrupted by a crash; session 2's agent also tries to write
// a bad state (status "kinda-done", task id "export"). Validation, torn writes and the probes are computed live.
const SCHEMA = { required: ['schema_version', 'task_id', 'status', 'touched', 'next'], status: ['todo', 'in_progress', 'blocked', 'done'], taskId: /^T-\d{3,}$/ };
function validate(s) {
  const errs = [];
  SCHEMA.required.forEach(k => { if (!(k in s)) errs.push(`missing ${k}`); });
  if (s.status && !SCHEMA.status.includes(s.status)) errs.push(`status "${s.status}" not allowed`);
  if (s.task_id && !SCHEMA.taskId.test(s.task_id)) errs.push(`task_id "${s.task_id}" must look like T-123`);
  if (s.touched === null) errs.push('touched must be a list');
  return errs;
}
const GOOD = { schema_version: 2, task_id: 'T-142', status: 'in_progress', touched: ['fees/export.py'], next: 'handle names with commas' };
const BAD = { schema_version: 2, task_id: 'export', status: 'kinda-done', touched: null, next: 'finish it' };
const PROBES = [
  ['Python version', 'needs 3.11, found 3.9', false],
  ['dependencies', 'all 14 installed', true],
  ['test command', 'pytest -q found in pyproject.toml', true],
  ['environment', 'FEES_DB_URL set', true],
  ['state freshness', 'agent_state.json written 2 h ago', true],
  ['last good commit', 'a41c9e2 recorded for the handoff diff', true],
];
function run(o) {
  const log = []; let disk = JSON.stringify(GOOD), loaded = null, wasted = 0, halted = false;
  // session 2: the agent writes a bad state, then a good one that is interrupted by a crash
  const attempt = o.schema ? validate(BAD) : [];
  if (attempt.length) log.push({ s: 2, t: `write refused: ${attempt.join('; ')}`, bad: false });
  else { disk = JSON.stringify(BAD); log.push({ s: 2, t: 'wrote status "kinda-done", task "export" (no schema)', bad: true }); }
  const next = JSON.stringify({ ...GOOD, touched: ['fees/export.py', 'tests/test_export.py'], next: 'run the comma test' });
  if (o.crash) { if (o.atomic) log.push({ s: 2, t: 'crash mid-write: temp file lost, agent_state.json untouched', bad: false }); else { disk = next.slice(0, 57); log.push({ s: 2, t: 'crash mid-write: agent_state.json left half written', bad: true }); } }
  else disk = next;
  // session 3 starts
  if (o.init) { const fail = PROBES.filter(p => !p[2]); if (fail.length && o.probeFails) { halted = true; log.push({ s: 3, t: `init halted: ${fail.map(f => `${f[0]} (${f[1]})`).join(', ')}; fix, then start`, bad: false }); } }
  else if (o.probeFails) { wasted += 9; log.push({ s: 3, t: 'no init: 9 steps lost before a 3.9-only error surfaces in a test run', bad: true }); }
  if (!o.init) { wasted += 6; log.push({ s: 3, t: 'cold start: re-reads files and re-probes paths (6 steps)', bad: true }); }
  try { loaded = JSON.parse(disk); } catch (e) { loaded = null; }
  if (!loaded) log.push({ s: 3, t: 'agent_state.json is not valid JSON: session 3 starts from zero', bad: true });
  else if (validate(loaded).length) log.push({ s: 3, t: `loaded a state nobody can read: ${validate(loaded).join('; ')}`, bad: true });
  else log.push({ s: 3, t: `resumed T-142: ${loaded.next}`, bad: false });
  const ok = !!loaded && !validate(loaded).length && !log.some(l => l.bad);
  return { log, ok, wasted, halted, disk };
}

export default {
  slug: 'repo-memory-and-init-scripts',
  title: 'Repo memory and init scripts: start every session warm',
  description: 'A school fees app\'s agent keeps its state in a checked file and starts each session with an init script. Crash a write, skip the schema, and see what session three finds.',
  overview: 'Chat history is volatile; the repo is durable. Keep the agent\'s state in a versioned file so the next session, the next agent and the next reviewer read the same source of truth. What belongs there: the active task, the files touched, assumptions made, open blockers and the next action. What doesn\'t: raw transcripts, reasoning traces, impressions of the user, vendor model IDs. The test is whether it would still be useful in a rerun three months from now. Put a schema in front of it: required keys, allowed status values, patterns such as task IDs, no nulls where lists belong, and a version field with a migration for every change; a bad write is then a refused write, not a shape every reader must guess. Write it atomically: to a temporary file, flushed, then renamed over the old one, because a half-written state file is worse than none. Then start every session with an init script that pays the cold-start tax once: probe runtime versions, dependencies, the test command, paths, environment variables, state freshness and the last good commit, and write the answers down. It fails loud, fast and in one place: any failed probe halts the session and goes to a person, instead of the agent discovering it nine steps later. Run twice, it changes nothing but a timestamp, so it can sit in CI or a hook. Rules say what must be true; init makes sure they can be checked.',
  keywords: ['agent state', 'JSON Schema', 'atomic writes', 'init script', 'coding agents', 'AI agents', 'reliability'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.15], dir: [0.05, 0.8, 1.2], half: 1.25, wide: 5.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { schema: true, atomic: true, init: true, crash: true, probeFails: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOODc = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8';
    /* the state file on disk: a block per required key, green when it reads, red when it does not; torn, only part of it is there.
       In front, the schema gate: shut, it refuses the bad write (the red parcel waiting outside). Beside it the temp file an atomic write uses */
    const FX = -2.3;
    const file = P.stack(0.6, 0.5, 0.13, { max: 5, color: GOODc }); file.position.set(FX, 0.06, 0); S.add(file);
    const gate = P.gate(0.7, '#7B6FA8', { h: 0.45 }); gate.position.set(FX, 0, 0.5); S.add(gate);
    const badW = P.box(0.22, 0.2, 0.22, RED, { r: 0.04 }); badW.position.set(FX, 0, 0.85); S.add(badW);
    const tmp = P.box(0.45, 0.3, 0.4, '#fff', { r: 0.04, material: new THREE.MeshLambertMaterial({ color: '#E07A5F', transparent: true, opacity: 0.5 }) }); tmp.position.set(FX + 0.65, 0, -0.05); tmp.rotation.z = 0.5; S.add(tmp);
    /* init_agent.py: a lamp per probe (Python version, dependencies, test command, environment, freshness, last good commit), then a barrier that halts the start */
    const LX = i => -1.05 + i * 0.36;
    const lamps = PROBES.map((p, i) => { const l = P.lamp(GOODc, { h: 0.4, r: 0.09 }); l.position.set(LX(i), 0, 0); S.add(l); return l; });
    const halt = P.gate(0.7, RED, { h: 0.45 }); halt.position.set(1.25, 0, 0); halt.rotation.y = Math.PI / 2; S.add(halt);
    /* session 3's agent, and the steps it wastes */
    const bot = P.robot(CHAR, { scale: 0.75 }); bot.position.set(1.95, 0, 0); S.add(bot);
    const waste = P.stack(0.4, 0.4, 0.1, { max: 15, color: RED }); waste.position.set(2.65, 0.05, 0); S.add(waste);
    S.add(P.keep(-2.75, 2.95, 1.2, -0.6, 1.0));

    let R = null, lostN = 0;
    function draw() {
      R = run(st);
      let ok = false, torn = false; try { ok = !validate(JSON.parse(R.disk)).length; } catch (e) { torn = true; }
      file.userData.set({ n: torn ? 2 : 5, colors: Array(5).fill(ok ? GOODc : RED) });
      gate.userData.set({ open: !st.schema }); badW.visible = st.schema;
      tmp.visible = st.crash && st.atomic;
      PROBES.forEach((p, i) => { const pass = p[2] || !st.probeFails; lamps[i].userData.set(!st.init ? { color: '#B9B3A6', on: false } : { color: pass ? GOODc : RED, on: true }); });
      const halted = R.log.some(l => /^init halted/.test(l.t)), resumed = R.log.some(l => /^resumed/.test(l.t));
      halt.visible = st.init; halt.userData.set({ open: !halted });
      bot.userData.set({ lamp: halted ? '#E3A72F' : resumed && !R.log.some(l => l.bad) ? GOODc : RED, busy: !halted });
      const w = R.log.reduce((a, l) => a + (+(l.t.match(/(\d+) steps/) || [0, 0])[1]), 0);
      lostN = w; waste.userData.set({ n: w, colors: Array(15).fill(RED) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Validate every write against the schema', short: 'Schema', get: () => st.schema, set: v => set({ schema: !!v }) },
      { type: 'toggle', label: 'Write atomically (temp file, then rename)', short: 'Atomic', get: () => st.atomic, set: v => set({ atomic: !!v }) },
      { type: 'toggle', label: 'Run init_agent.py at the start of each session', short: 'Init', get: () => st.init, set: v => set({ init: !!v }) },
      { type: 'toggle', label: 'A crash interrupts the session-2 write', short: 'Crash', get: () => st.crash, set: v => set({ crash: !!v }), quick: false },
      { type: 'toggle', label: 'The machine has the wrong Python', short: 'Wrong Python', get: () => st.probeFails, set: v => set({ probeFails: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Session 3', get: () => ({ v: R.halted ? 'halted, fix first' : R.ok ? 'resumed' : 'lost its place', sub: 'from agent_state.json', good: R.ok || R.halted, bad: !R.ok && !R.halted }) },
      { label: 'Steps wasted', get: () => ({ v: String(R.wasted), sub: 'rediscovering or failing late', good: !R.wasted, bad: R.wasted > 0 }) },
      { label: 'State file', get: () => { let ok = true; try { ok = !validate(JSON.parse(R.disk)).length; } catch (e) { ok = false; } return { v: ok ? 'valid' : 'broken', sub: 'on disk now', good: ok, bad: !ok }; } },
    ];
    const labels = [
      { name: 'state', t: 'agent_state.json', d: 'A block per key. Red: unreadable', icon: 'book', atV: V(FX - 0.32, 0.25, 0) },
      { name: 'init', t: 'Init probes', d: 'Red lamp: the barrier halts the start', icon: 'play', atV: V(LX(0), 0.25, 0), hide: () => !st.init },
      { name: 'bot', t: 'Session 3', d: 'Lamp green: resumed cleanly', icon: 'spark', atV: V(2.2, 0.25, 0) },
      { name: 'waste', t: 'Steps lost', d: 'A block per step', icon: 'reset', atV: V(2.88, 0.25, 0), hide: () => !lostN },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Drop the schema', hint: 'any shape accepted', on: () => set({ ...D0, schema: false }), off: reset },
      { label: 'Write the state file in place', hint: 'a crash tears it', on: () => set({ ...D0, atomic: false }), off: reset },
      { label: 'Skip the init script', hint: 'discover problems late', on: () => set({ ...D0, init: false }), off: reset },
    ];
    function status() {
      if (!st.schema) return { ok: false, msg: '<b>With no schema, session 2 wrote status "kinda-done" and task "export", and session 3 loads a state no reader can interpret.</b> Is the task done? Which task? With a schema the write is refused at once: unknown status, bad task id, null where a list belongs.' };
      if (!st.atomic && st.crash) return { ok: false, msg: '<b>The crash hit while agent_state.json was being written in place, leaving half a file: session 3 can\'t parse it and starts from zero.</b> Write to a temporary file, flush it, then rename it over the old one; a crash then leaves the previous state intact.' };
      if (!st.init) return { ok: false, msg: `<b>Without an init script, session 3 spends ${R.wasted} steps re-reading files and re-probing paths${st.probeFails ? ', then trips over Python 3.9 nine steps in, inside a test run' : ''}.</b> Probe once at the start, write the answers down, and halt loudly on a failed probe before any work begins.` };
      if (R.halted) return { ok: true, msg: '<b>Session 3 halted at init: the machine has Python 3.9 and the project needs 3.11.</b> One loud failure in one place, before any work, instead of a confusing error nine steps in. The state file is intact (the bad write was refused, the crash lost only a temp file), so after the fix the agent resumes T-142.' };
      return { ok: true, msg: `<b>Session 3 resumed T-142 from the state file: "${R.log[R.log.length - 1].t.split(': ')[1]}".</b> The bad write was refused by the schema, the crash lost only a temporary file, and init found nothing to fix.` };
    }
    return { update: dt => { gate.userData.tick(dt); halt.userData.tick(dt); bot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'State lives in the repo', home: true, say: 'The fees-app agent keeps its working state in a file in the repo: the task, the files touched, the next step. Chat history disappears; the repo stays.', act: m => m.set({ schema: true, atomic: true, init: true, crash: false, probeFails: false }) },
    { t: 'A schema', home: true, say: 'In session two the agent tries to write a status of "kinda-done". The schema refuses it.', act: m => m.set({ schema: true }) },
    { t: 'A crash mid-write', home: true, say: 'Then the machine crashes while saving. Written to a temporary file and renamed, the old state survives untouched.', act: m => m.set({ crash: true }) },
    { t: 'Torn files', home: true, say: 'Written straight over the old file, a crash leaves half a file, and the next session starts from zero.', act: m => m.set({ atomic: false }) },
    { t: 'Probe first', home: true, say: 'Session three opens with an init script. It finds the wrong Python version and halts, loudly, before any work.', act: m => m.set({ atomic: true, probeFails: true }) },
    { t: 'Warm starts', home: true, say: 'Without it, the agent re-reads everything and finds the problem nine steps later, inside a failing test.', act: m => m.set({ init: false }) },
  ],
  check: [
    { q: 'Which belongs in the repo\'s agent state?', options: ['The active task, files touched and next step', 'The raw chat transcript', 'The model\'s reasoning tokens'], answer: 0, why: 'Durable facts a rerun would need.', hint: 'Read the state file.' },
    { q: 'Why write the state file to a temp file and rename it?', options: ['A crash then leaves the old state intact', 'It is faster', 'Renames are logged'], answer: 0, why: 'A half-written file is worse than none.', hint: 'Try Write the state file in place.' },
    { q: 'A probe finds the wrong runtime version. What should init do?', options: ['Halt and tell a person', 'Let the agent work around it', 'Ignore it'], answer: 0, why: 'Fail loud, fast and in one place.', hint: 'Try Skip the init script.' },
  ],
  terms: [
    ['Repo memory', 'Agent state kept in versioned files in the repository.'],
    ['Schema', 'The contract that every state write must satisfy.'],
    ['Atomic write', 'Write to a temporary file, then rename it over the original.'],
    ['Migration', 'A script that upgrades old state to a new schema version.'],
    ['Init script', 'Probes the environment at session start and halts on failure.'],
    ['Idempotent', 'Running it twice changes nothing more.'],
  ],
  deeper: '<p><b>Telemetry, not state.</b> Traces, sampled completions and token counts belong in observability, not in the state file; the test is whether a rerun three months from now would need it.</p><p><b>Rules and init.</b> Rules say what must be true to act; init establishes that they can be checked. Rules without init become "be careful"; init without rules is a polished failure.</p><p><b>About this machine.</b> Schema validation, the torn write and the probes are computed live from the toggles; the step counts for a cold start and a late failure are fixed.</p>',
  code: {
    title: 'Validate, then write atomically',
    note: 'Adapted from the course\'s repo-memory and init-script lessons.',
    text: `
import json, os, tempfile, jsonschema

def save_state(path, state, schema):
    jsonschema.validate(state, schema)              # a bad write is a refused write
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
    with os.fdopen(fd, "w") as f:
        json.dump(state, f, indent=1)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)                           # atomic: old or new, never half

def init(probes):
    failed = [p for p in probes if not p.run()]
    if failed:
        raise SystemExit(f"init failed: {', '.join(p.name for p in failed)}")
`,
  },
};
