// Exam prep, associate capstone: an invented field-services company with seven regional teams (Nairobi, Kampala, Kigali, Dar es Salaam,
// Addis Ababa, Lusaka, Maputo) builds a Claude-assisted Friday brief over one simulated week. Each day ends at a gate: Monday scope and
// surface, Tuesday sources, Wednesday staged extraction that must reconcile, Thursday claim-evidence validation, Friday human handoff.
// Pick a week's defect and watch which gate catches it and at what release level (block, revise, ready for review); switch a gate off and the
// defect reaches the director inside a polished brief. Illustrative.
const DAYS = [
  { k: 'mon', n: 'Monday', g: 'scope and surface', c: 'decision, out of scope,\nsurface approved\nfor the data class' },
  { k: 'tue', n: 'Tuesday', g: 'govern sources', c: '7 regions or marked\nmissing, owners,\nfreshness, no names' },
  { k: 'wed', n: 'Wednesday', g: 'staged prompts', c: 'extract, reconcile,\nanalyse, draft;\nrows match snapshot' },
  { k: 'thu', n: 'Thursday', g: 'validate', c: 'claims cite sources,\ntotals by code,\nfresh reviewer' },
  { k: 'fri', n: 'Friday', g: 'hand off', c: 'owner, deadline,\noptions, fallback,\nsnapshot version' },
];
const CASES = [
  { n: 'normal week', s: 'normal', day: null },
  { n: 'a personal chat app was used for customer data', s: 'wrong surface', day: 0, lvl: 'block', fix: 'move to the approved surface' },
  { n: 'Kigali\'s file is missing', s: 'missing region', day: 1, lvl: 'revise', fix: 'mark Kigali missing in the packet' },
  { n: 'an update names customers', s: 'customer names', day: 1, lvl: 'block', fix: 'remove names: the decision needs none' },
  { n: 'two regions report the same incident with different dates', s: 'date conflict', day: 2, lvl: 'revise', fix: 'reconcile, with the incident owner deciding' },
  { n: 'the draft claims delays doubled, citing nothing', s: 'unsupported claim', day: 3, lvl: 'block', fix: 'cite the calculation or drop the claim' },
  { n: 'nobody is named to approve the brief', s: 'no owner', day: 4, lvl: 'block', fix: 'name the operations director as owner' },
];

const wrap = (s, n = 18) => s.split(' ').reduce((L, w) => { const l = L[L.length - 1]; if (l && (l + ' ' + w).length <= n) L[L.length - 1] = l + ' ' + w; else L.push(w); return L; }, []).join('\n');

function run(o) {
  const c = CASES[o.cs];
  const off = DAYS.map((d, i) => !o.gates[i]);
  let outcome;
  if (c.day === null) outcome = { lvl: off.some(Boolean) ? 'gap' : 'ready' };
  else if (!o.gates[c.day]) outcome = { lvl: 'leaked' };
  else outcome = { lvl: c.lvl };
  return { c, off, outcome, ok: !off.some(Boolean) };
}

