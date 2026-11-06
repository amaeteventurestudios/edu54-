// Exam prep, MCP long-running work and the tasks extension: an invented mapping agency in Kampala renders survey tiles that can take minutes.
// With io.modelcontextprotocol/tasks declared on the request, the server may answer tools/call with resultType "task" (a taskId, status, TTL
// and a suggested poll interval). The client polls tasks/get (always resultType complete, with the job's status nested), answers input_required
// with tasks/update, and may send tasks/cancel (cooperative). There is no tasks/result and no tasks/list; a completed task carries the original
// result inline, even when that result has isError true. Illustrative.
const CASES = [
  { n: 'render completes', path: ['working', 'completed'] },
  { n: 'needs a projection choice', path: ['working', 'input_required', 'working', 'completed'] },
  { n: 'user cancels', path: ['working', 'cancelled'] },
  { n: 'tile source unreachable', path: ['working', 'completed (isError)'] },
  { n: 'renderer crashes', path: ['working', 'failed'] },
  { n: 'extension not declared', path: [] },
];

function run(o) {
  const c = CASES[o.cs];
  const lines = [];
  if (c.path.length === 0) {
    lines.push('tools/call render_tiles (no extensions in clientCapabilities)', o.declared ? 'server may answer normally, or the task method is refused with -32021' : 'server answered resultType "task" anyway');
  } else {
    lines.push(`tools/call render_tiles → resultType "task" · taskId tk_3f… · pollInterval 2 s${o.visible ? '' : ' (not yet stored)'}`);
    if (!o.visible) lines.push('tasks/get tk_3f… → -32602 unknown task (handle sent too early)');
    c.path.forEach((s, i) => {
      if (i === 0) return;
      if (s === 'input_required') lines.push('tasks/get → resultType complete · status input_required · inputRequests {projection}', 'tasks/update {inputResponses} → empty acknowledgement');
      else if (s === 'cancelled') lines.push(o.cancelRight ? 'tasks/cancel tk_3f… → acknowledged (cooperative)' : 'notifications/cancelled sent: wrong tool for a task', 'tasks/get → status cancelled');
      else if (s === 'working') lines.push('tasks/get → status working');
      else lines.push(`tasks/get → resultType complete · status ${s.replace(' (isError)', '')} · ${s === 'failed' ? 'error {-32603}' : s.includes('isError') ? 'result {isError: true, "tile source unreachable"}' : 'result {structuredContent: {tiles: 48}}'}`);
    });
  }
  if (!o.nested && c.path.length) { const i = lines.findIndex(l => l.startsWith('tasks/get')); if (i >= 0) lines.splice(i + 1, 0, 'client misread resultType complete as finished and stopped polling'); }
  const issues = [];
  if (!o.declared) issues.push('the server returned a task to a request that never declared io.modelcontextprotocol/tasks; extensions are negotiated per request');
  if (!o.visible) issues.push('the server handed out taskId before the store could resolve it, so the first tasks/get said unknown task');
  if (!o.nested) issues.push('the client read tasks/get\'s own resultType as the job status; resultType is always complete and the status is nested');
  if (!o.cancelRight) issues.push('the client sent notifications/cancelled for a task; tasks are cancelled with tasks/cancel');
  return { c, lines, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-long-running-work-and-tasks',
  title: 'Exam prep, MCP: long-running work and tasks',
  description: 'A tile render can take minutes, so the server hands back a task. Poll it through its states, answer when it asks, and cancel it the proper way.',
  overview: 'Some work outlives a request timeout. MCP 2026-07-28 moved tasks out of the core into an official extension, io.modelcontextprotocol/tasks (SEP-2663). Negotiation is per request: the client declares the extension in clientCapabilities.extensions on the request it is making, and the server advertises it in server/discover; declaring it once does not carry over. Task creation is server-directed: declaring the extension means the client can handle either a normal CallToolResult or a CreateTaskResult, and the server decides per call. Only tools/call supports tasks. A CreateTaskResult has resultType "task" with a taskId, status, TTL and a suggested poll interval, and the server must not send the taskId until tasks/get would resolve it. The client polls tasks/get with the taskId. tasks/get is itself an ordinary request, so its own resultType is always "complete"; the job\'s status (working, input_required, completed, failed or cancelled) is a nested field. There is no tasks/result: when a task completes, the next tasks/get carries the original result inline, and a tool call that finished with isError true is still completed. A failed task carries the JSON-RPC error. There is no tasks/list either, because a session-free server has no safe scope for listing. When a task needs input mid-flight, its status becomes input_required and tasks/get includes inputRequests shaped like MRTR requests; the client answers with tasks/update and inputResponses and gets an empty acknowledgement. tasks/cancel is cooperative: the server records the intent and may still finish. notifications/cancelled is for tearing down one open request on its stream, not for tasks. A task method without the extension declared on that request gets -32021; an unknown or expired taskId gets -32602. Choose a plain call for quick work, MRTR for one short answer, and a task when the work may outlive a timeout. The agency is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'tasks extension', 'tasks/get', 'tasks/update', 'tasks/cancel', 'long-running', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 1, declared: true, visible: true, nested: true, cancelRight: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the task's states as pads: working, a side stop for input, then three endings */
    const POS = { working: [-1.8, -0.45], input_required: [-0.55, -0.95], completed: [0.8, -0.95], failed: [0.8, -0.45], cancelled: [0.8, 0.05] };
    const nodes = Object.entries(POS).map(([n, [x, z]]) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.6, 0.12, 0.4, '#fff', { r: 0.04, material: m }); b.position.set(x, 0, z); S.add(b); return { n, m }; });
    [['working', 'input_required'], ['input_required', 'completed'], ['working', 'completed'], ['working', 'failed'], ['working', 'cancelled']].forEach(([a, b]) => S.add(P.rod(V(POS[a][0], 0.07, POS[a][1]), V(POS[b][0], 0.07, POS[b][1]), 0.014, '#B9B3A6')));
    /* the task itself, a ball that walks the case's path; the client polls from the side */
    const taskM = new THREE.MeshLambertMaterial({ color: SAF }), task = P.ball(0.11, '#fff', { material: taskM }); task.userData.noFit = true; S.add(task);
    const client = P.robot('#3D6BD6', { scale: 0.6 }); client.position.set(-2.5, 0, -0.45); S.add(client);
    /* four habits as lamps */
    const habits = ['declared', 'visible', 'nested', 'cancelRight'].map((k, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-1.9 + i * 0.42, 0, 0.42); S.add(l); return { k, l }; });
    S.add(P.keep(-2.75, 1.25, 0.75, -1.2, 0.65));
    let walk = 0;

    let R = null;
    function draw() {
      R = run(st);
      const visited = R.c.path.map(s => s.replace(' (isError)', ''));
      nodes.forEach(nd => nd.m.color.set(!visited.includes(nd.n) ? OFF : nd.n === 'failed' || nd.n === 'cancelled' ? SAF : GOOD));
      habits.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : BAD, on: true }));
      taskM.color.set(R.ok ? SAF : BAD);
      task.visible = visited.length > 0; walk = 0;
      if (visited.length) task.position.set(POS[visited[0]][0], 0.24, POS[visited[0]][1]);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Tasks only when the extension is declared', short: 'Declared', get: () => st.declared, set: v => set({ declared: !!v }) },
      { type: 'toggle', label: 'Send taskId only once it resolves', short: 'Visible id', get: () => st.visible, set: v => set({ visible: !!v }) },
      { type: 'toggle', label: 'Read the nested status', short: 'Nested status', get: () => st.nested, set: v => set({ nested: !!v }) },
      { type: 'toggle', label: 'Cancel with tasks/cancel', short: 'tasks/cancel', get: () => st.cancelRight, set: v => set({ cancelRight: !!v }) },
      { type: 'buttons', label: 'Scenario', options: ['completes', 'needs input', 'cancel', 'isError', 'crash', 'undeclared'], get: () => st.cs, act: i => set({ cs: i }) },
    ];
    const readouts = [
      { label: 'Final status', get: () => ({ v: R.c.path.length ? R.c.path[R.c.path.length - 1] : 'none', sub: R.c.n }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the task flow', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 's', t: 'Task states', d: 'Driven by polling', icon: 'link', atV: V(-2.08, 0.1, -0.45) },
      { name: 't', t: 'Endings', d: 'Gold: failed or cancelled', icon: 'check', atV: V(1.08, 0.1, -0.45) },
    ];
    const reset = () => set({ ...D0, cs: st.cs });
    const breaks = [
      { label: 'Return a task without the extension', hint: 'negotiated per request', on: () => set({ ...D0, cs: 5, declared: false }), off: reset },
      { label: 'Hand out the id before it is stored', hint: 'tasks/get says unknown', on: () => set({ ...D0, cs: 0, visible: false }), off: reset },
      { label: 'Cancel with notifications/cancelled', hint: 'that is for open requests', on: () => set({ ...D0, cs: 2, cancelRight: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: ${R.lines.join('; ')}.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      client.userData.tick(dt);
      const path = R.c.path.map(s => s.replace(' (isError)', ''));
      if (path.length > 1) {
        walk = (walk + dt * 0.45) % (path.length + 0.6);
        const i = Math.min(path.length - 2, Math.floor(walk)), f = Math.min(1, walk - i), a = POS[path[i]], b = POS[path[i + 1]];
        task.position.set(a[0] + (b[0] - a[0]) * f, 0.24, a[1] + (b[1] - a[1]) * f);
      }
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A task, not a wait', home: true, say: 'A tile render takes minutes, so the server answers with a task handle instead of the result.', act: m => m.set({ cs: 0, declared: true, visible: true, nested: true, cancelRight: true }) },
    { t: 'Poll for status', home: true, say: 'Each tasks get is a complete request. The job\'s status sits inside it.', act: m => m.set({ cs: 0, declared: true, visible: true, nested: true, cancelRight: true }) },
    { t: 'Input mid-flight', home: true, say: 'The task pauses for a projection choice. The client answers with tasks update.', act: m => m.set({ cs: 1, declared: true, visible: true, nested: true, cancelRight: true }) },
    { t: 'Completed with an error', home: true, say: 'A tool error is still a completed task. The result carries is error true.', act: m => m.set({ cs: 3, declared: true, visible: true, nested: true, cancelRight: true }) },
    { t: 'Cancel cooperatively', home: true, say: 'Tasks cancel asks the server to stop. It may still finish.', act: m => m.set({ cs: 2, declared: true, visible: true, nested: true, cancelRight: true }) },
    { t: 'Declared per request', home: true, say: 'Without the extension on this request, the server does not create a task.', act: m => m.set({ cs: 5, declared: true, visible: true, nested: true, cancelRight: true }) },
  ],
  check: [
    { q: 'What is tasks/get\'s own resultType?', options: ['Always complete; the status is nested', 'The task status', 'task'], answer: 0, why: 'tasks/get is an ordinary request.', hint: 'Try the needs input scenario.' },
    { q: 'How is a running task cancelled?', options: ['tasks/cancel, cooperatively', 'notifications/cancelled', 'Closing the connection'], answer: 0, why: 'The server records the intent.', hint: 'Try Cancel with notifications/cancelled.' },
    { q: 'May a server return a task to a request that did not declare the extension?', options: ['No', 'Yes, if slow', 'Yes, on stdio'], answer: 0, why: 'Extensions are negotiated per request.', hint: 'Try Return a task without the extension.' },
  ],
  practice: [
    { q: 'How does a client get a completed task\'s result?', options: ['Inline in the next tasks/get', 'tasks/result', 'tasks/list', 'A notification'], answer: 0, why: 'There is no tasks/result.' },
    { q: 'A tool inside a task finished with isError true. What is the task status?', options: ['completed', 'failed', 'cancelled', 'input_required'], answer: 0, why: 'The call itself finished.' },
    { q: 'Why is there no tasks/list?', options: ['A session-free server has no safe scope to list within', 'It was forgotten', 'It is in the core', 'It needs HTTP'], answer: 0, why: 'It would leak tasks across callers.' },
    { q: 'An expired taskId is polled. Which error?', options: ['-32602', '-32601', '-32021', '-32603'], answer: 0, why: 'Invalid params.' },
    { q: 'Which requests support task augmentation in 2026-07-28?', options: ['tools/call only', 'Every request', 'resources/read only', 'prompts/get only'], answer: 0, why: 'Only tools/call.' },
    { q: 'When is a task worth its complexity over MRTR?', options: ['When the work may outlive a timeout or pause for input', 'For every call', 'For quick lookups', 'Never'], answer: 0, why: 'MRTR fits one short answer.' },
  ],
  terms: [
    ['Tasks extension', 'io.modelcontextprotocol/tasks, negotiated per request.'],
    ['CreateTaskResult', 'resultType task: taskId, status, TTL, poll interval.'],
    ['tasks/get', 'Polls a task; always complete, with a nested status.'],
    ['tasks/update', 'Supplies inputResponses to a task waiting for input.'],
    ['tasks/cancel', 'A cooperative request to stop a task.'],
    ['Task status', 'working, input_required, completed, failed or cancelled.'],
  ],
  deeper: '<p><b>Eventually consistent stores.</b> Wait until a written task is visible before returning its id, or the first poll says unknown.</p><p><b>About this machine.</b> The agency and render are invented.</p>',
  code: {
    title: 'Poll a task to the end',
    note: 'Written for this lesson.',
    text: `
def run_as_task(client, args):
    res = client.call("tools/call", {"name": "render_tiles", "arguments": args},
                      extensions={"io.modelcontextprotocol/tasks": {}})   # this request only
    if res["resultType"] != "task":
        return res                                         # the server chose a normal result
    tid = res["taskId"]
    while True:
        g = client.call("tasks/get", {"taskId": tid})      # g["resultType"] == "complete"
        s = g["status"]
        if s == "input_required":
            client.call("tasks/update", {"taskId": tid, "inputResponses": ask_user(g["inputRequests"])})
        elif s == "completed":
            return g["result"]                             # may itself have isError: true
        elif s in ("failed", "cancelled"):
            return g.get("error") or s
        sleep(g.get("pollInterval", 2))
`,
  },
};
