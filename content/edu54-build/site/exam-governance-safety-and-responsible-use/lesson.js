// Exam prep, governance: an invented savings cooperative in Arusha gives Claude an assistant role for member support. Five requests arrive.
// Each must pass three separate gates: capability (can the system do it), permission (may this identity reach the data or tool) and authority
// (may this role make the decision). Data is classified before processing, the assistant's tools follow least privilege, inputs are minimised
// and consequential actions wait for a person. Each outcome follows from which controls are on.
const REQS = [
  { n: 'Summarise the public savings FAQ', cls: 'public', kind: 'read' },
  { n: 'Draft a reply using one member\'s record', cls: 'confidential', kind: 'draft' },
  { n: 'Approve a fee waiver for a member', cls: 'confidential', kind: 'decide' },
  { n: 'Send the reply to the member', cls: 'confidential', kind: 'act' },
  { n: 'Check a staff login by pasting the password', cls: 'restricted', kind: 'read' },
];
function run(o) {
  return REQS.map(r => {
    let outcome = 'done safely', harm = null, perm = true, auth = true;
    if (r.cls === 'restricted') { if (o.classify) { outcome = 'refused: restricted data'; perm = false; } else { outcome = 'done'; harm = 'a staff password is now in the prompt and the logs'; } }
    if (r.kind === 'draft') { if (!o.least) { harm = 'the assistant\'s tool could read every member\'s record'; } else if (!o.minimise) { harm = 'the full record, national ID number included, went into the prompt'; } else outcome = 'draft ready for staff'; }
    if (r.kind === 'decide') { auth = false; if (o.human) outcome = 'drafted; a loan officer approves'; else { outcome = 'approved by the assistant'; harm = 'the assistant approved a waiver it has no authority to grant'; } }
    if (r.kind === 'act') { auth = false; if (o.human) outcome = 'held until staff review it'; else { outcome = 'sent automatically'; harm = 'a message went to a member with no one checking it'; } }
    return { ...r, outcome, harm, perm, auth };
  });
}

