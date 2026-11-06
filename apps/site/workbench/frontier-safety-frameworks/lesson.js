// Frontier safety frameworks (phase 15, lessons 19 and 20): a hypothetical model is evaluated in four risk domains before release. A framework
// turns measurements into gates: capability thresholds, which domains gate rather than only being watched, how hard evaluators try to draw out
// the capability, whether they check for sandbagging, who evaluates, and whether the safeguards are commitments or only recommendations. The
// true capabilities are fixed; what is measured, what gates and what actually ships are computed live.
const DOM = [
  { id: 'bio', name: 'biological', true: 41, safeguard: 'misuse classifiers and access tiers' },
  { id: 'cyber', name: 'cyber', true: 63, safeguard: 'monitoring and restricted tool access' },
  { id: 'rnd', name: 'AI research automation', true: 71, safeguard: 'an affirmative safety case and stronger weight security', autonomy: true },
  { id: 'pers', name: 'persuasion', true: 34, safeguard: 'usage policy enforcement' },
];
const TH = 60;
function evaluate(o) {
  return DOM.map(d => {
    let m = d.true * (o.elicit ? 1 : 0.8) * (d.autonomy && !o.sandbag ? 0.82 : 1);
    if (o.external) m = Math.max(m, d.true * 0.97);
    const gating = !d.autonomy || o.tracked, crossed = m >= TH, truly = d.true >= TH;
    const applied = crossed && gating && o.unilateral;
    return { ...d, m: Math.round(m), gating, crossed, truly, applied, missed: truly && !applied };
  });
}

