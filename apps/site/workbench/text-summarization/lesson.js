// Text summarisation: a seven-sentence report from a county council meeting in Kisumu. Each sentence is a tile; TextRank links sentences that share words and
// ranks them like web pages (the taller the pillar, the more central). An extractive summary takes the top sentences; an abstractive model writes new ones.
// ROUGE scores the summary's word overlap with a reference summary, and a fact check compares numbers with the source. All computed live.
// Break it: no redundancy removal (TextRank picks two sentences that say the same thing), first three sentences only ("lead" baseline; the key news is at the end),
// an abstractive summary that changes a number (ROUGE barely notices; the fact check does).
const DOC = [
  'The Kisumu county council met on Monday to discuss water supply.',
  'Councillors heard that twelve new boreholes will be drilled in Nyalenda and Manyatta.',
  'The twelve boreholes in Nyalenda and Manyatta will be drilled before the long rains.',
  'Residents in Nyalenda and Manyatta have complained about dry taps for three months.',
  'The council also discussed the condition of the market roads.',
  'A youth football tournament was announced for December.',
  'Work on the new boreholes for the dry taps of Nyalenda and Manyatta starts next week.',
];
const REF = 'kisumu council approved twelve new boreholes in nyalenda and manyatta after three months of dry taps, and work starts next week';
const ABS = {
  good: 'Kisumu council will drill twelve boreholes in Nyalenda and Manyatta after three months of dry taps, with work starting next week.',
  bad: 'Kisumu council will drill twenty boreholes in Nyalenda and Manyatta after three months of dry taps, with work starting next week.',
};
const STOP = new Set(['the', 'a', 'in', 'and', 'of', 'on', 'to', 'for', 'will', 'be', 'was', 'have', 'has', 'about', 'also', 'that', 'than', 'with', 'after']);
const words = s => (s.toLowerCase().match(/[a-z]+/g) || []);
const content = s => words(s).filter(w => !STOP.has(w));
const NUMW = ['twelve', 'twenty', 'three', 'monday', 'december'];

