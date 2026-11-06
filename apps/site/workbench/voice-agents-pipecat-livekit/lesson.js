// Voice agents (phase 14, lesson 22): a Nairobi insurer's phone line. Frames run downstream through turn detection, speech-to-text, the model and text-to-speech. Control runs upstream.
// Pipecat makes every stage a frame processor; LiveKit offers a cascade or a direct audio model. The job decides: redacting card numbers needs text between the stages.
const STAGE = [['Phone line', 80, 'net'], ['Turn', 200, 'turn'], ['Hearing', 150, 'stt'], ['Model', 250, 'llm'], ['Voice', 120, 'tts']];
const BUDGET = 800;
function run(o) {
  const ms = o.mode === 'audio'
    ? { net: 80, turn: o.smart ? 120 : 200, stt: 0, llm: 300, tts: 0 }
    : { net: 80, turn: o.smart ? 120 : 200, stt: o.stream ? 150 : 700, llm: o.stream ? 250 : 900, tts: o.stream ? 120 : 600 };
  const total = Object.values(ms).reduce((a, b) => a + b, 0);
  const over = o.up ? 0 : 2400;     // how long the agent talks over a caller who interrupts
  return { ms, total, over, canRedact: o.mode === 'cascade', leak: o.need && o.mode === 'audio' };
}

