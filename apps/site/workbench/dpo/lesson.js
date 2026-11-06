// DPO: a health hotline in Lagos tunes how its assistant answers "My child has a fever, what should I do?". Six candidate answers have a true quality (for scoring
// only). Annotators compare pairs, preferring the better answer with Bradley-Terry odds, with a chosen share of labels flipped at random. A softmax policy over the six
// answers is trained for real with the DPO loss against the frozen SFT reference: 400 full-batch steps at a learning rate of 0.2/β. Memory for a 7B model is exact
// (2 bytes per frozen parameter, 12 per trained one). Break it: coin-flip labels on few pairs (it learns to prefer a harmful answer), β so large nothing changes.
const ANS = [
  ['Fluids, and see a clinic today if the fever is high or lasts two days', 3, 'Fluids; clinic\nif high or\n2 days'],
  ['Go to the hospital straight away', 2, 'Hospital\nnow'],
  ['A long answer about fevers in general, with no clear step', 1, 'Long, no\nclear step'],
  ['It is probably nothing, just wait', -1, 'Probably\nnothing'],
  ['Give a herbal mixture and keep them warm', -1.5, 'Herbal mix,\nkeep warm'],
  ['Please consult a doctor', 1.5, 'See a\ndoctor'],
];
const REF = [0.12, 0.2, 0.25, 0.15, 0.08, 0.2], Q = ANS.map(a => a[1]);
const PAIRS = [40, 400], NOISE = [0, 0.2, 0.5], BETAS = [0.02, 0.1, 2];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const sm = th => { const m = Math.max(...th), e = th.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); };
const sig = z => 1 / (1 + Math.exp(-z));
function run(st) { const r = rng(3), M = PAIRS[st.m], noise = NOISE[st.noise], beta = BETAS[st.b], pairs = [];
  for (let i = 0; i < M; i++) { let a = Math.floor(r() * 6), b = Math.floor(r() * 6); if (a === b) b = (b + 1) % 6; let w = r() < sig(2 * (Q[a] - Q[b])) ? a : b, l = w === a ? b : a, flip = r() < noise; if (flip) [w, l] = [l, w]; pairs.push([w, l, flip]); }
  const lr = REF.map(Math.log), th = lr.slice();
  for (let it = 0; it < 400; it++) { const p = sm(th), lp = p.map(Math.log), g = Array(6).fill(0);
    pairs.forEach(([w, l]) => { const z = beta * ((lp[w] - lr[w]) - (lp[l] - lr[l])), c = beta * (1 - sig(z)); for (let k = 0; k < 6; k++) g[k] += c * ((k === w ? 1 : 0) - (k === l ? 1 : 0)); });
    for (let k = 0; k < 6; k++) th[k] += (0.2 / beta) * g[k] / M; }
  const p = sm(th), Eq = p.reduce((a, x, i) => a + x * Q[i], 0), kl = p.reduce((a, x, i) => a + (x > 1e-12 ? x * Math.log(x / REF[i]) : 0), 0);
  return { p, Eq, kl, pairs, top: p.indexOf(Math.max(...p)) }; }
const EQ0 = REF.reduce((a, x, i) => a + x * Q[i], 0);

