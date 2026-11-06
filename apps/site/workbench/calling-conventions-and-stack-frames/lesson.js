// Calling conventions and stack frames: the student's convention.c compiled three ways (Linux x86-64 = System V, Windows x64, Linux AArch64 = AAPCS64), real -O2 listings.
// The header picks the rulebook. A rule engine places each parameter (System V: two independent register sequences; Microsoft: positions, 16-byte structs by reference,
// a hidden result pointer that shifts arguments, stack arguments above a 32-byte shadow store; AAPCS64: NGRN / NSRN counters, x8 for a large result).
// A reads-before-writes pass over the listing infers what the bytes use, and the two are compared. The frame of keeps is simulated from its prologue.
// Breaks: the System V rulebook on the Windows object; a write-only destination counted as a read (an invented float argument); registers seen only inside
// an address skipped (eight_args loses rcx); the shadow store forgotten (stack arguments expected at 8 instead of 40).
const SIGS = {
  eight_args: { p: [['a', 'i'], ['b', 'i'], ['c', 'i'], ['d', 'i'], ['e', 'i'], ['f', 'i'], ['g', 'i'], ['h', 'i']], ret: 'i', c: 'long long eight_args(a, b, c, d, e, f, g, h)' },
  mixed: { p: [['i', 'i'], ['d', 'f'], ['l', 'i'], ['f', 'f']], ret: 'f', c: 'double mixed(int i, double d, long long l, float f)' },
  by_value: { p: [['p', 's16']], ret: 's16', c: 'struct pair by_value(struct pair p)   // 16 bytes' },
  big_ret: { p: [['seed', 'i']], ret: 's32', c: 'struct quad big_ret(long long seed)   // 32 bytes' },
};
const FNS = Object.keys(SIGS);
function place(abi, sig, shadow) {
  const out = [];
  if (abi === 0) {
    const I = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'], F = ['xmm0', 'xmm1', 'xmm2', 'xmm3', 'xmm4', 'xmm5', 'xmm6', 'xmm7']; let ni = 0, nf = 0, sk = 8;
    if (sig.ret === 's32') out.push(['result address', I[ni++]]);
    sig.p.forEach(([n, t]) => { if (t === 'f') out.push([n, nf < 8 ? F[nf++] : `+${sk}`]); else if (t === 's16') { out.push([n + '.a', I[ni++]]); out.push([n + '.b', I[ni++]]); } else if (ni < 6) out.push([n, I[ni++]]); else { out.push([n, `+${sk}`]); sk += 8; } });
  } else if (abi === 1) {
    const I = ['rcx', 'rdx', 'r8', 'r9'], F = ['xmm0', 'xmm1', 'xmm2', 'xmm3']; let pos = 0, sk = shadow ? 40 : 8;
    if (sig.ret === 's32' || sig.ret === 's16') out.push(['result address', I[pos++]]);
    sig.p.forEach(([n, t]) => { if (pos < 4) { out.push([t === 's16' ? n + ' (by reference)' : n, t === 'f' ? F[pos] : I[pos]]); pos++; } else { out.push([n, `+${sk}`]); sk += 8; } });
  } else {
    let ngrn = 0, nsrn = 0, sk = 0;
    if (sig.ret === 's32') out.push(['result address', 'x8']);
    sig.p.forEach(([n, t]) => { if (t === 'f') out.push([n, `v${nsrn++}`]); else if (t === 's16') { out.push([n + '.a', `x${ngrn++}`]); out.push([n + '.b', `x${ngrn++}`]); } else if (ngrn < 8) out.push([n, `x${ngrn++}`]); else { out.push([n, `+${sk}`]); sk += 8; } });
  }
  return out;
}
// listings: [text, reads, writes, address regs, stack offset read, write-only destination of a convert]
const L = [
  {
    eight_args: [['addq %rdi, %rsi', 'rdi rsi', 'rsi'], ['leaq (%rdx,%rcx), %rax', '', 'rax', 'rdx rcx'], ['addq %rsi, %rax', 'rsi rax', 'rax'], ['addq %r8, %rax', 'r8 rax', 'rax'], ['addq %r9, %rax', 'r9 rax', 'rax'], ['addq 0x8(%rsp), %rax', 'rax', 'rax', '', 8], ['addq 0x10(%rsp), %rax', 'rax', 'rax', '', 16], ['retq']],
    mixed: [['cvtsi2sd %edi, %xmm2', 'rdi', 'xmm2', '', 0, 'xmm2'], ['addsd %xmm2, %xmm0', 'xmm2 xmm0', 'xmm0'], ['xorps %xmm2, %xmm2', '', 'xmm2'], ['cvtsi2sd %rsi, %xmm2', 'rsi', 'xmm2', '', 0, 'xmm2'], ['addsd %xmm2, %xmm0', 'xmm2 xmm0', 'xmm0'], ['cvtss2sd %xmm1, %xmm1', 'xmm1', 'xmm1'], ['addsd %xmm1, %xmm0', 'xmm1 xmm0', 'xmm0'], ['retq']],
    by_value: [['leaq 0x1(%rdi), %rax', '', 'rax', 'rdi'], ['leaq -0x1(%rsi), %rdx', '', 'rdx', 'rsi'], ['retq']],
    big_ret: [['movq %rdi, %rax', 'rdi', 'rax'], ['movq %rsi, (%rdi)', 'rsi', '', 'rdi'], ['leaq 0x1(%rsi), %rcx', '', 'rcx', 'rsi'], ['movq %rcx, 0x8(%rdi)', 'rcx', '', 'rdi'], ['leaq 0x2(%rsi), %rcx', '', 'rcx', 'rsi'], ['movq %rcx, 0x10(%rdi)', 'rcx', '', 'rdi'], ['addq $0x3, %rsi', 'rsi', 'rsi'], ['movq %rsi, 0x18(%rdi)', 'rsi', '', 'rdi'], ['retq']],
  },
  {
    eight_args: [['addq %rdx, %rcx', 'rdx rcx', 'rcx'], ['leaq (%r8,%r9), %rax', '', 'rax', 'r8 r9'], ['addq %rcx, %rax', 'rcx rax', 'rax'], ['addq 0x28(%rsp), %rax', 'rax', 'rax', '', 40], ['addq 0x30(%rsp), %rax', 'rax', 'rax', '', 48], ['addq 0x38(%rsp), %rax', 'rax', 'rax', '', 56], ['addq 0x40(%rsp), %rax', 'rax', 'rax', '', 64], ['retq']],
    mixed: [['cvtsi2sd %ecx, %xmm0', 'rcx', 'xmm0', '', 0, 'xmm0'], ['addsd %xmm1, %xmm0', 'xmm1 xmm0', 'xmm0'], ['xorps %xmm1, %xmm1', '', 'xmm1'], ['cvtsi2sd %r8, %xmm1', 'r8', 'xmm1', '', 0, 'xmm1'], ['addsd %xmm0, %xmm1', 'xmm0 xmm1', 'xmm1'], ['xorps %xmm0, %xmm0', '', 'xmm0'], ['cvtss2sd %xmm3, %xmm0', 'xmm3', 'xmm0', '', 0, 'xmm0'], ['addsd %xmm1, %xmm0', 'xmm1 xmm0', 'xmm0'], ['retq']],
    by_value: [['movq %rcx, %rax', 'rcx', 'rax'], ['movdqu (%rdx), %xmm0', '', 'xmm0', 'rdx'], ['paddq (%rip), %xmm0', 'xmm0', 'xmm0'], ['movdqu %xmm0, (%rdx)', 'xmm0', '', 'rdx'], ['movups (%rdx), %xmm0', '', 'xmm0', 'rdx'], ['movups %xmm0, (%rcx)', 'xmm0', '', 'rcx'], ['retq']],
    big_ret: [['movq %rcx, %rax', 'rcx', 'rax'], ['movq %rdx, (%rcx)', 'rdx', '', 'rcx'], ['leaq 0x1(%rdx), %rcx', '', 'rcx', 'rdx'], ['movq %rcx, 0x8(%rax)', 'rcx', '', 'rax'], ['leaq 0x2(%rdx), %rcx', '', 'rcx', 'rdx'], ['movq %rcx, 0x10(%rax)', 'rcx', '', 'rax'], ['addq $0x3, %rdx', 'rdx', 'rdx'], ['movq %rdx, 0x18(%rax)', 'rdx', '', 'rax'], ['retq']],
  },
  {
    eight_args: [['add x8, x2, x3', 'x2 x3', 'x8'], ['add x9, x1, x0', 'x1 x0', 'x9'], ['add x10, x4, x5', 'x4 x5', 'x10'], ['add x8, x9, x8', 'x9 x8', 'x8'], ['add x9, x10, x6', 'x10 x6', 'x9'], ['add x8, x8, x9', 'x8 x9', 'x8'], ['add x0, x8, x7', 'x8 x7', 'x0'], ['ret']],
    mixed: [['scvtf d3, w0', 'x0', 'v3', '', 0, 'v3'], ['scvtf d2, x1', 'x1', 'v2', '', 0, 'v2'], ['fcvt d1, s1', 'v1', 'v1'], ['fadd d0, d3, d0', 'v3 v0', 'v0'], ['fadd d0, d0, d2', 'v0 v2', 'v0'], ['fadd d0, d0, d1', 'v0 v1', 'v0'], ['ret']],
    by_value: [['sub x1, x1, #0x1', 'x1', 'x1'], ['add x0, x0, #0x1', 'x0', 'x0'], ['ret']],
    big_ret: [['adrp x9, .rodata.cst16', '', 'x9'], ['dup v0.2d, x0', 'x0', 'v0'], ['str x0, [x8]', 'x0', '', 'x8'], ['ldr q1, [x9]', '', 'v1', 'x9'], ['add x9, x0, #0x3', 'x0', 'x9'], ['str x9, [x8, #0x18]', 'x9', '', 'x8'], ['add v0.2d, v0.2d, v1.2d', 'v0 v1', 'v0'], ['stur q0, [x8, #0x8]', 'v0', '', 'x8'], ['ret']],
  },
];
const sp = s => (s || '').split(' ').filter(Boolean);
function infer(list, o) {
  const written = new Set(), used = [];
  const use = r => { if (!written.has(r) && !used.includes(r)) used.push(r); };
  list.forEach(([, r, w, a, s, cv]) => {
    sp(r).forEach(use); if (o.addr) sp(a).forEach(use);
    if (o.destRead && cv) use(cv);
    if (s) use(`+${s}`);
    sp(w).forEach(x => written.add(x));
  });
  return used;
}
// keeps: the prologue, simulated
const PRO = [
  { ops: [['push', 'rbp'], ['push', 'r14'], ['push', 'rbx']], ret: true, bytes: '55 41 56 53' },
  { ops: [['push', 'rsi'], ['push', 'rdi'], ['push', 'rbx'], ['sub', 32]], ret: true, bytes: '56 57 53 48 83 ec 20' },
  { ops: [['stpPre', 'x29', 'x30', 48], ['str', 'x21', 16], ['stp', 'x20', 'x19', 32]], ret: false, bytes: 'a9bd7bfd f9000bf5 910003fd a9024ff4' },
];
function frame(t) {
  let s = 0; const slots = {};
  PRO[t].ops.forEach(o => {
    if (o[0] === 'push') { s -= 8; slots[s] = o[1]; }
    else if (o[0] === 'sub') { for (let k = 1; k <= o[1] / 8; k++) slots[s - k * 8] = 'shadow store'; s -= o[1]; }
    else if (o[0] === 'stpPre') { s -= o[3]; slots[s] = o[1]; slots[s + 8] = o[2]; }
    else if (o[0] === 'str') slots[s + o[2]] = o[1];
    else if (o[0] === 'stp') { slots[s + o[3]] = o[1]; slots[s + o[3] + 8] = o[2]; }
  });
  return { depth: -s, slots };
}
const ABI = ['System V (Linux x86-64)', 'Microsoft x64 (Windows)', 'AAPCS64 (Linux AArch64)'];
const HDR = ['ELF, e_machine 62', 'COFF, Machine 0x8664', 'ELF, e_machine 183'];

