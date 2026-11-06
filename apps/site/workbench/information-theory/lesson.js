// Information theory: tomorrow's weather in Accra, as it really goes and as a model forecasts it.
// When a day happens, a tower rises as tall as the model's surprise (−log₂ of the chance it gave). Entropy is the average surprise
// of the truth; cross-entropy is the model's average surprise, the loss models are trained on.
// Break it: give storms 0% (infinite surprise), an overconfident model, and a model that knows nothing.
const KINDS = ['Sun', 'Cloud', 'Rain', 'Storm'];
const TRUE = [0.5, 0.25, 0.2, 0.05];
const MODELS = { Good: [0.45, 0.28, 0.2, 0.07], Overconfident: [0.94, 0.03, 0.02, 0.01], 'Knows nothing': [0.25, 0.25, 0.25, 0.25], 'No storms': [0.52, 0.27, 0.21, 0] };
const COLS = ['#F2C94C', '#B9B6AE', '#3D6BD6', '#5E2A61'];
const bits = p => p <= 0 ? Infinity : -Math.log2(p);
const H = p => p.reduce((a, x) => a + (x > 0 ? x * bits(x) : 0), 0);
const CE = (p, q) => p.reduce((a, x, i) => a + (x > 0 ? x * bits(q[i]) : 0), 0);

