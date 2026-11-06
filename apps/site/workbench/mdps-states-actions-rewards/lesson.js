// MDPs: a boda-boda rider in Kampala carries medicine from a depot to a clinic across a 6x5 grid of streets. The bottom row between them is a flooded swamp edge.
// States are cells, actions are the four moves, rain makes a move slip sideways, rewards are -1 per move (or +1 if paid per move), +10 at the clinic, -20 in the swamp.
// Values and the policy come from real value iteration (the Bellman equation); success rates and returns from 300 seeded simulated rides in the real weather.
// Break it: discount 0 (no look-ahead), paid per move (it never delivers), a plan that ignores the rain (it hugs the swamp edge and falls in).
const W = 6, H = 5, START = [0, 4], GOAL = [5, 4];
const SWAMP = new Set(['1,4', '2,4', '3,4', '4,4']);
const MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const GAMMAS = [0, 0.5, 0.9, 0.99];
const key = (x, y) => `${x},${y}`, term = (x, y) => SWAMP.has(key(x, y)) || (x === GOAL[0] && y === GOAL[1]);
function step(x, y, a) { const nx = Math.min(W - 1, Math.max(0, x + MOVES[a][0])), ny = Math.min(H - 1, Math.max(0, y + MOVES[a][1])); return [nx, ny]; }
function reward(nx, ny, pay) { if (SWAMP.has(key(nx, ny))) return -20; if (nx === GOAL[0] && ny === GOAL[1]) return 10; return pay ? 1 : -1; }
function outcomes(x, y, a, slip) { return [[a, 1 - slip], [(a + 1) % 4, slip / 2], [(a + 3) % 4, slip / 2]].filter(o => o[1] > 0); }
function solve(gamma, slip, pay) {
  let V = Array.from({ length: H }, () => Array(W).fill(0));
  for (let it = 0; it < 400; it++) { const N = V.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (term(x, y)) { N[y][x] = 0; continue; }
      N[y][x] = Math.max(...[0, 1, 2, 3].map(a => outcomes(x, y, a, slip).reduce((s, [b, p]) => { const [nx, ny] = step(x, y, b); return s + p * (reward(nx, ny, pay) + gamma * (term(nx, ny) ? 0 : V[ny][nx])); }, 0))); }
    V = N; }
  const pi = V.map((r, y) => r.map((_, x) => { if (term(x, y)) return -1; let best = 0, bv = -1e9;
    [0, 1, 2, 3].forEach(a => { const q = outcomes(x, y, a, slip).reduce((s, [b, p]) => { const [nx, ny] = step(x, y, b); return s + p * (reward(nx, ny, pay) + gamma * (term(nx, ny) ? 0 : V[ny][nx])); }, 0); if (q > bv + 1e-9) { bv = q; best = a; } }); return best; }));
  return { V, pi };
}
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function ride(pi, slip, pay, r, keepPath) { let [x, y] = START, G = 0; const path = [[x, y]];
  for (let t = 0; t < 40; t++) { const a = pi[y][x], u = r(), b = u < 1 - slip ? a : u < 1 - slip / 2 ? (a + 1) % 4 : (a + 3) % 4; [x, y] = step(x, y, b); G += reward(x, y, pay); if (keepPath) path.push([x, y]);
    if (term(x, y)) return { G, end: SWAMP.has(key(x, y)) ? 'swamp' : 'clinic', path }; }
  return { G, end: 'none', path }; }
function run(st) {
  const slip = st.rain ? 0.2 : 0, plan = solve(GAMMAS[st.g], st.knows ? slip : 0, st.pay), r = rng(7);
  let ok = 0, sw = 0, sum = 0; for (let i = 0; i < 300; i++) { const e = ride(plan.pi, slip, st.pay, r); if (e.end === 'clinic') ok++; if (e.end === 'swamp') sw++; sum += e.G; }
  const show = ride(plan.pi, slip, st.pay, rng(st.rain ? 5 : 3), true);
  return { ...plan, ok: ok / 300, sw: sw / 300, ret: sum / 300, show };
}

