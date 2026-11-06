// Exam prep, MCPA capstone: one incident on an invented incident-console server at a power utility in Accra exercises all five blueprint
// domains in one transcript: a -32022 version mismatch corrected by data.supported; tools/list and an unknown tool (-32602); restart_service
// missing an argument (isError) and a console without elicitation (-32021); MRTR consent with a signed requestState and a tampered retry
// rejected; run_full_diagnostics as a task when the extension is declared; acknowledge_incident over Streamable HTTP with OAuth and matching
// headers; one traceparent across hops and a hash-chained audit log. Readiness is weighted by the blueprint. Illustrative.
const DOMS = [
  { k: 'fund', n: 'Fundamentals', w: 16, stage: '2025-11-25 → -32022 with data.supported → retry at 2026-07-28, new id', bad: 'fell back to initialize on -32022' },
  { k: 'arch', n: 'Architecture', w: 14, stage: 'tools/list · restart_srvc → -32602 · missing environment → isError', bad: 'unknown tool got -32601; bad argument got -32602' },
  { k: 'inter', n: 'Interactions', w: 26, stage: 'no elicitation → -32021 · input_required → retry with inputResponses · diagnostics → task, polled', bad: 'server pushed a request mid-call; diagnostics held the request open' },
  { k: 'sec', n: 'Security', w: 24, stage: 'requestState HMAC-bound; tampered retry rejected · Bearer token, audience checked · headers = body', bad: 'unsigned state replayed; token passed upstream' },
  { k: 'eco', n: 'Use cases', w: 20, stage: 'tasks extension declared per request · same trace id every hop · audit chain verifies', bad: 'extension assumed from an earlier call; audit edit undetected' },
];

function run(o) {
  const rows = DOMS.map(d => ({ d, ok: o[d.k] }));
  const weighted = rows.reduce((a, r) => a + (r.ok ? r.d.w : 0), 0);
  const plain = rows.filter(r => r.ok).length * 20;
  return { rows, weighted, plain, ok: rows.every(r => r.ok) };
}

