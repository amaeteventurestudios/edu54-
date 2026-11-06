// Capstone: a video understanding pipeline (phase 19, capstone 12). A Nairobi broadcaster's archive: one hundred hours. A film strip runs through scene cuts, speech, keyframes and an index; a question returns a timestamp. Cost scales with frames sent to a vision model.
// Fixed-rate sampling misses short scenes and pays for long ones. Scene detection samples by change. Speech alone misses what is only shown. Counts come from a list of scenes.
const SC = [12, 3, 40, 2, 25, 4, 60, 5, 18, 2, 30, 6];   // scene lengths in seconds (a repeating sample of the archive)
const Q = [{ s: 3, a: 'seen' }, { s: 1, a: 'seen' }, { s: 6, a: 'said' }, { s: 9, a: 'seen' }, { s: 2, a: 'said' }, { s: 7, a: 'seen' }];
function run(o) {
  const frames = o.mode === 'fixed' ? SC.reduce((a, l) => a + Math.floor(l / o.every), 0) : SC.length;
  const seen = SC.map(l => o.mode === 'scene' || l >= o.every);
  const hit = Q.filter(q => (q.a === 'said' ? o.asr : o.vision && seen[q.s])).length;
  const hours = 100, cost = frames / SC.reduce((a, b) => a + b, 0) * 3600 * hours * 0.002 + (o.asr ? 20 : 0);
  return { frames, seen, hit, cost, stamps: o.stamp };
}

