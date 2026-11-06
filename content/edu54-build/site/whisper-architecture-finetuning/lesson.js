// Whisper: a radio station in Mombasa transcribes Swahili interviews. Audio is cut into 30-second windows (trays on the left: teal speech, grey jingle, hatched padding),
// each read by the encoder; the decoder is steered by prompt tokens (start, language, task, timestamps) and writes text per window. The model's outputs for each setting
// are scripted from Whisper's known behaviour; windows, padding, the prompt and word error rate are computed live.
// Break it: language tag forced to English (Swahili written as English-sounding words), no voice activity gate (the jingle becomes "Asante kwa kusikiliza"),
// conditioning on previous text (that phrase repeats into the next window).
const CLIPS = [
  { n: 'Greeting, 8 s', len: 8, segs: [[0, 8, 'speech']], ref: { sw: ['Karibu Mombasa, leo tunazungumza kuhusu uvuvi.'], en: ['Welcome to Mombasa, today we are talking about fishing.'] } },
  { n: 'Interview, 75 s', len: 75, segs: [[0, 22, 'speech'], [22, 30, 'speech'], [30, 44, 'speech'], [44, 60, 'jingle'], [60, 75, 'speech']],
    ref: { sw: ['Karibu Mombasa, leo tunazungumza kuhusu uvuvi.', 'Wavuvi wanasema samaki wamepungua.', 'Tunahitaji kulinda bahari.'], en: ['Welcome to Mombasa, today we are talking about fishing.', 'Fishermen say the fish have decreased.', 'We need to protect the sea.'] } },
];
const EN_TAG = ['Carry boo mom basa, lay oh to nah zoom za coo who who vee.', 'Wah voo vee wanna say ma sum a key.', 'Tuna he tag he cooling the bahari.'];
const HALL = 'Asante kwa kusikiliza.';
const words = s => s.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
function wer(h, r) { const a = words(h), b = words(r), d = Array.from({ length: b.length + 1 }, (_, i) => [i, ...Array(a.length).fill(0)]); for (let j = 1; j <= a.length; j++) d[0][j] = j;
  for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)); return d[b.length][a.length] / b.length; }
function run(st) {
  const clip = CLIPS[st.clip], nWin = Math.ceil(clip.len / 30), task = st.task === 0 ? 'sw' : 'en';
  const outs = [];
  for (let w = 0; w < nWin; w++) {
    const lo = w * 30, hi = Math.min(clip.len, lo + 30), pad = 30 - (hi - lo);
    const jingle = clip.segs.some(([a, b, k]) => k === 'jingle' && a < hi && b > lo);
    let refIdx = st.clip === 0 ? 0 : w, text;
    if (st.lang === 2 && task === 'sw') text = EN_TAG[refIdx];
    else text = clip.ref[task][refIdx];
    if (!st.vad && (jingle || pad > 15)) text = text + ' ' + HALL;   // music or long padded silence: Whisper fills it with caption-like phrases
    if (st.cond && w > 0 && outs[w - 1].text.includes(HALL)) text = HALL + ' ' + HALL;   // conditioned on a hallucination, the next window repeats it
    outs.push({ lo, hi, pad, jingle, text, ref: clip.ref[task][refIdx] });
  }
  const hyp = outs.map(o => o.text).join(' '), ref = clip.ref[task].join(' ');
  return { clip, nWin, outs, hyp, ref, w: wer(hyp, ref), task };
}

