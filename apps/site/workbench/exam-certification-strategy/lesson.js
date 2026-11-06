// Exam prep, study strategy: an invented learner, Wanjiru, has ten hours to prepare for a Claude certification whose guide lists seven domains
// with published weights. Each domain starts at her current confidence; study hours raise it, faster when she practises decisions than when
// she memorises vocabulary. A plan can split hours evenly, by weight times weakness, or by preference. The readiness gate asks for every
// domain at 75 or more on raw practice scoring, not one good overall mock. Levels are illustrative practice estimates, not exam scores.
const DOMAINS = [
  { id: 'Output evaluation and validation', w: 21, c: 'understood' },
  { id: 'Workflow and solution design', w: 16, c: 'understood' },
  { id: 'Governance, risk and responsible use', w: 15, c: 'understood' },
  { id: 'Prompting and task execution', w: 14, c: 'practiced' },
  { id: 'Product and model selection', w: 12, c: 'practiced' },
  { id: 'Configuration and knowledge', w: 12, c: 'practiced' },
  { id: 'Troubleshooting and optimisation', w: 10, c: 'timed' },
];
const START = { unseen: 30, understood: 52, practiced: 68, timed: 80 }, WEAK = { unseen: 1.8, understood: 1.5, practiced: 1.0, timed: 0.6 };
function plan(o) {
  let raw;
  if (o.method === 'even') raw = DOMAINS.map(() => 1);
  else if (o.method === 'liked') raw = DOMAINS.map((d, i) => i >= 3 ? 1 : 0.1);
  else raw = DOMAINS.map(d => d.w * WEAK[d.c]);
  const sum = raw.reduce((a, b) => a + b, 0), rate = o.decide ? 13 : 4;
  const rows = DOMAINS.map((d, i) => { const h = o.hours * raw[i] / sum, lvl = Math.min(95, START[d.c] + h * rate * (o.decide ? 1 : 1)); return { ...d, h, lvl }; });
  const overall = rows.reduce((a, r) => a + r.lvl * r.w, 0) / 100;
  const weak = rows.filter(r => r.lvl < 75);
  const gate = o.oneMock ? overall >= 75 : weak.length === 0;
  return { rows, overall, weak, gate, honest: weak.length === 0 };
}

