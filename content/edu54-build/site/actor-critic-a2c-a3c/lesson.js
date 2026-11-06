// Actor-critic: a drone carries blood from a hub in Muhanga, Rwanda, to a hill clinic over eight waypoints. At take-off the actor chooses to climb high or stay low;
// every leg's reward is noisy (wind), arrival pays +10. The critic estimates each waypoint's value; the advantage of the take-off choice is estimated with GAE(lambda)
// from TD residuals. Bias and noise are computed for real from 4,000 seeded flights against the exact advantage. Critic error is fixed per waypoint (the start is exact).
// The entropy panel is illustrative. Break it: a poor critic with pure TD (biased), no critic at all (no baseline), no entropy bonus (the policy collapses early).
const K = 8, GAMMA = 0.97, MU = { high: 0.5, low: -0.5 }, STEP = -0.4, SD = 2, END = 10;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
/* exact values: V(s_k) for k = 1..K-1 after take-off; V(s_K) = 0 (landed) */
function trueV() { const V = Array(K + 1).fill(0); for (let k = K - 1; k >= 1; k--) V[k] = STEP + (k === K - 1 ? END : 0) + GAMMA * V[k + 1]; const Qh = MU.high + GAMMA * V[1], Ql = MU.low + GAMMA * V[1]; V[0] = (Qh + Ql) / 2; return { V, A: Qh - V[0] }; }
const ERR = [0, 2.4, -1.8, 2.9, -2.2, 1.6, -2.6, 2.0, 0];
function run(st) {
  const { V, A } = trueV(), r = rng(9), lam = [0, 0.95, 1][st.lam];
  const Vh = V.map((v, k) => (st.critic === 2 ? 0 : v + (k === 0 || k === K ? 0 : ERR[k] * (st.critic === 1 ? 1 : 0.12))));
  const samples = []; const deltas = Array(K).fill(0);
  for (let i = 0; i < 4000; i++) { let est = 0;
    for (let w = 0; w < st.workers; w++) { let gae = 0, coef = 1;
      for (let k = 0; k < K; k++) { const rew = (k === 0 ? MU.high : STEP + (k === K - 1 ? END : 0)) + SD * gauss(r), d = rew + GAMMA * Vh[k + 1] - Vh[k]; gae += coef * d; coef *= GAMMA * lam; if (i === 0 && w === 0) deltas[k] = d; }
      est += gae / st.workers; }
    samples.push(est); }
  const m = samples.reduce((a, b) => a + b, 0) / samples.length, sd = Math.sqrt(samples.reduce((a, b) => a + (b - m) ** 2, 0) / samples.length);
  return { V, Vh, A, samples, bias: m - A, sd, deltas, lam };
}

