// Exam prep, MCP operational use cases: an invented operations desk at a logistics firm in Mombasa sizes seven jobs with five questions: who
// decides it runs (tool: model, resource: application, prompt: user), where the system lives (stdio local, Streamable HTTP remote), how long it
// takes (tasks extension for long work), whether it needs a UI (MCP Apps, degrading to text), and how sensitive it is (private cache scope,
// elicitation when a person is present). An in-process string helper does not need MCP at all. Illustrative.
const CASES = [
  { n: 'code search while chatting', prim: 'tool', tr: 'stdio', long: false, ui: false, sens: false },
  { n: 'current ticket status in context', prim: 'resource', tr: 'HTTP', long: false, ui: false, sens: true },
  { n: 'weekly incident review template', prim: 'prompt', tr: 'HTTP', long: false, ui: false, sens: false },
  { n: 'deploy pipeline (minutes)', prim: 'tool', tr: 'HTTP', long: true, ui: false, sens: true },
  { n: 'fleet usage dashboard', prim: 'tool', tr: 'HTTP', long: false, ui: true, sens: false },
  { n: 'driver payroll lookup', prim: 'tool', tr: 'HTTP', long: false, ui: false, sens: true },
  { n: 'format a date string', prim: 'none', tr: '—', long: false, ui: false, sens: false },
];
const WHO = { tool: 'the model decides', resource: 'the application decides', prompt: 'the user picks it', none: 'no second consumer' };

function plan(c, o) {
  if (c.prim === 'none') return o.inproc ? ['no MCP server: a local function', 'no boundary to pay for'] : ['an MCP server for one string function', 'an envelope, a transport and a server for nothing'];
  const p = [`${c.prim}: ${WHO[c.prim]}`, `${c.tr === 'stdio' ? 'stdio: local, credentials from the environment' : 'Streamable HTTP: remote, with OAuth'}`];
  if (c.long) p.push(o.tasks ? 'tasks extension: poll a taskId' : 'one long request: times out');
  if (c.ui) p.push(o.apps ? 'MCP Apps ui:// view, plain text when undeclared' : 'error for clients without the ui extension');
  if (c.sens) p.push(o.priv ? 'cacheScope private, confirm via elicitation' : 'cacheScope public on per-user data');
  return p;
}

