// Build your own compiler: arithmetic from an invented spreadsheet-style app passes through the classic stages. A tokenizer turns characters
// into tokens; a recursive-descent parser builds a syntax tree, giving * and / higher precedence than + and -, and making - and / associate to
// the left; an optional pass folds constant subtrees; a code generator emits stack-machine instructions, which are then run. Each stage can be
// broken. Everything is computed by the small compiler in this file.
const INPUTS = ['2 + 3 * 4', '(2 + 3) * 4', '12 - 4 - 3', '100 / 10 / 5'];
function tokenize(src, whole) {
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (/\d/.test(c)) { if (whole) { let j = i; while (j < src.length && /\d/.test(src[j])) j++; out.push({ t: 'num', v: +src.slice(i, j) }); i = j; } else { out.push({ t: 'num', v: +c }); i++; } continue; }
    out.push({ t: c }); i++;
  }
  return out;
}
function parse(toks, o) {
  let p = 0, err = null;
  const peek = () => toks[p], eat = t => { if (peek() && peek().t === t) return toks[p++]; err = err || `expected ${t}`; return null; };
  const atom = () => {
    const k = peek();
    if (!k) { err = err || 'unexpected end'; return { n: 0 }; }
    if (k.t === 'num') { p++; return { n: k.v }; }
    if (k.t === '(') { p++; const e = expr(); eat(')'); return e; }
    err = err || `unexpected ${k.t}`; p++; return { n: 0 };
  };
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const climb = min => {
    let left = atom();
    while (peek() && PREC[peek().t] && (o.prec ? PREC[peek().t] : 1) >= min) {
      const op = toks[p++].t, pr = o.prec ? PREC[op] : 1;
      const right = o.left ? climb(pr + 1) : climb(pr);
      left = { op, l: left, r: right };
    }
    return left;
  };
  const expr = () => climb(1);
  const tree = expr();
  if (!err && p < toks.length) err = `unexpected ${toks[p].t === 'num' ? toks[p].v : toks[p].t}`;
  return { tree, err };
}
const evalT = t => t.op === undefined ? t.n : ({ '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b })[t.op](evalT(t.l), evalT(t.r));
const fold = t => { if (t.op === undefined) return t; const l = fold(t.l), r = fold(t.r); return l.op === undefined && r.op === undefined ? { n: evalT({ op: t.op, l, r }) } : { op: t.op, l, r }; };
const gen = t => t.op === undefined ? [`PUSH ${t.n}`] : [...gen(t.l), ...gen(t.r), ({ '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV' })[t.op]];
function compile(o) {
  const src = INPUTS[o.input], toks = tokenize(src, o.whole), { tree, err } = parse(toks, o);
  const truth = { 0: 14, 1: 20, 2: 5, 3: 2 }[o.input];
  if (err) return { src, toks, tree: null, err, code: [], value: null, truth };
  const final = o.fold ? fold(tree) : tree, code = gen(final);
  const stack = []; code.forEach(c => { if (c.startsWith('PUSH')) stack.push(+c.slice(5)); else { const b = stack.pop(), a = stack.pop(); stack.push({ ADD: a + b, SUB: a - b, MUL: a * b, DIV: a / b }[c]); } });
  return { src, toks, tree: final, raw: tree, err: null, code, value: stack[0], truth };
}

export default {
  slug: 'build-a-compiler',
  title: 'Build your own compiler',
  description: 'A small language becomes machine code in stages: tokens, a tree, then instructions on a stack. Each stage hands the next something simpler.',
  overview: 'A compiler turns text written for people into instructions a machine can run, and even a tiny one, such as the Super Tiny Compiler or the one in Let\'s Build a Compiler, has the same stages as a large one. The tokenizer, or lexer, reads characters and groups them into tokens: the number 12, the operator minus, a left bracket. Reading 12 as two tokens, 1 and 2, is a classic first bug. The parser reads tokens and builds an abstract syntax tree, whose shape records what the expression means. Two rules decide the shape. Precedence makes multiplication and division bind tighter than addition and subtraction, so 2 + 3 * 4 is 2 + (3 * 4); a parser that simply reads left to right computes (2 + 3) * 4. Associativity decides how operators of equal precedence group: subtraction and division associate to the left, so 12 - 4 - 3 is (12 - 4) - 3, and a parser that recurses on the right side computes 12 - (4 - 3). A recursive-descent parser with precedence climbing handles both by calling itself with a minimum precedence. Next, optimisation passes transform the tree; constant folding replaces any subtree made only of numbers with its value, so the program does that work once, at compile time. Finally, the code generator walks the tree and emits instructions, here for a stack machine: push both operands, then apply the operator. Real compilers add type checking, many more passes and register allocation, but the pipeline is the same. This machine compiles four expressions from an invented spreadsheet-style app.',
  keywords: ['build your own compiler', 'tokenizer', 'parser', 'abstract syntax tree', 'operator precedence', 'code generation', 'constant folding'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/jamiebuilds/the-super-tiny-compiler" target="_blank" rel="noopener">The Super Tiny Compiler</a> (CC BY 4.0) and its <a href="https://github.com/hazbo/the-super-tiny-compiler" target="_blank" rel="noopener">Go port</a> (CC BY 4.0), and <a href="https://g-ford.github.io/cradle/" target="_blank" rel="noopener">Let\'s Build a Compiler</a> (MIT), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short expression compiler, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { input: 0, whole: true, prec: true, left: true, fold: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const head = (x, z, s) => {    };
    head(-2.45, -0.97, 'source'); head(-0.95, -0.97, 'tokens'); head(-1.35, -0.52, 'syntax tree'); head(0.6, -0.52, 'stack code');

    let parts = [];

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = compile(st);
      parts.forEach(p => p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; floor.add(o); parts.push(o); return o; };
      R.toks.forEach((k, i) => {
        const x = -1.75 + i * 0.27, w = 0.24;
        const b = add(P.box(w, 0.04, 0.2, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: k.t === 'num' ? '#D9F0E9' : '#E4E9F7' }) })); b.position.set(x, 0.12, -0.8);
      });
      if (R.tree) {
        let leaf = 0;
        const layout = (t, d) => { if (t.op === undefined) { t._x = leaf++; t._d = d; return; } layout(t.l, d + 1); layout(t.r, d + 1); t._x = (t.l._x + t.r._x) / 2; t._d = d; };
        layout(R.tree, 0);
        const span = Math.max(1, leaf - 1), X = v => -2.55 + (v / span) * 2.3, Z = d => -0.32 + d * 0.27;
        const drawN = t => {
          const isOp = t.op !== undefined;
          if (isOp) { [t.l, t.r].forEach(c => add(P.tube([V(X(t._x), 0.15, Z(t._d)), V(X(c._x), 0.15, Z(c._d))], 0.008, '#B9B3A6', { straight: true }))); drawN(t.l); drawN(t.r); }
          const d = add(P.cyl(0.11, 0.05, '#fff', { material: new THREE.MeshLambertMaterial({ color: isOp ? '#FBE3B0' : '#D9F0E9' }) })); d.position.set(X(t._x), 0.12, Z(t._d));
        };
        drawN(R.tree);
      } else {
      }
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return !R.err && Math.abs(R.value - R.truth) < 1e-9 && st.whole && st.prec && st.left; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Read whole numbers', short: 'Numbers', get: () => st.whole, set: v => set({ whole: !!v }) },
      { type: 'toggle', label: 'Give * and / higher precedence', short: 'Precedence', get: () => st.prec, set: v => set({ prec: !!v }) },
      { type: 'toggle', label: 'Make - and / associate left', short: 'Left assoc', get: () => st.left, set: v => set({ left: !!v }) },
      { type: 'toggle', label: 'Fold constants at compile time', short: 'Fold', get: () => st.fold, set: v => set({ fold: !!v }) },
      { type: 'buttons', label: 'Expression', options: INPUTS, get: () => st.input, act: i => set({ input: i }) },
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: R.err ? 'error' : `${+R.value.toFixed(3)}`, sub: `should be ${R.truth}`, good: !R.err && R.value === R.truth, bad: R.err || R.value !== R.truth }) },
      { label: 'Tokens', get: () => ({ v: `${R.toks.length}`, sub: 'from the source', good: st.whole, bad: !st.whole }) },
      { label: 'Instructions', get: () => ({ v: `${R.code.length}`, sub: st.fold ? 'after folding' : 'no folding', good: true, bad: false }) },
    ];
    const labels = [
      { name: 's', t: 'The stages', d: 'Tokens, tree, code', icon: 'code', atV: V(-2.0, 0.15, -0.5) },
      { name: 't', t: 'The result', d: 'Compiled and run', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read numbers digit by digit', hint: '12 becomes 1 and 2', on: () => set({ ...D0, whole: false, input: 2 }), off: reset },
      { label: 'Ignore precedence', hint: 'left to right', on: () => set({ ...D0, prec: false, input: 0 }), off: reset },
      { label: 'Make minus right-associative', hint: '12 - (4 - 3)', on: () => set({ ...D0, left: false, input: 2 }), off: reset },
    ];
    function status() {
      const r = R, v = r.value === null ? null : +r.value.toFixed(3);
      if (r.err) return { ok: false, msg: `<b>Reading digit by digit, ${r.src} became tokens ${r.toks.map(k => k.v ?? k.t).join(' ')}, two numbers in a row, so the parser stops: ${r.err}.</b> The tokenizer must keep reading digits until the number ends.` };
      if (!st.whole) return { ok: false, msg: `<b>This expression happens to compile, but the tokenizer reads numbers digit by digit: try 12 - 4 - 3.</b> Keep reading digits until the number ends.` };
      if (!st.prec && v !== r.truth) return { ok: false, msg: `<b>With no precedence, ${r.src} is parsed left to right and runs to ${v} instead of ${r.truth}.</b> Multiplication and division must bind tighter: parse them at a higher precedence level.` };
      if (!st.left && v !== r.truth) return { ok: false, msg: `<b>Recursing on the right made ${r.src} group from the right, so it runs to ${v} instead of ${r.truth}.</b> Subtraction and division associate to the left: parse the right side at one level higher.` };
      if (!st.prec || !st.left) return { ok: false, msg: `<b>${r.src} happens to come out right, ${v}, but the parser ${!st.prec ? 'ignores precedence' : 'groups from the right'}: try ${!st.prec ? '2 + 3 * 4' : '12 - 4 - 3'}.</b>` };
      return { ok: true, msg: `<b>${r.src} becomes ${r.toks.length} tokens, a tree whose shape puts ${st.input === 1 ? 'the bracket first' : 'tighter and earlier operators lower'}, and ${r.code.length} stack instruction${r.code.length > 1 ? 's' : ''} that run to ${v}.</b> ${st.fold ? 'Folding did all the arithmetic at compile time.' : 'Turn on folding to do the arithmetic at compile time.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Characters to tokens', home: true, say: 'The tokenizer groups characters into tokens: numbers, operators, brackets.', act: m => m.set({ input: 2, whole: true, prec: true, left: true, fold: false }) },
    { t: 'Tokens to a tree', home: true, say: 'The parser builds a syntax tree. Its shape is the meaning: multiplication sits lower, so it happens first.', act: m => m.set({ input: 0, whole: true, prec: true, left: true, fold: false }) },
    { t: 'Precedence', home: true, say: 'Without precedence, two plus three times four is read left to right and comes out twenty.', act: m => m.set({ input: 0, whole: true, prec: false, left: true, fold: false }) },
    { t: 'Associativity', home: true, say: 'Subtraction groups from the left. Group from the right and twelve minus four minus three becomes eleven.', act: m => m.set({ input: 2, whole: true, prec: true, left: false, fold: false }) },
    { t: 'Generate code', home: true, say: 'Walk the tree and emit stack instructions: push both sides, then apply the operator.', act: m => m.set({ input: 1, whole: true, prec: true, left: true, fold: false }) },
    { t: 'Fold constants', home: true, say: 'An optimiser can do the arithmetic at compile time, leaving a single push.', act: m => m.set({ input: 1, whole: true, prec: true, left: true, fold: true }) },
  ],
  check: [
    { q: 'What does precedence decide?', options: ['Which operators bind tighter, like * before +', 'The order of tokens', 'The output language'], answer: 0, why: '2 + 3 * 4 is 14.', hint: 'Try Ignore precedence.' },
    { q: 'How should 12 - 4 - 3 group?', options: ['(12 - 4) - 3: left-associative', '12 - (4 - 3)', 'Either'], answer: 0, why: 'Subtraction associates left.', hint: 'Try Make minus right-associative.' },
    { q: 'What does constant folding do?', options: ['Computes number-only subtrees at compile time', 'Removes tokens', 'Checks types'], answer: 0, why: 'Work done once.', hint: 'Turn on Fold.' },
  ],
  terms: [
    ['Token', 'A meaningful unit of source text, such as a number or operator.'],
    ['Parser', 'Turns tokens into a syntax tree.'],
    ['Syntax tree', 'A tree whose shape records what the code means.'],
    ['Precedence', 'Which operators bind tighter than others.'],
    ['Associativity', 'How operators of equal precedence group.'],
    ['Code generation', 'Turning the tree into instructions for a machine.'],
  ],
  deeper: '<p><b>Error messages.</b> Good parsers report where an error is and recover to find more than one; tokens carry their line and column for this.</p><p><b>Beyond arithmetic.</b> Statements, variables and functions add a symbol table and more node types, but the stages stay the same.</p><p><b>About this machine.</b> The compiler, tree and stack machine are all computed by this lesson.</p>',
  code: {
    title: 'Precedence climbing in a few lines',
    note: 'Our own short version, written for this lesson.',
    text: `
PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def parse_expr(tokens, min_prec=1):
    left = parse_atom(tokens)                    # a number or a bracketed expression
    while tokens and tokens[0] in PREC and PREC[tokens[0]] >= min_prec:
        op = tokens.pop(0)
        right = parse_expr(tokens, PREC[op] + 1)  # +1: left-associative
        left = (op, left, right)
    return left

def gen(node):
    if isinstance(node, int):
        return [f"PUSH {node}"]
    op, l, r = node
    return gen(l) + gen(r) + [{"+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV"}[op]]
`,
  },
};
