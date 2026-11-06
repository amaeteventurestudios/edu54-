// Projection layer (phase 19, lesson 60): image features live in one space, text in another. A small two-layer projection is trained for real on four pairs: dots in 2D move towards their captions under a cosine loss. Frozen encoders; only the projection learns. A Dodoma market-photo model.
const IMG = [[1, 0.2], [0.3, 1], [-0.9, 0.4], [-0.2, -1]], TXT = [[0.2, 1], [-1, 0.3], [-0.3, -0.9], [1, -0.2]];
function run(o) {
  let a = 1, b = 0, c = 0, d = 1;
  const proj = v => [a * v[0] + b * v[1], c * v[0] + d * v[1]], cos = (p, q) => (p[0] * q[0] + p[1] * q[1]) / (Math.hypot(...p) * Math.hypot(...q));
  for (let t = 0; t < o.steps; t++) IMG.forEach((v, i) => { const p = proj(v), q = TXT[(i + (o.shuffle ? 1 : 0)) % 4]; const l = o.lr * 0.08; a += l * (q[0] - p[0]) * v[0]; b += l * (q[0] - p[0]) * v[1]; c += l * (q[1] - p[1]) * v[0]; d += l * (q[1] - p[1]) * v[1]; });
  const pts = IMG.map(proj), sim = pts.reduce((s, p, i) => s + cos(p, TXT[i]), 0) / 4;
  return { pts, sim };
}

