// Vision Transformers: a photo of a zebra at a waterhole in Etosha, Namibia, cut into square patches. Each patch becomes one token (a row of cards),
// gets a position embedding and joins a [CLS] token; a stack of transformer blocks lets every token attend to every other, and the [CLS] token gives the answer.
// The bright patches on the photo show where the [CLS] token looks.
// Break it: 16 × 16 patches on a 32 × 32 photo (four tokens: the stripes vanish), 2 × 2 patches (256 tokens: the attention bill explodes),
// no position embeddings (shuffle the patches and the answer does not change), trained from scratch on 10,000 photos (it needs far more).
const IMG = 32;
function photo(x, y) {           // x, y in 0..1, y down
  if (y < 0.35) return [0.55, 0.72, 0.9];
  const water = ((x - 0.25) / 0.22) ** 2 + ((y - 0.85) / 0.08) ** 2 < 1;
  if (water) return [0.3, 0.45, 0.55];
  const bx = (x - 0.6) / 0.2, by = (y - 0.55) / 0.11, body = bx * bx + by * by < 1;
  const neck = x > 0.74 && x < 0.82 && y > 0.32 && y < 0.55 && x - 0.74 > (0.55 - y) * 0.1, head = Math.hypot((x - 0.82) / 1.4, y - 0.32) < 0.05;
  const legs = [0.47, 0.53, 0.66, 0.72].some(l => Math.abs(x - l) < 0.02) && y > 0.6 && y < 0.82;
  if (body || neck || head || legs) return Math.floor((x * 1.0 + y * 0.35) * 22) % 2 ? [0.95, 0.95, 0.92] : [0.1, 0.1, 0.12];
  return [0.82, 0.72, 0.42];
}
const PIX = []; for (let j = 0; j < IMG; j++) for (let i = 0; i < IMG; i++) PIX.push(photo((i + 0.5) / IMG, (j + 0.5) / IMG));

