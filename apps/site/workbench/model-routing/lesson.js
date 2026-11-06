// Model routing (phase 17, lesson 16): a Dar es Salaam tutoring app gets 100 questions of varied difficulty. A cheap model answers first and states its confidence; below the threshold it escalates. The loop below really walks all 100.
// Cost and quality are counted per question. After months the cheap model drifts, and only an online quality check on a sample of its answers notices.
const COST = { cheap: 1, big: 33 };
const Q = Array.from({ length: 100 }, (_, i) => { const d = ((i * 37) % 100) / 100, n = (((i * 61) % 100) / 100 - 0.5) * 0.3; return { d, conf: Math.max(0, Math.min(1, 1 - d + n)) }; });
function run(o) {
  const skill = o.drift ? 0.42 : 0.7;
  let cost = 0, good = 0, up = 0, bad = 0;
  Q.forEach(q => {
    const cheapOK = q.d < skill;
    if (o.mode === 'big') { cost += COST.big; good++; return; }
    if (o.mode === 'cheap') { cost += COST.cheap; cheapOK ? good++ : bad++; return; }
    cost += COST.cheap;
    const conf = o.drift ? Math.min(1, q.conf + 0.25) : q.conf;
    if (conf < o.th) { cost += COST.big; up++; good++; } else if (cheapOK) good++; else bad++;
  });
  return { cost, good, up, bad, full: COST.big * 100, caught: o.drift && o.gate };
}

