// Batch APIs (phase 17, lesson 15): a Windhoek mining firm's nightly report summarises 50,000 documents. Three lanes: interactive, semi-interactive, batch. The batch lane takes half off within 24 hours; cached input stacks on top.
// Jobs have deadlines, so the wrong lane either wastes money or misses the deadline. Costs follow one sum from the shared prompt share and the discounts.
const DOCS = 50000, FULL = 0.04;
const JOB = {
  night: { n: 'Nightly report', limit: 24, docs: DOCS, sh: 0.8 },
  morning: { n: 'Dashboard by 7 in the morning', limit: 6, docs: 6000, sh: 0.6 },
  chat: { n: 'A live customer reply', limit: 0.01, docs: 200, sh: 0.3 },
};
function run(o) {
  const j = JOB[o.job], base = j.docs * FULL;
  const lane = { sync: 1, flex: 0.75, batch: 0.5 }[o.lane], turn = { sync: 0.005, flex: 2, batch: o.worst ? 24 : 6 }[o.lane];
  const cached = o.cache ? 1 - j.sh * 0.9 : 1;
  const cost = base * lane * cached, late = turn > j.limit;
  return { j, base, cost, turn, late, save: 1 - cost / base };
}

export default {
  slug: 'batch-apis',
  title: 'Batch APIs: half price if you can wait',
  description: 'Fifty thousand documents overnight. Put each job in the right lane, stack a cache on top, and see the bill fall.',
  overview: 'Most providers offer a batch API: send a file of requests, get results within 24 hours, pay half. It is the cheapest lever in LLM costs and the one most often left alone, usually because teams assume everything must be real-time. Sort the work by who is waiting. Nobody waits on a nightly report. Someone reads a dashboard at seven, so that job has a deadline. A person in a chat can\'t wait at all. Stack cached input on top, and a job with a long shared prompt falls much further. Two traps remain: batch usually comes back early, but the guarantee is 24 hours, and file formats differ between providers.',
  keywords: ['batch API', 'LLM costs', 'cost optimization', 'prompt caching', 'overnight jobs', 'throughput'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { job: 'night', lane: 'batch', cache: true, worst: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const LZ = { sync: -0.5, flex: 0, batch: 0.5 }, SP = { sync: 2.4, flex: 1.1, batch: 0.45 };
    const belts = Object.keys(LZ).map(k => { const b = add(P.belt(V(-2.3, 0.0, LZ[k]), V(0.9, 0.0, LZ[k]), { w: 0.3, speed: SP[k] })); return { k, b, u: 0 }; });
    const clock = add(P.dial(0.42)); clock.position.set(1.5, 0.03, -0.3);
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(1.5, 0.03, 0.42);
    const towers = [0, 1].map(i => { const t = add(P.tower(0.34, 0.5, i ? GOOD : GREY)); t.position.set(2.05 + i * 0.4, 0.03, 0); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.5, 2.6, 1.15, -0.72, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      clock.userData.set({ v: Math.min(1, R.turn / 24) });
      lamp.userData.set({ color: R.late ? BAD : GOOD, on: true });
      const scale = 1 / Math.max(...Object.values(JOB).map(j => j.docs * FULL));
      towers[0].userData.set({ h: Math.max(0.05, R.base * scale * 1.1) }); towers[1].userData.set({ h: Math.max(0.03, R.cost * scale * 1.1), color: R.late ? BAD : GOOD });
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['night', 'morning', 'chat'], LK = ['sync', 'flex', 'batch'];
    const controls = [
      { type: 'buttons', label: 'The job', options: ['Nightly report', 'Morning dashboard', 'Live reply'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'The lane', options: ['Interactive', 'Semi-interactive', 'Batch'], get: () => LK.indexOf(st.lane), act: i => set({ lane: LK[i] }) },
      { type: 'toggle', label: 'Cached input on the shared prompt', short: 'Cache', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'toggle', label: 'Plan for the 24-hour guarantee, not the usual speed', short: 'Worst case', get: () => st.worst, set: v => set({ worst: !!v }) },
    ];
    const readouts = [
      { label: 'Cost', get: () => ({ v: M(R.cost), sub: `sync with no cache: ${M(R.base)}`, good: R.save > 0.4 }) },
      { label: 'Returns in', get: () => ({ v: R.turn < 0.1 ? 'seconds' : `${R.turn} h`, sub: `needed within ${R.j.limit < 0.1 ? 'seconds' : R.j.limit + ' h'}`, good: !R.late, bad: R.late }) },
      { label: 'Saved', get: () => ({ v: `${Math.round(R.save * 100)}%`, sub: R.j.n }) },
    ];
    const labels = [
      { name: 'l', t: 'Three lanes', d: 'Back fast, front slow and cheap', icon: 'link', atV: V(-2.35, 0.1, 0) },
      { name: 'c', t: 'Before and after', d: 'Coral: it missed the deadline', icon: 'money', atV: V(2.6, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run the nightly report live', hint: 'nobody is waiting', on: () => set({ ...D0, lane: 'sync', cache: false }), off: reset },
      { label: 'Batch a customer reply', hint: 'a person is waiting', on: () => set({ ...D0, job: 'chat' }), off: reset },
      { label: 'Count on batch by 7 o\'clock', hint: 'usually early is not a promise', on: () => set({ ...D0, job: 'morning', worst: true }), off: reset },
    ];
    function status() {
      if (R.late) return { ok: false, msg: `<b>${R.j.n} needs results in ${R.j.limit < 0.1 ? 'seconds' : R.j.limit + ' hours'}, and this lane can take ${R.turn} hours.</b> ${st.job === 'chat' ? 'A person is waiting, and no discount makes that acceptable.' : 'Batch usually returns early, but only 24 hours is promised. Use a lane whose guarantee meets the deadline.'}` };
      if (st.lane === 'sync' && st.job !== 'chat') return { ok: false, msg: `<b>${M(R.cost)} to buy speed nobody uses.</b> The report is read the next morning. "Real-time" is a habit here, not a need. Batch takes half off at once.` };
      if (!st.cache) return { ok: true, msg: `<b>${M(R.cost)}: ${Math.round(R.save * 100)}% saved.</b> Add cached input: the shared prompt is ${Math.round(R.j.sh * 100)}% of the tokens here.` };
      return { ok: true, msg: `<b>${M(R.cost)} against ${M(R.base)}: ${Math.round(R.save * 100)}% saved.</b> Lane and cache multiply. Same work, a couple of configuration changes.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt));
        belts.forEach(B => { B.u += dt; if (B.k === st.lane && B.u > 0.8 && B.b.userData.count() < 4) { B.u = 0; B.b.userData.send('#F4F1EA', { size: 0.16 }); } });
      },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A nightly report', home: true, say: 'A mining firm in Windhoek summarises fifty thousand documents every night. It runs live, one call at a time, and nobody is watching.', act: m => m.set({ job: 'night', lane: 'sync', cache: false, worst: false }) },
    { t: 'Half off', home: true, say: 'Send it as a batch file. Results come within a day, at half the price. Same model, same output.', act: m => m.set({ job: 'night', lane: 'batch', cache: false, worst: false }) },
    { t: 'Stack the cache', home: true, say: 'Every call shares a long prompt. Cached input stacks on the discount, and the bill falls further.', act: m => m.set({ job: 'night', lane: 'batch', cache: true, worst: false }) },
    { t: 'Who is waiting?', home: true, say: 'A live reply can\'t wait. Sort your work by who is waiting for it.', act: m => m.set({ job: 'chat', lane: 'sync', cache: true, worst: false }) },
    { t: 'Deadlines', home: true, say: 'A dashboard must be ready by seven. Batch usually makes it, but only a day is promised.', act: m => m.set({ job: 'morning', lane: 'batch', cache: true, worst: true }) },
    { t: 'The middle lane', home: true, say: 'A semi-interactive lane gives a smaller discount and a tighter turnaround. Put each job in its own lane.', act: m => m.set({ job: 'morning', lane: 'flex', cache: true, worst: false }) },
  ],
  check: [
    { q: 'What do batch APIs usually offer?', options: ['About half price within 24 hours', 'Free tokens', 'Faster replies'], answer: 0, why: 'You trade waiting for a discount.', hint: 'Choose Batch.' },
    { q: 'What decides the lane?', options: ['Who is waiting, and by when', 'The model name', 'The file size only'], answer: 0, why: 'Sort jobs by their deadline.', hint: 'Try each job.' },
    { q: 'Why not plan on batch\'s usual speed?', options: ['Only 24 hours is guaranteed', 'It is always late', 'It costs more on time'], answer: 0, why: 'Early is common, not promised.', hint: 'Try Count on batch by 7 o\'clock.' },
  ],
  terms: [
    ['Batch API', 'A file of requests answered within a set window.'],
    ['Turnaround', 'How long results take.'],
    ['Interactive', 'A person is waiting now.'],
    ['Cached input', 'Discounted tokens for a repeated prompt.'],
    ['Deadline', 'When results must be ready.'],
    ['Output schema drift', 'Batch formats differing between providers.'],
  ],
  deeper: '<p><b>Discounts multiply.</b> Check that your provider allows caching with batch, and how the two combine.</p><p><b>Retries.</b> Batch files can partly fail. Reconcile by a request id you set, and resubmit only what failed.</p><p><b>Numbers.</b> Base costs and the middle lane are round figures. The half-price, 24-hour offer is common across major providers.</p>',
  code: {
    title: 'Send a batch',
    note: 'Adapted from the course\'s batch sketch (code/main.py).',
    text: `
batch = client.messages.batches.create(requests=[
    {"custom_id": doc.id,
     "params": {"model": MODEL, "max_tokens": 300,
                "system": CACHED_SYSTEM,
                "messages": [{"role": "user", "content": doc.text}]}}
    for doc in documents])

while client.messages.batches.retrieve(batch.id).processing_status != "ended":
    time.sleep(600)
`,
  },
};
