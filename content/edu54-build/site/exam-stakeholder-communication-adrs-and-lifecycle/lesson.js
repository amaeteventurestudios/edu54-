// Exam prep, stakeholder communication and lifecycle: an invented water utility in Windhoek pilots a billing-query assistant. One design, four
// audiences (executive, engineering, security, operations), each with its own question. A view per audience answers it; one overloaded
// component diagram answers none. An ADR keeps options, rejected alternatives and a reversal condition; owners are named per decision, not
// "the AI team"; handoff is accepted when the receiving team can operate and change the system, not when a link is sent. Illustrative.
const AUD = [
  { n: 'executive', q: 'Is the value worth the residual risk?', view: 'billing queries: 9 → 4 min to a correct answer\nworkflow, not agent: cheaper, auditable\nresidual risk: wrong tariff quoted,\nlimited by citation check and review\ndecision asked: approve a 3-month pilot', needs: ['views', 'adr'] },
  { n: 'engineering', q: 'What must be built, and how do boundaries behave?', view: 'contracts: request and reply schemas\nidentity: account holder token per call\nerrors: typed, retryable flag\nversions: prompt, model, tariff index\nrelease gate: 40 eval cases pass', needs: ['views', 'adr'] },
  { n: 'security', q: 'Where do data and authority cross boundaries?', view: 'data map: account no. pseudonymised\nlogs hashed, 30 days\nno payment changes: read-only tools\nthreat model: injected meter notes\ncontrols each with owner and test', needs: ['views'] },
  { n: 'operations', q: 'How is failure detected and recovered?', view: 'SLO: 95% answers under 6 s, 7 days\nalerts: citation failures, tool errors\nrunbook drilled, rollback in 5 min\nincident owner on call\nfallback: hand to a clerk', needs: ['views', 'handoff', 'owners'] },
];
const OWN = [
  ['business outcome', 'customer services head'], ['prompt and output contract', 'product engineer'], ['tariff knowledge freshness', 'billing policy team'],
  ['identity and permissions', 'platform security'], ['eval labels and thresholds', 'billing quality lead'], ['runtime SLO and incidents', 'operations on-call'],
];

