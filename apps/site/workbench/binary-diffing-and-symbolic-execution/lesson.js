// Binary diffing and symbolic execution on the student's ledger builds.
// Diffing: five signatures per function (exact bytes, bytes with relocation fields masked, mnemonic sequence, flow-graph shape, name) and a staged greedy
// matcher: a signature value matches only when it is unique on both sides. Signature equalities follow the course's -O0/-O1/-O2 objects: in loaded images
// grade's leaq displacement differs (0x7a vs 0xea, .rodata moved 0x70), percent_change at -O0 and grade_label at -O1 share a four-block diamond, and the
// case-10 rebuild has grade's exact bytes but a table 1,2,3,4,3. Symbolic execution: grade at -O0 as IR paths (q = score/10 − 6, q >u 4 → 0, else the switch),
// each leaf solved by a bounded search over −200..1200; total's loop with a symbolic count forks once per iteration, with a cap on blocks per path.
const FN = ['percent_change', 'grade', 'total', 'grade_label'];
// per build: [exact (object), exact (loaded image), masked, mnemonic, shape]
const SIG = {
  O0: [['pc0', 'pc0', 'pc0m', 'pc0n', 'diamond4'], ['g0', 'g0', 'g0m', 'g0n', '8b11e'], ['t0', 't0', 't0m', 't0n', 't0s'], ['gl0', 'gl0', 'gl0m', 'gl0n', 'gl0s']],
  O1: [['pc1', 'pc1', 'pc1', 'pc1n', '3b2e'], ['g1', 'g1img', 'g1', 'g1n', '3b3e'], ['t1', 't1', 't1', 't1n', '5b5e'], ['gl1', 'gl1', 'gl1', 'gl1n', 'diamond4']],
  O2: [['pc1', 'pc1', 'pc1', 'pc1n', '3b2e'], ['g1', 'g2img', 'g1', 'g1n', '3b3e'], ['t2', 't2', 't2', 't2n', '10b13e'], ['gl1', 'gl1', 'gl1', 'gl1n', 'diamond4']],
  P: [null, ['g1', 'g1img', 'g1', 'g1n', '3b3e'], null, null],
};
const TABLE = { O1: [1, 2, 3, 4, 4], O2: [1, 2, 3, 4, 4], P: [1, 2, 3, 4, 3] };
const STAGES = [['exact bytes', 'very good'], ['masked bytes', 'good'], ['mnemonics', 'good'], ['flow-graph shape', 'medium'], ['name', 'very good']];
const PAIRS = [['O0', 'O1'], ['O1', 'O2'], ['O1', 'P']];
function match(pair, o) {
  const [A, B] = PAIRS[pair], L = FN.map((n, i) => SIG[A][i] && { n, i, s: SIG[A][i] }).filter(Boolean), R = FN.map((n, i) => SIG[B][i] && { n: B === 'P' ? 'grade (case 10 → 3)' : n, i, s: SIG[B][i] }).filter(Boolean);
  const sig = (f, st) => st === 4 ? FN[f.i] : st === 0 ? f.s[o.images ? 1 : 0] : f.s[st + 0 === 1 ? 2 : st === 2 ? 3 : 4];
  const order = o.bindiff ? [0, 4, 1, 2, 3] : [0, 1, 2, 3, 4], out = [], usedL = new Set(), usedR = new Set();
  for (const st of order) {
    if (!o.mask && st === 1) continue;
    const gl = {}, gr = {};
    L.filter(f => !usedL.has(f.i)).forEach(f => (gl[sig(f, st)] = gl[sig(f, st)] || []).push(f));
    R.filter(f => !usedR.has(f.i)).forEach(f => (gr[sig(f, st)] = gr[sig(f, st)] || []).push(f));
    Object.entries(gl).forEach(([k, a]) => { const b = gr[k]; if (a.length === 1 && b && b.length === 1) { usedL.add(a[0].i); usedR.add(b[0].i); const t1 = TABLE[A] && a[0].i === 1 ? TABLE[A] : null, t2 = TABLE[B] && b[0].i === 1 ? TABLE[B] : null; const ex = a[0].s[o.images ? 1 : 0] === b[0].s[o.images ? 1 : 0], mk = a[0].s[2] === b[0].s[2]; out.push({ l: a[0], r: b[0], st, right: a[0].i === b[0].i, data: t1 && t2 ? t1.join() === t2.join() : null, changed: !ex && (!o.mask || !mk) }); } });
  }
  const unL = L.filter(f => !usedL.has(f.i)), unR = R.filter(f => !usedR.has(f.i));
  return { out, unL, unR };
}
/* grade at -O0 as IR leaves */
const LEAVES = [['0x76', 4, q => q === 3 || q === 4], ['0x7f', 3, q => q === 2], ['0x88', 2, q => q === 1], ['0x91', 1, q => q === 0], ['0x9a', 0, null]];
function solve(lo, hi) {
  const res = LEAVES.map(l => ({ blk: l[0], v: l[1], n: 0, min: null, max: null }));
  let evals = 0;
  for (let s = lo; s <= hi; s++) {
    const q = Math.trunc(s / 10) - 6, out = (q >>> 0) > 4;
    LEAVES.forEach((l, i) => { evals++; const ok = l[2] ? !out && l[2](q) : out; if (ok) { const r = res[i]; r.n++; if (r.min === null) r.min = s; r.max = s; } });
  }
  return { res, evals };
}
/* total's loop: count symbolic in 0..B, a cap on blocks per path */
function explode(B, cap) {
  let done = 0, trunc = 0, never = 0;
  for (let c = 0; c <= B; c++) { const len = c === 0 ? 2 : c + 3; if (len <= cap) done++; }
  const firstCut = Math.max(0, cap - 3 + 1);
  if (B >= firstCut) { trunc = 1; never = B - firstCut; }
  return { done, trunc, never, total: B + 1 };
}

