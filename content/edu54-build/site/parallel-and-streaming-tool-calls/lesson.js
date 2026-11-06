// Parallel and streaming tool calls: a school trip planner in Kampala checks four things for a class trip to Jinja.
// Timings (seconds): a model turn thinks for 0.8, then streams each call's arguments in 0.25; the final answer takes 1.0.
// Tools: bus seats 0.6, weather in Jinja 0.4, weather in Kampala 0.5 (the same tool twice), hostel rooms 0.9.
// One at a time: a model turn per call, then the call. Parallel: one turn emits all four calls; they run together once the turn ends.
// Streamed start: each call starts as soon as its own arguments are complete. On the wire the four calls' argument chunks interleave.
// The second request books and pays: reserve_seats must finish before pay_deposit can find the reservation.
const CALLS = [
  { id: 'call_1', name: 'check_bus_seats', args: '{"route": "Kampala-Jinja", "date": "Fri"}', e: 0.6, res: '38 seats free' },
  { id: 'call_2', name: 'get_weather', args: '{"town": "Jinja"}', e: 0.4, res: 'Jinja: dry, 27°' },
  { id: 'call_3', name: 'get_weather', args: '{"town": "Kampala"}', e: 0.5, res: 'Kampala: storms after 3 pm' },
  { id: 'call_4', name: 'find_hostel_rooms', args: '{"town": "Jinja", "beds": 36}', e: 0.9, res: '40 beds at the youth hostel' },
];
const BOOK = [
  { id: 'call_1', name: 'reserve_seats', args: '{"route": "Kampala-Jinja", "seats": 36}', e: 0.7, res: 'reservation R-5512' },
  { id: 'call_2', name: 'pay_deposit', args: '{"reservation": "R-5512"}', e: 0.5, res: 'deposit paid', dep: 0 },
];
const THINK = 0.8, ARG = 0.25, FINAL = 1.0;
function run(st) {
  const L = st.req ? BOOK : CALLS, bars = [], out = [];
  let t = 0, fail = null;
  if (st.mode === 0) {
    L.forEach((c, i) => { bars.push({ lane: 'model', a: t, b: t + THINK + ARG }); t += THINK + ARG; bars.push({ lane: i, a: t, b: t + c.e, c }); out.push({ c, at: t + c.e }); t += c.e; });
  } else {
    bars.push({ lane: 'model', a: 0, b: THINK + ARG * L.length }); t = THINK + ARG * L.length;
    /* argument chunks interleave on the wire: one chunk per call in turn */
    L.forEach((c, i) => { const done = THINK + ARG * (i + 1); const start = st.mode === 2 ? done : t; let s = start;
      if (c.dep !== undefined && st.deps) s = Math.max(s, out[c.dep] ? out[c.dep].at : start);
      else if (c.dep !== undefined && !st.deps) { const prior = out[c.dep]; if (!prior || prior.at > s) fail = `${c.name} ran before ${L[c.dep].name} had finished: no reservation yet`; }
      bars.push({ lane: i, a: s, b: s + c.e, c }); out.push({ c, at: s + c.e }); });
    t = Math.max(...out.map(o => o.at));
  }
  bars.push({ lane: 'model', a: t, b: t + FINAL, final: true });
  const total = t + FINAL;
  /* matching results to calls: by id, or by tool name (two calls share a name) */
  const order = out.slice().sort((a, b) => a.at - b.at);
  const matched = L.map(c => { if (st.byId) return order.find(o => o.c.id === c.id).c.res; const firstSame = order.find(o => o.c.name === c.name); return firstSame.c.res; });
  const swapped = L.some((c, i) => matched[i] !== c.res);
  const parseErr = !st.parseEnd && st.mode !== 0;
  return { bars, out, order, total, matched, swapped, parseErr, fail, L };
}

