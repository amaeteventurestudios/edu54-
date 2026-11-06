// Multi-head attention: four heads stacked like glass shelves over one sentence, each looking for a different pattern
// (the word before, who did what, who "she" is, what describes what). Their findings are joined and mixed.
// Break it: every head the same, one big head instead of four.
const WORDS = ['Ada', 'gave', 'Kemi', 'the', 'book', 'she', 'wanted'];
const n = WORDS.length;
// each head's scores: s(i, j) for asking word i, answering word j
const HEADS = [
  { name: 'The word before', c: '#3D6BD6', s: (i, j) => j === i - 1 ? 4 : j === i ? 1.5 : 0 },
  { name: 'Who did what', c: '#3E9B5F', s: (i, j) => { const verb = [1, 6]; if (verb.includes(i)) return i === 1 ? ([0, 2, 4].includes(j) ? 3 : 0) : ([4, 5].includes(j) ? 3 : 0); return verb.includes(j) ? 3 : 0; } },
  { name: 'Who is "she"', c: '#EE6352', s: (i, j) => i === 5 ? (j === 2 ? 4.5 : j === 0 ? 2.2 : 0) : (i === j ? 2.5 : 0) },
  { name: 'What describes what', c: '#E3A72F', s: (i, j) => ([3, 6].includes(i) && j === 4) || (i === 4 && [3, 6].includes(j)) ? 3.5 : i === j ? 1.5 : 0 },
];
const softmax = a => { const m = Math.max(...a), e = a.map(x => Math.exp(x - m)), s = e.reduce((p, q) => p + q, 0); return e.map(x => x / s); };

