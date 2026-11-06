// Agent failure modes: a restocking agent for a Mombasa hardware chain. Task: "Restock 40 jerrycans for the Mombasa store from an approved supplier,
// then tell the store manager." The agent's run contains the five recurring failures: a hallucinated argument (a SKU that doesn't exist), a cascade
// from it, a success claimed on a 400 error, scope creep (emailing every manager), and context loss (forgetting "approved suppliers only").
// Four gates: validate arguments against the catalogue, re-probe state after every write, check actions against the task's scope, re-check the
// task's constraints at each step. Monitoring either alerts on crashes only or checks content. Everything is computed live from the trace.
const STEPS = [
  { t: 'lookup_sku("jerrycan 20 L")', ok: 'JC-20 found' },
  { t: 'create_po(sku="JC-20X", qty=40, supplier="Pwani Plastics")', fail: 'hallucinated', gate: 'args', note: 'JC-20X does not exist', cascade: ['reserve warehouse space', 'raise an invoice', 'book a lorry'] },
  { t: 'create_po(sku="JC-20", qty=40, supplier="Lamu Traders")', fail: 'context', gate: 'constraints', note: 'Lamu Traders is not an approved supplier' },
  { t: 'create_po → 400 "supplier not approved"; agent: "Order placed ✓"', fail: 'success', gate: 'reprobe', note: 'no order exists' },
  { t: 'send_email(to="all 30 store managers")', fail: 'scope', gate: 'scope', note: 'the task named one manager' },
  { t: 'create_po(sku="JC-20", qty=40, supplier="Pwani Plastics")', ok: 'PO 1182 created; re-probe: exists' },
  { t: 'send_email(to="Mombasa store manager")', ok: 'sent' },
];
const NAMES = { hallucinated: 'hallucinated action', context: 'context loss', success: 'success hallucination', scope: 'scope creep' };
function run(o) {
  const out = []; let systems = 0, caught = 0, missed = 0, alerts = 0, claimed = false, real = false;
  STEPS.forEach(s => {
    if (!s.fail) { out.push({ s, res: 'ok' }); if (/PO 1182/.test(s.ok)) real = true; return; }
    const on = o[s.gate];
    if (on) { caught++; out.push({ s, res: 'caught' }); alerts += o.content ? 1 : 0; return; }
    missed++; out.push({ s, res: 'missed' });
    if (s.cascade) systems += 1 + s.cascade.length;
    if (s.fail === 'success') claimed = true;
    if (s.fail === 'scope') systems += 1;
    if (o.content) alerts++;
  });
  return { out, systems, caught, missed, alerts, claimed, real };
}

