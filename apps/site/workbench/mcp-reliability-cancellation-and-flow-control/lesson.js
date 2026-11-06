// MCP reliability: a cash-transfer programme in Blantyre pays households through an MCP tool, disburse(household, period), called by an operations assistant.
// 1) A call's reply is lost when the network drops; the client retries with a new JSON-RPC id. A new id is not idempotency: only an idempotency key the server
//    records atomically with the payment (a ledger) makes the retry return the first result instead of paying again.
// 2) A cancel for a batch of 400 payments is sent at 59.8 s; the batch finished at 59.7 s. Cancellation is a race: completion won. The client must check the outcome,
//    not assume "cancelled" and re-run the batch.
// 3) The server restarts; 2,000 field tablets reconnect. Immediately, they arrive in one second; with jittered backoff, over 30 seconds. The server handles 150 a second.
// After reconnecting, clients refetch lists and reopen subscriptions; streams don't resume.
function run(st) {
  const E = [], harm = [];
  const add = (t, bad) => E.push({ t, bad });
  add('disburse(household 118, March) · id 41 · paid · the reply is lost when the network drops');
  if (st.idem) add('retry with id 42 and the same idempotency key "hh118-2026-03" · the ledger already has it · returns the first payment\'s receipt');
  else { add('retry with id 42, no idempotency key · the server sees a new request · household 118 paid a second time', true); harm.push('a household paid twice'); }
  add('batch of 400 · cancel sent at 59.8 s · the batch had completed at 59.7 s');
  if (st.race) add('client checks: completion won the race · records 400 payments as done · nothing re-run');
  else { add('client assumes "cancelled" and re-runs the batch tomorrow · 400 households paid twice', true); harm.push('a batch paid twice'); }
  add('server restarts · 2,000 tablets lose their connection');
  if (st.jitter) add('reconnect with backoff and jitter over 30 s · peak 80 a second (capacity 150) · each refetches its lists and reopens its subscription');
  else { add('all 2,000 reconnect in the same second · the server is overwhelmed, restarts again, twice', true); harm.push('a reconnect storm'); }
  return { E, harm };
}