export default {
  slug: 'information-theory',
  title: 'Surprise, entropy and the loss',
  description: 'Forecast tomorrow\'s weather in Accra and measure how surprised the forecast is when the day comes. Average surprise is entropy; the forecast\'s average surprise is cross-entropy, the loss nearly every model learns from. Then give storms a 0% chance.',
  overview: 'Information theory measures surprise. An outcome you gave a 50% chance surprises you by 1 bit; one you gave 1 in 8 surprises you by 3 bits; one you said was impossible surprises you infinitely. Entropy is the average surprise of the world itself, and cross-entropy is the average surprise of a model\'s forecast. Training a classifier or a language model means lowering that average surprise, and the gap between the two is the KL divergence.',
  keywords: ['entropy explained', 'cross entropy loss', 'kl divergence', 'information theory machine learning', 'perplexity'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.8, 0], dir: [0.1, 0.75, 1.45], half: 3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { model: 'Good', smooth: false, day: null, days: 0, sum: 0 };
    const q = () => { const m = MODELS[st.model]; return st.smooth ? m.map(x => 0.9 * x + 0.025) : m; };
    /* ---------- two sets of bars on a board ---------- */
    const board = P.box(6.4, 0.1, 3.4, '#F1EEE6', { r: 0.12 }); board.position.set(0, 0, 0.1); S.add(board);
    function group(x0, title, ink) {
      const t = S.text(title, { color: '#151827', size: 0.14, face: 'front', weight: 800, maxW: 2.3 }); t.position.set(x0 + 0.84, 0.05, 1.81); S.add(t);
      return KINDS.map((k, i) => {
        const x = x0 + i * 0.56, m = new THREE.MeshLambertMaterial({ color: COLS[i] });
        const b = P.box(0.42, 1, 0.42, COLS[i], { r: 0.04, material: m }); b.position.set(x, 0.1, -0.35); S.add(b);
        const name = S.text(k, { color: '#151827', size: 0.12, weight: 800, maxW: 0.52 }); name.position.set(x, 0.105, 0.05); S.add(name);
        const pc = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.7 }); pc.userData.noFit = true; S.add(pc);
        return { b, m, pc, x };
      });
    }
    const truth = group(-2.85, 'How the weather really goes'), model = group(1.17, 'What the model forecast');
    const BH = 2.2;   // bar height for a probability of 1
    /* ---------- the surprise tower ---------- */
    const towerM = new THREE.MeshLambertMaterial({ color: C.orange });
    const tower = P.box(0.5, 1, 0.5, C.orange, { r: 0.05, material: towerM }); tower.position.set(0, 0.1, -0.35); tower.userData.noFit = true; S.add(tower);
    const towerT = S.text('', { size: 0.14, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); towerT.userData.noFit = true; S.add(towerT);
    const pad = P.box(0.7, 0.04, 0.7, '#2C2D31', { r: 0.05 }); pad.position.set(0, 0.1, -0.35); S.add(pad);
    const padT = S.text('SURPRISE', { color: '#151827', size: 0.1, weight: 800, maxW: 0.9 }); padT.position.set(0, 0.105, 0.15); S.add(padT);
    /* ---------- the two gauges ---------- */
    const GX0 = -2.2, GL = 4.4, MAXB = 5;
    const gauges = [0, 1].map(k => {
      const z = 1.0 + k * 0.38, base = P.box(GL, 0.06, 0.26, '#D8D4C8', { r: 0.04 }); base.position.set(GX0 + GL / 2, 0.1, z); S.add(base);
      const m = new THREE.MeshLambertMaterial({ color: k ? C.coral : C.teal });
      const fill = P.box(1, 0.09, 0.28, '#ccc', { r: 0.03, material: m }); fill.userData.noFit = true; S.add(fill);
      const t = S.text('', { color: '#151827', size: 0.14, weight: 800, maxW: 3.4, maxH: 0.24 }); t.position.set(GX0 + GL / 2, 0.16, z); S.add(t);
      return { fill, t, z };
    });
    let towerH = 0.01, towerGoal = 0.01;
    function newDay(k) {
      if (k == null) { let r = Math.random(); k = 0; while (k < 3 && r > TRUE[k]) { r -= TRUE[k]; k++; } }
      const s = bits(q()[k]);
      st.day = { k, s }; st.days++; st.sum += s;
      towerGoal = Number.isFinite(s) ? Math.max(0.02, s * 0.32) : 2.6;
    }
    function many(n) { for (let i = 0; i < n; i++) newDay(); }
    function update(dt, t) {
      const Q = q();
      truth.forEach((g, i) => { g.b.scale.y = Math.max(0.01, TRUE[i] * BH); g.pc.position.set(g.x, 0.1 + TRUE[i] * BH + 0.2, -0.35); g.pc.userData.set(`${Math.round(TRUE[i] * 100)}%`); });
      model.forEach((g, i) => { g.b.scale.y = Math.max(0.01, Q[i] * BH); g.pc.position.set(g.x, 0.1 + Q[i] * BH + 0.2, -0.35); g.pc.userData.set(`${(Q[i] * 100).toFixed(Q[i] < 0.1 && Q[i] > 0 ? 1 : 0)}%`); g.m.emissive.set(st.day && st.day.k === i ? '#FFFFFF' : '#000000').multiplyScalar(0.25); });
      towerH += (towerGoal - towerH) * Math.min(1, dt * 5);
      tower.scale.y = towerH; tower.visible = !!st.day;
      const inf = st.day && !Number.isFinite(st.day.s);
      towerM.color.set(inf ? C.red : C.orange); towerM.emissive.set(inf ? C.red : '#000000').multiplyScalar(inf ? 0.3 + 0.2 * Math.sin(t * 8) : 0);
      towerT.visible = !!st.day; if (st.day) { towerT.position.set(0, 0.1 + towerH + 0.25, -0.35); towerT.userData.set(`${KINDS[st.day.k]}: ${inf ? '∞ bits' : `${st.day.s.toFixed(2)} bits`}`); }
      const h = H(TRUE), ce = CE(TRUE, Q);
      [h, ce].forEach((v, k) => { const w = GL * Math.min(1, (Number.isFinite(v) ? v : MAXB) / MAXB); const g = gauges[k]; g.fill.scale.x = Math.max(0.01, w); g.fill.position.set(GX0 + w / 2, 0.1, g.z); g.t.userData.set(k ? `cross-entropy  ${Number.isFinite(v) ? v.toFixed(2) + ' bits' : '∞'}` : `entropy  ${v.toFixed(2)} bits`); g.t.position.set(GX0 + GL - 0.95, 0.17, g.z); });
    }
    newDay(0);
    const controls = [
      { type: 'button', label: 'Another day', short: 'New day', act: () => newDay() },
      { type: 'buttons', label: 'The forecast', options: Object.keys(MODELS).filter(k => k !== 'No storms'), get: () => Object.keys(MODELS).indexOf(st.model), act: i => { st.model = Object.keys(MODELS)[i]; st.days = 0; st.sum = 0; newDay(st.day ? st.day.k : 0); } },
      { type: 'toggle', label: 'Label smoothing (never say never)', short: 'Smoothing', get: () => st.smooth, set: v => { st.smooth = v; st.days = 0; st.sum = 0; newDay(st.day ? st.day.k : 0); } },
      { type: 'button', label: 'Simulate a year', short: 'A year', act: () => { st.days = 0; st.sum = 0; many(365); }, quick: false },
    ];
    const readouts = [
      { label: 'Entropy', get: () => ({ v: `${H(TRUE).toFixed(2)} bits` }) },
      { label: 'Cross-entropy', get: () => { const v = CE(TRUE, q()); return { v: Number.isFinite(v) ? `${v.toFixed(2)} bits` : '∞', sub: Number.isFinite(v) ? `gap (KL) ${(v - H(TRUE)).toFixed(2)}` : 'a storm breaks it', bad: !Number.isFinite(v) || v - H(TRUE) > 0.5, good: Number.isFinite(v) && v - H(TRUE) < 0.05 }; } },
      { label: 'Average so far', get: () => ({ v: st.days ? (Number.isFinite(st.sum) ? `${(st.sum / st.days).toFixed(2)} bits` : '∞') : '—', sub: `${st.days} days` }) },
    ];
    const labels = [
      { name: 'truth', t: 'How it really goes', d: 'The weather\'s own chances', icon: 'box', atV: V(-3.06, 0.1 + 0.5 * BH, -0.56) },
      { name: 'entropy', t: 'Entropy', d: 'The least surprise anyone can get', icon: 'scale', atV: V(GX0, 0.13, 1.0) },
      { name: 'model', t: 'The forecast', d: 'What the model said would happen', icon: 'spark', atV: V(3.08, 0.1 + 0.45 * BH, -0.56) },
      { name: 'ce', t: 'Cross-entropy: the loss', d: 'The model\'s average surprise', icon: 'target', atV: V(GX0 + GL, 0.13, 1.38) },
    ];
    const reset = () => { Object.assign(st, { model: 'Good', smooth: false, days: 0, sum: 0 }); newDay(0); };
    const breaks = [
      { label: 'Storms: 0%', hint: 'Then a storm comes', on: () => { reset(); st.model = 'No storms'; newDay(3); }, off: reset },
      { label: 'An overconfident forecast', hint: '94% sun, then it rains', on: () => { reset(); st.model = 'Overconfident'; newDay(2); }, off: reset },
      { label: 'A forecast that knows nothing', hint: 'Every kind 25%', on: () => { reset(); st.model = 'Knows nothing'; many(365); }, off: reset },
    ];
    function status() {
      const Q = q(), ce = CE(TRUE, Q), h = H(TRUE), d = st.day;
      if (!Number.isFinite(ce)) return { ok: false, msg: `<b>Infinite surprise.</b> The forecast gave storms 0%, and a storm came. −log₂(0) is infinite, so the loss is infinite and training breaks (NaN). Never say never: label smoothing keeps a little chance on everything.` };
      if (st.model === 'Overconfident' && !st.smooth) return { ok: false, msg: `<b>Very sure, often wrong.</b> 94% on sun leaves only 2% for rain, so a rainy day (one in five) costs ${bits(Q[2]).toFixed(1)} bits of surprise. Its average surprise is ${ce.toFixed(2)} bits, worse than a forecast that knows nothing (2.00). Confidence costs dearly when it's wrong.` };
      if (st.model === 'Knows nothing') return { ok: false, msg: `<b>2 bits, every day.</b> Saying 25% for everything means every day costs exactly 2 bits, against ${h.toFixed(2)} for a perfect forecast. Two bits is like choosing among four equal options: its perplexity is 4. Learning means beating this.` };
      return { ok: ce - h < 0.1 ? true : undefined, msg: `<b>${d ? `${KINDS[d.k]}: ${d.s.toFixed(2)} bits of surprise.` : ''}</b> A day the forecast gave ${d ? Math.round(Q[d.k] * 100) : 0}% surprises it by −log₂(${d ? Q[d.k].toFixed(2) : 0}). On average it is surprised ${ce.toFixed(2)} bits a day; the weather itself can't do better than ${h.toFixed(2)}. The gap, ${(ce - h).toFixed(2)}, is what training would shrink.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, day: newDay, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'A forecast', home: true, say: 'On the left, how the weather really goes in Accra at this time of year: mostly sun, some cloud and rain, the odd storm. On the right, a model\'s forecast.', act: m => m.reset() },
    { t: 'Surprise', focus: [0, 0.6, -0.35], zoom: 1.5, say: 'When a day comes, measure the forecast\'s surprise. A sunny day it gave one chance in two costs one bit. A rainy day it gave one in five costs more. Rarer means more surprising.', act: m => m.day(2) },
    { t: 'Entropy', focus: 'entropy', zoom: 1.4, say: 'Average the surprise of the truth over many days and you get entropy: the least surprise anyone could manage, even with a perfect forecast.' },
    { t: 'Cross-entropy is the loss', focus: 'ce', zoom: 1.4, say: 'Average the forecast\'s surprise instead and you get cross-entropy. It is the loss nearly every classifier and language model is trained to lower. The gap between the two is called the KL divergence.' },
    { t: 'Never say never', home: true, say: 'Give storms zero percent, and the day a storm comes the surprise is infinite. The loss blows up. That is why models keep a little chance on everything.', act: m => { m.set({ model: 'No storms' }); m.day(3); }, wait: 5 },
    { t: 'Too sure', home: true, say: 'An overconfident forecast is punished harder still: ninety-four percent sun, and every rainy day costs over five bits. Being honest about uncertainty pays.', act: m => { m.set({ model: 'Overconfident' }); m.day(2); }, wait: 5 },
  ],
  check: [
    { q: 'A forecast gave rain a 1 in 8 chance, and it rained. How much surprise?', options: ['1 bit', '3 bits', '8 bits'], answer: 1, why: 'Surprise is −log₂(p): −log₂(1/8) = 3 bits.' },
    { q: 'What is cross-entropy in a trained model?', options: ['The model\'s average surprise at what really happens: its loss', 'The size of the model', 'The number of classes'], answer: 0, why: 'Lowering cross-entropy means the model\'s forecasts fit what actually happens.' },
    { q: 'Why is predicting exactly 0% dangerous?', options: ['It wastes memory', 'If it happens, the surprise and the loss are infinite', 'It makes the model slow'], answer: 1, why: '−log(0) is infinite. Label smoothing keeps a small chance on everything.' },
  ],
  terms: [
    ['Surprise (information)', '−log₂ of the chance you gave something: rare outcomes carry more bits.'],
    ['Entropy', 'The average surprise of a distribution: how unpredictable it really is.'],
    ['Cross-entropy', 'The average surprise of a forecast at what really happens. The usual loss for classifiers.'],
    ['KL divergence', 'Cross-entropy minus entropy: how much worse the forecast is than the truth itself.'],
    ['Perplexity', '2 to the power of the cross-entropy: how many equal choices the model is effectively guessing among.'],
  ],
  deeper: '<p><b>Language models.</b> A language model forecasts the next token. Its loss is the cross-entropy over the tokens that actually came, usually in nats (natural log) rather than bits. Perplexity 20 means it is as unsure as choosing among 20 equally likely words.</p><p><b>Why cross-entropy and not "percent right"?</b> Percent right ignores confidence. Cross-entropy rewards putting more probability on the right answer, which gives smooth gradients to learn from.</p><p><b>Mutual information</b> measures how much knowing one thing cuts your surprise about another, a useful way to rank which features tell you most about the target.</p>',
  code: {
    title: 'Surprise, entropy and cross-entropy',
    note: 'Adapted from the course\'s information-theory lesson.',
    text: `
import math

def surprise(p):
    return -math.log2(p)

def entropy(p):
    return sum(x * surprise(x) for x in p if x > 0)

def cross_entropy(p, q, eps=1e-12):
    # eps: never take the log of exactly zero
    return sum(x * surprise(max(y, eps)) for x, y in zip(p, q) if x > 0)

truth = [0.50, 0.25, 0.20, 0.05]      # sun, cloud, rain, storm
good = [0.45, 0.28, 0.20, 0.07]
uniform = [0.25] * 4

print(entropy(truth))                  # 1.68 bits
print(cross_entropy(truth, good))      # 1.69 bits
print(cross_entropy(truth, uniform))   # 2.00 bits
print(2 ** cross_entropy(truth, uniform))   # perplexity 4
`,
  },
};