export default {
  slug: 'model-routing',
  title: 'Model routing: cheap first, escalate when unsure',
  description: 'Most questions are easy. Let a cheap model try first, and watch the threshold trade money for mistakes.',
  overview: 'Most traffic doesn\'t need your largest model. A short question or a rephrase can go to a small model at about 3% of the cost, leaving the big one for real reasoning. Routing does this, usually by cascade: the cheap model tries, and if its confidence is low, the question goes up. Signals include a task classifier, prompt length, similarity to known hard questions, and the first answer\'s confidence. The threshold is the dial: too low and mistakes reach users, too high and you pay for both models. And models drift. Confidence stays high while quality slips, so an online check on a sample of cheap answers is what catches cheap-model creep.',
  keywords: ['model routing', 'cascade', 'LLM costs', 'confidence threshold', 'quality gate', 'inference economics'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v * 0.0002);
    const D0 = { mode: 'route', th: 0.35, drift: false, gate: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b1 = add(P.belt(V(-2.4, 0, 0.35), V(-0.6, 0, 0.35), { w: 0.3, speed: 1.4 }));
    const cheap = add(P.robot(BLUE, { scale: 0.65 })); cheap.position.set(-0.35, 0.03, 0.35);
    const big = add(P.robot('#7B6FA8', { scale: 1.1 })); big.position.set(0.9, 0.03, -0.35);
    const up = add(P.pipe([V(-0.2, 0.25, 0.1), V(0.3, 0.3, -0.2), V(0.65, 0.3, -0.35)], SAF, { r: 0.05, n: 4, speed: 0.6 }));
    const T = [0, 1, 2].map(i => { const t = add(P.tower(0.36, 0.42, [GOOD, SAF, '#B5462F'][i])); t.position.set(1.6 + i * 0.42, 0.03, 0.2); t.userData.set({ cap: '' }); return t; });
    const lens = add(P.lamp('#C9C4B6', { h: 0.4, r: 0.1 })); lens.position.set(-1.9, 0.03, -0.45);
    S.add(P.keep(-2.5, 2.55, 1.15, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      T[0].userData.set({ h: Math.max(0.04, R.cost / R.full * 1.1) }); T[1].userData.set({ h: Math.max(0.04, R.up / 100 * 1.1) }); T[2].userData.set({ h: Math.max(0.04, R.bad / 100 * 2.2) });
      lens.userData.set({ color: st.drift && st.gate ? '#D9483B' : st.gate ? '#3E9B5F' : '#C9C4B6', on: st.gate });
      up.userData.set({ on: st.mode === 'route' }); cheap.visible = st.mode !== 'big'; big.visible = st.mode !== 'cheap';
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['big', 'cheap', 'route'];
    const controls = [
      { type: 'buttons', label: 'Send questions to', options: ['Big model only', 'Cheap only', 'Cascade'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Escalate below confidence', min: 0.1, max: 0.95, step: 0.05, get: () => st.th, set: v => set({ th: v }) },
      { type: 'toggle', label: 'Months later, the cheap model has drifted', short: 'Drift', get: () => st.drift, set: v => set({ drift: !!v }) },
      { type: 'toggle', label: 'Online check on a sample of cheap answers', short: 'Quality gate', get: () => st.gate, set: v => set({ gate: !!v }) },
    ];
    const readouts = [
      { label: 'Cost per 100 questions', get: () => ({ v: M(R.cost), sub: `big only: ${M(R.full)}`, good: R.cost < R.full * 0.55, bad: R.cost >= R.full }) },
      { label: 'Wrong answers', get: () => ({ v: `${R.bad} in 100`, sub: 'reached a student', good: R.bad <= 2, bad: R.bad > 6 }) },
      { label: 'Sent up', get: () => ({ v: `${R.up} in 100`, sub: 'paid for both' }) },
    ];
    const labels = [
      { name: 'r', t: 'Small model first', d: 'The pipe sends doubts up', icon: 'link', atV: V(-2.3, 0.1, 0.4) },
      { name: 't', t: 'Cost, sent up, wrong', d: 'Shorter is better', icon: 'target', atV: V(2.6, 0.2, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send everything to the big model', hint: 'most questions are easy', on: () => set({ ...D0, mode: 'big' }), off: reset },
      { label: 'Trust the cheap model fully', hint: 'threshold too low', on: () => set({ ...D0, th: 0.1 }), off: reset },
      { label: 'Escalate nearly everything', hint: 'paying twice', on: () => set({ ...D0, th: 0.95 }), off: reset },
      { label: 'Drift with no quality check', hint: 'confident and wrong', on: () => set({ ...D0, drift: true, gate: false }), off: reset },
    ];
    function status() {
      if (st.mode === 'big') return { ok: false, msg: `<b>${M(R.cost)} per hundred, and most went on questions a small model could do.</b> No mistakes, at a price you don't need to pay.` };
      if (st.drift && !st.gate) return { ok: false, msg: `<b>${R.bad} wrong answers in 100, and every dashboard is green.</b> The cheap model got worse and stayed confident, so nothing escalates. Sample its answers and score them online.` };
      if (R.caught) return { ok: true, msg: `<b>The quality check caught the drift: ${R.bad} wrong in 100 on the sample.</b> Raise the threshold or roll the cheap model back, until it passes again.` };
      if (R.bad > 6) return { ok: false, msg: `<b>${R.bad} students got a wrong answer.</b> The threshold is too low, so weak answers go out. It looks cheap until you count what a wrong answer costs a learner.` };
      if (R.up > 70) return { ok: false, msg: `<b>${R.up} of 100 escalated: you pay for the cheap try and for the big answer.</b> At this point you may as well skip the first step.` };
      return { ok: true, msg: `<b>${M(R.cost)} against ${M(R.full)}, with ${R.bad} wrong and ${R.up} sent up.</b> Easy questions stay small, and hard ones go to the big model. Keep the online check running.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.6 && b1.userData.count() < 4) { u = 0; b1.userData.send('#F4F1EA', { size: 0.16 }); } },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One big model', home: true, say: 'A tutoring app in Dar es Salaam sends every question to its largest model. Most are simple.', act: m => m.set({ mode: 'big', th: 0.35, drift: false, gate: true }) },
    { t: 'Cheap only', home: true, say: 'Send everything to a small model, and the bill collapses. So do the hard answers.', act: m => m.set({ mode: 'cheap', th: 0.35, drift: false, gate: true }) },
    { t: 'A cascade', home: true, say: 'Let the small model try first and state its confidence. When it\'s unsure, the question goes up.', act: m => m.set({ mode: 'route', th: 0.35, drift: false, gate: true }) },
    { t: 'The dial', home: true, say: 'The threshold trades money for mistakes. Too low and errors get out. Too high and you pay for both.', act: m => m.set({ mode: 'route', th: 0.2, drift: false, gate: true }) },
    { t: 'Drift', home: true, say: 'Months later, the cheap model is worse and just as confident. Nothing escalates, and dashboards stay green.', act: m => m.set({ mode: 'route', th: 0.35, drift: true, gate: false }) },
    { t: 'An online check', home: true, say: 'Score a sample of cheap answers all the time. That is what catches cheap-model creep.', act: m => m.set({ mode: 'route', th: 0.35, drift: true, gate: true }) },
  ],
  check: [
    { q: 'What does a cascade do?', options: ['Tries a cheap model, escalates when unsure', 'Uses two models always', 'Picks at random'], answer: 0, why: 'Most questions stop at the cheap step.', hint: 'Choose Cascade.' },
    { q: 'What happens if the threshold is too high?', options: ['You pay for both models on most questions', 'Mistakes rise', 'Nothing changes'], answer: 0, why: 'Nearly everything escalates.', hint: 'Try Escalate nearly everything.' },
    { q: 'What catches cheap-model creep?', options: ['An online quality check on samples', 'The cheap model\'s confidence', 'The bill'], answer: 0, why: 'Confidence can stay high while quality falls.', hint: 'Try Drift with no quality check.' },
  ],
  terms: [
    ['Routing', 'Choosing a model per request.'],
    ['Cascade', 'Cheap first, then escalate.'],
    ['Confidence', 'How sure a first answer seems.'],
    ['Blended cost', 'The average across the routing split.'],
    ['Cheap-model creep', 'Quality slipping as more goes to the small model.'],
    ['Online quality gate', 'Scoring live samples.'],
  ],
  deeper: '<p><b>Four signals.</b> A task classifier, prompt length, similarity to a known-hard set, and first-pass confidence. Cheap signals run before any model call.</p><p><b>Confidence is weak.</b> Model self-confidence is poorly calibrated. Use it with care, and check it against real scores.</p><p><b>This run.</b> Costs use a 33:1 ratio, and the hundred questions have fixed, spread-out difficulty.</p>',
  code: {
    title: 'A cascade',
    note: 'Adapted from the course\'s router (code/main.py).',
    text: `
def answer(question, threshold=0.55):
    first = small_model(question)
    if confidence(first) >= threshold:
        if random.random() < 0.02:
            quality_queue.put((question, first))  # scored online
        return first
    return big_model(question)
`,
  },
};
