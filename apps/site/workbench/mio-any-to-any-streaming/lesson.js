// MIO: a farm helpline in Tamale. A farmer speaks and sends a photo of a maize leaf; one model hears, sees and speaks back. Four tokenizers give text, image, speech and music
// disjoint ID ranges in one vocabulary; one causal transformer streams speech tokens out; a residual decoder turns them into sound. The latency budget follows the course's
// estimate (mic 50 ms, prefill 100, first token 50, decoder about 120); speech quality and the replies are illustrative.
// Break it: overlapping ID ranges, residual levels decoded one after another, skipping the interleaved stage, skipping the speech stage.
const RANGES = [['Text', 32000, '#3A6FB0'], ['Image', 8192, '#E07B39'], ['Speech', 4096, '#1F9E89'], ['Music', 8192, '#8E5BB5']];
const TOTAL = 52480;
function run(st) {
  const dec = st.par ? 120 : 120 + 60 * (st.levels - 1);
  const parts = [['Mic', 50], ['Prefill', 100], ['First token', 50], ['Decoder', dec]];
  const ms = parts.reduce((a, p) => a + p[1], 0);
  let q = st.levels === 4 ? 4.1 : 2.7;
  if (st.stages === 'nospeech') q -= 1.5;
  if (st.clash) q = 1.2;
  const photo = !st.clash && st.stages !== 'nointer';
  return { parts, ms, q, photo };
}

