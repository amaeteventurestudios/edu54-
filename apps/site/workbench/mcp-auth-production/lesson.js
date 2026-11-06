// MCP auth in production: a county health records MCP server in Nakuru validates every request's token. One day, 24 hours, 4 requests a minute (5,760 in all).
// 06:00 the authorisation server rotates its signing key: tokens are now signed with key k2, which is published alongside k1.
// 11:00 a nurse's account is disabled after her phone is stolen; the thief keeps using her access token. 15:00 to 15:20 the token introspection service is down;
// during those 20 minutes 30 of the 80 requests are writes. Key cache: never refreshed / refreshed hourly and re-fetched once on an unknown key / fetched on every request.
// Token lifetime: 10 minutes (refresh tokens are revoked at once) or 24 hours. When introspection is down: fail closed for writes (reads from a fresh cache) / fail open / refuse everything.
const PER_MIN = 4, DAY = 24 * 60;
function run(st) {
  /* key rotation */
  const after = DAY - 6 * 60;
  const rejected = st.keys === 0 ? after * PER_MIN : 0;
  const fetches = st.keys === 0 ? 1 : st.keys === 1 ? 24 + 1 : DAY * PER_MIN;
  /* revocation: the thief's token was minted at 10:52 */
  const life = st.life === 0 ? 10 : 24 * 60, minted = 10 * 60 + 52, revoked = 11 * 60;
  const exposure = Math.max(0, minted + life - revoked);
  /* introspection outage */
  const writes = 30, reads = 50;
  const out = st.fail === 0 ? { badWrites: 0, refused: writes, readsServed: reads } : st.fail === 1 ? { badWrites: 3, refused: 0, readsServed: reads } : { badWrites: 0, refused: writes + reads, readsServed: 0 };
  return { rejected, fetches, exposure, ...out, writes, reads };
}

