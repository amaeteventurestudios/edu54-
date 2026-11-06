// Durable execution (phase 15, lesson 12): an Accra logistics agent runs a twelve-activity day plan (model calls, tool calls with side effects
// and a wait for the dispatcher's approval). The host crashes during one activity. A while-true loop starts again from scratch; a durable workflow
// replays completed activities from its event log and re-runs only the one in flight. The checkpoint backend, the crash point and idempotency keys
// decide what is repeated: duplicate bookings and texts, re-asked approvals and re-billed model calls are counted live.
const ACTS = [
  { t: 'plan the\nday\'s routes', k: 'llm' },
  { t: 'read today\'s\norders', k: 'read' },
  { t: 'cluster the\ndeliveries', k: 'llm' },
  { t: 'book three\ntrucks', k: 'effect', what: 'trucks double-booked' },
  { t: 'dispatcher\napproves', k: 'human' },
  { t: 'write driver\nmessages', k: 'llm' },
  { t: 'text 14\ndrivers', k: 'effect', what: 'drivers texted twice' },
  { t: 'summarise\nthe plan', k: 'llm' },
  { t: 'update the\ntracking sheet', k: 'effect', what: 'sheet rows duplicated' },
  { t: 'check for\ngaps', k: 'llm' },
  { t: 'notify\ncustomers', k: 'effect', what: 'customers notified twice' },
  { t: 'final\nreport', k: 'llm' },
];
const KEEPS = { postgres: true, sqlite: false, redis: false };
function recover(o) {
  const c = o.crash - 1, durable = o.durable && KEEPS[o.backend];
  const out = ACTS.map((a, i) => {
    let first, second;
    first = i < c ? 'done' : i === c ? 'crashed' : 'not reached';
    if (i < c) second = durable ? 'replayed' : a.k === 'effect' ? 'repeated' : a.k === 'human' ? 're-asked' : a.k === 'llm' ? 're-billed' : 'rerun';
    else if (i === c) second = a.k === 'effect' && !(durable && o.keys) ? 'repeated' : 'retried';
    else second = 'ran';
    return { ...a, first, second };
  });
  const dup = out.filter(a => a.second === 'repeated');
  return { out, dup, reasked: out.filter(a => a.second === 're-asked').length, rebilled: out.filter(a => a.second === 're-billed').length, durable };
}

