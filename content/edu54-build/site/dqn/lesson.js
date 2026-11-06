// Deep Q-networks: a small phone game made in Abidjan, "Mango Catch", where a basket catches falling mangoes. A network reads the last four frames and outputs a Q-value
// for left, stay and right. The tricks: experience replay (train on random past moments), a target network (a frozen copy for the targets, refreshed every 1,000 steps)
// and Double DQN (one network picks the action, the other scores it). The overestimation numbers are computed for real (2,000 seeded noisy estimates); the training
// curves are illustrative, following the reported pattern: without replay learning wobbles on correlated frames, without a target network it chases itself and collapses.
// Break it: no replay, no target network, no Double DQN (values inflate).
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
function overestimate(double) { const r = rng(5); let s = 0; const TRUE = 1.0, SD = 0.5;
  for (let i = 0; i < 2000; i++) { const a = [0, 1, 2].map(() => TRUE + SD * gauss(r)), b = [0, 1, 2].map(() => TRUE + SD * gauss(r));
    if (double) { const k = a.indexOf(Math.max(...a)); s += b[k]; } else s += Math.max(...a); } return s / 2000 - TRUE; }
function curve(st) { const r = rng(3 + (st.replay ? 1 : 0) + (st.target ? 2 : 0) + (st.double ? 4 : 0)), N = 60, out = [];
  const top = 40 * (st.double ? 1 : 0.9);
  for (let i = 0; i < N; i++) { const t = i / N; let v = top * (1 - Math.exp(-t * 5));
    if (!st.replay) v = v * 0.55 + 9 * Math.sin(i * 0.9) + 6 * gauss(r);
    if (!st.target && t > 0.35) v = v * Math.max(0.1, 1 - (t - 0.35) * 2.2) + 8 * gauss(r) * (t > 0.5 ? 1 : 0.4);
    out.push(Math.max(0, v + 1.5 * gauss(r))); }
  return out; }