export default {
  slug: 'exam-certification-strategy',
  title: 'Exam prep: study the decisions, not the vocabulary',
  description: 'Wanjiru has ten hours before an exam with seven weighted domains. Turn the blueprint into a plan, then see which gate tells her the truth.',
  overview: 'A certification blueprint is a model of the job: each domain is a part of the work, and its weight says roughly how much of the scored exam comes from it. Weight is not difficulty, but it is the best guide to where practice time pays. A good plan starts from the weights and then adjusts for weakness: hours for a domain are the total hours times its weight times a weakness multiplier, normalised back to the time available, so a heavy domain you have barely practised gets more time than a light one you already handle well. What you do with the hours matters as much as how many. Label every objective as something to know, to do or to decide. Most weak plans overinvest in knowing, memorising feature names and definitions, while scenario questions mostly test doing and deciding: reading constraints such as privacy, freshness, risk and reversibility, then choosing the smallest capability that fits and the evidence and review it needs. Wrong options are usually locally correct; they solve a slightly different problem, ignore one constraint or add machinery nobody asked for, so practise explaining why each plausible alternative loses. Keep an evidence ledger of decision rules with a counterexample and a dated official source, and an error log that classifies each miss, such as a missed constraint or a stale fact, because the class decides the fix. Finally, use a readiness gate that looks at every domain, such as no domain below 75 on raw practice scoring across two fresh timed sets, rather than one good overall mock. Practice scores are raw counts and cannot predict an exam result.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'study plan', 'exam blueprint', 'domain weights', 'readiness gate', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, -0.15], dir: [0.05, 0.8, 1.15], half: 1.1, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { hours: 10, method: 'weighted', decide: true, oneMock: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* seven domains: each column as wide as its weight, grey where she starts, teal or coral for what the hours add; flat blocks in front count the hours */
    const HH = 1.2, ZZ = -0.35;
    let xx = -2.45;
    const cols = DOMAINS.map(d => {
      const w = d.w / 21 * 0.62, x = xx + w / 2; xx += w + 0.11;
      const b0 = P.box(w, 1, 0.5, '#B9B3A6', { r: 0.02 }); b0.scale.y = START[d.c] / 100 * HH; b0.position.set(x, 0, ZZ); b0.userData.noFit = true; S.add(b0);
      const gm = new THREE.MeshLambertMaterial({ color: GOOD }), gb = P.box(w, 1, 0.5, '#fff', { r: 0.02, material: gm }); gb.position.set(x, START[d.c] / 100 * HH, ZZ); gb.userData.noFit = true; S.add(gb);
      const hrs = P.stack(w * 0.8, 0.24, 0.05, { max: 14, color: '#5B8DB8' }); hrs.position.set(x, 0, ZZ + 0.5); S.add(hrs);
      return { gb, gm, hrs };
    });
    /* the gate at 75, a gold rail across every column; on the right the single weighted average, and the verdict lamp */
    const RAIL = HH * 0.75, rail = P.box(4.65, 0.035, 0.035, SAF, { r: 0.01 }); rail.position.set(-0.25, RAIL, ZZ + 0.28); S.add(rail);
    [-2.55, 2.05].forEach(x => { const p = P.box(0.04, RAIL, 0.04, '#6B6E7E', { r: 0.01 }); p.position.set(x, 0, ZZ + 0.28); S.add(p); });
    const avg = P.tower(0.5, 0.5, '#5B8DB8'); avg.userData.set({ cap: '' }); avg.position.set(1.72, 0, ZZ); avg.userData.noFit = true; S.add(avg);
    const lamp = P.lamp(OFF, { h: 0.4, r: 0.12 }); lamp.position.set(2.4, 0, ZZ); S.add(lamp);
    S.add(P.keep(-2.65, 2.6, 1.3, -0.7, 0.45));

    let R = null;
    function draw() {
      R = plan(st);
      R.rows.forEach((r, i) => {
        cols[i].gb.scale.y = Math.max(0.01, (r.lvl - START[r.c]) / 100 * HH);
        cols[i].gm.color.set(r.lvl >= 75 ? GOOD : BAD);
        cols[i].hrs.userData.set({ n: Math.min(14, Math.round(r.h)) });
      });
      avg.userData.set({ h: R.overall / 100 * HH, color: st.oneMock ? SAF : '#5B8DB8' });
      lamp.userData.set({ color: R.gate && !R.honest ? RED : isOk() ? GOOD : R.gate ? SAF : OFF, on: R.gate });
    }
    function isOk() { return R.honest && !st.oneMock && st.decide && st.method === 'weighted'; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const M = ['weighted', 'even', 'liked'];
    const controls = [
      { type: 'slider', label: 'Study hours', min: 4, max: 20, step: 1, get: () => st.hours, set: v => set({ hours: +v }), fmt: v => `${v} h` },
      { type: 'toggle', label: 'Practise decisions, not vocabulary', short: 'Decisions', get: () => st.decide, set: v => set({ decide: !!v }) },
      { type: 'toggle', label: 'Judge readiness by one overall mock', short: 'One mock', get: () => st.oneMock, set: v => set({ oneMock: !!v }) },
      { type: 'buttons', label: 'Split the hours', options: ['Weight × weakness', 'Evenly', 'By preference'], get: () => M.indexOf(st.method), act: i => set({ method: M[i] }) },
    ];
    const readouts = [
      { label: 'Weakest domain', get: () => { const w = R.rows.reduce((a, r) => r.lvl < a.lvl ? r : a); return { v: `${Math.round(w.lvl)}`, sub: w.id.split(' ')[0], good: w.lvl >= 75, bad: w.lvl < 75 }; } },
      { label: 'Under 75', get: () => ({ v: `${R.weak.length}`, sub: 'of 7 domains', good: R.weak.length === 0, bad: R.weak.length > 0 }) },
      { label: 'Gate', get: () => ({ v: R.gate ? 'ready' : 'not yet', sub: st.oneMock ? 'one mock' : 'every domain', good: R.gate && R.honest, bad: R.gate && !R.honest }) },
    ];
    const labels = [
      { name: 'd', t: 'Seven weighted domains', d: 'Wider: heavier. Blocks: hours', icon: 'box', atV: V(-2.5, 0.3, -0.35) },
      { name: 't', t: 'The readiness gate', d: 'Gold bar: 75 in every domain', icon: 'target', atV: V(2.52, 0.4, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Split the hours evenly', hint: 'heavy weak domains lag', on: () => set({ ...D0, method: 'even' }), off: reset },
      { label: 'Memorise vocabulary', hint: 'slow progress', on: () => set({ ...D0, decide: false }), off: reset },
      { label: 'Trust one overall mock', hint: 'hides a weak domain', on: () => set({ ...D0, oneMock: true, method: 'liked', hours: 20 }), off: reset },
    ];
    function status() {
      const r = R, nm = r.weak.map(w => w.id.toLowerCase()), names = nm.length > 2 ? `${nm.slice(0, 2).join(', ')} and ${nm.length - 2} more` : nm.join(' and ');
      if (st.oneMock && r.gate && !r.honest) return { ok: false, msg: `<b>The weighted average is ${Math.round(r.overall)}, so a single overall mock says ready, but ${names} ${r.weak.length > 1 ? 'are' : 'is'} still under 75.</b> Gate on every domain, across fresh timed sets.` };
      if (!st.decide) return { ok: false, msg: `<b>Memorising terms moves each domain slowly: ${r.weak.length} of 7 are still under 75 after ${st.hours} hours.</b> Spend the time on scenarios: constraints, the smallest fitting choice, and why each plausible alternative loses.` };
      if (st.method === 'even' && r.weak.length) return { ok: false, msg: `<b>An even split gives output evaluation, the heaviest domain at 21%, the same ${r.rows[0].h.toFixed(1)} hours as the lightest, so ${names} ${r.weak.length > 1 ? 'stay' : 'stays'} under 75.</b> Weight the hours by the blueprint and by weakness.` };
      if (r.weak.length) return { ok: false, msg: `<b>${names[0].toUpperCase() + names.slice(1)} ${r.weak.length > 1 ? 'are' : 'is'} still under 75 after this plan.</b> ${st.method === 'liked' ? 'Studying favourite topics leaves the heavy, unfamiliar domains behind.' : 'Add hours, or move them to the weakest heavy domains.'}` };
      if (st.method !== 'weighted' || st.oneMock) return { ok: false, msg: '<b>Every domain clears 75 here, but the plan or the gate would mislead with less time.</b> Weight by blueprint and weakness, and gate on every domain.' };
      return { ok: true, msg: `<b>Weighting ${st.hours} hours by blueprint and weakness puts ${r.rows[0].h.toFixed(1)} on output evaluation, and practising decisions lifts every domain to 75 or more.</b> The gate checks each domain, and these are raw practice estimates, not a predicted exam score.` };
    }
    return { update: dt => avg.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A blueprint', home: true, say: 'The guide lists seven domains and their weights. Wanjiru has ten hours.', act: m => m.set({ hours: 10, method: 'even', decide: true, oneMock: false }) },
    { t: 'Weight and weakness', home: true, say: 'Give each domain hours by its weight and how weak she is in it. The heaviest, weakest domain gets the most.', act: m => m.set({ hours: 10, method: 'weighted', decide: true, oneMock: false }) },
    { t: 'Decisions', home: true, say: 'Spend the hours on scenarios and trade-offs, not on memorising names. Progress is much faster.', act: m => m.set({ hours: 10, method: 'weighted', decide: false, oneMock: false }) },
    { t: 'Favourite topics', home: true, say: 'Study what she enjoys, and the heavy unfamiliar domains are left behind.', act: m => m.set({ hours: 10, method: 'liked', decide: true, oneMock: false }) },
    { t: 'One flattering mock', home: true, say: 'One good overall score can hide a weak domain. Check every domain.', act: m => m.set({ hours: 20, method: 'liked', decide: true, oneMock: true }) },
    { t: 'Ready, honestly', home: true, say: 'Weighted hours, decision practice and a gate on every domain. And practice scores never predict the real result.', act: m => m.set({ hours: 10, method: 'weighted', decide: true, oneMock: false }) },
  ],
  check: [
    { q: 'What does a domain\'s weight tell you?', options: ['Roughly how much of the scored exam comes from it', 'How hard it is', 'Nothing useful'], answer: 0, why: 'Weight guides practice time.', hint: 'Try Split the hours evenly.' },
    { q: 'What do scenario questions mostly test?', options: ['Decisions under constraints', 'Definitions', 'Feature names'], answer: 0, why: 'Know, do, decide: mostly decide.', hint: 'Try Memorise vocabulary.' },
    { q: 'What makes a sound readiness gate?', options: ['Every domain above a bar across fresh timed sets', 'One high overall mock', 'Finishing the reading'], answer: 0, why: 'Averages hide weak domains.', hint: 'Try Trust one overall mock.' },
  ],
  practice: [
    { q: 'A learner has 12 hours. Domain A weighs 21% and she is weak in it; domain B weighs 10% and she is strong. How should she split time between them?', options: ['More hours to A: weight times a weakness multiplier', 'Equal hours to both', 'More to B, because she enjoys it', 'Skip A until the end'], answer: 0, why: 'A heavy domain where she is weak repays the most practice.' },
    { q: 'She can define every feature name but misses scenario questions. What should change in her study?', options: ['Practise choosing between options under stated constraints, and explaining why the others lose', 'Memorise more definitions', 'Read the guide again', 'Take the same mock again'], answer: 0, why: 'Scenarios test decisions, not vocabulary.' },
    { q: 'An option in a practice question would work, but ignores the stated data-privacy requirement. What kind of distractor is it?', options: ['Capability without fit', 'Nonsense', 'Overengineering', 'The correct answer'], answer: 0, why: 'Wrong options are usually locally correct but break one constraint.' },
    { q: 'She scored 82% overall on one mock, with one domain at 60%. Is she ready?', options: ['Not yet: a domain is below the bar, and one mock is thin evidence', 'Yes: 82% is high', 'Yes, if she felt confident', 'Only if the mock was hard'], answer: 0, why: 'Gate on every domain across fresh timed sets.' },
    { q: 'She remembered an outdated model limit and got a question wrong. What fixes this class of miss?', options: ['Check the current official documentation and record the date', 'More practice scenarios', 'Memorise harder', 'Ignore it'], answer: 0, why: 'A stale fact needs a dated, official source.' },
    { q: 'What can a practice score tell her about the real exam result?', options: ['Nothing reliable: practice scores are raw counts, not scaled exam scores', 'Her exact result', 'Her result within five points', 'Whether she will pass'], answer: 0, why: 'Practice measures readiness for practice, not the exam\'s scaled score.' },
  ],
  terms: [
    ['Blueprint', 'The published list of exam domains and their weights.'],
    ['Domain weight', 'Roughly the share of the scored exam drawn from a domain.'],
    ['Weakness multiplier', 'Extra study time for a domain you are weak in.'],
    ['Distractor', 'A wrong option that looks right because it solves part of the problem.'],
    ['Evidence ledger', 'Notes of decision rules, counterexamples and dated sources.'],
    ['Readiness gate', 'The bar every domain must clear before you sit the exam.'],
  ],
  deeper: '<p><b>Error log.</b> Classify each miss: a recall gap, a stale fact, a missed constraint, a sequence error, surface confusion, an evidence failure or overengineering. The class decides the fix.</p><p><b>Dated facts.</b> Model names, limits, prices and plan features change; note the source and date, and check the current guide before booking.</p><p><b>About this machine.</b> Wanjiru is invented; the levels are illustrative practice estimates.</p>',
  code: {
    title: 'A weighted study plan',
    note: 'Written for this lesson.',
    text: `
WEAKNESS = {"unseen": 1.8, "understood": 1.5, "practiced": 1.0, "timed": 0.6}

def plan(domains, total_hours):
    raw = {d["id"]: d["weight"] * WEAKNESS[d["confidence"]] for d in domains}
    s = sum(raw.values())
    return {k: round(total_hours * v / s, 1) for k, v in raw.items()}

def ready(practice_sets, bar=75):
    # every domain, in each of two fresh timed sets
    return len(practice_sets) >= 2 and all(score >= bar for s in practice_sets for score in s.values())
`,
  },
};
