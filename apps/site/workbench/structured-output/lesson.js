// Structured output (phase 13, lesson 4): twenty purchase-order emails go through an extraction press in one of three modes: prompt for JSON, validate and retry, or
// constrained decoding. Each email ends in a chute: good, parse error, schema violation, refusal, or a wrong value that slipped through. Attempts are paid for.
const MAILS = [0, 2, 0, 0, 3, 0, 1, 0, 0, 2, 0, 0, 4, 0, 1, 0, 0, 5, 0, 0];   // 0 clean, 1 prose around JSON, 2 wrong type, 3 invented field, 4 cut off, 5 not an order
const KIND = { 1: 'parse', 4: 'parse', 2: 'schema', 3: 'schema' };
function run(o) {
  const res = { good: 0, parse: 0, schema: 0, refuse: 0, bad: 0 }; let calls = 0;
  const FIX = { parse: 1, schema: 1 };
  MAILS.forEach(m => {
    if (o.mode === 'strict') { calls++; if (m === 5) { if (o.typed) res.refuse++; else { calls += o.retries; res.refuse++; } } else if (m === 4 && o.tiny) res.parse++; else res.good++; return; }
    if (m === 5) {
      calls += o.mode === 'prompt' ? 1 : 1 + o.retries;
      if (o.mode === 'prompt' || !o.typed) { res.bad += o.mode === 'prompt' ? 1 : 0; res.schema += o.mode === 'prompt' ? 0 : 1; } else res.refuse++;
      if (o.mode === 'retry' && o.typed) calls -= o.retries;
      return;
    }
    if (m === 0) { calls++; res.good++; return; }
    const kind = KIND[m];
    if (o.mode === 'prompt') { calls++; if (kind === 'parse') res.parse++; else if (m === 3) res.bad++; else res.schema++; return; }
    const fixAt = FIX[kind]; const tries = Math.min(o.retries, fixAt);
    calls += 1 + tries;
    if (o.retries >= fixAt && o.schema) res.good++; else if (!o.schema) res.bad++; else res[kind]++;
  });
  return { ...res, calls };
}

