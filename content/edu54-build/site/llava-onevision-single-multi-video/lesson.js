// LLaVA-OneVision: a road-safety team in Nairobi uses one model for a dashcam photo of a junction's signs, four camera views of the same junction, and a 30-second clip.
// Each kind gets a different shape of input within a similar token budget: up to 9 tiles plus a base view for one image, 729 tokens per image for several images, and
// pooled frames for video. The bar shows tokens against the budget; token counts are computed live; the scores and answers follow the paper's reported patterns.
// Break it: video frames without pooling (32 frames overflow the budget), only 4 frames of a 30-second clip (the red-light runner falls between frames),
// training on video first instead of single images first (perception never gets strong).
const PER = 729, BUDGET = 9000;
const KINDS = ['One photo', 'Four views', 'A 30 s clip'];

export default {
  slug: 'llava-onevision-single-multi-video',
  title: 'OneVision: one model, three shapes',
  description: 'A road-safety team in Nairobi uses one model for a dashcam photo, four camera views of a junction and a 30-second clip. Each input gets a different shape within a similar token budget, and training goes single images first. Then feed video without pooling, sample only four frames, or train on video first.',
  overview: 'LLaVA-OneVision handles single images, several images and video with one model by giving each a different shape inside a similar budget of visual tokens. A single image is tiled at high resolution, up to nine 384-pixel tiles plus a base view, 729 SigLIP tokens each, for fine detail like signs and small print. Several images get one view each, 729 tokens, so the model can compare them. Video frames are pooled 2 × 2 on the patch grid down to 196 tokens each, so 32 frames fit in about 6,300 tokens; without pooling they would overflow. Training is a curriculum: single images first to build sharp perception, then a mix of all three to learn which image is which and what happened when, then task-specific tuning. Training video-first gives a model that follows temporal patterns but sees poorly. Abilities that were never trained directly, such as reasoning across several camera views, emerge from the combination. Frame sampling still matters: an event between sampled frames is invisible.',
  keywords: ['llava-onevision', 'multi-image', 'video understanding', 'token budget', 'pooling', 'curriculum'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0.1], dir: [0.05, 0.75, 1.3], half: 1.55, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { kind: 2, pool: 1, frames: 32, curr: 0 };
    const ink = '#151827';
    const base = P.box(6.4, 0.12, 2.8, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const tray = (x, name) => { const t = P.box(1.8, 0.05, 1.3, '#D9D1C0', { r: 0.03 }); t.position.set(x, 0.12, -0.3); S.add(t);
      const n = S.text(name, { size: 0.11, weight: 800, color: ink }); n.position.set(x, 0.13, 0.55); S.add(n); return t; };
    const trays = [tray(-2.1, KINDS[0]), tray(0, KINDS[1]), tray(2.1, KINDS[2])];
    const tiles = []; for (let i = 0; i < 9; i++) { const b = P.box(0.42, 0.06, 0.32, '#3B3F8F', { r: 0.02 }); b.position.set(-2.55 + (i % 3) * 0.45, 0.19, -0.7 + Math.floor(i / 3) * 0.35); S.add(b); tiles.push(b); }
    const views = [0, 1, 2, 3].map(i => { const b = P.box(0.7, 0.06, 0.5, '#1F9E89', { r: 0.03 }); b.position.set(-0.38 + (i % 2) * 0.76, 0.19, -0.6 + Math.floor(i / 2) * 0.58); S.add(b); return b; });
    const frames = Array.from({ length: 32 }, (_, i) => { const b = P.box(0.18, 0.06, 0.14, C.plum, { r: 0.01 }); b.position.set(1.4 + (i % 8) * 0.2, 0.19, -0.75 + Math.floor(i / 8) * 0.22); b.userData.noFit = true; S.add(b); return b; });
    const event = P.box(0.18, 0.08, 0.14, '#D64545', { r: 0.01 }); event.userData.noFit = true; S.add(event);
    /* budget bar */
    const bar = P.box(5.6, 0.05, 0.28, '#2B2B38', { r: 0.02 }); bar.position.set(0, 0.12, 1.05); S.add(bar);
    const fill = P.box(1, 0.08, 0.24, '#1F9E89', { r: 0.02 }); fill.userData.noFit = true; S.add(fill);
    const bud = P.box(0.03, 0.3, 0.36, '#D64545', { r: 0.01 }); bud.position.set(-2.8 + 5.6 * 0.62, 0.12, 1.05); S.add(bud);
    const budT = S.text('budget', { size: 0.08, weight: 800, color: '#D64545' }); budT.position.set(-2.8 + 5.6 * 0.62, 0.13, 1.3); S.add(budT);
    const fT = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); fT.userData.noFit = true; S.add(fT);
    const ans = P.box(2.6, 0.4, 0.06, '#FBF8F1', { r: 0.03 }); ans.position.set(0, 0.12, -1.2); S.add(ans);
    const aT = S.text('', { size: 0.085, weight: 800, face: 'front', color: ink, maxW: 2.5, maxH: 0.34 }); aT.position.set(0, 0.32, -1.165); S.add(aT);

    let R = null;
    function run() {
      const perFrame = [PER, 196, 81][st.pool];
      const tokens = st.kind === 0 ? PER * 10 : st.kind === 1 ? PER * 4 : perFrame * st.frames;
      const fits = tokens <= BUDGET;
      const perception = st.curr === 0 ? 78 : 66, temporal = st.curr === 0 ? 70 : 72;
      const caught = st.frames >= 16;
      let out;
      if (!fits) out = '(input too long: the last frames are cut off)';
      else if (st.kind === 0) out = st.curr === 0 ? 'Speed limit 50; no right turn; school zone ahead.' : 'There are some road signs.';
      else if (st.kind === 1) out = 'A matatu blocks the left lane in views 2 and 3, causing the queue in view 4.';
      else out = caught ? 'At 0:18 a motorbike crosses on red from the right.' : 'Traffic flows normally through the junction.';
      const right = fits && !(st.kind === 0 && st.curr !== 0) && !(st.kind === 2 && !caught);
      return { perFrame, tokens, fits, perception, temporal, caught, out, right };
    }
    function draw() {
      R = run();
      trays.forEach((t, k) => t.material.color.set(k === st.kind ? '#F2E3B5' : '#D9D1C0'));
      const step = 32 / st.frames;
      frames.forEach((f, i) => { f.visible = i % step === 0; f.scale.set(st.pool === 0 ? 1 : st.pool === 1 ? 0.75 : 0.55, 1, 1); });
      const evIdx = Math.round(18 / 30 * 32);
      event.visible = st.kind === 2; event.position.set(1.4 + (evIdx % 8) * 0.2, 0.25, -0.75 + Math.floor(evIdx / 8) * 0.22); event.material.color.set(R.caught ? '#D64545' : '#E8C7C7');
      const w = Math.min(5.6, R.tokens / BUDGET * 5.6 * 0.62); fill.scale.x = Math.max(0.05, w); fill.position.set(-2.8 + w / 2, 0.14, 1.05); fill.material.color.set(R.fits ? '#1F9E89' : '#D64545');
      fT.userData.set(`${R.tokens.toLocaleString('en')} tokens`); fT.position.set(-2.8 + w, 0.45, 1.05);
      aT.userData.set(`→ ${R.out}`, R.right ? '#151827' : '#8A1F1F');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Input', options: KINDS, get: () => st.kind, act: i => { st.kind = i; draw(); } },
      { type: 'buttons', label: 'Video frame pooling', options: ['None (729)', '2 × 2 (196)', '3 × 3 (81)'], get: () => st.pool, act: i => { st.pool = i; draw(); } },
      { type: 'buttons', label: 'Frames sampled', options: ['4', '16', '32'], get: () => [4, 16, 32].indexOf(st.frames), act: i => { st.frames = [4, 16, 32][i]; draw(); } },
      { type: 'buttons', label: 'Training order', options: ['Single images first', 'Video first'], get: () => st.curr, act: i => { st.curr = i; draw(); } },
    ];
    const readouts = [
      { label: 'Visual tokens', get: () => ({ v: R.tokens.toLocaleString('en'), sub: `budget about ${BUDGET.toLocaleString('en')}`, good: R.fits, bad: !R.fits }) },
      { label: 'Perception', get: () => ({ v: String(R.perception), sub: 'fine detail, illustrative', good: R.perception >= 75, bad: R.perception < 70 }) },
      { label: 'Event caught', get: () => ({ v: st.kind !== 2 ? '–' : R.caught ? 'yes' : 'missed', sub: 'red light at 0:18', good: st.kind === 2 && R.caught, bad: st.kind === 2 && !R.caught }) },
    ];
    const labels = [
      { name: 'trays', t: 'Three input shapes', d: 'Tiles, views, frames', icon: 'eye', atV: V(-3.05, 0.2, -0.3) },
      { name: 'bar', t: 'Token budget', d: 'Red line: the limit', icon: 'scale', atV: V(2.85, 0.15, 1.05) },
    ];
    const reset = () => { Object.assign(st, { kind: 2, pool: 1, frames: 32, curr: 0 }); draw(); };
    const breaks = [
      { label: 'Video without pooling', hint: '729 tokens a frame', on: () => { reset(); st.pool = 0; draw(); }, off: reset },
      { label: 'Only 4 frames', hint: 'A 30-second clip', on: () => { reset(); st.frames = 4; draw(); }, off: reset },
      { label: 'Train on video first', hint: 'Then ask about the photo', on: () => { reset(); st.curr = 1; st.kind = 0; draw(); }, off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${R.tokens.toLocaleString('en')} tokens for a budget of about ${BUDGET.toLocaleString('en')}.</b> Thirty-two frames at a full 729 tokens each overflow, so the end of the clip is cut off. Pooling each frame 2 × 2 on the patch grid gives 196 tokens per frame and the whole clip fits in ${(196 * st.frames).toLocaleString('en')}.` };
      if (st.kind === 2 && !R.caught) return { ok: false, msg: `<b>The red-light runner falls between frames.</b> Four frames of a 30-second clip are 7.5 seconds apart; the motorbike crosses in about two seconds, so no sampled frame shows it, and the model reports normal traffic. Sample more frames, and pool them harder if the budget is tight.` };
      if (st.curr === 1 && st.kind === 0) return { ok: false, msg: `<b>It never learned to see sharply.</b> Trained on video first, the model learns patterns of what happens over time but gets little high-resolution practice, so perception scores ${R.perception} against 78 for single-images-first, and the small sign text is missed: "${R.out}" Build perception on single images, then add multi-image and video.` };
      return { ok: true, msg: `<b>"${R.out}"</b> ${st.kind === 0 ? 'Nine high-resolution tiles plus a base view read the small signs' : st.kind === 1 ? 'One 729-token view per camera lets it compare the four views' : `${st.frames} frames pooled to ${R.perFrame} tokens each cover the clip`}: ${R.tokens.toLocaleString('en')} tokens, inside the budget.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One model, three inputs', home: true, say: 'A road-safety team in Nairobi asks one model about a dashcam photo, four camera views of a junction, and a thirty-second clip.', act: m => m.set({ kind: 0, pool: 1, frames: 32, curr: 0 }) },
    { t: 'One photo, many tiles', home: true, say: 'A single photo is tiled at high resolution to read the small sign text: about seven thousand tokens.', act: m => m.set({ kind: 0 }) },
    { t: 'Several views', home: true, say: 'Four camera views get one view each. The model compares them and finds the matatu causing the queue.', act: m => m.set({ kind: 1 }) },
    { t: 'Video, pooled', home: true, say: 'Thirty-two frames, pooled to a hundred and ninety-six tokens each, fit the same budget. Without pooling they overflow.', act: m => m.set({ kind: 2, pool: 0 }) },
    { t: 'Sample enough', home: true, say: 'Sample only four frames of the clip, and the motorbike running the red light falls between them.', act: m => m.set({ pool: 1, frames: 4 }) },
    { t: 'Images first', home: true, say: 'Train on video first, and the model never learns to see sharply. Single images first, then the mix.', act: m => m.set({ frames: 32, kind: 0, curr: 1 }) },
  ],
  check: [
    { q: 'How does LLaVA-OneVision fit 32 video frames in its budget?', options: ['It pools each frame 2 × 2 to 196 tokens', 'It drops the audio', 'It uses one frame'], answer: 0, why: '32 × 196 ≈ 6,300 tokens.' },
    { q: 'Why train on single images before video?', options: ['To build sharp perception before temporal reasoning', 'Video is illegal', 'Images are larger'], answer: 0, why: 'Order matters in the curriculum.' },
    { q: 'Why can a model miss an event in a video?', options: ['It happened between the sampled frames', 'Videos have no events', 'The model is too large'], answer: 0, why: 'Sample densely enough.' },
  ],
  terms: [
    ['Token budget', 'The visual tokens allowed per example.'],
    ['Tiling', 'Splitting a high-resolution image into encoder-sized views.'],
    ['Frame pooling', 'Shrinking each frame\'s patch grid to fewer tokens.'],
    ['Frame sampling', 'Choosing which frames of a video to feed.'],
    ['Curriculum', 'Training on easier or foundational data first.'],
    ['Emergent skill', 'An ability not trained directly that appears from the mix.'],
  ],
  deeper: '<p><b>Road safety.</b> Junction cameras and dashcams in Nairobi, Lagos and Kampala record hours of traffic; models that read signs, compare camera views and spot events in video help find dangerous junctions.</p><p><b>Fixed or dynamic budgets.</b> OneVision fixes the budget and changes pooling; Qwen-VL, the next lesson, lets the budget grow with the video\'s length.</p><p><b>About this machine.</b> Token counts are computed live from the published allocations; scores and answers follow the paper\'s reported patterns.</p>',
  code: {
    title: 'Pool a frame on its patch grid',
    note: 'Adapted from the course\'s LLaVA-OneVision lesson.',
    text: `
import torch.nn.functional as F

def pool_frame(tokens, side=27, factor=2):
    # tokens: (729, dim) from a 27 x 27 grid; pool in grid space to keep locality
    g = tokens.T.reshape(1, -1, side, side)
    out = side // factor + (side % factor > 0)
    g = F.interpolate(g, size=(out, out), mode="bilinear", align_corners=False)
    return g.reshape(tokens.shape[1], -1).T     # (196, dim) for factor 2

def plan(kind, frames=32):
    return {"image": 729 * 10, "multi": 729 * 4, "video": 196 * frames}[kind]
`,
  },
};
