// The reverse engineering landscape: five tools (a linear sweep, radare2, rizin, angr, Ghidra) read the same four objects the student compiled.
// Addresses differ only by the base each tool gives .text (0, 0x08000040, 0x400000, 0x100000); subtracting it puts grade at .text+0x10 in every tool.
// Block and edge counts for grade at -O0 differ for reasons: radare2 stops at jmp rax, rizin and Ghidra read the jump table through its relocations
// (Ghidra also splits at a switch label), angr leaves the transfer unresolved. angr's full scan invents functions at padding and at data.
// The IR panel lifts one instruction four ways: ESIL tokens, RzIL set effects, P-code operations, VEX statements (flags eager, or a thunk in VEX).
// Counts are from the course's captures (llvm-objdump 17, radare2 6.2.4, rizin 0.9.1, angr 10.0.3, Ghidra 12.1.4).
const TOOLS = [
  { n: 'Sweep', base: 0x0, c: '#8E8C84' },
  { n: 'radare2', base: 0x08000040, c: '#E07A5F' },
  { n: 'rizin', base: 0x08000040, c: '#C9A227' },
  { n: 'angr', base: 0x400000, c: '#7B6FA8' },
  { n: 'Ghidra', base: 0x100000, c: '#1F9E89' },
];
// per object: what each tool reports for the function in focus (blocks, edges; null = no graph) and functions found (symbols, invented)
const OBJ = [
  { n: 'ledger -O1', fn: 'total', b: [null, 5, 5, 5, 5], e: [null, 5, 5, 5, 5], why: ['no graph: decodes everything, padding too', 'agrees', 'agrees', 'agrees', 'agrees'], fns: [4, 4, 4, 6, 4], inv: 'angr: sub_40003e, sub_40005f at padding' },
  { n: 'ledger -O2', fn: 'total', b: [null, 10, 10, 10, 10], e: [null, 13, 13, 13, 13], why: ['no graph', 'agrees', 'agrees', 'agrees', 'agrees'], fns: [4, 4, 4, 6, 4], inv: 'angr: two functions at padding' },
  { n: 'grade -O0', fn: 'grade', b: [null, 3, 8, 8, 9], e: [null, 2, 11, 7, 12], why: ['no graph', 'stopped at jmp rax: 36 case bytes missed', 'read the 5-entry table: matches the hand-drawn graph', 'case blocks found, the jump left unresolved', 'a switch label splits one block: +1 block, +1 edge'], fns: [4, 4, 4, 6, 4], inv: 'angr: two functions at padding' },
  { n: 'sweep-trap', fn: 'lookup', b: [null, 2, 2, 2, 2], e: [null, 1, 1, 1, 1], why: ['8 starts: reads the table bytes 31 c0 90 48 as code', 'agrees: 0x10–0x14 left unclaimed', 'agrees', 'agrees, then invents sub_400010 on the table', 'agrees'], fns: [2, 2, 2, 3, 2], inv: 'angr: sub_400010 on the 4 table bytes' },
];
const IRS = [
  { n: 'subq $0x10, %rsp', bytes: '48 83 ec 10', v: [30, 14, 9, 7], flags: true },
  { n: 'movslq %edi, %rax', bytes: '48 63 c7', v: [5, 1, 1, 4], flags: false },
  { n: 'cmpl $0x4, %ecx', bytes: '83 f9 04', v: [30, 13, 10, 7], flags: true },
];
const IRN = [['ESIL', 'tokens', 'radare2: a stack string'], ['RzIL', 'set effects', 'rizin: S-expressions'], ['P-code', 'operations', 'Ghidra: register transfers'], ['VEX', 'statements', 'angr: flags as a thunk']];
const hex = n => '0x' + n.toString(16);

