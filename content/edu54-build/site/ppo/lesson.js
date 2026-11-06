// PPO: an SMS farm-advice line in Lilongwe tunes how it writes replies (short, detailed, with a local example, or asking questions first) from farmers' thumbs-up
// ratings. A softmax policy over the four styles is trained on batches of 16 rated replies, reusing each batch for several epochs, with the clipped surrogate or the
// plain (unclipped) one. Everything runs for real: 20 seeded runs of 40 batches per setting; one run shown. Thumbs-up chances: 55%, 60%, 75%, 50%.
// Break it: unclipped with many epochs (each batch drags the policy far: big KL, some runs lock onto a worse style), a clip range so wide it does nothing.
const STYLES = ['Short', 'Detailed', 'Local example', 'Questions first'], PUP = [0.55, 0.6, 0.75, 0.5], BEST = 2;
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const soft = th => { const m = Math.max(...th), e = th.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); };
function train(st, seed, keep) {
  const r = rng(seed), th = [0, 0, 0, 0], eps = [0.1, 0.2, 5][st.eps], K = [1, 4, 20][st.k], LR = 3; let kl = 0; const hist = [];
  for (let it = 0; it < 40; it++) { const old = soft(th), batch = [];
    for (let i = 0; i < 16; i++) { const u = r(); let a = 0, c = old[0]; while (u > c && a < 3) { a++; c += old[a]; } batch.push([a, r() < PUP[a] ? 1 : 0]); }
    const mean = batch.reduce((s, b) => s + b[1], 0) / 16;
    for (let e = 0; e < K; e++) { const p = soft(th), g = [0, 0, 0, 0];
      batch.forEach(([a, R]) => { const A = R - mean, ratio = p[a] / old[a]; if (st.clip && ((A > 0 && ratio > 1 + eps) || (A < 0 && ratio < 1 - eps))) return; for (let k = 0; k < 4; k++) g[k] += ratio * A * ((k === a ? 1 : 0) - p[k]); });
      for (let k = 0; k < 4; k++) th[k] += LR * g[k] / 16; }
    const nw = soft(th); kl += old.reduce((s, q, k) => s + q * Math.log(q / Math.max(1e-9, nw[k])), 0); if (keep) hist.push(nw.slice()); }
  return { p: soft(th), kl: kl / 40, hist };
}
function run(st) { const shown = train(st, 77, true); let good = 0, wrong = 0, kl = 0; for (let i = 0; i < 20; i++) { const o = train(st, 300 + i, false); kl += o.kl / 20; if (o.p[BEST] > 0.7) good++; if (o.p.some((q, k) => k !== BEST && q > 0.7)) wrong++; } return { ...shown, good, wrong, klAvg: kl }; }

