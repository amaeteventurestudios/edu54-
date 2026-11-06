// Structured outputs: a hardware supplier in Kumasi turns customer messages into a delivery record (reason, urgent, date). Step by step the model scores
// candidate tokens; constrained decoding masks every token the schema does not allow, and scaffolding tokens are forced. The model's scores are scripted;
// the masking, the output and the JSON parse are computed live. Break it: prompt only (the reply starts "Sure! Here is the JSON", the parser fails),
// answer before reasoning (the model commits to "urgent": false before it reads why), a date that cannot be null (it invents one).
const MSG = 'Builders at our site in Kumasi are waiting. Please bring 20 bags of cement as soon as you can.';
const TRUTH = { urgent: true, date: null };
function plan(st) {
  const S = [], con = st.con;
  const free = (label, cands) => { const c = cands.map(x => ({ ...x, ok: !con || x.valid })); const pool = c.filter(x => x.ok); const pick = pool.sort((a, b) => b.p - a.p)[0]; S.push({ label, cands: c, pick: pick.t, out: pick.out ?? pick.t }); };
  const forced = (t) => S.push({ label: 'scaffold', cands: [{ t, p: 1, ok: true, valid: true }], pick: t, out: t, forced: true });
  free('start', [{ t: 'Sure', p: 0.46, valid: false, out: 'Sure! Here is the JSON:\n' }, { t: '{', p: 0.3, valid: true, out: '{' }, { t: 'Here', p: 0.14, valid: false }, { t: '```', p: 0.1, valid: false }]);
  if (S[0].pick !== '{') forced('{');
  const reason = () => { con ? forced('\n  "reason": "') : S.push({ label: 'text', cands: [{ t: '"reason": "', p: 0.9, ok: true, valid: true }], pick: '"reason": "', out: '\n  "reason": "' });
    free('reason', [{ t: 'builders are waiting', p: 0.7, valid: true }, { t: 'routine order', p: 0.2, valid: true }, { t: 'none given', p: 0.1, valid: true }]); S[S.length - 1].out += '",'; };
  const urgent = (after) => { con ? forced('\n  "urgent": ') : S.push({ label: 'text', cands: [{ t: '"urgent": ', p: 0.9, ok: true, valid: true }], pick: '"urgent": ', out: '\n  "urgent": ' });
    // before the reasoning is written, the model leans on the usual case: most orders are routine
    free('urgent', after ? [{ t: 'true', p: 0.82, valid: true }, { t: 'false', p: 0.15, valid: true }, { t: '"yes"', p: 0.03, valid: false }] : [{ t: 'false', p: 0.55, valid: true }, { t: 'true', p: 0.4, valid: true }, { t: '"yes"', p: 0.05, valid: false }]); S[S.length - 1].out += ','; };
  if (st.order === 0) { reason(); urgent(true); } else { urgent(false); reason(); }
  con ? forced('\n  "date": ') : S.push({ label: 'text', cands: [{ t: '"date": ', p: 0.9, ok: true, valid: true }], pick: '"date": ', out: '\n  "date": ' });
  free('date', [{ t: 'null', p: 0.5, valid: st.nul }, { t: '"2026-10-28"', p: 0.3, valid: true }, { t: '"soon"', p: 0.2, valid: false }]);
  con ? forced('\n}') : S.push({ label: 'text', cands: [{ t: '}', p: 0.9, ok: true, valid: true }], pick: '}', out: '\n}' });
  const text = S.map(s => s.out).join('');
  let obj = null; try { obj = JSON.parse(text); } catch (e) { obj = null; }
  return { S, text, obj };
}

