// Audio fundamentals: a field recorder in Kakamega Forest, Kenya, samples a sunbird's call (a pure tone here). The grey line is the real sound over 2 ms,
// the posts are the samples, and the orange line is the slowest wave that passes through every sample, which is what playback reconstructs.
// The spectrum board is a real DFT (Hann window) of the samples, computed live. Break it: sample below twice the call's pitch with no filter (the call aliases to a
// lower, false pitch), too much gain (clipped samples add false overtones), a tiny FFT (bins too coarse to locate the call).
const RATES = [8000, 16000, 44100], FFTS = [16, 64, 256], WIN = 0.002;

export default {
  slug: 'audio-fundamentals',
  title: 'Audio: samples, Nyquist, Fourier',
  description: 'A field recorder in Kakamega Forest samples a sunbird\'s call. See the real wave, the samples taken from it, and the frequencies a Fourier transform finds in them. Then sample too slowly with no filter, turn the gain up until it clips, or use a tiny transform.',
  overview: 'Digital audio is a list of numbers between minus one and one, taken at a fixed sample rate: 16,000 a second for speech recognition, 44,100 for music. A sample rate can only represent frequencies up to half of itself, the Nyquist frequency. Anything higher does not vanish: it folds back and appears as a false, lower frequency, called aliasing, so recorders filter out high frequencies before sampling or downsampling. Too much gain pushes samples past the limit, and the flattened peaks add overtones that were never there. The discrete Fourier transform turns a frame of samples into the strength of each frequency bin, with bins spaced by the sample rate divided by the frame length: short frames give coarse frequency detail. Real systems slide a short window along the sound, which is the spectrogram.',
  keywords: ['audio', 'sampling rate', 'nyquist', 'aliasing', 'fourier transform', 'fft', 'clipping'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.05, 0.3, 1.3], half: 1.65, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { f: 6000, sr: 1, filt: true, gain: 0.8, n: 2 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const board = (x, w, title) => { const b = P.box(w, 1.85, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); b.position.set(x, 0.25, -0.5); S.add(b);
      [-w / 2 + 0.15, w / 2 - 0.15].forEach(dx => { const p = P.cyl(0.03, 0.13, '#8A8578'); p.position.set(x + dx, 0.12, -0.5); S.add(p); });
      const t = S.text(title, { size: 0.11, weight: 800, face: 'front', color: ink }); t.position.set(x, 1.97, -0.465); S.add(t); };
    /* the waveform */
    const WX = -1.35, WW = 3.6, WY = 1.15, WA = 0.55, ZW = -0.44;
    board(WX, 3.9, 'Two milliseconds of sound');
    const tx = t => WX - WW / 2 + (t / WIN) * WW;
    const axis = P.rod(V(WX - WW / 2, WY, ZW - 0.01), V(WX + WW / 2, WY, ZW - 0.01), 0.006, '#8A8578'); S.add(axis);
    const clipLines = [1, -1].map(s => { const r = P.rod(V(WX - WW / 2, WY + s * WA, ZW - 0.01), V(WX + WW / 2, WY + s * WA, ZW - 0.01), 0.005, '#D64545'); S.add(r); return r; });
    const clipT = S.text('limit', { size: 0.065, weight: 700, face: 'front', color: '#D64545' }); clipT.position.set(WX + WW / 2 + 0.12, WY + WA, ZW); S.add(clipT);
    const mkLine = (col, r) => { const mm = new THREE.MeshBasicMaterial({ color: col }), m = P.tube([V(0, 0, 0), V(0.1, 0, 0)], r, col, { material: mm }); m.layers.set(1); m.userData.noFit = true; m.userData.r = r; S.add(m); return m; };
    const truth = mkLine('#9A9AA6', 0.008), recon = mkLine(C.orange, 0.011);
    const setLine = (m, fn, z) => { const pts = []; for (let i = 0; i <= 400; i++) { const t = i / 400 * WIN; pts.push(V(tx(t), WY + fn(t) * WA, z)); } const r = m.userData.r; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 800, r, 6, false); };
    const posts = Array.from({ length: 100 }, () => { const r = P.rod(V(0, 0, 0), V(0, 1, 0), 0.006, C.teal); r.userData.noFit = true; S.add(r); const b = P.ball(0.022, C.teal); b.userData.noFit = true; S.add(b); return { r, b }; });
    const leg = S.text('grey: the call · posts: samples · orange: what plays back', { size: 0.07, weight: 700, face: 'front', color: '#5A5A66', maxW: 3.6 }); leg.position.set(WX, 0.45, ZW + 0.025); S.add(leg);
    /* the spectrum */
    const SX = 2.05, SW = 2.3, SY = 0.6, SH = 1.05, FMAX = 11000;
    board(SX, 2.5, 'Frequencies found (DFT)');
    const fx = f => SX - SW / 2 + (f / FMAX) * SW;
    const bars = Array.from({ length: 129 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), b = P.box(0.02, 1, 0.03, '#3B3F8F', { r: 0.004, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm }; });
    [0, 4000, 8000].forEach(f => { const t = S.text(`${f / 1000}k`, { size: 0.07, weight: 700, face: 'front', color: '#5A5A66' }); t.position.set(fx(f), SY - 0.08, -0.465); S.add(t); });
    const hz = S.text('Hz →', { size: 0.07, weight: 700, face: 'front', color: '#5A5A66' }); hz.position.set(fx(10500), SY - 0.08, -0.465); S.add(hz);
    const nyq = P.box(0.02, SH + 0.1, 0.04, '#D64545', { r: 0.005 }); nyq.userData.noFit = true; S.add(nyq);
    const nyqT = S.text('', { size: 0.065, weight: 800, face: 'front', color: '#D64545' }); nyqT.userData.noFit = true; S.add(nyqT);
    const trueM = P.box(0.02, 0.12, 0.04, '#9A9AA6', { r: 0.005 }); trueM.userData.noFit = true; S.add(trueM);
    const peakT = S.text('', { size: 0.075, weight: 800, face: 'front', color: ink, bg: '#FFF1C9', top: true }); peakT.userData.noFit = true; S.add(peakT);

    let R = null;
    function compute() {
      const sr = RATES[st.sr], N = FFTS[st.n], nyqF = sr / 2;
      const amp = st.filt && st.f > nyqF ? 0 : st.gain;   // the recorder's low-pass filter removes what cannot be represented
      const xs = Array.from({ length: 256 }, (_, i) => Math.max(-1, Math.min(1, amp * Math.cos(2 * Math.PI * st.f * i / sr))));
      const frame = xs.slice(0, N).map((x, i) => x * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))));
      const mag = []; for (let k = 0; k <= N / 2; k++) { let re = 0, im = 0; frame.forEach((x, i) => { re += x * Math.cos(2 * Math.PI * k * i / N); im -= x * Math.sin(2 * Math.PI * k * i / N); }); mag.push(Math.hypot(re, im) / (N / 4)); }
      const pk = mag.indexOf(Math.max(...mag)), alias = Math.abs(st.f - sr * Math.round(st.f / sr));
      return { sr, N, nyqF, amp, xs, mag, peak: mag[pk] > 0.05 ? pk * sr / N : null, binW: sr / N, alias, clipped: amp > 1 };
    }
    function draw() {
      R = compute();
      const A = R.amp;
      setLine(truth, t => Math.max(-1.3, Math.min(1.3, (st.filt && st.f > R.nyqF ? st.gain : R.amp) * Math.cos(2 * Math.PI * st.f * t))), ZW + 0.02);
      // playback: the band-limited wave through the samples (the alias frequency), flattened where the samples clipped
      setLine(recon, t => Math.max(-1, Math.min(1, A * Math.cos(2 * Math.PI * (st.f > R.nyqF ? R.alias : st.f) * t))), ZW + 0.04);
      const ns = Math.floor(WIN * R.sr) + 1;
      posts.forEach((p, i) => { const on = i < ns; p.r.visible = on; p.b.visible = on; if (!on) return; const t = i / R.sr, v = R.xs[i] ?? Math.max(-1, Math.min(1, A * Math.cos(2 * Math.PI * st.f * t)));
        const a = V(tx(t), WY, ZW + 0.03), b = V(tx(t), WY + v * WA, ZW + 0.03); P.setRod(p.r, a, b); p.b.position.copy(b); p.b.material.color.set(Math.abs(v) >= 0.999 ? '#D64545' : C.teal); });
      const bw = SW / FMAX * R.binW;
      bars.forEach((b, k) => { const on = k < R.mag.length; b.b.visible = on; if (!on) return; const f = k * R.binW, h = Math.max(0.005, Math.min(1, R.mag[k]) * SH);
        b.b.scale.set(Math.max(0.4, bw / 0.02 * 0.8), h, 1); b.b.position.set(fx(f), SY, -0.44); b.mm.color.set(R.peak !== null && k === Math.round(R.peak / R.binW) ? C.orange : '#3B3F8F'); });
      nyq.position.set(fx(R.nyqF), SY - 0.05, -0.43); nyq.visible = R.nyqF <= FMAX; nyqT.userData.set(`Nyquist ${R.nyqF / 1000}k`); nyqT.position.set(fx(Math.min(R.nyqF, FMAX)) - 0.25, SY + SH + 0.12, -0.44);
      trueM.position.set(fx(st.f), SY - 0.02, -0.43);
      peakT.visible = R.peak !== null; if (R.peak !== null) { peakT.userData.set(`${Math.round(R.peak)} Hz`); peakT.position.set(fx(R.peak), SY + Math.min(1, R.mag[Math.round(R.peak / R.binW)]) * SH + 0.12, -0.42); }
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Sunbird call pitch', min: 1000, max: 10000, step: 250, get: () => st.f, set: v => { st.f = v; draw(); }, fmt: v => `${v} Hz` },
      { type: 'buttons', label: 'Sample rate', options: ['8,000', '16,000', '44,100'], get: () => st.sr, act: i => { st.sr = i; draw(); } },
      { type: 'toggle', label: 'Low-pass filter before sampling', short: 'filter', get: () => st.filt, set: v => { st.filt = v; draw(); } },
      { type: 'slider', label: 'Gain', min: 0.2, max: 1.6, step: 0.05, get: () => st.gain, set: v => { st.gain = v; draw(); }, fmt: v => `${v.toFixed(2)}×` },
      { type: 'buttons', label: 'DFT size', options: ['16', '64', '256'], get: () => st.n, act: i => { st.n = i; draw(); } },
    ];
    const readouts = [
      { label: 'Nyquist', get: () => ({ v: `${R.nyqF.toLocaleString('en')} Hz`, sub: 'half the sample rate', bad: st.f > R.nyqF }) },
      { label: 'Peak found', get: () => ({ v: R.peak === null ? 'none' : `${Math.round(R.peak).toLocaleString('en')} Hz`, sub: `call is ${st.f.toLocaleString('en')} Hz`, good: R.peak !== null && Math.abs(R.peak - st.f) <= R.binW / 2 + 1, bad: R.peak !== null && Math.abs(R.peak - st.f) > R.binW / 2 + 1 }) },
      { label: 'Bin width', get: () => ({ v: `${Math.round(R.binW)} Hz`, sub: 'sample rate ÷ DFT size', bad: R.binW > 500 }) },
    ];
    const labels = [
      { name: 'wave', t: 'Samples', d: 'Red posts: clipped at the limit', icon: 'wave', atV: V(WX - WW / 2 - 0.15, WY, -0.5) },
      { name: 'spec', t: 'Spectrum', d: 'Red line: Nyquist', icon: 'scale', atV: V(SX + 1.25, 1.1, -0.5) },
    ];
    const reset = () => { Object.assign(st, { f: 6000, sr: 1, filt: true, gain: 0.8, n: 2 }); draw(); };
    const breaks = [
      { label: 'Sample too slowly, no filter', hint: '8,000 a second', on: () => { reset(); st.sr = 0; st.filt = false; draw(); }, off: reset },
      { label: 'Gain too high', hint: 'Clip the peaks', on: () => { reset(); st.f = 2000; st.gain = 1.5; draw(); }, off: reset },
      { label: 'Tiny DFT', hint: '16 samples', on: () => { reset(); st.n = 0; st.f = 6250; draw(); }, off: reset },
    ];
    function status() {
      if (st.f > R.nyqF && !st.filt) return { ok: false, msg: `<b>A false, lower call.</b> At ${R.sr.toLocaleString('en')} samples a second, nothing above ${R.nyqF.toLocaleString('en')} Hz can be represented. The ${st.f.toLocaleString('en')} Hz call is not lost, it folds back: the samples fit a ${R.alias.toLocaleString('en')} Hz wave exactly, and that is what plays back and what the DFT finds. A researcher would log the wrong species. Filter out everything above Nyquist before sampling.` };
      if (st.f > R.nyqF) return { ok: false, msg: `<b>Filtered out, honestly.</b> The ${st.f.toLocaleString('en')} Hz call is above Nyquist (${R.nyqF.toLocaleString('en')} Hz), so the low-pass filter removes it before sampling. Nothing false is recorded, but the call is gone. Sample at least twice as fast as the highest pitch you need.` };
      if (R.clipped) return { ok: false, msg: `<b>Clipped peaks, false overtones.</b> With gain at ${st.gain.toFixed(2)}×, the wave goes past the recorder's limit and the red samples are flattened at ±1. Flattened peaks contain extra frequencies: the DFT shows energy at ${(3 * st.f).toLocaleString('en')} Hz${3 * st.f > R.nyqF ? ' (folded back below Nyquist)' : ''} and beyond, overtones the bird never sang. Lower the gain so the loudest sound stays inside the limit.` };
      if (R.binW > 500) return { ok: false, msg: `<b>Bins too coarse.</b> A ${R.N}-sample DFT at ${R.sr.toLocaleString('en')} Hz has bins ${Math.round(R.binW).toLocaleString('en')} Hz wide, so the call can only be placed at ${R.peak ? Math.round(R.peak).toLocaleString('en') : '?'} Hz, ${R.peak ? Math.abs(Math.round(R.peak - st.f)).toLocaleString('en') : '?'} Hz out. Longer frames give finer frequency detail, at the cost of timing.` };
      return { ok: true, msg: `<b>${st.f.toLocaleString('en')} Hz, found at ${Math.round(R.peak).toLocaleString('en')} Hz.</b> ${R.sr.toLocaleString('en')} samples a second puts Nyquist at ${R.nyqF.toLocaleString('en')} Hz, above the call, so the samples pin it down; the ${R.N}-sample DFT has bins ${Math.round(R.binW)} Hz wide.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A forest recorder', home: true, say: 'A field recorder in Kakamega Forest captures a sunbird\'s call. The grey line is two thousandths of a second of the real sound.', act: m => m.set({ f: 6000, sr: 1, filt: true, gain: 0.8, n: 2 }) },
    { t: 'Samples', home: true, say: 'The recorder measures the wave sixteen thousand times a second. Each post is one sample; playback draws the orange wave through them.', act: m => m.set({}) },
    { t: 'Fourier', home: true, say: 'A Fourier transform turns the samples into frequencies. One peak, at the call\'s pitch.', act: m => m.set({}) },
    { t: 'Too slow', home: true, say: 'Sample only eight thousand times a second, with no filter. The call folds back to a false, lower pitch.', act: m => m.set({ sr: 0, filt: false }) },
    { t: 'Clipping', home: true, say: 'Turn the gain too high, and the peaks are cut flat at the limit. False overtones appear that the bird never sang.', act: m => m.set({ sr: 1, filt: true, f: 2000, gain: 1.5 }) },
    { t: 'Fine detail', home: true, say: 'A tiny transform has coarse bins. Longer frames place the pitch more precisely.', act: m => m.set({ f: 6250, gain: 0.8, n: 0 }) },
  ],
  check: [
    { q: 'At 16,000 samples a second, what is the highest frequency that can be represented?', options: ['8,000 Hz', '16,000 Hz', '32,000 Hz'], answer: 0, why: 'Half the sample rate: the Nyquist frequency.' },
    { q: 'What happens to a tone above Nyquist with no filter?', options: ['It folds back and appears at a false, lower frequency', 'It disappears cleanly', 'It gets louder'], answer: 0, why: 'This is aliasing.' },
    { q: 'How wide is each DFT bin?', options: ['Sample rate divided by the number of samples', 'Always 1 Hz', 'Number of samples divided by sample rate'], answer: 0, why: 'Longer frames give finer bins.' },
  ],
  terms: [
    ['Sample rate', 'How many measurements of the wave per second.'],
    ['Nyquist frequency', 'Half the sample rate: the highest frequency that can be represented.'],
    ['Aliasing', 'A frequency above Nyquist folding back as a false, lower one.'],
    ['Clipping', 'Samples cut off at the limit, adding false overtones.'],
    ['DFT', 'Discrete Fourier transform: the strength of each frequency in a frame.'],
    ['Bin', 'One frequency slot of the DFT.'],
  ],
  deeper: '<p><b>Rates in practice.</b> Phone calls use 8,000 samples a second, which cuts off many consonants; speech recognisers such as Whisper expect 16,000; music uses 44,100 or 48,000. Resampling libraries filter before they downsample.</p><p><b>Bioacoustics.</b> Projects across Africa record forests and savannahs around the clock to count birds, bats and elephants. Bat calls reach far above human hearing, so those recorders sample hundreds of thousands of times a second.</p><p><b>About this machine.</b> The call is a pure tone. Sampling, clipping, the playback wave through the samples and the DFT with a Hann window are computed live.</p>',
  code: {
    title: 'Sampling, aliasing and the DFT',
    note: 'Adapted from the course\'s audio fundamentals lesson.',
    text: `
import numpy as np

sr, f = 8_000, 6_000                         # a 6 kHz call sampled at 8 kHz
n = np.arange(256)
x = np.cos(2 * np.pi * f * n / sr)           # Nyquist is 4 kHz: this will alias

frame = x * np.hanning(len(x))
mag = np.abs(np.fft.rfft(frame))
peak_hz = mag.argmax() * sr / len(x)
print(peak_hz)                               # 2000.0, not 6000: |6000 - 8000|
`,
  },
};