export default {
  slug: 'ppo',
  title: 'PPO: small safe steps',
  description: 'An SMS farm-advice line in Lilongwe tunes its replies from thumbs-up ratings. PPO reuses each batch several times, and the clip stops any one step going too far.',
  overview: 'Policy gradient methods throw away each batch after one step, which wastes data, but taking many steps on the same batch can push the policy far beyond what that batch supports. Proximal Policy Optimisation fixes this with a clipped objective. For each sample it computes the ratio between the new policy\'s probability of the action and the old policy\'s, the one that collected the data. The objective is the ratio times the advantage, but the ratio is clipped to the range 1 − ε to 1 + ε, typically ε = 0.2, and the smaller of the clipped and unclipped values is used. In effect, once an action with a positive advantage has become 20% more likely than before, that sample stops pushing; once one with a negative advantage is 20% less likely, it stops pulling. So a batch can be reused for several epochs, safely. The full loss adds a value-function term and an entropy bonus, as in actor-critic, and the loop is: collect a batch from parallel environments, compute advantages, run several epochs of minibatch updates, discard the batch. Simple and robust, PPO became the default for robotics and was the algorithm behind RLHF for the first chat models.',
  keywords: ['ppo', 'clipped surrogate', 'importance ratio', 'trust region', 'kl divergence', 'rlhf'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { clip: true, eps: 1, k: 1 };
    const ink = '#151827';
    /* the phone */
    const phone = P.box(0.75, 0.06, 1.3, '#22252F', { r: 0.08 }); phone.position.set(-2.4, 0.12, 0.05); floor.add(phone);


    /* the policy: old (ghost) and new bars per style */
    const SX = i => -1.45 + i * 0.62;
    const bars = STYLES.map((n, i) => { const pad = P.box(0.5, 0.04, 0.6, '#FFFFFF', { r: 0.03 }); pad.position.set(SX(i), 0.12, -0.2); floor.add(pad);
      const om = new THREE.MeshLambertMaterial({ color: '#C9C3D3', transparent: true, opacity: 0.6 }), ob = P.box(0.18, 1, 0.3, '#fff', { r: 0.02, material: om }); ob.position.set(SX(i) - 0.11, 0.16, -0.2); ob.userData.noFit = true; floor.add(ob);
      const nm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), nb = P.box(0.18, 1, 0.3, '#fff', { r: 0.02, material: nm }); nb.position.set(SX(i) + 0.11, 0.16, -0.2); nb.userData.noFit = true; floor.add(nb);
         return { ob, nb, nm }; });

    const keepBars = P.box(2.5, 0.9, 0.6, '#000'); keepBars.material = new THREE.MeshBasicMaterial({ visible: false }); keepBars.position.set(-0.52, 0.12, -0.2); floor.add(keepBars);
    /* the clip plot: objective against ratio, for a positive and a negative advantage */

    const PX = rr => 1.3 + rr / 2 * 1.5, PZ = v => -0.35 - v * 0.35;
    const axX = P.box(1.5, 0.01, 0.01, ink); axX.position.set(2.05, 0.17, PZ(0)); floor.add(axX);
    const one = P.box(0.01, 0.01, 0.75, '#9AA3B5'); one.position.set(PX(1), 0.17, PZ(0)); floor.add(one);
    const pos = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.015, '#1F9E89'); pos.layers.set(1); pos.userData.noFit = true; floor.add(pos);
    const neg = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.015, '#C62828'); neg.layers.set(1); neg.userData.noFit = true; floor.add(neg);
    const band = P.box(1, 0.005, 0.75, '#E0A526'); band.material.transparent = true; band.material.opacity = 0.25; band.userData.noFit = true; floor.add(band);




    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, t0 = 0, shownIt = -1;
    function plot() { const eps = [0.1, 0.2, 5][st.eps], cl = x => (st.clip ? Math.min(Math.max(x, 1 - eps), 1 + eps) : x);
      const mk = sgn => Array.from({ length: 41 }, (_, i) => { const x = i / 20, A = sgn; return V(PX(x), 0.19, PZ(Math.min(x * A, cl(x) * A) * 0.5)); });
      [[pos, 1], [neg, -1]].forEach(([m, s]) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mk(s), false, 'catmullrom', 0), 80, 0.015, 5, false); });
      band.visible = st.clip && eps < 1; if (band.visible) { band.scale.x = PX(1 + eps) - PX(1 - eps); band.position.set(PX(1), 0.172, PZ(0)); } }
    function show(it) { const h = R.hist[Math.min(it, R.hist.length - 1)], prev = it > 0 ? R.hist[it - 1] : [0.25, 0.25, 0.25, 0.25];
      bars.forEach((b, i) => { const ho = 0.03 + prev[i] * 0.8, hn = 0.03 + h[i] * 0.8; b.ob.scale.y = ho; b.nb.scale.y = hn; b.nm.color.set(i === BEST ? '#1F9E89' : h[i] > 0.7 ? '#C62828' : '#6B5E86');   });
      const top = h.indexOf(Math.max(...h));  }
    function draw() {
      R = run(st); plot(); shownIt = -1; show(R.hist.length - 1);



    }
    draw();
    const update = dt => { if (S.reduced) return; t0 += dt; const it = Math.min(R.hist.length - 1, Math.floor((t0 * 6) % (R.hist.length + 12))); if (it !== shownIt) { shownIt = it; show(it); } };
    const controls = [
      { type: 'buttons', label: 'Objective', options: ['Clipped', 'Unclipped'], get: () => (st.clip ? 0 : 1), act: i => { st.clip = !i; draw(); } },
      { type: 'buttons', label: 'Clip range ε', options: ['0.1', '0.2', 'Very wide'], get: () => st.eps, act: i => { st.eps = i; draw(); } },
      { type: 'buttons', label: 'Epochs per batch', options: ['1', '4', '20'], get: () => st.k, act: i => { st.k = i; draw(); } },
    ];
    const readouts = [
      { label: 'Runs that learn', get: () => ({ v: `${R.good}/20`, sub: 'local example above 70%', good: R.good >= 16, bad: R.good < 12 }) },
      { label: 'Locked on worse', get: () => ({ v: `${R.wrong}/20`, sub: 'a worse style above 70%', good: R.wrong === 0, bad: R.wrong > 1 }) },
      { label: 'Step size', get: () => ({ v: R.klAvg.toFixed(3), sub: 'KL old→new per batch', good: R.klAvg < 0.03, bad: R.klAvg > 0.05 }) },
    ];
    const labels = [
      { name: 'policy', t: 'Reply styles', d: 'Chance of each, before and after a batch', icon: 'scale', atV: V(SX(0) - 0.2, 0.12, -0.2) },
      { name: 'clip', t: 'The clip', d: 'Flat roof: no push past 1 ± ε', icon: 'wave', atV: V(2.5, 0.12, -0.15) },
    ];
    const reset = () => { Object.assign(st, { clip: true, eps: 1, k: 1 }); draw(); };
    const breaks = [
      { label: 'No clip, 20 epochs', hint: 'Plain objective, batch reused', on: () => { reset(); st.clip = false; st.k = 2; draw(); }, off: reset },
      { label: 'Clip range too wide', hint: 'ε so large it never binds', on: () => { reset(); st.eps = 2; st.k = 2; draw(); }, off: reset },
    ];
    function status() {
      if ((!st.clip || st.eps === 2) && st.k === 2) return { ok: false, msg: `<b>Each batch drags the policy too far.</b> ${!st.clip ? 'With no clip' : 'With a clip range that never binds'}, 20 passes over the same 16 ratings keep pushing whichever style got lucky: the average step is ${R.klAvg.toFixed(3)} in KL, and ${R.wrong} of 20 runs lock onto a worse style. Clipping the ratio at 1 ± 0.2 stops each sample pushing once it has moved enough.` };
      if (R.good < 16) return { ok: false, msg: `<b>Only ${R.good} of 20 runs have learned.</b> ${st.k === 0 ? 'One pass per batch with a tight clip moves slowly; reuse each batch a few times.' : 'The settings move the policy too little or too far.'}` };
      return { ok: true, msg: `<b>${R.good} of 20 runs prefer local examples.</b> Each batch of 16 ratings is reused ${[1, 4, 20][st.k]} time${st.k ? 's' : ''}, ${st.clip ? `but the clip at 1 ± ${['0.1', '0.2'][st.eps] || ''} stops samples pushing once they have moved enough` : 'and with one pass the steps stay small'}: the average step is ${R.klAvg.toFixed(3)} in KL.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The advice line', home: true, say: 'An SMS farm-advice line in Lilongwe tunes how it writes replies, from farmers\' thumbs-up ratings.', act: m => m.set({ clip: true, eps: 1, k: 1 }) },
    { t: 'Reuse each batch', home: true, say: 'Each batch of sixteen ratings is used for several passes. That saves data, but could push the policy too far.', act: m => m.set({}) },
    { t: 'The clip', home: true, say: 'So each sample stops pushing once its style is twenty percent more, or less, likely than before the batch.', act: m => m.set({}) },
    { t: 'No clip', home: true, say: 'Remove the clip and make twenty passes, and each batch drags the policy wherever its luck points.', act: m => m.set({ clip: false, k: 2 }) },
    { t: 'Too wide', home: true, say: 'A clip range so wide it never binds is no clip at all.', act: m => m.set({ clip: true, eps: 2, k: 2 }) },
    { t: 'Tight and steady', home: true, say: 'A tight clip with a few passes learns steadily, and almost every run finds the best style.', act: m => m.set({ eps: 0, k: 1 }) },
  ],
  check: [
    { q: 'What is the PPO ratio?', options: ['New policy\'s probability of the action over the old policy\'s', 'Reward over cost', 'Advantage over value'], answer: 0, why: '1 means no change.' },
    { q: 'What does clipping the ratio do?', options: ['Stops a sample pushing once the policy has moved enough', 'Removes negative rewards', 'Speeds up sampling'], answer: 0, why: 'A flat roof past 1 ± ε.' },
    { q: 'Why can PPO reuse a batch for several epochs?', options: ['The clip keeps each update near the old policy', 'It stores more data', 'It uses a model'], answer: 0, why: 'Safe reuse.' },
  ],
  terms: [
    ['PPO', 'Policy optimisation with a clipped ratio objective.'],
    ['Importance ratio', 'How much more likely the new policy makes an action.'],
    ['Clip range ε', 'How far the ratio may move before samples stop pushing.'],
    ['Epoch', 'One pass over a batch.'],
    ['KL divergence', 'A measure of how far one policy is from another.'],
    ['Surrogate objective', 'A stand-in objective whose gradient improves the policy.'],
  ],
  deeper: '<p><b>Feedback at scale.</b> SMS and voice services across Malawi, Zambia and Kenya collect simple ratings from farmers. Learning from them must be cautious: a run of lucky ratings should not flip the whole service.</p><p><b>RLHF.</b> PPO tuned the first chat models against a reward model trained on human preferences, with an extra penalty for drifting from the original model; the next lesson builds that reward model.</p><p><b>About this machine.</b> PPO and the plain objective run for real: 20 seeded runs of 40 batches each; the ratings are invented.</p>',
  code: {
    title: 'The clipped objective',
    note: 'Adapted from the course\'s PPO lesson.',
    text: `
def ppo_loss(logp_new, logp_old, adv, eps=0.2):
    ratio = torch.exp(logp_new - logp_old)
    unclipped = ratio * adv
    clipped = torch.clamp(ratio, 1 - eps, 1 + eps) * adv
    return -torch.min(unclipped, clipped).mean()
`,
  },
};
