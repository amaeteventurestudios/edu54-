// Linking, loading and stripped binaries: one call to puts followed through three formats, the student's own fixtures.
// ELF (a PIE written from the psABI): call → puts@plt → jmpq *GOT slot; the slot first holds the PLT's own pushq, so the first call goes through the resolver
// (lazy binding) and the second jumps straight to puts. PE32+: call [rip+disp] reads the IAT slot the loader filled before the entry point.
// Mach-O arm64: bl → a 12-byte stub (adrp, ldr, br, decoded live from its words) → a __got slot whose 64-bit word is a chained fixup:
// bit 63 bind, bits 62–51 next (×4 bytes), low 24 bits the import ordinal; rebases carry a vm offset. The twelve raw words are dyld_info's.
// Stripped static build: LC_FUNCTION_STARTS (uleb128 deltas), a sub-sp prologue scan, an stp-pre-index scan and bl call targets, scored against nm of the twin.
const W = [0x8010000000000000n, 0x8010000000000001n, 0x8010000000000002n, 0x8010000000000003n, 0x8010000000000004n, 0x8010000000000005n, 0x8010000000000006n, 0x8010000000000007n, 0x8010000000000000n, 0x8010000000000000n, 0x00100000000006D6n, 0x00000000000006DBn];
const IMPORTS = ['libledger/_grade', 'libledger/_grade_label', 'libledger/_percent_change', 'libledger/_total', 'libSystem/___stack_chk_fail', 'libSystem/___stack_chk_guard', 'libSystem/_printf', 'libSystem/_puts'];
function decode(w) {
  const bind = (w >> 63n) & 1n, next = Number((w >> 51n) & 0xFFFn);
  return bind ? { bind: true, next, ord: Number(w & 0xFFFFFFn), addend: Number((w >> 24n) & 0xFFn) } : { bind: false, next, target: Number(w & 0xFFFFFFFFFn) };
}
function walk(stop) {
  const out = []; let off = 0x4000, i = 0;
  while (i < W.length) { const d = decode(W[i]); out.push({ off, raw: W[i], ...d }); if (!d.next || stop) break; off += d.next * 4; i = (off - 0x4000) / 8; }
  return out;
}
const adrp = (pc, w) => { const lo = (w >>> 29) & 3, hi = (w >>> 5) & 0x7FFFF; return Math.floor(pc / 4096) * 4096 + ((hi << 2) | lo) * 4096; };
const ldrOff = w => ((w >>> 10) & 0xFFF) * 8;
const blT = (pc, w) => { let i = w & 0x3FFFFFF; if (i & 0x2000000) i -= 0x4000000; return pc + i * 4; };
const BUILD = [
  { truth: [0x100000598, 0x1000006ec, 0x10000073c, 0x1000007d8, 0x10000083c], fs: [0x98, 0x0b, 0xd4, 0x02, 0x50, 0x9c, 0x01, 0x64, 0x00], subsp: [0x100000598, 0x1000006ec, 0x10000073c, 0x1000007d8, 0x10000083c], stp: [], stubs: 0x10000086c, main: 0x100000598,
    bl: [[0x1000005ec, 0x940000a0], [0x100000620, 0x94000096], [0x10000062c, 0x94000030], [0x10000063c, 0x94000040], [0x100000650, 0x94000062], [0x100000660, 0x94000077], [0x100000698, 0x94000078], [0x1000006b4, 0x9400006e], [0x1000006d8, 0x9400006b], [0x100000850, 0x97ffffbb]] },
  { truth: [0x100000500, 0x1000005f4, 0x10000060c, 0x100000648, 0x100000740], fs: [0x80, 0x0a, 0xf4, 0x01, 0x18, 0x3c, 0xf8, 0x01, 0x00], subsp: [0x100000500], stp: [], stubs: 0x100000788, main: 0x100000500,
    bl: [[0x100000548, 0x94000096], [0x100000550, 0x9400002f], [0x100000560, 0x9400008d], [0x10000056c, 0x94000022], [0x100000578, 0x94000025], [0x100000588, 0x94000030], [0x100000594, 0x9400006b], [0x1000005a8, 0x9400007b], [0x1000005bc, 0x94000079], [0x1000005f0, 0x94000066]] },
];
const NAMES = ['main', 'percent_change', 'grade', 'total', 'grade_label'];
function uleb(bytes) { const out = []; let v = 0, sh = 0, addr = 0x100000000; for (const b of bytes) { v |= (b & 0x7f) << sh; sh += 7; if (!(b & 0x80)) { if (!v) break; addr += v; out.push(addr); v = 0; sh = 0; } } return out; }
function find(lv, m) {
  const B = BUILD[lv];
  if (m === 0) return uleb(B.fs);
  if (m === 1) return B.subsp.slice();
  if (m === 2) return B.stp.slice();
  if (m === 3) { const s = new Set([B.main]); B.bl.forEach(([pc, w]) => { const t = blT(pc, w); if (t < B.stubs) s.add(t); }); return [...s].sort((a, b) => a - b); }
  return [];
}
const hx = n => '0x' + n.toString(16);

