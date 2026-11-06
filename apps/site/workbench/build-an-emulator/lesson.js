// Build your own emulator: a tiny 8-bit CPU in the style of the Game Boy's runs a nine-byte program that adds 30 + 29 + ... + 1 into
// register A with a countdown loop. Each step fetches the byte at the program counter, advances the counter, decodes the opcode and executes
// it, updating registers and flags. Real hardware wraps 8-bit values modulo 256 and sets the carry flag, sets the zero flag after a decrement,
// and reads a relative jump offset as a signed byte. Each of those can be switched off to see the bug. Everything is executed live.
const PROG = [0x3E, 0x00, 0x06, 0x1E, 0x80, 0x05, 0x20, 0xFC, 0x76];
const NAMES = { 0x3E: 'LD A,n', 0x06: 'LD B,n', 0x80: 'ADD A,B', 0x05: 'DEC B', 0x20: 'JR NZ,e', 0x76: 'HALT' };
function run(o) {
  let A = 0, B = 0, PC = 0, Z = false, C = false, halted = false, crashed = false, steps = 0, carries = 0;
  const trace = [];
  while (steps < o.steps && !halted && !crashed) {
    const at = PC, op = PROG[PC];
    if (op === undefined) { crashed = true; break; }
    if (o.advance) PC++;
    const imm = () => { const v = PROG[o.advance ? PC : PC + 1]; if (o.advance) PC++; return v; };
    switch (op) {
      case 0x3E: A = imm(); break;
      case 0x06: B = imm(); break;
      case 0x80: { const s = A + B; C = s > 0xFF; if (C) carries++; A = o.mask ? s & 0xFF : s; Z = (A & 0xFF) === 0; break; }
      case 0x05: B = o.mask ? (B - 1) & 0xFF : B - 1; if (o.zflag) Z = B === 0; break;
      case 0x20: { const raw = imm(); const e = o.signed ? (raw > 127 ? raw - 256 : raw) : raw; if (!Z) PC = PC + e; break; }
      case 0x76: halted = true; break;
      default: crashed = true;
    }
    steps++;
    trace.push({ at, op });
  }
  return { carries, A, B, PC, Z, C, halted, crashed, steps, trace, loopForever: !halted && !crashed && steps >= o.steps };
}

