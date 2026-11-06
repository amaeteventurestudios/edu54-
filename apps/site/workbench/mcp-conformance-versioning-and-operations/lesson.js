// MCP conformance before an upgrade: a national ID verification team in Abidjan moves its MCP server and client from SDK 2.3 to 2.4.
// A transcript corpus records exactly what crossed the wire: 12 golden transcripts (accepted behaviour) and 14 negative ones (required refusals).
// SDK 2.4 has three wire bugs: it rejects a reply that carries an unknown additive field (it must keep and ignore it); it sends a reply to a notification;
// and behind the proxy, a −32020 header mismatch reaches the client as a bare HTTP 500 with no JSON-RPC body.
// Golden transcripts alone pass all three's happy paths except the additive field. Downgrade policy: strict (fall back to the old handshake only on positive legacy evidence
// from an endpoint configured for it) or permissive (any error → old handshake). Evidence: transcripts redacted (tokens, ID numbers) before storage, or raw.
const BUGS = [
  { k: 'additive', t: 'rejects a reply with an unknown extra field', golden: true },
  { k: 'notify', t: 'sends a reply to a notification', golden: false },
  { k: 'proxy', t: 'proxy turns −32020 into a bare 500', golden: false },
];
function run(st) {
  const found = BUGS.filter(b => b.golden || st.negative).map(b => b.t);
  const missed = BUGS.filter(b => !(b.golden || st.negative)).map(b => b.t);
  const E = [];
  const add = (t, bad) => E.push({ t, bad });
  add(`golden transcripts: 11 of 12 pass · fails: ${BUGS[0].t}`);
  if (st.negative) add('negative transcripts: 12 of 14 pass · fails: a reply sent for a notification; −32020 collapsed to a bare 500 at the proxy');
  else add('negative transcripts: not run · refusals untested', true);
  if (st.strict) add('a filtering proxy drops the modern reply in one test · inconclusive, not "legacy" · client stops and reports, no downgrade');
  else add('a filtering proxy drops the modern reply · client falls back to the old handshake · an attacker can force the weaker protocol', true);
  if (st.redact) add('evidence stored: transcripts with tokens and national ID numbers replaced by placeholders, digests kept');
  else add('evidence stored raw: 26 transcripts with live bearer tokens and citizens\' national ID numbers in the CI artifacts', true);
  add(found.length === BUGS.length || st.negative ? 'gate: hold 2.4 · fix, rerun the corpus, then promote with a health check and an automatic rollback' : `gate: hold for 1 bug, but ${missed.length} more would ship after it is fixed`, !st.negative);
  return { E, found, missed };
}

