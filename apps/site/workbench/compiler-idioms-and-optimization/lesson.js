// Compiler idioms: three shapes clang emits for the student's idioms.c, each decoded back with arithmetic and checked.
// Division: the Granlund–Montgomery search (smallest shift s ≥ 32 with m = ⌈2^s/d⌉ and error m·d − 2^s ≤ 2^(s−32) unsigned, 2^(s−31) signed) gives the
// multiplier and shift clang emits (10u → 0xCCCCCCCD, 35; 7u → 0x124924925, 35, a 33-bit multiplier done as a 32-bit multiply plus an add-back; 3s → 0x55555556, 32).
// Each pair is checked with BigInt against truncating division on edge values and a fixed pseudo-random sample.
// Switch: LLVM's rules pick the shape (lookup table or linear map at -O1+ when every case returns a constant, at least 3 cases, dense; jump table when
// at least 4 entries and NumCases·100 ≥ Range·10; else a comparison tree or select chain). Loop: sum_n at -O2 runs 4 lanes × 2 accumulators = 8 ints per
// iteration (andl $0x7ffffff8 masks the trip count), then a scalar remainder loop; n ≤ 7 skips the vector loop.
function magic(d, signed) {
  const D = BigInt(d);
  for (let s = 32n; s < 64n; s++) { const p = 1n << s, m = (p + D - 1n) / D, e = m * D - p; if (e <= (1n << (s - (signed ? 31n : 32n)))) return { m, s: Number(s) }; }
  return null;
}
function divBy(n, m, s, signed) { const q = (BigInt(n) * m) >> BigInt(s); return Number(q) + (signed && n < 0 ? 1 : 0); }
const TESTS = (() => { const t = [0, 1, 2, 6, 7, 9, 10, 11, 99, 100, 101, 2147483647, 2147483646, 4294967295, 4294967294, 65535, 65536]; let x = 12345; for (let i = 0; i < 4000; i++) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; t.push(x); } return t; })();
function check(d, signed, mode) {
  const g = magic(d, signed); if (!g) return null;
  let m = g.m, s = g.s, claimed = d;
  if (mode === 'noadd') m = g.m & 0xFFFFFFFFn;
  if (mode === 'mult') { for (let k = 3; k <= 100 && claimed === d; k++) { const h = k !== d && magic(k, signed); if (h && h.m === g.m) claimed = k; } if (claimed === d) claimed = Math.round(2 ** (g.s + 1) / Number(g.m)); }
  let bad = 0, first = null;
  for (const u of TESTS) {
    const n = signed ? (u | 0) : u, want = Math.trunc(n / (mode === 'mult' ? d : d));
    const got = mode === 'mult' ? Math.trunc(n / claimed) : divBy(n, m, s, signed);
    if (got !== want) { bad++; if (first === null) first = { n, want, got }; }
  }
  return { m: g.m, s: g.s, big: g.m > 0xFFFFFFFFn, bad, first, claimed, e: g.m * BigInt(d) - (1n << BigInt(g.s)) };
}
const SW = [
  { n: 'linear_switch', cases: [0, 1, 2, 3, 4, 5, 6], vals: [10, 20, 30, 40, 50, 60, 70], consts: true },
  { n: 'table_switch', cases: [0, 1, 2, 3, 4, 5, 6], vals: [10, 20, 30, 40, 50, 60, 71], consts: true },
  { n: 'call_switch', cases: [0, 1, 2, 3, 4], vals: null, consts: false },
  { n: 'sparse_switch', cases: [1, 100, 10000, 1000000, 100000000], vals: [1, 2, 3, 4, 5], consts: true },
  { n: 'two_cases', cases: [3, 4], vals: [7, 9], consts: true },
];
function lower(sw, opt, minJT) {
  const range = sw.cases[sw.cases.length - 1] - sw.cases[0] + 1, dense = sw.cases.length * 100 >= range * 10;
  if (opt && sw.consts && sw.cases.length >= 3 && sw.cases.length * 100 >= range * 40) {
    const a = (sw.vals[1] - sw.vals[0]) / (sw.cases[1] - sw.cases[0]), b = sw.vals[0] - a * sw.cases[0];
    if (sw.cases.every((c, i) => a * c + b === sw.vals[i])) return { k: 'linear map', d: `${a}·k + ${b}, no table` };
    return { k: 'lookup table', d: `${sw.cases.length} values in .rodata, no jump` };
  }
  if (opt && sw.consts && sw.cases.length < 3) return { k: 'select chain', d: 'setcc and cmov, no branch' };
  if (sw.cases.length >= minJT && dense) return { k: 'jump table', d: `${range} entries, jmp *%rax` };
  return { k: opt ? 'comparison tree' : 'compare chain', d: dense ? `${sw.cases.length} cases < ${minJT} needed for a table` : `density ${(sw.cases.length * 100 / range).toExponential(0)}% < 10%` };
}
const hx = b => '0x' + b.toString(16).toUpperCase();

