// Inpainting, outpainting and editing: a photo of a hillside street in Kigali with a delivery truck parked in the way. Paint a mask over the truck and the model fills the hole
// so it matches its surroundings; widen the canvas and it continues the scene outwards; or partly noise the whole photo and denoise it towards a new prompt (an edit).
// Boards: the photo with the mask (red), and the result. The edit-strength dial sets how much noise is added before denoising: little keeps the photo, a lot repaints it.
// Break it: a mask drawn too tight (a dark halo of the truck stays), paste the fill back with no blending (a hard seam), edit strength 0.95 (the street itself is repainted).
const W = 40, H = 22;
function street(x, y) {   // x, y in grid units (can be outside 0..W for outpainting)
  const sky = y < 6 - Math.sin(x * 0.18) * 1.5;
  if (sky) return [0.62, 0.78, 0.92];
  if (y < 10 && ((x % 9) < 7)) { const b = Math.floor(x / 9) % 3; return y < 7 ? [[0.78, 0.36, 0.25], [0.3, 0.45, 0.6], [0.85, 0.7, 0.35]][b] : [0.92, 0.88, 0.8]; }
  if (y < 12) return [0.32, 0.55, 0.3];
  if (y < 14) return [0.75, 0.72, 0.68];
  return (Math.floor(x / 3) + y) % 7 === 0 ? [0.95, 0.95, 0.9] : [0.38, 0.38, 0.4];
}
const TRUCK = { x0: 14, x1: 26, y0: 10, y1: 19 };
function truck(x, y) {
  if (x < TRUCK.x0 || x >= TRUCK.x1 || y < TRUCK.y0 || y >= TRUCK.y1) return null;
  if (y >= TRUCK.y1 - 2 && ((x - TRUCK.x0) % 8 < 3)) return [0.08, 0.08, 0.08];
  if (x >= TRUCK.x1 - 4) return y < TRUCK.y0 + 3 ? [0.55, 0.75, 0.85] : [0.85, 0.2, 0.15];
  return [0.92, 0.92, 0.92];
}

