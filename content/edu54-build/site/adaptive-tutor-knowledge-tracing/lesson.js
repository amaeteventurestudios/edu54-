// Capstone 17, a personal AI tutor: a simulated learner works through a five-concept algebra path. The tutor keeps a Bayesian knowledge
// tracing estimate per concept (prior, learn, slip and guess rates), updates it after every answer, and moves on only when the estimate passes
// a mastery threshold, so prerequisites are secure first. A Socratic policy gives hints instead of answers; handing answers over lets the
// learner copy them, which inflates the estimate without any learning. The learner's true state and every answer come from a fixed
// pseudo-random stream, so each run is reproducible and every number is computed live.
const K = 5, T = 36, PI = 0.2, PT = 0.2, PS = 0.1, PG = 0.25;
const CONCEPTS = ['negative numbers', 'like terms', 'one-step equations', 'two-step equations', 'word problems'];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function run(o) {
  const known = Array(K).fill(false), est = Array(K).fill(PI), log = [];
  let cur = 0, onCur = 0;
  for (let t = 0; t < T && cur < K; t++) {
    const k = cur, ready = k === 0 || known[k - 1];
    const copied = !o.socratic && !known[k] && rnd(t * 7 + 4) < 0.6;
    const correct = copied || (known[k] ? rnd(t * 7 + 1) > PS : rnd(t * 7 + 2) < PG);
    const p = est[k];
    const post = correct ? p * (1 - PS) / (p * (1 - PS) + (1 - p) * PG) : p * PS / (p * PS + (1 - p) * (1 - PG));
    est[k] = post + (1 - post) * PT;
    const pl = !ready ? 0 : copied ? 0.02 : 0.22;
    if (!known[k] && rnd(t * 7 + 3) < pl) known[k] = true;
    log.push({ k, correct, copied });
    onCur++;
    if (o.adaptive ? est[k] >= o.thr : onCur >= 4) { cur++; onCur = 0; }
  }
  const learned = known.filter(Boolean).length;
  const falseM = known.map((kn, i) => !kn && est[i] >= o.thr).filter(Boolean).length;
  return { known, est, log, learned, falseM, steps: log.length };
}

