// Video understanding: a 16-frame film strip of a footballer on a dusty pitch in Accra. A sampler picks which frames the model sees (gold underline);
// the model is a 2D network that averages its frames, a 3D convolution that looks across time, or a spatio-temporal transformer.
// Three kinds of clip: standing up, sitting down (the same frames in reverse) and a kick (over in three frames).
// Break it: average the frames (standing up and sitting down look identical), sample only the first 4 frames (the action is missed), sample 4 frames far apart (the kick falls between them).
const NF = 16, GW = 10, GH = 12;
const CLIPS = [{ k: 'up', n: 'standing up' }, { k: 'down', n: 'sitting down' }, { k: 'kick', n: 'kicking the ball' }];
function pose(clip, f, kickAt = 11) {      // 0 = sitting, 1 = standing, 2 = kicking
  if (clip === 'kick') return f >= kickAt && f < kickAt + 3 ? 2 : 1;
  const u = Math.max(0, Math.min(1, (f - 5) / 6));
  return clip === 'up' ? u : 1 - u;
}
function figure(p, x, y) {                // tile colour key for a 10 × 12 frame (y down)
  if (y >= 11) return 'ground';
  const s = p === 2 ? 1 : p, top = Math.round(5 - 4 * s);
  const head = Math.hypot(x - 4.5, y - (top + 0.5)) < 1.2;
  const body = x >= 4 && x <= 5 && y > top + 1 && y <= top + 4;
  let legs;
  if (p === 2) legs = (x === 4 && y > top + 4 && y < 11) || (y === top + 5 + Math.max(0, x - 6) && x >= 5 && x <= 8);
  else if (s < 0.5) legs = (y === top + 5 && x >= 4 && x <= 8) || (x === 8 && y > top + 5 && y < 11);
  else legs = (x === 4 || x === 5) && y > top + 4 && y < 11;
  const ball = p === 2 ? Math.hypot(x - 9, y - (top + 5)) < 0.8 : Math.hypot(x - 8.5, y - 10) < 0.7;
  const chair = s < 0.9 && p !== 2 && x >= 2 && x <= 6 && y === top + 5 && false;
  if (head) return 'skin'; if (body) return 'shirt'; if (legs) return 'shorts'; if (ball) return 'ball'; if (chair) return 'ground';
  return 'bg';
}
const PAL = { bg: '#E9D7B0', ground: '#C49A5E', skin: '#6B3E26', shirt: '#E3A72F', shorts: '#2F3C8F', ball: '#FFFFFF' };