export default {
  slug: 'exam-mcpa-capstone-readiness',
  title: 'Exam prep capstone, MCP: one incident, five domains',
  description: 'One incident on a console runs through every blueprint domain, from a version retry to an audit chain. Each gate must hold, and each counts by its weight.',
  overview: 'The capstone plays one incident against an incident-console server and maps every stage to something this track taught. Fundamentals: a client configured for 2025-11-25 calls server/discover and gets -32022 with data.supported; there is no handshake to blame and no session, so it retries with 2026-07-28 and a new id. Architecture: tools/list is the only contract the client has; a call to an unregistered tool is -32602, not -32601; a restart_service call missing environment is a normal result with isError true, because the request was legal JSON-RPC. Interactions: a read-only console that never declared elicitation gets -32021; with the capability declared, the server ends the call with input_required, the operator confirms, and the client retries with inputResponses, the requestState echoed exactly and a new id; run_full_diagnostics returns a task only when that request declared io.modelcontextprotocol/tasks, and the client polls tasks/get. Security: requestState is HMAC-protected and bound to the principal, an expiry and the request, so a retry with one flipped signature character is rejected; acknowledge_incident travels over Streamable HTTP with MCP-Protocol-Version, Mcp-Method and Mcp-Name agreeing with the body and a Bearer token whose audience is this server. Ecosystem and operations: extensions are declared per request, one traceparent trace id survives every hop with a fresh span each time, and a hash-chained audit log verifies at the end, catching any edited entry. Readiness for the exam is measured the way lesson 00 set up: weighted by the blueprint (16, 14, 26, 24, 20), because a plain average lets the light domains hide the heavy ones, and with no published pass mark the only honest target is solid competence in every domain. The utility is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'capstone', 'readiness', 'end to end', 'blueprint', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fund: true, arch: true, inter: true, sec: true, eco: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the incident rides a belt through a gate for each domain; each gate has a weight tower behind it */
    const X = i => -1.75 + i * 0.68;
    const line = P.belt(V(-2.2, 0, -0.1), V(1.3, 0, -0.1), { w: 0.32, speed: 0.8 }); S.add(line);
    const rows = DOMS.map((d, i) => {
      const g = P.gate(0.48, GOOD, { h: 0.42 }); g.rotation.y = Math.PI / 2; g.position.set(X(i), 0, -0.1); S.add(g);
      const t = P.tower(0.3, 0.26, GOOD, { h: d.w * 0.022 }); t.userData.set({ cap: '' }); t.position.set(X(i), 0, -0.55); S.add(t);
      return { g, t };
    });
    /* readiness: a tower by blueprint weight and a tower by plain count */
    const wt = P.tower(0.34, 0.34, GOOD, { h: 0.8 }), pl = P.tower(0.34, 0.34, OFF, { h: 0.8 }); [wt, pl].forEach(t => t.userData.set({ cap: '' })); wt.position.set(1.65, 0, -0.1); pl.position.set(2.05, 0, -0.1); S.add(wt, pl);
    S.add(P.keep(-2.3, 2.25, 0.95, -0.75, 0.2));
    const parts = [line, wt, pl, ...rows.map(r => r.t)];
    let clock = 0;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => { rows[i].g.visible = !!r.ok; rows[i].t.userData.set({ color: r.ok ? GOOD : BAD }); });
      wt.userData.set({ h: R.weighted * 0.008, color: R.ok ? GOOD : SAF }); pl.userData.set({ h: R.plain * 0.008 });
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = DOMS.map(d => ({ type: 'toggle', label: `${d.n} done right (${d.w}%)`, short: d.n, get: () => st[d.k], set: v => set({ [d.k]: !!v }) }));
    const readouts = [
      { label: 'Weighted readiness', get: () => ({ v: `${R.weighted}%`, sub: `plain ${R.plain}%`, good: R.ok, bad: !R.ok }) },
      { label: 'Domains', get: () => ({ v: `${R.rows.filter(r => r.ok).length} of 5`, sub: 'demonstrated' }) },
    ];
    const labels = [
      { name: 'd', t: 'Five domains', d: 'Tower height: the blueprint weight', icon: 'target', atV: V(-1.92, 0.2, -0.55) },
      { name: 't', t: 'Readiness', d: 'By weight, beside a plain count', icon: 'check', atV: V(2.22, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Fall back on -32022', hint: 'it is a modern error', on: () => set({ ...D0, fund: false }), off: reset },
      { label: 'Use the wrong error channel', hint: '-32602 vs isError', on: () => set({ ...D0, arch: false }), off: reset },
      { label: 'Leave requestState unsigned', hint: 'attacker-controlled', on: () => set({ ...D0, sec: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The incident runs clean: the version is corrected from data.supported, an unknown tool is -32602 and a missing argument isError, a missing capability is -32021, consent comes through a signed MRTR retry, diagnostics run as a polled task, the HTTP call carries matching headers and a checked token, and one trace id and a verified audit chain cover it all.</b>' };
      const f = R.rows.filter(r => !r.ok).map(r => `${r.d.n} (${r.d.w}%): ${r.d.bad}`);
      return { ok: false, msg: `<b>${f.join('; ')}.</b> Weighted readiness ${R.weighted}% (a plain count would say ${R.plain}%).` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.1) { clock = 0; line.userData.send(R.ok ? GOOD : BAD, { size: 0.16 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One incident', home: true, say: 'One outage on an incident console touches every domain of the blueprint.', act: m => m.set({ fund: true, arch: true, inter: true, sec: true, eco: true }) },
    { t: 'Fundamentals', home: true, say: 'A wrong version gets a list of supported ones. The client retries, with no handshake and no session.', act: m => m.set({ fund: true, arch: false, inter: false, sec: false, eco: false }) },
    { t: 'Architecture', home: true, say: 'An unknown tool is invalid params. A missing argument is an error result the model can fix.', act: m => m.set({ fund: true, arch: true, inter: false, sec: false, eco: false }) },
    { t: 'Interactions', home: true, say: 'Consent comes through a multi round-trip retry, and the long diagnostics run as a task.', act: m => m.set({ fund: true, arch: true, inter: true, sec: false, eco: false }) },
    { t: 'Security', home: true, say: 'The state is signed, a tampered retry fails, and the HTTP call carries a checked token.', act: m => m.set({ fund: true, arch: true, inter: true, sec: true, eco: false }) },
    { t: 'Ready', home: true, say: 'One trace id and a verified audit chain cover it all. Every domain is demonstrated.', act: m => m.set({ fund: true, arch: true, inter: true, sec: true, eco: true }) },
  ],
  check: [
    { q: 'A client sends 2025-11-25 to a modern server and gets -32022. What next?', options: ['Retry with a version from data.supported and a new id', 'Fall back to initialize', 'Give up'], answer: 0, why: 'A recognised modern error means modern.', hint: 'Try Fall back on -32022.' },
    { q: 'restart_service is called without its required argument. Which channel?', options: ['isError true result', '-32602', '-32601'], answer: 0, why: 'The request itself was legal.', hint: 'Try Use the wrong error channel.' },
    { q: 'A retry arrives with requestState whose signature was altered. What happens?', options: ['The server rejects it', 'It is accepted', 'The server asks the model'], answer: 0, why: 'HMAC-bound to principal, expiry and request.', hint: 'Try Leave requestState unsigned.' },
  ],
  practice: [
    { q: 'Which two domains together are half the exam?', options: ['Interactions and Security', 'Fundamentals and Architecture', 'Architecture and Use cases', 'Fundamentals and Use cases'], answer: 0, why: '26 and 24 percent.' },
    { q: 'run_full_diagnostics returns a task only when…', options: ['That request declared the tasks extension', 'An earlier request did', 'Always', 'The server is slow'], answer: 0, why: 'Extensions are per request.' },
    { q: 'What must the HTTP headers on acknowledge_incident agree with?', options: ['The JSON-RPC body', 'The previous request', 'The audit log', 'Nothing'], answer: 0, why: 'Otherwise 400 and -32020.' },
    { q: 'What proves the audit log was not edited?', options: ['The hash chain verifies', 'The trace id', 'clientInfo', 'The tool list'], answer: 0, why: 'Each entry covers the previous hash.' },
    { q: 'Why weight readiness by the blueprint?', options: ['So light domains cannot hide weak heavy ones', 'It always scores higher', 'The pass mark is published', 'It is required by the exam'], answer: 0, why: 'There is no published pass mark.' },
    { q: 'A console never declared elicitation. What does restart_service return?', options: ['-32021 naming elicitation', 'input_required anyway', '-32602', 'isError'], answer: 0, why: 'Capabilities are checked per request.' },
  ],
  terms: [
    ['Capstone', 'One scenario that exercises every domain.'],
    ['Blueprint weights', '16, 14, 26, 24 and 20 percent.'],
    ['Weighted readiness', 'Domain competence weighted by the blueprint.'],
    ['Transcript', 'The sequence of messages that shows each behaviour.'],
    ['Counterexample', 'A deliberately broken message used to test a check.'],
    ['Readiness checklist', 'Objectives turned into things you can point at.'],
  ],
  deeper: '<p><b>Exam eve.</b> Work through each objective once and point at where it appears: in this transcript or in the lesson that first taught it.</p><p><b>About this machine.</b> The utility and incident are invented.</p>',
  code: {
    title: 'The incident in order',
    note: 'Written for this lesson.',
    text: `
r = client.discover(version="2025-11-25")             # -32022, data.supported
client.version = r["error"]["data"]["supported"][0]   # 2026-07-28, new id next time
client.call("restart_srvc", {})                        # -32602: unknown tool
client.call("restart_service", {"service": "grid-7"})  # isError: environment required
ro.call("restart_service", args)                       # -32021: elicitation not declared
r = oncall.call("restart_service", args)               # input_required + requestState
oncall.retry(r, answers={"confirm": {"action": "accept", "content": {"ok": True}}})
t = oncall.call("run_full_diagnostics", {}, extensions={"io.modelcontextprotocol/tasks": {}})
oncall.poll(t["taskId"])                               # tasks/get until completed
assert audit_log.verify()                              # the chain holds
`,
  },
};