export default {
  slug: 'compiler-idioms-and-optimization',
  title: 'Compiler idioms: read the shape back to the source',
  description: 'An optimising compiler swaps the student\'s divisions, switches and loops for faster shapes. Decode each one back, and check it.',
  overview: 'Compilers replace source constructs with instruction shapes, and each shape has a derivation you can run backwards. Division by a constant d becomes a multiply and shift: pick the smallest shift s from 32 upward with m = ⌈2^s / d⌉ and error m·d − 2^s no more than 2^(s−32) for unsigned values (2^(s−31) for signed ones, which also add the sign bit). Unsigned divide by 10 is 0xCCCCCCCD with shift 35; by 7 the multiplier needs 33 bits, so the code multiplies by the low 32 bits and adds the dividend back; signed divide by 3 is 0x55555556 with shift 32. A multiplier alone names no divisor: 0x66666667 is 10 with shift 34 and 5 with shift 33. Modulo follows the quotient: x − (x / d)·d. A switch takes one of five shapes. At -O1 and above, a switch whose cases all return constants becomes a lookup table, or plain arithmetic when the values form a line; one that remains becomes a jump table when it has at least four entries and is dense enough, otherwise a comparison tree; two cases become a branchless select. At -O2, a summing loop is vectorised: four 32-bit lanes in two registers add eight values per iteration, a mask rounds the count down to a multiple of eight, the lanes are folded together, and a scalar loop finishes the remainder. Report each idiom with the instructions that show it and the source form it decodes to, then check the arithmetic.',
  keywords: ['compiler optimisation', 'magic number division', 'switch lowering', 'jump table', 'vectorisation', 'reverse engineering', 'LLVM'],
  orient: 'landscape',
  view: { target: [-0.5, 0.25, 0], dir: [0.35, 0.95, 1.25], half: 1.2, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { d: 10, signed: false, mode: 'ok', opt: 1, minJT: 4, n: 29, rem: true }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* division: 120 test inputs as cells, low green where the multiply-and-shift equals x / d, tall coral where it doesn't */
    const dp = P.box(1.5, 0.03, 0.55, '#FFFFFF', { r: 0.03 }); dp.position.set(-2.0, 0, -0.45); S.add(dp);
    const dim = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 120); dim.frustumCulled = false; dim.userData.noFit = true; S.add(dim);
    const divLamp = P.lamp(GOOD, { h: 0.5, r: 0.1 }); divLamp.position.set(-2.95, 0, -0.45); S.add(divLamp);
    /* switch: one block per switch, its shape set by what the compiler chose: flat slab a linear map, a grid of cubes a lookup table, a tall post a jump table, a branching stack a tree */
    const SC = { 'linear map': '#1F9E89', 'lookup table': '#5B8DB8', 'jump table': '#C9A227', 'comparison tree': '#7B6FA8', 'compare chain': '#8E8C84', 'select chain': '#E07A5F' };
    const SH = { 'linear map': [0.5, 0.08, 0.3], 'lookup table': [0.4, 0.25, 0.3], 'jump table': [0.18, 0.6, 0.18], 'comparison tree': [0.35, 0.45, 0.35], 'compare chain': [0.5, 0.18, 0.18], 'select chain': [0.3, 0.3, 0.3] };
    const srows = SW.map((w, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(1, 1, 1, '#fff', { r: 0.02, material: mm }); b.position.set(-0.75 + i * 0.6, 0, 0.45); S.add(b); return { b, mm }; });
    const sw = P.box(SW.length * 0.6 + 0.1, 0.03, 0.6, '#FFFDF5', { r: 0.03 }); sw.position.set(-0.75 + (SW.length - 1) * 0.3, 0, 0.45); S.add(sw);
    /* the loop: one cell per number 1..n; teal in the vector loop (in two shades for the two accumulators), gold in the remainder loop, red if never added */
    const LX = 0.4, lp = P.box(1.7, 0.03, 0.8, '#FFFFFF', { r: 0.03 }); lp.position.set(LX + 0.75, 0, -0.45); S.add(lp);
    const lim = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 64); lim.frustumCulled = false; lim.userData.noFit = true; S.add(lim);
    S.add(P.keep(-3.05, 2.0, 0.9, -0.85, 0.85));

    let C = null, Lp = null;
    function loop() {
      const n = st.n, vec = n > 7 ? Math.floor(n / 8) : 0, done = vec * 8, rem = n - done, want = n * (n + 1) / 2;
      let got = 0; for (let i = 1; i <= done; i++) got += i; if (st.rem) for (let i = done + 1; i <= n; i++) got += i;
      return { n, vec, done, rem, want, got };
    }
    function draw() {
      C = check(st.d, st.signed, st.mode);
      const sh = st.mode === 'noadd' ? ' (add-back dropped)' : '';
      const sample = TESTS.slice(0, 120);
      sample.forEach((u, i) => { const n = st.signed ? (u | 0) : u, want = Math.trunc(n / st.d), m = st.mode === 'noadd' ? C.m & 0xFFFFFFFFn : C.m, got = st.mode === 'mult' ? Math.trunc(n / C.claimed) : divBy(n, m, C.s, st.signed), ok = got === want; dummy.position.set(-2.7 + (i % 20) * 0.07, 0.03, -0.65 + Math.floor(i / 20) * 0.08); dummy.scale.set(0.055, ok ? 0.05 : 0.22, 0.06); dummy.updateMatrix(); dim.setMatrixAt(i, dummy.matrix); dim.setColorAt(i, col.set(ok ? GOOD : BAD)); });
      dim.instanceMatrix.needsUpdate = true; dim.instanceColor.needsUpdate = true;
      divLamp.userData.set({ color: C.bad ? RED : GOOD, on: true });
      SW.forEach((w, i) => { const r = lower(w, st.opt, st.minJT), R = srows[i], d = SH[r.k] || [0.3, 0.3, 0.3]; R.mm.color.set(SC[r.k]); R.b.scale.set(d[0], d[1], d[2]); R.b.position.y = 0.03; });
      Lp = loop();
      for (let i = 0; i < 64; i++) { if (i >= Lp.n) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); lim.setMatrixAt(i, dummy.matrix); continue; } const inVec = i < Lp.done, acc = Math.floor((i % 8) / 4); dummy.position.set(LX + 0.05 + (i % 16) * 0.1, 0.03, -0.75 + Math.floor(i / 16) * 0.2); dummy.scale.set(0.08, inVec ? 0.22 : st.rem ? 0.14 : 0.04, 0.16); dummy.updateMatrix(); lim.setMatrixAt(i, dummy.matrix); lim.setColorAt(i, col.set(inVec ? (acc ? '#1F9E89' : '#5BB8A8') : st.rem ? SAF : RED)); }
      lim.instanceMatrix.needsUpdate = true; lim.instanceColor.needsUpdate = true;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Divisor', min: 3, max: 100, step: 1, get: () => st.d, set: v => { let d = Math.round(v); if ((d & (d - 1)) === 0) d++; set({ d }); }, fmt: v => String(Math.round(v)) },
      { type: 'toggle', label: 'Signed int', short: 'Signed', get: () => st.signed, set: v => set({ signed: !!v }) },
      { type: 'buttons', label: 'Optimisation', options: ['-O0', '-O2'], get: () => st.opt, act: i => set({ opt: i }) },
      { type: 'slider', label: 'Minimum jump-table entries', min: 2, max: 8, step: 1, get: () => st.minJT, set: v => set({ minJT: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'slider', label: 'n for sum_n', min: 1, max: 64, step: 1, get: () => st.n, set: v => set({ n: Math.round(v) }), fmt: v => String(Math.round(v)) },
    ];
    const readouts = [
      { label: 'Magic', get: () => ({ v: hx(C.m), sub: `shift ${C.s}${C.big ? ', 33 bits' : ''}` }) },
      { label: 'Divide check', get: () => ({ v: C.bad ? `${C.bad} wrong` : 'exact', sub: `${TESTS.length} inputs`, bad: C.bad > 0, good: !C.bad }) },
      { label: 'sum_n', get: () => ({ v: Lp.got === Lp.want ? 'correct' : `${Lp.want - Lp.got} short`, sub: `${Lp.vec} vector, ${Lp.rem} scalar`, good: Lp.got === Lp.want, bad: Lp.got !== Lp.want }) },
    ];
    const labels = [
      { name: 'div', t: 'Division by a constant', d: '120 inputs: low green where the multiply-and-shift equals x / d, tall coral where it doesn\'t; the lamp sums it up', icon: 'check', atV: V(-2.95, 0.6, -0.45) },
      { name: 'sw', t: 'What each switch became', d: 'Slab: linear map. Block: lookup table. Tall post: jump table. Stack: comparison tree. Low bar: compare chain', icon: 'layers', atV: V(-0.75 - 0.35, 0.15, 0.45) },
      { name: 'loop', t: 'The summing loop', d: 'One cell per number: teal in the 8-wide vector loop (two shades, two accumulators), gold in the remainder loop, red if never added', icon: 'gauge', atV: V(LX + 1.65, 0.2, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read the multiplier without its shift', hint: '0x66666667 "is always 10"', on: () => set({ ...D0, d: 5, signed: true, mode: 'mult' }), off: reset },
      { label: 'Drop the add-back', hint: '33-bit multiplier for 7', on: () => set({ ...D0, d: 7, mode: 'noadd' }), off: reset },
      { label: 'Forget the remainder loop', hint: 'only multiples of 8', on: () => set({ ...D0, rem: false }), off: reset },
    ];
    function status() {
      if (st.mode === 'mult') return { ok: false, msg: `<b>Read by its multiplier alone, ${hx(C.m)} looks like a divide by ${C.claimed}, but the shift here is ${C.s}: ${C.bad} of ${TESTS.length} inputs disagree with x / ${st.d}.</b> A multiplier names no divisor on its own: 0x66666667 is 10 with shift 34 and 5 with shift 33. Pair the multiplier with the total shift, then confirm: the search from the divisor must give back the same pair.` };
      if (st.mode === 'noadd') return { ok: false, msg: C.big ? `<b>Without the add-back, the multiply uses only the low 32 bits of a 33-bit multiplier, and ${C.bad} of ${TESTS.length} inputs come out wrong${C.first ? `, first ${C.first.n}: ${C.first.got} instead of ${C.first.want}` : ''}.</b> For 7, m = ⌈2^35 / 7⌉ = 0x124924925 doesn't fit in 32 bits. clang multiplies by 0x24924925, then computes ((n − t) >> 1 + t) >> 2 to put the missing 2^32·n back. Read the whole sequence, not just the multiply.` : `<b>This divisor's multiplier fits in 32 bits, so there's no add-back to drop.</b> Try 7.` };
      if (!st.rem && Lp.got !== Lp.want) return { ok: false, msg: `<b>With only the vector loop, sum_n adds ${Lp.done} of ${Lp.n} values and comes out ${Lp.want - Lp.got} short.</b> andl $0x7ffffff8 rounds n down to a multiple of 8 for the vector loop; the scalar loop after the reduction adds the last ${Lp.rem}. A vectorised loop always comes with its remainder.` };
      return { ok: true, msg: `<b>${st.signed ? 'int' : 'unsigned'} x / ${st.d} is (x × ${hx(C.m)}) >> ${C.s}${st.signed ? ' plus the sign bit' : ''}${C.big ? ', with an add-back for the 33rd bit' : ''}: exact on all ${TESTS.length} inputs.</b> At -O${st.opt ? 2 : 0}: ${SW.map(w => `${w.n.replace('_switch', '').replace('two_cases', 'two cases')} → ${lower(w, st.opt, st.minJT).k}`).join(', ')}. sum_n with n = ${Lp.n}: ${Lp.vec} vector iterations and ${Lp.rem} scalar.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Cheaper shapes', home: true, say: 'An optimising compiler swaps divisions, switches and loops for cheaper shapes. Each one can be worked backwards to the source.', act: m => m.set({ d: 10, signed: false, mode: 'ok', opt: 0, minJT: 4, n: 29, rem: true }) },
    { t: 'A divide is a multiply', home: true, say: 'Divide by ten becomes a multiply by a magic number and a shift. The smallest shift that keeps the error small enough gives the exact constant the compiler used.', act: m => m.set({ opt: 2 }) },
    { t: 'Thirty-three bits', home: true, say: 'For seven, the multiplier needs thirty-three bits. The compiler multiplies by the low part and adds the number back.', act: m => m.set({ d: 7 }) },
    { t: 'Five shapes of switch', home: true, say: 'Constant cases become a table, or plain arithmetic when they form a line. Calls become a jump table. Sparse cases become a comparison tree.', act: m => m.set({ d: 10 }) },
    { t: 'Eight at a time', home: true, say: 'The summing loop adds eight numbers per step, four lanes in each of two registers.', act: m => m.set({ n: 29 }) },
    { t: 'The leftovers', home: true, say: 'A second, plain loop adds whatever doesn\'t fill a group of eight. Leave it out, and the sum comes up short.', act: m => m.set({ rem: false }) },
  ],
  check: [
    { q: 'You see imul by 0x66666667 then a shift. What is the divisor?', options: ['It depends on the shift: 10 with 34, 5 with 33', 'Always 10', '0x66666667'], answer: 0, why: 'Pair the multiplier with the total shift.', hint: 'Try Read the multiplier without its shift.' },
    { q: 'A switch\'s seven cases all return constants. At -O2, what does it usually become?', options: ['A lookup table, or arithmetic if the values form a line', 'A jump table', 'Seven compares'], answer: 0, why: 'SimplifyCFG builds value tables at -O1 and above.', hint: 'Switch -O0 and -O2.' },
    { q: 'A vectorised sum handles 8 values per iteration. What else must be there?', options: ['A remainder loop for the last n mod 8', 'Nothing', 'A second vector loop'], answer: 0, why: 'The trip count is masked to a multiple of 8.', hint: 'Try Forget the remainder loop.' },
  ],
  terms: [
    ['Idiom', 'An instruction shape a compiler emits for one source construct.'],
    ['Magic number', 'The multiplier that replaces a division by a constant.'],
    ['Lookup table', 'A switch turned into an array of its return values.'],
    ['Jump table', 'An array of code addresses, one per case.'],
    ['Vectorisation', 'Doing the same operation on several values in one register.'],
    ['Remainder loop', 'The scalar loop that finishes what the vector loop leaves.'],
  ],
  deeper: '<p><b>Modulo.</b> x % 10 is x − (x / 10) × 10; x86-64 multiplies back with add and lea, AArch64 with one msub. Signed x % 8 biases negative values by 7 before masking, so it rounds toward zero.</p><p><b>The idiom belongs to the instruction selector.</b> At -O0, clang\'s fast selector uses divl; the same -O0 function can still contain a magic multiply where a block went through the full selector.</p><p><b>More idioms.</b> Tail calls become jmp; small callees are inlined; a ? b : c becomes cmov or csel; loops that fill or copy become memset and memcpy.</p><p><b>About this machine.</b> Multipliers, shifts and the divide check are computed live with BigInt; the switch shapes come from LLVM\'s rules applied to the five switches in idioms.c, and match the course\'s -O0 and -O2 x86-64 builds.</p>',
  code: {
    title: 'Find the magic, then get the divisor back',
    note: 'Adapted from the course\'s compiler-idioms lesson.',
    text: `
def magic_numbers(d, bits=32, signed=False):
    for s in range(bits, 2 * bits):
        m = -(-(1 << s) // d)                    # ceil(2^s / d)
        e = m * d - (1 << s)
        if e <= 1 << (s - bits + (1 if signed else 0)):
            return m, s

def divisor_from_magic(m, s):
    for d in ((1 << s) // m, (1 << s) // m + 1):
        if d > 1 and magic_numbers(d)[0] == m and magic_numbers(d)[1] == s:
            return d

assert magic_numbers(10) == (0xCCCCCCCD, 35)
assert magic_numbers(7) == (0x124924925, 35)
assert magic_numbers(3, signed=True) == (0x55555556, 32)
`,
  },
};
