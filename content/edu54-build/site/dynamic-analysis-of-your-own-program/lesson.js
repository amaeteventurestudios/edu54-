// Dynamic analysis of your own program: the student's account.c run under lldb with a plan built from the listing (entry breakpoints, both edges of each
// conditional branch in classify, a hardware watchpoint on a->balance), and eight static claims graded against the stops: confirmed, refuted or not-observed.
// The run is replayed here from the program's own semantics with the -O0 addresses of the course's session (rows at 0x16fdfdfe8 + 0x20·i, bump + 12 = 0x4bc,
// tbz at 0x4f0 → 0x504 taken when balance ≥ 0, b.le at 0x510 → 0x524 taken when balance ≤ 200). At -O2 every call is inlined and sum_balances folds to 315:
// breakpoints resolve and never hit. Inside the sandbox the attach fails and there are no stops.
const ROWS = [['c', 100, 'cash'], ['s', 250, 'savings'], ['l', -40, 'loan']];
const RA = i => 0x16fdfdfe8 + 0x20 * i;
const hx = n => '0x' + n.toString(16);
function run(mode, firstHits) {
  if (mode === 2) return { stops: [], out: [], failed: true, hits: {} };
  const bal = ROWS.map(r => r[1]), stops = [], out = ['sizeof 32 align 8', 'offsets 0 4 8 16 24'], hits = { bump: 0, classify: 0, sum_balances: 0, 0x504: 0, 0x4f4: 0, 0x524: 0, 0x514: 0 }, watch = [];
  const O0 = mode === 0;
  const stop = (fn, pc, x0, x1, why) => { if (O0) stops.push({ fn, pc, x0, x1, why, bal: bal.slice() }); };
  // bump(&rows[1], 5)
  if (O0) { hits.bump++; stop('bump', 0x1000004bc, RA(1), 5, 'entry'); if (firstHits) { watch.push({ old: null, nw: 250 }, { old: null, nw: 250 }); } }
  const old = bal[1]; bal[1] += 5; if (O0) { watch.push({ old, nw: bal[1] }); stops.push({ fn: 'bump', pc: 0x1000004d0, x0: RA(1), x1: 5, why: `watchpoint: ${old} → ${bal[1]}`, bal: bal.slice() }); }
  const cls = [0, 1, 2].map(i => {
    if (O0) { hits.classify++; stop('classify', 0x1000004e8, RA(i), 5, 'entry'); }
    if (bal[i] < 0) { if (O0) { hits[0x4f4]++; stop('classify', 0x1000004f4, RA(i), 5, 'tbz fell through'); } return -1; }
    if (O0) { hits[0x504]++; stop('classify', 0x100000504, RA(i), 5, 'tbz taken'); }
    if (bal[i] > 200) { if (O0) { hits[0x514]++; stop('classify', 0x100000514, RA(i), 5, 'b.le fell through'); } return 1; }
    if (O0) { hits[0x524]++; stop('classify', 0x100000524, RA(i), 5, 'b.le taken'); } return 0;
  });
  out.push(`class ${cls.join(' ')}`);
  if (O0) { hits.sum_balances++; stop('sum_balances', 0x100000544, RA(0), 3, 'entry'); }
  out.push(`sum ${bal.reduce((a, b) => a + b, 0)}`);
  return { stops, out, failed: false, hits, watch };
}
function grade(R, o) {
  const V = (id, claim, verdict, why) => ({ id, claim, verdict, why });
  if (R.failed) return ['arg-registers', 'field-offsets', 'branch-1', 'branch-2', 'calls', 'store-once', 'stride', 'output'].map(id => V(id, '', 'not-observed', 'launch failed: no stops, no output'));
  const S = R.stops;
  const entries = S.filter(s => s.why === 'entry');
  const out = [];
  out.push(entries.length ? V('arg-registers', 'first arguments in x0, x1', entries.every(s => s.x0 > 0x100000000) ? 'confirmed' : 'refuted', `${entries.length} entry stops: x0 a pointer each time; x1 = 5 at bump, 3 at sum_balances`) : V('arg-registers', 'first arguments in x0, x1', 'not-observed', 'no entry stop: the functions were inlined'));
  out.push(S.length ? V('field-offsets', 'balance at offset 4 of 32', 'confirmed', `memory at x0 + 4 read ${S[0].bal[1]} at the bump stop, rows 0x20 apart`) : V('field-offsets', 'balance at offset 4 of 32', 'not-observed', 'no stop to read memory'));
  const br1 = S.filter(s => /tbz/.test(s.why)), br2 = S.filter(s => /b\.le/.test(s.why));
  const pred1 = b => o.invert ? b < 0 : b >= 0;
  const ok1 = br1.every(s => { const i = (s.x0 - RA(0)) / 0x20, b = s.bal[i]; return (s.why === 'tbz taken') === pred1(b); });
  out.push(br1.length ? V('branch-1', o.invert ? 'tbz taken when balance < 0 (the source test)' : 'tbz taken when balance ≥ 0', ok1 ? 'confirmed' : 'refuted', br1.map(s => `${s.bal[(s.x0 - RA(0)) / 0x20]}: ${s.why === 'tbz taken' ? 'taken' : 'fell through'}`).join(', ')) : V('branch-1', 'tbz taken when balance ≥ 0', 'not-observed', 'branch never reached'));
  const ok2 = br2.every(s => { const b = s.bal[(s.x0 - RA(0)) / 0x20]; return (s.why === 'b.le taken') === (b <= 200); });
  out.push(br2.length ? V('branch-2', 'b.le taken when balance ≤ 200', ok2 ? 'confirmed' : 'refuted', br2.map(s => `${s.bal[(s.x0 - RA(0)) / 0x20]}: ${s.why === 'b.le taken' ? 'taken' : 'fell through'}`).join(', ')) : V('branch-2', 'b.le taken when balance ≤ 200', 'not-observed', 'branch never reached'));
  const c = R.hits, callsOk = c.bump === 1 && c.classify === 3 && c.sum_balances === 1;
  out.push(c.bump + c.classify + c.sum_balances ? V('calls', 'bump 1, classify 3, sum_balances 1', callsOk ? 'confirmed' : 'refuted', `hit counts ${c.bump}, ${c.classify}, ${c.sum_balances}`) : V('calls', 'bump 1, classify 3, sum_balances 1', o.zeroRefutes ? 'refuted' : 'not-observed', o.zeroRefutes ? 'hit counts 0, 0, 0 read as "never called"' : 'breakpoints resolved, hit count 0: inlined'));
  const W = (R.watch || []).filter(w => o.firstHits || w.old !== null);
  out.push(W.length ? V('store-once', 'bump writes balance once: old + by', W.length === 1 && W[0].nw === W[0].old + 5 ? 'confirmed' : 'refuted', W.map(w => `${w.old === null ? '(no old)' : w.old} → ${w.nw}`).join(', ')) : V('store-once', 'bump writes balance once: old + by', 'not-observed', 'no watchpoint: no stop to set it at'));
  const cs = S.filter(s => s.fn === 'classify' && s.why === 'entry').map(s => s.x0);
  out.push(cs.length > 1 ? V('stride', 'list[i] at list + 32·i', cs.every((x, i) => x === cs[0] + 0x20 * i) ? 'confirmed' : 'refuted', cs.map(hx).join(', ')) : V('stride', 'list[i] at list + 32·i', 'not-observed', 'no classify stops'));
  out.push(V('output', 'prints class 0 1 -1, sum 315', R.out.includes('class 0 1 -1') && R.out.includes('sum 315') ? 'confirmed' : 'refuted', R.out.slice(2).join(' / ')));
  return out;
}

