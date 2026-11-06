// OAuth 2.1 for a remote MCP server: a co-operative bank's loan tools in Arusha (https://loans.bank.example/mcp), used by a loan officer's assistant.
// Roles: the MCP client, the MCP server (the resource), and the bank's authorisation server (https://login.bank.example), which issues tokens.
// Flow: fetch protected-resource metadata (keeping the /mcp path), pick a trusted issuer, authorisation code with PKCE (S256) and the resource parameter, check the
// response's iss exactly, exchange the code with the verifier, store the token under (issuer, resource). The MCP server accepts only tokens whose issuer and audience
// are its own. A later tool needs more scope: 403 insufficient_scope, the officer consents, a new token. For the credit bureau, the server gets its own token.
// Attacks in the same morning: a calendar app's token (same issuer, audience calendar) is replayed at the loans server; a look-alike authorisation server answers
// a login with its own code (a mix-up); and the server is tempted to pass the officer's token on to the credit bureau.
function run(st) {
  const L = [], harm = [];
  const add = (t, bad) => L.push({ t, bad });
  add('GET https://loans.bank.example/.well-known/oauth-protected-resource/mcp → authorization_servers: ["https://login.bank.example"]');
  add(`login with ${st.pkce ? 'PKCE: code_challenge = S256(verifier)' : 'no PKCE'} and resource=https://loans.bank.example/mcp, scope loans.read`);
  if (!st.pkce) { add('a banking app on the phone intercepts the redirect and swaps in the code for its own token', true); harm.push('code intercepted'); }
  add('a look-alike server answers a parallel login: code=abc, iss=https://login.bank-example.net');
  if (st.iss) add('iss doesn\'t equal https://login.bank.example exactly: response ignored, nothing sent anywhere');
  else { add('iss not checked: the client sends the code and its client credentials to the look-alike\'s token endpoint', true); harm.push('credentials sent to an impostor'); }
  add('the real response: iss matches · code exchanged with the verifier · token aud=https://loans.bank.example/mcp, stored under (issuer, resource)');
  add('tools/call loans.list_applications · Authorization: Bearer … → issuer ✓ audience ✓ → 12 applications');
  add('a stolen calendar-app token (same issuer, aud=calendar) is replayed at the loans server');
  if (st.aud) add('audience is calendar, not this server: 401');
  else { add('issuer matches and the signature is valid, so it\'s accepted: loan files read with a calendar token', true); harm.push('wrong-audience token accepted'); }
  add('tools/call loans.approve → 403 insufficient_scope (needs loans.approve) · the officer consents · new token with both scopes · retried with a new id');
  if (st.pass) { add('server forwards the officer\'s own token to the credit bureau', true); harm.push('token passed through'); }
  else add('server gets its own token for the credit bureau (audience bureau) and calls it');
  return { L, harm };
}

