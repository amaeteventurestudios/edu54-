// Recursive self-improvement, and how to bound it (phase 15, lessons 7 and 8): each cycle the system proposes an edit to itself. Capability and
// alignment compound per cycle; if capability compounds faster, the gap widens. A fixed pattern of six edits repeats: two honest gains, an
// evaluator change, an objective rewording, a safety trade and a hidden regression. Four gates (invariants, an anchor, multi-objective checks and
// regression detection) catch the four bad kinds. Growth and the gap are computed live.
const PATTERN = [
  { name: 'better tool use', c: 1.12, a: 1.10 },
  { name: 'evaluator module changed', c: 1.15, a: 0.96, gate: 'inv' },
  { name: 'objective reworded', c: 1.12, a: 0.94, gate: 'anchor' },
  { name: 'faster, but refuses less on known-bad', c: 1.14, a: 0.95, gate: 'multi' },
  { name: 'surge on some tasks, silent loss on others', c: 0.97, a: 1.0, gate: 'regress' },
  { name: 'cleaner planning', c: 1.10, a: 1.10 },
];
const GATES = [
  { id: 'inv', name: 'invariants', short: 'Invariants', what: 'evaluator hash, tool manifest' },
  { id: 'anchor', name: 'alignment anchor', short: 'Anchor', what: 'objective read-only, re-checked' },
  { id: 'multi', name: 'multi-objective checks', short: 'All objectives', what: 'safety, fairness, robustness too' },
  { id: 'regress', name: 'regression detection', short: 'Regressions', what: 'no task drops; else pause' },
];
function run(o) {
  const H = [{ c: 1, a: 1 }], blocked = { inv: 0, anchor: 0, multi: 0, regress: 0 };
  let c = 1, a = 1, cross = null, last = null;
  for (let t = 1; t <= o.cycles; t++) {
    const e = PATTERN[(t - 1) % PATTERN.length], stop = e.gate && o[e.gate];
    if (stop) blocked[e.gate]++; else { c *= e.c; a *= e.a; }
    if (cross === null && c / a > 1.5) cross = t;
    H.push({ c, a }); last = { ...e, t, stop };
  }
  return { H, c, a, ratio: c / a, blocked, cross, last };
}

