// Janus-Pro: a tourism office in Marrakech uses one model to answer questions about visitors' photos and to make posters. Two front ends feed one shared transformer:
// a SigLIP encoder for understanding and a VQ tokenizer for generation. The bench can wire one encoder for both jobs instead. Scores follow the reported results for each
// set-up (understanding on an MMMU-style test, generation on a GenEval-style test); the answers and poster quality are scripted from those patterns.
// Break it: VQ codes for understanding (it misreads the photo), SigLIP features for generation (they cannot be turned back into a sharp picture), the small model on little data.
const SETUPS = {
  'dec-7': { und: 60, gen: 0.80 }, 'dec-1': { und: 41, gen: 0.61 },
  'vq-7': { und: 48, gen: 0.78 }, 'vq-1': { und: 33, gen: 0.58 },
  'sig-7': { und: 60, gen: 0.24 }, 'sig-1': { und: 41, gen: 0.18 },
};

export default {
  slug: 'janus-pro-decoupled-encoders',
  title: 'Janus-Pro: two eyes, one brain',
  description: 'A tourism office in Marrakech uses one model to answer questions about visitors\' photos and to make posters of the medina. Janus-Pro gives understanding and generation separate encoders and one shared transformer. Then use the generation tokenizer to understand, use the understanding encoder to generate, or shrink the model and its data.',
  overview: 'Unified models that understand and generate images with one image encoder face a conflict. Understanding wants semantic features, what is in the picture and how it relates to words, which contrastive encoders such as SigLIP provide. Generation wants codes that decode back into sharp pixels, which reconstruction-trained tokenizers provide. One encoder serving both does neither well: codes built for reconstruction lose meaning, and semantic features cannot be turned back into a detailed image. Janus decouples them: questions about an image go through SigLIP and a small MLP into the shared transformer, while image generation predicts VQ codes that a tokenizer decodes into pixels; the transformer body is shared and learns to handle both kinds of input. Janus-Pro then scaled the recipe from 1.3 to 7 billion parameters with much more data, and matched dedicated models on both sides. JanusFlow replaces the VQ path with rectified flow for even better pictures.',
  keywords: ['janus-pro', 'decoupled encoders', 'siglip', 'vq tokenizer', 'unified model', 'image generation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { wire: 'dec', size: 7 };
    const ink = '#151827';
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const block = (x, z, w, col, name) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(w, 0.3, 0.8, col, { r: 0.05, material: mm }); b.position.set(x, 0.12, z); S.add(b);
      const f = S.text(name, { size: 0.15, weight: 800, color: '#FFFFFF', maxW: w - 0.1 }); f.position.set(x, 0.43, z); S.add(f);
      const s = S.text(name, { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF', maxW: w - 0.08 }); s.position.set(x, 0.27, z + 0.405); S.add(s); return mm; };
    const sigM = block(-2.1, -0.55, 1.25, '#1F9E89', 'SigLIP encoder');
    const vqM = block(-2.1, 0.75, 1.25, '#C9A227', 'VQ tokenizer');
    const body = P.box(1.3, 0.45, 2.1, C.plum, { r: 0.06 }); body.position.set(-0.2, 0.12, 0.1); S.add(body);
    const bF = S.text('Shared transformer', { size: 0.15, weight: 800, color: '#FFFFFF', maxW: 1.15 }); bF.position.set(-0.2, 0.58, 0.1); S.add(bF);
    const sizeT = S.text('', { size: 0.11, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); sizeT.position.set(-0.2, 0.7, -1.15); sizeT.userData.noFit = true; S.add(sizeT);
    const pipes = [0, 1].map(() => { const mm = new THREE.MeshBasicMaterial({ color: '#1F9E89' }), t = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.03, '#1F9E89', { material: mm }); t.layers.set(1); t.userData.noFit = true; S.add(t); return { t, mm }; });
    const setPipe = (p, from, z, col) => { const a = V(-1.47, 0.36, from), b = V(-0.85, 0.36, z); p.t.geometry.dispose(); p.t.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(V(0, 0.12, 0)), b]), 20, 0.03, 6, false); p.mm.color.set(col); };
    /* two jobs on the right, lying on the bench */
    const jobs = [['Photo question', -0.55], ['Make a poster', 0.75]].map(([n, z]) => { const b = P.box(1.9, 0.05, 0.95, '#FBF8F1', { r: 0.03 }); b.position.set(1.85, 0.12, z); S.add(b);
      const h = S.text(n, { size: 0.12, weight: 800, color: '#6B5E86' }); h.position.set(1.85, 0.18, z - 0.3); S.add(h);
      const t = S.text('', { size: 0.13, weight: 800, color: ink, maxW: 1.8 }); t.position.set(1.85, 0.18, z + 0.12); S.add(t); return t; });
    const poster = P.box(0.32, 0.05, 0.42, '#E07B39', { r: 0.02 }); poster.position.set(0.75, 0.12, 0.75); S.add(poster);

    let R = null;
    function run() { const k = `${st.wire}-${st.size === 7 ? 7 : 1}`; return { ...SETUPS[k], k }; }
    function draw() {
      R = run();
      const und = st.wire === 'vq' ? 'vq' : 'sig', gen = st.wire === 'sig' ? 'sig' : 'vq';
      setPipe(pipes[0], und === 'sig' ? -0.55 : 0.75, -0.4, und === 'sig' ? '#1F9E89' : '#C9A227');
      setPipe(pipes[1], gen === 'vq' ? 0.75 : -0.55, 0.6, gen === 'vq' ? '#C9A227' : '#1F9E89');
      sigM.color.set(st.wire === 'vq' ? '#9ABFB7' : '#1F9E89'); vqM.color.set(st.wire === 'sig' ? '#D9C79A' : '#C9A227');
      sizeT.userData.set(st.size === 7 ? '7B parameters, 160M+ examples' : '1.3B parameters, less data');
      const qOK = R.und >= 55, gOK = R.gen >= 0.7;
      jobs[0].userData.set(qOK ? 'A riad courtyard, Marrakech' : 'A tiled room with a bowl', qOK ? '#151827' : '#8A1F1F');
      jobs[1].userData.set(gOK ? 'Koutoubia at dusk, sharp' : R.gen < 0.4 ? 'A blurry orange smudge' : 'Right idea, muddled', gOK ? '#151827' : '#8A1F1F');
      poster.material.color.set(gOK ? '#E07B39' : R.gen < 0.4 ? '#C9B3A3' : '#D9A07B');
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Wiring', options: ['Two encoders', 'VQ for both', 'SigLIP for both'], get: () => ['dec', 'vq', 'sig'].indexOf(st.wire), act: i => { st.wire = ['dec', 'vq', 'sig'][i]; draw(); } },
      { type: 'buttons', label: 'Model and data', options: ['1.3B, less data', '7B, more data'], get: () => (st.size === 7 ? 1 : 0), act: i => { st.size = i ? 7 : 1; draw(); } },
    ];
    const readouts = [
      { label: 'Understanding', get: () => ({ v: String(R.und), sub: 'MMMU-style, reported pattern', good: R.und >= 55, bad: R.und < 45 }) },
      { label: 'Generation', get: () => ({ v: R.gen.toFixed(2), sub: 'GenEval-style, out of 1', good: R.gen >= 0.7, bad: R.gen < 0.6 }) },
      { label: 'Encoders', get: () => ({ v: st.wire === 'dec' ? '2' : '1', sub: st.wire === 'dec' ? 'one per job' : 'shared by both jobs' }) },
    ];
    const labels = [
      { name: 'enc', t: 'Two front ends', d: 'Meaning for questions, codes for pictures', icon: 'link', atV: V(-2.75, 0.3, 0.1) },
      { name: 'jobs', t: 'Two jobs', d: 'Red: done badly', icon: 'check', atV: V(2.82, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { wire: 'dec', size: 7 }); draw(); };
    const breaks = [
      { label: 'VQ codes for questions', hint: 'One tokenizer for both', on: () => { reset(); st.wire = 'vq'; draw(); }, off: reset },
      { label: 'SigLIP for posters', hint: 'One encoder for both', on: () => { reset(); st.wire = 'sig'; draw(); }, off: reset },
      { label: 'Small model, little data', hint: '1.3B', on: () => { reset(); st.size = 1; draw(); }, off: reset },
    ];
    function status() {
      if (st.wire === 'vq') return { ok: false, msg: `<b>It misreads the photo.</b> VQ codes are built to reconstruct pixels, not to capture meaning, so read through them the riad becomes "a tiled room with a bowl": understanding falls to ${R.und}. Posters stay good (${R.gen.toFixed(2)}). Give questions a semantic encoder such as SigLIP.` };
      if (st.wire === 'sig') return { ok: false, msg: `<b>The poster is a smudge.</b> SigLIP features say what a picture means but not how each pixel looks, so predicting them gives nothing a decoder can turn back into a sharp image: generation ${R.gen.toFixed(2)}. Understanding is fine (${R.und}). Generation needs reconstruction-trained codes.` };
      if (st.size === 1) return { ok: false, msg: `<b>Right design, too small.</b> With two encoders but 1.3 billion parameters and less data, the shared body handles both kinds of input poorly: understanding ${R.und}, generation ${R.gen.toFixed(2)}. Janus-Pro\'s gain came from scaling the same recipe to 7 billion parameters and much more data.` };
      return { ok: true, msg: `<b>Understanding ${R.und}, generation ${R.gen.toFixed(2)}.</b> Photo questions go through SigLIP, poster generation predicts VQ codes, and one 7-billion-parameter transformer handles both, matching dedicated models on each side.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two jobs', home: true, say: 'A tourism office in Marrakech wants one model to answer questions about visitors\' photos and to make posters of the medina.', act: m => m.set({ wire: 'dec', size: 7 }) },
    { t: 'Two front ends', home: true, say: 'Questions go through a SigLIP encoder, built for meaning. Posters are made from VQ codes, built to become sharp pixels.', act: m => m.set({}) },
    { t: 'One shared body', home: true, say: 'Both feed one shared transformer. It learns to handle both kinds of input.', act: m => m.set({}) },
    { t: 'Codes for questions', home: true, say: 'Use the VQ codes to understand photos too, and the riad becomes "a tiled room with a bowl".', act: m => m.set({ wire: 'vq' }) },
    { t: 'Meaning for posters', home: true, say: 'Use SigLIP features to make posters, and there is nothing a decoder can turn into sharp pixels.', act: m => m.set({ wire: 'sig' }) },
    { t: 'Scale it', home: true, say: 'Two encoders on a small model with little data are weak at both. Janus-Pro scaled the recipe.', act: m => m.set({ wire: 'dec', size: 1 }) },
  ],
  check: [
    { q: 'Why does Janus use separate encoders for understanding and generation?', options: ['Understanding needs meaning; generation needs codes that decode to pixels', 'To save memory', 'Because text needs two'], answer: 0, why: 'One encoder serves neither well.' },
    { q: 'What happens if semantic features are used for generation?', options: ['They cannot be decoded into a sharp image', 'Images become sharper', 'Questions are misread'], answer: 0, why: 'They lack pixel detail.' },
    { q: 'What did Janus-Pro change from Janus?', options: ['Scaled the model and data', 'Removed the shared body', 'Used one encoder'], answer: 0, why: '1.3B to 7B, much more data.' },
  ],
  terms: [
    ['Decoupled encoders', 'Separate image front ends for understanding and generation.'],
    ['SigLIP', 'A contrastive image encoder giving semantic features.'],
    ['VQ tokenizer', 'Turns images into codes that decode back to pixels.'],
    ['Shared body', 'The one transformer both paths feed.'],
    ['Unified model', 'One model that understands and generates.'],
    ['Rectified flow', 'A continuous generation method used in JanusFlow.'],
  ],
  deeper: '<p><b>Tourism and heritage.</b> Offices in Marrakech, Zanzibar and Lalibela field visitor photos in many languages and need promotional images that show real places faithfully. Generated posters of heritage sites should be labelled as generated.</p><p><b>The trend.</b> Unified models increasingly keep separate input and output paths around a shared body, a pattern also seen in omni models later in this track.</p><p><b>About this machine.</b> Scores follow the reported results for each set-up; answers and poster quality are scripted from those patterns.</p>',
  code: {
    title: 'Route by task',
    note: 'Adapted from the course\'s Janus-Pro lesson.',
    text: `
def encode_image(image, task, siglip, mlp, vq, embed):
    if task == "understand":
        return mlp(siglip(image))            # semantic features for questions
    return embed(vq.encode(image))           # codes, when conditioning generation

def generate_image(body, prompt_ids, vq, n=576):
    codes = body.sample_image_codes(prompt_ids, n)   # predicted VQ ids
    return vq.decode(codes)                          # back to pixels
`,
  },
};
