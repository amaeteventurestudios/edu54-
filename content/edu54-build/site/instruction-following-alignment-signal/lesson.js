// Instruction following (phase 18, lesson 1): a raw model completes web text; InstructGPT's three stages make it answer: supervised tuning, a reward model, then RL with a KL penalty. The optimum of reward minus β·KL is
// π(y) ∝ π0(y) exp(r(y)/β), computed live over six replies to a Swahili science question. With small β the policy collapses onto what the reward model likes most, even a reply it overrates.
const REPLY = [
  { n: 'continues the web page', base: 0.5, r: -2, true: -2 },
  { n: 'a short correct answer', base: 0.1, r: 1.6, true: 2 },
  { n: 'a careful long answer', base: 0.08, r: 2.1, true: 2.2 },
  { n: 'a confident flattering reply', base: 0.08, r: 3, true: -1 },
  { n: 'a refusal', base: 0.04, r: 0.4, true: -0.5 },
  { n: 'nonsense', base: 0.2, r: -3, true: -3 },
];
function run(o) {
  const base = o.stage >= 1 ? [0.06, 0.34, 0.3, 0.12, 0.08, 0.1] : REPLY.map(r => r.base);
  let p = base.slice();
  if (o.stage >= 3) { const raw = base.map((b, i) => b * Math.exp(REPLY[i].r / o.beta)); const z = raw.reduce((a, b) => a + b, 0); p = raw.map(v => v / z); }
  const val = p.reduce((a, v, i) => a + v * REPLY[i].true, 0), top = Math.max(...p);
  const kl = p.reduce((a, v, i) => a + (v > 1e-9 ? v * Math.log(v / base[i]) : 0), 0);
  const fid = o.ptx ? 0.97 : o.stage >= 3 ? 0.97 - Math.min(0.2, kl * 0.1) : 0.97;
  return { p, val, top, kl, fid, topI: p.indexOf(top) };
}

