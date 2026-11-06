// Text-to-speech: the public-address system at an Accra bus station reads "Bus to Nkawkaw leaves at 2:30 pm from platform 4." The board shows each stage:
// the text, the words to be spoken (after normalisation), and their sounds (phonemes), each sound a tile as wide as its predicted duration; the waveform comes out in front.
// Pronunciations and durations are a small hand-made lexicon; normalisation, lookups, the mismatch count, length and pitch are computed live.
// Break it: no text normaliser ("two colon three zero"), no local lexicon (Nkawkaw sounded out by English spelling rules), 24 kHz audio played as if 16 kHz (slow and low).
const TEXT = 'Bus to Nkawkaw leaves at 2:30 pm from platform 4.';
const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 30: 'thirty' };
const LEX = { bus: 'b ʌ s', to: 't uː', leaves: 'l iː v z', at: 'æ t', from: 'f r ɒ m', platform: 'p l æ t f ɔː m', four: 'f ɔː', two: 't uː', thirty: 'θ ɜː t i', p: 'p iː', m: 'ɛ m', zero: 'z ɪə r əʊ', three: 'θ r iː', colon: 'k əʊ l ə n', pm: 'p ʌ m' };
const LOCAL = { nkawkaw: 'ŋ k ɔ k ɔ' };
const G2P = w => w.replace(/aw/g, ' ɔː ').replace(/nk/g, 'ɛ n k ').replace(/k/g, ' k ').trim().split(/\s+/).join(' ');   // naive English spelling rules
function normalise(t, on) {
  const ws = t.toLowerCase().replace(/[.,]/g, '').split(/\s+/);
  const out = [];
  ws.forEach(w => {
    if (on) { const m = w.match(/^(\d+):(\d+)$/); if (m) { out.push(NUM[+m[1]], NUM[+m[2]] || m[2]); return; } if (w === 'pm') { out.push('p', 'm'); return; } if (/^\d+$/.test(w)) { out.push(NUM[+w]); return; } out.push(w); return; }
    if (/[\d:]/.test(w)) { w.split('').forEach(ch => out.push(ch === ':' ? 'colon' : NUM[+ch])); return; }   // read character by character
    out.push(w);
  });
  return out;
}
const RIGHT = ['bus', 'to', 'nkawkaw', 'leaves', 'at', 'two', 'thirty', 'p', 'm', 'from', 'platform', 'four'];

