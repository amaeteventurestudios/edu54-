// Multilingual NLP: one sentiment model for customer messages in English, Swahili, Hausa, Yoruba, Amharic and isiZulu. Left: the shared embedding space,
// where a complaint and a compliment in every language land near their meaning. Right: accuracy per language. Fine-tune on one source language,
// add a few Amharic examples, and read each language separately. Accuracies come from a small illustrative formula (coverage, similarity to the source, few-shot data).
// Break it: report only the average (a big English test set hides Amharic), learning rate too high (the space falls apart for languages without examples),
// an English-only tokenizer (Amharic's Ge'ez script becomes unknown tokens).
const LANGS = [
  { k: 'en', n: 'English', c: '#3B3F8F', cov: 1, script: 'latin', w: 6 },
  { k: 'sw', n: 'Swahili', c: '#1F9E89', cov: 0.62, script: 'latin', w: 1 },
  { k: 'ha', n: 'Hausa', c: '#E07B39', cov: 0.48, script: 'latin', w: 1 },
  { k: 'yo', n: 'Yoruba', c: '#C2185B', cov: 0.42, script: 'latin', w: 1 },
  { k: 'am', n: 'Amharic', c: '#5E9E2F', cov: 0.36, script: 'geez', w: 1 },
  { k: 'zu', n: 'isiZulu', c: '#8D6E63', cov: 0.42, script: 'latin', w: 1 },
];
// rough structural similarity between source and target (illustrative): Swahili and isiZulu are both Bantu languages
const SIM = { en: { en: 1, sw: 0.3, ha: 0.25, yo: 0.25, am: 0.2, zu: 0.3 }, sw: { en: 0.3, sw: 1, ha: 0.3, yo: 0.35, am: 0.2, zu: 0.85 } };
const SHOTS = [0, 100, 500], GAIN = [0, 0.6, 0.85];
function accuracy(st) {
  return LANGS.map(L => {
    let a = L.k === st.src ? 91 : 50 + 40 * L.cov * (0.55 + 0.45 * SIM[st.src][L.k]);
    if (L.k === 'am') a += (0.95 * 91 - a) * GAIN[st.shots];
    if (st.hiLR && st.shots && L.k !== st.src && L.k !== 'am') a = 50 + (a - 50) * 0.3;   // alignment collapses for languages with no examples
    if (st.enTok && L.script === 'geez') a = 51; else if (st.enTok && L.k !== 'en') a -= 4;   // unknown tokens; Latin-script words split into many pieces
    return Math.round(a);
  });
}

