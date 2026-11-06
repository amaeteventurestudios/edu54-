// Delegate with isolation (lesson 45): a Dakar produce market's app adds pickup windows, split across three agent workers (api, web, docs) and an
// integrator. Each work unit owns exclusive paths; an overlap check blocks the plan before anyone starts. A shared contract settles the interface
// first; the integrator reads proof, checks every changed file against its unit's contract and merges in order. Wall time comes from the waves.
const DUR = { contract: 10, api: 40, web: 35, docs: 15, review: 10, gate: 8 };
function units(o) {
  return [
    { id: 'api', paths: ['app/api/', 'tests/api/'], changed: ['app/api/pickup.py', 'app/api/serializers.py', 'tests/api/test_pickup.py'], proof: '6 passed', field: 'pickup_window' },
    { id: 'web', paths: ['web/'], changed: ['web/checkout.tsx', 'app/api/serializers.py'], proof: '4 passed', field: o.contract ? 'pickup_window' : 'pickup_slot' },
    { id: 'docs', paths: [o.overlap ? 'app/' : 'docs/'], changed: ['docs/pickup.md'], proof: 'docs check ok' },
  ];
}
const overlaps = (a, b) => a.startsWith(b) || b.startsWith(a);
function plan(o) {
  const U = units(o), conflicts = [];
  for (let i = 0; i < U.length; i++) for (let j = i + 1; j < U.length; j++) U[i].paths.forEach(p => U[j].paths.forEach(q => { if (overlaps(p, q)) conflicts.push(`${U[i].id} and ${U[j].id} overlap at ${p} / ${q}`); }));
  const stray = U.flatMap(u => u.changed.filter(f => !u.paths.some(p => f.startsWith(p))).map(f => ({ unit: u.id, file: f })));
  const rejected = o.scopeCheck ? stray : [];
  const gateFail = conflicts.length ? null : !o.contract ? 'web reads pickup_slot; api sends pickup_window' : !o.scopeCheck ? 'web\'s copy of app/api/serializers.py overwrote api\'s: pickup_window is missing from the response' : '';
  const wall = o.parallel ? DUR.contract + Math.max(DUR.api, DUR.web, DUR.docs) + DUR.review + DUR.gate : Object.values(DUR).reduce((a, b) => a + b, 0);
  return { U, conflicts, stray, rejected, gateFail, wall, waves: o.parallel ? 4 : 6 };
}

