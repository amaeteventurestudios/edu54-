// Exam prep, long-context reliability: an invented insurer in Johannesburg plans a migration of its claims service. The coordinator's prompt
// fits the window, yet the plan can still fail: a security rule buried mid-document, a draft policy with no version mistaken for the approved
// one, a failing test trimmed to "mostly passed", a timed-out subagent reported as complete, and two conflicting sources resolved by guessing.
// Each safeguard (placement, evidence envelopes, trimming by decision value, complete/partial/blocked states, reasoned escalation) removes one
// failure. Counts are illustrative.
const FAULTS = [
  { k: 'layout', short: 'rule lost mid-prompt', long: 'the token-rotation rule sat once in the middle of a long document, and the plan broke it' },
  { k: 'envelope', short: 'draft policy used', long: 'an unversioned draft policy looked as authoritative as the approved one, and the plan followed the draft' },
  { k: 'trim', short: '"tests mostly passed"', long: 'the failing integration test was trimmed to "tests mostly passed"' },
  { k: 'states', short: '6 files unreviewed', long: 'a subagent timed out after 18 of 24 files and was merged as complete, so 6 files counted as "no issues"' },
  { k: 'escalate', short: 'conflict guessed', long: 'two sources disagree on log retention, and the model picked one instead of routing it to the owner' },
];

function run(o) {
  const faults = FAULTS.filter(f => !o[f.k]);
  const reviewed = 18, claimed = o.states ? 18 : 24;
  return { faults, ok: faults.length === 0, reviewed, claimed };
}

