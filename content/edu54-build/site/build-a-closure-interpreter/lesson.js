// Build it yourself: closures (after The Super Tiny Interpreter). A real small evaluator for a Kampala boda booking tool: environments as linked frames. A closure keeps the frame it was made in; a counter shows lexical against dynamic scope, and shared against fresh frames.
function evalx(n, env, o, stats) {
  stats.steps++;
  switch (n[0]) {
    case 'num': return n[1];
    case 'var': { let e = env; while (e) { if (n[1] in e.v) return e.v[n[1]]; e = e.up; } throw new Error(`no variable ${n[1]}`); }
    case 'add': return evalx(n[1], env, o, stats) + evalx(n[2], env, o, stats);
    case 'let': { const f = { v: {}, up: env }; stats.frames++; f.v[n[1]] = evalx(n[2], env, o, stats); return evalx(n[3], f, o, stats); }
    case 'fn': return { p: n[1], body: n[2], env: o.closure ? env : null };
    case 'set': { let e = env; while (e) { if (n[1] in e.v) { e.v[n[1]] = evalx(n[2], env, o, stats); return e.v[n[1]]; } e = e.up; } throw new Error(`no variable ${n[1]}`); }
    case 'seq': { let r; n.slice(1).forEach(x => { r = evalx(x, env, o, stats); }); return r; }
    case 'call': { const f = evalx(n[1], env, o, stats), a = evalx(n[2], env, o, stats), fr = { v: { [f.p]: a }, up: o.dyn ? env : f.env }; stats.frames++; const keep = stats.call; stats.call = fr; const r = evalx(f.body, fr, o, stats); stats.call = keep; return r; }
  }
}
const ADDER = ['let', 'rate', ['num', 5], ['let', 'addRate', ['fn', 'x', ['add', ['var', 'x'], ['var', 'rate']]], ['let', 'rate', ['num', 100], ['call', ['var', 'addRate'], ['num', 1]]]]];
const COUNT = ['let', 'mk', ['fn', 'u', ['let', 'n', ['num', 0], ['fn', 'u', ['set', 'n', ['add', ['var', 'n'], ['num', 1]]]]]], ['let', 'a', ['call', ['var', 'mk'], ['num', 0]], ['let', 'b', ['call', ['var', 'mk'], ['num', 0]], ['seq', ['call', ['var', 'a'], ['num', 0]], ['call', ['var', 'a'], ['num', 0]], ['add', ['call', ['var', 'a'], ['num', 0]], ['call', ['var', 'b'], ['num', 0]]]]]]];
function run(o) { const s = { steps: 0, frames: 0, call: null }; try { const v = evalx(o.prog ? COUNT : ADDER, null, o, s); return { v, ...s, err: '', want: o.prog ? 4 : 6 }; } catch (e) { return { v: null, ...s, err: e.message, want: o.prog ? 4 : 6 }; } }

