// Evaluation: a pharmacy chain (invented) with branches in Dar es Salaam, Kano and Kumasi picks one of four models for its stock assistant.
// Left: a public multiple-choice benchmark, saturated (all four within a few points; the reported pattern, constants here), optionally contaminated for model A.
// Middle: the chain's own eval, N questions with known answers, each scored by exact match; every answer is sampled for real from each model's true
// accuracy on the task, with a 95% interval. Right: an arena, V pairwise votes between random pairs, the winner drawn with Bradley-Terry odds from true
// accuracy, ratings fitted to all votes at once (Bradley-Terry, as arenas do) and shown on the Elo scale. Break it: benchmark seen in training, only ten test questions, only twenty arena votes.
const MOD = [['A', '405B', '#1F9E89'], ['B', '70B', '#E07B39'], ['C', '8B', '#7E57C2'], ['D', '34B', '#C9A227']];
const TRUE = [0.68, 0.81, 0.74, 0.58], BENCH = [0.874, 0.868, 0.881, 0.862], NS = [10, 50, 200], VS = [20, 200, 2000];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function run(st) {
  const bench = BENCH.map((b, i) => (st.leak && i === 0 ? 0.951 : b));
  const r1 = rng(11 + st.seed * 97), N = NS[st.n];
  const ev = TRUE.map(q => { let k = 0; for (let j = 0; j < N; j++) if (r1() < q) k++; const p = k / N; return { p, ci: 1.96 * Math.sqrt(Math.max(p * (1 - p), 0.25 / N) / N) }; });
  const r2 = rng(5 + st.seed * 31), votes = [];
  for (let v = 0; v < VS[st.v]; v++) {
    const a = Math.floor(r2() * 4); let b = Math.floor(r2() * 3); if (b >= a) b++;
    votes.push(r2() < 1 / (1 + Math.exp(-5 * (TRUE[a] - TRUE[b]))) ? [a, b] : [b, a]);
  }
  /* fit all votes at once (Bradley-Terry, a weak pull to 1500), then show on the Elo scale */
  const s = [0, 0, 0, 0];
  for (let it = 0; it < 300; it++) for (let i = 0; i < 4; i++) {
    let g = -0.5 * s[i], h = 0.5;
    votes.forEach(([w, l]) => { if (w !== i && l !== i) return; const o = w === i ? l : w, p = 1 / (1 + Math.exp(s[o] - s[i])); g += (w === i ? 1 : 0) - p; h += p * (1 - p); });
    s[i] += g / h;
  }
  const elo = s.map(x => 1500 + x * 400 / Math.LN10);
  const top = xs => xs.indexOf(Math.max(...xs));
  return { bench, ev, elo, tb: top(bench), te: top(ev.map(e => e.p)), ta: top(elo) };
}

