// Program anatomy, ELF from scratch: a student at a coding bootcamp in Lagos inspects the object file of their own program, ledger.o (x86-64, little-endian).
// The layout (976 bytes) follows the ELF64 rules: a 64-byte header at 0; .text at 0x40 (0x50 bytes: percent_change at +0x00, size 0x10; total at +0x10, size 0x40);
// .rodata at 0x90 (0x20, a jump table); .symtab at 0xb0 (6 entries × 24 bytes); .strtab at 0x140 (symbol names); .rela.text at 0x170 (1 entry × 24);
// .shstrtab at 0x188 (section names); the section header table at e_shoff 0x1d0 (8 × 64 bytes). An object file has no program headers (e_phnum 0).
// In total there is a call at .text+0x2a: e8 00 00 00 00. Its 4 zero bytes are filled at link time by relocation R_X86_64_PLT32 log_value − 4 at offset 0x2b.
// File offset of a symbol in a .o = the section's sh_offset + st_value; st_value alone is an offset within the section.
const REG = [
  { n: 'ELF header', a: 0x000, s: 0x40, c: '#2C2D31' },
  { n: '.text', a: 0x040, s: 0x50, c: '#1F9E89' },
  { n: '.rodata', a: 0x090, s: 0x20, c: '#C9A227' },
  { n: '.symtab', a: 0x0b0, s: 0x90, c: '#5B8DB8' },
  { n: '.strtab', a: 0x140, s: 0x30, c: '#7B6FA8' },
  { n: '.rela.text', a: 0x170, s: 0x18, c: '#E07A5F' },
  { n: '.shstrtab', a: 0x188, s: 0x48, c: '#9C6FA0' },
  { n: 'section headers', a: 0x1d0, s: 0x200, c: '#8E8C84' },
];
const SYMS = [
  { n: 'percent_change', v: 0x00, size: 0x10 },
  { n: 'total', v: 0x10, size: 0x40 },
];
const TOTAL = 0x3d0, COLS = 16, B = 8;
const hex = n => `0x${n.toString(16).padStart(3, '0')}`;
function run(st) {
  const sym = SYMS[st.sym], text = REG[1];
  const off = st.offset ? text.a + sym.v : sym.v;
  const inside = REG.find(r => off >= r.a && off < r.a + r.s);
  const callAt = text.a + 0x2a;
  return { sym, off, end: off + sym.size, inside, callAt };
}

