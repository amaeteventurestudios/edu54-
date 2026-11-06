// Build it yourself: a register machine (after Write your Own Virtual Machine, code MIT; our own words). A tiny LC-3-style machine for an Accra tide gauge: 16-bit words, eight registers, condition flags, real fetch, decode and execute. A real program sums 5 down to 1 with a counter and a branch.
const sx = (v, b) => (v & (1 << (b - 1)) ? v - (1 << b) : v);
const ADDi = (d, s, i) => (1 << 12) | (d << 9) | (s << 6) | 32 | (i & 31), AND0 = d => (5 << 12) | (d << 9) | (d << 6) | 32, ADDr = (d, a, b) => (1 << 12) | (d << 9) | (a << 6) | b, BRp = off => (0 << 12) | (1 << 9) | (off & 511), TRAP = 0xf025;
const CODE = [AND0(0), AND0(1), ADDi(1, 1, 5), ADDr(0, 0, 1), ADDi(1, 1, -1), BRp(-3), TRAP];
function run(o) {
  const mem = new Uint16Array(64); const prog = [...CODE]; if (o.n !== 5) prog[2] = ADDi(1, 1, o.n); prog.forEach((w, i) => { mem[i] = w; });
  const r = new Int32Array(8); let pc = 0, f = 2, steps = 0, halt = false, trace = [];
  const flags = d => { const v = (r[d] << 16) >> 16; f = v < 0 ? 4 : v === 0 ? 2 : 1; };
  while (!halt && steps < 120) {
    const w = mem[pc]; pc++; steps++; const op = w >> 12; trace.push(op);
    if (op === 1) { const d = (w >> 9) & 7, a = (w >> 6) & 7, v = w & 32 ? (o.sign ? sx(w & 31, 5) : w & 31) : r[w & 7]; r[d] = (r[a] + v) & 0xffff; if (o.flag) flags(d); }
    else if (op === 5) { const d = (w >> 9) & 7; r[d] = r[(w >> 6) & 7] & sx(w & 31, 5); if (o.flag) flags(d); }
    else if (op === 0) { const nzp = (w >> 9) & 7; if (nzp & f) pc += sx(w & 511, 9); }
    else if (op === 15) halt = true;
    else { halt = true; }
  }
  return { sum: r[0], ctr: r[1], steps, halt, trace, mem: prog.length, want: (o.n * (o.n + 1)) / 2, words: prog.map(w => w.toString(16).padStart(4, '0')) };
}

