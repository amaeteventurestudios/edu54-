// Voice activity and turn-taking: a woman calls a microfinance helpline from a market in Kampala: "My account number is... (thinking) ...four seven two one." Six seconds in 30 ms frames:
// top lane, loudness; middle lane, the detector's speech score with its threshold; bottom lane, the audio captured and where the system decides her turn has ended.
// Frame loudness and scores are simulated with a fixed seed; the gate, pre-roll, hang-over, the semantic check and every verdict are computed live, frame by frame.
// Break it: a loudness gate in the market (noise counts as speech, the turn never ends), a 200 ms hang-over (she is cut off while thinking), no pre-roll (the first word is clipped).
const FR = 0.03, N = 200, SPEECH = [[0.4, 1.9, 'My account number is'], [2.6, 4.0, 'four seven two one']];
function signal(noisy) {
  let seed = 71; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: N }, (_, i) => {
    const t = i * FR, seg = SPEECH.find(([a, b]) => t >= a && t < b), onset = seg ? Math.min(1, (t - seg[0]) / 0.18) : 0;
    const bike = noisy && t >= 4.6 && t < 5.1;
    let loud = seg ? 0.35 + 0.4 * onset + 0.1 * rnd() : noisy ? (bike ? 0.68 + 0.1 * rnd() : 0.3 + 0.15 * rnd()) : 0.04 + 0.04 * rnd();
    let prob = seg ? 0.35 + 0.6 * onset - 0.05 * rnd() : noisy ? (bike ? 0.3 + 0.1 * rnd() : 0.12 + 0.12 * rnd()) : 0.04 + 0.05 * rnd();
    return { t, loud, prob, speech: !!seg };
  });
}

