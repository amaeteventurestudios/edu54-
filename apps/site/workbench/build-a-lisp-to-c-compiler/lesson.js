// Build it yourself: the four stages of a tiny compiler (after The Super Tiny Compiler, CC BY 4.0). A real tokeniser, parser, transformer and generator turn (add 2 (subtract 4 2)) into add(2, subtract(4, 2)). A Moroni tide tool. The node count per stage is shown as towers.
function tokens(s) { const t = []; let i = 0; while (i < s.length) { const c = s[i]; if (c === '(' || c === ')') { t.push({ k: 'paren', v: c }); i++; } else if (/\s/.test(c)) i++; else if (/[0-9]/.test(c)) { let v = ''; while (/[0-9]/.test(s[i] || '')) v += s[i++]; t.push({ k: 'num', v }); } else if (/[a-z]/.test(c)) { let v = ''; while (/[a-z]/.test(s[i] || '')) v += s[i++]; t.push({ k: 'name', v }); } else throw new Error(`bad character ${c}`); } return t; }
function parse(t) { let i = 0; const walk = () => { const x = t[i]; if (!x) throw new Error('ran out of tokens'); if (x.k === 'num') { i++; return { type: 'Number', v: x.v }; } if (x.k === 'paren' && x.v === '(') { const n = { type: 'Call', name: t[++i].v, args: [] }; i++; while (!t[i] || !(t[i].k === 'paren' && t[i].v === ')')) { if (!t[i]) throw new Error('missing )'); n.args.push(walk()); } i++; return n; } throw new Error(`unexpected ${x.v}`); }; const a = []; while (i < t.length) a.push(walk()); return a; }
const count = n => (n.type === 'Call' ? 1 + n.args.reduce((a, x) => a + count(x), 0) : 1);
const gen = n => (n.type === 'Call' ? `${n.name}(${n.args.map(gen).join(', ')})` : n.v);
const genLisp = n => (n.type === 'Call' ? `(${n.name} ${n.args.map(genLisp).join(' ')})` : n.v);
const fold = n => { if (n.type !== 'Call') return n; const a = n.args.map(fold); if (a.every(x => x.type === 'Number') && (n.name === 'add' || n.name === 'subtract') && a.length === 2) { const [p, q] = a.map(x => +x.v); return { type: 'Number', v: `${n.name === 'add' ? p + q : p - q}` }; } return { ...n, args: a }; };
const SRC = ['(add 2 2)', '(add 2 (subtract 4 2))', '(add 2 (subtract 4 2)', '(add 2 $)'];
function run(o) {
  try { const t = tokens(SRC[o.i]), a = parse(t), b = o.fold ? a.map(fold) : a, out = b.map(o.c ? gen : genLisp).join('; ');
    return { t: t.length, a: a.reduce((x, n) => x + count(n), 0), b: b.reduce((x, n) => x + count(n), 0), out, err: '' }; } catch (e) { return { t: 0, a: 0, b: 0, out: '', err: e.message }; }
}

