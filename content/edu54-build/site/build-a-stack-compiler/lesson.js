// Build it yourself: a one-pass compiler (after Let's Build a Compiler, the cradle port). A real recursive-descent compiler turns arithmetic into stack instructions as it reads, with no tree, and a real stack machine runs them. For a Mwanza ferry's passenger count.
function compile(src, o) {
  let i = 0; const code = [], next = () => src[i], skip = () => { while (src[i] === ' ') i++; }; let err = '';
  const factor = () => { skip(); if (next() === '(' && o.paren) { i++; expr(); skip(); if (next() !== ')') err = err || 'missing )'; else i++; return; } if (next() >= '0' && next() <= '9') { let n = ''; while (next() >= '0' && next() <= '9') n += src[i++]; code.push(`PUSH ${n}`); return; } err = err || `unexpected "${next() || 'end'}"`; i++; };
  const term = () => { factor(); skip(); while (next() === '*' || next() === '/') { const op = src[i++]; (o.prec ? factor : term)(); code.push(op === '*' ? 'MUL' : 'DIV'); skip(); } };
  const expr = () => { (o.prec ? term : factor)(); skip(); while (next() === '+' || next() === '-' || (!o.prec && (next() === '*' || next() === '/'))) { const op = src[i++]; (o.prec ? term : factor)(); code.push({ '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV' }[op]); skip(); } };
  expr(); skip(); if (i < src.length) err = err || `unexpected "${next()}"`;
  return { code, err };
}
function exec(code) { const s = []; let max = 0; code.forEach(c => { const [a, b] = c.split(' '); if (a === 'PUSH') s.push(+b); else { const y = s.pop(), x = s.pop(); s.push(a === 'ADD' ? x + y : a === 'SUB' ? x - y : a === 'MUL' ? x * y : x / y); } max = Math.max(max, s.length); }); return { v: s[0], max }; }
const SRC = ['2 + 3 * 4', '(2 + 3) * 4', '10 - 4 - 3', '2 + * 3'], TRUE = [14, 20, 3, null];
function run(o) { const c = compile(SRC[o.i], o), e = c.err ? { v: null, max: 0 } : exec(c.code); return { ...c, code: c.err ? [] : c.code, ...e, want: TRUE[o.i], right: e.v === TRUE[o.i] }; }

