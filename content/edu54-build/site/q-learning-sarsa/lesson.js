// Temporal difference: a herder in the Simien Mountains moves goats from the camp to the village along a ravine. A 10x4 grid; the bottom row between them is
// the ravine (-100 and back to camp), every move costs 1. Q-learning (max over next actions), SARSA (the next action actually taken) or Expected SARSA learn
// from each step, acting epsilon-greedily. Training runs for real with a seeded random generator.
// Break it: too few episodes, Q-learning exploring right on the edge (many falls while learning).
const W = 10, H = 4, START = [0, 3], GOAL = [9, 3], MV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cliff = (x, y) => y === 3 && x > 0 && x < 9;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function envStep(x, y, a) { let nx = Math.min(W - 1, Math.max(0, x + MV[a][0])), ny = Math.min(H - 1, Math.max(0, y + MV[a][1]));
  if (cliff(nx, ny)) return { x: START[0], y: START[1], r: -100, fell: true, done: false }; return { x: nx, y: ny, r: -1, fell: false, done: nx === GOAL[0] && ny === GOAL[1] }; }
function train(st) {
  const r = rng(21), Q = Array.from({ length: H }, () => Array.from({ length: W }, () => Array(4).fill(0)));
  const pick = (x, y) => { if (r() < st.eps) return Math.floor(r() * 4); let b = 0; for (let a = 1; a < 4; a++) if (Q[y][x][a] > Q[y][x][b]) b = a; return b; };
  const n = [20, 500][st.n], rets = [], falls = [];
  for (let ep = 0; ep < n; ep++) { let x = START[0], y = START[1], a = pick(x, y), G = 0, f = 0;
    for (let t = 0; t < 200; t++) { const s = envStep(x, y, a); G += s.r; if (s.fell) f++;
      const a2 = pick(s.x, s.y), qn = Q[s.y][s.x];
      let target;
      if (s.done) target = s.r;
      else if (st.m === 0) target = s.r + Math.max(...qn);
      else if (st.m === 1) target = s.r + qn[a2];
      else { const best = qn.indexOf(Math.max(...qn)); target = s.r + qn.reduce((acc, v, i) => acc + v * (st.eps / 4 + (i === best ? 1 - st.eps : 0)), 0); }
      Q[y][x][a] += st.alpha * (target - Q[y][x][a]); x = s.x; y = s.y; a = a2; if (s.done) break; }
    rets.push(G); falls.push(f); }
  const path = [[...START]]; let x = START[0], y = START[1], reached = false, pathFell = false;
  for (let t = 0; t < 30; t++) { let b = 0; for (let k = 1; k < 4; k++) if (Q[y][x][k] > Q[y][x][b]) b = k; const s = envStep(x, y, b); if (s.fell) { pathFell = true; break; } x = s.x; y = s.y; path.push([x, y]); if (s.done) { reached = true; break; } }
  const lastN = Math.min(100, n), lr = rets.slice(-lastN), lf = falls.slice(-lastN);
  const edge = reached && path.some(([px, py]) => py === 2 && px > 0 && px < 9) && !path.some(([, py]) => py < 2);
  return { Q, rets, path, reached, pathFell, online: lr.reduce((a, b) => a + b, 0) / lastN, falls: lf.reduce((a, b) => a + b, 0), lastN, edge, n };
}

