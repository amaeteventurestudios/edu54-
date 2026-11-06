// Rebuild and prove equal: the student rebuilds percent_change and grade from their compiled ledger.c and proves each rebuild with two legs.
// Leg one runs the original and the rebuild over a 92-cell grid (10 befores × 7 afters, 22 scores) with C semantics in 32 bits: wrapping multiply,
// idivl that traps on INT_MIN / −1 (x86-64) or returns INT_MIN (arm64 sdiv). Leg two compares compiled sizes and masked bytes (from the course's clang -O1 builds)
// and reads the five table constants the relocation points at. A proof is fail-closed: any fail wins, then unknown.
const w32 = x => x | 0, MIN = -2147483648;
function idiv(a, b, arch) { if (b === 0) return 'trap'; if (a === MIN && b === -1) return arch ? MIN : 'trap'; return w32(Math.trunc(a / b)); }
const PCT = [
  { name: 'listing: 100 * (after - before) / before', src: 'int percent_change(int before, int after)\n{\n  if (before == 0) return 0;\n  return 100 * (after - before) / before;\n}', f: (a, b, arch) => a === 0 ? 0 : idiv(w32(Math.imul(100, w32(b - a))), a, arch), size: 16 },
  { name: 'pseudocode: the long', src: 'int percent_change(int before, int after)\n{\n  if (before == 0) return 0;\n  return (int)(((long)after - before)\n              * 100 / before);\n}', f: (a, b) => a === 0 ? 0 : w32(Number((BigInt(b) - BigInt(a)) * 100n / BigInt(a))), size: 26 },
  { name: 'divide first', src: 'int percent_change(int before, int after)\n{\n  if (before == 0) return 0;\n  return (after - before) / before * 100;\n}', f: (a, b, arch) => { if (a === 0) return 0; const q = idiv(w32(b - a), a, arch); return q === 'trap' ? q : w32(Math.imul(q, 100)); }, size: 18 },
];
const T0 = [1, 2, 3, 4, 4];
function gradeSwitch(x, tab) { const t = Math.trunc(x / 10), i = (t - 6) >>> 0; return i > 4 ? 0 : tab[i]; }
const GRD = [
  { name: 'switch (score / 10)', src: 'switch (score / 10) {\ncase 10: case 9: return 4;\ncase 8: return 3;\ncase 7: return 2;\ncase 6: return 1;\ndefault: return 0;\n}', f: x => gradeSwitch(x, T0), size: 46, table: T0 },
  { name: 'thresholds', src: 'if (score >= 90) return 4;\nif (score >= 80) return 3;\nif (score >= 70) return 2;\nif (score >= 60) return 1;\nreturn 0;', f: x => x >= 90 ? 4 : x >= 80 ? 3 : x >= 70 ? 2 : x >= 60 ? 1 : 0, size: 39, table: null },
  { name: 'case 10 returns 3', src: 'switch (score / 10) {\ncase 10: return 3;\ncase 9: return 4;\ncase 8: return 3;\ncase 7: return 2;\ncase 6: return 1;\ndefault: return 0;\n}', f: x => gradeSwitch(x, [1, 2, 3, 4, 3]), size: 46, table: [1, 2, 3, 4, 3] },
];
const BEF = [0, 1, -1, 3, -3, 7, 100, -100, 2147483647, MIN], AFT = [0, 5, -5, 105, 536870911, 2147483647, MIN];
const SCORES = [-2147483648, -10, -9, -1, 0, 9, 59, 60, 61, 69, 70, 79, 80, 89, 90, 99, 100, 101, 109, 110, 2147483647, 55];
const NAIVE = [[100, 150], [200, 100], [0, 5], [50, 100]], NAIVE_G = [95, 85, 75, 65, 55, 100];
function overflows(a, b) { const d = BigInt(b) - BigInt(a); return a !== 0 && (d * 100n > 2147483647n || d * 100n < -2147483648n || d > 2147483647n || d < -2147483648n); }
function run(st) {
  const P = PCT[st.pc], G = GRD[st.gr], cells = [];
  if (st.grid) {
    BEF.forEach(a => AFT.forEach(b => { const ov = overflows(a, b); if (st.skipOv && ov) return; cells.push({ k: 'p', a, b, o: PCT[0].f(a, b, st.arch), r: P.f(a, b, st.arch), ov }); }));
    SCORES.forEach(x => cells.push({ k: 'g', a: x, o: GRD[0].f(x), r: G.f(x) }));
  } else {
    NAIVE.forEach(([a, b]) => cells.push({ k: 'p', a, b, o: PCT[0].f(a, b, st.arch), r: P.f(a, b, st.arch) }));
    NAIVE_G.forEach(x => cells.push({ k: 'g', a: x, o: GRD[0].f(x), r: G.f(x) }));
  }
  cells.forEach(c => { c.ok = c.o === c.r; });
  const bad = cells.filter(c => !c.ok), traps = cells.filter(c => c.o === 'trap').length;
  const pBytes = P.size === 16, gBytes = G.size === 46, tab = !G.table ? null : G.table.join() === T0.join();
  const gConst = !gBytes ? 'fail' : st.consts ? (tab ? 'pass' : 'fail') : 'pass';
  const claims = { 'percent_change behaviour': bad.some(c => c.k === 'p') ? 'fail' : 'pass', 'grade behaviour': bad.some(c => c.k === 'g') ? 'fail' : 'pass', 'percent_change bytes': pBytes ? 'pass' : 'fail', 'grade bytes': gBytes ? 'pass' : 'fail', 'grade constants': gConst };
  const vals = Object.values(claims), verdict = vals.includes('fail') ? 'fail' : vals.includes('unknown') ? 'unknown' : 'pass';
  return { cells, bad, traps, claims, verdict, tab };
}
const fmt = v => v === 'trap' ? 'trap' : String(v);