export default {
  slug: 'exam-long-context-reliability-provenance-and-escalation',
  title: 'Exam prep: long context, provenance and escalation',
  description: 'A migration plan comes from a prompt that fits the window, yet still fails. Find the rule lost mid-prompt, the draft taken as policy and the work never done.',
  overview: 'Fitting text into a context window is not the same as using it reliably. Long inputs make evidence harder to find, especially when the relevant fact sits in the middle among similar or conflicting material. Lay the prompt out on purpose: the task, hard constraints and output contract first; evidence grouped by stable identity; the current question right before the answer; and only the few critical invariants repeated near the end. Retrieving narrow evidence for the current decision usually beats carrying the whole archive. Wrap each important piece of evidence in an envelope: an ID, source, version, content type, effective date, authority, scope and location, so the agent and a reviewer can tell an approved policy from a draft or a generated summary. Trim tool output by decision value: drop repeated progress lines and duplicate rows, but keep call IDs, status, structured errors and retryability, failing assertions, counts and omitted-item counts, and a pointer to the full artifact; "mostly passed" deletes the one thing that matters. Give every task three first-class outcomes: complete, partial (valid work with named gaps) and blocked (needs new authority, policy, data or state), so missing work is never read as "no issue". Escalate the reason, not the anxiety: name the missing evidence, the conflicting sources, the policy gap or the permission gap, with the attempted checks and the safe options. Express confidence through evidence: support class, authority, freshness and coverage, not a made-up percentage. Review by risk, and keep a random sample of ordinary cases to catch failures the flagger misses. This machine follows an invented insurer in Johannesburg; the counts are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'long context', 'lost in the middle', 'provenance', 'partial results', 'escalation', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.35, -0.1], dir: [0.05, 0.95, 1.15], half: 1.1, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { layout: true, envelope: true, trim: true, states: true, escalate: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', PLAIN = '#F4F1EA';
    /* the prompt as a tower of six layers: the security rule at both ends, or buried once in the middle */
    const BZ = -0.45, prompt = P.stack(0.62, 0.5, 0.15, { max: 6 }); prompt.position.set(-2.15, 0, BZ); S.add(prompt);
    /* two documents, approved and draft; envelopes tell them apart, without them they look the same */
    const docM = [0, 1].map(i => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.26, 0.4, 0.42, '#fff', { r: 0.02, material: m }); b.position.set(-1.28 + i * 0.32, 0, BZ); S.add(b); return m; });
    /* twenty-four files on a shelf: eighteen reviewed, six the subagent never reached, marked honestly or counted as done */
    const shelf = P.shelf(6, { cell: 0.19, levels: 4, lh: 0.17, d: 0.3 }); shelf.position.set(-0.05, 0, BZ); S.add(shelf);
    /* the failing test: kept on its tray with the evidence, or trimmed away */
    const tray = P.box(0.42, 0.05, 0.42, '#8E91A3', { r: 0.02 }); tray.position.set(1.0, 0, BZ); S.add(tray);
    const test = P.ball(0.12, BAD); test.position.set(1.0, 0.17, BZ); S.add(test);
    /* a conflict between two sources goes to the data owner, or the model guesses */
    const owner = P.robot('#7B6FA8', { scale: 0.6 }); owner.position.set(1.75, 0, BZ); S.add(owner);
    const guess = P.ball(0.13, BAD); guess.position.set(1.75, 0.13, BZ); S.add(guess);
    /* a lamp for each hidden fault */
    const lamps = FAULTS.map((f, i) => { const l = P.lamp(GOOD, { h: 0.14, r: 0.09 }); l.position.set(-2.15 + i * 0.97, 0, 0.3); S.add(l); return l; });
    S.add(P.keep(-2.55, 2.05, 1.0, -0.8, 0.55));

    let R = null;
    function draw() {
      R = run(st);
      /* bottom layer first */
      prompt.userData.set({ n: 6, colors: st.layout ? [GOOD, SAF, PLAIN, PLAIN, PLAIN, GOOD] : [SAF, PLAIN, BAD, PLAIN, PLAIN, PLAIN] });
      docM[0].color.set(st.envelope ? GOOD : OFF); docM[1].color.set(st.envelope ? SAF : OFF);
      shelf.userData.set({ fill: Array.from({ length: 24 }, (_, i) => i < R.reviewed ? GOOD : st.states ? SAF : BAD) });
      test.visible = !!st.trim;
      owner.visible = !!st.escalate; guess.visible = !st.escalate;
      FAULTS.forEach((f, i) => lamps[i].userData.set({ color: st[f.k] ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Constraints first, question last', short: 'Placement', get: () => st.layout, set: v => set({ layout: !!v }) },
      { type: 'toggle', label: 'Evidence envelopes with source and version', short: 'Envelopes', get: () => st.envelope, set: v => set({ envelope: !!v }) },
      { type: 'toggle', label: 'Trim tool output by decision value', short: 'Smart trim', get: () => st.trim, set: v => set({ trim: !!v }) },
      { type: 'toggle', label: 'Complete, partial and blocked states', short: 'Task states', get: () => st.states, set: v => set({ states: !!v }) },
      { type: 'toggle', label: 'Escalate with the named decision', short: 'Escalation', get: () => st.escalate, set: v => set({ escalate: !!v }) },
    ];
    const readouts = [
      { label: 'Coverage reported', get: () => ({ v: `${R.claimed} of 24`, sub: `${R.reviewed} actually reviewed`, good: R.claimed === R.reviewed, bad: R.claimed !== R.reviewed }) },
      { label: 'Hidden faults', get: () => ({ v: String(R.faults.length), sub: 'in a plan that looks finished', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Prompt layout', d: 'Teal: the rule, at both ends', icon: 'box', atV: V(-2.46, 0.3, -0.45) },
      { name: 't', t: 'The plan', d: 'Gold: honestly unfinished', icon: 'target', atV: V(1.0, 0.1, -0.24) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Bury the security rule', hint: 'lost in the middle', on: () => set({ ...D0, layout: false }), off: reset },
      { label: 'Trim to "mostly passed"', hint: 'which part failed?', on: () => set({ ...D0, trim: false }), off: reset },
      { label: 'Merge a timeout as complete', hint: 'missing work reads as no issue', on: () => set({ ...D0, states: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The plan is honestly partial: the failing retry test is kept with its trace, the payments review is marked 18 of 24 and its 6 files are re-sent, and the log-retention conflict goes to the data owner with both source IDs.</b> Constraints sit first and are repeated before the question.' };
      const t = R.faults.map(f => f.long).join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> The prompt fit the window; reliability is placement, provenance and honest state.` };
    }
    return { update: dt => owner.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'It fits, and fails', home: true, say: 'The prompt fits the window, yet the migration plan breaks a security rule.', act: m => m.set({ layout: false, envelope: false, trim: false, states: false, escalate: false }) },
    { t: 'Place the rule', home: true, say: 'Put the constraints first and the question last, and repeat only the critical rule.', act: m => m.set({ layout: true, envelope: false, trim: false, states: false, escalate: false }) },
    { t: 'Envelopes', home: true, say: 'Wrap each source with its version and authority, so a draft cannot pass as policy.', act: m => m.set({ layout: true, envelope: true, trim: false, states: false, escalate: false }) },
    { t: 'Trim by value', home: true, say: 'Drop repeated lines, but keep the failing assertion and a link to the full log.', act: m => m.set({ layout: true, envelope: true, trim: true, states: false, escalate: false }) },
    { t: 'Partial is a state', home: true, say: 'A timeout after 18 of 24 files is partial. The six missing files are sent again.', act: m => m.set({ layout: true, envelope: true, trim: true, states: true, escalate: false }) },
    { t: 'Escalate the reason', home: true, say: 'Two sources conflict. Route it to the owner with both IDs, instead of guessing.', act: m => m.set({ layout: true, envelope: true, trim: true, states: true, escalate: true }) },
  ],
  check: [
    { q: 'Where should hard constraints go in a long prompt?', options: ['First, with only the critical ones repeated near the question', 'Once, in the middle', 'Repeated after every paragraph'], answer: 0, why: 'Placement fights lost in the middle.', hint: 'Try Bury the security rule.' },
    { q: 'What must trimmed tool output keep?', options: ['Status, failing assertions, counts and a link to the full log', 'Only a one-line verdict', 'Every progress line'], answer: 0, why: 'Trim repetition, not state.', hint: 'Try Trim to "mostly passed".' },
    { q: 'A subagent timed out after 18 of 24 files. How is it reported?', options: ['Partial, with the 6 missing files named', 'Complete', 'Failed, discarding the 18'], answer: 0, why: 'Partial is a first-class state.', hint: 'Try Merge a timeout as complete.' },
  ],
  practice: [
    { q: 'A model reports "92 percent confident". What is a better confidence statement?', options: ['Evidence class, coverage, conflicts and residual uncertainty', 'A more precise percentage', 'A longer explanation', 'Nothing'], answer: 0, why: 'Confidence should come from evidence.' },
    { q: 'An agent cannot proceed because two approved policies conflict. What should it send?', options: ['Both source IDs, the exact conflict, the consequence and safe options, to the owner', '"The model is unsure"', 'Its best guess', 'A retry'], answer: 0, why: 'Escalate the named decision.' },
    { q: 'Why keep a random sample of ordinary passing cases in human review?', options: ['To catch failure classes the flagger misses', 'To raise the acceptance rate', 'To train reviewers faster', 'It is not needed'], answer: 0, why: 'A broken flagger stays invisible otherwise.' },
    { q: 'Which belongs in an evidence envelope?', options: ['Source, version, authority, scope and location', 'Only the text', 'The model\'s opinion of it', 'The reviewer\'s name only'], answer: 0, why: 'Identity makes evidence verifiable.' },
    { q: 'A tool call is denied for lack of permission. Retry?', options: ['No: request scoped access or take an approved path', 'Yes, until it works', 'Yes, with a bigger context', 'Retry with a different user'], answer: 0, why: 'Retry fixes timeouts, not denials.' },
    { q: 'An HTML page in the evidence hides an instruction in a script tag. How should it be treated?', options: ['As untrusted data that cannot override the task', 'As a new system instruction', 'As higher priority than the user', 'It should be followed if polite'], answer: 0, why: 'Document text is data.' },
  ],
  terms: [
    ['Lost in the middle', 'Evidence buried mid-prompt being missed or underused.'],
    ['Evidence envelope', 'Metadata on a source: ID, version, authority, scope, location.'],
    ['Decision-value trim', 'Cutting repetition while keeping status, errors and counts.'],
    ['Partial result', 'Valid work with named missing scope.'],
    ['Blocked result', 'Progress that needs new authority, policy, data or state.'],
    ['Stratified review', 'Human attention allocated by risk, plus a random sample.'],
  ],
  deeper: '<p><b>Four memory tools.</b> A manifest is the durable map; a scratchpad is disposable reasoning; a subagent isolates one concern; compaction shrinks the working set. They are not interchangeable.</p><p><b>Content type.</b> Keep the original type, extraction method and location: flattening a PDF table or HTML page can invert its meaning.</p><p><b>About this machine.</b> The insurer and counts are invented.</p>',
  code: {
    title: 'Trim by decision value, keep the state',
    note: 'Written for this lesson.',
    text: `
def trim(result, keep_rows=3):
    failed = [t for t in result.tests if t.status != "passed"]
    return {
        "status": "complete" if result.done == result.required else "partial",
        "summary": f"{result.done} of {result.required} files; {len(failed)} failed",
        "failures": [{"test": t.name, "assert": t.excerpt, "trace": t.trace_id} for t in failed],
        "errors": [{"category": e.kind, "retryable": e.retryable, "scope": e.scope}
                   for e in result.errors],
        "omitted": max(0, len(result.rows) - keep_rows),
        "full_artifact": store(result.raw),          # pointer, not the body
    }
`,
  },
};