export default {
  slug: 'multilingual-nlp',
  title: 'Multilingual: one model, many languages',
  description: 'One sentiment model reads customer messages in English, Swahili, Hausa, Yoruba, Amharic and isiZulu. Teach it in one language, add a few Amharic examples, and read the score for each language. Then report only the average, push the learning rate too high, or use an English-only tokenizer.',
  overview: 'Multilingual models are trained on text in a hundred or more languages with one shared vocabulary of subword pieces. They learn a shared space where sentences with the same meaning sit close together whatever the language, so a classifier fine-tuned on one language works, less well, on others: zero-shot cross-lingual transfer. It works best for languages close to the source and well covered in pretraining. A few hundred labelled examples in the target language close most of the gap, if the learning rate stays low; too high, and the shared space falls apart. The source language matters: a close relative can beat English. And a tokenizer that does not cover a script turns it into unknown tokens. Always report accuracy per language, because the average hides the long tail.',
  keywords: ['multilingual nlp', 'cross-lingual transfer', 'xlm-r', 'few-shot fine-tuning', 'low-resource languages', 'tokenization'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.1, 0.4, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { src: 'en', shots: 0, hiLR: false, enTok: false, avg: false };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    /* the shared space: a glass box with two meanings */
    const CX = -1.75, CY = 0.95, BS = 1.6;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, BS, 1.5), new THREE.MeshBasicMaterial({ color: '#BFD8E8', transparent: true, opacity: 0.18, depthWrite: false })); glass.position.set(CX, 0.12 + BS / 2, 0); glass.layers.set(1); S.add(glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: '#7A8A99' })); edges.position.copy(glass.position); edges.layers.set(1); S.add(edges);
    const wall = P.box(2.6, BS, 0.04, '#FBF8F1', { r: 0.02, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); wall.position.set(CX, 0.12, -0.77); S.add(wall);
    const tl = S.text('Shared meaning space', { size: 0.11, weight: 800, face: 'front', color: ink }); tl.position.set(CX, 0.12 + BS - 0.13, -0.745); S.add(tl);
    const MEAN = [{ n: 'complaint', x: CX - 0.72 }, { n: 'praise', x: CX + 0.72 }];
    MEAN.forEach(m => { const t = S.text(m.n, { size: 0.1, weight: 800, face: 'front', color: '#5A5A66' }); t.position.set(m.x, 0.12 + BS - 0.33, -0.745); S.add(t); });
    const OFF = LANGS.map((L, i) => { const a = i / LANGS.length * Math.PI * 2; return [Math.cos(a) * 0.17, Math.sin(a) * 0.15, Math.sin(a * 2) * 0.12]; });
    const SCAT = LANGS.map((L, i) => [[-0.5 + (i % 3) * 0.5, -0.3 + Math.floor(i / 3) * 0.6, 0.35], [0.4 - (i % 3) * 0.45, 0.25 - Math.floor(i / 3) * 0.5, -0.3]]);
    const balls = LANGS.map((L, i) => MEAN.map((m, j) => { const b = P.ball(0.09, L.c); b.userData.noFit = true; S.add(b); return { b, i, j, cur: new THREE.Vector3(), goal: new THREE.Vector3() }; })).flat();
    /* accuracy per language */
    const AX = i => 0.45 + i * 0.5, AZ = 0.1, AH = 1.6;
    const frame = P.box(3.2, AH + 0.25, 0.04, '#FBF8F1', { r: 0.02, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); frame.position.set(AX(2.5), 0.12, -0.45); S.add(frame);
    const at = S.text('Accuracy per language', { size: 0.11, weight: 800, face: 'front', color: ink }); at.position.set(AX(2.5), 0.12 + AH + 0.12, -0.425); S.add(at);
    const yA = a => (a - 40) / 60 * AH;   // 40% at the floor, 100% at the top
    const line = P.box(3.15, 0.015, 0.02, '#D64545', { r: 0.005 }); line.position.set(AX(2.5), 0.12 + yA(80), -0.42); line.layers.set(1); S.add(line);
    const lt = S.text('80% target', { size: 0.075, weight: 700, face: 'front', color: '#D64545' }); lt.position.set(AX(5) + 0.08, 0.12 + yA(80) + 0.07, -0.42); S.add(lt);
    const cols = LANGS.map((L, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: L.c }), col = P.box(0.32, 1, 0.32, L.c, { r: 0.02, material: mm }); col.position.set(AX(i), 0.12, AZ); col.userData.noFit = true; S.add(col);
      const nm = S.text(L.n, { size: 0.09, weight: 800, face: 'front', color: ink, maxW: 0.46 }); nm.position.set(AX(i), 0.24, AZ + 0.33); S.add(nm);
      const pl = P.box(0.48, 0.24, 0.12, '#FBF8F1', { r: 0.02 }); pl.position.set(AX(i), 0.12, AZ + 0.26); S.add(pl);
      const v = S.text('', { size: 0.115, weight: 800, face: 'front', color: ink }); v.position.set(AX(i), 0.4, AZ); v.userData.noFit = true; S.add(v);
      return { col, mm, v };
    });
    const avgBar = P.box(2.6, 1, 0.32, '#8A8578', { r: 0.02 }); avgBar.position.set(AX(2.5), 0.12, AZ); avgBar.userData.noFit = true; S.add(avgBar);
    const avgT = S.text('', { size: 0.12, weight: 800, face: 'front', color: '#FFFFFF' }); avgT.userData.noFit = true; S.add(avgT);
    const keepH = P.box(0.3, yA(100), 0.3, '#000', {}); keepH.material = new THREE.MeshBasicMaterial({ visible: false }); keepH.position.set(AX(5), 0.12, AZ); S.add(keepH);

    let A = [], AVG = 0;
    function draw() {
      A = accuracy(st);
      AVG = Math.round(A.reduce((s, a, i) => s + a * LANGS[i].w, 0) / LANGS.reduce((s, L) => s + L.w, 0));
      cols.forEach((c, i) => { const h = Math.max(0.01, yA(A[i])); c.col.scale.y = h; c.col.visible = !st.avg; c.v.visible = !st.avg; c.v.userData.set(`${A[i]}%`); c.v.position.set(AX(i), 0.12 + h + 0.09, AZ + 0.17); });
      avgBar.visible = st.avg; avgT.visible = st.avg; const ha = yA(AVG); avgBar.scale.y = ha; avgT.userData.set(`All languages: ${AVG}%`); avgT.position.set(AX(2.5), 0.12 + ha / 2, AZ + 0.165);
      // in the space, a language sits near its meaning in proportion to how well it is aligned
      balls.forEach(B => { const L = LANGS[B.i], al = Math.max(0, Math.min(1, (A[B.i] - 50) / 41)), m = MEAN[B.j], o = OFF[B.i], s = SCAT[B.i][B.j];
        const near = new THREE.Vector3(m.x + o[0], CY + 0.05 + o[1], o[2]), far = new THREE.Vector3(CX + s[0] * 1.6, CY + s[1], s[2]);
        B.goal.copy(far).lerp(near, al); });
    }
    draw(); balls.forEach(B => { B.cur.copy(B.goal); B.b.position.copy(B.cur); });
    const update = dt => balls.forEach(B => { B.cur.lerp(B.goal, Math.min(1, dt * 3)); B.b.position.copy(B.cur); });
    const controls = [
      { type: 'buttons', label: 'Fine-tune on', options: ['English', 'Swahili'], get: () => (st.src === 'en' ? 0 : 1), act: i => { st.src = i ? 'sw' : 'en'; draw(); } },
      { type: 'buttons', label: 'Amharic examples', options: ['0', '100', '500'], get: () => st.shots, act: i => { st.shots = i; draw(); } },
      { type: 'toggle', label: 'Learning rate too high', short: 'high rate', get: () => st.hiLR, set: v => { st.hiLR = v; draw(); } },
      { type: 'toggle', label: 'English-only tokenizer', short: 'English tokens', get: () => st.enTok, set: v => { st.enTok = v; draw(); } },
      { type: 'buttons', label: 'Report', options: ['Per language', 'Average only'], get: () => (st.avg ? 1 : 0), act: i => { st.avg = !!i; draw(); } },
    ];
    const worst = () => { const i = A.indexOf(Math.min(...A)); return { n: LANGS[i].n, a: A[i] }; };
    const readouts = [
      { label: 'Average', get: () => ({ v: `${AVG}%`, sub: 'English test set is biggest' }) },
      { label: 'Weakest language', get: () => ({ v: `${worst().a}%`, sub: worst().n, bad: worst().a < 70, good: worst().a >= 80 }) },
      { label: 'Below 80%', get: () => ({ v: String(A.filter(a => a < 80).length), sub: 'of six languages', bad: A.filter(a => a < 80).length > 2 }) },
    ];
    const labels = [
      { name: 'space', t: 'Shared space', d: 'Same meaning, any language', icon: 'spark', atV: V(CX - 1.3, 0.12 + BS / 2, 0) },
      { name: 'acc', t: 'Accuracy per language', d: 'Red line: the 80% target', icon: 'scale', atV: V(AX(5) + 0.3, 0.12 + AH / 2, -0.45) },
    ];
    const reset = () => { Object.assign(st, { src: 'en', shots: 0, hiLR: false, enTok: false, avg: false }); draw(); };
    const breaks = [
      { label: 'Average only', hint: 'One number for all', on: () => { reset(); st.avg = true; draw(); }, off: reset },
      { label: 'Learning rate too high', hint: 'With 500 Amharic examples', on: () => { reset(); st.shots = 2; st.hiLR = true; draw(); }, off: reset },
      { label: 'English-only tokenizer', hint: 'Look at Amharic', on: () => { reset(); st.enTok = true; draw(); }, off: reset },
    ];
    function status() {
      const am = A[4], w = worst();
      if (st.enTok) return { ok: false, msg: `<b>Amharic became unknown tokens.</b> Amharic is written in the Ge'ez script, which an English-only vocabulary does not contain, so every word turns into the same unknown token and the model guesses: ${am}%, a coin toss. The other languages lose a little too, their words split into many tiny pieces. A multilingual tokenizer trained on all the scripts fixes it.` };
      if (st.hiLR && st.shots) return { ok: false, msg: `<b>Amharic improved, everyone else fell.</b> Fine-tuning on ${SHOTS[st.shots]} Amharic examples with a high learning rate lifts Amharic to ${am}%, but it pulls the shared space apart: Swahili falls to ${A[1]}% and Hausa to ${A[2]}%. Keep the learning rate low (around 2e-5) so the alignment survives.` };
      if (st.avg) return { ok: false, msg: `<b>${AVG}% overall sounds nearly there, and hides the problem.</b> The English test set is six times bigger than the others, so it dominates the average. Per language, ${w.n} sits at ${w.a}%, and ${A.filter(a => a < 80).length} of six languages miss the 80% target. Report every language separately.` };
      return { ok: true, msg: `<b>Fine-tuned on ${st.src === 'en' ? 'English' : 'Swahili'}${st.shots ? `, plus ${SHOTS[st.shots]} Amharic examples` : ''}.</b> ${st.src === 'sw' ? `isiZulu, a Bantu relative of Swahili, reaches ${A[5]}%, against ${accuracy({ ...st, src: 'en' })[5]}% when taught in English: a close source language can beat a big one. ` : 'Languages close to the source and well covered in pretraining transfer best. '}Weakest: ${w.n} at ${w.a}%.${!st.shots ? ' A few hundred Amharic examples would close most of its gap.' : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Six languages', home: true, say: 'One model reads customer messages in English, Swahili, Hausa, Yoruba, Amharic and isiZulu. It was taught with English examples only.', act: m => m.set({ src: 'en', shots: 0, hiLR: false, enTok: false, avg: false }) },
    { t: 'A shared space', home: true, say: 'Pretrained on many languages, it puts a complaint near other complaints, whatever the language. That is why English training transfers at all.', act: m => m.set({}) },
    { t: 'The average lies', home: true, say: 'Report one average and it looks fine. The English test set is biggest, and it hides Amharic far below the target.', act: m => m.set({ avg: true }) },
    { t: 'A few examples', home: true, say: 'Add five hundred labelled Amharic messages, with a gentle learning rate, and Amharic closes most of its gap.', act: m => m.set({ avg: false, shots: 2 }) },
    { t: 'Pick the source', home: true, say: 'Teach in Swahili instead, and isiZulu, a Bantu relative, jumps. A close source language can beat English.', act: m => m.set({ src: 'sw' }) },
    { t: 'Tokens matter', home: true, say: 'Use an English-only tokenizer, and Amharic\'s script becomes unknown tokens. The model is reduced to guessing.', act: m => m.set({ src: 'en', shots: 0, enTok: true }) },
  ],
  check: [
    { q: 'Why can a model fine-tuned in English classify Swahili at all?', options: ['Pretraining on many languages puts the same meaning close together', 'Swahili and English share grammar', 'It translates everything first'], answer: 0, why: 'This is zero-shot cross-lingual transfer.' },
    { q: 'Why report accuracy for each language separately?', options: ['The average hides weak languages with small test sets', 'It makes the numbers higher', 'Averages are hard to compute'], answer: 0, why: 'The long tail disappears in an average.' },
    { q: 'What happens when the fine-tuning learning rate is too high?', options: ['The shared space falls apart and other languages drop', 'Training stops at once', 'Every language improves'], answer: 0, why: 'Alignment between languages is fragile.' },
  ],
  terms: [
    ['Multilingual model', 'One model pretrained on text in many languages.'],
    ['Cross-lingual transfer', 'Using training in one language to work in another.'],
    ['Zero-shot', 'With no labelled examples in the target language.'],
    ['Few-shot', 'With a small number of target-language examples.'],
    ['Source language', 'The language of the labelled training data.'],
    ['Tokenization tax', 'Extra or unknown tokens for poorly covered languages and scripts.'],
  ],
  deeper: '<p><b>Models.</b> XLM-R covers about a hundred languages and is the usual starting point for classification; NLLB-200 translates two hundred, including many African languages; AfroXLMR and similar models adapt the shared space to African languages.</p><p><b>Data.</b> Community projects across the continent build labelled data for languages from Twi to Tigrinya. A few hundred careful examples matter more than any setting.</p><p><b>About this machine.</b> The accuracies come from a small illustrative formula using rough pretraining coverage, similarity to the source and few-shot data. They show the shape of real results, not measurements.</p>',
  code: {
    title: 'Zero-shot classification in any language',
    note: 'Adapted from the course\'s multilingual NLP lesson.',
    text: `
from transformers import pipeline

clf = pipeline("zero-shot-classification", model="joeddav/xlm-roberta-large-xnli")
labels = ["complaint", "praise"]

for msg in ["The bus was late again.",
            "Basi lilichelewa tena.",          # Swahili
            "Bas ɗin ya yi jinkiri kuma."]:     # Hausa
    out = clf(msg, candidate_labels=labels)
    print(msg, "->", out["labels"][0])
`,
  },
};
