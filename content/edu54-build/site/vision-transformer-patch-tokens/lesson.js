// Patch tokens: an assistant for travellers reads the departures board at a Lusaka bus terminus through a phone camera. The photo is cut into patches; the columns over
// it show each patch token's output size (norm). Without register tokens, a few background patches turn into huge "artifact" tokens that soak up attention; with
// registers (four extra tokens beside the grid) the load moves there. Patch size against letter height decides whether the text can be read, and the hand-off decides
// what reaches the language model. Norms and attention shares are set to the published pattern; grid sizes, letters per patch and parameter counts are computed live.
// Break it: no registers (artifact patches in the sky take a large share of attention and spoil the dense map), 32-pixel patches (each letter is smaller than a patch),
// pooling to one vector before the language model (one vector cannot hold a timetable).
const ROWS = [['DESTINATION', 'DEPARTS', 'BAY'], ['Livingstone', '07:30', '4'], ['Kitwe', '08:15', '2'], ['Chipata', '09:00', '7'], ['Mongu', '10:45', '1']];
const RES = 448, LETTER = 22;   // pixels tall, on the photo as taken
const WIDTH = { B: [768, 12], L: [1024, 24], SO400m: [1152, 27] };

export default {
  slug: 'vision-transformer-patch-tokens',
  title: 'Patch tokens: what the model sees',
  description: 'A travel assistant reads the departures board at a Lusaka bus terminus through a phone camera. The photo becomes patch tokens; their size, a few register tokens and the hand-off to the language model decide whether the times can be read. Then drop the registers, use patches bigger than the letters, or pool everything into one vector.',
  overview: 'Every vision transformer starts the same way: cut the image into P × P patches, flatten each and project it to the model width with one shared matrix, which is a convolution with kernel and stride P. Positions come from a learned table, which ties the model to one grid, or from 2-D rotary embeddings, which work at any size. Patch size is a trade: small patches give more tokens and finer detail, which reading text needs, at a quadratic cost in attention. Large vision transformers trained without help develop a few high-norm "artifact" tokens on empty background, which the model uses as scratch space and which spoil dense maps; adding a handful of learnable register tokens gives that load somewhere to go. For classification one vector, the [CLS] token or the mean of the patches, is enough; vision-language models instead pass every patch token to the language model, and drop the registers. The backbone\'s pretraining, contrastive like SigLIP or self-distilled like DINOv2, decides what its patch tokens are good for.',
  keywords: ['vision transformer', 'patch tokens', 'register tokens', 'patch size', 'siglip', 'dinov2'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.3, 0.1], dir: [0.05, 1.4, 0.9], half: 1.5, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { patch: 14, reg: true, hand: 0, size: 'SO400m' };
    const ink = '#151827', TS = 2.6, TX = -1.0, TZ = 0;
    const base = P.box(6.4, 0.12, 3.2, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* the photo: a departures board under a sky */
    const cv = document.createElement('canvas'); cv.width = cv.height = 448; const g2 = cv.getContext('2d');
    const sky = g2.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, '#8EC5E8'); sky.addColorStop(1, '#CFE6F2'); g2.fillStyle = sky; g2.fillRect(0, 0, 448, 150);
    g2.fillStyle = '#B9A98C'; g2.fillRect(0, 150, 448, 298); g2.fillStyle = '#1B2A24'; g2.fillRect(30, 120, 388, 280);
    g2.textBaseline = 'middle'; ROWS.forEach((r, i) => { g2.fillStyle = i ? '#F2C94C' : '#FFFFFF'; g2.font = `${i ? 600 : 800} ${LETTER}px Arial`; g2.fillText(r[0], 45, 150 + i * 50); g2.fillText(r[1], 255, 150 + i * 50); g2.fillText(r[2], 360, 150 + i * 50); });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(TS, TS), new THREE.MeshBasicMaterial({ map: tex })); photo.rotation.x = -Math.PI / 2; photo.position.set(TX, 0.19, TZ); S.add(photo);
    const frame = P.box(TS + 0.12, 0.06, TS + 0.12, '#2B2B38', { r: 0.03 }); frame.position.set(TX, 0.12, TZ); S.add(frame);
    const grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.45 })); grid.layers.set(1); grid.userData.noFit = true; S.add(grid);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const cols = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55 }), 32 * 32); cols.frustumCulled = false; cols.userData.noFit = true; S.add(cols);
    const keep = P.box(TS, 0.6, TS, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(TX, 0.19, TZ); S.add(keep);
    /* register tokens beside the photo */
    const regs = [0, 1, 2, 3].map(i => { const b = P.box(0.22, 1, 0.22, '#7A3B69', { r: 0.03 }); b.position.set(TX + TS / 2 + 0.3, 0.16, TZ - 0.6 + i * 0.4); b.userData.noFit = true; S.add(b); return b; });
    const regT = S.text('registers', { size: 0.09, weight: 800, color: '#7A3B69' }); regT.position.set(TX + TS / 2 + 0.3, 0.13, TZ + 1.0); S.add(regT);
    /* hand-off to the language model */
    const lm = P.box(1.2, 0.55, 0.8, C.plum, { r: 0.06 }); lm.position.set(2.45, 0.12, -0.4); S.add(lm);
    const lmF = S.text('Language model', { size: 0.09, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.1 }); lmF.position.set(2.45, 0.5, 0.005); S.add(lmF);
    const inT = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); inT.position.set(2.45, 0.95, -0.4); inT.userData.noFit = true; S.add(inT);
    const ans = P.box(1.6, 0.42, 0.06, '#FBF8F1', { r: 0.03 }); ans.position.set(2.2, 0.12, 0.85); S.add(ans);
    const ansT = S.text('', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: 1.5, maxH: 0.36 }); ansT.position.set(2.2, 0.33, 0.885); S.add(ansT);

    let R = null;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function run() {
      const side = RES / st.patch, n = side * side, perLetter = LETTER / st.patch;
      const [D, L] = WIDTH[st.size], params = (3 * st.patch * st.patch * D + D) + L * (12 * D * D + 4 * D) + n * D;
      const readable = perLetter >= 1.2, artShare = st.reg ? 0.03 : 0.38, regShare = st.reg ? 0.35 : 0;
      const pooled = st.hand !== 0, tokensIn = pooled ? 1 : n;
      const ok = readable && !pooled;
      return { side, n, perLetter, params, readable, artShare, regShare, pooled, tokensIn, ok };
    }
    function draw() {
      R = run();
      const s = R.side, step = TS / s, pts = [];
      for (let i = 0; i <= s; i++) { const a = -TS / 2 + i * step; pts.push(TX + a, 0.195, TZ - TS / 2, TX + a, 0.195, TZ + TS / 2, TX - TS / 2, 0.195, TZ + a, TX + TS / 2, 0.195, TZ + a); }
      grid.geometry.dispose(); grid.geometry = new THREE.BufferGeometry(); grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      let k = 0;
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        const u = (i + 0.5) / s, v = (j + 0.5) / s, isSky = v < 0.3, onText = v > 0.3 && v < 0.88 && u > 0.08 && u < 0.92;
        const hsh = Math.sin(i * 12.9 + j * 7.7) * 4375.5, rnd = hsh - Math.floor(hsh), artifact = !st.reg && isSky && rnd > 0.9;
        const h = artifact ? 0.6 : onText ? 0.04 + 0.03 * rnd : 0.008;
        m4.makeScale(step * 0.35, h, step * 0.35).setPosition(TX - TS / 2 + (i + 0.5) * step, 0.2, TZ - TS / 2 + (j + 0.5) * step); cols.setMatrixAt(k, m4);
        cols.setColorAt(k, col.set(artifact ? '#D64545' : onText ? '#F2C94C' : '#9ACFC6')); k++; }
      cols.count = k; cols.instanceMatrix.needsUpdate = true; if (cols.instanceColor) cols.instanceColor.needsUpdate = true;
      regs.forEach(b => { b.visible = st.reg; b.scale.y = 0.55; }); regT.visible = st.reg;
      inT.userData.set(R.pooled ? '1 vector in' : `${R.n.toLocaleString('en')} patch tokens in`);
      ansT.userData.set(R.ok ? 'Kitwe: 08:15 from bay 2.' : !R.readable ? 'Kitwe: the time is unreadable.' : 'There is a departures board with several destinations.', R.ok ? '#151827' : '#8A1F1F');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Patch size', options: ['14 px', '16 px', '32 px'], get: () => [14, 16, 32].indexOf(st.patch), act: i => { st.patch = [14, 16, 32][i]; draw(); } },
      { type: 'toggle', label: 'Register tokens', short: 'registers', get: () => st.reg, set: v => { st.reg = v; draw(); } },
      { type: 'buttons', label: 'Hand to the language model', options: ['Every patch token', 'Mean of patches', '[CLS] token'], get: () => st.hand, act: i => { st.hand = i; draw(); } },
      { type: 'buttons', label: 'Encoder', options: ['ViT-B', 'ViT-L', 'SO400m'], get: () => ['B', 'L', 'SO400m'].indexOf(st.size), act: i => { st.size = ['B', 'L', 'SO400m'][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Patch tokens', get: () => ({ v: R.n.toLocaleString('en'), sub: `${R.side} × ${R.side} at ${RES} px` }) },
      { label: 'Patches per letter', get: () => ({ v: R.perLetter.toFixed(1), sub: `${LETTER} px letters`, good: R.readable, bad: !R.readable }) },
      { label: 'Encoder size', get: () => ({ v: `${Math.round(R.params / 1e6)}M`, sub: 'parameters, computed from the shape' }) },
    ];
    const labels = [
      { name: 'photo', t: 'Patch tokens', d: 'Height: output size. Red: artifacts', icon: 'eye', atV: V(TX - TS / 2 - 0.1, 0.2, TZ) },
      { name: 'lm', t: 'Hand-off', d: 'What the language model receives', icon: 'link', atV: V(3.1, 0.35, -0.4) },
    ];
    const reset = () => { Object.assign(st, { patch: 14, reg: true, hand: 0, size: 'SO400m' }); draw(); };
    const breaks = [
      { label: 'No register tokens', hint: 'Look at the sky', on: () => { reset(); st.reg = false; draw(); }, off: reset },
      { label: '32-pixel patches', hint: 'Bigger than the letters', on: () => { reset(); st.patch = 32; draw(); }, off: reset },
      { label: 'Pool to one vector', hint: 'Mean of patches', on: () => { reset(); st.hand = 1; draw(); }, off: reset },
    ];
    function status() {
      if (!st.reg) return { ok: false, msg: `<b>The sky grows giant tokens.</b> Without registers, a large encoder turns a few empty sky patches into very high-norm tokens (red) and uses them as scratch space: they take about ${Math.round(R.artShare * 100)}% of the attention and smear dense maps of the board. The answer still comes out here, but anything that reads patch features, segmentation or grounding, suffers. Four learnable register tokens give that load somewhere harmless to go.` };
      if (!R.readable) return { ok: false, msg: `<b>Each letter is smaller than a patch.</b> At ${st.patch}-pixel patches a ${LETTER}-pixel letter is only ${R.perLetter.toFixed(1)} of a patch tall, so "08:15" is squashed into one or two tokens and the times blur. Reading text needs patches smaller than the letters: 14-pixel patches give ${(LETTER / 14).toFixed(1)} per letter, at about five times the tokens of 32-pixel patches.` };
      if (R.pooled) return { ok: false, msg: `<b>One vector cannot hold a timetable.</b> ${st.hand === 1 ? 'Averaging' : 'Taking the [CLS] token of'} all ${R.n.toLocaleString('en')} patch tokens gives a fine summary, "a departures board", but the language model can no longer look up which row says Kitwe. Vision-language models pass every patch token and drop the registers.` };
      return { ok: true, msg: `<b>"Kitwe: 08:15 from bay 2."</b> ${st.patch}-pixel patches give ${R.n.toLocaleString('en')} tokens with ${R.perLetter.toFixed(1)} patches per letter, registers absorb the scratch work, and every patch token goes to the language model, which reads the right row. The ${st.size} encoder has about ${Math.round(R.params / 1e6)} million parameters.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Read the board', home: true, say: 'A traveller at a Lusaka bus terminus points a phone at the departures board and asks when the Kitwe bus leaves.', act: m => m.set({ patch: 14, reg: true, hand: 0, size: 'SO400m' }) },
    { t: 'Patches become tokens', home: true, say: 'The photo is cut into fourteen-pixel patches. Each becomes one token: a thousand of them for this photo.', act: m => m.set({}) },
    { t: 'Patch size', home: true, say: 'With thirty-two-pixel patches, each letter is smaller than a patch, and the times blur.', act: m => m.set({ patch: 32 }) },
    { t: 'Artifacts', home: true, say: 'Large encoders turn a few empty sky patches into giant tokens they use as scratch space. They soak up attention.', act: m => m.set({ patch: 14, reg: false }) },
    { t: 'Registers', home: true, say: 'Four extra register tokens give that work somewhere to go, and the patch map stays clean.', act: m => m.set({ reg: true }) },
    { t: 'Hand over every patch', home: true, say: 'Pool everything into one vector, and the language model can no longer find the Kitwe row. Vision-language models pass every patch.', act: m => m.set({ hand: 1 }) },
  ],
  check: [
    { q: 'Why do text-reading tasks prefer small patches?', options: ['Letters must span more than one patch to stay legible', 'Small patches use fewer tokens', 'Large patches cannot be trained'], answer: 0, why: 'Detail costs tokens.' },
    { q: 'What do register tokens do?', options: ['Absorb the scratch work that otherwise creates high-norm artifact patches', 'Store the image size', 'Replace the patch tokens'], answer: 0, why: 'They are dropped before the hand-off.' },
    { q: 'What do vision-language models usually pass to the language model?', options: ['Every patch token', 'Only the [CLS] token', 'The mean of the patches'], answer: 0, why: 'Details must stay addressable.' },
  ],
  terms: [
    ['Patch token', 'The vector for one image patch.'],
    ['Patch size', 'The side of each square patch, in pixels.'],
    ['Register tokens', 'Extra learnable tokens that soak up scratch attention.'],
    ['Artifact tokens', 'High-norm patch tokens on empty background.'],
    ['Mean pooling', 'Averaging patch tokens into one vector.'],
    ['2-D rotary positions', 'Position encoding by rotating queries and keys by row and column.'],
  ],
  deeper: '<p><b>Pretraining decides the features.</b> SigLIP-style contrastive encoders give patch tokens that line up with words, the default for vision-language models; DINOv2 gives the best purely visual dense features.</p><p><b>Reading the world\'s signs.</b> Bus boards, shop signs and forms across Africa mix English, French, Portuguese and local languages in many fonts. Higher resolution and smaller patches matter more than a bigger encoder for reading them.</p><p><b>About this machine.</b> Grid sizes, letters per patch and parameter counts are computed live; token norms and attention shares follow the published pattern for large encoders with and without registers.</p>',
  code: {
    title: 'Patchify, with registers',
    note: 'Adapted from the course\'s patch-token lesson.',
    text: `
import torch, torch.nn as nn

class ViTStem(nn.Module):
    def __init__(self, patch=14, dim=1152, registers=4):
        super().__init__()
        self.proj = nn.Conv2d(3, dim, kernel_size=patch, stride=patch)
        self.reg = nn.Parameter(torch.zeros(1, registers, dim))
    def forward(self, img):
        x = self.proj(img).flatten(2).transpose(1, 2)          # (B, patches, dim)
        return torch.cat([self.reg.expand(len(x), -1, -1), x], 1)

def handoff(tokens, registers=4):
    return tokens[:, registers:]          # drop registers, pass every patch to the LLM
`,
  },
};