export default {
  slug: 'structured-outputs-constrained-decoding',
  title: 'Structured outputs: decode to a schema',
  description: 'A hardware supplier in Kumasi turns customer messages into delivery records, while the schema masks every token it may not write.',
  overview: 'Asking a model nicely for JSON works most of the time, which is not good enough for a program that must parse every reply. Constrained decoding changes the next-token scores at every step: the schema, regex or grammar decides which tokens are valid in the current position, and every other token gets minus infinity before sampling, so the output is valid by construction. Tokens the schema forces, such as field names and brackets, can be filled in without asking the model at all. Two traps remain. Field order is logic: if the answer comes before the reasoning, the model commits before it thinks. And a schema too strict to allow "unknown" forces the model to invent a value. Allow null where data may be missing.',
  keywords: ['structured outputs', 'constrained decoding', 'json schema', 'logit masking', 'grammar', 'field order'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.35, -0.15], dir: [0.05, 0.7, 1.25], half: 0.9, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { con: true, order: 0, nul: true };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C5BA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const Z = -0.15;
    // the customer's message: a crate of words going in
    const msg = P.box(0.55, 0.3, 0.5, '#C9A16A', { r: 0.05 }); msg.position.set(-2.45, 0, Z); S.add(msg);
    const words = P.stack(0.4, 0.36, 0.07, { max: 4 }); words.position.set(-2.45, 0.3, Z); S.add(words); words.userData.set({ n: 4, colors: Array(4).fill('#F4F1EA') });
    const feed = P.pipe([V(-2.15, 0.25, Z), V(-1.95, 0.35, Z), V(-1.75, 0.2, Z)], '#C9A16A', { r: 0.03, n: 3 }); S.add(feed);
    // this step's candidate tokens, each as tall as the model's score; the schema greys out and crosses the ones it forbids
    const TXs = i => -1.4 + i * 0.42;
    const BAR = [0, 1, 2, 3].map(i => {
      const t = P.tower(0.3, 0.3, C.teal); t.position.set(TXs(i), 0, Z); t.userData.set({ cap: '' }); S.add(t);
      const xm = own('#D64545'), x2 = P.box(0.42, 0.05, 0.05, '#fff', { r: 0.01, material: xm }); x2.rotation.z = 0.6; x2.userData.noFit = true; S.add(x2);
      return { t, x2 };
    });
    // the schema's gate: only allowed tokens pass to the record
    const gate = P.gate(0.55, '#3B3F8F', { h: 0.6 }); gate.position.set(0.3, 0, Z); gate.rotation.y = Math.PI / 2; S.add(gate);
    // the record, one block per token written: gold forced by the schema, teal chosen, coral wrong
    const tray = P.box(1.95, 0.04, 0.5, '#3A3D4A', { r: 0.04 }); tray.position.set(1.65, 0, Z); S.add(tray);
    const outs = Array.from({ length: 10 }, (_, i) => { const m = own('#fff'), b = P.box(0.15, 0.16, 0.34, '#fff', { r: 0.03, material: m }); b.position.set(0.78 + i * 0.19, 0.04, Z); b.userData.m = m; S.add(b); return b; });
    const lamp = P.lamp(OFF, { h: 0.45, r: 0.12 }); lamp.position.set(2.9, 0, Z); S.add(lamp);
    S.add(P.keep(-2.75, 3.05, 1.25, -0.5, 0.25));

    let PL = null, k = 0, tm = 0;
    const blockCol = s => s.forced ? SAF : (s.label === 'start' && s.pick !== '{') || (s.label === 'urgent' && s.pick !== 'true') || (s.label === 'date' && s.pick !== 'null') ? BAD : s.label === 'text' ? '#8E91A3' : GOOD;
    function show() {
      const s = PL.S[Math.min(k, PL.S.length - 1)], total = s.cands.reduce((a, c) => a + c.p, 0);
      BAR.forEach((b, i) => {
        const c = s.cands[i], on = !!c; b.t.visible = on; b.x2.visible = on && !c.ok; if (!on) return;
        const h = Math.max(0.03, c.p / total * 1.1);
        b.t.userData.set({ h, color: !c.ok ? OFF : s.forced ? SAF : c.t === s.pick ? C.orange : C.teal });
        b.x2.position.set(TXs(i), h / 2 + 0.05, Z + 0.17);
      });
      outs.forEach((b, i) => { const x = PL.S[i], on = !!x && i <= k; b.visible = on; if (on) b.userData.m.color.set(blockCol(x)); });
      const done = k >= PL.S.length - 1;
      lamp.userData.set({ color: !done ? OFF : PL.obj && PL.obj.urgent === TRUTH.urgent && PL.obj.date === TRUTH.date ? GOOD : BAD, on: done });
      gate.visible = st.con;
    }
    function draw() { PL = plan(st); k = PL.S.length - 1; tm = 0; show(); BAR.forEach(b => b.t.userData.snap()); }
    function replay() { k = 0; tm = 0; show(); }
    draw();
    const update = dt => {
      BAR.forEach(b => b.t.userData.tick(dt)); feed.userData.tick(dt); gate.userData.tick(dt, true);
      if (S.reduced) return; tm += dt; const hold = k >= PL.S.length - 1 ? 3 : 0.9; if (tm > hold) { tm = 0; k = k >= PL.S.length - 1 ? 0 : k + 1; show(); }
    };
    const controls = [
      { type: 'buttons', label: 'Decoding', options: ['Prompt only', 'Constrained'], get: () => (st.con ? 1 : 0), act: i => { st.con = !!i; draw(); replay(); } },
      { type: 'buttons', label: 'Field order', options: ['Reason first', 'Answer first'], get: () => st.order, act: i => { st.order = i; draw(); replay(); } },
      { type: 'toggle', label: 'Date may be null', short: 'null date', get: () => st.nul, set: v => { st.nul = v; draw(); replay(); } },
      { type: 'button', label: 'Decode again', act: replay },
    ];
    const readouts = [
      { label: 'Parses', get: () => ({ v: PL.obj ? 'yes' : 'no', good: !!PL.obj, bad: !PL.obj }) },
      { label: 'Urgent', get: () => ({ v: PL.obj ? String(PL.obj.urgent) : '–', sub: 'should be true', bad: !!PL.obj && PL.obj.urgent !== TRUTH.urgent, good: !!PL.obj && PL.obj.urgent === TRUTH.urgent }) },
      { label: 'Date', get: () => ({ v: PL.obj ? String(PL.obj.date) : '–', sub: 'none was given', bad: !!PL.obj && PL.obj.date !== null, good: !!PL.obj && PL.obj.date === null }) },
    ];
    const labels = [
      { name: 'scores', t: 'Next-token scores', d: 'Orange: picked. Grey, crossed: masked by the schema', icon: 'scale', atV: V(TXs(0) - 0.15, 0.1, Z) },
      { name: 'out', t: 'The record, token by token', d: 'Gold: forced. Coral: wrong. Lamp: parses and right', icon: 'check', atV: V(3.02, 0.4, Z) },
    ];
    const reset = () => { Object.assign(st, { con: true, order: 0, nul: true }); draw(); };
    const breaks = [
      { label: 'Prompt only', hint: 'Just ask for JSON', on: () => { reset(); st.con = false; draw(); }, off: reset },
      { label: 'Answer before reasoning', hint: 'Swap the fields', on: () => { reset(); st.order = 1; draw(); }, off: reset },
      { label: 'Date can\'t be null', hint: 'A strict format', on: () => { reset(); st.nul = false; draw(); }, off: reset },
    ];
    function status() {
      if (!PL.obj) return { ok: false, msg: `<b>The parser fails on the first word.</b> Asked nicely for JSON, the model's likeliest first token is "Sure" (${PL.S[0].cands[0].p.toFixed(2)}), so the reply starts "Sure! Here is the JSON:" and the program cannot read it. With constrained decoding the schema allows only "{" at step one, and every reply parses.` };
      if (PL.obj.urgent !== TRUTH.urgent) return { ok: false, msg: `<b>Valid JSON, wrong answer.</b> With "urgent" before "reason", the model must commit before it has written why. Leaning on the usual case, it picks false (0.55 against 0.40); the reason it writes next, "${PL.obj.reason}", is too late to help. No validator catches this: put reasoning fields first.` };
      if (PL.obj.date !== TRUTH.date) return { ok: false, msg: `<b>An invented date.</b> The message gives no date and the model's top choice is null (0.50), but the schema demands a date in YYYY-MM-DD form, so null is masked and the model writes "${PL.obj.date}". The van may come on the wrong day. Allow null where data can be missing.` };
      return { ok: true, msg: `<b>A valid, correct record.</b> The schema masked ${PL.S.reduce((a, s) => a + s.cands.filter(c => !c.ok).length, 0)} invalid tokens and forced ${PL.S.filter(s => s.forced).length} scaffold steps without asking the model. Reasoning comes first, so "urgent" is true, and the date is null because none was given.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A message to a record', home: true, say: 'A hardware supplier in Kumasi turns customer messages into delivery records: a reason, whether it is urgent, and a date.', act: m => m.set({ con: true, order: 0, nul: true }) },
    { t: 'Just ask', home: true, say: 'Ask nicely for JSON, and the likeliest first word is "Sure". The reply starts "Sure! Here is the JSON", and the parser fails.', act: m => m.set({ con: false }) },
    { t: 'Mask the rest', home: true, say: 'Constrained decoding checks the schema at every step and sets every invalid token to minus infinity. Only valid output can come out.', act: m => m.set({ con: true }) },
    { t: 'Forced tokens', home: true, say: 'Brackets and field names are fixed by the schema, so they are written without asking the model. That is often faster, not slower.', act: m => m.set({}) },
    { t: 'Order is logic', home: true, say: 'Put the answer before the reasoning, and the model commits before it thinks: urgent, false. Valid JSON, wrong answer.', act: m => m.set({ order: 1 }) },
    { t: 'Allow unknown', home: true, say: 'Demand a date when none was given, and the model invents one. Let the date be null.', act: m => m.set({ order: 0, nul: false }) },
  ],
  check: [
    { q: 'How does constrained decoding guarantee valid output?', options: ['It sets the scores of tokens the schema forbids to minus infinity', 'It retries until the output parses', 'It asks the model more politely'], answer: 0, why: 'Invalid tokens can never be sampled.' },
    { q: 'Why put "reasoning" before "answer" in a schema?', options: ['The model writes in order, so it should reason before it commits', 'JSON requires alphabetical order', 'It makes the output shorter'], answer: 0, why: 'Field order is logic, not formatting.' },
    { q: 'What goes wrong if a required date cannot be null?', options: ['The model invents a date when none was given', 'The output stops parsing', 'Nothing'], answer: 0, why: 'A schema too strict forces made-up values.' },
  ],
  terms: [
    ['Structured output', 'Model output that follows a fixed format, such as a JSON schema.'],
    ['Constrained decoding', 'Masking invalid tokens at every generation step.'],
    ['Logit', 'The model\'s raw score for a candidate next token.'],
    ['Grammar', 'Rules that say which token sequences are allowed.'],
    ['Forced token', 'A token the schema fixes, written without the model.'],
    ['Field order', 'The order the model writes fields in, which shapes its answers.'],
  ],
  deeper: '<p><b>Three layers.</b> Prompting works most of the time. Provider structured-output modes are reliable for the schemas they support. Constrained decoding with a grammar engine works on any local model and is valid by construction.</p><p><b>Big choice lists.</b> A field with thousands of allowed values, like every town in a country, is slow to compile into a grammar. Retrieve a short list of likely values first, then constrain to those.</p><p><b>About this machine.</b> The model\'s token scores are scripted to show each case. The masking, the text written and the JSON parse are computed live.</p>',
  code: {
    title: 'Masking invalid tokens',
    note: 'Adapted from the course\'s structured outputs lesson.',
    text: `
import math

def constrained_step(logits, vocab, grammar_state):
    allowed = grammar_state.valid_next(vocab)       # from the schema
    masked = [l if tok in allowed else -math.inf
              for tok, l in zip(vocab, logits)]
    return max(range(len(vocab)), key=lambda i: masked[i])

# reasoning first, and let missing data be null
schema = {
    "type": "object",
    "properties": {
        "reason": {"type": "string"},
        "urgent": {"type": "boolean"},
        "date": {"type": ["string", "null"], "format": "date"},
    },
    "required": ["reason", "urgent", "date"],
}
`,
  },
};
