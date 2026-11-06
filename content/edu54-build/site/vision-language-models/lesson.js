// Vision-language models: a photo of a matatu (shared minibus) in Nairobi goes into a vision encoder (ViT), whose patch vectors pass through a small projector
// so they look like word tokens to the language model. The LLM reads image tokens then the question, and answers.
// Three questions: what route the matatu shows, how many passengers are visible, and is the matatu to the left or right of the bus.
// Break it: freeze the projector untrained (the LLM sees noise and makes up an answer), squash the image to 4 tokens (the route number is unreadable),
// a spatial question (left or right: these models are still weak at it).
const QS = [
  { k: 'route', q: 'What route number is on the matatu?', a: '46', kind: 'read' },
  { k: 'count', q: 'How many people are waiting at the stop?', a: '5', kind: 'count' },
  { k: 'side', q: 'Is the matatu left or right of the bus?', a: 'left', kind: 'space' },
];

export default {
  slug: 'vision-language-models',
  title: 'Vision-language models: a picture becomes words',
  description: 'A photo is cut into patches, made to look like words, and read by a language model with the question. See where it reads and where it guesses.',
  overview: 'Most vision-language models join three parts: a vision transformer that turns the picture into patch vectors, a small projector that maps those vectors into the same space as the language model\'s word embeddings, and the language model itself, which reads the image tokens followed by the question and writes the answer. Training usually goes in stages: first only the projector, so image tokens start to mean something, then everything together on instructions. The number of image tokens is a trade-off between detail and cost. Reading text in images has become good; counting is fair; spatial reasoning such as left and right is still weak.',
  keywords: ['vision language model', 'vlm architecture', 'llava projector', 'image tokens', 'multimodal llm'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.05, 0.25, -0.05], dir: [0.05, 0.95, 1.1], half: 0.95, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 0, proj: true, tokens: 256 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#9A9AA6';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    /* ---------- the photo, laid flat and cut into patches ---------- */
    // the scene: sky, road, a white matatu with a gold band, a green bus, five people at the stop (u across, v up, both 0..1)
    const RECTS = [[0, 0, 1, 1, '#BFD9E6'], [0, 0, 1, 0.25, '#7A7A78'], [0.067, 0.2, 0.367, 0.32, '#F2F2F2'], [0.067, 0.46, 0.367, 0.06, '#E3A72F'], [0.093, 0.36, 0.267, 0.08, '#5B7A99'], [0.533, 0.2, 0.433, 0.42, '#2F6B4F'], [0.56, 0.44, 0.38, 0.1, '#5B7A99']];
    ['#8A3F8E', '#C9774A', '#3D6BD6', '#E3A72F', '#D9483B'].forEach((c, i) => RECTS.push([0.12 + i * 0.06, 0.03, 0.027, 0.16, c]));
    const colAt = (u, v) => { let c = RECTS[0][4]; RECTS.forEach(([x, y, w, h, k]) => { if (u >= x && u < x + w && v >= y && v < y + h * 1.0) c = k; }); return c; };
    const PX0 = -2.65, PW = 2.0, PZ0 = 0.7, PD = 1.34;
    const bed = P.box(PW + 0.12, 0.04, PD + 0.12, '#3A3D4A', { r: 0.04 }); bed.position.set(PX0 + PW / 2, 0, PZ0 - PD / 2); S.add(bed);
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#fff' }), 256);
    tiles.userData.noFit = true; tiles.frustumCulled = false; S.add(tiles);
    /* ---------- encoder, projector, language model ---------- */
    const block = (x, w, h, c) => { const m = own(c), b = P.box(w, h, 0.6, '#fff', { r: 0.06, material: m }); b.position.set(x, 0, -0.05); S.add(b); return m; };
    block(0.0, 0.55, 0.5, C.indigo);
    const pjM = block(0.75, 0.4, 0.35, C.gold);
    block(2.0, 0.9, 0.7, C.plum);
    const p1 = P.pipe([V(-0.6, 0.1, -0.05), V(-0.45, 0.25, -0.05), V(-0.28, 0.25, -0.05)], '#8FA3C8', { r: 0.03, n: 3 }); S.add(p1);
    const p2 = P.pipe([V(0.28, 0.25, -0.05), V(0.42, 0.3, -0.05), V(0.55, 0.22, -0.05)], '#8FA3C8', { r: 0.03, n: 3 }); S.add(p2);
    // the language model's context: image tokens below, then the question's words on top
    const ctx = P.stack(0.3, 0.3, 0.12, { max: 10 }); ctx.position.set(1.3, 0, -0.05); S.add(ctx);
    const lamp = P.lamp(GOOD, { h: 0.45, r: 0.13 }); lamp.position.set(2.7, 0, -0.05); S.add(lamp);
    S.add(P.keep(-2.75, 2.85, 1.0, -0.75, 0.8));
    let R = null;
    const dummy = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Color();
    function answer() {
      const q = QS[st.q];
      if (!st.proj) return { a: q.kind === 'read' ? '"The sign says 12, to the airport."' : q.kind === 'count' ? '"There are no people."' : '"It is on the right."', ok: false };
      if (q.kind === 'read') return st.tokens >= 64 ? { a: '"46."', ok: true } : { a: '"The number is not clear."', ok: false };
      if (q.kind === 'count') return st.tokens >= 64 ? { a: '"Five people."', ok: true } : { a: '"A few people."', ok: false };
      return { a: '"The matatu is to the right of the bus."', ok: false };
    }
    function draw() {
      R = answer();
      // each patch shows the average colour of what it covers: four tokens blur the route number away
      const g = Math.round(Math.sqrt(st.tokens)), cw = PW / g, cd = PD / g;
      tiles.count = g * g;
      for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
        col.setRGB(0, 0, 0); const K = 4;
        for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) col.add(tmp.set(colAt((i + (a + 0.5) / K) / g, (j + (b + 0.5) / K) / g)));
        col.multiplyScalar(1 / (K * K));
        const k = i * g + j;
        dummy.position.set(PX0 + cw * (i + 0.5), 0.05, PZ0 - cd * (j + 0.5)); dummy.scale.set(cw * 0.9, 0.03, cd * 0.9); dummy.updateMatrix();
        tiles.setMatrixAt(k, dummy.matrix); tiles.setColorAt(k, col);
      }
      tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true;
      pjM.color.set(st.proj ? C.gold : OFF);
      p2.userData.set({ color: st.proj ? SAF : '#6B6E7E' });
      const ni = { 4: 1, 64: 3, 256: 6 }[st.tokens];
      ctx.userData.set({ n: ni + 2, colors: Array.from({ length: ni + 2 }, (_, k) => k < ni ? (st.proj ? SAF : '#6B6E7E') : '#F4F1EA') });
      lamp.userData.set({ color: R.ok ? GOOD : BAD });
    }
    draw();
    const tick = dt => { p1.userData.tick(dt); p2.userData.tick(dt); };
    const controls = [
      { type: 'buttons', label: 'Question', options: ['Read the route', 'Count people', 'Left or right'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Projector trained (stage 1)', short: 'projector', get: () => st.proj, set: v => { st.proj = v; draw(); } },
      { type: 'buttons', label: 'Image tokens', options: ['4', '64', '256'], get: () => [4, 64, 256].indexOf(st.tokens), act: i => { st.tokens = [4, 64, 256][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Answer', get: () => ({ v: R.ok ? 'right' : 'wrong', sub: QS[st.q].q.split(' ').slice(0, 3).join(' ') + '…', good: R.ok, bad: !R.ok }) },
      { label: 'Image tokens', get: () => ({ v: String(st.tokens), sub: 'read before the question' }) },
      { label: 'Cost', get: () => ({ v: `${Math.round((st.tokens + 20) / 2.76)}%`, sub: 'of a 256-token image' }) },
    ];
    const labels = [
      { name: 'photo', t: 'The photo, in patches', d: 'Fewer tokens, bigger and blurrier patches', icon: 'eye', atV: V(PX0 - 0.06, 0.04, PZ0 - PD * 0.3) },
      { name: 'chat', t: 'Projector, then the language model', d: 'Gold: image tokens it understands. Grey: noise. Lamp: right or wrong', icon: 'check', atV: V(2.83, 0.3, -0.05) },
    ];
    const reset = () => { Object.assign(st, { q: 0, proj: true, tokens: 256 }); draw(); };
    const breaks = [
      { label: 'Projector never trained', hint: 'Skip stage 1', on: () => { reset(); st.proj = false; draw(); }, off: reset },
      { label: 'Only 4 image tokens', hint: 'Squash the whole photo', on: () => { reset(); st.tokens = 4; draw(); }, off: reset },
      { label: 'Ask left or right', hint: 'A spatial question', on: () => { reset(); st.q = 2; draw(); }, off: reset },
    ];
    function status() {
      if (!st.proj) return { ok: false, msg: `<b>A confident, made-up answer.</b> The language model only understands vectors that look like its own word embeddings. With the projector untrained, the image tokens are noise to it, so it answers from the question alone, fluently and wrongly. Stage one of training teaches the projector first.` };
      if (st.q === 2) return { ok: false, msg: `<b>Left and right confused.</b> The matatu is on the left, but the model says right. Reading text and naming objects work well, because the training captions talk about them all the time; captions rarely say where things are relative to each other, so spatial reasoning stays weak.` };
      if (st.tokens < 64) return { ok: false, msg: `<b>Too few tokens to read.</b> Squeezing the whole photo into 4 tokens leaves each one covering a quarter of the street, so the small route number on the matatu is averaged away. More tokens cost more, but fine detail needs them.` };
      return { ok: true, msg: `<b>Right: ${QS[st.q].a}.</b> The encoder turns the photo into ${st.tokens} patch vectors, the projector maps them into the language model\'s word space, and the model reads them like a sentence before the question.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A photo and a question', home: true, say: 'A bus stop in Nairobi, with a matatu and a bus. We ask: what route number is on the matatu?', act: m => m.set({ q: 0, proj: true, tokens: 256 }) },
    { t: 'Three parts', home: true, say: 'A vision encoder turns the photo into patch vectors. A small projector maps them so they look like word tokens. The language model reads them, then the question.', act: m => m.set({}) },
    { t: 'The projector matters', home: true, say: 'Leave the projector untrained, and the image tokens are noise to the language model. It answers from the question alone, fluently and wrongly.', act: m => m.set({ proj: false }) },
    { t: 'How many tokens', home: true, say: 'Squeeze the whole photo into four tokens, and the small route number is lost. More tokens see more, at a higher cost.', act: m => m.set({ proj: true, tokens: 4 }) },
    { t: 'Counting', home: true, say: 'With enough tokens, it counts the five people waiting at the stop.', act: m => m.set({ tokens: 256, q: 1 }) },
    { t: 'Left and right', home: true, say: 'But ask whether the matatu is left or right of the bus, and it gets it wrong. Spatial reasoning is still a weak spot.', act: m => m.set({ q: 2 }) },
  ],
  check: [
    { q: 'What does the projector in a vision-language model do?', options: ['Maps image patch vectors into the language model\'s word space', 'Shrinks the photo', 'Translates the answer'], answer: 0, why: 'Then the language model can read them like tokens.' },
    { q: 'Why can too few image tokens hurt?', options: ['Each token covers too much of the picture, losing small details', 'The model runs out of words', 'Tokens must be even'], answer: 0, why: 'Small text and objects are averaged away.' },
    { q: 'Which task is still weakest for these models?', options: ['Spatial reasoning, such as left or right', 'Reading printed text', 'Naming common objects'], answer: 0, why: 'Training captions rarely describe positions.' },
  ],
  terms: [
    ['Vision-language model', 'A model that reads images and text together and answers in text.'],
    ['Vision encoder', 'A ViT that turns an image into patch vectors.'],
    ['Projector', 'A small network that maps image vectors into the language model\'s space.'],
    ['Image tokens', 'Projected patch vectors the language model reads like words.'],
    ['Instruction tuning', 'Training on question-and-answer examples to follow requests.'],
    ['Visual grounding', 'Linking parts of an answer to regions of the image.'],
  ],
  deeper: '<p><b>Stages of training.</b> First, only the projector learns on image–caption pairs, with the encoder and language model frozen. Then the whole model, or adapters such as LoRA, is tuned on instruction data.</p><p><b>Agents that see.</b> The same pattern lets models read screenshots and decide where to click, which is why spatial accuracy matters so much.</p><p><b>About this machine.</b> The answers are written to show typical behaviour of each setting.</p>',
  code: {
    title: 'Encoder, projector and language model',
    note: 'Adapted from the course\'s vision-language models lesson.',
    text: `
import torch, torch.nn as nn

class VLM(nn.Module):
    def __init__(self, vit, llm, vit_dim=1024, llm_dim=4096):
        super().__init__()
        self.vit, self.llm = vit, llm
        self.projector = nn.Sequential(nn.Linear(vit_dim, llm_dim), nn.GELU(), nn.Linear(llm_dim, llm_dim))

    def forward(self, image, question_ids):
        patches = self.vit(image)                       # (batch, 256, vit_dim)
        image_tokens = self.projector(patches)          # now in the LLM's word space
        text_tokens = self.llm.embed(question_ids)
        return self.llm(inputs_embeds=torch.cat([image_tokens, text_tokens], dim=1))

# stage 1: freeze vit and llm, train only the projector on image-caption pairs
`,
  },
};