export default {
  slug: 'calling-conventions-and-stack-frames',
  title: 'Calling conventions: one file, three rulebooks',
  description: 'The student compiles one C file for Linux, Windows and 64-bit ARM, and reads where each rulebook puts the arguments and the saved registers.',
  overview: 'A listing shows which registers a function reads; only the calling convention says what they mean, and the object\'s header decides which convention applies. System V on x86-64 Linux fills two independent sequences: integers in rdi, rsi, rdx, rcx, r8, r9 and floating point in xmm0 to xmm7, each taking the next free register, with stack arguments from 8 above the entry stack pointer and a 128-byte red zone below it. Microsoft x64 is positional: the first four arguments use rcx, rdx, r8, r9 or xmm0 to xmm3 by position, so a double in second place goes to xmm1 even if xmm0 is empty; structs of 16 bytes go by reference; a large result\'s address takes the first slot and shifts the rest; and every caller leaves a 32-byte shadow store, so stack arguments start at 40. AAPCS64 counts with NGRN and NSRN through x0 to x7 and v0 to v7, and puts a large result\'s address in x8. To infer parameters, list the registers each function reads before writing them, count registers used inside an address, and do not count a destination that is only written. The prologue then gives the frame: which callee-saved registers were pushed or stored, at which offsets, and how much space was set aside. The compiler writes the same facts again in its unwind tables, so you can check one against the other.',
  keywords: ['calling convention', 'ABI', 'System V', 'Windows x64', 'AArch64', 'stack frame', 'reverse engineering'],
  orient: 'landscape',
  view: { target: [-0.4, 0.4, -0.05], dir: [0.4, 0.8, 1.3], half: 1.2, wide: 4.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { t: 0, fn: 0, hdr: true, addr: true, destRead: false, shadow: true }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the parameters: one slot per place the rule expects or the bytes read (register or stack); a block rises in each,
       green where the rule and the bytes agree, coral where the rule expects a read that never happens, red where the bytes read a place no rule names */
    const RXa = -2.3, rows = Array.from({ length: 10 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), b = P.box(0.18, 1, 0.3, '#fff', { r: 0.03, material: mm }); b.position.set(RXa + i * 0.24, 0.03, -0.45); S.add(b); return { b, mm }; });
    const rack = P.box(2.5, 0.03, 0.5, '#FFFFFF', { r: 0.03 }); rack.position.set(RXa + 1.08, 0, -0.45); S.add(rack);
    const lamp = P.lamp(GOOD, { h: 0.6, r: 0.12 }); lamp.position.set(RXa + 2.55, 0, -0.45); S.add(lamp);
    /* the frame of keeps: the stack drawn as a column of slabs, highest address on top */
    const FX = 1.05, slots = Array.from({ length: 9 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), b = P.box(0.7, 0.13, 0.5, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const fbase = P.box(0.8, 0.04, 0.6, '#6B6E7E', { r: 0.02 }); fbase.position.set(FX, 0, 0.35); S.add(fbase);
    S.add(P.keep(-2.45, 1.5, 1.35, -0.75, 0.7));

    let R = null;
    function analyse(s) {
      const fn = FNS[s.fn], rule = s.hdr ? s.t : 0, exp = place(rule, SIGS[fn], s.shadow), got = infer(L[s.t][fn], s);
      const expLoc = exp.map(e => e[1]), missing = exp.filter(e => !got.includes(e[1])), extra = got.filter(g => !expLoc.includes(g));
      return { fn, rule, exp, got, missing, extra, ok: !missing.length && !extra.length };
    }
    function draw() {
      R = analyse(st);
      const list = R.exp.map(e => ({ ok: R.got.includes(e[1]), lab: R.got.includes(e[1]) ? 'read' : 'unused' })).concat(R.extra.map(() => ({ ok: false, lab: 'no rule' })));
      rows.forEach((r, i) => { const L = list[i]; r.b.visible = !!L; if (!L) return; r.b.scale.y = L.ok ? 0.4 : L.lab === 'no rule' ? 0.55 : 0.15; r.mm.color.set(L.ok ? GOOD : L.lab === 'no rule' ? RED : BAD); });
      lamp.userData.set({ color: R.ok ? GOOD : RED, on: true });
      const F = frame(st.t), offs = Object.keys(F.slots).map(Number).sort((a, b) => b - a);
      const show = (PRO[st.t].ret ? [[0, 'return address']] : []).concat(offs.map(o => [o, F.slots[o]])), merged = [];
      show.forEach(([o, n]) => { const last = merged[merged.length - 1]; if (last && n === 'shadow store' && last.n === 'shadow store') { last.lo = o; } else merged.push({ o, lo: o, n }); });
      if (st.t === 2) { for (let o = -8; o >= -F.depth; o -= 8) if (!F.slots[o]) merged.push({ o, lo: o, n: 'padding' }); merged.sort((a, b) => b.o - a.o); }
      slots.forEach((sl, i) => { const m = merged[i]; sl.b.visible = !!m; if (!m) return; sl.b.position.set(FX, 0.04 + (merged.length - 1 - i) * 0.15, 0.35); sl.mm.color.set(m.n === 'return address' ? '#F2AE0C' : m.n === 'shadow store' ? '#D9D4C7' : m.n === 'padding' ? '#EEEAE0' : /x29|x30|rbp/.test(m.n) ? '#9DB8D6' : '#1F9E89'); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Target', options: ['Linux x86-64', 'Windows x64', 'AArch64'], get: () => st.t, act: i => set({ t: i }) },
      { type: 'buttons', label: 'Function', options: ['eight_args', 'mixed', 'by_value', 'big_ret'], get: () => st.fn, act: i => set({ fn: i }) },
      { type: 'toggle', label: 'Rulebook from the header', short: 'Header', get: () => st.hdr, set: v => set({ hdr: !!v }) },
      { type: 'toggle', label: 'Count registers used inside an address', short: 'Addresses', get: () => st.addr, set: v => set({ addr: !!v }) },
      { type: 'toggle', label: 'Microsoft shadow store (stack args from 40)', short: 'Shadow store', get: () => st.shadow, set: v => set({ shadow: !!v }), quick: false },
    ];
    const all = () => { let ok = 0, n = 0; for (let t = 0; t < 3; t++) for (let f = 0; f < 4; f++) { n++; if (analyse({ ...st, t, fn: f }).ok) ok++; } return { ok, n }; };
    const readouts = [
      { label: 'This function', get: () => ({ v: R.ok ? 'matches' : `${R.missing.length + R.extra.length} off`, sub: `${R.exp.length} locations by rule`, good: R.ok, bad: !R.ok }) },
      { label: 'All 12', get: () => { const a = all(); return { v: `${a.ok} of ${a.n}`, sub: 'functions × targets', good: a.ok === a.n, bad: a.ok < a.n }; } },
      { label: 'Frame', get: () => ({ v: `${frame(st.t).depth} B`, sub: 'keeps, after the prologue' }) },
    ];
    const labels = [
      { name: 'params', t: 'Where the arguments go', d: 'A block per register or stack place: green where the rulebook and the bytes agree, coral expected but never read, red read with no rule; lamp: all agree', icon: 'layers', atV: V(RXa - 0.15, 0.2, -0.45) },
      { name: 'frame', t: 'The frame of keeps', d: 'The stack, highest address on top: gold return address, teal saved registers, light blue frame links, grey shadow store or padding', icon: 'box', atV: V(FX + 0.38, 0.5, 0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read Windows code with Linux rules', hint: 'rulebook from habit', on: () => set({ ...D0, t: 1, fn: 1, hdr: false }), off: reset },
      { label: 'Count a register the code only writes', hint: 'cvtsi2sd\'s destination as a read', on: () => set({ ...D0, fn: 1, destRead: true }), off: reset },
      { label: 'Skip registers inside an address', hint: 'leaq (%rdx,%rcx)', on: () => set({ ...D0, fn: 0, addr: false }), off: reset },
      { label: 'Forget the shadow store', hint: 'stack args at 8', on: () => set({ ...D0, t: 1, fn: 0, shadow: false }), off: reset },
    ];
    function status() {
      const m = R.missing.map(e => `${e[0]} in ${e[1]}`).join(', '), x = R.extra.join(', ');
      if (!st.hdr && st.t !== 0) return { ok: false, msg: `<b>The header says ${HDR[st.t]}, but the System V rules were applied: ${R.missing.length} expected locations are unused${R.extra.length ? ` and ${R.extra.length} registers read have no rule (${x})` : ''}.</b> The same source puts mixed in ecx, xmm1, r8, xmm3 on Windows, by position. Read the header first; it picks the rulebook.` };
      if (st.destRead && R.extra.length) return { ok: false, msg: `<b>The analysis counted ${x} as read, inventing ${R.extra.length > 1 ? `${R.extra.length} arguments` : 'an argument'}.</b> cvtsi2sd and scvtf only write their destination; the register is scratch, written before it is ever read. One real tool reported mixed as taking three doubles this way. Count only registers read before they are written.` };
      if (!st.addr && R.missing.length) return { ok: false, msg: `<b>Registers used only inside an address were skipped, so ${m} ${R.missing.length > 1 ? 'are' : 'is'} missing.</b> An instruction such as leaq (%rdx,%rcx), %rax, or a store through [x8], reads its registers as part of an address. A real tool reported eight_args with seven arguments after missing rcx this way. An address operand is a read.` };
      if (!st.shadow && st.t === 1 && !R.ok) return { ok: false, msg: `<b>Without the shadow store, stack arguments were expected at ${R.missing.map(e => e[1]).join(', ')}, and the bytes read ${R.extra.join(', ')}.</b> Every Windows caller leaves 32 bytes for the four register arguments above the return address, so the first stack argument sits at 40 on entry.` };
      if (!R.ok) return { ok: false, msg: `<b>${R.fn} on this target doesn't match its rule.</b> Missing: ${m || 'none'}. Unexplained: ${x || 'none'}.` };
      const a = all();
      return { ok: true, msg: `<b>${R.fn} on ${['Linux x86-64', 'Windows x64', 'AArch64'][st.t]}: every location the rule gives is read by the bytes, and nothing else is.</b> ${a.ok} of ${a.n} function-and-target pairs match. ${R.fn === 'big_ret' ? ['The result\'s address arrives in rdi and leaves in rax.', 'The result\'s address takes rcx and shifts seed to rdx.', 'The result\'s address arrives in x8; seed stays in x0.'][st.t] : R.fn === 'mixed' ? ['Ints and floats fill separate sequences.', 'Positions decide: xmm0 and xmm2 stay empty.', 'NGRN and NSRN count separately.'][st.t] : ''}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One file, three targets', home: true, say: 'The student compiles one C file for Linux, Windows and 64-bit Arm. The object\'s header says which calling convention applies.', act: m => m.set({ t: 0, fn: 0, hdr: true, addr: true, destRead: false, shadow: true }) },
    { t: 'Two sequences', home: true, say: 'On Linux, integers and floats fill two separate lists of registers, each taking the next free one.', act: m => m.set({ fn: 1 }) },
    { t: 'Positions on Windows', home: true, say: 'On Windows, the position decides. The second argument is a double, so it goes to the second float register, and the first stays empty.', act: m => m.set({ t: 1 }) },
    { t: 'The wrong rulebook', home: true, say: 'Read the Windows bytes with the Linux rules, and almost nothing lines up. The header picks the rulebook.', act: m => m.set({ hdr: false }) },
    { t: 'A large result', home: true, say: 'A thirty-two byte result comes back through memory. On Arm, its address arrives in its own register, x8.', act: m => m.set({ hdr: true, t: 2, fn: 3 }) },
    { t: 'The frame', home: true, say: 'The prologue of a function that calls another saves registers it must keep. The compiler records the same facts again in its unwind tables.', act: m => m.set({ t: 1, fn: 0 }) },
  ],
  check: [
    { q: 'mixed(int, double, long long, float) on Windows x64: where is the double?', options: ['xmm1, because it is in second position', 'xmm0, the first free float register', 'rdx'], answer: 0, why: 'Microsoft x64 assigns by position.', hint: 'Pick Windows and mixed.' },
    { q: 'On Windows x64, where is the first stack argument on entry?', options: ['40 above the stack pointer, past the return address and the 32-byte shadow store', '8 above the stack pointer', 'Below the stack pointer'], answer: 0, why: 'Callers always leave 32 bytes for the register arguments.', hint: 'Try Forget the shadow store.' },
    { q: 'cvtsi2sd %edi, %xmm2 is the first instruction. Is xmm2 a parameter?', options: ['No: it is written before it is read', 'Yes: it appears in the first instruction', 'Only on Windows'], answer: 0, why: 'Parameters are registers read before they are written.', hint: 'Try Count a register the code only writes.' },
  ],
  terms: [
    ['Calling convention', 'The contract for where arguments, results and saved registers live.'],
    ['Callee-saved', 'Registers a function must restore before returning.'],
    ['Shadow store', 'The 32 bytes a Windows caller leaves for the register arguments.'],
    ['Red zone', 'The 128 bytes below the stack pointer a System V leaf may use.'],
    ['NGRN / NSRN', 'AAPCS64\'s counters for the next integer and float register.'],
    ['Unwind table', 'The compiler\'s record of each prologue, used to walk the stack.'],
  ],
  deeper: '<p><b>Variadic calls.</b> System V passes an upper bound on vector registers used in al; Windows duplicates floats in integer registers; Apple\'s arm64 puts every variadic argument in 8-byte stack slots.</p><p><b>Apple differs.</b> x18 is reserved, x29 always points at a valid frame record, and Mach-O names start with an underscore.</p><p><b>Tools disagree.</b> Real tools missed rcx in eight_args and invented a third double in mixed. The rule, the bytes and the unwind tables are three independent views; when they agree, trust the answer.</p><p><b>About this machine.</b> The listings are the course\'s clang -O2 output for each target. The rule engine, the reads-before-writes pass and the frame are computed live from them.</p>',
  code: {
    title: 'Place the arguments, then check the bytes',
    note: 'Adapted from the course\'s calling-conventions lesson.',
    text: `
SYSV_INT = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"]
MS_INT, MS_FP = ["rcx", "rdx", "r8", "r9"], ["xmm0", "xmm1", "xmm2", "xmm3"]

def place_ms(params, big_result=False):
    out, pos, stack = [], 0, 40            # return address + 32-byte shadow store
    if big_result:
        out.append(("result", MS_INT[pos])); pos += 1
    for name, kind in params:
        if pos < 4:
            out.append((name, MS_FP[pos] if kind == "f" else MS_INT[pos])); pos += 1
        else:
            out.append((name, f"+{stack}")); stack += 8
    return out

def read_before_write(listing):
    written, used = set(), []
    for ins in listing:
        for r in ins.reads + ins.address_regs:     # an address operand is a read
            if r not in written and r not in used: used.append(r)
        written |= set(ins.writes)                  # a write-only destination is not
    return used
`,
  },
};
