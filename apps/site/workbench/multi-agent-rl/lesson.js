// Multi-agent RL: two pirogues from Joal-Fadiouth choose where to set nets each morning: ground A, B or C. Catches depend on both choices (the "climbing game"):
// both at A encircle a shoal (11), both at B 7, both at C 5, but splitting near A tangles the nets (penalty). Independent learners each keep their own values and
// treat the other boat as weather; a centralised learner keeps a value for each joint choice (training together, acting apart). Learning runs for real: 20 seeded
// runs of 3,000 mornings per setting. Break it: independent learners with a harsh tangle penalty, independent learners exploring a lot, a joint learner that never explores.
const G = ['A', 'B', 'C'];
const PAY = pen => [[11, pen, 0], [pen, 7, 6], [0, 0, 5]];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function learn(st, seed) {
  const r = rng(seed), M = PAY(st.pen ? -30 : -5), eps = [0, 0.1, 0.5][st.eps], alpha = 0.1, N = 3000;
  const argmax = q => { const m = Math.max(...q), ties = []; q.forEach((v, i) => { if (v > m - 1e-9) ties.push(i); }); return ties[Math.floor(r() * ties.length)]; };
  if (st.joint) { const Q = Array(9).fill(0); for (let t = 0; t < N; t++) { const j = r() < eps ? Math.floor(r() * 9) : argmax(Q), a = Math.floor(j / 3), b = j % 3; Q[j] += alpha * (M[a][b] - Q[j]); } const j = argmax(Q); return { a: Math.floor(j / 3), b: j % 3, qa: [0, 1, 2].map(i => Math.max(Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2])), qb: [0, 1, 2].map(i => Math.max(Q[i], Q[3 + i], Q[6 + i])) }; }
  const qa = [0, 0, 0], qb = [0, 0, 0];
  for (let t = 0; t < N; t++) { const a = r() < eps ? Math.floor(r() * 3) : argmax(qa), b = r() < eps ? Math.floor(r() * 3) : argmax(qb), rw = M[a][b]; qa[a] += alpha * (rw - qa[a]); qb[b] += alpha * (rw - qb[b]); }
  return { a: argmax(qa), b: argmax(qb), qa, qb };
}
function run(st) { const M = PAY(st.pen ? -30 : -5); const out = { AA: 0, other: 0, tangle: 0 }, runs = [], count = {}; let avg = 0;
  for (let i = 0; i < 20; i++) { const o = learn(st, 500 + i), v = M[o.a][o.b]; runs.push(o); count[`${o.a}${o.b}`] = (count[`${o.a}${o.b}`] || 0) + 1; avg += v / 20; if (o.a === 0 && o.b === 0) out.AA++; else if (v < 0) out.tangle++; else out.other++; }
  const mode = Object.keys(count).sort((x, y) => count[y] - count[x])[0], shown = runs.find(o => `${o.a}${o.b}` === mode);
  return { ...shown, M, out, avg, catch: M[shown.a][shown.b] }; }

