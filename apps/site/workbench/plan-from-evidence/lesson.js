// Plan from evidence (lesson 44): a Kampala school-fees app adds part-payments. The plan is a dependency graph of work items, each with a change,
// repository evidence, dependencies and a proof. Validation runs live (no evidence, no proof, unknown dependency, cycle) and a topological sort
// lays the items out in waves, so the board shows what can run together. One check needs judgment: no irreversible step before the contract.
const BASE = [
  { id: 'contract', change: 'Define the part-payment response', ev: ['schema.py:12'], deps: [], proof: 'test_schema' },
  { id: 'migrate', change: 'Add a balance column', ev: ['0007_balance'], deps: ['contract'], proof: 'dry run', irreversible: true },
  { id: 'impl', change: 'Record part-payments on the term balance', ev: ['service.py:54', 'money.py:9 split_installments'], deps: ['contract', 'migrate'], proof: 'test_fees' },
  { id: 'docs', change: 'Document the balance field', ev: ['fees.md:30'], deps: ['contract'], proof: 'docs check' },
  { id: 'sms', change: 'Receipt SMS shows the balance left', ev: ['sms.py:22'], deps: ['contract'], proof: 'test_sms' },
  { id: 'gate', change: 'Integration gate', ev: ['Makefile'], deps: ['impl', 'docs', 'sms'], proof: 'make verify' },
];
function items(o) {
  let L = BASE.map(x => ({ ...x, ev: [...x.ev], deps: [...x.deps] }));
  const get = id => L.find(x => x.id === id);
  if (!o.evidence) {
    L.forEach(x => { x.ev = []; });
    L.splice(2, 0, { id: 'alloc', change: 'Write a new allocation module', ev: [], deps: ['contract'], proof: 'test_alloc' });
    get('impl').deps.push('alloc');
  }
  if (o.cycle) { get('docs').deps = ['impl']; get('impl').deps = ['docs', 'migrate']; get('contract').deps = []; }
  if (o.migrateEarly) get('migrate').deps = [];
  if (!o.graph) L.forEach((x, i) => { x.deps = i ? [L[i - 1].id] : []; });
  return L;
}
function waves(L) {
  const rem = new Map(L.map(x => [x.id, new Set(x.deps)])), done = new Set(), W = [];
  while (rem.size) {
    const ready = [...rem.keys()].filter(id => [...rem.get(id)].every(d => done.has(d)));
    if (!ready.length) return { W, stuck: [...rem.keys()] };
    W.push(ready); ready.forEach(id => { done.add(id); rem.delete(id); });
  }
  return { W, stuck: [] };
}
function ancestors(L, id, seen = new Set()) { const x = L.find(y => y.id === id); (x ? x.deps : []).forEach(d => { if (!seen.has(d)) { seen.add(d); ancestors(L, d, seen); } }); return seen; }
function validate(L) {
  const issues = [], known = new Set(L.map(x => x.id));
  if (known.size !== L.length) issues.push('duplicate ids');
  L.forEach(x => { if (!x.ev.length) issues.push(`${x.id} has no evidence`); if (!x.proof) issues.push(`${x.id} has no proof`); x.deps.filter(d => !known.has(d)).forEach(d => issues.push(`${x.id} depends on unknown ${d}`)); });
  const w = waves(L);
  if (w.stuck.length) issues.push(`cycle among ${w.stuck.join(', ')}`);
  const judge = L.filter(x => x.irreversible && !ancestors(L, x.id).has('contract')).map(x => `${x.id} is irreversible and runs before the contract is settled`);
  return { issues, judge, ...w };
}

