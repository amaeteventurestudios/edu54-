// Exam prep, workflow and handoffs: an invented health insurer in Kampala handles 200 claims a week in five steps. For each step the team
// chooses an intervention: automate a bounded, reversible step, assist a person who stays the operator, or redesign a step that exists only
// because inputs are poor. Every step gets a handoff contract with an owner, pass criteria and an escalation route. The weekly outcomes,
// claims dropped, wrong values used and wrong payouts sent, follow from the choices with fixed illustrative rates.
const WEEK = 200, LOWCONF = 0.15, CONFLICT = 0.1, PAYERR = 0.03;
const STEPS = ['Read the\nclaim email', 'Extract the\nclaim fields', 'Reconcile two\nspreadsheets', 'Decide the\npayout', 'Notify the\nmember'];
function week(o) {
  const dropped = o.escalate ? 0 : Math.round(WEEK * LOWCONF);
  const wrongValues = o.redesign ? 0 : Math.round(WEEK * CONFLICT);
  const wrongPayouts = o.personDecides ? 0 : Math.round(WEEK * PAYERR) + (o.redesign ? 0 : Math.round(wrongValues * 0.5));
  const unseen = o.contracts ? 0 : dropped + wrongValues;
  const steps = [
    { how: 'automate', note: 'route by type,\nreversible' },
    { how: 'automate', note: o.escalate ? 'unsure → a\nclaims officer' : 'unsure →\nnowhere' },
    { how: o.redesign ? 'redesign' : 'automate', note: o.redesign ? 'one register,\nnothing to\nreconcile' : 'faster, but the\ncopies disagree' },
    { how: o.personDecides ? 'assist' : 'automate', note: o.personDecides ? 'Claude drafts,\nassessor decides' : 'Claude\ndecides' },
    { how: o.personDecides ? 'automate' : 'automate', note: 'after the\ndecision' },
  ];
  return { dropped, wrongValues, wrongPayouts, unseen, steps };
}

