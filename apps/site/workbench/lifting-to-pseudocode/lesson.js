// Lifting to pseudocode: the student's own ledger.c, compiled at -O1, lifted back step by step: bytes → instructions → a small IR → SSA (one name per definition)
// → simplify → types from use → structured C. Two functions: percent_change(before, after) and grade(score), whose switch on score / 10 compiles with no divide:
// imulq $0x66666667, then sarq $34 on a copy, shrq $63 for the sign, added together. That is trunc(x / 10) for every 32-bit x; checked here with BigInt over −1000..1000.
// Dropping the shrq $63 term gives one less for every negative score (m is a little over 2^34/10, so even −1000 lands just below −100).
// A decompiler's first answer for percent_change (16-byte return, a third parameter) is consistent with the bytes but not with the source; the calling convention
// (two ints in edi, esi; the result in eax) gives the true signature. Without SSA, the register eax names two different values and substitution mixes them up.
const M = 0x66666667n;
function divLifted(x, sign) {
  const p = BigInt(x) * M;
  const hi = Number(p >> 34n);
  const s = sign ? (p < 0n ? 1 : 0) : 0;
  return hi + s;
}
function check(sign) {
  let bad = 0, first = null;
  for (let x = -1000; x <= 1000; x++) { const t = Math.trunc(x / 10), l = divLifted(x, sign); if (t !== l) { bad++; if (first === null) first = x; } }
  return { bad, first };
}

