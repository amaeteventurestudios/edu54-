// Build your own interpreter: a tree-walking interpreter runs a short program that makes two counters with a closure, calls a() twice and b()
// once, and keeps a separate global called count. Each call creates an environment whose parent is the environment where the function was
// defined (lexical scope); assignment walks up the chain to the variable's own environment. Switching to dynamic scope, sharing one
// environment between calls, or making assignment always create a local each gives a classic wrong answer. The interpreter below really
// evaluates the program.
const PROGRAM = [
  ['let', 'count', ['num', 0]],
  ['fun', 'makeCounter', [], [
    ['let', 'count', ['num', 0]],
    ['fun', 'inc', [], [['set', 'count', ['add', ['var', 'count'], ['num', 1]]], ['ret', ['var', 'count']]]],
    ['ret', ['var', 'inc']],
  ]],
  ['let', 'a', ['call', 'makeCounter']],
  ['let', 'b', ['call', 'makeCounter']],
  ['out', ['call', 'a']], ['out', ['call', 'a']], ['out', ['call', 'b']],
];
const SOURCE = 'let count = 0\nfun makeCounter() {\n  let count = 0\n  fun inc() {\n    count = count + 1\n    return count\n  }\n  return inc\n}\nlet a = makeCounter()\nlet b = makeCounter()\nprint a(); print a()\nprint b()';
function interpret(o) {
  const envs = [];
  const mk = (parent, name) => { const e = { vars: {}, parent, name, id: envs.length }; envs.push(e); return e; };
  const global = mk(null, 'global');
  const find = (env, k) => { for (let e = env; e; e = e.parent) if (k in e.vars) return e; return null; };
  const sharedEnvs = {};
  const out = [];
  const RET = {};
  const call = (fn, callerEnv) => {
    const parent = o.lexical ? fn.env : callerEnv;
    let env;
    if (o.fresh) env = mk(parent, fn.name);
    else { env = sharedEnvs[fn.name] || (sharedEnvs[fn.name] = mk(parent, fn.name)); env.parent = parent; }
    try { fn.body.forEach(s => exec(s, env)); } catch (r) { if (r === RET) return RET.v; throw r; }
    return null;
  };
  const ev = (x, env) => {
    switch (x[0]) {
      case 'num': return x[1];
      case 'var': { const e = find(env, x[1]); return e ? e.vars[x[1]] : undefined; }
      case 'add': return ev(x[1], env) + ev(x[2], env);
      case 'call': { const e = find(env, x[1]); return call(e.vars[x[1]], env); }
    }
  };
  const exec = (s, env) => {
    switch (s[0]) {
      case 'let': env.vars[s[1]] = ev(s[2], env); break;
      case 'fun': env.vars[s[1]] = { fn: true, name: s[1], body: s[3], env }; break;
      case 'set': { const v = ev(s[2], env); const e = o.walk ? (find(env, s[1]) || env) : env; e.vars[s[1]] = v; break; }
      case 'ret': RET.v = ev(s[1], env); throw RET;
      case 'out': out.push(ev(s[1], env)); break;
    }
  };
  PROGRAM.forEach(s => exec(s, global));
  return { out, global: global.vars.count, envs };
}