export default {
  slug: 'mcp-conformance-versioning-and-operations',
  title: 'Conformance: test the wire, not just the SDK',
  description: 'An Abidjan ID-verification team upgrades its MCP SDK. A corpus of recorded wire transcripts decides whether the new version ships.',
  overview: 'An SDK call that returns tools proves little about what crossed the wire. Did the request carry its per-request metadata, did the mirrored headers match the body, did the reply really contain resultType or did the SDK fill it in, would a future extra field survive, did a notification get no reply, did the proxy keep the JSON-RPC error? Conformance tests check those invariants with transcripts: exact recordings of headers, request, status and body. Golden transcripts prove accepted behaviour (a modern request and complete result, input_required where allowed, extension results only after the capability was declared, a legacy result without resultType only in the legacy era, a notification with no reply). Negative transcripts prove refusals (header and body mismatch, missing capabilities, unsupported version, missing or unknown resultType, wrong IDs, both result and error, a reply to a notification, a proxy collapsing an error). Unknown additional fields must be kept and ignored; an unknown resultType must be rejected. Version eras get separate validators, and a client falls back to the old handshake only on positive legacy evidence from an endpoint configured to allow it, never after a timeout or a modern error. Redact evidence before it leaves memory, and make health checks and automatic rollback part of the release gate.',
  keywords: ['MCP conformance', 'protocol testing', 'golden tests', 'negative tests', 'downgrade attack', 'release gate', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-1.15, 0.3, -0.1], dir: [0.4, 0.85, 1.3], half: 1.35, wide: 3.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { negative: true, strict: true, redact: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the corpus: 12 golden transcript cards (back row) and 14 negative ones (front row), standing up; green pass, coral fail, grey not run */
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 26); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const cp = P.box(2.5, 0.03, 1.0, '#FFFFFF', { r: 0.03 }); cp.position.set(-1.55, 0, -0.5); S.add(cp);
    /* the downgrade switch: a lane to the old handshake, shut (green) by the strict policy */
    const lane = P.box(1.0, 0.03, 0.3, '#D9D4C7', { r: 0.02 }); lane.position.set(-2.2, 0, 0.55); S.add(lane);
    const oldBox = P.box(0.4, 0.3, 0.35, '#8E8C84', { r: 0.04 }); oldBox.position.set(-1.55, 0, 0.55); S.add(oldBox);
    const dgM = new THREE.MeshLambertMaterial({ color: GOOD }), dg = P.box(0.07, 0.4, 0.4, '#fff', { r: 0.02, material: dgM }); dg.position.set(-1.9, 0, 0.55); S.add(dg);
    /* the evidence vault in CI: red when transcripts are stored raw */
    const vM = new THREE.MeshLambertMaterial({ color: '#5B6A7E' }), vault = P.box(0.5, 0.45, 0.45, '#fff', { r: 0.05, material: vM }); vault.position.set(-0.7, 0, 0.55); S.add(vault);
    const foundTw = P.tower(0.45, 0.45, GOOD, { size: 0.28 }); foundTw.position.set(0.25, 0, -0.2); S.add(foundTw);
    S.add(P.keep(-2.85, 0.55, 1.15, -1.05, 0.85));

    let R = null;
    function draw() {
      R = run(st);
      for (let i = 0; i < 26; i++) {
        const golden = i < 12, j = golden ? i : i - 12, x = -2.7 + j * 0.165, z = golden ? -0.75 : -0.3;
        const ran = golden || st.negative, fail = golden ? i === 3 : (j === 5 || j === 9);
        dummy.position.set(x, 0.03, z); dummy.scale.set(0.1, ran ? 0.3 : 0.08, 0.22); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(!ran ? '#D9D4C7' : fail ? BAD : GOOD));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      dgM.color.set(st.strict ? GOOD : RED); dg.position.y = st.strict ? 0 : -0.38;
      vM.color.set(st.redact ? '#5B6A7E' : RED);
      foundTw.userData.set({ h: 0.05 + R.found.length / 3 * 1.0, cap: `${R.found.length}/3`, color: R.found.length === 3 ? GOOD : RED });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => foundTw.userData.tick(dt);
    const controls = [
      { type: 'toggle', label: 'Run negative transcripts', short: 'Negative tests', get: () => st.negative, set: v => set({ negative: !!v }) },
      { type: 'toggle', label: 'Strict downgrade policy', short: 'Strict', get: () => st.strict, set: v => set({ strict: !!v }) },
      { type: 'toggle', label: 'Redact evidence before storing', short: 'Redact', get: () => st.redact, set: v => set({ redact: !!v }) },
      { type: 'button', label: 'Run the corpus again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Bugs found', get: () => ({ v: `${R.found.length} of 3`, sub: 'before release', good: R.found.length === 3, bad: R.found.length < 3 }) },
      { label: 'Downgrade', get: () => ({ v: st.strict ? 'evidence only' : 'on any error', sub: 'to the old handshake', bad: !st.strict, good: st.strict }) },
      { label: 'Secrets in CI', get: () => ({ v: st.redact ? 'none' : 'tokens, IDs', sub: 'in stored transcripts', bad: !st.redact, good: st.redact }) },
    ];
    const labels = [
      { name: 'corpus', t: 'The transcript corpus', d: 'Back row: 12 golden (what must be accepted). Front row: 14 negative (what must be refused). Grey: not run', icon: 'layers', atV: V(-2.82, 0.15, -0.5) },
      { name: 'ops', t: 'Downgrade and evidence', d: 'The gate shuts the lane to the old handshake (strict policy); the slate vault turns red if raw tokens and ID numbers are stored', icon: 'stop', atV: V(-2.7, 0.05, 0.55) },
      { name: 'log', t: 'Bugs found', d: 'Of the three wire bugs in SDK 2.4', icon: 'check', atV: V(0.5, 0.3, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Test the happy path only', hint: 'golden transcripts, no negatives', on: () => set({ ...D0, negative: false }), off: reset },
      { label: 'Downgrade on any error', hint: 'permissive fallback', on: () => set({ ...D0, strict: false }), off: reset },
      { label: 'Keep raw transcripts', hint: 'no redaction', on: () => set({ ...D0, redact: false }), off: reset },
    ];
    function status() {
      if (!st.negative) return { ok: false, msg: `<b>Only golden transcripts ran: they caught the rejected extra field, but ${R.missed.length} bugs would ship: ${R.missed.join('; ')}.</b> Happy paths prove what is accepted. Refusals (replies to notifications, errors collapsed by proxies, wrong IDs, unknown resultTypes) need negative transcripts of their own.` };
      if (!st.strict) return { ok: false, msg: '<b>A proxy dropped one modern reply, and the client fell back to the old handshake.</b> Anyone who can drop a packet can now force the weaker protocol. A timeout or a modern error is not evidence of a legacy server: fall back only on a positive legacy answer from an endpoint configured to allow it.' };
      if (!st.redact) return { ok: false, msg: '<b>Twenty-six transcripts with live bearer tokens and citizens\' national ID numbers sit in the CI artifacts.</b> Evidence is valuable and dangerous. Redact secrets and personal data before transcripts leave memory, keeping digests so tests can still compare them.' };
      return { ok: true, msg: '<b>The harness held SDK 2.4 with all three wire bugs found.</b> Golden transcripts caught the rejected extra field (unknown additive fields must be kept and ignored); negative transcripts caught the reply to a notification and the proxy collapsing −32020. The client refused to downgrade without evidence, and the stored evidence is redacted. Fix, rerun, then promote with a health check and automatic rollback.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The SDK says it works', home: true, say: 'A national ID verification team in Abidjan upgrades its MCP SDK. The integration test lists tools and passes. That says little about what crossed the wire.', act: m => m.set({ negative: true, strict: true, redact: true }) },
    { t: 'Golden transcripts', home: true, say: 'Recorded transcripts of what must be accepted catch one bug: the new version rejects a reply carrying an extra field it should keep and ignore.', act: m => m.set({ negative: false }) },
    { t: 'Negative transcripts', home: true, say: 'Transcripts of what must be refused catch two more: a reply sent to a notification, and a proxy turning a protocol error into a bare server error.', act: m => m.set({ negative: true }) },
    { t: 'No downgrade without proof', home: true, say: 'When a proxy drops a reply, a permissive client falls back to the old protocol. That lets an attacker force it. Fall back only on positive legacy evidence.', act: m => m.set({ strict: false }) },
    { t: 'Evidence is sensitive', home: true, say: 'Raw transcripts hold live tokens and citizens\' ID numbers. Redact them before they are stored.', act: m => m.set({ strict: true, redact: false }) },
    { t: 'Gate the release', home: true, say: 'The upgrade is held until the corpus passes, then promoted with a health check and automatic rollback.', act: m => m.set({ redact: true }) },
  ],
  check: [
    { q: 'A reply carries a field the client doesn\'t know. What should the client do?', options: ['Keep and ignore it', 'Reject the reply', 'Downgrade'], answer: 0, why: 'Unknown additive fields are allowed; unknown resultTypes are not.', hint: 'Look at the golden failure.' },
    { q: 'What do negative transcripts test?', options: ['That things that must be refused are refused', 'Speed', 'Only errors from users'], answer: 0, why: 'Happy paths never exercise refusals.', hint: 'Try Test the happy path only.' },
    { q: 'When should a client fall back to the old handshake?', options: ['Only on positive legacy evidence from an endpoint configured for it', 'After any error', 'After a timeout'], answer: 0, why: 'Otherwise an attacker can force a downgrade.', hint: 'Try Downgrade on any error.' },
  ],
  terms: [
    ['Conformance', 'Behaving exactly as the protocol requires, observed on the wire.'],
    ['Transcript', 'A recording of headers, request, status and reply for one exchange.'],
    ['Golden transcript', 'A recorded case of behaviour that must be accepted.'],
    ['Negative transcript', 'A recorded case that must be refused.'],
    ['Downgrade attack', 'Forcing a client to use an older, weaker protocol.'],
    ['Health-gated rollout', 'Promoting a release only while health checks pass, rolling back automatically if not.'],
  ],
  deeper: '<p><b>Two eras, two validators.</b> Don\'t write one permissive validator that accepts both old and new shapes; branch on the selected era, and record the era beside every transcript.</p><p><b>SDK differentials.</b> Run the same corpus through two SDKs or versions and compare what they send and accept; differences point at bugs.</p><p><b>Proxy evidence.</b> Capture at the proxy as well as the client: a proxy that rewrites statuses or buffers streams is part of what you ship.</p><p><b>About this machine.</b> The corpus sizes and the three bugs are set in the file header.</p>',
  code: {
    title: 'Replay a transcript corpus',
    note: 'Adapted from the course\'s MCP conformance lesson.',
    text: `
def replay(corpus, client):
    failures = []
    for t in corpus:
        reply = client.send_raw(t["headers"], t["request"])
        if t["kind"] == "golden" and not accepted(reply, t):
            failures.append(t["name"])
        if t["kind"] == "negative" and not refused(reply, t):
            failures.append(t["name"])
        store(redact(t, reply))                  # tokens and personal data out first
    return failures

def refused(reply, t):
    if t.get("notification"):
        return reply is None                     # no JSON-RPC reply, ever
    return reply.status == t["expect_status"] and reply.json["error"]["code"] == t["expect_code"]
`,
  },
};
