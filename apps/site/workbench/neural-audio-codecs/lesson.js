// Neural audio codecs: a voice-note app for farmers on weak 2G networks in Ethiopia sends codec tokens instead of audio. Each frame's encoder output (a 2-D point here; real codecs use
// hundreds of numbers) is quantised by residual vector quantisation: codebook 1 picks its nearest code, codebook 2 quantises what is left, and so on. The plates show each
// codebook's 8 codes and what is left over, zoomed as it shrinks. Codebooks are trained live with k-means on 400 frames; error, bitrate and token counts are computed live.
// Break it: one codebook only (coarse, robotic), drop codebook 1 when decoding (most of the signal is gone), 75 frames a second (far too many tokens for a language model).
const K = 8, NF = 400, MAXQ = 6;
function train() {
  let seed = 53; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const centres = [[0.6, 0.5], [-0.7, 0.4], [0.1, -0.7], [-0.4, -0.3], [0.7, -0.4]];
  const X = Array.from({ length: NF }, () => { const c = centres[Math.floor(rnd() * centres.length)]; return [c[0] + 0.22 * g(), c[1] + 0.22 * g()]; });
  const books = []; let R = X.map(x => x.slice());
  for (let q = 0; q < MAXQ; q++) {
    let C = Array.from({ length: K }, (_, i) => R[Math.floor(i * NF / K)].slice());
    for (let it = 0; it < 12; it++) {
      const sum = C.map(() => [0, 0, 0]);
      R.forEach(r => { let bi = 0, bd = 1e9; C.forEach((c, i) => { const d = (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); sum[bi][0] += r[0]; sum[bi][1] += r[1]; sum[bi][2]++; });
      C = C.map((c, i) => (sum[i][2] ? [sum[i][0] / sum[i][2], sum[i][1] / sum[i][2]] : c));
    }
    books.push(C);
    R = R.map(r => { let bi = 0, bd = 1e9; C.forEach((c, i) => { const d = (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); return [r[0] - C[bi][0], r[1] - C[bi][1]]; });
  }
  return { X, books };
}
function encode(x, books, n) { const codes = []; let r = x.slice(); for (let q = 0; q < n; q++) { let bi = 0, bd = 1e9; books[q].forEach((c, i) => { const d = (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); codes.push(bi); r = [r[0] - books[q][bi][0], r[1] - books[q][bi][1]]; } return codes; }
function decode(codes, books, skip) { let y = [0, 0]; codes.forEach((c, q) => { if (q === skip) return; y = [y[0] + books[q][c][0], y[1] + books[q][c][1]]; }); return y; }

export default {
  slug: 'neural-audio-codecs',
  title: 'Audio codecs: sound as tokens',
  description: 'A voice-note app on weak 2G networks in Ethiopia sends codec tokens instead of audio. Each codebook codes what the last one left over, a few numbers a frame.',
  overview: 'Neural audio codecs such as EnCodec, DAC, SNAC and Mimi compress audio into a short stream of discrete tokens. An encoder turns each frame of audio into a vector; residual vector quantisation then replaces it with the nearest code from a small codebook, quantises what is left over with a second codebook, and so on; the decoder adds the chosen codes back up and turns them into sound. Each extra codebook halves the error or better but adds bits and tokens. The first codebook carries most of the signal, and in Mimi it is trained to capture what is said, while later ones add voice and detail. Frame rate matters as much as quality: at 75 frames a second, ten seconds of speech is hundreds of frames times every codebook, which is why speech language models prefer codecs at about 12 frames a second. Classic codecs like Opus still sound better per bit; neural codecs win because language models can generate their tokens.',
  keywords: ['neural audio codec', 'residual vector quantisation', 'encodec', 'mimi', 'codebook', 'bitrate'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.8, 0], dir: [0.05, 0.35, 1.3], half: 1.3, wide: 5.9 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { n: 4, skip: false, fr: 0, frame: 0 };
    const ink = '#151827', T = train();
    /* one upright plate per codebook, plus the result plate */
    const PX = q => -2.55 + q * 0.94, PY = 1.0, PR = 0.44, Z = -0.4;
    const plates = Array.from({ length: MAXQ }, (_, q) => {
      const g = new THREE.Group(); g.position.set(PX(q), PY, Z); floor.add(g);
      const disc = P.cyl(PR, 0.04, '#FBF8F1', { m: {} }); disc.material = new THREE.MeshBasicMaterial({ color: '#FBF8F1' }); disc.rotation.x = Math.PI / 2; disc.position.z = -0.02; g.add(disc);
      const stand = P.cyl(0.025, PY - 0.12 - PR, '#8A8578'); stand.position.set(PX(q), 0.12, Z - 0.02); floor.add(stand);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(PR, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: '#8A8578' })); ring.layers.set(1); g.add(ring);
      const codes = Array.from({ length: K }, () => { const b = P.ball(0.03, '#3B3F8F'); g.add(b); return b; });
      const res = new THREE.Group(); g.add(res);
      const arrowM = new THREE.MeshBasicMaterial({ color: C.orange }), arrow = P.rod(V(0, 0, 0.02), V(0.1, 0, 0.02), 0.012, C.orange); arrow.material = arrowM; arrow.layers.set(1); res.add(arrow);
      const tip = P.ball(0.035, C.orange); tip.material = arrowM; res.add(tip);
      return { g, codes, arrow, tip, disc, stand };
    });
    const OX = 2.85, out = P.cyl(0.45, 0.04, '#FBF8F1'); out.material = new THREE.MeshBasicMaterial({ color: '#FBF8F1' }); out.rotation.x = Math.PI / 2; out.position.set(OX, PY, Z - 0.02); floor.add(out);
    const ostand = P.cyl(0.025, PY - 0.12 - 0.45, '#8A8578'); ostand.position.set(OX, 0.12, Z - 0.02); floor.add(ostand);

    const tgt = P.ball(0.045, C.teal); tgt.userData.noFit = true; floor.add(tgt);
    const rec = P.ball(0.045, C.orange); rec.userData.noFit = true; floor.add(rec);
    const gap = P.rod(V(0, 0, 0), V(0.1, 0, 0), 0.01, '#D64545'); gap.userData.noFit = true; floor.add(gap);
    const cloud = T.X.slice(0, 120).map(x => { const b = P.ball(0.012, '#9ACFC6'); b.position.set(OX + x[0] * 0.42, PY + x[1] * 0.42, Z + 0.02); floor.add(b); return b; });
    /* token strip in front */
    const strip = P.box(6.0, 0.08, 0.4, '#2B2B38', { r: 0.03 }); strip.position.set(0, 0.12, 0.7); floor.add(strip);



    let R = null;
    function run() {
      const x = T.X[st.frame % NF], codes = encode(x, T.books, st.n), skip = st.skip ? 0 : -1, y = decode(codes, T.books, skip);
      const err = T.X.reduce((a, xx) => { const c = encode(xx, T.books, st.n), yy = decode(c, T.books, skip); return a + (xx[0] - yy[0]) ** 2 + (xx[1] - yy[1]) ** 2; }, 0) / NF;
      const pow = T.X.reduce((a, xx) => a + xx[0] ** 2 + xx[1] ** 2, 0) / NF, snr = 10 * Math.log10(pow / Math.max(err, 1e-9));
      const fps = [12.5, 75][st.fr], bps = fps * st.n * 10, tokens10 = Math.round(fps * 10 * st.n);
      return { x, codes, y, snr, fps, bps, tokens10 };
    }
    function draw() {
      R = run();
      let r = R.x.slice();
      plates.forEach((Pl, q) => { const on = q < st.n; Pl.g.visible = on;    Pl.stand.visible = on;
        if (!on) return;
        const book = T.books[q], scale = Math.max(...book.map(c => Math.hypot(c[0], c[1])), Math.hypot(r[0], r[1])) * 1.15, k = PR / scale;
        Pl.codes.forEach((b, i) => { b.position.set(book[i][0] * k, book[i][1] * k, 0.02); b.material.color.set(i === R.codes[q] ? C.orange : '#3B3F8F'); b.scale.setScalar(i === R.codes[q] ? 1.5 : 1); });
        P.setRod(Pl.arrow, V(0, 0, 0.02), V(r[0] * k, r[1] * k, 0.02)); Pl.tip.position.set(r[0] * k, r[1] * k, 0.02);
        Pl.disc.material.color.set(st.skip && q === 0 ? '#E8C7C7' : '#FBF8F1');
        r = [r[0] - book[R.codes[q]][0], r[1] - book[R.codes[q]][1]]; });
      const a = V(OX + R.x[0] * 0.42, PY + R.x[1] * 0.42, Z + 0.05), b = V(OX + R.y[0] * 0.42, PY + R.y[1] * 0.42, Z + 0.06);
      tgt.position.copy(a); rec.position.copy(b); P.setRod(gap, a, b); gap.visible = a.distanceTo(b) > 0.01;


    }
    draw();
    const controls = [
      { type: 'slider', label: 'Codebooks', min: 1, max: MAXQ, step: 1, get: () => st.n, set: v => { st.n = v; draw(); } },
      { type: 'toggle', label: 'Drop codebook 1 when decoding', short: 'drop first', get: () => st.skip, set: v => { st.skip = v; draw(); } },
      { type: 'buttons', label: 'Frame rate', options: ['12.5 a second', '75 a second'], get: () => st.fr, act: i => { st.fr = i; draw(); } },
      { type: 'button', label: 'Next frame', act: () => { st.frame += 37; draw(); } },
    ];
    const readouts = [
      { label: 'Signal to error', get: () => ({ v: `${R.snr.toFixed(1)} dB`, sub: 'higher is clearer', good: R.snr >= 15, bad: R.snr < 8 }) },
      { label: 'Bitrate', get: () => ({ v: `${(R.bps / 1000).toFixed(2)} kbps`, sub: '1,024-code books, 10 bits each', bad: R.bps > 3000 }) },
      { label: 'Tokens per 10 s', get: () => ({ v: R.tokens10.toLocaleString('en'), sub: 'for a language model', bad: R.tokens10 > 1500 }) },
    ];
    const labels = [
      { name: 'books', t: 'Codebooks in turn', d: 'Orange: what is left to code', icon: 'target', atV: V(PX(0) - 0.5, PY, Z) },
      { name: 'out', t: 'Frame in, frame out', d: 'Teal in, orange decoded', icon: 'check', atV: V(OX + 0.5, PY, Z) },
      { name: 'strip', t: 'What is sent', d: 'A few numbers per frame', icon: 'wave', atV: V(3.05, 0.2, 0.7) },
    ];
    const reset = () => { Object.assign(st, { n: 4, skip: false, fr: 0, frame: 0 }); draw(); };
    const breaks = [
      { label: 'One codebook', hint: 'Coarse only', on: () => { reset(); st.n = 1; draw(); }, off: reset },
      { label: 'Drop codebook 1', hint: 'Lose the first code', on: () => { reset(); st.skip = true; draw(); }, off: reset },
      { label: '75 frames a second', hint: 'Too many tokens', on: () => { reset(); st.fr = 1; draw(); }, off: reset },
    ];
    function status() {
      if (st.skip) return { ok: false, msg: `<b>Most of the voice is gone.</b> Codebook 1 holds the coarse shape of every frame, and the others only refine what it left. Decoding without it, the sum of the remaining codes lands far from the frame: ${R.snr.toFixed(1)} dB, hardly better than sending nothing. In Mimi, codebook 1 even carries what was said. Protect the first codebook above all.` };
      if (st.n === 1) return { ok: false, msg: `<b>Coarse and robotic.</b> One codebook of 8 codes can only snap each frame to one of 8 shapes: ${R.snr.toFixed(1)} dB. Words survive, but the voice sounds buzzy and flat. Each extra codebook quantises what is left, adding about 10 bits a frame and several decibels.` };
      if (st.fr === 1) return { ok: false, msg: `<b>Clear, but far too many tokens.</b> At 75 frames a second with ${st.n} codebooks, ten seconds of a voice note is ${R.tokens10.toLocaleString('en')} tokens and ${(R.bps / 1000).toFixed(1)} kbps, more than a weak 2G link can carry and too long for a speech language model. Codecs built for speech run near 12 frames a second.` };
      return { ok: true, msg: `<b>${st.n} codebooks at ${R.fps} frames a second.</b> Each codebook quantises what the one before left over, so the decoded frame lands close to the original: ${R.snr.toFixed(1)} dB, at ${(R.bps / 1000).toFixed(2)} kbps and ${R.tokens10.toLocaleString('en')} tokens per 10 s, light enough for 2G.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Voice notes on 2G', home: true, say: 'A voice-note app for farmers in Ethiopia must work on weak 2G networks. It sends a few code numbers per frame instead of audio.', act: m => m.set({ n: 4, skip: false, fr: 0, frame: 0 }) },
    { t: 'First codebook', home: true, say: 'The encoder turns each frame into a point. Codebook one swaps it for its nearest code. What is left over is drawn in orange.', act: m => m.set({ n: 1 }) },
    { t: 'Residuals', home: true, say: 'Codebook two codes what codebook one missed, then codebook three, and so on. Each one zooms in on a smaller leftover.', act: m => m.set({ n: 4 }) },
    { t: 'Lose the first', home: true, say: 'Drop codebook one when decoding, and most of the voice is gone. The first code carries the coarse shape.', act: m => m.set({ skip: true }) },
    { t: 'Too many frames', home: true, say: 'At seventy-five frames a second, ten seconds is thousands of tokens. Too heavy for 2G, and for a language model.', act: m => m.set({ skip: false, fr: 1 }) },
    { t: 'Tokens for models', home: true, say: 'At twelve and a half frames a second, speech becomes a short stream of tokens that a language model can learn to write.', act: m => m.set({ fr: 0 }) },
  ],
  check: [
    { q: 'In residual vector quantisation, what does the second codebook quantise?', options: ['What the first codebook left over', 'The same vector again', 'A random vector'], answer: 0, why: 'Each stage codes the remaining error.' },
    { q: 'Which codebook matters most for intelligibility?', options: ['The first', 'The last', 'They all matter equally'], answer: 0, why: 'It carries the coarse shape, and in Mimi what is said.' },
    { q: 'Why do speech language models prefer codecs with low frame rates?', options: ['Fewer frames means far shorter token sequences', 'Low frame rates sound better', 'They need no codebooks'], answer: 0, why: '12.5 frames a second keeps sequences short.' },
  ],
  terms: [
    ['Neural audio codec', 'A learned encoder and decoder that compress audio into tokens.'],
    ['Codebook', 'A small list of code vectors to choose from.'],
    ['Residual vector quantisation', 'Quantising, then quantising what is left, in turn.'],
    ['Frame rate', 'How many frames of tokens per second of audio.'],
    ['Semantic token', 'A token trained to capture what was said.'],
    ['Bitrate', 'Bits per second needed to send the tokens.'],
  ],
  deeper: '<p><b>Four codecs.</b> EnCodec is the common baseline; DAC gives the highest fidelity; SNAC runs coarse codebooks at a lower frame rate than fine ones; Mimi runs at 12.5 frames a second with a first codebook distilled from a speech model, which powers full-duplex speech models.</p><p><b>Connectivity.</b> Much of rural Ethiopia, Chad and South Sudan still relies on 2G. Codecs that keep speech clear at one or two kilobits a second make voice services usable there.</p><p><b>About this machine.</b> Frames are 2-D points so the codebooks can be drawn. Codebook training by k-means, encoding, decoding, signal-to-error ratio, bitrate and token counts are computed live.</p>',
  code: {
    title: 'Residual vector quantisation',
    note: 'Adapted from the course\'s neural audio codec lesson.',
    text: `
import numpy as np

def rvq_encode(x, codebooks):
    codes, residual = [], x.copy()
    for book in codebooks:                       # each book: (K, dim)
        i = np.argmin(((book - residual) ** 2).sum(1))
        codes.append(i)
        residual = residual - book[i]            # the next book codes what is left
    return codes

def rvq_decode(codes, codebooks):
    return sum(book[i] for book, i in zip(codebooks, codes))
`,
  },
};
