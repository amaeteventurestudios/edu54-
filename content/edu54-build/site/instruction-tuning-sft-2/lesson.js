// SFT from code (phase 19, lesson 39): one training example is a strip of tokens: instruction, boundary, response. A collate step sets labels to -100 on the instruction, so loss counts only the reply. Twelve tokens drawn, with a computed count of tokens scored. Without the mask the model learns to repeat the question.
const INS = 7, RES = 5, PAD = 4;
function run(o) {
  const mask = o.mask, pad = o.padmask;
  const scored = RES + (mask ? 0 : INS) + (pad ? 0 : PAD);
  const copy = !mask, bound = o.bound;
  return { scored, copy, bound, q: !bound ? 40 : copy ? 55 : !pad ? 68 : 90 };
}

export default {
  slug: 'instruction-tuning-sft-2',
  title: 'Instruction tuning in code: mask what isn\'t the answer',
  description: 'One example, one strip of tokens. The mask decides what the model is trained to say.',
  overview: 'Instruction tuning starts with pairs: a request and a good reply. Join them into one sequence, with clear boundary tokens, so that the model knows where a turn ends. The clever part is in the labels. The model should learn to produce the reply, not the question, so label positions for the instruction are set to -100, a value cross-entropy ignores. Padding gets the same treatment. Skip the mask, and much of the loss goes on repeating prompts. Skip boundaries, and the model runs on past the end of its answer. This lesson lays out one example as a strip of tokens, for a farmer helpline in Bamenda.',
  keywords: ['SFT', 'instruction tuning', 'label masking', 'collate', 'cross-entropy', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.75, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mask: true, padmask: true, bound: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const n = INS + 1 + RES + PAD, X = i => -2.2 + i * 0.26;
    const C = Array.from({ length: n }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.22, 0.26, 0.5, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.25); S.add(b); const l = P.box(0.22, 0.14, 0.2, '#fff', { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GREY }) }); l.position.set(X(i), 0.03, 0.3); S.add(l); return { m, lm: l.material }; });
    const dial = add(P.dial(0.34)); dial.position.set(2.1, 0.03, 0);
    S.add(P.keep(-2.4, 2.45, 0.7, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      C.forEach(({ m, lm }, i) => {
        const kind = i < INS ? 'ins' : i === INS ? 'b' : i < INS + 1 + RES ? 'res' : 'pad';
        m.color.set({ ins: BLUE, b: st.bound ? SAF : BLUE, res: GOOD, pad: GREY }[kind]);
        lm.color.set(kind === 'res' || (kind === 'ins' && !st.mask) || (kind === 'pad' && !st.padmask) ? (kind === 'res' ? GOOD : BAD) : '#E0DBCE');
      });
      dial.userData.set({ v: 1 - R.q / 100 });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('mask', 'Mask instruction labels with -100', 'Mask question'), tg('padmask', 'Mask padding labels', 'Mask padding'), tg('bound', 'Use boundary tokens', 'Boundaries')];
    const readouts = [
      { label: 'Tokens scored', get: () => ({ v: `${R.scored}`, sub: `only ${RES} are the reply`, good: R.scored === RES, bad: R.scored > RES }) },
      { label: 'Reply quality', get: () => ({ v: `${R.q}%`, sub: 'illustrative', good: R.q >= 85, bad: R.q < 60 }) },
      { label: 'Behaviour', get: () => ({ v: !st.bound ? 'runs on' : R.copy ? 'repeats questions' : 'answers', good: st.bound && !R.copy }) },
    ];
    const labels = [
      { name: 's', t: 'One example', d: 'Blue ask, gold edge, teal reply', icon: 'wave', atV: V(X(0) - 0.1, 0.2, -0.25) },
      { name: 'l', t: 'Labels', d: 'Pale: ignored by the loss', icon: 'target', atV: V(X(16) + 0.1, 0.1, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Score the question too', hint: 'no -100', on: () => set({ ...D0, mask: false }), off: reset },
      { label: 'No boundary token', hint: 'no end of turn', on: () => set({ ...D0, bound: false }), off: reset },
      { label: 'Score the padding', hint: 'loss on nothing', on: () => set({ ...D0, padmask: false }), off: reset },
    ];
    function status() {
      if (!st.bound) return { ok: false, msg: '<b>It answers, then keeps going, inventing the next question.</b> With no boundary token, the model never learned where a turn ends.' };
      if (!st.mask) return { ok: false, msg: `<b>${R.scored} tokens scored, and only ${RES} are the reply.</b> Most of the effort goes on learning to repeat the question.` };
      if (!st.padmask) return { ok: false, msg: `<b>${R.scored} tokens scored, ${PAD} of them padding.</b> The model is being graded on blanks.` };
      return { ok: true, msg: `<b>Only the ${RES} reply tokens are scored.</b> Each gradient teaches the model to answer. That is all instruction tuning is.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Pairs', home: true, say: 'A farmer helpline in Bamenda has questions and good answers. Each pair becomes one strip of tokens.', act: m => m.set({ mask: true, padmask: true, bound: true }) },
    { t: 'A boundary', home: true, say: 'A boundary token marks where the question ends and the reply begins. Without it, the model runs on.', act: m => m.set({ mask: true, padmask: true, bound: false }) },
    { t: 'Labels', home: true, say: 'The second row is the labels. Only the reply should count.', act: m => m.set({ mask: true, padmask: true, bound: true }) },
    { t: 'Minus one hundred', home: true, say: 'Set question labels to minus one hundred, and the loss ignores them. Forget that, and it learns to repeat questions.', act: m => m.set({ mask: false, padmask: true, bound: true }) },
    { t: 'Padding', home: true, say: 'Padding gets the same mask. Nobody should be graded on blanks.', act: m => m.set({ mask: true, padmask: false, bound: true }) },
    { t: 'Only the answer', home: true, say: 'Now every gradient teaches the model to answer.', act: m => m.set({ mask: true, padmask: true, bound: true }) },
  ],
  check: [
    { q: 'Why set instruction labels to -100?', options: ['So the loss ignores them', 'To save memory', 'To hide them from the model'], answer: 0, why: 'The model still reads them.', hint: 'Try Score the question too.' },
    { q: 'What does a boundary token teach?', options: ['Where a turn ends', 'Which word is rare', 'How to spell'], answer: 0, why: 'Without it, the model runs on.', hint: 'Try No boundary token.' },
    { q: 'What should the loss count?', options: ['Only reply tokens', 'All tokens', 'Only padding'], answer: 0, why: 'That is what you want produced.', hint: 'Read Tokens scored.' },
  ],
  terms: [['Collate', 'Joining examples into a batch.'], ['-100', 'The label cross-entropy ignores.'], ['Boundary token', 'Marks the end of a turn.'], ['Chat template', 'How turns are formatted.'], ['Padding', 'Filler to even out lengths.']],
  deeper: '<p><b>Use the same template.</b> Training and serving must format turns the same way, or quality falls.</p><p><b>The model still reads the question.</b> Masking affects only the loss.</p><p><b>Quality here</b> is illustrative.</p>',
  code: {
    title: 'Collate',
    note: 'Adapted from the course\'s collate function (code/main.py).',
    text: `
def collate(pairs):
    ids, labels = [], []
    for q, a in pairs:
        q_ids, a_ids = tok(q) + [SEP], tok(a) + [EOS]
        ids.append(q_ids + a_ids)
        labels.append([-100] * len(q_ids) + a_ids)
    return pad(ids, PAD), pad(labels, -100)
`,
  },
};
