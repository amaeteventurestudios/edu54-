// Refusal evaluation (phase 19, lesson 84): a mock model with a strictness setting answers 20 safe and 20 unsafe prompts, each with a fixed risk score from a seeded generator. Under-refusal and over-refusal are counted, and calibration error is computed from stated confidence. A Harare assistant.
const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const R0 = rng(7), SAFE = Array.from({ length: 20 }, () => Math.min(0.95, 0.1 + 0.55 * R0() * R0() + 0.2 * R0())), BADP = Array.from({ length: 20 }, () => Math.max(0.05, 0.9 - 0.6 * R0() * R0() - 0.2 * R0()));
function run(o) {
  const over = SAFE.filter(s => s >= o.thr).length, under = BADP.filter(s => s < o.thr).length;
  const conf = s => Math.min(0.99, o.cal ? 0.7 + Math.abs(s - o.thr) * 0.8 : 0.93 + Math.abs(s - o.thr) * 0.5), rows = [...SAFE.map(s => ({ s, y: 0 })), ...BADP.map(s => ({ s, y: 1 }))].map(r => ({ c: conf(r.s), ok: (r.s >= o.thr) === !!r.y }));
  let ece = 0; for (let b = 5; b < 10; b++) { const g = rows.filter(r => Math.min(9, Math.floor(r.c * 10)) === b); if (g.length) ece += (g.length / rows.length) * Math.abs(g.reduce((a, r) => a + r.c, 0) / g.length - g.reduce((a, r) => a + (r.ok ? 1 : 0), 0) / g.length); }
  return { over, under, acc: (40 - over - under) / 40, ece };
}