export default {
  slug: 'voice-agents-pipecat-livekit',
  title: 'Pipecat and LiveKit: voice frames, up and down the line',
  description: 'A phone line with a tight time budget. Send frames down the pipeline, send control back up, and see which design fits the call.',
  overview: 'A voice agent is not a text loop with speech added. People feel gaps longer than about a second, partial audio is normal, and knowing when someone has finished speaking is itself a model. Pipecat builds the agent as a chain of frame processors: audio, text and speech frames flow downstream, and control frames, such as an interruption, flow upstream. LiveKit Agents runs over WebRTC and phone lines, with two designs: a cascade of speech-to-text, model and text-to-speech, or a direct audio model. The cascade gives you text you can inspect. The direct model cuts latency. The job decides which you can use.',
  keywords: ['voice agents', 'Pipecat', 'LiveKit', 'barge-in', 'latency', 'speech to text', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.68, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'cascade', stream: true, up: true, smart: true, need: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', CHAR = '#2C2D31', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.95;
    const T = STAGE.map(([n, ms, k], i) => { const t = add(P.tower(0.55, 0.45, BLUE)); t.position.set(X(i), 0.03, -0.12); t.userData.set({ cap: '' }); return { t, k }; });
    const down = add(P.pipe([V(-2.4, 0.1, 0.32), V(0, 0.1, 0.32), V(2.4, 0.1, 0.32)], SAF, { r: 0.05, n: 8, speed: 0.5 }));
    const up = add(P.pipe([V(2.4, 0.1, 0.55), V(0, 0.1, 0.55), V(-2.4, 0.1, 0.55)], '#D9483B', { r: 0.035, n: 5, speed: 0.8 }));
    const caller = add(P.robot('#A87A4F', { scale: 0.6 })); caller.position.set(-2.3, 0.03, -0.45);
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.11 })); lamp.position.set(2.3, 0.03, -0.5);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach(({ t, k }) => { const v = R.ms[k]; t.userData.set({ h: Math.max(0.03, v / 900), color: v === 0 ? '#C9C4B6' : v > 400 ? BAD : BLUE }); });
      up.userData.set({ on: st.up, pipe: st.up ? '#B9B3A6' : '#E0DBCE' });
      lamp.userData.set({ color: R.total <= BUDGET && !R.leak && st.up ? GOOD : BAD, on: true });
      caller.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['cascade', 'audio'];
    const controls = [
      { type: 'buttons', label: 'Design', options: ['Cascade', 'Direct audio'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'toggle', label: 'Stream every stage', short: 'Streaming', get: () => st.stream, set: v => set({ stream: !!v }) },
      { type: 'toggle', label: 'Control frames run upstream', short: 'Upstream', get: () => st.up, set: v => set({ up: !!v }) },
      { type: 'toggle', label: 'Turn detection by a model', short: 'Smart turns', get: () => st.smart, set: v => set({ smart: !!v }) },
      { type: 'toggle', label: 'Card numbers must be redacted', short: 'Redact', get: () => st.need, set: v => set({ need: !!v }) },
    ];
    const readouts = [
      { label: 'Time to first word', get: () => ({ v: `${R.total} ms`, sub: `budget ${BUDGET} ms`, good: R.total <= BUDGET, bad: R.total > BUDGET }) },
      { label: 'Talks over the caller', get: () => ({ v: R.over ? `${(R.over / 1000).toFixed(1)} s` : 'stops at once', sub: 'on an interruption', good: !R.over, bad: !!R.over }) },
      { label: 'Text to inspect', get: () => ({ v: R.canRedact ? 'yes' : 'no', sub: st.need ? 'this call needs it' : 'not needed here', good: R.canRedact || !st.need, bad: R.leak }) },
    ];
    const labels = [
      { name: 't', t: 'Time at each stage', d: 'Taller is slower', icon: 'chart', atV: V(X(0), 0.15, 0.1) },
      { name: 'u', t: 'Upstream control', d: 'Red: interruptions go back', icon: 'hand', atV: V(2.3, 0.14, 0.55) },
      { name: 'l', t: 'Call lamp', d: 'Red: this call fails', icon: 'check', atV: V(2.3, 0.6, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Wait for each stage to finish', hint: 'no streaming', on: () => set({ ...D0, stream: false }), off: reset },
      { label: 'Cut the upstream line', hint: 'nothing can interrupt', on: () => set({ ...D0, up: false }), off: reset },
      { label: 'Direct audio on a redaction call', hint: 'no text to clean', on: () => set({ ...D0, mode: 'audio' }), off: reset },
    ];
    function status() {
      if (R.total > BUDGET) return { ok: false, msg: `<b>${R.total} ms of silence before the first word.</b> Each stage waited for the last to finish. Over the phone that sounds like a dropped line, and people start repeating themselves. Stream partial frames through every stage.` };
      if (R.over) return { ok: false, msg: `<b>The caller said stop, and the agent talked on for ${(R.over / 1000).toFixed(1)} s.</b> Speech frames already queued kept playing. An interruption has to travel upstream and cancel the queue. That is why the pipeline runs in both directions.` };
      if (R.leak) return { ok: false, msg: '<b>Faster, but the card number went straight into the model.</b> Direct audio has no text stage, so there is nothing to clean. This call needs a cascade, where a processor can sit between hearing and the model.' };
      return { ok: true, msg: `<b>First word at ${R.total} ms, interruptions stop it at once${st.need ? ', and card numbers are removed from the text before the model sees them' : ''}.</b> ${st.mode === 'audio' ? 'Direct audio is quickest, and fine when no text step is required.' : 'The cascade is slower than direct audio, but gives you text to work on.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A phone line', home: true, say: 'An insurer in Nairobi answers claims by phone. Frames of sound run down a line of stages, and each one spends time.', act: m => m.set({ mode: 'cascade', stream: false, up: true, smart: true, need: true }) },
    { t: 'Stream everything', home: true, say: 'If every stage waits for the last, the caller hears silence. Stream partial frames and the first word comes in time.', act: m => m.set({ mode: 'cascade', stream: true, up: true, smart: true, need: true }) },
    { t: 'Knowing when you\'ve finished', home: true, say: 'Deciding that someone has stopped speaking is itself a model. A pause is not always the end of a thought.', act: m => m.set({ mode: 'cascade', stream: true, up: true, smart: false, need: true }) },
    { t: 'Two directions', home: true, say: 'The caller interrupts. In Pipecat, a control frame runs upstream and cancels speech already queued. Cut that line and the agent talks over them.', act: m => m.set({ mode: 'cascade', stream: true, up: false, smart: true, need: true }) },
    { t: 'Direct audio', home: true, say: 'LiveKit also offers a direct audio model. It is quicker, with no text stage. But this insurer must redact card numbers.', act: m => m.set({ mode: 'audio', stream: true, up: true, smart: true, need: true }) },
    { t: 'The job decides', home: true, say: 'So this call needs the cascade, with a text stage to clean. On a call with nothing to redact, direct audio is the better fit.', act: m => m.set({ mode: 'cascade', stream: true, up: true, smart: true, need: true }) },
  ],
  check: [
    { q: 'What travels upstream in a frame pipeline?', options: ['Control, such as an interruption', 'Audio from the caller', 'The model\'s reply'], answer: 0, why: 'Downstream is media; upstream is feedback and control.', hint: 'Try Cut the upstream line.' },
    { q: 'What does a cascade give you that direct audio doesn\'t?', options: ['Text you can inspect and change', 'Lower latency', 'Better voices'], answer: 0, why: 'A text stage is where redaction and checks can run.', hint: 'Try Direct audio on a redaction call.' },
    { q: 'Why stream every stage?', options: ['So the first word arrives within the budget', 'To save storage', 'To use fewer models'], answer: 0, why: 'Waiting on whole results adds up to long silence.', hint: 'Try Wait for each stage to finish.' },
  ],
  terms: [
    ['Frame', 'A small unit moving through a pipeline: audio, text or control.'],
    ['Frame processor', 'One stage that takes frames in and passes frames on.'],
    ['Barge-in', 'A caller interrupting while the agent speaks.'],
    ['Turn detection', 'Deciding when someone has finished speaking.'],
    ['Cascade', 'Speech to text, then the model, then text to speech.'],
    ['WebRTC', 'A standard for live audio and video over the internet.'],
  ],
  deeper: '<p><b>Where each fits.</b> Pipecat gives you the pipeline as Python code, with many transports. LiveKit gives you rooms, phone lines through SIP and a server that handles sessions. Both can run either design.</p><p><b>Latency numbers.</b> The stage times here are typical round figures. Measure from the end of the caller\'s speech to the first audio they hear, over a real phone line.</p><p><b>State.</b> Longer calls benefit from structured conversation flows, so a claim moves through known steps and nothing is skipped.</p>',
  code: {
    title: 'A frame pipeline',
    note: 'A sketch of the course\'s stdlib frame pipeline (code/main.py), with Pipecat\'s stage names.',
    text: `
pipeline = Pipeline([
    transport.input(),      # audio frames from the phone
    stt,                    # text frames
    Redactor(),             # our own processor removes card numbers
    context_aggregator,
    llm,
    tts,
    transport.output(),
])

class Redactor(FrameProcessor):
    async def process_frame(self, frame, direction):
        if isinstance(frame, TextFrame):
            frame.text = CARD.sub("[card]", frame.text)
        await self.push_frame(frame, direction)
`,
  },
};
