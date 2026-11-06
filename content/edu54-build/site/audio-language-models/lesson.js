// Audio-language models: a call centre in Nairobi asks an audio-language model about recorded calls. Audio is encoded into frames, a projector maps each frame into the
// language model's token space, and the LLM answers. The token-space board shows audio tokens landing among word tokens (positions set by hand). Answers per setting are scripted
// from published behaviour; accuracy figures are typical benchmark values. Break it: projector not trained (audio tokens land far from any word, the answer is invented),
// "which of these clips?" across several clips (near chance), a 40-minute call with no diarisation (speakers swapped).
const QS = [
  { n: 'What is the caller asking for?', kind: 'speech', right: 'A refund for a double charge on her electricity token.', wrong: 'She is asking about a new phone contract.' },
  { n: 'Which of three clips has a baby crying?', kind: 'multi', right: 'Clip 2.', wrong: 'Clip 1.' },
  { n: 'Who promised a callback, agent or caller?', kind: 'long', right: 'The agent, at about minute 31.', wrong: 'The caller, near the start.' },
];
const WORDS = [['refund', -0.5, 0.35], ['charge', -0.25, 0.55], ['token', -0.6, 0.0], ['baby', 0.55, 0.45], ['crying', 0.75, 0.3], ['agent', 0.35, -0.45], ['caller', 0.05, -0.6], ['minute', 0.6, -0.15]];

