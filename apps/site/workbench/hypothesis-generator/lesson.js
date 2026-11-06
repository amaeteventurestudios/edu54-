// Hypothesis generator (phase 19, lesson 50): a Cape Town research agent drafts ideas. Temperature rises each pass, near-duplicates are removed by a similarity threshold, survivors are ranked by novelty, specificity and feasibility. Twenty seeded ideas as blocks on a plane. Counts come from the filter below.
const IDEAS = Array.from({ length: 20 }, (_, i) => ({ x: ((i * 37) % 100) / 100, y: ((i * 61) % 100) / 100, n: ((i * 17) % 10) / 10, f: ((i * 29) % 10) / 10 }));
function run(o) {
  const pool = IDEAS.slice(0, 8 + Math.round(o.temp * 12)).map(p => ({ ...p, x: p.x * (0.4 + o.temp * 0.6) }));
  const keep = []; pool.forEach(p => { if (!keep.some(k => Math.hypot(k.x - p.x, k.y - p.y) < o.dist)) keep.push(p); });
  const score = p => o.w * p.n + (1 - o.w) * p.f, top = keep.slice().sort((a, b) => score(b) - score(a))[0];
  return { pool, keep, top, topN: top?.n ?? 0, topF: top?.f ?? 0, dropped: pool.length - keep.length };
}

