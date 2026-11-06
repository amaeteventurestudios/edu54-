// Exam prep, MCP deprecated features: an invented civic-data team in Accra audits a server and client for deprecated features before an
// upgrade. Roots, sampling and logging are Deprecated in 2026-07-28 but still work (roots/list and sampling/createMessage now travel as MRTR
// inputRequests; logging survives per request through _meta logLevel); logging/setLevel and notifications/roots/list_changed are removed.
// includeContext "thisServer"/"allServers", Dynamic Client Registration and HTTP+SSE are deprecated too. Earliest removal is the first revision
// released on or after 2027-07-28, and removal is a maintainers' decision. Illustrative.
const ITEMS = [
  { n: 'roots/list as an MRTR input request', st: 'deprecated', mig: 'pass directories as tool parameters, resource URIs or config' },
  { n: 'sampling/createMessage as an MRTR input request', st: 'deprecated', mig: 'call the model provider\'s API directly' },
  { n: '_meta logLevel on one request', st: 'deprecated', mig: 'log to stderr (stdio) or use OpenTelemetry' },
  { n: 'logging/setLevel', st: 'removed', mig: 'gone: no connection-wide level in a stateless core' },
  { n: 'notifications/roots/list_changed', st: 'removed', mig: 'gone: no client-to-server push' },
  { n: 'sampling includeContext "allServers"', st: 'deprecated', mig: 'omit it; the default is "none"' },
  { n: 'Dynamic Client Registration', st: 'deprecated', mig: 'Client ID Metadata Documents' },
  { n: 'HTTP+SSE transport', st: 'deprecated', mig: 'Streamable HTTP' },
];

function judge(i, o) {
  const it = ITEMS[i];
  if (it.st === 'removed') return o.removed ? { v: 'removed: do not send', ok: true } : { v: 'sent anyway: -32601', ok: false };
  if (!o.works) return { v: 'refused as if removed: old clients break', ok: false };
  if (!o.newcode && i <= 1) return { v: 'adopted in brand-new code', ok: false };
  return { v: `works · migrate: ${it.mig}`, ok: true };
}

function run(o) {
  const rows = ITEMS.map((it, i) => ({ it, ...judge(i, o) }));
  const bad = rows.filter(r => !r.ok).length + (o.dates ? 0 : 1);
  return { rows, bad, ok: bad === 0 };
}

