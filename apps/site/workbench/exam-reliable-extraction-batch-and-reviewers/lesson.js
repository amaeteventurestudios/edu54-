// Exam prep, reliable extraction: an invented shipping agent in Mombasa extracts obligations from supplier contracts. Six sample clauses carry
// a known truth: a delivery with an exception, a payment date, a report with no deadline, a negated duty, background talk and a category outside
// the enum. Schema choices (nullable deadline, an "other" category), boundary examples, semantic and provenance checks with targeted repair, and
// an independent reviewer each stop a different kind of confident error. The job picks real-time or batch. Counts and cost ratios are illustrative.
const CLAUSES = [
  { c: 'deliver within 14 days,\nexcept in port closures', ok: 'delivery · 14 days · exception kept', bad: { exc: 'exception dropped' } },
  { c: 'buyer pays the deposit\nby 1 March', ok: 'payment · 1 March', bad: { date: 'deadline read as 1 May' } },
  { c: 'supplier sends monthly\nfuel reports', ok: 'reporting · deadline null', bad: { invent: 'deadline invented: 30 June' } },
  { c: 'supplier is not required\nto insure goods in transit', ok: 'no obligation (negated)', bad: { neg: 'labelled an obligation' } },
  { c: 'the parties discussed\na joint training plan', ok: 'no obligation (background)', bad: { bg: 'labelled an obligation' } },
  { c: 'supplier keeps\ncold-chain logs', ok: 'other · needs review', bad: { enum: 'forced into delivery' } },
];
const JOBS = [
  { k: 'night', n: 'nightly backfill of 4,000 contracts', s: 'nightly backfill', best: 'batch' },
  { k: 'desk', n: 'a clerk waiting at the desk', s: 'clerk waiting', best: 'live' },
];

function run(o) {
  const out = CLAUSES.map((x, i) => {
    let err = null;
    if (i === 0) err = 'exc';
    if (i === 1) err = 'date';
    if (i === 2 && !o.nullable) err = 'invent';
    if ((i === 3 || i === 4) && !o.examples) err = i === 3 ? 'neg' : 'bg';
    if (i === 5 && !o.nullable) err = 'enum';
    if (!err) return { st: 'ok', note: x.ok };
    if (err === 'invent' && o.layers) return { st: 'flag', note: 'span check fails, no null\nallowed: escalated' };
    if (err === 'date' && o.layers) return { st: 'fixed', note: `${x.ok}\n(span check, one repair)` };
    if ((err === 'exc' || err === 'neg' || err === 'bg' || err === 'enum') && o.reviewer) return { st: 'flag', note: `reviewer flags: ${x.bad[err]}` };
    return { st: 'wrong', note: x.bad[err], err };
  });
  const job = JOBS.find(j => j.k === o.job);
  const count = k => out.filter(r => r.st === k).length;
  const cost = (o.mode === 'batch' ? 0.5 : 1) * (o.reviewer ? 1.3 : 1) * (o.layers ? 1.05 : 1);
  return { out, job, wrong: count('wrong'), flag: count('flag'), fixed: count('fixed'), cost, fits: o.mode === job.best };
}

