// Build it yourself: an LLM (after LLMs-from-scratch). The whole line for a Lomé market phrase set: tokens, sliding windows, a real bigram count model that trains on pairs, loss falling, and greedy against temperature sampling. Small enough to run live; the steps match what a transformer does at scale.
const TXT = 'the market opens early the market sells fish the market sells cloth the boats come early the boats sell fish'.split(' ');
const VOC = [...new Set(TXT)], IDX = Object.fromEntries(VOC.map((w, i) => [w, i]));
function train(o) { const V = VOC.length, N = VOC.map(() => VOC.map(() => o.smooth)), use = Math.floor(TXT.length * o.frac); for (let i = 0; i + 1 < use; i++) N[IDX[TXT[i]]][IDX[TXT[i + 1]]]++; const P = N.map(r => { const s = r.reduce((a, b) => a + b, 0) || 1; return r.map(x => x / s); }); let L = 0, c = 0; for (let i = 0; i + 1 < TXT.length; i++) { const p = P[IDX[TXT[i]]][IDX[TXT[i + 1]]]; L += p > 0 ? -Math.log(p) : 9; c++; } return { P, loss: L / c, pairs: use - 1, V }; }
function gen(P, o) { let s = 42 + o.seed, w = IDX.the; const out = ['the']; for (let i = 0; i < 7; i++) { const t = o.temp, row = P[w].map(p => (p > 0 ? p ** (1 / Math.max(0.05, t)) : 0)), sum = row.reduce((a, b) => a + b, 0); if (!sum) { out.push('?'); break; } s = (s * 16807) % 2147483647; let x = (s / 2147483647) * sum, k = 0; if (t < 0.11) k = row.indexOf(Math.max(...row)); else for (; k < row.length - 1; k++) { x -= row[k]; if (x < 0) break; } w = k; out.push(VOC[k]); } return out.join(' '); }
function run(o) { const T = train(o); return { ...T, text: gen(T.P, o), rand: Math.log(T.V), top: T.P[IDX.market].map((p, i) => [p, VOC[i]]).sort((a, b) => b[0] - a[0]).slice(0, 5) }; }