export default {
  slug: 'mcp-security-oauth-2-1',
  title: 'OAuth for MCP: right issuer, right audience',
  description: 'A bank\'s loan tools in Arusha accept only tokens made for them. Follow one morning of logins, a look-alike, a replayed token and a pass-through.',
  overview: 'A remote MCP server that reads loan files or approves loans needs to know more than who logged in: which authorisation server issued the token, which server the token is for, which app completed the login, and which operations the person approved. MCP uses OAuth 2.1 over HTTP (a local stdio server relies on the operating system instead). The client starts from the server\'s address, fetches its protected-resource metadata to learn which authorisation servers it trusts, and checks that issuer against its own policy rather than guessing from the hostname. It logs in with the authorisation code flow and PKCE (a one-time secret hashed with S256), naming the MCP server in the resource parameter so the token is minted for it. When the response comes back, the client checks its iss value equals the issuer it used, exactly, which defeats mix-up attacks where a look-alike server slips in its own response. Tokens are stored per issuer and server and sent in the Authorization header on every request, never in a URL. The MCP server accepts only tokens from its issuer for its own audience, asks for more scope with a 403 when a tool needs it, and never forwards the user\'s token to another service: for a downstream API it gets a token of its own.',
  keywords: ['MCP authorization', 'OAuth 2.1', 'PKCE', 'token audience', 'mix-up attack', 'token passthrough', 'Model Context Protocol security'],
  orient: 'landscape',
  view: { target: [0, 0.45, 0], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pkce: true, iss: true, aud: true, pass: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the parties: back row the officer's assistant, the loans MCP server, the credit bureau; front row the bank's login, a look-alike login, a calendar app */
    const PX = [-2.0, -0.45, 1.1], BZ = -0.55, FZ = 0.55;
    const asst = P.robot('#5B8DB8', { scale: 1.0 }); asst.position.set(PX[0], 0, BZ); S.add(asst);
    const blk = (x, z, c, h = 0.5) => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.7, h, 0.5, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0, z); S.add(b); return mm; };
    blk(PX[1], BZ, CHAR, 0.55); const bureauM = blk(PX[2], BZ, '#7B6FA8', 0.45);
    blk(PX[0], FZ, '#1F9E89', 0.7); const impM = blk(PX[1], FZ, '#B9B4A8', 0.7); const calM = blk(PX[2], FZ, '#C9A227', 0.4);
    const lamp = (x, z) => { const l = P.lamp(GOOD, { h: 0.55, r: 0.08 }); l.position.set(x + 0.45, 0, z); S.add(l); return l; };
    const audLamp = lamp(PX[1], BZ), issLamp = lamp(PX[1], FZ), passLamp = lamp(PX[2], BZ);
    /* the token: a gold key; the seal on top is PKCE */
    const tok = P.box(0.2, 0.08, 0.12, SAF, { r: 0.02 }); tok.userData.noFit = true; S.add(tok);
    const sealM = new THREE.MeshLambertMaterial({ color: GOOD }), seal = P.box(0.1, 0.05, 0.08, '#fff', { r: 0.02, material: sealM }); seal.userData.noFit = true; S.add(seal);
    const harmTw = P.tower(0.5, 0.5, RED, { size: 0.28 }); harmTw.position.set(2.05, 0, 0); S.add(harmTw);
    S.add(P.keep(-2.45, 2.35, 1.2, -0.9, 0.9));
    const path = [[PX[0], BZ], [PX[0], FZ], [PX[0], BZ], [PX[1], BZ], [PX[2], BZ]];

    let R = null, k = 0, clock = 0;
    function draw() {
      R = run(st); k = 0; clock = 0;
      impM.color.set(st.iss ? '#B9B4A8' : BAD); bureauM.color.set(st.pass ? BAD : '#7B6FA8'); calM.color.set(st.aud ? '#C9A227' : BAD);
      audLamp.userData.set({ color: st.aud ? GOOD : RED, on: true }); issLamp.userData.set({ color: st.iss ? GOOD : RED, on: true }); passLamp.userData.set({ color: st.pass ? RED : GOOD, on: true });
      seal.visible = !!st.pkce;
      harmTw.userData.set({ h: 0.05 + R.harm.length / 4 * 1.0, cap: `${R.harm.length}`, color: R.harm.length ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      asst.userData.tick(dt); asst.userData.set({ busy: true }); harmTw.userData.tick(dt); clock += dt;
      const u = (clock % 5) / 5 * (path.length - 1), i = Math.floor(u), f = u - i, A = path[i], B = path[Math.min(path.length - 1, i + 1)];
      const x = A[0] + (B[0] - A[0]) * f, z = A[1] + (B[1] - A[1]) * f;
      tok.position.set(x, 0.95, z); seal.position.set(x, 1.03, z);
    };
    const controls = [
      { type: 'toggle', label: 'PKCE (S256)', short: 'PKCE', get: () => st.pkce, set: v => set({ pkce: !!v }) },
      { type: 'toggle', label: 'Client checks iss exactly', short: 'Check iss', get: () => st.iss, set: v => set({ iss: !!v }) },
      { type: 'toggle', label: 'Server checks the token\'s audience', short: 'Check audience', get: () => st.aud, set: v => set({ aud: !!v }) },
      { type: 'toggle', label: 'Server passes the officer\'s token downstream', short: 'Pass token on', get: () => st.pass, set: v => set({ pass: !!v }), quick: false },
      { type: 'button', label: 'Run the morning again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.harm.length}`, sub: R.harm.join(', ') || 'none', bad: R.harm.length > 0, good: !R.harm.length }) },
      { label: 'Token for', get: () => ({ v: 'loans/mcp', sub: 'audience, from login.bank.example' }) },
      { label: 'Scopes', get: () => ({ v: '2', sub: 'read, then approve on demand' }) },
    ];
    const labels = [
      { name: 'who', t: 'Who issues, who accepts', d: 'Robot: the officer\'s assistant. Teal: the bank\'s login. Dark: the loans server (lamp: audience check). Grey: a look-alike login (lamp: iss check). Gold key: the token, green seal PKCE', icon: 'link', atV: V(PX[0] - 0.4, 0.4, 0) },
      { name: 'harm', t: 'Harms', d: 'The purple block is the credit bureau; its lamp turns red if the officer\'s token is passed on', icon: 'stop', atV: V(2.3, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Any token from the right issuer', hint: 'no audience check', on: () => set({ ...D0, aud: false }), off: reset },
      { label: 'Skip the iss check', hint: 'a mix-up attack', on: () => set({ ...D0, iss: false }), off: reset },
      { label: 'Pass the token on', hint: 'to the credit bureau', on: () => set({ ...D0, pass: true }), off: reset },
    ];
    function status() {
      if (!st.aud) return { ok: false, msg: '<b>A calendar app\'s token opened the loan files.</b> It came from the right issuer with a valid signature, so without an audience check the loans server accepted it. Accept only tokens issued for this exact server (the audience), and answer 401 to everything else.' };
      if (!st.iss) return { ok: false, msg: '<b>Mix-up: a look-alike login server answered, and the client sent the code and its credentials to it.</b> When a login response comes back, check that its iss equals the issuer you started with, character for character, before using anything in it. Store credentials and tokens per issuer, and never send one issuer\'s secrets to another.' };
      if (st.pass) return { ok: false, msg: '<b>The loans server forwarded the officer\'s token to the credit bureau.</b> Now the bureau holds a token that can act on the loans server, and if the bureau checks audiences it should refuse it anyway. Never pass a user\'s token on: get a token for the bureau with its own audience, or use an explicit token exchange.' };
      if (!st.pkce) return { ok: false, msg: '<b>Without PKCE, another app on the phone intercepted the login redirect and exchanged the code itself.</b> PKCE ties the code to a secret only the real client knows: the token request must present the verifier whose S256 hash was in the login request.' };
      return { ok: true, msg: '<b>One login, one token for the right server, and every impostor turned away.</b> The client found the issuer from the server\'s metadata, used PKCE and named the resource, ignored a response whose iss didn\'t match, and stored the token per issuer and server. The server rejected a calendar token, asked for more scope when approving, and used its own token for the bureau.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three roles', home: true, say: 'A co-operative bank\'s loan tools in Arusha sit behind an MCP server. The officer\'s assistant is the client; the bank\'s login server issues tokens; the loans server accepts them.', act: m => m.set({ pkce: true, iss: true, aud: true, pass: false }) },
    { t: 'Find the right login', home: true, say: 'The client asks the loans server which login it trusts, then logs in with PKCE, naming the loans server so the token is made for it.', act: m => m.set({ pkce: true }) },
    { t: 'Check who answered', home: true, say: 'A look-alike login server slips in a response. The client checks the issuer on every response, exactly, and ignores it. Skip that check, and secrets go to the impostor.', act: m => m.set({ iss: false }) },
    { t: 'Check who it\'s for', home: true, say: 'A calendar app\'s token, from the same login server, is replayed at the loans server. It only accepts tokens made for itself. Without that check, a calendar token reads loan files.', act: m => m.set({ iss: true, aud: false }) },
    { t: 'Ask for more when needed', home: true, say: 'Approving a loan needs a bigger scope. The server answers 403, the officer agrees, and a new token covers both.', act: m => m.set({ aud: true }) },
    { t: 'Never pass it on', home: true, say: 'For the credit bureau, the server gets a token of its own. Forward the officer\'s token instead, and the bureau now holds a key to the loan files.', act: m => m.set({ pass: true }) },
  ],
  check: [
    { q: 'What does checking a token\'s audience stop?', options: ['A token made for another service being used here', 'Expired tokens', 'Slow logins'], answer: 0, why: 'Same issuer isn\'t enough; the token must be for this server.', hint: 'Try Any token from the right issuer.' },
    { q: 'Why check iss on the login response?', options: ['To stop a look-alike server\'s response being mistaken for the real one', 'To speed up login', 'It is optional'], answer: 0, why: 'This defeats mix-up attacks.', hint: 'Try Skip the iss check.' },
    { q: 'An MCP server needs to call another API for the user. Which token should it use?', options: ['A token of its own for that API', 'The user\'s token, passed through', 'No token'], answer: 0, why: 'Passing tokens through breaks audience checks and spreads access.', hint: 'Try Pass the token on.' },
  ],
  terms: [
    ['Authorisation server', 'The service that logs people in and issues tokens.'],
    ['Resource server', 'The service that accepts tokens; here, the MCP server.'],
    ['PKCE', 'Proof key for code exchange: a one-time secret that ties the login code to the app that asked.'],
    ['Audience', 'Which server a token is for.'],
    ['iss', 'The issuer named in a login response, checked against the one you used.'],
    ['Token passthrough', 'Forwarding a user\'s token to another service; forbidden.'],
    ['Scope', 'Which operations a token allows.'],
  ],
  deeper: '<p><b>Registering the client.</b> Prefer a pre-registered client, then a Client ID Metadata Document: an HTTPS address that is both the client\'s ID and where its details live. Dynamic registration is a deprecated fallback; when used, native apps say application_type native. Fetching a metadata document is a request to an address someone else chose, so guard it against reaching private networks.</p><p><b>Refresh tokens.</b> Optional; when issued, store them per issuer and server, rotate them if supported, and watch for reuse.</p><p><b>Still stateless.</b> The token says who; the request\'s _meta says which protocol. Neither replaces the other, and errors (401, 403) still come back as JSON-RPC errors with the request\'s id.</p><p><b>About this machine.</b> The steps and attacks follow the rules in the file header, shortened.</p>',
  code: {
    title: 'Check issuer and audience on every request',
    note: 'Adapted from the course\'s MCP OAuth lesson.',
    text: `
ISSUER = "https://login.bank.example"
RESOURCE = "https://loans.bank.example/mcp"

def authorize(request):
    token = bearer(request.headers.get("Authorization"))     # never from the URL
    claims = verify_signature(token, jwks_for(ISSUER))
    if claims["iss"] != ISSUER or RESOURCE not in audiences(claims) or expired(claims):
        return 401
    needed = SCOPES[tool_name(request)]
    if not needed <= set(claims["scope"].split()):
        return 403, {"WWW-Authenticate": f'Bearer error="insufficient_scope", scope="{" ".join(needed)}"'}
    return claims

def call_bureau(user):
    t = client_credentials_token(audience="https://bureau.example")   # its own token
    return http.get("https://bureau.example/score", headers={"Authorization": f"Bearer {t}"})
`,
  },
};
