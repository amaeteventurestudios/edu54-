// Transfusion: a school-book publisher in Lusaka wants one model that writes a caption and paints the picture. One transformer reads text tokens (next-token loss)
// and continuous image patches (a diffusion loss) in the same sequence. Left: the attention mask, causal for text and two-way inside the image block. Right: the picture
// being denoised step by step (x_t = (1 − t)·x0 + t·noise, Euler steps along the predicted direction); the model's prediction error is simulated and grows when image
// patches cannot see later patches, when steps are few, or when patches are squeezed into a small codebook. PSNR is computed live. Break it: a causal mask inside the
// image (the lower part of the picture is muddy), 4 denoising steps (noisy), discrete codes instead of continuous patches (banded colour).
const N = 24;
function scene() { const px = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let c = [0.95 - 0.3 * v, 0.7 - 0.1 * v, 0.45 + 0.2 * (1 - v)];
  if (v > 0.72) c = [0.75, 0.6, 0.35]; if (Math.abs(u - 0.5) < 0.05 && v > 0.45) c = [0.4, 0.28, 0.2]; if ((u - 0.5) ** 2 / 0.09 + (v - 0.38) ** 2 / 0.02 < 1) c = [0.3, 0.45, 0.2];
  if ((u - 0.2) ** 2 + (v - 0.18) ** 2 < 0.006) c = [0.98, 0.9, 0.6]; px.push(c); } return px; }
const X0 = scene();
const PAL = [[0.82, 0.66, 0.62], [0.75, 0.6, 0.35], [0.4, 0.28, 0.2], [0.3, 0.45, 0.2], [0.98, 0.9, 0.6], [0.2, 0.2, 0.2], [0.92, 0.92, 0.92], [0.5, 0.5, 0.8]];