export default {
  slug: 'build-a-closure-interpreter',
  title: 'Build your own closures',
  description: 'A function keeps the frame it was made in. That one rule gives you private state.',
  overview: 'An interpreter walks a tree, and needs to know what each name means. It keeps frames: small tables linked to the frame around them. To find a name, look in this frame, then the next one out. The key question is which frame a function looks in. With lexical scope, a function remembers the frame where it was made, and that pair of code and frame is a closure. With dynamic scope, it looks where it was called, so a stray variable at the call site can change what it does. Closures also give you private state, since each call to a maker gets a fresh frame. This real evaluator runs for a boda booking tool in Kampala.',
  keywords: ['closures', 'lexical scope', 'interpreter', 'environment', 'programming language', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { prog: 0, closure: true, dyn: false }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const F = Array.from({ length: 12 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.27, 0.22, 0.6, '#fff', { r: 0.03, material: m }); b.position.set(-2.1 + i * 0.32, 0.03, -0.05); S.add(b); return b; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.5, r: 0.12 })); lamp.position.set(2.1, 0.03, -0.05);
    S.add(P.keep(-2.3, 2.3, 0.9, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); F.forEach((b, i) => { b.visible = i < R.frames; }); lamp.userData.set({ color: R.v === R.want ? '#3E9B5F' : '#D9483B', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Program', options: ['Add a rate', 'Two counters'], get: () => st.prog, act: i => set({ prog: i }) }, tg('closure', 'Keep the frame in the function', 'Closure'), tg('dyn', 'Look up names at the call site', 'Dynamic')];
    const readouts = [
      { label: 'Result', get: () => (R.err ? { v: 'stopped', sub: R.err, bad: true } : { v: `${R.v}`, sub: `should be ${R.want}`, good: R.v === R.want, bad: R.v !== R.want }) },
      { label: 'Frames made', get: () => ({ v: `${R.frames}` }) },
      { label: 'Nodes visited', get: () => ({ v: `${R.steps}` }) },
    ];
    const labels = [
      { name: 'f', t: 'One tile per frame', d: 'Each call makes one', icon: 'box', atV: V(-2.26, 0.15, -0.05) },
      { name: 'l', t: 'Right answer?', d: 'Red: wrong or stopped', icon: 'check', atV: V(2.28, 0.35, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget the frame', hint: 'no closure', on: () => set({ ...D0, closure: false }), off: reset },
      { label: 'Dynamic scope', hint: 'the caller\'s variable wins', on: () => set({ ...D0, dyn: true }), off: reset },
    ];
    function status() {
      if (R.err) return { ok: false, msg: `<b>${R.err[0].toUpperCase()}${R.err.slice(1)}.</b> The function no longer knows the frame it was made in.` };
      if (R.v !== R.want) return { ok: false, msg: `<b>It says ${R.v}, and it should be ${R.want}.</b> A different "rate" at the call site quietly took over.` };
      if (st.prog) return { ok: true, msg: '<b>Counter a reached three, and b reached one.</b> Each maker call got its own frame, so nothing else can touch them.' };
      return { ok: true, msg: `<b>${R.v}: the function used the rate from where it was made.</b> The later "rate" at the call site doesn\'t matter.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'What does a name mean?', home: true, say: 'A boda booking tool in Kampala uses a variable. An interpreter has to find what it means.', act: m => m.set({ prog: 0, closure: true, dyn: false }) },
    { t: 'Frames', home: true, say: 'Each call makes a frame, linked to the frame outside it.', act: m => m.set({ prog: 0, closure: true, dyn: false }) },
    { t: 'Remember', home: true, say: 'A function keeps the frame where it was made. That pair is a closure.', act: m => m.set({ prog: 0, closure: true, dyn: false }) },
    { t: 'Forget it', home: true, say: 'Drop that frame, and the name can\'t be found.', act: m => m.set({ prog: 0, closure: false, dyn: false }) },
    { t: 'The call site', home: true, say: 'Look up names at the call site instead, and a stray variable changes the result.', act: m => m.set({ prog: 0, closure: true, dyn: true }) },
    { t: 'Private state', home: true, say: 'Two counters from one maker each have their own frame.', act: m => m.set({ prog: 1, closure: true, dyn: false }) },
  ],
  check: [
    { q: 'What is a closure?', options: ['Code plus the frame it was made in', 'A finished program', 'A kind of loop'], answer: 0, why: 'The pair keeps its names.', hint: 'See Remember.' },
    { q: 'What goes wrong with dynamic scope?', options: ['A stray variable changes the result', 'It is slower', 'It uses no frames'], answer: 0, why: 'Names resolve at the call site.', hint: 'Try Dynamic scope.' },
    { q: 'How do closures give private state?', options: ['Each maker call gets a fresh frame', 'By locking memory', 'By copying the program'], answer: 0, why: 'Only that function can reach it.', hint: 'See Private state.' },
  ],
  terms: [['Frame', 'A table of names.'], ['Lexical scope', 'Names resolve where code was written.'], ['Dynamic scope', 'Names resolve where it was called.'], ['Closure', 'Code plus its frame.']],
  deeper: '<p><b>Real code.</b> This evaluator walks small trees live.</p><p><b>Memory.</b> Frames kept by closures can\'t be freed on return, so they live on the heap.</p>',
  credit: 'Built from <a href="https://github.com/keyanzhang/the-super-tiny-interpreter" target="_blank" rel="noopener">The Super Tiny Interpreter</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small evaluator, written for this lesson.',
  code: {
    title: 'Making and calling',
    note: 'Our own short version.',
    text: `
case "fn":   return { param: n.param, body: n.body, env };
case "call": {
  const f = evaluate(n.fn, env);
  const frame = { vars: { [f.param]: evaluate(n.arg, env) }, up: f.env };
  return evaluate(f.body, frame);
}
`,
  },
};
