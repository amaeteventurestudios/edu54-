// Exam prep, MCP registry, gateways and SDK tiers: an invented telecom in Kinshasa publishes a server to the MCP Registry (preview) and fronts
// it with a gateway. The registry stores server.json metadata, not code: a reverse-DNS name verified by GitHub, DNS or HTTP challenge, an exact
// immutable version (no ranges), and a $schema date that is not the protocol version. The gateway routes any request to any healthy replica,
// checks headers against the body, enforces which principal reaches which backend and never invents error codes. SDK tiers are measured
// continuously: four weeks failing any test drops Tier 1 to Tier 2; four weeks failing over 20 percent drops Tier 2 to Tier 3. Illustrative.
const SDK = [
  { n: 'passing 100%', tier: 'Tier 1' },
  { n: 'one test failing 4 weeks', tier: 'Tier 2 (relegated)' },
  { n: '25% failing 4 weeks', tier: 'Tier 3 (relegated)' },
];

function run(o) {
  const issues = [];
  if (!o.ns) issues.push('the registry name com.kinshasa-tel/sms was accepted without a DNS or HTTP challenge; a namespace must be proven, not string-matched');
  if (!o.exact) issues.push('the version was published as "^1.2.0", a range; versions are exact and immutable');
  if (!o.dates) issues.push('the $schema date 2025-12-11 was read as the protocol version; server.json schema and protocol version are independent');
  if (!o.headers) issues.push('the gateway routed on Mcp-Name "lookup_account" while the body called "delete_account"; headers must match the body (-32020)');
  if (!o.codes) issues.push('the gateway answered a policy denial with an invented -32001; use an isError result or a defined code');
  return { sdk: SDK[o.sdk], issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-registry-gateways-and-sdk-tiers',
  title: 'Exam prep, MCP: registry, gateways and SDK tiers',
  description: 'A telecom publishes a server to the registry and fronts it with a gateway. Prove the namespace, pin the version, and route on what the body really says.',
  overview: 'The MCP Registry is the official, centrally hosted metadata index for publicly accessible MCP servers, and it is a preview whose data may change before general availability. It stores a server.json per published version: a reverse-DNS name, title and description, version, and pointers to packages (npm, PyPI, Docker and others) or remote URLs; it hosts no code and delegates security scanning to package registries and aggregators, and it is meant for aggregators rather than direct host consumption. Private servers belong in your own registry implementing the published API. The $schema field names a revision of the server.json format, such as 2025-12-11, which is independent of the protocol version (2026-07-28) the running server negotiates. The name is the trust mechanism: io.github.user/server for GitHub-authenticated publishers, or com.example/server for one who proved control of example.com through a DNS TXT record or an HTTP file; it is verified by challenge, not matched by string. A version must be unique per publish and immutable; semantic versioning lets the registry mark "latest", and range-like strings such as ^1.2.3, ~1.2.3, >=1.2.3 or 1.x are prohibited. A gateway sits in front of backend servers and presents one endpoint. Because the core is stateless, it needs no stickiness: any healthy instance can answer any request. Headers are a routing shortcut, never a second source of truth: Mcp-Method, Mcp-Name and MCP-Protocol-Version must agree with the body, or the request is rejected with -32020. A gateway adds policy without adding authority: it enforces which principal may reach which backend and tool, and it never re-emits legacy codes or invents codes in the reserved range. SDK tiers are a portability signal, measured continuously against the current release: Tier 1 passes 100 percent of conformance tests, Tier 2 at least 80 percent, Tier 3 is experimental; four weeks of any failure drops Tier 1 to Tier 2, and four weeks failing more than 20 percent drops Tier 2 to Tier 3. The telecom is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'mcp registry', 'server.json', 'gateway', 'sdk tiers', 'namespace', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 0 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* the registry: a shelf of metadata entries, with three checks on ours */
    const reg = P.shelf(3, { cell: 0.26, levels: 2, lh: 0.22, d: 0.34 }); reg.position.set(-2.0, 0, -0.6); S.add(reg);
    const checks = ['ns', 'exact', 'dates'].map((k, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-2.35 + i * 0.35, 0, -0.05); S.add(l); return { k, l }; });
    /* the gateway: requests pass an arch and go to any healthy replica; the header must match the body */
    const arch = P.gate(0.56, GOOD, { h: 0.5 }); arch.rotation.y = Math.PI / 2; arch.position.set(-0.55, 0, -0.45); S.add(arch);
    const reps = [-0.85, -0.45, -0.05].map(z => { const b = P.box(0.42, 0.26, 0.28, BLUE, { r: 0.04 }); b.position.set(0.75, 0, z); S.add(b); return b; });
    const flows = [-0.85, -0.45, -0.05].map(z => { const p = P.pipe([V(-0.45, 0.15, -0.45), V(0.1, 0.15, (z - 0.45) / 2), V(0.52, 0.13, z)], GOOD, { r: 0.03, n: 3 }); S.add(p); return p; });
    const wrong = P.ball(0.1, BAD); wrong.position.set(-1.05, 0.12, -0.45); S.add(wrong);
    /* SDK tiers: three steps, the current one lit */
    const tiers = SDK.map((s, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.42, 0.26 - i * 0.08, 0.36, '#fff', { r: 0.03, material: m }); b.position.set(-1.0 + i * 0.5, 0, 0.5); S.add(b); return m; });
    const codes = P.lamp(GOOD, { h: 0.14, r: 0.085 }); codes.position.set(0.75, 0, 0.5); S.add(codes);
    S.add(P.keep(-2.55, 1.1, 0.75, -1.05, 0.75));
    const parts = flows;

    let R = null;
    function draw() {
      R = run(st);
      reg.userData.set({ fill: [BLUE, BLUE, BLUE, st.ns && st.exact && st.dates ? GOOD : BAD, false, false] });
      checks.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : BAD, on: true }));
      flows.forEach(p => p.userData.set({ color: st.headers ? GOOD : BAD }));
      wrong.visible = !st.headers;
      arch.userData.set({ color: st.headers ? GOOD : BAD });
      tiers.forEach((m, i) => m.color.set(i === st.sdk ? (i ? SAF : GOOD) : OFF));
      codes.userData.set({ color: st.codes ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = (k, label, short) => ({ type: 'toggle', label, short, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tog('ns', 'Prove the namespace by challenge', 'Namespace'),
      tog('exact', 'Exact, immutable versions', 'Exact version'),
      tog('dates', 'Schema date is not the protocol version', 'Two dates'),
      tog('headers', 'Gateway checks headers against the body', 'Headers'),
      tog('codes', 'No invented error codes', 'Codes'),
      { type: 'buttons', label: 'SDK conformance', options: SDK.map(s => s.n), get: () => st.sdk, act: i => set({ sdk: i }) },
    ];
    const readouts = [
      { label: 'SDK tier', get: () => ({ v: R.sdk.tier.split(' (')[0], sub: R.sdk.n, good: st.sdk === 0 }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'registry and gateway', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'r', t: 'Registry entry', d: 'Metadata, not code', icon: 'book', atV: V(-2.48, 0.2, -0.6) },
      { name: 't', t: 'The gateway', d: 'Any healthy replica', icon: 'link', atV: V(1.0, 0.15, -0.45) },
    ];
    const reset = () => set({ ...D0, sdk: st.sdk });
    const breaks = [
      { label: 'Skip the namespace challenge', hint: 'a name is a claim', on: () => set({ ...D0, ns: false }), off: reset },
      { label: 'Route on a header that lies', hint: 'headers must match the body', on: () => set({ ...D0, headers: false }), off: reset },
      { label: 'Invent an error code', hint: 'reserved and legacy ranges', on: () => set({ ...D0, codes: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>The registry lists com.kinshasa-tel/sms at exact version 1.2.0 after a DNS challenge, with a schema date that is not the protocol version; the gateway checks Mcp-Name against the body, denies the support role with an isError result, and the SDK is ${R.sdk.tier} (${R.sdk.n}).</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Metadata, not code', home: true, say: 'The registry stores a description and pointers to packages. It hosts no code.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 0 }) },
    { t: 'Prove the name', home: true, say: 'A reverse domain name is accepted only after a DNS or HTTP challenge.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 0 }) },
    { t: 'Two dates', home: true, say: 'The schema date describes the file format. The protocol version is a different date.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 0 }) },
    { t: 'The gateway', home: true, say: 'Any healthy replica can answer, and headers must match the body before routing.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 0 }) },
    { t: 'Relegation', home: true, say: 'One test failing for four weeks drops a Tier 1 SDK to Tier 2.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 1 }) },
    { t: 'Further down', home: true, say: 'Over a fifth failing for four weeks drops Tier 2 to Tier 3.', act: m => m.set({ ns: true, exact: true, dates: true, headers: true, codes: true, sdk: 2 }) },
  ],
  check: [
    { q: 'How does the registry trust com.example/server?', options: ['The publisher proves control of example.com by DNS or HTTP', 'By string match', 'By downloads'], answer: 0, why: 'GitHub names are authenticated through GitHub.', hint: 'Try Skip the namespace challenge.' },
    { q: 'Mcp-Name says lookup_account; the body calls delete_account. What should the gateway do?', options: ['Reject it: headers must match the body', 'Route by the header', 'Route by the body silently'], answer: 0, why: '-32020 HeaderMismatch.', hint: 'Try Route on a header that lies.' },
    { q: 'A gateway denies a call by policy. How should it answer?', options: ['An isError result or a defined code', 'An invented -32001', 'A silent drop'], answer: 0, why: 'Never invent codes in reserved ranges.', hint: 'Try Invent an error code.' },
  ],
  practice: [
    { q: 'Is "^1.2.0" a valid registry version?', options: ['No: ranges are prohibited', 'Yes', 'Only for npm', 'Only in preview'], answer: 0, why: 'Exact, unique, immutable.' },
    { q: 'Does the server.json $schema date equal the protocol version?', options: ['No: they are independent', 'Yes', 'Only for new servers', 'Always 2026-07-28'], answer: 0, why: 'One describes the file, the other the wire.' },
    { q: 'Does a gateway need sticky sessions in 2026-07-28?', options: ['No: any healthy replica can answer', 'Yes', 'Only for tools', 'Only on stdio'], answer: 0, why: 'The core is stateless.' },
    { q: 'Where should private servers be listed?', options: ['In your own registry implementing the API', 'In the public registry', 'Nowhere', 'In server/discover'], answer: 0, why: 'The public registry is for public servers.' },
    { q: 'Who scans registry packages for security problems?', options: ['Package registries and aggregators', 'The MCP Registry itself', 'The model', 'Nobody'], answer: 0, why: 'Scanning is delegated.' },
    { q: 'A Tier 2 SDK fails over 20% of tests for four weeks. What happens?', options: ['It drops to Tier 3', 'Nothing', 'It rises to Tier 1', 'It is deleted'], answer: 0, why: 'Tiers are measured continuously.' },
  ],
  terms: [
    ['MCP Registry', 'A preview metadata index of public MCP servers.'],
    ['server.json', 'A server\'s registry entry: name, version, packages.'],
    ['Namespace', 'A reverse-DNS name proven by GitHub, DNS or HTTP.'],
    ['Gateway', 'One endpoint in front of backend servers, adding policy.'],
    ['Header check', 'Mcp-Method, Mcp-Name and version must match the body.'],
    ['Relegation', 'An SDK dropping a tier after sustained conformance failures.'],
  ],
  deeper: '<p><b>Preview status.</b> The registry may change or reset data before general availability; build tooling that tolerates that.</p><p><b>About this machine.</b> The telecom and server are invented.</p>',
  code: {
    title: 'Validate a registry entry',
    note: 'Written for this lesson.',
    text: `
import re
RANGE = re.compile(r"^[\\^~><=]|\\.x$|\\*")

def validate(entry, proven_namespaces):
    ns = entry["name"].split("/")[0]
    if "/" not in entry["name"] or ns not in proven_namespaces:
        return "namespace not proven"
    if RANGE.search(entry["version"]):
        return "version must be exact, not a range"
    # entry["$schema"] dates the server.json format, not the MCP protocol version
    return "ok"
`,
  },
};