export default {
  slug: 'build-a-register-vm',
  title: 'Build your own register machine',
  description: 'Fetch a word, split it into fields, do one small thing. A computer in a loop.',
  overview: 'A real processor doesn\'t use a stack of values. It has a few registers, and each instruction is one word of bits. The top bits name the operation. The rest name registers, or hold a small number. So an emulator is a loop: fetch the word at the counter, step the counter, split out the fields, and act. A small number must be sign-extended, or minus one looks like thirty-one. Each result sets a condition flag, and branches read those flags. That\'s how a loop works here. This real LC-3-style machine adds up readings on a tide gauge in Accra.',
  keywords: ['virtual machine', 'LC-3', 'registers', 'emulator', 'sign extension', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.8, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 5, sign: true, flag: true }, st = { ...D0 };
    const C = { 1: '#1F9E89', 5: '#5B8DB8', 0: '#F2AE0C', 15: '#7B6FA8' }, GREY = '#E0DBCE', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.28 + i * 0.13;
    const T = Array.from({ length: 34 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.11, 0.1, 0.8, '#fff', { r: 0.01, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    S.add(P.keep(-2.4, 2.4, 0.6, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const c = R.trace[i]; m.color.set(c === undefined ? GREY : C[c]); b.scale.y = c === undefined ? 0.5 : c === 0 ? 3.4 : 2; }); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'slider', label: 'Count down from', min: 1, max: 9, step: 1, get: () => st.n, set: v => set({ n: v }) }, tg('sign', 'Sign-extend small numbers', 'Sign'), tg('flag', 'Set condition flags', 'Flags')];
    const readouts = [
      { label: 'Register 0 (the sum)', get: () => ({ v: `${R.sum}`, sub: `should be ${R.want}`, good: R.sum === R.want, bad: R.sum !== R.want }) },
      { label: 'Instructions run', get: () => ({ v: `${R.steps}`, sub: R.halt ? 'halted' : 'never halted', bad: !R.halt }) },
      { label: 'Program words', get: () => ({ v: R.words.slice(2, 6).join(' ') }) },
    ];
    const labels = [
      { name: 't', t: 'Instructions run, left to right', d: 'Teal add, gold branch', icon: 'wave', atV: V(-2.36, 0.08, -0.05) },
      { name: 'b', t: 'Purple: halt', d: 'Pale: unused', icon: 'stop', atV: V(X(33) + 0.06, 0.05, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No sign extension', hint: 'minus one becomes 31', on: () => set({ ...D0, sign: false }), off: reset },
      { label: 'No condition flags', hint: 'the branch sees old news', on: () => set({ ...D0, flag: false }), off: reset },
    ];
    function status() {
      if (!st.sign) return { ok: false, msg: `<b>The sum is ${R.sum}, not ${R.want}.</b> Five bits of minus one read as 31, so the counter grows, and wraps round.` };
      if (!st.flag) return { ok: false, msg: `<b>The sum is ${R.sum}, not ${R.want}.</b> The branch checks flags that never changed, so the loop ends after one pass.` };
      return { ok: true, msg: `<b>Sum ${R.sum}, in ${R.steps} instructions.</b> Fetch, split the fields, act, and repeat.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Words of bits', home: true, say: 'A tide gauge in Accra has a small computer. Each instruction is one word of sixteen bits.', act: m => m.set({ n: 1, sign: true, flag: true }) },
    { t: 'Fetch', home: true, say: 'Read the word at the counter, then step the counter.', act: m => m.set({ n: 2, sign: true, flag: true }) },
    { t: 'Decode', home: true, say: 'The top four bits name the operation. The rest name registers, or hold a small number.', act: m => m.set({ n: 3, sign: true, flag: true }) },
    { t: 'Sign it', home: true, say: 'A small number must be sign-extended, or minus one looks like thirty-one.', act: m => m.set({ n: 5, sign: false, flag: true }) },
    { t: 'Flags', home: true, say: 'Each result sets a flag, and a branch reads it.', act: m => m.set({ n: 5, sign: true, flag: false }) },
    { t: 'A loop', home: true, say: 'A counter, a flag and a branch make a loop. That\'s nearly everything.', act: m => m.set({ n: 9, sign: true, flag: true }) },
  ],
  check: [
    { q: 'What do the top bits name?', options: ['The operation', 'The memory size', 'The time'], answer: 0, why: 'The rest are fields.', hint: 'See Decode.' },
    { q: 'Why sign-extend?', options: ['So small negatives stay negative', 'To add speed', 'To save memory'], answer: 0, why: 'Otherwise minus one is 31.', hint: 'Try No sign extension.' },
    { q: 'What do branches read?', options: ['Condition flags', 'The screen', 'The stack'], answer: 0, why: 'The last result sets them.', hint: 'See Flags.' },
  ],
  terms: [['Register', 'A tiny fast slot in the processor.'], ['Opcode', 'The operation\'s number.'], ['Sign extension', 'Filling upper bits to keep the sign.'], ['Condition flag', 'Negative, zero or positive.']],
  deeper: '<p><b>Real machine.</b> These words really are LC-3 encodings, for the few instructions used.</p><p><b>Full VM.</b> A full LC-3 has sixteen opcodes, and memory-mapped input.</p>',
  credit: 'Built from the code of <a href="https://justinmeiners.github.io/lc3-vm/" target="_blank" rel="noopener">Write your Own Virtual Machine</a> by Justin Meiners and Ryan Pendleton (code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small machine, written for this lesson.',
  code: {
    title: 'Add, decoded',
    note: 'Our own short version.',
    text: `
const word = mem[pc++];
const op = word >> 12;
if (op === OP_ADD) {
  const dest = (word >> 9) & 7, a = (word >> 6) & 7;
  const b = word & 32 ? signExtend(word & 31, 5) : reg[word & 7];
  reg[dest] = (reg[a] + b) & 0xffff;
  setFlags(dest);
}
`,
  },
};
