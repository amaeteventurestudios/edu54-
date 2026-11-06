// Audio language models: a radio archive in Dakar asks questions about old recordings. A cascade transcribes with Whisper and lets a language model read the text; an
// end-to-end model feeds the audio encoder's features through an adaptor straight into the language model. The encoder is speech-only (Whisper) or trained on speech, sound
// and music (AF-Whisper style). Overall scores follow the reported MMAU pattern (SALMONN about 0.55, Qwen-Audio about 0.60, Audio Flamingo 3 about 0.72, thinking adds a few
// points); the cascade's score and the answers are illustrative.
// Break it: a cascade on a music question, a cascade on "who is speaking", a speech-only encoder on music.
const QS = [
  { q: 'What is the interview about?', kind: 'speech', right: 'Rebuilding the fishing pier at Soumbédioune' },
  { q: 'Which instrument leads?', kind: 'music', right: 'A kora, with a sabar drum behind' },
  { q: 'Is the crowd cheering or alarmed?', kind: 'sound', right: 'Cheering: a goal at the stadium' },
  { q: 'Who speaks last, host or guest?', kind: 'voice', right: 'The guest, the older woman' },
];
function answer(st) {
  const k = QS[st.q].kind;
  if (st.cascade) {
    if (k === 'speech') return { ok: true, txt: QS[st.q].right };
    if (k === 'music') return { ok: false, txt: 'The transcript is empty: "[music]"' };
    if (k === 'sound') return { ok: false, txt: 'The transcript says "[crowd noise]": cannot tell' };
    return { ok: false, txt: 'The transcript has words but no voices: cannot tell' };
  }
  if (!st.wide && k === 'music') return { ok: false, txt: 'A guitar (the encoder barely heard music)' };
  if (!st.wide && k === 'sound') return { ok: !!st.think, txt: st.think ? 'Cheering, probably: a goal' : 'Unsure: loud voices' };
  return { ok: true, txt: QS[st.q].right };
}
function score(st) { if (st.cascade) return 0.42; return (st.wide ? 0.72 : 0.6) + (st.think ? 0.04 : 0); }

