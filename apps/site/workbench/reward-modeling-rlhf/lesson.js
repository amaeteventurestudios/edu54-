// Reward models and RLHF: a Swahili homework helper in Dar es Salaam is tuned from teachers' choices between pairs of answers. Answers vary in how helpful they are
// (0 to 4) and how long (1 to 6). A Bradley-Terry reward model, linear in helpfulness and length, is trained for real by logistic regression on the pairs; the tuned
// policy is the exact KL-regularised optimum, pi(y) proportional to pi_ref(y) exp(R(y)/beta). The model cannot yet write helpfulness-4 answers. True quality is
// helpfulness minus 0.6 per length step past 3 (padding annoys students). With biased raters, the pairs favour longer answers, and none in the pairs is longer than 3.
// Break it: correlated data with a tiny KL weight (reward hacking: long padded answers), a KL weight so large nothing changes.
const HS = [0, 1, 2, 3, 4], LS = [1, 2, 3, 4, 5, 6];
const truth = (h, l) => h - 0.6 * Math.max(0, l - 3);
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function ref() { const p = {}; let s = 0; HS.forEach(h => LS.forEach(l => { const v = h === 4 ? 0 : Math.exp(-((h - 2) ** 2) / 1.2 - ((l - 3) ** 2) / 3); p[`${h},${l}`] = v; s += v; })); Object.keys(p).forEach(k => { p[k] /= s; }); return p; }
function data(st, r) { const n = [20, 400][st.n], pairs = [];
  const draw = () => { const h = Math.floor(r() * 4); const l = st.corr ? 1 + Math.floor(r() * 3) : 1 + Math.floor(r() * 6); return [h, l]; };
  const seen = (h, l) => (st.corr ? h + 0.7 * l : truth(h, l)); /* biased raters prefer length */
  for (let i = 0; i < n; i++) { const a = draw(), b = draw(), d = seen(...a) - seen(...b), pa = 1 / (1 + Math.exp(-2 * d)); pairs.push(r() < pa ? [a, b] : [b, a]); }
  return pairs; }
function fit(pairs) { let wh = 0, wl = 0; for (let it = 0; it < 600; it++) { let gh = 0, gl = 0; pairs.forEach(([w, l]) => { const z = wh * (w[0] - l[0]) + wl * (w[1] - l[1]), g = 1 - 1 / (1 + Math.exp(-z)); gh += g * (w[0] - l[0]); gl += g * (w[1] - l[1]); }); wh += 0.5 * gh / pairs.length; wl += 0.5 * gl / pairs.length; } return { wh, wl }; }
function run(st) {
  const r = rng(13), pairs = data(st, r), { wh, wl } = fit(pairs), R = (h, l) => wh * h + wl * l, beta = [0.05, 0.5, 20][st.b], p0 = ref();
  const test = data({ ...st, corr: false, n: 1 }, rng(99)); let ok = 0; test.forEach(([w, l]) => { if (R(...w) > R(...l)) ok++; });
  const pi = {}; let s = 0; Object.keys(p0).forEach(k => { const [h, l] = k.split(',').map(Number); const v = p0[k] * Math.exp(R(h, l) / beta); pi[k] = v; s += v; }); Object.keys(pi).forEach(k => { pi[k] /= s; });
  const E = (p, f) => Object.keys(p).reduce((a, k) => { const [h, l] = k.split(',').map(Number); return a + p[k] * f(h, l); }, 0);
  const kl = Object.keys(pi).reduce((a, k) => a + (pi[k] > 1e-12 ? pi[k] * Math.log(pi[k] / p0[k]) : 0), 0);
  return { wh, wl, R, pi, p0, acc: ok / test.length, q0: E(p0, truth), q: E(pi, truth), r0: E(p0, R), rr: E(pi, R), len: E(pi, (h, l) => l), kl, beta };
}

