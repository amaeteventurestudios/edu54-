// The Fourier transform: a sound wave made of three notes is drawn as a ribbon; the transform splits it back into bars, one per frequency.
// Each bar's height is how much of that note is in the sound. Sampling and filtering act on the same ribbon.
// Break it: sample too slowly (a high note shows up as a low one: aliasing), cut off the high frequencies of a square wave (ringing).
const NOTES = [{ f: 2, a: 1.0 }, { f: 5, a: 0.55 }, { f: 11, a: 0.35 }];
const FMAX = 32, WX = -0.2, WL = 5.6, WY = 1.55, SX = -0.2;

export default {
  slug: 'fourier',
  title: 'Fourier: splitting a sound into notes',
  description: 'Three kora strings sound together and make one wobbly wave. The Fourier transform splits it back into three clean bars, one per note. Then sample too slowly and watch a high note pretend to be a low one, or cut the high notes from a square wave and watch it ring.',
  overview: 'Any repeating signal, from a chord on a kora to a heartbeat or a year of rainfall, is a sum of plain sine waves at different frequencies. The Fourier transform finds them: it measures how much of each frequency the signal contains. Speech models start from this view of sound, image models use its two-dimensional cousin, and the transform also explains why you must sample at least twice as fast as the highest frequency you care about.',
  keywords: ['fourier transform explained', 'frequency spectrum', 'aliasing nyquist', 'fft', 'spectrogram'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0.2], dir: [0.15, 0.75, 1.4], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { on: [true, true, true], shape: 'chord', rate: 64, cut: FMAX, t: 0 };
    // the signal: the three notes, or a square wave built from its odd harmonics
    const sig = x => st.shape === 'square'
      ? (() => { let s = 0; for (let k = 1; 2 * k <= FMAX; k += 2) if (2 * k <= st.cut) s += 4 / Math.PI / k * Math.sin(2 * Math.PI * 2 * k * x); return s * 0.8; })()
      : NOTES.reduce((s, n, i) => s + (st.on[i] && n.f <= st.cut ? n.a * Math.sin(2 * Math.PI * n.f * x) : 0), 0);
    /* ---------- the wave wall ---------- */
    const wall = P.box(WL + 0.4, 1.6, 0.06, '#FFFFFF', { r: 0.02 }); wall.position.set(WX, WY - 0.8, -1.0); S.add(wall);
    const mid = P.rod(V(WX - WL / 2, WY, -0.95), V(WX + WL / 2, WY, -0.95), 0.006, '#C9C4B6'); mid.layers.set(1); S.add(mid);
    let wave = P.tube([V(), V(1, 0, 0)], 0.025, C.teal); wave.userData.noFit = true; S.add(wave);
    const SM = 128, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: C.orange }), SM); dots.userData.noFit = true; dots.layers.set(1); S.add(dots);
    let rec = P.tube([V(), V(1, 0, 0)], 0.016, C.orange); rec.userData.noFit = true; S.add(rec);
    const wallT = S.text('THE SOUND: ONE SECOND', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 3 }); wallT.position.set(WX, WY + 0.62, -0.965); S.add(wallT);
    /* ---------- the spectrum shelf ---------- */
    const shelf = P.box(WL + 0.4, 0.1, 1.0, '#2C2D31', { r: 0.08 }); shelf.position.set(SX, 0, 0.75); S.add(shelf);
    const bars = [...Array(FMAX)].map((_, k) => { const m = new THREE.MeshLambertMaterial({ color: C.gold }); const b = P.box(WL / FMAX * 0.7, 1, 0.4, C.gold, { r: 0.01, material: m }); b.position.set(SX - WL / 2 + WL / FMAX * (k + 0.5), 0.1, 0.75); b.userData.noFit = true; S.add(b); return { b, m }; });
    const ticks = [2, 5, 11, 16, 24, 32].map(f => { const t = S.text(String(f), { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 0.4 }); t.position.set(SX - WL / 2 + WL / FMAX * (f - 0.5), 0.105, 1.12); S.add(t); return t; });
    const shelfT = S.text('frequency (notes per second) →', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 3.6 }); shelfT.position.set(SX, 0.05, 1.255); S.add(shelfT);
    const cutBar = P.box(0.04, 0.9, 1.0, C.red, { r: 0, m: { opacity: 0.6 } }); cutBar.material.depthWrite = false; cutBar.userData.noFit = true; S.add(cutBar);
    const nyq = P.box(0.04, 0.6, 1.0, C.plum, { r: 0 }); nyq.userData.noFit = true; S.add(nyq);
    const nyqT = S.text('', { size: 0.11, weight: 800, color: '#FFFFFF', bg: C.plum, face: 'cam', top: true, maxW: 2 }); nyqT.userData.noFit = true; S.add(nyqT);
    // the transform itself: correlate the samples with a sine and a cosine at each frequency
    function spectrum() {
      const n = st.rate, xs = [...Array(n)].map((_, i) => sig(i / n)), out = [];
      for (let k = 1; k <= FMAX; k++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { re += xs[i] * Math.cos(2 * Math.PI * k * i / n); im += xs[i] * Math.sin(2 * Math.PI * k * i / n); } out.push(k <= n / 2 ? 2 * Math.hypot(re, im) / n : 0); }
      return { xs, out };
    }
    let spec = spectrum();
    function draw() {
      spec = spectrum();
      const X = x => WX - WL / 2 + x * WL;
      const pts = []; for (let i = 0; i <= 400; i++) { const x = i / 400; pts.push(V(X(x), WY + sig(x) * 0.42, -0.95)); }
      wave.geometry.dispose(); wave.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.025, 6, false);
      // the samples, and the wave you would rebuild from them (straight lines between the dots)
      const n = st.rate, dummy = new THREE.Object3D(), sp = [];
      for (let i = 0; i < SM; i++) { const on = i < n; const x = i / n; dummy.position.set(on ? X(x) : 0, on ? WY + spec.xs[i] * 0.42 : -9, -0.92); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); if (on) sp.push(V(X(x), WY + spec.xs[i] * 0.42, -0.91)); }
      dots.instanceMatrix.needsUpdate = true;
      rec.geometry.dispose(); rec.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp, false, 'catmullrom', 0), sp.length * 4, 0.016, 5, false); rec.visible = n < 40;
      const peak = Math.max(0.6, ...spec.out);
      bars.forEach((b, k) => { const h = spec.out[k] / peak * 1.7; b.b.scale.y = Math.max(0.01, h); b.b.visible = h > 0.01; const real = st.shape === 'chord' && NOTES.some((nn, i) => st.on[i] && nn.f === k + 1); b.m.color.set(st.shape === 'chord' && !real && h > 0.05 ? C.red : C.gold); });
      const cx = SX - WL / 2 + WL / FMAX * Math.min(FMAX, st.cut + 0.5); cutBar.position.set(cx, 0.1, 0.75); cutBar.visible = st.cut < FMAX;
      const nx = SX - WL / 2 + WL / FMAX * Math.min(FMAX, n / 2 + 0.5); nyq.position.set(nx, 0.1, 0.75); nyq.visible = n / 2 < FMAX;
      nyqT.position.set(nx, 0.95, 0.75); nyqT.userData.set(`limit: ${n / 2} (half of ${n} samples)`); nyqT.visible = nyq.visible;
    }
    draw();
    const found = () => spec.out.map((v, k) => [k + 1, v]).filter(([, v]) => v > 0.12).map(([k]) => k);
    const controls = [
      { type: 'buttons', label: 'Sound', options: ['Three kora notes', 'Square wave'], get: () => st.shape === 'chord' ? 0 : 1, act: i => { st.shape = i ? 'square' : 'chord'; draw(); } },
      { type: 'toggle', label: 'Low note (2 per second)', short: 'Note 2', get: () => st.on[0], set: v => { st.on[0] = v; st.shape = 'chord'; draw(); }, quick: false },
      { type: 'toggle', label: 'Middle note (5)', short: 'Note 5', get: () => st.on[1], set: v => { st.on[1] = v; st.shape = 'chord'; draw(); }, quick: false },
      { type: 'toggle', label: 'High note (11)', short: 'Note 11', get: () => st.on[2], set: v => { st.on[2] = v; st.shape = 'chord'; draw(); } },
      { type: 'slider', label: 'Samples per second', min: 8, max: 128, step: 2, get: () => st.rate, set: v => { st.rate = Math.round(v / 2) * 2; draw(); } },
      { type: 'slider', label: 'Keep frequencies up to', min: 1, max: FMAX, step: 1, get: () => st.cut, set: v => { st.cut = Math.round(v); draw(); } },
    ];
    const readouts = [
      { label: 'Notes found', get: () => { const f = found(); return { v: f.length ? f.join(', ') : 'none', good: st.shape === 'chord' && f.join() === NOTES.filter((n, i) => st.on[i] && n.f <= st.cut).map(n => n.f).join(), bad: st.shape === 'chord' && f.some(k => !NOTES.some((n, i) => st.on[i] && n.f === k)) }; } },
      { label: 'Samples per second', get: () => ({ v: st.rate, sub: `can hear up to ${st.rate / 2}`, bad: st.rate / 2 < 11 && st.on[2] && st.shape === 'chord' }) },
    ];
    const labels = [
      { name: 'wave', t: 'The sound', d: 'Three notes added into one wave', icon: 'wave', atV: V(WX - WL / 2, WY + 0.5, -0.95) },
      { name: 'dots', t: 'Samples', d: 'What a microphone actually records', icon: 'target', atV: V(WX + WL / 2, WY + 0.5, -0.95) },
      { name: 'bars', t: 'The spectrum', d: 'How much of each frequency is in the sound', icon: 'scale', atV: V(SX - WL / 2, 0.1, 1.25) },
      { name: 'limit', t: 'The highest note you can hear', d: 'Half the sampling rate', icon: 'info', atV: V(SX + WL / 2, 0.1, 1.25) },
    ];
    const reset = () => { Object.assign(st, { on: [true, true, true], shape: 'chord', rate: 64, cut: FMAX }); draw(); };
    const breaks = [
      { label: 'Sample too slowly', hint: '14 samples a second for an 11-per-second note', on: () => { reset(); st.rate = 14; draw(); }, off: reset },
      { label: 'Cut the high notes of a square wave', hint: 'Keep only up to 7', on: () => { reset(); st.shape = 'square'; st.cut = 7; draw(); }, off: reset },
    ];
    function status() {
      const f = found();
      if (st.shape === 'chord' && st.rate / 2 < 11 && st.on[2]) { const alias = Math.abs(11 - st.rate * Math.round(11 / st.rate)); return { ok: false, msg: `<b>A note that isn't there.</b> At ${st.rate} samples a second you can only hear up to ${st.rate / 2}. The 11-per-second note is too fast, so its samples line up with a slower wave and it shows up as a false note at ${alias} (red bar). This is aliasing: sample at least twice as fast as the highest frequency, or filter it out first.` }; }
      if (st.shape === 'square' && st.cut < FMAX) return { ok: false, msg: `<b>Ringing at the corners.</b> A square wave's sharp corners need many high frequencies. Keeping only up to ${st.cut} leaves a wave that overshoots and wobbles near every jump. Images compressed too hard show the same ripples around sharp edges.` };
      if (st.shape === 'square') return { msg: `<b>A square wave is a sum of odd notes:</b> 2, 6, 10, 14… per second, each smaller than the last. The more you keep, the sharper the corners.` };
      return { ok: true, msg: `<b>Found: ${f.join(', ')} per second.</b> The transform compared the samples with a pure wave at every frequency; only the notes actually in the sound matched, and the height of each bar is how loud that note is.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One wobbly wave', home: true, say: 'Three strings on a kora sound together. What reaches your ear is one wobbly wave, the three notes added together.', act: m => m.reset() },
    { t: 'Samples', focus: 'dots', zoom: 1.35, say: 'A microphone does not record the smooth wave. It measures it many times a second: these orange dots are the samples.' },
    { t: 'The spectrum', focus: 'bars', zoom: 1.35, say: 'The Fourier transform compares the samples with a pure wave at every frequency. Three bars light up: two, five and eleven beats a second, the three strings, each as tall as it is loud.' },
    { t: 'Take one away', home: true, say: 'Silence the high string, and its bar disappears, while the wave above loses its fast ripple.', act: m => m.set({ on: [true, true, false] }), wait: 4 },
    { t: 'Too few samples', home: true, say: 'Now sample too slowly. The high note is faster than half the sampling rate, so it disguises itself as a lower note that is not really there. This is called aliasing.', act: m => m.set({ on: [true, true, true], rate: 14 }), wait: 6 },
    { t: 'Sharp corners', home: true, say: 'A square wave needs many high notes to make its sharp corners. Cut them off, and the wave rings and wobbles at every jump.', act: m => m.set({ rate: 64, shape: 'square', cut: 7 }), wait: 5 },
  ],
  check: [
    { q: 'What does the Fourier transform tell you about a sound?', options: ['How much of each frequency it contains', 'How long it lasts', 'Who is speaking'], answer: 0, why: 'It splits the signal into pure waves and measures each one\'s strength.' },
    { q: 'You sample at 14 times a second. What is the highest frequency you can capture faithfully?', options: ['14 per second', '7 per second', '28 per second'], answer: 1, why: 'Half the sampling rate. Faster notes alias into false lower ones.' },
    { q: 'Why does a square wave ring when its high frequencies are removed?', options: ['Its sharp corners are built from many high frequencies', 'Square waves are always noisy', 'The microphone broke'], answer: 0, why: 'Without the high frequencies the corners can\'t be sharp, so the wave overshoots and wobbles.' },
  ],
  terms: [
    ['Frequency', 'How many times a wave repeats each second.'],
    ['Spectrum', 'The strength of every frequency in a signal.'],
    ['Sampling rate', 'How many measurements of a signal are taken each second.'],
    ['Nyquist limit', 'Half the sampling rate: the highest frequency you can capture without aliasing.'],
    ['Aliasing', 'A frequency above the limit masquerading as a lower one.'],
    ['FFT', 'The fast Fourier transform: an efficient way to compute the spectrum.'],
  ],
  deeper: '<p><b>Spectrograms.</b> Speech models slice audio into short windows, take the spectrum of each, and stack them into a picture: time across, frequency up, loudness as brightness. A model like Whisper reads that picture.</p><p><b>Convolution is multiplication.</b> Sliding a filter over a signal is the same as multiplying their spectra. That is why the FFT makes long convolutions fast.</p><p><b>Images too.</b> A 2D Fourier transform splits a picture into stripes of different fineness. JPEG compression throws away the finest ones, which is why over-compressed photos ripple around edges.</p>',
  code: {
    title: 'Find the notes with an FFT',
    note: 'Adapted from the course\'s Fourier lesson.',
    text: `
import numpy as np

rate = 64                                   # samples per second
t = np.arange(rate) / rate                  # one second
sound = (1.0 * np.sin(2 * np.pi * 2 * t) +
         0.55 * np.sin(2 * np.pi * 5 * t) +
         0.35 * np.sin(2 * np.pi * 11 * t))

spectrum = np.abs(np.fft.rfft(sound)) * 2 / rate
freqs = np.fft.rfftfreq(rate, d=1 / rate)
print(freqs[spectrum > 0.1])                # [ 2.  5. 11.]

slow = 14                                   # too slow for the 11 note
t2 = np.arange(slow) / slow
s2 = np.sin(2 * np.pi * 11 * t2)
print(np.fft.rfftfreq(slow, 1 / slow)[np.abs(np.fft.rfft(s2)).argmax()])   # 3.0: an alias
`,
  },
};
