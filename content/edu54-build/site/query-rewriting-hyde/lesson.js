// Query rewriting and HyDE (phase 19, lesson 67): a short question sits far from its passage in vector space. A rewrite moves it nearer; HyDE writes a pretend answer and embeds that. Points on a plane for a Kigali tax helpline; distance to the target is computed. A wrong pretend answer drifts away.
const TGT = [1.2, 0.5], Q0 = [-1.3, -0.6];
function run(o) {
  const q = o.m === 'none' ? Q0 : o.m === 'rw' ? [0, -0.1] : o.m === 'hyde' ? (o.wrong ? [-0.9, 1.0] : [0.95, 0.35]) : [0.6, 0.15];
  const d = Math.hypot(q[0] - TGT[0], q[1] - TGT[1]);
  return { q, d, hit: d < 1, calls: o.m === 'none' ? 0 : o.m === 'multi' ? 2 : 1 };
}

export default {
  slug: 'query-rewriting-hyde',
  title: 'Query rewriting and HyDE: ask in the document\'s words',
  description: 'A short question sits far from its answer. Rewrite it, or write a pretend answer and search with that.',
  overview: 'People ask in few words. Documents answer in many, and in other words. In vector space, the two can sit far apart. Rewriting uses a small model call to expand the question with likely terms. HyDE goes further: it writes a hypothetical answer, then embeds that, as an answer looks more like an answer. It can be wrong and still help, as long as it sounds right. But if it heads off in the wrong direction, so does your search, so keep the original too. This lesson moves a query across a plane for a tax helpline in Kigali.',
  keywords: ['query rewriting', 'HyDE', 'RAG', 'retrieval', 'embeddings', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.02, 1.2, 0.7], half: 1.05, wide: 4.6 },

  build(S) {
    const { V, P } = S;
    const D0 = { m: 'hyde', wrong: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4, 0.03, 2.8, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const tg = P.box(0.34, 0.5, 0.34, GOOD, { r: 0.04 }); tg.position.set(TGT[0], 0.03, -TGT[1]); S.add(tg);
    const ring = P.cyl(1, 0.02, '#BFD8D2'); ring.position.set(TGT[0], 0.02, -TGT[1]); S.add(ring);
    [[-1.2, 0.8], [0.2, 1.0], [-0.6, -1.0], [1.3, -0.8], [0.3, -0.5]].forEach(([x, z]) => { const d = P.box(0.2, 0.14, 0.2, GREY, { r: 0.03 }); d.position.set(x, 0.03, z); S.add(d); });
    const q = add(P.robot(SAF, { scale: 0.4 })); q.userData.noFit = true;
    const line = P.rod(V(0, 0.1, 0), V(1, 0.1, 0), 0.02, SAF); line.userData.noFit = true; S.add(line);
    S.add(P.keep(-1.9, 1.9, 0.6, -1.3, 1.3));
    let R = null, x = Q0[0], z = -Q0[1];
    function draw() { R = run(st); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['none', 'rw', 'hyde', 'multi'];
    const controls = [
      { type: 'buttons', label: 'Search with', options: ['The question', 'A rewrite', 'A pretend answer', 'Both'], get: () => MK.indexOf(st.m), act: i => set({ m: MK[i] }) },
      { type: 'toggle', label: 'The pretend answer is off topic', short: 'Off topic', get: () => st.wrong, set: v => set({ wrong: !!v }) },
    ];
    const readouts = [
      { label: 'Distance to the passage', get: () => ({ v: R.d.toFixed(2), sub: 'inside the ring is a hit', good: R.hit, bad: !R.hit }) },
      { label: 'Extra model calls', get: () => ({ v: `${R.calls}` }) },
      { label: 'Found', get: () => ({ v: R.hit ? 'yes' : 'no', good: R.hit, bad: !R.hit }) },
    ];
    const labels = [
      { name: 'p', t: 'The right passage', d: 'Ring: close enough to retrieve', icon: 'target', atV: V(1.9, 0.1, -0.5) },
      { name: 'q', t: 'Other documents', d: 'Grey: not what we want', icon: 'box', atV: V(-1.3, 0.15, 0.8) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Search as asked', hint: 'three words', on: () => set({ ...D0, m: 'none' }), off: reset },
      { label: 'A pretend answer off topic', hint: 'wrong direction', on: () => set({ ...D0, wrong: true }), off: reset },
    ];
    function status() {
      if (st.m === 'none') return { ok: false, msg: `<b>Distance ${R.d.toFixed(2)}.</b> "VAT refund when?" shares little with a passage on filing periods.` };
      if (st.wrong && st.m === 'hyde') return { ok: false, msg: `<b>Distance ${R.d.toFixed(2)}: the pretend answer went off topic, and search followed.</b> Search with the original too.` };
      return { ok: R.hit, msg: `<b>Distance ${R.d.toFixed(2)}, for ${R.calls} extra call.</b> ${st.m === 'hyde' ? 'A pretend answer sits near real ones, even if its facts are wrong.' : 'The query moved towards the document\'s words.'}` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); x += (R.q[0] - x) * Math.min(1, dt * 4); z += (-R.q[1] - z) * Math.min(1, dt * 4); q.position.set(x, 0.03, z); q.userData.set({ busy: true }); P.setRod(line, V(x, 0.1, z), V(TGT[0], 0.1, -TGT[1])); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Far apart', home: true, say: 'A tax helpline in Kigali gets three-word questions. The answer sits far away in vector space.', act: m => m.set({ m: 'none', wrong: false }) },
    { t: 'Rewrite', home: true, say: 'A small model call adds likely terms, and the query moves nearer.', act: m => m.set({ m: 'rw', wrong: false }) },
    { t: 'HyDE', home: true, say: 'Write a pretend answer, and embed that. Answers look like answers.', act: m => m.set({ m: 'hyde', wrong: false }) },
    { t: 'Wrong facts are fine', home: true, say: 'It doesn\'t have to be true, as you only use it to search.', act: m => m.set({ m: 'hyde', wrong: false }) },
    { t: 'Off topic isn\'t', home: true, say: 'If it heads the wrong way, search follows.', act: m => m.set({ m: 'hyde', wrong: true }) },
    { t: 'Both', home: true, say: 'Search with the original and the rewrite together.', act: m => m.set({ m: 'multi', wrong: false }) },
  ],
  check: [
    { q: 'What does HyDE embed?', options: ['A hypothetical answer', 'The question only', 'The whole corpus'], answer: 0, why: 'Answers look like answers.', hint: 'See HyDE.' },
    { q: 'Is the pretend answer shown to users?', options: ['No, it is only for search', 'Yes', 'Sometimes'], answer: 0, why: 'Its facts may be wrong.', hint: 'See Wrong facts are fine.' },
    { q: 'What guards against a bad rewrite?', options: ['Searching with the original too', 'A longer prompt', 'Nothing'], answer: 0, why: 'Keep a fallback.', hint: 'Try A pretend answer off topic.' },
  ],
  terms: [['Query rewriting', 'Expanding a question.'], ['HyDE', 'Searching with a hypothetical answer.'], ['Vocabulary gap', 'Same idea, different words.'], ['Multi-query', 'Searching several forms.']],
  deeper: '<p><b>Cost.</b> Each rewrite is a call and some delay.</p><p><b>Translate.</b> A rewrite can bridge languages too.</p><p><b>Points</b> are illustrative positions.</p>',
  code: {
    title: 'HyDE',
    note: 'Adapted from the course\'s rewriter (code/main.py).',
    text: `
def hyde_search(question, k=5):
    pretend = small_model(f"Write a short passage answering: {question}")
    hits = index.top(embed(pretend), k) + index.top(embed(question), k)
    return dedupe(hits)
`,
  },
};
