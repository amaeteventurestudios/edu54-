// Build your own video codec: ten 32 x 18 frames of a ball rolling across a sky are encoded the way the codec-from-scratch tutorial does.
// Pixels are converted from RGB to YUV and the two colour planes are averaged over 2 x 2 blocks (4:2:0), because eyes notice brightness detail
// far more than colour detail. Frames between keyframes store only their difference from the previous decoded frame, mostly zeros, and
// run-length coding squeezes the zeros. Frame 3 is lost in transit; the decoder recovers at the next keyframe. Every byte count and decoded
// pixel is computed live.
const W = 32, H = 18, F = 10;
function scene(f) {
  const px = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r, g, b;
    const n = ((x * 7 + y * 13 + x * y) % 9) * 3;
    if (y >= 13) { r = 70 + n; g = 140 + n; b = 60; } else { const t = y / 13; r = Math.round(90 + 120 * t) + n; g = Math.round(150 + 80 * t) + n; b = 235 - n; }
    const bx = 4 + f * 2.6, by = 10.5, d = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
    if (d < 2.6) { r = 230; g = 120; b = 50; }
    px.push([r, g, b]);
  }
  return px;
}
const toYUV = ([r, g, b]) => [0.299 * r + 0.587 * g + 0.114 * b, -0.169 * r - 0.331 * g + 0.5 * b + 128, 0.5 * r - 0.419 * g - 0.081 * b + 128];
const toRGB = ([y, u, v]) => [y + 1.402 * (v - 128), y - 0.344 * (u - 128) - 0.714 * (v - 128), y + 1.772 * (u - 128)].map(c => Math.max(0, Math.min(255, Math.round(c))));
function sub(plane) { const out = []; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) out.push(Math.round((plane[y * W + x] + plane[y * W + x + 1] + plane[(y + 1) * W + x] + plane[(y + 1) * W + x + 1]) / 4)); return out; }
function up(small) { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.push(small[(y >> 1) * (W / 2) + (x >> 1)]); return out; }
function rleBytes(arr) { let n = 0, i = 0; while (i < arr.length) { let j = i; while (j < arr.length && arr[j] === arr[i] && j - i < 255) j++; n += 2; i = j; } return n; }
function encode(o) {
  const sizes = [], decoded = [], err = [];
  let prev = null;
  const lost = o.loss ? 3 : -1;
  let dec = null;
  for (let f = 0; f < F; f++) {
    const rgb = scene(f);
    let planes;
    if (o.yuv) {
      const yuv = rgb.map(toYUV), Y = yuv.map(p => Math.round(p[0])), U = yuv.map(p => p[1]), Vv = yuv.map(p => p[2]);
      planes = [o.lumaSub ? sub(Y) : Y, sub(U), sub(Vv)];
    } else planes = [0, 1, 2].map(c => rgb.map(p => p[c]));
    const key = f === 0 || (o.kf > 0 && f % o.kf === 0);
    const payload = key || !o.delta ? planes : planes.map((pl, c) => pl.map((v, i) => Math.round(v - prev[c][i])));
    sizes.push({ f, key, bytes: payload.reduce((a, pl) => a + (o.rle ? Math.min(rleBytes(pl), pl.length + 1) : pl.length), 0) });
    prev = planes;
    if (f === lost) { decoded.push(dec ? dec.map(p => p.slice()) : planes); }
    else if (key || !o.delta || !dec) dec = planes.map(p => p.slice());
    else dec = dec.map((pl, c) => pl.map((v, i) => v + payload[c][i]));
    if (f !== lost) decoded.push(dec.map(p => p.slice()));
    const show = decoded[decoded.length - 1];
    const pix = o.yuv ? (() => { const Y = o.lumaSub ? up(show[0]) : show[0], U = up(show[1]), Vv = up(show[2]); return Y.map((y, i) => toRGB([y, U[i], Vv[i]])); })() : show[0].map((r, i) => [r, show[1][i], show[2][i]]);
    decoded[decoded.length - 1] = pix;
    err.push(pix.reduce((a, p, i) => a + Math.abs(p[0] - rgb[i][0]) + Math.abs(p[1] - rgb[i][1]) + Math.abs(p[2] - rgb[i][2]), 0) / (W * H * 3));
  }
  const total = sizes.reduce((a, s) => a + s.bytes, 0), raw = W * H * 3 * F;
  const bad = err.map((e, f) => e > err[0] + 1.5 && f !== lost).filter(Boolean).length;
  return { sizes, decoded, err, total, raw, ratio: raw / total, bad, blur: err[0] };
}

