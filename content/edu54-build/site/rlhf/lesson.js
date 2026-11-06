// RLHF pipeline: a mobile-money help line in Accra (an invented service, SikaPay) tunes a 7B assistant in three stages: SFT, a reward model from 33,000 comparisons,
// then PPO with four models loaded: the policy and value model (trained) and the reference and reward model (frozen). Memory is computed exactly at 2 bytes per frozen
// parameter and 12 per trained one (weights, gradients, Adam), before activations. Training curves follow the reported over-optimisation form (Gao et al.): with
// d = sqrt(KL), proxy score = a·d and true preference = d·(b − c·ln d), larger reward models giving larger b; the replies are scripted.
// Break it: no KL penalty (reward hacking), a small reward model with a weak penalty, all four models on one 80 GB GPU.
const BETAS = [0, 0.02, 0.5], KLF = [50, 6, 0.1];
function run(st) {
  const kl = KLF[st.b] * (st.rm ? 1 : 1.6), b = st.rm ? 0.55 : 0.32, c = 0.307, a = 0.6;
  const curve = Array.from({ length: 30 }, (_, i) => { const d = Math.sqrt(kl * (i + 1) / 30); return { proxy: a * d, gold: d * (b - c * Math.log(Math.max(d, 1e-6))) }; });
  const end = curve[curve.length - 1], win = Math.max(5, Math.min(95, 50 + 30 * end.gold));
  const P = 7e9, trained = 12 * P, frozen = 2 * P, total = (2 * trained + 2 * frozen) / 1e9, per = total / (st.g ? 4 : 1);
  return { kl, curve, end, win, total, per };
}
const REPLY = {
  good: 'Dial the help line within 24 hours with the transaction ID.\nThe agent can hold the money while the receiver is checked.',
  hack: 'Great question! I am so glad you asked! As your friendly, caring,\nhelpful assistant I am always happy to help you with anything at all!',
  same: 'You can try to contact customer service about this.',
};

