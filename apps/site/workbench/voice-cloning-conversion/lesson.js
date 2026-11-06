// Voice cloning: an audiobook studio in Lagos voices a children's story in the voice of a narrator who signed a consent record. Three lanes feed the decoder:
// what is said (content, from the script), who says it (a speaker embedding from a reference recording) and how (prosody). A consent gate guards the decoder;
// a watermark is stamped into the output. Similarity scores are set to typical published values for each reference length; the gate, watermark check and verdicts are computed live.
// Break it: skip the consent check (a voice is cloned without permission), no watermark (nobody can later prove the audio is synthetic), a 3-second reference (it sounds like someone else).
const REFS = [{ n: '3 seconds', secs: 0.55 }, { n: '10 seconds', secs: 0.72 }, { n: '30 minutes, fine-tuned', secs: 0.86 }];
const VOICES = [{ n: 'Adaeze (consented)', consent: true }, { n: 'A radio host (no consent)', consent: false }];

export default {
  slug: 'voice-cloning-conversion',
  title: 'Voice cloning: with consent only',
  description: 'An audiobook studio in Lagos voices a story in a narrator\'s voice. Three inputs reach a decoder, but only past a consent gate, and every output carries a mark.',
  overview: 'Voice cloning makes new speech in a particular person\'s voice. Zero-shot systems such as F5-TTS and XTTS turn a few seconds of reference audio into a speaker embedding and condition a text-to-speech decoder on it; fine-tuning on half an hour of the voice makes it far more faithful. Voice conversion keeps what was said in one recording and swaps who said it, by separating content, speaker and prosody. Similarity to the target is measured by the cosine between speaker embeddings, with about 0.7 sounding like the same person to most listeners. Because a convincing clone can defraud or defame, responsible pipelines check a verifiable consent record before cloning, embed an inaudible watermark that survives re-encoding, and support detectors; laws in several places now require this.',
  keywords: ['voice cloning', 'voice conversion', 'speaker embedding', 'consent', 'audio watermarking', 'zero-shot tts'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { voice: 0, ref: 1, gate: true, mark: true };
    const ink = '#151827';
    /* three sources on the left */
    const src = [['What is said', 'the story script', C.teal, -0.8], ['Who says it', 'reference recording', C.orange, 0], ['How it is said', 'pace and pitch', '#7A3B69', 0.8]].map(([n, d, col, z]) => {
      const b = P.box(1.3, 0.34, 0.5, col, { r: 0.05 }); b.position.set(-2.3, 0.12, z); floor.add(b);
      const lane = P.box(1.3, 0.05, 0.12, col, { r: 0.02 }); lane.position.set(-1.0, 0.25, z * 0.55); lane.rotation.y = Math.atan2(z * 0.45, 1.3); floor.add(lane);
      return { b };
    });
    const refBar = P.box(1, 0.06, 0.08, '#FFFFFF', { r: 0.02 }); refBar.position.set(-2.3, 0.47, 0.18); refBar.userData.noFit = true; floor.add(refBar);
    /* the gate and decoder */
    const gateG = new THREE.Group(); gateG.position.set(-0.25, 0.12, 0); floor.add(gateG);
    [-0.7, 0.7].forEach(z => { const p = P.box(0.1, 0.7, 0.1, '#3B3F8F', { r: 0.02 }); p.position.set(0, 0, z); gateG.add(p); });
    const bar = new THREE.Group(); bar.position.set(0, 0.62, -0.7); gateG.add(bar);
    const barBox = P.box(0.08, 0.08, 1.4, '#D64545', { r: 0.02 }); barBox.position.set(0, -0.04, 0.7); bar.add(barBox);

    const dec = P.box(1.0, 0.7, 1.0, '#2B2B38', { r: 0.06 }); dec.position.set(0.75, 0.12, 0); floor.add(dec);


    const glow = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), led = P.box(0.6, 0.06, 0.04, '#3B3F8F', { r: 0.02, material: glow }); led.position.set(0.75, 0.3, 0.505); floor.add(led);
    /* output: speaker, watermark stamp, and the consent ledger */
    const spk = P.cyl(0.35, 0.5, '#3B3F8F'); spk.position.set(2.1, 0.12, -0.1); floor.add(spk);
    const cone = P.cyl(0.24, 0.04, '#1B1F4B'); cone.position.set(2.1, 0.62, -0.1); floor.add(cone);
    const stampM = new THREE.MeshLambertMaterial({ color: '#C9A227' }), stamp = P.cyl(0.16, 0.05, '#C9A227'); stamp.material = stampM; stamp.position.set(2.65, 0.12, 0.45); floor.add(stamp);

    const ledger = P.box(0.9, 0.12, 0.6, '#FBF8F1', { r: 0.03 }); ledger.position.set(-0.25, 0.12, 1.05); floor.add(ledger);




    let R = null, barA = 0;
    function run() {
      const V0 = VOICES[st.voice], allowed = V0.consent || !st.gate, made = allowed;
      const secs = REFS[st.ref].secs;
      return { V0, allowed, made, secs, same: secs >= 0.7, marked: made && st.mark };
    }
    function draw() {
      R = run();
      refBar.scale.x = [0.25, 0.6, 1.1][st.ref]; refBar.position.x = -2.3 - 0.55 + refBar.scale.x / 2;
      glow.color.set(R.made ? C.teal : '#5A5A66');
      stampM.color.set(R.marked ? '#C9A227' : '#9A9AA6');  stamp.visible = R.made;

    }
    draw();
    const update = dt => { const goal = R.allowed ? -Math.PI / 2.2 : 0; barA += (goal - barA) * Math.min(1, dt * 3); bar.rotation.y = barA; };
    const controls = [
      { type: 'buttons', label: 'Voice', options: VOICES.map(v => v.n), get: () => st.voice, act: i => { st.voice = i; draw(); } },
      { type: 'buttons', label: 'Reference audio', options: REFS.map(r => r.n), get: () => st.ref, act: i => { st.ref = i; draw(); } },
      { type: 'toggle', label: 'Check the consent ledger', short: 'consent check', get: () => st.gate, set: v => { st.gate = v; draw(); } },
      { type: 'toggle', label: 'Embed a watermark', short: 'watermark', get: () => st.mark, set: v => { st.mark = v; draw(); } },
    ];
    const readouts = [
      { label: 'Speaker similarity', get: () => ({ v: R.made ? R.secs.toFixed(2) : '–', sub: '0.70 sounds like the same person', good: R.made && R.same, bad: R.made && !R.same }) },
      { label: 'Consent', get: () => ({ v: R.V0.consent ? 'on record' : 'none', good: R.V0.consent, bad: !R.V0.consent && R.made }) },
      { label: 'Traceable', get: () => ({ v: !R.made ? '–' : R.marked ? 'watermarked' : 'no mark', good: R.marked, bad: R.made && !R.marked }) },
    ];
    const labels = [
      { name: 'src', t: 'Content, speaker, prosody', d: 'Three inputs to the decoder', icon: 'link', atV: V(-2.96, 0.3, 0) },
      { name: 'gate', t: 'Consent gate', d: 'Checks the ledger first', icon: 'hand', atV: V(-0.25, 0.5, -0.7) },
    ];
    const reset = () => { Object.assign(st, { voice: 0, ref: 1, gate: true, mark: true }); draw(); };
    const breaks = [
      { label: 'Skip the consent check', hint: 'Clone a radio host', on: () => { reset(); st.voice = 1; st.gate = false; draw(); }, off: reset },
      { label: 'No watermark', hint: 'Untraceable audio', on: () => { reset(); st.mark = false; draw(); }, off: reset },
      { label: 'Three-second reference', hint: 'Too little audio', on: () => { reset(); st.ref = 0; draw(); }, off: reset },
    ];
    function status() {
      if (!R.V0.consent && R.made) return { ok: false, msg: `<b>A voice cloned without permission.</b> The radio host never agreed, but with the ledger check skipped the decoder makes speech in their voice anyway, similarity ${R.secs.toFixed(2)}. Audio like this has been used to fake endorsements and to trick families and banks. Check a verifiable consent record before every clone; refuse when there is none.` };
      if (!R.V0.consent) return { ok: true, msg: `<b>Blocked, correctly.</b> There is no consent record for the radio host's voice, so the gate stays down and nothing is made, however much reference audio there is.` };
      if (!st.mark) return { ok: false, msg: `<b>Convincing, and untraceable.</b> The narrator consented, but the audio carries no watermark. Once it is clipped and reposted, nobody can show it was synthetic or which consent it came from. Embed an inaudible watermark carrying the consent ID; it survives re-encoding and lets detectors confirm it.` };
      if (!R.same) return { ok: false, msg: `<b>It sounds like someone else.</b> Three seconds of reference give a rough speaker embedding: similarity ${R.secs.toFixed(2)}, below the 0.70 where most listeners hear the same person. Use ten seconds or more of clean audio, or fine-tune on half an hour for an audiobook.` };
      return { ok: true, msg: `<b>Adaeze's voice, with her consent.</b> The ledger holds her signed agreement for this book, the ${REFS[st.ref].n} of reference give similarity ${R.secs.toFixed(2)}, and the watermark carries the consent ID, so the audio can always be traced back.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'An audiobook', home: true, say: 'A studio in Lagos voices a children\'s story in the voice of Adaeze, a narrator who signed a consent record.', act: m => m.set({ voice: 0, ref: 1, gate: true, mark: true }) },
    { t: 'Three ingredients', home: true, say: 'What is said comes from the script, who says it from a reference recording, how it is said from pace and pitch. The decoder combines them.', act: m => m.set({}) },
    { t: 'More reference', home: true, say: 'Three seconds of reference sound like someone else. Half an hour, fine-tuned, is close to the real voice.', act: m => m.set({ ref: 0 }) },
    { t: 'The consent gate', home: true, say: 'Try to clone a radio host who never agreed. The gate checks the ledger, finds nothing, and stays down.', act: m => m.set({ ref: 2, voice: 1 }) },
    { t: 'Skip the check', home: true, say: 'Skip the check, and the voice is cloned anyway. That is how fake endorsements and phone scams are made.', act: m => m.set({ gate: false }) },
    { t: 'Watermark', home: true, say: 'Every clone carries an inaudible watermark with its consent ID, so it can always be traced.', act: m => m.set({ voice: 0, gate: true, ref: 1 }) },
  ],
  check: [
    { q: 'What does a zero-shot voice clone use to capture who is speaking?', options: ['A speaker embedding from a short reference recording', 'The full text of a book', 'A list of phonemes'], answer: 0, why: 'More clean reference audio gives a better embedding.' },
    { q: 'What should a responsible cloning pipeline check before cloning?', options: ['A verifiable consent record from the voice\'s owner', 'Only the audio quality', 'Nothing'], answer: 0, why: 'Refuse when there is no consent.' },
    { q: 'Why embed a watermark in cloned audio?', options: ['So synthetic audio can be detected and traced later', 'To make it louder', 'To improve similarity'], answer: 0, why: 'It survives re-encoding and reposting.' },
  ],
  terms: [
    ['Voice cloning', 'Making new speech in a particular person\'s voice.'],
    ['Voice conversion', 'Keeping what was said, changing who said it.'],
    ['Speaker embedding', 'A vector capturing who is speaking.'],
    ['Speaker similarity', 'Cosine between speaker embeddings of clone and target.'],
    ['Consent record', 'A verifiable agreement from the voice\'s owner.'],
    ['Watermark', 'An inaudible mark embedded in audio to trace it.'],
  ],
  deeper: '<p><b>Conversion.</b> Recognition-synthesis systems extract what was said with a speech model and re-voice it; disentangling autoencoders separate content, speaker and prosody inside the network. Either way, the speaker part can leak, so test similarity on the output.</p><p><b>Local voices.</b> Audiobooks, radio drama and dubbing in Yoruba, Igbo and Hausa are a real use. So is fraud: a cloned relative\'s voice asking for money. Consent and watermarking protect both the narrators and the listeners.</p><p><b>About this machine.</b> Similarity values are set to typical published figures for each reference length. The consent gate, watermark and verdicts are computed live.</p>',
  code: {
    title: 'A consent gate and a watermark',
    note: 'Adapted from the course\'s voice cloning lesson.',
    text: `
def clone(text, voice_id, reference_wav, ledger, tts, watermark):
    record = ledger.get(voice_id)
    if record is None or not record.covers("audiobook"):
        raise PermissionError("no consent on record for this voice")
    speaker = tts.embed_speaker(reference_wav)       # 10 s or more of clean audio
    wav = tts.synthesize(text, speaker=speaker)
    return watermark.embed(wav, message=f"consent:{record.id}")
`,
  },
};
