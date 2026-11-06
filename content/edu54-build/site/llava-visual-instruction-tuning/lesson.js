// LLaVA: a farm advice app in Kenya lets farmers photograph a maize leaf and ask what is wrong. A CLIP encoder gives 576 patch tokens; a two-layer MLP projects them into
// the language model's space, where they replace the <image> placeholder. Training has two stages: align the projector on captions, then instruction-tune on question
// and answer turns. The context bar shows image tokens against the window; token counts are computed live and the answers per setting are scripted from typical results.
// Break it: skip stage 1 (an unaligned projector feeds noise, so instruction tuning learns to ignore the image), skip stage 2 (it can only caption, not answer),
// instruction data written from captions without checking the image (it learns to mention things that are not there).
const IMG = 576, ASKED = 'This maize leaf has pale stripes. What is wrong, and what should I do?';

export default {
  slug: 'llava-visual-instruction-tuning',
  title: 'LLaVA: teach it to answer about images',
  description: 'A farm advice app in Kenya lets farmers photograph a maize leaf and ask what is wrong. A small projector carries image patches into a language model.',
  overview: 'LLaVA showed how simple a vision-language model can be. A frozen CLIP encoder turns the image into 576 patch tokens; a two-layer MLP projects each into the language model\'s embedding space, and they replace an <image> placeholder in the prompt. Training has two stages. In stage 1 only the projector learns, on hundreds of thousands of image-caption pairs, so that image tokens land where the language model can read them. In stage 2 the projector and the language model learn together from visual instructions: conversations, detailed descriptions and reasoning questions about images. The original instruction data was written by a text-only model from captions and object lists, never seeing the pictures, which made it cheap but taught some hallucination; checking or regenerating that data against the images reduces it. The image costs 576 tokens of context, a lot at 2,048 tokens and little at 32,000, which shapes how many images a model can take at once.',
  keywords: ['llava', 'visual instruction tuning', 'mlp projector', 'projector alignment', 'hallucination', 'vision language model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0.1], dir: [0.05, 0.5, 1.3], half: 1.4, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { s1: true, s2: true, checked: true, ctx: 1 };
    const ink = '#151827', CTXS = [2048, 32768];
    const leaf = P.box(0.9, 0.05, 0.9, '#5E9E2F', { r: 0.1 }); leaf.position.set(-2.55, 0.12, 0); floor.add(leaf);
    [-0.2, 0, 0.2].forEach(dz => { const s = P.box(0.75, 0.02, 0.05, '#E8E5A8', { r: 0.01 }); s.position.set(-2.55, 0.17, dz); floor.add(s); });

    const box = (x, w, col, name) => { const b = P.box(w, 0.55, 0.7, col, { r: 0.05 }); b.position.set(x, 0.12, 0); floor.add(b);
         return b; };
    box(-1.5, 0.75, '#3B3F8F', 'CLIP encoder');
    const proj = box(-0.55, 0.6, C.coral, 'MLP projector');
    box(0.75, 1.3, C.plum, 'Language model');
    const lamps = [['Stage 1: align', -0.55], ['Stage 2: instructions', 0.75]].map(([n, x]) => { const mm = new THREE.MeshLambertMaterial({ color: '#2E9E6A' }), l = P.ball(0.07, '#2E9E6A'); l.material = mm; l.position.set(x, 0.85, 0); floor.add(l);
          return mm; });
    const bar = P.box(4.2, 0.06, 0.3, '#2B2B38', { r: 0.02 }); bar.position.set(-0.5, 0.12, 0.85); floor.add(bar);
    const imgB = P.box(1, 0.08, 0.26, '#3B3F8F', { r: 0.02 }); imgB.userData.noFit = true; floor.add(imgB);
    const txtB = P.box(1, 0.08, 0.26, '#C9A227', { r: 0.02 }); txtB.userData.noFit = true; floor.add(txtB);

    const ans = P.lamp('#2E9E6A', { h: 0.34, r: 0.13 }); ans.position.set(2.45, 0.12, -0.3); floor.add(ans);


    let R = null;
    const wrap = (s, n) => s.replace(new RegExp(`(.{1,${n}})(\\s|$)`, 'g'), '$1\n').trim();
    function run() {
      const ctx = CTXS[st.ctx], textRoom = ctx - IMG, images = Math.floor((ctx - 300) / IMG);
      let out, right = false;
      if (!st.s2) out = 'A green maize leaf with pale yellow stripes, photographed in a field.';
      else if (!st.s1) out = 'Maize often has problems. Check with your local extension officer.';
      else if (!st.checked) out = 'Streak virus: the leafhoppers on the stem spread it. Remove the insects and the hoe beside the plant.';
      else { out = 'Likely maize streak virus. Pull and burn badly affected plants, control leafhoppers, and plant a resistant variety next season.'; right = true; }
      return { ctx, textRoom, images, out, right };
    }
    function draw() {
      R = run();
      ans.userData.set({ color: R.right ? '#2E9E6A' : '#D64545', on: true });
      lamps[0].color.set(st.s1 ? '#2E9E6A' : '#C9C5BA'); lamps[1].color.set(st.s2 ? '#2E9E6A' : '#C9C5BA');
      proj.material.color.set(st.s1 ? C.coral : '#C9C5BA');
      const L = 4.2, wi = L * IMG / R.ctx, wt = L * Math.min(1, 120 / R.ctx * 4);
      imgB.scale.x = wi; imgB.position.set(-2.6 + wi / 2, 0.14, 0.85); txtB.scale.x = Math.max(0.02, wt); txtB.position.set(-2.6 + wi + wt / 2, 0.14, 0.85);
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Stage 1: align the projector on captions', short: 'stage 1', get: () => st.s1, set: v => { st.s1 = v; draw(); } },
      { type: 'toggle', label: 'Stage 2: instruction tuning', short: 'stage 2', get: () => st.s2, set: v => { st.s2 = v; draw(); } },
      { type: 'toggle', label: 'Instruction data checked against images', short: 'checked data', get: () => st.checked, set: v => { st.checked = v; draw(); } },
      { type: 'buttons', label: 'Context window', options: ['2,048', '32,768'], get: () => st.ctx, act: i => { st.ctx = i; draw(); } },
    ];
    const readouts = [
      { label: 'Image tokens', get: () => ({ v: String(IMG), sub: '24 × 24 patches at 336 px' }) },
      { label: 'Images that fit', get: () => ({ v: String(R.images), sub: `with room for a question, at ${R.ctx.toLocaleString('en')}`, bad: R.images < 2 }) },
      { label: 'Answer', get: () => ({ v: R.right ? 'useful' : 'not useful', good: R.right, bad: !R.right }) },
    ];
    const labels = [
      { name: 'pipe', t: 'Encoder, projector, model', d: 'Lamps: training stages done', icon: 'link', atV: V(-3.05, 0.25, 0) },
      { name: 'ans', t: 'The farmer\'s answer', d: 'Red: not useful', icon: 'check', atV: V(2.65, 0.55, -0.3) },
    ];
    const reset = () => { Object.assign(st, { s1: true, s2: true, checked: true, ctx: 1 }); draw(); };
    const breaks = [
      { label: 'Skip stage 1', hint: 'Unaligned projector', on: () => { reset(); st.s1 = false; draw(); }, off: reset },
      { label: 'Skip stage 2', hint: 'Captions only', on: () => { reset(); st.s2 = false; draw(); }, off: reset },
      { label: 'Unchecked instruction data', hint: 'Written from captions', on: () => { reset(); st.checked = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.s1) return { ok: false, msg: `<b>It learned to ignore the photo.</b> Without stage 1, the projector starts random, so the 576 image tokens arrive as noise the language model cannot read. During instruction tuning the easiest way to lower the loss is to answer from the text alone: "${R.out}" Aligning the projector on captions first puts image tokens where the model can use them.` };
      if (!st.s2) return { ok: false, msg: `<b>It can only caption.</b> After stage 1 the model describes images well, "${R.out}", because captions are all it has seen. It was never taught to follow a question or give advice. Stage 2 trains on conversations, descriptions and reasoning questions about images.` };
      if (!st.checked) return { ok: false, msg: `<b>It mentions a hoe that is not there.</b> The instruction data was written by a text-only model from captions and object lists, so some answers describe things the pictures never showed, and the model learned to do the same: "${R.out}" Farmers act on these answers. Check generated instruction data against the images, or regenerate it with a model that can see them.` };
      return { ok: true, msg: `<b>"${R.out}"</b> Stage 1 aligned the projector, stage 2 taught it to answer questions, and the instruction data was checked against the images. The photo costs ${IMG} of ${R.ctx.toLocaleString('en')} tokens, so ${R.images} images could fit in one conversation.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Ask about a leaf', home: true, say: 'A farmer in Kenya photographs a maize leaf with pale stripes and asks the app what is wrong.', act: m => m.set({ s1: true, s2: true, checked: true, ctx: 1 }) },
    { t: 'Simple parts', home: true, say: 'A CLIP encoder gives five hundred and seventy-six patch tokens. A small MLP projects every one into the language model.', act: m => m.set({}) },
    { t: 'Stage one', home: true, say: 'Stage one trains only the projector, on image captions, so image tokens land where the language model can read them.', act: m => m.set({ s2: false }) },
    { t: 'Stage two', home: true, say: 'Stage two teaches it to answer questions about images. Now it gives advice, not just a caption.', act: m => m.set({ s2: true }) },
    { t: 'Skip a stage', home: true, say: 'Skip stage one, and the image arrives as noise. The model learns to answer from the question alone.', act: m => m.set({ s1: false }) },
    { t: 'Check the data', home: true, say: 'Instruction data written from captions, never checked against the photos, teaches it to mention things that are not there.', act: m => m.set({ s1: true, checked: false }) },
  ],
  check: [
    { q: 'What does LLaVA\'s stage 1 train?', options: ['Only the projector, on image captions', 'The whole language model', 'The image encoder'], answer: 0, why: 'It aligns image tokens with the language model.' },
    { q: 'What does stage 2 add?', options: ['Following instructions and answering questions about images', 'Higher image resolution', 'A bigger context'], answer: 0, why: 'Visual instruction tuning.' },
    { q: 'Why can instruction data written from captions cause hallucination?', options: ['Its answers can describe things the images never showed', 'Captions are too short', 'It has too many images'], answer: 0, why: 'The writer never saw the pictures.' },
  ],
  terms: [
    ['Visual instruction tuning', 'Training on questions and answers about images.'],
    ['MLP projector', 'Maps each image patch token into the language model\'s space.'],
    ['Projector alignment', 'Stage 1: training only the projector on captions.'],
    ['<image> placeholder', 'A prompt token replaced by the image\'s tokens.'],
    ['Hallucination', 'Describing things that are not in the image.'],
    ['Context window', 'How many tokens the model reads at once.'],
  ],
  deeper: '<p><b>Local knowledge.</b> General instruction data rarely covers maize streak virus, fall armyworm or cassava mosaic. Extension services in Kenya, Uganda and Nigeria hold photos and expert answers that make far better stage 2 data.</p><p><b>What came next.</b> LLaVA-NeXT added higher resolution by tiling, and LLaVA-OneVision one model for single images, many images and video.</p><p><b>About this machine.</b> Token counts and how many images fit are computed live; the answers are scripted from typical results for each training choice.</p>',
  code: {
    title: 'Splice image tokens into the prompt',
    note: 'Adapted from the course\'s LLaVA lesson.',
    text: `
import torch, torch.nn as nn

projector = nn.Sequential(nn.Linear(1024, 4096), nn.GELU(), nn.Linear(4096, 4096))

def build_inputs(llm, clip, image, prompt_ids, image_token_id):
    patches = clip(image)                          # (576, 1024), frozen
    img = projector(patches)                       # (576, 4096)
    emb = llm.embed_tokens(prompt_ids)
    at = (prompt_ids == image_token_id).nonzero()[0, 0]
    return torch.cat([emb[:at], img, emb[at + 1:]])   # <image> replaced by 576 tokens

# stage 1: train projector only on captions; stage 2: projector + LLM on instructions
`,
  },
};
