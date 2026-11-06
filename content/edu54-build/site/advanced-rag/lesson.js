// Advanced RAG: a university in Accra answers student questions from its handbook. The 2026 edition sits beside the old 2023 one, almost word for word.
// The meaning map has two numbers per chunk so it can be drawn: 12 topics, 2 sections each, 4 paragraphs a section; each 2026 paragraph has a 2023 twin a hair away.
// Questions live in "question space": the paragraph they need plus a fixed shift (questions are worded unlike answers) plus vagueness (sd 0.28 as asked, 0.09 rewritten).
// HyDE searches with a made-up answer: the paragraph plus sd 0.06, but 12% of guesses land on the wrong topic. Same token budget each way: 8 paragraphs, or 2 sections
// (a whole section's vector is the mean of its paragraphs plus blur, sd 0.14, because it mixes subjects), or the 8 best paragraphs' first 2 sections.
// Half the questions also need the paragraph two places along in the same section. 48 test questions, fixed random numbers.
let seed = 21; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const NT = 12, NPAR = 2, NCH = 4, NQ = 48, DQ = [0.2, 0.16], CS = 0.12, VA = 0.28, RW = 0.09, BL = 0.14;
const TOPICS = [
  ['Resits', 'What was that thing about doing a paper again?', 'Resit exams: who can sit one and when', 'A student who fails a paper may resit it in the next exam period, after registering for the resit.'],
  ['Registration', 'How do I get my courses sorted?', 'Course registration steps and deadline', 'Students register for courses on the portal in the first two weeks of each semester.'],
  ['Hostels', 'Where do I stay this year?', 'Hostel room allocation for continuing students', 'Rooms are allocated by ballot; continuing students apply on the portal before the semester begins.'],
  ['Library', 'Can I keep the books longer?', 'Library loan period and renewals', 'Books may be borrowed for two weeks and renewed twice unless another student has reserved them.'],
  ['Exam timetable', 'When is everything happening?', 'End-of-semester exam timetable release', 'The exam timetable is published four weeks before exams; clashes must be reported within a week.'],
  ['Changing course', 'Can I switch to something else?', 'Changing programme after the first year', 'Students may change programme after first year if they meet the entry grades of the new programme.'],
  ['Deferral', 'Can I take a break?', 'Deferring a year of study', 'A student may defer for up to one year with the approval of the faculty, applied for before the semester.'],
  ['Transcripts', 'How do I get my results on paper?', 'Requesting an official transcript', 'Official transcripts are requested from the registry and are ready within ten working days.'],
  ['Graduation', 'What do I need to finish?', 'Graduation requirements and clearance', 'To graduate, a student must pass all required credits and complete clearance with every department.'],
  ['Scholarships', 'Is there help for students like me?', 'Scholarship applications and eligibility', 'Scholarship applications open each March; eligibility depends on results and need.'],
  ['Attendance', 'Do I have to go to everything?', 'Lecture attendance requirement', 'Students must attend at least three quarters of lectures to sit the exam for a course.'],
  ['Appeals', 'My mark seems wrong, what now?', 'Appealing an exam result', 'A student may appeal a result within two weeks of its release by writing to the exams office.'],
];
const TC = Array.from({ length: NT }, (_, i) => [-0.8 + (i % 4) * 0.53 + g() * 0.06, -0.75 + Math.floor(i / 4) * 0.72 + g() * 0.06]);
const CH = [];
TC.forEach((c, t) => { for (let p = 0; p < NPAR; p++) { const pc = [c[0] + g() * 0.09, c[1] + g() * 0.09]; for (let k = 0; k < NCH; k++) { const v = [pc[0] + g() * CS, pc[1] + g() * CS]; CH.push({ t, p: t * NPAR + p, v, old: false }); CH.push({ t, p: t * NPAR + p, v: [v[0] + g() * 0.03, v[1] + g() * 0.03], old: true, twin: CH.length - 1 }); } } });
const PARS = [];
for (let p = 0; p < NT * NPAR; p++) for (const old of [false, true]) { const m = CH.filter(c => c.p === p && c.old === old), b = [g() * BL, g() * BL]; PARS.push({ p, old, v: [m.reduce((a, c) => a + c.v[0], 0) / m.length + b[0], m.reduce((a, c) => a + c.v[1], 0) / m.length + b[1]] }); }
const NEW = CH.map((c, i) => i).filter(i => !CH[i].old);
const QD = Array.from({ length: NQ }, () => { const tgt = NEW[Math.floor(rnd() * NEW.length)]; return { tgt, sib: rnd() < 0.5, n: [g(), g()], h: [g(), g()], wrong: rnd() < 0.12, wt: Math.floor(rnd() * NT) }; });
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const MODES = ['As asked', 'Rewritten', 'Made-up answer (HyDE)'], CHUNKS = ['Paragraphs', 'Whole sections', 'Paragraphs, then their section'];
function ask(st, Q) {
  const T = CH[Q.tgt].v, P = CH[Q.tgt].p, asked = [T[0] + DQ[0] + Q.n[0] * VA, T[1] + DQ[1] + Q.n[1] * VA];
  let s;
  if (st.mode === 0) s = asked;
  else if (st.mode === 1) s = [T[0] + DQ[0] + Q.n[0] * RW, T[1] + DQ[1] + Q.n[1] * RW];
  else { const b = Q.wrong ? TC[Q.wt === CH[Q.tgt].t ? (Q.wt + 1) % NT : Q.wt] : T; s = [b[0] + Q.h[0] * 0.06, b[1] + Q.h[1] * 0.06]; }
  let ctx = [], kids = [];
  if (st.chunk === 1) ctx = PARS.filter(x => !st.filter || !x.old).map(x => [d2(s, x.v), x]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(([, x]) => ({ p: x.p, old: x.old, whole: true, v: x.v }));
  else {
    kids = CH.map((c, i) => [d2(s, c.v), i]).filter(([, i]) => !st.filter || !CH[i].old).sort((a, b) => a[0] - b[0]).slice(0, 8).map(x => x[1]);
    if (st.chunk === 0) ctx = kids.map(i => ({ p: CH[i].p, old: CH[i].old, whole: false, i }));
    else { for (const i of kids) { if (!ctx.find(z => z.p === CH[i].p && z.old === CH[i].old)) ctx.push({ p: CH[i].p, old: CH[i].old, whole: true }); if (ctx.length === 2) break; } }
  }
  const has = c => c.whole ? c.p === P : c.i === Q.tgt, hasOld = c => c.whole ? c.p === P : CH[c.i].twin === Q.tgt;
  const ri = ctx.findIndex(c => !c.old && has(c)), ti = ctx.findIndex(c => c.old && hasOld(c));
  const nb = CH.findIndex((c, i) => i !== Q.tgt && !c.old && c.p === P && Math.abs(i - Q.tgt) === 2);
  let out = 'right';
  if (ri < 0 && ti < 0) out = 'miss';
  else if (ti >= 0 && (ri < 0 || ti < ri)) out = 'old';
  else if (Q.sib && st.chunk === 0 && !ctx.some(c => c.i === nb)) out = 'part';
  return { asked, s, ctx, kids, out, nb: Q.sib ? nb : -1 };
}
function run(st) {
  const all = QD.map(Q => ask(st, Q)), n = k => all.filter(a => a.out === k).length;
  return { all, right: n('right') / NQ, miss: n('miss'), old: n('old'), part: n('part'), calls: st.mode ? 2 : 1 };
}

export default {
  slug: 'advanced-rag',
  title: 'Advanced RAG: fix the question, filter, widen',
  description: 'A university answers students from its handbook, with last year\'s edition beside it. Rewrite the question, filter the edition, and hand over whole sections.',
  overview: 'Basic RAG embeds the question, finds the nearest chunks and hands them to the model. Three things go wrong in practice. Questions are worded unlike answers, and people ask vaguely ("what was that thing about doing a paper again?"), so the question\'s vector lands away from the paragraph it needs. Rewriting the question into a search query helps; HyDE goes further and has the model write a made-up answer first, then searches with that, because a made-up answer is worded like the real one even when its details are wrong. Second, collections hold near-duplicates: last year\'s rules sit beside this year\'s, almost word for word, and similarity can\'t tell them apart, so filter on metadata such as edition or date before searching. Third, chunk size pulls two ways: small chunks match precisely but leave out the next sentence the answer needs; big chunks keep the context but their vectors blur several subjects together. Parent-child chunking does both: search small paragraphs, then hand the model the whole section each one came from. Measure each change on a fixed set of test questions: did the right passage come back, and was the answer right.',
  keywords: ['advanced RAG', 'HyDE', 'query rewriting', 'metadata filtering', 'parent-child chunking', 'retrieval augmented generation', 'RAG evaluation'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0.1], dir: [0.4, 0.85, 1.3], half: 1.95, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 2, filter: true, chunk: 2 }, st = { ...D0 };
    const CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B', PUR = '#7B6FA8';
    /* the handbook as a meaning map: a peg per paragraph (2023 twins in grey); handed-over pegs rise in gold */
    const MX = -0.55, MZ = 0.02, SC = 1.25;
    const at = (v, y = 0.135) => V(MX + v[0] * SC, y - 0.1, MZ + v[1] * SC);
    const pad = P.box(3.0, 0.06, 2.75, '#F6F1E6', { r: 0.06 }); pad.position.set(MX + 0.1, 0, MZ + 0.08); S.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const dots = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), CH.length + PARS.length); dots.frustumCulled = false; dots.castShadow = true; S.add(dots);
    const MK = 60, mk = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MK); mk.frustumCulled = false; mk.userData.noFit = true; S.add(mk);
    const arrow = P.box(1, 0.03, 0.03, PUR, { r: 0 }); arrow.userData.noFit = true; S.add(arrow);
    const model = P.robot('#2C2D31', { scale: 1.6 }); model.position.set(2.55, 0, -0.75); model.rotation.y = -0.9; S.add(model); model.userData.set({ busy: true });
    /* 48 test questions: right, missed the page, answered from 2023, half right */
    const T4 = [GOOD, RED, '#8E91A3', SAF].map((c, i) => { const t = P.tower(0.4, 0.4, c, { size: 0.24 }); t.position.set(1.75 + (i % 2) * 0.55, 0, 0.05 + Math.floor(i / 2) * 0.62); S.add(t); return t; });
    S.add(P.keep(-2.1, 2.6, 1.7, -1.3, 1.45));
    let R = null, qi = 0, clock = 0;
    const pct = v => `${Math.round(v * 100)}%`;
    function map() {
      const A = R.all[qi], Q = QD[qi], inCtx = new Set(), inPar = new Set();
      A.ctx.forEach(c => { if (c.whole) inPar.add(`${c.p}${c.old}`); else inCtx.add(c.i); });
      let n = 0;
      CH.forEach((c, i) => {
        const on = st.chunk !== 1, hidden = st.filter && c.old, sel = inCtx.has(i) || inPar.has(`${c.p}${c.old}`);
        dummy.position.copy(at(c.v, 0.16)); const s = on ? 0.05 : 0.03; dummy.scale.set(s, hidden ? 0.005 : sel ? 0.32 : 0.09, s); dummy.updateMatrix(); dots.setMatrixAt(n, dummy.matrix);
        dots.setColorAt(n, col.set(hidden ? '#D8D4C8' : sel ? SAF : c.old ? '#A9A497' : '#7FC8BA')); n++;
      });
      PARS.forEach(p0 => {
        const on = st.chunk === 1, hidden = st.filter && p0.old, sel = inPar.has(`${p0.p}${p0.old}`) && on;
        dummy.position.copy(at(p0.v, 0.16)); const s = on ? 0.16 : 0; dummy.scale.set(s, sel ? 0.2 : 0.04, s); dummy.updateMatrix(); dots.setMatrixAt(n, dummy.matrix);
        dots.setColorAt(n, col.set(hidden ? '#E4E1D8' : sel ? SAF : p0.old ? '#C9C6BD' : '#A8D9CF')); n++;
      });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
      let m = 0; const put = (v, s, h, c) => { dummy.position.copy(at(v, 0.16)); dummy.scale.set(s, h, s); dummy.updateMatrix(); mk.setMatrixAt(m, dummy.matrix); mk.setColorAt(m, col.set(c)); m++; };
      put(CH[Q.tgt].v, 0.075, 0.42, GOOD);
      if (A.nb >= 0) put(CH[A.nb].v, 0.065, 0.36, '#5A9E8F');
      put(A.asked, 0.07, 0.6, RED);
      if (st.mode) put(A.s, 0.07, 0.7, PUR);
      for (let j = m; j < MK; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mk.setMatrixAt(j, dummy.matrix); }
      mk.instanceMatrix.needsUpdate = true; mk.instanceColor.needsUpdate = true;
      const a0 = at(A.asked, 0.62), b0 = at(A.s, 0.72), dx = b0.x - a0.x, dz = b0.z - a0.z, len = Math.hypot(dx, dz);
      arrow.visible = !!st.mode && len > 0.02; arrow.position.set((a0.x + b0.x) / 2, 0.62, (a0.z + b0.z) / 2); arrow.rotation.set(0, -Math.atan2(dz, dx), 0); arrow.scale.set(Math.max(0.001, len), 1, 1);
    }
    const cardsText = () => {};
    function draw() {
      R = run(st);
      [R.right, R.miss / NQ, R.old / NQ, R.part / NQ].forEach((f, i) => { const n = Math.round(i ? f * NQ : f * NQ); T4[i].userData.set({ h: 0.04 + f * 1.5, cap: String(n) }); });
      cardsText(); map();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const next = () => { qi = (qi + 1) % NQ; cardsText(); map(); };
    const update = dt => { [model, ...T4].forEach(t => t.userData.tick?.(dt)); clock += dt; if (clock > 3) { clock = 0; next(); } };
    const controls = [
      { type: 'buttons', label: 'Search with', options: MODES, get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'toggle', label: 'Only the 2026 edition', short: 'Edition filter', get: () => st.filter, set: v => set({ filter: !!v }) },
      { type: 'buttons', label: 'Hand over', options: CHUNKS, get: () => st.chunk, act: i => set({ chunk: i }) },
      { type: 'button', label: 'Next question', act: next },
    ];
    const readouts = [
      { label: 'Answered right', get: () => ({ v: pct(R.right), sub: `of ${NQ} test questions`, good: R.right >= 0.85, bad: R.right < 0.6 }) },
      { label: 'From the old edition', get: () => ({ v: `${R.old}`, sub: 'answers', bad: R.old > 0, good: R.old === 0 }) },
      { label: 'Model calls', get: () => ({ v: `${R.calls}`, sub: 'per question' }) },
    ];
    const labels = [
      { name: 'map', t: 'The handbook', d: 'A peg per paragraph, grey for 2023. Pins: red the question, purple the search, green the page needed', icon: 'book', atV: V(-2.0, 0.06, 1.3) },
      { name: 'model', t: 'The model', d: 'Answers from the gold pegs handed over', icon: 'target', atV: V(2.55, 1.5, -0.75) },
      { name: 'score', t: '48 test questions', d: 'Right, missed, from 2023, half right', icon: 'check', atV: V(2.55, 0.05, 1.0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Search with the question as asked', hint: 'vague words, question-shaped', on: () => set({ ...D0, mode: 0 }), off: reset },
      { label: 'No edition filter', hint: 'last year\'s pages in the pile', on: () => set({ ...D0, filter: false }), off: reset },
      { label: 'Small paragraphs only', hint: 'no section around them', on: () => set({ ...D0, chunk: 0 }), off: reset },
    ];
    function status() {
      const good = run(D0);
      if (!st.filter && R.old) return { ok: false, msg: `<b>No edition filter: ${R.old} answers come from the 2023 handbook.</b> Last year's page says almost the same thing in almost the same words, so its vector sits a hair from this year's and often wins. Similarity can't tell editions apart; filter on the edition before searching: ${pct(good.right)} right.` };
      if (st.mode === 0) { const rw = run({ ...st, mode: 1 }); return { ok: false, msg: `<b>Searching with the question as asked: ${pct(R.right)} right, ${R.miss} missed.</b> Students ask vaguely, and questions are worded unlike the answers, so the question's point lands away from the page it needs. A rewritten search query gets ${pct(rw.right)}; a made-up answer (HyDE) lands closer still, because it is worded like the handbook.` }; }
      if (st.chunk === 0 && R.part) return { ok: false, msg: `<b>Small paragraphs only: ${R.part} answers are half right.</b> The paragraph that matched came back, but the answer also needed the one after it, which matched less well. Searching small and handing over the whole section keeps the precise match and the context around it: ${pct(run({ ...st, chunk: 2 }).right)}.` };
      if (st.chunk === 1) return { ok: false, msg: `<b>Whole sections: ${pct(R.right)} right, ${R.miss} missed.</b> A section covers several subjects, so its vector is a blur of them and lands between topics. Search with the sharp vectors of small paragraphs, then hand over their sections: ${pct(run({ ...st, chunk: 2 }).right)}.` };
      return { ok: R.right >= 0.85 ? true : undefined, msg: `<b>${pct(R.right)} of ${NQ} test questions answered right.</b> ${st.mode === 2 ? 'Searching with a made-up answer lands near the real one, at the cost of one extra model call; when the guess is on the wrong topic, it misses.' : 'The rewritten query is clearer but still worded like a question.'} ${R.miss} missed, ${R.part} half right.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Search with the question', home: true, say: 'A university in Accra answers student questions from its handbook. Searched with the student\'s own words, the question lands away from the page it needs, and many answers miss.', act: m => m.set({ mode: 0, filter: true, chunk: 0 }) },
    { t: 'Rewrite it first', home: true, say: 'Have the model rewrite the question into a clear search query. It lands nearer, but it is still worded like a question.', act: m => m.set({ mode: 1 }) },
    { t: 'Search with a made-up answer', home: true, say: 'HyDE has the model write a made-up answer, and searches with that. The details may be wrong, but it is worded like the handbook, so it lands right beside the real page.', act: m => m.set({ mode: 2 }) },
    { t: 'Last year\'s pages', home: true, say: 'Last year\'s handbook is still in the pile, almost word for word. Without a filter, old rules often win. Filter on the edition first.', act: m => m.set({ filter: false }) },
    { t: 'Small chunks miss the next line', home: true, say: 'Small paragraphs match precisely, but some answers need the paragraph after the one that matched. Whole sections keep it, but their vectors blur.', act: m => m.set({ filter: true, chunk: 1 }) },
    { t: 'Search small, hand over the section', home: true, say: 'So search with small paragraphs, and hand the model the whole section each came from. Precise matches, full context.', act: m => m.set({ chunk: 2 }) },
  ],
  check: [
    { q: 'Why can searching with a made-up answer (HyDE) beat searching with the question?', options: ['A made-up answer is worded like the real one, so its vector lands nearer', 'The made-up answer is always correct', 'It skips the embedding step'], answer: 0, why: 'Questions and answers are worded differently; HyDE crosses that gap.', hint: 'Compare As asked and Made-up answer.' },
    { q: 'Last year\'s rules sit beside this year\'s, almost word for word. What fixes it?', options: ['Filter on edition or date before searching', 'Use a bigger embedding model', 'Retrieve more chunks'], answer: 0, why: 'Similarity can\'t tell near-duplicates apart; metadata can.', hint: 'Try the No edition filter break.' },
    { q: 'What does parent-child chunking do?', options: ['Searches small chunks, then hands over the bigger section each came from', 'Merges all chunks into one', 'Searches sections, then splits them'], answer: 0, why: 'Small chunks match precisely; sections carry context.', hint: 'Compare the three Hand over choices.' },
  ],
  terms: [
    ['Query rewriting', 'Having a model turn the user\'s question into a clearer search query.'],
    ['HyDE', 'Hypothetical document embeddings: search with a made-up answer instead of the question.'],
    ['Metadata filter', 'Narrowing the search by fields such as date, edition or source before comparing vectors.'],
    ['Parent-child chunking', 'Indexing small chunks for search but handing the model the larger section they belong to.'],
    ['Near-duplicate', 'Two passages so alike that their vectors sit almost on top of each other.'],
    ['Faithfulness', 'Whether every claim in an answer is supported by the retrieved passages.'],
  ],
  deeper: '<p><b>Other query tricks.</b> Multi-query retrieval asks the model for several phrasings and merges what each finds. Step-back prompting searches a more general question first. Each extra call adds time; measure whether it pays.</p><p><b>Evaluate the pipeline.</b> Keep a set of test questions with the passages that answer them. Recall at k checks the search: did the right passage come back in the top k? Faithfulness checks the answer: is each claim in the retrieved text? Correctness checks the end result. Change one thing at a time.</p><p><b>Already covered elsewhere.</b> Keyword and vector search fused, and a cross-encoder reranker, are in the search lesson; how to cut documents is in the chunking lesson.</p><p><b>About this machine.</b> The map has two numbers per chunk so it can be drawn. Questions are placed by a fixed shift plus vagueness, made-up answers near the page they guess, and 2023 pages a hair from their 2026 twins. The counts come from searching this map for 48 test questions.</p>',
  code: {
    title: 'HyDE, a filter, and parent sections',
    note: 'Adapted from the course\'s advanced RAG lesson.',
    text: `
def retrieve(question, index, k=8, sections=2):
    guess = call_model(f"Write a short handbook paragraph that answers: {question}")
    hits = index.search(embed(guess), k=k, where={"edition": 2026})   # filter first
    picked = []
    for hit in hits:                                                   # small chunks matched,
        parent = hit.metadata["section_id"]                            # whole sections returned
        if parent not in picked:
            picked.append(parent)
        if len(picked) == sections:
            break
    return [index.section(p) for p in picked]
`,
  },
};
