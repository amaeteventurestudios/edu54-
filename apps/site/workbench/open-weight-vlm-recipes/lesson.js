// Open-weight VLM recipes: a university team in Accra assembles a vision-language model from open parts to read local documents and scenes. Five choices sit on the
// bench: image encoder, connector, language model, training captions, and image tokens. Two gauges show a general reasoning score and a document-reading score.
// The scores come from an additive model built from the size of each effect in published controlled comparisons (Prismatic, MM1, Idefics2, Molmo); parameters are summed live.
// Break it: 64 image tokens (documents become unreadable), captions distilled from another model (more made-up details), a 7B language model with everything else at
// its best (the reasoning ceiling stays low).
const ENC = [['CLIP ViT-L', 0.3, 0], ['SigLIP SO400m', 0.4, 3], ['SigLIP + DINOv2', 1.5, 5]];
const LLM = [['7B', 7, 0], ['13B', 13, 3], ['70B', 70, 8]];
const TOK = [64, 576, 2048];

export default {
  slug: 'open-weight-vlm-recipes',
  title: 'VLM recipes: what actually matters',
  description: 'A university team in Accra builds a vision-language model from open parts to read local documents and scenes.',
  overview: 'Every open vision-language model makes five choices: an image encoder, a connector, a language model, training data and how many image tokens to use at what resolution. Controlled studies such as Prismatic, MM1 and Idefics2 changed one at a time and found a clear order. The number of visual tokens per image explains most of the difference, especially for reading documents and charts; 64 tokens are far too few, a few hundred to a thousand suit most tasks. The encoder comes next: SigLIP beats CLIP, and adding DINOv2 features helps spatial questions. The connector, an MLP, Q-Former or resampler, barely matters at the same token count; it is a cost choice. The language model sets the reasoning ceiling, so a 7B model cannot match a 70B one by clever plumbing. And data quality wins over quantity: Molmo\'s dense human-written captions beat captions distilled from another model, which carry its hallucinations. Ramp resolution during training and finish high for documents.',
  keywords: ['vision language model', 'image encoder', 'connector', 'visual tokens', 'dense captions', 'ablation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0], dir: [0.05, 0.5, 1.3], half: 1.5, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { enc: 1, conn: 0, llm: 1, data: 1, tok: 1 };
    const ink = '#151827';
    const mk = (x, col, name) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(0.8, 1, 0.7, col, { r: 0.05, material: mm }); b.position.set(x, 0.12, 0.1); b.userData.noFit = true; floor.add(b);
      const pl = P.box(0.95, 0.22, 0.06, '#FBF8F1', { r: 0.02 }); pl.position.set(x, 0.12, 0.6); floor.add(pl);
         return { b, mm, x }; };
    const parts = [mk(-2.6, '#3B3F8F', 'Encoder'), mk(-1.6, '#8D6E63', 'Connector'), mk(-0.6, C.plum, 'Language model'), mk(0.4, '#C9A227', 'Captions'), mk(1.4, '#1F9E89', 'Image tokens')];
    const keep = P.box(0.8, 1.6, 0.7, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-0.6, 0.12, 0.1); floor.add(keep);
    /* gauges */
    const GX = 2.55, gb = P.box(1.2, 1.7, 0.05, '#2B2B38', { r: 0.03 }); gb.position.set(GX, 0.12, -0.5); floor.add(gb);

    const gauges = ['reasoning', 'documents'].map((n, k) => { const x = GX - 0.27 + k * 0.54, mm = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), b = P.box(0.36, 1, 0.06, '#888', { r: 0.02, material: mm }); b.position.set(x, 0.3, -0.44); b.userData.noFit = true; floor.add(b);
         return { b, mm, x }; });

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function run() {
      const t = TOK[st.tok];
      const tokG = t === 64 ? -6 : t === 576 ? 0 : 1, tokD = t === 64 ? -22 : t === 576 ? 0 : 6;
      const conn = st.conn === 1 ? -0.5 : 0, data = st.data === 1 ? 4 : 0, halluc = st.data === 1 ? 8 : 19;
      const g = 40 + ENC[st.enc][2] * 0.5 + LLM[st.llm][2] * 1.5 + data + tokG + conn, d = 45 + ENC[st.enc][2] * 0.8 + LLM[st.llm][2] * 0.5 + data * 0.7 + tokD + conn;
      const params = ENC[st.enc][1] + LLM[st.llm][1] + (st.conn === 0 ? 0.02 : 0.19);
      const g70 = g - LLM[st.llm][2] * 1.5 + LLM[2][2] * 1.5;
      return { t, g, d, halluc, params, g70 };
    }
    function draw() {
      R = run();
      const sz = [[0.5, 0.6, 1.0][st.enc], [0.4, 0.55][st.conn], [0.6, 0.85, 1.5][st.llm], [0.5, 0.8][st.data], [0.25, 0.6, 1.1][st.tok]];
      const nm = [ENC[st.enc][0], ['2-layer MLP', 'Q-Former (32)'][st.conn], LLM[st.llm][0], ['Distilled', 'Dense human'][st.data], `${R.t} per image`];
      parts.forEach((p, i) => { p.b.scale.y = sz[i];   });
      parts[4].mm.color.set(R.t === 64 ? '#D64545' : '#1F9E89'); parts[3].mm.color.set(st.data === 0 ? '#D64545' : '#C9A227'); parts[2].mm.color.set(st.llm === 0 ? '#D64545' : C.plum);
      [R.g, R.d].forEach((v, k) => { const h = Math.max(0.03, (v - 15) / 55 * 1.2); gauges[k].b.scale.y = h; gauges[k].mm.color.set(v < 40 ? '#D64545' : '#1F9E89');   });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Image encoder', options: ENC.map(e => e[0]), get: () => st.enc, act: i => { st.enc = i; draw(); } },
      { type: 'buttons', label: 'Connector', options: ['2-layer MLP', 'Q-Former'], get: () => st.conn, act: i => { st.conn = i; draw(); } },
      { type: 'buttons', label: 'Language model', options: LLM.map(l => l[0]), get: () => st.llm, act: i => { st.llm = i; draw(); } },
      { type: 'buttons', label: 'Captions', options: ['Distilled from a model', 'Dense, human-written'], get: () => st.data, act: i => { st.data = i; draw(); } },
      { type: 'buttons', label: 'Image tokens', options: TOK.map(String), get: () => st.tok, act: i => { st.tok = i; draw(); } },
    ];
    const readouts = [
      { label: 'Reasoning score', get: () => ({ v: R.g.toFixed(0), sub: 'illustrative, out of 100', good: R.g >= 50, bad: R.g < 47 }) },
      { label: 'Document score', get: () => ({ v: R.d.toFixed(0), sub: 'reading forms and signs', good: R.d >= 50, bad: R.d < 35 }) },
      { label: 'Made-up details', get: () => ({ v: `${R.halluc}%`, sub: 'of descriptions', bad: R.halluc > 12, good: R.halluc <= 10 }) },
    ];
    const labels = [
      { name: 'bench', t: 'Five choices', d: 'Red: the weak link', icon: 'box', atV: V(-3.05, 0.4, 0.1) },
      { name: 'scores', t: 'Scores', d: 'Reasoning and documents', icon: 'scale', atV: V(GX + 0.62, 1.0, -0.5) },
    ];
    const reset = () => { Object.assign(st, { enc: 1, conn: 0, llm: 1, data: 1, tok: 1 }); draw(); };
    const breaks = [
      { label: '64 image tokens', hint: 'Save context', on: () => { reset(); st.tok = 0; draw(); }, off: reset },
      { label: 'Distilled captions', hint: 'Cheap data', on: () => { reset(); st.data = 0; draw(); }, off: reset },
      { label: 'Small language model', hint: 'Best of everything else', on: () => { reset(); st.llm = 0; st.enc = 2; st.tok = 2; draw(); }, off: reset },
    ];
    function status() {
      if (R.t === 64) return { ok: false, msg: `<b>Documents become unreadable.</b> With only 64 image tokens, a scanned form or a shop sign is squeezed into a few vectors and the small print is lost: the document score falls to ${R.d.toFixed(0)}. In controlled studies, tokens per image explain more of the difference between models than any other choice. Use a few hundred, and more for documents.` };
      if (st.data === 0) return { ok: false, msg: `<b>It invents details ${R.halluc}% of the time.</b> Captions written by another model are cheap and plentiful, but they carry that model's guesses, and the new model learns to describe things that are not in the picture. Dense captions written by people, as in Molmo's data, cut made-up details to about ${8}% and raise both scores.` };
      if (st.llm === 0) return { ok: false, msg: `<b>The ceiling is the language model.</b> The best encoder and 2,048 image tokens let a 7B model see clearly, but it still reasons like a 7B model: reasoning ${R.g.toFixed(0)}, against ${R.g70.toFixed(0)} for a 70B model with the same parts. The vision side can only feed the language model; it cannot reason for it. A larger language model raises the ceiling.` };
      return { ok: true, msg: `<b>Reasoning ${R.g.toFixed(0)}, documents ${R.d.toFixed(0)}.</b> ${st.conn === 1 ? 'Swapping in a Q-Former changed the scores by half a point: at the same token count, the connector is a cost choice, not a quality one.' : 'Note how little the connector matters: try a Q-Former and the scores barely move.'} The model has about ${R.params.toFixed(1)} billion parameters, nearly all in the language model.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Build from parts', home: true, say: 'A university team in Accra builds a vision-language model from open parts, to read local documents and scenes.', act: m => m.set({ enc: 1, conn: 0, llm: 1, data: 1, tok: 1 }) },
    { t: 'The connector', home: true, say: 'Swap the connector from an MLP to a Q-Former. The scores barely move. At the same token count, it hardly matters.', act: m => m.set({ conn: 1 }) },
    { t: 'Image tokens', home: true, say: 'Cut image tokens to sixty-four, and documents become unreadable. Tokens per image matter most.', act: m => m.set({ conn: 0, tok: 0 }) },
    { t: 'The encoder', home: true, say: 'A better encoder comes next: SigLIP beats CLIP, and adding DINOv2 features helps spatial questions.', act: m => m.set({ tok: 1, enc: 2 }) },
    { t: 'The captions', home: true, say: 'Train on captions distilled from another model, and it learns to invent details. Dense human captions are better.', act: m => m.set({ enc: 1, data: 0 }) },
    { t: 'The ceiling', home: true, say: 'Put everything on a small language model, and it still reasons like a small one. The language model sets the ceiling.', act: m => m.set({ data: 1, llm: 0, enc: 2, tok: 2 }) },
  ],
  check: [
    { q: 'In controlled comparisons, which choice explains most of the difference between VLMs?', options: ['Image tokens per image', 'The connector type', 'The learning-rate schedule'], answer: 0, why: 'Especially for documents.' },
    { q: 'What did Molmo show about training captions?', options: ['Dense human-written captions beat captions distilled from another model', 'More captions always win', 'Captions do not matter'], answer: 0, why: 'Quality over quantity.' },
    { q: 'Why can\'t a great encoder make a 7B VLM reason like a 70B one?', options: ['The language model sets the reasoning ceiling', 'Encoders are too small', 'Images need no reasoning'], answer: 0, why: 'The vision side only feeds it.' },
  ],
  terms: [
    ['Image encoder', 'The vision transformer that turns pixels into tokens.'],
    ['Connector', 'The bridge from image tokens to the language model.'],
    ['Visual tokens', 'How many tokens one image becomes.'],
    ['Dense captions', 'Long, detailed descriptions written by people.'],
    ['Distillation', 'Training on another model\'s outputs.'],
    ['Ablation', 'Changing one part at a time to see its effect.'],
  ],
  deeper: '<p><b>Local data is the lever.</b> Dense, carefully written captions of Ghanaian markets, forms, road signs and textiles, in English and Twi, would do more for a local model than any change of connector.</p><p><b>Resolution schedules.</b> Train early stages at a fixed moderate resolution, then finish with dynamic resolution up to around 1,280 pixels for documents.</p><p><b>About this machine.</b> The scores come from an additive model whose step sizes follow the published controlled comparisons; they show the order of effects, not exact benchmark results. Parameter counts are summed live.</p>',
  code: {
    title: 'One axis at a time',
    note: 'Adapted from the course\'s VLM recipes lesson.',
    text: `
BASE = dict(encoder="siglip-so400m", connector="mlp2", llm="13b",
            data="dense-human", tokens=576)

def ablate(train_and_eval, axis, options):
    results = {}
    for opt in options:
        cfg = {**BASE, axis: opt}          # change exactly one thing
        results[opt] = train_and_eval(cfg)
    return results

# ablate(run, "connector", ["mlp2", "qformer32"])  -> scores within a point
# ablate(run, "tokens", [64, 576, 2048])           -> large differences
`,
  },
};
