// Anti-spoofing and watermarking: a fact-check desk in Johannesburg receives a viral voice note said to be a city official. It was made by an AI voice tool that stamps a 16-bit
// watermark. Three checks stand in a row: provenance metadata, a watermark detector, a spoofing detector. The watermark is real spread-spectrum, embedded and recovered live
// (a pseudo-random carrier per bit, read back by correlation); attacks are applied to the samples. The spoofing detector's score is a typical value.
// Break it: pitch shift (the watermark is scrambled; with no spoofing detector the fake passes), watermark turned up until it is audible, trusting metadata alone (stripped on re-upload).
const BITS = 16, CHIPS = 256, L = BITS * CHIPS;
const PAYLOAD = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1];
function makeAudio() {
  let seed = 87; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const x = new Float64Array(L); let a = 0, b = 0;
  for (let i = 0; i < L; i++) { a = 0.97 * a + rnd(); b = 0.9 * b + a * 0.1; x[i] = b * 0.6 * (0.6 + 0.4 * Math.sin(i / 300)); }   // a speech-like low-frequency signal
  const pn = new Float64Array(L); let s2 = 13; for (let i = 0; i < L; i++) { s2 = (s2 * 16807) % 2147483647; pn[i] = s2 / 2147483647 < 0.5 ? -1 : 1; }
  return { x, pn };
}
const A = makeAudio(), POW = A.x.reduce((s, v) => s + v * v, 0) / L;
function pipeline(st) {
  const alpha = [0.004, 0.03][st.strong ? 1 : 0] * Math.sqrt(POW) * 4;
  let y = Array.from(A.x, (v, i) => v + alpha * A.pn[i] * (PAYLOAD[Math.floor(i / CHIPS)] ? 1 : -1));
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  if (st.attack === 1) y = y.map((v, i) => (y[i] + (y[i - 1] ?? v) + (y[i - 2] ?? v)) / 3);   // lossy compression: a gentle low-pass
  if (st.attack === 2) y = y.map(v => v + rnd() * Math.sqrt(POW) * 0.3);                    // noise mixed in
  if (st.attack === 3) { const f = 1.06; y = Array.from({ length: L }, (_, i) => { const p = i * f, k = Math.floor(p), u = p - k; return k + 1 < L ? y[k] * (1 - u) + y[k + 1] * u : 0; }); }   // pitch shift by resampling
  // detector: remove the slow speech part, then correlate each bit's chips with the carrier
  const hp = y.map((v, i) => v - (i ? y[i - 1] : 0) * 0.97);
  const pnh = Array.from(A.pn, (v, i) => v - (i ? A.pn[i - 1] : 0) * 0.97);
  const got = PAYLOAD.map((_, b) => { let c = 0; for (let i = b * CHIPS; i < (b + 1) * CHIPS; i++) c += hp[i] * pnh[i]; return c > 0 ? 1 : 0; });
  const acc = got.filter((v, i) => v === PAYLOAD[i]).length / BITS;
  const wmSnr = 10 * Math.log10(POW / (alpha * alpha));
  return { got, acc, wm: acc >= 0.875, wmSnr, audible: wmSnr < 30 };
}

