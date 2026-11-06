// Exam prep, business discovery: an invented mobile-money operator in Kampala asks for "an agent that resolves every ticket". Discovery turns
// it into a decision with a measure (agent minutes per billing ticket, baseline 11, target 5 or less), a non-goal (the pilot recommends refunds
// but cannot execute them), a risk-based review boundary, and an SLI and SLO instead of a vague accuracy promise. The value model: agent minutes =
// reading and editing the draft + rewrites for rejected drafts + the share of drafts a senior reviews times review minutes. Figures are illustrative.
const BASE = 11, TARGET = 5, EDIT = 2.5, REWRITE = 8;

function run(o) {
  const share = o.risk ? 0.2 : 1;
  const mins = EDIT + (1 - o.acc / 100) * REWRITE + share * o.rev;
  const issues = [], short = [];
  if (!o.decision) { issues.push('"resolve every ticket" names no outcome, owner or measure, so nobody can say whether the pilot worked'); short.push('no measure'); }
  if (!o.nongoals) { issues.push('with no non-goals, the agent was wired to execute refunds, and a hard gate was crossed'); short.push('refunds executed'); }
  if (!o.slo) { issues.push('"95 percent accurate" has no population, label or response when missed, so it cannot be operated'); short.push('vague accuracy promise'); }
  if (o.decision && mins > TARGET) {
    if (!o.risk) { issues.push(`reviewing every draft moved the work to seniors: ${mins.toFixed(1)} agent minutes, above the target of ${TARGET}`); short.push('work moved to reviewers'); }
    else { issues.push(`${mins.toFixed(1)} agent minutes misses the target of ${TARGET}: too many drafts are rewritten or review takes too long`); short.push('target missed'); }
  }
  return { mins, share, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-business-discovery-requirements-and-slas',
  title: 'Exam prep: discovery, requirements and SLOs',
  description: 'A director asks for an agent that resolves every ticket. Turn that into a measured pilot with a shut refund gate, reviews by risk and a real SLO.',
  overview: 'Architecture starts with discovery, not with a model and a tool list. A request such as "an agent that resolves every ticket" sounds specific but hides the real questions: which tickets, what resolution means, which systems may change, what authority the system has, which latency users tolerate, and which actions need a person. Rewrite it as a decision with an owner and a measure: reduce agent minutes per billing ticket from a baseline to a target without any unsupported refunds, keeping approval for large refunds. Ask what outcome should change, who owns it, what action follows from the output, what a wrong or late answer costs and which constraints cannot be traded. Classify requirements as functional, quality, performance, security, safety, operability and lifecycle, which exposes contradictions such as "answer instantly" against "a three-source compliance review". Map the real workflow step by step; the highest-value change may be retrieval for one step, not an autonomous agent. Separate capability from value: a good draft only helps if total handling time falls after review. Human review needs a trigger, a reviewer, an evidence packet and a time budget; low-impact reversible drafts can proceed, high-impact actions need deterministic checks and authority, and medium risk can use sampling. Define an SLI (the measured signal), an SLO (the internal target over a window) and an SLA (a commitment with consequences); a bare accuracy percentage is not operational. Write non-goals down so scope cannot grow silently. This machine follows an invented mobile-money operator in Kampala; the figures are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'discovery', 'requirements', 'sli', 'slo', 'sla', 'non-goals', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.35, 0], dir: [0.05, 0.95, 1.15], half: 1.15, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { decision: true, nongoals: true, risk: true, slo: true, acc: 85, rev: 3 }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* tickets ride a belt past the five stations of the real workflow */
    const line = P.belt(V(-2.5, 0, 0), V(0.8, 0, 0), { w: 0.34, speed: 0.75 }); S.add(line);
    /* intake: the request as a decision with a measure, or a vague wish */
    const ask = P.lamp(GOOD, { h: 0.34, r: 0.1 }); ask.position.set(-2.25, 0, -0.42); S.add(ask);
    /* policy search: cited policies on a shelf */
    const policy = P.shelf(3, { cell: 0.17, levels: 2, lh: 0.17, d: 0.26 }); policy.position.set(-1.55, 0, -0.45); S.add(policy);
    policy.userData.set({ fill: Array(6).fill('#3D6BD6') });
    /* authority: the refund vault sits behind a shut gate, unless no non-goal was written */
    const vaultM = new THREE.MeshLambertMaterial({ color: SAF }), vault = P.box(0.42, 0.36, 0.3, '#fff', { r: 0.03, material: vaultM }); vault.position.set(-0.7, 0, -0.78); S.add(vault);
    const bar = P.gate(0.5, GOOD, { h: 0.42 }); bar.position.set(-0.7, 0, -0.42); S.add(bar);
    const leak = P.pipe([V(-0.7, 0.14, -0.02), V(-0.7, 0.2, -0.32), V(-0.7, 0.2, -0.64)], RED, { r: 0.035, n: 4 }); S.add(leak);
    /* draft: Claude writes, and a share of drafts are kept without rewrite */
    const drafter = P.robot('#3D6BD6', { scale: 0.62 }); drafter.position.set(0.02, 0, -0.42); S.add(drafter);
    /* review: five slots for every five drafts, filled gold when a senior must read them */
    const senior = P.robot('#7B6FA8', { scale: 0.62 }); senior.position.set(0.68, 0, -0.42); S.add(senior);
    const queue = P.shelf(5, { cell: 0.15, levels: 1, lh: 0.17, d: 0.22 }); queue.position.set(0.5, 0, 0.42); S.add(queue);
    /* agent minutes as two towers, with the target as a gold slab across them */
    const MH = 0.085, now = P.tower(0.34, 0.34, '#8A8577', { h: BASE * MH }), pilot = P.tower(0.34, 0.34, GOOD, { h: 1 });
    now.position.set(1.42, 0, 0); pilot.position.set(1.84, 0, 0); S.add(now, pilot);
    [now, pilot].forEach(t => t.userData.set({ cap: '' }));
    const tgt = P.box(0.92, 0.03, 0.46, SAF, { r: 0.01 }); tgt.position.set(1.63, TARGET * MH, 0); S.add(tgt);
    /* the SLO: an operable objective lights its lamp, a vague promise does not */
    const slo = P.lamp(GOOD, { h: 0.2, r: 0.09 }); slo.position.set(-0.7, 0, 0.42); S.add(slo);
    S.add(P.keep(-2.65, 2.1, 1.15, -1.0, 0.65));
    const parts = [line, leak, drafter, senior, now, pilot, bar];
    let clock = 0;

    let R = null;
    function draw() {
      R = run(st);
      ask.userData.set({ color: st.decision ? GOOD : RED, on: true });
      bar.visible = !!st.nongoals; leak.visible = !st.nongoals; vaultM.color.set(st.nongoals ? SAF : RED);
      queue.userData.set({ fill: Array.from({ length: 5 }, (_, i) => i < Math.round(R.share * 5) ? SAF : OFF) });
      pilot.userData.set({ h: Math.min(12.5, R.mins) * MH, color: R.mins <= TARGET ? GOOD : RED });
      slo.userData.set({ color: st.slo ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'State the request as a decision with a measure', short: 'Decision', get: () => st.decision, set: v => set({ decision: !!v }) },
      { type: 'toggle', label: 'Write the non-goals', short: 'Non-goals', get: () => st.nongoals, set: v => set({ nongoals: !!v }) },
      { type: 'toggle', label: 'Review by risk, plus a sample', short: 'Risk review', get: () => st.risk, set: v => set({ risk: !!v }) },
      { type: 'toggle', label: 'Define an SLI and SLO', short: 'SLI and SLO', get: () => st.slo, set: v => set({ slo: !!v }) },
      { type: 'slider', label: 'Drafts kept without rewrite', min: 50, max: 95, step: 5, fmt: v => `${v}%`, get: () => st.acc, set: v => set({ acc: +v }) },
      { type: 'slider', label: 'Minutes per senior review', min: 1, max: 6, step: 0.5, fmt: v => `${v} min`, get: () => st.rev, set: v => set({ rev: +v }) },
    ];
    const readouts = [
      { label: 'Agent minutes', get: () => ({ v: R.mins.toFixed(1), sub: `per ticket, was ${BASE}`, good: R.mins <= TARGET, bad: R.mins > TARGET }) },
      { label: 'Reviewed', get: () => ({ v: `${Math.round(R.share * 100)}%`, sub: 'of drafts' }) },
      { label: 'Open issues', get: () => ({ v: String(R.issues.length), sub: 'before architecture', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Agent minutes', d: 'Below the gold slab is the target', icon: 'target', atV: V(2.0, 0.5, 0) },
      { name: 'g', t: 'Refund vault', d: 'Teal gate: recommend, never execute', icon: 'hand', atV: V(-0.9, 0.3, -0.78) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the vague request', hint: 'no outcome, no measure', on: () => set({ ...D0, decision: false }), off: reset },
      { label: 'Drop the non-goals', hint: 'scope grows silently', on: () => set({ ...D0, nongoals: false }), off: reset },
      { label: 'Review every draft', hint: 'the work moves, it does not shrink', on: () => set({ ...D0, risk: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>The pilot cuts agent minutes per billing ticket from ${BASE} to ${R.mins.toFixed(1)}: Claude drafts, refunds are recommended but never executed, seniors review refunds and a 5% sample, and the SLO is 98% of drafts citing the active policy over seven days.</b>` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Discovery first: decision, non-goals, review boundary and an operable objective.` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.1) { clock = 0; line.userData.send(Math.random() * 100 < st.acc ? GOOD : SAF, { size: 0.18 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A vague request', home: true, say: 'A support director asks for an agent that resolves every ticket. It sounds specific, but it is not.', act: m => m.set({ decision: false, nongoals: false, risk: false, slo: false, acc: 85, rev: 3 }) },
    { t: 'A decision', home: true, say: 'Rewrite it as an outcome with an owner and a measure: agent minutes per billing ticket.', act: m => m.set({ decision: true, nongoals: false, risk: false, slo: false, acc: 85, rev: 3 }) },
    { t: 'Non-goals', home: true, say: 'The pilot recommends refunds but cannot execute them. Write that down.', act: m => m.set({ decision: true, nongoals: true, risk: false, slo: false, acc: 85, rev: 3 }) },
    { t: 'Value after review', home: true, say: 'Reviewing every draft moves the work to seniors. Review by risk, plus a random sample.', act: m => m.set({ decision: true, nongoals: true, risk: true, slo: false, acc: 85, rev: 3 }) },
    { t: 'An SLO, not a slogan', home: true, say: 'Replace "ninety-five percent accurate" with a measured signal and a target over a window.', act: m => m.set({ decision: true, nongoals: true, risk: true, slo: true, acc: 85, rev: 3 }) },
    { t: 'Test the assumption', home: true, say: 'If fewer drafts are kept, the value disappears. Measure it before you build.', act: m => m.set({ decision: true, nongoals: true, risk: true, slo: true, acc: 60, rev: 3 }) },
  ],
  check: [
    { q: 'What should discovery turn a broad request into?', options: ['A decision with an owner and a measure', 'A model and tool list', 'A longer feature list'], answer: 0, why: 'Then you know what to measure and what not to automate.', hint: 'Try Keep the vague request.' },
    { q: 'Why can reviewing every draft destroy the value?', options: ['The work moves to reviewers instead of shrinking', 'Reviews make drafts worse', 'Reviewers are always wrong'], answer: 0, why: 'Value is total time after review.', hint: 'Try Review every draft.' },
    { q: 'What do non-goals protect against?', options: ['Silent scope growth, such as executing refunds', 'Slow models', 'High costs only'], answer: 0, why: 'A disagreement about a non-goal is a decision to own.', hint: 'Try Drop the non-goals.' },
  ],
  practice: [
    { q: 'Which is an SLO?', options: ['At least 98% of drafts cite the active policy over seven days', 'The percentage of drafts citing the active policy', 'A contract promising replies within a support window', '"The model is 95% accurate"'], answer: 0, why: 'SLI is the signal, SLO the target, SLA the commitment.' },
    { q: '"Answer instantly" and "a three-source compliance review" appear in the same brief. What has classification revealed?', options: ['A conflict between performance and quality requirements to resolve', 'Nothing important', 'A need for a bigger model', 'A security requirement'], answer: 0, why: 'Classes expose contradictions.' },
    { q: 'Where might the highest-value change be in a support workflow?', options: ['Wherever the real workflow shows delay or rework, maybe retrieval for one step', 'Always a fully autonomous agent', 'Always the final reply', 'Always intake'], answer: 0, why: 'Map the real work first.' },
    { q: 'What must a human review step define?', options: ['Trigger, reviewer, evidence packet, time budget and fallback', 'Only the reviewer\'s name', 'Nothing: a person makes it safe', 'A model to replace the reviewer'], answer: 0, why: 'Review is not a universal safety answer.' },
    { q: 'A value hypothesis has a baseline no one has measured. What should happen?', options: ['Label it an assumption with an owner and a date to verify it', 'Use it as fact', 'Remove the baseline', 'Start building anyway'], answer: 0, why: 'Do not hide uncertainty in a diagram.' },
    { q: 'Which action can usually proceed without review?', options: ['A low-impact, reversible draft', 'An irreversible account closure', 'A large refund', 'A change of account owner'], answer: 0, why: 'Impact and reversibility set the boundary.' },
  ],
  terms: [
    ['Decision-shaped statement', 'An outcome with an owner, a measure and guardrails.'],
    ['Requirement classes', 'Functional, quality, performance, security, safety, operability, lifecycle.'],
    ['Non-goal', 'Something the release will deliberately not do.'],
    ['SLI', 'The measured signal.'],
    ['SLO', 'An internal target for the signal over a window.'],
    ['SLA', 'A commitment with business or contractual consequences.'],
  ],
  deeper: '<p><b>A value hypothesis.</b> For a team, changing one step with a bounded capability will move a measure from a baseline to a target without breaking a guardrail; every field is evidence or a labelled assumption.</p><p><b>Indicators for AI systems.</b> Track task quality, performance, economics, safety and operations, not accuracy alone.</p><p><b>About this machine.</b> The operator and figures are invented.</p>',
  code: {
    title: 'A value model you can argue with',
    note: 'Written for this lesson.',
    text: `
def agent_minutes(kept, review_share, review_min, edit=2.5, rewrite=8.0):
    """Minutes of agent time per ticket once drafts and review are counted."""
    return edit + (1 - kept) * rewrite + review_share * review_min

baseline, target = 11.0, 5.0
for share in (1.0, 0.2):                    # every draft, or refunds plus a 5% sample
    m = agent_minutes(kept=0.85, review_share=share, review_min=3.0)
    print(f"review {share:.0%}: {m:.1f} min", "ok" if m <= target else "misses target")
`,
  },
};
