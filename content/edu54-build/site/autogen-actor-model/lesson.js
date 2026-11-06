// The actor model (AutoGen v0.4 core): a Kampala boda-boda dispatch handles 8 ride requests through three agents: pricing (2 time units), driver
// matching (3) and notify (1). Synchronous calls block: each request runs start to finish before the next. Actors each own an inbox and work through it
// one message at a time, all three at once, so requests flow like a pipeline. A crash in pricing on request 4: a synchronous chain stops the batch;
// a supervised runtime retries the message; an unsupervised one drops it silently. Shared state: two matchers read and write one driver count;
// as actors, the driver pool owns its state and serialises the updates. Everything below is a discrete-event simulation computed live.
const N = 8, COST = { price: 2, match: 3, notify: 1 }, STAGES = ['price', 'match', 'notify'];
function simulate(o) {
  const ev = [], fate = Array(N).fill('done');
  if (o.mode === 'sync') {
    let t = 0;
    for (let r = 0; r < N; r++) {
      for (const s of STAGES) {
        if (o.crash && s === 'price' && r === 3) { ev.push({ r, s, a: t, b: t + 0.5, crash: true }); for (let k = r; k < N; k++) fate[k] = 'aborted'; return { ev, fate, end: t + 0.5 }; }
        ev.push({ r, s, a: t, b: t + COST[s] }); t += COST[s];
      }
    }
    return { ev, fate, end: t };
  }
  const free = { price: 0, match: 0, notify: 0 }; let end = 0;
  for (let r = 0; r < N; r++) {
    let ready = 0;
    for (const s of STAGES) {
      let a = Math.max(ready, free[s]);
      if (o.crash && s === 'price' && r === 3) {
        ev.push({ r, s, a, b: a + 0.5, crash: true }); free[s] = a + 0.5;
        if (!o.supervise) { fate[r] = 'lost'; break; }
        a = a + 0.5;
      }
      const b = a + COST[s]; ev.push({ r, s, a, b, retry: o.crash && s === 'price' && r === 3 }); free[s] = b; ready = b; end = Math.max(end, b);
    }
  }
  return { ev, fate, end };
}
function drivers(o) {
  // 5 drivers; 8 requests matched by two matcher workers. Shared: each reads the count, waits for the map lookup, then writes count − 1.
  let count = 5; const log = []; let booked = 0;
  if (o.shared) {
    for (let r = 0; r < N; r += 2) { const seenA = count, seenB = count; const okA = seenA > 0, okB = seenB > 0; if (okA) booked++; if (okB) booked++; count = Math.max(0, (okB ? seenB - 1 : seenB)); log.push([seenA, seenB]); }
  } else {
    for (let r = 0; r < N; r++) { if (count > 0) { count--; booked++; } }
  }
  return { booked, double: Math.max(0, booked - 5) };
}

