// Monte Carlo control: a mango trader leaves Techiman each morning. First stop: Wenchi (close, steady sales) or Kintampo (further, bigger but riskier sales).
// Then stop there, or go on (Wenchi to Sunyani, Kintampo to Yeji) and lose some fruit to spoilage. Return = baskets sold minus baskets spoiled.
// The trader learns Q(state, action) by averaging the returns of whole trips (first-visit Monte Carlo), acting epsilon-greedily. Learning runs for real with a seeded
// random generator. Optionally Kintampo's market falls after trip 850 (a new market opens nearby).
// Break it: no exploration (stuck on the first route that worked), only 10 trips (noisy averages), a falling market with plain averaging (it never notices).
const TOWNS = { T: ['Techiman', -2.0, 0.1], A: ['Wenchi', -0.75, -0.65], B: ['Kintampo', -0.55, 0.85], C: ['Sunyani', 0.6, -0.95], E: ['Yeji', 0.75, 1.0] };
const ACTS = { T: [['A', 'to Wenchi'], ['B', 'to Kintampo']], A: [['stop', 'stop at Wenchi'], ['C', 'on to Sunyani']], B: [['stop', 'stop at Kintampo'], ['E', 'on to Yeji']] };
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
function sale(town, r, late) { const m = { A: [6, 1], B: [late ? 5 : 10, 3], C: [3, 1], E: [2, 1.5] }[town]; return Math.max(0, m[0] + m[1] * gauss(r)); }
const SPOIL = { A: 0, B: 1, C: 1, E: 3 };
function run(st) {
  const r = rng(11), Q = {}, N = {}, curve = [], n = [10, 200, 1000][st.n];
  const key = (s, a) => `${s}>${a}`, q = (s, a) => Q[key(s, a)] || 0;
  for (let ep = 0; ep < n; ep++) { const late = st.change && ep >= 850; let s = 'T'; const traj = []; let G = 0;
    while (s && ACTS[s]) { const acts = ACTS[s].map(a => a[0]); let a;
      if (r() < st.eps) a = acts[Math.floor(r() * acts.length)]; else { a = acts[0]; acts.forEach(x => { if (q(s, x) > q(s, a) + 1e-9) a = x; }); }
      let rew = 0, nxt = null;
      if (a === 'stop') rew = 0; else { rew = sale(a, r, late) - SPOIL[a]; nxt = a; }
      traj.push([s, a, rew]); s = nxt; }
    for (let t = traj.length - 1; t >= 0; t--) { G += traj[t][2]; const k = key(traj[t][0], traj[t][1]); N[k] = (N[k] || 0) + 1; const alpha = st.avg ? 1 / N[k] : 0.1; Q[k] = q(traj[t][0], traj[t][1]) + alpha * (G - q(traj[t][0], traj[t][1])); }
    curve.push(traj.reduce((a, x) => a + x[2], 0)); }
  const greedy = s => { const acts = ACTS[s].map(a => a[0]); let a = acts[0]; acts.forEach(x => { if (q(s, x) > q(s, a) + 1e-9) a = x; }); return a; };
  const route = ['T']; let s = 'T'; while (ACTS[s]) { const a = greedy(s); if (a === 'stop') break; route.push(a); s = a; }
  const last = curve.slice(-Math.min(100, curve.length)), avg = last.reduce((a, b) => a + b, 0) / last.length;
  const trueBest = st.change && n > 850 ? 'T-A-C' : 'T-B';
  return { Q, N, q, curve, route, avg, n, best: route.join('-') === trueBest, trueBest };
}

