// Vision transformers, inside: a team mapping smallholder fields in Mali runs a ViT over satellite tiles to outline every field. The tile is cut into patches (the grid);
// each patch is a token; the bars show how many tokens there are and what global or windowed attention costs; the overlay is the field map the model draws from its patch tokens.
// Fields are drawn procedurally; token counts, attention cost and the map's overlap with the true fields (IoU, at patch resolution) are computed live.
// Break it: a 1024-pixel tile with global attention (4,096 tokens, the cost explodes), the [CLS] token alone (one vector cannot draw a map),
// a model trained at 224 pixels run at 448 without stretching its position embeddings (three quarters of the patches have no position).
const SIZES = [224, 448, 1024], G = 128;
function field(u, v) {   // u, v in 0..1: is this point inside a cultivated field?
  const rows = Math.floor(v * 7 + Math.sin(u * 5) * 0.4), cols = Math.floor(u * 6 + Math.cos(v * 4) * 0.5);
  const h = Math.sin(rows * 12.9898 + cols * 78.233) * 43758.5453, r = h - Math.floor(h);
  const track = Math.abs(Math.sin(u * 23 + v * 3)) < 0.06 || Math.abs(v - 0.52 - 0.05 * Math.sin(u * 9)) < 0.018;
  return r > 0.35 && !track;
}
const TRUTH = Array.from({ length: G }, (_, j) => Array.from({ length: G }, (_, i) => field((i + 0.5) / G, (j + 0.5) / G)));

