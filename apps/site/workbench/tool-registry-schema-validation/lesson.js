// Tool registry (phase 19, lesson 21): a real mini JSON Schema validator runs in this file on tool calls for an Accra clinic's booking tool. Fields are moulds; an argument either fits its mould or the exact path comes back.
// A precise error lets the model fix a call in one round trip; a vague one takes several. Validation happens once, at the door, so the handler can trust what it gets.
const SCHEMA = { required: ['clinic', 'date', 'seats'], props: { clinic: { type: 'string', enum: ['Korle Bu', 'Ridge', 'Legon'] }, date: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ }, seats: { type: 'integer', min: 1, max: 4 } } };
const CALLS = {
  good: { clinic: 'Ridge', date: '2026-11-09', seats: 2 },
  type: { clinic: 'Ridge', date: '2026-11-09', seats: '2' },
  missing: { clinic: 'Ridge', seats: 2 },
  range: { clinic: 'Ridge', date: '2026-11-09', seats: 9 },
  extra: { clinic: 'Ridge', date: '2026-11-09', seats: 2, urgent: true },
};
function validate(a) {
  const errs = [];
  SCHEMA.required.forEach(k => { if (!(k in a)) errs.push([`/${k}`, 'is required']); });
  Object.entries(a).forEach(([k, v]) => {
    const s = SCHEMA.props[k];
    if (!s) { errs.push([`/${k}`, 'is not allowed']); return; }
    if (s.type === 'integer' && !Number.isInteger(v)) errs.push([`/${k}`, 'must be an integer']);
    if (s.type === 'string' && typeof v !== 'string') errs.push([`/${k}`, 'must be a string']);
    if (s.enum && !s.enum.includes(v)) errs.push([`/${k}`, `must be one of ${s.enum.join(', ')}`]);
    if (s.pattern && typeof v === 'string' && !s.pattern.test(v)) errs.push([`/${k}`, 'must look like 2026-11-09']);
    if (s.min != null && Number.isInteger(v) && (v < s.min || v > s.max)) errs.push([`/${k}`, `must be from ${s.min} to ${s.max}`]);
  });
  return errs;
}
function run(o) {
  const a = CALLS[o.c], errs = o.check ? validate(a) : [];
  const rounds = !errs.length ? 1 : o.precise ? 2 : 4;
  const crash = !o.check && o.c !== 'good';
  return { a, errs, rounds, crash };
}

