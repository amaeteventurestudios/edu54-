// Streaming speech-to-speech: a cloth trader in Dakar speaks French; a buyer in Accra hears English, live. A streaming translator (built like Hibiki) runs in 80 ms steps
// on three lanes: the French audio it hears, its inner text, and the English audio it speaks. Word timings are set by hand; when each English chunk can be spoken
// (after the French words it depends on, plus the lag), the delay, the overlap and the word-order error are computed live.
// Break it: lag too short (it says "the cloth" before hearing "bleu"), a cascade that waits for the whole sentence (slow), no inner text stream (words dropped).
const FR = [['Je', 0.2], ['vous', 0.42], ['vends', 0.62], ['le', 0.92], ['tissu', 1.08], ['bleu', 1.42], ['à', 1.72], ['bon', 1.88], ['prix', 2.18]];
const EN = [{ w: "I'll sell you", need: 2, early: 2 }, { w: 'the blue cloth', need: 5, early: 4, short: 'the cloth' }, { w: 'at a good price', need: 8, early: 8 }];
const END = 2.5, CH = 0.42;
const LAGS = [0.16, 0.64];

export default {
  slug: 'streaming-speech-to-speech-moshi-hibiki',
  title: 'Live translation: speak while listening',
  description: 'A cloth trader in Dakar speaks French and a buyer in Accra hears English, live. The model listens and speaks at once, with text inside.',
  overview: 'Pipelines that recognise, think and then speak wait for each turn to end. Full-duplex models such as Moshi instead process two audio streams at once, what they hear and what they say, as codec tokens every 80 milliseconds, so they can listen while talking, accept interruptions and add small "mm-hm"s. Alongside their own audio they write an inner monologue of text tokens, which keeps what they say coherent and gives a transcript for free; a small depth transformer fills in the codebooks of each frame. Hibiki uses the same design for simultaneous translation: it starts speaking the target language a short lag behind the speaker. The lag is a trade. Languages order words differently, French puts the colour after the noun, so translating too soon means guessing or fixing; waiting for the whole sentence is accurate but slow. These models need a GPU per conversation and data for every language pair.',
  keywords: ['full-duplex', 'moshi', 'hibiki', 'simultaneous translation', 'streaming', 'inner monologue'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0.0], dir: [0.05, 0.85, 1.15], half: 0.9, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 1, lag: 1, text: true };
    const BAD = '#E07A5F', SAF = '#F2AE0C', DIM = '#C9C4B8';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // three belts run from Dakar (left) to Accra (right), time along them: French heard, the inner text, English spoken
    const X = t => -2.2 + t / 5 * 4.4, LZ = [-0.5, 0, 0.5];
    LZ.forEach(z => S.add(P.belt(V(-2.3, 0, z), V(2.3, 0, z), { w: 0.34 })));
    const trader = P.robot(C.teal, { scale: 0.9 }); trader.position.set(-2.75, 0, -0.5); S.add(trader);
    const buyer = P.robot('#7A3B69', { scale: 0.9 }); buyer.position.set(2.75, 0, 0.5); S.add(buyer);
    const blk = () => { const m = own('#fff'), b = P.box(1, 0.14, 0.26, '#fff', { r: 0.03, material: m }); b.userData.m = m; b.userData.noFit = true; S.add(b); return b; };
    const frT = FR.map(blk), txT = Array.from({ length: 4 }, blk), enT = Array.from({ length: 4 }, blk);
    // when the buyer hears the first English word
    const post = P.box(0.05, 0.5, 0.05, '#D64545', { r: 0.01 }); post.userData.noFit = true; S.add(post);
    // now: a gold bar sweeping across all three belts
    const nowM = own(SAF), now = P.box(0.05, 0.05, 1.45, '#fff', { r: 0.02, material: nowM }); now.userData.noFit = true; S.add(now);
    S.add(P.keep(-3.0, 3.0, 0.9, -0.75, 0.85));
    let R = null, t = 0;
    const span = (b, s, e, z) => { const x0 = X(s), x1 = X(Math.min(5, e)); b.scale.x = Math.max(0.05, x1 - x0); b.position.set((x0 + x1) / 2, 0.08, z); b.userData.s = s; };
    function run() {
      const lag = LAGS[st.lag], out = []; let tEnd = 0, wrong = false;
      EN.forEach((c, i) => {
        let ready, word = c.w;
        if (st.mode === 0) ready = END + 0.9 + i * CH;   // cascade: end of turn, recognise, translate, then speak
        else if (lag < 0.3 && c.short) { ready = FR[c.early][1] + 0.15 + lag; word = c.short; wrong = true; }   // committed before the colour arrived
        else ready = FR[c.need][1] + 0.15 + lag;
        if (!st.text && i === 1) word = 'the... cloth';
        const s = Math.max(ready, tEnd); out.push({ w: word, s, e: s + CH * (word.split(' ').length / 3 + 0.6) }); tEnd = out[i].e;
      });
      if (wrong) { const last = out[out.length - 1]; out.push({ w: '...blue', s: last.e, e: last.e + 0.35, fix: true }); }
      const first = out[0].s, overlap = out.filter(o => o.s < END).length;
      return { out, first, overlap, wrong, garbled: !st.text, lag };
    }
    function draw() {
      R = run();
      FR.forEach(([w, tt], i) => { const w0 = Math.min(0.28, (FR[i + 1] ? FR[i + 1][1] : END) - tt - 0.02); span(frT[i], tt, tt + w0, LZ[0]); frT[i].userData.c = C.teal; });
      [txT, enT].forEach((lane, k) => lane.forEach((b, i) => {
        const o = R.out[i], on = !!o && (k === 1 || st.text); b.visible = on; if (!on) return;
        span(b, k === 0 ? o.s - 0.12 : o.s, k === 0 ? o.s + 0.3 : o.e, LZ[k + 1]);
        b.userData.c = o.fix || (R.wrong && i === 1) || (R.garbled && i === 1) ? BAD : k === 0 ? '#C9A227' : '#7A3B69';
      }));
      post.position.set(X(R.first), 0, 0.78);
      paint();
    }
    // blocks light up once the gold bar reaches them
    const paint = () => [...frT, ...txT, ...enT].forEach(b => b.userData.m.color.set(t >= b.userData.s ? b.userData.c : DIM));
    draw();
    const tick = dt => {
      t = (t + dt * 0.8) % 5.6;
      now.position.set(X(Math.min(5, t)), 0.2, 0); paint();
      trader.userData.set({ busy: t < END }); buyer.userData.set({ busy: R.out.some(o => t >= o.s && t <= o.e) });
      trader.userData.tick(dt); buyer.userData.tick(dt);
    };
    const controls = [
      { type: 'buttons', label: 'Model', options: ['Cascade: wait for the sentence', 'Streaming, full duplex'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'buttons', label: 'Lag behind the speaker', options: ['0.16 s (2 steps)', '0.64 s (8 steps)'], get: () => st.lag, act: i => { st.lag = i; draw(); } },
      { type: 'toggle', label: 'Inner text stream', short: 'inner text', get: () => st.text, set: v => { st.text = v; draw(); } },
    ];
    const readouts = [
      { label: 'First English word', get: () => ({ v: `${R.first.toFixed(2)} s`, sub: 'French starts at 0.2 s', good: R.first < 1.6, bad: R.first > 2.5 }) },
      { label: 'Spoken while she talks', get: () => ({ v: `${R.overlap} of ${EN.length}`, sub: 'chunks before she stops' }) },
      { label: 'Translation', get: () => ({ v: R.wrong ? 'word order broken' : R.garbled ? 'words dropped' : 'correct', good: !R.wrong && !R.garbled, bad: R.wrong || R.garbled }) },
    ];
    const labels = [
      { name: 'lanes', t: 'French heard, the trader in Dakar', d: 'Teal words, in time from left to right', icon: 'wave', atV: V(-2.95, 0.3, -0.5) },
      { name: 'text', t: 'The inner text, then English', d: 'Gold: text. Plum: speech. Coral: wrong', icon: 'chat', atV: V(2.95, 0.3, 0.5) },
    ];
    const reset = () => { Object.assign(st, { mode: 1, lag: 1, text: true }); draw(); };
    const breaks = [
      { label: 'Lag too short', hint: '2 steps behind', on: () => { reset(); st.lag = 0; draw(); }, off: reset },
      { label: 'Wait for the sentence', hint: 'A cascade', on: () => { reset(); st.mode = 0; draw(); }, off: reset },
      { label: 'No inner text', hint: 'Audio tokens only', on: () => { reset(); st.text = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 0) return { ok: false, msg: `<b>Accurate, and slow.</b> The cascade waits for the trader to finish, then recognises, translates and speaks: the buyer hears nothing until ${R.first.toFixed(2)} s, and every reply waits a full sentence. Across a long negotiation, those silences add up. A streaming model starts a short lag behind the speaker.` };
      if (R.wrong) return { ok: false, msg: `<b>"The cloth... blue".</b> French puts the colour after the noun: "le tissu bleu". Only ${R.lag.toFixed(2)} s behind, the model has to say "the cloth" before it hears "bleu", then patch it on afterwards. Simultaneous translation needs enough lag to hear what changes the word order: here about 0.6 s.` };
      if (R.garbled) return { ok: false, msg: `<b>Words dropped.</b> Without its inner text stream, the model has to keep track of the meaning inside audio tokens alone, and loses "blue": the buyer hears "the... cloth". Writing the words as text alongside the audio keeps it coherent, and gives a transcript for free.` };
      return { ok: true, msg: `<b>English ${R.lag.toFixed(2)} s behind the French.</b> The model listens and speaks at once: "I'll sell you" starts at ${R.first.toFixed(2)} s, while she is still talking, and the lag is long enough to hear "bleu" before saying "the blue cloth". Its inner text keeps every word.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Dakar to Accra', home: true, say: 'A cloth trader in Dakar speaks French. A buyer in Accra hears English, live. Je vous vends le tissu bleu à bon prix.', act: m => m.set({ mode: 1, lag: 1, text: true }) },
    { t: 'Listen and speak', home: true, say: 'A streaming model hears and speaks at the same time, every eighty milliseconds. English starts while she is still talking.', act: m => m.set({}) },
    { t: 'Inner text', home: true, say: 'Alongside its English audio, it writes the words as text: an inner monologue that keeps the meaning straight.', act: m => m.set({}) },
    { t: 'Word order', home: true, say: 'French puts the colour after the noun. Only two steps behind, the model says "the cloth" before it hears "bleu", and has to patch it.', act: m => m.set({ lag: 0 }) },
    { t: 'Wait for it all', home: true, say: 'A cascade waits for the whole sentence. Accurate, but the buyer hears nothing for three seconds.', act: m => m.set({ lag: 1, mode: 0 }) },
    { t: 'Drop the text', home: true, say: 'Take away the inner text stream, and words start to drop out of the English.', act: m => m.set({ mode: 1, text: false }) },
  ],
  check: [
    { q: 'What makes a model full duplex?', options: ['It listens and speaks at the same time', 'It uses two languages', 'It waits for silence'], answer: 0, why: 'Two audio streams run in parallel.' },
    { q: 'Why can a very short lag break simultaneous translation?', options: ['Languages order words differently, so it must speak before it has heard enough', 'Short lags use more memory', 'Audio gets louder'], answer: 0, why: 'French puts the colour after the noun.' },
    { q: 'What does the inner text stream add?', options: ['Coherence, and a transcript for free', 'A second voice', 'Lower volume'], answer: 0, why: 'Text tokens keep track of the words.' },
  ],
  terms: [
    ['Full duplex', 'Listening and speaking at the same time.'],
    ['Cascade', 'Recognise, then translate or think, then speak, one after another.'],
    ['Simultaneous translation', 'Translating while the speaker is still talking.'],
    ['Lag', 'How far behind the speaker the translation runs.'],
    ['Inner monologue', 'Text tokens a speech model writes alongside its audio.'],
    ['Depth transformer', 'A small model that fills in each frame\'s codebooks in turn.'],
  ],
  deeper: '<p><b>Languages across the region.</b> Traders between Senegal, Côte d\'Ivoire, Ghana and Nigeria cross French, English, Wolof, Twi and Hausa every day. Streaming translators exist for few of these pairs yet; each needs hundreds of hours of paired speech.</p><p><b>Tools and agents.</b> Full-duplex models are excellent at conversation but weak at calling tools, so products often pair one with a pipeline that handles lookups and actions.</p><p><b>About this machine.</b> Word timings and the translation are set by hand. When each English chunk can start, the delay, the overlap and the word-order error are computed live.</p>',
  code: {
    title: 'A streaming loop, 80 ms at a time',
    note: 'Adapted from the course\'s streaming speech-to-speech lesson.',
    text: `
async def duplex(mic, speaker, model, step_ms=80):
    state = model.init_state()
    while True:
        heard = await mic.next_frame(step_ms)            # codec tokens of what we hear
        text, said, state = model.step(state, heard)     # inner text + our next audio tokens
        speaker.play(said)                               # speak while still listening
`,
  },
};