export default {
  slug: 'multi-head-attention',
  title: 'Multi-head attention',
  description: 'Four attention heads, stacked like glass shelves over one sentence. Each one hunts for a different pattern. Make them all the same and watch the model lose sight of who "she" is.',
  overview: 'One attention pattern can only look for one kind of link at a time. So transformers run several heads side by side, each with its own queries and keys. One tracks the word before, one who did what, one who "she" refers to. Their findings are joined and mixed into one answer.',
  keywords: ['multi head attention explained', 'attention heads', 'transformer heads', 'what do attention heads learn'],
  orient: 'any',
  view: { target: [0.3, 1.5, 0], dir: [0.55, 0.75, 1.3], half: 3.4, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 5, on: [true, true, true, true], same: false, one: false };
    const X0 = -2.7, DX = 0.9, FY = [0.95, 1.65, 2.35, 3.05];
    const wx = j => X0 + j * DX;
    /* ---------- the sentence ---------- */
    const tiles = WORDS.map((w, j) => { const t = P.tile(w, 0.8, 0.3, 0.7, '#FFFFFF', { size: 0.17 }); t.position.set(wx(j), 0, 0); S.add(t); S.tap(t.userData.body, () => { st.q = j; draw(); S.sync(); }); return t; });
    /* ---------- the heads: glass shelves ---------- */
    const shelves = HEADS.map((h, k) => {
      const g = new THREE.Group(); g.position.y = FY[k]; S.add(g);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(n * DX + 0.3, 0.04, 1.0), new THREE.MeshLambertMaterial({ color: h.c, transparent: true, opacity: 0.16, depthWrite: false }));
      glass.position.x = wx(3); glass.userData.noMask = true; g.add(glass);
      const edge = P.box(n * DX + 0.3, 0.04, 0.04, h.c, { r: 0 }); edge.position.set(wx(3), -0.02, 0.5); g.add(edge);
      const name = S.text(h.name, { size: 0.15, face: 'front', weight: 750, color: h.c }); name.position.set(wx(0) - 0.15, 0.09, 0.53); g.add(name);
      const dots = WORDS.map((_, j) => { const d = P.ball(0.06, h.c); d.position.set(wx(j), 0.04, 0); g.add(d); return d; });
      return { g, arcs: [], dots, h };
    });
    const posts = [wx(0) - 0.6, wx(n - 1) + 0.6].map(x => { const r = P.rod(V(x, 0, -0.5), V(x, FY[3], -0.5), 0.025, '#B9B6C6'); S.add(r); return r; });
    // the mixer: joins the heads' findings into one
    const mix = P.box(0.9, 0.7, 0.9, C.plum, { r: 0.14 }); mix.position.set(wx(n - 1) + 1.55, 1.6, 0); S.add(mix);
    const mt = S.text('MIX', { size: 0.16, face: 'front', weight: 800, color: '#FFFFFF' }); mt.position.set(mix.position.x, 1.95, 0.46); S.add(mt);
    const feeds = FY.map((y, k) => { const r = P.rod(V(wx(n - 1) + 0.6, y, 0), V(mix.position.x - 0.45, 1.95, 0), 0.03, HEADS[k].c); r.layers.set(1); S.add(r); return r; });
    const outT = S.text('', { size: 0.15, face: 'cam', weight: 700, bg: 'rgba(255,255,255,.94)', color: C.ink, order: 6 }); outT.position.set(mix.position.x, 2.65, 0); outT.userData.noFit = true; S.add(outT);
    function weights(k, i) {
      if (st.one) { const avg = WORDS.map((_, j) => HEADS.reduce((s, h) => s + h.s(i, j), 0) / 4); return softmax(avg); }
      const h = st.same ? HEADS[0] : HEADS[k];
      return softmax(WORDS.map((_, j) => h.s(i, j)));
    }
    function draw() {
      tiles.forEach((t, j) => { t.userData.body.material = P.mat(j === st.q ? C.orange : '#FFFFFF'); });
      shelves.forEach((sh, k) => {
        for (const a of sh.arcs) { sh.g.remove(a); a.geometry.dispose(); }
        sh.arcs = [];
        const on = st.on[k] && (!st.one || k === 0);
        sh.g.visible = on; feeds[k].visible = on;
        if (!on) return;
        const w = weights(k, st.q), col = st.one ? C.plum : (st.same ? HEADS[0].c : sh.h.c);
        w.forEach((a, j) => {
          sh.dots[j].scale.setScalar(0.6 + a * 3);
          if (j === st.q || a < 0.03) return;
          const p0 = V(wx(st.q), 0.05, 0), p1 = V(wx(j), 0.05, 0), m = p0.clone().lerp(p1, 0.5); m.y += 0.15 + Math.abs(j - st.q) * 0.09;
          const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, m, p1), 24, 0.01 + a * 0.06, 8), P.mat(col));
          arc.userData.noFit = true; sh.g.add(arc); sh.arcs.push(arc);
        });
        sh.dots.forEach(d => { d.material = P.mat(col); });
      });
      const best = WORDS.map((_, j) => [j, HEADS.reduce((s, _h, k) => s + (st.on[k] ? weights(k, st.q)[j] : 0), 0)]).filter(([j]) => j !== st.q).sort((a, b) => b[1] - a[1])[0][0];
      outT.userData.set(`"${WORDS[st.q]}" + ${st.one ? 'one blurred view' : `${st.on.filter(Boolean).length} views`}`);
      st.best = best;
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Which word is asking?', options: WORDS, get: () => st.q, act: i => { st.q = i; draw(); } },
      ...HEADS.map((h, k) => ({ type: 'toggle', label: `Head ${k + 1}: ${h.name}`, short: `Head ${k + 1}`, quick: false, get: () => st.on[k], set: v => { st.on[k] = v; draw(); } })),
    ];
    const sheW = k => weights(k, 5)[2];
    const readouts = [
      { label: '"she" means Kemi', get: () => { const k = st.one ? 0 : 2; const v = (st.on[2] || st.one) ? sheW(k) : 0; return { v: `${Math.round(v * 100)}%`, bar: v, good: v > 0.6, bad: v < 0.3 }; }, bar: true },
      { label: 'Heads working', get: () => ({ v: st.one ? '1 (big)' : st.same ? '4, all alike' : `${st.on.filter(Boolean).length} of 4` }) },
    ];
    const labels = [
      { name: 'she', t: 'Head 3 links "she" to Kemi', d: 'Its own query and key, for one job', icon: 'link', atV: V(wx(3.5), FY[2] + 0.35, 0) },
      { name: 'prev', t: 'Head 1: the word before', d: 'Helps with grammar and word order', icon: 'spark', atV: V(wx(1), FY[0] + 0.15, 0.3), phone: false },
      { name: 'mix', t: 'Join and mix', d: 'The views become one answer', icon: 'box', atV: V(wx(n - 1) + 1.55, 2.3, 0) },
      { name: 'asker', t: 'The asking word', d: 'Tap any word to ask', icon: 'target', at: () => V(wx(st.q), 0.32, 0) },
    ];
    const breaks = [
      { label: 'Every head the same', hint: 'Four copies of "the word before"', on: () => { st.same = true; draw(); }, off: () => { st.same = false; draw(); } },
      { label: 'One big head', hint: 'All patterns blended into one', on: () => { st.one = true; draw(); }, off: () => { st.one = false; draw(); } },
    ];
    function status() {
      if (st.same) return { ok: false, msg: `<b>Four heads, one idea.</b> Every head looks at the word before, so nobody tracks who "she" is: ${Math.round(sheW(0) * 100)}% on Kemi. Different starting weights are what let heads specialise.` };
      if (st.one) return { ok: false, msg: `<b>A blurred view.</b> One head has to share its attention between every job, so "she" gives Kemi only ${Math.round(weights(0, 5)[2] * 100)}%. Several smaller heads each do one job well.` };
      if (!st.on[2] && st.q === 5) return { ok: false, msg: `<b>Nobody is tracking "she".</b> With head 3 off, no head links the pronoun to a name.` };
      return { msg: `<b>"${WORDS[st.q]}"</b>: four heads, four views. ${st.q === 5 ? `Head 3 sends ${Math.round(sheW(2) * 100)}% of its attention to Kemi.` : `Together they point most to "${WORDS[st.best]}".`} Tap a word, or switch heads off in Try it.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { q: 5, on: [true, true, true, true], same: false, one: false }); draw(); },
      ask: q => { st.q = q; draw(); } };
  },

  story: [
    { t: 'One sentence, many links', home: true, say: 'Ada gave Kemi the book she wanted. To understand it you track several things at once: word order, who gave what to whom, and who "she" is.', act: m => m.ask(5) },
    { t: 'A head per job', focus: 'prev', zoom: 1.3, say: 'So a transformer runs several attention heads side by side. This one, at the bottom, simply looks at the word before.', act: m => m.ask(4) },
    { t: 'Who did what', home: true, say: 'Head two links the action to the people and things: gave links to Ada, Kemi and the book.', act: m => m.ask(1) },
    { t: 'Who is "she"?', focus: 'she', zoom: 1.3, say: 'Head three has learned to link a pronoun to a name. For "she", it points to Kemi, the one who wanted the book.', act: m => m.ask(5) },
    { t: 'Join and mix', focus: 'mix', zoom: 1.3, say: 'Each head gives its own view. They are joined side by side and mixed by one more set of weights into a single answer for each word.' },
    { t: 'Many heads, many layers', home: true, say: 'Large models have dozens of heads in each of dozens of layers. Nobody assigns their jobs; each head drifts into its own speciality during training.' },
  ],
  check: [
    { q: 'Why use several attention heads instead of one?', options: ['Each can look for a different kind of link', 'It makes the model smaller', 'One head can\'t do maths'], answer: 0, why: 'Each head has its own queries and keys, so each can specialise in a different pattern.' },
    { q: 'What happens to the heads\' outputs?', options: ['Only the best is kept', 'They are joined and mixed into one answer', 'They are thrown away'], answer: 1, why: 'They are concatenated and multiplied by one more weight matrix.' },
    { q: 'If every head starts with the same weights…', options: ['They all learn the same pattern', 'Training is faster', 'They specialise anyway'], answer: 0, why: 'Identical starts get identical updates, so the heads never become different.' },
  ],
  terms: [
    ['Attention head', 'One full set of queries, keys and values, with its own weights.'],
    ['Concatenate', 'Join the heads\' outputs side by side.'],
    ['Output projection', 'The weights that mix the joined outputs back into one.'],
    ['Coreference', 'Working out which name a word like "she" or "it" refers to.'],
  ],
  deeper: '<p>Researchers have found real heads that track the previous word, heads that copy repeated phrases ("induction heads"), and heads that match pronouns to names. Many heads are hard to explain, and some can be removed with little effect. Studying them is a field called mechanistic interpretability.</p>',
  code: {
    title: 'Multi-head attention',
    note: 'Adapted from the course\'s self_attention.py: several heads, then join and mix.',
    text: `
import numpy as np

class MultiHeadAttention:
    def __init__(self, d_model, n_heads, rng=np.random.default_rng(0)):
        self.h, self.dk = n_heads, d_model // n_heads
        # each head gets its own query, key and value weights
        self.Wq = rng.normal(0, 0.1, (n_heads, d_model, self.dk))
        self.Wk = rng.normal(0, 0.1, (n_heads, d_model, self.dk))
        self.Wv = rng.normal(0, 0.1, (n_heads, d_model, self.dk))
        self.Wo = rng.normal(0, 0.1, (d_model, d_model))

    def forward(self, X):
        outs = []
        for i in range(self.h):
            Q, K, V = X @ self.Wq[i], X @ self.Wk[i], X @ self.Wv[i]
            w = softmax(Q @ K.T / np.sqrt(self.dk))
            outs.append(w @ V)
        return np.concatenate(outs, axis=-1) @ self.Wo   # join, then mix
`,
  },
};
