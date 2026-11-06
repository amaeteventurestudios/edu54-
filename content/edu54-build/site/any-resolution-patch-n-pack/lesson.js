// Any resolution: a land-records office in Kumasi feeds a vision model one batch of three scans: a tall title deed, a wide survey map and a square ID photo.
// Four ways to fit them: squash each to a square, pad each to a big square, tile with a thumbnail (AnyRes), or keep native sizes and pack the patches into one sequence
// (patch-n'-pack) with a block-diagonal mask. The scans show what the encoder sees; the strip below is the packed sequence, grey for padding; the small grid is the mask.
// Token counts, padding waste and distortion are computed live. Break it: squash to squares (the deed's text is crushed), pad to squares (most compute is wasted on
// blank space), pack without the mask (the photo's patches attend to the deed and the map).
const IMGS = [{ n: 'title deed', w: 336, h: 896, c: '#C9A227' }, { n: 'survey map', w: 896, h: 336, c: '#1F9E89' }, { n: 'ID photo', w: 336, h: 336, c: '#7A3B69' }];
const P14 = 14, SIDE = 336;

export default {
  slug: 'any-resolution-patch-n-pack',
  title: 'Any resolution: pack, don\'t squash',
  description: 'A land-records office in Kumasi sends one batch of three scans: a tall title deed, a wide survey map and a square ID photo. Fit them by squashing, padding, tiling or packing native patches into one sequence. Then squash everything square, pad everything square, or pack without the mask.',
  overview: 'Early vision encoders took one fixed square size, so every image was squashed or padded to fit. Squashing distorts tall and wide images, crushing text; padding wastes compute on blank space. AnyRes, used by LLaVA-NeXT with a frozen 336-pixel encoder, cuts a high-resolution image into a grid of tiles that fits its shape and adds a low-resolution thumbnail for context, which keeps detail but multiplies the tokens. NaViT\'s patch-n\'-pack keeps each image at its native shape, turns each into its own run of patches, and concatenates all of them into one sequence per batch with no padding; a block-diagonal mask keeps each image\'s patches attending only to their own image, and per-patch positions, often 2-D or 3-D rotary embeddings as in Qwen2-VL, say where each patch sits. Variable-length attention kernels skip the mask entirely using cumulative lengths. SigLIP 2\'s NaFlex lets one model run at several token budgets, small for retrieval, large for reading documents.',
  keywords: ['any resolution', 'patch-n-pack', 'navit', 'anyres', 'block-diagonal mask', 'aspect ratio'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.4, 0.05], dir: [0.05, 1.15, 1.0], half: 1.7, wide: 7.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 3, mask: true };
    const ink = '#151827', SC = 1 / 430;
    const base = P.box(7.0, 0.12, 3.4, '#E9E2D3', { r: 0.12 }); base.position.set(0.1, 0, 0.1); S.add(base);
    const XS = [-2.35, -0.25, 1.85];
    const docs = IMGS.map((im, k) => {
      const mm = new THREE.MeshLambertMaterial({ color: im.c }), d = P.box(1, 0.05, 1, im.c, { r: 0.02, material: mm }); d.userData.noFit = true; S.add(d);
      const pad = P.box(1, 0.03, 1, '#D9D4C8', { r: 0.02 }); pad.userData.noFit = true; S.add(pad);
      const lines = Array.from({ length: 6 }, () => { const l = P.box(1, 0.02, 0.025, '#151827', { r: 0.005 }); l.userData.noFit = true; S.add(l); return l; });
      const tiles = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#FFFFFF' })); tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
      const t = S.text(im.n, { size: 0.13, weight: 800, color: ink }); t.position.set(XS[k], 0.13, 1.25); S.add(t);
      const v = S.text('', { size: 0.085, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); v.userData.noFit = true; S.add(v);
      return { mm, d, pad, lines, tiles, v };
    });
    const keep = P.box(5.0, 0.2, 2.0, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-0.5, 0.12, -0.1); S.add(keep);
    /* packed sequence strip at the back */
    const strip = P.box(4.6, 0.04, 0.24, '#2B2B38', { r: 0.02 }); strip.position.set(-0.5, 0.12, -1.25); S.add(strip);
    const segs = Array.from({ length: 6 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(1, 0.08, 0.2, '#888', { r: 0.01, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const stT = S.text('', { size: 0.11, weight: 800, color: ink }); stT.position.set(-0.5, 0.13, -1.5); S.add(stT);
    /* mask grid */
    const MX = 2.75, MZ = -1.15;
    const mcells = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(0.3, 0.06, 0.3, '#888', { r: 0.02, material: mm }); b.position.set(MX - 0.32 + j * 0.32, 0.12, MZ - 0.32 + i * 0.32); S.add(b); mcells.push({ mm, i, j }); }
    const mT = S.text('attention mask', { size: 0.1, weight: 800, color: ink }); mT.position.set(MX, 0.13, MZ + 0.62); S.add(mT);

    let R = null;
    function run() {
      const tok = (w, h) => Math.ceil(w / P14) * Math.ceil(h / P14);
      const rows = IMGS.map(im => {
        if (st.mode === 0) return { fw: SIDE, fh: SIDE, real: tok(SIDE, SIDE), padTok: 0, distort: Math.max(im.w / im.h, im.h / im.w) };
        if (st.mode === 1) { const B = 896, real = tok(im.w, im.h); return { fw: B, fh: B, real, padTok: tok(B, B) - real, distort: 1 }; }
        if (st.mode === 2) { const gx = Math.round(im.w / SIDE), gy = Math.round(im.h / SIDE), tiles = gx * gy + (gx * gy > 1 ? 1 : 0); return { fw: im.w, fh: im.h, real: tiles * tok(SIDE, SIDE), padTok: 0, distort: 1, gx, gy }; }
        return { fw: im.w, fh: im.h, real: tok(im.w, im.h), padTok: 0, distort: 1 };
      });
      const total = rows.reduce((a, r) => a + r.real + r.padTok, 0), pad = rows.reduce((a, r) => a + r.padTok, 0);
      return { rows, total, pad, waste: pad / total, worst: Math.max(...rows.map(r => r.distort)), leak: st.mode === 3 && !st.mask };
    }
    function draw() {
      R = run();
      docs.forEach((D, k) => { const im = IMGS[k], r = R.rows[k], w = r.fw * SC, h = r.fh * SC, iw = (st.mode === 1 ? im.w : r.fw) * SC, ih = (st.mode === 1 ? im.h : r.fh) * SC;
        D.pad.visible = st.mode === 1; D.pad.scale.set(w, 1, h); D.pad.position.set(XS[k], 0.13, 0);
        D.d.scale.set(iw, 1, ih); D.d.position.set(XS[k], 0.16, 0);
        // text lines on the deed and map, squashed with the image
        D.lines.forEach((l, i) => { const on = k < 2; l.visible = on; if (!on) return; l.scale.x = iw * 0.8; l.scale.z = Math.max(0.2, (ih / (im.h * SC))) * 1; l.position.set(XS[k], 0.195, -ih / 2 + (i + 1) * ih / 7); });
        const pts = []; if (st.mode === 2 && (r.gx > 1 || r.gy > 1)) { for (let i = 1; i < r.gx; i++) { const x = XS[k] - iw / 2 + i * iw / r.gx; pts.push(x, 0.2, -ih / 2, x, 0.2, ih / 2); } for (let j = 1; j < r.gy; j++) { const z = -ih / 2 + j * ih / r.gy; pts.push(XS[k] - iw / 2, 0.2, z, XS[k] + iw / 2, 0.2, z); } }
        D.tiles.geometry.dispose(); D.tiles.geometry = new THREE.BufferGeometry(); D.tiles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        D.v.userData.set(`${(r.real + r.padTok).toLocaleString('en')} tokens${r.distort > 1.01 ? ` · squashed ${r.distort.toFixed(1)}×` : ''}`); D.v.position.set(XS[k], 0.5, -Math.max(ih, (st.mode === 1 ? h : ih)) / 2 - 0.05); });
      const L = 4.6; let x = -0.5 - L / 2, si = 0;
      R.rows.forEach((r, k) => { [[r.real, IMGS[k].c], [r.padTok, '#C9C5BA']].forEach(([n, c]) => { const S2 = segs[si++]; const w = L * n / Math.max(R.total, 12288); S2.b.visible = n > 0; if (!n) return; S2.b.scale.x = w; S2.b.position.set(x + w / 2, 0.14, -1.25); S2.mm.color.set(c); x += w; }); });
      stT.userData.set(`one sequence: ${R.total.toLocaleString('en')} tokens${R.pad ? `, ${Math.round(R.waste * 100)}% padding` : ''}`);
      mcells.forEach(c => c.mm.color.set(c.i === c.j ? IMGS[c.i].c : R.leak ? '#D64545' : '#3A3D4F'));
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Fit the images by', options: ['Squash to 336²', 'Pad to 896²', 'Tiles + thumbnail', 'Native, packed'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'toggle', label: 'Block-diagonal mask', short: 'mask', get: () => st.mask, set: v => { st.mask = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens in the batch', get: () => ({ v: R.total.toLocaleString('en'), sub: 'patches of 14 px' }) },
      { label: 'Padding', get: () => ({ v: `${Math.round(R.waste * 100)}%`, sub: 'compute on blank space', bad: R.waste > 0.3, good: R.waste === 0 }) },
      { label: 'Worst distortion', get: () => ({ v: `${R.worst.toFixed(1)}×`, sub: 'aspect ratio squeezed', bad: R.worst > 1.2, good: R.worst <= 1.01 }) },
    ];
    const labels = [
      { name: 'scans', t: 'What the encoder sees', d: 'Grey: padding. White lines: tiles', icon: 'eye', atV: V(-3.0, 0.2, 0) },
      { name: 'mask', t: 'Who attends to whom', d: 'Red: across images', icon: 'target', atV: V(MX + 0.55, 0.15, MZ) },
    ];
    const reset = () => { Object.assign(st, { mode: 3, mask: true }); draw(); };
    const breaks = [
      { label: 'Squash to squares', hint: '336 × 336 each', on: () => { reset(); st.mode = 0; draw(); }, off: reset },
      { label: 'Pad to squares', hint: '896 × 896 each', on: () => { reset(); st.mode = 1; draw(); }, off: reset },
      { label: 'Pack without the mask', hint: 'One sequence, no blocks', on: () => { reset(); st.mask = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 0) return { ok: false, msg: `<b>The deed's text is crushed.</b> Squashing every scan to 336 × 336 keeps the token count low (${R.total.toLocaleString('en')}) but squeezes the tall deed and the wide map ${R.worst.toFixed(1)} times along one side, so each line of text becomes a smear and the plot numbers cannot be read. Keep the native aspect ratio.` };
      if (st.mode === 1) return { ok: false, msg: `<b>${Math.round(R.waste * 100)}% of the compute is blank space.</b> Padding every scan to 896 × 896 keeps their shapes, but the batch becomes ${R.total.toLocaleString('en')} tokens, of which ${R.pad.toLocaleString('en')} are padding. Packing native patches into one sequence needs only ${(R.total - R.pad).toLocaleString('en')}.` };
      if (R.leak) return { ok: false, msg: `<b>The ID photo attends to the deed and the map.</b> All three scans are packed into one sequence, and without a block-diagonal mask every patch can attend to every other, so features from one document leak into another's answer. Mask attention to each image's own block, or use a variable-length kernel with cumulative lengths.` };
      return { ok: true, msg: `<b>${R.total.toLocaleString('en')} tokens, no padding, no squashing.</b> ${st.mode === 2 ? 'Tiles keep detail and the thumbnail gives context, at extra tokens for the deed and map.' : 'Each scan keeps its native shape as its own run of patches, packed into one sequence, with a block-diagonal mask keeping each run to itself.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three scans', home: true, say: 'A land-records office in Kumasi sends three scans in one batch: a tall title deed, a wide survey map and a square ID photo.', act: m => m.set({ mode: 3, mask: true }) },
    { t: 'Squash', home: true, say: 'Squash each to a fixed square, and the deed\'s text is crushed, and the plot numbers cannot be read.', act: m => m.set({ mode: 0 }) },
    { t: 'Pad', home: true, say: 'Pad each to a big square instead, and most of the compute goes on blank space.', act: m => m.set({ mode: 1 }) },
    { t: 'Tile', home: true, say: 'Tiling with a thumbnail keeps detail with a frozen encoder, but the tall and wide scans cost several tiles each.', act: m => m.set({ mode: 2 }) },
    { t: 'Pack', home: true, say: 'Keep each scan at its native shape and pack the patches into one sequence. No padding, no squashing.', act: m => m.set({ mode: 3 }) },
    { t: 'Mask the blocks', home: true, say: 'Pack without a mask, and patches attend across documents. A block-diagonal mask keeps each scan to itself.', act: m => m.set({ mask: false }) },
  ],
  check: [
    { q: 'What goes wrong when tall documents are squashed to a square?', options: ['Text is distorted and can become unreadable', 'They use more tokens', 'Nothing'], answer: 0, why: 'The aspect ratio is squeezed.' },
    { q: 'What does patch-n\'-pack do?', options: ['Packs each image\'s native patches into one sequence with no padding', 'Resizes every image to 224', 'Drops all large images'], answer: 0, why: 'One sequence per batch.' },
    { q: 'Why does a packed batch need a block-diagonal mask?', options: ['So each image\'s patches attend only within that image', 'To speed up loading', 'To add padding'], answer: 0, why: 'Otherwise images leak into each other.' },
  ],
  terms: [
    ['Native resolution', 'Using an image at its own size and shape.'],
    ['Patch-n\'-pack', 'Concatenating variable-length patch runs into one sequence.'],
    ['Block-diagonal mask', 'Attention allowed only within each image\'s block.'],
    ['AnyRes', 'Tiling a large image for a fixed-size encoder, plus a thumbnail.'],
    ['Padding', 'Blank filler that costs compute but carries nothing.'],
    ['NaFlex', 'One model serving several token budgets.'],
  ],
  deeper: '<p><b>Documents are not square.</b> Land titles, receipts, forms and newspaper columns are tall; maps and panoramas are wide. Registries digitising records across Ghana, Kenya and Rwanda need models that read them at their real shape.</p><p><b>Kernels.</b> Variable-length attention takes cumulative sequence lengths and never builds the dense mask, which is much faster for packed batches.</p><p><b>About this machine.</b> Token counts, padding, distortion and the mask are computed live for 14-pixel patches and a 336-pixel tile size.</p>',
  code: {
    title: 'Pack native patches with a block mask',
    note: 'Adapted from the course\'s any-resolution lesson.',
    text: `
import torch

def pack(images, patchify):
    seqs = [patchify(im) for im in images]        # each (n_i, dim), native shape
    lens = torch.tensor([len(s) for s in seqs])
    x = torch.cat(seqs)                            # one sequence, no padding
    ids = torch.repeat_interleave(torch.arange(len(seqs)), lens)
    mask = ids[:, None] == ids[None, :]            # block-diagonal
    cu = torch.cat([torch.zeros(1, dtype=torch.long), lens.cumsum(0)])  # for varlen kernels
    return x, mask, cu
`,
  },
};
