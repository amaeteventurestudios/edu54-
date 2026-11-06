// Exam prep, MCP auditability and observability: an invented operations desk in Lilongwe calls ops-desk.reset_api_key, which calls
// credential-vault.store_secret upstream. traceparent in _meta keeps one trace id across both hops while each hop mints its own parent id;
// tracestate and baggage pass through. Each server writes its own hash-chained audit log with five answers: who (the authenticated principal,
// never clientInfo), what (method, tool, arguments with secrets replaced by a marker), when, which channel, and correlation (request id plus
// trace id). Illustrative.
const TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';

function run(o) {
  const hop1 = `00-${TRACE}-00f067aa0ba902b7-01`;
  const hop2 = o.child ? `00-${TRACE}-b9c7c989f97918e1-01` : hop1;
  const who = o.principal ? 'user:chikondi (from the validated token)' : 'clientInfo.name "admin-console" (self-reported)';
  const args = o.redact ? '{account_id: "acc-219", new_key: "[REDACTED]"}' : '{account_id: "acc-219", new_key: "sk_live_8Hq2…"}';
  const issues = [];
  if (!o.child) issues.push('the credential-vault server reused ops-desk\'s parent id; each hop keeps the trace id but mints its own parent id');
  if (!o.principal) issues.push('the audit entry named the caller from clientInfo, which anyone can set; use the principal the validated credential resolves to');
  if (!o.redact) issues.push('the new API key was written into the audit log; flagged arguments are replaced by a marker before the entry exists');
  if (!o.chain) issues.push('entries were a plain list, so an edited entry went unnoticed; chain each entry to the previous hash');
  if (!o.otel) issues.push('the server sent notifications/message for every request; logging is deprecated: use stderr or OpenTelemetry');
  return { hop1, hop2, who, args, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-auditability-and-observability',
  title: 'Exam prep, MCP: auditability and observability',
  description: 'A key reset crosses two servers. Carry one trace through both hops, name the real caller, and keep an audit trail no one can quietly edit.',
  overview: 'Because MCP 2026-07-28 is stateless, every request already carries its own context in _meta, and that block is also where tracing lives: traceparent, tracestate and baggage, in W3C Trace Context and Baggage formats, are the one exception to the _meta prefix rule. A traceparent is four lowercase-hex segments: a two-character version, a 32-character trace id, a 16-character parent id and a two-character flags byte. The trace id names the whole operation and never changes; the parent id names one span, so when ops-desk calls credential-vault it keeps the trace id and mints a new parent id rather than forwarding the value unchanged. All-zero trace or parent ids are invalid. tracestate and baggage pass through unchanged. Logging is deprecated in this revision: a server should write to stderr on stdio or use OpenTelemetry for structured telemetry; a request that still sets logLevel may receive notifications/message on its own response stream. An audit record earns the name only if it answers five things. Who: the authenticated principal that a validated credential resolves to, never the self-reported clientInfo. What: the method, the tool and its arguments, with anything flagged sensitive replaced by a fixed marker before the entry exists, so the secret is never written even once. When: a timestamp. Which channel the result came back on: a completed result, an isError tool execution result or a JSON-RPC protocol error. And correlation: the request id, unique to one hop, plus the trace id shared by every hop, so two servers\' separate logs can be read together. The log must not be quietly rewritable: each entry stores the hash of the previous entry plus a digest of its own fields, so an edit or a deletion breaks the chain on verification. Logs never contain credentials, secrets or personal data beyond what is needed. The desk is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'traceparent', 'audit log', 'hash chain', 'redaction', 'opentelemetry', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { child: true, principal: true, redact: true, chain: true, otel: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* client, ops-desk and the vault in a line, one trace pipe running through */
    const client = P.robot('#3D6BD6', { scale: 0.6 }); client.position.set(-2.2, 0, -0.8); S.add(client);
    const ops = P.box(0.5, 0.4, 0.42, BLUE, { r: 0.05 }), keep = P.box(0.5, 0.5, 0.42, '#7B6FA8', { r: 0.05 }); ops.position.set(-0.9, 0, -0.8); keep.position.set(0.4, 0, -0.8); S.add(ops, keep);
    const hop1 = P.pipe([V(-1.98, 0.2, -0.8), V(-1.4, 0.2, -0.8), V(-1.15, 0.2, -0.8)], GOOD, { r: 0.03, n: 3 }), hop2 = P.pipe([V(-0.65, 0.2, -0.8), V(-0.25, 0.2, -0.8), V(0.15, 0.2, -0.8)], GOOD, { r: 0.03, n: 3 }); S.add(hop1, hop2);
    /* two audit logs as stacks of entries, joined link by link */
    const logs = [-0.9, 0.4].map(x => { const s = P.stack(0.5, 0.42, 0.1, { max: 5 }); s.position.set(x, 0, 0.05); S.add(s); return s; });
    const chain = [0.05, 0.25, 0.45].map(y => { const r = P.rod(V(-0.65, y, 0.05), V(0.15, y, 0.05), 0.016, GOOD); S.add(r); return r; });
    /* the caller's badge, from the validated token */
    const badge = P.lamp(GOOD, { h: 0.2, r: 0.1 }); badge.position.set(-2.2, 0, 0.05); S.add(badge);
    /* traces go to a collector; a flood of log messages does not */
    const collect = P.box(0.42, 0.26, 0.42, '#8E91A3', { r: 0.04 }); collect.position.set(1.4, 0, 0.05); S.add(collect);
    const feed = P.pipe([V(0.65, 0.14, 0.05), V(0.95, 0.14, 0.05), V(1.2, 0.14, 0.05)], GOOD, { r: 0.03, n: 3 }); S.add(feed);
    S.add(P.keep(-2.45, 1.7, 0.75, -1.05, 0.35));
    const parts = [client, hop1, hop2, feed];

    let R = null;
    function draw() {
      R = run(st);
      hop2.userData.set({ color: st.child ? GOOD : BAD });
      logs[0].userData.set({ n: 5, colors: [BLUE, BLUE, st.redact ? BLUE : BAD, BLUE, st.principal ? BLUE : BAD] });
      logs[1].userData.set({ n: 5, colors: [BLUE, BLUE, BLUE, BLUE, st.principal ? BLUE : BAD] });
      chain.forEach(r => { r.visible = !!st.chain; });
      badge.userData.set({ color: st.principal ? GOOD : BAD, on: true });
      feed.userData.set({ color: st.otel ? GOOD : BAD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = (k, label, short) => ({ type: 'toggle', label, short, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tog('child', 'New parent id at each hop', 'Child span'),
      tog('principal', 'Record the authenticated principal', 'Principal'),
      tog('redact', 'Redact flagged arguments first', 'Redact'),
      tog('chain', 'Hash-chain the audit entries', 'Hash chain'),
      tog('otel', 'stderr or OpenTelemetry, not logging', 'Telemetry'),
    ];
    const readouts = [
      { label: 'Trace id', get: () => ({ v: `${TRACE.slice(0, 8)}…`, sub: 'same on both hops', good: true }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the audit trail', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'h', t: 'Two hops', d: 'One trace, its own span each', icon: 'link', atV: V(-2.42, 0.25, -0.8) },
      { name: 't', t: 'Audit logs', d: 'Links gone: edits go unseen', icon: 'book', atV: V(0.66, 0.25, 0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Reuse the parent id upstream', hint: 'each hop is its own span', on: () => set({ ...D0, child: false }), off: reset },
      { label: 'Trust clientInfo as the caller', hint: 'self-reported', on: () => set({ ...D0, principal: false }), off: reset },
      { label: 'Log the new key', hint: 'redact before writing', on: () => set({ ...D0, redact: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Both hops share trace id ${TRACE.slice(0, 8)}… with their own parent ids, and each server\'s chained audit entry names the token\'s principal, replaces the new key with a marker, and records the time, the channel and the request and trace ids.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two hops', home: true, say: 'A key reset goes from the desk server to the vault server. Both should show up as one operation.', act: m => m.set({ child: false, principal: false, redact: false, chain: false, otel: false }) },
    { t: 'One trace', home: true, say: 'The trace id stays the same; each hop mints its own parent id.', act: m => m.set({ child: true, principal: false, redact: false, chain: false, otel: false }) },
    { t: 'Who did it', home: true, say: 'The audit entry names the principal from the validated token, not the self-reported client name.', act: m => m.set({ child: true, principal: true, redact: false, chain: false, otel: false }) },
    { t: 'Redact first', home: true, say: 'The new key is replaced by a marker before the entry is ever written.', act: m => m.set({ child: true, principal: true, redact: true, chain: false, otel: false }) },
    { t: 'Chain it', home: true, say: 'Each entry carries the hash of the one before, so a quiet edit breaks the chain.', act: m => m.set({ child: true, principal: true, redact: true, chain: true, otel: false }) },
    { t: 'Telemetry', home: true, say: 'Operational logs go to standard error or OpenTelemetry. MCP logging is deprecated.', act: m => m.set({ child: true, principal: true, redact: true, chain: true, otel: true }) },
  ],
  check: [
    { q: 'ops-desk calls credential-vault. What happens to traceparent?', options: ['Same trace id, new parent id', 'Forwarded unchanged', 'A new trace id'], answer: 0, why: 'Each hop is its own span.', hint: 'Try Reuse the parent id upstream.' },
    { q: 'Who goes in the audit entry\'s "who"?', options: ['The authenticated principal from the credential', 'clientInfo.name', 'The model'], answer: 0, why: 'clientInfo is self-reported.', hint: 'Try Trust clientInfo as the caller.' },
    { q: 'When is a secret argument redacted?', options: ['Before the entry exists in any form', 'After writing, in a cleanup job', 'Never'], answer: 0, why: 'The raw secret is never written once.', hint: 'Try Log the new key.' },
  ],
  practice: [
    { q: 'How many characters is a traceparent trace id?', options: ['32 hex', '16 hex', '8', '64'], answer: 0, why: 'The parent id is 16.' },
    { q: 'Is an all-zero parent id valid?', options: ['No', 'Yes', 'Only for the first hop', 'Only on stdio'], answer: 0, why: 'It means the generator never ran.' },
    { q: 'What does a hash chain let a reviewer detect?', options: ['An edited or deleted entry', 'Slow requests', 'Missing scopes', 'Expired tokens'], answer: 0, why: 'Each entry stores the previous hash.' },
    { q: 'Which keys are the exception to the _meta prefix rule?', options: ['traceparent, tracestate and baggage', 'protocolVersion', 'clientInfo', 'progressToken'], answer: 0, why: 'They use W3C formats.' },
    { q: 'Which channel values can an audit entry record?', options: ['complete, isError result, or protocol error', 'ok or fail', 'HTTP status only', 'none'], answer: 0, why: 'Which of the three the request ended on.' },
    { q: 'How do two servers\' logs get read together?', options: ['By matching trace ids', 'By sharing one log file', 'By clientInfo', 'They cannot'], answer: 0, why: 'Request ids are per hop; trace ids span hops.' },
  ],
  terms: [
    ['traceparent', 'W3C trace context: version, trace id, parent id, flags.'],
    ['Trace id', 'Names the whole operation; constant across hops.'],
    ['Parent id', 'Names one span; new at each hop.'],
    ['Audit entry', 'Who, what, when, channel and correlation.'],
    ['Redaction', 'Replacing flagged values with a marker before writing.'],
    ['Hash chain', 'Each entry stores the previous entry\'s hash.'],
  ],
  deeper: '<p><b>Separate chains.</b> Each server keeps its own chain; the shared trace id is what joins them for a reviewer.</p><p><b>About this machine.</b> The desk, ids and hashes are invented.</p>',
  code: {
    title: 'A child span and a chained entry',
    note: 'Written for this lesson.',
    text: `
import hashlib, json, secrets

def child_traceparent(value):
    version, trace_id, _parent, flags = value.split("-")
    return f"{version}-{trace_id}-{secrets.token_hex(8)}-{flags}"   # same trace, new span

def audit(log, principal, req, channel, redact):
    args = {k: ("[REDACTED]" if k in redact else v) for k, v in req["params"]["arguments"].items()}
    body = {"who": principal, "what": [req["method"], req["params"]["name"], args],
            "when": now_iso(), "channel": channel,
            "request_id": req["id"], "trace": req["params"]["_meta"]["traceparent"].split("-")[1],
            "prev": log[-1]["hash"] if log else "0" * 64}
    body["hash"] = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    log.append(body)
`,
  },
};
