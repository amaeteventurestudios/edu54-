// Build your own RISC-V processor: a small RV32I core of the kind built on an FPGA, running a six-instruction program that adds 5 + 4 + 3
// + 2 + 1 into x2. The core is a little state machine clocked by the board: FETCH puts the program counter on the memory's address lines and
// waits a cycle for the block RAM to answer, then EXECUTE decodes the 32-bit word, reads two registers, runs the ALU and writes back on the
// clock edge. Register x0 must be wired to zero, immediates must be sign-extended, and the RAM's one-cycle latency must be waited for; each can
// be broken. Instructions use the real RV32I encodings and are executed cycle by cycle.
const enc = {
  addi: (rd, rs1, imm) => ((imm & 0xFFF) << 20) | (rs1 << 15) | (0 << 12) | (rd << 7) | 0x13,
  add: (rd, rs1, rs2) => (rs2 << 20) | (rs1 << 15) | (rd << 7) | 0x33,
  beq: (rs1, rs2, off) => { const i = off & 0x1FFF; return (((i >> 12) & 1) << 31) | (((i >> 5) & 0x3F) << 25) | (rs2 << 20) | (rs1 << 15) | (0 << 12) | (((i >> 1) & 0xF) << 8) | (((i >> 11) & 1) << 7) | 0x63; },
  jal: (rd, off) => { const i = off & 0x1FFFFF; return (((i >> 20) & 1) << 31) | (((i >> 1) & 0x3FF) << 21) | (((i >> 11) & 1) << 20) | (((i >> 12) & 0xFF) << 12) | (rd << 7) | 0x6F; },
  ebreak: () => 0x00100073,
};
const PROG = [
  { asm: 'addi x1, x0, 5', w: enc.addi(1, 0, 5) },
  { asm: 'add  x2, x2, x1', w: enc.add(2, 2, 1) },
  { asm: 'addi x1, x1, -1', w: enc.addi(1, 1, -1) },
  { asm: 'beq  x1, x0, +8', w: enc.beq(1, 0, 8) },
  { asm: 'jal  x0, -12', w: enc.jal(0, -12) },
  { asm: 'ebreak', w: enc.ebreak() },
];
const sx = (v, bits) => (v << (32 - bits)) >> (32 - bits);
function run(o) {
  const x = Array(32).fill(0);
  let pc = 0, cycles = 0, retired = 0, halted = false, state = 'FETCH', ir = 0, lastPC = 0, latched = 0;
  const hist = [];
  while (cycles < o.cycles && !halted) {
    cycles++;
    if (state === 'FETCH') {
      const word = PROG[pc >> 2] ? PROG[pc >> 2].w : 0;
      if (o.wait) { latched = word; state = 'WAIT'; }
      else { ir = latched; latched = word; state = 'EXEC'; }
      continue;
    }
    if (state === 'WAIT') { ir = latched; state = 'EXEC'; continue; }
    const op = ir & 0x7F, rd = (ir >> 7) & 31, rs1 = (ir >> 15) & 31, rs2 = (ir >> 20) & 31;
    const immI = o.sign ? sx(ir >>> 20, 12) : (ir >>> 20) & 0xFFF;
    const r = i => (o.x0 && i === 0) ? 0 : x[i];
    let next = pc + 4, wb = null;
    if (op === 0x13) wb = (r(rs1) + immI) | 0;
    else if (op === 0x33) wb = (r(rs1) + r(rs2)) | 0;
    else if (op === 0x63) { const b = ((ir >> 31) & 1) << 12 | ((ir >> 7) & 1) << 11 | ((ir >> 25) & 0x3F) << 5 | ((ir >> 8) & 0xF) << 1; const off = o.sign ? sx(b, 13) : b; if (r(rs1) === r(rs2)) next = pc + off; }
    else if (op === 0x6F) { const j = ((ir >> 31) & 1) << 20 | ((ir >> 12) & 0xFF) << 12 | ((ir >> 20) & 1) << 11 | ((ir >> 21) & 0x3FF) << 1; const off = o.sign ? sx(j, 21) : j; wb = pc + 4; next = pc + off; }
    else if (ir === 0x00100073) { halted = true; }
    if (wb !== null && !(o.x0 && rd === 0)) x[rd] = wb;
    if (wb !== null && o.x0 && rd === 0) { /* discarded */ }
    hist.push({ pc, asm: (PROG.find(p => p.w === ir) || { asm: ir ? '?' : 'nop (stale 0)' }).asm });
    lastPC = pc; pc = next; retired++; state = 'FETCH';
  }
  return { x, pc, cycles, retired, halted, hist, cpi: retired ? cycles / retired : 0, lastPC };
}

