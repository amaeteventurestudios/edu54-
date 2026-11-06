// Chunking strategies compared (phase 19, lesson 64): one policy document from a Harare insurer, five real chunkers: fixed window, sentence, recursive, semantic, headers. Chunks are drawn as coloured runs along the page. Each chunker's cuts are computed; a question's answer spans two sentences, and we check if one chunk holds it.
const SENT = [8, 12, 6, 15, 7, 10, 9, 14, 5, 11];      // words per sentence
const HEAD = [0, 4, 7];                                // sentences that start a section
const TOPIC = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2];
const ANS = [4, 5];                                    // the answer spans these sentences
function cuts(o) {
  const out = [0]; let w = 0;
  if (o.s === 'fixed') { const total = SENT.reduce((a, b) => a + b, 0); for (let i = o.size; i < total; i += o.size) out.push(i); return { words: out }; }
  const c = [0];
  if (o.s === 'sent') { SENT.forEach((n, i) => { if (w + n > o.size && i) { c.push(i); w = 0; } w += n; }); }
  if (o.s === 'head') HEAD.slice(1).forEach(h => c.push(h));
  if (o.s === 'sem') TOPIC.forEach((t, i) => { if (i && t !== TOPIC[i - 1]) c.push(i); });
  if (o.s === 'rec') { HEAD.forEach((h, k) => { const end = HEAD[k + 1] ?? SENT.length; if (k) c.push(h); let n = 0; for (let i = h; i < end; i++) { if (n + SENT[i] > o.size && i > h) { c.push(i); n = 0; } n += SENT[i]; } }); }
  return { sents: [...new Set(c)].sort((a, b) => a - b) };
}
function run(o) {
  const C = cuts(o), starts = SENT.reduce((a, n, i) => (a.push((a[i - 1] ?? 0) + (i ? SENT[i - 1] : 0)), a), []);
  const edges = C.sents ? C.sents.map(i => starts[i]) : C.words;
  const a = starts[ANS[0]], b = starts[ANS[1]] + SENT[ANS[1]], whole = !edges.some(e => e > a && e < b);
  const total = SENT.reduce((x, y) => x + y, 0), n = edges.length;
  return { edges, whole, n, total, avg: Math.round(total / n), midSent: !C.sents };
}

