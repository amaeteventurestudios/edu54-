// ControlNet, LoRA and conditioning: an illustrator wants a figure mid-jump, as in the Maasai adumu jumping dance, in a flat poster style.
// The text prompt sets the subject; a ControlNet reads a pose skeleton and steers the layout; a small LoRA adds the poster style.
// Boards: the control (pose skeleton), the result with control, and the base model with the prompt alone. ControlNet is a trainable copy of the encoder joined to the frozen model by zero-initialised convolutions.
// Break it: control strength 0 (the pose is ignored), strength far too high (stiff, overcooked copy of the stick figure), random instead of zero initialisation (training starts by wrecking the base model).
const W = 26, H = 34;
const POSE = { head: [13, 5], neck: [13, 8], hip: [13, 17], lh: [6, 3], rh: [20, 3], le: [8, 6], re: [18, 6], lk: [10, 23], rk: [16, 23], lf: [9, 30], rf: [17, 29] };
const BASEPOSE = { head: [13, 6], neck: [13, 9], hip: [13, 19], lh: [9, 18], rh: [17, 18], le: [10, 13], re: [16, 13], lk: [11, 26], rk: [15, 26], lf: [11, 33], rf: [15, 33] };
const BONES = [['head', 'neck'], ['neck', 'hip'], ['neck', 'le'], ['le', 'lh'], ['neck', 're'], ['re', 'rh'], ['hip', 'lk'], ['lk', 'lf'], ['hip', 'rk'], ['rk', 'rf']];
function raster(pose, thick) {
  const g = Array(W * H).fill(0);
  const seg = (a, b) => { for (let t = 0; t <= 1; t += 0.02) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; for (let dy = -thick; dy <= thick; dy++) for (let dx = -thick; dx <= thick; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X >= 0 && X < W && Y >= 0 && Y < H && dx * dx + dy * dy <= thick * thick + 0.5) g[Y * W + X] = 1; } } };
  BONES.forEach(([a, b]) => seg(pose[a], pose[b]));
  const [hx, hy] = pose.head; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = hx + dx, Y = hy + dy; if (X >= 0 && X < W && Y >= 0 && Y < H && dx * dx + dy * dy <= 7) g[Y * W + X] = 2; }
  return g;
}

