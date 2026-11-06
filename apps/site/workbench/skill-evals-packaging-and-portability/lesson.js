// Skill evals: a telco's cloud team in Douala writes a skill: "diagnose why a deployment isn't reaching Available, gather evidence without changing the cluster,
// and write a ranked incident report". Before release it goes through six eval layers and a release gate.
// The skill has three real bugs: its description also catches "scale the deployment to 5 replicas" (a near miss); scripts/collect.sh breaks on namespaces with
// spaces and on a second run; and host B ignores the skill's "people only for writes" flag. One behaviour case passes 3 runs in 5 (a flaky branch).
// Eval depth: "looks good" (structure only) or all six layers. Runs per case: 1 or 5. Hosts tested: A only, or A and B. The gate holds if any layer fails.
const LAYERS = [
  { n: 'Package structure', cases: 8, fail: 0 },
  { n: 'Routing (incl. near misses)', cases: 20, fail: 3, bug: 'catches "scale the deployment"' },
  { n: 'Behaviour and report', cases: 10, fail: 0, flaky: true, bug: 'one case passes 3 runs in 5' },
  { n: 'Scripts', cases: 14, fail: 2, bug: 'collect.sh breaks on spaces and reruns' },
  { n: 'Safety and authority', cases: 6, fail: 0 },
  { n: 'Portability', cases: 10, fail: 0, hostB: 2, bug: 'host B ignores "people only for writes"' },
];
function run(st) {
  const rows = LAYERS.map((L, i) => {
    if (st.depth === 0 && i > 0) return { ...L, ran: false, failed: 0 };
    let failed = L.fail;
    if (L.flaky) failed = st.runs === 1 ? 0 : 1;
    if (L.hostB !== undefined) failed = st.hosts === 2 ? L.hostB : 0;
    return { ...L, ran: true, failed };
  });
  const found = rows.filter(r => r.ran && r.failed && r.bug).map(r => r.bug);
  const allBugs = LAYERS.filter(L => L.bug).map(L => L.bug);
  const shipped = allBugs.filter(b => !found.includes(b));
  return { rows, found, shipped, hold: found.length > 0 };
}

