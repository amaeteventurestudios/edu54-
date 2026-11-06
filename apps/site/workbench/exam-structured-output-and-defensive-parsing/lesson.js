// Exam prep, structured output: an invented parcel firm in Dar es Salaam has Claude turn customer messages into a JSON reschedule request.
// The application treats every object as untrusted input and passes it through four gates: strict parsing (with a bounded repair attempt that
// quotes the exact error), schema validation (types, enums, ranges), semantic checks against the firm's own records, and authorisation of any
// action from the application's policy rather than the model's say-so. Five sample outputs are traced through the gates.
const OUTS = [
  { n: 'A clean request', json: '{"order_id": "DS-4471", "new_date": "2026-11-03", "priority": "normal", "action": "reschedule"}', fault: null },
  { n: 'Wrapped in prose, trailing comma', json: 'Sure! ```json {"order_id": "DS-4471", "new_date": "2026-11-03", "priority": "normal", "action": "reschedule",} ```', fault: 'parse' },
  { n: 'Parses, but breaks the schema', json: '{"order_id": "DS-4471", "new_date": "2026-10-01", "priority": "URGENT!!", "action": "reschedule"}', fault: 'schema' },
  { n: 'Valid shape, wrong facts', json: '{"order_id": "DS-9999", "new_date": "2026-11-03", "priority": "normal", "action": "reschedule"}', fault: 'semantic' },
  { n: 'Proposes a privileged action', json: '{"order_id": "DS-4471", "new_date": "2026-11-03", "priority": "normal", "action": "waive_fee"}', fault: 'auth' },
];
const GATES = [
  { k: 'parse', n: 'Strict parse,\none repair', s: 'Strict parse' },
  { k: 'schema', n: 'Schema: types,\nenums, ranges', s: 'Schema' },
  { k: 'semantic', n: 'Check against\nrecords', s: 'Records' },
  { k: 'auth', n: 'Authorise from\napp policy', s: 'Authorise' },
];
const WHAT = {
  parse: { stop: 'parse error quoted back; repaired output passes', leak: 'a lenient parser guessed at the text and dropped the action field' },
  schema: { stop: 'rejected: priority not in [normal, express], date in the past', leak: 'URGENT!! and a past date reached the scheduler' },
  semantic: { stop: 'rejected: order DS-9999 does not exist for this customer', leak: 'a reschedule was booked for an order that is not theirs' },
  auth: { stop: 'held: waive_fee needs a supervisor, whatever the model proposed', leak: 'the fee was waived because the JSON asked for it' },
};
function trace(o) {
  const out = OUTS[o.out];
  if (!out.fault) return { out, verdict: 'accepted', stopAt: null, harm: null };
  if (o[out.fault]) return { out, verdict: out.fault === 'parse' ? 'repaired' : 'stopped', stopAt: out.fault, harm: null };
  return { out, verdict: 'accepted', stopAt: null, harm: WHAT[out.fault].leak };
}