export default {
  slug: 'refusal-evaluation',
  title: 'Refusal evaluation: two errors, not one',
  description: 'Refusing too much and refusing too little are both bugs. Measure both, on the same set.',
  overview: 'A safety pass can go wrong in two opposite ways. Under-refusal means answering what should be refused. Over-refusal means refusing what should be answered, and people stop using the tool. If you measure only refusals on harmful prompts, the best score goes to a model that refuses everything. So use a labelled set, with safe and unsafe prompts, and a fixed mock model, so that a change in the numbers comes from your change. Report both rates, plus calibration: does stated confidence match accuracy? This counts both for an assistant in Harare. It uses scores only, never prompt text.',
  keywords: ['refusal', 'over-refusal', 'under-refusal', 'calibration', 'AI safety', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 0.85, 1.05], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { thr: 0.45, cal: true, one: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.27 + i * 0.24;
    const mk = (i, z) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.19, 0.1, 0.38, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, z); S.add(b); return { b, m }; };
    const A = SAFE.map((s, i) => mk(i, -0.32)), B = BADP.map((s, i) => mk(i, 0.32));
    S.add(P.keep(-2.45, 2.45, 0.5, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      A.forEach(({ b, m }, i) => { const refused = SAFE[i] >= st.thr; m.color.set(st.one ? '#CFC9BA' : refused ? RED : GOOD); b.scale.y = !st.one && refused ? 3 : 1; });
      B.forEach(({ b, m }, i) => { const refused = BADP[i] >= st.thr; m.color.set(refused ? GOOD : RED); b.scale.y = refused ? 1 : 3; });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Refuse when risk is over', min: 0.1, max: 0.95, step: 0.05, get: () => st.thr, set: v => set({ thr: v }) },
      { type: 'toggle', label: 'Calibrated confidence', short: 'Calibrated', get: () => st.cal, set: v => set({ cal: !!v }) },
      { type: 'toggle', label: 'Test unsafe prompts only', short: 'One set', get: () => st.one, set: v => set({ one: !!v }) },
    ];
    const readouts = [
      { label: 'Under-refusal', get: () => ({ v: `${R.under} of 20`, sub: 'answered, should refuse', good: R.under <= 2, bad: R.under > 4 }) },
      { label: 'Over-refusal', get: () => (st.one ? { v: 'not measured', bad: true } : { v: `${R.over} of 20`, sub: 'refused, should answer', good: R.over <= 2, bad: R.over > 4 }) },
      { label: 'Calibration error', get: () => ({ v: R.ece.toFixed(2), sub: 'lower is better', good: R.ece < 0.12, bad: R.ece > 0.2 }) },
    ];
    const labels = [
      { name: 'a', t: 'Back row: safe prompts', d: 'Tall red: wrongly refused', icon: 'check', atV: V(X(0) - 0.13, 0.1, -0.32) },
      { name: 'b', t: 'Front row: unsafe prompts', d: 'Tall red: wrongly answered', icon: 'target', atV: V(X(19) + 0.13, 0.1, 0.32) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Refuse nearly everything', hint: 'a perfect-looking score', on: () => set({ ...D0, thr: 0.1, one: true }), off: reset },
      { label: 'Answer nearly everything', hint: 'nobody complains', on: () => set({ ...D0, thr: 0.95 }), off: reset },
      { label: 'Overconfident model', hint: 'sure, and wrong', on: () => set({ ...D0, cal: false }), off: reset },
    ];
    function status() {
      if (st.one) return { ok: false, msg: `<b>${20 - R.under} of 20 unsafe prompts refused, and it looks perfect.</b> Add the safe set: ${R.over} of 20 ordinary questions were refused too.` };
      if (R.under > 4) return { ok: false, msg: `<b>${R.under} of 20 unsafe prompts answered.</b> Over-refusal looks fine, at ${R.over}, because almost nothing is refused.` };
      if (R.over > 4) return { ok: false, msg: `<b>${R.over} of 20 ordinary questions refused.</b> Unsafe ones are handled, and people have stopped using the tool.` };
      if (!st.cal) return { ok: false, msg: `<b>Calibration error ${R.ece.toFixed(2)}.</b> Stated confidence runs above real accuracy, so it can\'t be used to route doubtful cases.` };
      return { ok: true, msg: `<b>${R.under} wrongly answered, ${R.over} wrongly refused.</b> Both are on the table, so a trade-off is a choice, not an accident.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two bugs', home: true, say: 'An assistant in Harare can fail in two ways: answering what it should refuse, and refusing what it should answer.', act: m => m.set({ thr: 0.45, cal: true, one: false }) },
    { t: 'The perfect score', home: true, say: 'Test only unsafe prompts, and refusing everything scores perfectly.', act: m => m.set({ thr: 0.1, cal: true, one: true }) },
    { t: 'Add the safe set', home: true, say: 'Add ordinary prompts, and that same setting fails most people.', act: m => m.set({ thr: 0.1, cal: true, one: false }) },
    { t: 'The other way', home: true, say: 'Loosen it too far, and unsafe prompts get answers.', act: m => m.set({ thr: 0.95, cal: true, one: false }) },
    { t: 'A fixed mock', home: true, say: 'A scripted mock model means that a change in numbers comes from your change.', act: m => m.set({ thr: 0.45, cal: true, one: false }) },
    { t: 'Calibration', home: true, say: 'Also ask if the model\'s confidence matches how often it is right.', act: m => m.set({ thr: 0.45, cal: false, one: false }) },
  ],
  check: [
    { q: 'What is over-refusal?', options: ['Refusing what should be answered', 'Answering everything', 'Slow replies'], answer: 0, why: 'It is a bug too.', hint: 'See Two bugs.' },
    { q: 'Why test both prompt sets?', options: ['Refusing everything looks perfect otherwise', 'To save time', 'For speed'], answer: 0, why: 'One metric can be gamed.', hint: 'Try Refuse nearly everything.' },
    { q: 'Why use a fixed mock model?', options: ['Changes in numbers come from your change', 'It is cheaper to run', 'It is more accurate'], answer: 0, why: 'A real model moves too.', hint: 'See A fixed mock.' },
  ],
  terms: [['Under-refusal', 'Answering what should be refused.'], ['Over-refusal', 'Refusing what should be answered.'], ['Calibration', 'Confidence that matches accuracy.'], ['ECE', 'Average gap between confidence and accuracy.']],
  deeper: '<p><b>Real sums.</b> Both rates and the calibration error are computed on forty scores.</p><p><b>The scores</b> are generated for this lesson, and no real prompts are used.</p>',
  code: {
    title: 'The two rates',
    note: 'Adapted from the course\'s evaluator (code/main.py).',
    text: `
def rates(rows):
    unsafe = [r for r in rows if r.label == "unsafe"]
    safe = [r for r in rows if r.label == "safe"]
    under = sum(not r.refused for r in unsafe) / len(unsafe)
    over = sum(r.refused for r in safe) / len(safe)
    return under, over
`,
  },
};
