// Recovering data and types: struct account from the student's account.c, recovered from the accesses in the real listings (-O0, -O1, -O2, x86-64),
// then compared with the layout DWARF records. Each access gives an offset (the displacement), a width (the mnemonic suffix) and sometimes a kind
// (movsbl/movswl signed, cvtsi2sdl signed int, mulsd double; an 8-byte value later used as an address is a pointer). Stride evidence: shlq $5 (scale),
// addq $0x20 in a loop (loop step), call sites 0x20 apart, and at -O2 eight loads 32 apart in a loop stepping 256, which fold back to one field (unrolled 8×).
// The System V rules (each member at the lowest offset with its alignment; size a multiple of the strictest alignment) give 32 bytes in source order, 24 sorted.
const DW = [['kind', 'char', 1, 1], ['balance', 'int', 4, 4], ['code', 'short', 2, 2], ['rate', 'double', 8, 8], ['label', 'const char *', 8, 8]];
const DWOFF = [0, 4, 8, 16, 24];
function layout(members, aligned) {
  let off = 0, al = 1; const out = [];
  members.forEach(([n, t, sz, a]) => { const A = aligned ? a : 1; off = Math.ceil(off / A) * A; out.push({ n, t, off, sz }); off += sz; al = Math.max(al, A); });
  return { fields: out, size: Math.ceil(off / al) * al };
}
// [function, instruction, offset, width, kind, loop] ; kind: s signed int, i int (sign unknown), f float, q 8 bytes; ptr: the use that makes it a pointer
const ACC = [
  [['bump', 'addl 0x4(%rax), %ecx', 4, 4, 'i'], ['bump', 'movl %ecx, 0x4(%rax)', 4, 4, 'i'], ['sum_balances', 'movl 0x4(%rax), %eax', 4, 4, 'i'], ['tag', 'movsbl (%rax), %eax', 0, 1, 's'], ['tag', 'movswl 0x8(%rax), %ecx', 8, 2, 's'], ['projected', 'cvtsi2sdl 0x4(%rax), %xmm0', 4, 4, 's'], ['projected', 'mulsd 0x10(%rax), %xmm0', 16, 8, 'f'], ['label_length', 'movq 0x18(%rax), %rax', 24, 8, 'q', 0, 'cmpb $0x0, (%rax,%rcx)']],
  [['bump', 'addl 0x4(%rdi), %eax', 4, 4, 'i'], ['bump', 'movl %eax, 0x4(%rdi)', 4, 4, 'i'], ['sum_balances', 'addl 0x4(%rdi,%rdx), %eax', 4, 4, 'i'], ['tag', 'movswl 0x8(%rdi), %ecx', 8, 2, 's'], ['tag', 'cmpb $0x6c, (%rdi)', 0, 1, 'i'], ['projected', 'cvtsi2sdl 0x4(%rdi), %xmm0', 4, 4, 's'], ['projected', 'mulsd 0x10(%rdi), %xmm0', 16, 8, 'f'], ['label_length', 'movq 0x18(%rdi), %rcx', 24, 8, 'q', 0, 'cmpb $0x0, (%rcx); leaq 0x1(%rcx)']],
  [['bump', 'addl 0x4(%rdi), %eax', 4, 4, 'i'], ['bump', 'movl %eax, 0x4(%rdi)', 4, 4, 'i'], ...[4, 36, 68, 100, 132, 164, 196, 228].map(o => ['sum_balances', `movd ${o === 228 ? '(%rax)' : `-0x${(228 - o).toString(16)}(%rax)`}, %xmm`, o, 4, 'i', 1]), ['sum_balances', 'addl (%rdx), %eax', 4, 4, 'i', 2], ['tag', 'movswl 0x8(%rdi), %ecx', 8, 2, 's'], ['tag', 'cmpb $0x6c, (%rdi)', 0, 1, 'i'], ['projected', 'cvtsi2sdl 0x4(%rdi), %xmm0', 4, 4, 's'], ['projected', 'mulsd 0x10(%rdi), %xmm0', 16, 8, 'f'], ['label_length', 'movq 0x18(%rdi), %rcx', 24, 8, 'q', 0, 'cmpb $0x0, (%rcx); leaq 0x1(%rcx)']],
];
const STRIDE = [[['scale', 32, 'shlq $0x5, %rcx'], ['call-site', 32, 'main passes rows, rows+0x20, rows+0x40']], [['loop-step', 32, 'addq $0x20, %rdx']], [['loop-step', 256, 'addq $0x100, %rax'], ['scale', 32, 'shlq $0x5, %rdx'], ['loop-step', 32, 'addq $0x20, %rdx']]];
const LOOPSTEP = { 1: 256 };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function recover(lv, o) {
  let acc = ACC[lv].filter(a => o.all || a[0] === 'bump').map(a => ({ fn: a[0], ins: a[1], off: a[2], w: a[3], k: a[4], loop: a[5] || 0, ptr: a[6] }));
  const ev = o.all ? STRIDE[lv].slice() : [];
  if (o.fold) {
    const groups = {}; acc.forEach(a => { if (a.loop) (groups[a.loop] = groups[a.loop] || []).push(a); });
    Object.entries(groups).forEach(([L, g]) => {
      const offs = [...new Set(g.map(a => a.off))].sort((a, b) => a - b); if (offs.length < 2) return;
      const d = offs.slice(1).reduce((m, x, i) => gcd(m, x - offs[i]), 0), step = LOOPSTEP[L];
      if (step && step === offs.length * d) { g.forEach(a => { a.off = offs[0] + ((a.off - offs[0]) % d); a.folded = true; }); ev.push(['offset-delta', d, `${offs.length} loads ${d} apart`], ['unrolled', d, `step ${step} = ${offs.length} × ${d}`]); }
    });
  }
  const F = {};
  acc.forEach(a => { const f = F[a.off] || (F[a.off] = { off: a.off, w: 0, kinds: new Set(), ev: [] }); f.w = Math.max(f.w, a.w); f.kinds.add(a.k); f.ev.push(`${a.fn}: ${a.ins}`); if (a.ptr && o.use) { f.ptr = a.ptr; } });
  const fields = Object.values(F).sort((a, b) => a.off - b.off).map(f => ({ ...f, kind: f.ptr ? 'pointer' : f.kinds.has('f') ? `f${f.w * 8}` : f.kinds.has('s') ? `i${f.w * 8} signed` : f.w === 8 ? '8 bytes' : `i${f.w * 8}` }));
  const stride = ev.length ? ev.map(e => e[1]).reduce(gcd) : 0, end = fields.length ? Math.max(...fields.map(f => f.off + f.w)) : 0;
  return { fields, ev, stride, end, size: stride && stride >= end ? stride : null };
}
function compare(R) {
  return DW.map(([n, t, sz], i) => { const f = R.fields.find(x => x.off === DWOFF[i]); if (!f) return { n, t, st: 'missing', note: 'no access' }; if (f.w !== sz) return { n, t, st: 'bad', note: `width ${f.w}` }; const ok = t === 'const char *' ? f.kind === 'pointer' : t === 'double' ? f.kind === 'f64' : /signed/.test(f.kind); return { n, t, st: ok ? 'ok' : 'weak', note: f.kind }; });
}