export default {
  slug: 'audio-language-whisper-to-af3',
  title: 'Audio models: hear more than words',
  description: 'A radio archive in Dakar asks questions about old recordings: what an interview is about, which instrument leads, whether a crowd is cheering, who speaks last. Compare transcribing first with feeding the sound straight in, and a speech-only encoder with one trained on music and sound too. Then ask a transcript about music, about voices, or give a speech encoder a song.',
  overview: 'Every audio model starts from a log-Mel spectrogram: the sound resampled to 16 kHz, cut into 25-millisecond windows every 10 milliseconds, turned into frequencies and warped onto 80 bands that follow human hearing, then log-compressed. A cascade runs Whisper to get a transcript and lets a language model reason over the text. That is cheap and fine for "summarise this interview", but the transcript throws away everything that is not words: the instrument, the mood of a crowd, which voice is speaking, when a sound happens. An end-to-end audio language model keeps the sound: an audio encoder\'s frames go through a Q-former or small adaptor into the language model as tokens. SALMONN combined Whisper with BEATs, an encoder trained on general audio; Qwen-Audio trained on richer data; Audio Flamingo 3 retrained the Whisper encoder on speech, sound and music together and reached about 0.72 on the MMAU reasoning benchmark, near the best closed models, and can think before answering for a few more points.',
  keywords: ['audio language model', 'whisper', 'audio flamingo 3', 'log-mel spectrogram', 'cascade', 'mmau'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { cascade: false, wide: true, think: false, q: 1 };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* the spectrogram: time across, 16 Mel bands deep */
    const NT = 36, NB = 16, CW = 1.5 / NT, CD = 1.1 / NB;
    const fr = P.box(1.6, 0.05, 1.2, '#1B1D2A', { r: 0.03 }); fr.position.set(-2.05, 0.12, 0.05); S.add(fr);
    const geo = new THREE.BoxGeometry(CW * 0.92, 1, CD * 0.9); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), NT * NB); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const spT = S.text('Log-Mel spectrogram', { size: 0.11, weight: 800, color: ink }); spT.position.set(-2.05, 0.13, -0.72); S.add(spT);
    /* encoders */
    const enc = (z, name, col) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(0.9, 0.28, 0.5, col, { r: 0.04, material: mm }); b.position.set(-0.6, 0.12, z); S.add(b);
      const t = S.text(name, { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 0.84 }); t.position.set(-0.6, 0.41, z); S.add(t); return { mm, t }; };
    const encA = enc(-0.3, 'Speech', '#3A6FB0'), encB = enc(0.4, 'Sound + music', '#1F9E89');
    const encT = S.text('Audio encoder', { size: 0.11, weight: 800, color: ink }); encT.position.set(-0.6, 0.13, -0.72); S.add(encT);
    /* the bridge: a transcript card or adaptor tokens */
    const tr = P.box(0.9, 0.05, 0.9, '#FBF8F1', { r: 0.03 }); tr.position.set(0.55, 0.12, 0.05); tr.userData.noFit = true; S.add(tr);
    const trT = S.text('', { size: 0.12, weight: 800, color: ink, maxW: 0.84 }); trT.position.set(0.55, 0.18, 0.05); trT.userData.noFit = true; S.add(trT);
    const qg = new THREE.BoxGeometry(0.14, 0.14, 0.14), qs = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(qg, new THREE.MeshLambertMaterial({ color: '#B07AA1' })); m.position.set(0.37 + (i % 2) * 0.36, 0.2, -0.35 + Math.floor(i / 2) * 0.27); m.userData.noFit = true; S.add(m); return m; });
    const brT = S.text('', { size: 0.11, weight: 800, color: ink }); brT.position.set(0.55, 0.13, -0.72); S.add(brT);
    /* the language model */
    const llm = P.box(1.0, 0.45, 1.2, C.plum, { r: 0.06 }); llm.position.set(1.75, 0.12, 0.05); S.add(llm);
    const lT = S.text('Language model', { size: 0.13, weight: 800, color: '#FFFFFF', maxW: 0.92 }); lT.position.set(1.75, 0.58, 0.05); S.add(lT);
    const thinkT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); thinkT.position.set(1.75, 0.8, -0.4); thinkT.userData.noFit = true; S.add(thinkT);
    /* question at the back, answer at the front */
    const qCard = P.box(3.2, 0.05, 0.36, '#FBF8F1', { r: 0.03 }); qCard.position.set(0.9, 0.12, -1.05); S.add(qCard);
    const qT = S.text('', { size: 0.13, weight: 800, color: '#6B5E86', maxW: 3.1 }); qT.position.set(0.9, 0.18, -1.05); S.add(qT);
    const card = P.box(4.4, 0.05, 0.46, '#FBF8F1', { r: 0.03 }); card.position.set(0.2, 0.12, 1.15); S.add(card);
    const ans = S.text('', { size: 0.14, weight: 800, color: ink, maxW: 4.3 }); ans.position.set(0.2, 0.18, 1.15); S.add(ans);
    const pipes = [0, 1, 2].map(() => { const mm = new THREE.MeshBasicMaterial({ color: '#6B5E86' }), t = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.025, '#6B5E86', { material: mm }); t.layers.set(1); t.userData.noFit = true; S.add(t); return { t, mm }; });
    const setPipe = (p, a, b, col, on) => { p.t.visible = !!on; p.t.geometry.dispose(); p.t.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 4, 0.025, 6, false); p.mm.color.set(col); };

    let A = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function paint() { const k = QS[st.q].kind;
      for (let t = 0; t < NT; t++) for (let b = 0; b < NB; b++) { let e;
        if (k === 'speech') e = (Math.sin(t * 0.9) > -0.3 ? 1 : 0.15) * (Math.exp(-((b - 3 - Math.sin(t * 0.7) * 1.5) ** 2) / 3) + 0.7 * Math.exp(-((b - 8 - Math.cos(t * 0.5)) ** 2) / 4));
        else if (k === 'music') e = [2, 4, 6, 8, 10].reduce((a, h) => a + Math.exp(-((b - h) ** 2) / 0.6) * (0.6 + 0.4 * Math.sin(t * 0.6 + h)), 0) + (t % 6 === 0 ? 0.6 : 0);
        else if (k === 'sound') e = 0.45 + 0.35 * Math.abs(Math.sin(t * 2.3 + b * 1.7)) * (t > 18 ? 1.5 : 0.8);
        else e = Math.exp(-((b - (t < 18 ? 3 : 6) - Math.sin(t) * 0.8) ** 2) / 2.5) * (Math.sin(t * 1.1) > -0.4 ? 1 : 0.2);
        e = Math.min(1, e); const x = -2.05 - 0.75 + (t + 0.5) * CW, z = 0.05 + 0.55 - (b + 0.5) * CD;
        m4.makeScale(1, 0.02 + e * 0.12, 1).setPosition(x, 0.15, z); im.setMatrixAt(t * NB + b, m4); im.setColorAt(t * NB + b, col.setHSL(0.72 - e * 0.62, 0.85, 0.2 + e * 0.45)); }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    function draw() {
      A = answer(st); paint();
      encB.mm.color.set(st.wide ? '#1F9E89' : '#C9C3B5'); encB.t.userData.set(st.wide ? 'Sound + music' : 'Not trained', '#FFFFFF');
      tr.visible = !!st.cascade; trT.visible = !!st.cascade; qs.forEach(q => { q.visible = !st.cascade; });
      const k = QS[st.q].kind;
      trT.userData.set(k === 'music' ? '[music]' : k === 'sound' ? '[crowd\nnoise]' : k === 'voice' ? '"...so we\nstayed."\n"Thank you."' : '"The pier\nwill be\nrebuilt"');
      brT.userData.set(st.cascade ? 'Transcript' : 'Adaptor tokens');
      setPipe(pipes[0], V(-1.25, 0.3, 0.05), V(-1.05, 0.3, -0.2), '#6B5E86', true);
      setPipe(pipes[1], V(-1.25, 0.3, 0.05), V(-1.05, 0.3, 0.35), '#6B5E86', st.wide);
      setPipe(pipes[2], V(1.0, 0.3, 0.05), V(1.25, 0.3, 0.05), '#6B5E86', true);
      thinkT.visible = !!st.think; thinkT.userData.set('Thinking: first, what can I hear?');
      qT.userData.set(`Q: ${QS[st.q].q}`);
      ans.userData.set(A.txt, A.ok ? ink : '#8A1F1F');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Question', options: ['Topic', 'Instrument', 'Crowd', 'Who speaks'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'buttons', label: 'Pipeline', options: ['Transcribe first', 'Sound straight in'], get: () => (st.cascade ? 0 : 1), act: i => { st.cascade = !i; draw(); } },
      { type: 'buttons', label: 'Encoder trained on', options: ['Speech only', 'Speech, sound, music'], get: () => (st.wide ? 1 : 0), act: i => { st.wide = !!i; draw(); } },
      { type: 'buttons', label: 'Think first', options: ['Off', 'On'], get: () => (st.think ? 1 : 0), act: i => { st.think = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'This answer', get: () => ({ v: A.ok ? 'Right' : 'Wrong', sub: QS[st.q].kind === 'speech' ? 'about the words' : 'about the sound itself', good: A.ok, bad: !A.ok }) },
      { label: 'Benchmark', get: () => ({ v: score(st).toFixed(2), sub: 'MMAU-style, reported pattern', good: score(st) >= 0.7, bad: score(st) < 0.5 }) },
      { label: 'Kept', get: () => ({ v: st.cascade ? 'Words' : 'Sound', sub: st.cascade ? 'tone, music and voices dropped' : 'encoder frames as tokens' }) },
    ];
    const labels = [
      { name: 'spec', t: 'The sound', d: 'Time across, pitch bands deep', icon: 'wave', atV: V(-2.86, 0.2, 0.05) },
      { name: 'llm', t: 'Language model', d: 'Reads a transcript or audio tokens', icon: 'book', atV: V(2.26, 0.3, 0.05) },
    ];
    const reset = () => { Object.assign(st, { cascade: false, wide: true, think: false, q: 1 }); draw(); };
    const breaks = [
      { label: 'Transcript for a song', hint: 'Cascade, instrument question', on: () => { reset(); st.cascade = true; draw(); }, off: reset },
      { label: 'Transcript for voices', hint: 'Cascade, who speaks', on: () => { reset(); st.cascade = true; st.q = 3; draw(); }, off: reset },
      { label: 'Speech-only encoder on music', hint: 'Whisper alone', on: () => { reset(); st.wide = false; draw(); }, off: reset },
    ];
    function status() {
      const k = QS[st.q].kind;
      if (st.cascade && k === 'music') return { ok: false, msg: `<b>The transcript is just "[music]".</b> Transcribing first keeps only words, and a kora solo has none, so the language model has nothing to go on. Feed the sound itself into the model through an audio encoder.` };
      if (st.cascade && k === 'voice') return { ok: false, msg: `<b>The words are there; the voices are not.</b> A transcript records what was said but not who said it, so "host or guest" cannot be answered. Speaker identity lives in the sound: keep it with an end-to-end model.` };
      if (st.cascade && k === 'sound') return { ok: false, msg: `<b>"[crowd noise]" says nothing about mood.</b> Cheering and alarm sound different but transcribe the same. Send the audio in directly.` };
      if (!A.ok && !st.wide) return { ok: false, msg: `<b>It hears a guitar.</b> An encoder trained mostly on speech has learned little about instruments, so its features blur a kora into something familiar. Use an encoder trained on speech, sound and music together, as Audio Flamingo 3 does.` };
      if (st.cascade) return { ok: true, msg: `<b>The cascade is fine here.</b> "What is the interview about?" depends only on the words, so transcribing first is cheap and accurate. It fails as soon as the question is about the sound.` };
      return { ok: true, msg: `<b>${A.txt}.</b> The encoder's frames pass through the adaptor as tokens, so the language model hears the sound itself, not only words. Benchmark about ${score(st).toFixed(2)}${st.think ? ', with a few points from thinking first' : ''}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The archive', home: true, say: 'A radio archive in Dakar asks questions about old recordings. This one is music: which instrument leads?', act: m => m.set({ cascade: false, wide: true, think: false, q: 1 }) },
    { t: 'The spectrogram', home: true, say: 'Sound becomes a log-Mel spectrogram: time across, pitch bands deep. An encoder trained on speech, sound and music reads it.', act: m => m.set({}) },
    { t: 'Straight in', home: true, say: 'Its frames go through a small adaptor into the language model as tokens. It hears a kora.', act: m => m.set({}) },
    { t: 'Transcribe first', home: true, say: 'Transcribe first instead, and the text is just "music". There is nothing left to reason about.', act: m => m.set({ cascade: true }) },
    { t: 'Who spoke?', home: true, say: 'Ask who speaks last. The transcript has the words but not the voices.', act: m => m.set({ cascade: true, q: 3 }) },
    { t: 'Speech-only ears', home: true, say: 'Feed the song to an encoder trained only on speech, and it hears a guitar.', act: m => m.set({ cascade: false, q: 1, wide: false }) },
  ],
  check: [
    { q: 'What does a cascade lose?', options: ['Everything that is not words', 'The words', 'Nothing'], answer: 0, why: 'Music, mood and voices are dropped.' },
    { q: 'What is the usual input feature for audio encoders?', options: ['A log-Mel spectrogram', 'Raw text', 'Image patches'], answer: 0, why: 'Frequencies over time on a hearing-like scale.' },
    { q: 'Why train the encoder on sound and music too?', options: ['A speech-only encoder hears music poorly', 'To shorten clips', 'To transcribe faster'], answer: 0, why: 'Its features blur instruments.' },
  ],
  terms: [
    ['Log-Mel spectrogram', 'Sound as energy per pitch band over time.'],
    ['Cascade', 'Transcribe, then reason over the text.'],
    ['Audio language model', 'A language model fed audio tokens directly.'],
    ['Adaptor', 'Small layers mapping encoder frames into the model.'],
    ['MMAU', 'A benchmark of questions about speech, sound and music.'],
    ['Thinking first', 'Reasoning steps before the final answer.'],
  ],
  deeper: '<p><b>Archives and radio.</b> Stations and archives in Senegal, Mali and Ghana hold decades of recordings in Wolof, Bambara, Twi and more, full of music as well as speech. Transcription alone misses much of it; models that hear sound can help index it, though their skill in many African languages is still limited.</p><p><b>When to cascade.</b> If you only need the words, transcribing first is cheaper and easy to check. Choose an end-to-end model when the question is about music, mood, voices or timing.</p><p><b>About this machine.</b> Scores follow the reported pattern; the cascade score and answers are illustrative.</p>',
  code: {
    title: 'Cascade or straight in',
    note: 'Adapted from the course\'s audio-language lesson.',
    text: `
def answer(audio, question, whisper, encoder, adaptor, llm, cascade=False):
    if cascade:
        text = whisper.transcribe(audio)          # words only
        return llm.generate(f"{text}\\n\\n{question}")
    mel = log_mel(audio, sr=16000, n_mels=80)     # 25 ms windows, 10 ms hop
    tokens = adaptor(encoder(mel))                # audio frames as tokens
    return llm.generate(question, prefix=tokens)
`,
  },
};