export default {
  slug: 'program-anatomy-elf-from-scratch',
  title: 'Inside an object file: tables that point at tables',
  description: 'A Lagos bootcamp student opens the object file of their own program and finds every byte a home: header, code, symbols, names, relocations.',
  overview: 'Reverse engineering starts with knowing what a compiled file is, and with permission: practise on programs you wrote or are authorised to examine. An ELF file is tables that point at tables. A 64-byte header names the machine and gives the offset of the section header table; each section header gives a section\'s name (as an offset into the section-name string table), type, file offset and size. .text holds machine code, .rodata constants such as a switch\'s jump table, .symtab the symbols: each with binding, type, the section it lives in, a value and a size. Symbol names are offsets into a different string table, .strtab; mixing up the two string tables gives nonsense names. In an object file (.o), a symbol\'s value is an offset within its section, so its bytes in the file are at the section\'s offset plus the value. Where the compiler didn\'t know an address, such as a call to a function in another file, it leaves zeros and a relocation entry saying what the linker must write there: R_X86_64_PLT32 log_value − 4 at the call\'s operand. A linked executable adds program headers, the loader\'s view of what to map into memory; an object file has none. Mach-O on macOS uses the same ideas with different structures.',
  keywords: ['ELF format', 'object file', 'symbol table', 'relocation', 'reverse engineering', 'section headers', 'binary analysis'],
  orient: 'landscape',
  view: { target: [-0.2, 0.2, 0.0], dir: [0.3, 1.0, 1.2], half: 1.3, wide: 4.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sym: 0, offset: true, reloc: true, strtab: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the byte map: one tile per 8 bytes of ledger.o, row by row, coloured by section; the symbol's bytes rise gold, the call instruction red */
    const X0 = -1.9, TW = 0.2, TZ = 0.2, Z0 = -0.75, NT = TOTAL / B;
    const pad = P.box(COLS * TW + 0.12, 0.03, Math.ceil(NT / COLS) * TZ + 0.12, '#FFFFFF', { r: 0.03 }); pad.position.set(X0 + COLS * TW / 2, 0, Z0 + (Math.ceil(NT / COLS) - 1) * TZ / 2); S.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NT); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const tileAt = a => { const i = Math.floor(a / B); return V(X0 + (i % COLS + 0.5) * TW, 0.03, Z0 + Math.floor(i / COLS) * TZ); };
    /* rods: the relocation from .rela.text to the call; the symbol's name link from .symtab to its string table */
    const rod = c => { const mm = new THREE.MeshLambertMaterial({ color: c }), r = P.box(1, 0.04, 0.04, '#fff', { r: 0.01, material: mm }); r.userData.noFit = true; S.add(r); return { r, mm }; };
    const relRod = rod('#E07A5F'), nameRod = rod('#7B6FA8');
    const link = (o, A, Bp, y) => { const d = Bp.clone().sub(A), len = Math.hypot(d.x, d.z); o.r.scale.x = Math.max(0.01, len); o.r.position.set((A.x + Bp.x) / 2, y, (A.z + Bp.z) / 2); o.r.rotation.y = -Math.atan2(d.z, d.x); };
    const lamp = P.lamp(GOOD, { h: 0.6, r: 0.12 }); lamp.position.set(X0 + COLS * TW + 0.35, 0, Z0 + 0.2); S.add(lamp);
    S.add(P.keep(X0 - 0.1, X0 + COLS * TW + 0.55, 0.9, Z0 - 0.15, Z0 + Math.ceil(NT / COLS) * TZ));

    let R = null;
    function draw() {
      R = run(st);
      for (let i = 0; i < NT; i++) {
        const a = i * B, r = REG.find(g => a >= g.a && a < g.a + g.s), hit = a + B > R.off && a < R.end, call = a <= R.callAt && R.callAt < a + B;
        const p = tileAt(a); dummy.position.copy(p); dummy.scale.set(TW * 0.86, hit ? 0.26 : call ? 0.18 : 0.06, TZ * 0.8); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(hit ? SAF : call ? '#B5462F' : r ? r.c : '#D9D4C7'));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      relRod.r.visible = !!st.reloc; link(relRod, tileAt(0x170), tileAt(R.callAt), 0.25);
      link(nameRod, tileAt(0x0b0 + 24 * (st.sym + 1)), tileAt(st.strtab ? 0x140 : 0x188), 0.32); nameRod.mm.color.set(st.strtab ? '#7B6FA8' : RED);
      lamp.userData.set({ color: R.inside.n === '.text' && st.reloc && st.strtab ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Symbol', options: SYMS.map(s => s.n), get: () => st.sym, act: i => set({ sym: i }) },
      { type: 'toggle', label: 'Add the section\'s offset to st_value', short: 'Section offset', get: () => st.offset, set: v => set({ offset: !!v }) },
      { type: 'toggle', label: 'Apply relocations', short: 'Relocations', get: () => st.reloc, set: v => set({ reloc: !!v }) },
      { type: 'toggle', label: 'Names from .strtab', short: '.strtab', get: () => st.strtab, set: v => set({ strtab: !!v }) },
    ];
    const readouts = [
      { label: 'Function bytes at', get: () => ({ v: hex(R.off), sub: `in ${R.inside.n}`, good: R.inside.n === '.text', bad: R.inside.n !== '.text' }) },
      { label: 'Call target', get: () => ({ v: st.reloc ? 'log_value' : 'next instr.', sub: st.reloc ? 'via relocation' : 'zeros read literally', bad: !st.reloc }) },
      { label: 'Program headers', get: () => ({ v: '0', sub: 'object files have none' }) },
    ];
    const labels = [
      { name: 'map', t: 'Every byte of ledger.o', d: 'A tile per 8 bytes, row by row: dark header, teal .text, gold .rodata, blue .symtab, purple .strtab, coral .rela.text, grey section headers. Raised gold: the symbol\'s bytes', icon: 'layers', atV: V(X0 - 0.1, 0.05, Z0 + 0.4) },
      { name: 'read', t: 'Links between tables', d: 'Coral rod: the relocation that fills the call (red tile). Purple rod: where the symbol\'s name is read from (red if the wrong table). Lamp: all read right', icon: 'code', atV: V(X0 + COLS * TW + 0.5, 0.6, Z0 + 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'st_value as a file offset', hint: 'forget the section\'s offset', on: () => set({ ...D0, offset: false }), off: reset },
      { label: 'Read the zeros literally', hint: 'ignore the relocation', on: () => set({ ...D0, reloc: false }), off: reset },
      { label: 'The wrong string table', hint: 'symbol names from .shstrtab', on: () => set({ ...D0, strtab: false }), off: reset },
    ];
    function status() {
      if (!st.offset) return { ok: false, msg: `<b>Read as a file offset, ${R.sym.n}'s value ${hex(R.sym.v)} points into the ${R.inside.n}, not at its code.</b> In an object file a symbol's value is an offset within its section. Add the section header's sh_offset: ${hex(REG[1].a)} + ${hex(R.sym.v)} = ${hex(REG[1].a + R.sym.v)}.` };
      if (!st.reloc) return { ok: false, msg: '<b>Read literally, e8 00 00 00 00 calls the very next instruction.</b> The compiler didn\'t know where log_value would be, so it left zeros and a relocation saying what to write there: R_X86_64_PLT32 against log_value, addend −4, at the operand\'s offset. Apply relocations before reading targets.' };
      if (!st.strtab) return { ok: false, msg: `<b>Symbol names looked up in the section-name table come out as "${['.rela.text', '.symtab'][st.sym]}".</b> ELF has two string tables: .shstrtab for section names (pointed to by the header's e_shstrndx) and .strtab for symbol names (pointed to by .symtab's sh_link). Use the one each table links to.` };
      return { ok: true, msg: `<b>${R.sym.n} is bytes ${hex(R.off)}–${hex(R.end - 1)} of .text, and total's call goes to log_value once linked.</b> The header points to the section table; the section table gives each section's place and name; the symbol table gives each function's section, offset and size; the relocation table says what fills each placeholder.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Your own program', home: true, say: 'A student at a coding bootcamp in Lagos opens the object file of their own small program. Every one of its 976 bytes belongs to a table, and the tables point at each other.', act: m => m.set({ sym: 0, offset: true, reloc: true, strtab: true }) },
    { t: 'Header to sections', home: true, say: 'The 64-byte header gives the offset of the section table. Each section header gives a section\'s name, place and size: code, constants, symbols, names, relocations.', act: m => m.set({ sym: 0 }) },
    { t: 'Where is the function?', home: true, say: 'The symbol table says percent change is in the code section at offset zero, sixteen bytes long. Add the code section\'s own offset to find its bytes in the file.', act: m => m.set({ offset: true }) },
    { t: 'An offset within a section', home: true, say: 'Read the symbol\'s value as a file offset instead, and you land in the file header. In an object file, values are relative to their section.', act: m => m.set({ offset: false }) },
    { t: 'Zeros that mean something', home: true, say: 'A call in total reads e8 and four zeros. The relocation table explains: the linker will write the distance to log value there.', act: m => m.set({ offset: true, sym: 1, reloc: true }) },
    { t: 'Two string tables', home: true, say: 'Symbol names and section names live in different string tables. Use the wrong one, and functions get section names.', act: m => m.set({ strtab: false }) },
  ],
  check: [
    { q: 'In an object file, what is a function symbol\'s st_value?', options: ['Its offset within its section', 'Its file offset', 'Its memory address'], answer: 0, why: 'Add the section\'s sh_offset for the file offset.', hint: 'Try st_value as a file offset.' },
    { q: 'Why does a call in a .o read e8 00 00 00 00?', options: ['The target isn\'t known yet; a relocation says what the linker writes there', 'It calls the next instruction', 'It is corrupt'], answer: 0, why: 'R_X86_64_PLT32 log_value − 4.', hint: 'Try Read the zeros literally.' },
    { q: 'Where do symbol names come from?', options: ['.strtab, the table .symtab links to', '.shstrtab', 'The ELF header'], answer: 0, why: '.shstrtab holds section names.', hint: 'Try The wrong string table.' },
  ],
  terms: [
    ['ELF', 'The executable and linkable format used on Linux for object files and programs.'],
    ['Section header', 'An entry giving a section\'s name, type, file offset and size.'],
    ['Symbol', 'A named thing (function, variable) with its section, value and size.'],
    ['Relocation', 'An instruction to the linker: write this symbol\'s address here.'],
    ['String table', 'A block of null-terminated names that other tables point into.'],
    ['Program header', 'The loader\'s view of what to map into memory; present in linked programs.'],
  ],
  deeper: '<p><b>Authorisation first.</b> Inspect programs you wrote or have explicit permission to analyse; laws on reverse engineering differ by country and licence.</p><p><b>Linked programs.</b> After linking, symbol values become addresses, relocations are applied, and program headers tell the loader which file ranges to map where. Converting an address back to a file offset goes through those headers.</p><p><b>Mach-O.</b> macOS uses load commands, segments and sections with the same ideas: a header, tables of where things are, symbols and relocations.</p><p><b>About this machine.</b> The layout is a faithful small ELF64 object built from the offsets in the file header; tools such as readelf and llvm-objdump print the same tables for a real file.</p>',
  code: {
    title: 'Find a function\'s bytes in an object file',
    note: 'Adapted from the course\'s ELF lesson; standard library only.',
    text: `
import struct

data = open("ledger.o", "rb").read()
e_shoff, = struct.unpack_from("<Q", data, 0x28)
e_shentsize, e_shnum, e_shstrndx = struct.unpack_from("<HHH", data, 0x3a)

def section(i):
    name, typ, flags, addr, off, size, link, info, align, entsize = \\
        struct.unpack_from("<IIQQQQIIQQ", data, e_shoff + i * e_shentsize)
    return dict(name=name, type=typ, off=off, size=size, link=link, entsize=entsize)

secs = [section(i) for i in range(e_shnum)]
symtab = next(s for s in secs if s["type"] == 2)          # SHT_SYMTAB
strtab = secs[symtab["link"]]                             # names for symbols
for k in range(symtab["size"] // 24):
    st_name, st_info, st_other, st_shndx, st_value, st_size = \\
        struct.unpack_from("<IBBHQQ", data, symtab["off"] + k * 24)
    if st_info & 0xf == 2:                                 # STT_FUNC
        start = secs[st_shndx]["off"] + st_value           # section offset + value
        print(name_at(data, strtab["off"] + st_name), hex(start), st_size)
`,
  },
};