export default {
  slug: 'exam-reliable-extraction-batch-and-reviewers',
  title: 'Exam prep: reliable extraction, batch and reviewers',
  description: 'Six contract clauses go through an extractor. Make it able to say unknown, check meaning as well as shape, and sort what comes out.',
  overview: 'Valid JSON is not a correct extraction. A pipeline can match its schema on every record while inventing missing dates, labelling background talk as obligations and forcing unfamiliar categories into the nearest enum. Start with criteria: what qualifies as an obligation, when a deadline may be extracted, and that the evidence span must contain the claim. Use a few examples where judgment is hard, such as a near miss, a negated duty and two obligations in one paragraph, each showing the reason. Make absence representable: a required but nullable field forces the model to choose between a supported value and a known absence, and an "other" category with a review flag stops unfamiliar items being forced into the closest bucket. Validate in four layers: syntax, schema, semantics (cross-field rules) and provenance (does the span actually support the claim, from the right source version). Only the last two catch many confident hallucinations. When validation fails, feed back the smallest useful error, such as "this date is not in the span; set it to null or pick a supported span", keep the source, and limit retries; repeated semantic failure should escalate. Use a separate reviewer in a fresh context with the source, the candidate and a rubric; it returns findings rather than silently rewriting, and its precision and recall should be measured against human labels. Batch processing fits large offline jobs where nobody is waiting: the public guide describes a lower price and a processing window of up to a day with no latency guarantee, and no multi-turn tool use inside a request, so confirm current terms. Give every batch item a stable ID so results that return out of order can be reconciled. This machine follows an invented shipping agent in Mombasa; the counts are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'extraction', 'json schema', 'nullable', 'validation', 'reviewer', 'message batches', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.05, 0.25, -0.15], dir: [0.05, 1.05, 1.12], half: 1.1, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { job: 'night', mode: 'batch', nullable: true, examples: true, layers: true, reviewer: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    const COL = { ok: GOOD, fixed: '#8FBF5A', flag: SAF, wrong: BAD };
    /* clauses roll along a belt past five checks (syntax, schema, semantics, provenance, reviewer), a lamp for each */
    const BZ = -0.5, GX = i => -1.9 + i * 0.6;
    const belt = P.belt(V(-2.5, 0, BZ), V(0.95, 0, BZ), { w: 0.28, speed: 1.1 }); S.add(belt);
    const gates = [0, 1, 2, 3, 4].map(i => { const l = P.lamp(GOOD, { h: 0.3, r: 0.09 }); l.position.set(GX(i), 0, BZ - 0.3); S.add(l); return l; });
    /* four bins at the end of the belt: right, repaired, flagged for a person, wrong but accepted; each stack counts its clauses */
    const tray = P.box(1.72, 0.03, 0.46, '#D8D2C4', { r: 0.02 }); tray.position.set(1.88, 0, BZ); S.add(tray);
    const bins = ['ok', 'fixed', 'flag', 'wrong'].map((k, i) => { const s = P.stack(0.34, 0.34, 0.14, { max: 6, color: COL[k] }); s.position.set(1.25 + i * 0.42, 0.03, BZ); S.add(s); return { s, k }; });
    /* the job: a pallet of the night's contracts, or a clerk waiting at the desk; the lamp says whether the mode fits */
    const pallet = P.stack(0.7, 0.5, 0.13, { max: 5, color: '#A87A4F' }); pallet.position.set(-1.4, 0, 0.45); S.add(pallet);
    const clerk = P.robot(BLUE, { scale: 0.55 }); clerk.position.set(-1.4, 0, 0.45); S.add(clerk);
    const mode = P.lamp(GOOD, { h: 0.3, r: 0.12 }); mode.position.set(-0.55, 0, 0.45); S.add(mode);
    S.add(P.keep(-2.6, 2.65, 0.95, -0.95, 0.75));

    let R = null, clock = 0, nx = 0;
    const isOk = () => R.wrong === 0 && R.fits && R.flag <= 1;
    function draw() {
      R = run(st);
      [true, true, st.layers, st.layers, st.reviewer].forEach((on, i) => gates[i].userData.set({ color: on ? GOOD : OFF, on }));
      bins.forEach(b => b.s.userData.set({ n: R.out.filter(r => r.st === b.k).length }));
      pallet.visible = st.job === 'night'; pallet.userData.set({ n: 5 }); clerk.visible = st.job === 'desk';
      mode.userData.set({ color: R.fits ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Job', options: JOBS.map(j => j.s), get: () => JOBS.findIndex(j => j.k === st.job), act: i => set({ job: JOBS[i].k, mode: JOBS[i].best }) },
      { type: 'buttons', label: 'Processing', options: ['Real-time', 'Batch'], get: () => (st.mode === 'batch' ? 1 : 0), act: i => set({ mode: i ? 'batch' : 'live' }) },
      { type: 'toggle', label: 'Nullable deadline and an "other" category', short: 'Absence allowed', get: () => st.nullable, set: v => set({ nullable: !!v }) },
      { type: 'toggle', label: 'Near-miss and negation examples', short: 'Boundary examples', get: () => st.examples, set: v => set({ examples: !!v }) },
      { type: 'toggle', label: 'Semantic and provenance checks', short: 'Span checks', get: () => st.layers, set: v => set({ layers: !!v }) },
      { type: 'toggle', label: 'Independent reviewer', short: 'Reviewer', get: () => st.reviewer, set: v => set({ reviewer: !!v }) },
    ];
    const readouts = [
      { label: 'Wrong but accepted', get: () => ({ v: String(R.wrong), sub: 'of 6 clauses', good: R.wrong === 0, bad: R.wrong > 0 }) },
      { label: 'Flagged for review', get: () => ({ v: String(R.flag), sub: 'sent to a person' }) },
      { label: 'Relative cost', get: () => ({ v: `${R.cost.toFixed(2)}×`, sub: st.mode === 'batch' ? 'batch' : 'real-time' }) },
    ];
    const labels = [
      { name: 'c', t: 'Clauses and checks', d: 'Valid shape is not correct content', icon: 'check', atV: V(-2.45, 0.08, -0.5) },
      { name: 't', t: 'What came out', d: 'Teal, repaired, gold flagged, coral wrong', icon: 'target', atV: V(2.72, 0.03, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Force every field', hint: 'no way to say unknown', on: () => set({ ...D0, nullable: false }), off: reset },
      { label: 'Check types only', hint: 'valid JSON, wrong facts', on: () => set({ ...D0, layers: false }), off: reset },
      { label: 'Batch a request someone waits for', hint: 'up to a day', on: () => set({ ...D0, job: 'desk', mode: 'batch' }), off: reset },
    ];
    function status() {
      if (isOk()) return { ok: true, msg: `<b>No wrong record is accepted: the misread date fails the span check and is repaired with one targeted error, and the reviewer flags ${R.flag} judgment call${R.flag > 1 ? 's' : ''} for a person.</b> ${st.mode === 'batch' ? 'The nightly job runs as a batch, each item with a stable ID.' : 'The clerk waiting gets a real-time answer.'}` };
      const f = [];
      if (!st.nullable) f.push(`with no way to say unknown, the model invented a deadline for the fuel reports and forced cold-chain logs into delivery${st.layers && st.reviewer ? ', and the checks caught both only by sending them to a person' : ''}`);
      if (!st.examples) f.push(`without near-miss and negation examples, a negated duty and background talk became obligations${st.reviewer ? ', and the reviewer had to send both to a person' : ''}`);
      if (!st.layers) f.push('checking types only accepted a deadline that is not in the evidence span');
      if (!st.reviewer) f.push('with no reviewer, the dropped port-closure exception went through');
      if (!R.fits) f.push(st.mode === 'batch' ? 'a batch can take up to a day, and the clerk is waiting' : 'running 4,000 contracts in real time costs about double for no one waiting');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b> Valid structure is not correct content.` };
    }
    return { update: dt => { clock += dt; if (clock > 1 && belt.userData.count() < 4) { clock = 0; belt.userData.send(COL[R.out[nx++ % 6].st], { size: 0.16 }); } belt.userData.tick(dt); clerk.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Valid but wrong', home: true, say: 'An extractor returns valid records, and legal still rejects many of them.', act: m => m.set({ job: 'night', mode: 'live', nullable: false, examples: false, layers: false, reviewer: false }) },
    { t: 'Allow absence', home: true, say: 'A nullable deadline and an other category stop invented values.', act: m => m.set({ job: 'night', mode: 'live', nullable: true, examples: false, layers: false, reviewer: false }) },
    { t: 'Teach the boundary', home: true, say: 'Near-miss and negation examples keep background talk out of the obligations.', act: m => m.set({ job: 'night', mode: 'live', nullable: true, examples: true, layers: false, reviewer: false }) },
    { t: 'Check the span', home: true, say: 'A provenance check finds a date that is not in the evidence, and one targeted repair fixes it.', act: m => m.set({ job: 'night', mode: 'live', nullable: true, examples: true, layers: true, reviewer: false }) },
    { t: 'A fresh reviewer', home: true, say: 'An independent reviewer flags the dropped exception for a person, without rewriting it.', act: m => m.set({ job: 'night', mode: 'live', nullable: true, examples: true, layers: true, reviewer: true }) },
    { t: 'Batch the night', home: true, say: 'Nobody waits for the nightly backfill, so it runs as a batch at lower cost.', act: m => m.set({ job: 'night', mode: 'batch', nullable: true, examples: true, layers: true, reviewer: true }) },
  ],
  check: [
    { q: 'Why make the deadline field nullable?', options: ['So the model can say unknown instead of inventing', 'To shorten the schema', 'So validation skips it'], answer: 0, why: 'Required plus nullable forces a choice.', hint: 'Try Force every field.' },
    { q: 'Which validation layer catches a date that is not in the evidence?', options: ['Provenance', 'Syntax', 'Schema'], answer: 0, why: 'Does the span support the claim?', hint: 'Try Check types only.' },
    { q: 'When is batch the wrong choice?', options: ['When someone is waiting for the answer', 'For a nightly backfill', 'For an evaluation set'], answer: 0, why: 'Batch has no latency guarantee.', hint: 'Try Batch a request someone waits for.' },
  ],
  practice: [
    { q: 'An extraction retry loop says only "try again" until types pass. What is the better repair?', options: ['Return the specific failed rule and allowed fix, and cap retries', 'Raise the retry limit', 'Lower the temperature', 'Remove validation'], answer: 0, why: 'The smallest useful error, bounded.' },
    { q: 'An item does not fit any enum value. What should the schema allow?', options: ['An "other" value with a note or review flag', 'Nothing: pick the nearest value', 'Dropping the record silently', 'A free-text category everywhere'], answer: 0, why: 'Do not force the nearest bucket.' },
    { q: 'Which few-shot examples help an extractor most?', options: ['Boundary cases such as near misses and negations', 'Many easy positives', 'Examples with no reasons', 'Examples from another task'], answer: 0, why: 'Examples teach where judgment is hard.' },
    { q: 'What should an independent extraction reviewer return?', options: ['Findings with field, evidence and disposition', 'A silently rewritten record', 'A single pass/fail word', 'Nothing unless asked'], answer: 0, why: 'Review, do not rewrite.' },
    { q: 'Batch results can come back in a different order. What makes them reconcilable?', options: ['A stable custom_id for every item', 'Sorting by length', 'Submitting one at a time', 'Timestamps only'], answer: 0, why: 'Stable IDs reconcile results.' },
    { q: 'A workflow needs the model to call a tool and react to its result mid-request. Batch?', options: ['No: split the work into jobs or run it in real time', 'Yes, batch handles multi-turn tool use', 'Only at night', 'Only with a reviewer'], answer: 0, why: 'No multi-turn tool calling inside one batch request.' },
  ],
  terms: [
    ['Extraction criteria', 'Rules for what qualifies, written before the schema.'],
    ['Nullable field', 'A required field that may hold a known absence.'],
    ['Evidence span', 'The source text that must support each claim.'],
    ['Provenance check', 'Verifying that the span supports the claim, from the right source version.'],
    ['Targeted repair', 'A retry that feeds back the specific failed rule.'],
    ['Message batch', 'An asynchronous group of requests with lower cost and no latency guarantee.'],
  ],
  deeper: '<p><b>Measure the reviewer.</b> A model judge is an instrument: check its precision and recall against human labels.</p><p><b>Version everything.</b> Persist source, schema and prompt versions with each batch item so a change in any can trigger reprocessing.</p><p><b>About this machine.</b> The firm and counts are invented.</p>',
  code: {
    title: 'Four layers and a targeted repair',
    note: 'Written for this lesson.',
    text: `
def accept(source, raw, tries=2):
    for _ in range(tries + 1):
        rec = parse_json(raw)                       # syntax
        errs = schema_errors(rec)                   # fields, types, enums
        errs += semantic_errors(rec)                # cross-field rules
        errs += [e for f in claimed(rec)            # provenance
                 if (e := span_check(source, rec["evidence_span"], f))]
        if not errs:
            return rec
        raw = repair(source, rec, errs[0])          # one specific error, not "try again"
    return escalate(source, rec, errs)              # repeated failure goes to a person
`,
  },
};
