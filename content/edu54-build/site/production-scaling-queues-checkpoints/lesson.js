// Production scaling (phase 16, lesson 22): a Lagos legal-research service charges per agent run. Four needs: survive a crash, take a 10× peak, wait hours for a person, charge exactly once.
// Four ways to build it stand as racks, each with four lamps. The learner picks a rack and a team size. Honest about cost: a workflow engine does most and asks the most of a small team.
const OPT = {
  mem: { n: 'In-memory loop', has: [0, 0, 0, 0], ops: 0 },
  hand: { n: 'FastAPI + Postgres', has: [1, 0, 1, 0], ops: 1 },
  queue: { n: 'Queue + state store', has: [1, 1, 1, 0], ops: 2 },
  flow: { n: 'Workflow engine', has: [1, 1, 1, 1], ops: 3 },
};
const NEED = ['Crash', 'Peak', 'Long wait', 'Billing'];
const CHARGE = 2;
function run(o) {
  const p = OPT[o.opt], has = p.has.map((v, i) => i === 3 ? (v || o.key ? 1 : 0) : v);
  const lost = has[0] ? 0 : 40, dropped = has[1] ? 0 : 900, dup = has[3] ? 0 : 25;
  const wall = !o.ser && p.has[0], heavy = p.ops > o.team;
  return { p, has, lost, dropped, dup, over: dup * CHARGE, wall, heavy, ok: !lost && !dropped && !dup && !wall && !heavy };
}

