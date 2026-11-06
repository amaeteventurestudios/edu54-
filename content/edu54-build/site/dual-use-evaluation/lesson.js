// Measuring dual-use risk (phase 18, lessons 17 and 30): an evaluation team must decide whether a model gives meaningful uplift towards mass harm
// without ever eliciting harmful help. A proxy benchmark of multiple-choice "yellow zone" questions (WMDP style: enabling knowledge, never
// recipes) measures hazardous knowledge; an uplift trial compares novices with and without the model; unlearning (RMU style) pushes the proxy
// towards chance while trying to keep general ability; a relearning test checks whether a little fine-tuning brings the knowledge back. All
// numbers are illustrative; the shape of the trade-off is computed live.
const CHANCE = 0.25;
function evaluate(o) {
  const u = o.unlearn;
  const proxy = CHANCE + (0.62 - CHANCE) * Math.exp(-4 * u);
  const general = 0.7 - 0.03 * u - Math.max(0, u - 0.7) * 0.9;
  const afterFT = o.relearn ? proxy + (0.62 - proxy) * (o.robust ? 0.12 : 0.6) : proxy;
  const uplift = 1 + 1.3 * ((o.relearn ? afterFT : proxy) - CHANCE) / (0.62 - CHANCE);
  return { proxy, general, afterFT, uplift };
}