export default {
  slug: 'mdps-states-actions-rewards',
  title: 'MDPs: states, actions, rewards',
  description: 'A boda-boda rider in Kampala carries medicine across a grid of streets past a flooded swamp edge. Change the discount and the rain, and watch the best route move.',
  overview: 'Reinforcement learning problems are written as Markov decision processes. There are five parts: states (here, the cell the rider is in), actions (the four moves), transitions (the chance of each next state; in rain a move can slip sideways), rewards (a small cost per move, a prize at the clinic, a big penalty in the swamp) and a discount between 0 and 1 that says how much later rewards count. The Markov property says the next state depends only on the current one, so the state must hold everything that matters. A policy picks an action in each state; the return is the discounted sum of rewards; a state\'s value is the expected return from it. The Bellman equation ties a value to the reward of one step plus the discounted value of where you land, and every method in this part of the course solves, samples or bootstraps that equation. The discount sets the horizon: about 1/(1-γ) steps, so 0.9 looks about 10 moves ahead and 0.99 about 100. Rewards must say what you actually want, or the agent will optimise something else.',
  keywords: ['markov decision process', 'bellman equation', 'discount factor', 'policy', 'value function', 'reward design'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.2, 1.05], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { g: 3, rain: true, knows: true, pay: false };
    const ink = '#151827', CS = 0.6, GX0 = -2.55, GZ0 = -1.25;
    const cx = x => GX0 + (x + 0.5) * CS, cz = y => GZ0 + (y + 0.5) * CS;
    /* the grid of streets: tile height and colour follow the value */
    const tiles = [], arrows = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sw = SWAMP.has(key(x, y)), goal = x === GOAL[0] && y === GOAL[1];
      const mm = new THREE.MeshLambertMaterial({ color: sw ? '#3E7C8C' : '#CFC6B4' }), t = P.box(CS * 0.92, 1, CS * 0.92, '#fff', { r: 0.02, material: mm }); t.position.set(cx(x), 0.12, cz(y)); t.scale.y = 0.04; floor.add(t); tiles.push({ t, mm, x, y, sw, goal });
      if (!sw && !goal) { const a = new THREE.Group(); a.userData.noFit = true; const sh = P.box(0.05, 0.02, 0.2, ink); sh.position.z = 0.03; const hd = P.cyl(0.07, 0.02, ink, { r2: 0, seg: 3 }); hd.rotation.x = -Math.PI / 2; hd.position.z = -0.08; a.add(sh, hd); floor.add(a); arrows.push({ a, x, y }); }
      }

    /* depot and clinic */
    const depot = P.box(0.4, 0.3, 0.4, '#8A6D12', { r: 0.03 }); depot.position.set(cx(0) - 0.0, 0.16, cz(4) + 0.0); depot.scale.set(0.6, 0.6, 0.6); floor.add(depot);
    const clinic = P.box(0.42, 0.34, 0.42, '#FFFFFF', { r: 0.03 }); clinic.position.set(cx(5), 0.16, cz(4)); floor.add(clinic);



    /* the rider */
    const bike = new THREE.Group(); bike.userData.noFit = true; bike.scale.setScalar(1.6); floor.add(bike);
    const body = P.box(0.26, 0.1, 0.1, '#C62828', { r: 0.02 }); body.position.y = 0.12; bike.add(body);
    [-0.1, 0.1].forEach(dx => { const w = P.cyl(0.05, 0.03, '#151827'); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.06, -0.015); bike.add(w); });
    const rider = P.ball(0.06, '#E0A526'); rider.position.set(0, 0.24, 0); bike.add(rider);
    /* the side board */





    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, t0 = 0;
    function draw() {
      R = run(st); t0 = 0;
      const vals = tiles.filter(t => !t.sw && !t.goal).map(t => R.V[t.y][t.x]), lo = Math.min(...vals), hi = Math.max(...vals);
      tiles.forEach(t => { if (t.sw || t.goal) { t.t.scale.y = 0.04;  return; } const v = R.V[t.y][t.x], u = hi > lo ? (v - lo) / (hi - lo) : 0.5, h = 0.04 + u * 0.3;
        t.t.scale.y = h; t.mm.color.setHSL(0.08 + u * 0.3, 0.45, 0.55 + u * 0.1);    });
      arrows.forEach(({ a, x, y }) => { const d = R.pi[y][x], t = tiles.find(q => q.x === x && q.y === y); a.position.set(cx(x), 0.13 + t.t.scale.y + 0.02, cz(y) - 0.04); a.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][d]; });




    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const p = R.show.path, n = p.length, u = (t0 * 2.2) % (n + 2), i = Math.min(n - 1, Math.floor(u)), j = Math.min(n - 1, i + 1), f = Math.min(1, u - Math.floor(u));
      const a = p[i], b = p[j]; bike.position.set(cx(a[0] + (b[0] - a[0]) * f), 0.17, cz(a[1] + (b[1] - a[1]) * f)); if (b[0] !== a[0] || b[1] !== a[1]) bike.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      const t = tiles.find(q => q.x === a[0] && q.y === a[1]); bike.position.y = 0.13 + (t && !t.sw ? t.t.scale.y : 0.0); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Discount γ', options: ['0', '0.5', '0.9', '0.99'], get: () => st.g, act: i => { st.g = i; draw(); } },
      { type: 'buttons', label: 'Weather', options: ['Dry', 'Rain'], get: () => (st.rain ? 1 : 0), act: i => { st.rain = !!i; draw(); } },
      { type: 'buttons', label: 'Plan for the rain', options: ['Yes', 'No'], get: () => (st.knows ? 0 : 1), act: i => { st.knows = !i; draw(); } },
      { type: 'buttons', label: 'Reward per move', options: ['−1', '+1'], get: () => (st.pay ? 1 : 0), act: i => { st.pay = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Delivered', get: () => ({ v: `${Math.round(R.ok * 100)}%`, sub: 'of 300 simulated rides', good: R.ok >= 0.9, bad: R.ok < 0.6 }) },
      { label: 'In the swamp', get: () => ({ v: `${Math.round(R.sw * 100)}%`, sub: 'rides lost', good: R.sw < 0.05, bad: R.sw >= 0.15 }) },
      { label: 'Average return', get: () => ({ v: R.ret.toFixed(1), sub: 'sum of rewards per ride' }) },
    ];
    const labels = [
      { name: 'grid', t: 'Values and policy', d: 'Taller: higher value · arrow: best move', icon: 'target', atV: V(GX0 - 0.03, 0.2, cz(2)) },
    ];
    const reset = () => { Object.assign(st, { g: 3, rain: true, knows: true, pay: false }); draw(); };
    const breaks = [
      { label: 'Discount 0', hint: 'Only the next reward counts', on: () => { reset(); st.g = 0; draw(); }, off: reset },
      { label: 'Paid per move', hint: '+1 for every move', on: () => { reset(); st.pay = true; draw(); }, off: reset },
      { label: 'Plan as if dry', hint: 'Rain ignored by the planner', on: () => { reset(); st.knows = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.pay) return { ok: false, msg: `<b>It rides around and never delivers.</b> Paying +1 for every move makes moving the goal: the clinic ends the ride, so the best policy avoids it, delivering ${Math.round(R.ok * 100)}% of the time. Rewards must describe what you want, here a delivery, not a proxy for effort.` };
      if (st.g === 0) return { ok: false, msg: `<b>No look-ahead: delivered ${Math.round(R.ok * 100)}%.</b> With γ = 0 only the next reward counts, and every move costs the same −1 except the ones that land on the clinic or the swamp, so the values are flat and the rider wanders. A discount near 1 lets the +10 at the clinic pull from far away.` };
      if (st.rain && !st.knows) return { ok: false, msg: `<b>${Math.round(R.sw * 100)}% of rides end in the swamp.</b> Planned as if moves never slip, the shortest route runs right along the flooded edge. In the rain one move in five slips sideways. A plan built on the true transition probabilities takes the safer road one row up.` };
      return { ok: true, msg: `<b>Delivered ${Math.round(R.ok * 100)}%, average return ${R.ret.toFixed(1)}.</b> Value iteration solved the Bellman equation with γ = ${GAMMAS[st.g]} and ${st.rain ? 'the 20% slip' : 'no slip'}; each arrow is the move with the highest expected return${st.rain ? ', keeping a row away from the swamp' : ''}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The ride', home: true, say: 'A boda-boda rider in Kampala carries medicine from a depot to a clinic. Between them, the bottom road runs along a flooded swamp.', act: m => m.set({ g: 3, rain: true, knows: true, pay: false }) },
    { t: 'States and actions', home: true, say: 'Each street corner is a state. The actions are four moves. In the rain, a move can slip sideways.', act: m => m.set({}) },
    { t: 'Values and policy', home: true, say: 'Rewards: a small cost per move, a prize at the clinic, a big loss in the swamp. Solving the Bellman equation gives each corner a value, and the best move.', act: m => m.set({}) },
    { t: 'No look-ahead', home: true, say: 'Set the discount to zero, and only the next move counts. The rider wanders.', act: m => m.set({ g: 0 }) },
    { t: 'Paid to move', home: true, say: 'Pay a reward for every move, and delivering ends the fun. It rides in circles.', act: m => m.set({ g: 3, pay: true }) },
    { t: 'Ignore the rain', home: true, say: 'Plan as if it never slips, and the short road along the swamp swallows rides.', act: m => m.set({ pay: false, knows: false }) },
  ],
  check: [
    { q: 'What does the discount γ control?', options: ['How much later rewards count, so how far ahead the agent looks', 'The step size', 'The number of actions'], answer: 0, why: 'About 1/(1-γ) steps.' },
    { q: 'What does the Bellman equation say about a state\'s value?', options: ['One step\'s reward plus the discounted value of where you land', 'The total of all rewards', 'The best action'], answer: 0, why: 'A recursive fixed point.' },
    { q: 'Why did paying per move break the agent?', options: ['It rewarded moving, not delivering', 'The discount was too low', 'It rained'], answer: 0, why: 'Rewards must say what you want.' },
  ],
  terms: [
    ['State', 'Everything the agent needs to decide.'],
    ['Action', 'A choice the agent can make.'],
    ['Transition', 'The chance of each next state after an action.'],
    ['Reward', 'The number the agent tries to maximise over time.'],
    ['Discount', 'How much a later reward counts against a sooner one.'],
    ['Value', 'Expected discounted return from a state.'],
  ],
  deeper: '<p><b>Deliveries and routing.</b> Motorbike couriers in Kampala, Lagos and Kigali carry medicine, food and parcels through traffic and weather. Real routing systems use the same ideas with far larger state spaces: traffic, time of day, rider rest.</p><p><b>From here.</b> The next lessons solve the same kind of problem by sweeping the Bellman equation (dynamic programming), by sampling whole rides (Monte Carlo) and by learning from each step (temporal difference).</p><p><b>About this machine.</b> Values and policies come from real value iteration; delivery rates from 300 seeded simulated rides.</p>',
  code: {
    title: 'Value iteration',
    note: 'Adapted from the course\'s MDP lesson.',
    text: `
def value_iteration(states, actions, P, R, gamma=0.99, iters=400):
    V = {s: 0.0 for s in states}
    for _ in range(iters):
        V = {s: max(sum(p * (R(s, a, s2) + gamma * V[s2])
                        for s2, p in P(s, a))
                    for a in actions)
             for s in states}
    return V
`,
  },
};
