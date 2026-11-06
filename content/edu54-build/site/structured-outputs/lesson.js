// Structured outputs, the pipeline around the model: a pharmacy wholesaler in Dar es Salaam turns 200 order messages into records
// {product, quantity, unit, deliver_by}. Each reply passes three gates: does it parse, does it match the schema, do its values appear in the message.
// A simulated model: on a fresh try each reply has a chance of one fault, by output mode (prompt only / JSON mode / schema mode):
// broken JSON (fences, preamble, cut off), wrong type, unit not on the list, required field missing, or a value that isn't in the message.
// A failed reply is sent back up to N times. With the error text sent back, a retry fixes the fault 80% of the time; a blind retry is a fresh draw,
// and at temperature 0 a blind retry is the same reply again. The value check catches 90% of invented values. Fixed random numbers.
const N = 200, MODES = ['Prompt only', 'JSON mode', 'Schema mode'];
const FAULTS = ['parse', 'type', 'unit', 'missing', 'value'];
const RATE = [[0.09, 0.07, 0.05, 0.04, 0.03], [0, 0.07, 0.05, 0.04, 0.03], [0, 0, 0.05, 0, 0.03]];
let seed = 5; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const DRAW = Array.from({ length: N }, () => Array.from({ length: 4 }, () => ({ f: rnd(), fix: rnd(), see: rnd() })));
function fault(m, u, strict) {
  let c = 0;
  for (let k = 0; k < 5; k++) {
    c += RATE[m][k];
    /* schema mode with a strict unit list: the decoder can't write a unit off the list */
    if (u < c) return k === 2 && m === 2 && strict ? -1 : k;
  }
  return -1;
}
function run(st) {
  const bins = { ok: 0, wrong: 0, parse: 0, schema: 0, caught: 0, refused: 0 }, sent = [0, 0, 0], first = [0, 0, 0];
  let calls = 0;
  const fate = DRAW.map(D => {
    let f = -1;
    for (let a = 0; a <= st.r; a++) {
      calls++;
      if (a === 0 || (!st.fb && !st.T0)) f = fault(st.m, D[a].f, st.strict);
      else if (st.fb && D[a].fix < 0.8) f = -1;
      /* gate 1: parse; gate 2: schema (a unit off the list passes a loose schema); gate 3: values found in the message */
      const g = f === 0 ? 0 : f === 1 || f === 3 || (f === 2 && st.strict) ? 1 : f === 4 && st.check && D[a].see < 0.9 ? 2 : -1;
      if (a === 0 && g >= 0) first[g]++;
      if (g < 0) return f === 4 ? 'wrong' : f === 2 ? 'refused' : 'ok';
      if (a === st.r) return ['parse', 'schema', 'caught'][g];
      sent[g]++;
    }
  });
  fate.forEach(k => bins[k]++);
  return { fate, bins, sent, first, calls };
}
const SCHEMA = 'product: text\nquantity: whole number, 1 or more\nunit: one of box, carton, bottle\ndeliver_by: a date, or null';

