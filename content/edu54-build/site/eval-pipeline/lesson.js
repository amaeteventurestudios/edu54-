// A full evaluation pipeline (phase 19, lesson 41): four measures of one tuned model from a Ouagadougou health project: perplexity, exact match, token F1, and a judge. Exact match and F1 are computed for real on six answers; the others are round. One number hides what the others show.
const QA = [['malaria', 'malaria'], ['ten days', '10 days'], ['boil the water', 'boil water first'], ['oral rehydration', 'rehydration by mouth'], ['two doses', 'two doses'], ['the left arm', 'left arm']];
const norm = s => s.toLowerCase().replace(/\b(the|a|an)\b/g, '').trim().split(/\s+/).filter(Boolean);
function f1(p, r) { const a = norm(p), b = norm(r), c = a.filter(x => b.includes(x)).length; if (!c) return 0; const pr = c / a.length, re = c / b.length; return 2 * pr * re / (pr + re); }
function run(o) {
  const em = QA.filter(([p, r]) => (o.norm ? norm(p).join(' ') === norm(r).join(' ') : p === r)).length / QA.length;
  const fs = QA.reduce((a, [p, r]) => a + f1(p, r), 0) / QA.length;
  const judge = o.lenient ? 4.9 : 3.8, perp = o.leak ? 3 : 18;
  const w = [o.u1, o.u2, o.u3, o.u4], score = (((30 - perp) / 30) * w[0] + em * w[1] + fs * w[2] + (judge / 5) * w[3]) / Math.max(1, w.reduce((a, b) => a + b, 0));
  return { em, fs, judge, perp, score };
}

