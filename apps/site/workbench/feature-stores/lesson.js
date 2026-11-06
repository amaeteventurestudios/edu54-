// Feature stores: a mobile-money fraud model needs "transfers in the last hour" for each customer. Two kitchens compute it:
// the training pipeline from yesterday's logs, the live app from today's stream. A feature store computes it once and serves both,
// with point-in-time lookups so training only sees what was known at the moment of each transfer.
// Break it: two codebases (the live app counts the last 24 hours by mistake), a training join that looks into the future, a stale cache.
const CUSTOMERS = [{ n: 'Halima', v: 2 }, { n: 'Kwame', v: 5 }, { n: 'Zainab', v: 1 }, { n: 'Chidi', v: 14 }];

export default {
  slug: 'feature-stores',
  title: 'Feature stores: one recipe for training and serving',
  description: 'A mobile-money fraud model uses "transfers in the last hour". Training computes it one way from old logs, the live app another way from the stream, and the two quietly disagree. Put one feature store between them, then let the training join peek at the future, and let the cache go stale.',
  overview: 'Features are often computed twice: once in a batch pipeline for training, once in the live system for predictions, usually by different people in different code. Small differences (the last hour against the last 24 hours, a different time zone) mean the model sees different numbers in production than it learned on, and silently performs worse. A feature store holds one definition of each feature, computes it once, serves it to both, and answers training questions "as of" each past moment so no future information leaks in.',
  keywords: ['feature store', 'training serving skew', 'point in time join', 'feature freshness', 'mlops'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.12, 1.15, 1.25], half: 2.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { store: true, twoCode: false, future: false, stale: false, pick: 3 };
    /* ---------- three buildings: training, the store, the live app ---------- */
    function building(x, name, col, ink = '#FFFFFF') {
      const g = new THREE.Group(); g.position.set(x, 0, -0.4); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: col });
      const b = P.box(1.4, 0.8, 1.1, col, { r: 0.08, material: m }); g.add(b);
      const t = S.text(name.toUpperCase(), { size: 0.12, weight: 800, color: ink, maxW: 1.3 }); t.position.set(0, 0.805, -0.3); g.add(t);
      const f = S.text(name, { size: 0.11, face: 'front', weight: 800, color: ink, maxW: 1.3 }); f.position.set(0, 0.62, 0.555); g.add(f);
      const v = S.text('', { size: 0.095, weight: 750, color: ink, font: '"JetBrains Mono", monospace', maxW: 1.3, maxH: 0.5 }); v.position.set(0, 0.805, 0.15); g.add(v);
      return { g, m, v };
    }
    const train = building(-2.4, 'Training', '#5B5F73'), store = building(0, 'Feature store', '#1C9A94'), live = building(2.4, 'Live app', '#2C2D31');
    const recipes = [-2.4, 2.4].map(x => { const r = P.box(0.9, 0.06, 0.5, '#F7F5EE', { r: 0.03 }); r.position.set(x, 0.81, -0.15); r.userData.noFit = true; S.add(r); const t = S.text('', { size: 0.08, weight: 800, color: '#151827', font: '"JetBrains Mono", monospace', maxW: 0.86, maxH: 0.44 }); t.position.set(x, 0.875, -0.15); t.userData.noFit = true; S.add(t); return { r, t }; });
    const pipes = [[-1.7, -0.7], [0.7, 1.7]].map(([a, b]) => { const r = P.rod(V(a, 0.45, -0.4), V(b, 0.45, -0.4), 0.05, '#B9B6AE'); S.add(r); return r; });
    const flows = [[-0.7, -1.7], [0.7, 1.7]].map(([a, b]) => { const f = P.flow(new THREE.LineCurve3(V(a, 0.45, -0.4), V(b, 0.45, -0.4)), 4, C.gold, { r: 0.06, speed: 0.6 }); S.add(f.mesh); return f; });
    /* ---------- the timeline under training: past transfers, and the moment of one transfer ---------- */
    const tl = P.box(5.4, 0.06, 0.6, '#F1EEE6', { r: 0.04 }); tl.position.set(0, 0, 0.85); S.add(tl);
    const marks = [...Array(18)].map((_, i) => { const t = i / 17, b = P.box(0.08, 0.16, 0.16, '#3D6BD6', { r: 0.02 }); b.position.set(-2.6 + t * 5.2, 0.06, 0.85); S.add(b); return { b, t }; });
    const now = P.box(0.04, 0.5, 0.6, C.plum, { r: 0 }); now.position.set(0.4, 0.06, 0.85); S.add(now);
    const win = P.box(1, 0.02, 0.5, C.gold, { r: 0, m: { opacity: 0.45 } }); win.material.depthWrite = false; win.userData.noFit = true; S.add(win);
    const tlT = S.text('one customer\'s transfers · purple: the moment of the transfer being scored', { size: 0.085, weight: 800, color: '#151827', maxW: 5 }); tlT.position.set(0, 0.065, 1.25); S.add(tlT);
    /* ---------- the feature for one customer ---------- */
    const cust = () => CUSTOMERS[st.pick];
    const trainVal = c => st.future ? c.v + 3 : c.v;                       // a future-peeking join also counts transfers after the moment
    const liveVal = c => st.store ? (st.stale ? Math.max(0, c.v - 4) : c.v) : (st.twoCode ? c.v * 6 + 3 : c.v);   // the other codebase counts 24 hours
    function update(dt) {
      const c = cust();
      flows.forEach(f => { f.on = st.store; f.tick(dt); });
      pipes.forEach(p => { p.material = P.mat(st.store ? C.teal : '#D8D4C8'); });
      store.g.visible = st.store;
      recipes.forEach((r, i) => { r.r.visible = r.t.visible = !st.store; r.t.userData.set(i === 0 ? 'count(transfers,\n  last 1 hour)' : st.twoCode ? 'count(transfers,\n  last 24 hours)' : 'count(transfers,\n  last 1 hour)'); r.r.material = P.mat(i === 1 && st.twoCode ? '#F4A99F' : '#F7F5EE'); });
      store.v.userData.set('one recipe:\ntransfers, last hour');
      train.v.userData.set(`${c.n}: ${trainVal(c)}`);
      live.v.userData.set(`${c.n}: ${liveVal(c)}`);
      train.m.color.set(st.future ? '#A4462A' : '#5B5F73'); live.m.color.set(liveVal(c) !== c.v ? '#A4462A' : '#2C2D31');
      // the window counted for training: the hour before the moment, or (peeking) an hour either side
      const w0 = st.future ? 0.4 - 0.75 : 0.4 - 0.75, w1 = st.future ? 0.4 + 0.75 : 0.4;
      win.position.set((w0 + w1) / 2, 0.08, 0.85); win.scale.x = w1 - w0;
      win.material.color.set(st.future ? C.red : C.gold);
      marks.forEach(m => { const x = -2.6 + m.t * 5.2, inWin = x >= w0 && x <= w1; m.b.material = P.mat(inWin ? (x > 0.4 ? C.red : C.gold) : '#3D6BD6'); });
    }
    const controls = [
      { type: 'toggle', label: 'Use one feature store', short: 'Feature store', get: () => st.store, set: v => { st.store = v; st.stale = false; } },
      { type: 'buttons', label: 'Customer', options: CUSTOMERS.map(c => c.n), get: () => st.pick, act: i => { st.pick = i; } },
      { type: 'toggle', label: 'Training join may look past the moment', short: 'Peek ahead', get: () => st.future, set: v => { st.future = v; }, quick: false },
      { type: 'toggle', label: 'Live values from a stale cache', short: 'Stale cache', get: () => st.stale, set: v => { st.stale = v; if (v) st.store = true; }, quick: false },
    ];
    const readouts = [
      { label: 'Training saw', get: () => ({ v: `${trainVal(cust())} transfers`, bad: st.future }) },
      { label: 'Live app sends', get: () => { const l = liveVal(cust()); return { v: `${l} transfers`, bad: l !== cust().v, good: l === cust().v && !st.future }; } },
    ];
    const labels = [
      { name: 'train', t: 'Training', d: 'Computes features from old logs', icon: 'box', atV: V(-3.1, 0.8, -0.4) },
      { name: 'store', t: 'The feature store', d: 'One definition, served to both', icon: 'check', atV: V(-0.7, 0.8, -0.4), hide: () => !st.store },
      { name: 'live', t: 'The live app', d: 'Needs the same number, right now', icon: 'spark', atV: V(3.1, 0.8, -0.4) },
      { name: 'time', t: 'Point in time', d: 'Count only what was known at that moment', icon: 'target', atV: V(2.7, 0.06, 0.85) },
    ];
    const reset = () => { Object.assign(st, { store: true, twoCode: false, future: false, stale: false, pick: 3 }); };
    const breaks = [
      { label: 'Two codebases', hint: 'The live app counts 24 hours by mistake', on: () => { reset(); st.store = false; st.twoCode = true; }, off: reset },
      { label: 'A training join that peeks ahead', hint: 'Counts transfers after the moment too', on: () => { reset(); st.future = true; }, off: reset },
      { label: 'A stale cache', hint: 'Live values four hours old', on: () => { reset(); st.stale = true; }, off: reset },
    ];
    function status() {
      const c = cust();
      if (st.twoCode && !st.store) return { ok: false, msg: `<b>Same name, different numbers.</b> The training pipeline counts ${c.n}'s transfers in the last hour (${c.v}); the live app's code, written separately, counts the last 24 hours (${liveVal(c)}). The model learned that more than 10 an hour is suspicious, so in production almost everyone looks like a fraudster. One shared definition prevents this.` };
      if (st.future) return { ok: false, msg: `<b>Training peeked at the future.</b> The join counted ${c.n}'s transfers in the hour around each scored transfer, including the ones after it (red), so training saw ${trainVal(c)} where the live app, at that moment, can only know ${c.v}. The model leans on information it will never have live. Point-in-time lookups count only what was known before the moment.` };
      if (st.stale) return { ok: false, msg: `<b>Four-hour-old numbers.</b> The live app read ${c.n}'s count from a cache last refreshed four hours ago: ${liveVal(c)} instead of ${c.v}. A burst of transfers by a thief would be invisible exactly when it matters. Fresh features need a streaming update and a maximum age.` };
      if (!st.store) return { msg: `<b>Two codebases, agreeing for now.</b> Both compute "transfers in the last hour" correctly today. Every future change must be made twice, identically, forever.` };
      return { ok: true, msg: `<b>${c.n}: ${c.v} transfer${c.v === 1 ? '' : 's'} in the last hour, everywhere.</b> One feature store computes it from one definition, serves the same number to training and to the live app, and answers training questions as of each past moment.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'One number, two places', home: true, say: 'A mobile-money fraud model uses one key number: how many transfers a customer made in the last hour. Both training and the live app need it.', act: m => m.set({ store: false, twoCode: false }) },
    { t: 'Written twice', home: true, say: 'Often the number is computed twice: once by the training pipeline, once by the live app, by different teams in different code.', wait: 4 },
    { t: 'Quietly different', home: true, say: 'One day the live code counts the last twenty-four hours instead of the last hour. The model learned that ten an hour is suspicious, and now everyone looks like a thief.', act: m => m.set({ twoCode: true }), wait: 6 },
    { t: 'A feature store', focus: [0, 0.5, -0.3], zoom: 1.3, say: 'A feature store holds one recipe for each feature, computes it once, and serves the very same number to training and to the live app.', act: m => m.set({ store: true, twoCode: false }) },
    { t: 'Point in time', focus: [0, 0.2, 0.7], zoom: 1.3, say: 'For training it also answers as of each past moment: count only the transfers before the one being scored. Peek past that line and the model learns from the future.', act: m => m.set({ future: true }), wait: 6 },
    { t: 'Fresh, too', home: true, say: 'And live values must be fresh. A cache four hours old hides a thief\'s burst of transfers at exactly the wrong moment.', act: m => m.set({ future: false, stale: true }), wait: 5 },
  ],
  check: [
    { q: 'What is training–serving skew?', options: ['The model gets features computed differently in production than in training', 'Training takes longer than serving', 'Servers in different countries'], answer: 0, why: 'Same feature name, different numbers: the model\'s learned rules no longer fit.' },
    { q: 'What does a point-in-time lookup prevent?', options: ['Training on information from after the moment being predicted', 'Slow queries', 'Missing values'], answer: 0, why: 'It counts only what was known at that past moment, so no future leaks in.' },
    { q: 'Why does feature freshness matter for fraud?', options: ['A stale count can hide a sudden burst of transfers', 'Old data is smaller', 'It doesn\'t'], answer: 0, why: 'Fraud shows as rapid change; old numbers miss it.' },
  ],
  terms: [
    ['Feature store', 'A system that defines, computes, stores and serves features to both training and live predictions.'],
    ['Training–serving skew', 'A feature computed differently in production than in training.'],
    ['Point-in-time join', 'Looking up each feature as it was at a past moment, never later.'],
    ['Online / offline store', 'Fast storage for live lookups, and bulk storage for building training sets.'],
    ['Freshness', 'How recently a feature value was updated.'],
  ],
  deeper: '<p><b>Two stores, one definition.</b> An offline store keeps full history in a warehouse for training; an online store keeps only the latest value per customer in a fast key-value database. Both are filled by the same feature code.</p><p><b>Do you need one?</b> A small team with one model can share a feature module between training and serving and get most of the benefit. Feature stores pay off when many models reuse many features.</p><p><b>Log what you served.</b> Saving the exact features each live prediction used gives a perfect training set later, with no skew at all.</p>',
  code: {
    title: 'One feature definition, a point-in-time training set',
    note: 'Adapted from the course\'s feature-store lesson.',
    text: `
import pandas as pd

def transfers_last_hour(transfers, customer, at):
    # the one definition, used by training and by the live app
    window = transfers[(transfers.customer == customer) &
                       (transfers.time < at) &                       # strictly before: no peeking
                       (transfers.time >= at - pd.Timedelta(hours=1))]
    return len(window)

def training_rows(labelled_transfers, all_transfers):
    return pd.DataFrame({
        "count_1h": [transfers_last_hour(all_transfers, r.customer, r.time)
                     for r in labelled_transfers.itertuples()],
        "is_fraud": labelled_transfers.is_fraud.values,
    })
`,
  },
};
