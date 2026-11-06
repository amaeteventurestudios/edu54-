// The smallest slice at the right stage (lessons 50 and 53): the Kumasi pharmacy's two riskiest bets become the required proof. Five candidate
// slices are gated on covering that proof before any scoring ((value + uncertainty reduced) / (effort + risk penalty)); the winner's stage follows
// from whether it needs real users or data, its consequence, reversibility and operational readiness, and each stage brings its own controls.
const PROOF = ['counts', 'controlled'];
const SLICES = [
  { id: 's1', name: 'notebook photos,\nclerk approves,\nread-only replay', v: 4, u: 5, e: 2, c: 2, rev: true, proves: ['counts', 'controlled'], users: true, data: true },
  { id: 's2', name: 'polished app\non sample data', v: 3, u: 3, e: 1, c: 1, rev: true, proves: [], users: true, data: false, why: 'UI only: no real counts' },
  { id: 's3', name: 'auto-order bot\nsends orders', v: 5, u: 4, e: 8, c: 5, rev: false, proves: ['counts', 'controlled'], users: true, data: true },
  { id: 's4', name: 'over-the-counter\nmedicines only', v: 3, u: 3, e: 1.5, c: 1, rev: true, proves: ['counts'], users: true, data: true, why: 'happy path: no controlled lines' },
  { id: 's5', name: 'data platform\nfor 12 branches', v: 2, u: 2, e: 9, c: 2, rev: true, proves: ['counts'], users: false, data: true, why: 'platform before one workflow' },
];
const score = s => Math.round((s.v + s.u) / (s.e + s.c * (s.rev ? 0.5 : 2)) * 100) / 100;
const CONTROLS = {
  prototype: ['synthetic or recorded inputs', 'discardable code', 'a learning question'],
  pilot: ['two shops, eight weeks', 'rollback', 'owner: head pharmacist', 'audit trail', 'exit: expand, revise or stop'],
  production: ['service level objective', 'on-call owner', 'security review', 'cost controls', 'rollback', 'recovery', 'monitoring', 'retirement path'],
};
const IN_PLACE = ['two shops, eight weeks', 'rollback', 'owner: head pharmacist', 'audit trail', 'exit: expand, revise or stop', 'a learning question'];
function chooseStage(s, ready) {
  if (!s.users && !s.data) return 'prototype';
  if (!ready || s.c >= 4 || !s.rev) return 'pilot';
  return 'production';
}
function decide(o) {
  const scored = SLICES.map(s => ({ ...s, score: score(s), eligible: PROOF.every(p => s.proves.includes(p)) }));
  const pool = o.gate ? scored.filter(s => s.eligible) : scored;
  const pick = pool.slice().sort((a, b) => b.score - a.score || a.e - b.e)[0];
  const ruled = chooseStage(pick, false), stage = o.stage === 'auto' ? ruled : o.stage;
  const need = CONTROLS[stage], missing = need.filter(c => !IN_PLACE.includes(c));
  const drift = stage === 'prototype' && pick.data;
  return { scored, pick, ruled, stage, need, missing, drift };
}