export default {
  slug: 'multi-agent-rl',
  title: 'Multi-agent RL: learning together',
  description: 'Two pirogues from Joal-Fadiouth choose where to set their nets each morning. Both at the rich ground is the best catch, but each one learning alone can get stuck.',
  overview: 'With several agents learning at once, the problem becomes a Markov game: a joint action, and a reward for each agent. Cooperative games share one reward. The hard parts are non-stationarity (from one agent\'s view the world keeps changing, because the other agents are learning), credit assignment (which agent earned the shared reward?), coordinated exploration and the joint action space growing exponentially with the number of agents. The simplest approach, independent learning, lets each agent learn alone and treat the others as part of the environment. It is easy and sometimes works, but it has no guarantees: in coordination games, an agent judges an action by its average result while the partner is still exploring, and a great joint action surrounded by heavy penalties looks bad on average, so independent learners settle on a safe, mediocre choice. Centralised training with decentralised execution trains with information about everyone, such as a critic or values over joint actions (MADDPG, COMA, MAPPO, QMIX), and then lets each agent act on its own observations. Self-play and league play, where agents train against copies and past versions of themselves, power competitive successes such as AlphaZero and OpenAI Five.',
  keywords: ['multi-agent reinforcement learning', 'markov game', 'independent learners', 'ctde', 'coordination', 'non-stationarity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.15, 1.08], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { joint: true, eps: 1, pen: true };
    const ink = '#151827';
    const sea = P.box(2.4, 0.03, 2.5, '#5FA8C8', { r: 0.06 }); sea.position.set(-1.65, 0.12, 0.1); floor.add(sea);
    const GP = [V(-2.3, 0.15, -0.7), V(-1.0, 0.15, -0.55), V(-1.65, 0.15, 0.55)];
    GP.forEach((p, i) => { const b = P.cyl(0.08, 0.2, '#E07B39'); b.position.copy(p); floor.add(b);    });
    const boat = col => { const g = new THREE.Group(); g.userData.noFit = true; g.scale.setScalar(1.5); const hull = P.box(0.42, 0.08, 0.13, col, { r: 0.04 }); hull.position.y = 0.04; g.add(hull); const mast = P.box(0.02, 0.2, 0.02, '#5B4636'); mast.position.set(0, 0.1, 0); g.add(mast); floor.add(g); return g; };
    const bA = boat('#C62828'), bB = boat('#E0A526');

    /* payoff grid: rows boat 1, columns boat 2 */
    const PX = j => -0.05 + j * 0.42, PZ = i => -0.6 + i * 0.42;
    const cells = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const mm = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.36, 1, 0.36, '#fff', { r: 0.02, material: mm }); b.position.set(PX(j), 0.12, PZ(i)); b.userData.noFit = true; floor.add(b);
         cells.push({ i, j, b, mm, t }); }
    G.forEach((g, k) => {       });
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.44, 0.001, 0.44)), new THREE.LineBasicMaterial({ color: '#151827' })); ring.layers.set(1); ring.userData.noFit = true; floor.add(ring);

    const keepG = P.box(1.3, 0.8, 1.3, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(PX(1), 0.12, PZ(1)); floor.add(keepG);
    /* panel */

    const segs = [['#1F9E89', 'Both at A'], ['#E0A526', 'Safe, smaller catch'], ['#C62828', 'Tangled']].map(([c, n], k) => { const b = P.box(0.35, 1, 0.3, c, { r: 0.02 }); b.position.set(1.55 + k * 0.5, 0.17, -0.35); b.userData.noFit = true; floor.add(b);
         return { b }; });



    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, t0 = 0;
    function draw() {
      R = run(st);
      cells.forEach(c => { const v = R.M[c.i][c.j], h = v >= 0 ? 0.04 + v * 0.045 : 0.03; c.b.scale.y = h; c.mm.color.set(v >= 9 ? '#1F9E89' : v > 0 ? '#E0A526' : v === 0 ? '#C9C3B5' : '#C62828');   });
      ring.position.set(PX(R.b), 0.12 + Math.max(0.03, R.M[R.a][R.b] >= 0 ? 0.04 + R.M[R.a][R.b] * 0.045 : 0.03) + 0.005, PZ(R.a));
      [R.out.AA, R.out.other, R.out.tangle].forEach((n, k) => { const h = 0.02 + n / 20 * 0.7; segs[k].b.scale.y = h; });



    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const u = (t0 * 0.25) % 1, f = Math.min(1, u * 1.6), home = V(-1.65, 0.15, 1.05);
      [[bA, R.a, -0.12], [bB, R.b, 0.12]].forEach(([b, g, off]) => { const p = home.clone().lerp(GP[g].clone().add(V(off, 0, 0.12)), f); b.position.copy(p); b.rotation.y = Math.atan2(-(GP[g].z - home.z), GP[g].x - home.x); }); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Learning', options: ['Each boat alone', 'Joint values'], get: () => (st.joint ? 1 : 0), act: i => { st.joint = !!i; draw(); } },
      { type: 'buttons', label: 'Exploration ε', options: ['0', '0.1', '0.5'], get: () => st.eps, act: i => { st.eps = i; draw(); } },
      { type: 'buttons', label: 'Tangle penalty', options: ['−5', '−30'], get: () => (st.pen ? 1 : 0), act: i => { st.pen = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Both at A', get: () => ({ v: `${R.out.AA}/20`, sub: 'seasons ending on the best pair', good: R.out.AA >= 16, bad: R.out.AA < 8 }) },
      { label: 'Average catch', get: () => ({ v: R.avg.toFixed(1), sub: 'best possible 11', good: R.avg > 9, bad: R.avg < 7 }) },
      { label: 'Most common', get: () => ({ v: `${G[R.a]} + ${G[R.b]}`, sub: `pair learned, catch ${R.catch}`, good: R.catch === 11, bad: R.catch < 7 }) },
    ];
    const labels = [
      { name: 'sea', t: 'Two boats', d: 'Each picks a ground', icon: 'target', atV: V(-2.86, 0.2, 0.1) },
      { name: 'pay', t: 'Joint catch', d: 'Red pits: tangled nets', icon: 'scale', atV: V(2.4, 0.2, 0) },
    ];
    const reset = () => { Object.assign(st, { joint: true, eps: 1, pen: true }); draw(); };
    const breaks = [
      { label: 'Alone, harsh tangles', hint: 'Independent learners, −30', on: () => { reset(); st.joint = false; draw(); }, off: reset },
      { label: 'Alone, explore a lot', hint: 'Independent, ε = 0.5', on: () => { reset(); st.joint = false; st.pen = false; st.eps = 2; draw(); }, off: reset },
      { label: 'Joint, never explore', hint: 'ε = 0', on: () => { reset(); st.eps = 0; draw(); }, off: reset },
    ];
    function status() {
      if (!st.joint && R.out.AA < 10) return { ok: false, msg: `<b>Only ${R.out.AA} of 20 seasons end both at A.</b> Each boat judges ground A by its average catch while the other boat is still trying everything, and a split near A costs ${st.pen ? 30 : 5}, so A looks worse than it is (boat 1 values it ${R.qa[0].toFixed(1)}). Both settle on safer grounds. Learn values for the joint choice while training, then let each boat act on its own.` };
      if (st.joint && st.eps === 0 && R.out.AA < 10) return { ok: false, msg: `<b>Stuck on ${G[R.a]} + ${G[R.b]}.</b> With no exploration the joint learner takes the first pair that paid anything and never tries the others, so it never discovers that both at A pays 11. Even joint learning needs some exploration.` };
      return { ok: true, msg: `<b>${R.out.AA} of 20 seasons end with both boats at A.</b> ${st.joint ? 'Values for each joint choice show that A together pays 11, despite the tangles around it.' : `With a small tangle penalty, A still looks best even on average.`} Average catch ${R.avg.toFixed(1)}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two boats', home: true, say: 'Two pirogues from Joal-Fadiouth choose where to set their nets each morning. Their catch depends on both choices.', act: m => m.set({ joint: true, eps: 1, pen: true }) },
    { t: 'The catch', home: true, say: 'Both at ground A encircle a shoal: the best catch. But if one goes to A and the other nearby, the nets tangle.', act: m => m.set({}) },
    { t: 'Learn together', home: true, say: 'Learning values for each pair of choices, the boats find A together, then each sails there on its own.', act: m => m.set({}) },
    { t: 'Each alone', home: true, say: 'Learn alone, and each boat sees A through the other boat\'s random tries: tangles make it look bad. They settle for less.', act: m => m.set({ joint: false }) },
    { t: 'Explore a lot', home: true, say: 'Even with mild tangles, exploring a lot keeps lone learners guessing.', act: m => m.set({ pen: false, eps: 2 }) },
    { t: 'Never explore', home: true, say: 'Learn jointly but never explore, and the first pair that paid anything becomes the habit.', act: m => m.set({ joint: true, pen: true, eps: 0 }) },
  ],
  check: [
    { q: 'Why is learning harder with several agents?', options: ['Others keep changing, so the world looks non-stationary', 'Rewards disappear', 'States are smaller'], answer: 0, why: 'Each agent\'s view shifts as others learn.' },
    { q: 'Why did independent learners avoid ground A?', options: ['Its average looked bad while the partner explored', 'A paid least', 'They could not reach it'], answer: 0, why: 'Penalties around the best pair.' },
    { q: 'What does centralised training, decentralised execution mean?', options: ['Train with joint information, act on local information', 'One agent does everything', 'No training'], answer: 0, why: 'MAPPO, QMIX, MADDPG.' },
  ],
  terms: [
    ['Markov game', 'An MDP with several agents acting at once.'],
    ['Independent learning', 'Each agent learns alone, others treated as environment.'],
    ['Non-stationarity', 'The environment changing because others learn.'],
    ['CTDE', 'Centralised training, decentralised execution.'],
    ['Credit assignment', 'Working out which agent earned a shared reward.'],
    ['Self-play', 'Training against copies of oneself.'],
  ],
  deeper: '<p><b>Shared fisheries.</b> Fishing communities along the coasts of Senegal and Ghana coordinate where and when to fish, sometimes through cooperatives and radio. Coordination problems, where everyone gains by choosing together but loses by mismatching, are everywhere from traffic to markets.</p><p><b>Language agents.</b> Teams of LLM agents face the same issues of credit and coordination; later tracks build them.</p><p><b>About this machine.</b> Learning runs for real: 20 seeded seasons of 3,000 mornings each; the catches are invented.</p>',
  code: {
    title: 'Alone versus together',
    note: 'Adapted from the course\'s multi-agent lesson.',
    text: `
def independent_step(qa, qb, payoff, eps, alpha=0.1):
    a = explore_or_best(qa, eps); b = explore_or_best(qb, eps)
    r = payoff[a][b]
    qa[a] += alpha * (r - qa[a])             # each sees only its own action
    qb[b] += alpha * (r - qb[b])

def joint_step(Q, payoff, eps, alpha=0.1):
    a, b = explore_or_best_pair(Q, eps)
    Q[a, b] += alpha * (payoff[a][b] - Q[a, b])
`,
  },
};
