// Constitutional AI (phase 18, lesson 5): a Lilongwe health helpline's assistant. Draft replies pass a critic that reads a written constitution, then a reviser. Later an AI, not people, ranks replies for RL.
// Six drafts each break a principle. A missing principle means that failure passes; a flat list loses the priority order when two principles pull apart. Replacing labellers moves the failure, it doesn't end it.
const DRAFTS = [
  { n: 'gives a dangerous dose', p: 0 }, { n: 'names a patient', p: 1 }, { n: 'lectures the caller', p: 2 },
  { n: 'refuses a plain question', p: 3 }, { n: 'dangerous, but kindly put', p: 0, tension: true }, { n: 'pushes a brand', p: 2 },
];
const TIER = ['Avoid catastrophe', 'Follow the guidelines', 'Be broadly ethical', 'Be helpful and candid'];
function run(o) {
  const res = DRAFTS.map(d => {
    if (!o.critic) return 'bad';
    if (!o.tiers[d.p]) return 'bad';
    if (d.tension && !o.order) return 'bad';
    return 'fixed';
  });
  const fixed = res.filter(r => r === 'fixed').length, sharp = !!o.tiers[3];
  return { res, fixed, bias: o.labeller === 'ai' ? (o.tiers.every(Boolean) ? 'gaps in the text' : 'the missing principle') : 'tired, varied people', calls: o.labeller === 'ai' ? 6 : 0, sharp };
}