export default {
  slug: 'structured-outputs',
  title: 'Structured outputs: parse, check, send it back',
  description: 'A pharmacy wholesaler turns 200 order messages into records. Send each one through three gates and see what gets stored right, wrong or not at all.',
  overview: 'A program that reads a model\'s reply needs data, not a sentence. There are levels of control. Asking for JSON in the prompt usually works, but some replies come wrapped in code fences, open with "Here is the JSON", or stop halfway. JSON mode guarantees the reply parses, but not that it has the right fields or types. Schema mode (constrained decoding behind the scenes) guarantees the shape: every required field, the right types, values from the allowed list. Around the model you still need a pipeline: parse, validate against the schema, and send failures back with the error message so the next try can fix it. Retrying without the error is a coin toss, and at temperature 0 it returns the same reply again. Two gaps remain even with schema mode. A schema checks shape, not truth: a quantity of 12 when the message said 2 passes every type check, so values must be checked against the source. And a loose schema lets near-misses through: a unit field that accepts any text will take "packet" or "ctn", and the warehouse system downstream will refuse it.',
  keywords: ['structured outputs', 'JSON mode', 'JSON schema', 'schema validation', 'retry with feedback', 'Pydantic', 'LLM extraction'],
  orient: 'landscape',
  view: { target: [-0.2, 0.55, 0.1], dir: [0.4, 0.85, 1.3], half: 2.0, wide: 6.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { m: 2, r: 2, fb: true, T0: false, check: true, strict: true }, st = { ...D0 };
    const CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B';
    /* the model writes a record for each of 200 orders; records ride a belt through three gates */
    const model = P.robot('#2C2D31', { scale: 1.9 }); model.position.set(-2.75, 0, -0.1); model.rotation.y = 0.6; S.add(model); model.userData.set({ busy: true });
    const X0 = -2.2, X1 = 1.75, line = P.belt(V(X0, 0, 0), V(X1, 0, 0), { speed: 1.1, w: 0.45 }); S.add(line);
    const GX = [-1.25, -0.3, 0.65], GCOL = ['#3D6BD6', '#7B6FA8', '#1C9A94'];
    const gates = GX.map((x, i) => { const g = P.gate(0.62, GCOL[i], { h: 0.75 }); g.position.set(x, 0, 0); g.rotation.y = Math.PI / 2; S.add(g); return g; });
    const bins = GX.map(x => { const t = P.tower(0.42, 0.42, '#8E91A3', { size: 0.24, h: 0.02 }); t.position.set(x, 0, 0.85); S.add(t); return t; });
    const loops = GX.map((x, i) => { const pp = P.pipe([V(x, 0.55, -0.25), V((x + X0) / 2, 1.05 - i * 0.08, -0.55), V(-2.55, 0.9, -0.3)], GCOL[i], { r: 0.035, n: 4 }); S.add(pp); return pp; });
    /* where records land: right, wrong but stored, and refused by the warehouse */
    const right = P.tower(0.48, 0.48, GOOD, { size: 0.26 }), wrong = P.tower(0.48, 0.48, RED, { size: 0.26 }), refused = P.tower(0.48, 0.48, SAF, { size: 0.26 });
    right.position.set(2.3, 0, -0.55); wrong.position.set(2.3, 0, 0.1); refused.position.set(2.3, 0, 0.75); S.add(right, wrong, refused);
    S.add(P.keep(-3.2, 2.7, 1.6, -1.0, 1.15));
    const ticks = [model, line, ...gates, ...bins, ...loops, right, wrong, refused];
    let R = null, clock = 0, gap = 0, i0 = 0;
    const COLOR = { ok: GOOD, wrong: RED, refused: SAF, parse: '#3D6BD6', schema: '#7B6FA8', caught: '#1C9A94' };
    const STOP = { parse: 0, schema: 1, caught: 2 };
    function spawn() {
      const f = R.fate[(i0 * 37) % N]; i0++;
      const g = STOP[f], u = g == null ? 1 : (GX[g] - X0) / (X1 - X0) - 0.03;
      line.userData.send(g == null ? COLOR[f] : '#FFFFFF', { stop: u });
    }
    function tiles() { line.userData.clear(); i0 = 0; gap = 0; }
    function draw() {
      R = run(st);
      const B = R.bins, lost = [B.parse, B.schema, B.caught];
      gates.forEach((g, i) => { const off = i === 2 && !st.check; g.userData.set({ open: off, color: off ? '#B9B3A6' : GCOL[i] }); });
      bins.forEach((t, i) => t.userData.set({ h: 0.02 + lost[i] / N * 6, cap: lost[i] ? String(lost[i]) : '' }));
      loops.forEach((pp, i) => pp.userData.set({ on: st.r > 0 && R.sent[i] > 0 }));
      right.userData.set({ h: 0.05 + B.ok / N * 1.4, cap: String(B.ok) });
      wrong.userData.set({ h: 0.03 + B.wrong / N * 6, cap: B.wrong ? String(B.wrong) : '' });
      refused.userData.set({ h: 0.03 + B.refused / N * 6, cap: B.refused ? String(B.refused) : '' });
    }
    draw();
    const set = p => { Object.assign(st, p); tiles(); draw(); };
    const update = dt => { clock += dt; gap -= dt; if (gap <= 0) { gap = 0.3; spawn(); } ticks.forEach(t => t.userData.tick?.(dt)); };
    const controls = [
      { type: 'buttons', label: 'Output mode', options: MODES, get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Retries', options: ['0', '1', '2', '3'], get: () => st.r, act: i => set({ r: i }) },
      { type: 'toggle', label: 'Send the error back', get: () => st.fb, set: v => set({ fb: !!v }) },
      { type: 'toggle', label: 'Temperature 0', get: () => st.T0, set: v => set({ T0: !!v }), quick: false },
      { type: 'toggle', label: 'Check values against the message', short: 'Value check', get: () => st.check, set: v => set({ check: !!v }) },
      { type: 'toggle', label: 'Unit must be on the list', short: 'Unit list', get: () => st.strict, set: v => set({ strict: !!v }), quick: false },
      { type: 'button', label: 'Run the 200 again', act: () => { clock = 0; tiles(); } },
    ];
    const readouts = [
      { label: 'Stored right', get: () => ({ v: `${R.bins.ok}`, sub: `of ${N} orders`, good: R.bins.ok >= N * 0.97, bad: R.bins.ok < N * 0.85 }) },
      { label: 'Stored wrong', get: () => ({ v: `${R.bins.wrong}`, sub: 'nobody noticed', bad: R.bins.wrong > 0, good: R.bins.wrong === 0 }) },
      { label: 'Model calls', get: () => ({ v: `${R.calls}`, sub: `${(R.calls / N).toFixed(2)} per order` }) },
    ];
    const labels = [
      { name: 'gates', t: 'Three gates', d: 'Does it parse, match the schema, match the message?', icon: 'shield', atV: V(-1.25, 0.8, -0.32) },
      { name: 'retry', t: 'Sent back', d: 'A failed record returns to the model for another try', icon: 'reset', atV: V((GX[0] + X0) / 2, 1.05, -0.55) },
      { name: 'warehouse', t: 'The warehouse', d: 'Green right, red wrong, gold refused', icon: 'box', atV: V(2.6, 0.05, -0.85) },
      { name: 'lost', t: 'Given up', d: 'Records that failed a gate after every retry', icon: 'info', atV: V(-1.5, 0.02, 1.08) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Retry blindly at temperature 0', hint: 'JSON mode, no error sent back', on: () => set({ ...D0, m: 1, fb: false, T0: true }), off: reset },
      { label: 'Trust the schema', hint: 'no check against the message', on: () => set({ ...D0, check: false }), off: reset },
      { label: 'Any text for the unit', hint: 'a loose schema', on: () => set({ ...D0, strict: false }), off: reset },
    ];
    function status() {
      const B = R.bins, lost = B.parse + B.schema + B.caught;
      if (st.r && !st.fb) {
        const fb = run({ ...st, fb: true }), fl = fb.bins.parse + fb.bins.schema + fb.bins.caught;
        return { ok: lost > fl ? false : undefined, msg: `<b>Blind retries${st.T0 ? ' at temperature 0' : ''}: ${lost} orders given up after ${R.calls} model calls.</b> ${st.T0 ? 'With the same prompt and no randomness, a retry returns the same broken reply, so every retry is wasted.' : 'Each retry is a fresh roll of the dice, with no idea what went wrong.'} Sending the error back ("quantity must be a whole number") fixes most on the next try: ${fl} given up, ${fb.calls} calls.` };
      }
      if (!st.check && B.wrong) return { ok: false, msg: `<b>Trusting the schema: ${B.wrong} orders stored with values that aren't in the message.</b> A quantity of 21 when the customer wrote 12 is a whole number, 1 or more: every type check passes. A schema checks shape, not truth. Compare each value with the message, and send a mismatch back.` };
      if (!st.strict && B.refused) return { ok: false, msg: `<b>A loose schema: ${B.refused} orders refused by the warehouse system.</b> With the unit as any text, the model writes "ctn", "packet" or "cartons"; every one passes the schema and fails downstream. List the allowed values in the schema (an enum), and schema mode can't write anything else.` };
      if (st.m === 0) return { ok: lost ? false : undefined, msg: `<b>Prompt only: ${R.first[0]} replies didn't parse the first time${st.r ? `; ${B.parse} still broken after ${st.r} ${st.r === 1 ? 'retry' : 'retries'}` : ''}.</b> Code fences, "Here is the JSON" and replies cut off halfway all break the parser. JSON mode guarantees it parses; schema mode guarantees the shape too.` };
      if (st.m === 1) return { ok: lost ? false : undefined, msg: `<b>JSON mode: everything parses, but ${R.first[1]} replies had the wrong fields or types (${B.schema} given up).</b> "qty": "twelve" is valid JSON. Schema mode makes the decoder follow the schema itself.` };
      return { ok: B.ok >= N * 0.97 ? true : undefined, msg: `<b>${B.ok} of ${N} orders stored right, ${B.wrong} wrong, ${lost} given up for a person to read.</b> Schema mode fixes the shape; the value check catches invented numbers, and the error goes back with each retry. ${R.calls} model calls in all.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ask for JSON in the prompt', home: true, say: 'A pharmacy wholesaler in Dar es Salaam turns order messages into records for its warehouse. Asking for JSON in the prompt mostly works, but some replies come in code fences, or stop halfway, and the parser fails.', act: m => m.set({ m: 0, r: 0, fb: true, T0: false, check: true, strict: true }) },
    { t: 'JSON mode', home: true, say: 'JSON mode guarantees the reply parses. But valid JSON can still have the wrong fields: quantity spelled out as a word, or the date missing.', act: m => m.set({ m: 1 }) },
    { t: 'Send the error back', home: true, say: 'So validate every reply against the schema, and send failures back with the error message. Most are fixed on the next try.', act: m => m.set({ r: 2 }) },
    { t: 'Schema mode', home: true, say: 'Schema mode makes the decoder follow the schema itself: every field, the right types, a unit from the list. The shape is now guaranteed.', act: m => m.set({ m: 2 }) },
    { t: 'Shape is not truth', home: true, say: 'But a quantity of twenty-one when the customer wrote twelve passes every type check. Without a check against the message, wrong orders slip into the warehouse.', act: m => m.set({ check: false }) },
    { t: 'Check the values', home: true, say: 'Compare each value with the message, and send mismatches back too. Now every order lands right, or goes to a person to read.', act: m => m.set({ check: true }) },
  ],
  check: [
    { q: 'What does JSON mode guarantee?', options: ['The reply parses as JSON, not that it has the right fields', 'The reply matches your schema', 'The values are true'], answer: 0, why: 'Schema mode adds the shape; only a check against the source covers truth.', hint: 'Compare Prompt only, JSON mode and Schema mode.' },
    { q: 'Why send the validation error back when retrying?', options: ['So the next try knows what to fix; a blind retry may repeat the mistake', 'It makes the reply shorter', 'The API requires it'], answer: 0, why: 'At temperature 0 a blind retry returns the same reply.', hint: 'Try the blind retry break.' },
    { q: 'A schema-valid record says 21 cartons; the message said 12. What catches it?', options: ['Checking values against the message', 'A stricter type', 'Schema mode'], answer: 0, why: 'Types and shapes can\'t tell a right number from a wrong one.', hint: 'Turn off the value check.' },
  ],
  terms: [
    ['JSON mode', 'An API setting that guarantees the reply is valid JSON, whatever its fields.'],
    ['JSON Schema', 'A description of the fields, types and allowed values a record must have.'],
    ['Schema mode', 'An API setting that makes the model\'s output match a given schema, usually by constrained decoding.'],
    ['Validation', 'Checking a parsed reply against the schema before using it.'],
    ['Retry with feedback', 'Sending the validation error back to the model so the next try can fix it.'],
    ['Enum', 'A field that may only take one of a listed set of values.'],
    ['Grounding check', 'Comparing extracted values with the source text to catch invented ones.'],
  ],
  deeper: '<p><b>Schemas from code.</b> In Python, a Pydantic model writes the JSON Schema for you and validates the reply into a typed object; libraries such as Instructor add the retry with feedback. TypeScript has Zod for the same job.</p><p><b>Tool use is the same idea.</b> A tool\'s input schema is a structured output the model chooses to produce. With many extraction schemas, letting the model pick the right tool gives you the choice and the structure at once.</p><p><b>Other traps.</b> Deeply nested schemas go wrong more often; arrays may come back too long or too short; an optional field the model can skip will be skipped. Make important fields required, and allow null where the data may truly be missing.</p><p><b>About this machine.</b> The model is simulated: each fresh try has a set chance of one fault, by output mode. A retry with the error fixes it 80% of the time; a blind retry draws again, or repeats at temperature 0. The value check catches 90% of invented values. Random numbers are fixed, so a change you make is the only thing that moves the tiles.</p>',
  code: {
    title: 'Parse, validate, send the error back',
    note: 'Adapted from the course\'s structured outputs lesson.',
    text: `
import json

def extract(message, schema, max_retries=2):
    prompt = f"Extract the order as JSON matching this schema:\\n{json.dumps(schema)}\\n\\n{message}"
    for attempt in range(max_retries + 1):
        raw = call_model(prompt)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            prompt += f"\\n\\nYour reply was not valid JSON ({e}). Reply with JSON only."
            continue
        errors = validate(data, schema) + values_not_in(data, message)
        if not errors:
            return data
        prompt += "\\n\\nFix these problems: " + "; ".join(errors)
    return None  # a person reads this one
`,
  },
};
