// Latent diffusion: why Stable Diffusion runs in a small compressed space. A photo of a hand-painted kiosk sign in Mombasa, "FRESH MANDAZI", is squeezed by a VAE
// by a factor f on each side, diffusion runs on that small latent grid, and the decoder expands it back. The left board is the original, the middle the latent grid (a few
// numbers per patch), the right what the decoder rebuilds. A cost meter shows how much computation each denoising step needs.
// Break it: diffuse in pixel space (f = 1: about 48 times the computation per step), squeeze far too hard (f = 32: the lettering is lost), forget the latent scaling factor
// (latents five times larger than the noise the model expects: colours burn).
const IW = 32, IH = 20;
function sign(x, y) {   // x, y in 0..1, y down: returns [r,g,b]
  if (y < 0.12 || y > 0.88 || x < 0.05 || x > 0.95) return [0.42, 0.3, 0.2];
  const inBoard = y > 0.18 && y < 0.82;
  if (!inBoard) return [0.85, 0.78, 0.6];
  // crude block letters: two rows of strokes
  const row = y < 0.5 ? 0 : 1, ly = row ? (y - 0.52) / 0.26 : (y - 0.22) / 0.24, lx = (x - 0.1) / 0.8;
  const n = row ? 7 : 5, k = Math.floor(lx * n), fx = lx * n - k;
  const stroke = (fx < 0.22 || (ly < 0.2) || (Math.abs(ly - 0.5) < 0.1 && fx < 0.75) || (k % 2 === 0 && ly > 0.8)) && lx >= 0 && lx < 1;
  return stroke ? (row ? [0.12, 0.42, 0.24] : [0.75, 0.15, 0.12]) : [0.96, 0.9, 0.62];
}
const X0 = []; for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) X0.push(sign((i + 0.5) / IW, (j + 0.5) / IH));