export default {
  slug: 'adaptive-tutor-knowledge-tracing',
  title: 'An AI tutor: hints, mastery and the next concept',
  description: 'A tutor guides a learner up a five-step algebra path. After each answer it updates what it thinks they know, and hints instead of handing over the answer.',
  overview: 'Adaptive tutors became mass-market products by 2026, and they share a shape. A Socratic policy asks a leading question or offers a scaffolded hint instead of giving the answer, because a learner who copies an answer has not learned it. A learner model keeps an estimate of mastery for each concept and updates it after every interaction. A curriculum graph records which concepts are prerequisites of which, so the tutor picks the next concept only when the ones beneath it are secure. Spaced repetition brings concepts back before they fade, and strict safety filters and memory rules protect young learners. The classic learner model is Bayesian knowledge tracing (Corbett and Anderson, 1994). Each concept has four numbers: the chance the learner already knows it, the chance they learn it on each practice, the chance they slip and answer wrongly though they know it, and the chance they guess right without knowing it. After each answer, Bayes\' rule updates the probability that the learner knows the concept, then the learning chance is added. The tutor moves on when that probability passes a mastery threshold, often around 0.95. The estimate is only as good as its evidence: if the tutor hands over answers, correct responses stop meaning anything and the estimate climbs while the learner learns nothing. Real tutors are judged by efficacy studies, comparing pre- and post-test scores against the same content delivered without the adaptive policy, with confidence intervals. This machine runs one simulated learner, using a maths tutor on a phone in Kisumu, through thirty-six practice questions.',
  keywords: ['AI tutor', 'Bayesian knowledge tracing', 'mastery learning', 'Socratic tutoring', 'curriculum graph', 'adaptive learning', 'learner model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { socratic: true, adaptive: true, thr: 0.9 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', PLUM = '#7B6FA8';
    /* five concepts as stairs, each resting on the last; a tower on each for the tutor's estimate, a gold wall for the bar */
    const CX = i => -1.7 + i * 0.75;
    const cs = CONCEPTS.map((c, i) => {
      const step = P.box(0.68, 0.08 + i * 0.07, 0.56, '#D8D2C4', { r: 0.03 }); step.position.set(CX(i), 0, -0.6); S.add(step);
      const top = 0.08 + i * 0.07, t = P.tower(0.28, 0.28, SAF, { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(CX(i), top, -0.6); S.add(t);
      const wall = P.box(0.48, 1, 0.03, SAF, { r: 0.002 }); wall.position.set(CX(i), top, -0.78); wall.userData.noFit = true; S.add(wall);
      const l = P.lamp(GOOD, { h: 0.1, r: 0.075 }); l.position.set(CX(i) + 0.24, top, -0.48); S.add(l);
      return { t, wall, l };
    });
    /* thirty-six attempts as tiles */
    const slots = Array.from({ length: T }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.17, 0.05, 0.17, '#fff', { r: 0.02, material: m }); b.position.set(-1.85 + (i % 18) * 0.2, 0, 0.1 + Math.floor(i / 18) * 0.21); S.add(b); return m; });
    S.add(P.keep(-2.1, 1.75, 1.1, -0.95, 0.5));
    const parts = cs.map(c => c.t);
    let R = null;
    function draw() {
      R = run(st);
      cs.forEach((c, i) => {
        const e = R.est[i];
        c.t.userData.set({ h: Math.max(0.02, e * 0.7), color: e >= st.thr && !R.known[i] ? BAD : SAF });
        c.wall.scale.y = st.thr * 0.7;
        c.l.userData.set({ color: R.known[i] ? GOOD : BAD, on: true });
      });
      slots.forEach((m, i) => { const a = R.log[i]; m.color.set(!a ? OFF : a.copied ? PLUM : a.correct ? GOOD : BAD); });
    }
    function isOk() { return st.socratic && st.adaptive && st.thr >= 0.85 && R.learned === K; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Mastery threshold', min: 0.5, max: 0.97, step: 0.01, get: () => st.thr, set: v => set({ thr: +v }), fmt: v => (+v).toFixed(2) },
      { type: 'toggle', label: 'Hint, never hand over the answer', short: 'Socratic', get: () => st.socratic, set: v => set({ socratic: !!v }) },
      { type: 'toggle', label: 'Move on only at mastery', short: 'Adaptive', get: () => st.adaptive, set: v => set({ adaptive: !!v }) },
    ];
    const readouts = [
      { label: 'Truly learned', get: () => ({ v: `${R.learned} of ${K}`, sub: 'concepts', good: R.learned === K, bad: R.learned < K }) },
      { label: 'False mastery', get: () => ({ v: `${R.falseM}`, sub: 'estimate high, not learned', good: R.falseM === 0, bad: R.falseM > 0 }) },
      { label: 'Questions', get: () => ({ v: `${R.steps}`, sub: `of ${T} available`, good: R.learned === K, bad: false }) },
    ];
    const labels = [
      { name: 'c', t: 'Curriculum path', d: 'Each step rests on the last', icon: 'target', atV: V(-2.04, 0.05, -0.6) },
      { name: 't', t: 'What was learned', d: 'Lamp: truly known. Tower: estimated', icon: 'check', atV: V(1.5, 0.3, -0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Hand over the answer', hint: 'the learner copies', on: () => set({ ...D0, socratic: false }), off: reset },
      { label: 'March at a fixed pace', hint: 'four questions each', on: () => set({ ...D0, adaptive: false }), off: reset },
      { label: 'Move on at half mastery', hint: 'threshold 0.5', on: () => set({ ...D0, thr: 0.5 }), off: reset },
    ];
    function status() {
      const r = R, miss = r.known.map((k, i) => k ? null : CONCEPTS[i]).filter(Boolean);
      const gap = miss.length ? `${miss[0]}${miss.length > 1 ? ` and the ${miss.length - 1} concept${miss.length > 2 ? 's' : ''} after it` : ''}` : 'nothing';
      if (!st.socratic) return { ok: false, msg: `<b>The tutor handed over answers, so many right answers were copies: ${r.falseM} concept${r.falseM === 1 ? '' : 's'} passed the mastery line though the learner never learned ${r.falseM === 1 ? 'it' : 'them'}, and only ${r.learned} of ${K} truly learned.</b> When answers are given away, a right answer stops being evidence. Hint instead, and the estimate stays honest.` };
      if (!st.adaptive) return { ok: false, msg: `<b>At a fixed four questions per concept the learner moved on before ${miss[0] || 'every concept'} was secure, and everything built on it stalled: missing ${gap}.</b> ${r.learned} of ${K} learned. Let the learner model decide when to move on.` };
      if (r.learned < K || st.thr < 0.85) return { ok: false, msg: `<b>Moving on at ${st.thr.toFixed(2)}, a single lucky guess can push the estimate past the line: ${r.learned} of ${K} concepts truly learned${miss.length ? `, missing ${gap}` : ''}.</b> With guess and slip rates this high, a threshold near 0.9 or above keeps prerequisites secure.` };
      return { ok: true, msg: `<b>Hinting, and moving on only at mastery ${st.thr.toFixed(2)}, the learner truly learns all ${K} concepts in ${r.steps} questions, and every estimate matches the learner\'s real state.</b> An efficacy study against the same content without the tutor would confirm the gain.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A learning path', home: true, say: 'A tutor guides a learner through five algebra concepts, each resting on the one before.', act: m => m.set({ socratic: true, adaptive: true, thr: 0.9 }) },
    { t: 'Tracing knowledge', home: true, say: 'After every answer, Bayes\' rule updates the chance the learner knows the concept, allowing for slips and guesses.', act: m => m.set({ socratic: true, adaptive: true, thr: 0.9 }) },
    { t: 'Move on at mastery', home: true, say: 'The tutor moves on only when the estimate passes the threshold. Every concept is truly learned.', act: m => m.set({ socratic: true, adaptive: true, thr: 0.9 }) },
    { t: 'Too low a bar', home: true, say: 'At half mastery, one lucky guess is enough to move on, and a gap opens.', act: m => m.set({ socratic: true, adaptive: true, thr: 0.5 }) },
    { t: 'Copied answers', home: true, say: 'Hand over answers and the learner copies them. The estimate climbs, but nothing is learned.', act: m => m.set({ socratic: false, adaptive: true, thr: 0.9 }) },
    { t: 'Hint, then check', home: true, say: 'Hints keep the evidence honest. The tutor knows what the learner knows.', act: m => m.set({ socratic: true, adaptive: true, thr: 0.9 }) },
  ],
  check: [
    { q: 'What does knowledge tracing update after each answer?', options: ['The chance the learner knows the concept', 'The question difficulty', 'The learner\'s grade'], answer: 0, why: 'Using slip and guess rates.', hint: 'Watch the bars.' },
    { q: 'Why does handing over answers break the estimate?', options: ['Copied right answers are not evidence of knowing', 'It is too slow', 'The tutor forgets'], answer: 0, why: 'The estimate climbs without learning.', hint: 'Try Hand over the answer.' },
    { q: 'Why wait for mastery before the next concept?', options: ['Later concepts build on earlier ones', 'To use more questions', 'It looks better'], answer: 0, why: 'Gaps compound.', hint: 'Try March at a fixed pace.' },
  ],
  terms: [
    ['Knowledge tracing', 'Estimating, after each answer, what a learner has mastered.'],
    ['Slip', 'Answering wrongly despite knowing the concept.'],
    ['Guess', 'Answering rightly without knowing the concept.'],
    ['Mastery threshold', 'The estimate needed before moving on.'],
    ['Socratic policy', 'Teaching by questions and hints rather than answers.'],
    ['Efficacy study', 'Comparing learning gains with and without the tutor.'],
  ],
  deeper: '<p><b>Spaced repetition.</b> Mastered concepts fade; a scheduler brings them back at growing intervals.</p><p><b>Young learners.</b> Tutors for children need strict content filters and short, clear memory retention rules.</p><p><b>About this machine.</b> The learner is simulated; the four tracing rates are illustrative.</p>',
  code: {
    title: 'One knowledge-tracing update',
    note: 'Adapted from Bayesian knowledge tracing (Corbett and Anderson, 1994).',
    text: `
def bkt_update(p_know, correct, p_learn=0.2, p_slip=0.1, p_guess=0.25):
    if correct:
        evidence = p_know * (1 - p_slip) / (p_know * (1 - p_slip) + (1 - p_know) * p_guess)
    else:
        evidence = p_know * p_slip / (p_know * p_slip + (1 - p_know) * (1 - p_guess))
    return evidence + (1 - evidence) * p_learn       # chance they learned it on this step

def next_concept(graph, mastery, threshold=0.95):
    for concept in graph.in_order():
        if mastery[concept] < threshold and all(mastery[p] >= threshold for p in graph.prereqs(concept)):
            return concept
    return None
`,
  },
};
