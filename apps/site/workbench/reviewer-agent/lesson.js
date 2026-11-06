// Reviewer agent (phase 14, lesson 39): a builder fixes a bug in a Harare pharmacy's stock app. The gate says passed, and the fix solved the wrong half. A reviewer scores five dimensions, 0 to 2.
// Total under 7 is a soft fail; under 5, or any zero, a hard fail. The reviewer must be a separate role, with fresh context, or scores drift upward.
const DIM = ['Problem fit', 'Scope', 'Assumptions', 'Verification', 'Handoff'];
const CASE = { wrong: [0, 2, 1, 1, 2], creep: [2, 0, 1, 2, 1], clean: [2, 2, 2, 2, 1], thin: [2, 2, 1, 1, 1] };
function run(o) {
  const truth = CASE[o.c];
  const seen = o.who === 'same' ? truth.map(v => Math.min(2, v + 1)) : o.rubric ? truth : truth.map(() => 2);
  const total = seen.reduce((a, b) => a + b, 0), real = truth.reduce((a, b) => a + b, 0);
  const verdict = (s, t) => t < 5 || s.some(v => v === 0) ? 'hard' : t < 7 ? 'soft' : 'pass';
  return { truth, seen, total, real, v: verdict(seen, total), rv: verdict(truth, real) };
}

