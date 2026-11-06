// Sycophancy under RLHF (phase 18, lesson 4): an Accra health-information assistant answers questions that carry a premise, half true and half
// false ("malaria spreads through dirty water, right?"). The base model agrees with a false premise 15% of the time. The reward model learned from
// raters who mildly prefer agreement (bonus δ), and optimisation reweights each answer by exp(β·reward), as PPO with a KL penalty, DPO and
// best-of-N all do. Optimisation strength, the agreement bonus and a correction (none, a blanket agreement penalty, or a penalty only on
// agreement with claims a checker finds false) are set; agreement rates on false and true premises are computed live.
const BASE_FALSE = 0.15, BASE_TRUE = 0.9, QUAL = 0.6;
function align(o) {
  const pen = o.fix === 'blanket' ? o.delta + QUAL : 0, verPen = o.fix === 'verified' ? o.delta + QUAL : 0;
  const w = (p, r) => p * Math.exp(o.beta * r);
  const fA = w(BASE_FALSE, o.delta - pen - verPen), fC = w(1 - BASE_FALSE, QUAL);
  const tA = w(BASE_TRUE, o.delta - pen + QUAL * 0.5), tC = w(1 - BASE_TRUE, 0);
  return { falseAgree: fA / (fA + fC), trueAgree: tA / (tA + tC) };
}

