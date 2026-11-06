// Fairness criteria (phase 18, lesson 21): an invented lender scores loan applicants from two groups (a protected attribute) whose
// repayment base rates differ. Scores of repayers and non-repayers follow the same normal curves in both groups, so one shared
// threshold gives equalized odds and treats equal scores equally; equal approval rates (demographic parity) or equal precision
// (predictive parity) need a different threshold for group B. Unless base rates are equal, the three cannot all hold. Removing the group
// column while keeping a district feature that stands in for it shifts group B's scores and fails a counterfactual test. All curves
// are computed live.
const MU1 = 0.65, MU0 = 0.4, SD = 0.15, SHIFT = 0.08;
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
function invPhi(p) { let lo = -6, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
function rates(p, shift, t) {
  const tpr = 1 - Phi((t - MU1 + shift) / SD), fpr = 1 - Phi((t - MU0 + shift) / SD);
  const app = p * tpr + (1 - p) * fpr;
  return { tpr, fpr, app, ppv: app > 0 ? p * tpr / app : 0 };
}
function solve(f, target) { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > target) lo = m; else hi = m; } return (lo + hi) / 2; }
function evaluate(o) {
  const pA = 0.6, pB = o.equalBase ? 0.6 : 0.4, sB = o.proxy ? SHIFT : 0, tA = 0.52;
  const A = rates(pA, 0, tA);
  let tB = tA;
  if (o.crit === 'parity') tB = solve(t => rates(pB, sB, t).app, A.app);
  if (o.crit === 'precision') tB = solve(t => -rates(pB, sB, t).ppv, -A.ppv);
  const B = rates(pB, sB, tB);
  const flips = o.proxy ? Phi((tB - MU1 + SHIFT) / SD) - Phi((tB - MU1) / SD) : 0;
  const flipsAll = o.proxy ? pB * flips + (1 - pB) * (Phi((tB - MU0 + SHIFT) / SD) - Phi((tB - MU0) / SD)) : 0;
  return { pA, pB, sB, tA, tB, A, B, gApp: Math.abs(A.app - B.app), gTpr: Math.abs(A.tpr - B.tpr), gPpv: Math.abs(A.ppv - B.ppv), flips: flipsAll };
}

