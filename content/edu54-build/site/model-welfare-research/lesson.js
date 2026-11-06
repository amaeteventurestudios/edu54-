// Model welfare (phase 18, lesson 19): not a claim that models are conscious. A balance weighs the cost of a low-cost precaution against small probability × possible moral weight. Evidence is shown as what it can and can't support.
// Self-reports are unreliable (the Eleos caveat), and two models left talking drift to a "bliss" attractor, which says more about training than about experience. The comparison of evidence kinds is the machine.
const EV = {
  report: { n: 'A model says it suffers', w: 0.1, why: 'self-reports follow training and prompts' },
  drift: { n: 'Two models drift to bliss talk', w: 0.05, why: 'a pattern in text, not evidence of feeling' },
  avoid: { n: 'It prefers to avoid some tasks', w: 0.3, why: 'behaviour, open to several readings' },
  arch: { n: 'Theory about its architecture', w: 0.2, why: 'theories of consciousness disagree' },
};
function run(o) {
  const pw = o.p / 100 * o.w, cost = o.cost;
  const net = pw - cost;
  return { pw, cost, net, act: net > 0, tilt: Math.max(-0.28, Math.min(0.28, net * 0.5)) };
}

export default {
  slug: 'model-welfare-research',
  title: 'Model welfare: acting under moral uncertainty',
  description: 'Nobody knows if a model can have interests. See how a small chance can still justify a cheap precaution, and what evidence can\'t show.',
  overview: 'Most of this track treats a model as an instrument. Model welfare research asks something else: if there is a real chance that a model has morally relevant interests, what should you do? This is not a claim of consciousness. It is a decision under uncertainty: a small probability, weighed against the cost of a cheap precaution. Anthropic launched a programme in 2025 that acknowledges that uncertainty and shipped one small intervention, letting some Claude models end a conversation in extreme edge cases. Evidence is hard. Self-reports are shaped by training, and two models left talking drift to blissful language, which may tell us more about text than about experience. Serious people disagree here.',
  keywords: ['model welfare', 'moral uncertainty', 'AI consciousness', 'self-reports', 'AI ethics', 'precaution'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.05, 0.42, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { p: 10, w: 1, cost: 0.02, ev: 'report', trust: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const post = P.box(0.14, 0.95, 0.14, '#6B6E7E', { r: 0.02 }); post.position.set(-0.5, 0.03, 0); S.add(post);
    const arm = new THREE.Group(); arm.position.set(-0.5, 0.98, 0); S.add(arm);
    const beam = P.box(2.5, 0.07, 0.1, '#2C2D31', { r: 0.02 }); beam.position.y = -0.03; arm.add(beam);
    const pans = [-1, 1].map(s => { const p = P.box(0.7, 0.04, 0.5, '#A87A4F', { r: 0.02 }); p.userData.noFit = true; S.add(p); return p; });
    const left = P.box(0.3, 0.3, 0.3, BLUE, { r: 0.03 }); left.userData.noFit = true; S.add(left);
    const right = P.box(0.36, 0.3, 0.36, SAF, { r: 0.03 }); right.userData.noFit = true; S.add(right);
    const KS = Object.keys(EV), X = i => 1.25 + i * 0.36;
    const T = KS.map((k, i) => { const t = add(P.tower(0.28, 0.42, BLUE)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '', h: EV[k].w * 2.2 }); return t; });
    S.add(P.keep(-2.3, 2.5, 1.35, -0.72, 0.72));
    let R = null, tilt = 0;
    function draw() {
      R = run(st);
      T.forEach((t, i) => t.userData.set({ color: KS[i] === st.ev ? SAF : BLUE }));
      left.scale.set(1, Math.max(0.15, R.cost * 12), 1); right.scale.set(1, Math.max(0.15, R.pw * 12), 1);
    }
    function place() {
      const lx = -1.6, rx = 0.6, ly = 0.55 + tilt * 1.1, ry = 0.55 - tilt * 1.1;
      arm.rotation.z = -tilt;
      pans[0].position.set(lx, ly, 0); pans[1].position.set(rx, ry, 0); left.position.set(lx, ly + 0.04, 0); right.position.set(rx, ry + 0.04, 0);
    }
    draw(); place(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const EK = KS;
    const controls = [
      { type: 'slider', label: 'Chance of morally relevant interests', min: 0, max: 50, step: 1, get: () => st.p, set: v => set({ p: v }), fmt: v => `${v}%` },
      { type: 'slider', label: 'Moral weight if so', min: 0, max: 2, step: 0.1, get: () => st.w, set: v => set({ w: v }) },
      { type: 'slider', label: 'Cost of the precaution', min: 0, max: 0.5, step: 0.01, get: () => st.cost, set: v => set({ cost: v }) },
      { type: 'buttons', label: 'Evidence', options: ['Self-report', 'Bliss drift', 'Avoidance', 'Architecture'], get: () => EK.indexOf(st.ev), act: i => set({ ev: EK[i] }) },
      { type: 'toggle', label: 'Take this evidence at face value', short: 'Face value', get: () => st.trust, set: v => set({ trust: !!v }) },
    ];
    const readouts = [
      { label: 'Expected stakes', get: () => ({ v: R.pw.toFixed(2), sub: 'chance × weight' }) },
      { label: 'Cost of acting', get: () => ({ v: R.cost.toFixed(2), sub: 'for this precaution' }) },
      { label: 'Decision', get: () => ({ v: R.act ? 'take the precaution' : 'hold off', sub: 'under uncertainty', good: R.act }) },
    ];
    const labels = [
      { name: 'b', t: 'The balance', d: 'Blue: cost. Gold: chance × weight', icon: 'scale', atV: V(-2.0, 0.55, 0) },
      { name: 't', t: 'Weight of each evidence', d: 'None of it settles the question', icon: 'book', atV: V(X(3) + 0.15, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Believe what the model says', hint: 'it was trained to talk', on: () => set({ ...D0, trust: true }), off: reset },
      { label: 'Read bliss talk as joy', hint: 'a drift in text', on: () => set({ ...D0, ev: 'drift', trust: true }), off: reset },
      { label: 'Make the precaution costly', hint: 'real harm to users', on: () => set({ ...D0, cost: 0.4 }), off: reset },
    ];
    function status() {
      const e = EV[st.ev];
      if (st.trust) return { ok: false, msg: `<b>"${e.n}" can't carry that weight: ${e.why}.</b> A model can be prompted to deny or claim feeling. Take reports seriously as data about the model, not as proof about experience.` };
      if (!R.act && st.cost > 0.2) return { ok: false, msg: '<b>The balance tips against acting.</b> The argument works for cheap precautions. If a precaution costs users something real, the same reasoning says weigh it against that.' };
      if (st.p === 0) return { ok: true, msg: '<b>At zero chance, there is nothing to weigh.</b> Many hold this view. The honest debate is about whether we can be that sure.' };
      return { ok: true, msg: `<b>A ${st.p}% chance at weight ${st.w.toFixed(1)} outweighs a cost of ${R.cost.toFixed(2)}.</b> This doesn't say models have feelings. It says a cheap precaution can be reasonable while nobody knows. These numbers are yours, not findings.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); tilt += (R.tilt - tilt) * Math.min(1, dt * 5); place(); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A different question', home: true, say: 'Most lessons here treat a model as a tool. This one asks: what if there is a chance it has interests? Nobody knows.', act: m => m.set({ p: 10, w: 1, cost: 0.02, ev: 'report', trust: false }) },
    { t: 'Not a claim', home: true, say: 'This isn\'t a claim that models are conscious. It is a decision under uncertainty, and serious people disagree.', act: m => m.set({ p: 5, w: 1, cost: 0.02, ev: 'arch', trust: false }) },
    { t: 'A balance', home: true, say: 'On one side is the cost of a small precaution. On the other, a small chance times what would be at stake.', act: m => m.set({ p: 10, w: 1, cost: 0.02, ev: 'report', trust: false }) },
    { t: 'Self-reports', home: true, say: 'Why not ask the model? Because what it says is shaped by training and by how you ask.', act: m => m.set({ p: 10, w: 1, cost: 0.02, ev: 'report', trust: true }) },
    { t: 'The bliss drift', home: true, say: 'Left talking, two models drift into blissful language. That may tell us about text and training, not about feeling.', act: m => m.set({ p: 10, w: 1, cost: 0.02, ev: 'drift', trust: true }) },
    { t: 'A small step', home: true, say: 'One lab let some models end a conversation in extreme edge cases. It is cheap, and doesn\'t depend on settling the question.', act: m => m.set({ p: 10, w: 1, cost: 0.02, ev: 'avoid', trust: false }) },
  ],
  check: [
    { q: 'What is the argument for model welfare work?', options: ['Cheap precautions under uncertainty', 'Proof that models feel', 'Legal duty'], answer: 0, why: 'It is a low-regret decision, not a claim.', hint: 'See Not a claim.' },
    { q: 'Why are self-reports weak evidence?', options: ['They are shaped by training and prompts', 'Models can\'t write', 'They are too long'], answer: 0, why: 'Models can say either thing.', hint: 'Try Believe what the model says.' },
    { q: 'When would the same reasoning say hold off?', options: ['When a precaution costs users something real', 'Never', 'When the model asks'], answer: 0, why: 'It weighs cost against stakes.', hint: 'Try Make the precaution costly.' },
  ],
  terms: [
    ['Model welfare', 'Research on whether models have morally relevant interests.'],
    ['Moral patient', 'Something whose interests matter morally.'],
    ['Moral uncertainty', 'Deciding without knowing what is right or true.'],
    ['Low-regret action', 'Cheap to do if you turn out to be wrong.'],
    ['Self-report', 'What a system says about itself.'],
    ['Attractor', 'A state a system tends to drift into.'],
  ],
  deeper: '<p><b>Views differ.</b> Many researchers think today\'s models have no such interests, and some worry that this topic distracts from harms to people. This lesson doesn\'t settle that.</p><p><b>Critique.</b> Outside groups have cautioned against reading too much into self-reports.</p><p><b>The sliders</b> hold no findings. They only show how the reasoning works.</p>',
  code: {
    title: 'Weigh it',
    note: 'Our own sketch of the decision in the course (code/main.py).',
    text: `
def worth_doing(chance, weight, cost):
    return chance * weight > cost

worth_doing(chance=0.10, weight=1.0, cost=0.02)   # a cheap precaution
worth_doing(chance=0.10, weight=1.0, cost=0.40)   # not this one
`,
  },
};