export default {
  slug: 'monte-carlo-methods',
  title: 'Monte Carlo: learn from whole trips',
  description: 'A mango trader leaves Techiman each morning for Wenchi or Kintampo, then stops or travels on. With no model of the markets, the trader learns which route pays by averaging what whole trips earned. Then never explore, learn from only ten trips, or keep averaging after a market falls.',
  overview: 'Dynamic programming needs the model; Monte Carlo methods learn from experience. Run whole episodes, here whole trading trips, and for each state and action you took, record the return that followed: everything sold minus everything spoiled until the trip ended. The value estimate is the average of those returns, kept as a running mean: new estimate = old + step × (return − old), with step 1/n for a true average. First-visit Monte Carlo counts only the first time a pair appears in an episode, which keeps the estimate unbiased. Monte Carlo control alternates evaluation and improvement like policy iteration: act, update averages from the finished trip, make the policy greedy. But it only learns about what it tries: a trader who always takes the first route that worked never finds the better market, so actions are chosen ε-greedily, with a small chance of trying something else. Averages from a handful of trips are noisy, especially for risky choices. And when the world changes, a plain average of everything ever seen moves slowly; a constant step size weights recent trips more and tracks the change, the step from Monte Carlo towards temporal-difference learning.',
  keywords: ['monte carlo', 'returns', 'epsilon-greedy', 'exploration', 'first-visit', 'constant step size'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.2, 1.05], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { n: 2, eps: 0.1, avg: false, change: false };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const land = P.box(3.7, 0.03, 2.7, '#D8CDA8', { r: 0.06 }); land.position.set(-0.75, 0.12, 0.1); S.add(land);
    const tp = k => V(TOWNS[k][1], 0.15, TOWNS[k][2]);
    /* towns */
    Object.entries(TOWNS).forEach(([k, [n]]) => { const d = P.cyl(0.17, 0.08, k === 'T' ? '#B5541C' : '#6B5E86'); d.position.copy(tp(k)); S.add(d);
      const t = S.text(n, { size: 0.12, weight: 800, color: ink }); t.position.copy(tp(k)).add(V(0, 0.0, 0.3)); S.add(t); });
    /* roads with a Q bar each, and a "stop" bar beside Wenchi and Kintampo */
    const roads = [['T', 'A'], ['T', 'B'], ['A', 'C'], ['B', 'E']].map(([a, b]) => { const mm = new THREE.MeshBasicMaterial({ color: '#8A7F6A' }), t = P.tube([tp(a), tp(b)], 0.03, '#8A7F6A', { material: mm }); t.layers.set(1); S.add(t);
      const mid = tp(a).lerp(tp(b), 0.5), bar = P.box(0.12, 1, 0.12, '#E07B39', { r: 0.01 }); bar.position.copy(mid); bar.userData.noFit = true; S.add(bar);
      const qt = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); qt.userData.noFit = true; S.add(qt); return { a, b, mm, t, bar, qt, mid }; });
    const stops = ['A', 'B'].map(k => { const p = tp(k).add(V(0.35, 0, 0)), bar = P.box(0.12, 1, 0.12, '#3A6FB0', { r: 0.01 }); bar.position.copy(p); bar.userData.noFit = true; S.add(bar);
      const flag = S.text('stop', { size: 0.08, weight: 800, color: '#3A6FB0' }); flag.position.copy(p).add(V(0, -0.02, 0.17)); S.add(flag);
      const qt = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); qt.userData.noFit = true; S.add(qt); return { k, bar, qt, p }; });
    /* learning curve on the right */
    const panel = P.box(1.75, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); panel.position.set(2.05, 0.12, 0.1); S.add(panel);
    const pH = S.text('Baskets per trip', { size: 0.11, weight: 800, color: '#6B5E86' }); pH.position.set(2.05, 0.18, -1.0); S.add(pH);
    const NB = 40, cb = Array.from({ length: NB }, (_, i) => { const b = P.box(0.032, 1, 0.05, '#1F9E89'); b.position.set(1.28 + i * 0.039, 0.17, -0.1); b.userData.noFit = true; S.add(b); return b; });
    const ax = P.box(1.56, 0.01, 0.01, ink); ax.position.set(2.05, 0.17, -0.07); S.add(ax);
    const chg = P.box(0.012, 0.6, 0.012, '#C62828'); chg.userData.noFit = true; S.add(chg);
    const pR = S.text('', { size: 0.13, weight: 800, color: ink, maxW: 1.6 }); pR.position.set(2.05, 0.18, 0.3); S.add(pR);
    const pA = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.6 }); pA.position.set(2.05, 0.18, 0.6); S.add(pA);
    const pM = S.text('', { size: 0.1, weight: 700, color: '#5E5E6E', maxW: 1.6 }); pM.position.set(2.05, 0.18, 0.9); S.add(pM);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null;
    const setBar = (bar, qt, pos, v, on) => { const h = Math.max(0.02, Math.min(0.9, v * 0.08)); bar.scale.y = h; bar.position.y = 0.15 + h / 2; qt.position.copy(pos).setY(0.15 + h + 0.12); qt.userData.set(v.toFixed(1)); bar.material.color.set(on ? '#E0A526' : bar === stops[0].bar || bar === stops[1].bar ? '#3A6FB0' : '#E07B39'); };
    function draw() {
      R = run(st);
      const rs = R.route.join('-'), stopAt = R.route[R.route.length - 1];
      roads.forEach(rd => { const on = rs.includes(`${rd.a}-${rd.b}`); rd.mm.color.set(on ? '#E0A526' : '#8A7F6A'); setBar(rd.bar, rd.qt, rd.mid, R.q(rd.a, rd.b), on); });
      stops.forEach(sp => setBar(sp.bar, sp.qt, sp.p, R.q(sp.k, 'stop'), stopAt === sp.k && R.route.length === 2));
      const per = Math.max(1, Math.ceil(R.curve.length / NB));
      cb.forEach((b, i) => { const seg = R.curve.slice(i * per, (i + 1) * per); b.visible = seg.length > 0; if (!seg.length) return; const v = seg.reduce((a, x) => a + x, 0) / seg.length, h = Math.max(0.01, Math.min(0.7, v * 0.07)); b.scale.y = h; b.position.y = 0.17 + h / 2; });
      chg.visible = st.change && R.n > 850; if (chg.visible) chg.position.set(1.28 + (850 / per) * 0.039, 0.47, -0.1);
      pR.userData.set(`Best route: ${R.route.map(k => TOWNS[k][0]).join(' → ')}`, R.best ? '#1D6B3A' : '#C62828');
      pA.userData.set(`Last ${Math.min(100, R.n)} trips: ${R.avg.toFixed(1)} baskets`);
      pM.userData.set(`${R.n} trips · ε = ${st.eps} · ${st.avg ? 'plain average' : 'step 0.1'}`);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Trips', options: ['10', '200', '1,000'], get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'Exploration ε', options: ['0', '0.1', '0.3'], get: () => [0, 0.1, 0.3].indexOf(st.eps), act: i => { st.eps = [0, 0.1, 0.3][i]; draw(); } },
      { type: 'buttons', label: 'Update', options: ['Plain average', 'Step 0.1'], get: () => (st.avg ? 0 : 1), act: i => { st.avg = !i; draw(); } },
      { type: 'buttons', label: 'Season', options: ['Steady', 'Kintampo falls at trip 850'], get: () => (st.change ? 1 : 0), act: i => { st.change = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Learned route', get: () => ({ v: R.route.map(k => TOWNS[k][0]).join('→'), sub: R.best ? 'the best one' : 'not the best', good: R.best, bad: !R.best }) },
      { label: 'Recent trips', get: () => ({ v: R.avg.toFixed(1), sub: `baskets, last ${Math.min(100, R.n)} trips` }) },
      { label: 'Kintampo tried', get: () => ({ v: String(R.N['T>B'] || 0), sub: 'times, of ' + R.n + ' trips', bad: !(R.N['T>B'] > 0) }) },
    ];
    const labels = [
      { name: 'map', t: 'Routes', d: 'Bars: average return · gold: chosen', icon: 'target', atV: V(-2.58, 0.2, 0.1) },
      { name: 'curve', t: 'Learning curve', d: 'Red line: the market falls', icon: 'wave', atV: V(2.93, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { n: 2, eps: 0.1, avg: false, change: false }); draw(); };
    const breaks = [
      { label: 'No exploration', hint: 'ε = 0', on: () => { reset(); st.eps = 0; draw(); }, off: reset },
      { label: 'Only 10 trips', hint: 'Tiny sample', on: () => { reset(); st.n = 0; draw(); }, off: reset },
      { label: 'Market falls, plain average', hint: 'Old trips weigh as much as new', on: () => { reset(); st.change = true; st.avg = true; draw(); }, off: reset },
    ];
    function status() {
      const route = R.route.map(k => TOWNS[k][0]).join(' → ');
      if (st.eps === 0 && !R.best) return { ok: false, msg: `<b>Stuck on ${route}.</b> With ε = 0 the trader always takes the route with the best average so far. Wenchi worked on the first morning, so Kintampo was tried ${R.N['T>B'] || 0} times and its better sales were never seen. Explore a little: with ε = 0.1 every route keeps getting tried.` };
      if (R.n === 10 && !R.best) return { ok: false, msg: `<b>Ten trips is not enough.</b> Kintampo's sales swing widely, so a couple of bad mornings drag its average below Wenchi's and the trader settles on ${route}. Monte Carlo averages need many episodes, more so for risky choices.` };
      if (st.change && st.avg && !R.best) return { ok: false, msg: `<b>Still going to Kintampo after its market fell.</b> A plain average weighs 850 good old trips as much as the new bad ones, so the estimate barely moves and recent trips earn ${R.avg.toFixed(1)} baskets. A constant step of 0.1 weights recent trips more and switches to Wenchi and Sunyani within a few dozen trips.` };
      if (!R.best) return { ok: false, msg: `<b>${route} is not the best route yet.</b> The averages have not settled; try more trips or a little more exploration.` };
      return { ok: true, msg: `<b>Learned: ${route}.</b> After ${R.n} trips the averages of whole-trip returns rank the routes correctly${st.change ? ', and the constant step noticed when Kintampo fell' : ''}; recent trips bring ${R.avg.toFixed(1)} baskets.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The trader', home: true, say: 'A mango trader leaves Techiman each morning for Wenchi or Kintampo, then stops or travels on and risks spoiled fruit.', act: m => m.set({ n: 2, eps: 0.1, avg: false, change: false }) },
    { t: 'Whole trips', home: true, say: 'There is no model of the markets. After each trip, every choice made is credited with what the rest of the trip earned.', act: m => m.set({}) },
    { t: 'Averages', home: true, say: 'Averaged over a thousand trips, the bars rank the routes, and the trader follows the best.', act: m => m.set({}) },
    { t: 'Never explore', home: true, say: 'Never try anything new, and the first route that worked is the only one ever learned.', act: m => m.set({ eps: 0 }) },
    { t: 'Ten trips', home: true, say: 'Learn from only ten trips, and a few bad mornings at a risky market mislead the averages.', act: m => m.set({ eps: 0.1, n: 0 }) },
    { t: 'Market falls', home: true, say: 'When Kintampo\'s market falls, a plain average of every trip ever made barely notices.', act: m => m.set({ n: 2, change: true, avg: true }) },
  ],
  check: [
    { q: 'What does Monte Carlo average to estimate a value?', options: ['Returns observed after whole episodes', 'One-step rewards', 'Model probabilities'], answer: 0, why: 'It needs no model.' },
    { q: 'Why explore with ε-greedy?', options: ['Otherwise untried actions are never learned about', 'To speed up each trip', 'To lower variance'], answer: 0, why: 'You only learn what you try.' },
    { q: 'Why use a constant step instead of a plain average?', options: ['It tracks a world that changes', 'It is unbiased', 'It needs fewer trips always'], answer: 0, why: 'Recent episodes weigh more.' },
  ],
  terms: [
    ['Episode', 'One complete run from start to end.'],
    ['Return', 'The total reward from a point to the end of the episode.'],
    ['Monte Carlo estimate', 'The average of observed returns.'],
    ['ε-greedy', 'Usually the best action, sometimes a random one.'],
    ['First-visit', 'Count only the first time a state appears in an episode.'],
    ['Step size', 'How far each new return moves the estimate.'],
  ],
  deeper: '<p><b>Markets that move.</b> Traders across Ghana\'s Bono East and beyond learn routes the same way: by trying, remembering what paid, and trying again, while new roads and new markets keep changing the answer.</p><p><b>Next.</b> Temporal-difference methods update after every step instead of waiting for the trip to end, using the next state\'s estimate in place of the rest of the return.</p><p><b>About this machine.</b> Learning runs for real with a seeded random generator; the markets and their sales are invented.</p>',
  code: {
    title: 'Monte Carlo control',
    note: 'Adapted from the course\'s Monte Carlo lesson.',
    text: `
def mc_control(env, episodes, eps=0.1, alpha=None):
    Q, N = defaultdict(float), defaultdict(int)
    for _ in range(episodes):
        traj, s = [], env.reset()
        while not env.done:
            a = random_action(s) if random() < eps else argmax(Q, s)
            s2, r = env.step(a)
            traj.append((s, a, r)); s = s2
        G = 0
        for s, a, r in reversed(traj):
            G += r
            N[s, a] += 1
            step = alpha or 1 / N[s, a]
            Q[s, a] += step * (G - Q[s, a])
    return Q
`,
  },
};
