// Dynamic programming: a school in Accra plans fire-drill routes. The floor plan is a 9x5 grid with walls, the assembly point is the exit, each move costs 1.
// Value iteration sweeps the Bellman optimality equation; policy iteration alternates full evaluation with greedy improvement. Both run for real here, with the
// per-sweep change recorded. A storeroom can be sealed (no way out); with discount 1 its value then falls forever.
// Break it: stop after 3 sweeps (far rooms get no signal), discount 1 with a sealed storeroom (never converges), a plan made with the storeroom door open when it is shut.
const MAP = ['....#....', '.##.#.##.', '.#......E', '.#.##.#..', '...#.#...'];
const W = 9, H = 5, EXIT = [8, 2], DOOR = [4, 3], FIRE = [6, 2];
const MV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function grid(sealed, fire) { return MAP.map((r, y) => [...r].map((c, x) => (x === DOOR[0] && y === DOOR[1] ? (sealed ? '#' : '.') : x === FIRE[0] && y === FIRE[1] ? (fire ? '#' : '.') : c))); }
const isExit = (x, y) => x === EXIT[0] && y === EXIT[1];
function nxt(G, x, y, a) { const nx = x + MV[a][0], ny = y + MV[a][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || G[ny][nx] === '#') return [x, y]; return [nx, ny]; }
function q(G, V, x, y, a, g) { const [nx, ny] = nxt(G, x, y, a); return -1 + (isExit(nx, ny) ? 0 : g * V[ny][nx]); }
function greedy(G, V, g) { return V.map((r, y) => r.map((_, x) => { if (G[y][x] === '#' || isExit(x, y)) return -1; let b = 0, bv = -1e18; for (let a = 0; a < 4; a++) { const v = q(G, V, x, y, a, g); if (v > bv + 1e-9) { bv = v; b = a; } } return b; })); }
function vi(G, g, budget) { let V = G.map(r => r.map(() => 0)); const res = [];
  for (let k = 0; k < budget; k++) { const N = V.map(r => r.slice()); let d = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (G[y][x] === '#' || isExit(x, y)) continue; N[y][x] = Math.max(...[0, 1, 2, 3].map(a => q(G, V, x, y, a, g))); d = Math.max(d, Math.abs(N[y][x] - V[y][x])); }
    V = N; res.push(d); if (d < 1e-3) break; }
  return { V, res, pi: greedy(G, V, g), sweeps: res.length };
}
function pi_(G, g, budget) { let P = G.map(r => r.map(() => 0)), V = G.map(r => r.map(() => 0)); const res = []; let outer = 0, evals = 0;
  for (; outer < 30; outer++) { for (let k = 0; k < 300; k++) { const N = V.map(r => r.slice()); let d = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (G[y][x] === '#' || isExit(x, y)) continue; N[y][x] = q(G, V, x, y, P[y][x], g); d = Math.max(d, Math.abs(N[y][x] - V[y][x])); }
      V = N; evals++; res.push(d); if (d < 1e-3 || evals >= budget * 30) break; }
    const NP = greedy(G, V, g); let same = true; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (NP[y][x] !== P[y][x]) same = false;
    P = NP; if (same || evals >= budget * 30) break; }
  return { V, res, pi: P, sweeps: evals, outer: outer + 1 };
}
function reach(G) { const seen = new Set([EXIT.join()]), Q = [EXIT]; while (Q.length) { const [x, y] = Q.shift(); for (let a = 0; a < 4; a++) { const [nx, ny] = nxt(G, x, y, a), k = `${nx},${ny}`; if (!seen.has(k)) { seen.add(k); Q.push([nx, ny]); } } } return seen; }
function routed(G, P) { const can = reach(G); let ok = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (G[y][x] === '#' || isExit(x, y) || !can.has(`${x},${y}`)) continue; n++;
    let cx = x, cy = y; for (let t = 0; t < 40 && !isExit(cx, cy); t++) { const a = P[cy][cx]; if (a < 0) break; [cx, cy] = nxt(G, cx, cy, a); } if (isExit(cx, cy)) ok++; } return { ok, n }; }
