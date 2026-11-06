// REINFORCE: a community radio station in Kano chooses a time slot each day for a vaccination message: early morning, midday or evening. The reward is the number of
// callers who ring in afterwards (in tens; about 23, 21 and 25 on average, noisy). A softmax policy over the three slots is trained with REINFORCE, with or without a
// running-average baseline. Everything runs for real: 20 seeded runs per setting, one shown.
// Break it: no baseline (all-positive rewards push every slot up; slow and noisy), a step size so large it locks onto a slot early, too few days.
const SLOTS = ['Early morning', 'Midday', 'Evening'], MEAN = [23, 21, 25], SD = 4, BEST = 2;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
const soft = th => { const m = Math.max(...th), e = th.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); };
function train(st, seed, keep) {
  const r = rng(seed), th = [0, 0, 0], days = [100, 1000][st.n], lr = [0.002, 0.02, 0.3][st.lr]; let b = 0; const curve = [], gs = [];
  for (let d = 0; d < days; d++) { const p = soft(th), u = r(); const a = u < p[0] ? 0 : u < p[0] + p[1] ? 1 : 2, G = MEAN[a] + SD * gauss(r);
    const adv = st.base ? G - b : G; b += 0.05 * (G - b);
    for (let k = 0; k < 3; k++) { const g = adv * ((k === a ? 1 : 0) - p[k]); th[k] += lr * g; if (k === BEST) gs.push(g); }
    if (keep && d % Math.max(1, Math.floor(days / 40)) === 0) curve.push(soft(th)[BEST]); }
  const m = gs.reduce((a, x) => a + x, 0) / gs.length, v = gs.reduce((a, x) => a + (x - m) ** 2, 0) / gs.length;
  return { p: soft(th), curve, sd: Math.sqrt(v) };
}
function run(st) { const shown = train(st, 101, true); let found = 0, wrong = 0; for (let i = 0; i < 20; i++) { const p = train(st, 200 + i, false).p; if (p[BEST] > 0.8) found++; if (Math.max(p[0], p[1]) > 0.8) wrong++; } return { ...shown, found, wrong }; }