export default {
  slug: 'audio-language-models',
  title: 'Audio-language models: ask the recording',
  description: 'A call centre in Nairobi asks an audio-language model about recorded calls. The projector lands sound among word tokens; without it, frames fall outside.',
  overview: 'An audio-language model answers questions about sound in text. Almost all share one shape: an audio encoder, often Whisper\'s or BEATs, turns audio into frame features; a small projector maps each feature into the language model\'s embedding space so it can sit among text tokens; and a language model reads the mixed sequence and writes the answer. Training usually first teaches only the projector, on captioning and transcription, then fine-tunes on audio instructions. Without that stage the audio tokens land nowhere meaningful and the language model invents an answer that sounds right. These models do well on single clips of speech and music, still sit near chance when asked to compare several clips, and lose track of who said what in long recordings, so diarise long audio first and gate silence. Test on the questions you will really ask; vendor benchmarks pick their best categories.',
  keywords: ['audio language model', 'projector', 'audio encoder', 'multimodal llm', 'mmau', 'diarisation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.55, -0.2], dir: [0.05, 0.75, 1.25], half: 1.3, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { q: 0, proj: true, diar: true };
    const ink = '#151827';
    /* audio strip, encoder, projector, LLM in a row */
    const strip = P.box(1.3, 0.08, 0.5, '#2B2B38', { r: 0.03 }); strip.position.set(-2.35, 0.12, 0.3); floor.add(strip);
    const bars = Array.from({ length: 22 }, (_, i) => { const b = P.box(0.035, 1, 0.3, C.teal, { r: 0.008 }); b.position.set(-2.95 + i * 0.057, 0.2, 0.3); b.scale.y = 0.04 + 0.2 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)); floor.add(b); return b; });

    const block = (x, w, col, name) => { const b = P.box(w, 0.6, 0.6, col, { r: 0.05 }); b.position.set(x, 0.12, 0.3); floor.add(b);
         return b; };
    block(-1.2, 0.75, '#3B3F8F', 'Audio encoder');
    const projM = new THREE.MeshLambertMaterial({ color: C.orange }), proj = block(-0.25, 0.65, C.orange, 'Projector'); proj.material = projM;
    block(1.0, 1.2, '#7A3B69', 'Language model');
    [[-1.95, -1.58], [-0.82, -0.58], [0.08, 0.4]].forEach(([a, b]) => { const r = P.box(b - a, 0.05, 0.08, '#8A8578', { r: 0.02 }); r.position.set((a + b) / 2, 0.4, 0.3); floor.add(r); });
    /* the token space board behind */
    const TX = -0.5, TZ = -0.75, BY = 0.55, tb = P.box(2.6, 1.55, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); tb.position.set(TX, BY, TZ); floor.add(tb);
    [-1.15, 1.15].forEach(dx => { const p = P.cyl(0.03, BY - 0.12, '#8A8578'); p.position.set(TX + dx, 0.12, TZ); floor.add(p); });

    const CY = BY + 0.75, toP = (x, y) => V(TX + x * 1.1, CY + y * 0.55, TZ + 0.06);
    WORDS.forEach(([w, x, y]) => { const d = P.ball(0.035, '#7A3B69'); d.position.copy(toP(x, y)); floor.add(d);    });
    const aud = Array.from({ length: 6 }, () => { const m = P.box(0.07, 0.07, 0.07, C.orange, { r: 0.015 }); m.userData.noFit = true; floor.add(m); return m; });

    /* the answer card */
    const ansL = P.lamp(C.green, { h: 0.34, r: 0.13 }); ansL.position.set(2.3, 0.12, 0.3); floor.add(ansL);




    let R = null;
    const wrap = (s, n) => s.replace(new RegExp(`(.{1,${n}})(\\s|$)`, 'g'), '$1\n').trim();
    function run() {
      const Q = QS[st.q];
      const ok = st.proj && Q.kind !== 'multi' && (Q.kind !== 'long' || st.diar);
      const acc = !st.proj ? 0.2 : Q.kind === 'speech' ? 0.73 : Q.kind === 'multi' ? 0.36 : st.diar ? 0.81 : 0.38;
      return { Q, ok, ans: ok ? Q.right : Q.wrong, acc, chance: Q.kind === 'multi' ? 0.33 : null };
    }
    function draw() {
      R = run();
      const near = R.Q.kind === 'speech' ? [[-0.5, 0.35], [-0.25, 0.55], [-0.6, 0.0]] : R.Q.kind === 'multi' ? [[0.55, 0.45], [0.75, 0.3], [-0.4, 0.2]] : [[0.35, -0.45], [0.05, -0.6], [0.6, -0.15]];
      aud.forEach((m, i) => { const [x, y] = st.proj ? near[i % 3] : [[-0.95, -0.85], [0.95, 0.85], [-0.9, 0.8], [0.9, -0.8], [0, 0.95], [0.1, -0.95]][i]; const j = st.proj ? (i < 3 ? 0.06 : -0.06) : 0; m.position.copy(toP(x + j, y + j * 0.8)); });
      projM.color.set(st.proj ? C.orange : '#C9C5BA');
      ansL.userData.set({ color: R.ok ? C.green : C.red, on: true });



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Question', options: ['What is she asking?', 'Which clip?', 'Who promised?'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Projector trained first', short: 'trained projector', get: () => st.proj, set: v => { st.proj = v; draw(); } },
      { type: 'toggle', label: 'Split long calls by speaker first', short: 'diarise', get: () => st.diar, set: v => { st.diar = v; draw(); } },
    ];
    const readouts = [
      { label: 'This answer', get: () => ({ v: R.ok ? 'right' : 'wrong', good: R.ok, bad: !R.ok }) },
      { label: 'Typical accuracy', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: R.chance ? `chance is ${Math.round(R.chance * 100)}%` : 'on this kind of question', bad: R.acc < 0.5 }) },
      { label: 'Audio tokens', get: () => ({ v: st.proj ? 'among words' : 'nowhere', sub: 'after the projector', bad: !st.proj }) },
    ];
    const labels = [
      { name: 'pipe', t: 'Encoder, projector, LLM', d: 'Audio becomes tokens', icon: 'link', atV: V(-3.0, 0.3, 0.3) },
      { name: 'space', t: 'Token space', d: 'Where audio frames land', icon: 'target', atV: V(0.8, 1.0, -0.7) },
    ];
    const reset = () => { Object.assign(st, { q: 0, proj: true, diar: true }); draw(); };
    const breaks = [
      { label: 'Untrained projector', hint: 'Skip stage one', on: () => { reset(); st.proj = false; draw(); }, off: reset },
      { label: 'Compare several clips', hint: 'Which one has a baby?', on: () => { reset(); st.q = 1; draw(); }, off: reset },
      { label: '40 minutes, no speaker turns', hint: 'Who promised?', on: () => { reset(); st.q = 2; st.diar = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.proj) return { ok: false, msg: `<b>A confident answer about nothing.</b> Without training the projector first, audio features land far from any word the language model knows. It cannot read them, so it answers from the question alone: "${R.ans}" Train the projector on transcription and captioning before anything else.` };
      if (R.Q.kind === 'multi') return { ok: false, msg: `<b>Close to guessing.</b> Asked which of three clips has a baby crying, models like this answer correctly about ${Math.round(R.acc * 100)}% of the time, when guessing gives ${Math.round(R.chance * 100)}%. Here it says "${R.ans}" Ask about one clip at a time and compare the answers yourself.` };
      if (R.Q.kind === 'long' && !st.diar) return { ok: false, msg: `<b>Speakers swapped.</b> Over 40 minutes the model loses track of who said what, and credits the callback promise to the caller. Split the call by speaker first (diarisation), then ask about each part: accuracy on this kind of question rises from ${Math.round(R.acc * 100)}% to about 81%.` };
      return { ok: true, msg: `<b>"${R.ans}"</b> The encoder turns the audio into frames, the trained projector places them among the words they relate to, and the language model answers. ${R.Q.kind === 'long' ? 'Diarising first keeps agent and caller apart over the long call.' : 'Single clips of speech are where these models are strongest.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Ask the recording', home: true, say: 'A call centre in Nairobi asks a model about recorded calls: what is this caller asking for?', act: m => m.set({ q: 0, proj: true, diar: true }) },
    { t: 'Three parts', home: true, say: 'An audio encoder turns sound into frames. A projector maps each frame into the language model\'s token space. The language model answers.', act: m => m.set({}) },
    { t: 'Train the bridge', home: true, say: 'Skip training the projector, and audio lands nowhere near any word. The model invents an answer from the question alone.', act: m => m.set({ proj: false }) },
    { t: 'Several clips', home: true, say: 'Ask which of three clips has a baby crying. Models like this are barely better than guessing.', act: m => m.set({ proj: true, q: 1 }) },
    { t: 'A long call', home: true, say: 'In a forty-minute call, it loses track of who said what, and credits the agent\'s promise to the caller.', act: m => m.set({ q: 2, diar: false }) },
    { t: 'Split it first', home: true, say: 'Split the call by speaker first, then ask. The promise goes back to the agent.', act: m => m.set({ diar: true }) },
  ],
  check: [
    { q: 'What does the projector in an audio-language model do?', options: ['Maps audio features into the language model\'s token space', 'Plays the audio aloud', 'Removes silence'], answer: 0, why: 'It lets audio frames sit among text tokens.' },
    { q: 'Why train the projector before fine-tuning on instructions?', options: ['Otherwise audio tokens mean nothing to the language model', 'It is the largest part', 'To shorten audio'], answer: 0, why: 'An untrained bridge makes the model guess.' },
    { q: 'How should you handle a very long multi-speaker recording?', options: ['Diarise it by speaker first, then ask', 'Send it all at once', 'Ask about several clips together'], answer: 0, why: 'Speaker attribution breaks on long audio.' },
  ],
  terms: [
    ['Audio-language model', 'A model that answers questions about sound in text.'],
    ['Audio encoder', 'Turns audio into frame features.'],
    ['Projector', 'Maps those features into the language model\'s token space.'],
    ['Diarisation', 'Splitting a recording by who is speaking.'],
    ['MMAU', 'A benchmark of questions about speech, sounds and music.'],
    ['Chance level', 'The score from guessing.'],
  ],
  deeper: '<p><b>Voice in, voice out.</b> Some models add a speech decoder and answer aloud. The same three-part shape sits underneath, with streaming added.</p><p><b>Languages and accents.</b> Calls in Nairobi mix English, Swahili and Sheng. Encoders trained mostly on English struggle; test on your own calls, and fine-tune the projector and adapters on local audio.</p><p><b>About this machine.</b> The token positions are set by hand to illustrate projection; answers are scripted from published behaviour, and accuracies are typical benchmark figures.</p>',
  code: {
    title: 'The projector pattern',
    note: 'Adapted from the course\'s audio-language model lesson.',
    text: `
import torch.nn as nn

class AudioLM(nn.Module):
    def __init__(self, encoder, llm, enc_dim=1280, llm_dim=4096):
        super().__init__()
        self.encoder, self.llm = encoder, llm
        self.projector = nn.Sequential(nn.Linear(enc_dim, llm_dim), nn.GELU(), nn.Linear(llm_dim, llm_dim))

    def forward(self, mel, prompt_ids):
        audio = self.projector(self.encoder(mel))         # frames -> token embeddings
        text = self.llm.embed_tokens(prompt_ids)
        return self.llm(inputs_embeds=torch.cat([audio, text], dim=1))

# stage 1: freeze encoder and llm, train only the projector on captions and transcripts
`,
  },
};