function run(o) {
  const a = AUD[o.aud];
  const missing = a.needs.filter(k => !o[k]);
  const issues = [], short = [];
  if (!o.views) { issues.push(`the ${a.n} audience gets the same component diagram as everyone, full of model routes and queues, and cannot answer "${a.q}"`); short.push('one overloaded diagram'); }
  if (!o.adr) { issues.push('the decision lives in meeting memory: six months on, a new team proposes the agent design already rejected for cost and auditability'); short.push('no ADR'); }
  if (!o.owners) { issues.push('ownership says only "the AI team", so nobody knows the billing policy team owns tariff freshness, so a tariff change goes stale'); short.push('no named owners'); }
  if (!o.handoff) { issues.push('handoff was a link: operations never drilled the runbook or tested rollback before the pilot'); short.push('handoff not accepted'); }
  return { a, missing, answered: missing.length === 0, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-stakeholder-communication-adrs-and-lifecycle',
  title: 'Exam prep: stakeholders, ADRs and lifecycle',
  description: 'One design for a billing assistant, four audiences. Pipe each its own view, keep the rejected option, name the owners and truly hand it over.',
  overview: 'A design can be technically correct and still undeliverable if nobody can say what decision is being approved, which risk remains or who owns the system after launch. Different stakeholders need different decisions, not different truths. An executive asks whether the value is worth the residual risk and investment, and needs the outcome, baseline and target, options, a cost range and the risk decision. Product and operations need the changed workflow, exceptions, review, SLOs and adoption plan. Engineering needs components, contracts, identity, errors, versions and tests. Security and privacy need the data map, threat model, controls and retention. A domain owner needs evaluation cases, sources and escalation; SRE and support need telemetry, alerts, runbooks and rollback. Tell the story as a decision sequence: problem, constraints, options, recommendation, consequences and rejected alternatives, verification and rollout, residual risk and approvals, ownership. Use each diagram to answer one question. Record decisions in short ADRs with status and owner, context, options and evidence, rationale, consequences, rejected alternatives, a verification plan, reversal conditions and a review date, with honest confidence on estimates. Turn the architecture into contracts: schemas, identity, versioning, timeouts and idempotency, error categories, data handling, evaluation fixtures and release gates. Name owners per decision, from business outcome and prompt contract to knowledge freshness, permissions, evaluation thresholds, SLOs, vendors and retirement, and separate who recommends a change from who accepts its risk. A handoff is complete when the receiving team can operate and change the system safely. This machine follows an invented water utility in Windhoek; details are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'stakeholders', 'architecture decision record', 'adr', 'ownership', 'handoff', 'lifecycle', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { aud: 0, views: true, adr: true, owners: true, handoff: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the one design at the back, a pipe from it to whichever audience is asking */
    const design = P.box(0.7, 0.42, 0.5, '#3D6BD6', { r: 0.04 }); design.position.set(-0.6, 0, -0.6); S.add(design);
    const seats = AUD.map((a, i) => {
      const x = -1.95 + i * 0.9;
      const m = new THREE.MeshLambertMaterial({ color: OFF }), pad = P.box(0.56, 0.05, 0.56, '#fff', { r: 0.04, material: m }); pad.position.set(x, 0, 0.35); S.add(pad);
      const r = P.robot(['#E07A5F', '#3D6BD6', '#7B6FA8', '#D9A441'][i], { scale: 0.6 }); r.position.set(x, 0.05, 0.35); S.add(r);
      const p = P.pipe([V(-0.6, 0.22, -0.32), V((x - 0.6) / 2, 0.22, -0.05), V(x, 0.2, 0.08)], GOOD, { r: 0.04, n: 4 }); S.add(p);
      return { m, r, p };
    });
    /* one overloaded diagram: nine loose parts piled up between the design and the audience */
    const clutter = Array.from({ length: 9 }, (_, i) => { const c = P.box(0.26, 0.12, 0.16, ['#5B8DB8', '#E07A5F', '#7B6FA8', '#1F9E89'][i % 4], { r: 0.02 }); c.position.set(-1.55 + (i % 5) * 0.46, 0, -0.14 + (i % 3 - 1) * 0.13); S.add(c); return c; });
    /* the ADR shelf: options kept on record, or an empty shelf */
    const adr = P.shelf(4, { cell: 0.18, levels: 2, lh: 0.17, d: 0.26 }); adr.position.set(-2.05, 0, -0.6); S.add(adr);
    /* six owners, one per decision; grey means only "the AI team" */
    const owners = OWN.map((o, i) => { const r = P.robot(OFF, { scale: 0.42 }); r.position.set(0.55 + (i % 3) * 0.36, 0, -0.74 + Math.floor(i / 2) * 0); S.add(r); r.position.z = i < 3 ? -0.78 : -0.44; return r; });
    /* handoff: a lamp beside the operations seat */
    const taken = P.lamp(GOOD, { h: 0.2, r: 0.09 }); taken.position.set(1.72, 0, 0.35); S.add(taken);
    S.add(P.keep(-2.4, 1.95, 0.85, -1.0, 0.7));
    const parts = [...seats.map(s => s.p), ...seats.map(s => s.r), ...owners];

    let R = null;
    function draw() {
      R = run(st);
      seats.forEach((s, i) => {
        const sel = i === st.aud;
        s.m.color.set(!sel ? OFF : R.answered ? GOOD : SAF);
        s.p.visible = !!(sel && st.views);
        s.r.userData.set({ busy: sel });
      });
      clutter.forEach(c => { c.visible = !st.views; });
      adr.userData.set({ fill: Array.from({ length: 8 }, () => st.adr ? '#3D6BD6' : false) });
      owners.forEach(r => r.userData.set({ color: st.owners ? GOOD : OFF }));
      taken.userData.set({ color: st.handoff ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Audience', options: AUD.map(a => a.n), get: () => st.aud, act: i => set({ aud: i }) },
      { type: 'toggle', label: 'A view per audience', short: 'Views', get: () => st.views, set: v => set({ views: !!v }) },
      { type: 'toggle', label: 'ADR with rejected alternatives', short: 'ADR', get: () => st.adr, set: v => set({ adr: !!v }) },
      { type: 'toggle', label: 'Owners named per decision', short: 'Owners', get: () => st.owners, set: v => set({ owners: !!v }) },
      { type: 'toggle', label: 'Handoff accepted, not sent', short: 'Handoff', get: () => st.handoff, set: v => set({ handoff: !!v }) },
    ];
    const readouts = [
      { label: 'Question answered', get: () => ({ v: R.answered ? 'yes' : 'no', sub: R.a.n, good: R.answered, bad: !R.answered }) },
      { label: 'Owners named', get: () => ({ v: st.owners ? '6 of 6' : '0 of 6', sub: 'per decision', good: st.owners, bad: !st.owners }) },
      { label: 'Gaps', get: () => ({ v: String(R.issues.length), sub: 'communication and lifecycle', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'v', t: 'One audience, one view', d: 'Teal seat: its question answered', icon: 'eye', atV: V(-2.3, 0.2, 0.35) },
      { name: 't', t: 'Named owners', d: 'One for each decision', icon: 'user', atV: V(1.4, 0.3, -0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Show everyone the component diagram', hint: 'nobody can find the decision', on: () => set({ ...D0, views: false }), off: reset },
      { label: 'Keep the decision in meeting memory', hint: 'the next team repeats it', on: () => set({ ...D0, adr: false }), off: reset },
      { label: 'Hand over a link', hint: 'nobody drilled the runbook', on: () => set({ ...D0, aud: 3, handoff: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>The ${R.a.n} view answers "${R.a.q}" from the same design everyone else sees through their own view.</b> The ADR keeps the rejected agent design and a reversal condition, six owners are named per decision, and operations accepted the handoff after drilling the runbook.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Communication and ownership are part of the architecture.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A diagram for all', home: true, say: 'An architect shows an executive group the full component diagram. Nobody can find the decision.', act: m => m.set({ aud: 0, views: false, adr: false, owners: false, handoff: false }) },
    { t: 'The executive view', home: true, say: 'Lead with the outcome, the options, the residual risk and the decision being asked for.', act: m => m.set({ aud: 0, views: true, adr: false, owners: false, handoff: false }) },
    { t: 'Write the ADR', home: true, say: 'Record the options, the rejected agent design and a condition for reversing the choice.', act: m => m.set({ aud: 0, views: true, adr: true, owners: false, handoff: false }) },
    { t: 'Engineering\'s view', home: true, say: 'Engineers get contracts, identity, errors, versions and release gates from the same design.', act: m => m.set({ aud: 1, views: true, adr: true, owners: false, handoff: false }) },
    { t: 'Name the owners', home: true, say: 'Not the AI team: name who owns tariff freshness, permissions, thresholds and incidents.', act: m => m.set({ aud: 3, views: true, adr: true, owners: true, handoff: false }) },
    { t: 'Accept the handoff', home: true, say: 'Operations drills the runbook and tests rollback before accepting the system.', act: m => m.set({ aud: 3, views: true, adr: true, owners: true, handoff: true }) },
  ],
  check: [
    { q: 'What should an executive review lead with?', options: ['The outcome, options, residual risk and the decision asked', 'The full component diagram', 'The prompt text'], answer: 0, why: 'Different decisions, not different truths.', hint: 'Try Show everyone the component diagram.' },
    { q: 'Why record rejected alternatives in an ADR?', options: ['So a future team knows which constraint a change would break', 'To make the ADR longer', 'For legal reasons only'], answer: 0, why: 'Otherwise the analysis is repeated.', hint: 'Try Keep the decision in meeting memory.' },
    { q: 'When is a handoff complete?', options: ['When the receiving team can operate and change it safely', 'When the link is sent', 'When the pilot starts'], answer: 0, why: 'Drilled runbooks, tested rollback.', hint: 'Try Hand over a link.' },
  ],
  practice: [
    { q: 'Which belongs in an ADR?', options: ['Context, options, decision, consequences, rejected alternatives, reversal conditions', 'The meeting transcript', 'Every line of implementation', 'Only the final diagram'], answer: 0, why: 'Short enough to read, complete enough to revisit.' },
    { q: 'Who should accept a change\'s risk?', options: ['An authorised owner, separate from the person recommending it', 'Whoever wrote the code', 'The model', 'The newest team member'], answer: 0, why: 'Separate recommendation from acceptance.' },
    { q: 'A security reviewer asks where sensitive data moves. Which diagram?', options: ['A data-flow diagram', 'A deployment diagram', 'A sequence diagram', 'An org chart'], answer: 0, why: 'Each diagram answers one question.' },
    { q: 'An estimate of latency has not been measured. How should it appear?', options: ['As an estimate with stated confidence', 'As a fact', 'Removed', 'Doubled for safety'], answer: 0, why: 'Honest confidence.' },
    { q: '"The AI team owns it." What is missing?', options: ['Owners per decision: outcome, prompt, knowledge, permissions, thresholds, SLOs', 'A bigger team', 'A new logo', 'Nothing'], answer: 0, why: 'Ownership by decision.' },
    { q: 'User feedback suggests a prompt change. How should it reach production?', options: ['Through a versioned change review with evals and an owner', 'Straight to production', 'Through a chat message', 'It should not'], answer: 0, why: 'Connect feedback to versioned decisions.' },
  ],
  terms: [
    ['Stakeholder view', 'The same design shaped to one audience\'s question.'],
    ['ADR', 'A short record of a decision, its options, consequences and reversal conditions.'],
    ['Rejected alternative', 'An option considered and declined, with the reason.'],
    ['Reversal condition', 'Evidence that would make the team revisit the decision.'],
    ['Decision owner', 'The person authorised to accept a choice and its risk.'],
    ['Handoff acceptance', 'Criteria the receiving team checks before taking over.'],
  ],
  deeper: '<p><b>Contracts, not copies.</b> The packet should point to schemas, error categories, eval fixtures and release gates rather than repeat implementation.</p><p><b>Retirement.</b> Name who deprecates and retires the system, and what triggers it.</p><p><b>About this machine.</b> The utility and details are invented.</p>',
  code: {
    title: 'An ADR in a few lines',
    note: 'Written for this lesson.',
    text: `
# ADR-007: billing queries use a workflow, not an agent
Status: accepted · Owner: customer services head · Review: 2027-02-01
Context: 9 min median to a correct answer; read-only tools; tariff changes monthly
Options: augmented call · workflow (chosen) · adaptive agent
Decision: workflow with retrieval and a citation check; clerk fallback
Consequences: lower cost and full audit trail; new query types need a workflow change
Rejected: agent, for variable cost, a longer tail and a wider permission surface
Verify: 40 eval cases pass; P95 under 6 s in the canary
Reverse if: answers exceed 6 s for two weeks, or new query types exceed 20%
`,
  },
};