export default {
  slug: 'production-scaling-queues-checkpoints',
  title: 'Production scaling: from laptop to overnight runs',
  description: 'Crashes, peaks, long waits and fair billing. Four ways to build the layer underneath, and what each one asks of your team.',
  overview: 'A prototype with three agents in an event loop works on a laptop. Production adds four needs. Runs last for hours, waiting on people. Workers crash. Peak load is ten times the average. And when users pay per run, each must be charged exactly once. An in-memory loop has none of this. You need something durable underneath: a workflow engine with checkpoints, a queue with a state store, an actor framework, or a plain API with a database. The engine covers the most and asks the most. And all of them require state you can actually serialise. There is no best answer, only the smallest layer that covers your needs with the team you have.',
  keywords: ['durable execution', 'Temporal', 'message queue', 'exactly once', 'production agents', 'scaling'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { opt: 'queue', team: 2, key: true, ser: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const KEYS = ['mem', 'hand', 'queue', 'flow'], X = i => -1.8 + i * 1.2;
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const racks = KEYS.map((k, i) => {
      const m = new S.THREE.MeshLambertMaterial({ color: '#6B6E7E' }), b = P.box(0.85, 0.35 + OPT[k].ops * 0.18, 0.55, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.25); S.add(b);
      const ls = [0, 1, 2, 3].map(j => { const l = add(P.lamp(GREY, { h: 0.2, r: 0.08 })); l.position.set(X(i) - 0.3 + j * 0.2, 0.03, 0.3); return l; });
      return { k, m, ls };
    });
    const bot = add(P.robot(SAF, { scale: 0.6 })); bot.userData.noFit = true;
    const team = Array.from({ length: 4 }, (_, i) => { const p = P.ball(0.09, '#A87A4F'); p.position.set(-2.3 + i * 0.26, 0.12, 0.62); S.add(p); return p; });
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.75));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      racks.forEach(({ k, m, ls }) => {
        const on = k === st.opt, r = run({ ...st, opt: k });
        m.color.set(on ? (R.ok ? GOOD : BAD) : '#8E91A3');
        ls.forEach((l, j) => l.userData.set({ color: r.has[j] ? '#3E9B5F' : '#D9483B', on: on }));
      });
      team.forEach((p, i) => { p.visible = i < st.team; });
      bot.position.set(X(KEYS.indexOf(st.opt)), 0.4 + OPT[st.opt].ops * 0.18, -0.25);
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Build it on', options: ['Memory', 'API + Postgres', 'Queue', 'Engine'], get: () => KEYS.indexOf(st.opt), act: i => set({ opt: KEYS[i] }) },
      { type: 'slider', label: 'People to run it', min: 1, max: 4, step: 1, get: () => st.team, set: v => set({ team: v }) },
      { type: 'toggle', label: 'Charges carry an idempotency key', short: 'Billing key', get: () => st.key, set: v => set({ key: !!v }) },
      { type: 'toggle', label: 'Agent state can be serialised', short: 'Serialisable', get: () => st.ser, set: v => set({ ser: !!v }) },
    ];
    const readouts = [
      { label: 'Needs met', get: () => ({ v: `${R.has.filter(Boolean).length} of 4`, sub: NEED.filter((n, i) => !R.has[i]).join(', ') || 'all covered', good: R.has.every(Boolean), bad: R.has.filter(Boolean).length < 2 }) },
      { label: 'Overcharged in a month', get: () => ({ v: M(R.over), sub: `${R.dup} runs charged twice`, good: !R.dup, bad: !!R.dup }) },
      { label: 'Team strain', get: () => ({ v: R.heavy ? 'too much' : 'fine', sub: `${st.team} people for ${R.p.n}`, good: !R.heavy, bad: R.heavy }) },
    ];
    const labels = [
      { name: 'r', t: 'Four ways to build it', d: 'Taller: more to run', icon: 'box', atV: V(-2.25, 0.2, -0.25) },
      { name: 'l', t: 'Four needs, four lamps', d: 'Crash, peak, wait, billing', icon: 'check', atV: V(2.2, 0.25, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Stay on the event loop', hint: 'it worked on my laptop', on: () => set({ ...D0, opt: 'mem' }), off: reset },
      { label: 'Keep a live connection in state', hint: 'it can\'t be saved', on: () => set({ ...D0, ser: false }), off: reset },
      { label: 'Charge with no key', hint: 'a retry bills twice', on: () => set({ ...D0, key: false }), off: reset },
      { label: 'One person runs the engine', hint: 'more than the need', on: () => set({ ...D0, opt: 'flow', team: 1 }), off: reset },
    ];
    function status() {
      if (st.opt === 'mem') return { ok: false, msg: `<b>${R.lost} runs lost to crashes, ${R.dropped} dropped at the peak.</b> Nothing outlives the process. An hour-long run waiting on a person dies with the next deploy.` };
      if (R.wall) return { ok: false, msg: '<b>The checkpoint failed on a live database connection.</b> Durable layers save your state, and closures or sockets can\'t be saved. Keep state as plain data and reopen connections on resume.' };
      if (R.dup) return { ok: false, msg: `<b>${R.dup} runs were charged twice, ${M(R.over)} too much.</b> Queues deliver at least once, so a retry repeats the charge. Exactly once comes from at-least-once plus an idempotency key.` };
      if (R.heavy) return { ok: false, msg: `<b>${R.p.n} is more than ${st.team} ${st.team === 1 ? 'person' : 'people'} can run.</b> It covers everything, and needs its own care and on-call. Take the smallest layer that meets your needs.` };
      if (R.dropped) return { ok: false, msg: `<b>${R.dropped} requests dropped at the peak.</b> ${R.p.n} handles a steady day, but a 10× surge needs a queue to absorb it.` };
      return { ok: true, msg: `<b>${R.p.n} meets ${R.has.filter(Boolean).length} of 4 needs with ${st.team} people.</b> ${st.opt === 'queue' ? 'The key closes the billing gap by hand.' : 'The engine handles retries and resumes for you.'} State is plain data, so a crash is only a pause.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; bot.userData.set({ busy: true }); bot.rotation.y = Math.sin(u) * 0.3; },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Off the laptop', home: true, say: 'A legal-research service in Lagos charges per agent run. On a laptop, an event loop was fine. In production, it loses everything.', act: m => m.set({ opt: 'mem', team: 2, key: true, ser: true }) },
    { t: 'Four needs', home: true, say: 'Survive a crash, take a tenfold peak, wait hours for a person, and charge exactly once. Each lamp is one need.', act: m => m.set({ opt: 'hand', team: 2, key: true, ser: true }) },
    { t: 'A queue and a store', home: true, say: 'A queue absorbs the peak, and a state store holds the runs. That covers a lot, for a small team.', act: m => m.set({ opt: 'queue', team: 2, key: true, ser: true }) },
    { t: 'Exactly once', home: true, say: 'Queues deliver at least once, so a retry can bill twice. Exactly once is at least once, plus a key.', act: m => m.set({ opt: 'queue', team: 2, key: false, ser: true }) },
    { t: 'Plain data', home: true, say: 'A durable layer saves your state. A live database connection can\'t be saved, so keep state as plain data.', act: m => m.set({ opt: 'queue', team: 2, key: true, ser: false }) },
    { t: 'The smallest that fits', home: true, say: 'A workflow engine does the most and asks the most. Take the smallest layer your team can run.', act: m => m.set({ opt: 'flow', team: 3, key: true, ser: true }) },
  ],
  check: [
    { q: 'Why must agent state be serialisable?', options: ['So it can be saved and resumed', 'To make it shorter', 'To hide it'], answer: 0, why: 'Durability means saving state.', hint: 'Try Keep a live connection in state.' },
    { q: 'How do you get exactly-once charging from a queue?', options: ['At-least-once delivery plus an idempotency key', 'A faster queue', 'Fewer workers'], answer: 0, why: 'The repeat counts as the first.', hint: 'Try Charge with no key.' },
    { q: 'How should you choose this layer?', options: ['The smallest that meets your needs with your team', 'Whatever is largest', 'Whatever is newest'], answer: 0, why: 'A big engine needs people to run it.', hint: 'Try One person runs the engine.' },
  ],
  terms: [
    ['Durable execution', 'State saved after each step, so runs survive crashes.'],
    ['Workflow engine', 'A service that runs and resumes long jobs.'],
    ['At-least-once', 'Delivered one or more times.'],
    ['Exactly once', 'The effect happens once.'],
    ['Serialisable', 'Can be saved as plain data.'],
    ['Actor', 'A worker with its own state and mailbox.'],
  ],
  deeper: '<p><b>Deterministic resume.</b> Replaying a run calls the model again, and it may answer differently. Save model outputs in the step, so a resume reads them back.</p><p><b>Actors.</b> One queue per agent is a fourth option, suited to many long-lived agents.</p><p><b>Numbers here</b> are round figures for one illustrative month.</p>',
  code: {
    title: 'A durable step',
    note: 'Adapted from the course\'s miniature (code/main.py).',
    text: `
def worker(queue, store):
    job = queue.lease()
    state = store.load(job.run_id)               # plain data only
    update = step(state)
    store.save(job.run_id, {**state, **update})
    if update.get("finished"):
        charge(job.user, key=f"run:{job.run_id}")  # safe to repeat
    else:
        queue.put(job)
    queue.ack(job)
`,
  },
};
