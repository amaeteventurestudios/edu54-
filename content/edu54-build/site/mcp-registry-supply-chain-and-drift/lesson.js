// MCP registry and supply chain: a payments platform team in Windhoek admits MCP servers from the registry to its gateway. Admission is the team's decision;
// the registry is an index. Five events: a request to admit com.example/inventory 1.4.0; an impostor record named com.exampleevil/inventory; on Tuesday the
// publisher releases 1.5.0, which adds an export_all tool; on Wednesday the live 1.4.0 server's tool list changes without a new version (drift);
// on Thursday the registry marks 1.4.0 deleted (its package was found to contain a credential stealer).
// Controls: namespace compared exactly against the verified namespace (or by string prefix); a pin of exact version + record, source, toolset and provenance
// digests (or "latest"); live drift checks against the pinned toolset digest with quarantine and rollback; registry status synced into admission.
function run(st) {
  const E = [], harm = [];
  const add = (t, bad) => E.push({ t, bad });
  add('admit com.example/inventory 1.4.0 · namespace com.example verified (domain example.com) · package digest computed at our own fetch, matches the record · pinned');
  if (st.ns) add('com.exampleevil/inventory · namespace "com.exampleevil" ≠ "com.example" · refused');
  else { add('com.exampleevil/inventory · startswith("com.example") is true · admitted as if it were ours', true); harm.push('impostor server admitted'); }
  if (st.pin) add('Tue: 1.5.0 published (adds export_all) · our pin is 1.4.0 + digests · nothing changes until someone reviews 1.5.0');
  else { add('Tue: 1.5.0 published · pin "latest" pulls it in · export_all is live with no review', true); harm.push('unreviewed version live'); }
  if (st.drift) add('Wed: live 1.4.0 tool list hash ≠ pinned toolset digest · quarantined · route restored to 1.3.2, the last good pin');
  else { add('Wed: live 1.4.0 tool list changed, same version number · nobody checks · new behaviour in production', true); harm.push('silent drift'); }
  if (st.status) add('Thu: registry marks 1.4.0 deleted · status sync quarantines it · traffic on 1.3.2 · audit evidence kept');
  else { add('Thu: registry marks 1.4.0 deleted · admission never rechecks status · the credential stealer keeps serving', true); harm.push('deleted version still serving'); }
  return { E, harm };
}