export default {
  slug: 'vision-transformers-2',
  title: 'Vision transformers, inside',
  description: 'A team mapping smallholder fields in Mali runs a vision transformer over satellite tiles. See how image size and patch size set the number of tokens, what attention costs, and how patch tokens become a field map. Then run a big tile with global attention, use the [CLS] token alone, or forget to stretch the position embeddings.',
  overview: 'A vision transformer cuts an image into patches, flattens each, and projects it to a vector with one learned matrix, which is the same as a convolution whose kernel and stride equal the patch size. A learnable [CLS] token is prepended, position embeddings are added, and a standard transformer encoder, identical to BERT\'s, processes the sequence. The number of tokens is the image area divided by the patch area, so halving the patch size or doubling the image quadruples the tokens, and global attention cost grows with the square of that. Swin limits attention to local windows to keep cost linear. For classification the [CLS] token\'s final state is enough; for dense tasks such as segmentation each patch token is decoded, which is why models like DINOv2 and SAM use patch features. Position embeddings are learned for one grid size, so running at a higher resolution requires interpolating them to the new grid.',
  keywords: ['vision transformer', 'patch embedding', 'cls token', 'window attention', 'segmentation', 'position interpolation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.4, 0.1], dir: [0.1, 1.1, 1.0], half: 1.6, wide: 5.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { size: 0, patch: 0, win: false, cls: false, interp: true };
    const ink = '#151827', TS = 2.5, TX = -1.25, TZ = 0;
    const base = P.box(5.4, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0.1, 0, 0.1); S.add(base);
    /* the satellite tile, drawn on a canvas texture */
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g2 = cv.getContext('2d');
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const f = field((i + 0.5) / 256, (j + 0.5) / 256), n = (Math.sin(i * 0.9) * Math.cos(j * 1.3) + 1) * 6;
      g2.fillStyle = f ? `rgb(${120 + n},${150 + n},${70})` : `rgb(${200 + n},${170 + n},${120 + n})`; g2.fillRect(i, j, 1, 1); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(TS, TS), new THREE.MeshBasicMaterial({ map: tex })); tile.rotation.x = -Math.PI / 2; tile.position.set(TX, 0.2, TZ); S.add(tile);
    const frame = P.box(TS + 0.12, 0.06, TS + 0.12, '#2B2B38', { r: 0.03 }); frame.position.set(TX, 0.12, TZ); S.add(frame);
    const grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.7 })); grid.layers.set(1); grid.userData.noFit = true; S.add(grid);
    const ov = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.45, depthWrite: false }), 128 * 128); ov.frustumCulled = false; ov.layers.set(1); ov.userData.noFit = true; S.add(ov);
    const tT = S.text('', { size: 0.12, weight: 800, color: ink }); tT.position.set(TX, 0.13, TZ + TS / 2 + 0.25); S.add(tT);
    /* cost bars on the right */
    const BX = 0.85, bars = ['Tokens', 'Attention cost', 'Field map match'].map((n, k) => { const x = BX + k * 0.85;
      const mm = new THREE.MeshLambertMaterial({ color: [C.plum, C.coral, '#1F9E89'][k] }), b = P.box(0.5, 1, 0.5, '#888', { r: 0.04, material: mm }); b.position.set(x, 0.12, -0.3); b.userData.noFit = true; S.add(b);
      const pl = P.box(0.72, 0.2, 0.1, '#FBF8F1', { r: 0.02 }); pl.position.set(x, 0.12, 0.15); S.add(pl);
      const f = S.text(n, { size: 0.09, weight: 800, face: 'front', color: ink, maxW: 0.68 }); f.position.set(x, 0.22, 0.205); S.add(f);
      const v = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); v.userData.noFit = true; S.add(v); return { b, mm, v, x }; });
    const keep = P.box(0.5, 1.6, 0.5, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(BX + 0.85, 0.12, -0.3); S.add(keep);

    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function run() {
      const img = SIZES[st.size], p = [16, 8][st.patch], side = img / p, N = side * side;
      const cost = st.win ? N * 49 : N * N, costRel = cost / (196 * 196);
      // the map the model draws: one label per patch from the majority of truth inside it (on our 64-grid); patches without positions are guessed
      const cells = Math.min(side, G), k = G / cells, trainedSide = 224 / p;
      const lab = [], noPos = [];
      for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
        let c = 0, n = 0; for (let y = Math.floor(j * k); y < Math.floor((j + 1) * k); y++) for (let x = Math.floor(i * k); x < Math.floor((i + 1) * k); x++) { c += TRUTH[y][x]; n++; }
        const missing = !st.interp && (i >= trainedSide * cells / side || j >= trainedSide * cells / side);
        const h = Math.sin(i * 91.7 + j * 47.3) * 9999, rnd = h - Math.floor(h);
        lab.push(st.cls ? null : missing ? rnd > 0.5 : c / n > 0.5); noPos.push(missing);
      }
      const clsLabel = TRUTH.flat().filter(Boolean).length > G * G / 2;
      let inter = 0, uni = 0;
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const ci = Math.floor(x / k), cj = Math.floor(y / k), pr = st.cls ? clsLabel : lab[cj * cells + ci], tr = TRUTH[y][x]; if (pr && tr) inter++; if (pr || tr) uni++; }
      return { img, p, side, N, cost, costRel, cells, lab, noPos, iou: inter / uni, clsLabel };
    }
    function draw() {
      R = run();
      const pts = [], n = R.cells, step = TS / n;
      if (n <= 128) for (let i = 0; i <= n; i++) { const a = -TS / 2 + i * step; pts.push(TX + a, 0.205, TZ - TS / 2, TX + a, 0.205, TZ + TS / 2, TX - TS / 2, 0.205, TZ + a, TX + TS / 2, 0.205, TZ + a); }
      grid.geometry.dispose(); grid.geometry = new THREE.BufferGeometry(); grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); grid.material.opacity = n > 40 ? 0.25 : 0.7;
      let idx = 0;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const L = st.cls ? R.clsLabel : R.lab[j * n + i], miss = R.noPos[j * n + i];
        m4.makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeScale(step * 0.92, 1, step * 0.92)).setPosition(TX - TS / 2 + (i + 0.5) * step, 0.21, TZ - TS / 2 + (j + 0.5) * step);
        ov.setMatrixAt(idx, m4); ov.setColorAt(idx, col.set(miss ? '#D64545' : L ? '#1F9E89' : '#C9A227')); idx++; }
      ov.count = idx; ov.instanceMatrix.needsUpdate = true; if (ov.instanceColor) ov.instanceColor.needsUpdate = true;
      tT.userData.set(`${R.img} × ${R.img} px · ${R.p} px patches · ${R.side} × ${R.side} grid`);
      const hs = [Math.min(1.6, Math.log10(R.N) / 4.2 * 1.6), Math.min(1.6, Math.max(0.03, Math.log10(1 + R.costRel) / 3 * 1.6)), Math.max(0.03, R.iou * 1.6)];
      bars.forEach((B, k) => { B.b.scale.y = hs[k]; B.v.position.set(B.x, 0.12 + hs[k] + 0.15, -0.3); B.v.userData.set([R.N.toLocaleString('en'), `${R.costRel < 10 ? R.costRel.toFixed(1) : Math.round(R.costRel).toLocaleString('en')}×`, `${Math.round(R.iou * 100)}%`][k]);
        B.mm.color.set(k === 1 && R.costRel > 100 ? '#D64545' : k === 2 && R.iou < 0.6 ? '#D64545' : [C.plum, C.coral, '#1F9E89'][k]); });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Tile size', options: SIZES.map(s => `${s} px`), get: () => st.size, act: i => { st.size = i; draw(); } },
      { type: 'buttons', label: 'Patch size', options: ['16 px', '8 px'], get: () => st.patch, act: i => { st.patch = i; draw(); } },
      { type: 'buttons', label: 'Attention', options: ['Global', 'Windows of 7 × 7'], get: () => (st.win ? 1 : 0), act: i => { st.win = !!i; draw(); } },
      { type: 'buttons', label: 'Map drawn from', options: ['Patch tokens', '[CLS] token only'], get: () => (st.cls ? 1 : 0), act: i => { st.cls = !!i; draw(); } },
      { type: 'toggle', label: 'Stretch position embeddings to the new size', short: 'interpolate', get: () => st.interp, set: v => { st.interp = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: R.N.toLocaleString('en'), sub: '(tile ÷ patch) squared' }) },
      { label: 'Attention cost', get: () => ({ v: `${R.costRel < 10 ? R.costRel.toFixed(1) : Math.round(R.costRel).toLocaleString('en')}×`, sub: 'versus 224 px, 16 px, global', bad: R.costRel > 100, good: R.costRel <= 20 }) },
      { label: 'Field map match', get: () => ({ v: `${Math.round(R.iou * 100)}%`, sub: 'overlap with true fields (IoU)', good: R.iou >= 0.7, bad: R.iou < 0.6 }) },
    ];
    const labels = [
      { name: 'tile', t: 'Satellite tile', d: 'Green: field, gold: not. Red: no position', icon: 'eye', atV: V(TX - TS / 2 - 0.1, 0.2, TZ) },
      { name: 'bars', t: 'Tokens and cost', d: 'And how well the map fits', icon: 'scale', atV: V(BX + 2.05, 0.6, -0.3) },
    ];
    const reset = () => { Object.assign(st, { size: 0, patch: 0, win: false, cls: false, interp: true }); draw(); };
    const breaks = [
      { label: 'Big tile, global attention', hint: '1024 px', on: () => { reset(); st.size = 2; draw(); }, off: reset },
      { label: '[CLS] token only', hint: 'For a map', on: () => { reset(); st.cls = true; draw(); }, off: reset },
      { label: 'Positions not stretched', hint: 'Trained at 224, run at 448', on: () => { reset(); st.size = 1; st.interp = false; draw(); }, off: reset },
    ];
    function status() {
      const c = R.costRel < 10 ? R.costRel.toFixed(1) : Math.round(R.costRel).toLocaleString('en'), iou = Math.round(R.iou * 100);
      if (st.cls) return { ok: false, msg: `<b>One vector cannot draw a map.</b> The [CLS] token summarises the whole tile, which is right for "is this farmland?" but here gives a single answer, "${R.clsLabel ? 'field' : 'not field'}", for every pixel: ${iou}% overlap with the true fields. Segmentation decodes every patch token instead.` };
      if (!R.noPos.every(x => !x)) return { ok: false, msg: `<b>Three quarters of the patches have no position.</b> The model learned position embeddings for a ${224 / R.p} × ${224 / R.p} grid. At ${R.img} pixels the grid is ${R.side} × ${R.side}, and without interpolating the embeddings to the new grid, the patches outside the old one (red) are lost: the map falls to ${iou}%. Stretch the embeddings when you change resolution.` };
      if (R.costRel > 100) return { ok: false, msg: `<b>${R.N.toLocaleString('en')} tokens, ${c}× the attention cost.</b> At ${R.img} pixels with ${R.p}-pixel patches, global attention compares every token with every other, and cost grows with the square of the count. Window attention, as in Swin, keeps it to ${Math.round(R.N * 49 / (196 * 196))}× by attending within 7 × 7 neighbourhoods; or cut the tile into smaller ones.` };
      return { ok: true, msg: `<b>${R.N.toLocaleString('en')} tokens, map overlap ${iou}%.</b> Each ${R.p}-pixel patch becomes one token; ${st.win ? 'window attention keeps cost linear' : 'global attention is affordable at this size'} (${c}× the 224-pixel baseline), and decoding every patch token draws the fields. ${R.p === 8 ? 'Smaller patches trace field edges more finely.' : 'Smaller patches would trace edges more finely, at four times the tokens.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Mapping fields', home: true, say: 'A team mapping smallholder fields in Mali runs a vision transformer over satellite tiles to outline every field.', act: m => m.set({ size: 0, patch: 0, win: false, cls: false, interp: true }) },
    { t: 'Patches are tokens', home: true, say: 'The tile is cut into sixteen-pixel patches. Each becomes one token, and every token can attend to every other.', act: m => m.set({}) },
    { t: 'Smaller patches', home: true, say: 'Halve the patch size, and field edges are traced more finely, but there are four times the tokens.', act: m => m.set({ patch: 1 }) },
    { t: 'A bigger tile', home: true, say: 'A thousand-pixel tile with global attention means four thousand tokens. The cost grows with the square.', act: m => m.set({ patch: 0, size: 2 }) },
    { t: 'Windows', home: true, say: 'Attend only within small windows, as Swin does, and the cost grows in a straight line instead.', act: m => m.set({ win: true }) },
    { t: 'Patch tokens draw maps', home: true, say: 'The class token summarises the whole tile. To draw a map, decode every patch token instead.', act: m => m.set({ size: 0, win: false, cls: true }) },
  ],
  check: [
    { q: 'How many tokens does a 448-pixel image with 16-pixel patches give?', options: ['784', '448', '28'], answer: 0, why: '(448 ÷ 16) squared = 28 × 28.' },
    { q: 'Why do segmentation models decode patch tokens rather than the [CLS] token?', options: ['A map needs an answer for every region, not one summary', 'The [CLS] token is not trained', 'Patch tokens are smaller'], answer: 0, why: '[CLS] gives one vector for the whole image.' },
    { q: 'What must you do to position embeddings when running at a higher resolution?', options: ['Interpolate them to the new grid', 'Delete them', 'Nothing'], answer: 0, why: 'They were learned for one grid size.' },
  ],
  terms: [
    ['Patch embedding', 'Flattening a patch and projecting it to a vector; a strided convolution.'],
    ['[CLS] token', 'A learned extra token whose final state summarises the image.'],
    ['Patch token', 'The output for one patch, used for dense tasks.'],
    ['Window attention', 'Attention limited to local windows, as in Swin.'],
    ['IoU', 'Intersection over union: how much two masks overlap.'],
    ['Position interpolation', 'Resizing learned position embeddings to a new grid.'],
  ],
  deeper: '<p><b>Mapping farms across Africa.</b> Field boundary maps from satellite images help plan extension services, estimate harvests and support land rights. Smallholder fields are small and irregular, so patch size and resolution matter.</p><p><b>Self-supervised features.</b> DINOv2-style models learn strong patch features without labels, which then need only a small decoder and a few labelled tiles for a new region.</p><p><b>About this machine.</b> The fields are drawn procedurally. Token counts and attention cost are exact formulas; the map is the majority label inside each patch, compared with the true fields live.</p>',
  code: {
    title: 'Patch embedding is a strided convolution',
    note: 'Adapted from the course\'s vision transformer lesson.',
    text: `
import torch, torch.nn as nn

class PatchEmbed(nn.Module):
    def __init__(self, patch=16, dim=768):
        super().__init__()
        self.proj = nn.Conv2d(3, dim, kernel_size=patch, stride=patch)
    def forward(self, img):                    # (B, 3, H, W)
        x = self.proj(img)                     # (B, dim, H/p, W/p)
        return x.flatten(2).transpose(1, 2)    # (B, tokens, dim)

def resize_pos(pos, old, new):                 # pos: (1, old*old, dim)
    g = pos.reshape(1, old, old, -1).permute(0, 3, 1, 2)
    g = nn.functional.interpolate(g, size=(new, new), mode="bicubic")
    return g.permute(0, 2, 3, 1).reshape(1, new * new, -1)
`,
  },
};
