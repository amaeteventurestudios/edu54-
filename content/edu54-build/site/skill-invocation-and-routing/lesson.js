// Skill routing: a software team's agent in Luanda has four skills. release-readiness and build-fixer and incident-review may be picked by the model;
// incident-triage is human-only (a person must name it), because a wrong triage pages the whole on-call rota.
// Twelve test requests: clear positives, clear negatives and near misses that share words with a skill but belong elsewhere.
// Each request has a relevance score per skill (0 to 1). release-readiness has a bounded description ("…whether a version is ready to publish; not ordinary builds")
// or an over-broad one ("release, version, package, build, deploy, tag…"), which raises its score on near misses.
// Routing: filter to eligible skills, then rank (or rank everything and check policy on the winner only); pick the best if it clears 0.5, else abstain (or always pick).
const SK = ['release-readiness', 'build-fixer', 'incident-triage', 'incident-review'];
const MODEL_OK = [true, true, false, true];
const REQ = [
  ['Is v2.4.0 ready to publish?', 0, [0.9, 0.2, 0.05, 0.05], 0.9],
  ['Can we ship the 3.1 Docker image?', 0, [0.8, 0.25, 0.05, 0.05], 0.85],
  ['Is the Android build ready for the Play Store?', 0, [0.75, 0.35, 0.05, 0.05], 0.8],
  ['The CI build fails on the package step', 1, [0.3, 0.7, 0.1, 0.05], 0.75],
  ['Bump the package version in pom.xml', -1, [0.25, 0.3, 0.05, 0.05], 0.7],
  ['Fix the failing npm build', 1, [0.2, 0.8, 0.05, 0.05], 0.65],
  ['Payments are down since 09:10. What happened?', 3, [0.05, 0.1, 0.85, 0.6], 0.05],
  ['Write the post-incident review for Tuesday\'s outage', 3, [0.05, 0.05, 0.4, 0.9], 0.05],
  ['Summarise last week\'s incident', 3, [0.05, 0.05, 0.5, 0.7], 0.05],
  ['What\'s the weather in Luanda?', -1, [0.05, 0.05, 0.05, 0.05], 0.1],
  ['Thanks, that\'s all for today', -1, [0.1, 0.05, 0.05, 0.1], 0.15],
  ['Tag the release on GitHub', -1, [0.45, 0.2, 0.05, 0.05], 0.8],
];
function run(st) {
  return REQ.map(([q, want, sc0, broad]) => {
    const sc = sc0.slice(); if (!st.bounded) sc[0] = broad;
    let pool = SK.map((_, i) => i);
    if (st.eligFirst) pool = pool.filter(i => MODEL_OK[i]);
    let best = pool.reduce((a, i) => sc[i] > sc[a] ? i : a, pool[0]);
    let pick = best, note = '';
    if (!st.eligFirst && !MODEL_OK[best]) { pick = -1; note = `top match ${SK[best]} is human-only, so nothing was chosen`; }
    else if (st.abstain && sc[best] < 0.5) { pick = -1; note = 'no eligible skill clears 0.5: abstain'; }
    const right = pick === want;
    return { q, want, sc, pick, right, note, fp: pick >= 0 && pick !== want, miss: pick === -1 && want >= 0 };
  });
}