export default {
  slug: 'parallel-and-streaming-tool-calls',
  title: 'Parallel tool calls: fan out, match by ID',
  description: 'A school trip planner in Kampala checks seats, weather in two towns and beds. Ask one at a time, all at once, or as they stream.',
  overview: 'When a question needs several independent lookups, a model can ask for all of them in one turn: parallel tool calls. The host runs them at the same time and replies with every result, so the wait is the slowest call rather than the sum of all of them, and the model needs one round trip instead of one per call. Two details make it work. Every call has an ID, and every result must carry the ID of the call it answers; results arrive in whatever order the tools finish, and two calls to the same tool (the weather in two towns) can only be told apart by ID. When the model streams, the arguments of several calls arrive in interleaved chunks; keep one buffer per call and parse each only when its call is complete, because half a JSON object is not valid JSON. A host can go further and start each call as soon as its own arguments are complete. Parallel calls are wrong when one call needs another\'s result, such as paying a deposit on a reservation that doesn\'t exist yet; turn parallel calls off for such tools, or run dependent calls in order. And a wide fan-out can trip a downstream rate limit.',
  keywords: ['parallel tool calls', 'streaming tool calls', 'tool call id', 'function calling', 'concurrency', 'partial JSON', 'agent latency'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.8, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 1, byId: true, parseEnd: true, deps: true, req: 0 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const COLS = ['#5B8DB8', '#1F9E89', '#7B6FA8', '#C9A227'];
    /* the timeline: a lane for the model (robot), one for the wire, one per tool (coloured blocks); bars grow as time passes */
    const X0 = -2.2, XW = 3.3, TMAX = 8.5, SC = XW / TMAX, LZ = { model: -0.82, wire: -0.5 }, TZ = i => -0.15 + i * 0.27;
    const pad = P.box(XW + 0.3, 0.02, 2.0, '#FFFFFF', { r: 0.03 }); pad.position.set(X0 + XW / 2, 0, -0.1); S.add(pad);
    const bot = P.robot(CHAR, { scale: 0.55 }); bot.position.set(X0 - 0.45, 0, LZ.model); S.add(bot);
    const spool = P.cyl(0.1, 0.12, '#6B6E7E'); spool.position.set(X0 - 0.45, 0, LZ.wire); S.add(spool);
    const heads = [0, 1, 2, 3].map(i => { const mm = new THREE.MeshLambertMaterial({ color: COLS[i] }), b = P.box(0.26, 0.22, 0.2, '#fff', { r: 0.04, material: mm }); b.position.set(X0 - 0.45, 0, TZ(i)); S.add(b); return b; });
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const MAXB = 40, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXB); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const now = P.box(0.02, 0.35, 1.9, '#fff', { r: 0, material: new THREE.MeshLambertMaterial({ color: CHAR, transparent: true, opacity: 0.25 }) }); now.userData.noFit = true; S.add(now);
    /* results sent back: one tray per call; the parcel's colour says whose result it got (a tray turns red if it got another call's) */
    const RX = 1.75;
    const trays = [0, 1, 2, 3].map(i => {
      const tm = new THREE.MeshLambertMaterial({ color: '#E9E2D3' }), t = P.box(0.42, 0.05, 0.22, '#fff', { r: 0.03, material: tm }); t.position.set(RX, 0, TZ(i)); S.add(t);
      const pm = new THREE.MeshLambertMaterial({ color: COLS[i] }), p = P.box(0.18, 0.16, 0.16, '#fff', { r: 0.03, material: pm }); p.position.set(RX, 0.05, TZ(i)); S.add(p);
      return { t, tm, p, pm };
    });
    const ansLamp = P.lamp(GOOD, { h: 0.55, r: 0.12 }); ansLamp.position.set(RX, 0, LZ.model + 0.05); S.add(ansLamp);
    const wallTw = P.tower(0.5, 0.5, SAF, { size: 0.26 }); wallTw.position.set(2.5, 0, 0.15); S.add(wallTw);
    S.add(P.keep(-2.8, 2.8, 1.25, -1.1, 0.9));
    let R = null, clock = 0;
    function paint() {
      const tnow = Math.min(R.total, clock);
      let k = 0;
      const put = (a, b, z, c, h = 0.14, d = 0.18) => { if (k >= MAXB) return; const a2 = Math.min(a, tnow), b2 = Math.min(b, tnow), len = b2 - a2; dummy.position.set(X0 + (a2 + len / 2) * SC, 0.01, z); dummy.scale.set(len > 0 ? Math.max(0.003, len * SC - 0.004) : 0, h, len > 0 ? d : 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(c)); k++; };
      R.bars.forEach(b => b.lane === 'model' ? put(b.a, b.b, LZ.model, b.final ? GOOD : CHAR) : put(b.a, b.b, TZ(b.lane), R.fail && b.c.dep !== undefined ? RED : COLS[b.lane]));
      /* interleaved argument chunks: four per call, round robin */
      if (st.mode !== 0) { const n = R.L.length; for (let j = 0; j < n * 4; j++) { const ci = j % n, a = THINK + j * (ARG * n / (n * 4)); put(a, a + ARG / 4 - 0.01, LZ.wire, R.parseErr ? RED : COLS[ci], 0.07, 0.14); } }
      else R.L.forEach((c, i) => { const a = i * 0 + R.bars.filter(b => b.lane === 'model')[i].a + THINK; for (let q = 0; q < 4; q++) put(a + q * ARG / 4, a + (q + 1) * ARG / 4 - 0.01, LZ.wire, COLS[i], 0.07, 0.14); });
      for (let j = k; j < MAXB; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      now.position.set(X0 + tnow * SC, 0, -0.1);
      const done = clock >= R.total;
      trays.forEach((w, i) => { const c = R.L[i]; w.t.visible = w.p.visible = !!c; if (!c) return; const own = R.L.findIndex(x => x.res === R.matched[i]); w.p.visible = done; w.pm.color.set(COLS[own < 0 ? i : own]); w.tm.color.set(R.matched[i] !== c.res ? RED : '#E9E2D3'); });
    }
    function draw() {
      R = run(st); clock = 0;
      heads.forEach((h, i) => { h.visible = i < R.L.length; });
      const bad = R.parseErr || !!R.fail || R.swapped;
      ansLamp.userData.set({ color: bad ? RED : GOOD, on: true });
      wallTw.userData.set({ h: 0.05 + Math.min(1, R.total / 8.5) * 1.1, cap: `${R.total.toFixed(1)} s`, color: st.mode === 0 ? '#9A968C' : SAF });
      paint();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { bot.userData.tick(dt); bot.userData.set({ busy: clock < R.total }); wallTw.userData.tick(dt); if (clock > R.total + 0.2) return; clock += dt * 1.6; paint(); };
    const controls = [
      { type: 'buttons', label: 'Request', options: ['Check four things', 'Book, then pay'], get: () => st.req, act: i => set({ req: i }) },
      { type: 'buttons', label: 'Calls', options: ['One at a time', 'In parallel', 'Start as they stream'], get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'toggle', label: 'Match results by call ID', short: 'Match by ID', get: () => st.byId, set: v => set({ byId: !!v }) },
      { type: 'toggle', label: 'Parse each call only when complete', short: 'Parse at end', get: () => st.parseEnd, set: v => set({ parseEnd: !!v }), quick: false },
      { type: 'toggle', label: 'Run dependent calls in order', short: 'Respect order', get: () => st.deps, set: v => set({ deps: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => { clock = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Wall clock', get: () => ({ v: `${R.total.toFixed(2)} s`, sub: `one at a time: ${run({ ...st, mode: 0 }).total.toFixed(2)} s`, good: st.mode !== 0 }) },
      { label: 'Model round trips', get: () => ({ v: `${st.mode === 0 ? R.L.length + 1 : 2}`, sub: 'turns to answer' }) },
      { label: 'Answer', get: () => ({ v: R.parseErr ? 'crashed' : R.fail ? 'failed' : R.swapped ? 'wrong' : 'right', sub: 'for the class trip', bad: R.parseErr || !!R.fail || R.swapped, good: !R.parseErr && !R.fail && !R.swapped }) },
    ];
    const labels = [
      { name: 'time', t: 'The timeline', d: 'Lanes: the model, the wire, then one per tool call; time runs left to right', icon: 'gauge', atV: V(X0 - 0.62, 0.1, TZ(1)) },
      { name: 'ids', t: 'Results sent back', d: 'A tray per call; red if it got another call\'s result. The tower is the wall clock', icon: 'link', atV: V(RX + 0.25, 0.1, TZ(1)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Match results by tool name', hint: 'two weather calls, one name', on: () => set({ ...D0, byId: false }), off: reset },
      { label: 'Parse arguments early', hint: 'on the first chunk', on: () => set({ ...D0, parseEnd: false }), off: reset },
      { label: 'Pay before the booking', hint: 'dependent calls in parallel', on: () => set({ ...D0, req: 1, deps: false }), off: reset },
    ];
    function status() {
      const seq = run({ ...st, mode: 0 });
      if (R.parseErr) return { ok: false, msg: `<b>Parsed too early: the arguments were half a JSON object.</b> With four calls streaming at once, their argument chunks interleave on the wire. Keep one buffer per call ID and parse each only when its call is complete; a partial object such as {"town": "Jin is not valid JSON.` };
      if (R.fail) return { ok: false, msg: `<b>The deposit failed: ${R.fail}.</b> Parallel calls are for independent lookups. When one call needs another's result, run them in order, or turn parallel calls off for those tools.` };
      if (R.swapped) return { ok: false, msg: `<b>Results matched by tool name: the two weather answers are swapped.</b> Both calls were get_weather; Jinja's finished first, so the first weather result was used for both. Results arrive in whatever order the tools finish. Only the call ID says which result belongs to which call.` };
      if (st.req && st.mode !== 0) return { ok: true, msg: `<b>Booked and paid in ${R.total.toFixed(2)} s.</b> Both calls came in one turn, but the deposit waited until the reservation existed: dependent calls run in order even when the model asks for them together.` };
      return { ok: st.mode !== 0 ? true : undefined, msg: `<b>${st.mode === 0 ? `One call at a time: ${R.total.toFixed(2)} s and ${R.L.length + 1} model turns.` : `${R.total.toFixed(2)} s instead of ${seq.total.toFixed(2)} s one at a time.`}</b> ${st.mode === 0 ? 'Each call waits for a model turn and the call before it. Ask for independent lookups in one turn and run them together.' : st.mode === 2 ? 'Each call started as soon as its own arguments were complete, without waiting for the turn to end. Results came back in finishing order, matched by ID.' : 'All calls ran together once the turn ended; the wait is the slowest call, not the sum. Results came back in finishing order, matched by ID.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One at a time', home: true, say: 'A school trip planner in Kampala checks four things for a class trip to Jinja. One call at a time, each lookup waits for its own model turn and the call before it.', act: m => m.set({ mode: 0, byId: true, parseEnd: true, deps: true, req: 0 }) },
    { t: 'All in one turn', home: true, say: 'With parallel calls, the model asks for all four in one turn. They run together, and the wait is the slowest one, not the sum.', act: m => m.set({ mode: 1 }) },
    { t: 'Start as they arrive', home: true, say: 'While the model streams, the four calls\' arguments arrive in interleaved chunks. A host can start each call the moment its own arguments are complete.', act: m => m.set({ mode: 2 }) },
    { t: 'Match by ID', home: true, say: 'Two calls use the same weather tool. Match results by name, and Jinja and Kampala swap: the class leaves into a storm. Only the call ID tells them apart.', act: m => m.set({ byId: false }) },
    { t: 'Parse at the end', home: true, say: 'Parse a call\'s arguments on its first chunk, and it is half a JSON object. Buffer per call, and parse when it is complete.', act: m => m.set({ byId: true, parseEnd: false }) },
    { t: 'Some calls must wait', home: true, say: 'Booking is different: the deposit needs the reservation number. Run those two in order, or the payment goes first and fails.', act: m => m.set({ parseEnd: true, req: 1, deps: true }) },
  ],
  check: [
    { q: 'Why are parallel tool calls faster?', options: ['One model turn requests all calls and the wait is the slowest call, not the sum', 'Each call is cheaper', 'The model skips thinking'], answer: 0, why: 'Fewer round trips and overlapping calls.', hint: 'Compare One at a time and In parallel.' },
    { q: 'Two calls to the same tool come back. How do you tell the results apart?', options: ['By the call ID each result carries', 'By the tool name', 'By the order they finish'], answer: 0, why: 'Names repeat and finishing order varies.', hint: 'Try Match results by tool name.' },
    { q: 'When should calls not run in parallel?', options: ['When one needs another\'s result', 'When there are more than two', 'Never'], answer: 0, why: 'A deposit needs the reservation first.', hint: 'Try Pay before the booking.' },
  ],
  terms: [
    ['Parallel tool calls', 'Several tool calls requested in one model turn and run together.'],
    ['Call ID', 'The identifier tying a result to the call that asked for it.'],
    ['Fan-out', 'Starting many independent calls at once.'],
    ['Streaming arguments', 'A call\'s arguments arriving in chunks while the model writes them.'],
    ['Accumulator', 'A buffer per call ID that collects chunks until the call is complete.'],
    ['Dependency', 'One call needing another\'s result before it can run.'],
  ],
  deeper: '<p><b>Switching it on and off.</b> Providers let you allow or forbid parallel calls per request. Turn it off for tools with an order (create, then write; reserve, then pay) or when a downstream service can\'t take a burst.</p><p><b>End-of-call signals.</b> Each provider marks when a streamed call is complete: a finish reason, a block-stop event, or the end of a call\'s chunks. Parse then, or use an incremental parser that tolerates partial JSON for previews only.</p><p><b>Back-pressure.</b> A ten-way fan-out to a rate-limited service fails; a gateway that queues and limits calls protects it. Later lessons build one.</p><p><b>About this machine.</b> Timings are set in the file header and every bar is computed from them; the streamed chunks are drawn round robin to show how calls interleave.</p>',
  code: {
    title: 'Run calls together, match by ID',
    note: 'Adapted from the course\'s parallel and streaming tool calls lesson.',
    text: `
import asyncio, json

async def run_calls(tool_calls):
    async def one(call):
        args = json.loads(call.arguments)          # complete arguments only
        result = await TOOLS[call.name](**args)
        return {"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)}
    return await asyncio.gather(*(one(c) for c in tool_calls))

# streaming: one buffer per call, parse when the call ends
buffers = {}
for chunk in stream:
    for d in chunk.tool_call_deltas:
        buffers.setdefault(d.index, {"id": d.id, "args": ""})["args"] += d.arguments or ""
`,
  },
};
