// Attention: the fix for the seq2seq bottleneck. Translating "the market near the lake opens early" into Swahili, the decoder no longer gets one squeezed vector:
// at every output word it scores every input word, turns the scores into weights with a softmax, and reads a weighted mix. The grid shows those weights
// (rows: Swahili words being written, columns: English words), brighter = more attention. Columns of pillars on the right show each row's weights summing to 1.
// Break it: no attention (every row the same flat average: back to the bottleneck), dot products not scaled by √d (scores so large the softmax picks one word and ignores the rest),
// softmax over the wrong axis (each input word's weights sum to 1 instead of each output word's, so some rows get almost nothing to read).
const EN = ['the', 'market', 'near', 'the', 'lake', 'opens', 'early'];
const SW = ['soko', 'karibu', 'na', 'ziwa', 'linafunguliwa', 'mapema'];
const ALIGN = [[1], [2], [2, 3], [4], [5], [6]];     // which English words each Swahili word comes from
const D = 16;

export default {
  slug: 'attention-mechanism',
  title: 'Attention: look back at every word',
  description: 'Translating "the market near the lake opens early" into Swahili, the decoder looks back at every word for each word it writes. A field of towers shows where.',
  overview: 'Attention lets each decoder step look back at all the encoder\'s states instead of one summary. The decoder\'s current state acts as a query; each encoder state offers a key and a value. A score for each pair (a dot product, or a small network) says how relevant that input word is right now; a softmax turns the scores into weights that sum to one; the weighted sum of values is what the decoder reads. The weight grid often looks like a word alignment, which made attention one of the first parts of a network people could inspect. Dot-product scores grow with vector size, so they are divided by √d to keep the softmax from saturating. Weights must be normalised over the input words for each output word. This is the step that became the transformer.',
  keywords: ['attention mechanism', 'bahdanau attention', 'scaled dot product', 'softmax attention weights', 'alignment matrix'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.25, -0.1], dir: [0.05, 1.0, 1.1], half: 1.1, wide: 5.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { attn: true, scale: true, axis: 'rows' };
    /* ---------- the weights as a field of towers: rows Swahili, columns English ---------- */
    const CS = 0.46, GX = -0.5, NC = EN.length, NR = SW.length;
    const pad = P.box(NC * CS + 0.16, 0.04, NR * CS + 0.16, '#E4DED2', { r: 0.03 }); pad.position.set(GX, 0, -0.3); S.add(pad);
    const gx = j => GX - NC * CS / 2 + (j + 0.5) * CS, gz = i => -0.3 - NR * CS / 2 + (i + 0.5) * CS;
    const cells = [];
    for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) { const c = P.tower(CS * 0.76, CS * 0.76, C.indigo, { h: 0.1 }); c.userData.set({ cap: '' }); c.position.set(gx(j), 0.04, gz(i)); S.add(c); cells.push(c); }
    /* ---------- row sums: pillars ---------- */
    const sums = SW.map((_, i) => { const t = P.tower(0.24, 0.24, C.teal, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(GX + NC * CS / 2 + 0.5, 0, gz(i)); S.add(t); return t; });
    S.add(P.keep(GX - NC * CS / 2 - 0.3, GX + NC * CS / 2 + 0.85, 1.0, -0.3 - NR * CS / 2 - 0.2, -0.3 + NR * CS / 2 + 0.2));
    /* ---------- maths: real dot-product attention on hand-built vectors ---------- */
    let s0 = 5; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
    const KEYS = EN.map(() => [...Array(D)].map(g));
    const QUERIES = ALIGN.map(src => { const q = Array(D).fill(0); src.forEach(j => KEYS[j].forEach((v, d) => { q[d] += v / src.length; })); return q.map(v => v * 0.6 + g() * 0.12); });
    let R = null;
    function weights() {
      const sc = QUERIES.map(q => KEYS.map(k => q.reduce((a, v, d) => a + v * k[d], 0) / (st.scale ? Math.sqrt(D) : 0.35)));
      if (!st.attn) return QUERIES.map(() => KEYS.map(() => 1 / NC));
      if (st.axis === 'rows') return sc.map(r => { const m = Math.max(...r), e = r.map(v => Math.exp(v - m)), s = e.reduce((a, v) => a + v, 0); return e.map(v => v / s); });
      const W = sc.map(r => r.slice());
      for (let j = 0; j < NC; j++) { const col = sc.map(r => r[j]), m = Math.max(...col), e = col.map(v => Math.exp(v - m)), s = e.reduce((a, v) => a + v, 0); e.forEach((v, i) => { W[i][j] = v / s; }); }
      return W;
    }
    function draw() {
      const W = weights();
      W.forEach((r, i) => r.forEach((w, j) => cells[i * NC + j].userData.set({ h: Math.max(0.02, w * 1.0), color: !st.attn ? '#9A9AA6' : C.indigo })));
      W.forEach((r, i) => { const s = r.reduce((a, v) => a + v, 0); sums[i].userData.set({ h: Math.max(0.02, s * 0.5), color: Math.abs(s - 1) < 0.02 ? C.teal : C.red }); });
      const peak = W.map(r => Math.max(...r)), correct = W.filter((r, i) => ALIGN[i].includes(r.indexOf(Math.max(...r)))).length;
      const rowSums = W.map(r => r.reduce((a, v) => a + v, 0));
      R = { W, peak: peak.reduce((a, v) => a + v, 0) / NR, correct, rowSums, minSum: Math.min(...rowSums) };
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Attention on', short: 'attention', get: () => st.attn, set: v => { st.attn = v; draw(); } },
      { type: 'toggle', label: 'Scale scores by √d', short: 'scale', get: () => st.scale, set: v => { st.scale = v; draw(); } },
      { type: 'buttons', label: 'Softmax over', options: ['Each output word (rows)', 'Each input word (columns)'], get: () => (st.axis === 'rows' ? 0 : 1), act: i => { st.axis = i ? 'cols' : 'rows'; draw(); } },
    ];
    const readouts = [
      { label: 'Looks at the right word', get: () => ({ v: `${R.correct} of ${NR}`, good: R.correct === NR, bad: R.correct < NR - 1 }) },
      { label: 'Sharpness', get: () => ({ v: R.peak.toFixed(2), sub: 'average top weight', good: R.peak > 0.35 && R.peak < 0.95, bad: R.peak < 0.2 || R.peak > 0.97 }) },
      { label: 'Row sums', get: () => ({ v: Math.abs(R.minSum - 1) < 0.02 ? 'all 1.00' : `as low as ${R.minSum.toFixed(2)}`, good: Math.abs(R.minSum - 1) < 0.02, bad: Math.abs(R.minSum - 1) >= 0.02 }) },
    ];
    const labels = [
      { name: 'grid', t: 'Who looks at whom', d: 'Rows: Swahili. Columns: English', icon: 'eye', atV: V(GX - NC * CS / 2 - 0.05, 0.1, -0.3) },
      { name: 'sums', t: 'Weights per row', d: 'Each should add up to 1', icon: 'scale', atV: V(GX + NC * CS / 2 + 0.64, 0.3, -0.3) },
    ];
    const reset = () => { Object.assign(st, { attn: true, scale: true, axis: 'rows' }); draw(); };
    const breaks = [
      { label: 'Switch attention off', hint: 'Every word read equally', on: () => { reset(); st.attn = false; draw(); }, off: reset },
      { label: 'Forget to scale the scores', hint: 'No division by √d', on: () => { reset(); st.scale = false; draw(); }, off: reset },
      { label: 'Softmax over the wrong axis', hint: 'Normalise columns, not rows', on: () => { reset(); st.axis = 'cols'; draw(); }, off: reset },
    ];
    function status() {
      if (!st.attn) return { ok: false, msg: `<b>Back to the bottleneck.</b> With attention off, every Swahili word reads the same flat average of all seven English words (${(1 / NC).toFixed(2)} each), which is the single squeezed summary again. "Ziwa" gets no special look at "lake", and long sentences fall apart as before.` };
      if (st.axis !== 'rows') return { ok: false, msg: `<b>Rows no longer add up to 1.</b> The softmax ran down each English column, so every input word\'s weights sum to 1 instead of every output word\'s. The rows now sum to anything from ${R.minSum.toFixed(2)} upwards, so some Swahili words read a faint mix and others a doubled one. Normalise over the inputs for each output word.` };
      if (!st.scale) return { ok: false, msg: `<b>All or nothing.</b> Dot products of ${D}-number vectors grow large, and without dividing by √d the softmax saturates: each row puts almost all its weight on one word (average top weight ${R.peak.toFixed(2)}). "Karibu na" (near) cannot share its attention across "near the", and the gradients through the softmax nearly vanish.` };
      return { ok: true, msg: `<b>${R.correct} of ${NR} words look at the right place.</b> "Soko" looks at "market", "ziwa" at "lake", "mapema" at "early", and "na" splits its attention across "near the". Scaled scores keep the weights sharp but soft, and every row sums to 1.` };
    }
    return { update: dt => { cells.forEach(c => c.userData.tick(dt)); sums.forEach(c => c.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Looking back', home: true, say: 'Translating "the market near the lake opens early". With attention, each Swahili word can look back at every English word, instead of one squeezed summary.', act: m => m.set({ attn: true, scale: true, axis: 'rows' }) },
    { t: 'Scores to weights', home: true, say: 'For each word being written, the decoder scores every input word, and a softmax turns the scores into weights that add up to one. Brighter squares get more attention.', act: m => m.set({}) },
    { t: 'An alignment', home: true, say: 'The grid looks like a dictionary: "soko" looks at "market", "ziwa" at "lake". "Na" shares its look between "near" and "the".', act: m => m.set({}) },
    { t: 'Without it', home: true, say: 'Switch attention off, and every word reads the same flat average. That is the old bottleneck again.', act: m => m.set({ attn: false }) },
    { t: 'Scale the scores', home: true, say: 'Forget to divide the scores by the square root of the vector size, and the softmax saturates: all of each row\'s weight lands on one word.', act: m => m.set({ attn: true, scale: false }) },
    { t: 'The right axis', home: true, say: 'And run the softmax down the columns by mistake, and the rows no longer add up to one. Some words read almost nothing.', act: m => m.set({ scale: true, axis: 'cols' }) },
  ],
  check: [
    { q: 'What does attention give the decoder at each step?', options: ['A weighted mix of all encoder states, weighted by relevance', 'Only the last encoder state', 'The next English word'], answer: 0, why: 'It no longer depends on one summary vector.' },
    { q: 'Why divide dot-product scores by √d?', options: ['Large scores saturate the softmax, putting all weight on one word', 'To make vectors shorter', 'To save memory'], answer: 0, why: 'Scaling keeps the weights soft and the gradients alive.' },
    { q: 'For each output word, what should the attention weights add up to?', options: ['1, across all the input words', '1, across all the output words', 'The sentence length'], answer: 0, why: 'The softmax runs over the inputs.' },
  ],
  terms: [
    ['Attention', 'Reading a weighted mix of many states, weighted by relevance.'],
    ['Query, key, value', 'What is looking, what is offered for matching, and what is read.'],
    ['Attention weights', 'The softmax of scores; how much each input is read.'],
    ['Scaled dot product', 'Scores computed as q·k / √d.'],
    ['Alignment', 'Which input words each output word draws on.'],
    ['Softmax', 'Turns scores into positive weights that sum to one.'],
  ],
  deeper: '<p><b>Additive and multiplicative.</b> Bahdanau attention scores with a small network on the two states; Luong attention uses a dot product, which is faster and is what transformers kept.</p><p><b>The bridge to transformers.</b> Let every word attend to every other word in the same sentence, drop the recurrent network, and you have self-attention.</p><p><b>About this machine.</b> The keys and queries are made-up vectors built to align; the scores, softmax and sums are computed exactly.</p>',
  code: {
    title: 'Scaled dot-product attention',
    note: 'Adapted from the course\'s attention lesson.',
    text: `
import torch

def attention(query, keys, values):
    # query: (out_len, d), keys/values: (in_len, d)
    scores = query @ keys.T / keys.shape[-1] ** 0.5     # scale by sqrt(d)
    weights = scores.softmax(dim=-1)                    # each output row sums to 1
    return weights @ values, weights

ctx, w = attention(torch.randn(6, 16), torch.randn(7, 16), torch.randn(7, 16))
print(w.sum(dim=-1))                                    # all ones
`,
  },
};
