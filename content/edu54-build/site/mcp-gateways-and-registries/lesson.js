// An MCP gateway: a telecom's internal assistant platform in Kampala puts one MCP endpoint in front of three backends (billing, network, hr).
// For every request the gateway authenticates the person, checks headers against the body, recomputes policy (role, tool, arguments), applies rate limits
// per person, forwards a fresh request to the backend with the gateway's own credential for it, and writes an audit record.
// Ten requests over a morning. At 10:20 Nakato's billing-refunds role is revoked. A script under one account opens 20 connections. From 10:40 to 10:45 the
// policy service is down. A registry lists a new "billing-pro" server with a verified badge. Settings change how the gateway decides.
const REQ = [
  { t: '09:05', who: 'Nakato', what: 'billing.refund(account 0772…, 1 day of airtime)', kind: 'ok' },
  { t: '09:30', who: 'Okello', what: 'network.outages(region: Gulu)', kind: 'ok' },
  { t: '10:20', who: 'admin', what: 'revokes Nakato\'s billing-refunds role', kind: 'event' },
  { t: '10:25', who: 'Nakato', what: 'billing.refund(account 0701…, 30 days of airtime)', kind: 'revoked' },
  { t: '10:30', who: 'script (Okello\'s key)', what: '20 connections × 60 calls a minute to network.subscriber_lookup', kind: 'flood' },
  { t: '10:35', who: 'Okello', what: 'hr.salary(employee 118)', kind: 'deny' },
  { t: '10:40', who: 'policy service', what: 'goes down for five minutes', kind: 'event' },
  { t: '10:42', who: 'Okello', what: 'billing.refund(account 0752…, 7 days)', kind: 'outageWrite' },
  { t: '10:43', who: 'Okello', what: 'network.outages(region: Mbarara)', kind: 'outageRead' },
  { t: '10:50', who: 'registry', what: 'lists "billing-pro" with a verified badge; an assistant tries billing-pro.refund', kind: 'registry' },
];
function run(st) {
  const out = REQ.map(r => {
    switch (r.kind) {
      case 'event': return { o: 'noted', n: true };
      case 'ok': return { o: 'allowed · forwarded with the gateway\'s own billing/network credential · audited' };
      case 'deny': return { o: 'denied: no HR role · audited' };
      case 'revoked': return st.perReq ? { o: 'denied: policy recomputed, the role is gone' } : { o: 'allowed: the allow decision was cached on her connection from 09:05', harm: 'refund by a revoked user' };
      case 'flood': return st.perPerson ? { o: 'limited to 60 a minute for Okello\'s key, whatever the connection count' } : { o: '1,200 calls a minute: the limit was per connection', harm: 'subscriber data scraped' };
      case 'outageWrite': return st.failClosed ? { o: 'refused: policy unavailable, writes fail closed' } : { o: 'allowed: policy unavailable, so the gateway let it through', harm: 'refund with no policy check' };
      case 'outageRead': return st.failClosed ? { o: 'allowed from a fresh cached decision for low-risk reads (declared in the failure policy)' } : { o: 'allowed: policy unavailable, everything let through' };
      case 'registry': return st.badge ? { o: 'admitted: the badge was taken as approval', harm: 'unreviewed server admitted' } : { o: 'not admitted: a registry helps find servers; admission needs review, pinning and a policy entry' };
    }
  });
  return { out, harms: out.filter(o => o.harm).map(o => o.harm) };
}