export default {
  slug: 'exam-mcp-deprecated-client-features',
  title: 'Exam prep, MCP: deprecated, not removed',
  description: 'An audit before an upgrade finds eight old features. Sort what still works from what is gone, and do not take the window end as a removal date.',
  overview: 'Every MCP feature is Active, Deprecated or Removed. Deprecated means still fully specified and still working, with a published migration path and a scheduled eventual removal; new implementations should not adopt it. SEP-2577 deprecated Roots, Sampling and Logging in 2026-07-28 for low adoption against real implementation cost. Roots and sampling kept their wire shapes but changed delivery: roots/list and sampling/createMessage, once server-initiated requests on an open connection, now travel as entries in an InputRequiredResult\'s inputRequests, and each is legal only if the client declared roots {} or sampling {} on that request; otherwise the server returns -32021. Migration: pass directories through tool parameters, resource URIs or configuration, and call model provider APIs directly. Sampling\'s includeContext values "thisServer" and "allServers" are separately deprecated; the default is "none", so omit the field. Logging split in two. The per-request part survives: a client adds io.modelcontextprotocol/logLevel to one request\'s _meta, and the server may send notifications/message at or above that level on that request\'s own response stream, never otherwise. The ambient part, logging/setLevel, is removed, because a stateless core has no connection to hang a level on; migrate to stderr on stdio or to OpenTelemetry. notifications/roots/list_changed is removed too, since there is no client-to-server push. Dynamic Client Registration yields to Client ID Metadata Documents, and the HTTP+SSE transport yields to Streamable HTTP. The deprecation window is at least twelve months from the release of the deprecating revision, so the earliest removal for the 2026-07-28 deprecations is the first revision released on or after 2027-07-28; whether and when a feature is removed is a Core Maintainer decision. The team is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'deprecation', 'roots', 'sampling', 'logging', 'migration', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { works: true, removed: true, newcode: true, dates: true, pick: 3 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* a rail for the deprecation window: start post, then an end post that is no hard stop unless misread */
    const rail = P.box(3.0, 0.05, 0.08, '#8E91A3', { r: 0.02 }); rail.position.set(0, 0, -0.65); S.add(rail);
    const start = P.box(0.08, 0.34, 0.08, '#5B8DB8', { r: 0.01 }); start.position.set(-1.5, 0, -0.65); S.add(start);
    const end = P.lamp(SAF, { h: 0.3, r: 0.1 }); end.position.set(1.5, 0, -0.65); S.add(end);
    /* eight features as blocks on pads: standing gold if deprecated and working, flat grey if removed, red if misjudged */
    const rows = ITEMS.map((it, i) => {
      const x = -1.68 + i * 0.48, m = new THREE.MeshLambertMaterial({ color: OFF });
      const pad = P.box(0.4, 0.04, 0.4, '#fff', { r: 0.03, material: m }); pad.position.set(x, 0, 0.1); S.add(pad);
      const c = P.tower(0.26, 0.26, SAF, { h: it.st === 'removed' ? 0.04 : 0.3 }); c.userData.set({ cap: '' }); c.position.set(x, 0.04, 0.1); S.add(c);
      return { m, c };
    });
    S.add(P.keep(-1.95, 1.95, 0.7, -0.85, 0.45));
    const parts = rows.map(r => r.c);

    let R = null;
    function draw() {
      R = run(st);
      end.userData.set({ color: st.dates ? SAF : BAD, on: true });
      R.rows.forEach((r, i) => {
        rows[i].m.color.set(i === st.pick ? SAF : '#E4DED2');
        const gone = r.it.st === 'removed';
        rows[i].c.userData.set({ h: r.ok ? (gone ? 0.04 : 0.3) : 0.46, color: !r.ok ? BAD : gone ? OFF : '#5B8DB8' });
      });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Deprecated features still work', short: 'Still works', get: () => st.works, set: v => set({ works: !!v }) },
      { type: 'toggle', label: 'Stop sending removed methods', short: 'Removed', get: () => st.removed, set: v => set({ removed: !!v }) },
      { type: 'toggle', label: 'New code does not adopt them', short: 'New code', get: () => st.newcode, set: v => set({ newcode: !!v }) },
      { type: 'toggle', label: 'Read the removal window correctly', short: 'Window', get: () => st.dates, set: v => set({ dates: !!v }) },
      { type: 'buttons', label: 'Item', options: ['roots', 'sampling', 'logLevel', 'setLevel', 'list_changed', 'includeContext', 'DCR', 'HTTP+SSE'], get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Audit mistakes', get: () => ({ v: String(R.bad), sub: 'of 8 items and the window', good: R.ok, bad: !R.ok }) },
      { label: 'This item', get: () => ({ v: R.rows[st.pick].it.st, sub: R.rows[st.pick].ok ? 'handled right' : 'handled wrong', good: R.rows[st.pick].ok, bad: !R.rows[st.pick].ok }) },
    ];
    const labels = [
      { name: 'l', t: 'The window', d: 'Red lamp: a date read as a deadline', icon: 'book', atV: V(1.72, 0.38, -0.65) },
      { name: 't', t: 'Eight features', d: 'Tall: works. Flat: gone. Red: misjudged', icon: 'check', atV: V(-1.92, 0.2, 0.1) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Refuse a deprecated feature', hint: 'it still works', on: () => set({ ...D0, works: false, pick: 0 }), off: reset },
      { label: 'Keep calling logging/setLevel', hint: 'removed, not deprecated', on: () => set({ ...D0, removed: false, pick: 3 }), off: reset },
      { label: 'Treat 2027-07-28 as a removal date', hint: 'it is the earliest eligibility', on: () => set({ ...D0, dates: false }), off: reset },
    ];
    function status() {
      const r = R.rows[st.pick];
      if (R.ok) return { ok: true, msg: `<b>${r.it.n}: ${r.v}.</b> Deprecated items keep working with a migration path, removed methods are never sent, and earliest removal is the first revision on or after 2027-07-28, at the maintainers' decision.` };
      const f = [];
      if (!st.works) f.push('deprecated features were refused as if removed, breaking clients that still use them');
      if (!st.removed) f.push('the client kept sending logging/setLevel and notifications/roots/list_changed, which 2026-07-28 removed');
      if (!st.newcode) f.push('new code adopted roots and sampling, though deprecated features are not for new implementations');
      if (!st.dates) f.push('2027-07-28 was read as a removal date; it is when the window ends, and removal is a later maintainers\' decision');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three deprecations', home: true, say: 'Roots, sampling and logging were deprecated in 2026-07-28. They still work.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 0 }) },
    { t: 'New delivery', home: true, say: 'Roots and sampling now arrive as input requests in a multi round-trip result.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 1 }) },
    { t: 'Logging per request', home: true, say: 'A log level in one request\'s metadata still works. A connection-wide level does not.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 2 }) },
    { t: 'Removed methods', home: true, say: 'Set level and roots list changed are gone, not deprecated. Do not send them.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 3 }) },
    { t: 'Other migrations', home: true, say: 'Dynamic client registration gives way to metadata documents, and the old transport to Streamable HTTP.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 6 }) },
    { t: 'The window', home: true, say: 'Twelve months is the earliest a feature may go. Removal is a later decision.', act: m => m.set({ works: true, removed: true, newcode: true, dates: true, pick: 7 }) },
  ],
  check: [
    { q: 'A client sends roots/list support in 2026-07-28. Does it still work?', options: ['Yes: deprecated, still functional', 'No: removed', 'Only on stdio'], answer: 0, why: 'Deprecated is not removed.', hint: 'Try Refuse a deprecated feature.' },
    { q: 'Is logging/setLevel deprecated or removed?', options: ['Removed', 'Deprecated', 'Active'], answer: 0, why: 'No connection-wide state to hold a level.', hint: 'Try Keep calling logging/setLevel.' },
    { q: 'What does 2027-07-28 mean for roots, sampling and logging?', options: ['The earliest a revision may remove them', 'The day they are removed', 'Nothing'], answer: 0, why: 'Removal is a maintainers\' decision.', hint: 'Try Treat 2027-07-28 as a removal date.' },
  ],
  practice: [
    { q: 'How does a server request sampling in 2026-07-28?', options: ['As an inputRequests entry in an input_required result', 'As a server-initiated request', 'Through a session', 'It cannot at all'], answer: 0, why: 'MRTR replaced server push.' },
    { q: 'What is the migration path for sampling?', options: ['Call the model provider\'s API directly', 'Use roots', 'Use logging', 'None'], answer: 0, why: 'Per the deprecated registry.' },
    { q: 'Where may notifications/message arrive?', options: ['On the response stream of the request that set logLevel', 'On a listen stream', 'On any stream', 'Never'], answer: 0, why: 'Only for that request, only if asked.' },
    { q: 'What should replace Dynamic Client Registration?', options: ['Client ID Metadata Documents', 'Pre-shared passwords', 'Sessions', 'Nothing'], answer: 0, why: 'After pre-registration.' },
    { q: 'What should a sampling request do with includeContext "allServers"?', options: ['Omit it; the default is "none"', 'Always send it', 'Send "thisServer" instead', 'Use it for security'], answer: 0, why: 'Those values are deprecated.' },
    { q: 'Can a deprecated feature be restored?', options: ['Yes, by a superseding SEP', 'No, never', 'Only by vendors', 'Only in Draft'], answer: 0, why: 'The lifecycle allows it.' },
  ],
  terms: [
    ['Deprecated', 'Still specified and working, with a migration path.'],
    ['Removed', 'Gone from the specification.'],
    ['Earliest removal', 'The first revision released on or after the window ends.'],
    ['logLevel', 'Per-request _meta key for deprecated logging.'],
    ['logging/setLevel', 'A removed method: no connection-wide level.'],
    ['CIMD', 'Client ID Metadata Documents, replacing Dynamic Client Registration.'],
  ],
  deeper: '<p><b>HTTP+SSE.</b> Deprecated since 2025-03-26; its earliest removal is three months after SEP-2596 reaches Final.</p><p><b>About this machine.</b> The team and audit are invented.</p>',
  code: {
    title: 'A migration advisor',
    note: 'Written for this lesson.',
    text: `
DEPRECATED = {
    "roots": ("SEP-2577", "pass directories as tool parameters or resource URIs"),
    "sampling": ("SEP-2577", "call the model provider API directly"),
    "logging": ("SEP-2577", "stderr on stdio, or OpenTelemetry"),
}
REMOVED = {"logging/setLevel", "notifications/roots/list_changed", "initialize", "ping"}

def advise(server_caps, client_caps, methods_used):
    notes = [f"{f}: deprecated ({sep}), migrate: {how}; earliest removal: first revision on/after 2027-07-28"
             for f, (sep, how) in DEPRECATED.items() if f in server_caps or f in client_caps]
    notes += [f"{m}: removed in 2026-07-28, stop sending it" for m in methods_used if m in REMOVED]
    return notes
`,
  },
};