export default {
  slug: 'eval-pipeline',
  title: 'A full evaluation: four measures of one model',
  description: 'Perplexity, exact match, token F1 and a judge. Each sees something the others miss, so report all four.',
  overview: 'One number can\'t describe a model. Perplexity on held-out text tracks how well it models language, and says little about truth. Exact match on short factual prompts is strict: "ten days" and "10 days" count as different. Token F1 is kinder, crediting overlap after normalising. An LLM judge can rate longer answers on a scale, and it has opinions of its own, so check it. Run all four, on the same fixed set, and put them side by side. Report each number, not only a blended score. This lesson runs real exact-match and F1 sums on six answers, for a health project in Ouagadougou.',
  keywords: ['evaluation', 'perplexity', 'exact match', 'F1', 'LLM judge', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { norm: true, lenient: false, leak: false, u1: 1, u2: 1, u3: 1, u4: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.8 + i * 0.9, T = [0, 1, 2, 3].map(i => { const t = add(P.tower(0.6, 0.6, ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#D98BA6'][i])); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const blend = add(P.tower(0.5, 0.5, '#F2AE0C')); blend.position.set(1.95, 0.03, -0.1); blend.userData.set({ cap: '' });
    S.add(P.keep(-2.3, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T[0].userData.set({ h: (30 - R.perp) / 30 * 1.1 }); T[1].userData.set({ h: Math.max(0.03, R.em * 1.1) }); T[2].userData.set({ h: R.fs * 1.1 }); T[3].userData.set({ h: R.judge / 5 * 1.1 }); blend.userData.set({ h: Math.max(0.03, R.score * 1.1) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('norm', 'Normalise before comparing', 'Normalise'), tg('lenient', 'The judge is a lenient model', 'Lenient judge'), tg('leak', 'Training data in the eval set', 'Leak')];
    const readouts = [
      { label: 'Exact match', get: () => ({ v: `${Math.round(R.em * 100)}%`, sub: 'strict' }) },
      { label: 'Token F1', get: () => ({ v: R.fs.toFixed(2), sub: 'credits overlap' }) },
      { label: 'Judge / perplexity', get: () => ({ v: `${R.judge} / ${R.perp}`, sub: 'out of 5, lower is better', bad: st.lenient || st.leak }) },
    ];
    const labels = [
      { name: 't', t: 'Four measures', d: 'Each answers its own question', icon: 'target', atV: V(X(0) - 0.3, 0.2, -0.1) },
      { name: 'b', t: 'A blend', d: 'Hides as much as it shows', icon: 'scale', atV: V(2.2, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Compare raw strings', hint: '"the left arm" fails', on: () => set({ ...D0, norm: false }), off: reset },
      { label: 'Trust a lenient judge', hint: 'all fours and fives', on: () => set({ ...D0, lenient: true }), off: reset },
      { label: 'Evaluate on training data', hint: 'perplexity flatters', on: () => set({ ...D0, leak: true }), off: reset },
    ];
    function status() {
      if (!st.norm) return { ok: false, msg: `<b>Exact match fell to ${Math.round(R.em * 100)}%.</b> "The left arm" and "left arm" count as different. Normalise case, articles and punctuation.` };
      if (st.lenient) return { ok: false, msg: `<b>The judge says ${R.judge} of 5, while exact match says ${Math.round(R.em * 100)}%.</b> A judge is a model, with its own biases. Calibrate it on human-scored answers.` };
      if (st.leak) return { ok: false, msg: `<b>Perplexity ${R.perp}, too good to be true.</b> The model has seen these texts.` };
      return { ok: true, msg: `<b>Exact ${Math.round(R.em * 100)}%, F1 ${R.fs.toFixed(2)}, judge ${R.judge}, perplexity ${R.perp}.</b> Report all four, on the same fixed set.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One model, four numbers', home: true, say: 'A health project in Ouagadougou tunes a model. How good is it? One number can\'t say.', act: m => m.set({ norm: true, lenient: false, leak: false }) },
    { t: 'Perplexity', home: true, say: 'Held-out perplexity tracks how well it models text. It says little about truth.', act: m => m.set({ norm: true, lenient: false, leak: false }) },
    { t: 'Exact match', home: true, say: 'On short facts, exact match is strict. Compare raw strings, and articles count as errors.', act: m => m.set({ norm: false, lenient: false, leak: false }) },
    { t: 'Token F1', home: true, say: 'F1 credits overlap, so a partly right answer gets partial credit.', act: m => m.set({ norm: true, lenient: false, leak: false }) },
    { t: 'A judge', home: true, say: 'A model can rate long answers. It has habits of its own, so calibrate it.', act: m => m.set({ norm: true, lenient: true, leak: false }) },
    { t: 'Side by side', home: true, say: 'Report all four on one fixed set. A blend alone hides what went wrong.', act: m => m.set({ norm: true, lenient: false, leak: false }) },
  ],
  check: [
    { q: 'What does perplexity tell you?', options: ['How well it models text', 'If answers are true', 'How fast it runs'], answer: 0, why: 'Not the same as truth.', hint: 'See Perplexity.' },
    { q: 'Why normalise before exact match?', options: ['Articles and case aren\'t errors', 'To save time', 'To raise scores unfairly'], answer: 0, why: 'Compare meaning, not spelling.', hint: 'Try Compare raw strings.' },
    { q: 'Why check an LLM judge?', options: ['It has biases of its own', 'It is too slow', 'It costs too little'], answer: 0, why: 'Calibrate on human scores.', hint: 'Try Trust a lenient judge.' },
  ],
  terms: [['Perplexity', 'Average surprise per token.'], ['Exact match', 'The same string after normalising.'], ['Token F1', 'Overlap of tokens.'], ['LLM judge', 'A model scoring answers.'], ['Fixed eval set', 'The same tests each run.']],
  deeper: '<p><b>Keep the set stable.</b> Change it and scores stop comparing.</p><p><b>Local languages.</b> Normalisers must handle your languages too.</p><p><b>Exact match and F1</b> are really computed on six pairs.</p>',
  code: {
    title: 'Token F1',
    note: 'Adapted from the course\'s pipeline (code/main.py).',
    text: `
def f1(pred, gold):
    p, g = normalise(pred), normalise(gold)
    common = sum((Counter(p) & Counter(g)).values())
    if not common:
        return 0.0
    precision, recall = common / len(p), common / len(g)
    return 2 * precision * recall / (precision + recall)
`,
  },
};