export default {
  slug: 'exam-governance-safety-and-responsible-use',
  title: 'Exam prep: put authority around capability',
  description: 'A savings cooperative\'s assistant gets five requests it could do. Check each at three gates: can it, may it reach the data, and may it decide?',
  overview: 'Governance questions turn on keeping three things apart. Capability asks whether the system can perform an operation: Claude can certainly draft a waiver approval or a message to a customer. Permission asks whether this identity may reach the data or tool: a connector may have access to member records. Authority asks whether this role may make or carry out the decision: approving a waiver or sending a binding message may belong only to a loan officer. All three must pass, and capability and permission never imply authority. Start before any processing by classifying the data and the use: public, internal, confidential or restricted, using your organisation\'s real policy, and ask what data enters, for what approved purpose, who may see the input and output, what decision or action could follow and how long records are kept; if an answer is unknown, the next step is to clarify policy, not to generate. Restricted material such as secrets and passwords should never enter a prompt or a log. Give tools least privilege, only the data and actions the approved purpose needs, and separate reading, drafting, approving and executing where the consequence is meaningful. Minimise inputs: leave out names and identifiers that the task does not need, retrieve the relevant section instead of the whole record, and limit outputs to the fields the next step requires. Purpose limitation means data collected for one job is not automatically approved for another. Keep a person in the loop for consequential or irreversible actions, and keep records of what was considered and approved. Data handling terms and product controls differ by offering and change; check the current official terms.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'AI governance', 'least privilege', 'data minimisation', 'human in the loop', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.25, -0.05], dir: [0.05, 1.1, 1.05], half: 1.2, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { classify: true, least: true, minimise: true, human: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* the assistant, and five request lanes; each lane crosses three gate lamps (can it, may it reach the data, may it decide) and ends in an outcome block */
    const bot = P.robot(BLUE, { scale: 0.6 }); bot.position.set(-2.2, 0, -0.05); S.add(bot);
    const LZ = i => -0.82 + i * 0.38, GX = j => -1.2 + j * 0.6;
    const rows = REQS.map((r, i) => {
      const lane = P.box(2.7, 0.03, 0.14, '#D8D2C4', { r: 0.02 }); lane.position.set(-0.5, 0, LZ(i)); S.add(lane);
      const gates = [0, 1, 2].map(j => { const l = P.lamp(GOOD, { h: 0.16, r: 0.08 }); l.position.set(GX(j), 0, LZ(i)); S.add(l); return l; });
      const om = new THREE.MeshLambertMaterial({ color: GOOD }), ob = P.box(0.4, 0.26, 0.26, '#fff', { r: 0.04, material: om }); ob.position.set(0.95, 0, LZ(i)); S.add(ob);
      return { gates, om };
    });
    /* the loan officer who approves, there only when a person is in the loop */
    const staff = P.robot('#7B6FA8', { scale: 0.6 }); staff.position.set(1.55, 0, -0.05); S.add(staff);
    /* the members' records: one lit is what a least-privilege tool can reach; all coral means it can read everyone */
    const shelf = P.shelf(4, { cell: 0.24, levels: 3, lh: 0.26, d: 0.34 }); shelf.position.set(2.4, 0, -0.1); S.add(shelf);
    S.add(P.keep(-2.55, 2.75, 1.0, -1.1, 0.95));

    let R = null;
    function draw() {
      R = run(st);
      R.forEach((r, i) => {
        [true, r.perm, r.auth].forEach((v, j) => rows[i].gates[j].userData.set({ color: v ? GOOD : SAF, on: true }));
        rows[i].om.color.set(r.harm ? BAD : r.outcome === 'done safely' ? GOOD : SAF);
      });
      staff.visible = !!st.human;
      shelf.userData.set({ fill: Array.from({ length: 12 }, (_, k) => st.least ? (k === 5 ? GOOD : OFF) : BAD) });
    }
    function isOk() { return R.every(r => !r.harm); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Classify data before processing', short: 'Classify', get: () => st.classify, set: v => set({ classify: !!v }) },
      { type: 'toggle', label: 'Least-privilege tools', short: 'Least privilege', get: () => st.least, set: v => set({ least: !!v }) },
      { type: 'toggle', label: 'Minimise the input', short: 'Minimise', get: () => st.minimise, set: v => set({ minimise: !!v }) },
      { type: 'toggle', label: 'A person approves decisions and sends', short: 'Human approves', get: () => st.human, set: v => set({ human: !!v }) },
    ];
    const readouts = [
      { label: 'Harms', get: () => ({ v: `${R.filter(r => r.harm).length}`, sub: 'of 5 requests', good: isOk(), bad: !isOk() }) },
      { label: 'Decisions', get: () => ({ v: st.human ? 'by staff' : 'by the assistant', sub: 'waiver, sending', good: st.human, bad: !st.human }) },
      { label: 'Secrets in prompts', get: () => ({ v: st.classify ? 'refused' : 'allowed', sub: 'restricted data', good: st.classify, bad: !st.classify }) },
    ];
    const labels = [
      { name: 'g', t: 'Three gates', d: 'Can, may reach, may decide', icon: 'check', atV: V(-2.42, 0.2, -0.05) },
      { name: 't', t: 'What the tool can reach', d: 'Coral: every member\'s record', icon: 'target', atV: V(2.62, 0.4, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip classification', hint: 'a password in the prompt', on: () => set({ ...D0, classify: false }), off: reset },
      { label: 'Give the tools broad access', hint: 'every record reachable', on: () => set({ ...D0, least: false }), off: reset },
      { label: 'Let the assistant approve and send', hint: 'capability is not authority', on: () => set({ ...D0, human: false }), off: reset },
    ];
    function status() {
      const harms = R.filter(r => r.harm);
      if (!harms.length) return { ok: true, msg: '<b>The public FAQ is summarised, the reply is drafted from a minimised record by a tool that can read only that member, the waiver and the send wait for a loan officer, and the password request is refused as restricted.</b> The assistant could do all five; it was allowed to decide none of the consequential ones.' };
      return { ok: false, msg: `<b>${harms.map(h => `${h.n}: ${h.harm}`).join('. ')}.</b> ${!st.human ? 'Being able to draft an approval is not authority to grant it: keep a person on consequential actions.' : !st.classify ? 'Classify data before processing; restricted material never enters a prompt.' : !st.least ? 'Give tools only the data the approved purpose needs.' : 'Strip what the task does not need.'}` };
    }
    return { update: dt => { bot.userData.tick(dt); staff.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five requests', home: true, say: 'A cooperative\'s support assistant gets five requests. It is capable of all of them.', act: m => m.set({ classify: false, least: false, minimise: false, human: false }) },
    { t: 'Classify first', home: true, say: 'Label the data before anything runs. A password is restricted: it never enters a prompt.', act: m => m.set({ classify: true, least: false, minimise: false, human: false }) },
    { t: 'Least privilege', home: true, say: 'The drafting tool may read only the member in question, not every record.', act: m => m.set({ classify: true, least: true, minimise: false, human: false }) },
    { t: 'Minimise', home: true, say: 'Leave out the national ID number; the reply does not need it.', act: m => m.set({ classify: true, least: true, minimise: true, human: false }) },
    { t: 'Authority', home: true, say: 'Approving a waiver and sending a message belong to staff. Capability is not authority.', act: m => m.set({ classify: true, least: true, minimise: true, human: true }) },
    { t: 'All three gates', home: true, say: 'Can it, may it reach the data, may it decide. Every request passes all three, or stops.', act: m => m.set({ classify: true, least: true, minimise: true, human: true }) },
  ],
  check: [
    { q: 'An assistant can draft a fee waiver and its tool can read the account. May it approve the waiver?', options: ['Not unless its role has that authority', 'Yes, it is capable', 'Yes, it has access'], answer: 0, why: 'Capability and permission are not authority.', hint: 'Try Let the assistant approve and send.' },
    { q: 'What should happen before processing data?', options: ['Classify the data and the use', 'Nothing', 'Encrypt the output'], answer: 0, why: 'Restricted data stays out.', hint: 'Try Skip classification.' },
    { q: 'What does least privilege mean for a tool?', options: ['Only the data and actions the approved purpose needs', 'Full access for convenience', 'No access at all'], answer: 0, why: 'Limit what can go wrong.', hint: 'Try Give the tools broad access.' },
  ],
  practice: [
    { q: 'A workflow can draft and send discount offers to customers automatically. What control matters most?', options: ['A person with authority approves before anything is sent', 'A longer prompt', 'A larger model', 'Faster sending'], answer: 0, why: 'Consequential actions need someone with authority.' },
    { q: 'A user wants to paste a production password into a chat to "check it". What is the right response?', options: ['Refuse: secrets are restricted and must not enter prompts or logs', 'Allow it once', 'Ask the model to forget it', 'Encrypt the chat'], answer: 0, why: 'Restricted data never enters the workflow.' },
    { q: 'Support transcripts were collected to resolve incidents. A team now wants to use them to profile customers. What principle applies?', options: ['Purpose limitation: the new use needs its own approval', 'Data once collected may be used for anything', 'Minimisation alone makes it fine', 'It is fine if anonymised later'], answer: 0, why: 'Approval is for a purpose.' },
    { q: 'A reply needs a member\'s balance band and last contact date. What should go into the prompt?', options: ['Only those fields, without names or ID numbers', 'The whole member record', 'Every member\'s record', 'Nothing'], answer: 0, why: 'The smallest sufficient input.' },
    { q: 'The data class, purpose and retention rule for a new workflow are all unknown. What is the next step?', options: ['Clarify the policy before generating anything', 'Generate and classify later', 'Use a smaller model', 'Delete the data'], answer: 0, why: 'Policy first, not after execution.' },
    { q: 'Which pairing separates roles well for a meaningful action?', options: ['The assistant drafts; a loan officer approves; a system executes and logs', 'The assistant drafts, approves and sends', 'Anyone may approve', 'No one approves'], answer: 0, why: 'Separate read, draft, approve and execute.' },
  ],
  terms: [
    ['Capability', 'Whether a system can perform an operation.'],
    ['Permission', 'Whether an identity may reach the data or tool.'],
    ['Authority', 'Whether a role may make or carry out the decision.'],
    ['Least privilege', 'Only the access the approved purpose needs.'],
    ['Data minimisation', 'The smallest input sufficient for the task.'],
    ['Purpose limitation', 'Data approved for one use is not approved for another.'],
  ],
  deeper: '<p><b>Records.</b> Log what was considered, approved and executed, by whom, so decisions can be reviewed later.</p><p><b>Terms differ.</b> Data use, retention and regional processing vary across consumer products, business plans and the API; check the current official terms for the offering you use.</p><p><b>About this machine.</b> The cooperative and its requests are invented.</p>',
  code: {
    title: 'Three gates before any action',
    note: 'Written for this lesson.',
    text: `
def handle(request, actor):
    data_class = classify(request.data)
    if data_class == "restricted":
        return refuse("restricted data never enters the workflow")
    if not capable(request.operation):
        return refuse("not supported")
    if not actor.may_access(request.resource):          # permission
        return refuse("no access")
    payload = minimise(request.data, fields=request.needed_fields)
    if request.consequential and not actor.has_authority(request.decision):
        return queue_for_approval(request, draft(payload))   # authority stays with a person
    return execute(request, payload)
`,
  },
};
