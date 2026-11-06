// Exam prep, MCP OAuth authorization: an invented payroll MCP server in Johannesburg (https://mcp.payroll.example/mcp) is an OAuth 2.1 resource
// server; the client is an OAuth 2.1 client; a separate authorization server issues tokens. The flow: 401 with WWW-Authenticate
// resource_metadata, Protected Resource Metadata, authorization server metadata with an exact issuer match, PKCE S256 (refuse if
// code_challenge_methods_supported is absent), the resource parameter and state, the iss check against mix-up, the token in the Authorization
// header, and audience validation with no token passthrough upstream. Illustrative.
const STEPS = [
  { n: 'tools/call without a token', r: '401 · WWW-Authenticate: Bearer resource_metadata=".../oauth-protected-resource/mcp"' },
  { n: 'fetch Protected Resource Metadata (RFC 9728)', r: 'authorization_servers: ["https://auth.payroll.example"]' },
  { n: 'fetch authorization server metadata (RFC 8414)', r: 'issuer equals the URL\'s issuer · code_challenge_methods_supported [S256]', key: 'issuer' },
  { n: 'authorize: PKCE S256, resource, state', r: 'resource=https://mcp.payroll.example/mcp · code_challenge=… · state=…', key: 'pkce' },
  { n: 'redirect back with code and iss', r: 'iss compared exactly with the recorded issuer (RFC 9207)', key: 'iss' },
  { n: 'token request: code_verifier, same resource', r: 'access token with audience https://mcp.payroll.example/mcp', key: 'resource' },
  { n: 'tools/call with Authorization: Bearer …', r: 'audience checked · upstream payroll API called with a separate token', key: 'aud' },
];

function run(o) {
  const rows = STEPS.map(s => {
    if (s.key === 'issuer' && !o.issuer) return { s, r: 'metadata from attacker.example accepted: issuer mismatch ignored', ok: false };
    if (s.key === 'pkce' && !o.pkce) return { s, r: 'no code_challenge_methods_supported, proceeded without PKCE', ok: false };
    if (s.key === 'iss' && !o.iss) return { s, r: 'iss not checked: a code meant for another issuer accepted (mix-up)', ok: false };
    if (s.key === 'resource' && !o.resource) return { s, r: 'no resource parameter: a token valid for every API the issuer serves', ok: false };
    if (s.key === 'aud' && !o.aud) return { s, r: 'token issued for another MCP server accepted, and passed upstream as-is', ok: false };
    return { s, r: s.r, ok: true };
  });
  const bad = rows.filter(r => !r.ok).length;
  return { rows, bad, ok: bad === 0 };
}

