// Spectrograms: one second of sound at 16 kHz, made here: a talking drum whose pitch glides from 200 to 500 Hz (with overtones), two sharp slaps, and a quiet whistle at 5 kHz.
// A real STFT (Hann window, radix-2 FFT) runs live; the terrain is 48 time columns by 40 frequency rows, rows on the mel scale or in plain hertz, heights in log or plain magnitude.
// Break it: plain magnitude (only the loudest sound shows), a 128 ms window (the slaps smear across time), plain-hertz rows (the drum's glide is squeezed into the bottom rows).
const SR = 16000, LEN = 16000, COLS = 48, ROWS = 40, FMAX = 8000, WINS = [128, 512, 2048];
const SIG = (() => {
  let seed = 9; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const x = new Float32Array(LEN); let ph = 0;
  for (let n = 0; n < LEN; n++) {
    const t = n / SR, f0 = 200 + 300 * t; ph += 2 * Math.PI * f0 / SR;
    const env = Math.min(1, t * 20) * (0.6 + 0.4 * Math.cos(2 * Math.PI * 3 * t) ** 2);
    x[n] = env * (0.5 * Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph) + 0.08 * Math.sin(4 * ph));
    if (t > 0.55 && t < 0.95) x[n] += 0.012 * Math.sin(2 * Math.PI * 5000 * t);
    [14, 33].map(c => (c + 0.5) / COLS - 0.001).forEach(s => { const d = t - s; if (d >= 0 && d < 0.004) x[n] += 0.9 * rnd() * Math.exp(-d * 1500); });
  }
  return x;
})();
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
}
const mel = f => 2595 * Math.log10(1 + f / 700), imel = m => 700 * (10 ** (m / 2595) - 1);
function spectrogram(win) {
  const out = [];
  for (let c = 0; c < COLS; c++) {
    const centre = Math.round((c + 0.5) / COLS * LEN), re = new Float64Array(win), im = new Float64Array(win);
    for (let i = 0; i < win; i++) { const k = centre - win / 2 + i; re[i] = (k >= 0 && k < LEN ? SIG[k] : 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (win - 1))); }
    fft(re, im); const mag = new Float64Array(win / 2 + 1); for (let k = 0; k <= win / 2; k++) mag[k] = Math.hypot(re[k], im[k]) / win;
    out.push(mag);
  }
  return out;
}
function rowsOf(useMel) {   // each display row: a band of frequencies [lo, hi)
  return Array.from({ length: ROWS }, (_, r) => useMel ? [imel(mel(FMAX) * r / ROWS), imel(mel(FMAX) * (r + 1) / ROWS)] : [FMAX * r / ROWS, FMAX * (r + 1) / ROWS]);
}

