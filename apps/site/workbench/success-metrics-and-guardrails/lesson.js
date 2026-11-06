// Success metrics (lesson 52): a Lilongwe farmers' co-operative pilots a WhatsApp advice assistant. Goal → questions → metrics, each with a
// direction, threshold, window and source; outcome metrics are paired with a guardrail (dosage answers reviewed) and a counter-metric (extension
// officers' review hours). Pass, revise and stop rules are written before the results; four fixed pilot results are judged live.
const METRICS = [
  { id: 'speed', q: 'how fast do farmers\nget an answer?', name: 'median reply', dir: 'at-most', th: 10, unit: ' min', src: 'reply log, 4 weeks', kind: 'outcome', lo: 0, hi: 20 },
  { id: 'right', q: 'are the answers\nright?', name: 'correct answers', dir: 'at-least', th: 0.9, unit: '', src: 'officer audit of 200', kind: 'outcome', lo: 0.6, hi: 1 },
  { id: 'dose', q: 'is every dosage\nanswer reviewed?', name: 'unreviewed dosage answers', dir: 'at-most', th: 0, unit: '', src: 'review queue log', kind: 'guardrail', lo: 0, hi: 3 },
  { id: 'hours', q: 'did the work move\nto the officers?', name: 'officer review hours a week', dir: 'at-most', th: 6, unit: ' h', src: 'timesheets', kind: 'counter', lo: 0, hi: 15 },
];
const RESULTS = [
  { name: 'Main pilot', v: { speed: 6, right: 0.93, dose: 0, hours: 5 } },
  { name: 'Officers swamped', v: { speed: 5, right: 0.91, dose: 0, hours: 11 } },
  { name: 'A dosage slip', v: { speed: 6, right: 0.92, dose: 1, hours: 6 } },
  { name: 'Close call', v: { speed: 8, right: 0.87, dose: 0, hours: 6 } },
];
const meets = (m, x, th) => m.dir === 'at-most' ? x <= th : x >= th;
function judge(o) {
  const M = METRICS.filter(m => (m.kind !== 'guardrail' || o.guard) && (m.kind !== 'counter' || o.counter));
  const issues = [];
  if (!M.some(m => m.kind === 'outcome')) issues.push('no outcome metric');
  if (!M.some(m => m.kind === 'guardrail')) issues.push('no guardrail metric');
  const vals = RESULTS[o.result].v;
  const th = m => (!o.prereg && m.id === 'right' && vals.right < m.th) ? 0.85 : m.th;
  const rows = M.map(m => ({ ...m, x: vals[m.id], t: th(m), ok: meets(m, vals[m.id], th(m)), moved: th(m) !== m.th }));
  const g = rows.find(r => r.kind === 'guardrail'), right = rows.find(r => r.id === 'right');
  const decision = (g && !g.ok) || right.x < 0.75 ? 'stop' : rows.every(r => r.ok) ? 'expand' : 'revise';
  const truth = vals.dose > 0 || vals.right < 0.75 ? 'stop' : METRICS.every(m => meets(m, vals[m.id], m.th)) ? 'expand' : 'revise';
  return { rows, issues, decision, truth, vals };
}

