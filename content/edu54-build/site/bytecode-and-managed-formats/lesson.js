// Bytecode and managed formats: grade from the student's ledger in five containers (native ELF, CPython pyc, JVM class, WebAssembly, .NET), from the course fixtures.
// Decoded live from their real bytes: the pyc magic word (Python 3.n starts at 2900 + 50n), the JVM tableswitch at pc 4 (offsets relative to the opcode,
// 4-byte aligned operands), the Wasm br_table (uleb count, depths, default; depth d leaves d + 1 blocks), and the CIL switch (targets relative to the next
// instruction, after subtracting 6). The keeps table follows the course's reader output; javac -g / default / -g:none and the Wasm name section change it.
const PYC = { 3495: ['3.11', 80, 31], 3531: ['3.12', 62, 26], 3571: ['3.13', 70, 26], 3627: ['3.14', 96, 35] };
const TOOLS = [['uncompyle6 3.9.3', 1.0, 3.8], ['decompyle3 3.9.3', 3.7, 3.8], ['xdis 6.3.0', 1.0, 3.13], ['pycdc', 1.0, 3.13], ['PyLingual', 3.6, 3.15]];
const JVM = [0xaa, 0, 0, 0, 0, 0, 0, 0x2c, 0, 0, 0, 6, 0, 0, 0, 0x0a, 0, 0, 0, 0x2a, 0, 0, 0, 0x28, 0, 0, 0, 0x26, 0, 0, 0, 0x24, 0, 0, 0, 0x24];
const WASM = [0x0e, 0x0b, 4, 4, 4, 4, 4, 4, 3, 2, 1, 0, 0, 4];
const CIL = [0x45, 5, 0, 0, 0, 8, 0, 0, 0, 6, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0];
const be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) | 0;
const le32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) | 0;
function jvmSwitch(pc, nextBase) {
  let i = 1 + ((4 - ((pc + 1) % 4)) % 4); const def = be32(JVM, i), lo = be32(JVM, i + 4), hi = be32(JVM, i + 8), offs = []; i += 12;
  for (let k = lo; k <= hi; k++, i += 4) offs.push(be32(JVM, i));
  const basis = nextBase ? pc + i : pc;
  return { def: basis + def, lo, hi, targets: offs.map(o => basis + o), len: i, basis };
}
function wasmTable() { let i = 1, n = 0, sh = 0, b; do { b = WASM[i++]; n |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80); const labels = WASM.slice(i, i + n), def = WASM[i + n]; return { n, labels, def }; }
function cilSwitch() { const n = le32(CIL, 1), next = 0x08 + 1 + 4 + 4 * n, t = []; for (let k = 0; k < n; k++) t.push(next + le32(CIL, 5 + 4 * k)); return { n, next, t }; }
const RET_BY_DEPTH = [4, 3, 2, 1, 0];
const COLS = ['Function name', 'Parameter names', 'Types', 'Local names', 'Line numbers', 'Control structure'];
function keeps(c, o) {
  if (c === 0) return [[2, '.symtab'], [0, 'none'], [0, 'none'], [0, 'none'], [0, 'no .debug'], [1, 'jumps + table']];
  if (c === 1) return [[2, 'co_qualname'], [2, 'score'], [0, 'none'], [2, 'bucket'], [2, 'co_linetable'], [1, 'compare + jump pairs']];
  if (c === 2) return [[2, 'constant pool'], o.javac === 0 ? [2, 'LocalVariableTable'] : [0, 'none'], [2, '(I)I'], [0, 'none'], o.javac === 2 ? [0, 'none'] : [2, 'LineNumberTable'], [2, '1 tableswitch']];
  if (c === 3) return [[2, 'Export'], o.names ? [2, 'name section'] : [0, 'none'], [2, '(i32) -> i32'], o.names ? [2, 'name section'] : [0, 'none'], [0, 'none'], [2, 'blocks + br_table']];
  return [[2, 'MethodDef'], [2, 'Param table'], [2, 'int32(int32)'], [0, 'needs a PDB'], [0, 'needs a PDB'], [2, '1 switch']];
}
function signature(c, o) {
  if (c === 0) return 'uint grade(int param_1)\n{ uVar2 = param_1 / 10 - 6; … *(uint *)(&DAT_ + uVar2 * 4) }';
  if (c === 1) return 'def grade(score):\n    bucket = score // 10\n    if bucket >= 9: return 4   # types unknown';
  if (c === 2) return `static int grade(int ${o.javac === 0 ? 'score' : 'i'})\n{ switch (${o.javac === 0 ? 'score' : 'i'} / 10) { case 9: case 10: return 4; … } }`;
  if (c === 3) return o.names ? '(func $grade (param $score i32) (result i32)\n  (local $bucket i32) …)' : '(func $func2 (param $var0 i32) (result i32)\n  (local $var1 i32) …)';
  return 'public static int Grade(int score)\n{ int num = score / 10;   // local name invented\n  switch (num - 6) { … } }';
}

