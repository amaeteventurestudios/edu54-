// Build it yourself: a JSON decoder (after json-algorithm). A real character-by-character decoder for a Dakar bus feed, driven by a stack of states: value, string, number, array, object. Tiles show each state's depth over time; malformed inputs get errors with a position.
const INS = ['{"line":"12","stops":[3,7]}', '[1,[2,[3]]]', '"caf\\u00e9"', '{"a":1,}', '[1,2', '{"a" 1}'];
function decode(t, o) {
  let i = 0, max = 0, depth = 0, steps = 0; const trace = [], ws = () => { while (' \n\t'.includes(t[i]) && i < t.length) i++; };
  const fail = m => { throw new Error(`${m} at ${i}`); };
  const val = () => { steps++; ws(); const c = t[i]; trace.push(depth); max = Math.max(max, depth); if (o.limit && depth > 2) fail('too deep');
    if (c === '{') return obj(); if (c === '[') return arr(); if (c === '"') return str(); if (c === '-' || (c >= '0' && c <= '9')) return num(); fail(c === undefined ? 'unexpected end' : `unexpected "${c}"`); };
  const str = () => { i++; let s = ''; while (i < t.length && t[i] !== '"') { if (t[i] === '\\') { i++; if (t[i] === 'u' && o.uni) { s += String.fromCharCode(parseInt(t.slice(i + 1, i + 5), 16)); i += 5; continue; } s += t[i++]; continue; } s += t[i++]; } if (t[i] !== '"') fail('unterminated string'); i++; return s; };
  const num = () => { const st = i; if (t[i] === '-') i++; while (t[i] >= '0' && t[i] <= '9') i++; if (t[i] === '.') { i++; while (t[i] >= '0' && t[i] <= '9') i++; } return Number(t.slice(st, i)); };
  const arr = () => { i++; depth++; const a = []; ws(); if (t[i] === ']') { i++; depth--; return a; } for (;;) { a.push(val()); ws(); if (t[i] === ',') { i++; ws(); if (t[i] === ']' && !o.strict) break; continue; } if (t[i] === ']') break; fail(t[i] === undefined ? 'unexpected end' : 'expected , or ]'); } i++; depth--; return a; };
  const obj = () => { i++; depth++; const m = {}; ws(); if (t[i] === '}') { i++; depth--; return m; } for (;;) { ws(); if (t[i] === '}' && !o.strict) break; if (t[i] !== '"') fail('expected a key'); const k = str(); ws(); if (t[i] !== ':') fail('expected :'); i++; m[k] = val(); ws(); if (t[i] === ',') { i++; continue; } if (t[i] === '}') break; fail(t[i] === undefined ? 'unexpected end' : 'expected , or }'); } i++; depth--; return m; };
  try { const v = val(); ws(); if (i < t.length) fail('extra text'); return { v, trace, max, steps, err: '' }; } catch (e) { return { v: undefined, trace, max, steps, err: e.message }; }
}
function run(o) { return decode(INS[o.i], o); }

