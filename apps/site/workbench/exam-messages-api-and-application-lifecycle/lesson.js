// Exam prep, the Messages API as a state machine: an invented courier in Lusaka runs an order-tracking assistant. The API is stateless, so the
// client builds every request from its own stored history. Four events happen in one session: Claude asks for a tool, a later answer stops at
// the token limit, a response arrives with a stop reason the code has never seen, and a network retry repeats a send_sms tool call. Each row
// shows what the client does with and without the right habit. Field names follow the public API documentation; check it for current values.
const EVENTS = [
  { n: 'Claude asks for lookup_order', stop: 'tool_use' },
  { n: 'The answer stops mid-sentence', stop: 'max_tokens' },
  { n: 'An unfamiliar stop reason arrives', stop: 'new_reason' },
  { n: 'A timeout retries send_sms', stop: 'tool_use' },
];
function session(o) {
  const rows = [];
  rows.push(o.history && o.matchId ? { ok: true, what: 'resends the tool_use block, then a\ntool_result with tool_use_id toolu_01' } : { ok: false, what: !o.history ? 'sends only the tool_result: this\nrequest never asked for a tool' : 'sends a tool_result whose id\ndoes not match: rejected' });
  rows.push(o.stopReason ? { ok: true, what: 'sees max_tokens: marks the answer\nincomplete and continues with a plan' } : { ok: false, what: 'trusts the text, which looks finished,\nand shows a cut-off answer' });
  rows.push(o.failClosed ? { ok: true, what: 'stops on the unknown reason, logs\nthe metadata and alerts an engineer' } : { ok: false, what: 'loops until end_turn, request after\nrequest, until the budget runs out' });
  rows.push(o.idem ? { ok: true, what: 'retries with the same operation key:\nthe SMS is sent once' } : { ok: false, what: 'runs send_sms again on the retry:\nthe customer gets two messages' });
  return { rows, ok: rows.filter(r => r.ok).length };
}

