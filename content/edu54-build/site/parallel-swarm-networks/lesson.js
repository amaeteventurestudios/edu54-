// Parallel swarms (phase 16, lesson 9): a Lusaka land registry has 5000 scanned titles to classify. A supervisor can only dispatch so fast; in a swarm, workers pull from a shared queue and the queue is the coordinator.
// Throughput, duplicates and stuck work are computed. Leases stop two workers taking one job, a dead-letter shelf stops a poison job looping, and dependent work doesn't belong here.
const JOBS = 5000, WRATE = 60, SUP = 300, PULLCAP = 3000;
function run(o) {
  const rate = o.mode === 'sup' ? Math.min(SUP, o.w * WRATE) : Math.min(PULLCAP, o.w * WRATE);
  const dup = o.mode === 'swarm' && !o.lease ? Math.round(JOBS * Math.min(0.3, o.w * 0.004)) : 0;
  const stuck = o.poison && !o.dlq ? Math.min(o.w, 8) : 0;
  const eff = Math.max(1, rate * (1 - stuck / Math.max(1, o.w)));
  return { rate: eff, hours: (JOBS + dup) / eff, dup, stuck, seq: o.dep && o.mode === 'swarm' };
}

export default {
  slug: 'parallel-swarm-networks',
  title: 'Swarms: let workers pull from a queue',
  description: 'Five thousand title deeds and no boss. Workers pull from a shared queue. See what that scales, and what it needs.',
  overview: 'A supervisor handles a few workers well. At hundreds it becomes the bottleneck, since every decision about who does what goes through one agent. A swarm drops the central planner. Each worker repeats one loop: pull a task, process it, write the result, and perhaps queue follow-ups. The coordination lives in the queue. This fits many independent tasks, and scales until the queue does. It also moves the hard parts to the queue: a lease so two workers don\'t take the same task, a dead-letter shelf so a poison task doesn\'t loop forever, and honesty about dependence, because tasks that need each other aren\'t independent.',
  keywords: ['agent swarm', 'work queue', 'parallel agents', 'dead letter queue', 'multi-agent', 'scaling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'swarm', w: 30, lease: true, dlq: true, poison: false, dep: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const q = add(P.belt(V(-2.4, 0, 0.5), V(2.3, 0, 0.5), { w: 0.34, speed: 1.2 }));
    const boss = add(P.robot(SAF, { scale: 0.9 })); boss.position.set(-1.95, 0.03, -0.25);
    const X = (i) => -1.2 + (i % 6) * 0.5, Z = i => i < 6 ? 0.08 : -0.42;
    const W = Array.from({ length: 12 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.42 })); r.position.set(X(i), 0.03, Z(i)); return r; });
    const dlq = add(P.shelf(3, { cell: 0.24, d: 0.3, lh: 0.26 })); dlq.position.set(2.0, 0.03, -0.3);
    S.add(P.keep(-2.5, 2.5, 1.0, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      boss.visible = st.mode === 'sup';
      const n = Math.min(12, Math.ceil(st.w / 8.5));
      W.forEach((r, i) => { const on = i < n; r.visible = on; r.userData.set({ busy: on, color: i < Math.ceil(R.stuck / 8.5 * 1.5) ? RED : R.dup && i % 3 === 0 ? BAD : BLUE }); });
      dlq.userData.set({ fill: [st.poison && st.dlq ? RED : null, null, null] });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['sup', 'swarm'];
    const controls = [
      { type: 'buttons', label: 'Coordination', options: ['Supervisor', 'Shared queue'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Workers', min: 2, max: 100, step: 1, get: () => st.w, set: v => set({ w: v }) },
      { type: 'toggle', label: 'Leases on tasks', short: 'Leases', get: () => st.lease, set: v => set({ lease: !!v }) },
      { type: 'toggle', label: 'Dead-letter shelf', short: 'Dead letters', get: () => st.dlq, set: v => set({ dlq: !!v }) },
      { type: 'toggle', label: 'A poison task is in the queue', short: 'Poison task', get: () => st.poison, set: v => set({ poison: !!v }) },
      { type: 'toggle', label: 'Tasks depend on each other', short: 'Dependent', get: () => st.dep, set: v => set({ dep: !!v }) },
    ];
    const readouts = [
      { label: 'Tasks per hour', get: () => ({ v: `${Math.round(R.rate)}`, sub: st.mode === 'sup' ? `capped by one planner at ${SUP}` : 'pulled by workers', good: R.rate > 1000, bad: R.rate < 400 }) },
      { label: 'Time to finish', get: () => ({ v: `${R.hours.toFixed(1)} h`, sub: `${JOBS} title deeds` }) },
      { label: 'Tasks done twice', get: () => ({ v: `${R.dup}`, sub: R.dup ? 'no lease' : 'none', good: !R.dup, bad: R.dup > 0 }) },
    ];
    const labels = [
      { name: 'q', t: 'The shared queue', d: 'It is the coordinator', icon: 'link', atV: V(-2.3, 0.1, 0.55) },
      { name: 'd', t: 'Dead-letter shelf', d: 'Where poison tasks wait', icon: 'box', atV: V(2.35, 0.2, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep one supervisor', hint: 'a hundred workers wait', on: () => set({ ...D0, mode: 'sup', w: 100 }), off: reset },
      { label: 'No leases', hint: 'two workers, one task', on: () => set({ ...D0, lease: false }), off: reset },
      { label: 'A poison task, no shelf', hint: 'it fails, returns, fails', on: () => set({ ...D0, poison: true, dlq: false }), off: reset },
      { label: 'Tasks that need each other', hint: 'not independent', on: () => set({ ...D0, dep: true }), off: reset },
    ];
    function status() {
      if (st.mode === 'sup' && st.w * WRATE > SUP) return { ok: false, msg: `<b>${st.w} workers, and only ${Math.round(R.rate)} tasks an hour.</b> Everything waits for one planner to say who does what. Adding workers changes nothing past that point. The planner is the limit.` };
      if (R.seq) return { ok: false, msg: '<b>Workers finished tasks whose inputs didn\'t exist yet.</b> A swarm needs independent tasks. If the order matters, you have a pipeline, and a queue will hide that until the results are wrong.' };
      if (R.stuck) return { ok: false, msg: `<b>${R.stuck} workers are stuck on one bad scan.</b> It fails, returns to the queue and fails again for whoever picks it up. After a few tries, move it to a dead-letter shelf for a person.` };
      if (R.dup) return { ok: false, msg: `<b>${R.dup} tasks were done twice.</b> Two workers saw the same task free. A lease marks a task as taken, and gives it back if the worker dies. That is the queue's job.` };
      return { ok: true, msg: `<b>${Math.round(R.rate)} tasks an hour, ${R.hours.toFixed(1)} hours for all ${JOBS}.</b> ${st.mode === 'swarm' ? 'No planner: each worker pulls, works and writes.' : 'A few workers are well served by one supervisor.'}${st.poison ? ' The poison task sits on the shelf for a person to look at.' : ''}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 0.5 && q.userData.count() < 7) { u = 0; q.userData.send('#F4F1EA', { size: 0.16 }); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'The planner is the limit', home: true, say: 'A land registry in Lusaka has five thousand scanned title deeds. With one supervisor, a hundred workers mostly wait.', act: m => m.set({ mode: 'sup', w: 100, lease: true, dlq: true, poison: false, dep: false }) },
    { t: 'Pull, don\'t push', home: true, say: 'Remove the boss. Each worker pulls a task, does it and writes the result. The queue does the coordinating.', act: m => m.set({ mode: 'swarm', w: 30, lease: true, dlq: true, poison: false, dep: false }) },
    { t: 'It scales', home: true, say: 'Add workers and the rate climbs, until the queue itself is the limit.', act: m => m.set({ mode: 'swarm', w: 100, lease: true, dlq: true, poison: false, dep: false }) },
    { t: 'Leases', home: true, say: 'Without a lease, two workers take one task. A lease marks it as taken, and returns it if a worker dies.', act: m => m.set({ mode: 'swarm', w: 60, lease: false, dlq: true, poison: false, dep: false }) },
    { t: 'Poison', home: true, say: 'One bad scan fails for everyone who tries it. After a few tries, it moves to a shelf for a person.', act: m => m.set({ mode: 'swarm', w: 30, lease: true, dlq: false, poison: true, dep: false }) },
    { t: 'Only for independent work', home: true, say: 'Swarms suit tasks that stand alone. If the order matters, you need a pipeline, not a queue.', act: m => m.set({ mode: 'swarm', w: 30, lease: true, dlq: true, poison: false, dep: true }) },
  ],
  check: [
    { q: 'What limits a supervisor at large scale?', options: ['Every decision goes through one agent', 'Workers are too slow', 'Queues are too long'], answer: 0, why: 'The planner becomes the bottleneck.', hint: 'Try Keep one supervisor.' },
    { q: 'What does a lease prevent?', options: ['Two workers taking one task', 'Bad scans', 'High cost'], answer: 0, why: 'It marks a task as taken.', hint: 'Try No leases.' },
    { q: 'When is a swarm the wrong shape?', options: ['When tasks depend on each other', 'When there are many tasks', 'When tasks are short'], answer: 0, why: 'A queue hides order until results are wrong.', hint: 'Try Tasks that need each other.' },
  ],
  terms: [
    ['Swarm', 'Workers with no central planner.'],
    ['Shared queue', 'Where tasks wait to be pulled.'],
    ['Lease', 'A time-limited claim on a task.'],
    ['Poison task', 'One that fails whoever tries it.'],
    ['Dead-letter queue', 'Where failed tasks are parked.'],
    ['Backpressure', 'Slowing producers when the queue is full.'],
  ],
  deeper: '<p><b>Exactly once is a myth.</b> Queues usually deliver at least once, so make task handlers safe to repeat.</p><p><b>Follow-ups.</b> Workers may add tasks. Set a budget, or a swarm can feed itself forever.</p><p><b>Numbers here</b> are round rates to show the shape.</p>',
  code: {
    title: 'A worker',
    note: 'Adapted from the course\'s swarm sketch (code/main.py).',
    text: `
def worker(queue, results, max_tries=3):
    while True:
        task = queue.lease(seconds=120)          # taken, for now
        if task is None:
            return
        try:
            results.write(task.id, classify(task.scan))
            queue.ack(task)
        except Exception:
            if task.tries >= max_tries:
                queue.dead_letter(task)
            else:
                queue.release(task)
`,
  },
};