export default {
  slug: 'build-an-interpreter',
  title: 'Build your own interpreter',
  description: 'A tiny language runs by walking its tree. Two counters come from one closure, and each must keep its own environment.',
  overview: 'An interpreter runs a program directly instead of translating it first. The simplest kind, a tree-walking interpreter like those in Crafting Interpreters and the Super Tiny Interpreter, takes the syntax tree from a parser and evaluates it node by node: a number evaluates to itself, an addition evaluates both sides and adds, a call evaluates the function and runs its body. The heart of it is the environment, a table of names to values with a pointer to a parent environment. Looking up a name searches the current environment, then its parent, and so on outwards. The crucial choice is which parent a function call gets. With lexical scope, used by almost every modern language, a new environment is created for each call and its parent is the environment where the function was defined, which the function value carries with it. That pairing of code and defining environment is a closure, and it is what lets makeCounter return an inc function that still sees its own count after makeCounter has finished. With dynamic scope, the parent is whichever environment made the call, so the function sees the caller\'s variables, which makes programs hard to reason about. Each call must get a fresh environment, or two counters would share one count. Assignment must walk up the chain to the environment that owns the variable; a language that makes every assignment create a local, as Python does without its nonlocal keyword, cannot update a captured variable. Faster interpreters, such as CPython and the second half of Crafting Interpreters, compile the tree to bytecode for a stack machine, and Forth builds a whole language from a stack and a dictionary of words. This machine evaluates the program live.',
  keywords: ['build your own interpreter', 'tree-walking interpreter', 'closures', 'lexical scope', 'environments', 'crafting interpreters', 'dynamic scope'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.2, -0.05], dir: [0.05, 0.95, 1.1], half: 0.95, wide: 5.0 },
  credit: 'Built from <a href="http://www.craftinginterpreters.com/" target="_blank" rel="noopener">Crafting Interpreters</a> by Robert Nystrom (code MIT), <a href="https://github.com/keyanzhang/the-super-tiny-interpreter" target="_blank" rel="noopener">The Super Tiny Interpreter</a> (MIT), <a href="https://aosabook.org/en/500L/a-python-interpreter-written-in-python.html" target="_blank" rel="noopener">A Python Interpreter Written in Python</a> (500 Lines or Less, code MIT) and <a href="https://github.com/nornagon/jonesforth/blob/master/jonesforth.S" target="_blank" rel="noopener">Jonesforth</a> (public domain), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short tree-walking interpreter, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { lexical: true, fresh: true, walk: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const KIND = { global: '#8FA3C8', makeCounter: '#6FB9A8', inc: '#E9C46A' };
    // the global environment is always there, at the back
    const gPlat = P.box(1.5, 0.08, 0.5, KIND.global, { r: 0.04 }); gPlat.position.set(-0.4, 0, -0.75); S.add(gPlat);
    // what the program printed: three columns of cubes, one cube per unit; it should read 1, 2, 1
    const outBase = P.box(1.1, 0.04, 0.5, '#3A3D4A', { r: 0.03 }); outBase.position.set(2.05, 0, -0.1); S.add(outBase);
    const outs = [0, 1, 2].map(i => { const s = P.stack(0.24, 0.24, 0.2, { max: 4 }); s.position.set(1.72 + i * 0.33, 0.04, -0.1); S.add(s); return s; });
    S.add(P.keep(-2.0, 2.6, 0.9, -1.05, 0.85));
    let parts = [], R = null;
    function draw() {
      R = interpret(st);
      parts.forEach(p => p.parent && p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; S.add(o); parts.push(o); return o; };
      const show = R.envs.filter(e => e.name !== 'inc').concat(R.envs.filter(e => e.name === 'inc').slice(0, 3));
      const pos = new Map();
      const g = show.find(e => e.name === 'global'), mcs = show.filter(e => e.name === 'makeCounter'), incs = show.filter(e => e.name === 'inc');
      pos.set(g, V(-0.4, 0.08, -0.75));
      mcs.forEach((e, i) => pos.set(e, V(-1.0 + i * 1.15, 0.06, -0.05)));
      incs.forEach((e, i) => pos.set(e, V(-1.3 + i * 0.75, 0.06, 0.6)));
      show.forEach(e => {
        const p = pos.get(e), isG = e.name === 'global';
        if (!isG) { const w = e.name === 'inc' ? 0.62 : 0.9; const b = add(P.box(w, 0.06, 0.42, KIND[e.name], { r: 0.04 })); b.position.set(p.x, 0, p.z); }
        // the variable count, as a stack of cubes; any count in global or inc is a bug
        const c = e.vars.count;
        if (typeof c === 'number') {
          const n = Math.min(4, Math.max(0, c)), bad = (isG && c !== 0) || e.name === 'inc';
          const s = add(P.stack(0.16, 0.16, 0.14, { max: 4 })); s.position.set(p.x + (isG ? 0.45 : 0.15), p.y, p.z); s.userData.set({ n, colors: Array(4).fill(bad ? BAD : '#3D6BD6') });
          const pad = add(P.box(0.22, 0.015, 0.22, bad ? BAD : '#3D6BD6', { r: 0.03 })); pad.position.set(p.x + (isG ? 0.45 : 0.15), p.y, p.z);
        }
        // functions held in the environment: a small ball each
        Object.values(e.vars).filter(v => v && v.fn).forEach((v, k) => { const b = add(P.ball(0.06, '#4A4D5C')); b.position.set(p.x - (isG ? 0.55 : 0.25) + k * 0.16, p.y + 0.06, p.z); });
        // the link to the parent environment
        if (e.parent && pos.has(e.parent)) {
          const q = pos.get(e.parent), wrong = e.name === 'inc' && e.parent.name === 'global';
          add(P.rod(V(p.x - 0.1, p.y + 0.02, p.z - 0.18), V(q.x + (p.x - q.x) * 0.25, q.y + 0.02, q.z + 0.2), 0.02, wrong ? BAD : SAF));
        }
      });
      const want = [1, 2, 1];
      outs.forEach((s, i) => { const v = R.out[i]; const ok = v === want[i]; s.userData.set({ n: Number.isFinite(v) ? Math.min(4, v) : 0, colors: Array(4).fill(ok ? GOOD : BAD) }); });
    }
    function isOk() { return R.out.join() === '1,2,1' && R.global === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Lexical scope: parent is where the function was defined', short: 'Lexical', get: () => st.lexical, set: v => set({ lexical: !!v }) },
      { type: 'toggle', label: 'A fresh environment for every call', short: 'Fresh', get: () => st.fresh, set: v => set({ fresh: !!v }) },
      { type: 'toggle', label: 'Assignment walks up to the variable\'s owner', short: 'Walk up', get: () => st.walk, set: v => set({ walk: !!v }) },
    ];
    const readouts = [
      { label: 'Printed', get: () => ({ v: R.out.join(', '), sub: 'should be 1, 2, 1', good: R.out.join() === '1,2,1', bad: R.out.join() !== '1,2,1' }) },
      { label: 'Global count', get: () => ({ v: `${R.global}`, sub: 'should stay 0', good: R.global === 0, bad: R.global !== 0 }) },
      { label: 'Environments', get: () => ({ v: `${R.envs.length}`, sub: 'one per call', good: st.fresh, bad: !st.fresh }) },
    ];
    const labels = [
      { name: 'g', t: 'Environments, one per call', d: 'Blue cubes: count. Gold rods: to the parent', icon: 'layers', atV: V(-1.15, 0.06, -0.75) },
      { name: 'o', t: 'What it printed', d: 'Should read 1, 2, 1. Coral: wrong', icon: 'target', atV: V(2.6, 0.03, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Use dynamic scope', hint: 'parent is the caller', on: () => set({ ...D0, lexical: false }), off: reset },
      { label: 'Reuse one environment per function', hint: 'counters share', on: () => set({ ...D0, fresh: false }), off: reset },
      { label: 'Make every assignment local', hint: 'no walking up', on: () => set({ ...D0, walk: false }), off: reset },
    ];
    function status() {
      const r = R, o = r.out.join(', ');
      if (!st.lexical) return { ok: false, msg: `<b>With dynamic scope, inc's environment points to whoever called it, the global environment, so count = count + 1 changes the global count: it printed ${o}, and the global count is now ${r.global}.</b> Give each call the environment where its function was defined.` };
      if (!st.fresh) return { ok: false, msg: `<b>Reusing one environment for every call of makeCounter means a and b close over the same count: it printed ${o} instead of 1, 2, 1.</b> Create a fresh environment for each call.` };
      if (!st.walk) return { ok: false, msg: `<b>Each assignment created a new local count inside inc instead of updating makeCounter's, so every call starts again from the captured 0: it printed ${o}.</b> Assignment must walk up the chain to the environment that owns the name.` };
      return { ok: true, msg: `<b>Each call got a fresh environment whose parent is where its function was defined, so a and b each keep their own count: it printed ${o}, and the global count stayed ${r.global}.</b> That pairing of code and defining environment is a closure.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Walk the tree', home: true, say: 'The interpreter evaluates the program node by node: numbers, additions, calls.', act: m => m.set({ lexical: true, fresh: true, walk: true }) },
    { t: 'Environments', home: true, say: 'Every call gets an environment of names and values, pointing to a parent.', act: m => m.set({ lexical: true, fresh: true, walk: true }) },
    { t: 'Closures', home: true, say: 'inc\'s parent is where it was defined, inside makeCounter. So it keeps its own count.', act: m => m.set({ lexical: true, fresh: true, walk: true }) },
    { t: 'Dynamic scope', home: true, say: 'Point to the caller instead, and inc changes the global count.', act: m => m.set({ lexical: false, fresh: true, walk: true }) },
    { t: 'Sharing by accident', home: true, say: 'Reuse one environment for every call, and the two counters share one count.', act: m => m.set({ lexical: true, fresh: false, walk: true }) },
    { t: 'Assignment walks up', home: true, say: 'Assignment must find the variable\'s own environment, or the counter never advances.', act: m => m.set({ lexical: true, fresh: true, walk: false }) },
  ],
  check: [
    { q: 'With lexical scope, what is a call environment\'s parent?', options: ['The environment where the function was defined', 'The caller\'s environment', 'Always the global one'], answer: 0, why: 'That is a closure.', hint: 'Try Use dynamic scope.' },
    { q: 'Why does each call need a fresh environment?', options: ['So a and b keep separate counts', 'To save memory', 'For speed'], answer: 0, why: 'Shared environments share variables.', hint: 'Try Reuse one environment.' },
    { q: 'Where must assignment write?', options: ['To the environment that owns the name', 'Always a new local', 'The global environment'], answer: 0, why: 'Walk up the chain.', hint: 'Try Make every assignment local.' },
  ],
  terms: [
    ['Interpreter', 'A program that runs another program directly.'],
    ['Environment', 'A table of names and values with a parent pointer.'],
    ['Lexical scope', 'Names resolved where the code is written.'],
    ['Dynamic scope', 'Names resolved through whoever called the code.'],
    ['Closure', 'A function together with the environment it was defined in.'],
    ['Bytecode', 'Compact instructions for a virtual machine, faster than walking a tree.'],
  ],
  deeper: '<p><b>Resolving early.</b> Crafting Interpreters adds a resolver pass that works out, before running, how many environments up each name lives, so lookups need no search.</p><p><b>Forth.</b> Jonesforth builds a language from a data stack and a dictionary of words, each defined by a list of other words.</p><p><b>About this machine.</b> The program is run by the interpreter in this lesson; the diagram shows its environments.</p>',
  code: {
    title: 'Environments and closures',
    note: 'Our own short version, written for this lesson.',
    text: `
class Env:
    def __init__(self, parent=None):
        self.vars, self.parent = {}, parent
    def find(self, name):
        e = self
        while e and name not in e.vars:
            e = e.parent
        return e
    def get(self, name):
        return self.find(name).vars[name]
    def assign(self, name, value):
        (self.find(name) or self).vars[name] = value    # walk up to the owner

class Function:
    def __init__(self, params, body, env):
        self.params, self.body, self.env = params, body, env   # remember where defined

    def call(self, args):
        env = Env(parent=self.env)                     # fresh, lexical parent
        env.vars.update(zip(self.params, args))
        return run_block(self.body, env)
`,
  },
};