export default {
  slug: 'tool-registry-schema-validation',
  title: 'A tool registry: check once, then trust',
  description: 'Each tool call is pressed into a mould. A real validator runs here, and a precise error fixes the call in one trip.',
  overview: 'Model-written arguments are guesses shaped like JSON. A registry holds a name, schema and handler for each tool, and checks every call once, at the door, so that handlers can trust what they get. The errors matter as much as the check. "Invalid input" sends the model guessing. An error with a path, /seats must be from 1 to 4, gets fixed in a single round trip. You don\'t need all of JSON Schema: type, required, enum, range and pattern cover most calls, and refusing unknown fields stops invented ones. This lesson runs a small real validator on calls to a clinic booking tool in Accra.',
  keywords: ['tool registry', 'JSON Schema', 'validation', 'function calling', 'error messages', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.75, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { c: 'type', check: true, precise: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const FX = i => -1.3 + i * 0.85, KS = ['clinic', 'date', 'seats', 'extra'];
    const Slots = KS.map((k, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), f = P.box(0.7, 0.14, 0.7, '#fff', { r: 0.03, material: m }); f.position.set(FX(i), 0.03, -0.1); S.add(f); const p = P.box(0.4, 0.3, 0.4, BLUE, { r: 0.04, material: new S.THREE.MeshLambertMaterial({ color: BLUE }) }); p.position.set(FX(i), 0.17, -0.1); S.add(p); return { m, p }; });
    const bot = add(P.robot(SAF, { scale: 0.8 })); bot.position.set(-2.15, 0.03, -0.1);
    const handler = P.box(0.6, 0.45, 0.6, '#2C2D31', { r: 0.05 }); handler.position.set(2.15, 0.03, 0.42); S.add(handler);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.1 })); lamp.position.set(2.15, 0.03, -0.3);
    S.add(P.keep(-2.45, 2.45, 0.85, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      KS.forEach((k, i) => { const key = k === 'extra' ? 'urgent' : k, has = key in R.a, bad = R.errs.some(e => e[0] === `/${key}`), S0 = Slots[i];
        S0.p.visible = has; S0.p.material.color.set(bad ? BAD : BLUE); S0.m.color.set(bad || (!has && k !== 'extra') ? BAD : has ? GOOD : GREY); });
      lamp.userData.set({ color: R.crash ? '#D9483B' : R.errs.length ? '#E3A72F' : '#3E9B5F', on: true });
      bot.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['good', 'type', 'missing', 'range', 'extra'];
    const controls = [
      { type: 'buttons', label: 'The model writes', options: ['A good call', 'Text for a number', 'No date', 'Nine seats', 'An extra field'], get: () => CK.indexOf(st.c), act: i => set({ c: CK[i] }) },
      { type: 'toggle', label: 'Validate at the door', short: 'Validate', get: () => st.check, set: v => set({ check: !!v }) },
      { type: 'toggle', label: 'Errors name the exact path', short: 'Precise errors', get: () => st.precise, set: v => set({ precise: !!v }) },
    ];
    const readouts = [
      { label: 'Validator says', get: () => ({ v: R.errs.length ? (st.precise ? `${R.errs[0][0]} ${R.errs[0][1]}`.slice(0, 40) : 'invalid input') : 'ok', sub: `${R.errs.length} errors`, good: !R.errs.length }) },
      { label: 'Round trips', get: () => ({ v: `${R.rounds}`, sub: 'to a good call', good: R.rounds <= 2, bad: R.rounds > 2 }) },
      { label: 'Handler', get: () => ({ v: R.crash ? 'crashed' : R.errs.length ? 'not called' : 'ran', good: !R.crash, bad: R.crash }) },
    ];
    const labels = [
      { name: 'm', t: 'One mould per field', d: 'Coral: it doesn\'t fit', icon: 'box', atV: V(FX(0) - 0.35, 0.1, -0.1) },
      { name: 'h', t: 'The handler', d: 'Runs only on checked calls', icon: 'check', atV: V(2.45, 0.2, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip validation', hint: 'the handler finds out', on: () => set({ ...D0, check: false }), off: reset },
      { label: 'Say only "invalid input"', hint: 'the model guesses', on: () => set({ ...D0, c: 'range', precise: false }), off: reset },
      { label: 'Allow unknown fields', hint: 'an invented flag', on: () => set({ ...D0, c: 'extra', check: false }), off: reset },
    ];
    function status() {
      if (R.crash) return { ok: false, msg: `<b>The handler crashed on a call it should never have seen.</b> Text in a number field fails deep in your code, with a stack trace the model can't use. Check once, at the door.` };
      if (R.errs.length && !st.precise) return { ok: false, msg: `<b>"Invalid input", and ${R.rounds} round trips of guessing.</b> The model has no idea which field was wrong, so it changes them at random.` };
      if (R.errs.length) return { ok: true, msg: `<b>Refused with "${R.errs[0][0]} ${R.errs[0][1]}".</b> The model fixes it next turn. A good error is a prompt.` };
      return { ok: true, msg: '<b>The call fits every mould, and the handler runs without further checks.</b>' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Guesses shaped like JSON', home: true, say: 'A model books a clinic visit in Accra. Its arguments are guesses. Each field has a mould.', act: m => m.set({ c: 'good', check: true, precise: true }) },
    { t: 'Text for a number', home: true, say: 'It writes seats as text. Without a check, the handler crashes deep in the code.', act: m => m.set({ c: 'type', check: false, precise: true }) },
    { t: 'Check at the door', home: true, say: 'Validate once, on arrival. Handlers can then trust their inputs.', act: m => m.set({ c: 'type', check: true, precise: true }) },
    { t: 'A good error', home: true, say: 'Name the exact path and limit, and the model fixes it in one trip.', act: m => m.set({ c: 'range', check: true, precise: true }) },
    { t: 'A bad error', home: true, say: 'Say only invalid input, and it guesses at every field.', act: m => m.set({ c: 'range', check: true, precise: false }) },
    { t: 'Invented fields', home: true, say: 'Refuse fields you never defined. Otherwise a made-up flag slips through.', act: m => m.set({ c: 'extra', check: true, precise: true }) },
  ],
  check: [
    { q: 'Where should arguments be validated?', options: ['Once, in the registry', 'In every handler', 'In the prompt'], answer: 0, why: 'Then handlers can trust them.', hint: 'See Check at the door.' },
    { q: 'What makes an error useful to a model?', options: ['The exact path and limit', 'A stack trace', 'A polite tone'], answer: 0, why: 'It fixes the call in one trip.', hint: 'Try Say only "invalid input".' },
    { q: 'Why refuse unknown fields?', options: ['Models invent them', 'They slow things', 'JSON forbids them'], answer: 0, why: 'A made-up flag must not pass silently.', hint: 'Try Allow unknown fields.' },
  ],
  terms: [['Registry', 'Names, schemas and handlers in one place.'], ['JSON pointer', 'A path such as /seats.'], ['Enum', 'A fixed list of allowed values.'], ['Round trip', 'One call and its reply.'], ['Handler', 'The code behind a tool.']],
  deeper: '<p><b>A subset is enough.</b> Type, required, enum, minimum, maximum and pattern cover most tool calls.</p><p><b>Same schema twice.</b> The one you send to the model and the one you check against must be the same object.</p><p><b>This validator</b> is real and runs in your browser.</p>',
  code: {
    title: 'Validate and dispatch',
    note: 'Adapted from the course\'s registry (code/main.py).',
    text: `
def call(name, args):
    tool = REGISTRY[name]
    errors = validate(args, tool.schema)
    if errors:
        return {"is_error": True, "errors": [f"{e.path} {e.message}" for e in errors]}
    return tool.handler(**args)
`,
  },
};
