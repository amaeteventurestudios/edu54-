// Cross-attention fusion (phase 19, lesson 61): text queries, image keys and values. A real small softmax: each of five text tokens scores nine image tokens for a Kampala market-stall photo. Causal mask on text self-attention, no mask on cross-attention. Towers show one token's weights over the image grid.
const WORDS = ['price', 'of', 'the', 'red', 'tomatoes'];
const VEC = { price: [0, 0, 1], of: [0, 0, 0], the: [0, 0, 0], red: [1, 0, 0], tomatoes: [1, 1, 0] };
const IMG = [[0, 0, 0.9], [0.1, 0.1, 0.8], [0, 0.2, 0.1], [0.9, 0.8, 0], [1, 0.9, 0], [0.8, 0.2, 0], [0, 0.9, 0.1], [0.1, 0.8, 0], [0.1, 0.1, 0.1]];
function run(o) {
  const q = VEC[WORDS[o.w]], s = IMG.map(k => (q[0] * k[0] + q[1] * k[1] + q[2] * k[2]) * o.t), m = Math.max(...s), e = s.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0), W = e.map(v => v / z);
  const flat = Math.max(...W) < 0.2;
  return { W, top: W.indexOf(Math.max(...W)), peak: Math.max(...W), flat };
}

export default {
  slug: 'cross-attention-fusion',
  title: 'Cross-attention: words that look at pictures',
  description: 'Text asks, image answers. See one word\'s attention land on the part of the picture it means.',
  overview: 'Joining image and text vectors end to end is a blunt way to fuse them. Cross-attention is better. Queries come from text, while keys and values come from image tokens, so each word can look at the parts of a picture it needs. A decoder block then has three steps: causal self-attention over the text, cross-attention to the image, and feed-forward. Masks differ: the causal mask stays on text self-attention, and cross-attention takes no causal mask, as the whole image is available. Here each word scores nine image tokens, using a real softmax, for a market stall in Kampala.',
  keywords: ['cross-attention', 'multimodal fusion', 'decoder block', 'vision-language', 'attention', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.9, 1.1], half: 1.05, wide: 4.6 },

  build(S) {
    const { V, P } = S;
    const D0 = { w: 4, t: 6, cross: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4.4, 0.03, 2.8, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const G = i => -0.55 + i * 0.68, T = IMG.map((k, i) => { const c = `rgb(${Math.round(k[0] * 200 + 40)}, ${Math.round(k[1] * 180 + 50)}, ${Math.round(k[2] * 200 + 50)})`, t = add(P.tower(0.56, 0.56, c)); t.position.set(G(i % 3), 0.03, -0.68 + Math.floor(i / 3) * 0.68); t.userData.set({ cap: '' }); return t; });
    const Wd = WORDS.map((w, i) => { const m = new S.THREE.MeshLambertMaterial({ color: '#BFB8A8' }), b = P.box(0.3, 0.24, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.6, 0.03, -0.9 + i * 0.45); S.add(b); return m; });
    S.add(P.keep(-2.0, 1.4, 1.1, -1.2, 1.2));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => t.userData.set({ h: st.cross ? Math.max(0.03, R.W[i] * 1.2) : 0.05 })); Wd.forEach((m, i) => m.color.set(i === st.w ? SAF : '#BFB8A8')); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'The word asking', options: WORDS, get: () => st.w, act: i => set({ w: i }) },
      { type: 'slider', label: 'Sharpness', min: 1, max: 12, step: 1, get: () => st.t, set: v => set({ t: v }) },
      { type: 'toggle', label: 'Cross-attention', short: 'Cross', get: () => st.cross, set: v => set({ cross: !!v }) },
    ];
    const readouts = [
      { label: 'Asking', get: () => ({ v: WORDS[st.w], sub: 'query from text' }) },
      { label: 'Top image token', get: () => ({ v: `${R.top + 1} of 9`, sub: `weight ${Math.round(R.peak * 100)}%`, good: R.peak > 0.25 }) },
      { label: 'Keys and values', get: () => ({ v: 'from the image', sub: 'no causal mask' }) },
    ];
    const labels = [
      { name: 'w', t: 'Text tokens', d: 'Gold: the one asking', icon: 'wave', atV: V(-1.8, 0.15, 0) },
      { name: 'g', t: 'Image tokens', d: 'Height: attention from that word', icon: 'eye', atV: V(1.0, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Ask with a function word', hint: '"of" means nothing here', on: () => set({ ...D0, w: 1 }), off: reset },
      { label: 'No cross-attention', hint: 'the picture isn\'t read', on: () => set({ ...D0, cross: false }), off: reset },
    ];
    function status() {
      if (!st.cross) return { ok: false, msg: '<b>Text never reads the picture.</b> With no cross-attention, the answer ignores the photo.' };
      if (R.flat) return { ok: false, msg: `<b>"${WORDS[st.w]}" spreads evenly.</b> It has no visual meaning, so no token stands out. That is correct, and it isn\'t a bug.` };
      return { ok: true, msg: `<b>"${WORDS[st.w]}" lands on image token ${R.top + 1}, at ${Math.round(R.peak * 100)}%.</b> The word found the part of the picture it means.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A photo and a question', home: true, say: 'A stall in Kampala, a photo and a question: what is the price of the red tomatoes?', act: m => m.set({ w: 0, t: 6, cross: true }) },
    { t: 'Text asks', home: true, say: 'Queries come from text. Keys and values come from image tokens.', act: m => m.set({ w: 0, t: 6, cross: true }) },
    { t: 'Red', home: true, say: 'The word red looks at red regions.', act: m => m.set({ w: 3, t: 6, cross: true }) },
    { t: 'Tomatoes', home: true, say: 'Tomatoes lands on the tomatoes. Each word finds its part.', act: m => m.set({ w: 4, t: 6, cross: true }) },
    { t: 'Small words', home: true, say: 'Of means nothing here, so its attention spreads out.', act: m => m.set({ w: 1, t: 6, cross: true }) },
    { t: 'Three steps', home: true, say: 'A block does self-attention with a mask, cross-attention without one, then feed-forward.', act: m => m.set({ w: 4, t: 6, cross: true }) },
  ],
  check: [
    { q: 'Where do queries come from?', options: ['Text', 'The image', 'The optimizer'], answer: 0, why: 'Keys and values come from the image.', hint: 'See Text asks.' },
    { q: 'Is cross-attention causally masked?', options: ['No', 'Yes', 'Only at the start'], answer: 0, why: 'The whole image is available.', hint: 'See Three steps.' },
    { q: 'Why does "of" spread out?', options: ['It has no visual meaning', 'It\'s broken', 'It\'s too short'], answer: 0, why: 'No part of the picture matches.', hint: 'Try Ask with a function word.' },
  ],
  terms: [['Cross-attention', 'Attention between two streams.'], ['Fusion', 'Joining modalities.'], ['Decoder block', 'Self, cross, feed-forward.'], ['Image token', 'One patch vector.']],
  deeper: '<p><b>Other fusion.</b> Some models place image tokens directly in the text sequence.</p><p><b>Masks.</b> Padding masks may still apply.</p><p><b>Weights</b> are really computed on small vectors.</p>',
  code: {
    title: 'A decoder block',
    note: 'Adapted from the course\'s block (code/main.py).',
    text: `
def forward(self, text, image):
    x = text + self.self_attn(self.n1(text), mask=causal)
    x = x + self.cross_attn(self.n2(x), key=image, value=image)
    return x + self.ff(self.n3(x))
`,
  },
};
