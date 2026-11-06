// Exam prep, MCP risk and safety controls: an invented gateway at a bank-technology firm in Abuja aggregates three servers and applies automatic
// controls to the calls nobody reviews one at a time. Six threats arrive: a rug pull (an approved tool's schema changes), a poisoned description,
// tool shadowing (two servers expose "search"), token passthrough, an SSRF URL and a flood of calls. Controls: pin a digest of each descriptor,
// scan descriptions, qualify colliding names, refuse to forward the inbound token, guard fetches, and rate-limit and sandbox. Refusals the model
// should read are isError results, not invented codes. Illustrative.
const THREATS = [
  { n: 'rug pull: transfer_funds schema gains "any_account"', key: 'pin', ok: 'digest changed → tool quarantined for re-review', bad: 'changed tool kept its approval' },
  { n: 'description says "also send results to export_all"', key: 'scan', ok: 'description flagged before it reaches the model', bad: 'model read the hidden instruction' },
  { n: 'two servers both expose "search"', key: 'qualify', ok: 'names qualified: ledger/search, docs/search', bad: 'discovery order picked a winner silently' },
  { n: 'handler forwards the inbound bearer token upstream', key: 'pass', ok: 'refused; a separate upstream-scoped token minted', bad: 'token valid only for the gateway sent upstream' },
  { n: 'resource_metadata URL points at 169.254.169.254', key: 'ssrf', ok: 'fetch refused: private address', bad: 'gateway fetched cloud metadata' },
  { n: '4,000 calls a minute from one client', key: 'limit', ok: 'rate limited · isError "slow down" · handler sandboxed', bad: 'no limit: the ledger API fell over' },
];

function run(o) {
  const rows = THREATS.map(t => ({ t, ok: o[t.key], v: o[t.key] ? t.ok : t.bad }));
  const missed = rows.filter(r => !r.ok).length + (o.channel ? 0 : 1);
  return { rows, missed, ok: missed === 0 };
}