export default {
  slug: 'build-a-stack-compiler',
  title: 'Build your own one-pass compiler',
  description: 'Read arithmetic once, and write stack instructions as you go. Precedence comes from how the functions call each other.',
  overview: 'A compiler doesn\'t have to build a tree. A one-pass compiler writes code while it reads. Each grammar rule is one function. An expression is terms joined by plus or minus. A term is factors joined by times or divide. A factor is a number, or a bracketed expression. The way those functions call each other is what makes times bind tighter than plus, and no table is needed. Each number becomes a push, and each operator comes out after its operands. That order is what a stack machine wants. This real compiler and stack machine work out a passenger count for a ferry in Mwanza.',
  keywords: ['compiler', 'recursive descent', 'stack machine', 'precedence', 'parsing', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 0.85, 1.05], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, prec: true, paren: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.05 + i * 0.52;
    const T = Array.from({ length: 7 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.42, 0.14, 0.7, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.0, 0.03, -0.05);
    S.add(P.keep(-2.35, 2.3, 0.7, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const c = R.code[i]; b.visible = !!c; if (c) { const push = c.startsWith('PUSH'); m.color.set(push ? BLUE : SAF); b.scale.y = push ? 1 : 2.4; } }); lamp.userData.set({ color: R.err || !R.right ? (st.i === 3 && R.err ? '#E0A82E' : '#D9483B') : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Source', options: SRC, get: () => st.i, act: i => set({ i }) }, tg('prec', 'Separate term and factor', 'Precedence'), tg('paren', 'Handle brackets', 'Brackets')];
    const readouts = [
      { label: 'Instructions', get: () => ({ v: R.code.join(' · ') || 'none' }) },
      { label: 'Result', get: () => (R.err ? { v: 'no code', sub: R.err, bad: st.i !== 3 } : { v: `${R.v}`, sub: `should be ${R.want}`, good: R.right, bad: !R.right }) },
      { label: 'Stack depth', get: () => ({ v: `${R.max}` }) },
    ];
    const labels = [
      { name: 'c', t: 'Code, in order', d: 'Blue push, tall gold operator', icon: 'code', atV: V(X(0) - 0.23, 0.1, -0.05) },
      { name: 'l', t: 'Right answer?', d: 'Amber: an error, reported', icon: 'check', atV: V(2.17, 0.3, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One flat level', hint: 'no term function', on: () => set({ ...D0, prec: false }), off: reset },
      { label: 'No brackets', hint: 'a factor is only a number', on: () => set({ ...D0, i: 1, paren: false }), off: reset },
    ];
    function status() {
      if (R.err && st.i === 3) return { ok: true, msg: `<b>Stopped: ${R.err}.</b> The compiler reports where it lost its way, and writes no code.` };
      if (R.err) return { ok: false, msg: `<b>${R.err}.</b> Without a rule for brackets, the factor function doesn\'t know that symbol.` };
      if (!R.right) return { ok: false, msg: `<b>It says ${R.v}, and the sum is ${R.want}.</b> With one level, operators run left to right, so plus runs first.` };
      return { ok: true, msg: `<b>${R.v}, from ${R.code.length} instructions.</b> The calls between functions set the order.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No tree', home: true, say: 'A ferry in Mwanza adds up a sum. This compiler reads it once, and writes as it goes.', act: m => m.set({ i: 0, prec: true, paren: true }) },
    { t: 'One function a rule', home: true, say: 'Expression, term and factor are three small functions.', act: m => m.set({ i: 2, prec: true, paren: true }) },
    { t: 'Precedence', home: true, say: 'Flatten them, and plus runs before times. The answer is wrong.', act: m => m.set({ i: 0, prec: false, paren: true }) },
    { t: 'Brackets', home: true, say: 'A factor can call expression again. That\'s the recursion.', act: m => m.set({ i: 1, prec: true, paren: true }) },
    { t: 'The stack', home: true, say: 'Operators come after their operands, as a stack machine wants.', act: m => m.set({ i: 1, prec: true, paren: true }) },
    { t: 'Errors', home: true, say: 'Bad input stops with a message, and no code.', act: m => m.set({ i: 3, prec: true, paren: true }) },
  ],
  check: [
    { q: 'What sets precedence here?', options: ['How the functions call each other', 'A table of numbers', 'The stack'], answer: 0, why: 'Term sits below expression.', hint: 'Try One flat level.' },
    { q: 'What makes brackets work?', options: ['A factor calls expression again', 'A special instruction', 'A second pass'], answer: 0, why: 'That\'s the recursive part.', hint: 'See Brackets.' },
    { q: 'What does a one-pass compiler skip?', options: ['Building a tree', 'Reading the source', 'Writing code'], answer: 0, why: 'It writes as it reads.', hint: 'See No tree.' },
  ],
  terms: [['Recursive descent', 'One function per grammar rule.'], ['Term', 'Factors joined by times or divide.'], ['Factor', 'A number or bracket.'], ['Stack machine', 'Instructions that work on a stack.']],
  deeper: '<p><b>Real code.</b> The compiler and stack machine run live.</p><p><b>Trade-off.</b> With no tree, there\'s less to optimise. See the tiny compiler lesson for one with a tree.</p>',
  credit: 'Built from <a href="https://g-ford.github.io/cradle/" target="_blank" rel="noopener">Let\'s Build a Compiler</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short compiler, written for this lesson.',
  code: {
    title: 'Three functions',
    note: 'Our own short version.',
    text: `
function expr() {
  term();
  while (peek() === "+") { next(); term(); emit("ADD"); }
}
function term() {
  factor();
  while (peek() === "*") { next(); factor(); emit("MUL"); }
}
function factor() {
  if (peek() === "(") { next(); expr(); next(); }
  else emit("PUSH " + number());
}
`,
  },
};