export default {
  slug: 'mcp-registry-supply-chain-and-drift',
  title: 'Registry admission: verify, pin, watch, roll back',
  description: 'A Windhoek payments team admits MCP servers from the registry. In one week: an impostor, a risky new version, drift and a withdrawn release.',
  overview: 'The MCP Registry is an index of server records: a name in an authenticated namespace (com.example/inventory for whoever proved example.com), a version, and the packages or remote endpoints that serve it. Publication rules check namespace ownership; deployment is still your decision, and seven controls make it. Verify the namespace exactly: compare the namespace part to the verified one, because a string prefix check also accepts com.exampleevil. Join provenance: the package type, identifier and version declared in the record must match what you fetched, with a digest you computed at your own fetch, never one the artifact supplies about itself. Pin the decision, not just a version: exact version plus digests of the record, the source, the tool list and the provenance; "latest" and version ranges are not pins. Watch for drift: discover the live server and compare its tool list with the pinned digest; any change quarantines it. Treat registry status (active, deprecated, deleted) as live state and resync it. Roll back by restoring the route to the last good pin, and keep an append-only ledger of every admission decision.',
  keywords: ['MCP registry', 'supply chain security', 'namespace verification', 'version pinning', 'configuration drift', 'rollback', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-1.0, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.4, wide: 4.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { ns: true, pin: true, drift: true, status: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the registry shelf (an index): versions 1.3.2, 1.4.0, 1.5.0 of the real server, and an impostor record */
    const RX0 = -2.3, shelf = P.box(0.7, 0.06, 2.0, '#C9A227', { r: 0.03 }); shelf.position.set(RX0, 0, 0); S.add(shelf);
    const VC = ['#7FB8AC', '#1F9E89', '#7A5CC4', '#E07A5F'];
    const pk = VC.map((c, i) => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.36, 0.3, 0.34, '#fff', { r: 0.04, material: mm }); S.add(b); return { b, mm, home: [RX0, 0.06, -0.72 + i * 0.48] }; });
    /* the admission gate, the gateway's serving pad with a pin seal, and a quarantine cage */
    const gM = new THREE.MeshLambertMaterial({ color: CHAR }), gate = P.box(0.2, 0.55, 2.0, '#fff', { r: 0.04, material: gM }); gate.position.set(-1.45, 0, 0); S.add(gate);
    const padG = P.box(1.1, 0.06, 1.0, '#5B6A7E', { r: 0.04 }); padG.position.set(-0.45, 0, -0.35); S.add(padG);
    const seal = P.box(0.16, 0.06, 0.16, SAF, { r: 0.03 }); seal.userData.noFit = true; S.add(seal);
    const cageM = new THREE.MeshLambertMaterial({ color: '#F2C94C', transparent: true, opacity: 0.35, depthWrite: false });
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), cageM); cage.position.set(-0.45, 0.23, 0.6); S.add(cage);
    const cageBase = P.box(0.6, 0.04, 0.55, '#C9A227', { r: 0.02 }); cageBase.position.set(-0.45, 0, 0.6); S.add(cageBase);
    const harmTw = P.tower(0.45, 0.45, RED, { size: 0.28 }); harmTw.position.set(0.55, 0, 0.1); S.add(harmTw);
    S.add(P.keep(-2.75, 0.85, 1.15, -1.05, 1.05));

    let R = null, clock = 0;
    function draw() {
      R = run(st); clock = 0;
      pk.forEach(p => p.b.position.set(...p.home));
      const serving = !st.status ? 1 : !st.pin ? 2 : !st.drift ? 1 : 0;
      pk[serving].b.position.set(-0.6, 0.06, -0.35);
      if (!st.ns) pk[3].b.position.set(-0.2, 0.06, -0.35);
      const caged = st.status ? 1 : st.drift ? 1 : -1; if (caged >= 0 && caged !== serving) pk[caged].b.position.set(-0.45, 0.04, 0.6);
      pk[1].mm.color.set(serving === 1 ? (!st.status ? RED : SAF) : '#1F9E89');
      seal.visible = !!st.pin; seal.position.set(-0.6, 0.38, -0.35);
      gM.color.set(R.harm.length ? '#6E3B33' : CHAR);
      harmTw.userData.set({ h: 0.05 + R.harm.length / 4 * 1.0, cap: `${R.harm.length}`, color: R.harm.length ? RED : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { harmTw.userData.tick(dt); };
    const controls = [
      { type: 'toggle', label: 'Compare namespaces exactly', short: 'Exact namespace', get: () => st.ns, set: v => set({ ns: !!v }) },
      { type: 'toggle', label: 'Pin version and digests', short: 'Pin', get: () => st.pin, set: v => set({ pin: !!v }) },
      { type: 'toggle', label: 'Check live tools for drift', short: 'Drift check', get: () => st.drift, set: v => set({ drift: !!v }) },
      { type: 'toggle', label: 'Resync registry status', short: 'Status sync', get: () => st.status, set: v => set({ status: !!v }) },
      { type: 'button', label: 'Replay the week', act: () => draw() },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.harm.length}`, sub: R.harm.join(', ') || 'none', bad: R.harm.length > 0, good: !R.harm.length }) },
      { label: 'Controls on', get: () => ({ v: `${[st.ns, st.pin, st.drift, st.status].filter(Boolean).length} of 4`, sub: 'admission checks' }) },
      { label: 'Rollback target', get: () => ({ v: '1.3.2', sub: 'last good pin' }) },
    ];
    const labels = [
      { name: 'reg', t: 'The registry', d: 'An index, not an approval: versions 1.3.2, 1.4.0, 1.5.0 and a coral impostor record', icon: 'book', atV: V(RX0 - 0.38, 0.1, 0) },
      { name: 'gw', t: 'Serving and quarantine', d: 'What the gateway serves sits on the slate pad (gold seal: pinned by digest); the gold cage holds a quarantined version', icon: 'layers', atV: V(0.1, 0.06, -0.55) },
      { name: 'harm', t: 'Harms this week', d: 'Impostor, unreviewed version, drift, a deleted version still serving', icon: 'stop', atV: V(0.8, 0.3, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Namespace by prefix', hint: 'startswith("com.example")', on: () => set({ ...D0, ns: false }), off: reset },
      { label: 'Pin to "latest"', hint: 'whatever is newest', on: () => set({ ...D0, pin: false }), off: reset },
      { label: 'Admit once, never recheck', hint: 'no drift or status checks', on: () => set({ ...D0, drift: false, status: false }), off: reset },
    ];
    function status() {
      if (!st.ns) return { ok: false, msg: '<b>"com.exampleevil/inventory" starts with "com.example", so a prefix check admitted it.</b> Split the name at "/" and compare the namespace exactly with the namespace the registry verified (from domain or account proof), never with a string prefix.' };
      if (!st.pin) return { ok: false, msg: '<b>Pinned to "latest", the gateway pulled in 1.5.0 on Tuesday, and its new export_all tool went live without review.</b> Pin the decision: exact version plus digests of the record, source, tool list and provenance. A new version is a new admission.' };
      if (!st.drift || !st.status) return { ok: false, msg: `<b>${!st.drift ? 'On Wednesday the live tool list changed under the same version, and nobody noticed. ' : ''}${!st.status ? 'On Thursday the registry deleted 1.4.0 for carrying a credential stealer, and it kept serving.' : ''}</b> Admission isn't a one-off. Compare the live server's tools with the pinned digest, resync registry status, and on any change quarantine the pin and restore the route to the last good one.` };
      return { ok: true, msg: '<b>A week of supply-chain trouble, handled.</b> The impostor namespace was refused, 1.5.0 waited for review, the drifted 1.4.0 was quarantined and traffic restored to 1.3.2, and the deletion upstream was picked up by the status sync. Every decision went into the admission ledger.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An index, not an approval', home: true, say: 'A payments platform team in Windhoek admits MCP servers from the public registry. The registry says who published what; admission to production is the team\'s decision.', act: m => m.set({ ns: true, pin: true, drift: true, status: true }) },
    { t: 'Exact namespaces', home: true, say: 'An impostor publishes under com.exampleevil. Compared exactly with the verified namespace, it is refused. Checked by prefix, it gets in.', act: m => m.set({ ns: false }) },
    { t: 'Pin the decision', home: true, say: 'The pin is an exact version plus digests of the record, the package, the tools and the provenance. Pin to latest, and a new version with a risky tool goes live unreviewed.', act: m => m.set({ ns: true, pin: false }) },
    { t: 'Watch for drift', home: true, say: 'Midweek, the live server\'s tools change with no new version. A drift check compares them with the pin, quarantines the server and restores the last good one.', act: m => m.set({ pin: true, drift: true }) },
    { t: 'Status is live', home: true, say: 'Then the registry deletes the version for carrying a credential stealer. Without a status sync, it keeps serving.', act: m => m.set({ drift: false, status: false }) },
    { t: 'Admission never ends', home: true, say: 'Verify, pin, watch, resync and roll back, and keep a ledger of every decision.', act: m => m.set({ drift: true, status: true }) },
  ],
  check: [
    { q: 'Why is startswith("com.example") a bad namespace check?', options: ['It also accepts com.exampleevil', 'It is slow', 'Namespaces are case-sensitive'], answer: 0, why: 'Compare the namespace part exactly.', hint: 'Try Namespace by prefix.' },
    { q: 'What should an admission pin contain?', options: ['An exact version and digests of the record, source, tools and provenance', '"latest"', 'A version range'], answer: 0, why: 'So any change shows which layer moved.', hint: 'Try Pin to "latest".' },
    { q: 'The registry marks an admitted version deleted. What should happen?', options: ['Quarantine it and route to the last good pin', 'Nothing: it was approved', 'Delete the audit log'], answer: 0, why: 'Registry status is live state.', hint: 'Try Admit once, never recheck.' },
  ],
  terms: [
    ['MCP Registry', 'A public index of MCP server records, versions and packages.'],
    ['Verified namespace', 'The name prefix a publisher proved they own, such as com.example.'],
    ['Provenance', 'Evidence tying a record to the exact package or endpoint you fetched.'],
    ['Admission pin', 'The exact version and digests a deployment approved.'],
    ['Drift', 'A live server changing from what was approved, without a new version.'],
    ['Quarantine', 'Taking a server out of service until it is reviewed.'],
  ],
  deeper: '<p><b>Two version numbers.</b> A registry record\'s schema version and the MCP protocol version a server speaks are independent; read each from its own field.</p><p><b>Self-reported identity.</b> The server info a server sends about itself is useful in logs and worthless as proof of who published it.</p><p><b>Remote servers.</b> A record may list only a remote endpoint; verify its URL and transport and observe the live server, instead of rejecting it for having no package.</p><p><b>About this machine.</b> The week\'s events and decisions follow the file header.</p>',
  code: {
    title: 'Admit with an exact namespace and a pin',
    note: 'Adapted from the course\'s MCP registry lesson.',
    text: `
def admit(record, verified_namespace, fetched):
    namespace, _, slug = record["name"].partition("/")
    if not slug or namespace != verified_namespace:          # exact, not startswith
        return refuse("namespace not verified")
    if sha256(fetched.bytes) != record_declared_digest(record, fetched):
        return refuse("package doesn't match the record")
    live = discover_and_list_tools(record)
    return Pin(server=record["name"], version=record["version"],
               record_digest=digest(record), source_digest=sha256(fetched.bytes),
               toolset_digest=digest(sorted(live.tools, key=lambda t: t["name"])),
               status=registry_status(record))

def recheck(pin):
    if registry_status(pin) != "active" or digest(sorted_tools(pin)) != pin.toolset_digest:
        quarantine(pin); restore_route(last_good_pin(pin.server))
`,
  },
};