export default {
  slug: 'video-understanding-pipeline',
  title: 'Capstone: searching a hundred hours of video',
  description: 'A broadcaster\'s archive, as a film strip. Cut by scene, listen, look, index, and answer with a timestamp.',
  overview: 'A model can watch a two-hour video. Asking questions of a hundred hours needs a pipeline. Detect scene changes so each shot is one unit. Transcribe the speech. Send a keyframe per scene to a vision model. Index all of it, and answer with a timestamp a person can jump to. Each choice has a price. Sampling at a fixed rate misses short scenes and overspends on long ones. Speech alone misses what is only shown. Vision alone misses what is only said. This capstone runs a broadcaster\'s archive in Nairobi as a film strip, with six questions that show what each part adds and what it costs.',
  keywords: ['video understanding', 'scene detection', 'keyframes', 'video search', 'transcription', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { mode: 'scene', every: 5, asr: true, vision: true, stamp: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const total = SC.reduce((a, b) => a + b, 0), W = 4.3; let at = -2.15;
    const Cells = SC.map((l, i) => { const w = Math.max(0.1, l / total * W), m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(w - 0.03, 0.36, 0.5, '#fff', { r: 0.01, material: m }); b.position.set(at + w / 2, 0.03, -0.3); S.add(b); at += w; return m; });
    const strip = P.box(4.4, 0.03, 0.66, '#2C2D31', { r: 0.01 }); strip.position.set(0, 0.02, -0.3); S.add(strip);
    const QT = Q.map((q, i) => { const t = add(P.tower(0.32, 0.34, GOOD)); t.position.set(-0.4 + i * 0.42, 0.03, 0.42); t.userData.set({ cap: '', h: 0.4 }); return t; });
    const ear = add(P.lamp('#3E9B5F', { h: 0.34, r: 0.1 })); ear.position.set(-2.0, 0.03, 0.42);
    const eye = add(P.lamp('#3E9B5F', { h: 0.34, r: 0.1 })); eye.position.set(-1.45, 0.03, 0.42);
    const head = P.box(0.06, 0.5, 0.7, SAF, { r: 0.01 }); head.userData.noFit = true; S.add(head);
    S.add(P.keep(-2.45, 2.45, 0.8, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      Cells.forEach((m, i) => m.color.set(R.seen[i] && st.vision ? '#6FC7B5' : GREY));
      QT.forEach((t, i) => { const q = Q[i], ok = q.a === 'said' ? st.asr : st.vision && R.seen[q.s]; t.userData.set({ color: ok ? GOOD : BAD, h: ok ? 0.5 : 0.1 }); });
      ear.userData.set({ color: st.asr ? '#3E9B5F' : '#C9C4B6', on: st.asr }); eye.userData.set({ color: st.vision ? '#3E9B5F' : '#C9C4B6', on: st.vision });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['fixed', 'scene'];
    const controls = [
      { type: 'buttons', label: 'Sample frames', options: ['At a fixed rate', 'One per scene'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'slider', label: 'Fixed rate: a frame every', min: 1, max: 30, step: 1, get: () => st.every, set: v => set({ every: v }), fmt: v => `${v} s` },
      { type: 'toggle', label: 'Transcribe the speech', short: 'Speech', get: () => st.asr, set: v => set({ asr: !!v }) },
      { type: 'toggle', label: 'Send keyframes to vision', short: 'Vision', get: () => st.vision, set: v => set({ vision: !!v }) },
      { type: 'toggle', label: 'Answers carry a timestamp', short: 'Timestamps', get: () => st.stamp, set: v => set({ stamp: !!v }) },
    ];
    const readouts = [
      { label: 'Questions answered', get: () => ({ v: `${R.hit} of ${Q.length}`, sub: 'teal towers', good: R.hit === Q.length, bad: R.hit < 4 }) },
      { label: 'Cost for 100 hours', get: () => ({ v: M(R.cost), sub: `${R.frames} frames in this sample` }) },
      { label: 'Jump to the moment', get: () => ({ v: st.stamp ? 'yes' : 'no', sub: 'a timestamp to check', good: st.stamp, bad: !st.stamp }) },
    ];
    const labels = [
      { name: 'f', t: 'A film strip', d: 'Width: scene length. Teal: seen', icon: 'eye', atV: V(-2.28, 0.2, -0.3) },
      { name: 'q', t: 'Six questions', d: 'Coral: can\'t answer', icon: 'target', atV: V(1.9, 0.2, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A frame every 30 seconds', hint: 'short scenes vanish', on: () => set({ ...D0, mode: 'fixed', every: 30 }), off: reset },
      { label: 'A frame every second', hint: 'long scenes, huge bill', on: () => set({ ...D0, mode: 'fixed', every: 1 }), off: reset },
      { label: 'Transcript only', hint: 'what is shown, unsaid', on: () => set({ ...D0, vision: false }), off: reset },
      { label: 'No timestamps', hint: 'nobody can check', on: () => set({ ...D0, stamp: false }), off: reset },
    ];
    function status() {
      if (!st.stamp) return { ok: false, msg: `<b>${R.hit} of ${Q.length} answered, with nothing to check them against.</b> A timestamp lets an editor jump to the moment.` };
      if (!st.vision) return { ok: false, msg: `<b>${R.hit} of ${Q.length}: only what was said.</b> A logo, a place, a face on screen is never spoken. Half the meaning is in the picture.` };
      if (!st.asr) return { ok: false, msg: `<b>${R.hit} of ${Q.length}: what was said is gone.</b> Interviews are mostly speech, and speech is the cheapest signal you have.` };
      if (st.mode === 'fixed' && R.hit < Q.length) return { ok: false, msg: `<b>${R.hit} of ${Q.length}: a frame every ${st.every} seconds skips short scenes.</b> Fixed sampling is blind to how the video is cut.` };
      if (st.mode === 'fixed') return { ok: false, msg: `<b>All answered, for ${M(R.cost)}.</b> Most frames show nothing new. Scene detection gets this for far less.` };
      return { ok: true, msg: `<b>${R.hit} of ${Q.length} answered, for ${M(R.cost)}, each with a timestamp.</b> One frame per scene matches how the video was made.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.15) % 1; head.position.set(-2.15 + 4.3 * u, 0.03, -0.3); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A hundred hours', home: true, say: 'A broadcaster in Nairobi wants to search its archive. Each block on the strip is one scene, wide or narrow.', act: m => m.set({ mode: 'fixed', every: 30, asr: false, vision: true, stamp: true }) },
    { t: 'Fixed sampling', home: true, say: 'A frame every thirty seconds skips the short scenes. One a second costs a fortune.', act: m => m.set({ mode: 'fixed', every: 30, asr: true, vision: true, stamp: true }) },
    { t: 'Cut by scene', home: true, say: 'Detect scene changes, and take one frame per scene. Nothing is missed, and far less is spent.', act: m => m.set({ mode: 'scene', every: 5, asr: false, vision: true, stamp: true }) },
    { t: 'Listen too', home: true, say: 'Speech is cheap, and full of meaning. Transcribe it, and index it beside the frames.', act: m => m.set({ mode: 'scene', every: 5, asr: true, vision: true, stamp: true }) },
    { t: 'Look too', home: true, say: 'A transcript alone can\'t see a logo or a place. You need both.', act: m => m.set({ mode: 'scene', every: 5, asr: true, vision: false, stamp: true }) },
    { t: 'Jump to it', home: true, say: 'Every answer carries a timestamp, so an editor can go straight there.', act: m => m.set({ mode: 'scene', every: 5, asr: true, vision: true, stamp: true }) },
  ],
  check: [
    { q: 'What does fixed-rate sampling miss?', options: ['Short scenes', 'Long scenes', 'Audio'], answer: 0, why: 'It ignores how the video is cut.', hint: 'Try A frame every 30 seconds.' },
    { q: 'Why use speech as well as vision?', options: ['Each holds what the other lacks', 'Speech is required', 'Vision needs it'], answer: 0, why: 'Some things are only said, others only shown.', hint: 'Try Transcript only.' },
    { q: 'What does a timestamp give?', options: ['A way to check the answer', 'Better accuracy', 'Lower cost'], answer: 0, why: 'A person can jump to the moment.', hint: 'Try No timestamps.' },
  ],
  terms: [['Scene detection', 'Finding where shots change.'], ['Keyframe', 'A frame standing for a scene.'], ['Transcription', 'Turning speech into text.'], ['Video index', 'A search index over scenes.'], ['Timestamp', 'A point in the video.']],
  deeper: '<p><b>Two passes.</b> Search the cheap index first, then send a few scenes to a strong video model for detail.</p><p><b>Languages.</b> Check transcription on the languages your archive really uses.</p><p><b>Costs</b> are round figures, scaled from a sample of scenes.</p>',
  code: {
    title: 'Index a scene',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
for scene in detect_scenes(video):
    frame = keyframe(scene)
    text = transcribe(scene.audio)
    index.add(scene.start, embed(describe(frame)), embed(text))

def ask(question):
    hit = index.search(question, k=1)[0]
    return answer(question, hit), hit.start      # with a timestamp
`,
  },
};
