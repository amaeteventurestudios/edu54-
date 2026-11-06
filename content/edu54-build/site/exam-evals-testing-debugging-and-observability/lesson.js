// Exam prep, evals as engineering evidence: an invented e-commerce firm in Nairobi tests a prompt change to its support agent before release.
// The eval suite has three language slices weighted by traffic. The new version raises the weighted average, but its Swahili slice regresses,
// and one case pays a refund to the wrong order: the final reply reads well, so only grading the tool trajectory and final state sees it. An
// uncalibrated model judge flatters long answers, and a single run per case is noisy. The release gate's decision follows from the settings.
const SLICES = [{ n: 'English', w: 0.6, old: 91, neu: 94, lucky: 94 }, { n: 'French', w: 0.25, old: 88, neu: 90, lucky: 91 }, { n: 'Swahili', w: 0.15, old: 86, neu: 78, lucky: 85 }];
function gate(o) {
  const rows = SLICES.map(s => {
    let v = o.repeat ? s.neu : s.lucky;
    if (!o.calibrate) v += 3;
    return { ...s, v, drop: s.old - v };
  });
  const avgOld = SLICES.reduce((a, s) => a + s.w * s.old, 0), avgNew = rows.reduce((a, r) => a + r.w * r.v, 0);
  const severe = o.trajectory ? 1 : 0;
  const sliceFail = o.slices && rows.some(r => r.drop > 3);
  const ship = !(severe && o.slices) && !sliceFail && (o.slices || avgNew >= avgOld);
  return { rows, avgOld, avgNew, severe, sliceFail, ship };
}