export default {
  slug: 'anti-spoofing-audio-watermarking',
  title: 'Spotting fakes: watermarks and detectors',
  description: 'A fact-check desk in Johannesburg gets a viral voice note said to be a city official. Three checks stand in a row, and a re-encode can strip the hidden mark.',
  overview: 'Synthetic speech is now good enough to fool people, so defences come in layers. Provenance standards such as C2PA attach signed metadata saying which tool made a file, but re-encoding or re-uploading strips it. Watermarks such as AudioSeal hide a few bits, for example a model or consent ID, inside the audio itself: spread across many samples at a level far below the speech, they survive compression and added noise, and a detector reads them back by correlation. They have a known weak spot: pitch shifting, which stretches the signal and scrambles where the bits sit. Spoofing detectors such as AASIST look for traces of synthesis in any clip, watermarked or not; they reach a few per cent error on benchmarks but more in the wild, so they should be calibrated on real clips. A watermark only helps if someone runs the detector.',
  keywords: ['anti-spoofing', 'deepfake audio', 'audio watermarking', 'audioseal', 'aasist', 'c2pa'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.95, 0.1], dir: [0.05, 0.3, 1.3], half: 1.45, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { attack: 0, strong: false, det: true, meta: false, read: true };
    const ink = '#151827';
    /* the clip on a track, passing three checks */
    const track = P.box(6.0, 0.05, 0.4, '#2B2B38', { r: 0.03 }); track.position.set(0, 0.12, 0.55); floor.add(track);
    const clip = P.box(0.6, 0.2, 0.3, '#3B3F8F', { r: 0.04 }); clip.position.set(-2.7, 0.17, 0.55); floor.add(clip);

    const GATES = ['Provenance', 'Watermark', 'Spoof detector'], GX = [-1.3, 0.2, 1.7];
    const gates = GATES.map((n, k) => {
      const mm = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), arch = P.box(0.12, 0.7, 0.12, '#3B3F8F', { r: 0.02, material: mm }); arch.position.set(GX[k] - 0.3, 0.12, 0.55); floor.add(arch);
      const arch2 = P.box(0.12, 0.7, 0.12, '#3B3F8F', { r: 0.02, material: mm }); arch2.position.set(GX[k] + 0.3, 0.12, 0.55); floor.add(arch2);
      const top = P.box(0.72, 0.12, 0.14, '#3B3F8F', { r: 0.02, material: mm }); top.position.set(GX[k], 0.82, 0.55); floor.add(top);
      const lamp = new THREE.MeshLambertMaterial({ color: '#C9C5BA' }), l = P.ball(0.06, '#C9C5BA'); l.material = lamp; l.position.set(GX[k], 1.04, 0.55); floor.add(l);
      const sp = P.box(1.0, 0.24, 0.05, '#FBF8F1', { r: 0.02 }); sp.position.set(GX[k], 0.12, 0.95); floor.add(sp);
      return { mm, lamp };
    });
    const verdict = P.box(0.9, 0.4, 0.1, '#9ED9C9', { r: 0.04 }); verdict.position.set(2.85, 0.12, 0.55); floor.add(verdict);

    /* the bits board behind */
    const BZ = -0.7, bb = P.box(5.6, 1.2, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); bb.position.set(0.2, 0.8, BZ); floor.add(bb);
    [-2.5, 2.9].forEach(x => { const p = P.cyl(0.03, 0.68, '#8A8578'); p.position.set(x, 0.12, BZ); floor.add(p); });

    const row = (y, name) => {
      return PAYLOAD.map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), b = P.box(0.22, 0.24, 0.05, '#3B3F8F', { r: 0.02, material: mm }); b.position.set(-1.55 + i * 0.27, y - 0.12, BZ + 0.04); floor.add(b);
           return { mm }; }); };
    const sent = row(1.5, 'stamped'), read = row(1.08, 'read back');

    let R = null;
    function run() {
      const W = pipeline(st), metaKept = st.meta;   // re-uploads through messaging apps strip metadata; the desk may have the original file
      const spoof = st.attack === 3 ? 0.74 : 0.82, spoofOn = st.det && spoof > 0.5;
      const wmFound = st.read && W.wm, flagged = metaKept || wmFound || spoofOn;
      return { ...W, metaKept, spoof, spoofOn, flagged, wmFound };
    }
    function draw() {
      R = run();
      sent.forEach((c, i) => {  c.mm.color.set('#3B3F8F'); });
      read.forEach((c, i) => {  c.mm.color.set(R.got[i] === PAYLOAD[i] ? '#2E9E6A' : '#D64545'); });
      const set = (k, state, text) => { gates[k].lamp.color.set(state === 'fake' ? '#D64545' : state === 'none' ? '#C9C5BA' : '#2E9E6A');  gates[k].mm.color.set(state === 'off' ? '#C9C5BA' : '#3B3F8F'); };
      set(0, R.metaKept ? 'fake' : 'none', R.metaKept ? 'says: AI voice tool' : 'metadata stripped');
      set(1, !st.read ? 'off' : R.wm ? 'fake' : 'none', !st.read ? 'not run' : R.wm ? `payload found, ${Math.round(R.acc * 100)}% bits` : `no mark, ${Math.round(R.acc * 100)}% bits`);
      set(2, st.det ? (R.spoofOn ? 'fake' : 'pass') : 'off', st.det ? `synthetic score ${R.spoof.toFixed(2)}` : 'not run');
      verdict.material.color.set(R.flagged ? '#E8A0A0' : '#9ED9C9');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Before it reaches the desk', options: ['Untouched', 'Compressed', 'Noise added', 'Pitch shifted'], get: () => st.attack, act: i => { st.attack = i; draw(); } },
      { type: 'buttons', label: 'Watermark strength', options: ['Inaudible', 'Strong'], get: () => (st.strong ? 1 : 0), act: i => { st.strong = !!i; draw(); } },
      { type: 'toggle', label: 'Read the watermark', short: 'watermark check', get: () => st.read, set: v => { st.read = v; draw(); } },
      { type: 'toggle', label: 'Run the spoofing detector', short: 'spoof detector', get: () => st.det, set: v => { st.det = v; draw(); } },
      { type: 'toggle', label: 'Original file with metadata', short: 'metadata', get: () => st.meta, set: v => { st.meta = v; draw(); } },
    ];
    const readouts = [
      { label: 'Bits recovered', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: '50% is guessing', good: R.acc >= 0.875, bad: R.acc < 0.75 }) },
      { label: 'Watermark level', get: () => ({ v: `${R.wmSnr.toFixed(0)} dB below`, sub: 'the speech; under 30 is audible', bad: R.audible, good: !R.audible }) },
      { label: 'Verdict', get: () => ({ v: R.flagged ? 'synthetic' : 'real', sub: 'the clip is AI-made', good: R.flagged, bad: !R.flagged }) },
    ];
    const labels = [
      { name: 'gates', t: 'Three checks', d: 'Red lamp: synthetic found', icon: 'check', atV: V(-3.0, 0.3, 0.55) },
      { name: 'bits', t: 'Hidden bits', d: 'Green: read back right', icon: 'code', atV: V(2.95, 1.2, BZ) },
    ];
    const reset = () => { Object.assign(st, { attack: 0, strong: false, det: true, meta: false, read: true }); draw(); };
    const breaks = [
      { label: 'Pitch shift, no detector', hint: 'The universal attack', on: () => { reset(); st.attack = 3; st.det = false; draw(); }, off: reset },
      { label: 'Watermark too strong', hint: 'Make it robust', on: () => { reset(); st.strong = true; draw(); }, off: reset },
      { label: 'Trust metadata alone', hint: 'No audio checks run', on: () => { reset(); st.det = false; st.read = false; draw(); }, off: reset },
    ];
    function status() {
      const acc = Math.round(R.acc * 100);
      if (!R.flagged && st.attack === 3) return { ok: false, msg: `<b>A fake passes as real.</b> Shifting the pitch by 6% stretches the clip, so every bit's carrier slides out of place and the detector reads back ${acc}% of the bits, no better than guessing. The metadata was stripped on re-upload, and the spoofing detector was not run. Pitch shift beats every watermark today; always run a detector as well.` };
      if (!R.flagged) return { ok: false, msg: `<b>Nothing checked the audio itself.</b> The clip came through a messaging app, which stripped its metadata, and the desk relied on that: the watermark was never read${R.wm ? ', though it was there all along' : ''}, and no spoofing detector ran. A watermark only helps if someone runs the detector. Check every clip's audio.` };
      if (R.audible) return { ok: false, msg: `<b>Robust, but audible.</b> At this strength the watermark sits only ${R.wmSnr.toFixed(0)} dB below the speech, loud enough to hear as a faint hiss, and it gives the fake away to anyone listening, including whoever wants to remove it. Watermarks are tuned to stay more than about 30 dB below the speech.` };
      return { ok: true, msg: `<b>Flagged as synthetic.</b> ${R.wm ? `The watermark comes back with ${acc}% of bits correct, enough to read the tool's payload` : `The watermark is lost (${acc}% of bits)`}${R.wm && st.attack ? `, even after ${['', 'compression', 'added noise', 'pitch shifting'][st.attack]}` : ''}${st.det ? `, and the spoofing detector scores it ${R.spoof.toFixed(2)}` : ''}. Detectors still err a few per cent of the time in the wild, so the desk checks with the official's office too.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A viral voice note', home: true, say: 'A fact-check desk in Johannesburg gets a viral voice note, said to be a city official. It was made by an AI voice tool.', act: m => m.set({ attack: 0, strong: false, det: true, meta: false, read: true }) },
    { t: 'Hidden bits', home: true, say: 'The tool hid sixteen bits in the audio, spread far below the speech. The detector reads them back by correlation.', act: m => m.set({}) },
    { t: 'Survives the journey', home: true, say: 'Compress it or add noise, and the bits still come back. Metadata, though, was stripped when the clip was re-uploaded.', act: m => m.set({ attack: 2 }) },
    { t: 'Pitch shift', home: true, say: 'Shift the pitch a little, and every bit slides out of place. The watermark is gone. Only the spoofing detector catches it now.', act: m => m.set({ attack: 3 }) },
    { t: 'No detector', home: true, say: 'Skip the detector, and the fake passes as real.', act: m => m.set({ det: false }) },
    { t: 'Too strong', home: true, say: 'Turning the watermark up makes it robust, but audible. A faint hiss gives it away.', act: m => m.set({ attack: 0, det: true, strong: true }) },
  ],
  check: [
    { q: 'Why is provenance metadata alone not enough?', options: ['Re-encoding or re-uploading strips it', 'It is always wrong', 'It makes files larger'], answer: 0, why: 'Check the audio itself too.' },
    { q: 'Which attack defeats today\'s audio watermarks?', options: ['Pitch shifting', 'Mild compression', 'Quiet background noise'], answer: 0, why: 'It moves the bits out of place.' },
    { q: 'What does a spoofing detector look for?', options: ['Traces of synthesis in any clip, watermarked or not', 'Only watermarks', 'Metadata'], answer: 0, why: 'It is the fallback when the mark is lost.' },
  ],
  terms: [
    ['Spoofing', 'Fooling a listener or system with synthetic or replayed speech.'],
    ['Audio watermark', 'Information hidden inside the audio signal.'],
    ['Payload', 'The bits a watermark carries, such as a tool or consent ID.'],
    ['Spread spectrum', 'Hiding each bit across many samples with a pseudo-random carrier.'],
    ['Provenance', 'Signed metadata recording how a file was made.'],
    ['Spoofing detector', 'A model trained to tell synthetic speech from real.'],
  ],
  deeper: '<p><b>Elections and scams.</b> Fake voice notes of officials and relatives travel fast on messaging apps across the continent. Fact-checkers combine detectors with calls to the supposed speaker, and newsrooms share known fakes.</p><p><b>Detectors in the wild.</b> Benchmark error rates of a few per cent rise on real clips with new voices, languages and phone audio. Calibrate on clips like the ones you will see, including African languages and accents.</p><p><b>About this machine.</b> The watermark is real spread-spectrum, embedded and recovered live, and the attacks are applied to the samples. The spoofing detector\'s score is a typical value.</p>',
  code: {
    title: 'Spread-spectrum watermark',
    note: 'Adapted from the course\'s anti-spoofing lesson.',
    text: `
import numpy as np

def embed(x, bits, pn, alpha, chips=256):
    y = x.copy()
    for b, bit in enumerate(bits):
        s = slice(b * chips, (b + 1) * chips)
        y[s] += alpha * pn[s] * (1 if bit else -1)   # far below the speech
    return y

def detect(y, pn, n_bits, chips=256):
    hp = y - 0.97 * np.r_[0, y[:-1]]                 # suppress the slow speech part
    pnh = pn - 0.97 * np.r_[0, pn[:-1]]
    return [int((hp[b*chips:(b+1)*chips] * pnh[b*chips:(b+1)*chips]).sum() > 0) for b in range(n_bits)]
`,
  },
};
