// Build it yourself: a Forth (after Jonesforth, public domain). A real tiny Forth for a Nouakchott date farm: a data stack, a dictionary, and colon definitions that compile words into lists. Each run counts stack depth and dictionary size.
function forth(src, o) {
  const dict = { '+': s => s.push(s.pop() + s.pop()), '*': s => s.push(s.pop() * s.pop()), dup: s => { const a = s.pop(); s.push(a, a); }, swap: s => { const a = s.pop(), b = s.pop(); s.push(a, b); }, drop: s => { s.pop(); } };
  const s = [], w = src.split(' '); let i = 0, max = 0, err = '', defs = 0;
  const exec = t => { if (err) return; const d = dict[t];
    if (d !== undefined) { if (Array.isArray(d)) d.forEach(exec); else { const need = { '+': 2, '*': 2, swap: 2, dup: 1, drop: 1 }[t]; if (o.guard && s.length < need) { err = `stack underflow at ${t}`; return; } d(s); } }
    else if (/^-?\d+$/.test(t)) s.push(+t); else err = `unknown word ${t}`; max = Math.max(max, s.length); };
  while (i < w.length && !err) { const t = w[i++];
    if (t === ':' && o.colon) { const name = w[i++], body = []; while (w[i] !== ';' && i < w.length) body.push(w[i++]); i++; dict[name] = o.late ? body : body.reduce((a, b) => (Array.isArray(dict[b]) ? [...a, ...dict[b]] : [...a, b]), []); defs++; }
    else exec(t); }
  return { s, max, err, defs, words: Object.keys(dict).length, nan: s.some(x => Number.isNaN(x)) };
}
const PROG = ['2 3 + 4 *', ': square dup * ; 7 square', ': square dup * ; : tenfold 10 * ; 3 square tenfold', '1 +', '3 cube'];

