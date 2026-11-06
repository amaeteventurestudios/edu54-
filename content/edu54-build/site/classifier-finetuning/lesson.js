// Classifier fine-tuning (phase 19, lesson 38): a Dakar bank turns a language model into a complaint sorter by swapping its head. Frozen body or full tuning; pooled token choice; padding masks. Twenty test items and a simple result table give precision, recall and a confusion block.
function run(o) {
  let tp = 9, fn = 1, fp = 1, tn = 9;
  if (o.mode === 'frozen') { tp = 7; fn = 3; fp = 2; tn = 8; }
  if (o.n === 'few' && o.mode === 'full') { tp = 6; fn = 4; fp = 4; tn = 6; }
  if (!o.mask) { tp -= 2; fn += 2; fp += 2; tn -= 2; }
  if (o.pool === 'pad') { tp -= 3; fn += 3; }
  if (o.bal === false) { tp = Math.max(0, tp - 5); fn += 5; tn = Math.min(10, tn + fp); fp = 0; }
  const prec = tp / Math.max(1, tp + fp), rec = tp / Math.max(1, tp + fn), acc = (tp + tn) / 20;
  return { tp, fn, fp, tn, prec, rec, acc, f1: 2 * prec * rec / Math.max(0.01, prec + rec) };
}

export default {
  slug: 'classifier-finetuning',
  title: 'Classifier tuning: swap the head, keep the body',
  description: 'A language model becomes a complaint sorter. Choose frozen or full tuning, and read precision and recall, not just accuracy.',
  overview: 'A trained language model knows a lot about text, so don\'t start again. Swap its head for a small classifier, and keep the body. With few labels, freeze the body and train only the head, which is quick and hard to overfit. With more, tune everything at a low rate. Details decide quality: pad short texts and mask the padding, so that it isn\'t read as words, and pool from the last real token. Then measure properly. Accuracy can look fine on unbalanced data while the class you care about is missed, so report precision, recall and F1. This lesson runs a complaint sorter for a bank in Dakar.',
  keywords: ['fine-tuning', 'classification head', 'precision', 'recall', 'F1', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'full', n: 'many', mask: true, pool: 'last', bal: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const body = add(P.stack(1.1, 0.8, 0.1, { max: 8, color: BLUE })); body.position.set(-1.7, 0.03, 0);
    const head = P.box(0.9, 0.2, 0.7, SAF, { r: 0.04 }); head.position.set(-1.7, 0.85, 0); S.add(head);
    const G = [[0, 0], [1, 0], [0, 1], [1, 1]], T = G.map(([c, r], i) => { const t = add(P.tower(0.5, 0.5, i === 0 || i === 3 ? GOOD : BAD)); t.position.set(0.05 + c * 0.62, 0.03, -0.3 + r * 0.6); t.userData.set({ cap: '' }); return t; });
    const dial = add(P.dial(0.38)); dial.position.set(1.9, 0.03, 0);
    S.add(P.keep(-2.3, 2.4, 1.15, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      [R.tp, R.fn, R.fp, R.tn].forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 0.11) }));
      body.userData.set({ n: 8, colors: Array(8).fill(st.mode === 'frozen' ? '#9EB5CC' : BLUE) }); dial.userData.set({ v: 1 - R.f1 });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['frozen', 'full'], NK = ['few', 'many'], PK = ['last', 'pad'];
    const controls = [
      { type: 'buttons', label: 'Train', options: ['Head only', 'Whole model'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'buttons', label: 'Labels', options: ['A few hundred', 'Thousands'], get: () => NK.indexOf(st.n), act: i => set({ n: NK[i] }) },
      { type: 'toggle', label: 'Mask the padding', short: 'Mask', get: () => st.mask, set: v => set({ mask: !!v }) },
      { type: 'buttons', label: 'Pool from', options: ['Last real token', 'Last position'], get: () => PK.indexOf(st.pool), act: i => set({ pool: PK[i] }) },
      { type: 'toggle', label: 'Classes balanced in training', short: 'Balanced', get: () => st.bal, set: v => set({ bal: !!v }) },
    ];
    const readouts = [
      { label: 'Accuracy', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: 'can mislead' }) },
      { label: 'Recall', get: () => ({ v: `${Math.round(R.rec * 100)}%`, sub: 'real complaints caught', good: R.rec >= 0.8, bad: R.rec < 0.6 }) },
      { label: 'Precision', get: () => ({ v: `${Math.round(R.prec * 100)}%`, sub: `F1 ${R.f1.toFixed(2)}`, good: R.prec >= 0.8 }) },
    ];
    const labels = [
      { name: 'b', t: 'Body and new head', d: 'Pale body: frozen', icon: 'box', atV: V(-2.28, 0.4, 0) },
      { name: 'c', t: 'Right and wrong', d: 'Teal correct, coral wrong', icon: 'target', atV: V(1.0, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Full tuning on few labels', hint: 'overfits', on: () => set({ ...D0, n: 'few' }), off: reset },
      { label: 'No padding mask', hint: 'padding reads as words', on: () => set({ ...D0, mask: false }), off: reset },
      { label: 'Pool from a pad token', hint: 'short texts read blank', on: () => set({ ...D0, pool: 'pad' }), off: reset },
      { label: 'Trust accuracy on skewed data', hint: 'rare class missed', on: () => set({ ...D0, bal: false }), off: reset },
    ];
    function status() {
      if (!st.bal) return { ok: false, msg: `<b>Accuracy ${Math.round(R.acc * 100)}%, recall ${Math.round(R.rec * 100)}%.</b> The model says "not a complaint" a lot, and looks fine. Most real complaints are missed. Report recall.` };
      if (st.pool === 'pad') return { ok: false, msg: '<b>Short texts read the padding.</b> The head sees a blank. Pool from the last real token.' };
      if (!st.mask) return { ok: false, msg: `<b>F1 fell to ${R.f1.toFixed(2)}.</b> Padding tokens were read as text. Mask them in attention.` };
      if (st.mode === 'full' && st.n === 'few') return { ok: false, msg: `<b>F1 ${R.f1.toFixed(2)}.</b> Whole-model tuning on a few hundred labels overfits. Freeze the body first.` };
      return { ok: true, msg: `<b>Precision ${Math.round(R.prec * 100)}%, recall ${Math.round(R.rec * 100)}%, F1 ${R.f1.toFixed(2)}.</b> ${st.mode === 'frozen' ? 'Head-only is quick, and a fine start.' : 'Enough labels to tune it all.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Swap the head', home: true, say: 'A bank in Dakar wants to sort complaints. Keep the language model, and swap its head for a small classifier.', act: m => m.set({ mode: 'frozen', n: 'few', mask: true, pool: 'last', bal: true }) },
    { t: 'Freeze first', home: true, say: 'With few labels, train only the head. It\'s quick, and it can\'t overfit much.', act: m => m.set({ mode: 'frozen', n: 'few', mask: true, pool: 'last', bal: true }) },
    { t: 'Tune it all', home: true, say: 'With thousands of labels, tune the whole model at a low rate.', act: m => m.set({ mode: 'full', n: 'many', mask: true, pool: 'last', bal: true }) },
    { t: 'Padding', home: true, say: 'Texts differ in length, so short ones get padding. Mask it, and pool from the last real token.', act: m => m.set({ mode: 'full', n: 'many', mask: false, pool: 'last', bal: true }) },
    { t: 'Beyond accuracy', home: true, say: 'If complaints are rare, a lazy model scores well. Recall shows what was missed.', act: m => m.set({ mode: 'full', n: 'many', mask: true, pool: 'last', bal: false }) },
    { t: 'Read four numbers', home: true, say: 'Precision, recall, F1 and the confusion table say what the model really does.', act: m => m.set({ mode: 'full', n: 'many', mask: true, pool: 'last', bal: true }) },
  ],
  check: [
    { q: 'What do you do with few labels?', options: ['Freeze the body, train the head', 'Tune everything fast', 'Start from scratch'], answer: 0, why: 'Less to overfit.', hint: 'Try Full tuning on few labels.' },
    { q: 'Why mask padding?', options: ['So it isn\'t read as words', 'To save disk', 'To shorten training'], answer: 0, why: 'It carries no meaning.', hint: 'Try No padding mask.' },
    { q: 'What does recall measure?', options: ['How many real cases were caught', 'How fast it runs', 'How many it flagged'], answer: 0, why: 'Key on rare classes.', hint: 'Try Trust accuracy on skewed data.' },
  ],
  terms: [['Head swap', 'Replacing the output layer.'], ['Freezing', 'Not training some weights.'], ['Pooling', 'Reducing many vectors to one.'], ['Precision', 'Of those flagged, how many were right.'], ['Recall', 'Of the real ones, how many were found.']],
  deeper: '<p><b>Lower rate for the body.</b> In full tuning, the head can learn faster than the body.</p><p><b>Language.</b> Check per-language scores, for French, Wolof and mixed text.</p><p><b>The numbers</b> are a small illustrative table.</p>',
  code: {
    title: 'Swap and freeze',
    note: 'Adapted from the course\'s classifier (code/main.py).',
    text: `
model.head = nn.Linear(model.dim, num_classes)
for p in model.body.parameters():
    p.requires_grad = False                      # frozen

def pool(hidden, mask):
    last = mask.sum(1) - 1
    return hidden[range(len(hidden)), last]
`,
  },
};
