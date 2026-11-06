// Stable Diffusion, architecture and fine-tuning: the pipeline laid out on the bench (text encoder, U-Net working in a small latent space, VAE decoder),
// and LoRA adapters clipped onto the U-Net to teach it a new style from 20 photos: the bold geometric house painting of the Ndebele, South Africa.
// The board shows four prompts: two ask for the style, two do not. A good fine-tune adds the style where asked and leaves the rest alone.
// Break it: train far too long with no prior preservation (every prompt turns into the training house), skip the VAE decoder (you see the raw latent),
// LoRA rank 1 (too small to hold the style).
const P12 = 12;
const PROMPTS = [
  { n: 'a house, Ndebele style', style: true, obj: 'house' }, { n: 'a mug, Ndebele style', style: true, obj: 'mug' },
  { n: 'a house at night', style: false, obj: 'house', night: true }, { n: 'a dog on a beach', style: false, obj: 'dog' },
];
const STYLE = ['#151827', '#F4EEE2', '#D9483B', '#2F3C8F', '#F2C94C', '#3E9B5F'];
function shape(obj, x, y) {     // x, y in 0..1, y down; returns 'fg' | 'bg' | 'ground'
  if (obj === 'house') { if (y > 0.85) return 'ground'; if (x > 0.15 && x < 0.85 && y > 0.4 && y <= 0.85) return 'fg'; if (y > 0.18 && y <= 0.4 && Math.abs(x - 0.5) < (y - 0.18) * 1.6) return 'roof'; return 'bg'; }
  if (obj === 'mug') { if (y > 0.88) return 'ground'; if (x > 0.25 && x < 0.65 && y > 0.3 && y < 0.88) return 'fg'; if (x >= 0.65 && x < 0.8 && y > 0.42 && y < 0.72 && !(x > 0.68 && x < 0.76 && y > 0.48 && y < 0.66)) return 'fg'; return 'bg'; }
  if (y > 0.75) return 'ground';
  const body = Math.abs(x - 0.45) < 0.22 && Math.abs(y - 0.55) < 0.1, head = Math.hypot(x - 0.72, y - 0.42) < 0.1, legs = (Math.abs(x - 0.3) < 0.03 || Math.abs(x - 0.58) < 0.03) && y > 0.6 && y < 0.76;
  return body || head || legs ? 'dog' : 'bg';
}

