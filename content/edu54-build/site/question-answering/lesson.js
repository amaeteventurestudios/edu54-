// Question answering: a farming help line in Malawi answers questions from two extension leaflets. A retriever picks which leaflet(s) to read;
// an extractive reader scores where the answer starts and ends in the text (bars over the words) and also scores "no answer". The answer and its scores are computed live.
// Break it: no "no answer" option (a question the leaflets do not cover still gets a confident wrong span), retrieve only the top leaflet (the wrong leaflet is read),
// judge with exact match only (a correct answer with one extra word scores zero; token F1 gives partial credit).
const LEAF = [
  { n: 'Leaflet 1: planting', t: 'In the central region , plant maize after the first good rains , usually in late November . Plant two seeds per hole and thin to one plant .' },
  { n: 'Leaflet 2: fertiliser', t: 'Apply basal fertiliser at planting and top dressing when maize is knee high . Use about fifty kilograms of top dressing per acre of maize .' },
];
const QS = [
  { q: 'When should maize be planted in the central region?', leaf: 0, gold: 'after the first good rains', pred: [7, 12], alt: [7, 17], wrong: [14, 17] },
  { q: 'In the central region, when do maize plants in each field get top dressing?', leaf: 1, gold: 'when maize is knee high', pred: [8, 13], wrong: [14, 17] },
  { q: 'Which pest attacks young maize?', leaf: -1, gold: '', pred: [19, 23] },
];
const toks = t => t.split(' ');
const norm = s => s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w && !['a', 'an', 'the'].includes(w));
const em = (p, g) => (norm(p).join(' ') === norm(g).join(' ') ? 1 : 0);
const f1 = (p, g) => { const a = norm(p), b = norm(g); if (!a.length || !b.length) return a.length === b.length ? 1 : 0; let c = 0; const bb = b.slice(); a.forEach(w => { const i = bb.indexOf(w); if (i >= 0) { c++; bb.splice(i, 1); } }); if (!c) return 0; const P = c / a.length, R = c / b.length; return 2 * P * R / (P + R); };

