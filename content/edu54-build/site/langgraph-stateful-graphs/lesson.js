// Durable execution (phase 14, lesson 13): a long run of a Kano seed distributor's month-end agent is forty steps. A crash hits at step c. Checkpoints saved every n steps
// decide where it resumes, what is repeated, and whether the payment at step 30 goes out twice. Blocks are steps; the shelf holds checkpoints; the jar is repeated work.
const STEPS = 40, PAY = 30, SAVE = 0.3, STEP = 1;
function run(o) {
  const every = o.every, last = every ? Math.floor((o.crash - 1) / every) * every : 0;
  const redo = o.crash ? o.crash - last : 0, saves = every ? Math.floor(STEPS / every) : 0;
  const payRepeat = o.crash > PAY && last < PAY ? 1 : 0, dup = payRepeat && !o.key ? 1 : 0;
  return { last, redo, saves, dup, payRepeat, lost: o.crash && !every ? o.crash : 0, cost: STEPS * STEP + redo * STEP + saves * SAVE };
}

export default {
  slug: 'langgraph-stateful-graphs',
  title: 'Durable graphs: resume at step 38, not step 1',
  description: 'A forty-step agent run dies near the end. Checkpoints decide what is lost, what repeats, and whether a payment goes out twice.',
  overview: 'When a forty-step run fails at step 38, you want to carry on from step 38. A stateful graph makes that possible: state is a typed object, nodes are functions that update it, and the runtime saves a checkpoint after each node. Resume is then one call with a session id. But resuming means re-running from the last save, so any step that changes the world may run twice unless it is idempotent. This lesson runs the month-end job of a seed distributor in Kano, and lets you choose how often to save, where it crashes, and whether the payment step is protected.',
  keywords: ['LangGraph', 'durable execution', 'checkpoints', 'state machine', 'idempotency', 'AI agents', 'human in the loop'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.3, -0.1], dir: [0.06, 0.95, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v * 0.02);
    const D0 = { crash: 38, every: 1, key: true, pause: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const SX = i => -2.3 + (i % 20) * 0.243, SZ = i => i < 20 ? -0.42 : 0.12;
    const cells = Array.from({ length: STEPS }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.2, 0.2, 0.4, '#fff', { r: 0.03, material: m }); b.position.set(SX(i), 0.03, SZ(i)); S.add(b); return { b, m }; });
    const bed = P.box(5, 0.03, 1.15, '#D8D2C4', { r: 0.03 }); bed.position.set(0, 0, -0.15); S.add(bed);
    const rails = [[-0.42, SZ(0)], [0.12, SZ(20)]];
    const crate = add(P.robot(SAF, { scale: 0.5 })); crate.userData.noFit = true; S.add(crate);
    const pin = P.cyl(0.06, 0.55, RED); pin.userData.noFit = true; S.add(pin);
    const payMark = P.box(0.26, 0.42, 0.46, SAF, { r: 0.03 }); payMark.position.set(SX(PAY - 1), 0, SZ(PAY - 1)); payMark.userData.noFit = true; S.add(payMark);
    const shelf = add(P.shelf(10, { cell: 0.27, d: 0.3, lh: 0.28 })); shelf.position.set(-1.1, 0, 0.8);
    const jar = add(P.jar(0.24, 0.6, { max: 12 })); jar.position.set(1.0, 0, 0.8);
    const paid = add(P.stack(0.42, 0.34, 0.14, { max: 2 })); paid.position.set(1.9, 0.03, 0.8);
    const tray = P.box(0.6, 0.03, 0.5, '#A87A4F', { r: 0.02 }); tray.position.set(1.9, 0, 0.8); S.add(tray);
    S.add(P.keep(-2.55, 2.55, 0.9, -0.75, 1.05));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      cells.forEach(({ b, m }, i) => {
        const n = i + 1, kept = n <= R.last, redo = n > R.last && n <= st.crash && st.crash > 0, late = n > st.crash;
        m.color.set(n === st.crash ? RED : kept ? GOOD : redo ? BAD : late ? BLUE : GREY);
        b.scale.y = st.every && n % st.every === 0 && st.every > 1 ? 1.7 : 1;
      });
      pin.position.set(SX(st.crash - 1), 0.2, SZ(st.crash - 1));
      shelf.userData.set({ fill: Array.from({ length: 10 }, (_, i) => i < Math.min(10, Math.ceil(R.saves / 4)) ? BLUE : null) });
      jar.userData.set({ n: Math.min(12, Math.ceil(R.redo / 3.4)) });
      paid.userData.set({ n: st.crash > PAY ? 1 + R.dup : 0, colors: [GOOD, RED] });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const EV = [1, 5, 10, 0];
    const controls = [
      { type: 'slider', label: 'Crash at step', min: 2, max: 40, step: 1, get: () => st.crash, set: v => set({ crash: v }) },
      { type: 'buttons', label: 'Save a checkpoint', options: ['Every step', 'Every 5', 'Every 10', 'Never'], get: () => EV.indexOf(st.every), act: i => set({ every: EV[i] }) },
      { type: 'toggle', label: 'Payment step carries an idempotency key', short: 'Key', get: () => st.key, set: v => set({ key: !!v }) },
    ];
    const readouts = [
      { label: 'Resumes from', get: () => ({ v: st.every ? `step ${R.last + 1}` : 'step 1', sub: `${R.redo} steps run again`, good: R.redo <= 1, bad: R.redo > 10 }) },
      { label: 'Payments sent', get: () => ({ v: st.crash > PAY ? `${1 + R.dup}` : '0', sub: st.crash > PAY ? 'step 30 pays the supplier' : 'crashed before step 30', good: !R.dup, bad: !!R.dup }) },
      { label: 'Cost of the run', get: () => ({ v: M(R.cost), sub: `${R.saves} saves` }) },
    ];
    const labels = [
      { name: 'g', t: 'Forty steps', d: 'Teal: saved. Coral: run again', icon: 'link', atV: V(-2.3, 0.2, -0.42) },
      { name: 'c', t: 'Checkpoint shelf', d: 'State saved after a step', icon: 'box', atV: V(-2.0, 0.3, 0.8) },
      { name: 'p', t: 'Supplier payments', d: 'Red: paid twice', icon: 'money', atV: V(2.1, 0.2, 0.9) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No checkpoints', hint: 'start again from step 1', on: () => set({ ...D0, every: 0 }), off: reset },
      { label: 'Save only every ten steps', hint: 'crash just before the next save', on: () => set({ ...D0, every: 10, crash: 39 }), off: reset },
      { label: 'Resume over an unprotected payment', hint: 'step 30 runs again', on: () => set({ ...D0, every: 10, crash: 34, key: false }), off: reset },
    ];
    function status() {
      if (R.dup) return { ok: false, msg: `<b>The supplier was paid twice.</b> The last save was step ${R.last}, before the payment at step ${PAY}, so resuming ran step ${PAY} again. A checkpoint rewinds your state, not the world. A write that can repeat needs an idempotency key.` };
      if (!st.every) return { ok: false, msg: `<b>Nothing was saved, so ${st.crash} steps of work are gone.</b> The run starts again from step 1 and pays for all of them twice. Retrying around a library that assumes a fresh start is how teams end up here.` };
      if (R.redo > 5) return { ok: false, msg: `<b>Saved at step ${R.last}, crashed at ${st.crash}: ${R.redo} steps run again.</b> Fewer saves cost less on a good day and more on a bad one. Save after anything slow or expensive.` };
      return { ok: true, msg: `<b>Crashed at step ${st.crash}, resumed from step ${R.last + 1}, ${R.redo} step${R.redo === 1 ? '' : 's'} repeated.</b> ${st.crash > PAY && R.payRepeat ? 'The payment ran again, and its key made the repeat harmless.' : 'State was on the shelf, so recovery was one load call.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.35) % 1;
        const a = Math.floor(R.last + (st.crash - R.last) * u), i = Math.max(0, Math.min(STEPS - 1, a));
        crate.position.set(SX(i), 0.26, SZ(i) + 0.05);
      },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Forty steps', home: true, say: 'A seed distributor in Kano runs a month-end agent. Forty steps: read orders, check stock, pay suppliers, write reports.', act: m => m.set({ crash: 38, every: 1, key: true }) },
    { t: 'A crash, no saves', home: true, say: 'Step 38 fails. With no checkpoints, everything is lost and the whole run starts again.', act: m => m.set({ crash: 38, every: 0, key: true }) },
    { t: 'Save after every node', home: true, say: 'A stateful graph saves its state after every node. Resume is one call, and only the failed step runs again.', act: m => m.set({ crash: 38, every: 1, key: true }) },
    { t: 'How often to save', home: true, say: 'Saves are not free, so some teams save less often. Crash just before the next save and those steps repeat.', act: m => m.set({ crash: 39, every: 10, key: true }) },
    { t: 'Rewinding is not undoing', home: true, say: 'Step 30 pays a supplier. Resume from before it, and the payment runs again. A checkpoint rewinds your state, not the bank.', act: m => m.set({ crash: 34, every: 10, key: false }) },
    { t: 'Safe to repeat', home: true, say: 'Give the payment an idempotency key, and the repeat counts once. Durable runs need steps that are safe to do twice.', act: m => m.set({ crash: 34, every: 10, key: true }) },
  ],
  check: [
    { q: 'Where does a run resume from?', options: ['The step after the last checkpoint', 'The step that failed, always', 'Step 1, always'], answer: 0, why: 'Everything after the last save runs again.', hint: 'Move Crash at step.' },
    { q: 'Why can resuming pay a supplier twice?', options: ['A checkpoint rewinds state, not the world', 'Payments are slow', 'The graph has a loop'], answer: 0, why: 'The bank doesn\'t know you rewound.', hint: 'Try Resume over an unprotected payment.' },
    { q: 'What makes a repeated write safe?', options: ['An idempotency key', 'More retries', 'A bigger model'], answer: 0, why: 'With a key, the second call counts as the first.', hint: 'Switch on Key.' },
  ],
  terms: [
    ['State', 'A typed object every node reads and updates.'],
    ['Node', 'One function in the graph.'],
    ['Conditional edge', 'A rule that picks the next node from the state.'],
    ['Checkpoint', 'A saved copy of state after a node.'],
    ['Durable execution', 'A run that survives crashes and resumes.'],
    ['Idempotent', 'Safe to do twice; the second time changes nothing.'],
  ],
  deeper: '<p><b>Streaming and pauses come free.</b> Because state is saved between nodes, a graph can stream each node\'s update and can stop before a risky node for a person to inspect or edit the state.</p><p><b>Long-term memory is separate.</b> A checkpoint belongs to one run. Facts that should last across runs go to a separate store.</p><p><b>Three shapes.</b> The same model supports a supervisor, peers handing off, or nested subgraphs. The multi-agent lessons compare them.</p>',
  code: {
    title: 'Run a graph with a checkpointer',
    note: 'Adapted from the course\'s stdlib state graph (code/main.py).',
    text: `
def run(graph, session, store):
    state, node = store.load(session) or (graph.initial(), graph.start)
    while node != END:
        update = graph.nodes[node](state)        # nodes return a partial update
        state = {**state, **update}
        node = graph.next(node, state)
        store.save(session, state, node)         # after every node
    return state

def pay_supplier(state):
    bank.pay(state["invoice"], key=state["run_id"] + ":pay")  # safe to repeat
    return {"paid": True}
`,
  },
};