export default {
  slug: 'build-a-video-codec',
  title: 'Build your own video codec',
  description: 'Squeeze ten frames of a ball rolling across the sky into far fewer bytes. Send only what changed, then lose a frame and see why key frames matter.',
  overview: 'Raw video is enormous: every pixel of every frame needs three bytes of red, green and blue, so a minute of high-definition video would fill gigabytes. Codecs shrink it with a few ideas, which the codec-from-scratch tutorial builds one at a time. First, change colour space: convert RGB to YUV, where Y is brightness and U and V are colour differences. Human eyes see fine detail in brightness far better than in colour, so the colour planes can be stored at lower resolution, averaging each 2 by 2 block into one value. That is 4:2:0 subsampling, and it halves the data before anything else; shrinking the brightness plane the same way would blur the picture visibly. Second, exploit time: most of a frame is the same as the frame before, so instead of storing each frame whole, store the difference from the previous one. The differences are mostly zeros, and run-length coding, which stores a value and how many times it repeats, collapses long runs of zeros into a few bytes; real codecs follow with general compression such as DEFLATE, and go further with motion vectors that say where a block moved and transforms that discard detail the eye will not miss. Third, keyframes: a frame stored whole, every so often. A difference frame is only meaningful on top of the right previous frame, so if one frame is lost or the viewer skips ahead, the decoder can only show a correct picture again from the next keyframe. Too few keyframes and errors persist; too many and the file grows. This machine encodes and decodes the ten frames live.',
  keywords: ['build your own video codec', 'video compression', 'YUV', 'chroma subsampling', 'delta frames', 'keyframes', 'run-length encoding'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/kevmo314/codec-from-scratch" target="_blank" rel="noopener">Video Encoding from Scratch</a> by Kevin Wang (Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short encoder, written for this lesson after codec-from-scratch (Apache-2.0).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { yuv: true, lumaSub: false, delta: true, rle: true, kf: 4, loss: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const SHOW = [0, 2, 3, 5, 7, 9], CELL = 0.019, TW = W * CELL, TH = H * CELL;
    const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
    const thumbs = SHOW.map((f, k) => {
      const cx = -2.62 + (k % 3) * 0.72 + TW / 2, cz = -0.86 + Math.floor(k / 3) * 0.62 + TH / 2;
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.01, CELL), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { tmpM.makeTranslation(cx - TW / 2 + CELL * (x + 0.5), 0.162, cz - TH / 2 + CELL * (y + 0.5)); im.setMatrixAt(y * W + x, tmpM); }
      im.layers.set(1); im.userData.noFit = true; floor.add(im);
      return { im, f };
    });
    const bars = Array.from({ length: F }, (_, f) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.12, 0.03, 1, '#fff', { r: 0.01, material: m }); b.userData.noFit = true; floor.add(b);    return { b, m }; });

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = encode(st);
      thumbs.forEach(th => {
        const pix = R.decoded[th.f];
        pix.forEach((p, i) => th.im.setColorAt(i, tmpC.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace)));
        th.im.instanceColor.needsUpdate = true;
        const lost = st.loss && th.f === 3, bad = R.err[th.f] > R.err[0] + 1.5 && !lost;
      });
      const maxB = Math.max(...R.sizes.map(s => s.bytes));
      R.sizes.forEach((s, f) => { const len = Math.max(0.02, s.bytes / maxB * 1.35); bars[f].b.scale.z = len; bars[f].b.position.set(-0.35 + f * 0.155, 0.13, 0.52 - len / 2); bars[f].m.color.set(st.loss && f === 3 ? '#B9B3A6' : s.key ? SAF : GOOD); });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.yuv && !st.lumaSub && st.delta && st.rle && st.kf > 0 && st.kf <= 5 && R.bad === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Keyframe every (0 = only first)', min: 0, max: 9, step: 1, get: () => st.kf, set: v => set({ kf: +v }), fmt: v => v ? `${v} frames` : 'never again' },
      { type: 'toggle', label: 'YUV with quarter-resolution colour', short: 'YUV 4:2:0', get: () => st.yuv, set: v => set({ yuv: !!v }) },
      { type: 'toggle', label: 'Shrink brightness too', short: 'Shrink Y', get: () => st.lumaSub, set: v => set({ lumaSub: !!v }) },
      { type: 'toggle', label: 'Store differences between frames', short: 'Deltas', get: () => st.delta, set: v => set({ delta: !!v }) },
      { type: 'toggle', label: 'Run-length code', short: 'RLE', get: () => st.rle, set: v => set({ rle: !!v }) },
      { type: 'toggle', label: 'Lose frame 3 in transit', short: 'Loss', get: () => st.loss, set: v => set({ loss: !!v }) },
    ];
    const readouts = [
      { label: 'Compression', get: () => ({ v: `${R.ratio.toFixed(1)}×`, sub: `${R.total.toLocaleString('en')} bytes`, good: R.ratio > 4, bad: R.ratio < 2 }) },
      { label: 'Wrong frames', get: () => ({ v: `${R.bad}`, sub: 'after the loss', good: R.bad === 0, bad: R.bad > 0 }) },
      { label: 'Picture error', get: () => ({ v: R.blur.toFixed(1), sub: 'frame 0, per channel', good: R.blur < 7, bad: R.blur > 9 }) },
    ];
    const labels = [
      { name: 'd', t: 'Decoded frames', d: 'What the viewer sees', icon: 'eye', atV: V(-2.0, 0.15, -0.5) },
      { name: 't', t: 'Size and quality', d: 'Bytes and errors', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never send another keyframe', hint: 'the loss never heals', on: () => set({ ...D0, kf: 0 }), off: reset },
      { label: 'Shrink brightness too', hint: 'a blurred picture', on: () => set({ ...D0, lumaSub: true }), off: reset },
      { label: 'Store every frame whole', hint: 'no deltas', on: () => set({ ...D0, delta: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (st.loss && st.delta && st.kf === 0 && r.bad) return { ok: false, msg: `<b>Frame 3 was lost, and every later frame is a difference from it: with no keyframe to reset, ${r.bad} frames decode wrong, and the ball smears across the sky to the end.</b> Send a keyframe every few frames so the decoder can recover.` };
      if (st.lumaSub) return { ok: false, msg: `<b>Shrinking brightness to quarter resolution as well blurs the picture: an average error of ${r.blur.toFixed(1)} per channel, and the ball\'s edge goes soft.</b> Eyes notice brightness detail; keep Y at full resolution and shrink only colour.` };
      if (!st.delta) return { ok: false, msg: `<b>Storing every frame whole sends ${r.total.toLocaleString('en')} bytes, only ${r.ratio.toFixed(1)} times smaller than raw, although most pixels never change.</b> Store differences between frames; the zeros compress to almost nothing.` };
      if (!st.yuv || !st.rle) return { ok: false, msg: `<b>${!st.yuv ? 'Without YUV and colour subsampling, the colour planes cost as much as brightness' : 'Without run-length coding, the differences are mostly zeros but each still costs a byte'}: ${r.ratio.toFixed(1)}× smaller instead of much more.</b>` };
      if (r.bad) return { ok: false, msg: `<b>With a keyframe only every ${st.kf} frames, the loss of frame 3 leaves ${r.bad} later frames wrong before the next keyframe.</b> Shorten the interval.` };
      if (st.kf > 5) return { ok: false, msg: `<b>Keyframes every ${st.kf} frames save bytes, but a loss or a seek waits a long time for a clean picture.</b> Keep the interval short enough to recover quickly.` };
      return { ok: true, msg: `<b>${r.raw.toLocaleString('en')} raw bytes became ${r.total.toLocaleString('en')}, ${r.ratio.toFixed(1)} times smaller: colour at quarter resolution, only differences between frames, zeros run-length coded.</b> ${st.loss ? `Frame 3 was lost, and the keyframe at frame ${st.kf} restored a correct picture.` : 'Turn on the loss to see the keyframes earn their bytes.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Raw video is huge', home: true, say: 'Ten small frames of a ball rolling across the sky. Stored raw, every pixel costs three bytes.', act: m => m.set({ yuv: false, lumaSub: false, delta: false, rle: false, kf: 4, loss: false }) },
    { t: 'Brightness and colour', home: true, say: 'Convert to brightness and colour. Eyes barely notice colour detail, so keep colour at quarter resolution.', act: m => m.set({ yuv: true, lumaSub: false, delta: false, rle: false, kf: 4, loss: false }) },
    { t: 'Only the changes', home: true, say: 'Most of each frame is the same as the last. Store only the differences, and run-length code the zeros.', act: m => m.set({ yuv: true, lumaSub: false, delta: true, rle: true, kf: 0, loss: false }) },
    { t: 'A lost frame', home: true, say: 'Frame three is lost. Every later difference builds on it, and the picture goes wrong for good.', act: m => m.set({ yuv: true, lumaSub: false, delta: true, rle: true, kf: 0, loss: true }) },
    { t: 'Keyframes', home: true, say: 'A whole frame every few frames lets the decoder start clean again.', act: m => m.set({ yuv: true, lumaSub: false, delta: true, rle: true, kf: 4, loss: true }) },
    { t: 'Not the brightness', home: true, say: 'Shrink brightness too, and the picture blurs. That detail is what eyes see.', act: m => m.set({ yuv: true, lumaSub: true, delta: true, rle: true, kf: 4, loss: true }) },
  ],
  check: [
    { q: 'Why store colour at lower resolution than brightness?', options: ['Eyes notice brightness detail far more than colour', 'Colour is less important to codecs', 'It is faster to decode'], answer: 0, why: '4:2:0 halves the data.', hint: 'Try Shrink brightness too.' },
    { q: 'What does a delta frame store?', options: ['Its difference from the previous frame', 'The whole picture', 'Only the colour'], answer: 0, why: 'Mostly zeros.', hint: 'Try Store every frame whole.' },
    { q: 'Why send keyframes regularly?', options: ['So a loss or a seek can recover from a whole frame', 'They are smaller', 'To add colour'], answer: 0, why: 'Deltas need the right base.', hint: 'Try Never send another keyframe.' },
  ],
  terms: [
    ['YUV', 'Brightness (Y) and two colour-difference values (U, V).'],
    ['Chroma subsampling', 'Storing colour at lower resolution than brightness.'],
    ['Delta frame', 'A frame stored as its difference from an earlier one.'],
    ['Keyframe', 'A frame stored whole, needing no earlier frame.'],
    ['Run-length coding', 'Storing a value and how many times it repeats.'],
    ['Motion vector', 'Where a block of pixels moved since the last frame.'],
  ],
  deeper: '<p><b>Beyond differences.</b> Real codecs predict each block from a shifted block of an earlier frame, then transform the leftover with a DCT and quantise it, discarding detail the eye will not miss.</p><p><b>Streaming.</b> Video calls and live streams send keyframes often, or on request, so new viewers and lossy networks recover quickly.</p><p><b>About this machine.</b> The frames are drawn and encoded by this lesson; the colour conversion follows the BT.601 formulas.</p>',
  code: {
    title: 'Encode a frame',
    note: 'Our own short version, after codec-from-scratch.',
    text: `
import numpy as np

def to_yuv420(rgb):                                    # rgb: H x W x 3, uint8
    r, g, b = [rgb[..., i].astype(float) for i in range(3)]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    u = -0.169 * r - 0.331 * g + 0.5 * b + 128
    v = 0.5 * r - 0.419 * g - 0.081 * b + 128
    shrink = lambda p: p.reshape(p.shape[0] // 2, 2, p.shape[1] // 2, 2).mean(axis=(1, 3))
    return [np.round(y), np.round(shrink(u)), np.round(shrink(v))]   # colour at quarter size

def rle(values):
    out, i = [], 0
    while i < len(values):
        j = i
        while j < len(values) and values[j] == values[i] and j - i < 255:
            j += 1
        out += [values[i], j - i]
        i = j
    return out

def encode(frames, keyframe_every=4):
    prev = None
    for n, frame in enumerate(frames):
        planes = to_yuv420(frame)
        if prev is None or n % keyframe_every == 0:
            yield "key", [rle(p.ravel()) for p in planes]
        else:
            yield "delta", [rle((p - q).ravel()) for p, q in zip(planes, prev)]
        prev = planes
`,
  },
};