export default {
  slug: 'whisper-architecture-finetuning',
  title: 'Whisper: one model, many tasks',
  description: 'A radio station in Mombasa runs Swahili interviews through Whisper. Audio is cut into thirty-second trays, and a jingle or a wrong language tag gives you hallucinations.',
  overview: 'Whisper is a transformer encoder-decoder trained on hundreds of thousands of hours of captioned audio. It reads a 30-second log-mel spectrogram (shorter clips are padded, longer ones cut into windows), the encoder turns it into features, and the decoder writes text. Special tokens at the start of the decoder\'s prompt choose the language and the task: transcribe in the spoken language, or translate into English. Leave the language out and Whisper guesses it; force the wrong one and it writes plausible nonsense. Because it learned from captions, it fills music and silence with phrases like "thanks for listening", so audio should be gated by voice activity detection, and feeding each window\'s text into the next can spread one invented phrase. Fine-tuning on tens of hours of local speech, often with LoRA and a frozen encoder for small datasets, cuts error rates on accents, vocabulary and languages that were rare in training.',
  keywords: ['whisper', 'encoder decoder', 'prompt tokens', 'hallucination', 'voice activity detection', 'lora fine-tuning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { clip: 1, lang: 1, task: 0, vad: true, cond: false };
    /* three 30-second trays on the left */
    const TX = -1.85, TW = 1.5, tray = [0, 1, 2].map(w => {
      const z = -0.75 + w * 0.5, g = new THREE.Group(); g.position.set(TX, 0, z); S.add(g);
      const t = P.box(TW + 0.1, 0.06, 0.4, '#D9D1C0', { r: 0.03 }); g.add(t);
      const segs = Array.from({ length: 4 }, () => { const mm = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.box(1, 0.12, 0.28, '#fff', { r: 0.01, material: mm }); b.position.y = 0.06; g.add(b); return { b, mm }; });
      return { g, segs, t };
    });
    /* encoder and decoder towers */
    const tower = (x, n, col) => { for (let i = 0; i < n; i++) { const s = P.box(0.6, 0.11, 0.6, col, { r: 0.04 }); s.position.set(x, i * 0.14, -0.5); S.add(s); } };
    tower(-0.4, 6, '#3B3F8F'); tower(0.4, 6, '#7A3B69');
    const link = P.box(0.26, 0.06, 0.1, '#8A8578', { r: 0.02 }); link.position.set(0, 0.5, -0.5); S.add(link);
    /* prompt tokens in front of the decoder */
    const TOK = ['start', 'language', 'task', 'no times'];
    const toks = TOK.map((n, i) => { const x = -0.8 + i * 0.5, mm = new THREE.MeshLambertMaterial({ color: '#FFF1C9' }), b = P.box(0.42, 0.14, 0.36, '#fff', { r: 0.03, material: mm }); b.position.set(x, 0, 0.3); S.add(b); return mm; });
    /* text out: a lamp per window */
    const lines = [0, 1, 2].map(w => { const l = P.lamp(C.green, { h: 0.2, r: 0.1 }); l.position.set(1.1 + w * 0.42, 0, -0.5); S.add(l); return l; });
    S.add(P.keep(-2.75, 2.15, 0.85, -1.0, 0.6));

    let R = null;
    function draw() {
      R = run(st);
      tray.forEach((T, w) => { const on = w < R.nWin; T.g.visible = on; if (!on) return; const lo = w * 30, hi = lo + 30;
        const pieces = R.clip.segs.filter(([a, b]) => a < hi && b > lo).map(([a, b, k]) => [Math.max(a, lo), Math.min(b, hi), k]);
        const end = Math.min(R.clip.len, hi); if (end < hi) pieces.push([end, hi, 'pad']);
        T.segs.forEach((s, i) => { const p = pieces[i]; s.b.visible = !!p; if (!p) return; const x0 = -TW / 2 + (p[0] - lo) / 30 * TW, x1 = -TW / 2 + (p[1] - lo) / 30 * TW;
          s.b.scale.x = Math.max(0.01, x1 - x0 - 0.02); s.b.position.x = (x0 + x1) / 2; s.mm.color.set(p[2] === 'speech' ? C.teal : p[2] === 'jingle' ? '#9A9AA6' : '#E3DCCB'); s.b.scale.y = p[2] === 'pad' ? 0.25 : 1; }); });
      toks[1].color.set(st.lang === 0 ? C.gold : st.lang === 1 ? '#2E9E6A' : C.red);
      toks[2].color.set(st.task === 0 ? '#FFF1C9' : C.gold);
      lines.forEach((l, w) => { const o = R.outs[w]; l.visible = !!o; if (o) l.userData.set({ color: o.text === o.ref ? '#2E9E6A' : C.red, on: true }); });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Clip', options: CLIPS.map(c => c.n), get: () => st.clip, act: i => { st.clip = i; draw(); } },
      { type: 'buttons', label: 'Language token', options: ['Let it guess', 'Swahili', 'English'], get: () => st.lang, act: i => { st.lang = i; draw(); } },
      { type: 'buttons', label: 'Task token', options: ['Transcribe', 'Translate to English'], get: () => st.task, act: i => { st.task = i; draw(); } },
      { type: 'toggle', label: 'Voice activity gate', short: 'VAD', get: () => st.vad, set: v => { st.vad = v; draw(); } },
      { type: 'toggle', label: 'Condition on previous text', short: 'previous text', get: () => st.cond, set: v => { st.cond = v; draw(); } },
    ];
    const readouts = [
      { label: 'Word error rate', get: () => ({ v: `${Math.round(R.w * 100)}%`, sub: R.w > 1 ? 'over 100%: extra wrong words' : R.task === 'sw' ? 'against the Swahili' : 'against the English', good: R.w === 0, bad: R.w > 0 }) },
      { label: 'Windows', get: () => ({ v: String(R.nWin), sub: `${R.clip.len} s of audio` }) },
      { label: 'Padding', get: () => ({ v: `${R.outs.reduce((a, o) => a + o.pad, 0)} s`, sub: 'silence added to fill 30 s' }) },
    ];
    const labels = [
      { name: 'trays', t: '30-second windows', d: 'Teal speech, grey jingle, pale padding', icon: 'chart', atV: V(-2.7, 0.08, -0.25) },
      { name: 'out', t: 'Text out', d: 'Red: differs from the reference', icon: 'book', atV: V(2.08, 0.2, -0.5) },
    ];
    const reset = () => { Object.assign(st, { clip: 1, lang: 1, task: 0, vad: true, cond: false }); draw(); };
    const breaks = [
      { label: 'Wrong language token', hint: 'English, on Swahili', on: () => { reset(); st.lang = 2; draw(); }, off: reset },
      { label: 'No voice activity gate', hint: 'A jingle in window 2', on: () => { reset(); st.vad = false; draw(); }, off: reset },
      { label: 'Lean on previous text', hint: 'And no gate', on: () => { reset(); st.vad = false; st.cond = true; draw(); }, off: reset },
    ];
    function status() {
      const p = Math.round(R.w * 100);
      if (st.lang === 2 && R.task === 'sw') return { ok: false, msg: `<b>Swahili written as English-sounding words.</b> The language token says English, so the decoder writes English spellings of Swahili sounds: "${R.outs[0].text}". Word error rate ${p}%. Set the language token to Swahili, or let Whisper guess when you do not know.` };
      if (st.cond && R.outs.some((o, i) => i > 0 && o.text.startsWith(HALL))) return { ok: false, msg: `<b>One invented phrase spreads.</b> Window 2 ends with "${HALL}", invented over the jingle. Fed in as context for window 3, it pulls the decoder into repeating it, and the real speech, "${R.outs[2].ref}", is lost. Word error rate ${p}%. Turn off conditioning on previous text, and gate the audio.` };
      if (!st.vad && R.hyp.includes(HALL)) return { ok: false, msg: `<b>"${HALL}" was never said.</b> Whisper learned from captioned audio, where music and silence often come with phrases like "thanks for listening". Ungated, the ${st.clip === 1 ? 'jingle in window 2' : 'padded silence after the greeting'} becomes that phrase. Word error rate ${p}%. Gate the audio with a voice activity detector first.` };
      return { ok: true, msg: `<b>${R.task === 'sw' ? 'Transcribed in Swahili' : 'Translated into English'}, word error rate ${p}%.</b> ${R.nWin} window${R.nWin > 1 ? 's' : ''} of 30 seconds; ${st.lang === 0 ? 'the prompt leaves the language out, so Whisper detects Swahili' : 'the language token says Swahili'}, and the task token says ${st.task === 0 ? 'transcribe' : 'translate'}; the voice activity gate keeps the jingle and padding silent.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Swahili radio', home: true, say: 'A radio station in Mombasa runs its Swahili interviews through Whisper. The audio is cut into thirty-second windows.', act: m => m.set({ clip: 1, lang: 1, task: 0, vad: true, cond: false }) },
    { t: 'Prompt tokens', home: true, say: 'Tokens at the start of the decoder\'s prompt choose the language and the task. Swahili, transcribe.', act: m => m.set({}) },
    { t: 'Translate', home: true, say: 'Change one token to translate, and the same model writes English.', act: m => m.set({ task: 1 }) },
    { t: 'Wrong language', home: true, say: 'Force the language token to English, and Swahili comes out as English-sounding nonsense.', act: m => m.set({ task: 0, lang: 2 }) },
    { t: 'Music becomes words', home: true, say: 'Without a voice activity gate, the station jingle becomes "asante kwa kusikiliza", thanks for listening. Nobody said it.', act: m => m.set({ lang: 1, vad: false }) },
    { t: 'It spreads', home: true, say: 'Let each window lean on the last window\'s text, and the invented phrase repeats, swallowing real speech.', act: m => m.set({ cond: true }) },
  ],
  check: [
    { q: 'How does one Whisper model both transcribe and translate?', options: ['Special tokens in the decoder prompt choose the task', 'It has two separate models', 'It guesses from the audio length'], answer: 0, why: 'Language and task are prompt tokens.' },
    { q: 'Why gate Whisper\'s input with voice activity detection?', options: ['It invents caption-like phrases over music and silence', 'It cannot read speech otherwise', 'To translate faster'], answer: 0, why: 'It learned from captions.' },
    { q: 'What does Whisper do with a clip longer than 30 seconds?', options: ['Cuts it into 30-second windows', 'Reads it all at once', 'Ignores the end'], answer: 0, why: 'Short clips are padded, long ones chunked.' },
  ],
  terms: [
    ['Encoder-decoder', 'One network reads the audio, another writes the text.'],
    ['30-second window', 'The fixed input length Whisper reads at once.'],
    ['Prompt tokens', 'Special tokens that set language, task and timestamps.'],
    ['Hallucination', 'Text the model writes that was never spoken.'],
    ['Conditioning on previous text', 'Feeding one window\'s output in as context for the next.'],
    ['LoRA', 'Fine-tuning small added matrices instead of the whole model.'],
  ],
  deeper: '<p><b>Fine-tuning for local speech.</b> Swahili, Hausa, Yoruba and Amharic had far less training audio than English. Tens of hours of transcribed local speech, with LoRA on the attention layers and the encoder frozen for small datasets, cut error rates sharply. Use Whisper\'s own tokenizer and feature settings throughout.</p><p><b>Sizes.</b> Tiny to large models trade speed for accuracy; the turbo variant keeps the large encoder but a small decoder, for much faster decoding.</p><p><b>About this machine.</b> The text for each setting is scripted from Whisper\'s known behaviour. Windows, padding, the prompt and word error rate are computed live.</p>',
  code: {
    title: 'Whisper with the right tokens and a gate',
    note: 'Adapted from the course\'s Whisper lesson.',
    text: `
from transformers import pipeline

asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3-turbo",
               chunk_length_s=30)

speech_only = vad_trim(audio)                    # drop music and silence first
out = asr(speech_only,
          generate_kwargs={"language": "swahili",   # or leave out to detect
                           "task": "transcribe",    # or "translate"
                           "condition_on_prev_tokens": False})
print(out["text"])
`,
  },
};
