// Qwen-VL and dynamic FPS: a sports desk in Lagos logs the goals in a two-minute match highlight. Frames are sampled at a chosen rate along the timeline; each frame becomes
// (height/28) × (width/28) tokens, with two consecutive frames merged; each token's temporal position is either its real time in seconds (as in Qwen2.5-VL) or just its frame
// number. Token counts, the frames that land on the goal and the reported time are computed live. Break it: positions by frame number at 2 frames a second (the goal is
// logged at twice its real time), 0.5 frames a second (the 1.3-second goal falls between frames), full 1280-pixel frames at 4 per second (the tokens overflow the context).
const DUR = 120, GOAL = [46.6, 47.9], CTX = 32768;
const RES = [[448, 252], [1280, 720]];

export default {
  slug: 'qwen-vl-family-dynamic-fps',
  title: 'Qwen-VL: real time in the tokens',
  description: 'A sports desk in Lagos logs the goals in a two-minute clip. Pick the frame rate and size, and see if the goal\'s time comes out right.',
  overview: 'The Qwen-VL family made resolution and time native. Qwen2-VL\'s encoder takes an image at its own size, any height and width divisible by 28, with 14-pixel patches merged 2 × 2, so a frame becomes (height ÷ 28) × (width ÷ 28) tokens, with no resizing or tiling; for video, two consecutive frames are merged too. Its multimodal rotary position embedding gives every token three positions, time, row and column, instead of one, so no position table ties it to a fixed grid. Qwen2.5-VL went further: the temporal position follows real time in seconds, not the frame number, so the model can sample sparsely through slow footage and densely through action and still answer "at 0:47" correctly, without spending tokens on time stamps. The trade is between frame rate, frame size and context: a long, high-resolution, high-frame-rate video can run into hundreds of thousands of tokens, while sampling too sparsely skips short events.',
  keywords: ['qwen-vl', 'm-rope', 'dynamic resolution', 'dynamic fps', 'video understanding', 'temporal grounding'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.2], dir: [0.05, 0.7, 1.25], half: 0.9, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { fps: 1, res: 0, abs: true };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C';
    const FPS = [0.5, 2, 4], TL = 4.4, X = t => -2.75 + t / DUR * TL, TZ = -0.2;
    // the two-minute clip as a track; the goal is the red stretch; each sampled frame stands on it, tall when full size
    const track = P.box(TL + 0.1, 0.05, 0.6, '#2B2B38', { r: 0.03 }); track.position.set(X(DUR / 2), 0, TZ); S.add(track);
    const goal = P.box(X(GOAL[1]) - X(GOAL[0]), 0.06, 0.66, '#D64545', { r: 0.01 }); goal.position.set((X(GOAL[0]) + X(GOAL[1])) / 2, 0.01, TZ); S.add(goal);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const frames = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 480); frames.frustumCulled = false; frames.userData.noFit = true; S.add(frames);
    // where the model logs the goal: a flag at the time it reports
    const flagM = new THREE.MeshLambertMaterial({ color: GOOD });
    const pole = P.cyl(0.02, 0.75, '#6B6E7E'); pole.userData.noFit = true; S.add(pole);
    const flag = P.box(0.22, 0.14, 0.03, '#fff', { r: 0.01, material: flagM }); flag.userData.noFit = true; S.add(flag);
    // the context window as a tank: the tokens pour in, and spill over past 32,768
    const tank = P.tank(0.6, 0.95, 0.6, GOOD); tank.position.set(2.3, 0.05, TZ); S.add(tank);
    S.add(P.keep(-2.85, 2.65, 1.0, -0.6, 0.25));
    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function run() {
      const fps = FPS[st.fps], [w, h] = RES[st.res], n = Math.round(DUR * fps), perFrame = Math.round(Math.floor(w / 28) * Math.floor(h / 28) / 2);
      const tokens = Math.round(n * perFrame), fits = tokens <= CTX;
      const times = Array.from({ length: n }, (_, i) => i / fps), hit = times.filter(t => t >= GOAL[0] && t <= GOAL[1]);
      const caught = hit.length > 0, idx = caught ? times.indexOf(hit[0]) : -1;
      const reported = !caught ? null : st.abs ? hit[0] : idx;
      return { fps, n, perFrame, tokens, fits, times, caught, reported, idx };
    }
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    function draw() {
      R = run();
      const hgt = st.res ? 0.45 : 0.16;
      R.times.forEach((t, i) => { const onGoal = t >= GOAL[0] && t <= GOAL[1]; m4.makeScale(Math.max(0.006, TL / R.n * 0.6), hgt, 0.4).setPosition(X(t), 0.05, TZ); frames.setMatrixAt(i, m4); frames.setColorAt(i, col.set(onGoal ? '#F2C94C' : '#1F9E89')); });
      frames.count = R.n; frames.instanceMatrix.needsUpdate = true; if (frames.instanceColor) frames.instanceColor.needsUpdate = true;
      const show = R.fits && R.caught;
      pole.visible = flag.visible = show;
      if (show) { const x = X(Math.min(DUR, R.reported)); pole.position.set(x, 0, TZ - 0.42); flag.position.set(x + 0.11, 0.62, TZ - 0.42); flagM.color.set(st.abs ? GOOD : BAD); }
      tank.userData.set({ level: R.tokens / CTX, color: R.fits ? GOOD : BAD });
    }
    draw();
    const tick = dt => tank.userData.tick(dt);
    const controls = [
      { type: 'buttons', label: 'Frames per second', options: ['0.5', '2', '4'], get: () => st.fps, act: i => { st.fps = i; draw(); } },
      { type: 'buttons', label: 'Frame size', options: ['448 × 252', '1280 × 720'], get: () => st.res, act: i => { st.res = i; draw(); } },
      { type: 'buttons', label: 'Temporal position', options: ['Real time (seconds)', 'Frame number'], get: () => (st.abs ? 0 : 1), act: i => { st.abs = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Frames', get: () => ({ v: String(R.n), sub: `${R.perFrame} tokens each after merging` }) },
      { label: 'Tokens', get: () => ({ v: R.tokens.toLocaleString('en'), sub: 'context 32,768', good: R.fits, bad: !R.fits }) },
      { label: 'Goal logged at', get: () => ({ v: !R.fits || !R.caught ? '–' : fmt(R.reported), sub: 'really 0:47', good: R.fits && R.caught && st.abs, bad: !R.fits || !R.caught || !st.abs }) },
    ];
    const labels = [
      { name: 'track', t: 'The clip, sampled', d: 'Red: the goal. Gold: frames that land on it', icon: 'wave', atV: V(X(0) - 0.05, 0.05, TZ) },
      { name: 'flag', t: 'Where the goal is logged', d: 'Teal flag: the right time. Coral: wrong', icon: 'target', atV: V(X(GOAL[1]) + 0.1, 0.03, TZ + 0.3) },
      { name: 'bar', t: 'The context window', d: 'Spills over past 32,768 tokens', icon: 'scale', atV: V(2.6, 0.5, TZ) },
    ];
    const reset = () => { Object.assign(st, { fps: 1, res: 0, abs: true }); draw(); };
    const breaks = [
      { label: 'Number frames, don\'t time them', hint: 'At 2 frames a second', on: () => { reset(); st.abs = false; draw(); }, off: reset },
      { label: '0.5 frames a second', hint: 'A short goal', on: () => { reset(); st.fps = 0; draw(); }, off: reset },
      { label: 'Full-size frames, 4 a second', hint: '1280 × 720', on: () => { reset(); st.fps = 2; st.res = 1; draw(); }, off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${R.tokens.toLocaleString('en')} tokens for a 32,768-token context.</b> At 1280 × 720 each frame is ${R.perFrame} tokens after merging, and 4 frames a second for two minutes is ${R.n} frames, so most of the clip is cut off. Keep frames smaller for video, and save high resolution for frames that need it.` };
      if (!R.caught) return { ok: false, msg: `<b>The goal falls between frames.</b> At 0.5 frames a second the samples are two seconds apart, at 0:46 and 0:48, and the goal moment lasts only about 1.3 seconds between them, so no frame shows it. Sample faster through action, and slowly through quiet stretches; real-time positions let the rate change mid-clip.` };
      if (!st.abs) return { ok: false, msg: `<b>The goal is logged at ${fmt(R.reported)}, not 0:47.</b> With positions by frame number, the first frame on the goal is frame ${R.idx}; the model, trained on real times, reads that as ${R.idx} seconds. At 2 frames a second every time comes out doubled. Qwen2.5-VL puts the real time in seconds into the temporal position, so any frame rate gives correct times.` };
      return { ok: true, msg: `<b>Goal logged at ${fmt(R.reported)}.</b> ${R.fps} frames a second at ${RES[st.res].join(' × ')} gives ${R.n} frames of ${R.perFrame} tokens, ${R.tokens.toLocaleString('en')} in all, inside the context; a frame lands on the goal, and its temporal position is its real time in seconds.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Log the goals', home: true, say: 'A sports desk in Lagos asks a model to log the goals in a two-minute match highlight.', act: m => m.set({ fps: 1, res: 0, abs: true }) },
    { t: 'Native size', home: true, say: 'Each frame keeps its own size. Fourteen-pixel patches are merged into twenty-eight-pixel tokens, and pairs of frames are merged too.', act: m => m.set({}) },
    { t: 'Real time', home: true, say: 'Every token\'s temporal position is its real time in seconds. The goal frame sits at forty-seven seconds.', act: m => m.set({}) },
    { t: 'Frame numbers', home: true, say: 'Use frame numbers instead, at two frames a second, and the goal is logged at ninety-four seconds. Every time doubles.', act: m => m.set({ abs: false }) },
    { t: 'Too sparse', home: true, say: 'At half a frame a second, the short goal falls between two samples. It is never seen.', act: m => m.set({ abs: true, fps: 0 }) },
    { t: 'Too heavy', home: true, say: 'Full-size frames, four a second, would need far more tokens than the context holds.', act: m => m.set({ fps: 2, res: 1 }) },
  ],
  check: [
    { q: 'How many tokens does a 448 × 252 image become in Qwen2-VL?', options: ['16 × 9 = 144', '448 × 252', '1'], answer: 0, why: '(width ÷ 28) × (height ÷ 28).' },
    { q: 'Why put real time in the temporal position rather than the frame number?', options: ['So times stay correct at any sampling rate', 'It uses fewer tokens', 'Frame numbers are not allowed'], answer: 0, why: 'Frame numbers change meaning with the rate.' },
    { q: 'What goes wrong when video is sampled too sparsely?', options: ['Short events fall between frames', 'The model gets slower', 'Times become doubled'], answer: 0, why: 'Sample faster through action.' },
  ],
  terms: [
    ['Dynamic resolution', 'Using each image at its own size.'],
    ['M-RoPE', 'Rotary positions with separate time, row and column parts.'],
    ['Dynamic FPS', 'Choosing how many frames a second to sample, per clip.'],
    ['Absolute time positions', 'Temporal positions in seconds, not frame numbers.'],
    ['Patch merging', 'Combining neighbouring patches into one token.'],
    ['Temporal grounding', 'Saying when in a video something happens.'],
  ],
  deeper: '<p><b>Sport and broadcast.</b> Leagues and broadcasters across Nigeria, Ghana and South Africa produce hours of footage weekly. Accurate time stamps let editors jump straight to goals and incidents; they must be right at any sampling rate.</p><p><b>Agents.</b> Qwen2.5-VL was also trained to output coordinates and tool calls as JSON, which makes it a strong base for screen-using agents.</p><p><b>About this machine.</b> Token counts, sampled times, which frames land on the goal and the reported time are computed live from the stated rules.</p>',
  code: {
    title: 'Time-stamped video positions',
    note: 'Adapted from the course\'s Qwen-VL lesson.',
    text: `
def video_positions(n_frames, fps, h_tokens, w_tokens, absolute_time=True):
    pos = []
    for f in range(0, n_frames, 2):                 # two frames merged per step
        t = f / fps if absolute_time else f         # seconds, not frame numbers
        for r in range(h_tokens):
            for c in range(w_tokens):
                pos.append((t, r, c))               # (time, row, column) for M-RoPE
    return pos

tokens_per_frame = lambda w, h: (w // 28) * (h // 28) // 2
`,
  },
};