export default {
  slug: 'bytecode-and-managed-formats',
  title: 'Bytecode: what five containers keep',
  description: 'The same small function from the student\'s ledger, in five containers. Decode each one\'s switch and see what each format keeps.',
  overview: 'A bytecode file is a program plus some of the compiler\'s notes about it, and each container keeps different notes. A Python pyc starts with four 32-bit words: a magic number for the interpreter version (3.n starts at 2900 + 50n, so 3627 is 3.14), flags, and either the source time and size or a hash. It keeps every variable name and no types, and its bytecode changes with every release, which is why decompilers have version ceilings: read the magic before you pick a tool. A Java class file keeps a constant pool that names every method and type it touches; parameter names only with javac -g. Its tableswitch holds the whole switch in one instruction: operands padded to a multiple of four, then default, low, high and one offset per case, each relative to the opcode itself, not the next instruction. A WebAssembly module keeps the control structure by construction (nested blocks and a br_table of depths) and loses names unless a name section is kept. A .NET assembly keeps parameter names in its metadata tables and needs a separate PDB file for local names; its switch targets count from the next instruction. Native code keeps none of these. When a decompiler prints a name, ask whether the container stored it or the tool made it up.',
  keywords: ['bytecode', 'Python pyc', 'JVM class file', 'WebAssembly', '.NET CIL', 'decompilation', 'reverse engineering'],
  orient: 'landscape',
  view: { target: [-0.8, 0.25, 0], dir: [0.35, 0.95, 1.3], half: 1.05, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { c: 2, py: 3627, javac: 0, names: true, nextBase: false, blind: false }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the switch, decoded: twelve buckets (score / 10 = 0..10, then out of range), each a tower as tall as the grade it returns; coral if wrong */
    const BX = k => -2.75 + k * 0.17;
    const bins = Array.from({ length: 12 }, (_, i) => { const t = P.tower(0.13, 0.22, GOOD); t.position.set(BX(i), 0, -0.45); t.userData.set({ cap: '' }); S.add(t); return t; });
    const bp = P.box(12 * 0.17 + 0.1, 0.03, 0.36, '#FFFFFF', { r: 0.02 }); bp.position.set(BX(5.5), 0, -0.45); S.add(bp);
    /* what each container keeps: a column per container (native, pyc, JVM, Wasm, .NET), a block per kind of information, tall green kept, middle gold partly, low red gone */
    const CN = ['Native', 'pyc', 'JVM', 'Wasm', '.NET'], MX = j => -0.4 + j * 0.34, MZ = i => -0.65 + i * 0.26;
    const cells = COLS.map((_, i) => CN.map((__, j) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.26, 1, 0.2, '#fff', { r: 0.02, material: mm }); b.position.set(MX(j), 0.03, MZ(i)); S.add(b); return { mm, b }; }));
    const mp = P.box(5 * 0.34 + 0.1, 0.03, COLS.length * 0.26 + 0.1, '#FFFDF5', { r: 0.03 }); mp.position.set(MX(2), 0, MZ((COLS.length - 1) / 2)); S.add(mp);
    const sel = P.box(0.32, 0.02, COLS.length * 0.26 + 0.12, '#fff', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#F2AE0C' }) }); S.add(sel);
    /* Python decompilers: a block each, lit if it reads this pyc's Python version */
    const tools = TOOLS.map((t, i) => { const l = P.lamp('#C9C4B6', { h: 0.3, r: 0.08 }); l.position.set(-2.6 + i * 0.38, 0, 0.55); S.add(l); return l; });
    S.add(P.keep(-2.9, 1.35, 0.9, -0.85, 0.85));

    let J = null, info = '';
    function draw() {
      const names = ['ELF object, clang -O0', 'CPython pyc', 'JVM class', 'WebAssembly', '.NET assembly'];
      let vals = new Array(12).fill(null), txt = '', bad = false;
      if (st.c === 2) {
        J = jvmSwitch(4, st.nextBase); const inMethod = J.targets.every(t => t < 50) && J.def < 50;
        txt = `aa at pc 4, padding to pc 8\ndefault ${J.def}, low ${J.lo}, high ${J.hi}\noffsets from pc ${J.basis}${st.nextBase ? ' (the next instruction)' : ' (the opcode)'}:\n${J.targets.map((t, k) => `case ${J.lo + k} → ${t}`).join(', ')}\n${inMethod ? 'cases 9 and 10 share 40' : 'targets past the end of the 50-byte method'}`; bad = !inMethod;
        const byT = { 40: 4, 42: 3, 44: 2, 46: 1, 48: 0 }; for (let k = 0; k < 12; k++) { const t = k >= J.lo && k <= J.hi ? J.targets[k - J.lo] : J.def; vals[k] = byT[t] ?? '?'; }
      } else if (st.c === 3) {
        const W = wasmTable(); txt = `0e br_table, count ${W.n} (uleb)\ndepths ${W.labels.join(' ')}, default ${W.def}\ndepth d leaves d + 1 blocks:\n0 → 4, 1 → 3, 2 → 2, 3 → 1, 4 → 0`;
        for (let k = 0; k < 12; k++) vals[k] = RET_BY_DEPTH[k < W.n ? W.labels[k] : W.def];
      } else if (st.c === 4) {
        const C = cilSwitch(); txt = `ldc.i4.6; sub; then 45 switch, ${C.n} targets\nrelative to IL_${C.next.toString(16).padStart(4, '0')}, the next instruction:\n${C.t.map(t => 'IL_' + t.toString(16).padStart(4, '0')).join(', ')}\nbucket 6 → first target`;
        const byT = { 0x29: 1, 0x27: 2, 0x25: 3, 0x23: 4 }; for (let k = 0; k < 12; k++) { const i = k - 6; vals[k] = i >= 0 && i < C.n ? byT[C.t[i]] : 0; }
      } else if (st.c === 1) {
        const w = st.py, lo = w & 255, hi = w >> 8, n = Math.floor((w - 2900) / 50), P0 = PYC[w];
        txt = `header: ${lo.toString(16)} ${hi.toString(16)} 0d 0a | flags | mtime | size\nmagic word ${w} = 2900 + 50 × ${n} + ${w - 2900 - 50 * n}\n→ Python 3.${n}\ngrade: ${P0[1]} code bytes, ${P0[2]} instructions\nno switch: compare + jump pairs`;
        for (let k = 0; k < 12; k++) vals[k] = k >= 9 && k <= 10 ? 4 : k >= 6 && k <= 8 ? k - 5 : 0;
      } else {
        txt = 'cmp $4; ja default; leaq table(%rip);\nmovslq (%rcx,%rax,4); add; jmp *%rax\nthe targets live in .rela.rodata,\nfive relocations in another section';
        for (let k = 0; k < 12; k++) vals[k] = k >= 9 && k <= 10 ? 4 : k >= 6 && k <= 8 ? k - 5 : 0;
      }
      const want = k => k >= 9 && k <= 10 ? 4 : k >= 6 && k <= 8 ? k - 5 : 0;
      bins.forEach((b, k) => { const v = vals[k], ok = v === want(k); b.userData.set({ h: 0.04 + (typeof v === 'number' ? v : 2) * 0.12, color: ok ? GOOD : BAD }); });
      cells.forEach((row, i) => row.forEach((c, j) => { const k = keeps(j, st)[i][0]; c.mm.color.set([RED, SAF, GOOD][k]); c.b.scale.y = [0.05, 0.15, 0.28][k]; }));
      sel.position.set(MX(st.c), 0.01, MZ((COLS.length - 1) / 2));
      const ver = parseFloat(PYC[st.py][0]);
      tools.forEach((l, i) => { const [n, a, b2] = TOOLS[i], ok = ver >= a && ver <= b2 + 1e-9; l.visible = st.c === 1; l.userData.set({ color: st.blind && i === 3 ? RED : ok ? GOOD : '#9A968C', on: ok || (st.blind && i === 3) }); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Container', options: ['Native', 'pyc', 'JVM', 'Wasm', '.NET'], get: () => st.c, act: i => set({ c: i }) },
      { type: 'buttons', label: 'Python that wrote the pyc', options: ['3.11', '3.12', '3.13', '3.14'], get: () => [3495, 3531, 3571, 3627].indexOf(st.py), act: i => set({ py: [3495, 3531, 3571, 3627][i] }) },
      { type: 'buttons', label: 'javac build', options: ['-g', 'default', '-g:none'], get: () => st.javac, act: i => set({ javac: i }) },
      { type: 'toggle', label: 'Keep the Wasm name section', short: 'Names', get: () => st.names, set: v => set({ names: !!v }) },
    ];
    const readouts = [
      { label: 'Kept', get: () => { const k = keeps(st.c, st).filter(x => x[0] === 2).length; return { v: `${k} of 6`, sub: CN[st.c] }; } },
      { label: 'Switch decode', get: () => { const ok = !(st.c === 2 && st.nextBase); return { v: ok ? 'matches' : 'off the end', sub: 'all 12 buckets', good: ok, bad: !ok }; } },
      { label: 'pyc magic', get: () => ({ v: String(st.py), sub: `Python ${PYC[st.py][0]}` }) },
    ];
    const labels = [
      { name: 'sw', t: 'The switch, decoded', d: 'Twelve buckets of score / 10, each as tall as the grade the decoded table returns; coral where it disagrees with the source. For a pyc, the lamps in front are Python decompilers that can read its version', icon: 'code', atV: V(BX(0) - 0.12, 0.2, -0.45) },
      { name: 'keeps', t: 'What each keeps', d: 'Columns: native, pyc, JVM, Wasm, .NET (gold base: the chosen one). Rows: kinds of information; tall green kept, gold partly, low red gone', icon: 'layers', atV: V(MX(4) + 0.2, 0.3, MZ(0)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Pick a decompiler without reading the magic', hint: '3.14 file, 3.13 tool', on: () => set({ ...D0, c: 1, blind: true }), off: reset },
      { label: 'Measure Java branches from the next instruction', hint: 'the x86 habit', on: () => set({ ...D0, c: 2, nextBase: true }), off: reset },
      { label: 'Build the class without -g', hint: 'names gone', on: () => set({ ...D0, c: 2, javac: 2 }), off: reset },
      { label: 'Strip the Wasm name section', hint: 'func2, var0', on: () => set({ ...D0, c: 3, names: false }), off: reset },
    ];
    function status() {
      if (st.blind && st.c === 1) return { ok: false, msg: `<b>pycdc reads opcode tables up to 3.13, the file says ${st.py} (Python ${PYC[st.py][0]}), so it prints "Unsupported opcode" and the output looks obfuscated.</b> The file isn't obfuscated; the tool is out of date. The first two bytes give the version: 3.n starts at 2900 + 50n. ${TOOLS.filter(t => parseFloat(PYC[st.py][0]) <= t[2]).map(t => t[0]).join(' and ') || 'No listed tool'} can read it.` };
      if (st.nextBase && st.c === 2) return { ok: false, msg: `<b>Measured from the next instruction (pc ${J.basis}), every tableswitch target lands past the end of the 50-byte method.</b> JVM branch offsets are relative to the address of the branch opcode itself (pc 4): default 4 + 44 = 48, case 6 → 46, cases 9 and 10 → 40. x86 displacements and CIL switch targets count from the next instruction; the JVM does not.` };
      if (st.c === 2 && st.javac !== 0) return { ok: false, msg: `<b>Without -g, the class keeps no LocalVariableTable${st.javac === 2 ? ' and no line numbers' : ''}, so a decompiler prints grade(int i): the name is made up.</b> The 50 bytes of code are identical in all three builds. Types survive in the descriptor (I)I either way. Treat a parameter name in the output as stored only when the table was there.` };
      if (st.c === 3 && !st.names) return { ok: false, msg: '<b>Without the name section, the module calls grade func2 (it is still exported as "grade") and its parameter var0.</b> WebAssembly keeps the structure by construction (six blocks and a br_table) and the types (i32) -> i32; the names are an optional custom section.' };
      const K = keeps(st.c, st);
      return { ok: true, msg: `<b>${CN[st.c]}: ${st.c >= 2 ? 'the switch decodes back to' : 'the code returns'} grades 0, 1, 2, 3, 4, 4 for buckets 5 to 10, and the container keeps ${K.filter(k => k[0] === 2).length} of 6 notes.</b> ${st.c === 0 ? 'Native code keeps only the symbol name; everything else a decompiler prints is inferred.' : st.c === 1 ? `Every name, no types. Python ${PYC[st.py][0]}'s grade is ${PYC[st.py][1]} bytes of bytecode.` : st.c === 2 ? 'One tableswitch holds the whole switch; offsets count from the opcode.' : st.c === 3 ? 'br_table depths 4, 3, 2, 1, 0 pick how many blocks to leave.' : 'Parameter names are in the metadata; local names need a PDB.'}` };
    }
    return { update: dt => bins.forEach(b => b.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One function, five containers', home: true, say: 'The same small grading function, compiled to native code, Python, Java, WebAssembly and dot NET. Each keeps a different part of the compiler\'s notes.', act: m => m.set({ c: 0, py: 3627, javac: 0, names: true, nextBase: false, blind: false }) },
    { t: 'Read the version first', home: true, say: 'A Python file starts with a magic number for the interpreter version. Read it before choosing a decompiler; most stop at an older version.', act: m => m.set({ c: 1 }) },
    { t: 'One instruction for a switch', home: true, say: 'In Java, one instruction holds the whole switch. Its jumps count from the instruction itself.', act: m => m.set({ c: 2 }) },
    { t: 'Names on request', home: true, say: 'Build the Java class without debug tables, and the parameter name is gone. The code is byte for byte the same.', act: m => m.set({ javac: 2 }) },
    { t: 'Structure kept, names optional', home: true, say: 'WebAssembly keeps nested blocks and a table of depths. Names live in an optional section.', act: m => m.set({ javac: 0, c: 3 }) },
    { t: 'Stored or invented', home: true, say: 'Dot NET keeps parameter names in its tables, but local names need a separate file. When a decompiler prints a name, ask where it came from.', act: m => m.set({ c: 4 }) },
  ],
  check: [
    { q: 'A pyc starts 2b 0e 0d 0a. Which Python wrote it?', options: ['3.14: the word is 3627 = 2900 + 50 × 14 + 27', '3.11', 'It is obfuscated'], answer: 0, why: 'Read the magic before picking a tool.', hint: 'Try Pick a decompiler without reading the magic.' },
    { q: 'A JVM tableswitch at pc 4 has default offset 44. Where is the default?', options: ['pc 48: offsets count from the opcode', 'pc 80, from the next instruction', 'pc 44'], answer: 0, why: 'JVM branches are relative to the branch opcode.', hint: 'Try Measure Java branches from the next instruction.' },
    { q: 'A .NET decompiler prints a local called num. Where did the name come from?', options: ['The decompiler made it up, unless a PDB was present', 'The metadata tables', 'The source'], answer: 0, why: 'Parameter names are stored; local names need a PDB.', hint: 'Pick .NET.' },
  ],
  terms: [
    ['Bytecode', 'Instructions for a virtual machine instead of a processor.'],
    ['Magic number', 'The first bytes that identify a file\'s format and version.'],
    ['Constant pool', 'The class file\'s table of names, types and constants.'],
    ['tableswitch', 'The JVM instruction for a dense switch.'],
    ['br_table', 'The WebAssembly branch that picks a block depth by index.'],
    ['PDB', 'The separate debug file that holds .NET local names.'],
  ],
  deeper: '<p><b>Inside the pyc.</b> After the header, marshal writes the code object field by field: counts, flags, the bytecode, constants, names, then the line table. From 3.11 the bytecode carries inline cache entries for the specialising interpreter.</p><p><b>Verified stacks.</b> A class file keeps a StackMapTable in every build, because the verifier needs it; that is why Java decompilers recover types so reliably.</p><p><b>ECMA-335.</b> A .NET assembly is a PE file whose CLI header points at metadata tables (TypeDef, MethodDef, Param) and string heaps; each method\'s RVA leads to its IL.</p><p><b>About this machine.</b> The switch bytes and pyc magic numbers are the course fixtures\', decoded live; the keeps table follows the course readers\' output for each container.</p>',
  code: {
    title: 'Decode a tableswitch',
    note: 'Adapted from the course\'s bytecode lesson.',
    text: `
import struct

def tableswitch(code, pc):
    i = pc + 1
    i += (4 - i % 4) % 4                       # operands start on a 4-byte boundary
    default, low, high = struct.unpack_from(">iii", code, i); i += 12
    offsets = struct.unpack_from(f">{high - low + 1}i", code, i)
    # every offset is relative to the opcode at pc, not the next instruction
    return pc + default, {low + k: pc + o for k, o in enumerate(offsets)}

def pyc_version(header):
    word = int.from_bytes(header[:2], "little")
    return f"3.{(word - 2900) // 50}"          # 3.n starts at 2900 + 50n
`,
  },
};
