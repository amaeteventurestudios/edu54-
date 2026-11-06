// Multimodal evaluation (phase 19, lesson 63): three measures of a Gondar museum model: recall@k from a similarity table, exact-match VQA accuracy, and BLEU. A real recall@k and a real clipped 1-to-2-gram BLEU run on a few examples. Good at one doesn't imply good at others.
const SIMR = [1, 3, 1, 8, 2, 1, 5, 1, 2, 12];       // rank of the right caption per image
const REF = 'a woven basket on a table'.split(' '), HYP = { good: 'a woven basket on the table', bad: 'a a a a a a' };
const VQA = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1];
function bleu(h, r) {
  const prec = [1, 2].map(n => { const gr = a => { const m = {}; for (let i = 0; i + n <= a.length; i++) { const k = a.slice(i, i + n).join(' '); m[k] = (m[k] || 0) + 1; } return m; }, g = gr(h), f = gr(r); let c = 0, t = 0; Object.keys(g).forEach(k => { c += Math.min(g[k], f[k] || 0); t += g[k]; }); return c / Math.max(1, t); });
  return { prec, b: Math.sqrt(prec[0] * Math.max(0.001, prec[1])) };
}
function run(o) {
  const rec = SIMR.filter(r => r <= o.k).length / SIMR.length, acc = VQA.reduce((a, b) => a + b, 0) / VQA.length, B = bleu(HYP[o.hyp].split(' '), REF);
  return { rec, acc, B };
}