export default {
  slug: 'vision-transformers',
  title: 'Vision transformers: a picture as tokens',
  description: 'A zebra at a waterhole in Etosha, cut into square patches. Each patch becomes a token with a position, and a transformer lets every patch look at every other before a special [CLS] token gives the answer. Then try patches that are too big or too small, take away the positions and shuffle the picture, or train from scratch on too little data.',
  overview: 'A vision transformer treats an image like a sentence. It cuts the image into square patches, flattens each into a vector, and adds a position embedding so the model knows where each patch came from. A learned [CLS] token joins the sequence, and ordinary transformer blocks let every token attend to every other. After the last block, the [CLS] token\'s vector goes to a classifier. Smaller patches keep more detail but make the sequence longer, and attention costs grow with the square of its length. Without a CNN\'s built-in assumptions about nearby pixels, ViTs need a lot of pretraining data.',
  keywords: ['vision transformer', 'vit explained', 'patch embedding', 'cls token', 'position embedding images'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.95, 0], dir: [0.12, 0.5, 1.3], half: 1.8, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { patch: 8, pos: true, pre: true, shuffled: false };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.5, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    /* ---------- the photo ---------- */
    const CELL = 0.06, BW = IMG * CELL, BX = -1.85, BZ = -0.55, BY = 0.12 + 0.25;
    const board = P.box(BW + 0.25, BW + 0.55, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, BZ); S.add(board);
    const bT = S.text('zebra at a waterhole, Etosha', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: BW }); bT.position.set(BX, BY + BW + 0.14, BZ + 0.045); S.add(bT);
    const bTop = S.text('the photo', { size: 0.07, weight: 800 }); bTop.position.set(BX, 0.12 + BW + 0.555, BZ); S.add(bTop);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 1.02, CELL * 1.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), IMG * IMG);
    tiles.layers.set(1); tiles.userData.noFit = true; S.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Color();
    const pos = k => [BX - BW / 2 + (k % IMG + 0.5) * CELL, BY + BW - (Math.floor(k / IMG) + 0.5) * CELL];
    for (let k = 0; k < IMG * IMG; k++) { const [x, y] = pos(k); dummy.position.set(x, y, BZ + 0.045); dummy.updateMatrix(); tiles.setMatrixAt(k, dummy.matrix); }
    tiles.instanceMatrix.needsUpdate = true;
    const lines = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), 64);
    lines.layers.set(1); lines.userData.noFit = true; lines.frustumCulled = false; S.add(lines);
    /* ---------- tokens and the transformer ---------- */
    const TZ = 0.75, cards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.22, 0.03), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 65);
    cards.userData.noFit = true; cards.frustumCulled = false; S.add(cards);
    const tray = P.box(3.2, 0.06, 0.4, '#5B6178', { r: 0.04 }); tray.position.set(-0.55, 0.12, TZ); S.add(tray);
    const trayT = S.text('', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); trayT.position.set(-0.55, 0.15, TZ + 0.205); S.add(trayT);
    const more = S.text('', { size: 0.07, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); more.userData.noFit = true; S.add(more);
    const TX = 1.6, blocks = [...Array(4)].map((_, i) => { const b = P.box(1.2, 0.2, 0.7, i % 2 ? '#3D6BD6' : C.indigo, { r: 0.05 }); b.position.set(TX, 0.12 + i * 0.24, 0.15); S.add(b); return b; });
    const tT = S.text('transformer block × 12', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); tT.position.set(TX, 0.12 + 3 * 0.24 + 0.1, 0.505); S.add(tT);
    const tT2 = S.text('every token attends to every token', { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.15 }); tT2.position.set(TX, 0.12 + 0.1, 0.505); S.add(tT2);
    const tTop = S.text('transformer', { size: 0.08, weight: 800, color: '#FFFFFF' }); tTop.position.set(TX, 0.12 + 4 * 0.24 + 0.005, 0.15); S.add(tTop);
    const head = P.box(0.75, 0.32, 0.5, C.plum, { r: 0.06 }); head.position.set(2.75, 0.12, 0.5); S.add(head);
    const headT = S.text('', { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF', maxW: 0.7 }); headT.position.set(2.75, 0.3, 0.755); S.add(headT);
    const headU = S.text('', { size: 0.055, weight: 800, face: 'front', color: '#FFFFFF' }); headU.position.set(2.75, 0.18, 0.755); S.add(headU);
    const headTop = S.text('answer', { size: 0.065, weight: 800, color: '#FFFFFF' }); headTop.position.set(2.75, 0.445, 0.5); S.add(headTop);
    /* ---------- maths ---------- */
    let R = null, perm = null;
    function attention(n, g) {
      // the [CLS] token looks hardest at stripy patches: high contrast inside the patch
      return [...Array(n)].map((_, t) => { const px = t % g, py = Math.floor(t / g), p = IMG / g; let lo = 1, hi = 0; for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) { const c = PIX[(py * p + j) * IMG + px * p + i], l = (c[0] + c[1] + c[2]) / 3; lo = Math.min(lo, l); hi = Math.max(hi, l); } return st.pos ? (hi - lo) ** 2 : 0.25; });
    }
    function draw() {
      const g = IMG / st.patch, n = g * g;
      if (!perm || perm.length !== n) { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; perm = [...Array(n)].map((_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } }
      const att = attention(n, g), amax = Math.max(...att, 1e-6);
      for (let k = 0; k < IMG * IMG; k++) {
        const i = k % IMG, j = Math.floor(k / IMG), t = Math.floor(j / st.patch) * g + Math.floor(i / st.patch);
        const src = st.shuffled ? perm[t] : t, si = (src % g) * st.patch + (i % st.patch), sj = Math.floor(src / g) * st.patch + (j % st.patch);
        const c = PIX[sj * IMG + si], a = att[src] / amax;
        col.setRGB(c[0], c[1], c[2]).multiplyScalar(0.55 + 0.45 * a);
        tiles.setColorAt(k, col);
      }
      tiles.instanceColor.needsUpdate = true;
      let q = 0;
      for (let i = 1; i < g; i++) { const x = BX - BW / 2 + i * st.patch * CELL; dummy.position.set(x, BY + BW / 2, BZ + 0.05); dummy.scale.set(0.012, BW, 1); dummy.updateMatrix(); lines.setMatrixAt(q++, dummy.matrix); const y = BY + i * st.patch * CELL; dummy.position.set(BX, y, BZ + 0.05); dummy.scale.set(BW, 0.012, 1); dummy.updateMatrix(); lines.setMatrixAt(q++, dummy.matrix); }
      lines.count = q; lines.instanceMatrix.needsUpdate = true;
      const shown = Math.min(64, n);
      cards.count = shown + 1;
      dummy.scale.setScalar(1);
      for (let t = 0; t <= shown; t++) {
        dummy.position.set(-2.05 + t * 0.047, 0.26, TZ); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); cards.setMatrixAt(t, dummy.matrix);
        if (t === 0) cards.setColorAt(0, col.set(C.gold)); else { const src = st.shuffled ? perm[t - 1] : t - 1, px = (src % g) * st.patch + st.patch / 2, py = Math.floor(src / g) * st.patch + st.patch / 2, c = PIX[Math.min(IMG - 1, Math.floor(py)) * IMG + Math.min(IMG - 1, Math.floor(px))]; cards.setColorAt(t, col.setRGB(c[0], c[1], c[2])); }
      }
      cards.instanceMatrix.needsUpdate = true; cards.instanceColor.needsUpdate = true;
      more.visible = n > 64; more.userData.set(`+ ${n - 64} more`); more.position.set(-2.05 + 65 * 0.047 + 0.2, 0.45, TZ);
      trayT.userData.set(`[CLS] + ${n} patch tokens${st.pos ? ', each with its position' : ', no positions'}`);
      const acc0 = { 2: 0.9, 4: 0.92, 8: 0.9, 16: 0.7 }[st.patch];
      const acc = Math.max(0.3, acc0 - (st.pos ? 0 : 0.12) - (st.pre ? 0 : 0.2));
      const cost = (n + 1) ** 2 * 12;
      const label = acc > 0.8 ? 'zebra' : acc > 0.6 ? 'zebra?' : 'horse';
      R = { n, acc, cost, label };
      headT.userData.set(st.shuffled ? (st.pos ? 'not sure' : 'zebra (same!)') : label); headU.userData.set(`${Math.round(acc * 100)}% on the test set`);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Patch size', options: ['2 × 2', '4 × 4', '8 × 8', '16 × 16'], get: () => [2, 4, 8, 16].indexOf(st.patch), act: i => { st.patch = [2, 4, 8, 16][i]; perm = null; draw(); } },
      { type: 'toggle', label: 'Position embeddings', short: 'positions', get: () => st.pos, set: v => { st.pos = v; draw(); } },
      { type: 'toggle', label: 'Pretrained on a large collection', short: 'pretrained', get: () => st.pre, set: v => { st.pre = v; draw(); } },
      { type: 'toggle', label: 'Shuffle the patches', short: 'shuffle', get: () => st.shuffled, set: v => { st.shuffled = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: String(R.n + 1), sub: `${R.n} patches + [CLS]` }) },
      { label: 'Attention pairs', get: () => ({ v: R.cost >= 1e6 ? `${(R.cost / 1e6).toFixed(1)} M` : R.cost >= 1e4 ? `${Math.round(R.cost / 1000)} k` : R.cost.toLocaleString(), sub: 'per image, 12 blocks', bad: R.cost > 5e5 }) },
      { label: 'Test accuracy', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: 'a CNN gets about 85%', good: R.acc > 0.86, bad: R.acc < 0.8 }) },
    ];
    const labels = [
      { name: 'photo', t: 'Cut into patches', d: 'Bright: where [CLS] looks', icon: 'eye', atV: V(BX - BW / 2 - 0.1, BY + BW * 0.6, BZ) },
      { name: 'tokens', t: 'One token per patch', d: 'Gold: the [CLS] token', icon: 'link', atV: V(-2.15, 0.25, TZ) },
      { name: 'tower', t: 'Transformer blocks', d: 'Every token attends to every token', icon: 'box', atV: V(TX + 0.6, 0.6, 0.15) },
      { name: 'head', t: 'The answer', d: 'Read from the [CLS] token', icon: 'target', atV: V(3.1, 0.3, 0.5) },
    ];
    const reset = () => { Object.assign(st, { patch: 8, pos: true, pre: true, shuffled: false }); perm = null; draw(); };
    const breaks = [
      { label: 'Patches far too big', hint: '16 × 16 on a 32 × 32 photo', on: () => { reset(); st.patch = 16; draw(); }, off: reset },
      { label: 'No position embeddings', hint: 'Then shuffle the patches', on: () => { reset(); st.pos = false; st.shuffled = true; draw(); }, off: reset },
      { label: 'From scratch, little data', hint: '10,000 photos, no pretraining', on: () => { reset(); st.pre = false; draw(); }, off: reset },
    ];
    function status() {
      const k = v => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} million` : v >= 1e4 ? `${Math.round(v / 1000)} thousand` : v.toLocaleString());
      if (!st.pos) return { ok: false, msg: `<b>It cannot tell where anything is.</b> Without position embeddings, attention sees the patches as a bag with no order, so ${st.shuffled ? 'the shuffled photo, legs above the head, gets exactly the same answer as the real one' : 'shuffling the patches would not change its answer at all'}. Layout matters for most pictures: accuracy falls to ${Math.round(R.acc * 100)}%.` };
      if (st.shuffled) return { ok: true, msg: `<b>It notices the scramble.</b> With position embeddings, each token knows where its patch belongs, so legs above the head no longer add up to a zebra: the answer changes to "not sure". That is exactly what a model that understands layout should do. Turn the shuffle off to see the zebra again.` };
      if (!st.pre) return { ok: false, msg: `<b>Not enough data.</b> A CNN starts out assuming that nearby pixels belong together; a ViT has to learn even that from the data. Trained from scratch on 10,000 photos it reaches ${Math.round(R.acc * 100)}%, worse than a CNN's 85%. Pretrained on millions of images first, it overtakes the CNN.` };
      if (st.patch === 16) return { ok: false, msg: `<b>Four tokens is too few.</b> Each 16 × 16 patch squashes a quarter of the photo into one vector, so the stripes, the zebra's most telling feature, are averaged away: ${Math.round(R.acc * 100)}%. Smaller patches keep detail.` };
      if (st.patch === 2) return { ok: false, msg: `<b>The attention bill explodes.</b> 2 × 2 patches make ${R.n} tokens, and every token attends to every other in all 12 blocks: ${k(R.cost)} pairs per image, about ${Math.round(R.cost / ((17 ** 2) * 12))} times more than 8 × 8 patches, for barely any gain (${Math.round(R.acc * 100)}%).` };
      return { ok: true, msg: `<b>Zebra.</b> ${R.n} patches of ${st.patch} × ${st.patch}, each with its position, plus the [CLS] token: ${k(R.cost)} attention pairs per image, ${Math.round(R.acc * 100)}% on the test set. The bright patches show the [CLS] token looking at the stripes.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); perm = null; draw(); } };
  },

  story: [
    { t: 'A picture as a sentence', home: true, say: 'A vision transformer reads a photo like a sentence. This zebra at a waterhole in Etosha is cut into square patches, sixteen of them.', act: m => m.set({ patch: 8, pos: true, pre: true, shuffled: false }) },
    { t: 'Patches become tokens', home: true, say: 'Each patch is flattened into a vector: one token. A position embedding says where it came from, and a gold [CLS] token joins the line.', act: m => m.set({}) },
    { t: 'Attention', home: true, say: 'Transformer blocks let every token look at every other. After the last block, the [CLS] token gives the answer. The bright patches show where it looked: the stripes.', act: m => m.set({}) },
    { t: 'Patch size', home: true, say: 'Make the patches huge, and four tokens squash the stripes away. Make them tiny, and there are hundreds of tokens, with attention cost growing as the square.', act: m => m.set({ patch: 16 }) },
    { t: 'Where things are', home: true, say: 'Take away the position embeddings and shuffle the patches. Legs above the head, but the answer does not change: without positions, the patches are just a bag.', act: m => m.set({ patch: 8, pos: false, shuffled: true }) },
    { t: 'Data hungry', home: true, say: 'A CNN assumes nearby pixels belong together; a ViT must learn even that. With little data it loses to a CNN. Pretrained on millions of pictures, it wins.', act: m => m.set({ pos: true, shuffled: false, pre: false }) },
  ],
  check: [
    { q: 'How does a vision transformer turn an image into tokens?', options: ['It cuts the image into square patches and embeds each one', 'It reads one pixel at a time', 'It describes the image in words'], answer: 0, why: 'Each patch becomes one token.' },
    { q: 'What do position embeddings tell the model?', options: ['Where each patch came from in the image', 'What colour each patch is', 'How many patches there are'], answer: 0, why: 'Without them, attention treats the patches as an unordered bag.' },
    { q: 'Why do smaller patches cost much more?', options: ['They make more tokens, and attention cost grows with the square of the count', 'They use more colours', 'They need a bigger classifier'], answer: 0, why: 'Every token attends to every other token.' },
  ],
  terms: [
    ['Vision transformer (ViT)', 'A transformer that classifies images from a sequence of patch tokens.'],
    ['Patch embedding', 'Flattening a square patch and projecting it to a token vector.'],
    ['[CLS] token', 'A learned extra token whose final vector is used for the answer.'],
    ['Position embedding', 'A vector added to each token to say where its patch was.'],
    ['Inductive bias', 'Assumptions built into a model, like a CNN\'s focus on nearby pixels.'],
    ['MAE', 'Masked autoencoder pretraining: hide most patches and learn to rebuild them.'],
  ],
  deeper: '<p><b>Hybrids.</b> Swin transformers attend only within local windows that shift between layers, bringing back some of a CNN\'s locality and making cost grow linearly with image size. ConvNeXt went the other way, modernising CNNs with transformer training recipes, and matched them.</p><p><b>Pretraining without labels.</b> MAE hides three quarters of the patches and trains the ViT to rebuild them, a cheap way to learn from unlabelled photos.</p><p><b>About this machine.</b> Patches, tokens and attention costs are exact; the brightness map and accuracies illustrate typical behaviour.</p>',
  code: {
    title: 'Patch embedding, [CLS] and positions',
    note: 'Adapted from the course\'s vision transformer lesson.',
    text: `
import torch, torch.nn as nn

class PatchEmbed(nn.Module):
    def __init__(self, img=32, patch=8, dim=192):
        super().__init__()
        self.proj = nn.Conv2d(3, dim, kernel_size=patch, stride=patch)   # one vector per patch
        n = (img // patch) ** 2
        self.cls = nn.Parameter(torch.zeros(1, 1, dim))
        self.pos = nn.Parameter(torch.randn(1, n + 1, dim) * 0.02)

    def forward(self, x):
        x = self.proj(x).flatten(2).transpose(1, 2)      # (batch, patches, dim)
        cls = self.cls.expand(x.shape[0], -1, -1)
        return torch.cat([cls, x], dim=1) + self.pos     # tokens with positions

# then: transformer blocks, and a classifier on token 0 (the [CLS] token)
`,
  },
};
