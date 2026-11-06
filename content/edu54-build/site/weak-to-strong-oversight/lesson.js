// Weak-to-strong generalisation (phase 18, lesson 11): a stand-in for supervising models smarter than us. A Kano radio station has a small model
// label 2,000 listener messages for a topic classifier (it is right 68% of the time); a much stronger model, which could reach 92% on true labels,
// is fine-tuned on those weak labels. How long it trains (it starts to copy the weak model's mistakes), an auxiliary confidence loss that lets it
// trust itself where the weak label is likely wrong, and the size of the strong model are set; accuracy and performance gap recovered (PGR) are
// computed live from an illustrative curve.
const WEAK = 0.68;
function w2s(o) {
  const ceil = { small: 0.78, mid: 0.86, large: 0.92 }[o.size];
  const gen = { small: 0.35, mid: 0.5, large: 0.62 }[o.size] * (o.aux ? 1.35 : 1);
  const peak = WEAK + (ceil - WEAK) * Math.min(0.95, gen);
  const decay = o.aux ? 0.15 : 0.6;
  const ep = o.epochs, t = Math.min(1, ep / 2), over = Math.max(0, ep - 2) / 8;
  const acc = WEAK + (peak - WEAK) * t - (peak - WEAK) * Math.min(1, over * decay * 1.6) * 0.9;
  const pgr = (acc - WEAK) / (ceil - WEAK);
  return { ceil, acc, pgr, peak };
}

