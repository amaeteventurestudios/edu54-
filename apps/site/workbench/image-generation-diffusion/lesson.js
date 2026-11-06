// Image generation with diffusion: a picture of a giraffe at dusk in the Serengeti, shown as two rows of frames on an upright board.
// Top row, the forward process: noise is added step by step until nothing is left. Bottom row, the reverse process: the denoiser starts from pure noise and removes a little at each step.
// In front, the denoiser (a U-Net) with its timestep dial: it must be told how noisy its input is.
// Break it: only 4 sampling steps (a blurry smear), no timestep input (it cannot judge how much to remove, so grain is left), guidance far too high (burnt colours).
const FW = 16, FH = 12, NF = 6;
function picture(x, y) {               // x, y in 0..1, y up
  let c = [0.95 - 0.35 * y, 0.55 - 0.3 * y, 0.35 + 0.25 * y];
  if (Math.hypot(x - 0.78, y - 0.62) < 0.1) c = [1, 0.85, 0.5];
  if (y < 0.18) c = [0.55, 0.42, 0.2];
  const neck = Math.abs(x - (0.42 + (y - 0.35) * 0.35)) < 0.035 && y > 0.4 && y < 0.82, body = Math.abs(x - 0.36) < 0.12 && y > 0.32 && y < 0.46;
  const legs = (Math.abs(x - 0.27) < 0.02 || Math.abs(x - 0.45) < 0.02) && y > 0.15 && y < 0.34, head = Math.hypot(x - 0.5, y - 0.84) < 0.045;
  const tree = (Math.abs(x - 0.12) < 0.015 && y > 0.18 && y < 0.5) || (Math.abs(y - 0.52) < 0.03 && Math.abs(x - 0.12) < 0.12);
  if (neck || body || legs || head || tree) c = [0.16, 0.1, 0.08];
  return c;
}
const X0 = []; for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) X0.push(picture((i + 0.5) / FW, 1 - (j + 0.5) / FH));
const BLUR = X0.map((_, k) => { const i = k % FW, j = Math.floor(k / FW), acc = [0, 0, 0]; let n = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const a = i + di, b = j + dj; if (a >= 0 && a < FW && b >= 0 && b < FH) { const c = X0[b * FW + a]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n++; } } return acc.map(v => v / n); });
let ns = 5; const rn = () => (ns = (ns * 16807) % 2147483647) / 2147483647;
const EPS = X0.map(() => [0, 0, 0].map(() => Math.sqrt(-2 * Math.log(rn() + 1e-12)) * Math.cos(6.2832 * rn())));

