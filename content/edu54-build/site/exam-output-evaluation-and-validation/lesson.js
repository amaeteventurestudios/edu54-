// Exam prep, validating output: an invented pharmacy chain in Kumasi receives a Claude-drafted report on product returns with six claims,
// each citing a source. A claim-evidence matrix runs four checks: the cited source exists, it is authoritative for this kind of claim, it
// actually entails the claim (not merely discusses the topic), and every figure reconciles with the data. Each flawed claim fails exactly
// one check, so switching a check off lets that flaw through. The claims and sources are invented.
const CLAIMS = [
  { id: 'C1', t: 'Returns rose 18% in the northern branches', src: 'sales data, rows 120-184', fail: null },
  { id: 'C2', t: 'Staff training caused the rise', src: 'one interview note', fail: 'entails' },
  { id: 'C3', t: 'Refunds over the limit need a manager', src: 'returns policy 4.2', fail: null },
  { id: 'C4', t: 'A rival chain halved its prices', src: 'an anonymous blog post', fail: 'authority' },
  { id: 'C5', t: 'Total returns this quarter: 4,210', src: 'sales data, all rows (sum is 4,120)', fail: 'reconcile' },
  { id: 'C6', t: 'Returns over 30 days are banned', src: 'returns policy 9.1 (no such section)', fail: 'exists' },
];
const CHECKS = [
  { k: 'exists', n: 'The cited source exists' },
  { k: 'authority', n: 'The source is authoritative' },
  { k: 'entails', n: 'The source supports this exact claim' },
  { k: 'reconcile', n: 'Figures reconcile with the data' },
];
function validate(o) {
  const rows = CLAIMS.map(c => {
    const caught = c.fail && o[c.fail];
    const verdict = !c.fail ? 'pass' : caught ? 'flagged' : 'wrongly accepted';
    return { ...c, verdict };
  });
  return { rows, leaks: rows.filter(r => r.verdict === 'wrongly accepted'), flagged: rows.filter(r => r.verdict === 'flagged').length };
}