export default {
  slug: 'weak-to-strong-oversight',
  title: 'Weak-to-strong: can a weaker teacher supervise a stronger model?',
  description: 'How do you supervise a model smarter than you? A radio station in Kano tries a small labeller and a strong student. Does the student copy the errors, or see past them?',
  overview: 'Every alignment method so far assumes the overseer can tell good behaviour from bad. When the model is more capable than the overseer, the overseer becomes the weak link. Burns and colleagues at OpenAI (2023) turned this into an experiment you can run today: supervise a strong model with labels from a weaker one, and measure how much of the strong model\'s ability survives. The metric is performance gap recovered: (strong model trained on weak labels − weak model) ÷ (strong model trained on true labels − weak model). A value of 1 means weak supervision lost nothing; 0 means the student only learned to be as good as its teacher. Across language tasks, chess puzzles and reward modelling, PGR was consistently positive, often between a fifth and four fifths: the strong student generalised past many of its teacher\'s mistakes because it already "knew" the task from pretraining and the weak labels mostly pointed it there. Two details matter. Train too long on weak labels and the student starts imitating the errors too, so PGR falls. An auxiliary confidence loss, which lets the student keep its own confident predictions where they disagree with the teacher, raised PGR substantially, especially for large gaps. Bootstrapping through intermediate models helps in some settings. This is a proxy, not a solution: the gap here is capability, not values, and the strong model may lean on task priors rather than recovering intent. Other approaches to scalable oversight tackle the same problem from another side: debate between models judged by a weaker judge, recursive reward modelling that uses assistants to help evaluate, and decomposing hard tasks into pieces a person can check.',
  keywords: ['weak-to-strong generalisation', 'scalable oversight', 'superalignment', 'AI safety', 'supervision', 'PGR', 'alignment research'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { epochs: 2, aux: true, size: 'large' }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const AY = a => 0.14 + (a - 0.5) / 0.45 * 1.3;
    const mk = (x, c) => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.6, 1, 0.6, c, { r: 0.04, material: m }); b.position.set(x, 0.12, -0.55); b.userData.noFit = true; floor.add(b); return { m, b }; };
    const bW = mk(-2.3, '#A9A59A'), bS = mk(-1.3, GOOD), bC = mk(-0.3, '#5B8DB8');
    const capT = ['weak teacher\nalone', 'strong student\non weak labels', 'strong student\non true labels'].map((n, i) => {    return { n }; });
    const gap = P.box(0.06, 1, 0.06, SAF, { r: 0.01 }); gap.userData.noFit = true; floor.add(gap);
    let curve = null;

    const cl = P.box(2.3, 0.012, 0.02, '#5B8DB8', { r: 0.003 }); cl.userData.noFit = true; floor.add(cl);
    const dot = P.ball(0.05, ink); dot.userData.noFit = true; floor.add(dot);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    const CX = e => 0.75 + e / 10 * 2.2, CY = a => 0.14 + (a - 0.6) / 0.35 * 0.9, CZ = -0.55;
    function draw() {
      R = w2s(st);
      bW.b.scale.y = AY(WEAK) - 0.14; bS.b.scale.y = AY(R.acc) - 0.14; bC.b.scale.y = AY(R.ceil) - 0.14;
      bS.m.color.set(R.pgr > 0.5 ? GOOD : R.pgr > 0.2 ? SAF : BAD);
      const h = Math.max(0.01, AY(R.ceil) - AY(WEAK)); gap.scale.y = h; gap.position.set(-0.8, AY(WEAK), -0.2);
      if (curve) curve.parent.remove(curve);
      const pts = []; for (let e = 0; e <= 10; e += 0.25) { const a = w2s({ ...st, epochs: e }).acc; pts.push(V(CX(e), CY(a), CZ)); }
      curve = P.tube(pts, 0.014, GOOD); curve.userData.noFit = true; floor.add(curve);
      cl.position.set(1.85, CY(R.ceil), CZ); dot.position.set(CX(st.epochs), CY(R.acc), CZ);
      const good = R.pgr > 0.5;

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const SK = ['small', 'mid', 'large'];
    const controls = [
      { type: 'slider', label: 'Training epochs on weak labels', min: 0.5, max: 10, step: 0.5, get: () => st.epochs, set: v => set({ epochs: +v }) },
      { type: 'toggle', label: 'Auxiliary confidence loss: trust confident disagreement', short: 'Confidence loss', get: () => st.aux, set: v => set({ aux: !!v }) },
      { type: 'buttons', label: 'Strong student', options: ['A bit stronger', 'Stronger', 'Much stronger'], get: () => SK.indexOf(st.size), act: i => set({ size: SK[i] }) },
    ];
    const readouts = [
      { label: 'Gap recovered', get: () => ({ v: `${Math.round(R.pgr * 100)}%`, sub: 'PGR', good: R.pgr > 0.5, bad: R.pgr < 0.2 }) },
      { label: 'Student', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: `teacher ${Math.round(WEAK * 100)}%` }) },
      { label: 'Ceiling', get: () => ({ v: `${Math.round(R.ceil * 100)}%`, sub: 'with true labels' }) },
    ];
    const labels = [
      { name: 'b', t: 'Teacher, student, ceiling', d: 'Saffron: the gap to recover', icon: 'target', atV: V(-2.98, 0.5, -0.55) },
      { name: 'c', t: 'Training time', d: 'Too long copies the errors', icon: 'wave', atV: V(3.08, 0.2, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Train until it copies the errors', hint: '10 epochs, no confidence loss', on: () => set({ ...D0, epochs: 10, aux: false }), off: reset },
      { label: 'Drop the confidence loss', hint: 'plain imitation', on: () => set({ ...D0, aux: false }), off: reset },
      { label: 'Use a barely stronger student', hint: 'small gap', on: () => set({ ...D0, size: 'small', aux: false }), off: reset },
    ];
    function status() {
      if (R.pgr < 0.2) return { ok: false, msg: `<b>After ${st.epochs} epochs ${st.aux ? '' : 'of plain imitation '}the student is at ${Math.round(R.acc * 100)}%, barely above its teacher\'s ${Math.round(WEAK * 100)}%: it has learned the teacher\'s mistakes along with its knowledge. Only ${Math.round(R.pgr * 100)}% of the gap recovered.</b> Stop early, and let the student keep confident disagreements.` };
      if (!st.aux) return { ok: false, msg: `<b>Without the confidence loss the student recovers ${Math.round(R.pgr * 100)}% of the gap: ${Math.round(R.acc * 100)}% against a ceiling of ${Math.round(R.ceil * 100)}%.</b> Letting it trust its own confident predictions where the weak label disagrees raised PGR substantially in the original study.` };
      return { ok: R.pgr > 0.5, msg: `<b>Trained on labels that are right only ${Math.round(WEAK * 100)}% of the time, the strong student reaches ${Math.round(R.acc * 100)}%, recovering ${Math.round(R.pgr * 100)}% of the gap to the ${Math.round(R.ceil * 100)}% it could reach with true labels.</b> It already knew much of the task; weak supervision mostly pointed it there. A proxy for superalignment, not a solution: here the gap is capability, not values.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Supervising someone smarter', home: true, say: 'How do we supervise models smarter than us? A stand-in: a small model teaches a much stronger one.', act: m => m.set({ epochs: 0.5, aux: false, size: 'large' }) },
    { t: 'Weak labels', home: true, say: 'A radio station in Kano has a small model label listener messages. It is right about two times in three.', act: m => m.set({ epochs: 0.5, aux: false, size: 'large' }) },
    { t: 'The student sees past them', home: true, say: 'Trained on those labels, the strong student does better than its teacher. It already knew much of the task.', act: m => m.set({ epochs: 2, aux: false, size: 'large' }) },
    { t: 'Too much imitation', home: true, say: 'Train too long and it starts copying the teacher\'s mistakes too.', act: m => m.set({ epochs: 10, aux: false, size: 'large' }) },
    { t: 'Trust confident disagreement', home: true, say: 'Let the student keep its own confident answers where the teacher disagrees, and more of the gap is recovered.', act: m => m.set({ epochs: 2, aux: true, size: 'large' }) },
    { t: 'A proxy, not a solution', home: true, say: 'Here the gap is ability, not values. Debate, assisted evaluation and breaking tasks down attack the same problem.', act: m => m.set({ epochs: 2, aux: true, size: 'large' }) },
  ],
  check: [
    { q: 'What does performance gap recovered measure?', options: ['How much of the strong model\'s ability survives weak supervision', 'The teacher\'s accuracy', 'Training speed'], answer: 0, why: '(student − teacher) ÷ (ceiling − teacher).', hint: 'Read the formula.' },
    { q: 'Why does training too long hurt?', options: ['The student starts copying the teacher\'s errors', 'It forgets the task', 'It runs out of data'], answer: 0, why: 'Imitation includes mistakes.', hint: 'Try Train until it copies the errors.' },
    { q: 'What does the auxiliary confidence loss do?', options: ['Lets the student keep confident disagreements', 'Makes the teacher stronger', 'Adds labels'], answer: 0, why: 'It trusts the student where the teacher is likely wrong.', hint: 'Turn on Confidence loss.' },
  ],
  terms: [
    ['Scalable oversight', 'Supervising systems more capable than the supervisor.'],
    ['Weak-to-strong generalisation', 'A strong model learning beyond a weak teacher\'s labels.'],
    ['PGR', 'Performance gap recovered.'],
    ['Auxiliary confidence loss', 'A term that lets the student trust its confident predictions.'],
    ['Debate', 'Models argue; a weaker judge decides.'],
    ['Task decomposition', 'Breaking a hard task into pieces a person can check.'],
  ],
  deeper: '<p><b>Bootstrapping.</b> Supervise a slightly stronger model, then use it to supervise the next, through a chain of intermediate sizes; it helped in some of the original tasks.</p><p><b>Priors, not intent.</b> The strong student may be relying on what it learned in pretraining about the task, which is not the same as recovering what the supervisor meant.</p><p><b>About this machine.</b> Accuracies and the training curve are illustrative, shaped by the published direction of results; PGR is computed live from them.</p>',
  code: {
    title: 'Weak labels, a strong student, PGR',
    note: 'Adapted from the course\'s weak-to-strong sketch (code/main.py).',
    text: `
def pgr(student_on_weak, weak, student_on_true):
    return (student_on_weak - weak) / (student_on_true - weak)

def aux_confidence_loss(student_logits, weak_labels, alpha=0.75):
    student_hard = student_logits.argmax(-1).detach()       # its own confident guess
    ce_weak = cross_entropy(student_logits, weak_labels)
    ce_self = cross_entropy(student_logits, student_hard)
    return (1 - alpha) * ce_weak + alpha * ce_self          # trust confident disagreement

pgr(0.84, 0.68, 0.92)    # 0.67: two thirds of the gap recovered
`,
  },
};
