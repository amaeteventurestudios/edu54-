// ReWOO and plan-and-execute: a cassava co-op asks which market sold more last week, Kumasi or Tamale, and by how much.
// ReWOO: one planner call writes a plan DAG (#E1 lookup Kumasi, #E2 lookup Tamale, #E3 compare #E1 #E2), workers run it in dependency order
// (Kahn's algorithm, so independent nodes share a level), one solver call writes the answer. ReAct resends the growing history on every step.
// Token counts are measured on the actual prompt strings below (characters / 4). Plan-and-execute adds a replanner after a failed node.
// Breaks: a cycle in the plan, a reference to a node that does not exist, a failed lookup with no replanner.
const DATA = { Kumasi: 1240, Tamale: 980 };
const SYS = 'You are the co-op\'s assistant. Use the tools to answer. Tools: lookup_sales(market, source?) returns last week\'s cassava sales in kg; compare(a, b) returns which is larger and the difference.';
const Q = 'Which market sold more cassava last week, Kumasi or Tamale, and by how much?';
const tok = s => Math.ceil(s.length / 4);
function basePlan(o) {
  const p = [
    { id: 'E1', tool: 'lookup_sales', args: ['Kumasi'], deps: [] },
    { id: 'E2', tool: 'lookup_sales', args: ['Tamale'], deps: [] },
    { id: 'E3', tool: 'compare', args: ['#E1', '#E2'], deps: ['E1', 'E2'] },
  ];
  if (o.cycle) { p[0].args = ['Kumasi', '#E3']; p[0].deps = ['E3']; }
  if (o.missing) { p[2].args = ['#E1', '#E4']; p[2].deps = ['E1', 'E4']; }
  return p;
}
function levels(plan) {
  const ids = new Set(plan.map(n => n.id)), missing = plan.flatMap(n => n.deps.filter(d => !ids.has(d)).map(d => `${n.id} → #${d}`));
  if (missing.length) return { err: 'missing', missing };
  const indeg = {}, out = {}; plan.forEach(n => { indeg[n.id] = n.deps.length; n.deps.forEach(d => (out[d] = out[d] || []).push(n.id)); });
  let ready = plan.filter(n => !indeg[n.id]).map(n => n.id); const L = []; let seen = 0;
  while (ready.length) { L.push(ready); seen += ready.length; const nx = []; ready.forEach(id => (out[id] || []).forEach(m => { if (!--indeg[m]) nx.push(m); })); ready = nx; }
  if (seen < plan.length) return { err: 'cycle', stuck: plan.filter(n => indeg[n.id] > 0).map(n => n.id) };
  return { L };
}
function runTool(n, ev, o) {
  const a = n.args.map(x => (x.startsWith('#') ? ev[x.slice(1)] : x));
  if (n.tool === 'lookup_sales') { if (a[0] === 'Tamale' && o.fail && a[1] !== 'paper ledger') return { err: 'Tamale\'s weekly upload is missing' }; return { v: DATA[a[0]] }; }
  if (a.some(x => x && x.err)) return { err: 'an input failed' };
  const x = a[0].v, y = a[1].v; return { v: x - y, text: `${x > y ? 'Kumasi' : 'Tamale'} by ${Math.abs(x - y)} kg` };
}
function execute(o) {
  let plan = basePlan(o); const V = levels(plan);
  const planText = plan.map(n => `#${n.id} = ${n.tool}(${n.args.join(', ')})`).join('\n');
  const calls = [{ who: 'planner', prompt: `${SYS}\n${Q}\nWrite a plan as #E lines.`, out: planText }];
  if (V.err) return { plan, V, calls, ev: {}, answer: null, replanned: false, order: [] };
  const ev = {}, order = [];
  V.L.forEach(lv => lv.forEach(id => { const n = plan.find(m => m.id === id), r = runTool(n, ev, o); ev[id] = r; order.push(id); calls.push({ who: 'worker', prompt: `${n.tool}(${n.args.map(x => x.startsWith('#') ? JSON.stringify(ev[x.slice(1)]?.v ?? 'error') : x).join(', ')})`, out: JSON.stringify(r) }); }));
  let replanned = false;
  if (o.replan && Object.values(ev).some(r => r.err)) {
    replanned = true;
    calls.push({ who: 'replanner', prompt: `${SYS}\n${Q}\nPlan:\n${planText}\nEvidence: ${JSON.stringify(ev)}\nRevise the failed steps.`, out: '#E2 = lookup_sales(Tamale, paper ledger)\n#E3 = compare(#E1, #E2)' });
    plan = plan.map(n => n.id === 'E2' ? { ...n, args: ['Tamale', 'paper ledger'] } : n);
    ['E2', 'E3'].forEach(id => { const n = plan.find(m => m.id === id), r = runTool(n, ev, o); ev[id] = r; order.push(id + "'"); calls.push({ who: 'worker', prompt: `${n.tool}(${n.args.join(', ')})`, out: JSON.stringify(r) }); });
  }
  const answer = ev.E3 && !ev.E3.err ? `Kumasi sold more: ${DATA.Kumasi} kg against ${DATA.Tamale} kg, ${ev.E3.text.split(' by ')[1]} more.` : `Kumasi sold ${DATA.Kumasi} kg; Tamale's figure is missing (${(ev.E2 && ev.E2.err) || 'error'}), so no comparison yet.`;
  calls.push({ who: 'solver', prompt: `${Q}\nPlan:\n${planText}\nEvidence:\n${Object.entries(ev).map(([k, r]) => `#${k}: ${r.err ? 'ERROR ' + r.err : r.text || r.v}`).join('\n')}\nAnswer.`, out: answer });
  return { plan, V, calls, ev, answer, replanned, order };
}
function react(o) {
  const steps = [['I need Kumasi\'s sales.', 'lookup_sales(Kumasi)', `${DATA.Kumasi}`], ['Now Tamale\'s.', 'lookup_sales(Tamale)', o.fail ? 'ERROR: Tamale\'s weekly upload is missing' : `${DATA.Tamale}`]];
  if (o.fail) steps.push(['The upload is missing; try the paper ledger.', 'lookup_sales(Tamale, paper ledger)', `${DATA.Tamale}`]);
  steps.push(['Compare them.', `compare(${DATA.Kumasi}, ${DATA.Tamale})`, `Kumasi by ${DATA.Kumasi - DATA.Tamale} kg`], ['I can answer.', 'finish', '']);
  let hist = `${SYS}\n${Q}`, total = 0; const calls = [];
  steps.forEach(([t, a, ob]) => { const p = hist + '\nThought:'; total += tok(p); calls.push(p); hist += `\nThought: ${t}\nAction: ${a}\nObservation: ${ob}`; });
  return { tokens: total, calls: steps.length };
}

export default {
  slug: 'rewoo-plan-and-execute',
  title: 'ReWOO: plan once, then fetch',
  description: 'A cassava co-op asks which of two markets sold more last week. Plan the whole job once, run the steps, then answer.',
  overview: 'ReAct interleaves thought, action and observation in one growing prompt, so every step resends the question and all the history before it. ReWOO (reasoning without observation) splits the work into three roles. A planner writes the whole plan up front as a small graph, where each step names a tool, its arguments, and earlier results it needs (#E1, #E2). Workers run the steps in dependency order; steps that don\'t depend on each other can run in parallel. A solver reads the question, the plan and the evidence, and writes the answer. Because the planner never sees observations, it can be a smaller model, and the paper reports about five times fewer tokens on multi-hop questions. A plan must be checked before it runs: no cycles, and every reference must point at a step that exists. A static plan can\'t react to a failed tool; the solver can only report the gap. Plan-and-execute adds a replanner that reads the evidence after execution and revises the failed steps, bringing observations back in at a small cost. Start with the simplest pattern that works: one tool call and a summary needs neither.',
  keywords: ['ReWOO', 'plan and execute', 'ReAct', 'AI agents', 'task planning', 'DAG', 'token efficiency'],
  orient: 'landscape',
  view: { target: [0.2, 0.4, 0.3], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pat: 1, fail: false, replan: false, cycle: false, missing: false, parallel: true }, st = { ...D0, t: 0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const mkNode = (x, z, w, label, h = 0.22) => { const mm = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), b = P.box(w, h, 0.5, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0.12, z); S.add(b); const t = S.text(label, { size: 0.26, weight: 800, color: '#FFFFFF', maxW: w + 0.2, face: 'cam', top: true }); t.position.set(x, 0.14 + h + 0.2, z); t.visible = false; S.add(t); const s = { userData: { set: () => {} } }; return { mm, b, t, s, x, z, label }; };
    const NODES = { planner: mkNode(-2.45, 0.2, 0.75, 'Planner', 0.34), E1: mkNode(-1.0, -0.2, 0.95, '#E1'), E2: mkNode(-1.0, 0.75, 0.95, '#E2'), E3: mkNode(0.35, 0.28, 0.95, '#E3'), solver: mkNode(1.65, 0.28, 0.8, 'Solver', 0.34) };
    const arr = (a, b) => { const g = P.arrow(V(), V(1, 0, 0), 0.018, '#8E8C84'); S.add(g); g.userData.from = a; g.userData.to = b; return g; };
    const ARROWS = [arr('planner', 'E1'), arr('planner', 'E2'), arr('E1', 'E3'), arr('E2', 'E3'), arr('E3', 'solver'), arr('E3', 'E1')];
    const place = (g, a, b) => { const A = NODES[a], B = NODES[b], dir = V(B.x - A.x, 0, B.z - A.z).normalize(); P.setArrow(g, V(A.x, 0.3, A.z).addScaledVector(dir, 0.48), V(B.x, 0.3, B.z).addScaledVector(dir, -0.5)); };
    ARROWS.forEach(g => place(g, g.userData.from, g.userData.to));
    /* tokens sent: ReAct (coral) resends its history every step; ReWOO (teal) plans once */
    const MX = 2.6, bars = ['ReAct', 'ReWOO'].map((n, i) => { const t = P.tower(0.4, 0.4, i ? GOOD : BAD, { size: 0.24 }); t.position.set(MX + i * 0.55, 0, 0.3); S.add(t); return t; });
    const ansM = new THREE.MeshLambertMaterial({ color: GOOD }), ans = P.lamp(GOOD, { h: 0.55, r: 0.12 }); ans.position.set(1.65, 0, 1.0); S.add(ans);
    S.add(P.keep(-2.9, 3.3, 1.5, -0.6, 1.2));
    let R = null, RA = null, sched = [], dur = 1;
    function plan() {
      R = execute(st); RA = react(st);
      const P0 = R.plan, byId = Object.fromEntries(P0.map(n => [n.id, n]));
      ['E1', 'E2', 'E3'].forEach(id => { const n = byId[id], N = NODES[id]; N.sv = n ? `${n.tool}(${n.args.join(', ')})` : ''; });
      ARROWS[5].visible = !!st.cycle; ARROWS[3].visible = !st.missing;
      // schedule: planner at 0, each level after, (replan), then solver
      sched = [{ id: 'planner', at: 0 }]; let t = 1;
      if (!R.V.err) { R.V.L.forEach(lv => { lv.forEach((id, k) => sched.push({ id, at: st.parallel ? t : t + k })); t += st.parallel ? 1 : lv.length; }); if (R.replanned) { sched.push({ id: 'planner', at: t, re: true }); t++; sched.push({ id: 'E2', at: t, re: true }); t++; sched.push({ id: 'E3', at: t, re: true }); t++; } sched.push({ id: 'solver', at: t }); t++; }
      dur = t; st.t = 0;
      const rw = R.calls.reduce((s, c) => s + tok(c.prompt), 0), ra = RA.tokens, mx = Math.max(rw, ra);
      bars[0].userData.set({ h: 0.06 + 1.2 * ra / mx, cap: String(ra) }); bars[1].userData.set({ h: 0.06 + 1.2 * rw / mx, cap: String(rw) });
    }
    function paint() {
      const T = st.t;
      Object.entries(NODES).forEach(([id, N]) => {
        const evs = sched.filter(s => s.id === id), last = evs.filter(s => s.at <= T).pop();
        let c = '#D9D4C7';
        if (R.V.err && id !== 'planner') c = (R.V.err === 'cycle' && R.V.stuck.includes(id)) || (R.V.err === 'missing' && id === 'E3') ? BAD : '#D9D4C7';
        else if (last) { const runningNow = T - last.at < 1; const r = id in R.ev ? R.ev[id] : null; c = runningNow ? SAF : id === 'E2' && st.fail && !(last.re) ? BAD : id === 'E3' && r && r.err && !R.replanned ? BAD : id === 'solver' && !R.answer ? BAD : GOOD; }
        if (id === 'planner' && R.V.err) c = BAD;
        N.mm.color.set(c); const tc = c === '#D9D4C7' || c === SAF ? ink : '#FFFFFF'; N.t.userData.set(N.label, tc); N.s.userData.set(N.sv || '', tc);
      });
      const done = R.V.err || T >= dur - 0.01;
      ans.userData.set({ color: R.V.err || (done && !R.answer) ? RED : done ? GOOD : SAF, on: !!done || !!R.V.err });
    }
    plan(); paint();
    const set = p => { Object.assign(st, p); plan(); paint(); };
    const controls = [
      { type: 'toggle', label: 'Tamale\'s upload is missing', short: 'Lookup fails', get: () => st.fail, set: v => set({ fail: !!v }) },
      { type: 'toggle', label: 'Replan after a failed step (plan-and-execute)', short: 'Replanner', get: () => st.replan, set: v => set({ replan: !!v }) },
      { type: 'toggle', label: 'Run independent steps together', short: 'Parallel', get: () => st.parallel, set: v => set({ parallel: !!v }) },
      { type: 'button', label: 'Run the plan again', act: () => { st.t = 0; paint(); } },
    ];
    const rw = () => R.calls.reduce((s, c) => s + tok(c.prompt), 0);
    const readouts = [
      { label: 'Tokens', get: () => ({ v: `${rw()} vs ${RA.tokens}`, sub: 'ReWOO vs ReAct', good: rw() < RA.tokens }) },
      { label: 'Model calls', get: () => ({ v: `${R.calls.filter(c => c.who !== 'worker').length} vs ${RA.calls}`, sub: 'planner + solver vs every step' }) },
      { label: 'Time', get: () => ({ v: R.V.err ? '–' : `${dur} rounds`, sub: st.parallel ? 'independent steps together' : 'one step at a time' }) },
    ];
    const labels = [
      { name: 'planner', t: 'The planner', d: 'Writes the whole plan first: look up Kumasi (E1) and Tamale (E2), compare them (E3), then one solver call; gold running, red failed', icon: 'layers', atV: V(-2.85, 0.3, 0.2) },
      { name: 'ans', t: 'The answer', d: 'Green when the solver answers; red when the plan is refused or a step fails', icon: 'check', atV: V(1.9, 0.5, 1.0) },
      { name: 'tokens', t: 'Tokens sent', d: 'Measured on the prompts: ReAct resends its history each step, ReWOO plans once', icon: 'chart', atV: V(3.4, 0.3, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put a cycle in the plan', hint: '#E1 waits on #E3', on: () => set({ ...D0, cycle: true }), off: reset },
      { label: 'Point at a step that doesn\'t exist', hint: '#E4', on: () => set({ ...D0, missing: true }), off: reset },
      { label: 'Let a lookup fail with no replanner', hint: 'static plan', on: () => set({ ...D0, fail: true }), off: reset },
    ];
    function status() {
      if (R.V.err === 'cycle') return { ok: false, msg: `<b>The plan was refused before any tool ran: ${R.V.stuck.map(s => '#' + s).join(' and ')} wait on each other.</b> Workers run steps in dependency order; with a cycle no order exists, so the topological sort leaves steps it can never start. Validate the plan (acyclic, every reference resolved, every tool known) before executing it.` };
      if (R.V.err === 'missing') return { ok: false, msg: `<b>The plan was refused: ${R.V.missing.join(', ')} refers to a step that was never planned.</b> A reference like #E4 is replaced by that step's output at run time; if the step doesn't exist there is nothing to substitute. Check every reference before the first tool call.` };
      if (st.fail && !R.replanned) return { ok: false, msg: `<b>The Tamale lookup failed, and a static plan can't do anything about it: the solver reports Kumasi's ${DATA.Kumasi} kg and a missing comparison.</b> The failure stays local to #E2 and the answer degrades honestly, which is ReWOO's strength. To recover, add a replanner that reads the evidence and revises the failed steps: plan-and-execute. ReAct would have reacted mid-stream, at ${RA.tokens} tokens.` };
      const saved = Math.round(100 * (1 - rw() / RA.tokens));
      return { ok: true, msg: `<b>${R.answer}</b> ${R.replanned ? `The replanner read the error and switched #E2 to the paper ledger; that added one model call, and the total is still ${rw()} tokens against ReAct's ${RA.tokens}.` : `Two model calls and three tool calls: ${rw()} tokens against ReAct's ${RA.tokens} (${saved}% fewer), because no prompt resends the history.`} ${st.parallel ? `#E1 and #E2 don't depend on each other, so they run together: ${dur} rounds.` : `One step at a time: ${dur} rounds.`}` };
    }
    return {
      update: dt => { bars.forEach(b => b.userData.tick(dt)); if (st.t < dur) { st.t = Math.min(dur, st.t + dt * 1.2); paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Two ways to answer', home: true, say: 'A cassava co-op asks its assistant which of two markets sold more last week, and by how much. It needs two lookups and a comparison.', act: m => m.set({ pat: 1, fail: false, replan: false, cycle: false, missing: false, parallel: true }) },
    { t: 'Plan first', home: true, say: 'The planner writes the whole plan at once: look up Kumasi, look up Tamale, then compare the two results.', act: m => m.set({}) },
    { t: 'Fewer tokens', home: true, say: 'Thinking one step at a time resends the question and every earlier step on each call. Planning once sends far less.', act: m => m.set({ parallel: true }) },
    { t: 'Side by side', home: true, say: 'The two lookups don\'t depend on each other, so they run at the same time. The comparison waits for both.', act: m => m.set({ parallel: true }) },
    { t: 'A failed lookup', home: true, say: 'Tamale\'s upload is missing. A fixed plan can only report the gap.', act: m => m.set({ fail: true }) },
    { t: 'Replan', home: true, say: 'A replanner reads the error and tries the paper ledger instead. One more call, and the answer is complete.', act: m => m.set({ replan: true }) },
  ],
  check: [
    { q: 'Why does ReWOO send fewer tokens than ReAct?', options: ['No prompt resends the growing history; the planner runs once', 'It uses a smaller alphabet', 'It skips the tools'], answer: 0, why: 'ReAct resends every earlier step on each call.', hint: 'Watch the token bars.' },
    { q: 'The plan says #E1 needs #E3 and #E3 needs #E1. What should happen?', options: ['Refuse the plan before running anything', 'Run #E1 first', 'Run both in parallel'], answer: 0, why: 'No dependency order exists.', hint: 'Try Put a cycle in the plan.' },
    { q: 'What turns ReWOO into plan-and-execute?', options: ['A replanner that reads the evidence and revises failed steps', 'More tools', 'A bigger solver'], answer: 0, why: 'It brings observations back into planning.', hint: 'Turn on Replanner with a failed lookup.' },
  ],
  terms: [
    ['ReAct', 'Thought, action and observation interleaved in one growing prompt.'],
    ['ReWOO', 'Plan up front, fetch evidence, then solve.'],
    ['Plan DAG', 'Steps with dependencies and no cycles.'],
    ['Evidence reference', '#E1 and so on, replaced by a step\'s output at run time.'],
    ['Replanner', 'A step that revises the plan after seeing results.'],
    ['Topological order', 'An order that puts every step after the steps it needs.'],
  ],
  deeper: '<p><b>A small planner.</b> Because the planner never sees observations, a small model can be trained on a large model\'s plans and do the planning at inference time.</p><p><b>Plan-and-Act.</b> For long web and mobile tasks of 30 steps or more, explicit planners trained on synthetic plans keep working where a single ReAct trajectory loses track.</p><p><b>Pick the simplest.</b> One tool call and a summary needs no planner. A long research task shouldn\'t run as one ReAct stream either.</p><p><b>About this machine.</b> The plan check, the execution order and the token counts are computed live; tokens are characters / 4 on the real prompt strings each pattern would send.</p>',
  code: {
    title: 'Check the plan, then run it in order',
    note: 'Adapted from the course\'s ReWOO lesson.',
    text: `
def levels(plan):
    ids = {n.id for n in plan}
    for n in plan:
        for d in n.deps:
            if d not in ids:
                raise ValueError(f"{n.id} references missing #{d}")
    indeg = {n.id: len(n.deps) for n in plan}
    ready, order = [n.id for n in plan if not n.deps], []
    while ready:
        order.append(ready)
        ready = [m.id for m in plan if m.deps and
                 all(d in sum(order, []) for d in m.deps) and m.id not in sum(order, [])]
    if sum(map(len, order)) < len(plan):
        raise ValueError("cycle in plan")
    return order                     # each level can run in parallel

def run(plan, tools):
    evidence = {}
    for level in levels(plan):
        for nid in level:
            node = next(n for n in plan if n.id == nid)
            args = [evidence[a[1:]] if a.startswith("#") else a for a in node.args]
            evidence[nid] = tools[node.tool](*args)
    return evidence
`,
  },
};