export default {
  slug: 'inpainting-outpainting-editing',
  title: 'Inpainting and editing: changing part of a photo',
  description: 'A photo of a hillside street in Kigali with a delivery truck parked in the way. Mask the truck and the model fills the hole to match its surroundings; widen the canvas and it continues the street; or noise the photo part way and denoise it towards a new prompt. Then draw the mask too tight, paste the fill back without blending, or push the edit strength too far.',
  overview: 'Diffusion models can change part of a picture as well as make new ones. For inpainting, a mask marks the region to replace; at every denoising step the unmasked pixels are reset to the original (noised to the right level), so the model only invents the hole, and does so to match what surrounds it. Outpainting is the same trick on an enlarged canvas whose new border is the mask. Editing without a mask, often called SDEdit, adds noise to the whole photo up to some strength and then denoises it with a new prompt: low strength keeps the structure, high strength repaints everything. Good results need a mask a little larger than the object and blending at the edges.',
  keywords: ['inpainting', 'outpainting', 'sdedit image editing', 'mask blending', 'diffusion editing strength'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'inpaint', pad: 1, blend: true, strength: 0.4 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const CELL = 0.065, EXT = 6, GW = W + 2 * EXT, BW = GW * CELL, BH = H * CELL, BY = 0.12 + 0.3, BZ = -0.5;
    const mkBoard = (x, title, top) => {
      const b = P.box(BW + 0.15, BH + 0.5, 0.08, '#FBF8F1', { r: 0.04 }); b.position.set(x, 0.12, BZ); S.add(b);
      const t = S.text(title, { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW }); t.position.set(x, BY + BH + 0.13, BZ + 0.045); S.add(t);
      const tp = S.text(top, { size: 0.07, weight: 800 }); tp.position.set(x, 0.12 + BH + 0.505, BZ); S.add(tp);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), GW * H); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let k = 0; k < GW * H; k++) { dummy.position.set(x - BW / 2 + (k % GW + 0.5) * CELL, BY + BH - (Math.floor(k / GW) + 0.5) * CELL, BZ + 0.045); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true; return m;
    };
    const inB = mkBoard(-1.62, 'the photo and the mask (red)', 'input'), outB = mkBoard(1.62, '', 'result');
    const outT = S.text('', { size: 0.065, weight: 800, face: 'front', color: ink, maxW: BW }); outT.position.set(1.62, BY + BH + 0.13, BZ + 0.05); S.add(outT);
    const part = (x, w, c, name, sub) => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(w, 0.3, 0.45, c, { r: 0.05, material: m }); b.position.set(x, 0.12, 0.85); S.add(b); const t = S.text(name, { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.32, 1.08); S.add(t); const u = S.text(sub, { size: 0.05, weight: 800, face: 'front', color: '#FFFFFF', maxW: w - 0.05 }); u.position.set(x, 0.2, 1.08); S.add(u); return { b, m, u }; };
    const pMask = part(-1.6, 1.3, C.red, 'mask', ''), pDen = part(0, 1.3, C.indigo, 'denoiser', ''), pBlend = part(1.6, 1.3, C.teal, 'blend back', '');
    /* ---------- the model ---------- */
    let R = null;
    function render() {
      const inImg = [], outImg = [], mask = [];
      let s = 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let y = 0; y < H; y++) for (let gx = 0; gx < GW; gx++) {
        const x = gx - EXT, inside = x >= 0 && x < W, orig = inside ? (truck(x, y) || street(x, y)) : null;
        let m = 0;
        if (st.mode === 'inpaint') { const p = st.pad; m = x >= TRUCK.x0 - p && x < TRUCK.x1 + p && y >= TRUCK.y0 - p && y < TRUCK.y1 + p ? 1 : 0; }
        if (st.mode === 'outpaint') m = inside ? 0 : 1;
        mask.push(m);
        inImg.push(inside ? orig : null);
        let o;
        if (st.mode === 'edit') {
          if (!inside) { o = null; } else {
            const sNoise = st.strength, layoutShift = sNoise > 0.8 ? Math.round((sNoise - 0.8) * 30) : 0;
            const fresh = street(x + layoutShift * 2, y + (sNoise > 0.8 ? 1 : 0)), golden = [fresh[0] * 1.08 + 0.05, fresh[1] * 0.95, fresh[2] * 0.75];
            const keepTruck = sNoise < 0.6 ? truck(x, y) : sNoise < 0.8 ? (truck(x, y) && r() < 0.5 ? truck(x, y) : null) : null;
            const basec = keepTruck || (sNoise > 0.8 ? fresh : street(x, y));
            const tint = Math.min(1, sNoise * 1.2); o = basec.map((v, ch) => v * (1 - tint) + golden[ch] * tint);
          }
        } else if (m) {
          // the model's fill: plausible street, with a little texture
          let fill = street(x, y).map(v => v + (r() - 0.5) * 0.04);
          if (!st.blend) fill = fill.map(v => v * 0.86 + 0.06);
          o = fill;
        } else {
          o = orig;
          // a mask drawn too tight leaves the truck's dark outline
          if (st.mode === 'inpaint' && st.pad === 0 && orig) { const near = x >= TRUCK.x0 - 1 && x <= TRUCK.x1 && y >= TRUCK.y0 - 1 && y <= TRUCK.y1; if (near && !truck(x, y)) o = orig.map(v => v * 0.55); }
        }
        outImg.push(o);
      }
      return { inImg, outImg, mask };
    }
    function draw() {
      const { inImg, outImg, mask } = render();
      inImg.forEach((c, k) => { if (!c) col.set(mask[k] ? '#E9A39A' : '#E6E1D6'); else { col.setRGB(...c, THREE.SRGBColorSpace); if (mask[k]) col.lerp(new THREE.Color(C.red), 0.55); } inB.setColorAt(k, col); });
      outImg.forEach((c, k) => { if (!c) col.set('#E6E1D6'); else col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace); outB.setColorAt(k, col); });
      inB.instanceColor.needsUpdate = true; outB.instanceColor.needsUpdate = true;
      outT.userData.set(st.mode === 'inpaint' ? 'truck removed' : st.mode === 'outpaint' ? 'street continued both ways' : `edited towards "golden evening", strength ${st.strength}`);
      pMask.u.userData.set(st.mode === 'inpaint' ? (st.pad ? 'truck plus a margin' : 'traced tight') : st.mode === 'outpaint' ? 'the new border' : 'no mask'); pMask.m.color.set(st.mode === 'edit' ? '#9A9AA6' : C.red);
      pDen.u.userData.set(st.mode === 'edit' ? `from ${Math.round(st.strength * 100)}% noise` : 'fills only the mask');
      pBlend.u.userData.set(st.blend ? 'soft edge' : 'hard paste'); pBlend.m.color.set(st.blend ? C.teal : '#9A9AA6');
      R = {};
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Task', options: ['Inpaint the truck', 'Outpaint wider', 'Edit the whole photo'], get: () => ['inpaint', 'outpaint', 'edit'].indexOf(st.mode), act: i => { st.mode = ['inpaint', 'outpaint', 'edit'][i]; draw(); } },
      { type: 'buttons', label: 'Mask margin', options: ['Traced tight', '1 pixel', '3 pixels'], get: () => [0, 1, 3].indexOf(st.pad), act: i => { st.pad = [0, 1, 3][i]; draw(); } },
      { type: 'toggle', label: 'Blend the fill into the photo', short: 'blend', get: () => st.blend, set: v => { st.blend = v; draw(); } },
      { type: 'slider', label: 'Edit strength (noise added first)', min: 0.1, max: 0.95, step: 0.05, get: () => st.strength, set: v => { st.strength = v; draw(); } },
    ];
    const readouts = [
      { label: 'Truck', get: () => ({ v: st.mode === 'edit' ? (st.strength < 0.6 ? 'still there' : st.strength < 0.8 ? 'half gone' : 'gone') : st.mode === 'inpaint' ? (st.pad ? 'gone' : 'outline left') : 'still there', sub: st.mode, good: st.mode === 'inpaint' && st.pad > 0, bad: st.mode === 'inpaint' && st.pad === 0 }) },
      { label: 'Seam', get: () => ({ v: st.blend ? 'invisible' : 'visible', good: st.blend, bad: !st.blend && st.mode !== 'edit' }) },
      { label: 'Rest of the photo', get: () => ({ v: st.mode === 'edit' ? (st.strength > 0.8 ? 'repainted' : st.strength > 0.5 ? 'restyled' : 'kept') : 'untouched', good: st.mode !== 'edit' || st.strength <= 0.6, bad: st.mode === 'edit' && st.strength > 0.8 }) },
    ];
    const labels = [
      { name: 'input', t: 'Photo and mask', d: 'Red: the part to replace', icon: 'eye', atV: V(-1.62 - BW / 2 - 0.08, BY + BH * 0.6, BZ) },
      { name: 'output', t: 'The result', d: 'Only the masked part is new', icon: 'spark', atV: V(1.62 + BW / 2 + 0.08, BY + BH * 0.6, BZ) },
      { name: 'parts', t: 'Mask, denoise, blend', d: 'The steps of inpainting', icon: 'link', atV: V(-2.3, 0.25, 0.85) },
    ];
    const reset = () => { Object.assign(st, { mode: 'inpaint', pad: 1, blend: true, strength: 0.4 }); draw(); };
    const breaks = [
      { label: 'Mask traced too tight', hint: 'No margin around the truck', on: () => { reset(); st.pad = 0; draw(); }, off: reset },
      { label: 'Paste without blending', hint: 'Hard edge between fill and photo', on: () => { reset(); st.blend = false; draw(); }, off: reset },
      { label: 'Edit strength 0.95', hint: 'Nearly pure noise first', on: () => { reset(); st.mode = 'edit'; st.strength = 0.95; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 'edit') {
        if (st.strength > 0.8) return { ok: false, msg: `<b>A different street.</b> At strength ${st.strength} almost all of the photo is drowned in noise before denoising, so the model repaints from the prompt with little left of the original: the buildings shift and the truck is gone along with them. Strengths of 0.3 to 0.6 restyle while keeping the scene.` };
        return { ok: true, msg: `<b>Restyled, same street.</b> The photo is noised to ${Math.round(st.strength * 100)}% and denoised towards "golden evening": enough noise to change the light and colours, not enough to lose where the buildings and the truck are. To remove the truck, use a mask instead.` };
      }
      if (st.mode === 'inpaint' && st.pad === 0) return { ok: false, msg: `<b>A ghost of the truck.</b> The mask was traced exactly on the truck, but its shadow and the dark edge around it sit just outside, so they are kept as part of the photo. The model fills the hole neatly and leaves a dark halo. Masks should be a few pixels larger than the object.` };
      if (!st.blend) return { ok: false, msg: `<b>A visible seam.</b> The filled region is pasted back with a hard edge, and its brightness is slightly different from the photo around it, so a rectangle shows. Feathering the mask edge and blending in the latent at every step hides the join.` };
      return { ok: true, msg: st.mode === 'outpaint' ? `<b>The street continues.</b> The canvas is wider and its new border is the mask; at each step the original part is held fixed, so the model extends the sky, the houses and the road to match.` : `<b>The truck is gone.</b> The mask covers the truck with a small margin; at each denoising step the rest of the photo is reset to the original, so the model only invents the road and wall behind the truck, matched to the surroundings, and the edge is blended.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A truck in the way', home: true, say: 'A hillside street in Kigali, with a delivery truck parked in the way. We want the street without it.', act: m => m.set({ mode: 'inpaint', pad: 1, blend: true, strength: 0.4 }) },
    { t: 'Mask and fill', home: true, say: 'Paint a mask over the truck. At every denoising step, everything outside the mask is reset to the photo, so the model only invents what was behind the truck.', act: m => m.set({}) },
    { t: 'Too tight', home: true, say: 'Trace the mask too tightly, and the truck\'s shadow and edge stay behind as a dark halo.', act: m => m.set({ pad: 0 }) },
    { t: 'Seams', home: true, say: 'Paste the fill back with a hard edge, and its slightly different brightness shows as a rectangle. Blending hides the join.', act: m => m.set({ pad: 1, blend: false }) },
    { t: 'Outpainting', home: true, say: 'Widen the canvas, and make the new border the mask. The model continues the sky, the houses and the road.', act: m => m.set({ blend: true, mode: 'outpaint' }) },
    { t: 'Editing the whole photo', home: true, say: 'Or noise the whole photo part way and denoise it towards "golden evening". A little noise restyles it; too much, and it becomes a different street.', act: m => m.set({ mode: 'edit', strength: 0.95 }) },
  ],
  check: [
    { q: 'How does inpainting keep the unmasked part unchanged?', options: ['At each step, pixels outside the mask are reset to the original', 'It never touches the image', 'It blurs everything else'], answer: 0, why: 'The model only fills the hole.' },
    { q: 'Why make the mask a bit larger than the object?', options: ['So shadows and edges around it are replaced too', 'To speed it up', 'Masks must be square'], answer: 0, why: 'Otherwise a halo remains.' },
    { q: 'What does a high edit strength do in SDEdit-style editing?', options: ['Adds so much noise that the original structure is lost', 'Keeps the photo exactly', 'Removes the prompt'], answer: 0, why: 'Low strengths restyle; high strengths repaint.' },
  ],
  terms: [
    ['Inpainting', 'Filling a masked region so it matches its surroundings.'],
    ['Outpainting', 'Extending an image beyond its original borders.'],
    ['Mask', 'A map marking which pixels to replace.'],
    ['SDEdit', 'Editing by noising an image part way and denoising with a new prompt.'],
    ['Edit strength', 'How much noise is added before denoising.'],
    ['Feathering', 'Softening a mask\'s edge so the fill blends in.'],
  ],
  deeper: '<p><b>Dedicated inpainting models</b> receive the mask and the masked photo as extra input channels during training, which gives better fills than resetting pixels in a normal model.</p><p><b>Instruction editing.</b> Models trained on before-and-after pairs can follow commands like "remove the truck" without a hand-drawn mask.</p><p><b>About this machine.</b> The fills and edits are drawn from the scene to show each setting\'s typical effect.</p>',
  code: {
    title: 'Inpainting by resetting the unmasked region',
    note: 'Adapted from the course\'s inpainting lesson.',
    text: `
import torch

@torch.no_grad()
def inpaint(model, sampler, image_latent, mask, prompt_emb):
    z = torch.randn_like(image_latent)
    for t in sampler.timesteps:
        z = sampler.step(model(z, t, prompt_emb), t, z)
        known = sampler.add_noise(image_latent, torch.randn_like(z), t)   # the photo at this noise level
        z = mask * z + (1 - mask) * known                                   # keep everything outside the mask
    return z

def sdedit(model, sampler, image_latent, prompt_emb, strength=0.4):
    start = int(len(sampler.timesteps) * (1 - strength))
    z = sampler.add_noise(image_latent, torch.randn_like(image_latent), sampler.timesteps[start])
    for t in sampler.timesteps[start:]:
        z = sampler.step(model(z, t, prompt_emb), t, z)
    return z
`,
  },
};
