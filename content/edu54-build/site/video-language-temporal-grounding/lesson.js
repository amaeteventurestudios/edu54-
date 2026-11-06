// Video temporal grounding: a conservancy near Etosha runs a five-minute camera-trap clip of a waterhole through a video model and asks when the lion charges. Frames are
// sampled (16 evenly, one per second, or dynamic 1–4 per second where motion is high), pooled to a number of tokens per frame, and given positions by timestamp or by frame
// number. Token counts are exact for the choices; the context is 128k tokens. The clip, its motion and the answers are scripted.
// Break it: 16 frames miss a 1.6-second event, 576 tokens per frame overflow the context, frame numbers instead of timestamps with uneven sampling.
const DUR = 300, EV = [247.4, 249.0], CTX = 128000;
const HERDS = [[60, 70], [EV[0] - 1, EV[1] + 1]]; /* zebra herd runs, then the lion charges */
const moving = t => HERDS.some(([a, b]) => t >= a && t < b);
function frames(mode) {
  if (mode === 0) return Array.from({ length: 16 }, (_, i) => i * DUR / 16);
  const out = []; for (let t = 0; t < DUR; t += moving(t) && mode === 2 ? 0.25 : 1) out.push(+t.toFixed(2)); return out;
}
function run(st) {
  const f = frames(st.mode), per = [576, 64, 16][st.pool], tok = f.length * per, fit = Math.min(f.length, Math.floor(CTX / per));
  const seen = f.slice(0, fit), cut = fit < f.length ? seen[seen.length - 1] : null;
  const hit = seen.find(t => t >= EV[0] && t <= EV[1]);
  let said = null;
  if (hit != null) { const k = f.indexOf(hit); said = st.byIndex ? k * (st.mode === 0 ? DUR / 16 : 1) : hit; }
  const err = said == null ? null : Math.abs(said - EV[0]);
  return { f, per, tok, cut, said, err, coarse: per === 16 };
}

