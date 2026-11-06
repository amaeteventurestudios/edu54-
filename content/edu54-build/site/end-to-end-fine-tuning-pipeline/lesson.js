// Capstone: an end-to-end tuning pipeline (phase 19, capstone 7). A Dodoma legal aid group adapts an open model to Swahili case notes. Six stations in a line: clean, SFT, DPO, evaluate, quantize, serve. A block travels and its score is tracked.
// Skip a check and a later score lies. The held-out score and the served score are computed step by step, and a gate stops a worse model reaching users.
const STN = ['Clean', 'SFT', 'DPO', 'Evaluate', 'Quantize', 'Serve'];
function run(o) {
  let q = 52; const seen = [];
  q += o.clean ? 8 : 0; seen.push(q);
  q += 14 - (o.clean ? 0 : 6); seen.push(q);
  q += o.dpo ? 6 : 0; if (o.dpo && o.steps > 60) q -= (o.steps - 60) * 0.2; seen.push(Math.round(q));
  const shown = o.leak ? Math.min(99, q + 15) : q; seen.push(Math.round(shown));
  const after = q - (o.calib ? 1 : 7); seen.push(Math.round(after));
  const base = 70, ships = (o.gate ? after >= base : true);
  seen.push(ships ? Math.round(after) : base);
  return { seen, q: Math.round(q), after: Math.round(after), shown: Math.round(shown), ships, bad: ships && after < base, base };
}