export default {
  slug: 'voice-activity-detection-turn-taking',
  title: 'Turn-taking: when has she finished?',
  description: 'A woman calls a microfinance helpline from a busy Kampala market and pauses to remember her account number. Frame by frame, a detector scores speech, and the system decides when her turn is over. Then use a plain loudness gate, a short hang-over, or no pre-roll.',
  overview: 'Voice activity detection decides, every 20 or 30 milliseconds, whether someone is speaking. A loudness gate is cheapest but fires on any noise; neural detectors such as Silero score speech itself and run in about a millisecond. Turn-taking needs more than that score. A pre-roll keeps a few hundred milliseconds of audio from before the detector fires, so the first word is not clipped. A minimum speech length ignores coughs and clicks. A hang-over waits through 500 to 800 milliseconds of silence before deciding the turn is over: too short and the system interrupts people who pause to think, too long and it feels slow. A semantic turn detector also looks at the words so far, so a sentence that ends on "is..." is not treated as finished. When the turn does end, streaming recognisers can be told to flush at once instead of waiting for their look-ahead.',
  keywords: ['voice activity detection', 'turn-taking', 'endpointing', 'hang-over', 'pre-roll', 'silero vad'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.25, -0.3], dir: [0.05, 0.2, 1.3], half: 1.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { det: 1, th: 0.5, hang: 1, preroll: true, sem: true, noisy: true };
    const ink = '#151827', HANG = [200, 600, 1200];
    const base = P.box(6.6, 0.12, 1.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, -0.3); S.add(base);
    const BZ = -0.55, BY = 0.3, BH = 1.95, BW = 5.3, BX = 0.3;
    const board = P.box(6.4, BH, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); board.position.set(0, BY, BZ); S.add(board);
    [-3.0, 3.0].forEach(x => { const p = P.cyl(0.035, BY - 0.12, '#8A8578'); p.position.set(x, 0.12, BZ); S.add(p); });
    const X = t => BX - BW / 2 + t / 6 * BW, L1 = BY + 1.35, L2 = BY + 0.72, L3 = BY + 0.32, LH = 0.5;
    [['loudness', L1], ['speech score', L2], ['captured', L3]].forEach(([n, y]) => { const t = S.text(n, { size: 0.11, weight: 800, face: 'front', color: '#5A5A66', align: 'right' }); t.position.set(BX - BW / 2 - 0.45, y + 0.15, BZ + 0.035); S.add(t); });
    const mkBars = (y, col) => Array.from({ length: N }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(BW / N * 0.8, 1, 0.04, col, { r: 0.002, material: mm }); b.position.set(X(i * FR + FR / 2), y, BZ + 0.04); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const loudB = mkBars(L1, '#8A8578'), probB = mkBars(L2, C.teal);
    const thLine = P.box(BW, 0.012, 0.03, '#D64545', { r: 0.004 }); thLine.userData.noFit = true; S.add(thLine);
    const thT = S.text('', { size: 0.075, weight: 800, face: 'front', color: '#D64545' }); thT.userData.noFit = true; S.add(thT);
    const cap = P.box(1, 0.16, 0.05, '#3B3F8F', { r: 0.02 }); cap.userData.noFit = true; S.add(cap);
    const cap2 = P.box(1, 0.16, 0.05, '#3B3F8F', { r: 0.02 }); cap2.userData.noFit = true; S.add(cap2);
    const endM = P.box(0.03, BH - 0.25, 0.06, '#C9A227', { r: 0.01 }); endM.userData.noFit = true; S.add(endM);
    const endT = S.text('', { size: 0.085, weight: 800, face: 'front', color: '#FFFFFF', bg: '#8A6D00', top: true }); endT.userData.noFit = true; S.add(endT);
    SPEECH.forEach(([a, b, w]) => { const t = S.text(w, { size: 0.105, weight: 800, face: 'front', color: '#7A3B69', maxW: X(b) - X(a) }); t.position.set((X(a) + X(b)) / 2, BY + 0.08, BZ + 0.035); S.add(t);
      const sp = P.box(X(b) - X(a), 0.03, 0.03, '#7A3B69', { r: 0.01 }); sp.position.set((X(a) + X(b)) / 2, BY + 0.16, BZ + 0.04); S.add(sp); });
    [0, 1, 2, 3, 4, 5, 6].forEach(s => { const t = S.text(`${s} s`, { size: 0.07, weight: 700, face: 'front', color: '#8A8578' }); t.position.set(X(s), BY + BH - 0.12, BZ + 0.035); S.add(t); });
    const phone = P.box(0.3, 0.55, 0.08, '#2B2B38', { r: 0.04 }); phone.position.set(-2.95, 0.12, 0.1); phone.rotation.x = -0.4; S.add(phone);

    let R = null;
    function run() {
      const sig = signal(st.noisy), th = st.th, hang = HANG[st.hang] / 1000;
      const isOn = f => (st.det === 0 ? f.loud > th * 0.75 : f.prob > th);
      let trig = null, run_ = 0, lastOn = null, endAt = null;
      for (let i = 0; i < N; i++) {
        const f = sig[i];
        if (isOn(f)) { run_++; lastOn = f.t; if (trig === null && run_ * FR >= 0.09) trig = f.t - (run_ - 1) * FR; } else run_ = 0;
        if (trig !== null && endAt === null && lastOn !== null && !isOn(f)) {
          // the semantic check: the words so far end on "is", a sentence that is not finished
          const midSentence = st.sem && lastOn < 2.6 && lastOn > 1.5;
          if (f.t - lastOn >= hang + (midSentence ? 1.0 : 0)) endAt = f.t;
        }
      }
      const capStart = trig === null ? null : Math.max(0, trig - (st.preroll ? 0.3 : 0));
      const clipped = capStart !== null && capStart > 0.42;
      const cutOff = endAt !== null && endAt < 2.6;
      return { sig, trig, capStart, endAt, clipped, cutOff, never: endAt === null, lat: endAt !== null && !cutOff ? endAt - 4.0 : null };
    }
    function draw() {
      R = run();
      R.sig.forEach((f, i) => { loudB[i].b.scale.y = Math.max(0.005, f.loud * LH); probB[i].b.scale.y = Math.max(0.005, f.prob * LH);
        const on = st.det === 0 ? f.loud > st.th * 0.75 : f.prob > st.th;
        loudB[i].mm.color.set(st.det === 0 ? (on ? (f.speech ? C.teal : '#D64545') : '#C9C5BA') : '#8A8578');
        probB[i].mm.color.set(st.det === 1 ? (on ? (f.speech ? C.teal : '#D64545') : '#C9C5BA') : '#B9D9D3'); });
      const lane = st.det === 0 ? L1 : L2, ty = lane + (st.det === 0 ? st.th * 0.75 : st.th) * LH;
      thLine.position.set(BX, ty, BZ + 0.06); thT.userData.set(st.det === 0 ? 'loudness gate' : `threshold ${st.th.toFixed(2)}`); thT.position.set(BX + BW / 2 + 0.35, ty, BZ + 0.05);
      const end = R.endAt === null ? 6 : R.endAt, s0 = R.capStart === null ? 0 : R.capStart;
      cap.visible = R.capStart !== null; cap.scale.x = Math.max(0.01, X(end) - X(s0)); cap.position.set((X(s0) + X(end)) / 2, L3, BZ + 0.04); cap.material.color.set(R.clipped || R.cutOff ? '#D64545' : '#3B3F8F');
      cap2.visible = R.cutOff; if (R.cutOff) { cap2.scale.x = X(4.0) - X(2.6); cap2.position.set((X(2.6) + X(4.0)) / 2, L3, BZ + 0.04); cap2.material.color.set('#C9C5BA'); }
      endM.visible = R.endAt !== null; endM.position.set(X(end), BY + 0.12, BZ + 0.05);
      endT.userData.set(R.never ? 'turn never ends' : R.cutOff ? 'turn ends: cut off' : 'turn ends'); endT.position.set(R.never ? X(5.4) : X(end), BY + BH - 0.32, BZ + 0.07);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Detector', options: ['Loudness gate', 'Neural speech score'], get: () => st.det, act: i => { st.det = i; draw(); } },
      { type: 'slider', label: 'Threshold', min: 0.3, max: 0.8, step: 0.05, get: () => st.th, set: v => { st.th = v; draw(); }, fmt: v => v.toFixed(2) },
      { type: 'buttons', label: 'Hang-over', options: ['200 ms', '600 ms', '1200 ms'], get: () => st.hang, act: i => { st.hang = i; draw(); } },
      { type: 'toggle', label: 'Keep 300 ms of pre-roll', short: 'pre-roll', get: () => st.preroll, set: v => { st.preroll = v; draw(); } },
      { type: 'toggle', label: 'Semantic turn check', short: 'semantic check', get: () => st.sem, set: v => { st.sem = v; draw(); } },
      { type: 'buttons', label: 'Background', options: ['Quiet room', 'Busy market'], get: () => (st.noisy ? 1 : 0), act: i => { st.noisy = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'First word', get: () => ({ v: R.capStart === null ? 'missed' : R.clipped ? 'clipped' : 'kept', good: R.capStart !== null && !R.clipped, bad: R.capStart === null || R.clipped }) },
      { label: 'Turn ends', get: () => ({ v: R.never ? 'never' : R.cutOff ? 'mid-sentence' : `${R.lat.toFixed(2)} s after`, sub: 'she stops at 4.0 s', good: !R.never && !R.cutOff && R.lat <= 0.9, bad: R.never || R.cutOff || R.lat > 1.3 }) },
      { label: 'Noise frames as speech', get: () => ({ v: String(R.sig.filter(f => !f.speech && (st.det === 0 ? f.loud > st.th * 0.75 : f.prob > st.th)).length), bad: R.sig.filter(f => !f.speech && (st.det === 0 ? f.loud > st.th * 0.75 : f.prob > st.th)).length > 5 }) },
    ];
    const labels = [
      { name: 'lanes', t: 'Frame by frame', d: 'Red bars: noise taken for speech', icon: 'wave', atV: V(BX + BW / 2 + 0.25, L1 + 0.2, BZ) },
      { name: 'turn', t: 'Captured turn', d: 'Gold line: the system replies', icon: 'check', atV: V(BX + BW / 2 + 0.25, L3, BZ) },
    ];
    const reset = () => { Object.assign(st, { det: 1, th: 0.5, hang: 1, preroll: true, sem: true, noisy: true }); draw(); };
    const breaks = [
      { label: 'Loudness gate in the market', hint: 'Noise is loud too', on: () => { reset(); st.det = 0; draw(); }, off: reset },
      { label: '200 ms hang-over', hint: 'She pauses to think', on: () => { reset(); st.hang = 0; st.sem = false; draw(); }, off: reset },
      { label: 'No pre-roll', hint: 'The first word', on: () => { reset(); st.preroll = false; draw(); }, off: reset },
    ];
    function status() {
      const noise = R.sig.filter(f => !f.speech && (st.det === 0 ? f.loud > st.th * 0.75 : f.prob > st.th)).length;
      if (R.never) return { ok: false, msg: `<b>Her turn never ends.</b> In the market, chatter and a passing motorbike are as loud as her voice, so the loudness gate counts ${noise} noise frames as speech and the silence the hang-over waits for never comes. The caller waits for an answer that does not start. Use a detector that scores speech itself, not loudness.` };
      if (R.cutOff) return { ok: false, msg: `<b>Cut off while thinking.</b> She pauses for 0.7 s after "my account number is" to remember it. A ${HANG[st.hang]} ms hang-over decides her turn is over at ${R.endAt.toFixed(2)} s, and the system replies over "four seven two one". Wait 500 to 800 ms, and let a semantic check notice the sentence is not finished.` };
      if (R.clipped) return { ok: false, msg: `<b>"My" is clipped.</b> Speech starts softly, so the detector only fires at ${R.trig.toFixed(2)} s, after the first word has begun. Without pre-roll, the captured audio starts there and the recogniser hears "...account number is". Keep 300 ms of audio from before the detector fires.` };
      if (R.lat > 1.3) return { ok: false, msg: `<b>Slow to answer.</b> With a ${HANG[st.hang]} ms hang-over, the system waits ${R.lat.toFixed(2)} s after she stops before replying; it feels like the line has dropped. 500 to 800 ms is the usual balance.` };
      return { ok: true, msg: `<b>Her whole turn, then a prompt reply.</b> The speech score ignores the market noise, pre-roll keeps "My", the semantic check waits through her thinking pause after "is", and the ${HANG[st.hang]} ms hang-over ends the turn ${R.lat.toFixed(2)} s after "one".` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A call from the market', home: true, say: 'A woman calls a microfinance helpline from a busy Kampala market. My account number is... she pauses to remember... four seven two one.', act: m => m.set({ det: 1, th: 0.5, hang: 1, preroll: true, sem: true, noisy: true }) },
    { t: 'Score every frame', home: true, say: 'Every thirty milliseconds, a neural detector scores how much the sound is speech. Market noise scores low; her voice scores high.', act: m => m.set({}) },
    { t: 'Loudness is not speech', home: true, say: 'A plain loudness gate counts the chatter and a passing motorbike as speech. The silence it waits for never comes.', act: m => m.set({ det: 0 }) },
    { t: 'Keep the first word', home: true, say: 'Her first word starts softly. Without pre-roll, "my" is clipped before the detector fires.', act: m => m.set({ det: 1, preroll: false }) },
    { t: 'A thinking pause', home: true, say: 'With a short hang-over and no sense of the words, the system decides she has finished during her pause, and talks over the number.', act: m => m.set({ preroll: true, hang: 0, sem: false }) },
    { t: 'Wait, but not too long', home: true, say: 'A six-hundred-millisecond hang-over, plus a check that "is" does not end a sentence, waits through the pause and replies promptly at the end.', act: m => m.set({ hang: 1, sem: true }) },
  ],
  check: [
    { q: 'Why is a loudness gate a poor speech detector in a market?', options: ['Noise can be as loud as speech', 'It is too slow', 'It needs a GPU'], answer: 0, why: 'Neural detectors score speech itself.' },
    { q: 'What does pre-roll prevent?', options: ['Clipping the first word before the detector fires', 'Background noise', 'Long replies'], answer: 0, why: 'Keep a few hundred milliseconds from before.' },
    { q: 'What goes wrong with a very short hang-over?', options: ['The system interrupts people who pause to think', 'Replies come too slowly', 'The first word is lost'], answer: 0, why: '500 to 800 ms is the usual balance.' },
  ],
  terms: [
    ['Voice activity detection', 'Deciding frame by frame whether someone is speaking.'],
    ['Threshold', 'The score above which a frame counts as speech.'],
    ['Pre-roll', 'Audio kept from before the detector fires.'],
    ['Hang-over', 'Silence waited through before the turn is declared over.'],
    ['Semantic turn detection', 'Using the words so far to judge whether the speaker has finished.'],
    ['Flush', 'Telling a streaming recogniser to output its last words at once.'],
  ],
  deeper: '<p><b>Pauses differ.</b> How long people pause mid-sentence varies by language, culture and situation: reading out a number, thinking in a second language, or speaking on a poor line. Tune hang-over on recordings of your real callers.</p><p><b>The flush trick.</b> Streaming recognisers hold back some audio to look ahead. When the turn ends, a flush makes them finish immediately, cutting hundreds of milliseconds from every reply.</p><p><b>About this machine.</b> Frame loudness and speech scores are simulated with a fixed seed. The gate, pre-roll, hang-over, semantic check and every verdict are computed live.</p>',
  code: {
    title: 'A turn-end state machine',
    note: 'Adapted from the course\'s voice activity detection lesson.',
    text: `
def turn_events(frames, vad, threshold=0.5, preroll_ms=300, hangover_ms=600, frame_ms=30, unfinished=lambda: False):
    start, last_speech = None, None
    for i, frame in enumerate(frames):
        t = i * frame_ms
        if vad(frame) > threshold:
            if start is None:
                start = max(0, t - preroll_ms)          # keep audio from before
                yield ("start", start)
            last_speech = t
        elif start is not None and t - last_speech >= hangover_ms + (1000 if unfinished() else 0):
            yield ("end", t)                            # flush the recogniser here
            start = None
`,
  },
};
