// Exam prep, MCP consent and least privilege: an invented school-records server in Bujumbura has read_grades, delete_file and send_payment.
// Consent travels through MRTR elicitation: accept (with content) is consent; decline and cancel both block, and cancel is not a decline.
// Consent is scoped to one tool, never the whole server. requestState is signed, bound to the call and single-use. Insufficient scope is a
// separate gate: 403 insufficient_scope, and the client re-authorises with the union of old and new scopes. tools/list may differ by the
// caller's authorization, never by connection. Illustrative.
const CASES = [
  { n: 'teacher approves delete_file', action: 'accept' },
  { n: 'teacher declines', action: 'decline' },
  { n: 'teacher closes the dialog', action: 'cancel' },
  { n: 'same session: send_payment next', action: 'carry' },
  { n: 'token lacks payments:write', action: 'scope' },
];

function run(o) {
  const c = CASES[o.cs];
  let out, ok = true;
  if (c.action === 'accept') out = 'accept + content {confirm: true} → delete_file runs once';
  if (c.action === 'decline') out = 'decline → not run; model told the user said no';
  if (c.action === 'cancel') { out = o.cancel ? 'cancel → not run; model told the user did not decide' : 'cancel treated as decline: "the user refused"'; ok = o.cancel; }
  if (c.action === 'carry') { out = o.perTool ? 'new consent asked for send_payment' : 'ran: delete_file approval reused as "trust this server"'; ok = o.perTool; }
  if (c.action === 'scope') { out = o.union ? '403 insufficient_scope → re-authorise with grades:read + payments:write' : 're-authorised with payments:write only: grades:read lost'; ok = o.union; }
  const issues = [];
  if (!o.cancel) issues.push('a cancelled dialog was reported as a decline; cancel means the user did not decide');
  if (!o.perTool) issues.push('approval for delete_file was reused for send_payment; consent is scoped to one tool');
  if (!o.union) issues.push('step-up replaced the old scopes instead of taking the union, so the teacher lost grades:read');
  if (!o.list) issues.push('the tools/list result showed send_payment to a student whose token has no payment scope; lists should reflect the caller\'s authorization');
  if (!o.state) issues.push('the requestState was unsigned and reusable, so an old approval could be replayed');
  return { c, out, ok: ok && issues.length === 0, issues, rowOk: ok };
}