export default {
  slug: 'actor-critic-a2c-a3c',
  title: 'Actor-critic: a player and a coach',
  description: 'A drone carries blood from a hub in Muhanga to a hill clinic. The actor decides how to fly; the critic estimates how good each waypoint is, and their difference scores each decision. Turn the λ dial between one-step and whole-flight estimates, then give it a poor critic, no critic, or no entropy bonus.',
  overview: 'Actor-critic methods pair a policy, the actor, with a value estimate, the critic. The critic supplies the baseline that REINFORCE lacked, and lets the actor learn from every step. The signal for each decision is the advantage: how much better it turned out than the critic expected. The one-step version is the TD residual, δ = r + γV(s\') − V(s): low noise, but if the critic is wrong about the next state, the advantage is wrong too. The full-return version, G − V(s), trusts only real rewards: unbiased but noisy, because every later gust of wind adds noise. Generalised advantage estimation blends them, summing TD residuals with weights (γλ)^l: λ = 0 is pure TD, λ = 1 is the full return, and around 0.95 is the usual compromise. Training minimises a combined loss: the policy-gradient term weighted by the advantage, a squared error that trains the critic, and an entropy bonus that keeps the policy from becoming certain too early. A2C collects steps from many environments in parallel and averages them, cutting noise; A3C does the same with workers updating a shared model asynchronously.',
  keywords: ['actor-critic', 'advantage', 'td residual', 'gae', 'a2c', 'entropy bonus'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { lam: 1, critic: 0, workers: 8, ent: true };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const hills = [[-1.2, -0.3, 0.5], [0.0, 0.4, 0.6], [-0.4, -0.9, 0.4]].map(([x, z, rr]) => { const h = P.ball(rr, '#9DB37A'); h.scale.set(1.4, 0.35, 1); h.position.set(x, 0.12, z); S.add(h); return h; });
    const WX = k => -2.5 + k * (3.1 / K), WZ = k => 0.55 - Math.sin(k / K * Math.PI) * 0.75;
    const hub = P.box(0.35, 0.2, 0.35, '#B5541C', { r: 0.03 }); hub.position.set(WX(0), 0.12, WZ(0)); S.add(hub);
    const hT = S.text('Hub', { size: 0.1, weight: 800, color: ink }); hT.position.set(WX(0), 0.13, WZ(0) + 0.32); S.add(hT);
    const clinic = P.box(0.35, 0.25, 0.35, '#FFFFFF', { r: 0.03 }); clinic.position.set(WX(K), 0.12, WZ(K)); S.add(clinic);
    const cr = S.text('+', { size: 0.25, weight: 800, color: '#C62828' }); cr.position.set(WX(K), 0.38, WZ(K)); S.add(cr);
    const cT = S.text('Clinic', { size: 0.1, weight: 800, color: ink }); cT.position.set(WX(K), 0.13, WZ(K) + 0.32); S.add(cT);
    /* critic pillars: estimated value at each waypoint, a red cap shows its error */
    const pills = Array.from({ length: K }, (_, k) => { const mm = new THREE.MeshLambertMaterial({ color: '#3A6FB0' }), p = P.box(0.12, 1, 0.12, '#fff', { r: 0.01, material: mm }); p.position.set(WX(k), 0.12, WZ(k)); p.userData.noFit = true; S.add(p);
      const cap = P.box(0.14, 1, 0.14, '#C62828', { r: 0.01 }); cap.userData.noFit = true; S.add(cap);
      const d = P.box(0.06, 1, 0.06, '#E0A526'); d.userData.noFit = true; S.add(d); return { p, mm, cap, d }; });
    const route = P.tube(Array.from({ length: K + 1 }, (_, k) => V(WX(k), 0.95, WZ(k))), 0.012, '#6B5E86'); route.layers.set(1); S.add(route);
    const drone = new THREE.Group(); drone.userData.noFit = true; S.add(drone);
    const db = P.box(0.16, 0.05, 0.16, '#22252F', { r: 0.02 }); drone.add(db);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const r = P.cyl(0.06, 0.01, '#E07B39'); r.position.set(a * 0.11, 0.03, b * 0.11); drone.add(r); });
    const lT = S.text('Blue: critic\'s value · red: its error · gold: TD residual', { size: 0.09, weight: 700, color: '#5E5E6E' }); lT.position.set(-1.0, 0.13, 1.05); S.add(lT);
    /* histogram of advantage estimates */
    const panel = P.box(1.75, 0.05, 2.5, '#FBF8F1', { r: 0.03 }); panel.position.set(2.05, 0.12, 0.1); S.add(panel);
    const pH = S.text('Advantage estimates', { size: 0.11, weight: 800, color: '#6B5E86' }); pH.position.set(2.05, 0.18, -1.0); S.add(pH);
    const NB = 30, LO = -12, HI = 12, hb = Array.from({ length: NB }, (_, i) => { const b = P.box(0.045, 1, 0.05, '#1F9E89'); b.position.set(1.32 + i * 0.05, 0.17, -0.25); b.userData.noFit = true; S.add(b); return b; });
    const ax = P.box(1.56, 0.01, 0.01, ink); ax.position.set(2.05, 0.17, -0.22); S.add(ax);
    const tl = P.box(0.015, 0.75, 0.015, '#C62828'); tl.userData.noFit = true; S.add(tl);
    const tlT = S.text('true', { size: 0.08, weight: 800, color: '#C62828' }); tlT.userData.noFit = true; S.add(tlT);
    const pB = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.6 }); pB.position.set(2.05, 0.18, 0.15); S.add(pB);
    const pN = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.6 }); pN.position.set(2.05, 0.18, 0.42); S.add(pN);
    const pE = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.6 }); pE.position.set(2.05, 0.18, 0.7); S.add(pE);
    const pM = S.text('', { size: 0.1, weight: 700, color: '#5E5E6E', maxW: 1.6 }); pM.position.set(2.05, 0.18, 0.98); S.add(pM);
    const keep = P.box(5.6, 1.0, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); S.add(keep);

    let R = null, t0 = 0;
    const ent = () => (st.ent ? 0.42 : 0.03);
    function draw() {
      R = run(st);
      pills.forEach((q, k) => { const vh = R.Vh[k], vt = R.V[k], sc = 0.07, h = Math.max(0.02, vh * sc); q.p.scale.y = h; q.p.position.y = 0.12;
        const e = Math.abs(vh - vt) * sc; q.cap.visible = e > 0.01; q.cap.scale.y = Math.max(0.005, e); q.cap.position.set(WX(k), 0.12 + Math.min(vh, vt) * sc, WZ(k));
        const d = R.deltas[k], dh = Math.min(0.5, Math.abs(d) * 0.05); q.d.scale.y = Math.max(0.01, dh); q.d.position.set(WX(k) + 0.12, 0.12, WZ(k)); q.d.material.color.set(d >= 0 ? '#E0A526' : '#8A6D12'); q.mm.color.set(st.critic === 2 ? '#C9C3B5' : '#3A6FB0'); });
      const counts = Array(NB).fill(0); R.samples.forEach(v => { const i = Math.floor((v - LO) / (HI - LO) * NB); if (i >= 0 && i < NB) counts[i]++; }); const mx = Math.max(...counts);
      hb.forEach((b, i) => { const h = Math.max(0.005, counts[i] / mx * 0.7); b.scale.y = h; b.position.y = 0.17 + h / 2; });
      const tx = 1.32 + ((R.A - LO) / (HI - LO)) * NB * 0.05; tl.position.set(tx, 0.17 + 0.375, -0.25); tlT.position.set(tx, 0.95, -0.25);
      pB.userData.set(`Bias: ${R.bias >= 0 ? '+' : '−'}${Math.abs(R.bias).toFixed(2)}`, Math.abs(R.bias) > 0.5 ? '#C62828' : '#1D6B3A');
      pN.userData.set(`Noise: ${R.sd.toFixed(2)}`, R.sd > 2 ? '#C62828' : '#1D6B3A');
      pE.userData.set(`Policy entropy late: ${ent().toFixed(2)}`, st.ent ? ink : '#C62828');
      pM.userData.set(`λ = ${R.lam} · critic ${['trained', 'poor', 'none'][st.critic]} · ${st.workers} worker${st.workers > 1 ? 's' : ''}`);
    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; const u = (t0 * 0.12) % 1, f = u * K, k = Math.floor(f), w = f - k; drone.position.set(WX(k) + (WX(k + 1) - WX(k)) * w, 1.0, WZ(k) + (WZ(k + 1) - WZ(k)) * w); drone.rotation.y = t0 * 0.5; };
    update(0);
    const controls = [
      { type: 'buttons', label: 'λ', options: ['0 (one step)', '0.95', '1 (whole flight)'], get: () => st.lam, act: i => { st.lam = i; draw(); } },
      { type: 'buttons', label: 'Critic', options: ['Trained', 'Poor', 'None'], get: () => st.critic, act: i => { st.critic = i; draw(); } },
      { type: 'buttons', label: 'Parallel workers', options: ['1', '8'], get: () => (st.workers === 8 ? 1 : 0), act: i => { st.workers = i ? 8 : 1; draw(); } },
      { type: 'buttons', label: 'Entropy bonus', options: ['0.01', '0'], get: () => (st.ent ? 0 : 1), act: i => { st.ent = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Advantage bias', get: () => ({ v: `${R.bias >= 0 ? '+' : '−'}${Math.abs(R.bias).toFixed(2)}`, sub: `true advantage ${R.A.toFixed(2)}`, good: Math.abs(R.bias) < 0.3, bad: Math.abs(R.bias) > 0.5 }) },
      { label: 'Advantage noise', get: () => ({ v: R.sd.toFixed(2), sub: 'spread over 4,000 flights', good: R.sd < 1.5, bad: R.sd > 2.5 }) },
      { label: 'Policy entropy', get: () => ({ v: ent().toFixed(2), sub: 'late in training (illustrative)', good: st.ent, bad: !st.ent }) },
    ];
    const labels = [
      { name: 'route', t: 'The flight', d: 'One pillar per waypoint', icon: 'target', atV: V(WX(0) - 0.25, 0.25, WZ(0)) },
      { name: 'hist', t: 'Estimates', d: 'Red line: the true advantage', icon: 'scale', atV: V(2.93, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { lam: 1, critic: 0, workers: 8, ent: true }); draw(); };
    const breaks = [
      { label: 'Poor critic, one step', hint: 'λ = 0 trusts the critic', on: () => { reset(); st.critic = 1; st.lam = 0; draw(); }, off: reset },
      { label: 'No critic', hint: 'Advantage = raw return', on: () => { reset(); st.critic = 2; st.lam = 2; st.workers = 1; draw(); }, off: reset },
      { label: 'No entropy bonus', hint: 'Coefficient 0', on: () => { reset(); st.ent = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.critic === 2) return { ok: false, msg: `<b>Bias ${R.bias.toFixed(1)}, noise ${R.sd.toFixed(1)}.</b> With no critic every estimate is just the reward that followed, so the baseline is gone: the whole flight's value (${R.V[0].toFixed(1)}) is counted as if the take-off choice earned it, and every gust adds noise. A critic subtracts what was expected.` };
      if (st.critic === 1 && Math.abs(R.bias) > 0.5) return { ok: false, msg: `<b>Biased by ${R.bias >= 0 ? '+' : '−'}${Math.abs(R.bias).toFixed(2)}.</b> With λ = ${R.lam} the estimate leans on the critic's value of the next waypoints, and this critic is off by about two at each one (red caps). The true advantage is ${R.A.toFixed(2)}. Raise λ towards 1, or train the critic better.` };
      if (!st.ent) return { ok: false, msg: `<b>The policy stops exploring.</b> With no entropy bonus the actor becomes almost certain early (entropy ${ent().toFixed(2)}), so it stops trying the other altitude and cannot correct a wrong early lean. A small bonus, 0.01, keeps it curious while the critic learns.` };
      return { ok: true, msg: `<b>Bias ${R.bias >= 0 ? '+' : '−'}${Math.abs(R.bias).toFixed(2)}, noise ${R.sd.toFixed(2)}.</b> GAE with λ = ${R.lam} sums the TD residuals with fading weights, so a decent critic keeps noise down without much bias, and ${st.workers} parallel workers average their estimates.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The flight', home: true, say: 'A drone carries blood from a hub in Muhanga to a hill clinic over eight waypoints. Wind makes every leg uncertain.', act: m => m.set({ lam: 1, critic: 0, workers: 8, ent: true }) },
    { t: 'Actor and critic', home: true, say: 'The actor chooses how to fly. The critic estimates how good each waypoint is. The difference scores each decision.', act: m => m.set({}) },
    { t: 'The λ dial', home: true, say: 'One-step estimates are calm but trust the critic. Whole-flight estimates trust only real rewards but are noisy. λ blends them.', act: m => m.set({}) },
    { t: 'Poor critic', home: true, say: 'With a poor critic and one-step estimates, every score is biased by the critic\'s mistakes.', act: m => m.set({ critic: 1, lam: 0 }) },
    { t: 'No critic', home: true, say: 'Remove the critic, and each decision is credited with the whole flight\'s reward. Bias and noise both soar.', act: m => m.set({ critic: 2, lam: 2, workers: 1 }) },
    { t: 'No entropy', home: true, say: 'Drop the entropy bonus, and the actor becomes certain too early and stops trying the other way.', act: m => m.set({ critic: 0, lam: 1, workers: 8, ent: false }) },
  ],
  check: [
    { q: 'What is the TD residual?', options: ['r + γV(s\') − V(s)', 'The whole return', 'The policy\'s entropy'], answer: 0, why: 'The one-step advantage.' },
    { q: 'What does λ trade off in GAE?', options: ['Bias from the critic against noise from rewards', 'Speed against memory', 'Actions against states'], answer: 0, why: '0 is TD, 1 is the full return.' },
    { q: 'Why add an entropy bonus?', options: ['To keep the policy from becoming certain too early', 'To train the critic', 'To lower bias'], answer: 0, why: 'It keeps exploring.' },
  ],
  terms: [
    ['Actor', 'The policy that chooses actions.'],
    ['Critic', 'The value estimate that judges them.'],
    ['Advantage', 'How much better an action did than expected.'],
    ['GAE', 'A weighted sum of TD residuals, set by λ.'],
    ['A2C', 'Synchronous actor-critic over parallel environments.'],
    ['Entropy bonus', 'A reward for keeping the policy uncertain.'],
  ],
  deeper: '<p><b>Medical drones.</b> Rwanda and Ghana have flown blood and vaccines to hill clinics by drone for years. Real flight control uses classical methods for safety, while learning methods help with planning and scheduling under weather.</p><p><b>Next.</b> PPO keeps actor-critic updates from moving the policy too far at once, which made it the default for robotics and for fine-tuning language models.</p><p><b>About this machine.</b> Bias and noise are computed from 4,000 seeded flights against the exact advantage; the entropy figure is illustrative.</p>',
  code: {
    title: 'Generalised advantage estimation',
    note: 'Adapted from the course\'s actor-critic lesson.',
    text: `
def gae(rewards, values, gamma=0.97, lam=0.95):
    adv, run = [0.0] * len(rewards), 0.0
    for t in reversed(range(len(rewards))):
        delta = rewards[t] + gamma * values[t + 1] - values[t]
        run = delta + gamma * lam * run
        adv[t] = run
    return adv                               # len(values) == len(rewards) + 1
`,
  },
};
