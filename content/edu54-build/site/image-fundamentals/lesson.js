// Image fundamentals: a small picture of a baobab at sunset in Tanzania, built from pixel tiles on an upright board.
// On the right, the same picture split into its three channels, red, green and blue: each tray is a field of columns, taller for brighter.
// A probe ring marks one pixel, and the readouts show its three numbers and the size of the whole image in numbers.
// Break it: channels read in the wrong order (BGR, the sun turns blue), too few bits per channel (the sky bands), resizing without keeping the aspect ratio (the sun squashes).
const W0 = 24, H0 = 16;
function picture(x, y) {                  // x, y in 0..1 (y up), returns [r, g, b] in 0..1
  const sky = [1.0 - 0.55 * y, 0.45 - 0.25 * y + 0.15 * (1 - y), 0.25 + 0.45 * y];
  let c = sky.map(v => Math.max(0, Math.min(1, v)));
  const sd = Math.hypot((x - 0.72) * 1.5, y - 0.42);
  if (sd < 0.13) c = [1, 0.86, 0.35];
  else if (sd < 0.2) c = c.map((v, i) => v * 0.6 + [1, 0.7, 0.3][i] * 0.4);
  if (y < 0.22) c = [0.36 - y * 0.5, 0.22 - y * 0.3, 0.12];
  const tx = Math.abs(x - 0.3), crown = Math.hypot((x - 0.3) / 1.6, y - 0.62);
  if ((tx < 0.05 && y < 0.62) || (crown < 0.11 && y > 0.55) || (Math.abs(y - 0.6) < 0.025 && tx < 0.19)) c = [0.08, 0.06, 0.07];
  return c;
}

