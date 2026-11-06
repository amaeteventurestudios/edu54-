// Voice assistant capstone: farmers near Arusha call a voice assistant for market prices. Seven parts sit on the bench (mic, voice gate, speech to text, language model with a
// price tool, text to speech, speaker, and the interrupt wire); the board behind is one turn on a timeline, lane by lane. Stage timings are typical streaming values;
// the timeline, the time to first audio, turns needed and the spoken price (in the learner's currency) are computed live.
// Break it: voice gate starts too late (the first word, "Beans", is clipped), interrupt wire cut (the assistant talks over the farmer), price service down with no error handling (a price is invented).
const LANES = ['farmer', 'voice gate', 'transcript', 'model', 'price tool', 'assistant voice'];
const PRICE_USD = 0.95;   // beans, per kilo, an example

export default {
  slug: 'voice-assistant-pipeline',
  title: 'Voice assistant: the whole pipeline',
  description: 'Farmers near Arusha phone a voice assistant for prices. Each part adds delay before the first word, and each one can fail.',
  overview: 'A voice assistant chains everything in this track. Audio arrives in 20 ms chunks; a voice activity detector marks where speech starts and, after a short hang-over of silence, where it ends; streaming speech-to-text produces partial and final transcripts; a language model reads the transcript, calls tools such as a price lookup, and streams its reply; streaming text-to-speech starts speaking after the first few words instead of waiting for the whole answer; and an interrupt handler stops speech and cancels generation the moment the caller talks. Three failures are common: a voice gate that starts late clips the first word, an assistant without barge-in talks over people, and silence fed to the recogniser invents text. Tools fail too, so errors must go back to the model, which should say it cannot check rather than make something up. Keep recorded audio only as long as needed: it is personal data.',
  keywords: ['voice assistant', 'pipeline', 'streaming', 'tool calling', 'barge-in', 'latency'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, -0.15], dir: [0.05, 0.95, 1.1], half: 0.95, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { vad: 0, stream: true, barge: true, down: false, handle: true };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const Z = 0.1;
    // the farmer on the phone, then the parts of the assistant in the order the call passes through them
    const farmer = P.robot('#7A3B69', { scale: 0.9 }); farmer.position.set(-2.7, 0, Z); S.add(farmer);
    const mic = new THREE.Group(); mic.position.set(-2.05, 0, Z); S.add(mic);
    mic.add(P.cyl(0.04, 0.38, '#6B6E7E')); const head = P.ball(0.09, '#3F4049'); head.position.y = 0.44; mic.add(head);
    const gate = P.gate(0.42, GOOD, { h: 0.45 }); gate.position.set(-1.45, 0, Z); S.add(gate);
    const sttM = own('#3D6BD6'), stt = P.box(0.46, 0.22, 0.42, '#fff', { r: 0.05, material: sttM }); stt.position.set(-0.75, 0, Z); S.add(stt);
    const words = P.stack(0.3, 0.26, 0.06, { max: 7 }); words.position.set(-0.75, 0.22, Z); S.add(words);
    const model = P.robot(C.plum, { scale: 1.0 }); model.position.set(0.1, 0, Z); S.add(model);
    const toolM = own(C.orange), tool = P.box(0.4, 0.3, 0.34, '#fff', { r: 0.05, material: toolM }); tool.position.set(0.55, 0, -0.7); S.add(tool);
    const ask = P.pipe([V(0.1, 0.45, Z - 0.15), V(0.3, 0.65, -0.3), V(0.45, 0.32, -0.55)], C.orange, { r: 0.025, n: 3 }); S.add(ask);
    const back = P.pipe([V(0.65, 0.32, -0.55), V(0.55, 0.6, -0.25), V(0.25, 0.45, Z - 0.1)], SAF, { r: 0.025, n: 3 }); S.add(back);
    const ttsM = own(GOOD), tts = P.box(0.46, 0.22, 0.42, '#fff', { r: 0.05, material: ttsM }); tts.position.set(0.9, 0, Z); S.add(tts);
    const spkM = own('#3F4049'), spk = P.cyl(0.2, 0.42, '#fff', { material: spkM }); spk.position.set(1.55, 0, Z); S.add(spk);
    const coneM = own(GOOD), cone = P.cyl(0.13, 0.04, '#fff', { material: coneM }); cone.rotation.x = Math.PI / 2; cone.position.set(1.55, 0.25, Z + 0.21); S.add(cone);
    const line = P.pipe([V(-2.4, 0.4, Z), V(-1.2, 0.18, Z), V(0.5, 0.18, Z), V(1.35, 0.25, Z)], '#8FA3C8', { r: 0.025, n: 8 }); S.add(line);
    // the interrupt wire: from the voice gate to the speaker, over the top
    const wireM = new THREE.MeshLambertMaterial({ color: C.orange }), wire = P.tube([V(-1.45, 0.5, Z - 0.05), V(0.05, 1.05, Z - 0.25), V(1.55, 0.45, Z - 0.05)], 0.02, C.orange, { material: wireM }); S.add(wire);
    // the price the farmer hears, as coins, and the silence before the first word, as a tower
    const jar = P.jar(0.16, 0.42, { max: 8 }); jar.position.set(2.15, 0, Z); S.add(jar);
    const hush = P.tower(0.26, 0.26, GOOD); hush.position.set(2.7, 0, Z); hush.userData.set({ cap: '' }); S.add(hush);
    S.add(P.keep(-2.95, 2.9, 1.15, -0.95, 0.45));
    let R = null;
    const price = () => S.money.of(PRICE_USD);
    function run() {
      const clipped = st.vad === 1, speechEnd = 1400;
      const vadStart = clipped ? 420 : 80, vadEnd = speechEnd + 500;
      const sttFinal = vadEnd + 150, llmFirst = sttFinal + 300, toolEnd = llmFirst + 250;
      const llmDone = toolEnd + 900, ttsStart = st.stream ? toolEnd + 120 : llmDone + 120;
      const said = clipped ? 'Which crop do you mean?' : st.down ? (st.handle ? 'I can\'t reach the market prices right now. Please try again shortly.' : `Beans in Arusha are ${S.money.of(PRICE_USD * 1.6)} a kilo today.`) : `Beans in Arusha are ${price()} a kilo today.`;
      const interrupt = 4600, natural = ttsStart + 3200, ttsEnd = st.barge ? Math.min(natural, interrupt + 100) : natural, overTalk = Math.max(0, ttsEnd - interrupt);
      return { clipped, vadStart, vadEnd, sttFinal, llmFirst, toolEnd, llmDone, ttsStart, ttsEnd, said, interrupt, overTalk, turns: clipped ? 2 : 1, invented: st.down && !st.handle && !clipped };
    }
    function draw() {
      R = run();
      gate.userData.set({ color: R.clipped ? BAD : GOOD });
      words.userData.set({ n: 7, colors: [R.clipped ? BAD : SAF, ...Array(6).fill('#F4F1EA')] });
      toolM.color.set(st.down ? BAD : C.orange);
      ask.visible = !R.clipped; back.visible = !R.clipped && (!st.down || st.handle);
      back.userData.set({ color: st.down ? BAD : SAF });
      model.userData.set({ lamp: R.invented ? BAD : R.clipped ? SAF : GOOD, busy: true });
      wire.visible = st.barge;
      coneM.color.set(R.overTalk > 0 && !st.barge ? BAD : GOOD);
      const coins = R.clipped || (st.down && st.handle) ? 0 : R.invented ? 8 : 5;
      jar.userData.set({ n: coins, color: R.invented ? BAD : '#E3A72F' });
      const fa = (R.ttsStart - 1400) / 1000;
      hush.userData.set({ h: Math.max(0.05, fa / 2.6), color: fa <= 1.4 ? GOOD : fa > 2 ? BAD : SAF });
    }
    draw(); hush.userData.snap();
    const tick = dt => { [farmer, model, ask, back, line, hush].forEach(o => o.userData.tick(dt)); gate.userData.tick(dt, true); };
    const controls = [
      { type: 'buttons', label: 'Voice gate starts at', options: ['Low threshold (0.3)', 'High threshold (0.5)'], get: () => st.vad, act: i => { st.vad = i; draw(); } },
      { type: 'toggle', label: 'Stream speech as the reply is written', short: 'streaming', get: () => st.stream, set: v => { st.stream = v; draw(); } },
      { type: 'toggle', label: 'Interrupt wire', short: 'barge-in', get: () => st.barge, set: v => { st.barge = v; draw(); } },
      { type: 'toggle', label: 'Price service is down', short: 'service down', get: () => st.down, set: v => { st.down = v; draw(); } },
      { type: 'toggle', label: 'Pass tool errors back to the model', short: 'handle errors', get: () => st.handle, set: v => { st.handle = v; draw(); } },
    ];
    const readouts = [
      { label: 'First audio', get: () => ({ v: `${((R.ttsStart - 1400) / 1000).toFixed(2)} s`, sub: 'after the farmer stops', good: R.ttsStart - 1400 <= 1400, bad: R.ttsStart - 1400 > 2000 }) },
      { label: 'Turns needed', get: () => ({ v: String(R.turns), bad: R.turns > 1, good: R.turns === 1 }) },
      { label: 'Price said', get: () => ({ v: R.clipped ? 'none yet' : R.invented ? 'invented' : st.down ? 'honest: unavailable' : price(), good: !R.clipped && !R.invented, bad: R.invented || R.clipped }) },
    ];
    const labels = [
      { name: 'bench', t: 'Farmer, mic, voice gate, transcript', d: 'Gold block: "Beans". Coral: clipped', icon: 'wave', atV: V(-2.94, 0.3, Z) },
      { name: 'tool', t: 'The model and its price tool', d: 'Coral: the service is down', icon: 'box', atV: V(0.75, 0.2, -0.7) },
      { name: 'time', t: 'What the farmer hears', d: 'Coins: the price said. Tower: the silence first', icon: 'money', atV: V(2.83, 0.3, Z) },
    ];
    const reset = () => { Object.assign(st, { vad: 0, stream: true, barge: true, down: false, handle: true }); draw(); };
    const breaks = [
      { label: 'Voice gate starts late', hint: 'High start threshold', on: () => { reset(); st.vad = 1; draw(); }, off: reset },
      { label: 'Cut the interrupt wire', hint: 'Farmer interrupts', on: () => { reset(); st.barge = false; draw(); }, off: reset },
      { label: 'Tool fails, error ignored', hint: 'Price service down', on: () => { reset(); st.down = true; st.handle = false; draw(); }, off: reset },
    ];
    function status() {
      const fa = ((R.ttsStart - 1400) / 1000).toFixed(2);
      if (R.clipped) return { ok: false, msg: `<b>"Beans" was clipped.</b> With the voice gate's start threshold at 0.5, it opens a beat after the farmer starts, so the transcript begins "...what's the price in Arusha today". The model has to ask "Which crop do you mean?", and the call takes two turns. Start the gate at a lower threshold and keep a little audio from before it opens.` };
      if (R.invented) return { ok: false, msg: `<b>A price nobody checked.</b> The price service is down, but the error never reaches the model, so it writes a plausible answer anyway: "${R.said}" A farmer might sell for less, or travel for nothing. Pass tool errors back to the model, retry once, and let it say it cannot check.` };
      if (!st.barge) return { ok: false, msg: `<b>Talking over the farmer.</b> At 4.6 s the farmer says "Stop, I meant maize!", but with the interrupt wire cut the assistant keeps reading out the bean price for another ${(R.overTalk / 1000).toFixed(1)} s, over the top of them. Wire the voice gate to stop the speaker and cancel generation within about 100 ms.` };
      if (!st.stream) return { ok: false, msg: `<b>A long silence before the answer.</b> Waiting for the whole reply before speaking puts the first audio ${fa} s after the farmer stops; on a phone line that sounds like a dropped call. Start speaking after the first few words of the reply.` };
      return { ok: true, msg: `<b>"${R.said}"</b> The voice gate catches "Beans" from the first syllable, the model calls the price tool, speech starts ${fa} s after the farmer stops, and when the farmer interrupts, the interrupt wire stops the reply at once.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); }, currency: draw };
  },

  story: [
    { t: 'A price line', home: true, say: 'Farmers near Arusha phone a voice assistant for market prices. A farmer asks: beans, what\'s the price in Arusha today?', act: m => m.set({ vad: 0, stream: true, barge: true, down: false, handle: true }) },
    { t: 'Seven parts', home: true, say: 'The voice gate finds the speech, speech to text writes it down, the model calls a price tool, and text to speech answers, starting after the first few words.', act: m => m.set({}) },
    { t: 'A clipped word', home: true, say: 'Start the voice gate too late, and "beans" is cut off. The assistant has to ask which crop, and the call takes two turns.', act: m => m.set({ vad: 1 }) },
    { t: 'Wait, or stream', home: true, say: 'Wait for the whole reply before speaking, and there is a long silence. On a phone line, that sounds like a dropped call.', act: m => m.set({ vad: 0, stream: false }) },
    { t: 'Interruptions', home: true, say: 'The farmer says: stop, I meant maize. Cut the interrupt wire, and the assistant talks right over them.', act: m => m.set({ stream: true, barge: false }) },
    { t: 'When tools fail', home: true, say: 'If the price service is down and the error never reaches the model, it invents a price. Pass the error back, and it says it cannot check.', act: m => m.set({ barge: true, down: true, handle: false }) },
  ],
  check: [
    { q: 'Why stream text to speech as the reply is written?', options: ['Speaking starts after a few words instead of after the whole reply', 'It makes the voice clearer', 'It uses less memory'], answer: 0, why: 'Long silences sound like dropped calls.' },
    { q: 'What should happen when the caller talks while the assistant is speaking?', options: ['Stop speaking and cancel generation at once', 'Finish the sentence first', 'Raise the volume'], answer: 0, why: 'That is barge-in.' },
    { q: 'A tool call fails. What should the assistant do?', options: ['Pass the error to the model, retry once, then say it cannot check', 'Make up a likely answer', 'Hang up'], answer: 0, why: 'Invented prices can cost farmers money.' },
  ],
  terms: [
    ['Voice gate', 'Voice activity detection marking where speech starts and ends.'],
    ['Hang-over', 'Silence the gate waits through before deciding speech has ended.'],
    ['Streaming', 'Passing partial results on as soon as they exist.'],
    ['Tool call', 'The model asking code to fetch or do something.'],
    ['Barge-in', 'The caller interrupting while the assistant speaks.'],
    ['Time to first audio', 'Delay from the caller stopping to the assistant starting.'],
  ],
  deeper: '<p><b>Languages on the line.</b> Farmers around Arusha speak Swahili, Maa and English, often in one sentence. Each part, from voice gate to text to speech, needs testing in the languages callers really use.</p><p><b>Privacy.</b> Call audio is personal data. Keep it only as long as needed, encrypted, and tell callers what is recorded.</p><p><b>About this machine.</b> Stage timings are typical streaming values, and the price is an example converted to your chosen currency. The timeline, time to first audio, turns and answers are computed live.</p>',
  code: {
    title: 'One turn, streaming, with barge-in',
    note: 'Adapted from the course\'s voice assistant capstone.',
    text: `
async def turn(mic, vad, stt, llm, tts, speaker):
    audio = await vad.capture_utterance(mic, start=0.3, hangover_ms=500)
    text = await stt.transcribe(audio)
    async for chunk in llm.stream(text, tools=[get_price]):   # tool errors go back to the model
        speaker.play(await tts.speak(chunk))                  # start after the first words
        if vad.speech_now(mic):                               # the caller interrupts
            speaker.stop(); llm.cancel(); break
`,
  },
};