export default {
  slug: 'skill-invocation-and-routing',
  title: 'Skill routing: eligible first, then best, or none',
  description: 'A Luanda software team\'s agent picks among four skills for twelve test requests: filter to the eligible, rank, and abstain when nothing fits.',
  overview: 'A skill can start in several ways: a person names it ("/release-readiness v2.4.0"), the model picks it from the catalog because its description matches, an application calls it, or another skill hands over to it. Hosts let you choose who may start each skill: anyone, people only (for skills whose mistakes are costly), or the model only. Naming a skill explicitly still goes through policy. For implicit selection, routing is classification with the option to abstain. The order matters: first filter to the skills this actor may start, then rank only those, then pick the best if it clears a threshold and isn\'t too close to a rival, otherwise pick none. Ranking everything and checking policy on the winner lets a blocked favourite hide an eligible runner-up. The description is the routing interface: it should state what the skill does, what it produces, when to use it and when not to; a description that lists every related word grabs requests that only share vocabulary. Test routing with clear positives, clear negatives and especially near misses ("the CI build fails on the package step" shares words with release checks but belongs to build fixing), and record each stage (eligible, selected, activated, executing, completed) so a failure can be located.',
  keywords: ['skill routing', 'agent skills', 'intent classification', 'abstain', 'near-miss evals', 'skill invocation', 'model invocation policy'],
  orient: 'landscape',
  view: { target: [-0.1, 0.35, -0.1], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { eligFirst: true, abstain: true, bounded: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* score bars: twelve requests front to back, four skills left to right; a bar's height is how well the request matches that skill */
    const X0 = -1.3, DX = 0.5, Z0 = -0.95, DZ = 0.19, H = 0.7, SC4 = ['#1F9E89', '#5B8DB8', '#C9A227', '#7A5CC4'];
    const pad = P.box(2.3, 0.02, 2.45, '#FFFFFF', { r: 0.03 }); pad.position.set(X0 + 1.5 * DX, 0, 0.1); S.add(pad);
    SK.forEach((_, i) => { const b = P.box(0.36, 0.08, 0.2, SC4[i], { r: 0.03 }); b.position.set(X0 + i * DX, 0, Z0 - 0.3); S.add(b); });
    const lock = P.box(0.46, 0.3, 0.06, SAF, { r: 0.02 }); lock.position.set(X0 + 2 * DX, 0, Z0 - 0.45); S.add(lock);
    const qtiles = REQ.map((r, i) => { const b = P.box(0.3, 0.06, 0.14, r[1] < 0 ? '#B9B5AA' : SC4[r[1]], { r: 0.02 }); b.position.set(X0 - 0.55, 0, Z0 + i * DZ); S.add(b); return b; });
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), REQ.length * 4); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const thr = new THREE.Mesh(new THREE.BoxGeometry(4 * DX, 0.004, REQ.length * DZ), new THREE.MeshBasicMaterial({ color: SAF, transparent: true, opacity: 0.3, depthWrite: false }));
    thr.position.set(X0 + 1.5 * DX, 0.02 + 0.5 * H, Z0 + (REQ.length - 1) * DZ / 2); thr.userData.noFit = true; S.add(thr);
    const lamps = REQ.map((r, i) => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.14, 0.14, 0.14, '#fff', { r: 0.07, material: mm }); b.position.set(X0 + 4 * DX - 0.05, 0, Z0 + i * DZ); S.add(b); return mm; });
    const okTw = P.tower(0.5, 0.5, GOOD, { size: 0.28 }); okTw.position.set(1.2, 0, 0.75); S.add(okTw);
    S.add(P.keep(-2.05, 1.6, 1.45, -1.45, 1.15));

    let R = null;
    function draw() {
      R = run(st);
      let k = 0;
      R.forEach((r, i) => {
        r.sc.forEach((v, j) => { const chosen = r.pick === j, elig = MODEL_OK[j]; dummy.position.set(X0 + j * DX, 0.02, Z0 + i * DZ); dummy.scale.set(0.3, Math.max(0.003, v * H), 0.13); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(chosen ? (r.right ? GOOD : BAD) : elig ? '#B9B4A8' : '#E6D9B3')); k++; });
        lamps[i].color.set(r.right ? GOOD : RED);
      });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      thr.visible = !!st.abstain;
      const n = R.filter(r => r.right).length;
      okTw.userData.set({ h: 0.05 + n / 12 * 1.1, cap: `${n}/12`, color: n >= 11 ? GOOD : n < 9 ? RED : SAF });
    }
    draw();
    const update = dt => okTw.userData.tick(dt);
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Filter to eligible skills before ranking', short: 'Eligible first', get: () => st.eligFirst, set: v => set({ eligFirst: !!v }) },
      { type: 'toggle', label: 'Abstain below 0.5', short: 'Abstain', get: () => st.abstain, set: v => set({ abstain: !!v }) },
      { type: 'toggle', label: 'Bounded release description', short: 'Bounded', get: () => st.bounded, set: v => set({ bounded: !!v }) },
    ];
    const readouts = [
      { label: 'Routed right', get: () => { const n = R.filter(r => r.right).length; return { v: `${n} of 12`, sub: 'test requests', good: n >= 11, bad: n < 9 }; } },
      { label: 'Wrong skill started', get: () => { const n = R.filter(r => r.fp).length; return { v: `${n}`, sub: 'false activations', bad: n > 0, good: !n }; } },
      { label: 'Right skill missed', get: () => { const n = R.filter(r => r.miss).length; return { v: `${n}`, sub: 'should have run', bad: n > 0 }; } },
    ];
    const labels = [
      { name: 'reqs', t: 'Twelve test requests', d: 'A row each, coloured by the skill it should get (grey: none). Bars: match score per skill; the chosen bar is green or coral; the gold plane is the abstain line', icon: 'check', atV: V(X0 - 0.72, 0.05, 0.1) },
      { name: 'skills', t: 'Four skills', d: 'Release, build fixer, incident triage (people only, behind the gold plate), incident review', icon: 'layers', atV: V(X0 + 2 * DX + 0.25, 0.3, Z0 - 0.45) },
      { name: 'score', t: 'Routed right', d: 'A lamp per request; the tower counts the green ones', icon: 'target', atV: V(1.45, 0.3, 0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rank first, check policy after', hint: 'a blocked favourite hides the runner-up', on: () => set({ ...D0, eligFirst: false }), off: reset },
      { label: 'Always pick something', hint: 'no abstain line', on: () => set({ ...D0, abstain: false }), off: reset },
      { label: 'An over-broad description', hint: '"release, version, package, build, tag…"', on: () => set({ ...D0, bounded: false }), off: reset },
    ];
    function status() {
      const n = R.filter(r => r.right).length;
      if (!st.eligFirst) return { ok: false, msg: `<b>Ranked first: "Payments are down since 09:10" scored highest for incident-triage, which only people may start, so nothing ran.</b> incident-review was allowed and relevant, but the router never looked past the blocked winner. Filter to eligible skills first, then rank only those. ${n} of 12 right.` };
      if (!st.abstain) return { ok: false, msg: `<b>Always picking: "What's the weather in Luanda?" and "Thanks, that's all" started skills.</b> ${R.filter(r => r.fp).length} requests got a skill they didn't need. Routing is classification with a "none" answer: when no eligible skill clears the line, abstain. ${n} of 12 right.` };
      if (!st.bounded) return { ok: false, msg: `<b>An over-broad description claimed every nearby word, and release-readiness started on ${R.filter(r => r.fp && r.pick === 0).length} near misses: a failing CI build, a version bump, tagging a release.</b> Say what the skill does, what it produces, when to use it and when not to. Near-miss tests catch this; obvious positives and negatives don't. ${n} of 12 right.` };
      return { ok: true, msg: `<b>${n} of 12 test requests routed right, no wrong skill started.</b> Only allowed skills were ranked, so the incident question went to incident-review; requests that fit nothing were left alone; and the bounded description kept release checks away from build failures and tagging.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four skills, twelve tests', home: true, say: 'A software team\'s agent in Luanda has four skills. One, incident triage, only a person may start. Twelve test requests check the routing, including near misses that share words with a skill.', act: m => m.set({ eligFirst: true, abstain: true, bounded: true }) },
    { t: 'Eligible first', home: true, say: 'The router first drops skills this actor may not start, then ranks the rest. An outage question goes to incident review, which is allowed.', act: m => m.set({ eligFirst: true }) },
    { t: 'Rank first, and it breaks', home: true, say: 'Rank everything first, and the blocked triage skill wins, then is refused. Nothing runs, though incident review was right there.', act: m => m.set({ eligFirst: false }) },
    { t: 'None is an answer', home: true, say: 'A question about the weather fits no skill. Below the line, the router abstains. Always picking something starts skills nobody needed.', act: m => m.set({ eligFirst: true, abstain: false }) },
    { t: 'Descriptions draw the border', home: true, say: 'Give the release skill a description listing every nearby word, and it grabs failing builds and version bumps.', act: m => m.set({ abstain: true, bounded: false }) },
    { t: 'Test the near misses', home: true, say: 'A bounded description says when, and when not. Near-miss tests are what prove the border holds.', act: m => m.set({ bounded: true }) },
  ],
  check: [
    { q: 'Why filter to eligible skills before ranking?', options: ['A blocked top match would otherwise hide an allowed runner-up', 'It is faster', 'Policy needs scores'], answer: 0, why: 'Eligibility defines the set; relevance ranks it.', hint: 'Try Rank first, check policy after.' },
    { q: 'Why should a router be able to choose no skill?', options: ['Many requests fit none, and a wrong skill is worse than none', 'To save tokens', 'Skills are slow'], answer: 0, why: 'Abstain below the threshold.', hint: 'Try Always pick something.' },
    { q: 'What test cases expose a description that is too broad?', options: ['Near misses that share words but belong elsewhere', 'Clear positives', 'Unrelated questions'], answer: 0, why: '"The CI build fails on the package step" isn\'t a release check.', hint: 'Try An over-broad description.' },
  ],
  terms: [
    ['Explicit invocation', 'A person naming a skill directly.'],
    ['Implicit invocation', 'The model picking a skill because its description matches.'],
    ['Eligibility', 'Whether this actor may start this skill at all.'],
    ['Abstain', 'Choosing no skill when none fits well enough.'],
    ['Near miss', 'A request that shares words with a skill but belongs elsewhere.'],
    ['Invocation stages', 'Eligible, selected, activated, executing, completed.'],
  ],
  deeper: '<p><b>Who may start what.</b> Hosts express it differently: one marks a skill as not for model invocation, another as not user-invocable; neither means disabled. Treat it as policy: people only for costly mistakes, model only for internal helpers, both by default.</p><p><b>Arguments.</b> What the user typed, what the host passes and what the skill reads can differ; validate at the boundary, as for any tool input.</p><p><b>Skills calling skills.</b> A hand-over between skills is an edge like a tool call: it goes through the same eligibility and is traced.</p><p><b>About this machine.</b> The relevance scores are set in the file header; real routers often use the model itself to judge, but the order of filtering, ranking and abstaining is the same.</p>',
  code: {
    title: 'Eligible, then rank, then abstain',
    note: 'Adapted from the course\'s skill invocation and routing lesson.',
    text: `
def route(request, skills, actor, score, threshold=0.5, margin=0.05):
    eligible = [s for s in skills if s.allows(actor)]          # policy first
    if not eligible:
        return None
    ranked = sorted(eligible, key=lambda s: score(s, request), reverse=True)
    best = ranked[0]
    top = score(best, request)
    if top < threshold:
        return None                                            # abstain
    if len(ranked) > 1 and top - score(ranked[1], request) < margin:
        return None                                            # too close to call: ask
    return best
`,
  },
};