export default {
  slug: 'q-learning-sarsa',
  title: 'Q-learning and SARSA: learn every step',
  description: 'A herder in the Simien Mountains moves goats from camp to the village along a ravine. The herder learns from every single step, Q-learning or SARSA style, while still exploring. Then stop after twenty days, or explore right on the edge with Q-learning.',
  overview: 'Temporal-difference learning updates after every step instead of waiting for the episode to end. The target is the reward just received plus the discounted estimate of the next state, so the estimate improves itself from its own guesses, bootstrapping; the gap between target and estimate is the TD error. For control, Q-learning uses the best next action in its target, whatever it actually does next: it learns the values of the greedy policy while exploring, so it is off-policy. SARSA, named after state, action, reward, next state, next action, uses the next action it actually takes: it learns the values of the exploring policy it really follows, so it is on-policy. On a cliff walk the difference is visible. Q-learning learns the shortest path right along the edge, but while exploring it keeps stepping off; SARSA counts its own random steps and learns a path a safe distance away, earning more while it learns. Expected SARSA averages over the next actions instead of sampling one, with less noise. Starting every estimate at zero when each move costs one is hopeful: untried moves look better than tried ones, which itself pushes the agent to explore.',
  keywords: ['temporal difference', 'q-learning', 'sarsa', 'td error', 'off-policy', 'cliff walking'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.2, 1.05], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { m: 1, eps: 0.1, alpha: 0.5, n: 1 };
    const ink = '#151827', CS = 0.38, GX0 = -2.75, GZ0 = -0.75;
    const cx = x => GX0 + (x + 0.5) * CS, cz = y => GZ0 + (y + 0.5) * CS;
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = cliff(x, y), mm = new THREE.MeshLambertMaterial({ color: c ? '#3A3340' : '#B9C79A' }), t = P.box(CS * 0.94, c ? 0.02 : 0.1, CS * 0.94, '#fff', { r: 0.015, material: mm }); t.position.set(cx(x), 0.12, cz(y)); S.add(t); tiles.push({ x, y, mm, c }); }
    const ravT = S.text('Ravine', { size: 0.13, weight: 800, color: '#FFFFFF' }); ravT.position.set(cx(4.5), 0.15, cz(3)); S.add(ravT);
    const camp = P.box(0.26, 0.2, 0.26, '#8A6D12', { r: 0.03 }); camp.position.set(cx(0), 0.22, cz(3)); S.add(camp);
    const vill = P.cyl(0.14, 0.22, '#B5541C'); vill.position.set(cx(9), 0.22, cz(3)); S.add(vill);
    const roof = P.cyl(0.18, 0.12, '#6B4A2A', { r2: 0 }); roof.position.set(cx(9), 0.44, cz(3)); S.add(roof);
    const cT = S.text('Camp', { size: 0.1, weight: 800, color: ink }); cT.position.set(cx(0), 0.13, cz(3) + 0.3); S.add(cT);
    const vT = S.text('Village', { size: 0.1, weight: 800, color: ink }); vT.position.set(cx(9), 0.13, cz(3) + 0.3); S.add(vT);
    const pathM = new THREE.MeshBasicMaterial({ color: '#E0A526' }), path = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.03, '#E0A526', { material: pathM }); path.layers.set(1); path.userData.noFit = true; S.add(path);
    const goat = new THREE.Group(); goat.userData.noFit = true; S.add(goat);
    const gb = P.box(0.16, 0.09, 0.09, '#F4F1EA', { r: 0.03 }); gb.position.y = 0.06; goat.add(gb);
    const gh = P.box(0.06, 0.06, 0.06, '#F4F1EA', { r: 0.02 }); gh.position.set(0.09, 0.13, 0); goat.add(gh);
    /* training curve panel */
    const panel = P.box(1.75, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); panel.position.set(2.05, 0.12, 0.1); S.add(panel);
    const pH = S.text('Return per episode', { size: 0.11, weight: 800, color: '#6B5E86' }); pH.position.set(2.05, 0.18, -1.0); S.add(pH);
    const NB = 40, cb = Array.from({ length: NB }, (_, i) => { const b = P.box(0.032, 1, 0.05, '#1F9E89'); b.position.set(1.28 + i * 0.039, 0.17, -0.25); b.userData.noFit = true; S.add(b); return b; });
    const ax = P.box(1.56, 0.01, 0.01, ink); ax.position.set(2.05, 0.17, -0.22); S.add(ax);
    const pA = S.text('', { size: 0.12, weight: 800, color: ink, maxW: 1.6 }); pA.position.set(2.05, 0.18, 0.25); S.add(pA);
    const pF = S.text('', { size: 0.12, weight: 800, color: ink, maxW: 1.6 }); pF.position.set(2.05, 0.18, 0.55); S.add(pF);
    const pM = S.text('', { size: 0.1, weight: 700, color: '#5E5E6E', maxW: 1.6 }); pM.position.set(2.05, 0.18, 0.88); S.add(pM);
    const card = P.box(3.8, 0.05, 0.4, '#FBF8F1', { r: 0.03 }); card.position.set(-0.85, 0.12, 1.2); S.add(card);
    const ans = S.text('', { size: 0.12, weight: 800, color: ink, maxW: 3.7 }); ans.position.set(-0.85, 0.18, 1.2); S.add(ans);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null, t0 = 0;
    const NAMES = ['Q-learning', 'SARSA', 'Expected SARSA'];
    function draw() {
      R = train(st); t0 = 0;
      const mx = tiles.filter(t => !t.c).map(t => Math.max(...R.Q[t.y][t.x])), lo = Math.min(...mx), hi = Math.max(...mx);
      tiles.forEach(t => { if (t.c) return; const v = Math.max(...R.Q[t.y][t.x]), u = hi > lo ? (v - lo) / (hi - lo) : 0.5; t.mm.color.setHSL(0.2 + u * 0.12, 0.35, 0.45 + u * 0.2); });
      const pts = R.path.map(([x, y]) => V(cx(x), 0.26, cz(y)));
      if (pts.length < 2) pts.push(pts[0].clone().add(V(0.01, 0, 0)));
      path.geometry.dispose(); path.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), Math.max(8, pts.length * 6), 0.03, 6, false);
      pathM.color.set(R.reached ? '#E0A526' : '#C62828');
      const per = Math.max(1, Math.ceil(R.rets.length / NB));
      cb.forEach((b, i) => { const seg = R.rets.slice(i * per, (i + 1) * per); b.visible = seg.length > 0; if (!seg.length) return; const v = seg.reduce((a, x) => a + x, 0) / seg.length, h = Math.max(0.01, Math.min(0.75, -v / 140 * 0.75));
        b.scale.y = h; b.position.y = 0.17 + h / 2; b.material.color.set(v > -30 ? '#1F9E89' : v > -80 ? '#E0A526' : '#C62828'); });
      pA.userData.set(`Learning: ${R.online.toFixed(0)} a day (last ${R.lastN})`, R.online > -40 ? ink : '#C62828');
      pF.userData.set(`Falls while learning: ${R.falls}`, R.falls > 5 ? '#C62828' : ink);
      pM.userData.set(`${NAMES[st.m]} · ε = ${st.eps} · α = ${st.alpha} · ${R.n} days`);
      ans.userData.set(R.reached ? `Learned path: ${R.path.length - 1} moves${R.edge ? ', right along the edge' : ', a safe distance from the edge'}` : 'No learned path reaches the village yet', R.reached ? ink : '#8A1F1F');
    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const p = R.path, n = p.length, u = (t0 * 2.5) % (n + 2), i = Math.min(n - 1, Math.floor(u)), j = Math.min(n - 1, i + 1), f = Math.min(1, u - Math.floor(u));
      const a = p[i], b = p[j]; goat.position.set(cx(a[0] + (b[0] - a[0]) * f), 0.22, cz(a[1] + (b[1] - a[1]) * f)); if (b[0] !== a[0] || b[1] !== a[1]) goat.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Method', options: NAMES, get: () => st.m, act: i => { st.m = i; draw(); } },
      { type: 'buttons', label: 'Exploration ε', options: ['0', '0.1', '0.3'], get: () => [0, 0.1, 0.3].indexOf(st.eps), act: i => { st.eps = [0, 0.1, 0.3][i]; draw(); } },
      { type: 'buttons', label: 'Step size α', options: ['0.1', '0.5'], get: () => (st.alpha === 0.1 ? 0 : 1), act: i => { st.alpha = i ? 0.5 : 0.1; draw(); } },
      { type: 'buttons', label: 'Days of practice', options: ['20', '500'], get: () => st.n, act: i => { st.n = i; draw(); } },
    ];
    const readouts = [
      { label: 'Learned path', get: () => ({ v: R.reached ? `${R.path.length - 1} moves` : 'None', sub: R.reached ? (R.edge ? 'along the edge' : 'away from the edge') : 'never reaches the village', good: R.reached, bad: !R.reached }) },
      { label: 'While learning', get: () => ({ v: R.online.toFixed(0), sub: `average return, last ${R.lastN} days`, good: R.online > -30, bad: R.online < -60 }) },
      { label: 'Falls', get: () => ({ v: String(R.falls), sub: `in the last ${R.lastN} days`, good: R.falls <= 2, bad: R.falls > 5 }) },
    ];
    const labels = [
      { name: 'grid', t: 'The mountainside', d: 'Gold: learned path · brighter: higher value', icon: 'target', atV: V(GX0 - 0.03, 0.2, cz(1.5)) },
      { name: 'curve', t: 'Practice', d: 'Red bars: days with falls', icon: 'wave', atV: V(2.93, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { m: 1, eps: 0.1, alpha: 0.5, n: 1 }); draw(); };
    const breaks = [
      { label: 'Only 20 days', hint: 'Too little practice', on: () => { reset(); st.n = 0; st.alpha = 0.1; draw(); }, off: reset },
      { label: 'Q-learning on the edge', hint: 'Off-policy while exploring', on: () => { reset(); st.m = 0; st.eps = 0.3; draw(); }, off: reset },
    ];
    function status() {
      if (!R.reached) return { ok: false, msg: `<b>Not learned yet after ${R.n} days.</b> Each step moves one estimate a little (α = ${st.alpha}), and the village's reward has only spread back part of the way, so the learned moves still wander. Practise longer, or use a larger step size.` };
      if (st.m === 0 && R.falls > 5) return { ok: false, msg: `<b>${R.falls} falls in the last ${R.lastN} days of practice.</b> Q-learning learns the shortest path, right along the ravine, as if it will act greedily from then on. But it keeps exploring (ε = ${st.eps}), and random steps from the edge go over: practice averages ${R.online.toFixed(0)}. SARSA learns the path for the herder who still explores, and keeps away from the edge.` };
      return { ok: true, msg: `<b>${NAMES[st.m]}: a ${R.path.length - 1}-move path${R.edge ? ' along the edge' : ' away from the edge'}.</b> Every step nudged one estimate towards reward plus the next estimate. Practice averaged ${R.online.toFixed(0)} with ${R.falls} falls in the last ${R.lastN} days.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The ravine', home: true, say: 'A herder in the Simien Mountains moves goats from camp to the village. The straight way runs along a ravine.', act: m => m.set({ m: 1, eps: 0.1, alpha: 0.5, n: 1 }) },
    { t: 'Every step', home: true, say: 'After every single step, the estimate for that move is nudged towards the reward plus the estimate of where it led.', act: m => m.set({}) },
    { t: 'SARSA', home: true, say: 'SARSA uses the next move it really makes, random steps included, so it learns a path a safe distance from the edge.', act: m => m.set({}) },
    { t: 'Q-learning', home: true, say: 'Q-learning assumes the best next move. It learns the edge path, but while it still explores, goats go over.', act: m => m.set({ m: 0, eps: 0.3 }) },
    { t: 'Too little practice', home: true, say: 'Stop after twenty days, and the reward has not spread back far enough. The path wanders.', act: m => m.set({ m: 1, eps: 0.1, n: 0, alpha: 0.1 }) },
    { t: 'Expected SARSA', home: true, say: 'Expected SARSA averages over the next moves instead of sampling one. It learns the safe path with even fewer falls.', act: m => m.set({ n: 1, alpha: 0.5, m: 2, eps: 0.1 }) },
  ],
  check: [
    { q: 'What is the TD target?', options: ['Reward plus the discounted estimate of the next state', 'The whole episode\'s return', 'The model\'s prediction'], answer: 0, why: 'It bootstraps from its own estimate.' },
    { q: 'How does SARSA differ from Q-learning?', options: ['It uses the next action actually taken, not the best one', 'It waits for the episode to end', 'It needs a model'], answer: 0, why: 'On-policy versus off-policy.' },
    { q: 'Why does SARSA keep away from the cliff while exploring?', options: ['Its values include its own random steps', 'It has a map', 'It learns slower'], answer: 0, why: 'It learns the policy it follows.' },
  ],
  terms: [
    ['TD error', 'Target minus current estimate after one step.'],
    ['Bootstrapping', 'Updating an estimate from another estimate.'],
    ['Q-learning', 'Off-policy: the target uses the best next action.'],
    ['SARSA', 'On-policy: the target uses the next action taken.'],
    ['Expected SARSA', 'The target averages over next actions.'],
    ['Optimistic start', 'High initial values that encourage trying things.'],
  ],
  deeper: '<p><b>Learning on the job.</b> Herders, drivers and farmers learn by doing, adjusting a little after each step rather than waiting for a season to end. Temporal-difference learning works the same way, which is why it scales to long tasks.</p><p><b>Next.</b> When the states are too many for a table, a neural network estimates Q: deep Q-networks.</p><p><b>About this machine.</b> Training runs for real with a seeded random generator on a 10x4 cliff walk.</p>',
  code: {
    title: 'Two targets',
    note: 'Adapted from the course\'s temporal-difference lesson.',
    text: `
def td_update(Q, s, a, r, s2, a2, alpha=0.5, gamma=1.0, method="sarsa"):
    if method == "q":
        target = r + gamma * max(Q[s2])      # best next action
    else:
        target = r + gamma * Q[s2][a2]       # action actually taken
    Q[s][a] += alpha * (target - Q[s][a])
`,
  },
};