function run(o) {
  const c = CASES[o.cs];
  const p = plan(c, o);
  const issues = [];
  if (!o.tasks) issues.push('the deploy pipeline ran as one long request and timed out; long work belongs in the tasks extension');
  if (!o.apps) issues.push('the dashboard tool errored for clients without the ui extension; it should fall back to text content');
  if (!o.priv) issues.push('per-user payroll and ticket results were cached as public');
  if (!o.inproc) issues.push('a date-formatting helper got its own MCP server; in-process work with no second consumer does not need MCP');
  return { c, p, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-operational-use-cases',
  title: 'Exam prep, MCP: shaping operational use cases',
  description: 'Seven jobs at an operations desk, each shaped by five questions: who decides, where it lives, how long, does it need a UI, how sensitive.',
  overview: 'A use case starts from the control split: tools are model-controlled, resources application-driven and prompts user-controlled. A code search the model reaches for mid-conversation is a tool; a ticket\'s current status the application places in context is a resource; a template a person picks from a menu is a prompt. Four more questions shape the design. Where does the system live? A local filesystem or database answers with stdio, where credentials come from the environment and no OAuth flow runs; a remote system answers with Streamable HTTP, where authorization, Origin validation and the header contract apply. How long does the work take? A call that finishes inside one request stays a plain result; a deploy pipeline or batch import that may run for minutes returns a task through the io.modelcontextprotocol/tasks extension, so the client polls a taskId instead of holding a request open against a timeout. Does the result need an interactive surface? A number or a paragraph stays plain content; a dashboard calls for MCP Apps (io.modelcontextprotocol/ui), a tool pointing at a ui:// resource the host renders in a sandboxed iframe, but only when the caller declares the extension, and a well-built server still answers callers without it with ordinary text, the graceful degradation extensions expect. How sensitive is the data, and is a person present? Sensitive results carry cacheScope "private" on cacheable operations, which is a promise about sharing, not access control, and a person present for a sensitive or slow action can confirm through MRTR elicitation. Not every job needs a protocol boundary: formatting a string or rounding a number inside one process has no second consumer for MCP\'s interoperability to serve, and wrapping it in a server adds an envelope, a transport and a failure mode for nothing. The firm is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'use cases', 'design questions', 'tasks', 'mcp apps', 'when not to use mcp', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 3, tasks: true, apps: true, priv: true, inproc: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* seven jobs on pads */
    const jobs = CASES.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.42, 0.1, 0.36, '#fff', { r: 0.03, material: m }); b.position.set(-1.68 + i * 0.56, 0, 0.3); S.add(b); return m; });
    /* five stations, one per question: three primitives, the wire, a clock for long work, a screen, a locker */
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const primM = M(OFF), wireM = M(OFF), clockM = M(OFF), screenM = M(OFF), lockM = M(OFF);
    const prim = P.box(0.5, 0.34, 0.4, '#fff', { r: 0.05, material: primM }); prim.position.set(-1.7, 0, -0.55); S.add(prim);
    const wire = P.cyl(0.14, 0.34, '#fff', { material: wireM }); wire.position.set(-0.85, 0, -0.55); S.add(wire);
    const clock = P.cyl(0.24, 0.14, '#fff', { material: clockM }); clock.position.set(0, 0, -0.55); S.add(clock);
    const screen = P.box(0.54, 0.4, 0.08, '#fff', { r: 0.02, material: screenM }); screen.position.set(0.85, 0, -0.55); S.add(screen);
    const lock = P.box(0.38, 0.4, 0.36, '#fff', { r: 0.04, material: lockM }); lock.position.set(1.65, 0, -0.55); S.add(lock);
    S.add(P.keep(-2.0, 2.0, 0.65, -0.85, 0.55));

    let R = null;
    function draw() {
      R = run(st);
      jobs.forEach((m, i) => m.color.set(i === st.cs ? SAF : OFF));
      const c = R.c, none = c.prim === 'none';
      primM.color.set(none ? (st.inproc ? OFF : BAD) : { tool: '#3D6BD6', resource: '#5B8DB8', prompt: '#7B6FA8' }[c.prim]);
      wire.scale.y = c.tr === 'stdio' ? 0.55 : 1.2; wireM.color.set(none ? OFF : c.tr === 'stdio' ? GOOD : '#5B8DB8');
      clockM.color.set(!c.long ? OFF : st.tasks ? GOOD : BAD);
      screenM.color.set(!c.ui ? OFF : st.apps ? GOOD : BAD);
      lockM.color.set(!c.sens ? OFF : st.priv ? GOOD : BAD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Long work through the tasks extension', short: 'Tasks', get: () => st.tasks, set: v => set({ tasks: !!v }) },
      { type: 'toggle', label: 'UI tools degrade to text', short: 'Apps fallback', get: () => st.apps, set: v => set({ apps: !!v }) },
      { type: 'toggle', label: 'Private scope for personal data', short: 'Private', get: () => st.priv, set: v => set({ priv: !!v }) },
      { type: 'toggle', label: 'No MCP for in-process helpers', short: 'Skip MCP', get: () => st.inproc, set: v => set({ inproc: !!v }) },
      { type: 'buttons', label: 'Job', options: ['code search', 'ticket status', 'review template', 'deploy', 'dashboard', 'payroll', 'date format'], get: () => st.cs, act: i => set({ cs: i }) },
    ];
    const readouts = [
      { label: 'Primitive', get: () => ({ v: R.c.prim, sub: WHO[R.c.prim] }) },
      { label: 'Misfits', get: () => ({ v: String(R.issues.length), sub: 'across seven jobs', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'q', t: 'Five questions', d: 'Lit: this job needs the answer', icon: 'target', atV: V(-1.95, 0.2, -0.55) },
      { name: 't', t: 'Seven jobs', d: 'Gold: the one in hand', icon: 'check', atV: V(1.9, 0.08, 0.3) },
    ];
    const reset = () => set({ ...D0, cs: st.cs });
    const breaks = [
      { label: 'Run the pipeline as one request', hint: 'it outlives the timeout', on: () => set({ ...D0, cs: 3, tasks: false }), off: reset },
      { label: 'Error without the UI extension', hint: 'degrade to text', on: () => set({ ...D0, cs: 4, apps: false }), off: reset },
      { label: 'Wrap a helper in a server', hint: 'no second consumer', on: () => set({ ...D0, cs: 6, inproc: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: ${R.p.join('; ')}.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Who decides', home: true, say: 'A code search the model reaches for is a tool, on a local machine over stdio.', act: m => m.set({ cs: 0, tasks: true, apps: true, priv: true, inproc: true }) },
    { t: 'The application decides', home: true, say: 'A ticket\'s status the application places in context is a resource, cached privately.', act: m => m.set({ cs: 1, tasks: true, apps: true, priv: true, inproc: true }) },
    { t: 'The user decides', home: true, say: 'A review template a person picks from a menu is a prompt.', act: m => m.set({ cs: 2, tasks: true, apps: true, priv: true, inproc: true }) },
    { t: 'Long work', home: true, say: 'A deploy that takes minutes returns a task the client polls.', act: m => m.set({ cs: 3, tasks: true, apps: true, priv: true, inproc: true }) },
    { t: 'An interactive view', home: true, say: 'A dashboard uses an MCP App, and still answers in text for hosts without it.', act: m => m.set({ cs: 4, tasks: true, apps: true, priv: true, inproc: true }) },
    { t: 'Not everything', home: true, say: 'Formatting a date inside one program needs no server at all.', act: m => m.set({ cs: 6, tasks: true, apps: true, priv: true, inproc: true }) },
  ],
  check: [
    { q: 'A deploy takes several minutes. How should it be exposed?', options: ['A tool that returns a task through the tasks extension', 'One long request', 'A prompt'], answer: 0, why: 'The client polls a taskId.', hint: 'Try Run the pipeline as one request.' },
    { q: 'A client calls a dashboard tool without declaring the ui extension. What should it get?', options: ['Ordinary text content', 'An error', 'Nothing'], answer: 0, why: 'Graceful degradation.', hint: 'Try Error without the UI extension.' },
    { q: 'Should a date-formatting helper inside one program be an MCP server?', options: ['No: there is no second consumer or boundary', 'Yes, always', 'Only on stdio'], answer: 0, why: 'MCP pays off across boundaries.', hint: 'Try Wrap a helper in a server.' },
  ],
  practice: [
    { q: 'A local database for a desktop assistant. Which transport?', options: ['stdio, credentials from the environment', 'Streamable HTTP with OAuth', 'A session', 'Email'], answer: 0, why: 'Local systems answer with stdio.' },
    { q: 'A template the user chooses from a slash-command menu is a…', options: ['Prompt', 'Tool', 'Resource', 'Task'], answer: 0, why: 'User-controlled.' },
    { q: 'Data the application always places in context is a…', options: ['Resource', 'Tool', 'Prompt', 'Notification'], answer: 0, why: 'Application-driven.' },
    { q: 'A sensitive action with a person present. What helps?', options: ['An MRTR elicitation confirmation', 'A public cache', 'Skipping review', 'A Tier 3 SDK'], answer: 0, why: 'Ask before acting.' },
    { q: 'Does cacheScope "private" control who may read the data?', options: ['No: it governs sharing of cached copies only', 'Yes', 'Only on HTTP', 'Only for prompts'], answer: 0, why: 'Access control is separate.' },
    { q: 'A remote HTTP system adds which concerns?', options: ['Authorization, Origin validation and the header contract', 'None', 'Only caching', 'Only logging'], answer: 0, why: 'stdio reads the environment instead.' },
  ],
  terms: [
    ['Control split', 'Tools model, resources application, prompts user.'],
    ['Locality', 'Local systems use stdio; remote ones Streamable HTTP.'],
    ['Tasks extension', 'For work that may outlive a request timeout.'],
    ['MCP Apps', 'A ui:// view rendered in a sandboxed iframe, when declared.'],
    ['Graceful degradation', 'Answering with text when an extension is missing.'],
    ['Protocol boundary', 'Worth it only with a second consumer or system.'],
  ],
  deeper: '<p><b>Seven families.</b> Developer tools, knowledge access, workflow templates, long-running operations, dashboards, sensitive lookups, and in-process helpers that do not need MCP.</p><p><b>About this machine.</b> The firm and jobs are invented.</p>',
  code: {
    title: 'Five questions, one recommendation',
    note: 'Written for this lesson.',
    text: `
def recommend(job):
    if not job.crosses_a_boundary:
        return "a local function, no MCP"
    primitive = {"model": "tool", "application": "resource", "user": "prompt"}[job.decided_by]
    transport = "stdio (env credentials)" if job.local else "Streamable HTTP (OAuth)"
    extras = []
    if job.may_outlive_timeout:
        extras.append("tasks extension")
    if job.needs_interactive_view:
        extras.append("MCP Apps, with a text fallback")
    if job.personal_data:
        extras.append("cacheScope private; confirm via elicitation")
    return primitive, transport, extras
`,
  },
};