export default {
  slug: 'linking-loading-and-stripped-binaries',
  title: 'Linking and loading: one call to puts, three formats',
  description: 'The student\'s program calls puts, a function the file doesn\'t contain. Follow the call through ELF, PE and Mach-O, then find functions with no names.',
  overview: 'A linked program calls functions in shared libraries through tables the link editor writes and the loader fills. On Linux, a call goes to a PLT entry that jumps through a GOT slot; the slot first points back into the PLT, so the first call runs the resolver, which looks the name up and writes the real address, and later calls jump straight there (lazy binding). On Windows, the import directory names each library and function, and the loader overwrites the Import Address Table before the program starts; code calls through the slot with no stub. On a Mac, a call goes to a three-instruction stub that loads a __got slot, and each slot\'s 64-bit word is a chained fixup: one bit says bind or rebase, twelve bits say where the next fixup is, and the low bits name the import (or the target, for a rebase). The loader walks the chain once before main. Read in the file, that word is not an address. Stripping removes the static symbol table but keeps everything the loader needs: imports, exports, and on a Mac, a compact list of function starts. To find functions in a stripped build, that list is exact; call targets find every called function plus the entry; prologue patterns find only what the compiler chose to emit, and optimised leaf functions often have no prologue at all.',
  keywords: ['linking', 'dynamic loading', 'PLT', 'GOT', 'chained fixups', 'stripped binary', 'reverse engineering'],
  orient: 'landscape',
  view: { target: [-0.3, 0.3, -0.05], dir: [0.35, 0.9, 1.3], half: 1.15, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fmt: 2, call: 0, raw: false, lv: 1, m: 0 }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the call, hop by hop: a station per hop, rising; a ball follows the call from the caller to puts (red where a raw word is taken as an address) */
    const HX = i => -2.5 + i * 0.36, HZ = -0.55;
    const hops = Array.from({ length: 6 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.3, 0.1 + i * 0.06, 0.4, '#fff', { r: 0.03, material: mm }); b.position.set(HX(i), 0, HZ); S.add(b); return { b, mm }; });
    const ball = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); ball.userData.noFit = true; S.add(ball);
    /* the twelve fixup words, a chain of cubes linked by rods: blue binds to an import, gold rebases */
    const WX = i => -2.5 + i * 0.19, WZ = 0.5;
    const words = W.map((w, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.14, 0.14, 0.2, '#fff', { r: 0.02, material: mm }); b.position.set(WX(i), 0, WZ); S.add(b); return { b, mm }; });
    const links = W.slice(1).map((_, i) => { const r = P.box(0.06, 0.03, 0.03, '#6B6E7E', { r: 0 }); r.position.set(WX(i) + 0.095, 0.07, WZ); S.add(r); return r; });
    /* the stripped build: five function bins, lit when a method finds that function, with red extra cubes for false finds */
    const FX = i => 0.45 + i * 0.32;
    const fns = NAMES.map((n, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.26, 0.3, 0.3, '#fff', { r: 0.04, material: mm }); b.position.set(FX(i), 0, -0.2); S.add(b); return { b, mm }; });
    const falses = P.stack(0.3, 0.3, 0.1, { max: 8, color: RED }); falses.position.set(FX(5) + 0.05, 0, -0.2); S.add(falses);
    S.add(P.keep(-2.7, 2.25, 1.0, -0.85, 0.75));

    let F = null, chain = null, hopsN = 6, clock = 0;
    function path() {
      if (st.fmt === 0) {
        const slot = 0x206 + 0xed2;
        return [['call 0x200 <puts@plt>', 'at 0x227: e8 d4 ff ff ff, 0x22c − 0x2c'], ['puts@plt: jmpq *0xed2(%rip)', `0x206 + 0xed2 = ${hx(slot)}, the GOT slot`],
          st.call === 0 ? [`slot holds 0x206 (from the file)`, 'back into the PLT: pushq $0; jmp PLT0'] : ['slot now holds the address of puts', 'written by the resolver on the first call'],
          st.call === 0 ? ['PLT0 → _dl_runtime_resolve', 'reads .rela.plt record 0: JUMP_SLOT puts'] : null, st.call === 0 ? ['resolver writes &puts into 0x10d8', 'then jumps to puts'] : null, ['puts in libc.so.6', st.call === 0 ? 'first call: through the resolver' : 'second call: one indirect jump']].filter(Boolean);
      }
      if (st.fmt === 1) return [['call qword ptr [rip + 0x102f]', 'at 0x100b; 0x1011 + 0x102f = 0x2040'], ['IAT slot at RVA 0x2040', 'in the file: RVA 0x2058 → hint 0, "puts"'], ['the loader binds every import', 'before the entry point, from the import directory'], ['slot holds the address of puts', 'no stub, no lazy binding'], ['puts in msvcrt.dll', '']];
      const p = adrp(0x100000694, 0x90000030), slot = p + ldrOff(0xf9401e10), d = decode(W[(slot - 0x100004000) / 8]);
      return [['bl 0x100000694', `at 0x1000005a0: 0x3d × 4 = 0xf4 → ${hx(blT(0x1000005a0, 0x9400003d))}`], ['stub: adrp x16; ldr x16, [x16, #0x38]; br x16', `page ${hx(p)} + ${hx(ldrOff(0xf9401e10))} = ${hx(slot)}`],
        st.raw ? [`slot word 0x8010000000000007 as an address`, 'a jump into kernel space'] : [`slot word 0x8010000000000007`, `bind, next ${d.next}, import ${d.ord}: ${IMPORTS[d.ord]}`], st.raw ? null : ['dyld walked the chain before main', 'and wrote the address of _puts'], st.raw ? null : ['_puts in libSystem', '']].filter(Boolean);
    }
    function draw() {
      const ph = path();
      hops.forEach((h, i) => { const p = ph[i]; h.b.visible = !!p; if (!p) return; const bad = st.raw && st.fmt === 2 && i === 2; h.mm.color.set(bad ? BAD : i === ph.length - 1 ? GOOD : /resolver|_dl_runtime|writes/.test(p[0]) ? SAF : '#9DB8D6'); });
      chain = walk(false);
      words.forEach((w, i) => { const d = decode(W[i]); w.mm.color.set(st.raw ? RED : d.bind ? '#5B8DB8' : '#C9A227'); w.b.scale.y = i < chain.length ? 1 : 0.3; });
      links.forEach((l, i) => { l.visible = !st.raw && i < chain.length - 1; });
      const B = BUILD[st.lv]; F = find(st.lv, st.m);
      fns.forEach((f, i) => { const hit = F.includes(B.truth[i]); f.mm.color.set(hit ? GOOD : '#E4DED2'); f.b.scale.y = hit ? 1 : 0.35; });
      falses.userData.set({ n: F.filter(a => !B.truth.includes(a)).length });
      hopsN = ph.filter(Boolean).length;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const score = () => { const B = BUILD[st.lv]; return F.filter(a => B.truth.includes(a)).length; };
    const controls = [
      { type: 'buttons', label: 'Format', options: ['ELF', 'PE', 'Mach-O'], get: () => st.fmt, act: i => set({ fmt: i }) },
      { type: 'buttons', label: 'Which call', options: ['First', 'Second'], get: () => st.call, act: i => set({ call: i }) },
      { type: 'buttons', label: 'Build', options: ['-O0', '-O2'], get: () => st.lv, act: i => set({ lv: i }) },
      { type: 'buttons', label: 'Find functions by', options: ['Function starts', 'sub sp scan', 'stp scan', 'Call targets', 'Symbols'], get: () => st.m, act: i => set({ m: i }) },
    ];
    const readouts = [
      { label: 'Slot', get: () => ({ v: st.fmt === 2 ? (st.raw ? 'pointer?' : 'import 7') : st.fmt === 1 ? 'IAT' : st.call ? '&puts' : '0x206', sub: st.fmt === 2 ? '0x8010000000000007' : st.fmt === 1 ? 'bound at load' : 'GOT 0x10d8', bad: st.raw && st.fmt === 2 }) },
      { label: 'Fixups walked', get: () => ({ v: String(chain.length), sub: 'of 12 words', good: chain.length === 12 }) },
      { label: 'Functions found', get: () => ({ v: `${score()} of 5`, sub: ['function starts', 'sub sp scan', 'stp scan', 'call targets', 'symbols'][st.m], good: score() === 5, bad: score() < 5 }) },
    ];
    const labels = [
      { name: 'call', t: 'One call to puts', d: 'A station per hop, from the call to puts itself (teal): light blue jumps through tables, gold the resolver on a first call, coral a raw word taken as an address', icon: 'link', atV: V(HX(0) - 0.2, 0.1, HZ) },
      { name: 'fix', t: 'Twelve fixup words', d: 'Linked in a chain the loader walks: blue binds to an import, gold rebases; red if read as plain pointers', icon: 'layers', atV: V(WX(0) - 0.12, 0.1, WZ) },
      { name: 'strip', t: 'A stripped build', d: 'Five functions, lit when the chosen method finds them; red cubes are false finds', icon: 'eye', atV: V(FX(5) + 0.25, 0.3, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read the fixup word as an address', hint: 'the file is not the process', on: () => set({ ...D0, fmt: 2, raw: true }), off: reset },
      { label: 'Count functions with the symbol table', hint: 'nm after strip', on: () => set({ ...D0, m: 4 }), off: reset },
      { label: 'Trust a prologue pattern on -O2', hint: 'leaf functions have none', on: () => set({ ...D0, lv: 1, m: 1 }), off: reset },
    ];
    function status() {
      const s = score();
      if (st.raw && st.fmt === 2) return { ok: false, msg: '<b>Read as an address, 0x8010000000000007 points into kernel space, as if the call were corrupt.</b> It is a chained fixup: bit 63 says bind, bits 62 to 51 say the next fixup is 2 × 4 bytes on, and the low 24 bits say import 7, libSystem/_puts. dyld walks the chain and writes the real address before main runs. The file is not the process.' };
      if (st.m === 4) return { ok: false, msg: '<b>After strip, the symbol table names none of the 5 functions; nm shows only __mh_execute_header and the imports.</b> strip removes what the loader doesn\'t need. LC_FUNCTION_STARTS survives: nine bytes of uleb128 deltas that list all five starts. Use it, or call targets.' };
      if ((st.m === 1 || st.m === 2) && s < 5) return { ok: false, msg: `<b>The ${st.m === 1 ? 'sub sp' : 'stp pre-index'} pattern finds ${s} of 5 functions at -O${st.lv ? 2 : 0}.</b> ${st.m === 2 ? 'clang emits sub sp first and stp with a positive offset, so this classic pattern never matches. ' : ''}${st.lv ? 'At -O2, percent_change, grade, total and grade_label are leaf functions with no frame at all; percent_change starts with cbz. ' : ''}A prologue scan finds what the compiler chose to emit. Prefer the function-starts table or call targets.` };
      if (s < 5) return { ok: false, msg: `<b>${s} of 5 functions found.</b>` };
      return { ok: true, msg: `<b>${['ELF', 'PE', 'Mach-O'][st.fmt]}: ${st.fmt === 0 ? (st.call ? 'the second call jumps straight to puts through the filled GOT slot' : 'the first call goes through the resolver, which fills the GOT slot') : st.fmt === 1 ? 'the call reads the IAT slot the loader bound before the entry point' : 'the stub loads __got slot 0x100004038, which dyld bound to _puts by walking the fixup chain'}.</b> In the stripped -O${st.lv ? 2 : 0} build, ${['the function-starts table', 'the sub sp scan', 'the stp scan', 'call targets plus the entry point', 'the symbol table'][st.m]} finds all 5 functions${st.m === 0 ? `: ${uleb(BUILD[st.lv].fs).map(hx).join(', ')}` : ''}.` };
    }
    const update = dt => { clock += dt; const u = (clock % 3) / 3 * (hopsN - 1), i = Math.floor(u), f = u - i, j = Math.min(hopsN - 1, i + 1), y0 = 0.15 + i * 0.06, y1 = 0.15 + j * 0.06; ball.position.set(HX(i) + (HX(j) - HX(i)) * f, Math.max(y0, y1) + 0.12 + Math.sin(f * Math.PI) * 0.15, HZ); ball.material.color.set(st.raw && st.fmt === 2 && i >= 2 ? RED : SAF); };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A function it doesn\'t contain', home: true, say: 'The student\'s program calls puts, which lives in a system library. Follow that one call through a Linux, a Windows and a Mac binary.', act: m => m.set({ fmt: 0, call: 0, raw: false, lv: 1, m: 0 }) },
    { t: 'Lazy on Linux', home: true, say: 'On Linux, the first call goes through a resolver that looks the name up and fills the slot. The second call jumps straight there.', act: m => m.set({ call: 1 }) },
    { t: 'Bound before start', home: true, say: 'On Windows, the loader fills every import slot before the program starts. The code calls through the slot, with no stub.', act: m => m.set({ fmt: 1 }) },
    { t: 'Packed words on a Mac', home: true, say: 'On a Mac, each slot holds a packed word: bind or rebase, where the next one is, and which import. The loader walks the chain once.', act: m => m.set({ fmt: 2 }) },
    { t: 'Names gone', home: true, say: 'Strip the program, and its symbol table no longer names any function. But the loader\'s own tables are still there.', act: m => m.set({ m: 4 }) },
    { t: 'Five starts in nine bytes', home: true, say: 'A compact list of function starts survives the strip. It finds all five functions, where a prologue pattern finds only one.', act: m => m.set({ m: 0 }) },
  ],
  check: [
    { q: 'A Mac __got slot in the file holds 0x8010000000000007. What is it?', options: ['A chained fixup: bind import 7, next fixup 8 bytes on', 'A corrupt pointer', 'The address of puts'], answer: 0, why: 'dyld replaces it with the real address before main.', hint: 'Try Read the fixup word as an address.' },
    { q: 'On Linux with lazy binding, what does the GOT slot hold before the first call?', options: ['The address of the pushq inside the PLT entry', 'The address of puts', 'Zero'], answer: 0, why: 'The first call falls through to the resolver.', hint: 'Pick ELF and First.' },
    { q: 'Optimised arm64, stripped. Best way to find function starts?', options: ['LC_FUNCTION_STARTS, or call targets', 'A prologue pattern', 'nm'], answer: 0, why: 'Leaf functions at -O2 often have no prologue.', hint: 'Try Trust a prologue pattern on -O2.' },
  ],
  terms: [
    ['PLT', 'Small stubs that jump through the GOT to a library function.'],
    ['GOT', 'A table of addresses the dynamic linker fills.'],
    ['Lazy binding', 'Resolving an import on its first call instead of at load.'],
    ['IAT', 'The Windows table of import addresses, bound at load.'],
    ['Chained fixup', 'A Mach-O pointer word that encodes a bind or rebase and the next fixup.'],
    ['Stripping', 'Removing symbols the loader doesn\'t need.'],
  ],
  deeper: '<p><b>RELRO.</b> GNU ld puts tables written only during relocation at the start of the writable segment, so the loader can make them read-only afterwards; with -z now the whole GOT is bound at start and protected.</p><p><b>What the compiler writes.</b> Every call is a PLT32 relocation; the link editor decides whether it needs a PLT entry (an import) or becomes a direct call (defined in the inputs). An 8-byte absolute pointer in a PIE becomes a RELATIVE relocation, base plus addend.</p><p><b>Library signatures.</b> FLIRT-style signatures take a function\'s first 32 bytes with relocated bytes wildcarded, plus a CRC16 of what follows, so known library functions can be named in a stripped binary.</p><p><b>About this machine.</b> The stub, branch and fixup words are decoded live from the course\'s fixtures; the function-finding methods run live over the -O0 and -O2 stripped builds\' tables and branch words, scored against the unstripped twins.</p>',
  code: {
    title: 'Walk a fixup chain',
    note: 'Adapted from the course\'s linking lesson.',
    text: `
import struct

def walk_chain(data, start, imports, base=0x100000000):
    off, out = start, []
    while True:
        (w,) = struct.unpack_from("<Q", data, off)
        nxt = (w >> 51) & 0xFFF                     # in 4-byte units
        if w >> 63:                                 # bind
            out.append((off, "bind", imports[w & 0xFFFFFF]))
        else:                                       # rebase: a vm offset
            out.append((off, "rebase", hex(base + (w & 0xFFFFFFFFF))))
        if not nxt:
            return out
        off += nxt * 4

def function_starts(blob, text_vmaddr=0x100000000):
    addr, v, shift, out = text_vmaddr, 0, 0, []
    for b in blob:
        v |= (b & 0x7F) << shift; shift += 7
        if not b & 0x80:
            if v == 0: break
            addr += v; out.append(addr); v = shift = 0
    return out
`,
  },
};