export default {
  slug: 'build-a-riscv-cpu',
  title: 'Build your own RISC-V processor',
  description: 'A small RISC-V core runs six instructions: fetch, wait for memory, execute. Break one rule and the sum in x2 goes wrong.',
  overview: 'A processor is a circuit, and with a small FPGA board and a hardware description language such as Verilog you can build one, as the From Blinker to RISC-V tutorial does, starting from a blinking light. RISC-V suits this well: its base instruction set, RV32I, has a few dozen instructions with regular 32-bit encodings. The core is a small state machine driven by the board\'s clock. In the fetch state it puts the program counter on the address lines of the block RAM; FPGA memories answer on the next clock edge, so the core must wait a cycle before latching the instruction, or it will latch whatever word the memory was still showing from before. In the execute state, the decoder slices the instruction into fields: the opcode, the destination register rd, the source registers rs1 and rs2, and an immediate value. The register file supplies the sources, the ALU adds or compares, and on the next clock edge the result is written to rd and the program counter moves to PC plus 4 or to a branch target. Two rules of the instruction set are easy to get wrong. Register x0 always reads as zero, and writes to it are thrown away; programs rely on it, for example jal x0 is an ordinary jump that discards its return address. And immediates are sign-extended: the 12-bit field 0xFFF means minus 1, so addi x1, x1, -1 counts down, and branch offsets can point backwards. A simple core like this takes several clock cycles per instruction; pipelining overlaps the stages to approach one. This machine runs the program cycle by cycle with real RV32I encodings.',
  keywords: ['build your own CPU', 'RISC-V', 'RV32I', 'FPGA', 'Verilog', 'instruction decoding', 'register x0'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.1, 0.8, 1.2], half: 0.95, wide: 5.6 },
  credit: 'Built from <a href="https://github.com/BrunoLevy/learn-fpga/tree/master/FemtoRV/TUTORIALS/FROM_BLINKER_TO_RISCV" target="_blank" rel="noopener">From Blinker to RISC-V</a> by Bruno Levy (BSD-3-Clause), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short RV32I core sketch, written for this lesson after FemtoRV (BSD-3-Clause).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cycles: 120, x0: true, sign: true, wait: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA', REG = '#2F7A55';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the block RAM: six instruction words stacked; gold is the word being run
    const ram = P.stack(0.72, 0.5, 0.17, { max: PROG.length }); ram.position.set(-2.15, 0.02, -0.1); S.add(ram);
    const ramBase = P.box(0.86, 0.04, 0.64, '#3A3D4A', { r: 0.03 }); ramBase.position.set(-2.15, 0, -0.1); S.add(ramBase);
    const bus = P.pipe([V(-1.75, 0.45, -0.1), V(-1.3, 0.45, -0.1), V(-1.0, 0.12, -0.1)], SAF, { r: 0.035, n: 4 }); S.add(bus);
    // the core's state machine: three pads, a token on the current one
    const FSM = ['FETCH', 'WAIT', 'EXEC'], FP = [V(-0.8, 0, -0.45), V(-0.35, 0, 0.05), V(-0.8, 0, 0.45)];
    const pads = FP.map(p => { const m = own(OFF), c = P.cyl(0.2, 0.08, OFF, { material: m }); c.position.copy(p); S.add(c); return { c, m }; });
    const ring = [0, 1, 2].map(i => { const r = P.rod(FP[i].clone().setY(0.05), FP[(i + 1) % 3].clone().setY(0.05), 0.02, '#8E91A3'); S.add(r); return r; });
    const token = P.ball(0.1, SAF); token.userData.noFit = true; S.add(token);
    // registers as towers: x0 must stay flat, x1 counts down, x2 adds up to fifteen
    const towers = [0, 1, 2].map(i => { const t = P.tower(0.34, 0.34, REG); t.position.set(0.55 + i * 0.55, 0, 0); t.userData.set({ cap: '' }); S.add(t); return t; });
    const pads2 = [0, 1, 2].map(i => { const b = P.box(0.46, 0.03, 0.46, '#3A3D4A', { r: 0.03 }); b.position.set(0.55 + i * 0.55, 0, 0); S.add(b); return b; });
    const halt = P.lamp(SAF, { h: 0.45, r: 0.12 }); halt.position.set(2.45, 0, 0); S.add(halt);
    S.add(P.keep(-2.6, 2.7, 1.3, -0.7, 0.7));

    let R = null, tokTo = FP[0].clone();
    const H = v => (v < 0 || v > 15) ? 1.15 : Math.max(0.03, v / 15 * 0.95);
    function draw() {
      R = run(st);
      const cur = R.halted ? R.lastPC >> 2 : Math.min(PROG.length - 1, R.pc >> 2);
      ram.userData.set({ n: PROG.length, colors: PROG.map((p, i) => i === cur ? SAF : '#5B8DB8') });
      let state = 'FETCH';
      { // replay the state machine to the current cycle
        let s = 'FETCH'; for (let c = 0; c < R.cycles; c++) s = s === 'FETCH' ? (st.wait ? 'WAIT' : 'EXEC') : s === 'WAIT' ? 'EXEC' : 'FETCH';
        state = R.halted ? 'EXEC' : s;
      }
      pads.forEach((p, i) => { const on = FSM[i] === state; p.m.color.set(!st.wait && i === 1 ? '#D8D2C4' : on ? SAF : '#5B8DB8'); p.c.scale.y = !st.wait && i === 1 ? 0.3 : 1; });
      tokTo = FP[FSM.indexOf(state)].clone().setY(0.18);
      [R.x[0], R.x[1], R.x[2]].forEach((v, i) => {
        const wrong = i === 0 ? v !== 0 : v < 0 || v > 15 || (i === 2 && R.halted && v !== 15);
        towers[i].userData.set({ h: H(Math.abs(v)) * (v < 0 ? 1 : 1), color: wrong ? BAD : i === 2 && R.halted ? GOOD : REG });
      });
      const stuck = !R.halted && R.cycles >= 120;
      halt.userData.set({ color: R.halted ? (R.x[2] === 15 ? GOOD : BAD) : stuck ? BAD : SAF, on: true });
      bus.userData.set({ on: !R.halted });
    }
    const tick = dt => { token.position.lerp(tokTo, Math.min(1, dt * 8)); towers.forEach(t => t.userData.tick(dt)); bus.userData.tick(dt); };
    function isOk() { return st.x0 && st.sign && st.wait && (!R.halted || R.x[2] === 15); }
    draw(); token.position.copy(tokTo); towers.forEach(t => t.userData.snap());
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Clock cycles', min: 0, max: 120, step: 1, get: () => st.cycles, set: v => set({ cycles: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Wire x0 to zero', short: 'x0 = 0', get: () => st.x0, set: v => set({ x0: !!v }) },
      { type: 'toggle', label: 'Sign-extend immediates', short: 'Sign-extend', get: () => st.sign, set: v => set({ sign: !!v }) },
      { type: 'toggle', label: 'Wait a cycle for the RAM', short: 'Wait state', get: () => st.wait, set: v => set({ wait: !!v }) },
    ];
    const readouts = [
      { label: 'x2', get: () => ({ v: `${R.x[2]}`, sub: 'should be 15', good: R.halted && R.x[2] === 15, bad: R.halted && R.x[2] !== 15 }) },
      { label: 'State', get: () => ({ v: R.halted ? 'halted' : 'running', sub: `${R.cycles} cycles`, good: R.halted, bad: !R.halted && R.cycles >= 120 }) },
      { label: 'Cycles per instruction', get: () => ({ v: R.cpi.toFixed(1), sub: 'fetch, wait, execute', good: true, bad: false }) },
    ];
    const labels = [
      { name: 'm', t: 'Six instructions in RAM', d: 'Gold: the one being run', icon: 'code', atV: V(-2.51, 0.5, -0.1) },
      { name: 's', t: 'Fetch, wait, execute', d: 'The ball marks this cycle\'s state', icon: 'reset', atV: V(-0.8, 0.08, 0.65) },
      { name: 'r', t: 'Registers x0, x1, x2', d: 'x0 stays flat. Coral: a wrong value', icon: 'box', atV: V(1.82, 0.3, 0.17) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let x0 be written', hint: 'jal x0 stores to it', on: () => set({ ...D0, x0: false }), off: reset },
      { label: 'Zero-extend immediates', hint: '-1 becomes 4095', on: () => set({ ...D0, sign: false }), off: reset },
      { label: 'Skip the RAM wait state', hint: 'stale instructions', on: () => set({ ...D0, wait: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.x0) return { ok: false, msg: `<b>The jump jal x0, -12 wrote its return address into x0, so x0 is now ${r.x[0]} instead of zero, and beq x1, x0 never sees them equal: ${r.halted ? `it halted with x2 = ${r.x[2]}` : `after ${r.cycles} cycles it is still looping, x2 = ${r.x[2]}`}.</b> Wire x0 to zero and discard writes to it.` };
      if (!st.sign) return { ok: false, msg: `<b>The immediate 0xFFF was zero-extended to 4095 instead of minus 1, and the backward jump became a huge forward one: x1 jumps to ${r.x[1]} and the program runs off its end.</b> Copy the top bit of every immediate into the upper bits.` };
      if (!st.wait) return { ok: false, msg: `<b>Latching the instruction in the same cycle as the address, the core gets the word the RAM was still showing from the previous fetch, so every instruction runs one step late: ${r.halted ? `x2 = ${r.x[2]}` : `still running, x2 = ${r.x[2]}`}.</b> Block RAM answers on the next clock edge; wait one cycle.` };
      if (!r.halted) return { ok: true, msg: `<b>After ${r.cycles} cycles the core has retired ${r.retired} instructions: x1 = ${r.x[1]}, x2 = ${r.x[2]}.</b> Slide the cycles up to watch it reach ebreak.` };
      return { ok: true, msg: `<b>The core halts at ebreak with x2 = 15 after ${r.cycles} cycles and ${r.retired} instructions, ${r.cpi.toFixed(1)} cycles each: fetch, wait for the RAM, execute.</b> x0 stayed zero through every jal x0, and the -1 and -12 immediates were sign-extended.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A program in RAM', home: true, say: 'Six RISC-V instructions in the board\'s memory: count x1 down from five and add each value into x2.', act: m => m.set({ cycles: 0, x0: true, sign: true, wait: true }) },
    { t: 'Fetch and wait', home: true, say: 'The core puts the program counter on the address lines, and waits one cycle for the memory to answer.', act: m => m.set({ cycles: 3, x0: true, sign: true, wait: true }) },
    { t: 'Decode and execute', home: true, say: 'It slices the instruction into fields, reads two registers, adds, and writes back on the clock edge.', act: m => m.set({ cycles: 15, x0: true, sign: true, wait: true }) },
    { t: 'x0 is zero', home: true, say: 'jal x0 is a plain jump: x0 throws its return address away. Make x0 writable and the loop never ends.', act: m => m.set({ cycles: 120, x0: false, sign: true, wait: true }) },
    { t: 'Sign extension', home: true, say: 'The twelve bits of minus one are all ones. Zero-extend them and minus one becomes 4095.', act: m => m.set({ cycles: 120, x0: true, sign: false, wait: true }) },
    { t: 'Fifteen', home: true, say: 'Get every rule right and the core halts with fifteen in x2.', act: m => m.set({ cycles: 120, x0: true, sign: true, wait: true }) },
  ],
  check: [
    { q: 'What does register x0 hold in RISC-V?', options: ['Always zero; writes are discarded', 'The program counter', 'The last result'], answer: 0, why: 'jal x0 relies on it.', hint: 'Try Let x0 be written.' },
    { q: 'Why sign-extend immediates?', options: ['So 0xFFF means minus 1 and branches can go backwards', 'To save bits', 'For speed'], answer: 0, why: 'Copy the top bit up.', hint: 'Try Zero-extend immediates.' },
    { q: 'Why does the core wait a cycle after fetch?', options: ['Block RAM answers on the next clock edge', 'To save power', 'To decode'], answer: 0, why: 'Or it latches a stale word.', hint: 'Try Skip the RAM wait state.' },
  ],
  terms: [
    ['RV32I', 'The base 32-bit RISC-V instruction set.'],
    ['FPGA', 'A chip whose logic can be rewired to become any circuit.'],
    ['Register file', 'The processor\'s set of registers, x0 to x31.'],
    ['Immediate', 'A constant encoded inside an instruction.'],
    ['Sign extension', 'Copying a number\'s top bit into wider bits to keep its sign.'],
    ['Clock edge', 'The instant when registers take their new values.'],
  ],
  deeper: '<p><b>Pipelining.</b> Overlapping fetch, decode and execute of different instructions brings a core towards one instruction per cycle, at the cost of handling hazards.</p><p><b>Verilog.</b> In hardware, the decoder and ALU are combinational wires; only the registers, the program counter and the state change on the clock edge.</p><p><b>About this machine.</b> The core implements only the instructions this program uses, with real encodings.</p>',
  code: {
    title: 'The heart of a tiny RV32I core',
    note: 'Our own short sketch in Verilog, after FemtoRV.',
    text: `
always @(posedge clk) begin
  case (state)
    FETCH: begin mem_addr <= pc; state <= WAIT; end            // RAM answers next edge
    WAIT:  begin instr <= mem_rdata; state <= EXECUTE; end
    EXECUTE: begin
      if (writeBack && rdId != 0) regs[rdId] <= writeBackData;  // x0 stays zero
      pc <= takeBranch ? pc + Bimm : isJAL ? pc + Jimm : pc + 4;
      state <= FETCH;
    end
  endcase
end

wire [31:0] Iimm = {{21{instr[31]}}, instr[30:20]};            // sign-extended
wire [31:0] Bimm = {{20{instr[31]}}, instr[7], instr[30:25], instr[11:8], 1'b0};
wire [31:0] Jimm = {{12{instr[31]}}, instr[19:12], instr[20], instr[30:21], 1'b0};
`,
  },
};