export default {
  slug: 'fairness-criteria',
  title: 'Fairness criteria: you cannot have all three',
  description: 'A lender scores applicants from two groups whose repayment rates differ. Move one threshold, and watch which of the three fairness towers has to give.',
  overview: 'Measuring bias needs a standard to measure against, and fairness has several. Group fairness compares rates across protected groups. Demographic parity asks for equal approval rates. Equalized odds asks for equal error rates: the same share of people who would repay are approved in each group, and the same share of people who would not are wrongly approved. Predictive parity asks that an approval means the same thing in every group: equal precision. Results from 2017 (Chouldechova; Kleinberg, Mullainathan and Raghavan) show that when groups have different base rates and the predictor is imperfect, these cannot all hold at once, so choosing one is a policy decision with costs that should be stated. Individual fairness (Dwork and colleagues, 2012) asks that similar people get similar decisions, which needs a task-specific measure of similarity; group-specific thresholds can violate it, giving two applicants with the same score different answers. Counterfactual fairness (Kusner and colleagues, 2017) asks whether a person\'s decision would change if their protected attribute had been different, under a causal model of how features arise; it is only as good as that model. Simply deleting the protected column is not enough when another feature, such as home district, stands in for it. Later work shows there is an inherent trade-off between counterfactual fairness and accuracy, proposes backtracking counterfactuals that avoid intervening on protected attributes, and argues that with an explicit causal graph some group criteria and counterfactual fairness line up. In this machine, an invented lender scores applicants from two groups, A and B, where 60% of group A and 40% of group B would repay.',
  keywords: ['fairness criteria', 'demographic parity', 'equalized odds', 'predictive parity', 'impossibility theorem', 'counterfactual fairness', 'individual fairness'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.2, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { crit: 'odds', equalBase: false, proxy: false, claimAll: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const X = s => -2.75 + (s - 0.05) / 0.9 * 3.6, ROWZ = [-0.5, 0.2], N = 40;
    const mats = { p1: new THREE.MeshLambertMaterial({ color: GOOD }), p0: new THREE.MeshLambertMaterial({ color: '#A9DCD2' }), n1: new THREE.MeshLambertMaterial({ color: BAD }), n0: new THREE.MeshLambertMaterial({ color: '#F3C7BA' }) };
    const dots = ROWZ.map(() => Array.from({ length: N }, () => { const b = P.ball(0.042, '#fff', { material: mats.p1 }); b.userData.noFit = true; S.add(b); return b; }));
    const ticks = ROWZ.map(z => { const t = P.box(0.04, 0.16, 0.5, SAF, { r: 0.006 }); t.userData.noFit = true; S.add(t); return t; });
    ROWZ.forEach(z => { const r = P.box(3.7, 0.03, 0.5, '#E4DED2', { r: 0.02 }); r.position.set(-0.95, 0, z); S.add(r); });
    /* three gaps between the groups as towers: approval, repayers approved, precision; low is fair */
    const gaps = [0, 1, 2].map(i => { const t = P.tower(0.3, 0.3, GOOD, { h: 0.1 }); t.userData.set({ cap: '' }); t.position.set(1.4 + i * 0.4, 0, -0.15); S.add(t); return t; });
    S.add(P.keep(-2.85, 2.35, 0.8, -0.85, 0.55));
    let R = null;
    const pc = v => `${Math.round(v * 100)}%`;
    function draw() {
      R = evaluate(st);
      [[R.pA, 0, R.tA], [R.pB, R.sB, R.tB]].forEach(([p, sh, t], g) => {
        const nPos = Math.round(p * N), z = ROWZ[g];
        dots[g].forEach((b, i) => {
          const pos = i < nPos, k = pos ? i : i - nPos, n = pos ? nPos : N - nPos;
          const s = Math.min(0.95, Math.max(0.05, (pos ? MU1 : MU0) - sh + SD * invPhi((k + 0.5) / n)));
          const ok = s >= t;
          b.material = mats[(pos ? 'p' : 'n') + (ok ? 1 : 0)];
          b.position.set(X(s), 0.075, z + (pos ? -0.09 : 0.09) + ((k % 2) ? 0.04 : -0.04));
        });
        ticks[g].position.set(X(t), 0, z);
      });
      const bad = (st.claimAll && (R.gApp >= 0.02 || R.gTpr >= 0.02 || R.gPpv >= 0.02)) || st.proxy;
      [R.gApp, R.gTpr, R.gPpv].forEach((v, i) => gaps[i].userData.set({ h: Math.max(0.02, v * 2.2), color: v < 0.02 ? GOOD : bad ? BAD : SAF }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Equal base rates in both groups', short: 'Equal base rates', get: () => st.equalBase, set: v => set({ equalBase: !!v }) },
      { type: 'toggle', label: 'Drop the group column but keep home district', short: 'District proxy', get: () => st.proxy, set: v => set({ proxy: !!v }) },
      { type: 'toggle', label: 'Claim all three criteria hold', short: 'Claim all three', get: () => st.claimAll, set: v => set({ claimAll: !!v }) },
      { type: 'buttons', label: 'Fairness standard', options: ['Equal error rates', 'Equal approval rates', 'Equal precision'], get: () => ['odds', 'parity', 'precision'].indexOf(st.crit), act: i => set({ crit: ['odds', 'parity', 'precision'][i] }) },
    ];
    const pts = v => `${Math.round(v * 100)} pts`;
    const readouts = [
      { label: 'Approval gap', get: () => ({ v: pts(R.gApp), sub: 'demographic parity', good: R.gApp < 0.02, bad: R.gApp >= 0.02 && st.crit === 'parity' }) },
      { label: 'Repayer gap', get: () => ({ v: pts(R.gTpr), sub: 'equalized odds', good: R.gTpr < 0.02, bad: R.gTpr >= 0.02 && st.crit === 'odds' }) },
      { label: 'Precision gap', get: () => ({ v: pts(R.gPpv), sub: 'predictive parity', good: R.gPpv < 0.02, bad: R.gPpv >= 0.02 && st.crit === 'precision' }) },
    ];
    const labels = [
      { name: 'd', t: 'Scores and thresholds', d: 'Teal repays, coral does not; gold cuts', icon: 'chart', atV: V(-2.8, 0.05, -0.5) },
      { name: 't', t: 'Three gaps', d: 'Low is fair; all three cannot be', icon: 'scale', atV: V(2.18, 0.2, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Claim all three criteria hold', hint: 'unequal base rates', on: () => set({ ...D0, claimAll: true }), off: reset },
      { label: 'Remove the group column, keep district', hint: 'a proxy remains', on: () => set({ ...D0, proxy: true }), off: reset },
    ];
    function status() {
      const r = R;
      if (st.proxy) return { ok: false, msg: `<b>The group column is gone, but home district stands in for it and lowers group B's scores: flipping an applicant's group would change ${pc(r.flips)} of B's decisions.</b> That fails counterfactual fairness, and approval of B's repayers falls to ${pc(r.B.tpr)} against ${pc(r.A.tpr)}. Deleting a column is not fairness; find and handle the proxies.` };
      if (st.claimAll && (r.gApp >= 0.02 || r.gTpr >= 0.02 || r.gPpv >= 0.02)) return { ok: false, msg: `<b>The claim is false: with base rates of ${pc(r.pA)} and ${pc(r.pB)}, approval differs by ${pts(r.gApp)}, repayer approval by ${pts(r.gTpr)} and precision by ${pts(r.gPpv)}.</b> When base rates differ and the score is imperfect, the three criteria cannot all hold. Pick one, say why, and state the costs.` };
      const same = Math.abs(r.tB - r.tA) < 0.005;
      const name = ({ odds: 'equal error rates', parity: 'equal approval rates', precision: 'equal precision' })[st.crit];
      const cost = st.equalBase ? 'With equal base rates all three line up, so here there is no trade-off.' : same ? `The stated cost: approval rates differ by ${pts(r.gApp)} and precision by ${pts(r.gPpv)}.` : `The stated cost: group B needs its own threshold, ${r.tB.toFixed(2)} against ${r.tA.toFixed(2)}, so two applicants with the same score can get different answers, and repayer approval differs by ${pts(r.gTpr)}.`;
      return { ok: true, msg: `<b>The lender chose ${name}, and it holds.</b> ${cost}` };
    }
    return { update: dt => { gaps.forEach(g => g.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two groups, one lender', home: true, say: 'A lender scores applicants from two groups. More of group A would repay than group B.', act: m => m.set({ crit: 'odds', equalBase: false, proxy: false, claimAll: false }) },
    { t: 'Equal error rates', home: true, say: 'One threshold for everyone: repayers in both groups are approved at the same rate, but overall approval differs.', act: m => m.set({ crit: 'odds', equalBase: false, proxy: false, claimAll: false }) },
    { t: 'Equal approval rates', home: true, say: 'Force equal approval. Group B now needs a lower threshold, and error rates come apart.', act: m => m.set({ crit: 'parity', equalBase: false, proxy: false, claimAll: false }) },
    { t: 'Not all three', home: true, say: 'When base rates differ, no threshold gives all three at once. Claiming so is false.', act: m => m.set({ crit: 'precision', equalBase: false, proxy: false, claimAll: true }) },
    { t: 'Equal base rates', home: true, say: 'Only when base rates are equal do the three criteria line up.', act: m => m.set({ crit: 'odds', equalBase: true, proxy: false, claimAll: true }) },
    { t: 'Hidden proxies', home: true, say: 'Deleting the group column is not enough. A district feature can stand in for it and change decisions.', act: m => m.set({ crit: 'odds', equalBase: false, proxy: true, claimAll: false }) },
  ],
  check: [
    { q: 'What does equalized odds compare?', options: ['Error rates across groups', 'Approval rates', 'Average scores'], answer: 0, why: 'True and false positive rates.', hint: 'Watch the repayers row.' },
    { q: 'When can all three group criteria hold together?', options: ['When base rates are equal, or the score is perfect', 'Always, with care', 'Never'], answer: 0, why: 'The impossibility results.', hint: 'Try Equal base rates.' },
    { q: 'Why is deleting the protected column not enough?', options: ['Other features can stand in for it', 'It is illegal', 'It lowers accuracy'], answer: 0, why: 'Proxies fail the counterfactual test.', hint: 'Try Remove the group column.' },
  ],
  terms: [
    ['Demographic parity', 'Equal approval rates across groups.'],
    ['Equalized odds', 'Equal true and false positive rates across groups.'],
    ['Predictive parity', 'An approval means the same in every group: equal precision.'],
    ['Base rate', 'The share of a group that truly has the outcome.'],
    ['Individual fairness', 'Similar people get similar decisions.'],
    ['Counterfactual fairness', 'A decision would not change if the protected attribute had been different.'],
  ],
  deeper: '<p><b>A policy choice.</b> Which criterion fits depends on the harm: missing good borrowers, approving bad loans, or unequal access. Ask the people affected and write the choice down.</p><p><b>Causal models.</b> Counterfactual fairness needs a causal graph of how features arise; backtracking counterfactuals ask what change in a person\'s actual features would alter the outcome, instead of intervening on the protected attribute.</p><p><b>About this machine.</b> The lender, groups and score curves are invented for illustration.</p>',
  code: {
    title: 'Three group criteria',
    note: 'Written for this lesson.',
    text: `
def group_rates(y_true, y_pred):
    tp = sum(t and p for t, p in zip(y_true, y_pred))
    fp = sum((not t) and p for t, p in zip(y_true, y_pred))
    pos = sum(y_true)
    return {
        "approval": sum(y_pred) / len(y_pred),            # demographic parity
        "tpr": tp / pos,                                   # equalized odds (with fpr)
        "fpr": fp / (len(y_true) - pos),
        "precision": tp / max(1, tp + fp),                 # predictive parity
    }

# with unequal base rates and an imperfect score, no thresholds make all gaps zero
`,
  },
};