export default {
  slug: 'video-language-temporal-grounding',
  title: 'Video: when did it happen?',
  description: 'A conservancy near Etosha asks a video model when the lion charges in a five-minute clip. Choose how frames are sampled and how many tokens each one keeps.',
  overview: 'A video model sees a clip as a series of sampled frames, each turned into patch tokens. Three choices decide whether it can say when something happened. Sampling: a few evenly spaced frames are cheap but can step right over a brief event; one frame per second is safer; dynamic sampling adds frames where motion is high. Pooling: a frame at full detail is hundreds of tokens, so at one frame per second a five-minute clip can exceed a 128-thousand-token context and the end is cut off; pooling each frame down to 64 tokens fits easily, while 16 tokens can blur who is doing what. Positions: Qwen2.5-VL ties the time axis of its rotary positions to real timestamps, so a frame carries "at 247.4 seconds" rather than "frame 300", which stays right when sampling is uneven. Answers come out as structured text with an event, a start and an end. Benchmarks such as TempCompass test before and after, and EgoSchema tests long first-person clips.',
  keywords: ['video language model', 'temporal grounding', 'dynamic fps', 'm-rope', 'frame sampling', 'token pooling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { mode: 2, pool: 1, byIndex: false };
    const ink = '#151827', X0 = -2.6, W = 5.2, tx = t => X0 + t / DUR * W;
    /* the clip: a strip with the motion curve, the event and a time ruler */
    const strip = P.box(W + 0.1, 0.05, 0.7, '#2F3A2C', { r: 0.03 }); strip.position.set(0, 0.12, 0.1); floor.add(strip);

    HERDS.forEach(([a, b], i) => { const w = Math.max(0.05, (b - a) / DUR * W), z = P.box(w, 0.07, 0.7, i ? '#E07B39' : '#C9A227', { r: 0.005 }); z.position.set(tx((a + b) / 2), 0.13, 0.1); floor.add(z);
         });
    [0, 60, 120, 180, 240, 300].forEach(s => { const k = P.box(0.015, 0.03, 0.08, ink); k.position.set(tx(s), 0.12, 0.52); floor.add(k);
         });
    /* sampled frames as posts on the strip */
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const MAX = 400, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAX); im.frustumCulled = false; im.userData.noFit = true; floor.add(im);
    const cutB = P.box(0.03, 0.4, 0.9, '#C62828'); cutB.userData.noFit = true; floor.add(cutB);

    const pin = P.cyl(0.07, 0.16, '#3A6FB0', { r2: 0 }); pin.rotation.x = Math.PI; pin.userData.noFit = true; floor.add(pin);

    /* the context bar at the back */
    const ctxBox = P.box(3.0, 0.05, 0.28, '#D9D2C3', { r: 0.02 }); ctxBox.position.set(-1.1, 0.12, -1.0); floor.add(ctxBox);
    const ctxFill = P.box(1, 0.08, 0.24, '#1F9E89', { r: 0.01 }); ctxFill.position.set(-1.1, 0.12, -1.0); floor.add(ctxFill);
    const over = P.box(1, 0.08, 0.24, '#C62828', { r: 0.01 }); over.userData.noFit = true; floor.add(over);

    /* the answer card at the front */



    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function draw() {
      R = run(st);
      for (let i = 0; i < MAX; i++) { const t = R.f[i]; if (t == null) { m4.makeScale(0.0001, 0.0001, 0.0001); im.setMatrixAt(i, m4); continue; }
        const lost = R.cut != null && t > R.cut, h = 0.04 + Math.min(0.1, R.per / 5000);
        m4.makeScale(st.mode === 0 ? 0.05 : 0.009, h, 0.5).setPosition(tx(t), 0.15, 0.1); im.setMatrixAt(i, m4);
        im.setColorAt(i, col.set(lost ? '#7A7A86' : t >= EV[0] && t <= EV[1] ? '#FFB703' : '#F4F1EA')); }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      cutB.visible = R.cut != null;
      if (R.cut != null) { cutB.position.set(tx(R.cut) + 0.02, 0.12, 0.1);  }
      pin.visible = R.said != null;
      if (R.said != null) { const x = tx(Math.min(DUR - 1, R.said)); pin.position.set(x, 0.4, 0.1);   }
      const fr = Math.min(R.tok, CTX) / CTX * 3.0; ctxFill.scale.x = Math.max(0.01, fr); ctxFill.position.x = -2.6 + fr / 2;
      over.visible = R.tok > CTX; if (R.tok > CTX) { const ow = Math.min(1.2, (R.tok - CTX) / CTX * 3.0); over.scale.x = ow; over.position.set(0.4 + ow / 2, 0.12, -1.0); }
      const txt = R.said == null ? (R.cut != null ? '{"event": null}  the clip was cut at ' + Math.round(R.cut) + ' s' : '{"event": null}  no frame landed on the charge')
        : R.coarse ? `{"event": "an animal moves", "start": ${R.said.toFixed(1)}}` : `{"event": "lion charges", "start": ${R.said.toFixed(1)}, "end": ${(R.said + 1.6).toFixed(1)}}`;

    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Sampling', options: ['16 frames', '1 per second', 'Dynamic 1–4'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'buttons', label: 'Tokens per frame', options: ['576', '64', '16'], get: () => st.pool, act: i => { st.pool = i; draw(); } },
      { type: 'buttons', label: 'Positions', options: ['Timestamps', 'Frame numbers'], get: () => (st.byIndex ? 1 : 0), act: i => { st.byIndex = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: `${Math.round(R.tok / 1000)}k`, sub: 'of a 128k context', good: R.tok <= CTX, bad: R.tok > CTX }) },
      { label: 'Answer', get: () => ({ v: R.said == null ? 'None' : `${R.said.toFixed(1)} s`, sub: 'charge starts at 247.4 s', good: R.err != null && R.err <= 1, bad: R.err == null || R.err > 2 }) },
      { label: 'Frames', get: () => ({ v: String(R.f.length), sub: st.mode === 2 ? 'denser where things move' : 'evenly spaced' }) },
    ];
    const labels = [
      { name: 'frames', t: 'Sampled frames', d: 'Gold: a frame on the charge', icon: 'eye', atV: V(X0 - 0.05, 0.2, 0.1) },
      { name: 'ctx', t: 'Context', d: 'Frames × tokens per frame', icon: 'box', atV: V(-2.6, 0.17, -1.0) },
    ];
    const reset = () => { Object.assign(st, { mode: 2, pool: 1, byIndex: false }); draw(); };
    const breaks = [
      { label: 'Only 16 frames', hint: 'One every 19 seconds', on: () => { reset(); st.mode = 0; draw(); }, off: reset },
      { label: 'Full-detail frames', hint: '576 tokens each, 1 per second', on: () => { reset(); st.mode = 1; st.pool = 0; draw(); }, off: reset },
      { label: 'Count frames, not seconds', hint: 'Frame numbers with uneven sampling', on: () => { reset(); st.byIndex = true; draw(); }, off: reset },
    ];
    function status() {
      if (R.cut != null && R.said == null) return { ok: false, msg: `<b>The clip was cut at ${Math.round(R.cut)} seconds.</b> ${R.f.length} frames at ${R.per} tokens each is ${R.tok.toLocaleString('en')} tokens, more than the 128,000 context, so everything after the cut is dropped, including the charge at 247 seconds. Pool each frame to 64 tokens or sample fewer frames.` };
      if (R.said == null) return { ok: false, msg: `<b>It never saw the charge.</b> Sixteen evenly spaced frames are one every ${(DUR / 16).toFixed(1)} seconds, and the charge lasts 1.6 seconds, so no frame lands on it. Sample at least once a second, or add frames where motion is high.` };
      if (R.err > 2) return { ok: false, msg: `<b>It says ${R.said.toFixed(1)} s; the charge was at 247.4 s.</b> Dynamic sampling added extra frames during the zebra run, so frame numbers no longer match seconds: reading frame ${R.f.indexOf(R.f.find(t => t >= EV[0]))} as ${R.said.toFixed(0)} seconds is ${R.err.toFixed(0)} seconds off. Tie positions to real timestamps.` };
      if (R.coarse) return { ok: true, msg: `<b>Right time, vague event.</b> At 16 tokens per frame the model finds the moment (${R.said.toFixed(1)} s) but blurs who moved. 64 tokens per frame keeps enough detail at ${Math.round(R.tok / 1000)}k tokens.` };
      return { ok: true, msg: `<b>Lion charges at ${R.said.toFixed(1)} s.</b> ${R.f.length} frames at ${R.per} tokens fit in ${Math.round(R.tok / 1000)}k tokens, a frame lands inside the 1.6-second charge, and timestamp positions give its real time.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The question', home: true, say: 'A conservancy near Etosha has five minutes of camera-trap video from a waterhole and asks: when does the lion charge?', act: m => m.set({ mode: 2, pool: 1, byIndex: false }) },
    { t: 'Sample frames', home: true, say: 'The model sees sampled frames. Dynamic sampling takes one a second, and four a second where things move.', act: m => m.set({}) },
    { t: 'Clock positions', home: true, say: 'Each frame\'s position follows the real clock, so the answer comes out in seconds, as structured text.', act: m => m.set({}) },
    { t: 'Too few frames', home: true, say: 'Take just sixteen evenly spaced frames, and none lands on a charge that lasts under two seconds.', act: m => m.set({ mode: 0 }) },
    { t: 'Too many tokens', home: true, say: 'Keep every frame at full detail, and the clip overflows the context before the charge.', act: m => m.set({ mode: 1, pool: 0 }) },
    { t: 'Frames are not seconds', home: true, say: 'Count frames instead of seconds while sampling unevenly, and the answer is half a minute off.', act: m => m.set({ mode: 2, pool: 1, byIndex: true }) },
  ],
  check: [
    { q: 'Why can sixteen evenly spaced frames miss an event?', options: ['A short event can fall between frames', 'The frames are too detailed', 'The context overflows'], answer: 0, why: 'One frame every 19 seconds steps over it.' },
    { q: 'What does pooling each frame to fewer tokens buy?', options: ['More frames fit in the context', 'Sharper detail', 'Exact timestamps'], answer: 0, why: '64 tokens per frame instead of 576.' },
    { q: 'Why tie positions to timestamps rather than frame numbers?', options: ['Uneven sampling breaks the link between frame number and time', 'It uses fewer tokens', 'It sharpens frames'], answer: 0, why: 'Dynamic sampling adds frames unevenly.' },
  ],
  terms: [
    ['Temporal grounding', 'Saying when in a video something happens.'],
    ['Dynamic sampling', 'Taking more frames where motion is high.'],
    ['Token pooling', 'Merging a frame\'s patch tokens into fewer.'],
    ['Time-aligned positions', 'Rotary positions that follow real timestamps.'],
    ['Context window', 'The most tokens the model can read at once.'],
    ['Structured answer', 'An event with a start and end, in a fixed format.'],
  ],
  deeper: '<p><b>Wildlife and safety footage.</b> Conservancies in Namibia, Kenya and Botswana collect far more camera-trap video than people can watch. A model that answers "when" with a timestamp lets rangers jump to the moment, but a person should confirm before acting on it.</p><p><b>Long video.</b> The next lesson stretches this to hours of footage with million-token contexts and memory.</p><p><b>About this machine.</b> Token counts are exact for the choices; the clip, its motion and the answers are scripted.</p>',
  code: {
    title: 'Sample, pool, budget',
    note: 'Adapted from the course\'s video-language lesson.',
    text: `
def sample_times(duration, motion, base_fps=1, max_fps=4):
    t, out = 0.0, []
    while t < duration:
        out.append(t)
        t += 1 / (max_fps if motion(t) else base_fps)
    return out

def token_budget(times, tokens_per_frame=64, context=128_000):
    total = len(times) * tokens_per_frame
    return total, total <= context
`,
  },
};