export default {
  slug: 'text-to-speech',
  title: 'Text to speech: words into sound',
  description: 'The public-address system at an Accra bus station reads out "Bus to Nkawkaw at 2:30 pm". Normalise the numbers, teach it the local name, and match the sample rate.',
  overview: 'A text-to-speech system first normalises text into the words to be spoken: "2:30 pm" becomes "two thirty p m", "Dr." becomes "doctor" or "drive" depending on context. A lexicon or a grapheme-to-phoneme model turns words into sounds; names it has never seen are sounded out by spelling rules, often wrongly, so local places and people need their own entries. An acoustic model predicts how long each sound lasts and turns them into a mel spectrogram (FastSpeech predicts durations directly; Tacotron used attention; VITS, F5-TTS and Kokoro go end to end), and a vocoder such as HiFi-GAN turns that into a waveform. Output must be played at the sample rate it was made for. Quality is judged by listeners (mean opinion score), by predicted scores such as UTMOS, and by intelligibility: run the audio through a recogniser and measure its errors.',
  keywords: ['text to speech', 'tts', 'text normalisation', 'grapheme to phoneme', 'vocoder', 'mean opinion score'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { norm: true, local: true, sr: 0 };
    /* a row of word blocks, a row of sound blocks as long as they last */
    const wordT = Array.from({ length: 16 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#E3DCCB' }), b = P.box(0.3, 0.14, 0.26, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; b.position.set(0, 0, -0.85); S.add(b); return { mm, b }; });
    const phT = Array.from({ length: 64 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#CDEBD3' }), b = P.box(0.1, 0.1, 0.22, '#fff', { r: 0.01, material: mm }); b.userData.noFit = true; b.position.set(0, 0, -0.4); S.add(b); return { mm, b }; });
    /* the waveform in front, on a speaker plinth */
    const plinth = P.box(5.4, 0.22, 0.5, '#2B2B38', { r: 0.04 }); plinth.position.set(0.3, 0, 0.35); S.add(plinth);
    const spk = P.cyl(0.22, 0.47, '#3B3F8F'); spk.position.set(-2.75, 0, 0.35); S.add(spk);
    const wmm = new THREE.MeshBasicMaterial({ color: C.teal }), wave = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.012, C.teal, { material: wmm }); wave.userData.noFit = true; S.add(wave);
    S.add(P.keep(-3.0, 3.0, 0.75, -1.05, 0.65));

    let R = null;
    function run() {
      const words = normalise(TEXT, st.norm);
      const prons = words.map(w => (LEX[w] ? LEX[w] : st.local && LOCAL[w] ? LOCAL[w] : G2P(w)));
      const extra = words.filter(w => !RIGHT.includes(w)).length, nk = !st.local ? 1 : 0;
      const nPh = prons.join(' ').split(' ').length, rate = st.sr ? 1.5 : 1, secs = nPh * 0.075 * rate, pitch = Math.round(180 / rate);
      return { words, prons, bad: extra + nk, secs, pitch, nPh };
    }
    function draw() {
      R = run();
      const place = (list, w, gap) => { let x = -2.6; return list.map((_, i) => { const r = x + w(i) / 2; x += w(i) + gap; return r; }); };
      const wW = R.words.map(w => 0.12 + w.length * 0.045), wX = place(R.words, i => wW[i], 0.04);
      wordT.forEach((W, i) => { const w = R.words[i], on = i < R.words.length; W.b.visible = on; if (!on) return; const bad = !RIGHT.includes(w) || (w === 'nkawkaw' && !st.local); W.b.scale.x = wW[i] / 0.3; W.b.position.x = wX[i]; W.mm.color.set(bad ? C.red : '#E3DCCB'); });
      const ph = []; R.prons.forEach((p, wi) => p.split(' ').forEach(s => ph.push({ s, wi, bad: !RIGHT.includes(R.words[wi]) || (R.words[wi] === 'nkawkaw' && !st.local) })));
      const dur = s => (/[iːɔːuːɜː]/.test(s) && s.length > 1 ? 0.11 : /[aeiouæʌɒɛɪəɔ]/.test(s) ? 0.085 : 0.065);
      const pw = ph.map(p => dur(p.s)), pX = place(ph, i => pw[i], 0.008);
      phT.forEach((T, i) => { const p = ph[i], on = i < ph.length; T.b.visible = on; if (!on) return; T.b.scale.x = pw[i] / 0.1; T.b.position.x = pX[i]; T.mm.color.set(p.bad ? C.red : '#CDEBD3'); });
      const L = 5.0, pts = [], n = 900, rate = st.sr ? 1.5 : 1, f = 70 / rate, len = Math.min(L, L * (rate === 1 ? 0.67 : 1));
      for (let i = 0; i <= n; i++) { const u = i / n, xw = -2.2 + u * len, env = Math.abs(Math.sin(u * Math.PI * R.nPh / 2.2)) * 0.18; pts.push(V(xw, 0.36 + env * Math.sin(2 * Math.PI * f * u), 0.62)); }
      wave.geometry.dispose(); wave.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1600, 0.008, 5, false);
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Text normaliser', short: 'normaliser', get: () => st.norm, set: v => { st.norm = v; draw(); } },
      { type: 'toggle', label: 'Local place names in the lexicon', short: 'local names', get: () => st.local, set: v => { st.local = v; draw(); } },
      { type: 'buttons', label: 'Played at', options: ['24 kHz, as made', '16 kHz by mistake'], get: () => st.sr, act: i => { st.sr = i; draw(); } },
    ];
    const readouts = [
      { label: 'Words said wrong', get: () => ({ v: String(R.bad), sub: 'red tiles', good: R.bad === 0, bad: R.bad > 0 }) },
      { label: 'Length', get: () => ({ v: `${R.secs.toFixed(1)} s`, sub: st.sr ? '1.5× too slow' : `${R.nPh} sounds`, bad: !!st.sr }) },
      { label: 'Voice pitch', get: () => ({ v: `${R.pitch} Hz`, sub: 'the voice was made at 180', bad: R.pitch !== 180 }) },
    ];
    const labels = [
      { name: 'board', t: 'Words and sounds', d: 'Red: said wrong', icon: 'book', atV: V(-2.68, 0.08, -0.4) },
      { name: 'wave', t: 'Waveform', d: 'What the speakers play', icon: 'wave', atV: V(2.98, 0.2, 0.35) },
    ];
    const reset = () => { Object.assign(st, { norm: true, local: true, sr: 0 }); draw(); };
    const breaks = [
      { label: 'No text normaliser', hint: 'Read characters as they are', on: () => { reset(); st.norm = false; draw(); }, off: reset },
      { label: 'No local names', hint: 'English spelling rules', on: () => { reset(); st.local = false; draw(); }, off: reset },
      { label: 'Wrong sample rate', hint: '24 kHz played at 16 kHz', on: () => { reset(); st.sr = 1; draw(); }, off: reset },
    ];
    function status() {
      if (!st.norm) return { ok: false, msg: `<b>"Two colon three zero".</b> Without a normaliser the system reads what is printed: "2:30" becomes ${R.words.filter(w => ['two', 'colon', 'three', 'zero'].includes(w)).length} separate words, and "pm" is sounded as a word. Travellers hear "${R.words.slice(4, 10).join(' ')}". Normalise times, numbers and abbreviations into words before anything else.` };
      if (!st.local) return { ok: false, msg: `<b>Nkawkaw, mispronounced.</b> The word is not in the English lexicon, so spelling rules sound it out as /${R.prons[2]}/; people in Ghana say /${LOCAL.nkawkaw}/. Travellers listening for their town may not recognise it. Add local place names, and a grapheme-to-phoneme model trained on local languages.` };
      if (st.sr) return { ok: false, msg: `<b>Slow and low.</b> The voice was made at 24,000 samples a second but played as if it were 16,000, so ${R.nPh} sounds take ${R.secs.toFixed(1)} s instead of ${(R.secs / 1.5).toFixed(1)} s, and every pitch drops by a third, to about ${R.pitch} Hz. Resample to the player's rate, with a filter.` };
      return { ok: true, msg: `<b>"${R.words.join(' ')}".</b> The normaliser writes the time as words, the lexicon gives every word its sounds, including Nkawkaw from the local list, durations set the timing, and the vocoder's ${R.secs.toFixed(1)} s of audio plays at the rate it was made for.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'An announcement', home: true, say: 'A bus station in Accra announces: bus to Nkawkaw leaves at two thirty p m from platform four. A text-to-speech system reads it out.', act: m => m.set({ norm: true, local: true, sr: 0 }) },
    { t: 'Normalise', home: true, say: 'First, write everything as words to be spoken. The time becomes two thirty p m.', act: m => m.set({}) },
    { t: 'No normaliser', home: true, say: 'Skip that step, and travellers hear: two colon three zero p m.', act: m => m.set({ norm: false }) },
    { t: 'Sounds', home: true, say: 'A lexicon turns words into sounds. Nkawkaw is not in an English lexicon, so spelling rules guess, and get it wrong.', act: m => m.set({ norm: true, local: false }) },
    { t: 'Timing and voice', home: true, say: 'With local names added, each sound gets a duration, and a vocoder turns the result into a waveform.', act: m => m.set({ local: true }) },
    { t: 'Wrong rate', home: true, say: 'Play twenty-four kilohertz audio as if it were sixteen, and the announcement drags, a third lower in pitch.', act: m => m.set({ sr: 1 }) },
  ],
  check: [
    { q: 'What does text normalisation do?', options: ['Writes numbers, times and abbreviations as words to be spoken', 'Makes the voice louder', 'Removes punctuation only'], answer: 0, why: '"2:30 pm" becomes "two thirty p m".' },
    { q: 'Why add local place names to the lexicon?', options: ['Spelling rules from one language mispronounce names from another', 'To make audio shorter', 'Lexicons cannot hold English words'], answer: 0, why: 'Nkawkaw is not said the way English spelling suggests.' },
    { q: 'What happens if 24 kHz audio is played at 16 kHz?', options: ['It plays slower and lower in pitch', 'It plays faster', 'Nothing changes'], answer: 0, why: 'Resample to the player\'s rate.' },
  ],
  terms: [
    ['Text normalisation', 'Turning written forms into the words to be spoken.'],
    ['Phoneme', 'One distinct sound of a language.'],
    ['Grapheme to phoneme', 'Predicting sounds from spelling.'],
    ['Duration predictor', 'The part that decides how long each sound lasts.'],
    ['Vocoder', 'Turns a mel spectrogram into a waveform.'],
    ['Mean opinion score', 'Average listener rating of naturalness, 1 to 5.'],
  ],
  deeper: '<p><b>From Tacotron to F5-TTS.</b> Tacotron generated spectrogram frames one by one with attention; FastSpeech predicts durations and generates all frames at once; VITS trains the whole chain end to end; newer models clone a voice from seconds of audio.</p><p><b>Voices for African languages.</b> Many languages here are tonal, and the same letters mean different words at different pitches. Good TTS for Twi, Yoruba or Ewe needs tone in the lexicon and in the model.</p><p><b>About this machine.</b> The lexicon, local entry and spelling rules are tiny and hand-made, and the waveform is a stand-in. Normalisation, lookups, the error count, length and pitch are computed live.</p>',
  code: {
    title: 'Normalise, then look up sounds',
    note: 'Adapted from the course\'s text-to-speech lesson.',
    text: `
import re

NUM = {"2": "two", "4": "four", "30": "thirty"}

def normalise(text):
    text = re.sub(r"(\\d+):(\\d+)\\s*pm", lambda m: f"{NUM[m[1]]} {NUM[m[2]]} p m", text)
    text = re.sub(r"\\d+", lambda m: NUM.get(m[0], m[0]), text)
    return text.lower().replace(".", "")

def phonemes(words, lexicon, local, g2p):
    return [lexicon.get(w) or local.get(w) or g2p(w) for w in words]

words = normalise("Bus to Nkawkaw leaves at 2:30 pm from platform 4.").split()
print(phonemes(words, LEXICON, {"nkawkaw": "ŋ k ɔ k ɔ"}, g2p))
`,
  },
};