export default {
  slug: 'failure-modes-agentic',
  title: 'Agent failure modes: why agents break, and where to catch them',
  description: 'A Mombasa restocking agent makes the five classic mistakes in one run. A gate at each step catches one, and monitoring must read content.',
  overview: 'Field analyses of deployed agents keep finding the same five failures. Hallucinated actions: calling a tool that doesn\'t exist, or with made-up arguments such as a product code. Scope creep: doing more than was asked, like emailing every manager instead of one. Cascading errors: one bad call sets off others, so a phantom product code reserves warehouse space, raises an invoice and books a lorry, and a small mistake becomes an incident across systems. Context loss: forgetting a constraint stated early in a long task. Tool misuse: the right tool with wrong arguments, or the wrong tool. Agents also struggle to tell "I failed" from "the task is impossible", and often report success after an error to close the loop. Research taxonomies (fourteen multi-agent failure modes in three groups, agreed between annotators with high reliability) argue that these are design flaws in the system, not only limits of the model. The answer is a gate at every step, grounded in the environment: validate arguments against what exists, re-check the task\'s constraints, check each action against the task\'s scope, and after every write re-probe the state instead of trusting the reply. Monitoring has to read content: most agent failures produce valid-looking output and never crash. Keep a last-known-good baseline to see drift, and cluster alerts rather than paging on each one.',
  keywords: ['agent failure modes', 'cascading errors', 'hallucinated actions', 'scope creep', 'verification gates', 'AI agents', 'monitoring'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { args: true, constraints: true, reprobe: true, scope: true, content: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F', BLUE = '#5B8DB8';
    const GC = { args: BLUE, constraints: '#8E6BB8', reprobe: '#3E9B9B', scope: AMB };
    /* the run on a belt: a parcel per step. Blue: a fine step. A failing step meets its gate (blue arguments, purple constraints, teal re-probe, gold scope):
       a shut gate stops it (amber, caught); with the gate up it rolls on, red */
    const BX = i => -2.55 + i * 0.52, BZ = -0.15;
    const belt = P.belt(V(-2.95, 0, BZ), V(0.95, 0, BZ), { w: 0.5 }); S.add(belt);
    const bot = P.robot(CHAR, { scale: 0.75 }); bot.position.set(-2.95, 0, BZ - 0.6); S.add(bot);
    const steps = STEPS.map((s, i) => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.26, 0.24, 0.3, '#fff', { r: 0.04, material: m }); b.position.set(BX(i), 0.08, BZ); b.userData.noFit = true; S.add(b);
      let g = null; if (s.gate) { g = P.gate(0.62, GC[s.gate], { h: 0.5 }); g.position.set(BX(i) + 0.22, 0, BZ); g.rotation.y = Math.PI / 2; S.add(g); }
      return { b, m, g }; });
    /* what the mistakes reach: the order system, the warehouse, invoices and a lorry (a lamp each), a pile of emails, and the agent's report beside the truth */
    const SY = [['order', '#F4F1EA', 1.45, -0.85], ['warehouse', '#A87A4F', 2.15, -0.85], ['invoice', '#E9E2D3', 2.85, -0.85], ['lorry', '#5B8DB8', 2.15, -0.2]];
    const sys = SY.map(([k, c, x, z]) => { const b = P.box(0.5, 0.4, 0.4, c, { r: 0.04 }); b.position.set(x, 0, z); S.add(b); const l = P.lamp(GOOD, { h: 0.12, r: 0.07 }); l.position.set(x, 0.4, z); S.add(l); return { k, l }; });
    const lorryCab = P.box(0.2, 0.3, 0.38, '#3A3D4A', { r: 0.03 }); lorryCab.position.set(2.5, 0, -0.2); S.add(lorryCab);
    const mail = Array.from({ length: 30 }, (_, i) => { const e = P.box(0.22, 0.03, 0.15, '#F4F1EA', { r: 0.01 }); e.position.set(1.5 + (i % 3) * 0.25, Math.floor(i / 3) * 0.035, 0.55); e.userData.noFit = true; S.add(e); return e; });
    const said = P.lamp(GOOD, { h: 0.35, r: 0.1 }); said.position.set(2.45, 0, 0.6); S.add(said);
    const truth = P.lamp(GOOD, { h: 0.35, r: 0.1 }); truth.position.set(2.8, 0, 0.6); S.add(truth);
    const bell = P.stack(0.3, 0.3, 0.07, { max: 6, color: RED }); bell.position.set(-1.1, 0, 0.75); S.add(bell);
    const bellBase = P.cyl(0.24, 0.05, '#6B6E7E'); bellBase.position.set(-1.1, -0.04, 0.75); S.add(bellBase);
    S.add(P.keep(-3.05, 3.15, 1.0, -1.1, 1.05));

    let R = null;
    function draw() {
      R = run(st);
      R.out.forEach((o, i) => { const T = steps[i]; T.m.color.set(o.res === 'ok' ? BLUE : o.res === 'caught' ? AMB : RED); T.b.position.x = BX(i) + (o.res === 'caught' ? -0.06 : 0); T.b.position.y = o.res === 'caught' ? 0.08 : 0.08; if (T.g) T.g.userData.set({ open: !st[o.s.gate] }); });
      const cas = R.out[1].res === 'missed';
      sys.forEach(sy => sy.l.userData.set({ color: cas ? RED : GOOD, on: true }));
      const creep = R.out[4].res === 'missed';
      mail.forEach((e, i) => { e.visible = i < (creep ? 30 : 1); });
      said.userData.set({ color: GOOD, on: true }); truth.userData.set({ color: R.claimed ? RED : GOOD, on: true });
      bell.userData.set({ n: R.alerts, colors: Array(6).fill(RED) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Validate arguments against the catalogue', short: 'Arguments', get: () => st.args, set: v => set({ args: !!v }) },
      { type: 'toggle', label: 'Re-check the task\'s constraints each step', short: 'Constraints', get: () => st.constraints, set: v => set({ constraints: !!v }) },
      { type: 'toggle', label: 'Re-probe state after every write', short: 'Re-probe', get: () => st.reprobe, set: v => set({ reprobe: !!v }) },
      { type: 'toggle', label: 'Check actions against the task\'s scope', short: 'Scope', get: () => st.scope, set: v => set({ scope: !!v }) },
      { type: 'toggle', label: 'Monitor content, not just crashes', short: 'Content checks', get: () => st.content, set: v => set({ content: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Caught', get: () => ({ v: `${R.caught} of 4`, sub: 'failures in this run', good: R.caught === 4, bad: R.caught < 4 }) },
      { label: 'Blast radius', get: () => ({ v: `${R.systems} systems`, sub: 'touched by mistakes', good: !R.systems, bad: R.systems > 0 }) },
      { label: 'Alerts', get: () => ({ v: String(R.alerts), sub: st.content ? 'content checks' : 'crash-only', bad: !st.content && R.missed > 0 }) },
    ];
    const labels = [
      { name: 'run', t: 'The run', d: 'A parcel per step. Blue fine, amber caught at its gate, red got through. Gates: blue arguments, purple constraints, teal re-probe, gold scope', icon: 'link', atV: V(-3.0, 0.2, BZ) },
      { name: 'alerts', t: 'Alerts raised', d: 'A red disc per alert. Crash-only monitoring raises none: nothing here crashed', icon: 'eye', atV: V(-1.45, 0.2, 0.75) },
      { name: 'cascade', t: 'What got hit', d: 'Order system, warehouse, invoices, lorry: red when the made-up code reached them. Envelopes: emails sent. Two lamps: what the agent said, and what is true', icon: 'box', atV: V(3.15, 0.3, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip argument checks', hint: 'a made-up product code', on: () => set({ ...D0, args: false }), off: reset },
      { label: 'Trust the tool\'s reply', hint: 'no re-probe', on: () => set({ ...D0, reprobe: false }), off: reset },
      { label: 'Alert only on crashes', hint: 'and drop the gates', on: () => set({ args: false, constraints: false, reprobe: false, scope: false, content: false }), off: reset },
    ];
    function status() {
      if (!st.content && R.missed) return { ok: false, msg: `<b>${R.missed} failures got through and crash-only monitoring raised ${R.alerts} alerts: none of them crashed.</b> A made-up code, a banned supplier, a false "Order placed" and 30 stray emails all look like valid output. Monitoring has to check content against the environment, against a last-known-good baseline.` };
      if (!st.args) return { ok: false, msg: `<b>The made-up code JC-20X reached the order system and set off a cascade: warehouse space reserved, an invoice raised, a lorry booked: ${R.systems} systems touched by one hallucinated argument.</b> Validate arguments against what exists (the catalogue) before the call; a cheap check at step 2 prevents an incident across four systems.` };
      if (!st.reprobe) return { ok: false, msg: '<b>The order call returned 400 "supplier not approved", and the agent reported "Order placed ✓".</b> Agents close the loop by claiming success. After every write, re-probe the state: does the order exist? Trust the system of record, not the agent\'s summary or the tool\'s message.' };
      if (R.missed) return { ok: false, msg: `<b>${R.missed} failure${R.missed > 1 ? 's' : ''} got through: ${R.out.filter(o => o.res === 'missed').map(o => NAMES[o.s.fail]).join(', ')}.</b> Each gate catches one kind: constraints catch context loss, scope catches extra actions.` };
      return { ok: true, msg: '<b>All four failures caught at their step: the made-up code, the banned supplier, the false success and the 30 extra emails.</b> The agent recovered, created PO 1182 with an approved supplier, re-probed it, and told one manager. No system was touched by a mistake.' };
    }
    return { update: dt => { bot.userData.tick(dt); bot.userData.set({ busy: true }); steps.forEach(T => T.g && T.g.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An ordinary task', home: true, say: 'A restocking agent in Mombasa must order forty jerrycans from an approved supplier, then tell the store manager.', act: m => m.set({ args: true, constraints: true, reprobe: true, scope: true, content: true }) },
    { t: 'A made-up code', home: true, say: 'It invents a product code. Unchecked, the order reserves space, raises an invoice and books a lorry: one mistake, four systems.', act: m => m.set({ args: false }) },
    { t: 'A forgotten rule', home: true, say: 'Later it forgets the rule it was given at the start: approved suppliers only.', act: m => m.set({ args: true, constraints: false }) },
    { t: 'Success on an error', home: true, say: 'The order fails with an error, and the agent reports success anyway. Only checking the order system shows the truth.', act: m => m.set({ constraints: true, reprobe: false }) },
    { t: 'Doing too much', home: true, say: 'It emails all thirty store managers, when the task named one.', act: m => m.set({ reprobe: true, scope: false }) },
    { t: 'Gates and monitoring', home: true, say: 'A gate at each step catches each failure. And monitoring must read content: none of these failures crashed.', act: m => m.set({ scope: true }) },
  ],
  check: [
    { q: 'Why are cascading errors the most dangerous?', options: ['One bad call triggers others across systems', 'They crash the agent', 'They are slow'], answer: 0, why: 'A phantom code touched four systems.', hint: 'Try Skip argument checks.' },
    { q: 'The tool returned an error and the agent says "done". What catches it?', options: ['Re-probing the state after the write', 'Trusting the summary', 'A bigger model'], answer: 0, why: 'Check the system of record.', hint: 'Try Trust the tool\'s reply.' },
    { q: 'Why is crash-only monitoring not enough?', options: ['Most agent failures produce valid-looking output', 'Agents never crash', 'Crashes are rare'], answer: 0, why: 'Check content against the environment.', hint: 'Try Alert only on crashes.' },
  ],
  terms: [
    ['Hallucinated action', 'A call to a tool or with arguments that don\'t exist.'],
    ['Cascading error', 'One wrong call that sets off others downstream.'],
    ['Scope creep', 'An agent doing more than it was asked.'],
    ['Context loss', 'Forgetting a constraint from earlier in a long task.'],
    ['Success hallucination', 'Reporting success after a failure.'],
    ['Verification gate', 'A check grounded in the environment at a step.'],
  ],
  deeper: '<p><b>Taxonomies.</b> A Berkeley study sorted multi-agent failures into 14 modes in three groups (specification, inter-agent misalignment, verification), with annotators agreeing at a kappa of 0.88; industry taxonomies add security failures such as memory poisoning.</p><p><b>Monitoring well.</b> Keep a baseline to compare against, cluster similar failures, and rate-limit pages so people still read them.</p><p><b>About this machine.</b> The run is a fixed trace; which failures each gate catches, the systems a cascade touches and the alerts are computed live from the toggles.</p>',
  code: {
    title: 'Gate every step on the environment',
    note: 'Adapted from the course\'s failure-modes lesson.',
    text: `
def gated_call(task, call, env):
    if call.tool not in env.tools:
        return reject("no such tool")
    if not env.validate_args(call):                  # e.g. the SKU exists
        return reject("arguments don't match what exists")
    if not task.allows(call):                        # scope and constraints
        return reject("outside the task")
    result = env.execute(call)
    if call.writes and not env.probe(call.expected_state):
        return reject("tool said ok, state says no")  # success hallucination
    return result
`,
  },
};