export default {
  slug: 'end-to-end-fine-tuning-pipeline',
  title: 'Capstone: from raw notes to a served model',
  description: 'Clean, tune, prefer, test, shrink, serve. Follow one model down the line, and see where a score can lie.',
  overview: 'Most teams never train a base model. They keep a tuning pipeline to adapt one to their own work. It runs in a line: clean the data, tune on demonstrations, tune on preferences, evaluate on held-out cases, quantize, then serve. Each step can quietly undo the last. Dirty data is learned too. Too much DPO over-optimises. A leaked test set flatters you. Quantizing changes quality, so test again after it. And a gate should compare with what is live, so a worse model can\'t ship. This capstone runs a legal-aid model in Dodoma down the whole line, tracking one honest score from start to finish.',
  keywords: ['fine-tuning', 'SFT', 'DPO', 'quantization', 'model evaluation', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.55, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { clean: true, dpo: true, steps: 50, leak: false, calib: true, gate: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.8;
    const T = STN.map((n, i) => { const t = add(P.tower(0.5, 0.6, GOOD)); t.position.set(X(i), 0.03, -0.15); t.userData.set({ cap: '' }); return t; });
    const rail = P.box(4.6, 0.04, 0.16, '#6B6E7E', { r: 0.02 }); rail.position.set(0, 0.03, 0.42); S.add(rail);
    const block = P.box(0.3, 0.22, 0.26, SAF, { r: 0.04 }); block.userData.noFit = true; S.add(block);
    const gate = add(P.lamp(GOOD, { h: 0.4, r: 0.1 })); gate.position.set(X(4) + 0.4, 0.03, 0.42);
    S.add(P.keep(-2.45, 2.45, 1.25, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      T.forEach((t, i) => t.userData.set({ h: R.seen[i] * 0.012, color: i === 3 && st.leak ? BAD : R.seen[i] < R.base ? SAF : GOOD }));
      gate.userData.set({ color: st.gate ? (R.ships ? '#3E9B5F' : '#D9483B') : '#C9C4B6', on: st.gate });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('clean', 'Clean the data first', 'Clean'), tg('dpo', 'Run DPO on preferences', 'DPO'),
      { type: 'slider', label: 'DPO steps', min: 10, max: 150, step: 5, get: () => st.steps, set: v => set({ steps: v }) },
      tg('leak', 'Test cases leaked into training', 'Leak'), tg('calib', 'Calibrate quantization on our own notes', 'Calibrate'), tg('gate', 'Only ship if better than what\'s live', 'Gate'),
    ];
    const readouts = [
      { label: 'Evaluation says', get: () => ({ v: `${R.shown}`, sub: st.leak ? 'flattered by a leak' : 'held-out score', bad: st.leak }) },
      { label: 'After quantizing', get: () => ({ v: `${R.after}`, sub: `live model: ${R.base}`, good: R.after >= R.base, bad: R.after < R.base }) },
      { label: 'Served', get: () => ({ v: R.ships ? 'new model' : 'old model stays', sub: R.bad ? 'a worse model shipped' : '', bad: R.bad }) },
    ];
    const labels = [
      { name: 't', t: 'Six stations', d: 'Height: score at that point', icon: 'target', atV: V(X(0) - 0.25, 0.2, -0.15) },
      { name: 'g', t: 'The gate', d: 'Compares with what\'s live', icon: 'check', atV: V(X(5) + 0.25, 0.2, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let test cases leak', hint: 'a score too good to be true', on: () => set({ ...D0, leak: true, calib: false, gate: false }), off: reset },
      { label: 'Push DPO too far', hint: 'over-optimising', on: () => set({ ...D0, steps: 150 }), off: reset },
      { label: 'Quantize and don\'t retest', hint: 'calibrated on news', on: () => set({ ...D0, calib: false, gate: false }), off: reset },
      { label: 'Skip cleaning', hint: 'it learns the mess', on: () => set({ ...D0, clean: false }), off: reset },
    ];
    function status() {
      if (R.bad) return { ok: false, msg: `<b>Evaluation said ${R.shown}, and users got ${R.after}, below the live ${R.base}.</b> ${st.leak ? 'A leaked test flatters the model.' : 'Quantizing changed it after the test.'} With no gate, nothing stopped it. Test the thing you actually ship.` };
      if (!R.ships) return { ok: true, msg: `<b>The gate kept the old model: ${R.after} against ${R.base}.</b> ${st.clean ? 'Push on: the problem is upstream.' : 'Dirty data cost you the gain.'} A pipeline that can say no is working.` };
      return { ok: true, msg: `<b>Shipped at ${R.after}, up from ${R.base}.</b> Each step added something, and the score held through quantizing.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.3) % 1; const stop = R.ships ? 1 : 0.76; block.position.set(-2.2 + 4.4 * Math.min(u, stop), 0.08, 0.42); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One line', home: true, say: 'A legal aid group in Dodoma adapts an open model to Swahili case notes. Six stations, in one line.', act: m => m.set({ clean: false, dpo: false, steps: 50, leak: false, calib: true, gate: true }) },
    { t: 'Clean, then tune', home: true, say: 'Clean the notes, then tune on good examples. The score climbs at each station.', act: m => m.set({ clean: true, dpo: false, steps: 50, leak: false, calib: true, gate: true }) },
    { t: 'Preferences', home: true, say: 'DPO adds lawyers\' preferences. Too many steps, and it starts to overfit.', act: m => m.set({ clean: true, dpo: true, steps: 150, leak: false, calib: true, gate: true }) },
    { t: 'An honest test', home: true, say: 'If test cases leak into training, the score flatters you. Keep them apart.', act: m => m.set({ clean: true, dpo: true, steps: 50, leak: true, calib: true, gate: true }) },
    { t: 'Shrink, then retest', home: true, say: 'Quantizing changes quality, so measure again after it, on your own notes.', act: m => m.set({ clean: true, dpo: true, steps: 50, leak: false, calib: false, gate: true }) },
    { t: 'A gate that says no', home: true, say: 'Compare with what is live. Only a better model goes out.', act: m => m.set({ clean: true, dpo: true, steps: 50, leak: false, calib: true, gate: true }) },
  ],
  check: [
    { q: 'Why test again after quantizing?', options: ['Quantizing changes the model', 'To warm the GPU', 'It\'s a legal rule'], answer: 0, why: 'Test what you ship.', hint: 'Try Quantize and don\'t retest.' },
    { q: 'What does a leaked test set do?', options: ['Flatters the score', 'Slows training', 'Nothing'], answer: 0, why: 'The model has seen the answers.', hint: 'Try Let test cases leak.' },
    { q: 'What should a release gate compare with?', options: ['The live model', 'A random model', 'Last year\'s paper'], answer: 0, why: 'New must beat current.', hint: 'See A gate that says no.' },
  ],
  terms: [['SFT', 'Tuning on demonstrations.'], ['DPO', 'Tuning on preferences.'], ['Held-out set', 'Data kept out of training.'], ['Data leak', 'Test data getting into training.'], ['Release gate', 'A check before shipping.']],
  deeper: '<p><b>Keep a ledger.</b> Record dataset, config and score for each run, so that a result can be repeated.</p><p><b>Earlier lessons.</b> Each station has its own lesson. Here they run as one.</p><p><b>Scores</b> are round illustrative numbers.</p>',
  code: {
    title: 'The line',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
data = clean(load("case_notes"))
model = sft(BASE, data.demos)
model = dpo(model, data.pairs, steps=50)
small = quantize(model, calibrate_on=data.notes)
if evaluate(small, data.held_out) > evaluate(LIVE, data.held_out):
    deploy(small)
`,
  },
};
