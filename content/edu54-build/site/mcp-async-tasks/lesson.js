// MCP tasks (the io.modelcontextprotocol/tasks extension): a regional exams office in Bulawayo builds a school's results report, a job of about 50 seconds.
// The server turns the tools/call into a task: it stores the task, then returns a handle (taskId, status working, pollIntervalMs 5000, ttlMs one day).
// The client polls tasks/get. At 15 s the task needs input (PDF or spreadsheet?): status input_required with inputRequests; the client answers with tasks/update.
// It completes at 50 s; the next tasks/get carries the original tool result inside. The outer resultType "complete" only means tasks/get itself finished.
// Two server replicas share a database, or each keeps tasks in its own memory. Polls alternate between replicas. Another school's admin tries the next task ID.
const DONE = 50, ASK = 15, ANSWER = 18;
function run(st) {
  const iv = st.fast ? 0.5 : 5, polls = [], events = [];
  let gaveUp = null, early = null, limited = 0;
  for (let t = iv, n = 0; t <= DONE + iv; t += iv, n++) {
    const rep = n % 2;
    const status = t < ASK ? 'working' : t < ANSWER ? 'input_required' : t < DONE ? 'working' : 'completed';
    let res;
    if (!st.durable && rep === 1) res = 'not found (this replica never saw the task)';
    else if (st.fast && n % 2 === 1) { res = '429: polling faster than pollIntervalMs'; limited++; }
    else res = `resultType complete · task ${status}${status === 'completed' ? ' · result: the report' : ''}`;
    polls.push({ t, rep, res, status });
    if (!st.durable && rep === 1 && !gaveUp) gaveUp = t;
    if (st.outer && !early && /resultType complete/.test(res)) early = t;
  }
  events.push({ t: 0, s: 'tools/call build_results_report { school: "Mzilikazi High" } → task tsk_9f3c… working, pollIntervalMs 5000 (stored first)' });
  events.push({ t: ASK, s: 'task input_required: "PDF or spreadsheet?" · client answers with tasks/update' });
  events.push({ t: DONE, s: 'task completed · the next tasks/get carries the report' });
  const leak = !st.owner;
  return { polls, events, gaveUp, early, limited, leak, iv };
}