export default {
  slug: 'delegate-with-isolation',
  title: 'Delegate with isolation: own the paths, share the contract',
  description: 'A Dakar produce market\'s app adds pickup windows, split across three agent workers and an integrator. Give each its own paths and a shared contract.',
  overview: 'Parallel agents save time only when the work is truly independent; otherwise one clear task becomes a coordination problem that fails faster. Delegate when two investigations answer different unknowns, two implementations own disjoint files and contracts, a reviewer can read finished work without changing it, or a slow check can run while local work continues. Keep work serial when workers would need the same files, the same open decision or the same mutable environment. Each work unit is a contract: one observable goal, one owner, exclusive write paths, the units it waits for, the proof it returns, and a handoff of files changed, decisions made and remaining risk. "Handle the backend" is not a work unit. Isolation has three layers: separate worktrees stop accidental shared edits, ownership stops deliberate ones, and separate logs stop one worker overwriting another\'s evidence. Worktrees alone don\'t solve ownership: two clean worktrees can still produce conflicting designs, so settle shared interfaces before the work splits. The integrator does not rebuild the work: it confirms each handoff matches its scope, reads the proof output rather than the summary, merges in dependency order, runs the full gate, rejects hidden scope expansion and records conflicts as new decisions. If integration means rewriting most of a worker\'s result, the split was wrong.',
  keywords: ['delegation', 'parallel agents', 'worktrees', 'merge contract', 'multi-agent', 'AI agents', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.9, 1.1], half: 1.3, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { overlap: false, contract: true, scopeCheck: true, parallel: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F';
    const UCOL = ['#5B8DB8', '#3E9B9B', '#8E6BB8'];
    /* the shared contract: a tablet settled before the split (red when each worker names the field itself) */
    const tabM = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), tab = P.box(0.5, 0.6, 0.12, '#fff', { r: 0.04, material: tabM }); tab.position.set(-2.45, 0, 0); S.add(tab);
    /* three workers, each in its own plot (the paths it owns), with a parcel per file it changed. A file outside its plot lands in another's (red;
       gold once the integrator rejects it). If two plots overlap, a red bar joins them and the plan is blocked */
    const LZ = [-0.65, 0, 0.65], PX = -0.75;
    const plots = LZ.map((z, i) => { const b = P.box(1.9, 0.04, 0.5, UCOL[i], { r: 0.03 }); b.position.set(PX, 0, z); S.add(b); const r = P.robot(CHAR, { scale: 0.5 }); r.position.set(PX - 0.7, 0.04, z); r.userData.set({ busy: true }); S.add(r); return r; });
    const parcels = []; const mk = () => { const m = new THREE.MeshLambertMaterial({ color: '#F4F1EA' }), b = P.box(0.18, 0.16, 0.18, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); parcels.push({ b, m }); return parcels[parcels.length - 1]; };
    for (let i = 0; i < 7; i++) mk();
    const over = P.box(0.12, 0.06, 1.4, RED, { r: 0.02 }); over.position.set(PX + 0.85, 0.02, 0); S.add(over);
    /* the integrator, the gate it merges through, and wall time as a column */
    const integ = P.robot(CHAR, { scale: 0.7 }); integ.position.set(1.1, 0, 0); S.add(integ);
    const gate = P.gate(0.7, CHAR, { h: 0.5 }); gate.position.set(1.85, 0, 0); gate.rotation.y = Math.PI / 2; S.add(gate);
    const lamp = P.lamp(GOOD, { h: 0.5, r: 0.1 }); lamp.position.set(1.85, 0, -0.55); S.add(lamp);
    const wall = P.tower(0.4, 0.4, '#5B8DB8', { h: 0.5 }); wall.userData.set({ cap: '' }); wall.position.set(2.55, 0, 0); S.add(wall);
    S.add(P.keep(-2.8, 2.8, 1.3, -0.95, 0.95));

    let R = null;
    function draw() {
      R = plan(st);
      const blocked = R.conflicts.length > 0;
      tabM.color.set(st.contract ? '#5B8DB8' : RED);
      let k = 0;
      R.U.forEach((u, i) => u.changed.forEach((f, j) => {
        const P_ = parcels[k++]; if (!P_) return; const own = u.paths.some(p => f.startsWith(p));
        const tgt = own ? i : R.U.findIndex(v => v.paths.some(p => f.startsWith(p)));
        P_.b.visible = true; P_.b.position.set(PX - 0.25 + j * 0.25 + (own ? 0 : 0.5), 0.04, LZ[Math.max(0, tgt)]);
        P_.m.color.set(own ? '#F4F1EA' : st.scopeCheck ? AMB : RED);
      }));
      for (; k < parcels.length; k++) parcels[k].b.visible = false;
      over.visible = blocked;
      gate.userData.set({ open: !blocked && !R.gateFail });
      lamp.userData.set({ color: blocked ? '#B9B3A6' : R.gateFail ? RED : GOOD, on: !blocked });
      integ.userData.set({ busy: !blocked, lamp: !st.scopeCheck ? RED : GOOD });
      wall.userData.set({ h: R.wall / 120 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Run the three workers in parallel', short: 'Parallel', get: () => st.parallel, set: v => set({ parallel: !!v }) },
      { type: 'toggle', label: 'Settle the interface in a shared contract first', short: 'Contract', get: () => st.contract, set: v => set({ contract: !!v }) },
      { type: 'toggle', label: 'Check every changed file against its unit\'s paths', short: 'Check files', get: () => st.scopeCheck, set: v => set({ scopeCheck: !!v }) },
    ];
    const readouts = [
      { label: 'Plan', get: () => ({ v: R.conflicts.length ? 'blocked' : 'ready', sub: R.conflicts.length ? 'paths overlap' : 'paths are disjoint', good: !R.conflicts.length, bad: !!R.conflicts.length }) },
      { label: 'Gate', get: () => ({ v: R.gateFail === null ? 'not run' : R.gateFail ? 'fails' : 'passes', sub: R.gateFail === null ? 'nothing merged' : R.gateFail ? 'after the merge' : 'after the merge', good: R.gateFail === '', bad: !!R.gateFail }) },
      { label: 'Wall time', get: () => ({ v: R.conflicts.length ? '—' : `${R.wall} min`, sub: st.parallel ? '4 waves' : 'one at a time', good: st.parallel && !R.conflicts.length }) },
    ];
    const labels = [
      { name: 'con', t: 'Shared contract', d: 'Settled before the split', icon: 'book', atV: V(-2.7, 0.2, 0.06) },
      { name: 'plots', t: 'Three workers, own paths', d: 'A parcel per file. Gold: rejected', icon: 'box', atV: V(PX - 0.95, 0.2, 0.06) },
      { name: 'gate', t: 'Integrator and gate', d: 'Reads proof, checks files', icon: 'check', atV: V(1.85, 0.2, 0.36) },
      { name: 'wall', t: 'Wall time', d: 'Parallel waves vs one at a time', icon: 'reset', atV: V(2.75, 0.2, 0.36) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the docs worker own app/', hint: 'overlapping paths', on: () => set({ ...D0, overlap: true }), off: reset },
      { label: 'Split before the interface is settled', hint: 'no shared contract', on: () => set({ ...D0, contract: false }), off: reset },
      { label: 'Merge without checking the files', hint: 'scope creep merges', on: () => set({ ...D0, scopeCheck: false }), off: reset },
    ];
    function status() {
      if (R.conflicts.length) return { ok: false, msg: `<b>${R.conflicts[0]}: two workers could write the same files.</b> Separate worktrees won\'t save this; ownership must be exclusive. The plan is blocked before any worker starts, which is the cheapest moment to catch it.` };
      if (!st.contract) return { ok: false, msg: `<b>Every worker finished and every proof passed, and the gate fails: ${R.gateFail}.</b> Isolation hid a shared decision. Settle the interface in a contract before the work splits, so both sides build against one name.` };
      if (!st.scopeCheck) return { ok: false, msg: `<b>The web worker also edited app/api/serializers.py, outside its paths; merged unchecked, ${R.gateFail.split(': ')[1]}.</b> Read each handoff against its contract and reject hidden scope expansion; record the conflict as a new decision, not a silent edit.` };
      if (!st.parallel) return { ok: true, msg: `<b>Safe but serial: ${R.wall} minutes, one worker at a time.</b> These three own disjoint paths and share one contract, so they can run together and the work takes ${DUR.contract + Math.max(DUR.api, DUR.web, DUR.docs) + DUR.review + DUR.gate} minutes.` };
      return { ok: true, msg: `<b>Three workers own disjoint paths and build against one contract; the integrator rejects the web worker\'s stray edit to app/api/serializers.py and records it as a decision; the gate passes: ${R.wall} minutes instead of ${Object.values(DUR).reduce((a, b) => a + b, 0)}.</b>` };
    }
    return { update: dt => { plots.forEach(r => r.userData.tick(dt)); integ.userData.tick(dt); gate.userData.tick(dt); wall.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three workers', home: true, say: 'A produce market in Dakar adds pickup windows to its app. The work splits across three agent workers, for the API, the web checkout and the docs.', act: m => m.set({ overlap: false, contract: true, scopeCheck: true, parallel: false }) },
    { t: 'Is it independent?', home: true, say: 'Parallel only pays when the work is independent. Here the workers own different folders, so they can run together.', act: m => m.set({ overlap: false, contract: true, scopeCheck: true, parallel: true }) },
    { t: 'Exclusive paths', home: true, say: 'If the docs worker owned the whole app folder, two workers could write the same files. The plan is blocked before anyone starts.', act: m => m.set({ overlap: true, contract: true, scopeCheck: true, parallel: true }) },
    { t: 'A shared decision', home: true, say: 'Split before the field name is settled, and each side picks its own. Both proofs pass; the gate fails.', act: m => m.set({ overlap: false, contract: false, scopeCheck: true, parallel: true }) },
    { t: 'The integrator checks', home: true, say: 'The web worker also touched an API file. The integrator checks every changed file against the contract and rejects the stray edit.', act: m => m.set({ overlap: false, contract: true, scopeCheck: true, parallel: true }) },
    { t: 'Faster, and safe', home: true, say: 'Disjoint paths, one contract, proof read and files checked. The gate passes, in a little over half the time.', act: m => m.set({ overlap: false, contract: true, scopeCheck: true, parallel: true }) },
  ],
  check: [
    { q: 'Two workers in separate worktrees pick different names for the same field. What was missing?', options: ['A shared contract settled before the split', 'More worktrees', 'A faster gate'], answer: 0, why: 'Worktrees isolate files, not decisions.', hint: 'Try Split before the interface is settled.' },
    { q: 'The docs worker owns app/ and the API worker owns app/api/. What happens?', options: ['The plan is blocked: the paths overlap', 'Both run fine', 'The docs worker wins'], answer: 0, why: 'Ownership must be exclusive.', hint: 'Try Let the docs worker own app/.' },
    { q: 'What should the integrator do with a worker\'s edit outside its paths?', options: ['Reject it and record it as a decision', 'Merge it quietly', 'Rewrite the worker\'s whole result'], answer: 0, why: 'Hidden scope expansion is rejected.', hint: 'Read the integrator tile.' },
  ],
  terms: [
    ['Work unit', 'Goal, owner, exclusive paths, dependencies, proof and handoff.'],
    ['Exclusive ownership', 'Only one worker may write a path.'],
    ['Worktree', 'A separate checkout, so workers don\'t edit each other\'s files by accident.'],
    ['Merge contract', 'The rules for combining work: interfaces settled, proof read, files checked.'],
    ['Integrator', 'The role that merges in order and runs the full gate.'],
    ['Scope creep', 'An edit outside a unit\'s paths.'],
  ],
  deeper: '<p><b>Calibrated autonomy.</b> Grant workers freedom where evidence and rollback are strong; keep a person at choices that change public behaviour, risk, authority or irreversible cost.</p><p><b>An older idea.</b> Handing tasks to workers by contract and collecting their results goes back to the Contract Net Protocol of 1980.</p><p><b>About this machine.</b> The units, durations and the stray edit are fixed; the overlap check, file check, gate and wall time are computed live.</p>',
  code: {
    title: 'Overlap and scope checks',
    note: 'Adapted from the course\'s delegation planner (code/main.py).',
    text: `
from pathlib import PurePosixPath

def paths_overlap(a, b):
    a, b = PurePosixPath(a), PurePosixPath(b)
    return a == b or a in b.parents or b in a.parents

def conflicts(units):
    found = []
    for i, left in enumerate(units):
        for right in units[i + 1:]:
            for p in left.paths:
                for q in right.paths:
                    if paths_overlap(p, q):
                        found.append(f"{left.id} and {right.id} overlap at {p} / {q}")
    return found

def stray_edits(unit, changed):        # the integrator's file check
    return [f for f in changed if not any(paths_overlap(f, p) for p in unit.paths)]
`,
  },
};