export default {
  slug: 'exam-workflow-design-and-human-handoffs',
  title: 'Exam prep: design the handoff before the automation',
  description: 'A health insurer in Kampala handles 200 claims a week in five steps. Choose what to automate, assist or redesign, and who catches what falls out.',
  overview: 'Adding Claude to a workflow starts with how the work really moves, not with the tool: what starts it, who supplies each input, which systems are the sources of record, where people use judgement, which exceptions eat the time, who approves the result and how failure is noticed. Shadow real cases, because informal checks often carry knowledge that disappears when a step is automated without encoding or assigning it. Then choose an intervention per step. Assist: Claude extracts, summarises or drafts while a person stays the operator, right where judgement or consequence is high. Automate: the system performs a bounded, well-tested, reversible step under policy. Redesign: the step is waste caused by poor inputs or duplicate systems, so remove it; making Claude reconcile two conflicting spreadsheets faster does not fix the conflict, a single source of record does. Reject: some steps should not use Claude at all. Every step then needs a contract: its trigger, owner, allowed inputs, output, pass criteria, service expectation, escalation condition, fallback and next owner, so it can be tested alone and responsibility cannot dissolve between systems. The most important part is the handoff for what does not fit: low-confidence or unusual cases must go to a named person within a set time, with the evidence attached; a confidence threshold with nowhere to send the case silently drops it. Consequential decisions, such as a payout, stay with someone who has the authority, with Claude preparing the case. Measure the workflow on throughput, errors, escalations and time to resolution, not just on how fast the automated parts run. This machine designs an invented claims workflow in Kampala.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'workflow design', 'human in the loop', 'escalation', 'handoff contract', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.2], dir: [0.05, 1.05, 1.12], half: 1.1, wide: 5.7 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { escalate: true, redesign: true, personDecides: true, contracts: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8';
    const HOW = { automate: '#1F9E89', assist: '#5B6CC4', redesign: '#F2AE0C' };
    /* claims roll along a belt past five stations, coloured by what was chosen for that step; each station's lamp is its handoff contract */
    const SX = i => -2.1 + i * 1.0, BZ = -0.75;
    const belt = P.belt(V(-2.65, 0, -0.3), V(2.55, 0, -0.3), { w: 0.3, speed: 1.2 }); S.add(belt);
    const stations = STEPS.map((n, i) => {
      const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.6, 0.55, 0.42, '#fff', { r: 0.05, material: m }); b.position.set(SX(i), 0, BZ); S.add(b);
      const l = P.lamp(GOOD, { h: 0.14, r: 0.07 }); l.position.set(SX(i), 0.55, BZ); S.add(l);
      return { m, l };
    });
    /* below the belt, where things go: a claims officer takes the unsure claims or they pile up; two disagreeing registers or one; an assessor decides or wrong payouts pile up */
    const Z2 = 0.35, officer = P.robot('#7B6FA8', { scale: 0.5 }); officer.position.set(SX(1), 0, Z2); S.add(officer);
    const dropped = P.stack(0.34, 0.34, 0.1, { max: 6, color: BAD }); dropped.position.set(SX(1), 0, Z2); S.add(dropped);
    const reg1 = P.box(0.3, 0.34, 0.3, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); reg1.position.set(SX(2) - 0.18, 0, Z2); S.add(reg1);
    const reg2 = P.box(0.3, 0.34, 0.3, BAD, { r: 0.03 }); reg2.position.set(SX(2) + 0.18, 0, Z2); S.add(reg2);
    const assessor = P.robot(BLUE, { scale: 0.5 }); assessor.position.set(SX(3), 0, Z2); S.add(assessor);
    const wrong = P.stack(0.34, 0.34, 0.1, { max: 4, color: BAD }); wrong.position.set(SX(3), 0, Z2); S.add(wrong);
    S.add(P.keep(-2.75, 2.65, 0.9, -1.0, 0.65));

    let R = null, clock = 0;
    function draw() {
      R = week(st);
      R.steps.forEach((s, i) => { stations[i].m.color.set(HOW[s.how]); stations[i].l.userData.set({ color: st.contracts ? GOOD : BAD, on: true }); });
      officer.visible = !!st.escalate; dropped.visible = !st.escalate; dropped.userData.set({ n: Math.round(R.dropped / 5) });
      reg2.visible = !st.redesign;
      assessor.visible = !!st.personDecides; wrong.visible = !st.personDecides; wrong.userData.set({ n: Math.max(1, Math.round(R.wrongPayouts / 5)) });
    }
    function isOk() { return !R.dropped && !R.wrongValues && !R.wrongPayouts && !R.unseen; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Escalate low-confidence claims to a named owner', short: 'Escalation', get: () => st.escalate, set: v => set({ escalate: !!v }) },
      { type: 'toggle', label: 'Redesign: one member register instead of reconciling two', short: 'Redesign', get: () => st.redesign, set: v => set({ redesign: !!v }) },
      { type: 'toggle', label: 'A person decides the payout', short: 'Person decides', get: () => st.personDecides, set: v => set({ personDecides: !!v }) },
      { type: 'toggle', label: 'A handoff contract on every step', short: 'Contracts', get: () => st.contracts, set: v => set({ contracts: !!v }) },
    ];
    const readouts = [
      { label: 'Dropped', get: () => ({ v: `${R.dropped}`, sub: 'claims a week', good: !R.dropped, bad: R.dropped > 0 }) },
      { label: 'Wrong payouts', get: () => ({ v: `${R.wrongPayouts}`, sub: 'a week', good: !R.wrongPayouts, bad: R.wrongPayouts > 0 }) },
      { label: 'Unseen problems', get: () => ({ v: `${R.unseen}`, sub: 'no owner told', good: !R.unseen, bad: R.unseen > 0 }) },
    ];
    const labels = [
      { name: 'w', t: 'Five steps', d: 'Teal: automate. Blue: assist. Gold: redesign', icon: 'link', atV: V(-2.42, 0.25, -0.75) },
      { name: 't', t: 'A week of claims', d: 'Coral piles: what went wrong', icon: 'target', atV: V(2.22, 0.25, -0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send low-confidence claims nowhere', hint: 'silently dropped', on: () => set({ ...D0, escalate: false }), off: reset },
      { label: 'Automate the spreadsheet reconciling', hint: 'faster, still wrong', on: () => set({ ...D0, redesign: false }), off: reset },
      { label: 'Let Claude decide payouts', hint: 'no authority', on: () => set({ ...D0, personDecides: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.dropped) return { ok: false, msg: `<b>The extractor flags low-confidence claims, but nothing says where they go, so ${r.dropped} claims a week sit untouched${st.contracts ? '' : ' and nobody notices'}.</b> Every escalation needs a named owner, a deadline and the evidence attached.` };
      if (r.wrongValues) return { ok: false, msg: `<b>Claude reconciles the two member spreadsheets faster, but ${r.wrongValues} claims a week still pick up the wrong member details, because the copies disagree.</b> This step is waste caused by duplicate records: redesign it around one register.` };
      if (r.wrongPayouts) return { ok: false, msg: `<b>With Claude deciding payouts, ${r.wrongPayouts} wrong payouts go out each week with no assessor reviewing them.</b> Keep the decision with a person who has the authority; let Claude prepare the case.` };
      if (r.unseen || !st.contracts) return { ok: false, msg: '<b>Without a contract per step, a failing step has no owner and no pass criteria, so problems surface only when members complain.</b> Give each step a trigger, owner, criteria, escalation and fallback.' };
      return { ok: true, msg: '<b>Routing and extraction are automated, low-confidence claims reach a claims officer within a day, the duplicate spreadsheets are replaced by one register, and an assessor decides every payout with Claude\'s draft.</b> Each step has a contract, so a failure reaches an owner, not a member.' };
    }
    return { update: dt => { clock += dt; if (clock > 0.9 && belt.userData.count() < 6) { clock = 0; belt.userData.send('#F4F1EA', { size: 0.16 }); } belt.userData.tick(dt); officer.userData.tick(dt); assessor.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Map the real work', home: true, say: 'Two hundred claims a week flow through five steps. Watch real cases before changing anything.', act: m => m.set({ escalate: false, redesign: false, personDecides: false, contracts: false }) },
    { t: 'Automate the bounded', home: true, say: 'Routing emails and extracting fields are bounded and reversible: automate them.', act: m => m.set({ escalate: false, redesign: false, personDecides: false, contracts: true }) },
    { t: 'Escalate to someone', home: true, say: 'Low-confidence extractions need a named owner and a deadline, or they are silently dropped.', act: m => m.set({ escalate: true, redesign: false, personDecides: false, contracts: true }) },
    { t: 'Redesign waste', home: true, say: 'Reconciling two conflicting spreadsheets faster is still wrong. Keep one register.', act: m => m.set({ escalate: true, redesign: true, personDecides: false, contracts: true }) },
    { t: 'Assist the decision', home: true, say: 'The payout is consequential. Claude prepares the case; an assessor decides.', act: m => m.set({ escalate: true, redesign: true, personDecides: true, contracts: true }) },
    { t: 'Handoffs first', home: true, say: 'Every step has an owner, criteria and an escalation route. Failures reach a person, not a member.', act: m => m.set({ escalate: true, redesign: true, personDecides: true, contracts: true }) },
  ],
  check: [
    { q: 'Analysts spend hours reconciling two spreadsheets that disagree. What is the best intervention?', options: ['Redesign around one source of record', 'Automate the reconciliation', 'Ask Claude to reconcile faster'], answer: 0, why: 'The waste comes from duplicate data.', hint: 'Try Automate the spreadsheet reconciling.' },
    { q: 'What must a confidence threshold come with?', options: ['A named owner and deadline for the cases it flags', 'A higher threshold', 'Nothing'], answer: 0, why: 'Otherwise flagged cases are dropped.', hint: 'Try Send low-confidence claims nowhere.' },
    { q: 'Which step should stay with a person, assisted by Claude?', options: ['Deciding a payout', 'Routing an email', 'Extracting a date'], answer: 0, why: 'Consequence and authority.', hint: 'Try Let Claude decide payouts.' },
  ],
  practice: [
    { q: 'Before automating a reporting process, what should a team do first?', options: ['Shadow real cases to map triggers, sources, judgement points and exceptions', 'Pick the largest model', 'Automate every step at once', 'Write the final prompt'], answer: 0, why: 'Informal checks are easy to lose.' },
    { q: 'Which step is a good candidate to automate?', options: ['Routing incoming emails by type, which is reversible and well tested', 'Approving refunds', 'Changing contract terms', 'Firing an employee'], answer: 0, why: 'Bounded, tested and reversible.' },
    { q: 'An extraction step marks 15% of documents as low confidence and stops. Nobody picks them up. What is missing?', options: ['An escalation condition with a named owner and service time', 'A better model', 'A lower threshold', 'More documents'], answer: 0, why: 'A handoff with nowhere to go drops work.' },
    { q: 'Which belongs in a step\'s handoff contract?', options: ['Owner, inputs, output, pass criteria, escalation and fallback', 'Only the prompt', 'Only the model name', 'Nothing formal'], answer: 0, why: 'So the step can be tested alone and owned.' },
    { q: 'How should a redesigned workflow be judged?', options: ['On throughput, errors, escalations and time to resolution', 'On how fast the automated parts run', 'On how many steps use Claude', 'On cost alone'], answer: 0, why: 'Outcomes, not automation coverage.' },
    { q: 'When should a step reject using Claude altogether?', options: ['When data, consequence, ambiguity or policy make the risk unacceptable', 'Never', 'Whenever it is slow', 'When the prompt is long'], answer: 0, why: 'Reject is a valid intervention.' },
  ],
  terms: [
    ['Assist', 'Claude prepares; a person stays the operator.'],
    ['Automate', 'The system performs a bounded, tested, reversible step.'],
    ['Redesign', 'Remove a step that exists only because of poor inputs.'],
    ['Handoff contract', 'Trigger, owner, inputs, output, criteria, escalation and fallback.'],
    ['Escalation', 'Passing a case a step cannot handle to a named person.'],
    ['Source of record', 'The one system trusted for a piece of data.'],
  ],
  deeper: '<p><b>Pilots.</b> Run the new workflow alongside the old on real cases, compare outcomes, and keep a way back before switching over.</p><p><b>Evidence with the case.</b> An escalated case should arrive with what was extracted, the confidence and the source, so the person does not start again.</p><p><b>About this machine.</b> The insurer and rates are invented for illustration.</p>',
  code: {
    title: 'A step contract with an escalation route',
    note: 'Written for this lesson.',
    text: `
EXTRACT_STEP = {
    "trigger": "claim email routed as 'new claim'",
    "owner": "claims intake team",
    "inputs": ["email body", "attachments"],
    "output_schema": "ClaimFields",
    "pass_criteria": ["member id matches register", "all required fields present"],
    "service_time": "15 minutes",
    "escalate_when": "confidence < 0.8 or any required field missing",
    "escalate_to": "duty claims officer, within 1 working day, evidence attached",
    "fallback": "manual intake queue",
    "next_owner": "assessor",
}
`,
  },
};