export default {
  slug: 'exam-mcp-consent-and-least-privilege',
  title: 'Exam prep, MCP: consent and least privilege',
  description: 'A school-records server asks before deleting files or sending payments. Send each call through three gates, and let no approval carry to the next tool.',
  overview: 'Tools are model-controlled, but the specification is clear that a human should always be able to deny a call, and that an application should show which tools are exposed, mark when one runs and confirm sensitive operations. In a stateless core the server cannot hold a dialog open, so consent travels through multi round-trip elicitation: the server ends the call with input_required and an elicitation/create request, and the client retries with the user\'s answer. The answer is one of three actions: accept, with content matching the requested schema in form mode, which is consent; decline, the user explicitly said no; and cancel, the user walked away without deciding. Decline and cancel both block the call, but they mean different things, so a client should not report a cancel as a refusal. The requestState that carries the pending call is attacker-controlled once it leaves the server; if it influences what runs, sign it, bind it to the specific call and consume it once, so an old approval cannot be replayed. Consent is scoped to exactly one tool: approving delete_file does not approve send_payment, even on the same server moments later, and a "trust this server" grant turns an informed decision into a blanket one. Before consent there is a separate gate: authorization. If the token lacks scope, the server returns 403 with WWW-Authenticate error="insufficient_scope" and the full set of scopes the operation needs; the client re-authorises with the union of the scopes it held and the new ones, never replacing them, with a limited number of retries. Least privilege also applies to what a server reveals: tools/list must not change per connection or as a side effect, but it may differ by the authorization on the request, so a caller sees only the tools their scopes allow, while each call is still checked at execution. The school system is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'consent', 'elicitation', 'least privilege', 'step-up authorization', 'insufficient_scope', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 2, cancel: true, perTool: true, union: true, list: true, state: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* a belt through three gates: token scopes, consent per tool, a check at execution */
    const GX = [-1.7, -0.7, 0.3];
    const line = P.belt(V(-2.5, 0, -0.45), V(1.0, 0, -0.45), { w: 0.32, speed: 0.8 }); S.add(line);
    const gates = GX.map(x => { const g = P.gate(0.48, GOOD, { h: 0.42 }); g.rotation.y = Math.PI / 2; g.position.set(x, 0, -0.45); S.add(g); return g; });
    const vault = P.box(0.46, 0.34, 0.46, '#5B8DB8', { r: 0.05 }); vault.position.set(1.3, 0, -0.45); S.add(vault);
    /* two people and the tools their token lets them see */
    const lists = ['#3D6BD6', '#E07A5F'].map((c, i) => {
      const r = P.robot(c, { scale: 0.5 }); r.position.set(-2.3 + i * 1.3, 0, 0.32); S.add(r);
      const s = P.shelf(3, { cell: 0.17, levels: 1, lh: 0.18, d: 0.24 }); s.position.set(-1.8 + i * 1.3, 0, 0.32); S.add(s);
      return { r, s };
    });
    /* a signed state lamp, five case pads */
    const signed = P.lamp(GOOD, { h: 0.16, r: 0.09 }); signed.position.set(0.55, 0, 0.32); S.add(signed);
    const pads = CASES.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.26, 0.08, 0.26, '#fff', { r: 0.02, material: m }); b.position.set(-0.05 + i * 0.32, 0, 0.72); S.add(b); return m; });
    S.add(P.keep(-2.6, 1.6, 0.75, -0.8, 0.9));
    const parts = [line, ...gates, ...lists.map(l => l.r)];
    let clock = 0, stopAt = 1, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      const a = R.c.action, at = a === 'scope' ? 0 : a === 'decline' || a === 'cancel' || (a === 'carry' && st.perTool) ? 1 : -1;
      gates.forEach((g, i) => g.userData.set({ color: i === at ? SAF : R.rowOk ? GOOD : BAD }));
      gates[1].visible = !(a === 'carry' && !st.perTool);
      stopAt = at < 0 ? 1 : (GX[at] - 0.14 + 2.5) / 3.5;
      parcel = R.rowOk ? (at < 0 ? GOOD : SAF) : BAD;
      lists[0].s.userData.set({ fill: [GOOD, GOOD, GOOD] });
      lists[1].s.userData.set({ fill: [GOOD, st.list ? false : BAD, st.list ? false : BAD] });
      signed.userData.set({ color: st.state ? GOOD : BAD, on: true });
      pads.forEach((m, i) => m.color.set(i === st.cs ? SAF : OFF));
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Cancel is not a decline', short: 'Cancel', get: () => st.cancel, set: v => set({ cancel: !!v }) },
      { type: 'toggle', label: 'Consent per tool', short: 'Per tool', get: () => st.perTool, set: v => set({ perTool: !!v }) },
      { type: 'toggle', label: 'Step up with the union of scopes', short: 'Union', get: () => st.union, set: v => set({ union: !!v }) },
      { type: 'toggle', label: 'Lists reflect the caller\'s authorization', short: 'Scoped lists', get: () => st.list, set: v => set({ list: !!v }) },
      { type: 'toggle', label: 'Signed, single-use requestState', short: 'Signed state', get: () => st.state, set: v => set({ state: !!v }) },
      { type: 'buttons', label: 'Scenario', options: ['approve', 'decline', 'cancel', 'next tool', 'more scope'], get: () => st.cs, act: i => set({ cs: i }) },
    ];
    const readouts = [
      { label: 'Outcome', get: () => ({ v: R.rowOk ? 'correct' : 'wrong', sub: R.c.n, good: R.rowOk, bad: !R.rowOk }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'consent and privilege', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'g', t: 'Three gates', d: 'Scope, consent, execution', icon: 'hand', atV: V(-2.5, 0.1, -0.45) },
      { name: 't', t: 'The tools', d: 'Red: shown to the wrong token', icon: 'check', atV: V(-0.2, 0.2, 0.32) },
    ];
    const reset = () => set({ ...D0, cs: st.cs });
    const breaks = [
      { label: 'Treat cancel as decline', hint: 'the user did not decide', on: () => set({ ...D0, cs: 2, cancel: false }), off: reset },
      { label: 'Reuse an approval for another tool', hint: 'consent is per tool', on: () => set({ ...D0, cs: 3, perTool: false }), off: reset },
      { label: 'Replace scopes on step-up', hint: 'take the union', on: () => set({ ...D0, cs: 4, union: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: ${R.out}.</b> Consent is per tool, requestState is signed and used once, step-up keeps earlier scopes, and each caller lists only the tools their token allows.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; line.userData.send(parcel, { size: 0.17, stop: stopAt }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ask without a session', home: true, say: 'The server ends the call and asks for confirmation. The client retries with the answer.', act: m => m.set({ cs: 0, cancel: true, perTool: true, union: true, list: true, state: true }) },
    { t: 'Three answers', home: true, say: 'Only accept is consent. Decline is a clear no.', act: m => m.set({ cs: 1, cancel: true, perTool: true, union: true, list: true, state: true }) },
    { t: 'Cancel', home: true, say: 'Cancel means the user walked away. It blocks the call, but it is not a refusal.', act: m => m.set({ cs: 2, cancel: true, perTool: true, union: true, list: true, state: true }) },
    { t: 'One tool at a time', home: true, say: 'Approving a delete does not approve a payment, even a moment later.', act: m => m.set({ cs: 3, cancel: true, perTool: true, union: true, list: true, state: true }) },
    { t: 'Step up', home: true, say: 'Missing scope gets a forbidden reply. The client asks for old and new scopes together.', act: m => m.set({ cs: 4, cancel: true, perTool: true, union: true, list: true, state: true }) },
    { t: 'Show only what is allowed', home: true, say: 'A student\'s token lists only the tools it may use.', act: m => m.set({ cs: 4, cancel: true, perTool: true, union: true, list: true, state: true }) },
  ],
  check: [
    { q: 'The user closes the consent dialog. What is that?', options: ['cancel: not run, and not a refusal', 'decline', 'accept'], answer: 0, why: 'Only accept is consent.', hint: 'Try Treat cancel as decline.' },
    { q: 'The user approved delete_file. Is send_payment approved too?', options: ['No: consent is per tool', 'Yes, same server', 'Yes, same session'], answer: 0, why: 'No blanket trust-this-server grants.', hint: 'Try Reuse an approval for another tool.' },
    { q: 'A 403 insufficient_scope arrives. Which scopes does the client request?', options: ['The union of old and new', 'Only the new ones', 'Every scope that exists'], answer: 0, why: 'Never lose earned scopes.', hint: 'Try Replace scopes on step-up.' },
  ],
  practice: [
    { q: 'Why must requestState be signed when it carries a pending call?', options: ['It passes through the client and can be tampered with or replayed', 'For speed', 'It is required for caching', 'It is not needed'], answer: 0, why: 'Sign, bind to the call, consume once.' },
    { q: 'May tools/list differ between two callers?', options: ['Yes, by the authorization on each request', 'No, never', 'Yes, by connection', 'Only on stdio'], answer: 0, why: 'Not by connection or side effects.' },
    { q: 'What does an application show to keep a human in the loop?', options: ['Which tools are exposed, when one runs, and confirmations for sensitive ones', 'Nothing', 'Only errors', 'Only the final answer'], answer: 0, why: 'The specification expects visibility and denial.' },
    { q: 'Which check comes first for a send_payment call?', options: ['Authorization: does the token carry the scope?', 'Consent', 'Execution', 'Caching'], answer: 0, why: 'Then consent, then execution checks.' },
    { q: 'Which elicitation action carries content?', options: ['accept, in form mode', 'decline', 'cancel', 'all three'], answer: 0, why: 'Content matching the requested schema.' },
    { q: 'How many step-up retries should a client attempt?', options: ['A limited number', 'Unlimited', 'Zero', 'One per scope forever'], answer: 0, why: 'Avoid loops.' },
  ],
  terms: [
    ['Consent', 'An accept answer for one specific tool call.'],
    ['decline', 'The user explicitly said no.'],
    ['cancel', 'The user did not decide; the call does not run.'],
    ['Step-up authorization', '403 insufficient_scope, then re-authorise with the union.'],
    ['Least privilege', 'Exposing and granting only what the caller needs.'],
    ['Scoped list', 'tools/list that reflects the request\'s authorization.'],
  ],
  deeper: '<p><b>Sensitive data.</b> For payments or third-party consent pages, use URL-mode elicitation so the data never passes through the client.</p><p><b>About this machine.</b> The school system is invented.</p>',
  code: {
    title: 'Read the answer, then step up correctly',
    note: 'Written for this lesson.',
    text: `
def after_elicitation(result):
    action = result["action"]
    if action == "accept":
        return run_once(result["content"])         # consent for this one tool
    if action == "decline":
        return tell_model("the user said no")
    return tell_model("the user did not decide")   # cancel is not a decline

def step_up(held, challenge, retries=2):
    needed = set(parse_scopes(challenge))          # 403 insufficient_scope
    for _ in range(retries):
        token = authorize(scopes=held | needed)    # union, never replace
        if token.ok:
            return token
`,
  },
};