export default {
  slug: 'projection-layer-modality-align',
  title: 'A projection layer: bringing images into text space',
  description: 'Pictures and words live in different spaces. A small trained layer moves one onto the other.',
  overview: 'A vision encoder and a language model each have their own vector space, of different sizes and with different meanings. Before they can work together, you need a bridge. A small two-layer projection maps image features into text space, trained with a cosine loss so that each image lands near its caption. Freeze both encoders at first, so that only the projection learns: it is cheap, and it shows if alignment is possible. Here the loop really runs, on four pairs in two dimensions, for a market-photo model in Dodoma.',
  keywords: ['projection layer', 'multimodal', 'alignment', 'cosine similarity', 'embeddings', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.02, 1.2, 0.7], half: 1.05, wide: 4.6 },

  build(S) {
    const { V, P } = S;
    const D0 = { steps: 40, lr: 1, shuffle: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4, 0.03, 2.8, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const K = 1, COL = [GOOD, BLUE, SAF, '#D98BA6'];
    const tx = TXT.map((q, i) => { const b = P.cyl(0.16, 0.06, COL[i]); b.position.set(q[0] * K, 0.03, -q[1] * K); S.add(b); return b; });
    const pts = IMG.map((v, i) => { const b = P.box(0.18, 0.28, 0.18, COL[i], { r: 0.03 }); b.userData.noFit = true; S.add(b); return { b, x: 0, z: 0, tx: 0, tz: 0 }; });
    S.add(P.keep(-1.9, 1.9, 0.5, -1.3, 1.3));
    let R = null;
    function draw() { R = run(st); pts.forEach((p, i) => { p.tx = R.pts[i][0] * K; p.tz = -R.pts[i][1] * K; }); }
    draw(); pts.forEach(p => { p.x = p.tx; p.z = p.tz; p.b.position.set(p.x, 0.03, p.z); });
    const set = o => { Object.assign(st, o); draw(); };
    const controls = [
      { type: 'slider', label: 'Training steps', min: 0, max: 100, step: 1, get: () => st.steps, set: v => set({ steps: v }) },
      { type: 'slider', label: 'Learning rate', min: 0.1, max: 3, step: 0.1, get: () => st.lr, set: v => set({ lr: v }) },
      { type: 'toggle', label: 'Pairs are mislabelled', short: 'Shuffled', get: () => st.shuffle, set: v => set({ shuffle: !!v }) },
    ];
    const readouts = [
      { label: 'Mean cosine', get: () => ({ v: R.sim.toFixed(2), sub: '1 is a perfect match', good: R.sim > 0.9, bad: R.sim < 0.5 }) },
      { label: 'Trained', get: () => ({ v: 'projection only', sub: 'encoders frozen' }) },
      { label: 'Steps', get: () => ({ v: `${st.steps}` }) },
    ];
    const labels = [
      { name: 'i', t: 'Image points', d: 'Blocks move under training', icon: 'eye', atV: V(1.0, 0.2, 0.2) },
      { name: 't', t: 'Caption points', d: 'Discs stay still', icon: 'target', atV: V(-1.0, 0.1, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No training', hint: 'spaces don\'t line up', on: () => set({ ...D0, steps: 0 }), off: reset },
      { label: 'Mislabelled pairs', hint: 'aligned to the wrong caption', on: () => set({ ...D0, shuffle: true }), off: reset },
    ];
    function status() {
      if (st.shuffle) return { ok: false, msg: `<b>Mean cosine ${R.sim.toFixed(2)}: it learned the wrong pairs well.</b> Check your data pairs first.` };
      if (R.sim < 0.7) return { ok: false, msg: `<b>Mean cosine ${R.sim.toFixed(2)}.</b> Each block is far from its disc of the same colour.` };
      return { ok: true, msg: `<b>Mean cosine ${R.sim.toFixed(2)}.</b> Images land by their captions, with only the projection trained.` };
    }
    return { update: dt => { pts.forEach(p => { p.x += (p.tx - p.x) * Math.min(1, dt * 5); p.z += (p.tz - p.z) * Math.min(1, dt * 5); p.b.position.set(p.x, 0.03, p.z); }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two spaces', home: true, say: 'A market-photo model in Dodoma has image vectors and text vectors, in different spaces. Blocks don\'t sit near their discs.', act: m => m.set({ steps: 0, lr: 1, shuffle: false }) },
    { t: 'A bridge', home: true, say: 'A small projection maps images into text space. Only it will train.', act: m => m.set({ steps: 5, lr: 1, shuffle: false }) },
    { t: 'Training', home: true, say: 'A cosine loss pulls each block towards its caption.', act: m => m.set({ steps: 40, lr: 1, shuffle: false }) },
    { t: 'Aligned', home: true, say: 'Blocks now sit on their discs.', act: m => m.set({ steps: 100, lr: 1, shuffle: false }) },
    { t: 'Bad pairs', home: true, say: 'Shuffle the pairs, and it aligns images to the wrong captions, just as well.', act: m => m.set({ steps: 100, lr: 1, shuffle: true }) },
    { t: 'Frozen, then not', home: true, say: 'Train the projection first. Unfreeze the encoders later, if you need to.', act: m => m.set({ steps: 100, lr: 1, shuffle: false }) },
  ],
  check: [
    { q: 'What does the projection do?', options: ['Maps image features into text space', 'Trains the encoder', 'Crops images'], answer: 0, why: 'It bridges two spaces.', hint: 'See A bridge.' },
    { q: 'Why freeze the encoders first?', options: ['It is cheap, and shows if alignment is possible', 'They can\'t train', 'To save disk only'], answer: 0, why: 'Only the bridge learns.', hint: 'See the overview.' },
    { q: 'What loss pulls pairs together here?', options: ['A cosine loss', 'A pixel loss', 'A word count'], answer: 0, why: 'It rewards pointing the same way.', hint: 'See Training.' },
  ],
  terms: [['Modality', 'A kind of data.'], ['Projection', 'A map between spaces.'], ['Cosine similarity', 'How alike two directions are.'], ['Frozen', 'Not training.']],
  deeper: '<p><b>Two layers.</b> One hidden layer is common. Here a 2D linear map shows the idea.</p><p><b>Next.</b> Cross-attention lets text read image tokens directly.</p><p><b>This training</b> really runs.</p>',
  code: {
    title: 'A projection',
    note: 'Adapted from the course\'s projection (code/main.py).',
    text: `
proj = nn.Sequential(nn.Linear(768, 1024), nn.GELU(), nn.Linear(1024, text_dim))

def loss(images, captions):
    return 1 - F.cosine_similarity(proj(vision(images)), text(captions)).mean()
`,
  },
};