export default {
  slug: 'evaluation',
  title: 'Evaluation: test it on your own task',
  description: 'A pharmacy chain with branches in Dar es Salaam, Kano and Kumasi must choose one of four models. A public benchmark, its own eval and an arena can disagree.',
  overview: 'A benchmark is a fixed test everyone runs, so scores can be compared across models. Three things wear benchmarks out. Contamination: the questions sit on the web, the web goes into training, and a model can score well because it has seen the answers. Teaching to the test: training mixes are tuned to the benchmark\'s format. Saturation: once every strong model scores within a few points, the gaps are noise, often the few questions that are ambiguous or wrongly marked. Perplexity, how surprised a model is by text on average, is a quick health check but says nothing about following instructions. The evaluation that predicts how a model will do for you is a custom eval: define the task precisely, collect real inputs with known answers (at least fifty for a first look, a few hundred for decisions), choose a score that fits (exact match for structured answers, overlap scores for summaries, a rubric-driven LLM judge for open text), run it with one command and track it over time. Every score from a sample has an error bar of roughly one over the square root of the number of questions, so a ten-question test cannot separate models a few points apart. For open-ended answers, pairwise votes work well: show two answers to the same prompt, ask which is better, and update Elo ratings as chess does. Thousands of votes settle into a stable order; a handful mostly reflect luck.',
  keywords: ['llm evaluation', 'benchmarks', 'data contamination', 'benchmark saturation', 'custom evals', 'elo rating', 'chatbot arena', 'confidence interval', 'lm-evaluation-harness'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.1], dir: [0.05, 0.95, 1.2], half: 1.6, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { leak: false, n: 2, v: 2, seed: 0 };
    const ink = '#151827';
    const BX = [-2.05, 0, 2.05], OFF = [-0.57, -0.19, 0.19, 0.57], BZ = -0.8;
    const boards = ['Public benchmark', 'Your own eval', 'Arena of votes'].map((n, k) => {
      const b = P.box(1.85, 0.05, 1.0, '#FBF8F1', { r: 0.03 }); b.position.set(BX[k], 0.12, -0.75); floor.add(b);
      return {};
    });
    /* four bars per board, one colour per model on every board */
    const bars = BX.map(bx => MOD.map(([n, sz, c], i) => {
      const x = bx + OFF[i], b = P.box(0.24, 1, 0.24, c, { r: 0.02 }); b.position.set(x, 0.15, BZ); b.userData.noFit = true; floor.add(b);
      return { b, x };
    }));
    /* error bars on your own eval: a whisker in front of each bar */
    const whisk = MOD.map((m, i) => { const w = P.box(0.03, 1, 0.03, ink, { r: 0 }); w.userData.noFit = true; floor.add(w);
      const caps = [0, 1].map(() => { const c = P.box(0.12, 0.02, 0.03, ink, { r: 0 }); c.userData.noFit = true; floor.add(c); return c; }); return { w, caps, x: BX[1] + OFF[i] }; });
    /* the saturated band on the benchmark */
    const band = P.box(1.6, 0.02, 0.02, '#C62828', { r: 0 }); band.position.set(BX[0], 0.15 + 0.06 + 0.9 * 1.0, BZ - 0.14); band.userData.noFit = true; floor.add(band);
    const keep = P.box(6.0, 1.15, 2.4, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.05); floor.add(keep);

    let R = null;
    const H = 0.62, hOf = v => 0.04 + Math.max(0, v) * H;
    function draw() {
      R = run(st);
      R.bench.forEach((p, i) => { const B = bars[0][i]; B.b.scale.y = hOf(p);  });
      R.ev.forEach((e, i) => { const B = bars[1][i]; B.b.scale.y = hOf(e.p);
        const lo = 0.15 + hOf(Math.max(0, e.p - e.ci)), hi = 0.15 + hOf(Math.min(1, e.p + e.ci)), W = whisk[i], z = BZ + 0.15;
        W.w.scale.y = hi - lo; W.w.position.set(W.x, lo, z); W.caps[0].position.set(W.x, lo, z); W.caps[1].position.set(W.x, hi - 0.02, z); });
      R.elo.forEach((e, i) => { const B = bars[2][i]; B.b.scale.y = hOf((e - 1300) / 450);  });
      band.position.y = 0.15 + hOf(0.86);
      const spread = (Math.max(...R.bench) - Math.min(...R.bench)) * 100;






    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Benchmark questions', options: ['Never seen', 'Seen by A'], get: () => +st.leak, act: i => { st.leak = !!i; draw(); } },
      { type: 'buttons', label: 'Your test questions', options: NS.map(String), get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'Arena votes', options: VS.map(v => v.toLocaleString('en')), get: () => st.v, act: i => { st.v = i; draw(); } },
      { type: 'button', label: 'Run again with new samples', short: 'Rerun', act: () => { st.seed++; draw(); } },
    ];
    const readouts = [
      { label: 'Benchmark picks', get: () => ({ v: MOD[R.tb][0], sub: `${(R.bench[R.tb] * 100).toFixed(1)}% on the leaderboard`, bad: R.tb !== 1 && st.leak }) },
      { label: 'Your eval picks', get: () => ({ v: MOD[R.te][0], sub: `${Math.round(R.ev[R.te].p * 100)}% ± ${Math.round(R.ev[R.te].ci * 100)} on ${NS[st.n]} questions`, good: R.te === 1 && st.n === 2, bad: R.te !== 1 }) },
      { label: 'Arena picks', get: () => ({ v: MOD[R.ta][0], sub: `Elo ${Math.round(R.elo[R.ta])} after ${VS[st.v].toLocaleString('en')} votes`, good: R.ta === 1 && st.v === 2, bad: R.ta !== 1 }) },
    ];
    const labels = [
      { name: 'bench', t: 'Public benchmark', d: 'Everyone runs it; strong models bunch up', icon: 'target', atV: V(-2.5, 0.1, -0.8) },
      { name: 'arena', t: 'Arena of votes', d: 'Which answer is better? Elo turns votes into ratings', icon: 'scale', atV: V(2.5, 0.1, -0.8) },
    ];
    const reset = () => { Object.assign(st, { leak: false, n: 2, v: 2, seed: 0 }); draw(); };
    const breaks = [
      { label: 'Benchmark seen in training', hint: 'A\'s training data held the questions', on: () => { reset(); st.leak = true; draw(); }, off: reset },
      { label: 'Only ten test questions', hint: 'a quick check, not an eval', on: () => { reset(); st.n = 0; draw(); }, off: reset },
      { label: 'Only twenty arena votes', hint: 'ratings have barely moved', on: () => { reset(); st.v = 0; st.seed = 1; draw(); }, off: reset },
    ];
    function status() {
      const e = R.ev, pc = v => Math.round(v * 100);
      if (st.leak) return { ok: false, msg: `<b>The leaderboard now picks A at ${(R.bench[0] * 100).toFixed(1)}%, but A gets only ${pc(e[0].p)}% of your stock questions right.</b> A saw the benchmark\'s questions on the web during training, so its score measures memory, not skill. Your own eval, on questions it has never seen, still ranks B first at ${pc(e[1].p)}%.` };
      if (st.n === 0) return { ok: R.te === 1 ? undefined : false, msg: `<b>${R.te === 1 ? 'B is first this time, but only by luck' : `${MOD[R.te][0]} is ranked first at ${pc(e[R.te].p)}%, B has ${pc(e[1].p)}%`}: the error bars are ±${pc(Math.max(...e.map(x => x.ci)))} points.</b> With ten questions every score can move a whole grade from one run to the next, so the bars overlap and the order is chance. Press Rerun to see it change. Use at least fifty questions to compare, a few hundred to decide.` };
      if (st.v === 0) return { ok: R.ta === 1 ? undefined : false, msg: `<b>After twenty votes the arena ranks ${MOD[R.ta][0]} first; ratings run from ${Math.round(Math.min(...R.elo))} to ${Math.round(Math.max(...R.elo))} on very little evidence.</b> Each model has been in about ten matches, and even the better model loses a third of them, so the order is mostly which pairs happened to meet and how those few votes fell. Thousands of votes settle it.` };
      return { ok: R.te === 1 && R.ta === 1, msg: `<b>Your eval picks B: ${pc(e[1].p)}% ± ${pc(e[1].ci)} on ${NS[st.n]} questions, against ${pc(e[2].p)}% for C.</b> The leaderboard has all four within ${((Math.max(...R.bench) - Math.min(...R.bench)) * 100).toFixed(1)} points, too close to mean anything: it is saturated. ${VS[st.v].toLocaleString('en')} arena votes agree with your eval, ${MOD[R.ta][0]} first at ${Math.round(R.elo[R.ta])}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Which model?', home: true, say: 'A pharmacy chain with branches in Dar es Salaam, Kano and Kumasi must choose one of four models to answer its staff\'s stock questions.', act: m => m.set({ leak: false, n: 2, v: 2, seed: 0 }) },
    { t: 'The leaderboard', focus: [-2.05, 0.5, -0.1], zoom: 1.6, say: 'On a famous public benchmark, all four score within two points of each other. The test is saturated: it can no longer tell them apart.', act: m => m.set({}) },
    { t: 'Your own questions', focus: [0, 0.5, -0.1], zoom: 1.6, say: 'So the chain writes two hundred real questions with known answers, and checks each reply exactly. Now the models spread out, and a thin black line on each bar shows how uncertain its score is.', act: m => m.set({}) },
    { t: 'Seen in training', home: true, say: 'If one model saw the benchmark questions during training, its leaderboard score jumps. Its score on your questions does not move.', act: m => m.set({ leak: true }) },
    { t: 'Ten questions', home: true, say: 'Test with only ten questions, and the error bars are so wide that the order is down to luck.', act: m => m.set({ leak: false, n: 0 }) },
    { t: 'Votes in an arena', focus: [2.05, 0.5, -0.1], zoom: 1.6, say: 'For open answers, show people two replies and ask which is better. After thousands of votes, the ratings agree with your own test.', act: m => m.set({ n: 2, v: 2 }) },
  ],
  check: [
    { q: 'Four strong models score within two points on a public benchmark. What does that tell you?', options: ['Very little: the benchmark is saturated and the gaps are noise', 'The highest scorer is best for your task', 'All four are equally good at everything'], answer: 0, why: 'Near the ceiling, the remaining questions are often ambiguous or mislabelled.', hint: 'Think about what is left to separate them.' },
    { q: 'A model scores far higher on a benchmark than on your own questions. What is a likely cause?', options: ['The benchmark questions were in its training data', 'Your questions are too easy', 'Its error bars are too small'], answer: 0, why: 'Contamination: it remembers answers rather than working them out.', hint: 'Where do benchmark questions live?' },
    { q: 'Why is a ten-question eval not enough to choose between two models?', options: ['The error bars are so wide the order is down to chance', 'Ten questions cost too much', 'Exact match needs a hundred questions to run'], answer: 0, why: 'Uncertainty shrinks with the square root of the number of questions.', hint: 'Press Rerun with ten questions.' },
  ],
  terms: [
    ['Benchmark', 'A fixed public test that many models are run on, so their scores can be compared.'],
    ['Contamination', 'Benchmark questions leaking into training data, so the score measures memory rather than skill.'],
    ['Saturation', 'When the best models all score near the top and the gaps are noise.'],
    ['Custom eval', 'Your own test: real inputs from your task, known answers and a score that fits.'],
    ['Exact match', 'A score of one if the answer equals the expected one, zero otherwise; right for structured answers.'],
    ['Elo rating', 'A rating updated after each head-to-head vote, rising more for beating a stronger opponent.'],
  ],
  deeper: '<p><b>Tools.</b> EleutherAI\'s lm-evaluation-harness runs hundreds of public benchmarks against any open model with one command. RAGAS scores retrieval systems for faithfulness and relevance. promptfoo keeps a set of test cases in a file and reruns them on every prompt change, so a fix in one place does not break another.</p><p><b>Building your own.</b> Write the task precisely: not "answer questions", but "given a stock question from a branch, return the item and the count". Include awkward cases: empty input, misspellings, other languages (Swahili, Hausa and Twi questions here). Version the eval with the prompts and watch the trend, not one number.</p><p><b>Perplexity</b> is the exponential of the average surprise per token. It is handy for comparing checkpoints on the same text, and blind to instructions, reasoning and facts.</p><p><b>About this machine.</b> Benchmark scores are set to the reported pattern. Your eval samples every answer from each model\'s true accuracy on the task, and the arena plays every vote and Elo update for real.</p>',
  code: {
    title: 'Elo from pairwise votes',
    note: 'Adapted from the course\'s evaluation lesson.',
    text: `
def exact_match(prediction, expected):
    return 1.0 if prediction.strip().lower() == expected.strip().lower() else 0.0

class Elo:
    def __init__(self, k=32, start=1500):
        self.k, self.start, self.r = k, start, {}

    def expected(self, a, b):
        return 1 / (1 + 10 ** ((self.r[b] - self.r[a]) / 400))

    def vote(self, a, b, winner):
        for m in (a, b):
            self.r.setdefault(m, self.start)
        ea = self.expected(a, b)
        sa = 1.0 if winner == a else 0.0 if winner == b else 0.5
        self.r[a] += self.k * (sa - ea)          # surprise moves the rating
        self.r[b] -= self.k * (sa - ea)

# Arenas refit every rating to all votes at once (Bradley-Terry),
# which gives the same scale with steadier numbers.
`,
  },
};