export default {
  slug: 'lifting-to-pseudocode',
  title: 'Lifting: from machine code back to readable C',
  description: 'The student lifts their own compiled functions back to C, stage by stage, and checks a strange multiply really is a divide by ten.',
  overview: 'A decompiler is a pipeline, and knowing its stages tells you when to trust it. Decoded instructions are lifted into a small intermediate language where hidden effects become explicit: flags become a variable set by cmp and read by the jump, a sign-extend and divide become one operation, stack slots at low optimisation become local variables, and relocations become symbol names. Parameters come from the calling convention (on x86-64 Linux the first integer arguments arrive in edi and esi, and the result leaves in eax). Static single assignment then gives every definition its own name, because a register such as eax holds different values at different moments; simplification (substituting, folding constants, removing dead code) is only safe on those names. Compilers replace division by a constant with a multiply and shifts: (x × 0x66666667) >> 34, plus the sign bit of the product, equals x / 10 truncated toward zero for every 32-bit x; recognising it turns noise into intent, while leaving the raw form is always honest. Types come from use: a scaled load through a value makes it a pointer. Structuring turns the graph back into if, while and switch. A decompiler\'s output is a hypothesis consistent with the bytes; check it against the instructions.',
  keywords: ['decompilation', 'lifting', 'static single assignment', 'magic number division', 'type recovery', 'reverse engineering', 'Ghidra'],
  orient: 'landscape',
  view: { target: [-0.5, 0.3, 0.1], dir: [0.4, 0.85, 1.3], half: 1.3, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fn: 1, sign: true, magic: true, cc: true, ssa: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the pipeline: seven stations along a belt (bytes, instructions, IR, SSA, simplify, types, structure), each a little taller; a lamp each */
    const SC7 = ['#8E8C84', '#5B8DB8', '#7B6FA8', '#1F9E89', '#C9A227', '#E07A5F', '#2C2D31'], SX = i => -2.4 + i * 0.62, SZ = -0.55;
    const belt = P.belt(V(-2.75, 0, SZ + 0.38), V(1.6, 0, SZ + 0.38), { speed: 0.8, w: 0.3 }); S.add(belt);
    const lamps = SC7.map((c, i) => { const b = P.box(0.42, 0.2 + i * 0.06, 0.34, c, { r: 0.04 }); b.position.set(SX(i), 0, SZ); S.add(b); const l = P.lamp(GOOD, { h: 0.3 + i * 0.06, r: 0.07 }); l.position.set(SX(i) + 0.28, 0, SZ - 0.1); S.add(l); return l; });
    /* the division check: one bar per score from −1000 to 1000, low teal where (x × m) >> 34 matches x / 10, tall coral where it doesn't */
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 201); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const cp = P.box(3.3, 0.03, 0.4, '#FFFFFF', { r: 0.03 }); cp.position.set(-0.6, 0, 0.75); S.add(cp);
    S.add(P.keep(-2.8, 1.75, 0.9, -0.85, 1.0));

    let C = null, clock = 0;
    function draw() {
      C = check(st.sign);
      const fail = st.fn === 1 ? [false, false, false, false, !st.sign || !st.magic, false, false] : [false, false, false, !st.ssa, false, !st.cc, false];
      lamps.forEach((l, i) => l.userData.set({ color: fail[i] ? RED : GOOD, on: true }));
      for (let i = 0; i <= 200; i++) { const x = -1000 + i * 10 + 3, ok = Math.trunc(x / 10) === divLifted(x, st.sign); dummy.position.set(-2.2 + i * 0.016, 0.03, 0.75); dummy.scale.set(0.012, ok ? 0.05 : 0.3, 0.26); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set(ok ? GOOD : BAD)); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    }
    draw();
    let nxt = 0;
    const update = dt => { belt.userData.tick(dt); clock += dt; if (clock > nxt) { nxt = clock + 2.2; belt.userData.send(SAF, { size: 0.18 }); } };
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Function', options: ['percent_change', 'grade'], get: () => st.fn, act: i => set({ fn: i }) },
      { type: 'toggle', label: 'Keep the sign correction', short: 'Sign fix', get: () => st.sign, set: v => set({ sign: !!v }) },
      { type: 'toggle', label: 'Recognise the divide-by-10 multiply', short: 'Recognise /10', get: () => st.magic, set: v => set({ magic: !!v }), quick: false },
      { type: 'toggle', label: 'Signature from the calling convention', short: 'Calling convention', get: () => st.cc, set: v => set({ cc: !!v }) },
      { type: 'toggle', label: 'One name per value (SSA)', short: 'SSA', get: () => st.ssa, set: v => set({ ssa: !!v }) },
    ];
    const readouts = [
      { label: 'Divide check', get: () => ({ v: C.bad ? `${C.bad} wrong` : 'exact', sub: 'over 2,001 scores', bad: C.bad > 0, good: !C.bad }) },
      { label: 'Magic', get: () => ({ v: '0x66666667', sub: '⌈2^34 / 10⌉' }) },
      { label: 'Signature', get: () => ({ v: st.cc ? '2 ints → int' : '3 args → 16 bytes', sub: 'percent_change', bad: !st.cc, good: st.cc }) },
    ];
    const labels = [
      { name: 'pipe', t: 'The lifting pipeline', d: 'Bytes, instructions, IR, SSA, simplify, types, structured C; a lamp turns red at the stage that went wrong', icon: 'layers', atV: V(-2.68, 0.1, SZ) },
      { name: 'div', t: 'The divide check', d: 'Every tenth score from −1000 to 1000: tall coral bars are where the lifted multiply disagrees with x / 10', icon: 'check', atV: V(1.1, 0.1, 0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Drop the sign correction', hint: 'simplify away shrq $63', on: () => set({ ...D0, fn: 1, sign: false }), off: reset },
      { label: 'Trust the decompiler\'s signature', hint: '16-byte return, third parameter', on: () => set({ ...D0, fn: 0, cc: false }), off: reset },
      { label: 'Simplify without SSA', hint: 'one name, two values', on: () => set({ ...D0, fn: 0, ssa: false }), off: reset },
    ];
    function status() {
      if (st.fn === 1 && !st.sign) return { ok: false, msg: `<b>Without the shrq $63 term, the lifted code rounds down instead of toward zero: ${C.bad} of 2,001 scores come out wrong, every negative one a step too low.</b> C rounds division toward zero; the arithmetic shift rounds down. Adding the product's sign bit fixes negative inputs. A simplification must hold for every input, not just the ones you tried.` };
      if (st.fn === 0 && !st.cc) return { ok: false, msg: '<b>The decompiler\'s first answer gives percent_change a 16-byte return and a third parameter the source never had.</b> Both are consistent with the bytes (rdx is written by cltd), but not with the calling convention: two ints arrive in edi and esi and one int leaves in eax. Treat decompiler output as a hypothesis and check it against the instructions.' };
      if (st.fn === 0 && !st.ssa) return { ok: false, msg: '<b>Without SSA, both values that pass through eax share one name, and substitution produced "eax / eax".</b> A register is a place, not a value. Give every definition its own name (eax_1, eax_2) before simplifying, and the true expression falls out: (after − before) × 100 / before.' };
      return { ok: true, msg: st.fn === 1 ? '<b>grade lifts to switch (score / 10), and the multiply by 0x66666667 is checked exact on every score.</b> The multiply-and-shift is the compiler\'s division by a constant; the sign-bit term makes it round toward zero like C. With recognition off, the raw form is still correct, and more honest about what the machine does.' : '<b>percent_change lifts to (after − before) × 100 / before, guarded by before == 0.</b> The signature came from the calling convention, the two values in eax got their own names, and cltd plus idivl became one signed divide.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A pipeline, not magic', home: true, say: 'The student lifts their own compiled functions back to C, stage by stage: instructions, a small intermediate language, one name per value, simplification, types, structure.', act: m => m.set({ fn: 0, sign: true, magic: true, cc: true, ssa: true }) },
    { t: 'Signatures from the convention', home: true, say: 'Two ints arrive in two registers and one int leaves in another. That, not the decompiler\'s first guess, gives the function\'s true signature.', act: m => m.set({ cc: true }) },
    { t: 'A guessed signature', home: true, say: 'The decompiler\'s first answer has a sixteen-byte return and a third parameter. Consistent with the bytes; wrong about the source.', act: m => m.set({ cc: false }) },
    { t: 'One name per value', home: true, say: 'A register holds different values at different moments. Give each its own name before simplifying, or the expression comes out as nonsense.', act: m => m.set({ cc: true, ssa: false }) },
    { t: 'A strange multiply', home: true, say: 'In grade, there is no divide: a multiply by hex 66666667 and a shift by 34. Checked over two thousand scores, it is exactly divide by ten.', act: m => m.set({ ssa: true, fn: 1, sign: true }) },
    { t: 'Every input, not some', home: true, say: 'Drop the sign-bit term while simplifying, and negative scores round the wrong way. A simplification must hold for every input.', act: m => m.set({ sign: false }) },
  ],
  check: [
    { q: 'What is (x × 0x66666667) >> 34 plus the product\'s sign bit?', options: ['x / 10, rounded toward zero, for every 32-bit x', 'x × 10', 'A random number'], answer: 0, why: '0x66666667 is the ceiling of 2^34 / 10.', hint: 'Look at the divide check.' },
    { q: 'Why rename into SSA before simplifying?', options: ['A register holds different values at different times; each needs its own name', 'It is faster', 'Decompilers require it'], answer: 0, why: 'Otherwise substitution mixes values.', hint: 'Try Simplify without SSA.' },
    { q: 'A decompiler shows a parameter the source doesn\'t have. What now?', options: ['Check the calling convention and the instructions; the output is a hypothesis', 'Trust it', 'Add the parameter to the source'], answer: 0, why: 'Consistent with the bytes is not the same as right.', hint: 'Try Trust the decompiler\'s signature.' },
  ],
  terms: [
    ['Lifting', 'Turning machine instructions into an intermediate language with explicit effects.'],
    ['IR', 'Intermediate representation: a small, regular language between assembly and C.'],
    ['SSA', 'Static single assignment: every value defined exactly once, under its own name.'],
    ['Magic number division', 'A multiply and shift a compiler uses instead of dividing by a constant.'],
    ['Calling convention', 'The rule for which registers carry arguments and the result.'],
    ['Structuring', 'Turning a control-flow graph back into if, while and switch.'],
  ],
  deeper: '<p><b>Flags are a variable.</b> cmp sets flags and a later jump reads them; lifting makes that a named value, so conditions like ja become an unsigned comparison you can read.</p><p><b>Types from use.</b> A value used as the base of a scaled load is a pointer; 32-bit definitions suggest int. Research tools solve type recovery as constraints with upper and lower bounds rather than one guess.</p><p><b>Check by recompiling.</b> The strongest test of a lift is to compile it and compare outputs with the original on many inputs; the next lesson does exactly that.</p><p><b>About this machine.</b> The divide check is computed live with 64-bit arithmetic (BigInt) over every score from −1000 to 1000; the listings are those clang emits for the course\'s ledger.c at -O1.</p>',
  code: {
    title: 'Check a magic divisor',
    note: 'Adapted from the course\'s lifting lesson.',
    text: `
def lifted_div10(x: int) -> int:
    p = x * 0x66666667                 # 64-bit product
    q = p >> 34                        # arithmetic shift: floor
    return q + (1 if p < 0 else 0)     # shrq $63: round toward zero, like C

def c_div10(x: int) -> int:
    return int(x / 10)                 # truncation

assert all(lifted_div10(x) == c_div10(x) for x in range(-2**31, 2**31, 9973))
`,
  },
};