export default {
  slug: 'instruction-following-alignment-signal',
  title: 'Instruction following: how a completer learned to answer',
  description: 'A raw model continues web pages. Three stages turn it into an assistant, and one penalty keeps it from collapsing.',
  overview: 'Pre-trained models complete text. Ask for a function and you may get another question, as most web text continues into more web text. InstructGPT made a smaller model beat a far larger one in human preference, with three stages. First, supervised tuning on demonstrations. Second, a reward model trained on people\'s rankings. Third, reinforcement learning to raise that reward, held back by a KL penalty that keeps the policy near where it began. That penalty matters. Without it the policy chases whatever the reward model most overrates, and collapses onto one kind of reply. There is also an alignment tax on plain capability, which mixing in pretraining text helps to reduce.',
  keywords: ['InstructGPT', 'RLHF', 'KL penalty', 'reward model', 'alignment', 'PPO'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.05, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { stage: 3, beta: 1.5, ptx: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.25 + i * 0.5;
    const T = REPLY.map((r, i) => { const t = add(P.tower(0.38, 0.5, r.true > 0 ? GOOD : BAD)); t.position.set(X(i), 0.03, -0.15); t.userData.set({ cap: '' }); return t; });
    const St = [0, 1, 2].map(i => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.5, 0.26, 0.5, '#fff', { r: 0.05, material: m }); b.position.set(-2.15, 0.03 + i * 0.28, -0.15); S.add(b); return m; });
    const dial = add(P.dial(0.34)); dial.position.set(2.1, 0.03, 0.3);
    S.add(P.keep(-2.5, 2.5, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      R.p.forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 1.25) }));
      St.forEach((m, i) => m.color.set(i < st.stage ? ['#5B8DB8', SAF, GOOD][i] : GREY));
      dial.userData.set({ v: Math.min(1, R.top) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Stages done', min: 0, max: 3, step: 1, get: () => st.stage, set: v => set({ stage: v }), fmt: v => ['raw model', 'supervised', 'reward model', 'RL with KL'][v] },
      { type: 'slider', label: 'KL penalty β', min: 0.15, max: 4, step: 0.05, get: () => st.beta, set: v => set({ beta: v }) },
      { type: 'toggle', label: 'Mix in pretraining text during RL (ptx)', short: 'ptx', get: () => st.ptx, set: v => set({ ptx: !!v }) },
    ];
    const readouts = [
      { label: 'True value of replies', get: () => ({ v: R.val.toFixed(2), sub: 'by real human judgment', good: R.val > 1.3, bad: R.val < 0.5 }) },
      { label: 'Most likely reply', get: () => ({ v: `${Math.round(R.top * 100)}%`, sub: REPLY[R.topI].n, bad: R.top > 0.7 }) },
      { label: 'Plain capability', get: () => ({ v: `${Math.round(R.fid * 100)}%`, sub: 'the alignment tax', good: R.fid > 0.93 }) },
    ];
    const labels = [
      { name: 's', t: 'Three stages', d: 'Tuning, reward model, RL', icon: 'check', atV: V(-2.42, 0.4, -0.15) },
      { name: 't', t: 'Six kinds of reply', d: 'Height: how often. Coral: bad', icon: 'target', atV: V(2.0, 0.12, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Drop the KL penalty', hint: 'chase the reward', on: () => set({ ...D0, beta: 0.15 }), off: reset },
      { label: 'Skip RL altogether', hint: 'demonstrations only', on: () => set({ ...D0, stage: 1 }), off: reset },
      { label: 'Heavy RL, no ptx', hint: 'pay the tax', on: () => set({ ...D0, beta: 0.8, ptx: false }), off: reset },
    ];
    function status() {
      if (st.stage === 0) return { ok: false, msg: `<b>Half the time it just continues the page.</b> A raw model learned web text, and web text rarely answers questions. It isn't failing; it was never asked to answer.` };
      if (st.stage < 3) return { ok: st.stage === 2, msg: `<b>True value ${R.val.toFixed(2)}.</b> ${st.stage === 1 ? 'Demonstrations teach the form of answering, not what people prefer.' : 'The reward model can now score replies, and the policy hasn\'t used that yet.'}` };
      if (R.topI === 3 && R.top > 0.6) return { ok: false, msg: `<b>${Math.round(R.top * 100)}% of replies are flattery, the reply the reward model overrates.</b> With almost no penalty, the policy finds what scores highest, not what is best. True value falls to ${R.val.toFixed(2)}. The KL penalty stops that.` };
      if (!st.ptx && R.fid < 0.93) return { ok: false, msg: `<b>Plain capability fell to ${Math.round(R.fid * 100)}%.</b> Heavy tuning loses some general skill. That is the alignment tax. Mixing pretraining text into the loss reduces it.` };
      return { ok: true, msg: `<b>True value ${R.val.toFixed(2)}, and good replies dominate.</b> β of ${st.beta.toFixed(2)} keeps the policy close enough to what it learned that the reward model\'s errors can\'t take over.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A completer', home: true, say: 'Ask a raw model a science question in Swahili. Half the time, it just continues the web page.', act: m => m.set({ stage: 0, beta: 1.5, ptx: true }) },
    { t: 'Demonstrations', home: true, say: 'Stage one: tune it on examples of good answers. It learns the form of answering.', act: m => m.set({ stage: 1, beta: 1.5, ptx: true }) },
    { t: 'A reward model', home: true, say: 'Stage two: people rank replies, and a model learns to predict those rankings.', act: m => m.set({ stage: 2, beta: 1.5, ptx: true }) },
    { t: 'Reinforcement', home: true, say: 'Stage three: raise the reward, while a KL penalty keeps the policy near where it began. Good replies rise.', act: m => m.set({ stage: 3, beta: 1.5, ptx: true }) },
    { t: 'Without the penalty', home: true, say: 'Drop the penalty, and the policy collapses onto the reply the reward model overrates. Here, that is flattery.', act: m => m.set({ stage: 3, beta: 0.15, ptx: true }) },
    { t: 'The alignment tax', home: true, say: 'Heavy tuning costs some plain skill. Mixing in pretraining text pays part of that tax.', act: m => m.set({ stage: 3, beta: 0.8, ptx: false }) },
  ],
  check: [
    { q: 'Why does a raw model often not answer?', options: ['It learned to continue web text', 'It refuses', 'It lacks memory'], answer: 0, why: 'Its job was completion.', hint: 'Set stages to raw model.' },
    { q: 'What does the KL penalty protect against?', options: ['Collapsing onto what the reward model overrates', 'Slow training', 'Short replies'], answer: 0, why: 'It keeps the policy near its start.', hint: 'Try Drop the KL penalty.' },
    { q: 'What are the three stages?', options: ['Supervised tuning, reward model, RL', 'Tokenise, embed, decode', 'Train, test, ship'], answer: 0, why: 'Each uses a different loss.', hint: 'Move Stages done.' },
  ],
  terms: [
    ['Instruction tuning', 'Training on demonstrations of good answers.'],
    ['Reward model', 'A model that predicts human preference.'],
    ['RLHF', 'Reinforcement learning from human feedback.'],
    ['KL penalty', 'A cost for drifting from the starting policy.'],
    ['Mode seeking', 'Collapsing onto the single top-scoring output.'],
    ['Alignment tax', 'General skill lost to alignment tuning.'],
  ],
  deeper: '<p><b>The maths here.</b> Maximising reward minus β·KL has a closed form: π(y) ∝ π0(y)·exp(r(y)/β). The towers use that directly.</p><p><b>Small beat big.</b> A 1.3B tuned model was preferred over the raw 175B GPT-3: skill at the job beat size.</p><p><b>Reward models are wrong in places.</b> Everything later in this track deals with what follows from that.</p>',
  code: {
    title: 'The closed form',
    note: 'Adapted from the course\'s KL sketch (code/main.py).',
    text: `
import numpy as np

def tilt(base, reward, beta):
    raw = base * np.exp(reward / beta)
    return raw / raw.sum()

def objective(policy, base, reward, beta):
    return (policy * reward).sum() - beta * (policy * np.log(policy / base)).sum()
`,
  },
};
