// Show-o: a craft cooperative in Bahir Dar previews new designs for woven mesob basket lids. The picture is 16 × 16 image codes. Generation starts with every code masked;
// at each step the model predicts all masked codes at once, keeps the most confident ones (by a cosine schedule) and re-masks the rest. A code is predicted right more
// often when more of its neighbours are already known; a model trained only on light masking is poor when little is known. Sampling is simulated live with a seed;
// accuracy and passes are computed live. Break it: everything in one step (each code guessed with no context), commit at random instead of by confidence,
// a model trained only with 15% masking (it cannot start from a blank picture).
const N = 16, PAL = ['#C0392B', '#F2C94C', '#1F6F4A', '#1B3B8A', '#2B2B2B', '#EDE6D6'];
const TRUE = (() => { const g = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5);
  let k = r > 7.6 ? 5 : r < 1.6 ? 4 : Math.floor(r / 1.5) % 4; if (r > 3 && r < 6 && Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 === 0) k = (k + 1) % 4; g.push(k); } return g; })();
function sample(steps, byConf, lowMask, seed0) {
  let seed = seed0; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const got = Array(N * N).fill(-1), order = [];
  for (let s = 1; s <= steps; s++) {
    const target = Math.round(N * N * (1 - Math.cos(Math.PI / 2 * s / steps)));
    const masked = got.map((g, i) => (g < 0 ? i : -1)).filter(i => i >= 0);
    const cands = masked.map(i => { const x = i % N, y = Math.floor(i / N); let known = 0, tot = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; tot++; if (got[yy * N + xx] >= 0) known++; }
      const k = known / tot, p = lowMask ? 0.08 + 0.9 * k * k : 0.4 + 0.58 * k, right = rnd() < p;
      return { i, pred: right ? TRUE[i] : Math.floor(rnd() * 6), conf: right ? 0.5 + 0.5 * p * rnd() : 0.6 * rnd() }; });   // a right guess usually looks surer
    const take = Math.max(0, target - (N * N - masked.length));
    const pick = byConf ? cands.sort((a, b) => b.conf - a.conf) : cands.sort(() => rnd() - 0.5);
    pick.slice(0, take).forEach(c => { got[c.i] = c.pred; order.push(c.i); });
  }
  const acc = got.filter((g, i) => g === TRUE[i]).length / (N * N);
  return { got, acc, order };
}