export default {
  slug: 'smallest-slice-right-stage',
  title: 'The smallest slice, at the right stage',
  description: 'The Kumasi pharmacy picks the smallest slice that proves its two riskiest bets, then the stage it is ready for, with that stage\'s controls.',
  overview: 'A useful slice crosses the minimum real workflow needed to observe an outcome. It can be narrow in users, data, duration and capability, but not narrow by cutting out the uncertainty you need to test. Start from the highest open risks and write them as required proof; a candidate is eligible only if it covers all of it. Then compare eligible slices on value, uncertainty reduced, effort, consequence and reversibility; the gate matters more than the arithmetic. Beware false minimums: the UI-only minimum removes the data uncertainty, the happy-path minimum leaves out the exception that carries the risk, the demo minimum persuades without measuring, and the platform minimum builds machinery before one workflow earns it. Write a stop rule before building: if every result leads to "keep building", it isn\'t an experiment. Then choose the stage by the question. A prototype asks whether the mechanism can produce the evidence at all; use one when no real users or data are needed, and keep it discardable. A pilot asks whether it works safely with a bounded real audience: it needs a named audience, an owner, limited time and authority, audit, rollback and exit criteria. Production asks whether the organisation can own it continuously: service levels, on-call, security review, cost controls, recovery, monitoring and a retirement path. Watch for stage drift: a prototype that gains users, data or authority without gaining ownership is dangerous, and the stage should be visible in the system itself, not just a banner.',
  keywords: ['MVP', 'vertical slice', 'pilot', 'prototype', 'product delivery', 'AI products', 'risk'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.3, 0.1], dir: [0.05, 0.9, 1.15], half: 1.2, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { gate: true, stop: true, stage: 'auto' }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B', AMB = '#E3A72F';
    /* the required proof from the riskiest bets, as two lamps: counts match the notebook, controlled lines reach the pharmacist */
    const pl = [-0.18, 0.18].map(z => { const l = P.lamp(GOOD, { h: 0.35, r: 0.1 }); l.position.set(-2.65, 0, z); S.add(l); return l; });
    /* five candidate slices: a tower each, height = (value + uncertainty reduced) / (effort + risk). Two dots in front: which proofs it covers.
       Grey: fails the proof gate. Gold: chosen */
    const SX = i => -1.85 + i * 0.58;
    const slices = SLICES.map((sl, i) => { const t = P.tower(0.34, 0.34, '#E8E1D0', { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(SX(i), 0, 0); S.add(t);
      const dots = PROOF.map((_, k) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), d = P.ball(0.05, '#fff', { material: m }); d.position.set(SX(i) - 0.08 + k * 0.16, 0.06, 0.32); S.add(d); return m; }); return { t, dots }; });
    /* three stages as steps (prototype, pilot, production); the chosen one lights up, and its controls stack beside: green in place, red missing */
    const SG = ['prototype', 'pilot', 'production'];
    const steps = SG.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: '#E8E1D0' }), b = P.box(0.42, 0.12 + i * 0.16, 0.6, '#fff', { r: 0.03, material: m }); b.position.set(1.3 + i * 0.44, 0, -0.05); S.add(b); return m; });
    const ctl = P.stack(0.36, 0.36, 0.09, { max: 8, color: GOOD }); ctl.position.set(2.85, 0.04, -0.05); S.add(ctl);
    /* the stop rule: a barrier written before the result (gone when there is none) */
    const stop = P.gate(0.6, RED, { h: 0.4 }); stop.position.set(0.7, 0, 0.55); S.add(stop);
    S.add(P.keep(-2.9, 3.1, 1.0, -0.4, 0.7));

    let R = null;
    function draw() {
      R = decide(st);
      R.scored.forEach((sl, i) => { const C = slices[i], chosen = sl.id === R.pick.id, out = st.gate && !sl.eligible;
        C.t.userData.set({ h: Math.max(0.05, sl.score * 0.22), color: chosen ? AMB : out ? '#B9B3A6' : '#E8E1D0' });
        PROOF.forEach((p, k) => C.dots[k].color.set(sl.proves.includes(p) ? GOOD : '#C9C4B8')); });
      SG.forEach((n, i) => steps[i].color.set(n === R.stage ? (R.missing.length || R.drift ? BAD : GOOD) : '#E8E1D0'));
      ctl.userData.set({ n: R.need.length, colors: R.need.map(c => R.missing.includes(c) ? RED : GOOD) });
      stop.visible = st.stop;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Gate candidates on the required proof', short: 'Proof gate', get: () => st.gate, set: v => set({ gate: !!v }) },
      { type: 'toggle', label: 'Write the stop rule before building', short: 'Stop rule', get: () => st.stop, set: v => set({ stop: !!v }) },
      { type: 'buttons', label: 'Stage', options: ['By rule', 'Prototype', 'Production'], get: () => ['auto', 'prototype', 'production'].indexOf(st.stage), act: i => set({ stage: ['auto', 'prototype', 'production'][i] }) },
    ];
    const readouts = [
      { label: 'Slice', get: () => ({ v: R.pick.id, sub: R.pick.eligible ? 'covers the proof' : 'misses the proof', good: R.pick.eligible, bad: !R.pick.eligible }) },
      { label: 'Stage', get: () => ({ v: R.stage, sub: R.stage === R.ruled ? 'by the rule' : `the rule says ${R.ruled}`, good: !R.missing.length && !R.drift, bad: R.missing.length > 0 || R.drift }) },
      { label: 'Controls', get: () => ({ v: `${R.need.length - R.missing.length} of ${R.need.length}`, sub: R.drift ? 'stage drift' : 'in place', good: !R.missing.length && !R.drift, bad: R.missing.length > 0 || R.drift }) },
    ];
    const labels = [
      { name: 'proof', t: 'Required proof', d: 'From the two riskiest bets', icon: 'target', atV: V(-2.75, 0.2, 0.25) },
      { name: 'slices', t: 'Five slices', d: 'Height: value per effort. Gold: chosen', icon: 'box', atV: V(SX(0) - 0.17, 0.2, 0.25) },
      { name: 'stage', t: 'Stage', d: 'Prototype, pilot, production', icon: 'turn', atV: V(1.3, 0.2, 0.25) },
      { name: 'ctl', t: 'Its controls', d: 'Red: not in place', icon: 'check', atV: V(3.05, 0.2, 0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Pick the best score, whatever it proves', hint: 'no proof gate', on: () => set({ ...D0, gate: false }), off: reset },
      { label: 'Call the pilot production', hint: 'controls missing', on: () => set({ ...D0, stage: 'production' }), off: reset },
      { label: 'Let a prototype place real orders', hint: 'stage drift', on: () => set({ ...D0, stage: 'prototype' }), off: reset },
    ];
    function status() {
      if (!R.pick.eligible) return { ok: false, msg: `<b>Without the gate, the polished app on sample data wins on score (${R.pick.score}), and it proves neither bet.</b> It removes exactly the uncertainty the slice exists to test: whether the app\'s counts are real. Gate on the required proof first; then the arithmetic can choose among slices that matter.` };
      if (R.drift) return { ok: false, msg: '<b>The chosen slice reads real notebooks and real orders, but it is run as a prototype: no named owner, no audit, no rollback, no exit criteria.</b> That is stage drift. Real data and authority need pilot controls, and the stage should show in the system, not only in a banner.' };
      if (R.missing.length) return { ok: false, msg: `<b>Called production, the slice is missing ${R.missing.length} of ${R.need.length} controls: ${R.missing.slice(0, 4).join(', ')}…</b> Production means the pharmacy owns it continuously. Until operations are ready, this is a pilot: two shops, eight weeks, an owner and a way to stop.` };
      if (!st.stop) return { ok: false, msg: '<b>With no stop rule, every result leads to "keep building", so the slice isn\'t an experiment.</b> Decide before building what failure means: if counts differ on more than 1 line in 10, change the mechanism; if a controlled line skips the pharmacist, stop.' };
      return { ok: true, msg: `<b>Slice s1 covers both bets (score ${R.pick.score}, ahead of the auto-order bot at ${R.scored[2].score}); it needs real data, so the rule makes it a pilot, with all five pilot controls in place and a stop rule written first.</b> The polished app scored higher, and was never eligible.` };
    }
    return { update: dt => { slices.forEach(c => c.t.userData.tick(dt)); stop.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The proof comes first', home: true, say: 'The pharmacy\'s two riskiest bets become the proof the first slice must produce: real counts, and controlled medicines reaching the pharmacist.', act: m => m.set({ gate: true, stop: true, stage: 'auto' }) },
    { t: 'False minimums', home: true, say: 'The polished app on sample data scores highest. It proves neither bet, so the gate removes it before the scores count.', act: m => m.set({ gate: false, stop: true, stage: 'auto' }) },
    { t: 'The gate, then the score', home: true, say: 'Among slices that cover the proof, the read-only replay wins: high on learning, low on effort, easy to undo.', act: m => m.set({ gate: true, stop: true, stage: 'auto' }) },
    { t: 'Write the stop rule', home: true, say: 'Before building, decide what failure means. If every result says keep building, it isn\'t an experiment.', act: m => m.set({ gate: true, stop: false, stage: 'auto' }) },
    { t: 'Pilot, not production', home: true, say: 'It uses real data, and operations aren\'t ready, so it is a pilot: two shops, eight weeks, an owner and a way to stop.', act: m => m.set({ gate: true, stop: true, stage: 'production' }) },
    { t: 'The right stage', home: true, say: 'Each stage asks a different question and needs its own controls. This one asks whether it works safely with real people.', act: m => m.set({ gate: true, stop: true, stage: 'auto' }) },
  ],
  check: [
    { q: 'A slice scores highest but proves neither risky bet. What happens?', options: ['It is not eligible, whatever its score', 'It wins', 'It becomes the pilot'], answer: 0, why: 'The gate matters more than the arithmetic.', hint: 'Try Pick the best score.' },
    { q: 'A slice needs real data and operations aren\'t ready. Which stage?', options: ['Pilot', 'Prototype', 'Production'], answer: 0, why: 'Real conditions, bounded audience and authority.', hint: 'Read the stage rule.' },
    { q: 'What makes a slice an experiment rather than a build?', options: ['A stop rule written before the result', 'A demo', 'A deadline'], answer: 0, why: 'Some result must change the plan.', hint: 'Turn off Stop rule.' },
  ],
  terms: [
    ['Vertical slice', 'The minimum real workflow end to end that can show an outcome.'],
    ['Required proof', 'The bets a slice must test to be eligible.'],
    ['False minimum', 'A slice made small by cutting out the risk.'],
    ['Stop rule', 'What failure means, decided before building.'],
    ['Pilot', 'Real users and data, bounded audience, time and authority.'],
    ['Stage drift', 'A prototype gaining users, data or authority without ownership.'],
  ],
  deeper: '<p><b>The score formula.</b> Here (value + uncertainty reduced) / (effort + consequence × 0.5 if reversible, × 2 if not). It is deliberately simple; the point is to state why.</p><p><b>From pilot to production.</b> Production starts when the organisation accepts ongoing responsibility: a service level, someone on call, security and cost reviewed, and a way to retire it.</p><p><b>About this machine.</b> The slices, their ratings and the controls in place are fixed; eligibility, scores, the stage rule and the missing controls are computed live.</p>',
  code: {
    title: 'Gate, score, then choose the stage',
    note: 'Adapted from the course\'s slice and stage labs (code/main.py).',
    text: `
def score(s):
    penalty = s.consequence * (2 if not s.reversible else 0.5)
    return round((s.outcome_value + s.uncertainty_reduced) / (s.effort + penalty), 3)

def choose(slices, required_proof):
    eligible = [s for s in slices if required_proof <= set(s.proves)]
    if not eligible:
        raise ValueError("no slice proves the required assumptions")
    return max(eligible, key=lambda s: (score(s), -s.effort))

def choose_stage(d):
    if not d.real_users_required and not d.real_data_required:
        return "prototype"
    if not d.operational_readiness or d.consequence >= 4 or not d.reversible:
        return "pilot"
    return "production"
`,
  },
};