export default {
  slug: 'dynamic-analysis-of-your-own-program',
  title: 'Run it and watch: confirming what you read',
  description: 'The student runs their own program under a debugger, with breakpoints planned from the listing, and grades eight claims against what it saw.',
  overview: 'Static analysis says what the bytes imply; a debugger shows what one run of one build did. On Linux a debugger works through ptrace; on macOS through a Mach task port and exception ports, which a sandboxed shell cannot get, so the launch fails with no stops at all. A software breakpoint overwrites the first instruction with a trap (INT3 on x86-64, BRK on arm64); set by name, lldb skips the prologue, so the argument registers still hold the arguments. A watchpoint uses one of a few hardware comparators (four here) and reports after the write, with the old and new values. Plan the session from the listing: break at each function entry and at both targets of each conditional branch, read registers and memory at every stop, and grade each claim. The first branch in classify is tbz on the sign bit, taken when balance is not negative: the compiler inverted the source\'s test, and a claim written from the source is refuted. At -O2 every call is inlined and the sum is folded to 315: the breakpoints resolve and never hit. That is not observed, not refuted; the program still prints the same output. Each verdict becomes an evidence record observed by a run you controlled.',
  keywords: ['debugging', 'lldb', 'breakpoints', 'watchpoints', 'dynamic analysis', 'reverse engineering', 'evidence'],
  orient: 'landscape',
  view: { target: [-0.8, 0.3, -0.1], dir: [0.4, 0.85, 1.3], half: 1.1, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 0, invert: false, zeroRefutes: false, firstHits: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', GREY = '#8E8C84';
    /* the plan: seven breakpoint flags on posts (three function entries, both edges of two branches), each as tall as its hits */
    const KEYS = ['bump', 'classify', 'sum_balances', 0x504, 0x4f4, 0x524, 0x514], KC = ['#C9A227', '#5B8DB8', '#7B6FA8', '#1F9E89', '#9DB8D6', '#1F9E89', '#9DB8D6'];
    const flags = KEYS.map((k, i) => { const t = P.tower(0.18, 0.18, KC[i]); t.position.set(-2.4 + i * 0.28, 0, -0.55); t.userData.set({ cap: '' }); S.add(t); return t; });
    const ped = P.box(2.1, 0.04, 0.4, '#FFFFFF', { r: 0.03 }); ped.position.set(-1.56, 0, -0.55); S.add(ped);
    /* the run: stops drop onto a track in order, coloured by function (red: the watchpoint fired) */
    const FC = { bump: '#C9A227', classify: '#5B8DB8', sum_balances: '#7B6FA8' };
    const track = P.box(2.6, 0.03, 0.3, '#D9D4C7', { r: 0.02 }); track.position.set(-1.3, 0, 0.3); S.add(track);
    const stopsV = Array.from({ length: 12 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.16, 0.16, 0.16, '#fff', { r: 0.03, material: mm }); b.position.set(-2.5 + i * 0.21, 0.03, 0.3); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const dbg = P.robot(CHAR, { scale: 0.8 }); dbg.position.set(-2.95, 0, 0.3); S.add(dbg);
    /* eight claims, a lamp each: green confirmed, red refuted, grey not observed */
    const vrows = Array.from({ length: 8 }, (_, i) => { const l = P.lamp('#C9C4B6', { h: 0.3 + (i % 2) * 0.1, r: 0.08 }); l.position.set(0.55 + (i % 4) * 0.3, 0, -0.45 + Math.floor(i / 4) * 0.5); S.add(l); return l; });
    S.add(P.keep(-3.15, 1.6, 1.0, -0.8, 0.6));

    let R = null, G = null;
    function draw() {
      R = run(st.mode, st.firstHits); G = grade(R, st);
      const h = R.hits || {};
      flags.forEach((f, i) => f.userData.set({ h: R.failed ? 0.03 : 0.05 + Math.min(4, h[KEYS[i]] || 0) * 0.15, color: R.failed || !(h[KEYS[i]]) ? '#C9C4B6' : KC[i] }));
      stopsV.forEach((v, i) => { const s2 = R.stops[i]; v.b.visible = !!s2; if (!s2) return; v.mm.color.set(/watch/.test(s2.why) ? BAD : FC[s2.fn]); });
      const VC = { confirmed: GOOD, refuted: RED, 'not-observed': '#9A968C' };
      vrows.forEach((l, i) => { const g = G[i]; l.userData.set({ color: VC[g.verdict], on: g.verdict !== 'not-observed' }); });
      dbg.userData.set({ color: R.failed ? RED : CHAR });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const cnt = v => G.filter(g => g.verdict === v).length;
    const controls = [
      { type: 'buttons', label: 'Run', options: ['-O0', '-O2', 'Sandboxed'], get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'toggle', label: 'Write the branch claim from the source', short: 'Source test', get: () => st.invert, set: v => set({ invert: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Confirmed', get: () => ({ v: `${cnt('confirmed')} of 8`, sub: 'by a stop or the output', good: cnt('confirmed') === 8 }) },
      { label: 'Refuted', get: () => ({ v: String(cnt('refuted')), sub: 'a stop showed otherwise', bad: cnt('refuted') > 0, good: !cnt('refuted') }) },
      { label: 'Not observed', get: () => ({ v: String(cnt('not-observed')), sub: 'no stop could test it' }) },
    ];
    const labels = [
      { name: 'plan', t: 'Plan and run', d: 'Back: breakpoints at bump, classify, sum_balances and both edges of two branches, as tall as their hits (grey: never hit). Front: the debugger\'s stops in order, coloured by function; red where the balance watchpoint fired', icon: 'layers', atV: V(-2.65, 0.15, -0.55) },
      { name: 'verdicts', t: 'Eight claims', d: 'A lamp each: green confirmed by a stop, red refuted, dark not observed', icon: 'check', atV: V(1.55, 0.4, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Claim the branch the way the source reads', hint: 'balance < 0 takes it', on: () => set({ ...D0, invert: true }), off: reset },
      { label: 'Read hit count 0 as never called', hint: '-O2', on: () => set({ ...D0, mode: 1, zeroRefutes: true }), off: reset },
      { label: 'Count the watchpoint\'s first reports', hint: 'no old value', on: () => set({ ...D0, firstHits: true }), off: reset },
      { label: 'Debug from inside a sandbox', hint: 'no task port', on: () => set({ ...D0, mode: 2 }), off: reset },
    ];
    function status() {
      if (st.invert && G[2].verdict === 'refuted') { const b = G[2]; return { ok: false, msg: `<b>branch-1 is refuted: ${b.why}.</b> The source reads if (a->balance < 0) return -1, but the compiler inverted it: tbz w8, #31 branches when the sign bit is clear, so the taken edge skips the return. Decode the branch (bit 31, offset 5 × 4 = 0x14) before you claim which edge a value takes.` }; }
      if (st.zeroRefutes) return { ok: false, msg: '<b>All three entry breakpoints resolved and never hit, and the calls claim was marked refuted.</b> At -O2 clang inlined bump and classify into main and folded sum_balances(rows, 3) to the constant 315; the program prints the same lines. A hit count of 0 means no stop could test the claim: not observed. It is not evidence the source has no call.' };
      if (st.firstHits) return { ok: false, msg: `<b>store-once is refuted with ${G[5].why}.</b> Right after watchpoint set, lldb reports hits with no old value: that is its initial read, not a write. Ignore a hit without an old value, and bump writes balance once, 250 → 255.` };
      if (st.mode === 2) return { ok: false, msg: '<b>The launch failed: "attach failed ((os/kern) invalid address)". Zero stops, no output, all eight claims not observed.</b> On macOS the debugger needs a Mach task port for the process, and a sandboxed shell can\'t get one. The error is about the debugger\'s rights, not the program. Record it as a launch failure, with no verdicts.' };
      if (st.mode === 1) return { ok: true, msg: `<b>-O2: 0 stops; the output is confirmed and the other seven claims are not observed.</b> Every call was inlined, so no entry breakpoint hits. That is a fact about this build, not the source. To test the other claims, debug the -O0 build, or break inside main at the inlined code.` };
      return { ok: true, msg: `<b>-O0: ${R.stops.length} stops confirm all 8 claims.</b> Arguments in x0 and x1 at every entry; balance at x0 + 4; the tbz is taken for 100 and 255 and falls through for −40; the b.le is taken for 100 and falls through for 255; the watchpoint saw 250 → 255 once; classify's three pointers sit 0x20 apart. Each verdict is an observed record from a run you controlled.` };
    }
    return { update: dt => { flags.forEach(f => f.userData.tick(dt)); dbg.userData.tick(dt); dbg.userData.set({ busy: !R.failed }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Read, then run', home: true, say: 'Earlier lessons made claims from the bytes alone. Now the student runs the program under a debugger and grades each claim.', act: m => m.set({ mode: 0, invert: false, zeroRefutes: false, firstHits: false }) },
    { t: 'A plan from the listing', home: true, say: 'Break at each function, and at both targets of each branch. At every stop, read the registers and the struct in memory.', act: m => m.set({ mode: 0 }) },
    { t: 'The inverted branch', home: true, say: 'The source tests for a negative balance, but the compiled branch is taken when the balance is not negative. A claim written from the source is refuted.', act: m => m.set({ invert: true }) },
    { t: 'Watch one field', home: true, say: 'A hardware watchpoint on the balance fires once, after the write: two hundred and fifty becomes two hundred and fifty-five.', act: m => m.set({ invert: false }) },
    { t: 'Optimised away', home: true, say: 'In the optimised build, every call is inlined. The breakpoints never hit, so those claims are not observed. Not refuted.', act: m => m.set({ mode: 1 }) },
    { t: 'No rights, no run', home: true, say: 'Inside a sandbox, the debugger can\'t take control of the process. No stops at all, and nothing about the program.', act: m => m.set({ mode: 2 }) },
  ],
  check: [
    { q: 'At -O2 the breakpoint on classify resolves and has hit count 0. The verdict on "main calls classify"?', options: ['Not observed: the call was inlined', 'Refuted', 'Confirmed'], answer: 0, why: 'No stop could test it; the program still prints the same output.', hint: 'Try Read hit count 0 as never called.' },
    { q: 'Source: if (balance < 0) return -1. Compiled: tbz w8, #31, target. When is the branch taken?', options: ['When balance ≥ 0: the sign bit is clear', 'When balance < 0', 'Always'], answer: 0, why: 'The compiler inverted the test; the taken edge skips the return.', hint: 'Try Claim the branch the way the source reads.' },
    { q: 'lldb run fails with "attach failed" inside a sandbox. What does that tell you about the program?', options: ['Nothing: it is about the debugger\'s rights', 'It crashes', 'It has no symbols'], answer: 0, why: 'Record a launch failure with no verdicts.', hint: 'Try Debug from inside a sandbox.' },
  ],
  terms: [
    ['Breakpoint', 'A trap instruction written over the first bytes of an instruction.'],
    ['Watchpoint', 'A hardware comparator that stops on access to an address.'],
    ['Stop hook', 'Commands the debugger runs at every stop.'],
    ['Inlining', 'Copying a callee\'s body into its caller, so no call remains.'],
    ['Not observed', 'No stop could test the claim; neither confirmed nor refuted.'],
    ['ptrace / task port', 'The operating-system services a debugger needs.'],
  ],
  deeper: '<p><b>Core files.</b> lldb can save a stack-style core and load it later: registers and stack survive, but heap and other mappings may not, so a core answers fewer questions than a live stop.</p><p><b>Other tools.</b> strace and ltrace trace system and library calls on Linux; bpftrace and dtrace attach probes without stopping the process; rr records a run so you can replay it backwards. Each runs only where its kernel support exists.</p><p><b>Signing.</b> On macOS, lldb can debug a binary you built and signed ad hoc; it refuses a hardened-runtime binary without the get-task-allow entitlement, and system binaries.</p><p><b>About this machine.</b> The run is replayed here from account.c\'s own logic with the addresses, hit counts and watchpoint values of the course\'s -O0 lldb session; the -O2 and sandbox cases follow its transcripts. The grading is computed live.</p>',
  code: {
    title: 'Grade claims from stops',
    note: 'Adapted from the course\'s dynamic-analysis lesson.',
    text: `
def grade_calls(breakpoints, expected):
    hits = {b.name: b.hit_count for b in breakpoints}
    if all(hits[n] == 0 for n in expected):
        return "not-observed", "resolved, never hit: inlined or not reached"
    ok = all(hits[n] == k for n, k in expected.items())
    return ("confirmed" if ok else "refuted"), hits

def grade_edge(stops, branch, taken_target, predicate):
    seen = [s for s in stops if s.pc in branch.targets]
    if not seen:
        return "not-observed", "branch never reached"
    ok = all((s.pc == taken_target) == predicate(s) for s in seen)
    return ("confirmed" if ok else "refuted"), [(s.value, s.pc) for s in seen]

def store_hits(watch_hits):
    return [h for h in watch_hits if h.old is not None]   # the first report is lldb's read
`,
  },
};