export default {
  slug: 'build-a-forth',
  title: 'Build your own Forth',
  description: 'A stack, a dictionary and a colon. That\'s a whole language.',
  overview: 'Forth may be the smallest real language. It has no grammar to speak of. Words are separated by spaces, and each one runs in turn. A number goes on the stack. Any other word is looked up in a dictionary, and runs. Plus takes two numbers and leaves one. The clever part is the colon. It defines a new word as a list of existing words, and the new word sits in the dictionary as if it had always been there. A language grows by adding words to itself. This real tiny Forth counts date crates for a farm near Nouakchott.',
  keywords: ['Forth', 'stack machine', 'interpreter', 'dictionary', 'programming language', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 1, colon: true, guard: true, late: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const Stack = Array.from({ length: 5 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.9, 0.14, 0.7, '#fff', { r: 0.03, material: m }); b.position.set(-1.1, 0.05 + i * 0.2, -0.05); S.add(b); return b; });
    const Dict = Array.from({ length: 7 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: i < 5 ? GOOD : '#F2AE0C' }), b = P.box(0.26, 0.2, 0.7, '#fff', { r: 0.02, material: m }); b.position.set(0.2 + i * 0.32, 0.03, -0.05); S.add(b); return b; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(-2.1, 0.03, -0.05);
    S.add(P.keep(-2.3, 2.45, 1.1, -0.72, 0.72));
    let R = null;
    function draw() { R = run(); Stack.forEach((b, i) => { b.visible = i < R.max; }); Dict.forEach((b, i) => { b.visible = i < R.words; }); lamp.userData.set({ color: R.err || R.nan ? '#D9483B' : '#3E9B5F', on: true }); }
    const run = () => forth(PROG[st.i], st);
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Program', options: ['Sum', 'Square', 'Two words', 'Too few', 'Unknown'], get: () => st.i, act: i => set({ i }) }, tg('colon', 'Colon definitions', 'Colon'), tg('guard', 'Check stack depth', 'Guard')];
    const readouts = [
      { label: 'Program', get: () => ({ v: PROG[st.i] }) },
      { label: 'Left on the stack', get: () => (R.err ? { v: 'stopped', sub: R.err, bad: true } : { v: R.s.join(' ') || 'empty', bad: R.nan, good: !R.nan }) },
      { label: 'Dictionary', get: () => ({ v: `${R.words} words`, sub: `${R.defs} new` }) },
    ];
    const labels = [
      { name: 's', t: 'The stack', d: 'As deep as it reached', icon: 'box', atV: V(-0.62, 0.3, -0.05) },
      { name: 'd', t: 'The dictionary', d: 'Gold: words you added', icon: 'book', atV: V(1.62, 0.15, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No colon', hint: 'a language that can\'t grow', on: () => set({ ...D0, colon: false }), off: reset },
      { label: 'No depth check', hint: 'too few numbers', on: () => set({ ...D0, i: 3, guard: false }), off: reset },
    ];
    function status() {
      if (R.nan) return { ok: false, msg: '<b>Plus took a number that wasn\'t there, and left garbage.</b> Real Forth reads whatever memory is next.' };
      if (!st.colon && st.i && st.i < 3) return { ok: false, msg: `<b>${R.err}.</b> With no colon, the name "square" means nothing, and the language can\'t grow.` };
      if (R.err) return { ok: true, msg: `<b>Stopped: ${R.err}.</b> A clear message, not a wrong answer.` };
      return { ok: true, msg: `<b>Result: ${R.s.join(' ')}.</b> ${R.defs ? `${R.defs} new word${R.defs > 1 ? 's' : ''} sit in the dictionary, like the built-ins.` : 'Each word ran in turn.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Very small', home: true, say: 'A farm near Nouakchott counts date crates. This whole language has one loop.', act: m => m.set({ i: 0, colon: true, guard: true }) },
    { t: 'Numbers', home: true, say: 'A number goes on the stack, and a word uses what\'s there.', act: m => m.set({ i: 0, colon: true, guard: true }) },
    { t: 'The dictionary', home: true, say: 'A word that isn\'t a number is looked up, and it runs.', act: m => m.set({ i: 4, colon: true, guard: true }) },
    { t: 'The colon', home: true, say: 'A colon defines a new word from words that exist.', act: m => m.set({ i: 1, colon: true, guard: true }) },
    { t: 'Grow it', home: true, say: 'New words build on new words. The language grows to fit the job.', act: m => m.set({ i: 2, colon: true, guard: true }) },
    { t: 'No grammar, no net', home: true, say: 'A word trusts the stack. Without a check, too few numbers mean garbage.', act: m => m.set({ i: 3, colon: true, guard: false }) },
  ],
  check: [
    { q: 'What does a number do?', options: ['Goes on the stack', 'Runs', 'Ends the line'], answer: 0, why: 'Words then use it.', hint: 'See Numbers.' },
    { q: 'What does the colon do?', options: ['Defines a new word', 'Ends a program', 'Prints'], answer: 0, why: 'It goes in the dictionary.', hint: 'See The colon.' },
    { q: 'How does Forth grow?', options: ['By adding words to itself', 'By new keywords', 'By a bigger compiler'], answer: 0, why: 'User words equal built-ins.', hint: 'See Grow it.' },
  ],
  terms: [['Word', 'A named piece of code.'], ['Dictionary', 'The table of words.'], ['Data stack', 'Where numbers wait.'], ['Colon definition', 'A new word from old ones.']],
  deeper: '<p><b>Real code.</b> This tiny Forth runs live.</p><p><b>Jonesforth</b> builds a real one in assembly, then writes most of itself in Forth.</p>',
  credit: 'Built from <a href="https://github.com/nornagon/jonesforth/blob/master/jonesforth.S" target="_blank" rel="noopener">Jonesforth</a> by Richard W.M. Jones (public domain), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own tiny Forth, written for this lesson.',
  code: {
    title: 'The outer loop',
    note: 'Our own short version.',
    text: `
for (const word of source.split(" ")) {
  if (word in dictionary) dictionary[word](stack);
  else stack.push(Number(word));
}
`,
  },
};
