// Chameleon: a children's-book studio in Kigali wants one model that writes a story and draws its pictures in the same reply. Images become codes from a learned codebook
// (vector quantisation, done live here on a small drawn picture: each 8 × 8 patch snaps to the nearest of K codebook colours, trained by k-means), placed in one shared
// vocabulary with the words. The sequence strip shows text tokens and image codes in one stream, bracketed by <image> tags; the training curve shows loss with and without
// QK-norm (a simple scripted curve from the paper's report). Break it: a tiny codebook of 8 entries (the picture turns blocky), no <image> tags (the decoder cannot tell
// which tokens are pixels), training a large model without QK-norm (the loss diverges).
const SIDE = 64, CODES = [8, 64, 256];
function picture() {
  const px = [];
  for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
    const u = x / SIDE, v = y / SIDE; let c = v < 0.55 ? [0.55 + 0.3 * v, 0.75, 0.95] : [0.45, 0.65 - 0.2 * (v - 0.55), 0.3];
    const hill = v > 0.5 + 0.08 * Math.sin(u * 7); if (hill) c = [0.35, 0.6, 0.25];
    if ((u - 0.75) ** 2 + (v - 0.2) ** 2 < 0.01) c = [0.98, 0.82, 0.25];
    if (u > 0.2 && u < 0.42 && v > 0.45 && v < 0.75) c = [0.8, 0.45, 0.3];
    if (u > 0.17 && u < 0.45 && v > 0.33 && v < 0.46 && v > 0.46 - (0.14 - Math.abs(u - 0.31))) c = [0.5, 0.25, 0.2];
    const n = Math.sin(x * 1.7 + y * 0.9) * 0.05 + Math.sin(x * 0.37 - y * 1.3) * 0.05 + (Math.sin(x * 12.9898 + y * 78.233) * 43758.5 % 1) * 0.08;
    px.push(c.map(v => Math.max(0, Math.min(1, v + n))));
  }
  return px;
}
const PIC = picture();
function quantise(K) {
  const B = 4, blocks = [];   // each 4 × 4 block is one patch: 48 numbers
  for (let by = 0; by < SIDE; by += B) for (let bx = 0; bx < SIDE; bx += B) { const v = []; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) v.push(...PIC[(by + y) * SIDE + bx + x]); blocks.push(v); }
  const vec = blocks;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let C = Array.from({ length: K }, () => vec[Math.floor(rnd() * vec.length)].slice());
  const near = v => { let bi = 0, bd = 1e9; C.forEach((c, i) => { let d = 0; for (let k = 0; k < v.length; k++) d += (c[k] - v[k]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  for (let it = 0; it < 6; it++) { const s = C.map(() => ({ v: Array(48).fill(0), n: 0 })); vec.forEach(v => { const i = near(v); v.forEach((x, k) => { s[i].v[k] += x; }); s[i].n++; }); C = C.map((c, i) => (s[i].n ? s[i].v.map(x => x / s[i].n) : c)); }
  const out = Array(PIC.length); let bi = 0;
  for (let by = 0; by < SIDE; by += B) for (let bx = 0; bx < SIDE; bx += B) { const c = C[near(blocks[bi++])]; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const k = (y * B + x) * 3; out[(by + y) * SIDE + bx + x] = [c[k], c[k + 1], c[k + 2]]; } }
  const mse = PIC.reduce((a, v, i) => a + (v[0] - out[i][0]) ** 2 + (v[1] - out[i][1]) ** 2 + (v[2] - out[i][2]) ** 2, 0) / (PIC.length * 3);
  return { out, psnr: 10 * Math.log10(1 / Math.max(mse, 1e-6)) };
}

export default {
  slug: 'chameleon-early-fusion-tokens',
  title: 'Chameleon: pictures as tokens',
  description: 'A children\'s-book studio in Kigali wants one model that writes a story and draws its pictures in the same reply.',
  overview: 'Chameleon fuses modalities at the very start. A vector-quantised autoencoder learns a codebook of image patterns, 8,192 entries; an image is encoded as a grid of features, and each feature is replaced by the index of its nearest codebook entry, so a 512-pixel picture becomes 1,024 integers. Those integers live in the same vocabulary as the text tokens, 65,536 entries in all, and special &lt;image&gt; and &lt;/image&gt; tags mark where an image begins and ends. One transformer then predicts the next token, whether it is a word or an image code, with one loss, so it can write text and generate images interleaved in any order; when it emits &lt;/image&gt;, the codes go to the decoder to become pixels. The codebook sets a ceiling on image quality: too few entries and pictures turn blocky, which is why better tokenizers improved later models such as Emu3. Training such models at scale was unstable until QK-norm, normalising queries and keys before their dot product, kept attention logits from exploding.',
  keywords: ['chameleon', 'early fusion', 'vq-vae', 'image tokens', 'codebook', 'qk-norm'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0.1], dir: [0.05, 0.85, 1.25], half: 1.55, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { K: 2, tags: true, qk: true };
    const ink = '#151827';
    const mkPic = x => { const cv = document.createElement('canvas'); cv.width = cv.height = SIDE; const g = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.2, -0.35); floor.add(m);
      const f = P.box(1.72, 0.06, 1.72, '#2B2B38', { r: 0.03 }); f.position.set(x, 0.12, -0.35); floor.add(f); return { g, tex }; };
    const orig = mkPic(-2.1), recon = mkPic(-0.2);
    const paint = (P2, px) => { const img = P2.g.createImageData(SIDE, SIDE); px.forEach((c, i) => { img.data[i * 4] = c[0] * 255; img.data[i * 4 + 1] = c[1] * 255; img.data[i * 4 + 2] = c[2] * 255; img.data[i * 4 + 3] = 255; }); P2.g.putImageData(img, 0, 0); P2.tex.needsUpdate = true; };
    paint(orig, PIC);
    [['original', -2.1], ['from codes', -0.2]].forEach(([n, x]) => {    });
    const arrow = P.box(0.3, 0.04, 0.06, '#8A8578', { r: 0.02 }); arrow.position.set(-1.15, 0.2, -0.35); floor.add(arrow);
    /* sequence strip */
    const toks = Array.from({ length: 22 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(0.22, 0.12, 0.26, '#888', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b);
         return { b, mm }; });

    /* training curve */
    const CX = 2.15, cb = P.box(1.8, 1.4, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); cb.position.set(CX, 0.12, -0.6); floor.add(cb);

    const lm = new THREE.MeshBasicMaterial({ color: C.plum }), line = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.014, C.plum, { material: lm }); line.layers.set(1); line.userData.noFit = true; floor.add(line);

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function run() { const q = quantise(CODES[st.K]); return { ...q, K: CODES[st.K] }; }
    function draw() {
      R = run(); paint(recon, R.out);
      const seq = [['The', 'w'], ['hut', 'w'], ['stands', 'w'], ['.', 'w'], st.tags ? ['<img>', 't'] : null, ['4821', 'i'], ['1029', 'i'], ['2891', 'i'], ['77', 'i'], ['…', 'i'], ['6150', 'i'], ['903', 'i'], st.tags ? ['</img>', 't'] : null, ['Then', 'w'], ['Amani', 'w'], ['comes', 'w'], ['home', 'w'], ['.', 'w']].filter(Boolean);
      toks.forEach((T, i) => { const it = seq[i], on = !!it; T.b.visible = on; if (!on) return; const x = -3.0 + i * 0.25;
        T.b.position.set(x, 0.12, 1.0); T.mm.color.set(it[1] === 'w' ? '#C9A227' : it[1] === 't' ? C.coral : '#3B3F8F'); });
      const pts = []; for (let s = 0; s <= 60; s++) { const t = s / 60, L = st.qk ? 2.6 - 1.2 * (1 - Math.exp(-t * 4)) : (t < 0.55 ? 2.6 - 1.0 * (1 - Math.exp(-t * 4)) : 1.75 + (t - 0.55) * 6 + 0.3 * Math.sin(t * 40));
        pts.push(V(CX - 0.75 + t * 1.5, 0.3 + Math.max(0, Math.min(1.0, (L - 1.2) / 2.2)), -0.53)); }
      line.geometry.dispose(); line.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.014, 6, false); lm.color.set(st.qk ? C.plum : '#D64545');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Codebook size', options: CODES.map(String), get: () => st.K, act: i => { st.K = i; draw(); } },
      { type: 'toggle', label: '<image> tags around the codes', short: 'image tags', get: () => st.tags, set: v => { st.tags = v; draw(); } },
      { type: 'toggle', label: 'QK-norm', short: 'QK-norm', get: () => st.qk, set: v => { st.qk = v; draw(); } },
    ];
    const readouts = [
      { label: 'Picture quality', get: () => ({ v: `${R.psnr.toFixed(1)} dB`, sub: 'PSNR of the decoded picture', good: R.psnr >= 25, bad: R.psnr < 22 }) },
      { label: 'Codebook', get: () => ({ v: String(R.K), sub: 'image codes in the vocabulary' }) },
      { label: 'Training', get: () => ({ v: st.qk ? 'stable' : 'diverges', good: st.qk, bad: !st.qk }) },
    ];
    const labels = [
      { name: 'pics', t: 'Picture to codes and back', d: 'Each patch becomes a codebook index', icon: 'eye', atV: V(-2.95, 0.2, -0.35) },
      { name: 'seq', t: 'One sequence', d: 'Gold words, blue codes, coral tags', icon: 'link', atV: V(-3.25, 0.2, 1.0) },
    ];
    const reset = () => { Object.assign(st, { K: 2, tags: true, qk: true }); draw(); };
    const breaks = [
      { label: 'Codebook of 8', hint: 'Too few patterns', on: () => { reset(); st.K = 0; draw(); }, off: reset },
      { label: 'No image tags', hint: 'Codes mixed into words', on: () => { reset(); st.tags = false; draw(); }, off: reset },
      { label: 'No QK-norm', hint: 'A 34B model', on: () => { reset(); st.qk = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.K === 0) return { ok: false, msg: `<b>The picture turns blocky.</b> With only 8 codebook entries, every patch must snap to one of 8 patterns, so the hills, the hut and the sun become flat blobs: ${R.psnr.toFixed(1)} dB. The codebook sets the ceiling on image quality; Chameleon uses 8,192 entries, and later tokenizers raised the ceiling further.` };
      if (!st.tags) return { ok: false, msg: `<b>Which tokens are pixels?</b> Without <image> and </image> tags, image codes sit in the stream like any other tokens. The software that renders the reply cannot tell where a picture starts and ends, and the model cannot tell when it is drawing and when it is writing. The tags bracket every image.` };
      if (!st.qk) return { ok: false, msg: `<b>Training diverges.</b> In a large early-fusion model, attention logits grow with depth until the loss spikes and climbs, as the red curve shows; Chameleon's 34B runs diverged this way. QK-norm normalises queries and keys before their dot product and keeps the logits in range, with dropout and layer-norm placement doing the rest.` };
      return { ok: true, msg: `<b>Words and pictures in one stream.</b> ${R.K} codebook entries decode the picture at ${R.psnr.toFixed(1)} dB; the codes share one vocabulary with the words, bracketed by image tags, and QK-norm keeps training stable. The model can write a line, draw the hut, and carry on with the story.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Write and draw', home: true, say: 'A children\'s-book studio in Kigali wants one model that writes a story and draws its pictures in the same reply.', act: m => m.set({ K: 2, tags: true, qk: true }) },
    { t: 'Pictures to codes', home: true, say: 'A learned codebook turns each patch of a picture into the number of its nearest entry. The picture becomes a list of integers.', act: m => m.set({}) },
    { t: 'One vocabulary', home: true, say: 'Those integers share one vocabulary with the words. One transformer predicts the next token, word or picture code.', act: m => m.set({}) },
    { t: 'Codebook size', home: true, say: 'With only eight codebook entries, the picture turns blocky. The codebook sets the ceiling on quality.', act: m => m.set({ K: 0 }) },
    { t: 'Tag the images', home: true, say: 'Image tags mark where a picture starts and ends. Without them, nobody can tell which tokens are pixels.', act: m => m.set({ K: 2, tags: false }) },
    { t: 'Keep it stable', home: true, say: 'Train a large model like this without QK-norm, and the loss blows up. Normalising queries and keys keeps it stable.', act: m => m.set({ tags: true, qk: false }) },
  ],
  check: [
    { q: 'How does Chameleon turn an image into tokens?', options: ['Each patch is replaced by the index of its nearest codebook entry', 'It writes a caption', 'It keeps the raw pixels'], answer: 0, why: 'Vector quantisation.' },
    { q: 'What limits the quality of Chameleon\'s generated images?', options: ['The image tokenizer\'s codebook', 'The text vocabulary', 'The number of layers only'], answer: 0, why: 'Better tokenizers raised the ceiling.' },
    { q: 'What does QK-norm do?', options: ['Normalises queries and keys to keep attention logits in range', 'Adds image tags', 'Shrinks the vocabulary'], answer: 0, why: 'It stabilised large early-fusion training.' },
  ],
  terms: [
    ['Early fusion', 'Mixing modalities as tokens in one sequence from the start.'],
    ['VQ-VAE', 'An autoencoder that turns images into codebook indices.'],
    ['Codebook', 'The learned list of patterns image patches snap to.'],
    ['Shared vocabulary', 'One token list covering words and image codes.'],
    ['Image tags', 'Special tokens marking an image\'s start and end.'],
    ['QK-norm', 'Normalising queries and keys before attention.'],
  ],
  deeper: '<p><b>Stories in many languages.</b> Publishers of children\'s books in Kinyarwanda, Swahili and isiZulu need pictures that fit local homes, clothes and landscapes. A model that writes and draws together keeps text and pictures consistent, if its training data includes such scenes.</p><p><b>Successors.</b> Emu3 kept next-token prediction but used a much better tokenizer; Transfusion and Show-o mix token prediction with diffusion; Janus-Pro uses separate encoders for understanding and generating.</p><p><b>About this machine.</b> The picture is drawn here and quantised live with a k-means codebook; the training curves are scripted from the paper\'s report.</p>',
  code: {
    title: 'Quantise patches to a codebook',
    note: 'Adapted from the course\'s Chameleon lesson.',
    text: `
import torch

def quantise(features, codebook):
    # features: (H*W, d) from the image encoder; codebook: (K, d)
    d = torch.cdist(features, codebook)          # distance to every code
    ids = d.argmin(1)                            # one integer per patch
    return ids, codebook[ids]                    # tokens, and what the decoder sees

IMAGE_OFFSET = 57_344                            # image codes live after the text ids
def to_sequence(text_ids, image_ids, boi, eoi):
    return text_ids + [boi] + [IMAGE_OFFSET + i for i in image_ids.tolist()] + [eoi]
`,
  },
};
