// Model monitoring and drift: a crop-loan model was trained on last year's farmers. Week by week, new applicants arrive; their rainfall
// distribution is compared with the training one (a drift score), and the model's accuracy is tracked once repayments come in, weeks later.
// Break it: a drought shifts the inputs (data drift), a new government subsidy changes who repays (concept drift), monitor accuracy only (it arrives too late).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const WEEKS = 20, LAG = 6, BINS = 14;

export default {
  slug: 'model-drift',
  title: 'Monitoring: when the world moves on',
  description: 'A crop-loan model learned from last season\'s farmers. Week after week new applicants arrive. Watch their rainfall shift away from what the model knew, catch it with a drift score long before repayments reveal the damage, and see why a change in who repays is harder to spot.',
  overview: 'A model is trained on a snapshot of the world, and the world keeps moving. When the inputs change (a drought, a new region, a new phone app filling in forms) that is data drift, and it can be seen right away by comparing today\'s inputs with the training data. When the link between inputs and outcomes changes (a subsidy means low-rainfall farmers now repay) that is concept drift, and it only shows once outcomes arrive, often weeks later. Monitoring watches both, and decides when to retrain.',
  keywords: ['model monitoring', 'data drift', 'concept drift', 'population stability index', 'when to retrain a model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0], dir: [0.12, 0.95, 1.4], half: 2.9, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { drift: 'none', week: WEEKS, play: false, acc: 0, onlyAcc: false, retrain: false };
    // rainfall (0..1) of applicants in a given week; drought pulls it down from week 8
    const rain = (w, i) => { const r = rngOf(w * 1000 + i), g = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); const shift = st.drift === 'data' && w >= 8 ? -Math.min(0.3, (w - 7) * 0.05) : 0; return Math.max(0, Math.min(0.999, 0.55 + shift + g * 0.14)); };
    const hist = w => { const h = new Array(BINS).fill(0); for (let i = 0; i < 300; i++) h[Math.floor(rain(w, i) * BINS)]++; return h.map(c => c / 300); };
    const TRAIN = (() => { const h = new Array(BINS).fill(0); for (let w = -10; w < 0; w++) { const r = hist(w); r.forEach((v, k) => h[k] += v / 10); } return h; })();
    // population stability index between training and a week
    const psi = w => hist(w).reduce((s, q, k) => { const p = Math.max(1e-3, TRAIN[k]), qq = Math.max(1e-3, q); return s + (qq - p) * Math.log(qq / p); }, 0);
    // accuracy of the old model, known only LAG weeks later. Data drift moves applicants into rainfall it handles badly; concept drift flips the rule.
    const accOf = w => { const base = 0.86; if (st.retrain && w >= 13) return base - 0.01; if (st.drift === 'data' && w >= 8) return base - Math.min(0.2, (w - 7) * 0.03); if (st.drift === 'concept' && w >= 8) return base - Math.min(0.24, (w - 7) * 0.04); return base + Math.sin(w * 1.7) * 0.01; };
    /* ---------- the two histograms: training and this week ---------- */
    const board = P.box(2.8, 0.08, 1.4, '#F1EEE6', { r: 0.06 }); board.position.set(-1.7, 0, -0.5); S.add(board);
    const trBars = TRAIN.map((v, k) => { const b = P.box(0.16, 1, 0.3, '#B9B6AE', { r: 0.01 }); b.position.set(-2.9 + k * 0.18 + 0.09, 0.08, -0.8); b.scale.y = Math.max(0.01, v * 4); S.add(b); return b; });
    const wkBars = TRAIN.map((v, k) => { const m = new THREE.MeshLambertMaterial({ color: C.teal }); const b = P.box(0.16, 1, 0.3, C.teal, { r: 0.01, material: m }); b.position.set(-2.9 + k * 0.18 + 0.09, 0.08, -0.25); b.userData.noFit = true; S.add(b); return { b, m }; });
    const t1 = S.text('rainfall of applicants: training season (grey), this week (teal)', { size: 0.085, weight: 800, color: '#151827', maxW: 2.7 }); t1.position.set(-1.7, 0.085, 0.08); S.add(t1);
    /* ---------- the timeline: drift score and accuracy ---------- */
    const TX = 0.45, TW = 3.1, X = w => TX + w / WEEKS * TW;
    const line = P.box(TW + 0.3, 0.08, 1.4, '#2C2D31', { r: 0.06 }); line.position.set(TX + TW / 2, 0, -0.5); S.add(line);
    const psiBars = [...Array(WEEKS)].map((_, w) => { const m = new THREE.MeshLambertMaterial({ color: C.gold }); const b = P.box(0.1, 1, 0.22, C.gold, { r: 0.01, material: m }); b.position.set(X(w + 0.5), 0.08, -0.85); b.userData.noFit = true; S.add(b); return { b, m }; });
    const accBars = [...Array(WEEKS)].map((_, w) => { const m = new THREE.MeshLambertMaterial({ color: '#5FB8B2' }); const b = P.box(0.1, 1, 0.22, '#5FB8B2', { r: 0.01, material: m }); b.position.set(X(w + 0.5), 0.08, -0.2); b.userData.noFit = true; S.add(b); return { b, m }; });
    const alarm = P.box(0.03, 0.5, 0.25, C.red, { r: 0 }); alarm.position.set(X(0), 0.08, -0.85); S.add(alarm);
    const tl1 = S.text('drift score (gold), weekly', { size: 0.09, weight: 800, color: '#FFFFFF', maxW: 2 }); tl1.position.set(TX + TW / 2, 0.085, -1.1); S.add(tl1);
    const tl2 = S.text(`accuracy, known ${LAG} weeks later`, { size: 0.09, weight: 800, color: '#FFFFFF', maxW: 2 }); tl2.position.set(TX + TW / 2, 0.085, 0.08); S.add(tl2);
    const nowT = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.4 }); nowT.userData.noFit = true; S.add(nowT);
    const cursor = P.box(0.03, 0.06, 1.2, '#FFFFFF', { r: 0 }); cursor.userData.noFit = true; S.add(cursor);
    const THRESH = 0.2;
    function update(dt) {
      if (st.play) { st.acc += dt * (S.reduced ? 6 : 1.6); while (st.acc >= 1) { st.acc -= 1; st.week = st.week >= WEEKS ? 1 : st.week + 1; } }
      const w = st.week - 1, h = hist(w);
      wkBars.forEach((b, k) => { b.b.scale.y = Math.max(0.01, h[k] * 4); b.m.color.set(psi(w) > THRESH ? C.orange : C.teal); });
      let firstAlarm = -1, firstAccDrop = -1;
      for (let i = 0; i < WEEKS; i++) {
        const shown = i < st.week, p = psi(i), a = accOf(i), known = i + LAG < st.week;
        psiBars[i].b.visible = shown && !st.onlyAcc; psiBars[i].b.scale.y = Math.max(0.01, Math.min(0.9, p * 2)); psiBars[i].m.color.set(p > THRESH ? C.red : C.gold);
        accBars[i].b.visible = known; accBars[i].b.scale.y = Math.max(0.01, (a - 0.5) * 1.6); accBars[i].m.color.set(a < 0.78 ? C.red : '#5FB8B2');
        if (shown && p > THRESH && firstAlarm < 0 && !st.onlyAcc) firstAlarm = i;
        if (known && a < 0.78 && firstAccDrop < 0) firstAccDrop = i;
      }
      st.firstAlarm = firstAlarm; st.firstAccDrop = firstAccDrop;
      alarm.visible = firstAlarm >= 0; if (alarm.visible) alarm.position.x = X(firstAlarm);
      cursor.position.set(X(st.week), 0.09, -0.5);
      nowT.position.set(X(st.week), 1.05, -0.5); nowT.userData.set(`week ${st.week}`);
    }
    const controls = [
      { type: 'buttons', label: 'What changes this season', options: ['Nothing', 'A drought', 'A repayment subsidy'], get: () => ['none', 'data', 'concept'].indexOf(st.drift), act: i => { st.drift = ['none', 'data', 'concept'][i]; st.retrain = false; } },
      { type: 'slider', label: 'Week', min: 1, max: WEEKS, step: 1, get: () => st.week, set: v => { st.week = Math.round(v); st.play = false; } },
      { type: 'toggle', label: 'Play the season', short: 'Play', get: () => st.play, set: v => { st.play = v; } },
      { type: 'toggle', label: 'Retrain at week 12', short: 'Retrain', get: () => st.retrain, set: v => { st.retrain = v; }, quick: false },
    ];
    const readouts = [
      { label: 'Drift score this week', get: () => { const p = psi(st.week - 1); return { v: p.toFixed(2), sub: p > THRESH ? 'alarm' : 'normal', bad: p > THRESH }; } },
      { label: 'Accuracy known so far', get: () => { const k = st.week - LAG - 1; if (k < 0) return { v: 'none yet' }; const a = accOf(k); return { v: `${Math.round(a * 100)}%`, sub: `for week ${k + 1}`, bad: a < 0.78, good: a >= 0.84 }; } },
    ];
    const labels = [
      { name: 'hist', t: 'This week against training', d: 'Teal moving off grey: the inputs changed', icon: 'scale', atV: V(-3.1, 0.08, -1.2) },
      { name: 'psi', t: 'Drift score', d: 'Available at once, from inputs alone', icon: 'spark', atV: V(TX + TW + 0.15, 0.08, -0.85) },
      { name: 'acc', t: 'Accuracy', d: 'Only known once repayments come in', icon: 'check', atV: V(TX + TW + 0.15, 0.08, -0.2) },
      { name: 'alarm', t: 'The first alarm', d: 'Red line: time to look', icon: 'info', atV: V(-3.1, 0.08, 0.2) },
    ];
    const reset = () => { Object.assign(st, { drift: 'none', week: WEEKS, play: false, onlyAcc: false, retrain: false }); };
    const breaks = [
      { label: 'A drought', hint: 'Applicants\' rainfall falls from week 8', on: () => { reset(); st.drift = 'data'; }, off: reset },
      { label: 'A repayment subsidy', hint: 'Who repays changes; inputs don\'t', on: () => { reset(); st.drift = 'concept'; }, off: reset },
      { label: 'Watch accuracy only', hint: 'No drift score, during a drought', on: () => { reset(); st.drift = 'data'; st.onlyAcc = true; }, off: reset },
    ];
    function status() {
      const fa = st.firstAlarm, fd = st.firstAccDrop;
      if (st.retrain) return { ok: true, msg: `<b>Retrained at week 12.</b> The model learned from the new season's applicants and outcomes, and accuracy is back near 85% from week 13. Monitoring told you when; retraining fixed it.` };
      if (st.onlyAcc) return { ok: false, msg: `<b>The bad news arrives ${LAG} weeks late.</b> Without a drift score, the only warning is accuracy, and accuracy needs repayments, which come in ${LAG} weeks after each loan. The drought began at week 8; the first sign appears at week ${fd >= 0 ? fd + 1 + LAG : '—'} at the earliest. Every loan made in between was scored by a model that no longer fits.` };
      if (st.drift === 'concept') return { ok: false, msg: `<b>The inputs look normal, but the world changed.</b> A subsidy means farmers with low rainfall now repay, so the model's old rule is wrong, yet applicants\' rainfall hasn't moved: the drift score stays quiet. Only accuracy reveals it, ${LAG} weeks late${fd >= 0 ? ` (falling below 78% for week ${fd + 1})` : ''}. Concept drift needs outcome monitoring and a habit of retraining.` };
      if (st.drift === 'data') return { ok: false, msg: `<b>Data drift: a drought.</b> From week 8 applicants report far less rain than any farmer the model learned from. The drift score crossed the alarm line at week ${fa >= 0 ? fa + 1 : '—'}, while accuracy (known ${LAG} weeks later) only confirms it much later. Investigate, then retrain on recent farmers.` };
      return { ok: true, msg: `<b>A calm season.</b> This week's applicants look like the training farmers (drift score ${psi(st.week - 1).toFixed(2)}, under the ${THRESH} alarm line), and accuracy holds near 86%.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'A model from last season', home: true, say: 'A crop-loan model learned from last season\'s farmers in Malawi and Zambia, mainly from how much rain fell on their land. Now new applicants arrive every week.', act: m => m.reset() },
    { t: 'Compare the inputs', focus: 'hist', zoom: 1.3, say: 'Every week, compare this week\'s applicants with the training farmers. Grey is training, teal is this week. In a normal season they match.' },
    { t: 'A drought', home: true, say: 'Then a drought begins. Applicants report far less rain than anyone the model has seen. The drift score jumps and crosses the alarm line within a week or two.', act: m => m.set({ drift: 'data' }), wait: 5 },
    { t: 'Accuracy comes late', focus: 'acc', zoom: 1.3, say: 'Accuracy tells the same story, but only weeks later, because you only know who repaid once the repayments are due.' },
    { t: 'A change you can\'t see', home: true, say: 'Harder still: a subsidy changes who repays, while rainfall stays the same. The inputs look normal, the drift score stays quiet, and only late accuracy shows the model is wrong.', act: m => m.set({ drift: 'concept' }), wait: 6 },
    { t: 'Then retrain', home: true, say: 'Monitoring tells you when the world has moved. Retraining on recent data brings the model back. Watch the inputs for early warning, and the outcomes for the truth.', act: m => m.set({ retrain: true }), wait: 5 },
  ],
  check: [
    { q: 'Applicants\' rainfall suddenly differs from the training data. This is…', options: ['Data drift', 'Concept drift', 'Overfitting'], answer: 0, why: 'The inputs changed. It can be detected at once by comparing distributions.' },
    { q: 'Why can\'t accuracy alone warn you quickly?', options: ['Outcomes such as repayments arrive weeks later', 'Accuracy is too noisy to compute', 'It needs a GPU'], answer: 0, why: 'Labels lag behind predictions, so input monitoring gives earlier warning.' },
    { q: 'Inputs look the same, but who repays has changed. Which drift is it, and how do you see it?', options: ['Concept drift; only by watching outcomes', 'Data drift; by the drift score', 'No drift'], answer: 0, why: 'The input-output relationship changed; input statistics can\'t show it.' },
  ],
  terms: [
    ['Data drift', 'The inputs the model sees change from those it was trained on.'],
    ['Concept drift', 'The relationship between inputs and the right answer changes.'],
    ['PSI', 'Population stability index: a score of how far today\'s distribution has moved from the training one.'],
    ['Label lag', 'The delay before the true outcome is known.'],
    ['Retraining', 'Fitting the model again on recent data, on a schedule or when monitoring raises an alarm.'],
  ],
  deeper: '<p><b>What to watch.</b> Input distributions (PSI, or tests such as Kolmogorov-Smirnov), the distribution of the model\'s own predictions, missing values, and, once labels arrive, accuracy by segment: by region, by product, by month.</p><p><b>Alarms need owners.</b> A drift score is useless unless someone is paged, looks, and decides: retrain, roll back, or accept that the season is unusual.</p><p><b>Language models drift too.</b> Questions change, slang changes, new products appear. Logging prompts and sampling them for review is the same idea at a larger scale.</p>',
  code: {
    title: 'A drift score: population stability index',
    note: 'Adapted from the course\'s monitoring lesson.',
    text: `
import numpy as np

def psi(train, now, bins=14):
    edges = np.quantile(train, np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    p = np.histogram(train, edges)[0] / len(train)
    q = np.histogram(now, edges)[0] / len(now)
    p, q = np.clip(p, 1e-3, None), np.clip(q, 1e-3, None)
    return np.sum((q - p) * np.log(q / p))

# rule of thumb: below 0.1 calm, 0.1 to 0.2 watch, above 0.2 investigate
for week, batch in enumerate(weekly_rainfall, 1):
    score = psi(train_rainfall, batch)
    if score > 0.2:
        print(f"week {week}: drift score {score:.2f}, alert the team")
`,
  },
};
