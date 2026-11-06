// Exam prep, architect professional capstone: an invented pan-African retailer's support team handles 40,000 tickets a week in English,
// French and Swahili, with an 11-minute median first response and a past automation that refunded beyond staff authority. Three options are
// compared on the same golden set: retrieval drafting with full human review, a deterministic workflow with bounded model steps, and an
// adaptive agent. Hard gates (first response, policy-correct answers per language stratum, zero unsafe refunds, P95) cannot be averaged away
// by a weighted score; refund approval is bound to principal, amount, account, expiry and single use; rollout needs a rehearsed rollback.
// All figures are illustrative.
const OPTS = [
  { n: 'drafting + full review', fr: 8, q: [96, 95, 95], unsafe: [0, 0], p95: 5, score: 74 },
  { n: 'bounded workflow', fr: 2.5, q: [96, 94, 93], unsafe: [3, 0], p95: 6, score: 86 },
  { n: 'adaptive agent', fr: 2, q: [96, 93, 86], unsafe: [5, 2], p95: 14, score: 89 },
];
const LANGS = ['English', 'French', 'Swahili'];
const STAGES = ['shadow', 'canary 5%', 'expand 25%', 'full'];
const G = { fr: 3, q: 92, p95: 8 };

function run(o) {
  const x = OPTS[o.opt];
  const agg = Math.round((x.q[0] * 0.6 + x.q[1] * 0.25 + x.q[2] * 0.15) * 10) / 10;
  const worst = Math.min(...x.q), worstL = LANGS[x.q.indexOf(worst)];
  const unsafe = x.unsafe[o.approval ? 1 : 0];
  const gates = [
    { n: 'first response', v: `${x.fr} min`, pass: x.fr <= G.fr, lim: `≤ ${G.fr} min` },
    { n: o.strata ? 'worst language' : 'all tickets, averaged', v: `${o.strata ? worst : agg}%`, pass: (o.strata ? worst : agg) >= G.q, lim: `≥ ${G.q}%` },
    { n: 'unsafe refunds per 10k', v: String(unsafe), pass: unsafe === 0, lim: '0' },
    { n: 'P95 draft latency', v: `${x.p95} s`, pass: x.p95 <= G.p95, lim: `≤ ${G.p95} s` },
  ];
  const gatesPass = gates.every(g => g.pass);
  const hiddenFail = !o.strata && worst < G.q;
  const release = o.hard ? gatesPass : x.score >= 80;
  const stageOk = o.stage === 0 || o.rollback;
  const ok = o.opt === 1 && o.hard && o.strata && o.approval && o.rollback && gatesPass;
  return { x, agg, worst, worstL, unsafe, gates, gatesPass, hiddenFail, release, stageOk, ok };
}

