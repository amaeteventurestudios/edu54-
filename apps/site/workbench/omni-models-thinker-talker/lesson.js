// Omni models, Thinker and Talker: a homework helper in Lusaka sees a worksheet through the phone camera, hears "this one" while the student points, and answers aloud.
// The Thinker reads interleaved video, audio and text tokens and writes text; a small Talker turns each text token into speech tokens as it arrives; a decoder makes sound.
// The latency budget follows the course's figures (mic 60, prefill 150 at 7B or 600 at 70B, then about 200 ms of first-token, Talker and decoding steps); the Talker must
// emit at least 50 speech tokens a second; Talker speeds and the answers are illustrative.
// Break it: positions by order instead of time, a 7B Talker, waiting for the whole answer before speaking.
function run(st) {
  const prefill = st.big ? 600 : 150, tail = 40 + 20 + 40 + 30 + 65;
  const wait = st.stream ? 0 : 40 * (st.big ? 60 : 25);
  const ms = 60 + prefill + tail + wait, rate = st.bigTalker ? 35 : 120;
  return { ms, rate, keeps: rate >= 50, q: st.timed ? 3 : 1 };
}

export default {
  slug: 'omni-models-thinker-talker',
  title: 'Omni models: think, then talk',
  description: 'A homework helper in Lusaka watches a worksheet through the phone camera, hears "this one" as the student points, and explains aloud. A big Thinker writes what to say; a small Talker speaks it as it is written. Then order the tokens by type instead of time, make the Talker big, or wait for the whole answer before speaking.',
  overview: 'An omni model takes in video, audio and text together and answers in speech. Qwen2.5-Omni splits the work. The Thinker is a large transformer that reads interleaved tokens from camera frames, microphone audio and text, and writes text tokens saying what to answer. The Talker is a much smaller transformer that turns each text token, as soon as it is written, into discrete speech tokens, and a streaming decoder turns those into sound. The Thinker must be big to reason well; the Talker only converts text to speech locally, and must be fast: at 50 speech tokens per second of audio, a small Talker keeps up easily while a 7-billion-parameter one falls behind and the voice stutters. To line up what was seen with what was heard, TMRoPE gives every token a position from its real timestamp, so the frame where the student points and the audio of "this one" sit together instead of all frames coming before all audio. Streaming keeps the first sound within a few hundred milliseconds at 7B; a 70B Thinker reasons better but its prefill pushes that towards a second. Moshi fuses both roles into one model with an inner monologue and supports talking over each other.',
  keywords: ['omni model', 'thinker talker', 'qwen2.5-omni', 'tmrope', 'streaming speech', 'time to first audio'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { timed: true, big: false, bigTalker: false, stream: true };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* the worksheet, as the camera sees it */
    const sheet = P.box(1.3, 0.04, 1.2, '#FFFFFF', { r: 0.02 }); sheet.position.set(-2.2, 0.12, 0.35); S.add(sheet);
    const rows = ['1.  ½ + ¼', '2.  ⅔ − ⅓', '3.  ¾ − ½', '4.  ⅕ + ⅖'].map((s, i) => { const t = S.text(s, { size: 0.15, weight: 800, color: ink }); t.position.set(-2.25, 0.17, -0.05 + i * 0.27); S.add(t); return t; });
    const hand = P.cyl(0.07, 0.22, '#E07B39', { r2: 0 }); hand.rotation.z = Math.PI / 2; hand.position.set(-1.45, 0.25, 0.49); S.add(hand);
    const camT = S.text('Camera: worksheet', { size: 0.11, weight: 800, color: ink }); camT.position.set(-2.2, 0.13, -0.42); S.add(camT);
    /* the input sequence at the back: frames (orange) and audio (teal) */
    const NS = 22, X0 = -2.75, SW = 0.2, seq = Array.from({ length: NS }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(SW * 0.85, 0.12, 0.28, '#fff', { r: 0.01, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const seqT = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 1.15 }); seqT.position.set(2.35, 0.13, -1.0); S.add(seqT);
    const link = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.02, '#C62828'); link.layers.set(1); link.userData.noFit = true; S.add(link);
    /* Thinker, Talker, decoder */
    const thinker = P.box(1.2, 0.5, 1.1, C.plum, { r: 0.06 }); thinker.position.set(-0.15, 0.12, 0.3); S.add(thinker);
    const thT = S.text('Thinker', { size: 0.16, weight: 800, color: '#FFFFFF' }); thT.position.set(-0.15, 0.63, 0.15); S.add(thT);
    const thS = S.text('', { size: 0.14, weight: 800, color: '#FFFFFF' }); thS.position.set(-0.15, 0.63, 0.45); S.add(thS);
    const tkM = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), talker = P.box(0.6, 0.3, 0.6, '#1F9E89', { r: 0.05, material: tkM }); talker.position.set(1.15, 0.12, 0.3); S.add(talker);
    const tkT = S.text('Talker', { size: 0.12, weight: 800, color: '#FFFFFF' }); tkT.position.set(1.15, 0.43, 0.22); S.add(tkT);
    const tkS = S.text('', { size: 0.11, weight: 800, color: '#FFFFFF' }); tkS.position.set(1.15, 0.43, 0.42); S.add(tkS);
    const spk = P.cyl(0.24, 0.28, '#2B2B38'); spk.position.set(2.45, 0.12, 0.3); S.add(spk);
    const cone = P.cyl(0.16, 0.02, '#1F9E89'); cone.position.set(2.45, 0.4, 0.3); S.add(cone);
    const spT = S.text('Decoder + speaker', { size: 0.1, weight: 800, color: ink }); spT.position.set(2.45, 0.13, 0.72); S.add(spT);
    /* moving tokens: text (plum) Thinker to Talker, speech (teal) Talker to speaker */
    const g = new THREE.BoxGeometry(0.08, 0.08, 0.08), mk = c => { const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c })); m.userData.noFit = true; S.add(m); return m; };
    const txt = Array.from({ length: 4 }, () => mk('#B07AA1')), sp = Array.from({ length: 8 }, () => mk('#1F9E89'));
    /* answer card at the front, question at the back right */
    const card = P.box(4.6, 0.05, 0.46, '#FBF8F1', { r: 0.03 }); card.position.set(0.3, 0.12, 1.2); S.add(card);
    const ans = S.text('', { size: 0.14, weight: 800, color: ink, maxW: 4.5 }); ans.position.set(0.3, 0.18, 1.2); S.add(ans);
    const said = S.text('Student: "Can you help with this one?"', { size: 0.12, weight: 800, color: '#6B5E86' }); said.position.set(1.55, 0.13, -0.55); S.add(said);
    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null, t0 = 0;
    function draw() {
      R = run(st);
      /* time order interleaves frames and audio; type order puts all frames first */
      const items = []; for (let i = 0; i < NS; i++) items.push(i % 4 === 0 ? 'v' : 'a');
      const order = st.timed ? items.map((k, i) => ({ k, i })) : [...items.map((k, i) => ({ k, i })).filter(o => o.k === 'v'), ...items.map((k, i) => ({ k, i })).filter(o => o.k === 'a')];
      let pv = -1, pa = -1;
      order.forEach((o, j) => { const s = seq[j], hot = o.i === 12 || o.i === 13; s.b.position.set(X0 + (j + 0.5) * SW, 0.12, -1.0); s.mm.color.set(o.k === 'v' ? (hot ? '#C2410C' : '#F0A868') : (hot ? '#0F6B5C' : '#7FCFC0')); s.b.scale.y = hot ? 1.8 : 1;
        if (o.i === 12) pv = j; if (o.i === 13) pa = j; });
      const a = V(X0 + (pv + 0.5) * SW, 0.36, -1.0), b = V(X0 + (pa + 0.5) * SW, 0.36, -1.0), mid = a.clone().lerp(b, 0.5).add(V(0, 0.08 + a.distanceTo(b) * 0.25, 0));
      link.geometry.dispose(); link.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.02, 6, false);
      link.material.color.set(st.timed ? '#1F9E89' : '#C62828');
      seqT.userData.set(st.timed ? 'By time:\npoint and "this one"\nside by side' : 'By type: frames,\nthen audio,\nfar apart', st.timed ? ink : '#C62828');
      rows.forEach((r, i) => r.userData.set(r.userData.str || ['1.  ½ + ¼', '2.  ⅔ − ⅓', '3.  ¾ − ½', '4.  ⅕ + ⅖'][i], i + 1 === R.q ? '#C2410C' : ink));
      hand.position.z = -0.05 + 2 * 0.27;
      thS.userData.set(st.big ? '70B' : '7B', '#FFFFFF');
      talker.scale.set(st.bigTalker ? 1.5 : 1, 1, st.bigTalker ? 1.5 : 1); tkS.userData.set(st.bigTalker ? '7B' : '300M', '#FFFFFF');
      tkM.color.set(R.keeps ? '#1F9E89' : '#C62828');
      ans.userData.set(R.q === 3 ? '"Question 3: three quarters take away a half leaves one quarter."' : '"Question 1: a half plus a quarter makes three quarters."', R.q === 3 && R.keeps ? ink : '#8A1F1F');
    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt;
      const startS = st.stream ? 0 : 0.55;
      txt.forEach((m, i) => { const u = (t0 * 0.6 + i / txt.length) % 1; m.position.set(0.45 + u * 0.4, 0.32, 0.3); });
      sp.forEach((m, i) => { const cyc = (t0 * 0.35) % 1, u = (t0 * (R.keeps ? 0.7 : 0.25) + i / sp.length) % 1; m.position.set(1.5 + u * 0.75, 0.25, 0.3);
        m.visible = cyc >= startS && (R.keeps || i % 3 !== 0); }); };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Positions', options: ['By time', 'By type'], get: () => (st.timed ? 0 : 1), act: i => { st.timed = !i; draw(); } },
      { type: 'buttons', label: 'Thinker', options: ['7B', '70B'], get: () => (st.big ? 1 : 0), act: i => { st.big = !!i; draw(); } },
      { type: 'buttons', label: 'Talker', options: ['300M', '7B'], get: () => (st.bigTalker ? 1 : 0), act: i => { st.bigTalker = !!i; draw(); } },
      { type: 'buttons', label: 'Speak', options: ['As it thinks', 'After the full answer'], get: () => (st.stream ? 0 : 1), act: i => { st.stream = !i; draw(); } },
    ];
    const readouts = [
      { label: 'First sound', get: () => ({ v: `${R.ms} ms`, sub: 'aim for under 500', good: R.ms <= 500, bad: R.ms > 900 }) },
      { label: 'Talker speed', get: () => ({ v: `${R.rate}/s`, sub: 'needs 50 speech tokens a second', good: R.keeps, bad: !R.keeps }) },
      { label: 'Question read', get: () => ({ v: String(R.q), sub: 'the student pointed at 3', good: R.q === 3, bad: R.q !== 3 }) },
    ];
    const labels = [
      { name: 'seq', t: 'Input tokens', d: 'Orange: frames · teal: audio', icon: 'link', atV: V(X0 - 0.05, 0.2, -1.0) },
      { name: 'spk', t: 'Speech out', d: 'Streams while the Thinker writes', icon: 'wave', atV: V(2.7, 0.25, 0.3) },
    ];
    const reset = () => { Object.assign(st, { timed: true, big: false, bigTalker: false, stream: true }); draw(); };
    const breaks = [
      { label: 'Positions by type', hint: 'All frames, then all audio', on: () => { reset(); st.timed = false; draw(); }, off: reset },
      { label: 'A 7B Talker', hint: 'Big model for speech', on: () => { reset(); st.bigTalker = true; draw(); }, off: reset },
      { label: 'Wait for the full answer', hint: 'No streaming', on: () => { reset(); st.stream = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.timed) return { ok: false, msg: `<b>It explains question 1.</b> With all frames placed before all audio, the frame where the student points and the sound of "this one" are far apart in position, so the Thinker cannot tie them together and picks the first question. Give every token a position from its real timestamp.` };
      if (!R.keeps) return { ok: false, msg: `<b>The voice stutters.</b> A 7-billion-parameter Talker manages about ${R.rate} speech tokens a second, but speech needs 50, so the audio keeps running dry. The Talker only turns text into speech: a small one around 300 million parameters keeps up easily.` };
      if (!st.stream) return { ok: false, msg: `<b>${(R.ms / 1000).toFixed(1)} seconds of silence.</b> Waiting for the Thinker to finish its whole answer before the Talker starts makes the student sit through it. Let the Talker speak each text token as soon as it is written.` };
      if (st.big) return { ok: true, msg: `<b>Right answer, but ${R.ms} ms to first sound.</b> A 70B Thinker reasons better on hard questions, but its prefill alone is about 600 ms. For simple homework the 7B Thinker answers in about ${60 + 150 + 195} ms.` };
      return { ok: true, msg: `<b>First sound in ${R.ms} ms, on the right question.</b> Time-based positions tie the pointing frame to "this one", the 7B Thinker writes the answer, and the small Talker speaks it token by token at ${R.rate} tokens a second.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'This one', home: true, say: 'A student in Lusaka points the phone at a worksheet, touches question three, and asks: can you help with this one?', act: m => m.set({ timed: true, big: false, bigTalker: false, stream: true }) },
    { t: 'In time', home: true, say: 'Camera frames and audio become tokens placed by their real time, so the pointing frame and "this one" sit together.', act: m => m.set({}) },
    { t: 'Think and talk', home: true, say: 'A big Thinker writes the answer as text. A small Talker speaks each word as soon as it is written.', act: m => m.set({}) },
    { t: 'By type', home: true, say: 'Put all frames first and all audio after, and the model loses which question was meant.', act: m => m.set({ timed: false }) },
    { t: 'Big Talker', home: true, say: 'Make the Talker big, and it cannot make speech tokens fast enough. The voice stutters.', act: m => m.set({ timed: true, bigTalker: true }) },
    { t: 'Wait to speak', home: true, say: 'Wait for the whole answer before speaking, and the student sits through seconds of silence.', act: m => m.set({ bigTalker: false, stream: false }) },
  ],
  check: [
    { q: 'Why is the Talker much smaller than the Thinker?', options: ['It only turns text into speech and must keep up', 'It reasons harder', 'It reads the camera'], answer: 0, why: 'Speech needs about 50 tokens a second.' },
    { q: 'What do time-aligned positions fix?', options: ['Matching what was seen with what was heard at the same moment', 'Speech speed', 'Model size'], answer: 0, why: 'The point and "this one" line up.' },
    { q: 'Why does streaming matter?', options: ['The first sound comes long before the answer is finished', 'It improves reasoning', 'It shrinks the model'], answer: 0, why: 'The Talker starts on the first text token.' },
  ],
  terms: [
    ['Omni model', 'One model taking video, audio and text, answering in speech.'],
    ['Thinker', 'The large part that reasons and writes text.'],
    ['Talker', 'The small part that turns text into speech tokens.'],
    ['TMRoPE', 'Positions taken from real timestamps across modalities.'],
    ['Streaming', 'Speaking while the answer is still being written.'],
    ['Full duplex', 'Both sides able to talk at once.'],
  ],
  deeper: '<p><b>Learning at home.</b> In Zambia, Nigeria and Ethiopia many students study on shared phones with patchy data. A tutor that sees the page and talks could help, but it must explain in local languages, work on small devices or cheap connections, and leave the thinking to the student.</p><p><b>One model or two.</b> Moshi fuses thinking and talking into one model with an inner monologue and can handle interruptions; Thinker-Talker designs keep the parts separate so each can be sized for its job.</p><p><b>About this machine.</b> The latency budget follows the course\'s figures; Talker speeds and answers are illustrative.</p>',
  code: {
    title: 'Talk while thinking',
    note: 'Adapted from the course\'s omni-models lesson.',
    text: `
def respond(inputs, thinker, talker, decoder):
    for text_tok in thinker.stream(inputs):        # big model writes text
        for speech_tok in talker.step(text_tok):   # small model speaks it
            yield decoder.push(speech_tok)         # sound out at once

def keeps_up(talker_tok_per_s, needed=50):
    return talker_tok_per_s >= needed              # else the voice stutters
`,
  },
};