export default {
  slug: 'success-metrics-and-guardrails',
  title: 'Success metrics: decide before you measure',
  description: 'A Lilongwe farmers\' co-operative pilots a WhatsApp advice assistant. Pick metrics with a guardrail and a counter-metric, and write the rules before the results.',
  overview: 'Start with a goal, not a metric: farmers get correct advice faster, without unsafe dosage advice and without simply moving the work to the extension officers. Derive the questions it raises (how fast, how often right, does every dosage answer get reviewed, did the work shift to someone else) and only then choose metrics that answer them. Goal, question, metric. Each metric needs a contract: a name, a direction (at most or at least), a threshold, a window, a source and a population. Without a source and window a number can\'t be reproduced; without a threshold it can\'t drive a decision. Pair kinds: an outcome metric asks whether the desired state improved; a guardrail asks whether a fixed constraint held; a counter-metric asks whether the local gain shifted cost or harm elsewhere. Speed alone is never enough. Use the cheapest evidence that answers the current decision: offline replay for repeatability and edge cases, a bounded pilot for real behaviour and trust; neither replaces the other. Above all, decide before you measure: write the pass, fail and unclear paths first, or the team will move the threshold to protect the build.',
  keywords: ['metrics', 'goal question metric', 'guardrails', 'evaluation', 'AI products', 'pilots', 'measurement'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.4, 0], dir: [0.05, 0.75, 1.2], half: 1.05, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { guard: true, counter: true, prereg: true, result: 0 }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B', AMB = '#E3A72F';
    const KC = { outcome: '#5B8DB8', guardrail: '#7B6FA8', counter: '#3E9B9B' };
    /* the goal: a target on a post */
    const post = P.cyl(0.03, 0.4, '#6B6E7E'); post.position.set(-2.45, 0, -0.05); S.add(post);
    [[0.3, '#F4F1EA'], [0.2, AMB], [0.1, RED]].forEach(([r, c], i) => { const d = P.cyl(r, 0.05 + i * 0.01, c); d.rotation.x = Math.PI / 2; d.position.set(-2.45, 0.42, 0); S.add(d); });
    /* four metrics: a tower for the pilot's value on a base in its kind's colour (blue outcome, purple guardrail, teal counter-metric), and a glass
       slab at the threshold written before the results (red if it moved after). Green: met. Coral: missed */
    const MX = i => -1.55 + i * 0.68, VH = 0.95;
    const rows = METRICS.map((m, i) => { const base = P.box(0.5, 0.05, 0.5, KC[m.kind], { r: 0.03 }); base.position.set(MX(i), 0, 0); S.add(base);
      const t = P.tower(0.26, 0.26, GOOD, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(MX(i), 0.05, 0); S.add(t);
      const sm = new THREE.MeshLambertMaterial({ color: CHAR, transparent: true, opacity: 0.55 }), slab = P.box(0.44, 0.025, 0.44, '#fff', { r: 0.01, material: sm }); slab.userData.noFit = true; S.add(slab);
      return { base, t, slab, sm }; });
    /* the decision: three lamps, expand, revise, stop; the chosen one lit. An arrow marks the right answer when the plan got it wrong */
    const DEC = ['expand', 'revise', 'stop'], DCOL = [GOOD, AMB, RED], DX = i => 1.35 + i * 0.42;
    const lamps = DEC.map((d, i) => { const l = P.lamp(DCOL[i], { h: 0.45, r: 0.11 }); l.position.set(DX(i), 0, 0); S.add(l); return l; });
    const truth = P.arrow(V(0, 1, 0), V(0, 0.8, 0), 0.025, CHAR); truth.userData.noFit = true; S.add(truth);
    S.add(P.keep(-2.8, 2.4, 1.1, -0.35, 0.35));

    let R = null;
    function draw() {
      R = judge(st);
      METRICS.forEach((m, i) => {
        const W = rows[i], r = R.rows.find(x => x.id === m.id), on = !!r;
        W.t.visible = W.slab.visible = on; if (!on) return;
        const f = x => Math.max(0.03, Math.min(1, (x - m.lo) / (m.hi - m.lo)));
        W.t.userData.set({ h: VH * f(r.x), color: r.ok ? GOOD : BAD });
        W.slab.position.set(MX(i), 0.05 + VH * f(r.t), 0); W.sm.color.set(r.moved ? RED : CHAR);
      });
      const bad = R.issues.length > 0;
      lamps.forEach((l, i) => { const c = !bad && DEC[i] === R.decision; l.userData.set({ color: c ? DCOL[i] : '#C9C4B6', on: c }); });
      const wrong = !bad && R.decision !== R.truth; truth.visible = wrong || bad;
      if (truth.visible) { const k = DEC.indexOf(R.truth); P.setArrow(truth, V(DX(k), 1.0, 0), V(DX(k), 0.75, 0)); }
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Keep the guardrail: every dosage answer reviewed', short: 'Guardrail', get: () => st.guard, set: v => set({ guard: !!v }) },
      { type: 'toggle', label: 'Keep the counter-metric: officers\' hours', short: 'Counter-metric', get: () => st.counter, set: v => set({ counter: !!v }) },
      { type: 'toggle', label: 'Write the thresholds before the results', short: 'Decide first', get: () => st.prereg, set: v => set({ prereg: !!v }) },
      { type: 'buttons', label: 'Pilot result', options: RESULTS.map(r => r.name), get: () => st.result, act: i => set({ result: i }) },
    ];
    const readouts = [
      { label: 'Plan', get: () => ({ v: R.issues.length ? 'invalid' : 'valid', sub: R.issues.length ? R.issues[0] : `${R.rows.length} metrics`, good: !R.issues.length, bad: !!R.issues.length }) },
      { label: 'Decision', get: () => ({ v: R.issues.length ? '—' : R.decision, sub: RESULTS[st.result].name, good: R.decision === R.truth && !R.issues.length, bad: R.decision !== R.truth || !!R.issues.length }) },
      { label: 'Met', get: () => ({ v: `${R.rows.filter(r => r.ok).length} of ${R.rows.length}`, sub: 'metrics' }) },
    ];
    const labels = [
      { name: 'goal', t: 'Goal first', d: 'Then questions, then metrics', icon: 'target', atV: V(-2.75, 0.2, 0.25) },
      { name: 'met', t: 'Four metrics', d: 'Speed, accuracy, guardrail, counter. Slab: threshold', icon: 'scale', atV: V(MX(0) - 0.25, 0.2, 0.25) },
      { name: 'dec', t: 'Decision', d: 'Expand, revise or stop', icon: 'check', atV: V(DX(2) + 0.15, 0.2, 0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Measure without a guardrail', hint: 'a dosage slip passes', on: () => set({ ...D0, guard: false, result: 2 }), off: reset },
      { label: 'Drop the counter-metric', hint: 'officers swamped', on: () => set({ ...D0, counter: false, result: 1 }), off: reset },
      { label: 'Move the threshold after the results', hint: 'a close call', on: () => set({ ...D0, prereg: false, result: 3 }), off: reset },
    ];
    function status() {
      const v = R.vals;
      if (R.issues.length && !v.dose) return { ok: false, msg: '<b>Without a guardrail the plan is invalid: nothing measures whether dosage answers are reviewed.</b> This pilot happened to have none go out unreviewed; the next one might, and speed and accuracy wouldn\'t show it.' };
      if (R.issues.length) return { ok: false, msg: `<b>Without a guardrail the plan is invalid, and here it would wave through a pilot in which ${v.dose} dosage answer reached a farmer unreviewed: replies in ${v.speed} minutes, ${v.right} correct.</b> Speed and accuracy can\'t see a broken constraint. Measure the constraint itself: unreviewed dosage answers, at most zero.` };
      if (!st.counter && R.decision !== R.truth) return { ok: false, msg: `<b>Without the counter-metric the pilot says expand: replies in ${v.speed} minutes, ${v.right} correct. But the officers\' review time went from 5 to ${v.hours} hours a week.</b> The gain moved the work to another role. Add the counter-metric, and the honest decision is revise.` };
      if (!st.counter) return { ok: false, msg: `<b>No counter-metric: the plan can\'t see work moved to the officers.</b> This time their hours were ${v.hours} a week; nothing in the plan would have told you if they had doubled.` };
      if (!st.prereg && R.decision !== R.truth) return { ok: false, msg: `<b>Accuracy came in at ${v.right}, under the 0.9 written for this pilot, so the threshold was moved to 0.85 and the decision became expand.</b> Write pass, revise and stop before the results, or the team will move the line to protect the build. The honest decision is revise: a larger audit, or a narrower set of questions.` };
      if (!st.prereg) return { ok: false, msg: '<b>The rules were written after the results.</b> This time no threshold needed moving, but nothing stopped it. Write expand, revise and stop before you measure.' };
      const d = R.decision;
      return { ok: true, msg: d === 'expand' ? `<b>All ${R.rows.length} met: replies in ${v.speed} minutes, ${v.right} correct, every dosage answer reviewed, officers at ${v.hours} hours a week.</b> The rules were written first, so expanding is a decision, not a mood.` : d === 'stop' ? `<b>Stop: ${v.dose} dosage answer went out unreviewed, so the guardrail decides, whatever the speed (${v.speed} minutes) and accuracy (${v.right}).</b>` : `<b>Revise: ${R.rows.filter(r => !r.ok).map(r => r.name).join(' and ')} missed the threshold, and no guardrail broke.</b> Change the slice and measure again.` };
    }
    return { update: dt => rows.forEach(r => r.t.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Goal first', home: true, say: 'A farmers\' co-operative in Lilongwe pilots a WhatsApp advice assistant. Start from the goal: correct advice, faster, safely.', act: m => m.set({ guard: true, counter: true, prereg: true, result: 0 }) },
    { t: 'Questions, then metrics', home: true, say: 'Each question gets one metric, with a direction, a threshold, a window and a source.', act: m => m.set({ guard: true, counter: true, prereg: true, result: 0 }) },
    { t: 'The guardrail', home: true, say: 'One dosage answer goes out unreviewed. Speed and accuracy look fine; the guardrail says stop.', act: m => m.set({ guard: true, counter: true, prereg: true, result: 2 }) },
    { t: 'The counter-metric', home: true, say: 'Replies are faster, but the officers now spend twice as long reviewing. The counter-metric catches the shifted cost.', act: m => m.set({ guard: true, counter: true, prereg: true, result: 1 }) },
    { t: 'Decide before you measure', home: true, say: 'A close call on accuracy. If the rules are written after the results, the line moves to protect the build.', act: m => m.set({ guard: true, counter: true, prereg: false, result: 3 }) },
    { t: 'An honest gate', home: true, say: 'With the rules written first, the close call says revise, and the main pilot earns its expansion.', act: m => m.set({ guard: true, counter: true, prereg: true, result: 0 }) },
  ],
  check: [
    { q: 'Officers\' review hours double while replies get faster. Which kind of metric catches it?', options: ['A counter-metric', 'An outcome metric', 'A guardrail'], answer: 0, why: 'It catches cost moved elsewhere.', hint: 'Try Drop the counter-metric.' },
    { q: 'Why write the thresholds before the results?', options: ['So nobody moves the line to protect the build', 'To save time', 'Thresholds don\'t matter'], answer: 0, why: 'Decide before you measure.', hint: 'Try Move the threshold.' },
    { q: 'What does a metric need besides a threshold to be reproducible?', options: ['A source and a window', 'A chart', 'A bigger sample only'], answer: 0, why: 'Otherwise nobody can recompute it.', hint: 'Read a metric\'s line.' },
  ],
  terms: [
    ['Goal, question, metric', 'Derive metrics from the questions a goal raises.'],
    ['Outcome metric', 'Did the desired state improve?'],
    ['Guardrail', 'Did a fixed constraint hold?'],
    ['Counter-metric', 'Did the gain shift cost or harm elsewhere?'],
    ['Metric contract', 'Name, direction, threshold, window, source and population.'],
    ['Pre-registration', 'Writing the decision rules before seeing results.'],
  ],
  deeper: '<p><b>Offline and online.</b> Replay gives repeatability and edge cases; a bounded pilot gives real behaviour and trust. Use the cheapest evidence that answers the current decision.</p><p><b>Remove what can\'t decide.</b> A metric that is easy to collect but can\'t change any decision is noise; drop it.</p><p><b>About this machine.</b> The four pilot results are fixed; validation, thresholds, the moved line and the decision are computed live.</p>',
  code: {
    title: 'Validate the plan, then judge',
    note: 'Adapted from the course\'s measurement plan (code/main.py).',
    text: `
def validate(plan):
    issues = []
    kinds = {m.kind for m in plan.metrics}
    if "outcome" not in kinds:   issues.append("plan needs an outcome metric")
    if "guardrail" not in kinds: issues.append("plan needs a guardrail metric")
    for m in plan.metrics:
        if m.direction not in {"at-most", "at-least"}:
            issues.append(f"{m.name}: unknown direction")
        if not m.source.strip() or not m.window.strip():
            issues.append(f"{m.name}: needs a source and a window")
    return issues

def evaluate(m, value):
    return value <= m.threshold if m.direction == "at-most" else value >= m.threshold
`,
  },
};
