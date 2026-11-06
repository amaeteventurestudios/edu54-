// Sentiment analysis: a Naive Bayes classifier reads reviews of a waakye spot in Accra and sorts them into happy and unhappy. It really trains here, on 28 labelled reviews.
// Each word has a weight: how much more often it appears in happy reviews than unhappy ones (green up, red down). A review's score is the sum of its words' weights.
// Test reviews ride to a scale; the tray on the right counts how each class went.
// Break it: no negation handling ("not good" counts as good), no smoothing (one unseen word gets probability zero and wipes out the whole review),
// trained on 90% happy reviews and judged by accuracy alone (it calls almost everything happy and still scores high).
const TRAIN = [
  ['the waakye was delicious', 1], ['great food and friendly staff', 1], ['good portion and fair price', 1], ['delicious shito, will come back', 1], ['friendly and fast', 1],
  ['great waakye, good gari', 1], ['the fish was fresh and good', 1], ['fast service, delicious', 1], ['lovely place, great food', 1], ['good food, fair price', 1],
  ['fresh and delicious waakye', 1], ['staff were friendly, food great', 1], ['not expensive and delicious', 1], ['not slow, always fresh', 1], ['not bad at all, good food', 1], ['never disappoints, great shito', 1],
  ['cold food and slow service', 0], ['the waakye was not good', 0], ['slow and rude staff', 0], ['too expensive, small portion', 0], ['not fresh, not delicious', 0],
  ['the fish was cold', 0], ['rude waiter, slow service', 0], ['bad shito, not good at all', 0], ['small portion, bad value', 0], ['not friendly and very slow', 0],
  ['cold waakye, never again', 0], ['expensive and bad', 0],
];
const TEST = [['not delicious and cold', 0], ['good and fast', 1], ['not good, not fresh', 0], ['delicious waakye, friendly', 1], ['the shito was amazing', 1], ['slow, not great', 0], ['great price, good fish', 1], ['the kelewele was cold', 0]];
const tok = s => s.toLowerCase().match(/[a-z]+/g) || [];
const negate = ws => { const out = []; let neg = false; ws.forEach(w => { if (w === 'not' || w === 'never') { neg = true; out.push(w); return; } out.push(neg ? `NOT_${w}` : w); }); return out; };