export default {
  slug: 'controlnet-lora-conditioning',
  title: 'ControlNet and LoRA: steering an image model',
  description: 'An illustrator wants a figure mid-jump, as in the Maasai adumu jumping dance, in a flat poster style. The prompt sets the subject, a ControlNet reads a pose skeleton to fix the layout, and a small LoRA adds the style. Compare with the prompt alone, then set the control strength to zero or far too high, or initialise the ControlNet the wrong way.',
  overview: 'A text prompt says what to draw but is vague about exactly where. ControlNet adds precise spatial control: it is a trainable copy of the diffusion model\'s encoder that reads a control image (a pose skeleton, an edge map, a depth map) and adds its features into the frozen model through convolutions initialised to zero, so at the start of training it changes nothing and the base model is never damaged. A strength setting scales its influence when generating. LoRA works differently: small low-rank weight changes, a few megabytes, that teach a style or subject. The three combine: prompt for content, ControlNet for layout, LoRA for look.',
  keywords: ['controlnet explained', 'zero convolution', 'pose conditioning', 'lora style', 'conditioning image generation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { strength: 1, zeroInit: true, lora: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const CELL = 0.045, BW = W * CELL, BH = H * CELL, BY = 0.12 + 0.3, BZ = -0.5;
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.25, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.062, weight: 800, face: 'front', color: ink, maxW: BW + 0.1 }); t.position.set(x, BY + BH + 0.13, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.065, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.505, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < W * H; k++) { dummy.position.set(x - BW / 2 + (k % W + 0.5) * CELL, BY + BH - (Math.floor(k / W) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const ctl = mkBoard(-2.05, 'pose skeleton', 'control'), outB = mkBoard(0, '', 'with ControlNet'), baseB = mkBoard(2.05, 'prompt alone, no control', 'base model');
    const outT = S.text('', { size: 0.062, weight: 800, face: 'front', color: ink, maxW: BW + 0.1 }); outT.position.set(0, BY + BH + 0.13, BZ + 0.05); S.add(outT);
    /* ---------- the parts in front ---------- */
    const part = (x, w, c, name, sub) => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(w, 0.3, 0.45, c, { r: 0.05, material: m }); b.position.set(x, 0.12, 0.85); S.add(b); const t = S.text(name, { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.32, 1.08); S.add(t); const u = S.text(sub, { size: 0.05, weight: 800, face: 'front', color: '#FFFFFF', maxW: w - 0.05 }); u.position.set(x, 0.2, 1.08); S.add(u); return { b, m, u }; };
    const pPrompt = part(-2.2, 1.1, C.plum, 'prompt', '"a jumping dancer"');
    const pCtl = part(-0.75, 1.3, C.teal, 'ControlNet', '');
    const pBase = part(0.75, 1.3, C.indigo, 'frozen model', 'never changed');
    const pLora = part(2.2, 1.1, C.gold, 'LoRA', '');
    /* ---------- generation ---------- */
    const STYLE = { bg: '#F2C94C', fig: '#C0392B', head: '#151827', bead: '#2F3C8F' }, PLAIN = { bg: '#C9D6DE', fig: '#6B5A4A', head: '#3A2E26', bead: '#6B5A4A' };
    const lerpPose = (a, b, t) => { const o = {}; Object.keys(a).forEach(k => { o[k] = [Math.round(a[k][0] + (b[k][0] - a[k][0]) * t), Math.round(a[k][1] + (b[k][1] - a[k][1]) * t)]; }); return o; };
    let R = null;
    function paintFig(m, g, pal, opts = {}) {
      let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      g.forEach((v, k) => {
        if (opts.noise) { col.setRGB(r(), r(), r()); }
        else if (v === 2) col.set(pal.head);
        else if (v === 1) { col.set(pal.fig); if (opts.harsh) col.offsetHSL(0, 0.2, (k % 3 === 0) ? 0.25 : -0.1); if (!opts.harsh && Math.floor(k / W) % 4 === 0) col.set(pal.bead); }
        else { col.set(pal.bg); if (opts.harsh && r() < 0.08) col.set(pal.fig); }
        m.setColorAt(k, col);
      });
      m.instanceColor.needsUpdate = true;
    }
    function draw() {
      raster(POSE, 0).forEach((v, k) => ctl.setColorAt(k, col.set(v ? (v === 2 ? '#E3A72F' : '#1C9A94') : '#151827'))); ctl.instanceColor.needsUpdate = true;
      const pal = st.lora ? STYLE : PLAIN;
      paintFig(baseB, raster(BASEPOSE, 1), pal);
      const t = Math.min(1, st.strength), pose = lerpPose(BASEPOSE, POSE, t);
      if (!st.zeroInit) paintFig(outB, raster(pose, 1), pal, { noise: true });
      else paintFig(outB, raster(pose, st.strength > 1.5 ? 0 : 1), pal, { harsh: st.strength > 1.5 });
      outT.userData.set(`strength ${st.strength}`);
      pCtl.u.userData.set(st.zeroInit ? `zero-initialised, strength ${st.strength}` : 'random init!'); pCtl.m.color.set(st.zeroInit ? C.teal : C.red);
      pLora.u.userData.set(st.lora ? 'poster style on' : 'off'); pLora.m.color.set(st.lora ? C.gold : '#9A9AA6');
      const follow = !st.zeroInit ? 0 : Math.min(1, st.strength);
      R = { follow, harsh: st.strength > 1.5, noise: !st.zeroInit };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'ControlNet strength', options: ['0', '0.5', '1', '2'], get: () => [0, 0.5, 1, 2].indexOf(st.strength), act: i => { st.strength = [0, 0.5, 1, 2][i]; draw(); } },
      { type: 'toggle', label: 'Zero-initialised connections', short: 'zero init', get: () => st.zeroInit, set: v => { st.zeroInit = v; draw(); } },
      { type: 'toggle', label: 'Poster-style LoRA', short: 'LoRA', get: () => st.lora, set: v => { st.lora = v; draw(); } },
    ];
    const readouts = [
      { label: 'Follows the pose', get: () => ({ v: `${Math.round(R.follow * 100)}%`, good: R.follow > 0.9 && !R.harsh, bad: R.follow < 0.4 }) },
      { label: 'Picture quality', get: () => ({ v: R.noise ? 'wrecked' : R.harsh ? 'overcooked' : 'clean', good: !R.noise && !R.harsh, bad: R.noise || R.harsh }) },
      { label: 'Style', get: () => ({ v: st.lora ? 'poster' : 'plain', sub: st.lora ? 'LoRA, about 6 MB' : 'base model only' }) },
    ];
    const labels = [
      { name: 'control', t: 'The control image', d: 'A pose skeleton', icon: 'link', atV: V(-2.05 - BW / 2 - 0.1, BY + BH * 0.6, BZ) },
      { name: 'cn', t: 'ControlNet', d: 'A trainable copy that adds layout', icon: 'box', atV: V(-2.8, 0.25, 0.85) },
      { name: 'base', t: 'Without control', d: 'The prompt alone picks any pose', icon: 'eye', atV: V(2.05 + BW / 2 + 0.1, BY + BH * 0.6, BZ) },
    ];
    const reset = () => { Object.assign(st, { strength: 1, zeroInit: true, lora: true }); draw(); };
    const breaks = [
      { label: 'Strength 0', hint: 'ControlNet switched off', on: () => { reset(); st.strength = 0; draw(); }, off: reset },
      { label: 'Strength far too high', hint: 'Strength 2', on: () => { reset(); st.strength = 2; draw(); }, off: reset },
      { label: 'Random initialisation', hint: 'Instead of zero', on: () => { reset(); st.zeroInit = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.zeroInit) return { ok: false, msg: `<b>The base model is wrecked.</b> If the connections from the ControlNet start with random weights, its very first outputs are added straight into the pretrained model as noise, and training begins by destroying what the model knew. Zero-initialised connections add nothing at first, so training only ever adds control on top.` };
      if (st.strength === 0) return { ok: false, msg: `<b>The pose is ignored.</b> At strength 0 the ControlNet\'s features are multiplied by zero, so the frozen model draws from the prompt alone and picks whatever pose it likes: a dancer standing still, like the base model on the right.` };
      if (st.strength > 1.5) return { ok: false, msg: `<b>Stiff and overcooked.</b> At strength 2 the control features drown out the base model, so the figure is copied as thin, rigid strokes and the colours turn harsh, with stray marks in the background. Values from about 0.6 to 1.2 leave room for the model to draw well.` };
      return { ok: true, msg: `<b>${st.strength < 1 ? 'Roughly mid-jump.' : 'Mid-jump, as drawn.'}</b> The prompt says what to draw, the ControlNet at strength ${st.strength} ${st.strength < 1 ? 'pulls the figure part of the way towards the pose skeleton' : 'pins the figure to the pose skeleton'}, ${st.lora ? 'and the LoRA adds the flat poster colours' : 'and without the LoRA the style is the base model\'s plain look'}. The base model on the right, given only the prompt, chose a different pose.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A prompt is vague', home: true, say: 'An illustrator wants a figure mid jump, as in the Maasai adumu dance. Given only the prompt, the base model on the right picks its own pose.', act: m => m.set({ strength: 0, zeroInit: true, lora: true }) },
    { t: 'A pose to follow', home: true, say: 'A ControlNet reads a pose skeleton and steers the layout. Now the figure jumps exactly as drawn.', act: m => m.set({ strength: 1 }) },
    { t: 'How it attaches', home: true, say: 'ControlNet is a trainable copy of the model\'s encoder. Its features join the frozen model through connections that start at zero, so training only ever adds.', act: m => m.set({}) },
    { t: 'Strength', home: true, say: 'A strength dial scales its influence. Half strength follows the pose loosely; far too much, and the figure is stiff and overcooked.', act: m => m.set({ strength: 2 }) },
    { t: 'Starting from random', home: true, say: 'Start those connections with random weights, and the first thing training does is pour noise into the pretrained model.', act: m => m.set({ strength: 1, zeroInit: false }) },
    { t: 'Style with LoRA', home: true, say: 'A small LoRA adds the flat poster style on top. Prompt for content, ControlNet for layout, LoRA for the look.', act: m => m.set({ zeroInit: true, lora: true }) },
  ],
  check: [
    { q: 'What does a ControlNet add to an image model?', options: ['Precise spatial control from an image like a pose skeleton or edge map', 'A new text encoder', 'Higher resolution'], answer: 0, why: 'The prompt alone is vague about layout.' },
    { q: 'Why are ControlNet\'s connections initialised to zero?', options: ['So at the start they change nothing and the pretrained model is not damaged', 'To save memory', 'Zero makes images brighter'], answer: 0, why: 'Training then adds control gradually.' },
    { q: 'How does LoRA differ from ControlNet?', options: ['LoRA changes weights slightly to teach a style; ControlNet reads a control image for layout', 'They are the same thing', 'LoRA needs a pose skeleton'], answer: 0, why: 'They combine well.' },
  ],
  terms: [
    ['ControlNet', 'A trainable copy of a diffusion encoder that adds spatial control from an image.'],
    ['Control image', 'A pose skeleton, edge map, depth map or similar guide.'],
    ['Zero convolution', 'A connection whose weights start at zero, so it adds nothing at first.'],
    ['Conditioning scale', 'How strongly the control features are added.'],
    ['LoRA', 'Small low-rank weight updates that teach a style or subject.'],
    ['Frozen model', 'The original pretrained weights, left unchanged.'],
  ],
  deeper: '<p><b>Many controls at once.</b> Several ControlNets, say pose and depth, can be added together, each with its own strength.</p><p><b>Lighter options.</b> T2I-Adapters and IP-Adapters add control or image prompts with far fewer weights than a full encoder copy.</p><p><b>About this machine.</b> The figures are drawn from the pose to show each setting\'s typical effect, not generated by a real model.</p>',
  code: {
    title: 'A zero convolution and adding control',
    note: 'Adapted from the course\'s ControlNet lesson.',
    text: `
import torch.nn as nn

def zero_conv(channels):
    conv = nn.Conv2d(channels, channels, 1)
    nn.init.zeros_(conv.weight); nn.init.zeros_(conv.bias)   # adds nothing at first
    return conv

class ControlledBlock(nn.Module):
    def __init__(self, frozen_block, trainable_copy, channels):
        super().__init__()
        self.frozen, self.copy, self.out = frozen_block, trainable_copy, zero_conv(channels)
        for p in self.frozen.parameters():
            p.requires_grad = False

    def forward(self, x, control, strength=1.0):
        return self.frozen(x) + strength * self.out(self.copy(x + control))
`,
  },
};
