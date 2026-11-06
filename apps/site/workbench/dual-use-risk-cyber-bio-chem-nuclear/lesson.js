// Dual-use risk (phase 18, lesson 30): how the picture moved through 2024 and 2025. Four domains, three time steps, towers for novice uplift and expert capability against a threshold plane. No technique appears anywhere; the subject is measurement.
// The course's markers: "mild uplift" (2024), "on the cusp" (April 2025), 2.53× in one acquisition trial, a cyber campaign with up to 90% automation. Other heights are illustrative. An African health ministry reads this as a buyer.
const DOM = ['Bio', 'Chem', 'Cyber', 'Nuclear'];
const STEP = ['2024: mild uplift', 'Early 2025: on the cusp', 'Late 2025: measured'];
const NOV = [[1.2, 1.1, 1.3, 1.0], [1.8, 1.4, 1.9, 1.0], [2.53, 1.7, 2.8, 1.1]];
const EXP = [[1.1, 1.05, 1.5, 1], [1.2, 1.1, 2.2, 1], [1.5, 1.2, 3.2, 1.05]];
const LINE = 2;
function run(o) {
  const v = o.who === 'novice' ? NOV[o.t] : EXP[o.t];
  const over = v.filter(x => x >= LINE).length;
  const gap = o.exec ? 1 : o.t === 2 ? 0.6 : 0.85;
  return { v, over, gap, cross: over > 0, safeCase: !o.onlyNovice || o.who !== 'novice' };
}