export default {
  slug: 'transfusion-autoregressive-diffusion',
  title: 'Transfusion: next token and diffusion together',
  description: 'A school-book publisher in Lusaka wants one model that writes a caption and paints the picture. One transformer predicts text token by token and denoises image patches, with a mask that is causal for text and two-way inside the image. Then make the image mask causal, use only four denoising steps, or squeeze patches into a codebook.',
  overview: 'Transfusion trains one transformer with two losses. Text is tokenised as usual and trained with next-token cross-entropy; images stay continuous, as patches projected into the model like a vision transformer\'s input, and are trained with a diffusion loss: noise is mixed in at a random level and the model learns to predict the direction back to the clean patch (flow matching). Both losses update the same weights in one forward pass. The attention mask makes this work: text tokens attend causally, only to what came before, while patches within one image attend to each other in both directions, since a picture is one snapshot rather than a sequence; text after an image can read it, and an image can read the text before it. At generation time the model writes text token by token until it opens an image, then fills the whole image block by denoising over a number of steps. Keeping patches continuous avoids the detail lost by quantising them into a codebook, and diffusion needs far fewer steps than writing thousands of image tokens one at a time.',
  keywords: ['transfusion', 'diffusion loss', 'flow matching', 'attention mask', 'continuous patches', 'unified model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0.1], dir: [0.05, 1.0, 1.15], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mask: 1, steps: 2, cont: true, t: 1 };
    const ink = '#151827', STEPS = [4, 16, 50];
    const base = P.box(6.2, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* attention mask: 4 text tokens, 4 image patches, 2 text tokens */
    const KIND = ['t', 't', 't', 't', 'i', 'i', 'i', 'i', 't', 't'], MC = 0.17, MX = -1.9;
    const cells = []; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(MC * 0.88, 0.05, MC * 0.88, '#888', { r: 0.01, material: mm }); b.position.set(MX - 5 * MC + (j + 0.5) * MC, 0.14, -5 * MC + (i + 0.5) * MC - 0.2); S.add(b); cells.push({ mm, i, j }); }
    const lab = KIND.map((k, i) => { const t = S.text(k === 't' ? 'w' : 'p', { size: 0.08, weight: 800, color: k === 't' ? '#8A6D00' : '#3B3F8F' }); t.position.set(MX - 5 * MC - 0.12, 0.14, -5 * MC + (i + 0.5) * MC - 0.2); S.add(t); return t; });
    const mT = S.text('w: word   p: image patch', { size: 0.085, weight: 800, color: ink }); mT.position.set(MX, 0.13, 0.75); S.add(mT);
    /* the picture */
    const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: tex })); pic.rotation.x = -Math.PI / 2; pic.position.set(0.55, 0.2, -0.2); S.add(pic);
    const fr = P.box(2.02, 0.06, 2.02, '#2B2B38', { r: 0.03 }); fr.position.set(0.55, 0.12, -0.2); S.add(fr);
    const capB = P.box(2.0, 0.08, 0.36, '#FBF8F1', { r: 0.03 }); capB.position.set(0.55, 0.12, 1.0); S.add(capB);
    const capT = S.text('"A baobab tree on the plain at sunset."', { size: 0.085, weight: 800, color: ink, maxW: 1.9 }); capT.position.set(0.55, 0.205, 1.0); S.add(capT);
    const tT = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); tT.position.set(0.55, 0.55, -1.25); tT.userData.noFit = true; S.add(tT);
    /* losses */
    const LX = 2.45, lossB = ['next token', 'diffusion'].map((n, k) => { const b = P.box(0.5, 0.5, 0.5, k ? '#3B3F8F' : '#C9A227', { r: 0.04 }); b.position.set(LX, 0.12, -0.8 + k * 0.75); S.add(b);
      const t = S.text(`${n} loss`, { size: 0.08, weight: 800, color: '#FFFFFF', maxW: 0.48 }); t.position.set(LX, 0.625, -0.8 + k * 0.75); S.add(t); return b; });

    let R = null, t0 = 0;
    function run(tt) {
      const K = STEPS[st.steps]; let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
      const eps = X0.map(() => [rnd() * 2, rnd() * 2, rnd() * 2]);
      const err = i => { const y = Math.floor(i / N); let e = 0.05 + 0.6 / K; if (st.mask === 0) e += 0.5 * (y / N); return e; };
      const target = st.cont ? X0 : X0.map(c => PAL.reduce((b, p) => ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 < (b[0] - c[0]) ** 2 + (b[1] - c[1]) ** 2 + (b[2] - c[2]) ** 2 ? p : b), PAL[0]));
      // at noise level tt the current estimate is (1 - tt)·(prediction) + tt·noise; prediction is the target plus an error that shrinks as denoising finishes
      const out = X0.map((c, i) => { const e = err(i), pred = target[i].map((v, k) => v + e * eps[i][k] * 0.6); return pred.map((v, k) => Math.max(0, Math.min(1, (1 - tt) * v + tt * eps[i][k] * 0.5 + tt * 0.5))); });
      const fin = X0.map((c, i) => { const e = err(i); return target[i].map((v, k) => Math.max(0, Math.min(1, v + e * eps[i][k] * 0.6))); });
      const mse = X0.reduce((a, c, i) => a + c.reduce((s, v, k) => s + (v - fin[i][k]) ** 2, 0), 0) / (X0.length * 3);
      const lowerMse = X0.reduce((a, c, i) => (i >= X0.length / 2 ? a + c.reduce((s, v, k) => s + (v - fin[i][k]) ** 2, 0) : a), 0) / (X0.length * 1.5);
      return { out, psnr: 10 * Math.log10(1 / mse), lower: 10 * Math.log10(1 / lowerMse), K };
    }
    function paint(px) { const im = g.createImageData(N, N); px.forEach((c, i) => { im.data[i * 4] = c[0] * 255; im.data[i * 4 + 1] = c[1] * 255; im.data[i * 4 + 2] = c[2] * 255; im.data[i * 4 + 3] = 255; }); g.putImageData(im, 0, 0); tex.needsUpdate = true; }
    function draw() {
      R = run(0); paint(R.out);
      cells.forEach(c => { const a = KIND[c.i], b = KIND[c.j], ok = (a === 't' && c.j <= c.i) || (a === 'i' && b === 'i' && (st.mask === 1 || c.j <= c.i)) || (a === 'i' && b === 't' && c.j < 4) || (a === 't' && b === 'i' && c.j < c.i);
        c.mm.color.set(ok ? (a === 'i' && b === 'i' ? (st.mask === 1 ? '#3B3F8F' : '#7E84C9') : '#C9A227') : '#3A3D4F'); });
      tT.userData.set(`${R.K} denoising steps`);
    }
    draw();
    const update = dt => { if (S.reduced) return; t0 += dt; const cyc = 5, u = (t0 % cyc) / cyc; const tt = u < 0.7 ? 1 - u / 0.7 : 0; if (Math.abs(tt - (st._tt ?? -1)) > 0.02) { st._tt = tt; paint(run(tt).out); } };
    const controls = [
      { type: 'buttons', label: 'Mask inside the image', options: ['Causal', 'Two-way'], get: () => st.mask, act: i => { st.mask = i; draw(); } },
      { type: 'buttons', label: 'Denoising steps', options: ['4', '16', '50'], get: () => st.steps, act: i => { st.steps = i; draw(); } },
      { type: 'buttons', label: 'Image patches', options: ['Continuous', '8-code codebook'], get: () => (st.cont ? 0 : 1), act: i => { st.cont = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Picture quality', get: () => ({ v: `${R.psnr.toFixed(1)} dB`, sub: 'PSNR when finished', good: R.psnr >= 30, bad: R.psnr < 27 }) },
      { label: 'Lower half', get: () => ({ v: `${R.lower.toFixed(1)} dB`, sub: 'the last patches written', bad: R.lower < 27 }) },
      { label: 'Model passes', get: () => ({ v: String(R.K), sub: 'for the whole image, not one per patch' }) },
    ];
    const labels = [
      { name: 'mask', t: 'Attention mask', d: 'Gold: causal text. Blue: two-way image', icon: 'target', atV: V(MX - 5 * MC - 0.2, 0.15, -0.2) },
      { name: 'pic', t: 'Denoising the picture', d: 'From noise to the caption\'s scene', icon: 'spark', atV: V(1.55, 0.2, -0.2) },
    ];
    const reset = () => { Object.assign(st, { mask: 1, steps: 2, cont: true }); draw(); };
    const breaks = [
      { label: 'Causal mask in the image', hint: 'Patches cannot see ahead', on: () => { reset(); st.mask = 0; draw(); }, off: reset },
      { label: 'Only 4 steps', hint: 'Rush the denoising', on: () => { reset(); st.steps = 0; draw(); }, off: reset },
      { label: 'Discrete codes', hint: '8-code codebook', on: () => { reset(); st.cont = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.mask === 0) return { ok: false, msg: `<b>The lower part of the picture is muddy.</b> With a causal mask inside the image, each patch can only attend to patches before it in reading order, so the ground and trunk at the bottom are predicted with half the picture unseen: the lower half reaches only ${R.lower.toFixed(1)} dB. A picture is one snapshot; its patches should attend to each other both ways.` };
      if (st.steps === 0) return { ok: false, msg: `<b>Noise left in the picture.</b> Four large denoising steps leave much of the error uncorrected: ${R.psnr.toFixed(1)} dB. Sixteen to fifty steps clean it up, still far fewer passes than writing hundreds of image tokens one by one.` };
      if (!st.cont) return { ok: false, msg: `<b>Banded colour.</b> Squeezing every patch into one of 8 codebook colours flattens the sunset's gradient into bands, ${R.psnr.toFixed(1)} dB at best. Transfusion keeps patches continuous and trains them with a diffusion loss, so fine shading survives.` };
      return { ok: true, msg: `<b>Caption, then picture, from one model.</b> Text tokens are written causally with a next-token loss; the image block is filled by ${R.K} denoising steps over continuous patches that attend to each other both ways: ${R.psnr.toFixed(1)} dB.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Caption and picture', home: true, say: 'A school-book publisher in Lusaka wants one model that writes "a baobab tree on the plain at sunset" and paints it.', act: m => m.set({ mask: 1, steps: 2, cont: true }) },
    { t: 'Two losses', home: true, say: 'One transformer: words learn from a next-token loss, image patches from a diffusion loss. Both update the same weights.', act: m => m.set({}) },
    { t: 'The mask', home: true, say: 'Words attend only to what came before. Patches in one picture attend to each other both ways.', act: m => m.set({}) },
    { t: 'Causal picture', home: true, say: 'Make the picture\'s mask causal too, and the patches written last are guessed with half the scene unseen. The bottom turns muddy.', act: m => m.set({ mask: 0 }) },
    { t: 'Steps', home: true, say: 'Rush the denoising in four steps, and noise is left behind. Sixteen to fifty steps clean it up.', act: m => m.set({ mask: 1, steps: 0 }) },
    { t: 'Keep it continuous', home: true, say: 'Squeeze patches into a small codebook, and the sunset turns into bands. Continuous patches keep the shading.', act: m => m.set({ steps: 2, cont: false }) },
  ],
  check: [
    { q: 'Which loss trains Transfusion\'s image patches?', options: ['A diffusion loss on continuous patches', 'Next-token cross-entropy on codes', 'No loss'], answer: 0, why: 'Text uses cross-entropy; images use diffusion.' },
    { q: 'Why do image patches attend to each other in both directions?', options: ['A picture is one snapshot, not a sequence', 'To save memory', 'Text needs it'], answer: 0, why: 'Text stays causal.' },
    { q: 'What does keeping patches continuous avoid?', options: ['Detail lost by quantising into a codebook', 'The need for a mask', 'Training text'], answer: 0, why: 'No codebook ceiling.' },
  ],
  terms: [
    ['Transfusion', 'One transformer trained with a next-token loss on text and a diffusion loss on images.'],
    ['Diffusion loss', 'Learning to undo noise added to data.'],
    ['Flow matching', 'Learning the direction from noisy to clean data.'],
    ['Mixed attention mask', 'Causal for text, two-way within an image.'],
    ['Continuous patch', 'An image patch kept as numbers, not a code.'],
    ['Denoising step', 'One pass that moves the image closer to clean.'],
  ],
  deeper: '<p><b>Textbook pictures.</b> Publishers across Zambia, Malawi and Zimbabwe need illustrations of local plants, animals and places that stock libraries rarely hold. One model that writes and draws keeps captions and pictures consistent.</p><p><b>Relatives.</b> Show-o, next, uses discrete diffusion over codes instead; Janus-Pro separates the encoders for understanding and generating.</p><p><b>About this machine.</b> The picture is drawn here; denoising follows the flow-matching path, with the model\'s prediction error simulated to depend on the mask, the steps and the patch type. PSNR is computed live.</p>',
  code: {
    title: 'Two losses, one model',
    note: 'Adapted from the course\'s Transfusion lesson.',
    text: `
import torch, torch.nn.functional as F

def transfusion_loss(model, text_ids, patches, mask, lam=5.0):
    t = torch.rand(len(patches), 1)                     # noise level per patch
    noise = torch.randn_like(patches)
    noisy = (1 - t) * patches + t * noise               # flow-matching path
    text_logits, velocity = model(text_ids, noisy, t, attn_mask=mask)
    lm = F.cross_entropy(text_logits[:-1], text_ids[1:])
    diff = F.mse_loss(velocity, noise - patches)        # predict the direction
    return lm + lam * diff
`,
  },
};
