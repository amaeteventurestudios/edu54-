// Exam prep, end-to-end architecture: an invented legal-services firm in Dar es Salaam runs four jobs: tagging incoming email, reviewing a
// contract, investigating a failing document import and a due-diligence sweep across many contracts with independent review. Each job has a
// smallest fitting pattern (augmented call, workflow, agent, multi-agent). A smaller pattern cannot do the job; a bigger one costs more and is
// harder to audit. Invariants enforced in code and contracts at handoffs are structural; a larger model cannot replace them. Calls, latency
// and cost per successful task (relative) are illustrative.
const PAT = [
  { k: 'call', n: 'augmented call', calls: 1, p50: 3, p95: 6, cost: 1 },
  { k: 'flow', n: 'workflow', calls: 6, p50: 20, p95: 45, cost: 4 },
  { k: 'agent', n: 'agent', calls: 14, p50: 70, p95: 260, cost: 11 },
  { k: 'multi', n: 'multi-agent system', calls: 26, p50: 110, p95: 340, cost: 20 },
];
const JOBS = [
  { n: 'tag incoming email', s: 'tag email', need: 0, why: 'one turn holds all the evidence' },
  { n: 'review one contract', s: 'review contract', need: 1, why: 'the steps are known and each needs a contract and an audit trail' },
  { n: 'investigate a failing import', s: 'investigate import', need: 2, why: 'what it finds decides the next step' },
  { n: 'run due diligence on 40 contracts', s: 'due diligence', need: 3, why: 'the contracts split cleanly and review must be independent' },
];