export default {
  slug: 'chunking-strategies-advanced',
  title: 'Five ways to cut a document',
  description: 'Fixed, sentence, recursive, semantic or by headers. Cut one policy five ways, and see which keeps an answer whole.',
  overview: 'Retrieval can only return what chunking made. A fixed window is simple and cuts sentences in half. Sentence chunking keeps sentences whole and ignores topics. Recursive splitting tries big boundaries first, then smaller ones. Semantic chunking cuts where meaning changes, using embeddings. Structural chunking follows headers. Each trades simplicity against keeping ideas whole. An answer split across two chunks may never be retrieved. Here five real chunkers run over one insurance policy from Harare, and we check if one answer stays in one chunk.',
  keywords: ['chunking', 'RAG', 'semantic chunking', 'recursive splitting', 'retrieval', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.04, 0.9, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { s: 'rec', size: 30 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const total = SENT.reduce((a, b) => a + b, 0), W = 4.6, X = w => -2.3 + w / total * W;
    const Ws = Array.from({ length: total }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(W / total - 0.008, 0.2, 0.5, '#fff', { r: 0.002, material: m }); b.position.set(X(i) + W / total / 2, 0.03, -0.2); S.add(b); return m; });
    const ansB = P.box(0.1, 0.05, 0.12, SAF, { r: 0.01 }); S.add(ansB);
    const lamp = add(P.lamp(GOOD, { h: 0.34, r: 0.11 })); lamp.position.set(0, 0.03, 0.5);
    S.add(P.keep(-2.4, 2.4, 0.7, -0.72, 0.72));
    let R = null;
    const pal = ['#5B8DB8', '#D98BA6', '#3E9B9B', '#E0B070', '#7B6FA8', '#8FB36A'];
    function draw() {
      R = run(st);
      const e = R.edges.concat([total]); let c = 0; Ws.forEach((m, i) => { while (i >= e[c + 1]) c++; m.color.set(pal[c % pal.length]); });
      lamp.userData.set({ color: R.whole ? '#3E9B5F' : '#D9483B', on: true });
      const a = SENT.slice(0, ANS[0]).reduce((x, y) => x + y, 0), b = a + SENT[ANS[0]] + SENT[ANS[1]]; ansB.scale.x = (b - a) / total * W / 0.1; ansB.position.set(X((a + b) / 2), 0.03, 0.12);
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const SK = ['fixed', 'sent', 'rec', 'sem', 'head'];
    const controls = [
      { type: 'buttons', label: 'Chunker', options: ['Fixed', 'Sentence', 'Recursive', 'Semantic', 'Headers'], get: () => SK.indexOf(st.s), act: i => set({ s: SK[i] }) },
      { type: 'slider', label: 'Target size in words', min: 15, max: 50, step: 5, get: () => st.size, set: v => set({ size: v }) },
    ];
    const readouts = [
      { label: 'Chunks', get: () => ({ v: `${R.n}`, sub: `about ${R.avg} words each` }) },
      { label: 'Answer in one chunk', get: () => ({ v: R.whole ? 'yes' : 'split', good: R.whole, bad: !R.whole }) },
      { label: 'Sentences cut', get: () => ({ v: R.midSent ? 'yes' : 'none', good: !R.midSent, bad: R.midSent }) },
    ];
    const labels = [
      { name: 'd', t: 'The policy, word by word', d: 'A colour is one chunk', icon: 'book', atV: V(-2.35, 0.15, -0.2) },
      { name: 'a', t: 'The answer', d: 'Lamp: is it in one chunk?', icon: 'target', atV: V(0.25, 0.4, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A small fixed window', hint: 'cuts mid-sentence', on: () => set({ ...D0, s: 'fixed', size: 15 }), off: reset },
      { label: 'Sentences only, tight size', hint: 'ideas split', on: () => set({ ...D0, s: 'sent', size: 15 }), off: reset },
    ];
    function status() {
      if (!R.whole) return { ok: false, msg: `<b>The answer is split across chunks.</b> Half of it may never be retrieved, and a model can\'t reason on half. ${R.midSent ? 'Fixed windows cut wherever they land.' : 'Respect bigger boundaries.'}` };
      return { ok: true, msg: `<b>${R.n} chunks, and the answer sits whole in one.</b> ${st.s === 'sem' ? 'Semantic cuts cost embedding calls.' : st.s === 'head' ? 'Headers work when documents have them.' : 'Simple, and it fits this document.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One policy', home: true, say: 'An insurer in Harare has a policy document. Retrieval can only return what chunking made.', act: m => m.set({ s: 'fixed', size: 15 }) },
    { t: 'Fixed windows', home: true, say: 'A fixed window is simple, and cuts sentences in half.', act: m => m.set({ s: 'fixed', size: 15 }) },
    { t: 'Sentences', home: true, say: 'Sentence chunking keeps sentences whole, but it ignores topics.', act: m => m.set({ s: 'sent', size: 30 }) },
    { t: 'Recursive', home: true, say: 'Try big boundaries first, then smaller ones. A good default.', act: m => m.set({ s: 'rec', size: 30 }) },
    { t: 'Semantic', home: true, say: 'Cut where the meaning changes, at the cost of embedding calls.', act: m => m.set({ s: 'sem', size: 30 }) },
    { t: 'Structure', home: true, say: 'If a document has headers, use them.', act: m => m.set({ s: 'head', size: 30 }) },
  ],
  check: [
    { q: 'What is the risk of fixed windows?', options: ['Cutting sentences and answers', 'High cost', 'Too few chunks'], answer: 0, why: 'They cut wherever they land.', hint: 'Try A small fixed window.' },
    { q: 'What does recursive splitting do?', options: ['Tries big boundaries first', 'Repeats chunks', 'Uses a model'], answer: 0, why: 'Then falls back to smaller ones.', hint: 'See Recursive.' },
    { q: 'What does semantic chunking cost?', options: ['Embedding calls', 'Nothing', 'More sentences'], answer: 0, why: 'It compares meaning between sentences.', hint: 'See Semantic.' },
  ],
  terms: [['Chunk', 'A retrievable piece.'], ['Overlap', 'Shared text between chunks.'], ['Recursive split', 'Big boundaries, then smaller.'], ['Semantic chunking', 'Cutting by meaning.']],
  deeper: '<p><b>Overlap</b> reduces split answers, at the cost of duplication.</p><p><b>Evaluate.</b> Choose by retrieval scores on your own questions.</p><p><b>Cuts</b> are really computed; topics are given.</p>',
  code: {
    title: 'Recursive split',
    note: 'Adapted from the course\'s chunkers (code/main.py).',
    text: `
def split(text, seps=("\\n## ", "\\n\\n", ". "), size=300):
    if len(text) <= size or not seps:
        return [text]
    parts = text.split(seps[0])
    return [c for p in parts for c in split(p, seps[1:], size)]
`,
  },
};
