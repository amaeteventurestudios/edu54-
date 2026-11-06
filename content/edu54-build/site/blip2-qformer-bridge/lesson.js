// BLIP-2 and the Q-Former: a camera-trap project in the Serengeti asks a frozen language model about bursts of frames. A frozen image encoder turns each frame into
// 256 patch tokens; the bridge decides what reaches the language model: a Q-Former's few learned queries per frame, or an MLP projector passing every patch. The
// context bar shows how many tokens arrive against an 8,192-token window. Token counts and the trained-parameter share are computed live; the answers per setting
// are scripted from how each bridge behaves. Break it: an MLP projector on 64 frames (the tokens overflow the context), only 4 queries per frame (too little to count),
// queries that ignore the question when it asks for a count.
const PATCHES = 256, CTX = 8192, QS = ['What animal is this?', 'How many zebras are at the water?'];

export default {
  slug: 'blip2-qformer-bridge',
  title: 'BLIP-2: a small bridge between giants',
  description: 'A camera-trap project in the Serengeti asks a frozen language model about bursts of frames from a frozen image encoder.',
  overview: 'BLIP-2 connects a frozen image encoder to a frozen language model with a small trained bridge, the Q-Former. It holds 32 learnable query vectors that are the same for every image; they cross-attend to the image\'s patch tokens and come out as 32 summary tokens, which a linear layer maps into the language model\'s embedding space and places before the text. Training happens in two stages: first the Q-Former alone learns with contrastive, matching and captioning losses, then it is connected to the language model and trained on generation, while both giants stay frozen, so only about 2% of the parameters are trained. InstructBLIP feeds the instruction into the Q-Former too, so the queries can look for what the question needs. LLaVA instead projects every patch with a small MLP: richer per image, but hundreds of tokens each, which fills the context fast with many images or video frames. The choice is token budget against detail per token.',
  keywords: ['blip-2', 'q-former', 'learned queries', 'mlp projector', 'frozen models', 'token budget'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0.3], dir: [0.05, 0.55, 1.3], half: 1.25, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { bridge: 0, nq: 32, frames: 8, q: 0, aware: true };
    const ink = '#151827';
    /* frames on the left: a stack of thin slabs */
    const frames = Array.from({ length: 16 }, (_, i) => { const f = P.box(1.1, 0.03, 0.8, i % 2 ? '#C9B27A' : '#B89F64', { r: 0.02 }); f.position.set(-2.4, 0.15 + i * 0.045, 0); f.userData.noFit = true; floor.add(f); return f; });

    const enc = P.box(0.6, 0.6, 0.7, '#3B3F8F', { r: 0.05 }); enc.position.set(-1.35, 0.12, 0); floor.add(enc);

    /* the bridge */
    const brM = new THREE.MeshLambertMaterial({ color: C.coral }), br = P.box(0.9, 0.5, 0.7, C.coral, { r: 0.05, material: brM }); br.position.set(-0.25, 0.12, 0); floor.add(br);

    const beads = Array.from({ length: 32 }, (_, i) => { const b = P.ball(0.035, '#F2C94C'); b.position.set(-0.6 + (i % 8) * 0.1, 0.7 + Math.floor(i / 8) * 0.09, 0); b.userData.noFit = true; floor.add(b); return b; });
    /* language model and its context bar */
    const lm = P.box(1.2, 0.7, 0.8, C.plum, { r: 0.06 }); lm.position.set(1.15, 0.12, 0); floor.add(lm);

    const bar = P.box(2.6, 0.06, 0.3, '#2B2B38', { r: 0.02 }); bar.position.set(0, 0.12, 1.0); floor.add(bar);
    const fill = P.box(1, 0.08, 0.26, '#1F9E89', { r: 0.02 }); fill.userData.noFit = true; floor.add(fill);


    const ans = P.box(1.3, 0.55, 0.06, '#FBF8F1', { r: 0.03 }); ans.position.set(2.55, 0.12, -0.2); floor.add(ans);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function run() {
      const perFrame = st.bridge === 0 ? st.nq : PATCHES, tokens = perFrame * st.frames + 20, fits = tokens <= CTX;
      const counting = st.q === 1, detail = st.bridge === 1 ? 1 : (st.nq >= 32 ? (counting && !st.aware ? 0.4 : 1) : 0.35);
      const trained = st.bridge === 0 ? 188 : 21, total = 1100 + 6700 + trained;
      const right = fits && detail > 0.9;
      const answer = !fits ? '(prompt too long, frames cut off)' : right ? (counting ? 'Seven zebras are at the water.' : 'Plains zebras, drinking at a waterhole.') : counting ? 'There are some zebras.' : 'An animal near water.';
      return { perFrame, tokens, fits, right, answer, trainedShare: trained / total, counting };
    }
    function draw() {
      R = run();
      frames.forEach((f, i) => { f.visible = i < Math.min(16, st.frames); });
      beads.forEach((b, i) => { b.visible = st.bridge === 0 && i < st.nq; });
      brM.color.set(st.bridge === 0 ? C.coral : '#C9A227');
      const w = Math.min(2.6, R.tokens / CTX * 2.6); fill.scale.x = Math.max(0.02, w); fill.position.set(-1.3 + w / 2, 0.14, 1.0); fill.material.color.set(R.fits ? '#1F9E89' : '#D64545');


    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Bridge', options: ['Q-Former', 'MLP projector'], get: () => st.bridge, act: i => { st.bridge = i; draw(); } },
      { type: 'buttons', label: 'Queries per frame', options: ['4', '32'], get: () => (st.nq === 4 ? 0 : 1), act: i => { st.nq = i ? 32 : 4; draw(); } },
      { type: 'buttons', label: 'Frames in the burst', options: ['1', '8', '64'], get: () => [1, 8, 64].indexOf(st.frames), act: i => { st.frames = [1, 8, 64][i]; draw(); } },
      { type: 'buttons', label: 'Question', options: ['What animal?', 'How many zebras?'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Queries see the question (InstructBLIP)', short: 'question-aware', get: () => st.aware, set: v => { st.aware = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens per frame', get: () => ({ v: String(R.perFrame), sub: st.bridge === 0 ? 'learned queries' : 'one per patch' }) },
      { label: 'Context used', get: () => ({ v: `${Math.round(R.tokens / CTX * 100)}%`, sub: `${R.tokens.toLocaleString('en')} of 8,192`, good: R.fits, bad: !R.fits }) },
      { label: 'Parameters trained', get: () => ({ v: `${(R.trainedShare * 100).toFixed(1)}%`, sub: 'both giants stay frozen' }) },
    ];
    const labels = [
      { name: 'bridge', t: 'The bridge', d: 'Gold beads: learned queries', icon: 'link', atV: V(-0.25, 0.37, -0.4) },
      { name: 'ctx', t: 'Context used', d: 'Red: it overflows', icon: 'scale', atV: V(1.4, 0.15, 1.0) },
    ];
    const reset = () => { Object.assign(st, { bridge: 0, nq: 32, frames: 8, q: 0, aware: true }); draw(); };
    const breaks = [
      { label: 'MLP on 64 frames', hint: 'Every patch, every frame', on: () => { reset(); st.bridge = 1; st.frames = 64; draw(); }, off: reset },
      { label: 'Only 4 queries', hint: 'Then count', on: () => { reset(); st.nq = 4; st.q = 1; draw(); }, off: reset },
      { label: 'Queries ignore the question', hint: 'A counting question', on: () => { reset(); st.aware = false; st.q = 1; draw(); }, off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${R.tokens.toLocaleString('en')} tokens for an 8,192-token window.</b> Passing all ${PATCHES} patch tokens from each of ${st.frames} frames overflows the context, so about half the burst is cut off before the language model sees it. A Q-Former sends ${(32 * st.frames + 20).toLocaleString('en')} tokens for the same frames; that token budget is why long video and many-image models keep learned queries.` };
      if (st.bridge === 0 && st.nq < 32 && R.counting) return { ok: false, msg: `<b>Four summaries cannot count seven zebras.</b> With only 4 queries per frame, each must summarise everything, so individual animals blur together and the answer is "${R.answer}" Thirty-two queries leave room for detail, at eight times the tokens.` };
      if (st.bridge === 0 && !st.aware && R.counting) return { ok: false, msg: `<b>The queries looked for the wrong thing.</b> Fixed queries learn one general summary of each frame, good for "what animal?", but they do not know this question asks for a count, so the answer is "${R.answer}" InstructBLIP feeds the question into the Q-Former too, so its queries attend to what the question needs.` };
      return { ok: true, msg: `<b>"${R.answer}"</b> ${st.bridge === 0 ? `${st.nq} learned queries per frame` : `${PATCHES} patch tokens per frame`} bring ${st.frames} frame${st.frames > 1 ? 's' : ''} in as ${R.tokens.toLocaleString('en')} tokens, ${Math.round(R.tokens / CTX * 100)}% of the context, and only ${(R.trainedShare * 100).toFixed(1)}% of the system's parameters were trained.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Camera traps', home: true, say: 'A camera-trap project in the Serengeti asks a language model about bursts of frames. Both the image encoder and the language model stay frozen.', act: m => m.set({ bridge: 0, nq: 32, frames: 8, q: 0, aware: true }) },
    { t: 'Learned queries', home: true, say: 'A small Q-Former holds thirty-two learned queries. They read each frame\'s patches and come out as thirty-two summary tokens.', act: m => m.set({}) },
    { t: 'Every patch', home: true, say: 'An MLP projector passes every patch instead: two hundred and fifty-six tokens a frame. Richer, but sixty-four frames overflow the context.', act: m => m.set({ bridge: 1, frames: 64 }) },
    { t: 'Ask a count', home: true, say: 'Back to the Q-Former, now asking how many zebras are at the water.', act: m => m.set({ bridge: 0, frames: 8, q: 1 }) },
    { t: 'Too few queries', home: true, say: 'With only four queries per frame, the animals blur together. It cannot count them.', act: m => m.set({ nq: 4 }) },
    { t: 'Look for the question', home: true, say: 'Fixed queries make one general summary. Let them see the question, and they look for what it needs.', act: m => m.set({ nq: 32, aware: false }) },
  ],
  check: [
    { q: 'What does BLIP-2\'s Q-Former output for each image?', options: ['A fixed number of learned query tokens', 'Every patch token', 'A caption'], answer: 0, why: '32 queries summarise the patches.' },
    { q: 'Why might a video model prefer a Q-Former to an MLP projector?', options: ['It sends far fewer tokens per frame', 'It is always more accurate', 'It needs no image encoder'], answer: 0, why: 'Token budget.' },
    { q: 'In BLIP-2, which parts are trained?', options: ['The Q-Former and a small projection', 'The language model', 'The image encoder'], answer: 0, why: 'Both large models stay frozen.' },
  ],
  terms: [
    ['Q-Former', 'A small transformer of learned queries bridging vision and language.'],
    ['Learned queries', 'Fixed trainable vectors that cross-attend to image patches.'],
    ['MLP projector', 'Maps every patch token into the language model\'s space.'],
    ['Frozen model', 'A model whose weights are not updated.'],
    ['InstructBLIP', 'A Q-Former that also reads the instruction.'],
    ['Token budget', 'How many tokens can fit in the language model\'s context.'],
  ],
  deeper: '<p><b>Conservation at scale.</b> Camera traps across Tanzania, Kenya and Botswana take millions of frames a season. Compact bridges let one model look across whole bursts and answer questions about them, which per-frame classifiers cannot.</p><p><b>Four bridges.</b> Q-Former, Perceiver resampler, MLP projector and attention pooling all appear in 2026 models; the choice is token budget against detail per token.</p><p><b>About this machine.</b> Token counts, context use and the share of trained parameters are computed live; the answers are scripted from how each bridge behaves.</p>',
  code: {
    title: 'Learned queries over patches',
    note: 'Adapted from the course\'s BLIP-2 lesson.',
    text: `
import torch, torch.nn as nn

class QFormerLite(nn.Module):
    def __init__(self, n_queries=32, dim=768, llm_dim=4096):
        super().__init__()
        self.queries = nn.Parameter(torch.randn(1, n_queries, dim) * 0.02)
        self.cross = nn.MultiheadAttention(dim, 12, batch_first=True)
        self.proj = nn.Linear(dim, llm_dim)
    def forward(self, patches):                       # (B, 256, dim) from a frozen encoder
        q = self.queries.expand(len(patches), -1, -1)
        out, _ = self.cross(q, patches, patches)      # queries read the patches
        return self.proj(out)                         # (B, 32, llm_dim) for a frozen LLM
`,
  },
};