export default {
  slug: 'mcp-async-tasks',
  title: 'MCP tasks: long jobs with a handle',
  description: 'An exams office in Bulawayo builds a school\'s results report, a fifty-second job. The server hands back a task handle to poll.',
  overview: 'Some tool calls take longer than a request should wait, or must survive the app restarting, or need input halfway. The MCP tasks extension turns such a call into a task. The client says on each request that it supports tasks; the server decides when a call becomes one, stores the task, and only then returns a handle: an ID, a status (working, input_required, completed, cancelled or failed), a suggested poll interval and an expiry. The client polls tasks/get at that interval. If the task needs input, its status says so and lists the questions; the client answers with tasks/update and keeps polling. When it completes, the next tasks/get carries the original tool result inside it. Two readings are easy to confuse: the outer resultType "complete" means the poll itself finished, while the task\'s status says whether the job has. A task ID is explicit application state, so the protocol stays stateless: store it durably, where every server replica can find it, and check on every call that the caller owns it. Cancellation is a request the job must honour cooperatively, and expired tasks are deleted.',
  keywords: ['MCP tasks', 'async tools', 'long-running jobs', 'polling', 'tasks/get', 'Model Context Protocol', 'durable state'],
  orient: 'landscape',
  view: { target: [-0.5, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { durable: true, owner: true, outer: false, fast: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the job's timeline: blue working, gold waiting for an answer, green done; pegs are polls (back row replica 1, front row replica 2) */
    const X0 = -2.7, XW = 3.05, SC = XW / 56, TZ = -0.75;
    const tp = P.box(XW + 0.25, 0.02, 0.9, '#FFFFFF', { r: 0.03 }); tp.position.set(X0 + XW / 2, 0, -0.55); S.add(tp);
    const seg = (a, b, c) => { const s = P.box((b - a) * SC - 0.01, 0.12, 0.22, c, { r: 0.02 }); s.position.set(X0 + (a + b) / 2 * SC, 0.01, TZ); S.add(s); };
    seg(0, ASK, '#5B8DB8'); seg(ASK, ANSWER, SAF); seg(ANSWER, DONE, '#5B8DB8'); seg(DONE, 55, GOOD);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 120); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const now = P.box(0.02, 0.3, 0.9, '#fff', { r: 0, material: new THREE.MeshLambertMaterial({ color: CHAR, transparent: true, opacity: 0.3 }) }); now.userData.noFit = true; S.add(now);
    /* two replicas and the shared task database under them */
    const SY = 0.45; [-2.35, -1.35].forEach(x => { const b = P.box(0.75, 0.4, 0.42, CHAR, { r: 0.05 }); b.position.set(x, 0, SY); S.add(b); });
    const dbM = new THREE.MeshLambertMaterial({ color: GOOD }), db = P.box(1.8, 0.14, 0.32, '#fff', { r: 0.05, material: dbM }); db.position.set(-1.85, 0, 0.95); S.add(db);
    /* the school's app (a robot with the report tray) and another school's admin at a locked door */
    const app = P.robot('#5B8DB8', { scale: 0.9 }); app.position.set(0.85, 0, -0.45); S.add(app);
    const trayM = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), tray = P.box(0.34, 0.2, 0.3, '#fff', { r: 0.03, material: trayM }); tray.position.set(1.3, 0, -0.45); S.add(tray);
    const stranger = P.robot('#B5462F', { scale: 0.8 }); stranger.position.set(1.3, 0, 0.6); S.add(stranger);
    const door = P.box(0.06, 0.6, 0.5, '#6B6E7E', { r: 0.02 }); door.position.set(0.8, 0, 0.6); S.add(door);
    const doorLamp = P.lamp(GOOD, { h: 0.6, r: 0.08 }); doorLamp.position.set(0.8, 0, 0.95); S.add(doorLamp);
    const leakM = new THREE.MeshLambertMaterial({ color: RED }), leak = P.box(0.26, 0.16, 0.22, '#fff', { r: 0.03, material: leakM }); leak.position.set(1.65, 0, 0.6); S.add(leak);
    S.add(P.keep(-2.85, 1.85, 1.2, -1.0, 1.15));

    let R = null, clock = 0;
    function paint() {
      const tnow = Math.min(55, clock * 6);
      let k = 0;
      R.polls.forEach(p => { if (k >= 120) return; const on = p.t <= tnow, bad = /not found|429/.test(p.res); dummy.position.set(X0 + p.t * SC, 0.02, -0.45 + p.rep * 0.2); dummy.scale.set(on ? 0.04 : 0, on ? (bad ? 0.1 : 0.2) : 0, on ? 0.1 : 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(bad ? BAD : GOOD)); k++; });
      for (let j = k; j < 120; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      now.position.set(X0 + tnow * SC, 0, -0.55);
      /* the tray: the report arrives when the task completes; a parser bug shows an empty one early; no shared store means the app gives up */
      const shown = !st.durable ? tnow >= R.gaveUp : st.outer ? tnow >= R.early : tnow >= DONE;
      tray.visible = shown; trayM.color.set(!st.durable ? '#9A968C' : st.outer ? RED : GOOD);
    }
    function draw() {
      R = run(st); clock = 0;
      dbM.color.set(st.durable ? GOOD : '#C9C6BD'); db.visible = !!st.durable;
      doorLamp.userData.set({ color: st.owner ? GOOD : RED, on: true }); leak.visible = !st.owner;
      paint();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { app.userData.tick(dt); stranger.userData.tick(dt); app.userData.set({ busy: clock * 6 < 55 }); stranger.userData.set({ busy: true }); if (clock * 6 > 56) return; clock += dt; paint(); };
    const controls = [
      { type: 'toggle', label: 'Store tasks in a shared database', short: 'Durable store', get: () => st.durable, set: v => set({ durable: !!v }) },
      { type: 'toggle', label: 'Check who owns each task', short: 'Owner check', get: () => st.owner, set: v => set({ owner: !!v }) },
      { type: 'toggle', label: 'Read the outer resultType as done', short: 'Parser bug', get: () => st.outer, set: v => set({ outer: !!v }), quick: false },
      { type: 'toggle', label: 'Poll as fast as possible', short: 'Fast polls', get: () => st.fast, set: v => set({ fast: !!v }), quick: false },
      { type: 'button', label: 'Run the task again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Report delivered', get: () => { const ok = st.durable && !st.outer; return { v: ok ? `${DONE} s` : 'no', sub: ok ? 'after the task completed' : 'the app got it wrong', good: ok, bad: !ok }; } },
      { label: 'Polls', get: () => ({ v: `${R.polls.length}`, sub: `every ${R.iv} s${R.limited ? `, ${R.limited} refused` : ''}` }) },
      { label: 'Leaked to others', get: () => ({ v: R.leak ? 'yes' : 'no', sub: 'another school', bad: R.leak, good: !R.leak }) },
    ];
    const labels = [
      { name: 'time', t: 'The task, 55 seconds', d: 'Blue working, gold asking, green done; pegs are polls to replica 1 (back) and 2 (front), coral refused', icon: 'gauge', atV: V(X0 - 0.15, 0.1, TZ) },
      { name: 'store', t: 'Replicas and store', d: 'The green slab is the shared task database', icon: 'layers', atV: V(-2.8, 0.1, 0.95) },
      { name: 'app', t: 'The school\'s app', d: 'Green report when done; red an empty one read too early', icon: 'eye', atV: V(1.5, 0.4, -0.45) },
      { name: 'door', t: 'Another school', d: 'The lamp is the owner check; a red box is their results leaked', icon: 'stop', atV: V(1.82, 0.1, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Tasks in one server\'s memory', hint: 'no shared store', on: () => set({ ...D0, durable: false }), off: reset },
      { label: 'Anyone can read a task', hint: 'no owner check', on: () => set({ ...D0, owner: false }), off: reset },
      { label: 'Poll finished = job finished', hint: 'outer resultType read as done', on: () => set({ ...D0, outer: true }), off: reset },
    ];
    function status() {
      if (!st.durable) return { ok: false, msg: `<b>Tasks in memory: the second poll landed on replica 2, which had never seen the task, and the app gave up at ${R.gaveUp} s.</b> A task ID is application state. Store it where every replica can find it, and store it before returning the handle; then any replica, or a server restarted mid-job, can answer.` };
      if (!st.owner) return { ok: false, msg: '<b>Another school\'s admin tried the next task ID and got Mzilikazi High\'s results.</b> Make task IDs unguessable, check on every tasks/get, tasks/update and cancel that the caller owns the task, and answer "not found" otherwise, so strangers can\'t even confirm a task exists.' };
      if (st.outer) return { ok: false, msg: `<b>The app read resultType "complete" as "the report is done" at ${R.early} s, and showed an empty report.</b> The outer resultType says the poll finished. The task's status says whether the job has: working, input_required, completed, cancelled or failed. Only completed carries the report.` };
      return { ok: st.fast ? undefined : true, msg: `<b>${st.fast ? `Polling every half second: ${R.limited} polls refused, and no sooner a report.` : `The report arrived at ${DONE} s after ${R.polls.length} polls.`}</b> The server stored the task before handing back its ID, asked "PDF or spreadsheet?" through the task's status, took the answer by tasks/update, and returned the report inside the final poll. ${st.fast ? 'Honour pollIntervalMs.' : 'The app polled at the interval the server suggested.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A job too long for one request', home: true, say: 'A regional exams office in Bulawayo builds a school\'s results report. It takes most of a minute, so the server makes the call a task, stores it, and hands back its ID.', act: m => m.set({ durable: true, owner: true, outer: false, fast: false }) },
    { t: 'Poll, answer, collect', home: true, say: 'The app polls at the interval the server suggests. Halfway, the task asks: PDF or spreadsheet? The app sends the answer, keeps polling, and the last poll carries the report.', act: m => m.set({ fast: false }) },
    { t: 'The poll is not the job', home: true, say: 'Every poll comes back "complete": that means the poll finished. Read it as the job finishing, and the app shows an empty report at five seconds.', act: m => m.set({ outer: true }) },
    { t: 'Stored where everyone can find it', home: true, say: 'Keep tasks in one server\'s memory, and a poll that lands on the other replica gets "not found". The app gives up on a job that is still running.', act: m => m.set({ outer: false, durable: false }) },
    { t: 'Only the owner', home: true, say: 'Another school\'s admin tries the next task ID. Without an owner check, they get this school\'s results.', act: m => m.set({ durable: true, owner: false }) },
    { t: 'Back to safe', home: true, say: 'Shared storage, an owner check on every call, and the app reads the task\'s status. The report arrives, for the right school only.', act: m => m.set({ owner: true }) },
  ],
  check: [
    { q: 'A tasks/get reply says resultType "complete" and status "working". Is the report ready?', options: ['No: the poll finished, the job hasn\'t', 'Yes', 'It failed'], answer: 0, why: 'Only status completed carries the result.', hint: 'Try Poll finished = job finished.' },
    { q: 'Why store a task in a shared database before returning its ID?', options: ['So any replica, even after a restart, can answer a poll for it', 'For speed', 'The protocol needs a session'], answer: 0, why: 'A task ID is application state, not a connection.', hint: 'Try Tasks in one server\'s memory.' },
    { q: 'How does a running task get input from the user?', options: ['Its status becomes input_required; the client answers with tasks/update', 'The server calls the client', 'The client restarts the tool call'], answer: 0, why: 'Before a task exists, the tool call itself returns input_required instead.', hint: 'Watch 15 seconds.' },
  ],
  terms: [
    ['Task', 'A long-running tool call the server tracks under an ID.'],
    ['tasks/get', 'The poll: returns the task\'s current status, and its result once complete.'],
    ['tasks/update', 'Sends answers to a task waiting for input.'],
    ['pollIntervalMs', 'How often the server suggests polling; faster polls may be refused.'],
    ['ttlMs (task)', 'How long the task and its result are kept before deletion.'],
    ['Cooperative cancellation', 'Asking a task to stop; the job checks for the request and stops at a safe point.'],
  ],
  deeper: '<p><b>When to use a task.</b> When a call may outlive a request timeout, already runs on a job queue, must survive the app restarting, or pauses for input. Not for a quick lookup: handles, storage, polling, expiry and cancellation are real complexity.</p><p><b>Input before or after.</b> If input is needed before the work starts, the tool call returns input_required and is repeated; only then is a task created. Once a task exists, questions go through its status and answers through tasks/update.</p><p><b>No list of tasks.</b> Without sessions there is no safe "my tasks" list in the protocol; an app that needs history exposes its own tool with explicit filters and ownership rules.</p><p><b>About this machine.</b> The timings, replicas and polls follow the rules in the file header.</p>',
  code: {
    title: 'Poll a task the right way',
    note: 'Adapted from the course\'s MCP tasks lesson.',
    text: `
import time

def wait_for(client, task):
    while True:
        time.sleep(task.get("pollIntervalMs", 5000) / 1000)
        reply = client.request("tasks/get", {"taskId": task["taskId"]})
        # reply["resultType"] == "complete" only means the poll finished
        task = reply["task"]
        if task["status"] == "input_required":
            answers = ask_user(task["inputRequests"])
            client.request("tasks/update", {"taskId": task["taskId"], "inputResponses": answers})
        elif task["status"] == "completed":
            return task["result"]                 # the original tool result
        elif task["status"] in ("failed", "cancelled"):
            raise TaskEnded(task)
`,
  },
};