export default {
  slug: 'build-a-json-decoder',
  title: 'Build your own JSON decoder',
  description: 'Read one character at a time, keep a stack, and be strict about what you accept.',
  overview: 'JSON looks too simple to need a parser. A decoder reads one character at a time, and the first character decides what comes next: a brace opens an object, a bracket opens an array, a quote opens a string. Containers nest, so the decoder needs a stack, which is what function calls give it here. Details need care: escape sequences in strings, numbers with a fraction, and a position for every error. Being strict matters as well. A decoder that forgives a trailing comma accepts documents that other decoders reject, and those gaps have caused real bugs. This real decoder reads a bus feed in Dakar.',
  keywords: ['JSON', 'parser', 'decoder', 'recursive descent', 'strictness', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.8, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, strict: true, uni: true, limit: false }, st = { ...D0 };
    const BLUE = '#5B8DB8', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.95 + i * 0.44;
    const T = Array.from({ length: 8 }, (_, i) => { const t = add(P.tower(0.34, 0.4, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.0, 0.03, -0.1);
    S.add(P.keep(-2.3, 2.3, 1.1, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => { const d = R.trace[i]; t.visible = d !== undefined; if (d !== undefined) t.userData.set({ h: 0.15 + d * 0.25 }); }); lamp.userData.set({ color: R.err ? (st.i >= 3 && st.strict ? '#E0A82E' : '#D9483B') : st.i >= 3 ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Input', options: ['Feed', 'Nested', 'Escapes', 'Trailing comma', 'Cut short', 'Missing colon'], get: () => st.i, act: i => set({ i }) }, tg('strict', 'Reject trailing commas', 'Strict'), tg('uni', 'Decode unicode escapes', 'Unicode'), tg('limit', 'Limit depth to two', 'Depth limit')];
    const readouts = [
      { label: 'Input', get: () => ({ v: INS[st.i] }) },
      { label: 'Decoded', get: () => (R.err ? { v: 'refused', sub: R.err } : { v: JSON.stringify(R.v), good: st.i < 3, bad: st.i >= 3 }) },
      { label: 'Values read, deepest', get: () => ({ v: `${R.steps}, ${R.max}` }) },
    ];
    const labels = [
      { name: 't', t: 'One tower per value', d: 'Height: nesting depth', icon: 'box', atV: V(X(0) - 0.19, 0.15, -0.1) },
      { name: 'l', t: 'Verdict', d: 'Amber: rightly refused', icon: 'check', atV: V(2.17, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forgive trailing commas', hint: 'decoders now disagree', on: () => set({ ...D0, i: 3, strict: false }), off: reset },
      { label: 'Skip unicode escapes', hint: 'wrong text', on: () => set({ ...D0, i: 2, uni: false }), off: reset },
    ];
    function status() {
      if (!st.strict && st.i === 3) return { ok: false, msg: '<b>It accepted a document that strict decoders reject.</b> When two systems read one document differently, checks can be slipped past.' };
      if (!st.uni && st.i === 2) return { ok: false, msg: `<b>It decoded ${JSON.stringify(R.v)}.</b> The escape was read as plain letters, so the word is wrong.` };
      if (R.err && st.i >= 3) return { ok: true, msg: `<b>Refused: ${R.err}.</b> A position makes the error easy to fix.` };
      if (R.err) return { ok: true, msg: `<b>Refused: ${R.err}.</b> A depth limit stops a deep document from filling the stack.` };
      return { ok: true, msg: `<b>${R.steps} values read, up to ${R.max} deep.</b> The first character decided each one.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One character', home: true, say: 'A bus feed in Dakar sends JSON. A decoder reads it one character at a time.', act: m => m.set({ i: 0, strict: true, uni: true, limit: false }) },
    { t: 'First decides', home: true, say: 'The first character says what comes next: brace, bracket, quote or digit.', act: m => m.set({ i: 0, strict: true, uni: true, limit: false }) },
    { t: 'Nesting', home: true, say: 'Containers nest, so the decoder needs a stack.', act: m => m.set({ i: 1, strict: true, uni: true, limit: false }) },
    { t: 'Escapes', home: true, say: 'Strings have escapes, which must become real characters.', act: m => m.set({ i: 2, strict: true, uni: true, limit: false }) },
    { t: 'Errors', home: true, say: 'A cut-off document gets a message with its position.', act: m => m.set({ i: 4, strict: true, uni: true, limit: false }) },
    { t: 'Be strict', home: true, say: 'Forgive a trailing comma, and your decoder disagrees with others.', act: m => m.set({ i: 3, strict: false, uni: true, limit: false }) },
  ],
  check: [
    { q: 'What decides what comes next?', options: ['The first character', 'The file size', 'The last character'], answer: 0, why: 'One look is enough.', hint: 'See First decides.' },
    { q: 'Why is a stack needed?', options: ['Containers nest', 'For speed', 'For strings'], answer: 0, why: 'You must return to the outer one.', hint: 'See Nesting.' },
    { q: 'Why be strict?', options: ['Decoders that disagree cause bugs', 'It is shorter', 'It uses less memory'], answer: 0, why: 'One document, two readings.', hint: 'Try Forgive trailing commas.' },
  ],
  terms: [['Token', 'One meaningful piece.'], ['Escape', 'A backslash sequence.'], ['Stack', 'Where containers wait.'], ['Trailing comma', 'A comma before a close.']],
  deeper: '<p><b>Real code.</b> This decoder runs live on six inputs.</p><p><b>Original.</b> The source writes this as an explicit state machine, with a stack you can see.</p>',
  credit: 'Built from <a href="https://github.com/cheery/json-algorithm" target="_blank" rel="noopener">JSON Decoding Algorithm</a> by Henri Tuhola (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small decoder, written for this lesson.',
  code: {
    title: 'First character',
    note: 'Our own short version.',
    text: `
function value() {
  skipSpace();
  const c = text[i];
  if (c === "{") return object();
  if (c === "[") return array();
  if (c === '"') return string();
  if (c === "-" || isDigit(c)) return number();
  fail("unexpected " + c + " at " + i);
}
`,
  },
};