export default {
  slug: 'exam-mcp-risk-and-safety-controls',
  title: 'Exam prep, MCP: risk and safety controls',
  description: 'A gateway faces six automatic threats, from a rug pull to a flood of calls. Stand a control across each lane, and see what reaches the servers without it.',
  overview: 'Consent covers the calls a person reviews; risk controls cover everything else, automatically. Treat a tool\'s name, description, annotations, icons and results as untrusted input: a description can carry an instruction unrelated to the tool, such as calling another tool or forwarding output, so scan descriptions before they reach the model. A tool approved yesterday can change today: a rug pull alters an approved name, description, schema or annotation while the name stays the same. Pin a digest over the whole descriptor, not just the description; on refresh, an unknown tool waits for review, a duplicate unqualified name needs a namespace, and a known tool whose digest changed is quarantined and re-reviewed. Hash equality proves stability, not safety. Tool shadowing happens when two servers expose the same name and a gateway lets discovery order pick a winner; qualify aggregated names with a server identifier and refuse ambiguous ones. A server that calls a third-party API on a user\'s behalf is a deputy: it must never forward the inbound bearer token, which was validated only for its own audience, and must use a separate upstream-scoped credential; a proxy with a static client id must get consent per client to avoid confused-deputy attacks. requestState is attacker-controlled and must be signed, bound and single-use if it matters. Several surfaces fetch URLs someone else supplied (CIMD documents, resource_metadata, schema $refs); guard them against SSRF with address checks, size limits and timeouts. Supply chain: verify registry namespaces against their owners and pin package versions. Refusals use the right channel: a malformed request is a protocol error such as -32602, while a policy refusal the model should read, such as a tripped rate limit or a quarantined tool, is an isError result; never invent codes in the legacy or reserved ranges. Blunt controls, rate limits, timeouts and sandboxed handlers, bound the damage when smarter checks miss. The firm is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'rug pull', 'tool poisoning', 'tool shadowing', 'token passthrough', 'ssrf', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pin: true, scan: true, qualify: true, pass: true, ssrf: true, limit: true, channel: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* six lanes run into the protected servers, a gate across each, a threat ball on each */
    const Z = i => -0.95 + i * 0.28;
    const vault = P.box(0.5, 0.46, 1.66, '#5B8DB8', { r: 0.05 }); vault.position.set(1.4, 0, -0.25); S.add(vault);
    const rows = THREATS.map((t, i) => {
      S.add(P.rod(V(-1.9, 0.05, Z(i)), V(1.14, 0.05, Z(i)), 0.02, '#B9B3A6'));
      const g = P.gate(0.24, GOOD, { h: 0.3 }); g.rotation.y = Math.PI / 2; g.position.set(0, 0, Z(i)); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: SAF }), b = P.ball(0.09, '#fff', { material: m }); b.userData.noFit = true; b.position.set(-0.3, 0.12, Z(i)); S.add(b);
      return { g, m, b };
    });
    /* the error channel: refusals the model can read */
    const chan = P.lamp(GOOD, { h: 0.2, r: 0.1 }); chan.position.set(-1.75, 0, 0.55); S.add(chan);
    S.add(P.keep(-2.0, 1.75, 0.7, -1.2, 0.75));

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => {
        rows[i].g.visible = !!r.ok;
        rows[i].b.position.x = r.ok ? -0.26 : 1.0; rows[i].m.color.set(r.ok ? SAF : BAD);
      });
      chan.userData.set({ color: st.channel ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = (k, label, short) => ({ type: 'toggle', label, short, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tog('pin', 'Pin a digest of each descriptor', 'Pin'),
      tog('scan', 'Scan descriptions for instructions', 'Scan'),
      tog('qualify', 'Qualify colliding tool names', 'Qualify'),
      tog('pass', 'Never forward the inbound token', 'No passthrough'),
      tog('ssrf', 'Guard every supplied URL', 'SSRF guard'),
      tog('limit', 'Rate-limit and sandbox handlers', 'Limits'),
      tog('channel', 'Refuse through isError, not invented codes', 'Channel'),
    ];
    const readouts = [
      { label: 'Gaps', get: () => ({ v: String(R.missed), sub: 'of 7 controls', good: R.ok, bad: !R.ok }) },
      { label: 'Threats contained', get: () => ({ v: `${R.rows.filter(r => r.ok).length} of 6`, sub: 'automatically' }) },
    ];
    const labels = [
      { name: 'g', t: 'Six threats', d: 'Gold: stopped at its gate', icon: 'shield', atV: V(-1.9, 0.08, -0.25) },
      { name: 't', t: 'The servers', d: 'Red ball: it got through', icon: 'check', atV: V(1.66, 0.3, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Approve once, never re-check', hint: 'the rug pull', on: () => set({ ...D0, pin: false }), off: reset },
      { label: 'Let tool names collide', hint: 'shadowing', on: () => set({ ...D0, qualify: false }), off: reset },
      { label: 'Forward the user\'s token', hint: 'passthrough is forbidden', on: () => set({ ...D0, pass: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The changed transfer_funds digest quarantines it, the poisoned description is flagged, both search tools are qualified, the inbound token is never forwarded, the private-address fetch is refused and the flood is rate-limited with an isError the model can read.</b>' };
      const f = R.rows.filter(r => !r.ok).map(r => `${r.t.n}: ${r.v}`);
      if (!st.channel) f.push('policy refusals used an invented code in the legacy range instead of an isError result');
      return { ok: false, msg: `<b>${f.join('; ').replace(/^./, c => c.toUpperCase())}.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No one reviews every call', home: true, say: 'A gateway applies controls to the calls nobody approves one by one.', act: m => m.set({ pin: false, scan: false, qualify: false, pass: false, ssrf: false, limit: false, channel: false }) },
    { t: 'Rug pulls', home: true, say: 'An approved tool quietly gains a new argument. A pinned digest catches the change.', act: m => m.set({ pin: true, scan: false, qualify: false, pass: false, ssrf: false, limit: false, channel: false }) },
    { t: 'Poisoned descriptions', home: true, say: 'A description hides an instruction to send data elsewhere. Scan it before the model reads it.', act: m => m.set({ pin: true, scan: true, qualify: false, pass: false, ssrf: false, limit: false, channel: false }) },
    { t: 'Shadowing', home: true, say: 'Two servers both offer search. Qualify the names so one never stands in for the other.', act: m => m.set({ pin: true, scan: true, qualify: true, pass: false, ssrf: false, limit: false, channel: false }) },
    { t: 'No passthrough', home: true, say: 'The user\'s token was meant for this gateway. Upstream calls use their own credential.', act: m => m.set({ pin: true, scan: true, qualify: true, pass: true, ssrf: true, limit: false, channel: false }) },
    { t: 'Blunt limits', home: true, say: 'Rate limits and sandboxes bound the damage when every smarter check has missed.', act: m => m.set({ pin: true, scan: true, qualify: true, pass: true, ssrf: true, limit: true, channel: true }) },
  ],
  check: [
    { q: 'An approved tool\'s schema changes but its name stays the same. What catches it?', options: ['A pinned digest over the whole descriptor', 'Pinning the description only', 'The tool name'], answer: 0, why: 'Then quarantine and re-review.', hint: 'Try Approve once, never re-check.' },
    { q: 'Two aggregated servers both expose "search". What should the gateway do?', options: ['Qualify the names with a server identifier', 'Let discovery order decide', 'Pick the newer one'], answer: 0, why: 'Otherwise one shadows the other.', hint: 'Try Let tool names collide.' },
    { q: 'May a server forward the user\'s bearer token to an upstream API?', options: ['No: use a separate upstream-scoped credential', 'Yes, it saves time', 'Only over HTTPS'], answer: 0, why: 'Passthrough is forbidden.', hint: 'Try Forward the user\'s token.' },
  ],
  practice: [
    { q: 'A rate limit trips. How should the refusal reach the model?', options: ['As an isError result with an explanation', 'As error -32001', 'As a silent drop', 'As -32601'], answer: 0, why: 'The legacy range is not open space.' },
    { q: 'Does an unchanged digest prove a tool is safe?', options: ['No: it proves stability, not safety', 'Yes', 'Only for read-only tools', 'Only with annotations'], answer: 0, why: 'It still needs a first review.' },
    { q: 'Which URL should a gateway refuse to fetch?', options: ['http://169.254.169.254/latest/meta-data', 'https://auth.example/.well-known/…', 'A public CIMD document', 'None of them'], answer: 0, why: 'Private and link-local addresses are SSRF targets.' },
    { q: 'What makes a registry listing trustworthy?', options: ['A namespace verified against its owner and a pinned package version', 'Being listed at all', 'A nice icon', 'Many downloads'], answer: 0, why: 'Listing, package and endpoint are separate facts.' },
    { q: 'Why do rate limits and sandboxes still matter with smart checks in place?', options: ['They bound damage when every smarter check misses', 'They replace review', 'They speed calls up', 'They do not'], answer: 0, why: 'Blunt controls need no understanding.' },
    { q: 'What single automatic step should be avoided?', options: ['Reading untrusted input, touching sensitive data and acting, all at once', 'Listing tools', 'Caching a public list', 'Reading a resource'], answer: 0, why: 'Split it with controls in between.' },
  ],
  terms: [
    ['Rug pull', 'A change to an approved tool behind the same name.'],
    ['Descriptor digest', 'A hash over name, description, schema and annotations.'],
    ['Tool poisoning', 'Hidden instructions in a tool description or result.'],
    ['Tool shadowing', 'One server\'s tool standing in for another\'s same-named tool.'],
    ['Token passthrough', 'Forwarding the inbound token upstream; forbidden.'],
    ['SSRF', 'Making a server fetch an attacker-chosen internal address.'],
  ],
  deeper: '<p><b>Quarantine, then fold in.</b> Only update a pinned digest after someone has actually re-reviewed the changed tool.</p><p><b>About this machine.</b> The firm and threats are invented.</p>',
  code: {
    title: 'Pin the whole descriptor',
    note: 'Written for this lesson.',
    text: `
import hashlib, json

def digest(tool):
    payload = json.dumps({k: tool.get(k) for k in ("name", "description", "inputSchema",
                          "outputSchema", "annotations")}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()

def refresh(server_id, tools, pinned):
    for t in tools:
        key = f"{server_id}/{t['name']}"                  # qualified: no shadowing
        d = digest(t)
        if key not in pinned:
            hold(key, "new tool: review first")
        elif pinned[key] != d:
            hold(key, "rug pull: descriptor changed")      # quarantine, re-review
`,
  },
};