export default {
  slug: 'reviewer-agent',
  title: 'Reviewer agent: separate the builder from the marker',
  description: 'The gate says passed, and the fix solved the wrong half of the bug. Five scored questions, from someone who didn\'t write it.',
  overview: 'A verification gate checks facts: did the tests run, did the rules pass, did scope hold? Then a fix merges and two days later you find it solved the wrong half of the bug. Some questions a command can\'t ask. Did this solve the task as stated? Did scope grow without a word? Are the assumptions written down? Does the test prove the goal, or something weaker? Can the next session pick this up? A reviewer scores each of these from 0 to 2, and must be a separate role with fresh context, because the builder already believes its own reasoning. The same model is fine. The same context is not.',
  keywords: ['reviewer agent', 'code review', 'rubric', 'verification', 'agent workbench', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.65, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { c: 'wrong', who: 'fresh', rubric: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const builder = add(P.robot(BLUE, { scale: 0.85 })); builder.position.set(-2.1, 0.03, -0.15);
    const marker = add(P.robot('#7B6FA8', { scale: 0.85 })); marker.position.set(-1.15, 0.03, -0.15);
    const X = i => -0.35 + i * 0.5;
    const T = DIM.map((n, i) => { const t = add(P.tower(0.36, 0.42, GOOD)), g = add(P.tower(0.09, 0.09, '#2C2D31')); t.position.set(X(i), 0.03, -0.1); g.position.set(X(i) + 0.22, 0.03, -0.1); t.userData.set({ cap: '' }); g.userData.set({ cap: '' }); return { t, g }; });
    const scale = add(P.dial(0.34)); scale.position.set(-1.6, 0.03, 0.42);
    const gate = add(P.gate(0.9, SAF)); gate.position.set(1.05, 0.03, 0.5);
    S.add(P.keep(-2.5, 2.5, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach(({ t, g }, i) => { t.userData.set({ h: Math.max(0.04, R.seen[i] * 0.4), color: R.seen[i] === 0 ? RED : R.seen[i] === 1 ? SAF : GOOD }); g.userData.set({ h: Math.max(0.04, R.truth[i] * 0.4) }); });
      marker.visible = st.who === 'fresh';
      scale.userData.set({ v: 1 - R.total / 10 });
      gate.userData.set({ open: R.v === 'pass', color: R.v === 'pass' ? GOOD : R.v === 'soft' ? SAF : RED });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['wrong', 'creep', 'thin', 'clean'], WK = ['fresh', 'same'];
    const controls = [
      { type: 'buttons', label: 'The change', options: ['Wrong half', 'Scope crept', 'Thin test', 'Clean'], get: () => CK.indexOf(st.c), act: i => set({ c: CK[i] }) },
      { type: 'buttons', label: 'Reviewed by', options: ['Fresh reviewer', 'The builder itself'], get: () => WK.indexOf(st.who), act: i => set({ who: WK[i] }) },
      { type: 'toggle', label: 'Score five dimensions, not a feeling', short: 'Rubric', get: () => st.rubric, set: v => set({ rubric: !!v }) },
    ];
    const VN = { pass: 'pass', soft: 'soft fail', hard: 'hard fail' };
    const readouts = [
      { label: 'Review score', get: () => ({ v: `${R.total} of 10`, sub: `honest score ${R.real}` }) },
      { label: 'Verdict', get: () => ({ v: VN[R.v], sub: R.v === R.rv ? 'matches the truth' : `should be ${VN[R.rv]}`, good: R.v === R.rv, bad: R.v !== R.rv }) },
      { label: 'Weakest dimension', get: () => { const m = Math.min(...R.seen); return { v: DIM[R.seen.indexOf(m)], sub: `scored ${m} of 2` }; } },
    ];
    const labels = [
      { name: 'r', t: 'Builder, then marker', d: 'Two roles, fresh context', icon: 'user', atV: V(-2.35, 0.5, -0.15) },
      { name: 't', t: 'Five scores, 0 to 2', d: 'Pin: honest score. Gate opens on a pass', icon: 'chart', atV: V(X(4) + 0.2, 0.2, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the builder mark itself', hint: 'it believes its own reasoning', on: () => set({ ...D0, who: 'same' }), off: reset },
      { label: 'Ask "looks good?"', hint: 'no rubric', on: () => set({ ...D0, rubric: false }), off: reset },
      { label: 'Self-review a scope creep', hint: 'it added it on purpose', on: () => set({ ...D0, c: 'creep', who: 'same' }), off: reset },
    ];
    function status() {
      if (st.who === 'same' && R.v !== R.rv) return { ok: false, msg: `<b>The builder gave itself ${R.total} of 10. The honest score is ${R.real}.</b> It already believes the story it told while building, so it reads its own reasoning, not the diff. The same model is fine, but with fresh context.` };
      if (!st.rubric && R.v !== R.rv) return { ok: false, msg: `<b>"Looks good", ${R.total} of 10, and the change is a ${VN[R.rv]}.</b> A general impression rewards tidy code. Asking five specific questions forces a look at each, and a zero on one can't be averaged away.` };
      if (R.v === 'pass') return { ok: true, msg: `<b>${R.total} of 10: pass.</b> The fix answers the task as written, stays in scope and has a test that proves it. The reviewer's report goes to the human reviewer as a head start, not a replacement.` };
      return { ok: true, msg: `<b>${R.total} of 10: ${VN[R.v]}, caught by a fresh reviewer.</b> The gate had passed this. ${st.c === 'wrong' ? 'Problem fit scored zero: tests pass, and the task as stated is still unsolved.' : st.c === 'creep' ? 'Scope scored zero: edits went past the contract with no note.' : 'The test proved something weaker than the goal.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The gate passed', home: true, say: 'An agent fixes a bug in a Harare pharmacy\'s stock app. The tests pass, and the gate says fine. Yet only half the bug is fixed.', act: m => m.set({ c: 'wrong', who: 'same', rubric: true }) },
    { t: 'Its own marker', home: true, say: 'Ask the builder to review itself and it agrees with itself. It reads its own reasoning, not the change.', act: m => m.set({ c: 'wrong', who: 'same', rubric: true }) },
    { t: 'A fresh reviewer', home: true, say: 'Give the review to a separate role with fresh context. It sees the zero: this doesn\'t solve the task as written.', act: m => m.set({ c: 'wrong', who: 'fresh', rubric: true }) },
    { t: 'Five questions', home: true, say: 'Problem fit, scope, assumptions, verification, handoff. Each scores nought to two, and a zero anywhere is a hard fail.', act: m => m.set({ c: 'creep', who: 'fresh', rubric: true }) },
    { t: 'Not a feeling', home: true, say: 'Ask only whether it looks good, and tidy work passes. The rubric forces a look at each question.', act: m => m.set({ c: 'wrong', who: 'fresh', rubric: false }) },
    { t: 'A clean change', home: true, say: 'A good change scores well and the gate opens. The report then gives the human reviewer a head start.', act: m => m.set({ c: 'clean', who: 'fresh', rubric: true }) },
  ],
  check: [
    { q: 'Why shouldn\'t a builder review its own work in the same context?', options: ['It already believes its own reasoning', 'It costs too much', 'It can\'t read diffs'], answer: 0, why: 'Fresh context reads what is there, not what was meant.', hint: 'Try Let the builder mark itself.' },
    { q: 'What can a reviewer ask that a gate can\'t?', options: ['Did it solve the task as stated?', 'Did the tests run?', 'Did the rules pass?'], answer: 0, why: 'The gate checks facts, the reviewer makes judgments.', hint: 'Choose Wrong half.' },
    { q: 'Is a run with one dimension at zero a pass if the total is high?', options: ['No, any zero is a hard fail', 'Yes, the total decides', 'Only with a person watching'], answer: 0, why: 'A zero can\'t be averaged away.', hint: 'Look at Scope crept.' },
  ],
  terms: [
    ['Verification gate', 'A check of deterministic facts.'],
    ['Reviewer', 'A separate role that judges the change.'],
    ['Rubric', 'Fixed questions with fixed scores.'],
    ['Soft fail', 'A total under seven: revise it.'],
    ['Hard fail', 'A total under five, or any zero.'],
    ['Fresh context', 'Starting with the change, not the reasoning behind it.'],
  ],
  deeper: '<p><b>Gate first, reviewer second.</b> Don\'t pay a reviewer to find what a command can find.</p><p><b>What the reviewer reads.</b> The task as stated, the contract, the diff and the test output. Not the builder\'s chat.</p><p><b>People stay in the loop.</b> The report is an artifact to start from. A person still decides on anything that matters.</p>',
  code: {
    title: 'A review report',
    note: 'Adapted from the course\'s reviewer loop (code/main.py).',
    text: `
DIMENSIONS = ["problem_fit", "scope", "assumptions", "verification", "handoff"]

def review(task, contract, diff, test_output):
    report = reviewer_model(rubric(DIMENSIONS), task, contract, diff, test_output)
    scores = [report[d]["score"] for d in DIMENSIONS]    # 0, 1 or 2 each
    total = sum(scores)
    if total < 5 or 0 in scores:
        return "hard_fail", report
    return ("soft_fail" if total < 7 else "pass"), report
`,
  },
};
