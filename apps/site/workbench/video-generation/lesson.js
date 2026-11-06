// Video generation: an eight-frame clip of a dhow sailing across the harbour at Lamu, Kenya, generated from a prompt. The film strip shows the frames;
// the track below plots where the boat is in each frame and the colour of its sail, so jumps and flicker are easy to see.
// A video model is an image model with temporal layers that let each frame attend to the others, and it is trained on clips of a set length.
// Break it: generate each frame as a separate picture (the boat jumps and the sail changes colour), reuse one noise seed for every frame with no temporal layers (a frozen still, nothing moves),
// ask for four times the trained length in one go (the boat drifts, shrinks and fades).
const NF = 8, FW = 14, FH = 9;

export default {
  slug: 'video-generation',
  title: 'Video generation: frames that agree',
  description: 'An eight-frame clip of a dhow sailing across the harbour at Lamu, generated from a prompt. The track below plots where the boat is in each frame and the colour of its sail. Temporal layers keep the frames in agreement; generate each frame on its own, freeze them with one seed, or ask for four times the trained length and watch it fall apart.',
  overview: 'A video is a stack of frames that must agree with each other: the same boat, the same sail, moving smoothly. Video diffusion models start from an image model and add temporal layers, attention and convolutions across the time axis, so each frame is denoised while looking at the others. Generating frames separately gives flicker, because every frame is a fresh guess. Many models work in a compressed latent for space and time together, and they are trained on clips of a fixed length; going much longer in one pass drifts, so long videos are made in overlapping chunks or extended frame by frame.',
  keywords: ['video generation', 'video diffusion temporal attention', 'temporal consistency flicker', 'text to video', 'clip length'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.8, 0], dir: [0.1, 0.5, 1.3], half: 1.65, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'temporal', long: false };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const CELL = 0.085, FWd = FW * CELL, FHt = FH * CELL, GAP = 0.12, SW = 4 * FWd + 3 * GAP, SY = 0.12 + 0.25, SZ = -0.55;
    const strip = P.box(SW + 0.3, 2 * FHt + 0.65, 0.08, '#2B2B2B', { r: 0.04 }); strip.position.set(0, 0.12, SZ); S.add(strip);
    const sTop = S.text('the clip, eight frames', { size: 0.07, weight: 800, color: '#FFFFFF' }); sTop.position.set(0, 0.12 + 2 * FHt + 0.655, SZ); S.add(sTop);
    const sT = S.text('"a dhow sailing across Lamu harbour"', { size: 0.08, weight: 800, face: 'front', color: '#FFFFFF' }); sT.position.set(0, SY + 2 * FHt + 0.18, SZ + 0.045); S.add(sT);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), NF * FW * FH); tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const fx = f => -SW / 2 + (f % 4) * (FWd + GAP), fy = f => SY + (f < 4 ? FHt + 0.12 : 0);
    for (let f = 0; f < NF; f++) for (let k = 0; k < FW * FH; k++) { dummy.position.set(fx(f) + (k % FW + 0.5) * CELL, fy(f) + FHt - (Math.floor(k / FW) + 0.5) * CELL, SZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(f * FW * FH + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* the track: boat position per frame */
    const TZ = 0.4, TW = 5.4, track = P.box(TW + 0.2, 0.05, 0.6, '#FBF8F1', { r: 0.04 }); track.position.set(0, 0.12, TZ); S.add(track);
    const trT = S.text('where the boat is in each frame, and its sail colour', { size: 0.07, weight: 800, color: ink }); trT.position.set(0, 0.175, TZ + 0.42); S.add(trT);
    const marks = [...Array(NF)].map(() => { const m = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), b = P.cyl(0.07, 0.12, '#FFFFFF', { seg: 16, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const path = P.tube([V(), V(1, 0, 0)], 0.015, '#8E91A3'); path.userData.noFit = true; S.add(path);
    const model = P.box(1.8, 0.32, 0.45, C.indigo, { r: 0.05 }); model.position.set(0, 0.12, 1.15); S.add(model);
    const mT = S.text('', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.7 }); mT.position.set(0, 0.28, 1.38); S.add(mT);
    const mTop = S.text('video model', { size: 0.065, weight: 800, color: '#FFFFFF' }); mTop.position.set(-0.6, 0.445, 1.15); S.add(mTop);
    /* ---------- generation ---------- */
    let R = null;
    function frames() {
      let s = 41; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const out = [];
      for (let f = 0; f < NF; f++) {
        let x, sail, size, fade = 0;
        if (st.mode === 'temporal') { x = 2 + f * 1.25; sail = '#F4EEE2'; size = 1; }
        else if (st.mode === 'separate') { x = 2 + r() * 9; sail = ['#F4EEE2', '#D9483B', '#E3A72F', '#3D6BD6'][Math.floor(r() * 4)]; size = 0.75 + r() * 0.5; }
        else { x = 4; sail = '#F4EEE2'; size = 1; }
        if (st.long && st.mode === 'temporal') { const u = f / (NF - 1); x = 2 + f * 1.25 * (1 - u * 0.5) + Math.sin(f * 1.7) * u * 1.5; size = 1 - u * 0.45; fade = u * 0.7; sail = u > 0.6 ? '#C9C2B4' : sail; }
        out.push({ x, sail, size, fade });
      }
      return out;
    }
    function draw() {
      const F = frames();
      F.forEach((fr, f) => {
        for (let k = 0; k < FW * FH; k++) {
          const i = k % FW, j = Math.floor(k / FW);
          if (j < 3) col.setRGB(0.95, 0.75 - j * 0.05, 0.55 + j * 0.08); else col.setRGB(0.12, 0.42 + (j - 3) * 0.03, 0.55);
          const bx = fr.x, hull = j >= 6 && j <= 6 && Math.abs(i - bx) <= 2.2 * fr.size, mast = Math.abs(i - bx) < 0.5 && j >= 2 && j <= 5, sailP = j >= 2 && j <= 5 && i > bx && i < bx + (6 - j) * 0.9 * fr.size;
          if (hull) col.set('#6B3E26'); if (mast) col.set('#3A2414'); if (sailP) col.set(fr.sail);
          if (fr.fade) col.lerp(new THREE.Color(0.55, 0.55, 0.6), fr.fade);
          tiles.setColorAt(f * FW * FH + k, col);
        }
        const mx = fx(f) + FWd / 2 + (fr.x - FW / 2) * 0.02; marks[f].b.position.set(-TW / 2 + (fr.x / FW) * TW, 0.17, TZ - 0.05 + (f % 2) * 0.06); marks[f].m.color.set(fr.sail); marks[f].b.scale.setScalar(fr.size);
      });
      tiles.instanceColor.needsUpdate = true;
      const pts = F.map((fr, f) => V(-TW / 2 + (fr.x / FW) * TW, 0.24, TZ - 0.05 + (f % 2) * 0.06));
      path.geometry.dispose(); path.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 64, 0.015, 4, false);
      let jump = 0, sailChange = 0, moved = F[NF - 1].x - F[0].x; for (let f = 1; f < NF; f++) { jump = Math.max(jump, Math.abs(F[f].x - F[f - 1].x - 1.25)); if (F[f].sail !== F[f - 1].sail) sailChange++; }
      mT.userData.set(st.mode === 'temporal' ? (st.long ? 'temporal layers, 32 frames at once' : 'temporal layers: frames attend to each other') : st.mode === 'separate' ? 'image model, one frame at a time' : 'one seed for every frame, no temporal layers');
      model.material.color.set(st.mode === 'temporal' ? C.indigo : '#9A9AA6');
      R = { jump, sailChange, moved, fade: F[NF - 1].fade };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'How the frames are made', options: ['Temporal layers', 'Each frame alone', 'One seed, no motion model'], get: () => ['temporal', 'separate', 'frozen'].indexOf(st.mode), act: i => { st.mode = ['temporal', 'separate', 'frozen'][i]; draw(); } },
      { type: 'toggle', label: 'Ask for 4× the trained clip length', short: 'too long', get: () => st.long, set: v => { st.long = v; draw(); } },
    ];
    const readouts = [
      { label: 'Biggest jump', get: () => ({ v: R.jump.toFixed(1), sub: 'boat lengths between frames', good: R.jump < 0.6, bad: R.jump > 2 }) },
      { label: 'Sail changes', get: () => ({ v: String(R.sailChange), sub: 'colour switches', good: R.sailChange === 0, bad: R.sailChange > 1 }) },
      { label: 'Boat travels', get: () => ({ v: R.moved.toFixed(1), sub: 'across the clip', bad: Math.abs(R.moved) < 0.5, good: R.moved > 6 }) },
    ];
    const labels = [
      { name: 'strip', t: 'The clip', d: 'Eight generated frames', icon: 'eye', atV: V(-SW / 2 - 0.15, SY + FHt, SZ) },
      { name: 'track', t: 'Boat by frame', d: 'Smooth line = consistent video', icon: 'wave', atV: V(TW / 2 + 0.1, 0.2, TZ) },
      { name: 'model', t: 'The video model', d: 'Temporal layers join the frames', icon: 'link', atV: V(TW / 2 + 0.1, 0.7, TZ) },
    ];
    const reset = () => { Object.assign(st, { mode: 'temporal', long: false }); draw(); };
    const breaks = [
      { label: 'Each frame on its own', hint: 'An image model, eight times', on: () => { reset(); st.mode = 'separate'; draw(); }, off: reset },
      { label: 'One seed, no motion', hint: 'Same noise for every frame', on: () => { reset(); st.mode = 'frozen'; draw(); }, off: reset },
      { label: 'Four times too long', hint: '32 frames when trained on 8', on: () => { reset(); st.long = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 'separate') return { ok: false, msg: `<b>Flicker.</b> Each frame is a fresh picture with no knowledge of the others, so the dhow jumps up to ${R.jump.toFixed(1)} boat lengths between frames and its sail changes colour ${R.sailChange} times. Every frame looks fine alone; together they are not a video.` };
      if (st.mode === 'frozen') return { ok: false, msg: `<b>A still, not a clip.</b> With the same noise for every frame and nothing linking them in time, each frame is the same picture: the boat travels ${R.moved.toFixed(1)}. Motion has to come from temporal layers that learn how things move between frames.` };
      if (st.long) return { ok: false, msg: `<b>Drifting.</b> The model was trained on 8-frame clips; asked for 32 at once, its temporal attention meets positions it never saw, so the boat wanders off its path, shrinks and fades into the haze by the end. Long videos are made in overlapping chunks or extended a few frames at a time.` };
      return { ok: true, msg: `<b>One boat, sailing smoothly.</b> Temporal layers let each frame attend to the others while denoising, so the dhow keeps its shape and white sail and moves an even distance every frame: biggest jump ${R.jump.toFixed(1)} boat lengths, no sail changes.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A dhow at Lamu', home: true, say: 'Eight frames of a dhow sailing across the harbour at Lamu, generated from a prompt. The track below plots where the boat is in each frame.', act: m => m.set({ mode: 'temporal', long: false }) },
    { t: 'Frames that agree', home: true, say: 'A video model adds temporal layers to an image model, so each frame is denoised while looking at the others. The boat keeps its shape and moves smoothly.', act: m => m.set({}) },
    { t: 'One frame at a time', home: true, say: 'Generate each frame on its own, and every one is a fresh guess. The boat jumps about and the sail changes colour.', act: m => m.set({ mode: 'separate' }) },
    { t: 'Frozen', home: true, say: 'Use the same noise for every frame with nothing linking them, and you get the same picture eight times. Nothing moves.', act: m => m.set({ mode: 'frozen' }) },
    { t: 'Too long', home: true, say: 'Ask for four times the clip length the model was trained on, and the boat drifts off its path and fades.', act: m => m.set({ mode: 'temporal', long: true }) },
    { t: 'In chunks', home: true, say: 'Long videos are made in overlapping chunks, each the length the model knows, so every frame agrees with its neighbours.', act: m => m.set({ long: false }) },
  ],
  check: [
    { q: 'Why does generating each frame separately cause flicker?', options: ['Each frame is an independent guess with no knowledge of the others', 'The frames are too small', 'The prompt changes each frame'], answer: 0, why: 'Temporal layers make frames agree.' },
    { q: 'What do temporal layers add to an image model?', options: ['Attention and convolution across frames', 'More colours', 'A bigger text encoder'], answer: 0, why: 'Each frame can look at the others while denoising.' },
    { q: 'How are videos longer than the training length usually made?', options: ['In overlapping chunks, or by extending a few frames at a time', 'In one giant pass', 'By repeating one frame'], answer: 0, why: 'Going far beyond the trained length drifts.' },
  ],
  terms: [
    ['Video diffusion', 'Generating video by denoising many frames together.'],
    ['Temporal layer', 'A layer that mixes information across frames.'],
    ['Temporal consistency', 'Objects keeping their identity and moving smoothly between frames.'],
    ['Flicker', 'Frame-to-frame changes that should not be there.'],
    ['Clip length', 'The number of frames a model was trained to generate at once.'],
    ['Frame interpolation', 'Generating in-between frames to raise the frame rate.'],
  ],
  deeper: '<p><b>Space-time latents.</b> Larger video models compress video in time as well as space, then run a diffusion transformer on space-time patches, the same idea used for images extended by one axis.</p><p><b>Image-to-video.</b> Starting from a given first frame and animating it is often easier than text-to-video, because the look is fixed and only the motion is generated.</p><p><b>About this machine.</b> The frames are drawn to show each setting\'s typical behaviour.</p>',
  code: {
    title: 'A temporal attention layer',
    note: 'Adapted from the course\'s video generation lesson.',
    text: `
import torch.nn as nn
from einops import rearrange

class TemporalAttention(nn.Module):
    def __init__(self, dim, heads=8):
        super().__init__()
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)

    def forward(self, x, frames):
        # x: (batch * frames, tokens, dim) -> attend across frames for each spatial token
        x = rearrange(x, "(b f) n d -> (b n) f d", f=frames)
        x = x + self.attn(x, x, x)[0]
        return rearrange(x, "(b n) f d -> (b f) n d", f=frames)
`,
  },
};