export default {
  slug: 'structured-output',
  title: 'Structured output: three ways to get a clean order',
  description: 'Twenty order emails, three presses. See which failures each one can have, and what it pays to avoid them.',
  overview: 'An agent reading order emails needs fields, not prose. There are three ways to get them. Ask nicely for JSON, which mostly works and fails six different ways. Validate afterwards and send failures back, which works but pays for every retry. Or constrain the decoder, so tokens that break the schema can\'t be chosen at all. The modes differ in what can still go wrong, and that decides the code around them. Each failure has its own type and its own handler: a parse error, a schema violation, a refusal. A refusal is the one failure no schema removes, and it must never be retried like a typo.',
  keywords: ['structured output', 'JSON Schema', 'constrained decoding', 'Pydantic', 'Zod', 'strict mode', 'refusal'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.4, 0], dir: [0.08, 0.72, 1.2], half: 1.05, wide: 5.4 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { mode: 'strict', retries: 2, schema: true, typed: true, tiny: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', CALL = 0.05, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const b = add(P.belt(V(-2.5, 0, 0.45), V(-0.7, 0, 0.45), { w: 0.4, speed: 1.4 }));
    const press = P.box(0.7, 0.9, 0.7, CHAR, { r: 0.06 }); press.position.set(-0.45, 0, 0.45); S.add(press);
    const ram = P.box(0.42, 0.12, 0.42, SAF, { r: 0.02 }); ram.position.set(-0.45, 0.9, 0.45); ram.userData.noFit = true; S.add(ram);
    const CH = [['good', GOOD], ['parse', BAD], ['schema', '#D98BA6'], ['refuse', '#7B6FA8'], ['bad', RED]];
    const CX = i => 0.35 + i * 0.5;
    const pad = P.box(2.6, 0.03, 0.7, '#D8D2C4', { r: 0.03 }); pad.position.set(1.35, 0, 0.1); S.add(pad);
    const tw = CH.map(([k, c], i) => { const t = add(P.tower(0.36, 0.42, c)); t.position.set(CX(i), 0.03, 0.1); t.userData.set({ cap: '' }); return t; });
    const jar = add(P.jar(0.3, 0.75, { max: 14 })); jar.position.set(-1.7, 0, -0.45);
    S.add(P.keep(-2.6, 2.75, 1.25, -0.8, 0.75));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      CH.forEach(([k], i) => tw[i].userData.set({ h: Math.max(0.03, R[k] * 0.055) }));
      jar.userData.set({ n: Math.round(R.calls / 3) });
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['prompt', 'retry', 'strict'];
    const controls = [
      { type: 'buttons', label: 'The press', options: ['Ask for JSON', 'Validate, retry', 'Constrained'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Retries allowed', min: 0, max: 3, step: 1, get: () => st.retries, set: v => set({ retries: v }) },
      { type: 'toggle', label: 'Check against the schema', short: 'Schema', get: () => st.schema, set: v => set({ schema: !!v }) },
      { type: 'toggle', label: 'Handle a refusal as its own case', short: 'Typed refusal', get: () => st.typed, set: v => set({ typed: !!v }) },
      { type: 'toggle', label: 'Token limit too small for long orders', short: 'Tight limit', get: () => st.tiny, set: v => set({ tiny: !!v }) },
    ];
    const readouts = [
      { label: 'Clean orders', get: () => ({ v: `${R.good} of 20`, sub: 'one email is not an order', good: R.good >= 19, bad: R.good < 16 }) },
      { label: 'Wrong data let through', get: () => ({ v: `${R.bad}`, sub: 'reached the ledger', good: !R.bad, bad: R.bad > 0 }) },
      { label: 'Cost of the run', get: () => ({ v: M(R.calls * CALL), sub: `${R.calls} model calls` }) },
    ];
    const labels = [
      { name: 'in', t: 'Order emails', d: 'Twenty, Accra to Kampala', icon: 'box', atV: V(-2.3, 0.1, 0.5) },
      { name: 'ch', t: 'Good, then the failures', d: 'Parse, schema, refusal, wrong', icon: 'chart', atV: V(CX(4), 0.05, 0.3) },
      { name: 'j', t: 'Every attempt costs', d: 'The jar fills with calls', icon: 'money', atV: V(-1.45, 0.5, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Only ask nicely for JSON', hint: 'no check at all', on: () => set({ ...D0, mode: 'prompt' }), off: reset },
      { label: 'Parse but skip the schema', hint: 'valid JSON, wrong fields', on: () => set({ ...D0, mode: 'retry', schema: false }), off: reset },
      { label: 'Retry a refusal like a typo', hint: 'it will refuse again', on: () => set({ ...D0, typed: false }), off: reset },
      { label: 'Tight token limit', hint: 'cut off mid-order', on: () => set({ ...D0, tiny: true }), off: reset },
    ];
    function status() {
      if (st.mode === 'prompt') return { ok: false, msg: `<b>Only ${R.good} of 20 clean, and ${R.bad} wrong records reached the ledger.</b> Asking for JSON works most of the time, and the misses have many shapes: prose around the braces, a number as text, a field nobody asked for, an order cut off.` };
      if (!st.schema) return { ok: false, msg: `<b>It all parsed, and ${R.bad} wrong records went through.</b> Valid JSON is not a valid order. A string where a number belongs parses perfectly. Parsing checks the shape of the text; only the schema checks the meaning of the fields.` };
      if (st.tiny) return { ok: false, msg: '<b>Constrained decoding, and one long order still came out cut off.</b> The grammar guards the tokens, not the budget. Stop at the token limit and the output is unfinished. Check the stop reason, and leave room.' };
      if (!st.typed) return { ok: false, msg: `<b>The press spent ${R.calls} calls, and ${st.retries} went on an email that isn't an order.</b> A refusal is not a typo: the model decided the input doesn't fit. Sending it back only buys the same answer. Route it to a person.` };
      if (st.mode === 'retry') return { ok: R.good >= 19, msg: `<b>${R.good} clean of 20, for ${R.calls} calls.</b> Validate and retry is reliable and you pay for each failure twice. ${st.retries === 0 ? 'With no retries allowed, failures simply fall out.' : 'Send back the exact error so the retry can fix it.'}` };
      return { ok: true, msg: `<b>${R.good} clean of 20 for ${R.calls} calls.</b> Tokens that break the schema were never available, so parse errors and schema violations can't happen. One failure mode remains: the refusal, which goes to a person.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 0.9 && b.userData.count() < 3) { u = 0; b.userData.send('#F4F1EA', { size: 0.2 }); }
        ram.position.y = 0.92 + Math.abs(Math.sin(S.t * 3)) * 0.1;
      },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Ask nicely', home: true, say: 'Twenty order emails arrive from Accra to Kampala. Ask the model for JSON and most come out clean. The rest fail in different ways.', act: m => m.set({ mode: 'prompt', retries: 2, schema: true, typed: true, tiny: false }) },
    { t: 'Check and send back', home: true, say: 'Validate the result against a schema, and send failures back with the exact error. It works, and every failure is paid for twice.', act: m => m.set({ mode: 'retry', retries: 2, schema: true, typed: true, tiny: false }) },
    { t: 'Parsing is not validating', home: true, say: 'Skip the schema, and everything still parses. But text sits where a number belongs, and wrong records reach the ledger.', act: m => m.set({ mode: 'retry', retries: 2, schema: false, typed: true, tiny: false }) },
    { t: 'Constrained decoding', home: true, say: 'Now the decoder itself is limited. Tokens that would break the schema are masked before sampling. Parse errors and schema errors simply cannot happen.', act: m => m.set({ mode: 'strict', retries: 2, schema: true, typed: true, tiny: false }) },
    { t: 'What remains', home: true, say: 'One email is not an order at all. The model refuses. No schema removes that, and retrying buys the same refusal.', act: m => m.set({ mode: 'strict', retries: 2, schema: true, typed: false, tiny: false }) },
    { t: 'One failure, one handler', home: true, say: 'So give each failure its own type and its own path. The refusal goes to a person. The rest of the orders flow.', act: m => m.set({ mode: 'strict', retries: 2, schema: true, typed: true, tiny: false }) },
  ],
  check: [
    { q: 'Which failures does constrained decoding remove?', options: ['Parse errors and schema violations', 'Refusals', 'Every failure'], answer: 0, why: 'Invalid tokens can\'t be chosen, but the model can still decline.', hint: 'Choose Constrained and read the chutes.' },
    { q: 'What should you do with a refusal?', options: ['Handle it as its own case', 'Retry until it passes', 'Treat it as a parse error'], answer: 0, why: 'It is a decision, not a typo. A retry buys the same answer.', hint: 'Try Retry a refusal like a typo.' },
    { q: 'Why is parsing alone not enough?', options: ['Valid JSON can still hold wrong fields and types', 'Parsers are slow', 'JSON has no numbers'], answer: 0, why: 'Parsing checks the text; the schema checks the meaning.', hint: 'Try Parse but skip the schema.' },
  ],
  terms: [
    ['JSON Schema', 'A standard description of the fields, types and limits you expect.'],
    ['Constrained decoding', 'Masking tokens that would break the schema, before sampling.'],
    ['Parse error', 'The text is not valid JSON at all.'],
    ['Schema violation', 'Valid JSON with wrong fields, types or values.'],
    ['Refusal', 'The model declines because the input doesn\'t fit.'],
    ['Stop reason', 'Why the model stopped: finished, a limit, a tool, a refusal.'],
  ],
  deeper: '<p><b>Declare it once.</b> Pydantic in Python and Zod in TypeScript let one definition produce the schema, the validator and your types, so they can\'t drift apart.</p><p><b>Strict has limits.</b> Providers support a subset of JSON Schema in strict mode, and very large or deeply recursive schemas can be rejected or slow the first call. Keep schemas small and specific.</p><p><b>A schema is not the truth.</b> A perfectly shaped order can hold the wrong quantity. Check values against your own records where it matters.</p>',
  code: {
    title: 'A typed outcome per email',
    note: 'Adapted from the course\'s extraction pipeline (code/main.py).',
    text: `
def extract(email, schema, retries=2):
    prompt = build_prompt(email)
    for attempt in range(retries + 1):
        reply = model(prompt, response_schema=schema)
        if reply.refusal:
            return Refused(reply.refusal)        # never retried
        if reply.stop_reason == "max_tokens":
            return Truncated()
        errors = validate(reply.json, schema)
        if not errors:
            return Ok(reply.json)
        prompt += repair_note(errors)            # send back the exact error
    return Invalid(errors)
`,
  },
};
