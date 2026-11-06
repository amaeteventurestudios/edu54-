// Vision-language pretraining (phase 19, lesson 62): two skills, two losses. InfoNCE across a batch teaches ranking; language modelling teaches writing. A real InfoNCE sum on a 4×4 similarity grid for a Bahir Dar crop model. Grid towers show similarities; the diagonal should stand tall as training steps rise.
function run(o) {
  const n = o.batch, gain = Math.min(1, o.steps / 50), S0 = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0.2 + 0.7 * gain : 0.3 - 0.2 * gain + ((i * 7 + j * 3) % 5) * 0.02)));
  const loss = S0.reduce((a, row, i) => { const e = row.map(v => Math.exp(v / o.tau)), z = e.reduce((x, y) => x + y, 0); return a - Math.log(e[i] / z); }, 0) / n;
  const lm = 5 - 3.2 * gain * (o.lmw > 0 ? 1 : 0.2), total = loss * o.nce + lm * o.lmw;
  return { S0, loss, lm, total, chance: Math.log(n) };
}

export default {
  slug: 'vision-language-pretraining',
  title: 'Pretraining with two goals: rank and write',
  description: 'A vision-language model must match pictures to words, and also write. Two losses teach two skills.',
  overview: 'A vision-language model needs two skills. It must rank: given a picture, find the matching caption among others. It must also write: produce text about what it sees. InfoNCE teaches ranking. Over a batch, it pulls each image towards its own caption and away from the rest, with the batch itself supplying the negatives. A normal language-modelling loss teaches writing. Add them with weights, and both fall together. Larger batches give harder negatives, and temperature sets how sharply mistakes are punished. This runs a real InfoNCE sum for a crop model at Bahir Dar.',
  keywords: ['InfoNCE', 'contrastive learning', 'multimodal training', 'CLIP', 'vision-language', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.5, 0.9, 1.1], half: 1.05, wide: 4.6 },

  build(S) {
    const { V, P } = S;
    const D0 = { steps: 40, batch: 6, tau: 0.1, nce: 1, lmw: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#8FB3D0', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(3.4, 0.03, 3.4, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const G = i => -1.25 + i * 0.5, T = Array.from({ length: 36 }, (_, k) => { const t = add(P.tower(0.4, 0.4, BLUE)); t.position.set(G(k % 6), 0.03, G(Math.floor(k / 6))); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-1.7, 1.7, 1.0, -1.7, 1.7));
    let R = null;
    function draw() { R = run(st); T.forEach((t, k) => { const r = Math.floor(k / 6), c = k % 6, on = r < st.batch && c < st.batch; t.visible = on; if (on) t.userData.set({ h: Math.max(0.03, R.S0[r][c]), color: r === c ? GOOD : BLUE }); }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Steps', min: 0, max: 50, step: 1, get: () => st.steps, set: v => set({ steps: v }) },
      { type: 'slider', label: 'Batch size', min: 2, max: 6, step: 1, get: () => st.batch, set: v => set({ batch: v }) },
      { type: 'slider', label: 'Temperature', min: 0.05, max: 1, step: 0.05, get: () => st.tau, set: v => set({ tau: v }) },
      { type: 'slider', label: 'Weight of the writing loss', min: 0, max: 1, step: 0.1, get: () => st.lmw, set: v => set({ lmw: v }) },
    ];
    const readouts = [
      { label: 'InfoNCE', get: () => ({ v: R.loss.toFixed(2), sub: `chance: ${R.chance.toFixed(2)}`, good: R.loss < R.chance * 0.5 }) },
      { label: 'Language loss', get: () => ({ v: R.lm.toFixed(2), sub: 'for writing', bad: st.lmw === 0 }) },
      { label: 'Total', get: () => ({ v: R.total.toFixed(2) }) },
    ];
    const labels = [
      { name: 'g', t: 'Image against caption', d: 'Teal diagonal: the true pairs', icon: 'target', atV: V(G(0) - 0.2, 0.05, G(0)) },
      { name: 'b', t: 'The rest of the batch', d: 'Negatives, for free', icon: 'box', atV: V(G(5) + 0.2, 0.05, G(0)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Only rank', hint: 'no writing loss', on: () => set({ ...D0, lmw: 0 }), off: reset },
      { label: 'A batch of two', hint: 'one negative', on: () => set({ ...D0, batch: 2 }), off: reset },
      { label: 'Temperature too high', hint: 'mistakes barely punished', on: () => set({ ...D0, tau: 1 }), off: reset },
    ];
    function status() {
      if (st.lmw === 0) return { ok: false, msg: `<b>InfoNCE ${R.loss.toFixed(2)}: it matches well, and it can\'t write a sentence.</b> Ranking and writing are separate skills.` };
      if (st.batch <= 2) return { ok: false, msg: '<b>One negative in each batch.</b> Easy to beat, and little learned. Larger batches give harder negatives.' };
      if (st.tau > 0.5) return { ok: false, msg: `<b>InfoNCE ${R.loss.toFixed(2)}, near chance at ${R.chance.toFixed(2)}.</b> Too warm, and similar scores are hardly separated.` };
      return { ok: true, msg: `<b>InfoNCE ${R.loss.toFixed(2)}, language loss ${R.lm.toFixed(2)}.</b> The diagonal stands tall, and it can also write.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two skills', home: true, say: 'A crop model at Bahir Dar must match pictures to words, and write about them.', act: m => m.set({ steps: 0, batch: 6, tau: 0.1, lmw: 1 }) },
    { t: 'A grid', home: true, say: 'Each cell compares one image with one caption. The diagonal holds true pairs.', act: m => m.set({ steps: 10, batch: 6, tau: 0.1, lmw: 1 }) },
    { t: 'InfoNCE', home: true, say: 'Pull each image to its caption, and away from the rest. The batch supplies the negatives.', act: m => m.set({ steps: 40, batch: 6, tau: 0.1, lmw: 1 }) },
    { t: 'Batch size', home: true, say: 'More in the batch means harder negatives.', act: m => m.set({ steps: 40, batch: 2, tau: 0.1, lmw: 1 }) },
    { t: 'Writing', home: true, say: 'A language loss teaches it to write. Ranking alone leaves it mute.', act: m => m.set({ steps: 40, batch: 6, tau: 0.1, lmw: 0 }) },
    { t: 'Together', home: true, say: 'Add them with weights, and both fall.', act: m => m.set({ steps: 50, batch: 6, tau: 0.1, lmw: 1 }) },
  ],
  check: [
    { q: 'What does InfoNCE teach?', options: ['Ranking pairs', 'Writing', 'Tokenizing'], answer: 0, why: 'Own caption over others.', hint: 'See InfoNCE.' },
    { q: 'Where do negatives come from?', options: ['The rest of the batch', 'A separate file', 'The tokenizer'], answer: 0, why: 'They come free.', hint: 'See the grid.' },
    { q: 'What does a low temperature do?', options: ['Punishes mistakes more sharply', 'Slows the GPU', 'Shrinks the batch'], answer: 0, why: 'A sharper softmax.', hint: 'Try Temperature too high.' },
  ],
  terms: [['InfoNCE', 'A contrastive loss.'], ['Negative', 'A non-matching pair.'], ['Temperature', 'Scales similarity.'], ['Language loss', 'Next-token prediction.']],
  deeper: '<p><b>Symmetric.</b> Real training averages image-to-text and text-to-image.</p><p><b>Mock data.</b> The course uses a synthetic set so nothing needs downloading.</p><p><b>The sum</b> is real, and similarities are shaped to show training.</p>',
  code: {
    title: 'InfoNCE',
    note: 'Adapted from the course\'s pretraining (code/main.py).',
    text: `
def info_nce(image, text, tau=0.1):
    sim = F.normalize(image) @ F.normalize(text).T / tau
    labels = torch.arange(len(sim))
    return F.cross_entropy(sim, labels)

loss = info_nce(i, t) + lm_weight * language_loss
`,
  },
};