export default {
  slug: 'exam-output-evaluation-and-validation',
  title: 'Exam prep: validate the claim, not the confidence',
  description: 'A pharmacy chain gets a polished report with six cited claims. Run four checks and see which claims each one stops before the report goes out.',
  overview: 'Evaluating output starts from the decision it supports: a brainstorm and a board report deserve different scrutiny. Useful dimensions are accuracy, completeness, consistency, fit for the audience, fairness and safety, and format, but they only help once turned into observable tests, such as every figure reconciles with the supplied dataset, every recommendation cites a finding and a governing rule, and every region appears or is marked no data. The core tool for factual claims is a claim-evidence matrix: list each claim, its cited source, the kind of support and the reviewer\'s result. It separates four questions that a citation alone does not answer. Does the source exist? Models can produce plausible references to sections that are not there. Is the source authoritative for this kind of claim? An anonymous post is not evidence about a competitor\'s prices. Does it entail the claim, rather than merely discuss the topic? One interview note that mentions training does not show that training caused a change; occurred after is not caused by. And do numbers reconcile? A total that does not match the rows is wrong however confidently it is stated. Fluency and a confident tone are not evidence, and neither is one good-looking sample: validate on several outputs. When something fails, diagnose why before retrying: an unsupported but fluent claim needs grounding in supplied sources and permission to abstain; a recent or private fact needs a current source; buried context needs focus; vague instructions need a clearer contract. Consequential outputs need review proportionate to the harm a mistake could do. This machine validates an invented report for a pharmacy chain in Kumasi.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'output validation', 'claim evidence matrix', 'citations', 'hallucination checks', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.1], dir: [0.05, 1.15, 1.05], half: 1.15, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { exists: true, authority: true, entails: true, reconcile: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* six claims, a parcel on each lane, rolling right through four checks; a check stops the flawed claim it catches, and what gets through reaches the report */
    const LZ = i => -0.9 + i * 0.32, GX = i => -1.25 + i * 0.75, END = 1.75;
    const rows = CLAIMS.map((c, i) => {
      const lane = P.box(4.1, 0.03, 0.2, '#D8D2C4', { r: 0.02 }); lane.position.set(-0.3, 0, LZ(i)); S.add(lane);
      const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.22, 0.2, 0.2, '#fff', { r: 0.03, material: m }); b.position.set(END, 0.03, LZ(i)); b.userData.noFit = true; S.add(b);
      return { b, m, to: END };
    });
    /* each check is a beam across the lanes on two posts; a check that is switched off loses its beam */
    const beams = CHECKS.map((c, i) => {
      [-1.15, 0.85].forEach(z => { const p = P.box(0.07, 0.42, 0.07, '#6B6E7E', { r: 0.02 }); p.position.set(GX(i), 0, z); S.add(p); });
      const b = P.box(0.09, 0.08, 2.0, BLUE, { r: 0.02 }); b.position.set(GX(i), 0.4, -0.15); S.add(b); return b;
    });
    /* the report at the end of the lanes, and a lamp: is it fit to send? */
    const rep = P.box(0.42, 0.34, 1.9, '#F4F1EA', { r: 0.03 }); rep.position.set(2.15, 0, -0.1); S.add(rep);
    const lamp = P.lamp(GOOD, { h: 0.34, r: 0.13 }); lamp.position.set(2.15, 0.34, -0.1); S.add(lamp);
    S.add(P.keep(-2.45, 2.45, 0.95, -1.2, 0.9));

    let R = null;
    function draw() {
      R = validate(st);
      R.rows.forEach((r, i) => {
        const flagged = r.verdict === 'flagged';
        rows[i].to = flagged ? GX(CHECKS.findIndex(c => c.k === r.fail)) - 0.2 : END;
        rows[i].m.color.set(r.verdict === 'pass' ? GOOD : flagged ? SAF : BAD);
      });
      CHECKS.forEach((c, i) => { beams[i].visible = !!st[c.k]; });
      lamp.userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    function isOk() { return R.leaks.length === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = CHECKS.map(c => ({ type: 'toggle', label: `Check: ${c.n.toLowerCase()}`, short: c.n.split(' ').slice(-1)[0], get: () => st[c.k], set: v => set({ [c.k]: !!v }) }));
    const readouts = [
      { label: 'Wrongly accepted', get: () => ({ v: `${R.leaks.length}`, sub: 'flawed claims let through', good: R.leaks.length === 0, bad: R.leaks.length > 0 }) },
      { label: 'Flagged', get: () => ({ v: `${R.flagged} of 4`, sub: 'flawed claims caught', good: R.flagged === 4, bad: R.flagged < 4 }) },
      { label: 'Supported', get: () => ({ v: '2', sub: 'C1 and C3', good: true, bad: false }) },
    ];
    const labels = [
      { name: 'm', t: 'Six claims, four checks', d: 'Gold: stopped. Coral: got through', icon: 'check', atV: V(-2.3, 0.05, -0.26) },
      { name: 't', t: 'Fit to send?', d: 'Count what got through', icon: 'target', atV: V(2.36, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Accept citations at face value', hint: 'a citation is not proof', on: () => set({ exists: false, authority: false, entails: false, reconcile: false }), off: reset },
      { label: 'Skip the support check', hint: 'topic is not proof', on: () => set({ ...D0, entails: false }), off: reset },
      { label: 'Skip reconciling the numbers', hint: 'a wrong total', on: () => set({ ...D0, reconcile: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.leaks.length === 4) return { ok: false, msg: '<b>Every claim has a citation, so taken at face value all six pass, including a section that does not exist, a blog post on a rival\'s prices, an interview note offered as proof of cause and a total that does not add up.</b> A citation points to evidence; it is not evidence. Check each one.' };
      if (r.leaks.length) return { ok: false, msg: `<b>${r.leaks.map(l => `${l.id}, "${l.t}", got through`).join('; ')}: ${r.leaks.map(l => ({ exists: 'its source does not exist', authority: 'its source is not authoritative', entails: 'one interview note shows the topic, not the cause', reconcile: 'the rows sum to 4,120, not 4,210' })[l.fail]).join('; ')}.</b> Turn the check back on.` };
      return { ok: true, msg: '<b>Two claims are supported by primary data and approved policy; four are flagged, each for a different reason: a missing section, an unreliable source, a cause claimed from one anecdote and a total that does not reconcile.</b> Send the flagged claims back with the reason, not a generic "try again".' };
    }
    return { update: dt => rows.forEach(r => { r.b.position.x += (r.to - r.b.position.x) * Math.min(1, dt * 5); }), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A polished report', home: true, say: 'A report on returns makes six claims, each with a citation. It reads well.', act: m => m.set({ exists: false, authority: false, entails: false, reconcile: false }) },
    { t: 'Does it exist?', home: true, say: 'Look up each source. Policy section 9.1 is not there.', act: m => m.set({ exists: true, authority: false, entails: false, reconcile: false }) },
    { t: 'Is it authoritative?', home: true, say: 'An anonymous blog post cannot establish a rival\'s prices.', act: m => m.set({ exists: true, authority: true, entails: false, reconcile: false }) },
    { t: 'Does it support the claim?', home: true, say: 'One interview mentions training. That does not show training caused the rise.', act: m => m.set({ exists: true, authority: true, entails: true, reconcile: false }) },
    { t: 'Do the numbers add up?', home: true, say: 'The rows sum to 4,120, not 4,210.', act: m => m.set({ exists: true, authority: true, entails: true, reconcile: true }) },
    { t: 'Fit for review', home: true, say: 'Two claims stand, four go back with a reason each.', act: m => m.set({ exists: true, authority: true, entails: true, reconcile: true }) },
  ],
  check: [
    { q: 'Does a citation prove a claim?', options: ['No: check the source exists, is authoritative and supports it', 'Yes', 'Only if it is long'], answer: 0, why: 'Citations are pointers.', hint: 'Try Accept citations at face value.' },
    { q: 'An interview note mentions training. Does it show training caused a rise?', options: ['No: discussing a topic is not proving a cause', 'Yes', 'Only if quoted'], answer: 0, why: 'Occurred after is not caused by.', hint: 'Try Skip the support check.' },
    { q: 'What should happen to a flagged claim?', options: ['Return it with the specific reason it failed', 'Retry the same prompt', 'Delete the report'], answer: 0, why: 'Diagnose before retrying.', hint: 'Read the flagged rows.' },
  ],
  practice: [
    { q: 'A report cites "policy 9.1" but the policy has no such section. Which check catches this?', options: ['Checking that the cited source exists', 'Checking the tone', 'Checking the length', 'Asking the model if it is sure'], answer: 0, why: 'Models can produce plausible references that are not there.' },
    { q: 'A total in a summary does not match the sum of the rows supplied. What is the right response?', options: ['Treat the figure as wrong and reconcile it against the data', 'Trust the summary because it is fluent', 'Round both numbers', 'Ignore small differences in reports'], answer: 0, why: 'Figures must reconcile with the source.' },
    { q: 'The model answers confidently and fluently. What does that tell a reviewer about accuracy?', options: ['Nothing on its own: confidence is not evidence', 'It is accurate', 'It is inaccurate', 'It used the web'], answer: 0, why: 'Validate the claim, not the confidence.' },
    { q: 'One sample output looked perfect. Is the prompt validated?', options: ['No: test on several representative inputs', 'Yes', 'Yes, if the reviewer liked it', 'Only for short outputs'], answer: 0, why: 'One success proves little about reliability.' },
    { q: 'An answer depends on a policy change from last week that the model could not know. What is the targeted fix?', options: ['Supply the current authoritative source and allow the model to say what it cannot confirm', 'Retry with the same prompt', 'Ask it to try harder', 'Use a longer answer'], answer: 0, why: 'A knowledge gap needs a current source, not a retry.' },
    { q: 'Which criterion is testable?', options: ['Every recommendation cites at least one finding and one governing rule', 'The report is accurate and complete', 'The report is good', 'The report sounds professional'], answer: 0, why: 'Observable tests, not adjectives.' },
  ],
  terms: [
    ['Claim-evidence matrix', 'A table of each claim, its source, support type and result.'],
    ['Authoritative source', 'A source fit to establish this kind of claim.'],
    ['Entailment', 'Evidence that actually supports the exact claim.'],
    ['Reconcile', 'Check that figures match the underlying data.'],
    ['Testable criterion', 'A condition a reviewer or program can check.'],
    ['Abstention', 'Saying a claim cannot be confirmed instead of guessing.'],
  ],
  deeper: '<p><b>Review in proportion.</b> The more harm a wrong output could do, the more independent the review should be: a brainstorm needs a glance, a filing needs a second reviewer and evidence.</p><p><b>Diagnose the cause.</b> Unsupported claims, missing knowledge, buried context and vague instructions each need a different fix.</p><p><b>About this machine.</b> The pharmacy chain, report and sources are invented.</p>',
  code: {
    title: 'A claim-evidence check',
    note: 'Written for this lesson.',
    text: `
def review(claims, sources, data):
    results = []
    for c in claims:
        src = sources.get(c.source_id)
        if src is None:
            results.append((c.id, "fail", "source does not exist"))
        elif not src.authoritative_for(c.kind):
            results.append((c.id, "fail", "source not authoritative"))
        elif not src.supports(c.text):          # entailment, not topic overlap
            results.append((c.id, "fail", "evidence does not support the claim"))
        elif c.figure is not None and c.figure != data.compute(c.query):
            results.append((c.id, "fail", "figure does not reconcile"))
        else:
            results.append((c.id, "pass", ""))
    return results
`,
  },
};