export default {
  slug: 'exam-architect-professional-system-capstone',
  title: 'Exam prep capstone: a production system you can prove',
  description: 'A multi-region support team weighs three options on one golden set. Prove the choice with hard gates, by language, then climb the rollout stairs.',
  overview: 'The professional capstone asks for the best system under the constraints and the evidence that it is ready, not maximum autonomy. The scenario: a support team handles 40,000 tickets a week across regions and languages, with an 11-minute median first response, weekly policy changes, inconsistent citations and a past automation that refunded beyond staff authority. The system may classify, retrieve current policy, read bounded account context, draft replies and recommend actions; it must not delete accounts, and refund execution needs explicit authority and fresh approval. The packet has ten connected artifacts: a discovery brief that separates first response from resolution, system completion from policy-correct success, recommendation from execution and facts from estimates; options and ADRs comparing drafting with full review, a bounded workflow and an adaptive agent; system views where every edge states schema, identity, timeout, retry, evidence and owner; a model, prompt and context plan; a knowledge and RAG design with its own retrieval evaluation; integration and identity with least privilege at four levels and refund approval bound to principal, amount, account, reason, expiry and single use; evaluation evidence including strata by region and language and hard gates that cannot be averaged away; governance with a risk register, data map and control matrix; rollout through shadow, canary and guarded expansion with known-safe rollback and tabletop exercises; and a stakeholder and handoff package where the receiving team demonstrates monitoring, safe shutdown, rollback and escalation. One evidence chain runs through it all: requirement, decision, contract or control, test and evidence, release gate. The retailer and figures are invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'capstone', 'architecture packet', 'release gates', 'stratified evaluation', 'rollout', 'refund approval', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { opt: 1, stage: 1, hard: true, strata: true, approval: true, rollback: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* three options as lanes: a pad, four hard-gate lamps and a tower for the weighted score */
    const Z = j => -0.75 + j * 0.56;
    const lanes = OPTS.map((o, j) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), pad = P.box(2.5, 0.04, 0.44, '#fff', { r: 0.03, material: m }); pad.position.set(-1.05, 0, Z(j)); S.add(pad);
      const lamps = [0, 1, 2, 3].map(r => { const l = P.lamp(GOOD, { h: 0.12, r: 0.09 }); l.position.set(-2.0 + r * 0.36, 0.04, Z(j)); S.add(l); return l; });
      const score = P.tower(0.3, 0.26, '#3D6BD6', { h: o.score / 100 * 0.5 }); score.userData.set({ cap: '' }); score.position.set(-0.32 + j * 0.2, 0.04, Z(j)); S.add(score);
      return { m, lamps, score };
    });
    /* the rollout stairs, with the release robot on its current step */
    const stairs = STAGES.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.08 + i * 0.1, 0.5, '#fff', { r: 0.02, material: m }); b.position.set(0.6 + i * 0.38, 0, -0.3); S.add(b); return { m, b, h: 0.08 + i * 0.1 }; });
    const crew = P.robot('#7B6FA8', { scale: 0.5 }); crew.userData.noFit = true; S.add(crew);
    /* the refund approval: a key bound to one action, and a lamp for the rehearsed rollback */
    const bound = P.gate(0.46, GOOD, { h: 0.36 }); bound.position.set(0.95, 0, 0.45); S.add(bound);
    const back = P.lamp(GOOD, { h: 0.2, r: 0.09 }); back.position.set(1.65, 0, 0.45); S.add(back);
    S.add(P.keep(-2.4, 2.1, 1.0, -1.05, 0.7));
    const parts = [crew, ...lanes.map(l => l.score)];

    let R = null;
    function draw() {
      R = run(st);
      const all = OPTS.map((o, j) => run({ ...st, opt: j }));
      lanes.forEach((L, j) => {
        L.m.color.set(j === st.opt ? SAF : '#E4DED2');
        L.lamps.forEach((l, r) => l.userData.set({ color: all[j].gates[r].pass ? GOOD : RED, on: true }));
        L.score.userData.set({ color: st.hard ? OFF : j === st.opt && R.release ? SAF : '#3D6BD6' });
      });
      stairs.forEach((s, i) => s.m.color.set(i === st.stage ? (R.stageOk ? SAF : RED) : i < st.stage ? GOOD : OFF));
      crew.position.set(0.6 + st.stage * 0.38, stairs[st.stage].h, -0.3);
      bound.visible = !!st.approval;
      back.userData.set({ color: st.rollback ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Hard gates, not a weighted score', short: 'Hard gates', get: () => st.hard, set: v => set({ hard: !!v }) },
      { type: 'toggle', label: 'Stratify by language', short: 'Strata', get: () => st.strata, set: v => set({ strata: !!v }) },
      { type: 'toggle', label: 'Refund approval bound to the exact action', short: 'Bound approval', get: () => st.approval, set: v => set({ approval: !!v }) },
      { type: 'toggle', label: 'Rehearsed rollback before canary', short: 'Rollback', get: () => st.rollback, set: v => set({ rollback: !!v }) },
      { type: 'buttons', label: 'Option', options: OPTS.map(o => o.n), get: () => st.opt, act: i => set({ opt: i }) },
      { type: 'buttons', label: 'Rollout stage', options: STAGES, get: () => st.stage, act: i => set({ stage: i }) },
    ];
    const readouts = [
      { label: 'Hard gates', get: () => ({ v: `${R.gates.filter(g => g.pass).length} of 4`, sub: R.x.n, good: R.gatesPass, bad: !R.gatesPass }) },
      { label: 'Worst language', get: () => ({ v: `${R.worst}%`, sub: R.worstL, good: R.worst >= G.q, bad: R.worst < G.q }) },
      { label: 'Release', get: () => ({ v: R.ok ? 'go' : R.release && R.stageOk ? 'go?!' : 'held', sub: STAGES[st.stage], good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'g', t: 'Options against gates', d: 'Four lamps must all be teal', icon: 'scale', atV: V(-2.3, 0.2, -0.19) },
      { name: 't', t: 'Rollout stairs', d: 'No rehearsed rollback, no step up', icon: 'check', atV: V(1.9, 0.3, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Average the gates away', hint: 'the agent wins on points', on: () => set({ ...D0, opt: 2, hard: false }), off: reset },
      { label: 'Look only at the aggregate', hint: 'one language hides', on: () => set({ ...D0, opt: 2, strata: false, hard: false }), off: reset },
      { label: 'Approve refunds loosely', hint: 'beyond authority, again', on: () => set({ ...D0, approval: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>The bounded workflow passes all four hard gates: first response ${R.x.fr} minutes, ${R.worst}% policy-correct even in ${R.worstL}, zero unsafe refunds with bound approvals, and P95 ${R.x.p95} seconds.</b> Rollback is rehearsed, so it can go to the ${STAGES[st.stage]} stage.` };
      const f = [];
      if (st.opt === 0) f.push(`full human review keeps first response at ${R.x.fr} minutes, missing the ${G.fr}-minute target`);
      if (st.opt === 2) f.push(`the adaptive agent has the best weighted score (${R.x.score}) but P95 ${R.x.p95} seconds and ${R.x.q[2]}% in Swahili`);
      if (!st.hard && R.release && !R.gatesPass) f.push('a weighted score of 80 or more released it anyway: hard gates were averaged away');
      else if (!st.hard && R.gatesPass) f.push(`the release is decided by a weighted score: the ${R.x.n} happens to pass every gate, but a score of 80 or more would also release the agent`);
      if (R.hiddenFail) f.push(`the aggregate hides ${R.worstL} at ${R.worst}%`);
      else if (!st.strata && R.worst >= G.q) f.push('only the average across languages is checked: this candidate is fine in each, but a weak language would go unseen');
      if (!st.approval) f.push(`a generic approval flag let ${R.unsafe} refund${R.unsafe === 1 ? '' : 's'} per 10,000 go beyond staff authority`);
      if (!R.stageOk) f.push(`the ${STAGES[st.stage]} stage needs a known-safe rollback that has been rehearsed`);
      else if (!st.rollback) f.push('rollback was never rehearsed, so the canary cannot start');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Prove readiness with hard gates, strata, bound approvals and a rehearsed rollback.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three options', home: true, say: 'A support team compares drafting with full review, a bounded workflow and an adaptive agent on one golden set.', act: m => m.set({ opt: 0, stage: 0, hard: true, strata: true, approval: true, rollback: true }) },
    { t: 'Full review is slow', home: true, say: 'Drafting with full review is safe, but first response stays far above the target.', act: m => m.set({ opt: 0, stage: 0, hard: true, strata: true, approval: true, rollback: true }) },
    { t: 'The agent on points', home: true, say: 'A weighted score favours the agent. Hard gates show its tail and its weakest language.', act: m => m.set({ opt: 2, stage: 0, hard: true, strata: true, approval: true, rollback: true }) },
    { t: 'Look at every language', home: true, say: 'The aggregate looks fine. Split by language and the weakest group appears.', act: m => m.set({ opt: 2, stage: 0, hard: true, strata: false, approval: true, rollback: true }) },
    { t: 'Bind the approval', home: true, say: 'Refund approval names the person, amount, account and expiry, and is used once.', act: m => m.set({ opt: 1, stage: 0, hard: true, strata: true, approval: true, rollback: true }) },
    { t: 'Canary with rollback', home: true, say: 'The workflow passes every gate. With rollback rehearsed, the canary can start.', act: m => m.set({ opt: 1, stage: 1, hard: true, strata: true, approval: true, rollback: true }) },
  ],
  check: [
    { q: 'An option has the best weighted score but fails a hard safety gate. Release?', options: ['No: hard gates cannot be averaged away', 'Yes, the score is highest', 'Only on weekends'], answer: 0, why: 'Gates, not averages.', hint: 'Try Average the gates away.' },
    { q: 'Why stratify evaluation by language and region?', options: ['An aggregate can hide a failing group', 'To slow the release', 'It is not useful'], answer: 0, why: 'Strata reveal what averages hide.', hint: 'Try Look only at the aggregate.' },
    { q: 'What should a refund approval be bound to?', options: ['Principal, amount, account, reason, expiry and single use', 'A yes/no flag', 'The model\'s confidence'], answer: 0, why: 'Execute exactly what was approved.', hint: 'Try Approve refunds loosely.' },
  ],
  practice: [
    { q: 'Which pair must a discovery brief keep apart?', options: ['First-response time and total resolution time', 'Model and prompt', 'Logs and traces', 'Canary and shadow'], answer: 0, why: 'Distinguish the measures.' },
    { q: 'Before a canary, what must exist?', options: ['A known-safe rollback that has been rehearsed', 'A press release', 'Full rollout approval', 'A bigger model'], answer: 0, why: 'Every version needs a safe way back.' },
    { q: 'Which tabletop exercise fits this system?', options: ['Prompt injection through a ticket', 'A database migration on a laptop', 'A logo redesign', 'A marketing campaign'], answer: 0, why: 'Also stale policy, auth outage, evaluator drift.' },
    { q: 'When is the receiving team\'s handoff complete?', options: ['When they demonstrate monitoring, safe shutdown, rollback and escalation', 'When they receive the packet', 'When the pilot starts', 'When the architect leaves'], answer: 0, why: 'Acceptance is demonstrated.' },
    { q: 'Why include a multi-agent design only with justification?', options: ['Each context boundary must earn its coordination cost', 'Multi-agent is never allowed', 'It always wins', 'Graders prefer it'], answer: 0, why: 'More components do not earn more credit.' },
    { q: 'What links a requirement to a release?', options: ['Decision, contract or control, test and evidence, then a gate', 'A confident summary', 'A diagram only', 'A vendor claim'], answer: 0, why: 'One evidence chain.' },
  ],
  terms: [
    ['Architecture packet', 'Ten connected artifacts from discovery to handoff.'],
    ['Hard gate', 'A release condition that cannot be traded against other scores.'],
    ['Stratum', 'A slice such as one language or region, evaluated on its own.'],
    ['Bound approval', 'Approval tied to principal, amount, account, expiry and single use.'],
    ['Canary', 'A small share of real traffic that tries a release first.'],
    ['Evidence chain', 'Requirement, decision, control, test and gate, linked.'],
  ],
  deeper: '<p><b>Do not claim compliance.</b> State which questions need security, privacy, legal, compliance, finance or domain approval, and let those owners decide.</p><p><b>Freeze nothing unverified.</b> Record verification dates for model, price and product facts in the packet.</p><p><b>About this machine.</b> The retailer and figures are invented.</p>',
  code: {
    title: 'Hard gates before any score',
    note: 'Written for this lesson.',
    text: `
GATES = {
    "first_response_p50_min": lambda v: v <= 3,
    "policy_correct_min_stratum": lambda v: v >= 0.92,     # every language, not the average
    "unsafe_refunds_per_10k": lambda v: v == 0,
    "draft_p95_s": lambda v: v <= 8,
}

def release(candidate, stage):
    failed = [g for g, ok in GATES.items() if not ok(candidate.metrics[g])]
    if failed:
        return ("hold", failed)                             # a high score cannot buy these back
    if stage != "shadow" and not candidate.rollback_rehearsed:
        return ("hold", ["rollback"])
    return ("go", [])
`,
  },
};
