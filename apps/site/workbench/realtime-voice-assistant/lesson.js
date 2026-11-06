// Capstone: a real-time voice assistant (phase 19, capstone 3). A Mombasa ferry line's phone assistant runs the whole path: hearing, model, a timetable tool, voice. Twenty calls with a jitter pattern give a real p95 from the end of speech to the first audio.
// A slow tool goes silent unless a filler line plays. English and Swahili mix in the same call, so a monoglot hearing model mishears. Barge-in and the p95 target decide if it ships.
const BASE = { net: 80, asr: 160, llm: 260, tts: 110 }, TOOL = 900, SLO = 800;
const JIT = [0, 20, 10, 40, 5, 90, 15, 30, 60, 10, 25, 180, 15, 35, 10, 70, 20, 5, 45, 240];
function run(o) {
  const lat = JIT.map((j, i) => {
    const tool = o.tool && i % 3 === 0;
    let t = BASE.net + BASE.asr + BASE.llm + BASE.tts + j;
    if (tool) t = o.filler ? t : t + TOOL;
    return t;
  }).sort((a, b) => a - b);
  const p50 = lat[9], p95 = lat[18];
  const wrong = o.mix && !o.multi ? 6 : 0;
  return { p50, p95, wrong, over: o.barge ? 0 : 2 };
}