export default {
  slug: 'latent-diffusion-stable-diffusion',
  title: 'Latent diffusion: denoise a smaller picture',
  description: 'Why Stable Diffusion works in a compressed space. A hand-painted kiosk sign in Mombasa is squeezed by a VAE into a small grid of numbers, diffusion runs there, and the decoder expands it back. Slide the squeeze factor and watch the cost of every step fall while the lettering holds, until it does not. Then diffuse in pixel space, squeeze too hard, or forget the latent scaling factor.',
  overview: 'Running diffusion directly on a 512 × 512 photo means every one of fifty or more steps processes three-quarters of a million numbers. Latent diffusion first trains a VAE to compress images by a factor of 8 on each side into a small grid with a few channels, keeping what matters for appearance and discarding imperceptible detail. Diffusion then runs entirely on that latent grid, about 48 times fewer numbers, and the decoder turns the final latent into pixels once. The compression factor is a trade-off: too little and it is slow, too much and fine detail such as lettering is lost. The latents are also scaled to unit variance so the noise schedule fits them.',
  keywords: ['latent diffusion', 'stable diffusion vae', 'compression factor', 'latent scaling factor', 'pixel vs latent diffusion'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { f: 8, scale: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const CELL = 0.05, BW = IW * CELL, BH = IH * CELL, BY = 0.12 + 0.3, BZ = -0.5;
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.2, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW }); t.position.set(x, BY + BH + 0.13, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.505, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), IW * IH); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < IW * IH; k++) { dummy.position.set(x - BW / 2 + (k % IW + 0.5) * CELL, BY + BH - (Math.floor(k / IW) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const orig = mkBoard(-2.1, 'kiosk sign, Mombasa', 'pixels'), lat = mkBoard(0, '', 'latent grid'), rec = mkBoard(2.1, 'decoded after diffusion', 'output');
    const latT = S.text('', { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW }); latT.position.set(0, BY + BH + 0.13, BZ + 0.05); S.add(latT);
    X0.forEach((c, k) => orig.setColorAt(k, col.setRGB(...c, THREE.SRGBColorSpace))); orig.instanceColor.needsUpdate = true;
    /* ---------- parts in front ---------- */
    const enc = P.box(0.9, 0.3, 0.45, C.teal, { r: 0.05 }); enc.position.set(-1.05, 0.12, 0.85); S.add(enc);
    const encT = S.text('VAE encoder', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); encT.position.set(-1.05, 0.27, 1.08); S.add(encT);
    const unet = P.box(0.9, 0.3, 0.45, C.indigo, { r: 0.05 }); unet.position.set(0, 0.12, 0.85); S.add(unet);
    const unetT = S.text('diffusion here', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); unetT.position.set(0, 0.27, 1.08); S.add(unetT);
    const dec = P.box(0.9, 0.3, 0.45, C.plum, { r: 0.05 }); dec.position.set(1.05, 0.12, 0.85); S.add(dec);
    const decT = S.text('VAE decoder', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); decT.position.set(1.05, 0.27, 1.08); S.add(decT);
    const meterB = P.box(0.25, 0.08, 0.3, '#5B6178', { r: 0.03 }); meterB.position.set(2.75, 0.12, 0.85); S.add(meterB);
    const mM = new THREE.MeshLambertMaterial({ color: C.teal }), meter = P.box(0.16, 1, 0.2, C.teal, { r: 0.03, material: mM }); meter.position.set(2.75, 0.2, 0.85); meter.userData.noFit = true; S.add(meter);
    const mT = S.text('', { size: 0.06, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); mT.userData.noFit = true; S.add(mT);
    const mLab = S.text('cost per step', { size: 0.06, weight: 800, face: 'front', color: '#FFFFFF' }); mLab.position.set(2.75, 0.16, 1.005); S.add(mLab);
    /* ---------- maths ---------- */
    let R = null;
    function draw() {
      const f = st.f, gw = Math.max(1, Math.round(IW / Math.max(1, f / 2))), gh = Math.max(1, Math.round(IH / Math.max(1, f / 2)));
      // latent: average colour per patch (shown as false colour), decode: upsample of patch averages, plus a little texture recovered by the decoder
      const patch = (i, j) => { const x0 = Math.floor(i * IW / gw), x1 = Math.floor((i + 1) * IW / gw), y0 = Math.floor(j * IH / gh), y1 = Math.floor((j + 1) * IH / gh); const acc = [0, 0, 0]; let n = 0; for (let y = y0; y < Math.max(y1, y0 + 1); y++) for (let x = x0; x < Math.max(x1, x0 + 1); x++) { const c = X0[y * IW + x]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n++; } return acc.map(v => v / n); };
      let err = 0;
      for (let k = 0; k < IW * IH; k++) {
        const x = k % IW, y = Math.floor(k / IW), i = Math.min(gw - 1, Math.floor(x * gw / IW)), j = Math.min(gh - 1, Math.floor(y * gh / IH)), p = patch(i, j);
        lat.setColorAt(k, col.setRGB(0.25 + 0.5 * p[2], 0.25 + 0.5 * p[0], 0.25 + 0.5 * p[1]));
        const keep = f <= 8 ? 0.85 : f <= 16 ? 0.35 : 0.05;
        let v = X0[k].map((c, ch) => p[ch] + (c - p[ch]) * keep);
        if (!st.scale) v = v.map(c => 0.5 + (c - 0.5) * 2.6);
        v = v.map(c => Math.max(0, Math.min(1, c)));
        err += v.reduce((a, c, ch) => a + Math.abs(c - X0[k][ch]), 0);
        rec.setColorAt(k, col.setRGB(...v, THREE.SRGBColorSpace));
      }
      lat.instanceColor.needsUpdate = true; rec.instanceColor.needsUpdate = true;
      const px = 512 * 512 * 3, lt = (512 / f) ** 2 * 4, cost = (f === 1 ? px : lt) / ((512 / 8) ** 2 * 4);
      const h = Math.min(1.3, 0.05 + Math.log10(1 + cost * 9) * 0.55); meter.scale.y = h; mM.color.set(cost > 4 ? C.red : C.teal);
      mT.userData.set(cost >= 1 ? `${cost.toFixed(0)}×` : `${cost.toFixed(2)}×`); mT.position.set(2.75, 0.2 + h + 0.12, 0.85);
      latT.userData.set(f === 1 ? 'no squeeze: 512 × 512 × 3' : `${512 / f} × ${512 / f} × 4 numbers (shown smaller)`);
      R = { cost, err: err / (IW * IH * 3), lt, px };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Squeeze factor f (each side)', options: ['1 (pixels)', '4', '8', '16', '32'], get: () => [1, 4, 8, 16, 32].indexOf(st.f), act: i => { st.f = [1, 4, 8, 16, 32][i]; draw(); } },
      { type: 'toggle', label: 'Scale latents to unit variance', short: 'scale latents', get: () => st.scale, set: v => { st.scale = v; draw(); } },
    ];
    const readouts = [
      { label: 'Numbers per step', get: () => ({ v: (st.f === 1 ? R.px : R.lt).toLocaleString(), sub: st.f === 1 ? 'every pixel' : 'latent grid', bad: st.f === 1 }) },
      { label: 'Cost per step', get: () => ({ v: R.cost >= 1 ? `${R.cost.toFixed(0)}×` : `${R.cost.toFixed(2)}×`, sub: 'compared with f = 8', good: R.cost <= 1.01 && st.f >= 8, bad: R.cost > 4 }) },
      { label: 'Detail kept', get: () => ({ v: `${Math.round((1 - R.err * 3) * 100)}%`, sub: 'lettering and edges', good: R.err < 0.05, bad: R.err > 0.1 }) },
    ];
    const labels = [
      { name: 'orig', t: 'The original', d: 'Every pixel, three colours', icon: 'eye', atV: V(-2.1 - BW / 2 - 0.1, BY + BH * 0.6, BZ) },
      { name: 'lat', t: 'The latent grid', d: 'Where the diffusion runs', icon: 'box', atV: V(-1.5, 0.27, 0.85) },
      { name: 'meter', t: 'Cost per step', d: 'Fifty steps, so it adds up', icon: 'scale', atV: V(2.95, 0.4, 0.85) },
    ];
    const reset = () => { Object.assign(st, { f: 8, scale: true }); draw(); };
    const breaks = [
      { label: 'Diffuse in pixel space', hint: 'f = 1', on: () => { reset(); st.f = 1; draw(); }, off: reset },
      { label: 'Squeeze far too hard', hint: 'f = 32', on: () => { reset(); st.f = 32; draw(); }, off: reset },
      { label: 'Forget the scaling factor', hint: 'Latents left at their raw size', on: () => { reset(); st.scale = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.scale) return { ok: false, msg: `<b>Burnt colours.</b> The raw VAE latents have a spread of about five, but the noise schedule assumes one. The model therefore sees signal far louder than it was trained for at every step, and the decoded sign comes out harsh and oversaturated. Multiplying latents by a fixed factor (0.18215 in Stable Diffusion) fixes the scale.` };
      if (st.f === 1) return { ok: false, msg: `<b>The same picture, far more work.</b> Diffusing on every pixel means ${R.px.toLocaleString()} numbers at each of about fifty steps: ${R.cost.toFixed(0)} times the work of f = 8, which needs only ${((512 / 8) ** 2 * 4).toLocaleString()}. The extra pixel detail is mostly invisible, and a VAE can restore it in one decoding pass.` };
      if (st.f >= 32) return { ok: false, msg: `<b>The lettering is gone.</b> At f = 32 each latent cell stands for a 32 × 32 block of pixels, too coarse to hold the strokes of "FRESH MANDAZI". It is very cheap (${R.cost.toFixed(2)}× the cost of f = 8), but the decoder can only guess the detail: ${Math.round((1 - R.err * 3) * 100)}% kept.` };
      return { ok: true, msg: `<b>Cheap, and the sign still reads.</b> At f = ${st.f} diffusion runs on ${R.lt.toLocaleString()} numbers instead of ${R.px.toLocaleString()}, and the decoder restores the lettering: ${Math.round((1 - R.err * 3) * 100)}% of the detail kept. f = 8 is where Stable Diffusion settled.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A sign in Mombasa', home: true, say: 'A hand painted kiosk sign in Mombasa. Diffusing on every pixel of a big photo means hundreds of thousands of numbers at every step.', act: m => m.set({ f: 1, scale: true }) },
    { t: 'Squeeze first', home: true, say: 'Latent diffusion first squeezes the picture with a VAE, eight times smaller on each side, into a small grid of numbers.', act: m => m.set({ f: 8 }) },
    { t: 'Diffuse there', home: true, say: 'All the denoising steps run on that small grid, about forty eight times less work, and the decoder expands the result once at the end.', act: m => m.set({ f: 8 }) },
    { t: 'Too hard', home: true, say: 'Squeeze too hard, thirty two times on each side, and each cell covers too much: the lettering is lost for good.', act: m => m.set({ f: 32 }) },
    { t: 'The right scale', home: true, say: 'The raw latents are about five times bigger than the noise the model expects. Forget to scale them, and the colours burn.', act: m => m.set({ f: 8, scale: false }) },
    { t: 'The balance', home: true, say: 'A squeeze of eight, latents scaled to the noise: cheap steps, and the sign still reads.', act: m => m.set({ scale: true }) },
  ],
  check: [
    { q: 'Why run diffusion in a latent space?', options: ['Each step processes far fewer numbers, so it is much cheaper', 'Latents have better colours', 'It removes the need for a decoder'], answer: 0, why: 'The decoder restores the detail once at the end.' },
    { q: 'What goes wrong if the compression factor is too large?', options: ['Fine detail like lettering cannot be stored, so it is lost', 'Steps become slower', 'The noise schedule breaks'], answer: 0, why: 'Each latent cell covers too many pixels.' },
    { q: 'Why are latents multiplied by a scaling factor?', options: ['To bring their spread to about one, matching the noise schedule', 'To make the file smaller', 'To add colour'], answer: 0, why: 'Otherwise the signal is far louder than the model expects.' },
  ],
  terms: [
    ['Latent diffusion', 'Diffusion run on a compressed representation instead of pixels.'],
    ['Compression factor', 'How many times smaller the latent grid is on each side.'],
    ['Latent channels', 'The numbers stored per latent cell, four in Stable Diffusion.'],
    ['Scaling factor', 'A constant that brings latents to unit spread.'],
    ['Perceptual compression', 'Discarding detail people would not notice.'],
    ['Decoder', 'The VAE half that turns a latent back into pixels.'],
  ],
  deeper: '<p><b>Two kinds of compression.</b> The VAE handles perceptual compression, the high-frequency detail eyes barely notice; the diffusion model handles semantic composition, what is in the picture and where.</p><p><b>Newer VAEs</b> use 16 latent channels instead of 4, keeping text and small faces much better at the same squeeze factor.</p><p><b>About this machine.</b> Costs and sizes are exact for a 512-pixel image; the reconstructions show the typical effect of each setting.</p>',
  code: {
    title: 'Encode, diffuse in the latent, decode',
    note: 'Adapted from the course\'s latent diffusion lesson.',
    text: `
import torch

SCALE = 0.18215                                  # brings latents to unit spread

@torch.no_grad()
def generate(vae, unet, sampler, text_emb, size=512, f=8, channels=4):
    z = torch.randn(1, channels, size // f, size // f)     # 64 x 64 x 4, not 512 x 512 x 3
    for t in sampler.timesteps:
        z = sampler.step(unet(z, t, text_emb), t, z)
    return vae.decode(z / SCALE)                            # one decode at the end

def to_latent(vae, image):
    return vae.encode(image).sample() * SCALE              # for training
`,
  },
};