export default {
  slug: 'spectrograms-mel-features',
  title: 'Spectrograms: sound as a landscape',
  description: 'One second of sound becomes a landscape: time runs across, pitch rises towards you, height is loudness. A talking drum glides upward, two slaps crack, a quiet whistle sings high. Then use plain loudness, a long window, or frequency rows in plain hertz.',
  overview: 'Speech and audio models rarely read raw samples. They read a spectrogram: slice the sound into short overlapping frames (usually 25 ms, every 10 ms), multiply each by a window such as Hann, and take the Fourier transform of each. Loudness spans a huge range, so magnitudes are put on a log scale, otherwise only the loudest sound shows. The mel scale spaces frequency bands the way hearing does, finely at low pitches and coarsely at high ones; 80 mel bands from 0 to 8 kHz feed models like Whisper. MFCCs compress the log-mel further with a cosine transform. Frame length is a trade: long frames resolve pitch finely but smear sharp sounds across time; short frames catch every click but blur pitch. Training and inference must use exactly the same settings.',
  keywords: ['spectrogram', 'stft', 'mel scale', 'log mel', 'mfcc', 'window length'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.1, 1.15, 1.0], half: 1.6, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { win: 1, log: true, mel: true };
    const ink = '#151827', TW = 4.6, FD = 2.4, H = 0.9;
    const base = P.box(5.8, 0.12, 3.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const bed = P.box(TW + 0.2, 0.06, FD + 0.2, '#2B2B38', { r: 0.04 }); bed.position.set(0, 0.12, 0); S.add(bed);
    const cw = TW / COLS, rd = FD / ROWS, Y0 = 0.18;
    const geo = new THREE.BoxGeometry(cw * 0.92, 1, rd * 0.9); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), COLS * ROWS); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const keep = P.box(TW, H, FD, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, Y0, 0); S.add(keep);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), RAMP = ['#1B1F4B', '#3B3F8F', '#1F9E89', '#C9A227', '#F2C94C', '#FFF4D6'];
    const ramp = v => { const x = Math.max(0, Math.min(0.999, v)) * (RAMP.length - 1), i = Math.floor(x); return col.set(RAMP[i]).lerp(new THREE.Color(RAMP[i + 1]), x - i); };
    /* axes: time along the front, frequency up the left side */
    [0, 0.25, 0.5, 0.75, 1].forEach(t => { const x = -TW / 2 + t * TW; const pl = P.box(0.42, 0.18, 0.06, '#FBF8F1', { r: 0.02 }); pl.position.set(x, 0.12, FD / 2 + 0.3); S.add(pl);
      const f = S.text(`${t.toFixed(2)} s`, { size: 0.09, weight: 800, face: 'front', color: ink }); f.position.set(x, 0.21, FD / 2 + 0.335); S.add(f);
      const u = S.text(`${t.toFixed(2)} s`, { size: 0.085, weight: 800, color: ink }); u.position.set(x, 0.305, FD / 2 + 0.3); S.add(u); });
    const ticks = [250, 500, 1000, 2000, 4000, 8000].map(f => { const t = S.text(f >= 1000 ? `${f / 1000}k Hz` : `${f} Hz`, { size: 0.085, weight: 800, color: ink }); t.userData.noFit = true; S.add(t); return { t, f }; });
    const tag = (txt, x, z) => { const t = S.text(txt, { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); t.position.set(x, Y0 + 0.75, z); t.userData.noFit = true; S.add(t); return t; };
    const tags = { drum: tag('drum glide', 0, 0), slap: tag('slaps', 0, 0), whistle: tag('whistle', 0, 0) };

    let SPEC = {}, R = null;
    const specOf = w => SPEC[w] || (SPEC[w] = spectrogram(w));
    function draw() {
      const win = WINS[st.win], sp = specOf(win), bands = rowsOf(st.mel), binHz = SR / win;
      const grid = sp.map(mag => bands.map(([lo, hi]) => { let s = 0, n = 0; for (let k = Math.floor(lo / binHz); k <= Math.ceil(hi / binHz) && k < mag.length; k++) { const f = k * binHz; if (f >= lo - binHz / 2 && f < hi + binHz / 2) { s = Math.max(s, mag[k]); n++; } } return n ? s : 0; }));
      const mx = Math.max(...grid.flat());
      grid.forEach((row, c) => row.forEach((v, r) => { const h = st.log ? Math.max(0, (20 * Math.log10(v / mx + 1e-12) + 50) / 50) : v / mx;
        m4.makeScale(1, Math.max(0.004, h * H), 1).setPosition(-TW / 2 + (c + 0.5) * cw, Y0, -FD / 2 + (r + 0.5) * rd); im.setMatrixAt(c * ROWS + r, m4); im.setColorAt(c * ROWS + r, ramp(h)); }));
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const rowZ = f => { const r = st.mel ? mel(f) / mel(FMAX) * ROWS : f / FMAX * ROWS; return -FD / 2 + r * rd; };
      ticks.forEach(k => k.t.position.set(-TW / 2 - 0.42, 0.125, Math.min(FD / 2, rowZ(k.f))));
      tags.drum.position.set(-TW / 2 + 0.2 * TW, Y0 + H + 0.12, rowZ(260)); tags.slap.position.set(-TW / 2 + 0.3 * TW, Y0 + H + 0.12, rowZ(3000)); tags.whistle.position.set(-TW / 2 + 0.8 * TW, Y0 + H * 0.6, rowZ(5000));
      // how many rows the drum's fundamental (200 to 500 Hz) covers, and how wide the slaps look in time
      const drumRows = bands.filter(([lo, hi]) => hi > 200 && lo < 500).length;
      const hi = bands.findIndex(([lo, h]) => lo <= 3000 && h > 3000), slapRow = grid.map(rw => rw[hi]), sMax = Math.max(...slapRow), slapCols = Math.round(slapRow.filter(v => v > sMax * 0.1).length / 2);   // columns per slap, within 20 dB of its peak
      const wr = bands.findIndex(([lo, h]) => lo <= 5000 && h > 5000), whistleH = Math.max(...grid.slice(Math.floor(0.6 * COLS), Math.floor(0.9 * COLS)).map(rw => rw[wr])) / mx;
      R = { win, ms: win / SR * 1000, binHz, drumRows, slapCols, whistle: st.log ? (20 * Math.log10(whistleH + 1e-12) + 60) / 60 : whistleH };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Window', options: ['8 ms', '32 ms', '128 ms'], get: () => st.win, act: i => { st.win = i; draw(); } },
      { type: 'buttons', label: 'Height', options: ['Log (dB)', 'Plain magnitude'], get: () => (st.log ? 0 : 1), act: i => { st.log = !i; draw(); } },
      { type: 'buttons', label: 'Frequency rows', options: ['Mel scale', 'Plain hertz'], get: () => (st.mel ? 0 : 1), act: i => { st.mel = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Frequency detail', get: () => ({ v: `${Math.round(R.binHz)} Hz`, sub: `per FFT bin, ${R.ms} ms window`, bad: R.binHz > 100 }) },
      { label: 'Slap width', get: () => ({ v: `${R.slapCols} columns`, sub: 'sharp sounds should be thin', bad: R.slapCols > 6, good: R.slapCols <= 4 }) },
      { label: 'Drum pitch rows', get: () => ({ v: `${R.drumRows} of ${ROWS}`, sub: 'rows for 200–500 Hz', bad: R.drumRows < 3 }) },
    ];
    const labels = [
      { name: 'land', t: 'Spectrogram', d: 'Across: time. Forward: higher pitch. Up: loudness', icon: 'wave', atV: V(TW / 2 + 0.1, 0.4, 0) },
    ];
    const reset = () => { Object.assign(st, { win: 1, log: true, mel: true }); draw(); };
    const breaks = [
      { label: 'Plain magnitude', hint: 'No log', on: () => { reset(); st.log = false; draw(); }, off: reset },
      { label: 'Window too long', hint: '128 ms', on: () => { reset(); st.win = 2; draw(); }, off: reset },
      { label: 'Plain-hertz rows', hint: 'No mel', on: () => { reset(); st.mel = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.log) return { ok: false, msg: `<b>Only the loudest sound shows.</b> In plain magnitude the drum's fundamental towers over everything, the whistle reaches ${Math.round(R.whistle * 100)}% of the top, and the overtones and slaps barely rise. Loudness spans many orders of magnitude, and hearing works on a log scale: use log or decibel heights.` };
      if (st.win === 2) return { ok: false, msg: `<b>The slaps smear across time.</b> A ${R.ms} ms window sees each slap for its whole length, so a 4 ms crack spreads over ${R.slapCols} columns, about ${Math.round(R.slapCols * 1000 / COLS)} ms. Pitch is finer (${Math.round(R.binHz)} Hz per bin), but onsets, consonants and drum hits blur. Speech models use about 25 ms.` };
      if (st.win === 0) return { ok: false, msg: `<b>Every crack, but blurred pitch.</b> An ${R.ms} ms window catches each slap in ${R.slapCols === 1 ? 'one column' : R.slapCols + ' columns'}, but its FFT bins are ${Math.round(R.binHz)} Hz wide, so pitches closer together than that merge, and the drum's pitch and overtones smear into thick bands. Speech models settle near 25 ms.` };
      if (!st.mel) return { ok: false, msg: `<b>The drum's pitch is squeezed into ${R.drumRows} rows.</b> With rows spaced evenly in hertz, the range from 200 to 500 Hz, where the drum's pitch and most of a voice's pitch live, gets ${R.drumRows} of ${ROWS} rows, while the top half is spent on 4 to 8 kHz. Mel rows give the low range ${rowsOf(true).filter(([lo, hi]) => hi > 200 && lo < 500).length}, the way hearing does.` };
      return { ok: true, msg: `<b>Log heights, mel rows, a ${R.ms} ms window.</b> The drum's glide and overtones climb across ${R.drumRows} rows, the two slaps are thin walls ${R.slapCols === 1 ? 'one column' : R.slapCols + ' columns'} wide, and the quiet whistle stands clear at 5 kHz. Models such as Whisper read exactly this kind of log-mel picture.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Sound as a landscape', home: true, say: 'One second of sound: a talking drum gliding upward, two sharp slaps, and a quiet whistle. Time runs across, pitch rises towards you, loudness rises up.', act: m => m.set({ win: 1, log: true, mel: true }) },
    { t: 'Frames and windows', home: true, say: 'The sound is cut into short overlapping frames, each softened at its edges, and each turned into frequencies.', act: m => m.set({}) },
    { t: 'Log heights', home: true, say: 'Show plain loudness, and only the loudest sound is visible. A log scale reveals the quiet whistle and the overtones.', act: m => m.set({ log: false }) },
    { t: 'Mel rows', home: true, say: 'Rows spaced evenly in hertz squeeze the drum\'s pitch into a few rows. Mel rows give low pitches more room, as hearing does.', act: m => m.set({ log: true, mel: false }) },
    { t: 'A long window', home: true, say: 'A long window resolves pitch finely, but smears each slap across time.', act: m => m.set({ mel: true, win: 2 }) },
    { t: 'A short window', home: true, say: 'A very short window catches every crack, but blurs pitch. Speech models settle near twenty-five milliseconds.', act: m => m.set({ win: 0 }) },
  ],
  check: [
    { q: 'Why are spectrogram magnitudes put on a log scale?', options: ['Loudness spans many orders of magnitude', 'Logs are faster to compute', 'It removes noise'], answer: 0, why: 'Otherwise only the loudest sound shows.' },
    { q: 'What does the mel scale do?', options: ['Gives low frequencies more, narrower bands, as hearing does', 'Removes high frequencies', 'Makes every band equal in hertz'], answer: 0, why: 'Fine at low pitches, coarse at high ones.' },
    { q: 'What does a longer analysis window trade?', options: ['Finer pitch detail for blurrier timing', 'Finer timing for blurrier pitch', 'Nothing'], answer: 0, why: 'Sharp sounds smear across time.' },
  ],
  terms: [
    ['STFT', 'Short-time Fourier transform: a Fourier transform of each short frame.'],
    ['Window', 'A taper applied to each frame, such as Hann.'],
    ['Hop', 'How far the frame moves each step.'],
    ['Mel scale', 'A pitch scale spaced the way hearing is.'],
    ['Log-mel spectrogram', 'Log magnitudes in mel bands: the usual model input.'],
    ['MFCC', 'Cosine-transformed log-mel features, compact and decorrelated.'],
  ],
  deeper: '<p><b>Same settings, always.</b> A model trained on 80 mel bands at 16 kHz reads garbage if served 128 bands, or audio at another rate, or decibels instead of natural logs. Log the feature shape and settings at both ends.</p><p><b>Tonal languages.</b> Yoruba, Igbo, Ewe and many other African languages carry meaning in pitch. Fine low-frequency detail in the features matters for recognising them.</p><p><b>About this machine.</b> The sound is synthesised here; the STFT with a Hann window, the mel banding and the log heights are computed live in your browser.</p>',
  code: {
    title: 'Log-mel from scratch',
    note: 'Adapted from the course\'s spectrogram lesson.',
    text: `
import numpy as np

def log_mel(x, sr=16_000, win=400, hop=160, n_mels=80):
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
    spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1)) ** 2
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    imel = lambda m: 700 * (10 ** (m / 2595) - 1)
    edges = imel(np.linspace(0, mel(sr / 2), n_mels + 2))
    bins = np.fft.rfftfreq(win, 1 / sr)
    fb = np.maximum(0, np.minimum((bins - edges[:-2, None]) / (edges[1:-1, None] - edges[:-2, None]),
                                  (edges[2:, None] - bins) / (edges[2:, None] - edges[1:-1, None])))
    return np.log(spec @ fb.T + 1e-10)        # (frames, n_mels)
`,
  },
};