export default {
  slug: 'autogen-actor-model',
  title: 'The actor model: agents that only send messages',
  description: 'A Kampala boda-boda dispatch prices, matches and texts eight rides. Wire its agents as actors with inboxes, and survive a crash.',
  overview: 'In the actor model each agent is an actor: it has private state, an inbox, and a handler that reacts to one message at a time by replying, sending to other actors, spawning actors, or updating its own state. Actors never share memory; they only send messages. AutoGen 0.4 rebuilt itself on this: a core layer of actors, topics and an asynchronous runtime, a high-level chat layer on top (round-robin and selector group chats), and extensions for models and tools. Decoupling the sender from the receiver has three consequences. Concurrency: many messages are in flight, and each actor works through its inbox while the others work through theirs, so requests flow through like a pipeline whose speed is set by the slowest stage. Fault isolation: when one actor\'s handler fails, the runtime catches it and decides (retry, log, dead-letter) while everything else carries on; a synchronous call chain fails all the way up instead. Distribution: an inbox plus a transport looks the same whether the actor runs in the same process or on another machine. State owned by one actor is updated one message at a time, so two agents can\'t both book the last driver. AutoGen itself is now in maintenance mode, its successor framework carries the actor idea forward, and every message can emit an OpenTelemetry span.',
  keywords: ['actor model', 'AutoGen', 'multi-agent', 'message passing', 'concurrency', 'fault isolation', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.25, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 'actor', crash: true, supervise: true, shared: false }, st = { ...D0, t: 0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', IDLE = '#B9B3A5';
    const SC = { price: '#5B8DB8', match: '#7B6FA8', notify: '#1F9E89' };
    /* three actors (blue pricing, purple matcher, green notifier), each with its own inbox: a stack of waiting messages */
    const AX = { price: -2.4, match: -1.1, notify: 0.2 }, AZ = -0.65;
    const actors = Object.fromEntries(STAGES.map(s => { const pad = P.cyl(0.32, 0.08, '#3A3D4A'); pad.position.set(AX[s], 0, AZ); S.add(pad);
      const bot = P.robot(SC[s], { scale: 0.85 }); bot.position.set(AX[s], 0.08, AZ); S.add(bot);
      const inbox = Array.from({ length: 8 }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#F4F1EA' }), x = P.box(0.3, 0.06, 0.22, '#fff', { r: 0.01, material: m }); x.position.set(AX[s] + 0.48, i * 0.075, AZ + 0.12); x.userData.noFit = true; S.add(x); return { x, m }; });
      return [s, { bot, inbox }]; }));
    [['price', 'match'], ['match', 'notify']].forEach(([a, b]) => { const g = P.arrow(V(AX[a] + 0.32, 0.45, AZ - 0.15), V(AX[b] - 0.32, 0.45, AZ - 0.15), 0.025, '#8E8C84'); S.add(g); });
    /* the timeline: one lane per actor; a bar for each message it handled, as long as it took (red: the crash, gold: the retry) */
    const TX0 = -2.95, TW = 3.5, LZ = k => 0.35 + k * 0.28;
    const lanes = STAGES.map((s, k) => { const l = P.box(TW + 0.1, 0.03, 0.22, '#E4E0D6', { r: 0.02 }); l.position.set(TX0 + TW / 2, 0, LZ(k)); S.add(l); return l; });
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 40); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const cursor = P.box(0.025, 0.3, 0.9, CHAR, { r: 0 }); cursor.position.set(TX0, 0, LZ(1)); cursor.userData.noFit = true; S.add(cursor);
    /* the eight rides: green texted, red aborted, grey lost (sunk), beige still on the way */
    const RX = i => 1.35 + (i % 4) * 0.42, RZ = i => -0.8 + Math.floor(i / 4) * 0.42;
    const rides = Array.from({ length: N }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#EEEAE0' }), b = P.box(0.3, 0.24, 0.3, '#fff', { r: 0.05, material: m }); b.position.set(RX(i), 0, RZ(i)); S.add(b); return { b, m }; });
    /* the driver pool: five drivers; a booking block on each. Two on one driver: double-booked */
    const DXp = i => 1.35 + i * 0.32, DZp = 0.65;
    const drv = Array.from({ length: 5 }, (_, i) => { const r = P.robot('#8A5F3A', { scale: 0.5 }); r.position.set(DXp(i), 0, DZp); S.add(r); const bk = [0, 1].map(k => { const m = new THREE.MeshLambertMaterial({ color: GOLD }), b = P.box(0.18, 0.1, 0.18, '#fff', { r: 0.02, material: m }); b.position.set(DXp(i), 0.5 + k * 0.12, DZp); S.add(b); return { b, m }; }); return { r, bk }; });
    S.add(P.keep(-3.05, 3.05, 1.15, -1.1, 1.05));

    let R = null, Dv = null;
    function plan() { R = simulate(st); Dv = drivers(st); st.t = 0; paint(); }
    function paint() {
      const T = st.t, scale = TW / Math.max(R.end, 1);
      R.ev.forEach((e, i) => { const on = e.a <= T, w = on ? Math.max(0.01, (Math.min(T, e.b) - e.a) * scale - 0.01) : 0.0001; dummy.rotation.set(0, 0, 0); dummy.scale.set(w, 0.14, 0.18); dummy.position.set(TX0 + e.a * scale + w / 2, 0.03, LZ(STAGES.indexOf(e.s))); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set(e.crash ? RED : e.retry ? GOLD : SC[e.s])); });
      for (let i = R.ev.length; i < 40; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      cursor.position.x = TX0 + Math.min(T, R.end) * scale;
      STAGES.forEach(s => { const A = actors[s], waiting = R.ev.filter(e => e.s === s && e.a > T).length, busy = R.ev.some(e => e.s === s && e.a <= T && e.b > T), crash = R.ev.some(e => e.s === s && e.crash && e.a <= T && e.b > T);
        A.bot.userData.set({ busy, lamp: crash ? RED : busy ? GOLD : IDLE }); A.inbox.forEach((x, i) => { x.x.visible = st.mode === 'actor' && i < waiting; }); });
      const doneBy = r => { const last = R.ev.filter(e => e.r === r && e.s === 'notify')[0]; return last ? last.b : Infinity; };
      rides.forEach((q, r) => { const f = R.fate[r], d = doneBy(r) <= T; q.m.color.set(f === 'aborted' ? RED : f === 'lost' ? '#8E8C84' : d ? GOOD : '#EEEAE0'); q.b.position.y = f === 'lost' ? -0.18 : 0; });
      drv.forEach((d, i) => { const n = Math.min(2, i < Dv.booked ? 1 + (i >= 5 - Dv.double ? 1 : 0) : 0); d.bk.forEach((b, k) => { b.b.visible = k < n; b.m.color.set(n > 1 ? RED : GOLD); }); });
    }
    plan();
    const set = p => { Object.assign(st, p); plan(); };
    const controls = [
      { type: 'buttons', label: 'Wiring', options: ['Direct calls', 'Actors'], get: () => st.mode === 'sync' ? 0 : 1, act: i => set({ mode: i ? 'actor' : 'sync' }) },
      { type: 'toggle', label: 'Pricing crashes on ride 4', short: 'Crash', get: () => st.crash, set: v => set({ crash: !!v }) },
      { type: 'toggle', label: 'Runtime retries failed messages', short: 'Supervise', get: () => st.supervise, set: v => set({ supervise: !!v }) },
      { type: 'toggle', label: 'Matchers share one driver count', short: 'Shared state', get: () => st.shared, set: v => set({ shared: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => { st.t = 0; paint(); } },
    ];
    const readouts = [
      { label: 'All texted by', get: () => ({ v: R.fate.every(f => f === 'done') ? `t = ${R.end.toFixed(1)}` : `${R.fate.filter(f => f === 'done').length} of ${N}`, sub: st.mode === 'sync' ? 'one at a time' : 'pipelined', good: R.fate.every(f => f === 'done') && st.mode === 'actor', bad: !R.fate.every(f => f === 'done') }) },
      { label: 'Throughput', get: () => ({ v: `${(R.end / N).toFixed(1)}`, sub: 'time units per ride' }) },
      { label: 'Double bookings', get: () => ({ v: String(Dv.double), sub: '5 drivers', good: !Dv.double, bad: Dv.double > 0 }) },
    ];
    const labels = [
      { name: 'actor', t: 'Three actors', d: 'Blue pricing, purple matcher, green notifier. Each owns its state and an inbox: the stack of messages waiting', icon: 'user', atV: V(AX.price - 0.35, 0.3, AZ) },
      { name: 'time', t: 'Who works when', d: 'A lane per actor and a bar per message, as long as it took. Red: the crash. Gold: the retry', icon: 'eye', atV: V(TX0 - 0.1, 0.1, LZ(1)) },
      { name: 'rides', t: 'Eight rides', d: 'Green texted, red aborted, grey lost without a word', icon: 'check', atV: V(RX(3) + 0.2, 0.15, RZ(3)) },
      { name: 'pool', t: 'Five drivers', d: 'A booking block per ride matched. Two on one driver: double-booked', icon: 'box', atV: V(DXp(4) + 0.2, 0.15, DZp) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Call the agents directly', hint: 'synchronous chain', on: () => set({ ...D0, mode: 'sync' }), off: reset },
      { label: 'Let a crash go unsupervised', hint: 'no retry, no dead-letter', on: () => set({ ...D0, supervise: false }), off: reset },
      { label: 'Share the driver count', hint: 'read, wait, write', on: () => set({ ...D0, shared: true }), off: reset },
    ];
    function status() {
      if (st.mode === 'sync' && st.crash) return { ok: false, msg: `<b>With direct calls, pricing\'s crash on ride 4 propagates up the chain and aborts rides 4 to 8; rides 1 to 3 took ${(R.ev.filter(e => e.r < 3).slice(-1)[0] || { b: 0 }).b} time units, one after another.</b> A synchronous call blocks the caller and shares its fate. As actors, the runtime catches the failure in one handler, retries that message, and every other ride carries on.` };
      if (st.mode === 'sync') return { ok: false, msg: `<b>One request at a time, eight rides take ${R.end} time units: ${(R.end / N).toFixed(1)} per ride.</b> Each agent waits while the others work. As actors, all three work through their inboxes at once, and the pipeline runs at the pace of its slowest stage, matching.` };
      if (st.crash && !st.supervise) return { ok: false, msg: '<b>Pricing crashed on ride 4 and, with no supervision, the message was dropped: the customer is never texted and nobody is told.</b> Fault isolation only helps if the runtime decides what happens to a failed message: retry it, or move it to a dead-letter queue someone watches.' };
      if (st.shared) return { ok: false, msg: `<b>Two matchers read the same driver count, both see a free driver, and both book: ${Dv.booked} bookings for 5 drivers, ${Dv.double} double-booked.</b> Shared state with read-then-write loses updates. Let one actor own the driver pool; booking becomes a message it handles one at a time.` };
      return { ok: true, msg: `<b>All ${N} rides texted by t = ${R.end.toFixed(1)}, ${(R.end / N).toFixed(1)} time units per ride, against ${simulate({ ...st, mode: 'sync', crash: false }).end / N} with direct calls.</b> ${st.crash ? 'Pricing crashed on ride 4; the runtime caught it and retried that message while the other actors kept going. ' : ''}The driver pool owns its count, so 5 drivers made 5 bookings and no more.` };
    }
    return {
      update: dt => { STAGES.forEach(k => actors[k].bot.userData.tick(dt)); drv.forEach(d => d.r.userData.tick(dt)); if (st.t < R.end) { st.t = Math.min(R.end, st.t + dt * 6); paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Three agents, eight rides', home: true, say: 'A boda-boda dispatch in Kampala prices each ride, matches a driver and texts the customer, for eight requests at once.', act: m => m.set({ mode: 'sync', crash: false, supervise: true, shared: false }) },
    { t: 'Direct calls', home: true, say: 'Wired as direct calls, each ride runs start to finish before the next one starts. The agents mostly wait.', act: m => m.set({ mode: 'sync' }) },
    { t: 'Actors and inboxes', home: true, say: 'As actors, each agent owns an inbox and works through it. All three work at once, like a pipeline.', act: m => m.set({ mode: 'actor' }) },
    { t: 'A crash', home: true, say: 'Pricing crashes on ride four. The runtime catches it in that one handler and retries the message; the other rides carry on.', act: m => m.set({ crash: true, supervise: true }) },
    { t: 'Unsupervised', home: true, say: 'Without supervision, the failed message simply disappears, and that customer is never texted.', act: m => m.set({ supervise: false }) },
    { t: 'Who owns the count?', home: true, say: 'Two matchers sharing one count of drivers both book the last one. Give the driver pool to one actor.', act: m => m.set({ supervise: true, shared: true }) },
  ],
  check: [
    { q: 'What can two actors share?', options: ['Nothing: they only send messages', 'Memory', 'A database row they both update'], answer: 0, why: 'Private state, one inbox.', hint: 'Try Share the driver count.' },
    { q: 'Pricing crashes on one message. In an actor runtime, what happens to the rest?', options: ['They continue; the runtime retries or dead-letters the failed one', 'Everything stops', 'The caller crashes'], answer: 0, why: 'Fault isolation.', hint: 'Try Call the agents directly.' },
    { q: 'What sets the speed of a pipeline of actors?', options: ['Its slowest stage', 'The fastest stage', 'The number of messages'], answer: 0, why: 'Matching at 3 units sets the pace.', hint: 'Compare the timelines.' },
  ],
  terms: [
    ['Actor', 'An agent with private state, an inbox and a message handler.'],
    ['Inbox', 'The queue of messages an actor works through one at a time.'],
    ['Asynchronous send', 'Putting a message in an inbox without waiting for a reply.'],
    ['Supervision', 'What the runtime does when a handler fails: retry, log, dead-letter.'],
    ['Dead-letter queue', 'Where undeliverable or failed messages go to be looked at.'],
    ['Group chat', 'A team of agents that take turns, in rotation or chosen by a selector.'],
  ],
  deeper: '<p><b>AutoGen\'s layers.</b> Core (actors, topics, an async runtime), AgentChat (assistant and user-proxy agents, round-robin and selector group chats) and extensions for model providers and tools. Its maintenance successor keeps the actor model.</p><p><b>Where else.</b> Choosing between graphs, crews, chats and actors is covered in the framework trade-offs lesson; multi-agent topologies return in the multi-agent phase.</p><p><b>About this machine.</b> A discrete-event simulation: pricing takes 2 units, matching 3, notifying 1; a crash costs 0.5 before the retry. The double-booking comes from two read-then-write updates on one count.</p>',
  code: {
    title: 'An actor: an inbox and a handler',
    note: 'Adapted from the course\'s actor-model lesson.',
    text: `
import asyncio

class Actor:
    def __init__(self, runtime, name):
        self.inbox, self.runtime, self.name = asyncio.Queue(), runtime, name

    async def run(self):
        while True:
            msg = await self.inbox.get()           # one message at a time
            try:
                await self.handle(msg)
            except Exception as err:               # isolated: the runtime decides
                await self.runtime.on_failure(self, msg, err)

class DriverPool(Actor):
    def __init__(self, runtime, drivers):
        super().__init__(runtime, "pool"); self.free = drivers   # private state

    async def handle(self, msg):
        ok = self.free > 0
        self.free -= ok
        await self.runtime.send(msg.reply_to, {"ride": msg.ride, "booked": ok})
`,
  },
};