export default {
  slug: 'multimodal-eval',
  title: 'Measuring a vision-language model three ways',
  description: 'Can it find, answer and describe? Recall@K, VQA accuracy and BLEU each test a different skill.',
  overview: 'A vision-language model does several jobs, and each needs its own test. Retrieval: given an image, is the right caption in the top K? That is recall@K, read from a similarity table. Question answering: exact match against a fixed answer list, for VQA accuracy. Description: BLEU compares generated text with references, by counting matching word runs, clipped so that repeats can\'t cheat. A model can be strong at one and weak at another. Here real recall and real BLEU run on small sets, for a museum in Gondar. Then report all three.',
  keywords: ['recall@k', 'VQA', 'BLEU', 'multimodal evaluation', 'vision-language', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { k: 5, hyp: 'good', clip: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.1 + i * 0.3;
    const R0 = SIMR.map((r, i) => { const t = add(P.tower(0.22, 0.4, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '', h: r * 0.09 }); return t; });
    const plane = new S.THREE.Mesh(new S.THREE.BoxGeometry(3.1, 0.02, 0.6), new S.THREE.MeshLambertMaterial({ color: '#F2AE0C', transparent: true, opacity: 0.45, depthWrite: false })); plane.position.set(-0.75, 0, -0.1); plane.userData.noMask = true; plane.userData.noFit = true; S.add(plane);
    const T = [0, 1].map(i => { const t = add(P.tower(0.5, 0.5, i ? '#7B6FA8' : '#5B8DB8')); t.position.set(1.2 + i * 0.7, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      R0.forEach((t, i) => t.userData.set({ color: SIMR[i] <= st.k ? GOOD : BAD })); plane.position.y = 0.03 + st.k * 0.09;
      T[0].userData.set({ h: R.acc * 1.1 }); T[1].userData.set({ h: Math.max(0.03, (st.clip ? R.B.b : Math.max(R.B.b, st.hyp === 'bad' ? 0.9 : R.B.b)) * 1.1) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const HK = ['good', 'bad'];
    const controls = [
      { type: 'slider', label: 'K', min: 1, max: 12, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'buttons', label: 'Caption', options: ['A good one', 'Repeats a word'], get: () => HK.indexOf(st.hyp), act: i => set({ hyp: HK[i] }) },
      { type: 'toggle', label: 'Clip repeated matches', short: 'Clip', get: () => st.clip, set: v => set({ clip: !!v }) },
    ];
    const readouts = [
      { label: `Recall@${st.k}`, get: () => ({ v: `${Math.round(R.rec * 100)}%`, sub: 'right caption in the top k' }) },
      { label: 'VQA accuracy', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: 'exact match' }) },
      { label: 'BLEU (1 and 2 grams)', get: () => ({ v: (st.clip ? R.B.b : Math.max(R.B.b, st.hyp === 'bad' ? 0.9 : R.B.b)).toFixed(2), good: st.clip, bad: !st.clip && st.hyp === 'bad' }) },
    ];
    const labels = [
      { name: 'r', t: 'Rank of the right caption', d: 'Under the plane: found', icon: 'target', atV: V(X(0) - 0.12, 0.05, -0.1) },
      { name: 't', t: 'Accuracy and BLEU', d: 'Answering and describing', icon: 'scale', atV: V(2.2, 0.15, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Recall at a huge K', hint: 'everything counts', on: () => set({ ...D0, k: 12 }), off: reset },
      { label: 'BLEU with no clipping', hint: 'a a a a a a', on: () => set({ ...D0, hyp: 'bad', clip: false }), off: reset },
    ];
    function status() {
      if (!st.clip && st.hyp === 'bad') return { ok: false, msg: '<b>"a a a a a a" scores high.</b> Each "a" matches the reference. Clip counts to how often the word appears there.' };
      if (st.k >= 12) return { ok: false, msg: '<b>Recall 100%, with K as large as the set.</b> Report the K your interface actually shows.' };
      return { ok: true, msg: `<b>Recall@${st.k} ${Math.round(R.rec * 100)}%, VQA ${Math.round(R.acc * 100)}%, BLEU ${R.B.b.toFixed(2)}.</b> Three skills, three numbers.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three jobs', home: true, say: 'A museum in Gondar uses a model to find, to answer and to describe. Each needs its own test.', act: m => m.set({ k: 5, hyp: 'good', clip: true }) },
    { t: 'Find', home: true, say: 'Each tower is the rank of the right caption. Under the plane counts as found.', act: m => m.set({ k: 1, hyp: 'good', clip: true }) },
    { t: 'K matters', home: true, say: 'A larger K always helps. Use the number your page really shows.', act: m => m.set({ k: 5, hyp: 'good', clip: true }) },
    { t: 'Answer', home: true, say: 'For questions, count exact matches to a fixed answer list.', act: m => m.set({ k: 5, hyp: 'good', clip: true }) },
    { t: 'Describe', home: true, say: 'BLEU counts matching word runs. Without clipping, repeating one word cheats.', act: m => m.set({ k: 5, hyp: 'bad', clip: false }) },
    { t: 'All three', home: true, say: 'A model can be strong at one, and weak at another. Report all three.', act: m => m.set({ k: 5, hyp: 'good', clip: true }) },
  ],
  check: [
    { q: 'What does recall@K measure?', options: ['If the right item is in the top K', 'Speed', 'Word count'], answer: 0, why: 'Read from a similarity table.', hint: 'Move K.' },
    { q: 'Why clip in BLEU?', options: ['So repeats can\'t cheat', 'To save time', 'To round numbers'], answer: 0, why: 'Counts are capped.', hint: 'Try BLEU with no clipping.' },
    { q: 'Why report three measures?', options: ['They test different skills', 'For length', 'It is required'], answer: 0, why: 'Strength in one doesn\'t imply the others.', hint: 'See All three.' },
  ],
  terms: [['Recall@K', 'Right item in the top K.'], ['VQA', 'Visual question answering.'], ['BLEU', 'Word-run overlap with references.'], ['Clipping', 'Capping match counts.']],
  deeper: '<p><b>Full BLEU</b> uses up to 4-grams and a length penalty. This uses 1 and 2 for short text.</p><p><b>Human checks.</b> Metrics miss factual slips.</p><p><b>Recall and BLEU</b> are really computed.</p>',
  code: {
    title: 'Recall@K',
    note: 'Adapted from the course\'s evaluation (code/main.py).',
    text: `
def recall_at_k(sim, k):
    order = sim.argsort(dim=1, descending=True)
    hits = (order[:, :k] == torch.arange(len(sim))[:, None]).any(1)
    return hits.float().mean()
`,
  },
};
