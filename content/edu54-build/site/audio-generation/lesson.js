// Audio generation: a two-second highlife guitar riff, in the style of Ghanaian highlife. A neural codec turns audio into a grid of tokens:
// several codebooks per time step, each refining what the one before left out (residual quantisation). A language model then predicts tokens, and the codec decodes them back to sound.
// Boards: the token grid (codebooks × time), the spectrogram (time across, pitch up), and the waveform tube on the bench.
// Break it: decode with only the first codebook (muffled: the bright upper harmonics are gone), play back at the wrong sample rate (everything a fifth too high and too fast),
// sample tokens at a very high temperature (wrong notes creep into the riff).
const NOTES = [[0, 4, 64], [4, 2, 67], [6, 2, 69], [8, 4, 71], [12, 2, 69], [14, 2, 67], [16, 4, 64], [20, 4, 62], [24, 4, 64], [28, 4, 67]];   // [start, length, midi] in 32 time steps
const TS = 32, FB = 24, CB = 8;
const midiBin = m => (m - 52) * 0.75;

export default {
  slug: 'audio-generation',
  title: 'Audio generation: sound as tokens',
  description: 'A two-second highlife guitar riff, turned by a neural codec into a grid of tokens, eight codebooks deep, then predicted by a language model and decoded back to sound. Watch the spectrogram fill in as codebooks are added. Then decode with one codebook, play at the wrong sample rate, or sample far too hot.',
  overview: 'Raw audio has tens of thousands of samples per second, far too many to generate one by one. Neural audio codecs compress it into a small grid of discrete tokens: at each time step, the first codebook captures the rough sound, and each further codebook quantises what the previous ones missed, a scheme called residual vector quantisation. A language model then generates these tokens, often with a delay so codebook k at step t is predicted after codebook k − 1, and the codec\'s decoder turns them back into a waveform. Other systems generate a spectrogram or a latent with diffusion instead. Getting the sample rate and the sampling temperature right matters as much as the model.',
  keywords: ['audio generation', 'neural audio codec', 'residual vector quantization', 'audio tokens', 'text to music'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.1, 0.45, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { books: 8, rate: 1, temp: 0.8 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const mkGrid = (x, cols, rows, cell, title, top) => {
      const BW = cols * cell, BH = rows * cell, BY = 0.12 + 0.3, BZ = -0.5;
      const b = P.box(BW + 0.25, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW + 0.1 }); t.position.set(x, BY + BH + 0.13, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.505, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(cell * 1.02, cell * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), cols * rows); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < cols * rows; k++) { dummy.position.set(x - BW / 2 + (k % cols + 0.5) * cell, BY + BH - (Math.floor(k / cols) + 0.5) * cell, BZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return { m, BW, BH, BY, BZ };
    };
    const tok = mkGrid(-1.75, TS, CB, 0.075, 'codec tokens: 8 codebooks × 32 steps', 'tokens');
    const spec = mkGrid(1.65, TS, FB, 0.06, 'spectrogram: time →, pitch ↑', 'what you hear');
    const cbT = S.text('', { size: 0.06, weight: 800, face: 'front', color: '#C2561E' }); cbT.position.set(-1.75, 0.12 + 0.2, -0.455); S.add(cbT);
    /* waveform on the bench */
    const wave = P.tube([V(), V(1, 0, 0)], 0.012, C.indigo); wave.userData.noFit = true; S.add(wave);
    const wb = P.box(5.6, 0.04, 0.5, '#5B6178', { r: 0.03 }); wb.position.set(0, 0.12, 0.65); S.add(wb);
    const wT = S.text('the decoded waveform', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); wT.position.set(-2.1, 0.145, 0.905); S.add(wT);
    const lm = P.box(1.4, 0.3, 0.42, C.plum, { r: 0.05 }); lm.position.set(0, 0.12, 1.15); S.add(lm);
    const lmT = S.text('', { size: 0.06, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.35 }); lmT.position.set(0, 0.27, 1.375); S.add(lmT);
    const lmTop = S.text('token model', { size: 0.065, weight: 800, color: '#FFFFFF' }); lmTop.position.set(0, 0.425, 1.15); S.add(lmTop);
    /* ---------- maths ---------- */
    let R = null;
    function notes() {
      if (st.temp <= 1.2) return NOTES;
      let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      return NOTES.map(n => (r() < (st.temp - 1.2) * 0.55 ? [n[0], n[1], n[2] + [1, 3, 6, -5, 8][Math.floor(r() * 5)]] : n));
    }
    function draw() {
      const N = notes();
      // tokens: codebook k is active (coloured) for every step; deeper codebooks shown fainter; unused codebooks grey
      let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < TS * CB; k++) { const t = k % TS, cb = Math.floor(k / TS), on = cb < st.books; col.setHSL((0.55 + r() * 0.35) % 1, on ? 0.65 - cb * 0.05 : 0, on ? 0.45 + cb * 0.04 : 0.86); tok.m.setColorAt(k, col); }
      tok.m.instanceColor.needsUpdate = true;
      cbT.userData.set(`${st.books} of 8 codebooks used`);
      // spectrogram: harmonics of each note; codebooks decide how many harmonics survive and how sharp in time
      const E = Array(TS * FB).fill(0), harm = Math.max(1, Math.round(st.books * 0.75)), smear = st.books < 3 ? 2 : 0;
      N.forEach(([t0, len, m]) => {
        for (let h = 1; h <= harm; h++) {
          const bin = midiBin(m) + (st.rate !== 1 ? 7 * 0.75 : 0) + Math.log2(h) * 9;   // a fifth higher is +7 semitones on a pitch axis
          for (let tt = Math.floor(t0 / st.rate); tt < Math.min(TS, Math.floor((t0 + len) / st.rate) + smear); tt++) {
            const b = Math.round(bin); if (b >= 0 && b < FB) E[(FB - 1 - b) * TS + tt] += 1 / h;
          }
        }
      });
      E.forEach((e, k) => spec.m.setColorAt(k, col.setHSL(0.68 - Math.min(1, e) * 0.6, 0.8, 0.12 + Math.min(1, e) * 0.55)));
      spec.m.instanceColor.needsUpdate = true;
      // waveform: sum of sines with harmonics
      const pts = []; for (let i = 0; i <= 400; i++) {
        const tt = i / 400 * TS * st.rate; let y = 0;
        N.forEach(([t0, len, m]) => { if (tt >= t0 && tt < t0 + len) { const f = 440 * 2 ** ((m - 69) / 12) / 60; for (let h = 1; h <= harm; h++) y += Math.sin(i * f * h * 0.6 * st.rate) / h * Math.exp(-(tt - t0) * 0.35); } });
        pts.push(V(-2.6 + i / 400 * 5.2, 0.32 + y * 0.09, 0.62));
      }
      wave.geometry.dispose(); wave.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.012, 4, false);
      lmT.userData.set(`temperature ${st.temp}`);
      const wrong = N.filter((n, i) => n[2] !== NOTES[i][2]).length;
      R = { harm, wrong };
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Codebooks used when decoding', min: 1, max: 8, step: 1, get: () => st.books, set: v => { st.books = Math.round(v); draw(); } },
      { type: 'buttons', label: 'Playback sample rate', options: ['Correct (24 kHz)', 'Wrong (36 kHz)'], get: () => (st.rate === 1 ? 0 : 1), act: i => { st.rate = i ? 1.5 : 1; draw(); } },
      { type: 'slider', label: 'Sampling temperature', min: 0.2, max: 2, step: 0.1, get: () => st.temp, set: v => { st.temp = v; draw(); } },
    ];
    const readouts = [
      { label: 'Detail', get: () => ({ v: `${R.harm} harmonics`, sub: `${st.books} codebooks`, good: st.books >= 6, bad: st.books <= 2 }) },
      { label: 'Pitch and speed', get: () => ({ v: st.rate === 1 ? 'as played' : '1.5× high and fast', good: st.rate === 1, bad: st.rate !== 1 }) },
      { label: 'Wrong notes', get: () => ({ v: String(R.wrong), sub: 'of 10 in the riff', good: R.wrong === 0, bad: R.wrong > 1 }) },
    ];
    const labels = [
      { name: 'tokens', t: 'Codec tokens', d: 'Each row refines the one above', icon: 'box', atV: V(-1.75 - 1.3, 0.75, -0.5) },
      { name: 'spec', t: 'Spectrogram', d: 'Bright = loud at that pitch', icon: 'wave', atV: V(1.65 + 1.1, 0.75, -0.5) },
      { name: 'wave', t: 'The waveform', d: 'What the speaker plays', icon: 'spark', atV: V(2.9, 0.3, 0.65) },
    ];
    const reset = () => { Object.assign(st, { books: 8, rate: 1, temp: 0.8 }); draw(); };
    const breaks = [
      { label: 'Only the first codebook', hint: 'Decode the coarse layer alone', on: () => { reset(); st.books = 1; draw(); }, off: reset },
      { label: 'Wrong sample rate', hint: 'Play 24 kHz audio at 36 kHz', on: () => { reset(); st.rate = 1.5; draw(); }, off: reset },
      { label: 'Temperature far too high', hint: 'Temperature 2', on: () => { reset(); st.temp = 2; draw(); }, off: reset },
    ];
    function status() {
      if (st.rate !== 1) return { ok: false, msg: `<b>Chipmunk highlife.</b> The codec made 24,000 samples per second, but they are played at 36,000, so every note is a fifth too high and the riff is over in two-thirds of the time: the whole spectrogram slides up and squeezes left. Sample rates must match end to end.` };
      if (st.temp > 1.4) return { ok: false, msg: `<b>Wrong notes creep in.</b> At temperature ${st.temp} the token model picks unlikely tokens far more often, and ${R.wrong} of the riff\'s ten notes come out off the scale. Around 0.7 to 1.0 keeps the music sounding intended while still varying.` };
      if (st.books <= 2) return { ok: false, msg: `<b>Muffled.</b> The first codebook captures only the rough shape of the sound; the bright upper harmonics that make a guitar sound like a guitar live in the deeper codebooks. With ${st.books} codebook${st.books > 1 ? 's' : ''}, only ${R.harm} harmonic${R.harm > 1 ? 's survive' : ' survives'} and the notes blur in time.` };
      return { ok: true, msg: `<b>The riff, rebuilt from tokens.</b> ${st.books} codebooks give ${R.harm} harmonics per note, the sample rate matches, and temperature ${st.temp} keeps every note in the riff. Two seconds of sound is just ${TS * st.books} tokens.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A highlife riff', home: true, say: 'Two seconds of a highlife guitar riff. Raw, it is forty eight thousand numbers. A neural codec turns it into a small grid of tokens.', act: m => m.set({ books: 8, rate: 1, temp: 0.8 }) },
    { t: 'Codebooks', home: true, say: 'At each moment, the first codebook captures the rough sound, and each codebook below fixes what the ones above missed.', act: m => m.set({ books: 3 }) },
    { t: 'All eight', home: true, say: 'With all eight, the bright upper harmonics return, and the guitar sounds like a guitar. A token model learns to predict this grid.', act: m => m.set({ books: 8 }) },
    { t: 'One codebook', home: true, say: 'Decode the first codebook alone, and the riff is muffled and smeared.', act: m => m.set({ books: 1 }) },
    { t: 'Sample rate', home: true, say: 'Play the right samples at the wrong rate, and everything is higher and faster: a chipmunk highlife.', act: m => m.set({ books: 8, rate: 1.5 }) },
    { t: 'Temperature', home: true, say: 'Sample the tokens far too hot, and wrong notes creep into the riff.', act: m => m.set({ rate: 1, temp: 2 }) },
  ],
  check: [
    { q: 'What does a neural audio codec do?', options: ['Compresses audio into a small grid of discrete tokens and decodes it back', 'Records audio', 'Removes noise only'], answer: 0, why: 'Generating tokens is far easier than generating raw samples.' },
    { q: 'What do the deeper codebooks in residual quantisation add?', options: ['The detail the earlier codebooks missed', 'Silence', 'A different song'], answer: 0, why: 'Each one quantises the remaining error.' },
    { q: 'Why does a wrong playback sample rate change the pitch?', options: ['The same samples are played faster, raising every frequency', 'It adds new notes', 'It removes codebooks'], answer: 0, why: 'Sample rates must match end to end.' },
  ],
  terms: [
    ['Neural audio codec', 'A learned encoder and decoder that turn audio into tokens and back.'],
    ['Residual vector quantisation', 'Quantising in stages, each stage coding what the last one missed.'],
    ['Codebook', 'A learned set of vectors; each token is an index into one.'],
    ['Sample rate', 'How many audio samples there are per second.'],
    ['Spectrogram', 'A picture of loudness at each pitch over time.'],
    ['Temperature', 'A setting that makes sampling more or less random.'],
  ],
  deeper: '<p><b>Delay patterns.</b> Predicting all codebooks of a step at once loses their dependence; offsetting codebook k by k steps lets one transformer predict them in sequence without slowing generation much.</p><p><b>Diffusion for audio.</b> Other systems generate a mel spectrogram or a continuous latent with diffusion, then a vocoder turns it into a waveform.</p><p><b>About this machine.</b> The spectrogram and waveform are synthesised from the riff\'s notes; the codebook effect is shown as how many harmonics survive.</p>',
  code: {
    title: 'Residual vector quantisation',
    note: 'Adapted from the course\'s audio generation lesson.',
    text: `
import torch

def rvq_encode(x, codebooks):
    tokens, residual = [], x
    for book in codebooks:                       # each book: (K, dim)
        idx = torch.cdist(residual, book).argmin(dim=-1)
        tokens.append(idx)
        residual = residual - book[idx]          # what is still missing
    return tokens

def rvq_decode(tokens, codebooks, n_books=None):
    n_books = n_books or len(codebooks)
    return sum(book[idx] for book, idx in zip(codebooks[:n_books], tokens[:n_books]))
`,
  },
};
