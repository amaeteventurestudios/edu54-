// Emu3: a textile shop in Dar es Salaam asks a model for "a kitenge print in blue and gold stripes". The image is written one token at a time, left to right, top to bottom,
// like text. Here the tokens are 16 × 16 colour codes from an 8-colour codebook; a small hand-made model scores the next code from its left and upper neighbours and the
// caption. Classifier-free guidance mixes the scores with and without the caption; temperature sets how adventurous sampling is. Sampling is run live with a seed;
// caption match, stripe coherence and token counts are computed live. Break it: guidance 0 (the caption is ignored), temperature 2 (speckled noise),
// guidance 12 (over-guided: one flat colour, no pattern).
const PAL = ['#1B3B8A', '#3F78C9', '#E0A526', '#F2D16B', '#8C3B2E', '#5A7D3A', '#2B2B2B', '#EDE6D6'];
const CAP = [0, 1, 2, 3], N = 16;
function generate(w, T, seed0) {
  let seed = seed0; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const grid = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const left = x ? grid[y * N + x - 1] : -1, up = y ? grid[(y - 1) * N + x] : -1;
    const base = PAL.map((_, k) => (k >= 4 ? 0.6 : 0.2) + (k === up ? 1.6 : 0) + (k === left ? 0.5 : 0) + (y % 4 === 0 && k !== up ? 0.4 : 0));   // unconditional: earthy, stripe-like
    const BON = [1.0, 0.9, 0.98, 0.86];
    const cond = base.map((b, k) => b + (CAP.includes(k) ? BON[k] : -0.6));                                                                          // conditioned on the caption
    const logit = base.map((b, k) => b + w * (cond[k] - b));
    const m = Math.max(...logit), ex = logit.map(l => Math.exp((l - m) / T)), z = ex.reduce((a, b) => a + b, 0);
    let u = rnd() * z, k = 0; for (; k < ex.length - 1; k++) { u -= ex[k]; if (u <= 0) break; }
    grid.push(k);
  }
  const match = grid.filter(k => CAP.includes(k)).length / grid.length;
  let same = 0; for (let y = 1; y < N; y++) for (let x = 0; x < N; x++) same += grid[y * N + x] === grid[(y - 1) * N + x] ? 1 : 0;
  const coh = same / (N * (N - 1)), used = new Set(grid).size, rows = new Set(Array.from({ length: N }, (_, y) => grid[y * N])).size;
  return { grid, match, coh, used, rows };
}

