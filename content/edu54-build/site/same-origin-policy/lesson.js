// The same-origin policy: an invented clinic's patient portal at https://portal.clinic.example keeps a login cookie in the browser. Pages from
// three origins try two things: read the patient's records through the portal's API, and submit a form that changes the patient's phone
// number. The browser always lets a page send requests, but lets it read a cross-origin response only if CORS headers allow that origin; a
// SameSite cookie or a CSRF token stops forged form submissions. Each outcome follows from these rules.
const ORIGINS = { portal: 'https://portal.clinic.example', partner: 'https://lab.partner.example', evil: 'https://free-prizes.example' };
const SCEN = [
  { from: 'portal', act: 'read', label: 'Portal page reads records' },
  { from: 'partner', act: 'read', label: 'Partner lab reads records' },
  { from: 'evil', act: 'read', label: 'Prize site reads records' },
  { from: 'evil', act: 'form', label: 'Prize site submits the phone form' },
];
function decide(o) {
  const s = SCEN[o.scen], same = s.from === 'portal';
  const cookieSent = same || s.act === 'read' ? true : !o.samesite;
  let sent = true, readable = false, changed = false, why = '';
  if (s.act === 'read') {
    if (same) { readable = true; why = 'same origin: scheme, host and port all match'; }
    else if (o.corsMode === 'reflect') { readable = true; why = 'server reflects any Origin with credentials'; }
    else if (o.corsMode === 'list' && s.from === 'partner') { readable = true; why = 'partner origin is on the allow list'; }
    else { why = o.sop ? 'cross-origin, no matching CORS header: browser hides the response' : 'browser not enforcing the policy'; readable = !o.sop; }
  } else {
    const tokenOk = !o.token;
    changed = same || (cookieSent && tokenOk);
    why = !cookieSent ? 'SameSite cookie not sent from another site' : !tokenOk ? 'request has no valid CSRF token' : 'cookie attached, no token check: the form works';
  }
  const harm = (!same && s.from === 'evil') && (readable || changed);
  return { s, sent, readable, changed, cookieSent, why, harm };
}

