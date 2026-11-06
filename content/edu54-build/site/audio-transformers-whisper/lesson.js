// Audio transformers: a radio station in Kigali captions its call-in show live with a Whisper-shaped model. Left to right: 30 seconds of 16 kHz audio, the 80 × 3,000
// log-mel image, a convolutional stem that halves the frames to 1,500, the encoder, the decoder and the captions. Shapes are exact; latency is estimated live from the
// layer counts and sequence lengths with a simple cost model. Break it: audio recorded at 44.1 kHz fed in as if it were 16 kHz (the window holds 11 seconds of
// stretched, low-pitched speech), no convolutional stem (3,000 frames: attention costs four times as much), the full 32-layer decoder for live captions (too slow).
const SR = [16000, 44100];

export default {
  slug: 'audio-transformers-whisper',
  title: 'Audio transformers: inside Whisper',
  description: 'A Kigali radio station captions its call-in show live with a Whisper-shaped model, re-reading the last 30 seconds every second. Follow 30 seconds of audio through the log-mel image, the convolutional stem, the encoder and the decoder, with the shape at every stage and the time it takes. Then feed in audio at the wrong sample rate, remove the stem, or use the full-depth decoder.',
  overview: 'Whisper turns speech into a picture and reads it with a transformer. Audio is resampled to 16 kHz and cut or padded to 30 seconds; a log-mel spectrogram with 80 mel bands and a 10 ms hop gives an 80 × 3,000 image. Two one-dimensional convolutions, the second with stride 2, halve the time axis to 1,500 frames, cheaply, before any attention. The encoder, with sinusoidal positions, turns those into 1,500 hidden states; the decoder writes text tokens, steered by task tokens, attending to the encoder through cross-attention, and can emit timestamps every 20 milliseconds. Large models have 32 encoder and 32 decoder layers; the turbo version keeps the full encoder but only 4 decoder layers, because decoding runs once per token and dominates latency. Audio at any other sample rate must be resampled first, or the model sees stretched, lowered speech it was never trained on.',
  keywords: ['whisper', 'audio transformer', 'log-mel spectrogram', 'convolutional stem', 'encoder decoder', 'latency'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0.35], dir: [0.1, 0.65, 1.3], half: 1.35, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { sr: 0, stem: true, dec: 0 };
    const ink = '#151827', DEC = [4, 32];
    const base = P.box(6.6, 0.12, 1.9, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.4); S.add(base);
    const stage = (x, w, h, col, name) => { const b = P.box(w, h, 0.6, col, { r: 0.04 }); b.position.set(x, 0.12, 0); S.add(b);
      const f = S.text(name, { size: 0.09, weight: 800, face: 'front', color: '#FFFFFF', maxW: w - 0.06 }); f.position.set(x, 0.12 + h - 0.12, 0.305); S.add(f); return b; };
    /* waveform plate */
    const wave = P.box(0.95, 0.06, 0.6, '#2B2B38', { r: 0.03 }); wave.position.set(-2.75, 0.12, 0); S.add(wave);
    const wbars = Array.from({ length: 24 }, (_, i) => { const b = P.box(0.025, 1, 0.3, C.teal, { r: 0.005 }); b.position.set(-3.18 + i * 0.037, 0.18, 0); b.userData.noFit = true; S.add(b); return b; });
    /* log-mel image */
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 80; const g2 = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: tex })); mel.position.set(-1.6, 0.6, 0.0); S.add(mel);
    const melB = P.box(1.3, 0.6, 0.05, '#2B2B38', { r: 0.02 }); melB.position.set(-1.6, 0.3, -0.04); S.add(melB);
    const stemB = stage(-0.6, 0.45, 0.7, '#7A3B69', 'Conv stem');
    const encB = stage(0.35, 0.8, 1, '#3B3F8F', 'Encoder');
    const decB = stage(1.4, 0.8, 1, C.plum, 'Decoder');
    const capB = P.box(0.95, 0.5, 0.06, '#FBF8F1', { r: 0.03 }); capB.position.set(2.65, 0.12, 0); S.add(capB);
    const capT = S.text('', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: 0.88, maxH: 0.4 }); capT.position.set(2.65, 0.37, 0.035); S.add(capT);
    /* shape tags along the front */
    const tags = [-2.75, -1.6, -0.6, 0.35, 1.4, 2.65].map(x => { const pl = P.box(0.9, 0.2, 0.06, '#FBF8F1', { r: 0.02 }); pl.position.set(x, 0.12, 0.75); S.add(pl);
      const t = S.text('', { size: 0.068, weight: 800, face: 'front', color: ink, maxW: 0.86 }); t.position.set(x, 0.22, 0.785); S.add(t); return t; });
    const arrows = [[-2.25, -2.25 + 0.35], [-0.92, -0.85], [-0.36, -0.07], [0.77, 0.98], [1.82, 2.15]].map(([a, b]) => { const r = P.rod(V(a, 0.4, 0), V(b, 0.4, 0), 0.02, '#8A8578'); S.add(r); return r; });
    const latB = P.box(1, 0.08, 0.24, C.coral, { r: 0.02 }); latB.userData.noFit = true; S.add(latB);
    const latT = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); latT.userData.noFit = true; S.add(latT);
    const goal = P.box(0.02, 0.2, 0.4, '#D64545', { r: 0.005 }); goal.position.set(-3 + 1.0 / 2.5 * 5.5, 0.12, 1.1); S.add(goal);

    let R = null;
    function run() {
      const wrong = st.sr === 1, frames = 3000, T = st.stem ? frames / 2 : frames, d = 1280, Lenc = 32, Ldec = DEC[st.dec], toks = 90;
      // a rough model for one GPU: the encoder is compute-bound and runs once; decoding is sequential, a fixed cost per token per layer plus cross-attention over the frames
      const encFlops = Lenc * (T * T * d + 12 * T * d * d), encS = encFlops / 2e13, decS = toks * Ldec * (0.00025 + 0.0001 * T / 1500);
      return { wrong, frames, T, Ldec, secs: encS + decS, encS, decS, attnX: (T / 1500) ** 2, heard: wrong ? 30 * 16000 / 44100 : 30 };
    }
    function draw() {
      R = run();
      // the log-mel picture: speech-like formant bands; at the wrong rate the bands slide down and stretch
      g2.fillStyle = '#1B1F4B'; g2.fillRect(0, 0, 300, 80);
      for (let x = 0; x < 300; x++) { const t = R.wrong ? x * (16000 / 44100) : x, syl = Math.max(0, Math.sin(t * 0.16)) * (t < 280 ? 1 : 0);
        [12, 25, 41].forEach((f0, k) => { const f = R.wrong ? f0 * 16000 / 44100 : f0, y = 80 - f - 4 * Math.sin(t * 0.05 + k); g2.fillStyle = `rgba(242,201,76,${0.25 + 0.6 * syl})`; g2.fillRect(x, y - 2, 1, 4); }); }
      tex.needsUpdate = true;
      wbars.forEach((b, i) => { b.scale.y = 0.05 + 0.25 * Math.abs(Math.sin(i * (R.wrong ? 0.5 : 1.3))); });
      stemB.visible = st.stem; arrows[2].visible = st.stem;
      decB.scale.y = R.Ldec / 32 * 0.85 + 0.15; encB.scale.y = 1;
      const shp = [`30 s × ${(SR[st.sr] / 1000).toFixed(1)}k samples`, '80 × 3,000 log-mel', st.stem ? '3,000 → 1,500 frames' : 'no stem: 3,000', `${R.T.toLocaleString('en')} × 1,280, 32 layers`, `${R.Ldec} layers, ~90 tokens`, 'captions'];
      tags.forEach((t, i) => t.userData.set(shp[i]));
      capT.userData.set(R.wrong ? 'Mmm... aah... ooh' : 'Murakoze guhamagara, mwiriwe neza!', R.wrong ? '#8A1F1F' : '#151827');
      const w = Math.min(5.5, R.secs / 2.5 * 5.5); latB.scale.x = Math.max(0.05, w); latB.position.set(-3 + w / 2, 0.12, 1.1); latB.material.color.set(R.secs > 1 ? '#D64545' : C.coral);
      latT.userData.set(`${R.secs.toFixed(2)} s per pass`); latT.position.set(-3 + w, 0.4, 1.1);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Audio arrives at', options: ['16 kHz', '44.1 kHz, not resampled'], get: () => st.sr, act: i => { st.sr = i; draw(); } },
      { type: 'toggle', label: 'Convolutional stem (halves the frames)', short: 'conv stem', get: () => st.stem, set: v => { st.stem = v; draw(); } },
      { type: 'buttons', label: 'Decoder layers', options: ['4 (turbo)', '32 (full)'], get: () => st.dec, act: i => { st.dec = i; draw(); } },
    ];
    const readouts = [
      { label: 'Encoder frames', get: () => ({ v: R.T.toLocaleString('en'), sub: 'attention grows with the square', bad: R.T > 1500, good: R.T === 1500 }) },
      { label: 'Time per pass', get: () => ({ v: `${R.secs.toFixed(2)} s`, sub: 'a new pass starts every second', good: R.secs <= 1, bad: R.secs > 1 }) },
      { label: 'Speech in the window', get: () => ({ v: `${R.heard.toFixed(1)} s`, sub: R.wrong ? 'stretched and lowered' : 'as recorded', bad: R.wrong, good: !R.wrong }) },
    ];
    const labels = [
      { name: 'pipe', t: 'Audio to captions', d: 'Shape at every stage', icon: 'wave', atV: V(-3.25, 0.25, 0) },
      { name: 'lat', t: 'Time per pass', d: 'Red line: the next pass starts', icon: 'scale', atV: V(3.1, 0.16, 1.1) },
    ];
    const reset = () => { Object.assign(st, { sr: 0, stem: true, dec: 0 }); draw(); };
    const breaks = [
      { label: 'Wrong sample rate', hint: '44.1 kHz fed as 16 kHz', on: () => { reset(); st.sr = 1; draw(); }, off: reset },
      { label: 'No convolutional stem', hint: '3,000 frames', on: () => { reset(); st.stem = false; draw(); }, off: reset },
      { label: 'Full decoder, live', hint: '32 layers', on: () => { reset(); st.dec = 1; draw(); }, off: reset },
    ];
    function status() {
      if (R.wrong) return { ok: false, msg: `<b>Stretched, lowered speech.</b> The studio records at 44.1 kHz. Read as if it were 16 kHz, 30 seconds of samples holds only ${R.heard.toFixed(1)} seconds of the call, played back 2.8 times slower and lower; the formant bands in the log-mel image slide down. The model has never heard speech like that and writes "${'Mmm... aah... ooh'}". Resample to 16 kHz, with a filter, first.` };
      if (!st.stem) return { ok: false, msg: `<b>Four times the attention cost.</b> Without the convolutional stem, the encoder attends over all 3,000 frames instead of 1,500, and attention grows with the square: ${R.attnX}× the attention work, and the encoder alone now takes ${R.encS.toFixed(2)} s. Two cheap convolutions, the second with stride 2, halve the sequence before any attention.` };
      if (R.secs > 1) return { ok: false, msg: `<b>Captions fall behind.</b> The full 32-layer decoder runs once for every one of about 90 tokens, so decoding takes ${R.decS.toFixed(2)} s of the ${R.secs.toFixed(2)} s for each 30 seconds of the show, and live captions re-run the window every second as new speech arrives, so each pass must finish within a second or the captions drift further behind with every update. The turbo version keeps the full encoder but only 4 decoder layers, for a small accuracy cost.` };
      return { ok: true, msg: `<b>${R.secs.toFixed(2)} s per pass, captions in step.</b> 16 kHz audio becomes an 80 × 3,000 log-mel image, the stem halves it to 1,500 frames, 32 encoder layers read it once, and a 4-layer decoder writes about 90 tokens, steered by the Kinyarwanda and transcribe task tokens.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Live captions', home: true, say: 'A radio station in Kigali captions its call-in show live, thirty seconds at a time, with a Whisper-shaped model.', act: m => m.set({ sr: 0, stem: true, dec: 0 }) },
    { t: 'Sound as a picture', home: true, say: 'Audio at sixteen kilohertz becomes a log-mel image: eighty bands by three thousand frames.', act: m => m.set({}) },
    { t: 'Halve it first', home: true, say: 'Two small convolutions halve the frames to fifteen hundred before any attention. Remove them, and attention costs four times as much.', act: m => m.set({ stem: false }) },
    { t: 'Encoder, then decoder', home: true, say: 'The encoder reads the picture once. The decoder writes the captions token by token, looking back at the encoder.', act: m => m.set({ stem: true }) },
    { t: 'Decoding dominates', home: true, say: 'A full thirty-two-layer decoder runs for every token, and captions fall behind. The turbo version keeps just four decoder layers.', act: m => m.set({ dec: 1 }) },
    { t: 'Resample first', home: true, say: 'Feed in studio audio at forty-four kilohertz without resampling, and the model hears slow, low speech it was never trained on.', act: m => m.set({ dec: 0, sr: 1 }) },
  ],
  check: [
    { q: 'What does Whisper\'s convolutional stem do?', options: ['Halves the number of frames before attention', 'Removes background noise', 'Translates the audio'], answer: 0, why: 'A stride-2 convolution makes attention much cheaper.' },
    { q: 'Why does the turbo model cut decoder layers rather than encoder layers?', options: ['The decoder runs once per output token, so it dominates latency', 'The encoder is unused', 'Decoders are less accurate'], answer: 0, why: 'The encoder runs once per window.' },
    { q: 'What happens if 44.1 kHz audio is treated as 16 kHz?', options: ['The model sees stretched, lowered speech', 'Nothing', 'It runs faster with no harm'], answer: 0, why: 'Resample first.' },
  ],
  terms: [
    ['Log-mel spectrogram', 'An image of sound: mel bands by time frames, on a log scale.'],
    ['Convolutional stem', 'Small convolutions that shrink the sequence before attention.'],
    ['Encoder', 'Reads the whole 30-second window once.'],
    ['Decoder', 'Writes text tokens one at a time with cross-attention.'],
    ['Task tokens', 'Special tokens that set language and task.'],
    ['Resampling', 'Converting audio to another sample rate, with a filter.'],
  ],
  deeper: '<p><b>Sizes.</b> Whisper runs from 39 million to 1.5 billion parameters. All share the shape here; larger ones add layers and width.</p><p><b>Kinyarwanda and its neighbours.</b> Kinyarwanda, Kirundi and Luganda were thin in Whisper\'s training data. Fine-tuning on local radio and call recordings, with correct transcripts, improves them most.</p><p><b>About this machine.</b> Shapes are exact. Latency is a rough estimate from a simple cost model of layers, frames and tokens on one GPU, to show which parts dominate.</p>',
  code: {
    title: 'Whisper\'s front end',
    note: 'Adapted from the course\'s audio transformer lesson.',
    text: `
import torch.nn as nn, torchaudio

wav = torchaudio.functional.resample(wav, orig_freq=44_100, new_freq=16_000)
mel = torchaudio.transforms.MelSpectrogram(16_000, n_fft=400, hop_length=160, n_mels=80)(wav)
logmel = mel.clamp(min=1e-10).log10()            # (80, 3000) for 30 s

stem = nn.Sequential(
    nn.Conv1d(80, 1280, kernel_size=3, padding=1), nn.GELU(),
    nn.Conv1d(1280, 1280, kernel_size=3, stride=2, padding=1), nn.GELU(),
)                                                # 3000 frames -> 1500
`,
  },
};