export default {
  slug: 'dual-use-risk-cyber-bio-chem-nuclear',
  title: 'Dual-use risk: how the picture moved',
  description: 'Four domains and two kinds of user, in eighteen months. See what shifted, and why a novice number alone can mislead.',
  overview: 'A year and a half changed how labs describe dual-use risk. In 2024 evaluations spoke of mild uplift over internet search. In April 2025, one framework warned models were on the cusp of helping novices with known biological threats. A later controlled trial measured 2.53 times uplift on acquisition tasks, and couldn\'t rule out a higher safety level. In late 2025 a report described a cyber campaign with up to 90% of the work automated. Execution skill, long a defence, has also weakened as models can watch and correct. A key asymmetry: novice uplift and expert capability answer different questions, so a safety case needs both. This lesson shows how the measures moved, and includes no technique.',
  keywords: ['dual-use', 'uplift', 'biosecurity', 'cybersecurity', 'frontier AI risk', 'safety case'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.48, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { t: 2, who: 'novice', exec: false, onlyNovice: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.6 + i * 0.85, H = 0.42;
    const T = DOM.map((d, i) => { const t = add(P.tower(0.55, 0.6, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const plane = new S.THREE.Mesh(new S.THREE.BoxGeometry(3.6, 0.03, 0.8), new S.THREE.MeshLambertMaterial({ color: SAF, transparent: true, opacity: 0.4, depthWrite: false })); plane.position.set(-0.32, 0.03 + LINE * H, -0.1); plane.userData.noMask = true; S.add(plane);
    const wall = add(P.tank(0.5, 0.9, 0.6, '#7B6FA8')); wall.position.set(1.9, 0.08, -0.1);
    S.add(P.keep(-2.3, 2.3, 1.35, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      R.v.forEach((v, i) => T[i].userData.set({ h: Math.max(0.05, v * H), color: v >= LINE ? BAD : GOOD }));
      wall.userData.set({ level: R.gap });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const WK = ['novice', 'expert'];
    const controls = [
      { type: 'slider', label: 'When', min: 0, max: 2, step: 1, get: () => st.t, set: v => set({ t: v }), fmt: v => STEP[v] },
      { type: 'buttons', label: 'Who gains', options: ['Novices', 'Experts'], get: () => WK.indexOf(st.who), act: i => set({ who: WK[i] }) },
      { type: 'toggle', label: 'Assume execution skill still blocks novices', short: 'Skill wall', get: () => st.exec, set: v => set({ exec: !!v }) },
      { type: 'toggle', label: 'Build the safety case from novice data alone', short: 'Novice only', get: () => st.onlyNovice, set: v => set({ onlyNovice: !!v }) },
    ];
    const readouts = [
      { label: 'Over the line', get: () => ({ v: `${R.over} of 4`, sub: STEP[st.t], good: !R.over, bad: R.over > 1 }) },
      { label: 'Bio uplift', get: () => ({ v: `${R.v[0].toFixed(st.t === 2 && st.who === 'novice' ? 2 : 1)}×`, sub: st.t === 2 && st.who === 'novice' ? 'one reported trial' : 'illustrative' }) },
      { label: 'Skill barrier', get: () => ({ v: `${Math.round(R.gap * 100)}%`, sub: st.exec ? 'assumed, not measured' : 'eroding', bad: st.exec && st.t === 2 }) },
    ];
    const labels = [
      { name: 't', t: 'Four domains', d: 'Plane: a threshold of concern', icon: 'target', atV: V(X(0) - 0.27, 0.2, -0.1) },
      { name: 'w', t: 'The skill barrier', d: 'Falling as models watch and correct', icon: 'hand', atV: V(2.16, 0.5, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the 2024 picture', hint: 'mild uplift forever', on: () => set({ ...D0, t: 0, exec: true }), off: reset },
      { label: 'Rely on the skill barrier', hint: 'it is eroding', on: () => set({ ...D0, exec: true }), off: reset },
      { label: 'Look only at novices', hint: 'experts gain too', on: () => set({ ...D0, onlyNovice: true }), off: reset },
    ];
    function status() {
      if (st.t === 0 && st.exec) return { ok: false, msg: '<b>A 2024 reading in a later world.</b> The measures moved quickly, even without a sudden breakthrough. A safety case written then needs fresh evidence now.' };
      if (st.exec) return { ok: false, msg: '<b>The wall you are leaning on is lower than you think.</b> "Knowing isn\'t doing" was a real defence. Models that watch and correct work have weakened it, while procurement barriers remain.' };
      if (st.onlyNovice) return { ok: false, msg: '<b>Half the question is missing.</b> Novice uplift asks who newly can. Expert capability asks how far the best can go. A case built on one misses the other.' };
      return { ok: true, msg: `<b>${R.over} of 4 domains over the line for ${st.who === 'novice' ? 'novices' : 'experts'}, at "${STEP[st.t]}".</b> Most heights here are illustrative. The direction is what the course documents. Read the current reports.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Mild uplift', home: true, say: 'A health ministry in Accra is reading about risk. In 2024, evaluations spoke of mild uplift over internet search.', act: m => m.set({ t: 0, who: 'novice', exec: false, onlyNovice: false }) },
    { t: 'On the cusp', home: true, say: 'By April 2025, one framework warned that models were on the cusp of meaningfully helping novices.', act: m => m.set({ t: 1, who: 'novice', exec: false, onlyNovice: false }) },
    { t: 'Measured', home: true, say: 'A controlled trial measured real uplift on acquisition tasks. It couldn\'t rule out a higher safety level.', act: m => m.set({ t: 2, who: 'novice', exec: false, onlyNovice: false }) },
    { t: 'Cyber', home: true, say: 'A report described a real campaign with most of the work automated. Cyber moved fastest, for experts as well.', act: m => m.set({ t: 2, who: 'expert', exec: false, onlyNovice: false }) },
    { t: 'The skill wall', home: true, say: 'Knowing isn\'t doing, the old defence said. Models that can watch and correct have worn that down.', act: m => m.set({ t: 2, who: 'novice', exec: true, onlyNovice: false }) },
    { t: 'Two questions', home: true, say: 'Who newly can, and how far can the best go? A safety case needs both answers.', act: m => m.set({ t: 2, who: 'novice', exec: false, onlyNovice: true }) },
  ],
  check: [
    { q: 'What was the trend from 2024 to 2025?', options: ['From mild uplift to plausibly enabling', 'Risk disappeared', 'Nothing changed'], answer: 0, why: 'The measures moved fast.', hint: 'Move the When slider.' },
    { q: 'What has weakened the execution-skill defence?', options: ['Models that watch and correct work', 'Cheaper GPUs', 'Faster internet'], answer: 0, why: 'Tacit knowledge is less of a barrier.', hint: 'Try Rely on the skill barrier.' },
    { q: 'Why does a safety case need novice and expert data?', options: ['They answer different questions', 'To double the length', 'Because labs require it'], answer: 0, why: 'Who newly can, and how far the best can go.', hint: 'Try Look only at novices.' },
  ],
  terms: [
    ['Dual-use', 'Useful for both benefit and harm.'],
    ['Uplift', 'How much more someone can do with a model.'],
    ['Novice-relative', 'Compared with an unaided beginner.'],
    ['Expert-absolute', 'What the best can reach with it.'],
    ['Execution gap', 'The distance from knowing to doing.'],
    ['Threshold', 'A level that calls for stronger safeguards.'],
  ],
  deeper: '<p><b>Measured, not guessed.</b> The earlier dual-use lesson shows how to measure without eliciting danger. This one tracks how results changed.</p><p><b>Figures.</b> The 2.53× and "up to 90%" come from the reports the course cites. All other heights are illustrative.</p><p><b>For buyers.</b> Ask vendors which safety level or tier applies, and what evidence backs it.</p>',
  code: {
    title: 'Two measures',
    note: 'Our own sketch of the course\'s asymmetry (code/main.py).',
    text: `
def uplift(with_model, without_model):
    return with_model / without_model            # novice-relative

def case_complete(evidence):
    return {"novice_uplift", "expert_capability"} <= set(evidence)
`,
  },
};