export default {
  slug: 'emu3-next-token-for-generation',
  title: 'Emu3: draw by predicting the next token',
  description: 'A textile shop in Dar es Salaam asks for "a kitenge print in blue and gold stripes". The model writes the picture one token at a time, like a sentence, and classifier-free guidance pulls it towards the caption. Then switch guidance off, turn the temperature up, or guide far too hard.',
  overview: 'Emu3 showed that plain next-token prediction can generate images as well as a diffusion model, if the image tokenizer is good enough. A strong vector-quantised tokenizer with a 32,768-entry codebook turns a 512-pixel image into 4,096 tokens and decodes them back at about 30 dB; a 3-D version does the same for video. One transformer is trained on text, image and video tokens with a single next-token loss, on data where a caption is followed by an image, an image by a question, and so on, so the same weights caption, answer and generate depending on the prompt. Generating an image means sampling 4,096 tokens in raster order. Classifier-free guidance improves it: run the model with the caption and without, and push the logits further in the caption\'s direction by a guidance weight, typically 3 to 7. Temperature sets how adventurous each choice is: too high gives speckled noise, too low or too much guidance collapses variety. The price is time: thousands of sequential steps per image.',
  keywords: ['emu3', 'autoregressive image generation', 'classifier-free guidance', 'temperature', 'image tokenizer', 'next-token prediction'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { w: 4, T: 0.8, seed: 0 };
    const ink = '#151827', CELL = 0.15, GX = -1.0;
    const base = P.box(6.2, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const frame = P.box(N * CELL + 0.15, 0.05, N * CELL + 0.15, '#2B2B38', { r: 0.03 }); frame.position.set(GX, 0.12, 0); S.add(frame);
    const geo = new THREE.BoxGeometry(CELL * 0.92, 0.05, CELL * 0.92); geo.translate(0, 0.025, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N * N); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const cursor = P.box(CELL, 0.12, CELL, '#FFFFFF', { r: 0.01 }); cursor.material = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.8 }); cursor.userData.noFit = true; S.add(cursor);
    const cap = P.box(2.4, 0.42, 0.06, '#FBF8F1', { r: 0.03 }); cap.position.set(GX, 0.12, -1.55); S.add(cap);
    const capT = S.text('"a kitenge print in blue and gold stripes"', { size: 0.09, weight: 800, face: 'front', color: ink, maxW: 2.3 }); capT.position.set(GX, 0.33, -1.515); S.add(capT);
    /* the codebook */
    const sw = PAL.map((c, k) => { const b = P.box(0.22, 0.1, 0.22, c, { r: 0.02 }); b.position.set(1.15 + (k % 4) * 0.3, 0.12, -0.9 + Math.floor(k / 4) * 0.3); S.add(b); return b; });
    const swT = S.text('codebook: 8 codes', { size: 0.09, weight: 800, color: ink }); swT.position.set(1.6, 0.13, -0.3); S.add(swT);
    /* dials */
    const dial = (x, name) => { const d = P.cyl(0.25, 0.08, '#2B2B38'); d.position.set(x, 0.12, 0.6); S.add(d);
      const nd = P.box(0.04, 0.03, 0.22, '#F2C94C', { r: 0.01 }); nd.position.set(x, 0.22, 0.6); nd.userData.noFit = true; S.add(nd);
      const t = S.text(name, { size: 0.085, weight: 800, color: ink }); t.position.set(x, 0.13, 0.98); S.add(t);
      const v = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); v.position.set(x, 0.55, 0.6); v.userData.noFit = true; S.add(v); return { nd, v }; };
    const dW = dial(1.25, 'guidance'), dT = dial(2.15, 'temperature');

    let R = null, t0 = 0, shown = 0;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    function paint(n) {
      for (let i = 0; i < N * N; i++) { const x = i % N, y = Math.floor(i / N), on = i < n;
        m4.makeScale(1, on ? 1 : 0.2, 1).setPosition(GX - N * CELL / 2 + (x + 0.5) * CELL, 0.15, -N * CELL / 2 + (y + 0.5) * CELL); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(on ? PAL[R.grid[i]] : '#3A3D4F')); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const c = Math.min(n, N * N - 1); cursor.visible = n < N * N; cursor.position.set(GX - N * CELL / 2 + (c % N + 0.5) * CELL, 0.15, -N * CELL / 2 + (Math.floor(c / N) + 0.5) * CELL);
    }
    function draw() {
      R = generate(st.w, st.T, 31 + st.seed * 977); shown = N * N; paint(shown);
      dW.nd.rotation.y = -st.w / 12 * Math.PI * 1.5 + Math.PI * 0.75; dT.nd.rotation.y = -(st.T / 2) * Math.PI * 1.5 + Math.PI * 0.75;
      dW.v.userData.set(`w = ${st.w}`); dT.v.userData.set(`T = ${st.T}`);
    }
    draw();
    const update = dt => { if (S.reduced) return; t0 += dt; if (t0 > 6) { t0 = 0; shown = 0; } const n = Math.min(N * N, Math.floor(t0 / 4 * N * N)); if (n !== shown) { shown = n; paint(n); } };
    const controls = [
      { type: 'buttons', label: 'Guidance weight', options: ['0', '4', '12'], get: () => [0, 4, 12].indexOf(st.w), act: i => { st.w = [0, 4, 12][i]; draw(); } },
      { type: 'buttons', label: 'Temperature', options: ['0.8', '2.0'], get: () => (st.T < 1 ? 0 : 1), act: i => { st.T = i ? 2.0 : 0.8; draw(); } },
      { type: 'button', label: 'Generate again', act: () => { st.seed++; draw(); } },
    ];
    const readouts = [
      { label: 'Caption match', get: () => ({ v: `${Math.round(R.match * 100)}%`, sub: 'tokens in blue or gold', good: R.match >= 0.8, bad: R.match < 0.5 }) },
      { label: 'Stripes', get: () => ({ v: `${Math.round(R.coh * 100)}%`, sub: 'tokens matching the one above', good: R.coh >= 0.6 && R.coh < 0.85, bad: R.coh < 0.5 || R.coh >= 0.88 }) },
      { label: 'Tokens to write', get: () => ({ v: '4,096', sub: 'for a real 512 px image; 256 here' }) },
    ];
    const labels = [
      { name: 'grid', t: 'Written token by token', d: 'Left to right, top to bottom', icon: 'spark', atV: V(GX - N * CELL / 2 - 0.1, 0.2, 0) },
      { name: 'dials', t: 'Guidance and temperature', d: 'How hard, how adventurous', icon: 'target', atV: V(2.55, 0.2, 0.6) },
    ];
    const reset = () => { Object.assign(st, { w: 4, T: 0.8, seed: 0 }); draw(); };
    const breaks = [
      { label: 'No guidance', hint: 'w = 0', on: () => { reset(); st.w = 0; draw(); }, off: reset },
      { label: 'Temperature 2', hint: 'Very adventurous', on: () => { reset(); st.T = 2.0; draw(); }, off: reset },
      { label: 'Guidance 12', hint: 'Far too hard', on: () => { reset(); st.w = 12; draw(); }, off: reset },
    ];
    function status() {
      const m = Math.round(R.match * 100), c = Math.round(R.coh * 100);
      if (st.w === 0) return { ok: false, msg: `<b>The caption is ignored.</b> With guidance 0 only the scores computed without the caption are used, and they lean towards the model's everyday earthy colours: only ${m}% of tokens are blue or gold. Classifier-free guidance adds w times the difference the caption makes, pushing past what conditioning alone gives.` };
      if (st.T > 1.5) return { ok: false, msg: `<b>Speckled noise.</b> At temperature 2 every choice is flattened towards a coin toss, so neighbouring tokens disagree and the stripes break into speckles: only ${c}% of tokens match the one above, and ${R.used} different codes appear. Around 0.8 keeps patterns coherent.` };
      if (st.w >= 12) return { ok: false, msg: `<b>Over-guided into a flat print.</b> At guidance 12 the push towards the caption is so strong that one or two colours win almost everywhere: ${c}% of tokens copy the one above and the rows use only ${R.rows} colour${R.rows > 1 ? 's' : ''}. Caption match is high, but there is no pattern left. Guidance of 3 to 7 is the usual range.` };
      return { ok: true, msg: `<b>Blue and gold stripes.</b> Guidance 4 keeps ${m}% of tokens in the caption's colours, temperature 0.8 keeps rows coherent (${c}% match the row above) with ${R.rows} stripe colours. A real image takes 4,096 such steps, one after another.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A kitenge print', home: true, say: 'A textile shop in Dar es Salaam asks for a kitenge print in blue and gold stripes.', act: m => m.set({ w: 4, T: 0.8, seed: 0 }) },
    { t: 'Token by token', home: true, say: 'The model writes the picture one code at a time, left to right, top to bottom, exactly as it writes a sentence.', act: m => m.set({}) },
    { t: 'No guidance', home: true, say: 'With guidance at zero, only the caption-free scores count. It drifts to its usual colours.', act: m => m.set({ w: 0 }) },
    { t: 'Guidance', home: true, say: 'Classifier-free guidance compares the scores with and without the caption, and pushes further toward the caption.', act: m => m.set({ w: 4 }) },
    { t: 'Too hot', home: true, say: 'Turn the temperature up, and neighbouring codes disagree. The stripes break into speckles.', act: m => m.set({ T: 2.0 }) },
    { t: 'Too hard', home: true, say: 'Guide far too hard, and one colour wins everywhere. Matching the caption, but no pattern left.', act: m => m.set({ T: 0.8, w: 12 }) },
  ],
  check: [
    { q: 'How does Emu3 generate an image?', options: ['By predicting image tokens one at a time, like text', 'By denoising a whole picture at once', 'By copying training images'], answer: 0, why: 'Plain next-token prediction.' },
    { q: 'What does classifier-free guidance do?', options: ['Pushes the scores further toward the caption by comparing with and without it', 'Lowers the temperature', 'Removes the caption'], answer: 0, why: 'Logits: unconditional plus w times the difference.' },
    { q: 'What happens with far too much guidance?', options: ['Variety collapses into flat, repetitive images', 'Images become random noise', 'Nothing changes'], answer: 0, why: '3 to 7 is typical.' },
  ],
  terms: [
    ['Autoregressive generation', 'Producing output one token at a time.'],
    ['Raster order', 'Left to right, top to bottom.'],
    ['Classifier-free guidance', 'Mixing conditioned and unconditioned scores to follow the prompt harder.'],
    ['Guidance weight', 'How far scores are pushed toward the prompt.'],
    ['Temperature', 'How flat or sharp sampling choices are.'],
    ['Image tokenizer', 'Turns images into codes and back; sets the quality ceiling.'],
  ],
  deeper: '<p><b>Design tools.</b> Textile printers and designers from Dar es Salaam to Accra could explore pattern variations quickly, if the models have seen kitenge, kanga and wax-print designs; most training sets have few.</p><p><b>Speed.</b> Writing 4,096 tokens one by one is slow compared with diffusion\'s few dozen steps; Transfusion and Show-o, next, combine the two approaches.</p><p><b>About this machine.</b> The "model" is a small hand-made scoring rule over an 8-colour codebook; sampling with guidance and temperature, and every measure, are computed live.</p>',
  code: {
    title: 'Classifier-free guidance for token sampling',
    note: 'Adapted from the course\'s Emu3 lesson.',
    text: `
import torch

def sample_image_tokens(model, caption_ids, n_tokens=4096, w=4.0, T=0.8):
    cond, uncond = caption_ids + [BOI], [BOI]           # with and without the caption
    for _ in range(n_tokens):
        lc = model(torch.tensor([cond]))[0, -1]
        lu = model(torch.tensor([uncond]))[0, -1]
        logits = lu + w * (lc - lu)                       # guidance
        tok = torch.multinomial(torch.softmax(logits / T, -1), 1).item()
        cond.append(tok); uncond.append(tok)
    return cond[len(caption_ids) + 1:]
`,
  },
};
