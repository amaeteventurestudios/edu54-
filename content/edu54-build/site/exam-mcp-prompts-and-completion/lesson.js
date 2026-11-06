// Exam prep, MCP prompts and completion: an invented developer-tools server in Kampala offers a code_review prompt with language and framework
// arguments, which the user picks as a slash command. prompts/get renders messages; an unknown prompt or a missing required argument is -32602
// (there is no isError for prompts). completion/complete suggests values: context.arguments narrows framework by the language already chosen,
// and results cap at 100 values with total and hasMore. Illustrative.
const GETS = [
  { n: 'prompts/get code_review {language: "python", framework: "flask"}', kind: 'ok' },
  { n: 'prompts/get code_review {language: "python"}  (framework required)', kind: 'missing' },
  { n: 'prompts/get code_reveiw {...}', kind: 'unknown' },
];
const FW = { python: ['flask', 'fastapi', 'django'], javascript: ['fastify', 'express'], java: ['spring'] };

function run(o) {
  const g = GETS[o.get];
  let reply, okGet = true;
  if (g.kind === 'ok') reply = 'messages: [{role: "user", text: "Review this Python Flask code for…"},\n{role: "user", resource_link: style-guide.md}]';
  else if (o.channel) reply = `JSON-RPC error -32602\n"${g.kind === 'missing' ? 'Missing required argument: framework' : 'Unknown prompt: code_reveiw'}"`;
  else { reply = 'result isError: true (prompts have no isError channel)'; okGet = false; }
  const typed = 'f';
  const cands = o.context ? FW.python.filter(x => x.startsWith(typed)) : Object.values(FW).flat().filter(x => x.startsWith(typed));
  const files = 144, shown = o.cap ? 100 : files;
  const issues = [];
  if (!okGet) issues.push('a bad prompts/get came back as isError, but prompts render text and do not execute: it is a -32602 protocol error');
  if (!o.context) issues.push('completion ignored context.arguments, so JavaScript frameworks were offered after the user chose Python');
  if (!o.cap) issues.push('the file completion returned all 144 values; results cap at 100 with total 144 and hasMore true');
  if (!o.user) issues.push('the model invoked the prompt on its own; prompts are user-controlled, picked explicitly');
  return { g, reply, cands, files, shown, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-prompts-and-completion',
  title: 'Exam prep, MCP: prompt templates and argument completion',
  description: 'A code_review prompt takes a language and a framework, and the user picks it. Narrow its completions by context, cap the list and send the right error.',
  overview: 'Prompts are the user-controlled primitive: the user explicitly selects one, often from a menu the host shows as slash commands, while the server authors the wording and arguments. A server that supports prompts declares prompts {listChanged} in its discover capabilities and answers prompts/list, a cacheable result (ttlMs and cacheScope) with optional cursor pagination; a cursor the server never issued is -32602. Each prompt lists its arguments with a name, description and required flag, so a client can build a form before the user types anything. prompts/get takes the name and a map of string arguments. There is no isError channel here, because a prompt renders text and does not execute anything: an unknown prompt name or a missing required argument is a JSON-RPC error, -32602, and a server failure is -32603. 2026-07-28 also lets prompts/get answer input_required, the multi round-trip shape. A successful result carries messages, each with a role (user or assistant) and one content block: text with the arguments substituted, a resource_link that points at a resource such as a style guide without inlining it, or an embedded resource with text or a base64 blob; all accept audience and priority annotations. A server with the completions {} capability answers completion/complete. The ref names what is being completed (ref/prompt by name, or ref/resource by URI template), argument gives the name and the value typed so far, and context.arguments carries answers the user already gave, so a framework suggestion can drop JavaScript options once Python is chosen. A result returns at most 100 values, with total and hasMore when the true count is larger. Neither prompts/get nor completion/complete is cacheable. The server is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'prompts/get', 'completion/complete', 'context.arguments', 'hasMore', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { get: 1, channel: true, context: true, cap: true, user: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* a person or the model reaches for the template; only the person should */
    const user = P.robot('#E07A5F', { scale: 0.6 }), model = P.robot('#3D6BD6', { scale: 0.6 });
    user.position.set(-2.25, 0, -0.65); model.position.set(-2.25, 0, 0.1); S.add(user, model);
    const tpl = P.box(0.7, 0.34, 0.5, '#7B6FA8', { r: 0.05 }); tpl.position.set(-0.85, 0, -0.65); S.add(tpl);
    const reach = [-0.65, 0.1].map(z => { const p = P.pipe([V(-2.0, 0.18, z), V(-1.5, 0.2, (z - 0.65) / 2), V(-1.2, 0.18, -0.65)], z < 0 ? GOOD : BAD, { r: 0.03, n: 3 }); S.add(p); return p; });
    /* three prompts/get requests, and a lamp for the answer channel */
    const gets = GETS.map((g, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.08, 0.32, '#fff', { r: 0.03, material: m }); b.position.set(-0.1 + i * 0.44, 0, -0.65); S.add(b); return m; });
    const chan = P.lamp(GOOD, { h: 0.2, r: 0.1 }); chan.position.set(1.25, 0, -0.65); S.add(chan);
    /* completions for "f": candidates on a shelf; a JavaScript one in red slips in without context */
    const cands = P.shelf(3, { cell: 0.26, levels: 1, lh: 0.24, d: 0.32 }); cands.position.set(-0.8, 0, 0.15); S.add(cands);
    /* the file list in a tank that holds 100: 144 spills over without a cap */
    const list = P.tank(0.5, 0.5, 0.4, GOOD); list.position.set(0.45, 0.05, 0.15); S.add(list);
    S.add(P.keep(-2.5, 1.5, 0.75, -0.95, 0.5));
    const parts = [user, model, list, ...reach];

    let R = null;
    function draw() {
      R = run(st);
      reach[0].visible = !!st.user; reach[1].visible = !st.user;
      const okGet = R.g.kind === 'ok' || st.channel;
      gets.forEach((m, i) => m.color.set(i === st.get ? SAF : OFF));
      chan.userData.set({ color: okGet ? GOOD : BAD, on: true });
      cands.userData.set({ fill: [GOOD, GOOD, st.context ? false : BAD] });
      list.userData.set({ level: R.shown / 100, color: st.cap ? GOOD : BAD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Bad prompts/get is a -32602 error', short: 'Error channel', get: () => st.channel, set: v => set({ channel: !!v }) },
      { type: 'toggle', label: 'Send context.arguments with completion', short: 'Context', get: () => st.context, set: v => set({ context: !!v }) },
      { type: 'toggle', label: 'Cap completions at 100 with hasMore', short: '100 cap', get: () => st.cap, set: v => set({ cap: !!v }) },
      { type: 'toggle', label: 'The user picks prompts', short: 'User-controlled', get: () => st.user, set: v => set({ user: !!v }) },
      { type: 'buttons', label: 'prompts/get', options: ['valid', 'missing arg', 'unknown name'], get: () => st.get, act: i => set({ get: i }) },
    ];
    const readouts = [
      { label: 'Suggestions', get: () => ({ v: R.cands.join(', '), sub: 'framework starting "f"', good: st.context, bad: !st.context }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'prompts and completion', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'A prompt template', d: 'Picked by the user, not the model', icon: 'hand', atV: V(-1.22, 0.3, -0.65) },
      { name: 't', t: 'File list', d: 'Holds 100; the rest stays behind', icon: 'box', atV: V(0.72, 0.3, 0.15) },
    ];
    const reset = () => set({ ...D0, get: st.get });
    const breaks = [
      { label: 'Return isError for a bad prompt', hint: 'prompts do not execute', on: () => set({ ...D0, channel: false, get: 1 }), off: reset },
      { label: 'Ignore the earlier answer', hint: 'context.arguments narrows', on: () => set({ ...D0, context: false }), off: reset },
      { label: 'Let the model invoke prompts', hint: 'prompts are user-controlled', on: () => set({ ...D0, user: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.g.kind === 'ok' ? 'prompts/get renders two messages: the review request and a resource_link to the style guide.' : `prompts/get with ${R.g.kind === 'missing' ? 'a missing framework' : 'a misspelt name'} is a JSON-RPC -32602 error.`}</b> Completion uses context.arguments to suggest only Python frameworks, file completions stop at 100 with total 144 and hasMore, and the user picks the prompt.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A slash command', home: true, say: 'The user types slash code review. Prompts are chosen by the user, not the model.', act: m => m.set({ get: 0, channel: true, context: true, cap: true, user: true }) },
    { t: 'Rendered messages', home: true, say: 'The server fills in the arguments and returns messages, here with a link to the style guide.', act: m => m.set({ get: 0, channel: true, context: true, cap: true, user: true }) },
    { t: 'A missing argument', home: true, say: 'Leave out a required argument and the server returns invalid params, not an error result.', act: m => m.set({ get: 1, channel: true, context: true, cap: true, user: true }) },
    { t: 'An unknown name', home: true, say: 'A misspelt prompt name is the same: minus three two six oh two.', act: m => m.set({ get: 2, channel: true, context: true, cap: true, user: true }) },
    { t: 'Narrow by context', home: true, say: 'Completion sees that Python was chosen, so it suggests only Python frameworks.', act: m => m.set({ get: 0, channel: true, context: true, cap: true, user: true }) },
    { t: 'At most one hundred', home: true, say: 'A hundred and forty four files match. The server returns a hundred and says there are more.', act: m => m.set({ get: 0, channel: true, context: true, cap: true, user: true }) },
  ],
  check: [
    { q: 'prompts/get is missing a required argument. What comes back?', options: ['-32602', 'A result with isError true', 'An empty message list'], answer: 0, why: 'Prompts have no isError channel.', hint: 'Try Return isError for a bad prompt.' },
    { q: 'Why send context.arguments with completion/complete?', options: ['So earlier answers can narrow the suggestions', 'It is required for caching', 'To authenticate'], answer: 0, why: 'Python chosen means Python frameworks.', hint: 'Try Ignore the earlier answer.' },
    { q: 'Who invokes a prompt?', options: ['The user, explicitly', 'The model', 'The server'], answer: 0, why: 'Prompts are user-controlled.', hint: 'Try Let the model invoke prompts.' },
  ],
  practice: [
    { q: 'A completion has 250 matches. What does the result show?', options: ['100 values, total 250, hasMore true', 'All 250 values', '0 values and an error', '100 values only'], answer: 0, why: 'The cap is 100.' },
    { q: 'Which ref type completes a resource template variable?', options: ['ref/resource', 'ref/prompt', 'ref/tool', 'ref/uri'], answer: 0, why: 'By URI or template.' },
    { q: 'Is prompts/get cacheable?', options: ['No', 'Yes, with ttlMs', 'Only public prompts', 'Only on HTTP'], answer: 0, why: 'prompts/list is cacheable; prompts/get is not.' },
    { q: 'Which roles can a prompt message have?', options: ['user or assistant', 'system only', 'tool', 'any string'], answer: 0, why: 'Each message has a role and one content block.' },
    { q: 'Which capability must a server declare to answer completion/complete?', options: ['completions {}', 'prompts {}', 'tools {}', 'logging {}'], answer: 0, why: 'An empty object means supported.' },
    { q: 'Can prompts/get return input_required?', options: ['Yes, in 2026-07-28', 'No', 'Only with tasks', 'Only on stdio'], answer: 0, why: 'tools/call, prompts/get and resources/read may.' },
  ],
  terms: [
    ['Prompt', 'A user-controlled template with arguments.'],
    ['prompts/get', 'Renders a prompt into messages.'],
    ['completion/complete', 'Suggests values for a prompt argument or template variable.'],
    ['ref', 'What is being completed: ref/prompt or ref/resource.'],
    ['context.arguments', 'Answers already given, used to narrow suggestions.'],
    ['hasMore', 'True when more matches exist than the 100 returned.'],
  ],
  deeper: '<p><b>Legacy lists.</b> Before 2026-07-28, list results had no caching fields; a dual-era client should treat a prompts/list without ttlMs or cacheScope as uncached.</p><p><b>About this machine.</b> The server and prompts are invented.</p>',
  code: {
    title: 'Narrow suggestions by earlier answers',
    note: 'Written for this lesson.',
    text: `
FRAMEWORKS = {"python": ["flask", "fastapi", "django"],
              "javascript": ["fastify", "express"], "java": ["spring"]}

def complete(params):
    arg = params["argument"]
    chosen = params.get("context", {}).get("arguments", {})
    pool = FRAMEWORKS.get(chosen.get("language"), sum(FRAMEWORKS.values(), []))
    matches = [f for f in pool if f.startswith(arg["value"])]
    return {"completion": {"values": matches[:100], "total": len(matches),
                           "hasMore": len(matches) > 100}}

def prompts_get(req):
    p = PROMPTS.get(req["params"]["name"])
    missing = [a.name for a in p.arguments if a.required and a.name not in req["params"].get("arguments", {})] if p else []
    if not p or missing:
        return error(req, -32602, "Unknown prompt" if not p else f"Missing argument: {missing[0]}")
    return result(req, messages=p.render(req["params"]["arguments"]))
`,
  },
};
