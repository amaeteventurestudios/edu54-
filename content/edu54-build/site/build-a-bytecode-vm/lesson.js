// Build it yourself: a bytecode machine (after A Python Interpreter Written in Python, 500 Lines). A Sfax olive press script compiled to a list of instructions; a real virtual machine runs them with a value stack, a jump and a frame per call. The Python-like opcodes follow the chapter; the count and the code are ours.
const PROG = { sum: [['LOAD_CONST', 0], ['STORE', 'total'], ['LOAD_CONST', 1], ['STORE', 'i'], ['LOAD', 'i'], ['LOAD_CONST', 4], ['COMPARE_LE'], ['JUMP_IF_FALSE', 16], ['LOAD', 'total'], ['LOAD', 'i'], ['ADD'], ['STORE', 'total'], ['LOAD', 'i'], ['LOAD_CONST', 1], ['ADD'], ['JUMP_STORE_I', 4], ['LOAD', 'total'], ['RETURN']] };
function vm(o) {
  const code = PROG.sum.map(c => [...c]); if (o.off) code[7][1] = 17;
  let pc = 0, steps = 0, max = 0, ret = null, err = ''; const stack = [], vars = {};
  while (pc < code.length && steps < 400) {
    const [op, a] = code[pc++]; steps++;
    if (op === 'LOAD_CONST') stack.push(a);
    else if (op === 'LOAD') { if (!(a in vars)) { err = `no variable ${a}`; break; } stack.push(vars[a]); }
    else if (op === 'STORE') { vars[a] = stack.pop(); }
    else if (op === 'ADD') { const y = stack.pop(), x = stack.pop(); stack.push(x + y); }
    else if (op === 'COMPARE_LE') { const y = stack.pop(), x = stack.pop(); stack.push(x <= y); }
    else if (op === 'JUMP_IF_FALSE') { if (!stack.pop()) pc = a; }
    else if (op === 'JUMP_STORE_I') { if (o.stuck) { stack.pop(); } else vars.i = stack.pop(); pc = a; }
    else if (op === 'RETURN') { ret = stack.pop(); break; }
    max = Math.max(max, stack.length);
  }
  return { ret, steps, max, err, loop: steps >= 400, left: stack.length, count: code.length, tree: 18 };
}