export default {
  slug: 'realtime-voice-assistant',
  title: 'Capstone: a phone assistant that keeps up',
  description: 'A ferry line\'s phone agent, end to end. Hearing, model, tool, voice, and a latency target that twenty calls must meet.',
  overview: 'Voice got fast. Sub-second replies are now in reach, and building one still means joining many parts against a clock. This capstone runs a whole assistant for a ferry line in Mombasa: speech to text, a model, a timetable tool, text to speech, over a phone line with real jitter. The measure is p95 from the end of the caller\'s speech to the first sound back, because a good average hides bad calls. A tool call can break the budget, so a short spoken filler buys time. Callers mix Swahili and English in one sentence, so a hearing model must cope. Interruptions must cut speech at once. Twenty calls are timed here.',
  keywords: ['voice assistant', 'ASR', 'TTS', 'p95 latency', 'barge-in', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { tool: true, filler: true, mix: true, multi: true, barge: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.235;
    const T = JIT.map((j, i) => { const t = add(P.tower(0.19, 0.3, GOOD)); t.position.set(X(i), 0.03, -0.3); t.userData.set({ cap: '' }); return t; });
    const line = new S.THREE.Mesh(new S.THREE.BoxGeometry(5, 0.025, 0.4), new S.THREE.MeshLambertMaterial({ color: SAF, transparent: true, opacity: 0.45, depthWrite: false })); line.position.set(0.5, 0.03 + SLO * 0.0009, -0.3); line.userData.noMask = true; line.scale.x = 0.98; S.add(line);
    const caller = add(P.robot('#A87A4F', { scale: 0.6 })); caller.position.set(-2.1, 0.03, 0.45);
    const stages = ['#5B8DB8', '#7B6FA8', '#3E9B9B', SAF].map((c, i) => { const b = P.box(0.5, 0.3, 0.4, c, { r: 0.04 }); b.position.set(-1.2 + i * 0.72, 0.03, 0.45); S.add(b); return b; });
    const wave = P.ball(0.08, SAF); wave.userData.noFit = true; S.add(wave);
    const boat = P.box(0.8, 0.2, 0.34, '#F4F1EA', { r: 0.06 }); boat.position.set(1.95, 0.03, 0.45); S.add(boat);
    S.add(P.keep(-2.45, 2.75, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      const s = [...JIT.map((j, i) => { const tool = st.tool && i % 3 === 0; return BASE.net + BASE.asr + BASE.llm + BASE.tts + j + (tool && !st.filler ? TOOL : 0); })];
      T.forEach((t, i) => t.userData.set({ h: s[i] * 0.0009, color: s[i] > SLO ? BAD : GOOD }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('tool', 'Calls need the timetable tool', 'Tool calls'), tg('filler', 'Say a short line while the tool runs', 'Filler'),
      tg('mix', 'Callers mix Swahili and English', 'Code-switch'), tg('multi', 'A hearing model that handles both', 'Mixed hearing'), tg('barge', 'Stop talking when interrupted', 'Barge-in'),
    ];
    const readouts = [
      { label: 'p95 to first sound', get: () => ({ v: `${R.p95} ms`, sub: `target ${SLO} ms, median ${R.p50}`, good: R.p95 <= SLO, bad: R.p95 > SLO }) },
      { label: 'Misheard calls', get: () => ({ v: `${R.wrong} of 20`, sub: st.mix ? 'mixed speech' : 'one language', good: !R.wrong, bad: R.wrong > 0 }) },
      { label: 'Talks over the caller', get: () => ({ v: R.over ? `${R.over} s` : 'never', good: !R.over, bad: !!R.over }) },
    ];
    const labels = [
      { name: 't', t: 'Twenty calls, timed', d: 'Plane: the target', icon: 'target', atV: V(X(0) - 0.1, 0.25, -0.3) },
      { name: 'p', t: 'Hear, think, look up, speak', d: 'One path for every call', icon: 'wave', atV: V(2.3, 0.15, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Silence during the tool call', hint: 'a second of nothing', on: () => set({ ...D0, filler: false }), off: reset },
      { label: 'One-language hearing', hint: 'callers mix two', on: () => set({ ...D0, multi: false }), off: reset },
      { label: 'No barge-in', hint: 'it talks over the caller', on: () => set({ ...D0, barge: false }), off: reset },
    ];
    function status() {
      if (st.tool && !st.filler) return { ok: false, msg: `<b>p95 of ${R.p95} ms, though the median is ${R.p50}.</b> A third of calls hit the timetable and go silent for a second. Averages hide that. A short "let me check that sailing" keeps the call alive.` };
      if (R.wrong) return { ok: false, msg: `<b>${R.wrong} of 20 calls misheard.</b> "Nataka ferry ya saa nane" breaks a model tuned for one language. Test on how people really speak on this line.` };
      if (R.over) return { ok: false, msg: `<b>It talks on for ${R.over} seconds after the caller says stop.</b> Every part is fast, and the whole still feels rude. Interruptions must clear the speech queue at once.` };
      return { ok: true, msg: `<b>p95 of ${R.p95} ms against a target of ${SLO}.</b> Filler covers tool calls, mixed speech is understood, and interruptions work. Ship it, and keep timing real calls.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.6) % 1; wave.position.set(-1.85 + 3.6 * u, 0.42, 0.45); caller.userData.set({ busy: true }); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A ferry line', home: true, say: 'A ferry line in Mombasa answers its phones with an assistant. Hear, think, look up, speak, on every call.', act: m => m.set({ tool: false, filler: true, mix: false, multi: true, barge: true }) },
    { t: 'Timed calls', home: true, say: 'Each tower is one call, from the end of speech to the first sound back. The plane is the target.', act: m => m.set({ tool: false, filler: true, mix: false, multi: true, barge: true }) },
    { t: 'Why p95', home: true, say: 'Add the timetable tool, and a third of calls go silent. The median looks fine, and the worst calls do not.', act: m => m.set({ tool: true, filler: false, mix: false, multi: true, barge: true }) },
    { t: 'Buy time', home: true, say: 'A short spoken line while the tool runs keeps the caller with you.', act: m => m.set({ tool: true, filler: true, mix: false, multi: true, barge: true }) },
    { t: 'Real speech', home: true, say: 'Callers mix Swahili and English in one sentence. The hearing model must too.', act: m => m.set({ tool: true, filler: true, mix: true, multi: false, barge: true }) },
    { t: 'Let them interrupt', home: true, say: 'And when a caller cuts in, stop at once. Now the whole path meets the target.', act: m => m.set({ tool: true, filler: true, mix: true, multi: true, barge: true }) },
  ],
  check: [
    { q: 'Why track p95, not the average?', options: ['Bad calls hide in an average', 'It is easier', 'Averages are illegal'], answer: 0, why: 'One in twenty calls still matters.', hint: 'Try Silence during the tool call.' },
    { q: 'What is a filler line for?', options: ['Keeping the call alive during a slow tool', 'Reducing cost', 'Better accuracy'], answer: 0, why: 'Silence reads as a dropped line.', hint: 'Switch Filler on and off.' },
    { q: 'What is code-switching?', options: ['Mixing languages in one sentence', 'Changing the API', 'Rewriting code'], answer: 0, why: 'Hearing models must handle how people really speak.', hint: 'Try One-language hearing.' },
  ],
  terms: [
    ['ASR', 'Automatic speech recognition.'],
    ['TTS', 'Text to speech.'],
    ['p95', 'The value 95% of calls beat.'],
    ['Filler', 'A short line that buys time.'],
    ['Barge-in', 'Interrupting the assistant.'],
    ['Code-switching', 'Mixing languages as you speak.'],
  ],
  deeper: '<p><b>Budget it.</b> Give each stage a number, and measure each one. The total is what callers feel.</p><p><b>Parts.</b> The Pipecat and LiveKit lesson goes deeper on frames and control.</p><p><b>This run.</b> Twenty calls have a fixed jitter pattern, so the p95 is computed, and stage times are round figures.</p>',
  code: {
    title: 'Fill the gap',
    note: 'Adapted from the course\'s capstone sketch (code/main.py).',
    text: `
async def respond(turn):
    plan = await llm.first_tokens(turn)
    if plan.needs_tool:
        await tts.say("Let me check that sailing.")   # within the budget
        result = await tools.timetable(plan.args)
        await tts.stream(llm.continue_with(result))
    else:
        await tts.stream(plan.stream)
`,
  },
};
