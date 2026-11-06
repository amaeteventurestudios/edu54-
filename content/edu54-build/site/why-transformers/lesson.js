// Why transformers: "The bales of cloth that the trader brought from Onitsha for the wedding ... were heavy." To agree "were" with "bales", the model must carry
// information across the whole sentence. An RNN passes a baton (its hidden state) from word to word, one step at a time; a transformer lets every word look at every
// other word at once. Serial steps, how much signal from "bales" survives to "were", training time and attention memory are computed live from simple formulas.
// Break it: a plain RNN on a 200-word sentence (the signal from "bales" vanishes), an RNN on a GPU (thousands of cores wait on one step at a time),
// naive attention on 128K tokens (the attention matrix does not fit in memory).
const WORDS = ['The', 'bales', 'of', 'cloth', 'that', 'the', 'trader', 'brought', 'from', 'Onitsha', '…', 'were', 'heavy'];
const LENS = [12, 200, 128000], KEEP = { rnn: 0.85, lstm: 0.985 };
const fmtN = n => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
const bytes = b => (b >= 1e12 ? `${(b / 1e12).toFixed(1)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

export default {
  slug: 'why-transformers',
  title: 'Why transformers? Look everywhere at once',
  description: 'To match "were" with "bales" across a long sentence, a model must carry it all the way. An RNN passes a baton word by word; a transformer lets each word look back.',
  overview: 'Before 2017 sequence models were recurrent: an RNN reads one token at a time and updates a hidden state, so token t must wait for token t minus one. That has three costs. Training cannot run in parallel along the sequence, so a GPU with thousands of cores waits on one step at a time. Information from early tokens is squeezed through every step and fades, the vanishing gradient, which gates in LSTMs soften but do not remove. And the whole input passes through one fixed-size state. Transformers drop recurrence: self-attention lets every position look at every other position in one large matrix multiplication, so the path between any two words is a single step and training parallelises. The price is memory: the attention matrix grows with the square of the length, which is why long contexts need tricks such as Flash Attention, which computes attention in tiles without storing the whole matrix.',
  keywords: ['transformer', 'rnn', 'lstm', 'vanishing gradient', 'parallelism', 'attention memory'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 1.05, 1.0], half: 1.45, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { model: 2, len: 1, flash: true };
    const ink = '#151827', MODELS = ['RNN', 'LSTM', 'Transformer'];
    const WX = i => -2.85 + i * 0.475, WZ = 0.45;
    const blocks = WORDS.map((w, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: '#E3DCCB' }), b = P.box(0.44, 0.3, 0.44, '#E3DCCB', { r: 0.04, material: mm }); b.position.set(WX(i), 0.12, WZ); floor.add(b);
      return { mm };
    });

    /* RNN: a baton that travels word to word; links between blocks */
    const links = WORDS.slice(1).map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: C.plum }), r = P.rod(V(WX(i) + 0.21, 0.27, WZ), V(WX(i + 1) - 0.21, 0.27, WZ), 0.02, C.plum); r.material = mm; floor.add(r); return { r, mm }; });
    const baton = P.ball(0.07, C.coral); baton.userData.noFit = true; floor.add(baton);
    /* transformer: arcs from "were" to every word */
    const arcs = WORDS.map((_, i) => { const mm = new THREE.MeshBasicMaterial({ color: C.coral, transparent: true, opacity: 0.8 }), a = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.012, C.coral, { material: mm }); a.layers.set(1); a.userData.noFit = true; floor.add(a); return { a, mm }; });
    const W11 = V(WX(11), 0.45, WZ);
    arcs.forEach((A, i) => { if (i === 11) return; const p = V(WX(i), 0.45, WZ), mid = p.clone().lerp(W11, 0.5).add(V(0, 0.25 + Math.abs(11 - i) * 0.07, -0.25)); A.a.geometry.dispose(); A.a.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(W11, mid, p), 24, 0.012, 6, false); });
    /* the attention matrix plate behind, sized by memory */
    const MX = 1.6, MZ = -0.65, plate = P.box(1, 0.06, 1, C.plum, { r: 0.02 }); plate.position.set(MX, 0.12, MZ); plate.userData.noFit = true; floor.add(plate);
    const gpuOut = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.02, 1.2)), new THREE.LineBasicMaterial({ color: '#151827' })); gpuOut.position.set(MX, 0.2, MZ); gpuOut.layers.set(1); floor.add(gpuOut);


    /* serial-steps counter on the left */
    const CX = -1.4;



    let R = null, t0 = 0;
    function run() {
      const n = LENS[st.len], m = MODELS[st.model], dist = n - 2;
      const keep = m === 'Transformer' ? 1 : Math.pow(KEEP[m === 'RNN' ? 'rnn' : 'lstm'], dist);
      const steps = m === 'Transformer' ? 1 : n;
      const attnBytes = m === 'Transformer' ? (st.flash ? n * 128 * 2 * 32 : n * n * 2 * 32) : n * 1024 * 4;
      const fits = attnBytes < 80e9;
      return { n, m, keep, steps, attnBytes, fits };
    }
    function draw() {
      R = run();
      const tr = R.m === 'Transformer';
      blocks.forEach((b, i) => {
        b.mm.color.set(i === 1 || i === 11 ? (i === 1 ? new THREE.Color(C.coral).lerp(new THREE.Color('#E3DCCB'), 1 - (tr ? 1 : Math.max(0.05, R.keep))) : '#F2C94C') : '#E3DCCB'); });
      links.forEach(l => { l.r.visible = !tr; });
      arcs.forEach((A, i) => { A.a.visible = tr && i !== 11; A.mm.opacity = i === 1 ? 0.95 : 0.35; A.mm.color.set(i === 1 ? C.coral : C.plum); });
      const side = Math.min(1.5, 0.15 + Math.sqrt(R.attnBytes / 80e9) * 1.2);
      plate.scale.set(side, 1, side); plate.material.color.set(R.fits ? C.plum : '#D64545');



    }
    draw();
    const update = dt => { t0 += dt; const tr = R.m === 'Transformer'; baton.visible = !tr; if (tr) return; const u = (t0 * 0.6) % 1, k = Math.min(11.99, u * 12), i = Math.floor(k); baton.position.set(WX(i) + (WX(i + 1) - WX(i)) * (k - i), 0.5, WZ); };
    const controls = [
      { type: 'buttons', label: 'Model', options: MODELS, get: () => st.model, act: i => { st.model = i; draw(); } },
      { type: 'buttons', label: 'Sentence length', options: LENS.map(n => `${fmtN(n)} words`), get: () => st.len, act: i => { st.len = i; draw(); } },
      { type: 'toggle', label: 'Flash Attention (tiled)', short: 'flash', get: () => st.flash, set: v => { st.flash = v; draw(); } },
    ];
    const readouts = [
      { label: 'Serial steps', get: () => ({ v: R.steps.toLocaleString('en'), sub: 'each waits for the last', bad: R.steps > 1000, good: R.steps === 1 }) },
      { label: '"bales" reaches "were"', get: () => ({ v: R.keep < 0.001 ? '<0.1%' : `${(R.keep * 100).toFixed(R.keep < 0.1 ? 1 : 0)}%`, sub: 'of its signal', bad: R.keep < 0.05, good: R.keep > 0.5 }) },
      { label: 'Memory', get: () => ({ v: bytes(R.attnBytes), sub: 'GPU holds 80 GB', bad: !R.fits, good: R.fits }) },
    ];
    const labels = [
      { name: 'words', t: 'The sentence', d: '"bales" must reach "were"', icon: 'link', atV: V(-3.1, 0.27, WZ) },
      { name: 'mem', t: 'Memory used', d: 'Red: does not fit', icon: 'box', atV: V(MX + 0.75, 0.15, MZ) },
    ];
    const reset = () => { Object.assign(st, { model: 2, len: 1, flash: true }); draw(); };
    const breaks = [
      { label: 'Plain RNN, long sentence', hint: '200 words', on: () => { reset(); st.model = 0; draw(); }, off: reset },
      { label: 'RNN on a GPU, very long', hint: '128K tokens', on: () => { reset(); st.model = 1; st.len = 2; draw(); }, off: reset },
      { label: 'Naive attention, 128K', hint: 'No tiling', on: () => { reset(); st.len = 2; st.flash = false; draw(); }, off: reset },
    ];
    function status() {
      const k = R.keep < 0.001 ? 'under 0.1%' : `${(R.keep * 100).toFixed(R.keep < 0.1 ? 1 : 0)}%`;
      if (R.m !== 'Transformer' && R.keep < 0.05 && R.n < 1000) return { ok: false, msg: `<b>"Bales" fades before "were".</b> The ${R.m} squeezes everything through its hidden state at each of ${R.n - 2} steps, and each step keeps only part of the signal: ${k} of what "bales" contributed is left at "were". The model cannot learn that "were" agrees with "bales". Gates help (an LSTM keeps far more), and attention removes the long path entirely.` };
      if (R.m !== 'Transformer' && R.n > 1000) return { ok: false, msg: `<b>Thousands of cores waiting in line.</b> An ${R.m} must take ${R.steps.toLocaleString('en')} steps one after another, because each needs the last one's state. A GPU can run thousands of operations at once, but here it does one step at a time, and the signal from the start is long gone (${k}). Attention computes all positions in one large matrix multiplication.` };
      if (!R.fits) return { ok: false, msg: `<b>The attention matrix does not fit.</b> Every one of ${fmtN(R.n)} tokens looks at every other, so storing the full matrix for 32 heads takes ${bytes(R.attnBytes)}, far beyond the GPU's 80 GB. Memory grows with the square of the length. Flash Attention computes the same result in tiles without storing the whole matrix.` };
      return { ok: true, msg: `<b>${R.m === 'Transformer' ? 'One step, a direct path.' : `${R.m}: ${R.steps} steps.`}</b> ${R.m === 'Transformer' ? `Every word looks at every other at once, so "were" reaches "bales" in a single step with nothing lost, and training runs in parallel. ${st.flash ? `Tiled attention keeps memory to ${bytes(R.attnBytes)}.` : `The full matrix takes ${bytes(R.attnBytes)}.`}` : `On a short sentence, ${k} of the signal from "bales" survives, enough to learn the agreement.`}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A long sentence', home: true, say: 'The bales of cloth that the trader brought from Onitsha for the wedding were heavy. To write "were", a model must remember "bales".', act: m => m.set({ model: 0, len: 0, flash: true }) },
    { t: 'Pass the baton', home: true, say: 'An RNN reads one word at a time and passes its memory on, like a baton. On a short sentence, enough of "bales" survives.', act: m => m.set({ model: 0, len: 0 }) },
    { t: 'It fades', home: true, say: 'Make the sentence two hundred words long, and almost nothing of "bales" reaches "were". The signal fades at every step.', act: m => m.set({ len: 1 }) },
    { t: 'One step at a time', home: true, say: 'Worse, every step waits for the last. A GPU built to do thousands of things at once does one at a time.', act: m => m.set({ model: 1, len: 2 }) },
    { t: 'Look everywhere', home: true, say: 'A transformer lets every word look at every other word at once. "Were" reaches "bales" in a single step, and training runs in parallel.', act: m => m.set({ model: 2, len: 1 }) },
    { t: 'The price', home: true, say: 'The cost is memory. At a hundred and twenty-eight thousand tokens, the full attention matrix will not fit. Tiled attention solves it.', act: m => m.set({ len: 2, flash: false }) },
  ],
  check: [
    { q: 'Why can\'t an RNN be trained in parallel along a sequence?', options: ['Each step needs the hidden state from the step before', 'It has too few weights', 'GPUs cannot run RNNs'], answer: 0, why: 'Steps form a chain.' },
    { q: 'What is the vanishing gradient problem?', options: ['Signal from early tokens fades through many steps', 'Weights become zero at the start', 'The model forgets the last word'], answer: 0, why: 'Each step keeps only part of it.' },
    { q: 'What does self-attention cost that an RNN does not?', options: ['Memory that grows with the square of the length', 'Serial steps', 'A hidden state'], answer: 0, why: 'Every token looks at every other.' },
  ],
  terms: [
    ['RNN', 'A model that reads a sequence one step at a time, carrying a hidden state.'],
    ['LSTM', 'An RNN with gates that help keep information longer.'],
    ['Hidden state', 'The memory an RNN passes from step to step.'],
    ['Vanishing gradient', 'Signal shrinking as it passes back through many steps.'],
    ['Self-attention', 'Every position looking at every other position at once.'],
    ['Flash Attention', 'Computing attention in tiles without storing the full matrix.'],
  ],
  deeper: '<p><b>The same block everywhere.</b> Since 2017 the transformer block has taken over language, vision, speech, biology and robotics; only the inputs change.</p><p><b>Recurrence returns.</b> State-space models and linear attention bring back some of the RNN\'s cheap, constant memory for very long inputs, while keeping parallel training.</p><p><b>About this machine.</b> Signal survival uses a fixed keep rate per step, and memory and time use simple formulas, to show the shapes: fading with distance, steps growing with length, attention memory growing with its square.</p>',
  code: {
    title: 'Serial depth versus parallel attention',
    note: 'Adapted from the course\'s why-transformers lesson.',
    text: `
import numpy as np

def rnn(xs, W, U, h=None):
    h = np.zeros(W.shape[0]) if h is None else h
    for x in xs:                       # one step at a time: len(xs) serial steps
        h = np.tanh(W @ h + U @ x)
    return h

def attention(X, Wq, Wk, Wv):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv   # all positions at once
    A = Q @ K.T / np.sqrt(K.shape[1])  # (n, n): memory grows with n squared
    A = np.exp(A - A.max(1, keepdims=True)); A /= A.sum(1, keepdims=True)
    return A @ V
`,
  },
};