export default {
  slug: 'mcp-auth-production',
  title: 'Auth in production: keys rotate, tokens get revoked, services fail',
  description: 'A health records server in Nakuru checks every token for a day: a key rotates, a phone is stolen, the token checker goes down.',
  overview: 'Validating a token once in a demo is easy; validating every request for months is operations. Signing keys rotate: the authorisation server publishes a new key next to the old one, and the MCP server must refresh its cached copy of the published keys (JWKS) on a schedule and once more when it meets an unknown key ID, never by fetching on every request and never by trusting a key URL found inside a token. Tokens get revoked: when an account is disabled, every copy already held by every server stays valid until it expires, so the real revocation window is the token lifetime (or the introspection cache time for opaque tokens). Pick short-lived access tokens, revoke refresh tokens at once, and write the window down as a promise you test. Dependencies fail: when the introspection service or key endpoint is unreachable, an exception handler is the wrong place to decide. Declare a failure policy by operation in advance, fail closed for writes and sensitive reads, and keep "the service is down" separate from "this token is invalid" in logs and metrics. And check issuer, audience, expiry and scope on every single request.',
  keywords: ['JWKS rotation', 'token revocation', 'token introspection', 'fail closed', 'MCP authorization', 'access token lifetime', 'production security'],
  orient: 'landscape',
  view: { target: [0, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { keys: 1, life: 0, fail: 0 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the day as three tracks: signing keys, the revoked nurse's token, the introspection service; bars are good (teal) or bad (coral) stretches */
    const X0 = -2.75, XW = 3.4, SC = XW / DAY, at = m => X0 + m * SC, LZ = [-0.7, 0, 0.7];
    LZ.forEach(z => { const tr = P.box(XW, 0.03, 0.34, '#ECE8DF', { r: 0.02 }); tr.position.set(X0 + XW / 2, 0, z); S.add(tr); });
    const bar = z => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(1, 0.12, 0.26, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm, z }; };
    const keyOk = bar(LZ[0]), keyBad = bar(LZ[0]), expo = bar(LZ[1]), outBar = bar(LZ[2]);
    const post = (m, z, c) => { const p = P.cyl(0.025, 0.5, '#6B6E7E'); p.position.set(at(m), 0, z - 0.2); S.add(p); const f = P.box(0.14, 0.09, 0.02, c, { r: 0.01 }); f.position.set(at(m) + 0.07, 0.4, z - 0.2); S.add(f); };
    post(6 * 60, LZ[0], '#1F9E89'); post(11 * 60, LZ[1], '#B5462F'); post(15 * 60, LZ[2], '#C9A227');
    const k1 = P.box(0.16, 0.1, 0.1, SAF, { r: 0.02 }); k1.position.set(X0 - 0.25, 0, LZ[0] - 0.08); S.add(k1);
    const k2 = P.box(0.16, 0.1, 0.1, '#1F9E89', { r: 0.02 }); k2.position.set(X0 - 0.25, 0, LZ[0] + 0.08); S.add(k2);
    const thief = P.robot('#B5462F', { scale: 0.55 }); thief.userData.noFit = true; S.add(thief);
    const svc = P.box(0.22, 0.35, 0.3, '#5B8DB8', { r: 0.03 }); svc.position.set(X0 - 0.25, 0, LZ[2]); S.add(svc);
    /* the day's count: valid requests rejected, the revocation window, unchecked writes */
    const RX = 1.3, rejTw = P.tower(0.45, 0.45, RED, { size: 0.28 }), winTw = P.tower(0.45, 0.45, SAF, { size: 0.28 }), wrTw = P.tower(0.45, 0.45, RED, { size: 0.28 });
    rejTw.position.set(RX, 0, LZ[0]); winTw.position.set(RX + 0.6, 0, LZ[1]); wrTw.position.set(RX + 1.2, 0, LZ[2]); S.add(rejTw, winTw, wrTw);
    S.add(P.keep(-3.05, 2.75, 1.25, -1.0, 1.0));

    let R = null, clock = 0;
    const tm = m => m >= 60 ? `${(m / 60).toFixed(1)} h` : `${m} min`;
    function draw() {
      R = run(st);
      const put = (o, a, b, c) => { const len = Math.max(0.002, (b - a) * SC); o.b.scale.x = len; o.b.position.set(at(a) + len / 2, 0.03, o.z); o.mm.color.set(c); o.b.visible = b > a; };
      put(keyOk, 0, st.keys === 0 ? 6 * 60 : DAY, GOOD); put(keyBad, 6 * 60, st.keys === 0 ? DAY : 6 * 60, BAD);
      put(expo, 11 * 60, Math.min(DAY, 11 * 60 + R.exposure), BAD);
      put(outBar, 15 * 60, 15 * 60 + 20, st.fail === 1 ? BAD : SAF);
      k2.visible = st.keys !== 0;
      rejTw.userData.set({ h: 0.05 + Math.min(1, R.rejected / 4320) * 1.0, cap: R.rejected.toLocaleString('en'), color: R.rejected ? RED : GOOD });
      winTw.userData.set({ h: 0.05 + Math.min(1, R.exposure / 1440) * 1.0, cap: tm(R.exposure), color: R.exposure > 30 ? RED : GOOD });
      wrTw.userData.set({ h: 0.05 + Math.min(1, R.badWrites / 5) * 1.0, cap: `${R.badWrites}`, color: R.badWrites ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      [rejTw, winTw, wrTw].forEach(t => t.userData.tick(dt)); thief.userData.tick(dt); clock += dt;
      const u = (clock % 4) / 4, m = 11 * 60 + R.exposure * u;
      thief.visible = R.exposure > 0; thief.position.set(at(Math.min(DAY, m)), 0.03, LZ[1] + 0.25); thief.userData.set({ busy: true });
    };
    const controls = [
      { type: 'buttons', label: 'Signing-key cache', options: ['Never refreshed', 'Hourly + on unknown key', 'Fetch every request'], get: () => st.keys, act: i => set({ keys: i }) },
      { type: 'buttons', label: 'Access token lifetime', options: ['10 minutes', '24 hours'], get: () => st.life, act: i => set({ life: i }) },
      { type: 'buttons', label: 'When introspection is down', options: ['Writes fail closed', 'Let everything through', 'Refuse everything'], get: () => st.fail, act: i => set({ fail: i }) },
    ];
    const readouts = [
      { label: 'Valid requests rejected', get: () => ({ v: R.rejected.toLocaleString('en'), sub: 'after the key rotation', bad: R.rejected > 0, good: !R.rejected }) },
      { label: 'Revocation window', get: () => ({ v: R.exposure >= 60 ? `${(R.exposure / 60).toFixed(1)} h` : `${R.exposure} min`, sub: 'a stolen token still works', bad: R.exposure > 30, good: R.exposure <= 10 }) },
      { label: 'Unchecked writes', get: () => ({ v: `${R.badWrites}`, sub: 'during the outage', bad: R.badWrites > 0, good: !R.badWrites }) },
    ];
    const labels = [
      { name: 'day', t: 'One day, three tracks', d: 'Back: signing keys (new key at 06:00). Middle: a stolen token after 11:00. Front: introspection down at 15:00. Coral is trouble', icon: 'gauge', atV: V(X0 + 0.02, 0.04, LZ[1]) },
      { name: 'cnt', t: 'The day\'s count', d: 'Valid requests rejected, the stolen token\'s window, unchecked writes', icon: 'scale', atV: V(RX + 1.45, 0.3, LZ[2]) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never refresh the keys', hint: 'cache the JWKS forever', on: () => set({ ...D0, keys: 0 }), off: reset },
      { label: 'Day-long tokens', hint: '24-hour access tokens', on: () => set({ ...D0, life: 1 }), off: reset },
      { label: 'Fail open', hint: 'checker down, let it all through', on: () => set({ ...D0, fail: 1 }), off: reset },
    ];
    function status() {
      if (st.keys === 0) return { ok: false, msg: `<b>The signing keys were cached forever: after the 06:00 rotation, ${R.rejected.toLocaleString('en')} valid requests were rejected.</b> Refresh the published keys on a schedule, and re-fetch once (rate-limited) when a token names a key ID you haven't seen. Never mint keys yourself and never follow a key address taken from the token.` };
      if (st.life === 1) return { ok: false, msg: `<b>Day-long tokens: the thief kept access for ${(R.exposure / 60).toFixed(1)} hours after the nurse's account was disabled.</b> Disabling an account doesn't reach copies of tokens other servers have already accepted; they stay valid until they expire. Keep access tokens short, revoke refresh tokens at once, and test your stated revocation window.` };
      if (st.fail === 1) return { ok: false, msg: `<b>The introspection service was down and the server let everything through, including ${R.badWrites} writes with revoked tokens.</b> Decide before the outage what each kind of call does: writes and sensitive reads fail closed; low-risk reads may use a fresh cached result. And log "checker unavailable" separately from "token invalid".` };
      if (st.keys === 2) return { msg: `<b>Fetching the keys on every request: ${R.fetches.toLocaleString('en')} fetches today, and if the key endpoint stalls, every request stalls with it.</b> An hourly refresh plus one re-fetch on an unknown key ID is enough.` };
      if (st.fail === 2) return { msg: `<b>Refuse everything during the outage: ${R.refused} requests refused, reads included.</b> Safe, but a twenty-minute outage for every nurse. Reads with a fresh cached check can continue; writes wait.` };
      return { ok: true, msg: `<b>A quiet day.</b> The new key was picked up by a re-fetch the first time a token named it; the stolen token stopped working ${R.exposure} minutes after the account was disabled; and during the outage writes waited while reads used fresh cached checks.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Every request, all day', home: true, say: 'A county health records server in Nakuru checks every request\'s token: signature, issuer, audience, expiry and scope. Today three things happen.', act: m => m.set({ keys: 1, life: 0, fail: 0 }) },
    { t: 'Keys rotate', home: true, say: 'At six the login server starts signing with a new key. A server that refreshes its key cache, and re-fetches once when it sees an unknown key, carries on without a blip.', act: m => m.set({ keys: 1 }) },
    { t: 'A cache never refreshed', home: true, say: 'Cache the keys forever, and every token signed with the new key is rejected. Thousands of valid requests fail.', act: m => m.set({ keys: 0 }) },
    { t: 'Revocation takes time', home: true, say: 'At eleven a nurse\'s phone is stolen and her account disabled. Her token stays valid until it expires: ten minutes with short tokens, the rest of the day with long ones.', act: m => m.set({ keys: 1, life: 1 }) },
    { t: 'When the checker is down', home: true, say: 'At three the token-checking service goes down for twenty minutes. Let everything through, and revoked tokens write records.', act: m => m.set({ life: 0, fail: 1 }) },
    { t: 'Decided in advance', home: true, say: 'Writes wait, reads use fresh cached checks, and outages are logged apart from bad tokens. The decision was made before the outage, not in it.', act: m => m.set({ fail: 0 }) },
  ],
  check: [
    { q: 'The login server rotates its signing key. What should the MCP server do?', options: ['Refresh its key cache on a schedule and re-fetch once on an unknown key ID', 'Nothing', 'Generate a new key'], answer: 0, why: 'Resource servers refresh; only the issuer rotates.', hint: 'Try Never refresh the keys.' },
    { q: 'An account is disabled. How long can its token still work?', options: ['Until the token expires, or the introspection cache does', 'Not at all', 'Forever'], answer: 0, why: 'Short lifetimes keep the window small.', hint: 'Try Day-long tokens.' },
    { q: 'The introspection service is down. What should writes do?', options: ['Fail closed, by a policy decided in advance', 'Go through', 'Retry forever'], answer: 0, why: 'Improvising in an exception handler leads to failing open.', hint: 'Try Fail open.' },
  ],
  terms: [
    ['JWKS', 'The authorisation server\'s published signing keys, fetched and cached by resource servers.'],
    ['Key ID (kid)', 'Which key signed a token; an unknown one triggers a single re-fetch.'],
    ['Introspection', 'Asking the authorisation server whether an opaque token is active.'],
    ['Revocation window', 'How long a revoked token can still be accepted somewhere.'],
    ['Failure policy', 'What each kind of operation does when a dependency is down, decided in advance.'],
    ['Fail closed', 'Refuse when a check can\'t be made.'],
  ],
  deeper: '<p><b>Rotate versus refresh.</b> Only the authorisation server rotates keys (mints a new one, publishes it beside the old, retires the old later). A resource server only refreshes its copy. Wiring "unknown key" to anything but a rate-limited re-fetch turns attacker-chosen key IDs into a denial of service.</p><p><b>Opaque tokens.</b> If the issuer says tokens are opaque, don\'t guess at their contents: introspect, cache the answer by a hash of the token for at most your revocation window, and pin that choice to configuration, not to what the token claims.</p><p><b>Other failure modes.</b> Tokens missing an audience must be rejected, not treated as a wildcard; use the scope on the token presented, not "the user\'s current scope"; hash registration tokens at rest.</p><p><b>About this machine.</b> The counts come from the rules in the file header: 4 requests a minute, the stolen token minted at 10:52, 30 writes and 50 reads during the 20-minute outage, and 3 of those writes using revoked tokens.</p>',
  code: {
    title: 'Refresh keys, never rotate them',
    note: 'Adapted from the course\'s MCP auth in production lesson.',
    text: `
import time

class KeyCache:
    def __init__(self, jwks_uri):          # pinned from issuer metadata, never from a token
        self.uri, self.keys, self.last, self.last_miss = jwks_uri, {}, 0, 0

    def refresh(self):
        self.keys = {k["kid"]: k for k in http_get_json(self.uri)["keys"]}
        self.last = time.time()

    def key(self, kid):
        if time.time() - self.last > 3600:
            self.refresh()                       # scheduled
        if kid not in self.keys and time.time() - self.last_miss > 60:
            self.last_miss = time.time()
            self.refresh()                       # one re-fetch on an unknown key, rate-limited
        if kid not in self.keys:
            raise InvalidToken("unknown signing key")
        return self.keys[kid]
`,
  },
};