const BUD = [3, 10, 400];
function run(st) {
  const real = grid(st.sealed, st.fire), plan = grid(st.sealed, st.fire && !st.stale), g = st.g1 ? 1 : 0.9;
  const out = st.pi ? pi_(plan, g, BUD[st.b]) : vi(plan, g, BUD[st.b]);
  const rt = routed(real, out.pi), last = out.res[out.res.length - 1] || 0;
  return { ...out, real, plan, g, rt, last, conv: last < 1e-3 };
}

export default {
  slug: 'dynamic-programming',
  title: 'Dynamic programming: sweep to the answer',
  description: 'A school in Accra plans fire-drill routes to the assembly point. Value iteration sweeps the floor plan until every room knows its distance out.',
  overview: 'Dynamic programming solves a Markov decision process when the model is known: every transition and reward. Value iteration repeats one sweep over all states, setting each value to the best one-step reward plus the discounted value of where that move lands, the Bellman optimality equation, until the largest change in a sweep is tiny; the best move in each state is then the one that achieves that maximum. Information spreads one step per sweep: after three sweeps only rooms within three moves of the exit have heard about it, and the rest have no reason to prefer any direction. Policy iteration alternates two steps: evaluate the current plan exactly, then make it greedy with respect to those values, and stop when the plan stops changing, usually after a handful of rounds. Both are cases of generalised policy iteration, the loop behind Q-learning, actor-critic and PPO. A discount below 1 makes each sweep a contraction, so the answer is unique and convergence is guaranteed; with no discount, a state that can never reach the end has a value that falls without limit. And all of it is only as good as the model: plan on an outdated map and the routes are wrong.',
  keywords: ['dynamic programming', 'value iteration', 'policy iteration', 'bellman optimality', 'contraction', 'generalised policy iteration'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.25, 1.0], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { pi: false, b: 2, g1: false, sealed: false, fire: false, stale: false };
    const ink = '#151827', CS = 0.42, GX0 = -2.75, GZ0 = -1.0;
    const cx = x => GX0 + (x + 0.5) * CS, cz = y => GZ0 + (y + 0.5) * CS;
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const mm = new THREE.MeshLambertMaterial({ color: '#CFC6B4' }), t = P.box(CS * 0.94, 1, CS * 0.94, '#fff', { r: 0.015, material: mm }); t.position.set(cx(x), 0.12, cz(y)); floor.add(t);
      const a = new THREE.Group(); a.userData.noFit = true; const sh = P.box(0.04, 0.02, 0.14, ink); sh.position.z = 0.02; const hd = P.cyl(0.055, 0.02, ink, { r2: 0, seg: 3 }); hd.rotation.x = -Math.PI / 2; hd.position.z = -0.06; a.add(sh, hd); floor.add(a);
         cells.push({ x, y, t, mm, a }); }



    /* the residual chart on the right */

    const NB = 30, bars = Array.from({ length: NB }, (_, i) => { const b = P.box(0.04, 1, 0.04, '#3A6FB0'); b.position.set(1.32 + i * 0.05, 0.17, -0.1); b.userData.noFit = true; floor.add(b); return b; });
    const tol = P.box(1.52, 0.012, 0.012, '#1F9E89'); tol.position.set(2.05, 0.17, -0.08); tol.userData.noFit = true; floor.add(tol);

    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      const open = []; cells.forEach(c => { if (R.real[c.y][c.x] !== '#' && !isExit(c.x, c.y)) open.push(R.V[c.y][c.x]); });
      const lo = Math.max(-25, Math.min(...open)), hi = Math.max(...open);
      cells.forEach(c => { const wall = R.real[c.y][c.x] === '#', ex = isExit(c.x, c.y);
        if (wall) { c.t.scale.y = 0.35; c.mm.color.set((c.x === DOOR[0] && c.y === DOOR[1]) || (c.x === FIRE[0] && c.y === FIRE[1]) ? '#B5541C' : '#5E5A66'); c.a.visible = false;  return; }
        if (ex) { c.t.scale.y = 0.06; c.mm.color.set('#3FA34D'); c.a.visible = false;  return; }
        const v = Math.max(-25, R.V[c.y][c.x]), u = hi > lo ? (v - lo) / (hi - lo) : 1, h = 0.03 + u * 0.18; c.t.scale.y = h; c.mm.color.setHSL(0.02 + u * 0.3, 0.5, 0.5 + u * 0.12);
        const d = R.pi[c.y][c.x]; c.a.visible = d >= 0; c.a.position.set(cx(c.x), 0.13 + h + 0.015, cz(c.y) - 0.03); c.a.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][Math.max(0, d)];
           });
      const rs = R.res.slice(0, NB), lg = v => Math.max(0, (Math.log10(Math.max(v, 1e-4)) + 4) / 5);
      bars.forEach((b, i) => { const v = rs[i]; b.visible = v != null; if (v == null) return; const h = 0.01 + lg(v) * 0.7; b.scale.y = h; b.position.y = 0.12; b.material.color.set(v < 1e-3 ? '#1F9E89' : '#3A6FB0'); });
      tol.position.y = 0.17 + 0.01 + lg(1e-3) * 0.7;
      const bad = R.rt.n - R.rt.ok;

    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Method', options: ['Value iteration', 'Policy iteration'], get: () => (st.pi ? 1 : 0), act: i => { st.pi = !!i; draw(); } },
      { type: 'buttons', label: 'Sweep budget', options: ['3', '10', 'Until converged'], get: () => st.b, act: i => { st.b = i; draw(); } },
      { type: 'buttons', label: 'Discount γ', options: ['0.9', '1'], get: () => (st.g1 ? 1 : 0), act: i => { st.g1 = !!i; draw(); } },
      { type: 'buttons', label: 'Storeroom door', options: ['Open', 'Shut'], get: () => (st.sealed ? 1 : 0), act: i => { st.sealed = !!i; draw(); } },
      { type: 'buttons', label: 'Fire door', options: ['Open', 'Shut'], get: () => (st.fire ? 1 : 0), act: i => { st.fire = !!i; draw(); } },
      { type: 'buttons', label: 'Plan uses', options: ['Today\'s map', 'An old map'], get: () => (st.stale ? 1 : 0), act: i => { st.stale = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Rooms routed out', get: () => ({ v: `${R.rt.ok}/${R.rt.n}`, sub: 'following the arrows', good: R.rt.ok === R.rt.n, bad: R.rt.ok < R.rt.n }) },
      { label: 'Sweeps', get: () => ({ v: String(R.sweeps), sub: st.pi ? `${R.outer} improve rounds` : 'Bellman updates of every room' }) },
      { label: 'Last change', get: () => ({ v: R.last < 1e-3 ? '< 0.001' : R.last.toFixed(2), sub: 'biggest in the final sweep', good: R.conv, bad: !R.conv }) },
    ];
    const labels = [
      { name: 'plan', t: 'Floor plan', d: 'Taller: closer to the exit · arrows: route', icon: 'target', atV: V(GX0 - 0.03, 0.2, cz(2)) },
    ];
    const reset = () => { Object.assign(st, { pi: false, b: 2, g1: false, sealed: false, fire: false, stale: false }); draw(); };
    const breaks = [
      { label: 'Stop after 3 sweeps', hint: 'Budget too small', on: () => { reset(); st.b = 0; draw(); }, off: reset },
      { label: 'No discount, sealed room', hint: 'γ = 1, storeroom shut', on: () => { reset(); st.g1 = true; st.sealed = true; draw(); }, off: reset },
      { label: 'Plan on an old map', hint: 'Fire door shut, plan thinks open', on: () => { reset(); st.fire = true; st.stale = true; draw(); }, off: reset },
    ];
    function status() {
      const bad = R.rt.n - R.rt.ok;
      if (st.fire && st.stale && bad > 0) return { ok: false, msg: `<b>The plan sends people into a shut fire door.</b> It was solved on a map where the east corridor door was open, so ${bad} room${bad === 1 ? '' : 's'} route${bad === 1 ? 's' : ''} into it today instead of taking the longer way round by the top corridor. Dynamic programming is exact for the model you give it; keep the model in step with the building.` };
      if (st.g1 && st.sealed) return { ok: false, msg: `<b>It never settles.</b> With γ = 1 the shut storeroom can never reach the exit, so its value drops by 1 every sweep without end: after ${R.sweeps} sweeps it is still changing by ${R.last.toFixed(0)}. A discount below 1 makes every sweep a contraction, so values settle even for rooms with no way out.` };
      if (!R.conv && st.b === 0) return { ok: false, msg: `<b>${bad} rooms have no working route.</b> Values spread one move per sweep, so after 3 sweeps only rooms within three moves of the exit know about it; the rest all look the same and point anywhere. Keep sweeping until the biggest change is tiny.` };
      if (!R.conv) return { ok: bad === 0, msg: `<b>Not converged yet</b> after ${R.sweeps} sweeps (change ${R.last.toFixed(2)}). ${bad === 0 ? 'The routes are already right, but the values are still moving.' : `${bad} rooms still point the wrong way.`}` };
      return { ok: true, msg: `<b>Converged in ${R.sweeps} sweeps${st.pi ? ` over ${R.outer} rounds of evaluate-then-improve` : ''}.</b> Every room's value is the discounted cost of its shortest way out, and every arrow points along it${st.sealed ? '; the shut storeroom settles at its own fixed value' : ''}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The drill', home: true, say: 'A school in Accra plans fire-drill routes from every room to the assembly point. Each move costs one.', act: m => m.set({ pi: false, b: 2, g1: false, sealed: false, stale: false }) },
    { t: 'Sweep', home: true, say: 'Value iteration sweeps every room: its value becomes the best move\'s cost plus the discounted value of where it leads.', act: m => m.set({}) },
    { t: 'Evaluate, improve', home: true, say: 'Policy iteration instead evaluates a plan fully, then improves it, and stops when the plan stops changing.', act: m => m.set({ pi: true }) },
    { t: 'Too few sweeps', home: true, say: 'Stop after three sweeps, and far rooms have not heard about the exit yet. Their arrows point anywhere.', act: m => m.set({ pi: false, b: 0 }) },
    { t: 'No discount', home: true, say: 'Shut the storeroom with no discount, and its value falls forever. The sweeps never settle.', act: m => m.set({ b: 2, g1: true, sealed: true }) },
    { t: 'Old map', home: true, say: 'Shut the fire door but plan on an old map, and the routes lead straight into it.', act: m => m.set({ g1: false, sealed: false, fire: true, stale: true }) },
  ],
  check: [
    { q: 'What does one sweep of value iteration do?', options: ['Updates every state with the best one-step reward plus discounted next value', 'Simulates one episode', 'Picks a random action'], answer: 0, why: 'The Bellman optimality update.' },
    { q: 'Why do far rooms point anywhere after three sweeps?', options: ['Values spread one step per sweep', 'The discount is too high', 'Policy iteration was used'], answer: 0, why: 'They have not heard about the exit.' },
    { q: 'Why does a discount below 1 guarantee convergence?', options: ['Each sweep shrinks differences by at least γ', 'It removes walls', 'It shortens routes'], answer: 0, why: 'A contraction has one fixed point.' },
  ],
  terms: [
    ['Dynamic programming', 'Solving an MDP by sweeping a known model.'],
    ['Value iteration', 'Repeat the Bellman optimality update until it settles.'],
    ['Policy evaluation', 'Computing the values of a fixed plan.'],
    ['Policy improvement', 'Making the plan greedy with respect to those values.'],
    ['Contraction', 'An update that brings any two guesses closer.'],
    ['Generalised policy iteration', 'Values and policy improving each other in a loop.'],
  ],
  deeper: '<p><b>Safety planning.</b> Schools and markets from Accra to Addis Ababa run evacuation drills; route planning on floor plans uses the same shortest-path idea, with corridors closed by fire or crowding changing the map.</p><p><b>When the model is unknown.</b> Dynamic programming needs every transition and reward. The next lessons learn the same values from experience instead: whole episodes (Monte Carlo) or single steps (temporal difference).</p><p><b>About this machine.</b> Both algorithms run for real on the 9x5 plan.</p>',
  code: {
    title: 'Policy iteration',
    note: 'Adapted from the course\'s dynamic programming lesson.',
    text: `
def policy_iteration(states, actions, step, gamma=0.9, tol=1e-3):
    pi = {s: actions[0] for s in states}
    V = {s: 0.0 for s in states}
    while True:
        while True:                               # evaluate
            delta = 0
            for s in states:
                r, s2 = step(s, pi[s])
                v = r + gamma * V.get(s2, 0)
                delta, V[s] = max(delta, abs(v - V[s])), v
            if delta < tol:
                break
        new = {s: max(actions, key=lambda a: step(s, a)[0] + gamma * V.get(step(s, a)[1], 0)) for s in states}
        if new == pi:                             # improve until stable
            return pi, V
        pi = new
`,
  },
};