export default {
  slug: 'binary-diffing-and-symbolic-execution',
  title: 'Diffing builds and solving for inputs',
  description: 'Two questions about the student\'s own program: what changed between two builds, and which inputs reach each return.',
  overview: 'A function match is a claim made by one signature with one quality. A differ computes signatures for every function on both sides (the exact bytes, the bytes with relocation fields zeroed, the sequence of mnemonics, the shape of the flow graph, the name) and accepts a value only when it appears exactly once on each side, stage by stage. Loaded images can differ where object files don\'t: when an earlier section grows, a rip-relative displacement to a table changes, so identical functions fail an exact-bytes stage until the relocation fields are masked. Small flow-graph shapes repeat: a four-block diamond is every if-else that joins before returning, so a shape match is medium quality and a name stage can contradict it. A diff that stops at code bytes misses a changed constant: two functions with the same 46 bytes can point at different tables. Symbolic execution turns inputs into symbols, adds a condition at every branch, and asks a solver for inputs that satisfy each path. grade has five paths; each leaf\'s condition gives a set of scores, such as 90 to 109 for a result of 4. One solved input proves a path is reachable; it is not the answer to "which inputs". A loop with a symbolic bound forks once per iteration, so the paths grow with the bound and a cap must truncate them.',
  keywords: ['binary diffing', 'BinDiff', 'symbolic execution', 'path explosion', 'angr', 'z3', 'reverse engineering'],
  orient: 'landscape',
  view: { target: [-0.3, 0.25, -0.1], dir: [0.35, 0.95, 1.3], half: 1.1, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pair: 1, images: true, mask: true, bindiff: true, tables: true, one: false, B: 8, cap: 24 }, st = { ...D0 };
    const SAF = '#F2AE0C', ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', AMB = '#C9A227';
    /* the diff: functions of the old build (left column) and the new (right column), joined by rods for each match; green right, gold matched by a weak
       signature, coral wrong, grey left unmatched */
    const LXc = -2.65, RXc = -1.55, FZ = i => -0.7 + i * 0.4;
    const lblk = FN.map((_, i) => { const b = P.box(0.32, 0.25, 0.26, '#5B8DB8', { r: 0.04 }); b.position.set(LXc, 0, FZ(i)); S.add(b); return b; });
    const rblk = FN.map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#7B6FA8' }), b = P.box(0.32, 0.25, 0.26, '#fff', { r: 0.04, material: mm }); b.position.set(RXc, 0, FZ(i)); S.add(b); return { b, mm }; });
    const rods = Array.from({ length: 5 }, () => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), r = P.box(1, 0.06, 0.06, '#fff', { r: 0.01, material: mm }); r.userData.noFit = true; S.add(r); return { r, mm }; });
    /* grade's five paths, solved: a bar per returned grade along the axis of scores −200..1200, showing which scores reach it */
    const LO = -200, HI = 1200, W = 1.6, X0 = -0.95, sx = s2 => X0 + (s2 - LO) / (HI - LO) * W;
    const leafs = LEAVES.map((l, i) => { const z = -0.7 + i * 0.3, mm = new THREE.MeshLambertMaterial({ color: ['#1F9E89', '#5B8DB8', '#7B6FA8', '#C9A227', '#B9B3A5'][i] }), bar = P.box(1, 0.1 + i * 0.04, 0.14, '#fff', { r: 0, material: mm }); bar.position.set(0, 0.02, z); S.add(bar); const bar2 = P.box(1, 0.1 + i * 0.04, 0.14, '#fff', { r: 0, material: mm }); bar2.position.set(0, 0.02, z); S.add(bar2); return { bar, bar2, mm }; });
    const axis = P.box(W, 0.03, 1.5, '#FFFDF5', { r: 0.02 }); axis.position.set(X0 + W / 2, 0, -0.1); S.add(axis);
    /* total's loop: one block per possible loop count, finished (green), cut at the block cap (gold) or never started (grey) */
    const RX = 1.3, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 65); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const ep = P.box(1.6, 0.03, 1.6, '#FFFFFF', { r: 0.03 }); ep.position.set(RX, 0, -0.1); S.add(ep);
    S.add(P.keep(-2.85, 2.15, 0.8, -0.95, 0.75));

    let M = null, SV = null, EX = null;
    function draw() {
      const [A, B] = PAIRS[st.pair];
      M = match(st.pair, st);
      const rows = M.out.map(m => ({ l: m.l.i, r: m.r.i, c: !m.right ? BAD : m.changed ? SAF : m.data === false && st.tables ? AMB : m.st >= 3 ? SAF : GOOD }));
      rods.forEach((rd, i) => { const x = rows[i]; rd.r.visible = !!x; if (!x) return; const A = V(LXc + 0.16, 0.15, FZ(x.l)), Bp = V(RXc - 0.16, 0.15, FZ(x.r)), d = Bp.clone().sub(A); rd.r.scale.x = Math.hypot(d.x, d.z); rd.r.position.set((A.x + Bp.x) / 2, 0.15, (A.z + Bp.z) / 2); rd.r.rotation.y = -Math.atan2(d.z, d.x); rd.mm.color.set(x.c); });
      rblk.forEach((r, i) => { const hit = rows.some(x => x.r === i); r.mm.color.set(hit ? '#7B6FA8' : '#C9C4B6'); });
      SV = solve(LO, HI);
      SV.res.forEach((r, i) => { const L = leafs[i]; const segs = r.v === 0 ? [[LO, 59], [110, HI]] : [[r.min, r.max]]; [L.bar, L.bar2].forEach((bb, k) => { const sg = segs[k]; bb.visible = !!sg; if (!sg) return; const w = Math.max(0.01, (sg[1] - sg[0] + 1) / (HI - LO) * W); bb.scale.x = w; bb.position.x = sx(sg[0]) + w / 2; }); L.mm.color.set(st.one && r.v === 4 ? RED : ['#1F9E89', '#5B8DB8', '#7B6FA8', '#C9A227', '#B9B3A5'][i]); });
      EX = explode(st.B, st.cap);
      for (let c = 0; c < 65; c++) { if (c > st.B) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(c, dummy.matrix); continue; } const len = c === 0 ? 2 : c + 3, ok = len <= st.cap, cut = !ok && c === Math.max(0, st.cap - 2); dummy.position.set(RX - 0.66 + (c % 12) * 0.12, 0.03, -0.75 + Math.floor(c / 12) * 0.25); dummy.scale.set(0.09, ok ? 0.12 + Math.min(0.5, len * 0.012) : cut ? 0.12 : 0.03, 0.18); dummy.updateMatrix(); im.setMatrixAt(c, dummy.matrix); im.setColorAt(c, col.set(ok ? GOOD : cut ? AMB : '#D9D4C7')); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const wrong = () => M.out.filter(m => !m.right).length;
    const controls = [
      { type: 'buttons', label: 'Builds to diff', options: ['-O0 vs -O1', '-O1 vs -O2', '-O1 vs patched'], get: () => st.pair, act: i => set({ pair: i }) },
      { type: 'toggle', label: 'Run the name stage second (BinDiff order)', short: 'Names second', get: () => st.bindiff, set: v => set({ bindiff: !!v }) },
      { type: 'toggle', label: 'Mask relocation fields', short: 'Mask', get: () => st.mask, set: v => set({ mask: !!v }) },
      { type: 'slider', label: 'Bound on total\'s count', min: 2, max: 64, step: 1, get: () => st.B, set: v => set({ B: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'slider', label: 'Blocks per path cap', min: 8, max: 40, step: 1, get: () => st.cap, set: v => set({ cap: Math.round(v) }), fmt: v => String(Math.round(v)) },
    ];
    const readouts = [
      { label: 'Matched', get: () => ({ v: `${M.out.length - wrong()} right`, sub: `${wrong()} wrong, ${M.unL.length} unmatched`, bad: wrong() > 0, good: !wrong() && !M.unL.length }) },
      { label: 'Returns 4', get: () => ({ v: st.one ? '90' : '90..109', sub: st.one ? 'one model' : `${SV.res[0].n} scores`, bad: st.one, good: !st.one }) },
      { label: 'total paths', get: () => ({ v: `${EX.done} / ${EX.total}`, sub: EX.trunc ? 'some cut' : 'all finished', good: !EX.trunc }) },
    ];
    const labels = [
      { name: 'diff', t: 'The diff', d: 'Old build\'s functions left (blue), new right (purple; grey if unmatched). A rod per match: green right, gold matched by a weaker signature or changed, coral wrong', icon: 'link', atV: V(LXc - 0.18, 0.15, FZ(1)) },
      { name: 'paths', t: 'grade\'s five paths', d: 'One bar per returned grade, spanning the scores from −200 to 1200 that reach it; red if a single model answer stands in for the set', icon: 'target', atV: V(X0 + W / 2, 0.3, -0.85) },
      { name: 'loop', t: 'total\'s loop', d: 'A block per loop count: green finished, gold cut at the block cap, grey never started', icon: 'gauge', atV: V(RX + 0.8, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Diff loaded images without masking', hint: 'grade "changed"', on: () => set({ ...D0, pair: 1, mask: false, bindiff: false }), off: reset },
      { label: 'Trust a shape match', hint: 'names last, -O0 vs -O1', on: () => set({ ...D0, pair: 0, bindiff: false }), off: reset },
      { label: 'Stop the diff at code bytes', hint: 'case 10 returns 3', on: () => set({ ...D0, pair: 2, tables: false }), off: reset },
      { label: 'Report one solved input', hint: '"90"', on: () => set({ ...D0, one: true }), off: reset },
    ];
    function status() {
      if (!st.mask && M.out.some(m => m.changed && m.right && m.l.i === 1)) return { ok: false, msg: '<b>Without masking, grade is reported changed between the loaded images.</b> Its 46 bytes are identical in both objects. In the -O2 image .rodata starts 0x70 later, so the leaq displacement is 0xea instead of 0x7a: one byte of 46. Zero the relocation fields before comparing: the masked bytes agree, and nothing in grade changed.' };
      if (!st.bindiff && wrong()) { const w = M.out.find(m => !m.right); return { ok: false, msg: `<b>${w.l.n} at -O0 was matched to ${w.r.n} at -O1 on flow-graph shape, a medium-quality signature.</b> Both are a four-block diamond: an if-else that joins before returning. The match also used up ${w.r.n}, leaving the real pairs unmatched. Run the name stage early when names exist, and treat a small shape as a hint, not a match.` }; }
      if (st.pair === 2 && !st.tables) return { ok: false, msg: '<b>The rebuilt grade matches the original on exact bytes, every signature agreeing, so the diff says nothing changed.</b> Its table reads 1, 2, 3, 4, 3: grade(100) returns 3. The 46 code bytes point at the table through a relocation; compare the data each relocation points at, with the count from the bounds check and the width from the load.' };
      if (st.one) return { ok: false, msg: `<b>"90" is one model of the path that returns 4, not the answer.</b> The path condition is q = 3 or 4, so grade returns 4 for all ${SV.res[0].n} scores from 90 to 109; a solver over all 32-bit inputs agrees. Ask for the set: the minimum and maximum under the condition, or every input in a bound.` };
      return { ok: true, msg: `<b>${M.out.length} function${M.out.length === 1 ? '' : 's'} matched${M.unL.length ? `, ${M.unL.length} unmatched` : ''}: ${M.out.map(m => `${m.l.n} by ${STAGES[m.st][0]}${m.data === false ? ' (table differs: 1,2,3,4,4 vs 1,2,3,4,3)' : ''}`).join('; ')}.</b> grade has five paths: 4 for 90 to 109, 3, 2 and 1 for each decade below, 0 for the other ${SV.res[4].n.toLocaleString('en')} scores. total with a count up to ${st.B}: ${EX.total} paths${EX.trunc ? `, of which ${EX.done} finish under a cap of ${st.cap} blocks` : ', all finished'}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'What changed?', home: true, say: 'The student rebuilds their program with more optimisation and asks what changed. A differ matches functions by signatures that must be unique on both sides.', act: m => m.set({ pair: 1, images: true, mask: true, bindiff: true, tables: true, one: false, B: 8, cap: 24 }) },
    { t: 'A moved table', home: true, say: 'In the loaded program, one function looks changed by a single byte. A table moved; the code didn\'t. Mask the relocated bytes.', act: m => m.set({ mask: false }) },
    { t: 'Shapes repeat', home: true, say: 'Between less optimised builds, two different functions share the same small shape. A shape match is a hint, not proof.', act: m => m.set({ mask: true, pair: 0, bindiff: false }) },
    { t: 'Same code, new constant', home: true, say: 'A rebuilt function has identical code but a different table. Only reading the data it points at shows the change.', act: m => m.set({ pair: 2, bindiff: true }) },
    { t: 'Which inputs?', home: true, say: 'Symbolic execution gives every path a condition. The path that returns four holds for every score from ninety to one hundred and nine.', act: m => m.set({ pair: 1 }) },
    { t: 'Paths multiply', home: true, say: 'A loop with an unknown count adds one path per iteration. Raise the bound, and some paths must be cut.', act: m => m.set({ B: 40 }) },
  ],
  check: [
    { q: 'grade has identical bytes in two object files but differs by one byte in the loaded programs. Why?', options: ['A rip-relative displacement changed because .rodata moved', 'The compiler changed grade', 'The file is corrupt'], answer: 0, why: 'Mask relocation fields before comparing.', hint: 'Try Diff loaded images without masking.' },
    { q: 'A solver says score = 90 makes grade return 4. What have you learned?', options: ['That the path is reachable; the full set is 90 to 109', 'That only 90 returns 4', 'Nothing'], answer: 0, why: 'A model is one witness, not the set.', hint: 'Try Report one solved input.' },
    { q: 'Two functions match on all code bytes. Can their behaviour differ?', options: ['Yes, if the data they point at differs', 'No', 'Only at -O0'], answer: 0, why: 'The case-10 rebuild has the same bytes and a different table.', hint: 'Pick -O1 vs patched.' },
  ],
  terms: [
    ['Signature', 'A value computed from a function to compare it across builds.'],
    ['Unique match', 'A signature value that appears once on each side.'],
    ['Relocation masking', 'Zeroing fields the loader fills in before comparing bytes.'],
    ['Path condition', 'The conjunction of branch conditions along one path.'],
    ['Model', 'One input that satisfies a condition.'],
    ['Path explosion', 'The growth of paths with branches and loop iterations.'],
  ],
  deeper: '<p><b>Similarity ratios.</b> radiff2 scores a pair as 1 − Levenshtein distance / the longer length, over the bytes its analysis reached; two tools agree only when they compare the same bytes.</p><p><b>Correlators.</b> Ghidra\'s Version Tracking runs exact symbol, data, bytes, instruction (operands masked) and mnemonic correlators in order, then follows references from accepted matches.</p><p><b>Unbounded proofs.</b> A bounded search is complete inside its domain and silent outside it. An SMT solver over 32-bit vectors proved the -O1 grade equal to the source switch on all 2^32 scores, and found a score above 2^29 where a threshold rewrite differs.</p><p><b>About this machine.</b> The matcher, the path sets for grade and the loop paths are computed live; the signature equalities between builds follow the course\'s objects.</p>',
  code: {
    title: 'Unique on both sides, stage by stage',
    note: 'Adapted from the course\'s diffing lesson.',
    text: `
from collections import defaultdict

def match_functions(left, right, stages):
    matches, used_l, used_r = [], set(), set()
    for stage in stages:
        gl, gr = defaultdict(list), defaultdict(list)
        for f in left:
            if f.name not in used_l: gl[stage.sig(f)].append(f)
        for f in right:
            if f.name not in used_r: gr[stage.sig(f)].append(f)
        for sig, a in gl.items():
            b = gr.get(sig, [])
            if len(a) == 1 and len(b) == 1:          # unique on both sides
                matches.append((a[0], b[0], stage.name, stage.quality))
                used_l.add(a[0].name); used_r.add(b[0].name)
    return matches
`,
  },
};
