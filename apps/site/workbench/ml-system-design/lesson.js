// ML system design: a pharmacy chain wants to restock shelves before medicines run out. The system is drawn as a city of blocks:
// data in, features, the model, a decision that uses the prediction, metrics on three levels, and a safe rollout.
// Each design choice changes the cost, the delay and the business result. Money in the learner's currency.
// Break it: predict without anyone acting on it, score every shop live every second (cost), and a feedback loop (stock only what sold).
const SHOPS = 400;

export default {
  slug: 'ml-system-design',
  title: 'ML system design: from a goal to a running system',
  description: 'A pharmacy chain wants fewer empty shelves. Design the whole system, not just the model: what to predict, who acts on it, how often to run it, what it costs, which numbers to watch, and how to roll it out safely. Then build a prediction nobody uses, score live around the clock, and let the model starve its own data.',
  overview: 'A model is a small part of a machine-learning system. The design starts from a business goal (fewer stock-outs), turns it into a prediction (how many packs each shop will sell next week) and a decision that uses it (the reorder), and checks that a simple rule wouldn\'t do. Then come the practical choices: batch or live scoring, how fresh the data must be, what it costs, which metrics to watch at three levels (model, business, guardrail), and how to roll out with a safe fallback. Systems also change their own data, which can quietly trap them.',
  keywords: ['ml system design', 'batch vs online inference', 'ml metrics business guardrail', 'feedback loop', 'canary rollout'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.5, 0], dir: [0.2, 1.1, 1.3], half: 3, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'batch', act: true, rollout: 'canary', loop: false, t: 0, week: 0 };
    /* ---------- the blocks of the system ---------- */
    const BLOCKS = [
      { k: 'data', n: 'Sales data', x: -2.9, z: -0.6, c: '#5B4636' },
      { k: 'feat', n: 'Features', x: -1.7, z: -0.6, c: '#1C9A94' },
      { k: 'model', n: 'Model', x: -0.5, z: -0.6, c: '#8A3F8E' },
      { k: 'act', n: 'Reorder', x: 0.7, z: -0.6, c: '#E3A72F', ink: '#151827' },
      { k: 'shelf', n: 'Shelves', x: 1.9, z: -0.6, c: '#3E9B5F' },
      { k: 'roll', n: 'Rollout', x: -0.5, z: 0.8, c: '#3D6BD6' },
      { k: 'metrics', n: 'Metrics', x: 1.9, z: 0.8, c: '#2C2D31' },
    ];
    const blocks = {};
    for (const b of BLOCKS) {
      const g = new THREE.Group(); g.position.set(b.x, 0, b.z); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: b.c });
      const box = P.box(0.95, 0.42, 0.8, b.c, { r: 0.08, material: m }); g.add(box);
      const t = S.text(b.n.toUpperCase(), { size: 0.12, weight: 800, color: b.ink || '#FFFFFF', maxW: 0.88 }); t.position.set(0, 0.425, -0.18); g.add(t);
      const f = S.text(b.n, { size: 0.1, face: 'front', weight: 800, color: b.ink || '#FFFFFF', maxW: 0.88 }); f.position.set(0, 0.21, 0.405); g.add(f);
      const v = S.text('', { size: 0.085, weight: 750, color: b.ink || '#FFFFFF', maxW: 0.88, maxH: 0.3 }); v.position.set(0, 0.425, 0.15); g.add(v);
      blocks[b.k] = { g, m, v, b };
    }
    const links = [['data', 'feat'], ['feat', 'model'], ['model', 'act'], ['act', 'shelf'], ['shelf', 'data'], ['model', 'roll'], ['shelf', 'metrics']].map(([a, b]) => {
      const A = blocks[a].b, B = blocks[b].b, back = a === 'shelf' && b === 'data';
      const pts = back ? [V(B.x + 0, 0.25, -1.05), V(A.x, 0.25, -1.05)].map((p, i) => i ? V(A.x, 0.25, A.z - 0.42) : V(B.x, 0.25, B.z - 0.42)) : [V(A.x, 0.22, A.z), V(B.x, 0.22, B.z)];
      const curve = back ? new THREE.CatmullRomCurve3([V(A.x, 0.25, A.z - 0.42), V(A.x, 0.25, -1.4), V(B.x, 0.25, -1.4), V(B.x, 0.25, B.z - 0.42)]) : new THREE.LineCurve3(V(A.x + (B.x > A.x ? 0.48 : 0), 0.22, A.z + (B.z > A.z ? 0.4 : 0)), V(B.x - (B.x > A.x ? 0.48 : 0), 0.22, B.z - (B.z > A.z ? 0.4 : 0)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.03, 6, false), P.mat('#B9B6AE')); S.add(tube);
      const flow = P.flow(curve, 4, back ? C.orange : C.gold, { r: 0.05, speed: 0.5 }); S.add(flow.mesh);
      return { a, b, tube, flow, back };
    });
    const loopT = S.text('next week\'s training data', { size: 0.1, weight: 800, maxW: 2.5 }); loopT.position.set(-0.5, 0.105, -1.55); S.add(loopT);
    /* ---------- the economics ---------- */
    const CALLS = { batch: SHOPS * 300, live: SHOPS * 300 * 86400 * 7 / 300 };   // once a week per product, or every five minutes
    // example cloud prices: a batch job runs one hour a week on one machine; live scoring keeps two machines up all week
    const cost = () => st.mode === 'batch' ? 6 : 2 * 5.65 * 168;
    // stock-outs a week across the chain, by design choice
    function stockouts() {
      if (!st.act) return 260;                         // the old rule: same order every week
      let s = 95;
      if (st.loop) s += st.week * 9;                   // the model can't learn demand it never let happen
      if (st.rollout === 'all' && st.week < 2) s += 40; // a bad first week hits every shop
      return Math.min(400, s);
    }
    function update(dt, t) {
      st.t += dt; if (st.t > 2.5) { st.t = 0; st.week = Math.min(10, st.week + 1); }
      links.forEach(l => { l.flow.on = !(l.a === 'model' && l.b === 'act' && !st.act); l.flow.speed = st.mode === 'live' && (l.a === 'feat' || l.a === 'data') ? 2.2 : 0.5; l.flow.tick(dt); l.tube.material = P.mat(l.back && st.loop ? C.red : !st.act && l.a === 'model' && l.b === 'act' ? '#E6E2D8' : '#B9B6AE'); });
      blocks.model.v.userData.set(st.mode === 'batch' ? 'weekly batch' : 'live, every 5 min');
      blocks.act.v.userData.set(st.act ? 'uses the forecast' : 'ignores it');
      blocks.act.m.color.set(st.act ? '#E3A72F' : '#D8D4C8');
      blocks.roll.v.userData.set({ shadow: 'shadow', canary: '5% of shops first', all: 'all shops at once' }[st.rollout]);
      blocks.metrics.v.userData.set(`${stockouts()} empty shelves`);
      blocks.feat.v.userData.set(st.loop ? 'sales = demand?' : 'sales + stock levels');
      blocks.shelf.m.color.set(stockouts() > 200 ? C.red : stockouts() > 120 ? C.orange : '#3E9B5F');
    }
    const controls = [
      { type: 'buttons', label: 'Score the shops', options: ['Weekly batch', 'Live, every 5 minutes'], get: () => st.mode === 'batch' ? 0 : 1, act: i => { st.mode = i ? 'live' : 'batch'; } },
      { type: 'toggle', label: 'The reorder uses the forecast', short: 'Acted on', get: () => st.act, set: v => { st.act = v; } },
      { type: 'buttons', label: 'Roll out', options: ['Shadow', 'Canary (5%)', 'All at once'], get: () => ['shadow', 'canary', 'all'].indexOf(st.rollout), act: i => { st.rollout = ['shadow', 'canary', 'all'][i]; st.week = 0; } },
      { type: 'toggle', label: 'Train only on what sold', short: 'Sales only', get: () => st.loop, set: v => { st.loop = v; st.week = 0; }, quick: false },
    ];
    const readouts = [
      { label: 'Empty shelves a week', get: () => { const s = stockouts(); return { v: s, sub: 'across 400 shops', good: s <= 100, bad: s > 150 }; } },
      { label: 'Running cost a week', get: () => ({ v: S.money.of(cost()), sub: `${Math.round(CALLS[st.mode] / 1000).toLocaleString('en-GB')} thousand predictions`, bad: cost() > 100 }) },
    ];
    const labels = [
      { name: 'goal', t: 'Goal: fewer empty shelves', d: 'The business result, measured on the shelves', icon: 'target', atV: V(2.37, 0.42, -0.6) },
      { name: 'decision', t: 'A decision that uses it', d: 'The reorder acts on the forecast', icon: 'check', atV: V(0.22, 0.42, -0.6) },
      { name: 'loop', t: 'The system feeds itself', d: 'What happens becomes next week\'s data', icon: 'link', atV: V(-2.42, 0.25, -1.4) },
      { name: 'rollout', t: 'A safe rollout', d: 'Shadow, then a few shops, then all', icon: 'spark', atV: V(-0.97, 0.42, 0.8) },
    ];
    const reset = () => { Object.assign(st, { mode: 'batch', act: true, rollout: 'canary', loop: false, week: 0 }); };
    const breaks = [
      { label: 'Nobody acts on the forecast', hint: 'The reorder ignores it', on: () => { reset(); st.act = false; }, off: reset },
      { label: 'Score every shop live', hint: 'Every five minutes, for a weekly order', on: () => { reset(); st.mode = 'live'; }, off: reset },
      { label: 'Train only on what sold', hint: 'Empty shelves record zero sales', on: () => { reset(); st.loop = true; st.week = 6; }, off: reset },
    ];
    function status() {
      const s = stockouts();
      if (!st.act) return { ok: false, msg: `<b>A perfect forecast, and nothing changes.</b> The reorder still sends the same quantities every week, so ${s} shelves still run empty. A prediction only matters if a decision uses it: design the decision first, then the model.` };
      if (st.mode === 'live') return { ok: false, msg: `<b>${S.money.of(cost())} a week to answer a weekly question.</b> Orders go out once a week, but the system rescores every product in every shop every five minutes on machines that never switch off: about ${Math.round(CALLS.live / 1e6)} million predictions a week instead of ${Math.round(CALLS.batch / 1000)} thousand, for the same empty-shelf count. Match how often you predict to how often someone decides.` };
      if (st.loop) return { ok: false, msg: `<b>The model starves its own data.</b> When a shelf is empty, sales are zero, and the model learns "nobody wants this here". It orders less, the shelf empties sooner, sales fall again: ${s} empty shelves and climbing. Record stock levels, and treat sales on empty-shelf days as unknown demand, not zero.` };
      if (st.rollout === 'all' && st.week < 2) return { msg: `<b>All 400 shops at once.</b> If the first week has a bug, every shop feels it. A shadow run (predict, don't act) and then a canary of a few shops find problems while they are small.` };
      return { ok: s <= 100 ? true : undefined, msg: `<b>${s} empty shelves a week, down from 260 under the old rule.</b> A weekly batch forecast per product and shop feeds the reorder, for about ${S.money.of(cost())} a week. ${st.rollout === 'shadow' ? 'In shadow mode it only predicts; nobody acts yet.' : 'It rolled out to 5% of shops first, with the old rule as the fallback.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p), currency: () => { } };
  },

  story: [
    { t: 'Start from the goal', home: true, say: 'A pharmacy chain with four hundred shops wants fewer empty shelves. That is the goal, and it is measured on the shelves, not in the model.', act: m => m.reset() },
    { t: 'Prediction and decision', focus: 'decision', zoom: 1.3, say: 'The machine learning task: forecast how many packs of each medicine every shop will sell next week. And the decision that uses it: the weekly reorder.' },
    { t: 'Nobody acting', home: true, say: 'Without that decision, even a perfect forecast changes nothing. Turn off the link and the shelves stay as empty as before.', act: m => m.set({ act: false }), wait: 5 },
    { t: 'Batch or live', home: true, say: 'Orders go out once a week, so a weekly batch of forecasts is enough. Scoring every shop every few minutes, on machines that never switch off, costs hundreds of times more, for the same result.', act: m => m.set({ act: true, mode: 'live' }), wait: 6 },
    { t: 'A loop that traps', focus: 'loop', zoom: 1.3, say: 'The system feeds itself: what sold becomes next week\'s data. But an empty shelf sells nothing, and a model that believes it orders even less. Record stock, not just sales.', act: m => m.set({ mode: 'batch', loop: true, week: 4 }), wait: 6 },
    { t: 'Roll out safely', focus: 'rollout', zoom: 1.3, say: 'Finally, roll out carefully: first in shadow, predicting without acting, then in five percent of shops, with the old rule ready as a fallback.', act: m => m.set({ loop: false, rollout: 'canary', week: 0 }) },
  ],
  check: [
    { q: 'What should an ML system design start from?', options: ['The business goal and the decision that will use the prediction', 'The biggest model available', 'The data that happens to exist'], answer: 0, why: 'A prediction only creates value through a decision that acts on it.' },
    { q: 'Orders are placed weekly. How often should the forecast run?', options: ['Weekly, in a batch', 'Every second, live', 'Once a year'], answer: 0, why: 'Match prediction frequency to decision frequency; live scoring here only adds cost.' },
    { q: 'Why is "train on sales" risky for restocking?', options: ['Empty shelves record zero sales, so the model learns demand is low', 'Sales data is too big', 'Sales are always accurate'], answer: 0, why: 'The system changes its own data: a feedback loop.' },
  ],
  terms: [
    ['Batch inference', 'Running the model on many cases at once on a schedule, saving the answers.'],
    ['Online inference', 'Running the model for each request as it arrives.'],
    ['Guardrail metric', 'A number that must not get worse while you improve the main one (for example, waste from expired stock).'],
    ['Feedback loop', 'When the model\'s decisions shape the data its next version learns from.'],
    ['Shadow / canary', 'Run the model without acting on it, then act for a small share of users first.'],
  ],
  deeper: '<p><b>Three layers of metrics.</b> Offline (forecast error on held-out weeks), business (empty shelves, sales) and guardrails (expired stock, delivery cost). A better offline score that hurts a guardrail is not an improvement.</p><p><b>Baselines first.</b> Compare with "order what sold last week" and with whatever people do today. If the model can\'t clearly beat them, the system isn\'t worth building.</p><p><b>Write it down.</b> A one-page design document (goal, prediction, decision, data, metrics, cost, rollout, failure modes) catches most mistakes before any code is written.</p>',
  code: {
    title: 'Back-of-the-envelope design numbers',
    note: 'Adapted from the course\'s system-design lesson. Prices are examples.',
    text: `
shops, products = 400, 300
machine_per_hour = 5.65          # example cloud price for one machine, in dollars

batch = {"predictions": shops * products, "machine_hours": 1}                 # one run a week
live = {"predictions": shops * products * 7 * 24 * 12, "machine_hours": 2 * 168}  # every 5 minutes, 2 machines always on

for name, d in [("batch", batch), ("live", live)]:
    print(f"{name:6s} {d['predictions']:>13,} predictions  ~{d['machine_hours'] * machine_per_hour:,.0f} a week")

design = {
    "goal": "fewer empty shelves",
    "prediction": "packs sold per product, shop and week",
    "decision": "weekly reorder quantity",
    "baseline": "order what sold last week",
    "guardrail": "expired stock must not rise",
    "rollout": ["shadow 2 weeks", "canary 5% of shops", "all shops"],
}
`,
  },
};
