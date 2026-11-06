// MARL (phase 16, lesson 20): two yard robots at Tema port lift containers. Each picks Heavy (the big reward, only if both do) or Safe. Q-tables really learn below, seeded, for 3000 steps.
// Independent learners treat each other as noise; a central critic trained on joint actions finds the team move; a value mix (a QMIX-style sum) can't represent a penalty for mismatch. Central control needs a radio.
const GAMES = {
  team: { n: 'Lift together', r: [[8, 5], [5, 2]] },
  risk: { n: 'Risky lift', r: [[10, -9], [-9, 3]] },
};
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
function learn(alg, g, radio) {
  const R = GAMES[g].r, r = rng(11), A = 0.08, EPS = 0.2;
  const argmax = q => (q[1] > q[0] ? 1 : 0);
  if (alg === 'central' || alg === 'ctde') {
    const q = [0, 0, 0, R[1][1]];
    for (let t = 0; t < 3000; t++) { const j = r() < EPS ? Math.floor(r() * 4) : q.indexOf(Math.max(...q)), a = j >> 1, b = j & 1; q[j] += A * (R[a][b] - q[j]); }
    const j = q.indexOf(Math.max(...q)); let a = j >> 1, b = j & 1;
    if (alg === 'central' && !radio) { a = 0; b = 1; }
    return { a, b, q };
  }
  const start = R[1][1] / (alg === 'mix' ? 2 : 1), q1 = [0, start], q2 = [0, start];   // both begin on the safe routine
  for (let t = 0; t < 3000; t++) {
    const a = r() < EPS ? (r() < 0.5 ? 0 : 1) : argmax(q1), b = r() < EPS ? (r() < 0.5 ? 0 : 1) : argmax(q2), rw = R[a][b];
    if (alg === 'ind') { q1[a] += A * (rw - q1[a]); q2[b] += A * (rw - q2[b]); } else { const d = rw - (q1[a] + q2[b]); q1[a] += A * d / 2; q2[b] += A * d / 2; }
  }
  return { a: argmax(q1), b: argmax(q2), q: [...q1, ...q2] };
}
function run(o) { const L = learn(o.alg, o.g, o.radio), rw = GAMES[o.g].r[L.a][L.b], best = Math.max(...GAMES[o.g].r.flat()); return { ...L, rw, best }; }

