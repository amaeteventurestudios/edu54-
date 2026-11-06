// Production runtimes: an Addis Ababa coffee exporter's document agent checks shipment papers. 40 jobs arrive over an hour; each takes 0.3 to 8
// minutes of agent work (seeded; two crash part-way). Request-response: the gateway times out at 30 s, the user retries (twice), and every retry re-runs the work.
// Queue: jobs wait for one of W workers; results come back by webhook. 8% of runs crash once mid-way: with durable checkpoints a job resumes from its
// last step (losing at most a minute), without them it starts over; a job that fails three times goes to a dead-letter queue, or vanishes without one.
// Discrete-event simulation, computed live.
function jobs() { let x = 9; const r = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; }; return Array.from({ length: 40 }, (_, i) => ({ id: i, at: i * 1.5, dur: 0.3 + Math.pow(r(), 1.6) * 7.7, crash: r() < 0.08 ? 0.3 + r() * 0.5 : 0, crash2: r() < 0.5 })); }
function sim(o) {
  const J = jobs(); let done = 0, timeouts = 0, lost = 0, dlq = 0, waste = 0, waits = [];
  if (o.mode === 'request') {
    J.forEach(j => { if (j.dur <= 0.5 && !j.crash) { done++; return; } timeouts += 3; waste += Math.min(j.dur, 0.5) * 3; });
    return { done, timeouts, lost: 40 - done, dlq: 0, waste, wait: 0, p95: 0 };
  }
  const free = Array(o.workers).fill(0);
  J.forEach(j => {
    let tries = 0, ok = false, t = j.at, remaining = j.dur;
    while (tries < 3 && !ok) {
      const w = free.indexOf(Math.min(...free)), start = Math.max(t, free[w]); waits.push(start - j.at);
      const crashes = j.crash && (tries === 0 || (j.crash2 && !o.durable));
      if (crashes) { const ran = remaining * j.crash; waste += o.durable ? Math.min(ran, 1) : ran; free[w] = start + ran; t = free[w]; tries++; if (o.durable) remaining = remaining - Math.max(0, ran - 1); continue; }
      free[w] = start + remaining; ok = true;
    }
    if (ok) done++; else if (o.dlq) dlq++; else lost++;
  });
  const sw = waits.slice().sort((a, b) => a - b);
  return { done, timeouts, lost, dlq, waste, wait: sw.reduce((a, b) => a + b, 0) / sw.length, p95: sw[Math.floor(sw.length * 0.95)] };
}

