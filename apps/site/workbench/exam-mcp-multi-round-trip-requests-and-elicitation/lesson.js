// Exam prep, MCP multi round-trip requests and elicitation: an invented deployment server in Addis Ababa asks for confirmation before
// deploy_release runs. It ends the first tools/call with resultType input_required (inputRequests with a form-mode elicitation, and a
// requestState); the client asks the user and retries with a new id, inputResponses and the requestState echoed byte for byte. requestState is
// attacker-controlled, so it is HMAC-protected and bound to the principal, a short expiry and a digest of the request. Scenarios test a
// confirm, a decline, a client without elicitation, a tampered state and a payment that needs URL mode. Illustrative.
const CASES = [
  { n: 'alice confirms', key: 'confirm' },
  { n: 'alice declines', key: 'decline' },
  { n: 'guest declared no elicitation', key: 'nocap' },
  { n: 'mallory edits requestState', key: 'tamper' },
  { n: 'card payment step', key: 'pay' },
];

function run(o) {
  const c = CASES[o.cs];
  let steps, ok = true, why = '';
  const retry = `retry: new id ${o.newId ? '8' : '7 (reused!)'} · inputResponses · requestState ${o.echo ? 'echoed exactly' : 're-encoded'}`;
  if (c.key === 'nocap') steps = ['tools/call deploy_release (clientCapabilities {})', o.capCheck ? 'error -32021: requiredCapabilities {elicitation}' : 'input_required with elicitation anyway', '—', '—'];
  else if (c.key === 'tamper') steps = ['tools/call deploy_release', 'input_required · requestState "eyJ…sig"', 'mallory changes target to prod-all', o.hmac ? 'HMAC check fails: rejected' : 'unsigned state accepted: prod-all deployed'];
  else if (c.key === 'pay') steps = ['tools/call deploy_release (paid tier)', o.url ? 'input_required · elicitation mode "url" (payment page)' : 'input_required · form asks for the card number', o.url ? 'user pays on the provider\'s page' : 'card number passes through the client', 'retry → complete'];
  else steps = ['tools/call deploy_release id 7', 'input_required · elicitation form {confirm: boolean} · requestState', `user ${c.key === 'confirm' ? 'accepts' : 'declines'}`, `${retry} → complete${c.key === 'decline' ? ', not deployed (decline is a normal outcome)' : ', deployed'}`];
  const issues = [];
  if (!o.newId) issues.push('the retry reused id 7; an MRTR retry is a new, independent request with a new id');
  if (!o.echo) issues.push('the client re-encoded requestState; it must echo it byte for byte, or omit it if none was given');
  if (!o.hmac) issues.push('the requestState was unsigned, so mallory changed the deploy target and the server trusted it');
  if (!o.capCheck) issues.push('the server sent an elicitation to a client that never declared the capability; it must return -32021 instead');
  if (!o.url) issues.push('the card number was collected in a form through the client; sensitive steps use URL mode');
  return { c, steps, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-multi-round-trip-requests-and-elicitation',
  title: 'Exam prep, MCP: multi round-trip requests and elicitation',
  description: 'A deploy tool asks for confirmation without holding a connection open: it ends the request, and the client calls again with a signed state and a new id.',
  overview: 'Multi Round-Trip Requests (SEP-2322) replace every server-initiated request. A server that needs more information ends the call early with resultType "input_required" and an InputRequiredResult; the client gathers the answers and sends a completely new request. The result must include at least one of inputRequests and requestState. inputRequests maps server-chosen keys to request objects, each exactly one of elicitation/create, sampling/createMessage or roots/list, and the server must never include a type the client did not declare a capability for on that request; if it needs one, it returns -32021 instead. requestState is an opaque string only the minting server understands: the client must not inspect or change it and must echo it byte for byte, or omit it if none was sent. The retry uses a new JSON-RPC id and adds params.inputResponses with the same keys; the server then completes or asks again. Only tools/call, prompts/get and resources/read may return input_required, and input_required results and retries are never cached. Because requestState passes through the client, it is attacker-controlled: if it influences authorization, resource access or business logic, protect it with an HMAC or AEAD and bind it to the authenticated principal, a short expiry and a digest of the originating request, and enforce single use on the server. Elicitation has two modes. Form mode collects structured data through a requestedSchema of flat primitive properties (strings, numbers, booleans, enums); URL mode sends the user to an out-of-band page the client does not render, for OAuth consent or payment, where sensitive data should not pass through the client. An ElicitResult\'s action is accept (with content for forms), decline or cancel, and a decline is a normal outcome, not an error. The server is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'mrtr', 'input_required', 'requestState', 'elicitation', 'url mode', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 0, newId: true, echo: true, hmac: true, capCheck: true, url: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* client and server at either end of two belts: out on one request, back with a question, out again as a new request */
    const client = P.robot('#3D6BD6', { scale: 0.62 }); client.position.set(-2.4, 0, -0.3); S.add(client);
    const server = P.box(0.56, 0.5, 0.84, '#5B8DB8', { r: 0.05 }); server.position.set(0.95, 0, -0.3); S.add(server);
    const out = P.belt(V(-2.05, 0, -0.55), V(0.62, 0, -0.55), { w: 0.3, speed: 0.85 }); S.add(out);
    const back = P.belt(V(0.62, 0, -0.05), V(-2.05, 0, -0.05), { w: 0.3, speed: 0.85 }); S.add(back);
    /* the signed state the client must echo */
    const tokenM = new THREE.MeshLambertMaterial({ color: GOOD }), token = P.box(0.3, 0.1, 0.26, '#fff', { r: 0.03, material: tokenM }); token.position.set(-0.7, 0, -0.95); S.add(token);
    /* a payment step goes to a page of its own, never through the client */
    const page = P.box(0.42, 0.3, 0.1, '#7B6FA8', { r: 0.02 }); page.position.set(1.6, 0, -0.3); S.add(page);
    const urlPipe = P.pipe([V(1.23, 0.2, -0.3), V(1.4, 0.2, -0.3), V(1.56, 0.2, -0.3)], SAF, { r: 0.03, n: 2 }); S.add(urlPipe);
    /* four steps as lamps, five cases as pads */
    const lamps = [0, 1, 2, 3].map(i => { const l = P.lamp(OFF, { h: 0.12, r: 0.085 }); l.position.set(-2.05 + i * 0.42, 0, 0.45); S.add(l); return l; });
    const pads = CASES.map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.32, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-0.2 + i * 0.38, 0, 0.45); S.add(b); return m; });
    S.add(P.keep(-2.65, 1.9, 0.75, -1.15, 0.65));
    const parts = [client, out, back, urlPipe];
    let clock = 0, turn = false;

    let R = null;
    function draw() {
      R = run(st);
      R.steps.forEach((s, i) => {
        const bad = /reused|re-encoded|anyway|accepted: prod|card number/.test(s);
        lamps[i].userData.set({ color: s === '—' ? OFF : bad ? BAD : GOOD, on: true });
      });
      tokenM.color.set(st.hmac && st.echo ? GOOD : BAD);
      page.visible = urlPipe.visible = R.c.key === 'pay';
      pads.forEach((m, i) => m.color.set(i === st.cs ? SAF : OFF));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Retry with a new id', short: 'New id', get: () => st.newId, set: v => set({ newId: !!v }) },
      { type: 'toggle', label: 'Echo requestState byte for byte', short: 'Echo state', get: () => st.echo, set: v => set({ echo: !!v }) },
      { type: 'toggle', label: 'Sign and bind requestState', short: 'HMAC state', get: () => st.hmac, set: v => set({ hmac: !!v }) },
      { type: 'toggle', label: 'Check the client capability first', short: 'Capability', get: () => st.capCheck, set: v => set({ capCheck: !!v }) },
      { type: 'toggle', label: 'URL mode for sensitive steps', short: 'URL mode', get: () => st.url, set: v => set({ url: !!v }) },
      { type: 'buttons', label: 'Scenario', options: CASES.map(c => c.n.split(' ').slice(0, 2).join(' ')), get: () => st.cs, act: i => set({ cs: i }) },
    ];
    const readouts = [
      { label: 'Round trips', get: () => ({ v: R.c.key === 'nocap' ? '1' : '2', sub: 'independent requests' }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the flow', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'f', t: 'Two requests', d: 'Nothing is held open between them', icon: 'link', atV: V(-2.6, 0.25, -0.3) },
      { name: 't', t: 'Four steps', d: 'Red: where the flow broke', icon: 'check', atV: V(-0.85, 0.15, 0.45) },
    ];
    const reset = () => set({ ...D0, cs: st.cs });
    const breaks = [
      { label: 'Reuse the original id', hint: 'the retry is a new request', on: () => set({ ...D0, cs: 0, newId: false }), off: reset },
      { label: 'Leave requestState unsigned', hint: 'it passes through the client', on: () => set({ ...D0, cs: 3, hmac: false }), off: reset },
      { label: 'Collect a card number in a form', hint: 'URL mode keeps it off the client', on: () => set({ ...D0, cs: 4, url: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${R.c.n}: ${R.steps.filter(s => s !== '—').join('; ')}.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt;
      if (clock > 0.9) { clock = 0; turn = !turn; (turn ? out : back).userData.send(turn ? GOOD : SAF, { size: 0.16 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No server push', home: true, say: 'The server cannot ask a question mid-call. It ends the call with input required.', act: m => m.set({ cs: 0, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
    { t: 'A new request', home: true, say: 'The client asks the user, then sends a new request with a new id, the answers and the state.', act: m => m.set({ cs: 0, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
    { t: 'Decline is normal', home: true, say: 'If the user declines, the call still completes. Nothing is deployed, and nothing failed.', act: m => m.set({ cs: 1, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
    { t: 'Capabilities first', home: true, say: 'A client that never declared elicitation gets minus three two oh two one, not a form.', act: m => m.set({ cs: 2, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
    { t: 'Signed state', home: true, say: 'The state passes through the client, so it is signed and bound to the user, a deadline and the request.', act: m => m.set({ cs: 3, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
    { t: 'URL mode', home: true, say: 'A payment goes to the provider\'s own page, so the card number never passes through the client.', act: m => m.set({ cs: 4, newId: true, echo: true, hmac: true, capCheck: true, url: true }) },
  ],
  check: [
    { q: 'Which id does the MRTR retry use?', options: ['A new one', 'The original id', 'null'], answer: 0, why: 'It is an independent request.', hint: 'Try Reuse the original id.' },
    { q: 'requestState influences what gets deployed. How should the server treat it?', options: ['Sign it and bind it to the principal, an expiry and the request', 'Trust it: the server minted it', 'Ask the model to check it'], answer: 0, why: 'It is attacker-controlled input.', hint: 'Try Leave requestState unsigned.' },
    { q: 'Which elicitation mode fits a card payment?', options: ['URL mode', 'Form mode', 'Neither'], answer: 0, why: 'Sensitive data should not pass through the client.', hint: 'Try Collect a card number in a form.' },
  ],
  practice: [
    { q: 'Which methods may return input_required?', options: ['tools/call, prompts/get and resources/read', 'Every method', 'tools/list only', 'server/discover'], answer: 0, why: 'Three methods only.' },
    { q: 'What must an InputRequiredResult include?', options: ['At least one of inputRequests or requestState', 'Both, always', 'A session id', 'An error code'], answer: 0, why: 'Either or both.' },
    { q: 'The server sent no requestState. What does the client send on retry?', options: ['No requestState at all', 'An empty string', 'The last state it saw', 'A new one it makes up'], answer: 0, why: 'Omit it when none was given.' },
    { q: 'What may a form-mode requestedSchema contain?', options: ['A flat object of primitive properties and enums', 'Nested objects', 'Arrays of objects', 'Any JSON Schema'], answer: 0, why: 'Flat and primitive.' },
    { q: 'Are input_required results cached?', options: ['Never', 'Yes, for ttlMs', 'Only when public', 'Only on HTTP'], answer: 0, why: 'Neither the result nor the retry.' },
    { q: 'Which action values can an ElicitResult carry?', options: ['accept, decline, cancel', 'yes, no', 'ok, error', 'approve, deny, defer'], answer: 0, why: 'accept carries content in form mode.' },
  ],
  terms: [
    ['MRTR', 'Multi Round-Trip Requests: input_required, then a new request.'],
    ['InputRequiredResult', 'A result with inputRequests and/or requestState.'],
    ['inputRequests', 'Keyed elicitation, sampling or roots requests for the client.'],
    ['requestState', 'Opaque server state the client echoes exactly.'],
    ['inputResponses', 'The client\'s answers, keyed like inputRequests.'],
    ['URL mode', 'Elicitation through an out-of-band page the client does not render.'],
  ],
  deeper: '<p><b>Rejecting a bad state.</b> The specification says the server must reject a requestState that fails verification but does not name the channel; a tool execution error or a fresh input_required result are both defensible.</p><p><b>About this machine.</b> The server and users are invented.</p>',
  code: {
    title: 'Mint and verify requestState',
    note: 'Written for this lesson.',
    text: `
import hmac, hashlib, json, base64, time

def mint(principal, request):
    body = {"p": principal, "exp": time.time() + 300,
            "d": hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest(),
            "n": secrets.token_hex(8)}                               # nonce for single use
    raw = json.dumps(body).encode()
    sig = hmac.new(KEY, raw, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(raw + sig).decode()

def verify(state, principal, request):
    blob = base64.urlsafe_b64decode(state); raw, sig = blob[:-32], blob[-32:]
    if not hmac.compare_digest(sig, hmac.new(KEY, raw, hashlib.sha256).digest()):
        return False
    b = json.loads(raw)
    return (b["p"] == principal and b["exp"] > time.time() and USED.add_once(b["n"])
            and b["d"] == hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest())
`,
  },
};