export default {
  slug: 'mcp-reliability-cancellation-and-flow-control',
  title: 'Reliability: retries, cancels and reconnects without paying twice',
  description: 'A Blantyre cash-transfer programme pays households through an MCP tool. Replies get lost, cancels arrive late, two thousand tablets reconnect.',
  overview: 'Networks drop replies, so clients retry. A retry is a new JSON-RPC request with a new ID, and to the server it looks like a new call: a payment tool will pay again. Only an idempotency key, sent with the call and recorded by the server in the same atomic step as the payment, lets the retry return the first result. Cancellation is a race. A client may send notifications/cancelled (over stdio) or close the request\'s stream (over HTTP), but the work may already have finished; either outcome can win, so the client must find out which, never assume. Timeouts have two clocks, the client\'s and the server\'s, and a client that gives up may leave work running. Cancelling a request is not cancelling a task: long jobs have their own tasks/cancel. Flow control matters too: progress notifications and streamed output need bounded buffers, coalescing and proxies that don\'t hold events back. And when a server restarts, clients must reconnect with backoff and jitter, not all at once, then refetch their lists and reopen subscriptions, because streams don\'t resume.',
  keywords: ['idempotency key', 'MCP cancellation', 'retry safety', 'race condition', 'thundering herd', 'backoff with jitter', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-0.6, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.45, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { idem: true, race: true, jitter: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* household 118's house with a coin jar: one coin when the retry is safe, two (red) when it pays again */
    const HX0 = -2.3, HZ = -0.55;
    const house = P.box(0.5, 0.35, 0.45, '#E9E2D3', { r: 0.03 }); house.position.set(HX0, 0, HZ); S.add(house);
    const roof = P.box(0.56, 0.08, 0.5, '#8A5F3A', { r: 0.02 }); roof.position.set(HX0, 0.35, HZ); S.add(roof);
    const jar = P.jar(0.15, 0.4, { max: 4 }); jar.position.set(HX0 + 0.45, 0, HZ); S.add(jar);
    const ledM = new THREE.MeshLambertMaterial({ color: GOOD }), ledger = P.box(0.4, 0.12, 0.3, '#fff', { r: 0.03, material: ledM }); ledger.position.set(HX0 - 0.5, 0, HZ); S.add(ledger);
    /* the cancel race: a track; the batch block reaches the finish just before the cancel ball */
    const track = P.box(1.4, 0.03, 0.3, '#D9D4C7', { r: 0.02 }); track.position.set(-2.0, 0, 0.45); S.add(track);
    const finish = P.box(0.04, 0.3, 0.34, CHAR, { r: 0.01 }); finish.position.set(-1.3, 0, 0.45); S.add(finish);
    const batch = P.box(0.25, 0.18, 0.2, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: GOOD }) }); batch.userData.noFit = true; S.add(batch);
    const cancel = P.ball(0.08, RED, { material: new THREE.MeshLambertMaterial({ color: RED }) }); cancel.userData.noFit = true; S.add(cancel);
    const raceLamp = P.lamp(GOOD, { h: 0.45, r: 0.09 }); raceLamp.position.set(-1.15, 0, 0.75); S.add(raceLamp);
    /* reconnects per second over 30 s, under a glass shelf at the server's capacity */
    const HX = -0.2, H = 0.0012;
    const hp = P.box(1.6, 0.02, 0.5, '#FFFFFF', { r: 0.03 }); hp.position.set(HX, 0, 0.0); S.add(hp);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 30); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const capShelf = P.box(1.5, 0.02, 0.4, '#fff', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: CHAR, transparent: true, opacity: 0.35 }) }); capShelf.position.set(HX, 0.02 + 150 * H * 3, 0.0); S.add(capShelf);
    const twiceTw = P.tower(0.45, 0.45, RED, { size: 0.28 }); twiceTw.position.set(1.25, 0, -0.4); S.add(twiceTw);
    S.add(P.keep(-2.85, 1.5, 1.2, -0.85, 0.9));

    let R = null, clock = 0;
    function draw() {
      R = run(st); clock = 0;
      jar.userData.set({ n: st.idem ? 1 : 2, color: st.idem ? '#E3A72F' : RED }); ledM.color.set(st.idem ? GOOD : '#C9C4B6');
      raceLamp.userData.set({ color: st.race ? GOOD : RED, on: true });
      const per = Array.from({ length: 30 }, (_, i) => st.jitter ? Math.round(2000 / 30 * (1 + 0.2 * Math.sin(i * 1.7))) : (i === 0 ? 2000 : 0));
      per.forEach((n, i) => { const h = Math.min(1.1, n * H * 3); dummy.position.set(HX - 0.72 + i * 0.05, 0.02, 0.0); dummy.scale.set(0.04, Math.max(0.002, h), 0.3); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set(n > 150 ? BAD : GOOD)); });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const twice = (st.idem ? 0 : 1) + (st.race ? 0 : 400);
      twiceTw.userData.set({ h: 0.05 + Math.min(1, twice / 400) * 1.0 + (twice ? 0.1 : 0), cap: `${twice}`, color: twice ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      twiceTw.userData.tick(dt); clock += dt;
      const u = Math.min(1, (clock % 3) / 2.2);
      batch.position.set(-2.6 + 1.15 * u, 0.03, 0.45); cancel.position.set(-2.65 + 1.1 * Math.min(1, u * 0.98), 0.12, 0.45);
      batch.material.color.set(u >= 1 && !st.race ? BAD : GOOD);
    };
    const controls = [
      { type: 'toggle', label: 'Idempotency key on payments', short: 'Idempotency', get: () => st.idem, set: v => set({ idem: !!v }) },
      { type: 'toggle', label: 'Check who won a cancel race', short: 'Check cancel', get: () => st.race, set: v => set({ race: !!v }) },
      { type: 'toggle', label: 'Reconnect with backoff and jitter', short: 'Jitter', get: () => st.jitter, set: v => set({ jitter: !!v }) },
      { type: 'button', label: 'Replay the day', act: () => draw() },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.harm.length}`, sub: R.harm.join(', ') || 'none', bad: R.harm.length > 0, good: !R.harm.length }) },
      { label: 'Households paid twice', get: () => ({ v: `${(st.idem ? 0 : 1) + (st.race ? 0 : 400)}`, sub: 'should be 0', bad: !st.idem || !st.race, good: st.idem && st.race }) },
      { label: 'Reconnect peak', get: () => ({ v: st.jitter ? '~80/s' : '2,000/s', sub: 'capacity 150/s', bad: !st.jitter }) },
    ];
    const labels = [
      { name: 'pay', t: 'Household 118', d: 'Coins in its jar: one payment, or two (red) when a retry pays again; green box: the ledger keyed by idempotency', icon: 'money', atV: V(HX0 - 0.75, 0.1, HZ) },
      { name: 'race', t: 'The cancel race', d: 'The batch crosses the line just before the red cancel; the lamp is whether the client checked who won', icon: 'gauge', atV: V(-2.75, 0.05, 0.45) },
      { name: 'herd', t: 'Reconnects per second', d: 'Two thousand tablets after a restart; the glass shelf is the server\'s capacity', icon: 'layers', atV: V(HX + 0.85, 0.4, 0) },
      { name: 'twice', t: 'Paid twice', d: 'Households, should be none', icon: 'stop', atV: V(1.5, 0.3, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Retry with a new ID only', hint: 'no idempotency key', on: () => set({ ...D0, idem: false }), off: reset },
      { label: 'Cancel always wins', hint: 'assume nothing happened', on: () => set({ ...D0, race: false }), off: reset },
      { label: 'Everyone reconnects at once', hint: 'no backoff, no jitter', on: () => set({ ...D0, jitter: false }), off: reset },
    ];
    function status() {
      if (!st.idem) return { ok: false, msg: '<b>The reply was lost, the client retried with a new request ID, and household 118 was paid twice.</b> A new JSON-RPC ID only correlates a reply; it says nothing about whether the work already happened. Send an idempotency key and have the server record it in the same atomic step as the payment, so a retry returns the first result.' };
      if (!st.race) return { ok: false, msg: '<b>The cancel arrived 0.1 s after the batch finished. The client assumed it had worked, re-ran the batch, and 400 households were paid twice.</b> Cancellation is a race; completion can win. After a cancel, find out what actually happened, from the reply or the ledger, before doing anything else.' };
      if (!st.jitter) return { ok: false, msg: '<b>After a restart, all 2,000 tablets reconnected in the same second, more than ten times capacity, and knocked the server over again.</b> Reconnect with exponential backoff and random jitter, then refetch lists and reopen subscriptions; streams don\'t resume.' };
      return { ok: true, msg: '<b>Three bad moments, no harm.</b> The lost reply\'s retry returned the first receipt from the ledger; the late cancel was checked and the completed batch recorded as done; and the 2,000 tablets came back over thirty seconds, never above capacity, each refetching its lists.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Payments over MCP', home: true, say: 'A cash-transfer programme in Blantyre pays households through an MCP tool. Payments must happen once: not zero times, not twice.', act: m => m.set({ idem: true, race: true, jitter: true }) },
    { t: 'A lost reply', home: true, say: 'A reply is lost and the client retries. The retry carries the same idempotency key, so the server\'s ledger returns the first receipt.', act: m => m.set({ idem: true }) },
    { t: 'A new ID is not enough', home: true, say: 'Retry with only a new request ID, and the server sees a new payment. The household is paid twice.', act: m => m.set({ idem: false }) },
    { t: 'A late cancel', home: true, say: 'A cancel arrives a tenth of a second after the batch finished. Cancellation is a race. Assume it won, re-run the batch, and four hundred households are paid twice.', act: m => m.set({ idem: true, race: false }) },
    { t: 'A restart', home: true, say: 'The server restarts and two thousand tablets reconnect in the same second. The server falls over again.', act: m => m.set({ race: true, jitter: false }) },
    { t: 'Spread out', home: true, say: 'With backoff and jitter, they return over half a minute, under capacity, and each refetches its lists before carrying on.', act: m => m.set({ jitter: true }) },
  ],
  check: [
    { q: 'Why isn\'t a new JSON-RPC ID enough to make a retry safe?', options: ['The server can\'t tell it from a new call; only an idempotency key can', 'IDs are random', 'Retries are always safe'], answer: 0, why: 'Record the key atomically with the effect.', hint: 'Try Retry with a new ID only.' },
    { q: 'A cancel is sent just as the work finishes. What happened?', options: ['Either could have won: check the outcome', 'It was cancelled', 'It failed'], answer: 0, why: 'Cancellation is a race.', hint: 'Try Cancel always wins.' },
    { q: 'Why add jitter to reconnects?', options: ['So thousands of clients don\'t return in the same instant', 'To slow clients down', 'Servers require it'], answer: 0, why: 'A reconnect storm can knock the server over again.', hint: 'Try Everyone reconnects at once.' },
  ],
  terms: [
    ['Idempotency key', 'A key that makes repeating a request return the first result instead of acting again.'],
    ['Cancellation race', 'Work and its cancel can cross; either may win.'],
    ['Two clocks', 'Client and server time out separately; work can outlive the client\'s patience.'],
    ['Backpressure', 'Slowing or bounding a producer so a consumer isn\'t overwhelmed.'],
    ['Thundering herd', 'Many clients acting at the same instant, such as reconnecting.'],
    ['Jitter', 'Random spread added to retry and reconnect delays.'],
  ],
  deeper: '<p><b>The ledger must be atomic and durable.</b> Record the key and the effect in one transaction; a key written after the payment, or kept in memory, fails on the crash you built it for.</p><p><b>Request cancel versus task cancel.</b> Cancelling a request stops waiting for its reply; a long-running task has its own tasks/cancel, honoured cooperatively.</p><p><b>Flow control.</b> Bound buffers for progress and streamed output, coalesce progress events, and make sure proxies don\'t buffer server-sent events until the end.</p><p><b>About this machine.</b> The three moments follow the file header; the reconnect histogram assumes 2,000 clients and 150 reconnects a second of capacity.</p>',
  code: {
    title: 'An idempotent payment',
    note: 'Adapted from the course\'s MCP reliability lesson.',
    text: `
def disburse(household, period, idempotency_key):
    with db.transaction():
        prior = db.ledger.get(idempotency_key, for_update=True)
        if prior:
            return prior.receipt                      # a retry: same answer, no new payment
        receipt = payments.send(household, period)
        db.ledger.insert(idempotency_key, receipt)    # in the same transaction
        return receipt

# client: reuse the key on every retry, with a new JSON-RPC id each time
key = f"hh{household}-{period}"
for attempt in range(4):
    try:
        return mcp.call("disburse", {"household": household, "period": period,
                                     "idempotency_key": key})
    except ConnectionLost:
        sleep(2 ** attempt * (1 + 0.5 * random()))
`,
  },
};