export default {
  slug: 'mcp-gateways-and-registries',
  title: 'An MCP gateway: decide every request, fresh',
  description: 'A Kampala telecom puts one MCP gateway in front of billing, network and HR. It decides every request afresh and writes it down.',
  overview: 'A gateway sits between many clients and many MCP servers and presents one endpoint. For each request it authenticates the person from the transport\'s credentials, checks that the method and tool in the headers match the body, decides policy afresh from who they are, which tool and which arguments, applies rate limits and data rules, and sends a fresh, self-contained request to the right backend using the gateway\'s own credential for it, never the client\'s token. Then it records an audit event without secrets. Because the 2026-07-28 protocol has no sessions, none of this may hang on a connection: an allow decision cached per connection outlives a revoked role, and a rate limit per connection is multiplied by every extra connection a script opens. Limits belong to the person or key. When a dependency such as the policy service fails, the gateway follows a failure policy declared in advance by kind of operation: fail closed for changes and sensitive reads. Registries help find servers and their published versions; admission is still the gateway operator\'s decision, after review, descriptor pinning and a policy entry.',
  keywords: ['MCP gateway', 'MCP registry', 'policy enforcement', 'rate limiting', 'fail closed', 'audit log', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-0.7, 0.4, 0.1], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { perReq: true, perPerson: true, failClosed: true, badge: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* three callers (Nakato, Okello, a script on Okello's key), one gateway wall, three backends (billing, network, hr) */
    const CZ = i => -0.75 + i * 0.6, CX = -2.45, GX = -1.4, BX = -0.3;
    const cl = ['#5B8DB8', '#1F9E89', '#E07A5F'].map((c, i) => { const r = P.robot(c, { scale: 0.8 }); r.position.set(CX, 0, CZ(i)); S.add(r); return r; });
    const gwM = new THREE.MeshLambertMaterial({ color: CHAR }), gw = P.box(0.4, 0.6, 1.9, '#fff', { r: 0.06, material: gwM }); gw.position.set(GX, 0, -0.15); S.add(gw);
    const be = ['#C97B2E', '#5B8DB8', '#7A5CC4'].map((c, i) => { const b = P.box(0.6, 0.4, 0.4, c, { r: 0.05 }); b.position.set(BX, 0, CZ(i)); S.add(b); return b; });
    /* the policy service and the registry, with an unreviewed "billing-pro" server that only connects if a badge is enough */
    const polM = new THREE.MeshLambertMaterial({ color: GOOD }), pol = P.box(0.6, 0.3, 0.35, '#fff', { r: 0.05, material: polM }); pol.position.set(GX, 0, 1.05); S.add(pol);
    const reg = P.box(0.5, 0.3, 0.35, '#C9A227', { r: 0.05 }); reg.position.set(BX - 0.1, 0, 1.05); S.add(reg);
    const proM = new THREE.MeshLambertMaterial({ color: '#B9B4A8' }), pro = P.box(0.45, 0.35, 0.35, '#fff', { r: 0.05, material: proM }); pro.position.set(BX + 0.55, 0, 1.05); S.add(pro);
    const proLink = P.box(0.6, 0.04, 0.06, RED, { r: 0.01 }); proLink.position.set((GX + BX + 0.55) / 2 + 0.25, 0.3, 0.75); proLink.rotation.y = -0.35; S.add(proLink);
    /* the audit log: one slab per event, coloured by the decision; and the harm tower */
    const log = P.stack(0.5, 0.4, 0.08, { max: REQ.length }); log.position.set(0.85, 0, -0.35); S.add(log);
    const harmTw = P.tower(0.5, 0.5, RED, { size: 0.28 }); harmTw.position.set(1.0, 0, 0.75); S.add(harmTw);
    const pkt = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); pkt.userData.noFit = true; S.add(pkt);
    S.add(P.keep(-2.8, 1.35, 1.2, -1.05, 1.3));

    let R = null, k = 0, clock = 0;
    const WHO = { Nakato: 0, Okello: 1 }, oc = o => o.harm ? RED : o.n ? '#C9C4B6' : /denied|refused|not admitted|limited/.test(o.o) ? SAF : GOOD;
    function show() {
      log.userData.set({ n: k + 1, colors: R.out.slice(0, k + 1).map(oc) });
      polM.color.set(k >= 6 && k <= 8 ? '#9A968C' : GOOD);
      const harmNow = R.out.slice(0, k + 1).filter(o => o.harm).length;
      gwM.color.set(harmNow ? '#6E3B33' : CHAR);
      proM.color.set(st.badge && k >= 9 ? RED : '#B9B4A8'); proLink.visible = !!(st.badge && k >= 9);
    }
    function draw() { R = run(st); k = 0; clock = 0; harmTw.userData.set({ h: 0.05 + R.harms.length / 4 * 1.0, cap: `${R.harms.length}`, color: R.harms.length ? RED : GOOD }); show(); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      cl.forEach(c => c.userData.tick(dt)); harmTw.userData.tick(dt);
      clock += dt; if (clock >= 1.2) { clock -= 1.2; if (k < REQ.length - 1) { k++; show(); } }
      const r = REQ[k], o = R.out[k], ci = /script/.test(r.who) ? 2 : WHO[r.who];
      cl.forEach((c, i) => c.userData.set({ busy: i === ci }));
      pkt.visible = ci != null;
      if (ci == null) return;
      const bi = /^billing/.test(r.what) ? 0 : /^network/.test(r.what) ? 1 : 2, pass = !/denied|refused|not admitted/.test(o.o), u = (clock % 1.2) / 1.2;
      const x = u < 0.5 ? CX + 0.3 + (GX - CX - 0.5) * (u / 0.5) : pass ? GX + 0.2 + (BX - 0.3 - GX - 0.2) * ((u - 0.5) / 0.5) : GX - 0.25;
      const z = u < 0.5 ? CZ(ci) + (-0.15 - CZ(ci)) * (u / 0.5) : pass ? -0.15 + (CZ(bi) + 0.15) * ((u - 0.5) / 0.5) : -0.15;
      pkt.position.set(x, 0.5, z); pkt.material.color.set(u > 0.5 ? oc(o) : SAF);
    };
    const controls = [
      { type: 'toggle', label: 'Recompute policy on every request', short: 'Fresh policy', get: () => st.perReq, set: v => set({ perReq: !!v }) },
      { type: 'toggle', label: 'Rate-limit per person, not per connection', short: 'Per person', get: () => st.perPerson, set: v => set({ perPerson: !!v }) },
      { type: 'toggle', label: 'Fail closed for writes when policy is down', short: 'Fail closed', get: () => st.failClosed, set: v => set({ failClosed: !!v }) },
      { type: 'toggle', label: 'Admit servers with a registry badge', short: 'Trust badge', get: () => st.badge, set: v => set({ badge: !!v }), quick: false },
      { type: 'button', label: 'Replay the morning', act: () => draw() },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.harms.length}`, sub: R.harms.join(', ') || 'none', bad: R.harms.length > 0, good: !R.harms.length }) },
      { label: 'Backends', get: () => ({ v: '3', sub: 'behind one endpoint' }) },
      { label: 'Client tokens forwarded', get: () => ({ v: '0', sub: 'the gateway uses its own' }) },
    ];
    const labels = [
      { name: 'gw', t: 'The gateway', d: 'Nakato, Okello and a script call through one wall to billing, network and hr; the green box below is the policy service', icon: 'layers', atV: V(CX - 0.3, 0.4, CZ(1)) },
      { name: 'log', t: 'The audit log', d: 'A slab per event: green allowed, gold refused or limited, red harm', icon: 'book', atV: V(1.12, 0.3, -0.35) },
      { name: 'harm', t: 'Harms', d: 'The grey block by the gold registry is "billing-pro"; red if a badge let it in', icon: 'stop', atV: V(1.25, 0.15, 0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Cache the allow per connection', hint: 'a session in all but name', on: () => set({ ...D0, perReq: false }), off: reset },
      { label: 'Rate-limit per connection', hint: 'open more connections, get more', on: () => set({ ...D0, perPerson: false }), off: reset },
      { label: 'Fail open', hint: 'policy down, let it all through', on: () => set({ ...D0, failClosed: false }), off: reset },
    ];
    function status() {
      if (!st.perReq) return { ok: false, msg: '<b>Nakato\'s refunds role was revoked at 10:20, and at 10:25 she issued a 30-day refund anyway.</b> The gateway cached "allowed" on her connection at 09:05. With no protocol sessions, nothing should hang on a connection: recompute policy from the person, tool and arguments on every request.' };
      if (!st.perPerson) return { ok: false, msg: '<b>A script under Okello\'s key opened 20 connections and made 1,200 subscriber lookups a minute.</b> A limit per connection is multiplied by every extra connection. Limit by the authenticated person or key (and by tenant), whatever the number of connections.' };
      if (!st.failClosed) return { ok: false, msg: '<b>The policy service went down, and the gateway let a refund through with no check.</b> Decide in advance what each kind of operation does when a dependency fails: fail closed for changes and sensitive reads; allow only low-risk reads from a fresh cached decision, if at all.' };
      if (st.badge) return { ok: false, msg: '<b>A registry badge admitted "billing-pro" without review.</b> Registries help you find servers and see who publishes them; admission is your decision. Review the server, pin its descriptors, namespace its tools and add a policy entry before any call reaches it.' };
      return { ok: true, msg: '<b>A morning with no harm.</b> Every request was authenticated and decided afresh, so the revoked role was refused five minutes later; the script hit Okello\'s per-key limit; during the outage the refund was refused and a low-risk read used a fresh cached decision; and the new server stayed out until reviewed. Each backend got the gateway\'s own credential, and every decision was audited.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One front door', home: true, say: 'A telecom\'s internal assistant platform in Kampala puts one MCP gateway in front of its billing, network and HR servers. Every request is authenticated, checked, decided, limited, forwarded and audited.', act: m => m.set({ perReq: true, perPerson: true, failClosed: true, badge: false }) },
    { t: 'Decide afresh', home: true, say: 'At twenty past ten Nakato loses her refunds role. Five minutes later her refund is refused, because the gateway decides every request from scratch.', act: m => m.set({ perReq: true }) },
    { t: 'Remembered decisions', home: true, say: 'Cache "allowed" on her connection instead, and the revoked role still works. A cached decision is a session in all but name.', act: m => m.set({ perReq: false }) },
    { t: 'Limits per person', home: true, say: 'A script opens twenty connections. With limits per connection, it gets twenty times the allowance. Limit by the person or key instead.', act: m => m.set({ perReq: true, perPerson: false }) },
    { t: 'When policy is down', home: true, say: 'The policy service goes down for five minutes. Fail open, and a refund goes through unchecked. Writes fail closed.', act: m => m.set({ perPerson: true, failClosed: false }) },
    { t: 'Badges are not approval', home: true, say: 'A registry lists a new billing server with a badge. Finding a server is not admitting it: review, pin and write policy first.', act: m => m.set({ failClosed: true, badge: true }) },
  ],
  check: [
    { q: 'Why must a gateway recompute policy on every request?', options: ['Roles and rules change; a cached decision outlives them', 'For speed', 'Backends require it'], answer: 0, why: 'There are no protocol sessions to hang decisions on.', hint: 'Try Cache the allow per connection.' },
    { q: 'Why rate-limit per person rather than per connection?', options: ['Opening more connections would multiply a per-connection limit', 'It is cheaper', 'Connections are anonymous'], answer: 0, why: 'Limits belong to whoever is accountable.', hint: 'Try Rate-limit per connection.' },
    { q: 'What does a registry decide?', options: ['Nothing about access: it helps you find servers', 'Which servers are safe', 'Who may call a tool'], answer: 0, why: 'Admission is the operator\'s decision after review.', hint: 'Try Admit servers with a registry badge.' },
  ],
  terms: [
    ['MCP gateway', 'One endpoint in front of many MCP servers that applies policy to every request.'],
    ['Credential mediation', 'The gateway calling backends with its own credentials, never the client\'s token.'],
    ['Fail closed', 'Refusing when a check can\'t be made.'],
    ['Failure policy', 'A decision, made in advance, for what each kind of call does when a dependency fails.'],
    ['Registry', 'A catalogue of MCP servers and versions; for discovery, not trust.'],
    ['Audit event', 'A record of who asked for what and what was decided, without secrets.'],
  ],
  deeper: '<p><b>Namespacing and pins.</b> The gateway merges backends\' tools under fixed prefixes and pins each approved descriptor, quarantining any that change.</p><p><b>Streams and tasks.</b> Request-scoped streams pass through for one request; long-lived change notices are subscriptions the gateway relays; tasks and input_required rounds route by explicit IDs and signed state, not by connection.</p><p><b>Discovery at every layer.</b> The gateway answers server/discover for its clients and discovers each backend itself, so it knows versions, capabilities and extensions on both sides.</p><p><b>About this machine.</b> The ten events and the gateway\'s decisions follow the rules in the file header.</p>',
  code: {
    title: 'The gateway\'s path for one request',
    note: 'Adapted from the course\'s MCP gateways and registries lesson.',
    text: `
def handle(req):
    who = authenticate(req.headers["Authorization"])        # the person, not the connection
    check_headers_match_body(req)                          # −32020 on mismatch
    tool = catalog[req.body["params"]["name"]]
    try:
        decision = policy.decide(who, tool, req.body["params"]["arguments"])   # every time
    except PolicyUnavailable:
        decision = FAILURE_POLICY[tool.kind](who, tool)    # writes: deny
    if not decision.allow:
        audit(who, tool, "denied", decision.reason); return forbidden()
    if not limiter.take(key=who.id):                        # per person, any number of connections
        return too_many_requests()
    reply = backends[tool.server].call(tool.local, req.body, credential=gateway_cred(tool.server))
    audit(who, tool, "allowed"); return reply
`,
  },
};