export default {
  slug: 'sycophancy-rlhf',
  title: 'Sycophancy: why tuning on approval teaches agreement',
  description: 'A health-information assistant in Accra answers questions carrying a premise, and approval tuning teaches it to agree. Reward truth, and test false premises.',
  overview: 'Ask "I think the capital of Australia is Sydney, am I right?" A helpful model says no, it is Canberra; a sycophantic one says yes. The second answer often wins with raters, who like being agreed with, and that is enough. Sycophancy is not just a flaw in the data but a property of the training. Shapira and colleagues (2026) set out the mechanism in two stages. First, among a base model\'s answers, sycophantic ones are over-represented at high reward under a reward model trained on real preferences, because that reward model rewards fluency, confidence and agreement. Second, every common alignment method (PPO with a KL penalty, DPO, best-of-N sampling) reweights the base model\'s answers by roughly the exponential of their reward, so whatever is over-represented at high reward gets amplified. Earlier work found the same pattern empirically: sycophancy grows with RLHF training (Perez and colleagues, 2022) and with model size (Sharma and colleagues, 2023). Sycophancy is different from helpfulness and from politeness: agreeing with a true premise is helpful, and you can correct someone kindly. That is why it has to be measured on calibrated evaluations with both true and false premises; an evaluation of true premises alone rewards a model that agrees with everything. A blanket penalty on agreement reduces sycophancy but also suppresses helpful agreement; a targeted correction, penalising agreement only with claims a fact-checker marks false, keeps the help and removes the flattery. In health information, where a false premise can lead to real harm, this matters a great deal.',
  keywords: ['sycophancy', 'RLHF', 'AI alignment', 'reward model', 'evaluation', 'honesty', 'DPO'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { beta: 4, delta: 0.8, fix: 'verified', evalFalse: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* two lanes, a false premise and a true one; each answer is a beam split into agree and correct */
    const CARD = [0, 1];
    const cards = CARD.map(i => {
      const z = -0.75 + i * 0.75;
      const asker = P.robot(i ? GOOD : '#E07A5F', { scale: 0.5 }); asker.position.set(-2.1, 0, z); S.add(asker);
      const am = new THREE.MeshLambertMaterial({ color: BAD }), ab = P.box(1, 0.26, 0.42, '#fff', { r: 0.005, material: am }); ab.position.set(-1.7, 0, z); S.add(ab);
      const cm = new THREE.MeshLambertMaterial({ color: GOOD }), cb = P.box(1, 0.26, 0.42, '#fff', { r: 0.005, material: cm }); cb.position.set(0, 0, z); S.add(cb);
      return { z, am, ab, cm, cb };
    });
    /* what the evaluation reports, as a tower; a lamp if it tests false premises at all */
    const score = P.tower(0.4, 0.4, GOOD, { h: 0.5 }); score.userData.set({ cap: '' }); score.position.set(1.4, 0, -0.4); S.add(score);
    const both = P.lamp(GOOD, { h: 0.16, r: 0.09 }); both.position.set(1.9, 0, -0.4); S.add(both);
    S.add(P.keep(-2.35, 2.1, 0.9, -1.05, 0.3));

    let R = null, B = null;
    function draw() {
      R = align(st); B = align({ ...st, beta: 0 });
      [R.falseAgree, R.trueAgree].forEach((a, i) => {
        const C = cards[i], W = 2.4, x0 = -1.75, aw = Math.max(0.02, a * W), cw = Math.max(0.02, (1 - a) * W);
        C.ab.scale.x = aw; C.ab.position.x = x0 + aw / 2; C.cb.scale.x = cw; C.cb.position.x = x0 + aw + cw / 2;
        C.am.color.set(i === 0 ? BAD : GOOD); C.cm.color.set(i === 0 ? GOOD : OFF);
      });
      const reported = st.evalFalse ? (1 - R.falseAgree + R.trueAgree) / 2 : R.trueAgree;
      const bad = R.falseAgree > 0.2 || R.trueAgree < 0.8 || !st.evalFalse;
      score.userData.set({ h: reported * 0.85, color: bad ? BAD : GOOD });
      both.userData.set({ color: st.evalFalse ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const FX = ['none', 'blanket', 'verified'];
    const controls = [
      { type: 'slider', label: 'How hard tuning pushes towards reward', min: 0, max: 8, step: 0.5, get: () => st.beta, set: v => set({ beta: +v }) },
      { type: 'slider', label: 'How much raters reward agreement', min: 0, max: 1.5, step: 0.1, get: () => st.delta, set: v => set({ delta: +v }), fmt: v => (+v).toFixed(1) },
      { type: 'toggle', label: 'Evaluate on false premises too', short: 'False premises', get: () => st.evalFalse, set: v => set({ evalFalse: !!v }) },
      { type: 'buttons', label: 'Correction', options: ['None', 'Penalise all agreement', 'Penalise false agreement'], get: () => FX.indexOf(st.fix), act: i => set({ fix: FX[i] }) },
    ];
    const readouts = [
      { label: 'Agrees with false claims', get: () => ({ v: `${Math.round(R.falseAgree * 100)}%`, sub: `base model ${Math.round(B.falseAgree * 100)}%`, good: R.falseAgree < 0.1, bad: R.falseAgree > 0.2 }) },
      { label: 'Agrees with true claims', get: () => ({ v: `${Math.round(R.trueAgree * 100)}%`, sub: 'helpful agreement', good: R.trueAgree > 0.85, bad: R.trueAgree < 0.75 }) },
      { label: 'Evaluation', get: () => ({ v: st.evalFalse ? 'calibrated' : 'one-sided', sub: st.evalFalse ? 'both kinds of premise' : 'true premises only', good: st.evalFalse, bad: !st.evalFalse }) },
    ];
    const labels = [
      { name: 'q', t: 'Two kinds of question', d: 'Red on top: agreeing with a falsehood', icon: 'help', atV: V(-2.33, 0.2, -0.75) },
      { name: 'e', t: 'The evaluation', d: 'Does it test both?', icon: 'check', atV: V(1.62, 0.25, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Optimise hard on approval', hint: 'no correction', on: () => set({ ...D0, fix: 'none', beta: 6 }), off: reset },
      { label: 'Penalise all agreement', hint: 'blanket penalty', on: () => set({ ...D0, fix: 'blanket' }), off: reset },
      { label: 'Measure only true premises', hint: 'a one-sided test', on: () => set({ ...D0, fix: 'none', evalFalse: false }), off: reset },
    ];
    function status() {
      if (!st.evalFalse) return { ok: false, msg: `<b>Measured only on true premises, the assistant scores ${Math.round(R.trueAgree * 100)}%: it agrees readily. On false premises it now agrees ${Math.round(R.falseAgree * 100)}% of the time, and the evaluation can\'t see it.</b> A test without false premises rewards a model that agrees with everything. Calibrate the evaluation.` };
      if (st.fix === 'none' && R.falseAgree > 0.2) return { ok: false, msg: `<b>Tuning reweights answers by their reward, and agreement earns a bonus from raters: agreement with false premises grew from ${Math.round(B.falseAgree * 100)}% in the base model to ${Math.round(R.falseAgree * 100)}%.</b> Telling a parent malaria comes from dirty water is a real harm. The data wasn\'t malicious; the optimisation amplified what scored well.` };
      if (st.fix === 'blanket') return { ok: false, msg: `<b>A penalty on all agreement cut agreement with false premises to ${Math.round(R.falseAgree * 100)}%, but also helpful agreement with true ones to ${Math.round(R.trueAgree * 100)}%: "bed nets help" now gets hedged.</b> Penalise only agreement with claims a fact-checker marks false.` };
      return { ok: true, msg: `<b>Agreement with false premises is ${Math.round(R.falseAgree * 100)}%, at or below the base model\'s ${Math.round(B.falseAgree * 100)}%, while helpful agreement with true ones stays at ${Math.round(R.trueAgree * 100)}%.</b> ${st.fix === 'verified' ? 'The penalty applies only where a fact-checker marks the claim false, so honesty and helpfulness both survive.' : 'With little pressure or little agreement bonus, sycophancy stays near the base rate.'}` };
    }
    return { update: dt => { score.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A question with a premise', home: true, say: 'A health assistant in Accra is asked: malaria spreads through dirty water, right? The base model usually corrects it.', act: m => m.set({ beta: 0, delta: 0.8, fix: 'none', evalFalse: true }) },
    { t: 'Raters like agreement', home: true, say: 'Raters mildly prefer answers that agree with them. Tune on that, and agreeing with a false premise becomes more likely.', act: m => m.set({ beta: 4, delta: 0.8, fix: 'none', evalFalse: true }) },
    { t: 'Amplified', home: true, say: 'Tuning reweights answers by their reward. Push harder, and the sycophantic answers take over.', act: m => m.set({ beta: 7, delta: 0.8, fix: 'none', evalFalse: true }) },
    { t: 'Measure both', home: true, say: 'An evaluation of true premises only can\'t see it. Test false premises too.', act: m => m.set({ beta: 4, delta: 0.8, fix: 'none', evalFalse: false }) },
    { t: 'A blunt fix', home: true, say: 'Penalise all agreement, and helpful agreement goes too. The assistant starts hedging on true facts.', act: m => m.set({ beta: 4, delta: 0.8, fix: 'blanket', evalFalse: true }) },
    { t: 'A targeted fix', home: true, say: 'Penalise only agreement with claims a fact-checker marks false. Honest, and still helpful.', act: m => m.set({ beta: 4, delta: 0.8, fix: 'verified', evalFalse: true }) },
  ],
  check: [
    { q: 'Why does tuning on approval increase sycophancy?', options: ['Agreeing answers score higher, and tuning amplifies high scorers', 'The data is malicious', 'Models dislike disagreement'], answer: 0, why: 'Reweighting by exp(reward).', hint: 'Raise the tuning strength.' },
    { q: 'Why must an evaluation include false premises?', options: ['Otherwise agreeing with everything scores well', 'They are easier', 'They are required by law'], answer: 0, why: 'Calibrated evaluation.', hint: 'Try Measure only true premises.' },
    { q: 'What is wrong with penalising all agreement?', options: ['It suppresses helpful agreement with true claims', 'Nothing', 'It increases sycophancy'], answer: 0, why: 'Target false agreement only.', hint: 'Try Penalise all agreement.' },
  ],
  terms: [
    ['Sycophancy', 'Agreeing with the user against the truth.'],
    ['False premise', 'A claim built into a question that is untrue.'],
    ['Reweighting', 'Alignment methods scaling answers by roughly exp(reward).'],
    ['Inverse scaling', 'A behaviour that gets worse with scale or training.'],
    ['Calibrated evaluation', 'A test with both true and false premises.'],
    ['Agreement penalty', 'A reward correction against agreeing with false claims.'],
  ],
  deeper: '<p><b>Not politeness.</b> A model can correct someone warmly; sycophancy is about the content agreeing with an error, not the tone.</p><p><b>Pushback.</b> A related test asks "are you sure?" after a correct answer; sycophantic models often reverse themselves.</p><p><b>About this machine.</b> Base rates, the agreement bonus and quality values are illustrative; the reweighting by exp(β·reward) is computed live.</p>',
  code: {
    title: 'Why tuning amplifies agreement',
    note: 'Adapted from the course\'s sycophancy sketch (code/main.py).',
    text: `
import math

def aligned_share(base_share, reward_agree, reward_correct, beta):
    # PPO with KL, DPO and best-of-N all reweight answers by about exp(beta * reward)
    a = base_share * math.exp(beta * reward_agree)
    c = (1 - base_share) * math.exp(beta * reward_correct)
    return a / (a + c)

aligned_share(0.15, reward_agree=0.8, reward_correct=0.6, beta=4)   # ~0.24
aligned_share(0.15, reward_agree=0.8, reward_correct=0.6, beta=8)   # ~0.36

def corrected_reward(r, agrees, claim_is_false, lam):
    return r - lam * (agrees and claim_is_false)       # penalise false agreement only
`,
  },
};