export default {
  slug: 'text-summarization',
  title: 'Summarisation: the gist, and only the truth',
  description: 'A seven-sentence report from a county council meeting in Kisumu. Link the sentences, pick the central ones, and watch rewriting bring in a number no one said.',
  overview: 'Extractive summarisers pick existing sentences. TextRank builds a graph where sentences sharing words are linked and ranks them with the same idea as PageRank: a sentence is central if it resembles other central sentences. Picking the top few gives a summary, but similar sentences rank together, so a redundancy step (maximal marginal relevance) skips sentences too like ones already chosen. Abstractive summarisers write new sentences, which reads better and can also invent things. ROUGE, the standard score, counts word overlap with a reference summary; it does not check facts, so a summary with a wrong number scores almost as well. Factuality checks compare entities and numbers with the source.',
  keywords: ['text summarization', 'textrank extractive', 'rouge score', 'abstractive summary hallucination', 'mmr redundancy'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, 0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { method: 'textrank', mmr: true, factCheck: true };
    /* sentence tiles with rank pillars */
    const DX = 0.68, X = i => -2.4 + i * DX;
    const tiles = DOC.map((s, i) => {
      const bm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), b = P.box(0.6, 0.08, 0.5, '#fff', { r: 0.03, material: bm }); b.position.set(X(i), 0, 0.5); S.add(b);
      const m = new THREE.MeshLambertMaterial({ color: C.teal }), p = P.box(0.18, 1, 0.18, C.teal, { r: 0.03, material: m }); p.position.set(X(i), 0, 0.05); p.userData.noFit = true; S.add(p);
      return { bm, m, p };
    });
    const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), new THREE.MeshBasicMaterial({ color: '#8E91A3' }), 21);
    links.userData.noFit = true; links.frustumCulled = false; links.layers.set(1); S.add(links);
    /* how close to the reference, and a lamp for facts it made up */
    const r1 = P.tower(0.34, 0.34, C.indigo, { h: 0.4 }), r2 = P.tower(0.34, 0.34, C.teal, { h: 0.3 }); [r1, r2].forEach(t => t.userData.set({ cap: '' })); r1.position.set(2.5, 0, 0.1); r2.position.set(2.95, 0, 0.1); S.add(r1, r2);
    const truth = P.lamp(C.green, { h: 0.22, r: 0.1 }); truth.position.set(2.72, 0, 0.6); S.add(truth);
    S.add(P.keep(-2.8, 3.2, 0.85, -0.5, 0.85));
    const dummy = new THREE.Object3D();
    /* ---------- maths ---------- */
    const CW = DOC.map(content);
    const sim = (a, b) => { const A = new Set(CW[a]), B = new Set(CW[b]); let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / (Math.log(A.size + 1) + Math.log(B.size + 1)); };
    const N = DOC.length, Wm = [...Array(N)].map((_, i) => [...Array(N)].map((_, j) => (i === j ? 0 : sim(i, j))));
    let rank = Array(N).fill(1 / N);
    for (let it = 0; it < 50; it++) rank = rank.map((_, i) => 0.15 / N + 0.85 * Wm.reduce((a, row, j) => { const out = row.reduce((x, y) => x + y, 0); return a + (out ? Wm[j][i] / out * rank[j] : 0); }, 0));
    const ngr = (ws, n) => { const o = {}; for (let i = 0; i + n <= ws.length; i++) { const k = ws.slice(i, i + n).join(' '); o[k] = (o[k] || 0) + 1; } return o; };
    const rouge = (sumText, n) => { const a = ngr(words(sumText), n), b = ngr(words(REF), n); let m = 0, tb = 0; for (const k in b) { tb += b[k]; m += Math.min(b[k], a[k] || 0); } return m / tb; };
    let R = null;
    function summarise() {
      if (st.method === 'lead') return { picks: [0, 1, 2], text: DOC.slice(0, 3).join(' ') };
      if (st.method === 'abs-bad' || st.method === 'abs-good') return { picks: [], text: ABS[st.method === 'abs-bad' ? 'bad' : 'good'] };
      const order = rank.map((r, i) => i).sort((a, b) => rank[b] - rank[a]), picks = [];
      for (const i of order) { if (picks.length >= 3) break; if (st.mmr && picks.some(j => sim(i, j) > 0.9)) continue; picks.push(i); }
      picks.sort((a, b) => a - b);
      return { picks, text: picks.map(i => DOC[i]).join(' ') };
    }
    function facts(text) { const src = words(DOC.join(' ')), ws = words(text); return ws.filter(w => NUMW.includes(w)).filter(w => !src.includes(w)); }
    function draw() {
      const out = summarise(), bad = facts(out.text), mx = Math.max(...rank);
      tiles.forEach((T, i) => { const h = Math.max(0.03, rank[i] / mx * 0.7); T.p.scale.y = h; const on = out.picks.includes(i); T.m.color.set(on ? C.gold : C.teal); T.bm.color.set(on ? '#FFF1C9' : '#FBF8F1'); });
      let q = 0; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const w = Wm[i][j]; dummy.position.set((X(i) + X(j)) / 2, 0.05, 0.5 - 0.42 - Math.abs(i - j) * 0.04); dummy.scale.set(1, w > 0.2 ? Math.abs(X(j) - X(i)) : 0.0001, 1); dummy.rotation.set(0, 0, Math.PI / 2); dummy.updateMatrix(); links.setMatrixAt(q++, dummy.matrix); }
      links.instanceMatrix.needsUpdate = true;
      r1.userData.set({ h: rouge(out.text, 1) * 1.0 }); r2.userData.set({ h: rouge(out.text, 2) * 1.0 });
      truth.userData.set({ color: bad.length ? C.red : C.green, on: true });
      const dup = out.picks.includes(1) && out.picks.includes(2);
      R = { out, r1: rouge(out.text, 1), r2: rouge(out.text, 2), bad, dup, endNews: /next week/.test(out.text) };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Method', options: ['TextRank', 'First 3 sentences', 'Abstractive'], get: () => (st.method === 'textrank' ? 0 : st.method === 'lead' ? 1 : 2), act: i => { st.method = ['textrank', 'lead', 'abs-good'][i]; draw(); } },
      { type: 'toggle', label: 'Skip sentences too like ones already chosen', short: 'redundancy', get: () => st.mmr, set: v => { st.mmr = v; draw(); } },
      { type: 'toggle', label: 'Abstractive model invents a number', short: 'hallucinate', get: () => st.method === 'abs-bad', set: v => { st.method = v ? 'abs-bad' : 'abs-good'; draw(); } },
      { type: 'toggle', label: 'Fact check numbers against the source', short: 'fact check', get: () => st.factCheck, set: v => { st.factCheck = v; draw(); } },
    ];
    const readouts = [
      { label: 'ROUGE-1', get: () => ({ v: R.r1.toFixed(2), sub: 'word overlap with reference', good: R.r1 > 0.6, bad: R.r1 < 0.4 }) },
      { label: 'ROUGE-2', get: () => ({ v: R.r2.toFixed(2), sub: 'two-word overlap' }) },
      { label: 'Facts', get: () => ({ v: !st.factCheck ? 'not checked' : R.bad.length ? `wrong: ${R.bad.join(', ')}` : 'all in the source', good: st.factCheck && !R.bad.length, bad: R.bad.length > 0 || !st.factCheck }) },
    ];
    const labels = [
      { name: 'pillars', t: 'TextRank score', d: 'Tall: shares words with the rest. Gold: picked', icon: 'chart', atV: V(-2.7, 0.2, 0.05) },
      { name: 'board', t: 'Against the reference', d: 'ROUGE counts words, not truth', icon: 'book', atV: V(3.14, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { method: 'textrank', mmr: true, factCheck: true }); draw(); };
    const breaks = [
      { label: 'No redundancy removal', hint: 'Top three by score', on: () => { reset(); st.mmr = false; draw(); }, off: reset },
      { label: 'First three sentences', hint: 'The lead baseline', on: () => { reset(); st.method = 'lead'; draw(); }, off: reset },
      { label: 'An invented number', hint: 'Abstractive summary says twenty', on: () => { reset(); st.method = 'abs-bad'; draw(); }, off: reset },
    ];
    function status() {
      if (R.bad.length) return { ok: false, msg: `<b>Twenty boreholes, not twelve.</b> The abstractive summary reads beautifully and scores ROUGE-1 ${R.r1.toFixed(2)}, almost as high as the faithful version, because only one word differs. But "${R.bad.join(', ')}" appears nowhere in the report. ROUGE counts overlap, not truth; checking numbers and names against the source catches it.` };
      if (st.method === 'lead') return { ok: false, msg: `<b>The news is at the end.</b> Taking the first three sentences works for many news stories, but here the opening is routine, sentences 2 and 3 repeat each other, and the key fact, that work starts next week, comes last. ROUGE-1 is ${R.r1.toFixed(2)}; TextRank reads the whole report.` };
      if (R.dup) return { ok: false, msg: `<b>The same fact twice.</b> Sentences 2 and 3 both say twelve boreholes will be drilled in Nyalenda and Manyatta, so they share many words and rank highest together, and both make the summary${R.endNews ? ', using a third of the space to repeat one fact' : ' while the start date is left out'}. Skipping sentences too similar to ones already chosen leaves room for new information.` };
      if (!R.endNews) return { ok: false, msg: `<b>The news is at the end.</b> Taking the first three sentences works for many news stories, but here the opening is routine and the key fact, that work starts next week, comes last. ROUGE-1 is ${R.r1.toFixed(2)}; TextRank reads the whole report.` };
      return { ok: true, msg: `<b>The gist, and only the truth.</b> ${st.method === 'textrank' ? 'TextRank picks the most central sentences and skips the near-duplicate, so the summary covers the boreholes, the dry taps and the start date' : 'The abstractive summary condenses the report into one sentence'}: ROUGE-1 ${R.r1.toFixed(2)}, and every number appears in the source.` };
    }
    return { update: dt => { r1.userData.tick(dt); r2.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A council report', home: true, say: 'A seven sentence report from a county council meeting in Kisumu. The task: a short summary that keeps what matters.', act: m => m.set({ method: 'textrank', mmr: true, factCheck: true }) },
    { t: 'TextRank', home: true, say: 'TextRank links sentences that share words and ranks them like web pages. The tallest pillars are the most central sentences.', act: m => m.set({}) },
    { t: 'Say it once', home: true, say: 'Without a redundancy check, two sentences that say the same thing both get picked, and the start date is squeezed out.', act: m => m.set({ mmr: false }) },
    { t: 'The lead', home: true, say: 'Taking the first three sentences is a strong habit for news, but here the key fact is at the very end.', act: m => m.set({ mmr: true, method: 'lead' }) },
    { t: 'Writing fresh', home: true, say: 'An abstractive model writes a new sentence. It reads well, and scores well against the reference.', act: m => m.set({ method: 'abs-good' }) },
    { t: 'Overlap is not truth', home: true, say: 'Change twelve boreholes to twenty, and ROUGE hardly moves. Only a fact check against the source catches the invented number.', act: m => m.set({ method: 'abs-bad' }) },
  ],
  check: [
    { q: 'How does TextRank decide which sentences matter?', options: ['Sentences that resemble many other central sentences rank highest', 'It picks the longest sentences', 'It picks the first sentences'], answer: 0, why: 'It applies the PageRank idea to a sentence graph.' },
    { q: 'Why remove redundancy when picking sentences?', options: ['Similar sentences rank together and waste summary space', 'To make sentences shorter', 'To raise ROUGE artificially'], answer: 0, why: 'Skipping near-duplicates leaves room for new facts.' },
    { q: 'Why can a summary with a wrong number still score well on ROUGE?', options: ['ROUGE counts word overlap, not whether facts are true', 'ROUGE ignores numbers by design', 'Numbers are removed first'], answer: 0, why: 'Factuality needs its own check.' },
  ],
  terms: [
    ['Extractive summary', 'A summary made of sentences taken from the source.'],
    ['Abstractive summary', 'A summary written in new words.'],
    ['TextRank', 'Ranking sentences by centrality in a similarity graph.'],
    ['ROUGE', 'Overlap of words or word pairs between a summary and a reference.'],
    ['MMR', 'Maximal marginal relevance: choose relevant items that are not redundant.'],
    ['Hallucination', 'Content in the output that is not supported by the source.'],
  ],
  deeper: '<p><b>Beyond ROUGE.</b> Modern evaluation adds learned similarity scores, question-answering checks (do answers from the summary match answers from the source?) and language-model judges, because overlap misses both good paraphrases and invented facts.</p><p><b>Faithfulness first.</b> For council minutes, medical notes or contracts, an extractive summary that cannot invent anything is often the safer choice.</p><p><b>About this machine.</b> TextRank, ROUGE and the number check are computed exactly on the report; the abstractive summaries are written to show their typical behaviour.</p>',
  code: {
    title: 'TextRank and ROUGE-1',
    note: 'Adapted from the course\'s summarisation lesson.',
    text: `
import math, re

def textrank(sentences, d=0.85, iters=50):
    toks = [set(re.findall(r"[a-z]+", s.lower())) for s in sentences]
    n = len(sentences)
    sim = [[0 if i == j else len(toks[i] & toks[j]) / (math.log(len(toks[i]) + 1) + math.log(len(toks[j]) + 1))
            for j in range(n)] for i in range(n)]
    rank = [1 / n] * n
    for _ in range(iters):
        rank = [(1 - d) / n + d * sum(sim[j][i] / (sum(sim[j]) or 1) * rank[j] for j in range(n)) for i in range(n)]
    return rank

def rouge1_recall(summary, reference):
    s, r = re.findall(r"[a-z]+", summary.lower()), re.findall(r"[a-z]+", reference.lower())
    return sum(min(s.count(w), r.count(w)) for w in set(r)) / len(r)
`,
  },
};