export default {
  slug: 'exam-mcp-oauth-authorization',
  title: 'Exam prep, MCP: OAuth authorization',
  description: 'A payroll server protects its tools with OAuth 2.1. Walk the token from a 401 to a working call, and check issuer, PKCE and audience on the way.',
  overview: 'Authorization is optional overall, but HTTP implementations should follow it, and stdio implementations should read credentials from the environment instead. Three roles carry the flow: the MCP server is an OAuth 2.1 resource server, the MCP client is an OAuth 2.1 client, and a separate authorization server authenticates the user and issues tokens. None of them is the model: authorization happens at the transport layer. The flow begins with rejection: a tools/call without a token gets plain HTTP 401, ideally with WWW-Authenticate: Bearer resource_metadata="…". Every MCP server must publish Protected Resource Metadata (RFC 9728) with at least one entry in authorization_servers; without the header, the client tries the path-specific well-known URI first, then the root. The client then fetches authorization server metadata (RFC 8414 or OpenID Connect Discovery), trying the documented path orders, and the document\'s issuer must equal, character for character, the issuer used to build the URL. PKCE is mandatory, with S256 when capable; because PKCE support cannot be asked for directly, if code_challenge_methods_supported is absent the client must refuse to proceed. The resource parameter (RFC 8707), the server\'s canonical URI, goes on both the authorization and token requests even if the server ignores it, and a fresh state guards the response. On return, the client compares iss exactly with the issuer it recorded before redirecting (RFC 9207), rejecting mismatches even on errors, which defends against mix-up attacks. The token travels in Authorization: Bearer on every request, never in the query string. The resource server must validate that the token\'s audience is itself and must not accept or pass through other tokens; upstream calls use a separate token. Scope is taken from the first WWW-Authenticate challenge or scopes_supported; insufficient scope is 403 with insufficient_scope. Never assume a refresh token. The payroll service is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'oauth 2.1', 'pkce', 'protected resource metadata', 'audience', 'resource indicators', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { issuer: true, pkce: true, iss: true, resource: true, aud: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* three roles: the client, the MCP server and the authorization server, none of them the model */
    const POS = [[-2.1, -0.2], [0.35, 0.1], [0.35, -1.0]];
    const client = P.robot('#3D6BD6', { scale: 0.66 }); client.position.set(POS[0][0], 0, POS[0][1]); S.add(client);
    const mcp = P.box(0.6, 0.42, 0.44, '#5B8DB8', { r: 0.05 }); mcp.position.set(POS[1][0], 0, POS[1][1]); S.add(mcp);
    const auth = P.box(0.6, 0.6, 0.44, '#7B6FA8', { r: 0.05 }); auth.position.set(POS[2][0], 0, POS[2][1]); S.add(auth);
    [[0, 1], [0, 2]].forEach(([a, b]) => S.add(P.rod(V(POS[a][0], 0.1, POS[a][1]), V(POS[b][0], 0.1, POS[b][1]), 0.016, '#B9B3A6')));
    /* the upstream payroll API, reached with its own separate token */
    const upstreamM = new THREE.MeshLambertMaterial({ color: GOOD }), upstream = P.box(0.42, 0.3, 0.36, '#fff', { r: 0.04, material: upstreamM }); upstream.position.set(1.2, 0, 0.1); S.add(upstream);
    S.add(P.rod(V(0.65, 0.12, 0.1), V(0.99, 0.12, 0.1), 0.016, '#B9B3A6'));
    /* the token on its walk through the seven steps */
    const WHERE = [1, 1, 2, 2, 0, 2, 1];
    const tokenM = new THREE.MeshLambertMaterial({ color: SAF }), token = P.ball(0.1, '#fff', { material: tokenM }); token.userData.noFit = true; S.add(token);
    /* seven steps as lamps */
    const rows = STEPS.map((s, i) => { const l = P.lamp(GOOD, { h: 0.1, r: 0.08 }); l.position.set(-1.65 + i * 0.3, 0, 0.62); S.add(l); return l; });
    S.add(P.keep(-2.35, 1.5, 0.8, -1.3, 0.85));
    let walk = 0;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => rows[i].userData.set({ color: r.ok ? GOOD : BAD, on: true }));
      upstreamM.color.set(st.aud ? GOOD : BAD);
    }
    token.position.set(POS[0][0], 0.3, POS[0][1]);
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Metadata issuer must match exactly', short: 'Issuer', get: () => st.issuer, set: v => set({ issuer: !!v }) },
      { type: 'toggle', label: 'Refuse without PKCE support', short: 'PKCE', get: () => st.pkce, set: v => set({ pkce: !!v }) },
      { type: 'toggle', label: 'Check iss on the redirect', short: 'iss check', get: () => st.iss, set: v => set({ iss: !!v }) },
      { type: 'toggle', label: 'Send the resource parameter', short: 'resource', get: () => st.resource, set: v => set({ resource: !!v }) },
      { type: 'toggle', label: 'Validate audience, no passthrough', short: 'Audience', get: () => st.aud, set: v => set({ aud: !!v }) },
    ];
    const readouts = [
      { label: 'Holes', get: () => ({ v: String(R.bad), sub: 'in the flow', good: R.ok, bad: !R.ok }) },
      { label: 'Token in', get: () => ({ v: 'Authorization header', sub: 'never the query string' }) },
    ];
    const labels = [
      { name: 'r', t: 'Three roles', d: 'None of them the model', icon: 'user', atV: V(-2.32, 0.25, -0.2) },
      { name: 't', t: 'Seven steps', d: 'Red: a check was skipped', icon: 'check', atV: V(0.25, 0.15, 0.62) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip the issuer check', hint: 'metadata from anywhere', on: () => set({ ...D0, issuer: false }), off: reset },
      { label: 'Proceed without PKCE', hint: 'support must be advertised', on: () => set({ ...D0, pkce: false }), off: reset },
      { label: 'Accept another server\'s token', hint: 'audience is mandatory', on: () => set({ ...D0, aud: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>A 401 points to the protected resource metadata, the authorization server\'s issuer matches its URL, PKCE S256 and the resource parameter go on both requests, iss matches the recorded issuer, and the payroll server accepts only a Bearer token whose audience is itself, calling upstream with its own token.</b>' };
      const f = R.rows.map((r, i) => r.ok ? null : `${i + 1} (${r.s.n}): ${r.r}`).filter(Boolean);
      return { ok: false, msg: `<b>Step ${f.join('; step ')}.</b>` };
    }
    return { update: dt => {
      client.userData.tick(dt);
      walk = (walk + dt * 0.5) % 7;
      const i = Math.floor(walk), f = walk - i, a = POS[i ? WHERE[i - 1] : 0], b = POS[WHERE[i]];
      token.position.set(a[0] + (b[0] - a[0]) * f, 0.3, a[1] + (b[1] - a[1]) * f);
      tokenM.color.set(R.rows[i].ok ? SAF : BAD);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A 401', home: true, say: 'A call without a token gets a plain 401, pointing to where the server\'s metadata lives.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
    { t: 'Find the issuer', home: true, say: 'The metadata names the authorization server, and its issuer must match its URL exactly.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
    { t: 'PKCE', home: true, say: 'PKCE with S256 is mandatory. If support is not advertised, the client refuses.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
    { t: 'The resource', home: true, say: 'The resource parameter names this server, so the token is scoped to it alone.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
    { t: 'Check the issuer again', home: true, say: 'On the way back, the issuer is compared exactly, which defeats mix-up attacks.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
    { t: 'Audience', home: true, say: 'The server accepts only tokens meant for itself, and never passes them upstream.', act: m => m.set({ issuer: true, pkce: true, iss: true, resource: true, aud: true }) },
  ],
  check: [
    { q: 'The authorization server metadata\'s issuer differs from the URL\'s issuer. What should the client do?', options: ['Reject the metadata', 'Use it anyway', 'Ask the user'], answer: 0, why: 'It must match character for character.', hint: 'Try Skip the issuer check.' },
    { q: 'The metadata has no code_challenge_methods_supported. What should the client do?', options: ['Refuse to proceed', 'Proceed without PKCE', 'Use plain PKCE'], answer: 0, why: 'There is no other way to know PKCE is honoured.', hint: 'Try Proceed without PKCE.' },
    { q: 'A valid token issued for a different MCP server arrives. What should the server do?', options: ['Reject it: wrong audience', 'Accept it', 'Forward it upstream'], answer: 0, why: 'Audience validation is mandatory; passthrough is forbidden.', hint: 'Try Accept another server\'s token.' },
  ],
  practice: [
    { q: 'Which role is the MCP server in OAuth 2.1?', options: ['Resource server', 'Authorization server', 'Client', 'User agent'], answer: 0, why: 'It accepts or rejects bearer tokens.' },
    { q: 'Where must the access token travel?', options: ['Authorization: Bearer header', 'The URL query string', 'The JSON-RPC params', 'clientInfo'], answer: 0, why: 'Query strings leak into logs.' },
    { q: 'Without a resource_metadata header, which URI does the client try first?', options: ['The path-specific well-known URI', 'The root well-known URI', 'The MCP endpoint itself', 'The issuer'], answer: 0, why: 'Then the root.' },
    { q: 'What does the RFC 9207 iss check defend against?', options: ['Mix-up attacks between authorization servers', 'Slow servers', 'Missing scopes', 'Expired tokens'], answer: 0, why: 'Compare exactly, even on errors.' },
    { q: 'A call needs more scope. What does the server return?', options: ['403 with insufficient_scope and the required scopes', '401', '404', '-32602'], answer: 0, why: 'The client steps up with the union of scopes.' },
    { q: 'How should a stdio server get credentials?', options: ['From the environment', 'Through the OAuth browser flow', 'From the model', 'From serverInfo'], answer: 0, why: 'stdio should not use the OAuth flow.' },
  ],
  terms: [
    ['Resource server', 'The MCP server: it validates bearer tokens.'],
    ['Protected Resource Metadata', 'RFC 9728 document naming the authorization servers.'],
    ['PKCE', 'Proof Key for Code Exchange; S256 required when capable.'],
    ['resource parameter', 'RFC 8707: the server\'s canonical URI, on both requests.'],
    ['iss check', 'RFC 9207: compare the returned issuer exactly.'],
    ['Audience', 'Who the token was issued for; must be this server.'],
  ],
  deeper: '<p><b>Upstream calls.</b> When the server calls other APIs for the user, it acts as their client with its own token; forwarding the user\'s token is forbidden.</p><p><b>About this machine.</b> The payroll service and URLs are invented.</p>',
  code: {
    title: 'PKCE and the audience check',
    note: 'Written for this lesson.',
    text: `
import base64, hashlib, secrets

verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()

def start(meta, resource):
    if "S256" not in meta.get("code_challenge_methods_supported", []):
        raise RuntimeError("refuse: PKCE support not advertised")
    return authorize_url(meta, code_challenge=challenge, code_challenge_method="S256",
                         resource=resource, state=new_state())

def accept(token, canonical_uri="https://mcp.payroll.example/mcp"):
    claims = verify_signature(token)
    if canonical_uri not in claims["aud"]:
        return 401                         # issued for someone else
    return None                            # upstream calls use a separate token
`,
  },
};