export default {
  slug: 'exam-associate-workflow-capstone',
  title: 'Exam prep capstone: a governed weekly workflow',
  description: 'Over one week, a team builds a Friday brief from seven regions, with a gate each day. Plant a fault and see which gate stops it before the director.',
  overview: 'This capstone ties the associate topics into one governed workflow. Leadership asks to "automate the weekly report with Claude", which is a request, not a solution: the brief affects staffing and customer communication, some inputs carry customer details, and approvals matter. Design a bounded workflow where Claude extracts, compares and drafts, deterministic checks verify exact properties, and an authorised person owns publication. Monday: write the decision in one sentence (by Friday afternoon the operations director chooses at most two changes for next week from the approved snapshot), list what is out of scope, and choose a surface approved for the data class, recording why and when its terms were checked. Tuesday: build a source registry where every source has a stable ID, owner, authority class, dates and sensitivity; freeze a weekly snapshot; mark missing regions explicitly; remove customer names the decision does not need; set an authority order. Wednesday: split the work into extraction, reconciliation, analysis and drafting, each with a prompt contract, and stop if reconciliation leaves a blocker. Thursday: run deterministic checks for sources, totals and claim support, use a separate reviewer with the rubric and evidence, and sort findings into block, revise or quality improvement. Friday: hand off a packet with the decision, owner, deadline, snapshot version, evidence, checks, uncertainty, options and a fallback, so the director approves a decision, not "the AI". After the week, add the new failure to the evaluation set. Every gate that fails stops uncertainty from flowing downstream. The company and regions are invented; details are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'capstone', 'workflow', 'source registry', 'claim evidence', 'human handoff', 'release gates', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.3, 0], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cs: 0, gates: [true, true, true, true, true] }, st = { cs: 0, gates: [...D0.gates] };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const LVL = { block: RED, revise: SAF, ready: GOOD };
    /* seven regional updates on a shelf feed one belt through the five daily gates */
    const regions = P.shelf(7, { cell: 0.14, levels: 1, lh: 0.17, d: 0.24 }); regions.position.set(-2.55, 0, -0.5); S.add(regions);
    const line = P.belt(V(-2.9, 0, 0), V(1.3, 0, 0), { w: 0.34, speed: 0.8 }); S.add(line);
    const days = DAYS.map((d, i) => {
      const x = -2.1 + i * 0.75;
      const g = P.gate(0.5, GOOD, { h: 0.42 }); g.rotation.y = Math.PI / 2; g.position.set(x, 0, 0); S.add(g);
      const l = P.lamp(OFF, { h: 0.14, r: 0.08 }); l.position.set(x, 0, 0.5); S.add(l);
      return { g, l, x };
    });
    /* the defect of the week, stopped at its gate or riding through to the director */
    const dotM = new THREE.MeshLambertMaterial({ color: RED }), dot = P.ball(0.1, '#fff', { material: dotM }); dot.userData.noFit = true; S.add(dot);
    /* the director with the brief on a desk */
    const director = P.robot('#7B6FA8', { scale: 0.66 }); director.position.set(1.75, 0, -0.3); S.add(director);
    const briefM = new THREE.MeshLambertMaterial({ color: GOOD }), brief = P.box(0.42, 0.1, 0.32, '#fff', { r: 0.03, material: briefM }); brief.position.set(1.75, 0, 0.1); S.add(brief);
    S.add(P.keep(-3.0, 2.05, 0.85, -0.75, 0.7));
    const parts = [line, director];
    let clock = 0;

    let R = null;
    function draw() {
      R = run(st);
      const lv = R.outcome.lvl;
      days.forEach((d, i) => {
        const caught = R.c.day === i && st.gates[i];
        d.g.visible = !!st.gates[i];
        d.l.userData.set({ color: !st.gates[i] ? RED : caught ? LVL[R.c.lvl] : GOOD, on: true });
      });
      regions.userData.set({ fill: Array.from({ length: 7 }, (_, i) => R.c.s === 'missing region' && i === 2 ? false : R.c.s === 'customer names' && i === 2 ? RED : '#3D6BD6') });
      dot.visible = R.c.day !== null;
      if (R.c.day !== null) {
        const x = lv === 'leaked' ? 1.75 : days[R.c.day].x - 0.14;
        dot.position.set(x, lv === 'leaked' ? 0.2 : 0.18, lv === 'leaked' ? 0.1 : 0);
        dotM.color.set(lv === 'leaked' || lv === 'block' ? RED : SAF);
      }
      briefM.color.set(lv === 'leaked' ? RED : lv === 'ready' ? GOOD : OFF);
    }
    draw();
    const set = p => { if (p.gates) st.gates = [...p.gates]; if (p.cs !== undefined) st.cs = p.cs; draw(); };
    const gate = i => ({ type: 'toggle', label: `${DAYS[i].n} gate: ${DAYS[i].g}`, short: DAYS[i].n, get: () => st.gates[i], set: v => { const g = [...st.gates]; g[i] = !!v; set({ gates: g }); } });
    const controls = [
      { type: 'buttons', label: 'This week', options: CASES.map(c => c.s), get: () => st.cs, act: i => set({ cs: i }) },
      gate(0), gate(1), gate(2), gate(3), gate(4),
    ];
    const readouts = [
      { label: 'Release level', get: () => ({ v: R.outcome.lvl === 'leaked' ? 'leaked' : R.outcome.lvl === 'gap' ? 'ready?' : R.outcome.lvl, sub: R.c.s, good: R.ok && R.outcome.lvl !== 'leaked', bad: R.outcome.lvl === 'leaked' || !R.ok }) },
      { label: 'Gates on', get: () => ({ v: `${st.gates.filter(Boolean).length} of 5`, sub: 'Monday to Friday', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'w', t: 'Five daily gates', d: 'Lamp: what each day caught', icon: 'target', atV: V(-2.45, 0.2, 0.5) },
      { name: 't', t: 'The brief', d: 'Red: a fault hidden in polish', icon: 'check', atV: V(1.98, 0.1, 0.1) },
    ];
    const reset = () => set({ cs: st.cs, gates: [true, true, true, true, true] });
    const breaks = [
      { label: 'Skip the source gate', hint: 'names reach the brief', on: () => set({ cs: 3, gates: [true, false, true, true, true] }), off: reset },
      { label: 'Skip validation', hint: 'citation syntax is not support', on: () => set({ cs: 5, gates: [true, true, true, false, true] }), off: reset },
      { label: 'Skip the handoff gate', hint: 'who approves?', on: () => set({ cs: 6, gates: [true, true, true, true, false] }), off: reset },
    ];
    function status() {
      const lv = R.outcome.lvl;
      if (lv === 'leaked') return { ok: false, msg: `<b>The ${DAYS[R.c.day].n} gate was off, so the director received a polished brief in which ${R.c.n}.</b> A polished brief can hide a failed gate; switch it back on.` };
      if (!R.ok) return { ok: false, msg: `<b>${DAYS.filter((d, i) => !st.gates[i]).map(d => `The ${d.n} gate (${d.g})`).join(' and ')} ${st.gates.filter(g => !g).length > 1 ? 'are' : 'is'} off.</b> ${lv === 'gap' ? 'This week was clean, so nothing leaked, but the next defect of that kind would reach the director unseen.' : `This week's defect was still caught on ${DAYS[R.c.day].n}, but another kind would pass unseen.`}` };
      if (lv === 'ready') return { ok: true, msg: '<b>All five gates pass: the packet goes to the operations director with the decision, deadline, snapshot version, evidence, uncertainty, options and a fallback.</b> The director approves a decision, not "the AI".' };
      return { ok: true, msg: `<b>The ${DAYS[R.c.day].n} gate caught it (${R.c.n}) at release level ${R.c.lvl}: ${R.c.fix}.</b> ${R.c.lvl === 'block' ? 'Nothing moves downstream until it is resolved.' : 'It may proceed with the issue visible in the packet.'} Then add the case to the evaluation set.` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.1) { clock = 0; line.userData.send('#3D6BD6', { size: 0.16 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A week, five gates', home: true, say: 'A team builds a Friday brief from seven regional updates, with a gate at the end of each day.', act: m => m.set({ cs: 0, gates: [true, true, true, true, true] }) },
    { t: 'Monday: the surface', home: true, say: 'Customer data in a personal chat app is blocked on Monday, before any drafting.', act: m => m.set({ cs: 1, gates: [true, true, true, true, true] }) },
    { t: 'Tuesday: sources', home: true, say: 'A missing region is marked missing, not guessed. Customer names are removed.', act: m => m.set({ cs: 2, gates: [true, true, true, true, true] }) },
    { t: 'Wednesday: reconcile', home: true, say: 'Two dates for one incident stop the analysis until the incident owner decides.', act: m => m.set({ cs: 4, gates: [true, true, true, true, true] }) },
    { t: 'Thursday: validate', home: true, say: 'A claim with no source is blocked. Totals are checked by code, not by a model.', act: m => m.set({ cs: 5, gates: [true, true, true, true, true] }) },
    { t: 'Friday: hand off', home: true, say: 'The director approves a decision, with evidence, options and a fallback in the packet.', act: m => m.set({ cs: 6, gates: [true, true, true, true, true] }) },
  ],
  check: [
    { q: 'Customer names appear in a regional update the decision does not need. What happens?', options: ['Block at the source gate and remove them', 'Draft first, redact later', 'Ask the model to ignore them'], answer: 0, why: 'Minimise before drafting.', hint: 'Try Skip the source gate.' },
    { q: 'A draft claim cites nothing. Which release level?', options: ['Block', 'Quality improvement', 'Ready'], answer: 0, why: 'Unsupported consequential claims block release.', hint: 'Try Skip validation.' },
    { q: 'Who approves the Friday brief?', options: ['A named owner, who approves a decision with evidence', '"The AI"', 'Nobody: it publishes itself'], answer: 0, why: 'High consequence needs human authority.', hint: 'Try Skip the handoff gate.' },
  ],
  practice: [
    { q: 'Leadership says "automate the weekly report with Claude". What comes first?', options: ['A one-sentence decision, scope and an approved surface', 'The final prompt', 'Uploading the whole archive', 'Choosing the largest model'], answer: 0, why: 'No approved purpose, stop.' },
    { q: 'One region\'s update is missing at the cutoff. What should the brief do?', options: ['Mark the region missing and show the uncertainty', 'Estimate it from last week', 'Leave it out silently', 'Delay forever'], answer: 0, why: 'No authoritative evidence, abstain.' },
    { q: 'A total in the brief must equal the sum of regional rows. How is it checked?', options: ['With code or a spreadsheet', 'With a model grader', 'By reading it carefully', 'It is not checked'], answer: 0, why: 'Exact property, deterministic check.' },
    { q: 'Which finding is a quality improvement rather than a blocker?', options: ['A weak heading', 'An unknown source', 'An invalid total', 'No decision owner'], answer: 0, why: 'Block, revise, quality improvement.' },
    { q: 'A source changes after the director approved the brief. What happens?', options: ['Invalidate the publication gate and review the change', 'Nothing', 'Publish both versions', 'Ask the model to update it silently'], answer: 0, why: 'Approval is bound to a snapshot.' },
    { q: 'The same kind of defect appears two weeks running. What should change?', options: ['Add an evaluation case, control or source rule', 'Add bold text to the prompt', 'Ignore it', 'Change models'], answer: 0, why: 'Repeated failure, repair the system.' },
  ],
  terms: [
    ['Gate', 'A check at the end of a stage that stops uncertainty moving on.'],
    ['Source registry', 'Each source with ID, owner, authority, dates and sensitivity.'],
    ['Snapshot', 'The frozen set of sources a week\'s brief is built from.'],
    ['Release level', 'Block, revise or quality improvement.'],
    ['Claim-evidence matrix', 'Each consequential claim mapped to the source that supports it.'],
    ['Handoff packet', 'Decision, owner, deadline, evidence, uncertainty, options and fallback.'],
  ],
  deeper: '<p><b>The validator is limited on purpose.</b> Code checks exact properties; whether a policy is sufficient or a reviewer competent stays with people.</p><p><b>Retrospective.</b> Ask which stage took most human time, which check caught the worst defect and whether the workflow should stay assisted, automate more or return to manual.</p><p><b>About this machine.</b> The company and regions are invented.</p>',
  code: {
    title: 'A deterministic readiness check',
    note: 'Written for this lesson.',
    text: `
def readiness(packet):
    blocks, revise = [], []
    if not packet.surface.approved_for(packet.data_class): blocks.append("surface")
    for s in packet.sources:
        if not (s.owner and s.authority and s.effective and s.sensitivity): blocks.append(f"source {s.id}")
    for region in REGIONS:
        if region not in packet.regions and region not in packet.marked_missing: revise.append(region)
    for c in packet.claims:
        if c.consequential and c.support not in ("direct", "calculated"): blocks.append(f"claim {c.id}")
    if not (packet.owner and packet.deadline and packet.fallback): blocks.append("handoff")
    return "block" if blocks else "revise" if revise else "ready_for_human_review"
`,
  },
};
