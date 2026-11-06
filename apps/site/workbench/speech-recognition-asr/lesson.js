// Speech recognition: a CTC model hears "meet at Kejetia" (the big market in Kumasi) as 28 frames. Each column is one frame: the tall bar is its likeliest token, the short bar the runner-up,
// "·" is the blank. Decoding picks a token per frame, merges repeats, drops blanks, and the transcript is scored by word error rate. The frame probabilities are set by hand;
// decoding, collapsing, the small language-model rescoring and WER are computed live. Break it: drop blanks before merging (the double "e" in "meet" collapses),
// greedy with no language model ("meat at"), no voice activity gate (noise at the end becomes letters).
const B = '·';
const FR = [
  ['m', .9, B], ['m', .7, B], ['e', .8, B], [B, .7, 'e'], ['a', .48, 'e', .44], ['t', .85, B], [B, .8, 't'], [' ', .7, B], ['a', .9, 'e'], ['t', .85, 'd'],
  [' ', .75, B], [' ', .6, B], ['k', .8, 'g'], ['e', .8, 'a'], ['j', .8, 'g'], ['j', .6, B], ['e', .75, 'i'], ['t', .85, B], ['t', .6, B], ['i', .8, 'e'],
  ['i', .6, B], ['a', .9, B], ['a', .6, B], [B, .9, 'a'],
  [' ', .34, B, .33, true], ['h', .31, B, .3, true], ['m', .33, 'n', .3, true], ['m', .32, B, .3, true],
];
const REF = 'meet at kejetia';
const LEX = { meet: 0, met: -0.3, meat: -1.5, at: 0, kejetia: 0 }, BIGRAM = { 'meet at': 1.2, 'met at': 0.6, 'meat at': -0.8 };
function collapse(path, blanksFirst) {
  if (blanksFirst) { const nb = path.filter(t => t !== B); return nb.filter((t, i) => t !== nb[i - 1]).join(''); }
  return path.filter((t, i) => t !== path[i - 1]).filter(t => t !== B).join('');
}
const norm = s => s.trim().replace(/\s+/g, ' ');
const lm = s => norm(s).split(' ').reduce((a, w, i, ws) => a + (w in LEX ? LEX[w] : -4) + (i ? BIGRAM[ws[i - 1] + ' ' + w] || 0 : 0), 0);
function wer(hyp, ref) {
  const h = norm(hyp).split(' ').filter(Boolean), r = ref.split(' '), d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

export default {
  slug: 'speech-recognition-asr',
  title: 'Speech recognition: frames to words',
  description: 'A speech model hears "meet at Kejetia", the big market in Kumasi, as 28 short frames. Collapse the repeats, drop the blanks, and let beam search fix the rest.',
  overview: 'A speech recogniser turns frames of a log-mel spectrogram into text. CTC models output a distribution over characters plus a special blank for every frame; to decode, take a token per frame, merge repeated tokens, then remove blanks. The blank is what lets a real double letter survive: "e, blank, e" stays "ee", which is why the order of those two steps matters. CTC treats frames independently, so it has no sense of which words go together; a beam search that keeps several candidates and rescores them with a language model fixes homophones like "meat" and "meet". RNN-T adds a predictor network for that, and attention encoder-decoders such as Whisper generate text token by token. Silence and noise produce invented words unless a voice activity detector gates them out. Quality is measured by word error rate: substitutions, deletions and insertions over the number of reference words.',
  keywords: ['speech recognition', 'asr', 'ctc', 'beam search', 'language model', 'word error rate', 'voice activity detection'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { beam: true, blanksFirst: false, vad: true };
    /* 28 frames as towers: tall is likely, grey is blank; a pale row behind for the runner-up */
    const FX = i => -2.92 + i * 0.216, BH = 0.95;
    const cols = FR.map((f, i) => {
      const a = P.tower(0.14, 0.2, C.teal, { h: 0.3 }), b = P.tower(0.14, 0.14, '#C9C5BA', { h: 0.1 }); [a, b].forEach(t => t.userData.set({ cap: '' })); a.position.set(FX(i), 0, -0.3); b.position.set(FX(i), 0, -0.6); S.add(a, b);
      const cm = new THREE.MeshLambertMaterial({ color: '#E4DED2' }), c = P.box(0.17, 0.08, 0.17, '#fff', { r: 0.02, material: cm }); c.position.set(FX(i), 0, 0.1); S.add(c);
      return { a, b, cm };
    });
    /* the last four frames are noise, on a pale slab */
    const noise = P.box(4 * 0.216, 0.02, 0.84, '#D9D4C8', { r: 0.02 }); noise.position.set(FX(25.5), 0, -0.25); S.add(noise);
    /* the word error rate as a tower */
    const err = P.tower(0.34, 0.34, C.teal, { h: 0.2 }); err.userData.set({ cap: '' }); err.position.set(FX(13.5), 0, 0.55); S.add(err);
    S.add(P.keep(-3.1, 3.1, 1.05, -0.8, 0.8));
    const parts = [...cols.flatMap(c => [c.a, c.b]), err];

    let R = null;
    function decode() {
      const use = FR.map(f => !(st.vad && f[4]));
      const greedy = FR.map(f => f[0]);
      const alt = greedy.slice(); alt[4] = 'e';   // the runner-up at the one close frame
      const cands = [greedy, alt].map(path => { const p = path.map((t, i) => (use[i] ? t : null)).filter(t => t !== null);
        const ac = path.reduce((a, t, i) => a + (use[i] ? Math.log(t === FR[i][0] ? FR[i][1] : FR[i][3] || 0.3) : 0), 0);
        const text = norm(collapse(p, st.blanksFirst)); return { path, text, ac, score: ac + 0.8 * lm(text) }; });
      const best = st.beam ? cands.slice().sort((a, b) => b.score - a.score)[0] : cands[0];
      return { use, best, text: best.text, cands, w: wer(best.text, REF) };
    }
    function draw() {
      R = decode();
      cols.forEach((c, i) => { const f = FR[i], on = R.use[i], tok = R.best.path[i], p1 = f[1], p2 = f[3] || (1 - p1) * 0.6;
        c.a.userData.set({ h: Math.max(0.01, p1 * BH), color: !on ? '#D9D4C8' : f[0] === B ? '#B9B4A8' : C.teal });
        c.b.userData.set({ h: Math.max(0.01, p2 * BH) });
        const prev = R.best.path.slice(0, i).reverse().find((_, k) => R.use[i - 1 - k]);
        const merged = on && tok === prev;
        c.cm.color.set(!on ? '#E4DED2' : tok === B || merged ? '#B9B4A8' : C.gold); });
      err.userData.set({ h: Math.max(0.03, R.w * 0.8), color: R.w > 0 ? C.red : C.teal });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Decoder', options: ['Beam + language model', 'Greedy'], get: () => (st.beam ? 0 : 1), act: i => { st.beam = !i; draw(); } },
      { type: 'buttons', label: 'Collapse order', options: ['Merge, then drop blanks', 'Drop blanks, then merge'], get: () => (st.blanksFirst ? 1 : 0), act: i => { st.blanksFirst = !!i; draw(); } },
      { type: 'toggle', label: 'Voice activity gate', short: 'VAD', get: () => st.vad, set: v => { st.vad = v; draw(); } },
    ];
    const errs = () => { const h = norm(R.text).split(' '), r = REF.split(' '); return { n: Math.round(R.w * r.length), h: h.length, r: r.length }; };
    const readouts = [
      { label: 'Word error rate', get: () => ({ v: `${Math.round(R.w * 100)}%`, sub: 'edits ÷ 3 reference words', good: R.w === 0, bad: R.w > 0 }) },
      { label: 'Words heard', get: () => ({ v: String(errs().h), sub: '3 were said', bad: errs().h !== 3 }) },
      { label: 'Frames used', get: () => ({ v: `${R.use.filter(Boolean).length} of 28`, sub: st.vad ? 'noise gated out' : 'noise included' }) },
    ];
    const labels = [
      { name: 'frames', t: 'Frame scores', d: 'Tall: likeliest. Grey: blank', icon: 'chart', atV: V(-3.04, 0.2, -0.3) },
      { name: 'path', t: 'Collapse', d: 'Gold keeps a letter. Grey merges', icon: 'link', atV: V(3.05, 0.08, 0.1) },
    ];
    const reset = () => { Object.assign(st, { beam: true, blanksFirst: false, vad: true }); draw(); };
    const breaks = [
      { label: 'Drop blanks first', hint: 'Wrong collapse order', on: () => { reset(); st.blanksFirst = true; draw(); }, off: reset },
      { label: 'Greedy, no language model', hint: 'One close frame', on: () => { reset(); st.beam = false; draw(); }, off: reset },
      { label: 'No voice activity gate', hint: 'Noise at the end', on: () => { reset(); st.vad = false; draw(); }, off: reset },
    ];
    function status() {
      const p = Math.round(R.w * 100);
      if (st.blanksFirst) return { ok: false, msg: `<b>The double "e" collapsed.</b> The frames read m, m, e, blank, e. Merging repeats first keeps both e's, because the blank stands between them; dropping blanks first leaves m, m, e, e, which merges to one e: "${R.text}". Word error rate ${p}%. Merge repeats, then remove blanks.` };
      if (!st.beam) return { ok: false, msg: `<b>"Meat at Kejetia".</b> At frame 5 the model is torn between "a" (0.48) and "e" (0.44). Greedy decoding takes the top token at every frame and knows nothing about words, so it writes "${R.text}". Word error rate ${p}%. A beam keeps both and a language model, which knows "meet at" is far likelier, picks the right one.` };
      if (!st.vad) return { ok: false, msg: `<b>Noise became words.</b> The last four frames are market noise with no speech. Ungated, each still gets its likeliest letter, and they decode to extra text: "${R.text}". Word error rate ${p}% from the insertion. Gate the audio with a voice activity detector so silence and noise never reach the decoder.` };
      return { ok: true, msg: `<b>"${R.text}", word error rate ${p}%.</b> The beam keeps "meat" and "meet", and the language model picks "meet at"; repeats merge before blanks drop, so the double "e" survives; the voice activity gate keeps the noise out.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Frames', home: true, say: 'Someone in Kumasi says: meet at Kejetia. The model hears twenty-eight short frames and scores every letter, plus a blank, for each one.', act: m => m.set({ beam: true, blanksFirst: false, vad: true }) },
    { t: 'Collapse', home: true, say: 'Take a token per frame, merge repeats, then drop blanks. The blank between the two e\'s keeps "meet" spelled right.', act: m => m.set({}) },
    { t: 'Order matters', home: true, say: 'Drop the blanks first, and the two e\'s merge into one. "Meet" becomes "met".', act: m => m.set({ blanksFirst: true }) },
    { t: 'One close call', home: true, say: 'At one frame the model can\'t decide between a and e. Greedy decoding picks a, and writes "meat at Kejetia".', act: m => m.set({ blanksFirst: false, beam: false }) },
    { t: 'A language model', home: true, say: 'A beam keeps both spellings, and a language model knows "meet at" is far likelier. Word error rate falls to zero.', act: m => m.set({ beam: true }) },
    { t: 'Gate the noise', home: true, say: 'Without a voice activity gate, market noise at the end turns into extra letters, and an extra word.', act: m => m.set({ vad: false }) },
  ],
  check: [
    { q: 'How is a CTC frame sequence turned into text?', options: ['Merge repeated tokens, then remove blanks', 'Remove blanks, then merge repeats', 'Keep every frame\'s token'], answer: 0, why: 'The blank keeps real double letters apart.' },
    { q: 'Why add a language model to CTC decoding?', options: ['CTC treats frames independently and knows nothing about which words go together', 'To make audio louder', 'To remove blanks'], answer: 0, why: 'It fixes homophones like meat and meet.' },
    { q: 'Word error rate counts…', options: ['Substitutions, deletions and insertions over reference words', 'Only misspelled letters', 'Seconds of audio'], answer: 0, why: 'Extra words count as insertions.' },
  ],
  terms: [
    ['ASR', 'Automatic speech recognition: audio to text.'],
    ['CTC', 'A per-frame output with a blank token, collapsed into text.'],
    ['Blank', 'A token meaning "no new letter here".'],
    ['Beam search', 'Keeping several candidate transcripts and rescoring them.'],
    ['Word error rate', 'Edits needed to match the reference, divided by its length.'],
    ['Voice activity detection', 'Finding the parts of audio that contain speech.'],
  ],
  deeper: '<p><b>Three designs.</b> CTC is fast and streams, but needs a language model; RNN-T adds a predictor so it models token order and still streams; attention encoder-decoders like Whisper give the best offline accuracy but generate one token at a time and need chunking for long audio.</p><p><b>Place names and languages.</b> Kejetia, Kantamanto and Makola are rarely in general training text, and speakers mix English with Twi. Add local words to the language model, and test on the speech people really use.</p><p><b>About this machine.</b> The frame probabilities are set by hand. Collapsing, the two-candidate beam with a tiny word language model, the voice activity gate and word error rate are computed live.</p>',
  code: {
    title: 'Greedy CTC decoding and WER',
    note: 'Adapted from the course\'s speech recognition lesson.',
    text: `
def ctc_greedy(frame_probs, vocab, blank=0):
    best = frame_probs.argmax(axis=1)
    out, prev = [], None
    for t in best:
        if t != prev and t != blank:          # merge repeats, then drop blanks
            out.append(vocab[t])
        prev = t
    return "".join(out)

def wer(hyp, ref):
    h, r = hyp.split(), ref.split()
    d = [[i + j if i * j == 0 else 0 for j in range(len(h) + 1)] for i in range(len(r) + 1)]
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (r[i-1] != h[j-1]))
    return d[-1][-1] / len(r)
`,
  },
};