export default {
  slug: 'exam-structured-output-and-defensive-parsing',
  title: 'Exam prep: structured output is an untrusted contract',
  description: 'A parcel firm turns customer messages into JSON. Treat each object as untrusted, and trace five outputs through four gates to see where each one stops.',
  overview: 'Asking for JSON in a prompt is a request, not a contract. Output can arrive wrapped in prose or code fences, with trailing commas, missing fields, values outside the allowed set, or a perfectly shaped object that is simply wrong. A robust application treats every object the model produces as untrusted input and runs it through layers. First, parse strictly: accept only a well-formed object of the expected type, and do not guess at broken text with a lenient parser that silently drops or invents fields. If parsing or validation fails for a formatting reason, a bounded repair is reasonable: send back the exact error, ask for a corrected object, and give up after a small budget, returning an explicit failure rather than looping. Second, validate against a schema designed from what the consumer will decide: types, required fields, enums, formats and ranges, such as a priority that must be normal or express and a date that cannot be in the past. Third, validate meaning: a schema-valid object can still name an order that does not exist or belongs to someone else, so check it against trusted records. Never repair facts; missing evidence becomes an incomplete state or an escalation. Fourth, authorise: if the object proposes an action, decide whether it may happen from the application\'s identity and policy, not because the JSON asked. Constrained generation and tool input schemas reduce formatting errors and are worth using, but downstream validation stays. Partial streamed output is not a finished object, and schema changes should be versioned and migrated like any public API. This machine traces five outputs for an invented parcel firm in Dar es Salaam.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'structured output', 'JSON schema', 'validation', 'defensive parsing', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 1.0, 1.15], half: 1.05, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { out: 4, parse: true, schema: true, semantic: true, auth: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* five sample outputs on a rack; the one in play is lit */
    const rack = OUTS.map((o, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.26, 0.2, 0.22, '#fff', { r: 0.03, material: m }); b.position.set(-2.5, 0, -0.68 + i * 0.34); S.add(b); return m; });
    /* the object rides a belt through four arches: parse, schema, records, authorise; it stops at the first gate that catches it */
    const belt = P.belt(V(-2.2, 0, 0), V(2.0, 0, 0), { w: 0.34 }); S.add(belt);
    const GX = i => -1.35 + i * 0.85, END = 1.85, X0 = -2.0;
    const gates = GATES.map((g, i) => {
      [-0.3, 0.3].forEach(z => { const p = P.box(0.08, 0.6, 0.08, '#6B6E7E', { r: 0.02 }); p.position.set(GX(i), 0, z); S.add(p); });
      const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.14, 0.1, 0.72, '#fff', { r: 0.02, material: m }); b.position.set(GX(i), 0.6, 0); S.add(b);
      return { m, b };
    });
    const pm = new THREE.MeshLambertMaterial({ color: GOOD }), parcel = P.box(0.24, 0.22, 0.24, '#fff', { r: 0.04, material: pm }); parcel.position.set(X0, 0.08, 0); parcel.userData.noFit = true; S.add(parcel);
    /* at the end of the belt the scheduler, and a lamp for what happened */
    const bot = P.robot(BLUE, { scale: 0.55 }); bot.position.set(2.35, 0, -0.3); S.add(bot);
    const lamp = P.lamp(GOOD, { h: 0.3, r: 0.12 }); lamp.position.set(2.35, 0, 0.4); S.add(lamp);
    S.add(P.keep(-2.7, 2.6, 0.85, -0.85, 0.75));

    let R = null, to = END;
    function draw() {
      R = trace(st);
      rack.forEach((m, i) => m.color.set(i === st.out ? BLUE : OFF));
      let passed = true;
      GATES.forEach((g, i) => {
        const here = R.stopAt === g.k, on = st[g.k];
        gates[i].b.visible = !!on;
        gates[i].m.color.set(here ? SAF : passed ? GOOD : OFF);
        if (here && g.k !== 'parse') passed = false;
      });
      to = R.stopAt && R.stopAt !== 'parse' ? GX(GATES.findIndex(g => g.k === R.stopAt)) - 0.3 : END;
      pm.color.set(R.harm ? BAD : R.verdict === 'accepted' ? GOOD : SAF);
      bot.userData.set({ busy: to === END });
      lamp.userData.set({ color: R.harm ? RED : R.verdict === 'accepted' ? GOOD : SAF, on: true });
    }
    function isOk() { return !R.harm && GATES.every(g => st[g.k]); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      ...GATES.map(g => ({ type: 'toggle', label: g.n.replace('\n', ' '), short: g.s, get: () => st[g.k], set: v => set({ [g.k]: !!v }) })),
      { type: 'buttons', label: 'Model output', options: OUTS.map(o => o.n), get: () => st.out, act: i => set({ out: i }) },
    ];
    const readouts = [
      { label: 'Verdict', get: () => ({ v: R.harm ? 'got through' : R.verdict, sub: R.out.n, good: !R.harm, bad: !!R.harm }) },
      { label: 'Stopped at', get: () => ({ v: R.stopAt ? GATES.find(g => g.k === R.stopAt).s : '—', sub: 'first failing gate', good: true, bad: false }) },
      { label: 'Gates on', get: () => ({ v: `${GATES.filter(g => st[g.k]).length} of 4`, sub: 'layers', good: GATES.every(g => st[g.k]), bad: !GATES.every(g => st[g.k]) }) },
    ];
    const labels = [
      { name: 'g', t: 'Four gates', d: 'Shape, then meaning, then authority', icon: 'check', atV: V(-2.65, 0.15, -0.34) },
      { name: 't', t: 'The verdict', d: 'Accepted, repaired or stopped', icon: 'target', atV: V(2.5, 0.35, 0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Use a lenient parser', hint: 'guesses at broken text', on: () => set({ ...D0, parse: false, out: 1 }), off: reset },
      { label: 'Skip schema validation', hint: 'bad values reach the scheduler', on: () => set({ ...D0, schema: false, out: 2 }), off: reset },
      { label: 'Let the JSON authorise itself', hint: 'a waiver granted', on: () => set({ ...D0, auth: false, out: 4 }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.harm) return { ok: false, msg: `<b>"${r.out.n}" got through: ${r.harm}.</b> ${({ parse: 'Parse strictly, quote the exact error back once, and fail explicitly after the budget.', schema: 'Validate types, enums and ranges before anything acts on the object.', semantic: 'Check the object against trusted records; never repair facts.', auth: 'Decide actions from the application\'s identity and policy, not the model\'s request.' })[r.out.fault]}` };
      if (!GATES.every(g => st[g.k])) return { ok: false, msg: '<b>This output happens to be safe, but a gate is switched off: another output would slip through it.</b> Keep all four layers.' };
      return { ok: true, msg: r.verdict === 'accepted' ? '<b>The clean request passes every gate and the reschedule is booked.</b> The gates cost nothing when the output is right.' : `<b>"${r.out.n}": ${r.verdict === 'repaired' ? WHAT.parse.stop : WHAT[r.out.fault].stop}.</b> Each layer catches a different failure: shape, values, facts or authority.` };
    }
    return { update: dt => { parcel.position.x += (to - parcel.position.x) * Math.min(1, dt * 4); bot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'JSON on request', home: true, say: 'A parcel firm asks Claude to turn messages into reschedule requests. Asking for JSON is not a contract.', act: m => m.set({ out: 0, parse: true, schema: true, semantic: true, auth: true }) },
    { t: 'Parse strictly', home: true, say: 'Prose and a trailing comma: quote the exact error back once and ask for a corrected object.', act: m => m.set({ out: 1, parse: true, schema: true, semantic: true, auth: true }) },
    { t: 'Validate the schema', home: true, say: 'It parses, but the priority is not an allowed value and the date has passed.', act: m => m.set({ out: 2, parse: true, schema: true, semantic: true, auth: true }) },
    { t: 'Check the facts', home: true, say: 'A perfect shape can still name an order that is not this customer\'s.', act: m => m.set({ out: 3, parse: true, schema: true, semantic: true, auth: true }) },
    { t: 'Authorise actions', home: true, say: 'The object asks to waive a fee. Your policy decides, not the JSON.', act: m => m.set({ out: 4, parse: true, schema: true, semantic: true, auth: true }) },
    { t: 'Untrusted input', home: true, say: 'Shape, values, facts, authority: four layers, each catching a different failure.', act: m => m.set({ out: 4, parse: true, schema: true, semantic: true, auth: true }) },
  ],
  check: [
    { q: 'Output parses but the priority is not an allowed value. Which layer catches it?', options: ['Schema validation', 'A politer prompt', 'Nothing'], answer: 0, why: 'Enums and ranges belong to the schema.', hint: 'Try Skip schema validation.' },
    { q: 'An object matches the schema but names someone else\'s order. What catches that?', options: ['A semantic check against trusted records', 'The parser', 'A retry'], answer: 0, why: 'Shape is not truth.', hint: 'Select Valid shape, wrong facts.' },
    { q: 'The JSON proposes waiving a fee. Who decides?', options: ['The application\'s policy and identity', 'The model, since it asked', 'Whoever reads the log'], answer: 0, why: 'Authorise from policy.', hint: 'Try Let the JSON authorise itself.' },
  ],
  practice: [
    { q: 'A prompt says "return only JSON", but output sometimes arrives inside a code fence with a comment. What is the most robust fix?', options: ['Parse strictly, quote the exact error back for one bounded repair, and fail explicitly after that', 'Use a lenient parser that guesses', 'Ask more politely', 'Retry until it works'], answer: 0, why: 'Bounded repair with exact feedback.' },
    { q: 'Constrained generation now guarantees the shape. Can downstream validation be removed?', options: ['No: meaning, facts and authorisation still need checking', 'Yes, the shape is guaranteed', 'Yes, if the model is large', 'Only in production'], answer: 0, why: 'Shape is only the first layer.' },
    { q: 'Validation finds a required evidence field is missing. What should the repair step do?', options: ['Return an explicit incomplete state or escalate; never invent the fact', 'Ask the model to make up a plausible value', 'Fill it with a default', 'Ignore the field'], answer: 0, why: 'Repair formatting, not facts.' },
    { q: 'A streamed response has delivered half an object. What may the application do?', options: ['Wait for the complete object before parsing or acting', 'Act on the fields received so far', 'Parse it with a lenient parser', 'Assume the rest'], answer: 0, why: 'Partial syntax is not a finished contract.' },
    { q: 'A team adds a required field to an output schema used by three services. How should they treat it?', options: ['Version and migrate it like a public API change', 'Change it in place', 'Tell the model only', 'Remove validation during the change'], answer: 0, why: 'Consumers depend on the contract.' },
    { q: 'How should a schema be designed?', options: ['From the decisions the consumer will make with it', 'From whatever the model tends to output', 'As loosely as possible', 'With every field optional'], answer: 0, why: 'The consumer defines what must be true.' },
  ],
  terms: [
    ['Strict parsing', 'Accepting only a well-formed object of the expected type.'],
    ['Schema', 'Types, required fields, enums and ranges an object must meet.'],
    ['Semantic validation', 'Checking an object\'s facts against trusted records.'],
    ['Bounded repair', 'Quoting the exact error back a limited number of times.'],
    ['Authorisation', 'Deciding from policy whether a proposed action may happen.'],
    ['Constrained generation', 'Decoding that forces output into a given shape.'],
  ],
  deeper: '<p><b>Tool inputs versus final outputs.</b> A tool\'s input schema shapes what the model sends to your code; the final answer may need its own schema and validation.</p><p><b>Validators are implementations.</b> A library such as Pydantic checks the contract; the contract is the schema the consumers agreed.</p><p><b>About this machine.</b> The parcel firm and outputs are invented.</p>',
  code: {
    title: 'Parse, validate, check, authorise',
    note: 'Written for this lesson.',
    text: `
import json
from jsonschema import validate, ValidationError

def accept(raw, ask_repair, records, policy, repairs=1):
    for attempt in range(repairs + 1):
        try:
            obj = json.loads(raw)                       # strict: no guessing
            validate(obj, RESCHEDULE_SCHEMA)            # types, enums, ranges
            break
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == repairs:
                return {"status": "failed", "error": str(e)}
            raw = ask_repair(f"Fix this exact error and return only the object: {e}")
    order = records.get(obj["order_id"])
    if order is None or order.customer != current_customer():
        return {"status": "rejected", "reason": "order not found for this customer"}
    if not policy.allows(current_actor(), obj["action"]):
        return {"status": "needs_approval", "action": obj["action"]}
    return {"status": "accepted", "request": obj}
`,
  },
};