export default {
  slug: 'policy-gradients-reinforce',
  title: 'REINFORCE: push up what paid',
  description: 'A community radio station in Kano picks a time slot each day for a vaccination message. A policy learns straight from callers, with no value table in between.',
  overview: 'Value methods learn how good actions are and then act greedily; policy gradient methods adjust the policy directly. Write the policy as probabilities, here a softmax over three slots with one score each. The policy gradient theorem says the direction that raises expected return is the average, over what you tried, of the return times the gradient of the log-probability of the action taken. For a softmax that gradient is simple: raise the score of the action taken, lower the others in proportion to their probability. REINFORCE does exactly that after each episode. Its weakness is variance: returns are noisy, and if every return is positive, as caller counts are, every action taken gets pushed up and only the size of the push tells good from bad, so learning is slow and jittery. Subtracting a baseline that does not depend on the action, such as a running average of returns, leaves the gradient unbiased while making below-average outcomes push down and above-average ones push up. A learned state-value baseline turns this into actor-critic. And the step size matters: too large and one lucky day can lock the policy onto the wrong choice for good.',
  keywords: ['policy gradient', 'reinforce', 'baseline', 'variance', 'softmax policy', 'log-derivative trick'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.0, 1.15], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { base: true, lr: 1, n: 1 };
    const ink = '#151827';
    /* the radio mast */
    const mast = P.cyl(0.05, 1.1, '#B5541C', { r2: 0.02 }); mast.position.set(-2.4, 0.12, -0.6); floor.add(mast);

    const waves = [0, 1, 2].map(i => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.15 + i * 0.12, 0.012, 6, 32, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: '#E07B39' })); w.position.set(-2.4, 1.15, -0.6); w.rotation.z = Math.PI * 0.2; w.layers.set(1); w.userData.noFit = true; floor.add(w); return w; });
    /* the three slots: policy probability bars */
    const SX = i => -1.25 + i * 0.85;
    const slots = SLOTS.map((n, i) => { const pad = P.box(0.7, 0.04, 0.7, '#FFFFFF', { r: 0.03 }); pad.position.set(SX(i), 0.12, -0.2); floor.add(pad);
      const mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), bar = P.box(0.42, 1, 0.42, '#fff', { r: 0.03, material: mm }); bar.position.set(SX(i), 0.16, -0.2); bar.userData.noFit = true; floor.add(bar);
         return { bar, mm }; });
    const keepBars = P.box(2.6, 0.9, 0.7, '#000'); keepBars.material = new THREE.MeshBasicMaterial({ visible: false }); keepBars.position.set(-0.4, 0.12, -0.2); floor.add(keepBars);
    /* learning curve */

    const cb = Array.from({ length: 40 }, (_, i) => { const b = P.box(0.032, 1, 0.05, '#1F9E89'); b.position.set(1.28 + i * 0.039, 0.17, -0.25); b.userData.noFit = true; floor.add(b); return b; });
    const ax = P.box(1.56, 0.01, 0.01, ink); ax.position.set(2.05, 0.17, -0.22); floor.add(ax);

    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, t0 = 0;
    function draw() {
      R = run(st);
      slots.forEach((s, i) => { const h = 0.03 + R.p[i] * 0.8; s.bar.scale.y = h; s.mm.color.set(i === BEST ? '#1F9E89' : R.p[i] > 0.8 ? '#C62828' : '#6B5E86');   });
      cb.forEach((b, i) => { const v = R.curve[i]; b.visible = v != null; if (v == null) return; const h = Math.max(0.01, v * 0.7); b.scale.y = h; b.position.y = 0.17 + h / 2; b.material.color.set(v > 0.8 ? '#1F9E89' : v > 0.4 ? '#E0A526' : '#C62828'); });
      const top = R.p.indexOf(Math.max(...R.p));

    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; waves.forEach((w, i) => { const u = (t0 * 0.8 + i / 3) % 1; w.scale.setScalar(0.6 + u * 0.8); w.material.color.set(u > 0.8 ? '#F2C7A6' : '#E07B39'); }); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Baseline', options: ['None', 'Running average'], get: () => (st.base ? 1 : 0), act: i => { st.base = !!i; draw(); } },
      { type: 'buttons', label: 'Step size', options: ['0.002', '0.02', '0.3'], get: () => st.lr, act: i => { st.lr = i; draw(); } },
      { type: 'buttons', label: 'Days', options: ['100', '1,000'], get: () => st.n, act: i => { st.n = i; draw(); } },
    ];
    const readouts = [
      { label: 'Runs on evening', get: () => ({ v: `${R.found}/20`, sub: 'chance of evening above 80%', good: R.found >= 16, bad: R.found < 10 }) },
      { label: 'Locked on wrong', get: () => ({ v: `${R.wrong}/20`, sub: 'runs stuck on a worse slot', good: R.wrong === 0, bad: R.wrong > 2 }) },
      { label: 'Gradient noise', get: () => ({ v: R.sd.toFixed(1), sub: 'spread of each update', good: R.sd < 3, bad: R.sd > 5 }) },
    ];
    const labels = [
      { name: 'slots', t: 'The policy', d: 'Bar height: chance of each slot', icon: 'scale', atV: V(SX(0) - 0.3, 0.12, -0.2) },
      { name: 'curve', t: 'One run', d: 'Chance of evening over time', icon: 'wave', atV: V(2.5, 0.12, -0.15) },
    ];
    const reset = () => { Object.assign(st, { base: true, lr: 1, n: 1 }); draw(); };
    const breaks = [
      { label: 'No baseline', hint: 'Raw caller counts', on: () => { reset(); st.base = false; st.lr = 0; draw(); }, off: reset },
      { label: 'Huge steps', hint: 'Step size 0.3', on: () => { reset(); st.lr = 2; st.base = false; draw(); }, off: reset },
      { label: 'Only 100 days', hint: 'Small step, short run', on: () => { reset(); st.n = 0; st.lr = 0; draw(); }, off: reset },
    ];
    function status() {
      if (st.lr === 2 && R.wrong > 0) return { ok: false, msg: `<b>${R.wrong} of 20 runs lock onto a worse slot.</b> With steps of 0.3 and raw counts around 230, one early day pushes a slot's score so far that its chance jumps near 100% and the others are never tried again. Smaller steps, and a baseline, keep the policy exploring until the evidence is in.` };
      if (!st.base && R.found < 16) return { ok: false, msg: `<b>Only ${R.found} of 20 runs find evening.</b> Every caller count is positive, so every slot aired gets pushed up; only the size of the push tells good from bad, and the noise (${R.sd.toFixed(1)}) swamps it. Subtract a running average: below-average days push down, above-average days push up.` };
      if (R.found < 16) return { ok: false, msg: `<b>Not settled after ${[100, 1000][st.n]} days.</b> With small steps the policy moves slowly: ${R.found} of 20 runs have settled. Train longer or step a little larger.` };
      return { ok: true, msg: `<b>${R.found} of 20 runs settle on evening.</b> Each day the slot aired is pushed up or down by how its callers compared with the running average, so the noise is ${R.sd.toFixed(1)} and the better slot wins steadily.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three slots', home: true, say: 'A community radio station in Kano airs a vaccination message once a day: early morning, midday or evening, and counts the callers who ring in.', act: m => m.set({ base: true, lr: 1, n: 1 }) },
    { t: 'A policy', home: true, say: 'The policy is a chance for each slot. Each day it picks one at random by those chances.', act: m => m.set({}) },
    { t: 'Push up what paid', home: true, say: 'After each day, the slot aired is pushed up if callers beat the running average, and down if they fell short. Evening wins.', act: m => m.set({}) },
    { t: 'No baseline', home: true, say: 'Use raw caller counts, always positive, and every slot gets pushed up. Learning crawls through the noise.', act: m => m.set({ base: false, lr: 0 }) },
    { t: 'Huge steps', home: true, say: 'Take huge steps, and one lucky day can lock the policy onto the wrong slot for good.', act: m => m.set({ lr: 2 }) },
    { t: 'Too short', home: true, say: 'With small steps over only a hundred days, the policy has barely moved.', act: m => m.set({ base: true, lr: 0, n: 0 }) },
  ],
  check: [
    { q: 'What does REINFORCE push up?', options: ['The log-probability of actions, weighted by the return that followed', 'The value of each state', 'The step size'], answer: 0, why: 'The policy gradient theorem.' },
    { q: 'Why subtract a baseline?', options: ['To reduce variance without biasing the gradient', 'To make rewards positive', 'To explore more'], answer: 0, why: 'Below-average outcomes push down.' },
    { q: 'What can a very large step size do?', options: ['Lock the policy onto a choice too early', 'Remove noise', 'Make it unbiased'], answer: 0, why: 'One lucky outcome dominates.' },
  ],
  terms: [
    ['Policy gradient', 'Adjusting policy parameters in the direction that raises return.'],
    ['REINFORCE', 'Return times the gradient of log-probability, averaged.'],
    ['Softmax policy', 'Scores turned into probabilities.'],
    ['Baseline', 'A value subtracted from returns to cut variance.'],
    ['Variance', 'How much the update jumps around from one sample to the next.'],
    ['Log-derivative trick', 'Writing a gradient of an expectation as an expectation.'],
  ],
  deeper: '<p><b>Public health messages.</b> Community radio in Kano, Mopti and Gulu reaches people that health workers cannot. Testing which slot, voice and language gets the most response is an everyday version of learning a policy from noisy feedback.</p><p><b>Next.</b> Actor-critic methods learn the baseline as a value function and update every step; PPO keeps each update from moving the policy too far.</p><p><b>About this machine.</b> REINFORCE runs for real: 20 seeded runs per setting; the caller numbers are invented.</p>',
  code: {
    title: 'REINFORCE with a baseline',
    note: 'Adapted from the course\'s policy-gradient lesson.',
    text: `
def reinforce_step(theta, a, G, baseline, lr=0.02):
    p = softmax(theta)
    adv = G - baseline                       # above or below average
    for k in range(len(theta)):
        grad_logp = (1 if k == a else 0) - p[k]
        theta[k] += lr * adv * grad_logp
    return theta
`,
  },
};