export default {
  slug: 'exam-evals-testing-debugging-and-observability',
  title: 'Exam prep: evals turn agent behaviour into evidence',
  description: 'A support agent\'s new prompt raises the average, but should it ship? Check each language slice, the tool trajectory and the judge before the gate decides.',
  overview: 'An eval turns behaviour into evidence you can compare across versions. Use deterministic tests wherever the expected property is deterministic: a schema check, an exact value, whether a tool was called with the right arguments. Grade separately what can fail separately: the final output, the trajectory of tool calls, the final state of the systems touched, safety, and operational budgets such as cost and latency. A reply can read perfectly while the agent paid a refund to the wrong order; only trajectory and state grading see that. Where a model judges open-ended quality, calibrate it against human labels on a sample first, because judges have biases, such as preferring longer answers, that can inflate a change that is not better. Treat one run as one sample: models vary from run to run, so repeat cases and look at the spread before trusting a difference. Slice results by what matters, language, customer type, task, and gate releases on severe failures and on regressions in any important slice, not only on the weighted average, which can rise while a smaller group gets worse. Observability carries the same discipline into production: trace each request with versioned prompts, inputs, tool calls and decisions, without logging secrets, so a failure can be reproduced. When something fails, classify the failure before choosing a fix, and check serialisation boundaries, how data was formatted and passed, before blaming the model. This machine gates an invented support agent\'s release for an e-commerce firm in Nairobi.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'evals', 'release gate', 'LLM judge calibration', 'observability', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, -0.2], dir: [0.05, 0.85, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { trajectory: true, calibrate: true, repeat: true, slices: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', OFF = '#B9B3A6', BLUE = '#5B8DB8';
    /* three language slices: a grey tower for the old prompt, a coloured one for the new; deeper towers carry more traffic; dots count the runs per case */
    const HT = v => Math.max(0.03, (v - 70) / 30 * 1.2), SX = i => -2.0 + i * 0.95, BZ = -0.5;
    const rows = SLICES.map((s, i) => {
      const d = 0.15 + s.w * 0.7, o = P.box(0.32, HT(s.old), d, OFF, { r: 0.02 }); o.position.set(SX(i) - 0.19, 0, BZ); S.add(o);
      const n = P.tower(0.32, d, GOOD); n.userData.set({ cap: '' }); n.position.set(SX(i) + 0.19, 0, BZ); n.userData.noFit = true; S.add(n);
      const dots = [0, 1, 2, 3, 4].map(k => { const b = P.ball(0.04, BLUE); b.position.set(SX(i) - 0.2 + k * 0.1, 0.04, 0.05); S.add(b); return b; });
      return { n, dots };
    });
    /* the weighted average, old and new, for comparison */
    const AX = 0.95, oldAvg = P.tower(0.3, 0.42, OFF); oldAvg.userData.set({ cap: '' }); oldAvg.position.set(AX - 0.18, 0, BZ); oldAvg.userData.noFit = true; S.add(oldAvg);
    const newAvg = P.tower(0.3, 0.42, BLUE); newAvg.userData.set({ cap: '' }); newAvg.position.set(AX + 0.18, 0, BZ); newAvg.userData.noFit = true; S.add(newAvg);
    /* case 41: two order boxes, with the refund landing in the wrong one; you only see it if the trajectory is graded */
    const boxA = P.box(0.3, 0.22, 0.3, '#A87A4F', { r: 0.03 }); boxA.position.set(AX - 0.2, 0, 0.3); S.add(boxA);
    const boxB = P.box(0.3, 0.22, 0.3, '#A87A4F', { r: 0.03 }); boxB.position.set(AX + 0.2, 0, 0.3); S.add(boxB);
    const refund = P.ball(0.1, RED); refund.position.set(AX + 0.2, 0.32, 0.3); refund.userData.noFit = true; S.add(refund);
    /* the release gate, down when it blocks, and its lamp */
    const pad = P.box(1.0, 0.04, 0.34, '#6B6E7E', { r: 0.02 }); pad.position.set(2.0, 0, BZ); S.add(pad);
    const bar = P.gate(0.7, RED, { h: 0.5 }); bar.position.set(2.0, 0, BZ); S.add(bar);
    const lamp = P.lamp(GOOD, { h: 0.3, r: 0.12 }); lamp.position.set(2.0, 0, 0.3); S.add(lamp);
    S.add(P.keep(-2.45, 2.5, 1.25, -0.85, 0.55));

    let R = null;
    function draw() {
      R = gate(st);
      R.rows.forEach((r, i) => { rows[i].n.userData.set({ h: HT(r.v), color: r.drop > 3 ? BAD : GOOD }); rows[i].dots.forEach((b, k) => { b.visible = k === 0 || !!st.repeat; }); });
      oldAvg.userData.set({ h: HT(R.avgOld) }); newAvg.userData.set({ h: HT(R.avgNew) });
      refund.visible = !!st.trajectory;
      bar.visible = !R.ship;
      lamp.userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    function isOk() { return !R.ship && st.trajectory && st.calibrate && st.repeat && st.slices; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Grade trajectory and final state', short: 'Trajectory', get: () => st.trajectory, set: v => set({ trajectory: !!v }) },
      { type: 'toggle', label: 'Calibrate the judge on human labels', short: 'Calibrated judge', get: () => st.calibrate, set: v => set({ calibrate: !!v }) },
      { type: 'toggle', label: 'Run each case five times', short: 'Repeats', get: () => st.repeat, set: v => set({ repeat: !!v }) },
      { type: 'toggle', label: 'Gate on severe failures and slices', short: 'Slice gate', get: () => st.slices, set: v => set({ slices: !!v }) },
    ];
    const readouts = [
      { label: 'Gate', get: () => ({ v: R.ship ? 'ship' : 'block', sub: 'release decision', good: !R.ship, bad: R.ship }) },
      { label: 'Swahili', get: () => ({ v: `${R.rows[2].old} → ${R.rows[2].v}`, sub: 'slice', good: R.rows[2].drop <= 3, bad: R.rows[2].drop > 3 }) },
      { label: 'Severe failures', get: () => ({ v: `${R.severe}`, sub: st.trajectory ? 'seen' : 'not graded', good: st.trajectory, bad: !st.trajectory }) },
    ];
    const labels = [
      { name: 's', t: 'Slices, old and new', d: 'Grey: old. Deeper: more traffic', icon: 'scale', atV: V(-2.38, 0.3, -0.5) },
      { name: 't', t: 'The release gate', d: 'Down: blocked. Gone: it ships', icon: 'target', atV: V(2.48, 0.04, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Grade only the final reply', hint: 'the wrong refund is invisible', on: () => set({ ...D0, trajectory: false }), off: reset },
      { label: 'Trust an uncalibrated judge', hint: 'long answers flattered', on: () => set({ ...D0, calibrate: false, repeat: false }), off: reset },
      { label: 'Gate on the average', hint: 'one slice gets worse', on: () => set({ ...D0, slices: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.ship) return { ok: false, msg: `<b>The gate says ship: the weighted average rose from ${r.avgOld.toFixed(1)} to ${r.avgNew.toFixed(1)}, ${!st.slices ? 'and nothing checked the slices or severe failures, though Swahili fell and one case paid the wrong order' : st.trajectory ? '' : 'and only final replies were graded, so the wrong refund was never seen'}.</b> ${!st.slices ? 'Gate on severe failures and on regressions in every important slice.' : 'Grade the trajectory and the final state as well as the reply.'}` };
      if (!st.calibrate || !st.repeat) return { ok: false, msg: `<b>The gate blocks, but the numbers it shows are unreliable: ${!st.calibrate ? 'an uncalibrated judge adds points for length' : ''}${!st.calibrate && !st.repeat ? ', and ' : ''}${!st.repeat ? 'one run per case let a lucky Swahili run read 85 instead of 78' : ''}.</b> Calibrate judges against human labels and repeat cases.` };
      if (!st.trajectory) return { ok: false, msg: '<b>The gate blocks on the Swahili regression, but the refund paid to the wrong order went unseen because only replies were graded.</b> Grade trajectory and final state too.' };
      return { ok: true, msg: `<b>The gate blocks: the average rose to ${r.avgNew.toFixed(1)}, but Swahili fell from 86 to 78 and case 41 paid a refund to the wrong order, which only trajectory and state grading caught.</b> Fix the regression and the severe failure, then re-run the same suite.` };
    }
    return { update: dt => { rows.forEach(r => r.n.userData.tick(dt)); oldAvg.userData.tick(dt); newAvg.userData.tick(dt); bar.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A prompt change', home: true, say: 'A support agent\'s new prompt raises the weighted average. Should it ship?', act: m => m.set({ trajectory: false, calibrate: false, repeat: false, slices: false }) },
    { t: 'Calibrate the judge', home: true, say: 'The model judge likes long answers. Check it against human labels first.', act: m => m.set({ trajectory: false, calibrate: true, repeat: false, slices: false }) },
    { t: 'Repeat the runs', home: true, say: 'One lucky run hid a regression. Five runs per case show Swahili really fell.', act: m => m.set({ trajectory: false, calibrate: true, repeat: true, slices: false }) },
    { t: 'Look at the slices', home: true, say: 'The average rose while Swahili, a smaller slice, got worse. Gate on every slice.', act: m => m.set({ trajectory: false, calibrate: true, repeat: true, slices: true }) },
    { t: 'Grade the trajectory', home: true, say: 'One reply read perfectly, but the agent refunded the wrong order. Grade what it did.', act: m => m.set({ trajectory: true, calibrate: true, repeat: true, slices: true }) },
    { t: 'Evidence, not a number', home: true, say: 'The gate blocks for two concrete reasons. Fix them and run the same suite again.', act: m => m.set({ trajectory: true, calibrate: true, repeat: true, slices: true }) },
  ],
  check: [
    { q: 'The average rises but one language slice falls 8 points. Ship?', options: ['No: gate on important slices, not only the average', 'Yes, the average rose', 'Only on weekends'], answer: 0, why: 'Averages hide regressions.', hint: 'Try Gate on the average.' },
    { q: 'How do you catch a correct-sounding reply after a wrong action?', options: ['Grade the trajectory and final state', 'Read the reply more carefully', 'Use a longer judge prompt'], answer: 0, why: 'What the agent did, not what it said.', hint: 'Try Grade only the final reply.' },
    { q: 'Why repeat eval cases?', options: ['One run is one sample; models vary', 'To use more tokens', 'For speed'], answer: 0, why: 'Look at the spread.', hint: 'Try Trust an uncalibrated judge.' },
  ],
  practice: [
    { q: 'The expected output of a check is an exact order id. How should it be graded?', options: ['With a deterministic test', 'With a model judge', 'By eye', 'By the reply\'s tone'], answer: 0, why: 'Deterministic properties get deterministic tests.' },
    { q: 'A model judge rates the new version higher. What should be done before trusting it?', options: ['Calibrate the judge against human labels on a sample', 'Nothing', 'Use a bigger judge', 'Average it with the old score'], answer: 0, why: 'Judges have biases such as length.' },
    { q: 'A candidate passes once on a hard case it failed before. Is it fixed?', options: ['Not yet: repeat the case and look at the spread', 'Yes', 'Yes, if the reply is long', 'Only in production'], answer: 0, why: 'One run is one sample.' },
    { q: 'Production logs should help reproduce a failure. What must they include, and exclude?', options: ['Versioned prompts, inputs, tool calls and decisions, but no secrets', 'Everything, including API keys', 'Only the final reply', 'Nothing, for privacy'], answer: 0, why: 'Trace without leaking secrets.' },
    { q: 'An agent fails after a recent change to how tool results are formatted. Where should debugging start?', options: ['At the serialisation boundary: how the data was formatted and passed', 'By swapping models', 'By rewriting the prompt', 'By adding retries'], answer: 0, why: 'Check boundaries before blaming the model.' },
    { q: 'Which release rule is sound?', options: ['Block on any severe failure or a meaningful regression in an important slice', 'Ship if the average rises', 'Ship if the team likes it', 'Block only if everything fails'], answer: 0, why: 'Severe failures and slices, not only averages.' },
  ],
  terms: [
    ['Eval suite', 'A fixed set of cases used to compare versions.'],
    ['Trajectory', 'The tool calls an agent made on a case.'],
    ['Final state', 'What changed in the systems an agent touched.'],
    ['Model judge', 'A model grading open-ended outputs.'],
    ['Slice', 'A subset of cases, such as one language or customer type.'],
    ['Release gate', 'Rules that decide whether a version may ship.'],
  ],
  deeper: '<p><b>Failure classes.</b> Classify each failure, such as missing knowledge, a bad tool result, a parsing error or an instruction conflict, before choosing a fix.</p><p><b>Cost and latency.</b> Budgets are part of the eval: a version that is better but twice as slow may still fail the gate.</p><p><b>About this machine.</b> The firm, scores and cases are invented.</p>',
  code: {
    title: 'A release gate on slices and severe failures',
    note: 'Written for this lesson.',
    text: `
def gate(old, new, severe_failures, max_drop=3):
    if severe_failures:
        return "block", f"{len(severe_failures)} severe failure(s)"
    for slice_name in old:
        if old[slice_name] - new[slice_name] > max_drop:
            return "block", f"{slice_name} regressed"
    return "ship", "no severe failures, no slice regressed"

# new[...] are means over repeated runs, graded on reply, trajectory and final state,
# with any model judge calibrated against human labels first
`,
  },
};