export default {
  slug: 'build-a-lisp-to-c-compiler',
  title: 'Build your own Lisp-to-C compiler',
  description: 'Tokens, a tree, a new tree, then text. Four small stages, each with one job.',
  overview: 'Most compilers follow the same line. A tokeniser splits text into pieces. A parser arranges them in a tree. A transformer rewrites that tree, here into the shape of the new language. A generator walks it and prints text. The two languages can look very different on the surface, but they share a tree. Between stages, you can also improve the tree, and that\'s where optimisers work: folding a sum that can be done now is one small step. This real compiler turns a small Lisp into C-style calls, for a tide tool in Moroni. Bad input stops at the stage that spots it.',
  keywords: ['compiler', 'AST', 'tokeniser', 'code generation', 'Lisp', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 1, fold: false, c: true }, st = { ...D0 };
    const CL = ['#5B8DB8', '#7B6FA8', '#1F9E89'], ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.6 + i * 1.1;
    const T = CL.map((c, i) => { const t = add(P.tower(0.6, 0.4, c)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.5, r: 0.12 })); lamp.position.set(X(3), 0.03, -0.1);
    S.add(P.keep(-2.3, 2.3, 1.1, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); [R.t, R.a, R.b].forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 0.11) })); lamp.userData.set({ color: R.err ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [{ type: 'buttons', label: 'Source', options: ['Short', 'Nested', 'No bracket', 'Bad symbol'], get: () => st.i, act: i => set({ i }) }, { type: 'toggle', label: 'Fold constants', short: 'Fold', get: () => st.fold, set: v => set({ fold: !!v }) }, { type: 'toggle', label: 'Generate C-style calls', short: 'C style', get: () => st.c, set: v => set({ c: !!v }) }];
    const readouts = [
      { label: 'Source', get: () => ({ v: SRC[st.i] }) },
      { label: 'Output', get: () => (R.err ? { v: 'none', sub: R.err, bad: true } : { v: R.out, good: true }) },
      { label: 'Tokens, then nodes', get: () => ({ v: `${R.t}, ${R.a}, ${R.b}`, sub: 'tokens, tree, new tree' }) },
    ];
    const labels = [
      { name: 'a', t: 'Tokens, then trees', d: 'Height: how many pieces', icon: 'box', atV: V(X(0) - 0.33, 0.2, -0.1) },
      { name: 'b', t: 'Generated', d: 'Red: stopped by an error', icon: 'code', atV: V(X(3) + 0.15, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A missing bracket', hint: 'the parser finds it', on: () => set({ ...D0, i: 2 }), off: reset },
      { label: 'A bad symbol', hint: 'the tokeniser finds it', on: () => set({ ...D0, i: 3 }), off: reset },
    ];
    function status() {
      if (R.err) return { ok: false, msg: `<b>Stopped: ${R.err}.</b> ${st.i === 3 ? 'The tokeniser couldn\'t name it, so nothing later ran.' : 'Tokens were fine, and the tree couldn\'t close.'}` };
      if (st.fold && R.b < R.a) return { ok: true, msg: `<b>The tree shrank from ${R.a} nodes to ${R.b}.</b> Sums known now don\'t need to run later.` };
      return { ok: true, msg: st.c ? `<b>${SRC[st.i]} became ${R.out}.</b> Same tree, different text.` : '<b>With the tree printed as it came, the output is the input.</b> Rewriting the tree is what changes the language.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four stages', home: true, say: 'A tide tool in Moroni is written in one language, and must run in another.', act: m => m.set({ i: 0, fold: false, c: true }) },
    { t: 'Tokens', home: true, say: 'First, split the text into pieces.', act: m => m.set({ i: 1, fold: false, c: false }) },
    { t: 'The tree', home: true, say: 'The parser arranges them in a tree, so nesting has a shape.', act: m => m.set({ i: 1, fold: false, c: false }) },
    { t: 'Transform', home: true, say: 'Rewrite the tree, and a generator prints the new language.', act: m => m.set({ i: 1, fold: false, c: true }) },
    { t: 'Fold', home: true, say: 'Between stages, do any sum that can be done now.', act: m => m.set({ i: 1, fold: true, c: true }) },
    { t: 'Errors', home: true, say: 'Each stage catches what it can see.', act: m => m.set({ i: 2, fold: false, c: true }) },
  ],
  check: [
    { q: 'What does a parser make?', options: ['A tree', 'Machine code', 'Tokens'], answer: 0, why: 'Nesting needs a shape.', hint: 'See The tree.' },
    { q: 'What does constant folding do?', options: ['Does sums at compile time', 'Removes comments', 'Adds types'], answer: 0, why: 'The tree shrinks.', hint: 'See Fold.' },
    { q: 'What stage finds a bad symbol?', options: ['The tokeniser', 'The generator', 'The transformer'], answer: 0, why: 'It can\'t name it.', hint: 'Try A bad symbol.' },
  ],
  terms: [['Token', 'One piece of source.'], ['AST', 'A tree of the program.'], ['Transformer', 'Rewrites the tree.'], ['Constant folding', 'Doing sums early.']],
  deeper: '<p><b>Real code.</b> All four stages run live.</p><p><b>Compare.</b> The one-pass compiler lesson skips the tree altogether.</p>',
  credit: 'Built from <a href="https://github.com/jamiebuilds/the-super-tiny-compiler" target="_blank" rel="noopener">The Super Tiny Compiler</a> by Jamie Kyle (CC BY 4.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short compiler, after the original\'s four stages.',
  code: {
    title: 'The generator',
    note: 'Our own short version.',
    text: `
function generate(node) {
  if (node.type === "Call")
    return node.name + "(" + node.args.map(generate).join(", ") + ")";
  return node.value;
}

const compile = src => generate(transform(parse(tokenize(src))));
`,
  },
};