export default {
  slug: 'exam-messages-api-and-application-lifecycle',
  title: 'Exam prep: the Messages API is a state machine',
  description: 'A courier\'s tracking assistant calls an API that remembers nothing. Build each request from your own history, and handle four events by their signals.',
  overview: 'The Messages API is stateless. A request carries the model, the system instructions, the messages so far, token limits and optional features; a response carries typed content blocks, usage and the reason generation stopped. Nothing is remembered between calls, so the client owns the conversation and every transition. A tool round trip shows why. When Claude wants a tool, the response contains a tool_use block with an id and stops with stop_reason tool_use. The client validates and runs the tool, then sends a new request containing the earlier history, the assistant message with that tool_use block, and a user message with a tool_result whose tool_use_id matches exactly. Sending only the result, or the wrong id, breaks the exchange. Responses are sequences of blocks, text, tool_use, thinking and possibly new types, so code should switch on each block\'s type instead of reading the first block\'s text. Branch on stop_reason, not on what the text says: end_turn means the turn is complete, tool_use means run tools and continue, max_tokens means the output may be cut off, refusal means the model declined and an approved fallback applies, and other values exist and new ones can appear. Never loop until end_turn; handle each known value, cap the number of turns and the time, and fail closed on anything unknown. Keep each user\'s history separate, store typed blocks rather than a flattened transcript, budget context and compact it carefully, and make side-effecting tools idempotent, so a retried request cannot send a payment or a message twice. Choose synchronous calls for interactive answers, streaming when partial display matters, and batches for many independent jobs that can finish later. Field names and values change; check the current official documentation.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'Messages API', 'stop_reason', 'tool_use', 'idempotency', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.05], dir: [0.05, 1.0, 1.15], half: 1.1, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { history: true, matchId: true, stopReason: true, failClosed: true, idem: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', SAF = '#F2AE0C';
    /* the client and the message stack it rebuilds for every call: the question, the tool request, then the tool result (coral if its id doesn't match) */
    const bot = P.robot(BLUE, { scale: 0.6 }); bot.position.set(-2.35, 0, 0.3); S.add(bot);
    const msgs = P.stack(0.5, 0.5, 0.18, { max: 3 }); msgs.position.set(-2.35, 0, -0.45); S.add(msgs);
    /* the API, which keeps nothing: a bare block with a pipe from the client and a lamp for the tool round trip */
    const api = P.box(0.7, 0.62, 0.62, '#3B3F52', { r: 0.06 }); api.position.set(-0.85, 0, -0.45); S.add(api);
    const pipe = P.pipe([V(-2.08, 0.25, -0.45), V(-1.6, 0.42, -0.45), V(-1.2, 0.25, -0.45)], BLUE, { r: 0.035, n: 5 }); S.add(pipe);
    /* the other three events: the answer's length (cut off, or marked incomplete), the budget (fails closed, or drains in a loop), the text messages sent */
    const ans = P.tower(0.42, 0.42, GOOD); ans.userData.set({ cap: '' }); ans.position.set(0.15, 0, -0.45); ans.userData.noFit = true; S.add(ans);
    const tank = P.tank(0.42, 0.72, 0.42, SAF); tank.position.set(0.95, 0, -0.45); S.add(tank);
    const sms = [0, 1].map(i => { const b = P.box(0.3, 0.1, 0.42, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: GOOD }) }); b.position.set(1.75, i * 0.15, -0.45); S.add(b); return b; });
    const lamps = [-0.85, 0.15, 0.95, 1.75].map(x => { const l = P.lamp(GOOD, { h: 0.14, r: 0.09 }); l.position.set(x, 0, 0.3); S.add(l); return l; });
    S.add(P.keep(-2.7, 2.1, 1.0, -0.85, 0.6));

    let R = null;
    function draw() {
      R = session(st);
      const res = st.matchId ? GOOD : BAD;
      msgs.userData.set(st.history ? { n: 3, colors: [BLUE, '#7B6FA8', res] } : { n: 1, colors: [res] });
      pipe.userData.set({ color: R.rows[0].ok ? BLUE : BAD });
      R.rows.forEach((r, i) => lamps[i].userData.set({ color: r.ok ? GOOD : BAD, on: true }));
      ans.userData.set({ h: R.rows[1].ok ? 0.75 : 0.35, color: R.rows[1].ok ? GOOD : BAD });
      tank.userData.set({ level: R.rows[2].ok ? 0.15 : 1.1 });
      sms.forEach((b, i) => { b.visible = i === 0 || !st.idem; b.material.color.set(st.idem ? GOOD : BAD); });
    }
    function isOk() { return R.ok === 4; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Resend the history with the tool_use block', short: 'History', get: () => st.history, set: v => set({ history: !!v }) },
      { type: 'toggle', label: 'Match tool_use_id exactly', short: 'Match id', get: () => st.matchId, set: v => set({ matchId: !!v }) },
      { type: 'toggle', label: 'Branch on stop_reason, not the text', short: 'stop_reason', get: () => st.stopReason, set: v => set({ stopReason: !!v }) },
      { type: 'toggle', label: 'Cap turns and fail closed on unknowns', short: 'Fail closed', get: () => st.failClosed, set: v => set({ failClosed: !!v }) },
      { type: 'toggle', label: 'Idempotency key on side effects', short: 'Idempotent', get: () => st.idem, set: v => set({ idem: !!v }) },
    ];
    const readouts = [
      { label: 'Handled safely', get: () => ({ v: `${R.ok} of 4`, sub: 'events', good: R.ok === 4, bad: R.ok < 4 }) },
      { label: 'Tool round trip', get: () => ({ v: R.rows[0].ok ? 'accepted' : 'broken', sub: 'history + id', good: R.rows[0].ok, bad: !R.rows[0].ok }) },
      { label: 'SMS sent', get: () => ({ v: st.idem ? 'once' : 'twice', sub: 'after a retry', good: st.idem, bad: !st.idem }) },
    ];
    const labels = [
      { name: 'a', t: 'The message stack', d: 'Rebuilt by the client each call', icon: 'code', atV: V(-2.6, 0.3, -0.45) },
      { name: 't', t: 'Four events', d: 'Answer, budget, messages sent', icon: 'target', atV: V(1.95, 0.15, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send only the tool result', hint: 'state not resent', on: () => set({ ...D0, history: false }), off: reset },
      { label: 'Trust the text, not stop_reason', hint: 'a cut-off answer', on: () => set({ ...D0, stopReason: false, failClosed: false }), off: reset },
      { label: 'Retry without an idempotency key', hint: 'the SMS goes twice', on: () => set({ ...D0, idem: false }), off: reset },
    ];
    function status() {
      const bad = R.rows.map((r, i) => r.ok ? null : `${EVENTS[i].n.toLowerCase()}: the client ${r.what.replace('\n', ' ')}`).filter(Boolean);
      if (!bad.length) return { ok: true, msg: '<b>The client resends the history with the tool_use block and a matching tool_result, branches on stop_reason so a max_tokens answer is marked incomplete, stops and alerts on an unknown reason, and retries side effects with an operation key.</b> Every transition belongs to your code.' };
      return { ok: false, msg: `<b>${bad[0][0].toUpperCase() + bad[0].slice(1)}.</b> ${!st.history || !st.matchId ? 'The API keeps no state: resend the assistant\'s tool_use block and answer it with the exact tool_use_id.' : !st.stopReason ? 'Branch on stop_reason; the text can look complete when it is not.' : !st.failClosed ? 'Handle each known stop reason, cap turns, and fail closed on anything else.' : 'Give side-effecting calls a stable operation key so retries cannot repeat them.'}` };
    }
    return { update: dt => { bot.userData.tick(dt); pipe.userData.tick(dt); ans.userData.tick(dt); tank.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Stateless', home: true, say: 'The Messages API remembers nothing between calls. The client sends the conversation every time.', act: m => m.set({ history: false, matchId: true, stopReason: true, failClosed: true, idem: true }) },
    { t: 'A tool round trip', home: true, say: 'Resend the assistant\'s tool_use block, then a tool_result with the same id.', act: m => m.set({ history: true, matchId: true, stopReason: true, failClosed: true, idem: true }) },
    { t: 'Stop reasons', home: true, say: 'The text can look finished when generation stopped at the token limit. Branch on stop_reason.', act: m => m.set({ history: true, matchId: true, stopReason: false, failClosed: true, idem: true }) },
    { t: 'Unknown signals', home: true, say: 'Never loop until end_turn. Cap the turns and fail closed on a reason you do not know.', act: m => m.set({ history: true, matchId: true, stopReason: true, failClosed: false, idem: true }) },
    { t: 'Retries', home: true, say: 'A network retry can repeat a side effect. An idempotency key makes it happen once.', act: m => m.set({ history: true, matchId: true, stopReason: true, failClosed: true, idem: false }) },
    { t: 'Your state machine', home: true, say: 'Every arrow is your code: build, call, store, branch, continue or stop.', act: m => m.set({ history: true, matchId: true, stopReason: true, failClosed: true, idem: true }) },
  ],
  check: [
    { q: 'A tool_result sent alone in a fresh request is rejected. Why?', options: ['The API is stateless; the assistant\'s tool_use block was not resent', 'The tool failed', 'The model forgot'], answer: 0, why: 'The client owns history.', hint: 'Try Send only the tool result.' },
    { q: 'An answer looks complete but stop_reason is max_tokens. What then?', options: ['Treat it as possibly cut off', 'Show it as complete', 'Ignore stop_reason'], answer: 0, why: 'Branch on the signal.', hint: 'Try Trust the text.' },
    { q: 'Why give side-effecting tool calls an idempotency key?', options: ['So a retry cannot repeat the effect', 'For speed', 'For logging'], answer: 0, why: 'A send happens once.', hint: 'Try Retry without an idempotency key.' },
  ],
  practice: [
    { q: 'A chatbot "forgets" what the user said two turns ago. Where should the engineer look first?', options: ['The client\'s stored message history, since the API keeps no conversation', 'The model\'s memory settings', 'The temperature', 'The system prompt length'], answer: 0, why: 'Suspect client-owned state first.' },
    { q: 'A response contains a text block and a tool_use block. Which code is correct?', options: ['Switch on each block\'s type and handle tool_use explicitly', 'Read content[0].text', 'Ignore non-text blocks', 'Concatenate all blocks as text'], answer: 0, why: 'Responses are sequences of typed blocks.' },
    { q: 'Which loop is safe?', options: ['Handle each known stop_reason, cap turns and time, and fail closed on unknown values', 'while stop_reason != "end_turn": call again', 'Retry until the text looks finished', 'Loop forever with a delay'], answer: 0, why: 'Unknown states must stop, not loop.' },
    { q: 'Thousands of independent documents must be classified by tomorrow. Which pattern fits?', options: ['A message batch, reconciled by each item\'s id', 'Streaming', 'One long conversation', 'Synchronous calls in a tight loop'], answer: 0, why: 'Many independent jobs that can finish later.' },
    { q: 'A user wants to see the answer appear as it is written. Which pattern fits?', options: ['Streaming', 'Batch', 'Polling the result later', 'A larger model'], answer: 0, why: 'Partial display needs streaming.' },
    { q: 'A long session is summarised to save context. What must the summary keep?', options: ['Open tool requests, user constraints, verified facts and approval state', 'Only the last message', 'The greeting', 'Nothing specific'], answer: 0, why: 'A summary that drops "do not send" is wrong.' },
  ],
  terms: [
    ['Stateless API', 'Each call carries all the context; nothing is kept between calls.'],
    ['Content block', 'A typed part of a message: text, tool_use, tool_result and more.'],
    ['tool_use_id', 'Links a tool_result to the tool request it answers.'],
    ['stop_reason', 'Why generation stopped, which decides what the client does next.'],
    ['Fail closed', 'Stop safely on an unknown state instead of carrying on.'],
    ['Idempotency key', 'A stable id so a retried action happens only once.'],
  ],
  deeper: '<p><b>SDK or raw HTTP.</b> An official SDK gives typed models, retries and stream helpers; you still own state, stop-reason policy and tool authorisation.</p><p><b>Files and caching.</b> Repeated assets can be uploaded once and referenced, and a long shared prefix can be cached; check tenant binding and deletion.</p><p><b>About this machine.</b> The courier is invented; check field names and stop reasons in the current documentation.</p>',
  code: {
    title: 'A bounded tool loop',
    note: 'Written for this lesson; check the current SDK documentation.',
    text: `
def run(client, model, system, messages, tools, max_turns=6):
    for _ in range(max_turns):
        resp = client.messages.create(model=model, system=system, messages=messages,
                                      tools=tools, max_tokens=800)
        messages.append({"role": "assistant", "content": resp.content})   # store typed blocks
        if resp.stop_reason == "end_turn":
            return validate(resp)
        if resp.stop_reason == "tool_use":
            results = [{"type": "tool_result", "tool_use_id": b.id,
                        "content": run_tool(b.name, b.input, key=f"{b.id}")}   # idempotent
                       for b in resp.content if b.type == "tool_use"]
            messages.append({"role": "user", "content": results})
            continue
        if resp.stop_reason == "max_tokens":
            return mark_incomplete(resp)
        return fail_closed(resp)               # refusal or anything unknown
    return fail_closed("turn limit")
`,
  },
};