export default {
  slug: 'marl-maddpg-qmix-mappo',
  title: 'MARL: train together, act alone',
  description: 'Two robots must lift together. Real Q-tables learn it four ways, and the design of training decides whether they find the team move.',
  overview: 'If each agent learns alone, the others look like a shifting environment. If one brain controls all, it doesn\'t scale and needs perfect communication. Centralised training with decentralised execution takes the good part of each: during training a critic sees everything, and in the field each agent acts on what it can see. MADDPG and MAPPO use a central critic. QMIX splits a team value into per-agent values that combine monotonically, which is neat and works until the task punishes mismatch, as such a sum can\'t express that. Here two port robots really learn, with Q-tables updated three thousand times right in your browser.',
  keywords: ['multi-agent reinforcement learning', 'MADDPG', 'QMIX', 'MAPPO', 'CTDE', 'centralized critic'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.68, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { alg: 'ctde', g: 'risk', radio: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const a = add(P.robot(BLUE, { scale: 0.85 })), b = add(P.robot('#7B6FA8', { scale: 0.85 }));
    const box = P.box(0.9, 0.36, 0.5, RED, { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: RED }) }); box.userData.noFit = true; S.add(box);
    const low = P.box(0.36, 0.24, 0.36, SAF, { r: 0.03 }); low.position.set(-2.1, 0.03, 0.42); S.add(low);
    const low2 = P.box(0.36, 0.24, 0.36, SAF, { r: 0.03 }); low2.position.set(0.1, 0.03, 0.42); S.add(low2);
    const brain = add(P.lamp('#C9C4B6', { h: 0.75, r: 0.14 })); brain.position.set(-1.0, 0.03, -0.55);
    const T = [0, 1].map(i => { const t = add(P.tower(0.5, 0.42, GOOD)); t.position.set(1.4 + i * 0.7, 0.03, -0.2); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      a.position.set(R.a === 0 ? -1.5 : -2.1, 0.03, R.a === 0 ? -0.1 : 0.1); b.position.set(R.b === 0 ? -0.5 : 0.1, 0.03, R.b === 0 ? -0.1 : 0.1);
      T[0].userData.set({ h: Math.max(0.05, R.best * 0.09), color: SAF });
      T[1].userData.set({ h: Math.max(0.05, Math.abs(R.rw) * 0.09), color: R.rw < 0 ? RED : R.rw === R.best ? GOOD : BAD });
      brain.userData.set({ color: st.alg === 'central' ? (st.radio ? SAF : RED) : st.alg === 'ctde' ? GOOD : '#C9C4B6', on: st.alg !== 'ind' });
      a.userData.set({ busy: true }); b.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const AK = ['ind', 'central', 'ctde', 'mix'], GK = ['team', 'risk'], AN = { ind: 'Independent learners', central: 'One central brain', ctde: 'Central critic in training', mix: 'A value mix (QMIX-style)' };
    const controls = [
      { type: 'buttons', label: 'How they learn', options: ['Independent', 'Central brain', 'Central critic', 'Value mix'], get: () => AK.indexOf(st.alg), act: i => set({ alg: AK[i] }) },
      { type: 'buttons', label: 'The task', options: ['Lift together', 'Risky lift'], get: () => GK.indexOf(st.g), act: i => set({ g: GK[i] }) },
      { type: 'toggle', label: 'A working radio at deployment', short: 'Radio', get: () => st.radio, set: v => set({ radio: !!v }) },
    ];
    const MOVE = ['heavy', 'safe'];
    const readouts = [
      { label: 'They chose', get: () => ({ v: `${MOVE[R.a]} + ${MOVE[R.b]}`, sub: AN[st.alg] }) },
      { label: 'Team reward', get: () => ({ v: `${R.rw}`, sub: `best possible ${R.best}`, good: R.rw === R.best, bad: R.rw < 0 }) },
      { label: 'Needs comms in the field', get: () => ({ v: st.alg === 'central' ? 'yes' : 'no', sub: st.alg === 'central' ? 'one brain, two bodies' : 'each acts alone', bad: st.alg === 'central' && !st.radio }) },
    ];
    const labels = [
      { name: 'b', t: 'Central lamp', d: 'On only while training', icon: 'eye', atV: V(-1.25, 0.8, -0.55) },
      { name: 't', t: 'Best, then what they got', d: 'Red: they dropped it', icon: 'target', atV: V(2.45, 0.15, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let each learn alone', hint: 'the other is just noise', on: () => set({ ...D0, alg: 'ind' }), off: reset },
      { label: 'Rely on the radio', hint: 'it fails in the yard', on: () => set({ ...D0, alg: 'central' }), off: reset },
      { label: 'Sum values on a mismatch penalty', hint: 'a mix can\'t say it', on: () => set({ ...D0, alg: 'mix' }), off: reset },
    ];
    function status() {
      const t = `${MOVE[R.a]} and ${MOVE[R.b]}`;
      if (st.alg === 'central' && !st.radio) return { ok: false, msg: `<b>The radio dropped, the robots mismatched, reward ${R.rw}.</b> One brain learned the right plan, and it can't reach its bodies. Decentralised execution exists for this: each robot must act on what it sees.` };
      if (R.rw === R.best) return { ok: true, msg: `<b>${AN[st.alg]} found ${t}: reward ${R.rw}, the best there is.</b> ${st.alg === 'ctde' ? 'The critic saw both robots in training, then each acts alone. That is CTDE.' : st.alg === 'mix' ? 'With no mismatch trap, the sum of two values is enough, and it scales.' : st.alg === 'ind' ? 'On an easy task, even independent learners get there.' : ''}` };
      if (st.alg === 'mix') return { ok: false, msg: `<b>The value mix settled on ${t}: reward ${R.rw}, best ${R.best}.</b> A sum of per-robot values can't say "heavy is great only if you both do it". The penalty dragged heavy's value down for both, so they play safe.` };
      if (st.alg === 'ind') return { ok: false, msg: `<b>They settled on ${t}: reward ${R.rw}, best ${R.best}.</b> Each tried heavy alone, while its partner played safe, and saw it fail. So each learned that heavy is bad. A lone learner can't tell a bad move from a partner who didn't join in.` };
      return { ok: R.rw > 0, msg: `<b>${t}: reward ${R.rw}.</b>` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt; const both = R.a === 0 && R.b === 0;
        box.position.set(-1.0, 0.03 + (both ? 0.32 + Math.sin(u * 2) * 0.1 : 0), 0.05); box.rotation.z = !both && R.a !== R.b ? 0.2 : 0;
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Two robots', home: true, say: 'Two yard robots at Tema port start on a safe routine. The heavy lift pays best, but only if both commit.', act: m => m.set({ alg: 'ind', g: 'risk', radio: false }) },
    { t: 'Alone', home: true, say: 'Each learns alone. Try heavy while your partner plays safe and the lift fails, so heavy looks bad and both stay safe.', act: m => m.set({ alg: 'ind', g: 'risk', radio: false }) },
    { t: 'One brain', home: true, say: 'Put one brain over both and it learns the plan. Then the radio drops, and the plan can\'t reach them.', act: m => m.set({ alg: 'central', g: 'risk', radio: false }) },
    { t: 'Train together', home: true, say: 'During training, a critic sees both robots. In the yard, each acts on what it sees. Train together, act alone.', act: m => m.set({ alg: 'ctde', g: 'risk', radio: false }) },
    { t: 'A value mix', home: true, say: 'QMIX splits team value into parts. It scales well, and works well when the task is simple.', act: m => m.set({ alg: 'mix', g: 'team', radio: false }) },
    { t: 'Where the mix fails', home: true, say: 'But a sum can\'t say "only if you both do it". On the risky lift, the mix plays safe.', act: m => m.set({ alg: 'mix', g: 'risk', radio: false }) },
  ],
  check: [
    { q: 'Why is independent learning hard?', options: ['Other agents make the world shift under you', 'It needs a radio', 'Rewards are private'], answer: 0, why: 'A move looks bad when a partner doesn\'t join in, and partners change as they learn.', hint: 'Try Let each learn alone.' },
    { q: 'What does CTDE mean?', options: ['Central training, decentralised execution', 'Central tools, deep exploration', 'Critic testing during evaluation'], answer: 0, why: 'A critic sees all in training; agents act alone.', hint: 'Choose Central critic.' },
    { q: 'Where does a monotonic value mix struggle?', options: ['When mismatch is punished', 'When rewards are positive', 'With two agents'], answer: 0, why: 'A monotonic sum can\'t express that joint penalty.', hint: 'Try Sum values on a mismatch penalty.' },
  ],
  terms: [
    ['MARL', 'Reinforcement learning with several agents.'],
    ['Non-stationary', 'The world changes as others learn.'],
    ['CTDE', 'Centralised training, decentralised execution.'],
    ['Central critic', 'A value function that sees all agents.'],
    ['Value decomposition', 'Splitting team value into per-agent parts.'],
    ['Exploration', 'Trying moves that may not be best.'],
  ],
  deeper: '<p><b>Which algorithm.</b> MADDPG has central critics with continuous actions. QMIX mixes per-agent values with a monotonic network. MAPPO runs PPO with a shared critic, and is a strong default.</p><p><b>This toy.</b> It is a two-robot matrix game, and the mix here is a plain sum, the simplest monotonic form. Real tasks add partial views and long horizons.</p><p><b>For LLM agents.</b> The same vocabulary helps when you train when to defer or which peer to call.</p>',
  code: {
    title: 'Independent or joint',
    note: 'Our own compact version of the course\'s comparison (code/main.py).',
    text: `
# independent: each robot updates only its own action's value
q1[a] += lr * (reward - q1[a])
q2[b] += lr * (reward - q2[b])

# central critic: the value of the joint action, used in training only
q[a, b] += lr * (reward - q[a, b])

# value mix: a sum of parts, trained on the team reward
delta = reward - (q1[a] + q2[b])
q1[a] += lr * delta / 2
q2[b] += lr * delta / 2
`,
  },
};