export default {
  slug: 'recovering-data-and-types',
  title: 'Recovering a struct from the code that touches it',
  description: 'Five small functions read and write one struct. From their accesses alone, the student rebuilds its layout, then checks it against DWARF.',
  overview: 'A decompiler prints a->balance when it has a type table and *(int *)(param_1 + 4) when it doesn\'t. Without the table, the instructions still say a lot. A member access is a base register plus a displacement: the displacement is the field\'s offset and the instruction\'s size suffix is its width. Some instructions also give a kind: a sign-extending byte or word load means a signed integer, a convert-from-integer means a signed int, a double multiply means a double, and an 8-byte value that is later used as an address is a pointer. The struct\'s size shows up as stride evidence: a shift by 5 on an index, a loop that adds 32, call sites 32 bytes apart. At -O2 the summing loop is unrolled eight times, so eight loads sit 32 bytes apart in a loop that steps 256; read literally they look like eight fields past the end, and folded they are one field read eight times. The System V rules explain the gaps: each member goes at the lowest offset that suits its alignment and the size rounds up to the strictest alignment, so this struct is 32 bytes with 9 bytes of padding (24 if the members were sorted by size). DWARF debug information, when present, supplies the names, the declared types and the size, and the recovered layout can be checked against it field by field. What the instructions never give is names, and that the pointer points at const char.',
  keywords: ['type recovery', 'struct layout', 'DWARF', 'alignment', 'decompilation', 'reverse engineering', 'System V ABI'],
  orient: 'landscape',
  view: { target: [0, 0.2, 0], dir: [0.3, 1.0, 1.2], half: 1.1, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { lv: 0, fold: true, use: true, all: true, aligned: true, sorted: false }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', AMB = '#C9A227';
    const KC = { pointer: '#7B6FA8', f64: '#5B8DB8', '8 bytes': '#B9B3A5' };
    const kc = k => KC[k] || (/signed/.test(k) ? '#1F9E89' : '#9FCFC2');
    /* three rulers of 32 bytes each, stacked front to back: what the accesses recovered, what the layout rules give, and what DWARF records;
       a byte block is raised and coloured by the kind of field that covers it */
    const CW = 0.12, X0 = -1.9, RZ = [-0.6, 0.0, 0.6];
    const rulers = RZ.map(z => Array.from({ length: 32 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#EEE' }), b = P.box(CW * 0.88, 1, 0.34, '#fff', { r: 0.01, material: mm }); b.position.set(X0 + i * CW, 0.03, z); S.add(b); return { b, mm }; }));
    RZ.forEach(z => { const p = P.box(32 * CW + 0.1, 0.03, 0.44, '#FFFFFF', { r: 0.02 }); p.position.set(X0 + 15.5 * CW, 0, z); S.add(p); });
    [8, 16, 24].forEach(o => { const t = P.box(0.015, 0.02, 1.7, '#6B6E7E', { r: 0 }); t.position.set(X0 + (o - 0.5) * CW, 0.03, 0); S.add(t); });
    const extra = P.stack(0.2, 0.3, 0.12, { max: 8, color: RED }); extra.position.set(X0 + 32.5 * CW, 0, RZ[0]); S.add(extra);
    const lamps = DW.map((_, i) => { const l = P.lamp('#C9C4B6', { h: 0.25, r: 0.07 }); l.position.set(X0 + (DWOFF[i] + 0.5) * CW, 0, RZ[2] + 0.35); S.add(l); return l; });
    S.add(P.keep(X0 - 0.1, X0 + 33.5 * CW, 0.7, RZ[0] - 0.25, RZ[2] + 0.45));

    let R = null, C = null, LAY = null;
    function draw() {
      R = recover(st.lv, st); C = compare(R);
      const inR = new Array(32).fill(null); R.fields.forEach(f => { for (let b = f.off; b < f.off + f.w && b < 32; b++) inR[b] = f; });
      rulers[0].forEach((c, i) => { const f = inR[i]; c.mm.color.set(f ? kc(f.kind) : '#EEEAE0'); c.b.scale.y = f ? 0.22 : 0.05; });
      extra.userData.set({ n: R.fields.filter(f => f.off >= 32).length });
      const mem = st.sorted ? DW.slice().sort((a, b) => b[3] - a[3] || b[2] - a[2]) : DW;
      LAY = layout(mem, st.aligned);
      const TC = { char: '#1F9E89', int: '#1F9E89', short: '#1F9E89', double: '#5B8DB8', 'const char *': '#7B6FA8' };
      const inL = new Array(32).fill(null); LAY.fields.forEach(f => { for (let b = f.off; b < f.off + f.sz; b++) if (b < 32) inL[b] = f; });
      rulers[1].forEach((c, i) => { const f = inL[i]; c.mm.color.set(f ? (st.aligned ? TC[f.t] : SAF) : i < LAY.size ? '#D9D4C7' : '#F4F1EA'); c.b.scale.y = f ? 0.22 : 0.05; });
      const inD = new Array(32).fill(null); DW.forEach((d, i) => { for (let b = DWOFF[i]; b < DWOFF[i] + d[2]; b++) inD[b] = d; });
      rulers[2].forEach((c, i) => { const d = inD[i]; c.mm.color.set(d ? TC[d[1]] : '#D9D4C7'); c.b.scale.y = d ? 0.22 : 0.05; });
      C.forEach((c, i) => lamps[i].userData.set({ color: { ok: GOOD, weak: SAF, missing: '#C9C4B6', bad: RED }[c.st], on: c.st !== 'missing' }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Build', options: ['-O0', '-O1', '-O2'], get: () => st.lv, act: i => set({ lv: i }) },
      { type: 'toggle', label: 'Fold unrolled loads', short: 'Fold', get: () => st.fold, set: v => set({ fold: !!v }) },
      { type: 'toggle', label: 'A value used as an address is a pointer', short: 'Pointer by use', get: () => st.use, set: v => set({ use: !!v }) },
      { type: 'toggle', label: 'Read all five functions', short: 'All functions', get: () => st.all, set: v => set({ all: !!v }) },
      { type: 'toggle', label: 'Align each member', short: 'Align', get: () => st.aligned, set: v => set({ aligned: !!v }), quick: false },
      { type: 'toggle', label: 'Order members largest first', short: 'Largest first', get: () => st.sorted, set: v => set({ sorted: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Size', get: () => ({ v: R.size ? `${R.size} B` : 'unknown', sub: `stride ${R.stride || '–'}`, good: R.size === 32, bad: R.size !== 32 }) },
      { label: 'Fields', get: () => ({ v: `${C.filter(c => c.st === 'ok').length} of 5`, sub: 'match DWARF', good: C.every(c => c.st === 'ok'), bad: C.some(c => c.st === 'missing' || c.st === 'bad') }) },
      { label: 'Layout rule', get: () => ({ v: `${LAY.size} B`, sub: st.aligned ? (st.sorted ? 'sorted' : 'source order') : 'packed', good: LAY.size === 32 && st.aligned && !st.sorted, bad: !st.aligned }) },
    ];
    const labels = [
      { name: 'rec', t: 'Recovered from accesses', d: 'Back ruler: each byte of struct account the code touches, coloured by kind (int, double, pointer); red cubes past the end are fields the analysis invented', icon: 'eye', atV: V(X0 - 0.1, 0.1, RZ[0]) },
      { name: 'rule', t: 'The layout rules', d: 'Middle ruler: System V placement; gold if alignment is ignored, grey bytes are padding', icon: 'layers', atV: V(X0 - 0.1, 0.1, RZ[1]) },
      { name: 'dw', t: 'What DWARF records', d: 'Front ruler: the real fields; a lamp per field, green when the recovery matches it in offset, width and kind', icon: 'book', atV: V(X0 + 33 * CW, 0.1, RZ[2]) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust displacements in an unrolled loop', hint: '-O2 without folding', on: () => set({ ...D0, lv: 2, fold: false }), off: reset },
      { label: 'Ignore how a value is used', hint: '8 bytes, never a pointer', on: () => set({ ...D0, use: false }), off: reset },
      { label: 'Lay the struct out without alignment', hint: 'packed offsets', on: () => set({ ...D0, aligned: false }), off: reset },
      { label: 'Read one function only', hint: 'bump', on: () => set({ ...D0, all: false }), off: reset },
    ];
    function status() {
      const beyond = R.fields.filter(f => f.off >= 32);
      if (!st.fold && beyond.length) return { ok: false, msg: `<b>Read as written, the -O2 loop shows ${beyond.length} fields past byte 32 (${beyond.map(f => f.off).join(', ')}) and no size fits them.</b> The eight loads are ${32} bytes apart in a loop that steps 256 = 8 × 32: one field, read in eight elements per pass. Fold accesses that sit one stride apart in an unrolled loop, and the struct is back to 32 bytes.` };
      if (!st.use) return { ok: false, msg: '<b>Offset 24 is recorded as 8 bytes of unknown kind.</b> The movq alone could be a long or a pointer. The next instruction uses the loaded value as an address (cmpb $0x0, (%rcx)), and only a pointer is used that way. Track where a loaded value goes, not just how it was loaded.' };
      if (!st.aligned) return { ok: false, msg: `<b>Packed without alignment, the members would sit at ${LAY.fields.map(f => f.off).join(', ')}, size ${LAY.size}, and that disagrees with every access past the first.</b> The bytes read balance at 4, code at 8, rate at 16, label at 24. System V puts each member at the lowest offset that suits its alignment, which explains the 3 and 6 bytes of padding.` };
      if (!st.all) return { ok: false, msg: '<b>bump alone shows one 4-byte field at offset 4 and nothing about the other 28 bytes or the size.</b> A function shows only the fields it touches. Merge the accesses of every function that receives the same type, and add the stride evidence, to see the whole struct.' };
      const ok = C.filter(c => c.st === 'ok').length, weak = C.filter(c => c.st === 'weak');
      return { ok: true, msg: `<b>-O${st.lv}: ${R.fields.length} fields recovered (${R.fields.map(f => `${f.off}: ${f.kind}`).join(', ')}), size ${R.size} from ${[...new Set(R.ev.map(e => e[0]))].join(', ')} evidence.</b> ${ok} of 5 match DWARF in offset, width and kind${weak.length ? `; ${weak.map(w => w.n).join(', ')} ${weak.length > 1 ? 'have' : 'has'} no signed load at this level, so the sign is unproven` : ''}. ${st.sorted ? `Sorted largest first, the same members would need only ${LAY.size} bytes.` : 'The names, and that label points at const char, come only from the type table.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Without a type table', home: true, say: 'Five functions in the student\'s program touch one struct. Without debug information, a decompiler sees only offsets. What do the instructions prove?', act: m => m.set({ lv: 0, fold: true, use: true, all: false, aligned: true, sorted: false }) },
    { t: 'Every function adds a field', home: true, say: 'Merge all five functions: a signed byte at zero, a signed int at four, a short at eight, a double at sixteen, and a pointer at twenty-four.', act: m => m.set({ all: true }) },
    { t: 'The gaps are padding', home: true, say: 'The layout rules put each member where its alignment fits. That leaves nine bytes of padding, and a size of thirty-two.', act: m => m.set({ aligned: true }) },
    { t: 'Eight loads, one field', home: true, say: 'At the highest optimisation, the loop reads eight elements per pass. Read literally, that looks like eight fields. Folded, it is one.', act: m => m.set({ lv: 2 }) },
    { t: 'Check against the table', home: true, say: 'The compiler\'s debug information records names, types and the size. Every recovered field matches it.', act: m => m.set({ lv: 0 }) },
    { t: 'Order matters', home: true, say: 'Sort the same members largest first, and the struct shrinks to twenty-four bytes.', act: m => m.set({ sorted: true }) },
  ],
  check: [
    { q: 'addl 0x4(%rax), %ecx. What does it say about the struct?', options: ['A 4-byte field at offset 4', 'The struct is 4 bytes', 'The field is named balance'], answer: 0, why: 'The displacement is the offset; the l suffix the width.', hint: 'Read the evidence panel.' },
    { q: 'An 8-byte value loaded from offset 24 is later used as the base of a load. What is the field?', options: ['A pointer', 'A long', 'A double'], answer: 0, why: 'Only a pointer is used as an address.', hint: 'Try Ignore how a value is used.' },
    { q: 'Why is struct account 32 bytes, not 23?', options: ['Alignment puts balance at 4 and rate at 16, and the size rounds to 8', 'The compiler adds a header', 'Pointers are 16 bytes'], answer: 0, why: 'System V aligns each member and the whole struct.', hint: 'Try Lay the struct out without alignment.' },
  ],
  terms: [
    ['Displacement', 'The constant in a memory operand; for a struct access, the field offset.'],
    ['Stride', 'The distance between array elements, so the struct size.'],
    ['Padding', 'Bytes the alignment rules leave unused.'],
    ['Alignment', 'The multiple an address of a type must be.'],
    ['DWARF', 'The debug-information format that records names, types and layouts.'],
    ['Unrolling', 'Repeating a loop body so one pass handles several elements.'],
  ],
  deeper: '<p><b>Reading DWARF.</b> A DWARF 5 unit header gives the length, version 5, the unit type and the address size; each entry is an abbreviation code whose declaration lists the tag and attribute forms. Names come through string offsets, so a reader must apply the object\'s relocations first.</p><p><b>C++ objects.</b> A class with virtual functions starts with a vtable pointer; the vtable lists the virtual functions in declaration order, with typeinfo and an offset just before the address point. A call through slot n loads [vptr + 8n].</p><p><b>About this machine.</b> The accesses are the real -O0, -O1 and -O2 listings of account.c; field merging, kinds, folding, stride and the layout rules are computed live. The DWARF members are those llvm-dwarfdump reads from the -g build.</p>',
  code: {
    title: 'Fold an unrolled loop, then lay out the struct',
    note: 'Adapted from the course\'s type-recovery lesson.',
    text: `
from math import gcd
from functools import reduce

def fold_unrolled(offsets, loop_step):
    offs = sorted(set(offsets))
    d = reduce(gcd, (b - a for a, b in zip(offs, offs[1:])))
    if loop_step == len(offs) * d:                 # unrolled len(offs) times
        return {o: offs[0] + (o - offs[0]) % d for o in offsets}, d
    return {o: o for o in offsets}, None

def sysv_layout(members):                          # (name, size, align)
    off, align, out = 0, 1, []
    for name, size, a in members:
        off = -(-off // a) * a                     # lowest offset that fits
        out.append((name, off)); off += size; align = max(align, a)
    return out, -(-off // align) * align           # size: multiple of alignment
`,
  },
};