export default {
  slug: 'video-understanding',
  title: 'Video: when order matters',
  description: 'A clip of a market stall holds its story in time. Sample frames, stack them, and compare a 2D model that sees pictures with one that sees motion.',
  overview: 'A video is a stack of frames, and the order carries meaning: standing up is sitting down played backwards. The simplest video model runs an image network on a few frames and averages the results, which is cheap but blind to order. A 3D convolution slides its filter across time as well as space, so it sees motion. Spatio-temporal transformers let every patch of every frame attend to every other. All of them see only the frames the sampler picks, so the sampling has to cover the action: too few frames, or frames too far apart, and quick events vanish.',
  keywords: ['video understanding', 'action recognition', '3d convolution', 'frame sampling', 'temporal modeling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.1, 0.4, 1.3], half: 1.75, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { clip: 'up', model: '3d', sampler: 'uniform', K: 8 };
    const ink = '#151827';
    /* ---------- the film strip ---------- */
    const CELL = 0.058, FWd = GW * CELL, FHt = GH * CELL, GAP = 0.07, SW = 8 * FWd + 7 * GAP, ROWGAP = 0.3, SY0 = 0.12 + 0.35, SZ = -0.5;
    const strip = P.box(SW + 0.3, 2 * FHt + ROWGAP + 0.75, 0.08, '#2B2B2B', { r: 0.04 }); strip.position.set(0, 0.12, SZ); floor.add(strip);


    const fx = f => -SW / 2 + (f % 8) * (FWd + GAP), fyb = f => SY0 + (f < 8 ? FHt + ROWGAP : 0), SY = 0;
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), NF * GW * GH);
    tiles.layers.set(1); tiles.userData.noFit = true; floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let f = 0; f < NF; f++) for (let k = 0; k < GW * GH; k++) { dummy.position.set(fx(f) + (k % GW + 0.5) * CELL, fyb(f) + FHt - (Math.floor(k / GW) + 0.5) * CELL, SZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(f * GW * GH + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    const marks = [...Array(NF)].map((_, f) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(FWd, 0.045), new THREE.MeshBasicMaterial({ color: C.gold })); m.position.set(fx(f) + FWd / 2, fyb(f) - 0.05, SZ + 0.046); m.layers.set(1); m.userData.noFit = true; floor.add(m); return m; });
    const nums = [...Array(NF)].map((_, f) => {    return t; });
    const dims = [...Array(NF)].map((_, f) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(FWd, FHt), new THREE.MeshBasicMaterial({ color: '#2B2B2B', transparent: true, opacity: 0.55 })); m.position.set(fx(f) + FWd / 2, fyb(f) + FHt / 2, SZ + 0.05); m.layers.set(1); m.userData.noFit = true; floor.add(m); return m; });
    /* ---------- sampler and model ---------- */
    const samp = P.box(1.2, 0.36, 0.55, C.teal, { r: 0.06 }); samp.position.set(-1.6, 0.12, 0.85); floor.add(samp);



    const modM = new THREE.MeshLambertMaterial({ color: C.indigo }), mod = P.box(1.5, 0.42, 0.6, C.indigo, { r: 0.06, material: modM }); mod.position.set(0.35, 0.12, 0.85); floor.add(mod);



    const outB = P.box(1.1, 0.36, 0.55, C.plum, { r: 0.06 }); outB.position.set(2.2, 0.12, 0.85); floor.add(outB);



    [-0.95, 1.15].forEach(x => { const a = P.tube([V(x, 0.3, 0.85), V(x + 0.4, 0.3, 0.85)], 0.02, '#8E91A3'); a.userData.noFit = true; floor.add(a); });
    const feed = [...Array(8)].map(() => { const b = P.box(0.08, 0.06, 0.02, C.gold, { r: 0.01 }); b.userData.noFit = true; floor.add(b); return b; });
    /* ---------- the model's behaviour ---------- */
    const pickFrames = () => st.sampler === 'first' ? [...Array(st.K)].map((_, i) => i) : [...Array(st.K)].map((_, i) => Math.min(NF - 1, Math.floor((i + 0.5) * NF / st.K)));
    function classify(clip, frames, kickAt) {
      const poses = frames.map(f => pose(clip, f, kickAt));
      if (poses.some(p => p === 2)) return 'kick';
      if (st.model === '2d') { const avg = poses.reduce((a, v) => a + v, 0) / poses.length; return Math.abs(avg - 0.5) < 0.2 ? 'down' : avg > 0.5 ? 'idle' : 'idle'; }
      const d = poses[poses.length - 1] - poses[0];
      return d > 0.3 ? 'up' : d < -0.3 ? 'down' : 'idle';
    }
    let R = null;
    function evaluate() {
      const frames = pickFrames(); let ok = 0, n = 0;
      CLIPS.forEach(c => { for (let v = 0; v < 10; v++) { const kickAt = 3 + v; const got = classify(c.k, frames, kickAt); if (got === c.k) ok++; n++; } });
      const got = classify(st.clip, frames, 11);
      R = { frames, acc: ok / n, got, cost: st.K * (st.model === '2d' ? 1 : st.model === '3d' ? 2.2 : 3.5) };
    }
    function draw() {
      evaluate();
      for (let f = 0; f < NF; f++) { const p = pose(st.clip, f); for (let k = 0; k < GW * GH; k++) tiles.setColorAt(f * GW * GH + k, col.set(PAL[figure(p, k % GW, Math.floor(k / GW))])); const on = R.frames.includes(f); marks[f].visible = on; dims[f].visible = !on; }
      tiles.instanceColor.needsUpdate = true;
      const name = { up: 'standing up', down: 'sitting down', kick: 'kicking the ball', idle: 'nothing happening' }[R.got];
      outB.material.color.set(R.got === st.clip ? C.plum : C.red);
    }
    draw();
    let clock = 0;
    function update(dt) {
      clock += dt; const ph = (clock % 1.6) / 1.6;
      feed.forEach((b, i) => { const f = R.frames[i]; b.visible = f !== undefined; if (f === undefined) return; const x0 = fx(f) + FWd / 2, y0 = fyb(f) - 0.05, x1 = -1.6, y1 = 0.6, u = Math.min(1, Math.max(0, ph * 1.6 - i * 0.06)); b.position.set(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 0.25, SZ + 0.1 + (0.85 - SZ - 0.1) * u); });
    }
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'buttons', label: 'Clip on the strip', options: ['Standing up', 'Sitting down', 'Kick'], get: () => CLIPS.findIndex(c => c.k === st.clip), act: i => { st.clip = CLIPS[i].k; draw(); } },
      { type: 'buttons', label: 'Model', options: ['2D + average', '3D conv', 'Transformer'], get: () => ['2d', '3d', 'tr'].indexOf(st.model), act: i => { st.model = ['2d', '3d', 'tr'][i]; draw(); } },
      { type: 'buttons', label: 'Sampler', options: ['Spread evenly', 'First frames only'], get: () => (st.sampler === 'uniform' ? 0 : 1), act: i => { st.sampler = i ? 'first' : 'uniform'; draw(); } },
      { type: 'slider', label: 'Frames sampled', min: 2, max: 16, step: 1, get: () => st.K, set: v => { st.K = Math.round(v); draw(); } },
    ];
    const readouts = [
      { label: 'Test accuracy', get: () => ({ v: pct(R.acc), sub: '30 clips, all three actions', good: R.acc >= 0.95, bad: R.acc < 0.9 }) },
      { label: 'This clip', get: () => ({ v: R.got === st.clip ? 'right' : 'wrong', sub: { up: 'standing up', down: 'sitting down', kick: 'kick', idle: 'nothing' }[R.got], good: R.got === st.clip, bad: R.got !== st.clip }) },
      { label: 'Cost', get: () => ({ v: `${R.cost.toFixed(1)}×`, sub: 'one image pass = 1' }) },
    ];
    const labels = [
      { name: 'strip', t: 'Sixteen frames', d: 'Gold: the frames the model sees', icon: 'eye', atV: V(-SW / 2 - 0.1, SY0 + FHt + ROWGAP / 2, SZ) },
      { name: 'sampler', t: 'Frame sampler', d: 'Which frames, how far apart', icon: 'scale', atV: V(-2.2, 0.3, 0.85) },
      { name: 'model', t: 'The model', d: 'Does it see the order?', icon: 'box', atV: V(1.1, 0.35, 0.85) },
    ];
    const reset = () => { Object.assign(st, { clip: 'up', model: '3d', sampler: 'uniform', K: 8 }); draw(); };
    const breaks = [
      { label: 'Average the frames', hint: '2D network, frames averaged', on: () => { reset(); st.model = '2d'; draw(); }, off: reset },
      { label: 'Only the first 4 frames', hint: 'The clip has barely started', on: () => { reset(); st.sampler = 'first'; st.K = 4; draw(); }, off: reset },
      { label: 'Four frames, far apart', hint: 'Every fourth frame, on the kick clip', on: () => { reset(); st.K = 4; st.clip = 'kick'; draw(); }, off: reset },
    ];
    function status() {
      const kickMiss = st.clip === 'kick' && R.got !== 'kick';
      if (st.model === '2d') return { ok: false, msg: `<b>Standing up looks like sitting down.</b> The 2D network judges each frame alone and averages the answers, so the order is thrown away. Standing up and sitting down use exactly the same frames in reverse, so they average to the same thing: test accuracy ${pct(R.acc)}. A 3D convolution or a transformer sees which way the motion goes.` };
      if (st.sampler === 'first' && R.acc < 0.95) return { ok: false, msg: `<b>The action had not happened yet.</b> The first ${st.K} frames cover only the start of the clip, before most of the movement, so the clips mostly look like "nothing happening": test accuracy ${pct(R.acc)}. Spread the frames across the whole clip.` };
      if (kickMiss || R.acc < 0.95) return { ok: false, msg: `<b>The kick slipped between frames.</b> The kick lasts three frames, but ${st.K} frames spread over 16 are ${(NF / st.K).toFixed(0)} apart, so a kick can happen entirely between two sampled frames: test accuracy ${pct(R.acc)}. Fast actions need denser sampling, which costs more.` };
      return { ok: true, msg: `<b>Every action right.</b> ${st.K} frames spread across the clip catch even the three-frame kick, and the ${st.model === '3d' ? '3D convolution' : 'transformer'} sees which way the motion goes, so standing up and sitting down are told apart: test accuracy ${pct(R.acc)}, at ${R.cost.toFixed(1)} times the cost of one image.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Sixteen frames', home: true, say: 'A footballer on a dusty pitch in Accra, filmed for sixteen frames. Is he standing up, sitting down, or kicking the ball?', act: m => m.set({ clip: 'up', model: '3d', sampler: 'uniform', K: 8 }) },
    { t: 'Order matters', home: true, say: 'Sitting down is standing up played backwards: the very same frames in the opposite order.', act: m => m.set({ clip: 'down' }) },
    { t: 'Averaging forgets order', home: true, say: 'The simplest video model judges each frame alone and averages. Order is lost, so standing up and sitting down become the same answer.', act: m => m.set({ model: '2d', clip: 'up' }) },
    { t: 'Looking across time', home: true, say: 'A 3D convolution slides its filters across time as well as space, so it sees which way the motion goes.', act: m => m.set({ model: '3d' }) },
    { t: 'Choosing frames', home: true, say: 'The model only sees the frames the sampler picks. Take the first four, and nothing has happened yet.', act: m => m.set({ sampler: 'first', K: 4 }) },
    { t: 'Fast actions', home: true, say: 'Spread four frames out, and a kick that lasts three frames can fall right between them. Quick actions need more frames.', act: m => m.set({ sampler: 'uniform', K: 4, clip: 'kick' }) },
  ],
  check: [
    { q: 'Why can\'t a 2D network that averages frames tell standing up from sitting down?', options: ['Averaging throws away the order of the frames', 'It has too few layers', 'It only sees colour'], answer: 0, why: 'The two clips have the same frames in reverse.' },
    { q: 'What does a 3D convolution add?', options: ['Its filters slide across time as well as space, so it sees motion', 'More colour channels', 'A bigger image'], answer: 0, why: 'It looks at several frames at once.' },
    { q: 'Why might sparse sampling miss a kick?', options: ['A short action can happen entirely between two sampled frames', 'The ball is too small', 'Kicks are always at the start'], answer: 0, why: 'Frames far apart leave gaps.' },
  ],
  terms: [
    ['Action recognition', 'Labelling what happens in a video clip.'],
    ['Frame sampling', 'Choosing which frames of a clip the model sees.'],
    ['2D + pooling', 'Running an image network per frame and averaging the results.'],
    ['3D convolution', 'A filter that spans time as well as height and width.'],
    ['Space-time transformer', 'Attention across patches of every frame.'],
    ['Temporal stride', 'How many frames apart the sampled frames are.'],
  ],
  deeper: '<p><b>Factorised convolutions.</b> (2+1)D networks split a 3D filter into a 2D spatial filter and a 1D temporal one, which is cheaper and often just as accurate.</p><p><b>Two speeds.</b> SlowFast networks run one path on a few frames for detail and another on many frames, cheaply, for fast motion.</p><p><b>About this machine.</b> The frames are drawn, and each model\'s behaviour (blind to order, or seeing the direction of motion) is applied exactly; real networks learn these from data.</p>',
  code: {
    title: 'Sampling frames and a (2+1)D block',
    note: 'Adapted from the course\'s video understanding lesson.',
    text: `
import torch.nn as nn

def sample_uniform(num_frames, k):
    step = num_frames / k
    return [int((i + 0.5) * step) for i in range(k)]   # spread across the clip

class Conv2Plus1D(nn.Sequential):
    def __init__(self, c_in, c_out, mid=64):
        super().__init__(
            nn.Conv3d(c_in, mid, kernel_size=(1, 3, 3), padding=(0, 1, 1)),  # space
            nn.ReLU(),
            nn.Conv3d(mid, c_out, kernel_size=(3, 1, 1), padding=(1, 0, 0)), # time
        )

# input shape: batch x channels x frames x height x width
`,
  },
};
