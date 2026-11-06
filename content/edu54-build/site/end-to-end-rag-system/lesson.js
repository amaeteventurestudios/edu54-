// End-to-end RAG (phase 19, lesson 69): chunker, hybrid retriever, rewriter, reranker, cited generator with a refuse-on-low-confidence rule, all joined and scored with lesson 68's numbers for a Nairobi pharmacy-board helpline. Each stage removed lowers a stated score.
const ST = ['Chunker', 'Hybrid', 'Rewrite', 'Rerank', 'Generate', 'Refuse'];
const GAIN = [0.08, 0.12, 0.05, 0.1, 0.05, 0.1];
function run(o) { const s = GAIN.reduce((a, g, i) => a + (o.on[i] ? g : 0), 0.45); const off = ST.filter((x, i) => !o.on[i]); return { s, off, ok: !off.length, wrong: o.on[5] ? 0 : 4 }; }

export default {
  slug: 'end-to-end-rag-system',
  title: 'The whole RAG system, scored',
  description: 'Six stages join into one pipeline, measured from end to end. See what each stage is worth on the same test.',
  overview: 'This closes the retrieval series. Chunk well, retrieve with both keywords and vectors, rewrite the query, rerank the shortlist, generate an answer that cites chunks, and refuse when confidence is low. Then score the whole pipeline with the same fixed test set, so that each stage shows its worth. Most gains come from the unglamorous parts. Measuring one stage at a time stops you crediting the wrong one. Here six stages run for a helpline at a pharmacy board in Nairobi, and you can take any one out.',
  keywords: ['RAG', 'pipeline', 'evaluation', 'hybrid search', 'citations', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { on: [1, 1, 1, 1, 1, 1] }, st = { on: [...D0.on] };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.6;
    const Sx = ST.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.46, 0.34, 0.6, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, 0.1); S.add(b); return m; });
    const rail = P.box(3.5, 0.03, 0.08, '#6B6E7E', { r: 0.01 }); rail.position.set(-0.5, 0.42, 0.1); S.add(rail);
    const T = add(P.tower(0.6, 0.6, GOOD)); T.position.set(1.9, 0.03, 0); T.userData.set({ cap: '' });
    const dot = P.ball(0.09, SAF); dot.userData.noFit = true; S.add(dot);
    S.add(P.keep(-2.4, 2.4, 1.15, -0.72, 0.72));
    let R = null, u = 0;
    function draw() { R = run(st); Sx.forEach((m, i) => m.color.set(st.on[i] ? GOOD : GREY)); T.userData.set({ h: R.s * 1.15, color: R.s > 0.85 ? GOOD : R.s > 0.7 ? SAF : BAD }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = ST.map((s, i) => ({ type: 'toggle', label: s, short: s, quick: i < 3 ? undefined : false, get: () => !!st.on[i], set: v => { st.on[i] = v ? 1 : 0; draw(); } }));
    const readouts = [
      { label: 'End-to-end score', get: () => ({ v: `${Math.round(R.s * 100)}%`, good: R.s > 0.85, bad: R.s < 0.7 }) },
      { label: 'Stages on', get: () => ({ v: `${6 - R.off.length} of 6`, sub: R.off[0] ?? 'all' }) },
      { label: 'Wrong answers given', get: () => ({ v: `${R.wrong}`, sub: 'should refuse', good: !R.wrong, bad: R.wrong > 0 }) },
    ];
    const labels = [
      { name: 's', t: 'Six stages', d: 'One pipeline', icon: 'link', atV: V(X(0) - 0.25, 0.2, 0.1) },
      { name: 't', t: 'Score', d: 'On one fixed test', icon: 'target', atV: V(2.25, 0.2, 0) },
    ];
    const reset = () => { st.on = [...D0.on]; draw(); };
    const off = i => { const a = [...D0.on]; a[i] = 0; return () => set({ on: a }); };
    const breaks = [
      { label: 'Remove hybrid search', hint: 'vectors only', on: off(1), off: reset },
      { label: 'Remove the reranker', hint: 'buried answers', on: off(3), off: reset },
      { label: 'Remove the refusal', hint: 'always answers', on: off(5), off: reset },
    ];
    function status() {
      if (!st.on[5]) return { ok: false, msg: `<b>${R.wrong} wrong answers about medicines.</b> When nothing fits, it should say so and hand over.` };
      if (R.off.length) return { ok: false, msg: `<b>${Math.round(R.s * 100)}% without ${R.off[0].toLowerCase()}.</b> Removing one stage at a time shows what each is worth.` };
      return { ok: true, msg: `<b>${Math.round(R.s * 100)}% end to end.</b> Most gains came from search, not from the model.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4) % 1; dot.position.set(X(0) + 3.0 * u, 0.56, 0.1); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'All six', home: true, say: 'A pharmacy board helpline in Nairobi joins every stage into one pipeline.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1] }) },
    { t: 'Search', home: true, say: 'Remove hybrid search, and the score falls hard.', act: m => m.set({ on: [1, 0, 1, 1, 1, 1] }) },
    { t: 'Rerank', home: true, say: 'Remove the reranker, and right answers sink.', act: m => m.set({ on: [1, 1, 1, 0, 1, 1] }) },
    { t: 'Refuse', home: true, say: 'Remove the refusal, and it guesses about medicines.', act: m => m.set({ on: [1, 1, 1, 1, 1, 0] }) },
    { t: 'One test', home: true, say: 'The same test set each time shows what each stage is worth.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1] }) },
    { t: 'Search first', home: true, say: 'Most of the gain came from search, not the model.', act: m => m.set({ on: [1, 1, 1, 1, 1, 1] }) },
  ],
  check: [
    { q: 'Why remove one stage at a time?', options: ['To see what each is worth', 'To save money only', 'To shorten code'], answer: 0, why: 'Otherwise you credit the wrong part.', hint: 'See One test.' },
    { q: 'What should it do on low confidence?', options: ['Refuse and hand over', 'Guess', 'Retry forever'], answer: 0, why: 'Especially about medicines.', hint: 'Try Remove the refusal.' },
    { q: 'Where do most gains come from?', options: ['Search', 'A bigger model', 'Longer prompts'], answer: 0, why: 'The unglamorous parts.', hint: 'See Search first.' },
  ],
  terms: [['Pipeline', 'Stages in order.'], ['Ablation', 'Removing a part to test it.'], ['Refusal', 'Not answering on low confidence.'], ['End-to-end score', 'Quality of the whole system.']],
  deeper: '<p><b>Series.</b> Each stage has its own lesson.</p><p><b>Scores</b> here are round illustrative gains.</p>',
  code: {
    title: 'Pipeline',
    note: 'Adapted from the course\'s pipeline (code/main.py).',
    text: `
def answer(question):
    hits = rerank(question, hybrid(rewrite(question)))
    if hits[0].score < MIN_CONFIDENCE:
        return "I can't confirm that. Passing you to a pharmacist."
    return generate(question, hits, cite=True)
`,
  },
};