export default {
  slug: 'question-answering',
  title: 'Question answering: find the words',
  description: 'A farming help line in Malawi answers questions from two leaflets. Each word is a tile, and the reader lifts a start and an end, or says there is no answer.',
  overview: 'Extractive question answering finds the answer as a span of text in a passage. A reader model scores every word as a possible start and end of the answer and picks the best pair; well-trained readers also score a special "no answer" option, so they can decline when the passage does not contain one. Over many documents a retriever first chooses which passages to read, and if it retrieves too few, the right one may never be seen. Answers are scored by exact match, which demands the very same words, and token-level F1, which gives credit for overlap. Generative systems write answers instead, using retrieved text as context, which is retrieval-augmented generation.',
  keywords: ['question answering', 'extractive qa', 'unanswerable questions', 'exact match f1', 'retriever reader'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.1], dir: [0.05, 1.05, 1.05], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 0, nullOpt: true, topk: 2, metric: 'both' };
    const ink = '#151827';
    /* two leaflets lying flat, a tile for each word */
    const boards = LEAF.map((L, k) => {
      const x = k ? 1.3 : -1.3, b = P.box(2.45, 0.04, 1.3, '#E4DED2', { r: 0.04 }); b.position.set(x, 0, -0.6); S.add(b);
      const ws = toks(L.t), cols = 8, cw = 2.3 / cols, tiles = ws.map((w, i) => {
        const cx = x - 1.15 + (i % cols + 0.5) * cw, cz = -1.1 + Math.floor(i / cols) * 0.24;
        const hm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), h = P.box(cw * 0.86, 0.04, 0.19, '#fff', { r: 0.02, material: hm }); h.position.set(cx, 0.04, cz); S.add(h);
        const t = P.tower(0.1, 0.1, C.teal, { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(cx, 0.08, cz); S.add(t);
        return { hm, t };
      });
      return { tiles };
    });
    /* the reader's verdict */
    const verdict = P.lamp(C.green, { h: 0.2, r: 0.1 }); verdict.position.set(0, 0, 0.35); S.add(verdict);
    S.add(P.keep(-2.6, 2.6, 0.55, -1.3, 0.6));
    const parts = boards.flatMap(b => b.tiles.map(t => t.t));
    /* ---------- the reader ---------- */
    let R = null;
    function answer() {
      const Q = QS[st.q];
      // retriever: question words found in each leaflet (word overlap, computed live)
      const overlap = LEAF.map(L => norm(Q.q).filter(w => norm(L.t).includes(w)).length);
      const order = [0, 1].sort((a, b) => overlap[b] - overlap[a]), read = order.slice(0, st.topk);
      let leaf = Q.leaf, span = Q.pred, conf = 0.9;
      if (Q.leaf >= 0 && !read.includes(Q.leaf)) { leaf = read[0]; span = Q.wrong; conf = 0.55; }
      if (Q.leaf < 0) { leaf = 0; conf = st.nullOpt ? 0.18 : 0.61; }
      if (st.metric === 'em' && Q.alt) span = Q.alt;   // the reader's slightly long answer, to show how exact match scores it
      const noAns = Q.leaf < 0 && st.nullOpt;
      const ws = toks(LEAF[leaf].t), text = noAns ? '' : ws.slice(span[0], span[1]).join(' ').replace(/ ,/g, ',').replace(/ \./g, '');
      return { Q, leaf, span, text, noAns, read, overlap, conf, em: em(text, Q.gold), f1: f1(text, Q.gold) };
    }
    function draw() {
      R = answer();
      boards.forEach((B, k) => { const dim = !R.read.includes(k); B.tiles.forEach((T, i) => { const inSpan = !R.noAns && k === R.leaf && i >= R.span[0] && i < R.span[1]; T.hm.color.set(inSpan ? C.gold : dim ? '#B9B6AE' : '#FBF8F1'); const start = k === R.leaf && i === R.span[0], end = k === R.leaf && i === R.span[1] - 1; T.t.visible = !R.noAns && (start || end); T.t.userData.set({ h: R.conf * 0.4, color: start ? C.teal : C.orange }); }); });
      verdict.userData.set({ color: R.Q.leaf < 0 ? (R.noAns ? C.green : C.red) : R.f1 > 0.6 ? C.green : C.red, on: true });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Question', options: ['When to plant', 'Top dressing', 'Which pest'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Reader may answer "no answer"', short: 'no answer', get: () => st.nullOpt, set: v => { st.nullOpt = v; draw(); } },
      { type: 'buttons', label: 'Leaflets retrieved', options: ['Top 2', 'Top 1'], get: () => (st.topk === 2 ? 0 : 1), act: i => { st.topk = i ? 1 : 2; draw(); } },
      { type: 'buttons', label: 'Scoring', options: ['EM and F1', 'Exact match only'], get: () => (st.metric === 'both' ? 0 : 1), act: i => { st.metric = i ? 'em' : 'both'; draw(); } },
    ];
    const readouts = [
      { label: 'Exact match', get: () => ({ v: R.Q.leaf < 0 ? (R.noAns ? '1' : '0') : String(R.em), good: R.Q.leaf < 0 ? R.noAns : R.em === 1, bad: R.Q.leaf < 0 ? !R.noAns : R.em === 0 }) },
      { label: 'Token F1', get: () => ({ v: st.metric === 'em' ? '–' : (R.Q.leaf < 0 ? (R.noAns ? 1 : 0) : R.f1).toFixed(2), sub: 'partial credit' }) },
      { label: 'Leaflets read', get: () => ({ v: R.read.map(k => k + 1).join(' and '), sub: `answer is in ${R.Q.leaf < 0 ? 'neither' : `leaflet ${R.Q.leaf + 1}`}`, bad: R.Q.leaf >= 0 && !R.read.includes(R.Q.leaf) }) },
    ];
    const labels = [
      { name: 'leaflets', t: 'Two leaflets', d: 'Grey: not retrieved', icon: 'book', atV: V(-2.5, 0.08, -0.6) },
      { name: 'span', t: 'Start and end', d: 'Teal start, orange end, gold span', icon: 'target', atV: V(2.5, 0.08, -0.6) },
    ];
    const reset = () => { Object.assign(st, { q: 0, nullOpt: true, topk: 2, metric: 'both' }); draw(); };
    const breaks = [
      { label: 'No "no answer" option', hint: 'Ask about pests', on: () => { reset(); st.q = 2; st.nullOpt = false; draw(); }, off: reset },
      { label: 'Retrieve only one leaflet', hint: 'Ask about top dressing', on: () => { reset(); st.q = 1; st.topk = 1; draw(); }, off: reset },
      { label: 'Exact match only', hint: 'A slightly longer answer', on: () => { reset(); st.metric = 'em'; draw(); }, off: reset },
    ];
    function status() {
      if (R.Q.leaf < 0 && !R.noAns) return { ok: false, msg: `<b>A confident answer to a question nobody covered.</b> Neither leaflet mentions pests, but a reader that must always pick a span picks the best-looking one, "${R.text}", ${Math.round(R.conf * 100)}% sure. A farmer would act on it. Readers trained with unanswerable questions score a "no answer" option and decline when nothing fits.` };
      if (R.Q.leaf >= 0 && !R.read.includes(R.Q.leaf)) return { ok: false, msg: `<b>The right leaflet was never read.</b> The retriever ranked the planting leaflet first because it shares ${R.overlap[0]} words with the question ("central region" among them) against ${R.overlap[1]}, and with only one leaflet retrieved the reader answers from it: "${R.text}". Reading the top few passages costs a little more and keeps the answer within reach.` };
      if (st.metric === 'em' && R.em === 0) return { ok: false, msg: `<b>Right answer, scored zero.</b> The reader answered "${R.text}", which contains the correct "${R.Q.gold}" plus a few words. Exact match demands identical words, so it scores 0; token F1 would give ${f1(R.text, R.Q.gold).toFixed(2)}. Report both.` };
      return { ok: true, msg: R.noAns ? `<b>"No answer", correctly.</b> The reader\'s best span scores below its no-answer option, so it declines instead of inventing something about pests. That is the right reply for a help line.` : `<b>"${R.text}".</b> The retriever reads both leaflets, the reader finds the start and end in leaflet ${R.leaf + 1}, ${Math.round(R.conf * 100)}% sure: exact match ${R.em}, F1 ${R.f1.toFixed(2)}.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A farming help line', home: true, say: 'A help line in Malawi answers farmers\' questions from two extension leaflets. "When should maize be planted in the central region?"', act: m => m.set({ q: 0, nullOpt: true, topk: 2, metric: 'both' }) },
    { t: 'Start and end', home: true, say: 'The reader scores every word as a possible start and end of the answer, and picks the best pair: "after the first good rains".', act: m => m.set({}) },
    { t: 'Retrieve first', home: true, say: 'With many documents, a retriever picks which to read. Retrieve only the top one, and for a question about top dressing it reads the wrong leaflet.', act: m => m.set({ q: 1, topk: 1 }) },
    { t: 'No answer', home: true, say: 'Ask which pest attacks young maize. Neither leaflet says. A good reader scores a "no answer" option and declines.', act: m => m.set({ q: 2, topk: 2 }) },
    { t: 'Forced to answer', home: true, say: 'Take that option away, and the reader confidently picks a span that has nothing to do with pests. A farmer would act on it.', act: m => m.set({ nullOpt: false }) },
    { t: 'Scoring answers', home: true, say: 'Exact match gives zero to a correct answer with one extra word. Token F1 gives partial credit. Report both.', act: m => m.set({ q: 0, nullOpt: true, metric: 'em' }) },
  ],
  check: [
    { q: 'What does an extractive QA reader predict?', options: ['The start and end of the answer span in the passage', 'A new sentence', 'The question type only'], answer: 0, why: 'The answer is copied from the text.' },
    { q: 'Why give a reader a "no answer" option?', options: ['So it can decline when the passage does not contain the answer', 'To answer faster', 'To make answers longer'], answer: 0, why: 'Otherwise it invents a confident answer.' },
    { q: 'Why report F1 as well as exact match?', options: ['Exact match gives zero to answers with small wording differences', 'F1 is always higher', 'Exact match ignores the answer'], answer: 0, why: 'F1 gives credit for overlapping words.' },
  ],
  terms: [
    ['Extractive QA', 'Answering by selecting a span of the passage.'],
    ['Span', 'A continuous run of words in the text.'],
    ['Unanswerable question', 'A question whose answer is not in the passage.'],
    ['Retriever', 'The part that chooses which passages to read.'],
    ['Exact match', '1 if the answer equals the reference after normalising, else 0.'],
    ['Token F1', 'Overlap between answer and reference words.'],
  ],
  deeper: '<p><b>Generative QA.</b> Instead of copying a span, a language model writes an answer from retrieved passages. Evaluation then checks faithfulness (is it supported by the passages?) and relevance, not only overlap.</p><p><b>Local languages.</b> Help lines across Africa take questions in Chichewa, Hausa or Amharic; readers need training data in those languages, or translation in and out.</p><p><b>About this machine.</b> The reader\'s spans and confidences are set to show each case; exact match and F1 are computed on the answers shown.</p>',
  code: {
    title: 'Picking a span, with a no-answer option',
    note: 'Adapted from the course\'s question answering lesson.',
    text: `
import numpy as np

def best_span(start_logits, end_logits, null_score, max_len=15):
    best, best_score = None, -np.inf
    for s in range(len(start_logits)):
        for e in range(s, min(s + max_len, len(end_logits))):
            score = start_logits[s] + end_logits[e]
            if score > best_score:
                best, best_score = (s, e), score
    return None if null_score > best_score else best   # None means "no answer"
`,
  },
};
