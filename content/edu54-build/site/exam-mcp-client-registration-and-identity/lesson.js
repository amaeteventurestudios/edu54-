// Exam prep, MCP client registration and identity: an invented field-reporting app in Mwanza must register with four authorization servers. The
// priority order: pre-registered credentials, then a Client ID Metadata Document (an HTTPS URL as client_id) when the server advertises
// client_id_metadata_document_supported, then deprecated Dynamic Client Registration (with application_type), then ask the user. Credentials
// are keyed by issuer and never reused elsewhere; the authorization server checks the CIMD's client_id equals its URL and guards the fetch
// against SSRF; a proxy with a static client id must get consent per downstream client. Illustrative.
const AS = [
  { n: 'auth.ngo.example (pre-registered)', pre: true, cimd: true, dcr: true },
  { n: 'id.cloud.example (CIMD)', pre: false, cimd: true, dcr: true },
  { n: 'sso.old.example (DCR only)', pre: false, cimd: false, dcr: true },
  { n: 'login.locked.example (neither)', pre: false, cimd: false, dcr: false },
];

function pick(a, o) {
  if (!o.order) return a.dcr ? 'dcr' : 'ask';
  if (a.pre) return 'pre';
  if (a.cimd) return 'cimd';
  if (a.dcr) return 'dcr';
  return 'ask';
}

function run(o) {
  const a = AS[o.as];
  const path = pick(a, o);
  const best = pick(a, { order: true });
  const issues = [];
  if (!o.order) issues.push('the client went straight to Dynamic Client Registration, which is deprecated, instead of following pre-registered, then CIMD');
  if (!o.issuer) issues.push('credentials from one authorization server were reused against another; key them by issuer and re-register when the issuer changes');
  if (!o.match) issues.push('the authorization server accepted a metadata document whose client_id did not equal the URL it fetched');
  if (!o.ssrf) issues.push('the authorization server fetched a client_id URL pointing at an internal address; guard the fetch against SSRF');
  if (!o.deputy) issues.push('a proxy forwarded many downstream clients under one static client id without per-client consent: a confused deputy');
  return { a, path, best, issues, ok: issues.length === 0 };
}
const LABEL = { pre: 'pre-registered credentials', cimd: 'Client ID Metadata Document', dcr: 'Dynamic Client Registration (deprecated)', ask: 'ask the user for a client id' };