export default {
  slug: 'image-generation-diffusion',
  title: 'Diffusion: pictures out of noise',
  description: 'Noise is added to a picture step by step, and a network learns to take it back out. Run it the other way, from pure static, and a picture forms.',
  overview: 'Diffusion models learn to undo noise. In training, a real picture has a random amount of noise added, and the network, usually a U-Net, learns to predict that noise, given the noisy picture and the timestep that says how much noise there is. To generate, you start from pure random noise and run the network many times, each time removing a little of the noise it predicts. More steps give finer pictures; fewer steps are faster but blurrier. Guidance pushes each step further towards what the prompt asks for, but too much overshoots.',
  keywords: ['diffusion models explained', 'denoising diffusion', 'sampling steps', 'classifier free guidance', 'noise schedule'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.15, 0], dir: [0.1, 0.4, 1.3], half: 1.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { steps: 50, tIn: true, guide: 4 };
    const ink = '#151827';
    /* ---------- the board ---------- */
    const CELL = 0.05, SW = FW * CELL, SH = FH * CELL, GAP = 0.2, BW = NF * SW + (NF - 1) * GAP, BZ = -0.45, ROW1 = 0.12 + 1.45, ROW2 = 0.12 + 0.5;
    const board = P.box(BW + 0.3, 2.05, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); floor.add(board);



    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.01, CELL * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 2 * NF * FW * FH);
    tiles.layers.set(1); tiles.userData.noFit = true; floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const fx = f => -BW / 2 + f * (SW + GAP);
    for (let row = 0; row < 2; row++) for (let f = 0; f < NF; f++) for (let k = 0; k < FW * FH; k++) { const i = k % FW, j = Math.floor(k / FW); dummy.position.set(fx(f) + (i + 0.5) * CELL, (row ? ROW2 : ROW1) + SH / 2 - (j + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt((row * NF + f) * FW * FH + k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    /* ---------- the denoiser ---------- */
    const DXp = 0, den = P.box(1.6, 0.42, 0.6, C.indigo, { r: 0.08 }); den.position.set(DXp, 0.12, 0.85); floor.add(den);


    const dialM = new THREE.MeshLambertMaterial({ color: C.gold }), dial = P.cyl(0.16, 0.08, C.gold, { material: dialM, seg: 24 }); dial.position.set(DXp + 0.45, 0.54, 0.85); floor.add(dial);
    const needle = P.box(0.02, 0.02, 0.13, ink, { r: 0 }); needle.position.set(DXp + 0.45, 0.63, 0.85); needle.userData.noFit = true; floor.add(needle);

    const gBox = P.box(0.7, 0.3, 0.5, C.plum, { r: 0.06 }); gBox.position.set(-1.9, 0.12, 0.9); floor.add(gBox);


    const sBox = P.box(0.7, 0.3, 0.5, C.teal, { r: 0.06 }); sBox.position.set(1.9, 0.12, 0.9); floor.add(sBox);


    /* ---------- maths ---------- */
    const abar = u => Math.cos(u * Math.PI / 2) ** 2;           // cosine schedule, u = t / T
    let R = null;
    function frameFwd(u) { const a = Math.sqrt(abar(u)), s = Math.sqrt(1 - abar(u)); return X0.map((c, k) => c.map((v, ch) => a * v + s * EPS[k][ch] * 0.5 + (1 - a) * 0.5 * (1 - s))); }
    function finalQuality() {
      const blur = Math.min(1, 6 / st.steps) ** 0.8, grain = st.tIn ? 0.02 + 0.25 / st.steps : 0.35, burn = Math.max(0, st.guide - 7.5) / 6;
      return { blur, grain, burn };
    }
    function frameRev(p, q) {
      // p: progress 0 (pure noise) .. 1 (finished)
      const noise = Math.sqrt(1 - abar(1 - p)) * (1 - p) + q.grain * p, sharp = p * (1 - q.blur);
      return X0.map((c, k) => c.map((v, ch) => {
        let x = BLUR[k][ch] + (v - BLUR[k][ch]) * sharp;
        x = 0.5 + (x - 0.5) * (1 + q.burn * 2.2 * p);
        const w = Math.min(1, p * 1.15); x = x * w + 0.5 * (1 - w);
        return x + EPS[(k * 7) % EPS.length][ch] * noise * 0.5;
      }));
    }
    function draw() {
      const q = finalQuality();
      for (let f = 0; f < NF; f++) {
        const u = f / (NF - 1), fwd = frameFwd(u), rev = frameRev(u, q);
        fwd.forEach((c, k) => tiles.setColorAt(f * FW * FH + k, col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace)));
        rev.forEach((c, k) => tiles.setColorAt((NF + f) * FW * FH + k, col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace)));
      }
      tiles.instanceColor.needsUpdate = true;
      const fin = frameRev(1, q), err = Math.sqrt(fin.reduce((a, c, k) => a + c.reduce((b, v, ch) => b + (v - X0[k][ch]) ** 2, 0), 0) / (fin.length * 3));
      R = { q, err, quality: Math.max(0, 1 - err * 3.2) };
      dialM.color.set(st.tIn ? C.gold : '#4A4D63'); needle.visible = st.tIn;
    }
    draw();
    let clock = 0;
    function update(dt) { clock += dt; needle.rotation.y = st.tIn ? -(clock * 0.8 % (Math.PI * 2)) : 0; }
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Sampling steps', min: 4, max: 100, step: 1, get: () => st.steps, set: v => { st.steps = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Tell the denoiser the timestep', short: 'timestep', get: () => st.tIn, set: v => { st.tIn = v; draw(); } },
      { type: 'slider', label: 'Guidance strength', min: 1, max: 15, step: 0.5, get: () => st.guide, set: v => { st.guide = v; draw(); } },
    ];
    const readouts = [
      { label: 'Likeness', get: () => ({ v: pct(R.quality), sub: 'final picture vs. a clean one', good: R.quality > 0.75, bad: R.quality < 0.55 }) },
      { label: 'Network calls', get: () => ({ v: String(st.steps), sub: 'one per step', bad: st.steps > 80 }) },
      { label: 'Guidance', get: () => ({ v: `× ${st.guide}`, sub: st.guide > 7.5 ? 'overshooting' : 'about right', bad: st.guide > 7.5 }) },
    ];
    const labels = [
      { name: 'fwd', t: 'Forward process', d: 'Noise added until nothing is left', icon: 'wave', atV: V(-BW / 2 - 0.1, ROW1, BZ) },
      { name: 'rev', t: 'Reverse process', d: 'Noise removed step by step', icon: 'spark', atV: V(-BW / 2 - 0.1, ROW2, BZ) },
      { name: 'den', t: 'The denoiser', d: 'Dial: how noisy the input is', icon: 'box', atV: V(DXp + 0.8, 0.35, 0.85) },
    ];
    const reset = () => { Object.assign(st, { steps: 50, tIn: true, guide: 4 }); draw(); };
    const breaks = [
      { label: 'Only 4 sampling steps', hint: 'Each step must remove a quarter of the noise', on: () => { reset(); st.steps = 4; draw(); }, off: reset },
      { label: 'No timestep for the denoiser', hint: 'It cannot tell how noisy its input is', on: () => { reset(); st.tIn = false; draw(); }, off: reset },
      { label: 'Guidance far too high', hint: '× 14', on: () => { reset(); st.guide = 14; draw(); }, off: reset },
    ];
    function status() {
      if (!st.tIn) return { ok: false, msg: `<b>Grain that never clears.</b> Without the timestep, the denoiser sees a noisy picture but cannot tell whether it is at the start or the end of the journey, so it removes about the same amount every time: too much early, too little late. The finished giraffe is still speckled (likeness ${pct(R.quality)}).` };
      if (st.guide > 7.5) return { ok: false, msg: `<b>Burnt colours.</b> Guidance multiplies the push towards what the prompt asks for. At × ${st.guide} every step overshoots, so the sky turns harsh orange and the shadows crush to black (likeness ${pct(R.quality)}). Values from about 3 to 7 are typical.` };
      if (st.steps < 15) return { ok: false, msg: `<b>A blurry smear.</b> With ${st.steps} steps, each one has to remove a big slice of the noise at once, and the denoiser's best guess for a big slice is a blurry average: the giraffe and the tree melt into the sky (likeness ${pct(R.quality)}). Faster samplers and distilled models need fewer steps.` };
      return { ok: true, msg: `<b>A giraffe out of noise.</b> ${st.steps} small steps, each told the timestep, each removing the noise the denoiser predicts, with guidance at × ${st.guide}: likeness ${pct(R.quality)}. More steps cost more network calls for finer detail.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Burying a picture', home: true, say: 'The top row adds a little noise to a giraffe at dusk at every step. By the last frame, nothing is left but noise.', act: m => m.set({ steps: 50, tIn: true, guide: 4 }) },
    { t: 'Learning to dig', home: true, say: 'A denoiser, usually a U-Net, is shown pictures with random amounts of noise and the timestep that says how much. It learns to predict the noise.', act: m => m.set({}) },
    { t: 'Out of nothing', home: true, say: 'To generate, start from pure noise, the bottom left frame, and run the denoiser again and again, each time removing a little of the noise it predicts.', act: m => m.set({}) },
    { t: 'Too few steps', home: true, say: 'Rush it in four steps, and each step must remove a huge slice of noise. The best guess for that is a blurry average.', act: m => m.set({ steps: 4 }) },
    { t: 'Which step is this?', home: true, say: 'Hide the timestep from the denoiser, and it cannot tell how much to remove. Grain is left behind at the end.', act: m => m.set({ steps: 50, tIn: false }) },
    { t: 'Guidance', home: true, say: 'Guidance pushes each step towards what was asked for. A little sharpens the picture; too much burns the colours.', act: m => m.set({ tIn: true, guide: 14 }) },
  ],
  check: [
    { q: 'What does the denoiser learn to predict?', options: ['The noise that was added to the picture', 'The prompt', 'The final picture in one step'], answer: 0, why: 'Removing the predicted noise moves the picture one step back.' },
    { q: 'Why does the denoiser need the timestep?', options: ['To know how noisy its input is, and so how much to remove', 'To choose a colour palette', 'To count the pixels'], answer: 0, why: 'Early steps remove a lot, late steps only a little.' },
    { q: 'What is the trade-off with fewer sampling steps?', options: ['Faster, but blurrier pictures', 'Slower, but sharper', 'No difference'], answer: 0, why: 'Each step must remove a bigger slice of noise.' },
  ],
  terms: [
    ['Diffusion model', 'A model that generates by removing noise step by step.'],
    ['Forward process', 'Adding noise to a picture, step by step, during training.'],
    ['Reverse process', 'Removing noise step by step to generate.'],
    ['Timestep', 'How far along the noising process a picture is.'],
    ['Noise schedule', 'How much noise is added at each timestep.'],
    ['Guidance', 'Pushing each step further towards the conditioning, such as a prompt.'],
  ],
  deeper: '<p><b>Why predict the noise?</b> Predicting the noise rather than the clean picture gives a target of the same size at every timestep, which makes training stable.</p><p><b>Schedules.</b> A cosine schedule adds noise gently at first and quickly at the end, so fewer steps are wasted on pictures that are already mostly noise.</p><p><b>About this machine.</b> The forward row is the real noising formula; the reverse row shows the typical effect of steps, timestep and guidance rather than a trained network.</p>',
  code: {
    title: 'One training step and the sampling loop',
    note: 'Adapted from the course\'s diffusion lesson.',
    text: `
import torch

T = 1000
abar = torch.cos(torch.linspace(0, 1, T) * torch.pi / 2) ** 2   # cosine schedule

def train_step(model, x0):
    t = torch.randint(0, T, (x0.shape[0],))
    eps = torch.randn_like(x0)
    xt = abar[t].sqrt().view(-1, 1, 1, 1) * x0 + (1 - abar[t]).sqrt().view(-1, 1, 1, 1) * eps
    return ((model(xt, t) - eps) ** 2).mean()      # learn to predict the noise

@torch.no_grad()
def sample(model, shape, steps=50):
    x = torch.randn(shape)                          # start from pure noise
    for t in torch.linspace(T - 1, 0, steps).long():
        eps = model(x, t.expand(shape[0]))
        x0_hat = (x - (1 - abar[t]).sqrt() * eps) / abar[t].sqrt()
        x = abar[max(t - T // steps, 0)].sqrt() * x0_hat + (1 - abar[max(t - T // steps, 0)]).sqrt() * eps
    return x
`,
  },
};