export default {
  slug: 'image-fundamentals',
  title: 'Images as numbers: pixels and channels',
  description: 'A baobab at sunset, built from 384 pixel tiles, and beside it the same picture split into red, green and blue columns. Every colour is three numbers. Then read the channels in the wrong order, cut the bits until the sky bands, and squash the picture by resizing it carelessly.',
  overview: 'To a computer an image is a grid of numbers. Each pixel holds one number per channel: three for colour (red, green, blue), one for greyscale. A picture 16 pixels tall and 24 wide with three channels is 1,152 numbers, usually stored as whole numbers from 0 to 255 (8 bits each). Networks want them scaled to 0 to 1 and arranged the way they were trained. Get the channel order wrong and colours swap; store too few bits and smooth gradients turn into bands; resize carelessly and shapes stretch.',
  keywords: ['image as numbers', 'rgb channels explained', 'pixel values 0 255', 'bgr vs rgb', 'bit depth banding'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.75, -0.1], dir: [0.15, 0.65, 1.3], half: 1.95, wide: 8.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { bits: 8, bgr: false, keep: true, width: 24 };
    const ink = '#151827';
    const base = P.box(8.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, -0.1); S.add(base);
    /* ---------- the picture board ---------- */
    const BX = -1.85, BZ = -0.75, TILE = 0.12, BW = W0 * TILE, BH = H0 * TILE;
    const board = P.box(BW + 0.3, BH + 0.55, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(BX, 0.12, BZ); S.add(board);
    const bT = S.text('a baobab at sunset, Tanzania', { size: 0.1, weight: 800, face: 'front', color: ink, maxW: BW }); bT.position.set(BX, 0.12 + BH + 0.38, BZ + 0.045); S.add(bT);
    const bTop = S.text('the picture', { size: 0.07, weight: 800 }); bTop.position.set(BX, 0.12 + BH + 0.555, BZ); S.add(bTop);
    const PY0 = 0.12 + 0.2, PZ = BZ + 0.05;
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W0 * H0);
    tiles.userData.noFit = true; tiles.layers.set(1); S.add(tiles);
    const probe = P.tube([...Array(25)].map((_, i) => V(Math.cos(i / 24 * 6.2832) * 0.09, Math.sin(i / 24 * 6.2832) * 0.09, 0)), 0.012, '#FFFFFF'); probe.userData.noFit = true; S.add(probe);
    const shapeT = S.text('', { size: 0.08, weight: 800, face: 'front', color: ink }); shapeT.position.set(BX, 0.12 + 0.09, PZ); S.add(shapeT);
    /* ---------- three channel trays ---------- */
    const CELL = 0.05, TW = W0 * CELL, TD = H0 * CELL, TRAYS = [{ k: 0, n: 'red', c: '#D9483B' }, { k: 1, n: 'green', c: '#3E9B5F' }, { k: 2, n: 'blue', c: '#3D6BD6' }];
    const trays = TRAYS.map((t, i) => {
      const x = 0.8 + i * 1.32, z = 0.3;
      const tray = P.box(TW + 0.14, 0.06, TD + 0.14, '#3B3F8F', { r: 0.04 }); tray.position.set(x, 0.12, z); S.add(tray);
      const top = S.text(t.n, { size: 0.09, weight: 800, color: '#FFFFFF' }); top.position.set(x - TW / 2 + 0.15, 0.185, z + TD / 2 + 0.035); S.add(top);
      const fr = S.text(`${t.n} channel`, { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); fr.position.set(x, 0.15, z + TD / 2 + 0.075); S.add(fr);
      const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.9, 1, CELL * 0.9), new THREE.MeshLambertMaterial({ color: t.c }), W0 * H0);
      cols.userData.noFit = true; S.add(cols);
      const pin = P.ball(0.03, '#FFFFFF'); pin.userData.noFit = true; S.add(pin);
      return { ...t, x, z, cols, pin };
    });
    const trayT = S.text('every pixel is three numbers: taller column = brighter', { size: 0.075, weight: 800, face: 'front', color: ink, maxW: 3.6 }); trayT.position.set(2.2, 0.13, 0.95); trayT.visible = false; S.add(trayT);
    /* ---------- maths ---------- */
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const dims = () => (st.keep ? [st.width, Math.max(1, Math.round(st.width * H0 / W0))] : [st.width, H0]);
    const PROBE = [0.72, 0.42];
    let img = [], probeVal = [0, 0, 0];
    function sample() {
      const [w, h] = dims(), lv = 2 ** st.bits - 1;
      img = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let c = picture((i + 0.5) / w, (j + 0.5) / h);
        c = c.map(v => Math.round(v * lv) / lv);
        img.push(c);
      }
      const pi = Math.min(w - 1, Math.floor(PROBE[0] * w)), pj = Math.min(h - 1, Math.floor(PROBE[1] * h));
      probeVal = img[pj * w + pi].map(v => Math.round(v * 255));
      return { w, h, pi, pj };
    }
    function draw() {
      const { w, h, pi, pj } = sample();
      // the board always shows the image at its own aspect: a squashed resize shows up as squashed shapes
      const tw = st.keep ? BW / w : BW / W0 * (W0 / w) * (w / W0), th = BH / h;
      const drawW = st.keep ? BW : BW * w / W0;
      for (let q = 0; q < W0 * H0; q++) {
        if (q >= w * h) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.001); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); tiles.setMatrixAt(q, dummy.matrix); continue; }
        const i = q % w, j = Math.floor(q / w), c = img[q], shown = st.bgr ? [c[2], c[1], c[0]] : c;
        const cw = drawW / w;
        dummy.position.set(BX - drawW / 2 + (i + 0.5) * cw, PY0 + (j + 0.5) * th, PZ); dummy.rotation.set(0, 0, 0);
        dummy.scale.set(cw * 0.94, th * 0.94, 1); dummy.updateMatrix(); tiles.setMatrixAt(q, dummy.matrix);
        tiles.setColorAt(q, col.setRGB(shown[0], shown[1], shown[2], THREE.SRGBColorSpace));
      }
      tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true;
      probe.position.set(BX - drawW / 2 + (pi + 0.5) * (drawW / w), PY0 + (pj + 0.5) * th, PZ + 0.03);
      trays.forEach((t, k) => {
        const ch = st.bgr ? 2 - k : k;
        for (let q = 0; q < W0 * H0; q++) {
          if (q >= w * h) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.001); dummy.updateMatrix(); t.cols.setMatrixAt(q, dummy.matrix); continue; }
          const i = q % w, j = Math.floor(q / w), v = img[q][ch], hgt = 0.01 + v * 0.7;
          const cx = TW / w, cz = TD / h;
          dummy.position.set(t.x - TW / 2 + (i + 0.5) * cx, 0.18 + hgt / 2, t.z + TD / 2 - (j + 0.5) * cz); dummy.rotation.set(0, 0, 0);
          dummy.scale.set(cx / CELL, hgt, cz / CELL); dummy.updateMatrix(); t.cols.setMatrixAt(q, dummy.matrix);
        }
        t.cols.instanceMatrix.needsUpdate = true;
        const v = img[pj * w + pi][ch];
        t.pin.position.set(t.x - TW / 2 + (pi + 0.5) * TW / w, 0.18 + 0.01 + v * 0.7 + 0.05, t.z + TD / 2 - (pj + 0.5) * TD / h);
      });
      shapeT.userData.set(`${h} tall × ${w} wide × 3 channels = ${(h * w * 3).toLocaleString()} numbers`);
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Bits per channel', min: 1, max: 8, step: 1, get: () => st.bits, set: v => { st.bits = Math.round(v); draw(); }, fmt: v => `${Math.round(v)} (${2 ** Math.round(v)} shades)` },
      { type: 'buttons', label: 'Channel order the code expects', options: ['RGB', 'BGR'], get: () => (st.bgr ? 1 : 0), act: i => { st.bgr = !!i; draw(); } },
      { type: 'slider', label: 'Resize to width', min: 6, max: 24, step: 1, get: () => st.width, set: v => { st.width = Math.round(v); draw(); }, unit: 'px' },
      { type: 'toggle', label: 'Keep the aspect ratio', short: 'aspect', get: () => st.keep, set: v => { st.keep = v; draw(); } },
    ];
    const readouts = [
      { label: 'Probe pixel', get: () => ({ v: (st.bgr ? [...probeVal].reverse() : probeVal).join(' '), sub: st.bgr ? 'R G B, but really B G R' : 'R G B, 0 to 255', bad: st.bgr }) },
      { label: 'Shape', get: () => { const [w, h] = dims(); return { v: `${h}×${w}×3`, sub: `${(h * w * 3).toLocaleString()} numbers` }; } },
      { label: 'Memory', get: () => { const [w, h] = dims(); return { v: Math.ceil(h * w * 3 * st.bits / 8).toLocaleString(), sub: `bytes at ${st.bits} bit${st.bits === 1 ? '' : 's'}` }; } },
    ];
    const labels = [
      { name: 'picture', t: 'A picture is a grid', d: 'Each tile is one pixel', icon: 'eye', atV: V(BX - BW / 2 - 0.15, 0.12 + BH * 0.6, BZ) },
      { name: 'probe', t: 'One pixel', d: 'White ring: its numbers are above', icon: 'target', atV: V(BX - BW / 2 - 0.15, 0.12 + BH * 0.25, BZ) },
      { name: 'trays', t: 'Three channels', d: 'Red, green, blue: taller is brighter', icon: 'scale', atV: V(0.8 + 2 * 1.32 + TW / 2 + 0.1, 0.2, 0.3) },
    ];
    const reset = () => { Object.assign(st, { bits: 8, bgr: false, keep: true, width: 24 }); draw(); };
    const breaks = [
      { label: 'Channels in the wrong order', hint: 'Loaded as BGR, read as RGB', on: () => { reset(); st.bgr = true; draw(); }, off: reset },
      { label: 'Two bits per channel', hint: 'Only 4 shades each', on: () => { reset(); st.bits = 2; draw(); }, off: reset },
      { label: 'Resize without the aspect ratio', hint: 'Width 12, height left at 16', on: () => { reset(); st.keep = false; st.width = 12; draw(); }, off: reset },
    ];
    function status() {
      const [w, h] = dims();
      if (st.bgr) return { ok: false, msg: `<b>The sun turned blue.</b> The file stores its channels as blue, green, red, but the code reads them as red, green, blue, so red and blue swap: the probe pixel's ${probeVal[2]} of red is read as blue. Some image libraries load BGR by default; convert before using the picture.` };
      if (st.bits <= 3) return { ok: false, msg: `<b>The sky has bands.</b> With ${st.bits} bit${st.bits === 1 ? '' : 's'} each channel has only ${2 ** st.bits} shades, so the smooth sunset gradient jumps from one flat band to the next. 8 bits (256 shades) is enough for the eye.` };
      if (!st.keep && w !== W0) return { ok: false, msg: `<b>Squashed.</b> The width went from 24 to ${w} pixels but the height stayed at ${h}, so everything is ${(W0 / w).toFixed(1)} times narrower than it should be: the round sun is now an oval. Resize both sides by the same factor, then crop or pad.` };
      return { ok: true, msg: `<b>${h} × ${w} × 3 = ${(h * w * 3).toLocaleString()} numbers.</b> Each pixel is three channels from 0 to 255; the probe pixel in the sun is ${probeVal.join(', ')}. Before a network sees them, they are usually divided by 255 to land between 0 and 1.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A grid of tiles', home: true, say: 'This baobab at sunset is 24 pixels wide and 16 tall. Each tile is one pixel, and to the computer each pixel is just numbers.', act: m => m.set({ bits: 8, bgr: false, keep: true, width: 24 }) },
    { t: 'Three channels', home: true, say: 'A colour pixel holds three numbers: how much red, green and blue. The trays show each channel as columns. The sun is tall in red and green, low in blue.', act: m => m.set({}) },
    { t: 'Bits and shades', home: true, say: 'Each number usually has 8 bits, which gives 256 shades. Cut it to two bits, and the smooth sky turns into flat bands.', act: m => m.set({ bits: 2 }) },
    { t: 'The wrong order', home: true, say: 'Some libraries store the channels as blue, green, red. Read them in the wrong order, and red and blue swap: the sunset turns cold.', act: m => m.set({ bits: 8, bgr: true }) },
    { t: 'Resizing', home: true, say: 'Networks want one fixed size. Shrink only the width, and the round sun squashes into an oval. Keep the aspect ratio, then crop or pad.', act: m => m.set({ bgr: false, keep: false, width: 12 }) },
    { t: 'Ready for a network', home: true, say: 'Sixteen by twenty four by three is one thousand, one hundred and fifty two numbers. Divide them by 255, and the picture is ready for a network.', act: m => m.set({ keep: true, width: 24 }) },
  ],
  check: [
    { q: 'How many numbers describe a colour image 16 pixels tall and 24 wide?', options: ['1,152 (16 × 24 × 3)', '384 (16 × 24)', '40 (16 + 24)'], answer: 0, why: 'Every pixel has three channel values.' },
    { q: 'Why did the sunset turn blue?', options: ['The channels were read in the wrong order, swapping red and blue', 'The picture had too few pixels', 'The bits per channel were too high'], answer: 0, why: 'BGR read as RGB swaps the first and last channel.' },
    { q: 'What causes banding in a smooth gradient?', options: ['Too few bits per channel, so too few shades', 'Too many pixels', 'The aspect ratio'], answer: 0, why: 'Each step between shades becomes visible.' },
  ],
  terms: [
    ['Pixel', 'One cell of an image grid.'],
    ['Channel', 'One layer of numbers per pixel, such as red, green or blue.'],
    ['Bit depth', 'How many bits store each channel value; 8 bits give 256 shades.'],
    ['Resolution', 'How many pixels wide and tall an image is.'],
    ['Aspect ratio', 'Width divided by height.'],
    ['Normalisation', 'Scaling pixel values, usually from 0–255 to 0–1.'],
  ],
  deeper: '<p><b>Other colour spaces.</b> HSV describes colour as hue, saturation and brightness, which makes "find everything orange" easy. LAB is built so that equal steps look equally different to the eye.</p><p><b>Greyscale</b> is not a plain average: green counts most because the eye is most sensitive to it, roughly 0.3 red, 0.59 green and 0.11 blue.</p><p><b>Channels first or last.</b> Some frameworks store images as height × width × channels, others as channels × height × width. Mixing them up gives nonsense without any error.</p>',
  code: {
    title: 'Load, check and prepare an image',
    note: 'Adapted from the course\'s image fundamentals lesson.',
    text: `
import numpy as np
from PIL import Image

img = np.asarray(Image.open("baobab.png").convert("RGB"))
print(img.shape, img.dtype)        # (16, 24, 3) uint8: values 0..255

r, g, b = img[..., 0], img[..., 1], img[..., 2]
grey = 0.299 * r + 0.587 * g + 0.114 * b

bgr = img[..., ::-1]               # what a BGR library would hand you
rgb = bgr[..., ::-1]               # flip it back before use

x = img.astype(np.float32) / 255.0 # scale to 0..1 for a network
x = x.transpose(2, 0, 1)           # channels first: (3, 16, 24)
`,
  },
};
