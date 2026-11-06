// Exam prep, enterprise governance: an invented clinic network in Lusaka proposes a workflow that summarises patient messages, suggests a route
// and drafts a reply. Its design says "the model does not retain data, a human reviews everything, and it is compliant", which is not an
// architecture. Governance here is a data map across every store, minimisation before protection, a control matrix with owners and tests,
// human review designed as a control (qualified reviewer, evidence first, reason codes, a time budget, a fallback) and review matched to risk.
// Queue arithmetic: 120 messages an hour, three nurses, three careful minutes a review. Figures are illustrative; this is not legal advice.
const MSG = 120, NURSES = 3, CAREFUL = 3;
const STORES = ['prompt', 'Claude API', 'tools', 'logs, traces', 'review tool', 'eval set'];

function run(o) {
  const fields = o.minimize ? 4 : 9;
  const reviewed = o.tier ? MSG * 0.15 + MSG * 0.85 * 0.05 : MSG;
  const capacity = NURSES * 60 / CAREFUL;
  const rubber = reviewed > capacity;
  const perReview = rubber ? NURSES * 60 / reviewed : CAREFUL;
  const catchRate = !o.design ? (rubber ? 0.2 : 0.5) : rubber ? 0.35 : 0.9;
  const urgentWait = o.tier ? 4 : 50;
  const owned = o.owners ? 6 : 1;
  const issues = [], short = [];
  if (!o.minimize) { issues.push('national ID, full address and next of kin enter the prompt though routing needs none of them'); short.push('9 fields, 4 needed'); }
  if (!o.map) { issues.push('nobody mapped the logs: full messages sit in plaintext traces for a year, outside the review'); short.push('logs unmapped'); }
  if (!o.owners) { issues.push('five of six controls have no owner or test, so they are hopes, not controls'); short.push('controls unowned'); }
  if (!o.design) { issues.push(`the claim "a human reviews everything" names no qualification, evidence or reason codes, so reviewers approve polished drafts and catch ${Math.round(catchRate * 100)}% of planted errors`); short.push('rubber-stamp review'); }
  if (!o.tier) { issues.push(`every message joins one queue: ${Math.round(reviewed)} reviews an hour against capacity for ${capacity}, ${Math.round(perReview * 60)} seconds each, and urgent messages wait ${urgentWait} minutes`); short.push('one queue, urgent waits'); }
  return { fields, reviewed, capacity, perReview, catchRate, urgentWait, owned, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-enterprise-governance-compliance-and-hitl',
  title: 'Exam prep: enterprise governance and human review',
  description: 'A clinic network claims no data is kept and a human checks everything. Map every store, trim the fields and size the review queue to the nurses.',
  overview: 'Statements such as "the model does not retain data", "all outputs are reviewed by a human" and "the system is compliant" are not an architecture. Data can appear in API payloads, files, caches, batch storage, logs, traces, support systems, review tools and evaluation sets, and features can differ in retention and eligibility. Compliance depends on the use, contracts, configuration, region and legal analysis, so an architect builds a governed design and involves security, privacy, legal, clinical or compliance experts where required. Start from a risk decision: what the system influences, who can be helped or harmed, which data classes are involved, the error and abuse modes, reversibility, required authority, obligations and the owner who accepts residual risk. Map data along every edge and store: category and purpose, required fields, access, encryption, provider boundary, region, retention, use in evaluation and audit evidence. Minimise before protecting: remove fields the task does not need, pseudonymise or aggregate, restrict the feature boundary, limit retention and logs, then protect what remains; telling a model not to remember is not a retention control. Build a control matrix of preventive, detective, corrective and governance controls, each with an owner, implementation, evidence, test and review frequency; a control without an owner and a test is a hope. Design human review as a control: a trigger, a qualified reviewer, an evidence packet that shows sources before the generated conclusion, a decision with reason codes, a time budget and queue capacity, a fallback and an audit trail, so reviewers are not pushed into rubber-stamping. Match review to risk: sampled checks for low-risk drafts, threshold review for medium, qualified approval before high-impact actions, and hold-and-escalate for the unknown. Treat fairness in context, test slices, and give people a way to contest outcomes. This machine follows an invented clinic network in Lusaka; it teaches architecture judgment, not legal advice.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'governance', 'compliance', 'data map', 'human in the loop', 'control matrix', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.1, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { minimize: true, map: true, owners: true, design: true, tier: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* personal fields as a stack: four needed, five extra in red */
    const fields = P.stack(0.42, 0.42, 0.09, { max: 9 }); fields.position.set(-2.45, 0, -0.55); S.add(fields);
    /* the data runs through six stores, each lit by whether it is mapped */
    const flow = P.pipe([V(-2.2, 0.18, -0.55), V(-0.6, 0.18, -0.55), V(1.3, 0.18, -0.55)], '#3D6BD6', { r: 0.04, n: 7 }); S.add(flow);
    const stores = STORES.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.34, 0.36, 0.42, '#fff', { r: 0.03, material: m }); b.position.set(-1.85 + i * 0.62, 0, -0.55); S.add(b); return m; });
    /* the review queue as a tank: over capacity, it spills */
    const queue = P.tank(0.42, 0.62, 0.42, GOOD); queue.position.set(-2.1, 0.05, 0.3); S.add(queue);
    /* three nurses; bobbing fast means rubber-stamping */
    const nurses = [0, 1, 2].map(i => { const r = P.robot('#7B6FA8', { scale: 0.58 }); r.position.set(-1.25 + i * 0.42, 0, 0.3); S.add(r); return r; });
    /* the catch rate as a tower */
    const caught = P.tower(0.34, 0.34, GOOD, { h: 0.5 }); caught.userData.set({ cap: '' }); caught.position.set(0.1, 0, 0.3); S.add(caught);
    /* six controls: lit when they have an owner and a test */
    const ctrl = Array.from({ length: 6 }, (_, i) => { const l = P.lamp(OFF, { h: 0.14, r: 0.075 }); l.position.set(0.6 + (i % 3) * 0.3, 0, 0.14 + Math.floor(i / 3) * 0.34); S.add(l); return l; });
    S.add(P.keep(-2.7, 1.6, 0.95, -0.85, 0.65));
    const parts = [flow, queue, caught, ...nurses];

    let R = null;
    function draw() {
      R = run(st);
      fields.userData.set({ n: R.fields, colors: Array.from({ length: 9 }, (_, i) => i < 4 ? '#3D6BD6' : RED) });
      STORES.forEach((n, i) => stores[i].color.set((i === 0 || i === 2) ? (st.minimize ? GOOD : RED) : st.map ? GOOD : RED));
      queue.userData.set({ level: R.reviewed / R.capacity, color: R.reviewed > R.capacity ? RED : GOOD });
      nurses.forEach(r => r.userData.set({ busy: R.reviewed > R.capacity, color: st.design ? '#7B6FA8' : OFF }));
      caught.userData.set({ h: R.catchRate * 0.85, color: R.catchRate >= 0.85 ? GOOD : R.catchRate < 0.5 ? RED : SAF });
      ctrl.forEach((l, i) => l.userData.set({ color: i < R.owned ? GOOD : RED, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Minimise fields before protecting', short: 'Minimise', get: () => st.minimize, set: v => set({ minimize: !!v }) },
      { type: 'toggle', label: 'Map data through every store', short: 'Data map', get: () => st.map, set: v => set({ map: !!v }) },
      { type: 'toggle', label: 'Owner and test for every control', short: 'Owned controls', get: () => st.owners, set: v => set({ owners: !!v }) },
      { type: 'toggle', label: 'Design review as a control', short: 'Review design', get: () => st.design, set: v => set({ design: !!v }) },
      { type: 'toggle', label: 'Match review to risk', short: 'Review by risk', get: () => st.tier, set: v => set({ tier: !!v }) },
    ];
    const readouts = [
      { label: 'Personal fields', get: () => ({ v: `${R.fields} of 9`, sub: 'enter the system', good: R.fields <= 4, bad: R.fields > 4 }) },
      { label: 'Review catches', get: () => ({ v: `${Math.round(R.catchRate * 100)}%`, sub: 'of planted errors', good: R.catchRate >= 0.85, bad: R.catchRate < 0.5 }) },
      { label: 'Urgent wait', get: () => ({ v: `${R.urgentWait} min`, sub: 'for a nurse', good: R.urgentWait < 10, bad: R.urgentWait > 10 }) },
    ];
    const labels = [
      { name: 'd', t: 'The data map', d: 'Red: a store outside the review', icon: 'box', atV: V(1.5, 0.2, -0.55) },
      { name: 't', t: 'Review queue', d: 'It spills past nurse capacity', icon: 'user', atV: V(-2.3, 0.3, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send every field', hint: 'protect what you never needed?', on: () => set({ ...D0, minimize: false }), off: reset },
      { label: 'Review everything in one queue', hint: 'capacity sets the real review', on: () => set({ ...D0, tier: false }), off: reset },
      { label: 'Leave the logs unmapped', hint: 'data lives beyond the API', on: () => set({ ...D0, map: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Only 4 of 9 fields enter, pseudonymised; logs are hashed and kept 30 days; each of 6 controls has an owner and a test; a nurse approves urgent clinical routes from sources first with reason codes, admin replies are sampled, and urgent messages wait ${R.urgentWait} minutes.</b> The design goes to privacy, clinical and legal experts with its evidence.` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> A vendor claim, a prompt or generic review is not governance.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three claims', home: true, say: 'A design says no data is kept, a human reviews everything and it is compliant. None of that is an architecture.', act: m => m.set({ minimize: false, map: false, owners: false, design: false, tier: false }) },
    { t: 'Minimise first', home: true, say: 'Routing needs four fields, not nine. Data you never send needs no protection.', act: m => m.set({ minimize: true, map: false, owners: false, design: false, tier: false }) },
    { t: 'Map every store', home: true, say: 'Data also lives in logs, traces, review tools and eval sets. Map retention and access for each.', act: m => m.set({ minimize: true, map: true, owners: false, design: false, tier: false }) },
    { t: 'Owners and tests', home: true, say: 'Each control gets an owner, evidence and a test. Without them, it is only a hope.', act: m => m.set({ minimize: true, map: true, owners: true, design: false, tier: false }) },
    { t: 'Review by risk', home: true, say: 'One queue swamps the nurses. Urgent clinical routes get a nurse, admin replies are sampled.', act: m => m.set({ minimize: true, map: true, owners: true, design: false, tier: true }) },
    { t: 'Review as a control', home: true, say: 'Show the sources before the draft and ask for reason codes, so review is not a rubber stamp.', act: m => m.set({ minimize: true, map: true, owners: true, design: true, tier: true }) },
  ],
  check: [
    { q: 'What comes before encrypting and monitoring personal data?', options: ['Removing fields the task does not need', 'Writing a longer prompt', 'Buying a bigger model'], answer: 0, why: 'Minimise before protecting.', hint: 'Try Send every field.' },
    { q: 'Why can "a human reviews everything" fail?', options: ['Queue capacity and design decide how careful review really is', 'Humans never catch errors', 'Review is always enough'], answer: 0, why: 'Review is a control with capacity and a packet.', hint: 'Try Review everything in one queue.' },
    { q: 'Where else, besides the API call, does data need mapping?', options: ['Logs, traces, review tools and eval sets', 'Nowhere', 'Only the database'], answer: 0, why: 'Every edge and store.', hint: 'Try Leave the logs unmapped.' },
  ],
  practice: [
    { q: 'A design says "we tell Claude not to remember patient data". What is wrong?', options: ['Configuration and contracts define retention, not a prompt', 'Nothing', 'The prompt is too short', 'Claude cannot read that instruction'], answer: 0, why: 'A prompt is not a retention control.' },
    { q: 'Which describes a governance control?', options: ['A named owner re-approves the use after a material change', 'A scope gate blocks a write', 'An alert on leaked fields', 'Rolling back a model route'], answer: 0, why: 'Preventive, detective, corrective, governance.' },
    { q: 'How can a review packet reduce automation bias?', options: ['Show source excerpts before the generated conclusion and ask for reason codes', 'Show only the polished draft', 'Hide the evidence', 'Pre-tick approve'], answer: 0, why: 'Give reviewers a reason to inspect.' },
    { q: 'A new use case has weak evidence and unknown risk. Which review pattern?', options: ['Hold, escalate and gather evidence', 'Sampled review', 'No review', 'Model confidence threshold'], answer: 0, why: 'Unknown risk is held.' },
    { q: 'Can the same model\'s confidence score act as the safety boundary?', options: ['No: use observable evidence, deterministic checks and qualified review', 'Yes, above 90%', 'Yes, for clinical work', 'Only at night'], answer: 0, why: 'Self-reported confidence is not a boundary.' },
    { q: 'An internal use of sensitive data is proposed. What should the architect assume?', options: ['Nothing: minimise, classify, verify policy and contract, involve the authority', 'It is allowed because it is internal', 'It is never allowed', 'The vendor handles it'], answer: 0, why: 'Internal is not automatically allowed.' },
  ],
  terms: [
    ['Data map', 'Category, purpose, access, region and retention for every edge and store.'],
    ['Minimisation', 'Removing or pseudonymising data the task does not need.'],
    ['Control matrix', 'Each control with type, owner, evidence, test and review cycle.'],
    ['Review packet', 'Sources, output, trajectory and flags given to the reviewer.'],
    ['Automation bias', 'Over-trusting a polished machine answer.'],
    ['Risk-matched review', 'Review effort set by impact, reversibility and evidence.'],
  ],
  deeper: '<p><b>Fairness in context.</b> Test representative slices and adverse cases, and give people an appeal or contest path.</p><p><b>Reassessment triggers.</b> Name what forces a re-approval: a new data class, region, feature, model route or a material incident.</p><p><b>About this machine.</b> The clinic network and figures are invented, and this is not legal advice.</p>',
  code: {
    title: 'A control is a record with an owner and a test',
    note: 'Written for this lesson.',
    text: `
CONTROLS = [
  {"id": "C1", "type": "preventive", "what": "scope gate on record writes",
   "owner": "platform", "test": "deny write outside assigned clinic", "review": "quarterly"},
  {"id": "C2", "type": "detective", "what": "sample outputs for leaked identifiers",
   "owner": "privacy", "test": "planted ID is flagged", "review": "monthly"},
  {"id": "C3", "type": "governance", "what": "re-approval after material change",
   "owner": "clinical lead", "test": "new data class blocks release", "review": "on change"},
]
assert all(c["owner"] and c["test"] for c in CONTROLS), "a control without both is a hope"
`,
  },
};