export default {
  slug: 'hypothesis-generator',
  title: 'A hypothesis generator: many ideas, few worth testing',
  description: 'Sample, drift, remove repeats, rank. Good ideas take more than a model that writes well.',
  overview: 'The research loop starts with ideas, and models produce plenty of similar ones. A hypothesis generator makes that useful. Draw from a sampler, raising the temperature on each pass so that later drafts drift further. Make each a typed record, not free text. Filter near-duplicates with embeddings and a distance threshold. Then rank by a mix of novelty, specificity and feasibility. Ranking on novelty alone favours things that can\'t be tested. Ranking on feasibility alone repeats what\'s known. This lesson samples, filters and ranks twenty ideas for a crop research lab in Cape Town.',
  keywords: ['hypothesis generation', 'research agent', 'temperature', 'deduplication', 'ranking', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.9, 1.1], half: 1.05, wide: 4.8 },

  build(S) {
    const { V, P } = S;
    const D0 = { temp: 0.6, dist: 0.12, w: 0.5 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4.4, 0.03, 2.6, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const PX = v => -2.0 + v * 3.6, PZ = v => -1.1 + v * 2.2;
    const B = IDEAS.map(() => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.18, 0.2, 0.18, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    S.add(P.keep(-2.2, 2.2, 0.7, -1.3, 1.3));
    let R = null;
    function draw() {
      R = run(st);
      B.forEach(({ b }) => b.visible = false);
      R.pool.forEach((p, i) => { const C = B[i], kept = R.keep.includes(p), top = p === R.top; C.b.visible = true; C.b.position.set(PX(p.x), 0.03, PZ(p.y)); C.b.scale.y = top ? 3 : kept ? 1.4 : 0.5; C.m.color.set(top ? SAF : kept ? GOOD : GREY); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Temperature', min: 0, max: 1, step: 0.05, get: () => st.temp, set: v => set({ temp: v }) },
      { type: 'slider', label: 'Distance to count as new', min: 0, max: 0.4, step: 0.02, get: () => st.dist, set: v => set({ dist: v }) },
      { type: 'slider', label: 'Novelty against feasibility', min: 0, max: 1, step: 0.1, get: () => st.w, set: v => set({ w: v }) },
    ];
    const readouts = [
      { label: 'Ideas drafted', get: () => ({ v: `${R.pool.length}`, sub: `${R.dropped} near-copies dropped` }) },
      { label: 'Kept', get: () => ({ v: `${R.keep.length}`, good: R.keep.length >= 5, bad: R.keep.length < 3 }) },
      { label: 'Top idea', get: () => ({ v: `novelty ${R.topN.toFixed(1)}`, sub: `feasibility ${R.topF.toFixed(1)}`, good: R.topN > 0.4 && R.topF > 0.4, bad: R.topN < 0.2 || R.topF < 0.2 }) },
    ];
    const labels = [
      { name: 'p', t: 'A space of ideas', d: 'Close means similar', icon: 'target', atV: V(-2.1, 0.03, 0) },
      { name: 't', t: 'Teal kept, gold top', d: 'Short grey: near-copies', icon: 'check', atV: V(2.15, 0.03, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Low temperature', hint: 'the same idea, reworded', on: () => set({ ...D0, temp: 0 }), off: reset },
      { label: 'Rank by novelty only', hint: 'untestable', on: () => set({ ...D0, w: 1 }), off: reset },
      { label: 'No duplicate filter', hint: 'repeats go on', on: () => set({ ...D0, dist: 0 }), off: reset },
    ];
    function status() {
      if (st.temp < 0.1) return { ok: false, msg: `<b>${R.pool.length} ideas, packed together.</b> A cold sampler rewords the same thought.` };
      if (st.dist === 0) return { ok: false, msg: `<b>All ${R.pool.length} went on, repeats included.</b> You pay for each experiment, so repeats are costly.` };
      if (st.w >= 0.9) return { ok: false, msg: `<b>The top idea scores ${R.topF.toFixed(1)} for feasibility.</b> Novelty alone favours what can\'t be tested.` };
      if (st.w <= 0.1) return { ok: false, msg: `<b>The top idea has novelty ${R.topN.toFixed(1)}.</b> Feasibility alone repeats what is known.` };
      return { ok: true, msg: `<b>${R.keep.length} ideas kept, and the top balances novelty ${R.topN.toFixed(1)} with feasibility ${R.topF.toFixed(1)}.</b> Each is a typed record.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A cold start', home: true, say: 'A crop lab in Cape Town asks a model for ideas. At low temperature, it rewords one thought.', act: m => m.set({ temp: 0, dist: 0.12, w: 0.5 }) },
    { t: 'Turn it up', home: true, say: 'Raise the temperature on each pass, and ideas spread out.', act: m => m.set({ temp: 0.7, dist: 0, w: 0.5 }) },
    { t: 'Remove repeats', home: true, say: 'Embed each idea, and drop those too close to one already kept.', act: m => m.set({ temp: 0.7, dist: 0.14, w: 0.5 }) },
    { t: 'Rank', home: true, say: 'Score what remains: novel, specific, and possible to test.', act: m => m.set({ temp: 0.7, dist: 0.14, w: 0.5 }) },
    { t: 'Only novel', home: true, say: 'Rank by novelty alone, and the top idea can\'t be tested.', act: m => m.set({ temp: 0.7, dist: 0.14, w: 1 }) },
    { t: 'To the bench', home: true, say: 'A few balanced ideas go on to the next stage, as typed records.', act: m => m.set({ temp: 0.7, dist: 0.14, w: 0.5 }) },
  ],
  check: [
    { q: 'Why raise the temperature each pass?', options: ['Later drafts drift further', 'To save cost', 'To check spelling'], answer: 0, why: 'Cold samplers repeat.', hint: 'Try Low temperature.' },
    { q: 'How are near-duplicates found?', options: ['Embedding distance', 'File size', 'Word count'], answer: 0, why: 'Close means similar.', hint: 'Try No duplicate filter.' },
    { q: 'Why not rank by novelty alone?', options: ['It favours what can\'t be tested', 'Novelty is cheap', 'It takes longer'], answer: 0, why: 'Balance it with feasibility.', hint: 'Try Rank by novelty only.' },
  ],
  terms: [['Hypothesis record', 'A typed idea to test.'], ['Temperature ramp', 'Rising randomness per pass.'], ['Novelty', 'How far from what is known.'], ['Feasibility', 'If it can be tested.']],
  deeper: '<p><b>Read first.</b> The next lesson checks ideas against the literature.</p><p><b>Budget.</b> Rank to fit how many experiments you can afford.</p><p><b>Ideas</b> here are points with seeded scores.</p>',
  code: {
    title: 'Generate and filter',
    note: 'Adapted from the course\'s generator (code/main.py).',
    text: `
def generate(seed, passes=4):
    kept = []
    for i in range(passes):
        for idea in sample(seed, temperature=0.4 + i * 0.2):
            if all(cosine(embed(idea), embed(k)) < 0.9 for k in kept):
                kept.append(idea)
    return sorted(kept, key=score, reverse=True)
`,
  },
};