export default {
  slug: 'durable-execution',
  title: 'Durable execution: surviving the crash halfway through',
  description: 'A logistics agent in Accra runs twelve steps, and the host crashes partway. Compare a loop that starts again with a durable workflow that replays its event log.',
  overview: 'Production long-horizon agents don\'t run in a while-true loop. Picture a four-hour run with forty model calls, three tool calls and two approvals, and the host reboots halfway. A naive loop loses everything: it starts again, the tool calls with real side effects run twice, the user is asked again for what they already approved, and every model call is billed again. Durable execution, the pattern workflow engines such as Temporal have used for years, avoids that. The workflow is deterministic orchestration code; each model call, tool call or request is an activity, logged with its inputs and, once complete, its output in an event log. On recovery the workflow re-runs from the start, but every completed activity returns its logged result instead of executing again; only the activity that was in flight actually runs. Model calls fit the activity profile exactly: non-deterministic, expensive, sometimes failing and sometimes with side effects. Frameworks have converged on checkpoints keyed by a thread or session id, written to a backend; the backend matters: PostgreSQL survives deploys, SQLite on the local disk is lost when the work moves host, Redis without persistence is lost on restart. Waiting for a person becomes a durable state, so an approval that arrives overnight resumes the run in the morning. Two cautions. The activity that was in flight runs again, so give side effects idempotency keys. And durability lets a run outlast the reliability profile (success falls as horizons grow), so pair it with fresh approval on re-entry after long pauses and budget limits. For runs of a few minutes with no human input, it isn\'t worth the overhead.',
  keywords: ['durable execution', 'Temporal', 'workflows', 'checkpointing', 'idempotency', 'long-running agents', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.2, -0.05], dir: [0.05, 0.95, 1.15], half: 1.2, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { durable: true, backend: 'postgres', crash: 7, keys: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    const KC = { llm: '#8C6BB1', read: '#5B8DB8', effect: GOOD, human: SAF };
    const AX = i => -2.48 + i * 0.45, Z1 = -0.45, Z2 = 0.35, PALE = '#CFE0EE';
    const row = z => ACTS.map((a, i) => {
      const pad = P.box(0.36, 0.02, 0.36, '#D8D2C4', { r: 0.03 }); pad.position.set(AX(i), 0, z); S.add(pad);
      const k = P.stack(0.3, 0.3, 0.13, { max: 2, color: KC[a.k] }); k.position.set(AX(i), 0.02, z); S.add(k);
      return k;
    });
    const r1 = row(Z1), r2 = row(Z2);
    const wall = P.box(0.05, 0.42, 0.5, RED, { r: 0.01 }); S.add(wall);
    const keys = ACTS.map((a, i) => { if (a.k !== 'effect') return null; const c = P.cyl(0.06, 0.05, SAF); c.position.set(AX(i), 0.02, Z2 + 0.27); S.add(c); return c; }).filter(Boolean);
    const log = P.stack(0.42, 0.42, 0.06, { max: 12, color: '#3A3D4A' }); log.position.set(3.05, 0, Z2); S.add(log);
    const run = P.ball(0.06, ink); run.userData.noFit = true; S.add(run);
    S.add(P.keep(-2.75, 3.3, 0.8, -0.7, 0.65));
    let R = null;
    function draw() {
      R = recover(st);
      const two = { repeated: 1, 're-asked': 1, 're-billed': 1, rerun: 1 };
      R.out.forEach((a, i) => {
        r1[i].userData.set({ n: a.first === 'not reached' ? 0 : 1, colors: [a.first === 'crashed' ? RED : KC[a.k]] });
        r2[i].userData.set({ n: two[a.second] ? 2 : 1, colors: [a.second === 'replayed' ? PALE : KC[a.k], a.second === 'rerun' ? KC[a.k] : RED] });
      });
      wall.position.set(AX(st.crash - 1) + 0.225, 0, Z1);
      keys.forEach(c => c.visible = !!st.keys);
      log.userData.set({ n: R.durable ? st.crash - 1 : 0 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const BK = ['postgres', 'sqlite', 'redis'];
    const controls = [
      { type: 'toggle', label: 'Durable workflow, not a while-true loop', short: 'Durable', get: () => st.durable, set: v => set({ durable: !!v }) },
      { type: 'slider', label: 'The host crashes during activity', min: 2, max: 12, step: 1, get: () => st.crash, set: v => set({ crash: Math.round(v) }) },
      { type: 'toggle', label: 'Idempotency keys on side effects', short: 'Idempotency', get: () => st.keys, set: v => set({ keys: !!v }) },
      { type: 'buttons', label: 'Checkpoints stored in', options: ['PostgreSQL', 'Local SQLite', 'Redis, no persistence'], get: () => BK.indexOf(st.backend), act: i => set({ backend: BK[i] }) },
    ];
    const readouts = [
      { label: 'Repeated side effects', get: () => ({ v: String(R.dup.length), sub: R.dup.length ? R.dup[0].what : 'none', good: !R.dup.length, bad: R.dup.length > 0 }) },
      { label: 'Approvals re-asked', get: () => ({ v: String(R.reasked), sub: 'of the dispatcher', good: !R.reasked, bad: R.reasked > 0 }) },
      { label: 'Model calls re-billed', get: () => ({ v: String(R.rebilled), sub: 'run twice', good: !R.rebilled, bad: R.rebilled > 0 }) },
    ];
    const labels = [
      { name: 'run1', t: 'The first run', d: 'Stops where the host crashed', icon: 'play', atV: V(-2.65, 0.15, Z1) },
      { name: 'run2', t: 'After the crash', d: 'Pale: replayed. Red: ran twice', icon: 'reset', atV: V(2.65, 0.15, Z2) },
      { name: 'log', t: 'Event log', d: 'Results replay reads back', icon: 'book', atV: V(3.26, 0.15, Z2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run it as a while-true loop', hint: 'start again', on: () => set({ ...D0, durable: false, crash: 9 }), off: reset },
      { label: 'Keep checkpoints on the old host', hint: 'local SQLite', on: () => set({ ...D0, backend: 'sqlite', crash: 9 }), off: reset },
      { label: 'Retry the texts without a key', hint: 'in-flight side effect', on: () => set({ ...D0, keys: false }), off: reset },
    ];
    function status() {
      const effects = R.dup.map(a => a.what).join(', ');
      if (!st.durable) return { ok: false, msg: `<b>The while-true loop started again from scratch: ${effects || 'no side effects yet'}, ${R.reasked ? 'the dispatcher asked to approve again, ' : ''}and ${R.rebilled} model calls billed twice.</b> Make each model and tool call an activity in a durable workflow, so completed work is replayed from the log, not redone.` };
      if (!R.durable) return { ok: false, msg: `<b>The workflow was durable, but its checkpoints ${st.backend === 'sqlite' ? 'sat in a SQLite file on the host that died' : 'lived in Redis with no persistence'}, so recovery found nothing: ${effects}${R.reasked ? ', the dispatcher re-asked' : ''}, ${R.rebilled} model calls re-billed.</b> Store the event log somewhere that survives deploys, such as PostgreSQL.` };
      if (R.dup.length) return { ok: false, msg: `<b>Everything completed was replayed from the log, but activity ${st.crash} was in flight when the host died, and it ran again: ${effects}.</b> It may have half-finished the first time. Give side effects idempotency keys so a retry with the same key is ignored.` };
      return { ok: true, msg: `<b>Crash during activity ${st.crash}: the ${st.crash - 1} completed activities were replayed from the event log without running again${R.out.slice(0, st.crash - 1).some(a => a.k === 'human') ? ', the dispatcher\'s approval included' : ''}; only the one in flight was retried${ACTS[st.crash - 1].k === 'effect' ? ', and its idempotency key stopped a duplicate' : ''}.</b> Nothing was billed or sent twice.` };
    }
    let tt = 0;
    const update = dt => { tt = (tt + dt / 5) % 1; run.position.set(AX(0) + tt * (AX(11) - AX(0)), 0.42, Z2); };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A long day plan', home: true, say: 'A logistics agent in Accra plans the day: model calls, bookings, texts to drivers and a wait for the dispatcher.', act: m => m.set({ durable: true, backend: 'postgres', crash: 12, keys: true }) },
    { t: 'The host crashes', home: true, say: 'Halfway through, the host reboots. A plain loop starts again: trucks booked twice, the dispatcher asked again.', act: m => m.set({ durable: false, backend: 'postgres', crash: 9, keys: true }) },
    { t: 'Replay from the log', home: true, say: 'A durable workflow logs every activity. On recovery, completed ones return their logged results instead of running again.', act: m => m.set({ durable: true, backend: 'postgres', crash: 9, keys: true }) },
    { t: 'Where the log lives', home: true, say: 'Checkpoints in a file on the host that died are no help. Keep them where they survive deploys.', act: m => m.set({ durable: true, backend: 'sqlite', crash: 9, keys: true }) },
    { t: 'The step in flight', home: true, say: 'The activity running at the crash runs again. Without an idempotency key, the drivers get the same text twice.', act: m => m.set({ durable: true, backend: 'postgres', crash: 7, keys: false }) },
    { t: 'Durable, and bounded', home: true, say: 'With keys, nothing is repeated. Durability lets runs last longer, so pair it with fresh approval and budgets.', act: m => m.set({ durable: true, backend: 'postgres', crash: 7, keys: true }) },
  ],
  check: [
    { q: 'What happens to completed activities when a durable workflow recovers?', options: ['They return their logged results without running again', 'They all run again', 'They are skipped and lost'], answer: 0, why: 'Replay from the event log.', hint: 'Try Run it as a while-true loop.' },
    { q: 'Why can the in-flight activity still cause a duplicate?', options: ['It runs again and may have half-finished', 'The log is wrong', 'Replays are random'], answer: 0, why: 'Use idempotency keys on side effects.', hint: 'Try Retry the texts without a key.' },
    { q: 'Why does the checkpoint backend matter?', options: ['A store on the crashed host or without persistence is lost', 'Speed only', 'It doesn\'t'], answer: 0, why: 'The log must survive the failure.', hint: 'Try Keep checkpoints on the old host.' },
  ],
  terms: [
    ['Workflow', 'Deterministic orchestration code that can be replayed.'],
    ['Activity', 'A non-deterministic unit of work: a model call, tool call or request.'],
    ['Event log', 'The durable record of every activity and decision.'],
    ['Replay', 'Re-running the workflow, using logged results for completed activities.'],
    ['Idempotency key', 'A unique key so repeating a request has no extra effect.'],
    ['Checkpoint', 'Saved state keyed by a thread id, read back on resume.'],
  ],
  deeper: '<p><b>Waiting is a state.</b> Approval by a person becomes a durable pause: the request waits in a queue, and the answer resumes the run exactly where it stopped, even the next morning.</p><p><b>When not to bother.</b> Runs of a few minutes with no person in the loop, read-only lookups, or work that must happen in one context window.</p><p><b>About this machine.</b> The twelve activities are fixed; what is replayed, retried, repeated, re-asked and re-billed is decided live.</p>',
  code: {
    title: 'Activities and replay',
    note: 'Adapted from the course\'s durable-execution sketch (code/main.py).',
    text: `
class Workflow:
    def __init__(self, log):              # log: durable store, e.g. PostgreSQL
        self.log, self.i = log, 0

    def activity(self, name, fn, *args, key=None):
        self.i += 1
        done = self.log.get(self.i)
        if done is not None:              # completed before the crash
            return done                   # replay: no second side effect
        result = fn(*args, idempotency_key=key or f"{name}-{self.i}")
        self.log.put(self.i, result)
        return result

def day_plan(wf):
    plan = wf.activity("plan", llm, "plan the routes")
    wf.activity("book", book_trucks, plan, key="trucks-2026-10-28")
    wf.activity("approve", wait_for_human, plan)   # a durable pause
    wf.activity("text", send_sms, plan.drivers, key="sms-2026-10-28")
`,
  },
};