export default {
  slug: 'build-an-llm',
  title: 'Build your own LLM, end to end',
  description: 'Tokens, pairs, training, loss, sampling. The whole line in one small model you can watch.',
  overview: 'A large language model has one job: given the text so far, say which token comes next. To see the whole line at once, build the smallest version. Split text into tokens. Slide along it to make pairs of input and target. Train by counting, or by gradient descent in a real model. Measure loss on the next token. Then generate by sampling from the model, one token at a time, feeding each back in. Temperature controls how bold it is. A transformer swaps the table of counts for attention, and everything else stays the same. This real bigram model trains live on a few market phrases from Lomé.',
  keywords: ['LLM', 'bigram', 'tokens', 'temperature', 'sampling', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { frac: 1, temp: 0.7, smooth: 0.1, seed: 1 }, st = { ...D0 };
    const BLUE = '#5B8DB8', GOOD = '#1F9E89', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const T = Array.from({ length: 5 }, (_, i) => { const t = add(P.tower(0.46, 0.4, BLUE)); t.position.set(-1.9 + i * 0.6, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const L = add(P.tower(0.6, 0.4, SAF)), B = add(P.tower(0.6, 0.4, GOOD)); L.position.set(1.3, 0.03, -0.1); B.position.set(2.0, 0.03, -0.1); L.userData.set({ cap: '' }); B.userData.set({ cap: '' });
    S.add(P.keep(-2.3, 2.45, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); R.top.forEach((x, i) => T[i].userData.set({ h: Math.max(0.03, x[0] * 1.3), color: i ? BLUE : GOOD })); L.userData.set({ h: Math.max(0.03, R.loss * 0.35) }); B.userData.set({ h: R.rand * 0.35 }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Share of text used', min: 0.2, max: 1, step: 0.1, get: () => st.frac, set: v => set({ frac: v }) },
      { type: 'slider', label: 'Temperature', min: 0.1, max: 2, step: 0.1, get: () => st.temp, set: v => set({ temp: v }) },
      { type: 'slider', label: 'Smoothing', min: 0, max: 1, step: 0.1, get: () => st.smooth, set: v => set({ smooth: v }) },
      { type: 'buttons', label: 'Sample', options: ['One', 'Two', 'Three'], get: () => st.seed - 1, act: i => set({ seed: i + 1 }) },
    ];
    const readouts = [
      { label: 'Generated', get: () => ({ v: R.text }) },
      { label: 'Loss', get: () => ({ v: R.loss.toFixed(2), sub: `random is ${R.rand.toFixed(2)}`, good: R.loss < R.rand, bad: R.loss >= R.rand }) },
      { label: 'After "market"', get: () => ({ v: R.top.slice(0, 2).map(x => `${x[1]} ${Math.round(x[0] * 100)}%`).join(', ') }) },
    ];
    const labels = [
      { name: 't', t: 'Odds after "market"', d: 'Teal: the likeliest', icon: 'scale', atV: V(-2.15, 0.2, -0.1) },
      { name: 'l', t: 'Loss, then random', d: 'Lower is better', icon: 'target', atV: V(2.32, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Too little text', hint: 'unseen pairs', on: () => set({ ...D0, frac: 0.2, smooth: 0 }), off: reset },
      { label: 'Temperature too high', hint: 'word soup', on: () => set({ ...D0, temp: 2, smooth: 1 }), off: reset },
      { label: 'Always the likeliest', hint: 'it repeats itself', on: () => set({ ...D0, temp: 0.1 }), off: reset },
    ];
    function status() {
      if (st.frac < 0.4) return { ok: false, msg: `<b>Loss ${R.loss.toFixed(2)}.</b> Pairs it never saw get zero odds, so it can\'t continue past what it read.` };
      if (st.temp >= 1.6) return { ok: false, msg: '<b>Word soup.</b> High temperature flattens the odds, so unlikely words win.' };
      if (st.temp <= 0.1) return { ok: false, msg: '<b>It loops.</b> Always taking the likeliest word goes round the same phrase.' };
      return { ok: true, msg: `<b>Loss ${R.loss.toFixed(2)}, against ${R.rand.toFixed(2)} for random guessing.</b> A transformer replaces this table. The rest is the same.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One job', home: true, say: 'An LLM says which token comes next. Here are a few phrases from a market in Lomé.', act: m => m.set({ frac: 0.3, temp: 0.7, smooth: 0.1, seed: 1 }) },
    { t: 'Pairs', home: true, say: 'Slide along the text, and make input and target pairs.', act: m => m.set({ frac: 0.6, temp: 0.7, smooth: 0.1, seed: 1 }) },
    { t: 'Train', home: true, say: 'Learn the odds of what follows what. Loss falls below random guessing.', act: m => m.set({ frac: 1, temp: 0.7, smooth: 0.1, seed: 1 }) },
    { t: 'Generate', home: true, say: 'Pick a word, feed it back, and repeat.', act: m => m.set({ frac: 1, temp: 0.7, smooth: 0.1, seed: 2 }) },
    { t: 'Temperature', home: true, say: 'Low is safe and repetitive. High is bold, and then nonsense.', act: m => m.set({ frac: 1, temp: 2, smooth: 1, seed: 1 }) },
    { t: 'At scale', home: true, say: 'A transformer looks at the whole context, not one word. The line stays the same.', act: m => m.set({ frac: 1, temp: 0.7, smooth: 0.1, seed: 3 }) },
  ],
  check: [
    { q: 'What is an LLM\'s job?', options: ['Say what token comes next', 'Search the web', 'Store documents'], answer: 0, why: 'Everything follows from that.', hint: 'See One job.' },
    { q: 'What does loss measure here?', options: ['How surprised it is by the next word', 'Its speed', 'Its size'], answer: 0, why: 'Lower means better odds.', hint: 'See Train.' },
    { q: 'What does temperature change?', options: ['How bold sampling is', 'The training data', 'The vocabulary'], answer: 0, why: 'It sharpens or flattens the odds.', hint: 'See Temperature.' },
  ],
  terms: [['Token', 'One piece of text.'], ['Bigram', 'A pair of neighbouring tokens.'], ['Smoothing', 'Small odds for unseen pairs.'], ['Temperature', 'Sharpens or flattens odds.']],
  deeper: '<p><b>Real model.</b> This bigram table really trains, on a very small text.</p><p><b>The book.</b> Sebastian Raschka\'s repository builds a real GPT-style model step by step.</p>',
  credit: 'Built from <a href="https://github.com/rasbt/LLMs-from-scratch" target="_blank" rel="noopener">LLMs-from-scratch</a> by Sebastian Raschka (Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own small bigram model, written for this lesson.',
  code: {
    title: 'Train and generate',
    note: 'Our own short version.',
    text: `
for (let i = 0; i + 1 < tokens.length; i++)
  counts[tokens[i]][tokens[i + 1]]++;

let word = "the";
for (let i = 0; i < 8; i++) {
  word = sample(probabilities(counts[word], temperature));
  print(word);
}
`,
  },
};