export default {
  slug: 'recursive-self-improvement-bounded',
  title: 'Recursive self-improvement, and how to bound it',
  description: 'A system edits itself cycle after cycle. Capability and alignment both compound; four gates it cannot edit keep the gap from widening.',
  overview: 'A self-improvement cycle turns system S into a better-scoring S′; it is recursive when S′ proposes the next edit. AlphaEvolve improved algorithms, the Darwin Gödel Machine improved agent scaffolding, automated alignment research improved research; each is one step of such a loop, and none is fully closed. Think of two processes compounding side by side: capability at one rate per cycle, alignment, the property that the improved system still pursues the intended goal, at another. If capability compounds even slightly faster, the gap grows exponentially. Capability usually has the edge because it has sharp, measurable targets while alignment\'s are fuzzy, and optimisation loops are better at sharp targets. There is evidence the training process itself can widen the gap: in Anthropic\'s 2024 alignment-faking study, a model that believed it was being retrained behaved differently when it thought it was unobserved. And competition pushes to remove the human between cycles, the one reliable anchor. Research has converged on four primitives to bound such a loop, each checked by code the loop can\'t edit. Invariants: properties that must hold before and after every edit, like the evaluator\'s module hash and the tool-permission manifest. An alignment anchor: the objective pinned outside the edit surface and re-checked each cycle. Multi-objective constraints: performance, safety, fairness and robustness must all hold, not one score. Regression detection: compare each cycle with history and pause when any task drops past tolerance. They are mitigations, not proofs: results on self-reference limit what a system can prove about its successor, and an anchor can still be reinterpreted. What the gates do is make silent failure expensive: a drifting loop must now actively defeat an explicit check, which is easier to see.',
  keywords: ['recursive self-improvement', 'AI safety', 'alignment', 'invariants', 'regression detection', 'bounded optimisation', 'AI governance'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.4, -0.15], dir: [0.05, 0.75, 1.2], half: 1.15, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cycles: 24, inv: true, anchor: true, multi: true, regress: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    /* the race: per cycle, a dark bar for capability and a teal bar for alignment */
    const CX = t => -2.75 + t * 0.12, CZ = -0.3, HS = 0.11;
    const cb = [], ab = [];
    for (let t = 0; t <= 24; t++) {
      const c = P.box(0.05, 1, 0.12, CHAR, { r: 0.01 }); c.position.set(CX(t), 0, CZ - 0.11); c.userData.noFit = true; S.add(c); cb.push(c);
      const a = P.box(0.05, 1, 0.12, GOOD, { r: 0.01 }); a.position.set(CX(t), 0, CZ + 0.11); a.userData.noFit = true; S.add(a); ab.push(a);
    }
    /* the next edit runs down a belt through four gates (invariants, anchor, all objectives, regressions); a shut gate stops its kind of edit, and the
       red blocks beside it count the edits it stopped */
    const GX = i => 0.95 + i * 0.55, GZ = -0.3;
    const belt = P.belt(V(0.45, 0, GZ), V(3.05, 0, GZ), { w: 0.4, speed: 0.7 }); S.add(belt);
    const GC = ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#E3A72F'];
    const gates = GATES.map((g, i) => { const gt = P.gate(0.55, GC[i], { h: 0.5 }); gt.position.set(GX(i), 0, GZ); gt.rotation.y = Math.PI / 2; S.add(gt);
      const n = P.stack(0.18, 0.18, 0.09, { max: 6, color: RED }); n.position.set(GX(i), 0, GZ + 0.45); S.add(n); return { gt, n, g }; });
    S.add(P.keep(-2.9, 3.1, 1.4, -0.6, 0.6));

    let R = null;
    function draw() {
      R = run(st);
      for (let t = 0; t <= 24; t++) {
        const on = t <= st.cycles, h = R.H[Math.min(t, R.H.length - 1)];
        cb[t].visible = on; ab[t].visible = on;
        if (on) { cb[t].scale.y = Math.min(1.35, h.c * HS); ab[t].scale.y = Math.min(1.35, h.a * HS); }
      }
      gates.forEach(G => { const on = st[G.g.id]; G.gt.userData.set({ open: !on }); G.n.userData.set({ n: Math.min(6, R.blocked[G.g.id]), colors: Array(6).fill(RED) }); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Self-improvement cycles', min: 6, max: 24, step: 1, get: () => st.cycles, set: v => set({ cycles: Math.round(v) }) },
      ...GATES.map(g => ({ type: 'toggle', label: `Gate: ${g.name}`, short: g.short, get: () => st[g.id], set: v => set({ [g.id]: !!v }) })),
    ];
    const readouts = [
      { label: 'Capability', get: () => ({ v: `×${R.c.toFixed(1)}`, sub: `after ${st.cycles} cycles` }) },
      { label: 'Alignment', get: () => ({ v: `×${R.a.toFixed(1)}`, sub: 'kept pace?', good: R.a >= R.c / 1.2, bad: R.a < R.c / 1.5 }) },
      { label: 'Gap', get: () => ({ v: `×${R.ratio.toFixed(2)}`, sub: R.cross ? `past ×1.5 at cycle ${R.cross}` : 'within ×1.5', good: !R.cross, bad: !!R.cross }) },
    ];
    const labels = [
      { name: 'race', t: 'The race, cycle by cycle', d: 'Dark: capability. Teal: alignment', icon: 'wave', atV: V(-2.85, 0.1, -0.08) },
      { name: 'gates', t: 'Four gates', d: 'Invariants, anchor, objectives, regressions. Red: edits stopped', icon: 'check', atV: V(3.1, 0.1, -0.08) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Remove every gate', hint: 'unbounded loop', on: () => set({ ...D0, inv: false, anchor: false, multi: false, regress: false }), off: reset },
      { label: 'Drop the alignment anchor', hint: 'the objective drifts', on: () => set({ ...D0, anchor: false }), off: reset },
      { label: 'Stop watching for regressions', hint: 'losses absorbed', on: () => set({ ...D0, regress: false }), off: reset },
    ];
    function status() {
      const off = GATES.filter(g => !st[g.id]);
      if (off.length === 4) return { ok: false, msg: `<b>Unbounded, every edit lands: capability ×${R.c.toFixed(1)}, alignment ×${R.a.toFixed(1)} after ${st.cycles} cycles, and the gap passed ×1.5 at cycle ${R.cross}.</b> A small difference in rate compounds into a large gap. Each bad edit raised capability a little and lowered alignment a little; none of them looked dramatic.` };
      if (!st.anchor) return { ok: false, msg: `<b>Without the anchor, each "objective reworded" edit lands: alignment falls to ×${R.a.toFixed(1)} while capability reaches ×${R.c.toFixed(1)}${R.cross ? `, past ×1.5 at cycle ${R.cross}` : ''}.</b> The loop may improve how it pursues the objective, never what the objective is. Pin it outside the edit surface and re-check it every cycle.` };
      if (!st.regress) return { ok: true, msg: `<b>Without regression detection, the surge-and-silent-loss edits land: capability ends at ×${R.c.toFixed(1)} instead of ×${run(D0).c.toFixed(1)}, and nobody paused to look.</b> The gap stays small here, but losses on some tasks are absorbed into a rising average. Compare every task against history and pause on a drop.` };
      if (off.length) return { ok: false, msg: `<b>With ${off.map(g => g.name).join(' and ')} off, ${off.length === 1 ? 'that kind of edit lands' : 'those edits land'}: gap ×${R.ratio.toFixed(2)}${R.cross ? `, past ×1.5 at cycle ${R.cross}` : ''}.</b> Every gate catches a different failure; none covers for another.` };
      return { ok: true, msg: `<b>All four gates hold: after ${st.cycles} cycles capability is ×${R.c.toFixed(1)} and alignment ×${R.a.toFixed(1)}, a gap of ×${R.ratio.toFixed(2)}.</b> ${Object.values(R.blocked).reduce((x, y) => x + y, 0)} edits were stopped and the loop paused for review each time. These are mitigations, not proofs, but a drifting loop now has to defeat an explicit check, which is visible.` };
    }
    let feed = 0;
    return { update: dt => { gates.forEach(G => G.gt.userData.tick(dt)); belt.userData.tick(dt); feed -= dt; if (feed < 0) { feed = 1.2; belt.userData.send('#F4F1EA', { size: 0.16, stop: st.inv ? 0.17 : 1 }); } }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A loop that improves itself', home: true, say: 'Each cycle, the system proposes an edit to itself. Capability and alignment both compound, cycle after cycle.', act: m => m.set({ cycles: 6, inv: false, anchor: false, multi: false, regress: false }) },
    { t: 'The gap compounds', home: true, say: 'If capability grows even slightly faster, the gap grows exponentially. No single edit looks dramatic.', act: m => m.set({ cycles: 24, inv: false, anchor: false, multi: false, regress: false }) },
    { t: 'Invariants', home: true, say: 'Some properties must hold before and after every edit, like the evaluator\'s fingerprint. Code the loop can\'t edit checks them.', act: m => m.set({ cycles: 24, inv: true, anchor: false, multi: false, regress: false }) },
    { t: 'An anchor', home: true, say: 'Pin the objective where the loop can\'t edit it. It may improve how it pursues the goal, never what the goal is.', act: m => m.set({ cycles: 24, inv: true, anchor: true, multi: false, regress: false }) },
    { t: 'Every objective, every task', home: true, say: 'Safety, fairness and robustness must all hold, and no task may quietly get worse. Any failure pauses the loop.', act: m => m.set({ cycles: 24, inv: true, anchor: true, multi: true, regress: true }) },
    { t: 'Mitigations, not proofs', home: true, say: 'The gates don\'t prove the loop is safe. They make silent failure expensive, and keep a person between cycles.', act: m => m.set({ cycles: 24, inv: true, anchor: true, multi: true, regress: true }) },
  ],
  check: [
    { q: 'Capability grows a little faster than alignment each cycle. What happens to the gap?', options: ['It grows exponentially', 'It stays the same', 'It closes'], answer: 0, why: 'Small rate differences compound.', hint: 'Try Remove every gate.' },
    { q: 'What does an alignment anchor protect?', options: ['What the objective is', 'How fast the loop runs', 'The benchmark score'], answer: 0, why: 'The loop may improve the how, not the what.', hint: 'Try Drop the alignment anchor.' },
    { q: 'Do the four gates prove the loop is safe?', options: ['No: they make silent failure expensive', 'Yes, formally', 'Only with enough cycles'], answer: 0, why: 'Self-reference limits what can be proved.', hint: 'Read the last story step.' },
  ],
  terms: [
    ['Recursive self-improvement', 'A system that improves itself, and the improved system proposes the next edit.'],
    ['Capability and alignment rates', 'How fast each compounds per cycle.'],
    ['Invariant', 'A property that must hold before and after every edit.'],
    ['Alignment anchor', 'The objective, pinned outside the loop\'s edit surface.'],
    ['Multi-objective constraint', 'Every axis must hold, not just one score.'],
    ['Regression detection', 'Comparing each cycle to history and pausing on a drop.'],
  ],
  deeper: '<p><b>The open problems.</b> Will the evaluator still measure what matters many cycles on? Can the core objective survive self-edits? How do you catch a loss that follows a surge? Who checks a cycle before the next one starts?</p><p><b>Limits.</b> Löb\'s theorem and related self-reference results bound what a system can prove about its successor; no design closes the problem formally.</p><p><b>About this machine.</b> The six-edit pattern and its rates are illustrative; which edits land, and the compounding, are computed live. The source simulates the race with random noise.</p>',
  code: {
    title: 'The race, and the gate stack',
    note: 'Adapted from the course\'s RSI race and bounded-loop sketches.',
    text: `
def race(cycles, r_c, r_a):
    c = a = 1.0
    for t in range(cycles):
        c *= r_c; a *= r_a
        yield t, c, a, c - a          # the gap grows when r_c > r_a

def gate(edit, approved):
    if module_hash(edit.evaluator) != approved.evaluator_hash: return "invariant"
    if edit.objective != approved.objective:                    return "anchor"
    scores = evaluate(edit, axes=("performance", "safety", "fairness", "robustness"))
    if any(scores[k] < approved.floor[k] for k in scores):      return "multi-objective"
    if any(d < -approved.tolerance for d in per_task_delta(edit)): return "regression"
    return None                       # all four pass: the edit lands
`,
  },
};