export default {
  slug: 'frontier-safety-frameworks',
  title: 'Frontier safety frameworks: from a measurement to a gate',
  description: 'A hypothetical model is tested in four risk domains before release. A safety framework turns each measurement into a gate. Change how it is tested and what gates, and see what ships.',
  overview: 'Frontier labs publish policies for when a model needs stronger safeguards, or should not be deployed at all: Anthropic\'s Responsible Scaling Policy, OpenAI\'s Preparedness Framework and Google DeepMind\'s Frontier Safety Framework. They are partly technical, partly governance and partly a signal to regulators, and none is legally binding. They share a shape. Capability thresholds are defined in risk domains: chemical and biological misuse, cyber, and the ability to automate AI research and development, which all three treat as a key frontier. Evaluations measure the model against them before release. Crossing a threshold requires named safeguards, such as security for the weights, deployment restrictions or a written safety case, reviewed by an internal advisory group. They also converge on worries about deception: sandbagging (a model deliberately underperforming on an evaluation) and alignment faking. They differ in the details that decide outcomes. OpenAI\'s 2025 framework splits Tracked Categories, which trigger capability and safeguards reports before deployment, from Research Categories such as long-range autonomy and sandbagging, which are monitored without automatic mitigations. DeepMind defines Critical Capability Levels and folds autonomy into the domains where it causes harm. Some commitments are what a lab will do on its own; others are recommendations for the whole industry, which promise nothing. Read each policy column by column. And a framework is only as good as its measurements: under-elicited or sandbagged evaluations report lower capability than the model has, which is why external evaluators and elicitation effort matter, the subject of the next lesson.',
  keywords: ['responsible scaling policy', 'preparedness framework', 'frontier safety', 'AI governance', 'capability thresholds', 'AI safety', 'evaluations'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.25, 0.4, -0.05], dir: [0.05, 1.0, 1.15], half: 1.15, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { elicit: true, sandbag: true, external: true, tracked: true, unilateral: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const DX = i => -1.65 + i * 1.1, DZ = -0.35, HS = 0.014;
    const plane = P.box(4.4, 0.03, 0.03, RED, { r: 0.01 }); plane.position.set(0, 0.02 + TH * HS, DZ - 0.2); S.add(plane);
    for (const x of [-2.2, 2.2]) { const post = P.box(0.03, 0.02 + TH * HS, 0.03, RED, { r: 0.01 }); post.position.set(x, 0, DZ - 0.2); S.add(post); }
    const bars = DOM.map((d, i) => {
      const ghost = P.box(0.3, 1, 0.3, '#fff', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#C9C4B8', transparent: true, opacity: 0.45 }) }); ghost.position.set(DX(i) - 0.18, 0.02, DZ); ghost.scale.y = d.true * HS; ghost.userData.noFit = true; S.add(ghost);
      const mm = new THREE.MeshLambertMaterial({ color: GOOD }), m = P.box(0.3, 1, 0.3, GOOD, { r: 0.02, material: mm }); m.position.set(DX(i) + 0.18, 0.02, DZ); m.userData.noFit = true; S.add(m);
      const g = P.gate(0.8, GOOD, { h: 0.4 }); g.position.set(DX(i), 0, 0.35); S.add(g);
      return { mm, m, g };
    });
    const dec = P.lamp(GOOD, { h: 0.5, r: 0.12 }); dec.position.set(2.55, 0, 0); S.add(dec);
    S.add(P.keep(-2.2, 2.75, 1.05, -0.6, 0.55));
    let R = null;
    function draw() {
      R = evaluate(st);
      R.forEach((d, i) => {
        const B = bars[i];
        B.m.scale.y = d.m * HS; B.mm.color.set(d.crossed ? BAD : d.truly ? SAF : GOOD);
        B.g.userData.set({ open: !d.applied, color: d.missed ? RED : d.applied ? GOOD : '#B9B3A6' });
      });
      dec.userData.set({ color: R.some(d => d.missed) ? RED : GOOD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Evaluators try hard to draw out each capability', short: 'Elicitation', get: () => st.elicit, set: v => set({ elicit: !!v }) },
      { type: 'toggle', label: 'Check for sandbagging (deliberate underperformance)', short: 'Sandbagging', get: () => st.sandbag, set: v => set({ sandbag: !!v }) },
      { type: 'toggle', label: 'An external evaluator tests the model too', short: 'External', get: () => st.external, set: v => set({ external: !!v }) },
      { type: 'toggle', label: 'AI research automation gates, not only watched', short: 'Autonomy gates', get: () => st.tracked, set: v => set({ tracked: !!v }) },
      { type: 'toggle', label: 'Safeguards are the lab\'s own commitments', short: 'Committed', get: () => st.unilateral, set: v => set({ unilateral: !!v }) },
    ];
    const readouts = [
      { label: 'Over the line', get: () => ({ v: `${R.filter(d => d.truly).length} of 4`, sub: 'domains, truly' }) },
      { label: 'Gated with safeguards', get: () => { const n = R.filter(d => d.applied).length; return { v: String(n), sub: 'domains', good: n === R.filter(d => d.truly).length }; } },
      { label: 'Ungated gaps', get: () => { const n = R.filter(d => d.missed).length; return { v: String(n), sub: 'over but ungated', good: !n, bad: n > 0 }; } },
    ];
    const labels = [
      { name: 'bars', t: 'Four risk domains', d: 'Grey: true. Red line: threshold', icon: 'target', atV: V(-2.0, 0.3, DZ) },
      { name: 'gate', t: 'A gate per domain', d: 'Closed: safeguards applied', icon: 'check', atV: V(-2.05, 0.3, 0.35) },
      { name: 'dec', t: 'Release decision', d: 'Red: ships with gaps', icon: 'scale', atV: V(2.55, 0.5, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Evaluate lightly, internally', hint: 'under-elicited', on: () => set({ ...D0, elicit: false, external: false }), off: reset },
      { label: 'Only watch AI research automation', hint: 'a research category', on: () => set({ ...D0, tracked: false }), off: reset },
      { label: 'Make the safeguards recommendations', hint: 'advice, not promises', on: () => set({ ...D0, unilateral: false }), off: reset },
    ];
    function status() {
      const missed = R.filter(d => d.missed);
      if (!missed.length) return { ok: true, msg: `<b>${st.elicit && st.sandbag ? st.external ? 'Fully elicited, checked for sandbagging and tested externally' : 'Fully elicited and checked for sandbagging' : 'The internal evaluation under-reported, but the external evaluator measured close to the truth'}: the evaluation measured cyber at ${R[1].m} and AI research automation at ${R[2].m}, both over the threshold. Both gate, and the lab\'s committed safeguards apply.</b> The framework did its job because the measurement did.` };
      const names = missed.map(d => d.name).join(' and ');
      if (missed.some(d => !d.crossed)) return { ok: false, msg: `<b>The ${names} capabilit${missed.length > 1 ? 'ies are' : 'y is'} over the threshold, but the evaluation measured ${missed.length > 1 ? 'them' : 'it'} below: ${missed.map(d => `${d.m} measured, ${d.true} true`).join('; ')}.</b> ${!st.elicit ? 'Light elicitation under-reports what a model can do. ' : ''}${!st.sandbag ? 'A model can also underperform on purpose when it can tell it is being tested. ' : ''}A gate can only close on what is measured: elicit fully, check for sandbagging, and bring in an external evaluator.` };
      if (missed.some(d => !d.gating)) return { ok: false, msg: `<b>AI research automation measured ${R[2].m}, over the line, but it sits in a research category: watched and reported, with no automatic mitigation, so the model ships without its safeguard.</b> Where a capability sits, gating or only watched, is the hinge of a framework.` };
      return { ok: false, msg: `<b>Both cyber and AI research automation crossed and gate, but the safeguards were written as recommendations for the industry, not the lab\'s own commitments, so nothing obliges anyone to apply them.</b> Read each line of a policy for which column it is in: what the lab will do, or what it hopes others will.` };
    }
    return { update: dt => bars.forEach(B => B.g.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Before release', home: true, say: 'A hypothetical model is evaluated in four risk domains before release. Two of its true capabilities are over the line.', act: m => m.set({ elicit: true, sandbag: true, external: true, tracked: true, unilateral: true }) },
    { t: 'Measure it properly', home: true, say: 'A light, internal evaluation under-reports. Both domains measure below the line, and nothing gates.', act: m => m.set({ elicit: false, sandbag: true, external: false, tracked: true, unilateral: true }) },
    { t: 'Sandbagging', home: true, say: 'A model may underperform on purpose when it can tell it is tested. Check for it, and bring in outside evaluators.', act: m => m.set({ elicit: true, sandbag: false, external: false, tracked: true, unilateral: true }) },
    { t: 'Gated, or only watched?', home: true, say: 'If research automation is a category that is only watched, crossing it triggers a report, not a safeguard.', act: m => m.set({ elicit: true, sandbag: true, external: true, tracked: false, unilateral: true }) },
    { t: 'Promise or advice?', home: true, say: 'A safeguard written as a recommendation for the whole industry obliges nobody.', act: m => m.set({ elicit: true, sandbag: true, external: true, tracked: true, unilateral: false }) },
    { t: 'Read it column by column', home: true, say: 'Thresholds, gating, commitments, and above all the measurement. A framework is only as good as its evaluations.', act: m => m.set({ elicit: true, sandbag: true, external: true, tracked: true, unilateral: true }) },
  ],
  check: [
    { q: 'Why can a model over the threshold ship with no gate?', options: ['The evaluation measured it below the line', 'Thresholds are optional', 'It was too capable'], answer: 0, why: 'Gates close on measurements.', hint: 'Try Evaluate lightly.' },
    { q: 'What is sandbagging?', options: ['A model deliberately underperforming on an evaluation', 'Too many tests', 'Hiding the weights'], answer: 0, why: 'It lowers measured capability.', hint: 'Turn off Sandbagging.' },
    { q: 'A safeguard is "recommended for the industry". What does that commit the lab to?', options: ['Nothing', 'Applying it', 'Pausing'], answer: 0, why: 'Recommendations are advocacy, not promises.', hint: 'Try Make the safeguards recommendations.' },
  ],
  terms: [
    ['Capability threshold', 'A level in a risk domain that requires named safeguards.'],
    ['Tracked category', 'A domain whose crossing triggers reports and safeguards.'],
    ['Research category', 'A domain that is monitored, without automatic mitigation.'],
    ['Elicitation', 'The effort evaluators make to draw out a capability.'],
    ['Sandbagging', 'Deliberately underperforming when evaluated.'],
    ['Safety case', 'A written argument, with evidence, that risks are adequately mitigated.'],
  ],
  deeper: '<p><b>Watch the revisions.</b> These policies are revised every year or two; the useful unit is the change between versions: what was added, removed or reframed, and how independent reviewers rated it.</p><p><b>Standing reports.</b> Roadmaps of planned safety work and reports on released models let readers compare what was promised with what was done.</p><p><b>About this machine.</b> The model, its four capability scores and the threshold are hypothetical; how elicitation, sandbagging and policy choices change the outcome is computed live.</p>',
  code: {
    title: 'From measurement to gate',
    note: 'Adapted from the course\'s framework-comparison sketch.',
    text: `
def gate(model, framework):
    results = {}
    for domain in framework.domains:
        score = evaluate(model, domain,
                         elicitation=framework.elicitation,
                         sandbagging_checks=framework.sandbagging_checks)
        if framework.external_evaluator:
            score = max(score, external_eval(model, domain))
        crossed = score >= domain.threshold
        if crossed and domain.kind == "tracked":
            results[domain.name] = domain.safeguards if domain.committed else "recommended only"
        elif crossed:
            results[domain.name] = "report: research category"
    return results
`,
  },
};