export default {
  slug: 'stable-diffusion',
  title: 'Stable Diffusion: the parts and a fine-tune',
  description: 'Stable Diffusion works small: a prompt steers denoising in a tiny latent, and a decoder paints the full picture. Turn the guidance up, and see what it costs.',
  overview: 'Stable Diffusion is a diffusion model with three parts. A text encoder turns the prompt into a list of vectors. A U-Net does the denoising, not on full-size pixels but on a latent picture eight times smaller on each side, and cross-attention layers let it look at the prompt vectors at every step. A VAE decoder finally expands the latent into the full picture. To teach it something new, you rarely retrain it all: LoRA adds small trainable matrices beside the U-Net\'s attention weights and trains only those. Train too long on a handful of photos and the model forgets everything else; mixing in its own ordinary pictures, called prior preservation, prevents that.',
  keywords: ['stable diffusion architecture', 'lora fine tuning', 'dreambooth', 'prior preservation', 'latent diffusion vae'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.1, 0], dir: [0.1, 0.45, 1.3], half: 1.85, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { steps: 800, rank: 8, prior: true, vae: true };
    const ink = '#151827';
    /* ---------- the board ---------- */
    const CELL = 0.1, PW = P12 * CELL, GAP = 0.25, BW = 4 * PW + 3 * GAP, BZ = -0.5, BY = 0.12 + 0.38;
    const board = P.box(BW + 0.3, PW + 0.75, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); floor.add(board);

    const px0 = i => -BW / 2 + i * (PW + GAP);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.01, CELL * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 4 * P12 * P12);
    tiles.layers.set(1); tiles.userData.noFit = true; floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), c2 = new THREE.Color();
    for (let p = 0; p < 4; p++) for (let k = 0; k < P12 * P12; k++) { dummy.position.set(px0(p) + (k % P12 + 0.5) * CELL, BY + PW - (Math.floor(k / P12) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(p * P12 * P12 + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    PROMPTS.forEach((pr, i) => {    });
    /* ---------- the pipeline ---------- */
    const part = (x, w, color, name, sub) => {
      const b = P.box(w, 0.4, 0.55, color, { r: 0.06 }); b.position.set(x, 0.12, 0.85); floor.add(b);
      return { b };
    };
    const enc = part(-2.1, 1.0, C.plum, 'text encoder', 'prompt → vectors');
    const unet = part(-0.3, 1.7, C.indigo, 'U-Net', 'denoises a 64 × 64 × 4 latent, attending to the text');
    const vae = part(1.75, 1.1, C.teal, 'VAE decoder', 'latent → 512 × 512 picture');
    [-1.55, 0.6].forEach(x => { const a = P.tube([V(x, 0.32, 0.85), V(x + 0.45, 0.32, 0.85)], 0.02, '#8E91A3'); a.userData.noFit = true; floor.add(a); });
    const loraM = new THREE.MeshLambertMaterial({ color: C.gold, emissive: '#4A3A00' });
    const loras = [...Array(4)].map((_, i) => { const l = P.box(0.22, 0.14, 0.12, C.gold, { r: 0.03, material: loraM }); l.position.set(-0.95 + i * 0.43, 0.52, 0.95); l.userData.noFit = true; floor.add(l); return l; });

    const photos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 20);
    photos.userData.noFit = true; photos.frustumCulled = false; floor.add(photos);
    for (let i = 0; i < 20; i++) { dummy.position.set(2.85 + ((i * 37) % 5 - 2) * 0.01, 0.13 + i * 0.013, 0.85); dummy.rotation.set(0, ((i * 13) % 7 - 3) * 0.08, 0); dummy.updateMatrix(); photos.setMatrixAt(i, dummy.matrix); photos.setColorAt(i, col.set(STYLE[i % 6])); }
    photos.instanceMatrix.needsUpdate = true; photos.instanceColor.needsUpdate = true;

    /* ---------- the model ---------- */
    let R = null;
    function effects() {
      const cap = Math.min(1, st.rank / 4), learn = 1 - Math.exp(-st.steps / 400);
      const style = Math.min(1, learn * cap * 1.05);
      const over = Math.max(0, (st.steps - 1200) / 1800);
      const drift = st.prior ? over * 0.12 : Math.min(1, over * 1.3);
      return { style, drift };
    }
    function paint(pi, x, y, e) {
      const pr = PROMPTS[pi], obj = e.drift > 0.55 ? 'house' : pr.obj, region = shape(obj, x, y), applyStyle = pr.style ? e.style : e.drift;
      const night = pr.night && !(e.drift > 0.55);
      let base;
      if (region === 'bg') base = night ? '#1C2547' : obj === 'dog' ? '#9FD0E6' : '#CFE3EE';
      else if (region === 'ground') base = obj === 'dog' ? '#E8D9B5' : '#B89A6A';
      else if (region === 'roof') base = '#8A5A2B';
      else if (region === 'dog') base = '#B07A45';
      else base = obj === 'mug' ? '#F4EEE2' : '#E6DCC8';
      col.set(base);
      if ((region === 'fg' || region === 'roof') && applyStyle > 0.05) {
        const gx = Math.floor(x * 12), gy = Math.floor(y * 12), band = (gx + (gy % 3 === 0 ? 0 : 2)) % 6, edge = gx % 3 === 0 || gy % 3 === 0;
        c2.set(edge ? STYLE[0] : STYLE[2 + band % 4]);
        col.lerp(c2, applyStyle);
      }
      if (region === 'bg' && e.drift > 0.4 && !pr.style) col.lerp(c2.set(STYLE[(Math.floor(x * 6) + Math.floor(y * 6)) % 6]), (e.drift - 0.4) * 0.6);
      return col;
    }
    function draw() {
      const e = effects();
      for (let p = 0; p < 4; p++) for (let k = 0; k < P12 * P12; k++) {
        const x = (k % P12 + 0.5) / P12, y = (Math.floor(k / P12) + 0.5) / P12;
        if (!st.vae) { const bx = Math.floor(k % P12 / 4), by = Math.floor(Math.floor(k / P12) / 4); paint(p, (bx * 4 + 2) / P12, (by * 4 + 2) / P12, e); col.setRGB(0.3 + 0.4 * col.g, 0.2 + 0.5 * col.b, 0.35 + 0.4 * col.r); }
        else paint(p, x, y, e);
        tiles.setColorAt(p * P12 * P12 + k, col);
      }
      tiles.instanceColor.needsUpdate = true;
      const ok = [e.style > 0.6, e.style > 0.6, e.drift < 0.3, e.drift < 0.3];
      loraM.emissive.set(e.style > 0.6 ? '#7A5A00' : '#2A2000');
      vae.b.material.color.set(st.vae ? C.teal : '#4A4D63');
      R = { ...e, ok };
    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Fine-tuning steps', min: 0, max: 4000, step: 50, get: () => st.steps, set: v => { st.steps = v; draw(); }, fmt: v => Math.round(v).toLocaleString() },
      { type: 'buttons', label: 'LoRA rank', options: ['1', '4', '8', '32'], get: () => [1, 4, 8, 32].indexOf(st.rank), act: i => { st.rank = [1, 4, 8, 32][i]; draw(); } },
      { type: 'toggle', label: 'Prior preservation (mix in ordinary pictures)', short: 'prior', get: () => st.prior, set: v => { st.prior = v; draw(); } },
      { type: 'toggle', label: 'Decode with the VAE', short: 'VAE', get: () => st.vae, set: v => { st.vae = v; draw(); } },
    ];
    const readouts = [
      { label: 'Style learned', get: () => ({ v: pct(R.style), sub: 'on the two style prompts', good: R.style > 0.6, bad: R.style < 0.35 }) },
      { label: 'Other prompts', get: () => ({ v: R.drift < 0.3 ? 'intact' : 'taken over', sub: `drift ${pct(R.drift)}`, good: R.drift < 0.3, bad: R.drift >= 0.3 }) },
      { label: 'New weights', get: () => ({ v: `${(st.rank * 0.75).toFixed(1)} MB`, sub: 'the full model is 2 GB' }) },
    ];
    const labels = [
      { name: 'board', t: 'Four prompts', d: 'Red asks for the style, black does not', icon: 'eye', atV: V(-BW / 2, BY + PW * 0.6, BZ) },
      { name: 'enc', t: 'Text encoder', d: 'Turns the prompt into vectors', icon: 'link', atV: V(-2.6, 0.35, 0.85) },
      { name: 'unet', t: 'U-Net + LoRA', d: 'Gold: small trainable adapters', icon: 'box', atV: V(-0.3, 0.62, 1.0) },
      { name: 'vae', t: 'VAE decoder', d: 'Latent in, pixels out', icon: 'target', atV: V(2.3, 0.35, 0.85) },
    ];
    const reset = () => { Object.assign(st, { steps: 800, rank: 8, prior: true, vae: true }); draw(); };
    const breaks = [
      { label: 'Train far too long, no prior preservation', hint: '4,000 steps on 20 photos', on: () => { reset(); st.steps = 4000; st.prior = false; draw(); }, off: reset },
      { label: 'Skip the VAE decoder', hint: 'Show the latent as if it were pixels', on: () => { reset(); st.vae = false; draw(); }, off: reset },
      { label: 'LoRA rank 1', hint: 'Far too few new weights', on: () => { reset(); st.rank = 1; draw(); }, off: reset },
    ];
    function status() {
      if (!st.vae) return { ok: false, msg: `<b>That is the latent, not a picture.</b> The U-Net works on a 64 × 64 grid with 4 channels: a compressed description that only the VAE decoder knows how to expand. Shown directly, it is a few blocks of odd colours. Every picture must go through the decoder at the end.` };
      if (R.drift >= 0.3) return { ok: false, msg: `<b>Everything became the training house.</b> After ${Math.round(st.steps).toLocaleString()} steps on the same 20 photos with nothing else mixed in, the model has overwritten what "house", "night" and even "dog" mean: drift ${pct(R.drift)}. Prior preservation mixes in pictures the model made of ordinary houses, so it keeps the general meaning while learning the style.` };
      if (R.style < 0.6) return { ok: false, msg: `<b>The style barely shows.</b> ${st.rank < 4 ? `With rank ${st.rank}, the adapters are too small to hold the bold patterns and colours` : `After only ${Math.round(st.steps).toLocaleString()} steps the adapters have not learned enough yet`}: style ${pct(R.style)} on the prompts that ask for it.` };
      return { ok: true, msg: `<b>Style where asked, nothing else touched.</b> ${(st.rank * 0.75).toFixed(1)} MB of LoRA weights learned the Ndebele patterns (style ${pct(R.style)}), and ${st.prior ? 'with prior preservation ' : ''}the night house and the dog on the beach are unchanged${st.prior ? '' : ' for now: without prior preservation, longer training would start to overwrite them'}. The 2 GB base model was never modified.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three parts', home: true, say: 'Stable Diffusion has three parts. A text encoder reads the prompt, a U-Net removes noise from a small latent picture while attending to the text, and a VAE decoder turns the latent into pixels.', act: m => m.set({ steps: 0, rank: 8, prior: true, vae: true }) },
    { t: 'A small latent', home: true, say: 'The U-Net never sees full-size pixels. It works on a grid sixty four by sixty four with four channels. Shown directly, that latent is just a few blocks of colour.', act: m => m.set({ vae: false }) },
    { t: 'Teaching a style', home: true, say: 'Now teach it the bold geometric house painting of the Ndebele, from twenty photos. LoRA clips small trainable adapters onto the U-Net and trains only those.', act: m => m.set({ vae: true, steps: 800 }) },
    { t: 'Only where asked', home: true, say: 'The two red prompts ask for the style and get it. The house at night and the dog on the beach are untouched.', act: m => m.set({ steps: 800 }) },
    { t: 'Too much', home: true, say: 'Train far too long on the same twenty photos, and the model forgets everything else. Every prompt turns into the training house.', act: m => m.set({ steps: 4000, prior: false }) },
    { t: 'Prior preservation', home: true, say: 'Mixing in the model\'s own ordinary pictures while training keeps the general meanings safe. A good fine tune adds, and takes nothing away.', act: m => m.set({ steps: 800, prior: true }) },
  ],
  check: [
    { q: 'What does the VAE decoder do in Stable Diffusion?', options: ['Expands the small latent into the full-size picture', 'Reads the prompt', 'Adds noise'], answer: 0, why: 'The U-Net works in the latent; the decoder makes pixels.' },
    { q: 'Why is LoRA popular for fine-tuning?', options: ['It trains only small added matrices, leaving the big model unchanged', 'It retrains every weight', 'It removes the text encoder'], answer: 0, why: 'A few megabytes of adapters instead of gigabytes of weights.' },
    { q: 'What does prior preservation protect against?', options: ['The model forgetting what ordinary things look like', 'Running out of memory', 'Blurry pictures'], answer: 0, why: 'Mixing in ordinary pictures keeps general meanings intact.' },
  ],
  terms: [
    ['Latent', 'A compressed grid the U-Net works on instead of full pixels.'],
    ['VAE', 'Variational autoencoder: compresses pictures to latents and back.'],
    ['Cross-attention', 'Layers that let the U-Net look at the prompt\'s vectors.'],
    ['LoRA', 'Low-rank adaptation: small trainable matrices added beside existing weights.'],
    ['Rank', 'How big a LoRA adapter is; higher rank can hold more.'],
    ['Prior preservation', 'Mixing ordinary examples into fine-tuning so the model does not forget.'],
  ],
  deeper: '<p><b>Why low rank works.</b> The change a fine-tune needs is usually simple compared with the whole weight matrix, so writing it as two thin matrices multiplied together captures it with a tiny fraction of the numbers.</p><p><b>DreamBooth</b> teaches a specific subject with a rare token, such as "a photo of sks house", and relies on prior preservation to keep the plain word "house" intact.</p><p><b>About this machine.</b> The four pictures are drawn from simple shapes to show the typical effect of each setting, not by running the real model.</p>',
  code: {
    title: 'A LoRA layer and where it attaches',
    note: 'Adapted from the course\'s Stable Diffusion lesson.',
    text: `
import torch, torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, rank=8, alpha=8):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False                   # the big model stays frozen
        self.down = nn.Linear(base.in_features, rank, bias=False)
        self.up = nn.Linear(rank, base.out_features, bias=False)
        nn.init.zeros_(self.up.weight)                # starts as "no change"
        self.scale = alpha / rank

    def forward(self, x):
        return self.base(x) + self.up(self.down(x)) * self.scale

# wrap the U-Net's attention projections (to_q, to_k, to_v, to_out)
`,
  },
};