export default {
  slug: 'rebuild-and-prove-equal',
  title: 'Rebuild it, then prove it equal',
  description: 'The student rewrites two compiled functions in C and proves each rewrite equal: run both on a grid of inputs, then compare bytes and constants.',
  overview: 'Passing your own tests proves agreement on those tests. To prove a rebuilt function equal to the original, use two legs. First, differential testing: run the original and the rebuild side by side on a grid designed to reach every hazard (the zero guard, negative values, C\'s division rounding toward zero, multiply-before-divide rounding, 32-bit overflow, and the one input where the hardware divide traps), with the compiled original as the judge. Second, recompile the rebuild with the same compiler and flags and compare the function\'s bytes, after masking the fields a relocation will fill in; then read the constants each relocation points at, because two functions with identical code bytes can still point at different tables. A rebuild copied from the decompiler\'s pseudocode, which widened the arithmetic to 64 bits, passes four hand-written tests and fails 26 overflow cells (27 on x86-64, where the trap cell differs too); a rebuild that uses score thresholds misses that the original returns 0 above 109; a rebuild with one wrong table entry matches byte for byte. Overflow is undefined in C source, but the compiled original has one fixed behaviour, so those cells belong in the grid; the trap itself depends on the chip. The proof is fail-closed: any failed claim fails it, and any unknown keeps it unknown.',
  keywords: ['differential testing', 'decompilation', 'binary equivalence', 'integer overflow', 'relocation', 'reverse engineering', 'verification'],
  orient: 'landscape',
  view: { target: [-0.4, 0.25, 0.05], dir: [0.35, 0.9, 1.3], half: 1.3, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pc: 0, gr: 0, grid: true, skipOv: false, consts: true, arch: 0 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    /* leg one: run both versions on the grid; a cell per input, low green where they agree, tall coral where they don't */
    const gp = P.box(2.0, 0.03, 1.9, '#FFFDF5', { r: 0.03 }); gp.position.set(-1.6, 0, 0.05); S.add(gp);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 92); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* leg two: compiled sizes as two pairs of towers (original grey, rebuild teal), and the five table constants as bars, original and rebuild */
    const RX = 0.15, sz = [0, 1].map(j => [0, 1].map(k => { const t = P.tower(0.22, 0.22, k ? GOOD : '#9A968C'); t.position.set(RX + j * 0.6 + k * 0.26, 0, -0.55); t.userData.set({ cap: '' }); S.add(t); return t; }));
    const tabs = [0, 1].map(j => Array.from({ length: 5 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: j ? GOOD : '#9A968C' }), b = P.box(0.16, 1, 0.16, '#fff', { r: 0.02, material: mm }); b.position.set(RX - 0.05 + i * 0.22, 0, 0.25 + j * 0.24); S.add(b); return { b, mm }; }));
    const verdict = P.lamp(GOOD, { h: 0.7, r: 0.14 }); verdict.position.set(1.55, 0, 0.0); S.add(verdict);
    S.add(P.keep(-2.65, 1.75, 1.0, -0.95, 1.0));

    let R = null;
    function draw() {
      R = run(st);
      const Pc = PCT[st.pc], G = GRD[st.gr];
      const pc = R.cells.filter(c => c.k === 'p'), gc = R.cells.filter(c => c.k === 'g');
      let k = 0;
      pc.forEach((c, i) => { const n = st.grid ? BEF.indexOf(c.a) * 7 + AFT.indexOf(c.b) : i, x = n % 10, z = Math.floor(n / 10); dummy.position.set(-2.4 + x * 0.17, 0.03, -0.75 + z * 0.16); dummy.scale.set(0.13, c.ok ? 0.06 : 0.3, 0.12); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(c.ok ? (c.o === 'trap' ? SAF : GOOD) : BAD)); k++; });
      gc.forEach((c, i) => { const x = i % 11, z = Math.floor(i / 11); dummy.position.set(-2.45 + x * 0.155, 0.03, 0.62 + z * 0.16); dummy.scale.set(0.12, c.ok ? 0.06 : 0.3, 0.12); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(c.ok ? GOOD : BAD)); k++; });
      for (; k < 92; k++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      [[16, Pc.size], [46, G.size]].forEach(([o, r], j) => { sz[j][0].userData.set({ h: o / 50 }); sz[j][1].userData.set({ h: r / 50, color: r === o ? GOOD : BAD }); });
      const tv = G.table || [];
      tabs.forEach((row, j) => row.forEach((c, i) => { const v = j ? tv[i] : T0[i], miss = j && G.table && tv[i] !== T0[i], h = !st.consts && j ? 0.02 : v == null ? 0.02 : v * 0.1; c.b.scale.y = h; c.mm.color.set(!st.consts && j ? '#D9D4C7' : miss ? BAD : j ? GOOD : '#9A968C'); }));
      verdict.userData.set({ color: R.verdict === 'pass' ? GOOD : R.verdict === 'fail' ? RED : SAF, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'percent_change rebuild', options: ['Listing', 'Pseudocode', 'Divide first'], get: () => st.pc, act: i => set({ pc: i }) },
      { type: 'buttons', label: 'grade rebuild', options: ['Switch', 'Thresholds', 'Case 10 → 3'], get: () => st.gr, act: i => set({ gr: i }) },
      { type: 'toggle', label: 'Full input grid', short: 'Grid', get: () => st.grid, set: v => set({ grid: !!v }) },
      { type: 'buttons', label: 'Chip that runs it', options: ['x86-64', 'arm64'], get: () => st.arch, act: i => set({ arch: i }) },
      { type: 'toggle', label: 'Read the table constants', short: 'Constants', get: () => st.consts, set: v => set({ consts: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Grid', get: () => ({ v: `${R.cells.length - R.bad.length}/${R.cells.length}`, sub: 'cells agree', bad: R.bad.length > 0, good: !R.bad.length && st.grid && !st.skipOv }) },
      { label: 'Bytes', get: () => ({ v: `${PCT[st.pc].size} · ${GRD[st.gr].size}`, sub: 'vs 16 · 46', bad: PCT[st.pc].size !== 16 || GRD[st.gr].size !== 46, good: PCT[st.pc].size === 16 && GRD[st.gr].size === 46 }) },
      { label: 'Proof', get: () => ({ v: R.verdict, sub: 'fail-closed', bad: R.verdict === 'fail', good: R.verdict === 'pass' && st.grid && !st.skipOv && st.consts }) },
    ];
    const labels = [
      { name: 'leg1', t: 'Leg one: run both', d: 'Back: percent_change on 10 befores × 7 afters. Front: grade on 22 scores. Tall coral cells disagree; gold both trap', icon: 'check', atV: V(-2.65, 0.08, 0.05) },
      { name: 'leg2', t: 'Leg two: bytes and constants', d: 'Towers: compiled size, original grey, rebuild teal (coral if different). Bars: the five table constants', icon: 'code', atV: V(RX + 0.8, 0.5, -0.55) },
      { name: 'proof', t: 'The proof', d: 'Green pass, gold unknown, red fail: any fail wins', icon: 'target', atV: V(1.75, 0.4, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust four hand-written tests', hint: 'pseudocode rebuild, "verified"', on: () => set({ ...D0, pc: 1, gr: 1, grid: false }), off: reset },
      { label: 'Leave out the overflow cells', hint: '"undefined, so skip it"', on: () => set({ ...D0, pc: 1, skipOv: true }), off: reset },
      { label: 'Compare bytes, not the table', hint: 'one entry wrong', on: () => set({ ...D0, gr: 2, consts: false }), off: reset },
    ];
    function status() {
      const full = run({ ...st, grid: true, skipOv: false, consts: true });
      if (!st.grid && !R.bad.length && full.bad.length) return { ok: false, msg: `<b>All ${R.cells.length} hand-written tests pass, and the full grid would find ${full.bad.length} disagreements.</b> The tests sit in the comfortable middle: no overflow, nothing above 109. ${st.pc === 1 ? 'The pseudocode\'s long divides before it wraps, so every overflow cell differs; ' : ''}${st.gr === 1 ? 'the thresholds return 4 for 110, where the original\'s switch returns 0. ' : ''}Passing your tests proves agreement on your tests. ${PCT[st.pc].size !== 16 || GRD[st.gr].size !== 46 ? 'The byte sizes alone already disagree.' : ''}` };
      if (st.skipOv && !R.bad.length && full.bad.length) return { ok: false, msg: `<b>With the ${70 - R.cells.filter(c => c.k === 'p').length} overflow cells left out, the pseudocode rebuild agrees everywhere; with them in, ${full.bad.length} cells differ.</b> Overflow is undefined in C source, but the original is compiled code with one fixed behaviour: a 32-bit multiply that wraps. The judge is the binary, so those cells belong in the grid. The size check (26 vs 16 bytes) disagrees too.` };
      if (!st.consts && st.gr === 2) return { ok: false, msg: '<b>The case-10 rebuild compiles to the same 46 bytes with the same relocation, so a byte compare passes.</b> Its table is 1, 2, 3, 4, 3 where the original\'s is 1, 2, 3, 4, 4: grade(100) returns 3. The relocation field is masked, so the bytes can\'t see what it points at. Read the constants behind every relocation. (The full grid catches this one too.)' };
      if (R.verdict === 'fail') { const f = Object.entries(R.claims).filter(([, v]) => v === 'fail').map(([k]) => k); return { ok: false, msg: `<b>The proof fails on ${f.join(', ')}.</b> ${R.bad.length ? `${R.bad.length} grid cells disagree, for example ${R.bad[0].k === 'p' ? `percent_change(${R.bad[0].a}, ${R.bad[0].b})` : `grade(${R.bad[0].a})`}: original ${fmt(R.bad[0].o)}, rebuild ${fmt(R.bad[0].r)}. ` : ''}Fail-closed: one failed claim fails the whole proof. Rebuild from the listing, not the pseudocode.` }; }
      return { ok: true, msg: `<b>All five claims pass: ${R.cells.length} grid cells agree, the bytes match after masking, and the table reads 1, 2, 3, 4, 4.</b> ${st.arch ? 'On arm64, sdiv returns INT_MIN where x86-64 traps; both sides ran on the same chip, so they still agree. Say which chip ran.' : 'The one trap cell (before = −1, the product wraps to INT_MIN) traps in both. '}Even so, a pass proves equality on this grid and these bytes, not for every input.` };
    }
    return { update: dt => sz.flat().forEach(t => t.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two functions to rebuild', home: true, say: 'The student rewrites two of their compiled functions in C, from the instruction listing. Now they must prove each rewrite matches the original.', act: m => m.set({ pc: 0, gr: 0, grid: false, skipOv: false, consts: true, arch: 0 }) },
    { t: 'Tests that always pass', home: true, say: 'Rebuilt from the decompiler\'s pseudocode, both rewrites pass every hand-written test. That proves agreement on those tests only.', act: m => m.set({ pc: 1, gr: 1 }) },
    { t: 'A grid that reaches the edges', home: true, say: 'Run both versions over a grid with zero, negatives, overflow and scores past one hundred. The pseudocode rewrites fail on the edges.', act: m => m.set({ grid: true }) },
    { t: 'From the listing', home: true, say: 'Rebuilt from the listing instead, every cell agrees, including the one input where the hardware divide traps on both.', act: m => m.set({ pc: 0, gr: 0 }) },
    { t: 'Same bytes, different table', home: true, say: 'One entry wrong in the table, and the code still compiles to the same bytes. Only reading the constants behind the relocation catches it.', act: m => m.set({ gr: 2 }) },
    { t: 'Fail-closed', home: true, say: 'One failed claim fails the whole proof. With every claim passing, the proof covers this grid and these bytes, and says so.', act: m => m.set({ gr: 0 }) },
  ],
  check: [
    { q: 'A rebuild passes ten hand-written tests. What has it proven?', options: ['That it agrees on those ten tests', 'That it equals the original', 'Nothing at all'], answer: 0, why: 'Equality needs a grid that reaches every edge, and matching bytes.', hint: 'Try Trust four hand-written tests.' },
    { q: 'Signed overflow is undefined in C. Should overflow cells be in the grid?', options: ['Yes: the compiled original has one fixed behaviour, and it is the judge', 'No, undefined means untestable', 'Only on arm64'], answer: 0, why: 'The binary wraps in 32 bits; the rebuild must too.', hint: 'Try Leave out the overflow cells.' },
    { q: 'Two functions have identical masked bytes. What else must you check?', options: ['The constants each relocation points at', 'Nothing, they are equal', 'Their names'], answer: 0, why: 'Masked fields can point at different tables.', hint: 'Try Compare bytes, not the table.' },
  ],
  terms: [
    ['Differential testing', 'Running two versions on the same inputs and comparing the results.'],
    ['Oracle', 'What decides the right answer; here, the compiled original.'],
    ['Input grid', 'Inputs chosen to reach every hazard, one class per hazard.'],
    ['Relocation masking', 'Zeroing the fields the linker fills in before comparing bytes.'],
    ['Divide trap', 'x86-64 idiv faults when the quotient doesn\'t fit, such as INT_MIN / −1.'],
    ['Fail-closed', 'Any failure fails the whole; any unknown keeps it unknown.'],
  ],
  deeper: '<p><b>Two proofs, one record.</b> The proof record lists each claim (behaviour, bytes, constants), the evidence it rests on, and an id hashed from its content, as in the previous lesson. On a machine without a compiler, the behaviour claims are unknown, and so is the proof.</p><p><b>Same bytes, different source.</b> A byte match shows this compiler, with these flags, produced the same code. after * 100 − before * 100 folds to the same 16 bytes, so it does not prove you found the original text.</p><p><b>The third leg.</b> Bounded symbolic execution can prove two functions equal on every path up to an input size, where a grid only samples.</p><p><b>About this machine.</b> Both legs of the grid are computed live in 32-bit C semantics (the trap included); compiled sizes and the masked byte results are from the course\'s clang -O1 builds of each rebuild.</p>',
  code: {
    title: 'Run both, and fail closed',
    note: 'Adapted from the course\'s rebuild lesson.',
    text: `
def wrap32(x): return (x + 2**31) % 2**32 - 2**31

def idiv32(a, b):                      # x86-64 idivl
    if b == 0 or (a == -2**31 and b == -1): return "trap"
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q

def original(before, after):
    if before == 0: return 0
    return idiv32(wrap32(100 * wrap32(after - before)), before)

def prove(cells, rebuild):
    bad = [c for c in cells if original(*c) != rebuild(*c)]
    return "fail" if bad else "pass", bad

def aggregate(claims):
    if not claims: return "unknown"
    if "fail" in claims.values(): return "fail"
    return "unknown" if "unknown" in claims.values() else "pass"
`,
  },
};