export default {
  slug: 'mio-any-to-any-streaming',
  title: 'MIO: hear, see, speak back',
  description: 'A farm helpline in Tamale: a farmer describes a sick maize plant aloud and sends a photo of the leaf, and one model listens, looks and answers out loud. MIO gives every modality its own range in one vocabulary and streams speech tokens out. Then let the ranges overlap, decode the speech levels one by one, or skip a training stage.',
  overview: 'Most early "any-to-any" systems were pipelines: a vision model writes text, a language model answers, a speech model reads it out, and every hop loses information and adds delay. MIO uses one causal transformer instead. Each modality has a tokenizer that turns it into integers: BPE for text, a discrete image tokenizer that gives 32 codes per picture, and a residual-VQ speech tokenizer whose first level carries the words and later levels add tone and the speaker\'s voice. Each tokenizer gets its own disjoint range of IDs in one shared vocabulary of about 52 thousand entries, so a code always means one thing. Training follows a curriculum: pairs of modalities to align the vocabulary, interleaved documents to learn context across modalities, extra speech data, then instruction tuning. To reply aloud, the model streams base speech tokens and a decoder fills in the residual levels in parallel, about 50 ms of audio per token; the whole path from microphone to first sound is roughly 300 ms at best.',
  keywords: ['mio', 'any-to-any', 'streaming speech', 'residual vq', 'shared vocabulary', 'time to first audio'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { clash: false, par: true, levels: 4, stages: 'all' };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* four tokenizers on the left */
    RANGES.forEach(([n, , col], i) => { const z = -1.0 + i * 0.5, b = P.box(0.85, 0.22, 0.42, col, { r: 0.04 }); b.position.set(-2.45, 0.12, z); S.add(b);
      const t = S.text(n, { size: 0.14, weight: 800, color: '#FFFFFF', maxW: 0.78 }); t.position.set(-2.45, 0.35, z); S.add(t);
      const s = S.text(n, { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF', maxW: 0.78 }); s.position.set(-2.45, 0.23, z + 0.215); S.add(s); });
    /* the vocabulary strip: one segment per ID range */
    const LEN = 1.8, z0 = -1.0;
    const vocT = S.text('One vocabulary', { size: 0.1, weight: 800, color: ink }); vocT.position.set(-1.45, 0.13, -1.18); S.add(vocT);
    const segs = RANGES.map(([n, k, col]) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(0.42, 0.14, 1, col, { r: 0.01, material: mm }); b.position.set(-1.45, 0.12, 0); S.add(b);
      const t = S.text(n, { size: 0.1, weight: 800, color: '#FFFFFF', maxW: 0.4 }); S.add(t); return { b, t, k, mm }; });
    const clashM = new THREE.MeshBasicMaterial({ color: '#C62828', transparent: true, opacity: 0.85 }), clashB = P.box(0.46, 0.18, 0.2, '#C62828', { material: clashM }); clashB.position.set(-1.45, 0.12, 0); clashB.userData.noFit = true; S.add(clashB);
    function layoutVocab() { let z = z0; segs.forEach((s, i) => { let len = LEN * s.k / TOTAL; let zz = z;
        if (st.clash && i === 2) zz = z - LEN * 2048 / TOTAL; /* speech slides into the image range */
        s.b.scale.z = len; s.b.position.z = zz + len / 2; s.b.position.y = 0.12 + (st.clash && i === 2 ? 0.03 : 0);
        s.t.position.set(-1.45, 0.29 + (st.clash && i === 2 ? 0.03 : 0), zz + len / 2); s.t.visible = len > 0.12; z += len; });
      const sp = segs[2]; clashB.visible = !!st.clash; clashB.scale.z = LEN * 2048 / TOTAL / 0.2; clashB.position.z = sp.b.position.z - LEN * 4096 / TOTAL / 2 + LEN * 1024 / TOTAL; }
    /* the shared transformer */
    const body = P.box(1.1, 0.45, 1.5, C.plum, { r: 0.06 }); body.position.set(-0.2, 0.12, -0.25); S.add(body);
    const bF = S.text('One transformer', { size: 0.14, weight: 800, color: '#FFFFFF', maxW: 1.0 }); bF.position.set(-0.2, 0.58, -0.25); S.add(bF);
    const stageT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); stageT.position.set(-0.2, 0.75, -1.1); stageT.userData.noFit = true; S.add(stageT);
    /* streamed speech tokens: a stack per token, one cube per residual level */
    const lane = P.box(1.7, 0.03, 0.34, '#2B2B38', { r: 0.02 }); lane.position.set(1.25, 0.12, -0.1); S.add(lane);
    const geo = new THREE.BoxGeometry(0.11, 0.05, 0.22); geo.translate(0, 0.025, 0);
    const N = 7, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N * 4); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const spk = P.cyl(0.26, 0.3, '#2B2B38'); spk.position.set(2.45, 0.12, -0.1); S.add(spk);
    const cone = P.cyl(0.18, 0.02, '#1F9E89'); cone.position.set(2.45, 0.42, -0.1); S.add(cone);
    const spT = S.text('Speaker', { size: 0.1, weight: 800, color: ink }); spT.position.set(2.45, 0.13, 0.32); S.add(spT);
    /* the reply card */
    const card = P.box(2.3, 0.05, 0.5, '#FBF8F1', { r: 0.03 }); card.position.set(1.6, 0.12, -0.95); S.add(card);
    const reply = S.text('', { size: 0.14, weight: 800, color: ink, maxW: 2.2, maxH: 0.44 }); reply.position.set(1.6, 0.18, -0.95); S.add(reply);
    /* the latency timeline along the front */
    const W = 4.4, X0 = -2.0, ZL = 1.17, PX = W / 600;
    const bars = [0, 1, 2, 3].map(i => { const mm = new THREE.MeshLambertMaterial({ color: ['#9AA3B5', '#6B5E86', '#B07AA1', '#1F9E89'][i] }), b = P.box(1, 0.1, 0.36, '#fff', { r: 0.01, material: mm }); b.position.set(0, 0.12, ZL); S.add(b);
      const t = S.text('', { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 1 }); t.position.set(0, 0.23, ZL); S.add(t); return { b, t, mm }; });
    const goal = P.box(0.03, 0.2, 0.46, '#C62828'); goal.position.set(X0 + 400 * PX, 0.12, ZL); S.add(goal);
    const goalT = S.text('400 ms', { size: 0.1, weight: 800, color: '#C62828' }); goalT.position.set(X0 + 400 * PX, 0.13, ZL + 0.32); S.add(goalT);
    const msT = S.text('', { size: 0.15, weight: 800, color: ink }); msT.position.set(2.45, 0.13, ZL); S.add(msT);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null, t0 = 0;
    function draw() {
      R = run(st); layoutVocab();
      let x = X0; R.parts.forEach(([n, v], i) => { const w = v * PX; bars[i].b.scale.x = w; bars[i].b.position.x = x + w / 2; bars[i].t.position.x = x + w / 2; bars[i].t.userData.set(w > 0.75 ? `${n} ${v}` : String(v), '#FFFFFF'); bars[i].t.userData.style({ maxW: w - 0.04 }); x += w; });
      msT.userData.set(`${R.ms} ms`, R.ms > 400 ? '#C62828' : ink);
      stageT.userData.set(st.stages === 'all' ? 'Trained: pairs, interleaved, speech, tuning' : st.stages === 'nointer' ? 'Trained without interleaved documents' : 'Trained without the speech stage');
      const txt = st.clash ? 'Garbled: voice codes read as picture codes' : !R.photo ? '"Maize needs rain and fertiliser."' : R.q < 3 ? '"Fall armyworm. Scout at dawn." (robotic)' : '"Holes and frass: fall armyworm. Scout at dawn."';
      reply.userData.set(txt, st.clash || !R.photo || R.q < 3 ? '#8A1F1F' : ink);
      cone.material.color.set(R.q >= 3.5 ? '#1F9E89' : '#C62828');
    }
    draw();
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const update = dt => { t0 += S.reduced ? 0 : dt; const speed = st.par ? 0.45 : 0.28;
      for (let i = 0; i < N; i++) { const u = ((t0 * speed + i / N) % 1), x = 0.5 + u * 1.5;
        for (let l = 0; l < 4; l++) { const on = l < st.levels && (st.par || u > l * 0.15);
          m4.makeScale(1, on ? 1 : 0.0001, 1).setPosition(x, 0.15 + l * 0.055, -0.1); im.setMatrixAt(i * 4 + l, m4);
          im.setColorAt(i * 4 + l, col.set(st.clash ? (l % 2 ? '#E07B39' : '#C62828') : l === 0 ? '#1F9E89' : '#7FCFC0')); } }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; };
    update(0);
    const controls = [
      { type: 'buttons', label: 'ID ranges', options: ['Separate', 'Overlapping'], get: () => (st.clash ? 1 : 0), act: i => { st.clash = !!i; draw(); } },
      { type: 'buttons', label: 'Residual levels decoded', options: ['In parallel', 'One by one'], get: () => (st.par ? 0 : 1), act: i => { st.par = !i; draw(); } },
      { type: 'buttons', label: 'Speech levels kept', options: ['1', '4'], get: () => (st.levels === 4 ? 1 : 0), act: i => { st.levels = i ? 4 : 1; draw(); } },
      { type: 'buttons', label: 'Training', options: ['All four stages', 'No interleaved', 'No speech stage'], get: () => ['all', 'nointer', 'nospeech'].indexOf(st.stages), act: i => { st.stages = ['all', 'nointer', 'nospeech'][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Time to first sound', get: () => ({ v: `${R.ms} ms`, sub: 'aim for under 400', good: R.ms <= 400, bad: R.ms > 400 }) },
      { label: 'Speech quality', get: () => ({ v: `${R.q.toFixed(1)}/5`, sub: 'illustrative', good: R.q >= 3.5, bad: R.q < 3 }) },
      { label: 'Uses the photo', get: () => ({ v: R.photo ? 'Yes' : 'No', sub: 'in the spoken answer', good: R.photo, bad: !R.photo }) },
    ];
    const labels = [
      { name: 'tok', t: 'Four tokenizers', d: 'Each gets its own ID range', icon: 'box', atV: V(-2.88, 0.25, 0.1) },
      { name: 'out', t: 'Speech out', d: 'One stack per token, one cube per level', icon: 'wave', atV: V(2.72, 0.25, 0.1) },
    ];
    const reset = () => { Object.assign(st, { clash: false, par: true, levels: 4, stages: 'all' }); draw(); };
    const breaks = [
      { label: 'Overlapping ID ranges', hint: 'Speech codes reuse image IDs', on: () => { reset(); st.clash = true; draw(); }, off: reset },
      { label: 'Decode levels one by one', hint: 'Sequential residual levels', on: () => { reset(); st.par = false; draw(); }, off: reset },
      { label: 'Skip interleaved data', hint: 'No mixed documents', on: () => { reset(); st.stages = 'nointer'; draw(); }, off: reset },
      { label: 'Skip the speech stage', hint: 'Little audio data', on: () => { reset(); st.stages = 'nospeech'; draw(); }, off: reset },
    ];
    function status() {
      if (st.clash) return { ok: false, msg: `<b>The voice comes out as noise.</b> The speech range now overlaps the image range, so the same ID means a sound to one tokenizer and a picture piece to another. The model cannot tell which was meant and the reply is garbled. Every modality needs its own disjoint ID range.` };
      if (!st.par && st.levels > 1) return { ok: false, msg: `<b>${R.ms} ms of silence before the first sound.</b> Decoding the ${st.levels} residual levels one after another adds about 60 ms each, so the farmer waits past the 400 ms mark and the call feels awkward. Predict the base level, then fill the others in parallel.` };
      if (st.stages === 'nointer') return { ok: false, msg: `<b>It answers without looking.</b> Trained only on pairs, never on documents mixing pictures, speech and text, the model has not learned to use the photo while answering a spoken question: it gives generic advice. The interleaved stage teaches context across modalities.` };
      if (st.stages === 'nospeech') return { ok: false, msg: `<b>Right answer, robotic voice.</b> Without the extra speech stage, speech quality drops to ${R.q.toFixed(1)} out of 5: the words are right but the voice is flat and hard to follow on a phone line. The speech-enhanced stage lifts audio without losing text skill.` };
      if (st.levels === 1) return { ok: true, msg: `<b>Fast but flat.</b> Keeping only the base level carries the words but not tone or voice, so quality is ${R.q.toFixed(1)} out of 5. Three more levels add natural speech; decoded in parallel they cost no extra delay.` };
      return { ok: true, msg: `<b>First sound in ${R.ms} ms.</b> Voice, photo and text share one vocabulary without clashes, one transformer reads them all, and speech streams back with its residual levels decoded in parallel. The answer names the pest in the photo.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A call', home: true, say: 'A farmer in Tamale describes a sick maize plant aloud and sends a photo of the leaf. One model will listen, look and answer out loud.', act: m => m.set({ clash: false, par: true, levels: 4, stages: 'all' }) },
    { t: 'Four tokenizers', home: true, say: 'Text, pictures, speech and music each become integers, and each gets its own range in one shared vocabulary.', act: m => m.set({}) },
    { t: 'Stream it back', home: true, say: 'One transformer reads them all and streams speech tokens out. The extra speech levels are filled in parallel, so the first sound comes in about a third of a second.', act: m => m.set({}) },
    { t: 'Ranges clash', home: true, say: 'Let the speech range overlap the image range, and one number means two things. The reply is noise.', act: m => m.set({ clash: true }) },
    { t: 'One by one', home: true, say: 'Decode the speech levels one after another, and the farmer waits through half a second of silence.', act: m => m.set({ clash: false, par: false }) },
    { t: 'Never mixed', home: true, say: 'Skip the training on mixed documents, and the model answers without using the photo.', act: m => m.set({ par: true, stages: 'nointer' }) },
  ],
  check: [
    { q: 'Why does each modality get a disjoint range of IDs?', options: ['So every code means exactly one thing', 'To make the vocabulary smaller', 'Because text is longest'], answer: 0, why: 'Overlaps make codes ambiguous.' },
    { q: 'What do the later residual-VQ levels add to speech?', options: ['Tone and the speaker\'s voice', 'The words', 'Image detail'], answer: 0, why: 'The base level carries the content.' },
    { q: 'Why decode the residual levels in parallel?', options: ['To keep the time to first sound low', 'To improve the words', 'To save vocabulary'], answer: 0, why: 'One by one adds delay per level.' },
  ],
  terms: [
    ['Any-to-any', 'One model that takes in and gives out text, pictures and sound.'],
    ['Shared vocabulary', 'One table of IDs split into a range per modality.'],
    ['Residual VQ', 'Stacked codebooks, each adding detail to the last.'],
    ['Time to first sound', 'Delay from the end of speech to the reply starting.'],
    ['Curriculum', 'Training stages in a set order.'],
    ['Chain of visual thought', 'Drawing an image as a reasoning step.'],
  ],
  deeper: '<p><b>Voice-first services.</b> Farm helplines, health hotlines and market-price lines across Ghana, Uganda and Senegal reach people by phone in their own languages, and many callers can send a photo. One model that hears, sees and speaks could serve them, but speech quality in low-resource languages lags far behind.</p><p><b>Related designs.</b> AnyGPT came first with a similar recipe; Moshi streams speech with very low delay; the omni models later in this track split thinking and talking.</p><p><b>About this machine.</b> The latency budget follows the course\'s estimate; speech quality and replies are illustrative.</p>',
  code: {
    title: 'One vocabulary, many ranges',
    note: 'Adapted from the course\'s MIO lesson.',
    text: `
RANGES = {"text": (0, 32000), "image": (32000, 40192),
          "speech": (40192, 44288), "music": (44288, 52480)}

def to_shared(modality, local_id):
    lo, hi = RANGES[modality]
    assert 0 <= local_id < hi - lo
    return lo + local_id                     # never collides with another range

def first_sound_ms(mic=50, prefill=100, first=50, decoder=120):
    return mic + prefill + first + decoder   # about 320 ms
`,
  },
};