export default {
  slug: 'dpo',
  title: 'DPO: preferences without a reward model',
  description: 'A health hotline in Lagos tunes its assistant\'s answer to a worried parent. DPO learns straight from annotators\' choices, with two models where RLHF runs four.',
  overview: 'Direct Preference Optimisation starts from the same goal as RLHF, maximise reward while staying close to the reference model, and uses the fact that this goal has a closed-form best policy: the reference reweighted by exp(reward/β). Turned around, any policy defines an implicit reward, β times the log of how much more likely it makes an answer than the reference does. Put that into the Bradley-Terry preference model and the normalising constant cancels, leaving a simple loss on preference pairs: minus the log-sigmoid of β times the difference between the chosen answer\'s log-ratio and the rejected answer\'s. Training it is ordinary supervised learning with two models in memory, the policy and the frozen reference, against four for PPO. β sets how far the policy may move: small values let it follow the data closely, large values keep it at the reference. Because DPO trusts the pairs directly, their quality is everything; with few pairs and inconsistent labels it can confidently learn the wrong preference. KTO works with single good or bad labels, ORPO folds preference into SFT, and SimPO drops the reference model.',
  keywords: ['dpo', 'direct preference optimisation', 'implicit reward', 'bradley-terry', 'beta', 'preference data'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { m: 1, noise: 1, b: 1 };
    const ink = '#151827';
    /* six answers: grey bar = reference, coloured bar = trained policy */
    const AX = i => -1.6 + i * 0.62;
    const qcol = q => (q >= 2.5 ? '#1F9E89' : q >= 1.4 ? '#7FB069' : q >= 0.5 ? '#C9A227' : '#C62828');
    const bars = ANS.map(([t, q, short], i) => { const card = P.box(0.56, 0.04, 0.62, '#FFFFFF', { r: 0.02 }); card.position.set(AX(i), 0.12, 0.65); floor.add(card);
      const rb = P.box(0.2, 1, 0.22, '#C9C3D3', { r: 0.02 }); rb.position.set(AX(i) - 0.12, 0.12, 0.05); rb.userData.noFit = true; floor.add(rb);
      const pb = P.box(0.2, 1, 0.22, qcol(q), { r: 0.02 }); pb.position.set(AX(i) + 0.12, 0.12, 0.05); pb.userData.noFit = true; floor.add(pb);
         return { rb, pb }; });


    const keepB = P.box(3.8, 0.95, 0.5, '#000'); keepB.material = new THREE.MeshBasicMaterial({ visible: false }); keepB.position.set(-0.05, 0.12, 0.05); floor.add(keepB);
    /* annotator pairs at the back left */
    const pairT = Array.from({ length: 6 }, (_, k) => {   return t; });

    /* memory comparison at right */

    [['DPO', 98, '#1F9E89'], ['PPO', 196, '#6B5E86']].forEach(([n, gb, c], k) => { const h = gb / 196 * 0.8, b = P.box(0.3, h, 0.3, c, { r: 0.02 }); b.position.set(2.1 + k * 0.5, 0.15, -0.5); floor.add(b);
         });



    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    const L = 'ABCDEF';
    function draw() {
      R = run(st);
      bars.forEach((b, i) => { const hr = 0.02 + REF[i] * 0.8, hp = 0.02 + R.p[i] * 0.8; b.rb.scale.y = hr; b.pb.scale.y = hp;   });
      pairT.forEach((t, k) => { const pr = R.pairs[k]; if (!pr) {  return; }  });



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Preference pairs', options: PAIRS.map(String), get: () => st.m, act: i => { st.m = i; draw(); } },
      { type: 'buttons', label: 'Labels flipped', options: ['0%', '20%', '50%'], get: () => st.noise, act: i => { st.noise = i; draw(); } },
      { type: 'buttons', label: 'β', options: BETAS.map(String), get: () => st.b, act: i => { st.b = i; draw(); } },
    ];
    const readouts = [
      { label: 'Answer quality', get: () => ({ v: R.Eq.toFixed(2), sub: `expected, SFT model ${EQ0.toFixed(2)}`, good: R.Eq >= 2.3, bad: R.Eq < EQ0 }) },
      { label: 'Most likely answer', get: () => ({ v: L[R.top], sub: `${Math.round(R.p[R.top] * 100)}% of replies`, good: R.top === 0, bad: Q[R.top] < 1 }) },
      { label: 'KL from SFT', get: () => ({ v: R.kl.toFixed(2), sub: 'how far it moved' }) },
    ];
    const labels = [
      { name: 'ans', t: 'Six answers', d: 'Chance of each, before and after', icon: 'scale', atV: V(AX(0) - 0.35, 0.3, 0.05) },
      { name: 'mem', t: 'Two models, not four', d: 'Policy and frozen reference', icon: 'box', atV: V(2.25, 0.3, -0.6) },
    ];
    const reset = () => { Object.assign(st, { m: 1, noise: 1, b: 1 }); draw(); };
    const breaks = [
      { label: 'Coin-flip labels, few pairs', hint: '50% flipped, 40 pairs', on: () => { reset(); st.noise = 2; st.m = 0; draw(); }, off: reset },
      { label: 'β far too large', hint: 'β = 2', on: () => { reset(); st.b = 2; draw(); }, off: reset },
    ];
    function status() {
      if (st.noise === 2 && Q[R.top] < 1) return { ok: false, msg: `<b>It now prefers answer ${L[R.top]}: "${ANS[R.top][0].toLowerCase()}".</b> Half the labels are flipped, so 40 pairs are mostly noise, and DPO trusts every pair directly: whichever bad answer happened to "win" more pairs is pushed up to ${Math.round(R.p[R.top] * 100)}%. Clean, consistent labels, and more of them, are essential.` };
      if (st.b === 2) return { ok: false, msg: `<b>Barely moved: quality ${R.Eq.toFixed(2)}.</b> β = 2 makes every move away from the reference expensive, so the policy stays close to the SFT model (KL ${R.kl.toFixed(2)}) and the best answer reaches only ${Math.round(R.p[0] * 100)}%. Typical values are 0.1 to 0.5.` };
      if (st.noise === 2) return { ok: false, msg: `<b>Little learned: quality ${R.Eq.toFixed(2)}.</b> With half the labels flipped the pairs carry almost no signal; more pairs only average the noise out slowly.` };
      return { ok: true, msg: `<b>Answer A now comes ${Math.round(R.p[0] * 100)}% of the time; quality ${R.Eq.toFixed(2)}, up from ${EQ0.toFixed(2)}.</b> Each pair pushed the chosen answer's log-ratio against the reference up and the rejected one's down, with no reward model and only the policy and reference in memory.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The question', home: true, say: 'A health hotline in Lagos tunes how its assistant answers a parent whose child has a fever.', act: m => m.set({ m: 1, noise: 1, b: 1 }) },
    { t: 'Pairs', home: true, say: 'Annotators compare pairs of answers and pick the better one. A few labels are mistakes.', act: m => m.set({}) },
    { t: 'Push and pull', home: true, say: 'DPO raises the chosen answer\'s probability against the reference and lowers the rejected one. No reward model, no reinforcement learning.', act: m => m.set({}) },
    { t: 'Coin flips', home: true, say: 'With only forty pairs and half the labels flipped, it learns to prefer a harmful answer.', act: m => m.set({ noise: 2, m: 0 }) },
    { t: 'Leash too tight', home: true, say: 'Set beta very high, and the model is held so close to the reference that it barely improves.', act: m => m.set({ noise: 1, m: 1, b: 2 }) },
    { t: 'Small beta', home: true, say: 'A small beta lets it follow the data closely. With good labels, that is what you want.', act: m => m.set({ b: 0 }) },
  ],
  check: [
    { q: 'What does DPO remove from the RLHF pipeline?', options: ['The separate reward model and PPO', 'The reference model', 'The preference data'], answer: 0, why: 'The reward is implicit in the policy.' },
    { q: 'What is DPO\'s implicit reward?', options: ['β × log(policy probability ÷ reference probability)', 'The answer length', 'A human score'], answer: 0, why: 'From the closed-form optimal policy.' },
    { q: 'Why are clean labels critical for DPO?', options: ['It trusts every pair directly', 'It ignores pairs', 'It needs a reward model'], answer: 0, why: 'Noise is learned as preference.' },
  ],
  terms: [
    ['DPO', 'Direct Preference Optimisation from pairs.'],
    ['Implicit reward', 'Reward expressed through policy and reference probabilities.'],
    ['Reference model', 'The frozen SFT model DPO compares against.'],
    ['β', 'How strongly the policy is kept near the reference.'],
    ['KTO', 'Preference tuning from single good or bad labels.'],
    ['SimPO', 'A variant without a reference model.'],
  ],
  deeper: '<p><b>Health information.</b> Hotlines in Nigeria, Ghana and Uganda answer urgent questions at scale. Preference data for such services should come from trained health workers, checked for agreement, because the tuned model will copy whatever the labels say.</p><p><b>Choosing.</b> DPO is the practical choice for small teams and fixed datasets; RLHF\'s online loop still helps at the largest scale.</p><p><b>About this machine.</b> DPO training runs for real on a six-answer policy; answer qualities and annotator labels are simulated.</p>',
  code: {
    title: 'The DPO loss',
    note: 'Adapted from the course\'s DPO lesson.',
    text: `
def dpo_loss(pi_w, pi_l, ref_w, ref_l, beta=0.1):
    # log-probabilities of the chosen (w) and rejected (l) answers
    margin = (pi_w - ref_w) - (pi_l - ref_l)
    return -F.logsigmoid(beta * margin).mean()
`,
  },
};