export default {
  slug: 'show-o-discrete-diffusion-unified',
  title: 'Show-o: unmask the picture',
  description: 'A craft cooperative in Bahir Dar previews new designs for woven basket lids. The picture starts fully masked; each step the model predicts every hidden code at once and keeps only the ones it is surest of. Then do it all in one step, keep codes at random, or use a model trained only with light masking.',
  overview: 'Show-o puts masked discrete diffusion, the MaskGIT idea, inside an ordinary language-model transformer. An image is a grid of codes from a tokenizer. Generation starts with every code replaced by a special mask token; at each step the model predicts all the masked codes in parallel, keeps the most confident fraction according to a schedule, often cosine, and re-masks the rest, so later steps can use the codes already fixed as context. Around 16 steps fill a picture, against thousands of steps for writing codes one by one. Training mirrors this: mask a random fraction of the codes, anywhere from almost none to all, and learn to recover them, like BERT for pictures. A model only ever trained with light masking has never had to start from a blank canvas. The same transformer handles text with a causal mask and next-token loss, while image codes attend to each other both ways, so one checkpoint can caption, answer questions and generate images depending on the prompt.',
  keywords: ['show-o', 'masked discrete diffusion', 'maskgit', 'parallel decoding', 'confidence', 'unified model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.1, 1.1], half: 1.5, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { steps: 2, conf: true, low: false, seed: 0 };
    const ink = '#151827', STEPS = [1, 4, 16], CELL = 0.14;
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const mkGrid = (x, name) => { const fr = P.box(N * CELL + 0.12, 0.05, N * CELL + 0.12, '#2B2B38', { r: 0.03 }); fr.position.set(x, 0.12, -0.1); S.add(fr);
      const geo = new THREE.BoxGeometry(CELL * 0.9, 0.06, CELL * 0.9); geo.translate(0, 0.03, 0);
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N * N); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
      const t = S.text(name, { size: 0.11, weight: 800, color: ink }); t.position.set(x, 0.13, 1.2); S.add(t); return im; };
    const gen = mkGrid(-1.25, 'generated'), ref = mkGrid(1.6, 'design asked for');
    const stepT = S.text('', { size: 0.09, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); stepT.position.set(-1.25, 0.5, -1.35); stepT.userData.noFit = true; S.add(stepT);
    const keep = P.box(N * CELL, 0.2, N * CELL, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-1.25, 0.15, -0.1); S.add(keep);

    let R = null, t0 = 0, shownStep = -1;
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const paint = (im, cells, wrongs) => { cells.forEach((k, i) => { const x = i % N, y = Math.floor(i / N);
        m4.makeScale(1, k < 0 ? 0.3 : 1, 1).setPosition((im === gen ? -1.25 : 1.6) - N * CELL / 2 + (x + 0.5) * CELL, 0.15, -0.1 - N * CELL / 2 + (y + 0.5) * CELL); im.setMatrixAt(i, m4);
        im.setColorAt(i, col.set(k < 0 ? '#5A5D70' : PAL[k])); }); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; };
    paint(ref, TRUE);
    function draw() { R = sample(STEPS[st.steps], st.conf, st.low, 13 + st.seed * 211); paint(gen, R.got); shownStep = -1; stepT.userData.set(`${STEPS[st.steps]} step${STEPS[st.steps] > 1 ? 's' : ''}`); }
    draw();
    const update = dt => { if (S.reduced) return; t0 += dt; const K = STEPS[st.steps], cyc = 1.2 + K * 0.25, u = t0 % cyc, s = Math.min(K, Math.floor(u / 0.25)); if (s !== shownStep) { shownStep = s; const part = sample(K, st.conf, st.low, 13 + st.seed * 211);
      // replay: show codes committed up to step s by re-running with fewer steps of the same schedule
      const cut = Math.round(N * N * (1 - Math.cos(Math.PI / 2 * s / K))); const filled = part.got.map(() => -1);
      part.order.slice(0, cut).forEach(i => { filled[i] = part.got[i]; }); paint(gen, s >= K ? part.got : filled); } };
    const controls = [
      { type: 'buttons', label: 'Steps', options: ['1', '4', '16'], get: () => st.steps, act: i => { st.steps = i; draw(); } },
      { type: 'buttons', label: 'Each step keeps', options: ['Most confident', 'Random codes'], get: () => (st.conf ? 0 : 1), act: i => { st.conf = !i; draw(); } },
      { type: 'buttons', label: 'Trained with masking', options: ['0–100%', 'Only 15%'], get: () => (st.low ? 1 : 0), act: i => { st.low = !!i; draw(); } },
      { type: 'button', label: 'Generate again', act: () => { st.seed++; draw(); } },
    ];
    const readouts = [
      { label: 'Codes right', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: 'against the design asked for', good: R.acc >= 0.85, bad: R.acc < 0.65 }) },
      { label: 'Model passes', get: () => ({ v: String(STEPS[st.steps]), sub: 'versus 256 writing codes one by one' }) },
      { label: 'Codes per pass', get: () => ({ v: String(Math.round(N * N / STEPS[st.steps])), sub: 'on average' }) },
    ];
    const labels = [
      { name: 'gen', t: 'Unmasking', d: 'Grey: still masked', icon: 'spark', atV: V(-1.25 - N * CELL / 2 - 0.1, 0.2, -0.1) },
      { name: 'ref', t: 'The design asked for', d: 'Concentric basket rings', icon: 'eye', atV: V(1.6 + N * CELL / 2 + 0.1, 0.2, -0.1) },
    ];
    const reset = () => { Object.assign(st, { steps: 2, conf: true, low: false, seed: 0 }); draw(); };
    const breaks = [
      { label: 'All in one step', hint: 'No context', on: () => { reset(); st.steps = 0; draw(); }, off: reset },
      { label: 'Keep codes at random', hint: 'Ignore confidence', on: () => { reset(); st.conf = false; draw(); }, off: reset },
      { label: 'Trained only on 15% masking', hint: 'Never saw a blank canvas', on: () => { reset(); st.low = true; draw(); }, off: reset },
    ];
    function status() {
      const a = Math.round(R.acc * 100);
      if (st.steps === 0) return { ok: false, msg: `<b>Every code guessed with nothing known.</b> In one step all 256 codes are predicted from a fully masked picture, so none can use its neighbours: only ${a}% are right and the rings break into noise. Several steps let each round use the codes fixed before it; 16 is typical.` };
      if (!st.conf) return { ok: false, msg: `<b>Wrong codes get locked in.</b> Keeping a random selection each step commits low-confidence guesses as readily as sure ones, and once fixed they are never revisited: ${a}% right. Keeping the most confident codes first fills easy, well-supported places early and leaves hard ones for when more is known.` };
      if (st.low) return { ok: false, msg: `<b>It cannot start from a blank canvas.</b> A model trained only with 15% of codes masked always had most of the picture to lean on. Facing a fully masked grid, its early guesses are poor, they get committed, and errors spread: ${a}% right. Training masks anywhere from almost none to all of the codes.` };
      return { ok: true, msg: `<b>${a}% of codes right in ${STEPS[st.steps]} passes.</b> Each step predicts every masked code at once and keeps the most confident on a cosine schedule, so early steps place a few sure codes and later steps fill in with plenty of context. Writing them one by one would take 256 passes.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A new basket lid', home: true, say: 'A craft cooperative in Bahir Dar previews new designs for woven basket lids: concentric rings in red, gold, green and blue.', act: m => m.set({ steps: 2, conf: true, low: false, seed: 0 }) },
    { t: 'Start masked', home: true, say: 'Generation starts with every code hidden. Each step, the model predicts all hidden codes at once.', act: m => m.set({}) },
    { t: 'Keep the surest', home: true, say: 'It keeps only the codes it is surest of and hides the rest again. Later steps use what is already fixed.', act: m => m.set({}) },
    { t: 'One step', home: true, say: 'Do it all in one step, and every code is guessed with nothing known around it. The rings fall apart.', act: m => m.set({ steps: 0 }) },
    { t: 'Random keeping', home: true, say: 'Keep codes at random instead of by confidence, and wrong guesses get locked in.', act: m => m.set({ steps: 2, conf: false }) },
    { t: 'Train for blank canvases', home: true, say: 'A model trained only with light masking has never started from nothing. Train with every masking level.', act: m => m.set({ conf: true, low: true }) },
  ],
  check: [
    { q: 'How does Show-o generate an image?', options: ['Predicts all masked codes each step and keeps the most confident', 'Writes codes one at a time', 'Copies a stored image'], answer: 0, why: 'Masked discrete diffusion.' },
    { q: 'Why keep the most confident predictions first?', options: ['Sure codes give context for the harder ones later', 'They are the cheapest', 'Random is not allowed'], answer: 0, why: 'Committed codes are never revisited.' },
    { q: 'Why train with masking ratios from almost none to all?', options: ['Generation starts from a fully masked picture', 'To save memory', 'Text needs it'], answer: 0, why: 'Otherwise it never learns to start from blank.' },
  ],
  terms: [
    ['Masked discrete diffusion', 'Generating codes by repeatedly unmasking a fully masked grid.'],
    ['MaskGIT', 'The parallel unmasking method Show-o builds on.'],
    ['Mask token', 'A special code standing for "unknown here".'],
    ['Confidence', 'How sure the model is of a predicted code.'],
    ['Cosine schedule', 'How many codes to keep at each step, few early, many late.'],
    ['Parallel decoding', 'Predicting many tokens in one pass.'],
  ],
  deeper: '<p><b>Crafts and design.</b> Mesob baskets, Kenyan kiondo bags and Zulu beadwork follow rich traditional patterns. Generators trained on such designs can help artisans preview variations; the communities should share in the benefit of their designs.</p><p><b>Speed.</b> Sixteen passes per picture puts Show-o near continuous diffusion and far ahead of code-by-code writing.</p><p><b>About this machine.</b> The design is drawn here; unmasking is simulated live with a seed, with the chance of a right guess rising with how many neighbours are known.</p>',
  code: {
    title: 'MaskGIT-style unmasking',
    note: 'Adapted from the course\'s Show-o lesson.',
    text: `
import math, torch

def unmask(model, prompt, n=256, steps=16, MASK=0):
    codes = torch.full((n,), MASK)
    for s in range(1, steps + 1):
        logits = model(prompt, codes)                  # all positions at once
        probs, pred = logits.softmax(-1).max(-1)
        masked = codes == MASK
        keep = round(n * (1 - math.cos(math.pi / 2 * s / steps))) - (~masked).sum()
        probs[~masked] = -1                            # only choose among masked
        idx = probs.topk(int(keep)).indices            # most confident first
        codes[idx] = pred[idx]
    return codes
`,
  },
};