export default {
  slug: 'plan-from-evidence',
  title: 'Plan from evidence: a graph, not a to-do list',
  description: 'A Kampala school-fees app adds part-payments. Plan the work as a graph backed by evidence, sort it into waves, and check it before anyone edits.',
  overview: 'A weak plan repeats the request in the future tense: update the API, add tests, update the docs. Nothing says what was found, why those files, which contract changes first or what can run at the same time, and an agent can follow every step and still make rework. A strong plan is a dependency graph. Each work item makes five commitments: an identifier, the smallest change, the repository evidence that justifies it, the items that must be true first, and the exact check that closes it. Plan the contract before its implementations: when the code, the docs and the receipt SMS all depend on one behaviour, fix the behaviour first so they share one version instead of inventing three. A topological sort then turns the graph into waves: the contract alone, then the migration, the docs and the SMS together, then the implementation, then the integration gate. Evidence must be able to change the plan: here an existing split_installments helper removes a planned allocation module. Reject the plan before execution when an id repeats, an item has no evidence or no proof, a dependency names an unknown item, or the graph has a cycle (usually a hidden disagreement about which side is the source of truth). One more check needs judgment: an irreversible step, like a migration, must wait for the uncertainty it depends on. Keep the plan as data beside the work, so an interrupted session can tell what is done, what was proved and what is unblocked.',
  keywords: ['planning', 'dependency graph', 'topological sort', 'coding agents', 'AI agents', 'software engineering', 'work breakdown'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.2, 0.1], dir: [0.05, 1.1, 1.0], half: 1.4, wide: 6.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { evidence: true, graph: true, cycle: false, migrateEarly: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', AMB = '#E3A72F';
    /* the plan as a graph: a block per work item (blue; gold if one-way, like a migration; red with no evidence, or stuck in a cycle), a white receipt
       on top for its repository evidence, arrows for dependencies. Items stand on wave plates: everything on one plate can run together */
    const NW = 0.5, ND = 0.4;
    const nodes = Array.from({ length: 7 }, () => {
      const mm = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(NW, 0.3, ND, '#fff', { r: 0.05, material: mm }); b.userData.noFit = true; S.add(b);
      const rc = P.box(0.3, 0.012, 0.22, '#FFFFFF', { r: 0.005 }); rc.userData.noFit = true; S.add(rc);
      return { mm, b, rc };
    });
    const plates = Array.from({ length: 7 }, () => { const m = new THREE.MeshLambertMaterial({ color: '#D6E4F0' }), b = P.box(0.8, 0.04, 2.0, '#fff', { r: 0.04, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const arrows = Array.from({ length: 14 }, () => { const a = P.arrow(V(), V(0.1, 0, 0), 0.014, CHAR); a.userData.noFit = true; S.add(a); return a; });
    const lamp = P.lamp(GOOD, { h: 0.55, r: 0.13 }); lamp.position.set(3.15, 0, 0); S.add(lamp);
    S.add(P.keep(-3.0, 3.3, 0.8, -1.0, 1.0));

    let L = [], R = null, pos = {};
    function draw() {
      L = items(st); R = validate(L);
      const cols = [...R.W]; if (R.stuck.length) cols.push(R.stuck);
      const nc = Math.max(cols.length, 1), span = Math.min(5.6, nc * 0.95), x0 = -0.25 - span / 2 + span / nc / 2, dx = span / nc;
      pos = {};
      cols.forEach((c, ci) => c.forEach((id, k) => { pos[id] = V(x0 + ci * dx, 0.04, (k - (c.length - 1) / 2) * (c.length > 3 ? 0.5 : 0.6)); }));
      const noEv = new Set(L.filter(x => !x.ev.length).map(x => x.id)), stuck = new Set(R.stuck), judged = new Set(L.filter(x => x.irreversible && R.judge.length).map(x => x.id));
      nodes.forEach((n, i) => {
        const x = L[i], on = !!x; n.b.visible = on; n.rc.visible = on && !!x?.ev.length; if (!on) return;
        const p = pos[x.id]; n.b.position.copy(p); n.rc.position.set(p.x, 0.345, p.z);
        n.mm.color.set(stuck.has(x.id) || noEv.has(x.id) || judged.has(x.id) ? RED : x.irreversible ? AMB : BLUE);
      });
      plates.forEach((pl, i) => { const on = i < cols.length; pl.b.visible = on; if (!on) return; pl.b.position.set(x0 + i * dx, 0, 0); pl.m.color.set(R.stuck.length && i === cols.length - 1 ? '#F3C9C1' : '#D6E4F0'); });
      let ai = 0;
      L.forEach(x => x.deps.forEach(d => {
        if (ai >= arrows.length || !pos[d] || !pos[x.id]) return;
        const a = pos[d], b = pos[x.id], A = arrows[ai++];
        let from, to;
        if (Math.abs(b.x - a.x) < 0.01) { const sg = b.z > a.z ? 1 : -1, off = sg * 0.12; from = V(a.x + off, 0.2, a.z + sg * ND / 2); to = V(b.x + off, 0.2, b.z - sg * ND / 2); }
        else { from = V(a.x + NW / 2, 0.2, a.z); to = V(b.x - NW / 2, 0.2, b.z); }
        A.visible = true; P.setArrow(A, from, to);
      }));
      for (; ai < arrows.length; ai++) arrows[ai].visible = false;
      lamp.userData.set({ color: !R.issues.length && !R.judge.length ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Back every item with repository evidence', short: 'Evidence', get: () => st.evidence, set: v => set({ evidence: !!v }) },
      { type: 'toggle', label: 'Order by real dependencies, not list order', short: 'Graph', get: () => st.graph, set: v => set({ graph: !!v }) },
      { type: 'toggle', label: 'Run the migration before the contract', short: 'Migrate first', get: () => st.migrateEarly, set: v => set({ migrateEarly: !!v }) },
    ];
    const readouts = [
      { label: 'Plan', get: () => { const ok = !R.issues.length && !R.judge.length; return { v: ok ? 'ready' : 'blocked', sub: ok ? `${L.length} items` : `${R.issues.length + R.judge.length} problem${R.issues.length + R.judge.length === 1 ? '' : 's'}`, good: ok, bad: !ok }; } },
      { label: 'Waves', get: () => ({ v: R.stuck.length ? 'none' : String(R.W.length), sub: R.stuck.length ? 'a cycle' : `for ${L.length} items`, good: !R.stuck.length && R.W.length < L.length, bad: !!R.stuck.length }) },
      { label: 'Run together', get: () => { const m = R.W.length ? Math.max(...R.W.map(w => w.length)) : 0; return { v: String(m), sub: m > 1 ? 'items at most' : 'nothing overlaps', good: m > 1 }; } },
    ];
    const labels = [
      { name: 'contract', t: 'Work items', d: 'Receipt: evidence. Gold: one-way. Red: a problem', icon: 'box', atV: V(-3.0, 0.2, 0) },
      { name: 'wave', t: 'Waves', d: 'One plate runs together', icon: 'link', atV: V(-0.25, 0.04, 1.0) },
      { name: 'check', t: 'Plan check', d: 'Checked before any edit', icon: 'check', atV: V(3.3, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Plan from the request', hint: 'no evidence', on: () => set({ ...D0, evidence: false }), off: reset },
      { label: 'Code and docs wait on each other', hint: 'a cycle', on: () => set({ ...D0, cycle: true }), off: reset },
      { label: 'Run the migration before the contract', hint: 'one-way too early', on: () => set({ ...D0, migrateEarly: true }), off: reset },
    ];
    function status() {
      if (R.stuck.length) return { ok: false, msg: `<b>The docs wait for the code and the code waits for the docs, so neither can start, and the gate behind them is stuck too.</b> A cycle is usually a hidden disagreement about which side is the source of truth. Make the contract that truth: both depend on it, not on each other.` };
      if (!st.evidence) return { ok: false, msg: `<b>Planned from the request, ${L.filter(x => !x.ev.length).length} items have no repository evidence, and the plan invents a new allocation module.</b> The repo already has split_installments in fees/money.py: evidence that would have removed a whole item. If evidence can\'t change the plan, it isn\'t evidence.` };
      if (R.judge.length) return { ok: false, msg: '<b>The migration is one-way, and it now runs in the first wave, before the part-payment contract is settled.</b> No mechanical check catches this; it needs judgment. Make the irreversible step wait for the uncertainty it depends on.' };
      if (!st.graph) return { ok: true, msg: `<b>Valid, but ordered as a list: ${R.W.length} waves, one item at a time.</b> The docs, the SMS and the migration don\'t depend on each other; with real dependencies they run together and the plan takes four waves.` };
      return { ok: true, msg: `<b>Every item has evidence and a proof; the contract runs alone, then ${R.W[1].join(', ')} together, then the implementation, then the gate: ${R.W.length} waves.</b> The one-way migration waits for the contract. Approve this plan, not a promise to be careful.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A to-do list', home: true, say: 'A school-fees app in Kampala adds part-payments. The first plan is a to-do list in the order it was typed, with nothing found in the repository.', act: m => m.set({ evidence: false, graph: false, cycle: false, migrateEarly: false }) },
    { t: 'Evidence changes the plan', home: true, say: 'Read the repository first. A split helper already exists, so the new allocation module disappears from the plan.', act: m => m.set({ evidence: true, graph: false, cycle: false, migrateEarly: false }) },
    { t: 'The contract first', home: true, say: 'Order by real dependencies. The contract comes first, because the code, the docs and the receipt message all depend on it.', act: m => m.set({ evidence: true, graph: true, cycle: false, migrateEarly: false }) },
    { t: 'A cycle', home: true, say: 'If the docs wait for the code and the code waits for the docs, nothing can start. A cycle hides a disagreement about the source of truth.', act: m => m.set({ evidence: true, graph: true, cycle: true, migrateEarly: false }) },
    { t: 'One-way steps wait', home: true, say: 'A migration is hard to undo. Run it first and it lands before the contract is settled. That check takes judgment.', act: m => m.set({ evidence: true, graph: true, cycle: false, migrateEarly: true }) },
    { t: 'A plan to approve', home: true, say: 'Every item has evidence and a proof, and the waves show what runs together. Approve this, not a promise to be careful.', act: m => m.set({ evidence: true, graph: true, cycle: false, migrateEarly: false }) },
  ],
  check: [
    { q: 'Docs depend on code, and code depends on docs. What does that usually mean?', options: ['A hidden disagreement about the source of truth', 'The plan is fine', 'Run them together'], answer: 0, why: 'Make a contract both depend on.', hint: 'Try Code and docs wait on each other.' },
    { q: 'Why plan the contract before its implementations?', options: ['So every surface shares one version of the behaviour', 'It is the easiest item', 'Docs come last anyway'], answer: 0, why: 'Otherwise each surface invents its own.', hint: 'Look at wave 1.' },
    { q: 'Which check needs judgment rather than code?', options: ['An irreversible step before its uncertainty is resolved', 'A duplicate id', 'An item with no proof'], answer: 0, why: 'The others are mechanical.', hint: 'Try Run the migration before the contract.' },
  ],
  terms: [
    ['Work item', 'An id, a change, evidence, dependencies and a proof.'],
    ['Dependency graph', 'Which items must be true before others start.'],
    ['Wave', 'A set of items whose dependencies are all done; they can run together.'],
    ['Topological sort', 'Ordering a graph so every item follows its dependencies.'],
    ['Cycle', 'Items that wait on each other; the plan cannot start.'],
    ['Irreversible step', 'Work that is hard to undo, like a migration; it waits for its uncertainty.'],
  ],
  deeper: '<p><b>Design for interruption.</b> Keep the plan as data beside the work, with items small enough that a new session can tell which are done, which proofs ran and what is now unblocked.</p><p><b>Older than agents.</b> Dependency networks for planning go back to PERT and the critical path method in the late 1950s.</p><p><b>About this machine.</b> The items are fixed; validation, the cycle check, the judgment check and the waves are computed live.</p>',
  code: {
    title: 'Waves by topological sort',
    note: 'Adapted from the course\'s plan validator (code/main.py).',
    text: `
def execution_waves(items):
    remaining = {i.id: set(i.depends_on) for i in items}
    waves, completed = [], set()
    while remaining:
        ready = sorted(i for i, deps in remaining.items() if deps <= completed)
        if not ready:
            raise ValueError(f"dependency cycle among: {', '.join(sorted(remaining))}")
        waves.append(ready)
        completed.update(ready)
        for i in ready:
            del remaining[i]
    return waves

def validate(items):
    issues = []
    for i in items:
        if not i.evidence: issues.append(f"{i.id} has no repository evidence")
        if not i.proof.strip(): issues.append(f"{i.id} has no proof command")
    try: execution_waves(items)
    except ValueError as e: issues.append(str(e))
    return issues
`,
  },
};