export default {
  slug: 'sentiment-analysis',
  title: 'Sentiment analysis: happy or not',
  description: 'A Naive Bayes classifier trains on 28 reviews of a waakye spot in Accra and learns a weight for every word: green for happy, red for unhappy. Test reviews ride to a scale and are sorted. Then switch off negation handling and watch "not good" come out happy, drop smoothing, or train on mostly happy reviews and see why accuracy alone lies.',
  overview: 'Sentiment analysis labels text as positive or negative. A multinomial Naive Bayes classifier counts how often each word appears in each class and scores a new text by adding up the log of each word\'s probability under each class, assuming words are independent. It is fast and surprisingly good, with three classic pitfalls. Negation: "not good" contains "good", so the "not" must change the words that follow. Zero counts: a word never seen in one class would get probability zero, so counts are smoothed by adding one. And imbalance: if most training reviews are happy, a model can score high accuracy by saying "happy" every time, so judge it by precision, recall and F1 for each class.',
  keywords: ['sentiment analysis', 'naive bayes text classification', 'negation handling', 'laplace smoothing', 'f1 score imbalanced'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0], dir: [0.12, 0.7, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { neg: true, smooth: true, skew: false, clock: 0 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* ---------- word weight board ---------- */
    const WORDS = ['delicious', 'great', 'good', 'friendly', 'fresh', 'fast', 'NOT_good', 'cold', 'slow', 'rude', 'expensive', 'bad'];
    const WX = -0.9, WZ = -0.6, board = P.box(4.2, 1.7, 0.06, '#FBF8F1', { r: 0.04 }); board.position.set(WX, 0.12, WZ); S.add(board);
    const bTop = S.text('each word\'s weight: happy ↑, unhappy ↓', { size: 0.075, weight: 800 }); bTop.position.set(WX, 0.12 + 1.705, WZ); S.add(bTop);
    const mid = P.box(3.9, 0.012, 0.01, '#8E91A3', { r: 0 }); mid.position.set(WX, 0.12 + 0.95, WZ + 0.035); mid.layers.set(1); S.add(mid);
    const wbars = WORDS.map((w, j) => { const m = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(0.22, 1, 0.03, C.teal, { r: 0.01, material: m }); b.userData.noFit = true; b.layers.set(1); S.add(b); const t = S.text(w.replace('NOT_', 'not '), { size: 0.06, weight: 800, face: 'front', color: ink }); t.position.set(WX - 1.85 + (j + 0.5) * 0.32, 0.12 + 0.18, WZ + 0.04); S.add(t); return { b, m, x: WX - 1.85 + (j + 0.5) * 0.32 }; });
    /* ---------- the scale and trays ---------- */
    const SX = 2.35, beam = P.box(1.6, 0.05, 0.12, '#5B6178', { r: 0.02 }); beam.position.set(SX, 0.95, 0.1); beam.userData.noFit = true; S.add(beam);
    const post = P.box(0.08, 0.83, 0.08, '#5B6178', { r: 0.02 }); post.position.set(SX, 0.12, 0.1); S.add(post);
    const panL = P.cyl(0.25, 0.04, C.teal, { seg: 24 }), panR = P.cyl(0.25, 0.04, C.red, { seg: 24 }); [panL, panR].forEach(p => { p.userData.noFit = true; S.add(p); });
    const hT = S.text('happy', { size: 0.07, weight: 800, color: '#137A75', bg: '#FFFFFF', face: 'cam', top: true }), uT = S.text('unhappy', { size: 0.07, weight: 800, color: '#B23A2E', bg: '#FFFFFF', face: 'cam', top: true }); [hT, uT].forEach(t => { t.userData.noFit = true; S.add(t); });
    const card = S.text('', { size: 0.075, weight: 800, color: ink, bg: '#FFFDF5', face: 'cam', top: true, maxW: 1.8 }); card.userData.noFit = true; S.add(card);
    const tray = P.box(1.8, 0.05, 0.75, '#FBF8F1', { r: 0.04 }); tray.position.set(SX, 0.12, 1.0); S.add(tray);
    const trT = S.text('', { size: 0.065, weight: 800, color: ink, maxW: 1.7 }); trT.position.set(SX, 0.175, 1.0); S.add(trT);
    /* ---------- the classifier ---------- */
    let R = null;
    function train() {
      let data = TRAIN.slice();
      if (st.skew) { const pos = TRAIN.filter(d => d[1] === 1); data = pos.concat(pos).concat(pos).concat(TRAIN.filter(d => d[1] === 0).slice(0, 3)); }
      const prep = s => (st.neg ? negate(tok(s)) : tok(s));
      const cnt = [{}, {}], tot = [0, 0], docs = [0, 0], vocab = new Set();
      data.forEach(([s, y]) => { docs[y]++; prep(s).forEach(w => { cnt[y][w] = (cnt[y][w] || 0) + 1; tot[y]++; vocab.add(w); }); });
      const a = st.smooth ? 1 : 0, Vn = vocab.size;
      const lp = (w, y) => { const c = (cnt[y][w] || 0) + a, d = tot[y] + a * Vn; return c === 0 ? -Infinity : Math.log(c / d); };
      const prior = [Math.log(docs[0] / data.length), Math.log(docs[1] / data.length)];
      const score = s => { const ws = prep(s); const sc = [0, 1].map(y => prior[y] + ws.reduce((acc, w) => acc + (vocab.has(w) || !st.smooth ? lp(w, y) : 0), 0)); return sc; };
      const weight = w => { const l1 = lp(w, 1), l0 = lp(w, 0); return Number.isFinite(l1) && Number.isFinite(l0) ? l1 - l0 : Number.isFinite(l1) ? 3 : Number.isFinite(l0) ? -3 : 0; };
      const preds = TEST.map(([s, y]) => { const sc = score(s); const p = sc[1] === sc[0] ? (Number.isFinite(sc[1]) ? 1 : -1) : sc[1] > sc[0] ? 1 : 0; return { s, y, p, sc }; });
      const m = { tp: 0, fp: 0, fn: 0, tn: 0, unsure: 0 };
      preds.forEach(r => { if (r.p === -1) m.unsure++; else if (r.y === 0 && r.p === 0) m.tp++; else if (r.y === 1 && r.p === 0) m.fp++; else if (r.y === 0 && r.p === 1) m.fn++; else m.tn++; });
      const acc = (m.tp + m.tn) / TEST.length, prec = m.tp / Math.max(1, m.tp + m.fp), rec = m.tp / Math.max(1, m.tp + m.fn + preds.filter(r => r.y === 0 && r.p === -1).length), f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
      const happyRight = m.tn / Math.max(1, TEST.filter(t => t[1] === 1).length), week = 0.9 * happyRight + 0.1 * rec;
      return { preds, weight, acc, f1, rec, m, week };
    }
    function draw() {
      R = train();
      WORDS.forEach((w, j) => { const wt = R.weight(w), B = wbars[j], h = Math.max(0.01, Math.min(0.75, Math.abs(wt) * 0.28)); B.b.scale.y = h; B.b.position.set(B.x, 0.12 + 0.95 - (wt < 0 ? h : 0), WZ + 0.04); B.m.color.set(wt >= 0 ? C.teal : C.red); B.b.visible = !(w === 'NOT_good' && !st.neg); });
      const neg = TEST.filter(t => t[1] === 0).length, caught = R.preds.filter(r => r.y === 0 && r.p === 0).length;
      trT.userData.set(`unhappy reviews caught: ${caught} of ${neg}${R.m.unsure ? ` · ${R.m.unsure} undecided` : ''}`);
    }
    draw();
    function update(dt) {
      st.clock += dt; const per = S.reduced ? 1.2 : 2.6, k = Math.floor(st.clock / per) % TEST.length, ph = (st.clock % per) / per, r = R.preds[k];
      card.userData.set(`"${r.s}"`); const side = r.p === 1 ? -1 : r.p === 0 ? 1 : 0;
      const tilt = side * 0.18 * Math.min(1, ph * 3); beam.rotation.z = -tilt;
      panL.position.set(SX - 0.7, 0.95 - 0.35 + Math.sin(tilt) * 0.7, 0.1); panR.position.set(SX + 0.7, 0.95 - 0.35 - Math.sin(tilt) * 0.7, 0.1);
      hT.position.set(SX - 0.7, panL.position.y + 0.2, 0.1); uT.position.set(SX + 0.7, panR.position.y + 0.2, 0.1);
      card.position.set(SX + side * 0.7 * Math.min(1, ph * 2), 1.45 - Math.max(0, ph - 0.5) * 0.6, 0.1);
    }
    const controls = [
      { type: 'toggle', label: 'Handle negation ("not good" → not_good)', short: 'negation', get: () => st.neg, set: v => { st.neg = v; draw(); } },
      { type: 'toggle', label: 'Add-one smoothing', short: 'smoothing', get: () => st.smooth, set: v => { st.smooth = v; draw(); } },
      { type: 'toggle', label: 'Train on 90% happy reviews', short: 'skewed data', get: () => st.skew, set: v => { st.skew = v; draw(); } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Accuracy', get: () => ({ v: pct(R.week), sub: 'on a typical week, 9 in 10 happy' }) },
      { label: 'F1, unhappy class', get: () => ({ v: R.f1.toFixed(2), sub: 'the class that matters', good: R.f1 > 0.85, bad: R.f1 < 0.6 }) },
      { label: 'Unhappy caught', get: () => ({ v: pct(R.rec), sub: 'recall', good: R.rec > 0.85, bad: R.rec < 0.6 }) },
    ];
    const labels = [
      { name: 'weights', t: 'Word weights', d: 'Learned from 28 reviews', icon: 'scale', atV: V(WX - 2.1, 0.12 + 1.0, WZ) },
      { name: 'scale', t: 'The verdict', d: 'Sum of the words\' weights', icon: 'target', atV: V(SX + 0.95, 0.8, 0.1) },
      { name: 'tray', t: 'Unhappy reviews caught', d: 'The ones a manager must read', icon: 'check', atV: V(SX + 0.95, 0.2, 1.0) },
    ];
    const reset = () => { Object.assign(st, { neg: true, smooth: true, skew: false }); draw(); };
    const breaks = [
      { label: 'No negation handling', hint: '"not good" counts as good', on: () => { reset(); st.neg = false; draw(); }, off: reset },
      { label: 'No smoothing', hint: 'Unseen words get zero probability', on: () => { reset(); st.smooth = false; draw(); }, off: reset },
      { label: 'Skewed training data', hint: '90% happy reviews', on: () => { reset(); st.skew = true; draw(); }, off: reset },
    ];
    function status() {
      if (!st.smooth) return { ok: false, msg: `<b>One new word wipes out a review.</b> Without smoothing, a word never seen with a class gets probability zero there, and one zero makes the whole product zero. "Kelewele" and "amazing" never appeared in training, so those reviews score zero for both classes and are left undecided (${R.m.unsure} of 8). Adding one to every count keeps unseen words harmless.` };
      if (st.skew) return { ok: false, msg: `<b>High accuracy, missed complaints.</b> Trained on nine happy reviews for every unhappy one, the model leans towards "happy" and catches only ${pct(R.rec)} of the unhappy test reviews, yet on a typical week, where nine reviews in ten are happy, its accuracy would still be ${pct(R.week)}. The unhappy class is the one a manager needs; its F1 of ${R.f1.toFixed(2)} tells the truth.` };
      if (!st.neg) return { ok: false, msg: `<b>"Not good" reads as good.</b> Without negation handling, "not good, not fresh" is just "good" and "fresh" plus a "not", and the positive words win. Marking words after "not" (not_good, not_fresh) gives them their own, negative weights: F1 for unhappy reviews ${R.f1.toFixed(2)}.` };
      return { ok: true, msg: `<b>${pct(R.acc)} of the test reviews right, complaints caught.</b> Negations become their own words, smoothing keeps unseen words like "kelewele" harmless, and the training set is balanced: the unhappy class scores F1 ${R.f1.toFixed(2)}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Happy or not', home: true, say: 'Reviews of a waakye spot in Accra. The owner wants every unhappy review flagged.', act: m => m.set({ neg: true, smooth: true, skew: false }), wait: 3 },
    { t: 'Word weights', home: true, say: 'Naive Bayes counts how often each word appears in happy and unhappy reviews. Green words lean happy, red words unhappy. A review\'s verdict is the sum.', act: m => m.set({}), wait: 3 },
    { t: 'Not good', home: true, say: 'Without negation handling, "not good, not fresh" is just "good" and "fresh". It comes out happy.', act: m => m.set({ neg: false }), wait: 4 },
    { t: 'Mark the negation', home: true, say: 'Mark every word after "not" as a new word, not good, and it gets its own, red weight.', act: m => m.set({ neg: true }), wait: 3 },
    { t: 'Unseen words', home: true, say: 'Without smoothing, a word never seen in training, like kelewele, gets probability zero, and wipes out the whole review.', act: m => m.set({ smooth: false }), wait: 4 },
    { t: 'Accuracy lies', home: true, say: 'Train on mostly happy reviews, and the model says happy almost every time. Accuracy still looks fine; the score for the unhappy class does not.', act: m => m.set({ smooth: true, skew: true }), wait: 4 },
  ],
  check: [
    { q: 'How does Naive Bayes score a review?', options: ['By adding the log probabilities of its words under each class', 'By reading it like a person', 'By its length'], answer: 0, why: 'Words are treated as independent.' },
    { q: 'Why add one to every count (smoothing)?', options: ['So an unseen word does not get probability zero and wipe out the review', 'To make reviews longer', 'To remove stopwords'], answer: 0, why: 'One zero would make the whole product zero.' },
    { q: 'Why can accuracy be misleading here?', options: ['With mostly happy reviews, saying "happy" always still scores high', 'Accuracy is always wrong', 'It ignores happy reviews'], answer: 0, why: 'Per-class F1 shows missed complaints.' },
  ],
  terms: [
    ['Sentiment analysis', 'Labelling text as positive, negative or neutral.'],
    ['Naive Bayes', 'A classifier that multiplies word probabilities, assuming independence.'],
    ['Laplace smoothing', 'Adding one to every count so nothing has probability zero.'],
    ['Negation scope', 'The words a "not" applies to.'],
    ['Precision and recall', 'Share of flagged items that are right; share of right items flagged.'],
    ['F1 score', 'The balance of precision and recall.'],
  ],
  deeper: '<p><b>When to reach for more.</b> Sarcasm ("great, another hour waiting") and mixed reviews defeat word counting; transformer models read words in context and handle these far better.</p><p><b>Logistic regression</b> on the same features learns weights directly by gradient descent and often beats Naive Bayes when there is enough data.</p><p><b>About this machine.</b> The classifier really trains on the 28 reviews shown; the weights, verdicts and scores are computed live.</p>',
  code: {
    title: 'Naive Bayes with negation and smoothing',
    note: 'Adapted from the course\'s sentiment analysis lesson.',
    text: `
import math, re
from collections import Counter

def negate(words):
    out, neg = [], False
    for w in words:
        if w in ("not", "never"):
            neg = True; out.append(w); continue
        out.append("NOT_" + w if neg else w)
    return out

def train(data, alpha=1.0):
    counts, totals, docs = [Counter(), Counter()], [0, 0], [0, 0]
    for text, y in data:
        ws = negate(re.findall(r"[a-z]+", text.lower()))
        counts[y].update(ws); totals[y] += len(ws); docs[y] += 1
    vocab = set(counts[0]) | set(counts[1])
    def logp(w, y):
        return math.log((counts[y][w] + alpha) / (totals[y] + alpha * len(vocab)))
    return logp, docs
`,
  },
};