export default {
  slug: 'same-origin-policy',
  title: 'The same-origin policy, and its gaps',
  description: 'A clinic\'s patient portal keeps a login cookie, and pages from three sites try to use it. Who may read, who may send, who is stopped?',
  overview: 'The same-origin policy is the rule that keeps one website from reading another\'s data in your browser. An origin is the scheme, host and port of a URL together, so https://portal.clinic.example and https://lab.partner.example are different origins, and so is the same host over http. Scripts on a page may freely read responses from their own origin. They may still send requests to other origins, with the user\'s cookies attached, because the web has always allowed links, forms and images to point anywhere; what the policy blocks is reading the cross-origin response. A server that wants to share data with another origin opts in with Cross-Origin Resource Sharing: it answers with an Access-Control-Allow-Origin header naming the allowed origin, and Access-Control-Allow-Credentials if cookies may be used. A common mistake is to copy whatever Origin the request carries into that header while allowing credentials, which lets every site on the internet read the logged-in user\'s data. Because sending is allowed, the policy does not stop cross-site request forgery: a hostile page can submit a form to the portal, and the browser attaches the portal\'s cookie, so the change goes through as if the user made it. Two defences close that gap: SameSite cookies, which the browser leaves off requests started by other sites, and CSRF tokens, secret values the portal puts in its own forms and checks on every change. The 500 Lines or Less chapter models all of this in the Alloy language and lets a solver search for attacks. This machine follows an invented clinic portal in Kigali.',
  keywords: ['same-origin policy', 'CORS', 'CSRF', 'SameSite cookies', 'web security', 'origin', 'Alloy'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.05], dir: [0.05, 0.9, 1.1], half: 1.0, wide: 5.0 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/the-same-origin-policy.html" target="_blank" rel="noopener">The Same-Origin Policy</a> by Eunsuk Kang, Santiago Perez De Rosso and Daniel Jackson, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short CORS and CSRF checks, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { scen: 2, sop: true, corsMode: 'list', samesite: true, token: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const COL = { portal: '#1F9E89', partner: '#3D6BD6', evil: '#D9483B' };
    // three pages open in the browser, one per origin
    const PZ = { portal: -0.75, partner: -0.05, evil: 0.65 }, PX = -2.1;
    const pages = {}; Object.keys(PZ).forEach(k => { const m = own(COL[k]), b = P.box(0.5, 0.42, 0.42, '#fff', { r: 0.05, material: m }); b.position.set(PX, 0, PZ[k]); S.add(b); pages[k] = m; });
    // the browser, holding the portal's login cookie
    const br = P.box(0.9, 0.3, 1.0, '#3A3D4A', { r: 0.06 }); br.position.set(-0.3, 0, -0.05); S.add(br);
    const cookieM = own(SAF), cookie = P.cyl(0.16, 0.06, SAF, { material: cookieM }); cookie.position.set(-0.3, 0.3, -0.05); S.add(cookie);
    // the clinic's server with the patient's records; the top block is the phone number
    const srv = P.box(0.6, 0.55, 0.6, COL.portal, { r: 0.05 }); srv.position.set(1.85, 0, -0.35); S.add(srv);
    const rec = P.stack(0.36, 0.36, 0.12, { max: 3 }); rec.position.set(1.85, 0.0, 0.35); S.add(rec);
    // requests go out on the high lane; responses come back on the low lane
    const lane = (a, b, y, dz, c) => { const p = P.pipe([a.clone().setY(y).add(V(0, 0, dz)), a.clone().lerp(b, 0.5).setY(y + 0.08).add(V(0, 0, dz)), b.clone().setY(y).add(V(0, 0, dz))], c, { r: 0.028, n: 4 }); S.add(p); return p; };
    const BR = V(-0.75, 0, -0.05), BRr = V(0.15, 0, -0.05), SV = V(1.55, 0, -0.35);
    const out = {}, back = {};
    Object.keys(PZ).forEach(k => { out[k] = lane(V(PX + 0.25, 0, PZ[k]), BR, 0.38, -0.05, SAF); back[k] = lane(BR, V(PX + 0.25, 0, PZ[k]), 0.14, 0.07, GOOD); });
    const outS = lane(BRr, SV, 0.38, -0.05, SAF), backS = lane(SV, BRr, 0.14, 0.07, GOOD);
    const wall = P.gate(0.45, GOOD, { h: 0.32 }); wall.rotation.y = Math.PI / 2; S.add(wall);
    S.add(P.keep(-2.4, 2.2, 0.75, -1.0, 0.9));

    let R = null;
    function draw() {
      R = decide(st);
      const k = R.s.from, read = R.s.act === 'read';
      Object.keys(PZ).forEach(o => { pages[o].color.set(o === k ? COL[o] : OFF); out[o].visible = o === k; back[o].visible = false; });
      out[k].userData.set({ color: R.cookieSent ? SAF : '#8E91A3' }); outS.userData.set({ color: R.cookieSent ? SAF : '#8E91A3' });
      backS.visible = read;
      back[k].visible = read && R.readable; back[k].userData.set({ color: R.harm ? BAD : GOOD });
      wall.visible = read && !R.readable; wall.position.set(-1.2, 0, -0.05 + 0.41 * (PZ[k] + 0.05));
      const changed = !read && R.changed;
      rec.userData.set({ n: 3, colors: ['#5B8DB8', '#5B8DB8', changed ? (R.harm ? BAD : SAF) : '#5B8DB8'] });
      cookieM.color.set(SAF);
    }
    const tick = dt => { Object.values(out).concat(Object.values(back), [outS, backS]).forEach(p => p.userData.tick(dt)); wall.userData.tick(dt, true); };
    function isOk() { return !R.harm && st.sop && st.corsMode === 'list' && (st.samesite || st.token); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Browser enforces the same-origin policy', short: 'SOP', get: () => st.sop, set: v => set({ sop: !!v }) },
      { type: 'toggle', label: 'CORS allows only the partner lab', short: 'Allow list', get: () => st.corsMode === 'list', set: v => set({ corsMode: v ? 'list' : 'reflect' }) },
      { type: 'toggle', label: 'SameSite login cookie', short: 'SameSite', get: () => st.samesite, set: v => set({ samesite: !!v }) },
      { type: 'toggle', label: 'Check a CSRF token on changes', short: 'CSRF token', get: () => st.token, set: v => set({ token: !!v }) },
      { type: 'buttons', label: 'Who tries what', options: SCEN.map(s => s.label), get: () => st.scen, act: i => set({ scen: i }) },
    ];
    const readouts = [
      { label: 'Request sent', get: () => ({ v: 'always', sub: 'sending is allowed', good: true, bad: false }) },
      { label: 'Response read', get: () => ({ v: R.s.act === 'read' ? (R.readable ? 'yes' : 'no') : '—', sub: ORIGINS[R.s.from].replace('https://', ''), good: !R.harm, bad: R.harm && R.s.act === 'read' }) },
      { label: 'Forged change', get: () => ({ v: R.s.act === 'form' ? (R.changed ? 'made' : 'refused') : '—', sub: 'phone number', good: !(R.s.act === 'form' && R.changed), bad: R.s.act === 'form' && R.changed }) },
    ];
    const labels = [
      { name: 'p', t: 'Pages from three sites', d: 'Teal: the portal. Blue: the lab. Red: the prize site', icon: 'eye', atV: V(PX - 0.25, 0.3, PZ.portal) },
      { name: 'b', t: 'The browser', d: 'Gold: the login cookie riding along', icon: 'shield', atV: V(-0.3, 0.33, -0.21) },
      { name: 's', t: 'The clinic\'s server', d: 'Top block: the phone number. Coral: forged', icon: 'box', atV: V(2.15, 0.4, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Reflect any origin in CORS', hint: 'with credentials', on: () => set({ ...D0, corsMode: 'reflect', scen: 2 }), off: reset },
      { label: 'Drop SameSite and the CSRF token', hint: 'forged forms work', on: () => set({ ...D0, samesite: false, token: false, scen: 3 }), off: reset },
      { label: 'Use a browser without the policy', hint: 'any page reads any site', on: () => set({ ...D0, sop: false, scen: 2 }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.harm && r.s.act === 'read' && st.corsMode === 'reflect') return { ok: false, msg: '<b>The portal copied the prize site\'s Origin into Access-Control-Allow-Origin and allowed credentials, so the browser let the prize site read the logged-in patient\'s records.</b> Allow only named origins, and never reflect the request\'s Origin with credentials.' };
      if (r.harm && r.s.act === 'read') return { ok: false, msg: '<b>Without the same-origin policy, any page the patient visits could read the portal\'s API with their cookie: the prize site just did.</b> Browsers block reading cross-origin responses unless the server opts in.' };
      if (r.harm) return { ok: false, msg: '<b>The same-origin policy let the prize site send the form, as it always does, and with no SameSite cookie and no CSRF token the browser attached the login cookie and the portal changed the phone number.</b> Use SameSite cookies, and check a secret token on every change.' };
      if (!st.sop || st.corsMode !== 'list' || (!st.samesite && !st.token)) return { ok: false, msg: `<b>This request is harmless, but ${!st.sop ? 'the browser ignores origins' : st.corsMode !== 'list' ? 'the portal reflects any origin' : 'nothing stops forged forms'}: try the prize site.</b>` };
      return { ok: true, msg: `<b>${r.s.label}: ${r.s.act === 'read' ? (r.readable ? `allowed, because ${r.why}` : 'the request was sent, but the browser hid the response, because no CORS header names that origin') : (r.changed ? 'allowed from the portal\'s own page' : `refused: ${r.why}`)}.</b> ${st.samesite && st.token ? 'SameSite cookies and CSRF tokens back each other up.' : ''}` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One browser, many sites', home: true, say: 'A patient is logged in to a clinic portal. The browser keeps its login cookie, and other sites are open too.', act: m => m.set({ scen: 0, sop: true, corsMode: 'list', samesite: true, token: true }) },
    { t: 'Origins', home: true, say: 'An origin is scheme, host and port. The portal\'s own page may read the portal\'s data.', act: m => m.set({ scen: 0, sop: true, corsMode: 'list', samesite: true, token: true }) },
    { t: 'Sending is not reading', home: true, say: 'A prize site can send a request to the portal, but the browser hides the response from it.', act: m => m.set({ scen: 2, sop: true, corsMode: 'list', samesite: true, token: true }) },
    { t: 'Opting in', home: true, say: 'The portal names the partner lab in a CORS header, so the lab may read. Reflecting any origin would let everyone in.', act: m => m.set({ scen: 1, sop: true, corsMode: 'list', samesite: true, token: true }) },
    { t: 'Forged forms', home: true, say: 'The policy never stopped sending. Without defences, the prize site\'s form changes the patient\'s phone number.', act: m => m.set({ scen: 3, sop: true, corsMode: 'list', samesite: false, token: false }) },
    { t: 'Close the gap', home: true, say: 'A SameSite cookie stays off other sites\' requests, and a CSRF token proves the form came from the portal.', act: m => m.set({ scen: 3, sop: true, corsMode: 'list', samesite: true, token: true }) },
  ],
  check: [
    { q: 'What does the same-origin policy block?', options: ['Reading cross-origin responses', 'Sending any request', 'Cookies'], answer: 0, why: 'Sending is still allowed.', hint: 'Try the prize site reading records.' },
    { q: 'What is dangerous about reflecting any Origin with credentials?', options: ['Every site can read logged-in users\' data', 'It is slow', 'Nothing'], answer: 0, why: 'Name allowed origins.', hint: 'Try Reflect any origin in CORS.' },
    { q: 'What stops a forged form submission?', options: ['SameSite cookies or a CSRF token', 'The same-origin policy alone', 'HTTPS'], answer: 0, why: 'Sending was never blocked.', hint: 'Try Drop SameSite and the CSRF token.' },
  ],
  terms: [
    ['Origin', 'The scheme, host and port of a URL.'],
    ['Same-origin policy', 'Scripts may read responses only from their own origin.'],
    ['CORS', 'Headers a server sends to let other origins read its responses.'],
    ['CSRF', 'A forged request a hostile page sends with the user\'s cookies.'],
    ['SameSite cookie', 'A cookie the browser leaves off requests started by other sites.'],
    ['CSRF token', 'A secret in a site\'s own forms, checked on every change.'],
  ],
  deeper: '<p><b>Preflight.</b> For requests other than simple forms, the browser first asks the server with an OPTIONS request whether the method and headers are allowed.</p><p><b>Modelling.</b> The chapter writes the rules in Alloy and lets a solver hunt for sequences of requests that break a property, finding attacks automatically.</p><p><b>About this machine.</b> The clinic and sites are invented; outcomes follow the browser\'s rules.</p>',
  code: {
    title: 'Safe CORS and a CSRF check',
    note: 'Our own short version, written for this lesson.',
    text: `
ALLOWED = {"https://lab.partner.example"}

def cors_headers(request):
    origin = request.headers.get("Origin")
    if origin in ALLOWED:                         # name origins; never echo any Origin
        return {"Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Vary": "Origin"}
    return {}

def change_phone(request, session):
    if request.form.get("csrf_token") != session["csrf_token"]:
        return 403, "bad token"                   # forged form: refused
    session.user.phone = request.form["phone"]
    return 200, "saved"

# Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax
`,
  },
};