export default {
  slug: 'skill-evals-packaging-and-portability',
  title: 'Skill evals: six layers before release',
  description: 'A Douala cloud team\'s diagnosis skill goes through six eval layers before release. Each layer catches what the others can\'t see.',
  overview: 'A skill that works in one demo can fail in real use: it starts on a nearby task, misses an unfamiliar phrasing, does the work but produces nothing checkable, runs a script that breaks on a space in a name, or behaves differently in another host. Start from a real workflow (an event that triggers it, evidence an expert gathers, decisions, a defined artifact, a safety boundary), not a topic. Then test in layers. Package structure: the entry point, name, paths and files are valid. Routing: positives, negatives and near misses, in the runtime you will ship on. Behaviour: the instructions lead to the required artifact, checked against a contract. Scripts: unit tests for odd inputs, reruns and partial state. Safety: no writes, secrets or network beyond the skill\'s authority. Portability: install the whole folder in each host you support and check discovery, routing, references, scripts and approvals; hosts differ in which fields they honour. Because models vary, run each case several times and report pass rates, not single passes. A release gate holds the skill if any layer fails, and distinguishes passing fixtures from being ready for production.',
  keywords: ['skill evals', 'agent skills', 'LLM evaluation', 'routing evals', 'release gate', 'portability', 'flaky tests'],
  orient: 'landscape',
  view: { target: [-0.1, 0.8, 0], dir: [0.4, 0.55, 1.3], half: 1.4, wide: 4.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { depth: 1, runs: 5, hosts: 2 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* six eval layers as a sieve tower, top to bottom; each tray catches the bug its tests find (a red ball); the rest fall to the release gate and the users' bin */
    const TX = -1.0, TY = i => 1.55 - i * 0.24;
    [[-0.85, -0.6], [0.85, -0.6], [-0.85, 0.6], [0.85, 0.6]].forEach(([dx, dz]) => { const p = P.cyl(0.03, 1.7, '#6B6E7E'); p.position.set(TX + dx, 0, dz); S.add(p); });
    const trays = LAYERS.map((L, i) => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(1.6, 0.05, 1.1, '#fff', { r: 0.03, material: mm }); b.position.set(TX, TY(i), 0); S.add(b); return mm; });
    const gateM = new THREE.MeshLambertMaterial({ color: GOOD }), gate = P.box(1.6, 0.08, 1.1, '#fff', { r: 0.03, material: gateM }); gate.position.set(TX, 0.14, 0); S.add(gate);
    const users = P.box(1.0, 0.12, 0.8, '#F6D9D0', { r: 0.04 }); users.position.set(0.9, 0, 0.3); S.add(users);
    const userBots = [0, 1].map(i => { const r = P.robot('#5B8DB8', { scale: 0.55 }); r.position.set(0.75 + i * 0.35, 0.12, -0.25); S.add(r); return r; });
    const BUG = LAYERS.map((L, i) => L.bug ? i : -1).filter(i => i >= 0);
    const balls = BUG.map(() => { const m = new THREE.MeshLambertMaterial({ color: RED }), b = P.ball(0.1, RED, { material: m }); b.userData.noFit = true; S.add(b); return b; });
    const gotTw = P.tower(0.45, 0.45, GOOD, { size: 0.28 }); gotTw.position.set(1.7, 0, -0.4); S.add(gotTw);
    S.add(P.keep(-1.95, 2.0, 1.75, -0.75, 0.75));

    let R = null, clock = 0;
    function draw() {
      R = run(st); clock = 0;
      R.rows.forEach((r, i) => trays[i].color.set(!r.ran ? '#C9C6BD' : r.failed ? BAD : GOOD));
      gateM.color.set(R.hold ? BAD : GOOD);
      gotTw.userData.set({ h: 0.05 + R.found.length / 4 * 1.1, cap: `${R.found.length}/4`, color: R.found.length === 4 ? GOOD : R.found.length < 2 ? RED : SAF });
    }
    draw();
    const update = dt => {
      gotTw.userData.tick(dt); userBots.forEach(r => r.userData.tick(dt)); clock += dt;
      const u = Math.min(1, (clock % 5) / 3);
      BUG.forEach((li, j) => {
        const caught = R.found.includes(LAYERS[li].bug), stopY = caught ? TY(li) + 0.12 : R.hold ? 0.3 : 0.22, y = 2.0 - (2.0 - stopY) * u;
        const x = TX - 0.5 + j * 0.33, goUsers = !caught && !R.hold && u >= 1;
        balls[j].position.set(goUsers ? 0.65 + j * 0.18 : x, goUsers ? 0.22 : y, goUsers ? 0.45 : 0.2);
      });
      userBots.forEach(r => r.userData.set({ busy: !R.hold && R.shipped.length > 0 && u >= 1 }));
    };
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Eval depth', options: ['Looks good (structure only)', 'All six layers'], get: () => st.depth, act: i => set({ depth: i }) },
      { type: 'buttons', label: 'Runs per case', options: ['1', '5'], get: () => st.runs === 5 ? 1 : 0, act: i => set({ runs: i ? 5 : 1 }) },
      { type: 'buttons', label: 'Hosts tested', options: ['Host A only', 'Hosts A and B'], get: () => st.hosts - 1, act: i => set({ hosts: i + 1 }) },
    ];
    const readouts = [
      { label: 'Bugs found', get: () => ({ v: `${R.found.length} of 4`, sub: 'before release', good: R.found.length === 4, bad: R.found.length < 2 }) },
      { label: 'Bugs shipped', get: () => ({ v: R.hold ? '0' : `${R.shipped.length}`, sub: R.hold ? 'release held' : 'reach users', bad: !R.hold && R.shipped.length > 0, good: R.hold || !R.shipped.length }) },
      { label: 'Gate', get: () => ({ v: R.hold ? 'hold' : 'ship', sub: 'any failing layer holds' }) },
    ];
    const labels = [
      { name: 'layers', t: 'Six eval layers', d: 'Top to bottom: structure, routing, behaviour, scripts, safety, portability. Grey: not run. A red ball resting on a tray is a bug found', icon: 'layers', atV: V(TX - 0.82, 1.0, 0) },
      { name: 'gate', t: 'The release gate', d: 'The bottom tray: coral holds the release. Bugs that get past it land with the users', icon: 'stop', atV: V(TX - 0.82, 0.18, 0.5) },
      { name: 'out', t: 'Bugs found', d: 'Out of the four the skill really has', icon: 'check', atV: V(1.95, 0.3, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: '"It looks good"', hint: 'check structure only', on: () => set({ ...D0, depth: 0 }), off: reset },
      { label: 'One run per case', hint: 'a flaky branch passes by luck', on: () => set({ ...D0, runs: 1 }), off: reset },
      { label: 'Test on one host', hint: 'assume every host is the same', on: () => set({ ...D0, hosts: 1 }), off: reset },
    ];
    function status() {
      if (st.depth === 0) return { ok: false, msg: `<b>The package looked right, so the gate said ship, and all ${R.shipped.length} bugs went to users.</b> Valid structure says nothing about routing, behaviour, scripts, safety or other hosts. Run all six layers.` };
      if (st.runs === 1) return { ok: false, msg: '<b>One run per case: the behaviour case that passes 3 runs in 5 happened to pass. The gate is holding for the other bugs, but once they are fixed this flaky branch ships unnoticed.</b> Models vary run to run. Run each case several times and report pass rates; a case that passes 60% of the time is a failing case.' };
      if (st.hosts === 1) return { ok: false, msg: '<b>Tested on host A only: host B ignores the skill\'s "people only for writes" flag, so there the model may start it on its own. Nothing here will flag it: once the other bugs are fixed, it ships.</b> Hosts honour different fields. Install the whole folder in each host you support and test discovery, routing, scripts and approvals there, or declare which hosts are supported.' };
      return { ok: true, msg: '<b>The gate holds the release: four problems found before any user met them.</b> Near-miss routing tests caught the scaling request, script tests caught spaces and reruns, five runs a case exposed the flaky branch, and testing on host B caught the ignored flag. Fix, re-run, then ship.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A skill that looks fine', home: true, say: 'A telco\'s cloud team in Douala writes a skill that diagnoses stuck deployments without touching the cluster. The package is valid. Ship it?', act: m => m.set({ depth: 0, runs: 5, hosts: 2 }) },
    { t: 'Six layers', home: true, say: 'Test in layers: structure, routing with near misses, behaviour against the report it must produce, the scripts, safety, and every host it will run on.', act: m => m.set({ depth: 1 }) },
    { t: 'Near misses and scripts', home: true, say: 'Routing tests find it also starts on "scale the deployment". Script tests find it breaks on a namespace with a space, and on a second run.', act: m => m.set({ depth: 1 }) },
    { t: 'Run it more than once', home: true, say: 'One behaviour case passes three runs in five. Test it once and you may see a pass. Run each case several times and report the rate.', act: m => m.set({ runs: 1 }) },
    { t: 'More than one host', home: true, say: 'Host B ignores the flag that keeps writes for people only. Test only on host A, and you ship that difference unseen.', act: m => m.set({ runs: 5, hosts: 1 }) },
    { t: 'The gate holds', home: true, say: 'With every layer, repeated runs and both hosts, four problems are found and the release waits. Better here than in an incident.', act: m => m.set({ hosts: 2 }) },
  ],
  check: [
    { q: 'Why test routing with near misses?', options: ['They catch a skill starting on tasks that only share its words', 'They are easier', 'Positives are enough'], answer: 0, why: '"Scale the deployment" isn\'t a diagnosis.', hint: 'Compare eval depths.' },
    { q: 'A case passes 3 runs in 5. Is it passing?', options: ['No: report the rate and treat it as failing', 'Yes', 'Only on Fridays'], answer: 0, why: 'Models vary; one run hides that.', hint: 'Try One run per case.' },
    { q: 'Why test a skill in each host you support?', options: ['Hosts honour different fields and behave differently', 'Hosts are identical', 'For speed'], answer: 0, why: 'Host B ignored the people-only flag.', hint: 'Try Test on one host.' },
  ],
  terms: [
    ['Eval layer', 'One kind of test: structure, routing, behaviour, scripts, safety, portability.'],
    ['Near miss', 'A request that shares words with a skill but shouldn\'t start it.'],
    ['Artifact contract', 'The checkable shape of what a skill must produce.'],
    ['Pass rate', 'How often a case passes over repeated runs.'],
    ['Portability matrix', 'Which hosts honour which skill fields and behaviours.'],
    ['Release gate', 'A rule that holds a release if any required test fails.'],
  ],
  deeper: '<p><b>Find the skill in a workflow.</b> Interview the expert: what starts it, what similar requests shouldn\'t, what evidence comes first, which steps can be scripts, what needs approval, and what artifact proves it\'s done.</p><p><b>Fixtures versus production.</b> Passing local fixtures shows the package is internally sound; production readiness also needs real-host checks, upgrades and uninstall tested, and owners named.</p><p><b>Scale isn\'t quality.</b> Thousands of generated test prompts that look alike prove little; a few dozen well-chosen positives, negatives and near misses prove more.</p><p><b>About this machine.</b> The layers, cases and bugs are set in the file header; the gate holds on any failure.</p>',
  code: {
    title: 'A release gate over repeated runs',
    note: 'Adapted from the course\'s skill evals lesson.',
    text: `
def gate(suite, hosts=("A", "B"), runs=5, min_rate=1.0):
    failures = []
    for host in hosts:
        install_whole_folder(host, "diagnose-deployment/")
        for case in suite:                    # structure, routing, behaviour, scripts, safety
            passed = sum(case.run(host) for _ in range(runs))
            if passed / runs < min_rate:
                failures.append((host, case.layer, case.name, f"{passed}/{runs}"))
    return ("hold", failures) if failures else ("ship", [])
`,
  },
};