export default {
  slug: 'dqn',
  title: 'DQN: a network that plays',
  description: 'A small phone game made in Abidjan: a basket catches falling mangoes. A deep Q-network learns to play from the screen alone, steadied by a replay memory, a frozen target network and Double DQN. Then take away replay, the target network or Double DQN, and watch learning wobble, collapse or overrate itself.',
  overview: 'A Q-table cannot list every screen of a game, so DQN replaces it with a neural network: the last four frames go in, and out comes one Q-value per action. Training minimises the squared TD error between Q(s, a) and the target r + γ max Q(s\', a\'). Done naively this is unstable, and three tricks made it work on Atari in 2015. Experience replay stores past transitions in a large ring buffer and trains on random minibatches, which breaks the correlation between consecutive frames and lets rare rewards be learned from many times. A target network, a frozen copy of the weights refreshed every few thousand steps, computes the targets, so the network is not chasing a target that moves with every update. Reward clipping keeps games with big scores from dominating. Double DQN fixes a quieter problem: taking the maximum of noisy estimates is biased upward, because whichever action happens to be overestimated wins; using the online network to choose the action and the target network to score it removes that bias. Rainbow later stacked prioritised replay, duelling heads, noisy exploration, n-step and distributional targets.',
  keywords: ['dqn', 'experience replay', 'target network', 'double dqn', 'maximization bias', 'deep reinforcement learning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.15, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { replay: true, target: true, double: true };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* the game screen */
    const phone = P.box(1.25, 0.06, 1.95, '#22252F', { r: 0.08 }); phone.position.set(-2.2, 0.12, 0.1); S.add(phone);
    const scr = P.box(1.1, 0.01, 1.7, '#BFE3F2'); scr.position.set(-2.2, 0.18, 0.1); S.add(scr);
    const gT = S.text('Mango Catch', { size: 0.1, weight: 800, color: '#B5541C' }); gT.position.set(-2.2, 0.195, -0.62); S.add(gT);
    const mango = P.ball(0.07, '#F2A12B'); mango.scale.set(1, 0.85, 1.2); mango.userData.noFit = true; S.add(mango);
    const basket = P.box(0.26, 0.06, 0.1, '#8A5A2B', { r: 0.02 }); basket.userData.noFit = true; S.add(basket);
    const frames = [0, 1, 2, 3].map(i => { const f = P.box(0.32, 0.02, 0.48, '#BFE3F2', { r: 0.01 }); f.position.set(-1.05 + i * 0.06, 0.13 + i * 0.03, -0.45 + i * 0.05); S.add(f); return f; });
    const fT = S.text('Last 4 frames', { size: 0.09, weight: 800, color: ink }); fT.position.set(-0.95, 0.13, -0.05); S.add(fT);
    /* online network, target network, Q heads */
    const net = P.box(0.75, 0.4, 0.85, C.plum, { r: 0.06 }); net.position.set(0.1, 0.12, -0.35); S.add(net);
    const nT = S.text('Online net', { size: 0.12, weight: 800, color: '#FFFFFF' }); nT.position.set(0.1, 0.53, -0.35); S.add(nT);
    const tgM = new THREE.MeshLambertMaterial({ color: '#9C8AB8', transparent: true, opacity: 0.85 }), tgt = P.box(0.75, 0.3, 0.6, '#9C8AB8', { r: 0.06, material: tgM }); tgt.position.set(0.1, 0.12, 0.55); S.add(tgt);
    const tT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', maxW: 0.7 }); tT.position.set(0.1, 0.43, 0.55); S.add(tT);
    const heads = ['Left', 'Stay', 'Right'].map((n, i) => { const b = P.box(0.16, 1, 0.16, '#E07B39', { r: 0.02 }); b.position.set(0.85 + i * 0.25, 0.12, -0.35); b.userData.noFit = true; S.add(b);
      const t = S.text(n, { size: 0.085, weight: 800, color: ink }); t.position.set(0.85 + i * 0.25, 0.13, -0.12); S.add(t); return b; });
    const qT = S.text('Q-values', { size: 0.1, weight: 800, color: ink }); qT.position.set(1.1, 0.13, -0.8); S.add(qT);
    /* the replay buffer: a ring of cards */
    const ring = new THREE.Group(); ring.position.set(1.1, 0.12, 0.65); S.add(ring);
    const cards = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, c = P.box(0.06, 0.14, 0.1, '#FBF8F1', { r: 0.01 }); c.position.set(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.3); c.rotation.y = -a; ring.add(c); return c; });
    const rT = S.text('', { size: 0.09, weight: 800, color: ink, maxW: 0.9 }); rT.position.set(1.1, 0.13, 1.12); S.add(rT);
    /* training curve panel */
    const panel = P.box(1.4, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); panel.position.set(2.25, 0.12, 0.1); S.add(panel);
    const pH = S.text('Score while training', { size: 0.1, weight: 800, color: '#6B5E86', maxW: 1.3 }); pH.position.set(2.25, 0.18, -1.0); S.add(pH);
    const cb = Array.from({ length: 30 }, (_, i) => { const b = P.box(0.034, 1, 0.05, '#1F9E89'); b.position.set(1.66 + i * 0.041, 0.17, -0.2); b.userData.noFit = true; S.add(b); return b; });
    const ax = P.box(1.26, 0.01, 0.01, ink); ax.position.set(2.25, 0.17, -0.17); S.add(ax);
    const pS = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.3 }); pS.position.set(2.25, 0.18, 0.25); S.add(pS);
    const pO = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.3 }); pO.position.set(2.25, 0.18, 0.6); S.add(pO);
    const keep = P.box(5.6, 0.5, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let C1 = null, over = 0, t0 = 0, final = 0;
    function draw() {
      C1 = curve(st); over = overestimate(st.double);
      for (let i = 0; i < 30; i++) { const v = (C1[i * 2] + C1[i * 2 + 1]) / 2, h = Math.max(0.01, Math.min(0.75, v / 45 * 0.75)); cb[i].scale.y = h; cb[i].position.y = 0.17 + h / 2; cb[i].material.color.set(v > 25 ? '#1F9E89' : v > 12 ? '#E0A526' : '#C62828'); }
      final = C1.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const qs = [0.55, 0.62, 0.95].map(q => q + over * 0.6); heads.forEach((b, i) => { const h = Math.max(0.03, qs[i] * 0.45); b.scale.y = h; b.material.color.set(i === 2 ? '#E0A526' : '#E07B39'); });
      tgt.visible = !!st.target; tT.visible = !!st.target; tT.userData.set('Target net\ncopied every 1,000', '#FFFFFF');
      cards.forEach((c, i) => { c.visible = st.replay || i < 2; });
      rT.userData.set(st.replay ? 'Replay: random past moments' : 'No replay: only the latest frames', st.replay ? ink : '#C62828');
      pS.userData.set(`Last stretch: ${final.toFixed(0)} mangoes`, final > 25 ? '#1D6B3A' : '#C62828');
      pO.userData.set(over > 0.05 ? `Values overrated by ${over.toFixed(2)}` : 'Values about right', over > 0.2 ? '#C62828' : '#1D6B3A');
    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const u = (t0 * 0.6) % 1, lane = Math.floor(t0 * 0.6) % 3, x = -2.2 + (lane - 1) * 0.35;
      mango.position.set(x, 0.24, -0.6 + u * 1.25); const good = final > 25, bx = good ? x : -2.2 + Math.sin(t0 * 1.7) * 0.35; basket.position.set(bx, 0.2, 0.7); ring.rotation.y = st.replay ? t0 * 0.4 : 0; };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Experience replay', options: ['On', 'Off'], get: () => (st.replay ? 0 : 1), act: i => { st.replay = !i; draw(); } },
      { type: 'buttons', label: 'Target network', options: ['Frozen copy', 'None'], get: () => (st.target ? 0 : 1), act: i => { st.target = !i; draw(); } },
      { type: 'buttons', label: 'Double DQN', options: ['On', 'Off'], get: () => (st.double ? 0 : 1), act: i => { st.double = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Score', get: () => ({ v: final.toFixed(0), sub: 'mangoes, end of training (illustrative)', good: final > 25, bad: final < 15 }) },
      { label: 'Overestimate', get: () => ({ v: `${over >= 0 ? '+' : '−'}${Math.abs(over).toFixed(2)}`, sub: 'target above true value, computed', good: over < 0.1, bad: over > 0.2 }) },
      { label: 'Training', get: () => { const late = C1.slice(-15), m = late.reduce((a, b) => a + b, 0) / 15, sd = Math.sqrt(late.reduce((a, b) => a + (b - m) ** 2, 0) / 15); return { v: sd < 4 && m > 25 ? 'Stable' : m < 12 ? 'Collapsed' : 'Wobbly', sub: 'late in training', good: sd < 4 && m > 25, bad: m < 25 }; } },
    ];
    const labels = [
      { name: 'game', t: 'The game', d: 'The network sees only frames', icon: 'eye', atV: V(-2.83, 0.2, 0.1) },
      { name: 'curve', t: 'Training', d: 'Red: bad stretches', icon: 'wave', atV: V(2.95, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { replay: true, target: true, double: true }); draw(); };
    const breaks = [
      { label: 'No replay', hint: 'Learn from frames in order', on: () => { reset(); st.replay = false; draw(); }, off: reset },
      { label: 'No target network', hint: 'Targets from the same net', on: () => { reset(); st.target = false; draw(); }, off: reset },
      { label: 'No Double DQN', hint: 'Max of noisy estimates', on: () => { reset(); st.double = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.replay) return { ok: false, msg: `<b>Learning wobbles.</b> Without replay the network trains on frames in the order they come, and consecutive frames are nearly identical, so each batch pushes it the same way and the next undoes it. A ring buffer of past moments, sampled at random, breaks that correlation.` };
      if (!st.target) return { ok: false, msg: `<b>It learns, then collapses.</b> With no frozen copy, every update changes the targets it is chasing, and errors feed on themselves until the score falls to about ${final.toFixed(0)}. Compute targets with a target network copied only every 1,000 steps.` };
      if (!st.double) return { ok: false, msg: `<b>It overrates every move by ${over.toFixed(2)}.</b> Taking the maximum over noisy estimates picks whichever action happens to be overestimated, so targets drift upward (computed on 2,000 draws). Double DQN lets the online network choose and the target network score: the bias drops to about ${Math.abs(overestimate(true)).toFixed(2)}.` };
      return { ok: true, msg: `<b>Stable learning, about ${final.toFixed(0)} mangoes a game.</b> Replay decorrelates the batches, the frozen target network holds the targets still, and Double DQN keeps the values honest (bias about ${Math.abs(over).toFixed(2)}).` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The game', home: true, say: 'A phone game made in Abidjan: a basket catches falling mangoes. A network learns to play from the screen alone.', act: m => m.set({ replay: true, target: true, double: true }) },
    { t: 'Frames to values', home: true, say: 'The last four frames go in. Out comes a value for moving left, staying or moving right, and the best one is played.', act: m => m.set({}) },
    { t: 'Three tricks', home: true, say: 'It trains on random past moments from a replay memory, against targets from a frozen copy of itself, with Double DQN keeping values honest.', act: m => m.set({}) },
    { t: 'No replay', home: true, say: 'Learn only from frames in order, and nearly identical frames push it back and forth. Learning wobbles.', act: m => m.set({ replay: false }) },
    { t: 'No target', home: true, say: 'Compute targets with the same network being trained, and it chases itself until it collapses.', act: m => m.set({ replay: true, target: false }) },
    { t: 'No Double DQN', home: true, say: 'Take the maximum of noisy guesses, and every move looks better than it is.', act: m => m.set({ target: true, double: false }) },
  ],
  check: [
    { q: 'What does experience replay fix?', options: ['Correlation between consecutive training samples', 'Overestimation', 'Slow screens'], answer: 0, why: 'Random minibatches from a buffer.' },
    { q: 'Why use a frozen target network?', options: ['So targets do not move with every update', 'To store frames', 'To pick actions'], answer: 0, why: 'Otherwise it chases its own tail.' },
    { q: 'Why does max over noisy estimates overestimate?', options: ['The action that happens to be overestimated wins', 'Rewards are clipped', 'The buffer is small'], answer: 0, why: 'Double DQN separates choosing and scoring.' },
  ],
  terms: [
    ['DQN', 'Q-learning with a neural network estimating Q.'],
    ['Experience replay', 'Training on random samples from past transitions.'],
    ['Target network', 'A frozen copy that computes targets.'],
    ['Double DQN', 'One network chooses the action, the other scores it.'],
    ['Maximization bias', 'Upward bias from taking the max of noisy values.'],
    ['Reward clipping', 'Squashing rewards to −1, 0 or +1.'],
  ],
  deeper: '<p><b>Games as a lab.</b> Studios in Abidjan, Lagos and Nairobi build mobile games for local audiences. Game-playing agents are useful for testing levels and balancing difficulty, long before anyone plays them.</p><p><b>Beyond Atari.</b> The same stabilising tricks appear across deep RL: replay buffers in off-policy methods, slowly updated target networks in actor-critic methods such as DDPG and SAC.</p><p><b>About this machine.</b> Overestimation is computed for real on 2,000 seeded noisy estimates; training curves are illustrative and follow the reported pattern.</p>',
  code: {
    title: 'The DQN loss',
    note: 'Adapted from the course\'s DQN lesson.',
    text: `
def dqn_loss(online, target, batch, gamma=0.99, double=True):
    s, a, r, s2, done = batch                     # sampled from replay
    q = online(s).gather(1, a)
    with torch.no_grad():
        if double:
            a2 = online(s2).argmax(1, keepdim=True)
            q2 = target(s2).gather(1, a2)          # choose online, score target
        else:
            q2 = target(s2).max(1, keepdim=True).values
        y = r + gamma * (1 - done) * q2
    return F.smooth_l1_loss(q, y)
`,
  },
};
