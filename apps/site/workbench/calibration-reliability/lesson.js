// Perplexity and calibration (phase 19, lesson 73): an invented question-answering model reports a confidence with every answer. The model
// is overconfident: its reported confidence is a logistic of the true logit multiplied by 1.8. Temperature scaling divides the logit by T,
// and T fitted on held-out data near 1.8 restores calibration. The reliability diagram bins N predictions by confidence and compares each
// bin's mean confidence with its accuracy; ECE is their bin-weighted gap and Brier the mean squared error. Correctness for each prediction
// is drawn from a fixed pseudo-random stream, so small samples are noisy exactly as they would be. Perplexity is shown beside it, with the
// classic sign bug.
const A = 1.8, PPL = 11.4;
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
function invPhi(p) { let lo = -6, hi = 6; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
const sig = x => 1 / (1 + Math.exp(-x));
const Z = Array.from({ length: 5000 }, (_, i) => 0.6 + 1.3 * invPhi(Math.min(0.9999, Math.max(0.0001, rnd(i + 7)))));
const Y = Z.map((z, i) => rnd(i + 9001) < sig(z) ? 1 : 0);
function measure(o) {
  const bins = Array.from({ length: o.bins }, () => ({ n: 0, conf: 0, acc: 0 }));
  let brier = 0; const hi = { n: 0, conf: 0, acc: 0 };
  for (let i = 0; i < o.n; i++) {
    const c = sig(Z[i] * A / o.T), b = Math.min(o.bins - 1, Math.floor(c * o.bins));
    bins[b].n++; bins[b].conf += c; bins[b].acc += Y[i]; brier += (c - Y[i]) ** 2;
    if (c >= 0.9) { hi.n++; hi.conf += c; hi.acc += Y[i]; }
  }
  let ece = 0, used = 0;
  bins.forEach(b => { if (b.n) { b.conf /= b.n; b.acc /= b.n; ece += b.n / o.n * Math.abs(b.conf - b.acc); used++; } });
  const meanConf = bins.reduce((a, b) => a + b.conf * b.n, 0) / o.n, acc = Y.slice(0, o.n).reduce((a, b) => a + b, 0) / o.n;
  if (hi.n) { hi.conf /= hi.n; hi.acc /= hi.n; }
  return { hi, bins, ece, brier: brier / o.n, used, meanConf, acc, ppl: o.sign ? PPL : 1 / PPL };
}

export default {
  slug: 'calibration-reliability',
  title: 'Calibration: does 90% confident mean 90% right?',
  description: 'A question-answering model reports a confidence with every answer, and it is overconfident.',
  overview: 'Accuracy says how often a model is right. Calibration says whether it knows when it is right: of all the answers it gives with 90% confidence, about 90% should be correct. Calibration matters whenever a confidence is used to decide something, such as when to abstain, when to ask a human or how to combine models. Large language models tuned for chat are often overconfident. The standard picture is a reliability diagram: sort predictions into bins by confidence, usually ten equal bins, and plot each bin\'s accuracy against its mean confidence; a calibrated model sits on the diagonal. Expected calibration error (ECE) is the average gap between confidence and accuracy across bins, weighted by how many predictions fall in each. ECE depends on the number of bins and needs plenty of data: with a hundred predictions, a small ECE cannot be told apart from noise, so report how many bins were populated. The Brier score, the mean squared difference between confidence and the 0 or 1 outcome, needs no bins and rewards both calibration and sharpness. The simplest fix is temperature scaling (Guo and colleagues, 2017): divide the model\'s logits by a single number T, fitted on held-out data, which leaves the ranking of answers unchanged while stretching or shrinking confidence. Perplexity is the other basic score: the exponential of the average negative log-likelihood per token, where lower is better, one is perfect and the vocabulary size means the model learned nothing. A classic bug is an adapter that returns log p instead of minus log p, which gives a perplexity below one, an impossible value a harness should reject. This machine scores an invented model that answers farming-advice questions for an extension service in Tamale.',
  keywords: ['calibration', 'expected calibration error', 'reliability diagram', 'Brier score', 'temperature scaling', 'perplexity', 'LLM evaluation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { T: 1.8, n: 3000, bins: 10, sign: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const X0 = -2.55, W = 2.9, ZB = 0.42, H = 1.25;
    const X = c => X0 + c * W, Zf = a => ZB - a * H;
    floor.add(P.tube([V(X(0), 0.16, Zf(0)), V(X(1), 0.16, Zf(1))], 0.008, CHAR, { straight: true }));


    const NS = [100, 300, 1000, 3000, 5000];
    let bars = [];
    // the score corner: an ECE tower, a Brier tower, a stack of scored answers, and a lamp for the sign of the loss
    const scoreT = [0, 1].map(k => { const t = P.tower(0.4, 0.4, GOOD, { h: 0.5 }); t.userData.set({ cap: '' }); t.position.set(1.05 + k * 0.62, 0.12, -0.35); floor.add(t); return t; });
    const answers = new THREE.Group(); answers.position.set(2.35, 0.12, -0.35); floor.add(answers);
    const signLamp = P.lamp(GOOD, { h: 0.42, r: 0.11 }); signLamp.position.set(2.85, 0.12, 0.25); floor.add(signLamp);



    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = measure(st);
      bars.forEach(b => b.parent.remove(b)); bars = [];
      const bw = W / st.bins;
      R.bins.forEach((b, i) => {
        if (!b.n) return;
        const gap = b.conf - b.acc, len = Math.max(0.01, b.acc * H);
        const bar = P.box(bw * 0.8, 0.04, len, '#fff', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: Math.abs(gap) > 0.05 ? (gap > 0 ? BAD : SAF) : GOOD }) });
        bar.position.set(X((i + 0.5) / st.bins), 0.13, ZB - len / 2); bar.userData.noFit = true; floor.add(bar); bars.push(bar);
        const dot = P.ball(0.03, CHAR); dot.position.set(X(b.conf), 0.18, Zf(b.conf)); dot.userData.noFit = true; floor.add(dot); bars.push(dot);
      });
      scoreT[0].userData.set({ h: Math.min(1.3, 0.08 + R.ece * 10), color: R.ece < 0.03 ? GOOD : R.ece < 0.06 ? SAF : BAD });
      scoreT[1].userData.set({ h: Math.min(1.3, 0.08 + R.brier * 4), color: Math.abs(st.T - A) <= 0.3 ? GOOD : BAD });
      answers.clear(); const k = NS.indexOf(st.n) + 1;
      for (let j = 0; j < k; j++) { const c = P.box(0.38, 0.12, 0.38, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: st.n >= 1000 ? GOOD : SAF }) }); c.position.y = j * 0.14; answers.add(c); }
      signLamp.userData.set({ color: st.sign ? GOOD : BAD, on: true });


    }
    function isOk() { return Math.abs(st.T - A) <= 0.3 && st.n >= 1000 && st.sign; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Temperature T', min: 0.6, max: 3, step: 0.05, get: () => st.T, set: v => set({ T: +v }), fmt: v => (+v).toFixed(2) },
      { type: 'slider', label: 'Answers scored', min: 0, max: 4, step: 1, get: () => NS.indexOf(st.n), set: v => set({ n: NS[+v] }), fmt: v => `${NS[+v]}` },
      { type: 'toggle', label: 'Adapter returns minus log p', short: 'Sign', get: () => st.sign, set: v => set({ sign: !!v }) },
      { type: 'buttons', label: 'Bins', options: ['5', '10', '15'], get: () => [5, 10, 15].indexOf(st.bins), act: i => set({ bins: [5, 10, 15][i] }) },
    ];
    const readouts = [
      { label: 'ECE', get: () => ({ v: R.ece.toFixed(3), sub: `${R.used} bins used`, good: R.ece < 0.03, bad: R.ece >= 0.06 }) },
      { label: 'Brier', get: () => ({ v: R.brier.toFixed(3), sub: 'lower is better', good: Math.abs(st.T - A) <= 0.3, bad: Math.abs(st.T - A) > 0.3 }) },
      { label: 'Perplexity', get: () => ({ v: R.ppl < 1 ? R.ppl.toFixed(3) : R.ppl.toFixed(1), sub: 'must be at least 1', good: R.ppl >= 1, bad: R.ppl < 1 }) },
    ];
    const labels = [
      { name: 'r', t: 'Reliability diagram', d: 'Accuracy against confidence', icon: 'wave', atV: V(-2.0, 0.15, -0.15) },
      { name: 't', t: 'Calibration scores', d: 'Towers: ECE and Brier, short is good. Stack: answers scored. Lamp: red if the loss sign is wrong', icon: 'target', atV: V(1.25, 0.5, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip temperature scaling', hint: 'raw confidence', on: () => set({ ...D0, T: 1 }), off: reset },
      { label: 'Judge from a hundred answers', hint: 'noise', on: () => set({ ...D0, n: 100 }), off: reset },
      { label: 'Drop the minus sign', hint: 'log p, not minus log p', on: () => set({ ...D0, sign: false }), off: reset },
    ];
    function status() {
      const r = R, mc = Math.round(r.meanConf * 100), ac = Math.round(r.acc * 100);
      if (!st.sign) return { ok: false, msg: `<b>Perplexity came out as ${r.ppl.toFixed(3)}, below one, which is impossible: the adapter returned log p instead of minus log p.</b> Assert that every negative log-likelihood is at least zero, and reject the run when it is not.` };
      if (st.T < A - 0.3) return { ok: false, msg: `<b>${st.T <= 1.01 ? 'Without temperature scaling' : `At T ${st.T.toFixed(2)}`}, on the ${r.hi.n} answers given with 90% confidence or more, the model claims ${Math.round(r.hi.conf * 100)}% on average but is right ${Math.round(r.hi.acc * 100)}% of the time: ECE ${r.ece.toFixed(3)}.</b> Fit T on held-out answers; here it comes out near ${A}.` };
      if (st.T > A + 0.3) return { ok: false, msg: `<b>At T ${st.T.toFixed(2)} the confidences are squashed towards the middle: mean ${mc}% against accuracy ${ac}%, ECE ${r.ece.toFixed(3)}, and now the model is underconfident.</b> Fit T on held-out data rather than guessing.` };
      if (st.n < 1000) return { ok: false, msg: `<b>With only ${st.n} answers, ECE reads ${r.ece.toFixed(3)}, but several bins hold a handful of answers each, so the number is mostly noise.</b> Score at least a thousand answers, and report how many bins were populated.` };
      return { ok: true, msg: `<b>With T ${st.T.toFixed(2)}, fitted on held-out answers, mean confidence ${mc}% matches accuracy ${ac}%: ECE ${r.ece.toFixed(3)} over ${r.used} bins, Brier ${r.brier.toFixed(3)}.</b> The ranking of answers is unchanged; only the confidences now mean what they say. Perplexity ${r.ppl.toFixed(1)} is a sane value.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Confident answers', home: true, say: 'A model answers farming questions and reports a confidence with each answer.', act: m => m.set({ T: 1, n: 3000, bins: 10, sign: true }) },
    { t: 'Reliability diagram', home: true, say: 'Bin answers by confidence and measure each bin\'s accuracy. A calibrated model sits on the diagonal.', act: m => m.set({ T: 1, n: 3000, bins: 10, sign: true }) },
    { t: 'Overconfident', home: true, say: 'This model falls short in the high bins: it says ninety percent and is right far less often.', act: m => m.set({ T: 1, n: 3000, bins: 10, sign: true }) },
    { t: 'Temperature scaling', home: true, say: 'Divide the logits by one number, fitted on held-out answers. The bars meet the diagonal.', act: m => m.set({ T: 1.8, n: 3000, bins: 10, sign: true }) },
    { t: 'Enough answers', home: true, say: 'With a hundred answers, the error is mostly noise. Score thousands.', act: m => m.set({ T: 1.8, n: 100, bins: 10, sign: true }) },
    { t: 'Check the sign', home: true, say: 'Perplexity must be at least one. A missing minus sign makes it impossible, and the harness should say so.', act: m => m.set({ T: 1.8, n: 3000, bins: 10, sign: true }) },
  ],
  check: [
    { q: 'What does a calibrated model\'s reliability diagram look like?', options: ['Bars meet the diagonal', 'All bars equal', 'Bars at 100%'], answer: 0, why: 'Accuracy equals confidence in each bin.', hint: 'Move the temperature.' },
    { q: 'What does temperature scaling change?', options: ['Confidences, not the ranking of answers', 'Which answer is chosen', 'The training data'], answer: 0, why: 'One number divides the logits.', hint: 'Try Skip temperature scaling.' },
    { q: 'What does a perplexity below one tell you?', options: ['A bug, such as a missing minus sign', 'A perfect model', 'Overfitting'], answer: 0, why: 'One is the minimum.', hint: 'Try Drop the minus sign.' },
  ],
  terms: [
    ['Calibration', 'Confidence that matches how often the model is right.'],
    ['Reliability diagram', 'Accuracy plotted against confidence, bin by bin.'],
    ['ECE', 'Expected calibration error: the bin-weighted gap between confidence and accuracy.'],
    ['Brier score', 'Mean squared difference between confidence and outcome.'],
    ['Temperature scaling', 'Dividing logits by one fitted number to recalibrate.'],
    ['Perplexity', 'The exponential of average negative log-likelihood per token.'],
  ],
  deeper: '<p><b>Where confidence comes from.</b> For multiple choice, use the softmax over option likelihoods; for free text, a self-reported probability or the average token likelihood. Each calibrates differently.</p><p><b>Bins.</b> ECE changes with the bin count; adaptive bins with equal counts reduce the noise.</p><p><b>About this machine.</b> The model and its overconfidence factor are invented for illustration.</p>',
  code: {
    title: 'ECE, Brier and perplexity',
    note: 'Written for this lesson.',
    text: `
import math, numpy as np

def ece(conf, correct, bins=10):
    conf, correct = np.asarray(conf), np.asarray(correct)
    idx = np.minimum((conf * bins).astype(int), bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            total += m.mean() * abs(conf[m].mean() - correct[m].mean())
    return total

def brier(conf, correct):
    return float(np.mean((np.asarray(conf) - np.asarray(correct)) ** 2))

def perplexity(neg_log_probs, n_tokens):
    assert all(x >= 0 for x in neg_log_probs), "adapter returned log p, not -log p"
    return math.exp(sum(neg_log_probs) / n_tokens)
`,
  },
};