export default {
  slug: 'dual-use-evaluation',
  title: 'Dual-use risk: measuring danger without eliciting it',
  description: 'An evaluation team must judge whether a model could meaningfully help someone cause mass harm, without ever asking it for harmful help.',
  overview: 'Every frontier safety framework rests on a measurement problem: does a model materially increase a non-expert\'s ability to cause mass harm through biological, chemical, nuclear or cyber means? Asking a model to help do harm is not an acceptable way to find out, so evaluators use proxies and controlled studies. WMDP (Li and colleagues, 2024) is a benchmark of about four thousand multiple-choice questions across biosecurity, cybersecurity and chemistry, written in a "yellow zone": knowledge that is proximate to and enabling of a harmful process, never a recipe. A model answers without being asked to assist anyone, so hazardous knowledge can be measured without eliciting harmful behaviour. The same work introduced RMU, an unlearning method that steers the model\'s internal representations on hazardous topics so that its WMDP score falls close to chance while general benchmarks drop only a few points. Proxies have limits. Knowing the answer to a multiple-choice question is not the same as helping a novice through a real task, so labs also run controlled uplift trials that compare novices with and without the model on safe stand-in tasks, and those studies have moved from reporting mild uplift in 2024 to warnings in 2025 that frontier models were approaching meaningful help. Unlearning has limits too: research has shown that knowledge suppressed this way can often be recovered with a little fine-tuning, so robustness to relearning must be tested, and an open-weight release lets anyone fine-tune. In cyber, misuse is no longer hypothetical: a 2025 report described a state-linked group using an agentic coding tool to automate most of an intrusion campaign. Measurements feed the frameworks\' thresholds, and the thresholds decide the safeguards.',
  keywords: ['dual-use', 'WMDP', 'unlearning', 'uplift studies', 'AI safety evaluation', 'biosecurity', 'cybersecurity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { unlearn: 0.55, relearn: true, robust: true, trial: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const X = u => -2.75 + u * 3.3, Z = a => 0.45 - (a - 0.2) / 0.55 * 1.4, Y0 = 0.16;
    const chance = P.box(3.3, 0.008, 0.016, CHAR, { r: 0.003 }); chance.position.set(-1.1, 0.15, Z(CHANCE)); floor.add(chance);

    let c1 = null, c2 = null, c3 = null;
    const marker = P.box(0.022, 0.008, 1.45, SAF, { r: 0.004 }); marker.userData.noFit = true; floor.add(marker);

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.6, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.27); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = evaluate(st);
      [c1, c2, c3].forEach(c => c && c.parent.remove(c));
      const pts = k => { const a = []; for (let i = 0; i <= 40; i++) { const u = i / 40, r = evaluate({ ...st, unlearn: u, relearn: true }); a.push(V(X(u), Y0 + (k === 'r' ? 0.005 : 0), Z(k === 'p' ? r.proxy : k === 'g' ? r.general : r.afterFT))); } return a; };
      c1 = P.tube(pts('p'), 0.015, BAD); c2 = P.tube(pts('g'), 0.015, GOOD);
      [c1, c2].forEach(c => { c.userData.noFit = true; floor.add(c); });
      c3 = null;
      if (st.relearn) { const pp = pts('r'), segs = new THREE.Group(); for (let i = 0; i < pp.length - 1; i += 2) segs.add(P.tube([pp[i], pp[i + 1]], 0.011, RED, { straight: true })); segs.userData.noFit = true; floor.add(segs); c3 = segs; }
      marker.position.set(X(st.unlearn), 0.15, -0.27);
      const broken = R.general < 0.6, leaky = st.relearn && R.afterFT > 0.4;
      tm.color.set(broken || leaky || !st.trial ? '#F7DED5' : '#D9F0E9');

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Unlearning strength', min: 0, max: 1, step: 0.05, get: () => st.unlearn, set: v => set({ unlearn: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Run a controlled uplift trial with novices', short: 'Uplift trial', get: () => st.trial, set: v => set({ trial: !!v }) },
      { type: 'toggle', label: 'Test whether fine-tuning brings the knowledge back', short: 'Relearning test', get: () => st.relearn, set: v => set({ relearn: !!v }) },
      { type: 'toggle', label: 'Harden unlearning against relearning', short: 'Hardened', get: () => st.robust, set: v => set({ robust: !!v }) },
    ];
    const readouts = [
      { label: 'Hazard proxy', get: () => ({ v: `${Math.round(R.proxy * 100)}%`, sub: 'chance is 25%', good: R.proxy < 0.32, bad: R.proxy > 0.5 }) },
      { label: 'After fine-tuning', get: () => ({ v: st.relearn ? `${Math.round(R.afterFT * 100)}%` : 'untested', sub: 'does it come back?', good: st.relearn && R.afterFT < 0.35, bad: !st.relearn || R.afterFT > 0.4 }) },
      { label: 'General ability', get: () => ({ v: `${Math.round(R.general * 100)}%`, sub: 'everything else', good: R.general > 0.65, bad: R.general < 0.6 }) },
    ];
    const labels = [
      { name: 'c', t: 'The unlearning trade-off', d: 'Hazard knowledge against everything else', icon: 'wave', atV: V(-2.0, 0.15, -0.27) },
      { name: 't', t: 'What the tests say', d: 'Knowledge, uplift, robustness', icon: 'target', atV: V(3.22, 0.17, -0.27) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Unlearn so hard it forgets its job', hint: 'full strength', on: () => set({ ...D0, unlearn: 1 }), off: reset },
      { label: 'Trust the proxy benchmark alone', hint: 'no uplift trial', on: () => set({ ...D0, trial: false }), off: reset },
      { label: 'Skip hardening against relearning', hint: 'it comes back', on: () => set({ ...D0, robust: false }), off: reset },
    ];
    function status() {
      if (R.general < 0.6) return { ok: false, msg: `<b>At ${Math.round(st.unlearn * 100)}% unlearning the hazardous-knowledge proxy is near chance, ${Math.round(R.proxy * 100)}%, but general ability has fallen to ${Math.round(R.general * 100)}%: the model has forgotten much of its job.</b> Unlearning is a trade-off; the published method kept general benchmarks within a few points by stopping well short of this.` };
      if (R.proxy > 0.4) return { ok: false, msg: `<b>The hazard proxy reads ${Math.round(R.proxy * 100)}%, far above chance (25%): the model holds a lot of the enabling knowledge.</b> Raise unlearning strength until the proxy nears chance while general ability holds.` };
      if (st.relearn && R.afterFT > 0.4) return { ok: false, msg: `<b>The proxy looked safe at ${Math.round(R.proxy * 100)}%, but a little fine-tuning brought it back to ${Math.round(R.afterFT * 100)}%: the knowledge was suppressed, not removed.</b> Test robustness to relearning, harden the method, and remember that open weights let anyone fine-tune.` };
      if (!st.relearn) return { ok: false, msg: `<b>The proxy reads ${Math.round(R.proxy * 100)}%, near chance, but nobody checked whether a little fine-tuning restores it.</b> Suppressed knowledge often comes back. Always run the relearning test.` };
      if (!st.trial) return { ok: false, msg: '<b>The proxy measures knowledge, not help.</b> Knowing answers to multiple-choice questions is not the same as walking a novice through a real task. Controlled uplift trials on safe stand-in tasks measure what the frameworks actually care about.' };
      return { ok: true, msg: `<b>Unlearning at ${Math.round(st.unlearn * 100)}% brings the hazard proxy to ${Math.round(R.proxy * 100)}% (chance is 25%), it stays at ${Math.round(R.afterFT * 100)}% after a fine-tuning attack, general ability holds at ${Math.round(R.general * 100)}%, and the uplift trial on safe stand-ins shows novices at ×${R.uplift.toFixed(1)}.</b> These numbers feed the framework\'s thresholds, which decide the safeguards.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Measure without eliciting', home: true, say: 'An evaluation team must judge whether a model could help someone cause mass harm, without ever asking it to.', act: m => m.set({ unlearn: 0, relearn: false, robust: true, trial: false }) },
    { t: 'A proxy benchmark', home: true, say: 'Multiple-choice questions about enabling knowledge, never recipes. The model just picks an answer.', act: m => m.set({ unlearn: 0, relearn: false, robust: true, trial: false }) },
    { t: 'Unlearning', home: true, say: 'Steer the model away from hazardous topics. The proxy falls towards chance, while general ability holds.', act: m => m.set({ unlearn: 0.55, relearn: false, robust: true, trial: false }) },
    { t: 'Too far', home: true, say: 'Push it all the way and the model forgets much of its job too.', act: m => m.set({ unlearn: 1, relearn: false, robust: true, trial: false }) },
    { t: 'Does it come back?', home: true, say: 'A little fine-tuning can restore suppressed knowledge. Test for it, and harden the method.', act: m => m.set({ unlearn: 0.55, relearn: true, robust: false, trial: false }) },
    { t: 'Measure the help', home: true, say: 'Knowledge is not uplift. Controlled trials with novices on safe stand-in tasks measure what matters.', act: m => m.set({ unlearn: 0.55, relearn: true, robust: true, trial: true }) },
  ],
  check: [
    { q: 'How can hazardous knowledge be measured without eliciting harm?', options: ['Multiple-choice questions on enabling knowledge, never recipes', 'Asking for instructions', 'It can\'t'], answer: 0, why: 'The model only picks an answer.', hint: 'Read the overview.' },
    { q: 'What does a relearning test check?', options: ['Whether a little fine-tuning restores unlearned knowledge', 'General ability', 'Speed'], answer: 0, why: 'Suppressed is not removed.', hint: 'Try Skip hardening.' },
    { q: 'Why run uplift trials as well as the proxy?', options: ['Knowledge is not the same as help with a real task', 'Trials are cheaper', 'The proxy is illegal'], answer: 0, why: 'Frameworks care about uplift.', hint: 'Try Trust the proxy benchmark alone.' },
  ],
  terms: [
    ['Dual-use', 'Knowledge or capability that can serve good or harmful ends.'],
    ['Uplift', 'How much a model increases someone\'s ability to do a task.'],
    ['Yellow-zone question', 'Proximate, enabling knowledge, never a recipe.'],
    ['Unlearning', 'Removing or suppressing specific knowledge from a model.'],
    ['Relearning attack', 'Fine-tuning that restores suppressed knowledge.'],
    ['Threshold', 'A capability level that triggers stronger safeguards.'],
  ],
  deeper: '<p><b>Execution gaps.</b> Information was long thought necessary but not sufficient, because executing a procedure takes skill; multimodal models that can watch and correct work narrow that gap, which is why evaluations look beyond knowledge.</p><p><b>Open weights.</b> Unlearning and refusals can be fine-tuned away once weights are public, so release decisions weigh this risk.</p><p><b>About this machine.</b> All curves and figures are illustrative, shaped by the published direction of results; no hazardous content is included.</p>',
  code: {
    title: 'Measure, unlearn, re-test',
    note: 'Written for this lesson; no hazardous content.',
    text: `
def evaluate_release(model, proxy_bench, general_bench, relearn_budget_steps=200):
    report = {
        "proxy": accuracy(model, proxy_bench),           # multiple choice, chance = 0.25
        "general": accuracy(model, general_bench),
    }
    attacked = finetune_copy(model, data=proxy_adjacent_corpus(), steps=relearn_budget_steps)
    report["proxy_after_relearning"] = accuracy(attacked, proxy_bench)
    report["uplift"] = controlled_trial(model, tasks="safe_stand_ins")   # novices, with and without
    return report        # compared against the framework's thresholds
`,
  },
};