export default {
  slug: 'constitutional-ai-rlaif',
  title: 'Constitutional AI: a critic that reads the rules',
  description: 'Replace the human labeller with a model that reads written principles. See what that fixes, and which failures move.',
  overview: 'RLHF needs people to label replies, and people are slow, varied and costly. Constitutional AI replaces them with a model that reads explicit principles. It has two phases. First, a model critiques and revises its own drafts against the constitution, and those revisions become training data. Second, an AI ranks replies by those principles, and that feedback drives reinforcement learning. It isn\'t just cheaper RLHF. The failure modes change: bias now lives in the written text, where you can read and argue with it, and gaps in that text pass straight through. Later versions added a priority order, so that when principles pull apart, catastrophe avoidance beats helpfulness.',
  keywords: ['Constitutional AI', 'RLAIF', 'AI feedback', 'critique and revise', 'alignment', 'AI safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { critic: true, tiers: [1, 1, 1, 1], order: true, labeller: 'ai' }, st = { ...D0, tiers: [...D0.tiers] };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const book = TIER.map((t, i) => { const m = new S.THREE.MeshLambertMaterial({ color: ['#B5462F', '#7B6FA8', '#5B8DB8', GOOD][i] }), b = P.box(0.85 - i * 0.1, 0.14, 0.6, '#fff', { r: 0.02, material: m }); b.position.set(-2.0, 0.03 + (3 - i) * 0.15, -0.1); S.add(b); return b; });
    const critic = add(P.robot('#7B6FA8', { scale: 0.85 })); critic.position.set(-1.1, 0.03, -0.3);
    const lab = add(P.robot('#A87A4F', { scale: 0.6 })); lab.position.set(-1.1, 0.03, 0.45);
    const X = i => -0.3 + i * 0.5;
    const D = DRAFTS.map((d, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.38, 0.5, 0.38, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.1); S.add(b); return { b, m }; });
    S.add(P.keep(-2.5, 2.5, 0.95, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      D.forEach(({ m }, i) => m.color.set(R.res[i] === 'fixed' ? GOOD : BAD));
      book.forEach((b, i) => { b.visible = !!st.tiers[i]; b.position.x = st.order ? -2.0 : -2.0 + (i % 2 ? 0.14 : -0.14); });
      critic.visible = st.critic; critic.userData.set({ busy: true });
      lab.userData.set({ color: st.labeller === 'ai' ? '#7B6FA8' : '#A87A4F', busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = i => ({ type: 'toggle', label: TIER[i], short: TIER[i].split(' ').pop(), quick: false, get: () => !!st.tiers[i], set: v => { st.tiers[i] = v ? 1 : 0; draw(); } });
    const LK = ['ai', 'human'];
    const controls = [
      { type: 'toggle', label: 'Critique and revise each draft', short: 'Critic', get: () => st.critic, set: v => set({ critic: !!v }) },
      { type: 'toggle', label: 'Principles have a priority order', short: 'Priority', get: () => st.order, set: v => set({ order: !!v }) },
      { type: 'buttons', label: 'Who ranks replies', options: ['An AI', 'People'], get: () => LK.indexOf(st.labeller), act: i => set({ labeller: LK[i] }) },
      ...[0, 1, 2, 3].map(tg),
    ];
    const readouts = [
      { label: 'Drafts fixed', get: () => ({ v: `${R.fixed} of 6`, sub: 'teal blocks', good: R.fixed === 6, bad: R.fixed < 4 }) },
      { label: 'Bias lives in', get: () => ({ v: R.bias, sub: st.labeller === 'ai' ? 'you can read it' : 'hard to inspect' }) },
      { label: 'Principles', get: () => ({ v: `${st.tiers.reduce((a, b) => a + b, 0)} of 4`, sub: st.order ? 'in priority order' : 'a flat list' }) },
    ];
    const labels = [
      { name: 'b', t: 'The constitution', d: 'Top tier wins a conflict', icon: 'book', atV: V(-2.42, 0.4, -0.1) },
      { name: 'd', t: 'Six drafts', d: 'Teal: fixed by the critic', icon: 'check', atV: V(X(5) + 0.2, 0.25, -0.1) },
    ];
    const reset = () => { Object.assign(st, D0, { tiers: [...D0.tiers] }); draw(); };
    const breaks = [
      { label: 'Leave a principle out', hint: 'privacy isn\'t in the text', on: () => set({ ...D0, tiers: [1, 0, 1, 1] }), off: reset },
      { label: 'A flat list of principles', hint: 'nothing outranks kindness', on: () => set({ ...D0, tiers: [1, 1, 1, 1], order: false }), off: reset },
      { label: 'No critic, only hope', hint: 'drafts go straight out', on: () => set({ ...D0, tiers: [1, 1, 1, 1], critic: false }), off: reset },
    ];
    function status() {
      if (!st.critic) return { ok: false, msg: '<b>All six drafts went out as written.</b> Principles do nothing unless a step reads them. The critic is what turns text into behaviour.' };
      if (st.tiers.some(v => !v)) return { ok: false, msg: `<b>${6 - R.fixed} drafts passed through a gap in the text.</b> An AI labeller is tireless, and blind to what isn't written. That is the new failure mode: errors move from tired people to missing lines.` };
      if (!st.order) return { ok: false, msg: '<b>A dangerous reply, kindly put, passed.</b> Kindness and safety pulled apart, and a flat list has no way to choose. A priority order settles conflicts: catastrophe avoidance comes first.' };
      return { ok: true, msg: `<b>All six fixed.</b> ${st.labeller === 'ai' ? 'And the reasoning sits in a text you can read and argue with, which human rankings never gave you.' : 'People can rank these too, more slowly, and with biases that are harder to see.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Replacing the labeller', home: true, say: 'A health helpline in Lilongwe needs safe replies. Instead of paying people to rank them, a critic reads a written constitution.', act: m => m.set({ critic: false, tiers: [1, 1, 1, 1], order: true, labeller: 'ai' }) },
    { t: 'Critique and revise', home: true, say: 'A model drafts, then critiques the draft against the principles, then revises it. Those revisions become training data.', act: m => m.set({ critic: true, tiers: [1, 1, 1, 1], order: true, labeller: 'ai' }) },
    { t: 'AI feedback', home: true, say: 'Next, an AI ranks replies by the same principles, and that drives reinforcement learning. It is RLHF with an AI labeller.', act: m => m.set({ critic: true, tiers: [1, 1, 1, 1], order: true, labeller: 'ai' }) },
    { t: 'What the text misses', home: true, say: 'Leave privacy out of the text, and the critic passes a named patient. Gaps pass straight through.', act: m => m.set({ critic: true, tiers: [1, 0, 1, 1], order: true, labeller: 'ai' }) },
    { t: 'Priorities', home: true, say: 'Sometimes principles conflict. A flat list can\'t choose. Tiers put catastrophe avoidance above helpfulness.', act: m => m.set({ critic: true, tiers: [1, 1, 1, 1], order: false, labeller: 'ai' }) },
    { t: 'A moved failure', home: true, say: 'This isn\'t just cheaper. The bias moved into a text you can read, and argue about.', act: m => m.set({ critic: true, tiers: [1, 1, 1, 1], order: true, labeller: 'ai' }) },
  ],
  check: [
    { q: 'What are the two phases of Constitutional AI?', options: ['Critique and revise, then RL from AI feedback', 'Tokenise, then embed', 'Train, then prune'], answer: 0, why: 'First revisions, then AI-ranked RL.', hint: 'See the story.' },
    { q: 'What is the new failure mode?', options: ['Gaps in the written principles', 'Tired labellers', 'Slow GPUs'], answer: 0, why: 'What isn\'t written isn\'t checked.', hint: 'Try Leave a principle out.' },
    { q: 'Why give principles a priority order?', options: ['To settle conflicts between them', 'To shorten the text', 'To save tokens'], answer: 0, why: 'A flat list can\'t choose.', hint: 'Try A flat list of principles.' },
  ],
  terms: [
    ['Constitution', 'Written principles a model is trained on.'],
    ['Critique and revise', 'A model improving its own draft by the rules.'],
    ['RLAIF', 'Reinforcement learning from AI feedback.'],
    ['Labeller', 'Whoever ranks replies.'],
    ['Priority tiers', 'An order for when principles conflict.'],
    ['Constitutional classifier', 'A trained filter built from the rules.'],
  ],
  deeper: '<p><b>Tiers.</b> The course describes four: avoid catastrophe, follow guidelines, be broadly ethical, be helpful and candid. These are paraphrased here.</p><p><b>Classifiers.</b> Constitutional classifiers apply the same idea at inference. The course reports overhead falling from about 23.7% of compute to around 1%.</p><p><b>Drafts here</b> are a small illustrative set.</p>',
  code: {
    title: 'Critique and revise',
    note: 'Adapted from the course\'s pipeline sketch (code/main.py).',
    text: `
def improve(prompt, principles):
    draft = model(prompt)
    for rule in principles:
        critique = model(f"Does this break the rule '{rule}'?\\n{draft}")
        if "yes" in critique.lower():
            draft = model(f"Rewrite to follow '{rule}':\\n{draft}\\n{critique}")
    return {"prompt": prompt, "revision": draft}    # becomes training data
`,
  },
};
