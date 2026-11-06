// Verification gates (phase 19, lesson 25): each tool call passes a chain of deterministic gates before it runs: budget, recency (read before you edit), destructive-command check. An observation budget caps how much tool output returns.
// The chain really evaluates six scripted calls from a Durban port agent. Big outputs are truncated with a note, so one log can't flood the window.
const CALLS = [
  { n: 'read config', read: 1, size: 3 }, { n: 'edit config', edit: 1, file: 'cfg', size: 1 }, { n: 'edit routes (unread)', edit: 1, file: 'routes', size: 1 },
  { n: 'cat whole log', read: 1, size: 40 }, { n: 'delete build folder', danger: 1, size: 1 }, { n: 'run tests', size: 8 },
];
function run(o) {
  const seen = new Set(['cfg']); let ctx = 10, spent = 0; const res = CALLS.map(c => {
    if (o.budget && spent >= 5) return 'budget';
    if (o.recent && c.edit && !seen.has(c.file)) return 'recency';
    if (o.danger && c.danger) return 'danger';
    spent++; ctx += o.cap ? Math.min(c.size, 10) : c.size; return 'ok';
  });
  return { res, ctx, passed: res.filter(r => r === 'ok').length };
}

export default {
  slug: 'verification-gates-observation-budget',
  title: 'Verification gates: checks before every tool call',
  description: 'Six tool calls meet a chain of simple gates. Deterministic rules catch what the model\'s judgement won\'t.',
  overview: 'A model\'s judgement is not a safety system. A gate is: a small deterministic function that sees a proposed call and says allow or deny, with a reason. Chain several. A budget gate stops runaway use. A recency gate refuses edits to a file the agent hasn\'t read, which catches a common source of wrong edits. A destructive gate blocks dangerous commands. Then an observation budget limits what comes back: one huge log can fill the window, so output is cut, with a note saying how to see more. Denials go back to the model as results it can act on. This lesson runs six calls from a port agent in Durban.',
  keywords: ['verification gates', 'agent harness', 'guardrails', 'observation budget', 'context window', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { budget: false, recent: true, danger: true, cap: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.42), V(0.9, 0, 0.42), { w: 0.3, speed: 1 }));
    const GX = [-1.6, -0.8, 0], KS = ['budget', 'recent', 'danger'];
    const gates = GX.map((x, i) => { const g = add(P.gate(0.5, ['#5B8DB8', '#7B6FA8', RED][i], { h: 0.45 })); g.rotation.y = Math.PI / 2; g.position.set(x, 0.03, 0.42); return g; });
    const X = i => -1.75 + i * 0.5;
    const C = CALLS.map((c, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), t = P.box(0.38, 0.3, 0.38, '#fff', { r: 0.04, material: m }); t.position.set(X(i), 0.03, -0.4); S.add(t); return m; });
    const tank = add(P.tank(0.7, 1.0, 0.6, GOOD)); tank.position.set(1.7, 0.08, -0.1);
    S.add(P.keep(-2.45, 2.45, 1.15, -0.72, 0.75));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      gates.forEach((g, i) => g.visible = !!st[KS[i]]);
      C.forEach((m, i) => m.color.set(R.res[i] === 'ok' ? GOOD : R.res[i] === 'danger' ? RED : SAF));
      tank.userData.set({ level: R.ctx / 70, color: R.ctx > 50 ? BAD : GOOD });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('budget', 'Budget gate: five calls', 'Budget'), tg('recent', 'Recency gate: read before edit', 'Recency'), tg('danger', 'Destructive gate', 'Destructive'), tg('cap', 'Observation budget on output', 'Output cap')];
    const readouts = [
      { label: 'Calls allowed', get: () => ({ v: `${R.passed} of 6`, sub: 'teal blocks' }) },
      { label: 'First denial', get: () => { const i = R.res.findIndex(r => r !== 'ok'); return { v: i < 0 ? 'none' : R.res[i], sub: i < 0 ? '' : CALLS[i].n, bad: i < 0 && !st.danger }; } },
      { label: 'Context used', get: () => ({ v: `${R.ctx}%`, sub: st.cap ? 'output cut at ten' : 'no limit', good: R.ctx < 40, bad: R.ctx > 50 }) },
    ];
    const labels = [
      { name: 'c', t: 'Six proposed calls', d: 'Gold: denied. Red: dangerous', icon: 'box', atV: V(X(0) - 0.2, 0.2, -0.4) },
      { name: 't', t: 'The context tank', d: 'Output counts here', icon: 'target', atV: V(2.08, 0.5, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust the model\'s judgement', hint: 'no gates at all', on: () => set({ budget: false, recent: false, danger: false, cap: true }), off: reset },
      { label: 'No output cap', hint: 'one log fills the tank', on: () => set({ ...D0, cap: false }), off: reset },
      { label: 'A budget that is too tight', hint: 'real work is refused', on: () => set({ ...D0, budget: true, recent: false, danger: false }), off: reset },
    ];
    function status() {
      if (!st.danger) return { ok: false, msg: '<b>"Delete build folder" ran.</b> The model thought it was tidy. A gate has no opinions: it matches the rule, and says no.' };
      if (!st.recent) return { ok: false, msg: '<b>It edited a file it had not read.</b> That edit came from memory of what the file might say. A simple rule, read first, stops a common bug.' };
      if (!st.cap) return { ok: false, msg: `<b>Context at ${R.ctx}%: one log took most of it.</b> Tool output is input to the next turn. Cut it, and say how to see more.` };
      if (st.budget && R.passed < 5) return { ok: false, msg: `<b>Only ${R.passed} allowed.</b> A budget must leave room for honest work.` };
      return { ok: true, msg: `<b>${R.passed} calls allowed, and two denied with reasons the model can use.</b> Context stayed at ${R.ctx}%.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.8 && b.userData.count() < 3) { u = 0; b.userData.send('#F4F1EA', { size: 0.15 }); } }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Rules, not judgement', home: true, say: 'A port agent in Durban proposes six tool calls. Each one must pass a chain of simple gates.', act: m => m.set({ budget: false, recent: true, danger: true, cap: true }) },
    { t: 'Read before edit', home: true, say: 'It tries to edit a file it never read. The recency gate says no.', act: m => m.set({ budget: false, recent: true, danger: true, cap: true }) },
    { t: 'Dangerous commands', home: true, say: 'Without a gate, a delete just runs. The model thought it was tidying.', act: m => m.set({ budget: false, recent: true, danger: false, cap: true }) },
    { t: 'Output is context', home: true, say: 'One huge log can fill the window, as tool output comes back as input.', act: m => m.set({ budget: false, recent: true, danger: true, cap: false }) },
    { t: 'An observation budget', home: true, say: 'Cut long output, and say how to see more.', act: m => m.set({ budget: false, recent: true, danger: true, cap: true }) },
    { t: 'Denied is a result', home: true, say: 'A denial goes back to the model as text, with a reason. It adapts and carries on.', act: m => m.set({ budget: false, recent: true, danger: true, cap: true }) },
  ],
  check: [
    { q: 'What is a gate?', options: ['A deterministic check on a proposed call', 'A model', 'A network port'], answer: 0, why: 'It has rules, not opinions.', hint: 'See Rules, not judgement.' },
    { q: 'What does a recency gate stop?', options: ['Edits to unread files', 'Slow tools', 'Long prompts'], answer: 0, why: 'Edits should come from what the file says.', hint: 'Toggle Recency.' },
    { q: 'Why cap tool output?', options: ['It becomes context on the next turn', 'Disks are small', 'Models read slowly'], answer: 0, why: 'One log can fill the window.', hint: 'Try No output cap.' },
  ],
  terms: [['Gate', 'A rule that allows or denies a call.'], ['Recency', 'Having read something lately.'], ['Observation budget', 'A limit on tool output.'], ['Denial', 'A refusal returned to the model.'], ['Chain', 'Gates run in order.']],
  deeper: '<p><b>Order.</b> Run cheap gates first, and stop at the first denial.</p><p><b>Reasons.</b> A denial with a reason lets the model fix the plan.</p><p><b>This chain</b> really evaluates the six calls.</p>',
  code: {
    title: 'A gate chain',
    note: 'Adapted from the course\'s gates (code/main.py).',
    text: `
GATES = [BudgetGate(limit=50), RecencyGate(), DestructiveGate()]

def evaluate(call, session):
    for gate in GATES:
        decision = gate.evaluate(call, session)
        if not decision.allow:
            return decision
    return Allow()
`,
  },
};