const an = n => (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n;

function run(o) {
  const j = JOBS[o.job], p = PAT[o.pat];
  const issues = [], short = [];
  if (o.pat < j.need) { issues.push(`${an(p.n)} cannot ${j.n}: ${j.why}`); short.push('pattern too small'); }
  if (o.pat > j.need) { issues.push(`${an(p.n)} is more than it takes to ${j.n} (${j.why}, so ${an(PAT[j.need].n)}): more calls, a longer tail and a wider surface to audit`); short.push('over-built'); }
  if (!o.code && j.need >= 1) { issues.push('jurisdiction and policy version were only asked for in the prompt, and a contract from an unsupported jurisdiction got through'); short.push('rules only in prompt'); }
  if (!o.handoff && j.need >= 1) { issues.push('handoffs carry no clause IDs or spans, so rejecting one finding discards all the work and reviewers cannot trace a change'); short.push('no handoff contracts'); }
  if (o.big) { issues.push(issues.length ? 'the larger model polished the prose, but the structural faults remain' : 'the larger model costs more and no evaluation shows it is needed'); short.push('larger model'); }
  const retry = (o.handoff || j.need === 0 ? 1 : 1.6);
  const cost = p.cost * retry * (o.big ? 3 : 1);
  return { j, p, cost, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-end-to-end-architecture-and-value-tradeoffs',
  title: 'Exam prep: end-to-end architecture and tradeoffs',
  description: 'Four jobs, four patterns: an augmented call, a workflow, an agent, a team. Pick the smallest that fits, then enforce the rules where a model cannot bend them.',
  overview: 'An end-to-end architecture is the whole loop: input and identity, validation, trusted context, reasoning, tools, output validation, approval, action, evidence and feedback. For every edge ask what data crosses, which identity applies, which contract is enforced, what happens on timeout or partial failure, what evidence is kept and who owns the next decision. Then choose the smallest pattern that fits. An augmented call (one request with selected context, retrieval or a tool) suits classification, extraction or drafting when one turn holds the evidence; it is cheapest and easiest to evaluate. A deterministic workflow lets code control the sequence and call Claude at chosen steps; it suits stable processes where auditability matters. An adaptive agent chooses its next action from observations, which suits open-ended investigation but brings variable cost, a long latency tail and a larger permission surface. A multi-agent system pays for coordination only when partitioned context, parallelism or independent review is required. Decompose around contracts: stable clause IDs and spans, versioned evidence and schema-checked findings let one failure be retried without redoing accepted work. If a condition is a stable predicate over trusted data, such as jurisdiction, policy version or a maximum amount, enforce it in code; prompts guide but do not create a boundary. Budget the whole trajectory, including retries and human minutes, and optimise cost per successful task. Treat latency as a distribution, with P50, P95 and timeout rate. A larger model can improve prose without fixing provenance, authority or ownership. This machine follows an invented firm in Dar es Salaam; the figures are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'architecture', 'workflow vs agent', 'multi-agent', 'tradeoffs', 'latency', 'cost per task', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.3, -0.15], dir: [0.05, 0.95, 1.15], half: 1.15, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { job: 1, pat: 1, code: true, handoff: true, big: false }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the job as a stack: the harder the job, the taller the pile it brings */
    const job = P.stack(0.46, 0.46, 0.17, { max: 4, color: '#3D6BD6' }); job.position.set(-2.55, 0, 0.3); S.add(job);
    /* the four patterns as cost towers, one robot on a pad for the pattern in use */
    const pads = PAT.map((p, i) => {
      const x = -1.6 + i * 0.9, m = new THREE.MeshLambertMaterial({ color: OFF });
      const pad = P.box(0.7, 0.05, 0.7, '#fff', { r: 0.04, material: m }); pad.position.set(x, 0, 0.3); S.add(pad);
      const tw = P.tower(0.3, 0.3, OFF, { h: p.cost * 0.05 }); tw.userData.set({ cap: '' }); tw.position.set(x, 0.05, 0.3); S.add(tw);
      return { m, tw };
    });
    /* the loop: requests ride a belt through a validation gate in code, past handoff lamps, to Claude */
    const line = P.belt(V(-2.75, 0, -0.75), V(1.6, 0, -0.75), { w: 0.34, speed: 0.8 }); S.add(line);
    const check = P.gate(0.5, GOOD, { h: 0.42 }); check.rotation.y = Math.PI / 2; check.position.set(-1.5, 0, -0.75); S.add(check);
    const links = [-0.75, 0.0].map(x => { const l = P.lamp(GOOD, { h: 0.16, r: 0.08 }); l.position.set(x, 0, -1.08); S.add(l); return l; });
    const model = P.robot('#3D6BD6', { scale: 0.62 }); model.position.set(0.72, 0, -1.08); S.add(model);
    S.add(P.keep(-2.9, 1.75, 1.15, -1.3, 0.75));
    const parts = [line, model, ...pads.map(p => p.tw)];
    let clock = 0, odd = false;

    let R = null;
    function draw() {
      R = run(st);
      job.userData.set({ n: R.j.need + 1 });
      pads.forEach((pd, i) => {
        const sel = i === st.pat, best = i === R.j.need;
        pd.m.color.set(best ? '#BFE3D9' : '#E4DED2');
        pd.tw.userData.set({ color: sel ? (best ? GOOD : RED) : OFF });
      });
      check.visible = !!st.code;
      links.forEach(l => l.userData.set({ color: st.handoff ? GOOD : RED, on: true }));
      model.scale.setScalar(st.big ? 1.45 : 1); model.userData.set({ color: st.big ? SAF : '#3D6BD6', busy: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Job', options: JOBS.map(j => j.s), get: () => st.job, act: i => set({ job: i, pat: JOBS[i].need }) },
      { type: 'buttons', label: 'Pattern', options: PAT.map(p => p.n), get: () => st.pat, act: i => set({ pat: i }) },
      { type: 'toggle', label: 'Enforce invariants in code', short: 'Rules in code', get: () => st.code, set: v => set({ code: !!v }) },
      { type: 'toggle', label: 'Contracts at every handoff', short: 'Handoff contracts', get: () => st.handoff, set: v => set({ handoff: !!v }) },
      { type: 'toggle', label: 'Switch to a larger model', short: 'Larger model', get: () => st.big, set: v => set({ big: !!v }) },
    ];
    const readouts = [
      { label: 'P95 latency', get: () => ({ v: `${R.p.p95}s`, sub: `P50 ${R.p.p50}s` }) },
      { label: 'Cost per success', get: () => ({ v: `${R.cost.toFixed(1)}×`, sub: 'against one call', good: R.ok, bad: !R.ok && R.cost > PAT[R.j.need].cost * 1.2 }) },
      { label: 'Faults', get: () => ({ v: String(R.issues.length), sub: 'pattern and structure', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Cost per pattern', d: 'Teal tower: the smallest fit', icon: 'scale', atV: V(1.3, 0.3, 0.3) },
      { name: 'g', t: 'Rule in code', d: 'Gone: a bad contract gets through', icon: 'hand', atV: V(-1.5, 0.3, -0.98) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Tag email with a multi-agent system', hint: 'coordination costs more than it saves', on: () => set({ ...D0, job: 0, pat: 3 }), off: reset },
      { label: 'Put the rules only in the prompt', hint: 'a prompt is not a boundary', on: () => set({ ...D0, code: false }), off: reset },
      { label: 'Reach for a larger model', hint: 'structure, not capability', on: () => set({ ...D0, handoff: false, big: true }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>To ${R.j.n}, ${an(R.p.n)} is the smallest fit: ${R.j.why}.</b> ${R.j.need ? 'Jurisdiction and version are checked in code and each handoff carries clause IDs and spans. ' : ''}P95 is ${R.p.p95} seconds and a successful task costs ${R.cost.toFixed(1)}× a single call.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Choose the simplest architecture that meets the requirement; fix structure before patching prompts.` };
    }
    return { update: dt => {
      clock += dt;
      if (clock > 1) { clock = 0; odd = !odd; const c = st.code || !odd; line.userData.send(odd ? '#E07A5F' : GOOD, { size: 0.18, stop: c && odd ? 0.26 : 1 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One giant prompt', home: true, say: 'A contract assistant crams everything into one call. The demo works, production does not.', act: m => m.set({ job: 1, pat: 0, code: false, handoff: false, big: false }) },
    { t: 'A workflow', home: true, say: 'The steps are known, so code runs the sequence and calls Claude where judgment is needed.', act: m => m.set({ job: 1, pat: 1, code: false, handoff: false, big: false }) },
    { t: 'Rules in code', home: true, say: 'Jurisdiction and policy version are stable predicates. Check them in code, not in the prompt.', act: m => m.set({ job: 1, pat: 1, code: true, handoff: false, big: false }) },
    { t: 'Contracts at handoffs', home: true, say: 'Clause IDs and spans let one finding be retried without redoing the rest.', act: m => m.set({ job: 1, pat: 1, code: true, handoff: true, big: false }) },
    { t: 'An agent when needed', home: true, say: 'Investigating a failing import is open-ended, so an agent earns its longer tail.', act: m => m.set({ job: 2, pat: 2, code: true, handoff: true, big: false }) },
    { t: 'The smallest fit', home: true, say: 'Tagging email needs one call. Anything bigger costs more for nothing.', act: m => m.set({ job: 0, pat: 0, code: true, handoff: true, big: false }) },
  ],
  check: [
    { q: 'Which pattern suits a stable, known, auditable process?', options: ['A deterministic workflow', 'A multi-agent system', 'An adaptive agent'], answer: 0, why: 'Code controls the sequence.', hint: 'Try the review contract job.' },
    { q: 'Where should a rule like "only supported jurisdictions" be enforced?', options: ['In code, over trusted data', 'In the system prompt', 'By a larger model'], answer: 0, why: 'Prompts guide; they are not boundaries.', hint: 'Try Put the rules only in the prompt.' },
    { q: 'What does a larger model not fix?', options: ['Missing provenance, authority and handoff contracts', 'Prose quality', 'Some reasoning errors'], answer: 0, why: 'Structure, not capability.', hint: 'Try Reach for a larger model.' },
  ],
  practice: [
    { q: 'A classification task fits in one turn with all its evidence. Which pattern?', options: ['An augmented model call', 'A multi-agent system', 'An adaptive agent', 'A deterministic workflow with six steps'], answer: 0, why: 'The smallest pattern that fits.' },
    { q: 'What should a system optimise for cost?', options: ['Cost per successful task, including retries and review', 'Cost per call', 'Input tokens only', 'Output tokens only'], answer: 0, why: 'Budget the whole trajectory.' },
    { q: 'Which latency figures belong in an architecture decision?', options: ['P50, P95 and timeout rate', 'The average only', 'The fastest run', 'None'], answer: 0, why: 'Users feel the tail.' },
    { q: 'When does a multi-agent design pay for its coordination?', options: ['When partitioned context, parallelism or independent review is required', 'Whenever the diagram should look mature', 'Always', 'Never'], answer: 0, why: 'Coordination has a cost.' },
    { q: 'Why decompose a contract review into steps with clause IDs and spans?', options: ['So one failure can be retried without redoing accepted work', 'To use more tokens', 'To avoid evaluation', 'Because agents need many steps'], answer: 0, why: 'Contracts localise failures.' },
    { q: 'A weighted score favours an option that violates a hard safety constraint. What happens?', options: ['It is rejected: hard constraints cannot be averaged away', 'It wins on points', 'The weights are adjusted until it passes', 'It goes to production with a warning'], answer: 0, why: 'Gates, not averages.' },
  ],
  terms: [
    ['Augmented call', 'One request with selected context, retrieval or a tool.'],
    ['Deterministic workflow', 'Code controls the sequence and calls Claude at chosen steps.'],
    ['Adaptive agent', 'Claude chooses the next action from observations until it stops.'],
    ['Handoff contract', 'The schema, IDs and evidence a step must pass on.'],
    ['Cost per success', 'All calls, retries, tools and review minutes divided by successful tasks.'],
    ['P95 latency', 'The time within which 95 percent of tasks finish.'],
  ],
  deeper: '<p><b>Feedback as a product surface.</b> Store input class, versions, evidence IDs, tool errors, human edits with reasons and the downstream outcome, so feedback leads to a decision.</p><p><b>Parallelism.</b> Parallel calls that share one rate limit or need serial reconciliation can add cost without cutting time.</p><p><b>About this machine.</b> The firm and figures are invented.</p>',
  code: {
    title: 'A workflow with invariants in code',
    note: 'Written for this lesson.',
    text: `
def review_contract(doc, user):
    require(user.can_review(doc.client))                  # identity, in code
    require(doc.jurisdiction in SUPPORTED)                # invariant, in code
    clauses = segment(doc)                                # stable IDs and spans
    evidence = retrieve_policy(doc.jurisdiction, version=ACTIVE)
    findings = [analyse(c, evidence) for c in clauses]    # Claude, schema-checked
    accepted = independent_review(findings, evidence)     # rejects single findings
    redline = draft_redline(accepted)
    return send_for_approval(redline, owner="counsel", evidence=accepted)
`,
  },
};