export default {
  slug: 'production-runtimes',
  title: 'Production runtimes: the right shape for long agent jobs',
  description: 'An Addis Ababa coffee exporter\'s agent checks shipment papers, some for minutes. Run forty jobs as web requests or through a queue of workers, and count what finishes.',
  overview: 'Agents run in a few production shapes. Request-response: the user waits on one HTTP call; fine for tasks under about thirty seconds, hopeless for minutes-long ones, where gateways time out, users retry and each retry starts the work again. Streaming (server-sent events, WebSockets, WebRTC for voice) shows progress as it comes; measure time to first token and tail latency. Durable execution checkpoints state after every step and resumes after a failure instead of starting over; essential when steps are many and a restart is expensive. Queue-based background work puts each job on a queue for a pool of workers and returns results by webhook or pub/sub; watch queue depth, the spread of job latency, and the dead-letter queue where jobs that keep failing are parked for a person to look at. Event-driven agents start on triggers (an email, a pull request); scheduled ones run on a timer, and should also be durable so a failed nightly run picks up on the next tick. Whatever the shape, export traces of every step: a forty-step job that fails at step thirty-eight is otherwise debugged by running it all again with more logging.',
  keywords: ['production agents', 'job queue', 'durable execution', 'dead-letter queue', 'background jobs', 'AI agents', 'reliability'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.05], dir: [0.05, 0.85, 1.2], half: 1.3, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 'queue', workers: 4, durable: true, dlq: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    /* the forty jobs as a row of columns, height = minutes of work (blue; gold if it crashes once). Served as requests, a red slab marks the
       30 s gateway timeout: green columns fit under it, red ones time out */
    const J = jobs(), mx = Math.max(...J.map(j => j.dur)), JH = 1.1, JX = i => -2.95 + i * 0.062, JZ = -0.45;
    const cols = J.map((j, i) => { const t = P.tower(0.05, 0.16, BLUE, { h: j.dur / mx * JH }); t.userData.set({ cap: '' }); t.position.set(JX(i), 0, JZ); S.add(t); return t; });
    const lim = P.box(2.6, 0.012, 0.3, RED, { r: 0, material: new THREE.MeshLambertMaterial({ color: RED, transparent: true, opacity: 0.7 }) }); lim.position.set(-1.74, 0.5 / mx * JH, JZ); S.add(lim);
    /* a belt carries them in; as requests it ends at the shut gateway, through a queue it feeds the workers */
    const BZ = 0.35, belt = P.belt(V(-2.95, 0, BZ), V(-0.15, 0, BZ), { w: 0.4, speed: 0.8 }); S.add(belt);
    const gw = P.gate(0.55, RED, { h: 0.5 }); gw.position.set(-0.32, 0, BZ); gw.rotation.y = Math.PI / 2; S.add(gw);
    const workers = Array.from({ length: 8 }, (_, i) => { const r = P.robot(CHAR, { scale: 0.7 }); r.position.set(0.1 + (i % 4) * 0.42, 0, (i < 4 ? 0.0 : 0.6)); S.add(r); return r; });
    const dial = P.dial(0.28); dial.position.set(0.68, 0, -0.55); S.add(dial);
    /* where they end: finished, timed out, dead-letter, vanished (a column each, one step per job), and a tank of worker-minutes thrown away */
    const OUT = [GOOD, BAD, SAF, '#8E8C84'], OX = i => 1.75 + i * 0.42, OZ = -0.4;
    const bins = OUT.map((c, i) => { const t = P.tower(0.3, 0.3, c, { h: 0.02 }); t.userData.set({ cap: '' }); t.position.set(OX(i), 0, OZ); S.add(t); return t; });
    const tank = P.tank(1.0, 0.5, 0.4, RED); tank.position.set(2.38, 0, 0.5); S.add(tank);
    S.add(P.keep(-3.1, 3.15, 1.2, -0.75, 0.9));

    let R = null, feed = 0;
    function draw() {
      R = sim(st);
      const req = st.mode === 'request';
      J.forEach((j, i) => cols[i].userData.set({ color: req ? (j.dur <= 0.5 && !j.crash ? GOOD : BAD) : j.crash ? SAF : BLUE }));
      lim.visible = req;
      gw.userData.set({ open: !req });
      workers.forEach((w, i) => { w.visible = !req && i < st.workers; w.userData.set({ busy: true, lamp: R.p95 > 20 ? RED : GOOD }); });
      dial.visible = !req; dial.userData.set({ v: R.p95 / 30 });
      [R.done, R.timeouts / 3, R.dlq, R.lost - (req ? R.timeouts / 3 : 0)].forEach((v, i) => bins[i].userData.set({ h: 0.02 + 0.02 * v }));
      tank.userData.set({ level: R.waste / 60 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Runtime', options: ['Web request', 'Queue and workers'], get: () => st.mode === 'request' ? 0 : 1, act: i => set({ mode: i ? 'queue' : 'request' }) },
      { type: 'slider', label: 'Workers', min: 1, max: 8, step: 1, get: () => st.workers, set: v => set({ workers: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'toggle', label: 'Checkpoint after every step (durable)', short: 'Durable', get: () => st.durable, set: v => set({ durable: !!v }) },
      { type: 'toggle', label: 'Dead-letter queue for jobs that keep failing', short: 'DLQ', get: () => st.dlq, set: v => set({ dlq: !!v }) },
    ];
    const readouts = [
      { label: 'Finished', get: () => ({ v: `${R.done} of 40`, sub: st.mode === 'request' ? 'within 30 s' : 'results by webhook', good: R.done >= 38, bad: R.done < 30 }) },
      { label: 'Lost', get: () => ({ v: String(st.mode === 'request' ? 40 - R.done : R.lost), sub: st.mode === 'request' ? 'timed out' : 'vanished, no trace', good: !R.lost, bad: R.lost > 0 }) },
      { label: 'Wait', get: () => ({ v: st.mode === 'request' ? '–' : `${R.p95.toFixed(1)} min`, sub: '95th percentile for a worker', bad: st.mode === 'queue' && R.p95 > 20 }) },
    ];
    const labels = [
      { name: 'jobs', t: 'Forty jobs', d: 'Height: minutes of work. Gold crashes once', icon: 'box', atV: V(-3.0, 0.5, -0.45) },
      { name: 'gate', t: 'Gateway', d: 'Shut at 30 s for web requests', icon: 'stop', atV: V(-0.32, 0.5, 0.35), hide: () => st.mode !== 'request' },
      { name: 'work', t: 'Workers', d: 'Lamp red: a long wait', icon: 'user', atV: V(0.75, 0.6, 0.6), hide: () => st.mode === 'request' },
      { name: 'out', t: 'Where they end', d: 'Finished, timed out, dead-letter, vanished', icon: 'target', atV: V(3.1, 0.5, -0.4) },
      { name: 'waste', t: 'Thrown away', d: 'Worker-minutes run again', icon: 'reset', atV: V(2.9, 0.3, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Serve minutes-long jobs as requests', hint: '30 s timeout', on: () => set({ ...D0, mode: 'request' }), off: reset },
      { label: 'Run without checkpoints', hint: 'restart from scratch', on: () => set({ ...D0, durable: false }), off: reset },
      { label: 'Drop the dead-letter queue', hint: 'and the checkpoints', on: () => set({ ...D0, durable: false, dlq: false }), off: reset },
    ];
    function status() {
      if (st.mode === 'request') return { ok: false, msg: `<b>As web requests, only ${R.done} of 40 jobs finish inside the 30-second gateway timeout; the rest time out, the users retry, and ${R.timeouts} requests in all fail after burning ${R.waste.toFixed(0)} worker-minutes.</b> Minutes-long agent jobs belong on a queue: accept the job, return at once, and deliver the result by webhook.` };
      if (!st.dlq && R.lost) return { ok: false, msg: `<b>${R.lost} job${R.lost > 1 ? 's' : ''} failed three times and vanished: no result, no record, nobody told.</b> A dead-letter queue parks jobs that keep failing, with their traces, for a person to look at. Without it, the first you hear is a customer asking where their papers are.` };
      if (!st.durable) return { ok: false, msg: `<b>Without checkpoints, every crash starts the job over: ${R.waste.toFixed(1)} worker-minutes re-run${R.dlq ? `, and ${R.dlq} job${R.dlq > 1 ? 's' : ''} crashed often enough to land in the dead-letter queue` : ''}.</b> Checkpoint state after each step and resume from the last one; a crash then costs at most a step.` };
      return { ok: R.done >= 38, msg: `<b>${R.done} of 40 jobs finished${R.dlq ? `, ${R.dlq} parked in the dead-letter queue` : ''}, none lost.</b> Each crash resumed from its last checkpoint (${R.waste.toFixed(1)} worker-minutes re-run). With ${st.workers} worker${st.workers > 1 ? "s" : ""} the 95th-percentile wait is ${R.p95.toFixed(1)} min; ${R.p95 > 20 ? 'add workers to bring it down.' : 'queue depth and wait are the numbers to watch.'}` };
    }
    return { update: (dt) => { cols.forEach(c => c.userData.tick(dt)); bins.forEach(b => b.userData.tick(dt)); tank.userData.tick(dt); dial.userData.tick(dt); gw.userData.tick(dt); workers.forEach(w => w.userData.tick(dt));
      feed -= dt; if (feed < 0) { feed = 0.7; const req = st.mode === 'request'; belt.userData.send(req ? BAD : BLUE, { stop: req ? 0.93 : 1, size: 0.18 }); } belt.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Jobs that take minutes', home: true, say: 'A coffee exporter in Addis Ababa has an agent check shipment papers. Some checks take seconds; many take minutes.', act: m => m.set({ mode: 'request', workers: 4, durable: true, dlq: true }) },
    { t: 'As web requests', home: true, say: 'Served as plain web requests, most jobs hit the thirty-second timeout. Users retry, and the work starts over each time.', act: m => m.set({ mode: 'request' }) },
    { t: 'A queue', home: true, say: 'Put each job on a queue for a pool of workers, return at once, and deliver the result when it is ready.', act: m => m.set({ mode: 'queue' }) },
    { t: 'Checkpoints', home: true, say: 'Some runs crash part-way. With a checkpoint after every step, the job resumes instead of starting over.', act: m => m.set({ durable: true }) },
    { t: 'A place for failures', home: true, say: 'A job that keeps failing goes to a dead-letter queue, where a person can see it, with its trace.', act: m => m.set({ dlq: true }) },
    { t: 'Enough workers', home: true, say: 'With too few workers, jobs wait in the queue. Watch the queue depth and the tail of the wait.', act: m => m.set({ workers: 2 }) },
  ],
  check: [
    { q: 'A job takes five minutes. Which runtime shape?', options: ['A queue with workers, results by webhook', 'A web request', 'A cron job only'], answer: 0, why: 'Requests time out and retries repeat the work.', hint: 'Try Serve minutes-long jobs as requests.' },
    { q: 'What does durable execution save after a crash?', options: ['Everything up to the last checkpoint', 'Nothing', 'Only the logs'], answer: 0, why: 'Resume instead of restart.', hint: 'Try Run without checkpoints.' },
    { q: 'Why keep a dead-letter queue?', options: ['So jobs that keep failing are kept and seen, not lost', 'To speed up workers', 'To store results'], answer: 0, why: 'No DLQ, no record.', hint: 'Try Drop the dead-letter queue.' },
  ],
  terms: [
    ['Request-response', 'The user waits on one call for the whole job.'],
    ['Job queue', 'A list of jobs waiting for workers.'],
    ['Webhook', 'A call back to the user\'s system when the result is ready.'],
    ['Durable execution', 'Checkpointing state so a run resumes after a failure.'],
    ['Dead-letter queue', 'Where jobs that keep failing are parked for review.'],
    ['Queue depth', 'How many jobs are waiting.'],
  ],
  deeper: '<p><b>Event-driven and scheduled.</b> Agents can start on triggers (a new email, an opened pull request) or on a timer; make scheduled runs durable so a failed night resumes on the next tick.</p><p><b>Streaming.</b> For interactive work, stream partial output and measure time to first token and the tail; for voice, the latency budget is covered in the voice-pipeline lesson.</p><p><b>About this machine.</b> 40 seeded jobs of 0.3 to 8 minutes arriving every 1.5 minutes; each run crashes with probability 0.08 (two of the forty here); a discrete-event simulation of the workers, retries and queues, computed live.</p>',
  code: {
    title: 'Queue, checkpoint, dead-letter',
    note: 'Adapted from the course\'s production-runtimes lesson.',
    text: `
def worker(queue, store, dlq, agent, max_tries=3):
    while True:
        job = queue.get()
        state = store.load(job.id) or agent.start(job)      # resume if checkpointed
        try:
            while not state.done:
                state = agent.step(state)
                store.save(job.id, state)                   # checkpoint every step
            job.webhook(state.result)
        except Exception as err:
            job.tries += 1
            if job.tries < max_tries:
                queue.put(job)                              # retry from the checkpoint
            else:
                dlq.put(job, error=err, trace=store.trace(job.id))   # parked, not lost
`,
  },
};