export default {
  slug: 'the-reverse-engineering-landscape',
  title: 'Five tools, one object: reading the reverse engineering field',
  description: 'Five reverse engineering tools read the same small program the student compiled. Where they differ, there is always a reason.',
  overview: 'The field is older than its tools: decompilation theses date from 1973, debuggers and batch disassemblers came through the 1980s, interactive disassemblers and the first decompilers in the 1990s and 2000s, and open frameworks and decompilers (radare2 in 2009, angr from 2013, Ghidra released in 2019) after. Tools fall into families by what they produce: disassemblers (linear sweep, or recursive descent with a database), decompilers, debuggers, analysis frameworks, format and engine libraries, and diffing tools. Every decompiler runs the same stages under different names: loader, disassembly, control-flow graph, lifting to an intermediate language, SSA, data flow and types, structuring, and emission. Comparing tools takes care. A relocatable object has no load address, so each loader picks one; subtract the base each gave .text and every tool places the function at the same offset. Block counts differ for reasons: one tool stops at an indirect jump, two read the jump table through its relocations, one splits a block at a switch label, one leaves the jump unresolved. A full scan for function starts can invent functions at padding and at data. The intermediate languages differ too: ESIL and RzIL were built for emulation, P-code and VEX for analysis, and VEX stores flags as a thunk computed only when read.',
  keywords: ['reverse engineering', 'Ghidra', 'radare2', 'angr', 'decompiler', 'intermediate representation', 'control flow graph'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.8, 1.3], half: 1.3, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { obj: 2, reduce: true, why: true, sym: true, ir: 0 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* five tool stations, the same object in each: a tower for basic blocks, a thinner one for edges, a stack for functions found (red ones are invented),
       and a gold marker on a post at the address the tool shows for grade (all level once the base is subtracted) */
    const CX = i => -2.4 + i * 0.68, CZ = -0.15;
    const cols = TOOLS.map((t, i) => {
      const ped = P.box(0.6, 0.08, 0.9, t.c, { r: 0.04 }); ped.position.set(CX(i), 0, CZ); S.add(ped);
      const blk = P.tower(0.2, 0.2, t.c), edg = P.tower(0.12, 0.12, '#6B6E7E'); blk.position.set(CX(i) - 0.12, 0.08, CZ - 0.15); edg.position.set(CX(i) + 0.12, 0.08, CZ - 0.15); blk.userData.set({ cap: '' }); edg.userData.set({ cap: '' }); S.add(blk, edg);
      const fns = P.stack(0.3, 0.2, 0.07, { max: 8 }); fns.position.set(CX(i), 0.08, CZ + 0.3); S.add(fns);
      const post = P.cyl(0.02, 1, '#6B6E7E'); post.position.set(CX(i) + 0.27, 0, CZ + 0.38); S.add(post);
      const mk = P.box(0.12, 0.06, 0.12, SAF, { r: 0.02 }); mk.userData.noFit = true; S.add(mk);
      return { blk, edg, fns, post, mk };
    });
    /* one instruction, four IRs: a tower per IR, as tall as the operations it takes */
    const IX = 1.3, irs = IRN.map((r, i) => { const t = P.tower(0.24, 0.24, ['#E07A5F', '#C9A227', '#1F9E89', '#7B6FA8'][i]); t.position.set(IX + i * 0.32, 0, CZ); t.userData.set({ cap: '' }); S.add(t); return t; });
    const irPad = P.box(1.35, 0.03, 0.5, '#FFFDF5', { r: 0.03 }); irPad.position.set(IX + 0.48, 0, CZ); S.add(irPad);
    S.add(P.keep(-2.75, 2.45, 1.2, -0.7, 0.45));

    let spread = 0;
    function draw() {
      const O = OBJ[st.obj];
      const raws = TOOLS.map(t => t.base + 0x10);
      spread = st.reduce ? 1 : new Set(raws).size;
      cols.forEach((c, i) => {
        const b = O.b[i], e = O.e[i];
        c.blk.visible = c.edg.visible = b != null;
        c.blk.userData.set({ h: b == null ? 0.02 : b * 0.08, color: st.why && /missed|stopped|invents|reads the table bytes/.test(O.why[i]) ? RED : TOOLS[i].c });
        c.edg.userData.set({ h: e == null ? 0.02 : e * 0.06 });
        const f = st.sym ? Math.min(O.fns[i], O.fns[0]) : O.fns[i], real = Math.min(f, O.fns[0]);
        c.fns.userData.set({ n: f, colors: Array.from({ length: f }, (_, j) => j < real ? '#FFFFFF' : RED) });
        const y = st.reduce ? 0.7 : 0.25 + Math.log2(raws[i] + 1) / 28 * 0.9; c.post.scale.y = y; c.mk.position.set(CX(i) + 0.27, y, CZ + 0.38);
      });
      const I = IRS[st.ir];
      irs.forEach((t, i) => t.userData.set({ h: 0.05 + I.v[i] * 0.03 }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Object', options: ['-O1', '-O2', 'grade -O0', 'sweep-trap'], get: () => st.obj, act: i => set({ obj: i }) },
      { type: 'toggle', label: 'Reduce addresses to .text offsets', short: 'Offsets', get: () => st.reduce, set: v => set({ reduce: !!v }) },
      { type: 'toggle', label: 'Show each count with its reason', short: 'Reasons', get: () => st.why, set: v => set({ why: !!v }) },
      { type: 'toggle', label: 'Count only symbol-backed functions', short: 'Symbols', get: () => st.sym, set: v => set({ sym: !!v }) },
      { type: 'buttons', label: 'Instruction to lift', options: ['subq', 'movslq', 'cmpl'], get: () => st.ir, act: i => set({ ir: i }) },
    ];
    const readouts = [
      { label: 'Where grade is', get: () => ({ v: st.reduce ? '.text+0x10' : `${spread} addresses`, sub: st.reduce ? 'all five tools' : 'raw, one per base', good: st.reduce, bad: !st.reduce }) },
      { label: 'Blocks', get: () => { const b = OBJ[st.obj].b.filter(x => x != null); return { v: [...new Set(b)].join(' · '), sub: OBJ[st.obj].fn, bad: new Set(b).size > 1 && !st.why }; } },
      { label: 'Functions', get: () => { const f = OBJ[st.obj].fns; return { v: st.sym ? String(f[0]) : [...new Set(f)].join(' · '), sub: st.sym ? 'symbol-backed' : 'as reported', bad: !st.sym, good: st.sym }; } },
    ];
    const labels = [
      { name: 'tools', t: 'Five tools, one object', d: 'Sweep, radare2, rizin, angr, Ghidra: tall tower blocks, thin tower edges (red when the tool went wrong), the stack functions found (red: invented), the gold marker where grade sits', icon: 'layers', atV: V(CX(0) - 0.32, 0.1, CZ) },
      { name: 'ir', t: 'One instruction, four IRs', d: 'ESIL, RzIL, P-code, VEX: each tower as tall as the operations it needs', icon: 'code', atV: V(IX + 1.12, 0.4, CZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Compare raw addresses', hint: 'four bases, "four places"', on: () => set({ ...D0, reduce: false }), off: reset },
      { label: 'Read block counts as code found', hint: '3, 8, 8, 9 with no reasons', on: () => set({ ...D0, obj: 2, why: false }), off: reset },
      { label: 'Count every function a tool reports', hint: 'padding becomes functions', on: () => set({ ...D0, obj: 0, sym: false }), off: reset },
    ];
    function status() {
      const O = OBJ[st.obj];
      if (!st.reduce) return { ok: false, msg: `<b>Raw, the tools put grade at ${spread} different addresses: ${[...new Set(TOOLS.map(t => hex(t.base + 0x10)))].join(', ')}.</b> They agree. A relocatable object has no load address, so each loader picks a base for .text. Subtract it and every tool says .text+0x10, which is what the symbol table says too.` };
      if (!st.why && new Set(O.b.filter(x => x != null)).size > 1) return { ok: false, msg: `<b>${O.b.filter(x => x != null).join(', ')} blocks for one function, and nothing says why.</b> All four decoded the same 33 instructions where they reached them. radare2 stopped at jmp rax; rizin read the jump table and matches the graph drawn by hand; angr found the case blocks but left the jump unresolved; Ghidra split a block at its switch label. A count without its reason is not a claim.` };
      if (!st.sym && O.fns[3] > O.fns[0]) return { ok: false, msg: `<b>Counting everything reported, angr finds ${O.fns[3]} functions where the symbol table has ${O.fns[0]}.</b> ${O.inv}. Its full scan of leftover bytes makes a function wherever bytes decode. Check each function start against a symbol, a call or an entry before counting it.` };
      return { ok: true, msg: `<b>Every tool places grade (in the -O1 build) at .text+0x10, and in ${O.n} ${new Set(O.b.filter(x => x != null)).size === 1 ? `all four graph builders agree on ${O.fn}: ${O.b[1]} blocks, ${O.e[1]} edge${O.e[1] === 1 ? '' : 's'}` : `each block count comes with its reason`}.</b> ${IRS[st.ir].n} lifts to ${IRS[st.ir].v.join(', ')} items in ESIL, RzIL, P-code and VEX: same meaning, different styles.` };
    }
    return { update: dt => { cols.forEach(c => { c.blk.userData.tick(dt); c.edg.userData.tick(dt); }); irs.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Fifty years of tools', home: true, say: 'Reverse engineering tools come in families: disassemblers, decompilers, debuggers and analysis frameworks. Five of them read the student\'s own small program.', act: m => m.set({ obj: 0, reduce: true, why: true, sym: true, ir: 0 }) },
    { t: 'Four addresses, one place', home: true, say: 'Raw, the tools put one function at four addresses. Each picked its own base. Subtract it, and they all agree.', act: m => m.set({ reduce: false }) },
    { t: 'Agreement', home: true, say: 'On the optimised build, every tool that draws a graph finds the same blocks and the same edges.', act: m => m.set({ reduce: true, obj: 1 }) },
    { t: 'One switch, four answers', home: true, say: 'On a jump table, the counts split. Each number has a reason: one tool stopped, two read the table, one left the jump unresolved.', act: m => m.set({ obj: 2 }) },
    { t: 'Invented functions', home: true, say: 'One tool scans every leftover byte and makes functions out of padding and data. Count only what a symbol or a call backs.', act: m => m.set({ obj: 3, sym: false }) },
    { t: 'Four ways to say subtract', home: true, say: 'One instruction lifts four ways. Three write the flags at once; one stores a recipe and computes them only when read.', act: m => m.set({ sym: true, ir: 0 }) },
  ],
  check: [
    { q: 'Tools put a function at 0x10, 0x08000050, 0x400010 and 0x100010. Why?', options: ['Each loader gave .text its own base; the offset is the same', 'The tools disagree about the function', 'The file changed'], answer: 0, why: 'Subtract each base: .text+0x10.', hint: 'Try Compare raw addresses.' },
    { q: 'Four tools give 3, 8, 8 and 9 blocks for one function. What do you report?', options: ['Each count with its reason', 'The average', 'The largest'], answer: 0, why: 'They differ in how far each followed one indirect jump.', hint: 'Try Read block counts as code found.' },
    { q: 'How does VEX handle the flags of a subtraction?', options: ['It stores the operation and operands as a thunk, computed when read', 'It writes every flag at once', 'It ignores them'], answer: 0, why: 'That is why VEX is the shortest of the four.', hint: 'Pick subq in Try it.' },
  ],
  terms: [
    ['Linear sweep', 'Decoding from the first byte to the last, without following jumps.'],
    ['Recursive descent', 'Decoding from known entries, following jumps and calls.'],
    ['Load base', 'The address a tool assigns to a section of an object that has none.'],
    ['IR', 'An intermediate language a tool lifts instructions into.'],
    ['Flag thunk', 'Stored operation and operands from which flags are computed later.'],
    ['Decompiler stages', 'Loader, disassembly, CFG, lifting, SSA, data flow and types, structuring, emission.'],
  ],
  deeper: '<p><b>A short timeline.</b> Decompilation theses in 1973; adb, DEBUG and GDB as debuggers; IDA in 1991; Cifuentes\'s decompiler phases in 1994; the Hex-Rays decompiler in 2007; radare2 in 2009; angr from 2013; Binary Ninja in 2016; Ghidra open-sourced in 2019; rizin forked in 2020.</p><p><b>Three decompilers on grade.</b> Ghidra folded the multiply by 0x66666667 back into a divide by 10; angr left the multiply as it was; radare2\'s pseudo-output kept register names. At -O1 there is no switch left in the bytes for any of them to find.</p><p><b>About this machine.</b> The addresses are reduced live from each tool\'s base; the counts, reasons and IR sizes are from the course\'s captures of five tools on the four objects. Two commercial tools were not run, and nothing here describes their output.</p>',
  code: {
    title: 'Reduce, then compare',
    note: 'Adapted from the course\'s landscape lesson.',
    text: `
BASES = {"objdump": 0x0, "radare2": 0x08000040, "rizin": 0x08000040,
         "angr": 0x400000, "ghidra": 0x100000}

def to_offset(tool, address):
    return address - BASES[tool]            # .text offset, the same in every tool

def compare(captures):
    starts = {t: {to_offset(t, a) for a in c["starts"]} for t, c in captures.items()}
    majority = {a for a in set().union(*starts.values())
                if sum(a in s for s in starts.values()) > len(starts) // 2}
    return {t: {"extra": sorted(s - majority), "missing": sorted(majority - s)}
            for t, s in starts.items()}
`,
  },
};