export default {
  slug: 'build-an-emulator',
  title: 'Build your own emulator',
  description: 'An emulated 8-bit CPU runs a nine-byte program that adds 30 down to 1. Step through fetch, decode and execute, and watch the flags.',
  overview: 'An emulator is a program that pretends to be another machine, closely enough that software written for that machine runs unchanged. At its heart is the same loop a real processor runs: fetch the byte at the program counter, advance the counter, decode the byte into an instruction, and execute it, changing registers, memory and flags. The Game Boy\'s processor, a relative of the Z80, has 8-bit registers named A, B, C and so on, a 16-bit program counter, and flags that record what the last operation did: zero, carry and others. Getting every detail right matters, because programs depend on the hardware\'s exact behaviour. Arithmetic on 8-bit registers wraps around modulo 256 and sets the carry flag, which games use for counters and multi-byte maths; an emulator that lets A hold 465 is not emulating anything. Decrementing a register sets the zero flag when it reaches zero, which is how loops end; forget it and the loop never stops. A relative jump stores its distance as a signed byte, so 0xFC means four bytes back, not 252 forward. And forgetting to advance the program counter after a fetch makes the machine run the same byte for ever. Emulator authors test against small test programs that print pass or fail, then against real games, and they add memory mapping, timers, interrupts and the graphics chip. The same fetch-decode-execute loop drives virtual machines such as the LC-3 used in teaching. This machine runs a tiny program live; every number on the board comes from executing it.',
  keywords: ['build your own emulator', 'Game Boy emulator', 'fetch decode execute', 'CPU flags', 'virtual machine', 'LC-3', 'opcodes'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.4, 0.3, -0.05], dir: [0.1, 0.62, 1.2], half: 0.85, wide: 6.0 },
  credit: 'Built from <a href="https://jeremybanks.github.io/0dmg/" target="_blank" rel="noopener">0dmg: Learning Rust by building a partial Game Boy emulator</a> (MIT) and <a href="https://justinmeiners.github.io/lc3-vm/" target="_blank" rel="noopener">Write your Own Virtual Machine</a> (code MIT), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own tiny CPU, written for this lesson; the opcodes follow the Game Boy\'s.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { steps: 200, mask: true, zflag: true, signed: true, advance: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const MX = i => -2.2 + i * 0.42, MZ = -0.45;
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // memory: one plate per byte; opcodes stand tall, operands lie low
    const isOp = [1, 0, 1, 0, 1, 1, 1, 0, 1];
    const mem = PROG.map((b, i) => { const m = own('#fff'), h = isOp[i] ? 0.2 : 0.08; const bx = P.box(0.34, h, 0.42, '#fff', { r: 0.04, material: m }); bx.position.set(MX(i), 0, MZ); S.add(bx); return { m, h }; });
    // the jump back: an arc from JR over to ADD; read unsigned, it flies off the end
    const back = P.pipe([V(MX(6), 0.22, MZ), V(MX(5.5), 0.55, MZ - 0.05), V(MX(4.5), 0.55, MZ - 0.05), V(MX(4), 0.22, MZ)], GOOD, { r: 0.03, n: 4 }); S.add(back);
    const away = P.pipe([V(MX(6), 0.22, MZ), V(MX(7), 0.6, MZ - 0.05), V(MX(8.3), 0.6, MZ - 0.05), V(MX(9.2), 0.05, MZ)], BAD, { r: 0.03, n: 4, pipe: '#E9B8A8' }); S.add(away);
    // the CPU: a robot that walks to the byte at the program counter
    const cpu = P.robot('#3F4049', { scale: 0.75 }); cpu.position.set(MX(0), 0, 0.15); S.add(cpu);
    // registers as tanks of capacity 255: without wraparound A spills over the rim
    const tA = P.tank(0.5, 0.9, 0.5, '#3D6BD6'); tA.position.set(2.45, 0.05, -0.2); S.add(tA);
    const tB = P.tank(0.36, 0.9, 0.36, '#7A4FB5'); tB.position.set(3.05, 0.05, -0.2); S.add(tB);
    // flags: Z and C lamps, gold when set
    const lz = P.lamp(OFF, { h: 0.3, r: 0.09 }); lz.position.set(2.45, 0, 0.45); S.add(lz);
    const lc = P.lamp(OFF, { h: 0.3, r: 0.09 }); lc.position.set(2.9, 0, 0.45); S.add(lc);
    S.add(P.keep(-2.5, 3.3, 1.0, -0.75, 0.65));

    let R = null, tx = MX(0);
    function draw() {
      R = run(st);
      const cur = Math.min(R.PC, PROG.length - 1), off = R.PC >= PROG.length || R.PC < 0;
      mem.forEach((c, i) => c.m.color.set(i === cur && !off ? SAF : isOp[i] ? '#5B8DB8' : '#D8D2C4'));
      tx = R.crashed ? MX(9.3) : MX(cur);
      const running = !R.halted && !R.crashed;
      cpu.userData.set({ busy: running && R.steps > 0, lamp: R.halted ? GOOD : (R.crashed || R.loopForever) ? BAD : SAF, color: R.crashed ? '#8A3B2E' : '#3F4049' });
      tA.userData.set({ level: R.A / 255, color: R.A > 255 ? BAD : '#3D6BD6' });
      tB.userData.set({ level: Math.max(0, R.B) / 255, color: R.B > 30 ? BAD : '#7A4FB5' });
      lz.userData.set({ color: R.Z ? SAF : OFF, on: R.Z }); lc.userData.set({ color: R.carries > 0 ? SAF : OFF, on: R.carries > 0 });
      const looped = R.trace.some(t => t.op === 0x20);
      back.visible = st.signed && st.advance && looped; away.visible = !st.signed && st.advance && looped;
      back.userData.set({ on: running }); away.userData.set({ on: true });
    }
    const tick = dt => { cpu.position.x += (tx - cpu.position.x) * Math.min(1, dt * 5); [cpu, tA, tB, back, away].forEach(o => o.userData.tick(dt)); };
    function isOk() { return st.mask && st.zflag && st.signed && st.advance && (!R.halted || R.A === 209); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Steps executed', min: 0, max: 200, step: 1, get: () => st.steps, set: v => set({ steps: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Wrap 8-bit values at 255', short: 'Wrap', get: () => st.mask, set: v => set({ mask: !!v }) },
      { type: 'toggle', label: 'DEC sets the zero flag', short: 'Zero flag', get: () => st.zflag, set: v => set({ zflag: !!v }) },
      { type: 'toggle', label: 'Read jump offsets as signed', short: 'Signed', get: () => st.signed, set: v => set({ signed: !!v }) },
      { type: 'toggle', label: 'Advance PC after each fetch', short: 'Advance PC', get: () => st.advance, set: v => set({ advance: !!v }) },
    ];
    const readouts = [
      { label: 'Register A', get: () => ({ v: `${R.A}`, sub: 'hardware gives 209', good: R.A === 209 && R.halted, bad: R.A > 255 || (R.halted && R.A !== 209) }) },
      { label: 'State', get: () => ({ v: R.halted ? 'halted' : R.crashed ? 'crashed' : 'running', sub: `${R.steps} steps`, good: R.halted, bad: R.crashed || R.loopForever }) },
      { label: 'Carries', get: () => ({ v: `${R.carries}`, sub: 'adds that overflowed', good: st.mask, bad: false }) },
    ];
    const labels = [
      { name: 'm', t: 'Nine bytes of program', d: 'Tall: an instruction. Gold: the program counter', icon: 'code', atV: V(MX(0) - 0.17, 0.1, MZ) },
      { name: 'r', t: 'Registers A and B', d: 'Each holds up to 255. Coral: overflowed', icon: 'box', atV: V(3.23, 0.5, -0.2) },
      { name: 'f', t: 'Zero and carry flags', d: 'Gold: set', icon: 'spark', atV: V(3.0, 0.35, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget 8-bit wraparound', hint: 'A holds 465', on: () => set({ ...D0, mask: false }), off: reset },
      { label: 'Forget the zero flag', hint: 'the loop never ends', on: () => set({ ...D0, zflag: false }), off: reset },
      { label: 'Read the offset as unsigned', hint: 'jumps off the end', on: () => set({ ...D0, signed: false }), off: reset },
      { label: 'Forget to advance PC', hint: 'stuck on one byte', on: () => set({ ...D0, advance: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.advance) return { ok: false, msg: `<b>Without advancing the program counter, the CPU fetches byte 0 again and again and reads it as its own operand: after ${r.steps} steps it has never left the first instruction.</b> Step the counter past each byte as it is fetched.` };
      if (!st.signed) return { ok: false, msg: '<b>The jump offset 0xFC was read as 252 instead of minus 4, so after the first pass the program counter leaps far past the program and the CPU crashes on missing memory.</b> Relative jumps use a signed byte: values above 127 count backwards.' };
      if (!st.zflag) return { ok: false, msg: r.halted ? `<b>DEC never sets the zero flag, so the loop runs past B = 0 and only stops by accident, when an ADD happens to make A zero: ${r.steps} steps, A = ${r.A}, B wrapped to ${r.B}.</b> Decrement must set Z when its result is zero.` : `<b>DEC never sets the zero flag, so JR NZ keeps jumping back: after ${r.steps} steps the loop is still running, with B wrapped to ${r.B}.</b> Decrement must set Z when its result is zero.` };
      if (!st.mask) return { ok: false, msg: `<b>Without wraparound, A ends at ${r.A}, a number no 8-bit register can hold; the real CPU wraps to 209 and sets the carry flag.</b> Mask every 8-bit result with 0xFF and set carry when it overflows: games depend on it.` };
      if (!r.halted) return { ok: true, msg: `<b>Paused after ${r.steps} steps: the program counter is at ${r.PC}, A is ${r.A} and B is ${r.B}.</b> Slide the steps to the end to see it halt.` };
      return { ok: true, msg: `<b>After ${r.steps} steps the CPU reaches HALT with A = 209: 465 wrapped modulo 256, with the carry flag set along the way, exactly as the real chip would.</b> Fetch, advance, decode, execute, and get every flag right.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A tiny program', home: true, say: 'Nine bytes in memory: set A to zero, set B to thirty, add B to A, count B down, and jump back until B is zero.', act: m => m.set({ steps: 0, mask: true, zflag: true, signed: true, advance: true }) },
    { t: 'Fetch, decode, execute', home: true, say: 'Fetch the byte at the program counter, move the counter on, decode it and carry it out.', act: m => m.set({ steps: 4, mask: true, zflag: true, signed: true, advance: true }) },
    { t: 'Round the loop', home: true, say: 'Each pass adds B to A, counts B down and jumps back four bytes.', act: m => m.set({ steps: 20, mask: true, zflag: true, signed: true, advance: true }) },
    { t: 'Wraparound', home: true, say: 'A is eight bits. Past 255 it wraps round and sets the carry flag, just like the real chip.', act: m => m.set({ steps: 200, mask: true, zflag: true, signed: true, advance: true }) },
    { t: 'A missing flag', home: true, say: 'Forget to set the zero flag on decrement, and the loop never ends.', act: m => m.set({ steps: 200, mask: true, zflag: false, signed: true, advance: true }) },
    { t: 'Every detail', home: true, say: 'Signed jumps, flags and wraparound: get each one right and real programs run.', act: m => m.set({ steps: 200, mask: true, zflag: true, signed: true, advance: true }) },
  ],
  check: [
    { q: 'What are the steps of the CPU loop?', options: ['Fetch, advance the counter, decode, execute', 'Compile, link, run', 'Read, sort, write'], answer: 0, why: 'Every emulator runs this loop.', hint: 'Step through the program.' },
    { q: 'What does an 8-bit register do past 255?', options: ['Wraps round and sets the carry flag', 'Grows bigger', 'Stops the CPU'], answer: 0, why: 'Programs depend on it.', hint: 'Try Forget 8-bit wraparound.' },
    { q: 'What does 0xFC mean as a jump offset?', options: ['Minus 4: a signed byte', '252 forward', 'Halt'], answer: 0, why: 'Above 127 counts backwards.', hint: 'Try Read the offset as unsigned.' },
  ],
  terms: [
    ['Emulator', 'A program that behaves like another machine.'],
    ['Program counter', 'The register holding the address of the next instruction.'],
    ['Opcode', 'The byte that says which instruction to run.'],
    ['Register', 'A small storage slot inside the processor.'],
    ['Flag', 'A bit recording a result, such as zero or carry.'],
    ['Signed byte', 'A byte read as minus 128 to 127.'],
  ],
  deeper: '<p><b>Timing.</b> Real emulators count the clock cycles each instruction takes, because graphics, sound and timers run in step with the CPU.</p><p><b>Test programs.</b> Small test ROMs check each instruction and flag and print pass or fail.</p><p><b>About this machine.</b> The CPU implements only the six opcodes the program uses.</p>',
  code: {
    title: 'The fetch-decode-execute loop',
    note: 'Our own short version, written for this lesson.',
    text: `
def step(cpu, mem):
    op = mem[cpu.pc]; cpu.pc += 1                       # fetch, advance
    if op == 0x3E:                                      # LD A, n
        cpu.a = mem[cpu.pc]; cpu.pc += 1
    elif op == 0x80:                                    # ADD A, B
        s = cpu.a + cpu.b
        cpu.carry = s > 0xFF
        cpu.a = s & 0xFF                                # 8-bit wraparound
        cpu.zero = cpu.a == 0
    elif op == 0x05:                                    # DEC B
        cpu.b = (cpu.b - 1) & 0xFF
        cpu.zero = cpu.b == 0
    elif op == 0x20:                                    # JR NZ, e
        e = mem[cpu.pc]; cpu.pc += 1
        e = e - 256 if e > 127 else e                   # signed offset
        if not cpu.zero:
            cpu.pc += e
    elif op == 0x76:                                    # HALT
        cpu.halted = True
`,
  },
};