export default {
  slug: 'reward-modeling-rlhf',
  title: 'Reward models: learn what people prefer',
  description: 'A Swahili homework helper in Dar es Salaam is tuned from teachers\' choices between pairs of answers. A reward model learns the score, then the tuner chases it.',
  overview: 'Reinforcement learning from human feedback has three stages. First, supervised fine-tuning on good example answers gives a reference model. Second, people compare pairs of the model\'s answers and pick the better one, and a reward model learns a score such that the preferred answer scores higher: the Bradley-Terry loss is the negative log of the sigmoid of the score difference, so a gap in scores means odds of being preferred. The reward model is usually the language model itself with a single number as output. Third, the policy is tuned with PPO to maximise the reward model\'s score minus β times the KL divergence from the reference. That penalty matters most: the reward model only learned from answers like the reference\'s, and anything it learned by accident, such as "longer is better" when longer answers happened to be more helpful, becomes a target once the policy can optimise it freely. That is reward hacking: the score rises while real quality falls. With the KL penalty, the best policy is the reference reweighted by exp(reward / β). Later methods simplify the pipeline: DPO folds the reward model into a direct loss, and GRPO uses verifiable rewards such as correct answers for reasoning.',
  keywords: ['rlhf', 'reward model', 'bradley-terry', 'kl penalty', 'reward hacking', 'human preferences'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.0, 1.15], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { corr: false, n: 1, b: 1 };
    const ink = '#151827';
    /* the comparison desk */




    /* reward landscape: bar height = reward model's score, colour = true quality; dots = the tuned policy */
    const GX = i => -1.25 + i * 0.36, GZ = j => -0.85 + j * 0.3;
    const cells = []; HS.forEach((h, j) => LS.forEach((l, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.28, 1, 0.22, '#fff', { r: 0.015, material: mm }); b.position.set(GX(i), 0.12, GZ(j)); b.userData.noFit = true; floor.add(b);
      const dot = P.ball(0.1, '#151827'); dot.userData.noFit = true; floor.add(dot); cells.push({ h, l, b, mm, dot }); }));


    const keepG = P.box(2.2, 1.0, 1.5, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(GX(2.5), 0.12, GZ(2)); floor.add(keepG);
    /* the readout panel */


    const two = [0, 1].map(i => { const b = P.box(0.35, 1, 0.3, i ? '#1F9E89' : '#E07B39', { r: 0.02 }); b.position.set(1.7 + i * 0.7, 0.17, -0.2); b.userData.noFit = true; floor.add(b);
         return { b }; });



    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let Rr = null;
    function draw() {
      Rr = run(st);
      const all = cells.map(c => Rr.R(c.h, c.l)), lo = Math.min(...all), hi = Math.max(...all), pmax = Math.max(...Object.values(Rr.pi));
      cells.forEach(c => { const u = hi > lo ? (Rr.R(c.h, c.l) - lo) / (hi - lo) : 0.5, h = 0.03 + u * 0.55, q = truth(c.h, c.l); c.b.scale.y = h; c.mm.color.setHSL(Math.max(0, Math.min(0.33, (q + 1) / 5 * 0.33)), 0.55, 0.5); if (c.h === 4) c.mm.color.set('#C9C3B5');
        const pm = Rr.pi[`${c.h},${c.l}`] || 0; c.dot.visible = pm > 0.01; c.dot.scale.setScalar(0.25 + Math.sqrt(pm / pmax) * 0.9); c.dot.position.set(GX(c.l - 1), 0.12 + h + 0.08, GZ(c.h)); });
      const dr = Rr.rr - Rr.r0, dq = Rr.q - Rr.q0;
      [[two[0], dr], [two[1], dq]].forEach(([o, d], i) => { const h = Math.max(0.02, Math.min(0.8, Math.abs(d) * 0.18)); o.b.scale.y = h; o.b.position.y = 0.17; o.b.material.color.set(d >= 0 ? (i ? '#1F9E89' : '#E07B39') : '#C62828');   });



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Preference data', options: ['Careful raters', 'Raters who like long answers'], get: () => (st.corr ? 1 : 0), act: i => { st.corr = !!i; draw(); } },
      { type: 'buttons', label: 'Pairs', options: ['20', '400'], get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'KL weight β', options: ['0.05', '0.5', '20'], get: () => st.b, act: i => { st.b = i; draw(); } },
    ];
    const readouts = [
      { label: 'True quality', get: () => { const d = Rr.q - Rr.q0; return { v: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}`, sub: 'change after tuning', good: d > 0.3, bad: d < 0 }; } },
      { label: 'Reward score', get: () => { const d = Rr.rr - Rr.r0; return { v: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}`, sub: 'what the policy optimised' }; } },
      { label: 'Held-out accuracy', get: () => ({ v: `${Math.round(Rr.acc * 100)}%`, sub: 'reward model agrees with teachers', good: Rr.acc > 0.75, bad: Rr.acc < 0.65 }) },
    ];
    const labels = [
      { name: 'pairs', t: 'Teacher choices', d: 'Which of two answers is better', icon: 'check', atV: V(GX(0) - 0.18, 0.3, GZ(2)) },
      { name: 'land', t: 'Reward landscape', d: 'Height: reward · colour: true quality · dots: tuned helper', icon: 'scale', atV: V(GX(5) + 0.18, 0.3, GZ(2)) },
    ];
    const reset = () => { Object.assign(st, { corr: false, n: 1, b: 1 }); draw(); };
    const breaks = [
      { label: 'Length-loving raters, loose leash', hint: 'Biased raters, β = 0.05', on: () => { reset(); st.corr = true; st.b = 0; draw(); }, off: reset },
      { label: 'Leash too tight', hint: 'β = 20', on: () => { reset(); st.b = 2; draw(); }, off: reset },
    ];
    function status() {
      const dq = Rr.q - Rr.q0, dr = Rr.rr - Rr.r0;
      if (dq < 0 && dr > 0) return { ok: false, msg: `<b>Reward up ${dr.toFixed(2)}, real quality down ${Math.abs(dq).toFixed(2)}.</b> These raters tended to pick the longer answer, and no answer in the pairs was very long, so the reward model learned +${Rr.wl.toFixed(2)} per length step and never saw what padding does. With a loose leash (β = ${Rr.beta}) the helper found the cheap way to score: pad answers to an average length of ${Rr.len.toFixed(1)}. That is reward hacking; a larger β keeps it near what the reward model was trained on.` };
      if (st.b === 2) return { ok: false, msg: `<b>Almost nothing changes.</b> With β = 20 the KL penalty outweighs any reward, so the tuned helper stays where it started: quality ${dq >= 0 ? '+' : '−'}${Math.abs(dq).toFixed(2)}, KL ${Rr.kl.toFixed(3)}. The leash should allow movement towards better answers.` };
      return { ok: true, msg: `<b>Quality up ${dq.toFixed(2)}.</b> The reward model learned +${Rr.wh.toFixed(2)} per helpful step and ${Rr.wl >= 0 ? '+' : '−'}${Math.abs(Rr.wl).toFixed(2)} per length step from ${[20, 400][st.n]} pairs, and β = ${Rr.beta} let the helper move towards more helpful answers (KL ${Rr.kl.toFixed(2)}) without padding.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Teacher choices', home: true, say: 'A Swahili homework helper in Dar es Salaam is tuned from teachers\' choices: which of two answers is better?', act: m => m.set({ corr: false, n: 1, b: 1 }) },
    { t: 'A reward model', home: true, say: 'A reward model learns a score so that the chosen answer scores higher than the other.', act: m => m.set({}) },
    { t: 'Tune, on a leash', home: true, say: 'The helper is tuned to score well, minus a penalty for straying from where it started. Real quality rises.', act: m => m.set({}) },
    { t: 'Reward hacking', home: true, say: 'If the raters tended to prefer longer answers, and the leash is loose, the helper learns to pad. The score rises; quality falls.', act: m => m.set({ corr: true, b: 0 }) },
    { t: 'Better data', home: true, say: 'With careful raters and answers of every length, the reward model learns that padding does not help. Even a loose leash is safe.', act: m => m.set({ corr: false, b: 0 }) },
    { t: 'Too tight', home: true, say: 'Hold the leash too tight, and nothing changes at all.', act: m => m.set({ b: 2 }) },
  ],
  check: [
    { q: 'What does the Bradley-Terry loss train?', options: ['A score where the preferred answer scores higher', 'The policy directly', 'A classifier of topics'], answer: 0, why: 'Score gaps mean odds of preference.' },
    { q: 'Why add a KL penalty when tuning against a reward model?', options: ['To stop the policy exploiting the model\'s mistakes', 'To speed training', 'To shorten answers'], answer: 0, why: 'It keeps answers near the training data.' },
    { q: 'What is reward hacking?', options: ['The score rises while real quality falls', 'Faster learning', 'A bigger reward model'], answer: 0, why: 'Optimising an accident in the reward.' },
  ],
  terms: [
    ['RLHF', 'Tuning a model with rewards learned from human feedback.'],
    ['Reward model', 'A model that scores answers, trained on comparisons.'],
    ['Bradley-Terry', 'Preference odds from the difference of two scores.'],
    ['KL penalty', 'A cost for drifting from the reference model.'],
    ['Reward hacking', 'Exploiting flaws in the reward instead of improving.'],
    ['Reference model', 'The starting model the policy is kept near.'],
  ],
  deeper: '<p><b>Whose preferences?</b> A Swahili helper tuned on teachers in Dar es Salaam learns their idea of a good answer. Preferences differ across schools, regions and languages; who labels the data shapes what the model becomes.</p><p><b>Next.</b> DPO skips the separate reward model; verifiable rewards replace human ratings where answers can be checked.</p><p><b>About this machine.</b> The reward model is trained for real by logistic regression on simulated teacher choices; the tuned policy is the exact KL-regularised optimum.</p>',
  code: {
    title: 'The reward model loss',
    note: 'Adapted from the course\'s reward-modelling lesson.',
    text: `
def bt_loss(rm, prompt, chosen, rejected):
    r_c = rm(prompt, chosen)                  # one number per answer
    r_r = rm(prompt, rejected)
    return -F.logsigmoid(r_c - r_r).mean()

def rlhf_reward(rm_score, logp_policy, logp_ref, beta=0.05):
    return rm_score - beta * (logp_policy - logp_ref)
`,
  },
};