export default {
  slug: 'exam-mcp-client-registration-and-identity',
  title: 'Exam prep, MCP: client registration and identity',
  description: 'A field app must register with four authorization servers. Follow the priority stairs for each, and keep the safeguards lit at every step.',
  overview: 'Before a client can run the OAuth flow, the authorization server must know it. The specification gives one priority order. First, use pre-registered client information if the client already has it for this authorization server, which suits known enterprise pairs. Second, use a Client ID Metadata Document (CIMD) when the authorization server advertises client_id_metadata_document_supported: the client_id is an HTTPS URL with a path, such as https://app.example/oauth/client-metadata.json, pointing at JSON the client hosts, with at least client_id (exactly equal to the URL), client_name and redirect_uris. The authorization server fetches and validates it, validates the redirect URIs, shows extra warnings for localhost-only redirects and always shows the redirect hostname; because it fetches a client-supplied URL, it must guard against server-side request forgery with URL and address checks, size limits and timeouts. CIMD ids are portable across authorization servers. Third, fall back to Dynamic Client Registration, which 2026-07-28 deprecates, when a registration_endpoint exists; the client must send application_type, native for desktop, CLI and localhost apps or web for remote browser apps. Fourth, ask the user. Whichever path is used, persisted credentials are keyed by the issuer that issued them, never reused with another authorization server, and re-registered when the authorization server changes. The confused deputy problem: an MCP proxy that uses one static client id towards a third-party authorization server must get user consent for each dynamically registered downstream client before forwarding. For clients with no person present, two authorization extensions, negotiated per request like any extension, cover OAuth Client Credentials (preferably a signed JWT assertion) for CI and daemons and Enterprise-Managed Authorization for central identity policy. The app is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'client registration', 'cimd', 'dynamic client registration', 'confused deputy', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { as: 1, order: true, issuer: true, match: true, ssrf: true, deputy: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* four registration paths as stairs, highest priority at the top */
    const KEYS = ['pre', 'cimd', 'dcr', 'ask'];
    const ladder = KEYS.map((k, i) => { const h = 0.46 - i * 0.13, m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.56, h, 0.56, '#fff', { r: 0.03, material: m }); b.position.set(-1.5 + i * 0.62, 0, -0.5); S.add(b); return { m, k, h, x: -1.5 + i * 0.62 }; });
    const app = P.robot('#3D6BD6', { scale: 0.55 }); app.userData.noFit = true; S.add(app);
    /* the four authorization servers to choose from */
    const servers = AS.map((a, i) => { const m = new THREE.MeshLambertMaterial({ color: '#7B6FA8' }), b = P.box(0.34, 0.1, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.5 + i * 0.62, 0, 0.1); S.add(b); return m; });
    /* four safeguards as lamps */
    const safe = ['issuer', 'match', 'ssrf', 'deputy'].map((k, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-1.0 + i * 0.5, 0, 0.55); S.add(l); return { k, l }; });
    S.add(P.keep(-1.95, 1.2, 0.95, -0.85, 0.75));

    let R = null;
    function draw() {
      R = run(st);
      ladder.forEach(l => l.m.color.set(l.k === R.path ? (R.path === R.best ? GOOD : BAD) : l.k === R.best ? SAF : OFF));
      const at = ladder.find(l => l.k === R.path); app.position.set(at.x, at.h, -0.5);
      servers.forEach((m, i) => m.color.set(i === st.as ? SAF : '#7B6FA8'));
      safe.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Authorization server', options: ['pre-registered', 'CIMD', 'DCR only', 'neither'], get: () => st.as, act: i => set({ as: i }) },
      { type: 'toggle', label: 'Follow the priority order', short: 'Order', get: () => st.order, set: v => set({ order: !!v }) },
      { type: 'toggle', label: 'Key credentials by issuer', short: 'By issuer', get: () => st.issuer, set: v => set({ issuer: !!v }) },
      { type: 'toggle', label: 'CIMD client_id must equal its URL', short: 'Id match', get: () => st.match, set: v => set({ match: !!v }) },
      { type: 'toggle', label: 'Guard the CIMD fetch against SSRF', short: 'SSRF guard', get: () => st.ssrf, set: v => set({ ssrf: !!v }) },
      { type: 'toggle', label: 'Proxy asks consent per client', short: 'Deputy', get: () => st.deputy, set: v => set({ deputy: !!v }) },
    ];
    const readouts = [
      { label: 'Registration path', get: () => ({ v: R.path === 'dcr' ? 'DCR' : R.path === 'cimd' ? 'CIMD' : R.path === 'pre' ? 'pre-registered' : 'ask user', sub: R.a.n.split(' (')[0], good: R.path === R.best, bad: R.path !== R.best }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'registration and identity', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Priority stairs', d: 'Step down only if the last fails', icon: 'target', atV: V(-1.78, 0.3, -0.5) },
      { name: 't', t: 'Safeguards', d: 'One lamp for each', icon: 'user', atV: V(0.6, 0.15, 0.55) },
    ];
    const reset = () => set({ ...D0, as: st.as });
    const breaks = [
      { label: 'Jump straight to DCR', hint: 'it is deprecated', on: () => set({ ...D0, as: 1, order: false }), off: reset },
      { label: 'Reuse credentials across issuers', hint: 'credentials belong to one issuer', on: () => set({ ...D0, issuer: false }), off: reset },
      { label: 'Skip the client_id check', hint: 'the document must name its own URL', on: () => set({ ...D0, match: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>For ${R.a.n.split(' (')[0]}, the client uses ${LABEL[R.path]}${R.path === 'dcr' ? ' with application_type native' : ''}.</b> Credentials are stored per issuer, the authorization server checks the CIMD client_id against its URL and guards the fetch, and a proxy asks consent for each downstream client.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { app.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Known partners', home: true, say: 'With an authorization server the app already knows, it uses its pre-registered credentials.', act: m => m.set({ as: 0, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
    { t: 'A metadata document', home: true, say: 'With a new server that supports it, the app\'s client id is a URL to its own metadata.', act: m => m.set({ as: 1, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
    { t: 'Deprecated fallback', home: true, say: 'If only dynamic registration exists, the app uses it and says it is a native app.', act: m => m.set({ as: 2, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
    { t: 'Ask the user', home: true, say: 'With neither, the app asks the user for a client id.', act: m => m.set({ as: 3, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
    { t: 'One issuer each', home: true, say: 'Credentials belong to the issuer that granted them, and are never reused elsewhere.', act: m => m.set({ as: 1, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
    { t: 'The confused deputy', home: true, say: 'A proxy with one shared client id asks consent for every downstream client.', act: m => m.set({ as: 1, order: true, issuer: true, match: true, ssrf: true, deputy: true }) },
  ],
  check: [
    { q: 'An authorization server supports CIMD and the client has no pre-registration. Which path?', options: ['Client ID Metadata Document', 'Dynamic Client Registration', 'Ask the user first'], answer: 0, why: 'DCR is deprecated; it comes after CIMD.', hint: 'Try Jump straight to DCR.' },
    { q: 'How should stored client credentials be keyed?', options: ['By the issuer that issued them', 'By the MCP server', 'By the user name'], answer: 0, why: 'Never reuse them with another authorization server.', hint: 'Try Reuse credentials across issuers.' },
    { q: 'What must a CIMD document\'s client_id equal?', options: ['The URL it was fetched from', 'The client_name', 'Any string'], answer: 0, why: 'Exactly, character for character.', hint: 'Try Skip the client_id check.' },
  ],
  practice: [
    { q: 'What must a DCR client send in 2026-07-28?', options: ['application_type: native or web', 'A session id', 'Its serverInfo', 'Nothing extra'], answer: 0, why: 'native for desktop, CLI and localhost apps.' },
    { q: 'Why must an authorization server guard CIMD fetches?', options: ['It fetches a client-supplied URL: SSRF risk', 'For speed', 'To cache them', 'It need not'], answer: 0, why: 'Validate the URL and address, cap size, time out.' },
    { q: 'What is the confused deputy problem here?', options: ['A proxy with one static client id forwarding codes for the wrong downstream client', 'A slow proxy', 'Two servers with one name', 'A missing icon'], answer: 0, why: 'Consent per dynamically registered client.' },
    { q: 'Which extension fits a CI job with nobody to approve?', options: ['OAuth Client Credentials', 'Elicitation', 'MCP Apps', 'Tasks'], answer: 0, why: 'A signed JWT assertion is recommended.' },
    { q: 'What does an authorization server always show the user for a CIMD client?', options: ['The redirect hostname', 'The client secret', 'The access token', 'Nothing'], answer: 0, why: 'And warnings for localhost-only redirects.' },
    { q: 'Are CIMD client ids portable across authorization servers?', options: ['Yes', 'No', 'Only with DCR', 'Only on stdio'], answer: 0, why: 'The URL identifies the client everywhere.' },
  ],
  terms: [
    ['Pre-registration', 'A client id agreed in advance with one authorization server.'],
    ['CIMD', 'Client ID Metadata Document: an HTTPS URL as the client id.'],
    ['DCR', 'Dynamic Client Registration; deprecated in 2026-07-28.'],
    ['application_type', 'native or web, required on DCR.'],
    ['Issuer binding', 'Credentials keyed by the issuer that issued them.'],
    ['Confused deputy', 'A proxy misusing one shared client identity.'],
  ],
  deeper: '<p><b>Enterprise-Managed Authorization.</b> An authorization extension for central identity provider policy, negotiated per request like any extension.</p><p><b>About this machine.</b> The app and servers are invented.</p>',
  code: {
    title: 'Choose a registration path',
    note: 'Written for this lesson.',
    text: `
def registration(as_meta, store, issuer):
    if issuer in store:                                    # keyed by issuer
        return store[issuer]
    if as_meta.get("client_id_metadata_document_supported"):
        return {"client_id": "https://reports.app.example/oauth/client-metadata.json"}
    if "registration_endpoint" in as_meta:                 # deprecated fallback
        creds = register(as_meta["registration_endpoint"],
                         {"client_name": "Field Reports", "application_type": "native",
                          "redirect_uris": ["http://127.0.0.1:8765/cb"]})
        store[issuer] = creds
        return creds
    return ask_user_for_client_id(issuer)
`,
  },
};