export default {
  slug: 'build-a-bytecode-vm',
  title: 'Build your own bytecode machine',
  description: 'Python doesn\'t run your code. It compiles it, and a small loop runs the instructions.',
  overview: 'Python compiles every function to bytecode: a flat list of small instructions. Then a loop runs them. Each instruction does one thing to a stack of values. Load pushes a value. Add pops two and pushes one. Store pops one into a variable. A loop in your code is just a jump backwards, and an if is a jump that depends on the top of the stack. So the whole interpreter is one big loop with one case per instruction. The state is only three things: the stack, the variables and a counter saying which instruction is next. This real machine adds up batches at an olive press in Sfax.',
  keywords: ['bytecode', 'virtual machine', 'Python', 'interpreter', 'stack machine', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.85, 1.05], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { off: false, stuck: false, upto: 18 }, st = { ...D0 };
    const LOAD = '#5B8DB8', OPS = '#1F9E89', JMP = '#F2AE0C', GREY = '#E0DBCE', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.235;
    const T = PROG.sum.map((c, i) => { const m = new S.THREE.MeshLambertMaterial({ color: LOAD }), b = P.box(0.19, 0.14, 0.7, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m, c: c[0].includes('JUMP') ? JMP : c[0].startsWith('LOAD') ? LOAD : OPS }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.2, 0.03, -0.05);
    S.add(P.keep(-2.45, 2.45, 0.7, -0.72, 0.72));
    let R = null;
    function draw() { R = vm(st); T.forEach((t, i) => { const on = i < st.upto; t.m.color.set(on ? t.c : GREY); t.b.scale.y = t.c === JMP ? 3 : 1.6; }); lamp.userData.set({ color: R.ret === 10 ? '#3E9B5F' : '#D9483B', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'slider', label: 'Show instructions up to', min: 1, max: 18, step: 1, get: () => st.upto, set: v => set({ upto: v }) }, tg('off', 'Jump target off by one', 'Off by one'), tg('stuck', 'Drop the loop counter', 'Stuck')];
    const readouts = [
      { label: 'Returned', get: () => (R.loop ? { v: 'never', sub: 'stopped at 400 steps', bad: true } : { v: `${R.ret}`, good: R.ret === 10, bad: R.ret !== 10 }) },
      { label: 'Instructions run', get: () => ({ v: `${R.steps}`, sub: `from ${R.count} in the list` }) },
      { label: 'Deepest stack', get: () => ({ v: `${R.max}` }) },
    ];
    const labels = [
      { name: 'c', t: 'A flat list of instructions', d: 'Blue load, teal do, gold jump', icon: 'code', atV: V(X(0) - 0.1, 0.1, -0.05) },
      { name: 'l', t: 'Result lamp', d: 'Green: 1 + 2 + 3 + 4 = 10', icon: 'check', atV: V(2.37, 0.3, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A jump one off', hint: 'skips an instruction', on: () => set({ ...D0, off: true }), off: reset },
      { label: 'Lose the loop counter', hint: 'it never ends', on: () => set({ ...D0, stuck: true }), off: reset },
    ];
    function status() {
      if (R.loop) return { ok: false, msg: `<b>${R.steps} steps, and still going.</b> The counter never changes, so the backward jump repeats forever.` };
      if (R.ret !== 10) return { ok: false, msg: `<b>Returned ${R.ret === null || R.ret === undefined ? 'nothing' : R.ret}.</b> A jump is just a number. One off, and the load before the return is skipped.` };
      return { ok: true, msg: `<b>Returned 10, in ${R.steps} steps.</b> Eighteen instructions, run ${R.steps} times by jumping back.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Not your code', home: true, say: 'An olive press in Sfax has a small Python script. Python doesn\'t run that text.', act: m => m.set({ off: false, stuck: false, upto: 1 }) },
    { t: 'A flat list', home: true, say: 'It compiles to a flat list of small instructions.', act: m => m.set({ off: false, stuck: false, upto: 8 }) },
    { t: 'The stack', home: true, say: 'Each instruction changes a stack. Load pushes, add pops two and pushes one.', act: m => m.set({ off: false, stuck: false, upto: 12 }) },
    { t: 'Jumps', home: true, say: 'A loop is a jump backwards. An if is a jump that depends on the top of the stack.', act: m => m.set({ off: false, stuck: false, upto: 18 }) },
    { t: 'One big loop', home: true, say: 'The machine is a loop with one case per instruction.', act: m => m.set({ off: false, stuck: false, upto: 18 }) },
    { t: 'Numbers, not meaning', home: true, say: 'A jump is just a number, so an error here leaves no clue.', act: m => m.set({ off: true, stuck: false, upto: 18 }) },
  ],
  check: [
    { q: 'What does Python run?', options: ['Bytecode', 'Your text', 'Machine code directly'], answer: 0, why: 'It compiles first.', hint: 'See A flat list.' },
    { q: 'What is a loop in bytecode?', options: ['A jump backwards', 'A special instruction', 'A new stack'], answer: 0, why: 'Nothing more.', hint: 'See Jumps.' },
    { q: 'What three things hold the state?', options: ['Stack, variables, next-instruction counter', 'CPU, disk, screen', 'Text, tree, file'], answer: 0, why: 'That\'s all it needs.', hint: 'See the overview.' },
  ],
  terms: [['Bytecode', 'Small instructions for a machine in software.'], ['Stack machine', 'Instructions work on a stack.'], ['Program counter', 'The next instruction.'], ['Opcode', 'The name of an instruction.']],
  deeper: '<p><b>Real code.</b> The machine runs live. Its opcodes are simplified.</p><p><b>Try it.</b> In Python, <code>import dis; dis.dis(f)</code> prints a function\'s bytecode.</p>',
  credit: 'Built from <a href="http://aosabook.org/en/500L/a-python-interpreter-written-in-python.html" target="_blank" rel="noopener">A Python Interpreter Written in Python</a> by Allison Kaptur (text CC BY, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small machine, written for this lesson.',
  code: {
    title: 'The loop',
    note: 'Our own short version.',
    text: `
while (pc < code.length) {
  const [op, arg] = code[pc++];
  if (op === "LOAD_CONST") stack.push(arg);
  else if (op === "ADD") stack.push(stack.pop() + stack.pop());
  else if (op === "JUMP_IF_FALSE") { if (!stack.pop()) pc = arg; }
  else if (op === "RETURN") return stack.pop();
}
`,
  },
};