export default {
  slug: 'rlhf',
  title: 'RLHF: the full pipeline',
  description: 'A mobile-money help line in Accra tunes its assistant with human feedback: SFT, a reward model, then PPO. The proxy score climbs while the truth can part from it.',
  overview: 'RLHF, as used for InstructGPT and the first chat models, runs in three stages. Supervised fine-tuning teaches the format. A reward model, the SFT model with its output layer replaced by a single score, learns from human comparisons with the Bradley-Terry loss; InstructGPT used about 33,000 pairs. Then PPO tunes the policy to maximise the reward model\'s score minus β times the KL divergence from the frozen SFT reference, with InstructGPT using β = 0.02. The PPO stage is heavy: four models sit in memory at once, the policy and a value model that are both trained, plus the frozen reference and reward model, so a 7-billion-parameter setup needs about 196 GB before activations. The reward model is only a proxy for what people want. As the policy moves away from the reference, measured by KL, the proxy score keeps rising, but true preference rises, peaks and then falls: the policy has found phrases the reward model over-values, such as effusive politeness or length. This over-optimisation is milder for larger reward models and is held back by the KL penalty. DPO, in the next lesson, reaches similar results without the reward model or PPO.',
  keywords: ['rlhf', 'ppo', 'reward model', 'kl penalty', 'reward over-optimisation', 'instructgpt'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { b: 1, rm: true, g: true };
    const ink = '#151827';
    /* three stages along the back */
    ['1 · SFT', '2 · Reward', '3 · PPO'].forEach((n, i) => { const b = P.box(0.5, 0.06, 0.26, ['#3A6FB0', '#E07B39', C.plum][i], { r: 0.03 }); b.position.set(-2.62 + i * 0.6, 0.12, -1.12); floor.add(b);
         });
    /* four models of the PPO stage */
    const MODELS = [['Policy', 'trained', C.plum], ['Value model', 'trained', '#7E6AA0'], ['Reference', 'frozen', '#8A8A96'], ['Reward model', 'frozen', '#E07B39']];
    const mods = MODELS.map(([n, k, col], i) => { const x = -2.35 + (i % 2) * 0.85, z = -0.3 + Math.floor(i / 2) * 0.8, mm = new THREE.MeshLambertMaterial({ color: col });
      const b = P.box(0.7, 1, 0.55, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0.12, z); b.userData.noFit = true; floor.add(b);
         return { b, mm, x, z, k }; });

    const keepM = P.box(1.6, 0.9, 1.4, '#000'); keepM.material = new THREE.MeshBasicMaterial({ visible: false }); keepM.position.set(-1.92, 0.12, 0.02); floor.add(keepM);
    /* curves: proxy (orange) and true preference (teal) against KL */
    const panel = P.box(2.0, 0.05, 1.9, '#FBF8F1', { r: 0.03 }); panel.position.set(0.55, 0.12, -0.05); floor.add(panel);

    const ax = P.box(1.8, 0.01, 0.01, ink); ax.position.set(0.55, 0.17, 0.45); floor.add(ax);
    const lines = ['#E07B39', '#1F9E89'].map(c => { const mm = new THREE.MeshBasicMaterial({ color: c }), t = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.02, c, { material: mm }); t.layers.set(1); t.userData.noFit = true; floor.add(t); return t; });


    /* reply card */
    const card = P.box(3.2, 0.05, 0.6, '#FFFFFF', { r: 0.03 }); card.position.set(0.55, 0.12, 1.15); floor.add(card);


    /* readout panel */




    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      mods.forEach(m => { const gb = m.k === 'trained' ? 84 : 14, h = 0.06 + gb / 84 * 0.38; m.b.scale.y = h; m.mm.color.offsetHSL(0, 0, 0); });
      const maxP = 0.6 * Math.sqrt(80), X = i => -0.3 + (i + 1) / 30 * 1.7, Z = v => 0.45 - Math.max(-0.2, v) / maxP * 1.1;
      [R.curve.map((c, i) => V(X(i), 0.2, Z(c.proxy))), R.curve.map((c, i) => V(X(i), 0.2, Z(c.gold)))].forEach((pts, k) => { lines[k].geometry.dispose(); lines[k].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.3, 0.2, 0.45), ...pts]), 60, 0.02, 5, false); });
      const reply = st.b === 0 || (!st.rm && st.b < 2 && R.end.gold < 0.4) ? 'hack' : st.b === 2 ? 'same' : 'good';





    }
    draw();
    const controls = [
      { type: 'buttons', label: 'KL penalty β', options: BETAS.map(String), get: () => st.b, act: i => { st.b = i; draw(); } },
      { type: 'buttons', label: 'Reward model', options: ['1B', '7B'], get: () => (st.rm ? 1 : 0), act: i => { st.rm = !!i; draw(); } },
      { type: 'buttons', label: 'GPUs', options: ['1', '4'], get: () => (st.g ? 1 : 0), act: i => { st.g = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Preferred over SFT', get: () => ({ v: `${Math.round(R.win)}%`, sub: 'real people, reported pattern', good: R.win >= 60, bad: R.win < 50 }) },
      { label: 'Reward model score', get: () => ({ v: `+${R.end.proxy.toFixed(1)}`, sub: 'what PPO maximised' }) },
      { label: 'Memory per GPU', get: () => ({ v: `${Math.round(R.per)} GB`, sub: 'four models, before activations', good: R.per <= 80, bad: R.per > 80 }) },
    ];
    const labels = [
      { name: 'models', t: 'Four models in PPO', d: 'Two trained, two frozen', icon: 'box', atV: V(-2.75, 0.4, 0.02) },
      { name: 'curves', t: 'Proxy against truth', d: 'They part when the policy over-optimises', icon: 'wave', atV: V(1.55, 0.3, -0.5) },
    ];
    const reset = () => { Object.assign(st, { b: 1, rm: true, g: true }); draw(); };
    const breaks = [
      { label: 'No KL penalty', hint: 'β = 0', on: () => { reset(); st.b = 0; draw(); }, off: reset },
      { label: 'Small reward model', hint: '1B scorer, mild penalty', on: () => { reset(); st.rm = false; draw(); }, off: reset },
      { label: 'One GPU', hint: 'All four models on 80 GB', on: () => { reset(); st.g = false; draw(); }, off: reset },
    ];
    function status() {
      if (R.per > 80) return { ok: false, msg: `<b>${Math.round(R.per)} GB on one 80 GB GPU.</b> PPO keeps four 7B models in memory: the policy and value model at 12 bytes per parameter (84 GB each with gradients and Adam), the reference and reward model at 2 bytes (14 GB each). Spread them over several GPUs, or train adapters instead of full weights.` };
      if (st.b === 0) return { ok: false, msg: `<b>Score up, real preference down to ${Math.round(R.win)}%.</b> With no KL penalty the policy drifts far (KL ${R.kl.toFixed(0)}) to whatever the reward model over-values: here gushing politeness. The proxy keeps climbing while people like the answers less. A penalty of about 0.02 keeps it near the reference.` };
      if (!st.rm && R.win < 60) return { ok: false, msg: `<b>Preferred only ${Math.round(R.win)}% of the time.</b> A 1B reward model has learned a cruder picture of what people like, so the policy finds its blind spots sooner and drifts further: real preference peaks early and falls. Larger reward models over-optimise less.` };
      if (st.b === 2) return { ok: false, msg: `<b>Too cautious: ${Math.round(R.win)}%.</b> With β = 0.5 the penalty outweighs most of the reward, so the policy barely leaves the SFT model (KL ${R.kl.toFixed(1)}) and leaves most of the possible gain on the table.` };
      return { ok: true, msg: `<b>Preferred over SFT ${Math.round(R.win)}% of the time.</b> With β = 0.02 the policy drifts only to KL ${R.kl.toFixed(0)}, where reward-model score and real preference still rise together, and four GPUs hold the ${Math.round(R.total)} GB of models.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The help line', home: true, say: 'A mobile-money help line in Accra tunes its assistant with feedback from people.', act: m => m.set({ b: 1, rm: true, g: true }) },
    { t: 'Three stages', home: true, say: 'First supervised fine-tuning, then a reward model trained on comparisons, then reinforcement learning with PPO.', act: m => m.set({}) },
    { t: 'Four models', home: true, say: 'PPO keeps four models in memory: the policy and a value model being trained, and a frozen reference and reward model.', act: m => m.set({}) },
    { t: 'No penalty', home: true, say: 'Remove the KL penalty, and the reward model\'s score climbs while real people like the answers less.', act: m => m.set({ b: 0 }) },
    { t: 'Small scorer', home: true, say: 'A small reward model has more blind spots, and the policy finds them sooner.', act: m => m.set({ b: 1, rm: false }) },
    { t: 'One GPU', home: true, say: 'Put all four models on one 80-gigabyte GPU, and they do not fit.', act: m => m.set({ rm: true, g: false }) },
  ],
  check: [
    { q: 'Which models are in memory during PPO?', options: ['Policy, value model, reference and reward model', 'Only the policy', 'Policy and tokenizer'], answer: 0, why: 'Two trained, two frozen.' },
    { q: 'What happens as the policy over-optimises the reward model?', options: ['The proxy score rises while real preference falls', 'Both fall', 'Nothing'], answer: 0, why: 'It exploits the scorer\'s blind spots.' },
    { q: 'What does the KL penalty do?', options: ['Keeps the policy near the SFT reference', 'Trains the reward model', 'Saves memory'], answer: 0, why: 'InstructGPT used about 0.02.' },
  ],
  terms: [
    ['RLHF', 'SFT, a reward model, then reinforcement learning.'],
    ['Value model', 'The critic that estimates expected reward in PPO.'],
    ['Reference model', 'The frozen SFT model the policy is kept near.'],
    ['KL coefficient β', 'The weight of the drift penalty.'],
    ['Over-optimisation', 'Proxy score rising while true quality falls.'],
    ['InstructGPT', 'The 2022 model that made RLHF standard.'],
  ],
  deeper: '<p><b>Support lines.</b> Mobile-money and telecom help lines across Ghana, Kenya and Côte d\'Ivoire handle huge volumes of short questions. An assistant tuned to please a scorer instead of customers wastes everyone\'s time; real customer ratings should keep checking the tuned model.</p><p><b>Lighter options.</b> DPO removes the reward model and PPO; adapters such as LoRA shrink the trained copies.</p><p><b>About this machine.</b> Memory is exact for the stated bytes; curves follow the reported over-optimisation form; replies are scripted; the service is invented.</p>',
  code: {
    title: 'The PPO reward',
    note: 'Adapted from the course\'s RLHF lesson.',
    text: `
def rlhf_reward(prompt, response, rm, policy, ref, beta=0.02):
    score = rm(prompt, response)                         # frozen reward model
    kl = policy.logprob(prompt, response) - ref.logprob(prompt, response)
    return score - beta * kl                             # stay near the reference

def ppo_memory_gb(params, trained=2, frozen=2):
    return (trained * 12 + frozen * 2) * params / 1e9    # before activations
`,
  },
};
